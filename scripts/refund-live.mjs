// ROADMAP 97.68 — THE AFTER-RELEASE CHECK: A REAL REFUND IN STRIPE CLEARS THE REAL JOB'S "REFUND IT" LINE.
//
// Everything up to Stripe is proved without it: `tests/checkout-page-lifecycle.test.mjs` feeds the webhook
// fixture `charge.refunded` events, and `scripts/payment-problem-late.mjs` feeds the job record the rows
// those write, through `page.route`. What neither can show is the live chain: Stripe sending the event to
// the published `stripe-webhook`, the webhook finding the job on the real database and recording the refund,
// and the job record then dropping the line. This is that check, on the one payment set aside for it: a $195
// test payment (ACCOUNT, INTENT below) that `demo-detail`'s job holds on its refund-owed list since 2026-10-23.
// NOTHING HERE IS FED except the canary view and --rehearse-refunded, which say so: the job is read from the
// database and the page as the server serves it.
//
//   set -a; . ./.env; set +a     (SUPABASE_URL, the service key, DEMO_OWNER_PW, FIXTURE_OWNER_PW; STRIPE_SECRET_KEY for --refund)
//   node scripts/refund-live.mjs [--base=<app>]   reads only. No refund recorded: receipt `refund-live-waiting`, which passes
//        when the line IS there, inside the screen and painted, at every width. A refund recorded: receipt `refund-live`,
//        which passes when the line is gone at every width. 97.68 ticks on `refund-live` from a REAL refund, nothing else.
//   node scripts/refund-live.mjs --intent=<pi_…> [--cents=<paid>] --refund   refunds that payment on the test account and
//        REQUIRES the webhook's record within two minutes (receipt `refund-live`). Refused before any request to Stripe
//        unless every check passed (one job, demo-detail's, on --account, of --cents, not deleted), the key is sk_test_,
//        and Stripe says the payment is a succeeded test-mode one of exactly that amount.
//   node scripts/refund-live.mjs --rehearse-refunded   the after-refund judgement on the real row with a refund record FED in
//        (receipt `refund-live-rehearsal`): proves the half that ticks the item runs before a real refund exists. Never a tick.
//   A belt copy's server has no app settings: BASE=http://127.0.0.1:5180 node --import ./scripts/lib/inject-app-env.mjs scripts/refund-live.mjs
//
// EVERY VIEW: the page's clock frozen (--now=, BELT_FROZEN_NOW, else this run's start) in a far-off browser (--tz=, default
// Asia/Tokyo), read back; no console error AND no console warning; and the same address opened by a SECOND ACCOUNT,
// another business's owner (final-owner@fixture.test), which must get "Booking not found." with no line and no figure.
// THE CANARY IS THE OTHER HALF, so a probe that sees nothing cannot pass either way. Before the refund the same probe
// looks for a figure the job does not carry ($196) and must find nothing; after it, one view per width is fed the real
// row with its refund record removed and must show the line again.
// SABOTAGE: --break=blind looks for $196 instead of $195, so "the line is there" goes red before the refund.
// --break=no-refund strips the refund record from the real view (the webhook before 97.68), so "the line is gone" goes
// red after it (or in the rehearsal). --break=one-account opens the second account's views as the demo owner, so
// "Booking not found." goes red.
//
// THE $195 TEST PAYMENT CAN NEVER CLEAR A LINE, measured 2026-11-07. The 2026-10-23 live run that took it
// soft-deleted its job (eaa40f95) 12 seconds later, and the webhook skips deleted jobs on purpose
// (`chargeRefunded`'s `deleted_at` filter). The job PAGE does not skip it (`fetchBooking` reads by id) and still shows
// its red line, so the screen is judged; only a refund is refused, because it would be logged as "a refund for a
// payment no job here took" and change nothing, which would read as 97.68 broken in production. Un-deleting the job
// was tried and REFUSED by the database (`bookings_no_overlap`: live job 04cb1a5d holds the same 7 July 9-11 slot).
// So the refund needs a FRESH test payment on a live job (ROADMAP 97.68a): --intent=<pi_…> [--account=] [--cents=].

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
if (BREAK && !["blind", "no-refund", "one-account"].includes(BREAK)) { console.error(`unknown --break=${BREAK}`); process.exit(2); }

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

