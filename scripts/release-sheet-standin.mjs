// WHAT-IF RUN OF THE RELEASE SHEET'S ELEVEN SABOTAGES, credential-free. ROADMAP 98.18, 2026-10-24.
//
//   node scripts/release-sheet-standin.mjs
//   node scripts/release-sheet-standin.mjs --break=empty   # stand-in names NO programs (the stale case): must exit 1
//                                                         # naming no-escape, fn-before-page and lock-order as silent
//
// Most of release-sheet.mjs's --break= switches only bite while the server check names the
// programs they move. With a stale deployed-inventory receipt that names none, fn-before-page and
// lock-order print nothing new, so a session without keys cannot tell whether they still catch
// anything. This writes a STAND-IN inventory receipt (platform-admin, plus every program carrying a
// file changed in supabase/functions since the real receipt's commit; google-business never
// published), runs the sheet clean and with each switch, and prints the FAIL lines each switch adds.
//
// IT IS NOT A MEASUREMENT of the server, and nothing it writes is kept: it refuses to start unless
// the 25 files it and the sheet write (the inventory receipt, the sheet, its receipt, and the eleven
// sabotage pairs) are clean, and puts back exactly those from HEAD when it ends, so another session's
// edit anywhere else in receipts/ is left alone. A `finally` does not run on a kill (docs/gotchas.md
// 90), so the stand-in receipt carries `dimensions.standin` and release-sheet.mjs refuses it by name;
// this run exits 1 if the clean sheet does not print that refusal. The real proof is the keyed run
// (migration-drift, deployed-inventory, then the sheet and its eleven switches).

import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { join, dirname, normalize } from "node:path";
import { REPO } from "./receipt.mjs";

const git = (...a) => execFileSync("git", a, { cwd: REPO, encoding: "utf8" }).trim();
const BREAKS = ["drop-step", "drop-line", "unhold", "open-wait", "no-cron", "no-order", "no-escape", "fn-before-page", "lock-one", "lock-order", "webhook-last"];
const OUT = ["receipts/deployed-inventory.json", "docs/release-sheet.md", "receipts/release-sheet.json",
  ...BREAKS.flatMap((b) => ["json", "md"].map((e) => `receipts/release-sheet.${b}.sabotage.${e}`))];
const dirty = git("status", "--porcelain", "--", ...OUT);
if (dirty) {
  console.error(`These have uncommitted changes and this run would overwrite them. Nothing run.\n${dirty}`);
  process.exit(2);
}
const EMPTY = process.argv.includes("--break=empty");
const F = join(REPO, "supabase/functions");
const real = JSON.parse(readFileSync(join(REPO, "receipts/deployed-inventory.json"), "utf8"));
const changed = new Set(git("diff", "--name-only", real.git_sha, "HEAD", "--", "supabase/functions").split("\n").filter(Boolean).map((p) => p.slice("supabase/functions/".length)));
const importsOf = (rel, seen = new Set()) => {
  if (seen.has(rel) || !existsSync(join(F, rel))) return seen;
  seen.add(rel);
  for (const m of readFileSync(join(F, rel), "utf8").matchAll(/from\s+["'](\.{1,2}\/[^"']+\.ts)["']/g)) importsOf(normalize(join(dirname(rel), m[1])).split("\\").join("/"), seen);
  return seen;
};
const causes = {};
for (const d of readdirSync(F, { withFileTypes: true }).filter((x) => x.isDirectory() && !x.name.startsWith("_") && x.name !== "google-business")) {
  const files = [...importsOf(`${d.name}/index.ts`)];
  if (d.name === "platform-admin" || files.some((f) => changed.has(f))) causes[d.name] = { function_local: files.filter((f) => !f.startsWith("_shared/")).map((f) => f.slice(d.name.length + 1)), shared_modules: files.filter((f) => f.startsWith("_shared/")) };
}
const run = (b) => {
  const r = spawnSync(process.execPath, [join(REPO, "scripts/release-sheet.mjs"), ...(b ? [`--break=${b}`] : [])], { cwd: REPO, encoding: "utf8" });
  return new Set((r.stdout || "").split("\n").filter((l) => l.startsWith("FAIL — ") && !l.includes(", receipt ")));
};
let silent = 0, refused = false;
try {
  writeFileSync(join(REPO, "receipts/deployed-inventory.json"), JSON.stringify({ ...real, git_sha: git("rev-parse", "HEAD"), warnings: ["STAND-IN written by release-sheet-standin.mjs, not a measurement of the server", ...(real.warnings || [])], dimensions: { ...real.dimensions, standin: true, differing: EMPTY ? [] : Object.keys(causes).sort(), not_deployed: EMPTY ? [] : ["google-business"], causes: EMPTY ? {} : causes } }, null, 2));
  console.log(`STAND-IN${EMPTY ? " (--break=empty: names no programs)" : ""}: ${changed.size} function file(s) changed since ${real.git_sha.slice(0, 8)}; ${EMPTY ? 0 : Object.keys(causes).length} program(s) treated as out of date.`);
  const clean = run();
  refused = [...clean].some((f) => f.includes("is a STAND-IN written by release-sheet-standin.mjs"));
  console.log(`\nclean: ${clean.size} FAIL`);
  for (const f of [...clean].sort()) console.log("  " + f);
  for (const b of BREAKS) {
    const added = [...run(b)].filter((f) => !clean.has(f)).sort();
    if (!added.length) silent++;
    console.log(`\n--break=${b}: ${added.length ? `${added.length} new FAIL` : "NOTHING NEW (this switch caught nothing)"}`);
    for (const f of added) console.log("  " + f);
  }
} finally {
  git("checkout", "HEAD", "--", ...OUT);
}
console.log(`\n${BREAKS.length - silent} of ${BREAKS.length} switches added a FAIL on the stand-in. ${OUT.length} file(s) restored from HEAD; nothing else in receipts/ touched.`);
console.log(`stand-in receipt ${refused ? "refused by the sheet, as it must be" : "NOT REFUSED by the sheet: a killed run would leave a fake inventory it reads as real"}.`);
process.exit(silent || !refused ? 1 : 0);
