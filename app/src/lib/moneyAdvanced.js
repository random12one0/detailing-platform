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
// ---------------------------------------------------------------------------
// THREE NAMES FOR MONEY, AND `collected` NOW MEANS WHAT IT SAYS — ROADMAP 14.7
// ---------------------------------------------------------------------------
// **THIS FILE USED TO RETURN THE ACCRUAL FIGURE UNDER THE NAME `collected`,
// AND THE CASH FIGURE UNDER `collectedPaid`.** So the field called *collected*
// counted work finished in the period whether or not a dollar of it had
// arrived, and `Today.jsx` — one screen over — used the same word for money
// actually received (`payment_status === "paid"`). Same word, two meanings,
// two screens. That is ROADMAP 14.6a's defect with a different subject, and it
// is how 5.1's overstatement survived a fix: whoever came to add a "Collected"
// cell would reach for `m.collected`, get the accrual number, and ship the
// overstatement under the one label that promises it cannot happen.
//
// THE THREE WORDS THIS PRODUCT USES, AND THEY DIFFER BY DESIGN:
//
//   earned     work FINISHED in the period, paid for or not. What the chart,
//              the month-on-month comparison and the accountant export all
//              count. Accrual.
//   collected  of that, the part a customer has actually paid. Cash.
//   owed       earned − collected. Work done and not paid for.
//
// `net` IS `earned − spent` AND STAYS THAT WAY — the contradiction ROADMAP
// 14.7 was opened to settle. A cash-basis net would disagree with the six-bar
// chart it is drawn on top of, with the *vs last month* delta beside it and
// with the CSV an accountant opens, all three of which count the work done in
// the period. So the maths does not move; the WORDS do. Nothing in this
// product calls an accrual figure "brought in", "kept" or "taken" any more,
// and `tests/money-overstatement.test.mjs` fails if one starts to again.
//
// **AND NOTHING HERE NEEDED A MIGRATION.** The 8.8 research's most useful
// finding: tips are already `booking_line_items.category = 'tip'`, expenses
// already carry `category`, every booking already has `duration_minutes`, and
// `booking_services` already keeps the name and price of what was sold. The
// figures were always derivable; nobody had derived them.

// WHAT WAS SOLD AT THE JOB RATHER THAN QUOTED UP FRONT — THE ONE LIST, AND IT
// IS EXPORTED SO THERE CAN NEVER BE A SECOND ONE.
//
// **THIS USED TO SAY `add_on, upsell, surcharge, adjustment`, AND THREE OF
// THOSE FOUR CANNOT EXIST.** `booking_line_items_category_check` allows only
// `service, upgrade, add_on, custom, travel_fee, tip, discount`, so `upsell`,
// `surcharge` and `adjustment` were refused outright by Postgres — the first
// insert this repo ever attempted with one came back `23514`. `Money.jsx` held
// its own correct copy of this list, and the comment that used to sit here said
// the two "move together". **They did not.** The Money screen's own tile was
// right and this file's "Sold at the job", its quoted-vs-added bar and its
// "Sells an extra" were all computed from a set that only `add_on` could ever
// match. Nobody saw it because the table was empty until ROADMAP 14.6.
//
// **ANDREW'S RULING, 2026-09-17:** *"anything beyond the base price — any
// upgrade of either package, add-on, a travel fee, whatever — counts as more
// money we made."* So an upgrade, an add-on, a custom charge and a travel fee
// all count.
//
// A DISCOUNT IS IN HERE AND IT IS NEGATIVE ON PURPOSE. It belongs on the same
// side of the ledger, so money taken off at the car nets against money added
// at the car rather than hiding somewhere else. `Money.jsx` has always done
// this; now both do, because both read this.
//
// A TIP IS NOT IN HERE AND IS NOT A SALE. It is money the customer chose to
// give, not work the detailer sold, and this file already reports tips on their
// own (`tipTotal`, `tipRate`, `avgTip`). Counting a tip here would show the
// same dollar twice and stop `quoted + onSite + tips = earned` adding up.
import { keptOf } from "./payPill.js";

export const ON_SITE = new Set(["upgrade", "add_on", "custom", "travel_fee", "discount"]);

