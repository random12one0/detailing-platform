// ONE DETAILER MUST NOT BE ABLE TO READ ANOTHER'S PHOTOGRAPH. ROADMAP 0.11.
//
// Run: node tests/photo-key-isolation.test.mjs   (credential-free, no dev server)
//
// ---------------------------------------------------------------------------
// WHY THIS CHECK EXISTS BEFORE THE FEATURE DOES
// ---------------------------------------------------------------------------
// Today a detailer is kept out of another's photos by POSTGRES:
// `(storage.foldername(name))[1] in (select public.current_business_ids()::text)`
// on `storage.objects`. The move to Cloudflare R2 deletes that guard, because
// **R2 has no idea what a business is** — a bucket is a flat namespace and
// whoever holds a credential can address any key in it.
//
// `docs/the-photo-allowance.md` § 4.2: *"without it, one detailer can reach
// another's photographs."* So the guard is rebuilt in our own code —
// `supabase/functions/_shared/photoKey.ts` — and it has to be right **before one
// real photo is written**, which is why this file exists while `job_photos`
// still holds zero rows.
//
// **NOTHING HERE TOUCHES R2, UPLOADS, THE ALLOWANCE NUMBER, OR A PHOTO.** It is
// a pure-function check on the authorisation decision, run with no credentials.
//
// ---------------------------------------------------------------------------
// THE TWO THINGS IT ASSERTS THAT A SIMPLER CHECK WOULD NOT
// ---------------------------------------------------------------------------
// **1 · THE GUARD AND THE MINTER ARE CALLED, NOT DESCRIBED.** § 1 imports
// `storagePath()` from `app/src/lib/photo-rules.js` — the function the product
// actually mints keys with — and feeds its output to the guard. So "the guard
// accepts what we store" is proved by running both rather than by this file
// holding a second copy of the path rule. Two copies of a path rule that can
// disagree is this repo's most repeated failure, and the minter's own header
// warns about exactly that for its half.
//
// **2 · IT NAMES THE NAIVE IMPLEMENTATIONS AND PROVES THEY ARE FOOLED.** § 4
// runs `split("/")[0] === id` and `startsWith(id + "/")` against a traversal
// key and asserts **both say yes** while the real guard says no. That is not
// decoration: it is the only thing that goes red if somebody later "simplifies"
// the guard back into one of them, and it records why the implementation looks
// the way it does.
//
// **THE STANDING QUESTION, ANSWERED IN THE FILE:** § 5 hands the guard the
// wrong tenant, every way a key can carry one, and fails if a single one is
// allowed. A guard that cannot refuse is the whole defect this replaces.

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { storagePath, extForType, mediaPath, MEDIA_FOLDERS, MEDIA_EXT_FOR_TYPE } from "../app/src/lib/photo-rules.js";
import {
  parseObjectKey,
  businessOwnsKey,
  assertBusinessOwnsKey,
  businessPrefix,
  TENANT_PRIVATE_BUCKETS,
  TENANT_PUBLIC_BUCKET,
  MEDIA_EXTS,
  MEDIA_FOLDERS as SERVER_MEDIA_FOLDERS,
} from "../supabase/functions/_shared/photoKey.ts";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

// Two tenants, and a third id that belongs to neither, all canonical lowercase
// uuids exactly as `uuid::text` renders them.
const A = "9c1f2b64-0000-4000-8000-00000000000a";
const B = "9c1f2b64-0000-4000-8000-00000000000b";
const BOOKING = "7f3ab210-55c1-4e0a-9d2e-31b6c4a90e77";
const PHOTO = "1b1a4433-ee1a-4fa6-bf31-cfb9d309ca9b";

// ═══════════════════════════════════════════════════════════════════════════
// 1 · THE GUARD ACCEPTS WHAT THE PRODUCT ACTUALLY MINTS — both called
// ═══════════════════════════════════════════════════════════════════════════
console.log("1. the guard accepts exactly what storagePath() mints");

