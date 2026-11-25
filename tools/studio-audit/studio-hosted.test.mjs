// HOSTED PREVIEW LINKS and WEBSITE AUTOFILL, end to end against stand-ins (studio-cloud.mjs, Andrew 2026-11-13):
//   - an approved link's page goes to the platform keyed by the secret's fingerprint only, at detailingplatform.com/p/…;
//   - the detailer's comment, vote, "I'm happy with it" and pick, made on the hosted page (the platform function's own
//     rules, supabase/functions/_shared/sitePreview.js), come back as Studio cards, once each, even if pulled twice;
//   - cancelling a link cancels it online at once;
//   - a sent form's current website is read, only quoted answers are kept, prices are only listed, the form is never
//     written, and the detailer's review link shows the answers with their pages.
// The database is a small stand-in for the platform's REST API; the website is a local page; Claude is a stand-in.
//   SITE_ACCEPTANCE_PLATFORM=C:/studio-work/autofill-site node --test studio-hosted.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createStudio } from "./studio.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLAT = (process.env.SITE_ACCEPTANCE_PLATFORM || "C:/studio-work/s1").replace(/\\/g, "/");
const ACT = path.join(PLAT, "supabase/functions/_shared/sitePreview.js");
const NEEDS = { skip: !existsSync(ACT) && `needs the platform copy with the site-preview function at ${PLAT}`, timeout: 300000 };
const J = (o) => JSON.stringify(o);
const sha = (t) => createHash("sha256").update(t).digest("hex");
const listen = (h) => new Promise((ok) => { const s = http.createServer(h).listen(0, "127.0.0.1", () => ok(s)); });
const filesUnder = (d) => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? filesUnder(p) : [p]; });

// The platform's REST API, as much as the Studio uses: preview_links, preview_events, site_intake, businesses.
function fakeDb() {
  const db = { links: new Map(), events: [], intake: [], businesses: [], writes: [] };
  const eq = (u, k) => u.searchParams.get(k)?.replace(/^eq\./, "");
  db.server = listen((req, res) => {
    let b = ""; req.on("data", (d) => { b += d; });
    req.on("end", () => {
      const u = new URL(req.url, "http://x"), t = u.pathname.replace("/rest/v1/", ""), body = b ? JSON.parse(b) : null;
      const send = (o, code = 200) => { res.writeHead(code, { "content-type": "application/json" }); res.end(o === undefined ? "" : J(o)); };
      if (req.headers.apikey !== "service-key") return send({ message: "no key" }, 401);
      if (req.method !== "GET") db.writes.push({ t, method: req.method, q: u.search, body });
      if (t === "preview_links" && req.method === "POST") { db.links.set(body.token_hash, { ...db.links.get(body.token_hash), ...body }); return send(undefined, 201); }
      if (t === "preview_links" && req.method === "PATCH") { const h = eq(u, "token_hash"); if (db.links.has(h)) db.links.set(h, { ...db.links.get(h), ...body }); return send(undefined, 204); }
      if (t === "preview_events" && req.method === "GET") return send(db.events.filter((e) => e.token_hash === eq(u, "token_hash") && !e.pulled_at));
      if (t === "preview_events" && req.method === "PATCH") { const ids = /in\.\(([\d,]+)\)/.exec(u.searchParams.get("id"))[1].split(",").map(Number); for (const e of db.events) if (ids.includes(e.id)) e.pulled_at = body.pulled_at; return send(undefined, 204); }
      if (t === "site_intake" && req.method === "GET") return send(u.searchParams.get("business_id") ? db.intake.filter((r) => r.business_id === eq(u, "business_id")) : db.intake.filter((r) => r.submitted_at));
      if (t === "businesses" && req.method === "GET") return send(db.businesses);
      send({ message: `no ${req.method} ${t} here` }, 404);
    });
  });
  return db;
}

