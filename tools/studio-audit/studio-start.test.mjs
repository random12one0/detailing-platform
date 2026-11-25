// Start-from-a-business rules (studio-start.mjs), no network.   node --test tools/studio-audit/studio-start.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { sayable, isSlug, buildSpec, liveCheck, dbPublish } from "./studio-start.mjs";
import { validateSpec } from "../../app/src/site/spec.js";

const profile = (extra = {}) => ({ services: [{ id: "s1", name: "Express Wash", price: 65, group_id: "g1", duration_minutes: 60 }], serviceGroups: [{ id: "g1", name: "Exterior", sort_order: 0 }],
  gallery: [], testimonials: [], addOns: [], plans: [], settings: {}, hours: [], business: { service_area: "Long Beach" }, ...extra });
const biz = { slug: "demo-detail", name: "Demo", service_area: "Long Beach" };

test("only wording that passes the spec's fact rules is taken from the brief", () => {
  assert.equal(sayable("We care about paint. Call us."), "We care about paint.");
  assert.equal(sayable("Open every Sunday."), null, "a claim only the dashboard can make");
  assert.equal(sayable("Full detail for $99."), null, "a typed price");
  assert.equal(sayable(""), null);
});
test("address names follow the database's slug rule", () => {
  assert.ok(isSlug("demo-detail")); assert.ok(!isSlug("Demo Detail")); assert.ok(!isSlug("a/../b")); assert.ok(!isSlug("example_x"));
});
test("a business with services gets a valid first draft naming its own slug; one without is refused", () => {
  const spec = buildSpec({ business: biz, profile: profile(), answers: { A3: "Open every Sunday." } });
  assert.equal(spec.slug, "demo-detail");
  assert.equal(spec.pages[0].sections[0].copy.headline, "Careful detailing, priced up front.", "the refused wording fell back to the default");
  assert.ok(validateSpec(spec, profile()).ok);
  assert.ok(liveCheck(spec, profile()).ok);
  assert.ok(!liveCheck({ ...spec, slug: "demo-detail", pages: [{ path: "/", sections: [] }] }, profile()).ok, "the check can fail");
  assert.throws(() => buildSpec({ business: biz, profile: profile({ services: [] }) }), /no active services/);
});
test("publishing writes a revision then a release then points the site at it", async () => {
  const calls = [], real = globalThis.fetch;
  globalThis.fetch = async (url, o) => { const u = String(url).split("/rest/v1/")[1]; calls.push(`${o.method} ${u.split("?")[0]}`);
    const body = o.method === "GET" ? "[]" : u.startsWith("sites") && o.method === "POST" ? '[{"id":"S"}]' : u.startsWith("revisions") ? '[{"id":"R","n":1}]' : u.startsWith("releases") ? '[{"id":"L","n":1}]' : "";
    return new Response(body, { status: 200 }); };
  try {
    const r = await dbPublish({ url: "http://x", key: "k" }, { businessId: "b", spec: { slug: "a" }, note: "n", approval: { by: "you" }, hosts: ["h.test"], rendererVersion: "t" });
    assert.deepEqual(r, { release: 1, revision: 1 });
    assert.deepEqual(calls, ["GET sites", "POST sites", "GET revisions", "POST revisions", "POST releases", "PATCH sites"]);
  } finally { globalThis.fetch = real; }
});