let minted = 0;
for (const type of ["image/jpeg", "image/png", "image/webp", undefined]) {
  const key = storagePath({ businessId: A, ownerId: BOOKING, id: PHOTO, type });
  minted++;
  const parsed = parseObjectKey(key);
  check(`1a ${JSON.stringify(String(type))} -> ${key.slice(-12)} parses`, parsed !== null, key);
  check(`1b ...and its tenant is read as A`, parsed?.businessId === A, String(parsed?.businessId));
  check(`1c ...and the owner is the booking, not the photo`, parsed?.ownerId === BOOKING);
  check(`1d ...and the extension agrees with extForType`, parsed?.ext === extForType(type));
  check(`1e ...and A is allowed it`, businessOwnsKey(A, key) === true);
}
check("1z the minter was actually called, four ways", minted === 4, `${minted} keys minted`);

// ═══════════════════════════════════════════════════════════════════════════
// 2 · THE WRONG TENANT IS REFUSED — the point of the whole file
// ═══════════════════════════════════════════════════════════════════════════
console.log("\n2. B is refused A's object, however the key is dressed up");

const aKey = storagePath({ businessId: A, ownerId: BOOKING, id: PHOTO, type: "image/jpeg" });

const WRONG_TENANT = [
  ["A's own key, handed to B", aKey],
  ["traversal out of B's prefix", `${B}/../${A}/${BOOKING}/${PHOTO}.jpg`],
  ["traversal with a dot segment", `${B}/./../${A}/${BOOKING}/${PHOTO}.jpg`],
  ["double slash then traversal", `${B}//../${A}/${BOOKING}/${PHOTO}.jpg`],
  ["percent-encoded separator", `${B}%2f..%2f${A}%2f${BOOKING}%2f${PHOTO}.jpg`],
  ["backslash separators", `${B}\\..\\${A}\\${BOOKING}\\${PHOTO}.jpg`],
  ["leading slash", `/${A}/${BOOKING}/${PHOTO}.jpg`],
  ["bucket name glued on the front", `job-photos/${A}/${BOOKING}/${PHOTO}.jpg`],
  ["an absolute URL", `https://example.r2.dev/${A}/${BOOKING}/${PHOTO}.jpg`],
  ["a query string smuggling the tenant", `${B}/${BOOKING}/${PHOTO}.jpg?x=${A}`],
  ["null byte truncation", `${B}\u0000/${A}/${BOOKING}/${PHOTO}.jpg`],
  ["uppercase variant of A's id", `${A.toUpperCase()}/${BOOKING}/${PHOTO}.jpg`],
  ["A's id with a trailing space", ` ${A}/${BOOKING}/${PHOTO}.jpg`],
  ["A's prefix with no object", `${A}/`],
  ["A's prefix alone", A],
  ["a listing wildcard", "*"],
  ["the empty string", ""],
];
for (const [name, key] of WRONG_TENANT) {
  check(`2 · B is refused: ${name}`, businessOwnsKey(B, key) === false, JSON.stringify(key));
}
check("2y and A is refused B's object too — the rule is not one-directional",
  businessOwnsKey(A, storagePath({ businessId: B, ownerId: BOOKING, id: PHOTO })) === false);
check(`2z the wrong-tenant battery has subjects`, WRONG_TENANT.length >= 15,
  `${WRONG_TENANT.length} keys — a battery that shrank is a battery that stopped asking`);

// ═══════════════════════════════════════════════════════════════════════════
// 3 · A BAD *CALLER* CANNOT OPEN THE DOOR EITHER
// ═══════════════════════════════════════════════════════════════════════════
// The business id is the other half of the comparison, and it arrives from the
// caller's own session. A guard that trusts whatever it is handed there is a
// guard with an `undefined` bypass.
console.log("\n3. a missing or wildcard business id opens nothing");

