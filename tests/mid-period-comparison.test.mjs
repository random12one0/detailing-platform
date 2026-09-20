// ROADMAP 5.2 — THE MONEY SCREEN COMPARED A PART-FINISHED PERIOD AGAINST A
// WHOLE ONE, AND THE FILE THAT DID IT SAID IN ITS OWN HEADER NOT TO.
//
// ---------------------------------------------------------------------------
// THE DEFECT, AND THE TWO DOCUMENTS THAT ALREADY AGREED ABOUT IT
// ---------------------------------------------------------------------------
// `lib/periods.js` has said since it was written that *"comparing a
// part-finished week against a whole one is the classic wrong number"*. It then
// handed `Money.jsx` the WHOLE previous period on every render. On 2026-09-18,
// seventeen days into September, the headline read **▼ 69% vs $918 last month**
// — seventeen days of one month measured against thirty-one days of another.
// A detailer having an ordinary month is told they have lost two thirds of
// their income, and the lie shrinks a little every day until the 30th, which
// reads as a recovery rather than as an error.
//
// SETTLED: TRIM, DO NOT HIDE. Hiding the comparison until the period closes
// removes it for up to 30 days at a stretch on Month and 364 on Year — absent
// on every day a detailer could still act on it, present on the one day they
// cannot. Trimming is also what every dashboard means by month-to-date, which
// is the borrowed convention `periods.js` already commits to. The price of
// trimming is that the sentence must SAY it is a part period, so the labels
// are checked here too: an honest number under a label that names the whole of
// August is the same defect wearing the fix's clothes.
//
// ---------------------------------------------------------------------------
// WHAT A TARGET IS HERE, AND WHY IT GROWS BY ITSELF
// ---------------------------------------------------------------------------
// **One target per period kind the screen offers**, read out of
// `PERIOD_KINDS` in `lib/periods.js` rather than typed into this file. Five
// today — week, month, 6m, year, lifetime. A sixth makes this check discover
// six, find no trim-or-not decision written for it, and FAIL, which is the
// point: a list of five spelled out here would keep passing while the new kind
// went on comparing seventeen days to a whole one.
//
// **AND EVERY ASSERTION'S SUBJECT IS THE PERIOD THIS RUN BUILT, NEVER "a
// period".** Each kind gets three bookings placed by arithmetic off the
// boundary this run computed: one ON the trim date, one on the DAY AFTER it,
// one inside the running period. Every fixture price in the whole file is a
// distinct power of two times $100, so any total decodes to exactly one set of
// jobs — an assertion that lands on the right number cannot have got there by
// counting the wrong bookings, and no pair, triple or subset can impersonate
// another.
//
//   node tests/mid-period-comparison.test.mjs
//   node scripts/receipt.mjs receipts/mid-period-comparison.json
//
// CREDENTIAL-FREE, NO BROWSER, NO DEV SERVER. The date module, the arithmetic
// module, and the source of the three files that render the sentence.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PERIOD_KINDS, periodAt, previousSoFar } from "../app/src/lib/periods.js";
import { advancedMoney } from "../app/src/lib/moneyAdvanced.js";
import { writeReceipt } from "../scripts/receipt.mjs";

const started_at = new Date().toISOString();
const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

const failures = [];
let assertions = 0;
let passed = 0;
const check = (name, cond, detail = "") => {
  assertions++;
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failures.push(`${name} ${detail}`.trim()); console.error(`  FAIL  ${name} ${detail}`); }
};

// ---------------------------------------------------------------------------
// THE DECISION, WRITTEN OUT HERE AND NOT IMPORTED.
// ---------------------------------------------------------------------------
// `periods.js` decides; this file states independently which kinds are trimmed
// while they run. Two copies on purpose — changing the rule without coming here
// is the change that has to be visible, the same posture
// `money-overstatement.test.mjs` takes toward the payment states.
//
// `all` IS NOT TRIMMED AND THAT IS A CHOICE, NOT AN OVERSIGHT. Lifetime ends
// TODAY by construction, so it is never part-finished, and the screen shows no
// comparison for it at all — there is no previous lifetime to invent one from.
const TRIMS_WHILE_RUNNING = {
  week: true,
  month: true,
  "6m": true,
  year: true,
  all: false,      // ends today; the screen hides the comparison entirely
};

