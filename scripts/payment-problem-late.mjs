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
//   owed-back  97.69: a $100 wrong-figure payment, then the job paid → its own refund
//              line, fed the note `settleProblem` (production code) writes; -es, -currency
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
//   --freeze-owed=before|after   97.69's review pair at 390, no receipt
//   --shots=<dir>                where the PNGs go (default: the 97.11 folder)

import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { demoOwner } from "./lib/demoOwner.mjs";
import { settleProblem } from "../supabase/functions/_shared/connect.ts";
import { writeReceipt } from "./receipt.mjs";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium } = require("playwright");

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=") ?? "";
const BASE = arg("base") || process.env.BASE_URL || "http://localhost:5173";
const BREAK = arg("break");
if (BREAK && BREAK !== "old-webhook" && BREAK !== "overwrite") { console.error(`unknown --break=${BREAK}`); process.exit(2); }
const OLDHOOK = BREAK === "old-webhook";
// --freeze-reasons=before|after: only freeze the two-reasons view at 390 (Andrew's review pair), no receipt.
const FREEZE_REASONS = arg("freeze-reasons");
const FREEZE_OWED = arg("freeze-owed");
const SHOTS = arg("shots") || "C:/Users/rando/Downloads/claude/belt/shots/97.11/png";
mkdirSync(SHOTS, { recursive: true });
const started_at = new Date().toISOString();

