// ROADMAP 97.80 — THE PAYMENT PILL ON TODAY'S CARD, NOT ONLY ON THE JOB RECORD.
//
// `BookingCard` draws a payment pill too, and Today draws the lit job (the one on
// now or next) as that card. A job paid by card and then refunded in Stripe must
// read "Refunded" / "Part refunded" there, never the green "Paid". This signs in
// as the demo owner and feeds Today's own bookings read through `page.route` —
// never a database write — with ONE job: confirmed, later today, paid by card,
// its own payment refunded as `payment_problem.refunds` records it (97.68).
//
//   refunded       refunded in full            → "Refunded", not the green pill
//   part-refunded  $50 of $150 refunded        → "Part refunded"
//   refunded-es    the same in Spanish         → "Devuelto"
//   paid           nothing refunded            → "Paid", green (the refused case and the canary)
//
// SABOTAGE: --break=plain-pill rewrites the served BookingCard module so the pill
// reads `payment_status` alone again (the original defect), signed and read back
// from the page (docs/gotchas.md 113). The three refunded views must go red.
//
//   set -a; . ./.env; set +a      (DEMO_OWNER_PW; SUPABASE_URL + SUPABASE_ANON_KEY for --env-shim)
//   node scripts/pay-pill-card.mjs [--base=http://127.0.0.1:5180] [--env-shim] [--break=plain-pill] [--shots=<dir>]
//   --env-shim: a belt job copy's server has no app/.env.local; same shim as payment-problem-late.mjs.

import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { demoOwner } from "./lib/demoOwner.mjs";
import { writeReceipt } from "./receipt.mjs";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium } = require("playwright");

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=") ?? "";
const BASE = arg("base") || process.env.BASE_URL || "http://localhost:5173";
const BREAK = arg("break");
if (BREAK && BREAK !== "plain-pill") { console.error(`unknown --break=${BREAK}`); process.exit(2); }
const REWRITE = BREAK ? ["const pay = payPill(booking);", "const pay = booking.payment_status;"] : null;
const SHOTS = arg("shots") || "C:/Users/rando/Downloads/claude/belt/shots/97.80/png";
mkdirSync(SHOTS, { recursive: true });
const started_at = new Date().toISOString();

// The page's clock is frozen at the REAL time: a clock ahead of the sign-in made its token
// look expired, so every view refreshed it and the auth rate limit refused the rest (429).
// The job runs from a minute ago to a minute from now, so it is Today's lit card ("On now").
const NOW = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
const START = new Date(Date.parse(NOW) - 60000).toISOString(), END = new Date(Date.parse(NOW) + 60000).toISOString();
const WIDTHS = [[390, 844], [768, 1024], [1440, 900]];
const AT = "2026-10-16T15:00:00.000Z";
const job = (refunded) => ({
  status: "confirmed", start_at: START, end_at: END,
  payment_status: "paid", paid_online_at: AT, stripe_payment_intent: "pi_1", finalized_at: null,
  total_price: 150, final_amount: null,
  payment_problem: refunded == null ? null : { kind: "extra", paid_cents: 0, owed_cents: 0, currency: "usd", at: AT,
    refunds: { pi_1: { paid_cents: 15000, refunded_cents: refunded, at: AT } } },
});
const SCENARIOS = [
  { id: "refunded", patch: job(15000), pill: "Refunded" },
  { id: "part-refunded", patch: job(5000), pill: "Part refunded" },
  { id: "refunded-es", lang: "es", patch: job(15000), pill: "Devuelto" },
  { id: "paid", patch: job(null), pill: "Paid" },
];
const EXPECTED = SCENARIOS.length * WIDTHS.length;

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
          const text = await res.text();
          return await route.fulfill({ response: res, body: text.includes('"VITE_SUPABASE_URL"') ? text : text.replace("import.meta.env = {", inject) });
        } catch {}
      }
      await route.abort().catch(() => {});
    });
    return ctx;
  };
}

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

