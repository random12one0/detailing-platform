// THE RELEASE-ORDER RULES, DRIVEN OVER WORLDS THAT DO NOT EXIST YET — ROADMAP 0.11c.
//
//   node --test tests/photo-release-order.test.mjs
//
// Credential-free, no network, no database, no R2, no browser. It imports
// `judge`, `doorMarkers` and `forgetMarkers` from
// `scripts/photo-release-order.mjs` and never calls `observe()`, so nothing
// here reaches the live project.
//
// ---------------------------------------------------------------------------
// WHY THIS SUITE IS THE LOAD-BEARING HALF
// ---------------------------------------------------------------------------
// **Today's world satisfies nine of the ten rules by not having started.**
// `photo-door` is not deployed, both flags are `false`, the allowance is 1,
// there is no cron entry and the deployed `delete-customer` is the pre-R2 one
// with nothing in R2 to miss, so the live gate's clean run is mostly rules that
// returned early. A gate in that state is indistinguishable from a gate that
// does not work — this repo's single most repeated failure, one level up.
//
// So the rules are a PURE function of an observed world and this drives them
// over the worlds the gate cannot reach:
//   * the correct POST-release world, which must be green — a gate that only
//     knows how to pass "nothing has happened yet" would go red the moment
//     Andrew does every step right, and would be switched off that day;
//   * one world per violation, each asserted to redden **exactly one** rule,
//     so the rules do not bleed into each other and a red names the step that
//     is actually out of order;
//   * worlds where something was NOT OBSERVED, which must be `unjudgeable`
//     and never `pass`. A failed read is not an empty one.
//
// ---------------------------------------------------------------------------
// WHAT IT CANNOT PROVE, SAID PLAINLY
// ---------------------------------------------------------------------------
// That the Management API answers the shapes `observe()` parses out of it (the
// live run on 2026-10-09 is that evidence, and it is in the receipt); that
// Cloudflare's CORS rules are set, which `bucket-cors` reports as UNJUDGEABLE
// on every run and which only 0.11d's browser upload can answer; and anything
// about a browser.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { judge, doorMarkers, forgetMarkers, RULES, R2_SECRETS } from "../scripts/photo-release-order.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOOR_SRC = path.join(REPO, "app/src/lib/photo-door.js");
const FORGET_SRC = path.join(REPO, "supabase/functions/delete-customer/index.ts");

/** The world as it stood when this suite was written — 2026-10-09, measured. */
const PRE = {
  flags: { RECEIPTS_VIA_DOOR: false, MEDIA_VIA_DOOR: false },
  publicFunctions: ["refresh-weather", "photo-reconcile", "send-email"],
  doorDeployed: false, doorVerifyJwt: null,
  reconcileDeployed: false, reconcileVerifyJwt: null,
  allowanceGb: 1,
  cronNames: ["refresh-weather", "watch-jobs"],
  secretNames: [...R2_SECRETS, "RESEND_API_KEY"],
  liveBundleMarkers: [],
  markers: ["photo-door", "a", "b", "c"],
  markerCount: 4,
  // MEASURED, not assumed: `node scripts/photo-release-order.mjs` at commit
  // 63b72ee printed `delete-customer bundle: 5700534 bytes, 0 of 3 R2 markers
  // present`. The deployed forgetting program is the pre-0.11 one, so the
  // moment the door goes live this is the world that reddens.
  forgetMarkers: ["removePhotoFiles", "makeR2", "r2Config"],
  forgetMarkerCount: 3,
  forgetBundleMarkers: [],
};

/** Every step of step 9 and step 10 done, in order. This must be GREEN. */
const POST = {
  ...PRE,
  flags: { RECEIPTS_VIA_DOOR: true, MEDIA_VIA_DOOR: true },
  doorDeployed: true, doorVerifyJwt: true,
  reconcileDeployed: true, reconcileVerifyJwt: false,
  allowanceGb: 10,
  cronNames: ["refresh-weather", "watch-jobs", "photo-reconcile"],
  secretNames: [...R2_SECRETS, "R2_MEDIA_BASE", "RESEND_API_KEY"],
  liveBundleMarkers: ["photo-door", "a", "b", "c"],
  forgetBundleMarkers: ["removePhotoFiles", "makeR2", "r2Config"],
};

