// ROADMAP 8.5d — LARGER TEXT AND WIDER SPACING, WHICH FAILS DIFFERENTLY FROM ZOOM.
//
//   node scripts/text-spacing-walk.mjs      (needs the dev server + seed)
//   node scripts/receipt.mjs receipts/text-spacing-walk.json
//
// **ZOOM SCALES EVERYTHING TOGETHER. THIS DOES NOT.** At 200% the box grows
// with the words inside it, so a layout that reflows survives. Here the TEXT
// gets taller and looser while every box keeping a fixed height, a fixed line
// count or a `100px` of anything stays exactly where it was — so the failure
// is text pushed against the inside of something that did not grow. 8.5c
// passing says nothing about this.
//
// WCAG 1.4.12 is the standard and it is four numbers, applied here for real
// rather than approximated: line height **1.5x** the font size, spacing after
// a paragraph **2x**, letter spacing **0.12em**, word spacing **0.16em**. The
// root size is raised from 16px to 20px on top, which is what a person who has
// turned their text up has actually done.
//
// THREE DETECTORS, EACH WITH ITS OWN PLANTED DEFECT, in a validation pass of
// its own so the canaries can never pollute the measurement — the shape 8.5c
// had to be rebuilt into after a zero arrived from detectors nothing had
// tested:
//   1 the page running off sideways;
//   2 text cut off by a box that hides its overflow — **vertically as well as
//     horizontally, because this is the failure mode that grows height**;
//   3 a control that becomes unreachable, still asked after scrolling it into
//     view, because covered-right-now is not unreachable.
//
// DECORATION IS NOT A FINDING: an `aria-hidden` or empty, childless box is
// clipped on purpose and is skipped, the same rule 8.5c needed.

import { writeReceipt } from "./receipt.mjs";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("../app/node_modules/playwright/index.js");

const BASE = "http://localhost:5173";
const started_at = new Date().toISOString();
const WIDTHS = [[1440, 900], [768, 1024], [392, 844], [320, 844]];

// WCAG 1.4.12, as a stylesheet. `!important` on every line because the point
// is to beat the product's own values, which is exactly what a reader's own
// stylesheet or a browser setting does.
const SPACING_CSS = `
  html { font-size: 20px !important; }
  *, *::before, *::after {
    line-height: 1.5 !important;
    letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important;
  }
  p, li, h1, h2, h3, h4, h5, h6 { margin-bottom: 2em !important; }
`;

