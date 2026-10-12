// ROADMAP 9.12a step 6, slice 6b — the platform price editor, which lived only on
// the old five-tab back office, now on the new one's Money place ("What
// detailers pay"). Reworked by 9.12c: ONE press opens it already editable.
//
//   node scripts/office-prices.mjs                 (dev server on :5173; no credentials)
//   node scripts/office-prices.mjs --lite          (the ?lite=1 reduced-motion path)
//   node scripts/office-prices.mjs --break=hidden  (sabotage: the new section is hidden)
//   node scripts/office-prices.mjs --break=wide    (sabotage: the 2026-10-11 phone fault back —
//                                                    the plans side by side, off the right edge)
//   node scripts/office-prices.mjs --break=extra-press  (sabotage: 9.12c's fault back — the
//                                                    first press opens no box to type in)
//   node scripts/office-prices.mjs --freeze=after  (Andrew's frozen After copies in belt/shots/9.12c;
//                                                    the Before copies were taken from the old code
//                                                    at b037053a and cannot be re-taken)
//
// WRITES NOTHING ANYWHERE. A made-up session sits in the browser's storage and
// every `platform-admin` call is answered by page.route(). So `prices` is asked
// what it SENDS and what the screen does with each answer, never whether the
// server takes it (`pricesFrom` and the edge function own that).
//
// WHAT IT ASKS, phone first at 390, 392, 320, 768, 1440 and 1920:
//   0. (9.12c) the closed quick look shows Website + booking monthly, Booking only
//      monthly and the setup fee, never the founding price; ONE press opens 11
//      VISIBLE boxes (no "Change these prices" step anywhere); open, the section is
//      at most half its 9.12a height (2,058px phones / 1,203px wider, measured at
//      b037053a); every box is the same width, no wider than 160px, centered
//      figures; no figure printed twice (only the exit fee's 0.5 -> 50% reading);
//   1. the boxes hold all 11 figures of the built-in table, each in its unit
//      ($, months, "% of what is left"), says "Built-in prices", and offers no
//      Save, Cancel or "go back" while nothing is changed;
//   2. typing moves the exit fee's reading (0.5 -> 50%, 50 -> 5000%); a change
//      brings Save and Cancel; Cancel puts the stored figures back and sends nothing;
//   3. a refusal shows the server's own sentence and keeps what was typed;
//   4. Save sends `prices` with the WHOLE table, every one of the 11 figures, the
//      edited one changed and nothing else; the list is read again; Save goes away
//      and the box holds the saved figure;
//   5. with an override in place it says "Changed here" and offers "Go back";
//      "Not yet" sends nothing; "Yes" sends `prices: null`;
//   6. no overlap, no sideways overflow, 44px of real hit area, console silent
//      apart from the one refusal asked for.
// THE CANARY injects an overlapping copy of a button and requires the same
// overlap probe to name it.

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=")[1] || "";
const BREAK = arg("break");
const FREEZE = arg("freeze");
const LITE = process.argv.includes("--lite");
const BASE = process.env.BASE || "http://localhost:5173";
const SIZES = [{ w: 390, h: 844 }, { w: 392, h: 844 }, { w: 320, h: 700 }, { w: 768, h: 1024 }, { w: 1440, h: 900 }, { w: 1920, h: 1080 }];
const ART = `artifacts/office-prices${LITE ? "-lite" : ""}`;
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/9.12c";
// 9.12a's open editor, measured at b037053a by the 9.12c Before pass: the section
// with every box showing. Half of each is 9.12c's ceiling.
const OLD_OPEN = { phone: 2058, wide: 1203 };
const REF = "kguqylyzgyzfktkfnhjb";

