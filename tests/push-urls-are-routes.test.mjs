// Every owner push notification must open a page the app actually serves.
//
// ROADMAP 14.34, 2026-10-06. Twelve `sendOwnerPush` calls deep-linked to
// `/admin/job/<id>`. `main.jsx` has `/admin` with no sub-routes, so a detailer
// who tapped a job notification got Not Found — and nothing noticed, because
// `_redirects` answers every unknown path with 200 and `app/public/sw.js`
// navigates to `data.url` verbatim. The page is the failure, not a status code.
//
// A grep for `/admin/job` cannot tell a dead route from a live one, which is
// the lesson. So this asserts against the ROUTE TABLE: it discovers every
// `sendOwnerPush(...)` call in supabase/functions from source, reads the `url`
// in its payload, and fails on any path `main.jsx` does not define. A call
// whose url is not a literal path is reported by name as UNJUDGEABLE and fails
// too — it cannot be checked, so it must not read as passing.
//
//   node --test tests/push-urls-are-routes.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const FN_DIR = "supabase/functions";
// Discovery FLOOR, not a declaration (docs/gotchas.md 98): more calls is fine,
// fewer means the parser stopped matching and a green would mean nothing.
const MIN_CALLS = 12;

function routeTable() {
  const main = readFileSync("app/src/main.jsx", "utf8");
  const app = readFileSync("app/src/App.jsx", "utf8");
  const routes = [...main.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
  // `/app/${tab}` is generated from App.jsx's TAB_PATHS, not written literally.
  const tabs = app.match(/export const TAB_PATHS = \[([^\]]*)\]/);
  if (tabs && /TAB_PATHS\.map/.test(main)) {
    for (const t of tabs[1].matchAll(/"([^"]+)"/g)) routes.push(`/app/${t[1]}`);
  }
  return routes.filter((r) => r !== "*" && r !== "/*");
}

// A push url (template placeholders already collapsed to "X") against a route.
function isServed(path, routes) {
  const bare = path.split(/[?#]/)[0];
  return routes.some((r) => {
    const rx = new RegExp("^" + r.replace(/:[^/]+/g, "[^/]+") + "$");
    return rx.test(bare);
  });
}

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? filesUnder(join(dir, e.name))
      : /\.(ts|js)$/.test(e.name) ? [join(dir, e.name)] : []);
}

// Each `sendOwnerPush(` call, its payload object (brace-matched), and its url.
function pushCalls() {
  const calls = [];
  for (const file of filesUnder(FN_DIR)) {
    if (file.replace(/\\/g, "/").endsWith("_shared/ownerPush.ts")) continue;
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/sendOwnerPush\s*\(/g)) {
      const line = src.slice(0, m.index).split("\n").length;
      const open = src.indexOf("{", m.index);
      let depth = 0, end = open;
      for (; end < src.length; end++) {
        if (src[end] === "{") depth++;
        else if (src[end] === "}" && --depth === 0) break;
      }
      const payload = src.slice(open, end + 1);
      const u = payload.match(/\burl:\s*(`[^`]*`|"[^"]*"|'[^']*')/);
      const url = u ? u[1].slice(1, -1).replace(/\$\{[^}]*\}/g, "X") : null;
      calls.push({ where: `${file.replace(/\\/g, "/")}:${line}`, url });
    }
  }
  return calls;
}

const routes = routeTable();
const calls = pushCalls();

test("the sources were read: routes and push calls were found", () => {
  assert.ok(routes.includes("/job/:id"), `routes: ${routes.join(", ")}`);
  assert.ok(calls.length >= MIN_CALLS,
    `found ${calls.length} sendOwnerPush calls, floor is ${MIN_CALLS}`);
  console.log(`  ${calls.length} push calls, ${routes.length} routes`);
});

test("the matcher can say no (canary, runs every time)", () => {
  // Aimed at the same function the real check uses, so it cannot drift.
  assert.equal(isServed("/admin/job/X", routes), false);
  assert.equal(isServed("/job/X", routes), true);
  assert.equal(isServed("/job/X/extra", routes), false);
});

test("every push notification url is a path the router serves", () => {
  const bad = calls.filter((c) => !c.url || !c.url.startsWith("/") || !isServed(c.url, routes));
  assert.deepEqual(bad.map((c) => `${c.where} → ${c.url ?? "UNJUDGEABLE (no literal url)"}`), []);
});

test("the service worker's fallback is a served path too", () => {
  const sw = readFileSync("app/public/sw.js", "utf8");
  const m = sw.match(/data\?\.url\s*\|\|\s*"([^"]+)"/);
  assert.ok(m, "could not find the fallback url in sw.js");
  assert.ok(isServed(m[1], routes), `sw.js falls back to ${m[1]}, not a route`);
});
