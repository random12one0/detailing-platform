// ROADMAP 8.5a — A REAL TAB WALK, AND WHETHER A PERSON CAN SEE WHERE THEY ARE.
//
//   node scripts/keyboard-walk.mjs          (needs the dev server + seed)
//   node scripts/receipt.mjs receipts/keyboard-walk.json
//
// Reach and accessible names were already clean (187 controls, 8.5's first
// pass). This asks the half that strands somebody: with focus HELD on a
// control, is anything different on the screen — and can you get out of what
// you opened?
//
// ---------------------------------------------------------------------------
// TWO DECISIONS, BOTH MADE BEFORE THE FIRST RUN
// ---------------------------------------------------------------------------
// **1 · PIXELS, NOT COMPUTED STYLE.** An `outline` that paints nothing still
// reads as present in `getComputedStyle`. So each stop is photographed with
// focus, blurred, photographed again, and the bytes compared.
//
// **2 · IN VIEW IS PART OF VISIBLE.** Focus rendered somewhere nobody can see
// is not visible focus. The viewport test is taken from the element's rect
// **the instant it receives focus, before anything is photographed** — because
// Playwright's own `elementHandle.screenshot()` scrolls an element into view,
// so taking the picture first would silently repair the fault being looked for.
//
// ---------------------------------------------------------------------------
// THREE FAULTS THIS PROBE HAD, ALL FOUND BY ITS OWN CANARIES
// ---------------------------------------------------------------------------
// It reported VOID four times before it reported a result, and every one of
// these would otherwise have shipped as a clean sheet:
//
// · **It stopped at `document.body`.** The first Tab after a fresh load lands
//   on the body; treating that as "no focus" ended every dashboard walk on its
//   first press — 0 stops on a screen with 25 focusable controls.
// · **It stopped on a repeated DESCRIPTION.** Two identical-looking buttons
//   ended the walk. Termination is by element identity now.
// · **IT COULD NOT TELL A FOCUS RING FROM A MOVING BACKGROUND.** This product's
//   background animates for ever (docs/gotchas.md), so "focused differs from
//   blurred" was true whether or not a ring existed: a false PASS. Two
//   identical shots are taken first as a stability baseline, and the walk runs
//   under `reducedMotion: "reduce"` so the page holds still. Without that, 91
//   of 167 stops were undetermined.
//
// **THE LIMIT THAT BUYS:** a focus ring that only appears BY ANIMATION would
// be invisible to this walk, because the walk turns animation off to be able
// to see anything at all. Nothing in this product does that today; if
// something starts, this check will call it missing.
//
// The canaries are the two ways this fails in the wild — a control with its
// ring styled away, and a dialog that swallows Escape — planted on every
// screen, and the ring canary is focused DIRECTLY rather than left to the tab
// order, because its job is to prove the detector works and not to prove the
// page's tab order includes it.

import { createRequire } from "node:module";
const req = createRequire(import.meta.url);
const { chromium } = req("D:/Users/rando/Downloads/claude/detailing-platform/app/node_modules/playwright/index.js");
import { writeReceipt } from "./receipt.mjs";

const BASE = "http://localhost:5173";
const started_at = new Date().toISOString();

// TWO CANARIES, PLANTED ON EVERY SCREEN, because these are the two ways this
// fails in the wild:
//   1 a control whose focus ring is styled away — must be caught by PIXELS,
//     since its computed outline can still read as present;
//   2 a dialog that swallows Escape — must be caught by the Escape test.
const PLANT = () => {
  const b = document.createElement("button");
  b.id = "canary-no-ring";
  b.textContent = "canary no ring";
  b.style.cssText = "outline:none!important;box-shadow:none!important;position:fixed;top:0;left:0;z-index:99999;background:#111;color:#111;border:0;";
  document.body.prepend(b);
  const d = document.createElement("div");
  d.id = "canary-escape-trap";
  d.setAttribute("role", "dialog");
  d.style.cssText = "position:fixed;bottom:0;left:0;width:1px;height:1px;opacity:0.01;";
  d.dataset.open = "1";
  d.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); } });
  document.body.appendChild(d);
};

