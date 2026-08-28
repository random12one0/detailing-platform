// The second half of signup — and the landing spot for anyone who has an
// account but no business yet (an OAuth user, or an invite that never
// completed). It used to be a dead end reading "This login isn't linked to
// a business yet", which is a true sentence and a useless one.
//
// Two fields. The web address is derived from the name rather than asked
// for, because a detailer signing up on a phone should not have to invent
// a URL slug; it is shown so it is never a surprise, and it is editable if
// the derived one is taken.

import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { supabase } from "../lib/supabase.js";

const slugify = (name) =>
  name.toLowerCase().trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);

// A zone is usually "Region/City", but not always: a browser can report a
// bare "UTC" or "GMT". Assuming the slash crashed the whole screen — and
// with no error boundary, a crash here is a blank white page at the exact
// moment someone is signing up.
const zoneLabel = (z) => (z.includes("/") ? z.split("/").pop() : z).replace(/_/g, " ");

// The zones a US detailer will actually be in, plus whatever the browser
// reports, so the right answer is usually already selected.
const ZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Phoenix",
  "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu",
];

export default function CreateBusiness({ onDone }) {
  const params = new URLSearchParams(window.location.search);
  const wantsFounding = params.get("offer") === "founding";

  const detected = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "America/Los_Angeles"; }
  }, []);
  const zoneList = useMemo(
    () => (ZONES.includes(detected) ? ZONES : [detected, ...ZONES]),
    [detected],
  );

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [touchedSlug, setTouchedSlug] = useState(false);
  const [timezone, setTimezone] = useState(detected);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [spots, setSpots] = useState(null);

  useEffect(() => {
    if (!wantsFounding) return;
    api.foundingOffer().then(setSpots).catch(() => setSpots({ total: 0, left: 0 }));
  }, [wantsFounding]);

  const effectiveSlug = touchedSlug ? slug : slugify(name);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("What is the business called?");
    if (effectiveSlug.length < 2) {
      return setError("That name needs a couple of letters or numbers for the web address.");
    }
    setBusy(true);
    try {
      await api.createBusiness({
        name: name.trim(),
        slug: effectiveSlug,
        timezone,
        // A request, not a fact — the server decides whether a spot is free.
        claim_founding: wantsFounding,
      });
      // Reload rather than patch state: the whole app hangs off the
      // business context, and a fresh load is the honest way to enter it.
      if (onDone) onDone();
      else window.location.assign("/app");
    } catch (err) {
      const msg = String(err?.message || err);
      setError(
        /already taken/i.test(msg)
          ? "That web address is taken. Try another below."
          : msg,
      );
      if (/already taken/i.test(msg)) { setTouchedSlug(true); setSlug(effectiveSlug); }
      setBusy(false);
    }
  };

  return (
    <div className="center" style={{ minHeight: "100dvh", padding: 16 }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 420 }} className="card">
        <h1 style={{ marginBottom: 4 }}>Your business</h1>
        <p className="quiet" style={{ marginBottom: 16 }}>
          This is all we need. Services, hours and the rest are in Settings.
        </p>

        {wantsFounding && spots?.left > 0 && (
          <div className="lit" style={{ padding: 12, marginBottom: 16, borderRadius: 10 }}>
            <span className="label">Founding price</span>
            <p className="quiet" style={{ marginTop: 4 }}>
              {spots.left} of {spots.total} left. It locks to this account when you create it.
            </p>
          </div>
        )}

        <label className="field">
          <span>Business name</span>
          <input
            value={name} required autoFocus autoComplete="organization"
            onChange={(e) => setName(e.target.value)}
            placeholder="Riverside Mobile Detail"
          />
        </label>

        <label className="field">
          <span>Booking link</span>
          <input
            value={effectiveSlug}
            onChange={(e) => { setTouchedSlug(true); setSlug(slugify(e.target.value)); }}
            spellCheck={false} autoCapitalize="none"
          />
          <span className="quiet" style={{ marginTop: 4, display: "block" }}>
            Customers will book at /book/{effectiveSlug || "your-business"}
          </span>
        </label>

        <label className="field">
          <span>Timezone</span>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {zoneList.map((z) => (
              <option key={z} value={z}>{zoneLabel(z)} — {z}</option>
            ))}
          </select>
          <span className="quiet" style={{ marginTop: 4, display: "block" }}>
            Every booking time depends on this.
          </span>
        </label>

        {error && <div className="error-box">{error}</div>}
        <button className="btn primary" disabled={busy}>
          {busy ? "Setting up…" : "Open my dashboard"}
        </button>
        <button
          type="button" className="btn ghost" style={{ marginTop: 10 }}
          onClick={() => supabase.auth.signOut()}
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
