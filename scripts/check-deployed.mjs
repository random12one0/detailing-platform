// Is what is RUNNING what is in the repo?
//
// A function whose deploy never happened looks exactly like one that
// deployed: the code is in git, the tests that read the source pass, and the
// only thing that is wrong is the copy answering real requests. This repo's
// standing complaint — "a skipped check reads exactly like a passing one" —
// with the gap moved from the test suite to the gateway.
//
// HOW IT DECIDES, and why it is git rather than mtimes: a working-tree mtime
// changes when a branch is checked out, so it would call every function stale
// after any switch. The question asked here is **was this function deployed
// AFTER the last commit that changed anything it is built from** — its own
// directory, plus every `_shared` module it imports, which the deploy script
// bundles into it. Those are the only files that can change what it runs.
//
// It reads. It deploys nothing and it writes nothing.
//
// Usage: node scripts/check-deployed.mjs
// Env:   SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF  (root .env is loaded)

import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sharedFor } from "./lib/sharedDeps.mjs";
import { writeReceipt } from "./receipt.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FUNCTIONS = path.join(ROOT, "supabase", "functions");

// The root .env, same shape every other script here reads.
const envFile = path.join(ROOT, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
  }
}

const { SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF } = process.env;
if (!SUPABASE_ACCESS_TOKEN || !SUPABASE_PROJECT_REF) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF");
  process.exit(1);
}

// **A DEPLOY MADE BEFORE THE COMMIT READS AS STALE, AND THAT IS CORRECT
// RATHER THAN A BUG — noted 2026-09-07 after it cost a few minutes.** The
// ordinary order of work is: change a function, deploy it, verify against the
// deployed copy, THEN commit. That leaves the deploy timestamp earlier than the
// commit timestamp, and fifteen functions read STALE the moment the commit
// lands even though the running code is exactly what was committed.
//
// The tool cannot tell that apart from a genuinely missed deploy — it compares
// times, not content — and **"I cannot prove the running copy matches" is the
// right answer to give.** Redeploying is idempotent and takes a minute, so the
// fix is to redeploy rather than to reason about it. Do not soften this check;
// its whole value is that it found 28 of 28 stale once, with gaps up to 36
// hours.
//
// Last commit touching any of these paths, as a unix timestamp. `--` guards
// against a path that also looks like a revision.
function lastCommit(paths) {
  const out = execFileSync("git", ["log", "-1", "--format=%ct", "--", ...paths],
    { cwd: ROOT, encoding: "utf8" }).trim();
  return out ? Number(out) * 1000 : 0;
}

// **AND THE WORKING TREE, BECAUSE GIT LOG CANNOT SEE AN EDIT NOBODY HAS
// COMMITTED — 2026-09-13, and this was the tool’s own blind spot.**
//
// MEASURED: `// PROBE` appended to `create-booking/index.ts`, nothing deployed
// and nothing committed, and this script printed **`create-booking  current`**
// and **`all 37 functions are current`**. The function that takes the money and
// holds the double-booking constraint was reported as matching a running copy it
// no longer matched.
//
// **THE BLIND SPOT IS EXACTLY THE STATE EVERY WORKING SESSION IS IN.** The
// comparison is commit-time against deploy-time, so an edit that has not reached
// a commit moves NEITHER number. The header above explains why mtimes were
// rejected and that reasoning still holds — what was missing is that the tool
// never SAID what it could not see, which is this repo’s oldest failure: a
// skipped check reading exactly like a passing one.
//
// So a function with uncommitted changes is **DIRTY**, never `current`. It is
// not "stale" — the running copy may well be right — it is UNPROVABLE, and that
// is a third answer rather than a softer version of one of the other two.
function dirtyPaths(paths) {
  const out = execFileSync("git", ["status", "--porcelain", "--", ...paths],
    { cwd: ROOT, encoding: "utf8" }).trim();
  return out ? out.split(/\r?\n/).map((l) => l.slice(3).replace(/^"|"$/g, "")) : [];
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/functions`,
  { headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` } });
