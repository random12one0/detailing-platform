// ROADMAP 14.5 — ONE PAYMENT, END TO END, WITH REAL MONEY MOVING.
//
//   node scripts/e2e-payment.mjs                 # the whole run
//   node scripts/e2e-payment.mjs --headed        # watch the card get typed
//   node scripts/e2e-payment.mjs --break=<id>    # sabotage one target on purpose
//   node scripts/receipt.mjs receipts/e2e-payment.json
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS, IN ONE SENTENCE
// ---------------------------------------------------------------------------
// **566 money assertions pass in this repo and not one of them touches a
// network.** `connect.test.mjs` (126), `payments.test.mjs` (83) and
// `platform-billing.test.mjs` (357) import `payability`, `amountDueCents`,
// `cardStatus` and `verifyWebhook` and test them directly. That is genuinely
// good work and every one of those functions is correct. **What none of them
// can tell you is whether a payment SETTLES** — no test had ever created a
// Checkout Session, delivered a webhook to the deployed endpoint, or watched a
// booking go from owed to paid. `docs/how-we-run.md` names this exact shape:
// green beside a thing that has never happened.
//
// Measured on 2026-09-17, before this file existed: **zero rows in
// `connected_accounts`, zero bookings with a `stripe_session_id`, zero
// bookings with a `stripe_payment_intent`.** The customer-pays-the-detailer
// half of this product had never run once, in any environment.
//
// ---------------------------------------------------------------------------
// THE TWO HALVES OF THIS PRODUCT'S MONEY, AND THIS FILE IS THE UNTESTED ONE
// ---------------------------------------------------------------------------
// A detailer paying the PLATFORM a subscription is `platform-billing` +
// `stripe-webhook`'s `handle()`, on the platform's own Stripe account. That
// half has really run — 66 recorded events prove it.
//
// A customer paying a DETAILER is `pay-booking` + `stripe-webhook`'s
// `handleConnected()`, on the detailer's OWN connected account, with the money
// never touching the platform's balance. That is this file. The two share a
// URL and almost nothing else, which is why a healthy-looking billing endpoint
// says nothing at all about this one.
//
// ---------------------------------------------------------------------------
// THE CARD IS TYPED INTO STRIPE'S OWN PAGE, AND THAT IS THE POINT
// ---------------------------------------------------------------------------
// `4242 4242 4242 4242` and `4000 0000 0000 0002` are Stripe's published test
// fixtures. They belong to nobody, exist only in test mode and can move no
// real money. Driving the hosted page rather than confirming a PaymentIntent
// through the API is deliberate: the hosted page is what a customer actually
// meets, it is what `pay-booking` hands them, and a PaymentIntent confirmed
// server-side would skip the one leg that has never been exercised.
//
// **THE RUN REFUSES TO START AGAINST ANYTHING BUT THE DEVELOPMENT PROJECT.**
// CLAUDE.md's first hard rule. This file writes bookings and takes payments.
//
// **NO EMAIL IS SENT, and that is checked rather than hoped.**
// `handleConnected()` marks the row paid and sends nothing — read it and see.
// `pay-booking` hands `customer_email` to Stripe for Stripe's own receipt, so
// the fixtures carry an `@example.com` address that reaches no inbox.

import "../tests/_env.mjs";           // root .env -> process.env, before anything reads it

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
// THE PRODUCT'S OWN FORMATTER, IMPORTED RATHER THAN COPIED. `e2e-booking.mjs`
// learned this the hard way: a `toFixed(2)` here printed `$195.00` beside a
// screen reading `$195` and called two equal numbers unequal for a day.
import { money } from "../app/src/lib/format.js";
import { demoOwner } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const HEADED = process.argv.includes("--headed");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;

