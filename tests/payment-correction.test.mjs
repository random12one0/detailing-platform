// ROADMAP 4.7 — THE WAY BACK FROM A RECORDED PAYMENT, AND THE ONE WAY IT FAILS.
//
//   node --test tests/payment-correction.test.mjs
//   PAYMENT_BREAK=<case> node --test tests/payment-correction.test.mjs   (see BREAKS)
//
// Credential-free: four filesystem reads, no dev server, no browser, no `.env`.
//
// ---------------------------------------------------------------------------
// WHAT IT EXISTS TO CATCH, WHICH THE ITEM NAMES FOR IT
// ---------------------------------------------------------------------------
// 4.7's own "what failing looks like" is not a missing feature, it is **the
// obvious build**: a "correct the payment" control that re-opens
// `FinalizeModal`. That modal writes `payment_status` AND stamps
// `finalized_at` AND upserts the line items in one call, so the correction
// would be a second finalize — the job's audit trail would say it was
// finished twice and its charges would be rewritten under it.
//
// **AND THAT FAILURE IS INVISIBLE TO EVERY OTHER CHECK IN THIS REPO.** The
// screen looks right, the pill changes, the chase list updates, the totals
// move, Spanish renders, the console is clean. The only thing wrong is two
// extra fields in one payload and a timestamp nobody looks at. A browser
// sweep cannot see it; this reads the payload.
//
// ---------------------------------------------------------------------------
// WHAT IT CANNOT SEE — READ THIS BEFORE TRUSTING A GREEN
// ---------------------------------------------------------------------------
// It reads SOURCE TEXT. It can say that the correction sends one field, that
// it is offered only on a finalized job, that picking the current state offers
// nothing, that the two money-losing choices carry `--bad`, and that every
// English string it adds has a Spanish entry. It **cannot** say that the
// control is ever drawn, that a press writes, that the audit row lands, or
// that the chase list and the owed total actually move. Those are browser and
// database facts and the runs recorded under ROADMAP 4.7 are where they live.
// A green here is "the wiring is still as it was left".
//
// **IT IS AN ENV VAR AND NOT A `--break=` FLAG.** `node --test` keeps its own
// argv and runs this file in a CHILD process, so `process.argv` never carries
// a flag — `tests/confirm-questions.test.mjs` learned that by shipping five
// sabotages that all reported green. Each sabotage is applied to the TEXT this
// check reads, never to a file on disk, so a killed run cannot leave one
// behind in `app/src`.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const BREAKS = {
  refinalize: "the correction stamps finalized_at again, so it is a second Finalize",
  ungated: "the block is offered on a job that was never finalized",
  "no-refusal": "picking the state it is already in offers a button that writes a no-op",
  "no-spanish": "an English string loses its Spanish entry",
  "no-danger": "the two choices that can lose money stop carrying --bad",
  "no-audit": "the server stops logging a payment_status move, so a correction is invisible",
};
const BREAK = process.env.PAYMENT_BREAK || "";
if (BREAK && !BREAKS[BREAK]) throw new Error(`PAYMENT_BREAK must be one of: ${Object.keys(BREAKS).join(", ")}`);
if (BREAK) console.log(`SABOTAGE ON: ${BREAK} — ${BREAKS[BREAK]}. This run MUST go red.`);

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const DETAIL = "app/src/components/BookingDetail.jsx";
const SPANISH = "app/src/lib/strings/appEs.js";
const LOG = "supabase/functions/_shared/actionLog.ts";
const SERVER = "supabase/functions/update-booking/index.ts";

let detail = read(DETAIL);
let spanish = read(SPANISH);
let log = read(LOG);

if (BREAK === "refinalize") {
  detail = detail.replace("      payment_status: payWant,",
    "      payment_status: payWant,\n      finalized_at: new Date().toISOString(),");
}
if (BREAK === "ungated") {
  detail = detail.replace("const canCorrectPayment = !!booking.finalized_at;", "const canCorrectPayment = true;");
}
if (BREAK === "no-refusal") detail = detail.replace("{payWant !== booking.payment_status && (", "{true && (");
if (BREAK === "no-spanish") spanish = spanish.replace(/\n\s*"Yes, change it": "[^"]*",/, "");
if (BREAK === "no-danger") detail = detail.replace('payLosesMoney ? "btn danger" : "btn primary"', '"btn primary"');
if (BREAK === "no-audit") log = log.replace("if (!same(current.payment_status, after.payment_status)) {", "if (false) {");

// COMMENTS COME OUT BEFORE ANY ASSERTION READS CODE. This repo's comments quote
// its own code at length — the paragraph above this one names `finalized_at`
// four times — and `docs/gotchas.md` 75 is about exactly that fooling a
// matcher.
const code = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
  .replace(/^\s*\/\/.*$/gm, "");

// The correction's payload, pulled out once: from `const correctPayment` to the
// close of its `act(` call. Every claim about what it sends is made about THIS
// and not about the file, or `finalized_at` in FinalizeModal's own
// still-correct call would answer for it.
const payload = (src) => {
  const m = code(src).match(/const correctPayment[\s\S]*?\}\),\s*"[^"]*"\);/);
  return m ? m[0] : null;
};

