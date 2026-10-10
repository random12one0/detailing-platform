// WHAT THE NEW BACK OFFICE'S DETAILERS PLACE KNOWS ABOUT ONE DETAILER, worked
// out with no React and no browser (ROADMAP 9.12a, slice 1).
//
// EVERY INPUT IS ALREADY ON THE WIRE. `platform-admin`'s `list` sends the row
// and `get` sends the bookings, invoices and history; nothing here asks the
// server for anything, so this slice needed no deploy. The three questions it
// answers are the ones Andrew's list rows ask: how healthy, what is the one
// thing wrong, and how can he reach them.
//
// IT REUSES, IT DOES NOT RE-DECIDE. What counts as quiet, what setup is and what
// to say to a person with no phone number are `attention.js`, `setup.js` and
// `adminInsight.js`; copying a threshold here would be a second number about the
// same thing, and the 9.12 audit was exactly that. `tests/office-detailers.test.mjs`
// pins the parts that are this file's own.

import { phoneOf, reasonsFor, actionFor, QUIET_DAYS, SETUP_FLOOR } from "./attention.js";
import { billingState, daysSince } from "./adminInsight.js";
import { setupProgress } from "./setup.js";

export const setupOf = (r) => setupProgress(r.setup_inputs);

// ── HOW TO REACH THEM ──────────────────────────────────────────────────────
// **A BUTTON EXISTS ONLY IF ITS DESTINATION DOES.** Text and Call need a phone
// number, Email needs an address; an account with neither gets no buttons and
// the screen says so in words. This is 9.12's rule ("Ring them" over an account
// with no phone) kept at the one place every button is decided.
export function contactOf(r) {
  const phone = phoneOf(r);
  const email = String(r?.owner_email ?? "").trim() || null;
  const digits = phone ? phone.replace(/[^\d+]/g, "") : null;
  return {
    phone, email,
    tel: digits ? `tel:${digits}` : null,
    sms: digits ? `sms:${digits}` : null,
    mail: email ? `mailto:${email}` : null,
  };
}

// ── WHERE THEY STAND, IN ONE WORD ──────────────────────────────────────────
// The order is the order of seriousness: switched off beats a failed card beats
// quiet beats still-setting-up. `setup` means "has not got going": setup under
// the floor AND no booking yet, so a working detailer who skipped a step is not
// called a beginner.
export function statusOf(r) {
  if (r.status === "paused" || r.subscription?.suspended_at) return { key: "suspended", label: "Suspended", color: "mute" };
  if (r.subscription?.status === "past_due") return { key: "late", label: "Payment failed", color: "bad" };
  if (setupOf(r).count < SETUP_FLOOR && (r.bookings_total ?? 0) === 0) return { key: "setup", label: "Setting up", color: "cool" };
  if ((r.bookings_total ?? 0) > 0 && (r.days_since_booking ?? 0) >= QUIET_DAYS) return { key: "quiet", label: "Gone quiet", color: "warn" };
  return { key: "live", label: "Live", color: "good" };
}

// ── HEALTH, AND EVERY POINT OF IT EXPLAINED ────────────────────────────────
// A score nobody can take apart is a feeling. It starts at 50, each reason adds
// or takes a stated number of points, and the panel prints the same list, so the
// ring and the sentences beside it cannot disagree. The weights are a judgement
// (they are not measured against churn: there is no churn history yet) and are
// listed here so they can be argued with. Clamped to 0..100.
export function healthOf(r) {
  const parts = [{ points: 0, base: true, text: "Starts at 50" }];
  const add = (points, text) => parts.push({ points, text });
  const sp = setupOf(r);
  const jobs = r.jobs_month ?? 0;
  const bookings = r.bookings_total ?? 0;
  const days = r.days_since_booking;
  const suspended = r.status === "paused" || !!r.subscription?.suspended_at;

  if (jobs > 0) add(Math.min(30, jobs * 3), `${jobs} ${jobs === 1 ? "job" : "jobs"} finished this month`);
  else if (bookings > 0 && !suspended) add(-20, "No jobs finished this month");

  // Setup moves the score by up to 15 either way: half done is neutral.
  add(Math.round((sp.count / sp.total - 0.5) * 30), `Setup ${sp.count} of ${sp.total}`);

  if (suspended) add(-40, "Suspended");
  else if (r.subscription?.status === "past_due") add(-25, "Card was declined");
  else if (r.subscription?.cancel_at_period_end) add(-15, "Cancels at the end of the term");
  else if (r.subscription?.status === "active" && r.subscription?.bill_interval === "year") add(10, "Paid for the whole year");

  if (!suspended) {
    if (bookings === 0) add(-15, "Has never taken a booking");
    else if (days !== null && days !== undefined && days >= QUIET_DAYS) add(-25, `No booking in ${days} days`);
  }
  if ((r.customers ?? 0) >= 20) add(10, `${r.customers} customers on file`);

  const raw = 50 + parts.reduce((a, p) => a + p.points, 0);
  return { score: Math.max(0, Math.min(100, raw)), parts };
}

