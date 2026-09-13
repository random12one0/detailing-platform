// WHAT A REAL PHONE SEES — the instrument every other sweep in this repo is
// blind to. Written 2026-09-13 after Andrew opened the dashboard on his own
// iPhone 15 Pro Max and found four faults that every green run had missed.
//
// WHY THE OLD SWEEP COULD NOT SEE ANY OF THEM. `sweep-widths.mjs` sets a
// viewport and asks about the RIGHT-HAND edge of things — its own header says
// "this script cannot see a bottom-edge failure at any size". Three further
// facts about a real handset are missing from that picture and each one hides
// a whole class of fault:
//
//   1. THE SAFE-AREA INSETS ARE ZERO IN A HEADLESS BROWSER.
//      `env(safe-area-inset-top)` reports 0px here and 59px on his phone; the
//      bottom is 0 here and 34px there. Every rule in this product that spends
//      an inset was therefore measured at zero and signed off. `theme.css`
//      § THE PHONE'S OWN EDGES names both as `--safe-t` / `--safe-b` precisely
//      so this file can set them, and the fallback is still `env()`, so
//      nothing changes on a device.
//   2. THE VISIBLE HEIGHT IS NOT THE LAYOUT HEIGHT, AND IT MOVES MID-SCROLL.
//      iOS Safari's address bar retracts as you scroll down and comes back as
//      you scroll up, so the same page is 739px tall and then 830px tall
//      within one flick. `window.innerHeight` is the LAYOUT viewport and does
//      not move; `window.visualViewport.height` is what a person can see.
//      Everything below measures against the visual viewport.
//   3. THE SAME PAGE HAS THREE HEIGHTS, NOT ONE. Installed to the home screen
//      there is no browser chrome at all. So three states are swept, not one.
//
// THE SEVEN CHECKS, one per way a phone loses something:
//
//   bar-overlap    page content whose box is underneath the floating tab bar.
//      *** THIS IS THE ONE THAT MATTERS. *** Confirmed on a real 15 Pro Max
//      simulator, 2026-09-13: a whole customer row on Clients — name, amount,
//      phone number — reads clearly THROUGH the bar, and Business does the
//      same. The bar is translucent, so this is not a press problem first, it
//      is a LEGIBILITY problem: the page has no clearance reserved under it.
//   under-bar      a CONTROL the bar is sitting on top of, measured with
//      elementFromPoint rather than a rect — CLAUDE.md § (n): two rects
//      overlapping is not proof a press is stolen, and two apart is not proof
//      it is not.
//   tab-hit        every tab button's own centre, and four points 10px out
//      from it, must return that button. Andrew's third complaint word for
//      word — "I'd be clicking underneath the tab switcher onto something
//      along the page" — probed at three scroll positions, because a fixed
//      element whose hit region lags its paint only misses while moving.
//   bar-onscreen   the bar's own box must be inside the VISIBLE height. His
//      second complaint: "the tab switcher was hidden underneath the actual
//      address search bar".
//   cut-off        an element with words or a control in it whose bottom edge
//      is below the visible height after the page has been scrolled as far as
//      it goes — content that exists and cannot be reached.
//   notch          a control under the Dynamic Island at rest.
//   indicator      a control under the home indicator at the foot of the
//      scroll.
//
// WHAT THIS CANNOT SEE, AND SAYS SO RATHER THAN PRETENDING: the address bar
// ACTUALLY MOVING. Chromium has no iOS chrome to retract, so the three states
// below are three separate runs at three fixed heights, not one continuous
// flick. A bar that is correct in all three can still judder on the way
// between them, and only Andrew's own handset can settle that.
//
// PROVE IT BEFORE YOU BELIEVE IT — `--baseline` injects one deliberate fault
// per check and fails if the check does not report it. This repo has shipped
// at least six checks that tested nothing; a green run from this one means
// nothing until that flag has been run.
//
//   node scripts/sweep-phone-viewport.mjs --baseline   # prove the instrument
//   node scripts/sweep-phone-viewport.mjs              # the real sweep
//   node scripts/sweep-phone-viewport.mjs --only money
//   node scripts/sweep-phone-viewport.mjs --flat       # insets forced to 0,
//                                                     # i.e. exactly what the
//                                                     # OLD instrument saw
//
// Needs the dev server on :5173 and the seeded demo business, same as
// sweep-widths.mjs. EXITS NON-ZERO on any finding.
import { createRequire } from "node:module";
import { reportSourceMoved, watchSource } from "./source-guard.mjs";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const changedSince = watchSource();
const BASE = process.env.BASE || "http://localhost:5173";
const BASELINE = process.argv.includes("--baseline");
const FLAT = process.argv.includes("--flat");
const ONLY = (() => { const i = process.argv.indexOf("--only"); return i > -1 ? process.argv[i + 1] : null; })();

