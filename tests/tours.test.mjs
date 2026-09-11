// Every tab has a guide, and no guide leaves the tab it is about.
//
// **HIS TWO BUGS, audit items 1.3 and 1.4, and they had one shape between
// them: a guide that went somewhere else, and guides you could not get back.**
//
//   1.3 *"For some reason the today guide goes to the business page. The today
//        guide should only do guides on the today page."*
//   1.4 *"It instantly ends after the first one, and then when I click on
//        Calendar, Money, Clients and Business, I can't view the guides
//        through all of them."*
//
// What he pressed was *Show me around*, which always ran the SHELL tour — the
// one that introduces the rail, and whose last steps are about the booking
// link and therefore live on Business. The shell tour is not wrong; it is just
// not what "show me around" means once you are standing on a screen.
//
//   node tests/tours.test.mjs
//
// Credential-free, no browser, no dev server.

import { readFileSync } from "node:fs";

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

const walk = read("app/src/components/Walkthrough.jsx");
const app = read("app/src/App.jsx");

// the five tab keys the rail actually renders
const TABS = ["today", "calendar", "money", "clients", "business"];
const tourBlock = walk.slice(walk.indexOf("export const TOURS"), walk.indexOf("export const MIN_STEPS"));

/* ── 1 · every tab has one ──────────────────────────────────────────────── */
console.log("\n1: every tab has a guide");

const defined = TABS.filter((t) => tourBlock.includes(`\n  ${t}: [`));
check("all five tabs have a guide", defined.length === TABS.length,
  `missing: ${TABS.filter((t) => !defined.includes(t)).join(", ") || "none"} `
  + "— Calendar had none at all until 2026-09-10, so its guide was not short, it did not exist");

/* ── 2 · and none of them leaves its own tab ────────────────────────────── */
console.log("\n2: a tab guide stays on its tab");

// A step is [target, words] or [target, words, TAB]. **A third element is an
// instruction to MOVE**, and only the shell tour may have one — it is the tour
// whose subject IS the rail. Any tab guide with a third element is bug 1.3.
for (const t of defined) {
  const from = tourBlock.indexOf(`\n  ${t}: [`);
  const body = tourBlock.slice(from, tourBlock.indexOf("\n  ],", from));
  const moves = [...body.matchAll(/\[\s*"[^"]+",\s*"[^"]*",\s*"([a-z]+)"\s*\]/g)].map((m) => m[1]);
  check(`the ${t} guide never changes tab`, moves.length === 0, `it moves to: ${moves.join(", ")}`);
}
check("the shell guide is still allowed to move",
  tourBlock.includes('"business"]'),
  "the shell tour introduces the rail; moving is the whole point of it");

/* ── 3 · Show me around runs the whole dashboard ────────────────────────── */
console.log("\n3: Show me around");

// **IT RAN THE GUIDE FOR THE TAB YOU WERE STANDING ON FOR ONE DAY, and this
// check asserted exactly that.** His ruling the next morning: *"I want it so
// when you press the settings, it restarts the tour from the beginning, from
// the today page... It should do it for every single tab."* Yesterday's
// version was right about the wandering (bug 1.3, the shell tour walking off
// to Business) and wrong about the scope: one press is a tour of the PRODUCT.
check("it starts the whole-dashboard tour, wherever it was pressed",
  /setTabTour\("everything"\)/.test(app),
  'it ran setTabTour(activeTab.key) until 2026-09-10, so four tabs out of five '
  + "were never reached from the gear at all");

