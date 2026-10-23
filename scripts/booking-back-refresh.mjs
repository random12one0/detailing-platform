// ROADMAP 97.45 — THE PHONE'S BACK BUTTON STAYS IN THE BOOKING, AND A REFRESH KEEPS IT.
//
//   BASE=http://localhost:5199 node scripts/booking-back-refresh.mjs
//
// Needs a dev server with the demo business (public page, no login). At 390 and 1440: walks to the date
// step, picks a day and a time, continues to Details and types a name, then
//   - browser Back  -> the date step, the same time still chosen, focus on the step heading (97.47)
//   - browser Forward -> Details, the name still typed
//   - refresh -> Details, the name still typed; Back from there walks every step down to step 1
//     without leaving /book/demo-detail
//   - a fresh tab opened on ?step=6 starts at step 1 (an address cannot skip unanswered steps)
//   - a completed booking clears the draft: create-booking is answered IN THE BROWSER with a fake
//     success (nothing reaches the database), then the tab's draft is gone and a refresh starts over.
// Screenshots: $SHOTS or .manager-shots/97.45/. Exits 1 on any miss or console error/warning.

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "./receipt.mjs";
import { advance, countQuotes, pickDay, quoted, settle, stepNow } from "./lib/bookingWalk.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const BASE = process.env.BASE || "http://localhost:5173";
const ART = process.env.SHOTS || join(REPO, ".manager-shots", "97.45");
mkdirSync(ART, { recursive: true });

const fails = [];
let checks = 0;
const expect = (ok, what) => { checks++; console.log(`${ok ? "OK  " : "FAIL"} ${what}`); if (!ok) fails.push(what); };
const nameBox = (page) => page.locator("input:visible").first();
const chosenTime = (page) => page.evaluate(() => document.querySelector(".bk-slots .bk-chip.selected")?.innerText.trim() ?? null);
const onHeading = (page) => page.evaluate(() => document.activeElement === document.querySelector(".bk-step-head h2"));
// Tolerant on purpose: on unfixed code Back LEAVES the page, and that must print as a FAIL line, not a crash.
const nav = async (page, how) => {
  await page[how]({ waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForSelector(".bk-step-head", { timeout: 10000 }).catch(() => {});
  await settle(page).catch(() => {});
};

const browser = await chromium.launch();
try {
  for (const w of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width: w, height: w === 390 ? 844 : 900 } });
    const errors = [];
    page.on("console", (m) => { if (["error", "warning"].includes(m.type())) errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));
    countQuotes(page);
    await page.goto(`${BASE}/book/demo-detail`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".bk-card.selectable", { timeout: 30000 });
    await settle(page);

    let at = await stepNow(page);
    while (!(await page.locator(".bk-cal").count())) {
      at = await advance(page, at.n);
      if (!at) throw new Error(`${w}: would not advance to the calendar`);
    }
    const when = at.n;
    const day = await pickDay(page, "weekday");
    await quoted(page, () => page.locator(".bk-cal .cell", { hasText: new RegExp(`^${day}$`) }).last().click());
    await page.locator(".bk-slots .bk-chip").first().waitFor({ state: "attached", timeout: 8000 }).catch(() => {});
    await quoted(page, () => page.locator(".bk-slots .bk-chip").first().click());
    const time = await chosenTime(page);
    at = await advance(page, when);
    const details = at?.n;
    await nameBox(page).fill("Back Check");
    await page.fill("input[type=tel]", "5625550199");
    await page.fill("input[type=email]", "backcheck@example.com");
    await settle(page);

    await nav(page, "goBack");
    at = await stepNow(page);
    expect(at?.n === when, `${w} browser Back from Details lands on step ${when} (got ${at?.n}, ${page.url()})`);
    // The calendar reloads its month on arrival; wait for the answer, not for a while.
    await page.locator(".bk-slots .bk-chip.selected").waitFor({ state: "attached", timeout: 10000 }).catch(() => {});
    expect(time && (await chosenTime(page)) === time, `${w} the chosen time "${time}" is still chosen after Back`);
    expect(await onHeading(page).catch(() => false), `${w} focus is on the step heading after browser Back (97.47)`);
    await page.screenshot({ path: join(ART, `back-to-when-${w}.png`) });

    await nav(page, "goForward");
    at = await stepNow(page);
    expect(at?.n === details, `${w} browser Forward returns to step ${details} (got ${at?.n})`);
    expect((await nameBox(page).inputValue({ timeout: 5000 }).catch(() => null)) === "Back Check", `${w} the typed name is kept after Forward`);

    await nav(page, "reload");
    at = await stepNow(page);
    expect(at?.n === details, `${w} refresh stays on step ${details} (got ${at?.n})`);
    expect((await nameBox(page).inputValue({ timeout: 5000 }).catch(() => null)) === "Back Check", `${w} the typed name survives a refresh`);
    await page.screenshot({ path: join(ART, `after-refresh-${w}.png`) });

    for (let n = details - 1; n >= 1; n--) {
      await nav(page, "goBack");
      at = await stepNow(page);
      expect(at?.n === n && new URL(page.url()).pathname === "/book/demo-detail",
        `${w} Back walks to step ${n} and stays on the booking page (got ${at?.n}, ${page.url()})`);
    }

    // Forward all the way back, then finish — create-booking answered here, never by the server.
    for (let n = 2; n <= details; n++) await nav(page, "goForward");
    at = await stepNow(page).catch(() => null);
    expect(at?.n === details, `${w} Forward walks back up to step ${details} (got ${at?.n})`);
    if (at?.n !== details) { expect(false, `${w} booking-completion half not reached`); await page.close(); continue; }
    at = await advance(page, details);
    expect(at?.n === at?.of, `${w} reached the last step (${at?.n}/${at?.of})`);
    await page.route(/create-booking/, (r) => r.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ success: true, booking: { id: "00000000-0000-4000-8000-000000009745", booking_date: "2026-11-02", start_time: "09:00", end_time: "10:00", total_price: 100, receipt_url: null, status: "confirmed" } }),
    }));
    await page.locator(".bk-bar .bk-btn.primary").click();
    await page.waitForFunction(() => !document.querySelector(".bk-step-head"), null, { timeout: 15000 });
    await settle(page);
    const left = await page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith("bk.draft:")));
    expect(left.length === 0, `${w} a completed booking clears the draft (left: ${left.join(",") || "none"})`);
    await page.screenshot({ path: join(ART, `booked-${w}.png`) });
    await page.unroute(/create-booking/);
    await nav(page, "reload");
    at = await stepNow(page);
    expect(at?.n === 1, `${w} a refresh after booking starts a fresh booking (step ${at?.n})`);

    const fresh = await browser.newPage({ viewport: { width: w, height: 844 } });
    fresh.on("console", (m) => { if (["error", "warning"].includes(m.type())) errors.push(m.text()); });
    await fresh.goto(`${BASE}/book/demo-detail?step=6`, { waitUntil: "domcontentloaded" });
    await fresh.waitForSelector(".bk-card.selectable", { timeout: 30000 });
    await settle(fresh);
    at = await stepNow(fresh);
    expect(at?.n === 1 && !fresh.url().includes("step="), `${w} a fresh tab on ?step=6 starts at step 1 (step ${at?.n}, ${fresh.url()})`);
    await fresh.close();

    expect(errors.length === 0, `${w} console clean${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""}`);
    await page.close();
  }
} finally { await browser.close(); }
if (checks < 20) fails.push(`only ${checks} checks ran`);
console.log(fails.length ? `\nFAIL ${fails.length} of ${checks}` : `\nPASS ${checks} checks`);
process.exit(fails.length ? 1 : 0);
