// ROADMAP 9.11e — every screen with fixed furniture is hit-tested, or the gap is
// declared by name.
//
//   node --test tests/fixed-furniture-is-hit-tested.test.mjs
//
// Credential-free. No dev server, no browser, no database, nothing written to
// disk: it reads the four stylesheets, the four hit-testing scripts and a
// handful of JSX files as text.
//
// ---------------------------------------------------------------------------
// THE MANAGER'S RULING, 2026-10-07, WHICH IS WHAT UNBLOCKED THIS
// ---------------------------------------------------------------------------
// 9.11e carried *"Needs a person to say which screens count."* It no longer
// does: **every screen that has anything fixed or sticky over the scroll
// counts** — the booking page's fixed bar, the dashboard rail and phone tab
// bar, the back office, the job record's pinned bar, and any sticky header or
// footer. And: **derive the list from the CSS, do not type it from memory.**
//
// So the population here is not a list somebody wrote down. It is every
// `position: fixed` and `position: sticky` rule in the four stylesheets, read
// fresh on every run. A new one appears in this check the moment it is written.
//
// ---------------------------------------------------------------------------
// WHAT COUNTS AS FURNITURE, AS A RULE RATHER THAN A JUDGEMENT
// ---------------------------------------------------------------------------
// Fixed furniture is what can come to REST OVER a control and take or block the
// press. Two kinds of fixed thing cannot, and both are EXCLUDED BY A STATED
// RULE and printed by name rather than dropped:
//
//   pointer-events: none   it is painted over the page and passes every press
//                          straight through. A scrim, a dot field, a glow.
//   covers the viewport    `inset: 0` with a high stacking order: a modal
//                          surface, a backdrop, the tour's blocker. It covers
//                          EVERYTHING on purpose, so "did a control come to
//                          rest underneath it" is not the question to ask of
//                          it — whether it traps focus is, and that is a
//                          different check.
//
// Everything else is furniture and owes a hit-test.
//
// ---------------------------------------------------------------------------
// WHY THE GAPS ARE A DECLARED LIST AND NOT A STRAIGHT FAILURE
// ---------------------------------------------------------------------------
// 9.11e is open BECAUSE gaps exist. A check that simply failed on each one
// would be **red by default** — which this repo has already rejected twice by
// name (`tests/every-open-item-is-citable.test.mjs` on a figure that moves
// every commit, `docs/gotchas.md` 95 on the same shape). A red that is red
// every day is a red nobody reads.
//
// So the uncovered set is **declared by name**, the way `NO_COMMIT_YET` is in
// `tests/sweep-methods-are-pinned.test.mjs`, and the assertion is an EQUALITY
// on that set — `docs/gotchas.md` 98, because this is a declaration of how much
// debt exists and a ceiling with room in it means the next one lands with
// nothing going red. **A piece of fixed furniture ARRIVING uncovered and
// undeclared fails this check by name.** One LEAVING is ordinary progress:
// take it off the list in the same edit as the hit-test that covers it.
//
// ---------------------------------------------------------------------------
// COVERAGE IS DERIVED FROM THE SCRIPTS, NOT ASSERTED
// ---------------------------------------------------------------------------
// A selector is covered when one of the four hit-testing scripts the manager
// named — and only those four — mentions it. **`scripts/` is frozen for this
// session, so nothing here edits one; they are read as text.**
//
// The narrowing matters and is measured: `.tabbar` is named by 31 scripts, and
// almost all of them only `waitForSelector` on it to know the dashboard has
// loaded. Naming a bar is not probing it. All four of these call
// `elementFromPoint`, which section 1 asserts rather than assumes.
//
// **WHAT THIS CHECK CANNOT SEE, SAID PLAINLY.** It reads text. It cannot know
// whether a script's walk actually ENCOUNTERED a piece of furniture on the run
// — `keyboard-walk.mjs` catches a control focused under any fixed thing on the
// six dashboard screens it walks, but only furniture that was on screen at the
// time. So coverage here means *a check exists that would ask the question*,
// never *the question was asked today*. That is the honest ceiling and it is
// why 9.11e's Done-when asks for a named check per screen rather than a green.
//
// ---------------------------------------------------------------------------
// THE CANARY
// ---------------------------------------------------------------------------
// ON BY DEFAULT. Section 5 pushes a synthetic fixed rule through the real
// `rulesFrom()` and `classify()` and requires it to come back as furniture with
// no screen and no check. `FURNITURE_CANARY=off` disables it and the section
// then fails on purpose. Two sabotages break the real run in memory:
//
//   FURNITURE_BREAK=new-furniture  appends a fixed rule to a real stylesheet
//   FURNITURE_BREAK=uncover        hides `.bk-bar` from the coverage read
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = (p) => new URL(`../${p}`, import.meta.url);
const read = (p) => readFileSync(root(p), "utf8");

