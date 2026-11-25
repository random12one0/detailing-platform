// STUDIO S8, publish (STUDIO-SPEC.md §1e, §2c layer 4, §6b, §6d, §7 row S8).
//   - Publish refuses without the detailer's yes (or Andrew's reason), without a passed connection check AND gate run
//     on that exact revision, without a paying business and without a verified address; it asks "Press again" first;
//   - a release is a record; rollback puts the previous release back exactly (the same spec, byte for byte);
//   - what is live is what the platform's get_published_site_by_host serves (the test data engine reads published.json);
//   - emails never promise the detailer's own prices when the preview shows example data;
//   - nightly parity: the live site on its own (test) address matches the dashboard; an injected price mismatch raises
//     the alarm, on the Studio and for the watcher, which tells Andrew once and never pauses the belt.
//   node --test studio-publish.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createStudio } from "./studio.mjs";
import { platformCopy } from "./test-fixtures/platform-copy.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLAT = platformCopy();
const NEEDS = { skip: !existsSync(path.join(PLAT, "scripts/studio/studio-parity.mjs")) && `needs the platform copy with the S8 renderer at ${PLAT}`, timeout: 600000 };
const HOST = "brightline.example.test";

function studio(dir) {
  process.env.BELT_STUDIO_DATA = dir;
  process.env.STUDIO_BELT_STATE = path.join(dir, "no-belt-state.json");
  writeFileSync(path.join(dir, "settings.json"), JSON.stringify({ allowed: PLAT, platform: PLAT }));
  const S = createStudio({ HERE, json: (res, c, o) => res.done(o), body: (req, res, l, fn) => fn(req.body), onExit: false });
  delete process.env.BELT_STUDIO_DATA;
  S.call = (method, p, b) => new Promise((done) => S.handle({ method, body: b }, { done }, new URL("http://x" + p)));
  return S;
}
const done = () => { for (const k of ["STUDIO_BELT_STATE", "STUDIO_EXAMPLE_PAYING", "STUDIO_PARITY_BREAK"]) delete process.env[k]; };
const now = () => new Date().toISOString();
// the two checks, as their runs record them, on one revision (the real runs are proved in their own tests)
const checked = (S, n) => S.store.addCheck("brightline", { id: `c${Date.now()}${n}`, site: "brightline", rev: n, spec_hash: S.store.revision("brightline", n).spec_hash, started_at: now(), finished_at: now(), ok: true, passed: 20, failed: 0, lines: [] });
const gated = (S, n, ok = true) => S.store.addGates("brightline", { rev: n, spec_hash: S.store.revision("brightline", n).spec_hash, ok, rows: [], at: now(), said: ok ? "every gate passed" : "it failed G1 layout" });
function approved(S, n) {
  const l = { id: `k${Date.now().toString(36)}${n}`, hash: null, site: "brightline", purpose: "review", revision: n, created_at: now(), expires_at: null, revoked_at: null, thumbs: {}, approved_at: now() };
  return S.store.saveLink(l);
}
function newRevision(S, n, headline) {
  const spec = structuredClone(S.store.revision("brightline", 1).spec);
  spec.pages[0].sections.find((s) => s.type === "hero").copy.headline = headline;
  const h = JSON.stringify(spec);
  return S.store.addRevision("brightline", { n, site: "brightline", parent: n - 1, created_at: now(), author: "you", note: "test", spec_hash: `t${n}${h.length}`, spec });
}
const published = (S) => JSON.parse(readFileSync(S.store.publishedFile(), "utf8"));