// THE THREE STATES OF ANDREW'S OWN HANDSET, plus the smallest notched phone.
//
// The heights are the CSS viewport iOS Safari gives the page in each chrome
// state, not the hardware's pixel count: a 15 Pro Max is 430x932 CSS points,
// and Safari gives the page about 739 of those with the address bar expanded
// and about 830 with it retracted. Installed to the home screen the page gets
// all 932 and the insets do the work instead.
//
// `safeB` IS ZERO IN THE SMALL STATE ON PURPOSE. When Safari's address bar is
// expanded at the bottom of the screen it occupies the home-indicator strip
// itself, so iOS reports no bottom inset — which is exactly why a bar that
// offsets itself by that inset JUMPS as the chrome retracts. That jump is the
// fault, and a sweep using one inset for both states could not see it.
const STATES = [
  { id: "max-standalone", w: 430, h: 932, safeT: 59, safeB: 34, note: "15 Pro Max, added to home screen" },
  { id: "max-large", w: 430, h: 830, safeT: 59, safeB: 34, note: "15 Pro Max, Safari, address bar retracted" },
  { id: "max-small", w: 430, h: 739, safeT: 59, safeB: 0, note: "15 Pro Max, Safari, address bar expanded" },
  { id: "mini-small", w: 375, h: 629, safeT: 50, safeB: 0, note: "13 mini, Safari, address bar expanded" },
];

const TABS = [
  { key: "today", label: { en: "Today", es: "Hoy" } },
  { key: "calendar", label: { en: "Calendar", es: "Calendario" } },
  { key: "clients", label: { en: "Clients", es: "Clientes" } },
  { key: "money", label: { en: "Money", es: "Dinero" } },
  { key: "business", label: { en: "Business", es: "Negocio" } },
];
const LANGS = ["en", "es"];
const SCROLLS = ["top", "middle", "bottom"];

const settle = (page, ms) => page.waitForTimeout(ms);
const findings = [];
let probes = 0, screens = 0;
const add = (where, check, detail) => findings.push({ where, check, detail });