for (const [name, id] of [
  ["undefined", undefined], ["null", null], ["empty string", ""],
  ["a wildcard", "*"], ["a prefix of A", A.slice(0, 8)],
  ["an array containing A", [A]], ["an object", { businessId: A }],
  ["A with a trailing slash", `${A}/`], ["A uppercased", A.toUpperCase()],
  ["a SQL-ish fragment", "' or 1=1 --"],
]) {
  check(`3 · ${name} is refused A's object`, businessOwnsKey(id, aKey) === false, String(id));
}
check("3y assertBusinessOwnsKey throws on the wrong tenant", (() => {
  try { assertBusinessOwnsKey(B, aKey); return false; } catch { return true; }
})());
check("3z ...and its message names neither the key nor the other tenant", (() => {
  try { assertBusinessOwnsKey(B, aKey); return false; } catch (e) {
    const m = String(e?.message ?? "");
    return !m.includes(A) && !m.includes(B) && !m.includes(PHOTO) && m.length > 0;
  }
})(), "a refusal that echoes the key tells a prober the object exists and whose it is");

// ═══════════════════════════════════════════════════════════════════════════
// 4 · THE NAIVE GUARDS, RUN, AND FOOLED
// ═══════════════════════════════════════════════════════════════════════════
// This is why the implementation is an anchored allowlist rather than a
// comparison on a split. If somebody replaces it with either of these, § 2's
// traversal rows go red — and these two lines say why before anybody asks.
console.log("\n4. the two obvious implementations are fooled by a key the real guard refuses");

const traversal = `${B}/../${A}/${BOOKING}/${PHOTO}.jpg`;
const naiveSplit = (id, key) => String(key).split("/")[0] === id;
const naiveStarts = (id, key) => String(key).startsWith(`${id}/`);
check("4a split(\"/\")[0] === id says YES to the traversal", naiveSplit(B, traversal) === true,
  "if this goes false the example stopped being an example and § 4 proves nothing");
check("4b startsWith(id + \"/\") says YES to the traversal", naiveStarts(B, traversal) === true);
check("4c the real guard says NO to the same key", businessOwnsKey(B, traversal) === false,
  "THIS is the assertion that fires if the guard is ever simplified back");

// ═══════════════════════════════════════════════════════════════════════════
// 5 · THE RECONCILE PREFIX, AND THE BUCKETS IT APPLIES TO
// ═══════════════════════════════════════════════════════════════════════════
console.log("\n5. the prefix for summing one business's objects");

check("5a a business prefix carries its separator", businessPrefix(A) === `${A}/`);
check("5b a prefix cannot be minted from a non-id", (() => {
  try { businessPrefix("*"); return false; } catch { return true; }
})(), "a prefix that fell back to empty would list the whole bucket");
check("5c A's prefix does not cover B's key",
  !storagePath({ businessId: B, ownerId: BOOKING, id: PHOTO }).startsWith(businessPrefix(A)));
check("5d both private buckets are named, so neither is forgotten at the door",
  TENANT_PRIVATE_BUCKETS.includes("job-photos")
  && TENANT_PRIVATE_BUCKETS.includes("expense-receipts"),
  TENANT_PRIVATE_BUCKETS.join(", "));

// ═══════════════════════════════════════════════════════════════════════════
// 6 · THE CANARY — this check must be able to fail
// ═══════════════════════════════════════════════════════════════════════════
// A guard that returns `true` for everything would pass § 1 and fail § 2; one
// that returns `false` for everything would pass § 2 and fail § 1. Both are
// asserted here against stand-ins, so neither shape can hide behind a green
// run: a check that only ever asks one direction is satisfied by a constant.
console.log("\n6. the canary — a constant guard must fail one direction or the other");

const alwaysYes = () => true, alwaysNo = () => false;
check("6a an always-yes guard would allow B A's object, which § 2 refuses",
  alwaysYes(B, aKey) === true && businessOwnsKey(B, aKey) === false);
check("6b an always-no guard would refuse A its own object, which § 1 requires",
  alwaysNo(A, aKey) === false && businessOwnsKey(A, aKey) === true);
