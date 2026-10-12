// 9.12a, slice 6c: the platform-wide mail list. Read through the admin gate,
// never email_sends directly (the owner's browser cannot read tenant mail).
// MAIL_STATE is shared with the old office and the detailer's own email log.
import { useCallback, useEffect, useRef, useState } from "react";
import { MAIL_STATE } from "../../../../components/EmailTrail.jsx";
import { call } from "../../api.js";

const CAP = 100;
const PROBLEMS = Object.keys(MAIL_STATE).filter((key) => MAIL_STATE[key].ok === false);
const FILTERS = [["all", "Everything"], ["bad", "Problems"]];
const dateOf = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "Date not recorded" : d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
};

export default function Mail({ i }) {
  const [which, setWhich] = useState("all");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const latest = useRef(0);
  const read = useCallback(async (filter) => {
    const mine = ++latest.current;
    setRows(null); setError("");
    try {
      const out = await call({ action: "email_list", limit: CAP,
        ...(filter === "bad" ? { statuses: PROBLEMS } : {}) });
      if (mine !== latest.current) return;
      if (!Array.isArray(out?.rows)) throw new Error("the server answered without a list");
      setRows(out.rows);
    } catch (e) {
      if (mine === latest.current) setError(e.message);
    }
  }, []);
  useEffect(() => {
    read(which);
    return () => { latest.current += 1; };
  }, [which, read]);

  return (
    <section className="bo-sec bo-mail" style={{ "--i": i }} aria-label="Email we sent"
             aria-busy={rows === null && !error}>
      <div className="bo-mail-head">
        <h2 className="bo-label">Email we sent</h2>
        <div className="bo-mail-filters" role="group" aria-label="Which emails">
          {FILTERS.map(([key, label]) => <button key={key} type="button"
            aria-pressed={which === key} onClick={() => setWhich(key)}>{label}</button>)}
        </div>
      </div>
      {error ? (
        <div className="bo-mail-error" role="alert" data-mail-state="failed">
          <p>Could not read the email log: {error}</p>
          <button type="button" className="bo-btn ghost" onClick={() => read(which)}>Try again</button>
        </div>
      ) : rows === null ? <p className="bo-none" role="status" data-mail-state="loading">Reading the email log…</p>
        : rows.length === 0 ? <p className="bo-none" role="status" data-mail-state="empty">
          {which === "bad" ? "No email has bounced, been refused or failed to send." : "No email has been sent yet."}
        </p> : (
          <div className="bo-mail-scroll" tabIndex={0} role="region" aria-label="Sent emails">
            <ol className="bo-mail-list">
              {rows.map((m) => {
                const st = MAIL_STATE[m.status] ?? MAIL_STATE.sent;
                return <li key={m.id} data-mail-id={m.id}>
                  <div className="bo-mail-line">
                    <b className="bo-mail-subject">{m.subject}</b>
                    <span className={`bo-mail-status ${st.ok === false ? "bad" : st.ok === true ? "ok" : "pending"}`}>
                      <i aria-hidden="true" />{st.word}
                    </span>
                  </div>
                  <div className="bo-mail-meta">
                    <span>{m.to_email?.split("@")[0]}{m.to_email?.includes("@") && <>@<wbr />{m.to_email.slice(m.to_email.indexOf("@") + 1)}</>}</span>
                    {m.business_name && <span>{m.business_name}</span>}
                    <time dateTime={m.sent_at}>{dateOf(m.sent_at)}</time>
                  </div>
                  {st.ok === false && m.detail && <p className="bo-mail-detail">{m.detail}</p>}
                </li>;
              })}
            </ol>
          </div>
        )}
      {!error && rows?.length >= CAP && <p className="bo-dim bo-mail-cap">{CAP} most recent.</p>}
    </section>
  );
}
