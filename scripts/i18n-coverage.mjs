// WHICH DASHBOARD STRINGS THE LANGUAGE TOGGLE ACTUALLY DELIVERS — 2026-09-12.
//
// **THE SUITE PASSED 58/0 WHILE 141 STRINGS RENDERED IN ENGLISH ON A SPANISH
// SCREEN.** `tests/spanish.test.mjs` checks the shape of the catalogue — that
// translations exist for the keys it knows about, that placeholders survive,
// that nobody wrote `usted`. It never asked the question a detailer asks,
// which is *does the toggle work on the screen I am looking at*.
//
// So this asks it: every `t("literal")` reachable from the detailer's
// dashboard, against `appEs.js`. One number, and it may only go down —
// `spanish.test.mjs` imports `coverage()` and fails when the count of missing
// strings rises above the ratchet.
//
//   node scripts/i18n-coverage.mjs            # the count and the worst files
//   node scripts/i18n-coverage.mjs --list     # every missing string
//
// **WHY A SCRIPT AND NOT A GREP.** Most string literals in this codebase are
// class names, column names, statuses and storage keys. `t(` is the only
// marker that a string is meant for a person, so that is what is counted.
//
// **THE LIMIT, SAID OUT LOUD:** it sees `t("...")` with a literal first
// argument and nothing else. `t(label)` where `label` is a variable is
// invisible to it — the same blind spot `scripts/i18n-survey.mjs` documents,
// and the reason `es.js` carries four keys with a comment saying the extractor
// cannot see them. A count that claims to be complete would be the fourth
// instrument in this repo to measure the wrong thing.

import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// The detailer's own surfaces. `book/` is the CUSTOMER page and is `es.js`'s
// job; `landing/` has no language picker at all.
const DIRS = ["app/src/screens", "app/src/components", "app/src/admin"];

// **THE DATA TABLES, ADDED 2026-09-12 BECAUSE THE LIMIT ABOVE COST A REAL
// SCREEN.** This ratchet printed `missing an appEs entry: 0` and `coverage:
// 100%` while the website brief rendered *"Let's build your website."* in
// English between two Spanish sentences on a Spanish dashboard. Twenty-five
// prose values in `lib/siteIntake.js` had no translation and not one of them
// was visible, because `SiteIntake.jsx` renders `t(q.question)` and
// `t(step.title)` — `t()` with a VARIABLE every time.
//
// **A CHECK THAT REPORTS 100% OVER TWENTY-FIVE GAPS IS WORSE THAN NO CHECK**,
// which is this repo's oldest failure and the reason the limit was written
// down rather than fixed. Writing it down was not enough.
//
// These modules hold user-facing prose as plain object and array values —
// `FOUND.md` named the list before this existed. They are IMPORTED and walked
// rather than parsed, so the array shape in `lib/setup.js` is covered as well
// as the keyed shape in `lib/siteIntake.js`.
const DATA_FILES = [
  "app/src/lib/siteIntake.js", "app/src/lib/setup.js", "app/src/lib/templates.js",
  "app/src/lib/emailMessages.js", "app/src/lib/push.js", "app/src/lib/photo-rules.js",
  "app/src/lib/adminInsight.js", "app/src/lib/password.js",
];

// A string is PROSE unless it looks like an identifier. Rejecting is the safe
// direction: a false positive puts a storage key in the missing list and sends
// somebody to translate `catalog`, which is how a check gets switched off.
// Rejected: lowercase identifiers (`catalog`, `hello`, `drop_off`), hex
// colours, anything with no letter in it, and single characters.
const isProse = (v) => typeof v === "string" && v.length > 1
  && /[A-Za-z]{2}/.test(v)
  && !/^[a-z][a-z0-9_.:-]*$/.test(v)
  && !/^#[0-9a-f]{3,8}$/i.test(v)
  && !/^[A-Z][A-Z0-9_]*$/.test(v);          // SCREAMING_CASE is a constant

function proseIn(node, out, depth = 0) {
  if (depth > 6 || node == null) return out;
  if (typeof node === "string") { if (isProse(node)) out.add(node); return out; }
  if (Array.isArray(node)) { for (const v of node) proseIn(v, out, depth + 1); return out; }
  if (typeof node === "object") { for (const v of Object.values(node)) proseIn(v, out, depth + 1); }
  return out;
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.jsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

export async function coverage() {
  const files = (await Promise.all(DIRS.map(walk))).flat();
  const { appEs } = await import(pathToFileURL(resolve("app/src/lib/strings/appEs.js")).href);
  const keys = new Set(Object.keys(appEs));

  const missing = new Map();
  const seen = new Set();
  let calls = 0;
  for (const f of files) {
    const src = await readFile(f, "utf8");
    for (const m of src.matchAll(/\bt\(\s*(["'])((?:(?!\1)[^\\]|\\.)*)\1/g)) {
      const raw = m[2].replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\n/g, "\n");
      calls++;
      seen.add(raw);
      if (!keys.has(raw)) {
        if (!missing.has(raw)) missing.set(raw, new Set());
        missing.get(raw).add(f.replace(/\\/g, "/"));
      }
    }
  }
  // SECOND PASS — the data tables. Counted into the same map so one number
  // answers the question, and attributed to their own file so `--list` says
  // where to go. A module that will not import is REPORTED rather than
  // skipped: a skipped check reads exactly like a passing one.
  let dataValues = 0;
  for (const f of DATA_FILES) {
    let mod;
    try { mod = await import(pathToFileURL(resolve(f)).href); }
    catch (e) {
      const note = `[could not import ${f}: ${e.message}]`;
      missing.set(note, new Set([f]));
      continue;
    }
    for (const v of proseIn(mod, new Set())) {
      dataValues++;
      seen.add(v);
      if (!keys.has(v)) {
        if (!missing.has(v)) missing.set(v, new Set());
        missing.get(v).add(f);
      }
    }
  }

  return { calls, distinct: seen.size, missing, dataValues };
}

if (process.argv[1] && process.argv[1].endsWith("i18n-coverage.mjs")) {
  const { calls, distinct, missing, dataValues } = await coverage();
  // **FLOOR, NOT ROUND.** With one string missing out of 1,045 this printed
  // `100%` beside `missing an appEs entry: 1`, which is the one number on the
  // screen a reader would act on. Measured 2026-09-12 while baselining the
  // ratchet at zero. A 99% that is honest is worth more than a 100% that is
  // not, and a report that rounds up cannot say "finished" and mean it.
  const pct = Math.floor(((distinct - missing.size) / distinct) * 100);
  console.log(`t() call sites with a literal: ${calls}`);
  console.log(`prose in the data tables:      ${dataValues}`);
  console.log(`distinct strings:              ${distinct}`);
  console.log(`missing an appEs entry:        ${missing.size}`);
  console.log(`coverage:                      ${pct}%`);

  const byFile = new Map();
  for (const [, fs] of missing) for (const f of fs) byFile.set(f, (byFile.get(f) ?? 0) + 1);
  console.log("\nworst files:");
  for (const [f, n] of [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`  ${String(n).padStart(3)}  ${f}`);
  }
  if (process.argv.includes("--list")) {
    console.log("\nevery missing string:");
    for (const k of missing.keys()) console.log("  " + JSON.stringify(k));
  }
}
