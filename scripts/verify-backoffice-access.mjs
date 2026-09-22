// Proves — rather than assumes — that a session can sign into the demo
// dashboard and see it. Written 2026-09-22 after docs/gotchas.md § 6 stood
// for a day as "a session cannot open a signed-in dashboard," untested and
// wrong: the demo owner's own `business_users` row is itself inserted by
// scripts/seed-demo.mjs via a direct POST to /rest/v1/business_users using
// the SERVICE ROLE key, and a cold sign-in reaches the real dashboard fine.
// See that entry for the full correction and why the wrong claim survived
// a day despite direct contradicting evidence in the same session.
//
//   node scripts/verify-backoffice-access.mjs
//
// THE CREDENTIAL IS READ OUT OF seed-demo.mjs INTO MEMORY AND NEVER
// PRINTED, LOGGED, OR WRITTEN ANYWHERE — only pass/fail and screen content
// are reported. This is the one, specific, Andrew-sanctioned exception
// (DECISIONS.md, "A guessable demo login, on purpose and temporarily"):
// it reaches the DEMO business only, RLS enforces tenant isolation, and a
// stranger who guesses it can only scribble on fake data. It is not a
// general licence to type any other credential found anywhere in this repo.
//
// Requires the dev server running on :5173 (npm run dev --prefix app) and
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY loaded (only used indirectly,
// through seed-demo.mjs's own credentials already being in the repo).

import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const { chromium } = createRequire(import.meta.url)(join(ROOT, "app/node_modules/playwright/index.js"));

const src = readFileSync(join(ROOT, "scripts/seed-demo.mjs"), "utf8");
const m = src.match(/const OWNER = \{ email: "([^"]+)", password: "([^"]+)" \}/);
if (!m) { console.error("Could not find OWNER credentials in seed-demo.mjs"); process.exit(1); }
const [, email, password] = m; // held only in memory, never logged

const stamp = new Date().toISOString().slice(0, 10);
const OUT = join(ROOT, `receipts/screenshots/backoffice-access-${stamp}`);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

const result = { steps: [] };

await page.goto("http://localhost:5173/app", { waitUntil: "domcontentloaded" });
await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });

const sawSignInForm = (await page.locator("input[type=email]").count()) > 0;
result.steps.push({ step: "cold /app load", sawSignInForm });

if (sawSignInForm) {
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", password);
  await page.click("form button.btn.primary");
}

// Wait for EITHER the real dashboard (.tabbar) OR the create-a-business gate,
// whichever actually happens — do not assume.
const outcome = await Promise.race([
  page.waitForSelector(".tabbar", { timeout: 20000 }).then(() => "dashboard"),
  page.waitForSelector("text=/create.*business/i", { timeout: 20000 }).then(() => "create_business_gate").catch(() => null),
]).catch(() => "timeout");

result.outcome = outcome;
await page.waitForTimeout(1500);

result.bodyPreview = await page.evaluate(() => document.body.innerText.slice(0, 300));

const shot1 = join(OUT, "1-post-signin.png");
await page.screenshot({ path: shot1 });
result.screenshot1 = shot1;

if (outcome === "dashboard") {
  const clientsTab = page.locator('.tabbar button[data-tour="clients"]');
  if (await clientsTab.count()) {
    await clientsTab.first().click();
    await page.waitForTimeout(1500);
    const shot2 = join(OUT, "2-clients-screen.png");
    await page.screenshot({ path: shot2 });
    result.screenshot2 = shot2;
    result.clientsRowCount = await page.locator(".row-item").count();
  }
}

writeFileSync(join(OUT, "result.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
console.log(outcome === "dashboard"
  ? "\nPASS — the demo account reaches the real, signed-in dashboard."
  : `\nFAIL or UNEXPECTED — outcome was "${outcome}", not "dashboard". Investigate before trusting this door.`);
await browser.close();
