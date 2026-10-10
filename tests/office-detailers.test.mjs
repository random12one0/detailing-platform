// ROADMAP 9.12a slice 1 — what the new Detailers place says about one detailer.
//
// Credential-free, no browser: it IMPORTS app/src/lib/officeDetailers.js and runs
// it. The rule with a customer on it is § 2: no Text, Call or "Ring them" over an
// account with no phone number. Everything else guards the arithmetic Andrew will
// compare against another screen.
//
//   node --test tests/office-detailers.test.mjs
//   BREAK=phone node --test tests/office-detailers.test.mjs   (§ 2 must go red)
//
// BREAK is an env var, not a flag: `node --test` swallows extra arguments
// (docs/gotchas.md 104). It rewrites the module's source in memory, so the
// production file is never touched.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = new URL("../app/src/lib/officeDetailers.js", import.meta.url);
let text = readFileSync(SRC, "utf8");
const BREAK = process.env.BREAK || "";
if (BREAK === "phone") {
  // The defect 9.12 removed: a phone-flavoured button chosen without a phone.
  const before = text;
  text = text.replace('const reach = c.phone ? "Text them" : c.email ? "Email them" : null;', 'const reach = "Text them";');
  assert.notEqual(text, before, "BREAK=phone did not land: the sabotaged line was not found");
}
// Sibling imports resolve against the real folder; only this module is swapped.
const base = new URL("../app/src/lib/", import.meta.url).href;
text = text.replace(/from "\.\/([\w]+\.js)"/g, (_, f) => `from "${base}${f}"`);
const M = await import("data:text/javascript;base64," + Buffer.from(text).toString("base64"));

const NOW = new Date("2026-10-10T12:00:00Z");
const daysAgo = (n) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const SETUP = (phone, done = 12) => ({
  counts: { services: 3, promos: 1, reviews: 1, plans: 1, hoursRows: [{ open_time: "09:00" }] },
  branding: { primary_color: "#38E08B" },
  settings: { setup: { done: ["where", "templates"] }, vehicle_sizes: null, faqs: [{ q: "a", a: "b" }], pay_cash: true },
  business: { contact_phone: phone, contact_email: "x@y.z" },
  _done: done,
});
const row = (over = {}) => ({
  id: "1", name: "Row", status: "active", is_demo: false, owner_email: "own@example.com",
  subscription: { status: "active", recurring_cents: 6000, bill_interval: "month" },
  bookings_total: 20, days_since_booking: 2, jobs_month: 5, revenue_month: 900, customers: 30,
  site_url: "https://x.example", domain: null, setup_inputs: SETUP("(616) 555-0100"),
  ...over,
});

test("1. a healthy account has no issue and a high score", () => {
  const r = row();
  assert.equal(M.issueOf(r), null);
  assert.equal(M.statusOf(r).key, "live");
  assert.ok(M.healthOf(r).score >= 75, `healthy score was ${M.healthOf(r).score}`);
});

test("2. no Text, Call or ring over an account with no phone number", () => {
  const noPhone = row({
    days_since_booking: 40, setup_inputs: SETUP(null),
  });
  const c = M.contactOf(noPhone);
  assert.equal(c.phone, null);
  assert.equal(c.tel, null);
  assert.equal(c.sms, null);
  const issue = M.issueOf(noPhone);
  assert.ok(issue, "a quiet account should have an issue");
  assert.notEqual(issue.act, "Text them", "offered a Text button with no phone number");
  assert.equal(issue.act, "Email them");
  assert.doesNotMatch(issue.text, /\bring\b|phone|call/i, `advice mentions a phone: ${issue.text}`);
  // ...and with nobody to reach at all, there is no button, and the line says so.
  const nobody = row({ days_since_booking: 40, owner_email: null, setup_inputs: SETUP(null) });
  assert.equal(M.issueOf(nobody).act, null);
  assert.match(M.issueOf(nobody).text, /nothing here can reach them/);
});

