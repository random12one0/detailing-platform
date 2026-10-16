// THE PHOTO DOOR — THE SERVER'S HALF OF `app/src/lib/photo-door.js`. ROADMAP 0.11.
//
// `docs/the-photo-allowance.md` § 4: one edge function mints the upload URL, it
// is the ONE door to photo storage, and it asks two questions there — *is this
// your business?* and *do you have room?* — because R2 has neither a guard like
// the database's `foldername` policy nor a cap. The request and answer shapes
// are written, once, in the header of `app/src/lib/photo-door.js`; this file
// keeps them. Four actions: `start`, `finish`, `urls`, `remove`.
//
// ALL THE LOGIC IS HERE AND NONE OF THE WIRING, for the reason `retryRead.ts`
// and `photoKey.ts` are import-free: `photo-door/index.ts` hands this a real
// database and a real R2, and `tests/photo-door-server.test.mjs` hands it
// in-memory ones and RUNS it, including with one guard removed at a time.
//
// ---------------------------------------------------------------------------
// THE TWO TRAPS, AND WHERE EACH IS CLOSED (docs § 5)
// ---------------------------------------------------------------------------
// **TRAP TWO — THE CLIENT CANNOT BE TRUSTED FOR THE SIZE.** `claimed_bytes` is
// used at `start` to refuse EARLY and never again. At `finish` the size is what
// R2 reports for the stored object (`head`), the row records THAT, and the cap
// is checked a second time against it — so a browser that claims 1 KB and sends
// 9 MB is refused and its object deleted, not stored and under-counted.
//
// **TRAP ONE — BYTES THAT DO NOT LAND MAKE THE CAP UNLIMITED.** Three places:
// a size R2 will not state is a refusal, never a zero; `job_photos.bytes` is
// checked `> 0` by the table and by this file; and **an unreadable budget
// refuses the upload instead of allowing it.** That last one is not a
// hypothetical. `job_photo_budget()` guards itself with
// `p_business in (select current_business_ids())`, which reads the CALLER'S
// session — so asked with the service-role key it returns NO ROWS, and a door
// that read "no rows" as "no limit" would have been unlimited from the first
// day. The budget is therefore asked with the caller's own token (`budget` in
// `deps`), and an empty answer means "could not check", which fails closed.
//
// ---------------------------------------------------------------------------
// WHO MAY DO WHAT — the same asymmetry the storage policies carry
// ---------------------------------------------------------------------------
// Any member of the business may add and read (`job photos member insert/read`).
// Removing needs the `settings` permission (`job photos settings delete`): a
// photo is evidence, and taking one is doing the job while deleting one is not.
// The service-role client bypasses RLS, so the door enforces it itself.

import { json, preflight } from "./http.ts";
import { businessOwnsKey, MEDIA_EXTS, MEDIA_FOLDERS, TENANT_PUBLIC_BUCKET } from "./photoKey.ts";

/** The bucket this door signs for by default. */
export const BUCKET = "job-photos";
/** `job-photos`' own `file_size_limit`: the ceiling, not the expectation. */
export const MAX_BYTES = 10 * 1024 * 1024;
/** `expense-receipts`' limit. 5 MB rather than 10: a receipt is a small flat
 *  document and the client resizes before upload
 *  (`20260921020000_a_receipt_is_not_a_job_photo.sql`). */
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
/** `business-media`'s own `file_size_limit`, 10 MB per file
 *  (`20260827001000_phase2_cleanup_and_storage.sql`). */
export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;
/** How long a PUT URL lives: long enough for a slow driveway upload. */
export const PUT_SECONDS = 600;
/** How long a GET URL lives. Matches `SIGNED_FOR` in `app/src/lib/photos.js`. */
export const GET_SECONDS = 3600;
/** At most this many keys in one `urls` call (`DOOR_BATCH` in the app). */
export const URL_BATCH = 100;

const KINDS = ["before", "after", "damage"];

