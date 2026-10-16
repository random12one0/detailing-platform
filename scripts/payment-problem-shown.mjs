// ROADMAP 97.10 — THE DETAILER CAN SEE WHY A CARD PAYMENT DID NOT SETTLE A JOB.
//
// `stripe-webhook` now leaves a job unpaid when the money Stripe reports is not
// the figure owed, and writes `bookings.payment_problem`. This opens the real job
// record, signed in as the demo owner, with ONE job's read fed through
// `page.route` — never a database write — and asks, at every width:
//
//   mismatch   unpaid + an amount problem   → the red line names both figures
//   currency   unpaid + a currency problem  → the red line says "not in US dollars"
//   spanish    the mismatch, dashboard in Spanish → the Spanish line
//   settled    paid  + a stale problem      → NO line (the refused case)
//   clean      unpaid, no problem           → NO line
//
// For each line shown: inside the viewport, painted (hit test at its centre lands
// on it), and no console error. Screenshots go OUTSIDE the repo, to the belt's
// shots folder.
//
// SABOTAGE: --break=old-webhook feeds the mismatch as the OLD webhook wrote it
// (marked paid, no problem recorded). That is the original defect, and the
// mismatch scenarios must go red.
//
//   set -a; . ./.env; set +a      (DEMO_OWNER_PW; the demo owner signs in)
//   node scripts/payment-problem-shown.mjs [--base=http://127.0.0.1:5180] [--break=old-webhook] [--freeze]
//
// --freeze also writes the belt's Before/After review pages at 390x844: Before is
// the job as the OLD webhook left it (marked paid on a $1 payment), After as now.

import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { demoOwner } from "./lib/demoOwner.mjs";
import { writeReceipt } from "./receipt.mjs";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium } = require("playwright");

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=") ?? "";
const BASE = arg("base") || process.env.BASE_URL || "http://localhost:5173";
const BREAK = arg("break");
if (BREAK && BREAK !== "old-webhook") { console.error(`unknown --break=${BREAK}`); process.exit(2); }
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/97.10/png";
mkdirSync(SHOTS, { recursive: true });
const started_at = new Date().toISOString();