const world = (base, over) => structuredClone({ ...base, ...over });
const verdicts = (w) => Object.fromEntries(judge(w).map((r) => [r.rule, r.verdict]));
const failed = (w) => judge(w).filter((r) => r.verdict === "fail").map((r) => r.rule);
const says = (w, rule) => judge(w).find((r) => r.rule === rule).says;

// ── 1 · THE SHAPE OF THE ANSWER ─────────────────────────────────────────────
// Ten rules, declared, in order, every one with a verdict and a sentence.
// A judge that silently dropped a rule would otherwise read as a clean run.
test("1 · judge returns exactly the ten declared rules, in order", () => {
  assert.equal(RULES.length, 10, "ten rules are declared");
  for (const w of [PRE, POST]) {
    const got = judge(w);
    assert.equal(got.length, 10, "judge answers all ten");
    assert.deepEqual(got.map((r) => r.rule), RULES.map(([n]) => n), "same rules, same order");
    for (const r of got) {
      assert.ok(["pass", "fail", "unjudgeable"].includes(r.verdict), `${r.rule} has a real verdict`);
      assert.ok(r.says.length > 20, `${r.rule} says why in words`);
      assert.equal(typeof r.asked, "number", `${r.rule} declares what it asked`);
    }
  }
  // Every criterion of 0.11c is covered by at least one rule.
  assert.deepEqual([...new Set(RULES.map(([, c]) => c))].sort(), [1, 2, 3, 4],
    "all four acceptance criteria have a rule");
});

// ── 2 · THE TWO WORLDS THAT MUST BE GREEN ───────────────────────────────────
// **The post-release one is the point of this suite.** The live gate cannot
// reach it until the day Andrew publishes, so without this the rules that only
// fire then are decoration.
test("2 · the pre-release and correct post-release worlds both pass", () => {
  for (const [name, w] of [["pre-release", PRE], ["post-release", POST]]) {
    assert.deepEqual(failed(w), [], `${name}: nothing is out of order`);
    const v = verdicts(w);
    assert.equal(v["bucket-cors"], "unjudgeable", `${name}: CORS stays unjudgeable, never a pass`);
    const unjudged = Object.entries(v).filter(([, x]) => x === "unjudgeable").map(([k]) => k);
    assert.deepEqual(unjudged, ["bucket-cors"],
      `${name}: bucket-cors is the ONLY structural unjudgeable; anything else means a read failed`);
  }
  // And the two worlds are genuinely different, or the test above is one test.
  assert.notDeepEqual(PRE.flags, POST.flags);
  assert.notEqual(PRE.allowanceGb, POST.allowanceGb);
  assert.notEqual(PRE.doorDeployed, POST.doorDeployed);
});

