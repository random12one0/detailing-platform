// The advanced money figures — roadmap 8.9.
//
// **FOURTEEN FIGURES IS WHY THIS FILE EXISTS.** One wrong number on a money
// screen is worse than a missing one: a detailer plans against it. Every
// figure here is checked against a fixture small enough to add up by hand in
// the comment beside it, which is the only kind of money test worth having —
// a test that recomputes the figure the same way the code does proves nothing.
//
//   node tests/money-advanced.test.mjs
//
// Credential-free, no browser, no dev server.

import { advancedMoney } from "../app/src/lib/moneyAdvanced.js";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed += 1; console.log(`  ok   ${name}`); }
  else { failed += 1; console.log(`  FAIL ${name}${detail ? `\n        ${detail}` : ""}`); }
};
const near = (a, b) => Math.abs(a - b) < 0.005;
const eq = (name, got, want) => check(`${name} = ${want}`, near(got, want), `got ${got}`);

/* ── the fixture ──────────────────────────────────────────────────────────
   September 2026. Four completed jobs, one cancelled, one from August.

   1  Sep 2 (Wed)  Dana    $200   90min  paid     Full Detail      + $40 add-on, $20 tip
   2  Sep 5 (Sat)  Marcus  $100   60min  paid     Express Wash
   3  Sep 5 (Sat)  Priya   $150   60min  pending  Express Wash     + $10 tip
   4  Sep 19 (Sat) Dana    $50    30min  paid     Express Wash
   x  Sep 7        Tom     $999          cancelled — must not count anywhere
   0  Aug 20 (prev period) Dana $80  — makes Dana a RETURNING customer

   Collected  = 200 + 100 + 150 + 50 = 500
   Expenses   = 60 (supplies) + 40 (fuel) = 100
   Net        = 400 · margin = 400/500 = 0.8
   Hours      = (90+60+60+30)/60 = 4 · hourly = 400/4 = 100
   People     = Dana (returning), Marcus (new), Priya (new) = 3 · return rate 1/3
   Paid       = 200 + 100 + 50 = 350 · owed = 150
   Packages   = Express Wash 3, Full Detail 1
   Saturday   = 3 jobs / $300 · Wednesday = 1 job / $200
   ──────────────────────────────────────────────────────────────────────── */

const period = { start: "2026-09-01", end: "2026-09-30" };
const previous = { start: "2026-08-01", end: "2026-08-31" };

const job = (id, date, name, phone, amount, minutes, payment, service) => ({
  id, booking_date: date, status: "completed",
  customer_name: name, customer_phone: phone,
  final_amount: amount, total_price: amount,
  duration_minutes: minutes, payment_status: payment,
  services: [{ name_at_booking: service, price_at_booking: amount }],
});

const bookings = [
  job("b1", "2026-09-02", "Dana", "555-0001", 200, 90, "paid", "Full Detail"),
  job("b2", "2026-09-05", "Marcus", "555-0002", 100, 60, "paid", "Express Wash"),
  job("b3", "2026-09-05", "Priya", "555-0003", 150, 60, "pending", "Express Wash"),
  job("b4", "2026-09-19", "Dana", "555-0001", 50, 30, "paid", "Express Wash"),
  { ...job("bx", "2026-09-07", "Tom", "555-0009", 999, 120, "paid", "Ceramic"), status: "cancelled" },
  job("b0", "2026-08-20", "Dana", "555-0001", 80, 60, "paid", "Express Wash"),
];
const expenses = [
  { date: "2026-09-03", amount: 60, category: "Supplies" },
  { date: "2026-09-11", amount: 40, category: "Fuel" },
  { date: "2026-08-08", amount: 25, category: "Supplies" },
];
const lineItems = [
  { booking_id: "b1", category: "add_on", amount: 40, quantity: 1 },
  { booking_id: "b1", category: "tip", amount: 20, quantity: 1 },
  { booking_id: "b3", category: "tip", amount: 10, quantity: 1 },
  // A line item on the CANCELLED job. It must reach nothing.
  { booking_id: "bx", category: "tip", amount: 500, quantity: 1 },
];