const WIDTHS = [[1440, 900], [768, 1024], [390, 844], [320, 700]];
const AMOUNT = { kind: "amount", paid_cents: 100, owed_cents: 15000, currency: "usd", at: "2026-10-16T15:00:00.000Z" };
const CURRENCY = { kind: "currency", paid_cents: 15000, owed_cents: 15000, currency: "eur", at: "2026-10-16T15:00:00.000Z" };
const OLD = { payment_status: "paid", paid_online_at: "2026-10-16T15:00:00.000Z", payment_problem: null };
const SCENARIOS = [
  { id: "mismatch", patch: BREAK ? OLD : { payment_status: "pending", paid_online_at: null, payment_problem: AMOUNT, final_amount: null, total_price: 150 },
    want: ["A card payment of $1 came in, but this job is owed $150.", "We did not mark it paid."] },
  { id: "currency", patch: BREAK ? OLD : { payment_status: "pending", paid_online_at: null, payment_problem: CURRENCY },
    want: ["not in US dollars"] },
  { id: "spanish", lang: "es", patch: BREAK ? OLD : { payment_status: "pending", paid_online_at: null, payment_problem: AMOUNT, final_amount: null, total_price: 150 },
    want: ["Llegó un pago con tarjeta de $1, pero este trabajo debe $150."] },
  { id: "settled", patch: { payment_status: "paid", paid_online_at: "2026-10-16T15:00:00.000Z", payment_problem: AMOUNT }, want: null },
  { id: "clean", patch: { payment_status: "pending", paid_online_at: null, payment_problem: null }, want: null },
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
// Sign in once.
const login = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const lp = await login.newPage();
let jobId = "";
lp.on("response", async (r) => {
  if (jobId || !/\/rest\/v1\/bookings\?/.test(r.url()) || r.request().method() !== "GET") return;
  try {
    const rows = await r.json();
    // A CONFIRMED job: a request nobody accepted can never take a card (payability).
    const row = (Array.isArray(rows) ? rows : [rows]).find((b) => b?.id && b.status === "confirmed" && !b.deleted_at);
    if (row) jobId = row.id;
  } catch {}
});
await lp.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
await lp.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
if (await lp.locator("input[type=email]").count()) {
  await lp.fill("input[type=email]", demoOwner().email ?? "demo@detailplatform.com");
  await lp.fill("input[type=password]", demoOwner().password);
  await lp.click("form button.btn.primary");
  await lp.waitForSelector(".tabbar", { timeout: 30000 });
}
for (let i = 0; i < 40 && !jobId; i++) await lp.waitForTimeout(250);
const state = await login.storageState();
await login.close();
check("a demo job was found to open", !!jobId, "no bookings response carried a usable row");

let discovered = 0, attempted = 0, completed = 0;
const probed = [];
for (const sc of jobId ? SCENARIOS : []) {
  for (const [w, h] of WIDTHS) {
    discovered++;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, storageState: state });
    await ctx.addInitScript((lang) => { localStorage.setItem("dp.lang.app", lang); }, sc.lang ?? "en");
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));
    let fed = 0;
    await page.route("**/rest/v1/bookings?**", async (route) => {
      const url = route.request().url();
      if (route.request().method() !== "GET" || !url.includes(jobId)) return route.continue();
      const res = await route.fetch();
      let body = await res.json().catch(() => null);
      const edit = (b) => (b && b.id === jobId ? { ...b, ...sc.patch } : b);
      body = Array.isArray(body) ? body.map(edit) : edit(body);
      fed++;
      await route.fulfill({ response: res, json: body });
    });
    attempted++;
    await page.goto(`${BASE}/job/${jobId}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".jobbar, .error-box, h1", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const tag = `${sc.id} @ ${w}x${h}`;
    check(`${tag} · the job's read was fed`, fed > 0, "page.route never matched the job read");
    const box = await page.evaluate(() => {
      const el = document.querySelector("[data-payment-problem]");
      if (!el) return null;
      el.scrollIntoView({ block: "center" });
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { text: el.innerText, left: r.left, right: r.right, width: r.width, vw: window.innerWidth, hit: !!hit && (hit === el || el.contains(hit)), color: getComputedStyle(el).color };
    });
    if (sc.want) {
      check(`${tag} · the red line is there`, !!box, BREAK ? "the old webhook marked it paid and recorded nothing" : "no [data-payment-problem]");
      if (box) {
        for (const s of sc.want) check(`${tag} · it says "${s.slice(0, 50)}"`, box.text.includes(s), box.text);
        check(`${tag} · inside the screen`, box.left >= 0 && box.right <= box.vw + 0.5, `left ${box.left}, right ${box.right}, viewport ${box.vw}`);
        check(`${tag} · painted on top (hit test lands on it)`, box.hit);
      }
    } else {
      check(`${tag} · no payment-problem line`, !box, box?.text ?? "");
    }
    check(`${tag} · console clean`, errors.length === 0, errors.slice(0, 3).join(" | "));
    const file = `${SHOTS}/${BREAK ? `break-${BREAK}-` : ""}${sc.id}-${w}x${h}.png`;
    await page.screenshot({ path: file, fullPage: false });
    probed.push({ scenario: sc.id, width: w, shown: !!box, text: box?.text ?? null, errors: errors.length, shot: file });
    completed++;
    await ctx.close();
  }
}
if (process.argv.includes("--freeze") && jobId && !BREAK) {
  const { freeze, differs } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
  const DIR = "C:/Users/rando/Downloads/claude/belt/shots/97.10";
  const open = async (patch) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: state });
    await ctx.addInitScript(() => localStorage.setItem("dp.lang.app", "en"));
    const page = await ctx.newPage();
    await page.route("**/rest/v1/bookings?**", async (route) => {
      if (route.request().method() !== "GET" || !route.request().url().includes(jobId)) return route.continue();
      const res = await route.fetch();
      const body = await res.json().catch(() => null);
      const edit = (b) => (b && b.id === jobId ? { ...b, ...patch } : b);
      await route.fulfill({ response: res, json: Array.isArray(body) ? body.map(edit) : edit(body) });
    });
    await page.goto(`${BASE}/job/${jobId}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".jobbar", { timeout: 30000 });
    await page.waitForTimeout(1200);
    return { ctx, page };
  };
  const b = await open(OLD);
  await freeze(b.page, { out: `${DIR}/before.html`, label: "Before",
    note: "A $1 card payment on a $150 job: the old webhook marked the job Paid and said nothing.",
    highlight: ".pill.paid" });
  await b.ctx.close();
  const a = await open(SCENARIOS[0].patch);
  await freeze(a.page, { out: `${DIR}/after.html`, label: "After",
    note: "The same $1 payment: the job stays Unpaid and the red line says what came in, what is owed, and where to check.",
    highlight: "[data-payment-problem]" });
  console.log(`differs: ${await differs(a.page, `${DIR}/before.html`, `${DIR}/after.html`)}`);
  await a.ctx.close();
}
await browser.close();

console.log(`\n${assertions - failures.length} passed, ${failures.length} failed, ${completed} of ${EXPECTED} views.`);
const { path } = writeReceipt({
  check_id: "payment-problem-shown",
  started_at,
  status: failures.length || completed !== EXPECTED ? "fail" : "pass",
  expected_targets: EXPECTED,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 100,
  failures,
  dimensions: { base: BASE, job: jobId, widths: WIDTHS.map(([w, h]) => `${w}x${h}`), ...(BREAK ? { break: BREAK } : {}), probed },
  artifacts: [SHOTS],
  // The canary: a scenario that must NOT show the line (a paid job with a stale
  // problem) is measured with the same probe, so a probe that finds the line
  // everywhere, or nowhere, cannot pass both halves.
  canary: { id: "settled-job-hides-the-line", observed_failure: probed.filter((p) => p.scenario === "settled").every((p) => !p.shown) && probed.some((p) => p.scenario === "settled") },
});
console.log(`receipt: ${path}`);
process.exit(failures.length || completed !== EXPECTED ? 1 : 0);
