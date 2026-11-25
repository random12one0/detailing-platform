// ISSUE #2 — THE PUBLIC CHECKOUT, WALKED IN A REAL BROWSER.
//
//   npm run dev --prefix app          (localhost:5173, wired to the sandbox backend)
//   node scripts/checkout-walk.mjs
//
// /pricing (390x844) → plan button → throwaway sign-up → create the business →
// Billing with the plan chosen → Stripe's embedded card form, test card
// 4242 4242 4242 4242 → return → "Payment received" → the pause lifts and the
// dashboard is usable. Screenshots go to out/checkout-walk/ (gitignored).
//
// SAFETY: only ever local (refuses any ORIGIN that is not localhost), only the
// platform's own database, only a sk_test_ Stripe key. Stripe's return URL is
// the production address; this script reroutes that ONE navigation back to
// localhost inside the browser, so nothing is sent to detailingplatform.com.
// Teardown (finally + SIGINT/SIGTERM): cancels the sandbox subscription,
// deletes its customer, the business and the user.

import "../tests/_env.mjs";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sink } from "../tests/_mail.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const REF = "kguqylyzgyzfktkfnhjb";
const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SK = process.env.STRIPE_SECRET_KEY || "";
const ORIGIN = process.env.WALK_ORIGIN || "http://localhost:5173";
const OUT = fileURLToPath(new URL("../out/checkout-walk/", import.meta.url));

if (!URL_?.includes(REF) || !SERVICE) { console.error("NOT RUN — needs the platform's own SUPABASE_URL and service key."); process.exit(1); }
if (!SK.startsWith("sk_test_")) { console.error("NOT RUN — needs a sandbox STRIPE_SECRET_KEY."); process.exit(1); }
if (!/^http:\/\/localhost[:/]/.test(ORIGIN + "/")) { console.error("NOT RUN — this walk types a card; local dev server only."); process.exit(1); }

mkdirSync(OUT, { recursive: true });
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const rest = async (p, init = {}) => {
  const r = await fetch(`${URL_}/rest/v1/${p}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const t = await r.text();
  return t ? JSON.parse(t) : null;
};
const stripe = async (path, method = "GET") => {
  const r = await fetch(`https://api.stripe.com/v1${path}`, { method, headers: { Authorization: `Bearer ${SK}` } });
  return r.json().catch(() => ({}));
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tag = Math.random().toString(36).slice(2, 8);
const EMAIL = sink(`checkout-walk-${tag}`);
const PASSWORD = `Aa1!${crypto.randomUUID()}`;
const NAME = `Checkout Walk ${tag.toUpperCase()}`;
const SLUG = `checkout-walk-${tag}`;

const results = [];
const step = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok || !detail ? "" : ` — ${detail}`}`);
  return ok;
};

let browser;
// Removes this run's fixtures AND any `checkout-walk-*` a killed run left behind.
async function teardown() {
  for (const biz of (await rest("businesses?slug=like.checkout-walk-*&select=id")) ?? []) {
    const sub = (await rest(`platform_subscriptions?business_id=eq.${biz.id}&select=stripe_subscription_id,stripe_customer_id`))?.[0];
    if (sub?.stripe_subscription_id) await stripe(`/subscriptions/${sub.stripe_subscription_id}`, "DELETE");
    if (sub?.stripe_customer_id) await stripe(`/customers/${sub.stripe_customer_id}`, "DELETE");
    await rest(`businesses?id=eq.${biz.id}`, { method: "DELETE" });
  }
  const users = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: H })).json();
  for (const u of (users.users ?? []).filter((x) => x.email?.includes("checkout-walk-"))) await fetch(`${URL_}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H });
  await browser?.close().catch(() => {});
  const gone = !(await rest("businesses?slug=like.checkout-walk-*&select=id"))?.length;
  step("Z · teardown: business, user and sandbox subscription removed", gone);
}
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, async () => { await teardown(); process.exit(1); });

let n = 0;
const shot = async (page, name) => { await page.screenshot({ path: `${OUT}${String(++n).padStart(2, "0")}-${name}.png`, fullPage: false }); };

