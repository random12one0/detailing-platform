// THE SURCHARGE THE DATE STEP ADDS, AND WHETHER A CUSTOMER CAN SEE IT.
//
//   node scripts/surcharge-visible.mjs                 # the whole sweep
//   node scripts/surcharge-visible.mjs --headed        # watch it
//   node scripts/surcharge-visible.mjs --break=canary  # sabotage: the canary is real
//   node scripts/surcharge-visible.mjs --break=paint   # sabotage: the pixel test is real
//   node scripts/receipt.mjs receipts/surcharge-visible.json
//
// Needs the dev server on :5173 (npm run dev --prefix app) and the seeded demo
// business (node scripts/seed-demo.mjs). No credentials: it walks the PUBLIC
// booking page as a stranger, which is the only way the thing it measures can
// be wrong.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS
// ---------------------------------------------------------------------------
// ROADMAP 2.1, found independently by BOTH September audits: the total rises
// after the customer has picked the time. A1 saw $205 → $235, A2 saw
// $300 → $330. The rise itself is honest — a weekend costs the detailer more
// and `business_settings.price_rules` says so — but until 2026-09-13 the
// words "Weekend rate" first appeared two steps later, on the receipt, and
// until 2026-09-21 the sentence that named it was rendered BELOW nineteen
// time chips, where it measured 836–898px inside an 844px viewport whose
// fixed bar starts at 771. Correct in the DOM. Never once on a phone screen.
//
// **SO THE TWO FAILURES THIS FILE HAS TO TELL APART ARE "the number moved for
// a reason the customer was told" AND "the number moved".** A DOM query
// answers neither: `.bk-when-note` existed through the whole of the second
// failure. Every assertion below is therefore about the painted, hit-testable
// position of the sentence relative to the fixed bar, not about its presence.
//
// ---------------------------------------------------------------------------
// WHAT IT ASSERTS — five questions per target, all of the live page
// ---------------------------------------------------------------------------
//   gate      with a day chosen and NO time, pressing Continue does not
//             advance. This is what makes the other four load-bearing: 2.1's
//             done-when is that the customer cannot LEAVE this step without
//             having seen the surcharge, and that is only true if the step
//             refuses to be left. Continue is deliberately never disabled
//             here (roadmap 2.6 — a disabled button cannot be asked why), so
//             the question is "did the step number change", not "is the
//             button grey".
//   named     at least one surcharge line is rendered, each carrying a label
//             and a signed amount. Zero lines is a FAILURE, never a skip:
//             a weekend day that produces no surcharge means the demo's own
//             price rule has gone, and a run that quietly measured nothing
//             would print exactly like a clean one.
//   adds-up   the bar's rise equals the sum of the lines just named. This is
//             the money question. A page that names "+$30" while the bar
//             climbs $50 has told the customer a number that is not the one
//             they will be charged, which is the whole of Wave 2.
//   visible   every line's box is fully inside the window ABOVE the fixed
//             bar, AND `elementFromPoint` at its centre lands on that line or
//             a child of it. Hit-testing rather than a rect, because
//             gotchas.md's oldest complaint is that a bounding rect cannot
//             tell you what is painted there — a line perfectly positioned
//             underneath the fixed bar has a perfect rect.
//   painted   the PIXELS inside that box are not uniform. **This assertion
//             exists because a check shipped five BLANK screenshots and
//             graded them by file size, and the correct picture turned out to
//             be SMALLER than the blank one** — so size is not merely weak
//             evidence, it points the wrong way. The screenshot the run just
//             took is decoded and the standard deviation of luminance inside
//             the line's own rect is measured. Blank ground is ~0. Text is
//             not.
//
// ---------------------------------------------------------------------------
// THE WORST CASE IS A TARGET, NOT AN AFTERTHOUGHT
// ---------------------------------------------------------------------------
// Each width is walked TWICE: tapping the FIRST slot of the day and tapping
// the LAST one. They are different measurements, not repetition. The note sits
// above the chips, so reaching the last chip on a phone means scrolling — and
// the claim being tested is that any scroll position showing a chip shows the
// note. Playwright scrolls the chip into view exactly as a thumb would, and
// `visible` is then asked at wherever the page ended up.
//
// ---------------------------------------------------------------------------
// THE CANARY IS THE DEFECT ITSELF, AND IT RUNS FIVE TIMES
// ---------------------------------------------------------------------------
// `.bk-when-note { order: 99 }` puts the sentence back below the chips, which
// is byte-for-byte the layout that shipped between 2026-09-13 and 2026-09-21.
// `.bk-wrap` is a flex column, so that is the whole of the old bug. It runs at
// 320, where the defect was originally measured, and it MUST fail.
// `receipt.mjs` rejects a receipt whose canary passed.
//
// **FIVE RUNS, AND THE CATCH COUNT IS REPORTED RATHER THAN ASSUMED.** A canary
// that fails four times in five is not a canary, it is a coin — and this repo
// has a Wave 14 item open about a sweep that gave five different answers in
// five runs. The receipt carries `caught: n/5` and anything under 5 is a fail.
//
// `--break=canary` removes the injected stylesheet: the canary target is then
// genuinely correct, catches nothing, and the receipt must be rejected.
// `--break=paint` paints over every surcharge line with the page's own ground
// colour before the screenshot, leaving the DOM untouched. `visible` still
// passes, `painted` must fail on all ten real targets. That is the proof that
// the pixel assertion is looking at pixels and not at a rect.

