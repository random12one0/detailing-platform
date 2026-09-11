import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { MIN_PASSWORD } from "../lib/password.js";
import ParkedAccounts from "../components/ParkedAccounts.jsx";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

// Which third-party sign-ins this project actually has switched on.
//
// GoTrue publishes this at /auth/v1/settings, so the button appears the
// moment Google is enabled in the Supabase dashboard and never appears
// before — no rebuild, and no button that leads to "provider is not
// enabled". If the lookup fails we simply show email and password, which
// always works.
function useEnabledProviders() {
  const [providers, setProviders] = useState({});
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    let live = true;
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live && d?.external) setProviders(d.external); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return providers;
}

function GoogleMark() {
  // Google's own colours — their brand guidelines require the marque be
  // shown as issued, not tinted to match a theme.
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

export default function Auth() {
  useAppLocale();
  // Arriving from a pricing button means you came to start, not to sign in.
  const params = new URLSearchParams(window.location.search);
  // THREE MODES, NOT TWO. "reset" is asking for the email; it is a mode of
  // this form rather than a page of its own because it is the same card, the
  // same field and the same button, and a second screen would be a second
  // place to keep the Google branch and the layout in step.
  const [mode, setMode] = useState(params.has("plan") || params.has("offer") ? "up" : "in");
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const providers = useEnabledProviders();
  const creating = mode === "up";
  const resetting = mode === "reset";

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    if (resetting) {
      // THE ANSWER IS THE SAME WHETHER OR NOT THE ADDRESS EXISTS, and that is
      // the whole reason this branch returns early instead of showing the
      // error. "No account with that email" turns a sign-in form into a way
      // of asking which of a list of addresses is a customer of ours.
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset`,
      });
      setSent(true);
      setBusy(false);
      return;
    }
    const { error: err } = creating
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    // On success the session arrives through onAuthStateChange and App
    // moves on by itself — a brand new account has no business yet, so it
    // lands in business creation rather than an empty dashboard.
    if (err) setError(err.message);
    setBusy(false);
  };

  const withGoogle = async () => {
    setError("");
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      // Come back to the dashboard, not the marketing page.
      options: { redirectTo: `${window.location.origin}/app` },
    });
    // On success the browser navigates away, so this only runs on failure.
    if (err) { setError(err.message); setBusy(false); }
  };

  return (
    // ROADMAP 2.25 — the ground, the mark and the rhythm. `.authpage` shares
    // `.app-shell`'s lights, drift and grain by SELECTOR rather than by a
    // second copy of them (theme.css says why), and `.app-dots` is the same
    // element the dashboard renders. Before this the first screen anybody
    // meets was a flat fill with an unlabelled card on it.
    <div className="authpage">
      <div className="app-dots" aria-hidden="true" />
      <div className="authwrap">
        <div className="authmark">
          <span className="label">{t("Detailing Platform")}</span>
          <b>{resetting ? t("Reset your password") : creating ? t("Create your account") : t("Welcome back")}</b>
        </div>
      {/* ROADMAP 8.18 — the way back after *Add another account*. The
          component's header has why it exists and why it is OUTSIDE the
          form; `tests/two-logins.test.mjs` § 4 pins both. */}
      {!resetting && <ParkedAccounts />}
        <form onSubmit={submit} className="card">
          <p className="quiet lede">
            {resetting
              ? t("We'll email you a link. It works once and lasts an hour.")
              : creating
                ? t("Your business details come next.")
                : t("Sign in to your dashboard.")}
          </p>

        {providers.google && !resetting && (
          <>
            <button type="button" className="btn oauth" onClick={withGoogle} disabled={busy}>
              <GoogleMark />
              {t("Continue with Google")}
            </button>
            <div className="or"><span>{t("or")}</span></div>
          </>
        )}

        {/* `.fields` IS THE RHYTHM AND IT WAS THE WHOLE COMPLAINT. Every other
            form in the product wraps its labels in this; this one stacked them
            directly, so the two inputs touched. One class, not a margin. */}
        <div className="fields">
          <label className="field">
            <span>{t("Email")}</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          {!resetting && (
            <label className="field">
              <span>{t("Password")}</span>
              <input
                type="password" value={password} minLength={creating ? MIN_PASSWORD : undefined}
                onChange={(e) => setPassword(e.target.value)} required
                autoComplete={creating ? "new-password" : "current-password"}
              />
            </label>
          )}
        </div>
        {error && <div className="error-box">{error}</div>}
        {sent && (
          <div className="ok-box">
            {t("If we have an account for {email}, the link is on its way. Check spam if it is not there in a minute.", { email })}
          </div>
        )}
        <button className="btn primary" disabled={busy || (resetting && sent)}>
          {busy
            ? (resetting ? t("Sending…") : creating ? t("Creating…") : t("Signing in…"))
            : resetting ? (sent ? t("Link sent") : t("Email me a link"))
              : creating ? t("Create account") : t("Sign in")}
        </button>
        {/* A LADDER, NOT THREE EQUAL BUTTONS. Signing in is the primary,
            making an account is a real alternative and keeps its border, and
            the forgotten-password line is a last resort and is quiet. All
            three used to be the same bold row, which made every option look
            equally likely on the screen somebody meets first. */}
        <div className="authalt">
          <button
            type="button" className="btn"
            onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(""); setSent(false); }}
          >
            {mode === "in" ? t("Create an account") : t("I already have an account")}
          </button>
        {/* ITEM N, RANKED *BLOCKS LAUNCH* BY ROADMAP 7.3's FINAL PASS: until
            2026-09-06 a detailer who forgot their password could not get
            back in at all, and the only remedy was the platform owner
            editing the auth table. It is offered on SIGN IN only — on the
            create-account form it is an answer to a question nobody has
            asked yet. */}
        {mode === "in" && (
          <button
            type="button" className="btn ghost sm"
            onClick={() => { setMode("reset"); setError(""); setSent(false); }}
          >
            {t("I forgot my password")}
          </button>
        )}
        </div>
        </form>
      </div>
    </div>
  );
}
