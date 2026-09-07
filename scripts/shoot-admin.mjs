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
import { dropAdmin, makeAdmin } from "./admin-account.mjs";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const BASE = process.env.BASE || "http://localhost:5173";
const OUT = process.env.OUT || "shots-admin";
const LITE = process.argv.includes("--lite");
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
// THE ADMIN ACCOUNT IS MADE FOR THIS RUN AND REMOVED AT THE END OF IT —
// roadmap 8.2. It used to be a fixed password written into this file, in a
// PUBLIC repository, for the one account that can see every tenant.
// `scripts/admin-account.mjs` has the finding and the reasoning.
const acct = await makeAdmin(URL_, KEY);
if (!acct) { console.error("could not create the shooter's admin account"); process.exit(1); }
const EMAIL = acct.email, PW = acct.password;

// WHICH BUSINESS TO OPEN. The seeded demo, because it is the only one with
// enough bookings for the six-month bars to have anything in them — a
// screenshot of an empty chart says nothing about whether the chart works.
const pick = process.env.SLUG || "demo-detail";
// Which width walks the impersonation. One by default: it is a flow, and
// walking it five times means five audit rows and five re-signs-in per run.
const IMP = process.env.IMP === "all" ? "all" : Number(process.env.IMP || 392);

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
  // **320 JOINED ON 2026-09-07, WITH ROADMAP 8.2.** It is the narrowest
  // SUPPORTED width and the bar now carries an email address that wraps onto
  // its own line — which is exactly the kind of change that is fine at 392 and
  // breaks at 320. Nothing had ever measured this screen there.
  for (const [w, h] of [[1920, 1080], [1440, 900], [768, 1024], [392, 844], [320, 844]]) {
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

      // ── THE IMPERSONATION, WHICH IS THREE SCREENS AND NOT A BUTTON ──
      // ROADMAP 8.2. Pressing *Open their dashboard* swaps this browser's
      // session for the detailer's, so what it produces is a state you can
      // only reach by DOING it — the gap this repo has now found nine times:
      // *the script walks navigation, and a state you reach by pressing
      // something inside a screen is not navigation.* Added in the change
      // that built it.
      //
      // It runs at ONE width by default because it is a flow rather than a
      // layout, and the two screens it draws are both a paragraph and a
      // button; `IMP=all` walks it at every width if a layout question comes
      // up. The confirm() is answered before the click, not after — a dialog
      // handler registered late leaves Playwright hanging on the alert.
      if (IMP === "all" || w === IMP) {
        // **THE MAGIC LINK COMES BACK POINTING AT PRODUCTION AND THAT IS NOT A
        // BUG IN THE PRODUCT.** `platform-admin` builds it with
        // `redirectTo: ${PLATFORM_URL}/app`, so following it from a dev
        // browser signs you in on detailingplatform.com — a DIFFERENT ORIGIN.
        // The first run of this leg did exactly that and reported *"the
        // dashboard SAYS NOTHING"* and three geometry problems, all of them
        // true of the live build and none of them of the code being tested.
        // The tell is that the shot was right and the measurements were
        // impossible.
        //
        // **THE SERVER IS NOT CHANGED TO FIX THIS.** A redirect target the
        // caller supplies is a client-controlled destination on an auth link,
        // which is the one place not to take a shortcut. The rewrite is here,
        // in the harness, where it belongs — and `http://localhost:5173/**` is
        // already in the project's redirect allow-list, so the patched link is
        // one Supabase would have accepted anyway.
        // **A PREDICATE, NOT A GLOB.** `"**/auth/v1/verify*"` matched
        // NOTHING — Playwright's glob gives `?` its own meaning, so the
        // pattern never reaches a URL with a query string, and the run then
        // reported *"the dashboard SAYS NOTHING"* plus three geometry
        // problems: a perfect description of the LIVE site, measured because
        // the jump had quietly gone to production. A route that matches
        // nothing is silent, which is this repo's oldest failure shape.
        await page.route((u) => u.pathname.endsWith("/auth/v1/verify"), async (route) => {
          const u = new URL(route.request().url());
          u.searchParams.set("redirect_to", `${BASE}/app`);
          await route.fulfill({ status: 302, headers: { location: u.toString() }, body: "" });
        });
        page.once("dialog", (d) => d.accept());
        const go = page.locator(".pa-btn.warn");
        if (await go.count() && await go.isEnabled()) {
          await go.click();
          // The magic link is a real navigation to the auth endpoint and back.
          await page.waitForURL(/\/app/, { timeout: 20_000 }).catch(() => {});
          await settle(page, 14_000);
          const impShot = `${OUT}/${w}-impersonating${LITE ? "-lite" : ""}.png`;
          await page.screenshot({ path: impShot });
          shots.push(impShot);
          bad += await measure(page, "the dashboard, impersonating");
          const strip = await page.locator(".impbar").count();
          console.log(`  ${String(w).padStart(4)}px: the dashboard ${strip ? "says whose it is" : "SAYS NOTHING — no .impbar"}`);
          if (!strip) bad++;

          // AND BACK TO /admin, WHICH IS THE HALF HE ACTUALLY REPORTED.
          await page.goto(`${BASE}/admin${LITE ? "?lite=1" : ""}`, { waitUntil: "domcontentloaded" });
          await settle(page, 14_000);
          const backShot = `${OUT}/${w}-impersonating-admin${LITE ? "-lite" : ""}.png`;
          await page.screenshot({ path: backShot });
          shots.push(backShot);
          bad += await measure(page, "/admin while impersonating");
          const said = await page.locator(".pa-h1").first().textContent().catch(() => "");
          const explained = /signed in as/i.test(said ?? "");
          console.log(`  ${String(w).padStart(4)}px: /admin ${explained ? "explains itself" : `SAYS "${said}" — the 404 with no way back`}`);
          if (!explained) bad++;
        } else {
          console.log(`  ${String(w).padStart(4)}px: NOT MEASURED — no enabled "Open their dashboard" on ${pick}`);
        }
      }
    } else {
      console.log(`  ${w}px: NOT MEASURED — no row matching "${pick}"`);
    }

    // The console, at every width. A screen that draws correctly and warns on
    // every render is a screen that is about to break for a reason nobody
    // wrote down.
    //
    // **IT READS WHATEVER PAGE THE WALK LEFT, AND AT THE IMPERSONATION WIDTH
    // THAT IS `/admin` SIGNED IN AS A DETAILER — where TWO 404s are the
    // product working exactly as designed.** `platform-admin` answers 404 to
    // everybody who is not an admin rather than 403 (roadmap 4.4: a 403 tells
    // a curious detailer the endpoint exists), and this screen treats that as
    // the ordinary case and draws *"You are signed in as…"*. So the URL is
    // printed beside the count: without it the line reads as a defect in the
    // screen that has just been photographed and measured clean, and somebody
    // spends twenty minutes proving it is not.
    const errs = [];
    page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1800);
    // **THE DETECTOR IS THIS SCREEN'S OWN HEADING, NOT `.impbar`.** That strip
    // is drawn on the DASHBOARD; `/admin` under an impersonated session draws
    // the explainer instead, so the first version of this line never fired and
    // the count went out unlabelled - the label written to stop somebody
    // chasing a non-defect, doing nothing, silently.
    const said = await page.locator(".pa-h1").first().textContent().catch(() => "");
    const where = new URL(page.url()).pathname
      + (/signed in as/i.test(said ?? "")
        ? " (impersonating - a 404 from platform-admin is the designed non-admin answer)" : "");
    console.log(`${String(w).padStart(4)}px  ${errs.length ? `${errs.length} console errors` : "console clean"}  on ${where}`);
    for (const e of errs.slice(0, 3)) console.log(`        ${e.slice(0, 140)}`);
    await ctx.close();
  }
} finally {
  await browser.close();
  await dropAdmin(URL_, KEY, acct.id);
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
