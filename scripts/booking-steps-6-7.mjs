// STEPS 6 AND 7 OF THE BOOKING FLOW, AT THE FOUR WIDTHS, AFTER THE COLUMN DOUBLED — ROADMAP 14.24 part 1.
//
//   node scripts/booking-steps-6-7.mjs
//   node scripts/booking-steps-6-7.mjs --break=overflow   # sabotage: a 2000px strip put into the column
//   node scripts/booking-steps-6-7.mjs --break=stretch    # sabotage: the column's max-width removed
//
// Needs the dev server (:5173) and the seeded demo business. No login, no credentials: the booking page is public.
//
// WHY IT EXISTS. ROADMAP 9.11's `.bk-wrap` fix took the column from 317px to 632px for all five booking-side pages,
// and the matrix written afterwards covered steps one to five only. Its own words: "it does not cover steps six and
// seven at any width... And at 768px the calendar block itself was not captured."
//
// THE STEPS ARE ADDRESSED BY THE STEP'S OWN LABEL ("Step 6 of 7"), never by position, so a re-cut flow cannot fool it.
// Step 6 is Details, which is where `planDoorStep` puts the plan pitch; step 7 is Review.
//
// WHAT IT ASSERTS, PER (step, width) READING — 4, DECLARED RATHER THAN COUNTED (docs/gotchas.md 98)
//   reached      the label reads exactly "Step N of 7"
//   no-overflow  nothing in the header, column or bar reaches past the viewport's right edge, and the document is no
//                wider than the viewport
//   column       `.bk-wrap` is min(632, viewport) wide — the number the 9.11 fix was supposed to produce
//   console      no error or warning, and no http 4xx/5xx (watchConsole drops only the two known React Router flags)
// plus, on step 6 only, per width:
//   plan-pitch   the pitch is on the page and inside the column (the demo has plans; if it did not, this would fail,
//                not skip: an absent pitch would mean step 6 was measured without the thing it is named for)
// plus at 768 only, on step 5:
//   calendar     the calendar block is captured, 28+ day cells, none reaching past the viewport
// plus two canaries. 8 x 4 + 4 + 1 + 2 = 39, asserted as an EQUALITY.
//
// WHAT IT CANNOT SAY, in the receipt as `unjudgeable`: "stranded" and "stretched" as a LOOK. The numbers above catch a
// thing that overflows or a column that is the wrong width. A line that is technically inside the column but looks
// abandoned is a judgement made by reading the screenshots, and the entry records what was read, not this script.

