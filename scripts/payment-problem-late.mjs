// ROADMAP 97.11 — THE DETAILER SEES A FAILED BANK PAYMENT, AND A REFUND OWED.
//
// `stripe-webhook` now writes two more kinds of `bookings.payment_problem`:
// `failed` (a late bank payment did not go through) and `extra` (money came in
// after the job was settled). This opens the real job record, signed in as the
// demo owner, with ONE job's read fed through `page.route` — never a database
// write — and asks, at every width:
//
//   failed     unpaid + a failed bank payment  → the red line says it did not go through
//   extra      PAID + an extra payment         → the refund line, ON A PAID JOB
//   spanish    the extra payment, in Spanish   → the Spanish line
//   failed-refund  unpaid + failed, carrying a refund owed → BOTH lines (review, 2026-10-16)
//   settled    paid + a stale amount problem   → NO line (97.10's refused case still holds)
//   clean      paid, no problem                → NO line
//
// For each line shown: inside the viewport, painted (hit test at its centre lands
// on it), and no console error. Screenshots go OUTSIDE the repo.
//
// SABOTAGE: --break=old-webhook feeds failed/extra as the OLD webhook left them
// (a failed debit still paid; a second payment recorded nowhere). That is the
// original defect, and those scenarios must go red.
//
//   set -a; . ./.env; set +a      (DEMO_OWNER_PW; the demo owner signs in)
//   node scripts/payment-problem-late.mjs [--base=http://127.0.0.1:5180] [--break=old-webhook] [--freeze]

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
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/97.11/png";
mkdirSync(SHOTS, { recursive: true });
const started_at = new Date().toISOString();

const WIDTHS = [[1440, 900], [768, 1024], [390, 844], [320, 700]];
const AT = "2026-10-16T15:00:00.000Z";
const AMOUNT = { kind: "amount", paid_cents: 100, owed_cents: 15000, currency: "usd", at: AT };
const FAILED = { kind: "failed", paid_cents: 15000, owed_cents: 15000, currency: "usd", at: AT };
const EXTRA = { kind: "extra", paid_cents: 15000, owed_cents: 0, currency: "usd", at: AT, payments: [{ intent: "pi_2", paid_cents: 15000, currency: "usd", at: AT }] };
const PAID = { payment_status: "paid", paid_online_at: AT, final_amount: null, total_price: 150 };
const OLD = { ...PAID, payment_problem: null };
const SCENARIOS = [
  { id: "failed", patch: BREAK ? OLD : { payment_status: "pending", paid_online_at: null, payment_problem: FAILED, final_amount: null, total_price: 150 },
    want: ["A bank payment of $150 did not go through, so this job is not paid."] },
  { id: "extra", patch: BREAK ? OLD : { ...PAID, payment_problem: EXTRA },
    want: ["Another payment of $150 came in after this job was settled.", "Refund it from your own Stripe."] },
  { id: "spanish", lang: "es", patch: BREAK ? OLD : { ...PAID, payment_problem: EXTRA },
    want: ["Llegó otro pago de $150 después de que este trabajo ya estaba saldado."] },
  { id: "failed-refund", patch: BREAK ? OLD : { payment_status: "pending", paid_online_at: null, payment_problem: { ...FAILED, payments: EXTRA.payments }, final_amount: null, total_price: 150 },
    want: ["A bank payment of $150 did not go through", "Another payment of $150 came in after this job was settled."] },
  { id: "settled", patch: { ...PAID, payment_problem: AMOUNT }, want: null },
  { id: "clean", patch: { ...PAID, payment_problem: null }, want: null },
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
  const DIR = "C:/Users/rando/Downloads/claude/belt/shots/97.11";
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
    note: "A second $150 payment came in for a job already paid: the old webhook dropped it, and the job says nothing about a refund.",
    highlight: ".pill.paid" });
  await b.ctx.close();
  const a = await open(SCENARIOS[1].patch);
  await freeze(a.page, { out: `${DIR}/after.html`, label: "After",
    note: "The same second payment: the job stays Paid and a red line says $150 more came in and must be refunded from the detailer's own Stripe.",
    highlight: "[data-payment-problem]" });
  console.log(`differs: ${await differs(a.page, `${DIR}/before.html`, `${DIR}/after.html`)}`);
  await a.ctx.close();
}
await browser.close();

console.log(`\n${assertions - failures.length} passed, ${failures.length} failed, ${completed} of ${EXPECTED} views.`);
const { path } = writeReceipt({
  check_id: BREAK ? `payment-problem-late-${BREAK}` : "payment-problem-late",
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
  canary: BREAK ? { id: `break-${BREAK}`, observed_failure: failures.length > 0 } : { id: "settled-job-hides-the-line", observed_failure: probed.filter((p) => p.scenario === "settled").every((p) => !p.shown) && probed.some((p) => p.scenario === "settled") },
});
console.log(`receipt: ${path}`);
process.exit(failures.length || completed !== EXPECTED ? 1 : 0);
