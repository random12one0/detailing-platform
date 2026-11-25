// STUDIO S7, the detailer in the loop (STUDIO-SPEC.md §1d, §5a, §5b, §7 row S7), with the review's fixes (REVIEW-S7.md).
//   - expired and cancelled links refuse (and an unknown one, or one whose email is not approved yet, finds nothing);
//   - one detailer's link can never show or write another site's revision or comments;
//   - a comment becomes a change card for Andrew, never an AI job; only his press asks the AI, which is told the words
//     are the detailer's;
//   - emails are drafts Andrew can edit until his Send; a link's secret is made at Send and never stored;
//   - "We made your changes" says what really happened to each of this round's comments, with a new link;
//   - the link server answers every malformed request in words and keeps running;
//   - the preview page's booking never calls create-booking (real browser, real renderer, the offline dashboard).
//   node --test studio-detailer.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createStudio } from "./studio.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLAT = (process.env.SITE_ACCEPTANCE_PLATFORM || "C:/studio-work/s1").replace(/\\/g, "/");
const NEEDS = { skip: !existsSync(path.join(PLAT, "app/src/site/Detailer.jsx")) && `needs the platform copy with the S7 renderer at ${PLAT}`, timeout: 400000 };
const J = (o) => JSON.stringify(o);
const ORIGIN = "http://127.0.0.1:1234";   // the preview page's origin, as the Studio records it
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms, what) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await fn(); if (v) return v; await sleep(200); } throw new Error(`timed out waiting for ${what}`); };

function studio(dir, settings = {}) {
  process.env.BELT_STUDIO_DATA = dir;
  process.env.STUDIO_CLAUDE_CMD = path.join(HERE, "test-fixtures/studio-fake-claude.mjs");
  process.env.STUDIO_BELT_STATE = path.join(dir, "no-belt-state.json");
  writeFileSync(path.join(dir, "settings.json"), J({ allowed: PLAT, platform: PLAT, ...settings }));
  const S = createStudio({ HERE, json: (res, c, o) => res.done(o), body: (req, res, l, fn) => fn(req.body), onExit: false });
  delete process.env.BELT_STUDIO_DATA;
  S.call = (method, p, b) => new Promise((done) => S.handle({ method, body: b }, { done }, new URL("http://x" + p)));
  return S;
}
const done = () => { for (const k of ["STUDIO_CLAUDE_CMD", "STUDIO_BELT_STATE", "STUDIO_FAKE_LOG"]) delete process.env[k]; };
const checked = (S, site, rev = 1) => S.store.addCheck(site, { id: "c" + Date.now() + site.length + rev, site, rev, started_at: new Date().toISOString(), finished_at: new Date().toISOString(), ok: true, passed: 20, failed: 0, lines: [] });
// Send the newest draft of a kind and take its secret from what would be sent (shown this once)
async function sendAndGet(S, site, kind) {
  const e = S.store.emails(site).find((x) => x.kind === kind && x.status === "draft");
  const r = await S.call("POST", "/api/studio/emails/send", { site, id: e.id });
  assert.equal(r.ok, true, r.said);
  return /\/site\/p\/([A-Za-z0-9_-]{43})/.exec(r.shown.body)[1];
}
const linkCall = async (L, token, what = "", body, origin = ORIGIN) => {
  const r = await fetch(`${L.url}/p/${token}${what ? "/" + what : ""}`, body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json", origin }, body: typeof body === "string" ? body : J(body) });
  return { status: r.status, ...(await r.json().catch(() => ({}))) };
};
// a raw request line, for what fetch would never send ("GET //", a wrong Host)
const raw = (port, text) => new Promise((resolve) => { const s = net.connect(port, "127.0.0.1", () => s.end(text)); let out = ""; s.on("data", (d) => { out += d; }); s.on("close", () => resolve(out)); s.on("error", () => resolve(out)); setTimeout(() => s.destroy(), 5000); });
const filesUnder = (d) => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? filesUnder(p) : [p]; });

