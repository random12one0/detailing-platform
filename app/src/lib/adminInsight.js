// WHAT THE BACK OFFICE'S PAYLOAD ALREADY KNOWS, worked out — with no React
// and no browser in it.
//
// WHY IT IS ITS OWN FILE, and it is the same reason as `lib/setup.js`,
// `lib/attention.js` and `lib/client-list.js`: every number here is one the
// owner will compare against something else — the detailer's own Money
// screen, an invoice, a bank statement — so the arithmetic has to be
// checkable without a DOM. `tests/admin-insight.test.mjs` is what pins it.
//
// AND EVERY INPUT IS ALREADY IN THE PAYLOAD. `platform-admin`'s `get` action
// sends 200 bookings, the subscription, 24 invoices, the domains and the
// counts, and until 2026-09-06 the screen drew almost none of it — the
// audit's Tier 1, and the owner's own complaint in his own words:
//
//   *"I don't wanna have anything that's, like, could be visible hidden
//   because I wanna have the most information to make it the most convenient
//   to me possible."*
//
// So: no new endpoint, no new query, no migration. Nothing below asks the
// server for anything.
//
// THE ONE RULE THIS FILE OBEYS THAT IS NOT ABOUT ARITHMETIC:
// `docs/platform-admin-audit-2026-09-06.md` §5 — **the aggregate is his, the
// individual customer is theirs.** Everything here is a count, a total, a
// date or a rate. Nothing here is a person. A function that returned one
// would be a different product with a different privacy promise, and it is
// the promise the disclosure page already makes on his behalf.

// WHAT A BOOKING WAS WORTH: what was CHARGED, falling back to what was
// QUOTED. A job that has not been finalised has no `final_amount`, and
// treating that as zero makes every busy detailer look idle until they do
// their paperwork. Named here rather than inlined because it is the reason
// this figure can differ from the detailer's own Money screen, and somebody
// will ask.
export const paidFor = (r) => Number(r?.final_amount ?? r?.total_price ?? 0);

const LIVE = (r) => r && r.status !== "cancelled";

// A CALENDAR MONTH KEY, in the reader's own clock. `platform-admin` computes
// its list-level month on the edge function's clock (UTC) and this runs in
// the browser, so the two can disagree for part of a day at a month boundary
// — that is `docs/testing/FINDINGS.md` F-018's parked half (P-11), recorded
// here so the next person to find the discrepancy knows it is known.
const monthKey = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
};

// THE LAST N CALENDAR MONTHS, INCLUDING THE EMPTY ONES — and the empty ones
// are the point. A detailer who booked in March and June and nothing since
// draws as two bars with a gap if the gap is present and as two adjacent bars
// if it is not, and those are opposite stories. Building the spine from the
// CLOCK rather than from the data is what keeps a quiet month visible.
export function monthlySeries(bookings, months = 6, now = new Date()) {
  const spine = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    spine.push({ key, label: monthLabel(key), jobs: 0, revenue: 0, booked: 0 });
  }
  const byKey = new Map(spine.map((m) => [m.key, m]));
  for (const r of bookings ?? []) {
    if (!LIVE(r)) continue;
    // BOOKED and DONE are counted on different dates on purpose. "How much
    // work came in" is about when it was CREATED; "how much work happened"
    // is about when it was SCHEDULED. Counting both on one date makes a
    // detailer with a full diary three weeks out look idle.
    const made = r.created_at && byKey.get(monthKey(r.created_at));
    if (made) made.booked += 1;
    if (r.status !== "completed") continue;
    const done = r.start_at && byKey.get(monthKey(r.start_at));
    if (done) { done.jobs += 1; done.revenue += paidFor(r); }
  }
  return spine;
}

// THIS MONTH AGAINST LAST — the trend arrow, and the reason it exists is that
// "4 jobs this month" is a number with nothing to compare it to. Idea 27.
//
// **A FIRST MONTH HAS NO TREND AND MUST NOT CLAIM ONE.** Dividing by a zero
// baseline gives Infinity, which prints as an enormous rise on a detailer who
// simply started; `direction` is "new" for that, not "up".
export function trend(series) {
  const n = series?.length ?? 0;
  if (n < 2) return { direction: "flat", pct: 0, now: 0, before: 0 };
  const now = series[n - 1], before = series[n - 2];
  if (!before.jobs && !now.jobs) return { direction: "flat", pct: 0, now: 0, before: 0 };
  if (!before.jobs) return { direction: "new", pct: 0, now: now.jobs, before: 0 };
  const pct = Math.round(((now.jobs - before.jobs) / before.jobs) * 100);
  return {
    direction: pct > 4 ? "up" : pct < -4 ? "down" : "flat",
    pct, now: now.jobs, before: before.jobs,
  };
}

