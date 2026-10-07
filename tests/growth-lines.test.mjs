// ROADMAP 9.2 — THE FIVE QUESTIONS ON THE GROWTH TAB SAY ONLY WHAT WAS WORKED OUT.
//
//   node --test tests/growth-lines.test.mjs
//
// Credential-free, no browser, no database. Runs app/src/lib/growthLines.js and
// the `bookability()` in app/src/lib/adminInsight.js, and reads
// app/src/admin/AdminPage.jsx as text for the one thing only the screen can say.
//
// ANDREW'S RULING, 2026-10-06: keep the five questions, fix the three faults
// inside them, do not build the stages (docs/9-2c-stages-proposal-2026-10-06.md).
// The three faults, and the check that would have caught each:
//   1. the "cannot take a booking" line listed three possible reasons and threw
//      away the one `bookability()` had worked out for the account (§ 2) — and
//      printing it exposed a worse one underneath, § 1;
//   2. the setup line claimed every name "signed up and then stopped" without
//      looking at when they signed up (§ 3);
//   3. a suspended account was on lines Today deliberately leaves it off (§ 4).
//
// BREAK IT ON PURPOSE: § 7 rebuilds the two modules with ONE fix put back at a
// time and asserts the matching check then reports the fault.

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

import { STUCK, growthLines, signedUpNote } from "../app/src/lib/growthLines.js";
import { bookability } from "../app/src/lib/adminInsight.js";
import { SETUP_FLOOR } from "../app/src/lib/attention.js";

const NOW = new Date("2026-10-06T12:00:00Z");
const daysAgo = (n) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

// What the screen hands growthLines: the same shape `bookabilityOf` in
// AdminPage.jsx builds (§ 6 reads the screen to confirm it still does).
const bookabilityOf = (r) => bookability({
  counts: r?.setup_inputs?.counts,
  business: { status: r?.status },
  settings: { booking_mode: r?.booking_mode },
});
const ctx = { bookabilityOf, now: NOW };

// A row as the LIST payload builds it: `hoursRows`, never `hoursOpen`.
const OPEN_HOURS = [{ open_time: "09:00" }];
const full = {
  counts: { services: 3, promos: 0, reviews: 0, plans: 0, hoursRows: OPEN_HOURS },
  branding: { primary_color: "#112233" },
  settings: { pay_cash: true, vehicle_sizes: null, faqs: null },
  business: { contact_phone: "555", contact_email: "a@b.c" },
};
const row = (over = {}) => ({
  name: "Healthy Detail", status: "active", booking_mode: "reserve", is_demo: false,
  created_at: daysAgo(30), bookings_total: 5, days_since_booking: 3, site_url: "https://x.example",
  setup_inputs: full, ...over,
});
const withCounts = (counts) => ({ ...full, counts: { ...full.counts, ...counts } });
const linesOf = (rows) => Object.fromEntries(growthLines(rows, ctx).map((s) => [s.key, s]));
const namesOn = (rows, key) => (linesOf(rows)[key]?.failing ?? []).map((f) => f.name);

test("1 · bookability reads the open days the LIST payload actually carries", () => {
  // The list row has `hoursRows`; only the detail payload has the boolean.
  assert.deepEqual(bookability({ counts: { services: 3, hoursRows: OPEN_HOURS } }).reasons, []);
  assert.deepEqual(bookability({ counts: { services: 0, hoursRows: OPEN_HOURS } }).reasons, ["no active services"],
    "a business with real opening hours is NOT told it has no open days");
  assert.deepEqual(bookability({ counts: { services: 3, hoursRows: [] } }).reasons, ["no open days"]);
  assert.deepEqual(bookability({ counts: { services: 3, hoursRows: [{ open_time: null }] } }).reasons, ["no open days"]);
  // The detail payload's boolean still works, and wins when both are there.
  assert.deepEqual(bookability({ counts: { services: 3, hoursOpen: true } }).reasons, []);
  assert.deepEqual(bookability({ counts: { services: 3, hoursOpen: false } }).reasons, ["no open days"]);
  assert.deepEqual(bookability({ counts: { services: 3, hoursOpen: true, hoursRows: [] } }).reasons, []);
  // Neither present is "not read", never "closed".
  assert.deepEqual(bookability({ counts: { services: 3 } }).reasons, ["open days not read"]);
  assert.deepEqual(bookability({}).reasons, ["no active services", "open days not read"]);
  assert.equal(bookability({ business: { status: "paused" }, counts: { services: 3, hoursRows: OPEN_HOURS } }).reasons[0], "suspended");
});

