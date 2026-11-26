// ROADMAP 97.50 proof: with calculate-booking held for 4s, tapping a service
// shows "Starting at $X" in the bar at once, then the server's figure replaces it.
//   BASE=http://127.0.0.1:5198 node --env-file=<.env> --import ./scripts/lib/inject-app-env.mjs scripts/device-price-proof.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("../app/node_modules/playwright/index.js");
const BASE = process.env.BASE || "http://127.0.0.1:5198";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.route(/calculate-booking/, async (r) => { await new Promise((s) => setTimeout(s, 4000)); r.continue().catch(() => {}); });
await page.goto(`${BASE}/book/demo-detail`, { waitUntil: "domcontentloaded" });
const card = page.locator("[class*=svc], [class*=service]").filter({ hasText: /\$/ }).first();
await card.waitFor({ timeout: 30000 });
await card.click();
const total = page.locator(".bk-bar .total");
await page.waitForFunction(() => /Starting at/.test(document.querySelector(".bk-bar .total")?.textContent || ""), null, { timeout: 3000 });
const early = (await total.innerText()).replace(/\s+/g, " ");
await page.screenshot({ path: "device-price-early.png" });
await page.waitForFunction(() => /Estimated total/.test(document.querySelector(".bk-bar .total")?.textContent || ""), null, { timeout: 15000 });
const final = (await total.innerText()).replace(/\s+/g, " ");
console.log({ early, final });
await browser.close();
