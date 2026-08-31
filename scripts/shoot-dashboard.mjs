// Walk the dashboard in a real browser and save full-page screenshots.
//
// Written in roadmap 2.3 because the design system's verification routine
// ("screenshot at 1920 / 1440x900 / 768x1024 / 392x844, console read at each,
// normal path AND ?lite=1") had no way to reach the dashboard at all — it is
// behind a login, so every previous visual check stopped at the public pages.
// That gap is why nobody had ever opened all eleven settings screens, and why
// a crash in Promo codes survived until this item.
//
// Needs: the dev server on :5173 (npm run dev --prefix app) and a seeded demo
// business (node scripts/seed-demo.mjs). It signs in through the REAL form,
// so the sign-in path is exercised too.
//
//   node scripts/shoot-dashboard.mjs                       # five tabs
//   node scripts/shoot-dashboard.mjs --lite                # the .lite path
//   node scripts/shoot-dashboard.mjs --tab today,money
//   node scripts/shoot-dashboard.mjs --more "Hours,Team"   # settings sheets
//
// OUT=<dir> chooses where the PNGs go (default ./shots). Prints every console
// error and warning seen at any width, which is the half that matters.
// playwright is a devDependency of app/, which is the only npm project here.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
import { mkdirSync } from "node:fs";

const OUT = process.env.OUT || "shots";
const BASE = "http://localhost:5173";
const LITE = process.argv.includes("--lite");
const WIDTHS = [[1920, 1080], [1440, 900], [768, 1024], [392, 844]];
const argOf = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
const TABS = (argOf("--tab") || "today,calendar,money,clients,more").split(",");
const MORE = argOf("--more");   // comma list of settings keys to open
const LABEL = { today: "Today", calendar: "Calendar", money: "Money", clients: "Clients", more: "More" };

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const problems = [];

for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") problems.push(`${w} ${m.type()}: ${m.text().slice(0, 200)}`);
  });
  page.on("pageerror", (e) => problems.push(`${w} pageerror: ${e.message}`));

  await page.goto(`${BASE}/app${LITE ? "?lite=1" : ""}`, { waitUntil: "domcontentloaded" });
  // Sign in through the real form, so the form itself is exercised too.
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 20000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", "demo@detailplatform.com");
    await page.fill("input[type=password]", "DemoDetail2026!");
    await page.click("form button.btn.primary");
  }
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  await page.waitForTimeout(2500);

  for (const t of TABS) {
    await page.getByRole("button", { name: LABEL[t], exact: true }).first().click();
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${OUT}/${w}-${t}${LITE ? "-lite" : ""}.png`, fullPage: true });
  }

  if (MORE) {
    await page.getByRole("button", { name: "More", exact: true }).first().click();
    await page.waitForTimeout(1500);
    for (const key of MORE.split(",")) {
      const btn = page.locator(`.nav-row`, { hasText: key });
      if (!(await btn.count())) { problems.push(`${w}: no More row matching "${key}"`); continue; }
      await btn.first().click();
      await page.waitForTimeout(1800);
      await page.screenshot({ path: `${OUT}/${w}-more-${key.replace(/\W+/g, "")}${LITE ? "-lite" : ""}.png` });
      const x = page.locator(".sheet .x, .sheet-grab button");
      if (await x.count()) { await x.first().click(); await page.waitForTimeout(700); }
    }
  }
  await ctx.close();
}
await browser.close();
console.log(problems.length ? problems.join("\n") : "console clean at every width");
