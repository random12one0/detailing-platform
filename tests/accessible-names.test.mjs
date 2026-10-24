// The accessible-name verdict behind scripts/accessible-names.mjs (14.24 part 3).
//
// The browser check reads each focused control's computed accessible name and
// passes it through controlNameVerdict; these are the same function called with
// the must-work and must-refuse values, so a verdict the check relies on is
// proved here and a change that breaks the rule breaks this suite first.
// The walk itself runs here too, against scripted stand-ins for a Playwright
// page: no browser launches in this file (a suite that launches one is refused),
// the stand-ins only advance a scripted focus while the real readControl and
// tabWalk decide what each stop means.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  controlNameOk,
  controlNameVerdict,
  parseSnapshotLine,
  resolveBase,
} from "../scripts/lib/accessibleName.mjs";
import { readControl, tabWalk } from "../scripts/accessible-names.mjs";

test("a name that contains the visible words passes", () => {
  assert.equal(controlNameOk("15", "15"), true); // a date cell: bare number
  assert.equal(controlNameOk("9 AM", "9 AM"), true); // a slot chip
  assert.equal(controlNameOk("Continue", "Continue"), true); // the bar button
  assert.equal(controlNameOk("Text", "Text"), true); // the job bar button
});

test("an icon-only control passes on its label alone", () => {
  assert.equal(controlNameOk("Previous month", ""), true);
  assert.equal(controlNameOk("Back a step", ""), true);
});

test("an empty or whitespace-only name is refused", () => {
  assert.equal(controlNameOk("", "15"), false);
  assert.equal(controlNameOk("   ", "15"), false);
  assert.deepEqual(controlNameVerdict("", "15"), { ok: false, reason: "empty-name" });
});

test("a name of only the role is refused, whatever the case", () => {
  assert.equal(controlNameOk("button", "Continue"), false);
  assert.equal(controlNameOk("Button", "Continue"), false);
  assert.deepEqual(controlNameVerdict("button", "Continue"), { ok: false, reason: "button-only" });
});

test("a name that misses the visible words is refused", () => {
  assert.equal(controlNameOk("10:00 AM", "Choose this"), false);
  assert.deepEqual(controlNameVerdict("10:00 AM", "Choose this"), { ok: false, reason: "name-misses-visible" });
  assert.equal(controlNameOk("9 AM", "9:05 AM"), false); // the minutes matter
});

test("words match whole, so a digit inside another number is refused", () => {
  // The first rule was a substring match and passed both of these (review 2026-10-24).
  assert.deepEqual(controlNameVerdict("Monday, October 13", "3"), { ok: false, reason: "name-misses-visible" });
  assert.equal(controlNameOk("October 10", "1"), false);
  assert.equal(controlNameOk("Monday, October 26", "26"), true); // punctuation is not part of a word
  assert.equal(controlNameOk("Texts", "Text"), false); // four letters is not an abbreviation
});

test("a two- or three-letter code matches the start of a word, and says so", () => {
  assert.deepEqual(controlNameVerdict("English", "EN"), { ok: true, abbreviations: ["en"] });
  assert.deepEqual(controlNameVerdict("Español", "ES"), { ok: true, abbreviations: ["es"] });
  assert.deepEqual(controlNameVerdict("Text", "Text"), { ok: true }); // a whole-word match carries no flag
  assert.equal(controlNameOk("Deutsch", "EN"), false);
});

test("a stripped control — the sabotage shape — fails as empty", () => {
  // --break=strip-date empties a day cell's text and aria-label; --break=strip-bar
  // empties the Text button. The victim the check must name is found by exactly
  // this predicate, so the predicate failing here is what makes the sabotage land.
  assert.equal(controlNameOk("", ""), false);
  assert.deepEqual(controlNameVerdict("", ""), { ok: false, reason: "empty-name" });
});

test("server address precedence is flag, then env, then default", () => {
  assert.equal(resolveBase(["--base=http://flag"], { BASE: "http://env" }), "http://flag");
  assert.equal(resolveBase(["--break=strip-date"], { BASE: "http://env" }), "http://env");
  assert.equal(resolveBase([], {}), "http://localhost:5173");
});

