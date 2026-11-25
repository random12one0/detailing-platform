// STUDIO (studio.mjs): revisions can never be changed, settings are checked, the routes answer plainly, and (S4) change
// cards: a typed fact is refused, applying makes a new revision, an old card comes back stale, going back edits nothing old.
//   node --test studio.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import os from "node:os";
import net from "node:net";
import http from "node:http";
import path from "node:path";
import { platformCopy } from "./test-fixtures/platform-copy.mjs";
import { openStore, cleanSettings, createStudio, platformProblem, REAL_REPO, STUDIO_SETTINGS, Refused, applyCards, judgeCard, copyOf } from "./studio.mjs";

const tmp = () => mkdtempSync(path.join(os.tmpdir(), "studio-test-"));

test("a revision is written once: a second write to the same number is refused and the first stays", () => {
  const dir = tmp();
  try {
    const st = openStore(dir);
    st.addSite({ id: "brightline", name: "Brightline Auto Care" });
    st.addRevision("brightline", { n: 1, spec: { schema: 1, note: "first" } });
    assert.throws(() => st.addRevision("brightline", { n: 1, spec: { schema: 1, note: "changed" } }), (e) => e instanceof Refused && /cannot be changed/.test(e.message));
    assert.equal(st.revision("brightline", 1).spec.note, "first");
    st.addRevision("brightline", { n: 2, spec: { schema: 1, note: "second" } });
    assert.deepEqual(st.revisionNumbers("brightline"), [1, 2]);
    assert.throws(() => st.addRevision("nope", { n: 1, spec: {} }), Refused);
    assert.throws(() => st.addRevision("brightline", { n: 0, spec: {} }), Refused);
    assert.throws(() => st.addSite({ id: "brightline" }), /already a site/);
    assert.throws(() => st.addSite({ id: "../etc" }), Refused);
    assert.equal(st.revision("../x", 1), null, "ids are checked before any path is built");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("a finished check is a record: it cannot be written twice", () => {
  const dir = tmp();
  try {
    const st = openStore(dir);
    st.addSite({ id: "brightline", name: "B" });
    st.addCheck("brightline", { id: "c1", rev: 1, started_at: "2026-11-05T00:00:00Z", ok: true });
    assert.throws(() => st.addCheck("brightline", { id: "c1", rev: 1, started_at: "2026-11-05T00:00:00Z", ok: false }), /EEXIST/);
    assert.equal(st.check("brightline", "c1").ok, true);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("settings: only known keys, each checked; the platform copy must be on the list, by real path, never the real repo", () => {
  const cur = Object.fromEntries(STUDIO_SETTINGS.map((s) => [s.key, s.default]));
  cur.allowed = cur.platform = platformCopy();
  const dir = tmp(), fake = tmp();
  try {
    assert.equal(cleanSettings({ previewPort: 80 }, cur).ok, false);
    assert.equal(cleanSettings({ previewPort: "5173.5" }, cur).ok, false);
    assert.equal(cleanSettings({ enginePort: cur.previewPort }, cur).key, "enginePort");
    assert.equal(cleanSettings({ checkMinutes: 99 }, cur).ok, false);
    // a folder that looks like a platform copy (it has the two files) but is not on the list: refused, nothing loaded
    mkdirSync(path.join(fake, "app/src/site"), { recursive: true }); mkdirSync(path.join(fake, "scripts/studio"), { recursive: true });
    writeFileSync(path.join(fake, "app/src/site/spec.js"), "throw new Error('must never be loaded')");
    writeFileSync(path.join(fake, "scripts/studio/studio-check.mjs"), "");
    assert.match(cleanSettings({ platform: fake }, cur).said, /not on the Studio's list/);
    assert.match(platformProblem(dir, dir), /no site renderer/, "on the list but no renderer");
    // the real repo, however it is spelled, cannot be listed or picked
    for (const f of [REAL_REPO, REAL_REPO + "/.", REAL_REPO.replace("/claude/", "/claude/./"), REAL_REPO.toUpperCase()]) {
      assert.match(cleanSettings({ allowed: f, platform: f }, cur).said, /real repo/, f);
      assert.match(platformProblem(f, f), /real repo/, f);
    }
    assert.match(cleanSettings({ allowed: "C:/nowhere-at-all" }, cur).said, /does not exist/);
    const ok = cleanSettings({ previewPort: 5200, checkMinutes: 3, sneaky: "x" }, cur);
    assert.equal(ok.ok, true, ok.said);
    assert.equal(ok.values.previewPort, 5200);
    assert.equal("sneaky" in ok.values, false);
    assert.equal(cleanSettings({ platform: platformCopy().replace(/\/([^/]+)$/, "/./$1") }, cur).ok, true, "the same copy spelled another way is the same copy");
  } finally { rmSync(dir, { recursive: true, force: true }); rmSync(fake, { recursive: true, force: true }); }
});

test("the routes: overview reads, an unknown site is a plain 404, settings save and a bad value names its field", async () => {
  const dir = tmp();
  process.env.BELT_STUDIO_DATA = dir;
  try {
    const sent = [];
    const json = (res, code, obj) => { sent.push({ code, obj }); res.done?.(); };
    const body = (req, res, limit, fn) => fn(req.body);
    const S = createStudio({ HERE: process.cwd(), json, body });
    const call = (method, p, b) => new Promise((resolve) => { const res = { done: () => resolve(sent.at(-1)) }; S.handle({ method, body: b }, res, new URL("http://x" + p)); });
    const ov = await call("GET", "/api/studio/overview");
    assert.equal(ov.code, 200);
    assert.deepEqual(ov.obj.sites, []);
    assert.equal(ov.obj.fields.length, STUDIO_SETTINGS.length);
    assert.equal((await call("GET", "/api/studio/site?id=nope")).code, 404);
    assert.equal((await call("GET", "/api/studio/revision?site=nope&n=1")).code, 404);
    const bad = await call("POST", "/api/studio/settings", { values: { previewPort: 12 } });
    assert.equal(bad.obj.ok, false); assert.equal(bad.obj.key, "previewPort");
    const good = await call("POST", "/api/studio/settings", { values: { checkMinutes: 6 } });
    assert.equal(good.obj.ok, true); assert.equal(good.obj.settings.checkMinutes, 6);
    assert.equal(JSON.parse(readFileSync(path.join(dir, "settings.json"), "utf8")).checkMinutes, 6);
    const chk = await call("POST", "/api/studio/check", { site: "nope", rev: 1 });
    assert.equal(chk.obj.ok, false);
    S.close();
  } finally { delete process.env.BELT_STUDIO_DATA; rmSync(dir, { recursive: true, force: true }); }
});


// ---------------------------------------------------------------- closing the Control Room (needs the platform copy)
const PLAT = platformCopy();
const helper = (dir, hard) => `
process.env.BELT_STUDIO_DATA = ${JSON.stringify(dir)};
const { createStudio } = await import(${JSON.stringify(new URL("./studio.mjs", import.meta.url).href)});
const S = createStudio({ HERE: ${JSON.stringify(path.dirname(new URL(import.meta.url).pathname).replace(/^\/(\w:)/, "$1"))}, json: (res, c, o) => res.done(o), body: (req, res, l, fn) => fn(req.body) });
await S.swept;
const call = (method, p, b) => new Promise((done) => S.handle({ method, body: b }, { done }, new URL("http://x" + p)));
for (const [p, b] of [["/api/studio/example"], ["/api/studio/preview/start"], ["/api/studio/check", { site: "brightline", rev: 1 }]]) { const r = await call("POST", p, b); if (!r.ok && !/already/.test(r.said)) { console.log(JSON.stringify({ error: r.said })); process.exit(3); } }
await new Promise((r) => setTimeout(r, 4000));
console.log(JSON.stringify({ check: S.store.runningCheck(), preview: S.store.previewPids() }));
${hard ? "setInterval(() => {}, 1000);" : "process.exit(0);"}
`;
const alive = (pid) => spawnSync("tasklist", ["/FI", `PID eq ${pid}`, "/NH"], { windowsHide: true, encoding: "utf8" }).stdout.includes(String(pid));
const answers = (port) => fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1500) }).then(() => true, () => false);
// Tests never use the Studio's default ports (another preview may be running on them): each picks free ones.
const freePort = () => new Promise((r) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => r(p)); }); });
const freePorts = async (dir, extra = {}) => { const [previewPort, enginePort] = [await freePort(), await freePort()]; writeFileSync(path.join(dir, "settings.json"), JSON.stringify({ previewPort, enginePort, allowed: PLAT, platform: PLAT, ...extra })); return { previewPort, enginePort }; };
async function runHelper(dir, hard) {
  await freePorts(dir);
  return new Promise((resolve, reject) => {
    const c = spawn(process.execPath, ["--input-type=module", "-e", helper(dir, hard)], { windowsHide: true, stdio: ["ignore", "pipe", "inherit"] });
    let out = ""; c.stdout.on("data", (d) => { out += d; if (hard && out.includes("\n")) resolve({ child: c, said: JSON.parse(out) }); });
    c.on("exit", () => { if (!hard) { try { resolve({ said: JSON.parse(out) }); } catch { reject(new Error(out)); } } });
  });
}
const skip = !existsSync(path.join(PLAT, "scripts/studio/studio-check.mjs")) && "needs the platform copy (run npm ci --prefix app)";

