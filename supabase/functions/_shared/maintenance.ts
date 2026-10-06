// ROADMAP 2.23 — the sweep's copy of the deadline arithmetic.
//
// THE SECOND COPY OF `app/src/lib/maintenance.js`, and the wall is the one
// that already forced `_shared/brandColor.js` and `_shared/platformBilling.ts`:
// a Supabase edge function is its own Deno bundle and the CLI will not follow
// an import out of `supabase/`. CLAUDE.md allows a second copy in that case
// and charges a test for the permission — `tests/maintenance.test.mjs` runs
// both on the same deadlines and fails on one differing answer.
//
// **THE STAKES ARE THE SAME AS THE PRICE TABLE'S, one step sideways.** There,
// a drift means a number printed is not the number charged. Here, a drift
// means the screen says *due in 3 days* about something the email has already
// called missed — and the customer believes whichever one reached them first.

export const STAGES = [60, 30, 14, 1];

const DAY = 86_400_000;

export interface Deadline {
  due_on: string;
  last_done_on?: string | null;
  repeat_months?: number | null;
  reminded_stage?: number | null;
  cancelled_at?: string | null;
}

export function daysUntil(dateStr: string | null | undefined, today = new Date()): number | null {
  if (!dateStr) return null;
  const due = Date.parse(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(due)) return null;
  const now = Date.parse(`${today.toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.round((due - now) / DAY);
}

export function isMet(d: Deadline, today = new Date()): boolean {
  if (!d?.last_done_on || !d?.due_on) return false;
  const done = Date.parse(`${d.last_done_on}T00:00:00Z`);
  const due = Date.parse(`${d.due_on}T00:00:00Z`);
  if (Number.isNaN(done) || Number.isNaN(due)) return false;
  if (done > due) return true;
  if (!d.repeat_months) return done <= due;
  const windowStart = due - d.repeat_months * 30.4 * DAY;
  return done >= windowStart && done <= due;
}

export function stateOf(d: Deadline, today = new Date()): string {
  if (d?.cancelled_at) return "cancelled";
  if (isMet(d, today)) return "met";
  const n = daysUntil(d?.due_on, today);
  if (n === null) return "waiting";
  if (n < 0) return "missed";
  return n <= STAGES[0] ? "due" : "waiting";
}

/**
 * The highest stage the date has reached, never the next one in sequence — so
 * a deadline added eight days out does not fire the 60- and 30-day letters on
 * the way past. **A customer's first word from us about their warranty must
 * never be three emails at once.**
 */
export function stageDue(d: Deadline, today = new Date()): number | null {
  if (stateOf(d, today) !== "due") return null;
  const n = daysUntil(d.due_on, today)!;
  let reached = -1;
  for (let i = 0; i < STAGES.length; i++) if (n <= STAGES[i]) reached = i;
  if (reached < 0) return null;
  return reached >= (d.reminded_stage ?? 0) ? reached : null;
}

// ---------------------------------------------------------------------------
// ROADMAP 0.7 — MAY THIS MAINTENANCE EMAIL GO? (DECISIONS.md, 2026-10-06)
// ---------------------------------------------------------------------------
// The maintenance email sells a booking, so it gets the campaign email's legal
// treatment: the business's postal address and the customer's own opt-out link
// in the footer, and no send without them. **Never a placeholder address** — a
// business without one is SKIPPED and the skip is recorded, not papered over.
//
// Here rather than in the sweep so node can run it (tests/maintenance-legal).
// The order is the order the sweep needs: the switches are the detailer's
// choice and stay silent; an unreachable customer is the same three checks
// `send-campaign` makes; only then does a missing address become a recorded skip.

export type MaintenanceVerdict =
  | { send: true; mailingAddress: string }
  | { send: false; reason: "switched_off" | "unreachable" }
  | { send: false; reason: "no_mailing_address"; detail: string };

export const NO_ADDRESS_DETAIL =
  "Not sent: the business has no mailing address, and the law requires one at the bottom of this email.";

export function maintenanceVerdict(input: {
  settings: { email_customer_reminder?: boolean; email_customer_maintenance_due?: boolean };
  customer: { email?: string | null; unsubscribed_at?: string | null; email_failed_at?: string | null } | null;
  mailingAddress: string | null | undefined;
}): MaintenanceVerdict {
  const { settings, customer } = input;
  // BOTH SWITCHES, the parent first: turning customer email off stops this, and
  // the parent alone can never turn it on. The second defaults off and is
  // binding (MANAGER-CLOSE-2026-09-21 § 2).
  if (!settings?.email_customer_reminder || !settings?.email_customer_maintenance_due) {
    return { send: false, reason: "switched_off" };
  }
  if (!String(customer?.email ?? "").trim() || customer?.unsubscribed_at || customer?.email_failed_at) {
    return { send: false, reason: "unreachable" };
  }
  const mailingAddress = String(input.mailingAddress ?? "").trim();
  if (!mailingAddress) return { send: false, reason: "no_mailing_address", detail: NO_ADDRESS_DETAIL };
  return { send: true, mailingAddress };
}
