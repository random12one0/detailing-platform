// ROADMAP 14.7 — THE MONEY SCREEN OVERSTATED ITS NET BY EXACTLY WHAT IT WAS
// OWED, AND THE TWO DOCUMENTS ABOUT IT CONTRADICTED EACH OTHER.
//
// ---------------------------------------------------------------------------
// THE DEFECT, MEASURED BEFORE IT WAS FIXED
// ---------------------------------------------------------------------------
// The demo business (`Coastline Auto Detailing`, project `kguqylyzgyzfktkfnhjb`,
// read on 2026-09-17): 22 finished jobs worth **$4,745**, of which customers
// have actually paid **$4,450**; expenses **$1,102**. The screen's *Net, all
// time* read **$3,643**. Cash received less expenses was **$3,348**. Overstated
// by **$295** — to the dollar, the three jobs still unpaid.
//
// ROADMAP 14.7 recorded $3,383 / $3,153 / $230 when it was written. The shape
// is identical and the figures moved because ROADMAP 14.5's own check left a
// $65 canary booking in the demo data, marked `pending`, on 2026-09-11. That
// is worth knowing and is not a defect in either measurement: the identity
// below is what is being checked, not a particular dollar amount.
//
// ---------------------------------------------------------------------------
// THE CONTRADICTION, AND WHY IT IS THE POINT OF THIS FILE
// ---------------------------------------------------------------------------
// `Money.jsx` carried a comment saying the accrual maths *"has to stay that
// way"*. ROADMAP 5.1 said to compute net from collected money only. **Both
// cannot be true**, and an item resolved in one direction on Tuesday and the
// other on Thursday is an item that comes back.
//
// SETTLED: the comment wins on the maths, 5.1 wins on the words. One accrual
// figure, because the six-bar chart, the *vs last month* delta, the tour step
// and the accountant CSV all count work done in the period — a cash-basis
// headline would disagree with the chart drawn underneath it. Every label
// changes, and *Collected* / *Still owed* go on the screen so the missing part
// is shown rather than implied.
//
// ---------------------------------------------------------------------------
// WHAT A TARGET IS HERE, AND WHY IT GROWS BY ITSELF
// ---------------------------------------------------------------------------
// **One target per value `bookings.payment_status` is allowed to hold**, read
// off the CHECK constraint in the migration rather than typed into this file.
// Four today. `collected` is *defined* by which of those states counts as money
// received, so a migration that adds a fifth makes this check discover five,
// find no decision written for it, and FAIL — which is the point. A list of
// four spelled out here would keep passing while the new state went
// unconsidered, and that is this repo's most repeated failure.
//
// **AND EVERY ASSERTION NAMES THE JOB THIS RUN BUILT, NEVER "a job".** ROADMAP
// 14.6 shipped three assertions that could not fail because their subject was
// *any row*. Each target here is one booking, in one state, at a price unique
// to that state, so an assertion about it can only pass for the right reason:
// the amounts are 100 / 200 / 400 / 800, which no pair of them can add up to.
//
//   node tests/money-overstatement.test.mjs
//   node scripts/receipt.mjs receipts/money-overstatement.json
//
// CREDENTIAL-FREE, NO BROWSER, NO DEV SERVER. Everything it needs is the
// arithmetic module, the migration file and the two screens' source.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
// `moneyAdvanced.js` decides; this file states independently which side each
// payment state falls on. Two copies on purpose — changing the rule without
// coming here is the change that has to be visible, the same posture
// `cancelled-refund.test.mjs` takes toward the refund table.
//
// `partial` and `waived` SIT IN `owed`, AND THAT IS A CHOICE. Nothing in the
// database records how much of a partial payment arrived, so counting it whole
// would overstate — which is the entire defect. `waived` is work given away: it
// was earned at the quoted price and will never be collected.
const COLLECTED_WHEN = {
  pending: false,  // nothing received
  paid: true,      // the money is in
  partial: false,  // money moved, amount unknown, so it is not counted as in
  waived: false,   // given away; earned, never collected
};

