// ROADMAP 9.11e, last slice — the two pieces of fixed furniture that only
// appear in a STATE no other hit-test walks into.
//
//   node scripts/state-furniture-clearance.mjs                 (BASE, DEMO_OWNER_PW)
//   node scripts/state-furniture-clearance.mjs --break=nofix    (sabotage: the top reserve removed)
//   node scripts/receipt.mjs receipts/state-furniture-clearance.json
//
//   .impbar     the red strip across the dashboard while the back office has
//               signed this browser in as a detailer (`lib/impersonation.js`).
//               Sticky at top: 0, 49px tall, 100px at phone widths where it
//               wraps, and it takes the stick from `.topbar`.
//   .livesite   the website brief's live preview (`SiteIntake.jsx`), sticky
//               in the second column at 1000px and wider.
//   .impbar     AGAIN, on `/website/preview`: `SiteIntake.jsx` draws its red
//   (preview)   "Preview" strip with the same class, sticky at top: 0, but
//               inside `.intake`, so neither `html:has(.app-shell > …)` rule
//               reaches it. Added 2026-10-25 after the finish review found the
//               first version asked this page only about `.livesite`.
//
// The plain `.topbar` is measured beside `.impbar` because it is the same
// question with the same answer: both are sticky over the top of a document
// that reserved nothing at the top. `keyboard-walk.mjs` walks the dashboard
// FORWARDS, so the browser always parks the next control at the BOTTOM of the
// screen and a header at the top can never be caught. Going BACKWARDS
// (Shift+Tab, or any focus on a control above the viewport) parks it at the
// TOP, flush under the header — the fault `.jobbar ~ *`'s scroll-margin-top in
// theme.css was written for on the job record. Before the fix, of 22 controls
// on Today at 320/390/768/1440/1920: `.topbar` took rows from 16/16/14/7/3,
// `.impbar` from 16/16/14/4/3 — `node scripts/state-furniture-clearance.mjs
// --break=nofix` at af5fc32f, receipts/state-furniture-clearance.sabotage.json.
//
// ACCOUNT. The demo owner, signed in with `DEMO_OWNER_PW` (`scripts/lib/
// demoOwner.mjs`). The red strip is drawn from a note in localStorage
// naming the signed-in address, so entering the state writes NOTHING to any
// database: no platform admin, no preview session. `/website/preview` needs
// no session at all.
//
// QUESTIONS PER SURFACE: `subjects` (controls were found), `present` (the
// furniture is on screen and sticky), `reachable` (no row of any control's
// hit area — box plus its own `::after` overhang, read off the element — is
// taken by that furniture where the browser puts it when focused).
//
// CANARIES, all three on by default: the top reserve removed on the red-strip
// surface at 390 must lose rows to `.impbar`; the preview pinned over the form
// at 1440 must lose rows to `.livesite`; the reserve removed on the preview
// page at 390 must lose rows to its `.impbar`. `--break=nofix` removes the
// reserve on every dashboard and preview-strip surface and must go red at every width — the original
// defect, reproduced on purpose. Its receipt lands in
// `receipts/state-furniture-clearance.sabotage.json`.
import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const BASE = process.env.BASE || "http://localhost:5173";
const OWNER = demoOwner();
const ART = fileURLToPath(new URL(`../artifacts/state-furniture-clearance${BREAK ? "-" + BREAK : ""}/`, import.meta.url));

const SIZES = [
  { w: 320, h: 844 }, { w: 390, h: 844 }, { w: 768, h: 1024 },
  { w: 1440, h: 900 }, { w: 1920, h: 1080 },
];
const NO_RESERVE = "html { scroll-padding-top: 0 !important; }";
const PIN_PREVIEW = ".livesite { position: fixed !important; inset: 0 0 auto 0 !important; z-index: 60 !important; }";
const CTRL = "button, a[href], input, select, textarea, summary";

