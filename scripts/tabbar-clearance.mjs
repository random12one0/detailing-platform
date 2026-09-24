// CAN A CONTROL THAT COMES TO REST UNDER THE BACK OFFICE'S TAB BAR STILL BE
// PRESSED? — ROADMAP 2.32.
//
//   node scripts/tabbar-clearance.mjs                 # the sweep
//   node scripts/tabbar-clearance.mjs --headed        # watch it
//   node scripts/tabbar-clearance.mjs --break=rect    # sabotage: measure the RECT
//   node scripts/tabbar-clearance.mjs --break=canary  # sabotage: the canary is real
//   node scripts/receipt.mjs receipts/tabbar-clearance.json
//
// Dev server on :5173, the seeded demo business, credentials in `.env` for the
// dashboard login. No Geoapify spend, no bookings written, nothing deployed.
//
// ---------------------------------------------------------------------------
// **THIS FILE DELETES ROWS FROM `rate_hits`, SO IT CANNOT RUN BESIDE ANYTHING
// MEASURING THE RATE LIMITS — CHECK BEFORE YOU START IT.**
// ---------------------------------------------------------------------------
// Near the bottom it DELETEs every `address%` bucket from `rate_hits` to buy
// itself an address budget (the note there explains why). That table is shared
// state, and `edge-tenant-replay.mjs`, `rate-limit-coverage.mjs` and
// `tenant-matrix.mjs` read it as their evidence. **A run of this file in the
// middle of one of theirs does not fail anything — it silently changes their
// numbers**, and nobody afterwards can tell a real result from a cleared
// bucket. It nearly happened on 2026-09-23: a session wanted this file's green
// to confirm an unrelated fix while another was mid-investigation into
// `address-suggest` answering 429, and declined to take it.
// **Confirm nobody is measuring `rate_hits` before running this, or run the
// check that does not touch it — `scroller-clearance.mjs` presses the same
// controls on the same screens and writes nothing.** The general shape is
// `docs/gotchas.md` #78.
//
// ---------------------------------------------------------------------------
// THE MEASUREMENT IS THE HIT AREA, NEVER THE BOUNDING RECT
// ---------------------------------------------------------------------------
// **This is the whole reason the file exists and the thing most likely to be
// broken by somebody tidying it.** CLAUDE.md's rule is 44px of REAL hit area,
// and a deliberately small mark keeps its size and grows its target with an
// absolutely positioned `::after` at a negative inset. `.choice` is exactly
// that: a **38px** box wearing `::after { inset: -4px 0 }`, so its pressable
// height is **46px** and it is entirely legal.
//
// **A PROBE THAT WALKS THE RECT UNDER-MEASURES EVERY SUCH CONTROL BY 8px AND
// CALLS IT BROKEN.** The first probe written for 2.32 did precisely that and
// reported **41 of 41 chips failing** on a screen where nothing was wrong.
// So the scan below runs from `rect.top - overhang` to `rect.bottom +
// overhang`, and **the overhang is READ off the element's own `::after`**
// rather than hard-coded, because the next control to meet this will use a
// different inset and a literal would silently stop covering it.
//
// **AND THE SAME ERROR ONE LAYER ALONG IS WHY THE FIX IS SIZED THE WAY IT
// IS.** A clearance sized to the bounding rect leaves the four overhang rows
// — real, pressable control — under the bar, and reports itself finished.
// That is this fault rebuilt in its own repair.
//
// ---------------------------------------------------------------------------
// WHAT IT ASKS, AND WHY "COVERED AT ITS CENTRE" IS NOT THE QUESTION
// ---------------------------------------------------------------------------
// `keyboard-walk.mjs` already asks whether a FOCUSED control is covered at its
// centre point, during a tab walk, at one width. That is a different question
// and this does not duplicate it: here every control is scrolled into view the
// way a browser would put it there, and the pressable ROWS are counted.
//
//   legal      the control's own hit area, measured with nothing over it,
//              reaches 44px. Without this the check would blame the bar for a
//              control that was too small to begin with — and would fail on a
//              legal chip the moment somebody changed `::after`.
//   reachable  after `scrollIntoView`, at least 44 of those rows survive.
//              **This is 2.32.** `scroll-padding-bottom` is what makes the
//              browser leave room; a reserve (`--tabclear`) cannot, because a
//              reserve only decides where the scroll ENDS. Measured: raising
//              `--tabclear` 96px → 104px at runtime changed nothing at all.
//   owner      when rows are lost, `elementFromPoint` names what took them,
//              so "the bar did it" is read off the page rather than assumed.
//
// ---------------------------------------------------------------------------
// TWO SABOTAGES
// ---------------------------------------------------------------------------
// `--break=rect` scans the bounding rect instead of the hit area — the exact
// instrument bug above. Every legal `.choice` must then fail `legal`, which is
// how this file proves it is measuring the overhang rather than claiming to.
// `--break=canary` drops the injected canary, so nothing is observed and
// `receipt.mjs` refuses the receipt.

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
const OWNER = { email: "demo@detailplatform.com", password: "demo123" };

