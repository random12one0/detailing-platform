// ROADMAP 99.9 — the server's copy of the phone rule has a committed test.
//
//   node --test tests/create-booking-phone.test.mjs
//
// Credential-free, no dev server, no browser, no Deno, no database.
// Run from the repo root: test 3's fixture reads the handler by relative path.
//
// WHY THIS EXISTS: `phoneComplete` lives in TWO places — `app/src/book/core.js`
// (the client, held by 9 assertions in `tests/booking-core.test.mjs`) and
// `supabase/functions/create-booking/index.ts` (the server, a local duplicate
// because edge functions cannot import from `app/src`). Until this file, only
// the client copy had a committed test: the server copy was exercised by a
// throwaway probe whose script was never committed (`receipts/99.8-phone.json`),
// so an edit to either copy went red nowhere and the two rules could drift
// apart silently.
//
// WHAT IT DOES: it reads the server file as text, extracts the server's OWN
// `phoneComplete` definition, evaluates exactly that source, and runs the
// 99.8 cases against it — a 7-digit phone and three more short forms must be
// refused (the rule returns false, and the file wires that to the 400), while
// a full 10-digit phone and a long +44 number must pass. It then runs the same
// cases against the client copy and asserts both copies agree, so a drift in
// EITHER direction goes red here.
//
// WHY EXTRACTION AND NOT AN IMPORT: the handler imports `jsr:` / `npm:`
// Deno specifiers through `_shared/db.ts`, which Node cannot resolve, and
// there is no Deno on this machine (`tests/availability-honesty.test.mjs`
// documents the same wall). The rule body itself is plain JS apart from its
// `(v: unknown)` annotation, so the test strips the annotation and evaluates
// the server's own characters — a re-typed duplicate in this file would test
// nothing, which is the failure this item is about.
//
// RED-FIRST: with the blank-only server rule restored (the `phoneComplete`
// refusal deleted, so any non-blank phone books) this suite fails on the four
// short-form cases. That sabotage was run before committing; see the item.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { phoneComplete as clientPhoneComplete } from "../app/src/book/core.js";

const SERVER = "supabase/functions/create-booking/index.ts";
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

// The server's own rule, extracted from the committed handler source and
// evaluated verbatim (minus the one TS annotation Node cannot parse).
function serverPhoneComplete() {
  const src = read(SERVER);
  const start = src.indexOf("const phoneComplete");
  assert.ok(start >= 0, `${SERVER} no longer defines phoneComplete — the server copy of the rule is gone`);
  const end = src.indexOf("\n};", start);
  assert.ok(end > start, `${SERVER} holds a phoneComplete this test cannot extract — read it by hand`);
  const js = src.slice(start, end + "\n}".length).replace("(v: unknown)", "(v)");
  assert.match(js, /n\.length === 10/, "extracted server rule does not count to 10 — wrong block extracted?");
  return new Function(`${js}; return phoneComplete;`)();
}

// [input, complete?] — the 99.8 contract, both halves.
const CASES = [
  ["(555) 012-3456", true], // full 10-digit books
  ["+44 7700 900077", true], // long +44 books
  ["(555) 012-3", false], // 7 digits refused
  ["5", false], // 1 digit refused
  ["+44 770", false], // short +44 refused
  ["25550123456", false], // 11 digits without a leading 1 refused
];

test("0 — the check has a subject: the server file carries the rule and the 400", () => {
  const src = read(SERVER);
  assert.ok(src.length > 2000, `${SERVER} is too small to be the real handler (${src.length} bytes)`);
  assert.ok(src.includes("const phoneComplete"), "server rule missing");
  assert.match(
    src,
    /if\s*\(!phoneComplete\(body\.customer_phone\)\)\s*return json\(\{ error: "Customer phone number is incomplete" \}, 400\)/,
    "the server no longer refuses an incomplete phone with the 400 — short numbers book",
  );
});

test("1 — the server rule refuses short phones and takes full ones", () => {
  const server = serverPhoneComplete();
  for (const [input, want] of CASES) {
    assert.equal(
      server(input), want,
      `server phoneComplete(${JSON.stringify(input)}) is ${!want} — expected ${want}`,
    );
  }
});

test("2 — the two copies agree on every case, so neither can drift silently", () => {
  const server = serverPhoneComplete();
  for (const [input] of CASES) {
    assert.equal(
      server(input), clientPhoneComplete(input),
      `copies disagree on ${JSON.stringify(input)}: server=${server(input)} client=${clientPhoneComplete(input)}`,
    );
  }
});

// Tests 0-2 never call the handler: a commented-out refusal still matches
// test 0's regex and leaves the extracted rule intact. This one runs the REAL
// handler (imports swapped for stand-ins, no network) and reads its response,
// so the refusal has to actually execute. Red-first: commenting out the
// `phoneComplete` line in the handler turns the four short cases into 200s.
test("3 — the create-booking handler itself answers 400 to short phones and books full ones", async () => {
  const { bookingFixture, fixtureBooking } = await import("../scripts/lib/bookingConsentFixture.mjs");
  let refused = 0, booked = 0;
  for (const [input, complete] of CASES) {
    const f = bookingFixture();
    const res = await f.book({ ...fixtureBooking, customer_phone: input });
    const label = `handler on ${JSON.stringify(input)}: ${res.status} ${JSON.stringify(res.data)}`;
    if (complete) {
      assert.equal(res.status, 200, label);
      assert.equal(res.data?.success, true, label);
      assert.equal(f.rows.bookings.length, 1, `${label} — wrote ${f.rows.bookings.length} bookings, expected 1`);
      booked++;
    } else {
      assert.equal(res.status, 400, label);
      assert.equal(res.data?.error, "Customer phone number is incomplete", label);
      assert.equal(f.operations.length, 0, `${label} — touched the database ${f.operations.length} times before refusing`);
      refused++;
    }
  }
  // Declared, not discovered: a population that shrank would otherwise pass.
  assert.deepEqual({ refused, booked }, { refused: 4, booked: 2 });
});
