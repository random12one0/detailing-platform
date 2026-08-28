import { mapsUrlFor } from "./platform.js";
export const money = (n) => `$${(Math.round(Number(n || 0) * 100) / 100).toFixed(2)}`;

export const time12 = (hhmm) => {
  if (!hhmm) return "";
  const [h, m] = String(hhmm).slice(0, 5).split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
};

export const dateLong = (dateStr) => {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

// Business-local "YYYY-MM-DD" / "HH:MM" for a stored timestamptz instant.
export const localDate = (iso, tz) => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(iso));
  return p; // en-CA gives YYYY-MM-DD
};
export const localTime = (iso, tz) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, hour: "2-digit", minute: "2-digit" })
    .formatToParts(new Date(iso))
    .reduce((a, x) => ({ ...a, [x.type]: x.value }), {});
  return `${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`;
};

export const todayLocal = (tz) => localDate(new Date().toISOString(), tz);

export const addDays = (dateStr, n) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

// A maps link that honours the owner's choice of app (Preferences → Maps).
// It used to always be Google, which is a fine default and the wrong answer
// for anyone who actually uses Apple Maps or Waze. The decision itself lives
// in lib/platform.js so there is one place that knows about platforms.
export const mapsUrl = (address) => mapsUrlFor(address);
