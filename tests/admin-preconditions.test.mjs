// ROADMAP 9.12 — no back-office line whose precondition is false.
//
// The four named cases ARE the criterion: no "Ring them" without a phone
// number, no "Money at risk" on an account paying nothing, no "Booking · last
// one …" on an account with 0 customers (or 0 live bookings), and real
// detailers before fixtures. The fifth — no duplicate "What to look at, in
// order" card — is a deletion, held here by reading the screen as text.
//
// Run: node --test tests/admin-preconditions.test.mjs   (credential-free)
// Sabotage: BREAK=ring|money|line|order node tests/admin-preconditions.test.mjs
//   (an env var, not a flag — `node --test` swallows flags; gotchas 104).
//   Each one reinstates the ORIGINAL defect in a copy of the production
//   function and must turn the matching assertion red.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as real from "../app/src/lib/attention.js";

const BREAK = process.env.BREAK || "";
const ago = () => "yesterday";

// The originals, verbatim in behavior, so a sabotage reproduces the defect
// rather than a proxy for it.
const L = {
  ...real,
  ...(BREAK === "ring" && { actionFor: (why) => real.actionFor(why, { phone: "x" }) }),
  ...(BREAK === "money" && { splitAtRisk: (items) => ({ atRisk: items, notPaying: [] }) }),
  ...(BREAK === "line" && {
    activityLine: (r, a) => `${r.bookings_total ? "Booking" : "No bookings"} · last one ${a(r.last_booking_at)}`,
  }),
  ...(BREAK === "order" && { realFirst: (rows) => [...rows] }),
};
if (BREAK) console.log(`SABOTAGE ON: ${BREAK} — the matching test must fail`);

const REASONS = [
  ["canceling at the end of the term"],
  ["has never taken a booking"],
  ["no booking in 30 days"],
  ["setup stopped at 2 of 11"],
];

test("no advice says ring or phone when there is no phone number", () => {
  let asked = 0;
  for (const why of REASONS) {
    for (const email of ["a@b.c", null]) {
      const say = L.actionFor(why, { phone: null, email });
      asked++;
      assert.ok(say, `no advice at all for ${why}`);
      assert.doesNotMatch(say, /\bring\b|\bphone\b(?! number or email)/i, `"${say}" for ${why}, email=${email}`);
      if (!email) assert.doesNotMatch(say, /\bemail them\b/i, `"${say}" offers email with none on file`);
    }
  }
  assert.equal(asked, 8);
});

test("with a phone number, the ring advice is still given", () => {
  // The other half: a check that only asks the first could be passed by
  // deleting every phone call from the screen.
  const say = L.actionFor(["has never taken a booking"], { phone: "555-0100", email: null });
  assert.match(say, /Ring them/);
  assert.equal(real.phoneOf({ setup_inputs: { business: { contact_phone: " 555 " } } }), "555");
  assert.equal(real.phoneOf({ setup_inputs: { business: { contact_phone: "" } } }), null);
});

test("an account paying nothing is never under Money at risk", () => {
  const items = [
    { id: "a", cents: 0, label: "Not set up yet" },
    { id: "b", cents: 4900, label: "Payment failed" },
    { id: "c", cents: null, label: "Not set up yet" },
  ];
  const { atRisk, notPaying } = L.splitAtRisk(items);
  assert.deepEqual(atRisk.map((r) => r.id), ["b"]);
  assert.deepEqual(notPaying.map((r) => r.id), ["a", "c"]);
});

test("no 'Booking · last one' without customers and live bookings", () => {
  const cases = [
    [{ bookings_total: 0, customers: 0, last_booking_at: "2026-10-09" }, "No bookings yet"],  // cancelled-only (ICS Phoenix)
    [{ bookings_total: 1, customers: 0, last_booking_at: "2026-10-09" }, "1 booking, no customers on file"], // Roles Test
    [{ bookings_total: 4, customers: 1, last_booking_at: "2026-10-09" }, "Booking · last one yesterday"],
  ];
  for (const [r, want] of cases) assert.equal(L.activityLine(r, ago), want, JSON.stringify(r));
});

test("real detailers list before fixtures, order otherwise kept", () => {
  const rows = [{ id: 1, is_demo: true }, { id: 2, is_demo: false }, { id: 3, is_demo: true }, { id: 4 }];
  assert.deepEqual(L.realFirst(rows).map((r) => r.id), [2, 4, 1, 3]);
});

test("the screen uses these, and the duplicate card is gone", () => {
  const src = readFileSync(new URL("../app/src/admin/AdminPage.jsx", import.meta.url), "utf8");
  for (const use of ["actionFor(why, { phone", "activityLine(r, ago)", "realFirst(rows)", "splitAtRisk(billingRows)", "tel:${phone}"]) {
    assert.ok(src.includes(use), `AdminPage.jsx no longer calls ${use}`);
  }
  assert.ok(!src.includes("<h2>What to look at, in order</h2>"), "the duplicate card is back");
  assert.ok(!/const WHAT_TO_DO/.test(src), "a second advice table is back in the screen");
});
