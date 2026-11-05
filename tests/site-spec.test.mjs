// STUDIO S1 — the site spec refuses typed facts, unknown bindings and missing ids.
// Credential-free, no network: `node --test tests/site-spec.test.mjs`.
// The browser half (live profile, rendered stamps, booking) is
// scripts/studio/s1-check.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeProfile } from "../app/src/book/core.js";
import { parseBinding, resolve, validateSpec, bindingsOf } from "../app/src/site/spec.js";

const spec = JSON.parse(readFileSync(new URL("../app/src/site/specs/brightline.json", import.meta.url)));
const id = (n) => `00000000-0000-4000-8000-000000000${n}`;
// The Brightline ids the spec binds to, in the profile's own shape.
const profile = normalizeProfile({
  business: { slug: "brightline", name: "Brightline Auto Care", phone: "562-555-0100", service_area: "Long Beach" },
  settings: { site_discount_active: true, site_discount_percent: 10, faq_enabled: true, faqs: [{ q: "Q?", a: "A." }] },
  service_groups: [{ id: id(201), name: "Care packages" }],
  services: [{ id: id(301), name: "Hand wash", price: 95, group_id: id(201) }, { id: id(302), name: "Interior reset", price: 185, group_id: id(201) }],
  gallery: [{ id: id(801), kind: "before_after", before_url: "/a", after_url: "/b" }, { id: id(803), kind: "single", image_url: "/c" }, { id: id(804), kind: "single", image_url: "/d" }],
  testimonials: [{ id: id(701), quote: "Sample review" }],
  hours: [{ weekday: 1, open_time: "09:00", close_time: "17:00" }],
});
const clone = () => structuredClone(spec);
const hero = (s) => s.pages[0].sections.find((x) => x.type === "hero");
const codes = (r) => r.errors.map((e) => e.code);

test("the committed Brightline spec is valid against a Brightline-shaped profile", () => {
  const r = validateSpec(spec, profile);
  assert.deepEqual(r.errors, []);
  assert.ok(bindingsOf(spec).length >= 10, "the spec binds its facts");
});

test('"$185" typed into a headline is refused', () => {
  const s = clone(); hero(s).copy.headline = "Interior reset, only $185";
  const r = validateSpec(s, profile);
  assert.equal(r.ok, false);
  assert.deepEqual(codes(r), ["typed_fact"]);
  assert.match(r.errors[0].path, /copy\.headline$/);
});

test("any digit, currency sign or percent in prose is refused", () => {
  for (const text of ["Open 7 days", "10% off this week", "From £90", "Since 2019"]) {
    const s = clone(); hero(s).copy.sub = text;
    assert.deepEqual(codes(validateSpec(s, profile)), ["typed_fact"], text);
  }
});

test("an unknown binding shape is refused", () => {
  for (const bind of ["price:302", "service_group", "gallery.best(0)", "reviews.top(n)", "hours.week + 1", "service:302.price"]) {
    const s = clone(); hero(s).photo = { bind };
    assert.deepEqual(codes(validateSpec(s, profile)), ["unknown_binding"], bind);
  }
});

test("a binding to an id the dashboard lacks is refused", () => {
  const s = clone(); hero(s).prices = { bind: "service_group:00000000-0000-4000-8000-000000000999" };
  hero(s).photo = { bind: "gallery:deleted-photo" };
  assert.deepEqual(codes(validateSpec(s, profile)), ["missing_id", "missing_id"]);
});

test("a spec has nowhere to put a fact: unknown keys are refused", () => {
  const s = clone(); hero(s).price = 185; s.pages[0].sections[1].copy.price_text = "Hand wash";
  s.tokens.font_display = "Comic Sans MS";
  assert.deepEqual(codes(validateSpec(s, profile)).sort(), ["bad_shape", "unknown_key", "unknown_key"]);
});

test("bindings resolve from the profile, never from the spec", () => {
  assert.equal(resolve(`service:${id(302)}.price`, profile).service.price, 185);
  assert.equal(resolve(`service_group:${id(201)}`, profile).items.length, 2);
  assert.deepEqual(resolve("sale", profile), { percent: 10, label: null });
  assert.equal(resolve("gallery.best(2)", profile)[0].kind, "before_after");
  assert.equal(resolve("contact.phone", profile), "562-555-0100");
  assert.equal(resolve("faq", profile).length, 1);
  assert.equal(parseBinding("reviews.top(3)").n, 3);
  assert.equal(parseBinding("nope"), null);
});
