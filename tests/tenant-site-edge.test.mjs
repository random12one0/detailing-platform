// STUDIO S8: the edge function that serves a published site at `/` on a detailer's verified address
// (app/netlify/edge-functions/tenant-site.mjs). Pure decision, IO injected; the host list must equal lib/host.js.
//   node --test tests/tenant-site-edge.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decide, isPlatformHost, tenantHost, PLATFORM_HOSTS, PLATFORM_SUFFIXES, config } from "../app/netlify/edge-functions/tenant-site.mjs";
import * as HOST from "../app/src/lib/host.js";

const live = { spec: { slug: "x" }, release: 2, revision: 5 };
const asked = [];
const answer = (v) => async (h) => { asked.push(h); if (v instanceof Error) throw v; return v; };

test("only `/` on a tenant host is ever looked up, and only a live release rewrites to the site page", async () => {
  assert.equal(config.path, "/");
  assert.equal(String(await decide("https://www.Shine.example/?utm=1", answer(live))), "https://www.shine.example/site.html?utm=1");
  assert.equal(asked.at(-1), "shine.example", "normalised the way the database stores it");
  assert.equal(await decide("https://shine.example/", answer(null)), null, "nothing live: the app answers as before");
  assert.equal(await decide("https://shine.example/", answer({ release: 1 })), null, "no spec: pass through");
  assert.equal(await decide("https://shine.example/", answer(new Error("timeout"))), null, "a failed lookup never breaks the page");
  const n = asked.length;
  for (const u of ["https://detailingplatform.com/", "https://www.detailingplatform.com/", "https://deploy-preview-9--x.netlify.app/", "https://shine.example/book/shine", "https://shine.example/site/example/brightline"])
    assert.equal(await decide(u, answer(live)), null, u);
  assert.equal(asked.length, n, "no lookup for our own hosts or for any other path");
});

test("the edge's host list is lib/host.js's", () => {
  for (const h of ["detailingplatform.com", "www.detailingplatform.com", "localhost", "127.0.0.1", "[::1]", "x.netlify.app", "x.netlify.live", "", "shine.example", "brightline.example.test"])
    assert.equal(isPlatformHost(h), HOST.isPlatformHost(h), h);
  for (const h of ["WWW.Shine.Example:443", "shine.example"]) assert.equal(tenantHost(h), HOST.tenantHost(h));
  const src = readFileSync(new URL("../app/src/lib/host.js", import.meta.url), "utf8");
  for (const h of PLATFORM_HOSTS) assert.ok(src.includes(`"${h}"`), h);
  for (const s of PLATFORM_SUFFIXES) assert.ok(src.includes(`"${s}"`), s);
});
