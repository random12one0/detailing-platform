// WHY THIS EXISTS, AND IT IS THE PART THAT DECIDES WHETHER YOU RUN IT.
// Moved here from CLAUDE.md's verification table on 2026-09-20 — the table
// names the trigger, this names the case. Three rows there carried 2,382
// characters of justification between them, which is prose a person only
// needs once they are already looking at this file.
//
// **Credential-free, no browser, no dev server, no tenant — one filesystem
// read.** 47 controls across `scripts/*.mjs` are addressed by the WORDS on
// them, so renaming one silently blinds a check: the matcher falls back to
// bare English, matches nothing, and the screen goes unmeasured while every
// other line reads normally. It happened twice on 2026-09-20 — `"Log a bulk
// job"` and `"Maintenance deadlines"` — and the second time it produced a
// confident wrong finding that nearly became a work order against correct
// code. It names the stale label, and it says plainly that a stale label is a
// hole in the QUESTION rather than a screen that failed to load
//
// EVERY LABEL A CHECK NAMES MUST STILL EXIST IN THE PRODUCT.
//
//   node scripts/label-guard.mjs            # audit every scripts/*.mjs
//   node scripts/label-guard.mjs --list     # ... and print all of them
//
// Credential-free. No browser, no dev server, no tenant. One filesystem read.
//
// **WHY THIS EXISTS, 2026-09-20.** A settings row was renamed from
// "Maintenance deadlines" to "Visits due", with its Spanish key moved in the
// same edit — correct work, committed. `sweep-widths.mjs` still named the row
// by its old English. `NAMED_TEXT()` looks a label up in `appEs.js` and, when
// the catalogue has no entry, **falls back silently to the bare English**,
// which then matches nothing. The screen went unmeasured, and a second,
// ad-hoc check built from THE SAME STALE STRING appeared to confirm that the
// row had no Spanish translation. It had one all along.
//
// **Nothing in the instrument caught that.** It was caught by two sessions
// disagreeing and a third party opening `appEs.js` and reading line 464. That
// path needs two people in the loop and somebody senior to go and look; it
// does not scale, and it will not happen when nobody is watching. This file
// is what makes the same catch cost one filesystem read.
//
// It had already happened once that day — `"Log a bulk job"` became
// `"Add a fleet job"` — so this is a class with two instances in one
// afternoon, not a one-off.
//
// **WHAT THIS DOES NOT CLAIM, AND THE DISTINCTION IS THE POINT.** It reads
// SOURCE. It says one thing only: *this check names a label the product no
// longer contains.* It says nothing about whether a screen loads, renders, or
// is reachable at run time. **A stale label and a screen that failed to load
// are different faults and must never look the same** — a stale label is a
// permanent, silent hole in the QUESTION; a screen that failed to load is a
// hole in one RUN. This file only ever reports the first, and says so in its
// own output so the two cannot be confused in a log.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";

const root = (p) => fileURLToPath(new URL("../" + p, import.meta.url));

// Every way a check in this repo addresses a control by the words on it.
// **A pattern missing from this list is a whole family going unguarded**, so
// it is written out rather than generalised into one clever regex.
const PATTERNS = [
  ["NAMED(…)", /NAMED\(\s*"([^"]+)"/g],
  ["NAMED_TEXT(…)", /NAMED_TEXT\(\s*"([^"]+)"/g],
  ["hasText:", /hasText:\s*"([^"]+)"/g],
  [":has-text(…)", /:has-text\("([^"]+)"\)/g],
  ["getByRole(name:)", /getByRole\([^)]*name:\s*"([^"]+)"/g],
  ["getByText(…)", /getByText\(\s*"([^"]+)"/g],
  ["getByLabel(…)", /getByLabel\(\s*"([^"]+)"/g],
  ["getByPlaceholder(…)", /getByPlaceholder\(\s*"([^"]+)"/g],
];

