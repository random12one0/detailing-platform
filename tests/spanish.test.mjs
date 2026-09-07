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
  const i18n = strip(readFileSync(path.join(ROOT, "app/src/lib/i18n.js"), "utf8"));
  const picker = strip(readFileSync(path.join(BOOK, "LanguagePicker.jsx"), "utf8"));
  const page = strip(readFileSync(path.join(BOOK, "BookingPage.jsx"), "utf8"));

  // A MISSING TRANSLATION MUST RENDER ENGLISH. This is the whole reason the
  // English is the key, and it is one `||` away from rendering nothing.
  check("3a · an untranslated key falls back to the English",
    /const table = CATALOGUES\[locale\];/.test(i18n)
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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
