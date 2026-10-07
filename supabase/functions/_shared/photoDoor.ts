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
import { businessOwnsKey } from "./photoKey.ts";

/** The bucket this door signs for. The other two stay on Supabase in slice 1. */
export const BUCKET = "job-photos";
/** The bucket's own `file_size_limit`: the ceiling, not the expectation. */
export const MAX_BYTES = 10 * 1024 * 1024;
/** How long a PUT URL lives: long enough for a slow driveway upload. */
export const PUT_SECONDS = 600;
/** How long a GET URL lives. Matches `SIGNED_FOR` in `app/src/lib/photos.js`. */
export const GET_SECONDS = 3600;
/** At most this many keys in one `urls` call (`DOOR_BATCH` in the app). */
export const URL_BATCH = 100;

const KINDS = ["before", "after", "damage"];
// `shrink()` re-encodes to JPEG and only PNG survives as PNG, and
// `parseObjectKey` knows exactly these two extensions.
const EXT: Record<string, "jpg" | "png"> = { "image/jpeg": "jpg", "image/png": "png" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface Member { userId: string; businessId: string; role: string; permissions: string[] }
export interface PhotoRow {
  id: string; business_id: string; booking_id: string; kind: string; path: string; bytes: number;
  width: number | null; height: number | null; caption: string | null;
  created_by?: string | null; created_at?: string;
}
export interface Budget { used_bytes: number; cap_bytes: number }
export interface PhotoStore {
  putUrl(bucket: string, key: string, contentType: string, expires: number): Promise<string>;
  getUrl(bucket: string, key: string, expires: number): Promise<string>;
  head(bucket: string, key: string): Promise<{ exists: boolean; bytes: number | null }>;
  del(bucket: string, key: string): Promise<void>;
}
export interface PhotoDeps {
  requireMember(req: Request, businessId: string): Promise<Member | null>;
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

  // WHO — the first question. An explicit business, because "the only one the
  // user belongs to" is a guess and this door signs for exactly one tenant.
  const businessId = body.business_id;
  if (typeof businessId !== "string" || !UUID.test(businessId)) return bad("business_id is required");
  const member = await deps.requireMember(req, businessId);
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
        if (businessOwnsKey(member.businessId, k)) urls[k as string] = await r2.getUrl(BUCKET, k as string, GET_SECONDS);
      }
      return json({ urls, expires_in: GET_SECONDS });
    }

    // ----------------------------------------------------------- remove
    if (action === "remove") {
      if (!deps.can(member, "settings")) return bad("Removing a photo needs the settings permission.", 403);
      const photoId = body.photo_id;
      if (typeof photoId !== "string" || !UUID.test(photoId)) return bad("photo_id is not valid.");
      const row = await deps.getPhoto(member.businessId, photoId);
      if (!row) return bad("Photo not found", 404);
      // ROW FIRST, then the object. The other order can leave a row pointing at
      // nothing, which is a broken image on a job record for ever; this one can
      // at worst leave bytes, which the reconcile counts.
      await deps.deletePhoto(member.businessId, photoId);
      try { await r2.del(BUCKET, row.path); }
      catch { deps.log("photo-door: object not removed after its row was", row.id); }
      return json({ removed: true });
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
      return json({ upload_url: await r2.putUrl(BUCKET, key, type, PUT_SECONDS), key, expires_in: PUT_SECONDS });
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
      const h = await r2.head(BUCKET, k);
      if (h.exists) { key = k; stored = h; break; }
    }
    if (!stored.exists) return bad("The photo never arrived, so nothing was saved. Try adding it again.", 409);

    // THE SIZE IS R2's. Anything R2 will not state as a positive whole number
    // is a refusal and the object goes, never a zero that would count as free.
    const bytes = stored.bytes;
    if (!isInt(bytes) || bytes <= 0 || bytes > MAX_BYTES) {
      await r2.del(BUCKET, key).catch(() => deps.log("photo-door: could not remove an unusable object", photoId));
      return bad("The stored photo has no usable size, so it was not saved.", 422);
    }

    // AND THE CAP AGAIN, against what is really there. This is the check a
    // client that under-reported its size meets.
    const b = await deps.budget(member.businessId, token);
    if (!b || !(Number(b.cap_bytes) > 0) || !Number.isFinite(Number(b.used_bytes))) {
      await r2.del(BUCKET, key).catch(() => deps.log("photo-door: could not remove an unchecked object", photoId));
      return bad("Could not check your photo storage. Nothing was saved. Try again in a minute.", 503);
    }
    const budget = { used_bytes: Number(b.used_bytes), cap_bytes: Number(b.cap_bytes) };
    if (budget.used_bytes + bytes > budget.cap_bytes) {
      await r2.del(BUCKET, key).catch(() => deps.log("photo-door: could not remove an over-cap object", photoId));
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
      await r2.del(BUCKET, key).catch(() => deps.log("photo-door: could not remove an unrecorded object", photoId));
      return bad("Could not save the photo. Try again.", 500);
    }
  } catch (e) {
    // A message from R2 or the database never reaches the caller, and the URL
    // inside a failed request must not reach the log either.
    deps.log("photo-door failed", action, e instanceof Error ? e.name : "error");
    return bad("The photo service had a problem. Try again in a minute.", 500);
  }
}