// A DISTINCT PRICE PER STATE, AND NO TWO OF THEM SUM TO A THIRD. 100 + 200 is
// not 400 and 100 + 200 + 400 is not 800, so an assertion that lands on the
// right number cannot have got there by counting the wrong jobs.
const PRICE = { pending: 100, paid: 200, partial: 400, waived: 800 };

const period = { start: "2026-09-01", end: "2026-09-30" };
const EXPENSES = [{ date: "2026-09-04", amount: 150, category: "Supplies" }];
const SPENT = 150;

const job = (state, amount) => ({
  id: `j-${state}`,
  booking_date: "2026-09-10",
  status: "completed",
  payment_status: state,
  customer_name: `Fixture ${state}`,
  customer_phone: `555-${state}`,
  total_price: amount,
  final_amount: amount,
  start_at: "2026-09-10T09:00:00.000Z",
  end_at: "2026-09-10T10:00:00.000Z",
  services: [{ name_at_booking: "Express Wash", price_at_booking: amount }],
});

// ---------------------------------------------------------------------------
console.log("\n§ 1 — every payment state the database allows has a decision");

const MIGRATION = "supabase/migrations/20260827000200_tenant_data.sql";
let states = [];
{
  const sql = read(MIGRATION);
  const m = /payment_status\s+text[^\n]*check\s*\(payment_status in \(([^)]*)\)\)/i.exec(sql);
  states = m ? [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]) : [];

  // A REGEX THAT MATCHES NOTHING MUST NOT READ AS A PASS.
  check("the migration's own payment states were found and read",
    states.length > 0, `nothing parsed out of ${MIGRATION}`);
  check("at least the four states this file was written against exist",
    states.length >= 4, `only ${states.length}: ${states.join(", ")}`);

  for (const s of states) {
    check(`\`${s}\` has a collected/not-collected decision written for it`,
      s in COLLECTED_WHEN, "add it to COLLECTED_WHEN and say why in the comment");
    check(`\`${s}\` has a price in the fixture, so it can be told apart`,
      s in PRICE, "add a distinct amount to PRICE");
  }
}

const discovered = states.length;
let attempted = 0;
let completed = 0;

// ---------------------------------------------------------------------------
console.log("\n§ 2 — one finished job per state: earned, collected and owed");

const bookings = states.filter((s) => s in PRICE).map((s) => job(s, PRICE[s]));
const EARNED = bookings.reduce((t, b) => t + b.final_amount, 0);
const COLLECTED = states.filter((s) => COLLECTED_WHEN[s]).reduce((t, s) => t + PRICE[s], 0);
const OWED = EARNED - COLLECTED;

const m = advancedMoney({ bookings, expenses: EXPENSES, lineItems: [], period });

check(`earned is every finished job — ${EARNED}`, m.earned === EARNED, `got ${m.earned}`);
check(`collected is the paid one only — ${COLLECTED}`, m.collected === COLLECTED, `got ${m.collected}`);
check(`still owed is the rest — ${OWED}`, m.owed === OWED, `got ${m.owed}`);
check("earned = collected + still owed", m.earned === m.collected + m.owed,
  `${m.earned} != ${m.collected} + ${m.owed}`);

// PER STATE, AND THE SUBJECT IS THE JOB THIS RUN BUILT. Drop one job and the
// figure must move by exactly that job's price — an assertion that cannot be
// satisfied by the wrong booking, because no other price is the same.
for (const s of states) {
  attempted++;
  if (!(s in PRICE) || !(s in COLLECTED_WHEN)) continue;   // § 1 already failed for it
  const without = advancedMoney({
    bookings: bookings.filter((b) => b.payment_status !== s),
    expenses: EXPENSES, lineItems: [], period,
  });
  check(`removing the \`${s}\` job drops earned by exactly ${PRICE[s]}`,
    m.earned - without.earned === PRICE[s],
    `dropped by ${m.earned - without.earned}`);
  check(`and changes collected by ${COLLECTED_WHEN[s] ? PRICE[s] : 0}`,
    m.collected - without.collected === (COLLECTED_WHEN[s] ? PRICE[s] : 0),
    `changed by ${m.collected - without.collected}`);
  completed++;
}

