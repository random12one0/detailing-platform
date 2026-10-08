// CAN A CONTROL THAT COMES TO REST UNDER THE BACK OFFICE'S FIXED FURNITURE
// STILL BE PRESSED? — ROADMAP 9.11e, the back-office third of it.
//
//   node --env-file=.env scripts/admin-furniture-clearance.mjs
//   node --env-file=.env scripts/admin-furniture-clearance.mjs --headed
//   node --env-file=.env scripts/admin-furniture-clearance.mjs --break=rect
//   node --env-file=.env scripts/admin-furniture-clearance.mjs --break=canary
//   node scripts/receipt.mjs receipts/admin-furniture-clearance.json
//
// `BASE` overrides the dev server; the default is :5173. Credentials in `.env`.
//
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS AND WHAT IT IS A COPY OF
// ---------------------------------------------------------------------------
// `tests/fixed-furniture-is-hit-tested.test.mjs` derived the population from
// the CSS on 2026-10-07 and found **14 pieces of furniture on 7 screens, 3
// hit-tested**. Of the 11 with no hit-test, **7 sat on screens no hit-testing
// check visited at all**, and three of those seven are the back office:
//
//   .pa-top    fixed, z-index 30 — the bar that never moves
//   .pa-x      sticky, z-index 1 — a panel's own close control, 30px wearing
//              `::after { inset: -7px }`, so 44px of real hit area
//   .pa-load   fixed, z-index 50 — a THREE PIXEL progress strip over the top
//              edge, which outranks the bar beneath it
//
// It follows `scripts/tabbar-clearance.mjs`'s pattern deliberately rather than
// inventing one: the hit area is measured with `elementFromPoint`, never the
// bounding rect, and the overhang is READ OFF each element's own `::after`.
// **`.pa-x` is exactly the control that breaks a rect-only probe** — 30px of
// box, 44px of target — so a scan that measured the rect would report a legal
// control broken at every width, which is the instrument bug `tabbar-clearance`
// was written to avoid and which `--break=rect` reproduces here on purpose.
//
// ---------------------------------------------------------------------------
// THE THREE-PIXEL STRIP, AND WHY IT IS INJECTED
// ---------------------------------------------------------------------------
// `.pa-load` is drawn by `AdminPage.jsx:437` as `{busy && <div className=
// "pa-load" />}` — it exists only while an admin fetch is in flight, which is
// a few hundred milliseconds. A probe that waited to catch one would be a
// probe that usually measured nothing and said it was clean.
//
// So the strip surfaces put the app's **own class** on the page and ask
// `elementFromPoint` the same question. Nothing about the app is modified: the
// element, the class and the CSS are all the product's, placed where the
// product places them. **What is being tested is whether a press that lands in
// the top three rows reaches the control or the strip** — and because the
// strip is `z-index: 50` against `.pa-top`'s 30, it is in front of the bar as
// well.
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
//              screen where no fixed furniture can reach it, is 44px. Without
//              this the check would blame the furniture for a control that was
//              too small to begin with.
//   reachable  where the browser puts it when it is focused, 44 of those rows
//              survive. Losses are attributed by `elementFromPoint`, so "the
//              bar did it" is read off the page rather than assumed.
//   strip      STRIP SURFACES ONLY: with `.pa-load` on screen, does any
//              control lose a row to it. This is the manager's question of
//              2026-10-07 and a loss here is a real defect in `app/src`,
//              reported into ROADMAP 9.11e and NOT fixed from this file.
//
// ---------------------------------------------------------------------------
// TWO SABOTAGES
// ---------------------------------------------------------------------------
// `--break=rect` scans the bounding rect and ignores the `::after`, so every
// legal `.pa-x` must fail `legal` — which is how this file proves it measures
// the overhang rather than claiming to. `--break=canary` drops the injected
// canary, so nothing is observed and `receipt.mjs` refuses the receipt.
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

// Three of the five tabs. `now` and `pipes` are the two with the most controls
// and the tallest bodies; `who` is the one that opens a panel, which is the
// only place `.pa-x` exists. Growth and Money are charts over the same bar and
// the same body padding, so they would re-ask one question with a different
// picture behind it.
const TABS = [
  { key: "now", label: "Today" },
  { key: "who", label: "Detailers" },
  { key: "pipes", label: "System health" },
];

const SEL = ".pa-btn, .pa-tab, .pa-chip, .pa-out, .pa-edit, .pa-swap, .pa-x, button";
const ABSOLUTE = 44;
const ART = fileURLToPath(new URL("../artifacts/admin-furniture-clearance/", import.meta.url));

