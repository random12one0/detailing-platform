// ROADMAP 2.2 — "The summary lines do not add up to the total."
//
// Pure unit test of `_shared/pricing.ts`'s arithmetic. No network, no
// credentials, no deployed function — the edge-function deploy freeze holds,
// so this is the instrument that can prove the fix rather than a browser
// check that needs a deploy to mean anything.
//
//   node --test tests/pricing-lines-sum.test.mjs
//
// THE ONE PROPERTY THIS FILE CHECKS, EVERY TIME: the lines a customer is
// shown (base price, size surcharge, add-ons, travel, every adjustment line,
// minus the site discount, minus the promo discount) sum to EXACTLY what
// `quote.total` charges. `pricing.ts`'s own header says calculate-booking and
// create-booking both run this function so the quote and the charge can
// never drift — this file is the other half of that promise: the LINES and
// the TOTAL must not drift from each other either.

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeQuote } from "../supabase/functions/_shared/pricing.ts";

// Sums exactly what a customer sees on the review step: basePrice, sizeAdd,
// addOnsTotal, travelFee and every adjustment line (surcharges positive,
// the plan discount negative), minus siteDiscount, minus promoDiscount, plus
// the final rounding, which since ROADMAP 97.31 is its own line.
// Mirrors `app/src/book/steps/StepReview.jsx`'s own reading of the quote —
// this is not a second definition of the lines, it is the same one, so a
// change to what StepReview renders has to be reflected here too.
function sumOfLines(q) {
  return q.basePrice + q.sizeAdd + q.addOnsTotal + q.travelFee
    + q.adjustmentsTotal - q.siteDiscount - q.promoDiscount + q.rounding;
}

const service = (price, sizeAdj) => ({
  id: "svc", name: "Express Wash", price, duration_minutes: 60,
  vehicle_size_adjustments: sizeAdj ?? null,
});
const addOn = (price) => ({ id: "ao", name: "Wax", price, duration_minutes: 15 });

const BASE = {
  services: [service(65)],
  addOns: [],
  vehicleSize: "small",
  siteDiscountPercent: 0,
  promo: null,
  roundingNearest: 0,
  travelFee: 0,
  adjustments: [],
  plan: null,
};

// Every scenario the item names, plus the combination of all four —
// deliberately chosen so at least one of siteDiscountPercent / roundingNearest
// forces a fraction, which is the only way this bug ever shows up.
const scenarios = {
  "base — no discount, no rounding": { ...BASE },

  "vehicle size surcharge": {
    ...BASE,
    services: [service(65, { small: { price: 0, duration_minutes: 0 }, large: { price: 22, duration_minutes: 20 } })],
    vehicleSize: "large",
  },

  "add-ons": { ...BASE, addOns: [addOn(18), addOn(12)] },

  "weekend surcharge (a percent adjustment rule)": {
    ...BASE,
    adjustments: [{ label: "Weekend rate", amount: 15, is_percent: true }],
  },

  "member rate, 10% off, rounding to nearest $5": {
    ...BASE,
    services: [service(275)],
    roundingNearest: 5,
    plan: { name: "Member", priceKind: "percent_off", priceAmount: 10 },
  },

  "site sale 10%, rounding to nearest $5": {
    ...BASE,
    services: [service(275)],
    siteDiscountPercent: 10,
    roundingNearest: 5,
  },

  "promo 10% off, rounding to nearest $5": {
    ...BASE,
    services: [service(275)],
    promo: { type: "percentage", value: 10 },
    roundingNearest: 5,
  },

  "everything at once — member rate, weekend, size, add-ons, site sale, promo, rounding": {
    ...BASE,
    services: [service(275, { small: { price: 0, duration_minutes: 0 }, large: { price: 22, duration_minutes: 20 } })],
    vehicleSize: "large",
    addOns: [addOn(18), addOn(12)],
    adjustments: [{ label: "Weekend rate", amount: 15, is_percent: true }],
    plan: { name: "Member", priceKind: "percent_off", priceAmount: 10 },
    siteDiscountPercent: 5,
    promo: { type: "percentage", value: 10 },
    roundingNearest: 5,
  },
};

for (const [name, input] of Object.entries(scenarios)) {
  test(`lines sum to total — ${name}`, () => {
    const q = computeQuote(input);
    const lines = sumOfLines(q);
    const gap = Math.round((lines - q.total) * 100) / 100;
    assert.equal(
      lines, q.total,
      `lines sum to ${lines} but total is ${q.total} — a $${Math.abs(gap)} gap, `
      + `customer is ${gap > 0 ? "undercharged" : "overcharged"} relative to what the lines say`,
    );
  });
}

