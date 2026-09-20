// ROADMAP — THE TOUR CAPTION AT 392 AND 320, MEASURED THREE WAYS.
//
//   node scripts/tour-caption.mjs            (needs the dev server + seed)
//   node scripts/tour-caption.mjs 28         (a different step)
//
// **WHY THIS EXISTS RATHER THAN A FIX.** The widened inventory's first honest
// run reported, at 392px and 320px:
//
//     past-parent  +14px  p.body.tourline in div  «Your own settings live beh»
//
// and `theme.css` contains, forty lines from the rule that draws that
// paragraph:
//
//     @keyframes step-fwd { from { opacity: 0; transform: translate3d(14px, 0, 0); } }
//
// Fourteen pixels, and fourteen pixels. `getBoundingClientRect()` reports the
// TRANSFORMED box, so a caption photographed on the first frame of its
// entrance is exactly 14px to the right of where it lives — and "14px past its
// parent" is what that looks like to a probe that only asks about edges.
//
// **THAT IS A HYPOTHESIS AND THIS SCRIPT IS HERE TO KILL IT OR CONFIRM IT.**
// The repo's own rule: find out rather than assuming. So every step is
// measured THREE TIMES over —
//
//   1 RAW      immediately, whatever the animation is doing
//   2 SETTLED  after the page has gone quiet, which is what the sweep does
//   3 FINISHED after `getAnimations().finish()`, which is the layout itself
//
// — and the answer is in the difference between them. If 3 is clean and 1 is
// 14px, the product is fine and the sweep was photographing a moving object.
// If 3 is also 14px, there is a real overflow and it has nothing to do with
// the animation sharing its number.
//
// **AND IT ASKS THE RIDER'S QUESTION TOO**, which is the one that might matter
// more: neither phone screenshot of step 28 has the caption card in frame at
// all. A card outside the viewport is a worse defect than a paragraph 14px
// wide of its box, and no edge-comparison probe would ever say so, because
// the card is perfectly inside its own parent while being nowhere a reader
// can see it.

import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("../app/node_modules/playwright/index.js");

const BASE = process.env.BASE || "http://localhost:5173";
const STEP = Number(process.argv.find((a) => /^\d+$/.test(a)) || 28);
const WIDTHS = [392, 320];

// The measurement, run in the page. `el` is the caption, `box` its parent.
const PROBE = () => {
  const p = document.querySelector(".tourcard p.tourline");
  const card = document.querySelector(".tourcard");
  if (!p || !card) return null;
  const box = p.parentElement;
  const pr = p.getBoundingClientRect();
  const br = box.getBoundingClientRect();
  const cr = card.getBoundingClientRect();
  return {
    // Positive means the caption's right edge is past its parent's.
    pastRight: Math.round((pr.right - br.right) * 10) / 10,
    pastLeft: Math.round((br.left - pr.left) * 10) / 10,
    pWidth: Math.round(pr.width * 10) / 10,
    boxWidth: Math.round(br.width * 10) / 10,
    // The transform actually on the element at this instant, which is the
    // whole question. `none` means nothing is moving it.
    transform: getComputedStyle(p).transform,
    running: document.getAnimations().filter((a) => a.playState === "running").length,
    // THE RIDER: is the card where a person could read it?
    card: {
      top: Math.round(cr.top), left: Math.round(cr.left),
      bottom: Math.round(cr.bottom), right: Math.round(cr.right),
      width: Math.round(cr.width), height: Math.round(cr.height),
    },
    viewport: { w: innerWidth, h: innerHeight },
    inFrame: cr.top >= 0 && cr.left >= 0 && cr.bottom <= innerHeight && cr.right <= innerWidth,
    label: (document.querySelector(".tourcard .label")?.innerText || "").replace(/\s+/g, " ").trim(),
    says: (p.innerText || "").slice(0, 34),
  };
};