const BREAK = process.env.FURNITURE_BREAK || "";
const CANARY_ON = process.env.FURNITURE_CANARY !== "off";

const CSS = ["app/src/theme.css", "app/src/book/booking.css", "app/src/admin/admin.css", "app/src/landing/landing.css"];

// The four the manager named. Nothing else counts as a hit-test here, and
// nothing in this file writes to any of them.
const HIT_TESTERS = [
  "scripts/bk-bar-clearance.mjs",
  "scripts/pinned-bar.mjs",
  "scripts/tabbar-clearance.mjs",
  "scripts/keyboard-walk.mjs",
  // ADDED 2026-10-07, and it is the first row this check caused rather than
  // recorded. The back office was the largest of the two "nothing visits this
  // screen at all" gaps -- three pieces of furniture, no probe -- and
  // `admin-furniture-clearance.mjs` is the `tabbar-clearance` pattern pointed at
  // /admin. Its own header says which account it signs in as and why that is a
  // throwaway.
  "scripts/admin-furniture-clearance.mjs",
];

// Comments are blanked rather than removed, so a reported line number is the
// line in the real file. The first draft deleted them and every line number it
// printed was wrong by the length of the comments above it.
const blankComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

/** Every position: fixed / sticky rule in one stylesheet. Production code. */
export function rulesFrom(text, file) {
  const src = blankComments(text);
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(src))) {
    const body = m[2];
    const pos = body.match(/position:\s*(fixed|sticky)/);
    if (!pos) continue;
    out.push({
      file,
      line: src.slice(0, m.index).split("\n").length,
      sel: m[1].replace(/\s+/g, " ").trim(),
      kind: pos[1],
      noPointer: /pointer-events:\s*none/.test(body),
      insetZero: /inset:\s*0/.test(body),
    });
  }
  return out;
}

const EXCLUSIONS = {
  "pointer-events: none": "painted over the page and passes every press through",
  "covers the viewport": "inset: 0 — a modal surface or backdrop, which covers everything on purpose",
};

/** furniture, or excluded with one of the two stated reasons. Production code. */
export function classify(rule) {
  if (rule.noPointer) return { furniture: false, why: "pointer-events: none" };
  if (rule.insetZero) return { furniture: false, why: "covers the viewport" };
  return { furniture: true, why: "" };
}

// --------------------------------------------------------------------------
// THE ONE DECLARED TABLE: which screen each piece of furniture belongs to.
// This is a judgement a text scan cannot make, so it is declared — and section
// 2 then VERIFIES each row against the file it names, so a row cannot rot
// quietly. Furniture with no row here fails by name.
// --------------------------------------------------------------------------
// A ROW THAT READS "none" IS TWO VERY DIFFERENT GAPS AND THE DIFFERENCE IS THE
// ACTIONABLE PART. `keyboard-walk.mjs` is a GENERIC hit-test: it focuses every
// control on the six screens it reaches through the tab bar's own buttons and
// asks `elementFromPoint` whether the focused thing is really on top, so it
// would catch a control under ANY fixed thing that was on screen at the time —
// without ever naming that bar. Section 3 stays strict and text-provable, and
// this field carries the nuance into the report instead of into the verdict.
//
// Declared, printed, and asserted only to be one of these three. 9.11e's entry
// carries what each row needs, in words, because `scripts/` is frozen.
const REACH = {
  walked: "keyboard-walk reaches this screen — generic hit-test, but only furniture on screen at the time",
  "walked-not-in-this-state": "keyboard-walk reaches this screen but never in the state that draws this",
  unvisited: "NO hit-testing check visits this screen at all",
};

