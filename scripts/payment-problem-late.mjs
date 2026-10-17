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
//   settled    paid + a stale amount problem   → the POSSIBLE refund line (97.70: Andrew ruled
//              2026-10-17 that this is flagged; until then it was 97.10's refused case)
//   clean      paid, no problem                → NO line (the refused case and the canary)
//   hand-paid  97.70: a $100 wrong-figure payment, then the DETAILER marks the job paid
//              (`update-booking` leaves the note untouched, tests/update-booking-keeps-note.test.mjs)
//              → "possible refund … if you kept this payment …, ignore this"; -es, -currency,
//              -extra (a later extra payment on top keeps the note in `earlier`)
//   owed-back must NOT carry the "if you kept" wording: there the webhook KNOWS it is owed
//   owed-back  97.69: a $100 wrong-figure payment, then the job paid → its own refund
//              line, fed the note `settleProblem` (production code) writes; -es, -currency
//   refunded   ROADMAP 97.68: the only extra payment refunded in Stripe → NO line
//   part-refunded  $50 of a $150 extra refunded → the line names the $100 still owed
//   part-refunded-es  the same, in Spanish
//   mixed      an untouched $150 extra AND a $100 extra with $50 refunded → one line EACH,
//              never one sentence over their total (review, 2026-10-17)
//   owed-back-refunded  97.69's owed-back payment refunded in full → no line; -part-refunded(-es) → the $50 left
//   unpaid-wrong-refunded  an unpaid job's wrong-figure payment, refunded before the job settled → no line
//   cancelled  ROADMAP 14.4: a cancelled job paid by card, nothing refunded → "Refund $150" (still shown)
//   cancelled-refunded  its own payment refunded in Stripe → NO red line, and "Refunded $150 in your Stripe on …"
//   cancelled-part-refunded(-es)  $50 refunded → the line names the $100 left
//   97.80: the payment pill on those views reads "Refunded" / "Part refunded" (-es "Devuelto" / "Devuelto en parte"),
//              never the green "Paid"; own-refunded is a confirmed job refunded in full; cancelled and clean stay "Paid"
//   hand-paid-part-refunded(-es, -currency)  ROADMAP 97.78: 97.70's kept $100 payment, $50 refunded
//              → the possible-refund line names the $50 left, never "A card payment of $100 … refund it"
//   waived-part-refunded(-es, -currency)  the same on 97.75's waived job
//   hand-paid-refunded, waived-refunded  refunded in full → NO line (the refused case)
// Every row is what `tests/checkout-page-lifecycle.test.mjs` § 4 shows the webhook writes:
// refunds are kept in `payment_problem.refunds`, by payment.
//
// For each line shown: inside the viewport, painted (hit test at its centre lands
// on it), and no console error. Screenshots go OUTSIDE the repo.
//
// SABOTAGE: --break=old-webhook feeds failed/extra as the OLD webhook left them
// (a failed debit still paid; a second payment recorded nowhere). That is the
// original defect, and those scenarios must go red.
// --break=hide-hand-paid (97.70) rewrites the served BookingDetail module so a
// paid job hides its kept wrong-figure note again (the original defect); the
// rewrite is signed and the signature read back from the page (docs/gotchas.md 113).
// --break=no-refund feeds every 97.68 scenario as the webhook left them before
// `charge.refunded` was handled: no refund recorded anywhere. That is 97.68's
// original defect, and every one of them except `cancelled` must go red.
// --break=whole-payment (97.78) rewrites the served module so a partly refunded
// possible-refund line names the whole payment again (the original defect), signed and read back.
// --break=plain-pill (97.80) rewrites the served module so the payment pill reads `payment_status`
// alone again (the original defect: "Cancelled · Paid" in green over a full refund), signed and read back;
// every view that asserts "Refunded" or "Part refunded" must go red, and "Paid" stays green.
// --break=browser-day (97.68) rewrites the served module so the refund's date is
// read in the BROWSER's day instead of the business's: under the frozen clock and
// the Tokyo browser below, "Friday, October 16" becomes Saturday, so it must go red.
//
// A FROZEN CLOCK AND A FAR-OFF BROWSER, ALWAYS (97.68's contract asks for the clock).
// Every view runs with the page's clock fixed (--now=, or the belt's BELT_FROZEN_NOW;
// default 2026-10-17T06:30Z, still the 16th in Los Angeles and already the 17th in
// Tokyo) and the browser in --tz= (default Asia/Tokyo). The refund recorded at
// 15:00Z on the 16th is the 16th for the demo business (America/Los_Angeles) and
// the 17th for the browser, so the date printed proves whose day it is.
//
//   set -a; . ./.env; set +a      (DEMO_OWNER_PW; the demo owner signs in)
//   node scripts/payment-problem-late.mjs [--base=http://127.0.0.1:5180] [--break=old-webhook|overwrite|hide-hand-paid|no-refund|browser-day|whole-payment|plain-pill] [--now=<iso>] [--tz=<zone>] [--freeze] [--env-shim]
//   --freeze-owed=before|after   97.69's review pair at 390, no receipt
//   --freeze-hand=before|after   97.70's review pair at 390, no receipt
//   --shots=<dir>                where the PNGs go (default: the 97.11 folder)
//   --freeze-left=before|after   97.78's review pairs at 390 (hand-paid, waived), no receipt
//   --freeze-pill=before|after   97.80's review pairs at 390, no receipt
//   --freeze-refund=<dir> [--pair=<place>] [--side=before|after]   97.68's pairs at 390, no receipt

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
if (BREAK && !["old-webhook", "overwrite", "hide-hand-paid", "no-refund", "browser-day", "whole-payment", "plain-pill"].includes(BREAK)) { console.error(`unknown --break=${BREAK}`); process.exit(2); }
const OLDHOOK = BREAK === "old-webhook";
// --freeze-reasons=before|after: only freeze the two-reasons view at 390 (Andrew's review pair), no receipt.
const FREEZE_REASONS = arg("freeze-reasons");
const FREEZE_OWED = arg("freeze-owed");
const FREEZE_HAND = arg("freeze-hand");
// The served-module rewrites, each signed and read back from the page (docs/gotchas.md 113).
const REWRITE = {
  "hide-hand-paid": ['booking.payment_status === "paid" ? kept.filter(', "false ? kept.filter("],
  "browser-day": ["localDate(ownRefund.at, business.timezone)", "localDate(ownRefund.at)"],
  "whole-payment": ["const partlyRefunded = (r) => refundedOf(r.intent) > 0;", "const partlyRefunded = (r) => false;"],
  "plain-pill": ["const pay = payPill(booking);", "const pay = booking.payment_status;"],
}[BREAK];
const NOW = arg("now") || process.env.BELT_FROZEN_NOW || "2026-10-17T06:30:00.000Z";
const TZ = arg("tz") || "Asia/Tokyo";
const SHOTS = arg("shots") || "C:/Users/rando/Downloads/claude/belt/shots/97.11/png";
const FREEZE_REFUND = arg("freeze-refund");
const FREEZE_LEFT = arg("freeze-left");
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
const NOREFUND = BREAK === "no-refund";
// ROADMAP 97.68: what the detailer refunded in Stripe, by payment. --break=no-refund records none.
const refund = (problem, intent, paid, refunded) => NOREFUND ? problem
  : { ...problem, refunds: { ...problem?.refunds, [intent]: { paid_cents: paid, refunded_cents: refunded, at: AT } } };
