// Public invite landing page: /invite/:token — set a password, sign in,
// land in the dashboard.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { roleName } from "../lib/permissions.js";

const FN = (name) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;
const headers = {
  "Content-Type": "application/json",
  apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
};

export default function AcceptInvite() {
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
      <div className="center" style={{ padding: 16 }}>
        <div className="card" style={{ maxWidth: 380 }}>
          <h1 style={{ marginBottom: 8 }}>Invite unavailable</h1>
          <p className="muted">{info.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="center" style={{ minHeight: "100dvh", padding: 16 }}>
      <form onSubmit={submit} className="card" style={{ width: "100%", maxWidth: 380 }}>
        <h1 style={{ marginBottom: 8 }}>Join {info.business_name}</h1>
        <p className="muted" style={{ marginBottom: 16 }}>
          {info.email} · {roleName(info.role, info.label)}
        </p>
        <label className="field">
          <span>Choose a password</span>
          <input type="password" value={password} minLength={8} required autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="btn primary" disabled={busy}>{busy ? "Setting up" : "Set up my account"}</button>
      </form>
    </div>
  );
}