const m = advancedMoney({ bookings, expenses, lineItems, period, previous });

/* ── 1 · what came in ─────────────────────────────────────────────────────── */
console.log("\n1: what came in");
eq("collected", m.collected, 500);
eq("jobs", m.jobs, 4);
eq("average ticket", m.avgTicket, 125);
// 500 collected − 40 sold on site − 30 of tips = 430 quoted up front
eq("quoted up front", m.quoted, 430);
eq("added on site", m.onSite, 40);
eq("jobs with something added", m.upsoldJobs, 1);
eq("upsell rate", m.upsellRate, 0.25);
eq("average upsell", m.avgUpsell, 40);
eq("tips", m.tipTotal, 30);
eq("tipped jobs", m.tippedJobs, 2);
eq("average tip", m.avgTip, 15);
eq("tip rate", m.tipRate, 0.5);

// **THE CANCELLED JOB IS THE ONE THAT BREAKS THIS QUIETLY.** $999 and a $500
// tip sitting in the same month: if any figure above counts it, every figure
// on the screen is wrong in the same direction and none of them looks odd.
check("a cancelled job reaches nothing",
  m.collected === 500 && m.tipTotal === 30 && m.jobs === 4,
  `collected ${m.collected}, tips ${m.tipTotal}, jobs ${m.jobs}`);

/* ── 2 · what went out ────────────────────────────────────────────────────── */
console.log("\n2: what went out");
eq("spent", m.spent, 100);
eq("last period's spend", m.prevSpent, 25);
check("categories, largest first",
  m.byCategory.map((c) => `${c.name}:${c.amount}`).join(" ") === "Supplies:60 Fuel:40",
  m.byCategory.map((c) => `${c.name}:${c.amount}`).join(" "));
// THE CATEGORIES MUST ADD UP TO THE TOTAL ABOVE THEM. A screen whose parts do
// not sum to its own headline is a screen nobody trusts again.
eq("the categories sum to the total", m.byCategory.reduce((s, c) => s + c.amount, 0), 100);
eq("the shares sum to one", m.byCategory.reduce((s, c) => s + c.share, 0), 1);

/* ── 3 · what it was worth ────────────────────────────────────────────────── */
console.log("\n3: what it was worth");
eq("net", m.net, 400);
eq("last period's net", m.prevNet, 55);        // 80 in, 25 out
eq("margin", m.margin, 0.8);
eq("hours", m.hours, 4);
eq("hourly", m.hourly, 100);
eq("jobs with no duration", m.hoursMissing, 0);

// A JOB WITH NO DURATION MUST NOT DRAG THE WAGE DOWN. It contributes no hours
// and no denominator; the screen says how many it could not count.
const noTime = advancedMoney({
  bookings: [...bookings, job("b5", "2026-09-22", "Sam", "555-0004", 100, 0, "paid", "Express Wash")],
  expenses, lineItems, period, previous,
});
eq("an untimed job adds no hours", noTime.hours, 4);
eq("and is reported as uncounted", noTime.hoursMissing, 1);
check("but its money still counts", noTime.collected === 600, `got ${noTime.collected}`);

/* ── 4 · who paid ─────────────────────────────────────────────────────────── */
console.log("\n4: who paid");
eq("collected and in the bank", m.collectedPaid, 350);
eq("earned and still owed", m.owed, 150);

/* ── 5 · who they are ─────────────────────────────────────────────────────── */
console.log("\n5: who they are");
// Dana booked in August, so she is returning. Marcus and Priya are new.
eq("new", m.newCustomers, 2);
eq("returning", m.returningCustomers, 1);
eq("people", m.people, 3);
// **DANA BOOKED TWICE IN SEPTEMBER AND IS ONE PERSON.** Counting rows rather
// than people is the classic version of this figure, and it would say four.
check("somebody who came twice is one person", m.people === 3, `got ${m.people}`);
eq("return rate", m.returnRate, 1 / 3);
check("top spender is Dana on $250",
  m.topSpender?.name === "Dana" && near(m.topSpender.total, 250) && m.topSpender.jobs === 2,
  JSON.stringify(m.topSpender));

