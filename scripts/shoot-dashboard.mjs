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
//   node scripts/shoot-dashboard.mjs --accent Crimson      # retinted, law 11
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
// --accent <PresetName> picks a tenant colour through the REAL screen before
// shooting: More > Your colour > the swatch with that aria-label. Added when
// law 11 was rewritten (roadmap 2.3 reopened) and the dashboard started
// taking the tenant's accent, because "sweep the extremes" needs a way to
// BE each extreme. Going through the UI rather than writing the database
// direct is deliberate — it proves the save and the live retint, not just
// the stylesheet.
const ACCENT = argOf("--accent");
const LABEL = { today: "Today", calendar: "Calendar", money: "Money", clients: "Clients", more: "More" };
const suffix = `${ACCENT ? `-${ACCENT.toLowerCase()}` : ""}${LITE ? "-lite" : ""}`;

mkdirSync(OUT, { recursive: true });
// --- SETTLE, NOT SLEEP ------------------------------------------------------
// The same change `sweep-widths.mjs` got on 2026-09-02, for the same reason and
// with the same guards: wait until the DOM has been quiet for 130ms, no FINITE
// animation is still running (infinite ones — the ground's 54-second drift —
// are excluded, and a `.spinner` means keep waiting), and take the old fixed
// number as a CAP rather than as a value. A screenshot taken before the
// arrival stagger lands is a picture of the wrong screen, so this is not
// "wait less", it is "wait for the thing".
const settle = (page, cap = 2000) => page.evaluate(async (cap) => {
  const t0 = performance.now();
  const QUIET = 130;
  let last = performance.now();
  const obs = new MutationObserver(() => { last = performance.now(); });
  obs.observe(document.documentElement, {
    subtree: true, childList: true, attributes: true, characterData: true,
  });
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  try {
    for (;;) {
      await frame();
      const now = performance.now();
      if (now - t0 >= cap) return Math.round(now - t0);
      if (document.querySelector(".spinner")) { last = now; continue; }
      const busy = document.getAnimations().some((a) => {
        if (a.playState !== "running") return false;
        const t = a.effect && a.effect.getComputedTiming && a.effect.getComputedTiming();
        return !t || t.iterations !== Infinity;
      });
      if (!busy && now - last >= QUIET) return Math.round(now - t0);
    }
  } finally { obs.disconnect(); }
}, cap);

// One sign-in, not four. The FIRST width still goes through the real form.
let signedIn = null;

const browser = await chromium.launch();
const problems = [];

for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 1,
    ...(signedIn ? { storageState: signedIn } : {}),
  });
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
    // Must match scripts/seed-demo.mjs. It did NOT for a while: the demo
    // login was simplified to demo123 in commit 1f3f945 and this line kept
    // the old password, so this script — the one thing that opens the
    // dashboard at all — could not sign in. Change both or neither.
    await page.fill("input[type=password]", "demo123");
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
    signedIn = await ctx.storageState();
  }
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  await settle(page, 2500);

  if (ACCENT) {
    await page.getByRole("button", { name: "More", exact: true }).first().click();
    await settle(page, 1200);
    await page.locator(".nav-row", { hasText: "Your colour" }).first().click();
    await settle(page, 1200);
    const sw = page.locator(`.swatch-row button[aria-label="${ACCENT}"]`);
    if (!(await sw.count())) problems.push(`${w}: no preset swatch named "${ACCENT}"`);
    else {
      await sw.first().click();
      await settle(page, 1800);   // save + reload() + repaint
    }
    const x = page.locator(".sheet .x, .sheet-grab button");
    if (await x.count()) { await x.first().click(); await settle(page, 700); }
  }

  for (const t of TABS) {
    await page.getByRole("button", { name: LABEL[t], exact: true }).first().click();
    await settle(page, 2200);
    await page.screenshot({ path: `${OUT}/${w}-${t}${suffix}.png`, fullPage: true });
  }

  if (MORE) {
    await page.getByRole("button", { name: "More", exact: true }).first().click();
    await settle(page, 1500);
    for (const key of MORE.split(",")) {
      const btn = page.locator(`.nav-row`, { hasText: key });
      if (!(await btn.count())) { problems.push(`${w}: no More row matching "${key}"`); continue; }
      await btn.first().click();
      await settle(page, 1800);
      await page.screenshot({ path: `${OUT}/${w}-more-${key.replace(/\W+/g, "")}${suffix}.png` });
      const x = page.locator(".sheet .x, .sheet-grab button");
      if (await x.count()) { await x.first().click(); await settle(page, 700); }
    }
  }
  await ctx.close();
}
await browser.close();
console.log(problems.length ? problems.join("\n") : "console clean at every width");
