// STUDIO S1 — the site spec refuses typed facts, unknown bindings and missing ids.
// Credential-free, no network: `node --test tests/site-spec.test.mjs`.
// The browser half (live profile, rendered stamps, booking) is
// scripts/studio/s1-check.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeProfile } from "../app/src/book/core.js";
import { parseBinding, resolve, validateSpec, bindingsOf, typedFact } from "../app/src/site/spec.js";

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

// ---------------------------------------------------------------- S1 review holes
// Each of these PASSED the validator in d2a88b51 (docs/studio/S1-REVIEW.md §2-3).
const refusedAs = (mutate, code, label) => {
  const s = clone(); mutate(s);
  let r;
  assert.doesNotThrow(() => { r = validateSpec(s, profile); }, label);
  assert.equal(r.ok, false, `${label}: should be refused`);
  assert.ok(codes(r).includes(code), `${label}: expected ${code}, got ${codes(r).join(",")}`);
};

test("digits in any script, other numerals and every currency sign are refused", () => {
  for (const text of ["Interior reset, only １８５", "Only ١٨٥ today", "⑱⑤ off", "Half a ½ price", "Ⅶ days a week", "Pay in ₹", "From ¥ and ₩", "₽ ₱ accepted"]) {
    refusedAs((s) => { hero(s).copy.sub = text; }, "typed_fact", text);
  }
});

test("numbers written as words or Roman numerals are refused", () => {
  for (const text of ["one hundred eighty-five dollars", "Call five six two, five five five", "Open nine to five",
    "Half price wash, free wax", "Open VII days", "Twenty-four hour drop-off", "A five-star finish", "Hundreds of happy cars"]) {
    refusedAs((s) => { hero(s).copy.sub = text; }, "typed_fact", text);
  }
});

test("ordinary words that merely contain a number word still pass (low false alarms)", () => {
  for (const text of ["One-stop care, often done in an afternoon", "Hassle-free and streak-free", "No one rushes your car",
    "Brightline LLC, by weight of good habits", "Care you can see. Prices you can check."]) {
    assert.equal(typedFact(text), null, text);
    const s = clone(); hero(s).copy.sub = text;
    assert.deepEqual(validateSpec(s, profile).errors, [], text);
  }
});

test("inherited object keys cannot pass as tokens, fonts or section types, and never crash", () => {
  refusedAs((s) => { s.tokens.toString = "Call 562-555-0100"; }, "unknown_key", "tokens.toString");
  refusedAs((s) => { s.tokens.constructor = "$185"; }, "unknown_key", "tokens.constructor");
  refusedAs((s) => { s.tokens.font_display = "toString"; }, "bad_shape", "font toString");
  refusedAs((s) => { s.tokens.font_body = "__proto__"; }, "bad_shape", "font __proto__");
  for (const type of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
    refusedAs((s) => { s.pages[0].sections.push({ id: "odd", type }); }, "unknown_type", `type ${type}`);
  }
  refusedAs((s) => { s.pages[0].sections.push(null); }, "bad_shape", "null section");
});

test("digits in a section id or a page path are refused, and only the one page is accepted", () => {
  refusedAs((s) => { s.pages[0].sections[1].id = "only-dollars-185"; }, "bad_shape", "id with digits");
  refusedAs((s) => { s.pages[0].path = "/call-562-555-0100"; }, "bad_shape", "path with digits");
  refusedAs((s) => { s.pages.push({ path: "/about", sections: [] }); }, "bad_shape", "a second page");
});

test("the must-haves: exactly one hero, exactly one booking, and the core tokens", () => {
  refusedAs((s) => { s.pages[0].sections = s.pages[0].sections.filter((x) => x.type !== "booking"); }, "bad_shape", "no booking");
  refusedAs((s) => { s.pages[0].sections.push({ ...s.pages[0].sections.find((x) => x.type === "booking"), id: "book-again" }); }, "bad_shape", "two bookings");
  refusedAs((s) => { s.pages[0].sections.push({ ...hero(s), id: "hero-again" }); }, "bad_shape", "two heroes");
  refusedAs((s) => { s.tokens = {}; }, "bad_shape", "empty tokens");
  refusedAs((s) => { delete s.tokens.accent; }, "bad_shape", "no accent");
});

test("a service group with no active services is missing, the same way the renderer sees it", () => {
  // The group row still exists; every service in it was switched off. resolve() draws nothing, so the save must fail.
  assert.ok(profile.serviceGroups.length === 1);
  assert.ok(codes(validateSpec(spec, { ...profile, services: [] })).includes("missing_id"));
});

test("on a customer's visit (live), a deleted photo drops out; saving still refuses it; services still refuse live", () => {
  const s = clone(); hero(s).photo = { bind: "gallery:deleted-photo" };
  assert.deepEqual(codes(validateSpec(s, profile)), ["missing_id"], "saving a revision refuses a missing photo");
  assert.deepEqual(validateSpec(s, profile, { live: true }).errors, [], "the live page draws without it");
  hero(s).prices = { bind: "service_group:00000000-0000-4000-8000-000000000999" };
  assert.deepEqual(codes(validateSpec(s, profile, { live: true })), ["missing_id"], "a missing service group still refuses live");
});

// S4 review F1: the words are judged as a reader sees them.
test("hidden characters are refused, and look-alike letters and hyphenated counts cannot carry a number past the check", () => {
  for (const text of ["tw\u00ADenty-four hour service", "Done in t\u200Bwenty minutes", "\u202Eecirp", "Clean\u2060 cars", "A car\uFEFF wash"])
    refusedAs((s) => { hero(s).copy.sub = text; }, "hidden_char", JSON.stringify(text));
  for (const text of ["One-hundred-percent clean", "Fiv\u0435 stars", "\u0422wenty minutes", "\uFF34\uFF57\uFF45\uFF4E\uFF54\uFF59 minutes", "Done in \u{1D42D}\u{1D430}\u{1D41E}\u{1D427}\u{1D42D}\u{1D432} minutes", "One-dozen extras"])
    refusedAs((s) => { hero(s).copy.sub = text; }, "typed_fact", JSON.stringify(text));
  const s = clone(); hero(s).copy.sub = "Done in t\u200Bwenty minutes";
  assert.match(validateSpec(s, profile).errors[0].message, /hidden character in it \(U\+200B\)/);
  // and ordinary hyphenated words still pass
  for (const text of ["One-stop care", "Hassle-free and streak-free", "A care-free afternoon"]) assert.equal(typedFact(text), null, text);
});

test("a spec binds to an example's slug or a real business's own address name, nothing else (2026-11-13)", () => {
  for (const slug of ["example_brightline", "shine-co", "demo-detail"]) assert.ok(!codes(validateSpec({ ...clone(), slug })).includes("bad_shape"), slug);
  for (const slug of ["Shine-Co", "shine_co", "-shine", "a", "x".repeat(64), "", null]) assert.ok(codes(validateSpec({ ...clone(), slug })).includes("bad_shape"), String(slug));
});