try {
  browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  // Stripe sends the browser to the PRODUCTION return address; bring that one hop home.
  await ctx.route("https://detailingplatform.com/**", (route) => {
    const u = new URL(route.request().url());
    route.fulfill({ status: 302, headers: { location: `${ORIGIN}${u.pathname}${u.search}` } });
  });

  // The waiting card can be on screen for under a second (the webhook is fast), so a
  // look after the fact misses it. This records, across the reload, that it was ever drawn.
  await ctx.addInitScript(() => {
    new MutationObserver(() => {
      if (document.querySelector("[data-checkout-wait]")) try { sessionStorage.setItem("sawWait", document.querySelector("[data-checkout-wait]").innerText.slice(0, 60)); } catch {}
    }).observe(document, { childList: true, subtree: true });
  });
  console.log(`walk ${tag} at ${ORIGIN}`);
  await page.goto(`${ORIGIN}/pricing`, { waitUntil: "domcontentloaded" });
  await shot(page, "pricing");
  const planLink = page.locator('a[href*="plan=website"][href*="term=monthly"]').first();
  const href = await planLink.getAttribute("href");
  await planLink.click();
  await page.waitForURL(/\/app\?plan=/);
  step("1 · /pricing plan button leads to sign-up carrying the plan", /plan=website/.test(page.url()), page.url());

  await page.getByRole("heading", { name: /create your account|Create your account/i }).or(page.getByText("Create your account")).first().waitFor();
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await shot(page, "signup");
  await page.locator("form button[type=submit], form .btn.primary").last().click();

  await page.getByText("Your business", { exact: true }).waitFor({ timeout: 30000 });
  step("2 · sign-up lands in business creation (no confirmation wall)", true);
  await page.locator("form input").first().fill(NAME);
  await shot(page, "create-business");
  await page.locator("form button[type=submit], form .btn.primary").last().click();

  await page.waitForURL(/settings=billing/, { timeout: 30000 });
  step("3 · business created, lands on Billing with the plan in the address", /plan=website/.test(page.url()), page.url());
  const consent = page.locator("[data-billing-consent]");
  await consent.waitFor({ timeout: 30000 });
  await shot(page, "billing-preselected");
  // What the customer is shown before agreeing (issue #27): the consent sentence's first two dollar figures.
  const consentText = await page.locator("label", { has: consent }).first().innerText();
  const shownCents = (consentText.match(/\$[\d,]+(?:\.\d\d)?/g) || []).slice(0, 2).map((d) => Math.round(parseFloat(d.replace(/[$,]/g, "")) * 100));
  await consent.check();
  await page.getByRole("button", { name: /Continue to payment/ }).click();
  const card = page.locator("[data-billing-card] iframe").first();
  await card.waitFor({ timeout: 30000 });
  await sleep(3000);
  step("4 · Stripe's card form appears in the page", true);

  const payBtn = await page.locator("button.btn.primary", { hasText: /^Pay / }).first().innerText();
  const payCents = Math.round(parseFloat(payBtn.replace(/[^0-9.]/g, "")) * 100);
  step("4b · the Pay button equals the consent figures (build + first charge)", shownCents.length === 2 && payCents === shownCents[0] + shownCents[1], `consent ${shownCents} · button ${payBtn}`);

  const f = page.frameLocator("[data-billing-card] iframe").first();
  await f.getByText("Card", { exact: true }).first().click().catch(() => {}); await sleep(1500);
  await f.locator('[name="number"]').fill("4242424242424242");
  await f.locator('[name="expiry"]').fill("12 / 34");
  await f.locator('[name="cvc"]').fill("123");
  const zip = f.locator('[name="postalCode"]');
  if (await zip.count()) await zip.fill("94103");
  await sleep(1500);
  await page.locator("[data-billing-card]").scrollIntoViewIfNeeded();
  await shot(page, "card-filled");

  page.on("response", (r) => { if (/api\.stripe\.com.*(confirm|payment_intents)/.test(r.url())) console.log("        stripe", r.request().method(), r.status(), r.url().split("?")[0].slice(-60)); });
  // THE WEBHOOK IS FASTER THAN THE RETURN TRIP, so on its own the waiting card is gone
  // before a screenshot can catch it. To test the card AND its polling, the dashboard's
  // read of the business is served stale (still paused) for 10 s after the return; the
  // card must show, then lift by itself once the real row is read again.
  let staleUntil = 0;
  await ctx.route("**/rest/v1/businesses?*", async (route) => {
    if (Date.now() > staleUntil || route.request().method() !== "GET") return route.continue();
    const res = await route.fetch();
    const rows = await res.json().catch(() => null);
    const patch = (b) => (b && typeof b === "object" ? { ...b, status: "paused", awaiting_first_payment: true } : b);
    return route.fulfill({ response: res, json: Array.isArray(rows) ? rows.map(patch) : patch(rows) });
  });
  const back = page.waitForURL(/checkout=done/, { timeout: 60000 });
  back.catch(() => {});
  staleUntil = Infinity;
  // A click that lands while Stripe's panel is still settling does nothing (seen 3 runs in 5), so retry until Stripe has been asked.
  let confirmed = false;
  page.on("request", (r) => { if (/payment_intents\/.*\/confirm/.test(r.url())) confirmed = true; });
  for (let i = 0; i < 4 && !confirmed; i++) {
    await page.locator("button.btn.primary", { hasText: /^Pay / }).click();
    await sleep(5000);
  }
  await page.waitForURL(/checkout=done/, { timeout: 5000 }).catch(() => {});
  staleUntil = Date.now() + 10000;
  await back.catch(async (e) => {
    const box = await page.locator(".error-box").allInnerTexts();
    console.log("        after Pay: url", page.url(), "| error box:", JSON.stringify(box), "| button:", await page.locator("button.btn.primary").last().innerText());
    console.log("        console:", consoleErrors.slice(0, 4).join(" | "));
    throw e;
  });
  step("5 · Stripe accepts the test card and returns with checkout=done", true, page.url());
  await page.locator("[data-checkout-wait]").waitFor({ timeout: 8000 }).catch(() => {});
  await shot(page, "returned");
  const saw = await page.evaluate(() => sessionStorage.getItem("sawWait")).catch(() => null);
  step("6 · \"Payment received\" card was drawn on return", /Payment received/.test(saw || ""), `saw: ${saw}`);

  const lifted = await page.locator("[data-checkout-wait]").waitFor({ state: "detached", timeout: 90000 }).then(() => true, () => false);
  await shot(page, "after-wait");
  step("7 · the waiting card goes away by itself", lifted);

  const biz = (await rest(`businesses?slug=eq.${SLUG}&select=status,awaiting_first_payment`))?.[0];
  step("8 · business is no longer paused", biz?.status === "active" && !biz?.awaiting_first_payment, JSON.stringify(biz));
  const bizId = (await rest(`businesses?slug=eq.${SLUG}&select=id`))?.[0]?.id;
  const subRow = (await rest(`platform_subscriptions?business_id=eq.${bizId}&select=setup_cents,recurring_cents`))?.[0];
  const chargedCents = subRow ? [subRow.setup_cents, subRow.recurring_cents] : [];
  step("8b · the amounts in the consent box are the amounts charged", chargedCents.length === 2 && JSON.stringify(chargedCents) === JSON.stringify(shownCents), `shown ${shownCents} · charged ${chargedCents}`);
  const paused = await page.getByText(/paused|awaiting/i).count();
  await page.goto(`${ORIGIN}/app`, { waitUntil: "domcontentloaded" });
  await sleep(1500);
  await shot(page, "dashboard");
  const usable = await page.locator("nav, [role=tablist], .tabbar, .tabs").first().isVisible().catch(() => false);
  step("9 · dashboard opens and is usable (navigation visible)", usable, `paused-text matches before navigating: ${paused}`);

  step("10 · no browser console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
} catch (e) {
  step(`crashed: ${String(e.message).split("\n")[0]}`, false);
  try { const p = browser?.contexts()[0]?.pages()[0]; if (p) await shot(p, "crash"); } catch {}
} finally {
  await teardown();
}
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