// ── 3 · ONE WORLD PER VIOLATION, AND EXACTLY ONE RULE REDDENS ───────────────
// The "exactly one" half is what stops a red being unreadable: if three rules
// go red together, the step that is actually out of order is a guess.
//
// `flag-early` is the one deliberate exception and it is asserted as two,
// because it IS two faults: turning the media flag on while `R2_MEDIA_BASE`
// is unset breaks the ordering AND leaves a required secret missing.
const VIOLATIONS = [
  ["a flag on before the door is published", world(PRE, { flags: { RECEIPTS_VIA_DOOR: true, MEDIA_VIA_DOOR: false } }), ["app-flag-before-door"]],
  ["the media flag on with no public address", world(PRE, { flags: { RECEIPTS_VIA_DOOR: false, MEDIA_VIA_DOOR: true } }), ["app-flag-before-door", "r2-secrets-present"]],
  ["the app published before the door", world(PRE, { liveBundleMarkers: ["photo-door"] }), ["app-shipped-before-door"]],
  ["the allowance moved to 10 a step early", world(PRE, { allowanceGb: 10 }), ["allowance-before-switch"]],
  ["the door published, the allowance left at 1", world(POST, { allowanceGb: 1 }), ["allowance-with-switch"]],
  ["photo-door put in the public list", world(PRE, { publicFunctions: [...PRE.publicFunctions, "photo-door"] }), ["door-keeps-jwt"]],
  ["photo-door deployed with the check off", world(POST, { doorVerifyJwt: false }), ["door-keeps-jwt"]],
  ["photo-reconcile missing from the public list", world(PRE, { publicFunctions: ["refresh-weather"] }), ["reconcile-public-for-cron"]],
  ["photo-reconcile deployed with the check on", world(POST, { reconcileVerifyJwt: true }), ["reconcile-public-for-cron"]],
  ["an R2 secret not set on the functions", world(PRE, { secretNames: ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID"] }), ["r2-secrets-present"]],
  ["the cron entry installed before the function", world(PRE, { cronNames: [...PRE.cronNames, "photo-reconcile"] }), ["cron-after-reconcile"]],
  ["the function published with no cron entry", world(POST, { cronNames: ["refresh-weather"] }), ["cron-after-reconcile"]],
  // **THE ONE WHOSE DAMAGE IS PERMANENT.** The door is live, every other step
  // is right, and delete-customer was never republished: forgetting a customer
  // deletes the rows that name their photos and leaves the objects in R2,
  // unreachable by anything afterwards.
  ["the door live and delete-customer left on its old version", world(POST, { forgetBundleMarkers: [] }), ["forget-reaches-r2"]],
  // A PARTIAL BUNDLE IS NOT THE R2 VERSION. One identifier of three present is
  // what an `any`-instead-of-every rule would read as a pass.
  ["the door live and delete-customer carrying one marker of three", world(POST, { forgetBundleMarkers: ["makeR2"] }), ["forget-reaches-r2"]],
];

test("3 · every violation reddens its own rule and no other", () => {
  assert.equal(VIOLATIONS.length, 14, "fourteen violations are declared");
  // Every rule that CAN fail is covered. `bucket-cors` never can, by design.
  const covered = new Set(VIOLATIONS.flatMap(([, , rules]) => rules));
  const failable = RULES.map(([n]) => n).filter((n) => n !== "bucket-cors");
  assert.deepEqual([...covered].sort(), [...failable].sort(),
    "each of the nine failable rules has at least one world that reddens it");

  for (const [name, w, want] of VIOLATIONS) {
    assert.deepEqual(failed(w).sort(), [...want].sort(), `${name}: reddens exactly ${want.join(" + ")}`);
    for (const rule of want) {
      // A red has to be actionable: it names the thing and what happens.
      assert.ok(says(w, rule).length > 60, `${name}: ${rule} explains itself`);
    }
  }
});

// ── 4 · NOT OBSERVED IS NOT OK ──────────────────────────────────────────────
// A failed read answering `pass` is how a gate reports "the order is fine"
// when what it means is "I could not see the order". Every rule that needs a
// reading must answer `unjudgeable` without it.
test("4 · an unobserved world is unjudgeable, never a pass", () => {
  const blind = world(PRE, {
    doorDeployed: null, reconcileDeployed: null, allowanceGb: null,
    cronNames: null, secretNames: null, liveBundleMarkers: null, forgetBundleMarkers: null,
  });
  const v = verdicts(blind);
  for (const rule of ["app-flag-before-door", "app-shipped-before-door", "allowance-before-switch",
    "allowance-with-switch", "r2-secrets-present", "cron-after-reconcile", "forget-reaches-r2",
    "bucket-cors"]) {
    assert.equal(v[rule], "unjudgeable", `${rule} cannot be judged blind`);
  }
  assert.deepEqual(failed(blind), [], "and a blind run invents no failures either");
  // The two file-read rules still work blind, because their evidence is in the
  // repo rather than on the wire — and they must not go quiet with the rest.
  assert.equal(v["door-keeps-jwt"], "pass", "the public list is a file read and is always judgeable");
  assert.equal(v["reconcile-public-for-cron"], "pass", "so is this one");
  // One reading missing must not take the others down with it.
  assert.equal(verdicts(world(PRE, { allowanceGb: null }))["app-flag-before-door"], "pass",
    "an unreadable allowance does not blind the flag rule");
  assert.equal(verdicts(world(PRE, { allowanceGb: null }))["allowance-before-switch"], "unjudgeable",
    "but it does blind its own");
});

// ── 5 · THE MARKERS COME OUT OF THE PRODUCT ─────────────────────────────────
// **This is the fault this check already had.** Its first version hardcoded
// three "…is not set up on the server yet" sentences and two of them were the
// SERVER's, which have never been in the app bundle: the rule that catches job
// photos shipping early would have found 0 of 3 for ever and read as green.
test("5 · doorMarkers parses the real photo-door.js and throws when it cannot", () => {
  const src = readFileSync(DOOR_SRC, "utf8");
  const got = doorMarkers(src);
  assert.equal(got.length, 4, "the slug plus three sentences");
  assert.equal(got[0], "photo-door", "the first marker is the door's own slug");
  for (const m of got) {
    assert.ok(src.includes(m), `"${m.slice(0, 40)}" is really in photo-door.js`);
    assert.ok(m.length > 5, "a marker short enough to collide is not a marker");
  }
  // THE SENTENCES MUST BE THE APP'S OWN, not ones only the server writes. The
  // two that caught this out are named so the mistake cannot be made twice.
  for (const serverOnly of ["Receipt storage is not set up on the server yet.",
    "Public image storage is not set up on the server yet."]) {
    assert.ok(!got.includes(serverOnly),
      `"${serverOnly}" is written by _shared/photoDoor.ts and is never in the app bundle`);
  }
  // Each marker is unique to the door path: a marker that also appears in
  // unrelated app code would report the bundle as door-bearing for ever.
  const others = readFileSync(path.join(REPO, "app/src/lib/photos.js"), "utf8");
  for (const m of got.slice(1)) {
    assert.ok(!others.includes(m), "a door sentence is not duplicated into photos.js");
  }

  // THREE SABOTAGES ON THE REAL SOURCE TEXT, each asserted to have LANDED
  // before the throw is believed — `docs/gotchas.md` 102.
  const sabotage = [
    ['export const DOOR = "photo-door";', 'export const DOOR_SLUG = "photo-door";', /export const DOOR\b/],
    ["export const DOOR_WORDS = {", "export const WORDS = {", /DOOR_WORDS/],
    ['  missing: "Photo storage is not set up on the server yet.",', "", /DOOR_WORDS\.missing|missing:/],
  ];
  for (const [from, to, mentions] of sabotage) {
    assert.ok(src.includes(from), `the sabotage target is present: ${from.slice(0, 40)}`);
    const broken = src.replace(from, to);
    assert.notEqual(broken, src, "the edit landed");
    assert.throws(() => doorMarkers(broken), mentions,
      `removing "${from.slice(0, 40)}" must throw, not return a short list`);
  }
});

// ── 6 · THE FLAGS AND THE PUBLIC LIST THE RULES ACTUALLY READ ───────────────
// The rules are pure, so they believe whatever world they are handed. These
// two assertions hold the real repo against the world this suite assumes, so a
// flag flipped in `photo-door.js` or a slug moved in `deploy-functions.mjs`
// cannot leave the suite passing about a product that has changed underneath
// it. They are the only place this file reads the repo's current state.
test("6 · the repo's own flags and public list still match what PRE assumes", () => {
  const src = readFileSync(DOOR_SRC, "utf8");
  assert.match(src, /export const RECEIPTS_VIA_DOOR = false;/,
    "RECEIPTS_VIA_DOOR is still false — if this fails, the flag was flipped: run "
    + "`node scripts/photo-release-order.mjs` and read app-flag-before-door before changing this line");
  assert.match(src, /export const MEDIA_VIA_DOOR = false;/, "MEDIA_VIA_DOOR is still false");

  const dep = readFileSync(path.join(REPO, "scripts/deploy-functions.mjs"), "utf8");
  const block = /const PUBLIC_FUNCTIONS = new Set\(\[([\s\S]*?)\]\)/.exec(dep);
  assert.ok(block, "PUBLIC_FUNCTIONS is still in the shape the gate parses");
  const pub = [...block[1].matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.ok(pub.includes("photo-reconcile"), "photo-reconcile is in the public list, for the nightly cron call");
  assert.ok(!pub.includes("photo-door"), "photo-door is NOT in the public list; every action needs a signed-in person");
  assert.ok(pub.includes("refresh-weather"), "refresh-weather, the shape photo-reconcile copies, is there too");
  assert.ok(pub.length >= 20, `the public list parsed to ${pub.length} slugs, so the regex still works`);
});

// ── 7 · THE TWO MIGRATIONS THE RULES SEND SOMEBODY TO ───────────────────────
// A red that names a file nobody can find is a red nobody acts on, and both
// filenames are written into the rule sentences by hand.
test("7 · the migrations named in the failure sentences exist and say what the rules claim", () => {
  const w = world(POST, { allowanceGb: 1 });
  const named = says(w, "allowance-with-switch").match(/\d{14}_[a-z_]+\.sql/);
  assert.ok(named, "the allowance failure names a migration file");
  const allowance = readFileSync(path.join(REPO, "supabase/migrations", named[0]), "utf8");
  assert.match(allowance, /set photo_total_gb = 10 where photo_total_gb = 1/,
    "and that file really moves 1 to 10, and only from the default");

  const w2 = world(POST, { cronNames: ["refresh-weather"] });
  const named2 = says(w2, "cron-after-reconcile").match(/\d{14}_[a-z_]+\.sql/);
  assert.ok(named2, "the cron failure names a migration file");
  const cron = readFileSync(path.join(REPO, "supabase/migrations", named2[0]), "utf8");
  assert.match(cron, /cron\.schedule\(\s*'photo-reconcile'/, "and that file schedules the job this rule is about");
  assert.match(cron, /functions\/v1\/photo-reconcile/, "posting to the function the rule requires be deployed first");
});

// ── 8 · THE FORGETTING PROGRAM'S MARKERS COME OUT OF THE PRODUCT TOO ────────
// Same contract as test 5, for the same reason: a marker list written here by
// hand would go on being searched for in the deployed bundle after the product
// stopped containing it, and `forget-reaches-r2` would read as a pass on the
// one drift that loses somebody's photos permanently.
test("8 · forgetMarkers parses the real delete-customer and throws when it cannot", () => {
  const src = readFileSync(FORGET_SRC, "utf8");
  const got = forgetMarkers(src);
  assert.ok(got.length >= 3, `three identifiers at least, got ${got.length}`);
  for (const m of got) {
    assert.ok(src.includes(m), `"${m}" is really imported by delete-customer`);
    assert.ok(m.length > 5, "an identifier short enough to collide is not a marker");
  }
  // They must be the R2-era ones. `removePhotoFiles` is the two-store removal
  // and `makeR2`/`r2Config` are R2 itself; the pre-0.11 version had none.
  for (const need of ["removePhotoFiles", "makeR2", "r2Config"]) {
    assert.ok(got.includes(need), `${need} is one of the markers`);
  }

  // TWO SABOTAGES ON THE REAL SOURCE TEXT, each asserted to have LANDED before
  // the throw is believed — `docs/gotchas.md` 102.
  const sabotage = [
    ['import { makeR2, r2Config } from "../_shared/r2.ts";', "", /_shared\/r2\.ts/],
    ['import { removePhotoFiles } from "../_shared/forgetPhotos.ts";', "", /forgetPhotos\.ts/],
  ];
  for (const [from, to, mentions] of sabotage) {
    assert.ok(src.includes(from), `the sabotage target is present: ${from.slice(0, 50)}`);
    const broken = src.replace(from, to);
    assert.notEqual(broken, src, "the edit landed");
    assert.throws(() => forgetMarkers(broken), mentions,
      `removing "${from.slice(0, 40)}" must throw, not return a short list`);
  }

  // AND THE COUNT GUARD: an import line that parses to one name is a parse
  // that lost two, which is `docs/gotchas.md` 116 in this file.
  const thinned = src.replace('import { makeR2, r2Config } from "../_shared/r2.ts";',
    'import { makeR2 } from "../_shared/r2.ts";')
    .replace('import { removePhotoFiles } from "../_shared/forgetPhotos.ts";',
      'import { x } from "../_shared/forgetPhotos.ts";');
  assert.notEqual(thinned, src, "the edit landed");
  assert.throws(() => forgetMarkers(thinned), /parsed 2 identifiers/,
    "two markers where the product has three must throw, not shorten the list");
});