// 320 FIRST — it is the narrowest supported width and where 2.32 was measured.
const SIZES = [
  { w: 320, h: 844 }, { w: 392, h: 844 }, { w: 768, h: 1024 },
  { w: 1440, h: 900 }, { w: 1920, h: 1080 },
];

// The screens whose controls can come to rest under the bar. Booking rules is
// where 2.32 was measured; the others are here because the entry's claim is
// that the population is "everything in the back office", and one screen
// cannot test that.
const SCREENS = [
  { key: "rules", url: "/app/business?settings=rules", sel: ".choice" },
  { key: "business", url: "/app/business", sel: ".btn, button.choice, .chip" },
  { key: "today", url: "/app/today", sel: ".btn, .chip" },
];

const ABSOLUTE = 44;
const ART = fileURLToPath(new URL("../artifacts/tabbar-clearance/", import.meta.url));

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
 * Measure every matching control on this screen.
 *
 * `useRect` is the `--break=rect` sabotage: scan the bounding box and ignore
 * the `::after`, which is the instrument bug this file was written to avoid.
 */
const MEASURE = ({ sel, absolute, useRect }) => {
  const bar = document.querySelector(".tabbar");
  const barTop = bar ? Math.round(bar.getBoundingClientRect().top) : null;

  // THE OVERHANG, READ OFF THE ELEMENT rather than assumed. A negative `top`
  // or `bottom` on `::after` is the pattern CLAUDE.md prescribes for a
  // deliberately small mark; anything else contributes nothing.
  const overhangOf = (el) => {
    if (useRect) return { top: 0, bottom: 0 };
    const a = getComputedStyle(el, "::after");
    if (!a || a.content === "none" || a.position !== "absolute") return { top: 0, bottom: 0 };
    const px = (v) => (v && v.endsWith("px") ? parseFloat(v) : 0);
    return { top: Math.max(0, -px(a.top)), bottom: Math.max(0, -px(a.bottom)) };
  };

  const rows = (el, top, bottom, x) => {
    let n = 0;
    const lost = {};
    for (let y = Math.ceil(top); y <= Math.floor(bottom); y++) {
      if (y < 0 || y >= innerHeight) { lost["offscreen"] = (lost["offscreen"] || 0) + 1; continue; }
      const hit = document.elementFromPoint(x, y);
      if (hit && (hit === el || el.contains(hit))) { n++; continue; }
      const who = hit
        ? (hit.closest(".tabbar") ? "nav.tabbar"
          : hit.closest(".tabscrim") ? ".tabscrim"
            : (String(hit.className || "").split(" ")[0] || hit.tagName))
        : "nothing";
      lost[who] = (lost[who] || 0) + 1;
    }
    return { n, lost };
  };

  const out = [];
  let hidden = 0;
  for (const el of document.querySelectorAll(sel)) {
    const r0 = el.getBoundingClientRect();
    if (r0.width < 8 || r0.height < 8) continue;
    if (el.closest(".tabbar")) continue;               // the bar's own buttons
    // **A CONTROL INSIDE A CLOSED FOLD IS NOT A BROKEN CONTROL — and the
    // first run of this file called 26 of them broken at every width.** They
    // keep a bounding rect while `display` or an ancestor's clip takes them
    // off the screen, so `elementFromPoint` lands on whatever is really
    // there and the reachable count is 0. `docs/gotchas.md`'s oldest entry is
    // a closed `<details>` still measuring its children; this is that.
    // **Counted, never silently dropped:** the tally is printed and goes in
    // the receipt, because a skip that reads like a pass is this repo's most
    // repeated fault.
    if (typeof el.checkVisibility === "function"
      && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) {
      hidden++;
      continue;
    }
    const o = overhangOf(el);

    // 1. LEGAL: the control's own hit area with nothing over it. Put it in the
    //    middle of the screen first, where no fixed furniture can reach it.
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const rc = el.getBoundingClientRect();
    const legal = rows(el, rc.top - o.top, rc.bottom + o.bottom,
      Math.round(rc.left + rc.width / 2)).n;

    // 2. REACHABLE: WHERE THE BROWSER PUTS IT WHEN IT IS FOCUSED, which is
    //    the case 8.5a is about and the only one `scroll-padding-bottom`
    //    governs.
    //    **`scrollIntoView` WAS THE WRONG TRIGGER AND THE CANARY IS WHAT SAID
    //    SO.** An element already inside the viewport is "visible" by that
    //    call's definition even when a fixed bar is painted over it, so
    //    `block: "nearest"` scrolls nothing and the measurement is taken
    //    wherever the element happened to sit — which made every screen look
    //    clean AND made a canary that removed the clearance change nothing.
    //    `keyboard-walk.mjs`'s own header records the same trap in its own
    //    words: *"`scrollIntoViewIfNeeded` will not move it, because by its
    //    own definition it is visible."*
    //    Focusing it is what a keyboard user does and what the browser honours
    //    `scroll-padding-bottom` for.
    el.scrollIntoView({ block: "end", inline: "nearest" });
    if (typeof el.focus === "function") el.focus({ preventScroll: false });
    const rn = el.getBoundingClientRect();
    const got = rows(el, rn.top - o.top, rn.bottom + o.bottom,
      Math.round(rn.left + rn.width / 2));

    out.push({
      text: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 16),
      rectH: Math.round(rc.height), overhang: o.top + o.bottom,
      legal, reachable: got.n, lost: got.lost,
      top: Math.round(rn.top), bottom: Math.round(rn.bottom),
    });
  }
  return { barTop, absolute, controls: out, hidden };
};

