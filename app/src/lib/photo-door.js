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
// **WHAT IT DOES NOT COVER, ON PURPOSE.** `business-media` (the public gallery
// copy) and `expense-receipts` stay on Supabase Storage in this slice; so does
// `publishToGallery`'s destination. See `ROADMAP.md` 0.11 for the slices left.
// ---------------------------------------------------------------------------

import { storagePath } from "./photo-rules.js";

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
  if (typeof s === "number" && s >= 500) return new Error(DOOR_WORDS.failed);
  if (typeof s === "number") return err;
  if (err instanceof TypeError) return new Error(DOOR_WORDS.unreachable);
  return err instanceof Error ? err : new Error(String(err));
}

/** `start`'s answer, or a thrown sentence. The key must be EXACTLY the one
 *  this press asked for: the browser will not PUT to any other object. */
export function readStart(resp, { businessId, bookingId, photoId, type }) {
  const want = storagePath({ businessId, ownerId: bookingId, id: photoId, type });
  if (!isObject(resp) || typeof resp.upload_url !== "string" || !/^https:\/\//.test(resp.upload_url)
    || typeof resp.key !== "string" || resp.key !== want) refuse("unreadable");
  return { uploadUrl: resp.upload_url, key: resp.key };
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
