// ROADMAP 8.17 — SPANISH.
//
// *"A lot of detailers speak Spanish… make sure you don't do bad translating."*
// And the limit he named in the same breath: *"I can't check that sadly,
// because I don't speak Spanish."*
//
// ---------------------------------------------------------------------------
// THAT SECOND SENTENCE IS THE DESIGN BRIEF, NOT A FOOTNOTE.
// ---------------------------------------------------------------------------
// Nobody who can approve this product can read the output. So the question is
// not *how do we translate well* — it is **what makes a translation that is
// wrong cheap to find and cheap to fix**, because some of it will be wrong.
// Four answers, and they are why this file looks the way it does:
//
// **1 · THE ENGLISH IS THE KEY.** `t("Choose your services")`, not
// `t("book.services.title")`. A key nobody translated renders the correct
// ENGLISH rather than `book.services.title`, so the worst case is a page in
// two languages instead of a page with debug text on it. It also means there
// are no key names to invent, mistype, or leave describing something the copy
// stopped saying.
//
// **2 · A COPY EDIT ORPHANS ITS TRANSLATION, AND THAT IS LOUD.** The cost of
// English-as-key is that changing a sentence silently drops its Spanish.
// `tests/spanish.test.mjs` fails on any `es` entry whose English no longer
// exists in the source, which turns an invisible regression into a red line.
//
// **3 · ENGLISH IS NEVER TAKEN AWAY.** The picker sits on the page and the
// choice is remembered per device. A confusing Spanish string is then an
// annoyance somebody can switch out of, rather than a wall — which is the only
// honest thing to build when the person accountable for the words cannot read
// them.
//
// **4 · `es-US`, NEVER `es-ES`.** The audience is Spanish speakers in the
// United States. That keeps `$1,234.50` rather than `1234,50 US$`, the
// 12-hour clock, and month-before-day ordering — three things a customer would
// otherwise read as wrong rather than as translated.
//
// ---------------------------------------------------------------------------
// NO LIBRARY, AND THAT IS A RULE RATHER THAN A PREFERENCE.
// ---------------------------------------------------------------------------
// This frontend has four dependencies. i18next and react-intl are each larger
// than everything a booking page needs, and what a booking page needs is a
// lookup, an interpolation and a change event.

const KEY = "dp.lang";
export const LOCALES = ["en", "es"];
/** What a person sees in the picker, in their own language, never translated. */
export const LOCALE_NAMES = { en: "English", es: "Español" };

import { es } from "./strings/es.js";

const CATALOGUES = { en: null, es };

// `localStorage` throws outright in some embedded contexts, so every access is
// wrapped — the same rule the booking page's remembered-customer helpers
// follow, and the reason `booking-core` allows exactly two wrapped call sites.
const read = () => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};
const write = (v) => {
  try { localStorage.setItem(KEY, v); } catch { /* private window; the choice just does not persist */ }
};

/**
 * REMEMBERED, THEN THE BROWSER, THEN ENGLISH.
 *
 * A customer arrives cold from a link with no session and no account, so the
 * browser's own language is the only thing about them we know — and getting it
 * right without being asked is most of the value. `navigator.languages` is
 * ordered by preference and is what to read; `navigator.language` alone
 * ignores somebody whose second choice is the one we speak.
 */
function detect() {
  const saved = read();
  if (saved && LOCALES.includes(saved)) return saved;
  const list = (typeof navigator !== "undefined" && navigator.languages)
    || [typeof navigator !== "undefined" ? navigator.language : ""];
  for (const tag of list) {
    const base = String(tag || "").toLowerCase().split("-")[0];
    if (LOCALES.includes(base)) return base;
  }
  return "en";
}

let locale = detect();
const listeners = new Set();

export const getLocale = () => locale;

export function setLocale(next) {
  if (!LOCALES.includes(next) || next === locale) return;
  locale = next;
  write(next);
  // THE WHOLE PAGE RE-RENDERS RATHER THAN RELOADING. A reload is two lines
  // shorter and would throw away a half-filled booking form, which is the one
  // thing this page exists not to do.
  for (const fn of listeners) fn();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** What `Intl` should be given. See the `es-US` note in the header. */
export const intlLocale = () => (locale === "es" ? "es-US" : "en-US");

/**
 * THE LOOKUP.
 *
 * `vars` interpolates `{name}` placeholders. **A placeholder that is missing
 * from the translation is a fact lost from the sentence** — "$40 off" becoming
 * "off" — so `tests/spanish.test.mjs` compares the placeholder sets of every
 * pair rather than trusting them to survive.
 */
export function t(english, vars) {
  const table = CATALOGUES[locale];
  let out = (table && table[english]) || english;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}
