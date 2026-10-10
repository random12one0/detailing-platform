// ROADMAP 2.1b — THE TRAVEL AREA MOVES THE TOTAL ON THE CLICK, BY EXACTLY WHAT
// THE CONTROL SAYS.
//
//   node scripts/travel-price-walk.mjs                  # dev server + seed, no credentials
//   node scripts/travel-price-walk.mjs --break=canary   # sabotage: the canary is real
//   node scripts/receipt.mjs receipts/travel-price-walk.json
//
// Andrew's ruling on 2.1b, 2026-10-09: the price changes on the first click
// that changes price, and after every later one. The supervisor walked the
// services, add-ons and vehicle size (10 of 10 moved, `.manager-shots/
// 2-1b-price-walk.json`) and the day was proved under 2.1c. **The travel area
// on "Pick a place" had been compared by nobody** — this is that walk.
//
// IT ASKS FOR THE EXACT DELTA, NOT "DID IT MOVE". The option reads
// "Beyond 15 miles · +$40", so the bar must rise by exactly $40 — a total that
// moves by the wrong amount is the same broken promise as one that does not
// move. The amount is read off the control the customer reads, never typed
// here, so a re-priced seed cannot make this lie.
//
// AND IT ASKS THE OTHER HALF: switching to drop-off must take the fee OFF
// (nobody travels), switching back must put it ON again, and Drop it off with
// the free area selected must move nothing. A check that only asked "did it
// rise" would pass a page that charged travel on a drop-off.
//
// THE CLICK IS PROVED TO HAVE LANDED before its delta is judged — the select's
// value, the card's `selected` class — because a click that missed reads as
// "the price did not move" (`docs/gotchas.md` 108). And the read waits on the
// QUOTE REQUEST COUNT, never on the text going quiet, because the pre-update
// plateau is byte-identical to a settled reading (`docs/gotchas.md` 109).
//
// THE CANARY reproduces the defect class itself through the real server: every
// quote request has its `travel_zone` rewritten to the first (free) area, so
// the page asks for the wrong area and the bar cannot move on a zone change.
// It must be caught on every run. `--break=canary` turns the rewrite off; the
// canary then catches nothing and `receipt.mjs` must reject the receipt.

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";

const { chromium } = createRequire(import.meta.url)("../app/node_modules/playwright/index.js");

const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const BASE = process.env.BASE || "http://localhost:5173";
const SLUG = "demo-detail";
const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }, { w: 320, h: 844 }];
const CANARY_RUNS = 3;
const ART = fileURLToPath(new URL("../artifacts/travel-price-walk/", import.meta.url));
mkdirSync(ART, { recursive: true });

const started_at = new Date().toISOString();
let assertions = 0;
const failures = [];
const artifacts = [];
const consoleNoise = [];
const observed = [];

const barMoney = (page) => page.evaluate(() => {
  const m = document.querySelector(".bk-bar")?.innerText.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
  return m ? Math.round(parseFloat(m[1].replace(/,/g, "")) * 100) : null;
});
const stepNow = (page) => page.evaluate(() => {
  const m = document.querySelector(".bk-step-head .bk-step-label")?.innerText.match(/(\d+)\s*\D+\s*(\d+)/);
  return m ? Number(m[1]) : null;
});
const cents = (text) => {
  const m = String(text).match(/\$\s*([\d,]+)/);
  return m ? Number(m[1].replace(/,/g, "")) * 100 : 0;
};
const $ = (c) => (c === null ? "(no figure)" : `$${(c / 100).toFixed(0)}`);

/** Act, then wait until every quote that act sent has been answered. */
async function quoted(page, act) {
  const q = page.__q, before = q.done;
  await act();
  const t0 = Date.now();
  for (;;) {
    await page.waitForTimeout(120);
    if (Date.now() - t0 > 15000) break;
    if (q.inflight > 0) continue;
    if (q.done > before) break;
    if (Date.now() - t0 > 1500) break;   // this act sent no quote
  }
  await page.waitForTimeout(250);        // React paints the answer
}

