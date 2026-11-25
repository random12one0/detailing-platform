// Each public marketing page says its own title/description/canonical, prices in
// the structured data come from the price table, and private routes are noindex.
// Files only: node --test tests/seo-head.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { homeHead, pricingHead, legalHead } from "../app/src/landing/head.js";
import { PRICING } from "../app/src/landing/pricing.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("every marketing page has a distinct title, description and path", () => {
  const heads = [homeHead(PRICING), pricingHead(PRICING), legalHead.terms, legalHead.privacy];
  for (const h of heads) {
    assert.ok(h.title.length > 10 && h.title.length <= 65, h.title);
    assert.ok(h.description.length >= 60 && h.description.length <= 160, h.description);
    assert.match(h.path, /^\/[a-z]*$/);
  }
  for (const k of ["title", "description", "path"]) assert.equal(new Set(heads.map((h) => h[k])).size, heads.length, k);
});

test("structured data prices are the price table's", () => {
  const prices = (h) => JSON.stringify(h.jsonLd);
  for (const h of [homeHead(PRICING), pricingHead(PRICING)]) {
    assert.ok(prices(h).includes(`"price":"${PRICING.website.monthly}"`));
    assert.ok(prices(h).includes(`"price":"${PRICING.bookingOnly.monthly}"`));
  }
  assert.ok(pricingHead(PRICING).description.includes(`$${PRICING.website.setup}`));
});

test("each landing page calls useHead", () => {
  for (const f of ["LandingPage", "PricingPage", "LegalPage"]) assert.match(read(`../app/src/landing/${f}.jsx`), /useHead\(/, f);
});

test("signed-in and key-link routes send X-Robots-Tag noindex", () => {
  const toml = read("../app/netlify.toml");
  for (const p of ["/app/*", "/app", "/admin", "/booking/*", "/plan/*", "/job/*", "/invite/*", "/unsubscribe/*", "/reset", "/preview", "/website/*"]) {
    assert.ok(new RegExp(`for = "${p.replace("*", "\\*")}"\\s+\\[headers\\.values\\]\\s+X-Robots-Tag = "noindex`).test(toml), p);
  }
});
