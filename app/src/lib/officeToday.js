// WHAT THE NEW BACK OFFICE'S TODAY PLACE KNOWS, worked out with no React and no
// browser (ROADMAP 9.12a, plan step 2).
//
// EVERY INPUT IS ALREADY ON THE WIRE: `list` sends the rows, `platform_net` sends
// one month's money in and out. Nothing here asks the server for anything new.
// Like officeDetailers.js it REUSES the thresholds in attention.js and setup.js
// rather than restating them. `tests/office-today.test.mjs` runs this file.

import { QUIET_DAYS, SETUP_FLOOR } from "./attention.js";
import { healthOf, issueOf, setupOf } from "./officeDetailers.js";

export const MAX_NEEDS = 5;

// ── "NEEDS YOU": AT MOST FIVE, DEAREST FIRST ───────────────────────────────
// The same test the Detailers place's "Needs you" chip uses (`issueOf().needsYou`),
// so the two lists cannot disagree about who is on them. Dearest first by what the
// account pays us a month; an account with no subscription has no figure, which is
// "unknown" and sorts after every known one rather than counting as $0.
// `more` is how many were left off, so the screen can say so instead of hiding them.
export function needsYou(rows, max = MAX_NEEDS) {
  const all = (rows ?? [])
    .map((row) => ({ row, issue: issueOf(row) }))
    .filter((x) => x.issue?.needsYou)
    .sort((a, b) =>
      (b.issue.costCents ?? -1) - (a.issue.costCents ?? -1)
      || healthOf(a.row).score - healthOf(b.row).score
      || String(a.row.name).localeCompare(String(b.row.name)));
  return { items: all.slice(0, max), more: Math.max(0, all.length - max), total: all.length };
}

// ── THE SIGN-UP PATH ───────────────────────────────────────────────────────
// REAL DETAILERS ONLY (fixtures trip every stage by construction). EACH STAGE IS
// COUNTED ON ITS OWN AGAINST EVERYONE, NOT AS A FUNNEL: a detailer can be booking
// steadily with setup half-finished, and a funnel would file them under "stuck at
// setup" and stop counting them (the old screen recorded the same ruling). So a bar
// can be longer than the one above it, and that is correct.
export function signupPath(rows) {
  const live = (rows ?? []).filter((r) => !r.is_demo);
  const n = live.length;
  const stage = (key, label, fn) => ({ key, label, count: live.filter(fn).length, of: n });
  return {
    of: n,
    stages: [
      stage("signed", "Signed up", () => true),
      stage("started", "Got past the first steps", (r) => setupOf(r).count >= SETUP_FLOOR),
      stage("setup", "Finished setup", (r) => { const s = setupOf(r); return s.count >= s.total; }),
      stage("booked", "Took a booking", (r) => (r.bookings_total ?? 0) > 0),
      stage("active", `Booked in the last ${QUIET_DAYS} days`,
        (r) => (r.bookings_total ?? 0) > 0 && r.days_since_booking != null && r.days_since_booking < QUIET_DAYS),
    ],
  };
}

// ── MONTHS ─────────────────────────────────────────────────────────────────
// `YYYY-MM-01`, oldest first, ending with the month `now` is in. UTC, the same
// frame `platform_net` cuts its period in, so the label and the server agree.
export function lastMonths(n = 12, now = new Date()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`);
  }
  return out;
}

// One month of the chart from a `platform_net` answer. Money out is `null`, not
// zero, when no bill was typed in: a missing bill must never draw as a free month
// (the 9.14 rule). A failed read is its own state and is not an empty month.
export function monthBars(net) {
  if (!net || net.error) return { in: null, out: null, kept: null, failed: true };
  return {
    in: Number(net.revenue_cents ?? 0),
    out: net.costs_entered ? Number(net.cost_cents ?? 0) : null,
    kept: net.costs_entered ? Number(net.net_cents ?? 0) : null,
    failed: false,
  };
}
