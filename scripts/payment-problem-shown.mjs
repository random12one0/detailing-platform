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
//   settled    paid  + a stale problem      → a POSSIBLE refund line (ROADMAP 97.70: Andrew ruled
//              2026-10-17 that a job marked paid after a wrong-figure payment flags it;
//              until then this was the refused case)
//   waived     waived + a stale problem     → a POSSIBLE refund line ending "If you meant to keep
//              it, ignore this." (ROADMAP 97.75: Andrew ruled 2026-10-17 07:13; until then this
//              was the refused case and the canary); -es, -currency
//   clean      unpaid, no problem           → NO line (the refused case and the canary)
//
// For each line shown: inside the viewport, painted (hit test at its centre lands
// on it), and no console error. Screenshots go OUTSIDE the repo, to the belt's
// shots folder (--shots=<dir> to choose).
//
// SABOTAGE: --break=old-webhook feeds the mismatch as the OLD webhook wrote it
// (marked paid, no problem recorded). That is the original defect, and the
// mismatch scenarios must go red.
// --break=hide-waived (97.75) rewrites the served BookingDetail module so a waived
// job hides its kept wrong-figure note again (the original defect); the rewrite is
// signed and the signature read back from the page (docs/gotchas.md 113), and the
// three waived scenarios must go red.
//
//   set -a; . ./.env; set +a      (DEMO_OWNER_PW; the demo owner signs in)
//   node scripts/payment-problem-shown.mjs [--base=http://127.0.0.1:5180] [--break=old-webhook|hide-waived] [--freeze]
//   --freeze-waived=before|after   97.75's review pair at 390, no receipt
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
const HIDE = BREAK === "hide-waived";
const FREEZE_WAIVED = arg("freeze-waived");
if (BREAK && BREAK !== "old-webhook" && !HIDE) { console.error(`unknown --break=${BREAK}`); process.exit(2); }
const SHOTS = arg("shots") || "C:/Users/rando/Downloads/claude/belt/shots/97.10/png";
mkdirSync(SHOTS, { recursive: true });
const started_at = new Date().toISOString();

const WIDTHS = [[1440, 900], [768, 1024], [390, 844], [320, 700]];
const AMOUNT = { kind: "amount", paid_cents: 100, owed_cents: 15000, currency: "usd", at: "2026-10-16T15:00:00.000Z" };
const CURRENCY = { kind: "currency", paid_cents: 15000, owed_cents: 15000, currency: "eur", at: "2026-10-16T15:00:00.000Z" };
const OLD = { payment_status: "paid", paid_online_at: "2026-10-16T15:00:00.000Z", payment_problem: null, final_amount: null, total_price: 150 };
// ROADMAP 97.75: a $1 wrong-figure card payment, then the detailer WAIVES the job. `update-booking`
// cannot write `payment_problem` (tests/update-booking-keeps-note.test.mjs), so the row is the
// waived status over the untouched note.
const WAIVED = { payment_status: "waived", paid_online_at: null, final_amount: null, total_price: 150, payment_problem: AMOUNT };
const WAIVED_WANT = ["A card payment of $1 did not match what this job was owed, and the job has since been waived.",
  "Refund it from your own Stripe.", "If you meant to keep it, ignore this."];
