// ROADMAP 2.1 — a day with no time must price a day-only rule. 2026-09-22.
//
//   node --test tests/price-a-day.test.mjs
//
// ---------------------------------------------------------------------------
// WHAT THIS IS THE OTHER HALF OF
// ---------------------------------------------------------------------------
// `scripts/surcharge-visible.mjs` walks the real booking page and asks whether
// the customer can SEE the surcharge before they can be charged it. It cannot
// answer the question this file answers, and the reason is worth stating
// plainly rather than discovering later: **the booking page calls the DEPLOYED
// edge function**, so until `calculate-booking` is published, no browser
// anywhere can observe this change. Publishing is Andrew's.
//
// So the split is: the browser check owns "does the page show it", this file
// owns "does the engine work it out". Neither can stand in for the other, and
// a tick that rests on only one of them is a tick that rests on nothing.
//
// ---------------------------------------------------------------------------
// THE FAULT, IN ONE SENTENCE
// ---------------------------------------------------------------------------
// `whenContextFor` opened with `if (!bookingDate || !startTime) return {}`, so
// no price rule could ever be matched on a day alone — while `matchPriceRules`
// one layer down has always been ready for it, demanding a `startTime` only
// inside the branch for a rule that carries a start AND an end time. The
// capability existed and was gated off upstream. A customer who tapped Sunday
// was shown a list of Sunday times and a total that did not include the
// Sunday surcharge, and the product already knew the real number.
//
// ---------------------------------------------------------------------------
// THE RULES ARE THE TENANT'S OWN, COPIED FROM `business_settings`
// ---------------------------------------------------------------------------
// Read off the live row on 2026-09-22 rather than off `MANAGER-CLOSE`, which
// had already handed out one wrong number that day. Both are here because the
// interesting assertion is the pair: the day-only rule must start matching and
// the lead-time rule must NOT.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeQuote, matchPriceRules, whenContextFor,
} from "../supabase/functions/_shared/pricing.ts";

const WEEKEND = {
  kind: "time", label: "Weekend rate", amount: 30, is_percent: false,
  weekdays: [0, 6], start_time: null, end_time: null,
};
const SHORT_NOTICE = {
  kind: "lead_time", label: "Short notice", amount: 20,
  is_percent: false, within_hours: 24,
};
// NOT the tenant's — invented, and that is the point. A windowed rule is the
// one shape that genuinely needs the hour, and it is the thing this change
// must not quietly start matching.
const EVENING = {
  kind: "time", label: "Evening rate", amount: 15, is_percent: false,
  weekdays: null, start_time: "18:00", end_time: "22:00",
};
const RULES = [WEEKEND, SHORT_NOTICE, EVENING];

// The two collaborators `whenContextFor` takes by parameter, because
// `pricing.ts` is dependency-free on purpose. These are the same shapes
// `_shared/tz.ts` provides; `weekdayOf` is all that matters below and it is
// exact rather than approximate.
const weekdayOf = (d) => new Date(`${d}T12:00:00Z`).getUTCDay();
const localDateTimeToInstant = (_tz, d, t) => new Date(`${d}T${t}:00Z`);
const TZ = "America/Los_Angeles";

// 2026-09-26 is a Saturday, 2026-09-27 a Sunday, 2026-09-30 a Wednesday.
const SATURDAY = "2026-09-26";
const SUNDAY = "2026-09-27";
const WEDNESDAY = "2026-09-30";

test("a day with no time now carries the weekday, and nothing else", () => {
  const when = whenContextFor(TZ, SATURDAY, null, localDateTimeToInstant, weekdayOf);
  assert.equal(when.weekday, 6, "Saturday is weekday 6");
  // BOTH OF THESE MUST STAY ABSENT. A `startTime` invented here would make a
  // windowed rule match on a guess, and a `leadHours` invented here would
  // make a rush fee appear before anybody picked an hour — either one is a
  // charge the customer never agreed to.
  assert.equal(when.startTime, undefined, "no time was chosen, so none is reported");
  assert.equal(when.leadHours, undefined, "lead time is unknowable without an hour");
});

