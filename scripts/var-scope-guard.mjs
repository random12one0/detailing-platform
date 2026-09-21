// A CUSTOM PROPERTY READ AT THE DOCUMENT ROOT AND DECLARED BELOW IT.
//
// `booking.css` shipped this for weeks and nothing noticed:
//
//   .bk   { --bk-bar-clear: 26px; }
//   html:has(.bk > .bk-bar) { scroll-padding-bottom: calc(var(--bk-bar-clear, 104px) + 12px); }
//
// Custom properties inherit DOWN. `html` is the ANCESTOR of `.bk`, so that
// `var()` never once resolved — it took its fallback every time and shipped a
// flat 116px, while the comment beside it said the number was "kept in step
// with it by the same variable rather than by a second number that can drift".
//
// **THE REASON THIS IS WORTH A CHECK RATHER THAN A NOTE.** The accident was
// LOAD-BEARING. Had the var resolved, the reserve would have been 26+12=38px
// against a 73px bar, which is ROADMAP 8.5a's defect exactly. So the failure
// mode is not "somebody writes this bug" — it is "somebody TIDIES IT UP",
// deletes the fallback or moves the declaration, and silently re-breaks a
// keyboard fix. Nothing else in this repo can see that: it is valid CSS, it
// renders identically, and every browser check passes.
//
//   node scripts/var-scope-guard.mjs              # every css under app/src
//   node scripts/var-scope-guard.mjs some.css     # one file, for breaking it
//
// Credential-free. No browser, no dev server, no tenant — it reads files.
//
// ponytail: only the ROOT case (a `html`/`:root` reader of a property declared
// nowhere at that level). The general question — is selector A ever an
// ancestor of selector B — needs a DOM and a tenant, and would cost a browser
// run to answer a question this shape answers for free. If a non-root case
// ever bites, that is when to pay for it.
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = new URL("../app/src/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = process.argv[2];

const cssFiles = async (dir) => {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await cssFiles(p));
    else if (e.name.endsWith(".css")) out.push(p);
  }
  return out;
};

// A reader at the document root: `html`, `:root`, or anything anchored on them.
const isRootSelector = (sel) =>
  sel.split(",").some((s) => /^\s*(html|:root)\b/.test(s));

const files = arg ? [arg] : await cssFiles(ROOT);
let declSites = 0, useSites = 0, rulesRead = 0;
const findings = [];

for (const file of files) {
  const raw = await readFile(file, "utf8");
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, " ");   // comments are prose, not code
  // Declarations first, across the WHOLE file: a property may legitimately be
  // declared at the root somewhere else than where it is read.
  const rootDeclared = new Set();
  const anyDeclared = new Map();                       // prop -> [selectors]
  const rules = [...src.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  rulesRead += rules.length;
  for (const [, sel, body] of rules) {
    for (const [, prop] of body.matchAll(/(--[\w-]+)\s*:/g)) {
      declSites++;
      if (!anyDeclared.has(prop)) anyDeclared.set(prop, []);
      anyDeclared.get(prop).push(sel.trim().replace(/\s+/g, " "));
      if (isRootSelector(sel)) rootDeclared.add(prop);
    }
  }
  for (const [, sel, body] of rules) {
    if (!isRootSelector(sel)) continue;
    for (const [, prop] of body.matchAll(/var\(\s*(--[\w-]+)/g)) {
      useSites++;
      if (rootDeclared.has(prop)) continue;
      findings.push({
        file: relative(ROOT, file) || file,
        prop,
        sel: sel.trim().replace(/\s+/g, " ").slice(0, 60),
        declaredOn: anyDeclared.get(prop) ?? [],
      });
    }
  }
}

// COUNT THE SUBJECTS EVERY RUN. A file list that silently went empty prints the
// same word as a clean sweep otherwise, which is this repo's most repeated way
// of shipping a check that tests nothing.
console.log(`var-scope-guard — ${files.length} stylesheet(s), ${rulesRead} rules, `
  + `${declSites} custom-property declarations, ${useSites} var() reads at the document root`);
if (!useSites) console.log("NOT MEASURED — no rule on `html` or `:root` read a custom property at all. "
  + "That is either a repo with none, or a parse that found nothing; check the rule count above.");

if (!findings.length) {
  console.log("every root-level var() reads a property declared at the root");
  process.exit(0);
}
console.log(`\n${findings.length} root-level var() read(s) of a property declared only further down:`);
for (const f of findings) {
  console.log(`  ${f.file}  ${f.sel}`);
  console.log(`    reads ${f.prop}, declared on: ${f.declaredOn.join(" | ") || "NOWHERE in this file"}`);
  console.log(`    custom properties inherit DOWN, so this var() can never resolve here.`);
  console.log(`    It takes its fallback, or is invalid. If the fallback is the value that`);
  console.log(`    ships, the declaration is decoration and the two numbers have already drifted.`);
}
process.exit(1);