const SCENARIOS = [
  { id: "mismatch", patch: BREAK ? OLD : { payment_status: "pending", paid_online_at: null, payment_problem: AMOUNT, final_amount: null, total_price: 150 },
    want: ["A card payment of $1 came in, but this job is owed $150.", "We did not mark it paid."] },
  { id: "currency", patch: BREAK ? OLD : { payment_status: "pending", paid_online_at: null, payment_problem: CURRENCY },
    want: ["not in US dollars"] },
  { id: "spanish", lang: "es", patch: BREAK ? OLD : { payment_status: "pending", paid_online_at: null, payment_problem: AMOUNT, final_amount: null, total_price: 150 },
    want: ["Llegó un pago con tarjeta de $1, pero este trabajo debe $150."] },
  { id: "settled", patch: { payment_status: "paid", paid_online_at: "2026-10-16T15:00:00.000Z", payment_problem: AMOUNT },
    want: ["A card payment of $1 did not match what this job was owed", "If you kept this payment as part of what they paid, ignore this."],
    wantNot: ["If you meant to keep it"] },
  { id: "waived", patch: WAIVED, want: WAIVED_WANT, wantNot: ["marked paid", "If they paid you in full", "We did not mark it paid"] },
  { id: "waived-es", lang: "es", patch: WAIVED,
    want: ["Un pago con tarjeta de $1 no coincidía con lo que debía este trabajo, y luego el trabajo se marcó como perdonado.", "Si querías quedártelo, ignora este aviso."] },
  { id: "waived-currency", patch: { ...WAIVED, payment_problem: CURRENCY },
    want: ["A card payment that was not in US dollars came in, and the job has since been waived.", "If you meant to keep it, ignore this."], wantNot: "$" },
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

if (FREEZE_WAIVED && jobId) {
  const { freeze, differs } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
  const DIR = "C:/Users/rando/Downloads/claude/belt/shots/97.75";
  mkdirSync(DIR, { recursive: true });
  const before = FREEZE_WAIVED === "before";
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: state });
  await ctx.addInitScript(() => localStorage.setItem("dp.lang.app", "en"));
  const page = await ctx.newPage();
  await page.route("**/rest/v1/bookings?**", async (route) => {
    if (route.request().method() !== "GET" || !route.request().url().includes(jobId)) return route.continue();
    const res = await route.fetch();
    const body = await res.json().catch(() => null);
    const edit = (b) => (b && b.id === jobId ? { ...b, ...WAIVED } : b);
    await route.fulfill({ response: res, json: Array.isArray(body) ? body.map(edit) : edit(body) });
  });
  await page.goto(`${BASE}/job/${jobId}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".jobbar", { timeout: 30000 });
  await page.waitForTimeout(1200);
  await freeze(page, { out: `${DIR}/${FREEZE_WAIVED}.html`, label: before ? "Before" : "After",
    note: before
      ? "A $1 card payment came in for a $150 job, then the detailer waived the job. The job says Waived and nothing else: the $1 still in the detailer's Stripe is never mentioned."
      : "The same job: still Waived, and a red line names the $1 card payment as a possible refund, ending \"If you meant to keep it, ignore this.\"",
    highlight: before ? ".pill.waived" : "[data-refund-maybe]" });
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
    let hid = 0;
    if (HIDE) await page.route("**/src/components/BookingDetail.jsx*", async (route) => {
      const res = await route.fetch();
      const text = await res.text();
      const from = 'booking.payment_status === "waived" || ';
      hid = text.split(from).length - 1;
      await route.fulfill({ response: res, body: text.replace(from, "false || ") + "\nwindow.__break9775 = true;\n" });
    });
    attempted++;
    await page.goto(`${BASE}/job/${jobId}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".jobbar, .error-box, h1", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const tag = `${sc.id} @ ${w}x${h}`;
    check(`${tag} · the job's read was fed`, fed > 0, "page.route never matched the job read");
    if (HIDE) check(`${tag} · the sabotage landed once and RAN`, hid === 1 && await page.evaluate(() => window.__break9775 === true), `matched ${hid}`);
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
        for (const n of [].concat(sc.wantNot ?? [])) check(`${tag} · it does not say "${n}"`, !box.text.includes(n), box.text);
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
  check_id: BREAK ? `payment-problem-shown-${BREAK}` : "payment-problem-shown",
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
  // The canary: a scenario that must NOT show the line (an unpaid job with no
  // problem; 97.70 made the stale paid job and 97.75 the stale WAIVED job show a
  // possible refund) is measured with the same probe, so a probe that finds the
  // line everywhere, or nowhere, cannot pass both halves. Under a --break the
  // canary is the sabotage itself.
  canary: BREAK ? { id: `break-${BREAK}`, observed_failure: failures.length > 0 } : { id: "clean-job-hides-the-line", observed_failure: probed.filter((p) => p.scenario === "clean").every((p) => !p.shown) && probed.some((p) => p.scenario === "clean") },
});
console.log(`receipt: ${path}`);
process.exit(failures.length || completed !== EXPECTED ? 1 : 0);
