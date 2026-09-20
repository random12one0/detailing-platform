// ROADMAP 8.5c — WHAT THIS PRODUCT DOES AT 200% ZOOM.
//
//   node scripts/zoom-walk.mjs        (needs the dev server + seed)
//   node scripts/receipt.mjs receipts/zoom-walk.json
//
// **200% is the setting a person reaches for before they reach for a screen
// reader**, so it is measured rather than assumed. WCAG 1.4.4 asks for 200%
// without loss of content or function; 1.4.10 asks for reflow at 320 CSS px.
//
// HOW ZOOM IS EMULATED, AND WHY NOT WITH A SCALE FACTOR. Browser zoom makes a
// CSS pixel physically bigger, so a 1440px window at 200% lays out as a 720
// CSS px viewport on a 2x device. That is exactly `viewport: 720` with
// `deviceScaleFactor: 2` — same layout, same reflow, same media queries as a
// person pressing Ctrl and plus. `Emulation.setPageScaleFactor` is PINCH zoom,
// which does not reflow at all, and would have measured nothing.
//
// **THE SUB-320 WIDTHS ARE REPORTED SEPARATELY, DECLARED UP FRONT.** 392 at
// 200% is 196 CSS px and 320 is 160 — both below this product's stated 320px
// floor (CLAUDE.md). Findings there are outside the supported range, so they
// are printed and never counted as defects. The supported question is the two
// desk widths, which land on 720 and 384.
//
// THE CANARY IS THE SHAPE ASKED FOR: an element sized to overflow ONLY under
// zoom — 1.05x the zoomed viewport, which fits comfortably unzoomed. A run
// that does not report it saw nothing, and says VOID rather than clean.

import { writeReceipt } from "./receipt.mjs";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("../app/node_modules/playwright/index.js");

const BASE = "http://localhost:5173";
const started_at = new Date().toISOString();
const WIDTHS = [[1440, 900], [768, 1024], [392, 844], [320, 844]];
const SUPPORTED_FLOOR = 320;

