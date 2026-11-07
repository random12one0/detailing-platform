// ROADMAP 97.68 — THE AFTER-RELEASE CHECK: A REAL REFUND IN STRIPE CLEARS THE REAL JOB'S "REFUND IT" LINE.
//
// Everything up to Stripe is proved without it: `tests/checkout-page-lifecycle.test.mjs` feeds the webhook
// fixture `charge.refunded` events, and `scripts/payment-problem-late.mjs` feeds the job record the rows
// those write, through `page.route`. What neither can show is the live chain: Stripe sending the event to
// the published `stripe-webhook`, the webhook finding the job on the real database and recording the refund,
// and the job record then dropping the line. This is that check, on the one payment set aside for it: a $195
// test payment (ACCOUNT, INTENT below) that `demo-detail`'s job holds on its refund-owed list since 2026-10-23.
// NOTHING HERE IS FED: the job is read from the database and the page as the server serves it, except the
// canary view, which says so.
//
//   set -a; . ./.env; set +a          (SUPABASE_URL, the service key, DEMO_OWNER_PW; STRIPE_SECRET_KEY for --refund)
//   node scripts/refund-live.mjs [--base=<app>]          reads only. Before the refund: receipt `refund-live-waiting`,
//                                                         which passes when the line IS there at every width. After it:
//                                                         receipt `refund-live`, which passes when the refund is recorded
//                                                         on the job AND the line is gone at every width. 97.68 ticks on that one.
//   node scripts/refund-live.mjs --refund                makes the refund itself on the test account (a sk_test_ key only;
//                                                         anything else, or a live-mode payment, is refused), waits up to
//                                                         two minutes for the webhook to record it, then judges as above.
//   A belt copy's server has no app settings: BASE=http://127.0.0.1:5180 node --import ./scripts/lib/inject-app-env.mjs scripts/refund-live.mjs
//
// THE CANARY IS THE OTHER HALF, so a probe that sees nothing cannot pass either way. Before the refund the
// same probe looks for a figure the job does not carry ($196) and must find nothing; after it, one view per
// width is fed the real row with its refund record removed and must show the line again.
// SABOTAGE: --break=blind looks for $196 instead of $195, so "the line is there" goes red before the refund.
// --break=no-refund strips the refund record from the real view (the webhook before 97.68), so "the line is
// gone" goes red after it. No frozen clock: this job's line carries no date (the dated refund note is the
// cancelled-job view, proved under a frozen clock by payment-problem-late.mjs).
//
// THE $195 TEST PAYMENT CAN NEVER CLEAR A LINE, measured 2026-11-07. The 2026-10-23 live run that took it
// soft-deleted its job (eaa40f95) 12 seconds later, and the webhook skips deleted jobs on purpose
// (`chargeRefunded`'s `deleted_at` filter), as does the job page. So refunding it is logged as "a refund for a
// payment no job here took" and changes nothing, which would read as 97.68 broken in production. Un-deleting
// it was tried and REFUSED by the database (`bookings_no_overlap`): live job 04cb1a5d holds the same 7 July
// 9-11 slot. So a deleted job is reported as NOT READY, never judged, and the check is pointed at a FRESH test
// payment on a live job with --intent=<pi_…> [--account=<acct_…>] [--cents=<paid>], defaults the old payment.

import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { demoOwner } from "./lib/demoOwner.mjs";
import { writeReceipt } from "./receipt.mjs";
import { money } from "../app/src/lib/format.js";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium } = require("playwright");

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=") ?? "";
const ACCOUNT = arg("account") || "acct_1UCMp1JeoZ7g84se", INTENT = arg("intent") || "pi_3UTnNpJeoZ7g84se0AeDet4F";
const PAID_CENTS = Number(arg("cents") || 19500);
const BASE = arg("base") || process.env.BASE_URL || "http://localhost:5173";
const BREAK = arg("break");
const SHOTS = arg("shots") || "C:/Users/rando/Downloads/claude/control-room/belt/shots/97.68/png";
const WIDTHS = [[1440, 900], [768, 1024], [390, 844], [320, 700]];
const started_at = new Date().toISOString();
if (BREAK && !["blind", "no-refund"].includes(BREAK)) { console.error(`unknown --break=${BREAK}`); process.exit(2); }