test("links: refuse when expired, cancelled or not yet sent; one site's link never reaches another's; drafts wait for Send; no secret is stored", NEEDS, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-detailer-"));
  const S = studio(dir);
  try {
    await S.swept;
    S.store.savePreviewPids({ previewPort: 1234 });
    assert.equal((await S.call("POST", "/api/studio/example")).ok, true);
    const spec = structuredClone(S.store.revision("brightline", 1).spec);
    spec.pages[0].sections.find((s) => s.type === "hero").copy.headline = "The other shop's headline.";
    S.store.addSite({ id: "othershop", name: "Other Shop", town: "", business: spec.slug, kind: "example", status: "drafting", created_at: new Date().toISOString() });
    S.store.addRevision("othershop", { n: 1, site: "othershop", created_at: new Date().toISOString(), author: "you", note: "test", spec_hash: "x", spec });
    assert.match((await S.call("POST", "/api/studio/links/review", { site: "brightline" })).said, /connection check/);
    checked(S, "brightline"); checked(S, "othershop");
    assert.equal((await S.call("POST", "/api/studio/links/review", { site: "brightline" })).ok, true);
    await S.call("POST", "/api/studio/links/review", { site: "othershop" });
    const L = await S.startLinks();
    // the draft: the business by name, a placeholder where the link goes, a plain date marker, a sign-off; editable
    const em = S.store.emails("brightline")[0];
    assert.equal(em.status, "draft"); assert.ok(em.to.includes("@"));
    assert.match(em.body, /^Hi Brightline Auto Care team,/); assert.match(em.body, /\{\{link\}\}/); assert.match(em.body, /Andrew\nDetailing Platform/);
    assert.match(em.body, /reply to this email and we will send a new one/);
    assert.equal((await S.call("POST", "/api/studio/emails/edit", { site: "brightline", id: em.id, body: "No link here." })).ok, false, "a draft with a link keeps {{link}}");
    assert.equal((await S.call("POST", "/api/studio/emails/edit", { site: "brightline", id: em.id, subject: "Your new site", body: em.body.replace("Your new website", "Your new website (draft one)") })).ok, true);
    assert.equal(S.store.email("brightline", em.id).subject, "Your new site");
    // before Send the link has no secret and opens nothing
    assert.equal(S.store.links("brightline")[0].hash, null);
    const a = await sendAndGet(S, "brightline", "review"), b = await sendAndGet(S, "othershop", "review");
    assert.equal((await S.call("POST", "/api/studio/emails/edit", { site: "brightline", id: em.id, subject: "x" })).ok, false, "an approved email cannot change");
    // REVIEW S7 F3: the secret is nowhere on disk, not in the link, not in the email
    for (const f of filesUnder(dir)) { const t = readFileSync(f, "utf8"); assert.ok(!t.includes(a) && !t.includes(b), `no secret in ${f}`); }
    assert.match(new Date(S.store.links("brightline")[0].expires_at).toString(), /\d/);

    // ISOLATION
    const va = await linkCall(L, a), vb = await linkCall(L, b);
    assert.equal(va.business, "Brightline Auto Care"); assert.equal(vb.business, "Other Shop");
    assert.match(J(vb.spec), /The other shop's headline/); assert.doesNotMatch(J(va.spec), /The other shop's headline/);
    const ca = await linkCall(L, a, "comment", { section: "hero", part: "headline", at: { x: 500, y: 40 }, text: "Use our slogan here", site: "othershop", revision: 1 });
    assert.equal(ca.ok, true, ca.said);
    assert.equal(S.store.comments("othershop").length, 0); assert.equal(S.store.comments("brightline").length, 1);
    assert.equal((await linkCall(L, b)).comments.length, 0); assert.equal((await linkCall(L, a)).comments.length, 1);
    assert.equal((await linkCall(L, a.slice(0, -1) + (a.endsWith("A") ? "B" : "A"))).status, 404);
    assert.equal((await linkCall(L, S.store.links("brightline")[0].hash)).status, 404);
    assert.equal((await linkCall(L, a, "comment", { section: "hero", text: "x" }, "http://evil.test")).status, 403);

    // A COMMENT IS A CARD, NEVER AN AI JOB; only Andrew's press asks, and the AI is told the words are the detailer's
    const card = S.store.cards("brightline").find((c) => c.source === "detailer");
    assert.equal(card.patch.text, "Use our slogan here"); assert.equal(S.store.jobs().length, 0);
    assert.match((await S.call("POST", "/api/studio/card/apply", { site: "brightline", ids: [card.id] })).said, /request, not a change/);
    process.env.STUDIO_FAKE_LOG = path.join(dir, "fake-calls.jsonl");
    assert.equal((await S.call("POST", "/api/studio/card/ask", { site: "brightline", id: card.id })).ok, true);
    const prompt = await until(() => { try { return JSON.parse(readFileSync(process.env.STUDIO_FAKE_LOG, "utf8").trim().split("\n")[0]).prompt; } catch { return null; } }, 30000, "the AI call");
    assert.match(prompt, /QUOTED FROM THE DETAILER/); assert.match(prompt, /^REQUEST: Use our slogan here$/m);

    // REVIEW S7 F4: votes are one per part, replaced, and never use up the room for comments
    for (let i = 0; i < 320; i++) await linkCall(L, a, "thumbs", { section: "work", thumbs: i % 2 ? "up" : "down" });
    assert.equal((await linkCall(L, a, "comment", { section: "visit", text: "Still room for this" })).ok, true);
    assert.deepEqual(S.store.links("brightline").find((l) => l.hash).thumbs, { work: "up" }, "the last of 320 votes, one per part");
    assert.equal((await linkCall(L, a, "thumbs", { section: "work", thumbs: null })).said, "Your vote is removed.");
    // REVIEW S7 F5: comment text must be words; an unreadable expiry is expired
    assert.equal((await linkCall(L, a, "comment", { section: "hero", text: { a: 1 } })).status, 400);
    assert.equal((await linkCall(L, a, "comment", { section: "nope", text: "x" })).status, 400);
    // REVIEW S7 Low: too long gets words; a wrong Host gets nothing
    const big = await linkCall(L, a, "comment", J({ section: "hero", text: "x".repeat(9000) }));
    assert.equal(big.status, 413); assert.match(big.said, /too long/);
    assert.match(await raw(L.port, `GET /p/${a} HTTP/1.1\r\nHost: evil.test\r\nConnection: close\r\n\r\n`), /^HTTP\/1\.1 421/);
    // REVIEW S7 F1: malformed addresses are answered, and the server keeps going
    for (const line of ["GET // HTTP/1.1", "GET http://[ HTTP/1.1", "GET /p/%E0%A4%A HTTP/1.1"])
      assert.match(await raw(L.port, `${line}\r\nHost: 127.0.0.1:${L.port}\r\nConnection: close\r\n\r\n`), /^HTTP\/1\.1 (400|404)/, line);
    assert.equal((await linkCall(L, a)).ok, true, "still answering");
    assert.equal((await linkCall(L, a, "happy", {})).ok, true);

    // CANCELLED and EXPIRED refuse, reads and writes alike, with who to ask
    const la = S.store.links("brightline").find((l) => l.hash);
    assert.equal((await S.call("POST", "/api/studio/links/revoke", { site: "brightline", id: la.id })).ok, true);
    const gone = await linkCall(L, a);
    assert.equal(gone.status, 410); assert.match(gone.said, /cancelled\. Reply to our email/);
    assert.equal((await linkCall(L, a, "comment", { section: "hero", text: "late" })).status, 410);
    const lb = S.store.links("othershop")[0];
    S.store.saveLink({ ...lb, expires_at: new Date(Date.now() - 1000).toISOString() });
    assert.match((await linkCall(L, b)).said, /expired/);
    S.store.saveLink({ ...lb, expires_at: "not a date" });
    assert.equal((await linkCall(L, b)).status, 410, "an unreadable expiry is expired");

    // "Ask me before every email: No": approved as drafted (still nothing sent), shown once
    await S.call("POST", "/api/studio/settings", { values: { askBeforeEmail: "no" } });
    const r = await S.call("POST", "/api/studio/links/review", { site: "brightline" });
    assert.equal(S.store.emails("brightline")[0].status, "approved"); assert.match(r.shown.body, /\/site\/p\//);
  } finally { S.close(); done(); rmSync(dir, { recursive: true, force: true }); }
});