const PROBE = (plantCanary) => {
  const out = { overflow: 0, clipped: [], unreachable: [], canaryCaught: false, examined: 0 };
  const de = document.documentElement;
  // **ONE CANARY PER DETECTOR, because this run has THREE and the first
  // version only proved one of them.** The overflow canary said 24/24 while
  // the clipped and covered detectors had just been tightened from 28
  // findings to 0 — and a zero from a detector nothing has tested is the
  // thing this whole repo is about. So: an element that overflows only under
  // zoom; a box with real text clipped sideways; and a control under a FIXED
  // overlay that scrolling cannot clear.
  if (plantCanary) {
    const clip = document.createElement("div");
    clip.id = "zoom-canary-clip";
    clip.style.cssText = "overflow-x:hidden;width:60px;white-space:nowrap;";
    clip.textContent = "canary clipped text that is far wider than sixty pixels";
    document.body.appendChild(clip);
    const wrap = document.createElement("div");
    wrap.id = "zoom-canary-cover";
    wrap.style.cssText = "position:relative;height:40px;";
    const btn = document.createElement("button");
    btn.id = "zoom-canary-btn";
    btn.textContent = "canary covered control";
    btn.style.cssText = "position:fixed;left:2px;top:2px;width:120px;height:24px;";
    const lid = document.createElement("div");
    lid.style.cssText = "position:fixed;left:0;top:0;width:140px;height:30px;background:#000;z-index:99999;";
    wrap.append(btn, lid);
    document.body.appendChild(wrap);
  }
  if (plantCanary) {
    const c = document.createElement("div");
    c.id = "zoom-canary";
    c.style.cssText = "width:" + Math.round(innerWidth * 1.05) + "px;height:4px;background:transparent;";
    document.body.appendChild(c);
  }

  out.overflow = Math.round(de.scrollWidth - innerWidth);
  // CONTENT CUT OFF BY A BOX THAT HIDES ITS OVERFLOW. Text clamped on purpose
  // says so with a line clamp or an ellipsis; anything else losing content
  // sideways at this size is losing it.
  for (const el of document.querySelectorAll("body *")) {
    if (!el.checkVisibility || !el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
    const cs = getComputedStyle(el);
    if (!/hidden|clip/.test(cs.overflowX)) continue;
    const over = el.scrollWidth - el.clientWidth;
    const clamped = cs.webkitLineClamp && cs.webkitLineClamp !== "none";
    // **DECORATION IS CLIPPED ON PURPOSE AND IS NOT A FINDING.** The first run
    // reported `div.app-dots` cutting off 96px on four screens; it is
    // `aria-hidden="true"`, empty, childless — a background layer whose whole
    // job is to be clipped. A probe that cannot tell decoration from content
    // reports the product's intentions back at it as defects.
    const decorative = el.getAttribute("aria-hidden") === "true"
      || (!el.innerText.trim() && el.children.length === 0);
    if (over > 2 && !clamped && !decorative && cs.textOverflow !== "ellipsis") {
      out.clipped.push({
        cls: el.tagName.toLowerCase() + "." + String(el.className || "").slice(0, 30),
        by: over, text: (el.innerText || "").trim().slice(0, 24),
      });
    }
  }
  // CONTROLS THAT STOPPED BEING USABLE: zero-sized, or with something painted
  // over their own centre — the question 8.5a learned to ask.
  for (const el of document.querySelectorAll("a[href],button,input,select,textarea,[tabindex]")) {
    if (!el.checkVisibility || !el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
    out.examined++;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) {
      out.unreachable.push({ cls: el.tagName.toLowerCase() + "." + String(el.className || "").slice(0, 30), why: "zero size", text: "" });
      continue;
    }
    const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
    if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue;
    let top = document.elementFromPoint(cx, cy);
    let covered = top && top !== el && !el.contains(top) && !top.contains(el);
    // **COVERED RIGHT NOW IS NOT UNREACHABLE.** The first run reported five
    // calendar cells "covered by button." — the Today button in the pinned
    // action bar — on a page that scrolls. A person scrolls and the cell comes
    // out from under it. So a candidate is scrolled into view (which honours
    // the `scroll-padding-bottom` ROADMAP 8.5a added) and asked again; only a
    // control still covered after that is genuinely out of reach.
    if (covered) {
      el.scrollIntoView({ block: "center", inline: "nearest" });
      const r2 = el.getBoundingClientRect();
      const cx2 = Math.round(r2.left + r2.width / 2), cy2 = Math.round(r2.top + r2.height / 2);
      if (cx2 >= 0 && cy2 >= 0 && cx2 <= innerWidth && cy2 <= innerHeight) {
        top = document.elementFromPoint(cx2, cy2);
        covered = top && top !== el && !el.contains(top) && !top.contains(el);
      }
    }
    if (covered) {
      out.unreachable.push({
        cls: el.tagName.toLowerCase() + "." + String(el.className || "").slice(0, 30),
        why: "covered by " + top.tagName.toLowerCase() + "." + String(top.className || "").slice(0, 20),
        text: (el.innerText || "").trim().slice(0, 20),
      });
    }
  }
  if (plantCanary) {
    out.canaryCaught = out.overflow > 0;
    out.canaryClip = out.clipped.some((c) => /canary clipped/.test(c.text));
    out.canaryCover = out.unreachable.some((u) => /canary covered/.test(u.text));
    document.getElementById("zoom-canary").remove();
    document.getElementById("zoom-canary-clip").remove();
    document.getElementById("zoom-canary-cover").remove();
    out.clipped = []; out.unreachable = []; out.overflow = 0;
  }
  return out;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 720, height: 450 }, deviceScaleFactor: 2, reducedMotion: "reduce",
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
await page.fill('input[type=email]', "demo@detailplatform.com");
await page.fill('input[type=password]', "demo123");
await page.click("form button.btn.primary");
await page.waitForSelector(".tabbar", { timeout: 30000 });
const tabs = await page.$$eval(".tabbar button, .tabbar a", (e) => e.map((x) => x.innerText.trim()).filter(Boolean));

// **THE FLOOR IS DECLARED, NOT COUNTED OFF THE PAGE — 2026-09-20.** This read
// `tabs.length`, so a tab bar that rendered four buttons instead of five
// lowered the expectation to match and the run still agreed with itself. That
// is a gate that follows the data, which `docs/gotchas.md` already names.
// `contrast-insitu.mjs` has declared this floor as a constant all along.
const TAB_COUNT_EXPECTED = 5;
if (tabs.length !== TAB_COUNT_EXPECTED) {
  console.log(`tab bar has ${tabs.length} tabs, this check expects ${TAB_COUNT_EXPECTED}`);
}
const EXPECTED_TARGETS = (TAB_COUNT_EXPECTED + 1) * WIDTHS.length;
// Every label this run owes, built from the same rule the walk uses below.
const EXPECTED_LABELS = [];
for (const [phys] of WIDTHS) {
  const css = Math.round(phys / 2);
  for (const t of tabs) EXPECTED_LABELS.push(t + "@" + phys + "->" + css + "css");
  EXPECTED_LABELS.push("Booking@" + phys + "->" + css + "css");
}
const rows = [];
let canaryRuns = 0, canaryCaught = 0, examined = 0, clipCaught = 0, coverCaught = 0;

for (const [phys, physH] of WIDTHS) {
  const css = Math.round(phys / 2), cssH = Math.round(physH / 2);
  await page.setViewportSize({ width: css, height: cssH });
  const supported = css >= SUPPORTED_FLOOR;
  const visit = async (label) => {
    await page.waitForTimeout(2200);
    await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) { /* none */ } }));
    const canary = await page.evaluate(PROBE, true);
    canaryRuns++;
    if (canary.canaryCaught) canaryCaught++;
    if (canary.canaryClip) clipCaught++;
    if (canary.canaryCover) coverCaught++;
    const r = await page.evaluate(PROBE, false);
    examined += r.examined;
    rows.push({ label, phys, css, supported, ...r });
  };
  for (const t of tabs) {
    await page.locator(".tabbar button, .tabbar a").filter({ hasText: t }).first().click();
    await visit(t + "@" + phys + "->" + css + "css");
  }
  await page.goto(BASE + "/book/demo-detail", { waitUntil: "domcontentloaded" });
  await visit("Booking@" + phys + "->" + css + "css");
  await page.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".tabbar", { timeout: 30000 });
}
await browser.close();

