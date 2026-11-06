// ROADMAP 98.12, R3, DONE LITERALLY AND RE-RUNNABLE: put a throwaway AWAITS PUBLISH line under an open
// item in a SCRATCH COPY of this repo, run the release sheet there, see it name the item, remove the line,
// see the name go. Credential-free: git and files only. The scratch copy is deleted at the end.
//
//   node scripts/release-sheet-undeclared.mjs                  # must PASS
//   node scripts/release-sheet-undeclared.mjs --break=no-line  # the line is never written: must go red
//
// Independent of release-sheet.mjs's own --break=undeclared-line, which injects in memory: this writes a
// real ROADMAP.md (the scratch copy's) and runs the sheet unmodified. Its canary is the same run with the
// sheet's guard switched off in the scratch copy: the item must then NOT be named, or a FAIL from another
// cause would be passing for this one (docs/gotchas.md 105). Every scripted edit is proved landed with
// `git diff --numstat` (gotchas 102), and the main copy's ROADMAP.md is checked byte-identical after.

import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import { writeReceipt, REPO } from "./receipt.mjs";

const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
if (BREAK && BREAK !== "no-line") { console.error(`Unknown --break=${BREAK}. Known: no-line.`); process.exit(2); }
const SCRATCH = join(REPO, ".tmp-release-sheet-undeclared"); // .tmp-*/ is gitignored
const git = (...a) => execFileSync("git", a, { cwd: SCRATCH, encoding: "utf8" }).trim();
const GUARD = "if (!why) { rowProblems.push(";
const MSG = "has a release line and is neither declared nor excluded";
const failures = [];
let asserts = 0; // counted as they run: 9 on a full run, 8 under --break=no-line (no numstat check)
const check = (ok, msg) => { asserts++; if (!ok) failures.push(msg); return ok; };
const runs = [];
// One sheet run in the scratch copy: its FAIL lines, minus the closing summary.
function sheet(label) {
  const r = spawnSync(process.execPath, ["scripts/release-sheet.mjs"], { cwd: SCRATCH, encoding: "utf8", env: { ...process.env, TRACKED_RECEIPTS: "1" } });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const done = /^(PASS|FAIL) — sheet /m.test(out);
  runs.push({ label, exit: r.status, completed: done });
  if (!done) failures.push(`${label}: the sheet did not finish (exit ${r.status}): ${out.slice(-300)}`);
  return out.split(/\r?\n/).filter((l) => l.startsWith("FAIL — ") && !l.startsWith("FAIL — sheet "));
}
const roadmapBefore = readFileSync(join(REPO, "ROADMAP.md"));
const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO, encoding: "utf8" }).trim();
let canaryCaught = false, key = null, named = [], added = [], guardOffNamed = [], removedNamed = [], extraAfter = [];
try {
  rmSync(SCRATCH, { recursive: true, force: true, maxRetries: 3 });
  execFileSync("git", ["clone", "--quiet", "--shared", "--no-checkout", REPO, SCRATCH]);
  git("checkout", "--quiet", "--detach", head);
  const clean = sheet("clean");

  // The first open item with no release line and no declaration (every one the sheet read is in its receipt).
  const rec = JSON.parse(readFileSync(join(SCRATCH, "receipts/release-sheet.json"), "utf8")).dimensions;
  const taken = new Set([...rec.release_rows_read, ...rec.roadmap_rules_declared, ...rec.roadmap_excluded]);
  const roadmap = readFileSync(join(SCRATCH, "ROADMAP.md"), "utf8");
  const m = [...roadmap.matchAll(/^- \[ \] \*\*([0-9][0-9.]*[a-z]*) — .*$/gm)].find((x) => !taken.has(x[1]));
  if (!m) throw new Error("no open item without a release line was found; nothing to put the line under");
  key = m[1];
  const at = m.index + m[0].length;
  if (BREAK !== "no-line") {
    writeFileSync(join(SCRATCH, "ROADMAP.md"), roadmap.slice(0, at) + (roadmap.includes("\r\n") ? "\r\n" : "\n") + "  AWAITS PUBLISH (98.12 proof, scratch copy only): a throwaway release line." + roadmap.slice(at));
    const ns = git("diff", "--numstat", "--", "ROADMAP.md");
    check(/^1\s+0\s+ROADMAP\.md$/.test(ns), `the throwaway line did not land as one added line (numstat "${ns}")`);
  }
  const withLine = sheet("with the throwaway line");
  named = withLine.filter((l) => l.includes(`"${key} — `) && l.includes(MSG));
  added = withLine.filter((l) => !clean.includes(l));
  check(named.length === 1, `with a throwaway AWAITS PUBLISH line under ${key}, the sheet named it ${named.length} time(s), not once`);
  check(added.length === named.length && added.every((l) => named.includes(l)), `the line changed more than the one FAIL: ${added.join(" | ")}`);

  // Canary: the sheet's guard switched off in the scratch copy. The item must then go unnamed.
  const script = join(SCRATCH, "scripts/release-sheet.mjs");
  writeFileSync(script, readFileSync(script, "utf8").replace(GUARD, "if (!why) { if (false) rowProblems.push("));
  const gs = git("diff", "--numstat", "--", "scripts/release-sheet.mjs");
  const guardLanded = check(/^1\s+1\s+scripts\/release-sheet\.mjs$/.test(gs), `the canary's guard edit did not land (numstat "${gs}")`);
  guardOffNamed = sheet("guard switched off").filter((l) => l.includes(`"${key} — `));
  git("checkout", "--quiet", "--", "scripts/release-sheet.mjs");
  asserts++;
  canaryCaught = guardLanded && guardOffNamed.length === 0;

  // Remove it: the name must go, and the FAIL list must be the clean one again.
  git("checkout", "--quiet", "--", "ROADMAP.md");
  check(!git("status", "--porcelain", "--", "ROADMAP.md", "scripts"), "the scratch copy did not go back to HEAD");
  const removed = sheet("line removed");
  removedNamed = removed.filter((l) => l.includes(`"${key} — `));
  extraAfter = removed.filter((l) => !clean.includes(l));
  check(!removedNamed.length, `after the line was removed, the sheet still names ${key}`);
  check(!extraAfter.length, `after the line was removed, the FAIL list is not the clean one: ${extraAfter.join(" | ")}`);
} catch (e) {
  failures.push(`could not run: ${e.message}`);
} finally {
  rmSync(SCRATCH, { recursive: true, force: true, maxRetries: 3 });
}
check(readFileSync(join(REPO, "ROADMAP.md")).equals(roadmapBefore), "the main copy's ROADMAP.md changed during the run");

