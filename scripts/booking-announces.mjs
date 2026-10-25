// ROADMAP 8.5b — DOES THE BOOKING PAGE SAY ITS DECISIONS OUT LOUD?
//
//   BASE=http://127.0.0.1:5180 node scripts/booking-announces.mjs
//   BREAK=strip …   # sabotage: puts the pre-fix markup back in the running page
//                   # (no live region on the bar's total or the promo answer, and
//                   # the confirmation heading refuses focus) — every width must go red
//
// 8.5b's done-when includes "anything that changes without a page load is
// announced", and FOUND.md § "Four things this product does silently" named
// the three on the booking path: the total moving, the promo answer, and the
// booking going through. Per width (390, 768, 1440) this walks the REAL page
// from step 1 to the confirmation and asks, at each of the three moments,
// whether a screen reader was handed the news:
//
//   1 PRICE   — the bar's figure after a service is picked is heard.
//   2 PROMO   — a refused code's sentence is heard, then an accepted code's.
//   3 BOOKED  — the confirmation's heading takes focus (a new screen arriving
//               with its own live region is NOT reliably read, so focus is the
//               product's answer, the way ConfirmTap already does it).
//
// "HEARD" IS WHAT A SCREEN READER IS HANDED, NOT WHAT IS ON SCREEN: a text
// change inside a live region that was already in the page, or an inserted
// role="alert". A live region that arrives together with its own content does
// not count — that is the case browsers drop. An in-page canary per width
// proves both halves of that rule: a change in a plain div must NOT be heard,
// and a change in an existing polite region must be.
//
// NOTHING IS WRITTEN ANYWHERE. calculate-booking, available-slots,
// validate-promo-code and create-booking are answered in the browser; the rest
// of the page is the real product against this copy's backend. Expected
// targets: 3 widths x 3 moments = 9.

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { settle, feedBookingFixture, watchConsole } from "./lib/bookingWalk.mjs";

const { chromium } = createRequire(import.meta.url)("../app/node_modules/playwright/index.js");
const BASE = process.env.BASE || process.env.BASE_URL || "http://localhost:5173";
const BREAK = process.env.BREAK || "";
if (BREAK && BREAK !== "strip") throw new Error(`Unknown BREAK=${BREAK}. Known: strip.`);
const WIDTHS = [[390, 844], [768, 1024], [1440, 900]];
const SHOTS = "artifacts/booking-announces";
const tag = BREAK ? `.break-${BREAK}` : "";
const EXPECTED = WIDTHS.length * 3;
const started_at = new Date().toISOString();
mkdirSync(SHOTS, { recursive: true });