let assertions = 0;
const failures = [], artifacts = [], consoleNoise = [], observed = [];
const check = (target, name, cond, detail = "") => {
  assertions++;
  if (cond) { console.log(`    ok      ${name}`); return true; }
  failures.push(`${target}: ${name} ${detail}`.trim());
  console.error(`    FAIL    ${name}  ${detail}`);
  return false;
};

/** In the page: every control in `scope`, focused from ABOVE and from BELOW. */
const MEASURE = ({ scope, furniture, ctrl, skip }) => {
  const bar = document.querySelector(furniture);
  const box = bar ? bar.getBoundingClientRect() : null;
  const pos = bar ? getComputedStyle(bar).position : "absent";
  const overhang = (el) => {
    const a = getComputedStyle(el, "::after");
    if (!a || a.content === "none" || a.position !== "absolute") return { t: 0, b: 0 };
    const px = (v) => (v && v.endsWith("px") ? parseFloat(v) : 0);
    return { t: Math.max(0, -px(a.top)), b: Math.max(0, -px(a.bottom)) };
  };
  const lostTo = (el) => {
    const o = overhang(el), r = el.getBoundingClientRect(), x = Math.round(r.left + r.width / 2);
    let lost = 0;
    for (let y = Math.ceil(r.top - o.t); y <= Math.floor(r.bottom + o.b); y++) {
      if (y < 0 || y >= innerHeight) continue;
      const hit = document.elementFromPoint(x, y);
      if (hit && hit.closest(furniture) && !el.contains(hit)) lost++;
    }
    return { lost, top: Math.round(r.top) };
  };
  const out = [];
  const root = document.querySelector(scope);
  for (const el of root ? root.querySelectorAll(ctrl) : []) {
    if (el.closest(skip)) continue;
    const r0 = el.getBoundingClientRect();
    if (r0.width < 8 || r0.height < 8) continue;
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    // FROM BELOW is Shift+Tab: the control is above the viewport and the
    // browser aligns it to the TOP. FROM ABOVE is Tab: aligned to the bottom.
    const worst = [];
    for (const block of ["start", "end"]) {
      el.scrollIntoView({ block, inline: "nearest" });
      el.focus?.({ preventScroll: false });
      worst.push({ block, ...lostTo(el) });
    }
    const w = worst.reduce((a, b) => (b.lost > a.lost ? b : a));
    out.push({ text: (el.innerText || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 24), ...w });
  }
  return { present: !!box && box.height > 0, pos, h: box ? Math.round(box.height) : 0, controls: out,
    reserve: getComputedStyle(document.documentElement).scrollPaddingTop };
};

async function signIn(ctx) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.fill("input[type=email]", OWNER.email);
  await page.fill("input[type=password]", OWNER.password);
  await page.click("form button.btn.primary");
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  return page;
}

async function dashboard(browser, size, { imp, css, label }) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 });
  try {
    const page = await signIn(ctx);
    watchConsole(page, label, consoleNoise);
    if (imp) {
      await page.evaluate((as) => localStorage.setItem("dp.impersonating",
        JSON.stringify({ as, business: "Coastline Auto Detailing" })), OWNER.email);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForSelector(".impbar", { timeout: 20000 });
    }
    await settle(page, 2200);
    if (css) await page.addStyleTag({ content: css });
    const m = await page.evaluate(MEASURE, { scope: ".app-main", furniture: imp ? ".impbar" : ".topbar",
      ctrl: CTRL, skip: ".impbar, .topbar, .tabbar, .tabscrim" });
    // The frame is where the measurement ended, the topmost control focused
    // from below — the place the fault shows.
    await page.evaluate((ctrl) => {
      const el = document.querySelector(".app-main").querySelector(ctrl);
      el?.scrollIntoView({ block: "start" }); el?.focus?.();
    }, CTRL);
    const file = `${label.replace(/[^\w.-]+/g, "-")}.png`;
    await page.screenshot({ path: ART + file });
    artifacts.push(`artifacts/${ART.split(/[\\/]artifacts[\\/]/)[1]}${file}`);
    return m;
  } finally { await ctx.close(); }
}

