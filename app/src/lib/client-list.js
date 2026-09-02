// The Clients list's arithmetic, with no React and no browser in it.
//
// WHY IT IS ITS OWN FILE (roadmap 2.11 step 6 stage 5, 2026-09-02): the same
// reason `accountant-export.js` is. Three of the four things below decide
// something a person acts on — which customer is "gone", who ends up on the
// end of a group text, and what a screen prints as the last time somebody was
// in — and `tests/client-list.test.mjs` can only pin them if they can be
// imported without a DOM. Part B row 6 was a defect of exactly this kind: a
// booking still in the future printed as a past visit, and nothing could have
// caught it because the arithmetic lived inside a component.

import { localDate } from "./format.js";

// "Not been back in a while", for a trade whose repeat cycle is
// monthly-to-quarterly. The chip on the screen says "3 months"; this is what
// that means in days, and the two must move together.
export const LAPSED_DAYS = 90;

// Whole days from a to b, both "YYYY-MM-DD" business-local dates. UTC on
// purpose: these are calendar dates, not instants, and building them in local
// time makes the answer depend on the machine running it.
export function daysBetween(a, b) {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

// "3 weeks ago" — the answer to the second job the Clients screen exists for,
// in the words a person uses. A date would make you do the subtraction.
export function agoWords(last, today) {
  if (!last) return "Never";
  const d = daysBetween(last, today);
  if (d <= 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 28) { const w = Math.round(d / 7); return `${w} week${w === 1 ? "" : "s"} ago`; }
  if (d < 365) { const m = Math.max(1, Math.round(d / 30)); return `${m} month${m === 1 ? "" : "s"} ago`; }
  const y = Math.round(d / 365);
  return `${y} year${y === 1 ? "" : "s"} ago`;
}

// Completed bookings -> { phone: { visits, spend, last } }.
//
// THE CALLER MUST ONLY PASS JOBS THAT ARE COMPLETED AND HAVE ENDED, and it
// does that in the query (`status = completed`, `end_at <= now`) so the
// database does the filtering. This function is deliberately not a second
// place that knows the rule — but the test passes it a forward-dated job to
// prove what would happen if that query ever loosened.
export function summarise(rows, tz) {
  const m = new Map();
  for (const b of rows ?? []) {
    const key = b.customer_phone;
    if (!key) continue;
    const date = localDate(b.end_at, tz);
    const row = m.get(key) ?? { visits: 0, spend: 0, last: null };
    row.visits += 1;
    row.spend += Number(b.final_amount ?? b.total_price ?? 0);
    if (!row.last || date > row.last) row.last = date;
    m.set(key, row);
  }
  return m;
}

// The list as it is drawn: each customer with their figures, filtered and
// ordered. `sort` is "recent" | "spent" | "away".
export function arrange(customers, totals, { sort = "recent", lapsed = false, today }) {
  const list = (customers ?? []).map((c) => ({
    c, ...(totals.get(c.phone) ?? { visits: 0, spend: 0, last: null }),
  }));
  const filtered = lapsed
    ? list.filter((r) => !r.last || daysBetween(r.last, today) >= LAPSED_DAYS)
    : list;
  // SOMEBODY WITH NO COMPLETED VISIT SORTS LAST IN BOTH DIRECTIONS. Never
  // been in is not the same as been away a long time, and leading "Longest
  // away" with people who have never visited answers a different question
  // than the one the control asks.
  const byLast = (a, b, dir) => {
    if (!a.last && !b.last) return 0;
    if (!a.last) return 1;
    if (!b.last) return -1;
    return dir * (a.last < b.last ? -1 : a.last > b.last ? 1 : 0);
  };
  const out = [...filtered];
  if (sort === "spent") out.sort((a, b) => b.spend - a.spend);
  else if (sort === "away") out.sort((a, b) => byLast(a, b, 1));
  else out.sort((a, b) => byLast(a, b, -1));
  return out;
}