// THE DATE THE DEFECT WAS MEASURED ON. Seventeen days into a thirty-day month,
// five days into a seven-day week, and not a month boundary in any kind — so
// every trim this run computes lands strictly inside the previous period and
// the "day after" job is a real row rather than one clamped out of existence.
const TODAY = "2026-09-18";

// ---------------------------------------------------------------------------
// WHERE THE TRIM MUST LAND, WORKED OUT HERE AND NOT ASKED OF THE CODE.
// ---------------------------------------------------------------------------
// **THIS FILE'S FIRST DRAFT PLACED ITS FIXTURE JOBS OFF `previousSoFar`'s OWN
// ANSWER, AND IT SURVIVED AN OFF-BY-ONE SABOTAGE WITH FIFTY-NINE GREEN LINES.**
// Move the trim a day and the fixture moved with it, so the job on the
// boundary was still "the job on the boundary" and every assertion still held.
// A check whose subject is derived from the thing under test has no subject.
//
// So the four dates below are worked out from the calendar, by hand, for
// `TODAY` — Friday 18 September 2026:
//
//   week   the running week is Sun 13 – Sat 19. Today is its FRIDAY, so the
//          week before (Sun 6 – Sat 12) is read to ITS Friday, the 11th.
//   month  17 whole days of September have gone, so August is read to the
//          18th.
//   6m     Apr–Sep is 183 days and today is day 171 of it; Oct–Mar is 182
//          days, so day 171 of it is 20 March. NOT 18 March — the two windows
//          are different lengths and the rule is days elapsed, which is the
//          same rule for all four kinds rather than four calendar rules.
//   year   day 261 of 2026 is 18 September; 2025 is not a leap year either, so
//          its day 261 is 18 September too.
//
// A KIND WITH NO DATE HERE FAILS, which is what makes a sixth one visible.
const EXPECT_TRIM = {
  week: "2026-09-11",
  month: "2026-08-18",
  "6m": "2026-03-20",
  year: "2025-09-18",
  all: null,          // never trimmed; lifetime ends today by construction
};

// ---------------------------------------------------------------------------
// A PERIOD THAT IS OVER AND IS SHORTER THAN THE ONE BEFORE IT.
// ---------------------------------------------------------------------------
// **THE OTHER SABOTAGE THIS FILE'S FIRST DRAFT SLEPT THROUGH.** Take the
// "is this period over?" guard out of `previousSoFar` and August still
// compares with the whole of July, because 48 days elapsed runs past the end
// of a 31-day July and the clamp puts it back. So the guard looked like dead
// code and the check agreed.
//
// It is not dead. When the finished period is SHORTER than the one before it,
// days-elapsed lands short of the end and trims a period that is complete:
//
//   month  Feb 2026 is 28 days; on the 28th it is over, and 27 days elapsed
//          reads January only to the 28th of 31.
//   6m     Oct–Mar is 182 days against Apr–Sep's 183.
//   year   2025 is 365 days against 2024's 366.
//   week   is always 7 days, so it cannot happen — `null` says so on purpose
//          rather than leaving a gap that reads as an oversight.
const SHORT_PERIOD_ENDS_ON = {
  week: null,         // every week is 7 days
  month: "2026-02-28",
  "6m": "2026-03-31",
  year: "2025-12-31",
  all: null,          // ends today; there is no previous lifetime
};

// ---------------------------------------------------------------------------
// A RUNNING PERIOD THAT HAS ALREADY OUTLASTED THE ONE BEFORE IT.
// ---------------------------------------------------------------------------
// **THE THIRD SABOTAGE THIS FILE'S FIRST DRAFT SLEPT THROUGH** — drop the clamp
// to `previous.end` and every green line stayed green, because on 18 September
// no kind had run past the length of its predecessor yet.
//
// It happens every March. On the 30th, 29 days of a 31-day March have gone and
// February had only 28, so days-elapsed lands on 2 MARCH — and an uncapped
// trim would pull the first two days of the month the detailer is looking at
// into "last month", double-counting them on both sides of the comparison.
// Capped, the answer is the whole of February, which is complete and therefore
// not a part period at all.
//
//   week   always 7 days, so it can never outlast the week before it.
//   6m     Apr–Sep is 183 days and Oct–Mar is 182, but the last day it can be
//          RUNNING on is the 29th, which lands exactly on 31 March. Never past.
//   year   the most a running year can reach is the previous year's last day.
const LONG_PERIOD_RUNNING_ON = {
  week: null,
  month: "2026-03-30",   // 29 days of March gone, February had 28
  "6m": null,
  year: null,
  all: null,
};

