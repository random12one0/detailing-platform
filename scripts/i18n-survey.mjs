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
const OUT_OF_SCOPE = ["book", "admin", "landing", "lib/strings"];

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

const looksLikeCode = (s) => (
  s.length < 2
  || !/[A-Za-z]{2}/.test(s)
  || /^(https?:|mailto:|tel:|\/|\.\/|#|data:|blob:)/.test(s)
  || /^#[0-9a-fA-F]{3,8}$/.test(s)
  || /^[\d\s.,:%/$-]+$/.test(s)
  || /^[a-z0-9]+([-_.][a-z0-9]+)+$/.test(s)        // kebab / snake / dotted key
  || /^[a-z]+([A-Z][a-z0-9]*)+$/.test(s)           // camelCase
  || /^[A-Z0-9_]+$/.test(s)                        // CONSTANT_CASE
  || /^\d+(px|rem|em|vh|vw|fr|s|ms|%)$/.test(s)
  || NOT_WORDS.has(s.toLowerCase())
);

/** Words somebody reads: a phrase with a space, or one Capitalised word.
 *  A bare lowercase word is a column name more often than a sentence. */
const isPhrase = (s) => {
  const v = s.trim();
  if (!v || looksLikeCode(v) || CLASS_LISTS.has(v) || BRAND_NAMES.has(v)) return false;
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
        .map((m) => m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\")),
    );
  } catch { return new Set(); }
})();

function candidates(raw) {
  const src = stripComments(raw);
  const out = [];
  const seen = new Set();
  const add = (at, kind, text) => {
    if (!isPhrase(text)) return;
    if (CATALOGUE.has(text.trim())) return;
    if (insideT(src, at)) return;
    const line = lineOf(src, at);
    const k = `${line}:${text.trim()}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ line, kind, text: text.trim() });
  };

  // 1 · JSX TEXT NODES — between a tag close and the next tag open. Tightened
  // against the arrow-function bug: no `=`, `(`, `)`, `;`, `?` or `:` may
  // appear, which is what separates words from a ternary's fragments.
  for (const m of src.matchAll(/>([^<>{}()=;?]+)</g)) {
    const text = m[1].replace(/\s+/g, " ");
    if (!/[A-Za-z]{2}/.test(text)) continue;
    add(m.index + 1, "jsx", text);
  }

  // 2 · EVERY OTHER STRING LITERAL, minus what the header rules out. This is
  // the half the first version did not have, and it is where `"Next up"` and
  // `"Waiting on you"` live.
  for (const m of src.matchAll(/(["'])((?:[^"'\\\n]|\\.)*)\1/g)) {
    const text = m[2];
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

const args = process.argv.slice(2);
const showLeft = args.includes("--left");
const only = args.includes("--file") ? args[args.indexOf("--file") + 1] : null;

const rows = [];
for (const file of walk(SRC)) {
  const rel = path.relative(SRC, file).split(path.sep).join("/");
  if (only && !rel.includes(only)) continue;
  const found = candidates(readFileSync(file, "utf8"));
  if (found.length) rows.push({ rel, found });
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

const total = rows.reduce((n, r) => n + r.found.length, 0);
console.log(`\n${total} candidate strings in ${rows.length} files (heuristic — for ordering the work, not for signing it off)`);
