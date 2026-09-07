// ROADMAP 8.17 — SPANISH ON THE CUSTOMER-FACING BOOKING SURFACE.
//
// *"A lot of detailers speak Spanish… make sure you don't do bad translating."*
// *"I can't check that sadly, because I don't speak Spanish."*
//
// ---------------------------------------------------------------------------
// THE SECOND SENTENCE IS WHY THIS FILE EXISTS AND WHAT SHAPES EVERY CHECK IN
// IT.
// ---------------------------------------------------------------------------
// Nobody who can approve this product can read the output, so no check here
// can ask *is the Spanish good*. What it can ask is everything else, and every
// one of these is a failure that would otherwise reach a customer with nobody
// in between:
//
//   · a string somebody forgot to wrap, sitting in English in a Spanish page
//   · a key translated and then edited in English, so the Spanish silently
//     stops being used
//   · a `{placeholder}` dropped in translation — a phone number or a price
//     that vanishes from a sentence
//   · a `{placeholder}` INVENTED in translation, which renders the braces
//   · an entry copied across untranslated, which looks finished and is not
//
// **AND ONE THING IT DELIBERATELY CANNOT SEE.** `book/core.js` may not import
// anything (`booking-core` § 1 enforces that), so the four vehicle-condition
// labels are translated at the render site with `t(label)` — a variable no
// extractor can follow. They are listed here by hand, which is the honest
// version of a gap rather than a check that quietly covers three of four.
//
//   node tests/spanish.test.mjs        (credential-free)

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { es } from "../app/src/lib/strings/es.js";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
};

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const walk = (d, o = []) => {
  for (const f of readdirSync(d)) {
    const p = path.join(d, f);
    if (statSync(p).isDirectory()) walk(p, o);
    else if (/\.(jsx|js)$/.test(f)) o.push(p);
  }
  return o;
};
// ROADMAP 8.17 STAGE 2A — the edge functions are TypeScript, and § 6 walks
// them. `walk` above collects `.js`/`.jsx` only, so calling it on
// `supabase/functions` returned NOTHING and the sender check announced it had
// no subjects rather than passing quietly — which is the only reason it was
// noticed.
const walkTs = (d, o = []) => {
  for (const f of readdirSync(d)) {
    const p = path.join(d, f);
    if (statSync(p).isDirectory()) walkTs(p, o);
    else if (/\.ts$/.test(f)) o.push(p);
  }
  return o;
};
// **COMMENTS COME OUT FIRST.** A doc comment carrying `t("Choose your
// services")` as an EXAMPLE was read as a real call site on the first run of
// the extractor this check is built on — the comment-vacuity trap this repo
// has recorded six times, arriving in the one file that reads source as text
// for a living.
const strip = (t) => t
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

const BOOK = path.join(ROOT, "app/src/book");
const files = walk(BOOK).concat([
  path.join(ROOT, "app/src/lib/i18n.js"),
  path.join(ROOT, "app/src/hooks/useLocale.js"),
]);

const CALL = /\bt\(\s*"((?:[^"\\]|\\.)*)"/g;
const keys = new Set();
for (const p of files) {
  if (p.includes("strings")) continue;
  for (const m of strip(readFileSync(p, "utf8")).matchAll(CALL)) keys.add(m[1]);
}

// The four the extractor cannot follow. See the header.
const DYNAMIC = ["Light", "Moderate", "Heavy", "Extreme"];

const holes = (s) => (String(s).match(/\{[a-zA-Z]+\}/g) ?? []).sort().join(",");

