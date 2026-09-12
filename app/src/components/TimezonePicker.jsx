// Searchable IANA timezone picker. The list comes from the browser's own
// tz database (Intl.supportedValuesOf), so it is always current and never a
// hand-maintained constant. Free text is not accepted — an invalid zone
// would silently break every availability and reminder calculation for the
// business (the database rejects one too, via validate_timezone()).

import { useMemo, useState } from "react";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

// Ordered first because most detailers are here; the full list follows.
const COMMON = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

function allZones() {
  try {
    const zones = Intl.supportedValuesOf?.("timeZone");
    if (Array.isArray(zones) && zones.length) return zones;
  } catch { /* fall through */ }
  return COMMON;
}

// "America/New_York" → "New York" (with the region for disambiguation).
const pretty = (tz) => tz.split("/").slice(1).join(" / ").replace(/_/g, " ") || tz;

// The current UTC offset, so a detailer can sanity-check their choice.
function offsetLabel(tz) {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName");
    return part?.value ?? "";
  } catch {
    return "";
  }
}

export default function TimezonePicker({ value, onChange }) {
  useAppLocale();
  const [query, setQuery] = useState("");
  const zones = useMemo(() => {
    const all = allZones();
    const rest = all.filter((z) => !COMMON.includes(z));
    return [...COMMON.filter((z) => all.includes(z)), ...rest];
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return zones.slice(0, 40);
    return zones.filter((z) => z.toLowerCase().replace(/_/g, " ").includes(q)).slice(0, 40);
  }, [zones, query]);

  return (
    <div>
      <div className="muted" style={{ marginBottom: 6 }}>
        Currently {pretty(value)} ({offsetLabel(value)})
      </div>
      <input
        type="search"
        placeholder={t("Search for your city or region")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      {/* **IT WAS AN ALWAYS-OPEN EIGHT-ROW LIST BOX — 2026-09-12.** `size={8}`
          on a `<select>` is a permanently expanded list, so a setting almost
          nobody touches after the first run was spending ~300px in the middle
          of setup step 4 — the screen the review named as the wall. A timezone
          is chosen once.
          **IT OPENS WHEN THERE IS A SEARCH TO ANSWER AND IS A PLAIN DROP-DOWN
          OTHERWISE.** Nothing is removed: the search still filters, and typing
          in it expands the results underneath. Closed, it is the native
          control with the current zone in it, which is also where the
          keyboard's own type-ahead already worked. */}
      <select
        value={zones.includes(value) ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        size={query ? Math.min(8, Math.max(3, matches.length)) : undefined}
        style={query ? { minHeight: 0, height: "auto", padding: 0 } : undefined}
      >
        {matches.map((z) => (
          <option key={z} value={z} style={{ padding: "10px 12px" }}>
            {pretty(z)} — {offsetLabel(z)}
          </option>
        ))}
        {matches.length === 0 && <option disabled>{t("No matching timezone")}</option>}
      </select>
    </div>
  );
}
