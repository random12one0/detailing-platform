// STUDIO S7, in a real browser: every new control of the Detailer pane (390, 768, 1440) and of the detailer's own page
// (390 and 1440) is focused and clicked, and does what it says. Looks are made first with the stand-in CLIs replaying
// recorded real answers (no usage) and the real gates. About three minutes.
//   node --test studio-detailer-ui.test.mjs
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
const ready = existsSync(path.join(PLAT, "app/src/site/Detailer.jsx")) && existsSync(path.join(PLAT, "app/node_modules/playwright"));
const REC = JSON.parse(readFileSync(path.join(HERE, "test-fixtures/studio-looks-replies.json"), "utf8"));
const freePort = () => new Promise((r) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => r(p)); }); });
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { try { const v = await fn(); if (v) return v; } catch {} await new Promise((r) => setTimeout(r, 300)); } return false; };

test("Detailer pane and the detailer's page: every new control, clicked", { skip: !ready && `needs the platform copy at ${PLAT}`, timeout: 900000 }, async (t) => {
  const data = mkdtempSync(path.join(os.tmpdir(), "studio-detailer-ui-"));
  const fakes = { STUDIO_BELT_STATE: path.join(data, "no-belt-state.json"), STUDIO_CLAUDE_CMD: path.join(HERE, "test-fixtures/studio-fake-claude.mjs"), STUDIO_FAKE_REPLIES: path.join(data, "fake.json"),
    STUDIO_CODEX_CMD: path.join(HERE, "test-fixtures/studio-fake-codex.mjs"), STUDIO_FAKE_CODEX: path.join(data, "fake.json"), STUDIO_FAKE_CODEX_COUNT: path.join(data, "count.txt") };
  writeFileSync(fakes.STUDIO_FAKE_REPLIES, JSON.stringify({ replies: REC.replies, critics: REC.critics.map((c) => c.answer) }));
  writeFileSync(path.join(data, "settings.json"), JSON.stringify({ allowed: PLAT, platform: PLAT, lookMaker: "claude", lookRounds: 1, previewPort: await freePort(), enginePort: await freePort(), linkPort: await freePort() }));
  Object.assign(process.env, fakes, { BELT_STUDIO_DATA: data });
  const S = createStudio({ HERE, json: (res, c, o) => res.done(o), body: (q, r, l, fn) => fn(q.body), onExit: false });
  delete process.env.BELT_STUDIO_DATA;
  const call = (method, p, b) => new Promise((done) => S.handle({ method, body: b }, { done }, new URL("http://x" + p)));
  await S.swept;
  await call("POST", "/api/studio/example");
  S.store.addCheck("brightline", { id: "c1", site: "brightline", rev: 1, started_at: new Date().toISOString(), finished_at: new Date().toISOString(), ok: true, passed: 20, failed: 0, lines: [] });
  await call("POST", "/api/studio/looks/make", { site: "brightline" });
  assert.ok(await until(async () => { const d = await call("GET", "/api/studio/site?id=brightline"); return !d.looks.working && d.looks.letters.every((l) => l.shown); }, 500000), "three looks shown");
  S.close();
  const port = await freePort();
  const cr = spawn(process.execPath, ["server.mjs"], { cwd: HERE, windowsHide: true, stdio: "ignore", env: { ...process.env, ...fakes, PORT: String(port), BELT_STUDIO_DATA: data } });
  const { chromium } = createRequire(path.join(PLAT, "app/package.json"))("playwright");
  const browser = await chromium.launch();
  const base = `http://127.0.0.1:${port}`;
  t.after(async () => {
    await browser.close().catch(() => {});
    await fetch(`${base}/api/studio/preview/stop`, { method: "POST" }).catch(() => {});
    spawnSync("taskkill", ["/T", "/F", "/PID", String(cr.pid)], { windowsHide: true, stdio: "ignore" });
    for (const k of Object.keys(fakes)) delete process.env[k];
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
    return { page, problems, bad, press, S: (sel) => page.locator("#viewStudio " + sel) };
  };
  const view = async (o, w, pane) => o.press(w >= 1100 ? o.S(`.vseg [data-pane="${pane}"]`) : o.S(`[role=tab][data-pane="${pane}"]`), `the ${pane} view`);
  let urls = [];
  for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
    const o = await open(w, h);
    await o.page.goto(`${base}/?nx=1#tab=studio`);
    await o.press(o.S('[data-act="open"][data-site="brightline"]'), "open the site");
    await o.S(".sitehead").waitFor();
    if (w === 1440) {
      // the phone preview serves the detailer's page; then both links and both drafts
      await o.press(o.S('[data-act="start"]'), "Turn on the phone preview");
      assert.ok(await until(async () => (await (await fetch(`${base}/api/studio/overview`)).json()).preview.running, 90000), "the phone preview is on");
      await view(o, w, "detail");
      await o.press(o.S('[data-act="linkreview"]'), "Make the review link and email");
      await o.S(".ems .em").first().waitFor({ timeout: 30000 });
      await o.press(o.S('[data-act="linklooks"]'), "Make the pick-a-look link and email");
      assert.ok(await until(async () => (await o.S(".ems .em").count()) === 2, 30000), "two drafts");
      // REVIEW S7 F2: Andrew changes a draft before Send; the {{link}} stays, the subject is his
      await o.press(o.S(".ems .em details summary"), "Read or change the email");
      const form = o.S("[id^=stuEmailForm-]").first();
      await form.locator("input").fill("A first look at your new site");
      await o.press(o.S('[data-act="emailsave"]'), "Save changes to the draft");
      assert.ok(await until(async () => (await o.S(".ems").innerText()).includes("A first look at your new site"), 15000), "the edited subject is saved");
      await o.press(o.S('[data-act="emailsend"]'), "Send (approve) the first draft");
      assert.ok(await until(async () => (await o.S(".ems").innerText()).includes("What would be sent"), 15000), "what would be sent, shown once");
      await o.press(o.S('[data-act="emailsend"]'), "Send (approve) the second draft");
      assert.ok(await until(async () => (await o.S(".sent1").count()) === 2, 15000), "both approved, each shown once");
      urls = (await o.S(".sent1 pre.body").allTextContents()).map((b) => /http:\/\/\S+\/site\/p\/\S+/.exec(b)?.[0]).filter(Boolean);
      assert.equal(urls.length, 2);
    } else {
      await view(o, w, "detail");
      await o.S(".ems .em").first().waitFor({ timeout: 30000 });
      await o.press(o.S(".ems .em details summary"), "Read the email");
      assert.equal(await o.S(".sent1").count(), 0, "a secret link is shown once, not again after a reload");
    }
    assert.deepEqual(o.problems, [], `console at ${w}`); assert.deepEqual(o.bad, [], `Studio requests at ${w}`);
    await o.page.close();
  }
  // THE DETAILER'S PAGE, at 390 and 1440: pick a look; comment, rate a part, say happy
  const pickUrl = urls.find((u, i) => i === 0), reviewUrl = urls[1];
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const problems = [];
    page.on("console", (m) => { if (["error", "warning"].includes(m.type()) && !/status of 409/.test(m.text())) problems.push(m.text()); });
    const press = async (loc, what) => { await loc.first().focus(); await loc.first().click(); clicked.push(`${w} detailer: ${what}`); await page.waitForTimeout(500); };
    // the newest draft is the looks one (drafts list newest first), the older the review one
    await page.goto(pickUrl, { waitUntil: "networkidle" });
    const chooser = (await page.locator(".dp-title b").innerText()) === "Pick your look";
    const [cu, ru] = chooser ? [pickUrl, reviewUrl] : [reviewUrl, pickUrl];
    await page.goto(cu, { waitUntil: "networkidle" });
    await press(page.locator(".dp-seg button", { hasText: "B" }), "look B");
    if (w === 390) { await press(page.locator(".dp-pickbar button"), "Pick this one"); await page.locator(".dp-pickbar", { hasText: "You picked B" }).waitFor(); }
    await page.goto(ru, { waitUntil: "networkidle" });
    await press(page.locator(".dp-seg button", { hasText: "Comment" }), "Comment");
    await press(page.locator('[data-section="hero"] h1'), "tap the headline");
    await page.locator("#dpText").fill(w === 390 ? "Say we come to you sooner" : "Make the prices bigger");
    await press(page.locator(".dp-sheet button[type=submit]"), "Send the comment");
    await page.locator(".dp-pin").first().waitFor();
    await press(page.locator(".dp-seg button", { hasText: "Comment" }), "Comment again");
    await press(page.locator('[data-section="hero"] h1'), "tap again");
    await press(page.locator(".dp-sheet .dp-quiet"), "Cancel a comment");
    await press(page.locator(".dp-seg button", { hasText: "Use it" }), "Use it");
    await press(page.locator(".dp-end li").first().locator("button", { hasText: "Good" }), "Good on the first part");
    await press(page.locator(".dp-end li").nth(1).locator("button", { hasText: "Change it" }), w === 390 ? "Change it on the second part (asks what)" : "Change it again (takes the vote back)");
    if (w === 390) {
      await page.locator("#dpText").fill("Make this part shorter");
      await press(page.locator(".dp-sheet button[type=submit]"), "Send what to change");
    }
    if (w === 1440) { await press(page.locator(".dp-happy"), "I'm happy with it"); await page.locator(".dp-done").waitFor(); }
    assert.deepEqual(problems, [], `detailer page console at ${w}`);
    await page.close();
  }
  // BACK IN THE STUDIO: the pick, the comment cards, the changes email, cancel a link
  const o = await open(1440, 900);
  await o.page.goto(`${base}/?nx=1#tab=studio`);
  await o.press(o.S('[data-act="open"][data-site="brightline"]'), "open the site");
  await view(o, 1440, "detail");
  await o.S('[data-act="usepick"]').waitFor({ timeout: 20000 });
  await o.press(o.S('[data-act="usepick"]'), "Use look B, as they picked");
  assert.ok(await until(async () => /revision\s*2/.test(await o.S("#stuRevChip").innerText()), 60000), "look B is revision 2");
  await o.press(o.S('[data-act="emailchanges"]'), "Draft We made your changes (refused: revision 2 is not checked)");
  assert.ok(await until(async () => /connection check/.test(await o.page.locator("#viewStudio").innerText()), 10000), "says the check is needed");
  S.store.addCheck("brightline", { id: "c2", site: "brightline", rev: 2, started_at: new Date().toISOString(), finished_at: new Date().toISOString(), ok: true, passed: 20, failed: 0, lines: [] });
  await o.press(o.S('[data-act="emailchanges"]'), "Draft We made your changes");
  assert.ok(await until(async () => (await o.S(".ems .em").count()) === 3, 20000), "a third draft");
  await o.press(o.S('[data-act="linkrevoke"]'), "Cancel link");
  assert.ok(await until(async () => (await o.page.locator("#viewStudio .lks .chip", { hasText: "Cancelled" }).count()) === 1, 15000), "one link cancelled");
  await view(o, 1440, "preview");
  const comment = o.S(".ccard.comment").first();
  await comment.waitFor({ timeout: 15000 });
  assert.equal(await o.S(".ccard.comment").count(), 3, "three comments, three cards");
  await o.press(comment.locator('[data-act="cardask"]'), "Ask the AI to make this");
  const keep = o.S(".ccard.comment").nth(1);
  await o.press(keep.locator('[data-act="keepcomment"]'), "Keep as it is, with no reason (refused)");
  assert.ok(await until(async () => /Say in a few words why/.test(await o.S(".ccard.comment").nth(1).innerText()), 10000), "a reason is asked for");
  await o.S(".ccard.comment").nth(1).locator("input").fill("The photo is the newest one you sent");
  await o.press(o.S(".ccard.comment").nth(1).locator('[data-act="keepcomment"]'), "Keep as it is, with a reason");
  assert.ok(await until(async () => (await o.S(".ccard").filter({ hasText: "Kept as it is: The photo is the newest one you sent" }).count()) === 1, 10000), "kept, with the reason");
  assert.deepEqual(o.problems, [], "console at the end"); assert.deepEqual(o.bad, [], "Studio requests at the end");
  console.log(`clicked ${clicked.length}:\n${clicked.join("\n")}`);
});
