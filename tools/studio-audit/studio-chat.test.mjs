// STUDIO S5, in a real browser at phone width: talking to the Studio, as Andrew does.
//   - the Chat pane: a fact ("make it $10 cheaper") answers with the dashboard place and makes no card;
//   - a request the AI is still answering survives a page RELOAD: the page comes back to "Working on it", then the
//     card arrives, and "See" opens it under Cards ("From your chat");
//   - an AI wording with a typed price is refused by the validator and the chat says why;
//   - the composer is never repainted while you type; no console errors.
// The AI is a stand-in CLI replaying recorded real answers (test-fixtures/studio-fake-claude.mjs): no usage is spent.
// Needs the platform copy (SITE_ACCEPTANCE_PLATFORM, default C:/studio-work/s1). About 40 s.
//   node --test studio-chat.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { platformCopy } from "./test-fixtures/platform-copy.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLAT = platformCopy();
const ready = existsSync(path.join(PLAT, "app/src/site/spec.js")) && existsSync(path.join(PLAT, "app/node_modules/playwright"));
const freePort = () => new Promise((r) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => r(p)); }); });
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await fn()) return true; } catch {} await new Promise((r) => setTimeout(r, 300)); } return false; };

test("the chat: a fact goes to the dashboard, a reload mid-answer resumes, a typed price is refused",
  { skip: !ready && `needs the platform copy at ${PLAT}`, timeout: 240000 }, async (t) => {
  const data = mkdtempSync(path.join(os.tmpdir(), "studio-chat-"));
  const port = await freePort();
  writeFileSync(path.join(data, "settings.json"), JSON.stringify({ allowed: PLAT, platform: PLAT }));
  const cr = spawn(process.execPath, ["server.mjs"], { cwd: HERE, windowsHide: true, stdio: "ignore",
    env: { ...process.env, PORT: String(port), BELT_STUDIO_DATA: data,
      STUDIO_CLAUDE_CMD: path.join(HERE, "test-fixtures/studio-fake-claude.mjs") } });
  const { chromium } = createRequire(path.join(PLAT, "app/package.json"))("playwright");
  const browser = await chromium.launch();
  t.after(async () => {
    await browser.close().catch(() => {});
    spawnSync("taskkill", ["/T", "/F", "/PID", String(cr.pid)], { windowsHide: true, stdio: "ignore" });
    rmSync(data, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${port}`;
  assert.ok(await until(() => fetch(base + "/").then((r) => r.ok), 30000), "the preview Control Room did not start");
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const problems = [], refusedElsewhere = [], studioBad = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) problems.push(m.text()); });
  page.on("pageerror", (e) => problems.push(e.message));
  page.on("response", (r) => { const u = new URL(r.url()); if (r.status() >= 400) (u.pathname.startsWith("/api/studio/") || u.pathname.startsWith("/studio/") ? studioBad : refusedElsewhere).push(`${r.status()} ${u.pathname}`); });
  const S = (sel) => page.locator("#viewStudio " + sel);
  await page.goto(`${base}/?nx=1#tab=studio`);
  await S('[data-act="example"]').click({ timeout: 30000 });
  await S('[data-act="open"]').first().click({ timeout: 30000 });
  await S('[role=tab][data-pane="chat"]').click();
  await S(".hello").waitFor({ timeout: 10000 });
  // the starters fill the box, they do not send
  await S('[data-act="try"]').first().click();
  assert.equal(await S("#stuAskText").inputValue(), "Make the headline shorter");
  assert.equal(await S(".msgs").count(), 0);

  // ---- a fact: the dashboard place, at once, and no card
  await S("#stuAskText").fill("make it $10 cheaper");
  await S("#stuAskText").press("Enter");
  await page.waitForFunction(() => /Change this in the dashboard: Business › Services & add-ons/.test(document.getElementById("stuThread")?.innerText || ""), null, { timeout: 10000 });
  const fact = await S("#stuThread").innerText();
  assert.match(fact, /Prices are kept in Brightline Auto Care's dashboard, so the site never has its own copy/);
  assert.match(fact, /Change this in the dashboard: Business › Services & add-ons \(prices\)/);
  assert.equal(fact.split("Services & add-ons").length, 2, "the place is named once (REVIEW-S5 F3)");
  assert.doesNotMatch(fact, /Changed in the dashboard/);
  assert.equal(await S("#stuAskText").inputValue(), "", "the box is cleared after a send");
  assert.equal(await S(".mrow").count(), 0, "no card");

  // ---- a request the AI takes a while over; the page is reloaded in the middle
  await S("#stuAskText").fill("Test: a slow answer for the booking title");
  await S("#stuSend").click();
  await page.waitForFunction(() => /Working on it/.test(document.getElementById("stuThread")?.innerText || ""), null, { timeout: 10000 });
  // the composer is not repainted while the answer is awaited: what is typed meanwhile stays, focus too
  await S("#stuAskText").fill("half a thought");
  await page.waitForTimeout(2600);
  assert.equal(await S("#stuAskText").inputValue(), "half a thought");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "stuAskText");
  await page.reload();
  await S('[role=tab][data-pane="chat"][aria-selected="true"]').waitFor({ timeout: 15000 });
  await page.waitForFunction(() => /Working on it|Waiting its turn/.test(document.getElementById("stuThread")?.innerText || ""), null, { timeout: 10000 });
  await page.waitForFunction(() => /Ask for a time/.test(document.getElementById("stuThread")?.innerText || ""), null, { timeout: 40000 });
  const made = S(".mrow").filter({ hasText: "Ask for a time" });
  assert.match(await made.innerText(), /card 1[\s\S]*Booking · Title[\s\S]*ready to apply/);
  await made.click();
  const card = S("#stuCards .ccard").filter({ hasText: "Ask for a time" });
  await card.waitFor({ timeout: 10000 });
  assert.equal(await S("#stuCards").isVisible(), true, "See opens the Cards sheet on a phone");
  assert.match(await card.innerText(), /FROM YOUR CHAT/i);
  assert.match(await card.innerText(), /Plainer, and it is a request/, "the AI's reason is on the card");
  await S('#stuCards [data-act="closesheet"]').click();

  // ---- an AI wording with a typed price: refused by the validator, and said in the chat
  await S('[role=tab][data-pane="chat"]').click();
  await S("#stuAskText").fill("Test: the headline with a typed price");
  await S("#stuSend").click();
  await page.waitForFunction(() => /Not made into a card/.test(document.getElementById("stuThread")?.innerText || ""), null, { timeout: 30000 });
  assert.match(await S("#stuThread").innerText(), /“Full detail from \$185\.”\s*"\$185" is a price or a number typed into the wording/);
  // ---- a malformed answer: nothing made, and "Ask again" is offered
  await S("#stuAskText").fill("Test: the answer is not the shape");
  await S("#stuSend").click();
  await page.waitForFunction(() => /not in the shape the Studio reads/.test(document.getElementById("stuThread")?.innerText || ""), null, { timeout: 30000 });
  assert.ok(await S('[data-act="askagain"]').count() >= 1);

  assert.deepEqual(studioBad, [], "every Studio request answered");
  assert.ok(refusedElsewhere.every((x) => x.startsWith("403 ")), refusedElsewhere.join(", "));
  const quiet = problems.filter((m) => !(refusedElsewhere.length && /Failed to load resource: the server responded with a status of 403/.test(m)));
  assert.deepEqual(quiet, [], "no console errors or warnings");
});
