// ROADMAP 8.17 — ONE LANGUAGE STORE, BUILT TO CARRY MORE THAN ONE SCOPE.
//
// Today it has exactly one caller: `i18n.js`, the customer's booking surface.
// It is a factory rather than that file's own forty lines because **stage 2b —
// the detailer's dashboard — needs a SECOND, INDEPENDENT language**, and the
// design decision that shape rests on is worth writing down before anybody
// builds it.
//
// ---------------------------------------------------------------------------
// WHY THE DASHBOARD MUST NOT SHARE `dp.lang`, WHEN IT COMES
// ---------------------------------------------------------------------------
// A CUSTOMER picks a language on a booking page; a DETAILER picks one for their
// own back office. They are the same person's browser often enough to matter,
// because **a detailer previews their own booking page** — and with one shared
// key, pressing ES there to see what a customer sees would turn their whole
// dashboard Spanish on the way back.
//
// That is not a hypothetical: it is the same failure this repo already wrote a
// rule against twice, in `format.js`'s `duration()` and in `lib/plans.js` —
// *a shared formatter must never read the active locale, because `dp.lang` is
// a per-device choice a CUSTOMER makes.* Two keys is that rule at the level
// above.
//
// So `dp.lang` stays exactly what it was, and the dashboard takes
// `dp.lang.app`. Neither can move the other.
//
// ---------------------------------------------------------------------------
// AND IT IS A FACTORY RATHER THAN A SECOND COPY
// ---------------------------------------------------------------------------
// The store is forty lines of change-notification, and a second copy of it is
// the thing that rots: the day somebody fixes the detection order, or the
// `localStorage` wrapper, or the "notify rather than reload" rule, they fix it
// in one of two files. `_shared/i18n.ts` is a second copy for a reason — a
// Deno bundle cannot import out of `supabase/` — and there is no such wall
// here: both scopes would live in the same bundle.
//
// **`detectFromBrowser` IS THE OTHER HALF OF THE SAME ARGUMENT** and it is a
// parameter for the same reason: `true` for a customer, `false` for a
// detailer. It has one caller today and the second one is why it exists.

export const LOCALES = ["en", "es"];
/** What a person sees in the picker, in their own language, never translated. */
export const LOCALE_NAMES = { en: "English", es: "Español" };

/**
 * Build one independent language scope.
 *
 * @param key         the `localStorage` key it remembers itself in
 * @param catalogues  `{ en: null, es: {…} }` — English is the key, so it has
 *                    no table; see `i18n.js` for the whole argument.
 * @param detectFromBrowser  whether an unset scope should read
 *                    `navigator.languages`. TRUE for a customer, who arrives
 *                    cold from a link with no account and no session, so the
 *                    browser is the only thing we know about them. FALSE for a
 *                    detailer, who signed up in English, agreed to terms in
 *                    English and would otherwise find their own back office in
 *                    a language they never asked for because of a laptop
 *                    someone else set up.
 */
export function makeLocale(key, catalogues, detectFromBrowser) {
  // `localStorage` throws outright in some embedded contexts, so every access
  // is wrapped — the rule `booking-core` § 1 enforces on the booking side.
  const read = () => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  const write = (v) => {
    try { localStorage.setItem(key, v); } catch { /* private window; the choice just does not persist */ }
  };

  function detect() {
    const saved = read();
    if (saved && LOCALES.includes(saved)) return saved;
    if (!detectFromBrowser) return "en";
    // `navigator.languages` is ordered by preference and is what to read;
    // `navigator.language` alone ignores somebody whose SECOND choice is the
    // one we speak.
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

  const getLocale = () => locale;

  function setLocale(next) {
    if (!LOCALES.includes(next) || next === locale) return;
    locale = next;
    write(next);
    // THE WHOLE PAGE RE-RENDERS RATHER THAN RELOADING. A reload is two lines
    // shorter and would throw away a half-filled booking form, which is the
    // one thing that page exists not to do — and on the dashboard it would
    // throw away whatever sheet somebody had open.
    for (const fn of listeners) fn();
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  /** What `Intl` should be given. `es-US`, never `es-ES`: it keeps
   *  `$1,234.50`, the 12-hour clock and month-before-day, three things a US
   *  reader takes as WRONG rather than as translated. */
  const intlLocale = () => (locale === "es" ? "es-US" : "en-US");

  /**
   * THE LOOKUP.
   *
   * `vars` interpolates `{name}` placeholders. **A placeholder missing from a
   * translation is a fact lost from the sentence** — "$40 off" becoming "off"
   * — so `tests/spanish.test.mjs` compares the placeholder sets of every pair
   * rather than trusting them to survive.
   */
  function t(english, vars) {
    const table = catalogues[locale];
    let out = (table && table[english]) || english;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
    }
    return out;
  }

  return { getLocale, setLocale, subscribe, intlLocale, t };
}
