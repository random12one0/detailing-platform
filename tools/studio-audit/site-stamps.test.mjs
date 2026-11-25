// THE ONE STAMP CHECKER (site-stamps.mjs), shared by the site grader's G0 and the Studio's connection check.
//   node --test site-stamps.test.mjs   (the G0 part needs a platform with the Studio renderer: SITE_ACCEPTANCE_PLATFORM)
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { shows, figureShows, stampChecker } from "./site-stamps.mjs";

test("a value counts only whole, case aside", () => {
  assert.ok(shows("From $95", "$95"));
  assert.ok(!shows("$950", "$95"), "$95 is not inside $950");
  assert.ok(!shows("$95.50", "$95"));
  assert.ok(!shows("$1,295", "$295"));
  assert.ok(shows("CAR Base", "Car Base"), "a label set in capitals by CSS");
  assert.ok(figureShows("Call (562) 555-0100", "562-555-0100"), "a contract figure may differ only in punctuation");
  assert.ok(!figureShows("$950", "$95"));
  assert.ok(!figureShows("anything", null));
});

// A stand-in renderer: just enough of spec.js / format.js for price and name stamps.
const deps = {
  parseBinding: (t) => { const m = /^service:([^.]+)\.(price|name)$/.exec(t); return m ? { kind: "service", id: m[1], field: m[2] } : null; },
  resolve: (t, p) => { const id = /^service:([^.]+)/.exec(t)[1]; const s = p.services.find((x) => x.id === id); return s ? { service: s } : null; },
  vehicleSizeExtra: () => 0, money: (n) => `$${n}`, duration: (m) => `${m} min`, time12: (t) => t,
};
const S = stampChecker(deps);
const P = (a, b) => ({ settings: {}, services: [{ id: "a", name: "Interior reset", price: a }, { id: "b", name: "Complete care", price: b }] });

test("each stamp is judged by its own binding: two same-priced services swapped are caught once prices differ", () => {
  const stamp = { from: "service:a.price", text: "$295", imgs: [] };
  assert.equal(S.stampProblem(stamp, P(295, 295)), null, "with equal prices a swap cannot be seen");
  assert.match(S.stampProblem(stamp, P(297, 298)), /does not show "\$297"/);
  assert.equal(S.stampProblem({ from: "service:a.name", text: "INTERIOR RESET", imgs: [] }, P(1, 2)), null);
  assert.match(S.stampProblem({ from: "service:zzz.price", text: "$1", imgs: [] }, P(1, 2)), /no active service/);
  assert.match(S.stampProblem({ from: "price:a", text: "$1", imgs: [] }, P(1, 2)), /not an allowed binding/);
});

test("an old value still on the page is stale", () => {
  assert.match(S.staleProblem({ from: "service:a.price", text: "$185 $296", imgs: [] }, P(185, 9), P(296, 9)), /still shows the old "\$185"/);
  assert.equal(S.staleProblem({ from: "service:a.price", text: "$296", imgs: [] }, P(185, 9), P(296, 9)), null);
});

const PLATFORM = process.env.SITE_ACCEPTANCE_PLATFORM;
const hasRenderer = PLATFORM && existsSync(path.join(PLATFORM, "app/src/site/spec.js"));
test("G0 (site-browser.mjs) uses the same checker: a Studio site's wrong price and a contract's partial figure both fail", { skip: !hasRenderer && "needs SITE_ACCEPTANCE_PLATFORM with the Studio renderer", timeout: 240000 }, async () => {
  const { browserGates } = await import(pathToFileURL(path.resolve("site-browser.mjs")).href);
  const { normalizeProfile } = await import(pathToFileURL(path.join(PLATFORM, "app/src/book/core.js")).href);
  const profile = normalizeProfile({ business: { slug: "x", name: "X" }, settings: {}, service_groups: [], services: [{ id: "s1", name: "Hand wash", price: 95 }] });
  const shell = (body, head = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title>${head}</head><body><a href="#m">Skip</a><nav>n</nav><main id="m"><h1>Site</h1>${body}</main></body></html>`;
  const pages = {
    good: shell('<p data-from="service:s1.name">Hand wash</p><p data-from="service:s1.price">$95</p>'),
    bad: shell('<p data-from="service:s1.name">Hand wash</p><p data-from="service:s1.price">$950</p>'),
    contract: shell('<p id="price" data-from="price.wash">$950</p>', `<script type="application/json" id="site-contract">${JSON.stringify({ bindings: [{ selector: "#price", from: "price.wash" }], sources: { "price.wash": "$95" } })}</script>`),
  };
  const server = http.createServer((req, res) => { res.writeHead(200, { "content-type": "text/html" }); res.end(pages[req.url.slice(1)] || ""); });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const out = await mkdtemp(path.join(tmpdir(), "site-stamps-"));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const good = await browserGates(`${base}/good`, { out: path.join(out, "g"), profile });
    assert.equal(good.G0.pass, true, JSON.stringify(good.G0.failures));
    const bad = await browserGates(`${base}/bad`, { out: path.join(out, "b"), profile });
    assert.equal(bad.G0.pass, false);
    assert.ok(bad.G0.failures.some((f) => f.selector === '[data-from="service:s1.price"]' && /\$95/.test(f.detail)), JSON.stringify(bad.G0.failures));
    const none = await browserGates(`${base}/good`, { out: path.join(out, "n") });
    assert.ok(none.G0.failures.some((f) => /needs the profile/.test(f.detail)), "a Studio site with no profile is not passed blind");
    const contract = await browserGates(`${base}/contract`, { out: path.join(out, "c") });
    assert.ok(contract.G0.failures.some((f) => f.selector === "#price" && /not bound to its declared source/.test(f.detail)), "$95 is not inside $950 any more (the old check let it through)");
  } finally { await new Promise((r) => server.close(r)); await rm(out, { recursive: true, force: true }); }
});