// A DISTINCT POWER OF TWO PER FIXTURE JOB, so every total decodes to exactly
// one set of bookings. 100, 200, 400, 800, 1600 … — no subset sums to another
// subset, which is ROADMAP 14.6's "the row this run made, not any row" taken
// as far as arithmetic allows.
let ladder = 0;
const price = () => 100 * 2 ** ladder++;

// Inclusive day count, for saying that one period is shorter than another.
const days = (a, b) => Math.round(
  (new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 86400000) + 1;

const addDays = (ymd, n) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(y, m - 1, d + n);
  const p = (x) => String(x).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
};

const job = (id, date, amount) => ({
  id,
  booking_date: date,
  status: "completed",
  payment_status: "paid",
  customer_name: id,
  customer_phone: `555-${id}`,
  total_price: amount,
  final_amount: amount,
  start_at: `${date}T09:00:00.000Z`,
  end_at: `${date}T10:00:00.000Z`,
  services: [{ name_at_booking: "Express Wash", price_at_booking: amount }],
});

// ---------------------------------------------------------------------------
console.log("\n§ 1 — every period kind the screen offers has a trim decision");

const kinds = PERIOD_KINDS.map(([k]) => k);

// A LIST THAT CAME BACK EMPTY MUST NOT READ AS A PASS.
check("the screen's own period kinds were found and read",
  kinds.length > 0, "PERIOD_KINDS parsed as empty");
check("at least the five kinds this file was written against exist",
  kinds.length >= 5, `only ${kinds.length}: ${kinds.join(", ")}`);
for (const k of kinds) {
  check(`\`${k}\` has a trim-while-running decision written for it`,
    k in TRIMS_WHILE_RUNNING, "add it to TRIMS_WHILE_RUNNING and say why in the comment");
  check(`\`${k}\` has a trim date worked out for it independently`,
    k in EXPECT_TRIM, "add it to EXPECT_TRIM, from the calendar, not from the code");
  check(`\`${k}\` has a short-finished-period case decided for it`,
    k in SHORT_PERIOD_ENDS_ON, "add it to SHORT_PERIOD_ENDS_ON, or `null` and say why");
  check(`\`${k}\` has an outlasted-predecessor case decided for it`,
    k in LONG_PERIOD_RUNNING_ON, "add it to LONG_PERIOD_RUNNING_ON, or `null` and say why");
}

const discovered = kinds.length;
let attempted = 0;
let completed = 0;

// ---------------------------------------------------------------------------
console.log("\n§ 2 — a running period is compared with the same point, not the whole of the one before");

const measured = {};
const canary = { id: "comparison-against-the-whole-previous-period", observed_failure: false };
let canaryChecked = 0;