async function target({ w, h }, { label, canary }) {
  const results = [];   // { name, ok, detail }
  const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.__q = { inflight: 0, done: 0 };
  const isQuote = (r) => /calculate-booking/.test(r.url()) && r.method() === "POST";
  page.on("request", (r) => { if (isQuote(r)) page.__q.inflight++; });
  page.on("requestfinished", (r) => { if (isQuote(r)) { page.__q.inflight--; page.__q.done++; } });
  page.on("requestfailed", (r) => { if (isQuote(r)) page.__q.inflight--; });
  page.on("console", (m) => {
    if (m.type() !== "error" && m.type() !== "warning") return;
    if (/React Router Future Flag Warning/.test(m.text())) return;
    consoleNoise.push(`${label} · ${m.type()} · ${m.text().slice(0, 180)}`);
  });
  page.on("pageerror", (e) => consoleNoise.push(`${label} · pageerror · ${String(e.message).slice(0, 180)}`));

  let freeKey = null;
  if (canary && BREAK !== "canary") {
    await page.route("**/functions/v1/calculate-booking", (route) => {
      const req = route.request();
      if (req.method() !== "POST" || !freeKey) return route.continue();
      const body = req.postDataJSON();
      if (body.travel_zone) body.travel_zone = freeKey;
      return route.continue({ postData: JSON.stringify(body) });
    });
  }

  try {
    await page.goto(`${BASE}/book/${SLUG}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".bk-pick", { state: "attached", timeout: 30000 });
    await page.waitForTimeout(600);

    // ── THE FIRST PRICED CLICK — no figure before it, the card's figure after ──
    const svc = page.locator(".bk-pick").first();
    const stated = cents(await svc.textContent());
    const before0 = await barMoney(page);
    await quoted(page, () => svc.click());
    const after0 = await barMoney(page);
    check("first-click-no-figure-before", before0 === null, `bar read ${$(before0)} before any choice`);
    check("first-click-priced", after0 === stated, `card says ${$(stated)}, bar read ${$(after0)}`);
    observed.push(`${label}: first service ${$(before0)} -> ${$(after0)} (card ${$(stated)})`);

    // ── ON TO "PICK A PLACE", recognised by its travel-area box ─────────────
    const zoneBox = page.locator(".bk-field select");
    for (let guard = 0; guard < 8 && !(await zoneBox.count()); guard++) {
      const from = await stepNow(page);
      await quoted(page, () => page.locator(".bk-bar button.bk-btn.primary").click({ force: true }));
      if ((await stepNow(page)) === from) {
        // Refused: choose the first card on this step and press again.
        await quoted(page, () => page.locator(".bk-card.selectable").first().click());
        await quoted(page, () => page.locator(".bk-bar button.bk-btn.primary").click({ force: true }));
      }
    }
    if (!(await zoneBox.count())) throw new Error("never reached the travel-area box on Pick a place");

    const zones = await zoneBox.locator("option").evaluateAll((os) =>
      os.map((o) => ({ value: o.value, text: o.textContent })));
    const free = zones.find((z) => cents(z.text) === 0);
    const paid = zones.find((z) => cents(z.text) > 0);
    if (!free || !paid) throw new Error(`need one free and one paid area, found ${JSON.stringify(zones)}`);
    freeKey = free.value;
    const fee = cents(paid.text);
    const mobile = page.locator(".bk-card.selectable", { hasText: /We come to you/ }).first();
    const dropoff = page.locator(".bk-card.selectable", { hasText: /Drop it off/ }).first();
    await mobile.scrollIntoViewIfNeeded();

    // Each step: what to do, how to prove it landed, and the exact delta owed.
    const steps = [
      { name: "paid-area", owe: fee, act: () => zoneBox.selectOption(paid.value),
        landed: async () => (await zoneBox.inputValue()) === paid.value },
      { name: "dropoff-drops-fee", owe: -fee, act: () => dropoff.click(),
        landed: async () => /\bselected\b/.test(await dropoff.getAttribute("class")) },
      { name: "mobile-restores-fee", owe: fee, act: () => mobile.click(),
        landed: async () => /\bselected\b/.test(await mobile.getAttribute("class")) },
      { name: "free-area", owe: -fee, act: () => zoneBox.selectOption(free.value),
        landed: async () => (await zoneBox.inputValue()) === free.value },
      // THE REFUSAL: a free area and drop-off both owe nothing, so this click
      // must move NOTHING. A page charging travel on a drop-off reddens here.
      { name: "dropoff-free-moves-nothing", owe: 0, act: () => dropoff.click(),
        landed: async () => /\bselected\b/.test(await dropoff.getAttribute("class")) },
    ];
    for (const s of steps) {
      const before = await barMoney(page);
      await quoted(page, s.act);
      const landed = await s.landed();
      const after = await barMoney(page);
      check(`${s.name}-landed`, landed, "the click did not take");
      const got = before !== null && after !== null ? after - before : null;
      check(`${s.name}-delta`, got === s.owe,
        `owed ${s.owe >= 0 ? "+" : "-"}${$(Math.abs(s.owe))}, bar went ${$(before)} -> ${$(after)}`);
      observed.push(`${label}: ${s.name} ${$(before)} -> ${$(after)} (owed ${s.owe / 100})`);
    }
    // Drop-off: nobody travels, so the area question is not asked at all.
    check("dropoff-hides-area", (await zoneBox.count()) === 0, "travel-area box still shown on drop-off");

    const shot = `artifacts/travel-price-walk/${label.replace(/[^a-z0-9]+/gi, "-")}.png`;
    await page.screenshot({ path: shot });
    artifacts.push(shot);
  } catch (e) {
    check("reached", false, e.message.slice(0, 200));
  } finally {
    await browser.close();
  }
  return results;
}

// ── the real targets ────────────────────────────────────────────────────────
let completed = 0;
for (const size of SIZES) {
  const label = `${size.w}x${size.h}`;
  console.log(`\n${label}`);
  const rs = await target(size, { label, canary: false });
  for (const r of rs) {
    assertions++;
    if (r.ok) console.log(`    ok      ${r.name}`);
    else { failures.push(`${label}: ${r.name} ${r.detail}`); console.error(`    FAIL    ${r.name}  ${r.detail}`); }
  }
  if (!rs.some((r) => r.name === "reached")) completed++;
}

// ── the canary: the quote asks for the wrong area; it MUST be caught ────────
const canary = { id: "travel-zone-ignored", runs: [], observed_failure: false, caught: "" };
console.log(`\ncanary "travel-zone-ignored" x${CANARY_RUNS} — every quote asks for the free area; it MUST fail`);
for (let run = 1; run <= CANARY_RUNS; run++) {
  const rs = await target({ w: 392, h: 844 }, { label: `canary ${run}`, canary: true });
  const caught = rs.some((r) => /-delta$/.test(r.name) && !r.ok);
  canary.runs.push({ run, caught, failed: rs.filter((r) => !r.ok).map((r) => `${r.name} ${r.detail}`) });
  console.log(`    run ${run}: ${caught ? "caught" : "NOT CAUGHT"}`);
}
const nCaught = canary.runs.filter((r) => r.caught).length;
canary.caught = `${nCaught}/${CANARY_RUNS}`;
canary.observed_failure = nCaught === CANARY_RUNS;

console.log("\nWhat the bar did:");
for (const o of observed) console.log("  " + o);
if (consoleNoise.length) { console.log("\nConsole:"); for (const c of consoleNoise) console.log("  " + c); }

const status = failures.length === 0 && canary.observed_failure && consoleNoise.length === 0 ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "travel-price-walk",
  started_at,
  status,
  expected_targets: SIZES.length,
  discovered_targets: SIZES.length,
  attempted_targets: SIZES.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: SIZES.length * 13,
  assertion_floor:
    "3 sizes x 13 questions (2 first-click + 5 steps x landed/delta + dropoff-hides-area) = 39. "
    + "A target that cannot be reached grades as a 'reached' failure, so the count is fixed by the code, not the run.",
  failures: [...failures, ...consoleNoise.map((c) => `console: ${c}`)],
  artifacts,
  warnings: BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : [],
  dimensions: { slug: SLUG, sizes: SIZES.map((s) => `${s.w}x${s.h}`), observed, canary_runs: CANARY_RUNS, break: BREAK || null },
  canary,
});
console.log(`\n${status.toUpperCase()} — ${completed}/${SIZES.length} targets, ${assertions} assertions, `
  + `${failures.length} failure(s), canary ${canary.caught}. Receipt ${path}`);
process.exitCode = status === "pass" ? 0 : 1;
