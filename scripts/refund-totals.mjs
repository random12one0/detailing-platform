// ROADMAP 97.81 — MONEY REFUNDED IN STRIPE IS NOT MONEY COLLECTED.
//
// 97.80 fixed the PILL; Today's "collected" figure and the accountant file's Status
// column still read `payment_status` alone, so a job whose own card payment was
// refunded in full counted as money kept. This signs in as the demo owner and feeds
// Today's own bookings read through `page.route` — never a database write — with ONE
// job, paid by card, $150, in four states:
//
//   refunded        refunded in full                → collected $0,   export "Refunded"
//   part-refunded   $50 of $150 refunded            → collected $100, export says 50 back, 100 kept
//   other-payment   a DIFFERENT payment refunded    → collected $150, export "Paid" (refused case)
//   paid            nothing refunded                → collected $150, export "Paid" (the canary)
//
// The export half is asserted in Node on the exact row Today drew (see EXPORT_SRC).
//
// SABOTAGE: --break=status-only rewrites the served Today and a scratch copy of the export back to reading
// `payment_status === "paid"` alone (the original defect), signed and read back from
// the page (docs/gotchas.md 113). refunded and part-refunded must go red on both halves.
//
// --freeze=before|after writes the Before/After review copy at 390 (refunded scenario)
// to belt/shots/97.81 and writes NO receipt — it is a review aid, not a proof.
//
//   set -a; . <main checkout>/.env; set +a      (DEMO_OWNER_PW; SUPABASE_URL + SUPABASE_ANON_KEY for --env-shim)
//   node scripts/refund-totals.mjs [--base=http://127.0.0.1:5180] [--env-shim] [--break=status-only] [--freeze=before|after]

import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
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
// Each rewrite must match exactly once in the served file, or the sabotage did not land.
const REWRITES = BREAK ? {
  "Today.jsx": ["keptOf(b, Number(b.final_amount ?? b.total_price))", "Number(b.final_amount ?? b.total_price)"],
  "accountant-export.js": ["paidWords(b),", '(b.payment_status === "paid" ? "Paid" : "Unpaid"),'],
} : null;
const BELT = "C:/Users/rando/Downloads/claude/belt/shots/97.81";
const SHOTS = arg("shots") || `${BELT}/png`;
mkdirSync(SHOTS, { recursive: true });
const started_at = new Date().toISOString();

// THE EXPORT HALF RUNS HERE, IN NODE, on the exact row Today drew. It is a pure function of
// that row; asserting it inside the page was measured to read an UNSABOTAGED copy of the
// module while the route reported the rewrite landed. Under --break the real file is
// rewritten into a scratch copy, signed, and the signature is read off the module measured.
const EXPORT_SRC = new URL("../app/src/lib/accountant-export.js", import.meta.url);
let exportMod, exportHits = null;
if (BREAK) {
  const [from, to] = REWRITES["accountant-export.js"];
  const text = readFileSync(EXPORT_SRC, "utf8");
  exportHits = text.split(from).length - 1;
  const tmp = new URL("./refund-totals-break.tmp.mjs", import.meta.url);
  const payPill = JSON.stringify(new URL("../app/src/lib/payPill.js", import.meta.url).href);
  writeFileSync(tmp, text.replace(from, to).replace('from "./payPill.js"', `from ${payPill}`) + "\nexport const __beltBroken = true;\n");
  try { exportMod = await import(tmp.href); } finally { unlinkSync(tmp); }
} else exportMod = await import(EXPORT_SRC.href);

