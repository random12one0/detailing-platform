// THE PHOTO RELEASE IS AN ORDERED RELEASE, AND UNTIL THIS FILE NOTHING CHECKED
// THE ORDER — ROADMAP 0.11c.
//
//   set -a; . ./.env; set +a
//   node scripts/photo-release-order.mjs
//   node scripts/photo-release-order.mjs --break=allowance-early
//
// It reads. It deploys nothing, applies nothing, flips no flag, and writes
// nothing to the database or to R2.
//
// ---------------------------------------------------------------------------
// WHY IT EXISTS
// ---------------------------------------------------------------------------
// 0.11c's four criteria are an ORDERING, not a feature: the app must not ship
// before `photo-door`, and `photo_total_gb` must move from 1 to 10 in the same
// release as the upload switch and not one step earlier. Every word of that
// enforcement was prose — `FOR-ANDREW.md` step 9's a-to-g order, and two
// comments in `app/src/lib/photo-door.js` saying "flip this once published".
//
// **And `FOR-ANDREW.md` says out loud what prose costs here:** *"If you
// publish and nobody flips them, nothing breaks and nothing says so."* That
// sentence is true in both directions and the other one is worse: a flag
// flipped BEFORE the door is published takes receipts and logos — two features
// that work today — and answers every upload with *"storage is not set up on
// the server yet"*, with nothing red anywhere to say why.
//
// So this asks the nine questions the ordering is made of, against the real
// world rather than against the documents, and exits 1 when the order is
// broken.
//
// ---------------------------------------------------------------------------
// THE TWO HALVES OF CRITERION 3, BECAUSE ONE OF THEM HAS NO FLAG
// ---------------------------------------------------------------------------
// Receipts and business media are behind `RECEIPTS_VIA_DOOR` and
// `MEDIA_VIA_DOOR`, so "did the app ship early" is a question about a source
// file. **Job photos have no flag** — slice 1 re-pointed them at the door
// unconditionally — so for them "the app shipped before the door" is a
// question about the PUBLISHED BUNDLE and no source file can answer it.
// `app-shipped-before-door` therefore fetches the live bundle and looks for
// four markers that are only in it if the door path shipped — the function's
// own slug and three of the app's door sentences, all four read out of
// `photo-door.js` rather than restated here. That is a different question from
// the flag rule above it and both are asked.
//
// ---------------------------------------------------------------------------
// WHAT IT CANNOT SEE, SAID HERE RATHER THAN LEFT TO BE DISCOVERED
// ---------------------------------------------------------------------------
// **The Cloudflare CORS rules (criterion 1) are UNJUDGEABLE from this program
// and are reported by name on every run, never folded into the pass.** Reading
// them needs a Cloudflare credential this program does not have and must not
// acquire; the buckets cannot be probed anonymously either, because
// `job-photos` and `expense-receipts` are private and `business-media` has no
// public address yet (0.11b's blocker). The real proof of CORS is 0.11d's
// first browser upload: a missing rule shows there as a blocked preflight.
//
// **A rule that is UNJUDGEABLE is not a skip.** It was reached, asked and
// recorded as unanswerable with the reason attached — the distinction
// `docs/silences.md` is about. The receipt carries it in `warnings` and in
// `dimensions.unjudgeable`, and `skipped_targets` stays 0 because nothing was
// passed over.
//
// ---------------------------------------------------------------------------
// SECRETS: NAMES ONLY, AND THE VALUE IS DISCARDED AT THE FETCH BOUNDARY
// ---------------------------------------------------------------------------
// Criterion 2 is *"the required R2 function secrets are present without their
// values being printed or logged"*. The Management API's secrets listing
// returns an object per secret; this maps it to `.name` on the line that
// receives it, so no value is ever bound to a variable, compared, printed or
// written to the receipt. The names are the whole answer: presence is the
// question.
//
// ---------------------------------------------------------------------------
// WHY MOST OF THESE RULES ARE VACUOUS TODAY, AND WHAT IS DONE ABOUT IT
// ---------------------------------------------------------------------------
// **`photo-door` is not deployed, both flags are `false` and the allowance is
// 1, so the pre-release world satisfies most of the nine rules by not having
// started.** A gate that passes because nothing has happened yet has proved
// nothing, and this one would read exactly like a gate that works.
//
// Two things answer that, and neither is optional:
//   * `judge()` is a PURE function of an observed world, and
//     `tests/photo-release-order.test.mjs` drives it over synthetic worlds
//     including the POST-release ones, so every rule is seen to bite before
//     Andrew's release rather than after it;
//   * every run of this script re-judges one synthetic broken world as its
//     canary and requires the named rule to fail. The canary is
//     `allowance-with-switch` on purpose: it is the rule that cannot fire
//     until the day of the release, so it is the one most likely to be
//     decoration.
//
// `--break=<id>` corrupts the OBSERVED world before judging and requires that
// rule to turn red. It prints what the rule said BEFORE the edit, so the
// colour is only believed once the edit is seen to have landed
// (`docs/gotchas.md` 102).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeReceipt, REPO } from "./receipt.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ── THE MARKERS ARE READ OUT OF THE APP, NEVER RESTATED HERE ────────────────
// **The first version of this check hardcoded three sentences and two of them
// were the SERVER's** (`_shared/photoDoor.ts` writes "Receipt storage is not
// set up…" and "Public image storage is not set up…"); neither has ever been
// in the app bundle, so the check would have been looking for strings that
// cannot appear there and reporting "none present" for ever — a false
// all-clear on the one rule that catches job photos shipping early. It was
// caught because the guard below threw on the first run.
//
// So the markers are PARSED from `app/src/lib/photo-door.js`: the door's own
// slug and three `DOOR_WORDS` sentences, by KEY. A re-wording moves the
// marker with the product; a key that disappears throws. This is the
// `label-guard.mjs` failure — a check coupled to a spelling rather than to
// the thing — removed by not holding a spelling at all.
const MARKER_KEYS = ["missing", "unreachable", "unreadable"];

