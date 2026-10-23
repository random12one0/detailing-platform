// ROADMAP 97.47 — AFTER EVERY BOOKING STEP CHANGE, FOCUS IS ON THAT STEP'S HEADING.
//
//   BASE=http://localhost:5199 node scripts/booking-step-focus.mjs
//
// Needs a dev server with the demo business (public page, no login). Walks step 1 to the last step with the
// shared walker, then one Back, at 390 and 1440, and after each change asks whether document.activeElement is
// `.bk-step-head h2`. Screenshots land in .manager-shots/97.47/. Exits 1 on any miss or a short walk.

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "./receipt.mjs";
import { advance, countQuotes, pickDay, quoted, settle, stepNow, toCalendar } from "./lib/bookingWalk.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const BASE = process.env.BASE || "http://localhost:5173";
const ART = join(REPO, ".manager-shots", "97.47");
mkdirSync(ART, { recursive: true });

const onHeading = (page) => page.evaluate(() => {
  const a = document.activeElement;
  return { ok: !!a && a === document.querySelector(".bk-step-head h2"), what: a ? `${a.tagName}.${a.className}` : "none" };
});

const fails = [];
let checks = 0;
const browser = await chromium.launch();
try {
  for (const w of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width: w, height: w === 390 ? 844 : 900 } });
    const errors = [];
    page.on("console", (m) => { if (["error", "warning"].includes(m.type())) errors.push(m.text()); });
    countQuotes(page);
    await page.goto(`${BASE}/book/demo-detail`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".bk-card.selectable", { timeout: 30000 });
    await settle(page);
    const record = async (at, how) => {
      checks++;
      const f = await onHeading(page);
      console.log(`${f.ok ? "OK  " : "FAIL"} ${w} step ${at.n}/${at.of} (${how}): active ${f.what}`);
      if (!f.ok) fails.push(`${w} step ${at.n} (${how}): focus on ${f.what}`);
    };
    // toCalendar advances internally; check each step it passes through by advancing by hand instead.
    let at = await stepNow(page);
    while (!(await page.locator(".bk-cal").count())) {
      const next = await advance(page, at.n);
      if (!next) throw new Error(`${w}: step ${at.n} would not advance`);
      at = next; await record(at, "continue");
    }
    const day = await pickDay(page, "weekday");
    await quoted(page, () => page.locator(".bk-cal .cell", { hasText: new RegExp(`^${day}$`) }).last().click());
    await page.locator(".bk-slots .bk-chip").first().waitFor({ state: "attached", timeout: 8000 }).catch(() => {});
    await quoted(page, () => page.locator(".bk-slots .bk-chip").first().click());
    while (at.n < at.of) {
      if (await page.locator("input[type=email]").count()) {
        await page.locator("input:visible").first().fill("Focus Check");
        await page.fill("input[type=tel]", "5625550199");
        await page.fill("input[type=email]", "focuscheck@example.com");
      }
      const next = await advance(page, at.n);
      if (!next) throw new Error(`${w}: step ${at.n} would not advance`);
      at = next; await record(at, "continue");
    }
    await page.screenshot({ path: join(ART, `last-step-${w}.png`) });
    await page.locator("button.bk-btn.back").click();
    await settle(page);
    at = await stepNow(page); await record(at, "back");
    await page.screenshot({ path: join(ART, `after-back-${w}.png`) });
    if (errors.length) fails.push(`${w}: console ${errors.slice(0, 3).join(" | ")}`);
    console.log(`${w}: console ${errors.length ? errors.length + " error/warning" : "clean"}`);
    await page.close();
  }
} finally { await browser.close(); }
if (checks < 8) fails.push(`only ${checks} step changes checked`);
console.log(fails.length ? `\nFAIL ${fails.length}:\n  ${fails.join("\n  ")}` : `\nPASS ${checks} step changes, focus on the heading each time`);
process.exit(fails.length ? 1 : 0);