async function intake(browser, size, { css, label, furniture = ".livesite" }) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 });
  try {
    const page = await ctx.newPage();
    watchConsole(page, label, consoleNoise);
    await page.goto(`${BASE}/website/preview`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".intake", { timeout: 20000 });
    // The preview is drawn only on a step that asks questions; step 1 is the
    // welcome, then the example sites, each refusing Continue until a chip is
    // picked. Answer and continue until it appears, at most 25 steps.
    for (let i = 0; i < 25 && !(await page.locator(".livesite").count()); i++) {
      const next = page.locator(".intake button.btn.primary").last();
      if (await next.isDisabled()) {
        const chip = page.locator(".intake button.chip");
        if (await chip.count()) await chip.first().click();
        else {   // "Any other sites": refuses until one address is written
          await page.getByRole("button", { name: "Add a website" }).click();
          await page.locator(".intake input").last().fill("example.com");
        }
      }
      await next.click();
      await page.waitForTimeout(400);
    }
    await settle(page, 1200);
    if (css) await page.addStyleTag({ content: css });
    const m = await page.evaluate(MEASURE, { scope: ".intake", furniture: `.intake > ${furniture}`, ctrl: CTRL, skip: furniture });
    // Same last frame as the dashboard: the topmost control focused from below.
    await page.evaluate(({ ctrl, skip }) => {
      const el = [...document.querySelectorAll(`.intake ${ctrl}`)].find((c) => !c.closest(skip) && !c.disabled);
      el?.scrollIntoView({ block: "start" }); el?.focus?.();
    }, { ctrl: CTRL, skip: furniture });
    const file = `${label.replace(/[^\w.-]+/g, "-")}.png`;
    await page.screenshot({ path: ART + file });
    artifacts.push(`artifacts/${ART.split(/[\\/]artifacts[\\/]/)[1]}${file}`);
    return m;
  } finally { await ctx.close(); }
}

function grade(id, m, { sticky }, sink) {
  sink(id, "subjects", m.controls.length > 0, "no controls found, so every question below was asked of nothing");
  sink(id, "present", m.present && (!sticky || m.pos === "sticky"),
    `the furniture is ${m.present ? m.pos : "absent"}, so this surface is not in the state it claims`);
  const bad = m.controls.filter((c) => c.lost > 0);
  sink(id, "reachable", m.controls.length > 0 && bad.length === 0,
    bad.slice(0, 3).map((c) => `«${c.text}» loses ${c.lost} row(s) focused from ${c.block === "start" ? "below" : "above"} (top ${c.top})`).join("; ")
      + (bad.length > 3 ? ` … and ${bad.length - 3} more of ${m.controls.length}` : ""));
}

// DECLARED, never counted from the run.
const PLAN = [
  ...SIZES.map((s) => ({ size: s, kind: "topbar" })),
  ...SIZES.map((s) => ({ size: s, kind: "impbar" })),
  ...SIZES.map((s) => ({ size: s, kind: "livesite" })),
  ...SIZES.map((s) => ({ size: s, kind: "preview-impbar" })),
];
const PREVIEW = { livesite: ".livesite", "preview-impbar": ".impbar" };
const EXPECTED = PLAN.length + 3;
const MIN_ASSERTIONS = (PLAN.length + 3) * 3;
let discovered = 0, completed = 0;
const canary = { id: "reserve-removed+preview-pinned+preview-strip-unreserved", observed_failure: false, problems: [] };

