// STUDIO S6 review, finding 1: wording that states a fact only the dashboard can state is refused, not only digits.
//   node --test tests/site-claims.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { claimWord, inventedFact, validateSpec } from "../app/src/site/spec.js";

const base = JSON.parse(readFileSync(new URL("../app/src/site/specs/brightline.json", import.meta.url), "utf8"));
const withHeadline = (h) => ({ ...base, pages: [{ ...base.pages[0], sections: base.pages[0].sections.map((s) => (s.type === "hero" ? { ...s, copy: { ...s.copy, headline: h } } : s)) }] });
// a Brightline-like dashboard: mobile with zones and a drop-off address; washes, interiors, a sealant; no ceramic
const P = { services: [{ id: "1", name: "Hand wash", description: "A careful exterior wash.", features: ["Wheels and glass"] }, { id: "2", name: "Complete care", features: ["Wash and paint sealant"] }],
  addOns: [{ id: "a", name: "Pet hair removal" }], plans: [], business: { service_area: "Long Beach", dropoff_address: "Example workshop" }, settings: { travel_zones: [{ name: "Long Beach" }] } };

test("the review's cases, and their kin, are refused in any wording", () => {
  for (const t of ["Open every Sunday.", "Pay a penny for a full detail.", "Complimentary ceramic coating with every visit.", "Weekend slots fill fast.", "Same-day service",
    "Open late for you", "On the house: the wheels", "The cheapest detail in town", "Fully insured and licensed", "Award-winning care", "Satisfaction guaranteed",
    "Family owned since forever", "Eco-friendly products", "Years of experience", "Money back if not happy", "We price match", "Mornings and evenings", "Top rated"])
    assert.ok(claimWord(t), t);
  for (const t of ["Care you can see. Prices you can check.", "Every price below comes straight from our booking system, so what you read is what you get quoted.",
    "Nothing is charged on this page.", "Request a time", "Before and after", "Your car. Looked after.", "Endless care, honest prices", "Where we work, and when", "See the hours below"])
    assert.equal(claimWord(t), null, t);
  // through the validator, with the plain reason
  const v = validateSpec(withHeadline("Open every Sunday."));
  assert.equal(v.ok, false); assert.equal(v.errors[0].code, "claim"); assert.match(v.errors[0].message, /"Sunday" says when the detailer works/);
});

test("against the dashboard: work it does not list, and ways of working it does not have", () => {
  assert.match(inventedFact("Ceramic that lasts.", P), /"ceramic" names work the dashboard does not list/);
  assert.match(inventedFact("We fix swirl marks.", P), /"swirl"/);
  assert.equal(inventedFact("A paint sealant on every complete visit.", P), null, "sealant is on the dashboard");
  assert.equal(inventedFact("We come to you, or drop it off at our workshop.", P), null);
  assert.match(inventedFact("We come to you.", { ...P, business: {}, settings: {} }), /comes to the customer/);
  assert.match(inventedFact("Drop-offs welcome.", { ...P, business: { service_area: "X" } }), /drop-off address/);
  // checked when a revision or a look is judged (profile given), never on a customer's visit
  const spec = withHeadline("Ceramic that lasts.");
  assert.equal(validateSpec(spec).ok, true, "shape only: not judged without the dashboard");
  const tableProfile = { services: [], serviceGroups: [], gallery: [], ...P };
  assert.ok(validateSpec(spec, tableProfile).errors.some((e) => e.code === "invented"));
  assert.ok(!validateSpec(spec, tableProfile, { live: true }).errors.some((e) => e.code === "invented"));
});