// ---------------------------------------------------------------------------
// TWO STORES, ONE DOOR — ROADMAP 0.11 slice 5
// ---------------------------------------------------------------------------
// **The protocol is identical and the differences are data.** Both stores ask
// the same four questions in the same order: who are you, are you under the
// rate limit, is the parent row yours, have you room. Both mint the key server
// side as `businessId/ownerId/id.ext` so the first folder — the only thing the
// bucket policy checks — can never come from the browser. Both fail closed on
// an unreadable budget, and both count against the SAME allowance, because
// `job_photo_budget()` was replaced to sum the two stores on the day the
// receipts bucket was created.
//
// **So this is a table, not a second file.** `_shared/db.ts`'s own header
// records what the alternative costs: *"a duplicated block is how one of the
// two copies keeps the old behaviour when somebody fixes the other"*, and the
// thing that would have been duplicated here is the tenant isolation.
//
// **WHAT ACTUALLY DIFFERS, and each line is a rule somebody wrote down:**
//
//   bucket      `job-photos` against `expense-receipts`.
//   ceiling     10 MB against 5 MB, each the bucket's own `file_size_limit`.
//   parent      a BOOKING against an EXPENSE. Both must belong to the caller's
//               business or the answer is 404, the same as a uuid that does
//               not exist.
//   the row     a job photo INSERTS a row in `job_photos`; a receipt UPDATES
//               five columns on the `expenses` row that already exists. **That
//               is why a receipt has no row to "already be saved" — the expense
//               is there either way, and what makes it taken is `receipt_path`
//               being set.**
//   kind        before/after/damage for a job photo; a receipt has none.
//   audience    a job photo is customer-facing and is in the photo export; a
//               receipt is the detailer's own paper and must never be. The
//               migration's header is emphatic about it and it is the reason
//               the two are different tables at all.
//
// **WEBP IS DELIBERATELY NOT ACCEPTED, and that is a finding rather than an
// omission.** The receipts bucket's `allowed_mime_types` lists
// `image/webp`, but `extForType` in `app/src/lib/photo-rules.js` returns only
// `jpg` or `png`, and `parseObjectKey` in `_shared/photoKey.ts` matches only
// those two. **Nothing in this product can mint a `.webp` key**, so accepting
// the type here would sign an upload whose key the isolation guard then refuses
// to parse. Written up in ROADMAP 0.11 rather than quietly supported.

/** Which store a request is for. Absent means `job`: the app half built in
 *  slice 1 sends no `store` field and must keep working unchanged. */
// ---------------------------------------------------------------------------
// AND A THIRD STORE — `business-media`, ROADMAP 0.11 slice 4
// ---------------------------------------------------------------------------
// **IT BREAKS THE "SAME FOUR QUESTIONS" PATTERN IN TWO PLACES, AND BOTH ARE
// WRITTEN HERE RATHER THAN DISCOVERED LATER.**
//
// **1 · THERE IS NO PARENT ROW AND NO ROW TO WRITE.** A logo hangs off nothing;
// the gallery row is `gallery_images`, written by the browser afterwards, and
// the intake photographs are written nowhere at all on purpose. So the store
// has no `finish`: the object IS the whole act, and the only thing the app
// needs back is the key and the public address. `remove` therefore takes a
// KEY, because the key is the only handle anything has on the object.
//
// **2 · IT IS NOT METERED, AND IT IS NOT METERED TODAY EITHER.**
// `job_photo_budget()` sums `job_photos` and the `expenses` receipt columns —
// `business-media` is in neither, and it never has been, so nothing here
// removes a cap. **But the move changes what "unmetered" costs.** On Supabase
// the free plan's 1 GB was a hard ceiling that stopped the upload; on R2 there
// is no ceiling and the same traffic arrives as a bill, which is the shape
// `docs/the-photo-allowance.md` § 5 trap one warns about. **Adding this bucket
// to the allowance is a migration and a number nobody has chosen**, so it is
// recorded in `ROADMAP.md` 0.11 and `FOR-ANDREW.md` as a decision rather than
// quietly invented here. What IS enforced is the per-file ceiling, below.
//
// **AND THE PER-FILE CEILING IS A SECOND GUARD R2 DOES NOT HAVE.** Supabase
// enforced `file_size_limit` on the server, whatever the client said. R2
// enforces nothing: a presigned PUT will take a five-gigabyte body as happily
// as a five-kilobyte one. The private stores catch an under-claim afterwards,
// at `finish`, by asking R2 how big the object really is — and this store has
// no finish. So **the claimed size is signed INTO the URL as `content-length`**
// (`putUrl`'s `exactBytes`), which makes the browser's claim binding: send one
// byte more or less than it declared and R2 refuses the PUT outright. The
// claim check below stays anyway, so an over-size file is refused in a sentence
// a detailer can read instead of as a 403 from Cloudflare.
//
// **WRITING TO THIS BUCKET NEEDS THE `settings` PERMISSION, which is NOT the
// same asymmetry as the other two stores.** They let any member add and need
// `settings` only to remove; `20260904001000_catalog_behind_settings.sql`
// replaced this bucket's three write policies so that insert, update AND delete
// all require it — a logo and a marketing gallery are the business's public
// face, not the job in front of you. Both actions here check it.

export type StoreName = "job" | "receipt" | "media";

export interface StoreProfile {
  bucket: string;
  maxBytes: number;
  /** The request field naming the row this object hangs off, or `null` when
   *  there is no parent row (`media`). */
  parentField: string | null;
  /** The request field naming the object itself. */
  idField: string;
  /** `null` when the store has no kinds. */
  kinds: string[] | null;
  /** What the over-size sentence calls the thing, in words a detailer uses. */
  noun: string;
}

