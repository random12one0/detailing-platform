// ROADMAP 0.11, SLICE 1 — THE APP'S SIDE OF THE PHOTO DOOR, AND THE CONTRACT
// THE SERVER HALF HAS TO KEEP.
//
// `docs/the-photo-allowance.md` § 4: the browser never holds R2 credentials,
// so an edge function is the ONE door to photo storage, and it asks two
// questions there — is this your business, and do you have room. This file is
// everything the app needs to know about that door and nothing else: no
// import of the Supabase client, so `tests/photo-door.test.mjs` runs it with
// no browser and no environment (the reason `photo-rules.js` is split off from
// `photos.js` too).
//
// **THE SERVER HALF DOES NOT EXIST YET.** `supabase/functions/photo-door` is
// not written, not deployed, and the R2 bucket needs a CORS rule before a
// browser may PUT to it. Until all three are true every call below fails, and
// it fails IN WORDS — the way the back office's costs and email-log screens
// do, and for the same reason: an `error` read as "nothing there" is a lie.
// There is deliberately NO fallback to Supabase Storage. A second door is the
// one thing the design forbids ("If a second one is ever added, the cap stops
// meaning anything again, quietly").
//
// ---------------------------------------------------------------------------
// THE CONTRACT — `POST /functions/v1/photo-door`, the owner's session JWT.
// ---------------------------------------------------------------------------
// Every body carries `business_id` and an `action`. The caller must be a member
// of that business; `remove` needs the `settings` permission, because deleting
// a photo is not taking one (`job photos settings delete` in the migration).
// Every key is checked on the server by `_shared/photoKey.ts`, never trusted.
//
//   start    { business_id, booking_id, photo_id, kind, content_type,
//              claimed_bytes, width, height }
//     200    { upload_url, key, expires_in }
//            `key` MUST equal `storagePath({ businessId, ownerId: booking_id,
//            id: photo_id, type: content_type })` — the browser mints `photo_id`
//            and the server confirms the key it will accept, so a retry of the
//            same press names the same object. `upload_url` is an https PUT
//            URL signed for exactly `content_type`.
//     over the cap: a 4xx whose `error` is ONE plain sentence naming what is
//            used, what the limit is, and that deleting old job photos frees
//            room. The app shows it as written. `claimed_bytes` may be used to
//            refuse here; it is NEVER what gets recorded.
//
//   (the browser then PUTs the shrunk file to `upload_url`; nothing else)
//
//   finish   { business_id, booking_id, photo_id, kind, width, height, caption }
//     200    { photo: { id, business_id, booking_id, kind, path, bytes, width,
//              height, caption, created_at } }
//            The server asks R2 how big the stored object is and writes THAT as
//            `bytes` (docs § 5, trap two) in the same step that inserts the
//            `job_photos` row, `id = photo_id`, on conflict doing nothing and
//            returning the row already there, so finishing twice is one row.
//            No object, or no size: no row and an error. `bytes` is a positive
//            integer or the answer is wrong (trap one: a zero lands as an
//            unlimited cap), and `readFinish` below refuses anything else.
//
//   urls     { business_id, keys: [key, …] }          (at most DOOR_BATCH keys)
//     200    { urls: { [key]: https GET url }, expires_in }
//            Read only. A key the caller may not read is simply absent.
//
//   remove   { business_id, photo_id }
//     200    { removed: true }
//            Row first, then the object: the other order leaves a row pointing
//            at nothing, this one can at worst leave bytes the reconcile counts.
//
// ---------------------------------------------------------------------------
// AND TWO MORE STORES SINCE, EACH ASKED FOR BY A `store` FIELD. Slice 1's
// bodies send none, which still means `job`, so nothing above changed.
//
//   store: "receipt"   `expense-receipts`. Same four actions; the parent is an
//            EXPENSE and `finish` UPDATES five columns rather than inserting a
//            row. The exact bodies are in `ROADMAP.md` 0.11, slice 5.
//
//   store: "media"     `business-media` — the logo, the marketing gallery and
//            the website-intake photographs. **TWO ACTIONS, NOT FOUR**, because
//            a business image hangs off no row:
//
//     start  { business_id, store:"media", folder, file_id, content_type,
//              claimed_bytes }
//       200  { upload_url, key, public_url, expires_in }
//            `folder` is one of `gallery` / `branding` / `intake`. The PUT URL
//            is signed for the declared `content-length` as well as the type,
//            so the body must be exactly `claimed_bytes` long — that signature
//            is the only thing holding the bucket's 10 MB per-file ceiling,
//            since there is no `finish` to measure the real size at.
//            `public_url` is where anybody reads it, and it is the thing that
//            gets stored in a row.
//
//     remove { business_id, store:"media", key }
//       200  { removed: true }
//            BY KEY, because there is no row to name. A key belonging to
//            another business is 404, exactly like one that does not exist.
//
//     There is no `finish` (nothing to record) and no `urls` (the bucket is
//     public-read, so there is nothing to sign). Both answer in words.
//
// **BOTH ARE BEHIND A FLAG IN THIS FILE AND BOTH ARE OFF** —
// `RECEIPTS_VIA_DOOR` and `MEDIA_VIA_DOOR`, each with its reason beside it.
// Job photos have no flag because they never had a working path to lose.
// ---------------------------------------------------------------------------

