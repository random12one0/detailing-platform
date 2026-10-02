// ROADMAP 14.10 — WHERE THE TOUR DIES AT 1440, TWENTY TIMES, WITH A CONTROL.
//
//   node scripts/tour-runs.mjs              (needs the dev server + seed)
//   node scripts/tour-runs.mjs 20 1440 392  (runs, subject width, control width)
//
// **WHAT THIS REPLACES.** Three observations from one afternoon: the tour
// walked one block at 1440 three times and six blocks once, and the width
// aborted entirely on a fifth run. Three anecdotes and an impression. Andrew,
// 2026-09-20: *"If it turns out to be fourteen in twenty rather than three in
// three, that is a different item than we think we have."* So this opens the
// tour twenty times and writes down where each one stopped.
//
// **THE CONTROL IS THE CANARY, AND IT IS A LIVE ONE.** A script that signs in
// wrong, clicks wrong or waits too little would report a tour dying early at
// every width — which is indistinguishable, in its own output, from a product
// that dies early. So every batch also runs the same walk at 392, where the
// tour is known to reach 33 steps in six blocks. If the control does not
// complete, this run has measured nothing about 1440 and says so: a subject
// result is only worth what the control beside it is worth.
//
// Each run gets a FRESH CONTEXT — its own storage, its own sign-in — because
// re-opening the tour in a warm page is a different experiment from the one
// the sweep does, and the thing being investigated might live in exactly that
// difference.

import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { demoOwner } from "./lib/demoOwner.mjs";
const { chromium } = createRequire(import.meta.url)("../app/node_modules/playwright/index.js");

const BASE = process.env.BASE || "http://localhost:5173";
const nums = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const RUNS = nums[0] || 20;
const SUBJECT = nums[1] || 1440;
const CONTROL = nums[2] || 392;
const CONTROL_RUNS = Math.max(3, Math.round(RUNS / 4));
const BOUND = 48;                       // above the 33 the tour is known to be
// **THE PACING WAS THE VARIABLE, AND IT IS NOW SETTLED — READ THIS BEFORE THE
// PARAGRAPH BELOW IT, WHICH IS HISTORY.** The suspicion was that
// `sweep-widths.mjs` pressed far sooner than this script's flat second,
// because `settle()` returns after 130ms of quiet. Measured: ~250ms inside a
// tab, ~560ms on the press that crosses to a new tab. `TOUR_WAIT` reproduced
// it — 20 of 20 truncating at 1440, and the same short wait killing the tour
// at 392 too. The sweep has since been fixed to wait for the next CARD, so a
// flat wait no longer stands in for it and `TOUR_WAIT` is kept only to re-run
// those historical arms.
// **ZERO MEANS "WAIT FOR THE NEXT CARD", WHICH IS WHAT THE SWEEP NOW DOES —
// 2026-09-20, ROADMAP 14.11.** This script existed to reproduce the sweep's
// tempo with a flat wait, because the sweep pressed on a flat-ish quiet. The
// sweep no longer does: it presses, then waits up to 8s for a DIFFERENT card
// to exist. A flat wait can no longer stand in for it, so the default arm
// waits the same way and `TOUR_WAIT` is kept only for the historical tempo
// arms that produced the finding.
const WAIT = Number(process.env.TOUR_WAIT || 0);
const CARD_WAIT = 8000;
const SHOTS = "artifacts/tour-runs";

