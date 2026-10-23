// ROADMAP 97.41 — /robots.txt and /sitemap.xml used to answer with the app's
// HTML (the /* rewrite caught them). Real files in app/public now shadow the
// unforced rewrite. Files only, no network: run `node --test tests/seo-files.test.mjs`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => { try { return readFileSync(new URL(p, import.meta.url), "utf8"); } catch { return ""; } };
const PRIVATE = ["/app", "/admin", "/booking/", "/plan/", "/unsubscribe/", "/invite/", "/job/",
  "/settings/", "/preview", "/website", "/reset", "/map.html"];

test("robots.txt exists, blocks private routes and names the sitemap", () => {
  const lines = read("../app/public/robots.txt").split(/\r?\n/).map((l) => l.trim());
  assert.ok(lines.includes("User-agent: *"));
  assert.ok(lines.includes("Sitemap: https://detailingplatform.com/sitemap.xml"));
  for (const p of PRIVATE) assert.ok(lines.includes(`Disallow: ${p}`), `Disallow: ${p}`);
});

test("sitemap.xml is a urlset of public pages only", () => {
  const xml = read("../app/public/sitemap.xml");
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\s*<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">[\s\S]*<\/urlset>\s*$/);
  const urls = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<\/url>/g)].map((m) => m[1]);
  assert.equal(urls.length, (xml.match(/<url>/g) || []).length, "every <url> holds exactly one <loc>");
  assert.deepEqual(urls, ["/", "/pricing", "/terms", "/privacy"].map((p) => `https://detailingplatform.com${p}`));
  for (const u of urls) assert.ok(!PRIVATE.some((p) => new URL(u).pathname.startsWith(p)), u);
});

test("the SPA catch-alls stay unforced, so the files keep winning", () => {
  assert.doesNotMatch(read("../app/netlify.toml"), /force\s*=\s*true/);
  assert.doesNotMatch(read("../app/public/_redirects"), /^\/\*.*!\s*$/m);
});