const failures = [];
const consoleSink = [];
let assertions = 0, completed = 0, canaryOk = 0;
const artifacts = ["scripts/booking-announces.mjs"];
const check = (name, ok, detail = "") => {
  assertions++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : " — " + detail}`);
  if (!ok) failures.push(`${name} ${detail}`.trim());
  return ok;
};

// What a screen reader is handed. Installed before any page script runs.
const RECORDER = () => {
  window.__heard = [];
  window.__focus = [];
  const LIVE = '[aria-live]:not([aria-live="off"]),[role="status"],[role="alert"],[role="log"]';
  const say = (el) => {
    const s = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (s) window.__heard.push(s);
  };
  new MutationObserver((muts) => {
    const added = new Set();
    for (const m of muts) for (const n of m.addedNodes) added.add(n);
    const arrived = (el) => { for (let x = el; x; x = x.parentNode) if (added.has(x)) return true; return false; };
    const spoken = new Set();
    for (const m of muts) {
      const t = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      const region = t && t.closest && t.closest(LIVE);
      if (region && !arrived(region)) spoken.add(region);
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        const a = n.matches('[role="alert"]') ? n : n.querySelector('[role="alert"]');
        if (a) spoken.add(a);
      }
    }
    for (const el of spoken) say(el);
  }).observe(document, { subtree: true, childList: true, characterData: true });
  document.addEventListener("focusin", (e) => {
    const el = e.target;
    window.__focus.push({ tag: el.tagName, text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80) });
  }, true);
};

// The pre-fix page, rebuilt in the browser: strip the three fixes as they render.
const STRIP = () => {
  const strip = () => {
    for (const el of document.querySelectorAll(".bk-bar .total, [data-promo-answer]")) {
      el.removeAttribute("aria-live"); el.removeAttribute("aria-atomic"); el.removeAttribute("role");
    }
  };
  new MutationObserver(strip).observe(document, { subtree: true, childList: true, attributes: true });
  const focus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (...a) { if (this.tagName === "H1") return; return focus.apply(this, a); };
};

const heardSince = async (page, n) => (await page.evaluate(() => window.__heard)).slice(n);
const heardCount = (page) => page.evaluate(() => window.__heard.length);
const waitHeard = async (page, n, re, ms = 4000) => {
  const t0 = Date.now();
  for (;;) {
    const got = await heardSince(page, n);
    if (got.some((s) => re.test(s)) || Date.now() - t0 > ms) return got;
    await page.waitForTimeout(100);
  }
};

const browser = await chromium.launch();
for (const [w, h] of WIDTHS) {
  const label = `${w}x${h}`;
  console.log(`\n${label}`);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
  if (BREAK === "strip") await ctx.addInitScript(STRIP);   // first, so it runs before the recorder sees a batch
  await ctx.addInitScript(RECORDER);
  const page = await ctx.newPage();
  watchConsole(page, label, consoleSink);
  await feedBookingFixture(page);
  // Every quote is a new figure, so every re-quote is a price that MOVED.
  let quotes = 0;
  await page.route(/\/functions\/v1\/calculate-booking/, (route) => {
    const total = 65 + 10 * quotes++;
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, weather: null, quote: {
      base_price: total, vehicle_size_fee: 0, add_ons_total: 0, travel_fee: 0, travel_zone: null, adjustments: [],
      subtotal_before_discounts: total, site_discount: 0, site_discount_percent: 0, site_discount_label: null,
      subtotal: total, promo_code: null, promo_discount: 0, total, plan_id: null, plan_name: null, total_duration: 60,
      buffer_minutes: 0, vehicle_count: 1, per_vehicle: null, single_vehicle_duration: 60 } }) });
  });
  await page.route(/\/functions\/v1\/validate-promo-code/, (route) => {
    const code = (route.request().postDataJSON() || {}).code;
    return code === "SUMMER10"
      ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, valid: true }) })
      : route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "Invalid or expired promo code" }) });
  });
  // The reply's status follows the button the page drew, as the server's would:
  // "Request this time" holds the time (pending, "We're holding your time"),
  // "Confirm booking" books it ("You're booked"). The demo is in request mode,
  // so a fixed "confirmed" never walked the heading most customers here see.
  let requestMode = false;
  await page.route(/\/functions\/v1\/create-booking/, (route) => {
    const p = route.request().postDataJSON() || {};
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, booking: {
      id: "00000000-0000-4000-8000-000000000085", status: requestMode ? "pending" : "confirmed", booking_date: p.booking_date || "2026-11-03",
      start_time: p.start_time || "09:00", end_time: "10:00", total_price: 85, receipt_url: null } }) });
  });

  try {
    await page.goto(`${BASE}/book/demo-detail`, { waitUntil: "domcontentloaded" });
    await page.locator(".bk-step-head .bk-step-label").waitFor({ timeout: 20000 });
    await settle(page, 2500);

    // CANARY — both halves of "heard".
    const c = await page.evaluate(async () => {
      const frame = () => new Promise((r) => setTimeout(r, 50));
      const n = window.__heard.length;
      const plain = document.createElement("div"); document.body.appendChild(plain); await frame();
      plain.textContent = "CANARY-SILENT"; await frame();
      const live = document.createElement("div"); live.setAttribute("aria-live", "polite");
      document.body.appendChild(live); await frame();
      live.textContent = "CANARY-SPOKEN"; await frame();
      plain.remove(); live.remove();
      const got = window.__heard.slice(n);
      return { silentHeard: got.includes("CANARY-SILENT"), spokenHeard: got.includes("CANARY-SPOKEN") };
    });
    const canaryHere = !c.silentHeard && c.spokenHeard;
    if (canaryHere) canaryOk++;
    console.log(`  canary: plain change heard=${c.silentHeard} (want false), live change heard=${c.spokenHeard} (want true)`);

    // 1 PRICE
    let n = await heardCount(page);
    await page.locator(".bk-card.selectable").first().click();
    await page.locator(".bk-bar .total strong").waitFor({ timeout: 8000 });
    await settle(page, 1500);
    const figure = (await page.locator(".bk-bar .total strong").innerText()).trim();
    let got = await waitHeard(page, n, new RegExp(figure.replace(/[$.]/g, "\\$&")));
    check(`${label} price: the bar's ${figure} is heard`, got.some((s) => s.includes(figure)), `heard ${JSON.stringify(got)}`);
    completed++;

    // Walk to the review step.
    const total = Number((await page.locator(".bk-step-head .bk-step-label").innerText()).match(/(\d+)\D+(\d+)/)[2]);
    const cont = page.locator(".bk-bar button.bk-btn.primary");
    const enabled = (ms) => page.waitForFunction(() => {
      const b = document.querySelector(".bk-bar button.bk-btn.primary");
      return !!b && !b.disabled && b.getAttribute("aria-disabled") !== "true";
    }, null, { timeout: ms }).then(() => true).catch(() => false);
    for (let guard = 0; guard < 10; guard++) {
      const at = Number((await page.locator(".bk-step-head .bk-step-label").innerText()).match(/(\d+)/)[1]);
      if (at === total) break;
      if (await page.locator(".bk-card.selectable").count() && !(await page.locator(".bk-card.selected").count())) {
        await page.locator(".bk-card.selectable").first().click(); await settle(page, 1500);
      }
      if (await page.locator(".bk-cal").count() && !(await page.locator(".bk-slots .bk-chip").count())) {
        await page.locator(".bk-cal .cell:not(.closed):not(.empty)").first().waitFor({ state: "attached", timeout: 8000 });
        for (const d of await page.locator(".bk-cal .cell:not(.closed):not(.empty)").allTextContents()) {
          await page.locator(".bk-cal .cell", { hasText: new RegExp(`^${d.trim()}$`) }).first().click();
          await page.locator(".bk-slots .bk-chip").first().waitFor({ state: "attached", timeout: 4000 }).catch(() => {});
          if (await page.locator(".bk-slots .bk-chip").count()) break;
        }
        await page.locator(".bk-slots .bk-chip").first().click(); await settle(page, 600);
      }
      for (const [sel, v] of [[".bk-field input[type=tel]", "5551234567"], [".bk-field input[type=email]", "casey@example.com"]]) {
        if (await page.locator(sel).count() && !(await page.locator(sel).first().inputValue())) await page.locator(sel).first().fill(v);
      }
      const year = page.locator('.bk-field input[inputmode="numeric"][maxlength="4"]').first();
      if (await year.count() && !(await year.inputValue())) { await year.fill("2019"); await settle(page, 400); }
      if (!(await enabled(6000))) {
        const text = page.locator('.bk-field input:not([type=tel]):not([type=email]):not([inputmode="numeric"])').first();
        const head = await page.locator(".bk-step-head h2").innerText();
        if (await text.count() && !(await text.inputValue())) await text.fill(/reach you/i.test(head) ? "Casey Rivera" : "140 Market Street, Springfield");
        await settle(page, 400);
      }
      if (!(await enabled(4000))) throw new Error(`step ${at} of ${total} would not advance`);
      await cont.click(); await settle(page, 1500);
    }

    // 2 PROMO — refused, then accepted.
    const promoInput = page.locator(".bk-row input").last();
    await promoInput.fill("NOPE85");
    n = await heardCount(page);
    await promoInput.locator("xpath=following-sibling::button").click();
    got = await waitHeard(page, n, /one of ours/);
    const refusedOk = got.some((s) => /one of ours/.test(s));
    await promoInput.fill("SUMMER10");
    n = await heardCount(page);
    await promoInput.locator("xpath=following-sibling::button").click();
    const got2 = await waitHeard(page, n, /SUMMER10 applied/);
    check(`${label} promo: the refusal and the acceptance are both heard`,
      refusedOk && got2.some((s) => /SUMMER10 applied/.test(s)),
      `refusal heard=${refusedOk}; after SUMMER10 heard ${JSON.stringify(got2)}`);
    completed++;
    await settle(page, 1500);
    await page.screenshot({ path: `${SHOTS}/${w}-review${tag}.png` });
    artifacts.push(`${SHOTS}/${w}-review${tag}.png`);

    // 3 BOOKED
    await page.evaluate(() => { window.__focus = []; });
    requestMode = /request/i.test(await cont.innerText());
    const want = requestMode ? /holding/i : /booked/i;
    console.log(`  submit button "${(await cont.innerText()).trim()}" -> reply ${requestMode ? "pending" : "confirmed"}`);
    await cont.click();
    await page.locator("h1", { hasText: want }).waitFor({ timeout: 10000 });
    await settle(page, 1200);
    const f = await page.evaluate(() => ({
      active: document.activeElement && document.activeElement.tagName,
      text: (document.activeElement && document.activeElement.textContent || "").trim(),
      history: window.__focus,
    }));
    check(`${label} booked: focus lands on the confirmation heading`,
      f.active === "H1" && want.test(f.text), `focus is on ${f.active} "${f.text.slice(0, 60)}"`);
    completed++;
    await page.screenshot({ path: `${SHOTS}/${w}-confirmed${tag}.png` });
    artifacts.push(`${SHOTS}/${w}-confirmed${tag}.png`);
  } catch (e) {
    check(`${label} walk`, false, String(e.message).split("\n")[0]);
  }
  await ctx.close();
}