const once = async (browser, width, tag, wait = WAIT) => {
  const ctx = await browser.newContext({ viewport: { width, height: width >= 1180 ? 900 : 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).split("\n")[0]));
  const out = { width, tag, steps: 0, blocks: [], trail: [], ended: null, errors };
  try {
    await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
    await page.fill("input[type=email]", "demo@detailplatform.com");
    await page.fill("input[type=password]", demoOwner().password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
    await page.evaluate(() => {
      try { localStorage.removeItem("dp.tours"); localStorage.removeItem("dp.tour"); } catch { /* private mode */ }
    });
    await page.getByRole("button", { name: "Settings", exact: true }).first().click();
    await page.waitForTimeout(1400);
    const row = page.locator(".nav-row", { hasText: "Show me around" });
    if (!(await row.count())) { out.ended = "no Show me around row"; await ctx.close(); return out; }
    await row.first().click();
    await page.waitForSelector(".tourcard", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1600);

    for (let k = 1; k <= BOUND; k++) {
      if (!(await page.locator(".tourcard").count())) { out.ended = "the card went away"; break; }
      const lab = await page.locator(".tourcard .label").first().innerText().catch(() => "");
      const m = /(\d+)\s*OF\s*(\d+)/i.exec(String(lab).replace(/\s+/g, " "));
      if (m) out.trail.push(`${m[1]}/${m[2]}`);
      out.steps = k;
      // **THE LAST FRAME IS KEPT, NOT DESCRIBED.** "It stopped at step 5" is a
      // number; a picture of the screen it stopped on is where somebody sees
      // whether a tab had finished arriving, whether the card was mid-fade, or
      // whether something else was over the top of it.
      const before = await page.locator(".tourcard").count();
      await page.locator(".tourcard button.primary").click({ timeout: 8000 }).catch((e) => {
        out.ended = "the Next press failed: " + String(e.message).split("\n")[0];
      });
      if (out.ended) break;
      if (!wait) {
        // The sweep's real behaviour: press, then wait for a card that is not
        // the one just pressed. Ending here means a press AND a full wait came
        // back empty, which is the only thing allowed to count as "the tour is
        // over" now.
        const t0 = Date.now();
        let arrived = false;
        for (;;) {
          if (await page.locator(".tourcard").count()) {
            const lab2 = await page.locator(".tourcard .label").first().innerText().catch(() => "");
            const m2 = /(\d+)\s*OF\s*(\d+)/i.exec(String(lab2).replace(/\s+/g, " "));
            const now = m2 ? `${m2[1]}/${m2[2]}` : null;
            if (!now || !m || now !== `${m[1]}/${m[2]}`) { arrived = true; break; }
          }
          if (Date.now() - t0 >= CARD_WAIT) break;
          await page.waitForTimeout(60);
        }
        if (!arrived) {
          out.ended = k >= 30 ? "finished" : "no card arrived after the press";
          break;
        }
        if (k === BOUND) out.ended = "hit this script's ceiling of " + BOUND;
        continue;
      }
      await page.waitForTimeout(wait);
      const after = await page.locator(".tourcard").count();
      if (before && !after) {
        out.ended = k >= 30 ? "finished" : "the card vanished after the press";
        break;
      }
      if (k === BOUND) out.ended = "hit this script's ceiling of " + BOUND;
    }
    for (const pair of out.trail) {
      const [at, of_] = pair.split("/").map(Number);
      if (at === 1) out.blocks.push(of_); else out.blocks[out.blocks.length - 1] = of_;
    }
    if (out.steps < 30) {
      await page.screenshot({ path: `${SHOTS}/${tag}.png` }).catch(() => {});
      out.shot = `${SHOTS}/${tag}.png`;
    }
  } catch (e) {
    out.ended = "threw: " + String((e && e.message) || e).split("\n")[0];
  }
  await ctx.close();
  return out;
};

const browser = await chromium.launch();
const { mkdirSync } = await import("node:fs");
mkdirSync(SHOTS, { recursive: true });

console.log(`${RUNS} runs at ${SUBJECT}px, ${CONTROL_RUNS} control runs at ${CONTROL}px, `
  + `${WAIT ? WAIT + "ms between presses" : "waiting for the next card (the sweep's own rule)"}
`);
// **THE CONTROL IS ALWAYS RUN AT THE SLOW TEMPO, WHATEVER `TOUR_WAIT` SAYS.**
// Its job is to prove the SCRIPT works, and a control run at the tempo under
// test cannot do that: if a short wait breaks every width, the control fails,
// the batch voids itself, and the one result worth having is thrown away as
// an instrument fault. So the control keeps the known-good second between
// presses and the tempo gets an arm of its own below.
const control = [];
for (let i = 1; i <= CONTROL_RUNS; i++) {
  const r = await once(browser, CONTROL, `control-${CONTROL}-${i}`, 1000);
  control.push(r);
  console.log(`control ${String(i).padStart(2)}  ${CONTROL}px @1000ms  ${String(r.steps).padStart(2)} step(s), `
    + `${r.blocks.length} block(s)  — ${r.ended}`);
}
const controlOk = control.filter((r) => r.steps >= 30).length;
console.log("");

const subject = [];
for (let i = 1; i <= RUNS; i++) {
  const r = await once(browser, SUBJECT, `subject-${SUBJECT}-${i}`, WAIT);
  subject.push(r);
  console.log(`run ${String(i).padStart(2)}  ${SUBJECT}px  ${String(r.steps).padStart(2)} step(s), `
    + `${r.blocks.length} block(s) [${r.blocks.join("+") || "-"}]  — ${r.ended}`
    + (r.errors.length ? `  :: page error: ${r.errors[0].slice(0, 70)}` : ""));
}
// **THE TEMPO ARM - the same short wait at the OTHER width.** Without it, a
// subject that breaks at 300ms cannot be told apart from a tempo that breaks
// everything: "1440 is fragile" and "pressing fast ends any tour" produce the
// identical subject column. This arm is the difference between them.
const tempo = [];
if (WAIT && WAIT !== 1000) {
  console.log("");
  for (let i = 1; i <= CONTROL_RUNS; i++) {
    const r = await once(browser, CONTROL, `tempo-${CONTROL}-${i}`, WAIT);
    tempo.push(r);
    console.log(`tempo   ${String(i).padStart(2)}  ${CONTROL}px @${WAIT}ms  ${String(r.steps).padStart(2)} step(s), `
      + `${r.blocks.length} block(s)  - ${r.ended}`);
  }
}
await browser.close();

writeFileSync(`${SHOTS}/runs.json`, JSON.stringify({
  at: new Date().toISOString(), base: BASE, subject: SUBJECT, control: CONTROL,
  wait: WAIT, control_runs: control, subject_runs: subject, tempo_runs: tempo,
}, null, 2) + "\n");

console.log("");
if (controlOk < CONTROL_RUNS) {
  console.log(`VOID — the control at ${CONTROL}px completed ${controlOk} of ${CONTROL_RUNS} runs. `
    + `The tour is known to walk 33 steps there, so this script is what failed, not the product, `
    + `and nothing below would be a fact about ${SUBJECT}px.`);
  process.exit(1);
}
console.log(`control: ${controlOk}/${CONTROL_RUNS} completed at ${CONTROL}px — the walk works, `
  + `so what ${SUBJECT}px did is about ${SUBJECT}px.`);

// The distribution, which is the whole point of running it twenty times.
const byStop = new Map();
for (const r of subject) byStop.set(r.steps, (byStop.get(r.steps) || 0) + 1);
console.log(`\nwhere ${SUBJECT}px stopped, over ${RUNS} runs:`);
for (const [steps, n] of [...byStop].sort((a, b) => a[0] - b[0])) {
  console.log(`  ${String(steps).padStart(2)} step(s)  ${String(n).padStart(2)} run(s)  ${"#".repeat(n)}`);
}
const complete = subject.filter((r) => r.steps >= 30).length;
const reasons = new Map();
for (const r of subject) if (r.steps < 30) reasons.set(r.ended, (reasons.get(r.ended) || 0) + 1);
console.log(`\ncomplete: ${complete}/${RUNS}    short: ${RUNS - complete}/${RUNS}`);
for (const [why, n] of reasons) console.log(`  ${String(n).padStart(2)} x  ${why}`);
if (tempo.length) {
  const tOk = tempo.filter((r) => r.steps >= 30).length;
  console.log(`
tempo arm: ${CONTROL}px at ${WAIT}ms completed ${tOk}/${tempo.length}. `
    + (tOk === tempo.length
      ? `The short wait alone does NOT end a tour, so what ${SUBJECT}px did at ${WAIT}ms is about ${SUBJECT}px.`
      : `The short wait ends tours at ${CONTROL}px too, so the subject column above is about TEMPO `
        + `and not about ${SUBJECT}px. A sweep pressing this fast has been measuring its own patience.`));
}
console.log(`\nlast frames for every short run: ${SHOTS}/  ·  full record: ${SHOTS}/runs.json`);
