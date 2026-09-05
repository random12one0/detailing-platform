// The plans arithmetic — roadmap 2.14.
//
// WHAT THIS IS HERE TO HOLD, in the order it would hurt:
//
//   1. THE OWED FIGURE. It is the one number this whole feature exists to
//      print, and it comes from two halves the schema deliberately keeps
//      apart: grants are rows in `plan_visits`, uses are the member's
//      bookings. A cancelled booking has to give the visit back, and that
//      only works because used is counted from `bookings` where every
//      `status <> 'cancelled'` filter in this codebase is already right.
//   2. `addPeriod` AGAINST POSTGRES. `accrue_plan_visits()` writes the
//      grants with `+ interval`; this file predicts the next one. If they
//      clamp a month overflow differently the screen names a date the
//      database will never grant.
//   3. THE VISITS-OWED LIST. Research called it the single most valuable
//      thing on Housecall Pro's plans dashboard, for the reason the whole
//      research opened with: the sale and the schedule are two acts.
//
// Credential-free, no dev server, no browser.
//
//   node tests/plans.test.mjs

import {
  STATUS_WORDS, addPeriod, cadenceWords, ledgerFor, nextDueOn, priceWords,
  visitWords, visitsOwed,
} from "../app/src/lib/plans.js";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};

const money = (n) => `$${Number(n).toFixed(2).replace(/\.00$/, "")}`;

// ─── 1. addPeriod, and the month-overflow clamp ───────────────────────────
{
  check("a week is seven days", addPeriod("2026-09-04", 1, "week") === "2026-09-11");
  check("bi-weekly is fourteen", addPeriod("2026-09-04", 2, "week") === "2026-09-18");
  check("a week crosses a month end", addPeriod("2026-08-28", 1, "week") === "2026-09-04");
  check("a month keeps the day of the month", addPeriod("2026-09-04", 1, "month") === "2026-10-04");
  check("quarterly is three months", addPeriod("2026-09-04", 3, "month") === "2026-12-04");
  check("a month crosses a year end", addPeriod("2026-12-15", 1, "month") === "2027-01-15");
  check("a year is a year", addPeriod("2026-02-28", 1, "year") === "2027-02-28");

  // POSTGRES CLAMPS AND SO MUST THIS. `select date '2026-01-31' + interval
  // '1 month'` is 2026-02-28, not 2026-03-03. A detailer whose plan started
  // on the 31st is the ordinary case for this, not an exotic one.
  check("31 Jan + 1 month clamps to the end of February",
    addPeriod("2026-01-31", 1, "month") === "2026-02-28", addPeriod("2026-01-31", 1, "month"));
  check("31 May + 1 month clamps to 30 June",
    addPeriod("2026-05-31", 1, "month") === "2026-06-30", addPeriod("2026-05-31", 1, "month"));
  check("a leap February is 29",
    addPeriod("2028-01-31", 1, "month") === "2028-02-29", addPeriod("2028-01-31", 1, "month"));
  check("29 Feb + 1 year clamps to 28 Feb",
    addPeriod("2028-02-29", 1, "year") === "2029-02-28", addPeriod("2028-02-29", 1, "year"));
  // AND CLAMPING MUST NOT BE STICKY: the day is taken from the date given,
  // so a clamped date does not drag every later one down with it. That is
  // also what Postgres does, and it is why grants are stored rather than
  // re-derived from the start date each time.
  check("the clamp does not compound — 28 Feb + 1 month is 28 Mar",
    addPeriod("2026-02-28", 1, "month") === "2026-03-28");
}