const SCREEN = {
  ".bk-bar": { screen: "the public booking page", jsx: "app/src/book/BookingPage.jsx", cls: "bk-bar" , reach: "walked" },
  ".tabbar": { screen: "the dashboard shell, every /app screen at phone width", jsx: "app/src/App.jsx", cls: "tabbar" , reach: "walked" },
  ".topbar": { screen: "the dashboard shell, every /app screen", jsx: "app/src/App.jsx", cls: "topbar" , reach: "walked" },
  ".impbar": { screen: "the dashboard shell while an admin is impersonating", jsx: "app/src/App.jsx", cls: "impbar" , reach: "walked-not-in-this-state" },
  ".jobbar": { screen: "the job record at /job/:id", jsx: "app/src/components/BookingDetail.jsx", cls: "jobbar" , reach: "walked" },
  ".pa-top": { screen: "the back office at /admin", jsx: "app/src/admin/AdminPage.jsx", cls: "pa-top" , reach: "unvisited" },
  ".pa-x": { screen: "the back office, a panel's own close control", jsx: "app/src/admin/AdminPage.jsx", cls: "pa-x" , reach: "unvisited" },
  ".pa-load": { screen: "the back office — a 3px progress strip pinned over the top edge, and it OUTRANKS the bar below it at z-index 50 against 30", jsx: "app/src/admin/AdminPage.jsx", cls: "pa-load" , reach: "unvisited" },
  ".split > .col-2": { screen: "Today, Calendar, Money and every settings host — the second column", jsx: "app/src/components/SettingsHost.jsx", cls: "col-2" , reach: "walked" },
  ".intake:has(> .livesite) > .livesite": { screen: "the site intake screen's live preview", jsx: "app/src/screens/SiteIntake.jsx", cls: "livesite" , reach: "unvisited" },
  ".ld .nav": { screen: "every marketing page — landing, pricing, legal", jsx: "app/src/landing/LandingPage.jsx", cls: "nav" , reach: "unvisited" },
  ".ld .navmenu.on": { screen: "every marketing page, with the menu open", jsx: "app/src/landing/LandingPage.jsx", cls: "navmenu" , reach: "unvisited" },
  ".ld .stage": { screen: "the landing page's pinned scroll stage", jsx: "app/src/landing/LandingPage.jsx", cls: "stage" , reach: "unvisited" },
};

/** Which of the four hit-testers name this selector. Production code. */
export function coveredBy(sel, texts) {
  const needle = sel.split(/[\s>]+/).pop();   // `.split > .col-2` is probed as `.col-2`
  return HIT_TESTERS.filter((s) => {
    const t = texts.get(s) || "";
    return new RegExp(`\\${needle}\\b`).test(t);
  }).map((s) => s.replace("scripts/", ""));
}

// --------------------------------------------------------------------------
// THE DECLARED DEBT. Equality, not a ceiling. Each row says what the screen
// needs, because `scripts/` is frozen for this session and 9.11e's entry
// carries the same list in words.
// --------------------------------------------------------------------------
const NO_HIT_TEST = [
  ".impbar",
  ".intake:has(> .livesite) > .livesite",
  ".ld .nav",
  ".ld .navmenu.on",
  ".ld .stage",
  ".split > .col-2",
  ".topbar",
];
// 8 -> 7 on 2026-10-10 (ROADMAP 9.15a): `.tourcard` left with the tour itself —
// its CSS and the tour's component were deleted in the same edit, so it was retired
// rather than covered.
// 11 -> 8 on 2026-10-07: `.pa-top`, `.pa-x` and `.pa-load` came off in the same
// edit as the check that covers them, which is what the equality above is for.
// **The marketing surface is now the whole of the unvisited half**, and the
// three that left were the other half of it.

