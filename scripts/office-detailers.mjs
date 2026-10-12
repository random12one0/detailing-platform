// ROADMAP 9.12a slice 1 — the new back office's Detailers place, in a real
// browser, at 1440, 768 and 390.
//
//   node scripts/office-detailers.mjs            (dev server on :5173, credentials in .env)
//   node scripts/office-detailers.mjs --lite     (the ?lite=1 reduced-motion path)
//   node scripts/office-detailers.mjs --break=blind
//
// WHAT IT ASKS, each from the done-when of 9.12a:
//   1. Every row in the platform read is drawn (rows drawn == rows in the payload).
//   2. Nothing overflows sideways and no two cells of a row overlap.
//   3. None of the mockup's explanation lines is on the page, and there are no
//      old-tab furniture classes (`pa-tab`) on this route.
//   4. THE CUSTOMER-FACING RULE: for an account with no phone number, opening its
//      panel offers no Text or Call button and no sentence says "ring". And the
//      other half, which keeps the first honest: an account WITH a phone number
//      does offer both. "No button found" is also what a wrong selector reports.
//   5. The panel opens, Escape closes it, focus comes back. Ctrl K finds a
//      detailer by name and opens the same panel.
//   6. The bubble view draws one bubble per row.
//   7. The chips, the view switch and the close button have 44px of REAL hit
//      area, probed with elementFromPoint (a bounding rect cannot measure the
//      negative-inset ::after).
//   8. The console is silent.
//
// THE CANARY injects a fake phone button into a no-phone panel and a fake
// overlapping cell into a row, and requires the same inspector to name both.
// `--break=blind` blinds the phone rule inside the inspector, which must turn the
// canary red; it writes `receipts/office-detailers.sabotage.json`.
//
// Signs in as a THROWAWAY platform admin, created here and deleted in a finally
// (scripts/admin-account.mjs). Do not wrap in `timeout` (docs/gotchas.md 90).

import "../tests/_env.mjs";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";
import { dropAdmin, makeAdmin } from "./admin-account.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const BASE = process.env.BASE || "http://localhost:5173";
const LITE = process.argv.includes("--lite");
const ADMIN_EMAIL = "office-detailers-test@detailplatform.com";
const SIZES = [{ w: 1440, h: 900 }, { w: 768, h: 1024 }, { w: 390, h: 844 }];
const ART = "artifacts/office-detailers";
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — nothing measured, no receipt written.");
  process.exit(1);
}
// This project must be the platform's own, never the real business.
if (!URL_.includes("kguqylyzgyzfktkfnhjb")) {
  console.error("SUPABASE_URL is not project kguqylyzgyzfktkfnhjb — refusing to run.");
  process.exit(1);
}

let assertions = 0;
const failures = [];
const consoleNoise = [];
const artifacts = [];
const observed = {};
const check = (where, name, cond, detail = "") => {
  assertions++;
  if (cond) { console.log(`    ok    ${name}`); return; }
  failures.push(`${where}: ${name} ${detail}`.trim());
  console.error(`    FAIL  ${name}  ${detail}`);
};

// Words that only ever explained a page to a reviewer. None may reach the screen.
const EXPLAINERS = [
  "All 14 in one list", "Click anyone to see everything", "Tap a red number", "Bigger bubble",
  "Usage bar", "Each square is one live site", "How the business is doing", "Quiet when everything works. Loud",
];

// ONE INSPECTOR, run in the page, used by the real questions AND the canary.
const INSPECT = (blind) => {
  const out = { phoneButtons: [], ringWords: [], overlaps: [], overflowX: false, explainers: [], oldTabs: 0 };
  out.overflowX = document.documentElement.scrollWidth > window.innerWidth + 1;
  out.oldTabs = document.querySelectorAll(".pa-tab").length;
  const text = document.body.innerText;
  out.explainers = EXPLAINERS_IN_PAGE.filter((s) => text.includes(s));
  const panel = document.querySelector(".bo-panel");
  if (panel) {
    if (!blind) {
      for (const a of panel.querySelectorAll('a[href^="tel:"], a[href^="sms:"]')) out.phoneButtons.push(a.getAttribute("href"));
      for (const b of panel.querySelectorAll("a, button")) if (/^(text|call)$/i.test(b.textContent.trim())) out.phoneButtons.push(b.textContent.trim());
    }
    if (/\bring (them|him|her)\b|on the phone/i.test(panel.innerText)) out.ringWords.push(panel.innerText.slice(0, 60));
  }
  for (const row of document.querySelectorAll(".bo-row")) {
    const cells = [...row.children].filter((c) => c.getBoundingClientRect().width > 0 && getComputedStyle(c).display !== "none");
    const rects = cells.map((c) => [c.className, c.getBoundingClientRect()]);
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i][1], b = rects[j][1];
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > 1 && h > 1) out.overlaps.push(`${row.querySelector("b")?.textContent}: ${rects[i][0]} x ${rects[j][0]}`);
    }
  }
  return out;
};
const inspect = (page, blind = false) => page.evaluate(`(() => { const EXPLAINERS_IN_PAGE = ${JSON.stringify(EXPLAINERS)}; return (${INSPECT.toString()})(${blind}); })()`);

