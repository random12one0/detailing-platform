// THE MAIL WE SENT, AND WHAT BECAME OF IT — one implementation, THREE screens.
//
// ROADMAP 14.3 built this list and put it on the CLIENT record. ROADMAP 5.3
// found the half it could not answer: a detailer standing over a finished job
// asking *"did the receipt go out?"* was on the wrong screen to be asked, and
// the answer was two taps away on a person rather than on the job. So the same
// rows now draw in both places and this file is the only copy of them.
//
// ROADMAP 3.1 ADDED THE THIRD — Andrew, 2026-10-09: *"both should be able to
// see."* The back office got a platform-wide list of every detailer's mail;
// this is the detailer's own, business-wide, under their own session. Both of
// the first two answer *"did THIS person get it?"*, and neither answers *"is
// my mail going out at all?"* — which is the question 3.1's title is.
//
// **WHY A COMPONENT AND NOT A SECOND BLOCK OF JSX.** The seven stored states
// collapse into three words a person reads, and the collapse is a JUDGMENT —
// `refused` means our own daily limit and `failed` means the provider said no,
// and both have to read as "it did not go" without reading as the customer's
// fault. Two copies of that mapping is two screens that can disagree about
// whether an email bounced, which is the one thing this list exists to say.
//
// The rows are READ-ONLY here because they are read-only in the database:
// `email_sends` grants a browser `select` and nothing else, so no screen can
// mark a bounce delivered however hard it tries. The service role writes every
// row, from `send-email` and from Resend's own webhook.

import { Fragment } from "react";
import { AlertCircle, Check } from "lucide-react";
import { localDate } from "../lib/format.js";
import { appIntlLocale, t } from "../lib/appI18n.js";

// ROADMAP 14.3 — THE SEVEN STORED STATES, TURNED INTO THREE A PERSON READS.
//
// Andrew asked for *"confirmed, or show if it bounced or if it went through
// properly"* — three answers, not seven. `email_sends` keeps the seven because
// the difference between "the provider refused it" and "our own daily
// allowance refused it" matters when somebody is fixing the cause; the row on
// these screens is for the detailer who wants to know whether to phone instead.
//
// `ok: false` is drawn in `--bad`, which is the fixed red and does not follow
// the tenant (law 11b): this is meaning, not identity.
export const MAIL_STATE = {
  delivered: { word: "Delivered", ok: true },
  // WE HANDED IT OVER AND THE PROVIDER TOOK IT, which is all we know until the
  // delivery webhook says more. Not called "Sent" on the screen, because "sent"
  // is what a detailer would read as finished.
  sent: { word: "On its way", ok: null },
  bounced: { word: "Bounced", ok: false },
  complained: { word: "Marked as spam", ok: false },
  failed: { word: "Refused", ok: false },
  // OUR FAULT, AND IT SAYS SO. A detailer reading "refused" about their own
  // customer's address would go and check an address that is perfectly fine.
  refused: { word: "Not sent — our daily limit", ok: false },
  skipped: { word: "Not sent", ok: false },
};

const shortDate = (d) => new Date(`${d}T12:00:00`)
  .toLocaleDateString(appIntlLocale(), { weekday: "short", month: "short", day: "numeric" });

// ROADMAP 3.1c — WHICH OF THREE BANDS A SEND FALLS IN, by the business's own
// calendar (the same `localDate` the row's date uses, so a send never sits
// under "Today" while its own line says yesterday). The list is already
// newest-first, so a band is a run of neighbors and the labels are drawn in
// place: a divider, never a control that hides anything.
const band = (day, today) => (day === today ? "Today" : day.slice(0, 7) === today.slice(0, 7) ? "This month" : "All time");

