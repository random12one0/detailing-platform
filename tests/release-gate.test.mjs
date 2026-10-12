// ROADMAP 0.6d — DOES A PUSH TO `main` STOP WHEN THE SERVER IS NOT RUNNING THIS CHECKOUT?
//
//   node tests/release-gate.test.mjs
//
// `.githooks/pre-push` runs the deployed inventory before a push to `main` (the
// website release) and refuses the push when it is not clean or could not run.
// It never publishes. This runs the hook the way git does — `sh <hook> origin
// <url>`, refs on stdin — in two halves:
//
//   § 1, credential-free: a copy of the hook in a temp folder, beside a STUB
//        inventory that exits how each case needs. Refused, clean, override,
//        did-not-run, another branch, a push of several refs.
//   § 2, READ-ONLY against the gateway (needs .env, deploys nothing): the REAL
//        hook on a push to main, then the real inventory on one function the
//        full run called different and one it called clean.
//
// § 2 rewrites receipts/deployed-inventory.json (a full run) and
// receipts/deployed-inventory-only.json. Nothing else is written anywhere.
//
// Sabotage is an env var (docs/gotchas.md 104): BREAK=lets-red-through |
// all-branches. Each edits the temp copy, asserts the edit landed (gotchas 102),
// and must turn § 1 red. § 2 does not run under a break; the receipt says so.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REPO, writeReceipt } from "../scripts/receipt.mjs";

const started_at = new Date().toISOString();
const BREAK = process.env.BREAK || "";
const failures = [], warnings = [];
let passed = 0, assertions = 0, targets = 0;
const check = (name, ok, why) => {
  assertions++;
  if (ok) { passed++; console.log("  ok   " + name); }
  else { failures.push(name + " — " + why); console.log("  FAIL " + name + " — " + why); }
};

const HOOK = join(REPO, ".githooks", "pre-push");
const hookBytes = readFileSync(HOOK, "utf8");
let hook = hookBytes;
const sabotage = (from, to) => {
  const next = hook.replace(from, to);
  if (next === hook) { console.log("BREAK=" + BREAK + " did not land; the run proves nothing"); process.exit(2); }
  hook = next;
};
if (BREAK === "lets-red-through") sabotage('[ "$status" -eq 0 ] && exit 0', "exit 0");
else if (BREAK === "all-branches") sabotage('[ -z "$gated" ] && exit 0', ":");
else if (BREAK) { console.log("unknown BREAK=" + BREAK); process.exit(2); }

const MAIN = "refs/heads/main abc refs/heads/main def\n";
const run = (hookPath, stdin, env = {}) => {
  const r = spawnSync("sh", [hookPath, "origin", "https://github.com/random12one0/detailing-platform"],
    { input: stdin, encoding: "utf8", env: { ...process.env, SHIP_WITH_DRIFT: "", ...env } });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
};

console.log("\n§ 0 — installed on this checkout");
check("git uses .githooks for this checkout (core.hooksPath)",
  (() => { try { return execFileSync("git", ["config", "core.hooksPath"], { cwd: REPO, encoding: "utf8" }).trim() === ".githooks"; } catch { return false; } })(),
  "not installed — run: git config core.hooksPath .githooks");
check("the hook has LF line endings, or Git's sh fails on the first line",
  !hookBytes.includes("\r"), "it contains CR characters");