// 44px of real hit area: from the control's centre, walk 21px up and down and
// require the press to land on the control (or inside it).
const hitProbe = (page, selector) => page.evaluate((sel) => {
  const bad = [];
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (const dy of [-21, 21]) {
      const y = cy + dy;
      if (y < 0 || y > innerHeight) continue;
      const hit = document.elementFromPoint(cx, y);
      if (!hit || !(el === hit || el.contains(hit))) bad.push(`${(el.textContent || el.getAttribute("aria-label") || sel).trim().slice(0, 24)} @${dy}`);
    }
  }
  return bad;
}, selector);

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const all = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: H })).json().catch(() => ({}));
const left = (all.users ?? []).find((u) => u.email === ADMIN_EMAIL);
if (left) { await dropAdmin(URL_, KEY, left.id); console.log("deleted a leftover throwaway admin first"); }
console.log(`writing: one throwaway platform admin on ${new URL(URL_).host}, removed when this run ends`);
const acct = await makeAdmin(URL_, KEY, ADMIN_EMAIL);
if (!acct) { console.error("could not create the throwaway admin; nothing measured"); process.exit(1); }
const redact = (t) => String(t).split(acct.password).join("[password]");

let browser = null;
let signedIn = null;
const canary = { id: "injected-phone-button-and-overlapping-cell", observed_failure: false };
let completed = 0, rowsSeen = 0, noPhoneSeen = 0, withPhoneSeen = 0;
mkdirSync(ART, { recursive: true });
try {
  browser = await chromium.launch();
  for (const size of SIZES) {
    const where = `${size.w}${LITE ? " lite" : ""}`;
    console.log(`\n${where}`);
    const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, storageState: signedIn || undefined });
    const page = await ctx.newPage();
    watchConsole(page, where, consoleNoise);
    let payload = null;
    page.on("response", async (res) => {
      if (!res.url().includes("/functions/v1/platform-admin") || res.request().method() !== "POST") return;
      try { const j = await res.json(); if (j?.rows) payload = j; } catch { /* not the list */ }
    });
    if (!signedIn) {
      await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("input[type=email]", { timeout: 40000 });
      await page.fill("input[type=email]", acct.email);
      await page.fill("input[type=password]", acct.password);
      await page.click("form button[type=submit]");
      await page.waitForSelector(".bo-rail", { timeout: 40000 });
      signedIn = await ctx.storageState();
    }
    await page.goto(`${BASE}/admin${LITE ? "?lite=1" : ""}#detailers`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".bo-row", { timeout: 60000 });
    await settle(page, 1600);

    const rows = payload?.rows ?? [];
    check(where, "the platform read arrived", rows.length >= 2, `rows ${rows.length}`);
    const drawn = await page.locator(".bo-row").count();
    rowsSeen = rows.length;
    check(where, `every row in the payload is drawn (${drawn} of ${rows.length})`, drawn === rows.length);

    let o = await inspect(page);
    observed[`${where} list`] = o;
    check(where, "no sideways overflow", !o.overflowX);
    check(where, "no two cells of a row overlap", o.overlaps.length === 0, o.overlaps.slice(0, 3).join(" | "));
    check(where, "none of the mockup's explanation lines is on the page", o.explainers.length === 0, o.explainers.join(" | "));
    check(where, "no old tab bar on this route", o.oldTabs === 0);
    await page.screenshot({ path: `${ART}/list-${size.w}.png`, fullPage: false }); artifacts.push(`${ART}/list-${size.w}.png`);

    // HIT AREAS
    for (const [sel, name] of [[".bo-fchip", "filter chips"], [".bo-seg button", "view switch"]]) {
      const bad = await hitProbe(page, sel);
      check(where, `${name} have 44px of hit area`, bad.length === 0, bad.join(" | "));
    }

    // The phone rule, both halves. Find one account of each kind from the PAYLOAD.
    const hasPhone = (r) => String(r.setup_inputs?.business?.contact_phone ?? "").trim() !== "";
    const noPhone = rows.find((r) => !hasPhone(r) && !r.is_demo) ?? rows.find((r) => !hasPhone(r));
    const withPhone = rows.find((r) => hasPhone(r) && !r.is_demo) ?? rows.find(hasPhone);
    const openByName = async (name) => {
      await page.locator(".bo-row").filter({ has: page.locator("b", { hasText: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) }) }).first().click();
      await page.waitForSelector(".bo-panel", { timeout: 10000 });
      await settle(page, 900);
    };
    const closePanel = async () => { await page.keyboard.press("Escape"); await page.waitForSelector(".bo-panel", { state: "detached", timeout: 5000 }); };

    if (noPhone) {
      noPhoneSeen++;
      await openByName(noPhone.name);
      o = await inspect(page);
      observed[`${where} nophone`] = o;
      check(where, `no Text or Call over "${noPhone.name}" (no phone number)`, o.phoneButtons.length === 0, o.phoneButtons.join(" | "));
      check(where, "no sentence says ring them over that account", o.ringWords.length === 0, o.ringWords.join(" | "));
      check(where, "the panel says there is no phone number", (await page.locator(".bo-nophone").count()) === 1);
      await page.screenshot({ path: `${ART}/panel-nophone-${size.w}.png` }); artifacts.push(`${ART}/panel-nophone-${size.w}.png`);
      check(where, "the close button has 44px of hit area", (await hitProbe(page, ".bo-px")).length === 0);
      // CANARY: the same inspector must see a phone button the moment one is injected.
      if (size.w === SIZES[0].w) {
        await page.evaluate(() => {
          const a = document.createElement("a"); a.href = "tel:5550100"; a.textContent = "Call"; a.dataset.canary = "1";
          document.querySelector(".bo-contact").appendChild(a);
        });
        const c = await inspect(page, BREAK === "blind");
        await page.evaluate(() => document.querySelectorAll("[data-canary]").forEach((n) => n.remove()));
        canary.observed_failure = c.phoneButtons.length >= 1;
        canary.detail = `phone buttons seen with one injected: ${c.phoneButtons.length}`;
        console.log(`    canary (phone button) ${canary.observed_failure ? "CAUGHT" : "MISSED"}: ${canary.detail}`);
      }
      await closePanel();
    }
    check(where, "there is an account with no phone number to ask about", !!noPhone);

    if (withPhone) {
      withPhoneSeen++;
      await openByName(withPhone.name);
      const n = await page.locator('.bo-panel a[href^="tel:"], .bo-panel a[href^="sms:"]').count();
      check(where, `an account WITH a phone ("${withPhone.name}") does offer Text and Call`, n === 2, `found ${n}`);
      await closePanel();
    }
    check(where, "there is an account with a phone number to ask about", !!withPhone);

    // Focus returns after Escape; Ctrl K finds by name.
    const target = rows[0];
    await page.locator(".bo-row").first().focus();
    await page.keyboard.press("Enter");
    await page.waitForSelector(".bo-panel", { timeout: 10000 });
    await closePanel();
    const focusBack = await page.evaluate(() => document.activeElement?.classList.contains("bo-row"));
    check(where, "after Escape, focus is back on the row", focusBack);

    await page.keyboard.press("Control+k");
    await page.waitForSelector(".bo-pal", { timeout: 5000 });
    // Typing before the input has focus loses the keystrokes (instant under lite).
    await page.waitForFunction(() => document.activeElement?.closest?.(".bo-pal"), null, { timeout: 5000 });
    const probe = (rows.find((r) => !r.is_demo) ?? target).name;
    await page.keyboard.type(probe.slice(0, 6));
    await page.waitForTimeout(150);
    await page.keyboard.press("Enter");
    await page.waitForSelector(".bo-panel", { timeout: 10000 });
    const title = await page.locator(".bo-pname").first().innerText();
    check(where, `Ctrl K finds "${probe}" and opens it`, title.trim().toLowerCase() === probe.toLowerCase(), `opened "${title}"`);
    await closePanel();

    // Bubbles
    await page.locator('.bo-seg [data-mode="bubbles"]').click();
    await page.waitForSelector(".bo-bub", { timeout: 5000 });
    await settle(page, 1400);
    check(where, "the bubble view draws one bubble per row", (await page.locator(".bo-bub").count()) === rows.length);
    // Names that are SHOWING must not sit on top of each other or on another
    // bubble: crowded bubbles hide theirs until hovered.
    const nameClash = await page.evaluate(() => {
      const shown = [...document.querySelectorAll(".bo-bub")].filter((b) => getComputedStyle(b.querySelector(".nm")).opacity > 0.5);
      const hit = [];
      const R = (el) => el.getBoundingClientRect();
      for (let i = 0; i < shown.length; i++) {
        const a = R(shown[i].querySelector(".nm"));
        for (let j = 0; j < shown.length; j++) {
          const b = j === i ? R(shown[i].querySelector(".nm")) : R(shown[j].querySelector(".nm"));
          if (j > i && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) hit.push(`${shown[i].textContent} x ${shown[j].textContent}`);
        }
        for (const o of document.querySelectorAll(".bo-bub")) {
          if (o === shown[i]) continue;
          const c = R(o.querySelector(".fl"));
          if (Math.min(a.right, c.right) - Math.max(a.left, c.left) > 2 && Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 2) hit.push(`${shown[i].textContent} over ${o.getAttribute("aria-label")}`);
        }
      }
      return { shown: shown.length, hit };
    });
    check(where, `no showing bubble name overlaps another name or bubble (${nameClash.shown} names showing)`, nameClash.hit.length === 0, nameClash.hit.slice(0, 3).join(" | "));
    await page.screenshot({ path: `${ART}/bubbles-${size.w}.png` }); artifacts.push(`${ART}/bubbles-${size.w}.png`);
    await page.locator('.bo-seg [data-mode="list"]').click();

    // Filters narrow without erasing: Everyone is all rows.
    await page.locator(".bo-fchip").filter({ hasText: "Needs you" }).click();
    await settle(page, 600);
    const needs = await page.locator(".bo-row").count();
    check(where, "the Needs you filter shows no more rows than everyone", needs <= rows.length);
    await page.locator(".bo-fchip").filter({ hasText: "Everyone" }).click();
    await settle(page, 600);
    check(where, "Everyone brings every row back", (await page.locator(".bo-row").count()) === rows.length);

    // CANARY 2: the overlap inspector must see two cells drawn on top of each other.
    if (size.w === SIZES[0].w) {
      const before = (await inspect(page)).overlaps.length;
      await page.evaluate(() => {
        const row = document.querySelector(".bo-row");
        const c = row.querySelector(".c-issue"); c.style.position = "relative"; c.style.left = "-600px"; c.dataset.canary = "1";
      });
      const after = (await inspect(page)).overlaps.length;
      await page.evaluate(() => { const c = document.querySelector("[data-canary]"); c.style.left = ""; c.style.position = ""; delete c.dataset.canary; });
      const caught = after > before;
      canary.observed_failure = canary.observed_failure && caught;
      canary.detail += `; overlaps ${before} -> ${after}`;
      console.log(`    canary (overlap) ${caught ? "CAUGHT" : "MISSED"}`);
    }

    await page.screenshot({ path: `${ART}/full-${size.w}.png`, fullPage: true }); artifacts.push(`${ART}/full-${size.w}.png`);
    completed++;
    await ctx.close();
  }
} catch (e) {
  failures.push(`run stopped: ${redact(e.message)}`);
  console.error(redact(e.stack || e.message));
} finally {
  await browser?.close();
  await dropAdmin(URL_, KEY, acct.id);
  console.log("throwaway admin deleted");
}