export const STORES: Record<StoreName, StoreProfile> = {
  job: {
    bucket: BUCKET, maxBytes: MAX_BYTES,
    parentField: "booking_id", idField: "photo_id", kinds: KINDS, noun: "photo",
  },
  receipt: {
    bucket: "expense-receipts", maxBytes: RECEIPT_MAX_BYTES,
    parentField: "expense_id", idField: "file_id", kinds: null, noun: "receipt",
  },
  media: {
    bucket: TENANT_PUBLIC_BUCKET, maxBytes: MEDIA_MAX_BYTES,
    parentField: null, idField: "file_id", kinds: null, noun: "image",
  },
};
// `shrink()` re-encodes to JPEG and only PNG survives as PNG, and
// `parseObjectKey` knows exactly these two extensions.
const EXT: Record<string, "jpg" | "png"> = { "image/jpeg": "jpg", "image/png": "png" };
// THE PUBLIC BUCKET TAKES FIVE TYPES, which is the bucket's own
// `allowed_mime_types` and not a choice made here: signing for a sixth hands
// out a URL the bucket itself would refuse, and refusing one of these five
// would reject a file a detailer can upload today. A business image is NOT run
// through `shrink()` — a logo must not be re-encoded to JPEG and lose its
// transparency — so the type arrives as the file's own and the extension
// follows it. The keys of this map and `MEDIA_EXTS` are held to agree by
// `tests/photo-door-media.test.mjs` § 0.
export const MEDIA_EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "image/gif": "gif", "image/avif": "avif",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface Member { userId: string; businessId: string; role: string; permissions: string[] }
export interface PhotoRow {
  id: string; business_id: string; booking_id: string; kind: string; path: string; bytes: number;
  width: number | null; height: number | null; caption: string | null;
  created_by?: string | null; created_at?: string;
}
export interface Budget { used_bytes: number; cap_bytes: number }
/** The five columns `20260921020000_a_receipt_is_not_a_job_photo.sql` added to
 *  `expenses`. There is no receipts TABLE: one receipt per expense, as columns,
 *  because a child table would buy many-per-expense nobody asked for. */
export interface ReceiptRow {
  id: string; business_id: string;
  receipt_path: string | null; receipt_bytes: number | null;
  receipt_width: number | null; receipt_height: number | null;
  receipt_uploaded_at?: string | null;
}
export interface PhotoStore {
  /** `exactBytes`, when given, is signed into the URL as `content-length`, so
   *  the body must be exactly that many bytes or R2 refuses the PUT. The two
   *  private stores leave it off and check the real size at `finish` instead;
   *  `media` has no finish, so for it this IS the ceiling. */
  putUrl(bucket: string, key: string, contentType: string, expires: number, exactBytes?: number): Promise<string>;
  getUrl(bucket: string, key: string, expires: number): Promise<string>;
  head(bucket: string, key: string): Promise<{ exists: boolean; bytes: number | null }>;
  del(bucket: string, key: string): Promise<void>;
}
export interface PhotoDeps {
  requireMember(req: Request, businessId: string, opts?: { allowSupport?: boolean }): Promise<Member | null>;
  can(member: Member, permission: string): boolean;
  /** True when the caller still has room under every limit. */
  withinLimits(limits: { bucket: string; key: string; windowSeconds: number; limit: number }[]): Promise<boolean>;
  limit: { windowSeconds: number; limit: number };
  bookingBelongs(businessId: string, bookingId: string): Promise<boolean>;
  /** Asked with the CALLER's token. `null` means it could not be read. */
  budget(businessId: string, token: string): Promise<Budget | null>;
  getPhoto(businessId: string, photoId: string): Promise<PhotoRow | null>;
  /** Inserts the row. When `id` or `path` already exists, returns the one
   *  that is there instead of throwing. */
  insertPhoto(row: PhotoRow): Promise<PhotoRow>;
  deletePhoto(businessId: string, photoId: string): Promise<void>;

  // ---------------------------------------------------------------- receipts
  // ROADMAP 0.11 slice 5. OPTIONAL on purpose: a caller that wired only the
  // job store keeps working, and asking this door for the receipt store
  // without them answers in words rather than throwing from somewhere deep.
  // `photo-door/index.ts` wires all four.
  /** Is this expense this business's? Another tenant's uuid must answer false,
   *  so the door can 404 it exactly like one that does not exist. */
  expenseBelongs?(businessId: string, expenseId: string): Promise<boolean>;
  /** The expense's five receipt columns, or `null` if the expense is not this
   *  business's. A row whose `receipt_path` is null HAS no receipt. */
  getReceipt?(businessId: string, expenseId: string): Promise<ReceiptRow | null>;
  /** Writes the five columns. Returns the row as stored. */
  saveReceipt?(row: ReceiptRow): Promise<ReceiptRow>;
  /** Sets the five columns back to null. */
  clearReceipt?(businessId: string, expenseId: string): Promise<void>;
  /** Durable attempts own failed-upload deletion. A lost database reply may
   * already have committed; inline deletion would destroy that saved receipt. */
  receiptAttemptsManaged?: boolean;

