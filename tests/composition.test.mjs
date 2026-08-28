// The composition rule, with teeth.
//
// docs/design-system.md says an enumeration is a ruled list and a card is
// for an object you pick between or act on. That was written down, and the
// Clients screen still shipped as eight bordered cards filling a phone —
// because nothing checked. Contrast and pricing have tests; this is the
// third rule that kept getting broken by hand.
//
// What it looks for is narrow on purpose: mapping a list of RECORDS
// straight onto a `.card`. That is the shape the rule exists to prevent,
// and it is the shape that keeps coming back.
//
//   node tests/composition.test.mjs

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};

const roots = ["app/src/screens", "app/src/components", "app/src/book"];
const files = [];
for (const root of roots) {
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith(".jsx")) files.push(full);
    }
  };
  await walk(root);
}

console.log(`scanning ${files.length} components`);

// A screen that renders a collection as cards. `.map(` over something
// plural, and a `className` containing `card` inside the callback, with no
// modifier that makes it a deliberate object (selected / attend / lit).
const OFFENDER = /\.map\(\s*\(?\s*(\w+)\s*(?:,\s*\w+\s*)?\)?\s*=>\s*\(?\s*<[^>]*className=\{?["`][^"`]*\bcard\b/;

// Cards ARE right for these: things you choose between or act on one at a
// time, rather than read down a list of.
const ALLOWED = new Set([
  "BookingCard.jsx",   // a job is an object you act on — the lit card itself
  "DaySheet.jsx",      // one day's blocks and overrides, each acted on
  "Catalog.jsx",       // services you pick between to edit
  "Promos.jsx",        // same
  "Team.jsx",          // same
  "Gallery.jsx",       // images are objects, not rows of text
  "StepServices.jsx",  // the customer is choosing BETWEEN these
  "StepVehicle.jsx",   // same
  // Each unpaid job carries its own "Mark paid" button — objects you act
  // on one at a time, which is what a card is for.
  "Money.jsx",
  // The text-template picker: you are choosing BETWEEN these.
  "BookingDetail.jsx",
]);

console.log("\ntest 1: collections are lists, not stacks of cards");
{
  const offenders = [];
  for (const file of files) {
    if (ALLOWED.has(path.basename(file))) continue;
    const src = await readFile(file, "utf8");
    // Strip comments so an example in a comment cannot trip it.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const m = code.match(OFFENDER);
    if (m) offenders.push(`${file} — ${m[0].replace(/\s+/g, " ").slice(0, 90)}`);
  }
  check(
    "no screen maps records onto .card",
    offenders.length === 0,
    offenders.join("\n        ")
      + "\n        Use a ruled list (.rows / .row-item). See docs/design-system.md,"
      + "\n        \"Composition — not everything is a card\".",
  );
}

console.log("\ntest 2: a choice of two to four uses Segmented, not a dropdown");
{
  const offenders = [];
  for (const file of files) {
    const src = await readFile(file, "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const m of code.matchAll(/<select[\s\S]*?<\/select>/g)) {
      // A <select> whose options come from .map() is a list of unknown
      // length — a searchable timezone list, not a two-way choice. Only
      // hand-written option lists can be judged by their length.
      if (/\.map\(/.test(m[0])) continue;
      const options = [...m[0].matchAll(/<option/g)].length;
      if (options >= 2 && options <= 4) {
        offenders.push(`${file} — a <select> with ${options} options`);
      }
    }
  }
  check(
    "no hand-written <select> with 2–4 options",
    offenders.length === 0,
    offenders.join("\n        ")
      + "\n        Use <Segmented> from components/controls.jsx.",
  );
}

console.log("\ntest 3: the rules are actually written down");
{
  const doc = await readFile("docs/design-system.md", "utf8");
  check("the light has a tie-break rule", /marks the NEXT action/.test(doc));
  check("segmented-over-dropdown is stated", /Never a native `<select>`/.test(doc));
  check("the composition rule cites its test", /composition\.test\.mjs/.test(doc));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
