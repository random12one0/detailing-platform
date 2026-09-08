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
import { planChoice, planQuery } from "../lib/planChoice.js";
import { signOutEverything } from "../lib/signout.js";
import ParkedAccounts from "../components/ParkedAccounts.jsx";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

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
  useAppLocale();
  const params = new URLSearchParams(window.location.search);
  const wantsFounding = params.get("offer") === "founding";
  // ROADMAP 2.20 STAGE 2. /pricing sends the chosen way to pay through here as
  // `?term=`, and until this line it died at the signup form — the detailer
  // chose on the pricing page and then met a dashboard that had never heard of
  // it. Carrying it means the next screen they see is the one with their own
  // choice already on it, which is their decision surviving rather than a
  // default being applied.
  // **AND IT IS THE WHOLE CHOICE NOW, NOT JUST THE TERM — roadmap 8.3.** This
  // read `?term=` alone, and the redirect below only fired when there WAS one,
  // so `/app?plan=booking` — the $35 plan, which has no term because it has no
  // commitment — arrived at a plain dashboard with nothing carried at all. The
  // booking plan was the one signup this line could not see.
  const choice = planChoice(window.location.search);

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
    if (!name.trim()) return setError(t("What is the business called?"));
    if (effectiveSlug.length < 2) {
      return setError(t("That name needs a couple of letters or numbers for the web address."));
    }
    setBusy(true);
    try {
      await api.createBusiness({
        name: name.trim(),
        slug: effectiveSlug,
        timezone,
        // A request, not a fact — the server decides whether a spot is free.
      });
      // Reload rather than patch state: the whole app hangs off the
      // business context, and a fresh load is the honest way to enter it.
      if (onDone) onDone();
      else window.location.assign(choice ? `/app?settings=billing&${planQuery(choice)}` : "/app");
    } catch (err) {
      const msg = String(err?.message || err);
      setError(
        /already taken/i.test(msg)
          ? t("That web address is taken. Try another below.")
          : msg,
      );
      if (/already taken/i.test(msg)) { setTouchedSlug(true); setSlug(effectiveSlug); }
      setBusy(false);
    }
  };

  return (
    <div className="center" style={{ minHeight: "100dvh", padding: 16 }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 420 }} className="card">
        <h1 style={{ marginBottom: 4 }}>{t("Your business")}</h1>
        <p className="quiet" style={{ marginBottom: 16 }}>
          {t("Services, hours and the rest are in Settings.")}
        </p>

        {wantsFounding && spots?.left > 0 && (
          <div className="lit" style={{ padding: 12, marginBottom: 16, borderRadius: 10 }}>
            <span className="label">{t("Founding price")}</span>
            <p className="quiet" style={{ marginTop: 4 }}>
              {/* **"WHEN YOU CREATE IT" WENT FALSE WITH ROADMAP 8.5** — the
                  spot is taken at the moment somebody pays, not at signup, so
                  this sentence was a printed promise the product had stopped
                  keeping. Saying WHEN it is taken is the whole point of a
                  count that is running down while somebody reads it. */}
              {spots.left} of {spots.total} left. Yours when you pay — creating an account
              does not hold one.
            </p>
          </div>
        )}

        <label className="field">
          <span>{t("Business name")}</span>
          <input
            value={name} required autoFocus autoComplete="organization"
            onChange={(e) => setName(e.target.value)}
            placeholder={t("Riverside Mobile Detail")}
          />
        </label>

        <label className="field">
          <span>{t("Booking link")}</span>
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
          <span>{t("Timezone")}</span>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {zoneList.map((z) => (
              <option key={z} value={z}>{zoneLabel(z)} — {z}</option>
            ))}
          </select>
          <span className="quiet" style={{ marginTop: 4, display: "block" }}>
            {t("Every booking time depends on this.")}
          </span>
        </label>

        {error && <div className="error-box">{error}</div>}
        <button className="btn primary" disabled={busy}>
          {busy ? t("Setting up…") : t("Open my dashboard")}
        </button>
        <button
          type="button" className="btn ghost" style={{ marginTop: 10 }}
          // ONE DOOR — roadmap 8.18; `lib/signout.js` has why. This is the way
          // out for somebody who signed up and decided not to finish.
          onClick={signOutEverything}
        >
          {t("Sign out")}
        </button>
      </form>
      {/* ROADMAP 8.18 — AND THIS ONE WAS FOUND BY DRIVING THE FEATURE. An
          account with no membership lands here, this screen has no header and
          therefore no gear, and its only exit is *Sign out* — which empties
          the park by design. So adding a second account that turned out to
          have no business left you with no way back to the first except its
          password: a dead end nothing would have reported, because every
          check passed and the screen looked right. */}
      <ParkedAccounts label={t("Or go back to")} />
    </div>
  );
}