test("0 · the check has subjects — the files were read and carry content", () => {
  for (const [p, src] of [[DETAIL, detail], [SPANISH, spanish], [LOG, log]]) {
    assert.ok(src.length > 1200, `${p} is too small to be the real file (${src.length} bytes)`);
  }
  assert.ok(payload(detail),
    "the correctPayment call is gone or unrecognizable, so nothing below is reading a payload");
});

test("1 · the correction sends ONE field, and is not a second Finalize", () => {
  const sends = payload(detail);
  assert.match(sends, /payment_status:\s*payWant/, "the correction no longer sends payment_status at all");
  // THE THREE THINGS FINALIZING DOES THAT CORRECTING MUST NOT.
  assert.doesNotMatch(sends, /finalized_at/,
    "the correction stamps finalized_at, so it IS a second Finalize: the audit trail will say this job "
    + "was finished twice and Finalize itself has moved under the record");
  assert.doesNotMatch(sends, /status:\s*["']completed["']/,
    "the correction re-writes the job's status, which is not its business");
  assert.doesNotMatch(sends, /booking_line_items|final_amount/,
    "the correction touches the charges, which the item forbids by name");
});

test("2 · it is offered only on a job that was actually finalized", () => {
  assert.match(code(detail), /const canCorrectPayment\s*=\s*!!\s*booking\.finalized_at\s*;/,
    "the correction block is no longer gated on finalized_at, so it is offered on jobs with no recorded "
    + "payment to correct, where Finalize is the right control and this is a second one beside it");
  assert.match(code(detail), /\{canCorrectPayment && \(/, "nothing renders behind canCorrectPayment any more");
  // AND IT DOES NOT REACH FOR THE MODAL. `setFinalizing` is legitimate
  // elsewhere in this file; what must not happen is the correction calling it.
  assert.doesNotMatch(payload(detail), /setFinalizing/,
    "the correction opens FinalizeModal, which is the item's named way to fail");
});

test("3 · picking the state it is already in offers nothing to press", () => {
  assert.match(code(detail), /\{payWant !== booking\.payment_status && \(/,
    "the answer is offered even when the pick has not moved, so a press can write a no-op and file an "
    + "audit row saying a payment changed from paid to paid");
  assert.match(code(detail), /const payWant = payPick \?\? booking\.payment_status;/,
    "payWant no longer falls back to the row, so after a successful write the control goes on offering "
    + "to change the payment to the value it already holds");
});

test("4 · the destructive-action pattern is all three of its parts", () => {
  const src = code(detail);
  assert.match(src, /const payLosesMoney = payWant === "paid" \|\| payWant === "waived";/,
    "the set of money-losing choices has changed shape — paid takes a job off the chase list and waived "
    + "gives the work away; unpaid and part paid both put it back on a list a person reads");
  assert.match(src, /confirmClassName=\{payLosesMoney \? "btn danger" : "btn primary"\}/,
    "the answer to the question no longer turns red for the two destructive choices, so `--bad` has "
    + "stopped meaning 'this destroys something' on this screen");
  assert.match(src, /className=\{payLosesMoney \? "btn danger" : "btn"\}/,
    "the control that opens the question no longer distinguishes the two");
  assert.match(src, /<details className="disclose">\s*<summary>\{t\("Changing what you recorded"\)\}<\/summary>/,
    "the correction is no longer behind a fold, so four ways to move the money sit open on every "
    + "finished job the detailer opens");
  assert.match(src, /chase list/, "the copy no longer says what each direction does to the chase list");
});

test("5 · every English string the block adds has a Spanish entry", () => {
  const keys = new Set([...spanish.matchAll(/^\s*"((?:[^"\\]|\\.)*)":/gm)].map((m) => m[1]));
  const STRINGS = [
    "Correct how it was paid",
    "Changing what you recorded",
    "Change it to {to}",
    "Change {job} from {from} to {to}?",
    "Yes, change it",
    "Leave it",
    "Payment updated.",
  ];
  for (const s of STRINGS) {
    assert.ok(code(detail).includes(`"${s}"`), `this wording is gone from the screen: "${s}"`);
    assert.ok(keys.has(s), `no Spanish entry for: "${s}"`);
  }
  // The question has to name the record AND both sides of the change, or it is
  // asking about nothing in particular.
  assert.match("Change {job} from {from} to {to}?", /\{job\}[\s\S]*\{from\}[\s\S]*\{to\}/);
  // And "Not yet" must not be the refusal here: it is the word on one of the
  // four destinations this same control offers.
  assert.match(code(detail), /cancelLabel=\{t\("Leave it"\)\}/,
    'the refusal fell back to ConfirmTap’s "Not yet", which is also one of the four states on the '
    + "control directly above it");
});

test("6 · the server still carries a payment move into the audit log", () => {
  assert.match(log, /if \(!same\(current\.payment_status, after\.payment_status\)\)/,
    "actionLog no longer notices a payment_status move, so a correction leaves no row and is less visible "
    + "than the waive it corrects, which is the done-when's whole second clause");
  assert.match(log, /payment\.waive/, "the waive action is gone from actionLog");
  assert.match(log, /payment\.set/, "the ordinary payment-change action is gone from actionLog");
  const server = read(SERVER);
  assert.match(server, /"payment_status"/, "payment_status is no longer an editable field on update-booking");
  assert.match(server, /recordActions\(supabase, member, bookingId, current, data\)/,
    "update-booking no longer calls recordActions on an ordinary update, so only deletes would be logged");
});