// BOTH CONFIRMATION BRANCHES. The walk above reaches whichever one the demo's
// mode produces; the dev-only fixture page (ROADMAP 8.5b, ships nowhere) mounts
// the real screen in each, so the other branch's heading is asked too.
for (const status of ["pending", "confirmed"]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  if (BREAK === "strip") await ctx.addInitScript(STRIP);
  const page = await ctx.newPage();
  watchConsole(page, `fixture-${status}`, consoleSink);
  const want = status === "pending" ? /holding/i : /booked/i;
  try {
    await page.goto(`${BASE}/fixture-confirmed.html${status === "confirmed" ? "?status=confirmed" : ""}`);
    await page.locator("h1", { hasText: want }).waitFor({ timeout: 15000 });
    await settle(page, 1200);
    const f = await page.evaluate(() => ({ tag: document.activeElement?.tagName, text: (document.activeElement?.textContent || "").trim() }));
    check(`fixture 390 ${status}: focus lands on the confirmation heading`, f.tag === "H1" && want.test(f.text),
      `focus is on ${f.tag} "${f.text.slice(0, 60)}"`);
  } catch (e) {
    check(`fixture 390 ${status}`, false, String(e.message).split("\n")[0]);
  }
  await ctx.close();
}
await browser.close();

// The refused code's 404 is the designed refusal: Chrome logs it once as a bare
// "Failed to load resource … 404" (no path) and watchConsole once with its path.
// Exactly one of each per width is allowed; anything beyond that still fails.
const allowance = {};
for (const s of consoleSink) {
  const m = s.match(/^(\S+) · http 404 · \/functions\/v1\/validate-promo-code$/);
  if (m) allowance[m[1]] = (allowance[m[1]] || 0) + 1;
}
const consoleErrors = consoleSink.filter((s) => {
  if (/ · http 404 · \/functions\/v1\/validate-promo-code$/.test(s)) return false;
  const m = s.match(/^(\S+) · error · Failed to load resource: the server responded with a status of 404/);
  if (m && allowance[m[1]] > 0) { allowance[m[1]]--; return false; }
  return true;
});
for (const s of consoleErrors) console.log("  console: " + s);
check("console clean at every width (the designed promo 404 excepted)", consoleErrors.length === 0, consoleErrors.join(" | "));
const allCanaries = canaryOk === WIDTHS.length;
console.log(`\ncanary caught ${canaryOk}/${WIDTHS.length}; moments measured ${completed}/${EXPECTED}; failures ${failures.length}`);