// A DISCOUNT IS NOT A SALE EITHER, EVEN THOUGH ITS MONEY BELONGS ABOVE. It
// counts towards the TOTAL sold at the job and not towards HOW MANY JOBS were
// upsold — otherwise a job where the only extra line was $20 off would be
// reported as a job you sold something on.
const A_SALE = new Set([...ON_SITE].filter((c) => c !== "discount"));

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
// **HOW MANY FINISHED JOBS A RATE NEEDS UNDER IT — 2026-09-12.**
//
// Below this, every rate, percentage and superlative on both money screens is
// withheld and the figures that are simply counted are shown instead. A
// *most booked* service with a count of one is not a most-booked service, and
// a return rate over two people is not a rate.
//
// **ONE NUMBER, HERE, BECAUSE TWO SCREENS ENFORCE IT.** The advanced screen
// hides whole panels and Money hides one pair of cells; if each kept its own
// copy of the threshold they would drift, and a detailer would meet a screen
// that had decided it had enough jobs beside one that had decided it had not.
export const RATE_FLOOR = 8;

export function advancedMoney({
  bookings = [], expenses = [], lineItems = [], period, previous = null, history = null,
} = {}) {
  const completed = bookings.filter((b) => b.status === "completed");
  const jobsIn = (p) => (p ? completed.filter((b) => inRange(b.booking_date, p)) : []);

  const jobs = jobsIn(period);
  const prevJobs = jobsIn(previous);

  // ROADMAP 97.82 — A REFUND COMES OFF EARNED. Money refunded in Stripe leaves
  // `payment_status` at "paid" (97.68), so this read the bare price and the Money
  // screen counted a job refunded in full as earned AND collected. Subtracting it from
  // collected alone would have shown it as OWED, which is false; a third bucket would
  // have left Net counting money handed back. So the job is worth what it KEPT — the
  // same reading as the pill and Today (`keptOf`) — and earned, collected, owed, Net,
  // the chart and the accountant file's Amount all follow, still adding up.
  const paidOf = (b) => keptOf(b, num(b.final_amount ?? b.total_price));
  const sum = (rows, f) => rows.reduce((s, r) => s + f(r), 0);

  const earned = sum(jobs, paidOf);
  const prevEarned = sum(prevJobs, paidOf);

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
  // COUNTED FROM THE SALES, NOT FROM EVERY LINE — see `A_SALE` above: a job
  // whose only extra line was a discount is not a job you sold something on.
  const upsoldJobs = new Set(
    items.filter((li) => A_SALE.has(li.category)).map((li) => li.booking_id),
  ).size;

  const tipItems = items.filter((li) => li.category === "tip");
  const tipTotal = sum(tipItems, amountOf);
  const tippedJobs = new Set(tipItems.map((li) => li.booking_id)).size;

  // Tips are not a sale, so they sit outside the quoted/added split rather
  // than inflating what was sold at the job.
  const quoted = Math.max(0, earned - onSite - tipTotal);

  // ── what it was worth ─────────────────────────────────────────────────────
  const net = earned - outNow;
  const prevNet = prevEarned - outPrev;

  // HOURS ARE THE BOOKED WINDOW, which is the only honest number available:
  // nobody clocks in.
  //
  // **AND IT IS `end_at − start_at`, NOT `duration_minutes`.** The 8.8 research
  // said every booking carried a duration and it does not — there is no such
  // column, and the first build of this file produced a wage of "—" on a
  // dashboard with four finished jobs on it. `start_at` and `end_at` are both
  // `not null` with a CHECK that the end is after the start, so the window is
  // always there and is the better source anyway: it is the time the detailer
  // actually blocked out. A caller that has computed a duration of its own can
  // still pass one.
  const minutesOf = (b) => {
    const given = num(b.duration_minutes);
    if (given > 0) return given;
    if (!b.start_at || !b.end_at) return 0;
    const ms = new Date(b.end_at).getTime() - new Date(b.start_at).getTime();
    return Number.isFinite(ms) && ms > 0 ? ms / 60000 : 0;
  };
  const timed = jobs.filter((b) => minutesOf(b) > 0);
  const minutes = sum(timed, minutesOf);
  const hours = minutes / 60;

  // ── who paid, and who has not ─────────────────────────────────────────────
  // PAID means the money is in. A completed job with `pending` on it is work
  // done and not yet paid for, and it is the figure his old screen has no
  // answer to.
  //
  // **ONLY `paid` COUNTS AS COLLECTED, AND THE OTHER THREE STATES ARE A
  // DECISION RATHER THAN AN OVERSIGHT — ROADMAP 14.7.** `payment_status` holds
  // four values. `pending` is nothing received. `partial` means money moved
  // and NOTHING IN THE DATABASE RECORDS HOW MUCH, so counting it whole would
  // overstate and counting it zero understates — it sits in `owed`, which is
  // the safer of the two wrongs and the same call `_shared/connect.ts` makes
  // about refunds. `waived` is work the detailer gave away: it is earned at
  // the quoted price and will never be collected, so it stays in `owed` too
  // rather than being quietly written off where nobody can see it.
  // `tests/money-overstatement.test.mjs` has one target per state and FAILS if
  // a fifth ever appears without somebody deciding which side it falls on.
  const paidJobs = jobs.filter((b) => b.payment_status === "paid");
  const collected = sum(paidJobs, paidOf);
  const owed = earned - collected;

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
    earned,
    prevEarned,
    jobs: jobs.length,
    prevJobs: prevJobs.length,
    avgTicket: jobs.length > 0 ? earned / jobs.length : 0,
    prevAvgTicket: prevJobs.length > 0 ? prevEarned / prevJobs.length : 0,
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
    margin: earned > 0 ? net / earned : 0,
    hours,
    hoursKnown: timed.length,
    hoursMissing: jobs.length - timed.length,
    hourly: hours > 0 ? net / hours : 0,

    // who paid
    collected,
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

// ─────────────────────────────────────────────────────────────────────────────
// WHERE YOUR CUSTOMERS CAME FROM — his correction, 2026-09-10.
//
// *"The campaign is less of, like, a campaign. I want it to be more like... a
// way to know where customers are coming from... I think it'd be cool to be
// able to track, like, oh, this person looked from Yelp, this person looked
// from Google, this person just searched up my website and it came up."*
//
// **SO THE FEATURE IS NOT A CAMPAIGN AND IS NOT ABOUT DISCOUNTS.** The tables
// under it were built for flyers and QR codes (roadmap 4.2) and they answer
// this question perfectly well; what was wrong was the framing, the home and
// one missing line in the browser. This function is the answer in two halves,
// and the halves are different on purpose:
//
//   YOUR LINKS      a link you put on Yelp, on Google, on a flyer. Because the
//                   address carries the link's name, a visit through it can be
//                   joined to the BOOKING that follows — so these rows carry
//                   people, bookings, a rate and money.
//   EVERYONE ELSE   somebody who typed your address in, or followed a search
//                   result. The browser reports where they came FROM, so these
//                   rows say google.com or yelp.com — but nothing ties that
//                   visit to a booking, so they carry people and nothing else.
//
// **THAT ASYMMETRY IS THE WHOLE ARGUMENT FOR MAKING LINKS**, and printing the
// two halves side by side is what makes it obvious without a sentence of
// salesmanship.
//
// Visits arrive with a `date` already derived, for the same reason every other
// screen derives one: `created_at` is UTC and the period is a local date, and
// this file may not know a timezone.

// The handful of places a detailer's customers actually come from, spelled the
// way a person says them. Anything else keeps its own hostname, which is more
// useful than "Other" — a detailer who sees `alignable.com` learns something.
const KNOWN_SOURCE = [
  [/(^|\.)google\./, "Google"],
  [/(^|\.)yelp\./, "Yelp"],
  [/(^|\.)facebook\.|(^|\.)fb\.com/, "Facebook"],
  [/(^|\.)instagram\./, "Instagram"],
  [/(^|\.)nextdoor\./, "Nextdoor"],
  [/(^|\.)tiktok\./, "TikTok"],
  [/(^|\.)bing\./, "Bing"],
  [/(^|\.)duckduckgo\./, "DuckDuckGo"],
  [/(^|\.)youtube\./, "YouTube"],
  [/(^|\.)reddit\./, "Reddit"],
  [/(^|\.)thumbtack\./, "Thumbtack"],
  [/(^|\.)angi\.|(^|\.)angieslist\./, "Angi"],
];

export function sourceName(referrer) {
  const raw = String(referrer || "").trim();
  // NO REFERRER IS NOT "UNKNOWN" — it is the commonest good case: somebody
  // typed the address, used a bookmark, or followed a link out of a text
  // message. Calling it unknown reads as a fault in the tracking.
  if (!raw) return "Typed in or a bookmark";
  let host = "";
  try { host = new URL(raw).hostname.toLowerCase().replace(/^www\./, ""); } catch { host = ""; }
  if (!host) return "Typed in or a bookmark";
  const known = KNOWN_SOURCE.find(([re]) => re.test(host));
  return known ? known[1] : host;
}

/**
 * @param campaigns rows with id, name, slug, is_active
 * @param visits    rows with campaign_id, visitor_id, referrer and a derived
 *                  local `date`
 * @param bookings  the period's bookings, with campaign_id and an amount
 * @param period    {start, end}
 */
export function whereFrom({ campaigns = [], visits = [], bookings = [], period } = {}) {
  // NO PERIOD MEANS ALL TIME, and that is not a convenience default — it is
  // what the Business screen needs. That screen has no period control on it,
  // so asking it to invent one would make its summary disagree with itself
  // every time Money moved. `inRange` itself is untouched: its three other
  // callers all pass a real period, and widening a shared helper to serve one
  // caller is how a fourth definition of "this period" gets born.
  const seen = period ? visits.filter((v) => inRange(v.date, period)) : visits;
  // A PERSON, NOT A PAGE LOAD. Somebody who opens the booking page three times
  // deciding on a package is one person thinking about it, and counting those
  // as three would make every conversion rate on this screen a third of the
  // truth. `visitor_id` is the id in that browser's own storage.
  const peopleIn = (rows) => new Set(rows.map((v) => v.visitor_id).filter(Boolean)).size;

  const live = bookings.filter((b) => b.status !== "cancelled");
  // ROADMAP 97.83 — WHAT THE JOB KEPT, the same reading as `advancedMoney` (97.82). The
  // bare price here left a job refunded in full counted as earned under its link, on
  // Tracking links and Money's Booking sources, after Money's own Earned stopped counting it.
  const kept = (b) => keptOf(b, num(b.final_amount ?? b.total_price));

  const links = campaigns.map((c) => {
    const mine = seen.filter((v) => v.campaign_id === c.id);
    const booked = live.filter((b) => b.campaign_id === c.id);
    const people = peopleIn(mine);
    return {
      id: c.id, name: c.name, slug: c.slug, active: c.is_active !== false,
      people, visits: mine.length,
      bookings: booked.length,
      revenue: booked.reduce((s, b) => s + kept(b), 0),
      // **EARNED AND REVENUE ARE TWO DIFFERENT NUMBERS AND BOTH ARE RETURNED.**
      // `revenue` is every live booking the link produced, which is what the
      // link DID. `earned` is completed jobs only, because money that has not
      // been earned yet is not money — Money, the client record and Tracking
      // links all draw that line in the same place, and a fourth definition of
      // revenue is how two screens start disagreeing about the same flyer.
      earned: booked.filter((b) => b.status === "completed")
        .reduce((s, b) => s + kept(b), 0),
      // **THE RATE IS BOOKINGS OVER PEOPLE, AND IT CAN EXCEED 100%.** A regular
      // who books twice off one visit is two bookings and one person, which is
      // a good month rather than a bug — so it is not clamped, and the screen
      // shows the two numbers it is made of beside it.
      rate: people > 0 ? booked.length / people : 0,
    };
  }).sort((a, b) => b.bookings - a.bookings || b.people - a.people);

  const untagged = seen.filter((v) => !v.campaign_id);
  const others = Object.values(
    untagged.reduce((a, v) => {
      const name = sourceName(v.referrer);
      const row = a[name] || { source: name, people: new Set(), visits: 0 };
      if (v.visitor_id) row.people.add(v.visitor_id);
      row.visits += 1;
      a[name] = row;
      return a;
    }, {}),
  ).map((r) => ({ source: r.source, people: r.people.size, visits: r.visits }))
    .sort((a, b) => b.people - a.people || b.visits - a.visits);

  // WHAT THE BUSINESS SCREEN'S ONE-LINE SUMMARY NEEDS, COUNTED HERE so there
  // is still only one arithmetic. That row used to run its own count and it
  // was wrong three ways at once (ROADMAP 5.4): it counted EVERY row in
  // `campaign_visits`, including visits that belong to no link at all — which
  // is the commonest row in that table; it counted visits to links that had
  // been switched OFF while printing a count of live ones beside them; and it
  // counted page loads where Money counts people.
  // MEASURED 2026-09-18, not inferred: across the whole database not one
  // visit was tagged to a campaign, and a single untagged visit to the plain
  // booking page was being reported as "1 link · 1 open".
  // LIVE LINKS ONLY, to match the count of links printed beside it. A row
  // reading "1 link · 40 people" where 39 of them opened last spring's
  // switched-off postcard is two figures that do not belong in one sentence.
  const liveIds = new Set(campaigns.filter((c) => c.is_active !== false).map((c) => c.id));
  const onLive = seen.filter((v) => v.campaign_id && liveIds.has(v.campaign_id));

  return {
    links,
    others,
    // PEOPLE, not page loads — the same call `peopleIn` exists to make.
    linkPeople: peopleIn(onLive),
    linkVisits: onLive.length,
    people: peopleIn(seen),
    visits: seen.length,
    // BOOKINGS THAT CAME THROUGH A LINK, against every booking in the period —
    // the one figure that says how much of this picture is actually being
    // measured. On a dashboard with no links at all it is 0 of 12, which is
    // the honest reading and the reason to make one.
    bookedThroughLink: live.filter((b) => b.campaign_id).length,
    bookedAtAll: live.length,
  };
}
