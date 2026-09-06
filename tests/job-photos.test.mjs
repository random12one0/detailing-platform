// Job photos — the two rules that can be WRONG rather than merely broken.
//
// The owner's condition on this whole feature was **"implement it without
// going over our limit"**, and there are exactly two things standing between
// that promise and a filled 1 GB plan:
//
//   1. THE RESIZE. A phone photo is 3-5 MB and the free plan is 1 GB across
//      every tenant, so unresized uploads exhaust it in about 250 photos. The
//      resize is a 10x multiplier and it is pure arithmetic — which means it
//      can be silently wrong (an enlarged photo, a stretched one, a divide by
//      zero on a broken file) in a way nobody sees until storage is gone.
//   2. THE BUDGET. A number invented from a failed read is worse than no
//      number, because it reassures.
//
// Run: node tests/job-photos.test.mjs   (credential-free)

import { readFileSync } from "node:fs";
import {
  MAX_EDGE, QUALITY, WARN_AT, KINDS,
  fit, budgetState, budgetWords, roomFor, mb,
} from "../app/src/lib/photo-rules.js";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const strip = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

// ─── 1. The resize ────────────────────────────────────────────────────────
console.log("\n1. the resize, which is this feature's economics");
{
  check("1a · a big landscape photo comes down to the cap",
    fit(4032, 3024).width === MAX_EDGE, JSON.stringify(fit(4032, 3024)));
  check("1b · a big portrait photo comes down on its LONG edge",
    fit(3024, 4032).height === MAX_EDGE, JSON.stringify(fit(3024, 4032)));

  // THE ASPECT RATIO IS THE ONE THAT GOES UNNOTICED. A stretched before-photo
  // is worse than no photo, and nothing on the screen would say so.
  const a = fit(4032, 3024);
  check("1c · the shape is kept", Math.abs(a.width / a.height - 4032 / 3024) < 0.005,
    `${a.width}x${a.height}`);
  const b = fit(1000, 3000);
  check("1d · and kept on an extreme one too",
    Math.abs(b.width / b.height - 1000 / 3000) < 0.005, `${b.width}x${b.height}`);

  // NEVER ENLARGE. Upscaling adds bytes and no detail — it would make the
  // feature cost MORE for the detailers who took the smallest photos.
  check("1e · a small photo is left exactly alone",
    fit(800, 600).width === 800 && fit(800, 600).height === 600);
  check("1f · one exactly at the cap is left alone",
    fit(MAX_EDGE, 900).width === MAX_EDGE);

  // A broken or zero-sized image must not divide by zero and must not produce
  // a NaN canvas, which throws where nobody is catching.
  check("1g · a zero-sized image does not produce NaN",
    Number.isFinite(fit(0, 0).width) && Number.isFinite(fit(0, 0).height),
    JSON.stringify(fit(0, 0)));
  check("1h · no dimension is ever rounded to zero",
    fit(4000, 3).height >= 1, JSON.stringify(fit(4000, 3)));

  check("1i · quality is a real JPEG quality", QUALITY > 0 && QUALITY < 1, `${QUALITY}`);
}

// ─── 2. The budget ────────────────────────────────────────────────────────
console.log("\n2. the budget, which must never reassure by accident");
{
  const CAP = 250 * 1024 * 1024;
  const at = (share) => ({ used_bytes: Math.round(CAP * share), cap_bytes: CAP });

  check("2a · an empty allowance is ok", budgetState(at(0)).state === "ok");
  check("2b · half is still ok", budgetState(at(0.5)).state === "ok");
  check("2c · the warning starts exactly at the threshold",
    budgetState(at(WARN_AT)).state === "near", budgetState(at(WARN_AT)).state);
  check("2d · just under the threshold is not a warning",
    budgetState(at(WARN_AT - 0.01)).state === "ok");
  check("2e · full is full at exactly the cap", budgetState(at(1)).state === "full");
  check("2f · and over the cap is still full", budgetState(at(1.5)).state === "full");

  // THE ONE THAT MATTERS. A missing row, a failed read or a dropped function
  // gives cap_bytes 0 — and "0% full" invented out of an error is the class of
  // statement this repo refuses everywhere else. It must be UNKNOWN, and it
  // must not be the same answer as "you have plenty".
  check("2g · no cap is UNKNOWN, not ok", budgetState({}).state === "unknown");
  // **NULL, NOT JUST UNDEFINED, and this one was found by opening the screen
  // rather than by this file.** The component holds the budget as null until
  // the read returns, a default parameter does not fire for null, and
  // destructuring it threw — which React turned into the entire job record
  // vanishing behind the error boundary. Every accessor here takes null.
  check("2g-ii · a NULL budget is unknown and does not throw",
    budgetState(null).state === "unknown");
  check("2g-iii · and its words are silent rather than a crash", budgetWords(null) === null);
  check("2g-iv · and it does not block an upload", roomFor(1024, null));
  check("2h · a zero cap is UNKNOWN too", budgetState({ used_bytes: 5, cap_bytes: 0 }).state === "unknown");
  check("2i · and unknown never draws a reassuring sentence", budgetWords({}) === null);

  // Nothing is said until there is something worth saying (§1a).
  check("2j · a quiet allowance says nothing at all", budgetWords(at(0.2)) === null);
  check("2k · a nearly-full one names the number",
    /8[0-9]%/.test(budgetWords(at(0.85)) ?? ""), budgetWords(at(0.85)));
  check("2l · a full one says what to DO, not just what is wrong",
    /remove/i.test(budgetWords(at(1)) ?? ""), budgetWords(at(1)));

  // roomFor is what actually blocks an upload, so it is checked separately
  // from the words: a screen that warns and then refuses nothing is worse
  // than one that does neither.
  check("2m · there is room below the cap", roomFor(1024, at(0.5)));
  check("2n · there is no room past it", !roomFor(20 * 1024 * 1024, at(0.99)));
  check("2o · an unknown cap does NOT block", roomFor(9e9, {}),
    "refusing on a failed read would stop a detailer mid-job over our bug");
}