// ─── 2. Words ─────────────────────────────────────────────────────────────
{
  check("weekly", cadenceWords({ cadence_count: 1, cadence_unit: "week" }) === "Weekly");
  check("bi-weekly is said the way a detailer says it",
    cadenceWords({ cadence_count: 2, cadence_unit: "week" }) === "Every 2 weeks");
  check("monthly", cadenceWords({ cadence_count: 1, cadence_unit: "month" }) === "Monthly");
  check("three months is quarterly",
    cadenceWords({ cadence_count: 3, cadence_unit: "month" }) === "Quarterly");
  check("an unnamed interval is counted out",
    cadenceWords({ cadence_count: 4, cadence_unit: "month" }) === "Every 4 months");
  check("yearly", cadenceWords({ cadence_count: 1, cadence_unit: "year" }) === "Yearly");
  // A DISCOUNT MEMBERSHIP HAS NO SCHEDULE AND SAYING SO IS THE ANSWER. Mint
  // and Car Detox's add-on rate are both this; a blank line would read as a
  // plan somebody forgot to finish.
  check("no cadence says so rather than printing nothing",
    cadenceWords({}) === "No set schedule");
  check("half a cadence is still no cadence",
    cadenceWords({ cadence_count: 2, cadence_unit: null }) === "No set schedule");

  check("a monthly price", priceWords("monthly", 150, money) === "$150 a month");
  check("a per-visit price", priceWords("per_visit", 100, money) === "$100 a visit");
  check("a percentage", priceWords("percent_off", 15, money) === "15% off");
  check("a plan with no price still says something",
    priceWords("monthly", 0, money) === "$0 a month");

  check("one visit", visitWords({ visits_per_period: 1 }) === "1 visit");
  check("a bundle", visitWords({ visits_per_period: 2 }) === "2 visits");
  check("a missing count reads as one", visitWords({}) === "1 visit");
  check("the three statuses are named", Object.keys(STATUS_WORDS).length === 3);
}

// ─── 3. The ledger ────────────────────────────────────────────────────────
const PLAN = {
  id: "p1", cadence_count: 1, cadence_unit: "month", visits_per_period: 1,
  price_kind: "monthly", price_amount: 150, is_active: true,
};
const MEMBER = { id: "m1", plan_id: "p1", status: "active", started_on: "2026-06-04", accrue_from: "2026-06-04" };
const grants = [
  { member_id: "m1", kind: "granted", delta: 1, due_on: "2026-06-04" },
  { member_id: "m1", kind: "granted", delta: 1, due_on: "2026-07-04" },
  { member_id: "m1", kind: "granted", delta: 1, due_on: "2026-08-04" },
  { member_id: "m1", kind: "granted", delta: 1, due_on: "2026-09-04" },
  // Somebody else's, to prove the filter is real.
  { member_id: "m2", kind: "granted", delta: 1, due_on: "2026-09-04" },
];

{
  const l = ledgerFor(MEMBER, PLAN, grants, [
    { plan_member_id: "m1", status: "completed", deleted_at: null },
    { plan_member_id: "m1", status: "confirmed", deleted_at: null },
    { plan_member_id: "m2", status: "completed", deleted_at: null },
  ]);
  check("granted is the sum of THIS member's rows", l.granted === 4, `got ${l.granted}`);
  check("used counts this member's live bookings", l.used === 2, `got ${l.used}`);
  check("owed is granted minus used", l.owed === 2, `got ${l.owed}`);
  check("the last due date is the latest grant", l.lastDue === "2026-09-04", l.lastDue);
  check("the next one is a period after it", l.nextDue === "2026-10-04", l.nextDue);

  // THE WHOLE REASON USED LIVES ON THE BOOKING. No compensating ledger row,
  // no second rule — the existing cancelled filter gives the visit back.
  const cancelled = ledgerFor(MEMBER, PLAN, grants, [
    { plan_member_id: "m1", status: "cancelled", deleted_at: null },
    { plan_member_id: "m1", status: "completed", deleted_at: null },
  ]);
  check("a CANCELLED booking gives the visit back", cancelled.used === 1 && cancelled.owed === 3,
    `used ${cancelled.used}, owed ${cancelled.owed}`);
  const deleted = ledgerFor(MEMBER, PLAN, grants, [
    { plan_member_id: "m1", status: "completed", deleted_at: "2026-09-01T00:00:00Z" },
  ]);
  check("a soft-deleted booking does not count either", deleted.used === 0);

  // A skipped month is an adjustment, not a deletion — the ledger is
  // append-only so that a charge could later be posted against it.
  const skipped = ledgerFor(MEMBER, PLAN,
    [...grants, { member_id: "m1", kind: "adjusted", delta: -1, due_on: "2026-08-04", note: "Away" }],
    [{ plan_member_id: "m1", status: "completed", deleted_at: null }]);
  check("a skip takes one off what is owed", skipped.granted === 3 && skipped.owed === 2,
    `granted ${skipped.granted}, owed ${skipped.owed}`);
  check("a skip does NOT move the next due date", skipped.nextDue === "2026-10-04", skipped.nextDue);

  // NEGATIVE IS A TRUE STATEMENT, not a defect: they have had more than the
  // plan promised. The migration's auto-link ceiling is the usual cause.
  const over = ledgerFor(MEMBER, PLAN, [grants[0]], [
    { plan_member_id: "m1", status: "completed", deleted_at: null },
    { plan_member_id: "m1", status: "completed", deleted_at: null },
  ]);
  check("more visits than granted goes negative rather than clamping to zero",
    over.owed === -1, `got ${over.owed}`);

  const bundle = ledgerFor(MEMBER, { ...PLAN, visits_per_period: 2 },
    [{ member_id: "m1", kind: "granted", delta: 2, due_on: "2026-09-04" }], []);
  check("a bundle grants its whole period at once", bundle.granted === 2);

  const fresh = ledgerFor({ ...MEMBER, id: "new" }, PLAN, grants, []);
  check("a member with no grants yet is owed nothing", fresh.granted === 0 && fresh.owed === 0);
  check("and their next due date is the day accrual starts",
    fresh.nextDue === "2026-06-04", fresh.nextDue);
}

