// REPORT A PROBLEM — his note, 2026-09-10.
//
// *"Report a problem — a way for a detailer to say 'there is nowhere to put
// this', sent to me. No code anywhere."*
//
// **IT IS ONE BOX AND A BUTTON, AND EVERYTHING ELSE IS FILLED IN FOR THEM.**
// Who they are, which business, which role, which screen and when are all read
// on the SERVER (`report-problem`), not typed here and not trusted from here.
// That is the difference between a report that can be acted on and "it's
// broken" from an address nobody recognises — and it is the part a detailer
// would never think to include.
//
// **NO CATEGORY PICKER, NO SEVERITY, NO TITLE.** Every one of those is a
// question asked of somebody who is already annoyed, and the answer is never
// the thing that helps. `docs/ux-audit.md` item G's own recommendation was one
// address and a promise about time; this is that, with the tedious part
// removed.
//
// **AND THE ADDRESS IS STILL ON THE SCREEN.** A form is a better path for
// almost everybody and a worse one for a detailer whose problem is that the
// dashboard will not load — so the mail address is printed under it, and the
// phone number with it, as the way through when this screen is the thing that
// is broken.

import { useState } from "react";
import { api } from "../../lib/api.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_SHORT } from "../../lib/support.js";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's.
import { t } from "../../lib/appI18n.js";
import { useAppLocale } from "../../hooks/useAppLocale.js";

const MAX = 4000;

export default function ReportProblem() {
  useAppLocale();
  const { business } = useBusiness();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // {ok, text}

  const send = async () => {
    const body = message.trim();
    if (!body) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.reportProblem(business.id, body, lastScreen());
      // **THE BOX IS CLEARED ONLY ON SUCCESS.** A failed send that also wiped
      // what they wrote would be the product losing the complaint about the
      // product, which is the one failure this screen cannot have.
      setMessage("");
      setMsg({ ok: true, text: t("Sent. You will get an answer the same working day.") });
    } catch (e) {
      setMsg({
        ok: false,
        text: t("That did not send. Email {address} instead — your words are still in the box.",
          { address: SUPPORT_EMAIL }),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="group">
      <p className="body" style={{ marginTop: 0 }}>
        {t("Anything at all — something broken, something confusing, something missing, or a thing you want the dashboard to do. It goes straight to one person.")}
      </p>

      <label className="field">
        <span>{t("What happened")}</span>
        <textarea rows={7} maxLength={MAX} value={message} autoFocus
          placeholder={t("The more you tell me the faster I can fix it. If something went wrong, what you were doing when it did is the most useful part.")}
          onChange={(e) => { setMessage(e.target.value); setMsg(null); }} />
      </label>
      {/* NOT A COUNTER ON EVERY KEYSTROKE — a number that ticks while somebody
          types reads as a limit being enforced on a complaint. It appears once
          they are near the end, which is the only moment it is information. */}
      {message.length > MAX - 400 && (
        <p className="quiet" style={{ marginTop: "calc(-1 * var(--sp-3))" }}>
          {t("{n} characters left", { n: MAX - message.length })}
        </p>
      )}

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}

      <button className="btn primary" disabled={busy || !message.trim()} onClick={send}>
        {busy ? t("Sending…") : t("Send it")}
      </button>

      <hr className="rule" />
      {/* THE WAY THROUGH WHEN THIS SCREEN IS THE BROKEN THING. */}
      <p className="quiet">
        {t(SUPPORT_SHORT)}{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        {" · "}
        <a href={`tel:${SUPPORT_PHONE.replace(/[^\d+]/g, "")}`}>{SUPPORT_PHONE}</a>
      </p>
    </div>
  );
}

// WHICH SCREEN THEY CAME FROM, best effort and never a reason to fail. The
// dashboard's tabs are state rather than addresses, so the URL answers this
// only for a deep-linked settings screen — which is most of the value, because
// a settings screen is where a detailer is when something confuses them. The
// server treats a blank as "(not said)".
function lastScreen() {
  try {
    const q = new URLSearchParams(window.location.search).get("settings");
    return q ? `settings: ${q}` : window.location.pathname;
  } catch {
    return "";
  }
}
