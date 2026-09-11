// THE ADVANCED MONEY FIGURES — roadmap 8.9, built 2026-09-10.
//
// **HIS BRIEF, AND THE SENTENCE THAT DECIDED THE LIST:** *"it was less about
// just copy everything that I had over, but it was actually think about
// everything that could be tracked that would be useful to see... just wish I
// had a little advanced page where you get to more into those cool statistics
// that you like to see."*
//
// So this is NOT a port of `reference/frontend/src/components/RevenueAndCustomers.jsx`.
// Everything on his own screen that earns its place is here, and six figures
// are here that his screen does not have, each because a detailer has the
// question and nothing in this product answers it:
//
//   MOST POPULAR PACKAGES   his own late addition — *"definitely don't forget
//                           that"* — and it is the only figure here that
//                           changes what a detailer SELLS rather than telling
//                           them how they did.
//   HOW OFTEN YOU UPSELL    he has the money; the RATE is what says whether
//                           asking is worth it. "Nine of twelve jobs" is a
//                           habit; "$340" is an outcome.
//   MARGIN                  net as a share of what came in. One number that
//                           survives a month being busier than the last.
//   PAID vs OWED            money collected against money earned. His old
//                           screen has "booked upfront"; the question a
//                           detailer asks at the end of a month is who has
//                           not paid yet.
//   RETURN RATE             new against returning customers is on his screen;
//                           the SHARE is what tells him whether the follow-up
//                           emails are doing anything.
//   BUSIEST vs BEST-PAYING  most popular days is on his screen. The day that
//                           pays best is a different day, and it is the one
//                           that changes where he puts his effort.
//
// **NO REACT, NO SUPABASE, NO FORMATTING.** Same discipline as
// `lib/adminInsight.js` and `book/core.js`: this file is arithmetic over rows
// somebody else fetched, so the whole thing can be checked by
// `tests/money-advanced.test.mjs` with no browser and no credentials — which
// is the only way fourteen figures ever get checked at all.
//
// **AND NOTHING HERE NEEDED A MIGRATION.** The 8.8 research's most useful
// finding: tips are already `booking_line_items.category = 'tip'`, expenses
// already carry `category`, every booking already has `duration_minutes`, and
// `booking_services` already keeps the name and price of what was sold. The
// figures were always derivable; nobody had derived them.

// What was sold at the job rather than quoted up front. The same set Money
// itself uses — imported rather than re-listed would be better, and it lives
// there as a private constant; if it ever moves, these two move together.
const ON_SITE = new Set(["add_on", "upsell", "surcharge", "adjustment"]);

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const inRange = (dateStr, p) => !!dateStr && dateStr >= p.start && dateStr <= p.end;

// Sunday-first, to match the calendar's own header row.
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// NOON, not midnight. `new Date("2026-09-10")` is parsed as UTC and a business
// west of Greenwich reads the day before — the same trap every screen in this
// product spells out, and a "most popular day" that is wrong by one is worse
// than no figure at all because nobody can tell.
const dayOf = (dateStr) => new Date(`${dateStr}T12:00:00`).getDay();

/**
 * Every figure on the advanced screen, for one period.
 *
 * @param bookings   rows with booking_date, status, final_amount/total_price,
 *                   duration_minutes, payment_status, customer_phone,
 *                   services[{name_at_booking, price_at_booking}]
 * @param expenses   rows with date, amount, category
 * @param lineItems  rows with booking_id, category, amount, quantity
 * @param period     {start, end} — inclusive date strings
 * @param previous   the period before it, for the comparisons
 * @param history    every completed booking EVER, for new-vs-returning. A
 *                   customer is "returning" if they booked before this period
 *                   began, which cannot be answered from the period alone.
 */