// ---------------------------------------------------------------------------
console.log("\n§ 3 — the overstatement itself, as an identity");

// THIS IS WHAT 14.7 MEASURED, WRITTEN AS ARITHMETIC RATHER THAN AS A DOLLAR
// AMOUNT: the headline net, minus the cash position, is exactly what is owed.
const cashNet = m.collected - m.spent;
check("net is accrual — earned less expenses, which is what the chart draws",
  m.net === m.earned - SPENT, `net ${m.net}, earned ${m.earned}, spent ${m.spent}`);
check("net overstates the cash position by exactly what is owed",
  m.net - cashNet === m.owed, `${m.net} - ${cashNet} != ${m.owed}`);

// **AND THE OVERSTATEMENT MUST BE NON-ZERO IN THIS FIXTURE**, or the two
// assertions above hold trivially and prove nothing. ROADMAP 14.6's lesson,
// applied to this file's own fixture rather than to somebody else's.
check("the fixture actually overstates, so the check above can fail",
  m.owed > 0, "every fixture job is paid — the identity is vacuous");

// ---------------------------------------------------------------------------
console.log("\n§ 4 — no screen calls an accrual figure by a cash name");

// GREP-COUPLED AND SAYING SO. `docs/gotchas.md` warns that a check tied to a
// spelling rots when the spelling legitimately changes. These three words are
// not a spelling, though — they ARE the defect. "Brought in", "kept" and
// "taken" each promise money has arrived, and the figure under them is work
// finished. A rename that removes them is the fix; a rename that reintroduces
// them is the regression.
const FORBIDDEN = [
  // [what it must not say, where, why]
  ['t("Brought in")', "app/src/screens/Money.jsx", "the accrual total is Earned"],
  ['t("Brought in")', "app/src/components/AdvancedMoney.jsx", "the accrual total is Earned"],
  ['t("Kept")', "app/src/components/AdvancedMoney.jsx", "accrual net is not money kept"],
  ['t("Net, all time")', "app/src/screens/Money.jsx", "Net reads as kept"],
  // RE-POINTED 2026-10-12 (99.3b-ii): the old back office is deleted. Its three
  // "Taken" pins move to the new Money place — and the new screen's own "You
  // kept" was JUDGED, not grandfathered, before it was allowed to stay: the
  // figure under it is `keptOf` (app/src/lib/officeMoney.js), whose revenue base
  // is `invoiceRows`, documented in platformNet.js as PAID platform invoices
  // (cash, not work finished), and which is null — drawn as "Not entered" —
  // until every bill kind for the month is typed (9.14). A cash name over a
  // cash figure drawn only when complete is not this defect. The pin below
  // guards the regression: the old cash verb must never come back.
  ['Taken', "app/src/admin/office/places/money/Kept.jsx", "cash verb over the kept figure"],
];
for (const [needle, file, why] of FORBIDDEN) {
  check(`${file.split("/").pop()} no longer says ${JSON.stringify(needle)}`,
    !read(file).includes(needle), why);
}

// AND THE REPLACEMENTS ARE THERE, so a file that lost the label entirely fails
// too rather than passing for having no label at all.
const PRESENT = [
  ['t("Earned")', "app/src/screens/Money.jsx"],
  ['t("Collected")', "app/src/screens/Money.jsx"],
  ['t("Still owed")', "app/src/screens/Money.jsx"],
  ['t("Earned less expenses, all time")', "app/src/screens/Money.jsx"],
  ['t("Collected")', "app/src/components/AdvancedMoney.jsx"],
  ['t("Earned")', "app/src/components/AdvancedMoney.jsx"],
  // RE-POINTED 2026-10-12 (99.3b-ii): the back office replacement label. Kept.jsx
  // says "You kept" (judged cash-correct in the FORBIDDEN comment above); a file
  // that lost the label entirely must fail here rather than pass for silence.
  ['You kept', "app/src/admin/office/places/money/Kept.jsx"],
];
for (const [needle, file] of PRESENT) {
  check(`${file.split("/").pop()} says ${JSON.stringify(needle)}`,
    read(file).includes(needle), "the label was removed rather than corrected");
}