import { mediaPath, storagePath } from "./photo-rules.js";

export const DOOR = "photo-door";

// ── ROADMAP 0.11 SLICE 5 — THE RECEIPTS FLAG, AND WHY RECEIPTS HAVE ONE WHEN
//    JOB PHOTOS DO NOT ────────────────────────────────────────────────────
// **FLIP THIS TO `true` ONCE `photo-door` IS PUBLISHED.** It is named in
// `FOR-ANDREW.md`'s publish list beside the function, because a published door
// with this still `false` means receipts keep bypassing the meter, and nothing
// goes red to say so.
//
// **IT IS A FLAG AND NOT A FALLBACK, AND THE DIFFERENCE IS THE WHOLE POINT.**
// A fallback that catches the door's 503 and writes to Supabase Storage anyway
// is a SECOND DOOR, live exactly when the function is down — and this file's
// own header forbids that in those words, because a second door is how the cap
// stops meaning anything again, quietly. This chooses one door, once, in the
// open. There is never a moment when both are reachable.
//
// **AND THE ASYMMETRY IS DELIBERATE: `photos.js` HAS NO FLAG.** Slice 1
// re-pointed job photos at the door with nothing to fall back to, which was
// right because job photos were ALREADY going through a door that did not
// exist — they fail in words today either way, so a flag would have guarded
// nothing. Receipts WORK today. Re-pointing them unconditionally would take a
// working feature and break it on the next push, before the function Andrew
// has not published yet. Same destination, different starting state, so a
// different switch.
export const RECEIPTS_VIA_DOOR = false;

// ── ROADMAP 0.11 SLICE 4 — THE PUBLIC IMAGES FLAG ───────────────────────────
// **FLIP THIS TO `true` ONCE `photo-door` IS PUBLISHED *AND* `business-media`
// HAS A PUBLIC ADDRESS AND A CORS RULE IN CLOUDFLARE.** It is a flag for the
// same reason `RECEIPTS_VIA_DOOR` is one and not for a different reason:
// logos, the marketing gallery and the website-intake photographs all WORK
// today, so re-pointing them unconditionally would break a working feature on
// the next push, before a publish only Andrew can do.
//
// **IT NEEDS ONE THING RECEIPTS DO NOT, AND IT IS NOT A KEY.** `business-media`
// is public-read: a logo is rendered to an anonymous visitor on a booking page,
// so a signed URL is no use and the bucket needs a real public address.
// Supabase gives a public bucket one for free; **R2 gives it none until
// somebody binds one in the Cloudflare dashboard.** So there is a third
// condition behind this flag that is a DECISION rather than a publish —
// `FOR-ANDREW.md` step 9 puts it in his words, and the recommendation is a
// custom domain, because `gallery_images.image_url` stores an ABSOLUTE url and
// whatever host is live on the day of the switch is written permanently into
// every row made after it.
//
// **AND NOTHING GOES RED IF IT IS LEFT `false` AFTER ALL THREE ARE TRUE** — the
// old path keeps working, which is exactly why this comment and the row in
// `FOR-ANDREW.md` exist.
// **ON since 2026-10-10 (ROADMAP 0.11bc2):** photo-door is published, business-media
// has its public address and CORS rule. Turning it off again re-opens the old
// Supabase Storage path for logos, gallery and intake photos.
export const MEDIA_VIA_DOOR = true;
/** The most keys one `urls` call may carry; `signedUrls` chunks to this. */
export const DOOR_BATCH = 100;

// THE PLAIN SENTENCES. Named DOOR_WORDS so `tests/spanish.test.mjs` § 12 reads
// them: they are shown on the dashboard in whichever language it is set to.
//
// THE THREE ABOUT THE SERVICE ITSELF SAY NOTHING ABOUT WHAT WAS SAVED, ON PURPOSE.
// They were first written "Nothing was saved" and then PRESSED: the same
// sentence also appears when a job record asks for the links to show photos that
// already exist, and when a customer's photos are exported, and in both of those
// nothing was being saved. Only the one about an upload that did not finish keeps it.
export const DOOR_WORDS = {
  missing: "Photo storage is not set up on the server yet.",
  unreachable: "Could not reach the photo service. Check your connection. If it is fine, photo storage may not be set up on the server yet.",
  failed: "The photo service had a problem. Try again in a minute.",
  unreadable: "The photo service sent back something this screen cannot use. Reload this job and check before trying again.",
  putFailed: "The photo did not finish uploading. Nothing was saved.",
  unconfirmed: "The photo service did not confirm that the photo was saved. Reload this job to check before adding it again.",
  // SLICE 4. Said before anything is sent, because the file is on the person's
  // phone and they can pick another one. It names the five the bucket takes
  // rather than the one it refused: "image/heic is not supported" tells a
  // detailer nothing they can act on.
  badImageType: "That kind of image cannot be used. Choose a JPG, PNG, WEBP, GIF or AVIF.",
};

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const refuse = (which) => { throw new Error(DOOR_WORDS[which]); };