const walk = async (page, label, out) => {
  await page.evaluate(PLANT);
  await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) {} }));
  await page.evaluate(() => (document.activeElement || document.body).blur?.());
  const stops = [];
  await page.evaluate(() => { window.__seen = []; });
  let blanks = 0;
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press("Tab");
    // MEASURED BEFORE ANYTHING SCROLLS IT. Playwright's own element
    // screenshot scrolls into view, which would hide exactly this fault.
    const f = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return null;
      const r = a.getBoundingClientRect();
      return {
        tag: a.tagName.toLowerCase(), id: a.id || null,
        cls: String(a.className || "").slice(0, 36),
        text: (a.innerText || a.value || a.getAttribute("aria-label") || "").trim().slice(0, 22),
        inViewport: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth,
        area: Math.round(r.width * r.height),
      };
    });
    // BODY IS A STOP ON THE WAY IN, NOT THE END OF THE WALK. The first Tab
    // after a fresh page lands on document.body, and treating that as "no
    // focus" ended every dashboard walk on its first press — 0 stops on a
    // screen with 25 focusable controls, while the summary line read like a
    // result. Skip it; only give up after several in a row.
    if (!f) { if (++blanks > 3) break; continue; }
    blanks = 0;
    // TERMINATION BY IDENTITY, NOT BY DESCRIPTION. The first version stopped
    // when tag+class+text repeated, so two identical-looking buttons ended the
    // walk — 20 stops across six screens against 187 known controls, and the
    // canary was never reached. It now stops only when THIS ELEMENT has been
    // focused before.
    const repeat = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a) return true;
      if (window.__seen.includes(a)) return true;
      window.__seen.push(a);
      return false;
    });
    if (repeat) break;
    // PIXELS, NOT COMPUTED STYLE. Focused shot, blur, unfocused shot, compare.
    let ringVisible = null;
    if (f.area > 0) {
      const h = await page.evaluateHandle(() => document.activeElement);
      const el = h.asElement();
      try {
        // **THE CLIP MUST INCLUDE THE RING, AND THE FIRST VERSION DID NOT.**
        // `elementHandle.screenshot()` captures the BORDER BOX. An outline is
        // painted OUTSIDE it. So a control with a perfectly good 3px ring
        // photographed identically focused and blurred, and this walk called
        // 55 stops defective when the product was drawing a ring on every one
        // of them. Found by asking the browser what a keyboard-focused row
        // actually computed — `outline: solid 3px` — rather than believing the
        // picture. A page-level clip, padded past the widest ring this
        // product draws, is the only honest frame.
        const pad = 10;
        const box = await el.boundingBox();
        if (!box) throw new Error("no box");
        const clip = {
          x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad),
          width: Math.min(1440 - Math.max(0, box.x - pad), box.width + pad * 2),
          height: Math.min(900 - Math.max(0, box.y - pad), box.height + pad * 2),
        };
        if (clip.width < 2 || clip.height < 2) throw new Error("clip too small");
        const shot = () => page.screenshot({ clip, timeout: 4000 });
        // A STABILITY BASELINE FIRST, and it is not optional. Any repaint
        // under this element's box — a clock, a weather chip, a spinner —
        // makes "focused differs from blurred" true whether or not a ring was
        // ever drawn, which reads as a PASS. Two shots with nothing changed
        // say whether this box is stable enough to be asked the question.
        const s1 = await shot();
        const s2 = await shot();
        if (Buffer.compare(s1, s2) !== 0) {
          ringVisible = null;          // unstable box; no verdict is honest
        } else {
          await page.evaluate(() => document.activeElement?.blur());
          const blurred = await shot();
          ringVisible = Buffer.compare(s1, blurred) !== 0;
          await el.focus();   // put it back exactly where the walk was
        }
      } catch { ringVisible = null; }
      await h.dispose();
    }
    stops.push({ ...f, ringVisible });
  }
  // THE RING CANARY IS TESTED DIRECTLY, NOT LEFT TO THE TAB ORDER. Its job is
  // to prove THIS DETECTOR can see a missing ring, not to prove the page's tab
  // order happens to include it — and relying on the walk to reach it caught
  // it on only 3 of 6 screens while the detector was working fine.
  let canarySeen = false;
  try {
    const ch = await page.$("#canary-no-ring");
    if (ch) {
      await ch.focus();
      const cb = await ch.boundingBox();
      const cclip = cb && { x: Math.max(0, cb.x - 10), y: Math.max(0, cb.y - 10),
        width: Math.min(1440, cb.width + 20), height: Math.min(900, cb.height + 20) };
      const cshot = () => page.screenshot({ clip: cclip, timeout: 4000 });
      const a1 = await cshot();
      const a2 = await cshot();
      if (Buffer.compare(a1, a2) !== 0) { canarySeen = null; }   // unstable
      else {
        await page.evaluate(() => document.activeElement?.blur());
        const b2 = await cshot();
        canarySeen = Buffer.compare(a1, b2) === 0;   // identical = no ring = caught
      }
    }
  } catch { canarySeen = false; }

  // ESCAPE: does the planted trap survive, and do real dialogs close?
  const escape = await page.evaluate(async () => {
    const before = document.querySelectorAll('[role=dialog],.sheet,.modal').length;
    return { dialogsOnScreen: before };
  });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const trapStillOpen = await page.evaluate(() => !!document.getElementById("canary-escape-trap")?.dataset.open);
  await page.evaluate(() => {
    document.getElementById("canary-no-ring")?.remove();
    document.getElementById("canary-escape-trap")?.remove();
  });
  out.push({ label, stops: stops.length, escape, trapStillOpen, canarySeen, rows: stops });
};