// ═════════════════════════════════════════════════════════════════════════
// 7 · THE SECOND SHAPE — `business-media`. ROADMAP 0.11 slice 4.
// ═════════════════════════════════════════════════════════════════════════
// **THE GUARD WAS WIDENED, SO THIS FILE IS WIDENED WITH IT**, which is the
// instruction `photoKey.ts`'s own header gives, and the reason this section is
// here rather than only in the new suite. The public bucket's middle segment is
// a FOLDER NAME, so every key in it returned `null` from the one shape above —
// correct refusal, and useless as a guard, because the door would then have
// refused the whole store.
//
// **THE TWO QUESTIONS THAT MATTER ARE THE SAME TWO, ASKED AGAIN**, plus one that
// only exists now there are two shapes: THEY MUST NOT BLEED. A job-photo key
// that parsed as a business image would let the public store delete a private
// object, and a business image that parsed as a private key would let the
// private stores sign for a public one. Both directions are asked.
console.log("\n7. the public bucket's shape, and that the two shapes do not bleed");

const mKey = mediaPath({ businessId: A, folder: "gallery", id: PHOTO, type: "image/jpeg" });
check("7a the guard accepts exactly what mediaPath() mints", businessOwnsKey(A, mKey, "media") === true, mKey);
check("7b and refuses it to B", businessOwnsKey(B, mKey, "media") === false);
check("7c every folder and every type round-trips", (() => {
  for (const folder of MEDIA_FOLDERS) {
    for (const type of Object.keys(MEDIA_EXT_FOR_TYPE)) {
      const k = mediaPath({ businessId: A, folder, id: PHOTO, type });
      if (businessOwnsKey(A, k, "media") !== true) return false;
      if (businessOwnsKey(B, k, "media") !== false) return false;
    }
  }
  return true;
})(), `${MEDIA_FOLDERS.length} folders × ${Object.keys(MEDIA_EXT_FOR_TYPE).length} types`);
check("7d the app and the server allow the same folders",
  JSON.stringify(MEDIA_FOLDERS) === JSON.stringify([...SERVER_MEDIA_FOLDERS]),
  `${MEDIA_FOLDERS.join(",")} vs ${[...SERVER_MEDIA_FOLDERS].join(",")}`);
check("7e every extension the app can mint is one the guard can parse",
  Object.values(MEDIA_EXT_FOR_TYPE).every((e) => MEDIA_EXTS.includes(e)),
  `${Object.values(MEDIA_EXT_FOR_TYPE).join(",")} vs ${[...MEDIA_EXTS].join(",")}`);
check("7f the public bucket is named, and is not in the private list",
  TENANT_PUBLIC_BUCKET === "business-media" && !TENANT_PRIVATE_BUCKETS.includes(TENANT_PUBLIC_BUCKET),
  "a public bucket in the private list would be handed signed GET urls for objects anybody can already read");

// THE TWO SHAPES DO NOT BLEED, both directions.
check("7g a job-photo key is not a business image", businessOwnsKey(A, aKey, "media") === false, aKey);
check("7h a business image is not a job-photo key", businessOwnsKey(A, mKey) === false, mKey);
check("7i the default shape is still the private one, so no existing caller moved",
  businessOwnsKey(A, aKey) === true && parseObjectKey(aKey)?.photoId === PHOTO);

// EVERY WRONG-TENANT SHAPE FROM ·2 IS REFUSED UNDER THE NEW SHAPE TOO, plus the
// ones only this shape can have: a folder outside the list, an extension outside
// it, and an unknown shape NAME, which must not fall back to the private pattern.
check(`7j every wrong-tenant key ·2 lists is refused as a business image too`,
  WRONG_TENANT.every(([, key]) => businessOwnsKey(B, key, "media") === false),
  `${WRONG_TENANT.length} keys`);
const MEDIA_WRONG = [
  ["a folder outside the list", `${A}/secrets/${PHOTO}.jpg`, "media"],
  ["an uppercase folder", `${A}/GALLERY/${PHOTO}.jpg`, "media"],
  ["an extension the bucket refuses", `${A}/gallery/${PHOTO}.svg`, "media"],
  ["no extension", `${A}/gallery/${PHOTO}`, "media"],
  ["a traversal in the folder slot", `${A}/../${B}/gallery/${PHOTO}.jpg`, "media"],
  ["a fourth segment", `${A}/gallery/sub/${PHOTO}.jpg`, "media"],
  ["a bare prefix", `${A}/gallery/`, "media"],
  ["its own key under an unknown shape name", mKey, "nonesuch"],
];

