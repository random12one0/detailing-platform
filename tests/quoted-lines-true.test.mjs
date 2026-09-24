// ROADMAP 14.19 — "EVERY LINE SAYS A TRUE THING ABOUT WHAT THE CUSTOMER WAS
// QUOTED." The check this repo did not have.
//
//   node --test tests/quoted-lines-true.test.mjs
//
// Credential-free. No network, no dev server, no deploy. It runs the real
// `computeQuote`, hands the result to the real `customerConfirmationEmail`
// exactly as `create-booking/index.ts` does, and reads the money column out of
// the rendered HTML.
//
// ─────────────────────────────────────────────────────────────────────────
// WHY THIS IS NOT `tests/pricing-lines-sum.test.mjs` AGAIN
// ─────────────────────────────────────────────────────────────────────────
//
// That file asks whether the column ADDS UP. This one asks whether it is
// TRUE. They are different questions, and 14.19 is the proof: a two-car
// booking stored `subtotal` 315 against a `total_price` of 215, and the
// customer's email printed
//
//     shape service                      $215
//     2nd vehicle · Small · Second Car   $100
//     Discount applied                  -$100
//     Estimated total                    $215
//
// $215 − $100 + $100 = $215. **It balances.** Every money-column check in
// this repo passed on it, including `render-emails.mjs`'s own assertion that
// every column reaches its printed total, and `tests/multi-vehicle.test.mjs`
// item 2d, which is that same sum by hand. Meanwhile the customer is shown a
// service price they were never quoted and told they were given a $100
// discount that does not exist.
//
// `reconcile()` in `_shared/emailKit.ts` is what makes the fiction balance:
// it invents a closing line for whatever gap it finds. That is correct
// behaviour and it is also the plaster, so a check that only reads the sum
// can never see underneath it.
//
// ─────────────────────────────────────────────────────────────────────────
// THE PROPERTY, AND WHY IT IS THE RIGHT ONE
// ─────────────────────────────────────────────────────────────────────────
//
// `emailTemplates.ts`'s `quoteLines()` does not receive a service price. It
// DERIVES one, and its own comment says so: *"`subtotal` already contains
// travel and every surcharge (2.8c), so the named services cannot simply be
// summed — the derived remainder is what the services and add-ons actually
// came to."* The derivation is
//
//     serviceLine = subtotal + siteDiscount − travelFee − Σ(adjustment lines)
//
// So the stored `subtotal` is not a display figure. **It is the input to a
// subtraction whose answer is printed to a paying customer as the price of
// their service.** One column wrong by $100 becomes two printed lines wrong
// by $100 each, in opposite directions, which is exactly why it balanced.
//
// The true statement is therefore: whatever that subtraction produces must
// equal what the customer was actually quoted for the work —
// `basePrice + sizeAdd + addOnsTotal`, the three figures the engine computed
// from the services themselves. That holds under travel, surcharges, plans,
// site sales, promo codes and rounding, because every one of those is either
// inside `named` or cancels out of the identity. It failed on exactly one
// path: extra vehicles, which were inside `subtotal` AND named again.
//
// **A CHECK THAT ONLY ASKED THE FIRST HALF COULD BE SATISFIED BY DELETING
// EVERY NUMBER**, so the sum is asserted too. Both, or neither is worth
// anything.
//
// NOT COVERED, SAID PLAINLY: `splitDays`. Cars on different days are separate
// `create-booking` calls, so each car gets its own single-vehicle email and
// there is no combined payload to render. A fixture that invented one would
// be testing a message the product never sends.

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeQuote } from "../supabase/functions/_shared/pricing.ts";
import { brandFrom, htmlToText } from "../supabase/functions/_shared/emailKit.ts";
import { customerConfirmationEmail } from "../supabase/functions/_shared/emailTemplates.ts";

const brand = brandFrom({
  brandName: "Ridgeline Auto Detail",
  contactPhone: "(303) 555-0142",
  siteUrl: "https://detailingplatform.com/book/demo-detail",
  logoUrl: null,
}, "#1f6feb");

const SIZES = {
  small: { price: 0, duration_minutes: 0 },
  medium: { price: 15, duration_minutes: 10 },
  large: { price: 30, duration_minutes: 20 },
};
const service = (price, name = "shape service") => ({
  id: "svc", name, price, duration_minutes: 60, vehicle_size_adjustments: SIZES,
});
const addOn = (price, name = "Wax") => ({ id: "ao", name, price, duration_minutes: 15 });
const car = (key, label, model = null) => ({ key, label, model });

