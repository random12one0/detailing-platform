// ROADMAP 2.1a + 2.1c — every money line says what KIND it is and carries its
// words as PARTS. 2026-09-21.
//
// **WHY A UNIT TEST AND NOT A BROWSER.** The demo tenant was held by another
// session for the multi-tenant isolation check this round, so there was no
// browser and no tenant to press. Roadmap 2.2 set the precedent for exactly
// this situation: `computeQuote` is imported directly, no network, no
// credentials, no deployed function. What a unit test CANNOT show is the
// rendered Spanish label and the surcharge line appearing on the date step —
// those are named in the card as waiting on a press, not claimed here.
//
// **AND THE FIX IS NOT LIVE.** This is an edge function under the deploy
// freeze. These assertions prove the shared pricing file is right; they prove
// nothing about what a customer can reach today.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeQuote, planLineFor } from "../supabase/functions/_shared/pricing.ts";

// **THE FIXTURE SHAPE IS COPIED FROM `pricing-lines-sum.test.mjs`, NOT
// INVENTED, and the first draft of this file proves why.** It guessed
// `base_price` and `size_pricing`; the real fields are `price` and
// `vehicle_size_adjustments`. `computeQuote` reads a missing price as 0, so
// every figure silently became zero, the plan discount rounded to nothing and
// no plan line was produced at all — three tests failed pointing at the plan
// code, which was correct the whole time. A fixture that is wrong in a way the
// code tolerates accuses the wrong file.
const service = (price, sizeAdj) => ({
  id: "svc", name: "Express Wash", price, duration_minutes: 60,
  vehicle_size_adjustments: sizeAdj ?? null,
});

const base = (over = {}) => ({
  services: [service(65)],
  addOns: [],
  vehicleSize: "small",
  vehicleSizeLabel: "Small",
  extraVehicles: [],
  extraVehicleMinutesSaved: 0,
  splitDays: false,
  siteDiscountPercent: 0,
  promo: null,
  roundingNearest: 0,
  travelFee: 0,
  adjustments: [],
  plan: null,
  ...over,
});

// A guard against exactly the mistake above: if the fixture stops pricing,
// every assertion below becomes vacuous rather than failing honestly.
test("the fixture actually prices — otherwise every test below is vacuous", () => {
  const q = computeQuote(base());
  assert.equal(q.basePrice, 65, "a service with no plan and no rules costs its price");
  assert.equal(q.total, 65);
});

const WEEKEND = { label: "Weekend rate", kind: "time", amount: 30, is_percent: false };

test("2.1a · a rule line is tagged `rule` and carries no parts", () => {
  const q = computeQuote(base({ adjustments: [WEEKEND] }));
  const rules = q.adjustmentLines.filter((l) => l.source === "rule");
  assert.equal(rules.length, 1, "the check has a subject");
  assert.equal(rules[0].label, "Weekend rate", "the detailer's own words, verbatim");
  assert.equal(rules[0].amount, 30);
  // **THE POINT OF 2.1c'S OTHER HALF.** A rule label is the detailer's data.
  // Handing it `parts` would invite a later session to translate it.
  assert.equal(rules[0].parts, undefined, "a rule line must not offer parts to translate");
});

test("2.1a · a plan booking still exposes its rule line — the defect this item opened for", () => {
  // Measured in the browser on 2026-09-21 before this fix: with the Member
  // rate plan attached, picking a Saturday took the bar $60 -> $85 with
  // nothing on screen naming the $25. The page could not tell the plan line
  // from the surcharge, so it showed neither.
  const q = computeQuote(base({
    adjustments: [WEEKEND],
    plan: { name: "Member rate", priceKind: "percent_off", priceAmount: 10 },
  }));
  const kinds = q.adjustmentLines.map((l) => l.source);
  assert.deepEqual(kinds, ["rule", "plan"], "both lines present and distinguishable");

  // What the date step will now render: the rule alone, without the plan.
  const forDateStep = q.adjustmentLines.filter((l) => l.source === "rule");
  assert.equal(forDateStep.length, 1);
  assert.equal(forDateStep[0].label, "Weekend rate");
  assert.ok(
    !forDateStep.some((l) => l.source === "plan"),
    "the plan discount was not caused by the date step and must not appear on it",
  );
});

test("2.1a · a two-car booking exposes its rule line and hides the car lines", () => {
  // The half that could not be pressed even with a browser: `demo-detail`
  // pins max_vehicles_per_booking to 1 on purpose. A unit test reaches it.
  const q = computeQuote(base({
    adjustments: [WEEKEND],
    extraVehicles: [{ key: "large", label: "Large", model: "Ford F-150" }],
  }));
  const bySource = q.adjustmentLines.reduce((m, l) => {
    (m[l.source] ??= []).push(l);
    return m;
  }, {});
  assert.equal(bySource.vehicle.length, 1, "the extra car has its own line");
  assert.equal(bySource.rule.length, 1, "and the surcharge is still its own line");
  assert.equal(
    bySource.rule[0].label, "Weekend rate",
    "which is what the date step shows, where before it showed nothing",
  );
});

test("2.1a · slicing by POSITION would have been wrong, which is why kinds exist", () => {
  // The array is built extras-first, then rules, then the plan. A page that
  // took "the middle ones" would be welded to that order. This asserts the
  // ORDER rather than relying on it: if a later change reorders the array,
  // `source` keeps every caller correct and this test says the order moved.
  const q = computeQuote(base({
    adjustments: [WEEKEND],
    extraVehicles: [{ key: "small", label: "Small" }],
    plan: { name: "Member rate", priceKind: "percent_off", priceAmount: 10 },
  }));
  assert.deepEqual(q.adjustmentLines.map((l) => l.source), ["vehicle", "rule", "plan"]);
});