const PART = refund(EXTRA, "pi_2", 15000, 5000);
const REFUNDED = refund(EXTRA, "pi_2", 15000, 15000);
const MIXED = refund({ ...EXTRA, paid_cents: 25000, payments: [EXTRA.payments[0], { intent: "pi_3", paid_cents: 10000, currency: "usd", at: AT }] }, "pi_3", 10000, 5000);
// A cancelled job paid by card (14.4). Before any refund the webhook has written no note at all.
const CANCELLED = { ...PAID, status: "cancelled", stripe_payment_intent: "pi_1", payment_problem: null };
const BASE_NOTE = { kind: "extra", paid_cents: 0, owed_cents: 0, currency: "usd", at: AT };
const cancelledRefunded = (cents) => ({ ...CANCELLED, payment_problem: NOREFUND ? null : refund(BASE_NOTE, "pi_1", 15000, cents) });
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
// ROADMAP 97.70: the same $100 payment, then the DETAILER marks the job paid. `update-booking`
// cannot write `payment_problem`, so the row is the paid status over the untouched note.
const HAND = { payment_status: "paid", paid_online_at: null, final_amount: null, total_price: 150, payment_problem: WRONG };
const HAND_EUR = { ...HAND, payment_problem: WRONG_EUR };
const HAND_EXTRA = { ...HAND, payment_problem: { ...EXTRA, paid_cents: 5000, payments: [{ intent: "pi_9", paid_cents: 5000, currency: "usd", at: AT }], earlier: [WRONG] } };
const HAND_WANT = ["A card payment of $100 did not match what this job was owed, and the job has since been marked paid.",
  "If they paid you in full another way, refund it from your own Stripe.", "If you kept this payment as part of what they paid, ignore this."];