const REFUND = process.argv.includes("--refund"), REHEARSE = process.argv.includes("--rehearse-refunded");
if (REFUND && REHEARSE) { console.error("--refund and --rehearse-refunded cannot be combined: a rehearsal feeds the refund record. NOTHING WAS MEASURED."); process.exit(2); }
// A FROZEN CLOCK AND A FAR-OFF BROWSER on every view, read back from each page. Default: this run's own start,
// so the demo session stays valid; --now= or the belt's BELT_FROZEN_NOW to pin it.
const NOW = arg("now") || process.env.BELT_FROZEN_NOW || started_at, TZ = arg("tz") || "Asia/Tokyo";
const SECOND = { email: "final-owner@fixture.test", password: process.env.FIXTURE_OWNER_PW };  // mail-sink: another business's seeded owner
if (!SECOND.password) { console.error("FIXTURE_OWNER_PW is not set, so the second account cannot sign in. Load .env. NOTHING WAS MEASURED."); process.exit(2); }

let jobs = await readJobs();
check("exactly one job holds the test payment", jobs.length === 1, `${jobs.length} jobs`);
let job = jobs.length === 1 ? jobs[0] : undefined;
const AMOUNT = money(PAID_CENTS / 100), WRONG = money(PAID_CENTS / 100 + 1), LOOK = BREAK === "blind" ? WRONG : AMOUNT;
let account = null;
if (job) {
  const [biz] = await rest(`businesses?select=slug&id=eq.${job.business_id}`);
  const [conn] = await rest(`connected_accounts?select=stripe_account_id&business_id=eq.${job.business_id}`);
  account = conn?.stripe_account_id ?? null;
  check("it is demo-detail's job, on the test account", biz?.slug === "demo-detail" && account === ACCOUNT, `${biz?.slug} ${account}`);
  const listed = (job.payment_problem?.payments ?? []).find((p) => p?.intent === INTENT);
  check(`the payment is the ${AMOUNT} one`, Number(listed?.paid_cents ?? refundOf(job)?.paid_cents) === PAID_CENTS, JSON.stringify(listed ?? refundOf(job)));
}
// The webhook skips a deleted job (`chargeRefunded`'s `deleted_at` filter); the job page does NOT (`fetchBooking`
// reads by id, measured 2026-11-07), so the screen is still judged and only a refund is refused.
const deletedAt = job?.deleted_at ?? null;
const warnings = [];
if (deletedAt) {
  if (REFUND) check("the job is not deleted: the webhook skips a deleted job, so this refund could never be recorded", false, `deleted ${deletedAt}`);
  warnings.push(`NOT READY FOR A REFUND: job ${job.id} was soft-deleted ${deletedAt}, and the webhook skips deleted jobs, so refunding ${INTENT} would be logged as "a payment no job here took" and change nothing. Point --intent= at a fresh test payment on a live job (ROADMAP 97.68a).`);
}
if (REHEARSE) warnings.push("REHEARSAL: every view is fed the real row WITH A REFUND RECORD ADDED. It proves the after-refund judgement runs; it is not a refund and never ticks 97.68.");

// NOTHING REACHES STRIPE UNLESS EVERY CHECK ABOVE PASSED: one job, demo-detail's, on this account, this amount, not deleted.
let refunded = isRefunded(job);
if (REFUND) {
  if (failures.length) { console.error(`refusing to refund: ${failures.length} check(s) above failed. NOTHING WAS REFUNDED.`); process.exit(2); }
  const sk = process.env.STRIPE_SECRET_KEY ?? "";
  if (!sk.startsWith("sk_test_")) { console.error("--refund needs STRIPE_SECRET_KEY to be a TEST key (sk_test_…); refusing anything else. NOTHING WAS REFUNDED."); process.exit(2); }
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
    process.exit(2);
  }
  if (Number(pi.latest_charge?.amount_refunded ?? 0) < PAID_CENTS) {
    const [rs, rf] = await stripe("refunds", { payment_intent: INTENT });
    console.log(`refund: Stripe answered ${rs}, ${rf.id ?? rf.error?.message}, ${rf.status ?? ""}`);
    if (rs !== 200) process.exit(1);
  } else console.log("refund: already refunded in Stripe; waiting for the record");
  // Stripe's notice reaches the webhook in seconds. Two minutes, then the record is REQUIRED, never assumed.
  for (let i = 0; i < 40 && !isRefunded(job); i++) { await new Promise((r) => setTimeout(r, 3000)); job = (await readJobs()).find((j) => j.id === job.id) ?? job; }
  refunded = isRefunded(job);
  check("the webhook recorded the refund on the job within two minutes", refunded, JSON.stringify(job?.payment_problem?.refunds ?? null));
}
// What the screen must show: after a refund (requested, recorded or rehearsed) the line is gone; before it, it is there.
const gone = REFUND || REHEARSE || refunded;
console.log(gone ? `judging that the line is GONE${REHEARSE ? " (rehearsal: refund record fed)" : ""}` : "no refund recorded: judging that the line is still there");