test("REVIEW S7 F2: 'We made your changes' says what really happened to this round's comments, with a new link to the newest revision", NEEDS, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-detailer-"));
  const S = studio(dir);
  try {
    await S.swept;
    S.store.savePreviewPids({ previewPort: 1234 });
    await S.call("POST", "/api/studio/example");
    checked(S, "brightline");
    await S.call("POST", "/api/studio/links/review", { site: "brightline" });
    const L = await S.startLinks(), a = await sendAndGet(S, "brightline", "review");
    const say = async (section, text) => (await linkCall(L, a, "comment", { section, text })).card;
    const done1 = await say("hero", "Make the headline say: Clean cars, no fuss.");   // the AI makes a card; Andrew applies it
    const dash = await say("menu", "Make it $10 cheaper");                             // a fact: the dashboard place
    const kept = await say("work", "Use a different photo order");                     // Andrew keeps it as it is
    const fail = await say("visit", "Test: the CLI crashes");                          // the AI fails: nothing changed
    const wait = await say("book", "Something we have not looked at yet");             // nothing done yet
    for (const k of [done1, dash, fail]) assert.equal((await S.call("POST", "/api/studio/card/ask", { site: "brightline", id: k })).ok, true);
    assert.equal((await S.call("POST", "/api/studio/card/keep", { site: "brightline", id: kept, why: "" })).ok, false, "a reason is asked for");
    assert.equal((await S.call("POST", "/api/studio/card/keep", { site: "brightline", id: kept, why: "the order is yours to set in the gallery" })).ok, true);
    await until(() => S.store.jobs().filter((j) => j.kind === "interpret").every((j) => ["done", "failed"].includes(j.status)), 60000, "the AI jobs");
    const made = S.store.cards("brightline").find((c) => c.source === "detailer-ai");
    assert.ok(made, "a card from the detailer's comment, through the AI");
    // asked but not applied yet is "not changed yet" (the old email said "done" the moment Andrew asked)
    assert.equal((await S.call("POST", "/api/studio/emails/changes", { site: "brightline" })).ok, true);
    const early = S.store.emails("brightline").find((e) => e.kind === "changes");
    assert.ok(early.body.includes('"Make the headline say: Clean cars, no fuss.": not changed yet.'), early.body);
    // this round is in the early email; nothing new since, so another email has nothing to say
    assert.match((await S.call("POST", "/api/studio/emails/changes", { site: "brightline" })).said, /No new comments/);
    const ap = await S.call("POST", "/api/studio/card/apply", { site: "brightline", ids: [made.id] });
    assert.equal(ap.ok, true, ap.said);
    S.store.saveEmail("brightline", { ...early, created_at: "2000-01-01T00:00:00.000Z" });   // as if the early email were from an earlier round
    // the email shows the newest revision, so it waits for that revision's check
    assert.match((await S.call("POST", "/api/studio/emails/changes", { site: "brightline" })).said, /Revision 2.*connection check/);
    checked(S, "brightline", 2);
    assert.equal((await S.call("POST", "/api/studio/emails/changes", { site: "brightline" })).ok, true);
    const em = S.store.emails("brightline").filter((e) => e.kind === "changes").sort((x, y) => y.id - x.id)[0];
    assert.ok(em.body.includes("\"Make the headline say: Clean cars, no fuss.\": done (in revision 2)."), em.body);
    assert.ok(em.body.includes("\"Make it $10 cheaper\": this is set in your dashboard: Business > "), em.body);
    assert.ok(em.body.includes("\"Use a different photo order\": kept as it is: the order is yours to set in the gallery."), em.body);
    assert.ok(em.body.includes("\"Test: the CLI crashes\": not changed yet."), em.body);
    assert.ok(em.body.includes("\"Something we have not looked at yet\": not changed yet."), em.body);
    assert.equal((em.body.match(/: done/g) || []).length, 1, "only the applied one is done");
    // a NEW link, for the newest revision (the old link keeps showing what was commented on)
    const nl = S.store.links("brightline").find((l) => l.id === em.link);
    assert.equal(nl.revision, 2); assert.notEqual(nl.id, S.store.links("brightline").find((l) => l.revision === 1).id);
    const sent = await S.call("POST", "/api/studio/emails/send", { site: "brightline", id: em.id });
    const c2 = /\/site\/p\/([A-Za-z0-9_-]{43})/.exec(sent.shown.body)[1];
    assert.equal((await linkCall(L, c2)).revision, 2); assert.equal((await linkCall(L, a)).revision, 1);
    // the next email takes only comments made after this one
    await say("hero", "One more thing");
    assert.equal((await S.call("POST", "/api/studio/emails/changes", { site: "brightline" })).ok, true);
    const third = S.store.emails("brightline").filter((e) => e.kind === "changes").sort((x, y) => y.id - x.id)[0];
    assert.match(third.body, /"One more thing": not changed yet/); assert.doesNotMatch(third.body, /Clean cars/);
  } finally { S.close(); done(); rmSync(dir, { recursive: true, force: true }); }
});

