// The three pictures in the home page's hero, captured from the real product.
//
//   node scripts/build-examples.mjs --dev     # /ex1 must be served
//   node scripts/capture-hero-panes.mjs       # writes app/public/img/hero-*.jpg
//
// Dev server on :5173 and the demo seed; reads only. Signs in as the demo
// owner through the real form, the way shoot-dashboard.mjs does.
//
// ROADMAP 7.9 — "the hero product shot is too small and dim to judge". The
// old three were 443–531px wide at 1x, which is why the hero capped them at
// 430px and showed them at ~382: they could not be drawn any larger without
// going soft (the note on `.hframe` in landing.css). These are captured at
// TWICE the pixels they are shown at, so the column can grow and stay sharp.
//
// BRIGHTER BY CHOICE OF SCREEN, NEVER BY EDITING PIXELS. Pane one is "a real
// tenant site", and of the five example sites Prime (/ex1) is the one on a
// light ground — the old shot was Delgado, near-black. The booking page and
// the dashboard are dark because the product is; lightening a screenshot of
// them would be a picture of something the product does not look like.
//
// They go stale when the screens change. Re-run this; nothing else to do.

import { createRequire } from "node:module";
import { demoOwner } from "./lib/demoOwner.mjs";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const BASE = process.env.BASE || "http://localhost:5173";
const OUT = "app/public/img";
const browser = await chromium.launch();

async function shot(name, url, viewport, dpr, prep, clipOf) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  if (prep) await prep(page);
  await page.goto(BASE + url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  const path = `${OUT}/${name}.jpg`;
  const clip = clipOf ? await page.evaluate(clipOf) : undefined;
  await page.screenshot({ path, type: "jpeg", quality: 86, clip });
  const c = clip || { width: viewport.width, height: viewport.height };
  console.log(`${path}  ${Math.round(c.width * dpr)}x${Math.round(c.height * dpr)}`);
  await ctx.close();
}

// 1 · a real tenant site, its desktop first screen, at half size ×2.
await shot("hero-site", "/ex1/", { width: 1100, height: 900 }, 1);

// 2 · the real booking page, step one.
await shot("hero-booking", "/book/demo-detail", { width: 460, height: 470 }, 2);

// 3 · the real dashboard, Today — from the money row to the end of the first
// job, which is the part only this product has (Call, Text, Mark complete).
// Cropped rather than shot from the top: the demo account is deliberately
// half set up, and its "Your page isn't fully set up" card is not the
// dashboard a working detailer sees. Measured from the page, not a pixel
// offset, so a layout change moves the crop with it.
await shot("hero-dashboard", "/app", { width: 530, height: 1300 }, 2, async (page) => {
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 20000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", "demo@detailplatform.com");  // mail-sink: a dashboard login, never a recipient
    await page.fill("input[type=password]", demoOwner().password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
  }
}, () => {
  const money = [...document.querySelectorAll("*")].find((e) => !e.children.length && e.textContent.trim() === "expected");
  const rail = document.querySelector(".dayrail");
  const top = money.parentElement.parentElement.getBoundingClientRect().top - 14;
  return { x: 0, y: top, width: 530, height: rail.getBoundingClientRect().bottom + 16 - top };
});

await browser.close();
