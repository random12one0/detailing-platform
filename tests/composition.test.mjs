// The design system's rules, with teeth.
//
// Rewritten 2026-08-30 for roadmap 1.5: this file used to enforce "Raking
// Light" and now enforces "The Thread" (docs/design-system.md).
//
// What a test is FOR here: a rule that has already been broken by hand, or
// that a future session can break without noticing. Two of these carry over
// word for word because the rule did — records are lists, and a two-way
// choice is not a dropdown. The rest are new, and the most valuable one is
// the last: the tokens in the reference page and the tokens in the document
// must be the same numbers, because "the model invents a fresh hex value per
// component and the page drifts" is the named failure mode
// (docs/design-knowledge.md §2).
//
// Note on scope: app/src has NOT been restyled yet — that is Phase 2. So the
// look-level rules are checked against the reference page, which is where
// the system currently lives, and the composition rules are checked against
// app/src, where they already applied. As Phase 2 lands, REFERENCE below
// grows to include the app's own stylesheet.
//
//   node tests/composition.test.mjs

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};

// The reference rendering: the page the owner approved. docs/design-system.md
// says plainly that where the document and this file disagree, this file is
// right — so it is what the look-level rules are measured against.
const REFERENCE = "docs/design-directions/5-the-thread.html";
const DOC = "docs/design-system.md";

const ref = await readFile(REFERENCE, "utf8");
const doc = await readFile(DOC, "utf8");
// Prose wraps. Every phrase check below runs against the whitespace-collapsed
// text, or the test starts failing on where a line happened to break.
const docFlat = doc.replace(/\s+/g, " ");

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

console.log(`scanning ${files.length} components + the reference page`);

// ─────────────────────────────────────────────────────────────────────────
console.log("\ntest 1: collections are lists, not stacks of cards");