  // ------------------------------------------------------- business-media
  // ROADMAP 0.11 slice 4. **A FUNCTION RATHER THAN AN IMPORT OF `r2.ts`, AND
  // THAT IS NOT A STYLE CHOICE.** Three suites rebuild this file in a temp
  // directory with one guard removed, rewriting its `./http.ts` and
  // `./photoKey.ts` specifiers to absolute paths; a third relative import
  // would fail to resolve there and take two already-green suites with it.
  // Wiring it in `photo-door/index.ts` keeps this file's import list at two
  // and keeps the public base — which is configuration, not logic — out of
  // the part that is tested in memory.
  /** The public address of one `business-media` object. Absent or returning
   *  `null` means no public base is configured, and the store says so. */
  mediaUrl?(key: string): string | null;

  /** `null` when the R2 credentials are not configured. */
  r2: PhotoStore | null;
  log(...args: unknown[]): void;
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** The plain sentence for being over the cap: what is used, what the limit is,
 *  and what frees room. */
export const fullSentence = (b: Budget) =>
  `Photo storage is full: ${mb(b.used_bytes)} of ${mb(b.cap_bytes)} used. Delete old job photos to make room.`;

/**
 * The key this product mints: `businessId/ownerId/id.ext`. Minted again here,
 * rather than trusted from the browser, and `tests/photo-door-server.test.mjs`
 * asserts it equals what `storagePath()` in `app/src/lib/photo-rules.js` mints
 * for the same inputs — two copies of a path rule that can disagree is this
 * repo's most repeated failure, so the test calls both.
 */
export const mintKey = (businessId: string, bookingId: string, photoId: string, contentType: string) =>
  `${businessId}/${bookingId}/${photoId}.${EXT[contentType]}`;

const bad = (error: string, status = 400) => json({ error }, status);
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const dim = (v: unknown) => (isInt(v) && v > 0 && v <= 20000 ? v : null);

export async function handlePhotoDoor(req: Request, deps: PhotoDeps): Promise<Response> {
  if (req.method === "OPTIONS") return preflight();

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return bad("Send a JSON body."); }
  if (body === null || typeof body !== "object" || Array.isArray(body)) return bad("Send a JSON body.");

  const action = body.action;
  if (action !== "start" && action !== "finish" && action !== "urls" && action !== "remove") {
    return bad("Unknown action");
  }

  // WHICH STORE. Absent is `job`, so slice 1's app half — which sends no
  // `store` field — keeps working byte for byte. An unknown name is refused
  // rather than defaulted: defaulting would sign a job-photo URL for somebody
  // who asked for something else and thought they got it.
  const storeName = body.store === undefined ? "job" : body.store;
  if (typeof storeName !== "string" || !(storeName in STORES)) {
    return bad(`store must be ${Object.keys(STORES).join(" or ")}.`);
  }
  const store = STORES[storeName as StoreName];
  const isReceipt = storeName === "receipt";
  // The receipt store needs four extra deps. Saying so here beats throwing
  // from inside a handler, and it is the same shape as the missing-R2 refusal
  // below: a thing that is not wired up says so in words.
  if (isReceipt && !(deps.expenseBelongs && deps.getReceipt && deps.saveReceipt && deps.clearReceipt)) {
    return bad("Receipt storage is not set up on the server yet.", 503);
  }
  // THE SAME SHAPE FOR THE PUBLIC STORE, and here the thing that can be absent
  // is the one thing R2 has no default for: `business-media` is public-read, so
  // a stored url is the whole point, and R2 has no public address until one is
  // bound in the Cloudflare dashboard (`R2_MEDIA_BASE`, `_shared/r2.ts`).
  // Signing an upload with nowhere to read it from would store a logo nobody
  // can ever see, so it refuses in words instead.
  const isMedia = storeName === "media";
  if (isMedia && !deps.mediaUrl) {
    return bad("Public image storage is not set up on the server yet.", 503);
  }

  // WHO — the first question. An explicit business, because "the only one the
  // user belongs to" is a guess and this door signs for exactly one tenant.
  const businessId = body.business_id;
  if (typeof businessId !== "string" || !UUID.test(businessId)) return bad("business_id is required");
  // ROADMAP 4.3c: a read-only support session may READ photos ("urls") and nothing else.
  const member = await deps.requireMember(req, businessId, { allowSupport: action === "urls" });
  if (!member) return bad("Unauthorized", 401);

