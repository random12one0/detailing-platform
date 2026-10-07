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

// ---------------------------------------------------------------------------
// THE SECOND ARM, ADDED 2026-10-06 (ROADMAP 14.10's last clause): THE PLAN-GROWTH
// CONDITION, FORCED INSTEAD OF WAITED FOR.
//
//   TOUR_FORCE_GROWTH=1 node scripts/tour-runs.mjs 10 1440 392
//
// The clause asks for the cold-open condition to be closed DETERMINISTICALLY:
// force it on purpose, show the tour still reaches six blocks under it, and name
// the mechanism in `Walkthrough.jsx`. Twenty ordinary runs cannot do that (against
// a one-in-ten rate, one in twenty and two in twenty are the same observation),
// and this script's own history is the proof: the "2 in 20" that started the item
// turned out to be this script reading a card that had not arrived yet.
//
// WHAT IS FORCED. At 1440 the Today tab has a card that is NOT there when the
// screen first draws: "How much of the next seven days is still free", fed by one
// `available-slots` read (`Today.jsx`, only at the wide widths). The tour plans
// against the screen as it first settles and SHOWS that plan, then keeps looking
// and splices a step that turns up late (`Walkthrough.jsx`, the branch that
// compares `kept` against `shown`), so the count on the card goes up by one in
// the middle of a block: the `1/5 ... 2/6` signature. Here that read is HELD at
// the network until the walker has pressed Next once, then released, so the late
// step arrives while the tour is on screen, every run, on purpose.
//
// WHAT IT ASKS, per run: the total on the card CHANGED inside a block (so the
// condition really fired), the tour still walked to six blocks, and each block
// was walked to the total it ended on. A run in which nothing grew is reported
// as NOT FORCED and fails the batch: a forced arm that forced nothing would read
// as a pass. `TOUR_FORCE_BREAK=1` is its canary: it releases the read BEFORE the
// tour opens, so nothing can grow, and the batch must go red on exactly that.

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
const FORCE = process.env.TOUR_FORCE_GROWTH === "1";
const FORCE_BREAK = FORCE && process.env.TOUR_FORCE_BREAK === "1";
const CARD_WAIT = 8000;
const SHOTS = "artifacts/tour-runs";