test("publish refuses without approval, passed checks, a paying business; rollback puts the previous release back exactly", NEEDS, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-publish-"));
  const S = studio(dir);
  try {
    await S.swept;
    assert.equal((await S.call("POST", "/api/studio/example")).ok, true);
    const pub = (b = {}) => S.call("POST", "/api/studio/publish", { site: "brightline", confirm: true, ...b });
    // "Press again" first: nothing is published by one press
    assert.match((await S.call("POST", "/api/studio/publish", { site: "brightline" })).said, /^Press again to publish Brightline Auto Care\.$/);
    // nothing ticked: every reason is given, and the example is not a paying customer
    process.env.STUDIO_EXAMPLE_PAYING = "0";
    let r = await pub();
    assert.equal(r.ok, false);
    for (const k of ["approved", "connection", "gates", "paying"]) assert.equal(r.rows.find((x) => x.key === k).ok, false, k);
    assert.equal(r.rows.find((x) => x.key === "address").ok, true, "brightline.example.test is verified in the example dashboard");
    assert.match(r.said, /not a paying website customer/);
    // the checks and the yes, but still not paying: refused
    checked(S, 1); gated(S, 1); approved(S, 1);
    r = await pub();
    assert.equal(r.ok, false); assert.deepEqual(r.rows.filter((x) => !x.ok).map((x) => x.key), ["paying"]);
    assert.equal(S.store.releases("brightline").length, 0); assert.ok(!existsSync(S.store.publishedFile()));
    // paying, but no detailer's yes on the revision: refused; Andrew's reason (with words) lets it go
    process.env.STUDIO_EXAMPLE_PAYING = "1";
    const n2 = newRevision(S, 2, "Second headline.").n;
    checked(S, 2); gated(S, 2);
    r = await pub();
    assert.equal(r.ok, false); assert.deepEqual(r.rows.filter((x) => !x.ok).map((x) => x.key), ["approved"]);
    assert.equal((await S.call("POST", "/api/studio/publish/override", { site: "brightline", why: " " })).ok, false);
    assert.equal((await S.call("POST", "/api/studio/publish/override", { site: "brightline", why: "They said yes on the phone." })).ok, true);
    // a gate run on another spec than this revision's does not count
    const n3 = newRevision(S, 3, "Third headline.").n;
    checked(S, 3); approved(S, 3);
    S.store.addGates("brightline", { rev: 3, spec_hash: "not-this-one", ok: true, rows: [], at: now(), said: "every gate passed" });
    r = await pub();
    assert.deepEqual(r.rows.filter((x) => !x.ok).map((x) => x.key), ["gates"], "a stale gate run is not a pass");
    // a failed connection check on the exact revision refuses
    gated(S, 3);
    S.store.addCheck("brightline", { id: `c${Date.now()}9`, site: "brightline", rev: 3, spec_hash: S.store.revision("brightline", 3).spec_hash, started_at: new Date(Date.now() + 5000).toISOString(), finished_at: now(), ok: false, passed: 3, failed: 2, lines: [] });
    r = await pub();
    assert.deepEqual(r.rows.filter((x) => !x.ok).map((x) => x.key), ["connection"]);
    // finally: a newer passed check, and everything ticked → release 1 (revision 3), served at its address; "Your site is live" waits for Send
    S.store.addCheck("brightline", { id: `c${Date.now()}8`, site: "brightline", rev: 3, spec_hash: S.store.revision("brightline", 3).spec_hash, started_at: new Date(Date.now() + 9000).toISOString(), finished_at: now(), ok: true, passed: 20, failed: 0, lines: [] });
    r = await pub();
    assert.equal(r.ok, true, r.said);
    assert.match(r.said, /live at brightline\.example\.test: release 1, revision 3/);
    let rel = S.store.releases("brightline")[0];
    assert.equal(rel.revision, 3); assert.deepEqual(rel.hosts, [HOST]); assert.equal(rel.approval.by, "detailer"); assert.ok(rel.renderer_version);
    assert.deepEqual(published(S)[HOST].spec, S.store.revision("brightline", 3).spec);
    assert.equal(S.store.site("brightline").status, "live");
    const live = S.store.emails("brightline").find((e) => e.kind === "live");
    assert.equal(live.status, "draft"); assert.match(live.body, /https:\/\/brightline\.example\.test/);
    assert.match((await pub()).said, /already live/);
    // revision 2 with Andrew's reason... is not the latest; make revision 4 the next release with his reason
    const n4 = newRevision(S, 4, "Fourth headline.").n;
    checked(S, 4); gated(S, 4);
    assert.equal((await S.call("POST", "/api/studio/publish/override", { site: "brightline", why: "They said yes on the phone." })).ok, true);
    r = await pub();
    assert.equal(r.ok, true, r.said);
    rel = S.store.releases("brightline")[0];
    assert.equal(rel.n, 2); assert.equal(rel.previous, 1); assert.deepEqual(rel.approval.by, "you"); assert.equal(rel.approval.why, "They said yes on the phone.");
    assert.equal(published(S)[HOST].release, 2);
    assert.equal(S.store.emails("brightline").filter((e) => e.kind === "live").length, 1, "one “Your site is live”, not one per release");
    // ROLLBACK: "Press again" first; then release 1 exactly, and release 2 kept as a record, marked
    const before = structuredClone(published(S)[HOST]);
    assert.match((await S.call("POST", "/api/studio/publish/rollback", { site: "brightline" })).said, /Press again to go back to release 1 \(revision 3\)/);
    assert.deepEqual(published(S)[HOST], before, "one press changes nothing");
    r = await S.call("POST", "/api/studio/publish/rollback", { site: "brightline", confirm: true });
    assert.equal(r.ok, true, r.said); assert.match(r.said, /Prices, hours and bookings were not touched/);
    const back = published(S)[HOST];
    assert.equal(back.release, 1); assert.equal(back.revision, 3);
    assert.equal(JSON.stringify(back.spec), JSON.stringify(S.store.revision("brightline", 3).spec), "the same spec, byte for byte");
    assert.ok(S.store.releases("brightline").find((x) => x.n === 2).rolled_back_at);
    assert.equal(S.store.site("brightline").live_release, 1);
    assert.match((await S.call("POST", "/api/studio/publish/rollback", { site: "brightline", confirm: true })).said, /first release/);
    // the review email says plainly that the preview shows example data (the S7 open point)
    checked(S, 4);
    await S.call("POST", "/api/studio/links/review", { site: "brightline" });
    const review = S.store.emails("brightline").find((e) => e.kind === "review");
    assert.match(review.body, /For now it shows example prices, times and photos, not yours/);
    assert.doesNotMatch(review.body, /with your own prices and times/);
    void n2; void n3; void n4;
  } finally { S.close(); done(); rmSync(dir, { recursive: true, force: true }); }
});

