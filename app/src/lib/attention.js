// Who needs a look, and why — the back office's Q3.
//
// `docs/platform-admin-audit-2026-09-06.md`: the finding was that the back
// office was a good administrative tool and almost no business intelligence —
// every control CHANGED an account and almost nothing said how one was DOING.
// This is the difference between a dashboard you read and one you search.
//
// IN ITS OWN FILE FOR THE REASON `setup.js` AND `client-list.js` ARE: it
// decides what the owner is shown, so a wrong threshold means a failing tenant
// never surfaces and nothing anywhere says so. `tests/attention.test.mjs` runs
// it with no browser and no database.

import { setupProgress } from "./setup.js";

// TWENTY-ONE DAYS, and it is a judgement rather than a measurement. A detailer
// booking six jobs a month has quiet fortnights that mean nothing; three weeks
// with no booking at all is either a holiday or a leaver, and both are worth a
// message. Below fourteen this list would cry wolf and stop being read, which
// is the only way a list like this actually fails.
export const QUIET_DAYS = 21;

// FOUR OF SEVEN. Below this a detailer has not finished enough for their
// booking page to be worth sharing; at four or more they are running. It is
// deliberately not "less than seven" — `where` is a step many detailers never
// press, and nagging a working business forever is how the whole list gets
// ignored.
export const SETUP_FLOOR = 4;

// AT MOST EIGHT. A list of everything is the wall of fields the audit warned
// about; the point is a morning's work, not an inventory.
export const MAX_ROWS = 8;

export function reasonsFor(r) {
  const why = [];
  const setup = r?.setup_inputs ? setupProgress(r.setup_inputs) : null;

  // MONEY FIRST — it is the only reason on this list with a deadline that is
  // not ours to move.
  if (r?.subscription?.status === "past_due") why.push("payment failed");
  if (r?.subscription?.cancel_at_period_end) why.push("canceling at the end of the term");

  // A SUSPENDED BUSINESS IS NOT QUIET, IT IS SWITCHED OFF. Reporting "no
  // booking in 60 days" about an account we suspended ourselves is the list
  // telling him about his own decision.
  if (r?.status !== "paused") {
    // NEVER BOOKED and GONE QUIET are different facts and must not fold
    // together: one is a detailer who never started, the other is one who
    // stopped, and they need opposite conversations.
    if ((r?.bookings_total ?? 0) === 0) why.push("has never taken a booking");
    else if (r?.days_since_booking !== null && r?.days_since_booking !== undefined
             && r.days_since_booking >= QUIET_DAYS) {
      why.push(`no booking in ${r.days_since_booking} days`);
    }
  }

  if (setup && setup.count < SETUP_FLOOR) why.push(`setup stopped at ${setup.count} of ${setup.total}`);
  if (!r?.site_url && !r?.domain) why.push("no website and no domain");
  return why;
}

// BUILT FROM THE UNFILTERED LIST. A search or a chip is a question about part
// of the list; "who needs me" is a question about all of it, and hiding a
// failing tenant because a filter was left on is exactly the silent omission
// this repo refuses everywhere else.
export function needsALook(rows) {
  const out = [];
  for (const r of rows ?? []) {
    // A DEMO OR A TEST FIXTURE NEVER NEEDS A LOOK — testing loop F-014,
    // 2026-09-06. Every one of them trips at least two of these reasons by
    // construction (never booked, setup unfinished, no website), so on the
    // day the loop started this list was **eight rows of test businesses**
    // and nothing else. A list that is meant to be short and is always full
    // of the same names is a list somebody stops reading, which is worse
    // than not having one — and it is exactly the O6 question this screen
    // exists to answer: whether silence means healthy.
    if (r.is_demo) continue;
    const why = reasonsFor(r);
    if (why.length) out.push({ ...r, why });
  }
  // Worst first, by how many things are wrong: a tenant with a failed payment
  // AND no bookings is not two rows below one with neither.
  return out.sort((a, b) => b.why.length - a.why.length).slice(0, MAX_ROWS);
}

// ── EVERY LINE BELOW ONLY SAYS WHAT ITS PRECONDITION ALLOWS — ROADMAP 9.12 ──
// The audit's four complaints were all one fault: a line printed whether or
// not the thing it claims was true. "Ring them" on an account with no phone
// number, "Money at risk" on an account paying nothing, "Booking · last one
// yesterday" on an account with no customers. They live here rather than in
// the screen so `tests/admin-preconditions.test.mjs` can run them.

// The phone rides inside `setup_inputs` because the list payload builds that
// object for `setupProgress`; it is the only copy the row carries.
export const phoneOf = (r) => String(r?.setup_inputs?.business?.contact_phone ?? "").trim() || null;

// [observation, advice with a phone, advice with only an email]. The advice is
// chosen by what we can actually reach them on, never written for a phone call
// and printed over an account with no number.
const WHAT_TO_DO = [
  [/payment failed/,
    "Their card was declined. Chase it before the month ends or the account lapses.",
    "Their card was declined. Chase it before the month ends or the account lapses."],
  [/canceling/,
    "They have asked to stop at the end of the term. Ring them and ask what went wrong.",
    "They have asked to stop at the end of the term. Email them and ask what went wrong."],
  [/never taken a booking/,
    "They signed up and never got going. Ring them and walk them through setup.",
    "They signed up and never got going. Email them and offer to walk them through setup."],
  [/no booking in/,
    "They were taking work and stopped. Ring them before they decide to cancel.",
    "They were taking work and stopped. Email them before they decide to cancel."],
  [/setup stopped at/,
    "They stalled part-way through setup. Finish it with them on the phone.",
    "They stalled part-way through setup. Email them and offer to finish it together."],
  [/no website/,
    "Nothing for their customers to find. Offer to build it.",
    "Nothing for their customers to find. Offer to build it."],
];
export function actionFor(why = [], { phone = null, email = null } = {}) {
  for (const [re, ring, mail] of WHAT_TO_DO) {
    if (!why.some((w) => re.test(w))) continue;
    if (phone) return ring;
    if (email) return mail;
    return "There is no phone number or email on file for them, so nothing here can reach them.";
  }
  return null;
}

// The Detailers list's one-line summary for a row with nothing wrong. `last`
// counts cancelled bookings and `bookings_total` does not, so "No bookings ·
// last one yesterday" was printable; and a booking with no customer behind it
// (fixtures write them) printed "Booking" over "0 customers".
export function activityLine(r, ago) {
  const n = r?.bookings_total ?? 0;
  if (n === 0) return "No bookings yet";
  if ((r?.customers ?? 0) === 0) return `${n} ${n === 1 ? "booking" : "bookings"}, no customers on file`;
  return `Booking · last one ${ago(r.last_booking_at).toLowerCase()}`;
}

// "Money at risk" is money: an account paying nothing has none to lose, and
// the old section said so in its own footnote. Those go to "Not paying yet".
export const splitAtRisk = (items) => ({
  atRisk: items.filter((r) => r.cents > 0),
  notPaying: items.filter((r) => !(r.cents > 0)),
});

// Real detailers before fixtures, order otherwise kept. A sort, not a filter:
// the list never silently hides a row.
export const realFirst = (rows) => [...rows].sort((a, b) => Number(!!a.is_demo) - Number(!!b.is_demo));
