// STUDIO S4: the picker inside the phone preview (app/src/site/picker.js) answers only the Studio's own page.
// The preview's dev server is started the way the Studio starts it, naming one allowed parent origin
// (VITE_STUDIO_ORIGINS). Two parent pages on this laptop frame it: the allowed one and another port. Only the allowed
// one can hand it a revision, switch it to Select, and get a tap back; the other gets nothing at all.
// Offline engine + Vite + Chromium, about 15 s; nothing leaves the laptop.
//   node --test tests/studio-picker.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { startExampleEngine } from "../scripts/studio/example-engine.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "app");
const { chromium } = createRequire(path.join(APP, "package.json"))("playwright");
const SPEC = JSON.parse(readFileSync(path.join(APP, "src/site/specs/brightline.json"), "utf8"));
const freePort = () => new Promise((r) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => r(p)); }); });
// the site's sticky bar would sit over a part scrolled to the very top
const centre = async (l) => { await l.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" })); await new Promise((r) => setTimeout(r, 250)); return l; };
const until = async (fn, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await fn()) return true; } catch {} await new Promise((r) => setTimeout(r, 300)); } return false; };

// A parent page like the Studio's: frames the preview, answers "ready" with the revision, then switches to Select.
const parentPage = (site) => `<!doctype html><meta charset="utf-8"><body style="margin:0">
<iframe id="f" src="${site}" width="390" height="844" style="border:0"></iframe>
<script>
window.got = [];
const f = document.getElementById("f"), origin = new URL(f.src).origin;
addEventListener("message", (e) => {
  if (e.source !== f.contentWindow) return;
  window.got.push({ origin: e.origin, data: e.data });
  if (e.data?.type === "studio-ready") {
    f.contentWindow.postMessage({ type: "studio-spec", spec: ${JSON.stringify(SPEC)}, revision: "brightline/7" }, origin);
    f.contentWindow.postMessage({ type: "studio-mode", mode: "select" }, origin);
  }
});
</script>`;

test("the picker takes a revision and reports taps only for the Studio's own origin", { timeout: 120000 }, async (t) => {
  const engine = await startExampleEngine({ port: 0 });
  const [vitePort, okPort, otherPort] = await Promise.all([freePort(), freePort(), freePort()]);
  const SITE = `http://127.0.0.1:${vitePort}/site/preview`;
  const vite = spawn(process.execPath, [path.join(APP, "node_modules/vite/bin/vite.js"), "--port", String(vitePort), "--strictPort", "--host", "127.0.0.1"],
    { cwd: APP, windowsHide: true, stdio: "ignore",
      env: { ...process.env, VITE_SUPABASE_URL: engine.url, VITE_SUPABASE_ANON_KEY: "demo-anon", VITE_STUDIO_ORIGINS: `http://127.0.0.1:${okPort}` } });
  const parents = [okPort, otherPort].map((p) => createServer((_q, s) => { s.writeHead(200, { "content-type": "text/html" }); s.end(parentPage(SITE)); }).listen(p, "127.0.0.1"));
  const browser = await chromium.launch();
  t.after(async () => {
    await browser.close().catch(() => {});
    spawn("taskkill", ["/T", "/F", "/PID", String(vite.pid)], { windowsHide: true, stdio: "ignore" });
    for (const p of parents) p.close();
    await engine.close().catch(() => {});
  });
  assert.ok(await until(() => fetch(SITE).then((r) => r.ok)), "the preview's dev server did not start");

  // ---- the Studio's own origin
  const page = await browser.newPage({ viewport: { width: 500, height: 900 } });
  const problems = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) problems.push(m.text()); });
  await page.goto(`http://127.0.0.1:${okPort}/`);
  const frame = page.frameLocator("#f");
  await frame.locator('[data-from$=".price"]').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(400);
  await frame.locator('[data-section="menu"] [data-from$=".price"]').first().click();
  await until(() => page.evaluate(() => window.got.some((m) => m.data?.type === "studio-pick")), 5000);
  const picks = (await page.evaluate(() => window.got)).filter((m) => m.data?.type === "studio-pick");
  assert.equal(picks.length, 1, "one tap, one pick");
  const p = picks[0].data;
  assert.equal(picks[0].origin, new URL(SITE).origin);
  assert.equal(p.revision, "brightline/7", "the pick names the revision it was made on");
  assert.equal(p.section, "menu");
  assert.match(p.from, /^service:[\w-]+\.price$/);
  assert.equal(p.item, p.from.slice("service:".length, -".price".length));
  assert.ok(p.name && p.text.includes("$"), JSON.stringify(p));
  assert.ok(p.bounds.width > 0 && p.bounds.height > 0);
  assert.equal(await frame.locator(".stu-pick").count(), 1, "the tapped part is outlined");
  // Select mode: the tap did not follow the link or press anything (the page did not move to #book)
  assert.equal(await frame.locator("body").evaluate(() => location.hash), "");
  await centre(frame.locator('[data-section="hero"] [data-book]')).then((l) => l.click());
  assert.equal(await frame.locator("body").evaluate(() => location.hash), "", "in Select mode a link is not followed");

  // Browse mode: the site works again, and a tap is not a pick
  await page.evaluate(() => { const f = document.getElementById("f"); f.contentWindow.postMessage({ type: "studio-mode", mode: "browse" }, new URL(f.src).origin); });
  await page.waitForTimeout(300);
  const before = (await page.evaluate(() => window.got)).filter((m) => m.data?.type === "studio-pick").length;
  assert.equal(await frame.locator(".stu-pick").count(), 0, "Browse clears the outline");
  await centre(frame.locator('[data-section="hero"] [data-book]')).then((l) => l.click());
  await page.waitForTimeout(400);
  assert.equal((await page.evaluate(() => window.got)).filter((m) => m.data?.type === "studio-pick").length, before, "no pick in Browse mode");
  assert.equal(await frame.locator("body").evaluate(() => location.hash), "#book", "in Browse mode the link works");
  assert.deepEqual(problems, []);

  // ---- any other origin: the same page from another port gets no revision drawn, no Select, no pick
  const other = await browser.newPage({ viewport: { width: 500, height: 900 } });
  await other.goto(`http://127.0.0.1:${otherPort}/`);
  const of = other.frameLocator("#f");
  await of.locator("main.site-wait").waitFor({ timeout: 30000 });
  await other.waitForTimeout(2500);
  assert.equal(await of.locator("[data-section]").count(), 0, "a revision from another origin is not drawn");
  assert.equal(await of.locator("html.stu-select").count(), 0, "another origin cannot switch the picker to Select");
  await of.locator("main").click({ force: true });
  await other.waitForTimeout(400);
  const said = (await other.evaluate(() => window.got)).map((m) => m.data?.type);
  // (React's strict mode says "ready" twice in development)
  assert.ok(said.length > 0 && said.every((x) => x === "studio-ready"), `another origin heard only "ready", which carries nothing: ${said}`);
});