import { createRequire } from "node:module";
import { mkdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { advance, countQuotes, pickDay, quoted, settle, stepNow, toCalendar, watchConsole } from "./lib/bookingWalk.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const BASE = process.env.BASE || "http://localhost:5173";
const SLUG = "demo-detail";
const ART = join(REPO, ".manager-shots", "14.24");
const BREAK = (process.argv.slice(2).find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;

const SIZES = [{ w: 320, h: 700 }, { w: 392, h: 844 }, { w: 768, h: 1024 }, { w: 1440, h: 900 }];
const STEPS = [6, 7];
const COLUMN = 632;                       // the 9.11 fix's number, declared here rather than read off the page
const OF = 7;
const EXPECTED_ASSERTIONS = SIZES.length * STEPS.length * 4 + SIZES.length + 1 + 2;

// PURE RULES, so the canaries run through the same code the readings do (gotchas 95).
const overflowOk = (r) => r.docW <= r.vw + 0.5 && r.worst <= r.vw + 0.5;
const columnOk = (r) => Math.abs(r.wrapW - Math.min(COLUMN, r.vw)) <= 1;

const READ = (COL) => {
  const vw = window.innerWidth;
  const wrap = document.querySelector(".bk-wrap");
  const edge = (sel) => [...document.querySelectorAll(sel)].reduce((m, e) => {
    const b = e.getBoundingClientRect();
    return b.width > 0 ? Math.max(m, b.right) : m;
  }, 0);
  const worst = Math.max(edge(".bk-header *"), edge(".bk-wrap *"), edge(".bk-bar *"));
  const pitch = document.querySelector(".bk-planpitch");
  const pb = pitch && pitch.getBoundingClientRect();
  const wb = wrap && wrap.getBoundingClientRect();
  return {
    vw, docW: document.documentElement.scrollWidth, worst: Math.round(worst * 10) / 10,
    wrapW: wb ? Math.round(wb.width * 10) / 10 : 0,
    pitch: pb ? { w: Math.round(pb.width), h: Math.round(pb.height), inside: pb.left >= wb.left - 0.5 && pb.right <= wb.right + 0.5 } : null,
    blocks: [...(wrap ? wrap.children : [])]
      .flatMap((el) => (getComputedStyle(el).display === "contents" ? [...el.children] : [el]))
      .map((el) => [el.className || el.tagName.toLowerCase(), Math.round(el.getBoundingClientRect().width), Math.round(el.getBoundingClientRect().height)])
      .filter((b) => b[2] > 0),
  };
};

let assertions = 0;
const failures = [], noise = [], canaries = [], sabotage = [], observed = [], artifacts = [];
const ok = (cond, name, detail) => {
  assertions++;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name} — ${detail}`);
  if (!cond) failures.push(`${name}: ${detail}`);
};

async function sabotageNow(page, w, step, r) {
  if (BREAK === "overflow") {
    await page.evaluate(() => {
      const d = document.createElement("div");
      d.style.cssText = "width:2000px;height:4px;background:red";
      document.querySelector(".bk-wrap").appendChild(d);
    });
  } else if (BREAK === "stretch") {
    if (r.vw <= COLUMN) return r;   // the column already fills a phone: there is nothing to stretch at 320 or 392
    await page.addStyleTag({ content: ".bk-wrap{max-width:none!important}" });
  } else return r;
  const after = await page.evaluate(READ, COLUMN);
  const landed = BREAK === "overflow" ? !overflowOk(after) : !columnOk(after);
  sabotage.push({ width: w, step, break: BREAK, landed, docW: after.docW, wrapW: after.wrapW });
  if (!landed) { console.error(`SABOTAGE DID NOT LAND at ${w} step ${step}`); process.exit(2); }
  return after;
}

async function run() {
  rmSync(ART, { recursive: true, force: true });
  mkdirSync(ART, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const { w, h } of SIZES) {
      console.log(`\n== ${w}x${h}`);
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      countQuotes(page);
      const widthFrom = noise.length;
      watchConsole(page, String(w), noise);
      await page.goto(`${BASE}/book/${SLUG}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".bk-card.selectable", { timeout: 30000 });
      await settle(page);

      await toCalendar(page);
      if (w === 768) {
        const block = page.locator(".bk-cal-block");
        await block.waitFor({ state: "attached" });
        await settle(page);
        const file = join(ART, "step5-calendar-768.png");
        await block.screenshot({ path: file, animations: "disabled" });
        artifacts.push(".manager-shots/14.24/step5-calendar-768.png");
        const cal = await page.evaluate(() => {
          const b = document.querySelector(".bk-cal-block").getBoundingClientRect();
          const cells = [...document.querySelectorAll(".bk-cal .cell")].map((c) => c.getBoundingClientRect());
          return { w: Math.round(b.width), h: Math.round(b.height), cells: cells.length,
            cellW: Math.round(Math.min(...cells.map((c) => c.width))), cellH: Math.round(Math.min(...cells.map((c) => c.height))),
            right: Math.max(...cells.map((c) => c.right)), vw: innerWidth };
        });
        const bytes = statSync(file).size;
        ok(cal.h > 0 && cal.cells >= 28 && cal.right <= cal.vw + 0.5 && bytes > 3000, `${w}/step5/calendar`,
          `block ${cal.w}x${cal.h}px, ${cal.cells} day cells (smallest ${cal.cellW}x${cal.cellH}), rightmost cell edge ${cal.right}px of ${cal.vw}, capture ${bytes} bytes`);
      }
      const day = await pickDay(page, "weekday");
      await quoted(page, () => page.locator(".bk-cal .cell", { hasText: new RegExp(`^${day}$`) }).last().click());
      await page.locator(".bk-slots .bk-chip").first().waitFor({ state: "attached", timeout: 8000 }).catch(() => {});
      await settle(page, 2200);
      await quoted(page, () => page.locator(".bk-slots .bk-chip").first().click());

      let at = await stepNow(page);
      for (let guard = 0; guard < 6 && at && at.n < 7; guard++) {
        const next = await advance(page, at.n);
        if (!next) break;
        at = next;
        if (STEPS.includes(at.n)) {
          await settle(page, 2200);
          const step = at.n;
          let r = await page.evaluate(READ, COLUMN);
          r = await sabotageNow(page, w, step, r);
          const file = `step${step}-${w}.png`;
          await page.screenshot({ path: join(ART, file), fullPage: true, animations: "disabled" });
          artifacts.push(`.manager-shots/14.24/${file}`);
          ok(at.n === step && at.of === OF, `${w}/step${step}/reached`, `label reads Step ${at.n} of ${at.of}`);
          ok(overflowOk(r), `${w}/step${step}/no-overflow`, `document ${r.docW}px, furthest right edge ${r.worst}px, viewport ${r.vw}px`);
          ok(columnOk(r), `${w}/step${step}/column`, `.bk-wrap ${r.wrapW}px, expected ${Math.min(COLUMN, r.vw)}px`);
          if (step === 6) ok(r.pitch && r.pitch.inside && r.pitch.h > 0, `${w}/step6/plan-pitch`,
            r.pitch ? `pitch ${r.pitch.w}x${r.pitch.h}px, inside the column ${r.pitch.inside}` : "NO .bk-planpitch on step 6");
          observed.push({ width: w, step, wrapW: r.wrapW, docW: r.docW, worst: r.worst, blocks: r.blocks });
          console.log(`        blocks (class, w, h): ${r.blocks.map((b) => b.join(" ")).join(" | ")}`);
          const mine = noise.slice(widthFrom);
          ok(mine.length === 0, `${w}/step${step}/console`,
            mine.length ? mine.slice(0, 3).join(" | ") : "0 errors, 0 warnings, 0 http 4xx/5xx since the page opened");
        }
        if (at.n >= 7) break;
        if (at.n === 6) { // fill Details, as discount-label.mjs does, so Review is reachable
          await page.locator("input:visible").first().fill("Width Check");
          await page.fill("input[type=tel]", "5625550199");
          await page.fill("input[type=email]", "widthcheck@example.com");
          await settle(page, 600);
        }
      }
      await ctx.close();
    }
    const c1 = overflowOk({ docW: 392, worst: 432, vw: 392 });
    canaries.push({ name: "the-wide-strip", flagged: !c1 });
    ok(!c1, "canary/the-wide-strip", "a column reaching 432px on a 392px screen must NOT read as 'no overflow'");
    const c2 = columnOk({ wrapW: 1440, vw: 1440 });
    canaries.push({ name: "the-stretched-column", flagged: !c2 });
    ok(!c2, "canary/the-stretched-column", "a 1440px column on a 1440px screen must NOT read as 'the 632px column'");
    if (assertions !== EXPECTED_ASSERTIONS) failures.push(`assertion count ${assertions} != declared ${EXPECTED_ASSERTIONS}`);
  } finally { await browser.close(); }

  const status = failures.length ? "fail" : "pass";
  const unjudgeable = [
    "look/stranded-or-stretched — a line inside the column that looks abandoned, or a block that reads as stretched, is a judgement; "
    + "the numbers here catch overflow and a wrong column width only. The screenshots in .manager-shots/14.24/ were read by a person (a session), "
    + "and what was seen is written in ROADMAP 14.24.",
  ];
  const n = SIZES.length * STEPS.length + 1;
  const { path } = writeReceipt({
    check_id: "booking-steps-6-7",
    started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    status,
    expected_targets: n, discovered_targets: n, attempted_targets: n, completed_targets: n, skipped_targets: 0,
    assertions_executed: assertions, min_assertions: EXPECTED_ASSERTIONS,
    assertion_floor: "8 readings x 4 + 4 plan-pitch + 1 calendar + 2 canaries = 39, asserted as an EQUALITY (docs/gotchas.md 98).",
    failures, warnings: [], artifacts,
    dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), steps: STEPS, business: "demo-detail", item: "14.24-1", break: BREAK },
    canary: { id: canaries[0].name, observed_failure: canaries.every((c) => c.flagged) },
    canaries, unjudgeable, sabotage, observed,
  });
  console.log(`\nreceipt: ${path}`);
  console.log(`${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, ${unjudgeable.length} unjudgeable`);
  process.exit(failures.length ? 1 : 0);
}
run().catch((e) => { console.error(e); console.error("NOTHING WAS MEASURED. This is not a pass."); process.exit(2); });
