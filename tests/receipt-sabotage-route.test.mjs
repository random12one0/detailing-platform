// DOES A SABOTAGE RECEIPT LAND IN ITS OWN FILE? — ROADMAP 98.3, 2026-10-18.
//
//   node --test tests/receipt-sabotage-route.test.mjs
//
// Credential-free, no filesystem writes. It imports the production `isSabotage` from
// scripts/receipt.mjs (never a copy), so breaking the rule there turns this red.
//
// Found when `node scripts/migration-drift.mjs --break=unappliedcol` wrote into
// receipts/migration-drift.json rather than .sabotage.json. That script records its
// break only as the standard warning line, not in `dimensions`, so the writer routed it
// as a real result and the following clean run overwrote the sabotage evidence. Many
// scripts write that warning (`grep -l "this receipt is a sabotage" scripts/*.mjs`);
// before this, the writer ignored it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isSabotage } from "../scripts/receipt.mjs";

const WARN = "run with --break=unappliedcol; this receipt is a sabotage, not a result";

test("a receipt carrying only the standard warning is a sabotage", () => {
  assert.equal(isSabotage({ warnings: ["SEES functions", WARN], dimensions: { project: "x" } }), true);
});

test("each of the three dimension spellings is still a sabotage", () => {
  for (const k of ["break", "sabotage", "broken_on_purpose"]) {
    assert.equal(isSabotage({ warnings: [], dimensions: { [k]: "x" } }), true, k);
  }
});

test("a clean receipt is not a sabotage (the other half: routing everything aside would also pass above)", () => {
  assert.equal(isSabotage({ warnings: ["SEES functions (by body)", "UNJUDGEABLE grant: y"], dimensions: { break: "" } }), false);
  assert.equal(isSabotage({}), false);
});
