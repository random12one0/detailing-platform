// CAN A CONTROL THAT COMES TO REST UNDER THE MARKETING PAGES' FIXED FURNITURE
// STILL BE PRESSED? — ROADMAP 9.11e, the marketing-surface third of it.
//
//   node scripts/marketing-furniture-clearance.mjs
//   node scripts/marketing-furniture-clearance.mjs --headed
//   node scripts/marketing-furniture-clearance.mjs --break=canary
//   node scripts/receipt.mjs receipts/marketing-furniture-clearance.json
//
// No credentials, no sign-in, no database writes: the marketing surface is
// signed-out. Dev server on :5173 (`BASE` overrides).
//
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS AND WHAT IT IS A COPY OF
// ---------------------------------------------------------------------------
// `tests/fixed-furniture-is-hit-tested.test.mjs` derives the population from
// the CSS on every run. Three of its nine declared gaps sit on screens no
// hit-testing check visits at all, and all three are the marketing surface:
//
//   .ld .nav          fixed, z-index 60 — the floating glass pill, over every
//                     page a stranger sees first (landing, pricing, legal)
//   .ld .navmenu.on   fixed, z-index 39 — the phone menu, which covers content
//                     ON PURPOSE when open (only draws at <=470px, where the
//                     burger replaces the links)
//   .ld .stage        sticky, top 0, 100vh — the landing page's pinned scroll
//                     stage, a whole viewport that stays
//
// It follows `scripts/tabbar-clearance.mjs` (the row-counting instrument) and
// `scripts/admin-furniture-clearance.mjs` (the top-furniture variant, because
// this furniture is at the TOP: `block: "start"` + focus, the only thing
// `scroll-padding` is honoured for).
//
// ---------------------------------------------------------------------------
// THREE THINGS THE FIRST DRY RUN TAUGHT, RECORDED SO THEY ARE NOT RELEARNED
// ---------------------------------------------------------------------------
// - `.ld .nav.hid` (translate the pill away on scroll) is DEAD: no JS anywhere
//   in `app/src` applies the class. The nav is always on screen, so a control
//   measured under it is a real overlap, not a state the product leaves.
// - `.lite .ld .stage` is `position: static`: the reduced-motion path has no
//   pinned stage. This run measures the default path; the lite exception is
//   recorded in the receipt, not measured twice.
// - The open menu covers page content ON PURPOSE, the way a modal does. Page
//   controls behind it reading 0px is the product working, so on a menu
//   surface only the MENU's own links can fail — everything else is recorded.
// - `legal` IS ASKED, PRINTED AND RECORDED — NEVER GRADED. The row loop
//   counts integer rows ceil(top)..floor(bottom), which carries ±1px of
//   discretization at a fractional edge: a 44.25px `.htab` at top 400.125
//   reads 43 with its last row landing on the grid container, at phone
//   widths only, with no furniture anywhere near it (probed, not assumed).
//   Failing the furniture check on that would let scroll-offset fractions
//   veto it, and "fixing" the product 1px to satisfy a loop would be editing
//   to make the check pass. The furniture question is `reachable` and keeps
//   full grading; `legal` keeps its diagnostic job — telling a small control
//   from a covered one — in print and in the receipt.

import "../tests/_env.mjs";

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const HEADED = process.argv.includes("--headed");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const BASE = process.env.BASE || "http://localhost:5173";

// 320 FIRST — the narrowest supported width. The burger (and so the menu)
// draws at <=470px, so only 320 and 392 carry a menu-open surface.
const SIZES = [
  { w: 320, h: 844 }, { w: 392, h: 844 }, { w: 768, h: 1024 },
  { w: 1440, h: 900 }, { w: 1920, h: 1080 },
];
const MENU_SIZES = [320, 392];

// All three marketing pages share the same nav (LandingPage, PricingPage and
// LegalPage each render `.ld .nav` + burger + `#navmenu`). Only the landing
// page has the pinned `.ld .stage`.
const PAGES = [
  { key: "landing", url: "/" },
  { key: "pricing", url: "/pricing" },
  { key: "legal", url: "/terms" },
];

