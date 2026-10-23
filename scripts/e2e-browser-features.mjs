// ROADMAP 14.6, THE THREE THAT NEED A REAL BROWSER.
//
//   npm run dev --prefix app                          # must be up first
//   node scripts/e2e-browser-features.mjs             # the whole run
//   node scripts/e2e-browser-features.mjs --headed    # watch it happen
//   node scripts/e2e-browser-features.mjs --break=<id>
//   BASE=http://localhost:5181 node scripts/e2e-browser-features.mjs   # another copy of the app
//   node scripts/receipt.mjs receipts/e2e-browser-features.json
//
// ---------------------------------------------------------------------------
// WHY THIS IS A SECOND FILE AND NOT SIX MORE SECTIONS OF THE FIRST
// ---------------------------------------------------------------------------
// `scripts/e2e-ten-features.mjs` covers six of ROADMAP 14.6's ten tables with
// credentials alone and no dev server. These three cannot be done that way,
// and not because it would be inconvenient:
//
// · **`owner_push_subscriptions`** is written from a `PushManager.subscribe()`
//   that only a real browser with a real push service can produce. The row is
//   an endpoint issued by Microsoft or Google; it cannot be invented.
// · **`platform_subscriptions` / `platform_invoices`** need a card typed into
//   **Stripe Elements' iframe** on this product's own Billing screen. The
//   whole point of that screen (Andrew's choice, 2026-09-05) is that the card
//   fields are Stripe's and the frame around them is ours, so confirming a
//   PaymentIntent from Node would skip the only leg that has never run.
//
// Keeping them apart means the six can still be proved on a machine with no
// dev server, and a failure here cannot make those six unreadable.
//
// ---------------------------------------------------------------------------
// IT RUNS IN **EDGE**, AND THAT IS A FINDING RATHER THAN A PREFERENCE
// ---------------------------------------------------------------------------
// Measured on 2026-09-17, in this order:
//
//   · Playwright's bundled Chromium, ordinary context  -> *"Chrome currently
//     does not support the Push API in incognito mode"*, then
//     `AbortError: Registration failed - permission denied`. Every Playwright
//     context is incognito-shaped, so granting the permission does not help.
//   · The same Chromium, `launchPersistentContext` -> the incognito refusal
//     goes away and a second one appears: `Registration failed - push service
//     not available`. Plain Chromium has no Google push credentials compiled
//     in; only Google-branded Chrome does.
//   · `channel: "chrome"` -> not installed on this machine.
//   · **`channel: "msedge"`, persistent profile -> a real subscription on
//     `wns2-by3p.notify.windows.com`**, Microsoft's own push service.
//
// **So a headless push test needs a BRANDED browser and a PERSISTENT profile,
// and neither is optional.** Anybody reading a future failure here should
// check those two things before suspecting the product.
//
// ---------------------------------------------------------------------------
// THE SUBSCRIPTION IS THE BOOKING PLAN, $35/MONTH, ON PURPOSE
// ---------------------------------------------------------------------------
// `planFor` hard-codes `founding: false` for the booking plan, so `subscribe`
// skips `claim_founding_spot` entirely — **this run cannot consume one of the
// three founding spots**, which are released only by hand in the back office.
// Its `term_months` is 0 and its `exit_fee_share` is 0, so the cancel this
// file does at the start of every run is free and charges nothing.
//
// ---------------------------------------------------------------------------
// WHAT THIS LEAVES BEHIND, NAMED RATHER THAN LEFT IMPLIED
// ---------------------------------------------------------------------------
// · **The demo business ends the run subscribed**, `active` on the $35 booking
//   plan, in Stripe TEST mode. Each run cancels the previous subscription
//   first, so they do not pile up.
// · A booking named `ROADMAP 14.6 PUSH`, soft-deleted at the end per ROADMAP
//   0.3, which exists only to make `create-booking` send the notification.
// · **One** `owner_push_subscriptions` row, pointing at a throwaway browser
//   profile that no longer exists by the time the run ends. Each run clears
//   the previous one first, so they do not stack up; in production
//   `sendOwnerPush` prunes an endpoint the push service answers 404 or 410
//   for, which is the same situation arriving the ordinary way.
//
// ---------------------------------------------------------------------------
// THE PUSH SECTION IS THE ONE THAT CAN MISS, AND IT IS NOT THE PRODUCT
// ---------------------------------------------------------------------------
// Over seven runs of unchanged code, five notifications arrived in seconds and
// **two did not arrive inside 36–60 seconds**. The run straight after each
// miss delivered normally, and the diagnostic in § 1 reported the worker
// registered, active, subscribed and permitted at the moment nothing came. The
// variable is Microsoft's push service. **Re-run before investigating** — and
// do not reach for the stale-device-rows theory, which was tried here and is
// wrong: one miss had four stale rows and one had none.

