// CAN A CONTROL THAT COMES TO REST UNDER THE BACK OFFICE'S FIXED FURNITURE
// STILL BE PRESSED? — ROADMAP 9.11e, the back-office share of it.
//
//   node --env-file=.env scripts/admin-furniture-clearance.mjs
//   node --env-file=.env scripts/admin-furniture-clearance.mjs --headed
//   node --env-file=.env scripts/admin-furniture-clearance.mjs --break=rect
//   node --env-file=.env scripts/admin-furniture-clearance.mjs --break=canary
//   node scripts/receipt.mjs receipts/admin-furniture-clearance.json
//
// RETARGETED 2026-10-12 at the new back office (9.12a's `office/`). The first
// version of this file measured the old screen's `.pa-top` / `.pa-x` /
// `.pa-load`; that screen is deleted, so it asked its questions of nothing.
// Same file, same check_id, still `/admin` — only the selectors moved.
//
// `BASE` overrides the dev server; the default is :5173. Credentials in `.env`.
//
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS AND WHAT IT IS A COPY OF
// ---------------------------------------------------------------------------
// `tests/fixed-furniture-is-hit-tested.test.mjs` derives the population from
// the CSS every run. Two rows of it are the new back office, on a screen no
// hit-testing check visits:
//
//   .bo-rail    sticky side rail on desktop; fixed 68px bottom dock on phones,
//               z-index 25 — the furniture is at the BOTTOM here, not the top
//   .bo-panel   fixed sheet, z-index 31 over its own scrim (z-index 30) — a
//               right-hand sheet on desktop, a 92dvh bottom sheet on phones,
//               with its own inner scroll (`.bo-pscroll`)
//
// It follows `scripts/tabbar-clearance.mjs`'s pattern deliberately rather than
// inventing one: the hit area is measured with `elementFromPoint`, never the
// bounding rect, and the overhang is READ OFF each element's own `::after`.
// **`.bo-thead button` is the control that breaks a rect-only probe** — its
// `::after` wears `inset: -16px -4px -8px`, so a scan that measured the rect
// would misjudge every table header, which is the instrument bug
// `tabbar-clearance` was written to avoid and which `--break=rect` reproduces
// here on purpose.
//
// ---------------------------------------------------------------------------
// NO STRIP SURFACES, AND WHY
// ---------------------------------------------------------------------------
// The old screen had `.pa-load`, a 3px progress strip that outranked the bar,
// so this file injected it with the app's own class. The new office has no
// equivalent — grep for `bo-load`, a busy strip or a progress element finds
// nothing — and an injected strip would test the instrument, not the product.
// If one is added, it belongs in the furniture population the way `.pa-load`
// was, with surfaces of its own.
//
// ---------------------------------------------------------------------------
// WHICH ACCOUNT THIS SIGNS IN AS, IN ONE PLACE SO NOBODY HAS TO GUESS
// ---------------------------------------------------------------------------
// A **throwaway platform admin, created for this run and deleted at the end**
// — `makeAdmin()` / `dropAdmin()` from `scripts/admin-account.mjs`, the shared
// helper five other scripts use. The email is the constant below; **the
// password is random per run, never printed and never written to disk**, and
// the `platform_admins` row carries a note saying it is a test account. This is
// not a standing account: `scripts/admin-account.mjs`'s own header records why
// — the version before it published a fixed password for the one account that
// can read every tenant.
//
// **SO THIS SCRIPT WRITES TO THE LIVE DATABASE** — one auth user and one
// `platform_admins` row, both removed in a `finally`. That is the only write it
// makes. It does NOT clear `rate_hits` the way `tabbar-clearance.mjs` does: the
// back office geocodes nothing, so there is no address budget to buy, and
// clearing a shared bucket nobody needed cleared is how one lane silently
// changes another's numbers (`docs/shared-resources.md` § 5).
//
// **DO NOT WRAP THIS IN `timeout`.** `docs/gotchas.md` 90: a `finally` does not
// run on SIGTERM, and the `finally` here is what deletes an account that can
// read every detailer in the product.
//
// **AND BECAUSE THAT WILL HAPPEN ANYWAY, THE CLEANUP RUNS AT BOTH ENDS.** A run
// killed at a cap, closed with the terminal, or stopped from a task list leaves
// **one `platform_admins` row and one auth user behind, and they stay until the
// next run of this file.** That is the honest statement of the window: not
// "never", not "briefly" — until somebody runs this again. So before it creates
// anything, this script deletes any existing account at the constant below and
// SAYS SO IF IT FOUND ONE. A leftover that is swept up silently is a leftover
// nobody learns about.
//
// **`tests/platform-admins-declared.test.mjs` is what notices in the meantime.**
// A surviving row is an UNDECLARED platform admin and that check goes red naming
// it, which is the backstop for the window this cleanup cannot close.
//
// ---------------------------------------------------------------------------
// WHAT IT ASKS
// ---------------------------------------------------------------------------
//   subjects   controls matched at all, so the questions below were asked of
//              something. A surface with none grades as failures rather than
//              dropping out.
//   legal      the control's own hit area, measured in the middle of the
//              screen where no fixed furniture can reach it, is 44px − the
//              loop's own ±1px (a 44.0 target on a fractional edge reads 43).
//              Without this the check would blame the furniture for a control
//              that was too small to begin with.
//   reachable  where the browser puts it when it is focused, 44 of those rows
//              survive. Losses are attributed by `elementFromPoint`, so "the
//              dock did it" is read off the page rather than assumed. The
//              scroll uses `block: "end"` because the furniture here is at the
//              BOTTOM — the old screen's `"start"` would park controls at the
//              top, where nothing covers them, and report a clean sheet over a
//              dock that eats the bottom row of everything.
//
// ---------------------------------------------------------------------------
// TWO SABOTAGES
// ---------------------------------------------------------------------------
// `--break=rect` scans the bounding rect and ignores the `::after`, so every
// legal `.bo-thead button` (16px of top overhang) must fail `legal` — which is
// how this file proves it measures the overhang rather than claiming to.
// `--break=canary` drops the injected canary, so nothing is observed and
// `receipt.mjs` refuses the receipt.
import "../tests/_env.mjs";

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";
import { dropAdmin, makeAdmin } from "./admin-account.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const HEADED = process.argv.includes("--headed");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const BASE = process.env.BASE || "http://localhost:5173";

