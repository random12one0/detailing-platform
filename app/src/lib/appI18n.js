// ROADMAP 8.17 STAGE 2B — THE DETAILER'S OWN DASHBOARD, IN SPANISH.
//
// `lib/i18n.js` is the CUSTOMER's booking surface. This is the second scope
// `lib/localeStore.js` was built as a factory for, and the two must never
// learn about each other.
//
// ---------------------------------------------------------------------------
// WHY IT IS A SECOND KEY AND NOT THE SAME ONE
// ---------------------------------------------------------------------------
// **A detailer previews their own booking page.** With one shared key,
// pressing ES there to see what a customer sees would turn their whole back
// office Spanish on the way back — and the way back is the dashboard, so they
// would have to find the switch again in a language they may not read.
//
// It is the rule `format.js`'s `duration()` and `lib/plans.js` each already
// carry one level down — *a shared formatter must never read the active
// locale, because `dp.lang` is a per-device choice a CUSTOMER makes* — applied
// to the store itself. `dp.lang` stays exactly what it was; this is
// `dp.lang.app`, and neither can move the other.
//
// ---------------------------------------------------------------------------
// AND IT DOES NOT DETECT FROM THE BROWSER, WHICH IS THE OTHER HALF
// ---------------------------------------------------------------------------
// The booking page detects, because a customer arrives cold from a link with
// no account and no session — the browser's own language is the only thing
// about them we know, and getting it right unasked is most of the value.
//
// **A detailer is the opposite case.** They signed up in English, read an
// English pricing page and agreed to English terms. Finding their own back
// office in a language they never chose — because of a laptop somebody else
// set up, or a phone bought secondhand — is a worse first morning than an
// English one with a switch on it. So this scope starts English and moves only
// when somebody presses the switch.
//
// ---------------------------------------------------------------------------
// WHAT IS NOT IN SCOPE, AND EACH FOR ITS OWN REASON
// ---------------------------------------------------------------------------
//   · **`admin/` — the owner's back office — STAYS ENGLISH.** He runs it, he
//     reads English, and it is the one screen where a machine translation
//     buys nothing and risks a misread about somebody's money.
//   · **`landing/legal.js` — the terms and the privacy page — MUST NOT BE
//     MACHINE-TRANSLATED BY ANYBODY.** They are a contract carrying the
//     AB 2863 disclosures, and a translation nobody qualified has read is a
//     liability rather than a feature.
//   · **The detailer's own words** — service names, plan names, their message
//     templates, a customer's notes — pass through as written, exactly as on
//     the booking side. Nothing here can translate what it has never seen.

const KEY = "dp.lang.app";

import { appEs } from "./strings/appEs.js";
import { LOCALES, LOCALE_NAMES, makeLocale } from "./localeStore.js";

export { LOCALES, LOCALE_NAMES };

const scope = makeLocale(KEY, { en: null, es: appEs }, false);

export const getAppLocale = scope.getLocale;
export const setAppLocale = scope.setLocale;
export const subscribeApp = scope.subscribe;

/** What `Intl` should be given for a DASHBOARD date. `es-US`, never `es-ES`:
 *  it keeps `$1,234.50`, the 12-hour clock and month-before-day.
 *
 *  **Every `toLocaleDateString` / `Intl.*` call on a dashboard screen takes
 *  this** — a date formatted at a hard-coded `"en-US"` renders perfect English
 *  inside a Spanish sentence, and there is no string to wrap, so no catalogue
 *  check can ever see it. `scripts/i18n-survey.mjs` lists them separately for
 *  that reason. */
export const appIntlLocale = scope.intlLocale;

/**
 * THE LOOKUP. English is the key — see `lib/i18n.js` for the whole argument.
 *
 * `vars` interpolates `{name}` placeholders, and a placeholder missing from a
 * translation is a FACT lost from the sentence, so `tests/spanish.test.mjs`
 * compares the placeholder sets of every pair rather than trusting them.
 */
export const t = scope.t;
