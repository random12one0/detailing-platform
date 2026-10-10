// ROADMAP 3.4f, signal S1 of docs/email-failure-recovery.md — the red line on
// a job's pinned bar when the last email ABOUT THIS BOOKING to its address did
// not arrive. Pure and import-free so `tests/job-mail-warning.test.mjs` reaches
// the production rule rather than a copy of it.
//
// `row` is the newest `email_sends` row with this booking's id and this job's
// address, or null. A later accepted email is the newest row, so the line
// clears itself; nothing is stored and there is no dismiss button.
//
// Returns an English KEY (the caller applies `t()`), or null.
//
// WHY `failed` HAS ONE NEUTRAL SENTENCE: the design splits it into F2 (their
// address, a 4xx) and F3 (our side, a 5xx), but `send-email` stores the
// provider's message and not its status code, so the row cannot tell them
// apart. Saying "bounced" about a good address sends a detailer to check it
// for nothing, so this says what is known and no more.
//
// NOT DRAWN: F7 (email switched off for the platform, Andrew's to see), F8 (a
// maintenance reminder, not a booking), `sent` (no word yet is not a failure),
// and any job whose day has passed (a warning about a finished job is clutter).
export const UNDELIVERABLE = "that address cannot receive email";

export function jobMailWarning(row, { bookingDate, today }) {
  if (!row || !bookingDate || bookingDate < today) return null;
  switch (row.status) {
    case "bounced":
      return "The last email about this job did not reach {to}. Check the address with them, and text or call them instead.";
    case "skipped":
      return row.detail === UNDELIVERABLE
        ? "The last email about this job did not reach {to}. Check the address with them, and text or call them instead."
        : null;
    case "failed":
      return "The last email about this job could not be sent to {to}. Text or call them instead.";
    case "refused":
      return "The last email about this job did not go out. That was our side, not their address. Text them if it matters before the job.";
    case "complained":
      return "{to} marked the last email about this job as spam. Text them instead, and do not email them again.";
    default:
      return null;
  }
}

// ROADMAP 3.4f, signal S3 — the detailer's OWN alerts are not arriving (F-own).
//
// WHO GETS ALERTS: the same list `ownerRecipients` in
// `supabase/functions/_shared/email.ts` builds — the "Also send to" list when
// it has anything in it, otherwise the business's main address. Read from the
// SAVED settings, never the Notifications screen's unsaved edits, because the
// server sends to what is saved.
export function alertAddresses(contactEmail, notificationEmails) {
  const list = (notificationEmails ?? []).map((e) => String(e).trim()).filter(Boolean);
  if (list.length) return [...new Set(list)];
  return contactEmail ? [contactEmail] : [];
}

// `row` is the newest `email_sends` row to ONE alert address. True when that
// address is the problem: it bounced (F1) or cannot receive email at all (F6).
// A later accepted email is the newest row, so the warning clears itself.
//
// NOT `failed` (F2/F3), on purpose: the row cannot tell "the provider refused
// this address" from "the provider was down that minute" (S1 above says why),
// and for an alert address the cost of guessing is "your address is broken"
// drawn over a good one, for as long as the business stays quiet. The usual F2
// — a malformed address — cannot be added on the Notifications screen.
export function ownAlertBroken(row) {
  if (!row) return false;
  return row.status === "bounced" || (row.status === "skipped" && row.detail === UNDELIVERABLE);
}