// Distinct from `admin-contrast-test@` and `shoot-admin@` ON PURPOSE: two runs
// sharing one throwaway admin means whichever finishes first deletes the other's
// account mid-measurement, and the victim's failure looks like a product fault.
//
// The marker below sits on the line DIRECTLY above the constant on purpose:
// `tests/mail-sink.test.mjs` declares a comment's own line and the ONE after it,
// so a marker four lines up reads as prose and the address reads as undeclared.
// mail-sink: a login; autoconfirm is on and no custom SMTP, so no mail is sent.
const ADMIN_EMAIL = "admin-furniture-test@detailplatform.com";

// 320 FIRST — the narrowest supported width, and the one the design rules name.
const SIZES = [
  { w: 320, h: 844 }, { w: 392, h: 844 }, { w: 768, h: 1024 },
  { w: 1440, h: 900 }, { w: 1920, h: 1080 },
];

// All four places. `detailers` is the one that opens a panel, which is the
// only place `.bo-panel` exists; the other three are tall bodies over the
// same phone dock, each with its own controls.
const TABS = [
  { key: "today", label: "Today" },
  { key: "detailers", label: "Detailers" },
  { key: "money", label: "Money" },
  { key: "system", label: "System" },
];

const SEL = ".bo-btn, .bo-nav, .bo-px, .bo-fchip, .bo-find-top, .bo-row, button, a[href]";
const ABSOLUTE = 44;
const ART = fileURLToPath(new URL("../artifacts/admin-furniture-clearance/", import.meta.url));

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
 * `useRect` is the `--break=rect` sabotage: scan the bounding box and ignore
 * the `::after`, which is the instrument bug this file exists not to have.
 */