// Copied by hand from supabase/functions/_shared/platformBilling.ts PRICES. It is
// a FIXTURE, not a claim about what is live: the page is fed this table.
const BUILT_IN = {
  website: { setup: 999, monthly: 60, annual: 600, monthToMonth: 75 },
  bookingOnly: { monthly: 35 },
  founding: { setup: 499, monthly: 40, annual: 400, monthToMonth: 50 },
  term: { months: 12, exitFeeShare: 0.5 },
};
const FIGURES = 11;
const flat = (t) => Object.entries(t).flatMap(([k, v]) => Object.entries(v).map(([k2, v2]) => [`${k}.${k2}`, v2]));

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

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
const user = { id: "00000000-0000-4000-8000-000000000001", email: "andrew@example.com", aud: "authenticated", role: "authenticated" };
const SESSION = {
  access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: user.id, exp, role: "authenticated", email: user.email })}.x`,
  refresh_token: "fake", token_type: "bearer", expires_in: 86400, expires_at: exp, user,
};

// `cut` is measured FIRST, before anything scrolls: `.bo` clips sideways, so a
// section wider than the phone never makes the page scroll and `overflowX` stays
// false over plans running off the right edge (measured 2026-10-11 at 392px).
const PROBE = (sel) => {
  const els = [...document.querySelectorAll(sel)].filter((e) => e.checkVisibility({ checkVisibilityCSS: true, contentVisibilityAuto: true }) && e.getBoundingClientRect().width > 0);
  const overlaps = [], thin = [];
  const cut = els.filter((e) => { const r = e.getBoundingClientRect(); return r.left < -0.5 || r.right > innerWidth + 0.5; })
    .map((e) => `${(e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 24)} cut by an edge`);
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    if (els[i].contains(els[j]) || els[j].contains(els[i])) continue;
    const a = els[i].getBoundingClientRect(), b = els[j].getBoundingClientRect();
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (w > 0.5 && h > 0.5) overlaps.push(`${(els[i].textContent || els[i].getAttribute("aria-label") || "").trim().slice(0, 24)} x ${(els[j].textContent || els[j].getAttribute("aria-label") || "").trim().slice(0, 24)}`);
  }
  for (const el of els) {
    if (!el.matches("button")) continue;
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (const dy of [-21, 21]) {
      const hit = document.elementFromPoint(cx, cy + dy);
      if (!hit || !(el === hit || el.contains(hit))) thin.push(`${el.textContent.trim().slice(0, 24)} @${dy}`);
    }
  }
  return { overlaps, thin, cut, overflowX: document.documentElement.scrollWidth > innerWidth + 1, n: els.length };
};
const probe = (page, sel) => page.evaluate(`(${PROBE.toString()})(${JSON.stringify(sel)})`);
// Reuse the existing painted-background contrast inspector without starting its
// unrelated dashboard walk. Scope it to prices, including its own bad-text canary.
const contrastSource = readFileSync(new URL('./contrast-insitu.mjs', import.meta.url), 'utf8');
const contrastStart = contrastSource.indexOf('const PROBE = () => {');
const contrastEnd = contrastSource.indexOf('\nconst browser =', contrastStart);
if (contrastStart < 0 || contrastEnd < 0) throw Error('Contrast inspector not found');
const contrastProbe = contrastSource.slice(contrastStart, contrastEnd).trim()
  .replace('const PROBE = ', '').replace(/;$/, '')
  .replace('document.body.appendChild(canary)', 'document.querySelector(".bo-prices").appendChild(canary)')
  .replace('document.querySelectorAll("body *")', 'document.querySelectorAll(".bo-prices *")');


let browser = null;
const canary = { id: "injected-overlapping-price-button", observed_failure: false };
let completed = 0;
mkdirSync(ART, { recursive: true });
if (FREEZE) mkdirSync(SHOTS, { recursive: true });

async function openPage(size) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h } });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } }, [`sb-${REF}-auth-token`, JSON.stringify(SESSION)]);
  const page = await ctx.newPage();
  const sent = [];
  const answer = { prices: "ok", current: null };
  await page.route(`**/auth/v1/user**`, (r) => r.fulfill({ json: user }));
  await page.route("**/functions/v1/platform-admin", async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    sent.push(body);
    switch (body.action) {
      case "whoami": return route.fulfill({ json: { email: user.email } });
      case "list": return route.fulfill({ json: { rows: [], totals: {},
        prices: { current: answer.current, built_in: BUILT_IN, updated_at: answer.current ? "2026-10-06T17:00:00Z" : null } } });
      case "platform_net": return route.fulfill({ json: { period_month: body.period_month, revenue_cents: 0, cost_cents: 0, costs_entered: false, net_cents: null, by_category: {} } });
      case "prices":
        if (answer.prices === "no") return route.fulfill({ status: 400, json: { error: "Those prices do not add up. Every figure must be a number, and only the setup fee may be zero." } });
        answer.current = body.prices;
        return route.fulfill({ json: { success: true, prices: body.prices, built_in: BUILT_IN } });
      default: return route.fulfill({ json: {} });
    }
  });
  const CSS = {
    hidden: ".bo-prices { display: none !important; }",
    wide: ".bo-prices { min-width: auto !important; } .bo-pgroups { display: grid !important; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)) !important; max-width: none !important; width: 1100px !important; }",
  };
  if (CSS[BREAK]) await ctx.addInitScript((css) => {
    const s = () => { const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st); };
    if (document.head) s(); else document.addEventListener("DOMContentLoaded", s);
  }, CSS[BREAK]);
  // 9.12c's fault, reproduced in the product's own terms: the first press opens a
  // read-only table and a "Change these prices" button, and only THAT shows boxes.
  if (BREAK === "extra-press") await ctx.addInitScript(() => {
    const st = document.createElement("style");
    st.textContent = ".bo-prices:not(.x-editing) .bo-price-control { display: none !important; }";
    const add = () => {
      document.head.appendChild(st);
      new MutationObserver(() => {
        const body = document.querySelector(".bo-price-body");
        if (!body || body.querySelector(".x-change")) return;
        const b = document.createElement("button"); b.type = "button"; b.className = "bo-btn ghost x-change"; b.textContent = "Change these prices";
        b.onclick = () => { document.querySelector(".bo-prices").classList.add("x-editing"); b.remove(); };
        body.appendChild(b);
      }).observe(document.documentElement, { childList: true, subtree: true });
    };
    if (document.head) add(); else document.addEventListener("DOMContentLoaded", add);
  });
  watchConsole(page, `${size.w}`, consoleNoise);
  await page.goto(`${BASE}/admin/office${LITE ? "?lite=1" : ""}#money`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".bo-money", { timeout: 60000 });
  await settle(page, 1400);
  return { ctx, page, sent, answer };
}
const lastOf = (sent, action) => [...sent].reverse().find((b) => b.action === action);
const sec = (page) => page.locator(".bo-prices");
const btn = (page, text) => sec(page).locator("button", { hasText: text });