import "../tests/_env.mjs";

import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeReceipt } from "./receipt.mjs";
import { money } from "../app/src/lib/format.js";
import { demoOwner } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const HEADED = process.argv.includes("--headed");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;

// The copy of the app to drive, read from BASE as e2e-booking.mjs does, so the
// audit can point it at its test copy (ROADMAP 101.6). Unset: the dev server.
const APP = process.env.BASE || "http://localhost:5173";
// THE DEMO BUSINESS IS FOUND BY ITS SLUG, NOT BY A UUID WRITTEN DOWN HERE.
// This file carried `def6fa3f-…` until 2026-09-18, when FOUND.md caught it:
// `seed-demo.mjs` rebuilds the demo tenant and a rebuilt row gets a NEW id, so
// the constant was a dead foreign key. A reseed never changes the slug, so the
// id is resolved at run time in § 0. `e2e-payment.mjs` carries the same fix.
const SLUG = "demo-detail";   // Coastline Auto Detailing, the demo
let BIZ = null;
const OWNER = demoOwner();
const TAG = "ROADMAP 14.6";

// Stripe's published test card. It belongs to nobody, exists only in test mode
// and can move no real money.
const CARD_OK = "4242424242424242";

// The booking plan's own figures, from `pricing.js` by way of `planFor`. The
// check asserts the ROW says this, which is the promise the consent sentence
// made. `--break=wrongplan` asks it against the WEBSITE plan's $60 instead —
// the product is untouched and still charges $35, so every place the figure is
// asserted has to go red. A sabotage that only loosens a comparison proves
// nothing; this one changes what is compared against.
const EXPECT = BREAK === "wrongplan"
  ? { plan: "website", recurring_cents: 6000 }
  : { plan: "booking", recurring_cents: 3500 };

const PUSH_DATE = "2026-11-06";
const PUSH_NAME = `${TAG} PUSH`;
// `--break=wrongcustomer` looks in the delivered notification for a name that
// was never booked. Same rule: what is compared changes.
const EXPECT_NAME = BREAK === "wrongcustomer" ? `${TAG} SOMEBODY ELSE` : PUSH_NAME;

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
// ROADMAP 101.6: this used to allow ONLY the platform project, which refused the
// audit's test copy. The project it must never touch is the real business's
// (the ref seed-demo.mjs refuses "under any flag"); the card is Stripe's test card.
if (URL_.includes("adtlnvihwrcqcasqcjwd")) {
  console.error(`\nREFUSED — ${URL_} is the real business's project. This script takes a payment.`);
  console.error("NOTHING ran and NO receipt was written.");
  process.exit(2);
}
// THE DEV SERVER IS CHECKED BEFORE ANYTHING ELSE, because every failure below
// would otherwise be reported as a broken product.
const alive = await fetch(APP).then((r) => r.ok).catch(() => false);
if (!alive) {
  console.error(`\nSKIPPED — nothing is serving ${APP}. Start it with \`npm run dev --prefix app\`.`);
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}