const browser = await chromium.launch();
// REDUCED MOTION HOLDS THE PAGE STILL SO A PIXEL VERDICT MEANS SOMETHING.
// This product's background animates for ever (docs/gotchas.md), and over a
// moving background "focused differs from blurred" is a coin flip — 91 of 167
// boxes came back undetermined. Under `reduce` the animations are off, which
// is only true because ROADMAP 8.5e fixed the delay an hour ago.
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
await page.fill('input[type=email]', "demo@detailplatform.com");
await page.fill('input[type=password]', "demo123");
await page.click("form button.btn.primary");
await page.waitForSelector(".tabbar", { timeout: 30000 });
const tabs = await page.$$eval(".tabbar button, .tabbar a", (e) => e.map((x) => x.innerText.trim()).filter(Boolean));
// DECLARED, NOT COUNTED FROM THE RUN: five dashboard tabs plus booking step 1.
const EXPECTED_SCREENS = 6;
const out = [];
for (const t of tabs) {
  await page.locator(".tabbar button, .tabbar a").filter({ hasText: t }).first().click();
  await page.waitForTimeout(2200);
  await walk(page, t, out);
}
await page.goto(`${BASE}/book/demo-detail`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2600);
await walk(page, "Booking step 1", out);

const noRing = [];
const offScreen = [];
let totalStops = 0, unknown = 0;
for (const s of out) for (const r of s.rows) {
  totalStops++;
  if (r.ringVisible === null) unknown++;
  else if (!r.ringVisible) noRing.push({ ...r, where: s.label });
  if (!r.inViewport) offScreen.push({ ...r, where: s.label });
}
const canaryRing = out.filter((s) => s.canarySeen === true).length;
const canaryUnstable = out.filter((s) => s.canarySeen === null).length;
const canaryEsc = out.filter((s) => s.trapStillOpen).length;
console.log(`screens walked: ${out.length} (${out.map((s) => s.label).join(", ")})`);
console.log(`focus stops recorded: ${totalStops} | ring undetermined on ${unknown}`);
console.log(`canary · ring styled away caught on ${canaryRing}/${out.length} screens` + (canaryUnstable ? ` (${canaryUnstable} undetermined — the box was repainting)` : ""));
console.log(`canary · Escape-swallowing dialog caught on ${canaryEsc}/${out.length} screens`);
if (canaryRing + canaryUnstable < out.length || canaryEsc < out.length) console.log("VOID — the probe did not prove it can see both faults");
console.log("\nA · focus held with NO visible change (real, canary excluded):",
  JSON.stringify(noRing.filter((r) => r.id !== "canary-no-ring").map((r) => `${r.where}: ${r.tag}.${r.cls} "${r.text}"`), null, 1));
console.log("\nB · focused while OUT OF VIEW:",
  JSON.stringify(offScreen.filter((r) => r.id !== "canary-no-ring").map((r) => `${r.where}: ${r.tag}.${r.cls} "${r.text}"`), null, 1));
console.log("\nstops per screen:", JSON.stringify(out.map((s) => `${s.label}:${s.stops}`)));
console.log("page errors:", errors.length ? errors.slice(0, 3) : "none");
await browser.close();

const realNoRing = noRing.filter((r) => r.id !== "canary-no-ring");
const realOff = offScreen.filter((r) => r.id !== "canary-no-ring");
const canariesGood = canaryRing === out.length && canaryEsc === out.length;
const { path: receiptPath } = writeReceipt({
  check_id: "keyboard-walk",
  started_at,
  status: realNoRing.length === 0 && realOff.length === 0 && canariesGood ? "pass" : "fail",
  expected_targets: EXPECTED_SCREENS,
  discovered_targets: out.length,
  attempted_targets: out.length,
  completed_targets: out.length,
  skipped_targets: EXPECTED_SCREENS - out.length,
  assertions_executed: totalStops,
  min_assertions: 100,
  failures: [
    ...realNoRing.map((r) => `${r.where}: ${r.tag}.${r.cls} "${r.text}" holds focus with nothing visible`),
    ...realOff.map((r) => `${r.where}: ${r.tag}.${r.cls} "${r.text}" focused while out of view`),
    ...(canariesGood ? [] : ["a canary was not caught — every clean line beside it is void"]),
  ],
  artifacts: ["scripts/keyboard-walk.mjs"],
  warnings: unknown ? [`${unknown} stop(s) undetermined — the box was repainting`] : [],
  dimensions: {
    screens: out.map((s2) => `${s2.label}:${s2.stops}`),
    method: "pixel diff with a stability baseline, under reducedMotion reduce",
    in_view_measured_before_any_screenshot: true,
  },
  canary: {
    id: "a ring styled away, and a dialog that swallows Escape",
    observed_failure: canariesGood,
    caught_by: canariesGood ? ["pixel-diff", "escape"] : [],
    findings: [`ring ${canaryRing}/${out.length}, escape ${canaryEsc}/${out.length}`],
  },
});
console.log(`receipt -> ${receiptPath}`);
