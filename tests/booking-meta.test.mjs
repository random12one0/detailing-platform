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

// ROADMAP 97.93 - the picture a shared booking link shows comes from the
// business at the edge, in share.js's order: photo, then logo, then og-tenant.
const PHOTO = "https://media.example.com/gallery/first.jpg";
const LOGO = "https://media.example.com/logo.png";
async function imageFor(extra) {
  const html = await runHandler("https://detailingplatform.com/book/demo-detail",
    async () => ({ ...DEMO_PROFILE, ...extra }));
  const og = tagContent(html, "property", "og:image");
  assert.equal((html.match(/property="og:image"/g) ?? []).length, 1, "exactly one og:image");
  assert.equal(tagContent(html, "name", "twitter:image"), og);
  assert.equal(tagContent(html, "property", "og:image:alt"), "Coastline Auto Detailing");
  assert.doesNotMatch(html, /og:image:(width|height)/, "platform card's size left on a tenant picture");
  assert.match(og, /^https:\/\//, "absolute URL");
  return og;
}

test("booking page head carries the business's photo when it has one", async () => {
  assert.equal(await imageFor({
    gallery: [{ kind: "before_after", image_url: null }, { image_url: " " }, { image_url: PHOTO }],
    branding: { ...DEMO_PROFILE.branding, logo_url: LOGO },
  }), PHOTO);
});

test("booking page head carries the business's logo when it has no photo", async () => {
  assert.equal(await imageFor({ gallery: [], branding: { ...DEMO_PROFILE.branding, logo_url: LOGO } }), LOGO);
});

test("booking page head carries og-tenant.png when the business has neither", async () => {
  for (const extra of [{}, { gallery: null, branding: null },
    { gallery: [{ image_url: "/relative.jpg" }], branding: { logo_url: "http://insecure.example/l.png" } }])
    assert.equal(await imageFor(extra), "https://detailingplatform.com/og-tenant.png", JSON.stringify(extra));
});

test("the edge and the browser pick the same picture (share.js shareMetaFor)", async () => {
  const { shareMetaFor } = await import("../app/src/lib/share.js");
  const { shareImage } = await import("../app/netlify/edge-functions/booking-meta.mjs");
  const biz = { business: { name: "Riverside" } };
  for (const p of [
    { ...biz, gallery: [{ image_url: "" }, { image_url: PHOTO }], branding: { logo_url: LOGO } },
    { ...biz, gallery: [], branding: { logo_url: LOGO } },
    { ...biz, gallery: [{ image_url: ` ${PHOTO} ` }] },
    biz, { ...biz, gallery: null, branding: null }, { ...biz, branding: { logo_url: "/rel.png" } },
  ]) assert.equal(shareImage(p), shareMetaFor(p).image, JSON.stringify(p));
});

test("unknown slug and failed lookup serve the page byte-for-byte unchanged", async () => {
  assert.equal(await runHandler("https://detailingplatform.com/book/no-such-shop"), upstreamHtml);
  assert.equal(await runHandler("https://detailingplatform.com/book/demo-detail",
    async () => { throw new Error("network down"); }), upstreamHtml);
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

// ---------------------------------------------------------------------------
// ROADMAP 97.43 - LocalBusiness JSON-LD on the booking page (written by the
// edge handler, since crawlers do not run JS) and on every example site's
// home page (written by the real build, scripts/build-examples.mjs).
// ---------------------------------------------------------------------------
import { execFileSync } from "node:child_process";

// Ends where a browser ends the block: at the first `</script`, any case,
// whatever follows. A name that smuggles one in truncates the JSON and fails.
const LD_RE = /<script type="application\/ld\+json">([\s\S]*?)<\/script/gi;
const ldBlocks = (html) => [...html.matchAll(LD_RE)].map((m) => JSON.parse(m[1]));

const FULL_PROFILE = {
  ...DEMO_PROFILE,
  business: { ...DEMO_PROFILE.business, phone: "(562) 555-0100", dropoff_address: "12 Private Yard Rd" },
  services: [
    { name: "Full Detail", price: 219, notes: "OWNER-NOTE: call Dave first", vehicle_size_adjustments: {} },
    { name: "Ceramic", price: 890, price_is_from: true },
    { name: "Wash", price: 60, vehicle_size_adjustments: { suv: { price: 20 }, compact: { price: -10 } } },
    { name: "Quote only", price: null },
  ],
};

function assertLocalBusiness(ld, where) {
  assert.equal(ld["@context"], "https://schema.org", where);
  assert.equal(ld["@type"], "LocalBusiness", where);
  for (const k of ["name", "telephone", "areaServed"]) assert.ok(String(ld[k] ?? "").trim(), `${where}: ${k}`);
  assert.ok(Array.isArray(ld.makesOffer) && ld.makesOffer.length, `${where}: makesOffer`);
  for (const o of ld.makesOffer) {
    assert.equal(o["@type"], "Offer", where);
    assert.ok(o.itemOffered?.name, where);
    const amount = o.price ?? o.priceSpecification?.minPrice;
    assert.ok(Number.isFinite(amount) && amount >= 0, `${where}: price for ${o.itemOffered?.name}`);
    assert.equal(o.priceSpecification?.priceCurrency ?? o.priceCurrency, "USD", where);
  }
}

test("booking page: the handler writes one valid LocalBusiness block from public fields only", async () => {
  const html = await runHandler(
    "https://detailingplatform.com/book/demo-detail",
    async (slug) => (slug === "demo-detail" ? FULL_PROFILE : null),
  );
  const blocks = ldBlocks(html);
  assert.equal(blocks.length, 1, "exactly one JSON-LD block");
  const [ld] = blocks;
  assertLocalBusiness(ld, "/book/demo-detail");
  assert.equal(ld.name, "Coastline Auto Detailing");
  assert.equal(ld.telephone, "(562) 555-0100");
  assert.equal(ld.areaServed, "Long Beach & South Bay");
  assert.equal(ld.url, "https://detailingplatform.com/book/demo-detail");
  const byName = Object.fromEntries(ld.makesOffer.map((o) => [o.itemOffered.name, o]));
  assert.deepEqual(Object.keys(byName), ["Full Detail", "Ceramic", "Wash"], "unpriced service left out");
  assert.equal(byName["Full Detail"].price, 219);
  assert.equal(byName.Ceramic.priceSpecification.minPrice, 890, "a 'from' price is a minimum");
  assert.equal(byName.Ceramic.price, undefined);
  assert.equal(byName.Wash.priceSpecification.minPrice, 50, "the cheapest size sets the minimum");
  const raw = JSON.stringify(ld);
  assert.ok(!raw.includes("OWNER-NOTE") && !raw.includes("Dave"), "service notes stay out");
  assert.ok(!raw.includes("Private Yard"), "only the fields the entry names");
  assert.ok(html.indexOf('type="application/ld+json"') < html.indexOf("</head>"), "in the head");
});

test("booking page: a hostile business name cannot break out of the JSON-LD block", async () => {
  const name = 'Evil</script><script>alert(1)</script><!-- & "Co" \u2028 \u2029 Ltd';
  const html = await runHandler(
    "https://detailingplatform.com/book/demo-detail",
    async () => ({ business: { name, phone: "1", service_area: "</SCRIPT>x" }, services: [] }),
  );
  assert.ok(!html.includes("<script>alert(1)"), "no injected script element");
  assert.ok(!/<\/script><script>alert/i.test(html));
  const blocks = ldBlocks(html);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].name, name, "the name survives a parse exactly");
  assert.equal(blocks[0].areaServed, "</SCRIPT>x");
  assert.ok(html.includes('<div id="root"></div>'), "page still loads");
});

test("unknown slug and lookup failure: no JSON-LD is added", async () => {
  assert.equal(ldBlocks(await runHandler("https://detailingplatform.com/book/no-such-shop")).length, 0);
  const failed = await runHandler("https://detailingplatform.com/book/demo-detail", async () => {
    throw new Error("down");
  });
  assert.equal(ldBlocks(failed).length, 0);
});

test("every example site's built home page carries one LocalBusiness block that matches the page", async () => {
  execFileSync(process.execPath, ["scripts/build-examples.mjs", "--dev"], { stdio: "pipe" });
  const { SITES } = await import("../scripts/capture-examples.mjs");
  const decode = (s) => s.replace(/&amp;/g, "&").replace(/&middot;/g, "·");
  for (const [slug, src] of SITES) {
    const built = await readFile(`app/public/${slug}/index.html`, "utf8");
    const blocks = ldBlocks(built);
    assert.equal(blocks.length, 1, `${slug}: exactly one JSON-LD block`);
    const [ld] = blocks;
    assertLocalBusiness(ld, slug);
    // every claim is one the site prints (home page plus its own tabs)
    const pages = (await readdir("docs/tenant-sites")).filter((f) => f.startsWith(src.replace(/\.html$/, "")));
    const text = decode((await Promise.all(pages.map((f) => readFile(`docs/tenant-sites/${f}`, "utf8")))).join("\n"));
    assert.ok(text.includes(ld.name), `${slug}: name ${ld.name}`);
    assert.ok(text.includes(`tel:${ld.telephone}`), `${slug}: phone ${ld.telephone}`);
    assert.ok(text.includes(ld.areaServed), `${slug}: area ${ld.areaServed}`);
    for (const o of ld.makesOffer) {
      const at = text.indexOf(`<b>${o.itemOffered.name}</b>`);
      assert.ok(at >= 0, `${slug}: service ${o.itemOffered.name} is on the page`);
      const shown = `$${(o.price ?? o.priceSpecification.minPrice).toLocaleString("en-US")}`;
      assert.ok(text.slice(at, at + 400).includes(shown), `${slug}: ${o.itemOffered.name} at ${shown}`);
    }
  }
});
