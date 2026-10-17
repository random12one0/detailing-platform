// ROADMAP 97.83 — A LINK'S "EARNED" DOES NOT COUNT MONEY REFUNDED IN STRIPE.
//
// 97.82 took refunds off the Money screen's Earned; `whereFrom()` in
// `lib/moneyAdvanced.js` kept its own bare-price reading, so a job refunded in full still
// counted as earned under the link that brought it — on Tracking links AND on Money's
// Booking sources block, which both draw `whereFrom`. Tracking links also never read the
// refund columns. The fix values each job by what it KEPT (`keptOf`), as Money does.
//
// Signs in as the demo owner and feeds both screens' own reads through `page.route` —
// never a database write. One link, two people opened it, two finished card jobs booked
// through it this month: the scenario job ($150) and a plain paid $60 job:
//
//   refunded        $150 refunded in full           → the link earned $60
//   part-refunded   $50 of $150 refunded            → $160
//   other-payment   a DIFFERENT payment refunded    → $210 (the refused case)
//   paid            nothing refunded                → $210 (the canary)
//
// Asserted on Tracking links (the row's line AND the opened panel's figure) and on Money's
// Booking sources line, at 390, 320, 768 and 1440.
//
// SABOTAGE: --break=bare-price serves `moneyAdvanced.js` with `whereFrom`'s value back to
// the bare price (the original defect), signed and read back from the page (docs/gotchas.md
// 113). refunded and part-refunded must go red; other-payment and paid stay green.
//
// --freeze=before|after writes the review copies at 390 (refunded) to belt/shots/97.83 and
// writes NO receipt.
//
//   set -a; . <main checkout>/.env; set +a      (DEMO_OWNER_PW; SUPABASE_URL + SUPABASE_ANON_KEY for --env-shim)
//   node scripts/link-refund.mjs [--base=http://127.0.0.1:5180] [--env-shim] [--break=bare-price] [--freeze=before|after]

import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { demoOwner } from "./lib/demoOwner.mjs";
import { writeReceipt } from "./receipt.mjs";
import { money } from "../app/src/lib/format.js";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium } = require("playwright");

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=") ?? "";
const BASE = arg("base") || process.env.BASE_URL || "http://localhost:5173";
const BREAK = arg("break");
if (BREAK && BREAK !== "bare-price") { console.error(`unknown --break=${BREAK}`); process.exit(2); }
const FREEZE = arg("freeze");
if (FREEZE && !["before", "after"].includes(FREEZE)) { console.error(`unknown --freeze=${FREEZE}`); process.exit(2); }
// Must match exactly once, or the sabotage did not land (docs/gotchas.md 102).
const REWRITE = ["const kept = (b) => keptOf(b, num(b.final_amount ?? b.total_price));", "const kept = (b) => num(b.final_amount ?? b.total_price);"];
const BELT = "C:/Users/rando/Downloads/claude/belt/shots/97.83";
const SHOTS = arg("shots") || `${BELT}/png`;
mkdirSync(SHOTS, { recursive: true });
const started_at = new Date().toISOString();

const NOW = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
const START = new Date(Date.parse(NOW) - 3600000).toISOString(), END = new Date(Date.parse(NOW) - 60000).toISOString();
const WIDTHS = FREEZE ? [[390, 844]] : [[390, 844], [320, 640], [768, 1024], [1440, 900]];
const AT = "2026-10-16T15:00:00.000Z";
const CID = "9783a0a0-0000-4000-8000-000000009783";
const CAMPAIGN = { id: CID, slug: "golf-course-flyer", name: "Golf course flyer", promo_code: null, is_active: true, created_at: AT };
const VISITS = ["v-9783-a", "v-9783-b"].map((visitor_id) => ({ campaign_id: CID, visitor_id, referrer: null, created_at: NOW }));
const job = (refunded, intent = "pi_1") => ({
  id: randomUUID(), campaign_id: CID, status: "completed", start_at: START, end_at: END, customer_name: "Refund Case",
  payment_status: "paid", paid_online_at: AT, stripe_payment_intent: "pi_1", finalized_at: null,
  total_price: 150, final_amount: null, services: [{ name_at_booking: "Full detail", price_at_booking: 150 }],
  payment_problem: refunded == null ? null : { kind: "extra", paid_cents: 0, owed_cents: 0, currency: "usd", at: AT,
    refunds: { [intent]: { paid_cents: 15000, refunded_cents: refunded, at: AT } } },
});
const PLAIN = {
  campaign_id: CID, status: "completed", start_at: START, end_at: END, customer_name: "Plain Case",
  payment_status: "paid", paid_online_at: AT, stripe_payment_intent: "pi_9", payment_problem: null, finalized_at: null,
  total_price: 60, final_amount: null, services: [{ name_at_booking: "Express wash", price_at_booking: 60 }],
};
const ALL = [
  { id: "refunded", patch: job(15000), earned: 60 },
  { id: "part-refunded", patch: job(5000), earned: 160 },
  { id: "other-payment", patch: job(15000, "pi_2"), earned: 210 },
  { id: "paid", patch: job(null), earned: 210 },
];
const SCENARIOS = FREEZE ? ALL.slice(0, 1) : ALL;
const SCREENS = ["tracking", "money"];
const EXPECTED = SCENARIOS.length * WIDTHS.length * SCREENS.length;