test("2 · the 'cannot take a booking' line shows each account's OWN reason", () => {
  const rows = [
    row({ name: "No Services", setup_inputs: withCounts({ services: 0 }) }),
    row({ name: "No Days", setup_inputs: withCounts({ hoursRows: [] }) }),
    row({ name: "Both", setup_inputs: withCounts({ services: 0, hoursRows: [] }) }),
    row({ name: "Switched Off", status: "paused" }),
    row({ name: "Fine" }),
  ];
  const open = linesOf(rows).open;
  assert.deepEqual(open.failing, [
    { name: "No Services", note: "no active services" },
    { name: "No Days", note: "no open days" },
    { name: "Both", note: "no active services, no open days" },
    { name: "Switched Off", note: "suspended" },
  ]);
  // The advice no longer names all three possibilities, and no longer says
  // "neither of you finds out" (untrue of a page we suspended ourselves).
  assert.ok(!/Nothing to sell|no open days|suspended|neither of you/i.test(open.todo), open.todo);
  assert.match(open.todo, /beside each name/);
});

test("3 · the setup line says how long ago they signed up, and no longer says they stopped", () => {
  const stalled = withCounts({ services: 0, hoursRows: [] });
  const bare = { ...stalled, branding: {}, settings: {}, business: {} };
  const rows = [
    row({ name: "Today", created_at: daysAgo(0), setup_inputs: bare }),
    row({ name: "Yesterday", created_at: daysAgo(1), setup_inputs: bare }),
    row({ name: "Nine", created_at: daysAgo(9), setup_inputs: bare }),
    row({ name: "No Date", created_at: null, setup_inputs: bare }),
    row({ name: "Finished" }),
  ];
  const setup = linesOf(rows).setup;
  assert.deepEqual(setup.failing, [
    { name: "Today", note: "signed up today" },
    { name: "Yesterday", note: "signed up yesterday" },
    { name: "Nine", note: "signed up 9 days ago" },
    { name: "No Date", note: null },
  ]);
  assert.ok(!/stopped|signed up/i.test(setup.todo), "the claim nothing checked is gone: " + setup.todo);
  assert.match(setup.todo, new RegExp(`Fewer than ${SETUP_FLOOR} of the steps are done`));
  assert.equal(signedUpNote({ created_at: daysAgo(-3) }, NOW), null, "a signup date in the future is not worded");
  assert.equal(signedUpNote({}, NOW), null);
});

test("4 · a suspended account is on the 'cannot take a booking' line ONCE and off the lines Today leaves it off", () => {
  const paused = row({ name: "Paused", status: "paused", bookings_total: 0, days_since_booking: null });
  const pausedQuiet = row({ name: "Paused Quiet", status: "paused", bookings_total: 4, days_since_booking: 90 });
  const live = row({ name: "Live", bookings_total: 0, days_since_booking: null });
  const liveQuiet = row({ name: "Live Quiet", bookings_total: 4, days_since_booking: 90 });
  const rows = [paused, pausedQuiet, live, liveQuiet];
  assert.deepEqual(namesOn(rows, "open"), ["Paused", "Paused Quiet"]);
  assert.deepEqual(namesOn(rows, "first"), ["Live"], "never booked: not the suspended one");
  assert.deepEqual(namesOn(rows, "quiet"), ["Live Quiet"], "gone quiet: not the suspended one");
});

test("5 · THE DECISION STANDS: a name can be on two lines, each question asked of everybody", () => {
  const newbie = row({ name: "Brand New", created_at: daysAgo(0), bookings_total: 0, days_since_booking: null, site_url: null,
    setup_inputs: { counts: { services: 0, hoursRows: [] }, branding: {}, settings: {}, business: {} } });
  const lines = growthLines([newbie], ctx).map((s) => s.key);
  assert.deepEqual(lines, ["setup", "open", "first", "site"], "setup, cannot-book, never-booked and no-website at once, and NOT quiet");
  // Booking steadily with setup half done is still counted: no funnel hides them.
  const working = row({ name: "Working", bookings_total: 8, days_since_booking: 2,
    setup_inputs: { counts: { services: 2, hoursRows: OPEN_HOURS }, branding: {}, settings: {}, business: {} } });
  assert.deepEqual(namesOn([working], "setup"), ["Working"]);
  assert.deepEqual(namesOn([working], "first"), []);
  // And a healthy detailer is on no line.
  assert.deepEqual(growthLines([row()], ctx), []);
  // The five keys, in order.
  assert.deepEqual(STUCK.map((s) => s[0]), ["setup", "open", "first", "quiet", "site"]);
});

