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
  // **A LINK'S LANGUAGE LASTS THE VISIT; ONLY THE PICKER LASTS THE DEVICE —
  // his ruling and mine, 2026-09-12, after the first version wrote `?lang=es`
  // straight into `localStorage`.** A detailer texts a Spanish link, the
  // customer opens it on the household computer, and every later person to
  // book on that machine gets Spanish with nothing on screen explaining why.
  // Following a link is not choosing a language for the device; pressing ES
  // is.
  //
  // **IT NEEDS A STORE AT ALL BECAUSE THE VISIT SURVIVES A FULL PAGE LOAD.**
  // `ManageBookingPage.jsx:336` hands the browser to `checkout.stripe.com` and
  // Stripe returns to `?paid=1` with no `lang` on it, so a locale held only in
  // module memory would drop back to English mid-payment. `sessionStorage` is
  // exactly that scope: it survives the redirect and the reload, and it dies
  // with the tab.
  // **THE VISIT LAYER IS A CUSTOMER THING AND HAS TO BE GATED THE SAME WAY
  // `?lang=` IS — measured 2026-09-12, and it is the other half of the same
  // bug.** `readVisit()` is consulted BEFORE `read()` below, so a `dp.lang.app`
  // left in `sessionStorage` OUTRANKS the detailer's saved choice — and it is
  // invisible to `localStorage`, invisible to `document.cookie`, and survives
  // every reload of that tab. The state it produces is the one a reviewer
  // measured and could not explain: `dp.lang.app === "en"` in storage, no
  // language cookie, and a dashboard rendering Spanish, with nothing on screen
  // to change and nothing in the product to press. Setting the durable key by
  // hand and reloading does nothing, because the durable key is never reached.
  //
  // The layer exists for exactly two reasons and BOTH are the customer's: a
  // `?lang=` link, which only this scope may read, and the Stripe round trip in
  // `ManageBookingPage`. The dashboard has neither — nothing a detailer clicks
  // hands their scope a URL, and there is no redirect out and back. So the flag
  // that already decides whether `?lang=` may be read decides whether a visit
  // exists at all. One question, not two.
  //
  // **AND THIS HEALS EVERY BROWSER ALREADY STRANDED, WITH NO MIGRATION.** The
  // stale value is not deleted; it simply stops being consulted — the one
  // repair that also works for a tab nobody thinks to clear, which is every
  // tab, because nobody knows this key exists.
  const readVisit = () => {
    if (!detectFromBrowser) return null;
    try { return sessionStorage.getItem(key); } catch { return null; }
  };
  const writeVisit = (v) => {
    if (!detectFromBrowser) return;
    try { sessionStorage.setItem(key, v); } catch { /* no session storage; the link's language lasts one page */ }
  };

  function detect() {
    // **`?lang=es` IS READ FIRST, AND IT USED TO BE IGNORED ENTIRELY —
    // measured 2026-09-12 on a clean load with `dp.lang` cleared.**
    // `/book/demo-detail?lang=es` rendered in English and `dp.lang` stayed
    // null. `map.html` advertises that exact address as "Booking in Spanish",
    // so the link in the review map was dead — but the real cost is a detailer
    // texting a Spanish-speaking customer a `?lang=es` link that arrives in
    // English, which is the one case nobody would ever catch by clicking
    // around their own dashboard.
    //
    // IT OUTRANKS THE SAVED CHOICE, because somebody who follows a link
    // carrying a language is making a choice NOW — but only for THIS VISIT,
    // per the note on `writeVisit` above. A value that is not a language we
    // speak is ignored rather than stored, so `?lang=fr` leaves a Spanish
    // reader in Spanish.
    //
    // **AND ONLY THE CUSTOMER SCOPE MAY READ IT. THE FIRST VERSION DID NOT
    // GATE THIS AND IT BROKE THIS FILE'S OWN FIRST LAW — measured 2026-09-12,
    // his review.** Every scope runs `detect()` at module load, so a `?lang=es`
    // on a booking link set BOTH `dp.lang` AND `dp.lang.app`: one visit to a
    // customer's Spanish link turned the detailer's whole back office Spanish,
    // and it kept it that way after the customer key was cleared. That is
    // exactly the failure the header of this file was written to prevent —
    // *"a detailer previews their own booking page… pressing ES there would
    // turn their whole dashboard Spanish on the way back"* — arriving through
    // a URL instead of through the picker.
    //
    // **`?lang=` IS A LINK PARAMETER AND A LINK IS A CUSTOMER THING.** A
    // detailer chooses their language in their own settings; nothing they
    // click hands the dashboard scope a URL. `detectFromBrowser` is already
    // the "this scope belongs to a stranger who arrived cold from a link"
    // flag, so it is the same question and not a second one.
    if (detectFromBrowser) {
      try {
        const asked = new URLSearchParams(globalThis.location?.search ?? "").get("lang");
        const want = String(asked || "").toLowerCase().split("-")[0];
        if (want && LOCALES.includes(want)) { writeVisit(want); return want; }
      } catch { /* no location, or a URL the parser refuses */ }
    }
    const visit = readVisit();
    if (visit && LOCALES.includes(visit)) return visit;
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

  // **`<html lang>` FOLLOWS THE LOCALE — 2026-09-12, measured: `dp.lang` was
  // `es`, the body was Spanish, and the attribute said `en`.**
  //
  // It is not decoration. A screen reader picks its VOICE off this attribute,
  // so a page in that state is read aloud as Spanish words with English
  // phonemes — unintelligible to the one person who most needs it read aloud.
  // Browsers also use it for hyphenation and for offering to translate.
  //
  // Set here rather than in a component, because this is the one place that
  // knows the answer and the one place it can never drift from: every entry
  // point goes through `detect()` at module load and `setLocale()` after.
  // Guarded because the store is imported by Node in the test suite.
  const stamp = (v) => {
    try { if (globalThis.document) globalThis.document.documentElement.lang = v; }
    catch { /* no document */ }
  };

  // **IT USED TO STAMP HERE AND THAT IS WHY THE ATTRIBUTE WAS WRONG —
  // measured 2026-09-12: `dp.lang.app` was `es`, the dashboard rendered
  // Spanish, and `<html lang>` read `en`.**
  //
  // There is ONE `<html>` element and there are TWO scopes, and both of them
  // ran this line at module load. Whichever module the bundler happened to
  // evaluate last won, so the attribute described whichever surface the reader
  // was NOT looking at. It is not a race and it is not intermittent; it is a
  // question with no answer at module load, because at module load nothing
  // knows which surface is about to mount.
  //
  // So the scope no longer guesses: it hands `stampLang` out and the MOUNTED
  // surface calls it, through the hook it already has. `useLocale` is only
  // ever called from a booking page and `useAppLocale` only from the
  // dashboard, and `main.jsx` routes them apart, so exactly one answers at a
  // time. `setLocale` still stamps directly, because a picker press is
  // unambiguous about whose scope it is.
  let locale = detect();
  const listeners = new Set();

  const getLocale = () => locale;

  function setLocale(next) {
    if (!LOCALES.includes(next) || next === locale) return;
    locale = next;
    // BOTH, and the visit one is not optional: it is read FIRST, so a picker
    // that wrote only the durable key would be overruled on the next page by
    // the `?lang=` value the person just pressed a button to change.
    write(next);
    writeVisit(next);
    stamp(next);
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

  /** Write this scope's locale onto `<html lang>`. The MOUNTED surface calls
   *  it — see the note above `let locale`. Idempotent, so a hook may call it on
   *  every render without touching the DOM more than once. */
  const stampLang = () => stamp(locale);

  return { getLocale, setLocale, subscribe, intlLocale, t, stampLang };
}