// THE CANARY: put the bar's own height back over the clearance. Whatever the
// fix ends up being, a bar this much taller must eat into a control again, so
// a run that observes nothing here has stopped looking.
const CANARY_CSS = `
  :root { --tabclear: 8px !important; }
  html { scroll-padding-bottom: 0 !important; }`;

rmSync(ART, { recursive: true, force: true });
mkdirSync(ART, { recursive: true });

// **THE ADDRESS BUDGET THIS RUN SPENDS WITHOUT TYPING ANYTHING.** Opening a
// job or a dashboard geocodes addresses through `address-suggest`
// (`app/src/lib/jobWeather.js:111`) and that endpoint is budgeted as a TYPING
// allowance — 60 an hour per IP. Sixteen screen loads in three minutes
// exhausts a real customer's hour, every load then answers 429, and the run
// reddens on a console line that is the harness rather than the product. The
// underlying behaviour is a real finding with its own roadmap item and is NOT
// fixed here; clearing is the same bargain `e2e-booking.mjs` strikes with the
// booking buckets — the limits stay sized by what a real customer does and the
// harness pays for its own noise.
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/rate_hits?bucket=like.address%25`, {
    method: "DELETE",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  }).catch(() => {});
}

let signedIn = null;

async function sweep(browser, size, screen, { label, canary }) {
  const ctx = await browser.newContext({
    viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1,
    storageState: signedIn || undefined,
  });
  const page = await ctx.newPage();
  watchConsole(page, label, consoleNoise);
  try {
    await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
    if (await page.locator("input[type=email]").count()) {
      await page.fill("input[type=email]", OWNER.email);
      await page.fill("input[type=password]", OWNER.password);
      await page.click("form button.btn.primary");
      await page.waitForSelector(".tabbar", { timeout: 30000 });
      signedIn = await ctx.storageState();
    }
    await page.evaluate(() => {
      try {
        localStorage.setItem("dp.tours", JSON.stringify(
          ["shell", "today", "calendar", "money", "clients", "business"]));
        localStorage.setItem("dp.tour", "1");
      } catch { /* private mode */ }
    });
    await page.goto(BASE + screen.url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".tabbar", { timeout: 30000 });
    await settle(page, 2500);
    if (canary && BREAK !== "canary") await page.addStyleTag({ content: CANARY_CSS });
    await settle(page, 800);
    const m = await page.evaluate(MEASURE,
      { sel: screen.sel, absolute: ABSOLUTE, useRect: BREAK === "rect" });
    // THE FRAME IS TAKEN WHERE THE MEASUREMENT ENDED — the last control
    // focused, sitting wherever the browser put it. A screenshot of the top of
    // the page would be a picture of somewhere the numbers did not come from.
    const file = `${label.replace(/[^\w.-]+/g, "-")}.png`;
    await page.screenshot({ path: ART + file, animations: "disabled" });
    artifacts.push("artifacts/tabbar-clearance/" + file);
    return m;
  } finally {
    await ctx.close();
  }
}

function grade(id, m, sink) {
  const controls = m.controls;
  sink(id, "subjects", controls.length > 0,
    "no controls matched on this screen, so the three questions below were asked of nothing");
  const illegal = controls.filter((c) => c.legal < ABSOLUTE);
  sink(id, "legal", controls.length > 0 && illegal.length === 0,
    illegal.slice(0, 3).map((c) => `«${c.text}» is ${c.legal}px of hit area with nothing over it `
      + `(box ${c.rectH}px + ${c.overhang}px overhang)`).join("; ")
      + (illegal.length > 3 ? ` … and ${illegal.length - 3} more` : ""));
  // **ONLY LOSSES TO THE BAR COUNT AS 2.32.** At 1440 and 1920 the bar is a
  // left rail and a chip can still come up a few rows short against
  // `.app-main` — a real thing, measured, and NOT what `scroll-padding-bottom`
  // governs. Failing on it here would make this check go green or red for
  // reasons that have nothing to do with the item, which is how a check starts
  // measuring its own scope instead of a fault. It is reported below instead.
  const byBar = (c) => Object.keys(c.lost || {}).some((k) => k === "nav.tabbar" || k === ".tabscrim");
  const short = controls.filter((c) => c.legal >= ABSOLUTE && c.reachable < ABSOLUTE && byBar(c));
  const shortElsewhere = controls.filter((c) => c.legal >= ABSOLUTE && c.reachable < ABSOLUTE && !byBar(c));
  if (shortElsewhere.length) {
    observed.push(`${id}: ${shortElsewhere.length} control(s) short of ${ABSOLUTE}px for reasons `
      + `OTHER than the bar — worst «${shortElsewhere[0].text}» at ${shortElsewhere[0].reachable}px, `
      + `lost to ${JSON.stringify(shortElsewhere[0].lost)} (recorded, not this item's fault)`);
  }
  sink(id, "reachable", controls.length > 0 && short.length === 0,
    short.slice(0, 3).map((c) => `«${c.text}» is legal at ${c.legal}px but only ${c.reachable}px `
      + `survive where the browser puts it (y ${c.top}..${c.bottom}, bar top ${m.barTop}), `
      + `lost to ${JSON.stringify(c.lost)}`).join("; ")
      + (short.length > 3 ? ` … and ${short.length - 3} more` : ""));
}

