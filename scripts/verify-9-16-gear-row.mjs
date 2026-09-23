// Verifies ROADMAP 9.16 both directions: the owner-only "The website
// business" row is gated on real platform-admin status (app/src/components/
// GearMenu.jsx), not on a business role. Two accounts, both already in
// scripts/seed-demo.mjs under the same Andrew-sanctioned demo-login
// exception as OWNER (DECISIONS.md, "A guessable demo login, on purpose and
// temporarily"): OWNER (platform admin, per platform_admins) and STAFF
// (business_users role "staff", confirmed NOT in platform_admins).
//
// Credentials are read out of seed-demo.mjs into memory and never printed,
// logged, or written anywhere — only pass/fail and screen content.
//
//   node scripts/verify-9-16-gear-row.mjs

import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const { chromium } = createRequire(import.meta.url)(join(ROOT, "app/node_modules/playwright/index.js"));

const src = readFileSync(join(ROOT, "scripts/seed-demo.mjs"), "utf8");
const owner = src.match(/const OWNER = \{ email: "([^"]+)", password: "([^"]+)" \}/);
const staff = src.match(/const STAFF = \{ email: "([^"]+)", password: "([^"]+)" \}/);
if (!owner || !staff) { console.error("Could not find OWNER/STAFF credentials in seed-demo.mjs"); process.exit(1); }

const stamp = new Date().toISOString().slice(0, 10);
const OUT = join(ROOT, `receipts/screenshots/9-16-gear-row-${stamp}`);
mkdirSync(OUT, { recursive: true });

async function checkAccount(browser, label, email, password) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  await page.goto("http://localhost:5173/app", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", email);
    await page.fill("input[type=password]", password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
  }

  await page.click('button[data-tour="gear"]');
  // isPlatformAdmin resolves asynchronously (an edge-function fetch) — give
  // it real time to settle rather than reading the row at first paint.
  await page.waitForTimeout(2500);

  const hasRow = await page.locator("text=The website business").count();
  const shot = join(OUT, `${label}.png`);
  await page.screenshot({ path: shot });

  await ctx.close();
  return { label, email, hasRow: hasRow > 0, screenshot: shot };
}

const browser = await chromium.launch();
const results = {};
results.owner = await checkAccount(browser, "owner", owner[1], owner[2]);
results.staff = await checkAccount(browser, "staff", staff[1], staff[2]);
await browser.close();

writeFileSync(join(OUT, "result.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));

const pass = results.owner.hasRow === true && results.staff.hasRow === false;
console.log(pass
  ? "\nPASS — owner sees the row, staff (non-admin) does not."
  : "\nFAIL — check result.json; the gate is not behaving as expected.");
