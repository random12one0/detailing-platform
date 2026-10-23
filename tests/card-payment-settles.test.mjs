// ROADMAP 97.10 — A CARD PAYMENT SETTLES A JOB ONLY IF THE MONEY ARRIVED AND
// IT IS THE FIGURE OWED.
//
// `stripe-webhook` marked a booking paid on `checkout.session.completed`
// without reading the session's own `payment_status` or its amount. This holds
// the fix three ways:
//
//   § 1  SIGNED FIXTURE EVENTS. Each event is signed with a test secret and
//        opened by the production `verifyWebhookAny`, then its `data.object` is
//        judged by the production `cardPaymentVerdict` — the function the
//        webhook calls. No Stripe call, no database, no credentials.
//   § 2  THE WEBHOOK'S ORDER: account check, then the verdict, then the paid
//        write; a refused verdict returns before that write and records the
//        problem in `payment_problem`, never in `payment_notes` (which is
//        printed on the customer's invoice).
//   § 3  THE CONNECTED-ACCOUNT CHECK IS BYTE-FOR-BYTE WHAT IT WAS at the commit
//        before this item (BASE below), read with `git show`.
//   § 4  The detailer can read it: the job record and its Spanish keys.
//
// SABOTAGE — an env var, never a flag (`docs/gotchas.md` 104):
//   BREAK=no-status   the verdict stops reading payment_status / status
//   BREAK=no-amount   the verdict stops comparing the amount
//   BREAK=no-guard    the webhook stops returning on a refused verdict
//   BREAK=account     the connected-account check is loosened (§ 3 must see it)
// Each edit is applied to a COPY of the production file and the run prints
// that the edit landed (`docs/gotchas.md` 102) before trusting either colour.

import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { receiptFile, writeReceipt } from "../scripts/receipt.mjs";

const root = new URL("../", import.meta.url);
const path = (p) => fileURLToPath(new URL(p, root));
const read = (p) => readFileSync(path(p), "utf8").replace(/\r\n/g, "\n");
const stripComments = (s) => s.replace(/^\s*\/\/.*$/gm, "");

const BASE = "3c5bf515"; // main, the commit before 97.10 began
const BREAK = process.env.BREAK || "";
const started_at = new Date().toISOString();

let passed = 0, assertions = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  assertions++;
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.error(`  FAIL  ${name}\n        ${detail}`); }
};

// ── The production modules, or a sabotaged copy of one ─────────────────────
let connectSrc = read("supabase/functions/_shared/connect.ts");
let hookSrc = read("supabase/functions/stripe-webhook/index.ts");
const sabotage = (src, from, to) => {
  const out = src.replace(from, to);
  if (out === src) { console.error(`BREAK=${BREAK} did not land — the edit matched nothing`); process.exit(2); }
  console.log(`BREAK=${BREAK} landed: ${src.length - out.length} characters removed`);
  return out;
};
if (BREAK === "no-status") connectSrc = sabotage(connectSrc, "if (!received) return { settle: false, problem: null };", "");
else if (BREAK === "no-amount") connectSrc = sabotage(connectSrc, "paid === owed && ", "");
else if (BREAK === "no-guard") hookSrc = sabotage(hookSrc, "if (!verdict.settle) {", "if (false) {");
else if (BREAK === "account") hookSrc = sabotage(hookSrc, "!conn?.stripe_account_id || conn.stripe_account_id !== account", "!conn?.stripe_account_id");
else if (BREAK) { console.error(`unknown BREAK=${BREAK}`); process.exit(2); }

let connectUrl = new URL("supabase/functions/_shared/connect.ts", root).href;
if (BREAK === "no-status" || BREAK === "no-amount") {
  mkdirSync(path(".tmp-97.10/"), { recursive: true });
  writeFileSync(path(".tmp-97.10/connect.ts"), connectSrc);
  connectUrl = pathToFileURL(path(".tmp-97.10/connect.ts")).href;
}
const { cardPaymentVerdict } = await import(connectUrl);
const { verifyWebhookAny } = await import("../supabase/functions/_shared/stripe.ts");

// ── § 1 — signed fixture events ────────────────────────────────────────────
console.log("\n§ 1 — signed fixture events, judged by the production verdict");
const SECRET = "whsec_fixture_97_10";
const sign = async (payload, t) => {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
};
const deliver = async (type, object) => {
  const body = JSON.stringify({ id: `evt_${Math.random().toString(36).slice(2)}`, type, account: "acct_fixture", data: { object } });
  const t = Math.floor(Date.now() / 1000);
  const event = await verifyWebhookAny(body, `t=${t},v1=${await sign(body, t)}`, [SECRET]);
  return { type: String(event.type), object: event.data.object };
};
const session = (o) => ({ object: "checkout.session", metadata: { booking_id: "b1" }, payment_intent: "pi_1", currency: "usd", ...o });
const intent = (o) => ({ object: "payment_intent", id: "pi_1", metadata: { booking_id: "b1" }, currency: "usd", ...o });
const OWED_150 = { total_price: "150.00", final_amount: null, payment_status: "pending" };