// THE EXACT CASE THE ITEM NAMED, reproduced with real numbers rather than
// asserted from memory: a 10% member rate on $275, nearest-$5 rounding.
// Written down so the direction and the size of the error are on record,
// not just the fact that a test failed.
test("member rate on $275 at nearest-$5 — the item's own example, real numbers", () => {
  const q = computeQuote({
    ...BASE, services: [service(275)], roundingNearest: 5,
    plan: { name: "Member", priceKind: "percent_off", priceAmount: 10 },
  });
  // Documented, not asserted blind. BEFORE this fix: basePrice 275, plan
  // discount rounds to Math.round(275 * 10 / 100) = 28 (not the
  // mathematically exact 27.50), subtotal 247, then roundToNearest(247, 5)
  // = 245 — lines said 275 - 28 = 247 while the charge was 245. A $2 gap,
  // and the customer paid LESS than the lines added up to: an undercharge,
  // not an overcharge, on this example. 2.2 folded the $2 into the member
  // line ($30); since 97.31 the member line stays $28 and the rounding is its
  // own -$2 line.
  assert.equal(q.basePrice, 275);
  assert.equal(q.adjustmentsTotal, -28);
  assert.equal(q.rounding, -2);
  const lines = sumOfLines(q);
  assert.equal(lines, q.total, `lines ${lines} vs total ${q.total}`);
});

// ─────────────────────────────────────────────────────────────────────────
// `StepReview.jsx` DERIVES THE ROUNDING LINE ITSELF, from the fields
// `calculate-booking/index.ts` hands it (`subtotal_before_discounts` =
// `subtotalBase`, `site_discount`, `promo_discount`, `total`). This mirrors
// its `gap` arithmetic and asserts it equals the engine's own `rounding`, so
// the line the customer reads is the figure the engine charged.
// ─────────────────────────────────────────────────────────────────────────
function clientGap(q) {
  const cents = (v) => Math.round(Number(v || 0) * 100);
  const shown = [q.siteDiscount, q.promoDiscount].filter((d) => d > 0);
  return cents(q.subtotalBase) - cents(q.total) - shown.reduce((s, d) => s + cents(d), 0);
}

const clientScenarios = {
  "promo only, nearest-$5": {
    ...BASE, services: [service(275)], promo: { type: "percentage", value: 10 }, roundingNearest: 5,
  },
  "site only, nearest-$5": {
    ...BASE, services: [service(275)], siteDiscountPercent: 10, roundingNearest: 5,
  },
  "site AND promo, nearest-$5": {
    ...BASE, services: [service(275)], siteDiscountPercent: 5,
    promo: { type: "percentage", value: 10 }, roundingNearest: 5,
  },
  "member rate only, nearest-$5": {
    ...BASE, services: [service(275)], roundingNearest: 5,
    plan: { name: "Member", priceKind: "percent_off", priceAmount: 10 },
  },
  "no discount at all, nearest-$5": {
    ...BASE, services: [service(247)], roundingNearest: 5,
  },
  "97.31 — $104, $1-off code, nearest-$5": {
    ...BASE, services: [service(104)], promo: { type: "amount", value: 1 }, roundingNearest: 5,
  },
};

for (const [name, input] of Object.entries(clientScenarios)) {
  test(`review step's rounding line equals the engine's — ${name}`, () => {
    const q = computeQuote(input);
    assert.equal(clientGap(q) + Math.round(q.rounding * 100), 0);
    assert.ok(q.promoDiscount >= 0 && q.siteDiscount >= 0, "a discount went negative");
  });
}

// ROADMAP 97.31 — ROUNDING IS NEVER FOLDED INTO A DISCOUNT. A $104 job, a
// $1-off code, nearest-$5: folding the +$1 rounding into the promo made it
// -$1, and every screen hides a promo that is not above $0, so the customer
// saw $104 of lines and a $105 total with nothing explaining it.
test("97.31 — $104 job, $1-off code, nearest-$5: promo stays $1, rounding is its own figure", () => {
  const q = computeQuote({
    ...BASE, services: [service(104)], promo: { type: "amount", value: 1 }, roundingNearest: 5,
  });
  assert.equal(q.promoDiscount, 1);
  assert.equal(q.total, 105);
  assert.equal(q.rounding, 2);
  assert.equal(sumOfLines(q), q.total);
});
