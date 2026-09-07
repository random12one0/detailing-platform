// One-off: the two DASHBOARD states roadmap 8.10 adds — the vehicle settings
// and the bulk-job form — plus a job record with three cars on it.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("./app/node_modules/playwright/index.js");

const BASE = "http://localhost:5173";
const OUT = "shots-810";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 392, height: 844 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
const errors = [];
p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
const settle = (ms = 1200) => p.waitForTimeout(ms);

await p.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
await p.locator("input[type=email]").fill("demo@detailplatform.com");
await p.locator("input[type=password]").fill("demo123");
await p.locator("form button.btn.primary").click();
await p.waitForSelector(".app-main", { timeout: 30000 });
// The tab guides arrive unasked on a fresh browser and swallow clicks.
await p.evaluate(() => localStorage.setItem("dp.tours", JSON.stringify(
  ["shell", "today", "money", "clients", "business"])));
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForSelector(".app-main", { timeout: 30000 });
await settle(1800);

// ── The vehicle settings ────────────────────────────────────────────────
await p.getByRole("button", { name: "Business" }).click();
await settle(1400);
await p.locator(".nav-row", { hasText: "Booking rules" }).first().click();
await settle(1600);
const cars = p.locator(".setting", { hasText: "Cars in one booking" }).first();
await cars.scrollIntoViewIfNeeded();
await settle(800);
await p.screenshot({ path: `${OUT}/settings-cars-1.png` });
// Raise it, so the setup row appears — the second setting only exists once
// the first is above one, which is the thing to LOOK at.
const plus = cars.locator('button[aria-label="More"]');
for (let i = 0; i < 2; i++) { await plus.click(); await settle(500); }
await cars.scrollIntoViewIfNeeded();
await settle(900);
await p.screenshot({ path: `${OUT}/settings-cars-3.png` });
console.log("settings shot");

// ── The bulk-job form ───────────────────────────────────────────────────
await p.keyboard.press("Escape");
await settle(1000);
await p.getByRole("button", { name: "Money" }).click();
await settle(2000);
const log = p.getByRole("button", { name: /log a bulk job/i }).first();
await log.scrollIntoViewIfNeeded();
await settle(600);
await p.screenshot({ path: `${OUT}/money-bulk-door.png` });
await log.click();
await settle(1400);
await p.locator(".sheet input").nth(0).fill("Ridgeline Motors");
await p.locator(".sheet input").nth(1).fill("10");
await p.locator(".sheet .money-field input, .sheet input").nth(2).fill("2400");
await settle(900);
await p.screenshot({ path: `${OUT}/money-bulk-form.png` });
console.log("bulk shot");

// ── A job record with three cars ────────────────────────────────────────
// STRAIGHT TO THE RECORD BY ITS OWN ROUTE. Walking Clients meant clicking a
// row inside a sheet whose backdrop swallows the next press, which is a
// harness problem rather than anything about the screen.
await p.locator(".sheet-close").first().click().catch(() => p.keyboard.press("Escape"));
await p.locator(".sheet-backdrop").waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
await settle(1000);
await p.goto(`${BASE}/job/${process.argv[2]}`, { waitUntil: "domcontentloaded" });
await p.waitForSelector(".app-main", { timeout: 30000 });
await settle(2000);
const vehicles = p.locator("text=3 vehicles").first();
if (await vehicles.count()) await vehicles.scrollIntoViewIfNeeded();
await settle(900);
await p.screenshot({ path: `${OUT}/job-three-cars.png` });
console.log("job record shot; '3 vehicles' present:", await vehicles.count());

console.log(errors.length ? `console errors: ${errors.join(" | ")}` : "console clean");
await b.close();
