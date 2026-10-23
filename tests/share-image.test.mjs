// ROADMAP 97.44 — share image (og:image) for the platform and for tenants.
// Credential-free: reads app/index.html and the two PNGs, calls shareMetaFor.
// Run: node --test tests/share-image.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PLATFORM_CARD, TENANT_FALLBACK_IMAGE, shareMetaFor } from "../app/src/lib/share.js";

const SITE = "https://detailingplatform.com/";
// The file a https://detailingplatform.com/<name> URL serves, and its PNG size.
function card(url) {
  assert.ok(url.startsWith(SITE), `absolute platform URL: ${url}`);
  const buf = readFileSync(`app/public/${url.slice(SITE.length)}`);
  assert.equal(buf.toString("latin1", 1, 4), "PNG", url);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

test("index.html carries an og:image that is a >=1200x630 PNG", () => {
  const html = readFileSync("app/index.html", "utf8");
  const og = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  assert.ok(og, "no og:image in app/index.html");
  const { w, h } = card(og);
  assert.ok(w >= 1200 && h >= 630, `${w}x${h}`);
  assert.equal(html.match(/<meta name="twitter:image" content="([^"]+)"/)?.[1], og);
});

test("tenant fallback card exists at >=1200x630", () => {
  const { w, h } = card(TENANT_FALLBACK_IMAGE);
  assert.ok(w >= 1200 && h >= 630, `${w}x${h}`);
});

test("shareMetaFor picks photo, then logo, then fallback; platform card without a name", () => {
  const photo = "https://media.example/a.jpg", logo = "https://media.example/l.png";
  const biz = { business: { name: " Riverside " } };
  assert.deepEqual(shareMetaFor({ ...biz, gallery: [{ image_url: "" }, { image_url: photo }], branding: { logo_url: logo } }),
    { title: "Riverside", image: photo });
  assert.equal(shareMetaFor({ ...biz, gallery: [], branding: { logo_url: logo } }).image, logo);
  for (const p of [biz, { ...biz, gallery: [{ image_url: " " }], branding: { logo_url: "" } },
                   { ...biz, gallery: null, branding: null }, { ...biz, branding: { logo_url: "/rel.png" } }])
    assert.equal(shareMetaFor(p).image, TENANT_FALLBACK_IMAGE, JSON.stringify(p));
  for (const p of [null, undefined, {}, { business: { name: "  " } }])
    assert.deepEqual(shareMetaFor(p), PLATFORM_CARD);
});
