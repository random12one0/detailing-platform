// STUDIO S6, in a real browser at 390, 768 and 1440: every new control on the Looks, Critic and Data screens is
// focused and clicked, and does what it says. Looks are made first through the Studio itself with the stand-in CLIs
// replaying recorded real answers (no usage spent) and the real gates. About 2 minutes.
//   node --test studio-looks-ui.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStudio } from "./studio.mjs";
import { platformCopy } from "./test-fixtures/platform-copy.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLAT = platformCopy();
const ready = existsSync(path.join(PLAT, "app/src/site/families.js")) && existsSync(path.join(PLAT, "app/node_modules/playwright"));
const REC = JSON.parse(readFileSync(path.join(HERE, "test-fixtures/studio-looks-replies.json"), "utf8"));
const freePort = () => new Promise((r) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => r(p)); }); });
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { try { const v = await fn(); if (v) return v; } catch {} await new Promise((r) => setTimeout(r, 300)); } return false; };

test("Looks, Critic and Data: every new control, clicked at 390, 768 and 1440", { skip: !ready && `needs the platform copy at ${PLAT}`, timeout: 600000 }, async (t) => {
  const data = mkdtempSync(path.join(os.tmpdir(), "studio-looks-ui-"));
  const fakes = { STUDIO_BELT_STATE: path.join(data, "no-belt-state.json"), STUDIO_CLAUDE_CMD: path.join(HERE, "test-fixtures/studio-fake-claude.mjs"), STUDIO_FAKE_REPLIES: path.join(data, "fake.json"),
    STUDIO_CODEX_CMD: path.join(HERE, "test-fixtures/studio-fake-codex.mjs"), STUDIO_FAKE_CODEX: path.join(data, "fake.json"), STUDIO_FAKE_CODEX_COUNT: path.join(data, "count.txt") };
  writeFileSync(fakes.STUDIO_FAKE_REPLIES, JSON.stringify({ replies: REC.replies, critics: REC.critics.map((c) => c.answer) }));
  writeFileSync(path.join(data, "settings.json"), JSON.stringify({ allowed: PLAT, platform: PLAT, lookMaker: "claude", lookRounds: 1 }));
  // 1. three looks, made in-process (the same Studio code the Control Room runs)
  Object.assign(process.env, fakes, { BELT_STUDIO_DATA: data });
  const S = createStudio({ HERE, json: (res, c, o) => res.done(o), body: (q, r, l, fn) => fn(q.body), onExit: false });
  delete process.env.BELT_STUDIO_DATA;
  const call = (method, p, b) => new Promise((done) => S.handle({ method, body: b }, { done }, new URL("http://x" + p)));
  await S.swept;
  await call("POST", "/api/studio/example");
  assert.equal((await call("POST", "/api/studio/looks/make", { site: "brightline" })).ok, true);
  assert.ok(await until(async () => { const d = await call("GET", "/api/studio/site?id=brightline"); return !d.looks.working && d.looks.letters.every((l) => l.shown?.critic); }, 400000), "three looks made and critiqued");
  S.close();
  // 2. the preview Control Room on that folder
  const port = await freePort();
  const cr = spawn(process.execPath, ["server.mjs"], { cwd: HERE, windowsHide: true, stdio: "ignore", env: { ...process.env, ...fakes, PORT: String(port), BELT_STUDIO_DATA: data } });
  const { chromium } = createRequire(path.join(PLAT, "app/package.json"))("playwright");
  const browser = await chromium.launch();
  t.after(async () => {
    await browser.close().catch(() => {});
    spawnSync("taskkill", ["/T", "/F", "/PID", String(cr.pid)], { windowsHide: true, stdio: "ignore" });
    for (const k of Object.keys(fakes)) delete process.env[k];
    rmSync(data, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${port}`;
  assert.ok(await until(() => fetch(base + "/").then((r) => r.ok), 30000), "the preview Control Room did not start");
  const clicked = [];
  for (const [w, h] of [[390, 844], [768, 1024], [1440, 900]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const problems = [], studioBad = [];
    page.on("console", (m) => { if (["error", "warning"].includes(m.type()) && !/status of 403/.test(m.text())) problems.push(m.text()); });
    page.on("pageerror", (e) => problems.push(e.message));
    page.on("response", (r) => { const u = new URL(r.url()); if (r.status() >= 400 && u.pathname.startsWith("/api/studio/")) studioBad.push(`${r.status()} ${u.pathname}`); });
    const S = (sel) => page.locator("#viewStudio " + sel);
    // focus + click, as a keyboard user and a finger would
    const press = async (loc, what) => { await loc.first().focus(); await loc.first().click(); clicked.push(`${w}: ${what}`); await page.waitForTimeout(300); };
    const view = async (pane) => press(w >= 1100 && ["looks", "critic", "preview"].includes(pane) ? S(`.vseg [data-pane="${pane}"]`) : S(`[role=tab][data-pane="${pane}"]`), `the ${pane} view`);
    await page.goto(`${base}/?nx=1#tab=studio`);
    await press(S('[data-act="open"][data-site="brightline"]'), "open the site");
    await S(".sitehead").waitFor();
    // LOOKS
    await view("looks");
    await S(".lk").first().waitFor();
    assert.equal(await S(".lk").count(), 3);
    assert.equal(await S(".lk img").count(), 3, "each look shows its phone capture");
    if (w < 1100) {
      await press(S('[data-act="lookat"][data-l="B"]'), "switch to look B");
      assert.equal(await S("#stuLook-B").isVisible(), true); assert.equal(await S("#stuLook-A").isVisible(), false);
      assert.equal(await S('[data-act="lookat"][data-l="B"]').getAttribute("aria-pressed"), "true");
    } else for (const L of ["A", "B", "C"]) assert.equal(await S(`#stuLook-${L}`).isVisible(), true, "three side by side");
    const card = S(`#stuLook-${w < 1100 ? "B" : "C"}`), L = w < 1100 ? "B" : "C";
    await press(card.locator('[data-act="looktaste"][data-verdict="love"]'), `Love it on look ${L}`);
    assert.ok(await until(async () => (await card.locator('[data-verdict="love"]').getAttribute("aria-pressed")) === "true", 8000), "Love it holds");
    await press(card.locator('[data-act="looktaste"][data-verdict="no"]'), `No on look ${L}`);
    assert.ok(await until(async () => (await card.locator('[data-verdict="no"]').getAttribute("aria-pressed")) === "true" && (await card.locator('[data-verdict="love"]').getAttribute("aria-pressed")) === "false", 8000), "No replaces Love it");
    await press(card.locator('[data-act="looktaste"][data-verdict="no"]'), `No again on look ${L} (clears)`);
    assert.ok(await until(async () => (await card.locator('[data-verdict="no"]').getAttribute("aria-pressed")) === "false", 8000), "pressing again clears");
    // CRITIC, from the look
    await press(card.locator('[data-act="seecritic"]'), `See the critic of look ${L}`);
    await S("#stuPane-critic .gate").first().waitFor();
    assert.equal(await S("#stuPane-critic .gate").count(), 6, "six gates");
    assert.equal(await S(`#stuPane-critic [data-act="criticat"][data-l="${L}"]`).getAttribute("aria-pressed"), "true");
    await press(S('#stuPane-critic [data-act="criticat"][data-l="A"]'), "the critic of look A");
    assert.equal(await S('#stuPane-critic [data-act="criticat"][data-l="A"]').getAttribute("aria-pressed"), "true");
    assert.ok(await S("#stuPane-critic .big2").isVisible(), "a score");
    await press(S("#stuPane-critic .qs summary"), "open the twelve questions");
    assert.equal(await S("#stuPane-critic .qs li").count(), 12);
    // DATA (screen 5): the right column on a desktop, its own tab below 1100
    if (w < 1100) await view("check"); else await view("preview");
    await S(".drow").first().waitFor({ timeout: 30000 });
    assert.equal(await S(".drow").count(), 11);
    assert.ok(await S(".drow.connected").count() >= 8, "most of the dashboard is connected");
    // once: Use this look, then Remake and Stop
    if (w === 1440) {
      await view("looks");
      await press(S('#stuLook-A [data-act="lookuse"]'), "Use this look (A)");
      assert.ok(await until(async () => /revision\s*2/.test(await S("#stuRevChip").innerText()), 60000), "a new revision from the look");
      await press(S('#stuLook-B [data-act="lookremake"]'), "Remake look B");
      assert.ok(await until(async () => (await S("#stuLook-B .lkjob").count()) > 0 || /Making look B again/.test(await S("#stuLook-B").innerText()), 15000), "B is being remade");
      await press(S('[data-act="looksstop"]'), "Stop making them");
      assert.ok(await until(async () => (await S('[data-act="looksmake"]').count()) > 0, 20000), "stopped: Make three new looks is back");
      await press(S('#stuLook-C [data-act="lookfamily"]'), "Try the fourth family on look C");
      assert.ok(await until(async () => /Boutique/.test(await S("#stuLook-C").innerText()), 15000), "look C is being made in the fourth family");
      await press(S('[data-act="looksstop"]'), "Stop making them (again)");
      assert.ok(await until(async () => (await S('[data-act="looksmake"]').count()) > 0, 20000), "stopped again");
      await press(S('[data-act="looksmake"]'), "Make three new looks");
      assert.ok(await until(async () => (await S('[data-act="looksstop"]').count()) > 0 && /revision 2/.test(await S(".lmeta").first().innerText()), 20000), "a new set from revision 2 is being made");
      await press(S('[data-act="looksstop"]'), "Stop the new set");
      await view("critic");
      await press(S('#stuPane-critic [data-act="criticat"][data-l="A"]'), "the critic pane of the new set");
    }
    assert.deepEqual(problems, [], `console at ${w}`);
    assert.deepEqual(studioBad, [], `Studio requests at ${w}`);
    await page.close();
  }
  console.log(`clicked ${clicked.length}:\n${clicked.join("\n")}`);
});
