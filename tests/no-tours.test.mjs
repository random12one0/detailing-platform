// ROADMAP 9.15 — the 37-step tours no longer run. Source-text only; the browser half is
// `node scripts/setup-prompts.mjs`, which presses it. A text check cannot prove a tour is
// not on screen, only that nothing in the shell still starts one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (f) => readFileSync(f, "utf8");
const app = read("app/src/App.jsx"), gear = read("app/src/components/GearMenu.jsx"), today = read("app/src/screens/Today.jsx");

test("nothing in the shell starts a tour", () => {
  assert.doesNotMatch(app, /Walkthrough|setTabTour|tourTimer|"tour"\)/);
  assert.doesNotMatch(gear, /Show me around|onTour|GRAND_STEPS/);
});

test("Today's folded notice names the next step and its button goes to it", () => {
  const folded = today.slice(today.indexOf("collapsed ? ("), today.indexOf("toggleCollapsed(false)"));
  assert.match(folded, /Next: \{name\}/);
  assert.match(folded, /onSetup\?\.\(STEPS\.findIndex/);
});
