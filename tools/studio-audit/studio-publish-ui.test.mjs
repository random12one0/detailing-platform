// STUDIO S8, in a real browser: the Publish pane at 1440, 768 and 390. The real gates run on Brightline's revision
// (studio-grade.mjs), Publish asks "Press again" and then puts it live on its test address, the live site opens from
// the pane and shows that release, the nightly check runs on demand and matches. Every new control is focused and
// clicked. The example business is made a paying customer for this rehearsal (STUDIO_EXAMPLE_PAYING=1). A few minutes.
//   node --test studio-publish-ui.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStudio, openStore } from "./studio.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLAT = (process.env.SITE_ACCEPTANCE_PLATFORM || "C:/studio-work/s1").replace(/\\/g, "/");
const ready = existsSync(path.join(PLAT, "scripts/studio/studio-parity.mjs")) && existsSync(path.join(PLAT, "app/node_modules/playwright"));
const freePort = () => new Promise((r) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => r(p)); }); });
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { try { const v = await fn(); if (v) return v; } catch {} await new Promise((r) => setTimeout(r, 400)); } return false; };

test("Publish pane: run the gates, publish (press twice), open the live site, check it now; at 1440, 768 and 390", { skip: !ready && `needs the platform copy with S8 at ${PLAT}`, timeout: 900000 }, async (t) => {
  const data = mkdtempSync(path.join(os.tmpdir(), "studio-publish-ui-"));
  const env = { STUDIO_BELT_STATE: path.join(data, "no-belt-state.json"), STUDIO_EXAMPLE_PAYING: "1" };
  writeFileSync(path.join(data, "settings.json"), JSON.stringify({ allowed: PLAT, platform: PLAT, previewPort: await freePort(), enginePort: await freePort(), linkPort: await freePort() }));
  Object.assign(process.env, env, { BELT_STUDIO_DATA: data });
  const S = createStudio({ HERE, json: (res, c, o) => res.done(o), body: (q, r, l, fn) => fn(q.body), onExit: false });
  delete process.env.BELT_STUDIO_DATA;
  const call = (method, p, b) => new Promise((done) => S.handle({ method, body: b }, { done }, new URL("http://x" + p)));
  await S.swept;
  await call("POST", "/api/studio/example");
  const rev = S.store.revision("brightline", 1), now = new Date().toISOString();
  // the connection check and the detailer's yes, as their runs record them (each is proved in its own test)
  S.store.addCheck("brightline", { id: "c1", site: "brightline", rev: 1, spec_hash: rev.spec_hash, started_at: now, finished_at: now, ok: true, passed: 20, failed: 0, lines: [] });
  S.store.saveLink({ id: "kpublishui1", hash: null, site: "brightline", purpose: "review", revision: 1, created_at: now, expires_at: null, revoked_at: null, thumbs: {}, approved_at: now });
  S.close();
  const port = await freePort();
  const cr = spawn(process.execPath, ["server.mjs"], { cwd: HERE, windowsHide: true, stdio: "ignore", env: { ...process.env, ...env, PORT: String(port), BELT_STUDIO_DATA: data } });
  const { chromium } = createRequire(path.join(PLAT, "app/package.json"))("playwright");
  const browser = await chromium.launch();
  const base = `http://127.0.0.1:${port}`;
  t.after(async () => {
    await browser.close().catch(() => {});
    await fetch(`${base}/api/studio/preview/stop`, { method: "POST" }).catch(() => {});
    spawnSync("taskkill", ["/T", "/F", "/PID", String(cr.pid)], { windowsHide: true, stdio: "ignore" });
    for (const k of Object.keys(env)) delete process.env[k];
    rmSync(data, { recursive: true, force: true });
  });
  assert.ok(await until(() => fetch(base + "/").then((r) => r.ok), 30000), "the preview Control Room did not start");
  const clicked = [];
  const open = async (w, h) => {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const problems = [], bad = [];
    page.on("console", (m) => { if (["error", "warning"].includes(m.type()) && !/status of (403|409)/.test(m.text())) problems.push(m.text()); });
    page.on("pageerror", (e) => problems.push(e.message));
    page.on("response", (r) => { const u = new URL(r.url()); if (r.status() >= 400 && u.pathname.startsWith("/api/studio/")) bad.push(`${r.status()} ${u.pathname}`); });
    const press = async (loc, what) => { await loc.first().focus(); await loc.first().click(); clicked.push(`${w}: ${what}`); await page.waitForTimeout(400); };
    const S2 = (sel) => page.locator("#viewStudio " + sel);
    await page.goto(`${base}/?nx=1#tab=studio`);
    await press(S2('[data-act="open"][data-site="brightline"]'), "open the site");
    await S2(".sitehead").waitFor();
    await press(w >= 1100 ? S2('.vseg [data-pane="live"]') : S2('[role=tab][data-pane="live"]'), "the Publish view");
    await S2("#stuPubH").waitFor();
    return { page, problems, bad, press, S: S2 };
  };
  const text = (o) => o.S("#stuPane-live").innerText();
  // 1440: the phone preview (to open the live site), the gates, Publish twice, open it, check it now
  let o = await open(1440, 900);
  assert.match(await text(o), /Brightline Auto Care said “I'm happy with it” on revision 1/);
  assert.ok(await until(async () => /pays for a website/.test(await text(o)), 30000), "the dashboard says it pays");
  assert.equal(await o.S('[data-act="publish"]').isDisabled(), true, "Publish waits for the gates");
  await o.press(o.S('[data-act="pubgates"]'), "Run the gates");
  assert.ok(await until(async () => /Every gate passed on revision 1/.test(await text(o)), 400000), `the gates: ${await text(o)}`);
  await o.press(o.S('[data-act="publish"]'), "Publish (first press)");
  assert.match(await o.S('[data-act="publish"]').innerText(), /Press again to publish Brightline Auto Care/);
  await o.press(o.S('[data-act="publish"]'), "Publish (second press)");
  assert.ok(await until(async () => /Release 1/.test(await text(o)) && /is live at brightline\.example\.test/.test(await text(o)), 30000), `published: ${await text(o)}`);
  await o.press(o.page.locator('#viewStudio .vseg [data-pane="preview"]'), "the Editor view");
  await o.press(o.S('[data-act="start"]').or(o.page.locator('#viewStudio button:has-text("Turn on the phone preview")')), "Turn on the phone preview");
  assert.ok(await until(async () => (await (await fetch(`${base}/api/studio/overview`)).json()).preview.running, 90000), "the phone preview is on");
  await o.press(o.S('.vseg [data-pane="live"]'), "the Publish view again");
  const liveLink = o.S('a:has-text("Open the live site")');
  assert.ok(await until(async () => (await liveLink.count()) === 1, 20000), "the live site can be opened");
  const [tab] = await Promise.all([o.page.context().waitForEvent("page"), o.press(liveLink, "Open the live site (test address)")]);
  await tab.waitForLoadState("networkidle");
  await tab.locator("[data-release] [data-section]").first().waitFor({ timeout: 30000 });
  assert.equal(await tab.locator("[data-release]").getAttribute("data-release"), "1");
  await tab.close();
  await o.press(o.S('[data-act="pubparity"]'), "Check it now");
  assert.ok(await until(async () => /Matches the dashboard/.test(await text(o)), 200000), `parity: ${await text(o)}`);
  assert.equal(await o.S('[data-act="pubrollback"]').count(), 0, "no earlier release, so no Go back");
  assert.deepEqual(o.problems, [], "console at 1440"); assert.deepEqual(o.bad, [], "Studio requests at 1440");
  await o.page.close();
  // 768 and 390: the same pane, read, with its controls (the override is for a revision without their yes: none here)
  for (const [w, h] of [[768, 1024], [390, 844]]) {
    o = await open(w, h);
    assert.match(await text(o), /Revision 1 is what is live/);
    assert.match(await text(o), /Release 1/);
    await o.press(o.S('[data-act="pubparity"]'), "Check it now");
    assert.ok(await until(async () => /Matches the dashboard/.test(await text(o)) && !(await o.S('[data-act="pubparity"]').isDisabled()), 200000));
    assert.deepEqual(o.problems, [], `console at ${w}`); assert.deepEqual(o.bad, [], `Studio requests at ${w}`);
    await o.page.close();
  }
  // a second revision WITHOUT the detailer's yes: Andrew's reason, Publish twice, then Go back twice (1440)
  const store = openStore(data), spec2 = structuredClone(rev.spec);
  spec2.pages[0].sections.find((x) => x.type === "hero").copy.headline = "A second headline, for going back.";
  store.addRevision("brightline", { n: 2, site: "brightline", parent: 1, created_at: new Date().toISOString(), author: "you", note: "test", spec_hash: "second0000001", spec: spec2 });
  const t2 = new Date().toISOString();
  store.addCheck("brightline", { id: "c2", site: "brightline", rev: 2, spec_hash: "second0000001", started_at: t2, finished_at: t2, ok: true, passed: 20, failed: 0, lines: [] });
  store.addGates("brightline", { rev: 2, spec_hash: "second0000001", ok: true, rows: [], at: t2, said: "every gate passed" });
  o = await open(1440, 900);
  assert.ok(await until(async () => /Waiting for Brightline Auto Care.s “I.m happy with it” on revision 2/.test(await text(o)), 20000), await text(o));
  await o.press(o.S(".over summary"), "Publish without their yes");
  await o.press(o.S('[data-act="puboverride"]'), "Save the reason, empty (refused)");
  assert.ok(await until(async () => /Say in a few words why/.test(await text(o)), 10000));
  await o.S("#stuPubWhy").fill("They said yes on the phone");
  await o.press(o.S('[data-act="puboverride"]'), "Save the reason");
  assert.ok(await until(async () => /You publish revision 2 without their yes: They said yes on the phone/.test(await text(o)), 15000), await text(o));
  assert.ok(await until(async () => !(await o.S('[data-act="publish"]').isDisabled()), 30000), "Publish is ready");
  await o.press(o.S('[data-act="publish"]'), "Publish revision 2 (first press)");
  await o.press(o.S('[data-act="publish"]'), "Publish revision 2 (second press)");
  assert.ok(await until(async () => /Release 2 · revision 2/.test(await text(o)), 30000), await text(o));
  await o.press(o.S('[data-act="pubrollback"]'), "Go back (first press)");
  assert.match(await o.S('[data-act="pubrollback"]').innerText(), /Press again to go back/);
  await o.press(o.S('[data-act="pubrollback"]'), "Go back (second press)");
  assert.ok(await until(async () => /Back to release 1 \(revision 1\)/.test(await text(o)) && /Release 1 · revision 1 · at/.test(await text(o)), 30000), await text(o));
  assert.match(await text(o), /Gone back from/);
  await o.press(o.S('[data-act="pubparity"]'), "Check it now, after going back");
  assert.ok(await until(async () => /Matches the dashboard · release 1/.test(await text(o)) && !(await o.S('[data-act="pubparity"]').isDisabled()), 200000), await text(o));
  assert.deepEqual(o.problems, [], "console at the end"); assert.deepEqual(o.bad, [], "Studio requests at the end");
  await o.page.close();
  console.log(`clicked ${clicked.length}:\n${clicked.join("\n")}`);
});