// ---------------------------------------------------------------------------
// THE FIXTURES
// ---------------------------------------------------------------------------
// **$180 QUOTED, $195 AGREED, ON PURPOSE.** `amountDueCents` prefers
// `final_amount` over `total_price` because the detailer set it at the car. A
// regression to the quote prints a DIFFERENT number here rather than the same
// one, which is the shape of sabotage that survives review.
// THE DEMO BUSINESS IS FOUND BY ITS SLUG, NOT BY A UUID WRITTEN DOWN HERE.
// This file carried `def6fa3f-…` until 2026-09-18, when it died on
// `bookings_business_id_fkey` — `seed-demo.mjs` had rebuilt the demo tenant
// and a rebuilt row gets a NEW id. A reseed changes the id every time and
// never changes the slug, so the id is resolved at run time below.
const SLUG = "demo-detail";   // Coastline Auto Detailing, the demo
let BIZ = null;
const OWNER = demoOwner();
// THE TWO FIXTURES SIT IN DIFFERENT SLOTS ON PURPOSE. Sharing one start time
// put them in the same hour of the same day, and the second create came back
// with nothing — a detailer cannot be in two places at once and the database
// says so. Found on this file's first run.
const PAY = {
  name: "ROADMAP 14.5 PAY", total_price: 180, final_amount: 195, cents: 19500,
  start_at: "2026-09-10T17:00:00+00:00", end_at: "2026-09-10T20:00:00+00:00",
};
const CANARY = {
  name: "ROADMAP 14.5 CANARY", total_price: 60, final_amount: 65, cents: 6500,
  start_at: "2026-09-11T17:00:00+00:00", end_at: "2026-09-11T19:00:00+00:00",
};

// WHAT THE CHECK EXPECTS TO SEE, STATED SEPARATELY FROM THE FIXTURE. The
// sabotage `--break=amount` moves this to the QUOTE — the product is untouched
// and still charges the agreed $195, so every place the figure is asserted has
// to go red. A sabotage that only loosens an assertion which was already
// satisfied proves nothing; this one changes what is being compared against.
const EXPECT = BREAK === "amount"
  ? { final: PAY.total_price, cents: PAY.total_price * 100 }
  : { final: PAY.final_amount, cents: PAY.cents };

// Stripe's published test cards. `chargeDeclined` is the canary's whole job.
const CARD_OK = "4242424242424242";
const CARD_DECLINED = "4000000000000002";

const ART = new URL("../artifacts/e2e-payment/", import.meta.url);

let assertions = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  assertions++;
  if (cond) { console.log(`  ok    ${name}`); return true; }
  failures.push(`${name} ${detail}`.trim());
  console.error(`  FAIL  ${name} ${detail}`);
  return false;
};

// ---------------------------------------------------------------------------
// GUARDS. A SKIPPED RUN MUST NOT READ LIKE A PASSING ONE.
// ---------------------------------------------------------------------------
if (!URL_ || !SERVICE || !ANON) {
  console.error("\nSKIPPED — needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY in the root .env.");
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}
if (!URL_.includes("kguqylyzgyzfktkfnhjb")) {
  console.error(`\nREFUSED — ${URL_} is not the development project. This script takes payments.`);
  console.error("NOTHING ran and NO receipt was written.");
  process.exit(2);
}