// [name, type, object, booking, expected: "settle" | "leave" | "amount" | "currency"]
const CASES = [
  ["R2 · completed session still unpaid (bank transfer pending)", "checkout.session.completed", session({ payment_status: "unpaid", amount_total: 15000 }), OWED_150, "leave"],
  ["R2 · completed session with no payment_status at all", "checkout.session.completed", session({ amount_total: 15000 }), OWED_150, "leave"],
  ["R3 · paid $1.00 on a $150 job", "checkout.session.completed", session({ payment_status: "paid", amount_total: 100 }), OWED_150, "amount"],
  ["R3 · paid $200 on a $150 job (overpaid also differs)", "checkout.session.completed", session({ payment_status: "paid", amount_total: 20000 }), OWED_150, "amount"],
  ["R3 · right number, wrong currency (EUR)", "checkout.session.completed", session({ payment_status: "paid", amount_total: 15000, currency: "eur" }), OWED_150, "currency"],
  ["R3 · the quote paid after the detailer agreed $120", "checkout.session.completed", session({ payment_status: "paid", amount_total: 15000 }), { ...OWED_150, final_amount: "120.00" }, "amount"],
  ["R4 · paid exactly $150", "checkout.session.completed", session({ payment_status: "paid", amount_total: 15000 }), OWED_150, "settle"],
  ["R4 · paid the agreed $120 (final_amount wins)", "checkout.session.completed", session({ payment_status: "paid", amount_total: 12000 }), { ...OWED_150, final_amount: "120.00" }, "settle"],
  ["R4 · $19.99 rounds to 1999 cents, not 1998", "checkout.session.completed", session({ payment_status: "paid", amount_total: 1999 }), { total_price: "19.99" }, "settle"],
  ["intent · succeeded for $150", "payment_intent.succeeded", intent({ status: "succeeded", amount_received: 15000 }), OWED_150, "settle"],
  ["intent · still processing", "payment_intent.succeeded", intent({ status: "processing", amount_received: 0 }), OWED_150, "leave"],
  ["intent · succeeded for $1.00 on a $150 job", "payment_intent.succeeded", intent({ status: "succeeded", amount_received: 100 }), OWED_150, "amount"],
];
const EXPECTED = CASES.length;
let discovered = 0, attempted = 0, completed = 0;
const probed = [];
for (const [name, type, object, booking, want] of CASES) {
  discovered++;
  attempted++;
  const ev = await deliver(type, object);
  const v = cardPaymentVerdict(ev.type, ev.object, booking);
  const got = v.settle ? "settle" : v.problem ? v.problem.kind : "leave";
  probed.push({ name, want, got });
  check(name, got === want, `expected ${want}, got ${got}`);
  if (want === "amount" || want === "currency") {
    check(`${name} — the problem names both figures`,
      v.problem && Number.isFinite(v.problem.paid_cents) && v.problem.owed_cents > 0 && typeof v.problem.at === "string",
      JSON.stringify(v.problem));
  }
  completed++;
}
check(`all ${EXPECTED} fixtures reached the verdict`, completed === EXPECTED, `${completed} of ${EXPECTED}`);

// The fixture really is signed: a tampered body must not open. This is the
// clean run's canary — a planted defect the check has to catch.
let tamperRefused = false;
{
  const body = JSON.stringify({ id: "evt_t", type: "checkout.session.completed", data: { object: session({ payment_status: "paid", amount_total: 100 }) } });
  const t = Math.floor(Date.now() / 1000);
  const header = `t=${t},v1=${await sign(body, t)}`;
  let refused = false;
  try { await verifyWebhookAny(body.replace('"amount_total":100', '"amount_total":15000'), header, [SECRET]); } catch { refused = true; }
  tamperRefused = refused;
  check("a fixture whose amount was edited after signing is refused", refused);
}

// ── § 2 — the webhook's order ──────────────────────────────────────────────
console.log("\n§ 2 — the webhook asks the verdict between the account check and the paid write");
const hook = stripComments(hookSrc);
const fn = hook.slice(hook.indexOf("async function handleConnected"));
const accountAt = fn.indexOf("conn.stripe_account_id !== account");
const settledAt = fn.indexOf('if (booking.payment_status === "paid" || booking.payment_status === "waived") return;');
const verdictAt = fn.indexOf("cardPaymentVerdict(type, object, booking)");
const guardAt = fn.indexOf("if (!verdict.settle) {");
const writeAt = fn.indexOf('payment_status: "paid",');
check("the handler and its landmarks were found", fn.length > 500 && [accountAt, settledAt, verdictAt, writeAt].every((i) => i > 0),
  `account ${accountAt}, settled ${settledAt}, verdict ${verdictAt}, write ${writeAt}`);
