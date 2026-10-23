// ROADMAP 9.12 — does any back-office line claim something its own row says
// is false? Run against the REAL screen and the real platform read, at 1440
// and 392.
//
//   node --env-file=.env scripts/admin-preconditions.mjs     (dev server on :5173)
//   node --env-file=.env scripts/admin-preconditions.mjs --break=old
//
// The questions, each the audit's own sentence:
//   1. Today: no "What to look at, in order" card (it repeated the call list).
//   2. Today: no call row says ring / on the phone without a tel: link on it,
//      and at least one row is there to ask (the account needing attention is
//      readable without opening anything).
//   3. Money: no row under "Money at risk" pays nothing, and the non-payer is
//      still shown — under "Not paying yet". The second half matters: a check
//      that only asks the first is passed by deleting the account.
//   4. Detailers: real detailers before fixtures.
//   5. Detailers: no "Booking · last one" over "0 customers", no
//      "No bookings · last one", and at least one 0-customer row to ask.
//
// THE CANARY injects one row of each defect into the live page with the app's
// own classes and requires the same inspector to name both. `--break=old`
// makes the inspector itself blind to the ring rule, which must turn the
// canary red; it writes `receipts/admin-preconditions.sabotage.json`.
//
// Signs in as a THROWAWAY platform admin, created here and deleted in a
// finally (`scripts/admin-account.mjs`). Do not wrap in `timeout` —
// docs/gotchas.md 90.

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
const ADMIN_EMAIL = "admin-preconditions-test@detailplatform.com";  // mail-sink: a login made by makeAdmin; autoconfirm is on and no custom SMTP, so no mail
const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }];
const ART = "artifacts/admin-preconditions";
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — nothing measured, no receipt written.");
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

// ONE INSPECTOR, run in the page, used by the real questions AND the canary, so
// the canary proves the instrument rather than a copy of it.
const INSPECT = (blindRing) => {
  const sec = (h) => [...document.querySelectorAll(".pa-sec")]
    .find((s) => s.querySelector("h2")?.textContent.trim() === h);
  const out = { rhythm: !!sec("What to look at, in order"), callRows: 0, ringNoTel: [],
    riskRows: 0, riskNoPay: [], notPayingRows: 0, bizRows: 0, demoBeforeReal: false,
    zeroCustRows: 0, badLine: [] };
  const call = sec("Detailers who need a call");
  for (const row of call ? call.querySelectorAll(".pa-do") : []) {
    out.callRows++;
    const says = /\bring\b|on the phone/i.test(row.textContent);
    if (says && !row.querySelector('a[href^="tel:"]') && !blindRing) out.ringNoTel.push(row.textContent.slice(0, 80));
  }
  const risk = sec("Money at risk");
  for (const row of risk ? risk.querySelectorAll(".pa-do") : []) {
    out.riskRows++;
    if (/paying nothing|\$0(\.00)? a month/.test(row.textContent)) out.riskNoPay.push(row.textContent.slice(0, 80));
  }
  const np = sec("Not paying yet");
  out.notPayingRows = np ? np.querySelectorAll(".pa-row").length : 0;
  let seenDemo = false;
  for (const b of document.querySelectorAll(".pa-biz")) {
    out.bizRows++;
    const demo = [...b.querySelectorAll(".pa-flag")].some((f) => f.textContent.trim().toLowerCase() === "demo");
    if (demo) seenDemo = true; else if (seenDemo) out.demoBeforeReal = true;
    const line = b.querySelector(".pa-biz-m")?.textContent ?? "";
    // PER FIGURE, NOT the footer's whole text: its spans concatenate with no
    // space ("$0 earned0 customers"), and the first version matched nothing
    // and was caught by the >=1 floor below rather than reading as clean.
    const zero = [...(b.querySelector(".pa-biz-f")?.children ?? [])]
      .some((s) => s.textContent.trim() === "0 customers");
    if (zero) out.zeroCustRows++;
    if ((zero && /^Booking · last one/.test(line)) || /^No bookings · last one/.test(line)) {
      out.badLine.push(`${b.querySelector(".pa-biz-n")?.textContent.trim()}: ${line}`);
    }
  }
  return out;
};

async function ready(page) {
  await page.waitForSelector(".pa-body", { timeout: 40000 });
  await page.waitForFunction(() => !document.querySelector(".pa-load")
    && !/Reading the platform/.test(document.body.innerText), null, { timeout: 60000 });
  await settle(page, 1200);
}

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const all = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: H })).json().catch(() => ({}));
const left = (all.users ?? []).find((u) => u.email === ADMIN_EMAIL);
if (left) { await dropAdmin(URL_, KEY, left.id); console.log("deleted a leftover throwaway admin first"); }
const acct = await makeAdmin(URL_, KEY, ADMIN_EMAIL);
if (!acct) { console.error("could not create the throwaway admin; nothing measured"); process.exit(1); }
const redact = (t) => String(t).split(acct.password).join("[password]");