test("nightly parity: the live site on its own address matches; an injected price mismatch raises the alarm for the Studio and the watcher", NEEDS, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-publish-"));
  const S = studio(dir);
  try {
    await S.swept;
    process.env.STUDIO_EXAMPLE_PAYING = "1";
    await S.call("POST", "/api/studio/example");
    checked(S, 1); gated(S, 1); approved(S, 1);
    assert.equal((await S.call("POST", "/api/studio/publish", { site: "brightline", confirm: true })).ok, true);
    // green: served on brightline.example.test (a test host mapping), every value matches, the quote matches
    let r = await S.call("POST", "/api/studio/publish/parity", { site: "brightline" });
    let p = S.store.parities("brightline")[0];
    assert.equal(r.match, true, JSON.stringify(p.lines.filter((l) => !l.pass)));
    assert.match(p.lines.find((l) => l.id === "served").detail, /^release 1 \(revision 1\)/);
    assert.equal(p.lines.find((l) => l.id === "quote").pass, true);
    assert.deepEqual((await S.call("GET", "/api/studio/overview")).alarms, []);
    // red: the page keeps an old price while the dashboard moved on
    process.env.STUDIO_PARITY_BREAK = "stale-price";
    r = await S.call("POST", "/api/studio/publish/parity", { site: "brightline" });
    p = S.store.parities("brightline")[0];
    assert.equal(r.match, false);
    assert.ok(p.mismatches.some((m) => /service:.*\.price/.test(m.from)), JSON.stringify(p.mismatches));
    const alarms = (await S.call("GET", "/api/studio/overview")).alarms;
    assert.equal(alarms.length, 1); assert.match(alarms[0].what, /^Brightline Auto Care's live site does not match its dashboard\. .+'s price on the site: /);
    assert.equal(S.handle({ method: "GET" }, { done: () => {} }, new URL("http://x/api/studio/site?id=brightline")), true);
    // the problem it hands the (retired) watcher is "tell", never a repair job
    const probs = S.watcherProblems();
    assert.deepEqual(probs.map((x) => [x.kind, x.act, x.source]), [["site-parity", "tell", "studio"]]);
    // the next green check clears it (on the Studio and in what it hands a watcher)
    delete process.env.STUDIO_PARITY_BREAK;
    r = await S.call("POST", "/api/studio/publish/parity", { site: "brightline" });
    assert.equal(r.match, true);
    assert.deepEqual(S.watcherProblems(), []);
    // what the address serves follows a publish and a rollback: release 2, then release 1 again
    newRevision(S, 2, "A second headline for the test.");
    checked(S, 2); gated(S, 2); approved(S, 2);
    assert.equal((await S.call("POST", "/api/studio/publish", { site: "brightline", confirm: true })).ok, true);
    await S.call("POST", "/api/studio/publish/parity", { site: "brightline" });
    assert.match(S.store.parities("brightline")[0].lines.find((l) => l.id === "served").detail, /^release 2 \(revision 2\)/);
    assert.equal((await S.call("POST", "/api/studio/publish/rollback", { site: "brightline", confirm: true })).ok, true);
    r = await S.call("POST", "/api/studio/publish/parity", { site: "brightline" });
    assert.equal(r.match, true);
    assert.match(S.store.parities("brightline")[0].lines.find((l) => l.id === "served").detail, /^release 1 \(revision 1\)/);
  } finally { S.close(); done(); rmSync(dir, { recursive: true, force: true }); }
});

