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

// ---------------------------------------------------------------------------
// THE SECOND SHAPE — `business-media`. ROADMAP 0.11 slice 4.
// ---------------------------------------------------------------------------
// **THIS IS THE DELIBERATE WIDENING THIS FILE'S OWN HEADER ASKS FOR, NOT A
// LOOSENING TO MAKE A RUN GO GREEN.** The header says a key of an older or
// different shape must be honoured only by widening on purpose and widening
// the test with it. Here is the reason, and it is not legacy data: the PUBLIC
// bucket's keys were never the private shape and never could be.
//
//   `business-media`  `<business>/gallery/<uuid>.webp`
//   `job-photos`      `<business>/<booking>/<uuid>.jpg`
//
// The middle segment is a FOLDER NAME — `gallery`, `branding`, `intake`, the
// three `app/src` actually passes to `uploadBusinessPhoto` — because a logo
// hangs off no row at all. So `parseObjectKey` returned `null` for every
// business-media key, which is correct refusal and useless as a guard: the
// door would have refused the whole store.
//
// **THE DESIGN IS UNCHANGED AND THAT IS THE POINT.** It is still one anchored
// pattern per store, still an allowlist, still nothing stripped or normalised.
// `..` is not a uuid and is not one of three literal folder names either.
// What is wider is exactly two things, each read off the bucket's own
// declaration in `20260827001000_phase2_cleanup_and_storage.sql` rather than
// chosen here:
//
//   the folders  the three `app/src` passes, as literals, closed.
//   the types    the five in the bucket's own `allowed_mime_types`. **SVG IS
//                NOT AMONG THEM and that is lucky rather than careful** — an
//                SVG may carry script, and a public bucket on a custom domain
//                would serve it from the platform's own name. The bucket has
//                refused it since the day it was made; this does too.
//
// **EVERY EXISTING CALLER IS UNTOUCHED** because `"private"` is the default:
// `forgetPhotos.ts`, `photoReconcile.ts` and the job/receipt halves of the
// door pass no shape and get byte-for-byte what they got before.

/** The one public bucket. Public-READ; writes still need the `settings`
 *  permission (`20260904001000_catalog_behind_settings.sql`). */
export const TENANT_PUBLIC_BUCKET = "business-media";

/** The folders `uploadBusinessPhoto` is called with, and no others. A closed
 *  list: `gallery` (the marketing gallery), `branding` (logo and hero) and
 *  `intake` (photographs offered for a website that is not built yet). */
export const MEDIA_FOLDERS = ["gallery", "branding", "intake"] as const;

/** The five types `business-media`'s own `allowed_mime_types` permits, as the
 *  extensions a key may end in. Signing for a sixth would hand out a URL the
 *  bucket itself refuses. */
export const MEDIA_EXTS = ["jpg", "png", "webp", "gif", "avif"] as const;

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

/**
 * The public bucket's shape, built from the two lists above so there is no
 * second copy of either. Anchored at both ends exactly like the private one.
 */
const MEDIA_KEY = new RegExp(
  `^(${UUID})/(${MEDIA_FOLDERS.join("|")})/(${UUID})\\.(${MEDIA_EXTS.join("|")})$`,
);

/** Which store's shape a key is being read against. `"private"` everywhere it
 *  is not said, so adding this changed no existing call. */
export type KeyShape = "private" | "media";

const SHAPES: Record<KeyShape, RegExp> = { private: OBJECT_KEY, media: MEDIA_KEY };

export interface ParsedObjectKey {
  /** The tenant. The first segment, and the whole of the isolation. */
  businessId: string;
  /**
   * The middle segment. For a private key the booking (a job photo) or the
   * expense (a receipt); for a `media` key the FOLDER NAME, because a logo
   * hangs off no row. Named once rather than twice so the guard below has one
   * expression to compare and not two.
   */
  ownerId: string;
  photoId: string;
  ext: string;
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
export function parseObjectKey(key: unknown, shape: KeyShape = "private"): ParsedObjectKey | null {
  if (typeof key !== "string") return null;
  if (key.length === 0 || key.length > MAX_KEY_LENGTH) return null;
  const re = SHAPES[shape];
  // An unknown shape name must not fall through to the private pattern: that
  // would answer a question nobody asked, and answer it permissively.
  if (!re) return null;
  const m = re.exec(key);
  if (!m) return null;
  return { businessId: m[1], ownerId: m[2], photoId: m[3], ext: m[4] };
}

/**
 * **THE GUARD.** Does this business own this object?
 *
 * Exact equality on the first segment of a fully parsed key — never
 * `startsWith`, never a prefix, never a `split`. A business id that is not
 * itself a canonical uuid is refused too, so a caller that passes `undefined`,
 * an empty string, `"*"` or a list cannot open the door by accident.
 */
export function businessOwnsKey(businessId: unknown, key: unknown, shape: KeyShape = "private"): boolean {
  if (typeof businessId !== "string") return false;
  if (!new RegExp(`^${UUID}$`).test(businessId)) return false;
  const parsed = parseObjectKey(key, shape);
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
export function assertBusinessOwnsKey(businessId: unknown, key: unknown, shape: KeyShape = "private"): ParsedObjectKey {
  if (!businessOwnsKey(businessId, key, shape)) {
    throw new Error("that file does not belong to this business");
  }
  return parseObjectKey(key, shape) as ParsedObjectKey;
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
