import test from "node:test";
import assert from "node:assert/strict";
import { refuse, readResult, JOURNEYS, SKIPPED } from "./audit-journeys.mjs";

test("journeys: unsafe scripts are refused", () => {
  assert.match(refuse('const x = "kguqylyzgyzfktkfnhjb";', {}), /live site/);
  assert.match(refuse('realMail("a@b.c")', { args: [] }), /real email/);
  assert.equal(refuse('realMail("a@b.c")', { args: ["--to=x@fixture.test"] }), null);
  assert.match(refuse('const APP = "http://localhost:5173";', {}), /5173/);
  assert.equal(refuse('const B = process.env.BASE || "http://localhost:5173";', { base: "BASE" }), null);
  assert.equal(JOURNEYS.length, 7); assert.equal(SKIPPED.length, 3);
  // 101.6: browser-features runs trusted on staging's BASE
  const j = JOURNEYS.find((x) => x.id === "browser-features");
  assert.ok(j.trusted && j.base === "BASE");
  assert.equal(refuse('if (!U.includes("kguqylyzgyzfktkfnhjb")) x(); const A = process.env.BASE || "http://localhost:5173";', j), null);
  // receipt-trail stays skipped: its payment leg refuses staging
  assert.ok(!JOURNEYS.some((x) => x.script === "e2e-receipt-trail.mjs"));
  assert.deepEqual(SKIPPED.map((s) => s.script), ["e2e-receipt-trail.mjs", "e2e-payment.mjs", "billing-walk.mjs"]);
});
test("journeys: results are read from the script's own words", () => {
  const r = readResult("  ok    a\n  FAIL  no console errors — 503\n\n43 passed, 1 failed\n");
  assert.deepEqual(r, { passed: 43, failed: 1, fails: ["no console errors — 503"] });
  assert.equal(readResult("crashed").passed, null);
});
