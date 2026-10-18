// The two rules behind job photos: how big a photo is allowed to be, and how
// much of a detailer's allowance is gone.
//
// IN ITS OWN FILE FOR THE REASON `client-list.js`, `setup.js` and
// `accountant-export.js` ARE: `photos.js` imports the Supabase client, so a
// test that imported it would need a browser and an environment. Everything
// here that could be WRONG rather than merely broken is pure, and
// `tests/job-photos.test.mjs` runs it with neither.

// ---------------------------------------------------------------------------
// THE RESIZE IS THIS FEATURE'S ECONOMICS, not a nicety.
//
// A modern phone photo is 3-5 MB. Supabase's free plan is 1 GB in total,
// across every tenant — so uploading what the camera produced fills the whole
// plan in about 250 photos, and the failure lands on a detailer standing in
// somebody's driveway. At 1600px and JPEG 0.8 the same photo is 200-400 KB:
// **a 10x multiplier on every limit below, for free, before any storage
// provider is chosen.**
//
// 1600 is picked against what the photo is FOR — a before/after pair judged on
// a phone, and a gallery image on a booking page. Neither is ever displayed
// above about 800 CSS pixels, so 1600 is already twice what a 2x screen needs.
// Higher costs storage and buys nothing anybody looks at.
export const MAX_EDGE = 1600;
export const QUALITY = 0.8;

// The size to draw at. **It never ENLARGES** — a photo smaller than the cap is
// left alone, because upscaling adds bytes and no detail. Aspect ratio is kept
// to the pixel, since a stretched before-photo is worse than none.
export function fit(w, h, maxEdge = MAX_EDGE) {
  const longest = Math.max(w, h);
  if (!longest || longest <= maxEdge) return { width: w, height: h };
  const k = maxEdge / longest;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

// ---------------------------------------------------------------------------
// THE BUDGET, in words rather than bytes. The owner's condition on this whole
// feature was "implement it without going over our limit".
//
// The screen must be able to say "you are nearly out" long BEFORE it says no,
// which is why `job_photo_budget()` returns numbers and this decides what they
// mean. Three states, and deliberately not a percentage on a bar: a detailer
// does not want a meter, they want to know whether to stop.
//
// **`job_photo_budget()` HAS TWO VERSIONS AND THE FIRST ONE IS NOT THE LIVE
// ONE.** `20260906010000_job_photos.sql` defines it with a **250 MB** default
// read from `platform_settings.prices -> 'photoCapMb'`. **That version is
// superseded.** `20260906011000_photo_share.sql` replaces it with
// `photo_total_bytes() / photo_tenant_share()`, and
// `20260906011100_photo_total_column.sql` moves the total onto its own column.
// **Live today: 1 GB / 100 = 10.24 MB a business**, read off the database
// 2026-09-21, not off a migration.
//
// Written here because this is where a reader meets the function's name from
// the app side, and a migration may never be edited. **Two people read the
// 250 MB out of the first file on the same morning and both believed it** —
// the file is complete, correct for its date, and gives no sign that anything
// came after it. If you are about to quote a number from a `create or replace
// function`, grep the whole migration folder for that function's name first.
// ---------------------------------------------------------------------------
export const WARN_AT = 0.8;

export function budgetState(b) {
  // **NULL IS NOT THE SAME AS UNDEFINED and a default parameter only catches
  // the second.** The screen holds `budget` as null until the read comes
  // back, so `= {}` never fired and destructuring null threw — which React
  // turned into the whole job record disappearing behind the error boundary.
  // Found 2026-09-06 by opening the screen, not by the test: the test asked
  // `budgetState({})` and never `budgetState(null)`.
  const { used_bytes = 0, cap_bytes = 0 } = b ?? {};
  // NO CAP MEANS NO OPINION, and it is not the same as empty. A missing row or
  // a failed read must never draw "0% full" — a reassuring number invented
  // from an error is the class of statement this repo refuses everywhere.
  if (!cap_bytes || cap_bytes <= 0) return { state: "unknown", share: 0 };
  const share = used_bytes / cap_bytes;
  if (share >= 1) return { state: "full", share };
  if (share >= WARN_AT) return { state: "near", share };
  return { state: "ok", share };
}

// THE DEFAULT TRANSLATOR FILLS *ANY* PLACEHOLDER, NOT JUST `{percent}`.
// It used to be `s.replace("{percent}", v.percent)`, which was right while
// `budgetWords` was the only caller and silently wrong for the next one:
// `fullWords` below names two numbers, and a hard-coded placeholder would have
// left a literal "{used} of {limit}" in a sentence shown to a detailer — in a
// default path nobody exercises, because the app always passes `t`.
const fill = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m)) : s);

