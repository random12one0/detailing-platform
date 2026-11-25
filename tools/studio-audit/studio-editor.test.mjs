// STUDIO S4, in a real browser: the editor as Andrew uses it. A preview Control Room (BELT_PREVIEW=1, its own port,
// an empty Studio folder) with the Brightline example and its phone preview; Chromium at phone width.
//   - tapping a price in Select opens "This comes from the dashboard" with where to change it, and NEVER a text box;
//   - a headline edit with "$185" in it is refused with the validator's plain reason, and no card is made;
//   - a pick posted by any other window or origin is ignored.
// Needs the platform copy (SITE_ACCEPTANCE_PLATFORM, default C:/studio-work/s1); skipped without it. About 40 s.
//   node --test studio-editor.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLAT = (process.env.SITE_ACCEPTANCE_PLATFORM || "C:/studio-work/s1").replace(/\\/g, "/");
const ready = existsSync(path.join(PLAT, "app/src/site/picker.js")) && existsSync(path.join(PLAT, "app/node_modules/playwright"));
const freePort = () => new Promise((r) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => r(p)); }); });
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await fn()) return true; } catch {} await new Promise((r) => setTimeout(r, 300)); } return false; };

test("the editor: a price explains where it comes from, a typed $185 is refused, other origins are ignored",
  { skip: !ready && `needs the platform copy with the picker at ${PLAT}`, timeout: 240000 }, async (t) => {
  const data = mkdtempSync(path.join(os.tmpdir(), "studio-editor-"));
  const [port, previewPort, enginePort] = [await freePort(), await freePort(), await freePort()];
  writeFileSync(path.join(data, "settings.json"), JSON.stringify({ allowed: PLAT, platform: PLAT, previewPort, enginePort }));
  const cr = spawn(process.execPath, ["server.mjs"], { cwd: HERE, windowsHide: true, stdio: "ignore",
    env: { ...process.env, PORT: String(port), BELT_STUDIO_DATA: data,
      // S5: the AI is a stand-in CLI replaying recorded real answers (test-fixtures/studio-fake-claude.mjs), so no usage is spent
      STUDIO_CLAUDE_CMD: path.join(HERE, "test-fixtures/studio-fake-claude.mjs") } });
  const { chromium } = createRequire(path.join(PLAT, "app/package.json"))("playwright");
  const browser = await chromium.launch();
  t.after(async () => {
    await browser.close().catch(() => {});
    spawnSync("taskkill", ["/T", "/F", "/PID", String(cr.pid)], { windowsHide: true, stdio: "ignore" });   // the preview's servers are its children
    rmSync(data, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${port}`;
  assert.ok(await until(() => fetch(base + "/").then((r) => r.ok), 30000), "the preview Control Room did not start");

  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const problems = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) problems.push(m.text()); });
  page.on("pageerror", (e) => problems.push(e.message));
  // The preview Control Room is read-only outside the Studio: a page-side write elsewhere (for example /api/do/note)
  // gets 403 there, and the browser logs it. That is the preview's rule, not the Studio; every Studio answer must be fine.
  const refusedElsewhere = [], studioBad = [];
  page.on("response", (r) => { const u = new URL(r.url()); if (r.status() >= 400) (u.pathname.startsWith("/api/studio/") || u.pathname.startsWith("/studio/") ? studioBad : refusedElsewhere).push(`${r.status()} ${u.pathname}`); });
  const S = (sel) => page.locator("#viewStudio " + sel);
  await page.goto(`${base}/?nx=1#tab=studio`);
  await S('[data-act="example"]').click({ timeout: 30000 });
  await S('[data-act="open"]').first().click({ timeout: 30000 });
  await S('#stuStage [data-act="start"]').click({ timeout: 30000 });
  const frame = page.frameLocator("#stuFrame");
  await frame.locator('[data-section="menu"] [data-from$=".price"]').first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(800);
  assert.equal(await S('[data-act="mode"][data-m="select"]').getAttribute("aria-pressed"), "true", "the editor opens in Select");

  // ---- a price
  const price = frame.locator('[data-section="menu"] [data-from$=".price"]').first();
  await price.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await price.click();
  await page.waitForFunction(() => /This comes from the dashboard/.test(document.getElementById("stuInsp")?.innerText || ""), null, { timeout: 10000 });
  const said = await S("#stuInsp").innerText();
  assert.match(said, /A price/);
  assert.match(said, /The price of “[^”]+” is set in Brightline Auto Care's dashboard, so it cannot be typed here/);
  assert.match(said, /Where: Business › Services & add-ons/);
  assert.equal(await S("#stuInsp textarea, #stuInsp input, #stuInsp [contenteditable]").count(), 0, "a price never opens a text box");
  assert.equal(await S("#stuInsp").isVisible(), true);
  assert.doesNotMatch(said, /service:|[0-9a-f]{8}-[0-9a-f]{4}/, "plain words only: no raw dashboard address");
  await S('#stuInsp [data-act="closesheet"]').click();

  // ---- the headline: "$185" refused with the validator's reason, no card
  const h1 = frame.locator('[data-section="hero"] [data-part="headline"]');
  await h1.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await h1.click();
  const box = S("#stuEditText");
  await box.waitFor({ timeout: 10000 });
  assert.match(await box.inputValue(), /\S/, "the box holds the headline's words");
  await box.fill("Full detail, now $185.");
  await S('#stuEdit button[type="submit"]').click();
  await page.waitForFunction(() => !!document.getElementById("stuEditErr"), null, { timeout: 20000 });
  assert.match(await S("#stuEditErr").innerText(), /"\$185" is a price or a number typed into the wording\. Prices, hours and other facts come from the dashboard/);
  assert.equal(await box.getAttribute("aria-invalid"), "true");
  assert.equal(await S("#stuCards .ccard").count(), 0, "no card was made");

  // ---- two different words for the same part: two cards, and no "Apply all" (it would be refused)
  await box.fill("Clean cars, plain prices.");
  await S('#stuEdit button[type="submit"]').click();
  await S("#stuCards .ccard.proposed").first().waitFor({ timeout: 20000 });
  await S('#stuCards [data-act="closesheet"]').click();
  await S('[data-act="words"]').click();
  await S('#stuInsp [data-act="field"][data-n="hero"][data-field="headline"]').click();
  await S("#stuEditText").fill("Your car, done right.");
  await S('#stuEdit button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelectorAll("#stuCards .ccard.proposed").length === 2, null, { timeout: 20000 });
  assert.equal(await S('[data-act="applyall"]').count(), 0, "Apply all is not offered for two cards on the same words");
  await S('#stuCards [data-act="closesheet"]').click();

  // ---- a pick from any window but the phone frame (here, the Control Room page itself) changes nothing
  await page.evaluate(() => window.postMessage({ type: "studio-pick", revision: "brightline/1", section: "hero", part: "headline" }, "*"));
  await page.waitForTimeout(500);
  assert.equal(await S("#stuInsp").isHidden(), true, "the sheet did not open");

  // ---- S5, "change this": ask the AI about the tapped headline; the answer is a card, made from the tapped part
  await h1.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await h1.click();
  await S("#stuAskPartText").waitFor({ timeout: 10000 });
  assert.equal(await S("#stuInsp .boxmic, #stuInsp textarea").count() >= 2, true, "the box takes typing (and the mic where the browser has speech-to-text)");
  await S("#stuAskPartText").fill("Make the headline say: Clean cars, no fuss.");
  await S('#stuAskPart button[type="submit"]').click();
  await page.waitForFunction(() => /Card \d+ is ready/.test(document.querySelector("#stuAskPart .pjob")?.innerText || ""), null, { timeout: 60000 });
  await S('#stuAskPart [data-act="seecard"]').click();
  const aiCard = S("#stuCards .ccard").filter({ hasText: "Clean cars, no fuss." });
  await aiCard.waitFor({ timeout: 10000 });
  assert.match(await aiCard.innerText(), /FROM “CHANGE THIS”/i);
  assert.match(await aiCard.innerText(), /First screen · Headline/);
  await S('#stuCards [data-act="closesheet"]').click();
  assert.deepEqual(studioBad, [], "every Studio request answered");
  assert.ok(refusedElsewhere.every((x) => x.startsWith("403 ")), refusedElsewhere.join(", "));
  const quiet = problems.filter((m) => !(refusedElsewhere.length && /Failed to load resource: the server responded with a status of 403/.test(m)));
  assert.deepEqual(quiet, [], "no console errors or warnings");
});

// A FRESH INSTALL (live install, 2026-11-05): no settings, no sites, and the preview's ports held by other programs.
// At 390, 768 and 1440, in both looks, the Studio home and a way to its settings are there in every state: while its
// first answer is still on the way, when the answer fails, and when it arrives.
test("a fresh Studio (no settings, no sites, ports taken): its home and its settings are reachable in every state, at 3 widths",
  { skip: !ready && `needs the platform copy at ${PLAT}`, timeout: 300000 }, async (t) => {
  const data = mkdtempSync(path.join(os.tmpdir(), "studio-fresh-"));
  const { mkdirSync } = await import("node:fs");
  mkdirSync(path.join(data, "sites"));   // exactly what the live folder held: an empty sites/ and nothing else
  const http = await import("node:http");
  const port = await freePort();
  // the defaults (54396 / 54395) are left alone: other programs hold two free ports, and the settings would like them
  const [held1, held2] = [await freePort(), await freePort()];
  const holders = [http.createServer((q, s) => { s.writeHead(200); s.end("someone else"); }).listen(held1, "127.0.0.1"), net.createServer(() => {}).listen(held2, "127.0.0.1")];
  const cr = spawn(process.execPath, ["server.mjs"], { cwd: HERE, windowsHide: true, stdio: "ignore",
    env: { ...process.env, PORT: String(port), BELT_STUDIO_DATA: data } });
  const { chromium } = createRequire(path.join(PLAT, "app/package.json"))("playwright");
  const browser = await chromium.launch();
  t.after(async () => {
    await browser.close().catch(() => {});
    spawnSync("taskkill", ["/T", "/F", "/PID", String(cr.pid)], { windowsHide: true, stdio: "ignore" });
    for (const h of holders) h.close();
    rmSync(data, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${port}`;
  assert.ok(await until(() => fetch(base + "/").then((r) => r.ok), 30000), "the preview Control Room did not start");
  // the Studio is told to want the held ports (the page's own settings form would do the same)
  writeFileSync(path.join(data, "settings.json"), JSON.stringify({ previewPort: held1, enginePort: held2 }));
  for (const [w, h] of [[390, 844], [768, 1024], [1440, 900]]) for (const nx of ["1", "0"]) {
    const where = `${w}px, ${nx === "1" ? "new" : "old"} look`;
    for (const state of ["slow", "failing", "answering"]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      const problems = [];
      page.on("pageerror", (e) => problems.push(e.message));
      if (state === "slow") await page.route("**/api/studio/overview", (r) => new Promise((ok) => setTimeout(ok, 30000)).then(() => r.continue()).catch(() => {}));
      if (state === "failing") await page.route("**/api/studio/overview", (r) => r.fulfill({ status: 500, body: "{}" }));
      await page.goto(`${base}/?nx=${nx}#tab=studio`);
      const S = (sel) => page.locator("#viewStudio " + sel);
      await S(".shead").first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
      assert.equal(await S(".shead").first().isVisible(), true, `${where}, ${state}: the Studio's heading shows`);
      const set = S('[data-act="go"][data-to="settings"]');
      assert.equal(await set.count(), 1, `${where}, ${state}: there is a way to the Studio settings`);
      await set.click();
      await S("h1.big").filter({ hasText: "Studio settings" }).waitFor({ timeout: 10000 });
      if (state === "answering") {
        await S("#stuSet").waitFor({ timeout: 10000 });
        assert.equal(await S("#stuSet input, #stuSet textarea").count() >= 8, true, `${where}: the settings form is there`);
      }
      await S('.shead [data-act="go"][data-to="home"]').click();
      await S('[data-act="go"][data-to="settings"]').waitFor({ timeout: 10000 });
      if (state === "answering") {
        const home = await S(".stuin").innerText();
        assert.match(home, /No sites yet/, `${where}: the empty home says so`);
        assert.match(home, new RegExp(`Port ${held1} is in use by another program, so the phone preview will use a free port`), `${where}: the taken port is a plain note`);
        assert.equal(await S(".server .smsg.bad").count(), 0, `${where}: and not an error`);
      }
      if (state === "failing") assert.match(await S(".stuin").innerText(), /The Studio could not load/);
      assert.deepEqual(problems, [], `${where}, ${state}: no page errors`);
      await ctx.close();
    }
  }
});
