// ROADMAP 14.30 — A DECLARED HOLD IS A SECOND NUMBER, NOT AN ALLOWLIST.
//
//   node --test tests/expected-failures.test.mjs
//
// Credential-free, no browser. Runs `classifyFailures` (scripts/lib/
// expectedFailures.mjs) on synthetic failure records shaped like the real ones in
// receipts/bk-bar-clearance.json. WHAT IT PROVES: the held 320 day-cell failures
// are classed expected BY NAME, an eighth failure of a different kind lands in
// `unexpected`, a day cell that got worse does too, nothing is ever dropped, and
// a hold whose finding vanished is reported rather than silently kept. WHAT IT
// DOES NOT: the real run. That is `node scripts/bk-bar-clearance.mjs` and
// `--break=plant`, in a browser, and ROADMAP 14.30 records it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EXPECTED_FAILURES, classifyFailures } from "../scripts/lib/expectedFailures.mjs";

const legal = (target, smallest, n = 32) => ({
  target, name: "legal",
  detail: `«» is ${smallest}px of hit area with nothing over it (box ${smallest}px + 0px overhang); … and ${n - 3} more [${n} control(s), smallest ${smallest}px]`,
});
const HELD = [legal("320x844 step 5", 37), legal("320x844 long-plan step 5", 37), legal("320x844 long-tenant step 5", 36)];

test("ROADMAP 14.30 — expected failures are named, never tallied", async (t) => {
  await t.test("1 · the held day-cell failures are all expected and nothing is unexpected", () => {
    const r = classifyFailures(HELD);
    assert.equal(r.expected.length, 3);
    assert.equal(r.unexpected.length, 0);
    assert.equal(r.missing.length, 0);
  });

  await t.test("2 · PLANT — an eighth failure of a different kind: unexpected 0 -> 1, the held ones stay put", () => {
    const planted = [...HELD, { target: "planted", name: "plant/other-kind", detail: "x" }];
    const r = classifyFailures(planted);
    assert.equal(r.expected.length, 3, "the expected ones did not move");
    assert.equal(r.unexpected.length, 1);
    assert.equal(r.unexpected[0].name, "plant/other-kind");
    // and removing the plant puts it back
    assert.equal(classifyFailures(HELD).unexpected.length, 0);
  });

  await t.test("3 · THE ORDINARY NEW FAILURE — a held question at a target not on the list", () => {
    const r = classifyFailures([...HELD, legal("392x844 step 5", 37)]);
    assert.equal(r.unexpected.length, 1, "the same question at another width is not covered");
    const s = classifyFailures([...HELD, { target: "320x844 step 5", name: "bar-clear", detail: "the footer covers 4px" }]);
    assert.equal(s.unexpected.length, 1, "another question at the held target is not covered");
  });

  await t.test("4 · A TALLY WOULD FAIL THIS — a day cell gets WORSE while the count stays the same", () => {
    const r = classifyFailures([legal("320x844 step 5", 30), legal("320x844 long-plan step 5", 37), legal("320x844 long-tenant step 5", 36)]);
    assert.equal(r.expected.length, 2);
    assert.equal(r.unexpected.length, 1, "a 30px cell is outside the 36px floor the hold covers, so it is not hidden");
    // a record that names no size cannot be shown to be inside the floor
    assert.equal(classifyFailures([{ target: "320x844 step 5", name: "legal", detail: "no size here" }]).unexpected.length, 1);
  });

  await t.test("5 · nothing is dropped, and a hold whose finding vanished is reported", () => {
    const recs = [legal("320x844 step 5", 37), { target: "a", name: "b", detail: "c" }];
    const r = classifyFailures(recs);
    assert.equal(r.expected.length + r.unexpected.length, recs.length);
    assert.deepEqual(r.missing.map((e) => e.target).sort(), ["320x844 long-plan step 5", "320x844 long-tenant step 5"]);
  });

  await t.test("6 · the declared list names its targets, and cites the ruling", () => {
    assert.ok(EXPECTED_FAILURES.length >= 1);
    for (const e of EXPECTED_FAILURES) {
      assert.ok(e.target && e.name && e.hold && /FOR-ANDREW|same hold/.test(e.hold), JSON.stringify(e));
      assert.ok(typeof e.smallestAtLeast === "number", "a floor, so a worse cell is not hidden");
    }
  });

  await t.test("7 · the sweep routes its verdict through the second number only, and still writes fail", () => {
    const src = readFileSync("scripts/bk-bar-clearance.mjs", "utf8");
    assert.match(src, /classifyFailures\(failureRecords\)/);
    assert.match(src, /held\.unexpected\.length === 0 && canary\.observed_failure/);
    assert.match(src, /const status = failures\.length === 0 && gateOk \? "pass" : "fail"/);
    assert.match(src, /process\.exit\(gateOk \? 0 : 1\)/);
    assert.match(src, /--break=plant|BREAK === "plant"/);
  });
});