const svc = async (path, init = {}) => {
  const res = await fetch(URL_ + path, {
    ...init,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
};

const fn = async (name, payload, token) => {
  const res = await fetch(`${URL_}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      apikey: ANON,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * THE MONEY SCREEN'S OWN QUESTION, ASKED THE WAY THE SCREEN ASKS IT.
 *
 * Copied from `app/src/screens/Money.jsx` — `status = completed` AND
 * `payment_status` in (`pending`, `partial`), no date filter, because *"who
 * owes me is not a period question"*. Reading it any other way here would
 * prove something the screen does not show.
 */
async function outstanding() {
  const { body } = await svc(
    `/rest/v1/bookings?select=id,final_amount,total_price&business_id=eq.${BIZ}`
    + `&deleted_at=is.null&status=eq.completed&payment_status=in.(pending,partial)`,
  );
  const rows = Array.isArray(body) ? body : [];
  const amountOf = (r) => Number(r.final_amount ?? r.total_price);
  return {
    ids: rows.map((r) => r.id),
    total: rows.reduce((s, r) => s + amountOf(r), 0),
    amountFor: (id) => {
      const row = rows.find((r) => r.id === id);
      return row ? amountOf(row) : null;
    },
  };
}

/**
 * A FRESH BOOKING EVERY RUN, AND THE REASON IS STRIPE'S IDEMPOTENCY KEY.
 *
 * `pay-booking` keys its session on `pay:<booking id>:<cents>` — correctly,
 * so a customer double-tapping gets one session and not two. For 24 hours
 * afterwards, Stripe answers that key with THE SAME SESSION, and that session
 * is now complete. Resetting the row's `payment_status` to `pending` and
 * running again therefore hands this script a checkout page that cannot be
 * paid, and the run fails for a reason that has nothing to do with the
 * product. A new booking id is a new key.
 *
 * The previous run's fixture is SOFT-deleted rather than removed — ROADMAP 0.3
 * is flag, don't delete — and `deleted_at` drops it out of the Money screen's
 * own query, which is the one that has to be honest here.
 */
async function fixture(spec) {
  await svc(
    `/rest/v1/bookings?business_id=eq.${BIZ}&customer_name=eq.${encodeURIComponent(spec.name)}&deleted_at=is.null`,
    { method: "PATCH", body: JSON.stringify({ deleted_at: new Date().toISOString() }) },
  );
  const row = {
    business_id: BIZ,
    customer_name: spec.name,
    customer_email: "roadmap-14-5@example.com",
    customer_phone: "562-555-0145",
    customer_address: "1 Test St, Seal Beach, CA",
    start_at: spec.start_at,
    end_at: spec.end_at,
    service_type: "dropoff",
    vehicle_size: "large",
    subtotal: spec.total_price,
    total_price: spec.total_price,
    final_amount: spec.final_amount,
    status: "completed",
    payment_status: "pending",
    // CLEARED ON EVERY RUN. A leftover intent from yesterday's run would make
    // today's webhook assertion pass without a webhook.
    stripe_session_id: null,
    stripe_payment_intent: null,
    paid_online_at: null,
    deleted_at: null,
  };
  const made = await svc("/rest/v1/bookings", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  const id = made.body?.[0]?.id;
  // A CREATE THAT FAILS MUST SAY SO. The first run of this file lost a fixture
  // silently and the canary section then "passed" against a booking that did
  // not exist — the exact shape `receipt.mjs` was written about, produced by
  // this file on its first outing.
  if (!id) throw new Error(`could not create the "${spec.name}" fixture: ${made.status} ${JSON.stringify(made.body)}`);
  return id;
}

/**
 * Types a card into Stripe's hosted page and presses pay.
 *
 * DEFENSIVE ABOUT FIELDS, NOT ABOUT THE OUTCOME. Stripe adds and removes
 * fields (postal code, country, name) by account and by country, so each one
 * is filled only if it is there. What is NOT optional is the submit and the
 * verdict — an unfilled required field makes the page refuse, and that lands
 * as a failed target rather than as a silent skip.
 */
async function payOnStripe(page, url, card) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // WAITS FOR THE FIELD RATHER THAN ASSUMING IT IS THERE. The card panel
  // renders its inputs a beat after it opens, and a `fill` against a
  // not-yet-mounted input silently does nothing — which came back from Stripe
  // as the single word *"Required"*, naming neither the field nor the cause.
  const type = async (selector, value) => {
    const el = page.locator(selector).first();
    try {
      await el.waitFor({ state: "visible", timeout: 8000 });
    } catch {
      return false;
    }
    await el.fill(value);
    return true;
  };

  // THE CARD FORM IS NOT THE PAGE'S FIRST OFFER, AND MISSING THIS COST A RUN.
  // This connected account has Link, Cash App, Affirm and Klarna switched on,
  // so Checkout opens on Link's phone-number field and the card inputs are not
  // in the document at all. Filling `#cardNumber` on that page silently does
  // nothing and the submit comes back *"Payment method Required"* — a failure
  // that reads like a declined card and is not one.
  //
  // AND IT IS THE BUTTON, AFTER A SCROLL. Three things had to be right here
  // and each failed on its own run:
  //   · the RADIO cannot be clicked — Stripe's own `Pay with card` button
  //     covers it, and Playwright refuses, correctly: a customer's finger
  //     would land on the button too.
  //   · the BUTTON is BELOW THE FOLD in a 1280x720 window, and
  //     `click({force: true})` does not scroll — it throws *"Element is
  //     outside of the viewport"*, which a swallowed catch turned into
  //     silence.
  //   · the accordion ANIMATES, so the click must not wait for stability.
  if (!await page.locator("#cardNumber").first().isVisible().catch(() => false)) {
    const cardTab = page.locator('[data-testid="card-accordion-item-button"]').first();
    await cardTab.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
    await cardTab.click({ force: true, timeout: 10000 }).catch(() => {});
    if (!await page.locator("#cardNumber").first().isVisible().catch(() => false)) {
      // THE FALLBACK IS THE DOM'S OWN CLICK, and it is on the ACCORDION only.
      // Playwright's actionability rules and Stripe's animated accordion do
      // not agree, and no combination of force, scroll and timeout settled it.
      // Everything that MATTERS — the card, the expiry, the CVC, the submit —
      // is still typed and pressed the ordinary way. Opening a panel is not
      // the thing under test; the same control was opened by a real hand in a
      // real browser and behaves identically.
      await page.evaluate(() =>
        document.querySelector('[data-testid="card-accordion-item-button"]')?.click());
    }
    await page.waitForSelector("#cardNumber", { state: "visible", timeout: 20000 }).catch(() => {});
  }
  // NAMED, NOT SWALLOWED. An unopened card panel produced *"Payment method
  // Required"* on this file's first two runs, and that reads exactly like a
  // declined card while being nothing of the kind.
  if (!await page.locator("#cardNumber").first().isVisible().catch(() => false)) {
    return { pressed: false, reason: "the card panel never opened; Checkout stayed on its Link/phone step" };
  }
  // ── STRIPE'S "SAVE MY INFORMATION" TICK, AND IT COST A WHOLE RUN ────────
  //
  // It is ON by default, and ticked it reveals a **required Phone number**
  // field that nothing above fills. Stripe then answers the submit with the
  // single word *"Required"* — which reads exactly like a declined card and is
  // nothing of the kind, the same trap as 14.5 finding 3 wearing a different
  // hat. Seen on 2026-09-18 with every card field correctly filled and the
  // phone box ringed red in the screenshot.
  //
  // THE FIRST VERSION OF THIS BLOCK WAS THE BUG. It ran `uncheck` once,
  // immediately, swallowed the failure and never looked again — so on the run
  // where the box had not finished rendering, it silently did nothing and the
  // payment failed four steps later for a reason no artifact named.
  //
  // It now WAITS for the control, unticks it, and READS IT BACK. A tick that
  // will not come off is named here rather than arriving as "Required".
  const pass = page.locator("#enableStripePass").first();
  await pass.waitFor({ state: "attached", timeout: 8000 }).catch(() => {});
  if (await pass.count()) {
    if (await pass.isChecked().catch(() => false)) {
      await pass.uncheck({ force: true }).catch(() => {});
    }
    // THE LABEL IS THE FALLBACK, because that is what a finger hits: Stripe
    // overlays the input and Playwright's own actionability rules refuse the
    // covered box, correctly.
    if (await pass.isChecked().catch(() => false)) {
      await page.locator('label[for="enableStripePass"]').first()
        .click({ force: true, timeout: 5000 }).catch(() => {});
    }
    if (await pass.isChecked().catch(() => false)) {
      // LAST RESORT, AND IT IS THE HONEST ONE: if the tick will not come off,
      // fill what it made required rather than pressing Pay into a red field.
      const phone = page.locator("#phoneNumber, input[type=\"tel\"]").first();
      if (await phone.isVisible().catch(() => false)) await phone.fill("2015550123").catch(() => {});
    }
  }

  await type("#email", "roadmap-14-5@example.com");
  await type("#cardNumber", card);
  await type("#cardExpiry", "12 / 34");
  await type("#cardCvc", "123");
  await type("#billingName", "Roadmap Fourteen Five");
  await type("#billingPostalCode", "90740");

  // READ BACK WHAT IS ACTUALLY IN THE FORM before pressing pay. An empty
  // required field must be named here, by name, rather than arriving as
  // Stripe's one-word "Required" thirty seconds later.
  const filled = await page.evaluate(() => {
    const out = {};
    // `phoneNumber` JOINED THIS LIST ON 2026-09-18. It is the field the
    // "save my information" tick reveals, and it is the reason this readback
    // exists at all: an empty REQUIRED box has to be named here, by name,
    // rather than arriving thirty seconds later as Stripe's word "Required".
    for (const id of ["cardNumber", "cardExpiry", "cardCvc", "billingName", "billingPostalCode", "email", "phoneNumber"]) {
      const el = document.getElementById(id);
      if (el && el.offsetParent) out[id] = el.value ? "filled" : "EMPTY";
    }
    return out;
  });
  const empty = Object.entries(filled).filter(([, v]) => v === "EMPTY").map(([k]) => k);
  if (empty.length) return { pressed: false, reason: `left empty: ${empty.join(", ")}`, filled };

  const submit = page.locator('[data-testid="hosted-payment-submit-button"], button[type="submit"]').first();
  if (!await submit.count()) return { pressed: false, reason: "no submit button on the page" };
  await submit.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
  await submit.click({ force: true, timeout: 15000 });

  // Success leaves checkout.stripe.com for the receipt page; a decline stays
  // put and paints an error. Waiting on the URL is the honest signal — a
  // spinner that never resolves must time out, not pass.
  try {
    await page.waitForURL((u) => !u.href.includes("checkout.stripe.com"), { timeout: 45000 });
    return { pressed: true, left: true, url: page.url(), filled };
  } catch {
    const err = await page.locator('[role="alert"], .Error, [data-testid="error"]').first()
      .textContent().catch(() => null);
    return { pressed: true, left: false, filled, error: (err || "").trim() || "stayed on the checkout page" };
  }
}

/** Polls the row until Stripe's own delivery changes it, or gives up loudly. */
async function waitForWebhook(bookingId, seconds = 120) {
  const until = Date.now() + seconds * 1000;
  let last = null;
  while (Date.now() < until) {
    const { body } = await svc(
      `/rest/v1/bookings?select=payment_status,stripe_payment_intent,paid_online_at&id=eq.${bookingId}`,
    );
    last = Array.isArray(body) ? body[0] : null;
    if (last?.payment_status === "paid") return { ...last, waited: true };
    await sleep(3000);
  }
  return { ...(last || {}), waited: false };
}

// ===========================================================================
console.log("\nROADMAP 14.5 — one payment, end to end" + (BREAK ? `   [SABOTAGE: ${BREAK}]` : ""));
console.log(`  project ${URL_}`);

mkdirSync(ART, { recursive: true });
const artifacts = [];
const keep = (name, data) => {
  const file = new URL(name, ART);
  writeFileSync(file, typeof data === "string" ? data : JSON.stringify(data, null, 2) + "\n");
  artifacts.push("artifacts/e2e-payment/" + name);
};

// Six targets, named up front. `expected` never comes from counting what was
// found — that is the arithmetic `receipt.mjs` exists to check.
const TARGETS = ["connect", "owed", "checkout", "card", "webhook", "money"];
const expected_targets = TARGETS.length;
let discovered = 0, attempted = 0, completed = 0;
const canary = { id: "declined-card-must-not-mark-a-booking-paid", observed_failure: false };

const browser = await chromium.launch({ headless: !HEADED });
// TALL ON PURPOSE. Stripe's Checkout is a long single column, and in a default
// 1280x720 window the card panel's own button sits below the fold — where
// `click({force: true})` throws *"Element is outside of the viewport"* rather
// than scrolling to it.
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });

try {
  // -------------------------------------------------------------------------
  console.log("\n§ 1 — connect: Stripe itself says this detailer can take a card");
  discovered++; attempted++;

  const signin = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify(OWNER),
  }).then((r) => r.json());
  const token = signin.access_token;
  check("the demo owner can sign in", Boolean(token));

  const biz = await svc(`/rest/v1/businesses?select=id,name&slug=eq.${SLUG}`);
  BIZ = biz.body?.[0]?.id ?? null;
  // A MISSING DEMO IS A FAILED RUN, NOT A CONFUSING ONE LATER. Without this
  // the next line creates a booking against `null` and the foreign key says so
  // in Postgres's words, four sections after the actual cause.
  if (!BIZ) throw new Error(`no business with slug "${SLUG}" in ${URL_} — run node scripts/seed-demo.mjs`);
  console.log(`  ..    demo business ${biz.body[0].name} ${BIZ}`);

  // THE ROW IS RE-ATTACHED IF THE DATABASE HAS BEEN RESEEDED, AND THAT TAKES
  // NOTHING AWAY FROM WHAT § 1 PROVES. 14.5 wrote this row by hand and said so;
  // what is being measured here was never who wrote it, but what STRIPE says
  // about the account named in it — `refresh` below asks Stripe and the
  // assertions read Stripe's answer. `acct_1UCMp1JeoZ7g84se` is the Standard
  // test account in this sandbox since 2026-09-08; Stripe's own "blank test
  // account" shortcut returns an account that can never charge (14.5 finding 2).
  const conn = await svc(`/rest/v1/connected_accounts?select=business_id&business_id=eq.${BIZ}`);
  if (!Array.isArray(conn.body) || conn.body.length === 0) {
    console.log("  ..    no connected account on this business — attaching the sandbox test account");
    await svc("/rest/v1/connected_accounts", {
      method: "POST",
      body: JSON.stringify({
        business_id: BIZ,
        stripe_account_id: "acct_1UCMp1JeoZ7g84se",
        charges_enabled: false,          // Stripe decides this, one line below
        card_payments_enabled: false,    // and the detailer's own switch below that
        connected_at: new Date().toISOString(),
      }),
    });
  }

  // `refresh` RE-ASKS STRIPE rather than reading our own row. A stored `true`
  // proves what we wrote down; only Stripe's answer proves what is true.
  const status = await fn("connect-account", { action: "refresh" }, token);
  check("a Stripe account is connected", status.body?.connected === true, JSON.stringify(status.body));
  check("Stripe says it can take charges", status.body?.chargesEnabled === true);

  // THE DETAILER'S OWN SWITCH, AND IT IS OFF ON A FRESH ROW ON PURPOSE —
  // connecting an account must not silently start charging them 2.9%. The
  // product refuses to turn it on unless Stripe already said yes, so this is
  // the product's own gate being used rather than a column being written.
  const ready = status.body?.cardPaymentsEnabled === true
    ? status.body
    : (await fn("connect-account", { action: "toggle", enabled: true }, token)).body;
  keep("connect-status.json", ready);
  check("card payments are switched on", ready?.cardPaymentsEnabled === true, JSON.stringify(ready));
  check("the product calls it ready", ready?.ready === true, ready?.state);
  if (!failures.length) completed++;

  // -------------------------------------------------------------------------
  console.log("\n§ 2 — owed: a finished job the Money screen is chasing");
  discovered++; attempted++;

  const payId = await fixture(PAY);
  const canaryId = await fixture(CANARY);
  check("the fixture booking exists", Boolean(payId));
  check("the canary booking exists", Boolean(canaryId));

  const before = await outstanding();
  keep("outstanding-before.json", before);
  check("the Money screen lists it as waiting on payment", before.ids.includes(payId));
  // THE FIGURE ON THIS ROW, NOT THE TOTAL OF THE LIST. The first version of
  // this assertion read `before.total >= 195`, and the demo's other unpaid
  // jobs make that true whether the row says 195 or 180 — it could not fail,
  // so it proved nothing. Found by sabotaging it and watching it stay green.
  check(
    `the Money screen puts ${money(EXPECT.final)} on it, not the ${money(PAY.total_price)} quote`,
    before.amountFor(payId) === EXPECT.final,
    `it says ${money(before.amountFor(payId))}`,
  );
  const beforeTotal = before.total;
  if (failures.length === 0) completed++;

  // -------------------------------------------------------------------------
  console.log("\n§ 3 — checkout: the deployed pay-booking makes a real Stripe page");
  discovered++; attempted++;

  const pay = await fn("pay-booking", { booking_id: payId });
  keep("pay-booking.json", { status: pay.status, body: pay.body });
  check("pay-booking answered 200", pay.status === 200, JSON.stringify(pay.body));

  const url = String(pay.body?.url || "");
  check(
    "it is a Stripe-hosted checkout page",
    url.startsWith("https://checkout.stripe.com/"),
    url.slice(0, 60),
  );
  // `cs_test_` IS THE PROOF OF TEST MODE, and it is worth asserting rather
  // than trusting: a live key here would take a stranger's real money.
  check("it is Stripe TEST mode", url.includes("/c/pay/cs_test_") || url.includes("cs_test_"), url.slice(0, 80));
  check(
    `it is priced at ${money(EXPECT.final)}`,
    pay.body?.amount_cents === EXPECT.cents,
    `got ${pay.body?.amount_cents}`,
  );

  const row = await svc(`/rest/v1/bookings?select=stripe_session_id&id=eq.${payId}`);
  check("the session id was recorded on the booking", Boolean(row.body?.[0]?.stripe_session_id));
  if (failures.length === 0) completed++;

  // -------------------------------------------------------------------------
  console.log("\n§ 4 — card: the test card is typed into Stripe's own page");
  discovered++; attempted++;

  // SABOTAGE `nopay`: the card is never typed. Nothing about the product
  // changes; the check simply is not handed a payment, and §§ 4, 5 and 6 must
  // all notice. This is the closest thing available to running the check
  // against the defect it was written about, because the defect was never a
  // broken payment — it was that nobody had ever made one.
  const paid = (BREAK === "nopay" || BREAK === "webhook")
    ? { pressed: true, left: true, url: "(sabotage: no payment was made)" }
    : await payOnStripe(page, url, CARD_OK);
  await page.screenshot({ path: new URL("paid.png", ART).pathname.replace(/^\//, ""), fullPage: true })
    .catch(() => {});
  artifacts.push("artifacts/e2e-payment/paid.png");
  keep("card-result.json", paid);
  check("the pay button was pressed", paid.pressed === true, paid.reason || "");
  check("Stripe accepted the card and moved on", paid.left === true, paid.error || "");
  if (failures.length === 0) completed++;

  // -------------------------------------------------------------------------
  console.log("\n§ 5 — webhook: Stripe's own delivery marks the booking paid");
  discovered++; attempted++;

  // SABOTAGE `webhook`: declare the booking paid without waiting for Stripe,
  // AND make no payment at all — the two halves together, because faking this
  // reading while the card really was paid only restates something true. What
  // it asks is whether § 6 can stand on its own when § 5 lies to it.
  const after = BREAK === "webhook"
    ? { payment_status: "paid", stripe_payment_intent: "pi_pretend", paid_online_at: new Date().toISOString() }
    : await waitForWebhook(payId);
  keep("after-webhook.json", after);
  check("the booking is marked paid", after.payment_status === "paid", JSON.stringify(after));
  check("the payment is identified by its Stripe intent", String(after.stripe_payment_intent || "").startsWith("pi_"));
  check("the moment it was paid online is recorded", Boolean(after.paid_online_at));

  const evt = await svc(
    `/rest/v1/stripe_events?select=id,type&order=received_at.desc&limit=5`,
  );
  keep("recent-events.json", evt.body);
  check(
    "a connected-account payment event was recorded",
    Array.isArray(evt.body) && evt.body.some((e) =>
      e.type === "checkout.session.completed" || e.type === "payment_intent.succeeded"),
    JSON.stringify(evt.body),
  );
  if (failures.length === 0) completed++;

  // -------------------------------------------------------------------------
  console.log("\n§ 6 — money: the Money screen moved, by exactly that amount");
  discovered++; attempted++;

  const now = await outstanding();
  keep("outstanding-after.json", now);
  check("the job is gone from waiting-on-payment", !now.ids.includes(payId));
  // SABOTAGE `stale`: compare the after-total against ITSELF rather than
  // against the before-total, which is how a delta check quietly stops
  // measuring anything and reports a movement of zero for ever.
  const moved = (BREAK === "stale" ? now.total : beforeTotal) - now.total;
  check(
    `the outstanding total fell by exactly ${money(EXPECT.final)}`,
    moved === EXPECT.final,
    `it fell by ${money(moved)}`,
  );
  if (failures.length === 0) completed++;

  // -------------------------------------------------------------------------
  console.log("\n§ 7 — THE CANARY: a declined card must NOT mark a booking paid");
  // NOT A TARGET. This is the negative control: the same success test, handed
  // a payment that does not happen. If it comes back green the check is not
  // looking, and `receipt.mjs` refuses the whole run.
  const canaryPay = await fn("pay-booking", { booking_id: canaryId });
  const canaryUrl = String(canaryPay.body?.url || "");
  let canaryPaid = { payment_status: "unknown" };
  if (canaryUrl.startsWith("https://checkout.stripe.com/")) {
    const declined = await payOnStripe(page, canaryUrl, CARD_DECLINED);
    keep("canary-card-result.json", declined);
    // Give Stripe the same chance to deliver as the real one got. 25s is
    // plenty — the successful delivery above arrived in seconds.
    await sleep(25000);
    const { body } = await svc(`/rest/v1/bookings?select=payment_status&id=eq.${canaryId}`);
    canaryPaid = Array.isArray(body) ? (body[0] || {}) : {};
  }
  keep("canary-after.json", canaryPaid);

  // SABOTAGE `canary`: stand in a product where a DECLINED card marks a
  // booking paid. The canary must then report that it did not fail, and
  // `receipt.mjs` must refuse the whole run — every green target beside a
  // blind canary is worthless.
  const canarySawPaid = BREAK === "canary" ? true : canaryPaid.payment_status === "paid";
  canary.observed_failure = !canarySawPaid;
  console.log(canary.observed_failure
    ? `  ok    the declined card left it "${canaryPaid.payment_status}" — the check can tell them apart`
    : `  FAIL  the declined card marked it PAID — this check cannot see a defect handed to it`);
  if (!canary.observed_failure) failures.push("the canary passed: a declined card marked a booking paid");
} finally {
  await browser.close();
}

// ---------------------------------------------------------------------------
const status = failures.length === 0 && completed === expected_targets ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "e2e-payment",
  started_at,
  status,
  expected_targets,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  // Declared here and held to it. 16 is what a clean run executes; lowering it
  // is a visible diff somebody has to justify.
  min_assertions: 16,
  failures,
  artifacts,
  warnings: BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : [],
  dimensions: {
    business: BIZ,
    charged_cents: PAY.cents,
    cards: { paid: "4242…4242", declined: "4000…0002" },
    sabotage: BREAK || null,
  },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${completed}/${expected_targets} targets, ${assertions} assertions, `
  + `${failures.length} failure(s). Receipt ${path}`);
for (const f of failures) console.log("  · " + f);
process.exit(status === "pass" ? 0 : 1);