/* ── 6 · when, and what ───────────────────────────────────────────────────── */
console.log("\n6: when, and what");
check("busiest day is Saturday, three jobs",
  m.busiestDay?.name === "Saturday" && m.busiestDay.jobs === 3, JSON.stringify(m.busiestDay));
// **SATURDAY IS BUSIEST AND SATURDAY IS ALSO BEST HERE ($300 against $200) —
// so the fixture below proves the two are computed apart**, which is the whole
// reason both are shown.
check("best-paying day is Saturday, $300",
  m.bestDay?.name === "Saturday" && near(m.bestDay.total, 300), JSON.stringify(m.bestDay));
const split = advancedMoney({
  bookings: [job("c1", "2026-09-02", "A", "1", 900, 60, "paid", "Correction")],
  expenses: [], lineItems: [], period, previous,
});
const both = advancedMoney({
  bookings: [
    job("c1", "2026-09-02", "A", "1", 900, 60, "paid", "Correction"),
    job("c2", "2026-09-05", "B", "2", 50, 60, "paid", "Express Wash"),
    job("c3", "2026-09-12", "C", "3", 50, 60, "paid", "Express Wash"),
  ],
  expenses: [], lineItems: [], period, previous,
});
check("busiest and best-paying can be different days",
  both.busiestDay?.name === "Saturday" && both.bestDay?.name === "Wednesday",
  `busiest ${both.busiestDay?.name}, best ${both.bestDay?.name}`);
check("one job is both", split.busiestDay?.name === "Wednesday" && split.bestDay?.name === "Wednesday");

// **A DATE IS NOT A TIMESTAMP.** `new Date("2026-09-05")` is UTC midnight, so
// west of Greenwich it reads as the 4th and every day figure is wrong by one.
// The fixture's dates are all weekends and midweek on purpose: if this ever
// regresses, Saturday becomes Friday and this check is what says so.
check("the day of the week is read at noon, not midnight",
  m.week[6].jobs === 3 && m.week[3].jobs === 1,
  `Sat ${m.week[6].jobs}, Wed ${m.week[3].jobs}`);

console.log("\n6b: most popular packages — his own addition");
check("Express Wash leads on three",
  m.packages[0]?.name === "Express Wash" && m.packages[0].count === 3,
  JSON.stringify(m.packages));
check("Full Detail is second on one",
  m.packages[1]?.name === "Full Detail" && m.packages[1].count === 1,
  JSON.stringify(m.packages));
eq("the shares sum to one", m.packages.reduce((s, p) => s + p.share, 0), 1);
check("the cancelled job's package is not in the list",
  !m.packages.some((p) => p.name === "Ceramic"), JSON.stringify(m.packages));

/* ── 7 · nothing at all ───────────────────────────────────────────────────── */
console.log("\n7: an empty month");
// EVERY DIVISION IN THIS FILE HAS A ZERO DENOMINATOR ON A NEW DASHBOARD, and
// `0/0` is NaN, which renders as "$NaN" on the one screen a detailer reads for
// reassurance. This is the case the whole module is most likely to meet.
const zero = advancedMoney({ bookings: [], expenses: [], lineItems: [], period, previous });
const numbers = Object.entries(zero).filter(([, v]) => typeof v === "number");
check("no figure is NaN or Infinity",
  numbers.every(([, v]) => Number.isFinite(v)),
  numbers.filter(([, v]) => !Number.isFinite(v)).map(([k]) => k).join(", "));
check("and the lists are empty rather than absent",
  Array.isArray(zero.packages) && zero.packages.length === 0
  && Array.isArray(zero.byCategory) && zero.byCategory.length === 0
  && zero.topSpender === null && zero.busiestDay === null);

/* ── 8 · called with nothing at all ───────────────────────────────────────── */
console.log("\n8: called wrong");
// A screen that mounts before its reads land calls this with undefined. It
// must answer rather than throw — the alternative is a white screen on Money.
let threw = null;
try { advancedMoney(); } catch (e) { threw = e; }
check("no arguments does not throw", threw === null, String(threw));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