let assertions = 0;
const failures = [];
const artifacts = [];
const consoleNoise = [];
const observed = [];
const stripHits = [];

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
const MEASURE = ({ sel, absolute, useRect, strip, within }) => {
  const top = document.querySelector(".pa-top");
  const barBottom = top ? Math.round(top.getBoundingClientRect().bottom) : null;

  // THE STRIP, PUT ON SCREEN WITH THE APP'S OWN CLASS. `AdminPage.jsx` draws
  // exactly this element while a fetch is in flight; it is removed again
  // before this function returns so nothing persists into the screenshot's
  // own meaning.
  let injected = null;
  if (strip && !document.querySelector(".pa-load")) {
    injected = document.createElement("div");
    injected.className = "pa-load";
    injected.setAttribute("data-probe", "1");
    document.body.appendChild(injected);
  }
  const stripEl = document.querySelector(".pa-load");
  const stripBox = stripEl ? stripEl.getBoundingClientRect() : null;

  // THE OVERHANG, READ OFF THE ELEMENT rather than assumed. `.pa-x` is 30px
  // wearing `::after { inset: -7px }` — 44px of target — and a literal here
  // would stop covering the next control to use a different inset.
  const overhangOf = (el) => {
    if (useRect) return { top: 0, bottom: 0 };
    const a = getComputedStyle(el, "::after");
    if (!a || a.content === "none" || a.position !== "absolute") return { top: 0, bottom: 0 };
    const px = (v) => (v && v.endsWith("px") ? parseFloat(v) : 0);
    return { top: Math.max(0, -px(a.top)), bottom: Math.max(0, -px(a.bottom)) };
  };

  const who = (hit) => {
    if (!hit) return "nothing";
    if (hit.closest(".pa-load")) return ".pa-load";
    if (hit.closest(".pa-top")) return ".pa-top";
    if (hit.closest(".pa-x")) return ".pa-x";
    if (hit.closest(".pa-open")) return ".pa-open";
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
  // **A PANEL SURFACE MEASURES THE PANEL, NOT THE PAGE BEHIND IT.** `.pa-open`
  // is `inset: 0` at z-index 40 — a modal — so every control on the page under
  // it correctly reads 0px of hit area, and a run that measured them reported
  // five defects per width that were the product working. The panel exists in
  // this plan for one reason, `.pa-x`, and that is what it now measures.
  const scope = within ? document.querySelector(within) : document;
  if (!scope) return { barBottom, absolute, controls: [], hidden: 0, strip: null, missing: within };
  for (const el of scope.querySelectorAll(sel)) {
    const r0 = el.getBoundingClientRect();
    if (r0.width < 8 || r0.height < 8) continue;
    // THE BAR'S OWN CONTROLS ARE SKIPPED, WITH ONE EXCEPTION THAT IS THE POINT
    // OF THE STRIP SURFACES: `.pa-tab` lives inside `.pa-top`, and `.pa-load`
    // is painted OVER `.pa-top` at z-index 50 against 30. So the tabs are the
    // controls most likely to lose rows to the strip, and skipping the whole
    // bar would have measured everything except the thing at risk.
    //
    // **AND THE EXCEPTION IS FOR THE STRIP SURFACES ONLY, which the first run
    // proved by failing wrongly.** On a panel surface the detailer dialog
    // (`.pa-open`, `inset: 0`, z-index 40) is legitimately over the tab bar, so
    // the tabs measured 0px of hit area at all five widths and the run reported
    // five defects that were the product behaving correctly. A modal covering
    // what is behind it is not a clearance fault, and `.pa-open` is in the
    // furniture check's own "covers the viewport" exclusion for that reason.
    if (el.closest(".pa-top") && !(strip && el.classList.contains("pa-tab"))) continue;
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
    //    `block: "start"` because the furniture here is at the TOP.
    el.scrollIntoView({ block: "start", inline: "nearest" });
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
  // READ THE STACKING ORDER BEFORE DETACHING IT. The first run printed
  // `.pa-load 3px at y 0 z ` with the z blank, because `getComputedStyle` on a
  // removed element answers nothing -- a number quietly missing from a receipt,
  // which is the shape this repo keeps meeting.
  const stripZ = stripEl ? getComputedStyle(stripEl).zIndex : null;
  if (injected) injected.remove();
  return {
    barBottom, absolute, controls: out, hidden,
    strip: stripBox ? { top: Math.round(stripBox.top), h: Math.round(stripBox.height), z: stripZ } : null,
  };
};

// THE CANARY: take the body's reserve for the fixed bar away. `--pa-top` is
// 116px and `.pa-body`'s own padding is `calc(var(--pa-top) + 14px)`, so
// zeroing it rides the whole body up under a bar that has not moved. Whatever a
// fix looks like, a body with no reserve must lose rows to `.pa-top` again — so
// a run that observes nothing here has stopped looking.
const CANARY_CSS = `:root { --pa-top: 0px !important; } html { scroll-padding-top: 0 !important; }`;

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

// **WAIT FOR THE BODY, NOT FOR THE BAR.** The first run of this file measured
// `.pa-top bottom 106` on every surface and **0 controls**, because `/admin`
// was still showing "Reading the platform…" — the shell renders immediately
// and the platform read takes seconds. The screenshot showed it plainly; the
// numbers alone would have read as a back office with no controls in it.
// **The `subjects` question is what caught it**, which is the whole reason a
// surface with nothing on it grades as a failure instead of dropping out.
async function ready(page) {
  await page.waitForSelector(".pa-body", { timeout: 40000 });
  await page.waitForFunction(() => !document.querySelector(".pa-none"), null, { timeout: 60000 });
  await page.waitForFunction(() => !document.querySelector(".pa-load"), null, { timeout: 60000 });
  await page.waitForFunction(
    () => document.querySelectorAll(".pa-body button, .pa-body a[href]").length > 0,
    null, { timeout: 60000 });
}

async function surface(size, { tab, panel, strip, label, canary }) {
  const ctx = await browser.newContext({
    viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1,
    storageState: signedIn || undefined,
  });
  const page = await ctx.newPage();
  watchConsole(page, label, consoleNoise);
  try {
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type=email], .pa-top", { timeout: 40000 });
    if (await page.locator("input[type=email]").count()) {
      await page.fill("input[type=email]", acct.email);
      await page.fill("input[type=password]", acct.password);
      // `form button.pa-btn` is the door's own submit, the same selector
      // `admin-contrast.mjs` uses. A looser `form button` matched something
      // else on the first run and the wait below timed out on `.pa-top` with
      // nothing to say about why, which is a harness fault wearing a product
      // fault's clothes.
      await page.click("form button.pa-btn");
      try {
        await page.waitForSelector(".pa-top", { timeout: 40000 });
      } catch (e) {
        // THE DOOR'S OWN WORDS, OR THERE IS NOTHING TO ACT ON. A timeout on
        // `.pa-top` says the sign-in did not land and nothing else; the error
        // the screen is showing says which half failed.
        const said = await page.locator(".pa-err, .pa-door-in").first()
          .innerText().catch(() => "(nothing on screen)");
        throw new Error(`sign-in did not reach the back office. The door says: `
          + `${String(said).replace(/\s+/g, " ").slice(0, 200)}`);
      }
      signedIn = await ctx.storageState();
    }
    await ready(page);
    await settle(page, 1200);
    if (tab) {
      await page.locator(".pa-tab").filter({ hasText: tab.label }).first().click();
      await ready(page);
      await settle(page, 1200);
    }
    if (panel) {
      // The only place `.pa-x` exists. A back office with no detailer rows is
      // not a clean run, it is an unasked question, so the absence is reported.
      const row = page.locator(".pa-biz, .pa-row").first();
      if (await row.count()) { await row.click(); await settle(page, 1500); }
    }
    if (canary && BREAK !== "canary") await page.addStyleTag({ content: CANARY_CSS });
    await settle(page, 800);
    const m = await page.evaluate(MEASURE,
      { sel: SEL, absolute: ABSOLUTE, useRect: BREAK === "rect", strip: !!strip,
        within: panel ? ".pa-open" : null });
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
  const illegal = controls.filter((c) => c.legal < ABSOLUTE);
  sink(id, "legal", controls.length > 0 && illegal.length === 0,
    illegal.slice(0, 3).map((c) => `«${c.text}» (${c.cls}) is ${c.legal}px of hit area with nothing `
      + `over it (box ${c.rectH}px + ${c.overhang}px overhang)`).join("; ")
      + (illegal.length > 3 ? ` … and ${illegal.length - 3} more` : ""));

  // ONLY LOSSES TO THE BACK OFFICE'S OWN FURNITURE COUNT. A chip can come up
  // short against `.pa-body` or a card at a wide width — real, and not what
  // this item is about. Failing on it here would make the check go red for
  // reasons outside its own scope, which is how a check starts measuring
  // itself. Reported instead.
  const mine = (c) => Object.keys(c.lost || {}).some((k) => k === ".pa-top" || k === ".pa-load");
  const short = controls.filter((c) => c.legal >= ABSOLUTE && c.reachable < ABSOLUTE && mine(c));
  const elsewhere = controls.filter((c) => c.legal >= ABSOLUTE && c.reachable < ABSOLUTE && !mine(c));
  if (elsewhere.length) {
    observed.push(`${id}: ${elsewhere.length} control(s) short of ${ABSOLUTE}px for reasons OTHER `
      + `than the fixed furniture — worst «${elsewhere[0].text}» at ${elsewhere[0].reachable}px, `
      + `lost to ${JSON.stringify(elsewhere[0].lost)} (recorded, not this item's fault)`);
  }
  sink(id, "reachable", controls.length > 0 && short.length === 0,
    short.slice(0, 3).map((c) => `«${c.text}» (${c.cls}) is legal at ${c.legal}px but only `
      + `${c.reachable}px survive where the browser puts it (y ${c.top}..${c.bottom}, bar bottom `
      + `${m.barBottom}), lost to ${JSON.stringify(c.lost)}`).join("; ")
      + (short.length > 3 ? ` … and ${short.length - 3} more` : ""));

  if (kind !== "strip") return;
  // THE MANAGER'S QUESTION, 2026-10-07. A loss to the 3px strip is a real
  // defect in `app/src` and is NOT fixed from here — it goes into ROADMAP
  // 9.11e by name.
  const taken = controls.filter((c) => (c.lost || {})[".pa-load"] > 0);
  if (taken.length) {
    for (const c of taken.slice(0, 4)) {
      stripHits.push(`${id}: «${c.text}» (${c.cls}) loses ${c.lost[".pa-load"]} row(s) to .pa-load `
        + `at y ${c.top}..${c.bottom}`);
    }
  }
  sink(id, "strip", taken.length === 0,
    `${taken.length} control(s) lose rows to the 3px .pa-load strip (z-index ${m.strip?.z}): `
    + taken.slice(0, 3).map((c) => `«${c.text}» ${c.lost[".pa-load"]} row(s)`).join("; "));
}

// ---------------------------------------------------------------------------
// THE SURFACE LIST, DECLARED. `expected` is computed from these lists and never
// from what the run finds, so a surface that silently stops being reached
// cannot lower the bar it is measured against.
const PLAN = [
  ...SIZES.flatMap((s) => TABS.map((t) => ({ size: s, tab: t, kind: "tab" }))),
  ...SIZES.map((s) => ({ size: s, tab: TABS[1], panel: true, kind: "panel" })),
  ...SIZES.map((s) => ({ size: s, tab: TABS[0], strip: true, kind: "strip" })),
];
const QUESTIONS = { tab: 3, panel: 3, strip: 4 };
const EXPECTED = PLAN.length + 1;                       // + the canary
const MIN_ASSERTIONS = PLAN.reduce((n, p) => n + QUESTIONS[p.kind], 0) + 3;

let discovered = 0, attempted = 0, completed = 0;
const canary = { id: "the-bar-reserve-taken-away", observed_failure: false, problems: [] };

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
      + `, .pa-top bottom ${m.barBottom}`
      + (m.strip ? `, .pa-load ${m.strip.h}px at y ${m.strip.top} z ${m.strip.z}` : "")
      + `, worst reachable ${worst === 999 ? "n/a" : worst + "px"}`);
    completed++;
  }

  console.log("  canary — the bar's reserve taken away; it MUST fail");
  discovered++; attempted++;
  {
    const m = await surface(SIZES[0], { tab: TABS[0], kind: "tab", label: "canary", canary: true });
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
if (stripHits.length) {
  console.log("\nTHE 3px STRIP TOOK ROWS FROM A CONTROL — a real defect in app/src, for ROADMAP 9.11e:");
  for (const s of stripHits) console.log("  " + s);
}
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
    "5 widths x (3 tabs x 3 questions + 1 panel x 3 + 1 strip x 4) + 1 canary x 3. Fixed by SIZES, "
    + "TABS and the question list per surface kind, never by what the run finds: a surface with no "
    + "matching controls grades as failures rather than dropping out, so the number cannot fall "
    + "without a diff. A tripwire on the code, not a run-time check.",
  failures: [...failures.map(redact), ...consoleNoise.map((c) => `console: ${redact(c)}`)],
  artifacts,
  warnings: [
    "Measures the HIT AREA — bounding rect plus the overhang read off each element's own ::after "
    + "— never the rect. `.pa-x` is 30px of box and 44px of target, so a rect-only scan reports a "
    + "legal control broken at every width. `--break=rect` is that bug on purpose.",
    ".pa-load is INJECTED with the app's own class on the strip surfaces, because the product draws "
    + "it only while a fetch is in flight. Nothing about the app is modified; a probe that waited to "
    + "catch one would usually measure nothing and call it clean.",
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
    furniture: [".pa-top", ".pa-x", ".pa-load"],
    strip_findings: stripHits,
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