for (const k of kinds) {
  attempted++;
  if (!(k in TRIMS_WHILE_RUNNING)) continue;          // § 1 already failed for it

  const period = periodAt(k, TODAY, 0);
  const whole = periodAt(k, TODAY, -1);
  const trimmed = previousSoFar(period, whole, TODAY);
  const shouldTrim = TRIMS_WHILE_RUNNING[k];
  const want = EXPECT_TRIM[k];

  console.log(`\n  ${k}: ${period.start}…${period.end}, comparing with `
    + `${whole.start}…${trimmed.end}${shouldTrim ? ` (whole: …${whole.end})` : " — untrimmed"}`);

  check(`${k} — the running period is ${shouldTrim ? "" : "not "}trimmed`,
    trimmed.partial === shouldTrim, `partial is ${trimmed.partial}`);

  if (!shouldTrim) {
    check(`${k} — the whole of the period before is kept, ending ${whole.end}`,
      trimmed.end === whole.end, `got ${trimmed.end}`);
    check(`${k} — and no trim date is claimed for it`, want === null, `EXPECT_TRIM says ${want}`);
    measured[k] = { period, whole, trimmed_end: trimmed.end, trimmed: false };
    completed++;
    continue;
  }

  // **THE TRIM DATE IS THIS FILE'S, NOT THE CODE'S.** Everything below is
  // placed off `want`, so moving the boundary by a day fails here and fails
  // again on every figure — the first draft placed them off `trimmed.end` and
  // an off-by-one sabotage passed with fifty-nine green lines.
  check(`${k} — the comparison ends ${want}, the point ${TODAY} has reached in the running period`,
    trimmed.end === want, `got ${trimmed.end}`);
  check(`${k} — ${want} is inside ${whole.start}…${whole.end}, so there is something to cut`,
    want >= whole.start && want < whole.end, "the expected trim is not inside the previous period");

  // THE THREE BOOKINGS, PLACED OFF THIS FILE'S OWN BOUNDARY. `onBoundary` is
  // dated the trim date itself, so an end that is exclusive by one day fails
  // here; `dayAfter` is the job the old comparison counted and the new one
  // must not.
  const onBoundary = job(`${k}-on-boundary`, want, price());
  const dayAfter = job(`${k}-day-after`, addDays(want, 1), price());
  const inPeriodNow = job(`${k}-now`, period.start, price());
  const bookings = [onBoundary, dayAfter, inPeriodNow];

  // THE FIXTURE HAS TO BE ABLE TO FAIL. If the day-after job fell outside the
  // whole previous period, trimming would prove nothing — the row would be
  // excluded either way and every green line below would be vacuous.
  check(`${k} — the day-after job ${dayAfter.booking_date} is inside the whole previous period`,
    dayAfter.booking_date > want && dayAfter.booking_date <= whole.end,
    `${whole.start}…${whole.end} does not contain it`);

  const now = advancedMoney({ bookings, period, previous: trimmed });
  const theOldWay = advancedMoney({ bookings, period, previous: whole });

  check(`${k} — the comparison counts the $${onBoundary.final_amount} job only`,
    now.prevEarned === onBoundary.final_amount,
    `got ${now.prevEarned}, wanted ${onBoundary.final_amount}`);
  check(`${k} — and not the $${dayAfter.final_amount} job one day past the point`,
    now.prevEarned !== onBoundary.final_amount + dayAfter.final_amount,
    `got ${now.prevEarned}, which is both of them`);
  check(`${k} — this period's own figure is untouched at $${inPeriodNow.final_amount}`,
    now.earned === inPeriodNow.final_amount && theOldWay.earned === now.earned,
    `got ${now.earned}`);

  // THE DEFECT, REPRODUCED IN THIS RUN'S OWN FIXTURE. If the untrimmed
  // comparison does NOT overstate here, the assertions above hold trivially.
  const overstated = theOldWay.prevEarned === onBoundary.final_amount + dayAfter.final_amount;
  check(`${k} — the untrimmed comparison does overstate, so the checks above can fail`,
    overstated,
    `untrimmed prevEarned is ${theOldWay.prevEarned}, not ${onBoundary.final_amount + dayAfter.final_amount}`);

  canaryChecked++;
  if (!overstated || theOldWay.prevEarned === now.prevEarned) canary.blind = k;

  // A FINISHED PERIOD IS NOT TRIMMED. Step back one and both periods are over,
  // so the whole of the earlier one is the right comparison and trimming it
  // would invent a different defect in the other direction.
  const done = periodAt(k, TODAY, -1);
  const beforeDone = periodAt(k, TODAY, -2);
  const doneTrim = previousSoFar(done, beforeDone, TODAY);
  check(`${k} — a finished period keeps the whole of the one before it (${beforeDone.end})`,
    doneTrim.partial === false && doneTrim.end === beforeDone.end,
    `partial ${doneTrim.partial}, end ${doneTrim.end}`);

  // **AND THE CASE THAT MAKES THE "is it over?" GUARD LOAD-BEARING** — a
  // finished period SHORTER than the one before it, where days-elapsed lands
  // short of the end and the clamp cannot put it back. The assertion above
  // passes with the guard removed; this one does not.
  const shortEnd = SHORT_PERIOD_ENDS_ON[k];
  if (shortEnd) {
    const sp = periodAt(k, shortEnd, 0);
    const sw = periodAt(k, shortEnd, -1);
    const st = previousSoFar(sp, sw, shortEnd);
    check(`${k} — ${sp.start}…${sp.end} is shorter than ${sw.start}…${sw.end}, so this case proves something`,
      days(sp.start, sp.end) < days(sw.start, sw.end),
      `${days(sp.start, sp.end)}d vs ${days(sw.start, sw.end)}d — the guard would not be exercised`);
    check(`${k} — on ${shortEnd} the period is over, so the whole of ${sw.start}…${sw.end} is kept`,
      st.partial === false && st.end === sw.end,
      `partial ${st.partial}, end ${st.end}`);
    measured[`${k}-short-finished`] = { on: shortEnd, period: sp, whole: sw, kept_to: st.end };
  }

  // **AND THE CASE THAT MAKES THE CLAMP LOAD-BEARING** — a running period that
  // has already outlasted the one before it. Uncapped, the trim runs past the
  // end of the previous period and into THIS one, counting the same days on
  // both sides of the comparison. Capped, the whole of the shorter predecessor
  // is the answer, and it is complete, so it is not labelled as a part period.
  const longOn = LONG_PERIOD_RUNNING_ON[k];
  if (longOn) {
    const lp = periodAt(k, longOn, 0);
    const lw = periodAt(k, longOn, -1);
    const lt = previousSoFar(lp, lw, longOn);
    check(`${k} — on ${longOn} the period is still running and has outlasted ${lw.start}…${lw.end}`,
      longOn < lp.end && days(lp.start, longOn) > days(lw.start, lw.end),
      `${days(lp.start, longOn)}d elapsed against a ${days(lw.start, lw.end)}d predecessor`);
    check(`${k} — the comparison stops at ${lw.end} and does not reach into ${lp.start}…`,
      lt.end === lw.end && lt.partial === false,
      `end ${lt.end}, partial ${lt.partial}`);
    measured[`${k}-outlasted`] = { on: longOn, period: lp, whole: lw, capped_to: lt.end };
  }

  measured[k] = {
    period, whole, trimmed_end: trimmed.end, trimmed: true,
    on_boundary: { date: onBoundary.booking_date, amount: onBoundary.final_amount },
    day_after: { date: dayAfter.booking_date, amount: dayAfter.final_amount },
    prev_earned_now: now.prevEarned,
    prev_earned_the_old_way: theOldWay.prevEarned,
    finished_period_untrimmed_to: doneTrim.end,
  };
  completed++;
}