// A screen that renders a collection as cards. `.map(` over something
// plural, and a `className` containing `card` inside the callback, with no
// modifier that makes it a deliberate object (selected / attend / lit).
const OFFENDER = /\.map\(\s*\(?\s*(\w+)\s*(?:,\s*\w+\s*)?\)?\s*=>\s*\(?\s*<[^>]*className=\{?["`][^"`]*\bcard\b/;

// Cards ARE right for these: things you choose between or act on one at a
// time, rather than read down a list of.
const ALLOWED = new Set([
  "BookingCard.jsx",   // a job is an object you act on
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

{
  const offenders = [];
  for (const file of files) {
    if (ALLOWED.has(path.basename(file))) continue;
    const src = await readFile(file, "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const m = code.match(OFFENDER);
    if (m) offenders.push(`${file} — ${m[0].replace(/\s+/g, " ").slice(0, 90)}`);
  }
  check(
    "no screen maps records onto .card",
    offenders.length === 0,
    offenders.join("\n        ")
      + "\n        Use a ruled list. See docs/design-system.md, \"Composition\".",
  );
}

// ─────────────────────────────────────────────────────────────────────────
console.log("\ntest 2: a choice of two to four uses Segmented, not a dropdown");
{
  const offenders = [];
  for (const file of files) {
    const src = await readFile(file, "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const m of code.matchAll(/<select[\s\S]*?<\/select>/g)) {
      // A <select> whose options come from .map() is a list of unknown
      // length — a searchable timezone list, not a two-way choice.
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

// ─────────────────────────────────────────────────────────────────────────
console.log("\ntest 3: no third-party animation or scroll library (law 13)");
{
  // Not asceticism: it is what closed the GSAP Club licence question, and
  // that matters for something we sell. If one of these ever legitimately
  // has to come in, it is a decision for DECISIONS.md, not a quiet import.
  const BANNED = [
    "gsap", "scrolltrigger", "scrollsmoother", "splittext",
    "lenis", "locomotive-scroll", "three", "framer-motion",
    "motion/react", "aos", "animejs", "scrollmagic", "rellax",
  ];
  const pkg = JSON.parse(await readFile("app/package.json", "utf8"));
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  const inDeps = deps.filter(d => BANNED.some(b => d.toLowerCase() === b || d.toLowerCase().endsWith("/" + b)));

  // In the reference page, look only at what the browser would fetch or
  // import — a library NAMED in a comment is the file explaining why it is
  // absent, which is the opposite of a violation.
  const fetched = [
    ...ref.matchAll(/<script[^>]+src=["']([^"']+)["']/gi),
    ...ref.matchAll(/import\s+[^;]*from\s+["']([^"']+)["']/g),
  ].map(m => m[1]);
  const inRef = fetched.filter(u => BANNED.some(b => u.toLowerCase().includes(b)));

  check(
    "no animation library in app/package.json",
    inDeps.length === 0,
    inDeps.join(", "),
  );
  check(
    "the reference page fetches no third-party script",
    inRef.length === 0,
    inRef.join(", "),
  );
}

// ─────────────────────────────────────────────────────────────────────────
console.log("\ntest 4: two faces, and the never-defaults are absent");
{
  // Only the FIRST family in a stack is a design choice; everything after
  // it is a fallback. "Roboto" at the end of a stack in theme.css is fine
  // and always was — flagging it would train people to ignore this test.
  const firstFamilies = new Set(
    [...ref.matchAll(/font-family\s*:\s*([^;}]+)/gi)]
      .map(m => m[1].split(",")[0].trim().replace(/^["']|["']$/g, "")),
  );
  const allowed = new Set(["Archivo", "JetBrains Mono"]);
  const extra = [...firstFamilies].filter(f => !allowed.has(f));
  check(
    "the reference page declares exactly Archivo + JetBrains Mono",
    extra.length === 0 && firstFamilies.size === 2,
    `saw: ${[...firstFamilies].join(", ")}`,
  );

  // The named tells from docs/design-knowledge.md §1, as a DESIGN choice.
  const NEVER = ["Inter", "Roboto", "Open Sans", "Lato", "Arial", "system-ui", "Space Grotesk"];
  const sheets = ["app/src/theme.css", "app/src/landing/landing.css", "app/src/book/booking.css", REFERENCE];
  const offenders = [];
  for (const f of sheets) {
    const css = await readFile(f, "utf8");
    for (const m of css.matchAll(/font-family\s*:\s*([^;}]+)/gi)) {
      const first = m[1].split(",")[0].trim().replace(/^["']|["']$/g, "");
      // A var() indirection resolves elsewhere; the token it points at is
      // checked when this loop reaches the file that defines it.
      if (first.startsWith("var(")) continue;
      if (NEVER.some(n => n.toLowerCase() === first.toLowerCase())) {
        offenders.push(`${f} — "${first}" as the first family`);
      }
    }
  }
  check(
    "no never-default font is the first family anywhere",
    offenders.length === 0,
    offenders.join("\n        "),
  );
}

// ─────────────────────────────────────────────────────────────────────────
console.log("\ntest 5: two motion presets and one curve (law 4)");
{
  const curves = [...new Set([...ref.matchAll(/cubic-bezier\([^)]*\)/g)].map(m => m[0].replace(/\s/g, "")))];
  check(
    "the reference page uses exactly one easing curve",
    curves.length === 1,
    `saw ${curves.length}: ${curves.join(" ")}\n        `
      + "Ad-hoc durations and curves are how a page becomes a pile of effects.",
  );

  const tok = (n) => ref.match(new RegExp(`--${n}\\s*:\\s*([0-9]+)ms`))?.[1];
  const reveal = Number(tok("t-reveal")), exit = Number(tok("t-exit"));
  check(
    "an exit is faster than an entrance",
    reveal > 0 && exit > 0 && exit < reveal,
    `--t-reveal ${reveal}ms, --t-exit ${exit}ms — design-knowledge.md §1`,
  );
}

// ─────────────────────────────────────────────────────────────────────────
console.log("\ntest 6: the reference page and the document hold the same tokens");
{
  // THE ANTI-DRIFT TEST. Everything else here catches a shape; this catches
  // a colour quietly becoming a slightly different colour in one of the two
  // places it is written down. Values live in docs/design-system.md § Tokens.
  const EXPECT = {
    "ink-0": "#0B0D0E", "ink-1": "#111417", "ink-2": "#171B1E", "ink-3": "#1E2327",
    "line": "#272D31", "line-2": "#333B40",
    "fog": "#939CA1", "fog-2": "#7B858A",
    "bone": "#F2F1EC", "bone-2": "#CFD2CE",
    "ac": "#38E08B", "ac-deep": "#0E5C36",
    "paper": "#EFEEE7", "paper-ink": "#12161A", "paper-fog": "#565F64", "paper-line": "#D2D1C9",
  };
  const drift = [];
  for (const [name, want] of Object.entries(EXPECT)) {
    const inRef = ref.match(new RegExp(`--${name}\\s*:\\s*(#[0-9a-fA-F]{6})`))?.[1];
    if (!inRef) { drift.push(`--${name} is missing from the reference page`); continue; }
    if (inRef.toUpperCase() !== want) drift.push(`--${name}: page says ${inRef}, this test says ${want}`);
    if (!doc.includes(want)) drift.push(`--${name}: ${want} is not in ${DOC}`);
  }
  check("all 16 tokens agree across page, document and test", drift.length === 0, drift.join("\n        "));
}

// ─────────────────────────────────────────────────────────────────────────
console.log("\ntest 7: the rules are actually written down");
{
  // A law nobody can find is a law nobody follows. These are the ones a
  // future session is most likely to break without meaning to.
  check("every section gets its own skeleton", /different skeleton/.test(docFlat));
  check("something is always animating", /always animating/i.test(docFlat));
  check("motion is not spendable", /not spendable/i.test(docFlat));
  check("segmented-over-dropdown is stated", /never a native `<select>`/i.test(docFlat));
  check("the reveal's arrival line is not its departure line", /arrival line is not the departure line/i.test(docFlat));
  check("a pin has to declare and earn its cost", /declares its cost/i.test(docFlat));
  check("distribute linearly, ease each beat", /ease each beat individually/i.test(docFlat));
  check("transformed elements are not measured with rects", /offsetLeft/.test(docFlat));
  check("1920 is named as a required width", /1920/.test(docFlat));
  check("no third-party JavaScript", /No third-party JavaScript/i.test(docFlat));
  check("the composition rule cites its test", /composition\.test\.mjs/.test(docFlat));
  check("the contrast rule cites its test", /design-contrast\.test\.mjs/.test(docFlat));
  check("the old system is named as replaced", /Raking Light/.test(docFlat));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
