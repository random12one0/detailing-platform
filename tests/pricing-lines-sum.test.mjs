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
// the plan discount negative), minus siteDiscount, minus promoDiscount.
// Mirrors `app/src/book/steps/StepReview.jsx`'s own reading of the quote —
// this is not a second definition of the lines, it is the same one, so a
// change to what StepReview renders has to be reflected here too.
function sumOfLines(q) {
  return q.basePrice + q.sizeAdd + q.addOnsTotal + q.travelFee
    + q.adjustmentsTotal - q.siteDiscount - q.promoDiscount;
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
  // not an overcharge, on this example. AFTER: the same $2 folds into the
  // discount line itself, so it reads as a $30 member discount rather than
  // $28 — the discount the customer was actually given, not the one before
  // rounding took an unexplained $2 more off.
  assert.equal(q.basePrice, 275);
  assert.equal(q.adjustmentsTotal, -30);
  const lines = sumOfLines(q);
  assert.equal(lines, q.total, `lines ${lines} vs total ${q.total}`);
});

// ─────────────────────────────────────────────────────────────────────────
// DOES `StepReview.jsx`'S OWN CLIENT-SIDE FOLD BECOME A NO-OP AGAINST A
// FIXED SERVER, OR DOES IT FOLD A SECOND TIME? Computed, not reasoned about
// — this reproduces `StepReview.jsx:47-81` verbatim (the exact `cents`,
// `gross`, `shownDiscounts`, `gap` and fold logic, field for field) and runs
// it against `computeQuote`'s FIXED output, mapped through the same field
// names `calculate-booking/index.ts` hands the client
// (`subtotal_before_discounts` = `subtotalBase`, `site_discount` =
// `siteDiscount`, `promo_discount` = `promoDiscount`). If the client's own
// `gap` is 0 wherever the server already folded, the client fold is inert.
// If it is not, the client enlarges an already-correct discount a second
// time and the lines stop summing to the total again, from the other
// direction.
// ─────────────────────────────────────────────────────────────────────────
function clientQuote(q) {
  return {
    subtotal_before_discounts: q.subtotalBase,
    subtotal: q.subtotalAfterSite,
    site_discount: q.siteDiscount,
    site_discount_percent: 10, // fixed for the test; irrelevant to the arithmetic
    promo_discount: q.promoDiscount,
    promo_code: "TEST",
    total: q.total,
  };
}

// StepReview.jsx:47-81, verbatim, as a function of (quote, settings-less —
// settings.site_discount_label is never set in these scenarios, matching
// the demo's own default).
function clientFold(quote) {
  const cents = (v) => Math.round(Number(v || 0) * 100);
  const gross = cents(quote?.subtotal_before_discounts ?? quote?.subtotal);
  const shownDiscounts = [];
  if (quote?.site_discount > 0) {
    shownDiscounts.push({ key: "site", amount: quote.site_discount });
  }
  if (quote?.promo_discount > 0) {
    shownDiscounts.push({ key: "promo", amount: quote.promo_discount });
  }
  const gap = gross && quote
    ? gross - cents(quote.total) - shownDiscounts.reduce((s, d) => s + cents(d.amount), 0)
    : 0;
  if (shownDiscounts.length && gap !== 0) {
    const last = shownDiscounts[shownDiscounts.length - 1];
    last.amount = (cents(last.amount) + gap) / 100;
  }
  const roundedOnly = !shownDiscounts.length && gap !== 0 ? gap : 0;
  return { gap, shownDiscounts, roundedOnly };
}

// One scenario per fold-priority branch in the server fix, so every path
// StepReview.jsx could take is actually exercised, not just asserted about.
const clientScenarios = {
  "promo only, nearest-$5 — server folds into promo": {
    ...BASE, services: [service(275)], promo: { type: "percentage", value: 10 }, roundingNearest: 5,
  },
  "site only, nearest-$5 — server folds into site": {
    ...BASE, services: [service(275)], siteDiscountPercent: 10, roundingNearest: 5,
  },
  "site AND promo, nearest-$5 — server folds into promo (nearest the total)": {
    ...BASE, services: [service(275)], siteDiscountPercent: 5,
    promo: { type: "percentage", value: 10 }, roundingNearest: 5,
  },
  "member rate only, nearest-$5 — server folds into the plan line, invisible to shownDiscounts": {
    ...BASE, services: [service(275)], roundingNearest: 5,
    plan: { name: "Member", priceKind: "percent_off", priceAmount: 10 },
  },
  "no discount at all, nearest-$5 — nothing to fold into, either side": {
    ...BASE, services: [service(247)], roundingNearest: 5,
  },
};

for (const [name, input] of Object.entries(clientScenarios)) {
  test(`client fold against fixed server — ${name}`, () => {
    const q = computeQuote(input);
    const { gap, roundedOnly } = clientFold(clientQuote(q));
    if (q.siteDiscount > 0 || q.promoDiscount > 0) {
      // A site or promo discount exists, so the server already folded any
      // rounding gap into one of them — the client must compute zero, or it
      // is about to fold a second time onto an already-correct number.
      assert.equal(gap, 0, `client still sees a $${gap / 100} gap on a quote the server already reconciled`);
    } else if (q.total !== sumOfLines(q)) {
      // True "nothing to fold into" — the "no discount at all" scenario
      // above reaches exactly this branch ($247 in services, nearest-$5
      // rounds to $245, no discount anywhere to absorb the $2). The
      // client's existing sentence fallback has to see the same real,
      // unfolded gap the server left, or a customer reads a total that
      // matches nothing on screen with no explanation at all.
      assert.notEqual(roundedOnly, 0, "server left a real gap and the client sentence fallback did not see it");
    } else {
      // No discount, and the server's total already equals the sum (either
      // roundingNearest was 0, or the amount happened to land exactly) —
      // nothing for either side to fold. No scenario above reaches this
      // branch; kept so a future scenario that does is asserted correctly
      // rather than silently passing under one of the other two branches.
      assert.equal(gap, 0);
      assert.equal(roundedOnly, 0);
    }
  });
}
