// Searchable IANA timezone picker. The list comes from the browser's own
// tz database (Intl.supportedValuesOf), so it is always current and never a
// hand-maintained constant. Free text is not accepted — an invalid zone
// would silently break every availability and reminder calculation for the
// business (the database rejects one too, via validate_timezone()).

import { useMemo, useState } from "react";

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
        placeholder="Search for your city or region"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <select
        value={zones.includes(value) ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        size={Math.min(8, Math.max(3, matches.length))}
        style={{ minHeight: 0, height: "auto", padding: 0 }}
      >
        {matches.map((z) => (
          <option key={z} value={z} style={{ padding: "10px 12px" }}>
            {pretty(z)} — {offsetLabel(z)}
          </option>
        ))}
        {matches.length === 0 && <option disabled>No matching timezone</option>}
      </select>
    </div>
  );
}