// The page's clock is frozen at the REAL minute (a clock ahead of the sign-in made its
// token look expired — pay-pill-card.mjs). The job runs from a minute ago to a minute on.
const NOW = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
const START = new Date(Date.parse(NOW) - 60000).toISOString(), END = new Date(Date.parse(NOW) + 60000).toISOString();
// The demo business keeps Pacific time; the job is put on today's rail whatever row was borrowed.
const TODAY = new Date(NOW).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
const WIDTHS = FREEZE ? [[390, 844]] : [[390, 844], [320, 640], [768, 1024], [1440, 900]];
const AT = "2026-10-16T15:00:00.000Z";
const job = (refunded, intent = "pi_1") => ({
  status: "confirmed", start_at: START, end_at: END,
  payment_status: "paid", paid_online_at: AT, stripe_payment_intent: "pi_1", finalized_at: null,
  total_price: 150, final_amount: null, services: [{ name_at_booking: "Full detail", price_at_booking: 150 }],
  payment_problem: refunded == null ? null : { kind: "extra", paid_cents: 0, owed_cents: 0, currency: "usd", at: AT,
    refunds: { [intent]: { paid_cents: 15000, refunded_cents: refunded, at: AT } } },
});
const ALL = [
  { id: "refunded", patch: job(15000), collected: 0, status: "Refunded" },
  { id: "part-refunded", patch: job(5000), collected: 100, status: "Part refunded: 50.00 of 150.00 returned, 100.00 kept" },
  { id: "other-payment", patch: job(15000, "pi_2"), collected: 150, status: "Paid" },
  { id: "paid", patch: job(null), collected: 150, status: "Paid" },
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
    await ctx.addInitScript(() => { localStorage.setItem("dp.lang.app", "en"); });
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));
    let fed = null;
    await page.route("**/rest/v1/bookings?**", async (route) => {
      const url = route.request().url();
      if (route.request().method() !== "GET" || !url.includes("start_at=gte")) return route.continue().catch(() => {});
      try {
        const res = await route.fetch();
        const body = await res.json().catch(() => null);
        const row = Array.isArray(body) ? body.find((b) => b?.id) : null;
        if (!row) return await route.fulfill({ response: res, json: body });
        fed = { ...row, ...sc.patch, booking_date: TODAY };
        await route.fulfill({ response: res, json: [fed] });
      } catch { await route.abort().catch(() => {}); }
    });
    const hits = {};
    if (REWRITES) for (const [file, [from, to]] of Object.entries(REWRITES).filter(([f]) => f === "Today.jsx")) {
      await page.route(new RegExp(`/src/(screens|lib)/${file.replace(".", "\\.")}(\\?|$)`), async (route) => {
        const res = await route.fetch();
        const text = await res.text();
        hits[file] = text.split(from).length - 1;
        // Signed IN THE MODULE: the export measured below is a fresh import, not the app's
        // own copy, so a window flag could not say which copy ran (docs/gotchas.md 113).
        const sign = file === "Today.jsx" ? "\nwindow.__beltToday = true;\n" : "\nexport const __beltBroken = true;\n";
        await route.fulfill({ response: res, body: text.replace(from, to) + sign });
      });
    }
    attempted++;
    await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-tour=figures]", { state: "attached", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const tag = `${sc.id} @ ${w}x${h}`;
    check(`${tag} · Today's bookings read was fed`, !!fed, "page.route never matched a bookings range read carrying a row");
    const today = await page.evaluate(() => {
      const f = document.querySelector("[data-tour=figures]");
      if (!f) return null;
      const phone = f.classList.contains("ledger");
      const figs = [...f.querySelectorAll(".figure")].map((e) => e.textContent.trim());
      const quiet = [...f.querySelectorAll(".quiet")].map((e) => e.textContent.trim());
      return { phone, figs, quiet };
    });
    check(`${tag} · Today's money figures are drawn`, !!today, "no [data-tour=figures]");
    let shown = null;
    if (today) {
      // Phone: two fixed cells, expected then collected. Desk: "$X collected" under Expected.
      shown = today.phone ? today.figs[1] : today.quiet.find((q) => /collected/i.test(q));
      const want = today.phone ? money(sc.collected) : (sc.collected > 0 ? `${money(sc.collected)} collected` : "Nothing collected yet");
      check(`${tag} · expected is the job's whole price, $150`, today.phone ? today.figs[0] === money(150) : today.figs.includes(money(150)), JSON.stringify(today));
      check(`${tag} · collected reads "${want}"`, shown === want, JSON.stringify(today));
    }
    // The export, fed the row Today drew (see EXPORT_SRC above).
    const exp = fed ? (() => {
      const jobs = [{ ...fed, status: "completed" }];
      return { broken: exportMod.__beltBroken === true, status: exportMod.accountantRows({ jobs })[0]?.cells[3] ?? null,
        amount: exportMod.accountantRows({ jobs })[0]?.amount ?? null, csv: exportMod.accountantCsv({ jobs }) };
    })() : null;
    check(`${tag} · the export's Status says "${sc.status}"`, exp?.status === sc.status, JSON.stringify(exp));
    check(`${tag} · the export's Amount still ties to the screen's earned figure (150.00)`, exp?.amount === 150, JSON.stringify(exp));
    if (REWRITES) {
      const ran = await page.evaluate(() => window.__beltToday === true);
      check(`${tag} · the sabotage landed once in Today and RAN`, ran && hits["Today.jsx"] === 1, `ran ${ran}, ${JSON.stringify(hits)}`);
      check(`${tag} · the sabotage landed in the export and the MEASURED copy carries it`, exp?.broken === true && exportHits === 1, `matched ${exportHits} ${JSON.stringify(exp)}`);
    } else check(`${tag} · the export measured is the unaltered module`, exp?.broken === false, JSON.stringify(exp));
    check(`${tag} · console clean`, errors.length === 0, errors.slice(0, 3).join(" | "));
    if (FREEZE) {
      const { freeze } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
      await freeze(page, {
        out: `${BELT}/${FREEZE}.html`, label: FREEZE === "before" ? "Before" : "After",
        note: FREEZE === "before"
          ? "Today's only job was paid by card and then refunded in full, yet the day still says $150 collected."
          : "The same refunded job now adds nothing: collected reads $0, while expected still shows the $150 job.",
        highlight: ".ledger.two > div:nth-child(2)",
      });
      console.log(`froze ${BELT}/${FREEZE}.html`);
    }
    const file = `${SHOTS}/${BREAK ? `break-${BREAK}-` : FREEZE ? `${FREEZE}-` : ""}today-${sc.id}-${w}x${h}.png`;
    await page.screenshot({ path: file, fullPage: false });
    probed.push({ scenario: sc.id, width: w, collected: shown, export_status: exp?.status ?? null, errors: errors.length, shot: file });
    completed++;
    await ctx.close();
  }
}
await browser.close();

