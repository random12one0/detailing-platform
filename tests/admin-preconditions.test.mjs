// ROADMAP 9.12 — no back-office line whose precondition is false.
//
// The four named cases ARE the criterion: no "Ring them" without a phone
// number, no "Money at risk" on an account paying nothing, no "Booking · last
// one …" on an account with 0 customers (or 0 live bookings), and real
// detailers before fixtures. The fifth — no duplicate "What to look at, in
// order" card — is a deletion, held here by reading the back office's source
// as text (a lint-style guard on purpose: its subject IS the text).
//
// Run: node --test tests/admin-preconditions.test.mjs   (credential-free)
// Sabotage: BREAK=ring|money|line|order node tests/admin-preconditions.test.mjs
//   and, for the back office (99.3b-ii), BREAK=bare-tel|text-all|demo-sort|card:
//   each wraps the REAL officeDetailers function (or, for card, plants the
//   duplicate heading in the scanned office text) and must turn its test red.
//   (an env var, not a flag — `node --test` swallows flags; gotchas 104).
//   Each one reinstates the ORIGINAL defect in a copy of the production
//   function and must turn the matching assertion red.

import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import * as real from "../app/src/lib/attention.js";
import * as office from "../app/src/lib/officeDetailers.js";

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
// The back office's three, wrapped only when a sabotage asks: each break puts
// back one defect around the REAL function rather than a copy of it.
const { contactOf, issueOf, sortRows } = {
  ...office,
  ...(BREAK === "bare-tel" && { contactOf: (r) => ({ ...office.contactOf(r), tel: `tel:${office.contactOf(r).phone ?? ""}` }) }),
  ...(BREAK === "text-all" && { issueOf: (r) => { const i = office.issueOf(r); return i && { ...i, kind: "sms", act: "Text them" }; } }),
  ...(BREAK === "demo-sort" && { sortRows: (rows, key) => office.sortRows(rows.map((r) => ({ ...r, is_demo: false })), key) }),
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

// RE-HOMED 2026-10-24 (ROADMAP 99.3b-ii): AdminPage.jsx was deleted by 99.3b-i.
// The new back office decides every advice line and every reach button in ONE
// place, lib/officeDetailers.js (issueOf + contactOf + sortRows), so these RUN
// those functions with the must-work and must-refuse rows.
// `activityLine` and `splitAtRisk` have no caller now: the "Booking · last one"
// line and the "Money at risk" section they guarded are not drawn by the new
// office (approved mockup), so they are unit-tested above and nothing more.
const SI = (business = {}) => ({ counts: { services: 0, hoursRows: [] }, branding: {}, settings: {}, business });
const neverBooked = (over = {}) => ({ id: 9, name: "N", status: "active", bookings_total: 0, site_url: "x", is_demo: false, setup_inputs: SI(), ...over });

test("office: no Call button and no ring advice without a phone number", () => {
  const none = contactOf(neverBooked());
  assert.equal(none.tel, null);
  assert.equal(none.sms, null);
  const mailOnly = issueOf(neverBooked({ owner_email: "a@b.c" }));
  assert.equal(mailOnly.kind, "mail");
  assert.equal(mailOnly.act, "Email them");
  assert.doesNotMatch(mailOnly.text, /\bring\b|\bphone\b(?! number or email)/i, mailOnly.text);
  const nobody = issueOf(neverBooked());
  assert.equal(nobody.kind, null, "no button when there is nobody to reach");
  assert.doesNotMatch(nobody.text, /\bring\b|\bemail them\b/i, nobody.text);
});

test("office: with a phone number the Call/Text buttons and the ring advice are given", () => {
  const r = neverBooked({ setup_inputs: SI({ contact_phone: "(555) 010-0100" }) });
  assert.equal(contactOf(r).tel, "tel:5550100100");
  const say = issueOf(r);
  assert.equal(say.kind, "sms");
  assert.match(say.text, /\bring\b|\bphone\b/i, say.text);
});

test("office: real detailers before test accounts, in every sort that ranks", () => {
  const rows = [neverBooked({ id: 1, is_demo: true, name: "a", revenue_month: 90000 }), neverBooked({ id: 2, name: "b" }), neverBooked({ id: 3, is_demo: true, name: "c", revenue_month: 80000 }), neverBooked({ id: 4, name: "d" })];
  for (const key of ["need", "health", "earned"]) {
    const ids = sortRows(rows, key).map((r) => r.id);
    assert.deepEqual(ids.slice(0, 2).sort(), [2, 4], `${key}: ${ids}`);
  }
});

// THE FIFTH: no duplicate "What to look at, in order" card and no second advice
// table anywhere in the back office. Lint-style on purpose (a deletion has no
// behavior to call); a discovery floor stops a moved folder reading as clean.
test("office: the duplicate card and a second advice table are gone", () => {
  const files = [
    ...readdirSync("app/src/admin/office", { recursive: true }).filter((p) => /\.jsx?$/.test(p)).map((p) => path.join("app/src/admin/office", String(p))),
    ...readdirSync("app/src/lib").filter((p) => /^office.*\.js$/.test(p)).map((p) => path.join("app/src/lib", p)),
  ];
  let text = files.map((p) => readFileSync(p, "utf8")).join("\n");
  assert.ok(files.length >= 20 && text.includes("export default function OfficePage"), `office source found (${files.length} files)`);
  if (BREAK === "card") text += "\n<h2>What to look at, in order</h2>";
  assert.ok(!text.includes("What to look at, in order"), "the duplicate card is back");
  assert.ok(!/const WHAT_TO_DO\b/.test(text), "a second advice table is back in the office");
});
