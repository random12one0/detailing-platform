// ROADMAP 2.8 — `address_source` still says which of the two things happened.
//
//   node --test tests/address-source.test.mjs
//
// Credential-free, no dev server, no browser, no Geoapify spend: it reads
// three files as text, the same way `booking-core.test.mjs` enforces that
// `core.js` has no imports and `composition.test.mjs` enforces the control
// rules.
//
// ---------------------------------------------------------------------------
// WHY A STRUCTURAL TEST AND NOT A BROWSER MATRIX
// ---------------------------------------------------------------------------
// On 2026-09-23 all six kinds of address in 2.8's done-when were pressed
// through the real booking page and `address_source` was read off each row:
// `selected` stored **"picked"** and the other five stored **"typed"**.
// **That measurement was true once and nothing would have noticed it stopping
// being true** — which is the fault written up the same evening in the item
// about a rule that lived in a document and died at the next reseed. Leaving
// this measured-once would have been that mistake with the ink still wet.
//
// The mechanism is two lines, so the guard is over those two lines and the
// three-file chain they feed. A browser matrix would cost two Geoapify
// credits and five bookings every run to re-prove arithmetic that a text read
// settles for nothing.
//
// ---------------------------------------------------------------------------
// THE ONE THING IT EXISTS TO CATCH
// ---------------------------------------------------------------------------
// **A column hard-wired to "typed".** Five of the six cases type the address,
// so five-sixths of the evidence is satisfied by a field that never writes
// anything else. `"picked"` is the only value that proves the column reflects
// what the customer did, and it is reachable from exactly one place: the
// handler that runs when a suggestion returned by the lookup is clicked. If
// that line is rewired, every browser check still passes and the flag becomes
// a constant.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
// Comments quote code in this repo — `docs/gotchas.md` #75 is about exactly
// that fooling a count — so every assertion below reads CODE with the
// comments stripped first.
const code = (p) => read(p)
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
  .replace(/^\s*\/\/.*$/gm, "");

const FIELD = "app/src/book/AddressField.jsx";
const STEP = "app/src/book/steps/StepLocation.jsx";
const CORE = "app/src/book/core.js";

test("0 — the check has subjects: all three files were read and carry content", () => {
  for (const p of [FIELD, STEP, CORE]) {
    assert.ok(read(p).length > 800, `${p} is too small to be the real file (${read(p).length} bytes)`);
  }
});

test("1 — the field still writes BOTH values, and picked comes from the suggestion handler", () => {
  const src = code(FIELD);
  // "picked" — the one claim this product can honestly make.
  assert.match(src, /onChange\(\s*row\.label\s*,\s*["']picked["']\s*\)/,
    'nothing in AddressField calls onChange(row.label, "picked") any more — the value a '
    + "customer CHOOSING a suggestion produces is unreachable, and address_source becomes a "
    + "constant that every browser check still passes over");
  // "typed" — every keystroke.
  assert.match(src, /onChange\(\s*e\.target\.value\s*,\s*["']typed["']\s*\)/,
    'nothing calls onChange(e.target.value, "typed") any more');
});

test("2 — and there are exactly two source values, so no third meaning has crept in", () => {
  const src = code(FIELD);
  const values = [...src.matchAll(/onChange\([^)]*?,\s*["']([a-z_]+)["']\s*\)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(values)].sort(), ["picked", "typed"],
    `AddressField writes ${JSON.stringify(values)}; 2.8 rests on there being two, because a `
    + "third value means somewhere downstream is reading a word it has never been told about");
});

test("3 — picked is reachable only from the handler that takes a returned suggestion", () => {
  const src = code(FIELD);
  // `take(row)` is called by the suggestion buttons; nothing else may mint
  // "picked", or the product would be claiming the lookup confirmed an
  // address it never saw.
  const takeBody = src.match(/const take\s*=\s*\([\s\S]*?\n\s*\};/);
  assert.ok(takeBody, "the take() handler is gone or unrecognisable");
  assert.match(takeBody[0], /["']picked["']/, 'take() no longer writes "picked"');
  const outside = src.replace(takeBody[0], "");
  assert.doesNotMatch(outside, /["']picked["']/,
    '"picked" is written somewhere other than take() — the product would be claiming the '
    + "lookup confirmed an address the customer never chose from it");
});

test("4 — the step passes the second argument through rather than dropping it", () => {
  const src = code(STEP);
  assert.match(src, /onChange=\{\s*\(\s*v\s*,\s*source\s*\)\s*=>/,
    "StepLocation's onChange no longer takes the source argument, so however carefully "
    + "AddressField reports it, nothing receives it");
  assert.match(src, /addressSource:\s*source/,
    "the source is received and not stored on the form");
});

test("5 — and the booking sends it to the server", () => {
  const src = code(CORE);
  assert.match(src, /address_source:\s*form\.addressSource/,
    "core.js no longer sends address_source from the form, so the column goes back to null "
    + "and 2.8's whole chain is decorative");
});