// ---------------------------------------------------------------------------
const browser = await chromium.launch({ headless: !HEADED });
const expected = SIZES.length * SCREENS.length + 1;
let discovered = 0, attempted = 0, completed = 0;
const canary = { id: "the-clearance-taken-away", observed_failure: false, problems: [] };

for (const size of SIZES) {
  for (const screen of SCREENS) {
    const label = `${size.w}x${size.h} ${screen.key}`;
    console.log(`  ${label}`);
    discovered++; attempted++;
    const m = await sweep(browser, size, screen, { label });
    grade(label, m, check);
    const worst = m.controls.reduce((a, c) => (c.reachable < a ? c.reachable : a), 99);
    observed.push(`${label}: ${m.controls.length} visible control(s)`
      + (m.hidden ? ` (+${m.hidden} inside closed folds, not measured)` : "")
      + `, bar top ${m.barTop}, worst reachable ${worst === 99 ? "n/a" : worst + "px"}`);
    completed++;
  }
}

console.log("  canary — the clearance taken away; it MUST fail");
discovered++; attempted++;
{
  const m = await sweep(browser, SIZES[0], SCREENS[0], { label: "canary", canary: true });
  grade("canary", m, (t, name, cond, detail) => {
    assertions++;
    if (cond) return;
    canary.problems.push(`${name} ${detail}`.trim());
  });
  canary.observed_failure = canary.problems.some((p) => p.startsWith("reachable"));
  console.log(`    ${canary.observed_failure ? "caught" : "MISSED"}`
    + `${canary.problems.length ? " — " + canary.problems[0].slice(0, 90) : ""}`);
  completed++;
}

await browser.close();

console.log("\nWhat the screens measured:");
for (const o of observed) console.log("  " + o);
if (consoleNoise.length) {
  console.log("\nConsole (the two known React Router v7 warnings are dropped by name):");
  for (const c of consoleNoise) console.log("  " + c);
}

const status = failures.length === 0 && canary.observed_failure && consoleNoise.length === 0
  ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "tabbar-clearance",
  started_at,
  status,
  expected_targets: expected,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 48,
  assertion_floor:
    "5 widths x 3 screens x 3 questions + 1 canary x 3 = 48. Fixed by SIZES x SCREENS x the "
    + "question list, never by what the run finds: a screen with no matching controls grades "
    + "as three failures rather than dropping out, so the number cannot fall without a diff. "
    + "A tripwire on the code, not a run-time check.",
  failures: [...failures, ...consoleNoise.map((c) => `console: ${c}`)],
  artifacts,
  warnings: [
    "Measures the HIT AREA — bounding rect plus the overhang read off each element's own "
    + "::after — never the rect. A rect-only scan under-measures every control using the "
    + "negative-inset pattern by its overhang and calls a legal control broken.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: {
    sizes: SIZES.map((s) => `${s.w}x${s.h}`),
    screens: SCREENS.map((s) => s.key),
    absolute: ABSOLUTE,
    observed,
    sabotage: BREAK || null,
  },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${completed}/${expected} targets, ${assertions} assertions, `
  + `${failures.length} failure(s), canary ${canary.observed_failure ? "caught" : "MISSED"}.`
  + ` Receipt ${path}`);
for (const f of failures) console.log("  · " + f);
process.exit(status === "pass" ? 0 : 1);