export function advancedMoney({
  bookings = [], expenses = [], lineItems = [], period, previous = null, history = null,
} = {}) {
  const completed = bookings.filter((b) => b.status === "completed");
  const jobsIn = (p) => (p ? completed.filter((b) => inRange(b.booking_date, p)) : []);

  const jobs = jobsIn(period);
  const prevJobs = jobsIn(previous);

  const paidOf = (b) => num(b.final_amount ?? b.total_price);
  const sum = (rows, f) => rows.reduce((s, r) => s + f(r), 0);

  const collected = sum(jobs, paidOf);
  const prevCollected = sum(prevJobs, paidOf);

  // ── what went out ─────────────────────────────────────────────────────────
  const spent = expenses.filter((e) => inRange(e.date, period));
  const outNow = sum(spent, (e) => num(e.amount));
  const outPrev = previous
    ? sum(expenses.filter((e) => inRange(e.date, previous)), (e) => num(e.amount))
    : 0;

  // BY CATEGORY, LARGEST FIRST, and an untyped expense is "Other" rather than
  // being dropped — a total that does not add up to the total above it is the
  // fastest way to lose a detailer's trust in the whole screen.
  const byCategory = Object.entries(
    spent.reduce((a, e) => {
      const k = String(e.category || "").trim() || "Other";
      a[k] = (a[k] || 0) + num(e.amount);
      return a;
    }, {}),
  ).map(([name, amount]) => ({ name, amount, share: outNow > 0 ? amount / outNow : 0 }))
    .sort((a, b) => b.amount - a.amount);

  // ── the line items of this period's jobs ──────────────────────────────────
  const ids = new Set(jobs.map((b) => b.id));
  const items = lineItems.filter((li) => ids.has(li.booking_id));
  const amountOf = (li) => num(li.amount) * (li.quantity == null ? 1 : num(li.quantity));

  const upsellItems = items.filter((li) => ON_SITE.has(li.category));
  const onSite = sum(upsellItems, amountOf);
  const upsoldJobs = new Set(upsellItems.map((li) => li.booking_id)).size;

  const tipItems = items.filter((li) => li.category === "tip");
  const tipTotal = sum(tipItems, amountOf);
  const tippedJobs = new Set(tipItems.map((li) => li.booking_id)).size;

  // Tips are not a sale, so they sit outside the quoted/added split rather
  // than inflating what was sold at the job.
  const quoted = Math.max(0, collected - onSite - tipTotal);

  // ── what it was worth ─────────────────────────────────────────────────────
  const net = collected - outNow;
  const prevNet = prevCollected - outPrev;

  // HOURS ARE THE BOOKED DURATION, which is the only honest number available:
  // nobody clocks in. A booking with no duration contributes no hours, so the
  // wage is computed over the jobs that have one — and `hoursKnown` is
  // reported beside it so a screen can say when it is a partial answer rather
  // than printing a wage nobody can account for.
  const timed = jobs.filter((b) => num(b.duration_minutes) > 0);
  const minutes = sum(timed, (b) => num(b.duration_minutes));
  const hours = minutes / 60;

  // ── who paid, and who has not ─────────────────────────────────────────────
  // PAID means the money is in. A completed job with `pending` on it is work
  // done and not yet paid for, and it is the figure his old screen has no
  // answer to.
  const paidJobs = jobs.filter((b) => b.payment_status === "paid");
  const collectedPaid = sum(paidJobs, paidOf);
  const owed = collected - collectedPaid;

  // ── new against returning ─────────────────────────────────────────────────
  // The key is the phone number, which is what `create-booking` de-duplicates
  // a customer on. Falls back to the customer id, then the name, so a fixture
  // without phones still counts rather than reading as "everybody is new".
  const who = (b) => String(b.customer_phone || b.customer_id || b.customer_name || "").trim().toLowerCase();
  const before = new Set(
    (history ?? completed)
      .filter((b) => b.booking_date && period && b.booking_date < period.start)
      .map(who)
      .filter(Boolean),
  );
  const seen = new Set();
  let returning = 0;
  let fresh = 0;
  for (const b of jobs) {
    const k = who(b);
    if (!k || seen.has(k)) continue;      // one person, counted once
    seen.add(k);
    if (before.has(k)) returning += 1; else fresh += 1;
  }
  const people = fresh + returning;

  // TOP SPENDER, over this period. The name is what a detailer recognises;
  // the key is what keeps two Daves apart.
  const spendByPerson = jobs.reduce((a, b) => {
    const k = who(b);
    if (!k) return a;
    const row = a[k] || { key: k, name: b.customer_name || "—", total: 0, jobs: 0 };
    row.total += paidOf(b);
    row.jobs += 1;
    a[k] = row;
    return a;
  }, {});
  const topSpender = Object.values(spendByPerson).sort((a, b) => b.total - a.total)[0] ?? null;

  // ── the week ──────────────────────────────────────────────────────────────
  // BUSIEST AND BEST-PAYING ARE TWO DIFFERENT DAYS and that is the whole point
  // of showing both: Saturday can carry four small washes while Wednesday
  // carries one full correction.
  const week = DAY_NAMES.map((name) => ({ name, jobs: 0, total: 0 }));
  for (const b of jobs) {
    const d = week[dayOf(b.booking_date)];
    if (!d) continue;
    d.jobs += 1;
    d.total += paidOf(b);
  }
  const worked = week.filter((d) => d.jobs > 0);
  const busiestDay = worked.slice().sort((a, b) => b.jobs - a.jobs || b.total - a.total)[0] ?? null;
  const bestDay = worked.slice().sort((a, b) => b.total - a.total)[0] ?? null;

  // ── what actually sells ───────────────────────────────────────────────────
  // **HIS OWN ADDITION, and the only figure here that is about the FUTURE.**
  // Counted by the name recorded ON the booking rather than by service id, so
  // a service that was renamed or deleted still reports under the name the
  // customer actually bought — the same reason `booking_services` keeps
  // `name_at_booking` at all.
  const packages = Object.values(
    jobs.reduce((a, b) => {
      for (const s of b.services ?? []) {
        const name = String(s.name_at_booking || "").trim();
        if (!name) continue;
        const row = a[name] || { name, count: 0, total: 0 };
        row.count += 1;
        row.total += num(s.price_at_booking);
        a[name] = row;
      }
      return a;
    }, {}),
  ).sort((a, b) => b.count - a.count || b.total - a.total);
  const soldCount = packages.reduce((s, p) => s + p.count, 0);
  for (const p of packages) p.share = soldCount > 0 ? p.count / soldCount : 0;

  return {
    // what came in
    collected,
    prevCollected,
    jobs: jobs.length,
    prevJobs: prevJobs.length,
    avgTicket: jobs.length > 0 ? collected / jobs.length : 0,
    prevAvgTicket: prevJobs.length > 0 ? prevCollected / prevJobs.length : 0,
    quoted,
    onSite,
    upsoldJobs,
    upsellRate: jobs.length > 0 ? upsoldJobs / jobs.length : 0,
    avgUpsell: upsoldJobs > 0 ? onSite / upsoldJobs : 0,
    tipTotal,
    tippedJobs,
    avgTip: tippedJobs > 0 ? tipTotal / tippedJobs : 0,
    tipRate: jobs.length > 0 ? tippedJobs / jobs.length : 0,

    // what went out
    spent: outNow,
    prevSpent: outPrev,
    byCategory,

    // what it was worth
    net,
    prevNet,
    margin: collected > 0 ? net / collected : 0,
    hours,
    hoursKnown: timed.length,
    hoursMissing: jobs.length - timed.length,
    hourly: hours > 0 ? net / hours : 0,

    // who paid
    collectedPaid,
    owed,
    paidJobs: paidJobs.length,

    // who they are
    newCustomers: fresh,
    returningCustomers: returning,
    people,
    returnRate: people > 0 ? returning / people : 0,
    topSpender,

    // when, and what
    week,
    busiestDay,
    bestDay,
    packages,
  };
}

export default advancedMoney;