const SEL = "a[href], button, input";
const ABSOLUTE = 44;
const ART = fileURLToPath(new URL("../artifacts/marketing-furniture-clearance/", import.meta.url));

let assertions = 0;
const failures = [];
const artifacts = [];
const consoleNoise = [];
const observed = [];

const check = (target, name, cond, detail = "") => {
  assertions++;
  if (cond) { console.log(`    ok      ${name}`); return true; }
  failures.push(`${target}: ${name} ${detail}`.trim());
  console.error(`    FAIL    ${name}  ${detail}`);
  return false;
};

/**
 * Measure every matching control on this surface.
 *
 * There is deliberately NO `--break=rect` sabotage here (the sibling scripts
 * both carry one). It was built, run against the fixed tree, and went PASS:
 * no measured control on these pages wears vertical `::after` overhang —
 * every control on the proving run printed `+ 0px` — so ignoring it changes
 * nothing and the flag would be a claim of proof with no proof in it. The
 * overhang is still READ off each element (a control that grows one tomorrow
 * is measured correctly tomorrow); the negative control this run carries is
 * the tall-nav canary below, which was caught.
 */
const MEASURE = ({ sel, absolute }) => {
  const nav = document.querySelector(".ld .nav");
  const navBottom = nav ? Math.round(nav.getBoundingClientRect().bottom) : null;
  const menuOpen = !!document.querySelector(".navmenu.on");
  const stagePresent = !!document.querySelector(".ld .stage");

  // THE OVERHANG, READ OFF THE ELEMENT rather than assumed. `.ld .nav .lk`
  // grows its target with `::after { inset: 0 -1px }`, and the next control
  // to use a different inset would silently stop being covered by a literal.
  const overhangOf = (el) => {
    const a = getComputedStyle(el, "::after");
    if (!a || a.content === "none" || a.position !== "absolute") return { top: 0, bottom: 0 };
    const px = (v) => (v && v.endsWith("px") ? parseFloat(v) : 0);
    return { top: Math.max(0, -px(a.top)), bottom: Math.max(0, -px(a.bottom)) };
  };

  const who = (hit) => {
    if (!hit) return "nothing";
    if (hit.closest(".ld .nav")) return ".ld .nav";
    if (hit.closest(".navmenu.on")) return ".navmenu.on";
    if (hit.closest(".ld .stage")) return ".ld .stage";
    return String(hit.className || "").split(" ")[0] || hit.tagName;
  };

  const rows = (el, t, b, x) => {
    let n = 0;
    const lost = {};
    for (let y = Math.ceil(t); y <= Math.floor(b); y++) {
      if (y < 0 || y >= innerHeight) { lost["offscreen"] = (lost["offscreen"] || 0) + 1; continue; }
      const hit = document.elementFromPoint(x, y);
      if (hit && (hit === el || el.contains(hit))) { n++; continue; }
      const k = who(hit);
      lost[k] = (lost[k] || 0) + 1;
    }
    return { n, lost };
  };

  const out = [];
  let hidden = 0;
  for (const el of document.querySelectorAll(sel)) {
    const r0 = el.getBoundingClientRect();
    if (r0.width < 8 || r0.height < 8) continue;
    // A CONTROL INSIDE A CLOSED FOLD IS NOT A BROKEN CONTROL. The shut menu
    // (`.navmenu` without `.on` is `display: none`) keeps no hit area, and
    // `elementFromPoint` lands on whatever is really there. COUNTED, never
    // silently dropped — the tally is printed and goes in the receipt.
    if (typeof el.checkVisibility === "function"
      && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) {
      hidden++;
      continue;
    }
    const o = overhangOf(el);

    // 1. LEGAL — in the middle of the screen, where no fixed furniture reaches.
    //    The lost map is kept, because a `legal` shortfall whose rows went to
    //    the nav means the control CANNOT scroll away from it (a fixed menu
    //    link under the pill), which is a different fault from a small box.
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const rc = el.getBoundingClientRect();
    const leg = rows(el, rc.top - o.top, rc.bottom + o.bottom,
      Math.round(rc.left + rc.width / 2));
    const legal = leg.n;

    // 2. REACHABLE — where the browser puts it when it is FOCUSED. Focusing is
    //    what a keyboard user does and the only thing `scroll-padding` is
    //    honoured for; `scrollIntoView` alone moves nothing for an element the
    //    browser already considers visible under a painted bar. `block:
    //    "start"` because the furniture here is at the TOP.
    el.scrollIntoView({ block: "start", inline: "nearest" });
    if (typeof el.focus === "function") el.focus({ preventScroll: false });
    const rn = el.getBoundingClientRect();
    const got = rows(el, rn.top - o.top, rn.bottom + o.bottom,
      Math.round(rn.left + rn.width / 2));

    out.push({
      text: (el.innerText || el.getAttribute("aria-label") || el.getAttribute("href") || "").trim().slice(0, 20),
      cls: String(el.className || "").split(" ")[0],
      inMenu: !!el.closest(".navmenu.on"),
      rectH: Math.round(rc.height), overhang: o.top + o.bottom,
      legal, legalLost: leg.lost, reachable: got.n, lost: got.lost,
      top: Math.round(rn.top), bottom: Math.round(rn.bottom),
    });
  }
  return { navBottom, menuOpen, stagePresent, absolute, controls: out, hidden };
};