// ── THE ONE THING WRONG ────────────────────────────────────────────────────
// Order is cost-first, like the reasons in `attention.js`. The sentence under it
// is `actionFor`, which already picks wording from what we can reach them on, so
// the line never says "ring" over an account with no phone. `act` is the button
// label, and it is null when there is nobody to reach: a button that cannot go
// anywhere is not offered (see `contactOf`).
const KICKERS = [
  [/payment failed/, "Payment failed", "bad"],
  [/canceling/, "Leaving", "bad"],
  [/never taken a booking/, "Never booked", "warn"],
  [/no booking in/, "Gone quiet", "warn"],
  [/setup stopped at/, "Stuck in setup", "warn"],
  [/no website/, "No website", "cool"],
];

// What the account is worth per month, from its own subscription. null when
// there is no subscription: unknown is not zero (the 9.14 rule), and a missing
// figure must never print as "$0 at risk".
export function monthlyCents(r) {
  const s = r?.subscription;
  if (!s || !Number.isFinite(Number(s.recurring_cents))) return null;
  return Math.round(Number(s.recurring_cents) / (s.bill_interval === "year" ? 12 : 1));
}

export function issueOf(r) {
  const c = contactOf(r);
  const reach = c.phone ? "Text them" : c.email ? "Email them" : null;
  if (r.status === "paused" || r.subscription?.suspended_at) {
    return { kicker: "Suspended", color: "mute", text: "Their booking page is offline.", act: "Reopen", kind: "restore", costCents: null, needsYou: false };
  }
  if (r.is_demo) return null;
  const why = reasonsFor(r);
  if (!why.length) return null;
  const [, kicker, color] = KICKERS.find(([re]) => why.some((w) => re.test(w))) ?? [0, "Needs a look", "warn"];
  return {
    kicker, color,
    text: actionFor(why, { phone: c.phone, email: c.email }),
    act: reach,
    kind: c.phone ? "sms" : c.email ? "mail" : null,
    costCents: monthlyCents(r),
    needsYou: true,
    why,
  };
}

// ── THE LIST'S FILTERS ─────────────────────────────────────────────────────
// EVERY CHIP BUT "EVERYONE" AND "TEST ACCOUNTS" IS ABOUT REAL DETAILERS. Fifteen
// seeded fixtures trip "setting up" and "gone quiet" by construction; counting
// them would put the same fifteen names under every chip. "Everyone" still shows
// every row, so nothing is hidden, only sorted real-first and tagged.
export const FILTERS = [
  ["all", "Everyone", () => true],
  ["need", "Needs you", (r) => !!issueOf(r)?.needsYou],
  ["live", "Live", (r) => !r.is_demo && statusOf(r).key === "live"],
  ["setup", "Setting up", (r) => !r.is_demo && statusOf(r).key === "setup"],
  ["risk", "At risk", (r) => !r.is_demo && ["late", "quiet", "suspended"].includes(statusOf(r).key)],
  ["test", "Test accounts", (r) => !!r.is_demo],
];

// The default order: people who need you first (dearest first), then the rest
// by health, real accounts before fixtures.
export function sortRows(rows, key = "need") {
  const a = [...rows];
  const demo = (r) => Number(!!r.is_demo);
  if (key === "health") return a.sort((x, y) => demo(x) - demo(y) || healthOf(x).score - healthOf(y).score);
  if (key === "earned") return a.sort((x, y) => demo(x) - demo(y) || (y.revenue_month ?? 0) - (x.revenue_month ?? 0));
  if (key === "name") return a.sort((x, y) => String(x.name).localeCompare(String(y.name)));
  const need = (r) => (issueOf(r)?.needsYou ? 1 : 0);
  return a.sort((x, y) =>
    demo(x) - demo(y) || need(y) - need(x)
    || (issueOf(y)?.costCents ?? 0) - (issueOf(x)?.costCents ?? 0)
    || healthOf(y).score - healthOf(x).score);
}

// ── BOOKINGS, WEEK BY WEEK ─────────────────────────────────────────────────
// Weeks counted BACK FROM NOW (week 0 is the last seven days), oldest first, and
// the empty weeks are kept: a gap is the story. Bookings counted when they were
// MADE (`created_at`), cancelled ones left out, the same rule `monthlySeries`
// uses for "work that came in". CEILING: `get` sends the latest 200 bookings by
// start date, so a very busy account's oldest weeks can be short. That is the
// payload's limit, and the panel says "last 12 weeks" about what it was sent.
export function weeklyBookings(bookings, weeks = 12, now = new Date()) {
  const out = Array(weeks).fill(0);
  for (const b of bookings ?? []) {
    if (!b || b.status === "cancelled" || !b.created_at) continue;
    const t = Date.parse(b.created_at);
    if (Number.isNaN(t)) continue;
    const back = Math.floor((now.getTime() - t) / (7 * 86_400_000));
    if (back >= 0 && back < weeks) out[weeks - 1 - back] += 1;
  }
  return out;
}

// Money this detailer has paid the PLATFORM: the paid invoices in the 24 `get`
// sends. null when the invoices were not read, so "unknown" is not "nothing".
export function paidToUs(invoices) {
  if (!Array.isArray(invoices)) return null;
  return invoices.filter((i) => i.status === "paid").reduce((a, i) => a + Number(i.amount_cents || 0), 0);
}

export const billing = billingState;
export { daysSince };
