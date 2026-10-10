// ROADMAP 9.12a plan step 2 — what the new Today place says. Credential-free, no
// browser: it IMPORTS app/src/lib/officeToday.js and runs it.
//
//   node --test tests/office-today.test.mjs
//   BREAK=cap node --test tests/office-today.test.mjs        (§ 1 must go red)
//   BREAK=unentered node --test tests/office-today.test.mjs  (§ 4 must go red)
//   BREAK=phone node --test tests/office-today.test.mjs      (§ 2 must go red)
//
// BREAK is an env var, not a flag (docs/gotchas.md 104). Each break rewrites the
// module's source in memory and asserts the rewrite LANDED (gotchas 102), so the
// production file is never touched and a miss cannot read as a clean run.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const LIB = new URL("../app/src/lib/", import.meta.url);
const BREAK = process.env.BREAK || "";
const swap = (text, from, to) => {
  const out = text.replace(from, to);
  assert.notEqual(out, text, `BREAK=${BREAK} did not land: ${from} not found`);
  return out;
};
const asModule = (text) => "data:text/javascript;base64," + Buffer.from(text).toString("base64");
const absolute = (text) => text.replace(/from "\.\/([\w]+\.js)"/g, (_, f) => `from "${LIB.href}${f}"`);
const read = (f) => readFileSync(new URL(f, LIB), "utf8");

// officeToday imports officeDetailers, so the sabotaged copy of THAT must be the one
// it imports (a break aimed at a copy the module never loads proves nothing).
let detailers = absolute(read("officeDetailers.js"));
if (BREAK === "phone") detailers = swap(detailers, 'const reach = c.phone ? "Text them" : c.email ? "Email them" : null;', 'const reach = "Text them";');
let today = absolute(read("officeToday.js")).replace('from "./officeDetailers.js"', `from "${asModule(detailers)}"`);
today = today.replace(`from "${LIB.href}officeDetailers.js"`, `from "${asModule(detailers)}"`);
if (BREAK === "cap") today = swap(today, "all.slice(0, max)", "all");
if (BREAK === "unentered") today = swap(today, "out: net.costs_entered ? Number(net.cost_cents ?? 0) : null,", "out: Number(net.cost_cents ?? 0),");
const T = await import(asModule(today));

const SETUP = (phone) => ({
  counts: { services: 3, promos: 1, reviews: 1, plans: 1, hoursRows: [{ open_time: "09:00" }] },
  branding: { primary_color: "#38E08B" },
  settings: { setup: { done: ["where", "templates"] }, vehicle_sizes: null, faqs: [{ q: "a", a: "b" }], pay_cash: true },
  business: { contact_phone: phone, contact_email: "x@y.z" },
});
let n = 0;
const row = (over = {}) => ({
  id: String(++n), name: `Row ${n}`, status: "active", is_demo: false, owner_email: "own@example.com",
  subscription: { status: "active", recurring_cents: 6000, bill_interval: "month" },
  bookings_total: 20, days_since_booking: 2, jobs_month: 5, revenue_month: 900, customers: 30,
  site_url: "https://x.example", setup_inputs: SETUP("(616) 555-0100"), ...over,
});
const quiet = (over = {}) => row({ days_since_booking: 40, ...over });

test("1. Needs you holds at most five, dearest first, and says how many were left off", () => {
  const rows = [1, 2, 3, 4, 5, 6, 7].map((k) => quiet({ subscription: { status: "active", recurring_cents: k * 1000, bill_interval: "month" } }));
  const r = T.needsYou(rows);
  assert.equal(r.items.length, 5, `expected 5 items, got ${r.items.length}`);
  assert.equal(r.more, 2);
  assert.equal(r.total, 7);
  const costs = r.items.map((x) => x.issue.costCents);
  assert.deepEqual(costs, [7000, 6000, 5000, 4000, 3000]);
});

test("2. no Text button over an account with no phone number, and none over nobody", () => {
  const noPhone = quiet({ setup_inputs: SETUP(null) });
  const nobody = quiet({ setup_inputs: SETUP(null), owner_email: null });
  const { items } = T.needsYou([noPhone, nobody]);
  assert.equal(items.length, 2);
  for (const { row: r, issue } of items) {
    assert.notEqual(issue.act, "Text them", `${r.id} was offered Text with no phone`);
    assert.doesNotMatch(issue.text, /\bring\b|\bcall\b/i, `advice mentions a phone: ${issue.text}`);
  }
  assert.equal(items.find((x) => x.row === noPhone).issue.act, "Email them");
  assert.equal(items.find((x) => x.row === nobody).issue.act, null);
  // the other half: with a phone the button IS offered, so "none found" is not just a wrong selector
  assert.equal(T.needsYou([quiet()]).items[0].issue.act, "Text them");
});

test("3. test accounts and healthy accounts are never on the list; unknown cost sorts last, not as $0", () => {
  const r = T.needsYou([quiet({ is_demo: true }), row(), quiet({ subscription: null }), quiet()]);
  assert.equal(r.total, 2);
  assert.equal(r.items[0].issue.costCents, 6000);
  assert.equal(r.items[1].issue.costCents, null);
});

test("4. a month with no bills typed in has NO money out; it is not $0", () => {
  const none = T.monthBars({ revenue_cents: 5000, cost_cents: null, net_cents: null, costs_entered: false });
  assert.equal(none.in, 5000);
  assert.equal(none.out, null, "an unentered bill drew as a number");
  assert.equal(none.kept, null);
  const some = T.monthBars({ revenue_cents: 5000, cost_cents: 1200, net_cents: 3800, costs_entered: true });
  assert.deepEqual([some.out, some.kept], [1200, 3800]);
  // a failed read is its own state, never an empty month
  assert.equal(T.monthBars({ error: "x" }).failed, true);
  assert.equal(T.monthBars(undefined).failed, true);
});

test("5. twelve months, oldest first, ending this month, across a year boundary", () => {
  const m = T.lastMonths(12, new Date("2026-02-15T00:00:00Z"));
  assert.equal(m.length, 12);
  assert.equal(m[0], "2025-03-01");
  assert.equal(m[11], "2026-02-01");
  assert.deepEqual(T.lastMonths(2, new Date("2026-01-31T23:00:00Z")), ["2025-12-01", "2026-01-01"]);
});

test("6. the sign-up path counts real detailers only, each stage against everyone", () => {
  const real = [row(), quiet(), row({ bookings_total: 0, days_since_booking: null })];
  const p = T.signupPath([...real, row({ is_demo: true }), row({ is_demo: true })]);
  assert.equal(p.of, 3, "test accounts were counted");
  const by = Object.fromEntries(p.stages.map((s) => [s.key, s.count]));
  assert.equal(by.signed, 3);
  assert.equal(by.booked, 2);
  assert.equal(by.active, 1, "only the account that booked within 21 days is active");
  assert.ok(p.stages.every((s) => s.of === 3));
  assert.equal(T.signupPath([]).of, 0);
});