// ROADMAP 97.78: the same kept payments, then $50 of the $100 refunded in Stripe (or all of it).
const WAIVED = { ...HAND, payment_status: "waived" };
const HAND_PART = { ...HAND, payment_problem: refund(WRONG, "pi_1", 10000, 5000) };
const WAIVED_PART = { ...WAIVED, payment_problem: refund(WRONG, "pi_1", 10000, 5000) };
const LEFT = "You refunded part of it, and $50 is not refunded yet.";
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
  { id: "owed-back", patch: OLDHOOK ? OWED_OLD : OWED, want: OWED_WANT, wantNot: ["after this job was settled", "If you kept"] },
  { id: "owed-back-es", lang: "es", patch: OLDHOOK ? OWED_OLD : OWED,
    want: ["Un pago con tarjeta de $100 no coincidía con lo que debía este trabajo, y el trabajo ya se pagó."] },
  { id: "owed-back-currency", patch: OLDHOOK ? { ...PAID, payment_problem: WRONG_EUR } : OWED_EUR,
    want: ["A card payment that was not in US dollars came in, and this job has since been paid."], wantNot: "$" },
  { id: "settled", patch: { ...PAID, payment_problem: AMOUNT }, want: ["A card payment of $1 did not match what this job was owed", "If you kept this payment"] },
  { id: "hand-paid", patch: HAND, want: HAND_WANT, wantNot: ["We did not mark it paid", "Refund it from your own Stripe."] },
  { id: "hand-paid-es", lang: "es", patch: HAND,
    want: ["Un pago con tarjeta de $100 no coincidía con lo que debía este trabajo, y luego el trabajo se marcó como pagado.", "ignora este aviso"] },
  { id: "hand-paid-currency", patch: HAND_EUR,
    want: ["A card payment that was not in US dollars came in, and the job has since been marked paid.", "If you kept this payment"], wantNot: "$" },
  { id: "hand-paid-extra", patch: HAND_EXTRA,
    want: ["A card payment of $100 did not match", "If you kept this payment", "Another payment of $50 came in after this job was settled."] },
  { id: "clean", patch: { ...PAID, payment_problem: null }, want: null, pill: "Paid" },
  // ROADMAP 97.78 — a kept wrong-figure payment, partly refunded: the possible-refund line names what is left.
  { id: "hand-paid-part-refunded", patch: HAND_PART,
    want: ["A card payment of $100 did not match what this job was owed, and the job has since been marked paid. " + LEFT,
      "If they paid you in full another way, refund the rest from your own Stripe.", "If you kept this payment as part of what they paid, ignore this."],
    wantNot: ["refund it from your own Stripe"] },
  { id: "hand-paid-part-refunded-es", lang: "es", patch: HAND_PART,
    want: ["y luego el trabajo se marcó como pagado. Ya devolviste una parte, y $50 todavía no se ha devuelto.", "devuelve el resto desde tu propio Stripe"] },
  { id: "hand-paid-part-refunded-currency", patch: { ...HAND_EUR, payment_problem: refund(WRONG_EUR, "pi_1", 15000, 5000) },
    want: ["A card payment that was not in US dollars came in, and the job has since been marked paid. Part of it is not refunded yet.", "refund the rest from your own Stripe"], wantNot: "$" },
  { id: "waived-part-refunded", patch: WAIVED_PART,
    want: ["A card payment of $100 did not match what this job was owed, and the job has since been waived. " + LEFT,
      "Refund the rest from your own Stripe. If you meant to keep it, ignore this."],
    wantNot: ["Refund it from your own Stripe", "marked paid"] },
  { id: "waived-part-refunded-es", lang: "es", patch: WAIVED_PART,
    want: ["y luego el trabajo se marcó como perdonado. Ya devolviste una parte, y $50 todavía no se ha devuelto.", "Devuelve el resto desde tu propio Stripe. Si querías quedártelo, ignora este aviso."] },
  { id: "waived-part-refunded-currency", patch: { ...WAIVED, payment_problem: refund(WRONG_EUR, "pi_1", 15000, 5000) },
    want: ["A card payment that was not in US dollars came in, and the job has since been waived. Part of it is not refunded yet.", "Refund the rest from your own Stripe."], wantNot: "$" },
  { id: "hand-paid-refunded", patch: { ...HAND, payment_problem: refund(WRONG, "pi_1", 10000, 10000) }, want: null },
  { id: "waived-refunded", patch: { ...WAIVED, payment_problem: refund(WRONG, "pi_1", 10000, 10000) }, want: null },
  // ROADMAP 97.68 — rows exactly as `tests/checkout-page-lifecycle.test.mjs` § 4 shows the webhook leaves them.
  { id: "refunded", patch: { ...PAID, payment_problem: REFUNDED }, want: null },
  { id: "part-refunded", patch: { ...PAID, payment_problem: PART },
    want: ["Another payment came in after this job was settled, and $100 of it is not refunded yet.", "Refund it from your own Stripe."] },
  { id: "part-refunded-es", lang: "es", patch: { ...PAID, payment_problem: PART },
    want: ["Llegó otro pago después de que este trabajo ya estaba saldado, y $100 todavía no se ha devuelto."] },
  { id: "mixed", patch: { ...PAID, payment_problem: MIXED },
    want: ["Another payment of $150 came in after this job was settled.", "Another payment came in after this job was settled, and $50 of it is not refunded yet."],
    lines: 2 },
  // 97.69's owed-back payment, refunded in Stripe: in full → no line; $50 of $100 → the $50 left.
  { id: "owed-back-refunded", patch: { ...OWED, payment_problem: refund(OWED.payment_problem, "pi_1", 10000, 10000) }, want: null },
  { id: "owed-back-part-refunded", patch: { ...OWED, payment_problem: refund(OWED.payment_problem, "pi_1", 10000, 5000) },
    want: ["A card payment of $100 did not match what this job was owed, and the job has since been paid. You refunded part of it, and $50 is not refunded yet."], wantNot: ["after this job was settled"] },
  { id: "owed-back-part-refunded-es", lang: "es", patch: { ...OWED, payment_problem: refund(OWED.payment_problem, "pi_1", 10000, 5000) },
    want: ["Ya devolviste una parte, y $50 todavía no se ha devuelto."] },
  // A wrong-figure payment refunded while the job is still unpaid (the refund came before the job settled).
  { id: "unpaid-wrong-refunded", patch: { ...UNPAID, payment_problem: refund(WRONG, "pi_1", 10000, 10000) }, want: null },
  // ROADMAP 14.4 — the cancelled job's own payment. The first is the case that must STILL show.
  { id: "cancelled", sel: "[data-refund-cancelled]", patch: CANCELLED,
    want: ["This was paid. Refund $150 from your own Stripe."], pill: "Paid" },
  { id: "cancelled-refunded", patch: cancelledRefunded(15000), want: null, pill: "Refunded",
    note: "Refunded $150 in your Stripe on Friday, October 16" },
  { id: "cancelled-part-refunded", sel: "[data-refund-cancelled]", patch: cancelledRefunded(5000),
    want: ["This was paid. You refunded $50 in your Stripe, and $100 is not refunded yet.", "Refund the rest from your own Stripe."],
    note: "Refunded $50 in your Stripe on Friday, October 16", pill: "Part refunded" },
  { id: "cancelled-part-refunded-es", lang: "es", sel: "[data-refund-cancelled]", patch: cancelledRefunded(5000),
    want: ["Esto ya se pagó. Devolviste $50 en tu Stripe, y $100 todavía no se ha devuelto."],
    note: "Devolviste $50 en tu Stripe el viernes, 16 de octubre", pill: "Devuelto en parte" },
  { id: "cancelled-refunded-es", lang: "es", patch: cancelledRefunded(15000), want: null, pill: "Devuelto" },
  // ROADMAP 97.80 — a job that is NOT cancelled, its own card payment refunded in full: the pill says so too.
  { id: "own-refunded", patch: { ...PAID, stripe_payment_intent: "pi_1", payment_problem: refund(BASE_NOTE, "pi_1", 15000, 15000) }, want: null, pill: "Refunded" },
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
// --env-shim (97.80): a belt job copy's server has no app/.env.local, so the app it serves
// cannot reach Supabase ("Missing VITE_SUPABASE_URL") and nothing signs in. This writes the
// two public values the app reads (the URL and the anon key, both in the live bundle) from
// the loaded .env into each served module's `import.meta.env`, and only for THIS platform's
// project. The product code is served untouched otherwise.
if (process.argv.includes("--env-shim")) {
  const url = process.env.SUPABASE_URL ?? "", anon = process.env.SUPABASE_ANON_KEY ?? "";
  if (!url.includes("kguqylyzgyzfktkfnhjb") || !anon) { console.error("--env-shim needs SUPABASE_URL for kguqylyzgyzfktkfnhjb and SUPABASE_ANON_KEY loaded"); process.exit(2); }
  const inject = `import.meta.env = {"VITE_SUPABASE_URL": ${JSON.stringify(url)}, "VITE_SUPABASE_ANON_KEY": ${JSON.stringify(anon)}, `;
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (opts) => {
    const ctx = await newContext(opts);
    await ctx.route(/\/src\/.*\.(js|jsx|ts|tsx)(\?|$)/, async (route) => {
      // A fetch can reset when the view closes with a module still loading; retry, then let it go.
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

if (FREEZE_HAND && jobId) {
  const { freeze, differs } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
  const DIR = "C:/Users/rando/Downloads/claude/belt/shots/97.70";
  mkdirSync(DIR, { recursive: true });
  const before = FREEZE_HAND === "before";
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: state });
  await ctx.addInitScript(() => localStorage.setItem("dp.lang.app", "en"));
  const page = await ctx.newPage();
  await page.route("**/rest/v1/bookings?**", async (route) => {
    if (route.request().method() !== "GET" || !route.request().url().includes(jobId)) return route.continue();
    const res = await route.fetch();
    const body = await res.json().catch(() => null);
    const edit = (b) => (b && b.id === jobId ? { ...b, ...HAND } : b);
    await route.fulfill({ response: res, json: Array.isArray(body) ? body.map(edit) : edit(body) });
  });
  await page.goto(`${BASE}/job/${jobId}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".jobbar", { timeout: 30000 });
  await page.waitForTimeout(1200);
  await freeze(page, { out: `${DIR}/${FREEZE_HAND}.html`, label: before ? "Before" : "After",
    note: before
      ? "A $100 card payment came in for a $150 job, then the detailer marked the job paid by hand. The job says Paid and nothing else: the $100 card payment is never mentioned, even if the customer paid the full $150 in cash on top."
      : "The same job: still Paid, and a red line names the $100 card payment as a possible refund, with a note to ignore it if the detailer kept it as part of what the customer paid.",
    highlight: before ? ".pill.paid" : "[data-refund-maybe]" });
  if (!before) console.log(`differs: ${await differs(page, `${DIR}/before.html`, `${DIR}/after.html`)}`);
  console.log("text:", await page.locator("[data-payment-problem]").innerText().catch(() => "(none)"));
  await browser.close();
  process.exit(0);
}

if (FREEZE_LEFT && jobId) {
  const { freeze, differs } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
  const DIR = "C:/Users/rando/Downloads/claude/belt/shots/97.78";
  mkdirSync(DIR, { recursive: true });
  const before = FREEZE_LEFT === "before";
  for (const [place, patch, note] of [
    ["", HAND_PART, before
      ? "A $100 card payment was the wrong figure, the detailer marked the job paid, then refunded $50 of it in Stripe. The red line still names the whole $100 and says to refund it."
      : "The same job: the red line now says $50 was already refunded and names the $50 left."],
    ["-waived", WAIVED_PART, before
      ? "The same $100 payment on a job the detailer waived, with $50 already refunded in Stripe. The red line still names the whole $100."
      : "The same waived job: the red line says $50 was already refunded and names the $50 left."],
  ]) {
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
    await page.waitForSelector("[data-refund-maybe]", { timeout: 30000 });
    await page.waitForTimeout(1200);
    const out = `${DIR}/${FREEZE_LEFT}${place}.html`;
    await freeze(page, { out, label: before ? "Before" : "After", note, highlight: "[data-refund-maybe]" });
    if (!before) console.log(`differs${place}: ${await differs(page, `${DIR}/before${place}.html`, out)}`);
    console.log("text:", await page.locator("[data-refund-maybe]").innerText());
    await ctx.close();
  }
  await browser.close();
  process.exit(0);
}

// --freeze-pill=before|after: 97.80's review pairs at 390 (refunded in full, in part), no receipt.
const FREEZE_PILL = arg("freeze-pill");
if (FREEZE_PILL && jobId) {
  const { freeze, differs } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
  const DIR = "C:/Users/rando/Downloads/claude/belt/shots/97.80";
  mkdirSync(DIR, { recursive: true });
  const before = FREEZE_PILL === "before";
  for (const [place, patch, note] of [
    ["", cancelledRefunded(15000), before
      ? "A cancelled job whose $150 card payment the detailer refunded in full in Stripe: the money section says Refunded, but the pill at the top still says Paid in green."
      : "The same job: the pill now says Refunded, in a quiet outline, so a glance no longer reads the money as kept."],
    ["-part", cancelledRefunded(5000), before
      ? "A cancelled job with $50 of its $150 card payment refunded in Stripe: the pill still says Paid in green."
      : "The same job: the pill now says Part refunded, and the red line under it names the $100 left."],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: state, timezoneId: TZ });
    await ctx.clock.setFixedTime(new Date(NOW));
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
    const out = `${DIR}/${FREEZE_PILL}${place}.html`;
    await freeze(page, { out, label: before ? "Before" : "After", note, highlight: before ? ".pill.paid" : "[data-pay-pill]" });
    if (!before) console.log(`differs${place}: ${await differs(page, `${DIR}/before${place}.html`, out)}`);
    console.log("pills:", await page.locator(".pill").allInnerTexts());
    await ctx.close();
  }
  await browser.close();
  process.exit(0);
}

if (FREEZE_REFUND && jobId) {
  const { freeze, differs } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
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
  const pairs = [
    ["", "Before", "A cancelled job the detailer already refunded in full in their own Stripe: the job still tells them in red to refund $150.", CANCELLED, ".jobbar"],
    ["", "After", "The same cancelled job after Stripe reports the refund: the red line is gone, it still says Paid, and the money section says it was refunded.", cancelledRefunded(15000), "[data-own-refund]"],
    ["-partial", "Before", "The detailer refunded $50 of a cancelled $150 job in Stripe, but the job still says to refund the whole $150.", CANCELLED, ".jobbar"],
    ["-partial", "After", "The same job after Stripe reports the $50 refund: the red line names only the $100 still to refund.", cancelledRefunded(5000), "[data-refund-cancelled]"],
    ["-extra", "Before", "An extra $150 payment the detailer already refunded in Stripe: the job still tells them in red to refund it.", { ...PAID, payment_problem: EXTRA }, "[data-refund-owed]"],
    ["-extra", "After", "The same job after Stripe reports the refund: the red line is gone and the job stays Paid.", { ...PAID, payment_problem: REFUNDED }, ".pill.paid"],
  ].filter(([place, label]) => (!arg("pair") || place === `-${arg("pair")}`) && (!arg("side") || label.toLowerCase() === arg("side")));
  for (const [place, label, note, patch, highlight] of pairs) {
    const { ctx, page } = await open(patch);
    const out = `${FREEZE_REFUND}/${label.toLowerCase()}${place}.html`;
    await freeze(page, { out, label, note, highlight });
    if (label === "After") console.log(`differs${place}: ${await differs(page, `${FREEZE_REFUND}/before${place}.html`, out)}`);
    await ctx.close();
  }
  await browser.close();
  process.exit(0);
}

let discovered = 0, attempted = 0, completed = 0;
const probed = [];
for (const sc of jobId ? SCENARIOS : []) {
  for (const [w, h] of WIDTHS) {
    discovered++;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, storageState: state, timezoneId: TZ });
    await ctx.clock.setFixedTime(new Date(NOW));
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
    if (REWRITE) await page.route("**/src/components/BookingDetail.jsx*", async (route) => {
      const res = await route.fetch();
      const text = await res.text();
      hid = text.split(REWRITE[0]).length - 1;
      await route.fulfill({ response: res, body: text.replace(REWRITE[0], REWRITE[1]) + "\nwindow.__beltBreak = true;\n" });
    });
    attempted++;
    await page.goto(`${BASE}/job/${jobId}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".jobbar, .error-box, h1", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const tag = `${sc.id} @ ${w}x${h}`;
    check(`${tag} · the job's read was fed`, fed > 0, "page.route never matched the job read");
    if (REWRITE) check(`${tag} · the sabotage landed once and RAN`, hid === 1 && await page.evaluate(() => window.__beltBreak === true), `matched ${hid}`);
    const clock = await page.evaluate(() => [new Date().toISOString(), Intl.DateTimeFormat().resolvedOptions().timeZone]);
    check(`${tag} · the page's clock is frozen at ${NOW} in ${TZ}`, clock[0] === new Date(NOW).toISOString() && clock[1] === TZ, clock.join(" "));
    const sel = sc.want ? sc.sel ?? "[data-payment-problem]" : "[data-payment-problem], [data-refund-cancelled]";
    const note = await page.evaluate(() => document.querySelector("[data-own-refund]")?.innerText ?? null);
    const box = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      el.scrollIntoView({ block: "center" });
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { refundLines: el.querySelectorAll("[data-refund-owed]").length, text: el.innerText, left: r.left, right: r.right, width: r.width, vw: window.innerWidth, hit: !!hit && (hit === el || el.contains(hit)), color: getComputedStyle(el).color };
    }, sel);
    if (sc.want) {
      check(`${tag} · the red line is there`, !!box, BREAK ? "the old webhook marked it paid and recorded nothing" : "no [data-payment-problem]");
      if (box) {
        for (const s of sc.want) check(`${tag} · it says "${s.slice(0, 50)}"`, box.text.includes(s), box.text);
        for (const n of [].concat(sc.wantNot ?? [])) check(`${tag} · it does not say "${n}"`, !box.text.includes(n), box.text);
        if (sc.lines) check(`${tag} · ${sc.lines} refund lines, one per payment`, box.refundLines === sc.lines, `${box.refundLines} lines`);
        check(`${tag} · inside the screen`, box.left >= 0 && box.right <= box.vw + 0.5, `left ${box.left}, right ${box.right}, viewport ${box.vw}`);
        check(`${tag} · painted on top (hit test lands on it)`, box.hit);
      }
    } else {
      check(`${tag} · no red refund or payment-problem line`, !box, box?.text ?? "");
    }
    // ROADMAP 97.80: the payment pill. textContent, not innerText (docs/gotchas.md 115: CSS case).
    if (sc.pill) {
      const pill = await page.evaluate(() => { const el = document.querySelector("[data-pay-pill]"); return el && { text: el.textContent.trim(), paid: el.classList.contains("paid") }; });
      check(`${tag} · the payment pill says "${sc.pill}"`, pill?.text === sc.pill, JSON.stringify(pill));
      check(`${tag} · the pill is ${sc.pill === "Paid" ? "" : "NOT "}the green Paid one`, !!pill && pill.paid === (sc.pill === "Paid"), JSON.stringify(pill));
    }
    if (sc.note) check(`${tag} · the record says "${sc.note}"`, !!note?.includes(sc.note), String(note));
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
  dimensions: { base: BASE, job: jobId, frozen_now: NOW, browser_tz: TZ, business_tz: "America/Los_Angeles (the demo business)", widths: WIDTHS.map(([w, h]) => `${w}x${h}`), ...(BREAK ? { break: BREAK } : {}), env_shim: process.argv.includes("--env-shim"), probed },
  artifacts: [SHOTS],
  // The canary: a scenario that must NOT show the line (a paid job with no
  // problem; 97.70 made the stale-problem job SHOW one) is measured with the same probe, so a probe that finds the line
  // everywhere, or nowhere, cannot pass both halves.
  canary: BREAK ? { id: `break-${BREAK}`, observed_failure: failures.length > 0 } : { id: "clean-paid-job-hides-the-line", observed_failure: probed.filter((p) => p.scenario === "clean").every((p) => !p.shown) && probed.some((p) => p.scenario === "clean") },
});
console.log(`receipt: ${path}`);
process.exit(failures.length || completed !== EXPECTED ? 1 : 0);