// ─── 1. Every string the code asks for has a Spanish answer ───────────────
console.log("1. the catalogue and the call sites agree");
{
  check("1a · the check has subjects — call sites were found", keys.size > 100,
    `${keys.size} found`);
  const missing = [...keys].filter((k) => !(k in es));
  check("1b · every translated call site has a Spanish entry", missing.length === 0,
    missing.slice(0, 4).map((k) => JSON.stringify(k)).join(" · "));

  // **THE COST OF ENGLISH-AS-KEY, MADE LOUD.** Editing an English sentence
  // orphans its translation silently: the page keeps working, in English, in
  // the language nobody here can read. A stale entry is that, caught.
  const stale = Object.keys(es).filter((k) => !keys.has(k) && !DYNAMIC.includes(k));
  check("1c · and no Spanish entry is left describing English that is gone",
    stale.length === 0,
    stale.slice(0, 4).map((k) => JSON.stringify(k)).join(" · "));

  check("1d · the four keys no extractor can follow are translated",
    DYNAMIC.every((k) => typeof es[k] === "string" && es[k].length > 0));
}

// ─── 2. What a bad translation looks like from the outside ────────────────
console.log("2. the failures a person who cannot read it would never see");
{
  const same = Object.entries(es).filter(([k, v]) => k === v);
  // A handful of words are genuinely identical in both languages. Naming them
  // is cheaper than a rule, and the list is short enough to read.
  const IDENTICAL_IS_FINE = ["Email"];
  const copied = same.filter(([k]) => !IDENTICAL_IS_FINE.includes(k));
  check("2a · nothing was copied across untranslated", copied.length === 0,
    copied.slice(0, 4).map(([k]) => JSON.stringify(k)).join(" · "));

  // A DROPPED PLACEHOLDER IS A FACT MISSING FROM A SENTENCE — a phone number
  // or a price that simply is not there any more.
  const lost = Object.entries(es).filter(([k, v]) => holes(k) !== holes(v));
  check("2b · every placeholder survives translation, and none is invented",
    lost.length === 0,
    lost.slice(0, 3).map(([k, v]) => `${holes(k) || "none"} → ${holes(v) || "none"} in ${JSON.stringify(k.slice(0, 40))}`).join(" · "));

  check("2c · no entry is empty", Object.values(es).every((v) => String(v).trim() !== ""));

  // **`usted` NEVER APPEARS.** The register was chosen once (see `es.js`), and
  // a form that switches between `tú` and `usted` mid-flow reads as two people
  // wrote it — which is exactly the impression this item exists to avoid, and
  // exactly what nobody here can hear.
  const formal = Object.entries(es).filter(([, v]) => /\busted\b/i.test(v));
  check("2d · the register does not drift into usted", formal.length === 0,
    formal.slice(0, 3).map(([k]) => JSON.stringify(k.slice(0, 40))).join(" · "));
}

