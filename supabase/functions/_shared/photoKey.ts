// THE TENANT ISOLATION R2 DOES NOT HAVE. ROADMAP 0.11.
//
// ---------------------------------------------------------------------------
// WHAT THIS REPLACES, AND WHY IT IS A FILE OF ITS OWN
// ---------------------------------------------------------------------------
// Under Supabase Storage, one detailer is kept out of another's photographs by
// the DATABASE:
//
//   (storage.foldername(name))[1] in (select public.current_business_ids()::text)
//
// — `20260906010000_job_photos.sql`, and the same shape on `expense-receipts`
// and `business-media`. **The first folder of the object path is the only thing
// standing between one detailer and another's files**, and Postgres enforces it
// on every select, insert and delete, whatever the caller does.
//
// **R2 HAS NO EQUIVALENT. It has no idea what a business is.** A bucket is a
// flat namespace of keys and whoever holds a credential can address any of
// them. So the move to R2 does not merely change where bytes live: **it deletes
// a guard that has been enforced by the database since 2026-08-27, and this
// file is where it is rebuilt.** `docs/the-photo-allowance.md` § 4.2 calls it
// "the loudest warning in `docs/recovery.md` and in `FOR-ANDREW.md`, and it is
// not optional: without it, one detailer can reach another's photographs."
//
// **THE DOOR IS THE EDGE FUNCTION THAT MINTS A PRESIGNED URL, AND THIS IS THE
// FIRST OF THE TWO QUESTIONS ASKED AT IT:** *is this your business?* The second
// — *do you have room?* — is `job_photo_budget()` and belongs in the same call.
// **Neither door nor budget check is built here.** This file is the guard only:
// no upload path is switched, no allowance number is touched, and nothing
// writes a photo. That is deliberate and it is the sequencing the roadmap asks
// for — the guard has to be right BEFORE one real photo is written, not
// alongside it.
//
// ---------------------------------------------------------------------------
// AN ALLOWLIST, NOT A DENYLIST, AND THAT IS THE WHOLE DESIGN
// ---------------------------------------------------------------------------
// The obvious implementation is the wrong one:
//
//   key.split("/")[0] === businessId            // WRONG
//   key.startsWith(businessId + "/")            // WRONG
//
// Both answer "yes" to `B/../A/booking/photo.jpg`, whose first segment is `B`
// and whose actual object is `A`'s. Every denylist for that — strip `..`,
// reject `%2f`, normalise backslashes — is a list somebody has to keep
// complete, and the failure mode is silent: the guard still returns `true`, no
// test goes red, and the cross-tenant checks pass on the day it is written.
// That is the exact shape `app/src/lib/photo-rules.js` already warns about for
// the minting side.
//
// **So nothing is stripped, normalised or rejected by pattern. A key is parsed
// against the ONE shape this product mints, anchored at both ends, and anything
// else is not a key.** `..` is not a uuid. `%2f` is not hex. A leading slash
// makes the first segment empty, and empty is not a uuid. The attack surface is
// not defended against; it is unrepresentable.
//
// **THE SHAPE IS `storagePath()`'s, AND THE TEST PROVES THEY AGREE BY CALLING
// BOTH** rather than by containing a second copy of the rule.
// `app/src/lib/photo-rules.js` mints `businessId/ownerId/id.ext`, where
// `ownerId` is the booking (a job photo) or the expense (a receipt), and
// `extForType` yields only `jpg` or `png`. Two copies of a path rule that can
// disagree is this repo's most repeated failure; there is one rule, minted
// there and verified here, and `tests/photo-key-isolation.test.mjs` imports
// both and asserts it.
//
// **STRICTNESS IS SAFE HERE, AND IT WAS CHECKED RATHER THAN ASSUMED.** A guard
// this narrow would refuse any object already stored under an older shape.
// Read against the live database on 2026-09-24: `job_photos` holds **0 rows, 0
// bytes, 0 distinct paths**, and no expense carries a receipt path. **There is
// no legacy key to honour.** If that ever stops being true, this file must be
// widened deliberately and its test widened with it — not loosened to make a
// run go green.