check("account check → settled guard → verdict → refused-guard → paid write",
  accountAt < settledAt && settledAt < verdictAt && verdictAt < guardAt && guardAt < writeAt && guardAt > 0,
  `account ${accountAt}, settled ${settledAt}, verdict ${verdictAt}, guard ${guardAt}, write ${writeAt}`);
const refusedBranch = guardAt > 0 ? fn.slice(guardAt, writeAt) : "";
check("a refused verdict returns before the paid write", /\n\s*return;\n\s*\}/.test(refusedBranch), refusedBranch.slice(0, 120));
// ROADMAP 97.11 (supervision 2026-10-17): added to the note already on the job, never written over it.
check("and records why in payment_problem, added to what is already there",
  /\.update\(\{ payment_problem: keepReasons\(\{ \.\.\.verdict\.problem, intent \}, row\?\.payment_problem/.test(refusedBranch));
check("never in payment_notes (printed on the customer's invoice)", !/payment_notes/.test(fn));
check("the read carries both amounts the verdict needs",
  /\.select\("id, business_id, payment_status, stripe_payment_intent, total_price, final_amount"\)/.test(fn));

// ── § 3 — the connected-account check is unchanged ─────────────────────────
console.log(`\n§ 3 — the connected-account check is byte-for-byte what it was at ${BASE}`);
const accountBlock = (src) => {
  const a = src.indexOf('const { data: conn } = await supabase\n    .from("connected_accounts")');
  const b = src.indexOf("\n  }\n", src.indexOf("conn.stripe_account_id !== account"));
  return a > 0 && b > a ? src.slice(a, b + 4) : "";
};
let baseSrc = "";
try { baseSrc = execSync(`git show ${BASE}:supabase/functions/stripe-webhook/index.ts`, { cwd: path("./"), encoding: "utf8" }).replace(/\r\n/g, "\n"); }
catch (e) { console.error(`  could not read ${BASE}: ${e.message}`); }
const was = accountBlock(baseSrc), now = accountBlock(hookSrc);
check("the block was found at BASE and now", was.length > 200 && now.length > 200, `base ${was.length} chars, now ${now.length}`);
check("and it is identical", was === now && was.length > 0);

// ── § 4 — the detailer can read it ─────────────────────────────────────────
console.log("\n§ 4 — the job record shows the problem, in English and Spanish");
const detail = read("app/src/components/BookingDetail.jsx");
const es = read("app/src/lib/strings/appEs.js");
const LINES = [
  "A card payment of {paid} came in, but this job is owed {owed}. We did not mark it paid. Check the payment in your Stripe account.",
  "A card payment came in, but not in US dollars. We did not mark this job paid. Check the payment in your Stripe account.",
];
for (const line of LINES) {
  check(`the record says: "${line.slice(0, 48)}…"`, detail.includes(`"${line}"`));
  check("  and it has a Spanish key", es.includes(`"${line}":`));
}
check("the record reads payment_problem", /booking\.payment_problem/.test(detail));
const migration = read("supabase/migrations/20261016160000_booking_payment_problem.sql");
check("a migration adds the column", /add column if not exists payment_problem jsonb/.test(migration));

// ── Receipt ────────────────────────────────────────────────────────────────
const failed = failures.length;
console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions, ${completed} of ${EXPECTED} fixtures.`);
// The canary: a run with a sabotage switched on must go red. On a clean run
// the canary is the tampered-signature fixture in § 1, which must be refused.
const canary = BREAK
  ? { id: `break-${BREAK}`, observed_failure: failed > 0 }
  : { id: "tampered-fixture-refused", observed_failure: tamperRefused };
// A text log a person can read, one per run, so a sabotage never overwrites the clean one.
const logName = receiptFile(`card-payment-settles${BREAK ? `-${BREAK}.sabotage` : ""}.txt`);
writeFileSync(path(logName), [
  `card-payment-settles${BREAK ? ` BREAK=${BREAK}` : ""} — ${new Date().toISOString()}`,
  ...probed.map((p) => `${p.got === p.want ? "ok  " : "FAIL"}  ${p.name}: want ${p.want}, got ${p.got}`),
  ...failures.map((f) => `FAIL  ${f}`),
  `${passed} passed, ${failed} failed, ${assertions} assertions, ${completed} of ${EXPECTED} fixtures.`,
].join("\n") + "\n");
const { path: receiptPath } = writeReceipt({
  // One sabotage receipt per switch, so a later break never overwrites an earlier one.
  check_id: BREAK ? `card-payment-settles-${BREAK}` : "card-payment-settles",
  started_at,
  status: failed ? "fail" : "pass",
  expected_targets: EXPECTED,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 30,
  failures,
  dimensions: { base: BASE, ...(BREAK ? { break: BREAK } : {}), probed },
  artifacts: [logName],
  canary,
});
console.log(`receipt: ${receiptPath}`);
if (BREAK) console.log(failed ? `BREAK=${BREAK} caught (${failed} failed)` : `BREAK=${BREAK} NOT caught`);
process.exit(failed ? 1 : 0);
