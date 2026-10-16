// ROADMAP 97.8 — create-booking saved whatever total it worked out, even when
// the page had shown a different one (C-H3, C-L7).
//
//   node tests/price-shown-equals-charged.test.mjs
//   PRICE_BREAK=no-guard node tests/price-shown-equals-charged.test.mjs   # must go red
//
// Credential-free, no dev server, no browser, no network, no database. Run from
// the repo root (the handler fixture reads files by relative path). The break
// is an ENV VAR, not a flag: `node --test` swallows extra arguments (gotcha 104).
//
// THE CASE THE ENTRY NAMES, ON A FROZEN CLOCK: a 24-hour rush fee is re-checked
// at submit against the current clock (pricing.ts `whenContextFor`), so a
// customer who crosses the cut-off while typing is charged a fee the page never
// showed. Part 1 prices that with the REAL pricing.ts at two frozen instants,
// five minutes apart. Part 2 hands those two figures to the REAL create-booking
// handler (in-process, fake Supabase, `scripts/lib/bookingConsentFixture.mjs`).
// Canary, every run: the same mismatched post against the handler with the
// guard removed must SAVE — proving the fixture can see the defect at all.
import { writeFileSync } from "node:fs";
import { writeReceipt } from "../scripts/receipt.mjs";
import { bookingFixture, fixtureBooking } from "../scripts/lib/bookingConsentFixture.mjs";
import { computeQuote, matchPriceRules, whenContextFor } from "../supabase/functions/_shared/pricing.ts";
import { localDateTimeToInstant, weekdayOf } from "../supabase/functions/_shared/tz.ts";

const started_at = new Date().toISOString();
const BREAK = process.env.PRICE_BREAK || "";
if (BREAK && BREAK !== "no-guard") { console.error(`Unknown PRICE_BREAK=${BREAK}. Known: no-guard.`); process.exit(2); }
const handlerBreak = BREAK === "no-guard" ? "price-guard" : "";

let passed = 0, assertions = 0;
const failures = [], transcript = [];
const check = (name, ok, got = "") => {
  assertions++;
  const line = ok ? `  ok    ${name}` : `  FAIL  ${name}${got ? ` - got ${got}` : ""}`;
  console.log(line); transcript.push(line);
  if (ok) passed++; else failures.push(got ? `${name} - got ${got}` : name);
  return ok;
};
const writes = (f) => f.operations.filter((o) => o.operation !== "read").length;

console.log("1. the rush fee, on a frozen clock");
const TZ = "America/Los_Angeles", DATE = "2026-10-30", TIME = "10:00";
const RUSH = { kind: "lead_time", label: "Short notice", amount: 20, is_percent: false, within_hours: 24 };
const start = localDateTimeToInstant(TZ, DATE, TIME).getTime();
const priceAt = (nowMs) => {
  const real = Date.now;
  Date.now = () => nowMs;
  try {
    const when = whenContextFor(TZ, DATE, TIME, localDateTimeToInstant, weekdayOf);
    return computeQuote({
      services: [{ id: "service-a", name: "Full detail", price: 185, duration_minutes: 60 }], addOns: [],
      vehicleSize: "small", siteDiscountPercent: 0, promo: null, roundingNearest: 0, travelFee: 0,
      adjustments: matchPriceRules([RUSH], when), plan: null,
    }).total;
  } finally { Date.now = real; }
};
const shown = priceAt(start - 24 * 3_600_000 - 5 * 60_000);   // page quoted 24h05m out
const charged = priceAt(start - 24 * 3_600_000 + 5 * 60_000); // pressed 23h55m out
check("1a · the page's quote, 24h05m before, has no rush fee ($185)", shown === 185, String(shown));
check("1b · the same booking pressed 10 minutes later is $205", charged === 205, String(charged));

console.log("2. the create-booking handler");
// 2a-2c: the page showed $185, the server now works out $205.
const f1 = bookingFixture({ quoteTotal: charged, handlerBreak });
const refused = await f1.book({ ...fixtureBooking, shown_total: shown });
check("2a · a shown total that differs is refused with 409 price_changed",
  refused.status === 409 && refused.data?.error === "price_changed", `${refused.status} ${JSON.stringify(refused.data)}`);
