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
  // ROADMAP 2.12. Not a quiet exemption: docs/dashboard-screen-designs-
  // 2026-08-31.md §2 designed this queue and said "one card" in those words,
  // and it is the Money.jsx reasoning exactly — every row here carries its own
  // Accept, Quote and Decline, which is the definition of an object you act on
  // rather than a record you read. The ceiling is real and is stated in
  // Today.jsx: a detailer sitting on twelve unanswered requests gets twelve
  // cards, and if that ever happens the answer is a ruled list with the first
  // one opened, not a shorter card.
  ["Today.jsx > RequestCard", "each request carries its own three actions — an object you act on"],
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

// ─────────────────────────────────────────────────────────────────────────
console.log("\ntest 8: the corner and the second column's motion (roadmap 2.17)");
{
  // WHY THIS TEST EXISTS. Both halves of 2.17 are rules that a later change
  // breaks by OMISSION rather than by doing something wrong — a new panel that
  // forgets `corner-shape`, a new second column that forgets its exit. Neither
  // failure is visible: an un-squircled card looks like a card, and a hard cut
  // looks like a fast animation. Nothing else in this repo can see either.
  const theme = await readFile("app/src/theme.css", "utf8");

  // 8a · EVERY --r-panel / --r-inset CORNER IS SQUIRCLED, AND NO PILL IS.
  // The pairing rule from theme.css § SHAPE.
  //
  // BOTH TOKENISED SURFACES, and that is the point rather than thoroughness.
  // Every surface in this product defines its own copy of the radii, so a rule
  // enforced on one of them is a rule the other drifts away from — the
  // detailer's page and the customer's page would end up with two corner
  // languages, which is the one outcome § Layout says is worse than not doing
  // this at all. (`landing.css` and the approved reference rendering use
  // LITERAL pixel radii, no tokens, so there is nothing here to pair and they
  // are deliberately not swept — see roadmap 2.17, still with the owner.)
  //
  // Split on `}` so each declaration block is judged on its own.
  const SURFACES = [
    ["theme.css", theme, "--r", 10],
    ["booking.css", await readFile("app/src/book/booking.css", "utf8"), "--bk-r", 4],
  ];
  const firstLine = (b) => (b.trim().split("\n").find((l) => l.includes("{")) || b.trim().slice(0, 60)).trim();

  for (const [name, src, prefix, floor] of SURFACES) {
    const blocks = src.split("}");
    const radiusRe = new RegExp(`border-radius:[^;]*var\\(${prefix}-(panel|inset)\\)`);
    const pillRe = new RegExp(`border-radius:[^;]*(var\\(${prefix}-pill\\)|50%|100px)`);
    const radiusBlocks = blocks.filter((b) => radiusRe.test(b));
    const unpaired = radiusBlocks.filter((b) => !/corner-shape:/.test(b)).map(firstLine);
    // Borrowed from email-brand 7a-iii: assert the check HAS SUBJECTS, so a
    // rename of the radius tokens fails loudly instead of going vacuous.
    check(`8a-i · ${name}: the corner check has subjects`, radiusBlocks.length >= floor,
      `only ${radiusBlocks.length} panel/inset radius declarations found`);
    check(`8a-ii · ${name}: every panel and inset corner is squircled`, unpaired.length === 0,
      unpaired.join("\n        "));
    // A PILL IS NEVER SQUIRCLED — a superellipse at a 100px radius is a
    // lozenge and at 50% a blob. This is the half that would silently reshape
    // every dot, ring, avatar and spinner in the product.
    const pillSquircled = blocks
      .filter((b) => /corner-shape:/.test(b)).filter((b) => pillRe.test(b)).map(firstLine);
    check(`8a-iii · ${name}: no pill, dot or circle is squircled`, pillSquircled.length === 0,
      pillSquircled.join("\n        "));
  }
  const blocks = theme.split("}");

  // 8b · THE SECOND COLUMN ANIMATES IN AND OUT.
  check("8b-i · the second column has an entrance",
    /\.split > \.col-2 \{[^}]*animation: column-in/.test(theme));
  check("8b-ii · and an exit",
    /\.split > \.col-2\.leaving \{[^}]*animation: column-out/.test(theme));
  check("8b-iii · both keyframes exist",
    /@keyframes column-in\b/.test(theme) && /@keyframes column-out\b/.test(theme));
  // It is --t-exit and not --t-reveal, which is the acceptance test in a
  // regex: 420ms on a record you open forty times a day is a gate.
  check("8b-iv · the second column opens at --t-exit, not --t-reveal",
    /\.split > \.col-2 \{[^}]*column-in var\(--t-exit\)/.test(theme));
  // `.lite` renders the end state for BOTH directions — the degradation rule.
  check("8b-v · reduced motion switches both directions off",
    /\.lite \.split > \.col-2, \.lite \.split > \.col-2\.leaving \{ animation: none/.test(theme));

  // 8c · THE JS HALF, AND THE NUMBER THAT MUST NOT DRIFT. An exit is a delayed
  // unmount, so the delay and --t-exit are one fact in two files. It was
  // written out twice before `useLeaving` existed; this stops it happening
  // again silently.
  const leaving = await readFile("app/src/hooks/useLeaving.js", "utf8");
  const exitMs = /EXIT_MS = (\d+)/.exec(leaving)?.[1];
  const tExit = /--t-exit:\s*(\d+)ms/.exec(theme)?.[1];
  check("8c-i · useLeaving's delay matches --t-exit", exitMs && exitMs === tExit,
    `useLeaving ${exitMs}ms vs --t-exit ${tExit}ms`);
  // ANYTHING THAT OPENS INTO THE SECOND COLUMN USES IT. Three callers today;
  // a fourth that rolls its own setTimeout is how the pattern forks.
  for (const f of ["app/src/components/RecordHost.jsx",
                   "app/src/components/SettingsHost.jsx",
                   "app/src/screens/Calendar.jsx"]) {
    const src = await readFile(f, "utf8");
    check(`8c-ii · ${f.split("/").pop()} closes through useLeaving`,
      /useLeaving\(/.test(src));
  }

  // 8d · THE CALENDAR'S CONTAINER IS STABLE. A `wide && day` here would put the
  // remount back: React would swap `.group` for `.split.calday` and re-run the
  // whole month's arrival, which is the "it's almost like I refresh the page"
  // defect this item was opened for.
  const cal = await readFile("app/src/screens/Calendar.jsx", "utf8");
  check("8d-i · the month's desk container does not depend on a day being open",
    !/if \(wide && day\) \{/.test(cal));
  // 8d-ii CHANGED 2026-09-03 WHEN THE OWNER ASKED FOR THE MONTH TO TRAVEL.
  // It used to assert `display: block` for the closed state. That was right
  // until the month had to ANIMATE between the two: `display` is not
  // transitionable, so the closed state is now a two-track grid whose second
  // track is 0px, which is. The invariant is unchanged — with nothing open the
  // month gets the whole width and no gap is reserved — so the check follows
  // the invariant rather than the old spelling of it.
  // AND IT ASSERTS `display: block` IS GONE, because re-introducing it is the
  // one edit that silently kills the travel while still looking correct.
  check("8d-ii · with nothing open the month takes the whole width",
    /\.split\.calday:not\(:has\(> \.col-2:not\(\.leaving\)\)\) \{[^}]*grid-template-columns: minmax\(0, 1fr\) 0px;[^}]*column-gap: 0;/.test(theme));
  check("8d-ii-b · and it does that with a 0px track, not display:block",
    !/\.split\.calday[^{]*\{[^}]*display: block/.test(theme));
  // THE MONTH TRAVELS WITH THE PANEL, not after it. Both ends key on
  // `:not(.leaving)` so the return starts as the exit starts; without that,
  // closing is 180ms of panel then 180ms of month and reads as two events.
  check("8d-iv · the month's own move is transitioned",
    /\.split\.calday \{[^}]*transition: grid-template-columns var\(--t-exit\)/.test(theme)
    && /\.app-main:has\(> \.split\.calday\) \{ transition: max-width var\(--t-exit\)/.test(theme));
  check("8d-v · and it starts back as the panel starts leaving",
    /\.app-main:has\(> \.split\.calday > \.col-2:not\(\.leaving\)\) \{ max-width: 1720px/.test(theme));
  // A :has() MAY NOT CONTAIN ANOTHER :has(). The nested form was written first
  // and the browser dropped the whole selector in silence, costing the month
  // 540px at 1920. Nothing else in this repo can see an invalid selector.
  check("8d-iii · no :has() is nested inside another :has()",
    !/:has\((?:[^()]|\([^()]*\))*:has\(/.test(theme));

  // 8e · A CONTENT SWAP, added 2026-09-03 on the owner's second pass — "the GUI
  // kind of doesn't really change, but the actual text inside of it changes" —
  // and REWRITTEN the same day after he rejected the first version of it.
  //
  // WHAT THESE CHECKS ARE NOW FOR, because it is not what they were for this
  // morning. The first version was a uniform cross-fade (opacity + a 4px blur,
  // the whole block on one timeline) and he turned it down: "it just looks like
  // a page refresh… it doesn't look fluid." A page reload IS a whole block
  // changing opacity at once, so the fault was the UNIFORMITY rather than the
  // duration or the blur. **The invariant these checks defend is therefore
  // "the block never animates as one plane"** — which is a property no
  // screenshot, no sweep and no contrast test in this repo can see, and which
  // one plausible-looking edit (moving the animation back up onto `.swap`)
  // silently destroys.
  check("8e-i · the swap moves its PARTS, on the screen's own keyframe at exit speed",
    /\.swap > \* \{ animation: arrive var\(--t-exit\) var\(--e-out\) backwards; \}/.test(theme));
  // THE HALF THAT ACTUALLY HOLDS THE LINE, and it is deliberately stricter
  // than "no animation on .swap": NO RULE MAY TARGET `.swap` ITSELF AT ALL.
  // The narrow version would have to guess at every spelling of the defect
  // (`animation:`, `animation-name:`, a shorthand inside a media query, a
  // `transition` doing the same job), and the flat plane coming back is
  // exactly the edit that looks like a tidy-up — one selector instead of ten.
  // The block is a marker and a React key; everything visual is on its parts.
  // A future rule that genuinely needs to style `.swap` fails here and has to
  // read the comment in theme.css first, which is the point.
  check("8e-i-b · no rule targets the block itself, only its parts",
    !/\.swap\s*\{/.test(theme), "a rule targets .swap itself, not its children");
  // THE REJECTED PROPERTY IS GONE, BY NAME. He asked for a blur in his first
  // message and withdrew it in his second, apologising for having steered us
  // to it — and the withdrawn quote is still in the roadmap, the design system
  // and DECISIONS, so it is re-derivable by a session reading only that half.
  // `backdrop-filter: blur()` is a different property and three surfaces use
  // it, which is why this looks for `filter:` not preceded by a hyphen.
  check("8e-ii · the rejected blur is gone and did not come back",
    !/@keyframes swap-in/.test(theme) && !/(^|[^-])filter: blur/m.test(theme));
  // 8e-iii REPLACED 2026-09-03, and the reason is worth more than the check.
  // The swap first lost the cascade to the screen's arrival
  // (`.app-main > .split > .col-1 > *` is (0,4,0), `.swap` is (0,1,0)), so
  // Money re-ran `arrive` on every period change. The first fix was a
  // specificity override, and it won the fight and broke a different law: on
  // FIRST paint the swapped blocks dissolved in 180ms while their siblings
  // rose over 420ms, so the screen arrived at two speeds. Measured both times
  // with getAnimations(), not read.
  // THE FIX IS MARKUP: a swap goes on an INNER wrapper, so the outer element
  // keeps its place in the arrival. This check exists to stop the override
  // coming back, because it looks like the obvious answer and it is not.
  check("8e-iii · the swap does not fight the screen's arrival in the cascade",
    !/\.col-1 > \.swap/.test(theme) && !/\.rows\.swap/.test(theme));
  // AND THE MARKUP HALF, SITE BY SITE. The first version of this asked for
  // "a wrapper" with an `||` across the two patterns, so unwrapping ONE of
  // Money's two swaps left it green — the other one answered for it.
  // Baselining caught that, and it is the third `||`-shaped vacuity in this
  // test today: **an OR across independent subjects is not a check on either
  // of them.** Every site is named and asserted on its own.
  const WRAPPED = [
    ["app/src/screens/Money.jsx", "the period's figures",
      '      <div>\n      <div className="swap" key={`${kind}|${offset}`}>'],
    ["app/src/screens/Money.jsx", "the period's context block",
      '        <div>\n        <div className="sunken swap" key={`ctx-${kind}|${offset}`}>'],
    ["app/src/screens/Clients.jsx", "the sorted list",
      '      <div>\n      <div className={`rows cols clients swap'],
  ];
  for (const [f, what, needle] of WRAPPED) {
    const src = await readFile(f, "utf8");
    check(`8e-iv · ${f.split("/").pop()}: ${what} is nested, not a .col-1 child`,
      src.includes(needle));
  }
  // 8e-vii · THE PARTS MOVE ON DIFFERENT TIMELINES, WHICH IS THE WHOLE FIX.
  // A stagger that collapses to one beat is a uniform fade wearing ten
  // selectors, so this counts DISTINCT delays rather than the presence of a
  // ladder. Eight deep rather than the five the screen's arrival and the day
  // rail cap at: the Clients list is the longest thing that swaps here and
  // most of it sits below the fifth row, so a cap at five would leave the
  // majority of that list moving as one plane — the rejected fault, on the
  // screen where it would be most visible.
  const beats = [...theme.matchAll(/\.swap > \*:nth-child\([^)]*\) \{ animation-delay: (\d+)ms; \}/g)]
    .map((m) => Number(m[1]));
  check("8e-vii · the parts are staggered, eight beats deep before it caps",
    new Set(beats).size >= 8 && /\.swap > \*:nth-child\(n\+9\) \{ animation-delay: 160ms; \}/.test(theme),
    `${new Set(beats).size} distinct delays: ${beats.join(", ")}`);
  // 8e-viii · FURNITURE DOES NOT MOVE. A control that is pixel-identical in
  // both records did not change, so animating it says something untrue — and
  // static chrome behaving like content is the page-refresh tell itself. The
  // close button was pulled out of the swap in the markup for this reason; the
  // action bar is the same object and was missed because it is a CHILD of
  // `.record-body` rather than a sibling of it. Measured: `.jobbar` travelling
  // 14px at delay 20ms on every job switch, six unchanged buttons, pinned, on
  // the record's primary tap target.
  check("8e-viii · the pinned action bar opts out of the swap",
    /\.swap > \.jobbar \{ animation: none; \}/.test(theme));
  // 8e-ix · AND THE CHART DOES NOT ANIMATE TWICE. `bar-rise` is --t-reveal and
  // is right on first paint; on a period change it ran 280ms past everything
  // beside it, which is "half the screen moving" with the halves swapped. No
  // selector can tell the two apart — the figures are in a keyed `.swap`, so
  // the bars remount identically either way — so Money.jsx carries the fact
  // and this pins BOTH halves. A CSS-only edit here would silently kill the
  // first-paint rise as well, which is the failure this pairing prevents.
  {
    const money = await readFile("app/src/screens/Money.jsx", "utf8");
    check("8e-ix · the chart does not re-rise on a swap",
      /\.bars\.replacing button::before \{ animation: none; \}/.test(theme)
      // LATCHED PER PERIOD, not recomputed per render — the first version was
      // recomputed and went false on the very next render (the reload setting
      // `refreshing`), which REMOVED `animation: none` from a live element and
      // therefore STARTED the animation. Correct-looking code, unchanged
      // behaviour, and only `getAnimations()` could see it.
      && /drawn\.current = \{ key: periodKey, replacing: drawn\.current\.key !== null \};/.test(money)
      && money.includes('${replacing ? " replacing" : ""}'));
  }
  check("8e-v · reduced motion renders the end state",
    /\.lite \.swap > \* \{ animation: none; \}/.test(theme));
  // EVERY SCREEN THE OWNER NAMED USES IT. He listed three places that "just
  // instantly change"; a fourth that hand-rolls its own is how this forks.
  for (const [f, why] of [
    ["app/src/components/RecordHost.jsx", "switching from one job to another"],
    ["app/src/screens/Money.jsx", "switching period"],
    ["app/src/screens/Clients.jsx", "re-sorting the list"],
  ]) {
    const src = await readFile(f, "utf8");
    check(`8e-vi · ${f.split("/").pop()} swaps its content (${why})`,
      // Plain includes(), NOT a regex. The first version of this line was
      // written through a shell heredoc and `\b` became a RAW BACKSPACE
      // (0x08) inside the pattern — invisible in every editor and in sed,
      // visible only under `cat -A` / `od -c`. CLAUDE.md already records
      // that exact trap from roadmap 2.18 and it happened again anyway, so:
      // when a check that should pass fails on a regex, LOOK AT THE BYTES.
      // AND IT LOOKS FOR THE CLASS BEING APPLIED, NOT FOR THE WORD. The
      // first version asked `src.includes("swap")`, which the WORD in the
      // comment explaining the swap satisfied all by itself — so deleting
      // the class from Money left this green. Baselining is what found it,
      // and it is the vacuity family again: a check whose only subject was
      // its own documentation.
      (src.includes('className="swap"')
        || src.includes("record-body swap")
        || src.includes("clients swap")
        || src.includes("sunken swap"))
      && src.includes("key={"));
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
