// Behind the gear — changing your password while you are signed in.
//
// THE OTHER HALF OF ITEM N. `/reset` is the way back in when you are locked
// out; this is the ordinary case, and until 2026-09-06 neither existed —
// nothing in `app/src` called `updateUser` at all. A product that can create
// an account and never change its password is one where the only way to
// rotate a credential is to ask us.
//
// IT IS BEHIND THE GEAR RATHER THAN ON `Business`, by that screen's own
// admission test: it changes nothing a customer ever meets. It is also the one
// row here that belongs to the PERSON rather than the business — the same
// account may be a member of two — which is why the screen says whose it is.
//
// ~~NO CURRENT-PASSWORD FIELD, and that is Supabase's design rather than an
// omission: `updateUser` acts on the live session, and the session is the
// proof. Asking again would be a field that checks nothing.~~
//
// **WRONG, AND HE CAUGHT IT — 2026-09-10.** *"There should be a place for you
// to input your existing password just to check, like most of them have.
// Obviously we need that."*
//
// The old reasoning confused two different questions. **The session proves
// this BROWSER was authenticated once. It does not prove the PERSON at the
// keyboard is the account holder** — and the gap between those two is a
// detailer's laptop left unlocked in a van, on a driveway, in a shop. Anybody
// who walks up to it can take the account permanently, because changing the
// password is the one action that locks the real owner out of their own
// bookings and their own money.
//
// **SO IT IS RE-AUTHENTICATION, NOT A DECORATIVE FIELD.** The typed password
// is checked by signing in with it before anything is changed: a wrong one
// fails at Supabase and nothing is written. There is no way to verify a
// password client-side and nothing here tries to.
//
// ~~It is deliberately NOT added to `/reset`.~~ **HALF TRUE, AND THE HALF THAT
// WAS FALSE WAS A HOLE — his review, 2026-09-10.** It is right about the person
// who followed an emailed link: they are locked out by definition and asking
// for a password they do not have is how a reset screen becomes a dead end. It
// forgot the OTHER visitor to that route — anybody already ordinarily signed in
// who simply types `/reset`, for whom it was this screen with the check taken
// out. That route now tells the two apart; see its header.

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { MIN_PASSWORD, PASSWORD_RULE, reauthenticate } from "../../lib/password.js";
import { PasswordInput } from "../../components/controls.jsx";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../../lib/appI18n.js";
import { useAppLocale } from "../../hooks/useAppLocale.js";

export default function Password() {
  useAppLocale();
  const [email, setEmail] = useState("");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    supabase.auth.getUser().then(({ data }) => { if (live) setEmail(data?.user?.email ?? ""); });
    return () => { live = false; };
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setMsg(null);
    // The same two fields as `/reset`, for the same reason: a typo here is a
    // lockout, and the screen that fixes a lockout is the one you cannot reach.
    if (password !== again) { setMsg({ ok: false, text: "Those two do not match." }); return; }
    setBusy(true);

    // THE CHECK IS A SIGN-IN, and it lives in `lib/password.js` because
    // `/reset` needs the identical thing — that helper's header carries the
    // whole reasoning, including why a wrong password and a failed request get
    // different sentences. It was written out inline here, which is exactly how
    // the other screen came to be missing it (his review, 2026-09-10).
    //
    // Signing in as the SAME account replaces this session with an identical
    // one, which is why nothing else has to be told: `BusinessContext`'s auth
    // listener settles the new session for the same user and the screen does
    // not move.
    const wrong = await reauthenticate(email, current);
    if (wrong) { setBusy(false); setMsg({ ok: false, text: wrong }); return; }

    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    setCurrent("");
    setPassword("");
    setAgain("");
    setMsg({ ok: true, text: "Changed. This device stays signed in." });
  };

  return (
    <form className="group" onSubmit={save}>
      <p className="quiet">
        {email ? <>{t("The password for")} <strong>{email}</strong>.</> : t("Your sign-in password.")}
        {" "}{t(PASSWORD_RULE)}
      </p>
      <label className="field">
        <span>{t("Current password")}</span>
        <PasswordInput value={current} required
          autoComplete="current-password" onChange={(e) => setCurrent(e.target.value)} />
      </label>
      <label className="field">
        <span>{t("New password")}</span>
        <PasswordInput value={password} minLength={MIN_PASSWORD} required
          autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
      </label>
      <label className="field">
        <span>{t("Type it again")}</span>
        <PasswordInput value={again} minLength={MIN_PASSWORD} required
          autoComplete="new-password" onChange={(e) => setAgain(e.target.value)} />
      </label>
      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
      <button className="btn primary" disabled={busy || !current || !password}>
        {busy ? t("Saving…") : t("Change it")}
      </button>
    </form>
  );
}
