// WHAT THE BACK OFFICE SAYS ABOUT A DETAILER.
//
// `app/src/lib/adminInsight.js`, and it exists for the same reason
// `lib/setup.js` and `lib/attention.js` do: **every figure in it is one the
// owner will compare against something else** — the detailer's own Money
// screen, an invoice, a bank statement — so the arithmetic has to be
// checkable without a DOM.
//
// The screen these feed is the one he opens to answer *"is this working for
// them"*, and the failure mode is not a crash. It is a plausible wrong
// number: a trend that says a detailer is collapsing when they had one quiet
// week, a revenue total that silently drops every unfinalised job, an "average
// job" computed over three bookings and printed to the penny. Every one of
// those is read as fact and acted on.
//
//   node tests/admin-insight.test.mjs      (credential-free)

import {
  billingState, bookability, daysSince, monthlySeries, owedByUs, paidFor, trend, workload,
} from "../app/src/lib/adminInsight.js";
import { readFileSync } from "node:fs";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
};

// A fixed "now" so nothing here depends on the day it is run — a suite that
// passes in September and fails on 1 January is a suite people stop believing.
const NOW = new Date(2026, 8, 15);   // 15 September 2026
const at = (y, m, d) => new Date(y, m - 1, d).toISOString();
const bk = (o) => ({ status: "completed", start_at: at(2026, 9, 1), created_at: at(2026, 9, 1), ...o });

// ─── 1 · what a booking was worth ─────────────────────────────────────────
// CHARGED, falling back to QUOTED. A job that has not been finalised has no
// `final_amount`, and treating that as zero makes every busy detailer look
// idle until they do their paperwork.
console.log("\n1. what a booking was worth");
{
  check("1a · the charged amount wins", paidFor({ final_amount: 180, total_price: 200 }) === 180);
  check("1b · the quote is the fallback", paidFor({ final_amount: null, total_price: 200 }) === 200);
  check("1c · and a zero charge is a zero, not a missing one",
    paidFor({ final_amount: 0, total_price: 200 }) === 0,
    "a job done for nothing is a real fact; ?? must not treat 0 as absent");
  check("1d · nothing at all is nothing", paidFor(null) === 0 && paidFor({}) === 0);
}

// ─── 2 · the six-month spine ──────────────────────────────────────────────
console.log("\n2. the months");
{
  const s = monthlySeries([], 6, NOW);
  check("2a · six months, even with no bookings at all", s.length === 6);
  check("2b · ending on the month we are in", s[5].label === "Sep" && s[5].key === "2026-09");
  check("2c · and starting six back", s[0].key === "2026-04");
  // **THE EMPTY MONTHS ARE THE POINT.** A detailer who booked in March and
  // June and nothing since draws as two bars with a GAP if the spine comes
  // from the clock, and as two adjacent bars if it comes from the data —
  // and those are opposite stories about the same business.
  const gapped = monthlySeries([
    bk({ start_at: at(2026, 5, 3) }), bk({ start_at: at(2026, 8, 3) }),
  ], 6, NOW);
  check("2d · a quiet month is DRAWN, not skipped",
    gapped.map((m) => m.jobs).join(",") === "0,1,0,0,1,0",
    gapped.map((m) => `${m.label}:${m.jobs}`).join(" "));

  // BOOKED and DONE are counted on different dates on purpose: "how much work
  // came in" is about when it was CREATED, "how much happened" is about when
  // it was SCHEDULED. One date for both makes a detailer with a full diary
  // three weeks out look idle.
  const ahead = monthlySeries([
    { status: "confirmed", created_at: at(2026, 9, 2), start_at: at(2026, 11, 2), total_price: 100 },
  ], 6, NOW);
  check("2e · a job booked now for later counts as booked now", ahead[5].booked === 1);
  check("2f · and is not counted as work done", ahead[5].jobs === 0);

  // Only COMPLETED work is revenue. A confirmed booking is a promise.
  const mixed = monthlySeries([
    bk({ start_at: at(2026, 9, 3), final_amount: 100 }),
    { status: "confirmed", start_at: at(2026, 9, 4), created_at: at(2026, 9, 4), total_price: 999 },
    { status: "cancelled", start_at: at(2026, 9, 5), created_at: at(2026, 9, 5), total_price: 999 },
  ], 6, NOW);
  check("2g · revenue counts finished work only", mixed[5].revenue === 100 && mixed[5].jobs === 1,
    `${mixed[5].jobs} jobs, ${mixed[5].revenue}`);
  check("2h · and a cancelled booking is not even a booking", mixed[5].booked === 2);
}