import "../tests/_env.mjs";

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const HEADED = process.argv.includes("--headed");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const BASE = process.env.BASE || "http://localhost:5173";

// THE DEMO BUSINESS BY SLUG, NEVER BY A UUID WRITTEN DOWN HERE — FOUND.md's
// open entry is two scripts holding an id a reseed threw away.
const SLUG = "demo-detail";

// His five verification widths. 320 is the narrowest supported width and is
// where the defect was measured; 392x844 is the phone shape the whole of
// `docs/design-system.md` is written against.
const SIZES = [
  { w: 1920, h: 1080 }, { w: 1440, h: 900 }, { w: 768, h: 1024 },
  { w: 392, h: 844 }, { w: 320, h: 844 },
];
// Which time chip to tap. "last" is the worst case and the reason this file
// walks each width twice.
const PICKS = ["first", "last"];
const CANARY_RUNS = 5;

const ART = fileURLToPath(new URL("../artifacts/surcharge-visible/", import.meta.url));

const ASSERTIONS = ["gate", "named", "adds-up", "visible", "painted"];

let assertions = 0;
const failures = [];
const artifacts = [];
const consoleNoise = [];
const observed = [];      // the dollars, per target, for the roadmap line

const check = (target, name, cond, detail = "") => {
  assertions++;
  if (cond) { console.log(`    ok      ${name}`); return true; }
  const line = `${target}: ${name} ${detail}`.trim();
  failures.push(line);
  console.error(`    FAIL    ${name}  ${detail}`);
  return false;
};

// --- SETTLE, NOT SLEEP -----------------------------------------------------
// Lifted from `sweep-booking-steps.mjs`, same reasoning: the fixed number is a
// CAP and the wait ends when the DOM has been quiet for 130ms with no FINITE
// animation running. `.bk-step > *` carries `bk-rise` for 950ms
// (`booking.css` --bk-t-reveal), so a screenshot taken on a timer catches the
// reveal mid-flight and measures a box that is still moving — which is
// gotchas.md's "a geometry sweep catching an exit animation mid-flight",
// pointed the other way.
const settle = (page, cap = 2200) => page.evaluate(async (cap) => {
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
      if (document.querySelector(".bk-spinner, .spinner")) { last = now; continue; }
      const busy = document.getAnimations().some((a) => {
        if (a.playState !== "running") return false;
        const t = a.effect && a.effect.getComputedTiming && a.effect.getComputedTiming();
        return !t || t.iterations !== Infinity;
      });
      if (!busy && now - last >= QUIET) return Math.round(now - t0);
    }
  } finally { obs.disconnect(); }
}, cap);