const BASE = {
  services: [service(100)],
  addOns: [],
  vehicleSize: "medium",
  vehicleSizeLabel: "Medium",
  siteDiscountPercent: 0,
  promo: null,
  roundingNearest: 0,
  travelFee: 0,
  adjustments: [],
  plan: null,
  extraVehicles: [],
};

// `create-booking/index.ts:650-676`, field for field. This is the payload the
// customer's confirmation is really built from — not a restatement of it.
// A fixture that restates the product instead of exercising it cannot fail
// with it, which is how `render-emails.mjs`'s hand-written `carloadBooking`
// (subtotal 480, total 480) sat beside this fault for two days looking right.
const payloadFrom = (inp, q) => ({
  customerName: "Dana Ortiz",
  businessName: "Ridgeline Auto Detail",
  date: "2026-10-02",
  dateStr: "2026-10-02",
  startTime: "09:00",
  endTime: "11:00",
  serviceType: "mobile",
  vehicleSize: inp.vehicleSizeLabel,
  vehicleModel: null,
  extraVehicles: (inp.extraVehicles ?? []).map((v) => ({ size: v.label, model: v.model })),
  serviceNames: inp.services.map((s) => s.name),
  addOnNames: inp.addOns.map((a) => a.name),
  travelFee: q.travelFee,
  travelZone: null,
  adjustments: q.adjustmentLines,
  subtotal: q.subtotalAfterSite,
  siteDiscount: q.siteDiscount,
  siteDiscountPercent: inp.siteDiscountPercent,
  promoCode: inp.promo ? "TESTCODE" : null,
  promoDiscount: q.promoDiscount,
  total: q.total,
  receiptUrl: "https://detailingplatform.com/booking/7f3ab210",
});

// The money column as a customer reads it. `money()` renders `$1,234` and
// `moneyBlock` renders a discount as `&minus;`, which `htmlToText` gives back
// as a leading minus — so the sign is read, not assumed. Reading the RENDERED
// column rather than calling `quoteLines()` is deliberate: `quoteLines` is not
// exported, and a check that reached inside the template would stop measuring
// the thing that reaches the customer.
//
// THE TOTAL IS THE LAST ROW BY POSITION, NEVER BY ITS WORDS. `moneyBlock`
// draws the lines and then the total beneath them, and its label differs by
// message and by language — "Estimated total", "Total paid", "Amount due",
// and all three again in Spanish. A check keyed on a spelling is this repo's
// most repeated self-inflicted wound; the first version of this file summed
// the total row in with the lines and reported every scenario as broken by
// exactly double.
function moneyColumn(html) {
  const rows = [];
  for (const raw of htmlToText(html).split("\n")) {
    const m = /^(.+?)\s*\|\s*(-?)\$([\d,]+(?:\.\d+)?)$/.exec(raw.trim());
    if (m) rows.push({ label: m[1].trim(), amount: (m[2] ? -1 : 1) * Number(m[3].replace(/,/g, "")) });
  }
  return { lines: rows.slice(0, -1), total: rows[rows.length - 1], all: rows };
}

// `reconcile()`'s invented closing line, by either of its two names. Its
// presence is not automatically a fault — a business that rounds and gives no
// discount has a real gap with nowhere to fold it, and `StepReview.jsx`
// renders that case as a sentence on purpose. Its presence on a booking with
// nothing to reconcile is the fault.
const INVENTED = /^(Discount applied|Adjustment)$/;