// ─── 3 · the trend ────────────────────────────────────────────────────────
console.log("\n3. this month against last");
{
  const series = (...jobs) => jobs.map((j, i) => ({ key: `k${i}`, label: `M${i}`, jobs: j, revenue: 0, booked: j }));
  check("3a · more is up", trend(series(2, 4)).direction === "up");
  check("3b · less is down", trend(series(4, 2)).direction === "down");
  // A SMALL WOBBLE IS NOT A TREND. One job either way on a detailer doing
  // twenty is noise, and an arrow on it is a claim.
  check("3c · a 4% move is flat", trend(series(100, 103)).direction === "flat",
    `${trend(series(100, 103)).pct}%`);
  // **A FIRST MONTH HAS NO TREND AND MUST NOT CLAIM ONE.** Dividing by a zero
  // baseline is Infinity, which prints as an enormous rise on a detailer who
  // has simply started — the most misleading number this screen could show.
  check("3d · a first month is 'new', never 'up'", trend(series(0, 6)).direction === "new");
  check("3e · and reports no percentage", Number.isFinite(trend(series(0, 6)).pct));
  check("3f · two empty months are flat, not a collapse", trend(series(0, 0)).direction === "flat");
  check("3g · falling to zero IS a collapse", trend(series(5, 0)).direction === "down"
    && trend(series(5, 0)).pct === -100);
  check("3h · one month of history has no trend", trend(series(3)).direction === "flat");
  check("3i · and neither does none", trend([]).direction === "flat");
}

// ─── 4 · the shape of the work ────────────────────────────────────────────
console.log("\n4. the workload");
{
  const rows = [
    bk({ final_amount: 100 }), bk({ final_amount: 200 }), bk({ final_amount: 300 }),
    { status: "cancelled", start_at: at(2026, 9, 2), created_at: at(2026, 9, 2), total_price: 500 },
    { status: "pending", start_at: at(2026, 9, 9), created_at: at(2026, 9, 8), total_price: 400 },
  ];
  const w = workload(rows);
  check("4a · live bookings exclude the cancelled one", w.total === 4);
  check("4b · finished work is counted apart from booked work", w.done === 3);
  check("4c · a waiting request is visible", w.pending === 1);
  check("4d · revenue is the finished work only", w.revenue === 600);
  check("4e · the average is a whole number", w.average === 200);
  check("4f · the cancel rate is a whole percent", w.cancelRate === 20, `${w.cancelRate}`);
  // "100% CANCELLED" ON ONE CANCELLED BOOKING is true and useless, and it is
  // the sort of figure that gets a detailer a phone call they did not deserve.
  check("4g · and is withheld when there is too little to divide by",
    workload([bk({}), { status: "cancelled", start_at: at(2026, 9, 1), created_at: at(2026, 9, 1) }]).cancelRate === null);
  check("4h · an empty business does not divide by zero",
    workload([]).average === 0 && workload([]).revenue === 0 && workload(null).total === 0);
}

// ─── 5 · can their page actually take a booking? ──────────────────────────
// The audit's Q5, and it is NOT "do they have services". A detailer whose
// page cannot be booked is losing money silently and neither of them finds
// out, which is the worst shape a defect can have in this product.
console.log("\n5. is their page bookable");
{
  const ok = { business: { status: "active" }, counts: { services: 3, hoursOpen: true }, settings: {} };
  check("5a · services and open days and not suspended", bookability(ok).ok === true);
  check("5b · no services is not bookable",
    bookability({ ...ok, counts: { services: 0, hoursOpen: true } }).reasons.includes("no active services"));
  check("5c · no open day is not bookable",
    bookability({ ...ok, counts: { services: 3, hoursOpen: false } }).reasons.includes("no open days"));
  check("5d · suspended is not bookable",
    bookability({ ...ok, business: { status: "paused" } }).reasons.includes("suspended"));
  // EACH REASON IS ITS OWN, because "not bookable" is not an instruction —
  // the missing piece is.
  check("5e · and every missing piece is named, not just the first",
    bookability({ business: { status: "paused" }, counts: { services: 0, hoursOpen: false }, settings: {} })
      .reasons.length === 3);
  check("5f · request mode is bookable, and says so",
    bookability({ ...ok, settings: { booking_mode: "request" } }).mode === "request");
}