/** "STEP 3 OF 7" → 3. The step's own label, so a re-cut flow cannot fool it. */
const stepNow = (page) => page.evaluate(() => {
  const el = document.querySelector(".bk-step-head .bk-step-label");
  const m = el && el.innerText.match(/(\d+)\s*\D+\s*(\d+)/);
  return m ? { n: Number(m[1]), of: Number(m[2]) } : null;
});

/** The figure in the fixed bar, in whole cents, or null if there isn't one. */
const barMoney = (page) => page.evaluate(() => {
  const bar = document.querySelector(".bk-bar");
  if (!bar) return null;
  const m = bar.innerText.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
  return m ? Math.round(parseFloat(m[1].replace(/,/g, "")) * 100) : null;
});

/**
 * Do something that moves the price, and do not come back until the SERVER has
 * answered.
 *
 * **THIS IS THE FIX FOR A REAL FLAKE THIS FILE PRODUCED ON ITS FIRST RUNS, AND
 * IT IS WORTH THE PARAGRAPH BECAUSE THE FLAKE LOOKED LIKE A PRODUCT FAULT.**
 * `settle()` ends when the DOM has been quiet for 130ms. A quote is a remote
 * call to `calculate-booking`, and between the click and the response the DOM
 * is perfectly quiet — so settle returned, the run read a quote that had not
 * arrived, and the run reported "no surcharge line was rendered at all" on one
 * target in ten while the other nine were fine. **A check that is racing the
 * network reports a product defect rather than a timing bug**, which is the
 * most expensive shape a bad check can have: somebody goes looking in
 * `pricing.ts` for a fault that is in the stopwatch.
 *
 * **AND THE FIRST REPAIR WAS STILL A RACE, WHICH IS WHY THIS ONE COUNTS
 * REQUESTS INSTEAD OF WAITING A WHILE.** `Promise.race([answer, wait(2500)])`
 * reads like a wait and behaves like a deadline: a quote slower than 2.5s
 * loses the race and the run carries on with the stale number. It failed once
 * in fifteen targets, at one width, which is exactly the frequency that gets
 * written off as "flaky" and re-run. So the page counts its own
 * `calculate-booking` requests, and this waits for the count to come back to
 * zero with one more finished than before the click. If nothing was sent
 * within 1.5s, nothing was going to be.
 */
async function quoted(page, act) {
  const q = page.__quotes;
  const before = q.done;
  await act();
  const t0 = Date.now();
  for (;;) {
    await page.waitForTimeout(120);
    if (Date.now() - t0 > 15000) break;             // a quote that never landed
    if (q.inflight > 0) continue;                   // still out there
    if (q.done > before) break;                     // answered
    if (Date.now() - t0 > 1500) break;              // this click sends no quote
  }
  await settle(page, 2200);
}

/**
 * Advance one step by whatever it actually asks for.
 *
 * NOTHING HERE IS COUPLED TO A LABEL OR TO A POSITION, and that is deliberate
 * twice over. `label-guard.mjs` exists because 45 controls in this repo are
 * addressed by the WORDS on them, so a rename blinds a check while every line
 * still reads normally; and CLAUDE.md's calendar lesson is to address a node,
 * never an index. So: press Continue, and if the step did not move, select the
 * next unselected card and press again. On the location step that walks mobile
 * (which wants an address) and lands on drop-off — WITHOUT naming either, and
 * without spending a Geoapify credit geocoding an address this run invented.
 */
