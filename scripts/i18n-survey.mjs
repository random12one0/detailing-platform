// WHAT IS STILL IN ENGLISH, AND WHERE — roadmap 8.17 stage 2b, 2026-09-07.
//
// ---------------------------------------------------------------------------
// WHY A SCRIPT RATHER THAN A GREP
// ---------------------------------------------------------------------------
// Stage 2b is **all of the dashboard or none of it**: the picker is global,
// and *a control must not promise a language the surface cannot speak* (stage
// 1b's rule). So the question that has to be answerable at any moment during
// this item is **"what is left"** — and a grep for quotes answers a different
// question, because most string literals in this codebase are class names,
// column names, statuses and storage keys.
//
// It is the same instrument twice:
//
//   · **BEFORE** — how big each screen is, so the work can be ordered.
//   · **AFTER**  — `--left` lists what is STILL unwrapped, which is what
//     `tests/spanish.test.mjs` § 4 does for the booking surface and what
//     nothing has ever done for the dashboard.
//
//   node scripts/i18n-survey.mjs                      # counts, biggest first
//   node scripts/i18n-survey.mjs --left               # every one, by file
//   node scripts/i18n-survey.mjs --left --file Today
//
// ---------------------------------------------------------------------------
// THE FIRST VERSION WAS WRONG IN BOTH DIRECTIONS, WHICH IS WHY THE RULES ARE
// SPELLED OUT RATHER THAN TUNED
// ---------------------------------------------------------------------------
// Checked against `screens/Today.jsx` the moment it ran, it did both of the
// things that make a tool get ignored:
//
//   · **It reported JSX CODE as text.** A `>([^<>{}]+)<` sweep happily matches
//     from the `>` of an arrow function to the `<` of the next tag, so three
//     of sixteen "strings" were fragments of a ternary.
//   · **It missed seven real ones** — `"Next up"`, `"Morning"`, `"Waiting on
//     you"`, `"Nothing collected yet"` — because they are bare literals in
//     arrays and ternaries rather than JSX children or known attributes.
//
// **The second is the dangerous direction**, and it is this repo's oldest
// failure wearing new clothes: a survey that under-reports is a green tick on
// a screen that is still half English. So the rule now is a literal is a
// CANDIDATE UNLESS SOMETHING RULES IT OUT, and every exclusion is named below
// rather than inferred.
//
// ---------------------------------------------------------------------------
// WHAT IS RULED OUT, AND WHY EACH ONE
// ---------------------------------------------------------------------------
//   · **A string handed to a data call** — `.from("bookings")`, `.eq(…)`,
//     `getItem("dp.lang")`, `querySelector(…)`. `CODE_CALLS` names them. This
//     is the exclusion that matters most: `"bookings"` is a table and
//     `"Bookings"` is a heading, and only the call site tells them apart.
//   · **A string in a structural attribute** — `className`, `id`, `key`,
//     `type`, `role`, `href`, `data-*`. `CODE_ATTRS` names them.
//   · **A value the database or the DOM defines** — `active`, `pending`,
//     `owner`, `polite`. `NOT_WORDS` names them.
//   · **Anything already inside `t(`.**
//   · **Anything shaped like code** — a path, a URL, a colour, an identifier,
//     a number, a format string.
//
// **A phrase must contain a space or be Capitalised.** A bare lowercase word
// is a column name far more often than it is a sentence, and letting them in
// put `bookings`, `services` and `customers` on the list.
//
// **IT IS A HEURISTIC AND THE COUNT IS FOR ORDERING THE WORK.** What signs
// this item off is the Spanish dashboard being LOOKED AT, at five widths.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SRC = path.join(ROOT, "app", "src");