const MEASURE = ({ sel, absolute, useRect, within }) => {
  const rail = document.querySelector(".bo-rail");
  const railBox = rail ? rail.getBoundingClientRect() : null;
  // On phones the rail is a fixed bottom dock; on desktop it is a sticky side
  // column nothing scrolls under. The number that matters is the dock's TOP on
  // a phone width, null everywhere else — read off the page, not assumed.
  const railTop = railBox && getComputedStyle(rail).position === "fixed"
    ? Math.round(railBox.top) : null;

  // THE OVERHANG, READ OFF THE ELEMENT rather than assumed. `.bo-thead
  // button` wears `::after { inset: -16px -4px -8px }` and `.bo-px` wears
  // `inset: -2px` — and a literal here would stop covering the next control
  // to use a different inset.
  const overhangOf = (el) => {
    if (useRect) return { top: 0, bottom: 0 };
    const a = getComputedStyle(el, "::after");
    if (!a || a.content === "none" || a.position !== "absolute") return { top: 0, bottom: 0 };
    const px = (v) => (v && v.endsWith("px") ? parseFloat(v) : 0);
    return { top: Math.max(0, -px(a.top)), bottom: Math.max(0, -px(a.bottom)) };
  };

  const who = (hit) => {
    if (!hit) return "nothing";
    if (hit.closest(".bo-rail")) return ".bo-rail";
    if (hit.closest(".bo-panel")) return ".bo-panel";
    if (hit.closest(".bo-scrim")) return ".bo-scrim";
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
  // **A PANEL SURFACE MEASURES THE PANEL, NOT THE PAGE BEHIND IT.** `.bo-scrim`
  // is `inset: 0` at z-index 30 — a modal scrim — so every control on the page
  // under it correctly reads 0px of hit area. The panel surface exists for
  // `.bo-panel` itself: its close control, its buttons, its inner scroll.
  const scope = within ? document.querySelector(within) : document;
  if (!scope) return { railTop, absolute, controls: [], hidden: 0, missing: within };
  for (const el of scope.querySelectorAll(sel)) {
    const r0 = el.getBoundingClientRect();
    if (r0.width < 8 || r0.height < 8) continue;
    // THE DOCK'S OWN CONTROLS ARE SKIPPED. `.bo-nav` lives inside `.bo-rail`
    // and the rail is always on screen by construction — this script clicks
    // those very buttons to navigate — so measuring their "reachable" would
    // ask whether fixed furniture comes to rest under itself. Their `legal`
    // size is asked by `sweep-tap-targets.mjs`, which owns that question.
    if (el.closest(".bo-rail")) continue;
    // A CONTROL INSIDE A CLOSED FOLD IS NOT A BROKEN CONTROL. It keeps a
    // bounding rect while an ancestor takes it off the screen, so the
    // reachable count is 0 and a run would report a screen full of faults.
    // `docs/gotchas.md`'s oldest entry is this. COUNTED, never silently
    // dropped — the tally is printed and goes in the receipt.
    if (typeof el.checkVisibility === "function"
      && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) {
      hidden++;
      continue;
    }
    const o = overhangOf(el);

    // 1. LEGAL — in the middle of the screen, where no fixed furniture reaches.
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const rc = el.getBoundingClientRect();
    const legal = rows(el, rc.top - o.top, rc.bottom + o.bottom,
      Math.round(rc.left + rc.width / 2)).n;

    // 2. REACHABLE — where the browser puts it when it is FOCUSED. Focusing is
    //    what a keyboard user does and the only thing `scroll-padding` is
    //    honoured for; `scrollIntoView` alone moves nothing for an element the
    //    browser already considers visible under a painted bar, which is the
    //    trap `keyboard-walk.mjs` and `tabbar-clearance.mjs` both record.
    //    `block: "end"` because the furniture here is at the BOTTOM.
    el.scrollIntoView({ block: "end", inline: "nearest" });
    if (typeof el.focus === "function") el.focus({ preventScroll: false });
    const rn = el.getBoundingClientRect();
    const got = rows(el, rn.top - o.top, rn.bottom + o.bottom,
      Math.round(rn.left + rn.width / 2));

    out.push({
      text: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 16),
      cls: String(el.className || "").split(" ")[0],
      rectH: Math.round(rc.height), overhang: o.top + o.bottom,
      legal, reachable: got.n, lost: got.lost,
      top: Math.round(rn.top), bottom: Math.round(rn.bottom),
    });
  }
  return { railTop, absolute, controls: out, hidden };
};

// THE CANARY: take the dock's reserve away. Whatever the reserve looks like,
// a body with no bottom reserve must lose rows to `.bo-rail` on a phone width
// again — so a run that observes nothing here has stopped looking.
const CANARY_CSS = `html { scroll-padding-bottom: 0 !important; }`;

rmSync(ART, { recursive: true, force: true });
mkdirSync(ART, { recursive: true });

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — run with --env-file=.env. "
    + "Nothing was measured and no receipt was written, because a receipt from a run that never "
    + "signed in is a clean-looking record of nothing.");
  process.exit(1);
}

