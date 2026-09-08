// ENGLISH THAT LIVES BETWEEN JSX EXPRESSIONS — the blind spot both other i18n
// instruments have.
//
//   node scripts/i18n-fragments.mjs          exits 1 if it finds any
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS
// ---------------------------------------------------------------------------
// Found 2026-09-08 by LOOKING at a Spanish dashboard rather than by any check
// in this repo: **Today printed "1 done · 4 to go" in English.** The source was
//
//     <div className="quiet">{done} done · {todays.length - done} to go</div>
//
// **AND BOTH EXISTING INSTRUMENTS REPORTED CLEAN ON IT.** `i18n-survey.mjs`
// hunts string LITERALS and this is JSX text, so there was nothing for it to
// see. `spanish-dom.mjs` compares what is on screen against catalogue KEYS, and
// "1 done · 4 to go" could never be a key — the key, had anyone written one,
// would be "{done} done · {left} to go".
//
// So the gap is a SHAPE and not a file: **English broken into short fragments
// by `{...}` holes.** It is invisible in English by construction, invisible to
// the owner (who does not read Spanish), and first met by a detailer.
//
// It found THIRTEEN on its first run across 95 files.
//
// ---------------------------------------------------------------------------
// WHAT IT DELIBERATELY DOES NOT DO
// ---------------------------------------------------------------------------
// **It does not flag single words.** One-word fragments are overwhelmingly
// units, punctuation and separators, and a check that cries wolf on every run
// is a check nobody reads — this repo deleted a whole intersection detector for
// exactly that reason. Two or more lowercase words is the floor.
//
// **It skips `book/`, `admin/` and `landing/`.** The booking surface has its own
// catalogue, the back office is ours and is not translated, and the landing page
// is marketing in one language.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "app", "src");
const SKIP = /[\\/](book|admin|landing)[\\/]|[\\/]strings[\\/]/;

const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = path.join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.jsx?$/.test(p) && !SKIP.test(p)) files.push(p);
  }
})(ROOT);

// A run of two or more lowercase words sitting immediately after a `}` or
// immediately before a `{` — i.e. prose with an expression hole beside it.
const AFTER = /\}\s*([A-Za-z][a-z]+(?:\s+[a-z]+){1,6})\s*[<{]/g;
const BEFORE = /[>}]\s*([A-Za-z][a-z]+(?:\s+[a-z]+){1,6})\s*\{/g;
const NOISE = /^(px|em|rem|of|and|or|to|in|on|at|by|the|a|an|is|are|was|were)$/i;

let found = 0;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const lines = src.split(/\r?\n/);
  const hits = new Map();
  for (const re of [AFTER, BEFORE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      const phrase = m[1].trim();
      if (phrase.split(/\s+/).every((w) => NOISE.test(w))) continue;
      // A `t("` just before this is the tail of an interpolation the author was
      // already translating — not a fragment anybody forgot.
      if (/\bt\(\s*["'`]/.test(src.slice(Math.max(0, m.index - 80), m.index))) continue;
      const line = src.slice(0, m.index).split(/\r?\n/).length;
      hits.set(phrase + "@" + line, { phrase, line, text: (lines[line - 1] || "").trim().slice(0, 110) });
    }
  }
  for (const h of hits.values()) {
    found++;
    console.log(`${path.relative(process.cwd(), f)}:${h.line}  "${h.phrase}"`);
    console.log(`    ${h.text}`);
  }
}

console.log(found
  ? `\n${found} English fragment${found === 1 ? "" : "s"} between JSX expressions, across ${files.length} files.`
  : `\nclean — no English between JSX expressions, across ${files.length} files.`);
process.exit(found ? 1 : 0);
