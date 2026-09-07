// ROADMAP 8.17 STAGE 2A — SPANISH IN THE EMAILS.
//
// ---------------------------------------------------------------------------
// WHY THIS IS A SECOND i18n AND NOT `app/src/lib/i18n.js`
// ---------------------------------------------------------------------------
// The same wall that forced `_shared/brandColor.js` and `_shared/vcard.ts`: a
// Deno bundle will not follow an import out of `supabase/`. So the mechanism
// is copied and **the catalogue is not** — `_shared/strings/es.ts` holds email
// copy, `app/src/lib/strings/es.js` holds page copy, and they share almost no
// sentences. Two files with the same job would be a drift problem; two files
// with different jobs are just two files.
//
// The rules are stage 1's, unchanged, and they are in `app/src/lib/i18n.js` in
// full. The short version, because it decides how this file is used:
//
// **THE ENGLISH IS THE KEY.** `tt("Booking confirmed")`, never
// `tt("email.confirm.lab")`. A string nobody translated renders correct
// English rather than a debug identifier, so the worst case is an email in two
// languages instead of an email that looks broken. That matters more here than
// on a page: nobody who can approve this product can read the output, and an
// email cannot be corrected after it is sent.
//
// **AND THE LANGUAGE IS ALWAYS AN ARGUMENT.** There is no ambient locale in an
// edge function and there must never be one: a module-level "current language"
// in a runtime that serves every tenant is a race between two requests, and
// the failure is one customer's confirmation going out in another customer's
// language.

import { es } from "./strings/es.ts";

export type Lang = "en" | "es";

/** Anything unrecognised is English. A booking's `lang` is check-constrained,
 *  but a caller that forgets the column entirely passes `undefined`, and the
 *  right answer to that is the language the product was written in. */
export const langOf = (v: unknown): Lang => (v === "es" ? "es" : "en");

const CATALOGUES: Record<Lang, Record<string, string> | null> = { en: null, es };

/**
 * A lookup bound to one language, for one email.
 *
 * `const tt = T(b.lang)` at the top of a template, then `tt("…")` everywhere.
 * Vars are `{name}` placeholders, and **an interpolated sentence is ONE key**
 * rather than glued fragments: English writes `"in " + area` and Spanish puts
 * that preposition somewhere else entirely.
 */
export function T(lang: unknown) {
  const cat = CATALOGUES[langOf(lang)];
  return (english: string, vars?: Record<string, string | number>): string => {
    let out = (cat && cat[english]) || english;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
    }
    return out;
  };
}

/** `es-US`, never `es-ES` — the audience is Spanish speakers in the United
 *  States, and that keeps `$1,234.50`, the 12-hour clock and month-before-day.
 *  Three things a customer reads as WRONG rather than as translated. */
export const intlLocale = (lang: unknown): string => (langOf(lang) === "es" ? "es-US" : "en-US");
