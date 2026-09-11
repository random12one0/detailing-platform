// /reset — where the emailed recovery link lands, and the one screen that has
// to tell two visitors apart.
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
//
// **TWO VISITORS, NOT ONE — his review, 2026-09-10: *"no place to put the
// existing password."*** He was right, and the old header's reasoning is what
// hid it. It said a current-password field is *"deliberately NOT added to
// `/reset`"* because somebody there is locked out by definition — true of the
// person who followed an emailed link, and FALSE of the other visitor this
// route has always had: anybody already ordinarily signed in who types the
// address, which is exactly what he did. For them this was the change-password
// screen with the check taken out, one route over from the screen that has it.
// An unlocked laptop in a van was one page load from a permanent takeover.
//
// So the two are separated by `arrivedOnRecoveryLink` (`lib/supabase.js` says
// why that answer has to be captured before the client is built): a real
// recovery arrival is asked for nothing, and an ordinary session is asked for
// its current password and re-authenticated by `reauthenticate` — the SAME
// helper the gear screen uses, so the security path has one copy and not two.
//
// **AND IT WEARS THE SIGN-IN SCREEN'S CLOTHES NOW** — the second half of his
// note, *"the GUI could use some cleaning."* Roadmap 2.25 gave `/app` the
// ground, the mark and the field rhythm (`.authpage`, `.authmark`, `.fields`)
// and this route never got any of it: a bare card on a flat fill, with two
// inputs touching. Same classes, no new CSS.

import { useEffect, useState } from "react";
import { arrivedOnRecoveryLink, supabase } from "../lib/supabase.js";
import { MIN_PASSWORD, PASSWORD_RULE, reauthenticate } from "../lib/password.js";
import { PasswordInput } from "../components/controls.jsx";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

export default function ResetPassword() {
  useAppLocale();
  // checking | recovery | signedin | dead | done
  const [state, setState] = useState("checking");
  const [email, setEmail] = useState("");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    const land = (session) => {
      if (!live || !session) return;
      setEmail(session.user?.email ?? "");
      setState(arrivedOnRecoveryLink ? "recovery" : "signedin");
    };
    // The exchange happens on load, so a session may not be there on the first
    // tick. `onAuthStateChange` fires when it lands; the timeout is the case
    // where it never does.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => land(session));
    supabase.auth.getSession().then(({ data }) => {
      if (!live) return;
      if (data?.session) land(data.session);
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
    if (password !== again) { setError(t("Those two do not match.")); return; }
    setBusy(true);
    // AN ORDINARY SESSION PROVES THE BROWSER, NOT THE PERSON. Nothing is
    // written when this fails.
    if (state === "signedin") {
      const wrong = await reauthenticate(email, current);
      if (wrong) { setBusy(false); setError(t(wrong)); return; }
    }
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setState("done");
    // Signed in already — the recovery session is a real one — so there is
    // nothing to type again.
    setTimeout(() => { window.location.href = "/app"; }, 1200);
  };

  const asking = state === "recovery" || state === "signedin";

  return (
    <div className="authpage">
      <div className="app-dots" aria-hidden="true" />
      <div className="authwrap">
        <div className="authmark">
          <span className="label">{t("Detailing Platform")}</span>
          <b>{state === "dead" ? t("That link has expired") : t("Choose a new password")}</b>
        </div>

        {/* THE FORM *IS* THE CARD, exactly as `Auth.jsx` builds it, and that
            is a spacing rule rather than a preference: `.authpage .card > * + *`
            is what puts air between the lede, the fields and the button, and it
            reaches DIRECT children only. A `<div class="card">` with a `<form>`
            inside it takes the rule on the form and none of its contents, which
            is a paragraph touching the first label — measured at 392 before
            this was corrected. */}
        {!asking && (
          <div className="card">
            {state === "checking" && (
              <p className="quiet lede" data-loading="1">{t("Checking your link…")}</p>
            )}

            {state === "dead" && (
              <>
                <p className="quiet lede">
                  {t("A reset link works once and lasts an hour. Ask for a new one and it will be in your inbox in a minute.")}
                </p>
                <a className="btn primary" href="/app">{t("Back to sign in")}</a>
              </>
            )}

            {state === "done" && (
              <>
                <p className="quiet lede">{t("Done — you are signed in.")}</p>
                <div className="ok-box">{t("Taking you to your dashboard…")}</div>
              </>
            )}
          </div>
        )}

        {asking && (
          <form className="card" onSubmit={submit}>
            <p className="quiet lede">
              {state === "signedin" && email
                ? <>{t("The password for")} <strong>{email}</strong>. </>
                : null}
              {t(PASSWORD_RULE)} {t("You will be signed in straight after.")}
            </p>
            <div className="fields">
              {state === "signedin" && (
                <label className="field">
                  <span>{t("Current password")}</span>
                  <PasswordInput
                    value={current} required autoComplete="current-password" autoFocus
                    onChange={(e) => setCurrent(e.target.value)} />
                </label>
              )}
              <label className="field">
                <span>{t("New password")}</span>
                <PasswordInput
                  value={password} minLength={MIN_PASSWORD} required
                  autoComplete="new-password" autoFocus={state === "recovery"}
                  onChange={(e) => setPassword(e.target.value)} />
              </label>
              <label className="field">
                <span>{t("Type it again")}</span>
                <PasswordInput
                  value={again} minLength={MIN_PASSWORD} required
                  autoComplete="new-password"
                  onChange={(e) => setAgain(e.target.value)} />
              </label>
            </div>
            {error && <div className="error-box">{error}</div>}
            <button className="btn primary"
              disabled={busy || !password || (state === "signedin" && !current)}>
              {busy ? t("Saving…") : t("Save it and sign me in")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