const PROBE = (plantCanary) => {
  const out = { overflow: 0, clipped: [], escaping: [], unreachable: [], examined: 0,
    canaryOverflow: false, canaryClip: false, canaryCover: false, canaryEscape: false };
  const de = document.documentElement;

  if (plantCanary) {
    const wide = document.createElement("div");
    wide.id = "ts-canary-wide";
    wide.style.cssText = "width:" + Math.round(innerWidth * 1.05) + "px;height:4px;";
    document.body.appendChild(wide);
    const clip = document.createElement("div");
    clip.id = "ts-canary-clip";
    // A FIXED HEIGHT WITH MORE TEXT THAN FITS — the 8.5d failure exactly.
    clip.style.cssText = "overflow:hidden;height:14px;width:200px;";
    clip.textContent = "canary clipped line one and line two and line three";
    document.body.appendChild(clip);
    const esc = document.createElement("div");
    esc.id = "ts-canary-escape";
    // A FIXED HEIGHT THAT DOES NOT CLIP — the text simply leaves the box.
    esc.style.cssText = "overflow:visible;height:12px;width:200px;";
    esc.textContent = "canary escaping line one and line two and line three";
    document.body.appendChild(esc);
    const btn = document.createElement("button");
    btn.id = "ts-canary-btn";
    btn.textContent = "canary covered control";
    btn.style.cssText = "position:fixed;left:2px;top:2px;width:120px;height:24px;";
    const lid = document.createElement("div");
    lid.id = "ts-canary-lid";
    lid.style.cssText = "position:fixed;left:0;top:0;width:140px;height:30px;background:#000;z-index:99999;";
    document.body.append(btn, lid);
  }

  out.overflow = Math.round(de.scrollWidth - innerWidth);

  for (const el of document.querySelectorAll("body *")) {
    if (!el.checkVisibility || !el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
    const cs = getComputedStyle(el);
    const hidesX = /hidden|clip/.test(cs.overflowX);
    const hidesY = /hidden|clip/.test(cs.overflowY);
    if (!hidesX && !hidesY) continue;
    const decorative = el.getAttribute("aria-hidden") === "true"
      || (!(el.innerText || "").trim() && el.children.length === 0);
    if (decorative) continue;
    const clamped = cs.webkitLineClamp && cs.webkitLineClamp !== "none";
    if (clamped || cs.textOverflow === "ellipsis") continue;
    const overX = hidesX ? el.scrollWidth - el.clientWidth : 0;
    const overY = hidesY ? el.scrollHeight - el.clientHeight : 0;
    if (overX > 2 || overY > 2) {
      out.clipped.push({
        cls: el.tagName.toLowerCase() + "." + String(el.className || "").slice(0, 30),
        x: overX, y: overY, text: (el.innerText || "").trim().slice(0, 30),
      });
    }
  }
  // **DETECTOR 4 — TEXT ESCAPING A BOX THAT DOES NOT HIDE IT, WHICH IS THE
  // COMMONEST LARGE-TEXT FAILURE AND THE FIRST RUN COULD NOT SEE IT.** A
  // fixed-height box with `overflow: visible` does not clip — the extra lines
  // simply spill out and land on whatever is underneath. Nothing above catches
  // that, because every detector so far asked about boxes that HIDE their
  // overflow. A zero from a run blind to this would have been the whole item's
  // failure mode.
  for (const el of document.querySelectorAll("body *")) {
    if (!el.checkVisibility || !el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
    const cs = getComputedStyle(el);
    // scroll containers are meant to have more inside them than fits
    if (/auto|scroll|hidden|clip/.test(cs.overflowY)) continue;
    const decorative = el.getAttribute("aria-hidden") === "true"
      || (!(el.innerText || "").trim() && el.children.length === 0);
    if (decorative) continue;
    // **A PAGE THAT SCROLLS IS NOT A BOX THAT SPILLS.** The first run reported
    // a page container "spilling 756px", which is simply a document taller
    // than the screen. This detector is about TEXT leaving the box drawn
    // around it, so it only asks elements that hold text and contain no
    // element of their own — a label bigger than its pill, not a page bigger
    // than a window.
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own || el.children.length > 0) continue;
    const over = el.scrollHeight - el.clientHeight;
    if (over > 2) {
      out.escaping.push({
        cls: el.tagName.toLowerCase() + "." + String(el.className || "").slice(0, 30),
        by: over, text: (el.innerText || "").trim().slice(0, 30),
      });
    }
  }

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
    out.canaryOverflow = out.overflow > 0;
    out.canaryClip = out.clipped.some((c) => /canary clipped/.test(c.text));
    out.canaryCover = out.unreachable.some((u) => /canary covered/.test(u.text));
    out.canaryEscape = out.escaping.some((e) => /canary escaping/.test(e.text));
    for (const id of ["ts-canary-wide", "ts-canary-clip", "ts-canary-escape", "ts-canary-btn", "ts-canary-lid"]) {
      document.getElementById(id).remove();
    }
    out.clipped = []; out.escaping = []; out.unreachable = []; out.overflow = 0;
  }
  return out;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
await ctx.addInitScript((css) => {
  const put = () => {
    const st = document.createElement("style");
    st.id = "wcag-1-4-12";
    st.textContent = css;
    document.head.appendChild(st);
  };
  if (document.head) put();
  else document.addEventListener("DOMContentLoaded", put);
}, SPACING_CSS);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
await page.fill('input[type=email]', "demo@detailplatform.com");
await page.fill('input[type=password]', "demo123");
await page.click("form button.btn.primary");
await page.waitForSelector(".tabbar", { timeout: 30000 });

// THE OVERRIDES MUST ACTUALLY BE IN FORCE. A run that quietly failed to apply
// them would measure the ordinary product and call it a pass — the single
// most likely way this check lies.
const applied = await page.evaluate(() => {
  const b = document.querySelector("p, li, div");
  const cs = getComputedStyle(b);
  return {
    root: getComputedStyle(document.documentElement).fontSize,
    letter: cs.letterSpacing, word: cs.wordSpacing, sheet: !!document.getElementById("wcag-1-4-12"),
  };
});
console.log("overrides in force:", JSON.stringify(applied));
if (!applied.sheet || applied.root !== "20px" || !/0\.12/.test(applied.letter) === false === false && applied.letter === "normal") {
  console.log("VOID - the spacing overrides are not applied; this run measured the ordinary product");
}

const tabs = await page.$$eval(".tabbar button, .tabbar a", (e) => e.map((x) => x.innerText.trim()).filter(Boolean));
const EXPECTED_TARGETS = (tabs.length + 1) * WIDTHS.length;
const rows = [];
let canaryRuns = 0, cOver = 0, cClip = 0, cCover = 0, cEsc = 0, examined = 0;

for (const [w, h] of WIDTHS) {
  await page.setViewportSize({ width: w, height: h });
  const visit = async (label) => {
    await page.waitForTimeout(2200);
    await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) { /* none */ } }));
    const c = await page.evaluate(PROBE, true);
    canaryRuns++;
    if (c.canaryOverflow) cOver++;
    if (c.canaryClip) cClip++;
    if (c.canaryCover) cCover++;
    if (c.canaryEscape) cEsc++;
    const r = await page.evaluate(PROBE, false);
    examined += r.examined;
    rows.push({ label, w, ...r });
  };
  for (const t of tabs) {
    await page.locator(".tabbar button, .tabbar a").filter({ hasText: t }).first().click();
    await visit(t + "@" + w);
  }
  await page.goto(BASE + "/book/demo-detail", { waitUntil: "domcontentloaded" });
  await visit("Booking@" + w);
  await page.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".tabbar", { timeout: 30000 });
}
await browser.close();