const sup = rows.filter((r) => r.supported);
const unsup = rows.filter((r) => !r.supported);
const fails = [];
for (const r of sup) {
  if (r.overflow > 0) fails.push(r.label + ": page scrolls sideways by " + r.overflow + "px");
  for (const c of r.clipped) fails.push(r.label + ": " + c.cls + " cuts off " + c.by + 'px of "' + c.text + '"');
  for (const u of r.unreachable) fails.push(r.label + ": " + u.cls + ' "' + u.text + '" ' + u.why);
}
console.log("screen/width combinations: " + rows.length + " of " + EXPECTED_TARGETS + " expected");
console.log("interactive elements examined: " + examined);
console.log("canary 1 (overflows only under zoom) caught on " + canaryCaught + "/" + canaryRuns + " runs");
console.log("canary 2 (text clipped sideways)       caught on " + clipCaught + "/" + canaryRuns + " runs");
console.log("canary 3 (control under a fixed lid)   caught on " + coverCaught + "/" + canaryRuns + " runs");
const allCanaries = canaryCaught === canaryRuns && clipCaught === canaryRuns && coverCaught === canaryRuns;
if (!allCanaries) console.log("VOID - a detector failed to catch the defect planted for it");
console.log("\nSUPPORTED (>=" + SUPPORTED_FLOOR + " CSS px after zoom): " + sup.length + " combinations, " + fails.length + " finding(s)");
console.log(JSON.stringify(fails, null, 1));
console.log("\nBELOW THE SUPPORTED FLOOR, printed not counted:", JSON.stringify(
  unsup.map((r) => r.label + ": overflow " + r.overflow + "px, " + r.clipped.length + " clipped, " + r.unreachable.length + " unreachable"), null, 1));
console.log("page errors:", errors.length ? errors.slice(0, 3) : "none");