/** Everything a person could read in the product, as one string. */
export const productText = () => {
  const out = [];
  const walk = (dir) => {
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      const q = `${dir}/${f.name}`;
      if (f.isDirectory()) walk(q);
      else if (/\.(jsx?|json)$/.test(f.name)) out.push(readFileSync(q, "utf8"));
    }
  };
  walk(root("app/src"));
  // The seed is where a check's subjects come from — a customer's name is a
  // label a check may address, and it lives here rather than in `app/src`.
  // Without this, every seeded name reads as stale. ("Victor Salas" did.)
  out.push(readFileSync(root("scripts/seed-demo.mjs"), "utf8"));
  return out.join("\n");
};

/**
 * @param labels  the label strings a check declares
 * @returns { checked, stale, dynamic }
 *   `dynamic` is a label built at run time (`${tab}`): it cannot be verified
 *   from source and is NOT counted as passing. A thing we chose not to check
 *   and a thing we failed to check must not look the same.
 */
export const checkLabels = (labels, text = productText()) => {
  const stale = [], dynamic = [], ok = [];
  for (const l of labels) {
    if (l.includes("${") || !l.trim()) dynamic.push(l);
    else if (text.includes(l)) ok.push(l);
    else stale.push(l);
  }
  return { checked: ok.length, stale, dynamic };
};