// ---------------------------------------------------------------- THE PROBE
// Runs in the page. Every question is asked of the VISUAL viewport, and every
// PRESS question is asked with elementFromPoint rather than a rect.
const PROBE = ({ safeT, safeB, pos }) => {
  const vv = window.visualViewport;
  const VH = vv ? vv.height : window.innerHeight;
  const VW = vv ? vv.width : window.innerWidth;
  const out = { VH, VW, layoutH: window.innerHeight, hits: [], counts: {} };
  const seen = (el) => (el && el.checkVisibility
    ? el.checkVisibility({ checkVisibilityCSS: true, contentVisibilityAuto: true })
    : !!el);
  const name = (el) => {
    if (!el) return "(nothing)";
    const cls = (el.className && typeof el.className === "string")
      ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    const txt = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 44);
    return `${el.tagName.toLowerCase()}${cls}${txt ? ` "${txt}"` : ""}`;
  };
  const controls = [...document.querySelectorAll("button, a[href], input, select, textarea, [role=button]")]
    .filter(seen)
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  out.counts.controls = controls.length;

  const bar = document.querySelector(".tabbar");
  const inBar = (el) => !!(el && bar && (el === bar || bar.contains(el)));

  // Page content: an element that renders its OWN words, or a control. The
  // ancestors that merely contain them are excluded, or every finding would
  // arrive six times wearing its parents' names.
  const contentEls = [...document.querySelectorAll("body *")].filter((el) => {
    if (!seen(el)) return false;
    if (inBar(el)) return false;
    const cs = getComputedStyle(el);
    if (cs.position === "fixed") return false;   // a fixed layer is not page content
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const isControl = /^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
    return ownText || isControl;
  });
  out.counts.contentEls = contentEls.length;

  // --- bar-onscreen ---------------------------------------------------
  if (bar) {
    const r = bar.getBoundingClientRect();
    out.bar = { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) };
    if (r.bottom > VH + 0.5) {
      out.hits.push({ check: "bar-onscreen", detail: `the tab bar's bottom edge is ${Math.round(r.bottom - VH)}px below the visible height (${Math.round(r.bottom)} against ${Math.round(VH)})` });
    }
    if (r.top < 0) out.hits.push({ check: "bar-onscreen", detail: `the tab bar's top edge is ${Math.round(-r.top)}px above the visible area` });
    if (safeB > 0 && r.bottom > VH - safeB + 0.5) {
      out.hits.push({ check: "bar-onscreen", detail: `the tab bar reaches ${Math.round(r.bottom - (VH - safeB))}px into the ${safeB}px home-indicator strip` });
    }
  } else { out.counts.noBar = 1; }

  // --- bar-overlap ----------------------------------------------------
  // AT THE FOOT OF THE SCROLL ONLY, and that scoping is the whole meaning of
  // the check. Content passing UNDER a floating bar on its way by is what a
  // floating bar is; content still under it when the page has run out is
  // clearance the page never reserved — Andrew's "cut off", and the simulator's
  // customer row reading through the glass. The first version of this file
  // asked at all three positions and reported several hundred findings, nearly
  // all of them scrolling working correctly.
  //
  // WHAT THIS CANNOT SEE, SAID PLAINLY: whether the words under the bar are
  // LEGIBLE through it. That is a paint question, not a geometry one, and it
  // is settled by looking at a screenshot — which is what found it.
  if (bar && pos === "bottom") {
    const b = bar.getBoundingClientRect();
    for (const el of contentEls) {
      const r = el.getBoundingClientRect();
      if (r.height === 0 || r.width === 0) continue;
      if (r.bottom <= b.top + 0.5 || r.top >= b.bottom - 0.5) continue;
      if (r.right <= b.left + 0.5 || r.left >= b.right - 0.5) continue;
      out.counts.overlapProbes = (out.counts.overlapProbes || 0) + 1;
      out.hits.push({ check: "bar-overlap", detail: `${name(el)} is underneath the tab bar` });
    }
  }

  // --- tab-hit ---------------------------------------------------------
  if (bar) {
    const btns = [...bar.querySelectorAll("button")];
    out.counts.tabButtons = btns.length;
    for (const b of btns) {
      const r = b.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      for (const [dx, dy] of [[0, 0], [-10, 0], [10, 0], [0, -10], [0, 10]]) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x > VW || y > VH) continue;
        out.counts.hitProbes = (out.counts.hitProbes || 0) + 1;
        const at = document.elementFromPoint(x, y);
        if (!(at === b || b.contains(at) || (at && at.closest && at.closest("button") === b))) {
          out.hits.push({ check: "tab-hit", detail: `a press at (${Math.round(x)}, ${Math.round(y)}) on the "${(b.textContent || "").trim()}" tab lands on ${name(at)}` });
        }
      }
    }
  }

  // --- under-bar --------------------------------------------------------
  // AT THE FOOT OF THE SCROLL ONLY, for the same reason as bar-overlap: a
  // floating bar taking the press over a control that is mid-scroll is the bar
  // working. A control the bar is still on top of when the page has run out is
  // a control nobody can ever press.
  for (const el of pos === "bottom" ? controls : []) {
    if (inBar(el)) continue;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > VW || cy > VH) continue;
    out.counts.coverProbes = (out.counts.coverProbes || 0) + 1;
    const at = document.elementFromPoint(cx, cy);
    if (inBar(at)) out.hits.push({ check: "under-bar", detail: `the tab bar takes the press meant for ${name(el)}` });
  }

  // --- notch / indicator ------------------------------------------------
  // EACH ONE ASKS ITS QUESTION AT EXACTLY ONE SCROLL POSITION, and the first
  // version of this file asked both at all three. That reported 27 "findings"
  // on one screen, every one of them a customer row scrolling PAST the notch,
  // which is what scrolling is. A control passing under the top of the screen
  // on its way by is not a fault; a control that SITS there is.
  //   notch      at rest at the top — is something under the Dynamic Island
  //              where nobody scrolls it clear.
  //   indicator  at the foot of the scroll — is content stuck under the home
  //              indicator with no more page left to move it.
  for (const el of controls) {
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > VH) continue;
    if (pos === "top" && safeT > 0 && r.top < safeT - 0.5 && r.bottom > 0) {
      out.hits.push({ check: "notch", detail: `${name(el)} reaches ${Math.round(safeT - r.top)}px into the ${safeT}px notch strip` });
    }
    if (pos === "bottom" && safeB > 0 && r.bottom > VH - safeB + 0.5 && r.top < VH && !inBar(el)) {
      out.hits.push({ check: "indicator", detail: `${name(el)} reaches ${Math.round(r.bottom - (VH - safeB))}px into the ${safeB}px home-indicator strip` });
    }
  }

  // --- cut-off ----------------------------------------------------------
  // Only meaningful at the foot of the scroll: anything still below the
  // visible height THERE is content nobody can reach.
  const atBottom = (window.scrollY + window.innerHeight) >= (document.documentElement.scrollHeight - 2);
  out.atBottom = atBottom;
  if (atBottom) {
    for (const el of contentEls) {
      const r = el.getBoundingClientRect();
      if (r.height === 0) continue;
      if (r.top >= VH - 0.5) out.hits.push({ check: "cut-off", detail: `${name(el)} starts ${Math.round(r.top - VH)}px below the last thing the screen can show` });
      else if (r.bottom > VH + 1) out.hits.push({ check: "cut-off", detail: `${name(el)} is clipped — ${Math.round(r.bottom - VH)}px of it is below the visible height` });
    }
  }
  return out;
};

