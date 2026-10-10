// ROADMAP 12.1 — SUBSCRIPTION BILLING, WALKED END TO END IN STRIPE SANDBOX.
//
//   node scripts/billing-walk.mjs                      the walk
//   node scripts/billing-walk.mjs --break=page-stays-up  sabotage: must go red
//
// sign-up → pay → renew → failed payment retries → page offline → back when paid.
// **Every transition is judged twice: in this product's own rows, and on the
// actual public booking page, read off the rendered page** — never off the
// subscription record. The failure 12.1 exists to catch is every Stripe event
// arriving correctly while the page never changes state, and only the page can
// answer that half.
//
// WHAT IT TOUCHES, so a lane statement can name it (docs/shared-resources.md):
//   * ITS OWN throwaway business, `billing-walk-<tag>`, `is_demo: true`, plus
//     an owner login and a membership. NEVER `demo-detail`. Deleted at the end.
//   * Stripe SANDBOX only. It refuses a live key and refuses a live publishable
//     key handed back by the checkout, before any card is confirmed.
//   * The DEPLOYED `platform-billing` and `stripe-webhook`, so it measures what
//     is running, not this checkout. `deployed-inventory.mjs` says which.
//   * The live public page, https://detailingplatform.com/book/<slug>, in its
//     own headless browser. A handful of page loads; no address typing, so no
//     Geoapify credit.
//   * Email: none that costs anything. The owner and contact address are on
//     the `fixture.test` sink, which `send-email` drops above the claim.
//   * receipts/billing-walk.json.
//
// TWO HALVES, AND WHICH ONE RUNS DEPENDS ON ONE CREDENTIAL.
//   A. Without `STRIPE_SECRET_KEY` in the shell: sign-up → pay → page up, then
//      the LAST transition (a suspended business pays to come back) from a
//      suspended state THIS SCRIPT WRITES, because nothing else can produce one
//      without a test clock. Labelled as staged in every line it prints.
//   B. With a sandbox `sk_test_` key: the whole chain on a Stripe test clock,
//      so the renewal and every retry happen in minutes, not weeks.
//   Renew, retries and the real suspension print NOT MEASURED without the key,
//   and the run exits 1 — a half-run must never read as a pass.
//
// NEVER LEAVES A BUSINESS SUSPENDED. A paused business darkens a booking page
// and every other check that reads one. Teardown runs from `finally` AND from
// SIGINT/SIGTERM (docs/gotchas.md 90: a `finally` does not run on SIGTERM), and
// every run starts by sweeping any `billing-walk-%` business a killed run left.
//
// --break=page-stays-up — after the suspension is observed in the rows, this
// writes the business back to `active` behind the webhook's back: the row says
// suspended, the page is up. That is 12.1's own "what failing looks like", and
// the page-offline check MUST go red on it.

import "../tests/_env.mjs";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sink } from "../tests/_mail.mjs";
import { writeReceipt } from "./receipt.mjs";
import { addSkip, absentEvidence } from "./lib/skipEvidence.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const REF = "kguqylyzgyzfktkfnhjb";
const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const SK = process.env.STRIPE_SECRET_KEY || "";
const BOOK_ORIGIN = process.env.BOOK_ORIGIN || "https://detailingplatform.com";
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8) || null;
const started_at = new Date().toISOString();

if (!URL_ || !SERVICE || !ANON) {
  console.error("NOT RUN — needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY (.env).");
  process.exit(1);
}
if (!URL_.includes(REF)) {
  console.error(`NOT RUN — SUPABASE_URL is not ${REF}. This walk writes rows; it only writes to the platform's own project.`);
  process.exit(1);
}
if (SK && !SK.startsWith("sk_test_")) {
  // NEVER THE KEY, AND NEVER ANY PART OF IT.
  console.error("NOT RUN — STRIPE_SECRET_KEY is not a sandbox key. This walk never touches live money.");
  process.exit(1);
}
if (BREAK && BREAK !== "page-stays-up") {
  console.error(`Unknown --break=${BREAK}. The one sabotage is --break=page-stays-up.`);
  process.exit(1);
}

