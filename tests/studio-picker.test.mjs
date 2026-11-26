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
const parentPage = (site, w = 390, h = 844) => `<!doctype html><meta charset="utf-8"><body style="margin:0">
<iframe id="f" src="${site}" width="${w}" height="${h}" style="border:0"></iframe>
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

test("the picker takes a revision and reports taps only for the Studio's own origin", { timeout: 300000 }, async (t) => {
  const engine = await startExampleEngine({ port: 0 });
  const [vitePort, okPort, otherPort] = await Promise.all([freePort(), freePort(), freePort()]);
  const SITE = `http://127.0.0.1:${vitePort}/site/preview`;
  const vite = spawn(process.execPath, [path.join(APP, "node_modules/vite/bin/vite.js"), "--port", String(vitePort), "--strictPort", "--host", "127.0.0.1"],
    { cwd: APP, windowsHide: true, stdio: "ignore",
      env: { ...process.env, VITE_SUPABASE_URL: engine.url, VITE_SUPABASE_ANON_KEY: "demo-anon", VITE_STUDIO_ORIGINS: `http://127.0.0.1:${okPort}` } });
  const parents = [okPort, otherPort].map((p) => createServer((q, s) => { const u = new URL(q.url, "http://x"); s.writeHead(200, { "content-type": "text/html" }); s.end(parentPage(SITE, Number(u.searchParams.get("w")) || 390, Number(u.searchParams.get("h")) || 844)); }).listen(p, "127.0.0.1"));
  // Clean-up is registered BEFORE the launch: when the launch throws (no browser installed, as in the belt's scrubbed
  // copy), vite, the parent pages and the engine still stop. Otherwise they kept this file alive and the suite hung (2026-11-13).
  let browser;
  t.after(async () => {
    await browser?.close().catch(() => {});
    spawn("taskkill", ["/T", "/F", "/PID", String(vite.pid)], { windowsHide: true, stdio: "ignore" });
    for (const p of parents) p.close();
    await engine.close().catch(() => {});
  });
  browser = await chromium.launch();
  assert.ok(await until(() => fetch(SITE).then((r) => r.ok)), "the preview's dev server did not start");

  // ---- the Studio's own origin
  const page = await browser.newPage({ viewport: { width: 500, height: 900 } });
  const problems = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) problems.push(m.text()); });
  page.setDefaultNavigationTimeout(120000); // cold Vite takes over 30 s on its first page (issue 59)
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

  // ---- the outline's name tag never covers content, at phone, tablet and desktop width (Andrew: zero visual problems)
  const PARTS = ['[data-section="hero"] [data-part="headline"]', '[data-section="hero"] [data-part="eyebrow"]', '[data-section="hero"] [data-part="sub"]',
    '[data-section="menu"] [data-part="title"]', '[data-section="menu"] [data-part="intro"]', '[data-section="menu"] [data-from$=".price"]',
    '[data-section="menu"] [data-from$=".name"]', '[data-section="work"] [data-part="title"]', '[data-section="visit"] [data-part="title"]', '[data-section="book"] [data-part="title"]'];
  for (const [w, h] of [[390, 844], [768, 1024], [1440, 900]]) {
    const pg = await browser.newPage({ viewport: { width: w + 20, height: h + 20 } });
    await pg.goto(`http://127.0.0.1:${okPort}/?w=${w}&h=${h}`);
    const fl = pg.frameLocator("#f");
    await fl.locator('[data-section="menu"] [data-from$=".price"]').first().waitFor({ timeout: 30000 });
    await pg.waitForTimeout(500);
    let shown = 0;
    for (const sel of PARTS) {
      const el = fl.locator(sel).first();
      if (!(await el.count())) continue;
      await centre(el); await el.click();
      for (const text of ["Headline", "Line under the headline"]) {
        await pg.evaluate((t) => { const f = document.getElementById("f"); f.contentWindow.postMessage({ type: "studio-tag", text: t }, new URL(f.src).origin); }, text);
        await pg.waitForTimeout(350);   // and after the scroll the pick started has settled
        const r = await fl.locator("body").evaluate(() => {
          const tag = document.querySelector(".stu-pick b");
          if (!tag || tag.hidden || !tag.textContent) return { hidden: true };
          const t = tag.getBoundingClientRect(), box = document.querySelector(".stu-pick"), out = [];
          const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() && !box.contains(n) ? 1 : 2) });
          const range = document.createRange();
          for (let n = walk.nextNode(); n; n = walk.nextNode()) { range.selectNodeContents(n); for (const x of range.getClientRects()) if (x.width && x.height) out.push({ x, what: n.nodeValue.trim().slice(0, 30) }); }
          for (const e of document.querySelectorAll("img, svg, button, input, select, textarea, a.site-btn")) { const x = e.getBoundingClientRect(); if (x.width && x.height) out.push({ x, what: e.tagName }); }
          const over = out.filter(({ x }) => t.left < x.right && x.left < t.right && t.top < x.bottom && x.top < t.bottom).map((o) => o.what);
          return { hidden: false, over, inside: t.left >= 0 && t.right <= document.documentElement.clientWidth };
        });
        if (r.hidden) continue;
        shown++;
        assert.deepEqual(r.over, [], `${w}px, ${sel}, "${text}": the tag covers content`);
        assert.ok(r.inside, `${w}px, ${sel}: the tag runs off the screen`);
      }
    }
    t.diagnostic(`${w}px: tag drawn for ${shown} picks, hidden for the rest`);
    assert.ok(shown >= 6, `${w}px: the tag was drawn for only ${shown} of the picks (it hides only when nothing is free)`);
    await pg.close();
  }

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
