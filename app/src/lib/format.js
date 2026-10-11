import { mapsUrlFor } from "./platform.js";
import { businessToday } from "../book/core.js";
// THE SIGN GOES BEFORE THE SYMBOL. "$-189.00" was what a net-negative week
// printed the first time roadmap 2.7 gave the Money screen a week to look at
// (W6), and it reads as a corrupted figure rather than a loss. Nothing was
// wrong with the arithmetic; the minus was just inside the amount instead of
// in front of it. Every caller gets the fix because there is one formatter.
// **A COMMA ABOVE 999, AND CENTS ONLY WHEN THERE ARE CENTS — 2026-09-11, from
// an outside review that found both faults in the same figure.**
//
// `$1200.00` was on the public plans page under the largest type on the card,
// and `$5000.00` on the Calendar's history summary. Those are the biggest
// numbers in the product and the ones a person most needs to read at a glance:
// `$1,200` is read, `$1200.00` is parsed. The same report counted the trailing
// `.00` on every whole-dollar price in the product — a service list reading
// `$95.00 / $150.00 / $220.00` looks like an invoice from a software company
// rather than a price list from a detailer.
//
// **CENTS APPEAR WHENEVER THEY EXIST**, so nothing is ever hidden: $58.50 is
// still $58.50, and only $95.00 becomes $95. That is the whole rule, and it is
// why this is safe to apply everywhere at once rather than screen by screen.
//
// One formatter, so a screen cannot invent a second answer. `Intl` rather than
// a hand-rolled regex because it groups correctly at every magnitude.
const WHOLE = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0,
});
const CENTS = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
});
// THE SIGN GOES BEFORE THE SYMBOL. "$-189.00" was what a net-negative week
// printed the first time roadmap 2.7 gave the Money screen a week to look at
// (W6), and it reads as a corrupted figure rather than a loss. Nothing was
// wrong with the arithmetic; the minus was just inside the amount instead of
// in front of it. `Intl` puts it in the same wrong place, so the sign is still
// taken off the number and printed in front by hand.
export const money = (n) => {
  const v = Math.round(Number(n || 0) * 100) / 100;
  const abs = Math.abs(v);
  return `${v < 0 ? "-" : ""}${Number.isInteger(abs) ? WHOLE.format(abs) : CENTS.format(abs)}`;
};

// ONE PHONE SHAPE, `(562) 555-0180` — the third formatter this module was
// always supposed to have, added 2026-09-12 after an outside review found the
// SAME screen printing `5625550142` and `562-555-0180` nine lines apart. A
// phone number is stored as whatever somebody typed, so without one formatter
// every screen shows the typing rather than the number.
//
// **A NUMBER THIS DOES NOT RECOGNISE IS RETURNED UNTOUCHED.** Ten digits, or
// eleven starting with the US country code, are the only shapes it rewrites.
// A `+44` number run through a US mask comes out with digits missing, which is
// worse than the inconsistency this fixes — and a customer whose number will
// not go in is a booking nobody gets.
export const phone = (v) => {
  const raw = String(v ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  const n = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (n.length !== 10) return raw;
  return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
};

// THE SAME SHAPE WHILE IT IS STILL BEING TYPED, which is a different job:
// `phone()` must not touch a number it cannot parse, and a half-typed one is
// exactly that. Rebuilt from the digits on every keystroke, so backspace works
// without the mask putting a character back.
//
// **NOTHING IS BRACKETED UNTIL THERE ARE FOUR DIGITS.** With `(562)` on the
// third keystroke, backspace deletes the `)`, the mask restores it, and the
// caret sticks. At three digits the value is bare `562`, so there is nothing
// to fight over.
export const phoneAsTyped = (v) => {
  const raw = String(v ?? "");
  // Somebody typing an international number is left alone from the `+` on.
  if (/^\s*\+(?!1)/.test(raw)) return raw;
  const d = raw.replace(/\D/g, "").replace(/^1(?=\d)/, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

// ROADMAP 99.2b — whole hours read "6 PM", a real minute stays "6:05 PM". The
// same rule as `emailKit.ts`'s `formatTime12hr`, so a page and the email about
// it print one time the same way. A bare hour (`7`) is accepted for the
// hour-of-day pickers, which store 0–23.
export const time12 = (hhmm) => {
  if (hhmm === null || hhmm === undefined || hhmm === "") return "";
  const [h, m = 0] = String(hhmm).slice(0, 5).split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${ampm}`;
};

// ROADMAP 99.2b — HOW AN UPCOMING APPOINTMENT'S DAY IS SAID IN A SHORT LINE (a
// subject, a text, a heading): "today", "tomorrow", the weekday alone for the
// rest of the next seven days, and "October 14" beyond that. Bodies, receipts
// and invoices keep `dateLong`'s full weekday-month-day; this is only for
// lines about something still to come.
//
// **THE TIME ZONE IS REQUIRED, AND "TODAY" IS THE BUSINESS'S.** A caller handing
// in its own idea of today is how a server on UTC calls a 6 PM Pacific job
// "tomorrow". `now` exists for tests. A past date gets the month and day.
// The twin is `dayWords` in `supabase/functions/_shared/emailKit.ts`; the two
// are held to one table by `scripts/whole-hours.mjs`.
export const dayWords = (dateStr, tz, lang = "en", now = new Date()) => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const utc = (s) => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return Date.UTC(y, m - 1, d); };
  const ahead = Math.round((utc(dateStr) - utc(today)) / 86400000);
  const es = lang === "es";
  if (ahead === 0) return es ? "hoy" : "today";
  if (ahead === 1) return es ? "mañana" : "tomorrow";
  const opts = ahead > 1 && ahead < 7 ? { weekday: "long" } : { month: "long", day: "numeric" };
  return new Date(utc(dateStr)).toLocaleDateString(es ? "es-US" : "en-US", { ...opts, timeZone: "UTC" });
};

// "tomorrow at 6 PM" / "viernes a las 6 PM" — Spanish says "a la" for one o'clock.
export const whenWords = (dateStr, hhmm, tz, lang = "en", now = new Date()) => {
  const at = lang === "es" ? (Number(String(hhmm).slice(0, 2)) % 12 === 1 ? "a la" : "a las") : "at";
  return `${dayWords(dateStr, tz, lang, now)} ${at} ${time12(hhmm)}`;
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
  // `2 hr 30 min` was the odd one out — an outside review, 2026-09-11. The
  // line above already pluralises a bare hour, so two-and-a-half hours read as
  // "2 hr 30 min" beside "2 hrs". Same rule on both branches.
  return `${h} hr${h > 1 ? "s" : ""} ${m} min`;
};

// ROADMAP 8.17 STAGE 1B — the language is an ARGUMENT and this must never
// read the active locale itself. Same rule as `duration()` above and for the
// same reason: this is shared with the DASHBOARD, and `dp.lang` is a
// per-device choice a CUSTOMER makes on a booking page — so a detailer who
// previewed their own page in Spanish would come back to Spanish dates in
// their back office. English by default, so every existing call site is
// unchanged. `es-US` rather than `es-ES` keeps month-before-day.
export const dateLong = (dateStr, lang = "en") => {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === "es" ? "es-US" : "en-US", {
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
