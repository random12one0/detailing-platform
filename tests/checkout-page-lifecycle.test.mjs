// ROADMAP 97.11 — A LATE BANK PAYMENT, A STALE CHECKOUT PAGE, A SECOND PAYMENT.
//
// This RUNS the production `stripe-webhook` and `pay-booking` handlers rather
// than reading them. Each file is type-stripped into `.tmp-97.11/`, its
// `_shared` imports are swapped for an in-memory database and a stubbed Stripe
// client, and `Deno.serve`'s handler is called with a real Request. The
// signature check (`verifyWebhookAny`) and the money rules (`_shared/connect.ts`)
// are the production modules. No network, no credentials, no database.
//
//   § 1  R2  signed `async_payment_succeeded` / `async_payment_failed` fixtures
//   § 2  R4  money for a job already paid or waived is recorded as a refund owed
//   § 3  R3  `pay-booking` against a stubbed Stripe: an open page at another
//            amount is expired BEFORE the new one is made
//   § 4  97.68  signed `charge.refunded` fixtures: a refund made in the
//            detailer's own Stripe takes that payment off the refund-owed list
//
// SABOTAGE — an env var, never a flag (`docs/gotchas.md` 104). Each edit is made
// to a COPY, and the run prints that it landed (`docs/gotchas.md` 102):
//   BREAK=no-async      the webhook stops taking the two late events
//   BREAK=no-unpay      a failed bank payment no longer un-pays the job it paid
//   BREAK=drop-extras   a new note no longer carries the refunds already owed (review finding, 2026-10-16)
//   BREAK=overwrite-amount  the wrong-amount write replaces the note wholesale again (supervision, 2026-10-17)
//   BREAK=overwrite-failed  a failed bank payment on an unpaid job replaces the note wholesale again (same)
//   BREAK=dup-reason    one payment's two events add the same reason twice
//   BREAK=no-cover      a recorded extra payment that covers the job is not allowed to settle it
//   BREAK=silent-extra  money for a settled job is dropped again (the original defect)
//   BREAK=no-dedupe     one extra payment's two events are counted twice
//   BREAK=no-expire     the stale page is left open when a new one is made
//   BREAK=no-reuse      an open page at the same amount is replaced, not reused
//   BREAK=no-carry      a wrong-amount payment is left hidden when the job is then paid (97.69, the original defect)
//   BREAK=no-refund     the webhook stops taking `charge.refunded` (97.68's original defect)
//   BREAK=refund-any-account  a refund from ANOTHER detailer's account clears the job's refund
//   BREAK=refund-partial-clears  a partial refund counts as the whole payment refunded
//   BREAK=refund-shrinks  an older event's smaller refund total overwrites a larger one (review, 2026-10-17)
//   BREAK=refund-early-dropped  a refund arriving before its payment's own event is dropped (review, 2026-10-17, the original defect)
//   BREAK=refund-lost-keep    a new note written over the row loses the refunds recorded on it
//   BREAK=refund-lost-settle  the settle write (97.69) loses the refunds recorded on the job
//   BREAK=refund-covers       a partly refunded extra payment still counts as covering the job when its own debit fails
//
//   node tests/checkout-page-lifecycle.test.mjs          (or node --test …)
//   BREAK=no-expire node tests/checkout-page-lifecycle.test.mjs

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire, stripTypeScriptTypes } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeReceipt } from "../scripts/receipt.mjs";

const root = new URL("../", import.meta.url);
const path = (p) => fileURLToPath(new URL(p, root));
const read = (p) => readFileSync(path(p), "utf8").replace(/\r\n/g, "\n");
const TMP = path(".tmp-97.11/");
mkdirSync(TMP, { recursive: true });
const BREAK = process.env.BREAK || "";
const started_at = new Date().toISOString();

let passed = 0, assertions = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  assertions++;
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.error(`  FAIL  ${name}\n        ${detail}`); }
};

// ── Sources, sabotaged on a copy when asked ────────────────────────────────
const src = {
  connect: read("supabase/functions/_shared/connect.ts"),
  hook: read("supabase/functions/stripe-webhook/index.ts"),
  pay: read("supabase/functions/pay-booking/index.ts"),
};
const SABOTAGE = {
  "no-async": ["hook", '\n    && type !== "checkout.session.async_payment_succeeded" && type !== "checkout.session.async_payment_failed") return;', ") return;"],
  "no-unpay": ["connect", "const ours = booking.stripe_payment_intent === intent;", "const ours = false;"],
  "drop-extras": ["connect", "const payments = next.payments ?? existing?.payments;", "const payments = next.payments;"],
  "overwrite-amount": ["hook", "keepReasons({ ...verdict.problem, intent }, row?.payment_problem as PaymentProblem | null)", "verdict.problem"],
  "overwrite-failed": ["connect", ": { payment_problem: kept };", ": { payment_problem: problem };"],
  "dup-reason": ["connect", ".filter((r) => !(next.intent && r.intent === next.intent && r.kind === next.kind))", ""],
  "no-cover": ["connect", "if (cover) {", "if (false) {"],
  "silent-extra": ["hook", "if (settled) await recordExtraPayment(type, object, intent, booking);", ""],
  "no-dedupe": ["connect", "if (earlier.some((p) => p.intent === intent)) return null;", ""],
  "no-expire": ["connect", "await call(`/checkout/sessions/${o.previousId}/expire`, {}, {", "void ({"],
  "no-reuse": ["connect", "if (Number(previous.amount_total) === o.amountCents) {", "if (false) {"],
  "no-carry": ["hook", "...(owedBack ? { payment_problem: owedBack } : {}),", ""],
  "no-refund": ["hook", '  if (type === "charge.refunded") return await chargeRefunded(object, account);\n', ""],
  "refund-any-account": ["hook", 'if (!conn?.stripe_account_id || conn.stripe_account_id !== account) {\n    console.error("refund for', 'if (false) {\n    console.error("refund for'],
  "refund-partial-clears": ["connect", "const refunded = Math.min(Math.max(Number(charge.amount_refunded) || 0, 0), paid);", "const refunded = paid;"],
  "refund-shrinks": ["connect", "if (!intent || refunded <= was) return undefined;", "if (!intent || refunded === was) return undefined;"],
  "refund-early-dropped": ["hook", '    ...(typeof bookingId === "string" && bookingId ? [() => live().eq("id", bookingId)] : []),\n', ""],
  "refund-lost-keep": ["connect", "const refunds = next.refunds ?? existing?.refunds;", "const refunds = next.refunds;"],
  "refund-lost-settle": ["connect", ", ...(existing.refunds ? { refunds: existing.refunds } : {}) };", " };"],
  "refund-covers": ["connect", "&& !refundedCents(existing, p.intent)) : undefined;", ") : undefined;"],
};
if (BREAK) {
  const s = SABOTAGE[BREAK];
  if (!s) { console.error(`unknown BREAK=${BREAK}`); process.exit(2); }
  const [file, from, to] = s;
  if (src[file].split(from).length !== 2) { console.error(`BREAK=${BREAK} did not land — the edit must match exactly once`); process.exit(2); }
  src[file] = src[file].replace(from, to);
  console.log(`BREAK=${BREAK} landed in ${file}: ${from.length - to.length} characters removed`);
}
writeFileSync(`${TMP}connect.ts`, src.connect);
const connect = await import(pathToFileURL(`${TMP}connect.ts`).href + `?${Date.now()}`);
const realStripe = await import("../supabase/functions/_shared/stripe.ts");

