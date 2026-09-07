import { mapsUrlFor } from "./platform.js";
import { businessToday } from "../book/core.js";
// THE SIGN GOES BEFORE THE SYMBOL. "$-189.00" was what a net-negative week
// printed the first time roadmap 2.7 gave the Money screen a week to look at
// (W6), and it reads as a corrupted figure rather than a loss. Nothing was
// wrong with the arithmetic; the minus was just inside the amount instead of
// in front of it. Every caller gets the fix because there is one formatter.
export const money = (n) => {
  const v = Math.round(Number(n || 0) * 100) / 100;
  return `${v < 0 ? "-" : ""}$${Math.abs(v).toFixed(2)}`;
};

export const time12 = (hhmm) => {
  if (!hhmm) return "";
  const [h, m] = String(hhmm).slice(0, 5).split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
};

// How long a job takes, in the words a person uses. One implementation
// because roadmap 2.7 (W17 — "add an estimated TIME next to the estimated
// total") needed a FOURTH: the service card said "2h 30m", the review step
// said "about 2.5 hours", and the price bar would have invented its own.
// Two and a half hours is never "2.5" out loud.
/**
 * ROADMAP 8.17 — A SECOND ARGUMENT, ENGLISH BY DEFAULT, AND IT IS EXPLICIT
 * RATHER THAN READ FROM THE ACTIVE LOCALE ON PURPOSE.
 *
 * `dp.lang` is a per-DEVICE setting a CUSTOMER makes on a booking page, and
 * this same function draws the durations in the detailer's dashboard. Reading
 * the locale in here would mean a detailer who previewed their own page in
 * Spanish came back to `3 h 30 min` scattered through an otherwise English
 * back office — one screen in two languages, which is the exact thing the
 * whole item is trying not to produce.
 *
 * So the BOOKING surface passes the language and everything else does not.
 * `tests/spanish.test.mjs` § 5 fails on a call under `app/src/book` that
 * forgets it, because a forgotten argument here is a fragment of English in a
 * Spanish sentence and nothing else can see it — the same reasoning that made
 * `_shared/config.ts`'s `site` argument required in roadmap 3.3.
 */
export const duration = (mins, lang = "en") => {
  const total = Math.max(0, Math.round(Number(mins) || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  // Spanish writes `h` with no plural and keeps `min` — the abbreviations are
  // what a person reads on any Spanish-language schedule.
  if (lang === "es") {
    if (!h) return `${m} min`;
    if (!m) return `${h} h`;
    return `${h} h ${m} min`;
  }
  if (!h) return `${m} min`;
  if (!m) return `${h} hr${h > 1 ? "s" : ""}`;
  return `${h} hr ${m} min`;
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

// ROADMAP 3.2 — one implementation, in `book/core.js`, because a tenant
// site's own booking form needs the business's today and has no access to
// this file.
export const todayLocal = businessToday;

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