/**
 * Delete any account left at ADMIN_EMAIL by an earlier run that did not reach
 * its `finally`. Returns true when one was found, so the run can say so.
 *
 * Finding it needs the auth user list: `dropAdmin` takes an id, and a killed
 * run took its id to the grave.
 */
async function dropLeftover() {
  const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
  const all = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: H }))
    .json().catch(() => ({}));
  const left = (all.users ?? []).find((u) => u.email === ADMIN_EMAIL);
  if (!left) return false;
  await dropAdmin(URL_, KEY, left.id);
  return true;
}

const leftover = await dropLeftover();
console.log(leftover
  ? `found a LEFTOVER ${ADMIN_EMAIL} from a run that did not reach its teardown — deleted it before starting`
  : `no leftover ${ADMIN_EMAIL}`);

const acct = await makeAdmin(URL_, KEY, ADMIN_EMAIL);
if (!acct) {
  console.error("could not create the throwaway platform admin; nothing measured, no receipt written");
  process.exit(1);
}
const redact = (t) => String(t).split(acct.password).join("[password]");
console.log(`signed in as ${acct.email} — created for this run, deleted at the end`);

let signedIn = null;
let browser = null;

// **WAIT FOR THE PLACE, NOT FOR THE RAIL.** The old screen's first run
// measured 0 controls because `/admin` was still showing its loading state —
// the shell renders immediately and the data read takes seconds. The
// screenshot showed it plainly; the numbers alone would have read as a back
// office with no controls in it. **The `subjects` question is what catches
// it**, which is the whole reason a surface with nothing on it grades as a
// failure instead of dropping out.
async function ready(page) {
  await page.waitForSelector(".bo-rail", { timeout: 40000 });
  // THE BODY, NOT THE RAIL. The rail renders while the place still says
  // "Reading the platform…" (`.bo-none`), and a wait on the rail alone
  // measures an empty body with zero controls. The retarget's first run did
  // exactly that on all 26 surfaces — the `subjects` question caught it,
  // which is why a surface with nothing on it grades as a failure.
  await page.waitForFunction(() => !document.querySelector(".bo-none"), null, { timeout: 90000 });
  const err = await page.locator(".bo-error").first().innerText().catch(() => "");
  if (err) throw new Error(`the back office loaded its shell but its data read failed: `
    + `${String(err).replace(/\s+/g, " ").slice(0, 200)} (ROADMAP 9.18 owns the platform-admin read; `
    + `this run stops loudly rather than measuring one Try-again button and calling it a surface)`);
  await page.waitForFunction(
    () => document.querySelectorAll(".bo-main button, .bo-main a[href]").length > 0,
    null, { timeout: 60000 });
}

async function surface(size, { tab, panel, label, canary }) {
  const ctx = await browser.newContext({
    viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1,
    storageState: signedIn || undefined,
  });
  const page = await ctx.newPage();
  watchConsole(page, label, consoleNoise);
  try {
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type=email], .bo-rail", { timeout: 40000 });
    if (await page.locator("input[type=email]").count()) {
      await page.fill("input[type=email]", acct.email);
      await page.fill("input[type=password]", acct.password);
      // `form button.bo-btn.go` is the door's own submit. A looser
      // `form button` risks matching the show-password toggle instead, which
      // is a harness fault wearing a product fault's clothes.
      await page.click("form button.bo-btn.go");
      try {
        await page.waitForSelector(".bo-rail", { timeout: 40000 });
      } catch (e) {
        // THE DOOR'S OWN WORDS, OR THERE IS NOTHING TO ACT ON. A timeout on
        // `.bo-rail` says the sign-in did not land and nothing else; the error
        // the screen is showing says which half failed.
        const said = await page.locator(".bo-error, .bo-door").first()
          .innerText().catch(() => "(nothing on screen)");
        throw new Error(`sign-in did not reach the back office. The door says: `
          + `${String(said).replace(/\s+/g, " ").slice(0, 200)}`);
      }
      signedIn = await ctx.storageState();
    }
    await ready(page);
    await settle(page, 1200);
    if (tab) {
      await page.locator(".bo-nav").filter({ hasText: tab.label }).first().click();
      await ready(page);
      await settle(page, 1200);
    }
    if (panel) {
      // The only place `.bo-panel` exists. A back office with no detailer rows
      // is not a clean run, it is an unasked question, so the absence is
      // reported: the panel surface grades `subjects` on `.bo-panel` being
      // there, and MEASURE reports `missing` when it never opened.
      const row = page.locator(".bo-row").first();
      if (await row.count()) { await row.click(); await settle(page, 1500); }
    }
    if (canary && BREAK !== "canary") await page.addStyleTag({ content: CANARY_CSS });
    await settle(page, 800);
    const m = await page.evaluate(MEASURE,
      { sel: SEL, absolute: ABSOLUTE, useRect: BREAK === "rect",
        within: panel ? ".bo-panel" : null });
    // THE FRAME IS TAKEN WHERE THE MEASUREMENT ENDED — the last control
    // focused, sitting wherever the browser left it. A shot of the top of the
    // page would be a picture of somewhere the numbers did not come from.
    const file = `${label.replace(/[^\w.-]+/g, "-")}.png`;
    await page.screenshot({ path: ART + file, animations: "disabled" });
    artifacts.push("artifacts/admin-furniture-clearance/" + file);
    return m;
  } finally {
    await ctx.close();
  }
}