test("no day at all is still an empty context", () => {
  // Step 1: the price bar is on screen before anything is chosen.
  assert.deepEqual(whenContextFor(TZ, null, null, localDateTimeToInstant, weekdayOf), {});
  assert.deepEqual(whenContextFor(TZ, "", "09:00", localDateTimeToInstant, weekdayOf), {});
});

test("the day-only rule matches on the day alone; the other two correctly do not", () => {
  for (const day of [SATURDAY, SUNDAY]) {
    const when = whenContextFor(TZ, day, null, localDateTimeToInstant, weekdayOf);
    const hit = matchPriceRules(RULES, when);
    assert.deepEqual(hit.map((r) => r.label), ["Weekend rate"],
      `${day} with no time should match the weekend rule and only that one`);
  }
});

test("a weekday with no time matches nothing — the control, in the engine", () => {
  const when = whenContextFor(TZ, WEDNESDAY, null, localDateTimeToInstant, weekdayOf);
  assert.deepEqual(matchPriceRules(RULES, when).map((r) => r.label), [],
    "pricing the day early must not start charging people on a Wednesday");
});

test("choosing the time as well changes nothing about the weekend rule", () => {
  // The number the customer saw when they picked the day has to be the number
  // they are charged. If these two differ, the disclosure is a lie in the
  // other direction.
  const early = matchPriceRules(RULES,
    whenContextFor(TZ, SATURDAY, null, localDateTimeToInstant, weekdayOf));
  const late = matchPriceRules(RULES,
    whenContextFor(TZ, SATURDAY, "09:00", localDateTimeToInstant, weekdayOf));
  assert.deepEqual(early.map((r) => r.label), ["Weekend rate"]);
  assert.ok(late.some((r) => r.label === "Weekend rate"),
    "the same rule still applies once an hour is known");
});

test("an evening rule still waits for the hour, and then fires", () => {
  const noTime = matchPriceRules([EVENING],
    whenContextFor(TZ, SATURDAY, null, localDateTimeToInstant, weekdayOf));
  assert.deepEqual(noTime.map((r) => r.label), [],
    "a rule with a start AND end time cannot be answered by a day");
  const evening = matchPriceRules([EVENING],
    whenContextFor(TZ, SATURDAY, "19:00", localDateTimeToInstant, weekdayOf));
  assert.deepEqual(evening.map((r) => r.label), ["Evening rate"]);
});

// ---------------------------------------------------------------------------
// AND THE WHOLE QUOTE, BECAUSE A MATCHED RULE THAT NEVER REACHES THE TOTAL IS
// THE SAME SILENCE ONE LAYER DOWN.
// ---------------------------------------------------------------------------
// The fixture shape is copied from `pricing-lines-sum.test.mjs` rather than
// invented — `adjustment-kinds.test.mjs` records what guessing it cost.
const quoteFor = (day, time) => computeQuote({
  services: [{ id: "s1", name: "Express Wash", price: 65, duration_minutes: 60 }],
  addOns: [],
  vehicleSize: "small",
  settings: { rounding_nearest: 0, site_discount_active: false },
  adjustments: matchPriceRules(RULES,
    whenContextFor(TZ, day, time, localDateTimeToInstant, weekdayOf)),
});

test("the Saturday quote is the same $95 before and after an hour is chosen", () => {
  const early = quoteFor(SATURDAY, null);
  const late = quoteFor(SATURDAY, "09:00");
  assert.equal(early.total, 95, "the day alone already prices the weekend rate");
  assert.equal(late.total, early.total,
    "the figure shown when the day was chosen must be the figure charged");
  assert.deepEqual(early.adjustmentLines.map((l) => [l.label, l.amount, l.source]),
    [["Weekend rate", 30, "rule"]]);
});

test("the Wednesday quote stays at $65 through both", () => {
  assert.equal(quoteFor(WEDNESDAY, null).total, 65);
  assert.equal(quoteFor(WEDNESDAY, "09:00").total, 65);
  assert.deepEqual(quoteFor(WEDNESDAY, null).adjustmentLines, []);
});