// · AND THE WIDENING IS SABOTAGED, because a widened allowlist is exactly the
// kind of change that reads as safe. The folder group is loosened to anything
// without a slash — which is what somebody writing `[^/]+` "so a new folder
// does not need a code change" would produce — and the two refusals that must
// then stop refusing are asserted to stop. `..` is not in the list and IS a
// segment without a slash, so that one edit reopens the traversal this whole
// file exists to close.
const sabSrc = readFileSync("supabase/functions/_shared/photoKey.ts", "utf8")
  .replace(/\r\n/g, "\n")
  .replace("${MEDIA_FOLDERS.join(\"|\")}", "[^/]+");
const sabFile = path.join(mkdtempSync(path.join(tmpdir(), "photokey-sab-")), "loose.ts");
writeFileSync(sabFile, sabSrc);
const loose = await import(pathToFileURL(sabFile).href);
check("7m the control: the real guard refuses a folder outside the list",
  businessOwnsKey(A, `${A}/secrets/${PHOTO}.jpg`, "media") === false);
check("7m a loosened folder group accepts a folder outside the list",
  loose.businessOwnsKey(A, `${A}/secrets/${PHOTO}.jpg`, "media") === true,
  "the sabotage changed nothing, so 7k was never testing the folder list");
// **AND THIS IS WHERE RUNNING THE SABOTAGE TAUGHT SOMETHING THE FIRST DRAFT HAD
// WRONG, SO IT IS WRITTEN DOWN RATHER THAN QUIETLY FIXED.** The probe was
// `${A}/../${B}/gallery/${PHOTO}.jpg`, and it stayed REFUSED with the folder
// group loosened — because that key has five segments and the pattern has
// three, whichever characters the middle one allows. So the folder allowlist is
// not what closes a deep traversal; the SEGMENT COUNT and the anchoring are.
// What the allowlist closes is the one-level escape below, whose real object is
// the bucket root rather than anything inside A.
const escape1 = `${A}/../${PHOTO}.jpg`;
check("7m a loosened folder group reopens a one-level escape",
  loose.businessOwnsKey(A, escape1, "media") === true
  && businessOwnsKey(A, escape1, "media") === false,
  "an object OUTSIDE A's folder read as A's: the fault the allowlist exists to make unrepresentable");
check("7m the deeper traversal is closed by the segment count, not by the folder list",
  loose.businessOwnsKey(A, `${A}/../${B}/gallery/${PHOTO}.jpg`, "media") === false,
  "if this ever passes, the pattern has stopped being three anchored segments");

for (const [name, key, shape] of MEDIA_WRONG) {
  check(`7k A is refused: ${name}`, businessOwnsKey(A, key, shape) === false, JSON.stringify(key));
}


console.log(`\n   ${minted} minted keys · ${WRONG_TENANT.length} wrong-tenant keys · `
  + `10 bad callers · 2 naive guards fooled · `
  + `${MEDIA_FOLDERS.length * Object.keys(MEDIA_EXT_FOR_TYPE).length} media keys round-tripped · `
  + `${MEDIA_WRONG.length} media keys refused`);
console.log(`\n${pass} passed, ${fail} failed`);
// `exitCode` RATHER THAN `process.exit()`, AND THE REASON IS A REAL CRASH.
// § 7m imports a rebuilt copy of `photoKey.ts`, which leaves the type-stripping
// loader's handle open; exiting the process on top of it printed
// `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` from libuv AFTER a
// clean "83 passed, 0 failed" and exit code 0. A green run that ends in a crash
// message is a run the next session will not trust. Setting the code lets node
// finish on its own; the exit status is identical.
process.exitCode = fail ? 1 : 0;
