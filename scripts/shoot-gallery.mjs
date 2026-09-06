// Photograph the WHOLE product, at a desk and on a phone, small enough to
// embed in one page the owner can click through.
//
// `shoot-dashboard.mjs` already walks the dashboard and saves PNGs at full
// resolution, which is right for judging a hairline and wrong for this: sixty
// full-size PNGs is ~40 MB and an artifact has to fit inside 16 MB with the
// images inlined as data URIs, because this account has no artifact asset
// store.
//
// **THE TRICK IS `deviceScaleFactor`, NOT A SMALLER VIEWPORT.** Shrinking the
// viewport would change the LAYOUT — it would photograph the 936px design
// rather than the 1440px one, which is the opposite of a review. A fractional
// device scale factor renders the real 1440 layout and hands back a smaller
// image of it. JPEG at 68 does the rest.
//
// Needs the dev server on :5173 and a seeded demo. Writes gallery/*.jpg and
// gallery/manifest.json.
//
//   node scripts/shoot-gallery.mjs

import { mkdirSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i < 1 || line.trim().startsWith("#")) continue;
  const k = line.slice(0, i).trim();
  if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
}

const BASE = process.env.BASE || "http://localhost:5173";
const OUT = "gallery";
mkdirSync(OUT, { recursive: true });

const refs = JSON.parse(readFileSync(new URL("./demo-refs.json", import.meta.url), "utf8"));
const OWNER = { email: "demo@detailplatform.com", password: "demo123" };

// 1440 is the desk the design is drawn for; 392 is THE PHONE THE WHOLE PRODUCT
// IS MEASURED AGAINST. 0.62 lands a 1440 layout at ~893px, which is wide
// enough to read every label and a third of the bytes.
const WIDTHS = [
  { key: "desk", width: 1440, height: 900, dsf: 0.62 },
  { key: "phone", width: 392, height: 844, dsf: 0.72 },
];

const shots = [];
let seq = 0;

async function snap(page, { group, name, note = "", full = false }) {
  const file = `${String(++seq).padStart(3, "0")}-${name.replace(/\W+/g, "-").toLowerCase()}.jpg`;
  await page.screenshot({ path: `${OUT}/${file}`, type: "jpeg", quality: 68, fullPage: full });
  const bytes = statSync(`${OUT}/${file}`).size;
  shots.push({ file, group, name, note, width: page.viewportSize().width, bytes });
  return bytes;
}

const settle = async (page, ms = 1200) => page.waitForTimeout(ms);

const browser = await chromium.launch();