function grade(id, m, kind, sink) {
  const controls = m.controls;
  sink(id, "subjects", controls.length > 0,
    m.missing
      ? `${m.missing} is not on screen, so the panel never opened and this surface asked nothing`
      : "no controls matched on this surface, so every question below was asked of nothing");
  // 44 − 1: the row loop counts INTEGER rows and carries ±1px at a fractional
  // edge — a 36px chip wearing exactly 8px of overhang (44.0 of target) reads
  // 43 when its box lands on a fraction, the marketing script's `.htab`
  // precedent. The exact figure is still printed, and a shortfall of 2 or
  // more still fails, so `--break=rect` (5+ px out) keeps biting by a mile.
  const illegal = controls.filter((c) => c.legal < ABSOLUTE - 1);
  sink(id, "legal", controls.length > 0 && illegal.length === 0,
    illegal.slice(0, 3).map((c) => `«${c.text}» (${c.cls}) is ${c.legal}px of hit area with nothing `
      + `over it (box ${c.rectH}px + ${c.overhang}px overhang)`).join("; ")
      + (illegal.length > 3 ? ` … and ${illegal.length - 3} more` : ""));

  // ONLY LOSSES TO THE BACK OFFICE'S OWN FURNITURE COUNT. A chip can come up
  // short against `.bo-main` or a card at a wide width — real, and not what
  // this item is about. Failing on it here would make the check go red for
  // reasons outside its own scope, which is how a check starts measuring
  // itself. Reported instead.
  const mine = (c) => Object.keys(c.lost || {}).some((k) => k === ".bo-rail");
  const short = controls.filter((c) => c.legal >= ABSOLUTE && c.reachable < ABSOLUTE && mine(c));
  const elsewhere = controls.filter((c) => c.legal >= ABSOLUTE && c.reachable < ABSOLUTE && !mine(c));
  if (elsewhere.length) {
    observed.push(`${id}: ${elsewhere.length} control(s) short of ${ABSOLUTE}px for reasons OTHER `
      + `than the fixed furniture — worst «${elsewhere[0].text}» at ${elsewhere[0].reachable}px, `
      + `lost to ${JSON.stringify(elsewhere[0].lost)} (recorded, not this item's fault)`);
  }
  sink(id, "reachable", controls.length > 0 && short.length === 0,
    short.slice(0, 3).map((c) => `«${c.text}» (${c.cls}) is legal at ${c.legal}px but only `
      + `${c.reachable}px survive where the browser puts it (y ${c.top}..${c.bottom}, dock top `
      + `${m.railTop}), lost to ${JSON.stringify(c.lost)}`).join("; ")
      + (short.length > 3 ? ` … and ${short.length - 3} more` : ""));
}

// ---------------------------------------------------------------------------
// THE SURFACE LIST, DECLARED. `expected` is computed from these lists and never
// from what the run finds, so a surface that silently stops being reached
// cannot lower the bar it is measured against.
const PLAN = [
  ...SIZES.flatMap((s) => TABS.map((t) => ({ size: s, tab: t, kind: "tab" }))),
  ...SIZES.map((s) => ({ size: s, tab: TABS[1], panel: true, kind: "panel" })),
];
const QUESTIONS = { tab: 3, panel: 3 };
const EXPECTED = PLAN.length + 1;                       // + the canary
const MIN_ASSERTIONS = PLAN.reduce((n, p) => n + QUESTIONS[p.kind], 0) + 3;

let discovered = 0, attempted = 0, completed = 0;
const canary = { id: "the-dock-reserve-taken-away", observed_failure: false, problems: [] };