// Null when there is nothing worth saying. An empty section is not drawn
// (screen designs §1a), and "you have used 3% of your photos" is noise.
// `tr` is the caller's translator; the default fills placeholders in English.
export function budgetWords(b, tr = fill) {
  const { state, share } = budgetState(b);
  if (state === "full") return tr("Photo storage is full. Remove some photos to add more.");
  if (state === "near") return tr("Photo storage is {percent}% full.", { percent: Math.round(share * 100) });
  return null;
}

// Is there room for one more of roughly this size?
export function roomFor(bytes, b) {
  const { cap_bytes = 0, used_bytes = 0 } = b ?? {};
  if (!cap_bytes || cap_bytes <= 0) return true;   // no opinion, do not block
  return used_bytes + bytes <= cap_bytes;
}

export const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

// ---------------------------------------------------------------------------
// THE REFUSAL IS A DIFFERENT SENTENCE FROM THE WARNING — ROADMAP 0.11d1
//
// `budgetWords` above is the standing line on the screen. This is what a person
// is told at the moment an upload is REFUSED, and 0.11d's third criterion is
// specific about it: *"an over-cap upload is refused with used space, limit and
// deletion guidance in the message."*
//
// **THE SERVER ALREADY SAYS ALL THREE AND NOBODY EVER SEES IT.**
// `_shared/photoDoor.ts`'s `fullSentence` reads "Photo storage is full: 9.0 MB
// of 10.2 MB used. Delete old job photos to make room." — used, limit,
// guidance. But the client checks `roomFor` BEFORE it calls the door, and that
// order is deliberate (an upload that succeeds and is then refused has already
// spent the bytes), so on the path a detailer actually walks the door is never
// asked and its sentence is never reached. What they were shown instead named
// neither number: "Photo storage is full. Remove some photos to add more." on
// the job record, and "Expense saved, but photo storage is full so the receipt
// was not attached." on an expense — that second one naming nothing at all that
// frees room.
//
// So the criterion was satisfied by a sentence nobody is shown, which is this
// repo's own most repeated fault one level out: the check passes, and the thing
// it describes never happens where it counts.
//
// IT IS NOT THE SERVER'S STRING AND MUST NOT BE MADE INTO ONE. The server says
// "Delete old job photos" because one door answers for job photos, receipts and
// business media alike; this is shown beside the thing being refused, so it says
// "Remove some photos", matching `budgetWords` an element below it.
// ---------------------------------------------------------------------------

/** What a person is told when an upload is refused for want of room: what is
 *  used, what the limit is, and what frees room. Falls back to the plain
 *  sentence when the cap is unknown, because inventing "0.0 MB of 0.0 MB" out
 *  of a failed read is the one thing this file refuses everywhere else. */
export function fullWords(b, tr = fill) {
  const { used_bytes = 0, cap_bytes = 0 } = b ?? {};
  if (!(cap_bytes > 0) || !Number.isFinite(used_bytes)) {
    return tr("Photo storage is full. Remove some photos to add more.");
  }
  return tr("Photo storage is full: {used} of {limit} used. Remove some photos to add more.",
    { used: mb(used_bytes), limit: mb(cap_bytes) });
}

