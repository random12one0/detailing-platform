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
// NO CURRENT-PASSWORD FIELD, and that is Supabase's design rather than an
// omission: `updateUser` acts on the live session, and the session is the
// proof. Asking again would be a field that checks nothing.

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase.js";

export default function Password() {
  const [email, setEmail] = useState("");
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
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    setPassword("");
    setAgain("");
    setMsg({ ok: true, text: "Changed. This device stays signed in." });
  };

  return (
    <form className="group" onSubmit={save}>
      <p className="quiet">
        {email ? <>The password for <strong>{email}</strong>.</> : "Your sign-in password."}
        {" "}Eight characters or more.
      </p>
      <label className="field">
        <span>New password</span>
        <input type="password" value={password} minLength={8} required
          autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
      </label>
      <label className="field">
        <span>Type it again</span>
        <input type="password" value={again} minLength={8} required
          autoComplete="new-password" onChange={(e) => setAgain(e.target.value)} />
      </label>
      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
      <button className="btn primary" disabled={busy || !password}>
        {busy ? "Saving…" : "Change it"}
      </button>
    </form>
  );
}