const { path } = writeReceipt({
  check_id: "booking-announces",
  started_at,
  status: failures.length === 0 && allCanaries && completed === EXPECTED ? "pass" : "fail",
  expected_targets: EXPECTED,
  discovered_targets: completed,
  attempted_targets: completed,
  completed_targets: completed,
  skipped_targets: EXPECTED - completed,
  assertions_executed: assertions,
  min_assertions: EXPECTED + 1,
  assertion_floor: "three moments per width plus one console check; a width whose walk dies early asks fewer and drops below it",
  failures: [...failures, ...(allCanaries ? [] : ["the heard/not-heard canary failed - every line beside it is void"])],
  artifacts,
  warnings: ["Says what a screen reader is HANDED. Whether a listener understands it is 8.5b's person-with-ears half."],
  dimensions: {
    measures: "price change heard, promo answer heard, confirmation heading focused",
    widths: WIDTHS.map(([a, b]) => `${a}x${b}`),
    ...(BREAK ? { break: BREAK } : {}),
  },
  canary: {
    id: "a plain div's text change must not be heard; an existing polite region's must",
    observed_failure: allCanaries,
    caught_by: ["heard detector"],
    findings: [`${canaryOk}/${WIDTHS.length}`],
  },
});
console.log("receipt -> " + path);
