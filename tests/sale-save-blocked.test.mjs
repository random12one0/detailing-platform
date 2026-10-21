// ROADMAP 101.8 — a site-wide sale saved as running at 0% off tells customers
// "Every booking is 0% cheaper right now" while giving nothing.
//
// The rule lives in `app/src/lib/sale.js` and the Promos screen uses it to
// disable Save sale; this file proves the rule itself. Run it BEFORE the fix
// (module missing) and it fails; run it after and it passes.
//
//   node --test tests/sale-save-blocked.test.mjs   (credential-free)

import { test } from "node:test";
import assert from "node:assert/strict";
import { saleSaveBlocked, saleSaveDisabled } from "../app/src/lib/sale.js";

test("101.8 refusal: a running sale at 0% cannot be saved", () => {
  assert.equal(saleSaveBlocked({ active: true, percent: "0" }), true);
  assert.equal(saleSaveBlocked({ active: true, percent: 0 }), true);
  assert.equal(saleSaveBlocked({ active: true, percent: "" }), true);
});

test("101.8 must-work: a running sale with a real percentage can be saved", () => {
  assert.equal(saleSaveBlocked({ active: true, percent: "10" }), false);
  assert.equal(saleSaveBlocked({ active: true, percent: 10 }), false);
});

test("101.8 must-work: a switched-off sale can always be saved", () => {
  assert.equal(saleSaveBlocked({ active: false, percent: "0" }), false);
  assert.equal(saleSaveBlocked({ active: false, percent: 0 }), false);
});

test("101.8 self-review 1: while a save is in flight the button stays off", () => {
  // Second press refused even for a good sale, and the 0% refusal holds too.
  assert.equal(saleSaveDisabled({ active: true, percent: "10" }, true), true);
  assert.equal(saleSaveDisabled({ active: true, percent: "0" }, true), true);
  // Nothing pending: exactly the blocked rule.
  assert.equal(saleSaveDisabled({ active: true, percent: "10" }, false), false);
  assert.equal(saleSaveDisabled({ active: true, percent: "0" }, false), true);
  assert.equal(saleSaveDisabled({ active: false, percent: "0" }, false), false);
});