// DISCOVERY FLOORS, and they stay floors: more rules than expected is the repo
// growing, not a fault (`docs/gotchas.md` 98). They exist so a parser that has
// stopped matching fails instead of reading as all-clear.
const RULE_FLOOR = 20;
const FURNITURE_FLOOR = 10;

// --------------------------------------------------------------------------
// the run
// --------------------------------------------------------------------------
const SCRIPT_TEXT = new Map(HIT_TESTERS.map((s) => {
  let t = read(s);
  if (BREAK === "uncover" && s.endsWith("bk-bar-clearance.mjs")) t = t.replace(/bk-bar/g, "xx-xxx");
  return [s, t];
}));

const RULES = CSS.flatMap((f) => {
  let text = read(f);
  if (BREAK === "new-furniture" && f.endsWith("theme.css")) {
    text += "\n.sabotage-strip { position: fixed; bottom: 0; left: 0; right: 0; z-index: 41; }\n";
  }
  return rulesFrom(text, f);
});

const FURNITURE = RULES.filter((r) => classify(r).furniture);
const EXCLUDED = RULES.filter((r) => !classify(r).furniture);

// one row per distinct selector, keeping every place it is declared
const bySel = new Map();
for (const r of FURNITURE) {
  const row = bySel.get(r.sel) || { sel: r.sel, kind: r.kind, at: [] };
  row.at.push(`${r.file.replace("app/src/", "")}:${r.line}`);
  bySel.set(r.sel, row);
}
for (const row of bySel.values()) {
  row.screen = SCREEN[row.sel] || null;
  row.checks = coveredBy(row.sel, SCRIPT_TEXT);
}
const SELECTORS = [...bySel.values()].sort((a, b) => a.sel.localeCompare(b.sel));
const uncovered = SELECTORS.filter((r) => r.checks.length === 0).map((r) => r.sel).sort();
const unscreened = SELECTORS.filter((r) => !r.screen).map((r) => r.sel).sort();

test("0 — the check has subjects, and the CSS scan is still matching", () => {
  assert.ok(RULES.length >= RULE_FLOOR,
    `only ${RULES.length} fixed/sticky rules found across ${CSS.length} stylesheets, floor ${RULE_FLOOR} `
    + "— the rule parser has stopped matching and every verdict below is vacuous");
  assert.ok(FURNITURE.length >= FURNITURE_FLOOR,
    `only ${FURNITURE.length} of those are furniture, floor ${FURNITURE_FLOOR} — the exclusion rule is `
    + "swallowing real furniture");
  for (const s of HIT_TESTERS) {
    assert.match(SCRIPT_TEXT.get(s), /elementFromPoint/,
      `${s} does not call elementFromPoint, so it is not a hit-test and must not be counted as `
      + "coverage. Naming a bar is not probing it");
  }
  console.log(`     ${RULES.length} fixed/sticky rules · ${FURNITURE.length} furniture · `
    + `${EXCLUDED.length} excluded · ${SELECTORS.length} distinct furniture selectors`);
});

test("1 — every excluded rule is excluded by a STATED reason, never dropped", () => {
  for (const r of EXCLUDED) {
    const why = classify(r).why;
    assert.ok(EXCLUSIONS[why], `${r.sel} is excluded for "${why}", which is not one of the two declared reasons`);
  }
  console.log("     EXCLUDED, and why — printed so none of these is mistaken for a covered surface:");
  for (const r of EXCLUDED) {
    console.log(`       ${r.sel.slice(0, 54).padEnd(54)} ${classify(r).why}  (${r.file.replace("app/src/", "")}:${r.line})`);
  }
});

test("2 — every piece of furniture names a screen, and the screen names it back", () => {
  if (unscreened.length) {
    const lines = unscreened.map((s) => `    ${s}  —  ${bySel.get(s).at.join(", ")}`).join("\n");
    assert.fail(`${unscreened.length} piece(s) of fixed furniture belong to no declared screen, so nobody `
      + `can say which check owes them a hit-test. Add a row to SCREEN:\n${lines}`);
  }
  for (const row of SELECTORS) {
    const { jsx, cls, reach } = row.screen;
    assert.ok(REACH[reach], `${row.sel} declares reach "${reach}", which is not one of the three`);
    assert.match(read(jsx), new RegExp(`\\b${cls}\\b`),
      `SCREEN says ${row.sel} is rendered by ${jsx} and the class "${cls}" is not in that file — the `
      + "declared table has rotted, which is the fault a declared table is most prone to");
  }
});