const run = async (width, lite) => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width, height: 844 } });
  const page = await ctx.newPage();
  const q = lite ? "?lite=1" : "";
  await page.goto(`${BASE}/app${q}`, { waitUntil: "domcontentloaded" });
  await page.fill("input[type=email]", "demo@detailplatform.com");
  await page.fill("input[type=password]", "demo123");
  await page.click("form button.btn.primary");
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  // A guide already seen never arrives; both keys, because `seenTours()` is an
  // OR over them and clearing one is a no-op.
  await page.evaluate(() => {
    try { localStorage.removeItem("dp.tours"); localStorage.removeItem("dp.tour"); } catch { /* private mode */ }
  });
  await page.getByRole("button", { name: "Settings", exact: true }).first().click();
  await page.waitForTimeout(1400);
  const row = page.locator(".nav-row", { hasText: "Show me around" });
  if (!(await row.count())) { console.log(`${width}px  NO "Show me around" ROW`); await browser.close(); return null; }
  await row.first().click();
  await page.waitForSelector(".tourcard", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1600);

  const rows = [];
  for (let k = 1; k <= STEP; k++) {
    if (!(await page.locator(".tourcard").count())) {
      console.log(`${width}px  the tour ended at step ${k - 1}, before step ${STEP}`);
      break;
    }
    if (k === STEP) {
      // 0 FRAME ZERO — **the sweep's number, reproduced deliberately.**
      // Everything below measures the caption at rest and finds it flush, and
      // a settled reading of 0px does not by itself explain where a 14px came
      // from: it only shows there is nothing wrong NOW.
      //
      // **THE FIRST ATTEMPT AT THIS READ `transform: none` AND PRINTED 0px** —
      // a clean number from a probe that was not looking at anything. By the
      // time the walk arrives, `step-fwd` has been over for the best part of a
      // second, it carries no `forwards` fill, and a finished animation is no
      // longer in `getAnimations()`, so winding "it" to zero wound nothing.
      //
      // So the keyframe is REPLAYED: the same shipped `step-fwd`, by name, at
      // a duration long enough to still be running when the probe reads it.
      // Nothing is simulated and no second keyframe is invented. And if the
      // transform still comes back `none` the reading is VOID rather than
      // zero, because those two are not the same answer - which is the whole
      // lesson of the attempt before it.
      rows.push(["frame zero", await page.evaluate(() => {
        const p2 = document.querySelector(".tourcard p.tourline");
        if (!p2) return null;
        p2.style.animation = "none";
        void p2.offsetWidth;                       // force the restart
        p2.style.animation = "step-fwd 20s linear";
        for (const a of p2.getAnimations()) { a.pause(); a.currentTime = 0; }
        return true;
      }).then((ok) => ok ? page.evaluate(PROBE) : null)]);
      // **CANCEL, NOT JUST UNSET.** Clearing the inline style leaves the
      // paused Animation object alive and still holding the caption 14px to
      // the right, so the "raw" and "settled" rows below inherited the
      // replay and read 14px too - three readings agreeing because one of
      // them had contaminated the other two. The `?lite=1` rows, which have
      // no animation to leak, were the tell: they read 0px in the same run.
      await page.evaluate(() => {
        const p2 = document.querySelector(".tourcard p.tourline");
        if (!p2) return;
        for (const a of p2.getAnimations()) { try { a.cancel(); } catch { /* gone */ } }
        p2.style.animation = "";
      });
      // 1 RAW — no waiting at all beyond the click that brought us here.
      rows.push(["raw", await page.evaluate(PROBE)]);
      // 2 SETTLED — the page quiet, which is the state the sweep measures in.
      await page.waitForTimeout(1200);
      rows.push(["settled", await page.evaluate(PROBE)]);
      // 3 FINISHED — every animation jumped to its end. This is the layout.
      await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch { /* none */ } }));
      rows.push(["finished", await page.evaluate(PROBE)]);
      break;
    }
    await page.locator(".tourcard button.primary").click();
    // **260ms ENDED THE TOUR AT STEP 4 — first run of this script, 2026-09-20.**
    // A block's last Next has to carry the tour to the next TAB: the screen
    // changes, the new block plans itself against it, and a press that lands
    // during that lands on nothing. `sweep-widths.mjs` waits ~1000ms here and
    // walks all 33; this waited a quarter of that and reported the tour
    // "ending" four steps in, which is a statement about this script rather
    // than about the product.
    await page.waitForTimeout(1000);
  }
  await browser.close();
  return rows;
};

const label = (w, lite) => `${w}px${lite ? " ?lite=1" : ""}`;
console.log(`the caption on tour step ${STEP}, measured raw / settled / finished\n`);
let worstFinished = 0;
// **A VERDICT NEEDS SOMETHING TO BE A VERDICT ABOUT.** The first run of this
// script reached step 4 of 28, measured nothing at any width, and then printed
// `VERDICT: no overflow in the settled layout` — because the worst reading it
// had seen was zero, and it had seen none. A clean answer from an empty run is
// this repo's most repeated and most expensive failure, and a script written
// specifically to avoid assuming things managed to commit it on its first
// outing. Counted, and the verdict refuses to speak below this number.
let finishedReadings = 0;
for (const w of WIDTHS) {
  for (const lite of [false, true]) {
    const rows = await run(w, lite);
    if (!rows || !rows.length) { console.log(`${label(w, lite)}  nothing measured\n`); continue; }
    console.log(`${label(w, lite)}   «${rows[0][1]?.says ?? "?"}»   ${rows[0][1]?.label ?? ""}`);
    for (const [when, m] of rows) {
      if (!m) { console.log(`  ${when.padEnd(9)} no card on screen`); continue; }
      if (when === "frame zero" && m.transform === "none") {
        console.log(`  ${when.padEnd(10)} VOID — the replayed keyframe put no transform on the caption, `
          + `so this reading is about nothing. It is NOT a measurement of zero.`);
        continue;
      }
      console.log(`  ${when.padEnd(10)} past-right ${String(m.pastRight).padStart(6)}px   `
        + `caption ${m.pWidth} in box ${m.boxWidth}   transform ${m.transform === "none" ? "none" : m.transform}   `
        + `${m.running} animation(s) running`);
      if (when === "finished") { worstFinished = Math.max(worstFinished, m.pastRight); finishedReadings++; }
    }
    const last = rows[rows.length - 1][1];
    if (last) {
      console.log(`  card       ${last.card.width}x${last.card.height} at (${last.card.left}, ${last.card.top}) `
        + `in a ${last.viewport.w}x${last.viewport.h} viewport — ${last.inFrame ? "fully in frame" : "NOT FULLY IN FRAME"}`);
    }
    console.log("");
  }
}
const EXPECT_READINGS = WIDTHS.length * 2;   // each width, normal and ?lite=1
if (finishedReadings < EXPECT_READINGS) {
  console.log(`VOID: ${finishedReadings} of ${EXPECT_READINGS} settled readings were taken. `
    + `This run did not reach step ${STEP} everywhere it was asked to, so it has NO verdict to give — `
    + `neither "there is an overflow" nor "there is not". Fix the walk, then ask again.`);
  process.exit(1);
}
console.log(worstFinished > 0.5
  ? `VERDICT: a real overflow, from ${finishedReadings} settled reading(s). Worst is ${worstFinished}px past the parent.`
  : `VERDICT: no overflow in the settled layout, from ${finishedReadings} settled reading(s). Every finished `
    + `reading is flush or inside, so a non-zero number from the sweep is the caption being photographed `
    + `mid-entrance - step-fwd starts at translate3d(14px, 0, 0) and getBoundingClientRect reports the `
    + `transformed box.`);