const probed = [];
let discovered = 0, attempted = 0, completed = 0;
const canaryHits = [];
if (job) {
  const browser = await chromium.launch();
  try {
    const signIn = async ({ email, password }) => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const p = await ctx.newPage();
      await p.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
      await p.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
      if (await p.locator("input[type=email]").count()) {
        await p.fill("input[type=email]", email);
        await p.fill("input[type=password]", password);
        await p.click("form button.btn.primary");
        await p.waitForSelector(".tabbar", { timeout: 30000 });
      }
      const state = await ctx.storageState();
      await ctx.close();
      return state;
    };
    const owner = await signIn(demoOwner());
    // --break=one-account opens the "second" views as the demo owner: "Booking not found." must then go red.
    const second = BREAK === "one-account" ? owner : await signIn(SECOND);
    mkdirSync(SHOTS, { recursive: true });

    // One view of the job record. The row is the database's own; `add` feeds it a refund record (rehearsal),
    // `strip` removes the record (the canary, or --break=no-refund). Settled on the job's own read arriving,
    // never on what has rendered (docs/gotchas.md 109).
    const view = async (state, w, h, { add = false, strip = false } = {}, name) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, storageState: state, timezoneId: TZ });
      await ctx.clock.setFixedTime(new Date(NOW));
      await ctx.addInitScript(() => localStorage.setItem("dp.lang.app", "en"));
      const page = await ctx.newPage();
      const errors = [], warns = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); if (m.type() === "warning") warns.push(m.text()); });
      page.on("pageerror", (e) => errors.push(String(e)));
      let reads = 0;
      await page.route("**/rest/v1/bookings?**", async (route) => {
        if (route.request().method() !== "GET" || !route.request().url().includes(job.id)) return route.continue();
        const res = await route.fetch();
        let body = await res.json().catch(() => null);
        const edit = (b) => {
          if (b?.id !== job.id) return b;
          let pp = b.payment_problem;
          if (add && pp) pp = { ...pp, refunds: { ...(pp.refunds ?? {}), [INTENT]: { paid_cents: PAID_CENTS, refunded_cents: PAID_CENTS, at: NOW } } };
          if (strip && pp?.refunds) { const { refunds, ...others } = pp; pp = others; }
          return { ...b, payment_problem: pp };
        };
        body = Array.isArray(body) ? body.map(edit) : edit(body);
        if ((Array.isArray(body) ? body : [body]).some((b) => b?.id === job.id)) reads++;
        await route.fulfill({ response: res, json: body });
      });
      await page.goto(`${BASE}/job/${job.id}`, { waitUntil: "domcontentloaded" });
      for (let i = 0; i < 60 && !reads; i++) await page.waitForTimeout(250);
      await page.waitForSelector(".jobbar, .error-box, .center p", { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const clock = await page.evaluate(() => [new Date().toISOString(), Intl.DateTimeFormat().resolvedOptions().timeZone]);
      // Each line, and for the one naming the figure: inside the screen, painted on top, fully opaque.
      const seen = await page.evaluate((look) => {
        const els = [...document.querySelectorAll("[data-refund-owed]")];
        const el = els.find((e) => e.innerText.includes(look));
        let box = null;
        if (el) {
          el.scrollIntoView({ block: "center" });
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          box = { left: r.left, right: r.right, top: r.top, bottom: r.bottom, vw: window.innerWidth, vh: window.innerHeight, hit: !!hit && (hit === el || el.contains(hit)), opacity: getComputedStyle(el).opacity };
        }
        return { lines: els.map((e) => e.innerText), box, notFound: document.body.innerText.includes("Booking not found."), body: document.body.innerText };
      }, LOOK);
      const shot = `${SHOTS}/live-${name}-${w}x${h}.png`;
      await page.screenshot({ path: shot, fullPage: false });
      await ctx.close();
      return { reads, clock, errors, warns, shot, ...seen };
    };
    const clean = (tag, v) => {
      check(`${tag} · the page's clock is frozen at ${NOW} in ${TZ}`, v.clock[0] === new Date(NOW).toISOString() && v.clock[1] === TZ, v.clock.join(" "));
      check(`${tag} · no console error`, v.errors.length === 0, v.errors.slice(0, 3).join(" | "));
      check(`${tag} · no console warning`, v.warns.length === 0, v.warns.slice(0, 3).join(" | "));
    };

    const label = BREAK ? `break-${BREAK}` : REHEARSE ? "rehearsal" : gone ? "after" : "before";
    for (const [w, h] of WIDTHS) {
      discovered++; attempted++;
      const tag = `${w}x${h}`;
      const real = await view(owner, w, h, { add: REHEARSE, strip: BREAK === "no-refund" }, label);
      check(`${tag} · the page read the job itself`, real.reads > 0, "no bookings read returned this job");
      clean(tag, real);
      if (gone) check(`${tag} · no "refund it" line: the refunded payment is not owed`, real.lines.length === 0, real.lines.join(" | "));
      else {
        check(`${tag} · the "refund it" line names ${LOOK}`, !!real.box, real.lines.join(" | ") || "no [data-refund-owed] line");
        if (real.box) {
          check(`${tag} · the line is inside the screen`, real.box.left >= 0 && real.box.right <= real.box.vw + 0.5 && real.box.top >= 0 && real.box.bottom <= real.box.vh + 0.5, JSON.stringify(real.box));
          check(`${tag} · the line is painted on top (hit test lands on it)`, real.box.hit);
          check(`${tag} · the line is fully opaque`, real.box.opacity === "1", `opacity ${real.box.opacity}`);
        }
      }
      // THE SECOND ACCOUNT: another business's owner opening the same address sees no job and no figure.
      const other = await view(second, w, h, { add: REHEARSE }, `${label}-second-account`);
      check(`${tag} · second account: "Booking not found."`, other.notFound, other.body.slice(0, 160));
      check(`${tag} · second account: no refund line and no ${AMOUNT}`, other.lines.length === 0 && !other.body.includes(AMOUNT), other.lines.join(" | "));
      clean(`${tag} · second account`, other);
      const p = { width: w, lines: real.lines, box: real.box, errors: real.errors.length, warnings: real.warns.length, shot: real.shot, second_account: { not_found: other.notFound, lines: other.lines, shot: other.shot } };
      if (gone) {
        // The canary: the same view with the refund record removed must show the line again.
        // Named by run, so a clean run never overwrites a sabotage run's evidence.
        const control = await view(owner, w, h, { add: REHEARSE, strip: true }, `${label}-canary-refund-stripped`);
        canaryHits.push(control.reads > 0 && control.lines.some((t) => t.includes(AMOUNT)));
        probed.push({ ...p, canary_lines: control.lines, canary_shot: control.shot });
      } else {
        canaryHits.push(real.reads > 0 && !real.lines.some((t) => t.includes(WRONG)));
        probed.push(p);
      }
      completed++;
    }
  } finally {
    await browser.close();
  }
}