// ─── 4. nextDueOn ─────────────────────────────────────────────────────────
{
  check("a PAUSED member has no next date",
    nextDueOn({ ...MEMBER, status: "paused" }, PLAN, "2026-09-04") === null);
  check("an ENDED member has no next date",
    nextDueOn({ ...MEMBER, status: "ended" }, PLAN, "2026-09-04") === null);
  check("a plan with no rhythm has no next date",
    nextDueOn(MEMBER, { ...PLAN, cadence_unit: null, cadence_count: null }, "2026-09-04") === null);
}

// ─── 5. Visits owed but not booked ────────────────────────────────────────
{
  const plans = new Map([["p1", PLAN], ["p2", { ...PLAN, id: "p2", cadence_count: 2, cadence_unit: "week" }]]);
  const members = [
    { id: "m1", plan_id: "p1", status: "active", accrue_from: "2026-06-04" },
    { id: "m2", plan_id: "p2", status: "active", accrue_from: "2026-08-01" },
    { id: "m3", plan_id: "p1", status: "paused", accrue_from: "2026-06-04" },
    { id: "m4", plan_id: "p1", status: "active", accrue_from: "2026-09-01" },
  ];
  const v = [
    { member_id: "m1", kind: "granted", delta: 1, due_on: "2026-08-04" },
    { member_id: "m1", kind: "granted", delta: 1, due_on: "2026-09-04" },
    { member_id: "m2", kind: "granted", delta: 1, due_on: "2026-09-01" },
    { member_id: "m3", kind: "granted", delta: 1, due_on: "2026-07-04" },
    { member_id: "m4", kind: "granted", delta: 1, due_on: "2026-09-01" },
  ];
  const bookings = [{ plan_member_id: "m4", status: "confirmed", deleted_at: null }];
  const owed = visitsOwed(members, plans, v, bookings);

  check("somebody who has booked their visit is not on the list",
    !owed.some((r) => r.member.id === "m4"), JSON.stringify(owed.map((r) => r.member.id)));
  check("a PAUSED member is not on the list either",
    !owed.some((r) => r.member.id === "m3"));
  check("two people are owed a visit", owed.length === 2, JSON.stringify(owed.map((r) => r.member.id)));
  check("the one owed MOST is first", owed[0].member.id === "m1", owed[0].member.id);
  check("the list carries the plan, so the screen needs no second lookup",
    owed[0].plan === PLAN);

  // The tie-break, because two people owed one visit each is the ordinary
  // case and "whoever the database happened to return first" is not an order.
  const tied = visitsOwed(
    [{ id: "a", plan_id: "p1", status: "active", accrue_from: "2026-09-01" },
      { id: "b", plan_id: "p1", status: "active", accrue_from: "2026-09-01" }],
    plans,
    [{ member_id: "a", kind: "granted", delta: 1, due_on: "2026-09-01" },
      { member_id: "b", kind: "granted", delta: 1, due_on: "2026-06-01" }],
    [],
  );
  check("at the same count, the one waiting LONGEST is first", tied[0].member.id === "b", tied[0].member.id);

  check("visitsOwed does not mutate the members it was given",
    members[0].id === "m1" && members.length === 4);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