  // THE CEILING, per business. It sits BEFORE any database or R2 work so a
  // loop cannot spend either. One bucket for all four actions: a detailer's
  // busiest day is a few hundred calls, and the limit is a ceiling, not a rule.
  const allowed = await deps.withinLimits([{ bucket: "photo-door", key: member.businessId, ...deps.limit }]);
  if (!allowed) return bad("Too many photo requests in the last hour. Wait a few minutes and try again.", 429);

  // Nothing below can work without the store; say so in words rather than
  // letting a missing credential surface as an error from deep inside.
  if (!deps.r2) return bad("Photo storage is not set up on the server yet.", 503);
  const r2 = deps.r2;
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();

  try {
    // -------------------------------------------- business-media (slice 4)
    // FIRST, so nothing below has to ask "unless it is the public one". Two
    // actions and no others: `start` mints the key and the two URLs, `remove`
    // deletes one object by key. There is nothing to sign a GET for — the
    // bucket is public — and nothing to finish, because there is no row.
    if (isMedia) {
      // THE PERMISSION, ON BOTH ACTIONS. `20260904001000_catalog_behind_settings.sql`
      // requires `settings` to insert, update AND delete here, which is a
      // stricter rule than the other two stores carry, and the service role
      // bypasses the policy that states it — so it is stated again here or it
      // is gone.
      //
      // **AND IT IS SPELLED THROUGH A LOCAL RATHER THAN AS THE SAME CONDITION
      // THE OTHER TWO STORES USE, WHICH IS NOT TIDINESS.**
      // `tests/photo-door-server.test.mjs` sabotages the job store by replacing
      // the exact text of its own `settings` condition, and a line that
      // appears twice is not a line it can replace — written the obvious way,
      // this branch turned that suite's `staffRemoved` canary into "the text to
      // sabotage is not unique" and TWO green suites went red. It is the same
      // fault the receipts branch met from the other direction (its budget
      // locals are `rb`/`rBudget` for this reason) and `docs/gotchas.md` 95 is
      // the general case. The local name is the whole fix.
      const mayChangeBranding = deps.can(member, "settings");
      if (!mayChangeBranding) {
        return bad(`Changing a business's ${store.noun}s needs the settings permission.`, 403);
      }

      if (action === "remove") {
        // THE KEY IS THE ONLY HANDLE, so the isolation is the only thing doing
        // the job a row's `business_id` does in the other two stores. A key
        // belonging to anybody else — or of any shape this product does not
        // mint — is 404, exactly like one that does not exist, so a prober
        // learns nothing from the difference.
        const key = body.key;
        if (!businessOwnsKey(member.businessId, key, "media")) return bad("Image not found", 404);
        await r2.del(store.bucket, key as string);
        return json({ removed: true });
      }
      if (action !== "start") {
        return bad(`A business image is stored in one step; there is no ${action} step for it.`);
      }

      const folder = body.folder;
      if (typeof folder !== "string" || !(MEDIA_FOLDERS as readonly string[]).includes(folder)) {
        return bad(`folder must be ${MEDIA_FOLDERS.join(", ")}.`);
      }
      const fileId = body.file_id;
      if (typeof fileId !== "string" || !UUID.test(fileId)) return bad("file_id is not valid.");
      const type = body.content_type;
      if (typeof type !== "string" || !(type in MEDIA_EXT)) {
        return bad(`A business image must be ${Object.keys(MEDIA_EXT).join(", ")}.`);
      }
      const claimed = body.claimed_bytes;
      if (!isInt(claimed) || claimed <= 0) return bad("claimed_bytes must be a whole number of bytes.");
      if (claimed > store.maxBytes) return bad(`That image is larger than ${mb(store.maxBytes)}.`, 413);

      // MINTED FROM THE MEMBER'S BUSINESS, never from the body, which is the
      // whole isolation: the first folder cannot come from the browser.
      const key = `${member.businessId}/${folder}/${fileId}.${MEDIA_EXT[type]}`;
      const url = deps.mediaUrl!(key);
      if (!url) return bad("Public image storage is not set up on the server yet.", 503);
      return json({
        // `claimed` is signed INTO the URL as `content-length`. This store has
        // no `finish` to measure the real size at, so this is the only thing
        // holding the 10 MB ceiling the Supabase bucket used to enforce
        // itself: a body of any other length fails the signature at R2.
        upload_url: await r2.putUrl(store.bucket, key, type, PUT_SECONDS, claimed),
        key, public_url: url, expires_in: PUT_SECONDS,
      });
    }

    // ------------------------------------------------------------- urls
    if (action === "urls") {
      const keys = body.keys;
      if (!Array.isArray(keys) || keys.length === 0 || keys.length > URL_BATCH) {
        return bad(`keys must be a list of 1 to ${URL_BATCH} keys.`);
      }
      // THE ISOLATION, rebuilt: a key is signed only if it parses as one of
      // ours AND its first segment is this business. Anything else is simply
      // absent from the answer, which also tells a prober nothing.
      const urls: Record<string, string> = {};
      for (const k of new Set(keys)) {
        if (businessOwnsKey(member.businessId, k)) urls[k as string] = await r2.getUrl(store.bucket, k as string, GET_SECONDS);
      }
      return json({ urls, expires_in: GET_SECONDS });
    }

    // ----------------------------------------------------------- remove
    if (action === "remove") {
      // THE SAME ASYMMETRY ON BOTH STORES, and the migration gives the sharper
      // reason for receipts: a receipt is the evidence behind a number in the
      // accounts, so anyone may attach one and removing it is a settings act.
      if (!deps.can(member, "settings")) return bad(`Removing a ${store.noun} needs the settings permission.`, 403);

      if (isReceipt) {
        const expenseId = body.expense_id;
        if (typeof expenseId !== "string" || !UUID.test(expenseId)) return bad("expense_id is not valid.");
        const row = await deps.getReceipt!(member.businessId, expenseId);
        // An expense that is not this business's reads as null, so another
        // tenant's uuid 404s exactly like one that does not exist.
        if (!row || !row.receipt_path) return bad("Receipt not found", 404);
        // COLUMNS FIRST, then the object — the same order and the same reason
        // as the job store: the other way can leave a path pointing at nothing,
        // which is a broken image on an expense for ever.
        await deps.clearReceipt!(member.businessId, expenseId);
        try { await r2.del(store.bucket, row.receipt_path); }
        catch { deps.log("photo-door: receipt object not removed after its columns were", expenseId); }
        return json({ removed: true });
      }

      const photoId = body.photo_id;
      if (typeof photoId !== "string" || !UUID.test(photoId)) return bad("photo_id is not valid.");
      const row = await deps.getPhoto(member.businessId, photoId);
      if (!row) return bad("Photo not found", 404);
      // ROW FIRST, then the object. The other order can leave a row pointing at
      // nothing, which is a broken image on a job record for ever; this one can
      // at worst leave bytes, which the reconcile counts.
      await deps.deletePhoto(member.businessId, photoId);
      try { await r2.del(store.bucket, row.path); }
      catch { deps.log("photo-door: object not removed after its row was", row.id); }
      return json({ removed: true });
    }

    // ------------------------------------- RECEIPTS: start and finish
    // Kept as its own block rather than threaded through the job store's,
    // because the two differ in the one place that matters: a job photo
    // INSERTS a row and a receipt UPDATES an expense that is already there.
    // Threading that through one body would mean a flag read in four places,
    // and a flag read in four places is three chances to read it wrong.
    // **THE BUDGET LOCALS HERE ARE `rb` / `rBudget` AND MUST STAY DIFFERENT
    // FROM THE JOB STORE'S `b` / `budget`.** `tests/photo-door-server.test.mjs`
    // sabotages the job store by deleting one line of its text, and a line
    // that appears twice is not a line it can delete: the first version of
    // this branch copied the names and turned that suite's `underClaimStored`
    // canary into "the text to sabotage is not unique". `docs/gotchas.md` 95
    // is about a canary that stops biting; this is the same fault arriving
    // from the other direction, and renaming is the whole fix.
    if (isReceipt) {
      const expenseId = body.expense_id;
      const fileId = body.file_id;
      if (typeof expenseId !== "string" || !UUID.test(expenseId)) return bad("expense_id is not valid.");
      if (typeof fileId !== "string" || !UUID.test(fileId)) return bad("file_id is not valid.");
      // THE ISOLATION. The expense must be this business's; another tenant's
      // uuid 404s exactly like one that does not exist, and the key below is
      // minted from `member.businessId` rather than from anything sent.
      if (!(await deps.expenseBelongs!(member.businessId, expenseId))) return bad("Expense not found", 404);

      const row = await deps.getReceipt!(member.businessId, expenseId);
      if (!row) return bad("Expense not found", 404);

      if (action === "start") {
        const type = body.content_type;
        if (typeof type !== "string" || !(type in EXT)) return bad("Receipts must be JPEG or PNG.");
        const claimed = body.claimed_bytes;
        if (!isInt(claimed) || claimed <= 0) return bad("claimed_bytes must be a whole number of bytes.");
        if (claimed > store.maxBytes) return bad(`That receipt is larger than ${mb(store.maxBytes)}.`, 413);
        // **AN EXPENSE HOLDS ONE RECEIPT, so a second is refused rather than
        // silently replacing the first.** `removeReceipt` in
        // `app/src/lib/receipts.js` already says replacing is removing then
        // adding, "so the old file never leaks" — if start overwrote the
        // column here, the old object would stay in R2 with nothing pointing
        // at it, invisible to everything except the nightly reconcile.
        if (row.receipt_path) return bad("That expense already has a receipt. Remove it first.", 409);

        // THE CEILING, and unreadable fails CLOSED. One allowance across both
        // stores: `job_photo_budget()` was replaced to sum them the day the
        // receipts bucket was made, which is the whole reason a receipt store
        // that ignored it would make the meter a lie.
        const rb = await deps.budget(member.businessId, token);
        if (!rb || !(Number(rb.cap_bytes) > 0) || !Number.isFinite(Number(rb.used_bytes))) {
          return bad("Could not check your photo storage. Nothing was saved. Try again in a minute.", 503);
        }
        const rBudget = { used_bytes: Number(rb.used_bytes), cap_bytes: Number(rb.cap_bytes) };
        if (rBudget.used_bytes + claimed > rBudget.cap_bytes) return bad(fullSentence(rBudget), 409);

        const key = mintKey(member.businessId, expenseId, fileId, type);
        return json({ upload_url: await r2.putUrl(store.bucket, key, type, PUT_SECONDS), key, expires_in: PUT_SECONDS });
      }

      // ---- finish -------------------------------------------------------
      // Finishing twice is one answer, the same bargain the job store makes:
      // the first reply may have been lost on a bad connection. It is the SAME
      // file only when the column already points at this file id; a different
      // one is a second receipt and is refused, not overwritten.
      const mine = `${member.businessId}/${expenseId}/${fileId}.`;
      if (row.receipt_path) {
        if (row.receipt_path.startsWith(mine)) return json({ expense: row });
        return bad("That expense already has a receipt. Remove it first.", 409);
      }

      let rKey = "";
      let rStored: { exists: boolean; bytes: number | null } = { exists: false, bytes: null };
      for (const ext of ["jpg", "png"]) {
        const k = `${mine}${ext}`;
        const h = await r2.head(store.bucket, k);
        if (h.exists) { rKey = k; rStored = h; break; }
      }
      if (!rStored.exists) return bad("The receipt never arrived, so nothing was saved. Try adding it again.", 409);

      // THE SIZE IS R2's, never the client's. Anything R2 will not state as a
      // positive whole number is a refusal and the object goes — a zero here
      // would count as free against the allowance for ever.
      const rBytes = rStored.bytes;
      if (!isInt(rBytes) || rBytes <= 0 || rBytes > store.maxBytes) {
        if (!deps.receiptAttemptsManaged) await r2.del(store.bucket, rKey).catch(() => deps.log("photo-door: could not remove an unusable receipt", expenseId));
        return bad("The stored receipt has no usable size, so it was not saved.", 422);
      }

      // AND THE CAP AGAIN, against what is really there. This is the check a
      // client that under-reported its size meets.
      const rb = await deps.budget(member.businessId, token);
      if (!rb || !(Number(rb.cap_bytes) > 0) || !Number.isFinite(Number(rb.used_bytes))) {
        if (!deps.receiptAttemptsManaged) await r2.del(store.bucket, rKey).catch(() => deps.log("photo-door: could not remove an unchecked receipt", expenseId));
        return bad("Could not check your photo storage. Nothing was saved. Try again in a minute.", 503);
      }
      const rBudget = { used_bytes: Number(rb.used_bytes), cap_bytes: Number(rb.cap_bytes) };
      if (rBudget.used_bytes + rBytes > rBudget.cap_bytes) {
        if (!deps.receiptAttemptsManaged) await r2.del(store.bucket, rKey).catch(() => deps.log("photo-door: could not remove an over-cap receipt", expenseId));
        return bad(fullSentence(rBudget), 409);
      }

      try {
        const saved = await deps.saveReceipt!({
          id: expenseId, business_id: member.businessId,
          receipt_path: rKey, receipt_bytes: rBytes,
          receipt_width: dim(body.width), receipt_height: dim(body.height),
          receipt_uploaded_at: new Date().toISOString(),
        });
        return json({ expense: saved });
      } catch {
        // Managed attempts are reclaimed only after the database claims them.
        // An exception may mean the commit's REPLY was lost, not its write.
        if (!deps.receiptAttemptsManaged) await r2.del(store.bucket, rKey).catch(() => deps.log("photo-door: could not remove an unrecorded receipt", expenseId));
        return bad("Could not save the receipt. Try again.", 500);
      }
    }

    // ------------------------------------------- start and finish share
    const bookingId = body.booking_id;
    const photoId = body.photo_id;
    if (typeof bookingId !== "string" || !UUID.test(bookingId)) return bad("booking_id is not valid.");
    if (typeof photoId !== "string" || !UUID.test(photoId)) return bad("photo_id is not valid.");
    if (typeof body.kind !== "string" || !KINDS.includes(body.kind)) return bad("kind must be before, after or damage.");
    // The booking must be this business's: another tenant's uuid 404s, exactly
    // like one that does not exist.
    if (!(await deps.bookingBelongs(member.businessId, bookingId))) return bad("Booking not found", 404);

    const existing = await deps.getPhoto(member.businessId, photoId);

    // ------------------------------------------------------------ start
    if (action === "start") {
      const type = body.content_type;
      if (typeof type !== "string" || !(type in EXT)) return bad("Photos must be JPEG or PNG.");
      const claimed = body.claimed_bytes;
      if (!isInt(claimed) || claimed <= 0) return bad("claimed_bytes must be a whole number of bytes.");
      if (claimed > MAX_BYTES) return bad(`That photo is larger than ${mb(MAX_BYTES)}.`, 413);
      if (existing) return bad("That photo is already saved.", 409);

      // THE SECOND QUESTION: do you have room? Unreadable fails CLOSED.
      const b = await deps.budget(member.businessId, token);
      if (!b || !(Number(b.cap_bytes) > 0) || !Number.isFinite(Number(b.used_bytes))) {
        return bad("Could not check your photo storage. Nothing was saved. Try again in a minute.", 503);
      }
      const budget = { used_bytes: Number(b.used_bytes), cap_bytes: Number(b.cap_bytes) };
      if (budget.used_bytes + claimed > budget.cap_bytes) return bad(fullSentence(budget), 409);

      const key = mintKey(member.businessId, bookingId, photoId, type);
      return json({ upload_url: await r2.putUrl(store.bucket, key, type, PUT_SECONDS), key, expires_in: PUT_SECONDS });
    }

    // ----------------------------------------------------------- finish
    // Finishing twice is one row: the first answer may have been lost on a
    // bad connection, and the retry gets the same row back.
    if (existing) return json({ photo: existing });

    // The extension is the one thing finish is not told, so it is found by
    // asking R2 for the object under each extension this product mints.
    let key = "";
    let stored: { exists: boolean; bytes: number | null } = { exists: false, bytes: null };
    for (const ext of ["jpg", "png"]) {
      const k = `${member.businessId}/${bookingId}/${photoId}.${ext}`;
      const h = await r2.head(store.bucket, k);
      if (h.exists) { key = k; stored = h; break; }
    }
    if (!stored.exists) return bad("The photo never arrived, so nothing was saved. Try adding it again.", 409);

    // THE SIZE IS R2's. Anything R2 will not state as a positive whole number
    // is a refusal and the object goes, never a zero that would count as free.
    const bytes = stored.bytes;
    if (!isInt(bytes) || bytes <= 0 || bytes > MAX_BYTES) {
      await r2.del(store.bucket, key).catch(() => deps.log("photo-door: could not remove an unusable object", photoId));
      return bad("The stored photo has no usable size, so it was not saved.", 422);
    }

    // AND THE CAP AGAIN, against what is really there. This is the check a
    // client that under-reported its size meets.
    const b = await deps.budget(member.businessId, token);
    if (!b || !(Number(b.cap_bytes) > 0) || !Number.isFinite(Number(b.used_bytes))) {
      await r2.del(store.bucket, key).catch(() => deps.log("photo-door: could not remove an unchecked object", photoId));
      return bad("Could not check your photo storage. Nothing was saved. Try again in a minute.", 503);
    }
    const budget = { used_bytes: Number(b.used_bytes), cap_bytes: Number(b.cap_bytes) };
    if (budget.used_bytes + bytes > budget.cap_bytes) {
      await r2.del(store.bucket, key).catch(() => deps.log("photo-door: could not remove an over-cap object", photoId));
      return bad(fullSentence(budget), 409);
    }

    const caption = typeof body.caption === "string" && body.caption.trim() ? body.caption.trim().slice(0, 500) : null;
    try {
      const photo = await deps.insertPhoto({
        id: photoId, business_id: member.businessId, booking_id: bookingId, kind: body.kind as string,
        path: key, bytes, width: dim(body.width), height: dim(body.height), caption, created_by: member.userId,
      });
      return json({ photo });
    } catch {
      // The row did not land, so the object is removed: an object with no row
      // is invisible to every check this product has.
      await r2.del(store.bucket, key).catch(() => deps.log("photo-door: could not remove an unrecorded object", photoId));
      return bad("Could not save the photo. Try again.", 500);
    }
  } catch (e) {
    // A message from R2 or the database never reaches the caller, and the URL
    // inside a failed request must not reach the log either.
    deps.log("photo-door failed", action, e instanceof Error ? e.name : "error");
    return bad("The photo service had a problem. Try again in a minute.", 500);
  }
}