/**
 * `rows` is null while it loads and an array once it has, which is this
 * repo's rule everywhere: an empty list and a list nobody has fetched are
 * different facts and a spinner is the difference.
 *
 * `cap` is the number the CALLER asked the database for. It is passed in
 * rather than assumed so the "n most recent" line cannot claim a limit that
 * was never applied — the client record asks for twelve and a job record asks
 * for fewer, and a hard-coded number here would be wrong on one of them.
 *
 * `error` IS WHY THIS COMPONENT OWNS THE EMPTY SENTENCE — ROADMAP 3.1. All
 * three callers used to read `.then(({ data }) => setMail(data ?? []))`, so a
 * read that FAILED drew *"No emails sent to this address yet."* — the product
 * stating, in a complete sentence, the one thing 3.1 exists to stop it getting
 * wrong. A failed read and an empty table are different facts; one guard here
 * is smaller than three, and the empty sentence is suppressed rather than
 * raced. Same shape `Maintenance.jsx` already uses: `rows.length === 0 &&
 * !error`.
 *
 * `groups` draws the Today / This month / All time dividers (ROADMAP 3.1c). Off
 * on a client record and a job, where the list is a dozen rows or fewer.
 *
 * `to` draws the RECIPIENT on its own line, for the business-wide list where
 * the address is the only thing identifying whose mail a row is. It is off on
 * a client record and on a job, where the address is already the button three
 * sections up and printing it twice is Part B row 18.
 */
export default function EmailTrail({ rows, timezone, cap, empty, error = "", to = false, groups = false }) {
  const today = localDate(new Date(), timezone);
  let last = null;
  return (
    <>
      <div className={`rows${rows === null ? " refreshing" : ""}`}
        aria-busy={rows === null || undefined}>
        {(rows ?? []).map((m) => {
          const state = MAIL_STATE[m.status] ?? MAIL_STATE.sent;
          const b = groups ? band(localDate(m.sent_at, timezone), today) : null;
          const heading = b && b !== last;
          last = b ?? last;
          return (
            <Fragment key={m.id}>
              {heading && <div className="mail-band" role="heading" aria-level={3}>{t(b)}</div>}
            <div className="row-item" style={{ cursor: "default" }}>
              <span className="txt">
                <span className="nm">{m.subject}</span>
                {/* `addr` RATHER THAN THE DEFAULT `.sub`: `.row-item .sub` is
                    `nowrap` with an ellipsis, and an address clipped to
                    "jordan.mcall…" names nobody — which is the whole job of
                    this line on a business-wide list. theme.css carries the
                    one rule. */}
                {to && <span className="sub addr">{m.to_email}</span>}
                {/* DATE AND OUTCOME ON ONE LINE. The address is not on it —
                    on a client record and on a job it is the button three
                    sections up, and Part B row 18 is this product's own lesson
                    about printing the same fact twice; on the business-wide
                    list it is the `to` line above, which has nothing above it
                    to repeat. */}
                {/* `clamp2` RATHER THAN THE DEFAULT ONE LINE, and it took a
                    screenshot to see: at 392 the line read "that address
                    cannot receive e…", because `.sub` clips and clipped text
                    has a perfectly normal box — theme.css's own warning at
                    `.row-item .sub.full`. Not `full`: the tail of this line is
                    the PROVIDER's wording, capped at 200 characters, and an
                    unbounded row is six lines on a phone. Two is enough for
                    every real bounce message and is a ceiling somebody else
                    cannot raise. */}
                <span className="sub clamp2">
                  {/* `sent_at` is a stored instant; the history rows beside it
                      are business-local dates. Both go through the same two
                      helpers so one record cannot show two different days for
                      the same afternoon. */}
                  {shortDate(localDate(m.sent_at, timezone))}
                  {" · "}
                  <span style={state.ok === false ? { color: "var(--bad)" } : undefined}>
                    {t(state.word)}
                  </span>
                  {/* The provider's own words, only when they add something
                      the word above does not. */}
                  {state.ok === false && m.detail ? ` · ${t(m.detail)}` : ""}
                </span>
              </span>
              {state.ok === true && (
                <Check size={18} strokeWidth={2} aria-hidden="true"
                  style={{ flexShrink: 0, alignSelf: "flex-start", marginTop: 3 }} />
              )}
              {state.ok === false && (
                <AlertCircle size={18} strokeWidth={2} aria-hidden="true"
                  style={{ flexShrink: 0, alignSelf: "flex-start", marginTop: 3, color: "var(--bad)" }} />
              )}
            </div>
            </Fragment>
          );
        })}
      </div>
      {/* THE ERROR REPLACES THE EMPTY SENTENCE, never sits beside it. */}
      {error && <div className="error-box" role="alert">{error}</div>}
      {rows !== null && rows.length === 0 && !error && (
        <p className="quiet">{t(empty)}</p>
      )}
      {rows?.length >= cap && (
        <p className="quiet">{cap} {t("most recent.")}</p>
      )}
    </>
  );
}
