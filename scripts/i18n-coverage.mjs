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
  return { calls, distinct: seen.size, missing };
}

if (process.argv[1] && process.argv[1].endsWith("i18n-coverage.mjs")) {
  const { calls, distinct, missing } = await coverage();
  // **FLOOR, NOT ROUND.** With one string missing out of 1,045 this printed
  // `100%` beside `missing an appEs entry: 1`, which is the one number on the
  // screen a reader would act on. Measured 2026-09-12 while baselining the
  // ratchet at zero. A 99% that is honest is worth more than a 100% that is
  // not, and a report that rounds up cannot say "finished" and mean it.
  const pct = Math.floor(((distinct - missing.size) / distinct) * 100);
  console.log(`t() call sites with a literal: ${calls}`);
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