/** The strings that are in the published bundle only if the door path shipped. */
export function doorMarkers(src) {
  const slug = /export const DOOR = "([a-z0-9-]+)";/.exec(src);
  if (!slug) throw new Error("`export const DOOR` is not in photo-door.js in the shape this reads");
  const words = /export const DOOR_WORDS = \{([\s\S]*?)\n\};/.exec(src);
  if (!words) throw new Error("`export const DOOR_WORDS` is not in photo-door.js in the shape this reads");
  const out = [slug[1]];
  for (const k of MARKER_KEYS) {
    const m = new RegExp(`^  ${k}: "((?:[^"\\\\]|\\\\.)*)",$`, "m").exec(words[1]);
    if (!m) {
      throw new Error(`DOOR_WORDS.${k} is gone from photo-door.js — this check reads its sentence out of `
        + "the product and cannot go on without it. Re-point MARKER_KEYS at a sentence that exists; do "
        + "NOT let it go on searching the bundle for a string nothing renders");
    }
    out.push(JSON.parse(`"${m[1]}"`));
  }
  return out;
}

export const R2_SECRETS = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"];

/** Every rule, in the order it is judged, with the 0.11c criterion it serves. */
export const RULES = [
  ["app-flag-before-door", 3],
  ["app-shipped-before-door", 3],
  ["allowance-before-switch", 3],
  ["allowance-with-switch", 3],
  ["door-keeps-jwt", 4],
  ["reconcile-public-for-cron", 4],
  ["r2-secrets-present", 2],
  ["cron-after-reconcile", 4],
  ["bucket-cors", 1],
];