test("6 · the screen: no second copy of the questions, headlines for every key, notes drawn, bookabilityOf handed in", () => {
  const page = readFileSync("app/src/admin/AdminPage.jsx", "utf8").replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/const STUCK\b/.test(page), "the questions live in lib/growthLines.js and nowhere else");
  assert.match(page, /growthLines\(live, \{ bookabilityOf, now: new Date\(\) \}\)/);
  for (const [key] of STUCK) assert.match(page, new RegExp(`\\b${key}: \\(n\\) =>`), `a headline for "${key}"`);
  assert.match(page, /f\.note \? `\$\{f\.name\} \(\$\{f\.note\}\)` : f\.name/, "the note is drawn beside the name");
  assert.match(page, /const bookabilityOf[\s\S]{0,260}status[\s\S]{0,120}booking_mode/, "the helper still names both fields it reads");
});

// ---------------------------------------------------------------- sabotage
const dir = mkdtempSync(path.join(tmpdir(), "growth-sab-"));
const lib = (n) => path.resolve(`app/src/lib/${n}`);
const abs = (n) => JSON.stringify(pathToFileURL(lib(n)).href);
async function variant(label, file, from, to) {
  let src = readFileSync(lib(file), "utf8").replace(/\r\n/g, "\n");
  assert.equal(src.split(from).length - 1, 1, `${label}: the text to put back is not unique or not there`);
  src = src.replace(from, to);
  for (const n of ["setup.js", "attention.js", "adminInsight.js"]) src = src.replace(`"./${n}"`, abs(n));
  const f = path.join(dir, `${label}.mjs`);
  writeFileSync(f, src);
  return import(pathToFileURL(f).href);
}
const reportsFault = {
  async menuInsteadOfReason(m) {
    const r = m.growthLines([row({ name: "N", setup_inputs: withCounts({ services: 0 }) })], ctx).find((s) => s.key === "open");
    return r.failing[0].note === null;
  },
  async stoppedClaimBack(m) {
    const bare = { counts: { services: 0, hoursRows: [] }, branding: {}, settings: {}, business: {} };
    return /signed up and then stopped/.test(m.growthLines([row({ setup_inputs: bare })], ctx).find((s) => s.key === "setup").todo);
  },
  async noSignupAge(m) {
    const bare = { counts: { services: 0, hoursRows: [] }, branding: {}, settings: {}, business: {} };
    return m.growthLines([row({ created_at: daysAgo(9), setup_inputs: bare })], ctx).find((s) => s.key === "setup").failing[0].note === null;
  },
  async pausedOnFirst(m) {
    return m.growthLines([row({ status: "paused", bookings_total: 0, days_since_booking: null })], ctx).some((s) => s.key === "first");
  },
  async pausedOnQuiet(m) {
    return m.growthLines([row({ status: "paused", bookings_total: 4, days_since_booking: 90 })], ctx).some((s) => s.key === "quiet");
  },
};
const SAB = [
  ["menuInsteadOfReason", "growthLines.js", "(r, { bookabilityOf }) => bookabilityOf(r).reasons.join(\", \") || null,", "() => null,"],
  ["stoppedClaimBack", "growthLines.js", "Ring them and finish it on the phone.`", "Ring them and finish it on the phone. Every one of these signed up and then stopped.`"],
  ["noSignupAge", "growthLines.js", "(r, { now }) => signedUpNote(r, now),", "() => null,"],
  ["pausedOnFirst", "growthLines.js", "(r) => suspended(r) || (r.bookings_total ?? 0) > 0,", "(r) => (r.bookings_total ?? 0) > 0,"],
  ["pausedOnQuiet", "growthLines.js", "(r) => suspended(r) || (r.bookings_total ?? 0) === 0 ||", "(r) => (r.bookings_total ?? 0) === 0 ||"],
];

test("7 · SABOTAGE — each fix put back is seen (control first), and so is the old open-days read", async () => {
  for (const name of Object.keys(reportsFault)) {
    assert.equal(await reportsFault[name]({ growthLines }), false, `control: the real code must not show the fault "${name}"`);
  }
  for (const [name, file, from, to] of SAB) {
    assert.equal(await reportsFault[name](await variant(name, file, from, to)), true, `the fault came back and nothing saw it: ${name}`);
  }
  // The open-days read: with the list rows' `hoursRows` ignored, a business with real hours is called closed.
  const old = await variant("hours", "adminInsight.js", "counts.hoursRows.some((h) => h?.open_time)", "false");
  assert.deepEqual(old.bookability({ counts: { services: 3, hoursRows: OPEN_HOURS } }).reasons, ["no open days"],
    "the old read is reproduced by putting it back");
  assert.deepEqual(bookability({ counts: { services: 3, hoursRows: OPEN_HOURS } }).reasons, []);
});