// THE THREE GROUPS THAT ARE NOT THIS ITEM'S, named rather than pattern-matched
// so a new directory shows up as a finding rather than vanishing.
//
//   · `book/` is DONE — stage 1 and 1b, the customer's whole journey.
//   · `admin/` is the owner's own back office and STAYS ENGLISH. He runs it,
//     he reads English, and it is the one screen where a machine translation
//     buys nothing and risks a misread about somebody's money.
//   · `landing/` is marketing AND the legal pages. **`legal.js` must never be
//     machine-translated by anybody**: it is a contract carrying the AB 2863
//     disclosures, and a translation nobody qualified has read is a liability
//     rather than a feature. The marketing copy around it is his decision.
//   · `lib/accountant-export.js` is a DOCUMENT THAT LEAVES — its exact bytes
//     are the tie-out contract `tests/money-export.test.mjs` asserts, and it
//     is opened by somebody else months later. That file's own header has the
//     three reasons in full.
//   · `lib/adminInsight.js` is imported by `admin/AdminPage.jsx` and by
//     nothing else — it is the back office wearing a `lib/` path, and the
//     back office stays English.
//   · `lib/plans.js` ALREADY SPEAKS BOTH, since stage 1b: its five sentence
//     generators take a language and carry their Spanish beside their
//     English. The survey would otherwise report both halves of every pair.
//     What stage 2b owed there was the CALL SITES passing the dashboard's
//     language, which they now do.
const OUT_OF_SCOPE = ["book", "admin", "landing", "lib/strings",
  "lib/accountant-export.js", "lib/adminInsight.js", "lib/plans.js"];

/** Attributes whose value is machinery, not words. Everything else that takes
 *  a string is assumed to be read by somebody. */
const CODE_ATTRS = new Set([
  "className", "class", "id", "key", "type", "name", "role", "href", "to",
  "src", "htmlFor", "autoComplete", "inputMode", "enterKeyHint", "style",
  "value", "accept", "rel", "target", "method", "action", "as", "tag",
  "variant", "size", "align", "dir", "lang", "mode", "kind", "scope", "form",
  "list", "pattern", "step", "min", "max", "width", "height", "viewBox", "d",
  "fill", "stroke", "transform", "points", "path", "icon", "color", "bg",
]);

/** Calls whose string argument is a table, a column, a key or a selector. */
const CODE_CALLS = new Set([
  "from", "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "like", "ilike",
  "not", "or", "and", "select", "order", "filter", "rpc", "channel", "on",
  "getItem", "setItem", "removeItem", "getElementById", "querySelector",
  "querySelectorAll", "addEventListener", "removeEventListener", "matchMedia",
  "createElement", "setAttribute", "getAttribute", "removeAttribute",
  "add", "remove", "toggle", "contains", "has", "get", "set", "delete",
  "includes", "startsWith", "endsWith", "split", "join", "match", "test",
  "parse", "stringify", "navigate", "push", "replace", "warn", "error", "log",
  "invoke", "functions", "storage", "upload", "download", "createSignedUrl",
  "getPublicUrl", "listen", "emit", "track", "t", "tt", "supabase",
]);

/** CLASS LISTS THAT READ AS SENTENCES, NAMED RATHER THAN PATTERN-MATCHED.
 *
 *  `["dot confirmed", "Booked", …]` is a pair of a class and a label, and
 *  `"dot confirmed"` is structurally identical to `"nothing booked"` — both
 *  are two lowercase words. No rule can separate them, so the four that exist
 *  are listed. A FIFTH showing up is a finding, which is the same shape as
 *  `db-audit`'s two allowlists and for the same reason: a check that cries
 *  wolf on every run is a check nobody reads. */
const CLASS_LISTS = new Set([
  "dot confirmed", "dot completed", "dot no_show", "dot block",
]);

/** VALUES THAT ARE WRITTEN DOWN, NOT DRAWN ON A SCREEN.
 *
 *  `plan_visits.note` records why a visit was added or skipped, and
 *  `bookings.payment_notes` records how somebody paid. Translating either
 *  would put two languages in ONE ledger — whichever the detailer was reading
 *  the day they pressed the button — and a ledger is read back months later.
 *  So the BUTTON is translated and the record it writes is not; every call
 *  site says so as well.
 *
 *  The same argument, one level up, is why `lib/accountant-export.js` is out
 *  of scope entirely: it is a document that leaves the building. */
const STORED_VALUES = new Set(["Skipped", "Added by hand"]);

/** PROPER NOUNS, WHICH ARE THE SAME WORD IN EVERY LANGUAGE.
 *
 *  Putting `"Venmo": "Venmo"` in the catalogue would silence these too, and
 *  it would be a lie about what the catalogue is for — that file is a record
 *  of translation DECISIONS, and there is no decision here. Naming them makes
 *  the reason readable instead. */
const BRAND_NAMES = new Set([
  "Venmo", "Cash App", "PayPal", "Zelle", "Apple Pay", "Google", "Yelp",
  "Stripe", "Instagram", "Facebook", "TikTok", "Netlify", "Resend",
  "Android", "iPhone", "Waze", "Apple Maps", "Google Maps", "Google Calendar",
]);