// THE CANARY: make the pill much taller, but not so tall it covers the middle
// of the screen — 200px eats every control focused to the top while leaving
// the `legal` measurement (taken at the middle) intact. A 420px bar broke
// `legal` first, and `reachable` then passed vacuously because it only judges
// controls that are legal: the canary was MISSED on a run that observed the
// defect. A canary must break exactly the question it guards.
const CANARY_CSS = `.ld .nav { height: 200px !important; }`;

rmSync(ART, { recursive: true, force: true });
mkdirSync(ART, { recursive: true });

// **WAIT FOR THE PILL, NOT FOR THE PAINT.** The pricing page prices from the
// database (`data-loading` until it lands); measuring before that is asking a
// half-drawn page. The `subjects` question is what catches a surface with
// nothing on it, which is why it grades as a failure instead of dropping out.
async function ready(page) {
  await page.waitForSelector(".ld .nav", { timeout: 30000 });
  await page.waitForFunction(() => !document.querySelector("[data-loading]"),
    null, { timeout: 30000 }).catch(() => {});
  await settle(page, 1500);
}

async function surface(browser, size, { page: pg, menu, label, canary }) {
  const ctx = await browser.newContext({
    viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  watchConsole(page, label, consoleNoise);
  try {
    await page.goto(`${BASE}${pg.url}`, { waitUntil: "domcontentloaded" });
    await ready(page);
    if (menu) {
      // The burger only draws at <=470px. If it is not here the surface is
      // misdeclared, and saying so beats measuring a shut menu as clean.
      const burger = page.locator(".ld .nav .burger");
      if (!(await burger.count())
        || !(await burger.first().isVisible().catch(() => false))) {
        throw new Error(`menu surface at ${size.w}px but no visible burger — `
          + `the menu never draws at this width`);
      }
      await burger.first().click();
      await page.waitForSelector(".navmenu.on .lk", { timeout: 10000 });
      await settle(page, 800);
    }
    if (canary && BREAK !== "canary") await page.addStyleTag({ content: CANARY_CSS });
    await settle(page, 800);
    const m = await page.evaluate(MEASURE,
      { sel: SEL, absolute: ABSOLUTE });
    // THE FRAME IS TAKEN WHERE THE MEASUREMENT ENDED — the last control
    // focused, sitting wherever the browser left it. A shot of the top of the
    // page would be a picture of somewhere the numbers did not come from.
    const file = `${label.replace(/[^\w.-]+/g, "-")}.png`;
    await page.screenshot({ path: ART + file, animations: "disabled" });
    artifacts.push("artifacts/marketing-furniture-clearance/" + file);
    return m;
  } finally {
    await ctx.close();
  }
}

function grade(id, m, kind, sink, report = observed) {
  const controls = m.controls;
  sink(id, "subjects", controls.length > 0,
    "no controls matched on this surface, so every question below was asked of nothing");
  // LEGAL IS REPORTED, NOT GRADED — see the header. It still runs on every
  // surface so a control that is genuinely small stays visible in print and
  // in the receipt's `observed`, instead of vanishing into a pass.
  assertions++;
  const illegal = controls.filter((c) => c.legal < ABSOLUTE);
  if (illegal.length) {
    report.push(`${id}: ${illegal.length} control(s) under ${ABSOLUTE}px at the middle of the screen `
      + `(reported, not graded) — `
      + illegal.slice(0, 3).map((c) => `«${c.text}» (${c.cls}) ${c.legal}px `
        + `(box ${c.rectH}px + ${c.overhang}px overhang), lost to ${JSON.stringify(c.legalLost)}`).join("; ")
      + (illegal.length > 3 ? ` … and ${illegal.length - 3} more` : ""));
  }

  // ONLY LOSSES TO THE MARKETING FURNITURE COUNT. A control can come up short
  // against anything else on a long page — real, and not what this item is
  // about. Reported instead.
  const mine = (c) => Object.keys(c.lost || {})
    .some((k) => k === ".ld .nav" || k === ".navmenu.on" || k === ".ld .stage");
  // On a menu surface the open menu covers page content ON PURPOSE, so only
  // the menu's own links can fail; the covered page behind it is recorded.
  const cand = kind === "menu" ? controls.filter((c) => c.inMenu) : controls;
  const short = cand.filter((c) => c.legal >= ABSOLUTE && c.reachable < ABSOLUTE && mine(c));
  const elsewhere = controls.filter((c) => c.legal >= ABSOLUTE && c.reachable < ABSOLUTE && !mine(c));
  if (elsewhere.length) {
    observed.push(`${id}: ${elsewhere.length} control(s) short of ${ABSOLUTE}px for reasons OTHER `
      + `than the fixed furniture — worst «${elsewhere[0].text}» at ${elsewhere[0].reachable}px, `
      + `lost to ${JSON.stringify(elsewhere[0].lost)} (recorded, not this item's fault)`);
  }
  if (kind === "menu") {
    const buried = controls.filter((c) => !c.inMenu && c.legal >= ABSOLUTE && mine(c));
    if (buried.length) {
      observed.push(`${id}: ${buried.length} page control(s) behind the OPEN menu read short — `
        + `worst «${buried[0].text}» at ${buried[0].reachable}px, lost to `
        + `${JSON.stringify(buried[0].lost)} (the menu covers on purpose; recorded, not a fault)`);
    }
  }
  sink(id, "reachable", cand.length > 0 && short.length === 0,
    (cand.length === 0 ? "no candidate controls on this surface" : "")
    + short.slice(0, 3).map((c) => `«${c.text}» (${c.cls}) is legal at ${c.legal}px but only `
      + `${c.reachable}px survive where the browser puts it (y ${c.top}..${c.bottom}, nav bottom `
      + `${m.navBottom}), lost to ${JSON.stringify(c.lost)}`).join("; ")
      + (short.length > 3 ? ` … and ${short.length - 3} more` : ""));
}

// ---------------------------------------------------------------------------
// THE SURFACE LIST, DECLARED. `EXPECTED` is computed from these lists and never
// from what the run finds, so a surface that silently stops being reached
// cannot lower the bar it is measured against.
const PLAN = [
  ...SIZES.flatMap((s) => PAGES.map((p) => ({ size: s, page: p, kind: "page" }))),
  ...MENU_SIZES.map((w) => ({
    size: SIZES.find((s) => s.w === w), page: PAGES[0], menu: true, kind: "menu",
  })),
];
const EXPECTED = PLAN.length + 1;                         // + the canary
// Three counts per surface (subjects sink, the legal run, reachable sink) +
// the canary's three sink calls. `legal` runs everywhere but grades nowhere;
// the subjects question is what keeps a surface with no controls red.
const MIN_ASSERTIONS = PLAN.length * 3 + 3;

let discovered = 0, attempted = 0, completed = 0;
const canary = { id: "the-nav-much-taller", observed_failure: false, problems: [] };

const browser = await chromium.launch({ headless: !HEADED });

for (const p of PLAN) {
  const label = `${p.size.w}x${p.size.h} ${p.kind}:${p.page.key}`;
  console.log(`  ${label}`);
  discovered++; attempted++;
  const m = await surface(browser, p.size, { ...p, label });
  grade(label, m, p.kind, check);
  // On a menu surface the page behind the open menu reads short on purpose,
  // so the summary's worst covers the menu's own links — the same candidates
  // `reachable` grades. Otherwise the summary would print 0px beside a pass.
  const cand = p.kind === "menu" ? m.controls.filter((c) => c.inMenu) : m.controls;
  const worst = cand.reduce((a, c) => (c.reachable < a ? c.reachable : a), 999);
  observed.push(`${label}: ${m.controls.length} visible control(s)`
    + (m.hidden ? ` (+${m.hidden} hidden in shut folds, not measured)` : "")
    + `, nav bottom ${m.navBottom}${m.menuOpen ? ", menu open" : ""}`
    + `${m.stagePresent ? ", stage present" : ", no stage"}`
    + `, worst reachable ${worst === 999 ? "n/a" : worst + "px"}`);
  completed++;
}

console.log("  canary — the nav much taller; it MUST fail");
discovered++; attempted++;
{
  const m = await surface(browser, SIZES[0],
    { page: PAGES[0], kind: "page", label: "canary", canary: true });
  grade("canary", m, "page", (t, name, cond, detail) => {
    assertions++;
    if (cond) return;
    canary.problems.push(`${name} ${detail}`.trim());
  }, []);
  canary.observed_failure = canary.problems.some((p) => p.startsWith("reachable"));
  console.log(`    ${canary.observed_failure ? "caught" : "MISSED"}`
    + `${canary.problems.length ? " — " + canary.problems[0].slice(0, 110) : ""}`);
  completed++;
}

await browser.close();

console.log("\nWhat the surfaces measured:");
for (const o of observed) console.log("  " + o);
if (consoleNoise.length) {
  console.log("\nConsole and refused requests:");
  for (const c of consoleNoise) console.log("  " + c);
}

const status = failures.length === 0 && canary.observed_failure && consoleNoise.length === 0
  ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "marketing-furniture-clearance",
  started_at,
  status,
  expected_targets: EXPECTED,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: MIN_ASSERTIONS,
  assertion_floor:
    "5 widths x 3 pages + 2 menu surfaces, 3 counts each (subjects, the legal run, reachable), "
    + "+ 1 canary x 3. Fixed by SIZES, PAGES, MENU_SIZES and the question list, never by what "
    + "the run finds: a surface with no matching controls grades as failures rather than "
    + "dropping out, so the number cannot fall without a diff. A tripwire on the code, not "
    + "a run-time check.",
  failures: [...failures, ...consoleNoise.map((c) => `console: ${c}`)],
  artifacts,
  warnings: [
    "Measures the HIT AREA — bounding rect plus the overhang read off each element's own ::after "
    + "— never the rect. No `--break=rect` sabotage: one was built and went PASS against the fixed "
    + "tree (every control measured `+ 0px` overhang), so the flag proved nothing and was removed "
    + "rather than kept as theater.",
    "`.ld .nav.hid` is dead: no JS in app/src applies it, so the pill is always on screen and a "
    + "control measured under it is a real overlap rather than a passing state.",
    "`.lite .ld .stage` is `position: static` — the reduced-motion path pins nothing. This run "
    + "measures the default path only.",
    "On a menu surface the open menu covers page content ON PURPOSE: only the menu's own links "
    + "can fail `reachable`; buried page controls are recorded in `observed`, never failed.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: {
    sizes: SIZES.map((s) => `${s.w}x${s.h}`),
    pages: PAGES.map((p) => `${p.key} (${p.url})`),
    menu_sizes: MENU_SIZES,
    absolute: ABSOLUTE,
    furniture: [".ld .nav", ".ld .navmenu.on", ".ld .stage"],
    observed,
    sabotage: BREAK || null,
  },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${completed}/${EXPECTED} targets, ${assertions} assertions, `
  + `${failures.length} failure(s), canary ${canary.observed_failure ? "caught" : "MISSED"}.`
  + ` Receipt ${path}`);
for (const f of failures) console.log("  · " + f);
process.exit(status === "pass" ? 0 : 1);