test("hosted links: sent on approval by fingerprint, the detailer's actions come back once each, cancel reaches the platform", NEEDS, async () => {
  const { act } = await import(pathToFileURL(ACT).href);
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-hosted-"));
  const db = fakeDb(), srv = await db.server;
  process.env.STUDIO_CLOUD_URL = `http://127.0.0.1:${srv.address().port}`; process.env.STUDIO_CLOUD_KEY = "service-key";
  process.env.BELT_STUDIO_DATA = dir; process.env.STUDIO_BELT_STATE = path.join(dir, "none.json");
  writeFileSync(path.join(dir, "settings.json"), J({ allowed: PLAT, platform: PLAT, cloud: "live", syncSeconds: 3600 }));
  const S = createStudio({ HERE, json: (res, c, o) => res.done(o), body: (req, res, l, fn) => fn(req.body), onExit: false });
  delete process.env.BELT_STUDIO_DATA;
  const call = (method, p, b) => new Promise((done) => S.handle({ method, body: b }, { done }, new URL("http://x" + p)));
  // what the platform function does with one press on the hosted page
  const press = (token, kind, body) => {
    const row = db.links.get(sha(token)), r = act(row, kind, body);
    if (r.ok) { db.events.push({ id: db.events.length + 1, token_hash: sha(token), kind, body: r.event }); row.view = r.view; }
    return r;
  };
  try {
    await S.swept;
    assert.equal((await call("POST", "/api/studio/example")).ok, true);
    S.store.addCheck("brightline", { id: "c1", site: "brightline", rev: 1, started_at: new Date().toISOString(), finished_at: new Date().toISOString(), ok: true, passed: 20, failed: 0, lines: [] });
    assert.equal((await call("POST", "/api/studio/links/review", { site: "brightline" })).ok, true);
    assert.equal(db.links.size, 0, "nothing goes online before the email is approved");
    const e = S.store.emails("brightline")[0];
    const sent = await call("POST", "/api/studio/emails/send", { site: "brightline", id: e.id });
    const token = /https:\/\/detailingplatform\.com\/p\/([A-Za-z0-9_-]{43})/.exec(sent.shown.body)?.[1];
    assert.ok(token, "the email's link opens on detailingplatform.com");
    await new Promise((ok) => { const t = setInterval(() => { if (db.links.size) { clearInterval(t); ok(); } }, 100); });
    const row = db.links.get(sha(token));
    assert.equal(row.purpose, "review");
    assert.equal(row.view.spec.slug, "example_brightline");
    assert.ok(row.view.profile?.business, "an example site carries its example profile, the platform has none");
    assert.ok(!JSON.stringify([...db.links.entries()]).includes(token), "the secret itself never reaches the platform");
    assert.ok(!filesUnder(dir).some((f) => readFileSync(f, "utf8").includes(token)), "nor the Studio's folder");

    // the detailer, on the hosted page
    const sec = row.view.spec.pages[0].sections[1].id;
    assert.equal(press(token, "comment", { section: sec, text: "Make the prices bigger", part: "price" }).ok, true);
    assert.equal(press(token, "thumbs", { section: sec, thumbs: "down" }).ok, true);
    assert.equal(press(token, "happy", {}).ok, true);
    assert.equal(press(token, "comment", { section: "not-a-section", text: "x" }).ok, false);
    await S.syncLinks();
    const cards = S.store.cards("brightline").filter((c) => c.source === "detailer");
    assert.deepEqual(cards.map((c) => c.patch.text), ["Make the prices bigger"]);
    const link = S.store.links("brightline")[0];
    assert.deepEqual(link.thumbs, { [sec]: "down" }); assert.ok(link.approved_at);
    assert.ok(db.events.every((x) => x.pulled_at), "every event is marked pulled");
    // pulled again (the mark was lost): applied once only
    for (const x of db.events) x.pulled_at = null;
    await S.syncLinks();
    assert.equal(S.store.cards("brightline").filter((c) => c.source === "detailer").length, 1, "an event is applied once");
    assert.equal(db.links.get(sha(token)).view.comments.length, 1, "the platform's copy shows the comment from the Studio");

    // cancel: online at once
    const r = await call("POST", "/api/studio/links/revoke", { site: "brightline", id: link.id });
    assert.equal(r.ok, true); assert.match(r.said, /no longer opens/);
    assert.ok(db.links.get(sha(token)).revoked_at, "cancelled on the platform");
    const d = await call("GET", "/api/studio/site?id=brightline");
    assert.equal(d.detailer.hosted.which, "live"); assert.equal(d.detailer.links[0].state, "cancelled");
  } finally { S.close(); srv.close(); rmSync(dir, { recursive: true, force: true }); for (const k of ["STUDIO_CLOUD_URL", "STUDIO_CLOUD_KEY", "STUDIO_BELT_STATE"]) delete process.env[k]; }
});