test("closing the Control Room stops a running check and the phone preview it started, and writes the check down as stopped", { skip, timeout: 120000 }, async () => {
  const dir = tmp();
  try {
    const { said } = await runHelper(dir, false);
    assert.ok(said.check?.pid && said.preview?.site, JSON.stringify(said));
    await new Promise((r) => setTimeout(r, 1500));
    for (const pid of [said.check.pid, said.preview.site, said.preview.engine]) assert.equal(alive(pid), false, `pid ${pid} still running`);
    assert.equal(await answers(said.preview.previewPort), false, "the phone preview port is quiet");
    assert.equal(await answers(said.preview.enginePort), false, "the test data port is quiet");
    const st = openStore(dir);
    assert.match(st.check("brightline", said.check.id)?.error || "", /closed while this check ran/);
    assert.equal(st.runningCheck(), null); assert.equal(st.previewPids(), null);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("a Control Room killed outright: the next start stops what it left and records the check as stopped", { skip, timeout: 150000 }, async () => {
  const dir = tmp();
  try {
    const { child, said } = await runHelper(dir, true);
    spawnSync("taskkill", ["/F", "/PID", String(child.pid)], { windowsHide: true });   // like Task Manager: no exit hook runs
    await new Promise((r) => setTimeout(r, 1000));
    assert.ok(openStore(dir).runningCheck() && openStore(dir).previewPids(), "the hard kill left its notes behind (no exit hook ran)");
    process.env.BELT_STUDIO_DATA = dir;
    const S = createStudio({ HERE: process.cwd(), json: () => {}, body: () => {}, onExit: false });
    delete process.env.BELT_STUDIO_DATA;
    await S.swept;
    await new Promise((r) => setTimeout(r, 1500));
    for (const pid of [said.check.pid, said.preview.site, said.preview.engine]) assert.equal(alive(pid), false, `pid ${pid} still running`);
    assert.match(S.store.check("brightline", said.check.id)?.error || "", /closed while this check ran/);
    assert.equal(S.store.runningCheck(), null); assert.equal(S.store.previewPids(), null);
    assert.equal(await answers(said.preview.previewPort), false); assert.equal(await answers(said.preview.enginePort), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------- S4: change cards, stale cards, going back
const SPEC = () => ({ schema: 1, pages: [{ path: "/", sections: [{ id: "hero", type: "hero", copy: { headline: "Old words.", sub: "Under." } }, { id: "menu", type: "catalog", copy: { title: "Menu" } }] }] });

test("a card's patch makes a new spec and never touches the one it was made from; going back copies the old spec", () => {
  const base = SPEC(), before = JSON.stringify(base);
  const out = applyCards(base, [{ patch: { op: "copy", section: "hero", field: "headline", from: "Old words.", to: "New words." } }, { patch: { op: "copy", section: "hero", field: "sub", from: "Under.", to: "" } }]);
  assert.equal(JSON.stringify(base), before, "the base spec is unchanged");
  assert.equal(copyOf(out, "hero", "headline"), "New words.");
  assert.equal(copyOf(out, "hero", "sub"), undefined, "empty words remove an optional line");
  const old = SPEC(); old.pages[0].sections[1].copy.title = "From revision one";
  const back = applyCards(out, [{ patch: { op: "revert", to: 1 } }], (n) => (n === 1 ? old : null));
  assert.deepEqual(back, old); assert.notEqual(back, old, "a copy, not the old revision's own object");
  assert.throws(() => applyCards(out, [{ patch: { op: "revert", to: 9 } }], () => null), /no revision 9/);
  assert.throws(() => applyCards(out, [{ patch: { op: "copy", section: "gone", field: "title", to: "x" } }]), /no longer on the site/);
});

test("a card made on an old revision is stale, or a conflict when its words changed since", () => {
  const latest = SPEC(); latest.pages[0].sections[0].copy.headline = "Changed in revision two.";
  const card = (base, section, field, from) => ({ base, patch: { op: "copy", section, field, from, to: "Mine." } });
  assert.equal(judgeCard(card(2, "hero", "headline", "Changed in revision two."), 2, latest), "proposed");
  assert.equal(judgeCard(card(1, "menu", "title", "Menu"), 2, latest), "stale", "the part is the same as when the card was made");
  assert.equal(judgeCard(card(1, "hero", "headline", "Old words."), 2, latest), "conflict", "the part changed since");
  assert.equal(judgeCard({ base: 1, patch: { op: "revert", to: 1 } }, 2, latest), "stale");
});

const PLATFORM_OK = existsSync(path.join(PLAT, "scripts/studio/studio-check.mjs")) && existsSync(path.join(PLAT, "app/node_modules/vite"));
test("cards through the routes: a typed $185 is refused, applying makes a new revision, an old card comes back stale, going back never edits an old revision",
  { skip: !PLATFORM_OK && "needs the platform copy (run npm ci --prefix app)", timeout: 180000 }, async () => {
  const dir = tmp();
  process.env.BELT_STUDIO_DATA = dir; await freePorts(dir);
  try {
    const S = createStudio({ HERE: process.cwd(), json: (res, c, o) => res.done(o), body: (req, res, l, fn) => fn(req.body), onExit: false });
    const call = (method, p, b) => new Promise((done) => S.handle({ method, body: b }, { done }, new URL("http://x" + p)));
    assert.equal((await call("POST", "/api/studio/example")).ok, true);
    const revFile = (n) => readFileSync(path.join(dir, "sites/brightline/revisions", `${n}.json`), "utf8");
    const one = revFile(1), headline = JSON.parse(one).spec.pages[0].sections.find((s) => s.id === "hero").copy.headline;

    // typed facts: refused by the validator, in plain words, and no card is made
    const typed = await call("POST", "/api/studio/card", { site: "brightline", base: 1, section: "hero", field: "headline", text: "Full detail, now $185." });
    assert.equal(typed.ok, false);
    assert.match(typed.said, /"\$185" is a price or a number typed into the wording/);
    assert.equal((await call("POST", "/api/studio/card", { site: "brightline", base: 1, section: "hero", field: "headline", text: "Open twenty-four hours." })).ok, false);
    assert.deepEqual(S.store.cardNumbers("brightline"), []);
    assert.match((await call("POST", "/api/studio/card", { site: "brightline", base: 1, section: "hero", field: "headline", text: headline })).said, /already/);

    // two cards on revision 1; applying the first makes revision 2 (after the quick check) and the second goes stale
    const a = await call("POST", "/api/studio/card", { site: "brightline", base: 1, section: "hero", field: "headline", text: "Clean cars, plain prices." });
    const b = await call("POST", "/api/studio/card", { site: "brightline", base: 1, section: "menu", field: "title", text: "The menu, by vehicle size" });
    assert.equal(a.ok && b.ok, true, a.said + " / " + b.said);
    const applied = await call("POST", "/api/studio/card/apply", { site: "brightline", ids: [a.card] });
    assert.equal(applied.ok, true, applied.said);
    assert.equal(applied.n, 2); assert.equal(applied.quick.ok, true);
    assert.equal(S.store.revision("brightline", 2).spec.pages[0].sections[0].copy.headline, "Clean cars, plain prices.");
    assert.equal(S.store.card("brightline", a.card).status, "applied");
    assert.equal(S.store.card("brightline", b.card).status, "stale", "made on revision 1, which is no longer the latest");
    const refused = await call("POST", "/api/studio/card/apply", { site: "brightline", ids: [b.card] });
    assert.equal(refused.ok, false); assert.equal(refused.status, "stale"); assert.match(refused.said, /made on revision 1, and the site is at revision 2/);
    assert.deepEqual(S.store.revisionNumbers("brightline"), [1, 2], "a stale card makes no revision");
    // a card on revision 1 for the headline, which revision 2 changed: a conflict, not just stale
    const c = await call("POST", "/api/studio/card", { site: "brightline", base: 1, section: "hero", field: "headline", text: "Something else." });
    assert.equal(S.store.card("brightline", c.card).status, "conflict");
    // made again on the latest: a new card; the stale one is kept, binned, and says which card replaced it
    const redo = await call("POST", "/api/studio/card/redo", { site: "brightline", id: b.card });
    assert.equal(redo.ok, true, redo.said);
    assert.equal(S.store.card("brightline", redo.card).base, 2);
    assert.equal(S.store.card("brightline", b.card).redone_as, redo.card);

    // going back to revision 1 is a NEW revision with revision 1's spec; revisions 1 and 2 are not touched
    const two = revFile(2);
    assert.equal((await call("POST", "/api/studio/undo", { site: "brightline", to: 1, base: 1 })).ok, false, "a stale view cannot go back");
    const back = await call("POST", "/api/studio/undo", { site: "brightline", to: 1, base: 2 });
    assert.equal(back.ok, true, back.said);
    assert.equal(back.n, 3);
    assert.deepEqual(S.store.revision("brightline", 3).spec, JSON.parse(one).spec);
    assert.equal(S.store.revision("brightline", 3).parent, 2);
    assert.equal(revFile(1), one, "revision 1 is byte for byte the same");
    assert.equal(revFile(2), two, "revision 2 is byte for byte the same");
    assert.equal(S.store.card("brightline", redo.card).status, "stale", "the card made on revision 2 is now out of date too");
    assert.throws(() => S.store.addRevision("brightline", { n: 2, spec: {} }), /cannot be changed/);
    S.close();
  } finally { delete process.env.BELT_STUDIO_DATA; rmSync(dir, { recursive: true, force: true }); }
});


// ---------------------------------------------------------------- S4 review fixes (REVIEW-S4.md)
const reviewStudio = async (dir) => {
  process.env.BELT_STUDIO_DATA = dir; await freePorts(dir);
  const S = createStudio({ HERE: process.cwd(), json: (res, c, o) => res.done(o), body: (req, res, l, fn) => fn(req.body), onExit: false });
  const call = (method, p, b) => new Promise((done) => S.handle({ method, body: b }, { done }, new URL("http://x" + p)));
  const card = (base, section, field, text) => call("POST", "/api/studio/card", { site: "brightline", base, section, field, text });
  assert.equal((await call("POST", "/api/studio/example")).ok, true);
  return { S, call, card };
};
const NEEDS = { skip: !PLATFORM_OK && "needs the platform copy (run npm ci --prefix app)", timeout: 240000 };

test("review S4 F2: loading the example file waits for Apply, never undoes applied cards, and re-judges open cards", NEEDS, async () => {
  const dir = tmp();
  try {
    const { S, call, card } = await reviewStudio(dir);
    const a = await card(1, "hero", "headline", "Clean cars, plain prices.");
    const applying = call("POST", "/api/studio/card/apply", { site: "brightline", ids: [a.card] });
    await new Promise((r) => setTimeout(r, 50));
    assert.match((await call("POST", "/api/studio/revision", { site: "brightline" })).said, /already being applied/, "it waits its turn");
    assert.equal((await applying).n, 2);
    const undoing = await call("POST", "/api/studio/revision", { site: "brightline" });
    assert.equal(undoing.ok, false); assert.match(undoing.said, /would undo them/, "the file does not have card 1's words");
    assert.deepEqual(S.store.revisionNumbers("brightline"), [1, 2]);
    assert.equal((await call("GET", "/api/studio/site?id=brightline")).applied, true, "the page is told, so it hides the button");
    S.close();
  } finally { delete process.env.BELT_STUDIO_DATA; rmSync(dir, { recursive: true, force: true }); }
});

test("review S4 F3: a conflict card carries what the LATEST revision says, whichever revision the page shows", NEEDS, async () => {
  const dir = tmp();
  try {
    const { S, call, card } = await reviewStudio(dir);
    const a = await card(1, "hero", "headline", "Clean cars, plain prices.");
    assert.equal((await call("POST", "/api/studio/card/apply", { site: "brightline", ids: [a.card] })).n, 2);
    const c = await card(1, "hero", "headline", "Something else.");
    assert.equal(S.store.card("brightline", c.card).status, "conflict");
    assert.equal((await call("GET", "/api/studio/site?id=brightline")).cards.find((x) => x.id === c.card).now, "Clean cars, plain prices.");
    S.close();
  } finally { delete process.env.BELT_STUDIO_DATA; rmSync(dir, { recursive: true, force: true }); }
});

test("review S4 F5, F6: conflicts are re-judged, a change already made is not a card, and the same change is one card", NEEDS, async () => {
  const dir = tmp();
  try {
    const { S, call, card } = await reviewStudio(dir);
    const a = await card(1, "hero", "headline", "Clean cars, plain prices.");
    assert.equal((await call("POST", "/api/studio/card/apply", { site: "brightline", ids: [a.card] })).n, 2);
    const b = await card(2, "menu", "title", "The menu, by vehicle size");
    assert.equal(b.ok, true);
    assert.match((await card(2, "menu", "title", "The menu, by vehicle size")).said, new RegExp(`Card ${b.card} already makes this change`));
    assert.match((await card(1, "hero", "headline", "Clean cars, plain prices.")).said, /Revision 2 already says this/);
    const c = await card(1, "hero", "headline", "Something else.");
    assert.equal(S.store.card("brightline", c.card).status, "conflict");
    // back to revision 1 (as 3): the headline is as card c found it, so c is only stale now
    assert.equal((await call("POST", "/api/studio/undo", { site: "brightline", to: 1, base: 2 })).n, 3);
    assert.equal(S.store.card("brightline", c.card).status, "stale");
    assert.equal(S.store.card("brightline", b.card).status, "stale");
    // forward to revision 2 again (as 4): a stale card asking for revision 2's headline has nothing left to do
    const d = await card(3, "hero", "headline", "Clean cars, plain prices.");
    assert.equal(d.ok, true);
    const e = await card(1, "hero", "headline", "Clean cars, plain prices!");
    assert.equal((await call("POST", "/api/studio/undo", { site: "brightline", to: 2, base: 3 })).n, 4);
    assert.equal(S.store.card("brightline", d.card).status, "binned");
    assert.match(S.store.card("brightline", d.card).why, /Revision 4 already says this/);
    assert.equal(S.store.card("brightline", e.card).status, "conflict");
    S.close();
  } finally { delete process.env.BELT_STUDIO_DATA; rmSync(dir, { recursive: true, force: true }); }
});

test("review S4 F4: cards made while an apply runs never stay 'proposed' on a revision that is no longer the latest", NEEDS, async () => {
  const dir = tmp();
  try {
    const { S, call, card } = await reviewStudio(dir);
    const a = await card(1, "hero", "headline", "Clean cars, plain prices.");
    const applying = call("POST", "/api/studio/card/apply", { site: "brightline", ids: [a.card] });
    // cards keep arriving through the whole apply, so some are still being checked when it ends
    const words = ["Ask us anything", "Pick your care", "We come to you", "Calm and careful", "Clean and quick", "Book in a minute", "Prices you can check", "Care you can see",
      "Done right", "Good as new", "Washed by hand", "Look closer", "Shine on", "Every detail", "Ready when you are", "On your driveway", "Neat work", "Plain prices", "Here to help", "Fresh inside"];
    const made = [];
    let done = false; applying.then(() => { done = true; });
    for (let i = 0; i < words.length && !done; i++) { made.push(card(1, "menu", "intro", words[i])); await new Promise((r) => setTimeout(r, 250)); }
    assert.equal((await applying).n, 2);
    await Promise.all(made);
    assert.deepEqual(S.store.cards("brightline").filter((c) => c.base === 1 && c.status === "proposed").map((c) => c.id), [],
      "every card made on revision 1 is out of date once revision 2 exists");
    S.close();
  } finally { delete process.env.BELT_STUDIO_DATA; rmSync(dir, { recursive: true, force: true }); }
});

test("ports held by other programs: the Studio still answers at once, says so plainly, and the phone preview takes free ports",
  { skip: !PLATFORM_OK && "needs the platform copy (run npm ci --prefix app)", timeout: 180000 }, async (t) => {
  const dir = tmp();
  const { previewPort, enginePort } = await freePorts(dir);
  // one answers like another dev server, the other accepts and never answers
  const other = http.createServer((q, s) => { s.writeHead(200, { "content-type": "text/html" }); s.end("<h1>someone else</h1>"); }).listen(previewPort, "127.0.0.1");
  const silent = net.createServer(() => {}).listen(enginePort, "127.0.0.1");
  process.env.BELT_STUDIO_DATA = dir;
  const S = createStudio({ HERE: process.cwd(), json: (res, c, o) => res.done(o), body: (req, res, l, fn) => fn(req.body), onExit: false });
  delete process.env.BELT_STUDIO_DATA;
  t.after(async () => { await call("POST", "/api/studio/preview/stop").catch(() => {}); S.close(); other.close(); silent.close(); rmSync(dir, { recursive: true, force: true }); });
  const call = (method, p, b) => new Promise((done) => S.handle({ method, body: b }, { done }, new URL("http://x" + p)));
  const t0 = Date.now();
  const ov = await call("GET", "/api/studio/overview");
  assert.ok(Date.now() - t0 < 5000, `the overview took ${Date.now() - t0} ms`);
  assert.deepEqual(ov.sites, []);
  assert.equal(ov.preview.running, false);
  assert.equal(ov.preview.error, null, "a port someone else holds is not an error");
  assert.match(ov.preview.note, new RegExp(`Port ${previewPort} is in use by another program, so the phone preview will use a free port`));
  const on = await call("POST", "/api/studio/preview/start");
  assert.equal(on.ok, true, on.said);
  const pids = S.store.previewPids();
  assert.notEqual(pids.previewPort, previewPort); assert.notEqual(pids.enginePort, enginePort);
  const now = (await call("GET", "/api/studio/overview")).preview;
  assert.equal(now.running, true);
  assert.equal(now.url, `http://127.0.0.1:${pids.previewPort}/site/preview`);
  assert.equal((await call("POST", "/api/studio/preview/stop")).ok, true);
  assert.equal((await call("GET", "/api/studio/overview")).preview.running, false);
});