// The three kinds, in the order a job happens. `damage` is not a nicety:
// "that scratch was already there" is the conversation this feature exists to
// end, and a detailer has to be able to find that photo later without
// scrolling a whole job.
export const KINDS = [
  ["before", "Before"],
  ["after", "After"],
  ["damage", "Damage"],
];

// ---------------------------------------------------------------------------
// THE STORAGE PATH, AND IT IS THE ISOLATION RATHER THAN A NAMING HABIT.
//
// Both private buckets — `job-photos` and `expense-receipts` — carry the same
// policy: `(storage.foldername(name))[1] in (select current_business_ids())`.
// **The first folder of the object path is the only thing standing between one
// detailer and another's files.** It is not a convention somebody remembers;
// it is the check.
//
// **WHICH IS WHY IT IS A FUNCTION HERE AND NOT A TEMPLATE LITERAL THERE.**
// Written inline, the day somebody reorders it to read `${expenseId}/${
// businessId}/…` — because that groups better in a bucket listing, and it
// does — the policy starts comparing an EXPENSE id against a list of business
// ids, matches nothing, and every upload fails closed. That is the lucky
// version. The unlucky one is the reverse rename in a bucket whose policy was
// ever loosened: the guard is off and **nothing fails, no test goes red, and
// the cross-tenant checks all still pass on the day it is written.** Same
// shape as an exclusion constraint that stops excluding.
//
// `tests/job-photos.test.mjs` asserts the shape the policy expects, and the
// sabotage that proves the assertion works is swapping the first two segments.
// ---------------------------------------------------------------------------

/** The stored extension. Only PNG survives as PNG; everything else is JPEG,
 *  because `shrink()` re-encodes to JPEG. */
export const extForType = (type) => (String(type || "") === "image/png" ? "png" : "jpg");

/**
 * `businessId/ownerId/id.ext` — where `ownerId` is the booking for a job photo
 * and the expense for a receipt. Throws on a missing part rather than
 * producing a path with an empty segment: `"/abc/x.jpg"` has an EMPTY first
 * folder, which is exactly the value the policy must never be asked to match.
 */
export function storagePath({ businessId, ownerId, id, type } = {}) {
  for (const [name, v] of [["businessId", businessId], ["ownerId", ownerId], ["id", id]]) {
    if (!v || !String(v).trim() || String(v).includes("/")) {
      throw new Error(`storagePath: ${name} is missing or not a single path segment`);
    }
  }
  return `${businessId}/${ownerId}/${id}.${extForType(type)}`;
}

/** What the bucket policy reads. Kept here so a test can assert against the
 *  same expression the database uses rather than against a guess. */
export const firstFolder = (path) => String(path ?? "").split("/")[0];

// ---------------------------------------------------------------------------
// THE PUBLIC BUCKET'S PATH — `business-media`. ROADMAP 0.11 slice 4.
// ---------------------------------------------------------------------------
// **THE FIRST FOLDER IS STILL THE ISOLATION, and everything the long comment
// above says applies here unchanged.** What differs is the middle segment: a
// logo and a gallery photograph hang off no row, so where a job photo names its
// booking, a business image names a FOLDER — one of exactly three, which are the
// three `uploadBusinessPhoto` is called with.
//
// **AND THE TYPES ARE THE BUCKET'S OWN, NOT `shrink()`'s.** A job photo is
// re-encoded to JPEG on the way up, which is why `extForType` above answers
// only `jpg` or `png`. A logo must not be: re-encoding a PNG logo to JPEG
// throws away its transparency and leaves a white box on a dark booking page.
// So a business image is uploaded as the file the detailer chose, and the five
// types here are exactly `business-media`'s own `allowed_mime_types` from
// `20260827001000_phase2_cleanup_and_storage.sql` — no sixth, because the
// bucket refuses a sixth, and no fewer, because a detailer can upload all five
// today.
//
// **THESE TWO CONSTANTS ARE HELD AGAINST THE SERVER'S COPIES BY
// `tests/photo-door-media.test.mjs`, which imports BOTH and compares them.**
// Two copies of a path rule that can disagree is this repo's most repeated
// failure; the app and the edge function are different runtimes and cannot
// share a module, so the agreement is asserted instead of assumed.