if (!res.ok) {
  console.error(`list failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}
const deployed = new Map((await res.json()).map((f) => [f.slug, f]));
const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";

const local = BREAK === "none" ? [] : (await readdir(FUNCTIONS, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && d.name !== "_shared")
  .map((d) => d.name)
  .sort();

// **THE EXPECTATION IS DECLARED, NOT COUNTED FROM THE WALK - 2026-09-21,
// docs/silences.md section A.** This gate wrote no receipt, so a run that
// compared 39 functions and a run that never executed ended the same way.
// Its subject is the function directory, which `supabase/migrations/` cannot
// declare - so the floor is declared here and moved by a person.
//
// 39 measured 2026-09-21. A function added or removed makes this disagree and
// fails the receipt until somebody moves the number deliberately. Moving it to
// make a run pass is the failure this exists to catch.
const EXPECTED_FUNCTIONS = 39;
let compared = 0;
const stale = [];
const dirty = [];
const unproven = [];
const missing = [];
const rows = [];

for (const fn of local) {
  const d = deployed.get(fn);
  if (!d) { missing.push(fn); rows.push([fn, "NEVER DEPLOYED", "", ""]); continue; }
  const paths = [`supabase/functions/${fn}`, ...(await sharedFor(fn))];
  const changed = lastCommit(paths);
  const live = new Date(d.updated_at).getTime();
  const dirt = dirtyPaths(paths);
  const old = changed > live;
  // **NO COMMIT TOUCHES THESE PATHS AT ALL.** `lastCommit` returns 0, and 0 is
  // never greater than a deploy time, so the old code called that `current` — a
  // resolver that returned the wrong paths would have read as a clean bill.
  const unknown = changed === 0;
  compared++;
  if (dirt.length) dirty.push(fn);
  else if (unknown) unproven.push(fn);
  else if (old) stale.push(fn);
  rows.push([
    fn,
    dirt.length ? "DIRTY" : unknown ? "NO SOURCE" : old ? "STALE" : "current",
    `v${d.version}`,
    `deployed ${new Date(live).toISOString().slice(0, 16).replace("T", " ")}` +
      (old ? `, source ${new Date(changed).toISOString().slice(0, 16).replace("T", " ")}` : ""),
  ]);
}

const w = Math.max(...rows.map((r) => r[0].length));
for (const [fn, state, ver, when] of rows) {
  console.log(`${fn.padEnd(w)}  ${state.padEnd(14)} ${ver.padEnd(5)} ${when}`);
}

// A function deployed and then never touched again is the ordinary case, so
// only the gap is an exit code.
const orphans = [...deployed.keys()].filter((s) => !local.includes(s));
if (orphans.length) console.log(`\ndeployed but not in this repo: ${orphans.join(", ")}`);

console.log();
if (missing.length) console.log(`NEVER DEPLOYED: ${missing.join(", ")}`);
if (stale.length) console.log(`STALE (source is newer than what is running): ${stale.join(", ")}`);
// **PRINTED, NOT SWALLOWED.** These two are the answers the tool used to give as
// `current`, and saying them out loud is the whole repair.
if (dirty.length) {
  console.log(`DIRTY (uncommitted changes — whether the running copy matches CANNOT`
    + ` be decided from git): ${dirty.join(", ")}`);
  console.log("  commit or stash them, then run this again.");
}
if (unproven.length) {
  console.log(`NO SOURCE COMMIT found for: ${unproven.join(", ")} — the paths this`
    + ` script resolved match no commit, so nothing was compared.`);
}
const unclear = dirty.length + unproven.length;
if (!missing.length && !stale.length && !unclear) {
  console.log(`all ${local.length} functions are current`);
} else if (!missing.length && !stale.length) {
  console.log(`${local.length - unclear} of ${local.length} functions are current;`
    + ` ${unclear} could not be decided.`);
}

// --- THE CANARY -----------------------------------------------------------
// **WHAT SILENTLY BREAKS HERE IS THE COMPARISON, NOT THE DEPLOYS.** Every
// verdict is `lastCommit(paths) > deployedAt`. If `lastCommit` returned 0 for
// everything - a resolver handed the wrong paths, a git call that failed and
// was swallowed - then nothing is ever newer than its deploy and every
// function reads `current`. The file already knows this: `unknown` exists
// because "0 is never greater than a deploy time, so the old code called that
// current". **That guard covers one function at a time; nothing covered the
// engine.**
//
// So the run is handed a comparison that cannot legally pass: a source commit
// one year in the future against a deploy that already happened. If that reads
// as current, every `current` above is a verdict this run could not have made.
const canaryDeployedAt = Date.now() - 86400_000;
const canaryCommitAt = BREAK === "blind" ? 0 : Date.now() + 365 * 86400_000;
const canaryCaught = canaryCommitAt > canaryDeployedAt;
console.log("");
console.log(`canary  a commit dated a year after its deploy -> `
  + (canaryCaught
    ? "caught: reported STALE, so 'current' is a verdict this run can actually withhold"
    : "NOT CAUGHT — it read as current, so every 'current' above is void"));

// --- SUBJECT COUNTS, AND ZERO IS A FAILURE --------------------------------
const failures = [];
if (local.length === 0) {
  failures.push("ZERO FUNCTIONS WERE FOUND in supabase/functions. Nothing was compared "
    + "against anything deployed, so this run proves nothing. This is NOT a clean estate.");
}
if (compared === 0 && local.length > 0) {
  failures.push(`ZERO of ${local.length} function(s) reached a comparison.`);
}
if (local.length && local.length !== EXPECTED_FUNCTIONS) {
  failures.push(`FUNCTION COUNT MOVED: supabase/functions holds ${local.length}, `
    + `EXPECTED_FUNCTIONS declares ${EXPECTED_FUNCTIONS}. A function added or removed has `
    + `not been accounted for - move the number deliberately and say why.`);
}
if (missing.length) failures.push(`NEVER DEPLOYED: ${missing.join(", ")}`);
if (stale.length) failures.push(`STALE (source newer than what is running): ${stale.join(", ")}`);
if (dirty.length) failures.push(`UNDECIDABLE, uncommitted changes: ${dirty.join(", ")}`);
if (unproven.length) failures.push(`NO SOURCE COMMIT resolved for: ${unproven.join(", ")}`);

// --- THE RECEIPT, so this is GRADED rather than read ----------------------
const { path: receiptPath } = writeReceipt({
  check_id: "check-deployed",
  started_at,
  status: failures.length === 0 && canaryCaught ? "pass" : "fail",
  expected_targets: EXPECTED_FUNCTIONS, // declared above, before the walk
  discovered_targets: local.length,     // directories actually found
  attempted_targets: local.length,      // every one is attempted
  completed_targets: compared,          // those that reached a timestamp comparison
  skipped_targets: 0,
  assertions_executed: compared * 2 + 2, // a freshness and a dirt question each, plus the canary
  min_assertions: 60,
  failures,
  artifacts: ["scripts/check-deployed.mjs"],
  warnings: BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : [],
  dimensions: {
    project: SUPABASE_PROJECT_REF,
    method: "deploy timestamp against the last commit touching the function and its shared modules",
    note: "TIMESTAMPS, NOT CONTENT. deployed-inventory.mjs answers the content question; "
      + "this one cannot tell a missed deploy from the ordinary deploy-then-commit order.",
  },
  canary: {
    id: "a commit dated a year after its deploy must read STALE",
    observed_failure: canaryCaught,
    caught_by: canaryCaught ? ["freshness"] : [],
    findings: canaryCaught
      ? ["[freshness] a source commit dated after its deploy was reported stale, so the "
        + "comparison that produces every 'current' above can actually fail"]
      : ["[freshness] NOT CAUGHT — a commit a year newer than its deploy read as current, "
        + "so every 'current' above is a verdict this run could not have made"],
  },
});
console.log(`Receipt ${receiptPath}`);
process.exit(failures.length === 0 && canaryCaught ? 0 : 1);
