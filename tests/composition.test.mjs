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
// Note on scope, CORRECTED as Phase 2 finished landing: app/src IS restyled
// now — the booking page in 2.1, the landing page in 2.2, the dashboard in
// 2.3 — so all three of its stylesheets are checked here alongside the
// reference page. The reference page is still the tie-breaker for the
// look-level rules, because it is the rendering the owner approved.
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

// A screen that renders a collection as cards. There are two ways to be one:
//
//   (a) the `.map(…)` callback writes a `className` with `card` in it, or
//   (b) it renders a COMPONENT whose own file draws a `.card` at its root.
//
// (b) IS THE ONE THAT MATTERS, AND THIS TEST WAS BLIND TO IT UNTIL 2026-09-01.
// The old version matched (a) only and kept a flat ALLOWED set of filenames.
// `BookingCard.jsx` was on it — correctly, as the file that DEFINES the card —
// and that allowance then covered every caller of it, so `Calendar.jsx` mapping
// eighteen bookings onto <BookingCard> passed cleanly while drawing exactly the
// failure this rule exists to catch: 18 cards, 3,942px tall at every width.
// A component-level allowance is what made the rule optional for everybody.
//
// So allowances are keyed to `file > component`, not to component. Whether a
// card is right is a property of the CALLER — a small set of objects you act on
// one at a time — never of the card. Component inventory §1a.
const OFFENDER = /\.map\(\s*\(?\s*(\w+)\s*(?:,\s*\w+\s*)?\)?\s*=>\s*\(?\s*<[^>]*className=\{?["`][^"`]*\bcard\b/;

const ALLOWED = new Map([
  // file > component — the caller is what is being allowed.
  ["Today.jsx > BookingCard", "the ONE lit job; at most one card is on the screen"],
  ["Clients.jsx > BookingCard", "NOT SETTLED — stage 5 rebuilds Clients and this line goes with it"],
  // whole files, where the file's own maps are all deliberate objects
  ["BookingCard.jsx", "the file that defines the card"],
  ["DaySheet.jsx", "the day's three state cards, each acted on (its JOBS are rows)"],
  ["Catalog.jsx", "services you pick between to edit"],
  ["Promos.jsx", "same"],
  ["Team.jsx", "same"],
  ["Gallery.jsx", "images are objects, not rows of text"],
  ["StepServices.jsx", "the customer is choosing BETWEEN these"],
  ["StepVehicle.jsx", "same"],
  ["Money.jsx", "each unpaid job carries its own Mark paid button"],
  ["BookingDetail.jsx", "the text-template picker: you are choosing BETWEEN these"],
]);

{
  // Which components draw a card at their root, read from the file rather than
  // listed — a component that stops being a card stops being flagged.
  const cardComponents = new Map();
  for (const file of files) {
    const src = await readFile(file, "utf8");
    const m = src.match(/export default function (\w+)[\s\S]{0,4000}?return \(\s*<div className=\{?[`"][^`"]*\bcard\b/);
    if (m) cardComponents.set(m[1], path.basename(file));
  }

  const offenders = [];
  for (const file of files) {
    const base = path.basename(file);
    const src = await readFile(file, "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

    if (!ALLOWED.has(base)) {
      const m = code.match(OFFENDER);
      if (m) offenders.push(`${file} — ${m[0].replace(/\s+/g, " ").slice(0, 90)}`);
    }
    for (const name of cardComponents.keys()) {
      if (ALLOWED.has(base) || ALLOWED.has(`${base} > ${name}`)) continue;
      // [\s\S] and not [^)] — a callback's own parameter list contains a ")",
      // so [^)] cannot reach past `(b) =>`, which is how every real caller in
      // this repo is written. The first version of this line passed against
      // the exact commit it was written to catch. Baselined both ways since.
      if (new RegExp(`\\.map\\([\\s\\S]{0,90}?=>\\s*\\(?\\s*<${name}\\b`).test(code)) {
        offenders.push(`${file} — maps onto <${name}>, whose own file draws a .card`);
      }
    }
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

  // The same rule on the RESTYLED surfaces, as Phase 2 lands them. This is
  // the "REFERENCE grows to include the app's own stylesheet" note at the
  // top of this file, honoured one surface at a time: the landing page was
  // ported in roadmap 2.2 and a third face creeping back into it is exactly
  // the kind of drift that goes unnoticed. THE DASHBOARD'S theme.css JOINED
  // THIS LIST IN 2.3 — it was the only thing still using Anybody, Public Sans
  // and DM Mono, and app/index.html went from five families to two in the
  // same edit. All three surfaces are checked now, so "REFERENCE grows to
  // include the app's own stylesheet" is finished.
  // A stack can be written inline (landing.css) or held in a token that
  // font-family then points at (booking.css's --bk-f-body). Both forms
  // start the same way — a quoted family name — so match on that rather
  // than on the property, and `font-family: var(…)` falls out for free.
  for (const sheet of ["app/src/theme.css", "app/src/landing/landing.css", "app/src/book/booking.css"]) {
    const css = await readFile(sheet, "utf8");
    const fams = new Set(
      [...css.matchAll(/(?:font-family|--[\w-]+)\s*:\s*"([^"]+)"/gi)].map(m => m[1]),
    );
    const over = [...fams].filter(f => !allowed.has(f));
    check(
      `${sheet.split("/").pop()} declares exactly Archivo + JetBrains Mono`,
      over.length === 0 && fams.size === 2,
      `saw: ${[...fams].join(", ")}`,
    );
  }

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
console.log("\ntest 4b: theme.css cannot reach into a scoped sheet");
{
  // THE LEAK. app/src/theme.css is imported by main.jsx on EVERY route, so
  // any BARE class selector in it also applies inside .ld (the landing page)
  // and .bk (the booking page), for every property those sheets do not
  // declare themselves. That has now caused live bugs twice: in roadmap 2.2
  // nine of the reference page's class names collided with it, two of them
  // visibly on first render; in 2.3 a new bare rule for the dashboard's day
  // rail reached into the landing page's OWN element of the same name and
  // gave the approved marketing page a rail and a node it never had.
  //
  // landing.css's header has prescribed the grep for this since 2.2. Nobody
  // ran it. So it is a test now, which is exactly what this file is for: a
  // rule that has already been broken by hand.
  //
  // A selector anchored on something theme.css owns (.btn.sm, .cal-cell .n,
  // .settled-row .nm) cannot match over there and is fine: the ancestor or
  // the second class does not exist in a scoped sheet. Only a selector whose
  // WHOLE form is one class counts as bare.
  const themeCss = await readFile("app/src/theme.css", "utf8");
  const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
  const bare = new Set();
  for (const block of strip(themeCss).split("}")) {
    const sel = block.split("{")[0];
    if (!sel || !sel.includes(".")) continue;
    for (const one of sel.split(",")) {
      // Only a WHOLE selector that is one compound of one class can reach
      // over there. `.cal-cell .n` needs a .cal-cell ancestor, which no
      // scoped sheet has; `.btn.sm` needs both classes on one element.
      const m = one.trim().match(/^\.([-\w]+)((::?[-\w()]+)*)$/);
      if (m) bare.add(m[1]);
    }
  }
  // .lite is the app-wide degradation class and is SUPPOSED to reach every
  // surface — it is set on <html> in main.jsx for exactly that reason.
  bare.delete("lite");
  const offenders = [];
  for (const sheet of ["app/src/landing/landing.css", "app/src/book/booking.css"]) {
    const scoped = strip(await readFile(sheet, "utf8"));
    for (const name of bare) {
      if (new RegExp(`\\.${name}(?![-\\w])`).test(scoped)) {
        offenders.push(`${sheet.split("/").pop()} uses .${name}, which theme.css declares bare`);
      }
    }
  }
  check(
    "no bare class in theme.css is used by landing.css or booking.css",
    offenders.length === 0,
    offenders.join("\n        ")
      + "\n        theme.css is GLOBAL. Rename the one in theme.css, or anchor its"
      + "\n        selector on something that sheet owns. See landing.css's header.",
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
