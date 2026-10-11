// ROADMAP 9.12a step 6, slice 6b — the platform price editor, which lived only on
// the old five-tab back office, now on the new one's Money place ("What
// detailers pay").
//
//   node scripts/office-prices.mjs                 (dev server on :5173; no credentials)
//   node scripts/office-prices.mjs --lite          (the ?lite=1 reduced-motion path)
//   node scripts/office-prices.mjs --break=hidden  (sabotage: the new section is hidden)
//   node scripts/office-prices.mjs --break=wide    (sabotage: the 2026-10-11 phone fault back —
//                                                    the plans side by side, off the right edge)
//   node scripts/office-prices.mjs --freeze=before|after   (Andrew's frozen copies, no assertions)
//
// WRITES NOTHING ANYWHERE. A made-up session sits in the browser's storage and
// every `platform-admin` call is answered by page.route(). So `prices` is asked
// what it SENDS and what the screen does with each answer, never whether the
// server takes it (`pricesFrom` and the edge function own that).
//
// WHAT IT ASKS, at 1440, 392 and 320:
//   1. the section shows all 11 figures of the built-in table, each in its unit
//      ($, months, "% of what is left"), says "Built-in prices", and offers no
//      "go back" when there is nothing to go back from;
//   2. "Change these prices" opens 11 boxes holding the STORED values, and each
//      box's reading follows what is typed (0.5 -> 50%, 50 -> 5000%);
//   3. a refusal shows the server's own sentence and keeps what was typed;
//   4. Save sends `prices` with the WHOLE table, every one of the 11 figures, the
//      edited one changed and nothing else; the list is read again; the editor shuts;
//   5. with an override in place it says "Changed here" and offers "Go back";
//      "Not yet" sends nothing; "Yes" sends `prices: null`;
//   6. no overlap, no sideways overflow, 44px of real hit area, console silent
//      apart from the one refusal asked for.
// THE CANARY injects an overlapping copy of a button and requires the same
// overlap probe to name it.

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=")[1] || "";
const BREAK = arg("break");
const FREEZE = arg("freeze");
const LITE = process.argv.includes("--lite");
const BASE = process.env.BASE || "http://localhost:5173";
const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }, { w: 320, h: 700 }];
const ART = "artifacts/office-prices";
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/9.12a";
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
  const els = [...document.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().width > 0);
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
  if (BREAK === "hidden" || BREAK === "wide") await ctx.addInitScript((css) => {
    const s = () => { const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st); };
    if (document.head) s(); else document.addEventListener("DOMContentLoaded", s);
  }, BREAK === "hidden" ? ".bo-prices { display: none !important; }" : ".bo-prices { min-width: auto !important; }");
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
    const { freeze } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
    const { ctx, page } = await openPage({ w: 390, h: 844 });
    if (FREEZE === "before") {
      await page.evaluate(() => window.scrollTo(0, 1e6));
      await settle(page, 400);
      await freeze(page, { out: `${SHOTS}/before-prices.html`, label: "Before",
        note: "The new back office's Money place ends at the platform bills: there is nowhere to see or change what detailers are charged. That editor is only on the old screen.",
        highlight: ".bo-money > :last-child" });
    } else {
      await btn(page, "Change these prices").click();
      await settle(page, 500);
      await page.locator('.bo-prices input[data-price="website.monthly"]').fill("65");
      await sec(page).scrollIntoViewIfNeeded();
      await freeze(page, { out: `${SHOTS}/after-prices.html`, label: "After",
        note: "Money now ends with \"What detailers pay\": every price grouped by plan, and \"Change these prices\" (opened here, with the monthly price typed as 65) saves the whole table through the same server check as before.",
        highlight: ".bo-prices" });
    }
    await ctx.close();
    console.log(`froze ${FREEZE} into ${SHOTS}`);
  } else {
    for (const size of SIZES) {
      const where = `${size.w}${LITE ? " lite" : ""}`;
      console.log(`\n${where}`);
      const { ctx, page, sent, answer } = await openPage(size);

      // ── 1. READING ──
      const visible = await sec(page).isVisible().catch(() => false);
      check(where, "Money has a What detailers pay section", visible);
      if (visible) {
        await sec(page).scrollIntoViewIfNeeded();
        const shown = await sec(page).locator("[data-price]").evaluateAll((els) => els.map((e) => [e.dataset.price, e.querySelector(".v")?.textContent.trim()]));
        const want = { "website.setup": "$999", "website.monthly": "$60", "website.annual": "$600", "website.monthToMonth": "$75", "bookingOnly.monthly": "$35",
          "founding.setup": "$499", "founding.monthly": "$40", "founding.annual": "$400", "founding.monthToMonth": "$50", "term.months": "12 months", "term.exitFeeShare": "50% of what is left" };
        const got = Object.fromEntries(shown);
        check(where, `all ${FIGURES} figures shown, each in its unit`, shown.length === FIGURES && Object.entries(want).every(([k, v]) => got[k] === v), JSON.stringify(got));
        check(where, "says Built-in prices", (await sec(page).locator(".bo-prices-from").innerText().catch(() => "")).includes("Built-in"));
        let p = await probe(page, ".bo-prices [data-price] > *, .bo-prices button, .bo-prices .bo-prices-from");
        check(where, "reading: no overlap, buttons 44px, nothing cut by an edge, no sideways overflow", p.overlaps.length === 0 && p.thin.length === 0 && p.cut.length === 0 && !p.overflowX, [...p.overlaps, ...p.thin, ...p.cut].join(" | "));
        await sec(page).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${ART}/read-${size.w}.png` }); artifacts.push(`${ART}/read-${size.w}.png`);

        // ── 2. EDITING ──
        await btn(page, "Change these prices").click();
        await page.waitForSelector(".bo-prices input[data-price]", { timeout: 5000 }).catch(() => {});
        const boxes = await sec(page).locator("input[data-price]").evaluateAll((els) => els.map((e) => [e.dataset.price, e.value]));
        check(where, `${FIGURES} boxes holding the stored values`, boxes.length === FIGURES && boxes.every(([k, v]) => String(flat(BUILT_IN).find(([f]) => f === k)?.[1]) === v), JSON.stringify(boxes));
        check(where, "no Go back while nothing is changed", (await btn(page, "Go back").count()) === 0);
        const exit = sec(page).locator('input[data-price="term.exitFeeShare"]');
        const reading = () => sec(page).locator('[data-price="term.exitFeeShare"] .v').innerText().catch(() => "");
        check(where, "exit fee box reads 50% of what is left", (await reading()) === "50% of what is left");
        await exit.fill("50");
        check(where, "typing 50 reads 5000% out loud", (await reading()) === "5000% of what is left", await reading());
        await exit.fill("0.5");
        await sec(page).locator('input[data-price="website.monthly"]').fill("65");
        p = await probe(page, ".bo-prices input, .bo-prices button, .bo-prices [data-price] .v, .bo-prices [data-price] .k");
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
        await sec(page).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${ART}/edit-${size.w}.png` }); artifacts.push(`${ART}/edit-${size.w}.png`);

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
        await page.waitForSelector(".bo-prices input[data-price]", { state: "detached", timeout: 5000 }).catch(() => {});
        const want2 = structuredClone(BUILT_IN); want2.website.monthly = 65;
        const s = lastOf(sent, "prices");
        check(where, "Save sends the whole table, only the edited figure changed", JSON.stringify(s?.prices) === JSON.stringify(want2), JSON.stringify(s?.prices));
        check(where, "the list is read again and the editor shuts", sent.filter((b) => b.action === "list").length > lists && (await sec(page).locator("input").count()) === 0);
        await page.waitForFunction(() => document.querySelector(".bo-prices-from")?.textContent.includes("Changed"), null, { timeout: 5000 }).catch(() => {});
        check(where, "now says Changed here", (await sec(page).locator(".bo-prices-from").innerText().catch(() => "")).includes("Changed here"));
        check(where, "the saved figure is what it reads", (await sec(page).locator('[data-price="website.monthly"] .v').innerText().catch(() => "")) === "$65");

        // ── 5. GO BACK ──
        await btn(page, "Change these prices").click();
        await settle(page, 300);
        const back = btn(page, "Go back to the built-in prices");
        check(where, "with a change in place, Go back is offered", await back.isVisible().catch(() => false));
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
          check(where, "back to Built-in prices at $60", (await sec(page).locator('[data-price="website.monthly"] .v').innerText().catch(() => "")) === "$60");
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
  discovered_targets: SIZES.length,
  attempted_targets: SIZES.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: SIZES.length * 22,
  assertion_floor: "3 widths x 22 questions (reading 4, editing 5, refused 2, saved 4, go back 6, console 1); a hidden section reddens its first question and the rest are not counted, so it drops below the floor.",
  failures,
  artifacts,
  canary,
  warnings: [
    "Writes nothing: a made-up session and page.route() answers. Asks what the screen sends and shows, not whether the server accepts a table (pricesFrom owns that).",
    "The look itself is not judged here; the screenshots and the frozen copies in belt/shots/9.12a are the evidence for that.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), lite: LITE, figures: FIGURES, ...(BREAK && { break: BREAK }), observed },
});
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, canary ${canary.observed_failure ? "caught" : "MISSED"} → ${path}`);
process.exit(status === "pass" ? 0 : 1);