test("snapshot lines parse to role and name, or null without one", () => {
  assert.deepEqual(parseSnapshotLine('- button "Call":'), { role: "button", name: "Call" });
  assert.deepEqual(parseSnapshotLine('- link "Call":\n  - /url: tel:1'), { role: "link", name: "Call" });
  assert.deepEqual(parseSnapshotLine('- button "Say \\"hi\\"":'), { role: "button", name: 'Say "hi"' });
  assert.equal(parseSnapshotLine("  - text: hi"), null);
  assert.equal(parseSnapshotLine(""), null);
});

// A scripted stand-in for a Playwright page: each Tab press advances the focus
// script; evaluate serves the descriptor or the stayIn check. The stand-in never
// decides anything — readControl and tabWalk do.
function fakePage(stops) {
  let i = -1;
  let active = null;
  return {
    keyboard: { press: async () => { i += 1; active = stops[Math.min(i, stops.length - 1)] ?? null; } },
    waitForTimeout: async () => {},
    evaluate: async (fn, sel) => {
      if (sel !== undefined) return !!active && active.inside === true;
      if (typeof fn !== "function" || !active) return null;
      return active.desc;
    },
    locator: () => ({
      ariaSnapshot: async () => {
        if (!active) throw new Error("waiting for locator(':focus')");
        if (active.throwSnap) throw new Error("snapshot boom");
        return active.snap;
      },
    }),
  };
}

test("readControl returns the browser-computed role and name", async () => {
  const page = fakePage([{ desc: { tag: "a", cls: "", text: "Call", aria: null }, snap: '- link "Call":' }]);
  await page.keyboard.press("Tab");
  const c = await readControl(page);
  assert.equal(c.role, "link");
  assert.equal(c.name, "Call");
  assert.equal(c.snapError, null);
});

test("readControl reports when the name-checking call is gone", async () => {
  const page = fakePage([{ desc: { tag: "button", cls: "", text: "Text", aria: null }, throwSnap: true }]);
  await page.keyboard.press("Tab");
  const c = await readControl(page);
  assert.ok(c.snapError, "a removed ariaSnapshot call must surface as a snapshot failure, not a silent empty name");
});

test("readControl is null when nothing is focused", async () => {
  const page = fakePage([]);
  await page.keyboard.press("Tab");
  assert.equal(await readControl(page), null);
});

test("the walk reaches the bar despite preceding links", async () => {
  const link = (text) => ({ desc: { tag: "a", cls: "", text, aria: null }, snap: `- link "${text}":`, inside: false });
  const btn = (text) => ({ desc: { tag: "button", cls: "", text, aria: null }, snap: `- button "${text}":`, inside: true });
  const page = fakePage([link("A"), link("B"), btn("Call"), btn("Text"), btn("Calendar"), btn("Reminder")]);
  const { controls, entered } = await tabWalk(page, { cap: 30, stayIn: ".jobbar" });
  assert.equal(entered, true);
  const names = controls.map((c) => c.name);
  for (const want of ["Call", "Text", "Calendar", "Reminder"]) {
    assert.ok(names.includes(want), "bar control reached: " + want);
  }
});

test("a walk that never enters the bar says so", async () => {
  const link = (text) => ({ desc: { tag: "a", cls: "", text, aria: null }, snap: `- link "${text}":`, inside: false });
  const page = fakePage([link("A"), link("B")]);
  const { entered, controls } = await tabWalk(page, { cap: 8, stayIn: ".jobbar" });
  assert.equal(entered, false);
  assert.equal(controls.length, 0);
});

test("the walk stops on a trapped focus instead of circling for ever", async () => {
  const btn = (text) => ({ desc: { tag: "button", cls: "", text, aria: null }, snap: `- button "${text}":`, inside: true });
  const page = fakePage([btn("Call")]);
  const { controls, visits } = await tabWalk(page, { cap: 400, stayIn: ".jobbar" });
  assert.equal(controls.length, 1);
  assert.ok(visits < 400, "the cycle detector, not the cap, ends a trapped walk");
});