test("2.1c · a vehicle line carries a NUMBER, not an English ordinal", () => {
  const q = computeQuote(base({
    extraVehicles: [
      { key: "large", label: "Large", model: "Ford F-150" },
      { key: "small", label: "Small" },
    ],
  }));
  const cars = q.adjustmentLines.filter((l) => l.source === "vehicle");
  assert.equal(cars.length, 2);

  // The English label is UNCHANGED — every stored booking, receipt, invoice
  // and email still renders exactly what it rendered before this change.
  assert.equal(cars[0].label, "2nd vehicle · Large · Ford F-150");
  assert.equal(cars[1].label, "3rd vehicle · Small");

  // And the parts beside it are the same facts, translatable.
  assert.deepEqual(cars[0].parts, {
    of: "vehicle", ordinal: 2, size: "Large", model: "Ford F-150",
  });
  // No `model` key at all rather than `model: undefined`, so the snapshot
  // written onto the booking does not carry a null nobody meant.
  assert.deepEqual(cars[1].parts, { of: "vehicle", ordinal: 3, size: "Small" });
  assert.equal("model" in cars[1].parts, false);
});

test("2.1c · a plan line separates the detailer's NAME from our English benefit", () => {
  const cases = [
    [{ name: "Member rate", priceKind: "percent_off", priceAmount: 10 },
      "Member rate · 10% off", { of: "plan", planName: "Member rate", benefit: "percent_off", percent: 10 }],
    [{ name: "Bi-weekly", priceKind: "per_visit", priceAmount: 40 },
      "Bi-weekly · plan rate", { of: "plan", planName: "Bi-weekly", benefit: "plan_rate" }],
    [{ name: "Year up front", priceKind: "monthly", priceAmount: 1200 },
      "Year up front · included", { of: "plan", planName: "Year up front", benefit: "included" }],
  ];
  for (const [plan, label, parts] of cases) {
    const q = computeQuote(base({ plan }));
    const line = q.adjustmentLines.find((l) => l.source === "plan");
    assert.ok(line, `${plan.name} produced a plan line`);
    assert.equal(line.label, label, "English label unchanged");
    assert.deepEqual(line.parts, parts, "and the parts say the same thing as values");
  }
});

test("2.1c · `percent` is present ONLY for a percentage plan", () => {
  // A stray `percent: 1200` on a monthly plan would let a page print
  // "1200% off" — the exact class of defect the label/number mismatch item
  // already open on this page is about.
  for (const kind of ["per_visit", "monthly"]) {
    const q = computeQuote(base({ plan: { name: "P", priceKind: kind, priceAmount: 40 } }));
    const line = q.adjustmentLines.find((l) => l.source === "plan");
    assert.equal("percent" in line.parts, false, `${kind} must not carry a percent`);
  }
});

test("the rounding fold keeps a line's kind and parts — it mutates, it must not replace", () => {
  // ROADMAP 2.2 folds the rounding gap into the last discount by mutating
  // `amount` in place. If anyone ever rebuilds that object instead, `source`
  // and `parts` would vanish and 2.1a would silently regress to showing
  // nothing again. This is the canary for that.
  const q = computeQuote(base({
    adjustments: [WEEKEND],
    plan: { name: "Member rate", priceKind: "percent_off", priceAmount: 10 },
    roundingNearest: 5,
  }));
  const plan = q.adjustmentLines.find((l) => l.source === "plan");
  assert.ok(plan, "the plan line survived the fold");
  assert.equal(plan.parts.of, "plan");
  assert.equal(plan.parts.planName, "Member rate");
  // And the lines still add up, which is 2.2's own guarantee, unchanged.
  const sum = q.basePrice + q.sizeAdd + q.addOnsTotal + q.travelFee
    + q.adjustmentLines.reduce((s, l) => s + l.amount, 0)
    - q.siteDiscount - q.promoDiscount;
  assert.equal(sum, q.total, "2.2's guarantee is untouched by this change");
});

test("every line from every shape has a source — no line is left untagged", () => {
  // The blunt one. A caller filtering on `source` treats an untagged line as
  // nothing, so a missed construction site is a line that silently disappears
  // from the page rather than an error anyone would see.
  const shapes = [
    base({ adjustments: [WEEKEND] }),
    base({ extraVehicles: [{ key: "large", label: "Large" }] }),
    base({ plan: { name: "P", priceKind: "percent_off", priceAmount: 10 } }),
    base({
      adjustments: [WEEKEND, { label: "Short notice", kind: "lead_time", amount: 20, is_percent: false }],
      extraVehicles: [{ key: "large", label: "Large", model: "F-150" }],
      plan: { name: "P", priceKind: "per_visit", priceAmount: 40 },
      roundingNearest: 5,
      siteDiscountPercent: 10,
    }),
  ];
  let seen = 0;
  for (const shape of shapes) {
    for (const l of computeQuote(shape).adjustmentLines) {
      seen += 1;
      assert.ok(
        ["vehicle", "rule", "plan"].includes(l.source),
        `untagged line: ${JSON.stringify(l)}`,
      );
    }
  }
  assert.ok(seen >= 6, `the check has subjects — saw ${seen} lines`);
});

test("planLineFor returns null with no plan, and that stays a null rather than a tagged blank", () => {
  assert.equal(planLineFor(null, 100, 100), null);
  assert.equal(planLineFor(undefined, 100, 100), null);
  // A plan worth nothing produces no line at all — unchanged behaviour, and
  // worth pinning because a `source`-tagged $0 row would now render.
  assert.equal(planLineFor({ name: "P", priceKind: "percent_off", priceAmount: 0 }, 100, 100), null);
});