let discovered = 0, attempted = 0, completed = 0;
const probed = [];
for (const sc of SCENARIOS) {
  for (const [w, h] of WIDTHS) {
    discovered++;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, storageState: state, timezoneId: "America/Los_Angeles" });
    await ctx.clock.setFixedTime(new Date(NOW));
    await ctx.addInitScript((lang) => { localStorage.setItem("dp.lang.app", lang); }, sc.lang ?? "en");
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));
    // Today's range read (it carries a start_at window): answered with ONE row, a real
    // demo booking reshaped into this scenario, so it is the only job on today's rail.
    let fed = 0;
    await page.route("**/rest/v1/bookings?**", async (route) => {
      const url = route.request().url();
      if (route.request().method() !== "GET" || !url.includes("start_at=gte")) return route.continue().catch(() => {});
      // A read still in flight when the view closes rejects; that view is already measured.
      try {
        const res = await route.fetch();
        const body = await res.json().catch(() => null);
        const row = Array.isArray(body) ? body.find((b) => b?.id) : null;
        if (!row) return await route.fulfill({ response: res, json: body });
        fed++;
        await route.fulfill({ response: res, json: [{ ...row, ...sc.patch }] });
      } catch { await route.abort().catch(() => {}); }
    });
    let hid = 0;
    if (REWRITE) await page.route("**/src/components/BookingCard.jsx*", async (route) => {
      const res = await route.fetch();
      const text = await res.text();
      hid = text.split(REWRITE[0]).length - 1;
      await route.fulfill({ response: res, body: text.replace(REWRITE[0], REWRITE[1]) + "\nwindow.__beltBreak = true;\n" });
    });
    attempted++;
    await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".card.attend", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const tag = `${sc.id} @ ${w}x${h}`;
    check(`${tag} · Today's bookings read was fed`, fed > 0, "page.route never matched a bookings range read carrying a row");
    if (REWRITE) check(`${tag} · the sabotage landed once and RAN`, hid === 1 && await page.evaluate(() => window.__beltBreak === true), `matched ${hid}`);
    const card = await page.evaluate(() => {
      const c = document.querySelector(".card.attend");
      if (!c) return null;
      const pill = c.querySelector("[data-pay-pill]");
      c.scrollIntoView({ block: "center" });
      const r = pill?.getBoundingClientRect();
      const hit = r && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { dim: getComputedStyle(document.querySelector("#root") ?? document.body).opacity, pill: pill?.textContent.trim() ?? null, paid: !!pill?.classList.contains("paid"), pills: c.querySelectorAll("[data-pay-pill]").length,
        inside: !!r && r.left >= 0 && r.right <= window.innerWidth + 0.5, hit: !!hit && (hit === pill || pill.contains(hit)) };
    });
    check(`${tag} · today's job is drawn as the card`, !!card, "no .card.attend on Today");
    if (card) {
      check(`${tag} · the card's payment pill says "${sc.pill}"`, card.pill === sc.pill, JSON.stringify(card));
      check(`${tag} · the pill is ${sc.pill === "Paid" ? "" : "NOT "}the green Paid one`, card.paid === (sc.pill === "Paid"), JSON.stringify(card));
      check(`${tag} · one payment pill, never "Paid" beside "Refunded"`, card.pills === 1, `${card.pills} pills`);
      check(`${tag} · inside the screen and painted on top`, card.inside && card.hit, JSON.stringify(card));
    }
    check(`${tag} · console clean`, errors.length === 0, errors.slice(0, 3).join(" | "));
    const file = `${SHOTS}/${BREAK ? `break-${BREAK}-` : ""}today-card-${sc.id}-${w}x${h}.png`;
    await page.screenshot({ path: file, fullPage: false });
    probed.push({ scenario: sc.id, width: w, pill: card?.pill ?? null, green: card?.paid ?? null, errors: errors.length, shot: file });
    completed++;
    await ctx.close();
  }
}
await browser.close();

console.log(`\n${assertions - failures.length} passed, ${failures.length} failed, ${completed} of ${EXPECTED} views.`);
const { path } = writeReceipt({
  check_id: BREAK ? `pay-pill-card-${BREAK}` : "pay-pill-card",
  started_at,
  status: failures.length || completed !== EXPECTED ? "fail" : "pass",
  expected_targets: EXPECTED,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: EXPECTED * 6,
  failures,
  dimensions: { base: BASE, frozen_now: NOW, widths: WIDTHS.map(([w, h]) => `${w}x${h}`), ...(BREAK ? { break: BREAK } : {}), env_shim: process.argv.includes("--env-shim"), probed },
  artifacts: [SHOTS],
  // The canary: the unrefunded job must still wear the green "Paid", measured by the same
  // probe, so a probe that finds "Refunded" everywhere (or no pill at all) cannot pass both.
  canary: BREAK ? { id: `break-${BREAK}`, observed_failure: failures.length > 0 }
    : { id: "unrefunded-job-stays-green-paid", observed_failure: probed.some((p) => p.scenario === "paid") && probed.filter((p) => p.scenario === "paid").every((p) => p.pill === "Paid" && p.green) },
});
console.log(`receipt: ${path}`);
process.exit(failures.length || completed !== EXPECTED ? 1 : 0);
