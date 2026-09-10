// How many of the setup steps are done, and what a step IS.
//
// Roadmap 2.11 step 6, stage 7; rebuilt 2026-09-10. This number is printed in
// TWO places that must never disagree — the progress rule across the top of
// the setup form and the "Finish setting up · N of N done" row on Business —
// and component inventory §1b's whole ruling is about keeping them equal. It
// also decides whether an established detailer is nagged for ever about a
// thing they finished months ago.
//
// ═══════════════════════════════════════════════════════════════════════════
// REWRITTEN 2026-09-10, AND WHY THE OLD ONE HAD TO GO
// ═══════════════════════════════════════════════════════════════════════════
//
// Setup was rebuilt at the owner's instruction to WALK THE REAL SETTINGS
// SCREENS instead of carrying seven small copies of them. Eighteen of this
// file's assertions failed the moment it landed, and almost all of them were
// transcripts of the old implementation's source text — `seven steps`, `the
// hours editor opens on the hours that are set`, a regex for one exact line of
// `App.jsx`. **A check written as a quotation of the code fails on any rewrite
// by construction, and tells you nothing about whether the rewrite is
// correct.**
//
// So the assertions below are about BEHAVIOUR wherever behaviour can be
// reached without a browser, and where they must read source they match on
// what the code MEANS rather than on how it was typed. The two that survived
// unchanged in spirit are the two real defects this file was written for:
//
//   · **A purely STORED count** opens Business on a fully configured
//     business — the owner's own — and says "0 of 12", because that business
//     predates the form and has never pressed Continue on anything.
//   · **A purely DERIVED count** says a step is done because the database has
//     a value, when every business is BORN with that value. `newBusiness.ts`
//     seeds hours; an empty gallery is what a new business has AND what a
//     detailer who has not got round to photos has.
//
//   node tests/setup-progress.test.mjs
//
// Credential-free, no browser, no dev server.

import { readFileSync } from "node:fs";
import { setupProgress, STEPS } from "../app/src/lib/setup.js";

// Comments out before anything reads source as text — this repo has been
// caught repeatedly by a check failing, or passing, on the prose explaining it.
const strip = (t) => t
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");
const read = (f) => strip(readFileSync(f, "utf8"));

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed += 1; console.log(`  ok   ${name}`); }
  else { failed += 1; console.log(`  FAIL ${name}${detail ? `\n        ${detail}` : ""}`); }
};

const keys = STEPS.map(([k]) => k);