// ─── bookkeeping ──────────────────────────────────────────────────────────
const failures = [], warnings = [], notMeasured = [], skipEntries = [];
let assertions = 0;
const check = (name, ok, detail = "") => {
  assertions++;
  if (ok) console.log(`  ok    ${name}`);
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
  return ok;
};
// ROADMAP 14.11: a skip carries evidence or `addSkip` throws before it is counted, so the receipt's allowlist can itemise it.
const skip = (name, why, evidence) => { addSkip(skipEntries, { label: name, reason: why, evidence }); notMeasured.push(`${name} — ${why}`); console.log(`  NOT MEASURED  ${name} — ${why}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Supabase ─────────────────────────────────────────────────────────────
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const rest = async (p, init = {}) => {
  const r = await fetch(`${URL_}/rest/v1/${p}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
};
const one = async (p) => (await rest(p)).body?.[0] ?? null;

// ─── Stripe ───────────────────────────────────────────────────────────────
// Form-encodes nested objects the way Stripe wants: a[b][c]=v.
const form = (o, pre = "", out = new URLSearchParams()) => {
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null) continue;
    const key = pre ? `${pre}[${k}]` : k;
    if (typeof v === "object") form(v, key, out); else out.append(key, String(v));
  }
  return out;
};
const stripeAs = async (key, path, params, method) => {
  const r = await fetch(`https://api.stripe.com/v1${path}`, {
    method: method || (params ? "POST" : "GET"),
    headers: { Authorization: `Bearer ${key}`, "Stripe-Version": "2024-06-20" },
    body: params ? form(params) : undefined,
  });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Stripe ${path}: ${b?.error?.message ?? r.status}`);
  return b;
};
const sk = (path, params, method) => stripeAs(SK, path, params, method);

// ─── the page, read off the page ──────────────────────────────────────────
let browser = null;
const ART = fileURLToPath(new URL("../artifacts/billing-walk/", import.meta.url));
const artifacts = [];
async function readPage(slug, shot) {
  browser ??= await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(`${BOOK_ORIGIN}/book/${slug}?billing-walk=${Date.now()}`, { waitUntil: "domcontentloaded" });
    // The page draws a spinner first. Wait for it to commit to an answer.
    let text = "";
    for (let i = 0; i < 40; i++) {
      text = await page.evaluate(() => document.body.innerText || "");
      if (/Page not found|Something went wrong/.test(text) || text.includes(NAME)) break;
      await sleep(500);
    }
    if (shot) {
      mkdirSync(ART, { recursive: true });
      await page.screenshot({ path: `${ART}${shot}.png` });
      artifacts.push(`artifacts/billing-walk/${shot}.png`);
    }
    return text;
  } finally { await page.close(); }
}
// Up = the business's own name is on the page and the 404 is not. Down = the
// reverse. Anything else (an error page, a spinner that never settled) is
// neither, and both checks fail on it.
const pageIsUp = (t) => t.includes(NAME) && !/Page not found/.test(t);
const pageIsDown = (t) => /Page not found/.test(t) && !t.includes(NAME);
const firstLine = (t) => t.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 2).join(" / ").slice(0, 120);

async function waitFor(what, fn, ms = 90_000) {
  const until = Date.now() + ms;
  let last;
  while (Date.now() < until) { last = await fn(); if (last) return last; await sleep(2000); }
  console.log(`        (waited ${ms / 1000}s for ${what})`);
  return null;
}
const subRow = () => one(`platform_subscriptions?business_id=eq.${biz.id}&select=*`);
const bizStatus = async () => (await one(`businesses?id=eq.${biz.id}&select=status`))?.status;

// ─── fixture ──────────────────────────────────────────────────────────────
const tag = Math.random().toString(36).slice(2, 8);
const SLUG = `billing-walk-${tag}`;
const NAME = `Billing Walk ${tag.toUpperCase()} Detailing`;
const OWNER = { email: sink(`billing-walk-${tag}`), password: `Aa1!${crypto.randomUUID()}` };
let biz = null, userId = null, clockId = null, jwt = null;
let canary = { id: "nonexistent-slug-reads-down", observed_failure: false };

async function teardown() {
  if (!SK && jwt && biz) {
    // No clock to delete, so end the sandbox subscription the way a detailer
    // would. Monthly has no term, so no exit fee; it lapses at period end.
    await callBilling({ action: "cancel" }).catch(() => {});
  }
  if (clockId && SK) {
    // Deleting a test clock deletes its customer and every subscription on it.
    await sk(`/test_helpers/test_clocks/${clockId}`, null, "DELETE").catch((e) => warnings.push(`clock not deleted: ${e.message}`));
    clockId = null;
  }
  if (biz) { await rest(`businesses?id=eq.${biz.id}`, { method: "DELETE" }); }
  if (userId) { await fetch(`${URL_}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: H }); userId = null; }
  await browser?.close().catch(() => {}); browser = null;
}
async function sweepLeftovers() {
  const left = (await rest("businesses?slug=like.billing-walk-*&select=id,slug,status")).body ?? [];
  for (const b of left) await rest(`businesses?id=eq.${b.id}`, { method: "DELETE" });
  return left;
}
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, async () => { console.log(`\n${sig} — tearing down before exit`); await teardown(); process.exit(1); });
}