const URL_ = process.env.SUPABASE_URL ?? "", KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!URL_.includes("kguqylyzgyzfktkfnhjb") || !KEY) {
  console.error("needs SUPABASE_URL for kguqylyzgyzfktkfnhjb (this platform's own database) and its service key loaded. NOTHING WAS MEASURED.");
  process.exit(2);
}
// Reads only: this check never writes to the database.
const rest = async (path) => {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`database read ${r.status}: ${await r.text()}`);
  return r.json();
};
const cols = "id,business_id,status,payment_status,payment_problem,deleted_at";
// The two ways the webhook leaves this payment on a job: on the owed list, or in the refund record by payment.
// Deleted jobs included, so a deleted one is reported as NOT READY rather than mistaken for "no job".
const readJobs = async () => {
  const listed = await rest(`bookings?select=${cols}&payment_problem=cs.${encodeURIComponent(JSON.stringify({ payments: [{ intent: INTENT }] }))}`);
  const recorded = await rest(`bookings?select=${cols}&payment_problem->refunds->${INTENT}=not.is.null`);
  return [...new Map([...listed, ...recorded].map((j) => [j.id, j])).values()];
};
const refundOf = (job) => job?.payment_problem?.refunds?.[INTENT] ?? null;
const isRefunded = (job) => { const r = refundOf(job); return !!r && Number(r.paid_cents) === PAID_CENTS && Number(r.refunded_cents) >= PAID_CENTS; };

let assertions = 0;
const failures = [];
const check = (name, ok, detail = "") => {
  assertions++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : ` — ${detail}`}`);
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

let jobs = await readJobs();
check("exactly one job holds the test payment", jobs.length === 1, `${jobs.length} jobs`);
let job = jobs[0];
const AMOUNT = money(PAID_CENTS / 100), LOOK = BREAK === "blind" ? money(PAID_CENTS / 100 + 1) : AMOUNT, WRONG = money(PAID_CENTS / 100 + 1);
let account = null;
if (job) {
  const [biz] = await rest(`businesses?select=slug&id=eq.${job.business_id}`);
  const [conn] = await rest(`connected_accounts?select=stripe_account_id&business_id=eq.${job.business_id}`);
  account = conn?.stripe_account_id ?? null;
  check("it is demo-detail's job, on the test account", biz?.slug === "demo-detail" && account === ACCOUNT, `${biz?.slug} ${account}`);
  const listed = (job.payment_problem?.payments ?? []).find((p) => p?.intent === INTENT);
  check(`the payment is the ${AMOUNT} one`, Number(listed?.paid_cents ?? refundOf(job)?.paid_cents) === PAID_CENTS, JSON.stringify(listed ?? refundOf(job)));
}
const deletedAt = job?.deleted_at ?? null;
if (deletedAt) check("the job is not deleted (the webhook and the job page both skip a deleted job)", false, `NOT READY: deleted ${deletedAt}; point the check at a fresh test payment on a live job (--intent=)`);

const probed = [];
let discovered = 0, attempted = 0, completed = 0, refunded = isRefunded(job);
const canaryHits = [];
if (job && !deletedAt) {
  const browser = await chromium.launch();
  try {
    if (process.argv.includes("--refund")) {
      const sk = process.env.STRIPE_SECRET_KEY ?? "";
      if (!sk.startsWith("sk_test_")) { console.error("--refund needs STRIPE_SECRET_KEY to be a TEST key (sk_test_…); refusing anything else. NOTHING WAS REFUNDED."); await browser.close(); process.exit(2); }
      const stripe = async (path, form) => {
        const r = await fetch(`https://api.stripe.com/v1/${path}`, {
          method: form ? "POST" : "GET",
          headers: { Authorization: `Bearer ${sk}`, "Stripe-Account": ACCOUNT, ...(form ? { "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `roadmap-97.68-${INTENT}` } : {}) },
          body: form ? new URLSearchParams(form) : undefined,
        });
        return [r.status, await r.json()];
      };
      const [s, pi] = await stripe(`payment_intents/${INTENT}?expand[]=latest_charge`);
      if (s !== 200 || pi.livemode !== false || pi.status !== "succeeded" || pi.amount_received !== PAID_CENTS) {
        console.error(`refusing to refund: Stripe answered ${s}, livemode ${pi?.livemode}, status ${pi?.status}, received ${pi?.amount_received} (wanted a ${PAID_CENTS}-cent TEST payment). NOTHING WAS REFUNDED.`);
        await browser.close(); process.exit(2);
      }
      if (Number(pi.latest_charge?.amount_refunded ?? 0) < PAID_CENTS) {
        const [rs, rf] = await stripe("refunds", { payment_intent: INTENT });
        console.log(`refund: Stripe answered ${rs}, ${rf.id ?? rf.error?.message}, ${rf.status ?? ""}`);
        if (rs !== 200) { await browser.close(); process.exit(1); }
      } else console.log("refund: already refunded in Stripe; waiting for the record");
      // Stripe's notice reaches the webhook in seconds; two minutes, then judge whatever is there.
      for (let i = 0; i < 40 && !isRefunded(job); i++) { await new Promise((r) => setTimeout(r, 3000)); job = (await readJobs()).find((j) => j.id === job.id) ?? job; }
      refunded = isRefunded(job);
    }
    console.log(refunded ? `the refund IS recorded: ${JSON.stringify(refundOf(job))}` : "the refund is NOT recorded yet: judging that the line is still there");

    const login = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const lp = await login.newPage();
    await lp.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
    await lp.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
    if (await lp.locator("input[type=email]").count()) {
      await lp.fill("input[type=email]", demoOwner().email);
      await lp.fill("input[type=password]", demoOwner().password);
      await lp.click("form button.btn.primary");
      await lp.waitForSelector(".tabbar", { timeout: 30000 });
    }
    const state = await login.storageState();
    await login.close();
    mkdirSync(SHOTS, { recursive: true });

    // One view of the job record. `strip` feeds the real row with its refund record removed (the canary, or
    // --break=no-refund); otherwise the page reads the database untouched. Settled on the job's own read
    // arriving, never on what has rendered (docs/gotchas.md 109).
    const view = async (w, h, strip, name) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, storageState: state });
      await ctx.addInitScript(() => localStorage.setItem("dp.lang.app", "en"));
      const page = await ctx.newPage();
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push(String(e)));
      let reads = 0;
      await page.route("**/rest/v1/bookings?**", async (route) => {
        if (route.request().method() !== "GET" || !route.request().url().includes(job.id)) return route.continue();
        const res = await route.fetch();
        let body = await res.json().catch(() => null);
        const edit = (b) => {
          if (!strip || b?.id !== job.id || !b.payment_problem?.refunds) return b;
          const { refunds, ...others } = b.payment_problem;
          return { ...b, payment_problem: others };
        };
        body = Array.isArray(body) ? body.map(edit) : edit(body);
        if ((Array.isArray(body) ? body : [body]).some((b) => b?.id === job.id)) reads++;
        await route.fulfill({ response: res, json: body });
      });
      await page.goto(`${BASE}/job/${job.id}`, { waitUntil: "domcontentloaded" });
      for (let i = 0; i < 60 && !reads; i++) await page.waitForTimeout(250);
      await page.waitForSelector(".jobbar, .error-box", { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const lines = await page.evaluate(() => [...document.querySelectorAll("[data-refund-owed]")].map((el) => el.innerText));
      const shot = `${SHOTS}/live-${name}-${w}x${h}.png`;
      await page.screenshot({ path: shot, fullPage: false });
      await ctx.close();
      return { reads, lines, errors, shot };
    };

    for (const [w, h] of WIDTHS) {
      discovered++; attempted++;
      const tag = `${w}x${h}`;
      const real = await view(w, h, BREAK === "no-refund", BREAK ? `break-${BREAK}` : refunded ? "after" : "before");
      check(`${tag} · the page read the job itself`, real.reads > 0, "no bookings read returned this job");
      if (refunded) check(`${tag} · no "refund it" line: the refunded payment is not owed`, real.lines.length === 0, real.lines.join(" | "));
      else check(`${tag} · the "refund it" line names ${LOOK}`, real.lines.some((t) => t.includes(LOOK)), real.lines.join(" | ") || "no [data-refund-owed] line");
      check(`${tag} · console clean`, real.errors.length === 0, real.errors.slice(0, 3).join(" | "));
      if (refunded) {
        const control = await view(w, h, true, "canary-refund-stripped");
        canaryHits.push(control.reads > 0 && control.lines.some((t) => t.includes(AMOUNT)));
        probed.push({ width: w, lines: real.lines, errors: real.errors.length, shot: real.shot, canary_lines: control.lines, canary_shot: control.shot });
      } else {
        canaryHits.push(real.reads > 0 && !real.lines.some((t) => t.includes(WRONG)));
        probed.push({ width: w, lines: real.lines, errors: real.errors.length, shot: real.shot });
      }
      completed++;
    }
  } finally {
    await browser.close();
  }
}