// AND THAT TOUR IS EVERY TAB, IN THE RAIL'S ORDER. A block list that has
// drifted out of order makes "next" mean something different halfway down.
const grand = (walk.match(/export const GRAND = \[([^\]]*)\]/) ?? [])[1] ?? "";
const order = [...grand.matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
check("the whole-dashboard tour is all five tabs in rail order",
  order.join(",") === TABS.join(","), `it is: ${order.join(", ") || "missing"}`);
check("and every block it names has a guide to run",
  order.every((k) => tourBlock.includes(`\n  ${k}: [`)),
  `no guide for: ${order.filter((k) => !tourBlock.includes(`\n  ${k}: [`)).join(", ")}`);
// The blocks are what move tabs, so the component has to be given the way to
// do it — without `onGo` the tour runs Today's guide five times over.
check("the tour is handed the way to change tab",
  /tour=\{tabTour\}[\s\S]{0,700}?onGo=\{/.test(app),
  "a block change calls onGo, and a tab guide's own steps never do");

// **REPLAYABLE IS THE OTHER HALF OF 1.4.** The guides fired once, the first
// time a browser opened each tab, and never again — so a detailer who tapped
// past one had lost it permanently. Nothing about `tabTour` may consult
// `tourSeen` on the way IN; it is written only on the way out.
const at = app.indexOf("{!firstRun && tabTour &&");
check("a requested guide is not gated on having never seen it",
  at > -1 && !app.slice(at, at + 700).includes("tourSeen("),
  "a guide you asked for must run whether or not you have seen it");

// AND IT MUST NOT VANISH IN SILENCE. Decision 6 drops a guide with fewer than
// two targets, which is right when it arrived by itself and reads as a dead
// button when somebody pressed for it.
check("a guide asked for by hand falls back rather than doing nothing",
  app.includes("asked.current") && app.includes('setFirstRun("tour")'),
  "onEmpty has to tell an automatic guide from a requested one");

/* ── 4 · no guide points at nothing ─────────────────────────────────────── */
console.log("\n4: every step names a target that exists");

// **THE CALENDAR GUIDE SHIPPED POINTING AT THE MONTH TOTAL, which lives in the
// side column and is not on screen in month view at all** — so it planned one
// step, fell below the two-step floor and silently handed over to the shell
// tour. That is invisible from the source and this is what would have caught
// it: a target nothing in the product carries.
const screens = [
  "app/src/screens/Today.jsx", "app/src/screens/Calendar.jsx", "app/src/screens/Money.jsx",
  "app/src/screens/Clients.jsx", "app/src/screens/Business.jsx", "app/src/App.jsx",
  // A target may live in a COMPONENT a screen renders rather than in the screen
  // file itself — the booking link is its own component, and leaving it out of
  // this list made a real target look missing.
  "app/src/components/BookingLink.jsx", "app/src/components/DaySheet.jsx",
].map((f) => { try { return readFileSync(f, "utf8"); } catch { return ""; } }).join("\n");

// **AND THE MATCHER HAD TO BE TIGHTENED, because three of the four names added
// on 2026-09-10 passed WITHOUT A TARGET ANYWHERE.** It accepted a bare
// `? "hours"` from anywhere in any screen file, and `Business.jsx` happens to
// carry `(counts.hoursRows ?? []).every(...) ? "hours"` — an unrelated ternary
// working out which setting is blocking the booking page. Two of the three
// would have shipped pointing at nothing. A quoted name now only counts when
// it is INSIDE a `data-tour` expression.
const targets = [...new Set([...tourBlock.matchAll(/\[\s*"([a-z]+)",\s*"/g)].map((m) => m[1]))];
// Business marks five of its twelve settings rows from one map rather than
// five literal attributes — the rows are rendered by one `.map()`, so there is
// no element to write an attribute on. The map's own entry is the declaration.
const mapped = new RegExp(`data-tour=\\{TOUR_ROWS\\[key\\]\\}`).test(screens);
// The rail's five buttons are one `.map()` too, keyed on the tab's own name —
// which is what lets the shell tour point at "business" and at nothing else
// called that anywhere in the app.
const rail = screens.includes("data-tour={x.key}");
const missing = targets.filter((t) =>
  !new RegExp(`data-tour=(?:"${t}"|\\{[^}]*"${t}")`).test(screens)
  && !(mapped && new RegExp(`\\n  ${t}: "${t}",`).test(screens))
  && !(rail && TABS.includes(t)));
check("every target a guide names is carried by a screen",
  missing.length === 0, `no data-tour for: ${missing.join(", ")}`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