let assertions = 0;
const failures = [];
const check = (name, ok, detail = "") => {
  assertions++;
  if (ok) console.log(`  ok    ${name}`);
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.error(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
};

const browser = await chromium.launch();
if (process.argv.includes("--env-shim")) {
  const url = process.env.SUPABASE_URL ?? "", anon = process.env.SUPABASE_ANON_KEY ?? "";
  if (!url.includes("kguqylyzgyzfktkfnhjb") || !anon) { console.error("--env-shim needs SUPABASE_URL for kguqylyzgyzfktkfnhjb and SUPABASE_ANON_KEY loaded"); process.exit(2); }
  const inject = `import.meta.env = {"VITE_SUPABASE_URL": ${JSON.stringify(url)}, "VITE_SUPABASE_ANON_KEY": ${JSON.stringify(anon)}, `;
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (opts) => {
    const ctx = await newContext(opts);
    await ctx.route(/\/src\/.*\.(js|jsx|ts|tsx)(\?|$)/, async (route) => {
      for (let i = 0; i < 3; i++) {
        try {
          const res = await route.fetch();
          let text = await res.text();
          if (!text.includes('"VITE_SUPABASE_URL"')) text = text.replace("import.meta.env = {", inject);
          // The sabotage rides the same route so the two cannot fight over one request.
          if (BREAK && /\/src\/lib\/moneyAdvanced\.js(\?|$)/.test(route.request().url())) {
            const n = text.split(REWRITE[0]).length - 1;
            text = text.replace(REWRITE[0], REWRITE[1]) + `\nwindow.__beltLink = ${n};\n`;
          }
          return await route.fulfill({ response: res, body: text });
        } catch {}
      }
      await route.abort().catch(() => {});
    });
    return ctx;
  };
} else if (BREAK) { console.error("--break needs --env-shim here (the sabotage rides its module route)"); process.exit(2); }

const login = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const lp = await login.newPage();
await lp.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
await lp.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
if (await lp.locator("input[type=email]").count()) {
  await lp.fill("input[type=email]", demoOwner().email ?? "demo@detailplatform.com");
  await lp.fill("input[type=password]", demoOwner().password);
  await lp.click("form button.btn.primary");
  await lp.waitForSelector(".tabbar", { timeout: 30000 });
}
const state = await login.storageState();
await login.close();

const getOnly = (json) => (route) => route.request().method() === "GET" ? route.fulfill({ json }) : route.continue();

let discovered = 0, attempted = 0, completed = 0;
const probed = [];
for (const sc of SCENARIOS) {
  for (const [w, h] of WIDTHS) {
    for (const screen of SCREENS) {
      discovered++;
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, storageState: state, timezoneId: "America/Los_Angeles" });
      await ctx.clock.setFixedTime(new Date(NOW));
      await ctx.addInitScript(() => { localStorage.setItem("dp.lang.app", "en"); });
      const page = await ctx.newPage();
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push(String(e)));
      let fed = null, linkRead = null, linkStatus = null;
      await page.route("**/rest/v1/campaigns?**", getOnly([CAMPAIGN]));
      await page.route("**/rest/v1/campaign_visits?**", getOnly(VISITS));
      await page.route("**/rest/v1/bookings?**", async (route) => {
        const url = decodeURIComponent(route.request().url());
        if (route.request().method() !== "GET") return route.continue().catch(() => {});
        // Tracking links' own read: every booking that came through a link.
        if (screen === "tracking" && url.includes("campaign_id=not.is.null")) {
          linkRead = url;
          // The REAL server answers the widened read first, so a column it refuses is seen.
          linkStatus = await route.fetch().then((r) => r.status()).catch((e) => String(e));
          fed = [sc.patch, { ...PLAIN, id: randomUUID() }];
          return route.fulfill({ json: fed });
        }
        // Money: the period's range read only (it carries both ends), on a real row's shape.
        if (screen !== "money" || !url.includes("start_at=gte") || !url.includes("start_at=lte")) return route.continue().catch(() => {});
        try {
          const res = await route.fetch();
          const body = await res.json().catch(() => null);
          const row = Array.isArray(body) ? body.find((b) => b?.id) : null;
          if (!row) return await route.fulfill({ response: res, json: body });
          fed = [{ ...row, ...sc.patch }, { ...row, ...PLAIN, id: randomUUID() }];
          await route.fulfill({ response: res, json: fed });
        } catch { await route.abort().catch(() => {}); }
      });
      attempted++;
      const tag = `${sc.id} · ${screen} @ ${w}x${h}`;
      const want = t => `${money(sc.earned)} earned`;
      let line = null, panel = null;
      if (screen === "tracking") {
        await page.goto(`${BASE}/app?settings=campaigns`, { waitUntil: "domcontentloaded" });
        const open = page.locator("button.camp-open", { hasText: CAMPAIGN.name });
        await open.waitFor({ timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(1200);
        line = await open.locator(".sub").textContent({ timeout: 5000 }).catch(() => null);
        await open.click({ timeout: 5000 }).catch(() => {});
        await page.waitForSelector(".camp-panel", { timeout: 5000 }).catch(() => {});
        panel = await page.evaluate(() => {
          for (const s of document.querySelectorAll(".camp-panel .camp-stat")) {
            if (s.querySelector(".camp-l")?.textContent.trim() === "earned") return s.querySelector(".camp-n")?.textContent.trim() ?? null;
          }
          return null;
        });
        // `*`, not a named list: naming payment_problem 400s the read where its migration has not run.
        check(`${tag} · Tracking links' read takes every column, the refund ones included`,
          !!linkRead && linkRead.includes("select=*&"), linkRead ?? "never read");
        check(`${tag} · the real server accepts that read`, linkStatus === 200, `status ${linkStatus}`);
        check(`${tag} · the row reads "${want()}"`, !!line && line.includes(want()), JSON.stringify(line));
        check(`${tag} · the opened panel's earned reads ${money(sc.earned)}`, panel === money(sc.earned), JSON.stringify(panel));
      } else {
        await page.goto(`${BASE}/app/money`, { waitUntil: "domcontentloaded" });
        await page.waitForSelector("[data-tour=sources]", { state: "attached", timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(1500);
        line = await page.evaluate((name) => {
          for (const m of document.querySelectorAll("[data-tour=sources] .advmeter")) {
            if (m.querySelector(".advmeter-k")?.textContent.trim() === name) return m.querySelector(".advmeter-sub")?.textContent.trim() ?? "";
          }
          return null;
        }, CAMPAIGN.name);
        check(`${tag} · Booking sources draws the link`, line != null, "no .advmeter for the link");
        check(`${tag} · Booking sources reads "${want()}"`, !!line && line.includes(want()), JSON.stringify(line));
      }
      check(`${tag} · the screen's bookings read was fed`, !!fed, "page.route never matched the screen's bookings read");
      if (BREAK) {
        const n = await page.evaluate(() => window.__beltLink);
        check(`${tag} · the sabotage landed once in moneyAdvanced and RAN`, n === 1, `window.__beltLink = ${n}`);
      }
      check(`${tag} · console clean`, errors.length === 0, errors.slice(0, 3).join(" | "));
      const look = screen === "tracking" ? ".camp-panel" : "[data-tour=sources]";
      await page.locator(look).scrollIntoViewIfNeeded().catch(() => {});
      if (FREEZE) {
        const { freeze } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
        const out = `${BELT}/${FREEZE}${screen === "money" ? "-money" : ""}.html`;
        const where = screen === "money" ? "on Money's Booking sources" : "on Tracking links";
        await freeze(page, {
          out, label: FREEZE === "before" ? "Before" : "After",
          note: FREEZE === "before"
            ? `The $150 job this flyer brought in was refunded in full, yet ${where} the flyer still says it earned $210.`
            : `The same refunded job now adds nothing: ${where} the flyer says it earned $60, the one job it kept.`,
          highlight: look,
        });
        console.log(`froze ${out}`);
      }
      const file = `${SHOTS}/${BREAK ? `break-${BREAK}-` : FREEZE ? `${FREEZE}-` : ""}${screen}-${sc.id}-${w}x${h}.png`;
      await page.screenshot({ path: file, fullPage: false });
      probed.push({ scenario: sc.id, screen, width: w, line, panel, errors: errors.length, shot: file });
      completed++;
      await ctx.close();
    }
  }
}
await browser.close();

console.log(`\n${assertions - failures.length} passed, ${failures.length} failed, ${completed} of ${EXPECTED} views.`);
if (FREEZE) { console.log("--freeze run: review copy only, NO receipt written."); process.exit(0); }
const canaryRows = probed.filter((p) => p.scenario === "paid");
const { path } = writeReceipt({
  check_id: BREAK ? `link-refund-${BREAK}` : "link-refund",
  started_at,
  status: failures.length || completed !== EXPECTED ? "fail" : "pass",
  expected_targets: EXPECTED,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: EXPECTED * 4,
  failures,
  dimensions: { base: BASE, frozen_now: NOW, widths: WIDTHS.map(([w, h]) => `${w}x${h}`), ...(BREAK ? { break: BREAK } : {}), env_shim: process.argv.includes("--env-shim"), probed },
  artifacts: [SHOTS],
  // The canary: the unrefunded job still counts its whole $150 under the link, so a probe
  // that reads every refunded-looking figure as zero cannot pass.
  canary: BREAK ? { id: `break-${BREAK}`, observed_failure: failures.length > 0 }
    : { id: "unrefunded-job-still-counts-in-full", observed_failure: canaryRows.length === WIDTHS.length * SCREENS.length
      && canaryRows.every((p) => p.line?.includes(`${money(210)} earned`)) },
});
console.log(`receipt: ${path}`);
process.exit(failures.length || completed !== EXPECTED ? 1 : 0);