async function advance(page, from) {
  const cards = page.locator(".bk-card.selectable");
  const n = await cards.count();
  for (let attempt = 0; attempt <= n; attempt++) {
    if (attempt > 0) await quoted(page, () => cards.nth(attempt - 1).click());
    // **`force` BECAUSE THE BUTTON IS `aria-disabled`, NOT `disabled`, AND
    // THE DIFFERENCE IS THE WHOLE OF ROADMAP 2.6.** A disabled button cannot
    // be pressed, so it cannot be asked why; this one is pressable and answers
    // instead. Playwright's actionability check reads `aria-disabled` as "not
    // enabled" and waits thirty seconds for a state that will never arrive —
    // so obeying it would model a customer who CANNOT press Continue, which is
    // the opposite of what this page does. `force` dispatches the real mouse
    // event a thumb dispatches.
    await page.locator(".bk-bar button.bk-btn.primary").click({ force: true });
    await settle(page, 2200);
    const at = await stepNow(page);
    if (at && at.n > from) return at;
  }
  return null;
}

/**
 * Everything the five questions need, read off the live page in one pass.
 *
 * ONE `evaluate` RATHER THAN SIX, because the page is a moving target: the
 * quote is remote, and six round trips is six chances for the DOM to be a
 * different DOM between two numbers that are then compared to each other.
 */