test("website autofill: reads the sent form's website, keeps only quoted answers, lists prices, never writes the form, shows them on the link", NEEDS, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-autofill-"));
  const db = fakeDb(), srv = await db.server;
  const web = await listen((req, res) => {
    const pages = { "/": '<h1>Brightline</h1><a href="/about">About us</a><p>Mobile detailing across Riverton and Elm Park.</p>', "/about": "<p>Sam started Brightline in 2017 with one van.</p><p>Full detail $185</p>" };
    res.writeHead(pages[req.url] ? 200 : 404, { "content-type": "text/html" }); res.end(pages[req.url] || "no");
  });
  const site = `http://127.0.0.1:${web.address().port}/`;
  db.businesses.push({ id: "11111111-1111-4111-8111-111111111111", slug: "example_brightline", name: "Brightline Auto Care" });
  db.intake.push({ business_id: "11111111-1111-4111-8111-111111111111", submitted_at: new Date().toISOString(), answers: { oldsite: site, "A2::web": true, A1: "Brightline Auto Care" } });
  writeFileSync(path.join(dir, "reply.json"), J({
    answers: [
      { id: "A2", value: "Sam started Brightline in 2017 with one van.", page: 2, quote: "Sam started Brightline in 2017 with one van." },
      { id: "A4", value: "Riverton and Elm Park", page: 1, quote: "Mobile detailing across Riverton and Elm Park." },
      { id: "A7", value: "Money back if not happy", page: 1, quote: "100% money back guarantee" },     // invented: not on the site
      { id: "A1", value: "Other name", page: 1, quote: "Brightline" },                                   // the detailer answered A1
    ],
    prices: [{ service: "Full detail", price: "$185", page: 2, quote: "Full detail $185" }, { service: "Ceramic", price: "$999", page: 2, quote: "Ceramic $999" }],
  }));
  Object.assign(process.env, { STUDIO_CLOUD_URL: `http://127.0.0.1:${srv.address().port}`, STUDIO_CLOUD_KEY: "service-key", STUDIO_READ_LOCAL: "1", BELT_STUDIO_DATA: dir,
    STUDIO_BELT_STATE: path.join(dir, "none.json"), STUDIO_CLAUDE_CMD: path.join(HERE, "test-fixtures/studio-fake-autofill.mjs"), STUDIO_FAKE_AUTOFILL: path.join(dir, "reply.json"), STUDIO_FAKE_LOG: path.join(dir, "claude.log") });
  writeFileSync(path.join(dir, "settings.json"), J({ allowed: PLAT, platform: PLAT, cloud: "live", syncSeconds: 3600 }));
  const S = createStudio({ HERE, json: (res, c, o) => res.done(o), body: (req, res, l, fn) => fn(req.body), onExit: false });
  delete process.env.BELT_STUDIO_DATA;
  const call = (method, p, b) => new Promise((done) => S.handle({ method, body: b }, { done }, new URL("http://x" + p)));
  try {
    await S.swept;
    const f = await call("GET", "/api/studio/forms");
    assert.equal(f.rows[0].name, "Brightline Auto Care"); assert.equal(f.rows[0].website, site); assert.deepEqual(f.rows[0].ticked, ["A2"]);
    const r = await call("POST", "/api/studio/forms/read", { business: "example_brightline" });
    assert.equal(r.ok, true, r.said);
    const t0 = Date.now(); let res;
    while (Date.now() - t0 < 60000) { res = S.store.form("example_brightline"); if (res?.status === "done" || res?.status === "failed") break; await new Promise((ok) => setTimeout(ok, 200)); }
    assert.equal(res.status, "done", res.said);
    assert.deepEqual(Object.keys(res.answers).sort(), ["A2", "A4"]);
    assert.equal(res.answers.A2.url, site + "about");
    assert.deepEqual(res.prices.map((p) => p.price), ["$185"], "a price not on the site is never kept");
    assert.ok(!res.questions.some((q) => q.id === "A1"), "a question the detailer answered is not read for");
    assert.equal(res.questions.find((q) => q.id === "A2").ticked, true);
    const sent = readFileSync(path.join(dir, "claude.log"), "utf8");
    assert.match(sent, /Sam started Brightline/); assert.match(sent, /"--tools",""/, "Claude gets no tools: it sees only the page text");
    assert.ok(!db.writes.some((w) => w.t === "site_intake"), "the form is never written");
    // the detailer's review link shows them, with their pages, and takes "Not right"
    S.store.addCheck("brightline", { id: "c1", site: "brightline", rev: 1, started_at: new Date().toISOString(), finished_at: new Date().toISOString(), ok: true, passed: 20, failed: 0, lines: [] });
    assert.equal((await call("POST", "/api/studio/example")).ok, true);
    S.store.addCheck("brightline", { id: "c2", site: "brightline", rev: 1, started_at: new Date().toISOString(), finished_at: new Date().toISOString(), ok: true, passed: 20, failed: 0, lines: [] });
    await call("POST", "/api/studio/links/review", { site: "brightline" });
    const sentMail = await call("POST", "/api/studio/emails/send", { site: "brightline", id: S.store.emails("brightline")[0].id });
    const token = /\/p\/([A-Za-z0-9_-]{43})/.exec(sentMail.shown.body)[1];
    await new Promise((ok) => { const t = setInterval(() => { if (db.links.size) { clearInterval(t); ok(); } }, 100); });
    const view = db.links.get(sha(token)).view;
    assert.deepEqual(view.from_website.map((x) => [x.id, x.url]), [["A2", site + "about"], ["A4", site]]);
    const { act } = await import(pathToFileURL(ACT).href);
    const row = db.links.get(sha(token)), a = act(row, "comment", { section: "website", part: "a4", text: "We also go to Hill Top" });
    assert.equal(a.ok, true);
    db.events.push({ id: 1, token_hash: sha(token), kind: "comment", body: a.event });
    await S.syncLinks();
    const c = S.store.cards("brightline").find((x) => x.source === "detailer");
    assert.equal(c.patch.text, "We also go to Hill Top"); assert.equal(c.target.section, "website"); assert.equal(c.target.part, "a4");
  } finally {
    S.close(); srv.close(); web.close(); rmSync(dir, { recursive: true, force: true });
    for (const k of ["STUDIO_CLOUD_URL", "STUDIO_CLOUD_KEY", "STUDIO_READ_LOCAL", "STUDIO_BELT_STATE", "STUDIO_CLAUDE_CMD", "STUDIO_FAKE_AUTOFILL", "STUDIO_FAKE_LOG"]) delete process.env[k];
  }
});
