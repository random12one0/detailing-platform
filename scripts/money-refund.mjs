// ROADMAP 97.82 — THE MONEY SCREEN DOES NOT COUNT MONEY REFUNDED IN STRIPE.
//
// 97.81 fixed Today and the export's Status cell; the Money screen's Earned, Collected,
// Net and the accountant file's Amount column still read the job's price whatever was
// refunded. The ruling (see `lib/moneyAdvanced.js`, "A REFUND COMES OFF EARNED"): a
// refund is money handed back, so it comes off Earned, and so off Net, the chart and
// Amount — earned = collected + still owed keeps holding and nothing calls it owed.
//
// Signs in as the demo owner and feeds the Money screen's own reads through
// `page.route` — never a database write. This month: the scenario job (paid by card,
// $150), one unpaid $60 job, one $40 expense, no line items:
//
//   refunded        refunded in full                → earned 60,  collected 0,   owed 60, net 20
//   part-refunded   $50 of $150 refunded            → earned 160, collected 100, owed 60, net 120
//   other-payment   a DIFFERENT payment refunded    → earned 210, collected 150, owed 60, net 170 (refused case)
//   paid            nothing refunded                → earned 210, collected 150, owed 60, net 170 (the canary)
//
// and asserts, in Node on the exact rows the screen drew, that the accountant file's
// Amount column adds up to the Net the screen PRINTS.
//
// SABOTAGE: --break=status-only serves `moneyAdvanced.js` and a scratch copy of the export
// with the job's value back to its bare price, so `payment_status === "paid"` alone decides
// it again (the original defect). Both signed and read back (docs/gotchas.md 113).
// refunded and part-refunded must go red; other-payment and paid stay green.
//
// --freeze=before|after writes the review copy at 390 (refunded) to belt/shots/97.82 and
// writes NO receipt.
//
//   set -a; . <main checkout>/.env; set +a      (DEMO_OWNER_PW; SUPABASE_URL + SUPABASE_ANON_KEY for --env-shim)
//   node scripts/money-refund.mjs [--base=http://127.0.0.1:5180] [--env-shim] [--break=status-only] [--freeze=before|after]

import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
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
if (BREAK && BREAK !== "status-only") { console.error(`unknown --break=${BREAK}`); process.exit(2); }
const FREEZE = arg("freeze");
if (FREEZE && !["before", "after"].includes(FREEZE)) { console.error(`unknown --freeze=${FREEZE}`); process.exit(2); }
// Each rewrite must match exactly once, or the sabotage did not land (docs/gotchas.md 102).
const REWRITES = {
  "moneyAdvanced.js": ["const paidOf = (b) => keptOf(b, num(b.final_amount ?? b.total_price));", "const paidOf = (b) => num(b.final_amount ?? b.total_price);"],
  "accountant-export.js": ["amount: keptOf(b, Number(b.final_amount ?? b.total_price ?? 0)),", "amount: Number(b.final_amount ?? b.total_price ?? 0),"],
};
const BELT = "C:/Users/rando/Downloads/claude/belt/shots/97.82";
const SHOTS = arg("shots") || `${BELT}/png`;
mkdirSync(SHOTS, { recursive: true });
const started_at = new Date().toISOString();

// THE EXPORT HALF RUNS IN NODE on the rows the screen drew: an in-page import was measured
// (97.81) to read an unsabotaged second copy of the module.
const EXPORT_SRC = new URL("../app/src/lib/accountant-export.js", import.meta.url);
let exportMod, exportHits = null;
if (BREAK) {
  const [from, to] = REWRITES["accountant-export.js"];
  const text = readFileSync(EXPORT_SRC, "utf8");
  exportHits = text.split(from).length - 1;
  const tmp = new URL("./money-refund-break.tmp.mjs", import.meta.url);
  const payPill = JSON.stringify(new URL("../app/src/lib/payPill.js", import.meta.url).href);
  writeFileSync(tmp, text.replace(from, to).replace('from "./payPill.js"', `from ${payPill}`) + "\nexport const __beltBroken = true;\n");
  try { exportMod = await import(tmp.href); } finally { unlinkSync(tmp); }
} else exportMod = await import(EXPORT_SRC.href);

