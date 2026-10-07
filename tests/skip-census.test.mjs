// ROADMAP 14.11 — THE CENSUS OF EVERY SCRIPT THAT WRITES `skipped_targets`, HELD AS CODE.
// Credential-free, browser-free: it reads `scripts/` as text and runs the real grader.
//
//   node --test tests/skip-census.test.mjs
//
// WHAT THE AUDIT FOUND, which is the reason this file exists. The question the item
// asks of every issuer is "what would have to be true for this skip to be refused".
// Read across all of them, the answer is shorter than feared:
//
//   * A receipt with skips can only GRADE AS A PASS through `skip_allowlist`
//     (`receipt.mjs`: any skip without one is a problem). Two scripts write one.
//   * One of those, `sweep-widths`, routes every skip through `addSkip`, which
//     refuses a skip with no evidence. The other, `billing-walk`, does not, and
//     is listed below as a KNOWN gap. It is also `status: "fail"` whenever it has a
//     skip, so it has never produced a passing receipt with one.
//   * Every other computed writer has no allowlist, so a positive count fails the
//     receipt however it arrived: those are counted shortfalls that fail, not
//     skips that pass, and there is nothing for an evidence field to add.
//   * The rest write a literal `0`: they cannot issue one by construction.
//
// A census written in prose goes stale the day a script is added, so each claim is a
// check. The two LISTS are declared with equality, not floors: a new writer or a new
// allowlist user turns this red until somebody classifies it, which is the point.
//
// CEILING, said once: this reads spelling (`skip_allowlist:`, `skipped_targets:`). A
// writer that builds the key dynamically would not be seen, and the discovery floor at
// the bottom is what notices the reader going blind, not a proof that none exists.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const scripts = readdirSync("scripts").filter((f) => f.endsWith(".mjs") && f !== "receipt.mjs");
const text = Object.fromEntries(scripts.map((f) => [f, stripJs(readFileSync(`scripts/${f}`, "utf8"))]));

const writers = scripts.filter((f) => /\bskipped_targets\s*:/.test(text[f]));
const computed = writers.filter((f) =>
  [...text[f].matchAll(/\bskipped_targets\s*:\s*([^,\n]+)/g)].some((m) => m[1].trim() !== "0"));
const allowlisters = scripts.filter((f) => /\bskip_allowlist\s*:/.test(text[f]));
const evidenced = allowlisters.filter((f) => /from "\.\/lib\/skipEvidence\.mjs"/.test(text[f]));

// Declared with equality. Each name is a script whose skip count is an expression.
const COMPUTED = [
  "american-english.mjs", "billing-walk.mjs", "contrast-insitu.mjs", "edge-tenant-replay.mjs",
  "keyboard-walk.mjs", "label-guard.mjs", "link-counts-agree.mjs", "rate-limit-coverage.mjs",
  "screenreader-structure.mjs", "sweep-tap-targets.mjs", "sweep-widths.mjs", "tenant-matrix.mjs",
  "text-spacing-walk.mjs", "zoom-walk.mjs",
];
const ALLOWLISTERS = ["billing-walk.mjs", "sweep-widths.mjs"];
// The one known gap. Not named by the item, so not edited under its grant. Shrinks to
// [] the day billing-walk itemises its skips, and this test says so by going red.
const KNOWN_UNEVIDENCED = ["billing-walk.mjs"];

test("the scripts whose skip count is an expression are exactly the declared ones", () => {
  assert.deepEqual(computed, COMPUTED);
});

test("the scripts that can attach an allowlist, the only way a skip passes, are exactly the declared two", () => {
  assert.deepEqual(allowlisters, ALLOWLISTERS);
});

test("every allowlist user either supplies evidence or is the declared known gap, and nothing else", () => {
  assert.deepEqual(allowlisters.filter((f) => !evidenced.includes(f)), KNOWN_UNEVIDENCED);
  assert.ok(evidenced.includes("sweep-widths.mjs"));
});

test("a writer with no allowlist cannot pass a skip, whatever it computes", async () => {
  const { validate } = await import("../scripts/receipt.mjs");
  const base = {
    check_id: "census/fixture", git_sha: "0".repeat(40), environment: "test",
    started_at: "2026-10-08T00:00:00.000Z", finished_at: "2026-10-08T00:01:00.000Z", status: "pass",
    expected_targets: 4, discovered_targets: 4, attempted_targets: 4, completed_targets: 4,
    skipped_targets: 1, assertions_executed: 40, min_assertions: 10, failures: [], dimensions: {},
    artifacts: ["scripts/receipt.mjs"], warnings: [], canary: { id: "c", observed_failure: true },
  };
  const out = validate(base, { sha: null });
  assert.equal(out.ok, false);
  assert.match(out.problems.join(" | "), /no `skip_allowlist`/);
  for (const f of COMPUTED.filter((x) => !ALLOWLISTERS.includes(x))) {
    assert.ok(!text[f].includes("skip_allowlist"), `${f} grew an allowlist; classify it`);
  }
});

test("discovery floor: the reader still sees the population", () => {
  // A FLOOR, not a declared count: more writers is fine, a reader gone blind is not.
  assert.ok(writers.length >= 40, `only ${writers.length} writers found, the pattern stopped matching`);
  assert.ok(computed.length >= 10);
});