for (const w of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width: w.width, height: w.height },
    deviceScaleFactor: w.dsf,
  });
  const page = await ctx.newPage();
  const label = (n) => `${n}`;

  // ── The public half, no session ────────────────────────────────────────
  for (const [path, name, full] of [
    ["/", "Home", true],
    ["/pricing", "Pricing", true],
    ["/terms", "Terms", true],
    ["/privacy", "Privacy", true],
    [`/book/${refs.slug}`, "Booking page", false],
  ]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await settle(page, 2200);
    await snap(page, { group: `Public · ${w.key}`, name: label(name), full });
  }

  // A couple of steps into the booking flow — the screens a customer meets.
  try {
    const go = page.getByRole("button", { name: /Continue|Next/ }).first();
    for (const step of ["Booking · pick a time", "Booking · your details"]) {
      if (!(await go.count())) break;
      await go.click();
      await settle(page, 1600);
      await snap(page, { group: `Public · ${w.key}`, name: label(step) });
    }
  } catch { /* the flow gates on a choice; one screen is still worth having */ }

  // ── The dashboard ──────────────────────────────────────────────────────
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await snap(page, { group: `Public · ${w.key}`, name: label("Sign in") });
    await page.fill("input[type=email]", OWNER.email);
    await page.fill("input[type=password]", OWNER.password);
    await page.click("form button.btn.primary");
  }
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  // ROADMAP 2.24 — the guides are marked seen before anything is
  // photographed. A guide across the middle of a screenshot is not a
  // screenshot of the product; the same treatment `sweep-widths.mjs` and
  // `shoot-dashboard.mjs` take, and for the same reason.
  await page.evaluate(() => {
    try {
      localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "money", "clients", "business"]));
      localStorage.setItem("dp.tour", "1");
    } catch { /* private mode */ }
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  await settle(page, 2500);

  for (const tab of ["Today", "Calendar", "Money", "Clients", "Business"]) {
    await page.getByRole("button", { name: tab, exact: true }).first().click();
    await settle(page, 1800);
    await snap(page, { group: `Dashboard · ${w.key}`, name: label(tab), full: true });
  }

  // The job record, which is where a detailer spends the most time.
  await page.getByRole("button", { name: "Today", exact: true }).first().click();
  await settle(page, 1500);
  for (const sel of [".dayrail .row-item.landed", ".dayrail .row-item", ".settled-row"]) {
    if (await page.locator(sel).count()) {
      await page.locator(sel).first().click();
      await settle(page, 1800);
      await snap(page, { group: `Dashboard · ${w.key}`, name: label("A job"), full: true });
      await page.keyboard.press("Escape");
      await settle(page, 800);
      break;
    }
  }

  // ── Every settings screen, discovered rather than listed ───────────────
  // A hardcoded list is a list that silently stops covering the screen added
  // last week — which is exactly how nobody noticed a crash in Promo codes.
  await page.getByRole("button", { name: "Business", exact: true }).first().click();
  await settle(page, 1600);
  const bizRows = await page.locator(".nav-row .name").allInnerTexts();
  for (const row of bizRows) {
    const btn = page.locator(".nav-row", { hasText: row }).first();
    if (!(await btn.count())) continue;
    await btn.click();
    await settle(page, 1800);
    await snap(page, { group: `Settings · ${w.key}`, name: label(row), full: true });
    await page.keyboard.press("Escape");
    await settle(page, 800);
  }

  const gear = page.locator("button[aria-pressed]").first();
  if (await gear.count()) {
    await gear.click();
    await settle(page, 1500);
    await snap(page, { group: `Settings · ${w.key}`, name: label("Settings menu"), full: true });
    const gearRows = await page.locator(".nav-row .name").allInnerTexts();
    for (const row of gearRows) {
      const btn = page.locator(".nav-row", { hasText: row }).first();
      if (!(await btn.count())) continue;
      await btn.click();
      await settle(page, 1800);
      await snap(page, { group: `Settings · ${w.key}`, name: label(row), full: true });
      await page.keyboard.press("Escape");
      await settle(page, 800);
    }
  }
  await ctx.close();
}

// ── The back office, which only he ever sees ─────────────────────────────
for (const w of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width: w.width, height: w.height },
    deviceScaleFactor: w.dsf,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", refs.platformAdmin.email);
    await page.fill("input[type=password]", refs.platformAdmin.password);
    await page.click("form button.btn.primary");
    await page.waitForTimeout(4000);
  }
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4500);
  await snap(page, { group: `Back office · ${w.key}`, name: "Detailers", full: true });
  const first = page.locator(".pa-rowbtn").first();
  if (await first.count()) {
    await first.click();
    await page.waitForTimeout(2500);
    await snap(page, { group: `Back office · ${w.key}`, name: "One detailer", full: true });
  }
  await ctx.close();
}

await browser.close();

writeFileSync(`${OUT}/manifest.json`, JSON.stringify(shots, null, 2));
const total = shots.reduce((a, s) => a + s.bytes, 0);
console.log(`${shots.length} shots · ${(total / 1024 / 1024).toFixed(1)} MB on disk`);
console.log(`base64 in a page ≈ ${((total * 4 / 3) / 1024 / 1024).toFixed(1)} MB of the 16 MB ceiling`);
for (const s of [...shots].sort((a, b) => b.bytes - a.bytes).slice(0, 5)) {
  console.log(`  biggest: ${s.group} / ${s.name} — ${(s.bytes / 1024).toFixed(0)} KB`);
}