/** Every label declared anywhere in `scripts/`, as label -> which files. */
export const declaredLabels = () => {
  const found = new Map();
  for (const f of readdirSync(root("scripts")).filter((n) => n.endsWith(".mjs"))) {
    if (f === "label-guard.mjs") continue;   // its own PATTERNS are not labels
    const text = readFileSync(root(`scripts/${f}`), "utf8");
    for (const [, re] of PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        // **FOLLOW ONE INDIRECTION, BECAUSE THE LABELS ARE USUALLY RIGHT
        // THERE.** `button:has-text("${tab}")` captures `${tab}`, which no
        // source scan can verify — but the loop above it reads
        // `for (const tab of TABS)` and `const TABS = ["Today", …]` is five
        // real labels in the same file. Reporting that as "not verifiable"
        // would be true and useless: it would park five checkable labels in
        // the unchecked pile for ever, which is the same thing as a skip
        // nobody can refuse. Anything more tangled than a literal array of
        // strings is left as NOT VERIFIABLE rather than guessed at.
        // Read the loop rather than guessing a naming convention: the first
        // attempt assumed `tab` -> `TAB` and the array is `TABS`, so it
        // silently expanded nothing and the label stayed unverifiable while
        // looking handled.
        const solo = /^\$\{(\w+)\}$/.exec(m[1]);
        const loop = solo && new RegExp(`for\\s*\\(\\s*const\\s+${solo[1]}\\s+of\\s+(\\w+)\\s*\\)`).exec(text);
        const arr = loop && new RegExp(`const\\s+${loop[1]}\\s*=\\s*\\[([^\\]]*)\\]`).exec(text);
        const names = arr ? [...arr[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [m[1]];
        for (const name of names) {
          if (!found.has(name)) found.set(name, new Set());
          found.get(name).add(f);
        }
      }
    }
  }
  return found;
};

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const started_at = new Date().toISOString();
  const all = declaredLabels();
  // **THE CANARY.** A label no product could contain. If the run below does
  // not name it, this file is not reading anything and every clean verdict it
  // has ever printed is void.
  const CANARY = "A control that has never existed in this product";
  all.set(CANARY, new Set(["(canary)"]));

  const text = productText();
  const labels = [...all.keys()];
  const { checked, stale, dynamic } = checkLabels(labels, text);

  // FAIL CLOSED ON ZERO. A scanner that found no labels has proved nothing,
  // and a broken regex list reads exactly like a repo with no literals in it.
  const MIN = 30;
  const tooFew = labels.length < MIN;

  if (process.argv.includes("--list")) {
    for (const l of labels.sort()) {
      const where = [...all.get(l)].join(", ");
      const mark = l.includes("${") ? "DYNAMIC" : text.includes(l) ? "ok     " : "STALE  ";
      console.log(`  ${mark}  ${l}   <- ${where}`);
    }
    console.log("");
  }

  const canaryCaught = stale.includes(CANARY);
  // **THE CANARY PROVES DETECTION; THIS PROVES THE REPORT.** The canary is
  // held out of the findings on purpose, so a clean run stays clean — which
  // means the block that names a stale label, and the non-zero exit beside
  // it, are never exercised by an ordinary run. `LABEL_GUARD_BREAK=1` lets
  // the canary through as a real finding, so the thing somebody will actually
  // read at 2am has been seen at least once.
  const BREAK = process.env.LABEL_GUARD_BREAK === "1";
  const realStale = BREAK ? stale : stale.filter((l) => l !== CANARY);

  console.log(`label-guard: ${labels.length - 1} declared label(s) across scripts/, `
    + `${checked} still present in the product, ${dynamic.length} built at run time and not verifiable here.`);
  console.log(`This reads SOURCE ONLY. A stale label is a permanent hole in the QUESTION a check asks;`);
  console.log(`it is NOT the same as a screen that failed to load, which is a hole in one run.`);

  if (!canaryCaught) {
    console.log(`\nCANARY MISSED — "${CANARY}" is not in this product and this guard did not say so.`);
    console.log(`Every clean verdict above is void.`);
  }
  for (const l of dynamic) {
    console.log(`\n  NOT VERIFIABLE  ${l}   <- ${[...all.get(l)].join(", ")}`);
    console.log(`     built at run time, so source cannot confirm it. Unchecked, not clean.`);
  }
  if (realStale.length) {
    console.log(`\nSTALE LABELS — ${realStale.length} declared label(s) no longer appear anywhere in the product.`);
    console.log(`A renamed control does not fail loudly: the matcher falls back to the bare English,`);
    console.log(`matches nothing, and the screen goes unmeasured while every other line reads normally.`);
    console.log(`Re-point each of these at its current wording. Do NOT delete the line — a label that`);
    console.log(`leaves a check is a screen nobody looks at again.`);
    for (const l of realStale) console.log(`    NO LONGER IN THE PRODUCT  ${l}   <- ${[...all.get(l)].join(", ")}`);
  } else {
    console.log(`\nNo stale labels.`);
  }

  const failures = [
    ...realStale.map((l) => `declared label no longer in the product: "${l}" (${[...all.get(l)].join(", ")})`),
    ...(canaryCaught ? [] : ["the canary label was not reported — this guard is not reading the product"]),
    ...(tooFew ? [`only ${labels.length} label(s) discovered, below the floor of ${MIN} — the scanner is broken`] : []),
  ];
  const n = labels.length - 1;
  const { path } = writeReceipt({
    check_id: "label-guard",
    started_at,
    status: failures.length === 0 ? "pass" : "fail",
    expected_targets: n,
    discovered_targets: n,
    attempted_targets: n,
    completed_targets: n,
    // Dynamic labels are NOT completed — they are declared and unverifiable,
    // which is what `skipped_targets` is for. `receipt.mjs` fails a nonzero
    // count with no allowlist, so they cannot quietly accumulate.
    skipped_targets: dynamic.length,
    assertions_executed: n,
    min_assertions: MIN,
    failures,
    artifacts: ["scripts/label-guard.mjs"],
    warnings: [],
    dimensions: { patterns: PATTERNS.map(([k]) => k), sources: "app/src + scripts/seed-demo.mjs" },
    canary: {
      id: "a declared label that no product could contain",
      observed_failure: canaryCaught,
      caught_by: ["source scan"],
      findings: [canaryCaught ? `named "${CANARY}"` : "NOT named — this guard is blind"],
    },
  });
  console.log(`\nreceipt        ${path}   —  validate: node scripts/receipt.mjs`);
  process.exit(failures.length ? 1 : 0);
}