// ─── 3. The kinds, and the one that is not decoration ─────────────────────
console.log("\n3. before, after — and damage");
{
  const keys = KINDS.map(([k]) => k);
  check("3a · three kinds in the order a job happens",
    keys.join(",") === "before,after,damage", keys.join(","));
  check("3b · every kind has a word for the screen", KINDS.every(([, w]) => w && w.length));

  // The database check constraint and this list must agree, or an upload the
  // screen offers is refused by the row it writes.
  const sql = read("supabase/migrations/20260906010000_job_photos.sql");
  for (const k of keys) {
    check(`3c · the table allows "${k}"`, new RegExp(`'${k}'`).test(sql));
  }
  const allowed = (sql.match(/kind in \(([^)]+)\)/) ?? [])[1] ?? "";
  check("3d · and allows nothing the screen cannot offer",
    (allowed.match(/'/g) ?? []).length / 2 === keys.length, allowed);
}

// ─── 4. The promises the code has to keep ─────────────────────────────────
// Each of these is a sentence in a comment somewhere that costs real money or
// real privacy if the code stops matching it.
console.log("\n4. the promises");
{
  const photos = strip(read("app/src/lib/photos.js"));
  const sql = strip(read("supabase/migrations/20260906010000_job_photos.sql"));

  // THE BUCKET IS PRIVATE. `business-media` is public-read because a logo is
  // on the booking page; a before-photo is a stranger's car outside their own
  // house. If this ever flips, every photo in the product becomes readable by
  // URL and nothing on any screen would change.
  check("4a · the job-photos bucket is created PRIVATE",
    /'job-photos', 'job-photos', false/.test(sql), "public-read would expose every driveway");
  check("4b · and photos are shown through signed URLs",
    /createSignedUrls/.test(photos));
  check("4c · which expire", /SIGNED_FOR = \d+/.test(photos));

  // ANY MEMBER MAY ADD, ONLY settings MAY REMOVE. Taking the photo is doing
  // the job — the person holding the camera is usually staff with no settings
  // permission — but a photo is evidence and deleting it is not.
  check("4d · any member of the business may add a photo",
    /job photos member insert[\s\S]{0,400}current_business_ids/.test(sql));
  check("4e · but removing one needs the settings permission",
    /job photos settings delete[\s\S]{0,400}business_ids_with_permission\('settings'\)/.test(sql));
  check("4f · and the row follows the same asymmetry",
    /job photos delete[\s\S]{0,300}business_ids_with_permission\('settings'\)/.test(sql));

  // THE FILE GOES UP FIRST AND IS REMOVED IF THE ROW FAILS. The other order
  // leaves a row pointing at nothing, which is a broken image on a job record
  // forever.
  const add = photos.slice(photos.indexOf("export async function addPhoto"),
    photos.indexOf("export async function removePhoto"));

  // **ORDER CHECKS MUST ASSERT PRESENCE FIRST, and 4j is why this helper
  // exists.** `indexOf` returns -1 when a thing is absent, and -1 is less
  // than every real index — so `indexOf(a) < indexOf(b)` passes LOUDEST when
  // `a` has been deleted entirely. Caught 2026-09-06 by baselining: removing
  // the resize left 4j green, which is the exact failure it exists to catch.
  // Same family as the three import-shadowing vacuities found overnight.
  const before = (hay, a, b) => {
    const i = hay.indexOf(a), j = hay.indexOf(b);
    return i >= 0 && j >= 0 && i < j;
  };
  check("4g · the upload happens before the row",
    before(add, ".upload(", '.from("job_photos").insert'),
    "a row pointing at no file is a permanently broken image");
  check("4h · and a failed row takes the file back out",
    /if \(error\) \{\s*await supabase\.storage\.from\("job-photos"\)\.remove/.test(add));

  // PUBLISHING COPIES. Making the private file public instead would be one
  // line shorter and would put every photo of that job one URL guess away.
  const pub = photos.slice(photos.indexOf("export async function publishToGallery"));
  check("4i · publishing to the gallery COPIES into the public bucket",
    /\.from\("business-media"\)\s*\.upload/.test(pub) && /download\(photo\.path\)/.test(pub),
    "flipping the private file public would expose the whole job");

  // THE RESIZE IS NOT OPTIONAL. If addPhoto ever uploads the raw file the
  // whole budget is 10x wrong and nothing says so until storage is full.
  check("4j · nothing is uploaded without being shrunk first",
    before(add, "await shrink(file)", ".upload("),
    "the raw camera file is 10x the size the budget assumes");
  check("4k · and the size written down is the SHRUNK size",
    /bytes: blob\.size/.test(add), "recording the original size makes the budget a fiction");
}

// ─── 5. The allowance is a SHARE of a known total ─────────────────────────
// The owner, 2026-09-06: *"we should just make it decided by 100 and that's
// how much each person had."*
//
// **A FLAT PER-TENANT CAP NEVER ADDS UP TO ANYTHING**, which is why this
// replaced one. Four detailers at the old 250 MB already exceeded the whole
// free plan, so the number on the screen promised storage that did not exist
// — and the failure would have landed on whichever detailer uploaded last,
// mid-job, with a message about THEIR allowance that was nothing to do with
// them. A share of a known total cannot lie that way.
console.log("\n5. the allowance is a share of the whole store");
{
  const share = read("supabase/migrations/20260906011000_photo_share.sql");
  // **SQL COMMENTS STRIPPED, and this check failed on its own prose first.**
  // The header of that migration quotes the very string it forbids — it has
  // to, because the comment exists to explain the bug. The strip() helper
  // at the top of this file only knows JS comments; SQL says --. Eighth
  // instance of a check reading the paragraph that explains it.
  const col = read("supabase/migrations/20260906011100_photo_total_column.sql")
    .replace(/^\s*--.*$/gm, "");

  check("5a · the divisor is a hundred, and it is his number",
    /photo_tenant_share\(\)[\s\S]{0,120}select 100/.test(share), "the owner said 100");
  check("5b · a detailer's cap is DERIVED from the total, never stored beside it",
    /photo_total_bytes\(\) \/ public\.photo_tenant_share\(\)/.test(share),
    "two numbers that must agree are one number or they will disagree");

  // **THE TOTAL LIVES IN A COLUMN AND MUST NEVER GO BACK INTO `prices`.**
  // `platform-admin`'s price action does `update ... set prices = pricesFrom(body)`,
  // which REBUILDS the object from the fields it knows — so any unrelated key
  // inside it is deleted the first time the owner edits a price, every
  // allowance silently resets to the default, and no screen says a word.
  // Found by reading the write path before shipping; proved by wiping
  // `prices` to null and watching the store state not move.
  check("5c · the total is a COLUMN, not a key inside prices",
    /add column if not exists photo_total_gb/.test(col));
  check("5d · and nothing reads it out of the prices jsonb any more",
    !/prices\s*->\s*'photoTotalGb'/.test(col) && /select s\.photo_total_gb/.test(col),
    "pricesFrom() rebuilds that object and would delete it on the next price edit");

  // The default is what is TRUE today, not what we hope. Supabase's free plan
  // is 1 GB; R2's is 10. Defaulting to 10 before R2 exists would be the same
  // over-promise this whole change removed.
  check("5e · the default total is the storage that actually exists today",
    /photo_total_gb numeric not null default 1\b/.test(col),
    "a default of 10 would promise storage nobody has connected yet");

  // WHAT IS PROMISED, NOT WHAT IS USED. Storage can be 4% used and 140%
  // promised at the same time, and only the second predicts the morning
  // somebody cannot upload.
  check("5f · the back office can see what has been COMMITTED, not just used",
    /committed_bytes/.test(share) && /businesses\)\s*\*/.test(share));
  check("5g · and the store-wide view is not reachable from a browser",
    /revoke all on function public\.photo_store_state\(\) from public, anon, authenticated/.test(share));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
