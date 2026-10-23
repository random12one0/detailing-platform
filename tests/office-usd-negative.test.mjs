// 97.34 - the back office's `usd` (app/src/admin/office/ui.jsx) rounded
// -150 cents to -$1 while 150 gave $2: Math.round rounds halves toward +inf.
// ui.jsx imports React, so the one-line formatter is lifted from the source
// and run as written.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../app/src/admin/office/ui.jsx", import.meta.url), "utf8");
const line = src.match(/^export const usd = (.+);$/m);
assert.ok(line, "usd is a one-line export in ui.jsx");
const usd = new Function(`return ${line[1]}`)();

test("negative and positive amounts of the same size print the same digits", () => {
  for (const c of [150, 250, 49, 50, 99, 12345, 123450, 100]) {
    assert.equal(usd(-c).replace(/^−/, ""), usd(c), `${c} cents`);
    if (Math.round(c / 100)) assert.ok(usd(-c).startsWith("−"), `${c} cents keeps its minus`);
  }
});

test("positive amounts print as before", () => {
  assert.equal(usd(150), "$2");
  assert.equal(usd(123456), "$1,235");
  assert.equal(usd(0), "$0");
});

test("an amount that rounds to nothing has no minus", () => {
  assert.equal(usd(-40), "$0");
});