const NOW = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
const START = new Date(Date.parse(NOW) - 3600000).toISOString(), END = new Date(Date.parse(NOW) - 60000).toISOString();
const TODAY = new Date(NOW).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
const WIDTHS = FREEZE ? [[390, 844]] : [[390, 844], [320, 640], [768, 1024], [1440, 900]];
const AT = "2026-10-16T15:00:00.000Z";
const job = (refunded, intent = "pi_1") => ({
  status: "completed", start_at: START, end_at: END, customer_name: "Refund Case",
  payment_status: "paid", paid_online_at: AT, stripe_payment_intent: "pi_1", finalized_at: null,
  total_price: 150, final_amount: null, services: [{ name_at_booking: "Full detail", price_at_booking: 150 }],
  payment_problem: refunded == null ? null : { kind: "extra", paid_cents: 0, owed_cents: 0, currency: "usd", at: AT,
    refunds: { [intent]: { paid_cents: 15000, refunded_cents: refunded, at: AT } } },
});
const UNPAID = {
  status: "completed", start_at: START, end_at: END, customer_name: "Unpaid Case",
  payment_status: "pending", paid_online_at: null, stripe_payment_intent: null, payment_problem: null,
  total_price: 60, final_amount: null, services: [{ name_at_booking: "Express wash", price_at_booking: 60 }],
};
const EXPENSE = { id: randomUUID(), date: TODAY, description: "Soap", category: "product", amount: 40, receipt_path: null };
const ALL = [
  { id: "refunded", patch: job(15000), earned: 60, collected: 0, owed: 60, net: 20 },
  { id: "part-refunded", patch: job(5000), earned: 160, collected: 100, owed: 60, net: 120 },
  { id: "other-payment", patch: job(15000, "pi_2"), earned: 210, collected: 150, owed: 60, net: 170 },
  { id: "paid", patch: job(null), earned: 210, collected: 150, owed: 60, net: 170 },
];
const SCENARIOS = FREEZE ? ALL.slice(0, 1) : ALL;
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
          let text = await res.text();
          if (!text.includes('"VITE_SUPABASE_URL"')) text = text.replace("import.meta.env = {", inject);
          // The sabotage rides the same route so the two cannot fight over one request.
          if (BREAK && /\/src\/lib\/moneyAdvanced\.js(\?|$)/.test(route.request().url())) {
            const [from, to] = REWRITES["moneyAdvanced.js"];
            const n = text.split(from).length - 1;
            text = text.replace(from, to) + `\nwindow.__beltMoney = ${n};\n`;
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

let discovered = 0, attempted = 0, completed = 0;
const probed = [];
for (const sc of SCENARIOS) {
  for (const [w, h] of WIDTHS) {
    discovered++;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, storageState: state, timezoneId: "America/Los_Angeles" });
    await ctx.clock.setFixedTime(new Date(NOW));
    await ctx.addInitScript(() => { localStorage.setItem("dp.lang.app", "en"); });
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));
    let fed = null;
    // The period's range read only (it carries both ends); the all-time unpaid read is left real.
    await page.route("**/rest/v1/bookings?**", async (route) => {
      const url = route.request().url();
      if (route.request().method() !== "GET" || !url.includes("start_at=gte") || !url.includes("start_at=lte")) return route.continue().catch(() => {});
      try {
        const res = await route.fetch();
        const body = await res.json().catch(() => null);
        const row = Array.isArray(body) ? body.find((b) => b?.id) : null;
        if (!row) return await route.fulfill({ response: res, json: body });
        fed = [{ ...row, ...sc.patch }, { ...row, ...UNPAID, id: randomUUID() }];
        await route.fulfill({ response: res, json: fed });
      } catch { await route.abort().catch(() => {}); }
    });
    await page.route("**/rest/v1/expenses?**", (route) => route.request().method() === "GET"
      ? route.fulfill({ json: [EXPENSE] }) : route.continue());
    await page.route("**/rest/v1/booking_line_items?**", (route) => route.request().method() === "GET"
      ? route.fulfill({ json: [] }) : route.continue());
    attempted++;
    await page.goto(`${BASE}/app/money`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-tour=breakdown]", { state: "attached", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const tag = `${sc.id} @ ${w}x${h}`;
    check(`${tag} · the Money screen's bookings read was fed`, !!fed, "page.route never matched a bookings range read carrying a row");
    const screen = await page.evaluate(() => {
      const box = document.querySelector("[data-tour=breakdown]");
      if (!box) return null;
      const cells = {};
      for (const c of box.querySelectorAll(".paircells > div")) {
        const l = c.querySelector(".label")?.textContent.trim();
        if (l) cells[l] = c.querySelector(".num")?.textContent.trim() ?? null;
      }
      return { cells, net: document.querySelector("[data-tour=net] .figure.lead")?.textContent.trim() ?? null };
    });
    check(`${tag} · the breakdown is drawn`, !!screen, "no [data-tour=breakdown]");
    const c = screen?.cells ?? {};
    check(`${tag} · Earned reads ${money(sc.earned)}`, c.Earned === money(sc.earned), JSON.stringify(screen));
    check(`${tag} · Collected reads ${money(sc.collected)}`, c.Collected === money(sc.collected), JSON.stringify(screen));
    check(`${tag} · Still owed reads ${money(sc.owed)} — the refund is not owed`, c["Still owed"] === money(sc.owed), JSON.stringify(screen));
    check(`${tag} · Net reads ${money(sc.net)}`, screen?.net === money(sc.net), JSON.stringify(screen));
    check(`${tag} · the screen's own cells add up: earned = collected + still owed`,
      c.Earned != null && money(Number(c.Earned.replace(/[^0-9.-]/g, ""))) === money(Number(c.Collected?.replace(/[^0-9.-]/g, "")) + Number(c["Still owed"]?.replace(/[^0-9.-]/g, ""))),
      JSON.stringify(c));
    // The accountant file, fed the rows the screen drew and the expense it listed.
    const exp = fed ? (() => {
      const input = { jobs: fed, expenses: [EXPENSE] };
      const rows = exportMod.accountantRows(input);
      return { broken: exportMod.__beltBroken === true, net: exportMod.accountantNet(rows),
        foot: exportMod.accountantCsv(input).trimEnd().split("\r\n").at(-1) };
    })() : null;
    check(`${tag} · the export's Amount column adds up to the Net the screen prints`,
      exp != null && screen?.net != null && money(exp.net) === screen.net, `export ${exp?.net} vs screen ${screen?.net}`);
    check(`${tag} · the export's Net row prints ${sc.net.toFixed(2)}`, exp?.foot?.startsWith(`,Net,,,,${sc.net.toFixed(2)},`), exp?.foot);
    if (BREAK) {
      const n = await page.evaluate(() => window.__beltMoney);
      check(`${tag} · the sabotage landed once in moneyAdvanced and RAN`, n === 1, `window.__beltMoney = ${n}`);
      check(`${tag} · the sabotage landed in the export and the MEASURED copy carries it`, exp?.broken === true && exportHits === 1, `matched ${exportHits}`);
    } else check(`${tag} · the export measured is the unaltered module`, exp?.broken === false, JSON.stringify(exp));
    check(`${tag} · console clean`, errors.length === 0, errors.slice(0, 3).join(" | "));
    if (FREEZE) {
      await page.locator("[data-tour=breakdown]").scrollIntoViewIfNeeded().catch(() => {});
      const { freeze } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
      await freeze(page, {
        out: `${BELT}/${FREEZE}.html`, label: FREEZE === "before" ? "Before" : "After",
        note: FREEZE === "before"
          ? "This month's $150 card job was refunded in full, yet Money still counts it: Earned $210, Collected $150, and Net $170."
          : "The same refunded job now adds nothing: Earned $60, Collected $0, Still owed only the real unpaid $60, and Net $20.",
        highlight: "[data-tour=breakdown]",
      });
      console.log(`froze ${BELT}/${FREEZE}.html`);
    }
    const file = `${SHOTS}/${BREAK ? `break-${BREAK}-` : FREEZE ? `${FREEZE}-` : ""}money-${sc.id}-${w}x${h}.png`;
    await page.locator("[data-tour=breakdown]").scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: file, fullPage: false });
    probed.push({ scenario: sc.id, width: w, cells: c, net: screen?.net ?? null, export_net: exp?.net ?? null, errors: errors.length, shot: file });
    completed++;
    await ctx.close();
  }
}
await browser.close();