// ---------------------------------------------------------------------------
// THE RULES, AS A PURE FUNCTION OF AN OBSERVED WORLD
// ---------------------------------------------------------------------------
// `null` anywhere means NOT OBSERVED, and every rule that needs it answers
// `unjudgeable` with the reason rather than guessing. A failed read is not an
// empty one (`docs/gotchas.md`), and that is the whole difference between this
// reporting "the order is fine" and "I could not see the order".
export function judge(w) {
  const out = [];
  const add = (rule, verdict, asked, says) => out.push({ rule, verdict, asked, says });
  const flagsOn = Object.entries(w.flags).filter(([, v]) => v === true).map(([k]) => k);
  const doorLive = w.doorDeployed;

  // 1 · THE COMMITTED FLAGS AGAINST THE DOOR'S DEPLOY STATE.
  if (doorLive === null) {
    add("app-flag-before-door", "unjudgeable", 0,
      "photo-door's deploy state was not observed, so the flags cannot be judged against it");
  } else if (!doorLive && flagsOn.length) {
    add("app-flag-before-door", "fail", 1,
      flagsOn.join(" and ") + " true while photo-door is NOT deployed — receipts and/or business media "
      + "would answer “storage is not set up on the server yet” on a path that works today");
  } else {
    add("app-flag-before-door", "pass", 1, doorLive
      ? `photo-door is deployed, so the flags are free to be on (${flagsOn.length} of 2 are)`
      : "photo-door is not deployed and no *_VIA_DOOR flag is true");
  }

  // 2 · THE PUBLISHED BUNDLE AGAINST THE DOOR'S DEPLOY STATE. Job photos have
  //     no flag, so this is the only rule that can catch them shipping early.
  if (w.liveBundleMarkers === null) {
    add("app-shipped-before-door", "unjudgeable", 0,
      "the live bundle was not read (no network, or the site did not answer), so what is published is unknown");
  } else if (doorLive === null) {
    add("app-shipped-before-door", "unjudgeable", 0,
      "photo-door's deploy state was not observed, so the published bundle cannot be judged against it");
  } else if (!doorLive && w.liveBundleMarkers.length) {
    add("app-shipped-before-door", "fail", 1,
      `the published bundle already carries ${w.liveBundleMarkers.length} of ${w.markerCount} door `
      + "sentences while photo-door is NOT deployed — job photos have no flag to switch off, so every "
      + "job-photo upload on the live site is failing in words");
  } else {
    add("app-shipped-before-door", "pass", 1, doorLive
      ? "photo-door is deployed, so a published app that uses it is in order"
      : `photo-door is not deployed and the published bundle carries none of the ${w.markerCount} door markers`);
  }

  // 3 · THE ALLOWANCE MUST NOT RUN AHEAD. `docs/the-photo-allowance.md` § 2:
  //     a 10 with nothing behind it is a promise the platform cannot keep.
  if (w.allowanceGb === null) {
    add("allowance-before-switch", "unjudgeable", 0,
      "platform_settings.photo_total_gb was not read, so the allowance cannot be judged");
  } else if (doorLive === null) {
    add("allowance-before-switch", "unjudgeable", 0,
      "photo-door's deploy state was not observed, so the allowance cannot be judged against it");
  } else if (!doorLive && w.allowanceGb >= 10) {
    add("allowance-before-switch", "fail", 1,
      `photo_total_gb is ${w.allowanceGb} while photo-door is NOT deployed — the screen promises storage `
      + "that does not exist, which is the exact fault the 1-to-10 rule was written to remove");
  } else {
    add("allowance-before-switch", "pass", 1,
      `photo_total_gb is ${w.allowanceGb} and photo-door is ${doorLive ? "deployed" : "not deployed"}`);
  }

  // 4 · AND IT MUST NOT LAG. The other half of "the same release": the door
  //     going live IS the upload switch for job photos, which have no flag.
  //     **THIS RULE CANNOT FIRE UNTIL THE DAY OF THE RELEASE**, which is why
  //     it is the canary every run re-judges.
  if (w.allowanceGb === null || doorLive === null) {
    add("allowance-with-switch", "unjudgeable", 0,
      "the allowance or photo-door's deploy state was not observed");
  } else if (doorLive && w.allowanceGb < 10) {
    add("allowance-with-switch", "fail", 1,
      `photo-door is deployed and photo_total_gb is still ${w.allowanceGb} — uploads are on R2 and the `
      + "cap is being enforced at the old number; apply 20261006061000_photo_total_gb_ten.sql");
  } else {
    add("allowance-with-switch", "pass", 1, doorLive
      ? `photo-door is deployed and photo_total_gb is ${w.allowanceGb}`
      : "photo-door is not deployed, so there is no switch for the allowance to accompany yet");
  }

  // 5 · THE DOOR KEEPS ITS SIGN-IN CHECK. Two questions: the list this repo
  //     would deploy it from, and — once it is up — the gateway's own answer.
  const doorPublic = w.publicFunctions.includes("photo-door");
  if (doorPublic) {
    add("door-keeps-jwt", "fail", 1,
      "photo-door is in PUBLIC_FUNCTIONS in scripts/deploy-functions.mjs — it would deploy with the "
      + "sign-in check OFF, and every action on it needs a signed-in person");
  } else if (doorLive === null) {
    add("door-keeps-jwt", "pass", 1,
      "photo-door is absent from PUBLIC_FUNCTIONS; its live setting was not observed");
  } else if (doorLive && w.doorVerifyJwt !== true) {
    add("door-keeps-jwt", "fail", 2,
      `photo-door is deployed with verify_jwt=${w.doorVerifyJwt} — the gateway is letting unsigned callers in`);
  } else {
    add("door-keeps-jwt", "pass", doorLive ? 2 : 1, doorLive
      ? "photo-door is absent from PUBLIC_FUNCTIONS and is deployed with verify_jwt=true"
      : "photo-door is absent from PUBLIC_FUNCTIONS and is not deployed");
  }

  // 6 · THE RECONCILE IS CALLABLE BY CRON. pg_cron posts with no session, so
  //     the sign-in check must be OFF — the same shape as `refresh-weather`.
  const recPublic = w.publicFunctions.includes("photo-reconcile");
  if (!recPublic) {
    add("reconcile-public-for-cron", "fail", 1,
      "photo-reconcile is NOT in PUBLIC_FUNCTIONS — it would deploy with the sign-in check on and the "
      + "nightly call would be refused at the gateway, surfacing a day later as a stopped job");
  } else if (w.reconcileDeployed === null) {
    add("reconcile-public-for-cron", "pass", 1,
      "photo-reconcile is in PUBLIC_FUNCTIONS; its live setting was not observed");
  } else if (w.reconcileDeployed && w.reconcileVerifyJwt !== false) {
    add("reconcile-public-for-cron", "fail", 2,
      `photo-reconcile is deployed with verify_jwt=${w.reconcileVerifyJwt}; refresh-weather, which is `
      + "called the same way, is false — the nightly post will be refused");
  } else {
    add("reconcile-public-for-cron", "pass", w.reconcileDeployed ? 2 : 1, w.reconcileDeployed
      ? "photo-reconcile is in PUBLIC_FUNCTIONS and deployed with verify_jwt=false, like refresh-weather"
      : "photo-reconcile is in PUBLIC_FUNCTIONS and is not deployed yet");
  }

  // 7 · THE R2 SECRETS, BY NAME. `R2_MEDIA_BASE` is only owed once the media
  //     flag is on: it is a public address nobody has bound yet (0.11b).
  if (w.secretNames === null) {
    add("r2-secrets-present", "unjudgeable", 0,
      "the function secrets were not listed, so their presence is unknown");
  } else {
    const want = [...R2_SECRETS, ...(w.flags.MEDIA_VIA_DOOR ? ["R2_MEDIA_BASE"] : [])];
    const missing = want.filter((n) => !w.secretNames.includes(n));
    if (missing.length) {
      add("r2-secrets-present", "fail", want.length,
        `${missing.length} required R2 secret(s) are not set on the functions: ${missing.join(", ")} — `
        + "each photo program answers “storage is not set up on the server yet” and names nothing else");
    } else {
      add("r2-secrets-present", "pass", want.length,
        `all ${want.length} required R2 secret(s) are set on the functions (names read, no value touched)`);
    }
  }

  // 8 · THE CRON ENTRY GOES AFTER THE PUBLISH, BOTH WAYS. An entry with no
  //     function emails Andrew that a job stopped, for a job never started;
  //     a function with no entry simply never runs and nothing says so.
  const cronThere = w.cronNames === null ? null : w.cronNames.includes("photo-reconcile");
  if (cronThere === null || w.reconcileDeployed === null) {
    add("cron-after-reconcile", "unjudgeable", 0,
      "the cron entries or photo-reconcile's deploy state were not observed");
  } else if (cronThere && !w.reconcileDeployed) {
    add("cron-after-reconcile", "fail", 1,
      "the photo-reconcile cron entry is installed and the function is NOT deployed — in about 25 hours "
      + "the dead-man's switch emails the owner that a job stopped, for a job that never started");
  } else if (!cronThere && w.reconcileDeployed) {
    add("cron-after-reconcile", "fail", 1,
      "photo-reconcile is deployed and has no cron entry — the drift report never runs and nothing "
      + "reports that it never ran; apply 20261006060000_photo_reconcile_cron.sql");
  } else {
    add("cron-after-reconcile", "pass", 1, cronThere
      ? "photo-reconcile is deployed and its cron entry is installed"
      : "neither photo-reconcile nor its cron entry is installed, which is the right pre-release pair");
  }

  // 9 · CORS. STRUCTURALLY UNJUDGEABLE HERE — see this file's header.
  add("bucket-cors", "unjudgeable", 0,
    "the CORS rules on job-photos, expense-receipts and business-media need a Cloudflare credential this "
    + "program does not have and must not acquire; the buckets are unreachable anonymously (two are "
    + "private, the third has no public address yet). 0.11d's first browser upload is the proof");

  return out;
}