// **A SHORTFALL WITH NO NAMES IS A SKIP WITH NO PROOF, ONE LEVEL DOWN —
// 2026-09-20, ROADMAP 14.11.** `skipped_targets` here is arithmetic:
// expected minus measured. The number is refusable — when it goes positive
// the four counts stop agreeing and `receipt.mjs` fails the receipt twice
// over — but it cannot say WHICH target vanished, or whether this run
// DECLINED it or FAILED on it. Those are different facts and a bare integer
// makes them identical. So the missing labels are named, and the line says
// plainly that nothing here explains them.
//
// `SHORTFALL_CANARY=1` drops one measured target on purpose, which is how
// this line is known to fire rather than assumed to.
const nameTheShortfall = (expectedLabels, measuredLabels, what) => {
  const have = new Set(measuredLabels);
  const missing = expectedLabels.filter((l) => !have.has(l));
  if (!missing.length) {
    console.log(`\ncoverage: all ${expectedLabels.length} ${what} were measured — nothing was skipped, declined or lost`);
    return [];
  }
  console.log(`\nSHORTFALL — ${missing.length} of ${expectedLabels.length} ${what} were never measured, `
    + `and NOTHING HERE SAYS WHY. This is not a declared skip: no probe refused these and no`);
  console.log(`  reason was recorded. Treat them as unmeasured, never as clean:`);
  for (const l of missing) console.log(`    NEVER REACHED  ${l}`);
  return missing;
};
// **THE CANARY DROPS A REAL ROW, NOT A LABEL.** The first version sliced the
// label list only, so `rows.length` never moved: the naming line printed, the
// four counts still agreed, `skipped_targets` stayed 0 and the receipt passed.
// It proved the PRINTER and nothing downstream of it, which is the exact
// shape of canary this repo keeps catching. Dropping the row exercises the
// whole chain — the line, the count, the receipt's verdict.
if (process.env.SHORTFALL_CANARY === "1") rows.pop();
const missingLabels = nameTheShortfall(EXPECTED_LABELS, rows.map((r) => r.label), "screen/width combinations");

const { path } = writeReceipt({
  check_id: "zoom-walk",
  started_at,
  // **A SHORTFALL IS PART OF THE VERDICT, NOT A FOOTNOTE.** Without
  // `missingLabels` here the sabotaged run wrote `status: "pass"` while
  // carrying a recorded failure, and only `receipt.mjs` noticed the
  // contradiction. A check that grades itself pass while listing a failure is
  // the same defect as a skip with no proof, wearing the verdict field.
  status: fails.length === 0 && allCanaries && missingLabels.length === 0 ? "pass" : "fail",
  expected_targets: EXPECTED_TARGETS,
  discovered_targets: rows.length,
  attempted_targets: rows.length,
  completed_targets: rows.length,
  skipped_targets: EXPECTED_TARGETS - rows.length,
  assertions_executed: examined,
  min_assertions: 300,
  failures: [...fails,
    ...(allCanaries ? [] : ["a detector missed its own planted defect - every clean line beside it is void"]),
    // A target nobody reached is not a clean target. It goes in `failures` so
    // the receipt's own status says so, rather than resting on the reader
    // noticing that two counts differ by one.
    ...missingLabels.map((l) => "NEVER REACHED, no reason recorded: " + l)],
  artifacts: ["scripts/zoom-walk.mjs"],
  warnings: [
    ...(unsup.length ? [unsup.length + " combination(s) below the " + SUPPORTED_FLOOR + "px floor printed but not counted"] : []),
    ...(missingLabels.length ? ["NEVER REACHED, no reason recorded: " + missingLabels.join(", ")] : []),
  ],
  dimensions: {
    zoom: "200% as viewport/2 at deviceScaleFactor 2",
    widths: WIDTHS.map(([p]) => p + "->" + Math.round(p / 2) + "css"),
    supported_floor_css_px: SUPPORTED_FLOOR,
  },
  canary: {
    id: "three: overflow under zoom, text clipped sideways, control under a fixed lid",
    observed_failure: allCanaries,
    caught_by: ["document scrollWidth"],
    findings: ["overflow " + canaryCaught + "/" + canaryRuns + ", clip " + clipCaught + "/" + canaryRuns + ", cover " + coverCaught + "/" + canaryRuns],
  },
});
console.log("receipt -> " + path);
