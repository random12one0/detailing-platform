// PHOTOGRAPH THE BACK OFFICE, at the widths the design rules verify at.
//
// **Nothing in this repo could take a picture of `/admin`.**
// `shoot-dashboard.mjs` signs in as the demo DETAILER, and `--url` shoots a
// PUBLIC page; the back office is behind a `platform_admins` row, so it fell
// between the two — which is a large part of why it was the screen nobody had
// looked at, and why the owner's first reaction to it was that it did not feel
// finished.
//
//   node --env-file=.env scripts/shoot-admin.mjs
//   node --env-file=.env scripts/shoot-admin.mjs --lite
//   OUT=shots-admin node --env-file=.env scripts/shoot-admin.mjs
//
// Needs the dev server and a platform-admin login. It creates its OWN, the way
// `two-detailers.mjs` does, rather than depending on `scripts/demo-refs.json`
// existing: a shooter that fails because somebody re-seeded without
// `--platform-admin` is a shooter nobody runs. The account it makes is marked
// in `platform_admins.note` so it is obvious what it is.
//
// FOUR WIDTHS, and the reasoning is CLAUDE.md's: 1920 is the owner's own
// monitor and where "not enough content to fill the viewport" bugs live, 1440
// is the laptop, 768 is the tablet where the two columns collapse to one, and
// 392 is the phone he actually reads these on.

import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
// AND IT MEASURES, not only photographs — see scripts/geometry.mjs for why
// this screen needs its own copy of the three questions the width sweep asks.
import { measure } from "./geometry.mjs";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const BASE = process.env.BASE || "http://localhost:5173";
const OUT = process.env.OUT || "shots-admin";
const LITE = process.argv.includes("--lite");
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const EMAIL = "shoot-admin@detailplatform.com";
const PW = "Aa1!shoot-admin-back-office";

// The admin account, made and re-made every run. The password is reset each
// time because the row may survive from a previous lap: a sign-in that quietly
// fails would leave every shot below being a photograph of a login form, which
// is the "a skipped check reads like a passing one" failure in picture form.
{
  await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST", headers: H,
    body: JSON.stringify({ email: EMAIL, password: PW, email_confirm: true }),
  });
  const all = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=200`, { headers: H })).json();
  const user = (all.users ?? []).find((u) => u.email === EMAIL);
  if (!user) { console.error("could not create the shooter's admin account"); process.exit(1); }
  await fetch(`${URL_}/auth/v1/admin/users/${user.id}`, {
    method: "PUT", headers: H, body: JSON.stringify({ password: PW, email_confirm: true }),
  });
  await fetch(`${URL_}/rest/v1/platform_admins?user_id=eq.${user.id}`, { method: "DELETE", headers: H });
  await fetch(`${URL_}/rest/v1/platform_admins`, {
    method: "POST", headers: H,
    body: JSON.stringify([{ user_id: user.id, email: EMAIL, note: "Screenshot script only — safe to delete." }]),
  });
}

// WHICH BUSINESS TO OPEN. The seeded demo, because it is the only one with
// enough bookings for the six-month bars to have anything in them — a
// screenshot of an empty chart says nothing about whether the chart works.
const pick = process.env.SLUG || "demo-detail";

mkdirSync(OUT, { recursive: true });

const settle = async (page, cap = 9000) => {
  const until = Date.now() + cap;
  while (Date.now() < until) {
    await page.waitForTimeout(120);
    const busy = await page.evaluate(() =>
      !!document.querySelector(".spinner, [data-loading]")
      || document.getAnimations().some((a) => a.playState === "running"
        && a.effect?.getTiming?.().iterations !== Infinity));
    if (!busy) return;
  }
};

const browser = await chromium.launch();
const shots = [];
let bad = 0;
try {
  for (const [w, h] of [[1920, 1080], [1440, 900], [768, 1024], [392, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const url = `${BASE}/admin${LITE ? "?lite=1" : ""}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.fill("input[type=email]", EMAIL);
    await page.fill("input[type=password]", PW);
    await page.click("form button.pa-btn");
    await page.waitForTimeout(2600);
    await settle(page);

    const listShot = `${OUT}/${w}-list${LITE ? "-lite" : ""}.png`;
    await page.screenshot({ path: listShot });
    shots.push(listShot);
    bad += await measure(page, "the list");

    // OPEN ONE, and wait for the panel rather than for a repaint: its content
    // comes from an edge function, and `settle` returns happily on a screen
    // that is perfectly quiet because it is still waiting for a fetch — the
    // trap CLAUDE.md records against both of the other two shooters.
    const row = page.locator(".pa-rowbtn").filter({ hasText: pick === "demo-detail" ? "Coastline" : pick }).first();
    if (await row.count()) {
      await row.click();
      await page.locator(".pa-block").first().waitFor({ timeout: 12_000 }).catch(() => {});
      await settle(page);
      // **BACK TO THE TOP BEFORE THE SHOT.** Playwright scrolls an element
      // into view before clicking it, so opening a detailer near the bottom
      // of the list leaves the PAGE scrolled — and every shot came back
      // missing its own strip, which reads as a screen whose figures are
      // broken rather than as a screenshot taken from the wrong place.
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        // The rail has its own scroll at a desk, and Playwright scrolled IT
        // to reach the row — so without this the shot shows the list starting
        // on half a row, which reads as a clipped layout rather than as a
        // list that has been scrolled.
        document.querySelector(".pa-rail")?.scrollTo(0, 0);
      });
      await page.waitForTimeout(400);
      const openShot = `${OUT}/${w}-open${LITE ? "-lite" : ""}.png`;
      await page.screenshot({ path: openShot });
      shots.push(openShot);
      bad += await measure(page, "a business open");
    } else {
      console.log(`  ${w}px: NOT MEASURED — no row matching "${pick}"`);
    }

    // The console, at every width. A screen that draws correctly and warns on
    // every render is a screen that is about to break for a reason nobody
    // wrote down.
    const errs = [];
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1800);
    console.log(`${String(w).padStart(4)}px  ${errs.length ? `${errs.length} console errors` : "console clean"}`);
    for (const e of errs.slice(0, 3)) console.log(`        ${e.slice(0, 140)}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}

console.log(`\n${shots.length} shots → ${OUT}/`);
for (const s of shots) console.log(`  ${s}`);
console.log("");
console.log(bad
  ? `${bad} geometry problem(s) — see above`
  : "clean at 1920, 1440, 768 and 392: nothing past an edge, nothing outside its own box, no sideways scroll");
// A MEASUREMENT THAT CANNOT FAIL A RUN IS A MEASUREMENT NOBODY READS — the
// same reason `sweep-widths.mjs` exits non-zero rather than only printing.
process.exit(bad ? 1 : 0);