// ── An in-memory database with the query shapes the two handlers use ──────
const db = { tables: {} };
const supabase = {
  from(t) {
    const q = { t, op: "select", filters: [], patch: null, single: false };
    const b = {
      select() { return b; },
      insert(row) { q.op = "insert"; q.patch = row; return b; },
      update(p) { q.op = "update"; q.patch = p; return b; },
      delete() { q.op = "delete"; return b; },
      eq(c, v) { q.filters.push((r) => r[c] === v); return b; },
      is(c, v) { q.filters.push((r) => (r[c] ?? null) === v); return b; },
      // jsonb `@>` (PostgREST `cs`): every key of `v` is in the column, an array element matched by any element.
      contains(c, v) { q.filters.push((r) => within(v, r[c])); return b; },
      maybeSingle() { q.single = true; return b; },
      then(ok, bad) { return Promise.resolve(run(q)).then(ok, bad); },
    };
    return b;
  },
};
const within = (want, have) => Array.isArray(want)
  ? Array.isArray(have) && want.every((w) => have.some((h) => within(w, h)))
  : want && typeof want === "object"
  ? !!have && typeof have === "object" && Object.entries(want).every(([k, w]) => within(w, have[k]))
  : want === have;
function run(q) {
  const rows = (db.tables[q.t] ??= []);
  const hit = rows.filter((r) => q.filters.every((f) => f(r)));
  if (q.op === "insert") {
    if (rows.some((r) => r.id === q.patch.id)) return { error: { code: "23505", message: "duplicate" } };
    rows.push({ ...q.patch });
    return { error: null };
  }
  if (q.op === "update") {
    // bookings_stripe_payment_intent_key: the same intent on ANOTHER row is refused.
    const pi = q.patch.stripe_payment_intent;
    if (pi && rows.some((r) => r.stripe_payment_intent === pi && !hit.includes(r))) return { error: { code: "23505", message: "duplicate intent" } };
    for (const r of hit) Object.assign(r, structuredClone(q.patch));
    return { error: null };
  }
  if (q.op === "delete") { db.tables[q.t] = rows.filter((r) => !hit.includes(r)); return { error: null }; }
  const data = hit.map((r) => structuredClone(r));
  return { data: q.single ? data[0] ?? null : data, error: null };
}

// ── A stubbed Stripe client: records every call, answers from a script ────
let stripeCalls = [];
let stripeAnswer = () => ({});
const stubStripe = async (p, body, opts = {}) => {
  const call = { path: p, method: opts.method ?? (body ? "POST" : "GET"), body, opts };
  stripeCalls.push(call);
  return stripeAnswer(call);
};

// ── Load a production edge function with its imports replaced ─────────────
const ENV = { STRIPE_WEBHOOK_SECRET: "whsec_fixture_97_11" };
let served = null;
globalThis.Deno = { env: { get: (k) => ENV[k] }, serve: (h) => { served = h; } };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const FAKES = {
  db: { supabase },
  http: { json, preflight: () => new Response(null, { status: 204 }) },
  rateLimit: { ipOf: () => "203.0.113.9", LIMITS: { publicCeiling: {} }, withinLimits: async () => true },
  config: { PLATFORM_URL: "https://platform.test", receiptUrl: (_s, id) => `https://site.test/receipt/${id}` },
  stripe: { ...realStripe, stripe: stubStripe, stripeConfigured: () => true },
  platformBilling: { ourStatus: () => null },
  email: { recipientLang: async () => "en", sendTenantEmail: async () => {} },
  platformBrand: { platformBrand: () => ({}), PLATFORM_NAME: "Platform" },
  emailTemplates: { billingEmail: () => ({}) },
  tenant: { businessById: async (id) => ({ id, name: "Ridgeline Auto Detail", status: "active", timezone: "America/Los_Angeles" }) },
  tenantSite: { siteFor: async () => ({}) },
  connect,
};
globalThis.__fakes97_11 = FAKES;
let unknownImports = [];
async function load(name, source) {
  let js = stripTypeScriptTypes(source);
  js = js.replace(/^import "jsr:[^"]+";\s*$/m, "");
  js = js.replace(/^import \{([^}]*)\} from "\.\.\/_shared\/(\w+)\.ts";\s*$/gm, (_m, names, mod) => {
    if (!FAKES[mod]) unknownImports.push(`${name}: ${mod}`);
    const list = names.split(",").map((n) => n.trim()).filter(Boolean).map((n) => n.replace(/\s+as\s+/, ": ")).join(", ");
    return `const { ${list} } = globalThis.__fakes97_11[${JSON.stringify(mod)}];`;
  });
  if (/^import /m.test(js)) unknownImports.push(`${name}: an import was not replaced`);
  served = null;
  const file = `${TMP}${name}.mjs`;
  writeFileSync(file, js);
  await import(pathToFileURL(file).href + `?${Date.now()}`);
  return served;
}
const hook = await load("stripe-webhook", src.hook);
const pay = await load("pay-booking", src.pay);
check("both production handlers loaded with every import replaced",
  typeof hook === "function" && typeof pay === "function" && unknownImports.length === 0, unknownImports.join(" | "));