// ---------------------------------------------------------------------------
const svc = async (path, init = {}) => {
  const res = await fetch(URL_ + path, {
    ...init,
    headers: {
      apikey: SERVICE, Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json", ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
};

let TOKEN = null;
/** The detailer's own session — the same JWT the dashboard holds. */
const own = async (path, init = {}) => {
  const res = await fetch(URL_ + path, {
    ...init,
    headers: {
      apikey: ANON, Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json", ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
};

const anon = async (path, init = {}) => {
  const res = await fetch(URL_ + path, {
    ...init,
    headers: { apikey: ANON, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
};

const fn = (name, payload, who = own) =>
  who(`/functions/v1/${name}`, { method: "POST", body: JSON.stringify(payload) });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ===========================================================================
console.log(`\nROADMAP 14.6 — push and the platform subscription${BREAK ? `   [SABOTAGE: ${BREAK}]` : ""}`);
console.log(`  project ${URL_}`);
console.log(`  app     ${APP}`);

const ART = new URL("../artifacts/e2e-browser-features/", import.meta.url);
mkdirSync(ART, { recursive: true });
const artifacts = [];
const keep = (name, data) => {
  writeFileSync(new URL(name, ART), typeof data === "string" ? data : JSON.stringify(data, null, 2) + "\n");
  artifacts.push("artifacts/e2e-browser-features/" + name);
};

const TARGETS = ["push", "subscription", "invoice"];
const expected_targets = TARGETS.length;
let discovered = 0, attempted = 0, completed = 0;
const canary = { id: "a-signed-out-stranger-must-not-subscribe-a-device-or-start-a-plan", observed_failure: false };

const before = {};
for (const t of ["owner_push_subscriptions", "platform_subscriptions", "platform_invoices"]) {
  const r = await fetch(`${URL_}/rest/v1/${t}?select=*`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, Prefer: "count=exact", Range: "0-0" },
  });
  before[t] = Number((r.headers.get("content-range") || "*/0").split("/")[1]) || 0;
}
keep("row-counts-before.json", before);
console.log("  before  " + Object.entries(before).map(([k, v]) => `${k}=${v}`).join("  "));

const failedAt = () => failures.length;
const finish = (marker) => { if (failures.length === marker) completed++; };

// A PERSISTENT PROFILE AND A BRANDED BROWSER — see the header. A throwaway
// directory, so each run is a clean device rather than one that remembers
// yesterday's permission.
const profile = mkdtempSync(join(tmpdir(), "roadmap-14-6-"));
const ctx = await chromium.launchPersistentContext(profile, {
  headless: !HEADED,
  channel: "msedge",
  viewport: { width: 1280, height: 1400 },
});
await ctx.grantPermissions(["notifications"], { origin: APP });

try {
  // -------------------------------------------------------------------------
  console.log("\n§ 0 — the demo owner signs in, through the real form");
  const signin = await anon("/auth/v1/token?grant_type=password", {
    method: "POST", body: JSON.stringify(OWNER),
  });
  TOKEN = signin.body?.access_token || null;
  if (!TOKEN) throw new Error("the demo owner could not sign in — run `node scripts/seed-demo.mjs`");

  // THE DEMO'S ID, READ FROM THE SLUG RATHER THAN WRITTEN DOWN. A missing demo
  // is a failed run here, not a confusing foreign-key error five sections later.
  const bizRow = await svc(`/rest/v1/businesses?select=id,name&slug=eq.${SLUG}`);
  BIZ = bizRow.body?.[0]?.id ?? null;
  if (!BIZ) throw new Error(`no business with slug "${SLUG}" in ${URL_} — run node scripts/seed-demo.mjs`);
  console.log(`  ok    demo business ${bizRow.body[0].name} ${BIZ}`);

  const page = await ctx.newPage();
  page.on("console", (m) => {
    const txt = m.text();
    if (m.type() === "error" && !/favicon|manifest|lazily/i.test(txt)) console.log("  [page error]", txt.slice(0, 200));
  });
  await page.goto(`${APP}/app`, { waitUntil: "domcontentloaded" });
  await page.fill("input[type=email]", OWNER.email);   // mail-sink: a dashboard login, never a recipient
  await page.fill("input[type=password]", OWNER.password);
  await page.click("form button.btn.primary");
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  console.log("  ok    signed in, in the browser and over the API");

  // -------------------------------------------------------------------------
  console.log("\n§ 1 — owner_push_subscriptions: this device registers, and a booking lights it up");
  discovered++; attempted++;
  let mark = failedAt();
  {
    // EVERY EARLIER RUN'S DEVICE IS GONE, SO ITS ROW IS A DEAD ENDPOINT. Each
    // run uses a throwaway browser profile; leaving the rows behind means
    // `sendOwnerPush` walks a growing stack of endpoints that answer nobody.
    // This is fixture housekeeping and nothing more — § 1 registers THIS run's
    // device the real way, through the browser.
    //
    // **IT IS NOT A FIX FOR THE FLAKE BELOW, AND SAYING SO WAS A GUESS THAT
    // TURNED OUT WRONG.** Delivery was missed twice in six runs, once with
    // four stale rows and once with none, and it arrived in seconds on the
    // other four. **The variable is the push service, not this repo** —
    // Windows takes as long as it takes. The wait is 60 seconds for that
    // reason, and a miss here is worth re-running before it is worth
    // investigating.
    await svc(`/rest/v1/owner_push_subscriptions?business_id=eq.${BIZ}`, { method: "DELETE" });

    const probe = await fn("owner-push-subscribe", { probe: true });
    const key = probe.body?.public_key || null;
    check("the server hands out a VAPID public key", Boolean(key),
      "no OWNER_VAPID_PUBLIC_KEY on this project");

    // THE BROWSER'S OWN SUBSCRIPTION. `lib/push.js` does exactly this, in this
    // order, and the order is load-bearing: the permission prompt is asked
    // LAST, after the worker is registered and the key is in hand, because a
    // browser only offers one prompt per site per decision.
    // SABOTAGE `nopush`: never subscribe. The row must not appear and the
    // notification must never arrive.
    const sub = BREAK === "nopush" ? { skipped: true } : await page.evaluate(async (k) => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        const padded = (k + "=".repeat((4 - (k.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
        const bytes = Uint8Array.from([...atob(padded)].map((c) => c.charCodeAt(0)));
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return { error: `permission ${permission}` };
        const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
        return s.toJSON();
      } catch (e) { return { error: String(e) }; }
    }, key);
    keep("push-subscription.json", sub.endpoint ? { ...sub, endpoint: sub.endpoint.slice(0, 60) + "…" } : sub);
    check("the browser got a real push endpoint", typeof sub.endpoint === "string" && sub.endpoint.startsWith("https://"),
      sub.error || JSON.stringify(sub).slice(0, 160));

    if (sub.endpoint) {
      const stored = await fn("owner-push-subscribe", { business_id: BIZ, subscription: sub });
      check("owner-push-subscribe stored it", stored.body?.success === true, JSON.stringify(stored.body).slice(0, 160));
    }
    const rows = await svc(`/rest/v1/owner_push_subscriptions?select=endpoint,user_agent&business_id=eq.${BIZ}`);
    check("this business now has a registered device",
      Array.isArray(rows.body) && rows.body.length > 0, `${(rows.body || []).length} rows`);

    // CONSEQUENCE — AND IT IS THE WHOLE FEATURE. A customer books; the
    // detailer's device shows a notification. `create-booking` calls
    // `sendOwnerPush`, Microsoft delivers it, `app/public/sw.js` paints it.
    // Nothing short of this proves the loop.
    await svc("/rest/v1/rate_hits?bucket=like.booking%25", { method: "DELETE" });
    await svc(`/rest/v1/bookings?business_id=eq.${BIZ}`
      + `&customer_name=eq.${encodeURIComponent(PUSH_NAME)}&deleted_at=is.null`,
      { method: "PATCH", body: JSON.stringify({ deleted_at: new Date().toISOString() }) });
    const service = await svc(`/rest/v1/services?business_id=eq.${BIZ}&select=id&is_active=eq.true&limit=1`);
    const booked = await fn("create-booking", {
      business_slug: SLUG, customer_name: PUSH_NAME, customer_phone: "562-555-0147",
      customer_email: "roadmap-14-6@example.com", customer_address: "1 Test St, Seal Beach, CA",
      service_type: "dropoff", vehicle_size: "medium", service_ids: [service.body?.[0]?.id],
      booking_date: PUSH_DATE, start_time: "11:00",
    }, anon);
    check("a customer booked the job that should raise the alert", booked.status === 200,
      `${booked.status} ${JSON.stringify(booked.body).slice(0, 160)}`);

    // POLLED, NEVER SLEPT ON. A fixed wait either wastes the time or is short
    // by one second on the day the push service is busy.
    let notes = [];
    let why = null;
    for (let i = 0; i < 40 && notes.length === 0; i++) {
      // THE EMPTY ANSWER AND THE MISSING WORKER MUST NOT LOOK THE SAME. The
      // first version returned `[]` for both, so "no notification arrived" and
      // "there is no service worker on this page to ask" were one message.
      const seen = await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration("/");
        if (!reg) return { reg: false, notes: [] };
        const sub = await reg.pushManager.getSubscription();
        return {
          reg: true,
          scope: reg.scope,
          active: Boolean(reg.active),
          subscribed: Boolean(sub),
          permission: Notification.permission,
          notes: (await reg.getNotifications()).map((n) => ({ title: n.title, body: n.body, tag: n.tag })),
        };
      });
      notes = seen.notes || [];
      why = seen;
      if (notes.length === 0) await sleep(1500);
    }
    keep("push-notification.json", { notes, state: { ...why, notes: undefined } });
    check("the detailer's device showed a notification", notes.length > 0, "nothing arrived in 60 seconds");
    check("it names the customer who booked",
      notes.some((n) => String(n.body || "").includes(EXPECT_NAME)),
      JSON.stringify(notes).slice(0, 200));
    check("and it carries the booking's own tag, so a second alert replaces it",
      notes.some((n) => /^booking-[0-9a-f-]{36}$/.test(String(n.tag || ""))),
      JSON.stringify(notes.map((n) => n.tag)));
  }
  finish(mark);

  // -------------------------------------------------------------------------
  console.log("\n§ 2 — platform_subscriptions: the detailer pays US, on our own card form");
  discovered++; attempted++;
  mark = failedAt();
  let subRow = null;
  {
    // START FROM NOTHING, THROUGH THE PRODUCT'S OWN DOOR. A second `subscribe`
    // beside a live one would make a second Stripe subscription; `cancel` is
    // free on this plan (`term_months` 0, `exit_fee_share` 0) so the run costs
    // nothing to repeat. The ROW is then cleared as a fixture — that is
    // housekeeping, not a feature's row, and § 2 refills it the real way.
    const existing = await svc(`/rest/v1/platform_subscriptions?select=*&business_id=eq.${BIZ}`);
    if (existing.body?.[0]) {
      const gone = await fn("platform-billing", { action: "cancel" });
      console.log(`  note  cancelled the previous subscription (${gone.status})`);
      await svc(`/rest/v1/platform_subscriptions?business_id=eq.${BIZ}`, { method: "DELETE" });
    }

    await page.goto(`${APP}/app?settings=billing`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-billing-rung]", { timeout: 30000 });
    const rungs = await page.locator("[data-billing-rung]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-billing-rung")));
    check("the Billing screen offers the plans", rungs.includes("booking"), JSON.stringify(rungs));

    // NOTHING IS PRE-SELECTED AND NOTHING IS PRE-TICKED, which is the screen's
    // own rule; both are pressed here exactly as a detailer presses them.
    await page.click('[data-billing-rung="booking"]');
    await page.waitForTimeout(400);
    await page.check("[data-billing-consent]");
    const consent = await page.locator("[data-billing-consent]").locator("xpath=../span").textContent().catch(() => "");
    keep("consent-sentence.txt", String(consent).trim() + "\n");
    check("the consent sentence names the figure the row will carry",
      String(consent).includes(money(EXPECT.recurring_cents / 100)),
      String(consent).slice(0, 140));

    const go = page.locator("button.btn.primary", { hasText: /Continue to payment/ }).last();
    await go.click();
    await page.waitForSelector("[data-billing-card] iframe", { timeout: 45000 });
    console.log("  ok    Stripe's own card fields appeared, inside our card");

    // THE ROW EXISTS BEFORE THE CARD IS TYPED, and that is deliberate in the
    // product: with our own form the subscription exists before a number is
    // entered, so `cancel` can find it if the detailer closes the tab.
    const incomplete = await svc(`/rest/v1/platform_subscriptions?select=*&business_id=eq.${BIZ}`);
    subRow = incomplete.body?.[0] || null;
    check("the subscription row was written before the card was typed",
      subRow?.status === "incomplete", String(subRow?.status));
    check(`it says the ${EXPECT.plan} plan`, subRow?.plan === EXPECT.plan, String(subRow?.plan));
    check(`at ${money(EXPECT.recurring_cents / 100)} a month`,
      Number(subRow?.recurring_cents) === EXPECT.recurring_cents, String(subRow?.recurring_cents));
    check("and it records the words the detailer ticked",
      typeof subRow?.consent_text === "string" && subRow.consent_text.length > 20,
      String(subRow?.consent_text).slice(0, 80));

    // SABOTAGE `nopay`: the card is never typed. Nothing about the product
    // changes; the check is simply not handed a payment, and §§ 2 and 3 must
    // both notice — the row must stay `incomplete` and no invoice can exist.
    let typed = { filled: [], missing: ["(sabotage: the card was never typed)"] };
    if (BREAK !== "nopay") typed = await fillStripeElements(page);
    keep("card-fields.json", typed);
    check("every card field Stripe asked for was filled", typed.missing.length === 0,
      JSON.stringify(typed).slice(0, 200));

    if (BREAK !== "nopay") {
      // THE LAST THING A PERSON READS BEFORE PAYING IS THE FIGURE — the
      // screen's own rule, and worth asserting because it is the sentence the
      // consent tick was given against.
      const pay = page.getByRole("button", { name: /^Pay \$/ }).last();
      await pay.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
      const label = (await pay.textContent().catch(() => "")) || "";
      check("the button's last word before paying is the amount",
        label.includes(money(EXPECT.recurring_cents / 100)), label);
      await pay.click({ timeout: 15000 });

      // **THE PRESS IS VERIFIED, NOT ASSUMED, AND THAT IS THIS FILE'S OWN
      // SCAR.** The first version clicked a `button.btn.primary` chosen by
      // `hasText` and never checked that anything happened; `confirm()` opens
      // with `if (!stripeRef.current) return;`, so a press that arrives one
      // beat early does NOTHING AT ALL — no error, no spinner, no navigation.
      // The run then failed sixty seconds later with *"the subscription went
      // active: incomplete"*, which reads like a broken product and was a
      // check that never pressed the button.
      //
      // Three endings are possible and all three are proof the press landed:
      // Stripe navigates away to `return_url` (success or 3-D Secure), the
      // label turns into "One moment" while it is in flight, or the screen
      // paints a refusal. Anything else is the silent return above.
      let landed = null;
      for (let i = 0; i < 20 && !landed; i++) {
        if (!page.url().includes("settings=billing") || !page.url().startsWith(APP)) {
          landed = `Stripe took the browser to ${page.url().slice(0, 60)}`;
        } else {
          const now = (await pay.textContent().catch(() => "")) || "";
          const err = await page.locator(".error-box").last().textContent().catch(() => null);
          if (/One moment/i.test(now)) landed = "the button said One moment";
          else if (err && err.trim()) landed = `the screen said "${err.trim().slice(0, 80)}"`;
        }
        if (!landed) await sleep(500);
      }
      keep("pay-press.json", { label, landed, url: page.url().slice(0, 100) });
      check("pressing Pay actually did something", Boolean(landed),
        "the button was pressed and nothing changed — confirm() returned at its `if (!stripeRef.current)` guard");
    }

    // POLLED. Stripe confirms, then the webhook turns `invoice.paid` into an
    // active row — two hops, neither of them instant.
    let row = subRow;
    for (let i = 0; i < 30 && row?.status !== "active"; i++) {
      await sleep(2000);
      const r = await svc(`/rest/v1/platform_subscriptions?select=*&business_id=eq.${BIZ}`);
      row = r.body?.[0] || row;
    }
    subRow = row;
    keep("subscription-row.json", row);
    // Viewport frame, not fullPage: fullPage paints a position: fixed element in the wrong place (ROADMAP 9.11d).
    await page.screenshot({ path: new URL("billing.png", ART).pathname.replace(/^\//, "") })
      .catch(() => {});
    artifacts.push("artifacts/e2e-browser-features/billing.png");
    check("the subscription went active", row?.status === "active", String(row?.status));
    check("Stripe's own subscription id is on the row",
      String(row?.stripe_subscription_id || "").startsWith("sub_"), String(row?.stripe_subscription_id));
    check("and the next charge date came back from Stripe", Boolean(row?.current_period_end),
      String(row?.current_period_end));
  }
  finish(mark);

  // -------------------------------------------------------------------------
  console.log("\n§ 3 — platform_invoices: the document for the money that moved");
  discovered++; attempted++;
  mark = failedAt();
  {
    // **THIS RUN'S INVOICE, NOT ANY INVOICE, AND THE FIRST VERSION GOT THAT
    // WRONG.** It asked whether the business had an invoice at all and took
    // the newest one — so with `--break=nopay`, where no payment is made and
    // no invoice can be created, § 3 went GREEN on the invoice a previous run
    // had left behind. Three assertions that could not fail, found by the
    // sabotage rather than by reading, which is the whole reason for running
    // one. It is `created_at` after this run began, and there is nothing older
    // for it to fall back on.
    //
    // The row carries no `stripe_subscription_id`, which is why the check is
    // the timestamp: asking about a column that is not there is how the old
    // "and it belongs to the subscription that was just paid" line managed to
    // be true whatever happened.
    let inv = [];
    for (let i = 0; i < 20 && inv.length === 0; i++) {
      const r = await svc(`/rest/v1/platform_invoices?select=*&business_id=eq.${BIZ}`
        + `&created_at=gt.${encodeURIComponent(started_at)}&order=created_at.desc&limit=5`);
      inv = Array.isArray(r.body) ? r.body : [];
      if (inv.length === 0) await sleep(2000);
    }
    const all = await svc(`/rest/v1/platform_invoices?select=number,status,amount_cents,created_at`
      + `&business_id=eq.${BIZ}&order=created_at.desc&limit=5`);
    keep("invoices.json", { since: started_at, thisRun: inv, fiveMostRecent: all.body });
    check("an invoice was recorded BY THIS RUN", inv.length > 0,
      `none since ${started_at}; the business has ${(all.body || []).length} older ones`);
    const paid = inv.find((r) => String(r.status) === "paid") || inv[0] || {};
    check("it is marked paid", String(paid.status) === "paid", String(paid.status));
    check(`it is for ${money(EXPECT.recurring_cents / 100)}`,
      Number(paid.amount_paid_cents ?? paid.amount_cents ?? paid.total_cents) === EXPECT.recurring_cents,
      JSON.stringify(paid).slice(0, 200));
    // Stripe's own numbering, which is what a detailer would quote back to us.
    check("and it carries Stripe's own invoice number",
      /^[A-Z0-9]+-\d+$/.test(String(paid.number || "")), String(paid.number));
  }
  finish(mark);

  // -------------------------------------------------------------------------
  console.log("\n§ 4 — THE CANARY: a signed-out stranger must not be able to do either of these");
  // NOT A TARGET. Every row above is offered as proof that THE DETAILER did
  // it. If a stranger can register a device against this business, or start a
  // subscription in its name, the greens above prove only that the endpoints
  // answer.
  {
    const device = await fn("owner-push-subscribe", {
      business_id: BIZ,
      subscription: { endpoint: "https://example.invalid/stranger", keys: { p256dh: "x", auth: "y" } },
    }, anon);
    const plan = await fn("platform-billing", { action: "subscribe", plan: "booking", term: "monthly" }, anon);
    keep("canary-stranger.json", { push: device.status, billing: plan.status });
    // SABOTAGE `canary`: stand in a product where both endpoints are open.
    const strangerGotIn = BREAK === "canary" ? true : (device.status < 300 || plan.status < 300);
    canary.observed_failure = !strangerGotIn;
    console.log(canary.observed_failure
      ? `  ok    the stranger was refused by both (push ${device.status}, billing ${plan.status})`
      : `  FAIL  a stranger got in (push ${device.status}, billing ${plan.status})`);
    if (!canary.observed_failure) {
      failures.push("the canary passed: a signed-out stranger could register a device or start a plan");
    }
  }
} catch (err) {
  failures.push(`the run stopped: ${err.message}`);
  console.error(`\n  FAIL  ${err.message}`);
} finally {
  // THE FIXTURE BOOKING IS FLAGGED AND SOFT-DELETED, never removed — ROADMAP
  // 0.3 — and `deleted_at` drops it out of every screen's own query.
  await svc(`/rest/v1/bookings?business_id=eq.${BIZ}`
    + `&customer_name=eq.${encodeURIComponent(PUSH_NAME)}&deleted_at=is.null`,
    { method: "PATCH", body: JSON.stringify({ deleted_at: new Date().toISOString() }) }).catch(() => {});
  await ctx.close();
}

/**
 * Types Stripe's test card into the Payment Element's iframe.
 *
 * DEFENSIVE ABOUT WHICH FIELDS ARE THERE, NEVER ABOUT THE OUTCOME. Stripe
 * varies the set by account and country — postal code, country and the name
 * field come and go — so each is filled only if present, and what is MISSING
 * is reported by name. `e2e-payment.mjs` learned this the hard way on the
 * hosted page: an unfilled required field came back as the single word
 * *"Required"*, naming neither the field nor the cause.
 */
async function fillStripeElements(page) {
  const filled = [], missing = [];
  // FIND THE FRAME BY WHAT IS IN IT, NEVER BY ITS URL. Stripe puts a dozen
  // iframes on this page and several of them match `elements-inner`; the card
  // fields live in `elements-inner-accessory-target-<digits>` today and the
  // suffix is not stable. Picking a frame by name filled nothing and reported
  // *"the card itself was never entered"* — correctly, and about the wrong
  // frame. So: ask each Stripe frame whether it HAS the number input.
  let frame = null;
  for (let attempt = 0; attempt < 20 && !frame; attempt++) {
    for (const f of page.frames()) {
      if (!/stripe/.test(f.url())) continue;
      const has = await f.locator("#payment-numberInput, input[name=\"number\"]").count().catch(() => 0);
      if (has > 0) { frame = f; break; }
    }
    if (!frame) await sleep(1000);
  }
  if (!frame) return { filled, missing: ["no Stripe frame on the page carries a card number field"] };

  // Stripe names these `#payment-numberInput` and friends. `[name=…]` is the
  // older shape and both have been served to this project.
  const want = [
    ["number", CARD_OK],
    ["expiry", "12 / 34"],
    ["cvc", "123"],
    ["postalCode", "90740"],
  ];
  for (const [name, value] of want) {
    const el = frame.locator(`#payment-${name}Input, input[name="${name}"]`).first();
    const there = await el.count().then((n) => n > 0).catch(() => false);
    if (!there) continue;                  // absent by account configuration
    if (!await el.isVisible().catch(() => false)) continue;
    await el.fill(value).catch(() => {});
    const got = await el.inputValue().catch(() => "");
    if (got.trim()) filled.push(name); else missing.push(name);
  }
  // THE NUMBER IS NOT OPTIONAL. Everything else can legitimately be absent by
  // account or country; a card form with no card number in it is a failed run,
  // not a short one.
  if (!filled.includes("number")) missing.push("number (the card itself was never entered)");
  return { filled, missing };
}

// ---------------------------------------------------------------------------
const after = {};
for (const t of Object.keys(before)) {
  const r = await fetch(`${URL_}/rest/v1/${t}?select=*`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, Prefer: "count=exact", Range: "0-0" },
  });
  after[t] = Number((r.headers.get("content-range") || "*/0").split("/")[1]) || 0;
}
keep("row-counts-after.json", after);
console.log("\n  after   " + Object.entries(after).map(([k, v]) => `${k}=${v}`).join("  "));
for (const [t, n] of Object.entries(after)) {
  assertions++;
  if (n > 0) console.log(`  ok    ${t} is no longer empty (${n})`);
  else { failures.push(`${t} is still at zero rows`); console.error(`  FAIL  ${t} is still at zero rows`); }
}

const status = failures.length === 0 && completed === expected_targets ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "e2e-browser-features",
  started_at,
  status,
  expected_targets,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 20,
  failures,
  artifacts,
  warnings: BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : [],
  dimensions: {
    business: BIZ,
    browser: "msedge, persistent profile — see the header for why neither is optional",
    plan: EXPECT.plan,
    charged_cents: EXPECT.recurring_cents,
    card: "4242…4242",
    rows_before: before,
    rows_after: after,
    sabotage: BREAK || null,
  },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${completed}/${expected_targets} targets, ${assertions} assertions, `
  + `${failures.length} failure(s). Receipt ${path}`);
for (const f of failures) console.log("  · " + f);
process.exit(status === "pass" ? 0 : 1);