rmSync(ART, { recursive: true, force: true });
mkdirSync(ART, { recursive: true });
const browser = await chromium.launch();
try {
  for (const p of PLAN) {
    const label = `${p.size.w}x${p.size.h} ${p.kind}`;
    console.log(`  ${label}`);
    discovered++;
    const css = BREAK === "nofix" && p.kind !== "livesite" ? NO_RESERVE : null;
    const m = PREVIEW[p.kind]
      ? await intake(browser, p.size, { css, label, furniture: PREVIEW[p.kind] })
      : await dashboard(browser, p.size, { imp: p.kind === "impbar", css, label });
    // The preview is only sticky at 1000px and wider; below that it is an
    // ordinary block in the flow, and "present" asks only that it is there.
    grade(label, m, { sticky: p.kind !== "livesite" || p.size.w >= 1000 }, check);
    const worst = m.controls.reduce((a, c) => Math.max(a, c.lost), 0);
    observed.push(`${label}: ${m.controls.length} controls, furniture ${m.pos} ${m.h}px, top reserve ${m.reserve}, worst loss ${worst} row(s)`);
    completed++;
  }
  const bite = [];
  for (const [label, run] of [
    ["canary impbar 390 no reserve", () => dashboard(browser, SIZES[1], { imp: true, css: NO_RESERVE, label: "canary-impbar" })],
    ["canary livesite 1440 pinned over the form", () => intake(browser, SIZES[3], { css: PIN_PREVIEW, label: "canary-livesite" })],
    ["canary preview impbar 390 no reserve", () => intake(browser, SIZES[1], { css: NO_RESERVE, label: "canary-preview-impbar", furniture: ".impbar" })],
  ]) {
    console.log(`  ${label} — it MUST fail`);
    discovered++;
    const m = await run();
    const probs = [];
    grade(label, m, { sticky: false }, (t, name, cond, detail) => { assertions++; if (!cond) probs.push(`${name} ${detail}`); });
    const caught = probs.some((x) => x.startsWith("reachable"));
    bite.push(caught);
    canary.problems.push(`${label}: ${caught ? "caught" : "MISSED"} ${probs[0] || ""}`.trim());
    console.log(`    ${caught ? "caught" : "MISSED"} ${(probs[0] || "").slice(0, 110)}`);
    completed++;
  }
  canary.observed_failure = bite.length === 3 && bite.every(Boolean);
} finally {
  await browser.close();
}

console.log("\nWhat the surfaces measured:");
for (const o of observed) console.log("  " + o);
if (consoleNoise.length) { console.log("\nConsole:"); for (const c of consoleNoise) console.log("  " + c); }

const status = failures.length === 0 && canary.observed_failure && consoleNoise.length === 0 ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "state-furniture-clearance",
  started_at, status,
  expected_targets: EXPECTED, discovered_targets: discovered, attempted_targets: discovered,
  completed_targets: completed, skipped_targets: 0,
  assertions_executed: assertions, min_assertions: MIN_ASSERTIONS,
  assertion_floor: "5 widths x 4 surfaces (topbar, impbar, livesite, preview impbar) x 3 questions + 3 canaries x 3. "
    + "Fixed by SIZES and PLAN, never by what the run finds.",
  failures: [...failures, ...consoleNoise.map((c) => `console: ${c}`)],
  artifacts,
  warnings: [
    "Each control is focused from above AND from below; the worse of the two is graded. Only rows taken by "
      + "the named furniture count — the bottom tab bar is tabbar-clearance.mjs's question.",
    "Enters the red-strip state with a localStorage note, never a platform admin or a preview session.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: {
    sizes: SIZES.map((s) => `${s.w}x${s.h}`), furniture: [".topbar", ".impbar", ".livesite", ".intake > .impbar"],
    observed, break: BREAK || null,
  },
  canary,
});
console.log(`\n${status.toUpperCase()} — ${completed}/${EXPECTED} targets, ${assertions} assertions, `
  + `${failures.length} failure(s), canaries ${canary.observed_failure ? "caught" : "MISSED"}. Receipt ${path}`);
process.exit(status === "pass" ? 0 : 1);