// ── Signed fixture events, posted to the webhook ──────────────────────────
const sign = async (payload, t) => {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(ENV.STRIPE_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  return [...new Uint8Array(mac)].map((x) => x.toString(16).padStart(2, "0")).join("");
};
let evtN = 0;
const deliver = async (type, object, account = "acct_ridgeline") => {
  const body = JSON.stringify({ id: `evt_${++evtN}`, type, account, api_version: realStripe.API_VERSION, data: { object } });
  const t = Math.floor(Date.now() / 1000);
  const res = await hook(new Request("https://hook.test/", { method: "POST", headers: { "Stripe-Signature": `t=${t},v1=${await sign(body, t)}` }, body }));
  return res.status;
};
const session = (pi, o) => ({ object: "checkout.session", id: `cs_${pi}`, metadata: { booking_id: "b1" }, payment_intent: pi, currency: "usd", amount_total: 15000, ...o });
const intent = (pi, o) => ({ object: "payment_intent", id: pi, metadata: { booking_id: "b1" }, currency: "usd", status: "succeeded", amount_received: 15000, ...o });
const job = (o) => ({ id: "b1", business_id: "biz1", status: "confirmed", payment_status: "pending", total_price: "150.00", final_amount: null,
  stripe_payment_intent: null, paid_online_at: null, payment_problem: null, deleted_at: null, stripe_session_id: null,
  start_at: "2026-10-20T17:00:00Z", customer_email: "c@example.com", customer_name: "Casey", ...o });
const fresh = (booking) => {
  db.tables = {
    bookings: [booking],
    connected_accounts: [{ business_id: "biz1", stripe_account_id: "acct_ridgeline", charges_enabled: true, card_payments_enabled: true }],
    stripe_events: [],
  };
};
const row = () => db.tables.bookings[0];

// [name, starting job, events [[type, object, account?]], expect(row) → [ok, detail]]
const WEBHOOK = [
  ["R2 · bank payment arrives late: async_payment_succeeded marks the job paid",
    job(), [["checkout.session.async_payment_succeeded", session("pi_1", { payment_status: "paid" })]],
    (r) => [r.payment_status === "paid" && r.stripe_payment_intent === "pi_1" && !!r.paid_online_at, `${r.payment_status} ${r.stripe_payment_intent}`]],
  ["R2 · late success for the wrong figure still answers to 97.10 (stays unpaid, amount named)",
    job(), [["checkout.session.async_payment_succeeded", session("pi_1", { payment_status: "paid", amount_total: 10000 })]],
    (r) => [r.payment_status === "pending" && r.payment_problem?.kind === "amount" && r.payment_problem.paid_cents === 10000, JSON.stringify(r.payment_problem)]],
  ["R2 · a failed bank debit the OLD webhook marked paid goes back to unpaid, with the reason",
    job({ payment_status: "paid", stripe_payment_intent: "pi_1", paid_online_at: "2026-10-16T10:00:00Z" }),
    [["checkout.session.async_payment_failed", session("pi_1", { payment_status: "unpaid" })]],
    (r) => [r.payment_status === "pending" && r.stripe_payment_intent === null && r.paid_online_at === null
      && r.payment_problem?.kind === "failed" && r.payment_problem.paid_cents === 15000 && r.payment_problem.owed_cents === 15000,
      `${r.payment_status} ${r.stripe_payment_intent} ${JSON.stringify(r.payment_problem)}`]],
  ["R2 · a failed bank debit on an unpaid job stays unpaid and says why",
    job(), [["checkout.session.async_payment_failed", session("pi_1", { payment_status: "unpaid" })]],
    (r) => [r.payment_status === "pending" && r.payment_problem?.kind === "failed", `${r.payment_status} ${JSON.stringify(r.payment_problem)}`]],
  ["R2 · refused: a failed bank debit does not touch a job the detailer marked paid in cash",
    job({ payment_status: "paid" }), [["checkout.session.async_payment_failed", session("pi_9", { payment_status: "unpaid" })]],
    (r) => [r.payment_status === "paid" && r.payment_problem === null, `${r.payment_status} ${JSON.stringify(r.payment_problem)}`]],
  ["R2 · refused: a late event from ANOTHER detailer's account changes nothing",
    job(), [["checkout.session.async_payment_succeeded", session("pi_1", { payment_status: "paid" }), "acct_stranger"]],
    (r) => [r.payment_status === "pending" && r.payment_problem === null, `${r.payment_status} ${JSON.stringify(r.payment_problem)}`]],
  ["R4 · a card payment after the detailer marked cash: still paid, refund owed recorded",
    job({ payment_status: "paid" }), [["checkout.session.completed", session("pi_2", { payment_status: "paid" })]],
    (r) => [r.payment_status === "paid" && r.payment_problem?.kind === "extra" && r.payment_problem.payments?.length === 1
      && r.payment_problem.payments[0].intent === "pi_2" && r.payment_problem.paid_cents === 15000, JSON.stringify(r.payment_problem)]],
  ["R4 · a second live page paid: its two events make ONE refund entry, not two",
    job({ payment_status: "paid", stripe_payment_intent: "pi_1" }),
    [["checkout.session.completed", session("pi_2", { payment_status: "paid" })], ["payment_intent.succeeded", intent("pi_2")]],
    (r) => [r.payment_problem?.kind === "extra" && r.payment_problem.payments?.length === 1 && r.payment_problem.paid_cents === 15000, JSON.stringify(r.payment_problem)]],
  ["R4 · a third payment is added to the list, never written over the second",
    job({ payment_status: "paid", stripe_payment_intent: "pi_1" }),
    [["checkout.session.completed", session("pi_2", { payment_status: "paid" })], ["checkout.session.completed", session("pi_3", { payment_status: "paid", amount_total: 10000 })]],
    (r) => [r.payment_problem?.payments?.map((p) => p.intent).join(",") === "pi_2,pi_3" && r.payment_problem.paid_cents === 25000, JSON.stringify(r.payment_problem)]],
  ["R4 · review fix: a failed debit on a job a recorded $150 card payment covers — that payment settles it, no refund left",
    job({ payment_status: "paid", stripe_payment_intent: "pi_1", paid_online_at: "2026-10-16T10:00:00Z",
      payment_problem: { kind: "extra", paid_cents: 15000, owed_cents: 0, currency: "usd", at: "x", payments: [{ intent: "pi_2", paid_cents: 15000, currency: "usd", at: "x" }] } }),
    [["checkout.session.async_payment_failed", session("pi_1", { payment_status: "unpaid" })]],
    (r) => [r.payment_status === "paid" && r.stripe_payment_intent === "pi_2" && r.payment_problem === null,
      `${r.payment_status} ${r.stripe_payment_intent} ${JSON.stringify(r.payment_problem)}`]],
  ["R4 · review fix: an extra payment that does NOT cover the job is carried onto the failed note, never erased",
    job({ payment_status: "paid", stripe_payment_intent: "pi_1",
      payment_problem: { kind: "extra", paid_cents: 10000, owed_cents: 0, currency: "usd", at: "x", payments: [{ intent: "pi_2", paid_cents: 10000, currency: "usd", at: "x" }] } }),
    [["checkout.session.async_payment_failed", session("pi_1", { payment_status: "unpaid" })]],
    (r) => [r.payment_status === "pending" && r.payment_problem?.kind === "failed" && r.payment_problem.payments?.map((x) => x.intent).join() === "pi_2",
      `${r.payment_status} ${JSON.stringify(r.payment_problem)}`]],
  ["R4 · review fix: with two extras, the one that covers settles the job and the other stays owed back",
    job({ payment_status: "paid", stripe_payment_intent: "pi_1",
      payment_problem: { kind: "extra", paid_cents: 25000, owed_cents: 0, currency: "usd", at: "x", payments: [
        { intent: "pi_2", paid_cents: 15000, currency: "usd", at: "x" }, { intent: "pi_3", paid_cents: 10000, currency: "usd", at: "x" }] } }),
    [["checkout.session.async_payment_failed", session("pi_1", { payment_status: "unpaid" })]],
    (r) => [r.payment_status === "paid" && r.stripe_payment_intent === "pi_2" && r.payment_problem?.kind === "extra"
      && r.payment_problem.payments?.map((x) => x.intent).join() === "pi_3" && r.payment_problem.paid_cents === 10000,
      `${r.payment_status} ${r.stripe_payment_intent} ${JSON.stringify(r.payment_problem)}`]],
  // Supervision 2026-10-17: a reason is ADDED to the job's note, never written over it.
  ["keep both · refund owed, then the bank debit fails, then a wrong-amount payment: all three survive",
    job({ payment_status: "paid", stripe_payment_intent: "pi_1", paid_online_at: "2026-10-16T10:00:00Z" }),
    [["checkout.session.completed", session("pi_2", { payment_status: "paid", amount_total: 10000 })],
      ["checkout.session.async_payment_failed", session("pi_1", { payment_status: "unpaid" })],
      ["checkout.session.completed", session("pi_3", { payment_status: "paid", amount_total: 12000 })]],
    (r) => [r.payment_status === "pending" && r.payment_problem?.kind === "amount" && r.payment_problem.paid_cents === 12000
      && r.payment_problem.earlier?.map((x) => `${x.kind}:${x.intent}`).join() === "failed:pi_1"
      && r.payment_problem.payments?.map((x) => x.intent).join() === "pi_2", JSON.stringify(r.payment_problem)]],
  ["keep both · a wrong-amount payment, then an unrelated bank debit fails: the wrong-amount note survives",
    job(), [["checkout.session.completed", session("pi_1", { payment_status: "paid", amount_total: 10000 })],
      ["checkout.session.async_payment_failed", session("pi_2", { payment_status: "unpaid" })]],
    (r) => [r.payment_status === "pending" && r.payment_problem?.kind === "failed" && r.payment_problem.intent === "pi_2"
      && r.payment_problem.earlier?.length === 1 && r.payment_problem.earlier[0].kind === "amount"
      && r.payment_problem.earlier[0].paid_cents === 10000 && r.payment_problem.earlier[0].intent === "pi_1", JSON.stringify(r.payment_problem)]],
  ["keep both · money for a job settled in cash keeps the older wrong-amount note beside the refund",
    job({ payment_status: "paid", payment_problem: { kind: "amount", paid_cents: 10000, owed_cents: 15000, currency: "usd", at: "x", intent: "pi_1" } }),
    [["checkout.session.completed", session("pi_2", { payment_status: "paid" })]],
    (r) => [r.payment_problem?.kind === "extra" && r.payment_problem.payments?.map((x) => x.intent).join() === "pi_2"
      && r.payment_problem.earlier?.map((x) => `${x.kind}:${x.intent}`).join() === "amount:pi_1", JSON.stringify(r.payment_problem)]],
  ["refused: one wrong-amount payment's two events note it ONCE, not as two reasons",
    job(), [["checkout.session.completed", session("pi_1", { payment_status: "paid", amount_total: 10000 })],
      ["payment_intent.succeeded", intent("pi_1", { amount_received: 10000 })]],
    (r) => [r.payment_problem?.kind === "amount" && r.payment_problem.earlier === undefined, JSON.stringify(r.payment_problem)]],
  // ROADMAP 97.69 — a wrong-amount payment, then the job is paid: the first payment is a refund owed.
  ["97.69 · a $100 card payment on a $150 job, then the right $150 payment: paid, and the $100 is a refund owed",
    job(), [["checkout.session.completed", session("pi_1", { payment_status: "paid", amount_total: 10000 })],
      ["checkout.session.completed", session("pi_2", { payment_status: "paid" })]],
    (r) => [r.payment_status === "paid" && r.stripe_payment_intent === "pi_2" && r.payment_problem?.kind === "extra"
      && r.payment_problem.paid_cents === 10000 && r.payment_problem.earlier === undefined
      && r.payment_problem.payments?.map((x) => `${x.intent}:${x.paid_cents}:${x.reason}`).join() === "pi_1:10000:amount", JSON.stringify(r.payment_problem)]],
  ["97.69 · a payment in the wrong currency, then the right one: the first is a refund owed, named as a currency problem",
    job(), [["payment_intent.succeeded", intent("pi_1", { currency: "eur" })], ["payment_intent.succeeded", intent("pi_2")]],
    (r) => [r.payment_status === "paid" && r.payment_problem?.payments?.map((x) => `${x.intent}:${x.currency}:${x.reason}`).join() === "pi_1:eur:currency",
      JSON.stringify(r.payment_problem)]],
  ["97.69 · the wrong payment's own late second event, after the job is paid, does not owe it back twice",
    job(), [["checkout.session.completed", session("pi_1", { payment_status: "paid", amount_total: 10000 })],
      ["checkout.session.completed", session("pi_2", { payment_status: "paid" })],
      ["payment_intent.succeeded", intent("pi_1", { amount_received: 10000 })], ["payment_intent.succeeded", intent("pi_2")]],
    (r) => [r.payment_problem?.payments?.map((x) => x.intent).join() === "pi_1" && r.payment_problem.paid_cents === 10000, JSON.stringify(r.payment_problem)]],
  ["97.69 · two wrong payments and a failed bank debit, then paid: both wrong payments owed back, the failed debit kept as a reason",
    job(), [["checkout.session.completed", session("pi_1", { payment_status: "paid", amount_total: 10000 })],
      ["checkout.session.async_payment_failed", session("pi_3", { payment_status: "unpaid" })],
      ["checkout.session.completed", session("pi_4", { payment_status: "paid", amount_total: 12000 })],
      ["checkout.session.completed", session("pi_2", { payment_status: "paid" })]],
    (r) => [r.payment_status === "paid" && r.payment_problem?.payments?.map((x) => `${x.intent}:${x.reason}`).join() === "pi_1:amount,pi_4:amount"
      && r.payment_problem.paid_cents === 22000 && r.payment_problem.earlier?.map((x) => `${x.kind}:${x.intent}`).join() === "failed:pi_3",
      JSON.stringify(r.payment_problem)]],
  ["97.69 · refused: a job paid first time, with nothing wrong before, gets no refund note",
    job(), [["checkout.session.completed", session("pi_1", { payment_status: "paid" })], ["payment_intent.succeeded", intent("pi_1")]],
    (r) => [r.payment_status === "paid" && r.payment_problem === null, JSON.stringify(r.payment_problem)]],
  ["97.69 · refused: a failed bank debit alone is not money owed back when the job is then paid",
    job(), [["checkout.session.async_payment_failed", session("pi_1", { payment_status: "unpaid" })],
      ["checkout.session.completed", session("pi_2", { payment_status: "paid" })]],
    (r) => [r.payment_status === "paid" && r.payment_problem?.kind === "failed" && !r.payment_problem.payments, JSON.stringify(r.payment_problem)]],
  ["R4 · money for a WAIVED job is a refund owed too",
    job({ payment_status: "waived" }), [["payment_intent.succeeded", intent("pi_2")]],
    (r) => [r.payment_status === "waived" && r.payment_problem?.kind === "extra", `${r.payment_status} ${JSON.stringify(r.payment_problem)}`]],
  ["R4 · refused: the SAME payment's second event is not a second payment",
    job({ payment_status: "paid", stripe_payment_intent: "pi_1" }), [["payment_intent.succeeded", intent("pi_1")]],
    (r) => [r.payment_status === "paid" && r.payment_problem === null, JSON.stringify(r.payment_problem)]],
  ["R4 · refused: a page still processing on a settled job records nothing yet",
    job({ payment_status: "paid", stripe_payment_intent: "pi_1" }), [["checkout.session.completed", session("pi_2", { payment_status: "unpaid" })]],
    (r) => [r.payment_problem === null, JSON.stringify(r.payment_problem)]],
];

const probed = [];
let discovered = 0, attempted = 0, completed = 0;
console.log("\n§ 1, § 2 — signed fixture events through the production webhook");
for (const [name, booking, events, expect] of WEBHOOK) {
  discovered++; attempted++;
  fresh(booking);
  const statuses = [];
  for (const [type, object, account] of events) statuses.push(await deliver(type, object, account));
  const [ok, detail] = expect(row());
  check(name, ok && statuses.every((s) => s === 200), `${detail} · HTTP ${statuses.join(",")}`);
  probed.push({ name, ok, statuses, payment_status: row().payment_status, problem: row().payment_problem });
  completed++;
}
// The clean run's canary: an edited fixture must not get past the signature.
let tamperRefused = false;
{
  fresh(job());
  const body = JSON.stringify({ id: "evt_t", type: "checkout.session.async_payment_succeeded", account: "acct_ridgeline", data: { object: session("pi_1", { payment_status: "paid" }) } });
  const t = Math.floor(Date.now() / 1000);
  const header = `t=${t},v1=${await sign(body, t)}`;
  const res = await hook(new Request("https://hook.test/", { method: "POST", headers: { "Stripe-Signature": header }, body: body.replace('"acct_ridgeline"', '"acct_stranger"') }));
  tamperRefused = res.status === 400 && row().payment_status === "pending";
  check("an event edited after signing is refused and changes nothing", tamperRefused, `HTTP ${res.status}, ${row().payment_status}`);
}

// ── § 4 — 97.68: the detailer refunds from their own Stripe ────────────────
console.log("\n§ 4 — charge.refunded through the production webhook");
// A charge as Stripe sends it: `pay-booking` puts the booking id on the payment intent, and the charge takes a copy.
const charge = (pi, refunded, o) => ({ object: "charge", id: `ch_${pi}`, payment_intent: pi, metadata: { booking_id: "b1" }, currency: "usd", amount: 15000, amount_refunded: refunded, refunded: refunded >= 15000, ...o });
const owed = (...ps) => ({ kind: "extra", paid_cents: ps.reduce((s, [, c]) => s + c, 0), owed_cents: 0, currency: "usd", at: "x",
  payments: ps.map(([pi, c]) => ({ intent: pi, paid_cents: c, currency: "usd", at: "x" })) });
const refunded = (pi, paid, ref) => ({ [pi]: { paid_cents: paid, refunded_cents: ref, at: "x" } });
const PAID_JOB = { payment_status: "paid", stripe_payment_intent: "pi_1" };
const CANCELLED = { ...PAID_JOB, status: "cancelled", paid_online_at: "x" };
const left = (r, pi) => (r.payment_problem?.refunds?.[pi]?.paid_cents ?? 0) - (r.payment_problem?.refunds?.[pi]?.refunded_cents ?? 0);
// What is still owed, per payment on the list: the job's line shows exactly these (BookingDetail.jsx).
const stillOwed = (r) => (r.payment_problem?.payments ?? []).map((p) => `${p.intent}:${p.paid_cents - (r.payment_problem?.refunds?.[p.intent]?.refunded_cents ?? 0)}`).join();
const REFUND = [
  ["97.68 · the only refund owed is refunded in full: nothing is owed, so the line goes",
    job({ ...PAID_JOB, payment_problem: owed(["pi_2", 15000]) }), [["charge.refunded", charge("pi_2", 15000)]],
    (r) => [r.payment_status === "paid" && stillOwed(r) === "pi_2:0", JSON.stringify(r.payment_problem)]],
  ["97.68 · two owed, one refunded: only that one is settled, the other is still owed in full",
    job({ ...PAID_JOB, payment_problem: owed(["pi_2", 15000], ["pi_3", 10000]) }), [["charge.refunded", charge("pi_2", 15000)]],
    (r) => [r.payment_problem?.kind === "extra" && stillOwed(r) === "pi_2:0,pi_3:10000", JSON.stringify(r.payment_problem)]],
  ["97.68 · a partial refund keeps the payment on the list, with what is left beside it",
    job({ ...PAID_JOB, payment_problem: owed(["pi_2", 15000]) }), [["charge.refunded", charge("pi_2", 5000)]],
    (r) => [r.payment_problem?.payments?.length === 1 && stillOwed(r) === "pi_2:10000", JSON.stringify(r.payment_problem)]],
  ["97.68 · refunded in two steps ($50, then the other $100): nothing owed after the second",
    job({ ...PAID_JOB, payment_problem: owed(["pi_2", 15000]) }), [["charge.refunded", charge("pi_2", 5000)], ["charge.refunded", charge("pi_2", 15000)]],
    (r) => [stillOwed(r) === "pi_2:0", JSON.stringify(r.payment_problem)]],
  ["97.68 · review: two partial refunds' events arrive the wrong way round ($100 total, then the older $50): $50 still owed, not $100",
    job({ ...PAID_JOB, payment_problem: owed(["pi_2", 15000]) }), [["charge.refunded", charge("pi_2", 10000)], ["charge.refunded", charge("pi_2", 5000)]],
    (r) => [stillOwed(r) === "pi_2:5000", JSON.stringify(r.payment_problem)]],
  ["97.68 · review: a late copy of a refunded payment's own event does not put it back as owed",
    job({ ...PAID_JOB, payment_problem: owed(["pi_2", 15000]) }),
    [["checkout.session.completed", session("pi_2", { payment_status: "paid" })], ["charge.refunded", charge("pi_2", 15000)], ["payment_intent.succeeded", intent("pi_2")]],
    (r) => [stillOwed(r) === "pi_2:0", JSON.stringify(r.payment_problem)]],
  ["97.68 · an older wrong-amount reason under the list is kept when the refund is recorded",
    job({ ...PAID_JOB, payment_problem: { ...owed(["pi_2", 15000]), earlier: [{ kind: "amount", paid_cents: 10000, owed_cents: 15000, currency: "usd", at: "x", intent: "pi_0" }] } }),
    [["charge.refunded", charge("pi_2", 15000)]],
    (r) => [stillOwed(r) === "pi_2:0" && r.payment_problem.earlier?.map((x) => `${x.kind}:${x.intent}`).join() === "amount:pi_0", JSON.stringify(r.payment_problem)]],
  ["97.68 · a failed note carrying the list keeps its own reason when the payment is refunded",
    job({ payment_problem: { kind: "failed", paid_cents: 15000, owed_cents: 15000, currency: "usd", at: "x", intent: "pi_1", payments: owed(["pi_2", 10000]).payments } }),
    [["charge.refunded", charge("pi_2", 10000, { amount: 10000 })]],
    (r) => [r.payment_status === "pending" && r.payment_problem?.kind === "failed" && stillOwed(r) === "pi_2:0", JSON.stringify(r.payment_problem)]],
  ["97.68 · a 97.69 wrong-figure payment owed back is refunded in full: nothing owed, its reason kept",
    job({ ...PAID_JOB, payment_problem: { ...owed(["pi_0", 10000]), payments: [{ ...owed(["pi_0", 10000]).payments[0], reason: "amount" }] } }),
    [["charge.refunded", charge("pi_0", 10000, { amount: 10000 })]],
    (r) => [stillOwed(r) === "pi_0:0" && r.payment_problem.payments[0].reason === "amount", JSON.stringify(r.payment_problem)]],
  // ── Andrew 2026-10-17 (1): the cancelled job's own payment (ROADMAP 14.4) ──
  ["97.68 · a cancelled job's own payment refunded in full: recorded on a job that had no note, nothing left",
    job(CANCELLED), [["charge.refunded", charge("pi_1", 15000)]],
    (r) => [r.status === "cancelled" && r.payment_status === "paid" && left(r, "pi_1") === 0 && r.payment_problem?.refunds?.pi_1?.refunded_cents === 15000, JSON.stringify(r.payment_problem)]],
  ["97.68 · a cancelled job's own payment refunded in part: $100 left",
    job(CANCELLED), [["charge.refunded", charge("pi_1", 5000)]],
    (r) => [left(r, "pi_1") === 10000, JSON.stringify(r.payment_problem)]],
  ["97.68 · a cancelled job's own payment, found by the payment when the charge carries no booking id",
    job(CANCELLED), [["charge.refunded", charge("pi_1", 15000, { metadata: {} })]],
    (r) => [left(r, "pi_1") === 0 && r.payment_problem?.refunds?.pi_1?.refunded_cents === 15000, JSON.stringify(r.payment_problem)]],
  // ── Andrew 2026-10-17 (3): the refund arrives BEFORE Stripe's notice of the payment ──
  ["97.68 · review: a refund that arrives before the extra payment's own event is kept, and the payment then arrives owed nothing",
    job(PAID_JOB), [["charge.refunded", charge("pi_2", 15000)], ["checkout.session.completed", session("pi_2", { payment_status: "paid" })], ["payment_intent.succeeded", intent("pi_2")]],
    (r) => [stillOwed(r) === "pi_2:0", JSON.stringify(r.payment_problem)]],
  ["97.68 · review: a wrong-figure payment refunded while still only a reason, then the right payment settles: owed nothing",
    job({}), [["checkout.session.completed", session("pi_0", { payment_status: "paid", amount_total: 10000 })], ["charge.refunded", charge("pi_0", 10000, { amount: 10000 })],
      ["checkout.session.completed", session("pi_1", { payment_status: "paid" })]],
    (r) => [r.payment_status === "paid" && stillOwed(r) === "pi_0:0", JSON.stringify(r.payment_problem)]],
  ["97.68 · a recorded refund survives a later wrong-figure note written over the row",
    job({ payment_problem: { kind: "extra", paid_cents: 0, owed_cents: 0, currency: "usd", at: "x", refunds: refunded("pi_2", 15000, 15000) } }),
    [["checkout.session.completed", session("pi_0", { payment_status: "paid", amount_total: 10000 })]],
    (r) => [r.payment_problem?.kind === "amount" && r.payment_problem.refunds?.pi_2?.refunded_cents === 15000, JSON.stringify(r.payment_problem)]],
  ["refused: a refund sent from ANOTHER detailer's account records nothing",
    job({ ...PAID_JOB, payment_problem: owed(["pi_2", 15000]) }), [["charge.refunded", charge("pi_2", 15000), "acct_stranger"]],
    (r) => [stillOwed(r) === "pi_2:15000" && !r.payment_problem.refunds, JSON.stringify(r.payment_problem)]],
  ["refused: another detailer's refund of a cancelled job's own payment leaves its line",
    job(CANCELLED), [["charge.refunded", charge("pi_1", 15000), "acct_stranger"]],
    (r) => [r.payment_problem === null, JSON.stringify(r.payment_problem)]],
  ["refused: a refund of a payment no job here took, carrying no booking id, changes nothing",
    job({ ...PAID_JOB, payment_problem: owed(["pi_2", 15000]) }), [["charge.refunded", charge("pi_9", 15000, { metadata: {} })]],
    (r) => [stillOwed(r) === "pi_2:15000" && !r.payment_problem.refunds, JSON.stringify(r.payment_problem)]],
  ["refused: a partly refunded payment no longer counts as covering the job when its own debit fails",
    job({ ...PAID_JOB, paid_online_at: "x", payment_problem: { ...owed(["pi_2", 15000]), refunds: refunded("pi_2", 15000, 5000) } }),
    [["checkout.session.async_payment_failed", session("pi_1", { payment_status: "unpaid" })]],
    (r) => [r.payment_status === "pending" && r.payment_problem?.kind === "failed" && r.payment_problem.refunds?.pi_2?.refunded_cents === 5000, `${r.payment_status} ${JSON.stringify(r.payment_problem)}`]],
];
for (const [name, booking, events, expect] of REFUND) {
  discovered++; attempted++;
  fresh(booking);
  const statuses = [];
  for (const [type, object, acct] of events) statuses.push(await deliver(type, object, acct));
  const [ok, detail] = expect(row());
  check(name, ok && statuses.every((s) => s === 200), `${detail} · HTTP ${statuses.join(",")}`);
  probed.push({ name, ok, statuses, payment_status: row().payment_status, problem: row().payment_problem });
  completed++;
}
// The lookup's query string, built by the real client library: `payment_problem=cs.{...}`.
// The in-memory `contains` above stands in for Postgres's `@>`; this proves what is SENT.
{
  const { createClient } = createRequire(new URL("../app/package.json", import.meta.url))("@supabase/supabase-js");
  let url = "";
  const client = createClient("https://db.test", "anon", { global: { fetch: async (u) => { url = String(u); return new Response("[]", { status: 200, headers: { "content-type": "application/json" } }); } } });
  await client.from("bookings").select("id").contains("payment_problem", { payments: [{ intent: "pi_2" }] });
  const sent = decodeURIComponent(url.split("?")[1] ?? "");
  check("the refund lookup is sent as jsonb contains on the payment's intent", sent.includes('payment_problem=cs.{"payments":[{"intent":"pi_2"}]}'), sent);
}

// ── § 3 — pay-booking against a stubbed Stripe ─────────────────────────────
console.log("\n§ 3 — pay-booking: the stale page is expired before a new one is made");
const page = (id, o) => ({ id, object: "checkout.session", url: `https://checkout.stripe.test/${id}`, ...o });
const PAY = [
  ["R3 · first page: one create, cards only, nothing to expire",
    job(), () => page("cs_new", { status: "open", amount_total: 15000 }),
    (calls, res, r) => [calls.length === 1 && calls[0].path === "/checkout/sessions" && calls[0].body?.payment_method_types?.join() === "card"
      && calls[0].opts.idempotencyKey === "pay:b1:15000:first" && calls[0].opts.stripeAccount === "acct_ridgeline"
      && r.stripe_session_id === "cs_new" && res.url.endsWith("/cs_new"), calls.map((c) => `${c.method} ${c.path} ${c.opts.idempotencyKey ?? ""}`).join(" | ")]],
  ["R3 · price changed $100 → $150: GET old, EXPIRE old, then create, in that order",
    job({ stripe_session_id: "cs_old" }),
    (c) => c.path === "/checkout/sessions/cs_old" ? page("cs_old", { status: "open", amount_total: 10000 })
      : c.path.endsWith("/expire") ? page("cs_old", { status: "expired" }) : page("cs_new", { status: "open", amount_total: 15000 }),
    (calls, res, r) => [calls.map((c) => `${c.method} ${c.path}`).join(" > ") === "GET /checkout/sessions/cs_old > POST /checkout/sessions/cs_old/expire > POST /checkout/sessions"
      && calls[1].opts.stripeAccount === "acct_ridgeline" && calls[2].opts.idempotencyKey === "pay:b1:15000:cs_old"
      && calls[2].body?.line_items?.[0]?.price_data?.unit_amount === 15000 && r.stripe_session_id === "cs_new" && res.url.endsWith("/cs_new"),
      calls.map((c) => `${c.method} ${c.path} ${c.opts.idempotencyKey ?? ""}`).join(" | ")]],
  ["R3 · same price, page still open: handed back, no second live page",
    job({ stripe_session_id: "cs_old" }), () => page("cs_old", { status: "open", amount_total: 15000 }),
    (calls, res, r) => [calls.length === 1 && calls[0].method === "GET" && res.url.endsWith("/cs_old") && r.stripe_session_id === "cs_old",
      calls.map((c) => `${c.method} ${c.path}`).join(" | ")]],
  ["R3 · previous page finished: a fresh page, nothing expired",
    job({ stripe_session_id: "cs_old" }),
    (c) => c.method === "GET" ? page("cs_old", { status: "complete", payment_status: "unpaid", amount_total: 15000 }) : page("cs_new", { status: "open", amount_total: 15000 }),
    (calls, res) => [calls.map((c) => `${c.method} ${c.path}`).join(" > ") === "GET /checkout/sessions/cs_old > POST /checkout/sessions" && res.url.endsWith("/cs_new"),
      calls.map((c) => `${c.method} ${c.path}`).join(" | ")]],
  ["R3 · previous page unknown to Stripe (404, account reconnected): a fresh page",
    job({ stripe_session_id: "cs_gone" }),
    (c) => { if (c.method === "GET") throw new realStripe.StripeError("No such checkout.session", 404, "resource_missing"); return page("cs_new", { status: "open", amount_total: 15000 }); },
    (calls, res) => [calls.length === 2 && calls[1].path === "/checkout/sessions" && res.url?.endsWith("/cs_new"), calls.map((c) => `${c.method} ${c.path}`).join(" | ")]],
  ["R3 · refused: when Stripe will not expire the old page, no new page is made",
    job({ stripe_session_id: "cs_old" }),
    (c) => { if (c.path.endsWith("/expire")) throw new realStripe.StripeError("This Checkout Session is not open.", 400); return page("cs_old", { status: "open", amount_total: 10000 }); },
    (calls, res, r, status) => [status === 409 && !calls.some((c) => c.path === "/checkout/sessions") && r.stripe_session_id === "cs_old",
      `HTTP ${status} · ${calls.map((c) => `${c.method} ${c.path}`).join(" | ")}`]],
  ["R3 · refused: an already-paid job reaches Stripe not at all",
    job({ payment_status: "paid", stripe_session_id: "cs_old" }), () => page("cs_x", {}),
    (calls, _res, _r, status) => [status === 409 && calls.length === 0, `HTTP ${status}, ${calls.length} calls`]],
];
for (const [name, booking, answer, expect] of PAY) {
  discovered++; attempted++;
  fresh(booking);
  stripeCalls = []; stripeAnswer = answer;
  const res = await pay(new Request("https://pay.test/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ booking_id: "b1" }) }));
  const body = await res.json().catch(() => ({}));
  const [ok, detail] = expect(stripeCalls, body, row(), res.status);
  check(name, ok, detail);
  probed.push({ name, ok, status: res.status, calls: stripeCalls.map((c) => `${c.method} ${c.path}`) });
  completed++;
}
const EXPECTED = WEBHOOK.length + REFUND.length + PAY.length;
check(`all ${EXPECTED} scenarios ran`, completed === EXPECTED, `${completed} of ${EXPECTED}`);

// ── Receipt ────────────────────────────────────────────────────────────────
const failed = failures.length;
console.log(`\n${passed} passed, ${failed} failed, ${assertions} assertions, ${completed} of ${EXPECTED} scenarios.`);
const canary = BREAK
  ? { id: `break-${BREAK}`, observed_failure: failed > 0 }
  : { id: "tampered-fixture-refused", observed_failure: tamperRefused };
const logName = `receipts/checkout-page-lifecycle${BREAK ? `-${BREAK}.sabotage` : ""}.txt`;
writeFileSync(path(logName), [
  `checkout-page-lifecycle${BREAK ? ` BREAK=${BREAK}` : ""} — ${new Date().toISOString()}`,
  ...probed.map((p) => `${p.ok ? "ok  " : "FAIL"}  ${p.name}`),
  ...failures.map((f) => `FAIL  ${f}`),
  `${passed} passed, ${failed} failed, ${assertions} assertions, ${completed} of ${EXPECTED} scenarios.`,
].join("\n") + "\n");
const { path: receiptPath } = writeReceipt({
  check_id: BREAK ? `checkout-page-lifecycle-${BREAK}` : "checkout-page-lifecycle",
  started_at,
  status: failed ? "fail" : "pass",
  expected_targets: EXPECTED,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: EXPECTED + 3,
  failures,
  dimensions: { ...(BREAK ? { break: BREAK } : {}), probed },
  artifacts: [logName],
  canary,
});
console.log(`receipt: ${receiptPath}`);
if (BREAK) console.log(failed ? `BREAK=${BREAK} caught (${failed} failed)` : `BREAK=${BREAK} NOT caught`);
process.exit(failed ? 1 : 0);