// ─── 6 · what WE still owe them ───────────────────────────────────────────
// Idea 25. He is the constraint on every website-plan customer and there was
// no list of what is outstanding. These are things HE does, which is why they
// are deliberately not part of the detailer's own seven-step setup.
console.log("\n6. what he still owes them");
{
  const none = owedByUs({ business: { site_url: "https://x.com" }, domains: [{ domain: "x.com", verified_at: "now" }], counts: { photos: 4 } });
  check("6a · a finished tenant owes nothing", none.length === 0, JSON.stringify(none));
  check("6b · no site is on the list",
    owedByUs({ business: {}, domains: [], counts: { photos: 1 } }).some((o) => o.key === "site"));
  check("6c · a domain added and never pointed here is on the list",
    owedByUs({ business: { site_url: "x" }, domains: [{ domain: "a.com", verified_at: null }], counts: { photos: 1 } })
      .some((o) => o.key === "domain"));
  check("6d · a verified domain is not",
    !owedByUs({ business: { site_url: "x" }, domains: [{ domain: "a.com", verified_at: "now" }], counts: { photos: 1 } })
      .some((o) => o.key === "domain"));
  // NO DOMAIN AT ALL IS NOT A DEBT — most detailers are on our address on
  // purpose, and listing it would put a permanent item on every tenant.
  check("6e · a tenant with no domain at all owes nothing about domains",
    !owedByUs({ business: { site_url: "x" }, domains: [], counts: { photos: 1 } }).some((o) => o.key === "domain"));
  check("6f · photos are ours to chase", owedByUs({ business: { site_url: "x" }, domains: [], counts: { photos: 0 } })
    .some((o) => o.key === "photos"));
}

// ─── 7 · the subscription, in words ───────────────────────────────────────
console.log("\n7. the subscription");
{
  check("7a · nothing at all is a warning, not an error",
    billingState(null).tone === "warn" && /no subscription/i.test(billingState(null).label));
  check("7b · paying is good", billingState({ status: "active" }).tone === "good");
  check("7c · a failed payment is bad", billingState({ status: "past_due" }).tone === "bad");
  // **SUSPENDED OUTRANKS THE STATUS WORD**, which is the lesson the live
  // Stripe run taught: end-of-dunning cancels by default, so a row could say
  // `canceled` while the page was dark and nothing said the page was dark.
  check("7d · suspended outranks whatever the status says",
    billingState({ status: "active", suspended_at: "now" }).label === "Suspended");
  check("7e · leaving at period end is a warning, not a cancellation",
    billingState({ status: "active", cancel_at_period_end: true }).tone === "warn");
  // AN UNKNOWN STATUS IS NEVER GOOD. Defaulting to "paying" because Stripe
  // shipped a status we do not know gives the product away.
  check("7f · an unknown status is never reported as paying",
    billingState({ status: "some_new_stripe_word" }).tone !== "good");
  check("7g · and every state has words a person can read",
    ["active", "past_due", "trialing", "incomplete", "canceled", ""].every((st) => {
      const b = billingState({ status: st });
      return typeof b.label === "string" && b.label.length > 0;
    }));
}

// ─── 8 · days since ───────────────────────────────────────────────────────
console.log("\n8. days since");
{
  check("8a · counts whole days", daysSince(at(2026, 9, 10), NOW) === 5);
  check("8b · today is zero", daysSince(at(2026, 9, 15), NOW) === 0);
  check("8c · never is null, not zero", daysSince(null) === null,
    "0 would print as 'today', which is the opposite of 'never'");
  check("8d · and rubbish is null", daysSince("not a date") === null);
}

// ─── 9 · no person is ever returned ───────────────────────────────────────
// `docs/platform-admin-audit-2026-09-06.md` §5: **the aggregate is his, the
// individual customer is theirs.** Everything this module returns is a count,
// a total, a date or a rate. A function here that returned a name or a number
// would be a different product with a different privacy promise — and it is
// the promise the disclosure page already makes on his behalf.
console.log("\n9. the privacy line");
{
  const src = readSource();
  for (const word of ["customer_name", "customer_phone", "customer_email", "customer_address"]) {
    check(`9 · never reads ${word}`, !src.includes(word),
      "the aggregate is his; the individual customer is theirs");
  }
  check("9e · and the module has no import of its own",
    !/^\s*import\s/m.test(src),
    "it is pure arithmetic; an import here is a dependency in a file three screens read");
}
function readSource() {
  // **COMMENTS STRIPPED FIRST**, and without it this file would have failed
  // on correct code: the module's own header names every one of those columns
  // in the sentence FORBIDDING them, so an unstripped read finds the
  // documentation of the rule and calls it a violation. Seven instances of
  // that trap are recorded in CLAUDE.md; this is where the eighth would have
  // been.
  return readFileSync(new URL("../app/src/lib/adminInsight.js", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