test("the preview page: a detailer can use it, comment, ask for a change and say they are happy; its booking never calls create-booking", NEEDS, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-detailer-"));
  const S = studio(dir);
  const { chromium } = createRequire(path.join(PLAT, "app/package.json"))("playwright");
  const { walkBooking } = await import(pathToFileURL(path.join(PLAT, "scripts/studio/booking-walk.mjs")).href);
  const browser = await chromium.launch();
  try {
    await S.swept;
    await S.call("POST", "/api/studio/example");
    checked(S, "brightline");
    const on = await S.call("POST", "/api/studio/preview/start");
    assert.equal(on.ok, true, on.said);
    await S.call("POST", "/api/studio/links/review", { site: "brightline" });
    const e = S.store.emails("brightline")[0], sent = await S.call("POST", "/api/studio/emails/send", { site: "brightline", id: e.id });
    const url = /http:\/\/\S+\/site\/p\/\S+/.exec(sent.shown.body)[0];
    const engine = `http://127.0.0.1:${S.store.previewPids().enginePort}`;
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const problems = [];
    page.on("console", (m) => { if (["error", "warning"].includes(m.type()) && !/status of 409/.test(m.text())) problems.push(m.text()); });
    page.on("pageerror", (x) => problems.push(x.message));
    await page.goto(url, { waitUntil: "networkidle" });
    await page.locator('[data-section="hero"] h1').waitFor();
    assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex, nofollow");
    const before = (await (await fetch(`${engine}/__demo/calls`)).json()).filter((c) => /create-booking/.test(c.path)).length;
    const walk = await walkBooking(page);
    assert.ok(walk.shownTotal); assert.equal(walk.confirmed, false);
    assert.match(walk.why, /This is a preview, nothing was booked/);
    assert.equal((await (await fetch(`${engine}/__demo/calls`)).json()).filter((c) => /create-booking/.test(c.path)).length, before, "create-booking was never called");
    // Comment on the headline
    await page.goto(url, { waitUntil: "networkidle" });
    await page.locator(".dp-seg button", { hasText: "Comment" }).click();
    await page.locator('[data-section="hero"] h1').click();
    await page.locator("#dpText").fill("Make this sound more like us");
    await page.locator(".dp-sheet button[type=submit]").click();
    await page.locator(".dp-pin").first().waitFor();
    // REVIEW S7 F6: "Change it" asks what to change, and that makes a card too
    await page.locator(".dp-end li", { hasText: "Prices" }).locator("button", { hasText: "Change it" }).click();
    await page.locator("#dpText").waitFor();
    await page.locator("#dpText").fill("The prices should be bigger");
    await page.locator(".dp-sheet button[type=submit]").click();
    await until(() => S.store.cards("brightline").filter((c) => c.source === "detailer").length === 2, 15000, "two cards");
    assert.equal(S.store.links("brightline")[0].thumbs.menu, "down");
    assert.equal(S.store.jobs().length, 0, "no AI work started by the detailer");
    await page.locator(".dp-happy").click();
    await page.locator(".dp-done").waitFor();
    assert.deepEqual(problems, []);
  } finally { await browser.close().catch(() => {}); await S.call("POST", "/api/studio/preview/stop"); S.close(); done(); rmSync(dir, { recursive: true, force: true }); }
});
