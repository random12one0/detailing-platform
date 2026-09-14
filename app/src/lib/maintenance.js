// ROADMAP 2.23 — what a maintenance deadline IS, in arithmetic.
//
// No React and no imports, for the same reason `lib/setup.js` and
// `lib/permissions.js` have none: **the same answers are needed by the screen
// a detailer reads and by the sweep that sends the reminder**, and two
// implementations of "is this one overdue" is how a screen says *due in 3
// days* about something the email already called *missed*.
//
// (The sweep is an edge function and cannot import out of `app/src`, so the
// STAGES below are mirrored in `_shared/maintenance.ts` — the wall that forced
// `_shared/brandColor.js`. `tests/maintenance.test.mjs` pins the two lists
// value for value, which is the price of that permission.)
//
// ---------------------------------------------------------------------------
// THE ESCALATION IS THE POINT, AND IT IS WHY THIS IS NOT A REMINDER.
// ---------------------------------------------------------------------------
// Every other reminder in this product fires once, because the thing it is
// about happens whether or not you read the email. **A warranty that voids does
// not**: if the customer ignores the first one, the correct answer is to ask
// again, louder, and then once more. Four stages over two months, and the last
// one is the day before.
//
// THE NUMBERS ARE DAYS BEFORE THE DEADLINE, largest first, and the index into
// this list IS `reminded_stage` — so a stage that has gone can never go again,
// and a deadline created inside the window starts at whichever stage is
// already due rather than firing all four at once.
export const STAGES = [60, 30, 14, 1];

const DAY = 86_400_000;

/** Whole days from today (UTC) to a `YYYY-MM-DD`. Negative once it is past. */
export function daysUntil(dateStr, today = new Date()) {
  if (!dateStr) return null;
  const due = Date.parse(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(due)) return null;
  const now = Date.parse(`${today.toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.round((due - now) / DAY);
}

/**
 * MET IS DERIVED, NEVER STORED. A stored status is a second answer that goes
 * wrong the moment somebody backdates a service — and backdating is the
 * ordinary case here, because the detailer records the inspection after doing
 * it.
 *
 * A deadline is MET when the last qualifying service happened at any point in
 * the run-up to it. `repeat_months` gives the length of that run-up; a one-off
 * has no window, so anything on or before the date counts.
 */
export function isMet(d, today = new Date()) {
  if (!d?.last_done_on || !d?.due_on) return false;
  const done = Date.parse(`${d.last_done_on}T00:00:00Z`);
  const due = Date.parse(`${d.due_on}T00:00:00Z`);
  if (Number.isNaN(done) || Number.isNaN(due)) return false;
  if (done > due) return true;              // done early for the NEXT one
  if (!d.repeat_months) return done <= due;
  const windowStart = due - d.repeat_months * 30.4 * DAY;
  return done >= windowStart && done <= due;
}

/**
 * One word for what this deadline is, and the ONLY place that decides.
 *
 *   cancelled — the detailer said it no longer applies
 *   met       — the qualifying service is on the record
 *   missed    — the date is past and nothing covers it. **This is the state
 *               the whole feature exists to prevent**, and it is deliberately
 *               not called "overdue": a warranty does not become overdue, it
 *               becomes gone.
 *   due       — inside the first reminder window
 *   waiting   — further out than that
 */
export function stateOf(d, today = new Date()) {
  if (d?.cancelled_at) return "cancelled";
  if (isMet(d, today)) return "met";
  const n = daysUntil(d?.due_on, today);
  if (n === null) return "waiting";
  if (n < 0) return "missed";
  return n <= STAGES[0] ? "due" : "waiting";
}

/**
 * Which escalation stage is due to be sent, or null.
 *
 * IT RETURNS THE HIGHEST STAGE THE DATE HAS REACHED, not the next one in
 * sequence — so a deadline added eight days out does not fire the 60-day and
 * 30-day letters on the way past. **A customer's first word from us about
 * their warranty must never be three emails at once.**
 */
export function stageDue(d, today = new Date()) {
  if (stateOf(d, today) !== "due") return null;
  const n = daysUntil(d.due_on, today);
  let reached = -1;
  for (let i = 0; i < STAGES.length; i++) if (n <= STAGES[i]) reached = i;
  if (reached < 0) return null;
  return reached >= (d.reminded_stage ?? 0) ? reached : null;
}

/** The date the next one falls on once this has been done. */
export function nextDue(d, doneOn) {
  if (!d?.repeat_months) return null;
  const base = new Date(`${doneOn}T00:00:00Z`);
  const day = base.getUTCDate();
  const next = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + d.repeat_months, 1));
  // POSTGRES'S OWN MONTH CLAMP, for the same reason `lib/plans.js` matches it:
  // 31 January plus one month is 28 February, and a date that disagrees with
  // the database is a deadline that moves when somebody edits it.
  const last = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, last));
  return next.toISOString().slice(0, 10);
}

/** What a person should read on a row, in the fewest words that are true.
 *
 *  **THE TRANSLATOR IS AN ARGUMENT, BECAUSE THIS FILE HAS NO IMPORTS.** The
 *  header above is the reason and it is not negotiable: the edge-function copy
 *  and `tests/maintenance.test.mjs` both load this in Node, where `appI18n.js`
 *  cannot be imported at all. It is also the rule `duration(mins, lang)` and
 *  `dateLong(dateStr, lang)` already keep one file over — a shared formatter
 *  must never read the active locale itself.
 *
 *  Both arguments DEFAULT TO ENGLISH, so every existing caller and the whole
 *  test file are unchanged. The dashboard passes `t` and `appIntlLocale()`;
 *  until it did, these six sentences rendered in English on a Spanish screen
 *  and the date inside "Done Jul 13" was hard-coded `en-US`, which is the
 *  failure no catalogue check can see because there is no string to wrap. */
const plain = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => vars?.[k] ?? "");
export function saySoon(d, today = new Date(), tr = plain, intl = "en-US") {
  const state = stateOf(d, today);
  if (state === "cancelled") return tr("No longer applies");
  // **NOT THE RAW ISO DATE — an outside review, 2026-09-11.** This printed
  // `Done 2026-07-13` on a screen a detailer reads between jobs, where every
  // other date in the product reads `Friday, September 11` or `Wed, Sep 16`.
  // An ISO date is for a log.
  // Noon, not midnight: a bare `2026-07-13` is parsed as UTC and prints as the
  // day before for anybody west of Greenwich, which is every detailer this
  // product has.
  if (state === "met") {
    const on = d.last_done_on
      ? new Date(`${d.last_done_on}T12:00:00`).toLocaleDateString(intl,
        { month: "short", day: "numeric", year: "numeric" })
      : null;
    return on ? tr("Done {date}", { date: on }) : tr("Done");
  }
  const n = daysUntil(d.due_on, today);
  if (state === "missed") {
    return n === -1 ? tr("Missed yesterday") : tr("Missed {days} days ago", { days: -n });
  }
  if (n === 0) return tr("Due today");
  if (n === 1) return tr("Due tomorrow");
  return tr("Due in {days} days", { days: n });
}
