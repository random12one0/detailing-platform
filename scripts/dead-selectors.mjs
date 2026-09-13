// A CHECK THAT NAMES A CLASS THE PRODUCT NO LONGER HAS — 2026-09-13, lane C.
//
// **`scripts/admin-contrast.mjs` sampled five selectors, all five had been
// renamed out of `app/src`, and it printed `clear of the floor` for however
// long that had been true.** `docs/blind-browser-2026-09-13.md` § 3 is the
// account. That is trap (k) — a check that greps or queries a SPELLING asserts
// how something is written, not what it does — and the way it fails is silent:
// `querySelector` returns null, the loop body never runs, and a finder reports
// nothing found.
//
// So this is the mechanical version of the question: **which class names do
// this repo's browser scripts look for that no longer exist anywhere in
// `app/src`?**
//
//   node scripts/dead-selectors.mjs
//
// Credential-free, no browser, no dev server. Exits 1 if any script names a
// class the product does not have.
//
// **WHAT IT DELIBERATELY DOES NOT DO.** It does not check whether a class is
// on the screen the script visits — `.pa-lab` exists in `app/src` and is on
// none of the back office's five tabs, which is a real gap this cannot see.
// Only a browser can answer that, and `admin-contrast` answers it for itself
// by counting subjects. This catches the cheaper half: a name that is simply
// gone.
//
// **AND IT IS BASELINED THE WAY EVERYTHING HERE SHOULD BE**: `--prove` invents
// a class nobody has and asserts that this script reports it, so a run that
// finds nothing has demonstrated it can still find something.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PROVE = process.argv.includes("--prove");

// Only the scripts that drive a browser: everything else reads files, where a
// stale name shows up as a read error rather than as silence.
const BROWSER = readdirSync(path.join(ROOT, "scripts"))
  .filter((f) => f.endsWith(".mjs"))
  .filter((f) => /playwright/.test(readFileSync(path.join(ROOT, "scripts", f), "utf8")));

// Every class token inside a selector string. Deliberately narrow: a bare
// `.foo` in prose is not matched, because it has to sit inside quotes next to
// something that looks like a selector.
const SELECTOR_STRING = /(["'`])((?:[^"'`\\\n]|\\.)*?[.#[][^"'`\n]*?)\1/g;
const CLASS_TOKEN = /\.([a-z][a-z0-9]*(?:-[a-z0-9]+)+)/g;

// The product's own vocabulary: every class this app can render, from JSX
// `className` and from the stylesheets. Read as TEXT rather than parsed,
// because a template literal builds class names at runtime and a parser would
// have to run the app to see them.
const appText = (() => {
  let out = "";
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules") continue;
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (/\.(jsx?|css|html)$/.test(e.name)) out += readFileSync(f, "utf8");
    }
  };
  walk(path.join(ROOT, "app", "src"));
  walk(path.join(ROOT, "app", "public"));
  out += readFileSync(path.join(ROOT, "app", "index.html"), "utf8");
  return out;
})();

// **A SUBJECT COUNT, BECAUSE A RUN OVER NOTHING IS THIS FILE'S OWN SUBJECT.**
if (appText.length < 100000) {
  console.error(`app/src read as ${appText.length} characters — that is not the product. Broken run, not a pass.`);
  process.exit(1);
}

const dead = [];
let scanned = 0, tokens = 0;
for (const f of BROWSER) {
  // **COMMENTS ARE STRIPPED FIRST, AND THE FIRST RUN PROVED WHY.** This file's
  // own account of the `admin-contrast` failure NAMES the five dead classes in
  // its header, so the first pass reported six phantoms in a script that no
  // longer queries any of them. A tool that reads the note about a bug as the
  // bug is worse than no tool.
  const src = readFileSync(path.join(ROOT, "scripts", f), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");
  scanned++;
  const seen = new Set();
  for (const m of src.matchAll(SELECTOR_STRING)) {
    for (const c of m[2].matchAll(CLASS_TOKEN)) seen.add(c[1]);
  }
  if (PROVE && f === BROWSER[0]) seen.add("pa-ground-that-never-was");
  for (const cls of seen) {
    tokens++;
    // Word-boundary either side: `pa-lab` must not be satisfied by `pa-lab2`.
    if (!new RegExp(`(?<![\\w-])${cls}(?![\\w-])`).test(appText)) dead.push([f, cls]);
  }
}

console.log(`${scanned} browser script(s) · ${tokens} class token(s) · ${appText.length} characters of app/src+public\n`);
if (!tokens) {
  console.log("NO SELECTORS FOUND AT ALL — that is a broken run, not a pass.");
  process.exit(1);
}
if (!dead.length) {
  console.log("every class these scripts look for still exists in the product.");
  process.exit(0);
}
for (const [f, cls] of dead) console.log(`  ${f.padEnd(28)} .${cls}`);
console.log(`\n${dead.length} selector(s) name a class the product no longer has. A querySelector that`);
console.log("matches nothing is silent, so each of these is a check that may be looking at air.");
process.exit(1);