// ---------------------------------------------------------------------------
// OBSERVATION
// ---------------------------------------------------------------------------
try {
  const env = readFileSync(path.join(REPO, ".env"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* already exported is fine */ }

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;

const api = async (p) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}${p}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!r.ok) throw new Error(`${p} failed: ${r.status}`);
  return r.json();
};

const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const j = await r.json().catch(() => null);
  // A FAILED READ IS NOT AN EMPTY ONE.
  if (!r.ok) throw new Error(`query failed: ${r.status} ${JSON.stringify(j).slice(0, 160)}`);
  return Array.isArray(j) ? j : [];
};

export async function observe() {
  const flagSrc = readFileSync(path.join(REPO, "app/src/lib/photo-door.js"), "utf8");
  const flag = (name) => {
    const m = new RegExp(`export const ${name} = (true|false);`).exec(flagSrc);
    if (!m) throw new Error(`${name} is not declared in photo-door.js in the shape this reads`);
    return m[1] === "true";
  };
  // `doorMarkers` throws if the shapes it reads are gone, so a re-wording
  // reddens here rather than silently emptying the bundle comparison.
  const markers = doorMarkers(flagSrc);
  const deploySrc = readFileSync(path.join(HERE, "deploy-functions.mjs"), "utf8");
  const pubBlock = /const PUBLIC_FUNCTIONS = new Set\(\[([\s\S]*?)\]\)/.exec(deploySrc);
  if (!pubBlock) throw new Error("PUBLIC_FUNCTIONS is not in deploy-functions.mjs in the shape this reads");
  const publicFunctions = [...pubBlock[1].matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);

  const w = {
    flags: { RECEIPTS_VIA_DOOR: flag("RECEIPTS_VIA_DOOR"), MEDIA_VIA_DOOR: flag("MEDIA_VIA_DOOR") },
    publicFunctions,
    doorDeployed: null, doorVerifyJwt: null,
    reconcileDeployed: null, reconcileVerifyJwt: null,
    allowanceGb: null, cronNames: null, secretNames: null, liveBundleMarkers: null,
    markers, markerCount: markers.length,
  };

  const fns = await api("/functions");
  const find = (slug) => fns.find((f) => f.slug === slug);
  w.doorDeployed = !!find("photo-door");
  w.doorVerifyJwt = w.doorDeployed ? find("photo-door").verify_jwt : null;
  w.reconcileDeployed = !!find("photo-reconcile");
  w.reconcileVerifyJwt = w.reconcileDeployed ? find("photo-reconcile").verify_jwt : null;
  w.deployedCount = fns.length;

  // NAMES ONLY. `.name` is taken on the line that receives the listing, so no
  // secret value is ever bound, compared, printed or written. Criterion 2.
  w.secretNames = (await api("/secrets")).map((s) => s.name);

  const rows = await sql("select photo_total_gb from public.platform_settings");
  w.allowanceGb = rows.length ? Number(rows[0].photo_total_gb) : null;
  w.cronNames = (await sql("select jobname from cron.job")).map((r) => r.jobname);

  try {
    const idx = await (await fetch("https://detailingplatform.com/")).text();
    const asset = /assets\/index-[A-Za-z0-9_-]+\.js/.exec(idx);
    if (!asset) throw new Error("no bundle name in the live index");
    const bundle = await (await fetch(`https://detailingplatform.com/${asset[0]}`)).text();
    // `_redirects` sends every unmatched path to index.html, so a 200 proves
    // nothing — CLAUDE.md § Publishing. A short body is the SPA shell, not a
    // bundle, and must not be read as "no door sentences present".
    if (bundle.length < 100000) throw new Error(`live bundle is only ${bundle.length} bytes`);
    w.liveBundle = asset[0];
    w.liveBundleBytes = bundle.length;
    w.liveBundleMarkers = markers.filter((m) => bundle.includes(m));
  } catch (e) {
    // NOT "nothing is published". Unreadable, and said so.
    w.liveBundleError = String(e.message || e);
  }
  return w;
}