check("2b · the refusal carries the new total and a plain sentence",
  refused.data?.total === 205 && refused.data?.shown_total === 185 && /price changed/i.test(refused.data?.message ?? ""),
  JSON.stringify(refused.data));
check("2c · nothing was saved: no booking, no customer, no email, no write at all",
  f1.rows.bookings.length === 0 && f1.rows.customers.length === 1 && f1.sends.length === 0 && writes(f1) === 0,
  `bookings ${f1.rows.bookings.length}, customers ${f1.rows.customers.length}, sends ${f1.sends.length}, writes ${writes(f1)}`);

// 2d-2e: the customer saw $205 and confirmed it; a match saves exactly as a
// post without the field does today.
const fMatch = bookingFixture({ quoteTotal: charged, handlerBreak });
const matched = await fMatch.book({ ...fixtureBooking, shown_total: charged });
const fToday = bookingFixture({ quoteTotal: charged, handlerBreak });
const today = await fToday.book({ ...fixtureBooking });
check("2d · totals that match are saved (200, one booking at $205)",
  matched.status === 200 && fMatch.rows.bookings.length === 1 && fMatch.rows.bookings[0].total_price === 205,
  `${matched.status} ${JSON.stringify(fMatch.rows.bookings.map((b) => b.total_price))}`);
check("2e · and saved exactly as today: same rows, same writes, same email as a post with no shown total",
  JSON.stringify([fMatch.rows, fMatch.operations, fMatch.sends.length]) === JSON.stringify([fToday.rows, fToday.operations, fToday.sends.length])
    && today.status === 200,
  `${fMatch.operations.length} vs ${fToday.operations.length} operations`);

// 2f: a retry of a booking that already landed gets it back, never a refusal.
const fDup = bookingFixture({ quoteTotal: charged, duplicate: true, handlerBreak });
const dup = await fDup.book({ ...fixtureBooking, shown_total: shown });
check("2f · a retry whose first press landed still gets its booking back",
  dup.status === 200 && dup.data?.duplicate === true, `${dup.status} ${JSON.stringify(dup.data)}`);

// CANARY: the guard removed from the PRODUCTION handler text must let the
// mismatched post through and save it — the defect this item is about.
const fCanary = bookingFixture({ quoteTotal: charged, handlerBreak: "price-guard" });
const leaked = await fCanary.book({ ...fixtureBooking, shown_total: shown });
const canaryCaught = leaked.status === 200 && fCanary.rows.bookings[0]?.total_price === 205;
check("2g · canary: without the guard the same post saves $205 the page never showed", canaryCaught,
  `${leaked.status} ${JSON.stringify(fCanary.rows.bookings.map((b) => b.total_price))}`);

const failed = assertions - passed;
console.log(`\n${passed} passed, ${failed} failed${BREAK ? `  (PRICE_BREAK=${BREAK}: a sabotage, this run MUST be red)` : ""}`);
const txt = BREAK ? `receipts/price-shown-equals-charged.sabotage-${BREAK}.txt` : "receipts/price-shown-equals-charged.txt";
writeFileSync(txt, [`price-shown-equals-charged ${new Date().toISOString()} break=${BREAK || "none"}`, ...transcript,
  `${passed} passed, ${failed} failed`, ...failures.map((x) => "FAIL " + x)].join("\n") + "\n");
writeReceipt({
  check_id: BREAK ? `price-shown-equals-charged-${BREAK}` : "price-shown-equals-charged",
  started_at,
  status: failed ? "fail" : "pass",
  expected_targets: 4, discovered_targets: 4, attempted_targets: 4, completed_targets: 4, skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 9,
  assertion_floor: "2 frozen-clock pricing + 6 handler + 1 canary = 9, every check() unconditional; targets are the four handler cases (mismatch, match, no field, retry).",
  canary: { id: "guard-removed-saves-unshown-price", observed_failure: canaryCaught, what: "the handler with the guard removed saves $205 over a page that showed $185" },
  failures,
  artifacts: [txt],
  dimensions: { roadmap: "97.8", break: BREAK || null },
  warnings: ["The handler runs in-process against the fixture's fake Supabase with computeQuote stubbed to the figure part 1 priced with the real pricing.ts. The deployed create-booking is not this checkout until Andrew publishes."],
});
process.exit(failed ? 1 : 0);