// THE SCREEN REGISTRY IS READ AS TEXT, NOT IMPORTED. `screens/more/index.js`
// imports twenty-one `.jsx` files and Node cannot load those without a build
// step — so importing it here would make this suite need one, and the whole
// point of the credential-free ten is that they run on a bare clone. The keys
// are what this file needs and they are one regex away.
const SCREEN_KEYS = new Set(
  [...read("app/src/screens/more/index.js")
    .matchAll(/^\s{2}([a-z]+):\s*\[/gm)].map((m) => m[1]),
);

/* ── 1 · what a step is ─────────────────────────────────────────────────── */
console.log("\n1: the step list");

check("every step has a key, a question, a short name and a screen",
  STEPS.every((s) => s.length === 4 && s.every((x) => typeof x === "string" && x.trim())),
  "the fourth column is what the rebuild added — without it a step renders nothing");

check("keys are unique",
  new Set(keys).size === keys.length,
  "a duplicate key makes one step permanently mark another done");

// THE FOURTH COLUMN IS THE WHOLE REBUILD. A key that names no screen is a
// typo that renders a blank step, and a blank step reads as a broken product
// rather than as a mistake in a list.
check("every step names a settings screen that exists",
  SCREEN_KEYS.size > 10 && STEPS.every(([, , , screen]) => SCREEN_KEYS.has(screen)),
  `missing: ${STEPS.filter(([, , , s]) => !SCREEN_KEYS.has(s)).map(([k]) => k).join(", ") || "none"}`);

// §13a's order, and the reason is not taste: a detailer who quits after two
// steps still has a page a customer can book.
check("the order is what-you-sell, then when-you-work",
  keys[0] === "catalog" && keys[1] === "hours",
  `got ${keys.slice(0, 2).join(", ")}`);

// STORED IN `business_settings.setup.done` ON EVERY LIVE BUSINESS. Renaming
// one silently un-does a step somebody finished, which is worse than losing
// it: the form asks again for something already answered.
check("the four keys that predate the rebuild kept their names",
  ["hours", "where", "promos", "colour"].every((k) => keys.includes(k)),
  "renaming a stored key un-marks that step for every existing business");

/* ── 2 · the arithmetic ─────────────────────────────────────────────────── */
console.log("\n2: what counts as done");

const EMPTY = { business: {}, branding: {}, settings: {}, counts: {} };
const p = (over) => setupProgress({ ...EMPTY, ...over });

check("a brand-new business is at zero",
  p({}).count === 0,
  "nothing is seeded into a count any more; every new step is stored-only");

check("the total is the length of the list",
  p({}).total === STEPS.length,
  "Business prints this beside the same number the form draws");

// The three that CANNOT be seeded. A service, a promo code and a colour exist
// only because somebody made one, so reading the database is a real answer.
check("a service counts the catalog step",
  p({ counts: { services: 1 } }).done.has("catalog"));
check("a promo code counts the promo step",
  p({ counts: { promos: 1 } }).done.has("promos"));
check("a colour counts the colour step",
  p({ branding: { primary_color: "#38E08B" } }).done.has("colour"));

// AND THE ONES THAT MUST NOT DERIVE. Every one of these has a state a new
// business is BORN in, so deriving would answer a question nobody was asked.
for (const k of ["hours", "info", "gallery", "reviews", "faq", "payments", "plans", "templates"]) {
  check(`${k} does not derive from an empty business`,
    !p({}).done.has(k),
    "a seeded or empty-by-default value would answer for the detailer");
}

check("a stored mark counts a step the database cannot answer",
  p({ settings: { setup: { done: ["hours"] } } }).done.has("hours"));

check("stored and derived add up rather than replacing each other",
  p({ settings: { setup: { done: ["hours"] } }, counts: { services: 1 } }).count === 2);

// A detailer who deletes their only service has not un-finished the step they
// completed — they have an empty catalog, which the catalog screen says.
check("a stored key survives its data going away",
  p({ settings: { setup: { done: ["catalog"] } }, counts: { services: 0 } }).done.has("catalog"));

check("one new fact moves the count by exactly one",
  p({ counts: { services: 1 } }).count - p({}).count === 1);

/* ── 3 · the form renders the real screens ──────────────────────────────── */
console.log("\n3: the form");

const form = read("app/src/components/SetupForm.jsx");

check("it renders the settings screen a step names",
  /SCREENS\[screen\]/.test(form) && /<Screen \/>/.test(form),
  "the rebuild's entire point: one editor per thing in this product");

// THE COPIES ARE THE THING THAT WAS REMOVED. Setup asked for one open and
// close time for the whole week while the real Hours screen did days properly
// — the owner's complaint, and what a second copy of an editor guarantees.
check("no bespoke editors are left in it",
  !/const \[draft, setDraft\]/.test(form) && !/const commit = async/.test(form),
  "a draft object or a commit() means an editor grew back inside the form");

check("a missing screen says so rather than rendering nothing",
  /Screen \? <Screen \/> :/.test(form),
  "a blank step reads as a broken product, not as a typo in a list");

// F-002, and it is the defect that made this file exist. Continue marks;
// Skip must not, or tapping the primary button twelve times reports a
// finished setup on a business that answered nothing.
check("Continue marks the step and Skip does not",
  /go\(i \+ 1, true\)/.test(form) && /go\(i \+ 1, false\)/.test(form));
check("and marking is what writes the done list",
  /if \(mark\)[\s\S]{0,200}?setup\?\.done/.test(form));

check("closing marks the form seen, so it does not reopen tomorrow",
  /marked\.current = true; patchSetup\(\{ seen: true \}\)/.test(form));

/* ── 4 · what outranks the first run ────────────────────────────────────── */
console.log("\n4: first run against a deep link");

const app = read("app/src/App.jsx");

// F-003. A detailer who chose a plan on /pricing is sent to the billing
// screen, and the first-run form used to render straight over it with the
// tour over that. Closing both left them on Today, never subscribed, with
// nothing on any screen saying so.
//
// **MATCHED ON MEANING, NOT ON THE OLD LINE.** This asserted one exact string
// — `deepLink.current === "billing"` — and broke when the rule was widened to
// cover every settings link, which is a strictly larger version of the same
// protection. A check that fails when its own guarantee gets stronger is a
// check written wrong.
const guard = app.match(/if \(deepLink\.current[^)]*\) return;/);
check("a deep link outranks the first run", !!guard, "no early return on deepLink in the first-run effect");
check("and it is read before either branch opens anything",
  !!guard && app.indexOf(guard[0]) < app.indexOf('setFirstRun("setup")'));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
