// ROADMAP 97.32 - "today" is the BUSINESS's date, never UTC's.
//
// The clock is frozen at 6 PM Pacific on 2026-10-19 (01:00 UTC on the 20th).
// Each of the three places the item names has ONE line that decides "today";
// this test lifts that line out of the real source and runs it under the
// frozen clock, so it judges the production expression, not a copy of it.
// On the unfixed code each line is `new Date().toISOString().slice(0, 10)`
// and answers the 20th.
//
// Run: node --test tests/business-day-97-32.test.mjs   (credential-free)

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { businessToday } from "../app/src/book/core.js";
import { stageDue } from "../supabase/functions/_shared/maintenance.ts";
import { dateStrIn } from "../supabase/functions/_shared/tz.ts";

const LA = "America/Los_Angeles", TODAY = "2026-10-19";
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

// The first `const today = …;` after `anchor` in `file`, evaluated with the
// names those lines may use. A missing anchor or line fails by name.
function todayLine(file, anchor) {
  const src = read(file), at = src.indexOf(anchor);
  assert.ok(at >= 0, `${file}: anchor ${JSON.stringify(anchor)} not found`);
  const m = /const today = ([^;]+);/.exec(src.slice(at, at + 1500));
  assert.ok(m, `${file}: no "const today = ...;" after ${JSON.stringify(anchor)}`);
  return m[1];
}
function run(expr) {
  const biz = { timezone: LA };
  return new Function("businessToday", "dateStrIn", "business", "receiptBusiness", `return (${expr});`)(
    businessToday, dateStrIn, biz, biz);
}

const RealDate = Date;
const FIXED = new RealDate("2026-10-20T01:00:00Z");
function frozen(fn) {
  globalThis.Date = class extends RealDate {
    constructor(...a) { return a.length ? new RealDate(...a) : new RealDate(FIXED); }
    static now() { return FIXED.getTime(); }
  };
  try { return fn(); } finally { globalThis.Date = RealDate; }
}

test("the frozen clock straddles midnight (UTC 20th, Los Angeles 19th)", () => frozen(() => {
  assert.equal(new Date().toISOString().slice(0, 10), "2026-10-20");
  assert.equal(businessToday(LA), TODAY);
}));

test("reschedule picker starts on the business's today", () => frozen(() => {
  assert.equal(run(todayLine("app/src/book/ManageBookingPage.jsx", "const loadSlots")), TODAY);
}));

test("Mark done stamps the business's today", () => frozen(() => {
  assert.equal(run(todayLine("app/src/screens/more/Maintenance.jsx", "const markDone")), TODAY);
}));

test("reminder sweep: a deadline due today is fetched and judged due", () => frozen(() => {
  const file = "supabase/functions/send-owner-reminders/index.ts";
  const src = read(file), block = src.slice(src.indexOf('.from("maintenance_deadlines")'));
  const floor = /\.gte\("due_on", ([^\n]+)\);/.exec(block);
  assert.ok(floor, "no due_on lower bound found");
  assert.ok(run(floor[1]) <= TODAY, `lower bound ${run(floor[1])} drops a deadline due ${TODAY}`);
  const today = run(todayLine(file, "for (const d of deadlines"));
  assert.equal(today, TODAY);
  assert.equal(stageDue({ due_on: TODAY, reminded_stage: 3 }, new Date(`${today}T00:00:00Z`)), 3);
}));