const READ = () => {
  const bar = document.querySelector(".bk-bar");
  const br = bar ? bar.getBoundingClientRect() : null;
  const note = document.querySelector(".bk-when-note");
  // THE SURCHARGE LINES ONLY. `.bk-when-note` also carries the request-mode
  // sentence on a request-mode tenant (which the demo is), and that paragraph
  // is not about money — grading it would make this check pass on a tenant
  // that shows no surcharge at all.
  const lines = [...(note ? note.querySelectorAll("p") : [])]
    .map((p) => {
      const m = p.innerText.match(/^(.*?)\s*·\s*([-+])\$\s*([\d,]+(?:\.\d{2})?)\s*$/);
      if (!m) return null;
      const r = p.getBoundingClientRect();
      const hit = document.elementFromPoint(
        Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
      return {
        label: m[1],
        cents: Math.round(parseFloat(m[3].replace(/,/g, "")) * 100) * (m[2] === "-" ? -1 : 1),
        text: p.innerText.trim(),
        rect: {
          x: Math.round(r.left), y: Math.round(r.top),
          w: Math.round(r.width), h: Math.round(r.height),
        },
        // Fully inside the window AND above the fixed bar's top edge. The bar
        // is `position: fixed`, so anything under it is painted over.
        inWindow: r.top >= 0 && r.bottom <= innerHeight
          && (!br || r.bottom <= br.top),
        onTop: !!hit && (hit === p || p.contains(hit)),
        hit: hit ? (hit.className || hit.tagName) : "nothing",
      };
    })
    .filter(Boolean);
  return {
    lines,
    barTop: br ? Math.round(br.top) : null,
    viewport: { w: innerWidth, h: innerHeight },
    scrollY: Math.round(window.scrollY),
    chips: document.querySelectorAll(".bk-slots .bk-chip").length,
  };
};

/**
 * How much of the line's own rect is the LINE, measured as the difference
 * between two renders of the same frame: the page as it is, and the page with
 * the note's text made transparent. Everything that is not the sentence is
 * identical in both, so whatever is left is the sentence.
 *
 * **THIS IS THE ANSWER TO A CHECK THAT GRADED FIVE BLANK SCREENSHOTS BY FILE
 * SIZE AND PASSED** — and the correct picture turned out to be SMALLER than
 * the blank one, so size is not weak evidence, it points the wrong way.
 *
 * **THE FIRST VERSION OF THIS ASSERTION WAS THE STANDARD DEVIATION OF
 * LUMINANCE INSIDE THE RECT, AND IT LET A BLANKED LINE THROUGH AT 392.**
 * `--break=paint` caught nine targets out of ten and scored 3.49 against a
 * floor of 4 on a tenth: the rect is not flat ground, it sits on this page's
 * gradient, so the spread it measures is mostly the BACKGROUND and the
 * sentence is a few percent on top. A floor between "gradient" and "gradient
 * plus text" is a floor between two numbers that are nearly the same.
 * A difference between two renders has no background in it at all — the same
 * correction `pinned-bar.mjs` made twice before its `edge` assertion worked.
 *
 * CSS pixels are image pixels because every context is created at
 * deviceScaleFactor 1.
 */
const DELTA = async ({ a, b, r }) => {
  const load = async (data) => {
    const img = new Image();
    img.src = "data:image/png;base64," + data;
    await img.decode();
    const cv = document.createElement("canvas");
    cv.width = img.width; cv.height = img.height;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    return { ctx, w: img.width, h: img.height };
  };
  const A = await load(a);
  const B = await load(b);
  const x = Math.max(0, Math.min(r.x, A.w - 1));
  const y = Math.max(0, Math.min(r.y, A.h - 1));
  const w = Math.max(1, Math.min(r.w, A.w - x));
  const h = Math.max(1, Math.min(r.h, A.h - y));
  const da = A.ctx.getImageData(x, y, w, h).data;
  const db = B.ctx.getImageData(x, y, w, h).data;
  const n = da.length / 4;
  let sum = 0;
  for (let i = 0; i < da.length; i += 4) {
    const la = (da[i] + da[i + 1] + da[i + 2]) / 3;
    const lb = (db[i] + db[i + 1] + db[i + 2]) / 3;
    sum += Math.abs(la - lb);
  }
  return { delta: sum / n, px: n };
};

// MEASURED BOTH WAYS, AND THE NUMBERS ARE WRITTEN DOWN RATHER THAN ESTIMATED,
// BECAUSE THE PREVIOUS VERSION OF THIS CONSTANT WAS AN ESTIMATE AND IT LET A
// BLANKED LINE THROUGH. A real sentence moves its own rect by **4.4 levels at
// the three desk widths, 7.4 at 392 and 8.9-9.1 at 320** — the narrower the
// screen the more of the rect the text fills. A blanked one moves it by
// **0.00, at all ten targets**, which is what `--break=paint` prints. So the
// floor has a 2.2x margin at its worst target and an infinite one below.
// Every run puts its own figure in the receipt (`ink`), so a drift toward the
// floor is visible before it is a false pass rather than after.
const DELTA_FLOOR = 2;

/** Paint over the lines without touching the DOM — the `--break=paint` sabotage. */
const BLANK_CSS = ".bk-when-note p { color: transparent !important; }";
/** The layout that shipped 2026-09-13 to 2026-09-21: the note below the chips. */
const CANARY_CSS = ".bk-when-note { order: 99 !important; }";

const FROZEN = { animations: "disabled" };

rmSync(ART, { recursive: true, force: true });
mkdirSync(ART, { recursive: true });

/**
 * One target: walk the public booking page to the date step, pick a weekend
 * day, read the bar, pick a time, read it again, photograph it and grade.
 */
async function target(browser, { w, h }, pick, { canary = false, label, file }) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  // THE PAGE COUNTS ITS OWN QUOTES. `quoted()` above says why a timer could
  // not do this job.
  page.__quotes = { inflight: 0, done: 0 };
  const isQuote = (r) => /calculate-booking/.test(r.url());
  page.on("request", (r) => { if (isQuote(r)) page.__quotes.inflight++; });
  page.on("requestfinished", (r) => {
    if (isQuote(r)) { page.__quotes.inflight--; page.__quotes.done++; }
  });
  page.on("requestfailed", (r) => { if (isQuote(r)) page.__quotes.inflight--; });
  // HIS RULE — READ THE CONSOLE AT EVERY SIZE, AND WARNINGS ARE NOT FILTERED.
  // The two React Router v7 future-flag warnings are known and logged in
  // FOUND.md; they are dropped by NAME so that anything else still lands.
  page.on("console", (msg) => {
    if (msg.type() !== "error" && msg.type() !== "warning") return;
    const text = msg.text();
    if (/React Router Future Flag Warning/.test(text)) return;
    consoleNoise.push(`${label} · ${msg.type()} · ${text.slice(0, 180)}`);
  });
  page.on("pageerror", (e) => consoleNoise.push(`${label} · pageerror · ${String(e.message).slice(0, 180)}`));

  const out = { lines: [], before: null, after: null, gate: null, spreads: [], read: null };
  try {
    await page.goto(`${BASE}/book/${SLUG}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".bk-card.selectable", { timeout: 30000 });
    await settle(page);

    if (canary && BREAK !== "canary") await page.addStyleTag({ content: CANARY_CSS });
    if (BREAK === "paint") await page.addStyleTag({ content: BLANK_CSS });

    // ── to the date step, however many steps that is ──────────────────────
    let at = await stepNow(page);
    if (!at) throw new Error("no step label on the booking page");
    for (let guard = 0; guard < 8 && !(await page.locator(".bk-cal").count()); guard++) {
      const next = await advance(page, at.n);
      if (!next) throw new Error(`step ${at.n} would not advance`);
      at = next;
    }
    if (!(await page.locator(".bk-cal").count())) throw new Error("never reached the calendar");

    // ── A WEEKEND DAY, FOUND FROM THE GRID'S OWN GEOMETRY ─────────────────
    // `monthGrid` lays the month out starting on Sunday and pads the lead-in
    // with empty cells, so a cell's COLUMN is its weekday: 0 Sunday, 6
    // Saturday. That is locale-free — it does not read the month name, the
    // weekday letters or the heading, all three of which change language.
    // The demo's rule is `weekdays: [0, 6]`, so those two columns are the
    // ones that carry it.
    let day = null;
    for (let month = 0; month < 3 && !day; month++) {
      if (month) {
        await page.locator(".bk-cal-block .bk-row.between button").last().click();
        await settle(page, 2200);
      }
      await page.locator(".bk-cal .cell:not(.closed):not(.empty)").first()
        .waitFor({ state: "attached", timeout: 8000 }).catch(() => {});
      day = await page.evaluate(() => {
        const grids = document.querySelectorAll(".bk-cal");
        const cells = [...grids[grids.length - 1].querySelectorAll(".cell")];
        for (let i = 0; i < cells.length; i++) {
          const col = i % 7;
          if (col !== 0 && col !== 6) continue;
          const c = cells[i];
          if (/closed|empty/.test(c.className) || !c.innerText.trim()) continue;
          return c.innerText.trim();
        }
        return null;
      });
    }
    if (!day) {
      throw new Error(
        "no open Saturday or Sunday in three months of the demo's calendar, so "
        + "the surcharge this file measures cannot be produced. Re-seed "
        + "(node scripts/seed-demo.mjs) and check available-slots by hand.");
    }

    const cell = page.locator(".bk-cal .cell", { hasText: new RegExp(`^${day}$`) }).last();
    await cell.click();
    await page.locator(".bk-slots .bk-chip").first()
      .waitFor({ state: "attached", timeout: 8000 }).catch(() => {});
    await settle(page, 2200);

    // ── THE GATE: a day and no time must not be allowed to leave ──────────
    const wasAt = await stepNow(page);
    await page.locator(".bk-bar button.bk-btn.primary").click({ force: true });
    await settle(page, 1400);
    const stillAt = await stepNow(page);
    out.gate = { from: wasAt && wasAt.n, to: stillAt && stillAt.n };

    // **BACK TO THE TOP, AND THIS LINE IS THE REASON THE FIRST CANARY CAUGHT
    // NOTHING — 0 out of 5 over a defect that was plainly in the screenshot.**
    // Roadmap 2.6: a refused press turns the reason on AND SCROLLS TO IT. So
    // the gate probe two lines up leaves the page near the BOTTOM of a step
    // that is 1,400px tall at 320 — and everything measured after it is
    // measured from a scroll position this script itself created. With the
    // note put back below the chips the canary was then landing at y=710
    // against a bar at 771: visible, and visible only because of the probe.
    //
    // THE ORDINARY CUSTOMER DOES NOT PRESS CONTINUE EARLY. They pick a day and
    // then a time, from the top. Resetting here restores that path, and it is
    // also the harsher one — it is the position the original 836-898px
    // measurement was taken in. The scrolled case is not lost: Playwright
    // scrolls the LAST chip into view by itself, which is the other target at
    // every width.
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle(page, 800);

    // ── THE PRICE BEFORE A TIME IS CHOSEN ─────────────────────────────────
    out.before = await barMoney(page);

    // ── THE TIME ──────────────────────────────────────────────────────────
    const chips = page.locator(".bk-slots .bk-chip");
    const count = await chips.count();
    if (!count) throw new Error(`the ${day}th had no time chips`);
    // Playwright scrolls it into view the way a thumb would, which is the
    // whole point of the "last" target. `quoted` because the surcharge is the
    // SERVER's answer and settle cannot see a network call.
    await quoted(page, () => chips.nth(pick === "last" ? count - 1 : 0).click());

    out.after = await barMoney(page);
    out.read = await page.evaluate(READ);
    out.lines = out.read.lines;

    // THE KEPT FRAME IS THE ONE A PERSON SEES. The second render exists only
    // to be subtracted from it and is never written to disk.
    const shot = await page.screenshot({ ...FROZEN, path: ART + file });
    artifacts.push("artifacts/surcharge-visible/" + file);
    const tag = await page.addStyleTag({ content: BLANK_CSS });
    await page.waitForTimeout(150);
    const flat = await page.screenshot(FROZEN);
    await tag.evaluate((el) => el.remove());
    for (const l of out.lines) {
      out.spreads.push(await page.evaluate(DELTA, {
        a: shot.toString("base64"), b: flat.toString("base64"), r: l.rect,
      }));
    }
  } finally {
    await ctx.close();
  }
  return out;
}

/** Grade one target. Five assertions, every one of them or none. */
function grade(id, o, sink) {
  sink(id, "gate", o.gate && o.gate.to === o.gate.from,
    `pressing Continue with a day and no time went from step ${o.gate && o.gate.from} `
    + `to step ${o.gate && o.gate.to} — the customer can leave without seeing the surcharge`);

  const named = o.lines.length > 0;
  sink(id, "named", named,
    "no surcharge line was rendered at all, so either the demo's weekend rule is gone "
    + "or the page stopped naming it — this is a failure and never a skip");

  const sum = o.lines.reduce((a, l) => a + l.cents, 0);
  const rise = (o.after ?? 0) - (o.before ?? 0);
  sink(id, "adds-up", named && o.before !== null && o.after !== null && rise === sum,
    `the bar went ${(o.before / 100).toFixed(2)} → ${(o.after / 100).toFixed(2)}, a rise of `
    + `${(rise / 100).toFixed(2)}, while the page named ${(sum / 100).toFixed(2)}`);

  const hidden = o.lines.filter((l) => !l.inWindow || !l.onTop);
  sink(id, "visible", named && hidden.length === 0,
    hidden.map((l) => `«${l.text}» at y=${l.rect.y}..${l.rect.y + l.rect.h} against a bar at `
      + `${o.read.barTop} in a ${o.read.viewport.h}px window (scrolled ${o.read.scrollY}); `
      + `elementFromPoint says ${l.hit}`).join("; "));

  const blank = o.spreads.map((s, i) => ({ s, l: o.lines[i] }))
    .filter((x) => x.s.delta < DELTA_FLOOR);
  sink(id, "painted", named && o.spreads.length === o.lines.length && blank.length === 0,
    blank.map((x) => `«${x.l.text}» covers ${x.s.px}px of the screenshot, and blanking its `
      + `text changes those pixels by ${x.s.delta.toFixed(2)} levels — under the `
      + `${DELTA_FLOOR} floor, so nothing was painted there`)
      .join("; "));
}

// ---------------------------------------------------------------------------
const browser = await chromium.launch({ headless: !HEADED });
let expected = SIZES.length * PICKS.length + CANARY_RUNS;
let discovered = 0, attempted = 0, completed = 0;
const canary = { id: "the-note-put-back-below-the-chips", observed_failure: false, problems: [], runs: [] };

for (const size of SIZES) {
  for (const pick of PICKS) {
    const label = `${size.w}x${size.h} ${pick} slot`;
    console.log(`  ${label}`);
    discovered++; attempted++;
    const o = await target(browser, size, pick, {
      label, file: `${size.w}x${size.h}-${pick}.png`,
    });
    grade(label, o, check);
    observed.push(`${label}: $${((o.before ?? 0) / 100).toFixed(0)} → $${((o.after ?? 0) / 100).toFixed(0)}`
      + ` · ${o.lines.map((l) => l.text).join(" / ") || "(nothing named)"}`
      + ` · ink ${o.spreads.map((s) => s.delta.toFixed(1)).join("/") || "-"}`);
    completed++;
  }
}

// ── THE CANARY, FIVE TIMES, AT THE WIDTH THE DEFECT WAS MEASURED AT ───────
console.log(`  canary x${CANARY_RUNS} — the note put back below the chips; it MUST fail`);
for (let run = 1; run <= CANARY_RUNS; run++) {
  discovered++; attempted++;
  const problems = [];
  // **THE FIRST SLOT, NOT THE LAST, AND THE FIRST VERSION OF THIS CANARY GOT
  // IT WRONG — caught 2 times in 5.** Below the chips, the note sits at the
  // BOTTOM of the block, so scrolling to the last chip scrolls the note into
  // view along with it and the defect hides itself. The original measurement
  // was taken on the FIRST slots, at scroll 0, where nineteen chips stand
  // between the customer and the sentence: note at 836-898px in an 844px
  // window. Reproducing a defect means reproducing the position it was in.
  const o = await target(browser, { w: 320, h: 844 }, "first", {
    canary: true, label: `canary run ${run}`, file: `canary-${run}.png`,
  });
  // ITS FAILURES GO IN THE CANARY, NOT IN `failures` — a negative control that
  // reddens the run is a negative control nobody keeps.
  grade(`canary ${run}`, o, (t, name, cond, detail) => {
    assertions++;
    if (cond) return;
    problems.push(`${name} ${detail}`.trim());
  });
  const caught = problems.length > 0;
  console.log(`    run ${run}: ${caught ? "caught" : "MISSED"}${caught ? ` — ${problems[0].slice(0, 90)}` : ""}`);
  canary.runs.push({ run, caught, problems });
  canary.problems.push(...problems.map((p) => `run ${run}: ${p}`));
  completed++;
}
const caughtCount = canary.runs.filter((r) => r.caught).length;
// **EVERY RUN, NOT MOST OF THEM.** A canary caught 4 times in 5 is a coin, and
// this repo has an open Wave 14 item about a sweep that answered differently
// five times running.
canary.observed_failure = caughtCount === CANARY_RUNS;
canary.caught = `${caughtCount}/${CANARY_RUNS}`;

await browser.close();

console.log("\nWhat the bar actually did:");
for (const o of observed) console.log("  " + o);
if (consoleNoise.length) {
  console.log("\nConsole (the two known React Router v7 warnings are dropped by name):");
  for (const c of consoleNoise) console.log("  " + c);
}

const status = failures.length === 0 && canary.observed_failure && consoleNoise.length === 0
  ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "surcharge-visible",
  started_at,
  status,
  expected_targets: expected,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  // 15 targets x 5 questions. Lowering it is a visible diff somebody has to
  // justify, which is the only reason a floor is written down at all.
  min_assertions: 75,
  failures: [...failures, ...consoleNoise.map((c) => `console: ${c}`)],
  artifacts,
  warnings: BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : [],
  dimensions: {
    slug: SLUG,
    sizes: SIZES.map((s) => `${s.w}x${s.h}`),
    picks: PICKS,
    observed,
    delta_floor: DELTA_FLOOR,
    canary_runs: CANARY_RUNS,
    sabotage: BREAK || null,
  },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${completed}/${expected} targets, ${assertions} assertions, `
  + `${failures.length} failure(s), canary caught ${caughtCount}/${CANARY_RUNS}.`
  + ` Receipt ${path}`);
for (const f of failures) console.log("  · " + f);
process.exit(status === "pass" ? 0 : 1);