try {
  browser = await chromium.launch({ headless: !HEADED });

  for (const p of PLAN) {
    const label = `${p.size.w}x${p.size.h} ${p.kind}:${p.tab.key}`;
    console.log(`  ${label}`);
    discovered++; attempted++;
    const m = await surface(p.size, { ...p, label });
    grade(label, m, p.kind, check);
    const worst = m.controls.reduce((a, c) => (c.reachable < a ? c.reachable : a), 999);
    observed.push(`${label}: ${m.controls.length} visible control(s)`
      + (m.hidden ? ` (+${m.hidden} inside closed folds, not measured)` : "")
      + `, dock top ${m.railTop === null ? "n/a (side rail, nothing scrolls under it)" : m.railTop}`
      + `, worst reachable ${worst === 999 ? "n/a" : worst + "px"}`);
    completed++;
  }

  console.log("  canary — the dock's reserve taken away; it MUST fail");
  discovered++; attempted++;
  {
    // MONEY, not today: the canary must bite where controls actually reach the
    // dock. Today's body is short — nothing scrolls, zeroing the reserve
    // changes nothing, and the first version of this file MISSED its canary on
    // a 3-control clean surface. Money's bottom row loses 32 rows to the dock.
    const m = await surface(SIZES[0], { tab: TABS[2], kind: "tab", label: "canary", canary: true });
    grade("canary", m, "tab", (t, name, cond, detail) => {
      assertions++;
      if (cond) return;
      canary.problems.push(`${name} ${detail}`.trim());
    });
    canary.observed_failure = canary.problems.some((p) => p.startsWith("reachable"));
    console.log(`    ${canary.observed_failure ? "caught" : "MISSED"}`
      + `${canary.problems.length ? " — " + canary.problems[0].slice(0, 110) : ""}`);
    completed++;
  }
} finally {
  // THE ACCOUNT GOES FIRST AND IT GOES WHATEVER HAPPENED. An account that can
  // read every detailer in the product must not outlive the run that needed it.
  if (browser) await browser.close().catch(() => {});
  await dropAdmin(URL_, KEY, acct.id);
  console.log(`dropped ${acct.email}`);
}

console.log("\nWhat the surfaces measured:");
for (const o of observed) console.log("  " + redact(o));
if (consoleNoise.length) {
  console.log("\nConsole and refused requests:");
  for (const c of consoleNoise) console.log("  " + redact(c));
}

const status = failures.length === 0 && canary.observed_failure && consoleNoise.length === 0
  ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "admin-furniture-clearance",
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
    "5 widths x (4 places x 3 questions + 1 panel x 3) + 1 canary x 3. Fixed by SIZES, "
    + "TABS and the question list per surface kind, never by what the run finds: a surface with no "
    + "matching controls grades as failures rather than dropping out, so the number cannot fall "
    + "without a diff. A tripwire on the code, not a run-time check.",
  failures: [...failures.map(redact), ...consoleNoise.map((c) => `console: ${redact(c)}`)],
  artifacts,
  warnings: [
    "Measures the HIT AREA — bounding rect plus the overhang read off each element's own ::after "
    + "— never the rect. `.bo-thead button` wears 16px of top overhang, so a rect-only scan "
    + "misjudges every table header. `--break=rect` is that bug on purpose.",
    "Signs in as a THROWAWAY platform admin created for this run and deleted in a finally, AND "
    + "any leftover at that address is deleted before the run starts. Do not wrap this script in "
    + "`timeout`: docs/gotchas.md 90, a finally does not run on SIGTERM, and a killed run leaves "
    + "one platform_admins row until the next run of this file. "
    + "tests/platform-admins-declared.test.mjs reddens on it in the meantime.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: {
    sizes: SIZES.map((s) => `${s.w}x${s.h}`),
    tabs: TABS.map((t) => t.key),
    surface_kinds: Object.keys(QUESTIONS),
    absolute: ABSOLUTE,
    furniture: [".bo-rail", ".bo-panel"],
    leftover_admin_found_at_start: leftover,
    observed,
    sabotage: BREAK || null,
  },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${completed}/${EXPECTED} targets, ${assertions} assertions, `
  + `${failures.length} failure(s), canary ${canary.observed_failure ? "caught" : "MISSED"}.`
  + ` Receipt ${path}`);
for (const f of failures) console.log("  · " + redact(f));
process.exit(status === "pass" ? 0 : 1);