test("3. a phone number gives Text and Call, in that order of preference", () => {
  const c = M.contactOf(row());
  assert.equal(c.tel, "tel:6165550100");
  assert.equal(c.sms, "sms:6165550100");
  assert.equal(M.issueOf(row({ days_since_booking: 40 })).act, "Text them");
});

test("4. health parts add up to the score, and the score is clamped", () => {
  for (const r of [row(), row({ jobs_month: 0, days_since_booking: 50 }), row({ status: "paused" }),
    row({ bookings_total: 0, days_since_booking: null, jobs_month: 0 })]) {
    const h = M.healthOf(r);
    const sum = 50 + h.parts.reduce((a, p) => a + p.points, 0);
    assert.equal(h.score, Math.max(0, Math.min(100, sum)));
    assert.ok(h.score >= 0 && h.score <= 100);
  }
  const worst = M.healthOf(row({ status: "paused", bookings_total: 0, jobs_month: 0, customers: 0, setup_inputs: { counts: {}, settings: {}, business: {} } }));
  assert.ok(worst.score <= 10, `a suspended account that never started scored ${worst.score}`);
});

test("5. a failed card is the loudest status and names its cost", () => {
  const r = row({ subscription: { status: "past_due", recurring_cents: 6000, bill_interval: "month" } });
  assert.equal(M.statusOf(r).key, "late");
  assert.equal(M.issueOf(r).kicker, "Payment failed");
  assert.equal(M.issueOf(r).costCents, 6000);
});

test("6. a yearly plan is shown per month, and no subscription is unknown, not zero", () => {
  assert.equal(M.monthlyCents(row({ subscription: { status: "active", recurring_cents: 60000, bill_interval: "year" } })), 5000);
  assert.equal(M.monthlyCents(row({ subscription: null })), null);
});

test("7. weekly bookings: counted back from now, empty weeks kept, cancelled left out", () => {
  const w = M.weeklyBookings([
    { created_at: daysAgo(1), status: "confirmed" },
    { created_at: daysAgo(3), status: "completed" },
    { created_at: daysAgo(2), status: "cancelled" },
    { created_at: daysAgo(15), status: "confirmed" },
    { created_at: daysAgo(200), status: "confirmed" },
  ], 12, NOW);
  assert.equal(w.length, 12);
  assert.equal(w[11], 2, "the last seven days");
  assert.equal(w[9], 1, "two weeks back");
  assert.equal(w[10], 0, "an empty week stays in the series");
  assert.equal(w.reduce((a, b) => a + b, 0), 3, "cancelled and out-of-range are not counted");
});

test("8. money paid to us: paid invoices only, and unread is null", () => {
  assert.equal(M.paidToUs([{ status: "paid", amount_cents: 6000 }, { status: "open", amount_cents: 6000 }, { status: "paid", amount_cents: 6000 }]), 12000);
  assert.equal(M.paidToUs(undefined), null);
  assert.equal(M.paidToUs([]), 0);
});

test("9. filters: test accounts only under Everyone and Test accounts", () => {
  const rows = [row({ id: "a" }), row({ id: "t", is_demo: true, bookings_total: 0, days_since_booking: null, setup_inputs: { counts: {}, settings: {}, business: {} } })];
  const n = (k) => rows.filter(M.FILTERS.find((f) => f[0] === k)[2]).length;
  assert.equal(n("all"), 2);
  assert.equal(n("test"), 1);
  assert.equal(n("setup"), 0, "a fixture must not appear under Setting up");
  assert.equal(n("live"), 1);
});

test("10. default order: needs-you first, dearest first, real before test", () => {
  const rows = [
    row({ id: "fine" }),
    row({ id: "cheap", days_since_booking: 40, subscription: { status: "active", recurring_cents: 3000, bill_interval: "month" } }),
    row({ id: "dear", days_since_booking: 40, subscription: { status: "active", recurring_cents: 9000, bill_interval: "month" } }),
    row({ id: "test", is_demo: true }),
  ];
  assert.deepEqual(M.sortRows(rows).map((r) => r.id), ["dear", "cheap", "fine", "test"]);
});