const completed = runs.filter((r) => r.completed).length;
const ok = failures.length === 0 && canaryCaught === true && completed === 4;
const { path: receiptPath } = writeReceipt({
  check_id: BREAK ? `release-sheet-undeclared.${BREAK}` : "release-sheet-undeclared",
  started_at,
  status: ok ? "pass" : "fail",
  expected_targets: 4,
  discovered_targets: completed,
  attempted_targets: runs.length,
  completed_targets: completed,
  skipped_targets: 4 - runs.length,
  assertions_executed: asserts,
  min_assertions: 7, // below both 9 and 8, so a run that stops early is refused
  failures,
  artifacts: ["scripts/release-sheet-undeclared.mjs", "scripts/release-sheet.mjs"],
  warnings: [
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
    "Runs the release sheet four times in a scratch clone of HEAD (clean, with the line, guard off, line removed); judges the FAIL lines, never the verdict word, because the sheet can be red for other reasons (a STALE receipt).",
  ],
  dimensions: { ...(BREAK ? { break: BREAK } : {}), head, item_under_line: key, named, added_by_line: added, guard_off_named: guardOffNamed, after_removal_named: removedNamed, after_removal_extra: extraAfter, runs },
  canary: { id: "with the sheet's guard switched off in the scratch copy, the same line must go unnamed", observed_failure: canaryCaught === true },
});
console.log(`item under the throwaway line: ${key}; runs completed ${completed} of 4`);
for (const l of named) console.log(`named: ${l}`);
console.log(`canary (guard off, item unnamed) ${canaryCaught ? "caught" : "NOT CAUGHT"}`);
for (const f of failures) console.log("FAIL — " + f);
console.log(`${ok ? "PASS" : "FAIL"} — receipt ${receiptPath}`);
process.exit(ok ? 0 : 1);