// ---------------------------------------------------------------------------
console.log("\n§ 3 — the screen says which of the two it is showing");

// GREP-COUPLED AND SAYING SO. `docs/gotchas.md` warns that a check tied to a
// spelling rots when the spelling legitimately changes. This is not a spelling
// though — an honest number under a label naming the whole of last month is
// the same defect wearing the fix's clothes, so the label IS the fix.
const MONEY = "app/src/screens/Money.jsx";
const ADV = "app/src/components/AdvancedMoney.jsx";

const FORBIDDEN = [
  ['const previous = periodAt(', MONEY,
    "the whole previous period straight off periodAt is the defect itself"],
];
for (const [needle, file, why] of FORBIDDEN) {
  check(`${file.split("/").pop()} no longer says ${JSON.stringify(needle)}`,
    !read(file).includes(needle), why);
}

const PRESENT = [
  ["previousSoFar", MONEY, "the trim is not being applied at all"],
  ["VS_LAST_SO_FAR", MONEY, "a part period would be labelled as a whole one"],
  ["SAME_AS_LAST_SO_FAR", MONEY, "a flat part period would be labelled as a whole one"],
  ["soFar={previous.partial}", MONEY, "the label cannot tell which case it is in"],
  ["previous?.partial && !thin", ADV,
    "the advanced tiles compare silently, or explain arrows that are not drawn"],
];
for (const [needle, file, why] of PRESENT) {
  check(`${file.split("/").pop()} says ${JSON.stringify(needle)}`,
    read(file).includes(needle), why);
}