const WIDTHS = [[1440, 900], [768, 1024], [390, 844], [320, 700]];
const AT = "2026-10-16T15:00:00.000Z";
const AMOUNT = { kind: "amount", paid_cents: 100, owed_cents: 15000, currency: "usd", at: AT };
const FAILED = { kind: "failed", paid_cents: 15000, owed_cents: 15000, currency: "usd", at: AT };
const EXTRA = { kind: "extra", paid_cents: 15000, owed_cents: 0, currency: "usd", at: AT, payments: [{ intent: "pi_2", paid_cents: 15000, currency: "usd", at: AT }] };
const PAID = { payment_status: "paid", paid_online_at: AT, final_amount: null, total_price: 150 };
const OLD = { ...PAID, payment_problem: null };
// Supervision 2026-10-17: a $100 wrong-amount payment, then an unrelated bank
// payment that failed, with a refund still owed. BOTH reasons must show.
// `--break=overwrite` feeds what the overwriting webhook left: the newest note only.
const TWO = { ...FAILED, intent: "pi_4", payments: EXTRA.payments, earlier: [{ kind: "amount", paid_cents: 10000, owed_cents: 15000, currency: "usd", at: AT, intent: "pi_3" }] };
const UNPAID = { payment_status: "pending", paid_online_at: null, final_amount: null, total_price: 150 };
const TWO_PATCH = { ...UNPAID, payment_problem: TWO };
const TWO_WANT = ["A bank payment of $150 did not go through", "A card payment of $100 came in, but this job is owed $150.", "Another payment of $150 came in after this job was settled."];
// ROADMAP 97.69: a $100 card payment (pi_1) on a $150 job, then the right $150 (pi_2) settles it.
// The old webhook left the wrong-figure note behind on the paid job; the new one moves it onto the
// refunds owed. The feed is `settleProblem`'s own output, so the screen is shown what production writes.
const WRONG = { kind: "amount", paid_cents: 10000, owed_cents: 15000, currency: "usd", at: AT, intent: "pi_1" };
const WRONG_EUR = { kind: "currency", paid_cents: 15000, owed_cents: 15000, currency: "eur", at: AT, intent: "pi_1" };
const OWED_OLD = { ...PAID, payment_problem: WRONG };
const OWED = { ...PAID, payment_problem: settleProblem("pi_2", WRONG, new Date(AT)) };
const OWED_EUR = { ...PAID, payment_problem: settleProblem("pi_2", WRONG_EUR, new Date(AT)) };
const OWED_WANT = ["A card payment of $100 did not match what this job was owed, and the job has since been paid.", "Refund it from your own Stripe."];
const SCENARIOS = [
  { id: "failed", patch: OLDHOOK ? OLD : { payment_status: "pending", paid_online_at: null, payment_problem: FAILED, final_amount: null, total_price: 150 },
    want: ["A bank payment of $150 did not go through, so this job is not paid."] },
  { id: "extra", patch: OLDHOOK ? OLD : { ...PAID, payment_problem: EXTRA },
    want: ["Another payment of $150 came in after this job was settled.", "Refund it from your own Stripe."] },
  { id: "spanish", lang: "es", patch: OLDHOOK ? OLD : { ...PAID, payment_problem: EXTRA },
    want: ["Llegó otro pago de $150 después de que este trabajo ya estaba saldado."] },
  { id: "failed-refund", patch: OLDHOOK ? OLD : { payment_status: "pending", paid_online_at: null, payment_problem: { ...FAILED, payments: EXTRA.payments }, final_amount: null, total_price: 150 },
    want: ["A bank payment of $150 did not go through", "Another payment of $150 came in after this job was settled."] },
  { id: "two-reasons", patch: BREAK === "old-webhook" ? OLD : BREAK === "overwrite" ? { ...UNPAID, payment_problem: { ...FAILED, payments: EXTRA.payments } } : TWO_PATCH,
    want: TWO_WANT },
  { id: "owed-back", patch: OLDHOOK ? OWED_OLD : OWED, want: OWED_WANT, wantNot: "after this job was settled" },
  { id: "owed-back-es", lang: "es", patch: OLDHOOK ? OWED_OLD : OWED,
    want: ["Un pago con tarjeta de $100 no coincidía con lo que debía este trabajo, y el trabajo ya se pagó."] },
  { id: "owed-back-currency", patch: OLDHOOK ? { ...PAID, payment_problem: WRONG_EUR } : OWED_EUR,
    want: ["A card payment that was not in US dollars came in, and this job has since been paid."], wantNot: "$" },
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

if (FREEZE_REASONS && jobId) {
  const { freeze, differs } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
  const DIR = "C:/Users/rando/Downloads/claude/belt/shots/97.11";
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: state });
  await ctx.addInitScript(() => localStorage.setItem("dp.lang.app", "en"));
  const page = await ctx.newPage();
  await page.route("**/rest/v1/bookings?**", async (route) => {
    if (route.request().method() !== "GET" || !route.request().url().includes(jobId)) return route.continue();
    const res = await route.fetch();
    const body = await res.json().catch(() => null);
    const edit = (b) => (b && b.id === jobId ? { ...b, ...TWO_PATCH } : b);
    await route.fulfill({ response: res, json: Array.isArray(body) ? body.map(edit) : edit(body) });
  });
  await page.goto(`${BASE}/job/${jobId}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".jobbar", { timeout: 30000 });
  await page.waitForTimeout(1200);
  const before = FREEZE_REASONS === "before";
  await freeze(page, { out: `${DIR}/${FREEZE_REASONS}-reasons.html`, label: before ? "Before" : "After",
    note: before
      ? "A $100 card payment was the wrong figure, then a different bank payment failed. Only the failed line shows: the $100 still in the detailer's Stripe is not mentioned."
      : "The same job: the failed bank payment AND the $100 wrong-figure payment each get their own red line, with the refund line under them.",
    highlight: "[data-payment-problem]" });
  if (!before) console.log(`differs: ${await differs(page, `${DIR}/before-reasons.html`, `${DIR}/after-reasons.html`)}`);
  console.log("text:", await page.locator("[data-payment-problem]").innerText().catch(() => "(none)"));
  await browser.close();
  process.exit(0);
}

if (FREEZE_OWED && jobId) {
  const { freeze, differs } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
  const DIR = "C:/Users/rando/Downloads/claude/belt/shots/97.69";
  mkdirSync(DIR, { recursive: true });
  const before = FREEZE_OWED === "before";
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: state });
  await ctx.addInitScript(() => localStorage.setItem("dp.lang.app", "en"));
  const page = await ctx.newPage();
  await page.route("**/rest/v1/bookings?**", async (route) => {
    if (route.request().method() !== "GET" || !route.request().url().includes(jobId)) return route.continue();
    const res = await route.fetch();
    const body = await res.json().catch(() => null);
    const edit = (b) => (b && b.id === jobId ? { ...b, ...(before ? OWED_OLD : OWED) } : b);
    await route.fulfill({ response: res, json: Array.isArray(body) ? body.map(edit) : edit(body) });
  });
  await page.goto(`${BASE}/job/${jobId}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".jobbar", { timeout: 30000 });
  await page.waitForTimeout(1200);
  await freeze(page, { out: `${DIR}/${FREEZE_OWED}.html`, label: before ? "Before" : "After",
    note: before
      ? "A $100 card payment came in for a $150 job, then the customer paid the right $150. The job says Paid and nothing else: the $100 still in the detailer's Stripe is never mentioned."
      : "The same job: still Paid, and a red line says the $100 card payment did not match and must be refunded from the detailer's own Stripe.",
    highlight: before ? ".pill.paid" : "[data-payment-problem]" });
  if (!before) console.log(`differs: ${await differs(page, `${DIR}/before.html`, `${DIR}/after.html`)}`);
  console.log("text:", await page.locator("[data-payment-problem]").innerText().catch(() => "(none)"));
  await browser.close();
  process.exit(0);
}

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
        if (sc.wantNot) check(`${tag} · it does not say "${sc.wantNot}"`, !box.text.includes(sc.wantNot), box.text);
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
