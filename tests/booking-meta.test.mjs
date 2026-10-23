// ROADMAP 97.42 - every tenant booking link previews as the business, not the
// platform. Runs the real edge handler (handleRequest) and the real head
// rewriter. At the edge, context.next() returns the served index.html; here a
// stub plays that role, fed with the repo's own built file so the handler runs
// against the real upstream body. A known slug gets the business's name in
// <title> and og:title plus its own description; an unknown slug keeps the
// platform tags and the page still loads. Run from the repo root:
//   node --test tests/booking-meta.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  extractSlug,
  handleRequest,
  rewriteHead,
  tenantDescription,
} from "../app/netlify/edge-functions/booking-meta.mjs";
import { readdir } from "node:fs/promises";

// The upstream body the edge function would receive from context.next().
// It is INPUT to the code under test, never asserted on directly: every
// check below runs handleRequest or rewriteHead first and asserts on what
// that call returned.
const upstreamHtml = await readFile("app/index.html", "utf8");

// The seeded demo business (scripts/seed-demo.mjs): slug demo-detail.
const DEMO_PROFILE = {
  business: {
    slug: "demo-detail",
    name: "Coastline Auto Detailing",
    service_area: "Long Beach & South Bay",
  },
  branding: {
    tagline: "Showroom clean, at your door.",
    about_copy: "Family-run mobile detailing serving Long Beach since 2019.",
  },
};

// One fake fetch per slug: the demo row exists, everything else does not.
async function fakeFetchProfile(slug) {
  if (slug === "demo-detail") return DEMO_PROFILE;
  return null;
}

function fakeResponse(html) {
  return {
    status: 200,
    headers: new Headers({ "content-type": "text/html" }),
    text: async () => html,
  };
}

async function runHandler(url, fetchProfile = fakeFetchProfile) {
  const res = await handleRequest(
    { url },
    async () => fakeResponse(upstreamHtml),
    fetchProfile,
  );
  return res.text();
}

const tagContent = (html, attr, key) => {
  const match = new RegExp(
    `<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`,
  ).exec(html);
  return match ? match[1] : null;
};

test("known slug: the handler rewrites the served page with the business name", async () => {
  const html = await runHandler("https://detailingplatform.com/book/demo-detail");
  assert.notEqual(html, upstreamHtml, "handler returned its input unchanged");
  assert.match(html, /<title>Coastline Auto Detailing<\/title>/);
  assert.equal(tagContent(html, "property", "og:title"), "Coastline Auto Detailing");
  assert.doesNotMatch(html, /<title>Detailing Platform<\/title>/);
});

test("known slug: the description the handler returns is the business's own", async () => {
  const html = await runHandler("https://detailingplatform.com/book/demo-detail");
  const description = tagContent(html, "name", "description");
  assert.ok(description.includes("Showroom clean, at your door."));
  assert.ok(!description.includes("Your prices, your hours"));
  assert.equal(tagContent(html, "property", "og:description"), description);
  assert.equal(tagContent(html, "name", "twitter:description"), description);
  assert.equal(
    tagContent(html, "property", "og:url"),
    "https://detailingplatform.com/book/demo-detail",
  );
});

test("known slug: the page the handler returns still loads (app shell intact)", async () => {
  const html = await runHandler("https://detailingplatform.com/book/demo-detail");
  assert.ok(html.includes('<div id="root"></div>'));
  assert.ok(html.includes("/src/main.jsx"));
});

test("unknown slug: handler returns the platform page untouched", async () => {
  const html = await runHandler("https://detailingplatform.com/book/no-such-shop");
  assert.match(html, /<title>Detailing Platform<\/title>/);
  assert.ok(html.includes('<div id="root"></div>'));
  assert.ok(!html.includes("Coastline Auto Detailing"));
});

test("lookup failure: handler returns the platform page untouched", async () => {
  const html = await runHandler(
    "https://detailingplatform.com/book/demo-detail",
    async () => {
      throw new Error("network down");
    },
  );
  assert.match(html, /<title>Detailing Platform<\/title>/);
  assert.ok(html.includes('<div id="root"></div>'));
});

test("non-book paths pass through the handler untouched", async () => {
  for (const url of ["https://detailingplatform.com/", "https://detailingplatform.com/app"]) {
    const html = await runHandler(url);
    assert.match(html, /<title>Detailing Platform<\/title>/, url);
    assert.ok(!html.includes("Coastline Auto Detailing"), url);
  }
});

test("extractSlug reads only /book/<slug>", () => {
  assert.equal(extractSlug("/book/demo-detail"), "demo-detail");
  assert.equal(extractSlug("/book/demo-detail/"), "demo-detail");
  assert.equal(extractSlug("/book/"), null);
  assert.equal(extractSlug("/booking/abc"), null);
  assert.equal(extractSlug("/app"), null);
  assert.equal(extractSlug("/book/%E0%A4%A"), null); // malformed: no throw, platform tags
});

test("tenantDescription falls back without tagline or about copy", () => {
  assert.equal(
    tenantDescription({ business: { name: "Sud Shop", service_area: "Torrance" }, branding: {} }),
    "Book detailing with Sud Shop in Torrance.",
  );
  assert.equal(
    tenantDescription({ business: { name: "Sud Shop" }, branding: {} }),
    "Book detailing with Sud Shop.",
  );
});

test("rewriteHead escapes quotes and angle brackets", () => {
  const out = rewriteHead(upstreamHtml, {
    profile: { business: { name: 'Sud "Shine" <Shop>' }, branding: {} },
  });
  assert.ok(!out.includes('Sud "Shine" <Shop>'));
  assert.ok(out.includes("Sud &quot;Shine&quot; &lt;Shop&gt;"));
});

test("a $ in the business name is written literally", () => {
  const out = rewriteHead(upstreamHtml, { profile: { business: { name: "Shine $& $' Co" }, branding: {} } });
  assert.ok(out.includes("<title>Shine $&amp; $' Co</title>"));
});

test("the edge-functions folder holds only this function (Netlify deploys every file there)", async () => {
  assert.deepEqual(await readdir("app/netlify/edge-functions"), ["booking-meta.mjs"]);
});