/** Database enums, DOM values and CSS words — never a sentence. */
const NOT_WORDS = new Set([
  "active", "paused", "pending", "cancelled", "confirmed", "completed", "done",
  "owner", "staff", "money", "marketing", "settings", "requests", "en", "es",
  "mobile", "dropoff", "reserve", "request", "monthly", "per_visit", "total",
  "percent_off", "asc", "desc", "button", "submit", "text", "email", "tel",
  "url", "number", "date", "time", "password", "checkbox", "radio", "search",
  "polite", "assertive", "true", "false", "none", "auto", "off", "on", "left",
  "right", "up", "down", "small", "large", "medium", "primary", "ghost",
  "past_due", "suspended", "incomplete", "trialing", "unpaid", "canceled",
  "founding", "list", "invited", "accepted", "declined", "quoted", "expired",
]);

/** SHAPES THAT ARE CODE WHEREVER THEY APPEAR.
 *
 *  These reach the sweep because the call that owns them is on an earlier
 *  line — a `.select()` argument written across four lines is a string whose
 *  `select(` is nowhere near it — so the call-site test cannot see them and
 *  the shape has to. All six are unmistakable:
 *
 *    · a PostgREST embed — `plan:plans(id, name)`, `booking_add_ons(add_on:…)`
 *    · a CSS media query — `(prefers-reduced-motion: reduce)`
 *    · a font stack     — `Archivo, sans-serif`
 *    · a selector list  — `.Tab, .Block`
 */