// EVERY NEW ENGLISH STRING HAS ITS SPANISH KEY. `appEs.js` is keyed on the
// English text, so a new label with no key renders in English with no error
// anywhere — CLAUDE.md's own conventions section, and the one way this change
// could half-ship.
{
  const es = read("app/src/lib/strings/appEs.js");
  const NEW_STRINGS = [
    "Same as this point last week",
    "Same as this point last month",
    "Same as this point in the 6 months before",
    "Same as this point last year",
    "vs {amount} at this point last week",
    "vs {amount} at this point last month",
    "vs {amount} at this point in the 6 months before",
    "vs {amount} at this point last year",
    "Changes are against the same point in the period before.",
  ];
  for (const s of NEW_STRINGS) {
    check(`\`${s}\` has a Spanish key`, es.includes(`"${s}"`),
      "it will silently render in English on a Spanish dashboard");
  }
}

// ---------------------------------------------------------------------------
// THE NEGATIVE CONTROL. Hand the comparator the period the screen used to hand
// it — the WHOLE previous one — and run § 2's own comparator over it. If that
// still reads as clean, every green line in § 2 is worthless.
console.log("\n§ 4 — the canary");

{
  const period = periodAt("month", TODAY, 0);
  const whole = periodAt("month", TODAY, -1);
  const trimPoint = EXPECT_TRIM.month;            // this file's date, not the code's
  const onBoundary = job("canary-on-boundary", trimPoint, price());
  const dayAfter = job("canary-day-after", addDays(trimPoint, 1), price());
  const bookings = [onBoundary, dayAfter];

  // § 2's assertion, verbatim, against the old behaviour.
  const theOldWay = advancedMoney({ bookings, period, previous: whole });
  const wouldPass = theOldWay.prevEarned === onBoundary.final_amount;

  canary.observed_failure = wouldPass === false;
  canary.reported = wouldPass ? "read as clean" : "caught";
  canary.figures = {
    trim_point: trimPoint,
    the_old_way: theOldWay.prevEarned,
    the_right_answer: onBoundary.final_amount,
    the_job_it_wrongly_counts: { date: dayAfter.booking_date, amount: dayAfter.final_amount },
  };
  check("the canary — a whole previous period offered as the comparison is caught",
    canary.observed_failure,
    "the comparator cannot see the defect it was handed on purpose");
  check("the canary's own fixture placed the extra job past the trim point",
    dayAfter.booking_date > trimPoint && dayAfter.booking_date <= whole.end,
    "the canary could not have failed for the right reason");
  check("every trimmed kind was held against the untrimmed comparison",
    canaryChecked > 0 && !canary.blind,
    canary.blind ? `${canary.blind} could not tell the two apart` : "no kind was trimmed at all");
}

// ---------------------------------------------------------------------------
mkdirSync(new URL("../artifacts/mid-period-comparison/", import.meta.url), { recursive: true });
writeFileSync(new URL("../artifacts/mid-period-comparison/figures.json", import.meta.url),
  JSON.stringify({
    today: TODAY,
    trims_while_running: TRIMS_WHILE_RUNNING,
    kinds,
    measured,
    canary,
    money_screen_2026_09_18: {
      note: "the reading ROADMAP 5.2 was written about",
      said: "down 69% vs $918 last month",
      on: "17 days of September against the whole of August",
    },
  }, null, 2) + "\n");

const failed = failures.length;
console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions.`);

const { path } = writeReceipt({
  check_id: "mid-period-comparison",
  started_at,
  status: failed ? "fail" : "pass",
  expected_targets: 5,          // the five period kinds this file was written against
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  // § 1 is 2 + 4 per kind, § 2 is 9 per trimmed kind plus 2 for each of the
  // four short-finished and outlasted cases and 3 for lifetime, § 3 is
  // 1 + 5 + 9, § 4 is 3 — 84 at five kinds. Lowering it is a visible diff
  // somebody has to justify, which is the only thing that makes a floor a floor.
  min_assertions: 84,
  failures,
  dimensions: {
    roadmap: "5.2",
    today: TODAY,
    period_kinds: kinds,
    resolution: "trim to the same point, and label it; do not hide until the period ends",
    trim_points: Object.fromEntries(
      Object.entries(measured).map(([k, v]) => [k, v.trimmed_end])),
  },
  artifacts: ["artifacts/mid-period-comparison/figures.json"],
  canary,
});
console.log(`receipt: ${path}`);

process.exit(failed ? 1 : 0);
