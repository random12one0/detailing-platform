// ROADMAP 9.15 — the 37-step tours no longer run. Source-text only; the browser half is
// `node scripts/setup-prompts.mjs`, which presses it. A text check cannot prove a tour is
// not on screen, only that nothing in the shell still starts one.
// 9.15a deleted the tour's component, so an import of it now fails the build on its own;
// what this file still guards is the shell's triggers and the tour's own styles.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (f) => readFileSync(f, "utf8");
const app = read("app/src/App.jsx"), gear = read("app/src/components/GearMenu.jsx"), today = read("app/src/screens/Today.jsx");

test("nothing in the shell starts a tour", () => {
  assert.doesNotMatch(app, /setTabTour|tourTimer|"tour"\)/);
  assert.doesNotMatch(gear, /Show me around|onTour|GRAND_STEPS/);
});

test("the tour's spotlight, blocker and caption styles are gone (9.15a)", () => {
  assert.doesNotMatch(read("app/src/theme.css"), /\.(?:tourcard|tourblock|tourline|spotlight)\b/);
});

test("Today's folded notice names the next step and its button goes to it", () => {
  const folded = today.slice(today.indexOf("collapsed ? ("), today.indexOf("toggleCollapsed(false)"));
  assert.match(folded, /Next: \{name\}/);
  assert.match(folded, /onSetup\?\.\(STEPS\.findIndex/);
});
