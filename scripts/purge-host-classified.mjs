// ROADMAP 100.6 — the photo cache-purge host `api.cloudflare.com` is classified in BOTH privacy checks,
// and taking the classification away turns BOTH red naming it.
//
//   node scripts/purge-host-classified.mjs                     # clean: real suites green + canary
//   node scripts/purge-host-classified.mjs --break=unclassify  # sabotage: the gate's subject is the de-classified copies
//
// Credential-free, no browser, no network. Never edits the two suites: the canary writes SIBLING copies
// (`tests/<name>.unclassify-100-6.tmp.mjs`, git-ignored, deleted in `finally`) with the one row removed,
// so their `../` paths still resolve to this repo. `docs/gotchas.md` 102: the removal is COUNTED — each
// copy must lose exactly one line and differ from the original — or the canary is reported as not landed
// rather than as caught.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { REPO, writeReceipt } from "./receipt.mjs";

const HOST = "api.cloudflare.com";
const ROW = new RegExp(`^[ \\t]*"${HOST.replace(/\./g, "\\.")}": \\{[^\\n]*\\n`, "m"); // `[^\n]`, not `.`, and `[ \t]`, not `\s`: in a CRLF checkout `\r` stops `.`, `^` matches after
// it, and `\s*` then swallows the `\n` — measured: 0 lines removed, then 2, before this line was right.
const SUITES = ["tests/legal-promises.test.mjs", "tests/privacy-processors.test.mjs"];
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
if (BREAK && BREAK !== "unclassify") { console.error(`unknown --break=${BREAK}`); process.exit(2); }

const startedAt = new Date().toISOString();
const failures = [];
let assertions = 0;
const log = [];
const say = (m) => { log.push(m); console.log(m); };
const check = (ok, msg) => { assertions++; if (!ok) failures.push(msg); say(`  ${ok ? "ok  " : "FAIL"} ${msg}`); return ok; };

function run(file) {
  try {
    return { code: 0, out: execFileSync(process.execPath, ["--test", file], { cwd: REPO, encoding: "utf8", stdio: "pipe" }) };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout || ""}${e.stderr || ""}` };
  }
}
const tally = (out) => `pass ${out.match(/ℹ pass (\d+)/)?.[1] ?? "?"} / fail ${out.match(/ℹ fail (\d+)/)?.[1] ?? "?"}`;

/** Copy with the classification row removed; returns the copy's path and how many lines left. */
function unclassified(suite) {
  const src = readFileSync(`${REPO}/${suite}`, "utf8");
  const out = src.replace(ROW, "");
  const copy = suite.replace(/\.test\.mjs$/, ".unclassify-100-6.tmp.mjs");
  writeFileSync(`${REPO}/${copy}`, out);
  return { copy, removed: src.split("\n").length - out.split("\n").length, changed: src !== out };
}

const copies = [];
let canaryCaught = 0;
try {
  // 1. The real suites, unless the sabotage swaps the subject for the de-classified copies.
  for (const suite of SUITES) {
    const subject = BREAK ? unclassified(suite) : null;
    if (subject) copies.push(subject.copy);
    const r = run(subject ? subject.copy : suite);
    check(r.code === 0, `${suite}${subject ? " (row removed — SABOTAGE)" : ""} is green: exit ${r.code}, ${tally(r.out)}`);
    if (r.code !== 0) say(r.out.split("\n").filter((l) => l.includes(HOST)).slice(0, 4).map((l) => `        ${l.trim()}`).join("\n"));
  }
  // 2. Canary, every run: remove the row from a copy; it must land (exactly 1 line) and the copy must go
  //    red NAMING the host — a red for any other reason would not prove the row is what holds it green.
  for (const suite of SUITES) {
    const c = unclassified(suite);
    copies.push(c.copy);
    const landed = check(c.changed && c.removed === 1, `canary landed in ${suite}: ${c.removed} line removed, text changed ${c.changed}`);
    const r = run(c.copy);
    const named = r.out.includes(HOST);
    if (landed && r.code !== 0 && named) canaryCaught++;
    check(r.code !== 0 && named, `without the row, ${suite} is red (exit ${r.code}, ${tally(r.out)}) and names ${HOST}: ${named}`);
  }
} finally {
  for (const c of copies) rmSync(`${REPO}/${c}`, { force: true });
}

const status = failures.length ? "fail" : "pass";
const textLog = `receipts/purge-host-classified${BREAK ? ".sabotage" : ""}.txt`;
const { path } = writeReceipt({
  check_id: "purge-host-classified",
  started_at: startedAt,
  status,
  expected_targets: 2,
  discovered_targets: SUITES.length,
  attempted_targets: SUITES.length,
  completed_targets: SUITES.length,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 6,
  assertion_floor: "Per suite: the subject is green (1), the canary row removal landed as exactly one line (1), and the de-classified copy is red naming the host (1). Two suites, six.",
  failures,
  artifacts: [textLog],
  dimensions: { roadmap: "100.6", host: HOST, ...(BREAK ? { break: BREAK } : {}) },
  canary: { id: "unclassify", observed_failure: canaryCaught === SUITES.length, what: `${canaryCaught} of ${SUITES.length} suites went red naming ${HOST} with its classification row removed` },
});
say(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, canary ${canaryCaught}/${SUITES.length}. Receipt: ${path}`);
writeFileSync(`${REPO}/${textLog}`, `${new Date().toISOString()} ${BREAK ? `--break=${BREAK}` : "clean"}\n${log.join("\n")}\n`);
process.exit(failures.length ? 1 : 0);
