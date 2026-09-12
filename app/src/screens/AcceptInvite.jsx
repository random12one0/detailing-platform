// Public invite landing page: /invite/:token — set a password, sign in,
// land in the dashboard.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { MIN_PASSWORD } from "../lib/password.js";
import { PasswordInput } from "../components/controls.jsx";
import { roleName } from "../lib/permissions.js";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

const FN = (name) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;
const headers = {
  "Content-Type": "application/json",
  apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
};

export default function AcceptInvite() {
  useAppLocale();
  const { token } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState(undefined);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${FN("accept-invite")}?token=${encodeURIComponent(token)}`, { headers })
      .then((r) => r.json())
      .then((d) => setInfo(d.error ? { error: d.error } : d))
      .catch(() => setInfo({ error: "Could not check that invite link." }));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(FN("accept-invite"), {
        method: "POST",
        headers,
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not accept the invite.");
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password,
      });
      if (signInError) {
        // The membership exists; they just need to sign in normally.
        navigate("/");
        return;
      }
      navigate("/");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (info === undefined) return <div className="center"><div className="spinner" /></div>;
  if (info.error) {
    return (
      // **A DEAD END WITH A DOOR — an outside review, 2026-09-11.** This was
      // a 234px card floating on black with a title that wrapped mid-phrase
      // (`Invite` / `unavailable`) and nothing after the sentence: no way to
      // sign in, nobody to ask, nothing to press. It is the FIRST thing a new
      // hire ever sees of this product.
      //
      // The pattern already exists one screen over — the bounced-email notice
      // on a client record ends *"Check it with them, or call instead."* A
      // sentence that says what to do next is the whole difference.
      //
      // `minHeight` and the wider card are the other half: 380px is what the
      // form below uses, and at 234px the two words would not sit on one line.
      <div className="center" style={{ minHeight: "100dvh", padding: 16 }}>
        <div className="card" style={{ width: "100%", maxWidth: 380 }}>
          <h1 style={{ marginBottom: 8 }}>{t("Invite unavailable")}</h1>
          <p className="muted">{info.error}</p>
          <p className="muted" style={{ marginTop: 8 }}>
            {t("Ask whoever invited you to send a new link.")}
          </p>
          <a className="btn" href="/app" style={{ marginTop: 16 }}>{t("Go to sign in")}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="center" style={{ minHeight: "100dvh", padding: 16 }}>
      <form onSubmit={submit} className="card" style={{ width: "100%", maxWidth: 380 }}>
        <h1 style={{ marginBottom: 8 }}>Join {info.business_name}</h1>
        <p className="muted" style={{ marginBottom: 16 }}>
          {info.email} · {roleName(info.role, info.label, t)}
        </p>
        <label className="field">
          <span>{t("Choose a password")}</span>
          <PasswordInput value={password} minLength={MIN_PASSWORD} required autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="btn primary" disabled={busy}>{busy ? "Setting up" : "Set up my account"}</button>
      </form>
    </div>
  );
}