let browser = null;
let signedIn = null;
let canary = { id: "injected-ring-row-and-zero-customer-line", observed_failure: false };
let completed = 0;
mkdirSync(ART, { recursive: true });
try {
  browser = await chromium.launch();
  for (const size of SIZES) {
    const where = `${size.w}${LITE ? " lite" : ""}`;
    console.log(`\n${where}`);
    const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, storageState: signedIn || undefined });
    const page = await ctx.newPage();
    watchConsole(page, where, consoleNoise);
    await page.goto(`${BASE}/admin${LITE ? "?lite=1" : ""}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type=email], .pa-top", { timeout: 40000 });
    if (await page.locator("input[type=email]").count()) {
      await page.fill("input[type=email]", acct.email);
      await page.fill("input[type=password]", acct.password);
      await page.click("form button.pa-btn");
      await page.waitForSelector(".pa-top", { timeout: 40000 });
      signedIn = await ctx.storageState();
    }
    await ready(page);
    const tab = async (label) => {
      await page.locator(".pa-tab").filter({ hasText: label }).first().click();
      await ready(page);
    };
    const shot = async (name) => {
      const p = `${ART}/${name}-${size.w}.png`;
      await page.screenshot({ path: p, fullPage: true });
      artifacts.push(p);
    };

    await tab("Today");
    let o = await page.evaluate(INSPECT, false);
    observed[`${where} today`] = o;
    check(where, "Today has no 'What to look at, in order' card", !o.rhythm);
    check(where, "Today lists the account needing a call without opening a row", o.callRows >= 1, `rows ${o.callRows}`);
    check(where, "no call row says ring/phone without a tel: link", o.ringNoTel.length === 0, o.ringNoTel.join(" | "));
    await shot("today");

    // CANARY — on this same live page, one injected row of each defect.
    if (size.w === SIZES[0].w) {
      const before = o.ringNoTel.length;
      await page.evaluate(() => {
        const sec = [...document.querySelectorAll(".pa-sec")].find((s) => s.querySelector("h2")?.textContent.trim() === "Detailers who need a call");
        const host = sec?.querySelector(".pa-card") ?? document.querySelector(".pa-body");
        const d = document.createElement("div");
        d.className = "pa-do"; d.dataset.canary = "1";
        d.textContent = "Canary Detailing — They signed up and never got going. Ring them and walk them through setup.";
        host.appendChild(d);
      });
      const c = await page.evaluate(INSPECT, BREAK === "old");
      await page.evaluate(() => document.querySelectorAll("[data-canary]").forEach((n) => n.remove()));
      canary.observed_failure = c.ringNoTel.length === before + 1;
      canary.detail = `ringNoTel ${before} -> ${c.ringNoTel.length}`;
      console.log(`    canary (ring row) ${canary.observed_failure ? "CAUGHT" : "MISSED"}: ${canary.detail}`);
    }

    await tab("Money");
    o = await page.evaluate(INSPECT, false);
    observed[`${where} money`] = o;
    check(where, "no row under Money at risk pays nothing", o.riskNoPay.length === 0, o.riskNoPay.join(" | "));
    check(where, "the non-payer is still shown, under Not paying yet", o.notPayingRows >= 1, `rows ${o.notPayingRows}`);
    await shot("money");

    await tab("Detailers");
    o = await page.evaluate(INSPECT, false);
    observed[`${where} detailers`] = o;
    check(where, "the Detailers list rendered rows", o.bizRows >= 2, `rows ${o.bizRows}`);
    check(where, "real detailers list before fixtures", !o.demoBeforeReal);
    check(where, "at least one 0-customer row exists to ask about", o.zeroCustRows >= 1, `rows ${o.zeroCustRows}`);
    check(where, "no 'last one' line contradicts its own row", o.badLine.length === 0, o.badLine.join(" | "));
    // The canary's second defect, on this list: a 0-customer row claiming a booking.
    if (size.w === SIZES[0].w) {
      const c2 = await page.evaluate((src) => {
        const list = document.querySelector(".pa-list");
        const b = document.createElement("div");
        b.className = "pa-biz"; b.dataset.canary = "1";
        b.innerHTML = '<span class="pa-biz-n">Canary</span><span class="pa-biz-m">Booking · last one yesterday</span><span class="pa-biz-f"><span><b>0</b> customers</span></span>';
        list.appendChild(b);
        // eslint-disable-next-line no-new-func
        const r = new Function(`return (${src})(false)`)();
        b.remove();
        return r.badLine.length;
      }, INSPECT.toString());
      const caught = c2 === o.badLine.length + 1;
      canary.observed_failure = canary.observed_failure && caught;
      canary.detail += `; badLine ${o.badLine.length} -> ${c2}`;
      console.log(`    canary (0-customer line) ${caught ? "CAUGHT" : "MISSED"}`);
    }
    await shot("detailers");
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
  check_id: `admin-preconditions${LITE ? "-lite" : ""}`,
  started_at,
  status,
  expected_targets: SIZES.length,
  discovered_targets: SIZES.length,
  attempted_targets: SIZES.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: SIZES.length * 9,
  assertion_floor: "2 widths x 9 questions (3 Today, 2 Money, 4 Detailers), fixed by the code; a missing section reddens a question rather than dropping it.",
  failures,
  artifacts,
  canary,
  warnings: [
    "Reads the LIVE platform list, so the population is whatever kguqylyzgyzfktkfnhjb holds today; the >=1 floors on call rows, non-payers and 0-customer rows refuse an empty population rather than pass it.",
    "Signs in as a throwaway platform admin created and deleted by this run.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), lite: LITE, ...(BREAK && { break: BREAK }), observed },
});
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, canary ${canary.observed_failure ? "caught" : "MISSED"} → ${path}`);
process.exit(status === "pass" ? 0 : 1);