/** The three folders business images are filed under, and no others. */
export const MEDIA_FOLDERS = ["gallery", "branding", "intake"];

/** Content type to stored extension, for the public bucket. */
export const MEDIA_EXT_FOR_TYPE = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/** The extension a business image of this type is stored under, or `null` if
 *  the bucket does not take the type at all. `null` rather than a default:
 *  guessing `jpg` for a HEIC would store a file under a name that lies about
 *  what is in it, and the screen can say something useful instead. */
export const mediaExtForType = (type) => MEDIA_EXT_FOR_TYPE[String(type ?? "")] ?? null;

/**
 * ROADMAP 0.11be — WHERE A STORED `business-media` ADDRESS POINTS, so the
 * gallery's Remove can erase the file before the row. One of:
 *   `{ kind: "r2", key }`        this business's object behind the photo door
 *   `{ kind: "supabase", key }`  this business's object from before the switch
 *   `{ kind: "foreign" }`        one of our stores, ANOTHER business's folder
 *   `{ kind: "external" }`       anything else — never guessed into a key
 * The address must already be in canonical form (`new URL(url).href === url`),
 * with no query, so a `..` or an encoded slash cannot steer which key comes out.
 * `oldBase` is Supabase Storage's public prefix for `business-media`
 * (`getPublicUrl("")`), ending in a slash.
 */
// ponytail: R2_MEDIA_BASE is server config the browser never sees; if Andrew
// rebinds the media address, change this too or R2 photos become row-only removes.
export const MEDIA_PUBLIC_BASE = "https://media.detailingplatform.com";
const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const FOLDER_RE = MEDIA_FOLDERS.join("|");
// The door mints exactly `mediaPath`'s shape. The old Supabase path took the
// extension off the file's name, so it is looser there and only there.
const DOOR_KEY = new RegExp(`^(${UUID_RE})/(?:${FOLDER_RE})/${UUID_RE}\\.(?:${Object.values(MEDIA_EXT_FOR_TYPE).join("|")})$`);
const OLD_KEY = new RegExp(`^(${UUID_RE})/(?:${FOLDER_RE})/${UUID_RE}\\.[a-z0-9]{1,8}$`);

export function storedMediaAt(url, { businessId, oldBase } = {}) {
  let u;
  try { u = new URL(url); } catch { return { kind: "external" }; }
  if (u.href !== url || u.search || u.hash || u.username) return { kind: "external" };
  for (const [kind, base, shape] of [["r2", `${MEDIA_PUBLIC_BASE}/`, DOOR_KEY], ["supabase", oldBase, OLD_KEY]]) {
    if (!base || !url.startsWith(base)) continue;
    const key = url.slice(base.length);
    const m = shape.exec(key);
    if (!m) return { kind: "external" };
    if (m[1] !== businessId) return { kind: "foreign" };
    return { kind, key };
  }
  return { kind: "external" };
}

/**
 * `businessId/folder/id.ext` — the key the door mints for a business image.
 * Throws rather than producing a path with an empty or unknown segment, for
 * the reason `storagePath` does: the first folder is the check, and a folder
 * name outside the three would be an object nothing can later parse as ours.
 */
export function mediaPath({ businessId, folder, id, type } = {}) {
  for (const [name, v] of [["businessId", businessId], ["id", id]]) {
    if (!v || !String(v).trim() || String(v).includes("/")) {
      throw new Error(`mediaPath: ${name} is missing or not a single path segment`);
    }
  }
  if (!MEDIA_FOLDERS.includes(folder)) {
    throw new Error(`mediaPath: folder must be one of ${MEDIA_FOLDERS.join(", ")}`);
  }
  const ext = mediaExtForType(type);
  if (!ext) throw new Error(`mediaPath: ${type} is not a type business-media accepts`);
  return `${businessId}/${folder}/${id}.${ext}`;
}
