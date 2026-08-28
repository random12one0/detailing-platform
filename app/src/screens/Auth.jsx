import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

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
  // Arriving from a pricing button means you came to start, not to sign in.
  const params = new URLSearchParams(window.location.search);
  const [mode, setMode] = useState(params.has("plan") || params.has("offer") ? "up" : "in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const providers = useEnabledProviders();
  const creating = mode === "up";

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
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
    <div className="center" style={{ minHeight: "100dvh", padding: 16 }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 380 }} className="card">
        <h1 style={{ marginBottom: 4 }}>{creating ? "Create your account" : "Sign in"}</h1>
        <p className="quiet" style={{ marginBottom: 16 }}>
          {creating
            ? "Two fields now, your business details next."
            : "Welcome back."}
        </p>

        {providers.google && (
          <>
            <button type="button" className="btn oauth" onClick={withGoogle} disabled={busy}>
              <GoogleMark />
              Continue with Google
            </button>
            <div className="or"><span>or</span></div>
          </>
        )}

        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password" value={password} minLength={creating ? 8 : undefined}
            onChange={(e) => setPassword(e.target.value)} required
            autoComplete={creating ? "new-password" : "current-password"}
          />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="btn primary" disabled={busy}>
          {busy ? (creating ? "Creating…" : "Signing in…") : (creating ? "Create account" : "Sign in")}
        </button>
        <button
          type="button" className="btn ghost" style={{ marginTop: 10 }}
          onClick={() => { setMode(creating ? "in" : "up"); setError(""); }}
        >
          {creating ? "I already have an account" : "Create an account"}
        </button>
      </form>
    </div>
  );
}