/**
 * What a failed call becomes. `postFunction` already puts the HTTP status, the
 * server's `error` sentence and the whole body on the Error it throws.
 *   404 with no sentence, or 400 "Unknown action"
 *                                 → the door is not there (never deployed, or
 *                                   an older build): said so, not "Request
 *                                   failed (404)".
 *   5xx                           → the service fell over.
 *   any other status              → the server's own sentence, untouched: this
 *                                   is where the over-cap message arrives.
 *   a TypeError (fetch itself)    → no connection, OR a function that was never
 *                                   published: the gateway's 404 for one carries no
 *                                   CORS headers, so the browser blocks it and the
 *                                   page sees the same TypeError as being offline.
 *                                   Found by pressing it against the real server
 *                                   (2026-10-06), which is why the sentence names both.
 *   anything else                 → passed through (the preview tab's
 *                                   "looking only" refusal is a plain Error).
 */
export function doorError(err) {
  const s = err?.status;
  // A 404 that carries the server's own sentence ("Booking not found") is the
  // door speaking. A 404 with none is the gateway saying there is no such
  // function. Found by running the server half's answers through these readers.
  const spoke = typeof err?.body?.error === "string" && err.body.error !== "";
  if ((s === 404 && !spoke) || (s === 400 && /unknown action/i.test(err?.message ?? ""))) return new Error(DOOR_WORDS.missing);
  // **A 5xx THAT CARRIES A SENTENCE IS THE DOOR SPEAKING TOO — 0.11a, 2026-10-09.**
  // This read `s >= 500` with no `!spoke`, so EVERY 5xx became the generic
  // retry line, and **six distinct sentences the server writes for a detailer
  // were never reachable**: "Photo storage is not set up on the server yet.",
  // "Receipt storage is not set up…", "Public image storage is not set up…",
  // "Could not check your photo storage. Nothing was saved…", "Could not save
  // the receipt. Try again." and "Could not save the photo. Try again." — the
  // first three are configuration, and "try again in a minute" sends a detailer
  // round that loop for ever. It is the SAME fault as the 404 branch above,
  // which was already corrected this way; found by running `receipts.js`
  // against the real handler (`tests/photo-door-receipt-wire.test.mjs` § 4),
  // never by reading either file. A 5xx with NO sentence — a gateway, a
  // platform, a crash before the door ran — is still the generic line, which is
  // what that line is for.
  if (typeof s === "number" && s >= 500 && !spoke) return new Error(DOOR_WORDS.failed);
  if (typeof s === "number") return err;
  if (err instanceof TypeError) return new Error(DOOR_WORDS.unreachable);
  return err instanceof Error ? err : new Error(String(err));
}

/**
 * **ONE EXPRESSION DECIDES WHAT THIS BROWSER WILL PUT TO, FOR EVERY STORE.**
 * An `https` url, and a key that is EXACTLY the one this press asked for.
 *
 * **IT WAS INLINE IN `readStart` UNTIL SLICE 4, AND A RUNNING CANARY IS WHAT
 * MOVED IT.** `readMediaStart` needs the same two checks against a differently
 * minted key, and spelling them again made two of
 * `tests/photo-door.test.mjs` § 5's sabotage targets ambiguous — `resp.key !==
 * want` and the `https` test each appeared twice, so that suite refused to run
 * and said "the line to sabotage is not unique". **That is the third time this
 * slice met that trap** (`_shared/photoDoor.ts`'s receipt branch renamed its
 * budget locals for it, and its media branch its permission local), and here
 * the trap was pointing at the better answer rather than at a rename: lifting
 * the rule out leaves ONE copy, so the sabotage is unique again AND it now
 * disarms the check for both stores at once, which is what a canary aimed at
 * production code is supposed to do. `docs/gotchas.md` 95.
 */
const checkedStart = (resp, want) => {
  if (!isObject(resp) || typeof resp.upload_url !== "string" || !/^https:\/\//.test(resp.upload_url)
    || typeof resp.key !== "string" || resp.key !== want) refuse("unreadable");
  return { uploadUrl: resp.upload_url, key: resp.key };
};

/** `start`'s answer, or a thrown sentence. The key must be EXACTLY the one
 *  this press asked for: the browser will not PUT to any other object. */