try {
  browser = await chromium.launch();

  if (FREEZE) {
    const { freeze, differs } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
    if (FREEZE !== "after") throw Error("only --freeze=after: the Before copies came from the old code at b037053a");
    for (const size of [{ w: 390, h: 844 }, { w: 1440, h: 900 }]) {
      const { ctx, page } = await openPage(size);
      const tail = size.w === 1440 ? "-desktop" : "";
      await sec(page).scrollIntoViewIfNeeded();
      if (size.w === 390) await freeze(page, { out: `${SHOTS}/after-closed.html`, label: "After", highlight: ".bo-price-preview",
        note: "The quick look now shows the two monthly prices and the $999 setup fee. The founding offer is still editable inside, last." });
      await sec(page).locator("summary").click();
      await settle(page, 400);
      await sec(page).evaluate((e) => e.scrollIntoView({ block: "start" }));
      await freeze(page, { out: `${SHOTS}/after${tail}.html`, label: "After", highlight: ".bo-prices",
        note: size.w === 390 ? "One press opens every price ready to type in: compact rows, each price once, under half the old height."
          : "Each price sits in a small box beside its label on one grid; Save and Cancel appear only after a change." });
      console.log(`differs ${size.w}: ${await differs(page, `${SHOTS}/before${tail}.html`, `${SHOTS}/after${tail}.html`, { width: size.w, height: size.h })}`);
      if (size.w === 390) console.log(`closed differs: ${await differs(page, `${SHOTS}/before-closed.html`, `${SHOTS}/after-closed.html`)}`);
      await ctx.close();
    }
    writeFileSync(`${SHOTS}/where.json`, JSON.stringify({
      what: "The price editor opens ready to edit on one press, at under half its old height on a phone, with each price once in a small box; the quick look shows the setup fee instead of the founding price.",
      url: `${BASE}/admin/office#money`,
      how: "Open the back office, tap Money, scroll to What detailers pay, tap it once.",
      situation: "The built-in price table: eleven prices and contract terms, nothing changed yet.",
    }, null, 2) + "\n");
  } else {
    for (const size of SIZES) {
      const where = `${size.w}${LITE ? " lite" : ""}`;
      const phone = size.w < 700;
      console.log(`\n${where}`);
      const { ctx, page, sent, answer } = await openPage(size);

      // ── 0. CLOSED, AND ONE PRESS (9.12c) ──
      const visible = await sec(page).isVisible().catch(() => false);
      check(where, "Money has a What detailers pay section", visible);
      if (visible) {
        await sec(page).scrollIntoViewIfNeeded();
        const fold = sec(page).locator("details");
        const summary = sec(page).locator("summary");
        if (BREAK === "expanded") await fold.evaluate((e) => (e.open = true));
        check(where, "prices are folded on arrival", !(await fold.evaluate((e) => e.open)));
        const preview = await summary.locator(".bo-price-preview").innerText();
        check(where, "quick look: both monthly prices and the setup fee, not the founding price",
          ["$60", "$35", "$999"].every((v) => preview.includes(v)) && !preview.includes("$40") && !/founding/i.test(preview) && (await summary.locator(".bo-price-preview > span").count()) === 3, preview);
        const closedH = await sec(page).evaluate((e) => e.getBoundingClientRect().height);
        check(where, "closed preview fits within 300px", closedH <= 300, `${closedH}`);
        const compact = await probe(page, ".bo-price-summary .bo-label, .bo-price-preview > span > *, .bo-price-more");
        check(where, "closed preview has no overlap or cut edges", !compact.overlaps.length && !compact.cut.length && !compact.overflowX, JSON.stringify(compact));
        await page.screenshot({ path: `${ART}/closed-${size.w}.png` }); artifacts.push(`${ART}/closed-${size.w}.png`);
        // The ONE press, from the keyboard so a mouse cannot land on anything else.
        await summary.focus(); await page.keyboard.press("Enter");
        await settle(page, 400);
        check(where, "one press opens all prices", await fold.evaluate((e) => e.open));
        const ready = await sec(page).locator("input[data-price]").evaluateAll((els) => els.filter((e) => e.checkVisibility({ checkVisibilityCSS: true })).length);
        check(where, `one press shows all ${FIGURES} boxes ready to type in`, ready === FIGURES, `${ready} visible`);
        check(where, "no separate Change these prices step", (await btn(page, "Change these prices").count()) === 0);
        // Reach a box even when sabotaged, so the rest still runs and the extra presses are recorded.
        let extra = 0;
        while (ready !== FIGURES && extra < 3 && (await btn(page, "Change these prices").count())) { await btn(page, "Change these prices").click(); extra++; await settle(page, 300); }
        const openH = await sec(page).evaluate((e) => e.getBoundingClientRect().height);
        const ceiling = (phone ? OLD_OPEN.phone : OLD_OPEN.wide) / 2;
        check(where, `open, at most half the old height (${ceiling}px)`, openH <= ceiling, `${Math.round(openH)}px`);
        const ctl = await sec(page).locator(".bo-price-control").evaluateAll((els) => els.map((e) => {
          const r = e.getBoundingClientRect(), i = e.querySelector("input");
          const col = e.closest(".bo-pgroup").getBoundingClientRect().left;
          return { w: Math.round(r.width), x: Math.round(r.left - col), align: getComputedStyle(i).textAlign, justify: getComputedStyle(i.parentElement).justifyContent };
        }));
        const widths = [...new Set(ctl.map((c) => c.w))], xs = [...new Set(ctl.map((c) => c.x))];
        check(where, "every box the same width, at most 160px", ctl.length === FIGURES && widths.length === 1 && widths[0] <= 160, JSON.stringify(widths));
        check(where, "boxes on one grid line, figures centered alike", xs.length === 1 && ctl.every((c) => c.align === "center" && c.justify === "center"), JSON.stringify({ xs, align: [...new Set(ctl.map((c) => c.align + "/" + c.justify))] }));
        const repeats = await sec(page).locator("[data-price] .v").evaluateAll((els) => els.filter((e) => e.checkVisibility()).map((e) => e.closest("[data-price]").dataset.price));
        check(where, "no figure printed twice (only the exit fee's reading)", repeats.length === 1 && repeats[0] === "term.exitFeeShare", JSON.stringify(repeats));
        const order = await sec(page).locator(".bo-pgroup h3").allInnerTexts();
        check(where, "founding offer last", order.at(-1) === "Founding offer" && order.length === 4, JSON.stringify(order));
        observed[`${where} measured`] = { presses_to_first_box: 2 + extra, open_px: Math.round(openH), closed_px: Math.round(closedH), box_px: widths };

        // ── 1. READING ──
        const boxes = await sec(page).locator("input[data-price]").evaluateAll((els) => els.map((e) => [e.dataset.price, e.value]));
        check(where, `${FIGURES} boxes holding the stored values`, boxes.length === FIGURES && boxes.every(([k, v]) => String(flat(BUILT_IN).find(([f]) => f === k)?.[1]) === v), JSON.stringify(boxes));
        const units = await sec(page).locator(".bo-price-entry").evaluateAll((els) => els.map((e) => [...e.childNodes].map((n) => n.value ?? n.textContent).join("").trim()));
        check(where, "each figure in its unit ($ or mo; the exit fee reads beside its label)", units.filter((u) => /^\$\d+$/.test(u)).length === 9 && units.includes("12mo") && units.includes("0.5"), JSON.stringify(units));
        check(where, "says Built-in prices", (await sec(page).locator(".bo-prices-from").innerText().catch(() => "")).includes("Built-in"));
        check(where, "no Save, Cancel or Go back while nothing is changed", (await sec(page).locator(".acts button").count()) === 0);
        let p = await probe(page, ".bo-prices [data-price] dt, .bo-prices input, .bo-prices button, .bo-prices .bo-prices-from, .bo-prices h3");
        check(where, "reading: no overlap, buttons 44px, nothing cut by an edge, no sideways overflow", p.overlaps.length === 0 && p.thin.length === 0 && p.cut.length === 0 && !p.overflowX, [...p.overlaps, ...p.thin, ...p.cut].join(" | "));

        // ── 2. EDITING ──
        const exit = sec(page).locator('input[data-price="term.exitFeeShare"]');
        const reading = () => sec(page).locator('[data-price="term.exitFeeShare"] .v').innerText().catch(() => "");
        check(where, "exit fee box reads 50% of what is left", (await reading()) === "50% of what is left");
        await exit.fill("50");
        check(where, "typing 50 reads 5000% out loud", (await reading()) === "5000% of what is left", await reading());
        await exit.fill("0.5");
        check(where, "putting a figure back hides Save again", (await btn(page, "Save these prices").count()) === 0);
        const writes0 = sent.filter((b) => b.action === "prices").length;
        await sec(page).locator('input[data-price="website.setup"]').fill("1200");
        check(where, "a change brings Save and Cancel", (await btn(page, "Save these prices").isVisible()) && (await btn(page, "Cancel").isVisible()));
        await btn(page, "Cancel").click();
        check(where, "Cancel puts the stored figure back and sends nothing", (await sec(page).locator('input[data-price="website.setup"]').inputValue()) === "999"
          && (await btn(page, "Save these prices").count()) === 0 && sent.filter((b) => b.action === "prices").length === writes0 && (await fold.evaluate((e) => e.open)));
        await sec(page).locator('input[data-price="website.monthly"]').fill("65");
        p = await probe(page, ".bo-prices input, .bo-prices button, .bo-prices [data-price] .v, .bo-prices [data-price] dt");
        check(where, "editor: no overlap, buttons 44px, nothing cut by an edge, no sideways overflow", p.overlaps.length === 0 && p.thin.length === 0 && p.cut.length === 0 && !p.overflowX, [...p.overlaps, ...p.thin, ...p.cut].join(" | "));
        if (size.w === SIZES[0].w) {
          await page.evaluate(() => {
            const b = document.querySelector(".bo-prices button"), r = b.getBoundingClientRect();
            const c = b.cloneNode(true); c.dataset.canary = "1"; c.style.marginLeft = `-${r.width - 8}px`; b.after(c);
          });
          const cp = await probe(page, ".bo-prices input, .bo-prices button");
          await page.evaluate(() => document.querySelectorAll("[data-canary]").forEach((n) => n.remove()));
          canary.observed_failure = BREAK === "blind" ? false : cp.overlaps.length >= 1;
          canary.detail = `overlaps seen with one injected: ${BREAK === "blind" ? "probe blinded" : cp.overlaps.length}`;
          console.log(`    canary ${canary.observed_failure ? "CAUGHT" : "MISSED"}: ${canary.detail}`);
        }
        await sec(page).evaluate((e) => e.scrollIntoView({ block: "start" }));
        await settle(page, 500);
        await page.screenshot({ path: `${ART}/edit-${size.w}.png` }); artifacts.push(`${ART}/edit-${size.w}.png`);
        await sec(page).screenshot({ path: `${ART}/edit-section-${size.w}.png` }); artifacts.push(`${ART}/edit-section-${size.w}.png`);
        const contrast = await page.evaluate("(" + contrastProbe + ")()");
        const unreadable = contrast.rows.filter((r) => r.text !== "canary grey on grey");
        check(where, "painted price text clears contrast floors and catches unreadable canary", contrast.examined >= 25 && contrast.canaryCaught && unreadable.length === 0, JSON.stringify({ examined: contrast.examined, unreadable, canary: contrast.canaryCaught }));

        // Stepping changes the draft, never an immediate payment write.
        const writes = sent.filter((b) => b.action === "prices").length;
        await sec(page).locator('[data-price="website.monthly"] button').last().click();
        check(where, "plus moves the monthly box to 70", (await sec(page).locator('input[data-price="website.monthly"]').inputValue()) === "70");
        await sec(page).locator('[data-price="website.monthly"] button').first().click();
        check(where, "minus returns to 65 without a write", (await sec(page).locator('input[data-price="website.monthly"]').inputValue()) === "65" && sent.filter((b) => b.action === "prices").length === writes);
        await summary.focus(); await page.keyboard.press("Space");
        check(where, "keyboard folds the editor without discarding typing", !(await fold.evaluate((e) => e.open)));
        await page.keyboard.press("Space");
        check(where, "reopening keeps the unsaved 65", (await sec(page).locator('input[data-price="website.monthly"]').inputValue()) === "65");
        // ── 3. REFUSED ──
        answer.prices = "no";
        await btn(page, "Save these prices").click();
        await page.waitForSelector(".bo-prices .bo-err", { timeout: 5000 }).catch(() => {});
        check(where, "a refusal shows the server's sentence", (await sec(page).locator(".bo-err").innerText().catch(() => "")).includes("do not add up"));
        check(where, "a refusal keeps what was typed", (await sec(page).locator('input[data-price="website.monthly"]').inputValue().catch(() => "")) === "65");

        // ── 4. SAVED ──
        answer.prices = "ok";
        const lists = sent.filter((b) => b.action === "list").length;
        await btn(page, "Save these prices").click();
        await page.waitForSelector(".bo-prices button.go", { state: "detached", timeout: 5000 }).catch(() => {});
        const want2 = structuredClone(BUILT_IN); want2.website.monthly = 65;
        const s = lastOf(sent, "prices");
        check(where, "Save sends the whole table, only the edited figure changed", JSON.stringify(s?.prices) === JSON.stringify(want2), JSON.stringify(s?.prices));
        check(where, "the list is read again and Save goes away", sent.filter((b) => b.action === "list").length > lists && (await btn(page, "Save these prices").count()) === 0);
        await page.waitForFunction(() => document.querySelector(".bo-prices-from")?.textContent.includes("Changed"), null, { timeout: 5000 }).catch(() => {});
        check(where, "now says Changed here", (await sec(page).locator(".bo-prices-from").innerText().catch(() => "")).includes("Changed here"));
        check(where, "the box holds the saved figure", (await sec(page).locator('input[data-price="website.monthly"]').inputValue().catch(() => "")) === "65");

        check(where, "saved summary reads the new $65", (await summary.locator(".bo-price-preview").innerText()).includes("$65"));
        // ── 5. GO BACK ──
        const back = btn(page, "Go back to the built-in prices");
        check(where, "with a change in place, Go back is offered with no other press", await back.isVisible().catch(() => false));
        if (await back.isVisible().catch(() => false)) {
          const n = sent.filter((b) => b.action === "prices").length;
          await back.click();
          await settle(page, 300);
          check(where, "Go back asks first, in place", await sec(page).locator(".bo-sure").isVisible().catch(() => false));
          p = await probe(page, ".bo-prices .bo-sure button, .bo-prices .bo-sure p");
          check(where, "the question: no overlap, buttons 44px", p.overlaps.length === 0 && p.thin.length === 0, [...p.overlaps, ...p.thin].join(" | "));
          await sec(page).locator(".bo-sure button", { hasText: "Not yet" }).click();
          check(where, "Not yet sends nothing", sent.filter((b) => b.action === "prices").length === n);
          await back.click();
          await sec(page).locator(".bo-sure button", { hasText: "Yes" }).click();
          await page.waitForFunction(() => document.querySelector(".bo-prices-from")?.textContent.includes("Built-in"), null, { timeout: 5000 }).catch(() => {});
          const last = lastOf(sent, "prices");
          check(where, "Yes sends prices: null (read the files)", sent.filter((b) => b.action === "prices").length === n + 1 && last && "prices" in last && last.prices === null, JSON.stringify(last));
          check(where, "back to Built-in prices at 60", (await sec(page).locator('input[data-price="website.monthly"]').inputValue().catch(() => "")) === "60");
        }
      }

      const mine = consoleNoise.filter((n) => n.startsWith(`${size.w} · `));
      const planned = mine.filter((n) => /http 400 · \/functions\/v1\/platform-admin|status of 400/.test(n));
      const other = mine.filter((n) => !planned.includes(n));
      check(where, "console silent apart from the 1 refusal asked for", other.length === 0 && planned.length === 2, `${planned.length} planned; ${other.join(" | ").slice(0, 300)}`);
      observed[where] = { calls: sent.map((b) => b.action).filter((a) => a !== "platform_net") };
      completed++;
      await ctx.close();
    }
  }
} catch (e) {
  failures.push(`crashed: ${e.message}`);
  console.error(e);
} finally {
  if (browser) await browser.close();
}

if (FREEZE) process.exit(failures.length ? 1 : 0);
const status = failures.length === 0 && canary.observed_failure && completed === SIZES.length ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: `office-prices${LITE ? "-lite" : ""}`,
  started_at,
  status,
  expected_targets: SIZES.length,
  discovered_targets: Object.keys(observed).length,
  attempted_targets: SIZES.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: SIZES.length * 44,
  assertion_floor: "6 widths x 44 questions (closed + one press 13, reading 5, editing 12 including Cancel and painted contrast, refused 2, saved 5, go back 6, console 1); a hidden section reddens its first question and the rest are not counted, so it drops below the floor.",
  failures,
  artifacts,
  canary,
  warnings: [
    "Writes nothing: a made-up session and page.route() answers. Asks what the screen sends and shows, not whether the server accepts a table (pricesFrom owns that).",
    "The look itself is not judged here; the screenshots and the frozen copies in belt/shots/9.12c are the evidence for that.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), lite: LITE, figures: FIGURES, ...(BREAK && { break: BREAK }), observed },
});
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, canary ${canary.observed_failure ? "caught" : "MISSED"} → ${path}`);
process.exit(status === "pass" ? 0 : 1);