// `refund-live` is the receipt 97.68 ticks on: a refund requested here, or one already recorded. Never a rehearsal.
const id = REHEARSE ? "refund-live-rehearsal" : REFUND || refunded ? "refund-live" : "refund-live-waiting";
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
  min_assertions: 24,
  failures,
  warnings: [...warnings, ...(gone ? [] : ["No refund is recorded: this receipt proves only that the check sees the line on the real job. ROADMAP 97.68 ticks on `refund-live` from a real refund."])],
  dimensions: { base: BASE, job: job?.id ?? null, account, intent: INTENT, deleted_at: deletedAt, refunded, rehearsal: REHEARSE, frozen_now: NOW, browser_tz: TZ, second_account: SECOND.email, widths: WIDTHS.map(([w, h]) => `${w}x${h}`), ...(BREAK ? { break: BREAK } : {}), probed },
  artifacts: [SHOTS],
  canary: BREAK
    ? { id: `break-${BREAK}`, observed_failure: failures.length > 0 }
    : gone
      ? { id: "refund-stripped-shows-the-line", observed_failure: canaryHits.length === WIDTHS.length && canaryHits.every(Boolean) }
      : { id: `${WRONG}-not-found`, observed_failure: canaryHits.length === WIDTHS.length && canaryHits.every(Boolean) },
});
console.log(`receipt: ${path}`);
process.exit(failures.length || completed !== WIDTHS.length ? 1 : 0);
