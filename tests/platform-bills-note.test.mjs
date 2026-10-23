// ROADMAP 98.16 — the Platform bills profit row says how many bills are not
// entered, beside the figure. Credential-free, no browser: it imports the real
// rule (monthsumNote) and the real month shape (keptOf) and runs them, fed by
// the server's own reduction (platformNet) so the inputs are what the screen
// will really be sent.
//
//   node --test tests/platform-bills-note.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { keptOf, monthsumNote } from "../app/src/lib/officeMoney.js";
import { platformNet } from "../supabase/functions/_shared/platformNet.js";

// The server's own reduction makes the answers, so the test asks what the
// profit row does with the shape it will really be sent.
const net = (inv, costs) => platformNet({
  invoiceRows: inv.map((c) => ({ amount_cents: c })), costRows: costs, periodMonth: "2026-10-01",
});
const bill = (category, amount_cents) => ({ amount_cents, category });
const noteOf = (inv, costs) => monthsumNote(keptOf(net(inv, costs)));

test("1. partly entered months name the missing count beside the figure, singular and plural", () => {
  assert.equal(noteOf([4000], [bill("hosting", 1900)]), "3 bills not entered");
  assert.equal(noteOf([4000], [bill("hosting", 1900), bill("email", 2000)]), "2 bills not entered");
  assert.equal(noteOf([4000], [bill("hosting", 1900), bill("email", 2000), bill("domain", 1299)]), "1 bill not entered");
});

test("2. the count is by category: repeated rows do not complete a missing kind, Other never counts as missing", () => {
  assert.equal(noteOf([4000], [bill("hosting", 1900), bill("hosting", 550)]), "3 bills not entered");
  assert.equal(noteOf([4000], [bill("other", 700)]), "4 bills not entered");
  assert.equal(noteOf([4000], [bill("hosting", 1900), bill("email", 2000), bill("domain", 1299), bill("other", 700)]), "1 bill not entered");
});

test("3. a $0 bill counts as entered: zero is an answer, not a gap", () => {
  assert.equal(noteOf([4000], [bill("hosting", 1900), bill("email", 2000), bill("domain", 1299), bill("database", 0)]), null);
  assert.equal(noteOf([4000], [bill("hosting", 1900), bill("database", 0)]), "2 bills not entered");
});

test("4. loss, profit and break-even partials all carry the count", () => {
  assert.match(noteOf([4000], [bill("hosting", 1900), bill("email", 2000), bill("domain", 1299)]), /bill not entered/);
  const loss = keptOf(net([4000], [bill("hosting", 1900), bill("email", 2000), bill("domain", 1299)]));
  assert.ok(loss.kept < 0, "fixture month is a loss, the note still applies");
  const profit = keptOf(net([20000], [bill("hosting", 1900)]));
  assert.ok(profit.kept > 0, "this month is a profit, the note still applies");
  assert.equal(monthsumNote(profit), "3 bills not entered");
  const even = keptOf(net([1900], [bill("hosting", 1900)]));
  assert.equal(even.kept, 0, "break-even is a known figure, not an empty month");
  assert.equal(monthsumNote(even), "3 bills not entered");
});

test("5. complete months get no note, empty months keep Not entered and failed reads get nothing", () => {
  const full = keptOf(net([4000], [bill("hosting", 1900), bill("database", 800), bill("email", 2000), bill("domain", 1299)]));
  assert.equal(monthsumNote(full), null);
  const fullOther = keptOf(net([4000], [bill("hosting", 1900), bill("database", 800), bill("email", 2000), bill("domain", 1299), bill("other", 100)]));
  assert.equal(monthsumNote(fullOther), null);
  const empty = keptOf(net([10000], []));
  assert.equal(empty.kept, null, "no bill typed in means no profit figure (9.14)");
  assert.deepEqual(empty.missing, ["hosting", "database", "email", "domain"]);
  assert.equal(monthsumNote(empty), null, "the empty line stays Not entered, it never takes this note");
  assert.equal(monthsumNote({ failed: true }), null);
  assert.equal(monthsumNote(null), null);
});