/** The two private buckets that carry per-business isolation in their path. */
export const TENANT_PRIVATE_BUCKETS = ["job-photos", "expense-receipts"] as const;

/**
 * A key longer than this is not one of ours and is not worth parsing or
 * logging. Three 36-character uuids, two slashes and a four-character
 * extension is 116; the ceiling is generous rather than tight.
 */
const MAX_KEY_LENGTH = 256;

/** Lowercase canonical uuid, exactly as `uuid::text` renders in Postgres. */
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/**
 * The ONE shape. Anchored at both ends, no optional parts, no character class
 * that can match a separator.
 *
 * Case matters: Postgres renders a uuid lowercase and an R2 key is
 * case-sensitive, so an uppercase variant is a different object and is refused.
 * Fail closed.
 */
const OBJECT_KEY = new RegExp(`^(${UUID})/(${UUID})/(${UUID})\\.(jpg|png)$`);

export interface ParsedObjectKey {
  /** The tenant. The first segment, and the whole of the isolation. */
  businessId: string;
  /** The booking for a job photo, the expense for a receipt. */
  ownerId: string;
  photoId: string;
  ext: "jpg" | "png";
}

/**
 * The parsed key, or `null` if the string is not a key this product mints.
 *
 * `null` rather than a throw, so the caller decides what a bad key looks like
 * on the wire. It returns `null` for every one of: a traversal segment, an
 * empty segment, a leading or trailing slash, a backslash, a percent-encoded
 * separator, a null byte, an uppercase uuid, a bucket name glued on the front,
 * an absolute URL, a query string, a missing or unexpected extension, and a
 * key of the right shape but the wrong length — not because each is checked,
 * but because none of them can match the pattern above.
 */
export function parseObjectKey(key: unknown): ParsedObjectKey | null {
  if (typeof key !== "string") return null;
  if (key.length === 0 || key.length > MAX_KEY_LENGTH) return null;
  const m = OBJECT_KEY.exec(key);
  if (!m) return null;
  return { businessId: m[1], ownerId: m[2], photoId: m[3], ext: m[4] as "jpg" | "png" };
}

/**
 * **THE GUARD.** Does this business own this object?
 *
 * Exact equality on the first segment of a fully parsed key — never
 * `startsWith`, never a prefix, never a `split`. A business id that is not
 * itself a canonical uuid is refused too, so a caller that passes `undefined`,
 * an empty string, `"*"` or a list cannot open the door by accident.
 */
export function businessOwnsKey(businessId: unknown, key: unknown): boolean {
  if (typeof businessId !== "string") return false;
  if (!new RegExp(`^${UUID}$`).test(businessId)) return false;
  const parsed = parseObjectKey(key);
  return parsed !== null && parsed.businessId === businessId;
}

/**
 * The same question, for the call site that should stop rather than branch.
 *
 * **The message names neither the key nor the other tenant.** A refusal that
 * echoes the key back tells a prober whether the object exists and whose it is,
 * which is the thing being protected. The caller logs what it needs on its own
 * side.
 */
export function assertBusinessOwnsKey(businessId: unknown, key: unknown): ParsedObjectKey {
  if (!businessOwnsKey(businessId, key)) {
    throw new Error("that file does not belong to this business");
  }
  return parseObjectKey(key) as ParsedObjectKey;
}

/**
 * The prefix to list or sum a single business's objects under — for the
 * periodic reconcile in `docs/the-photo-allowance.md` § 6.
 *
 * It carries its trailing slash **for the reason the guard does not use
 * `startsWith`**: `<uuid>` has no prefix relationship with another uuid, but a
 * prefix without the separator is the habit that makes `1` match `10` the day
 * an id stops being a uuid. Refuses a non-uuid rather than returning a prefix
 * that would list the whole bucket.
 */
export function businessPrefix(businessId: unknown): string {
  if (typeof businessId !== "string" || !new RegExp(`^${UUID}$`).test(businessId)) {
    throw new Error("businessPrefix: not a business id");
  }
  return `${businessId}/`;
}
