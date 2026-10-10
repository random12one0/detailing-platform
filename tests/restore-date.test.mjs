// ROADMAP 6.1 — WHICH RESTORE-DRILL RECEIPTS MAY PUT A DATE IN THE BACK OFFICE.
// Credential-free: reads the real receipt on disk and never writes anything.
// A date on that screen says "the records came back"; a receipt that does not
// prove it must be refused, and the real one must not be.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { whyNotProved, restoreRow, NEVER_STALE } from "../scripts/restore-date.mjs";

const real = JSON.parse(readFileSync(new URL("../receipts/restore-drill.json", import.meta.url), "utf8"));
const bent = (f) => { const r = structuredClone(real); f(r); return r; };

test("the real receipt proves a restore, despite the drill's own status", () => {
  assert.equal(real.status, "fail", "the drill fails on Supabase's posture line; this test is about that case");
  assert.deepEqual(whyNotProved(real), []);
});

test("the row carries the receipt's date and counts, and can never alarm", () => {
  const row = restoreRow(real);
  assert.equal(row.ran_at, real.finished_at);
  assert.equal(row.detail.tables, real.completed_targets);
  assert.equal(row.stale_after_seconds, NEVER_STALE);
});

const refusals = {
  "a restore mismatch": (r) => r.failures.push("restore mismatch — bookings: 12 rows, expected 13"),
  "a failure nobody recognises": (r) => r.failures.push("something new went wrong"),
  "the canary not caught": (r) => { r.canary.observed_failure = false; },
  "a sabotage run": (r) => r.warnings.unshift("run with --break=canary; this receipt is a sabotage, not a result"),
  "a table not compared": (r) => { r.completed_targets -= 1; },
  "zero tables": (r) => { r.discovered_targets = r.attempted_targets = r.completed_targets = 0; },
  "another project": (r) => { r.dimensions.project = "adtlnvihwrcqcasqcjwd"; },
  "no finish date": (r) => { delete r.finished_at; },
};
for (const [name, f] of Object.entries(refusals)) {
  test(`refused: ${name}`, () => assert.ok(whyNotProved(bent(f)).length > 0));
}