export function readStart(resp, { businessId, bookingId, photoId, type }) {
  return checkedStart(resp, storagePath({ businessId, ownerId: bookingId, id: photoId, type }));
}

/** `finish`'s answer, or a thrown sentence. A row with no positive whole-number
 *  `bytes` is refused, not shown: bytes that stop landing make the cap compare
 *  against zero, and the cap silently becomes unlimited. */
export function readFinish(resp, { photoId, key }) {
  const p = resp?.photo;
  if (!isObject(p) || p.id !== photoId || p.path !== key) refuse("unconfirmed");
  if (!Number.isInteger(p.bytes) || p.bytes <= 0) refuse("unconfirmed");
  return p;
}

/**
 * `start`'s answer for a RECEIPT. The key check is `readStart`'s, unchanged and
 * not copied: one expression decides what object this browser will PUT to, for
 * both stores. The names differ because the parent does — a receipt hangs off an
 * EXPENSE, not a booking — and `storagePath`'s parameter has always been called
 * `ownerId` for exactly that reason.
 */
export function readReceiptStart(resp, { businessId, expenseId, fileId, type }) {
  return readStart(resp, { businessId, bookingId: expenseId, photoId: fileId, type });
}

/**
 * `finish`'s answer for a RECEIPT: `{ expense }` carrying the five receipt
 * columns as stored. **`receipt_bytes` is checked the same way `readFinish`
 * checks a photo's `bytes` and for the same reason** — the size is what the
 * server read back off R2, and a zero or a missing one makes the allowance
 * compare against nothing, at which point the cap is silently unlimited. A
 * receipt that cannot say how big it is has not been saved.
 */
export function readReceiptFinish(resp, { expenseId, key }) {
  const x = resp?.expense;
  if (!isObject(x) || x.id !== expenseId || x.receipt_path !== key) refuse("unconfirmed");
  if (!Number.isInteger(x.receipt_bytes) || x.receipt_bytes <= 0) refuse("unconfirmed");
  return x;
}

/**
 * `start`'s answer for a BUSINESS IMAGE — ROADMAP 0.11 slice 4.
 *
 * **IT CHECKS A THIRD FIELD THE OTHER TWO STORES DO NOT HAVE: `public_url`.**
 * `business-media` is public-read and the url is what gets WRITTEN TO A ROW —
 * `gallery_images.image_url`, the brand's `logo_url` — so an unusable one is
 * not a broken image this time, it is a broken image stored permanently. It is
 * required, and required to be `https`, because an `http` image is blocked as
 * mixed content on every page this product serves and would look like a missing
 * logo rather than a configuration mistake.
 *
 * The key is `mediaPath()`'s, called rather than restated, for the reason
 * `readStart` calls `storagePath()`: the browser will not PUT to any other
 * object, and one expression decides which.
 */
export function readMediaStart(resp, { businessId, folder, fileId, type }) {
  const out = checkedStart(resp, mediaPath({ businessId, folder, id: fileId, type }));
  // **AND IT IS BOUND TO THE KEY, which it was not until 0.11b.** The line
  // above makes the browser PUT only to the object it asked for; this one makes
  // the row it writes afterwards NAME that same object. They are two separate
  // fields of one answer, and until this was added a correct `key` beside
  // another business's `public_url` was accepted — measured by
  // `tests/photo-door-media-wire.test.mjs` § 6 against the real handler, which
  // is the whole reason that suite exists. It is the sharper half of the two:
  // a wrong `key` is a failed upload, a wrong `public_url` is a wrong image
  // stored permanently in `gallery_images.image_url` or a brand's `logo_url`.
  //
  // `endsWith` is the whole check because the base is SERVER-side configuration
  // (`R2_MEDIA_BASE`): the browser has never seen it and cannot be given it —
  // a public address a page could read is a public address a page could be
  // told. So what is checkable here is the object, and `r2.ts`'s `publicUrl`
  // appends the key path-encoded, which for the closed key shape this product
  // mints (`uuid/folder/uuid.ext`) is the key verbatim.
  if (typeof resp.public_url !== "string" || !/^https:\/\//.test(resp.public_url)
    || !resp.public_url.endsWith(`/${out.key}`)) refuse("unreadable");
  return { ...out, publicUrl: resp.public_url };
}

/** `urls`' answer: the map, or a thrown sentence if there is no map at all. A
 *  key missing FROM the map is a photo that cannot be shown, not a failure. */
export function readUrls(resp) {
  if (!isObject(resp) || !isObject(resp.urls)) refuse("unreadable");
  return resp.urls;
}

/** `remove`'s answer. Anything but a literal `true` is not a removal. */
export function readRemoved(resp) {
  if (!isObject(resp) || resp.removed !== true) refuse("unreadable");
  return true;
}