const id = refunded ? "refund-live" : "refund-live-waiting";
console.log(`\n${assertions - failures.length} passed, ${failures.length} failed, ${completed} of ${WIDTHS.length} widths.`);
const { path } = writeReceipt({
  check_id: BREAK ? `${id}-${BREAK}` : id,
  started_at,
  status: failures.length || completed !== WIDTHS.length ? "fail" : "pass",
  expected_targets: WIDTHS.length,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 12,
  failures,
  warnings: refunded ? [] : ["The refund has NOT been made yet: this receipt proves only that the check sees the line on the real job today. ROADMAP 97.68 ticks on `refund-live`, written once the refund is recorded."],
  dimensions: { base: BASE, job: job?.id ?? null, account, intent: INTENT, deleted_at: deletedAt, refunded, refund: refundOf(job), widths: WIDTHS.map(([w, h]) => `${w}x${h}`), ...(BREAK ? { break: BREAK } : {}), probed },
  artifacts: [SHOTS],
  canary: BREAK
    ? { id: `break-${BREAK}`, observed_failure: failures.length > 0 }
    : refunded
      ? { id: "refund-stripped-shows-the-line", observed_failure: canaryHits.length === WIDTHS.length && canaryHits.every(Boolean) }
      : { id: `${WRONG}-not-found`, observed_failure: canaryHits.length === WIDTHS.length && canaryHits.every(Boolean) },
});
console.log(`receipt: ${path}`);
process.exit(failures.length || completed !== WIDTHS.length ? 1 : 0);