console.log(`\n${assertions - failures.length} passed, ${failures.length} failed, ${completed} of ${EXPECTED} views.`);
if (FREEZE) { console.log("--freeze run: review copy only, NO receipt written."); process.exit(0); }
const { path } = writeReceipt({
  check_id: BREAK ? `money-refund-${BREAK}` : "money-refund",
  started_at,
  status: failures.length || completed !== EXPECTED ? "fail" : "pass",
  expected_targets: EXPECTED,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: EXPECTED * 10,
  failures,
  dimensions: { base: BASE, frozen_now: NOW, widths: WIDTHS.map(([w, h]) => `${w}x${h}`), ...(BREAK ? { break: BREAK } : {}), env_shim: process.argv.includes("--env-shim"), probed },
  artifacts: [SHOTS],
  // The canary: the unrefunded job still counts its whole $150 everywhere, so a probe
  // that reads every refunded-looking figure as zero cannot pass.
  canary: BREAK ? { id: `break-${BREAK}`, observed_failure: failures.length > 0 }
    : { id: "unrefunded-job-still-counts-in-full", observed_failure: probed.filter((p) => p.scenario === "paid").length > 0
      && probed.filter((p) => p.scenario === "paid").every((p) => p.cells.Collected === money(150) && p.net === money(170) && p.export_net === 170) },
});
console.log(`receipt: ${path}`);
process.exit(failures.length || completed !== EXPECTED ? 1 : 0);