test("3 — furniture with no hit-test is exactly the declared set", () => {
  assert.deepEqual(uncovered, [...NO_HIT_TEST].sort(),
    "the set of fixed furniture that NO hit-testing check probes has changed. **Declared by name rather "
    + "than counted**, and an equality rather than a ceiling, because this is a statement of how much "
    + "debt exists (`docs/gotchas.md` 98). One ARRIVING is the finding: a sticky header or a pinned bar "
    + "was written and nothing anywhere asks whether a control comes to rest under it. One LEAVING is "
    + "ordinary progress — take it out of NO_HIT_TEST in the same edit as the hit-test that covers it. "
    + "ROADMAP 9.11e carries what each of these needs, in words.");
});

test("4 — REPORT: every screen with fixed furniture, and the check that hit-tests it", () => {
  console.log("\n     SCREEN · FURNITURE · HIT-TESTED BY");
  for (const row of SELECTORS) {
    const checks = row.checks.length ? row.checks.join(", ") : "none";
    console.log(`       ${row.sel.slice(0, 38).padEnd(38)} ${row.kind.padEnd(6)} ${checks}`);
    // The report must survive an undeclared row: section 2 is already failing by
    // name at that point, and a table that crashes exactly when there is a
    // finding is the worst possible moment to lose it.
    console.log(`         ${row.screen ? row.screen.screen : "NO DECLARED SCREEN — section 2 names this"}`);
    if (!row.checks.length && row.screen) console.log(`         ${REACH[row.screen.reach]}`);
    console.log(`         ${row.at.join(", ")}`);
  }
  console.log(`\n     ${SELECTORS.length - uncovered.length} of ${SELECTORS.length} hit-tested; `
    + `${uncovered.length} declared with no hit-test, named above as "none"`);
  const unvisited = SELECTORS.filter((r) => !r.checks.length && r.screen?.reach === "unvisited");
  console.log(`     Of those ${uncovered.length}, ${unvisited.length} are on screens NO hit-testing check `
    + `visits at all: ${unvisited.map((r) => r.sel).join(", ")}`);
  console.log("     Coverage here means A CHECK EXISTS THAT WOULD ASK — never that it asked today.");
  assert.ok(true);
});

test("5 — the canary bites, through the same two functions the run used", () => {
  if (!CANARY_ON) {
    assert.fail("FURNITURE_CANARY=off — the sabotage is disabled, so this run proves nothing about "
      + "whether sections 2 and 3 can fail at all");
  }
  const synthetic = rulesFrom(".sabotage-bar { position: fixed; bottom: 0; z-index: 99; }", "canary.css");
  assert.equal(synthetic.length, 1, "rulesFrom() no longer finds a plain fixed rule — the CSS scan is dead");
  assert.equal(classify(synthetic[0]).furniture, true,
    "classify() does not call a plain fixed bar furniture — the exclusion rule has widened and real "
    + "furniture is being dropped");
  assert.equal(SCREEN[synthetic[0].sel], undefined, "the canary selector must own no SCREEN row");
  assert.deepEqual(coveredBy(synthetic[0].sel, SCRIPT_TEXT), [],
    "coveredBy() claims a hit-test for a selector no script has ever heard of");
  // and the exclusion rule still excludes, so section 1 is not vacuous either
  assert.equal(classify(rulesFrom(".x { position: fixed; pointer-events: none; }", "c")[0]).furniture, false,
    "classify() no longer excludes a pointer-events: none layer, so section 2 would demand a hit-test "
    + "for a scrim that cannot take a press");
  console.log("     canary on: a synthetic fixed bar reads as furniture, with no screen and no check");
});
