// STUDIO S6 — the style families (app/src/site/families.js) are four whole looks the renderer can draw, far apart on
// every axis the Studio's distinctness check compares, and each one is a valid spec on the Brightline example.
//   node --test tests/site-families.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FAMILIES } from "../app/src/site/families.js";
import { FONTS, FAMILY_KEYS, SECTION_TYPES, validateSpec } from "../app/src/site/spec.js";

const base = JSON.parse(readFileSync(new URL("../app/src/site/specs/brightline.json", import.meta.url), "utf8"));
const css = readFileSync(new URL("../app/src/site/families.css", import.meta.url), "utf8");

test("four families, each a valid spec with its own fonts, hero layout and section order", () => {
  assert.deepEqual(Object.keys(FAMILIES).sort(), [...FAMILY_KEYS].sort());
  const fams = Object.entries(FAMILIES);
  for (const [key, f] of fams) {
    assert.equal(f.tokens.family, key);
    for (const font of f.fonts) assert.ok(Object.hasOwn(FONTS, font), `${key}: ${font} is a curated font`);
    assert.deepEqual(f.fonts, [f.tokens.font_display, f.tokens.font_body]);
    assert.ok(SECTION_TYPES.hero.variants.includes(f.hero));
    assert.equal(f.order[0], "hero"); assert.equal(f.order[1], "proof", "the work comes second in every family");
    assert.deepEqual([...f.order].sort(), ["booking", "catalog", "hero", "proof", "visit"]);
    assert.match(css, new RegExp(`\\.site\\[data-family="${key}"\\]`), `${key} has its own CSS`);
    const secs = base.pages[0].sections;
    const spec = { ...base, tokens: { ...f.tokens }, pages: [{ path: "/", sections: f.order.map((t) => ({ ...secs.find((s) => s.type === t), ...(t === "hero" ? { variant: f.hero } : {}) })) }] };
    const v = validateSpec(spec);
    assert.ok(v.ok, `${key}: ${JSON.stringify(v.errors)}`);
  }
  // no two share a hero layout, a type pairing, or an order
  for (const pick of [(f) => f.hero, (f) => f.fonts.join("+"), (f) => f.order.join(">")]) assert.equal(new Set(fams.map(([, f]) => pick(f))).size, fams.length);
  // an unknown family is refused
  assert.equal(validateSpec({ ...base, tokens: { ...base.tokens, family: "sparkle" } }).ok, false);
});
