#!/usr/bin/env node
/**
 * EM DASHES IN THE EMAIL LAYER — the check Wave F never had.
 *
 * `ROADMAP.md` § Next recorded Wave F as "zero single em dashes left in any
 * user-facing string" on 2026-09-12. That was true of `app/src` and false of
 * every email this product sends: the sweep walked one tree and the email layer
 * is a different one. Nineteen survived, INCLUDING the exact string
 * `CLAUDE.md` uses as its own worked example of the rule ("Travel — {zone}").
 *
 * So the rule now has an instrument instead of a prose paragraph.
 *
 * WHAT CLAUDE.md § THE EM DASH HAS THREE SHAPES ACTUALLY SAYS, because this
 * check cannot be understood without it:
 *
 *   - A SENTENCE JOINT dies. The dash stands in for a full stop or a comma, so
 *     use one.
 *   - A LABEL SEPARATOR becomes the middle dot "·". The product already owns
 *     that shape — "Tue-Sat · 8:00 AM - 6:00 PM", "1 link · 45 opens".
 *   - A PARENTHETICAL PAIR stays. Two dashes around an aside is correct English.
 *
 * A COUNT CANNOT TELL THOSE APART, which is why this check does not try. It
 * bans the character outright in user-facing text and makes the parenthetical
 * pair an explicit, listed exception — so a new one is a deliberate line in
 * ALLOW with a reason beside it, never a silent survivor.
 *
 * WHAT IT SCANS AND WHAT IT DELIBERATELY DOES NOT:
 *   - scanned: every .ts/.js under supabase/functions, both spellings of the
 *     character ("—" and the HTML entity "&mdash;", which is the same defect in
 *     another costume and is how two of them hid).
 *   - not scanned: comments (this repo writes long prose comments and they are
 *     not user-facing) and console.log/warn/error arguments (logs are ours).
 *   - not scanned: `app/src`. That is lane B's tree and Wave F already swept it.
 *
 * IT COUNTS ITS SUBJECTS AND PRINTS THEM. A scanner that walks zero files
 * passes silently, which is this repo's oldest failure — see
 * `docs/START-HERE.md` § 4. Baselined 2026-09-13 by re-inserting a dash into
 * three strings and confirming three failures.
 */
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = "supabase/functions";

/**
 * PARENTHETICAL PAIRS AND OTHER SANCTIONED DASHES.
 *
 * Key is `<path>:<exact trimmed source line>` so that editing the line at all
 * retires its exemption — an exemption that survives a rewrite is how a rule
 * rots. Nothing is here yet: all twenty-two found on 2026-09-13 were joints or
 * label separators. A future pair goes here with its reason.
 */
const ALLOW = new Set([
  // Not copy at all: the HTML-to-plaintext decoder's entity table, which has to
  // name the character in order to turn "&mdash;" back into it for the text
  // half of a multipart email. Nothing this product sends emits that entity any
  // more, but a decoder listing one fewer entity than the encoder is how a
  // plaintext body grows literal "&mdash;" in it, so the row stays.
  'supabase/functions/_shared/emailKit.ts:.replace(/&nbsp;/g, " ").replace(/&mdash;/g, "—").replace(/&ndash;/g, "–")',
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry).split("\\").join("/");
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|js)$/.test(p)) out.push(p);
  }
  return out;
}

/**
 * Remove block comments, line comments and console.* calls from one line.
 *
 * A `console.error(...)` whose arguments run over four lines is FOUR lines of
 * log text, and skipping only the line the word `console` appears on leaves the
 * other three looking like copy. Six of the first hundred findings were exactly
 * that, so the depth of the open console call is carried in `state`.
 */
function code(line, state) {
  let l = line;
  if (state.block) {
    const end = l.indexOf("*/");
    if (end < 0) return "";
    l = l.slice(end + 2);
    state.block = false;
  }
  for (;;) {
    const begin = l.indexOf("/*");
    if (begin < 0) break;
    const end = l.indexOf("*/", begin + 2);
    if (end < 0) {
      l = l.slice(0, begin);
      state.block = true;
      break;
    }
    l = l.slice(0, begin) + l.slice(end + 2);
  }
  const slashes = l.indexOf("//");
  if (slashes >= 0 && !/https?:$/.test(l.slice(0, slashes))) l = l.slice(0, slashes);

  if (state.log > 0) {
    state.log += depth(l);
    return "";
  }
  const call = l.search(/console\.(log|warn|error|info|debug)\s*\(/);
  if (call >= 0) {
    state.log = depth(l.slice(call));
    return l.slice(0, call);
  }
  return l;
}

/** Net parenthesis depth of a fragment, ignoring parens inside quotes. */
function depth(s) {
  let d = 0, quote = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = "";
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "(") d++;
    else if (c === ")") d--;
  }
  return d;
}

const files = walk(ROOT);
const findings = [];
let allowed = 0;

for (const file of files) {
  const state = { block: false, log: 0 };
  readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    const l = code(line, state);
    if (!/\u2014|&mdash;/.test(l)) return;
    const key = `${file}:${line.trim()}`;
    if (ALLOW.has(key)) { allowed++; return; }
    findings.push(`${file}:${i + 1}  ${line.trim()}`);
  });
}

// The instrument states what it looked at, every run.
console.log(`em-dash: scanned ${files.length} files under ${ROOT}/`);
console.log(`em-dash: ${allowed} sanctioned parenthetical pair(s) in ALLOW`);

if (files.length < 50) {
  console.error(`FAIL: only ${files.length} files walked — the scanner is not reaching the tree`);
  process.exit(1);
}

if (findings.length) {
  console.error(`\nFAIL: ${findings.length} em dash(es) in user-facing text:\n`);
  for (const f of findings) console.error("  " + f);
  console.error(`
A sentence joint takes a full stop or a comma. A label separator takes the
middle dot "·". A parenthetical PAIR is correct and goes in ALLOW in this file
with its reason. See CLAUDE.md § THE EM DASH HAS THREE SHAPES.

And an English rename moves its key in supabase/functions/_shared/strings/es.ts
in the SAME edit, or the email silently renders English on a Spanish screen with
no error anywhere.
`);
  process.exit(1);
}

console.log("em-dash: 0 findings — PASS");