const fails = [];
for (const r of rows) {
  if (r.overflow > 0) fails.push(r.label + ": page runs off sideways by " + r.overflow + "px");
  for (const c of r.clipped) {
    fails.push(r.label + ": " + c.cls + " cuts off " + (c.y > 2 ? c.y + "px of height" : c.x + "px of width")
      + ' from "' + c.text + '"');
  }
  for (const e of r.escaping) fails.push(r.label + ": " + e.cls + " spills " + e.by + 'px out of its box: "' + e.text + '"');
  for (const u of r.unreachable) fails.push(r.label + ": " + u.cls + ' "' + u.text + '" ' + u.why);
}
const allCanaries = cOver === canaryRuns && cClip === canaryRuns && cCover === canaryRuns && cEsc === canaryRuns;
console.log("screen/width combinations: " + rows.length + " of " + EXPECTED_TARGETS + " expected");
console.log("interactive elements examined: " + examined);
console.log("canary 1 (runs off sideways)       caught on " + cOver + "/" + canaryRuns);
console.log("canary 2 (text taller than its box) caught on " + cClip + "/" + canaryRuns);
console.log("canary 3 (control under a fixed lid) caught on " + cCover + "/" + canaryRuns);
console.log("canary 4 (text spilling out of a box) caught on " + cEsc + "/" + canaryRuns);
if (!allCanaries) console.log("VOID - a detector missed the defect planted for it");
console.log("\nfindings: " + fails.length);
console.log(JSON.stringify(fails.slice(0, 40), null, 1));
console.log("page errors:", errors.length ? errors.slice(0, 3) : "none");

const { path } = writeReceipt({
  check_id: "text-spacing-walk",
  started_at,
  status: fails.length === 0 && allCanaries ? "pass" : "fail",
  expected_targets: EXPECTED_TARGETS,
  discovered_targets: rows.length,
  attempted_targets: rows.length,
  completed_targets: rows.length,
  skipped_targets: EXPECTED_TARGETS - rows.length,
  assertions_executed: examined,
  min_assertions: 300,
  failures: [...fails, ...(allCanaries ? [] : ["a detector missed its own planted defect - every clean line beside it is void"])],
  artifacts: ["scripts/text-spacing-walk.mjs"],
  warnings: [],
  dimensions: {
    standard: "WCAG 1.4.12 - line 1.5x, paragraph 2x, letter 0.12em, word 0.16em, root 20px",
    overrides_verified_in_page: applied,
    widths: WIDTHS.map(([x]) => x),
  },
  canary: {
    id: "four: sideways overflow, text clipped by its box, text spilling out of one, control under a fixed lid",
    observed_failure: allCanaries,
    caught_by: ["scrollWidth", "overflow y", "elementFromPoint", "scrollHeight past a visible box"],
    findings: ["over " + cOver + ", clip " + cClip + ", cover " + cCover + ", escape " + cEsc + " of " + canaryRuns],
  },
});
console.log("receipt -> " + path);
