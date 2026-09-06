// /reset — where the emailed recovery link lands.
//
// ITEM N, RANKED *BLOCKS LAUNCH* BY ROADMAP 7.3's FINAL PASS (2026-09-06).
// Until this existed, a detailer who forgot their password could not get back
// into their own business at all: there was no link on the sign-in screen, no
// route, and nothing in `app/src` that called `resetPasswordForEmail`. The
// only remedy was the platform owner editing the auth table by hand, which is
// not a support answer — it is the absence of one.
//
// THE SESSION ARRIVES IN THE URL AND IS ALREADY SPENT BY THE TIME THIS
// RENDERS. `supabase-js` has `detectSessionInUrl` on by default, so it reads
// the recovery token out of the hash, exchanges it and clears the address bar
// before React mounts. **So this screen must not read the hash itself** — it
// would find an empty one and conclude the link was bad. It asks the client
// for a session instead, and waits, because that exchange is asynchronous.
//
// AND A DEAD LINK MUST SAY SO PLAINLY. A recovery link works once and lasts an
// hour; the second time somebody opens it — from the same email, an hour
// later, or after their mail client's scanner has already followed it — there
// is no session and the honest answer is "ask for another one", not a form
// that fails on submit.

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function ResetPassword() {
  const [state, setState] = useState("checking");   // checking | ready | dead | done
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    // The exchange happens on load, so a session may not be there on the first
    // tick. `onAuthStateChange` fires when it lands; the timeout is the case
    // where it never does.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (live && session) setState("ready");
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!live) return;
      if (data?.session) setState("ready");
      else setTimeout(() => { if (live) setState((s) => (s === "checking" ? "dead" : s)); }, 2500);
    });
    return () => { live = false; sub?.subscription?.unsubscribe(); };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    // TWO FIELDS, because the failure this screen exists to fix is being
    // locked out — and a typo in a password you then cannot sign in with locks
    // you out again, from the page that was supposed to be the way back.
    if (password !== again) { setError("Those two do not match."); return; }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setState("done");
    // Signed in already — the recovery session is a real one — so there is
    // nothing to type again.
    setTimeout(() => { window.location.href = "/app"; }, 1200);
  };

  return (
    <div className="center" style={{ minHeight: "100dvh", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380 }} className="card">
        <h1 style={{ marginBottom: 4 }}>
          {state === "dead" ? "That link has expired" : "Choose a new password"}
        </h1>

        {state === "checking" && <p className="quiet" data-loading="1">Checking your link…</p>}

        {state === "dead" && (
          <>
            <p className="quiet" style={{ marginBottom: 16 }}>
              A reset link works once and lasts an hour. Ask for a new one and
              it will be in your inbox in a minute.
            </p>
            <a className="btn primary" href="/app">Back to sign in</a>
          </>
        )}

        {state === "done" && (
          <>
            <p className="quiet" style={{ marginBottom: 16 }}>
              Done — you are signed in.
            </p>
            <div className="ok-box">Taking you to your dashboard…</div>
          </>
        )}

        {state === "ready" && (
          <form onSubmit={submit}>
            <p className="quiet" style={{ marginBottom: 16 }}>
              Eight characters or more. You will be signed in straight after.
            </p>
            <label className="field">
              <span>New password</span>
              <input
                type="password" value={password} minLength={8} required
                autoComplete="new-password" autoFocus
                onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label className="field">
              <span>Type it again</span>
              <input
                type="password" value={again} minLength={8} required
                autoComplete="new-password"
                onChange={(e) => setAgain(e.target.value)} />
            </label>
            {error && <div className="error-box">{error}</div>}
            <button className="btn primary" disabled={busy}>
              {busy ? "Saving…" : "Save it and sign me in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