for (const c of consoleNoise) failures.push(`console: ${redact(c)}`);
const status = failures.length === 0 && completed === SIZES.length && canary.observed_failure ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: `office-detailers${LITE ? "-lite" : ""}`,
  started_at,
  status,
  expected_targets: SIZES.length,
  discovered_targets: SIZES.length,
  attempted_targets: SIZES.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: SIZES.length * 19,
  assertion_floor: "3 widths x 19 questions (list 6, hit areas 2, no-phone 5, with-phone 2, keyboard 3, bubbles 2, filters 2), fixed by the code; a missing account of either kind reddens its own question rather than dropping it.",
  failures,
  artifacts,
  canary,
  warnings: [
    `Reads the LIVE platform list (${rowsSeen} rows at the last width, ${noPhoneSeen} no-phone and ${withPhoneSeen} with-phone accounts asked about); the existence questions refuse an empty population rather than pass it.`,
    "Signs in as a throwaway platform admin created and deleted by this run.",
    "The look itself (color, glow, motion) is not judged here; the screenshots are the evidence for that.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), lite: LITE, ...(BREAK && { break: BREAK }), observed },
});
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, canary ${canary.observed_failure ? "caught" : "MISSED"} → ${path}`);
process.exit(status === "pass" ? 0 : 1);
