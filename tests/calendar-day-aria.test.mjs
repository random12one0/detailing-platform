// 97.46 - calendar days announce their full date, and closed days are
// marked unavailable. Runs the rule itself (app/src/lib/dayAria.js), the
// same functions StepWhen.jsx calls for every cell. The rendered grid is
// proved by the belt's page check; keyboard selection by keyboard-walk.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dayAriaDisabled, dayAriaLabel } from "../app/src/lib/dayAria.js";

test("an open day is named with its full date in English", () => {
  assert.equal(dayAriaLabel("2026-10-17", "en-US"), "Saturday, October 17");
});

test("the label is never the bare number", () => {
  assert.notEqual(dayAriaLabel("2026-10-17", "en-US"), "17");
});

test("the same day is named in the page's Spanish", () => {
  const label = dayAriaLabel("2026-10-17", "es-US");
  assert.match(label, /s.bado/i);
  assert.match(label, /octubre/i);
});

test("a closed day is marked disabled", () => {
  assert.equal(dayAriaDisabled(false), true);
});

test("an open day carries no disabled marker", () => {
  assert.equal(dayAriaDisabled(true), undefined);
});