// THE SHAPE OF THE WORK, over everything the payload carries (200 bookings).
export function workload(bookings) {
  const all = bookings ?? [];
  const live = all.filter(LIVE);
  const done = live.filter((r) => r.status === "completed");
  const revenue = done.reduce((a, r) => a + paidFor(r), 0);
  const lastBooked = all.reduce((a, r) => (!a || (r.created_at ?? "") > a ? r.created_at : a), null);
  const lastDone = done.reduce((a, r) => (!a || (r.start_at ?? "") > a ? r.start_at : a), null);
  return {
    total: live.length,
    done: done.length,
    cancelled: all.length - live.length,
    pending: live.filter((r) => r.status === "pending").length,
    revenue,
    // ROUNDED TO WHOLE POUNDS. An average job value with pennies on it is a
    // figure that looks more precise than it is — it is a mean over as few as
    // three jobs.
    average: done.length ? Math.round(revenue / done.length) : 0,
    // AS A WHOLE PERCENT, and only when there is enough to divide by. "100%
    // cancelled" on one cancelled booking is true and useless.
    cancelRate: all.length >= 4 ? Math.round(((all.length - live.length) / all.length) * 100) : null,
    lastBooked, lastDone,
  };
}

// **CAN THEIR PAGE ACTUALLY TAKE A BOOKING?** — the audit's Q5, and it is not
// "do they have services". A detailer whose page cannot be booked is losing
// money silently and neither of them finds out, which is the worst shape a
// defect can have in this product.
//
// The three conditions are exactly what the booking page needs to render a
// time: something to sell, a day to sell it on, and a business that is not
// paused. Each returns its own reason, because "not bookable" is not an
// instruction — the missing piece is.
export function bookability({ business, counts, settings }) {
  const reasons = [];
  if (business?.status === "paused") reasons.push("suspended");
  if (!(counts?.services > 0)) reasons.push("no active services");
  if (!counts?.hoursOpen) reasons.push("no open days");
  return {
    ok: reasons.length === 0,
    reasons,
    // A page that takes REQUESTS is bookable in a different sense: nothing is
    // confirmed until the detailer answers, so a quiet request queue is their
    // problem rather than a broken page. Worth saying, never worth hiding.
    mode: settings?.booking_mode === "request" ? "request" : "reserve",
  };
}

// WHAT *HE* STILL OWES THEM — idea 25, and it is the list that exists nowhere
// else. He is the constraint on every website-plan customer, and the things
// below are all work done by HIM rather than by the detailer, which is why
// they do not belong in the seven-step setup progress.
export function owedByUs({ business, domains, counts }) {
  const out = [];
  if (!business?.site_url) out.push({ key: "site", what: "No website built yet" });
  const dom = domains ?? [];
  if (dom.length && !dom.some((d) => d.verified_at)) {
    out.push({ key: "domain", what: `${dom[0].domain} added but not pointed here` });
  }
  // A GALLERY IS OURS TO CHASE, NOT THEIRS TO REMEMBER. Photos are what makes
  // a detailer's site look like a detailer's site, and the one thing every
  // one of them says they will send and does not.
  if (!(counts?.photos > 0)) out.push({ key: "photos", what: "No gallery photos from them" });
  return out;
}

// THE SUBSCRIPTION, IN WORDS RATHER THAN A STRIPE STATUS. `tone` is the
// product's three fixed meanings — good, warning, bad — and never the accent,
// because the accent is identity (design-system law 11b).
export function billingState(sub) {
  if (!sub) return { tone: "warn", label: "No subscription", detail: "They are on the product for nothing." };
  const s = String(sub.status ?? "");
  if (sub.suspended_at) return { tone: "bad", label: "Suspended", detail: "Their booking page is offline." };
  if (s === "past_due") return { tone: "bad", label: "Payment failed", detail: "Retrying — page still up." };
  if (s === "canceled" || s === "cancelled") return { tone: "bad", label: "Cancelled", detail: "Nothing further will be charged." };
  if (sub.cancel_at_period_end) return { tone: "warn", label: "Leaving", detail: "Cancels at the end of this period." };
  if (s === "trialing") return { tone: "warn", label: "On trial", detail: "Not paying yet." };
  if (s === "active") return { tone: "good", label: "Paying", detail: "" };
  if (s === "incomplete") return { tone: "warn", label: "Checkout unfinished", detail: "They started and did not finish." };
  return { tone: "warn", label: s || "Unknown", detail: "" };
}

// HOW MANY DAYS AGO, as a number rather than a sentence, so the CALLER
// decides the words. Two screens phrase this differently and both are right;
// what they must not do is disagree about the arithmetic.
export function daysSince(iso, now = new Date()) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((now.getTime() - t) / 86_400_000);
}
