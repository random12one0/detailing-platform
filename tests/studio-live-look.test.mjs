// STUDIO S8: the live site looks exactly like the preview it was approved from. The published site is drawn inside
// the platform app (TenantHome on a detailer's own address), whose stylesheet styles bare elements; the preview is
// the Studio renderer on its own page (site.html). Same spec, same data, same width: every element of the site must
// compute the same type, colour and spacing in both. Real browser, offline engine, test host mapping.
// The engine comes from belt-staging (STUDIO_BELT), as for the connection check.
//   node --test tests/studio-live-look.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "app");
const HOST = "brightline.example.test";
const freePort = () => new Promise((r) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => r(p)); }); });
const until = async (fn, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await fn()) return true; } catch {} await new Promise((r) => setTimeout(r, 300)); } return false; };

// every element inside the site, by its place in the tree, with what a person sees of it
function looks() {
  const PROPS = ["font-family", "font-size", "font-weight", "font-style", "font-variation-settings", "letter-spacing", "line-height", "text-transform",
    "color", "background-color", "margin-top", "margin-bottom", "padding-top", "padding-left", "border-top-width", "border-radius", "width", "height"];
  const site = document.querySelector(".site"); if (!site) return null;
  const out = {};
  const walk = (el, key) => {
    const cs = getComputedStyle(el);
    out[key] = Object.fromEntries(PROPS.map((p) => [p, cs.getPropertyValue(p)]));
    [...el.children].forEach((c, i) => walk(c, `${key}>${c.tagName.toLowerCase()}${c.className && typeof c.className === "string" ? "." + c.className.trim().split(/\s+/).join(".") : ""}:${i}`));
  };
  walk(site, "site");
  return out;
}

test("the live site on its own address computes the same look as the preview, element by element", { timeout: 240000 }, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-live-look-"));
  const spec = JSON.parse(readFileSync(path.join(APP, "src/site/specs/brightline.json"), "utf8"));
  const published = path.join(dir, "published.json");
  writeFileSync(published, JSON.stringify({ [HOST]: { slug: spec.slug, site: "brightline", release: 1, revision: 1, spec } }));
  process.env.STUDIO_PUBLISHED = published; process.env.STUDIO_EXAMPLE_PAYING = "1";
  const { startExampleEngine } = await import(pathToFileURL(path.join(ROOT, "scripts/studio/example-engine.mjs")).href);
  const engine = await startExampleEngine({ port: 0 });
  const port = await freePort();
  const vite = spawn(process.execPath, [path.join(APP, "node_modules/vite/bin/vite.js"), "--port", String(port), "--strictPort", "--host", "127.0.0.1"],
    { cwd: APP, env: { ...process.env, VITE_SUPABASE_URL: engine.url, VITE_SUPABASE_ANON_KEY: "demo-anon", STUDIO_TEST_HOSTS: HOST }, windowsHide: true, stdio: "ignore" });
  const { chromium } = createRequire(path.join(APP, "package.json"))("playwright");
  // Launched INSIDE the try: when it throws (no browser installed, as in the belt's scrubbed copy), the finally still
  // stops vite and the engine. Outside it, they kept this file's process alive and the whole suite hung (2026-11-13).
  let browser;
  try {
    browser = await chromium.launch({ args: [`--host-resolver-rules=MAP ${HOST} 127.0.0.1`] });
    assert.ok(await until(() => fetch(`http://127.0.0.1:${port}/`).then((r) => r.ok)), "the renderer did not start");
    const take = async (url, init) => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      if (init) await ctx.addInitScript(init, spec);
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: "networkidle" });
      await page.locator('.site [data-section="hero"] h1').waitFor({ timeout: 30000 });
      await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(500);
      const l = await page.evaluate(looks); await ctx.close(); return l;
    };
    const preview = await take(`http://127.0.0.1:${port}/site/preview`, (s) => { window.__STUDIO_SPEC__ = s; });
    const live = await take(`http://${HOST}:${port}/`);
    assert.ok(preview && live, "both drew the site");
    const keys = Object.keys(preview);
    assert.deepEqual(Object.keys(live), keys, "the same elements");
    const diffs = [];
    for (const k of keys) for (const [p, v] of Object.entries(preview[k])) if (live[k][p] !== v) diffs.push(`${k} ${p}: preview ${v} · live ${live[k][p]}`);
    assert.deepEqual(diffs.slice(0, 25), [], `${diffs.length} differences`);
  } finally {
    await browser?.close().catch(() => {});
    try { spawn("taskkill", ["/T", "/F", "/PID", String(vite.pid)], { windowsHide: true, stdio: "ignore" }); } catch {}
    await engine.close().catch(() => {});
    delete process.env.STUDIO_PUBLISHED; delete process.env.STUDIO_EXAMPLE_PAYING;
    rmSync(dir, { recursive: true, force: true });
  }
});
