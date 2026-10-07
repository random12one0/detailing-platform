// ROADMAP 14.11, first half — a skip carries the evidence that the surface was
// reached and refused. Credential-free, browser-free, reads `scripts/` only.
//
//   node --test tests/skip-evidence.test.mjs
//
// WHAT THIS PROVES AND WHAT IT CANNOT. The helper's behaviour is proved by
// calling it. That every skip in `sweep-widths.mjs` goes through the helper is a
// reading of the file as text, which is coupled to a spelling and says so: it
// finds a bare `SKIPPED.push(` and an `addSkip(SKIPPED, {…})` with no
// `evidence:` in its object. It cannot say the evidence is TRUE, only that it
// was supplied; whether `pressEvidence` really describes a press that waited the
// full bound is what a browser run of the sweep shows, and has not been taken.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { addSkip, probeEvidence, pressEvidence } from "../scripts/lib/skipEvidence.mjs";

test("addSkip refuses a skip with no evidence, and says which one", () => {
  for (const bad of [undefined, null, "", "   ", 8000, {}, ["x"]]) {
    const list = [];
    assert.throws(() => addSkip(list, { width: 1440, label: "tour · step 37", reason: "r", evidence: bad }),
      /tour · step 37.*no evidence/);
    assert.equal(list.length, 0, "a refused skip must not reach the list");
  }
  assert.throws(() => addSkip([], { label: "no field at all" }), /no field at all.*no evidence/);
});

test("addSkip keeps a skip that has it, and keeps the entry whole", () => {
  const list = [];
  const e = { width: 1440, label: "gear · subscription, past due", reason: "r", evidence: probeEvidence(0) };
  addSkip(list, e);
  assert.deepEqual(list, [e]);
});

test("the two evidence builders describe an act and carry the numbers they were given", () => {
  assert.match(probeEvidence(0), /re-asked.*found 0/);
  const p = pressEvidence(8014, 8000);
  assert.match(p, /pressed/); assert.match(p, /8014ms/); assert.match(p, /bound 8000ms/);
});

// The reading of the file. Exported shape is plain so the canary below can aim it at a planted string.
const bareSkipPushes = (text) => (text.match(/\bSKIPPED\.push\(/g) ?? []).length;
const skipSitesWithoutEvidence = (text) => {
  const bad = [];
  for (const m of text.matchAll(/addSkip\(SKIPPED, \{/g)) {
    let depth = 0, i = m.index + m[0].length - 1;
    for (; i < text.length; i++) { if (text[i] === "{") depth++; else if (text[i] === "}" && --depth === 0) break; }
    if (!/\bevidence:/.test(text.slice(m.index, i))) bad.push(text.slice(m.index, m.index + 60));
  }
  return bad;
};

test("sweep-widths issues every skip through addSkip, each with an evidence field", () => {
  const src = readFileSync("scripts/sweep-widths.mjs", "utf8");
  assert.equal(bareSkipPushes(src), 0, "a bare SKIPPED.push is a skip nobody can refuse");
  assert.deepEqual(skipSitesWithoutEvidence(src), []);
  // A discovery FLOOR, not a declared count: more issuers is fine, a parser that stopped
  // matching would read as all-clear. Today: declareSkip and the tour/guide write-off.
  assert.ok((src.match(/addSkip\(SKIPPED, \{/g) ?? []).length >= 2, "the reader found fewer skip sites than exist");
});

test("canary: the reader catches a bare push and a site with no evidence", () => {
  const real = readFileSync("scripts/sweep-widths.mjs", "utf8");
  assert.equal(bareSkipPushes(real + "\nSKIPPED.push({ label: 'x' });"), 1);
  assert.equal(skipSitesWithoutEvidence(real.replace(/evidence: probeEvidence\(n\)/, "")).length, 1);
  assert.equal(skipSitesWithoutEvidence(real.replace(/evidence: pressEvidence\(k\.endMs, TOUR_WAIT_MS\),/, "")).length, 1);
});

// ── billing-walk, the second allowlist user (manager's grant, 2026-10-06) ──
// It cannot be run from here (a sandbox Stripe key, fixture businesses), so what is proved is
// the wiring as text plus the receipt it would write, built from the same helper and graded.
test("billing-walk issues its skip through addSkip with evidence and itemises it in the allowlist", () => {
  const src = readFileSync("scripts/billing-walk.mjs", "utf8");
  const skipCalls = (s) => [...s.matchAll(/(?<![A-Za-z.])skip\((?!name, why, evidence)[^;]*;/g)].map((m) => m[0]);
  assert.match(src, /import \{ addSkip, absentEvidence \} from "\.\/lib\/skipEvidence\.mjs"/);
  assert.match(src, /const skip = \(name, why, evidence\) => \{ addSkip\(skipEntries, /);
  assert.equal((src.match(/\bnotMeasured\.push\(/g) ?? []).length, 1, "a second way into the skip list that bypasses addSkip");
  assert.ok(skipCalls(src).length >= 1, "the reader found no skip call: the pattern stopped matching");
  for (const call of skipCalls(src).map((c) => [c])) {
    assert.match(call[0], /absentEvidence\(/, "a skip call with no evidence argument: " + call[0]);
  }
  assert.match(src, /expires: "[0-9-]+",\s+skipped: skipEntries,/);
  // canary: the reader sees a call with no evidence
  const planted = src.replace('absentEvidence("STRIPE_SECRET_KEY"));', '"x");');
  assert.ok(skipCalls(planted).some((c) => !/absentEvidence\(/.test(c)));
});

test("the receipt billing-walk writes with its three skips is accepted, and rejected without the evidence", async () => {
  const { validate } = await import("../scripts/receipt.mjs");
  const { absentEvidence } = await import("../scripts/lib/skipEvidence.mjs");
  const labels = ["3 · renew", "4 · failed payment retries", "5 · page offline after the retries run out"];
  const r = (skipped) => ({
    check_id: "billing-walk", git_sha: "0".repeat(40), environment: "test",
    started_at: "2026-10-08T00:00:00.000Z", finished_at: "2026-10-08T00:01:00.000Z", status: "pass",
    expected_targets: 3, discovered_targets: 3, attempted_targets: 3, completed_targets: 3,
    skipped_targets: 3, assertions_executed: 40, min_assertions: 10, failures: [], dimensions: {},
    artifacts: ["scripts/receipt.mjs"], warnings: [], canary: { id: "c", observed_failure: true },
    skip_allowlist: { reason: "needs a test clock", expires: "2099-01-01", skipped },
  });
  const full = labels.map((label) => ({ label, reason: "r", evidence: absentEvidence("STRIPE_SECRET_KEY") }));
  assert.equal(validate(r(full), { sha: null }).ok, true);
  const bare = validate(r(full.map(({ evidence, ...e }) => e)), { sha: null });
  assert.equal(bare.ok, false);
  assert.match(bare.problems.join(" | "), /3 skip\(s\) carry no evidence.*3 · renew/);
});