// EVERY CHANGED ENGLISH STRING HAS ITS SPANISH KEY. `appEs.js` is keyed on the
// English text, so a renamed label falls back to English with no error
// anywhere — CLAUDE.md's own conventions section, and it is the one way this
// change could half-ship.
{
  const es = read("app/src/lib/strings/appEs.js");
  const NEW_STRINGS = [
    "Earned", "Collected", "Earned less expenses",
    "Earned less expenses this month", "Earned less expenses, all time",
    "Left after expenses", "of every dollar earned",
    "You earned {in} and {net} is left after expenses.",
    "{percent}% of what you earned was sold at the job.",
  ];
  for (const s of NEW_STRINGS) {
    check(`\`${s}\` has a Spanish key`, es.includes(`"${s}"`),
      "it will silently render in English on a Spanish dashboard");
  }
}

// ---------------------------------------------------------------------------
// THE NEGATIVE CONTROL. Compute `collected` the way the screen used to — every
// finished job, no `payment_status` filter — and run § 2's own comparator over
// it. If that still reads as clean, every green line in § 2 is worthless.
console.log("\n§ 5 — the canary");

const canary = { id: "collected-computed-with-no-payment-status-filter", observed_failure: false };
{
  const theOldWay = bookings.reduce((t, b) => t + b.final_amount, 0);   // = EARNED
  const wouldPass = theOldWay === COLLECTED && theOldWay - m.spent - (m.collected - m.spent) === m.owed;
  canary.observed_failure = wouldPass === false;
  canary.reported = wouldPass ? "still read as collected" : "caught";
  canary.figures = { the_old_way: theOldWay, the_right_answer: COLLECTED };
  check("the canary — an accrual figure offered as `collected` is caught",
    canary.observed_failure,
    "the comparator cannot see the defect it was handed on purpose");
}

// ---------------------------------------------------------------------------
mkdirSync(new URL("../artifacts/money-overstatement/", import.meta.url), { recursive: true });
writeFileSync(new URL("../artifacts/money-overstatement/figures.json", import.meta.url),
  JSON.stringify({
    fixture: { period, prices: PRICE, expenses: SPENT, collected_when: COLLECTED_WHEN },
    computed: {
      earned: m.earned, collected: m.collected, owed: m.owed,
      spent: m.spent, accrual_net: m.net, cash_net: cashNet,
      overstatement: m.net - cashNet,
    },
    demo_business_2026_09_17: {
      note: "read from project kguqylyzgyzfktkfnhjb, business def6fa3f, all time",
      earned: 4745, collected: 4450, owed: 295,
      expenses: 1102, accrual_net: 3643, cash_net: 3348, overstatement: 295,
      roadmap_14_7_recorded: { accrual_net: 3383, cash_net: 3153, overstatement: 230 },
      why_they_differ: "ROADMAP 14.5's check left a $65 pending canary booking dated 2026-09-11",
    },
    canary,
  }, null, 2) + "\n");

const failed = failures.length;
console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions.`);

const { path } = writeReceipt({
  check_id: "money-overstatement",
  started_at,
  status: failed ? "fail" : "pass",
  expected_targets: 4,          // the four states the file was written against
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  // § 1 is 2 + 2 per state, § 2 is 4 + 2 per state, § 3 is 3, § 4 is 7 + 6 + 9,
  // § 5 is 1 — 47 at four states. Lowering it is a visible diff somebody has
  // to justify, which is the only thing that makes a floor a floor.
  min_assertions: 47,
  failures,
  dimensions: {
    roadmap: "14.7",
    payment_states: states,
    fixture: { earned: EARNED, collected: COLLECTED, owed: OWED, spent: SPENT },
    computed: { earned: m.earned, collected: m.collected, owed: m.owed, net: m.net, cash_net: cashNet },
    contradiction: "5.1 wins on the labels, Money.jsx's comment wins on the maths",
  },
  artifacts: ["artifacts/money-overstatement/figures.json"],
  canary,
});
console.log(`receipt: ${path}`);

process.exit(failed ? 1 : 0);
