// THE MAIL WE SENT, AND WHAT BECAME OF IT — one implementation, two screens.
//
// ROADMAP 14.3 built this list and put it on the CLIENT record. ROADMAP 5.3
// found the half it could not answer: a detailer standing over a finished job
// asking *"did the receipt go out?"* was on the wrong screen to be asked, and
// the answer was two taps away on a person rather than on the job. So the same
// rows now draw in both places and this file is the only copy of them.
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

/**
 * `rows` is null while it loads and an array once it has, which is this
 * repo's rule everywhere: an empty list and a list nobody has fetched are
 * different facts and a spinner is the difference.
 *
 * `cap` is the number the CALLER asked the database for. It is passed in
 * rather than assumed so the "n most recent" line cannot claim a limit that
 * was never applied — the client record asks for twelve and a job record asks
 * for fewer, and a hard-coded number here would be wrong on one of them.
 */
export default function EmailTrail({ rows, timezone, cap, empty }) {
  return (
    <>
      <div className={`rows${rows === null ? " refreshing" : ""}`}
        aria-busy={rows === null || undefined}>
        {(rows ?? []).map((m) => {
          const state = MAIL_STATE[m.status] ?? MAIL_STATE.sent;
          return (
            <div className="row-item" key={m.id} style={{ cursor: "default" }}>
              <span className="txt">
                <span className="nm">{m.subject}</span>
                {/* DATE AND OUTCOME ON ONE LINE. The address is not repeated —
                    it is the button three sections up on the client record and
                    the line above this list on a job, and Part B row 18 is
                    this product's own lesson about printing the same fact
                    twice. */}
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
          );
        })}
      </div>
      {rows !== null && rows.length === 0 && (
        <p className="quiet">{t(empty)}</p>
      )}
      {rows?.length >= cap && (
        <p className="quiet">{cap} {t("most recent.")}</p>
      )}
    </>
  );
}