// ─── 3. The machinery, which decides whether any of it is reachable ───────
console.log("3. the plumbing");
{
  // ROADMAP 8.17 STAGE 2B — THE STORE MOVED AND THESE CHECKS FOLLOWED IT.
  // `localeStore.js` is now the one implementation and BOTH scopes are built
  // from it, so every check below covers the dashboard's language as well as
  // the customer's — which is strictly more than they used to.
  const i18n = strip(readFileSync(path.join(ROOT, "app/src/lib/localeStore.js"), "utf8"));
  const picker = strip(readFileSync(path.join(BOOK, "LanguagePicker.jsx"), "utf8"));
  const page = strip(readFileSync(path.join(BOOK, "BookingPage.jsx"), "utf8"));

  // A MISSING TRANSLATION MUST RENDER ENGLISH. This is the whole reason the
  // English is the key, and it is one `||` away from rendering nothing.
  check("3a · an untranslated key falls back to the English",
    /const table = catalogues\[locale\];/.test(i18n)
    && /\(table && table\[english\]\) \|\| english/.test(i18n));

  // `es-US`, NEVER `es-ES` — see the header of i18n.js. This one is invisible
  // in every screenshot until somebody looks at a price.
  check("3b · Intl is given es-US, so dollars and the 12-hour clock survive",
    /locale === "es" \? "es-US" : "en-US"/.test(i18n));

  // ENGLISH IS NEVER TAKEN AWAY. The picker is the way out of a translation
  // nobody here can check.
  check("3c · the picker is on the booking page itself",
    /<LanguagePicker \/>/.test(page) && /import LanguagePicker/.test(page));
  check("3c-ii · and it offers every installed language",
    /LOCALES\.map\(/.test(picker));
  // **THE CHIP SHOWS `EN` / `ES` AND THE NAME IS THE LABEL**, because the
  // full words wrapped the masthead at 392 and cost every step ~40px of the
  // detailer's own budget — eight of them went past the bottom of the screen.
  // The name must still be REACHABLE, and it must never be translated:
  // somebody looking for their own language looks for the word they know.
  check("3c-iii · each language's own name is the accessible label, untranslated",
    /aria-label=\{LOCALE_NAMES\[code\]\}/.test(picker) && !/t\(LOCALE_NAMES/.test(picker));
  check("3c-iv · and the chip itself is short enough not to wrap the masthead",
    /\{code\.toUpperCase\(\)\}/.test(picker));

  // THE CHOICE IS REMEMBERED, AND localStorage THROWS OUTRIGHT IN SOME
  // CONTEXTS — the rule `booking-core` already enforces for this surface.
  check("3d · every localStorage access is wrapped",
    (i18n.match(/localStorage\./g) ?? []).length
      === (i18n.match(/try \{[^}]*localStorage\./g) ?? []).length);

  // THE BROWSER'S OWN PREFERENCE ORDER, not just its first choice.
  check("3e · the default reads navigator.languages, not navigator.language alone",
    /navigator\.languages/.test(i18n));

  // AND SWITCHING MUST NOT RELOAD, or a half-filled booking form is thrown
  // away — the one thing this page exists not to do.
  check("3f · changing language notifies rather than reloads",
    /for \(const fn of listeners\) fn\(\)/.test(i18n)
    && !/location\.reload/.test(i18n));

}

// ─── 4. Nothing was left behind in English ────────────────────────────────
//
// **THE CHECK THAT MATTERS MOST, AND THE ONLY ONE THAT CAN FIND A STRING
// NOBODY WRAPPED.** A forgotten sentence is invisible in English, invisible
// to the owner, and the first person to meet it is a customer.
console.log("4. what is still hard-coded on the booking surface");
{
  // Text between tags with real words in it, outside an expression.
  const PROSE = /(?:[A-Z][a-z]+|[a-z]{3,})(?:[ ,'’.!?—-]+(?:[A-Za-z]{2,}))+/;
  // **WHAT STAGE 1 COVERS, NAMED HERE RATHER THAN IMPLIED BY AN EMPTY
  // RESULT.** The booking flow, the receipt page a customer reaches from
  // their confirmation email, and the opt-out. That is one complete journey:
  // book, then change or cancel, then stop the marketing.
  //
  // **THE MONTHLY-PLAN PAGES ARE IN IT AS OF STAGE 1B**, and the exclusion
  // that used to be here is worth keeping as a record of what the work was.
  // Almost everything a person reads on `/plan/:memberId` is a SENTENCE BUILT
  // BY `lib/plans.js` — "every 2 weeks", "1 visit each time", "12-month term",
  // "$60 a month" — assembled from fragments in a module the DASHBOARD shares.
  // So there was no string to look up: the generators take a language now,
  // English by default, and their Spanish sits beside their English in that
  // file rather than in the catalogue, exactly as `duration()` does.
  //
  // **AND THE PICKER ARRIVED WITH THE TRANSLATION, NOT BEFORE IT.** While
  // those pages were English-only they deliberately carried none — a control
  // promising a language the page cannot speak leaves the chrome switching and
  // the page itself in English, which is the two-language screen this whole
  // design avoids. § 4b is that rule with its sign flipped: now that the pages
  // can speak it, a page that does NOT offer the choice is the defect.
  const PLAN_PAGES = ["PlansPage.jsx", "PlanMemberPage.jsx"];
  const left = [];
  for (const p of walk(BOOK)) {
    if (p.endsWith("core.js")) continue;      // no imports allowed; see § 1d
    const src = strip(readFileSync(p, "utf8"));
    for (const m of src.match(/>[^<>{}\n][^<>{}]*</g) ?? []) {
      const text = m.slice(1, -1).trim();
      // **A FUNCTION CALL IS NOT PROSE.** `>` and `<` are also comparison
      // operators, so this pattern happily matches a slice of JavaScript —
      // `Math.round((new Date(booking.end_at) - new Date(` was reported as
      // untranslated English on the first run. An identifier immediately
      // followed by `(` is a call; prose only ever has a SPACE before its
      // brackets, as in "(optional)".
      if (/[A-Za-z_$]\(/.test(text)) continue;
      if (PROSE.test(text)) left.push(`${path.basename(p)}: ${text.slice(0, 48)}`);
    }
    for (const m of src.match(/(?:placeholder|aria-label)="[^"]{4,}"/g) ?? []) {
      left.push(`${path.basename(p)}: ${m.slice(0, 48)}`);
    }
  }
  check("4a · no hard-coded English prose is left in the booking surface",
    left.length === 0, left.slice(0, 5).join(" · "));

  // **AND A PAGE THAT CAN SPEAK IT HAS TO OFFER IT.** The plan pages are
  // reached from an EMAIL rather than from the booking flow, so a customer can
  // land on one in a browser that has never chosen a language — with no picker
  // there, somebody who reads Spanish has no way to ask for it and no way back
  // to the page that would have let them.
  // **`<LanguagePicker` AND NOT `LanguagePicker`.** The bare name is also the
  // IMPORT at the top of the file, so the first version of this check passed
  // with the control deleted from the markup — `indexOf` on a name that also
  // appears in an import, which is this repo's most repeated test defect, and
  // baselining is what caught it here.
  const silent = PLAN_PAGES.filter((f) =>
    !/<LanguagePicker/.test(strip(readFileSync(path.join(BOOK, f), "utf8"))));
  check("4b · the check has subjects — both plan pages were read",
    PLAN_PAGES.every((f) => readFileSync(path.join(BOOK, f), "utf8").length > 500));
  check("4b-ii · and each of them offers the choice it can now honour",
    silent.length === 0, silent.join(" · "));

  // **THE GENERATORS TAKE THE LANGUAGE AT EVERY CALL SITE ON THESE PAGES.**
  // This is § 5's argument one file over: `cadenceWords(plan)` is not prose,
  // it is a call that returns "Every 2 weeks", so § 4a cannot see a forgotten
  // argument — the page renders a fragment of English inside a Spanish
  // sentence and nothing reports it.
  const GEN = ["cadenceWords", "priceWords", "termWords", "visitWords", "statusWords"];
  const bare = [];
  for (const f of PLAN_PAGES) {
    const src = strip(readFileSync(path.join(BOOK, f), "utf8"));
    for (const g of GEN) {
      const re = new RegExp(`\\b${g}\\(([^)]*)\\)`, "g");
      for (const m of src.matchAll(re)) {
        if (!/\blang\b/.test(m[1])) bare.push(`${f}: ${m[0].slice(0, 40)}`);
      }
    }
  }
  check("4c · the check has subjects — the generators are called here",
    PLAN_PAGES.some((f) => GEN.some((g) =>
      strip(readFileSync(path.join(BOOK, f), "utf8")).includes(`${g}(`))));
  check("4c-ii · and every one of them is given the language",
    bare.length === 0, bare.slice(0, 4).join(" · "));

  // AND `dateLong` IS THE SAME SHAPE — a date formatter shared with the
  // dashboard, so it takes the language rather than reading it.
  const memberSrc = strip(readFileSync(path.join(BOOK, "PlanMemberPage.jsx"), "utf8"));
  const dates = [...memberSrc.matchAll(/dateLong\(([^)]*)\)/g)];
  check("4d · the check has subjects — dateLong is called on the member page",
    dates.length >= 2, `${dates.length} calls`);
  check("4d-ii · and every call passes the language",
    dates.every((m) => /\blang\b/.test(m[1])),
    dates.filter((m) => !/\blang\b/.test(m[1])).map((m) => m[0]).join(" · "));

  // AND THE GENERATORS THEMSELVES NEVER READ THE LOCALE. `lib/plans.js` is
  // shared with the detailer's dashboard and `dp.lang` is a per-device choice
  // a CUSTOMER makes, so a generator that reached for it would turn a
  // detailer's own back office Spanish the moment they previewed their page.
  const PLANS = strip(readFileSync(new URL("../app/src/lib/plans.js", import.meta.url), "utf8"));
  check("4e · the plan generators never read the active locale",
    !/getLocale|useLocale|dp\.lang|from "\.\/i18n/.test(PLANS));
  // **EVERY EXPORTED GENERATOR, DISCOVERED BY NAME RATHER THAN COUNTED.** A
  // threshold passes with one of them broken — the first version asked for
  // "at least four" of five and stayed green when `priceWords` lost its
  // default, which is a dashboard rendering Spanish for a detailer who never
  // asked. Each one has to carry it, and a sixth generator is covered the day
  // somebody writes it.
  const takesLang = [...PLANS.matchAll(/export function (\w+Words)\(([^)]*)\)/g)];
  check("4e-ii · the check has subjects — the generators were found",
    takesLang.length >= 4, `${takesLang.length} generators`);
  const noDefault = takesLang.filter((m) => !/lang = "en"/.test(m[2])).map((m) => m[1]);
  check("4e-iii · and every one defaults to English, so the dashboard is unaffected",
    noDefault.length === 0, noDefault.join(" · "));
}

// ─── 5. The formatters, which produce English without any string ─────────
//
// **A FORGOTTEN ARGUMENT HERE IS A FRAGMENT OF ENGLISH INSIDE A SPANISH
// SENTENCE, AND NOTHING ELSE IN THIS FILE CAN SEE IT.** § 4 reads the source
// for hard-coded prose; `duration(210)` is not prose, it is a call that
// returns "3 hr 30 min". Same reasoning that made `_shared/config.ts`'s `site`
// argument required in roadmap 3.3.
console.log("5. the formatters the booking surface calls");
{
  const calls = [];
  for (const p of walk(BOOK)) {
    const src = strip(readFileSync(p, "utf8"));
    for (const m of src.matchAll(/\bduration\(([^)]*)\)/g)) {
      if (/^\s*$/.test(m[1])) continue;
      calls.push([path.basename(p), m[0]]);
    }
  }
  check("5a · the check has subjects — duration() is called here",
    calls.length > 0, `${calls.length} calls`);
  const bare = calls.filter(([, c]) => !c.includes(","));
  check("5b · every duration() on the booking surface is given the language",
    bare.length === 0, bare.map(([f, c]) => `${f}: ${c}`).join(" · "));
  // And the English stays the default, because the dashboard shares this
  // function and must not follow a customer's per-device choice.
  const fmt = strip(readFileSync(path.join(ROOT, "app/src/lib/format.js"), "utf8"));
  check("5c · English stays the default, so the dashboard is unaffected",
    /export const duration = \(mins, lang = "en"\)/.test(fmt));
  check("5c-ii · and the formatter never reads the active locale itself",
    !/getLocale/.test(fmt));
}


// ─── 6. THE EMAILS ────────────────────────────────────────────────────────
//
// **AN EMAIL CANNOT BE CORRECTED AFTER IT IS SENT**, which makes every failure
// in this section worse than the same failure on a page. And the language
// cannot be read off the browser, because there is no browser: it is on the
// BOOKING (`bookings.lang`), chosen on the form and carried by every sender.
//
// § 6f and § 6h are the two no other check can make. A customer template that
// forgets `tt` sends a perfectly valid ENGLISH email to somebody who asked for
// Spanish, and a sender that forgets `lang` does the same from one function
// while the other seven are right — neither shows up on any screen, in any
// render, or in any contrast measurement.
console.log("6. the emails, where a mistake cannot be taken back");
{
  const SHARED = path.join(ROOT, "supabase/functions/_shared");
  const KIT = strip(readFileSync(path.join(SHARED, "emailKit.ts"), "utf8"));
  const TPL = strip(readFileSync(path.join(SHARED, "emailTemplates.ts"), "utf8"));
  // The email catalogue is a SECOND file and deliberately not the page one: a
  // Deno bundle cannot import out of `supabase/`, and the two hold almost no
  // sentences in common. Read as TEXT rather than imported, because Node will
  // not load a `.ts` module that imports another `.ts` module.
  const CAT = readFileSync(path.join(SHARED, "strings/es.ts"), "utf8");
  check("6a · the check has subjects — the email kit and catalogue were read",
    TPL.length > 5000 && CAT.length > 2000, `${TPL.length} / ${CAT.length}`);

  // ── the call sites and the catalogue agree ────────────────────────────
  const TT = /\btt\(\s*"((?:[^"\\]|\\.)*)"/g;
  // `T(lang)("…")` is the one shape that is not `tt(` — the footer calls it
  // inline because it has no local binding.
  const INLINE = /T\(lang\)\(\s*"((?:[^"\\]|\\.)*)"/g;
  const mailKeys = new Set();
  for (const src of [TPL, KIT]) {
    for (const m of src.matchAll(TT)) mailKeys.add(m[1]);
    for (const m of src.matchAll(INLINE)) mailKeys.add(m[1]);
  }
  check("6b · the check has subjects — the templates look words up",
    mailKeys.size > 60, `${mailKeys.size} keys`);

  const ENTRY = /^\s*"((?:[^"\\]|\\.)*)"\s*:/gm;
  const catKeys = new Set();
  for (const m of CAT.matchAll(ENTRY)) catKeys.add(m[1]);
  check("6b-ii · and the catalogue has entries to compare against",
    catKeys.size > 60, `${catKeys.size} entries`);

  const missing = [...mailKeys].filter((k) => !catKeys.has(k));
  check("6c · every looked-up sentence has a Spanish entry",
    missing.length === 0, missing.slice(0, 4).join(" · "));
  // AN ORPHAN IS A SENTENCE SOMEBODY EDITED IN ENGLISH. The Spanish is then
  // silently unused and the email goes out half translated.
  // **TWO ENTRIES NO EXTRACTOR CAN FOLLOW**, the same shape as the four
  // vehicle conditions in § 1: `paymentBlock` calls `tt(r.label)` on a value
  // rather than a literal, so "Other" and "Cash" are used and unfindable.
  // Venmo, Cash App, PayPal and Zelle are brand names and are deliberately not
  // in the catalogue at all.
  const DYNAMIC_MAIL = ["Other", "Cash"];
  check("6c-i · the check has subjects — the two dynamic labels are catalogued",
    DYNAMIC_MAIL.every((k) => catKeys.has(k)));
  for (const k of DYNAMIC_MAIL) mailKeys.add(k);
  const orphans = [...catKeys].filter((k) => !mailKeys.has(k));
  check("6c-ii · and no Spanish entry describes English that is gone",
    orphans.length === 0, orphans.slice(0, 4).join(" · "));

  // ── a placeholder dropped is a price that vanishes ────────────────────
  const bad = [];
  let pairs = 0;
  for (const k of catKeys) {
    const at = CAT.indexOf(`"${k}"`);
    if (at < 0) continue;
    const after = CAT.slice(at + k.length + 2);
    const v = after.match(/^\s*:\s*"((?:[^"\\]|\\.)*)"/)
      || after.match(/^\s*:\s*\r?\n\s*"((?:[^"\\]|\\.)*)"/);
    if (!v) continue;
    pairs++;
    if (holes(k) !== holes(v[1])) bad.push(`${k.slice(0, 34)} → ${holes(v[1]) || "(none)"}`);
  }
  check("6d · the check has subjects — the catalogue's pairs were read",
    pairs > 60, `${pairs} pairs`);
  check("6d-ii · no placeholder is dropped or invented in translation",
    bad.length === 0, bad.slice(0, 3).join(" · "));

  // ── the register, chosen once and kept ────────────────────────────────
  // The page catalogue chose `tú`, and an email that switches to the formal
  // register reads as a different company writing.
  // **`strip(CAT)`, BECAUSE THE FILE'S OWN COMMENT SAYS THE WORD.** The first
  // version read the raw text and failed on the header sentence explaining the
  // rule it exists to enforce — the comment-vacuity trap in reverse, and this
  // repo's seventh instance of it.
  check("6e · the register never drifts into usted",
    !/\busted\b|\bustedes\b/i.test(strip(CAT)));

  // ── EVERY CUSTOMER TEMPLATE ───────────────────────────────────────────
  // A template that is customer-facing and forgets `tt` sends an English email
  // to somebody who asked for Spanish, and nothing else in this repo can see
  // that.
  const CUSTOMER = [
    "customerConfirmationEmail", "requestDecisionEmail", "invoiceEmail",
    "followupEmail", "customerReminderEmail", "planLinkEmail",
    "maintenanceDueEmail",
  ];
  const bodyOf = (name) => {
    const at = TPL.indexOf(`export function ${name}(`);
    if (at < 0) return "";
    const next = TPL.indexOf("\nexport function ", at + 10);
    return TPL.slice(at, next > at ? next : TPL.length);
  };
  check("6f · the check has subjects — every named template was found",
    CUSTOMER.every((n) => bodyOf(n).length > 200),
    CUSTOMER.filter((n) => bodyOf(n).length <= 200).join(" · "));
  const untranslated = CUSTOMER.filter((n) => !/\bT\(/.test(bodyOf(n)));
  check("6f-ii · every customer template binds the language",
    untranslated.length === 0, untranslated.join(" · "));
  // AND PASSES IT TO THE SHELL, which owns `<html lang>` and the footer. An
  // email that is Spanish everywhere except its last three lines is the
  // two-language document this whole item exists to avoid.
  const noShell = CUSTOMER.filter((n) => !/shell\([\s\S]*?\{ lang/.test(bodyOf(n)));
  check("6f-iii · and hands it to the shell, which owns the footer",
    noShell.length === 0, noShell.join(" · "));

  // ── AND THE DETAILER'S OWN MAIL IS UNTOUCHED ──────────────────────────
  // Their language is the dashboard's question (stage 2b). A Spanish booking
  // must not turn a detailer's own alerts Spanish while their dashboard stays
  // English — that is worse than either.
  const OWNER = ["ownerNewBookingEmail", "staleRequestEmail", "inviteEmail",
    "planCancelledEmail", "billingEmail", "platformAlertEmail"];
  check("6g · the check has subjects — every owner template was found",
    OWNER.every((n) => bodyOf(n).length > 150),
    OWNER.filter((n) => bodyOf(n).length <= 150).join(" · "));
  const leaked = OWNER.filter((n) => /\bT\(/.test(bodyOf(n)));
  check("6g-ii · and none of the detailer's own mail is translated",
    leaked.length === 0, leaked.join(" · "));

  // ── EVERY SENDER, DISCOVERED BY WHAT IT BUILDS ────────────────────────
  // A `BookingEmailData` is recognised by its `dateStr:` line — the same way
  // `multi-vehicle` finds them — because a hand-written caller list in this
  // repo has already been short by one.
  const FN = path.join(ROOT, "supabase/functions");
  const senders = [];
  for (const f of walkTs(FN)) {
    if (!f.endsWith("index.ts")) continue;
    const src = strip(readFileSync(f, "utf8"));
    if (!/\bdateStr:\s/.test(src)) continue;
    senders.push([path.basename(path.dirname(f)), src]);
  }
  check("6h · the check has subjects — the senders were discovered",
    senders.length >= 6, `${senders.length}: ${senders.map((x) => x[0]).join(", ")}`);
  // `preview-emails` builds a fixture for the back office rather than sending
  // to anybody, so it is the one that legitimately has no row to read.
  const forgot = senders
    .filter(([name]) => name !== "preview-emails")
    .filter(([, src]) => !/\blang[,:]/.test(src))
    .map(([name]) => name);
  check("6h-ii · and every one of them carries the language",
    forgot.length === 0, forgot.join(" · "));

  // ── THE COLUMN, AND WHAT IT REFUSES ───────────────────────────────────
  const MIG = readFileSync(
    path.join(ROOT, "supabase/migrations/20260907007000_booking_language.sql"), "utf8");
  check("6i · the column exists, defaults to English and cannot hold a typo",
    /add column if not exists lang text not null default 'en'/.test(MIG)
    && /check \(lang in \('en', 'es'\)\)/.test(MIG));
  // **NARROWED AT THE DOOR RATHER THAN PASSED THROUGH.** The column is
  // check-constrained, so a client posting `"fr"` would fail the INSERT and
  // take a real booking down over a preference.
  const CREATE = strip(readFileSync(path.join(FN, "create-booking/index.ts"), "utf8"));
  check("6j · create-booking narrows the language rather than trusting it",
    /const lang = langOf\(body\.lang\)/.test(CREATE));
  const CORE = strip(readFileSync(path.join(ROOT, "app/src/book/core.js"), "utf8"));
  check("6k · the booking core sends it, and still imports nothing",
    /lang: lang \|\| null/.test(CORE) && !/^\s*import /m.test(CORE));
}

// ─── 7. The column, asked rather than read ────────────────────────────────
//
// § 6i reads the MIGRATION. This asks the live database, because a migration
// in the repo and a column on the server are two different facts — and the one
// that matters is whether a typo'd language can actually be stored. If it can,
// every lookup falls through to English and the email goes out in the wrong
// language looking perfectly correct.
console.log("7. what the language column actually refuses");
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log("  SKIPPED — needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
} else {
  const URL_ = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
  const rest = (p, init = {}) =>
    fetch(`${URL_}/rest/v1/${p}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const [biz] = await rest("businesses?slug=eq.demo-detail&select=id").then((r) => r.json());
  const [row] = await rest(
    `bookings?business_id=eq.${biz?.id}&deleted_at=is.null&select=id,lang&limit=1`,
  ).then((r) => r.json());
  check("7a · the check has a subject — a demo booking was found", !!row?.id);
  if (row?.id) {
    const before = row.lang;
    const set = (v) => rest(`bookings?id=eq.${row.id}`, {
      method: "PATCH", body: JSON.stringify({ lang: v }),
    }).then((r) => r.status);
    try {
      check("7b · Spanish is accepted", await set("es") < 300);
      const [after] = await rest(`bookings?id=eq.${row.id}&select=lang`).then((r) => r.json());
      check("7b-ii · and stored as asked", after?.lang === "es");
      check("7c · English is accepted", await set("en") < 300);
      // THE ONE THAT MATTERS. A stored "fr" is a booking whose every email
      // falls through to English while the row says otherwise — a silent
      // wrong answer nobody could ever see, which is the failure this whole
      // item is shaped around.
      check("7d · a language this product does not have is refused",
        await set("fr") >= 400);
      check("7d-ii · and so is an empty one", await set("") >= 400);
      // EVERY EXISTING BOOKING IS ENGLISH, which is what they were written in.
      const [{ count: nonEn } = {}] = [{ count: null }];
      const others = await rest(
        `bookings?business_id=eq.${biz.id}&lang=neq.en&select=id&limit=5`,
      ).then((r) => r.json());
      check("7e · nothing was migrated into a language nobody chose",
        Array.isArray(others) && others.filter((o) => o.id !== row.id).length === 0,
        `${nonEn ?? (Array.isArray(others) ? others.length : "?")}`);
    } finally {
      await rest(`bookings?id=eq.${row.id}`, {
        method: "PATCH", body: JSON.stringify({ lang: before ?? "en" }),
      });
      const [back] = await rest(`bookings?id=eq.${row.id}&select=lang`).then((r) => r.json());
      check("7f · the demo booking is put back as it was",
        (back?.lang ?? null) === (before ?? null));
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