// -------------------------------------------------------------- THE BASELINE
// One deliberate fault per check. If a check does not report its own fault,
// this instrument cannot see that class of failure and its green runs are
// worth nothing. `docs/START-HERE.md` § 4.
const BREAKS = {
  "bar-overlap": () => {
    const b = document.querySelector(".tabbar").getBoundingClientRect();
    const d = document.createElement("p");
    d.textContent = "deliberate bar-overlap probe";
    d.style.cssText = `position:absolute;z-index:1;left:${b.left + 10}px;top:${b.top + window.scrollY + 8}px;width:80px;height:20px;margin:0`;
    document.body.appendChild(d);
  },
  // INSIDE `.app-shell`, NOT ON `body`. The shell carries `isolation: isolate`
  // and the bar sits at z-index 40 INSIDE it; a probe appended to `body`
  // paints above the whole shell and wins the hit test, so the first version
  // of this break reported BLIND against a check that works.
  "under-bar": () => {
    const b = document.querySelector(".tabbar").getBoundingClientRect();
    const btn = document.createElement("button");
    btn.textContent = "deliberate under-bar probe";
    btn.style.cssText = `position:fixed;z-index:1;left:${b.left + 20}px;top:${b.top + 8}px;width:60px;height:30px`;
    document.querySelector(".app-shell").prepend(btn);
  },
  "tab-hit": () => {
    const b = document.querySelector(".tabbar").getBoundingClientRect();
    const d = document.createElement("div");
    d.className = "deliberate-tab-hit-probe";
    d.style.cssText = `position:fixed;z-index:99;left:${b.left}px;top:${b.top}px;width:${b.width}px;height:${b.height}px`;
    document.body.appendChild(d);
  },
  "bar-onscreen": () => { document.querySelector(".tabbar").style.bottom = "-80px"; },
  // CLIP THE PAGE, do not extend it. Appending an element below the fold makes
  // the document TALLER, so the next scroll-to-bottom reaches it and nothing
  // is cut off — the first version of this break was the fault not happening.
  // A real cut-off is content that exists where the page cannot scroll.
  "cut-off": () => {
    const h = window.innerHeight;
    for (const el of [document.documentElement, document.body]) {
      el.style.height = h + "px";
      el.style.overflow = "hidden";
    }
  },
  notch: () => {
    const btn = document.createElement("button");
    btn.textContent = "deliberate notch probe";
    btn.style.cssText = "position:fixed;z-index:1;left:10px;top:2px;width:60px;height:30px";
    document.body.appendChild(btn);
  },
  indicator: () => {
    const btn = document.createElement("button");
    btn.textContent = "deliberate indicator probe";
    btn.style.cssText = "position:fixed;z-index:1;left:10px;bottom:2px;width:60px;height:30px";
    document.body.appendChild(btn);
  },
};

// --------------------------------------------------------------------- RUN
const browser = await chromium.launch();
const scrollTo = (page, pos) => page.evaluate((p) => {
  const h = document.documentElement.scrollHeight;
  window.scrollTo(0, p === "top" ? 0 : p === "middle" ? Math.round(h / 2) : h);
}, pos);

const insetCss = (state) => `:root{--safe-t:${FLAT ? 0 : state.safeT}px;--safe-b:${FLAT ? 0 : state.safeB}px}`;