console.log(`\n${assertions - failures.length} passed, ${failures.length} failed, ${completed} of ${EXPECTED} views.`);
if (FREEZE) { console.log("--freeze run: review copy only, NO receipt written."); process.exit(0); }
const { path } = writeReceipt({
  check_id: BREAK ? `refund-totals-${BREAK}` : "refund-totals",
  started_at,
  status: failures.length || completed !== EXPECTED ? "fail" : "pass",
  expected_targets: EXPECTED,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: EXPECTED * 7,
  failures,
  dimensions: { base: BASE, frozen_now: NOW, widths: WIDTHS.map(([w, h]) => `${w}x${h}`), ...(BREAK ? { break: BREAK } : {}), env_shim: process.argv.includes("--env-shim"), probed },
  artifacts: [SHOTS],
  // The canary: the unrefunded job must still count its whole $150 on Today and read
  // "Paid" in the export, so a probe that reads $0 everywhere cannot pass both.
  canary: BREAK ? { id: `break-${BREAK}`, observed_failure: failures.length > 0 }
    : { id: "unrefunded-job-still-counts-in-full", observed_failure: probed.some((p) => p.scenario === "paid") && probed.filter((p) => p.scenario === "paid").every((p) => p.export_status === "Paid" && (p.collected === money(150) || p.collected === `${money(150)} collected`)) },
});
console.log(`receipt: ${path}`);
process.exit(failures.length || completed !== EXPECTED ? 1 : 0);
