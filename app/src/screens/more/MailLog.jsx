// EVERY EMAIL THIS BUSINESS SENT, AND WHETHER IT ARRIVED — ROADMAP 3.1.
//
// Andrew, 2026-10-09, asked which audience gets this: *"both should be able to
// see right do what u think is best."* The back office got the platform-wide
// list — every detailer's mail, under the service role, on `/admin`. This is
// the other half: ONE business's mail, under that business's own session.
//
// **WHY IT IS NOT ALREADY ANSWERED BY THE TWO LISTS 14.3 AND 5.3 BUILT.** Both
// of those are scoped to one person — a client record shows mail to that
// customer, a job record shows mail to that booking's address. They answer
// *"did THIS person get it?"* and they are the right screens for it. Neither
// can answer 3.1's own title, *"the owner cannot tell whether emails arrived"*,
// because that question is about the business and you cannot ask it by opening
// two hundred customers one at a time. The only way to see that nothing has
// gone out since Tuesday is a list with no customer in the WHERE clause.
//
// **IT READS THE TABLE DIRECTLY, AND THAT IS THE DIFFERENCE FROM `/admin`.**
// `email_sends` has a `for select` policy scoped by `current_business_ids()`,
// so a detailer's own session returns exactly their rows and nothing else —
// no edge function, no service role, no new server surface. The back office
// needs `platform-admin` for the opposite reason: Andrew is a member of no
// detailer's business, so the same browser query there returns zero rows with
// no error. **One table, two data paths, and picking the wrong one for either
// screen fails silently** (ROADMAP 3.1's own correction, 2026-10-06).
//
// NO SECOND ALARM. *"Alert on permanent failure"* is `customers.email_failed_at`,
// stamped by the Resend webhook and already drawn as *"This address bounced"*
// on the client record. This screen's job is to make the bad rows FINDABLE,
// which is the Problems switch — a filter, not a notification.
//
// READ ONLY, because the table is: `email_sends` grants `authenticated` nothing
// but `select` and has no insert, update or delete policy at all, so there is
// nothing here for a control to change.

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { Segmented } from "../../components/controls.jsx";
// THE WORDS AND THE SEVEN STATES COME FROM THE ONE TABLE THAT OWNS THEM. A
// second vocabulary for `status` is how two screens come to disagree about
// whether an email bounced, which is the one thing these lists exist to say —
// `EmailTrail.jsx`'s own header, and the reason `AdminPage` imports the same
// map rather than copying it.
import EmailTrail, { MAIL_STATE } from "../../components/EmailTrail.jsx";
import { t } from "../../lib/appI18n.js";
import { useAppLocale } from "../../hooks/useAppLocale.js";

// The same 100 the back office asks for, because it is the same question one
// level up, and `email_sends_business_idx` is `(business_id, sent_at desc)` —
// the index this list was anticipated by.
const CAP = 100;
// DERIVED, NEVER LISTED. `MAIL_STATE` decides what counts as a problem; a
// hand-written list here would be a second opinion that drifts the next time a
// state is added, and the admin list derives it the same way from the same map.
const PROBLEMS = Object.keys(MAIL_STATE).filter((k) => MAIL_STATE[k].ok === false);
const FILTERS = [["all", "Everything"], ["bad", "Problems"]];

export default function MailLog() {
  useAppLocale();
  const { business } = useBusiness();
  const [which, setWhich] = useState("all");
  const [rows, setRows] = useState(null);   // null while unknown; an array once the database has answered
  const [error, setError] = useState("");
  // DROPS AN ANSWER THAT LANDS AFTER THE SWITCH MOVED. Without it a slow
  // Everything read can arrive under Problems and paint rows that are not
  // problems — the same guard the back-office list carries.
  const latest = useRef(0);

  const load = useCallback(async (w) => {
    const mine = ++latest.current;
    setRows(null); setError("");
    let q = supabase
      .from("email_sends")
      .select("id, subject, to_email, status, detail, sent_at")
      .eq("business_id", business.id)
      .order("sent_at", { ascending: false })
      // TIES BREAK ON `id` so a refresh cannot shuffle two sends from the same
      // instant — the confirmation and the owner alert leave together, and a
      // list that reorders itself on reload reads as mail arriving twice.
      .order("id", { ascending: false })
      .limit(CAP);
    if (w === "bad") q = q.in("status", PROBLEMS);
    const { data, error: e } = await q;
    if (mine !== latest.current) return;
    // A FAILED READ IS NOT AN EMPTY TABLE. `data ?? []` here would print "no
    // email has been sent yet" over a dropped connection, which is this
    // product telling the owner the exact falsehood 3.1 is about.
    if (e) setError(t("Could not read your sent email: {detail}", { detail: e.message }));
    else setRows(data ?? []);
  }, [business.id]);
  useEffect(() => { load(which); }, [which, load]);

  return (
    /* `data-mail-log` IS FOR THE CHECK, AND IT IS A CONTAINER MARK ONLY.
       `scripts/mail-log.mjs` has to scope to this screen's rows — `.row-item`
       is the ruled row the whole product is built from — and it must NOT be
       able to read the screen's own claim about a state, which is why there is
       no `data-mail-state` here: the three states are recognised by their
       sentences and by `aria-busy`, the way the back-office walk says it should
       have been. */
    <div className="card" data-mail-log="">
      <div className="thoughts">
        {/* THE NON-OBVIOUS FACT, AND NOTHING THE CONTROLS ALREADY SAY. What a
            detailer cannot work out from the rows is the SCOPE: this is the
            whole business, their own notifications included, and it is not the
            same list as the one on a customer. */}
        <p className="quiet" style={{ marginTop: 0 }}>
          {t("Every email this business has sent, newest first: your customers' mail and your own notifications. A customer's record shows only theirs.")}
        </p>

        <Segmented label={t("Which emails")} value={which} options={FILTERS} onChange={setWhich} />

        {/* ROADMAP 3.1a — the scroll bound lives on THIS wrapper, not on
            `.rows` inside `EmailTrail`: see theme.css's note beside
            `.mail-scroll` for why putting it on the flex column itself
            stacked every row's text on the row above it. */}
        <div className="mail-scroll">
          <EmailTrail rows={rows} timezone={business.timezone} cap={CAP} error={error} to groups
            empty={which === "bad"
              ? "Nothing has bounced, been refused or failed to send."
              : "No email has been sent yet."} />
        </div>

        {/* A DEAD END NEEDS A WAY OUT. Moving the switch re-reads, so without
            this the only retry is picking the filter you are not on and coming
            back. */}
        {error && (
          <div className="btnrow">
            <button className="btn" type="button" onClick={() => load(which)}>{t("Try again")}</button>
          </div>
        )}
      </div>
    </div>
  );
}