test("the platform's answer for an address: only a verified, active, paying business's live release", NEEDS, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-publish-"));
  try {
    const file = path.join(dir, "published.json");
    const spec = JSON.parse(readFileSync(path.join(PLAT, "app/src/site/specs/brightline.json"), "utf8"));
    writeFileSync(file, JSON.stringify({ [HOST]: { slug: spec.slug, site: "brightline", release: 4, revision: 7, spec }, "other.example.test": { slug: "someone_else", release: 1, revision: 1, spec } }));
    process.env.STUDIO_PUBLISHED = file; process.env.STUDIO_BELT = HERE;
    const ask = async (paying, host) => {
      process.env.STUDIO_EXAMPLE_PAYING = paying;
      const { startExampleEngine } = await import(pathToFileURL(path.join(PLAT, "scripts/studio/example-engine.mjs")).href);
      const e = await startExampleEngine({ port: 0 });
      try { return await (await fetch(`${e.url}/rest/v1/rpc/get_published_site_by_host`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ p_host: host }) })).json(); }
      finally { await e.close(); }
    };
    const yes = await ask("1", "WWW.Brightline.Example.Test:443");
    assert.equal(yes.release, 4); assert.equal(yes.revision, 7); assert.deepEqual(yes.spec, spec);
    assert.equal(await ask("0", HOST), null, "not paying: nothing is served");
    assert.equal(await ask("1", "other.example.test"), null, "an address that is not verified for this business");
    assert.equal(await ask("1", "nobody.example.test"), null);
  } finally { delete process.env.STUDIO_PUBLISHED; done(); rmSync(dir, { recursive: true, force: true }); }
});