const openDash = async (state, lang) => {
  const ctx = await browser.newContext({
    viewport: { width: state.w, height: state.h },
    deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  });
  const page = await ctx.newPage();
  // THE DASHBOARD'S LANGUAGE IS `dp.lang.app` IN localStorage, NOT A QUERY
  // STRING. `?lang=es` is the BOOKING page's switch and does nothing here —
  // the first version of this script used it and sat waiting thirty seconds
  // for a tab called "Hoy" on a dashboard that was still in English.
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.evaluate((l) => { try { localStorage.setItem("dp.lang.app", l); } catch { /* private mode */ } }, lang);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 25000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", "demo@detailplatform.com");
    await page.fill("input[type=password]", "demo123");
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
  }
  // The tab guides swallow pointer events and would make every press probe
  // report the overlay. The fourth script to need this line.
  await page.evaluate(() => {
    try {
      localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"]));
      localStorage.setItem("dp.tour", "1");
    } catch { /* private mode */ }
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  // Set on the html element, so it beats the stylesheet's own :root rule.
  await page.addStyleTag({ content: insetCss(state) });
  await settle(page, 900);
  return { ctx, page };
};

if (BASELINE) {
  // One screen, one state. An instrument is proved, not surveyed.
  const state = STATES[1];
  const { ctx, page } = await openDash(state, "en");
  await page.getByRole("button", { name: "Clients", exact: true }).first().click();
  await settle(page, 1500);
  for (const [check, fn] of Object.entries(BREAKS)) {
    // EACH BREAK IS PROVED AT THE SCROLL POSITION ITS CHECK ASKS AT. `notch`
    // only fires at the top and `indicator` only at the foot, so a baseline
    // that measured everything at the foot reported BLIND against a check
    // that works — the instrument's instrument being wrong, which is the
    // whole reason this flag exists.
    const pos = check === "notch" ? "top" : "bottom";
    const args = { safeT: state.safeT, safeB: state.safeB, pos };
    await scrollTo(page, pos);
    await settle(page, 400);
    const before = await page.evaluate(PROBE, args);
    await page.evaluate(fn);
    await settle(page, 150);
    const after = await page.evaluate(PROBE, args);
    const got = after.hits.filter((h) => h.check === check).length
      - before.hits.filter((h) => h.check === check).length;
    console.log(`${got > 0 ? "SEES " : "BLIND"}  ${check}`);
    if (got <= 0) add("baseline", "BASELINE", `the "${check}" check did not report its own deliberate fault`);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".tabbar", { timeout: 30000 });
    await page.addStyleTag({ content: insetCss(state) });
    await page.getByRole("button", { name: "Clients", exact: true }).first().click();
    await settle(page, 1400);
  }
  await ctx.close();
  console.log(`\n${Object.keys(BREAKS).length} checks broken on purpose, ${findings.length} blind`);
} else {
  for (const state of STATES) {
    for (const lang of LANGS) {
      const { ctx, page } = await openDash(state, lang);
      for (const t of TABS) {
        if (ONLY && !t.key.includes(ONLY.toLowerCase())) continue;
        await page.getByRole("button", { name: t.label[lang], exact: true }).first().click();
        await settle(page, 1400);
        screens++;
        // THREE SCROLL POSITIONS. A fixed bar whose hit region lags its paint
        // only misses while the page is moving, so top alone proves nothing.
        for (const pos of SCROLLS) {
          await scrollTo(page, pos);
          await settle(page, 450);
          const r = await page.evaluate(PROBE, { safeT: FLAT ? 0 : state.safeT, safeB: FLAT ? 0 : state.safeB, pos });
          probes += (r.counts.hitProbes || 0) + (r.counts.coverProbes || 0);
          for (const h of r.hits) add(`${state.id}/${lang}/${t.key}/${pos}`, h.check, h.detail);
        }
      }
      await ctx.close();
    }
  }
}
await browser.close();

// ------------------------------------------------------------------ REPORT
// COUNT THE SUBJECTS, EVERY RUN. A sweep that walked nothing prints the same
// word as a sweep that walked everything.
if (!BASELINE) {
  console.log(`\n${screens} screens, ${STATES.length} device states, ${LANGS.length} languages, ${probes} press probes`
    + (FLAT ? "   [--flat: insets forced to 0 — this is what the OLD instrument could see]" : ""));
}
if (!findings.length) console.log("clean");
else {
  const by = {};
  for (const f of findings) (by[f.check] ||= []).push(f);
  for (const [check, list] of Object.entries(by)) {
    const seen = new Map();
    for (const f of list) seen.set(f.detail, seen.get(f.detail) || f.where);
    console.log(`\n${check} — ${list.length} findings, ${seen.size} distinct`);
    for (const [detail, where] of seen) console.log(`  ${where}  ${detail}`);
  }
}
await reportSourceMoved(changedSince, !findings.length);
process.exit(findings.length ? 1 : 0);