const callBilling = async (body) => {
  const r = await fetch(`${URL_}/functions/v1/platform-billing`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ business_id: biz.id, ...body }),
  });
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
};

// Subscribe through the deployed endpoint and pay the first invoice the way
// the card form does. With the secret key, the card is a sandbox test
// PaymentMethod; without it, the publishable key and the client secret — the
// exact two things the browser holds — confirm with Stripe's `tok_visa`.
async function subscribeAndPay(label, cardToken = "tok_visa") {
  const res = await callBilling({ action: "subscribe", plan: "website", term: "monthly", consented: true });
  if (!check(`${label} · the deployed checkout hands back a card form`, res.status === 200 && !!res.body?.client_secret,
    `${res.status} ${JSON.stringify(res.body).slice(0, 160)}`)) return false;
  const pk = String(res.body.publishable_key || "");
  // The sandbox proof that needs no secret: the key the checkout itself hands out.
  if (!check(`${label} · and it is a SANDBOX checkout (publishable key is pk_test_)`, pk.startsWith("pk_test_"),
    "refusing to confirm a card against a live key")) return false;
  const secret = res.body.client_secret;
  const pi = secret.split("_secret_")[0];
  if (SK) {
    const pm = await sk("/payment_methods", { type: "card", card: { token: cardToken } });
    await sk(`/payment_intents/${pi}/confirm`, { payment_method: pm.id, return_url: "https://example.com/done" });
  } else {
    await stripeAs(pk, `/payment_intents/${pi}/confirm`, {
      client_secret: secret, return_url: "https://example.com/done",
      payment_method_data: { type: "card", card: { token: cardToken } },
    });
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
try {
  const left = await sweepLeftovers();
  if (left.length) warnings.push(`swept ${left.length} business(es) a killed run left behind: ${left.map((b) => `${b.slug} (${b.status})`).join(", ")}`);
  console.log(`Stripe secret key in this shell: ${SK ? "yes, sandbox" : "NO — half A only (see header)"}`);
  console.log(`Booking page read at: ${BOOK_ORIGIN}/book/${SLUG}${BREAK ? `\n*** --break=${BREAK}: this run is a sabotage, not a result ***` : ""}\n`);

  // ── 1. SIGN-UP ──────────────────────────────────────────────────────────
  // ── 0. CANARY ────────────────────────────────────────────────────────────
  // The page reader's negative control, every run: a slug that matches no
  // business. If the reader calls THAT page up, every "reachable" below is
  // worthless. It is the same reader and the same verdicts the walk uses.
  console.log("0. canary — a booking link that matches nothing");
  const nope = await readPage(`billing-walk-nobody-${tag}`, "0-canary-nobody");
  canary = { id: "nonexistent-slug-reads-down", observed_failure: !pageIsUp(nope) && pageIsDown(nope) };
  check("0 · CANARY: a page for no business is NOT read as reachable", canary.observed_failure, `page read: ${firstLine(nope)}`);

  console.log("\n1. sign-up");
  biz = (await rest("businesses", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify([{ slug: SLUG, name: NAME, timezone: "America/Los_Angeles", contact_email: OWNER.email, is_demo: true }]),
  })).body?.[0] ?? null;
  check("1a · the fixture business exists, and it is not demo-detail", !!biz?.id && biz.slug !== "demo-detail");
  await fetch(`${URL_}/auth/v1/admin/users`, { method: "POST", headers: H, body: JSON.stringify({ ...OWNER, email_confirm: true }) });
  const users = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: H })).json();
  userId = (users.users ?? []).find((u) => u.email === OWNER.email)?.id ?? null;
  const m = await rest("business_users", { method: "POST", body: JSON.stringify([{ business_id: biz.id, user_id: userId, role: "owner" }]) });
  check("1b · it has an owner who is a member of it", !!userId && m.status < 300, `member insert ${m.status}`);
  jwt = (await (await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify(OWNER),
  })).json()).access_token;
  check("1c · and that owner can sign in", !!jwt);

  if (SK) {
    // The customer has to exist ON the clock before `subscribe` runs, and
    // `subscribe` reuses a customer it finds on the row — so the row is
    // started here with only that, and `subscribe` overwrites every other field.
    const clock = await sk("/test_helpers/test_clocks", { frozen_time: Math.floor(Date.now() / 1000), name: SLUG });
    clockId = clock.id;
    const cust = await sk("/customers", { name: NAME, email: OWNER.email, test_clock: clockId, metadata: { business_id: biz.id, slug: SLUG } });
    await rest("platform_subscriptions", { method: "POST", body: JSON.stringify([{
      business_id: biz.id, plan: "website", term: "monthly", recurring_cents: 1, bill_interval: "month",
      status: "incomplete", stripe_customer_id: cust.id,
    }]) });
    console.log("        (sandbox test clock and customer created; the clock is deleted at the end)");
  }

  // ── 2. PAY ──────────────────────────────────────────────────────────────
  console.log("\n2. pay");
  if (await subscribeAndPay("2a")) {
    const row = await waitFor("the row to read active", async () => { const r = await subRow(); return r?.status === "active" ? r : null; });
    check("2b · ROW: platform_subscriptions reads active after paying", !!row, `status ${(await subRow())?.status}`);
    const inv = await waitFor("a paid invoice row", () => one(`platform_invoices?business_id=eq.${biz.id}&status=eq.paid&select=id,amount_cents`));
    check("2c · ROW: and a paid invoice is mirrored into platform_invoices", !!inv);
    check("2d · ROW: the business is active", (await bizStatus()) === "active");
    const t = await readPage(SLUG, "2e-paid");
    check("2e · PAGE: the public booking page is reachable after paying", pageIsUp(t), `page read: ${firstLine(t)}`);
  }

  // ── 3–5. RENEW, RETRIES, OFFLINE ────────────────────────────────────────
  if (!SK) {
    for (const s of ["3 · renew", "4 · failed payment retries", "5 · page offline after the retries run out"]) {
      skip(s, "needs a sandbox STRIPE_SECRET_KEY in the shell, for a test clock", absentEvidence("STRIPE_SECRET_KEY"));
    }
  } else {
    let row = await subRow();
    const subId = row.stripe_subscription_id;
    const clockTo = async (unix, why) => {
      await sk(`/test_helpers/test_clocks/${clockId}/advance`, { frozen_time: unix });
      const ready = await waitFor(`the clock (${why})`, async () => (await sk(`/test_helpers/test_clocks/${clockId}`)).status === "ready" || null, 180_000);
      if (!ready) throw new Error(`test clock never finished advancing (${why})`);
    };
    let sub = await sk(`/subscriptions/${subId}`);
    let now = (await sk(`/test_helpers/test_clocks/${clockId}`)).frozen_time;

    console.log("\n3. renew");
    await clockTo(sub.current_period_end + 7200, "first renewal");
    const paidCount = async () => ((await rest(`platform_invoices?business_id=eq.${biz.id}&status=eq.paid&select=id`)).body ?? []).length;
    check("3a · ROW: the renewal is mirrored as a second paid invoice", !!(await waitFor("the renewal invoice", async () => (await paidCount()) >= 2 || null)));
    row = await subRow();
    check("3b · ROW: still active after the renewal", row?.status === "active", `status ${row?.status}`);
    check("3c · PAGE: still reachable after the renewal", pageIsUp(await readPage(SLUG, "3c-renewed")));

    console.log("\n4. failed payment retries");
    const bad = await sk("/payment_methods", { type: "card", card: { token: "tok_chargeCustomerFail" } });
    await sk(`/payment_methods/${bad.id}/attach`, { customer: sub.customer });
    await sk(`/subscriptions/${subId}`, { default_payment_method: bad.id });
    await sk(`/customers/${sub.customer}`, { invoice_settings: { default_payment_method: bad.id } });
    sub = await sk(`/subscriptions/${subId}`);
    await clockTo(sub.current_period_end + 7200, "second renewal, on a card that fails");
    row = await waitFor("the row to read past_due", async () => { const r = await subRow(); return r?.status === "past_due" ? r : null; });
    check("4a · ROW: the failed renewal reads past_due", !!row, `status ${(await subRow())?.status}`);
    check("4b · ROW: with one attempt counted and the bank's reason stored", row?.dunning_attempts >= 1 && !!row?.last_failure_reason,
      `attempts ${row?.dunning_attempts}, reason ${row?.last_failure_reason}`);
    check("4c · PAGE: still reachable while the card is being retried", pageIsUp(await readPage(SLUG, "4c-past-due")));

    // Follow Stripe's own retry schedule rather than assuming one: it is a
    // dashboard setting, and the product deliberately does not count it down.
    let retries = 0;
    for (; retries < 12; retries++) {
      const inv = (await sk(`/invoices?subscription=${subId}&status=open&limit=1`)).data?.[0];
      if (!inv?.next_payment_attempt) break;
      await clockTo(inv.next_payment_attempt + 3600, `retry ${retries + 1}`);
      await sleep(4000);
    }
    console.log(`        (Stripe retried ${retries} more time(s) after the first failure)`);

    console.log("\n5. page offline");
    row = await waitFor("the row to read suspended", async () => { const r = await subRow(); return r?.suspended_at ? r : null; });
    check("5a · ROW: suspended_at is set once the retries run out", !!row, `status ${(await subRow())?.status}`);
    check("5b · ROW: the retries were counted", (row?.dunning_attempts ?? 0) >= 2, `attempts ${row?.dunning_attempts}`);
    check("5c · ROW: the business is paused", (await bizStatus()) === "paused");
    if (BREAK === "page-stays-up") await rest(`businesses?id=eq.${biz.id}`, { method: "PATCH", body: JSON.stringify({ status: "active" }) });
    const t = await readPage(SLUG, "5d-offline");
    check("5d · PAGE: the public booking page is unreachable after the failed payments", pageIsDown(t), `page read: ${firstLine(t)}`);
  }

  // ── 6. BACK WHEN PAID ───────────────────────────────────────────────────
  console.log("\n6. back when paid");
  if (!SK) {
    // STAGED: the state the retries would have left, written here. The walk
    // from this point on is the real deployed product. The first subscription
    // is cancelled through the product first (it has no clock to delete), and
    // its webhook is let land, or it would overwrite the staged row.
    await callBilling({ action: "cancel" });
    await sleep(10_000);
    await rest(`platform_subscriptions?business_id=eq.${biz.id}`, { method: "PATCH", body: JSON.stringify({
      status: "canceled", suspended_at: new Date().toISOString(), canceled_at: new Date().toISOString(), cancel_at_period_end: false,
    }) });
    await rest(`businesses?id=eq.${biz.id}`, { method: "PATCH", body: JSON.stringify({ status: "paused" }) });
    warnings.push("step 6 started from a suspension this script WROTE (no test clock without a secret key); steps 6a onward are the deployed product");
    console.log("        STAGED: suspension written by this script, as the retries would leave it");
    await sleep(3000);
    check("6-staged · the staged row survived (no late webhook overwrote it)", (await subRow())?.status === "canceled");
    if (BREAK === "page-stays-up") await rest(`businesses?id=eq.${biz.id}`, { method: "PATCH", body: JSON.stringify({ status: "active" }) });
    const t = await readPage(SLUG, "6a-staged-offline");
    check("6a · PAGE: the staged suspension really is offline on the page", pageIsDown(t), `page read: ${firstLine(t)}`);
  }
  if (BREAK === "page-stays-up") await rest(`businesses?id=eq.${biz.id}`, { method: "PATCH", body: JSON.stringify({ status: "paused" }) });
  // Stripe's default end-of-dunning CANCELS (docs/verification.md, 2026-09-05),
  // so "paid" is the restart the billing screen offers. If the account is ever
  // set to leave the subscription unpaid instead, the open invoice is what gets paid.
  const before = await subRow();
  const openInv = SK ? (await sk(`/invoices?subscription=${before.stripe_subscription_id}&status=open&limit=1`)).data?.[0] : null;
  if (openInv) {
    const good = await sk("/payment_methods", { type: "card", card: { token: "tok_visa" } });
    await sk(`/payment_methods/${good.id}/attach`, { customer: openInv.customer });
    await sk(`/invoices/${openInv.id}/pay`, { payment_method: good.id });
    console.log("        (the subscription was left unpaid, so its open invoice was paid)");
  } else {
    await subscribeAndPay("6b");
  }
  const row = await waitFor("the row to read active and unsuspended", async () => {
    const r = await subRow(); return r?.status === "active" && !r?.suspended_at ? r : null;
  });
  check("6c · ROW: active again, suspended_at cleared", !!row, JSON.stringify(await subRow(), ["status", "suspended_at"]));
  const back = await waitFor("the business to be active", async () => (await bizStatus()) === "active" || null, 30_000);
  check("6d · ROW: the business is active again", !!back, `businesses.status ${await bizStatus()}`);
  const t = await readPage(SLUG, "6e-paid-again");
  check("6e · PAGE: the public booking page is reachable again once paid", pageIsUp(t), `page read: ${firstLine(t)}`);
} catch (err) {
  failures.push(`crashed: ${err.message}`);
  console.log(`\nCRASHED: ${err.message}`);
} finally {
  await teardown();
  const leftover = (await rest(`businesses?slug=eq.${SLUG}&select=status`)).body ?? [];
  check("Z · teardown: the fixture business is gone, so nothing is left suspended", leftover.length === 0, JSON.stringify(leftover));
}