const once = async (browser, width, tag, wait = WAIT, force = false) => {
  const ctx = await browser.newContext({ viewport: { width, height: width >= 1180 ? 900 : 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).split("\n")[0]));
  const out = { width, tag, steps: 0, blocks: [], trail: [], ended: null, errors, forced: force, held: 0, grew: 0, walkedFull: null };
  // THE HOLD. Every `available-slots` read waits at the network until `release()`;
  // a safety release at 20s means a hung hold can never hang the batch.
  let release = () => {};
  if (force) {
    const gate = new Promise((r) => { release = r; });
    const safety = setTimeout(release, 20000);
    // THE REAL ANSWER IS FETCHED AT ONCE AND ONLY ITS DELIVERY IS HELD. Holding the
    // request itself left the arrival time to the function's own latency (0.5s to
    // 1.5s cold), and in two of six runs the answer landed after the walker had
    // passed the position the step belongs at, where the tour correctly refuses to
    // renumber a card being read. Released from memory, the late step arrives
    // within a frame of the release, so the position it lands at is the walker's
    // (card two), not the network's.
    await page.route("**/functions/v1/available-slots*", async (route) => {
      out.held += 1;
      let res = null;
      try { res = await route.fetch(); } catch { /* fall back to a plain continue below */ }
      await gate;
      if (res) await route.fulfill({ response: res }).catch(() => {});
      else await route.continue().catch(() => {});
    });
    page.on("close", () => clearTimeout(safety));
    if (FORCE_BREAK) release();            // the canary: released before anything can use it
  }
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
      // THE FORCED ARM WALKS SLOWER, so the late step has a block to land in. The read
      // takes ~0.7s to come back and a block is six cards that this walker clears in
      // ~1.2s, so unpaced the step arrives after the walker has already left Today and
      // is never seen (first run of this arm: grew 0x in every run for exactly that
      // reason). Pacing the WALKER leaves the product's own 4s planning ceiling alone.
      if (force) await page.waitForTimeout(450);
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
      // THE FORCED ARM: the walker has pressed Next once, so the plan is on
      // screen and being walked. Now the held read is let go.
      if (force && k === 1) release();
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
    // Per block: did the total CHANGE while it was being walked (growth), and was
    // every card up to the total it ended on actually seen (walked in full)?
    const seenIn = [];
    let lastOf = null;
    for (const pair of out.trail) {
      const [at, of_] = pair.split("/").map(Number);
      if (at === 1) { out.blocks.push(of_); seenIn.push(1); lastOf = of_; }
      else {
        if (lastOf !== null && of_ > lastOf) out.grew += 1;
        out.blocks[out.blocks.length - 1] = of_; seenIn[seenIn.length - 1] += 1; lastOf = of_;
      }
    }
    out.walkedFull = out.blocks.length > 0 && out.blocks.every((total, n) => seenIn[n] === total);
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
// **THE CONTROL RUNS AT THE SLOW TEMPO WHENEVER `TOUR_WAIT` NAMES A SHORT ONE (see `CONTROL_WAIT` below).**
// Its job is to prove the SCRIPT works, and a control run at the tempo under
// test cannot do that: if a short wait breaks every width, the control fails,
// the batch voids itself, and the one result worth having is thrown away as
// an instrument fault. So the control keeps the known-good second between
// presses and the tempo gets an arm of its own below.
// **THE CONTROL KEEPS THE SLOW FLAT WAIT ONLY WHEN THE SUBJECT IS RUNNING A SHORT FLAT WAIT.**
// Its flat second read a card that had not arrived yet as the end of the tour, which is
// the very fault this script was written to expose: measured 2026-10-06, one control run
// in three died at step 18 with "the card vanished after the press" and voided a whole
// batch that had nothing to do with it. When the subject waits for the next card (the
// default, and what the sweep does), so does the control.
const CONTROL_WAIT = WAIT && WAIT !== 1000 ? 1000 : 0;
const control = [];
for (let i = 1; i <= CONTROL_RUNS; i++) {
  const r = await once(browser, CONTROL, `control-${CONTROL}-${i}`, CONTROL_WAIT);
  control.push(r);
  console.log(`control ${String(i).padStart(2)}  ${CONTROL}px @1000ms  ${String(r.steps).padStart(2)} step(s), `
    + `${r.blocks.length} block(s)  — ${r.ended}`);
}
const controlOk = control.filter((r) => r.steps >= 30).length;
console.log("");

const subject = [];
for (let i = 1; i <= RUNS; i++) {
  const r = await once(browser, SUBJECT, `subject-${SUBJECT}-${i}`, WAIT, FORCE);
  subject.push(r);
  console.log(`run ${String(i).padStart(2)}  ${SUBJECT}px  ${String(r.steps).padStart(2)} step(s), `
    + `${r.blocks.length} block(s) [${r.blocks.join("+") || "-"}]  — ${r.ended}`
    + (FORCE ? `  | held ${r.held} read(s), total grew ${r.grew}x, every block walked in full: ${r.walkedFull}` : "")
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
// ── THE FORCED ARM'S VERDICT ─────────────────────────────────────────────
// Three questions, asked of every run, and the exit code is theirs:
//   fired     the total on the card changed inside a block (the condition was real)
//   six       the tour walked to six blocks under it
//   in full   each block was walked to the total it ended on
// A batch where the condition did not fire in EVERY run is NOT FORCED and fails,
// whatever else it shows: a forced arm that forced nothing reads as a pass.
let forcedRed = false;
if (FORCE) {
  const fired = subject.filter((r) => r.grew > 0).length;
  const six = subject.filter((r) => r.blocks.length === 6).length;
  const full = subject.filter((r) => r.walkedFull).length;
  console.log(`\nFORCED GROWTH${FORCE_BREAK ? " (canary: the read is released before the tour opens)" : ""}: `
    + `fired ${fired}/${RUNS}, six blocks ${six}/${RUNS}, every block walked in full ${full}/${RUNS}`);
  if (fired < RUNS) {
    console.log(`NOT FORCED — the late step joined the plan in ${fired} of ${RUNS} runs. Either the hold did not do its `
      + `job (the canary is built to land here), or the tour refused a step that arrived while the reader was already `
      + `past where it belongs; in both cases this batch proves nothing about the tour under plan growth.`);
    forcedRed = true;
  } else if (six < RUNS || full < RUNS) {
    console.log("RED — the condition fired and the tour did not survive it.");
    forcedRed = true;
  } else {
    console.log("GREEN — the plan grew inside a block in every run, and the tour still reached six blocks, each walked in full.");
  }
}
console.log(`\nlast frames for every short run: ${SHOTS}/  ·  full record: ${SHOTS}/runs.json`);
if (forcedRed) process.exit(1);
