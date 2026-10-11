// ROADMAP 99.1 — link the business to its Google Business profile, and unlink.
//
// THIS SCREEN ONLY HOLDS THE LINK. Nothing is sent to Google from here or from
// anywhere else yet: writing to a listing needs the `business.manage` scope,
// which is behind two Google gates (ROADMAP 0.15). The status object says so
// with `syncing: false`, and the screen repeats it while it is false, so a
// connected link never reads as a listing that is being kept in step.
//
// `google-business` decides every word of state (`_shared/googleBusiness.ts`)
// and this file only draws it. OWNER ONLY on the server, 404 for anybody else.

import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { api } from "../../lib/api.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { t } from "../../lib/appI18n.js";
import { useAppLocale } from "../../hooks/useAppLocale.js";

// What a detailer is told when Google said no, or the link stopped working.
// Each says what happened, that the listing itself was not touched, and what to do.
const PROBLEM = {
  refused: "Google did not accept the link, so nothing is connected. Your Google listing has not been changed. Check that you signed in with the Google account that manages your business profile, then try again.",
  broken: "The link to Google stopped working. Your Google listing has not been changed, but it is no longer connected. Connect again to fix it.",
};

export default function GoogleBusiness() {
  useAppLocale();
  const { business } = useBusiness();
  const [link, setLink] = useState(null);      // null while the answer is out
  const [busy, setBusy] = useState("");        // which button is working
  const [msg, setMsg] = useState("");          // a call that did not complete

  const load = useCallback(async () => {
    try {
      setLink(await api.googleBusiness(business.id, "status"));
    } catch (_) {
      // A 404 is staff, which is the ordinary case and not a fault.
      setLink({ unavailable: true });
    }
  }, [business.id]);
  useEffect(() => { load(); }, [load]);

  const act = async (action) => {
    setBusy(action);
    setMsg("");
    try {
      setLink(await api.googleBusiness(business.id, action));
    } catch (_) {
      setMsg(t("Could not reach Google just now. Nothing was changed. Try again in a minute."));
    }
    setBusy("");
  };

  const disconnect = () => {
    if (confirm(t("Disconnect Google? Your Google listing stays exactly as it is."))) act("disconnect");
  };

  if (!link) return <p className="quiet">{t("Checking")}</p>;
  if (link.unavailable) return <p className="body">{t("Only the owner can connect Google.")}</p>;

  const linked = link.state !== "none";
  return (
    <div className="card">
      <div className="section-title" style={{ marginTop: 0 }}>{t("Google Business profile")}</div>
      <p className="quiet" style={{ marginTop: 0, marginBottom: "var(--sp-3)" }}>
        {t("Connect the Google account that manages your business listing. You can disconnect it whenever you like.")}
      </p>

      {!link.available ? (
        <p className="body">{t("Connecting Google is not switched on yet. Nothing for you to do; we will tell you when it is.")}</p>
      ) : (
        <>
          {link.connected && (
            <div className="row-item" style={{ cursor: "default" }}>
              <span className="txt">
                <span className="nm">{t("Connected to {account}", { account: link.account || t("your Google account") })}</span>
              </span>
              <span className="pill completed" aria-label={t("Connected")}><Check size={14} strokeWidth={2.5} /></span>
            </div>
          )}
          {link.connected && !link.syncing && (
            <p className="muted" style={{ margin: "var(--sp-2) 0 var(--sp-3)" }}>
              {t("Your hours, services and photos are not sent to Google yet. Until they are, update your listing on Google yourself. We will tell you when this starts.")}
            </p>
          )}
          {PROBLEM[link.state] && <div className="error-box">{t(PROBLEM[link.state])}</div>}

          <div className="btnrow">
            {!link.connected && (
              <button className="btn oauth" disabled={busy === "start"} onClick={() => act("start")}>
                {busy === "start" ? t("Connecting") : linked ? t("Connect again") : t("Connect Google")}
              </button>
            )}
            {linked && (
              <button className="btn" disabled={busy === "disconnect"}
                onClick={disconnect}>
                {busy === "disconnect" ? t("Disconnecting") : t("Disconnect Google")}
              </button>
            )}
          </div>
        </>
      )}
      {msg && <div className="error-box">{msg}</div>}
    </div>
  );
}