const status = failures.length === 0 && notMeasured.length === 0 ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "billing-walk",
  started_at,
  status,
  // The chain's six transitions. A transition the shell cannot walk is
  // SKIPPED under an allowlist that expires, never folded into the count.
  expected_targets: 6 - notMeasured.length,
  discovered_targets: 6 - notMeasured.length,
  attempted_targets: 6 - notMeasured.length,
  completed_targets: 6 - notMeasured.length,
  skipped_targets: notMeasured.length,
  ...(notMeasured.length ? { skip_allowlist: {
    reason: "renew, retries and the real suspension need a test clock, and a test clock needs the sandbox STRIPE_SECRET_KEY in the shell (FOR-ANDREW.md)",
    expires: "2026-10-20",
    skipped: skipEntries,
  } } : {}),
  assertions_executed: assertions,
  // Below a clean run on purpose (half A runs 18, the full walk 30+), so a
  // section that silently stops checking drops the count under it.
  min_assertions: SK ? 26 : 15,
  canary,
  artifacts,
  failures: [...failures, ...notMeasured.map((n) => `NOT MEASURED: ${n}`)],
  warnings: [...warnings, ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : [])],
  // `break` routes a sabotage run to billing-walk.sabotage.json (gotchas 117);
  // without it the sabotage red overwrote the honest receipt, measured 2026-10-10.
  dimensions: { stripe_secret_key: SK ? "sandbox" : "absent", book_origin: BOOK_ORIGIN, slug: SLUG, ...(BREAK ? { break: BREAK } : {}) },
});
console.log(`\n${assertions} checks, ${failures.length} failed, ${notMeasured.length} not measured → ${status.toUpperCase()}   (${path})`);
process.exit(status === "pass" ? 0 : 1);