// ---------------------------------------------------------------------------
// THE SABOTAGE SWITCHES — each names the rule it must redden.
// ---------------------------------------------------------------------------
export const BREAKS = {
  "flag-early": [(w) => { w.flags.MEDIA_VIA_DOOR = true; }, "app-flag-before-door"],
  "shipped-early": [(w) => { w.liveBundleMarkers = [w.markers[0]]; }, "app-shipped-before-door"],
  "allowance-early": [(w) => { w.allowanceGb = 10; }, "allowance-before-switch"],
  "switch-no-allowance": [(w) => { w.doorDeployed = true; w.doorVerifyJwt = true; }, "allowance-with-switch"],
  "door-public": [(w) => { w.publicFunctions = [...w.publicFunctions, "photo-door"]; }, "door-keeps-jwt"],
  "reconcile-private": [(w) => {
    w.publicFunctions = w.publicFunctions.filter((f) => f !== "photo-reconcile");
  }, "reconcile-public-for-cron"],
  "secret-missing": [(w) => {
    w.secretNames = w.secretNames.filter((n) => n !== "R2_SECRET_ACCESS_KEY");
  }, "r2-secrets-present"],
  "cron-early": [(w) => { w.cronNames = [...w.cronNames, "photo-reconcile"]; }, "cron-after-reconcile"],
};