const CODE_SHAPES = [
  /^[*\s,]*(?:[A-Za-z_]+:)?[A-Za-z_]+\([A-Za-z_ ,:()]*\)[,\s]*$/,  // PostgREST embed
  /^\((?:prefers|min|max|any)-[a-z-]+:/,                    // a media query
  /,\s*(sans-serif|serif|monospace|system-ui|ui-\w+)$/,     // a font stack
  /^\.[A-Za-z][\w-]*(\s*,\s*\.[A-Za-z][\w-]*)+$/,           // a selector list
];

const looksLikeCode = (s) => (
  CODE_SHAPES.some((re) => re.test(s))
  || s.length < 2
  || !/[A-Za-z]{2}/.test(s)
  || /^(https?:|mailto:|tel:|\/|\.\/|#|data:|blob:)/.test(s)
  || /^#[0-9a-fA-F]{3,8}$/.test(s)
  || /^[\d\s.,:%/$-]+$/.test(s)
  || /^[a-z0-9]+([-_.][a-z0-9]+)+$/.test(s)        // kebab / snake / dotted key
  || /^[a-z]+([A-Z][a-z0-9]*)+$/.test(s)           // camelCase
  || /^[A-Z0-9_]+$/.test(s)                        // CONSTANT_CASE
  || /^\d+(px|rem|em|vh|vw|fr|s|ms|%)$/.test(s)
  // **CASE-SENSITIVE, AND THAT IS THE FIX FOR A REAL MISS.** `mobile` is the
  // column value; `Mobile` is the word on a request card. Lower-casing before
  // the lookup hid `"Mobile"` and `"Drop-off"` on the one screen a detailer
  // sees every morning, and the survey reported the file clean.
  || NOT_WORDS.has(s)
);

/** Words somebody reads: a phrase with a space, or one Capitalised word.
 *  A bare lowercase word is a column name more often than a sentence. */
const isPhrase = (s) => {
  const v = s.trim();
  if (!v || looksLikeCode(v) || CLASS_LISTS.has(v) || BRAND_NAMES.has(v)) return false;
  if (STORED_VALUES.has(v)) return false;
  if (/\s/.test(v)) return /[A-Za-z]{2,}/.test(v);
  return /^[A-Z][a-z]{2,}$/.test(v);
};

/** Comments make a source-as-text read lie — this repo has been caught by that
 *  five times (CLAUDE.md). Strings are the subject here, so only comments go. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length));
}

/** Inside an unclosed `t(` within the preceding 300 characters. Wrong only in
 *  the direction of hiding something already done, which is the safe way for a
 *  tool whose job is "what is left". */
function insideT(src, at) {
  const before = src.slice(Math.max(0, at - 300), at);
  const lastT = before.search(/\bt\(\s*$|\bt\([^()]*$/);
  if (lastT < 0) return false;
  let depth = 0;
  for (const ch of before.slice(lastT)) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
  }
  return depth > 0;
}

const lineOf = (src, at) => src.slice(0, at).split("\n").length;

// A STRING ALREADY IN THE CATALOGUE IS HANDLED, WHEREVER IT SITS.
//
// English is the key, so `appEs.js` IS the list of what has been dealt with —
// and reading it closes the one false positive this tool cannot otherwise
// reason about: **a key held in a constant.** `App.jsx`'s `TABS` carries
// `label: "Today"` and renders `t(x.label)`, which is correct and is the only
// shape that works — a module-level `t()` runs once at import and freezes the
// dashboard in whatever language it started in, so the switch changes nothing.
//
// Reading the catalogue rather than inventing a marker comment also means
// there is nothing to remember: translating a string is what marks it done.
const CATALOGUE = (() => {
  try {
    const src = readFileSync(path.join(SRC, "lib", "strings", "appEs.js"), "utf8");
    return new Set(
      [...src.matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm)]
        // UNESCAPED EXACTLY AS `untranslated()` DOES IT. A key containing a
        // newline is written `\n` in BOTH files; reading one raw and the other
        // cooked makes a key that is plainly present read as missing.
        .map((m) => m[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\")),
    );
  } catch { return new Set(); }
})();

function candidates(raw) {
  const src = stripComments(raw);
  const out = [];
  const known = [];
  const seen = new Set();
  const add = (at, kind, text) => {
    if (!isPhrase(text)) return;
    // **ALREADY INSIDE `t(` IS THE FIRST QUESTION, AND ASKING IT SECOND MADE
    // THE WHOLE DEMOTED LIST NOISE.** With the catalogue tested first, every
    // properly wrapped string whose words happen to be in the catalogue — which
    // is nearly all of them — was filed as "raw but known" and the list came
    // out at 506 entries. A list that long is one nobody reads, which is the
    // failure this file warns about in its own header.
    if (insideT(src, at)) return;
    // **A CATALOGUE HIT DEMOTES, IT DOES NOT SILENCE — and the first version
    // silenced.** The skip exists for a key held in a CONSTANT (`label:
    // "Today"`, translated at the render site), which is correct and
    // undetectable from here. It also hid `"Quote"` sitting raw in
    // `RequestCard.jsx` beside two wrapped siblings, because the word was in
    // the catalogue for a different screen. Found by reading the card in a
    // browser with the language set to Spanish and seeing one English word
    // between "Aceptar" and "Rechazar".
    if (CATALOGUE.has(text.trim())) { known.push({ line: lineOf(src, at), text: text.trim() }); return; }
    const line = lineOf(src, at);
    const k = `${line}:${text.trim()}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ line, kind, text: text.trim() });
  };

  // 1 · JSX TEXT NODES — between a tag close and the next tag open. Tightened
  // against the arrow-function bug: no `=`, `(`, `)`, `;`, `?` or `:` may
  // appear, which is what separates words from a ternary's fragments.
  // THE SAME OPERATOR SET THE CODEMOD LEARNED THE HARD WAY. Without `&` and
  // `|` this matches from the `>` of a COMPARISON to the `<` of the next tag
  // and reports `buildFee &&` as a string somebody forgot to translate —
  // which is a false positive in the one tool whose whole job is to be
  // believed about what is left.
  for (const m of src.matchAll(/>([^<>{}]+)</g)) {
    if (/[()=;?&|!*/%+`~^]/.test(m[1])) continue;
    const text = m[1].replace(/\s+/g, " ");
    if (!/[A-Za-z]{2}/.test(text)) continue;
    add(m.index + 1, "jsx", text);
  }

  // 2 · EVERY OTHER STRING LITERAL, minus what the header rules out. This is
  // the half the first version did not have, and it is where `"Next up"` and
  // `"Waiting on you"` live.
  // **THE BODY MAY ONLY EXCLUDE THE OPENING QUOTE, NOT BOTH.** The first
  // version used one pattern with a backreference and a body of `[^"'\\\n]`,
  // which cannot match `"We'll text you"` at all — so the sweep then found
  // `'ll text you when we'` as if it were a single-quoted string and reported
  // that fragment as an untranslated line. Every contraction in the product
  // came back mangled. Two alternatives, one per quote character, is the only
  // shape a regex can express this in.
  for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'/g)) {
    const text = m[1] ?? m[2];
    if (!text) continue;
    const before = src.slice(Math.max(0, m.index - 60), m.index);

    // An attribute whose value is machinery.
    const attr = before.match(/([A-Za-z-]+)\s*=\s*\{?\s*$/);
    if (attr && CODE_ATTRS.has(attr[1])) continue;
    if (attr && /^data-|^aria-(hidden|live|controls|labelledby|describedby|expanded|selected|current|pressed)$/.test(attr[1])) continue;

    // An argument to a call that takes tables, columns, keys or selectors.
    const call = before.match(/\.?([A-Za-z_$][\w$]*)\s*\(\s*$/);
    if (call && CODE_CALLS.has(call[1])) continue;

    // A KEYBOARD KEY. `e.key === "Enter"` is the DOM's word, not ours, and
    // `"Enter"` is otherwise indistinguishable from a button label — which is
    // exactly why the test is the comparison it sits in rather than the word.
    if (/\bkey\s*[=!]==?\s*$/.test(before)) continue;

    // An object key — `{ status: "active" }` is a value, not a sentence,
    // unless the key is one that holds words.
    const field = before.match(/([A-Za-z_$][\w$]*)\s*:\s*$/);
    const WORDY = /^(text|label|title|heading|sub|blurb|hint|note|caption|placeholder|message|body|question|answer|words|sentence|name|summary|desc|description|error|ok|help|cta|lead|eyebrow)$/;
    if (field && !WORDY.test(field[1])) continue;

    add(m.index, field ? "field" : attr ? "attr" : "lit", text);
  }

  out.known = known;
  return out.sort((a, b) => a.line - b.line);
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(SRC, full).split(path.sep).join("/");
    if (OUT_OF_SCOPE.some((p) => rel === p || rel.startsWith(`${p}/`))) continue;
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(jsx|js)$/.test(name)) acc.push(full);
  }
  return acc;
}

// ---------------------------------------------------------------------------
// THE OTHER HALF: A KEY THAT IS WRAPPED AND HAS NO TRANSLATION
// ---------------------------------------------------------------------------
// **THE SWEEP ABOVE ONLY FINDS STRINGS NOBODY WRAPPED, AND THAT IS HALF THE
// QUESTION.** `t("Settings")` is wrapped, passes every check in this file, and
// renders the English word "Settings" in a Spanish dashboard — because English
// is the key and a missing entry falls back to it. That fallback is the right
// design (a missing translation shows correct English rather than a debug
// identifier) and it is exactly what makes the gap invisible.
//
// It was found by PRESSING ES in a browser and reading the heading, which is
// the only instrument that can see it: nothing in the source is wrong.
//
//   node scripts/i18n-survey.mjs --untranslated
//
// A key here means one screen is in two languages. There is no honest way to
// have a "some of it" state, so this has to reach zero alongside the sweep.
function untranslated() {
  const missing = new Map();
  for (const file of walk(SRC)) {
    const rel = path.relative(SRC, file).split(path.sep).join("/");
    if (only && !rel.includes(only)) continue;
    const src = stripComments(readFileSync(file, "utf8"));
    // Only a LITERAL first argument can be checked. `t(label)` is a variable
    // and its value is somebody else's constant, which the sweep above covers.
    for (const m of src.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) {
      const key = m[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
      if (CATALOGUE.has(key)) continue;
      if (!missing.has(key)) missing.set(key, []);
      missing.get(key).push(`${rel}:${lineOf(src, m.index)}`);
    }
  }
  return missing;
}

const args = process.argv.slice(2);
const showLeft = args.includes("--left");
const showUntranslated = args.includes("--untranslated");
const only = args.includes("--file") ? args[args.indexOf("--file") + 1] : null;

const nlPad = (k) => " ".repeat(Math.max(1, 62 - JSON.stringify(k).length));

if (showUntranslated) {
  const missing = untranslated();
  for (const [key, where] of [...missing].sort()) {
    console.log(`  ${JSON.stringify(key)}${nlPad(key)}${where[0]}${where.length > 1 ? ` (+${where.length - 1})` : ""}`);
  }
  console.log(`
${missing.size} wrapped keys with no Spanish — each one is a screen in two languages`);
  process.exit(0);
}
const rows = [];
const knownRows = [];
for (const file of walk(SRC)) {
  const rel = path.relative(SRC, file).split(path.sep).join("/");
  if (only && !rel.includes(only)) continue;
  const found = candidates(readFileSync(file, "utf8"));
  if (found.length) rows.push({ rel, found });
  // **THE DEMOTED LIST IS BEHIND `--left`, BECAUSE IT CANNOT BE SHORTENED
  // HONESTLY.** A discriminator was tried — only print for a file that never
  // calls `t(variable)` — and it changed nothing, because nearly every screen
  // translates a variable somewhere AND holds raw catalogue words in a
  // constant. The two are genuinely indistinguishable from here.
  //
  // So it is a REVIEW list rather than a check: 481 entries, most of them
  // correct, worth reading once when a screen comes out half-English. What
  // actually finds those is `scripts/spanish-dom.mjs`, which reads the live
  // page with the language set to Spanish and reports English it can still
  // see — the only instrument that can, because nothing in the source is
  // wrong.
  if (found.known?.length) knownRows.push({ rel, known: found.known });
}
rows.sort((a, b) => b.found.length - a.found.length);

if (showLeft) {
  for (const { rel, found } of rows) {
    console.log(`\n${rel}  —  ${found.length}`);
    for (const c of found) console.log(`  ${String(c.line).padStart(4)}  ${c.kind.padEnd(5)} ${c.text}`);
  }
} else {
  for (const { rel, found } of rows) console.log(`${String(found.length).padStart(4)}  ${rel}`);
}

// AND THE OTHER HALF OF THE JOB, WHICH NO STRING SURVEY CAN SEE: A DATE
// FORMATTED AT A HARD-CODED LOCALE. `toLocaleDateString("en-US", …)` renders
// perfect English inside a Spanish sentence and there is no string to wrap —
// this is the `duration()` finding from stage 1, one layer down and twenty
// call sites wide. They must take `intlLocale()` from the right SCOPE, which
// for the dashboard is `dp.lang.app` and never `dp.lang`.
//
// `localeStore.js` is where the two literals are DEFINED and is not a finding.
{
  const hits = [];
  for (const file of walk(SRC)) {
    const rel = path.relative(SRC, file).split(path.sep).join("/");
    if (rel === "lib/localeStore.js") continue;
    if (only && !rel.includes(only)) continue;
    const src = stripComments(readFileSync(file, "utf8"));
    for (const m of src.matchAll(/"(en-US|es-US|en|es)"/g)) {
      const before = src.slice(Math.max(0, m.index - 40), m.index);
      if (!/(toLocale\w*|Intl\.[A-Za-z]+\(|DateTimeFormat\(|NumberFormat\(|RelativeTimeFormat\()[^(]*\($/.test(before)) continue;
      hits.push(`${rel}:${lineOf(src, m.index)}`);
    }
  }
  if (hits.length) {
    console.log(`
${hits.length} hard-coded locales — a date in English inside a Spanish sentence:`);
    for (const h of hits) console.log(`  ${h}`);
  }
}

// **IN THE CATALOGUE, BUT RAW AT THIS SITE.** These are demoted rather than
// reported as candidates, because the same words legitimately sit in a
// CONSTANT that is translated at its render site — which is undetectable
// from here and is how half the dashboard is written.
//
// **THEY ARE PRINTED, THOUGH, AND THE FIRST VERSION DID NOT PRINT THEM.**
// Silencing them hid `"Quote"` sitting raw in `RequestCard.jsx` between two
// wrapped siblings — one English word between *Aceptar* and *Rechazar* —
// found by reading the card in a browser rather than by any check here.
// A demoted finding that nobody prints is a finding that was dropped.
if (knownRows.length && showLeft) {
  const n = knownRows.reduce((a, r) => a + r.known.length, 0);
  console.log(`
${n} raw literals that ARE in the catalogue — each is either a key held in a`);
  console.log("constant (fine, translated where it is drawn) or a site somebody forgot to wrap:");
  for (const { rel, known } of knownRows) {
    for (const k of known) console.log(`  ${rel}:${k.line}  ${k.text}`);
  }
}

const total = rows.reduce((n, r) => n + r.found.length, 0);
console.log(`\n${total} candidate strings in ${rows.length} files (heuristic — for ordering the work, not for signing it off)`);