const scenarios = {
  // The control. One car has always been clean, and a check that only ever
  // exercises the broken path cannot tell a fix from a coincidence.
  "one car": { ...BASE },

  // ROADMAP 14.19's own measurement, to the dollar: service $100, medium
  // vehicle (+$15), one extra small car (+$100). Stored subtotal was 315.
  "two cars — the item's own numbers": {
    ...BASE, extraVehicles: [car("small", "Small", "Second Car")],
  },
  "three cars": {
    ...BASE, extraVehicles: [car("large", "Large", "2021 Ford F-150"), car("small", "Small")],
  },
  // Each of these puts something ELSE into `named` or into `subtotal`. If the
  // identity only held by luck on the bare case, one of them breaks it.
  "two cars + travel": {
    ...BASE, extraVehicles: [car("small", "Small")], travelFee: 25,
  },
  "two cars + add-ons": {
    ...BASE, extraVehicles: [car("small", "Small")], addOns: [addOn(18), addOn(12, "Pet hair removal")],
  },
  "two cars + a percentage surcharge": {
    ...BASE, extraVehicles: [car("small", "Small")],
    adjustments: [{ label: "Saturday", kind: "time", amount: 10, is_percent: true }],
  },
  "two cars + a flat surcharge": {
    ...BASE, extraVehicles: [car("large", "Large")],
    adjustments: [{ label: "Heavy soiling surcharge", amount: 20 }],
  },
  "two cars + a site sale": {
    ...BASE, extraVehicles: [car("small", "Small")], siteDiscountPercent: 5,
  },
  "two cars + a promo code": {
    ...BASE, extraVehicles: [car("small", "Small")], promo: { type: "percentage", value: 10 },
  },
  "two cars + a plan": {
    ...BASE, extraVehicles: [car("small", "Small")],
    plan: { name: "Member", priceKind: "percent_off", priceAmount: 10 },
  },
  "two cars + rounding": {
    ...BASE, services: [service(275)], extraVehicles: [car("large", "Large")], roundingNearest: 5,
  },
  "everything at once": {
    ...BASE, services: [service(275)], addOns: [addOn(18)],
    extraVehicles: [car("large", "Large", "F-150"), car("small", "Small")],
    travelFee: 25, roundingNearest: 5, siteDiscountPercent: 5,
    promo: { type: "percentage", value: 10 },
    adjustments: [{ label: "Weekend rate", amount: 15, is_percent: true }],
    plan: { name: "Member", priceKind: "percent_off", priceAmount: 10 },
  },
};

for (const [name, inp] of Object.entries(scenarios)) {
  test(`the printed service line is what the customer was quoted — ${name}`, () => {
    const q = computeQuote(inp);
    const col = moneyColumn(customerConfirmationEmail(brand, payloadFrom(inp, q), false).html);
    assert.ok(col.lines.length, "no money column was rendered at all");

    // The service line leads the column — `quoteLines()` pushes it first,
    // before travel and before every adjustment.
    const [first] = col.lines;
    const quoted = q.basePrice + q.sizeAdd + q.addOnsTotal;
    assert.equal(
      first.amount, quoted,
      `the email prints the work at $${first.amount} ("${first.label}") but the `
      + `customer was quoted $${quoted} — base ${q.basePrice} + size ${q.sizeAdd} `
      + `+ add-ons ${q.addOnsTotal}. A difference of $${first.amount - quoted}, `
      + `and the column still balances, because the same difference is being `
      + `handed back somewhere else as a discount nobody gave.`,
    );

    // And the other half, so the check cannot be satisfied by deleting
    // numbers: the lines still reach the printed total, and the printed total
    // is still what is charged.
    const drawn = col.lines.reduce((s, r) => s + r.amount, 0);
    assert.equal(drawn, col.total.amount, `the lines sum to ${drawn} but the column's total prints ${col.total.amount}`);
    assert.equal(col.total.amount, q.total, `the email prints ${col.total.amount} but the charge is ${q.total}`);
  });
}

// ROADMAP 14.19's "Done when", literally: no `Discount applied` line at all.
// Kept separate from the loop because it is only true where there is nothing
// to reconcile — the rounding scenarios above can legitimately produce one.
test("a two-car booking with no discount invents no discount", () => {
  const inp = scenarios["two cars — the item's own numbers"];
  const q = computeQuote(inp);
  const { all: rows } = moneyColumn(customerConfirmationEmail(brand, payloadFrom(inp, q), false).html);

  assert.deepEqual(
    rows.map((r) => [r.label, r.amount]),
    [["shape service", 115], ["2nd vehicle · Small · Second Car", 100], ["Estimated total", 215]],
    "the whole column, as the customer reads it",
  );
  assert.equal(
    rows.filter((r) => INVENTED.test(r.label)).length, 0,
    "reconcile() closed a gap that should not exist — the stored subtotal disagrees with the total",
  );
  // The column the fault produced, on record: service $215, second vehicle
  // $100, "Discount applied" −$100, total $215. Every figure but one is a
  // lie and the arithmetic is perfect.
  assert.equal(q.subtotalAfterSite, q.total, `subtotal ${q.subtotalAfterSite} vs total ${q.total}`);
});

// A one-car booking is unchanged, which is the other half of "Done when".
test("a one-car booking is untouched at 115 / 115", () => {
  const q = computeQuote({ ...BASE });
  assert.equal(q.total, 115);
  assert.equal(q.subtotalBase, 115);
  assert.equal(q.subtotalAfterSite, 115);
});