check("the hook never publishes: no deploy or apply command in it",
  !/deploy-functions|apply-migrations|supabase functions deploy/.test(hookBytes.replace(/^#.*$/gm, "")), "a publish command is in the hook");

console.log("\n§ 1 — the gate's decisions, against a stub inventory");
const STUB = `import { writeFileSync } from "node:fs";
writeFileSync("ran", "1");
const m = process.env.STUB_MODE;
if (m === "clean") { console.log("PASS - all 3 function(s)"); process.exit(0); }
if (m === "nocreds") { console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF."); process.exit(1); }
console.log("FAIL - 2 of 3 function(s) are NOT running this checkout.\\n  send-email\\n  update-booking"); process.exit(1);
`;
const stubCase = (name, stdin, mode, env, expect) => {
  const dir = mkdtempSync(join(tmpdir(), "gate-"));
  try {
    mkdirSync(join(dir, ".githooks")); mkdirSync(join(dir, "scripts"));
    writeFileSync(join(dir, ".githooks", "pre-push"), hook);
    writeFileSync(join(dir, "scripts", "deployed-inventory.mjs"), STUB);
    const r = run(join(dir, ".githooks", "pre-push"), stdin, { STUB_MODE: mode, ...env });
    targets++;
    expect(r, existsSync(join(dir, "ran")));
  } finally { rmSync(dir, { recursive: true, force: true }); }
};
stubCase("drift", MAIN, "drift", {}, (r, ran) => {
  check("drift on a push to main: the push is REFUSED", r.code !== 0, "exit " + r.code);
  check("drift on a push to main: both programs are named", /send-email/.test(r.out) && /update-booking/.test(r.out), r.out.slice(0, 200));
  check("drift on a push to main: it says plainly the push was refused and nothing was published",
    /PUSH REFUSED/.test(r.out) && /Nothing was published/.test(r.out), r.out.slice(-300));
  check("drift on a push to main: it names the way to push anyway", /SHIP_WITH_DRIFT=1 git push/.test(r.out), "no override named");
});
stubCase("nocreds", MAIN, "nocreds", {}, (r) => {
  check("the check could not run (no credentials): the push is REFUSED, not waved through", r.code !== 0, "exit " + r.code);
});
stubCase("clean", MAIN, "clean", {}, (r, ran) => {
  check("clean on a push to main: the push goes ahead", r.code === 0, "exit " + r.code + " " + r.out.slice(-200));
  check("clean on a push to main: the inventory actually ran", ran, "the stub never ran");
});
stubCase("override", MAIN, "drift", { SHIP_WITH_DRIFT: "1" }, (r) => {
  check("drift with SHIP_WITH_DRIFT=1: Andrew's choice stands, the push goes ahead", r.code === 0, "exit " + r.code);
  check("drift with SHIP_WITH_DRIFT=1: it still names the programs and says so", /send-email/.test(r.out) && /PUSHING ANYWAY/.test(r.out), r.out.slice(-300));
});
stubCase("branch", "refs/heads/preview abc refs/heads/preview def\n", "drift", {}, (r, ran) => {
  check("drift on a push to another branch (a free preview): not gated", r.code === 0, "exit " + r.code);
  check("a push to another branch does not run the inventory at all", !ran, "the inventory ran");
});
stubCase("several", "refs/heads/preview a refs/heads/preview b\nrefs/heads/main c refs/heads/main d\n", "drift", {}, (r) => {
  check("a push of several refs that includes main: gated and refused", r.code !== 0, "exit " + r.code);
});

console.log("\n§ 2 — the real hook and the real inventory, read-only against the gateway");
let live = { ran: false };
const haveCreds = existsSync(join(REPO, ".env")) || (process.env.SUPABASE_ACCESS_TOKEN && process.env.SUPABASE_PROJECT_REF);
if (BREAK) {
  warnings.push("§ 2 not run: this is a sabotage run of § 1");
  console.log("  NOT RUN under BREAK — § 1 is the half being sabotaged");
} else if (!haveCreds) {
  failures.push("§ 2 NOT RUN — no .env, so the real gate was never exercised");
  console.log("  NOT RUN — no .env. This is a failure, not a pass.");
} else {
  const r = run(HOOK, MAIN);
  targets++;
  const rec = JSON.parse(readFileSync(join(REPO, "receipts", "deployed-inventory.json"), "utf8"));
  const differing = [...rec.dimensions.differing, ...rec.dimensions.not_deployed];
  live = { ran: true, hook_exit: r.code, receipt_status: rec.status, differing: differing.length, matching: rec.dimensions.matching.length };
  check("the real receipt was written by THIS run", rec.started_at >= started_at, "receipt started " + rec.started_at);
  if (rec.status === "pass") {
    check("a clean estate: the real hook lets the push go", r.code === 0, "exit " + r.code);
  } else {
    check("the estate is not clean: the real hook REFUSES the push", r.code !== 0, "exit " + r.code);
    check("and names every program the inventory named (" + differing.length + " of " + differing.length + ")",
      differing.length > 0 && differing.every((f) => r.out.includes(f)), "missing: " + differing.filter((f) => !r.out.includes(f)).join(", "));
  }
  const one = (fn) => {
    const x = spawnSync(process.execPath, ["scripts/deployed-inventory.mjs", "--only=" + fn], { cwd: REPO, encoding: "utf8" });
    targets++;
    return { code: x.status, out: x.stdout + x.stderr };
  };
  const diff = rec.dimensions.differing[0], clean = rec.dimensions.matching[0];
  if (!diff) failures.push("no known-different function on the server to exercise — UNJUDGEABLE, not a pass");
  else {
    const d = one(diff);
    live.known_different = { fn: diff, exit: d.code };
    check(`known-different (${diff}): the inventory exits 1 and names it`, d.code === 1 && new RegExp(`^\\s+${diff}$`, "m").test(d.out), "exit " + d.code);
  }
  if (!clean) failures.push("no known-clean function on the server to exercise — UNJUDGEABLE, not a pass");
  else {
    const c = one(clean);
    live.known_clean = { fn: clean, exit: c.code };
    check(`known-clean (${clean}): the inventory exits 0 and says PASS`, c.code === 0 && /PASS - all 1 function/.test(c.out), "exit " + c.code);
  }
  const narrowed = JSON.parse(readFileSync(join(REPO, "receipts", "deployed-inventory.json"), "utf8"));
  check("the narrowed runs did not overwrite the full receipt the publish block reads",
    narrowed.started_at === rec.started_at, "full receipt replaced by a narrowed one");
}

const EXPECTED = BREAK ? 6 : 9;
const failed = failures.length;
console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions, ${targets} of ${EXPECTED} cases run.`);
const { path } = writeReceipt({
  check_id: "release-gate",
  started_at,
  status: failed || targets !== EXPECTED ? "fail" : "pass",
  expected_targets: EXPECTED,
  discovered_targets: targets,
  attempted_targets: targets,
  completed_targets: targets,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: BREAK ? 15 : 21,
  assertion_floor: "3 install + 12 over 6 stub cases + (no break) 6 live: real hook refusal and names, receipt freshness, known-different, known-clean, full receipt untouched",
  artifacts: [".githooks/pre-push"],
  failures,
  warnings,
  dimensions: { live, ...(BREAK ? { break: BREAK } : {}) },
  canary: { id: "drift-on-main-refused", observed_failure: !failures.some((f) => f.startsWith("drift on a push to main: the push is REFUSED")) },
});
console.log("receipt: " + path);
process.exit(failed ? 1 : 0);