const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  if (!TOKEN || !REF) {
    console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF.");
    console.error("NOTHING WAS MEASURED and no receipt was written. Run: set -a; . ./.env; set +a");
    process.exit(1);
  }
  const started = new Date().toISOString();
  const brk = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
  if (brk && !BREAKS[brk]) {
    console.error(`unknown --break=${brk}; the switches are: ${Object.keys(BREAKS).join(", ")}`);
    process.exit(1);
  }

  const w = await observe();
  console.log(`project ${REF} · ${w.deployedCount} functions deployed · `
    + `photo-door ${w.doorDeployed ? "DEPLOYED" : "not deployed"} · `
    + `photo-reconcile ${w.reconcileDeployed ? "DEPLOYED" : "not deployed"} · `
    + `photo_total_gb ${w.allowanceGb} · flags `
    + Object.entries(w.flags).map(([k, v]) => `${k}=${v}`).join(" "));
  console.log(w.liveBundleMarkers === null
    ? `live bundle: UNREADABLE — ${w.liveBundleError}\n`
    : `live bundle: ${w.liveBundle}, ${w.liveBundleBytes} bytes, `
      + `${w.liveBundleMarkers.length} of ${w.markerCount} door markers present\n`);

  if (brk) {
    const before = judge(w).find((r) => r.rule === BREAKS[brk][1]).verdict;
    BREAKS[brk][0](w);
    console.log(`--break=${brk}: the observed world was corrupted in memory; `
      + `"${BREAKS[brk][1]}" was ${before} before the edit\n`);
  }

  const results = judge(w);
  if (results.length !== RULES.length) {
    console.error(`judge() returned ${results.length} rules against ${RULES.length} declared`);
    process.exit(1);
  }
  const crit = Object.fromEntries(RULES);
  for (const r of results) {
    const mark = r.verdict === "pass" ? "ok  " : r.verdict === "fail" ? "FAIL" : "????";
    console.log(`${mark}  ${r.rule}  (criterion ${crit[r.rule]})\n      ${r.says}`);
  }

  // THE CANARY. `allowance-with-switch` is the rule that cannot fire until the
  // day of the release, so a run that never exercises it cannot say whether it
  // works. Re-judged on every run against a synthetic world.
  const canaryWorld = { ...structuredClone(w), doorDeployed: true, doorVerifyJwt: true, allowanceGb: 1 };
  const canaryRule = judge(canaryWorld).find((r) => r.rule === "allowance-with-switch");
  const canaryCaught = canaryRule.verdict === "fail";

  const failures = results.filter((r) => r.verdict === "fail");
  const unjudgeable = results.filter((r) => r.verdict === "unjudgeable");
  const assertions = results.reduce((n, r) => n + r.asked, 0) + 1; // +1 for the canary

  console.log(`\ncanary "allowance-with-switch-vacuous": a world with photo-door deployed and the `
    + `allowance still 1 was ${canaryCaught ? "CAUGHT" : "NOT caught"}`);
  console.log(`\n${results.length} rules · ${failures.length} failed · ${unjudgeable.length} UNJUDGEABLE `
    + `(${unjudgeable.map((r) => r.rule).join(", ")}) · ${assertions} assertions`);

  const report = path.join(REPO, "receipts", "photo-release-order.txt");
  mkdirSync(path.dirname(report), { recursive: true });
  writeFileSync(report, [
    `photo release order · ${started} · project ${REF}`,
    `photo-door deployed: ${w.doorDeployed} · photo-reconcile deployed: ${w.reconcileDeployed}`,
    `photo_total_gb: ${w.allowanceGb} · flags: ${JSON.stringify(w.flags)}`,
    `live bundle: ${w.liveBundle ?? "UNREADABLE: " + w.liveBundleError}`,
    `R2 secrets present (names only): ${R2_SECRETS.filter((n) => w.secretNames?.includes(n)).join(", ")}`,
    `R2_MEDIA_BASE set: ${w.secretNames?.includes("R2_MEDIA_BASE")}`,
    `broken on purpose: ${brk || "no"}`,
    "",
    ...results.map((r) => `${r.verdict.toUpperCase()}  ${r.rule} (criterion ${crit[r.rule]})\n    ${r.says}`),
    "",
    `canary caught: ${canaryCaught}`,
  ].join("\n") + "\n");

  const { path: rp, receipt } = writeReceipt({
    check_id: "photo-release-order",
    started_at: started,
    status: failures.length === 0 && canaryCaught ? "pass" : "fail",
    expected_targets: RULES.length,
    discovered_targets: results.length,
    attempted_targets: results.length,
    completed_targets: results.length,
    skipped_targets: 0,
    assertions_executed: assertions,
    // A GENUINE FLOOR, NOT THE COUNT ITSELF. A clean credentialed run asks
    // more than this; it is set below so that losing a rule's questions — the
    // way a relaxed assertion loses them — shows up as a red rather than as a
    // smaller number nobody reads.
    min_assertions: 9,
    failures: failures.map((r) => `${r.rule}: ${r.says}`),
    warnings: unjudgeable.map((r) => `UNJUDGEABLE ${r.rule}: ${r.says}`),
    artifacts: ["receipts/photo-release-order.txt"],
    dimensions: {
      rules: results.length,
      unjudgeable: unjudgeable.length,
      door_deployed: w.doorDeployed,
      reconcile_deployed: w.reconcileDeployed,
      photo_total_gb: w.allowanceGb,
      flags_on: Object.values(w.flags).filter(Boolean).length,
      r2_secrets_present: R2_SECRETS.filter((n) => w.secretNames?.includes(n)).length,
      live_bundle_door_sentences: w.liveBundleMarkers?.length ?? null,
      broken_on_purpose: brk || null,
    },
    canary: { id: "allowance-with-switch-vacuous", observed_failure: canaryCaught },
  });
  console.log(`receipt: ${path.relative(REPO, rp)} (${receipt.status})`);
  process.exit(failures.length === 0 && canaryCaught ? 0 : 1);
}
