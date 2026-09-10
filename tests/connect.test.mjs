// A DETAILER TAKING CARDS — roadmap 2.20 stage 3.
//
// WHAT THIS IS HERE TO HOLD, in the order it would hurt:
//
//   1. WHOSE ACCOUNT THE MONEY LANDS IN. `Stripe-Account: acct_…` is one
//      option on one call, and forgetting it does not fail: the charge
//      succeeds, the customer is happy, the receipt looks right, and the
//      money is in the PLATFORM's balance instead of the detailer's — which
//      makes the owner a money transmitter holding other people's revenue and
//      answering their chargebacks. Nothing on any screen would look
//      different. No behavioural test can see it either, so § 5 reads the
//      source.
//   2. CHARGING TWICE. The receipt link lives in an inbox for ever and a
//      customer WILL open it again, after paying by card or after handing
//      over cash the detailer then marked paid. § 3 is that refusal.
//   3. THE AMOUNT. `final_amount` is what was agreed at the car and
//      `total_price` is what the engine quoted; charging the quote after
//      agreeing something else is a dispute the customer would win. And
//      PostgREST hands `numeric` back as a STRING, so the obvious
//      `total_price * 100` is `NaN` waiting to happen.
//   4. THE CALLBACK. Connect's redirect is a PUBLIC url carrying a `code`.
//      Without a `state` we issued, recognise and spend, anybody could
//      deliver their own code and attach THEIR Stripe account to somebody
//      else's business.
//
// Credential-free: no Stripe key, no database, no dev server, no browser.
// Node strips the types, so it imports the edge functions' own module rather
// than a copy of it — the `plans` test 6 shape.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  accountReady,
  amountDueCents,
  authorizeUrl,
  cardStatus,
  checkoutLineName,
  CONNECT_SCOPE,
  connectReturnUrl,
  CONNECT_RETURN_PATH,
  payability,
  STATE_TTL_MINUTES,
  stateFresh,
  STRIPE_MIN_CHARGE_CENTS,
} from "../supabase/functions/_shared/connect.ts";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(fileURLToPath(new URL(p, root)), "utf8");

/**
 * READ SOURCE WITH THE COMMENTS TAKEN OFF, ALWAYS.
 *
 * This repo has recorded the same defect at least six times: a check that
 * greps a file matches the file's own HEADER PROSE describing the rule, and
 * so passes with the code deleted. Every file in this feature has a long
 * header naming exactly the strings § 5 searches for, so without this the
 * whole section would be vacuous on its first run.
 *
 * Line comments are only stripped at the START of a line, so a `https://`
 * inside a real string is left alone.
 */
const code = (p) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");

/**
 * ORDER, WITH THE SUBJECTS PROVEN TO EXIST FIRST.
 *
 * `indexOf(a) < indexOf(b)` is at its GREENEST when `a` has been deleted,
 * because -1 is less than every real index. This file shipped that mistake:
 * § 5e's revoke-before-grant check passed with the revoke removed, and it was
 * found by baselining rather than by reading. CLAUDE.md names it as a family
 * with four other members; this is the fifth.
 */
const before = (hay, a, b) => {
  const i = hay.indexOf(a), j = hay.indexOf(b);
  if (i === -1 || j === -1) return false;
  return i < j;
};

const CONNECT_TS = "supabase/functions/_shared/connect.ts";
const PAY = "supabase/functions/pay-booking/index.ts";
const ACCOUNT = "supabase/functions/connect-account/index.ts";
const MIGRATION = "supabase/migrations/20260908001000_connected_accounts.sql";

const READY = { stripe_account_id: "acct_1", stripe_charges_enabled: true, card_payments_enabled: true };

// ---------------------------------------------------------------------------
console.log("\n§ 1 — what the customer owes");
{
  check("a plain number becomes cents", amountDueCents({ total_price: 150 }) === 15000);

  // PostgREST renders `numeric` as a string. This is the whole reason the
  // function parses rather than multiplies.
  check("a PostgREST numeric STRING becomes cents",
    amountDueCents({ total_price: "150.00" }) === 15000,
    String(amountDueCents({ total_price: "150.00" })));

  // `19.99 * 100` is 1998.9999999999998 in floating point. Truncating loses a
  // cent on every other invoice, which is only ever found by a detailer whose
  // takings never match.
  check("19.99 is 1999 cents, not 1998",
    amountDueCents({ total_price: "19.99" }) === 1999,
    String(amountDueCents({ total_price: "19.99" })));

  check("final_amount beats total_price, because the detailer set it",
    amountDueCents({ total_price: "200.00", final_amount: "175.00" }) === 17500);

  // A finalize that landed a discount can legitimately be lower; zero and
  // negative are both "there is nothing to take".
  check("zero is zero", amountDueCents({ total_price: 0 }) === 0);
  check("a negative total is zero, never a negative charge",
    amountDueCents({ total_price: -50 }) === 0);
  check("nonsense is zero", amountDueCents({ total_price: "not a number" }) === 0);
  check("a missing booking is zero", amountDueCents(null) === 0);

  // final_amount of 0 is a real answer — the detailer waived it — and must not
  // fall through to total_price.
  check("final_amount of 0 does not fall back to the quote",
    amountDueCents({ total_price: "200.00", final_amount: 0 }) === 0,
    String(amountDueCents({ total_price: "200.00", final_amount: 0 })));
}

// ---------------------------------------------------------------------------
console.log("\n§ 2 — the four states, and the order they are asked in");
{
  check("nothing connected", cardStatus(null).state === "not_connected");
  check("nothing connected is not ready", cardStatus(null).ready === false);

  check("connected but Stripe has not finished checking",
    cardStatus({ stripe_account_id: "acct_1" }).state === "unverified");

  check("verified but the detailer has it switched off",
    cardStatus({ stripe_account_id: "acct_1", stripe_charges_enabled: true }).state === "off");

  check("all three true is ready", cardStatus(READY).ready === true);
  check("ready says so", cardStatus(READY).state === "ready");

  // THE ORDER IS THE MESSAGE. Somebody who has connected nothing must be told
  // to connect — not told their account is unverified, which reads as a fault
  // in something they have not done yet.
  check("an empty settings object reports not_connected, not unverified",
    cardStatus({}).state === "not_connected");

  // And a detailer who deliberately switched it off is told THAT, rather than
  // anything that reads as broken.
  check("switched off outranks nothing, when Stripe is happy",
    cardStatus({ stripe_account_id: "a", stripe_charges_enabled: true, card_payments_enabled: false }).detail
      .includes("switched off"));

  check("every state carries a sentence",
    [null, {}, { stripe_account_id: "a" }, READY].every((s) => cardStatus(s).detail.length > 10));

  check("accountReady reads Stripe's own answer", accountReady({ charges_enabled: true }) === true);
  check("accountReady is false when Stripe says nothing", accountReady(null) === false);
  check("accountReady is false on a fresh account", accountReady({ charges_enabled: false }) === false);
}

// ---------------------------------------------------------------------------
console.log("\n§ 3 — may this booking be paid right now");
{
  const ok = payability({
    booking: { total_price: "150.00", payment_status: "pending", status: "confirmed" },
    settings: READY,
    businessStatus: "active",
  });
  check("an ordinary unpaid booking can be paid", ok.ok === true, ok.reason);
  check("and it carries the amount", ok.amountCents === 15000, String(ok.amountCents));

  const no = (booking, settings = READY, businessStatus = "active") =>
    payability({ booking, settings, businessStatus });

  // THE ONE THAT MATTERS MOST. A stale receipt page is a button that outlives
  // the payment.
  const paid = no({ total_price: "150.00", payment_status: "paid" });
  check("an already-paid booking is refused", paid.ok === false && paid.reason === "already_paid");

  const waived = no({ total_price: "150.00", payment_status: "waived" });
  check("a waived booking is refused", waived.ok === false && waived.reason === "already_paid");

  // Partial is deliberately not payable: we do not know what is left, and
  // guessing at somebody's card is not a thing to do.
  const partial = no({ total_price: "150.00", payment_status: "partial" });
  check("a partly-paid booking is refused rather than guessed at",
    partial.ok === false && partial.reason === "already_paid");

  const cancelled = no({ total_price: "150.00", payment_status: "pending", status: "cancelled" });
  check("a cancelled booking is refused", cancelled.ok === false && cancelled.reason === "cancelled");

  // Cancelled is asked FIRST: a cancelled booking that also happens to be
  // marked paid should say cancelled, which is the true and more useful thing.
  const both = no({ total_price: "150.00", payment_status: "paid", status: "cancelled" });
  check("cancelled outranks already-paid", both.reason === "cancelled", both.reason);

  // A REQUEST NOBODY HAS ACCEPTED IS NOT A BILL — stage 3's screens found
  // this. In request mode a booking sits at `pending` while the detailer
  // decides, and its own email says *"we're holding your time"* and charges
  // nothing. A card taken there is money moved for work that may then be
  // DECLINED, and the refund comes out of the detailer's own balance for a
  // decision this product let the customer make first.
  const req = no({ total_price: "150.00", payment_status: "pending", status: "pending" });
  check("a request nobody has accepted yet cannot be paid",
    req.ok === false && req.reason === "not_accepted", req.reason);
  // Cancelled outranks it, the same way it outranks already-paid: a declined
  // request is cancelled, and that is the truer thing to say.
  const reqCancelled = no({ total_price: "150.00", payment_status: "pending", status: "cancelled" });
  check("cancelled outranks not-accepted", reqCancelled.reason === "cancelled", reqCancelled.reason);

  const off = no({ total_price: "150.00", payment_status: "pending" }, { stripe_account_id: "a" });
  check("a business that cannot take cards is refused",
    off.ok === false && off.reason === "not_available");

  const suspended = no({ total_price: "150.00", payment_status: "pending" }, READY, "paused");
  check("a suspended business takes no payments",
    suspended.ok === false && suspended.reason === "business_offline");

  const nothing = no({ total_price: 0, payment_status: "pending" });
  check("nothing owing is refused", nothing.ok === false && nothing.reason === "nothing_due");

  // Stripe refuses under 50c in a way nobody reads, so it is refused here
  // with a sentence a customer can act on.
  const tiny = no({ total_price: "0.25", payment_status: "pending" });
  check("below Stripe's minimum is refused with its own reason",
    tiny.ok === false && tiny.reason === "below_minimum", tiny.reason);
  check("the minimum is 50 cents", STRIPE_MIN_CHARGE_CENTS === 50);

  // EVERY REFUSAL IS SAYABLE TO A CUSTOMER. They are shown on a page the
  // customer reached from their own email, so none may mention Stripe, the
  // platform, or the detailer's account.
  const refusals = [paid, waived, partial, cancelled, req, off, suspended, nothing, tiny];
  check("every refusal has a message", refusals.every((r) => r.message.length > 10));
  check("no refusal names Stripe or the platform to a customer",
    refusals.every((r) => !/stripe|platform|connect/i.test(r.message)),
    refusals.map((r) => r.message).join(" | "));

  // A refusal still reports the amount, so a screen can say what is owed even
  // while it declines to take it.
  check("a refusal still carries the amount", paid.amountCents === 15000);
}

// ---------------------------------------------------------------------------
console.log("\n§ 4 — the consent URL and the single-use state");
{
  const url = authorizeUrl({
    clientId: "ca_test",
    state: "s-1",
    redirectUri: "https://detailingplatform.com/settings/payments/connected",
    email: "hi@ridgeline.test",
    businessName: "Ridgeline Auto Detail",
  });
  const q = new URL(url).searchParams;

  check("it goes to Stripe's own consent host", url.startsWith("https://connect.stripe.com/oauth/authorize?"));
  check("the scope is read_write, because read_only cannot charge",
    q.get("scope") === "read_write" && CONNECT_SCOPE === "read_write");
  check("the state travels", q.get("state") === "s-1");
  check("the client id travels", q.get("client_id") === "ca_test");
  check("the redirect travels EXACTLY, because Stripe compares it character for character",
    q.get("redirect_uri") === "https://detailingplatform.com/settings/payments/connected");
  check("the business name is prefilled", q.get("stripe_user[business_name]") === "Ridgeline Auto Detail");

  // A missing optional must be ABSENT rather than the string "undefined",
  // which Stripe would put in the detailer's own account form.
  const bare = new URL(authorizeUrl({ clientId: "ca_x", state: "s", redirectUri: "https://x.test/r" })).searchParams;
  check("an absent email is not sent as the word undefined",
    bare.get("stripe_user[email]") === null,
    String(bare.get("stripe_user[email]")));

  // The return URL is built in ONE place so the dashboard and the code cannot
  // drift, and a trailing slash on the site must not become a double slash.
  check("the return url is built once",
    connectReturnUrl("https://detailingplatform.com") === "https://detailingplatform.com/settings/payments/connected");
  check("a trailing slash does not become a double slash",
    connectReturnUrl("https://detailingplatform.com/") === "https://detailingplatform.com/settings/payments/connected",
    connectReturnUrl("https://detailingplatform.com/"));

  const now = new Date("2026-09-08T12:00:00Z");
  const ago = (min) => new Date(now.getTime() - min * 60_000).toISOString();

  check("a state issued a minute ago is fresh", stateFresh(ago(1), now) === true);
  check("a state issued 29 minutes ago is still fresh", stateFresh(ago(29), now) === true);
  check("a state issued 31 minutes ago is not", stateFresh(ago(31), now) === false);
  check("the window is thirty minutes", STATE_TTL_MINUTES === 30);
  check("no state at all is not fresh", stateFresh(null, now) === false);
  check("nonsense is not fresh", stateFresh("last tuesday", now) === false);

  // A state stamped in the future is a clock problem or a forged row. Either
  // way it is not something to accept.
  check("a state from the future is refused",
    stateFresh(new Date(now.getTime() + 60_000).toISOString(), now) === false);
}

// ---------------------------------------------------------------------------
console.log("\n§ 5 — the source, because no behavioural check can see any of this");
{
  const pay = code(PAY);
  const account = code(ACCOUNT);
  const shared = code(CONNECT_TS);
  const migration = read(MIGRATION);

  // The comment-stripper is itself checked, or every assertion below could
  // pass by matching a header that is still there.
  check("the comment stripper actually strips",
    !pay.includes("THIS IS THE WHOLE FEATURE") && pay.includes("Deno.serve"),
    "the header survived stripping, so every check in this section is suspect");

  // -- 5a. WHOSE MONEY IT IS ------------------------------------------------
  check("pay-booking passes stripeAccount, so the charge is the DETAILER's",
    /stripeAccount:\s*conn/.test(pay), "the Stripe-Account option is missing — the money lands in OUR balance");
  check("and it takes the account id from the connection row, never from the request",
    !/stripeAccount:\s*(body|req)/.test(pay));

  // A fee changes who Stripe bills and turns this into taking a cut of other
  // people's revenue, which is a different business with different rules.
  check("there is no application fee anywhere in the pay path",
    !pay.includes("application_fee"), "an application fee has appeared");
  check("nor in the shared module", !shared.includes("application_fee"));

  // -- 5b. THE CALLBACK -----------------------------------------------------
  check("the state is checked for a match AND for freshness",
    account.includes("connect_state !== state") && account.includes("stateFresh("),
    "one half of the state check is missing");

  // SPENT BEFORE IT IS USED. If the exchange runs first, a replayed callback
  // reaches Stripe twice.
  const cleared = account.indexOf("connect_state: null");
  const exchanged = account.indexOf("oauthToken(");
  check("the state is cleared BEFORE the code is exchanged",
    cleared !== -1 && exchanged !== -1 && cleared < exchanged,
    `cleared at ${cleared}, exchanged at ${exchanged}`);

  // -- 5c. WHO MAY CONNECT --------------------------------------------------
  // Not the `money` permission: this decides which bank account the till
  // points at, and there is no tick that means that and nothing else.
  check("connecting an account is owner-only",
    /member\.role\s*!==\s*"owner"/.test(account), "the owner check is gone");
  check("a non-owner gets 404 rather than 403",
    /member\.role\s*!==\s*"owner"\)\s*return json\(\{ error: "not_found" \}, 404\)/.test(account));

  // -- 5d. THE SWITCH -------------------------------------------------------
  check("card payments cannot be switched on before Stripe says yes",
    /on\s*&&\s*!row\?\.charges_enabled/.test(account));
  check("disconnecting also switches card payments off",
    /stripe_account_id: null[\s\S]{0,200}card_payments_enabled: false/.test(account),
    "a reconnect would silently restore the Pay button");

  // -- 5e. THE TABLE --------------------------------------------------------
  // The whole reason this is not four columns on business_settings: that
  // table carries a TABLE-level UPDATE grant, so a member with `settings`
  // could point their employer's card payments at their own Stripe account.
  check("connected_accounts has RLS on", /enable row level security/i.test(migration));
  check("the table grant is revoked before any column is handed back",
    before(migration, "revoke all on public.connected_accounts", "grant select ("),
    "a column grant is inert while the table grant stands — 20260907003000");
  check("there is no write policy for authenticated",
    !/create policy[\s\S]*?for (insert|update|delete)[\s\S]*?connected_accounts/i.test(migration));
  check("the one-time state is not readable by the browser",
    !/grant select \([^)]*connect_state/s.test(migration),
    "connect_state is in the select allowlist");
  check("the payment intent is unique, so a redelivered webhook cannot pay twice",
    /create unique index[\s\S]*?stripe_payment_intent/i.test(migration));

  // -- 5f. THE SHARED MODULE STAYS RUNNABLE HERE ----------------------------
  // If it grows a fetch, this whole file stops being credential-free and the
  // arithmetic goes back to being checkable only through a browser.
  check("the shared module makes no network call",
    !/\bfetch\s*\(/.test(shared), "connect.ts has grown a fetch — move it to an edge function");
  check("and reads no database", !/supabase\s*\./.test(shared));

  // -- 5g. THE CUSTOMER'S PAGE NAMES THE DETAILER ---------------------------
  check("the checkout line names the business",
    checkoutLineName("Ridgeline Auto Detail", "Sep 12") === "Ridgeline Auto Detail — Sep 12");
  check("and works with no date", checkoutLineName("Ridgeline Auto Detail", null) === "Ridgeline Auto Detail");
  check("and never says detailingplatform",
    !/detailingplatform/i.test(checkoutLineName("Ridgeline Auto Detail", "Sep 12")));

  // -- 5h. IDEMPOTENCY -----------------------------------------------------
  // Without the amount in the key, a customer whose price changed between two
  // taps gets Stripe's cached session and is charged the OLD figure.
  check("the idempotency key includes the amount, not just the booking",
    /idempotencyKey:\s*`pay:\$\{booking\.id\}:\$\{verdict\.amountCents\}`/.test(pay),
    "a price change between two taps would charge the stale amount");
}

// ---------------------------------------------------------------------------
console.log("\n§ 6 — the webhook, where a connected event must not be read as ours");
{
  const hook = code("supabase/functions/stripe-webhook/index.ts");

  check("the stripper worked here too",
    !hook.includes("THE SIGNATURE IS THE ENTIRE AUTHENTICATION") && hook.includes("Deno.serve"));

  // `checkout.session.completed` now arrives from BOTH directions. Without
  // this branch a customer paying a detailer $150 is handed to `completed()`,
  // which reads it as a detailer buying a subscription.
  check("the routing asks whose account the event is on",
    /event\.account/.test(hook), "nothing distinguishes a connected event from ours");
  check("and a connected event never reaches the platform-billing handler",
    /account \? handleConnected\(/.test(hook));

  // A signature proves STRIPE sent it. It does not prove who chose the
  // metadata — a connected account is a stranger's own Stripe account, and
  // they can put any booking id in it.
  check("the sending account is checked against the booking's own business",
    /conn\??\.stripe_account_id !== account/.test(hook),
    "one detailer could mark another detailer's jobs paid");
  check("and that check reads the connected_accounts row for THAT business",
    before(hook, 'from("connected_accounts")', "!== account"));

  // A detailer who recorded cash and then received a duplicate card payment
  // has a refund to make, not a status to flip.
  check("an already-settled booking is left alone",
    /payment_status === "paid" \|\| booking\.payment_status === "waived"/.test(hook));

  // Throwing here releases the event claim and invites Stripe to retry for
  // ever over a duplicate that was correctly ignored.
  check("a duplicate payment intent is not treated as a failure",
    /error\.code !== "23505"/.test(hook));

  // ASSERTED ON THE GUARD LINE, NOT ON THE FILE. The first version asked
  // whether the string appeared anywhere in the handler, and it passed with
  // the guard narrowed to the session alone — because the name is also in the
  // ternary that reads the intent id two lines below. A `includes` over a
  // whole function is not a check about one branch of it.
  check("the late-payment event is handled too, not just the session",
    /type !== "checkout\.session\.completed" && type !== "payment_intent\.succeeded"/.test(hook),
    "a card that needed a bank challenge would stay unpaid on the screen");

  // Nothing about a connected account may move OUR billing state.
  const fn = hook.slice(hook.indexOf("async function handleConnected"));
  check("the connected handler touches no subscription, suspension or invoice",
    fn.length > 200 && !/suspend\(|mirrorInvoice\(|platform_subscriptions/.test(fn),
    "a detailer's customer's card must never change what the detailer owes us");
}

// ---------------------------------------------------------------------------
console.log("\n§ 7 — the SECOND webhook secret, without which § 6 is unreachable");
{
  // WHY THIS SECTION EXISTS, and it is the most expensive kind of defect this
  // repo produces: § 6 above is CORRECT. It was written, reviewed, tested
  // against the source and deployed — and it could never once have run.
  //
  // A Stripe endpoint's `connect` flag ("Events from" in the dashboard) is
  // CREATE-ONLY and cannot be edited afterwards. The registered endpoint
  // `we_1UCMpdJeoZO7o6Eenofj0orr` is permanently scoped to "Your account", so
  // no event carrying `event.account` has ever been able to arrive. Every doc
  // in this repo called the remaining work "a separate setting" on that
  // endpoint. **There is no such setting.** It takes a SECOND endpoint, and a
  // second endpoint issues its OWN signing secret.
  const hook = code("supabase/functions/stripe-webhook/index.ts");
  const shared = code("supabase/functions/_shared/stripe.ts");

  check("there is a second secret accessor, reading its own env name",
    /STRIPE_CONNECT_WEBHOOK_SECRET/.test(shared),
    "one secret means every connect-endpoint event fails verification");

  // SEPARATE, NOT REPLACING. The platform-billing endpoint is live and carries
  // every subscription this product has.
  check("and the platform secret is untouched beside it",
    /STRIPE_WEBHOOK_SECRET/.test(shared) && /webhookSecret = \(\)/.test(shared),
    "reusing one name takes the live billing endpoint down");

  check("the webhook tries BOTH secrets",
    /webhookSecret\(\), connectWebhookSecret\(\)/.test(hook),
    "a connected event signed with the connect secret would 400");

  check("an unset connect secret is skipped, never tried as an empty string",
    /\.filter\(Boolean\)/.test(hook));

  check("and no secret configured at all is a 503, not a 400",
    /Webhook secret is not configured\.", 503/.test(hook),
    "a 400 makes Stripe stop retrying an event we could have handled");

  // ── BEHAVIOURAL, because everything above reads SOURCE and "tries both" is
  // a loop — and a loop can be written to try the same secret twice.
  const { verifyWebhook } = await import("../supabase/functions/_shared/stripe.ts");
  const PLATFORM = "whsec_platform_one", CONNECT = "whsec_connect_two";
  const sign = async (payload, secret, t) => {
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
    return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  };
  const body = JSON.stringify({ id: "evt_x", type: "account.updated", account: "acct_x" });
  const now = Math.floor(Date.now() / 1000);
  const header = `t=${now},v1=${await sign(body, CONNECT, now)}`;
  const ok = async (secret) => {
    try { await verifyWebhook(body, header, secret); return true; } catch { return false; }
  };

  check("a connect-signed event does NOT verify under the platform secret",
    !(await ok(PLATFORM)),
    "if this passes the section is vacuous — the two secrets are the same");
  check("and it DOES verify under the connect secret",
    await ok(CONNECT),
    "the fallback cannot work if the second secret verifies nothing");
  check("the connected account survives verification and can still be routed on",
    (await verifyWebhook(body, header, CONNECT)).account === "acct_x");
}

// ---------------------------------------------------------------------------
console.log("\n§ 8 — the API version, and the two account events");
{
  const hook = code("supabase/functions/stripe-webhook/index.ts");
  const shared = code("supabase/functions/_shared/stripe.ts");
  const fn = hook.slice(hook.indexOf("async function handleConnected"));

  // ── THE VERSION. An endpoint is registered AT a version and Stripe renders
  // every event to that version's shape. Stripe's create-endpoint form
  // DEFAULTS to the newest version rather than to the one the other endpoints
  // use, so a mismatch is what you get by pressing the obvious button — and
  // it passes every check in this file, because they all run against the
  // pinned shape. It fails only in production.
  check("the pinned API version is exported so a caller can check against it",
    /export const API_VERSION/.test(shared));
  check("and the webhook compares the event's own version against it",
    /event\.api_version/.test(hook) && /!== API_VERSION/.test(hook),
    "a second endpoint on Stripe's default version is silent in every test here");
  check("a mismatch LOGS and does not reject",
    /API VERSION MISMATCH/.test(hook) && !/api_version[\s\S]{0,400}return json\(/.test(hook),
    "a 400 makes Stripe disable the endpoint — no record at all beats a wrong one");

  // ── DEAUTHORIZE. Without it the row keeps saying connected, and pay-booking
  // keeps offering a card button routing to an account that revoked us. The
  // customer meets that failure at the car.
  check("a detailer disconnecting is handled",
    /account\.application\.deauthorized/.test(fn),
    "the platform never learns they left");

  // SLICED TO THE ONE BRANCH, AND THE FIRST VERSION OF THIS WAS VACUOUS.
  // It searched a window of characters after the event name for
  // `.eq("stripe_account_id", account)` — and the account.updated branch
  // below contains that exact line, so the check passed with the deauthorize
  // branch rewritten to the wrong thing. Found by baselining, not by reading.
  // A window is not a scope: take the slice.
  const deauth = fn.slice(
    fn.indexOf('type === "account.application.deauthorized"'),
    fn.indexOf('type === "account.updated"'),
  );
  check("the deauthorize branch has subjects at all",
    deauth.length > 200 && deauth.includes("connected_accounts"),
    "every check below this is vacuous if the slice is empty");

  // THE TRAP: on this event `data.object` is the APPLICATION, not the account.
  // Reading `object.id` gets the application id, matches no row, and silently
  // does nothing — indistinguishable from a detailer who never disconnected.
  check("and it keys off event.account, never the object",
    /\.eq\("stripe_account_id", account\)/.test(deauth) && !/object\.id/.test(deauth),
    "data.object here is the application — object.id matches no row, in silence");
  check("the disconnect clears the account id, not just the flag",
    /stripe_account_id: null/.test(deauth),
    "'connected' is read off that column in three places");
  check("but leaves the detailer's own card-payments preference alone",
    !/card_payments_enabled:/.test(deauth),
    "that switch is their choice about a 2.9% fee, not Stripe's answer");

  // ── ACCOUNT.UPDATED. charges_enabled is Stripe's answer and is re-read
  // rather than remembered — a Standard account is connectable long before
  // Stripe finishes checking it, and can be switched off again later.
  check("account.updated is handled rather than silently dropped",
    /type === "account\.updated"/.test(fn),
    "it is on the endpoint's event list and would otherwise do nothing");
  check("and it writes Stripe's answer, strictly",
    /charges_enabled: object\.charges_enabled === true/.test(fn),
    "a truthy read makes a missing field mean enabled, which is the unsafe direction");

  // Both new branches sit BEFORE the payment guard, or that guard returns
  // first and neither one is ever reached.
  const guard = fn.indexOf('type !== "checkout.session.completed"');
  check("both account branches come before the payment-type guard",
    fn.indexOf("account.application.deauthorized") < guard &&
    fn.indexOf('type === "account.updated"') < guard && guard > 0,
    "the guard returns first and both handlers become unreachable");
}

// ---------------------------------------------------------------------------
console.log("\n§ 9 — an ownership change must be invisible to the app");
{
  // WHY THIS EXISTS, and it is a business fact rather than a technical one.
  // Stripe's minimum age is 13 and an account holder under 18 needs a guardian
  // as the legal owner, so this platform's Stripe account may be opened in a
  // parent's name with the payout bank matching, and handed over later. The
  // handover has a FIXED ORDER — Stripe Support updates the account holder
  // FIRST, payouts are repointed SECOND — because the other order is a name
  // mismatch and a payout hold.
  //
  // **NONE OF THAT MAY REACH THE CODE.** Anything here that names the account
  // holder, the payout bank or a statement descriptor turns an ownership
  // change into a deploy, and the one thing worse than a hard handover is a
  // handover nobody remembers has a code half.
  const walk = (dir, re, out = []) => {
    for (const e of readdirSync(fileURLToPath(new URL(dir, root)), { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(p, re, out);
      else if (re.test(e.name)) out.push(p);
    }
    return out;
  };
  const surfaces = [
    ...walk("app/src", /\.(js|jsx)$/),
    ...walk("supabase/functions", /\.ts$/),
  ];

  // COMMENTS STRIPPED, for the reason `code()`'s own header gives — this very
  // section's prose names every string it searches for, so without that it
  // would report itself and be vacuous the other way round.
  const banned = /statement_descriptor|account_holder|routing_number|payout_bank/;
  const offenders = surfaces.filter((f) => banned.test(code(f)));
  check("nothing names a statement descriptor, an account holder or a payout bank",
    offenders.length === 0,
    `an ownership change would need a code change: ${offenders.join(", ")}`);

  // The check above is worthless if it has no subjects to walk.
  check("and it actually walked the product",
    surfaces.length > 100, `only ${surfaces.length} files — the walk is broken`);

  // THE ONE EXCEPTION, AND IT IS DELIBERATE. `ENTITY` is the legal person
  // printed at the top of /privacy and /terms. It cannot come from Stripe —
  // it is who signs the terms of service, not who holds a merchant account —
  // so it stays a constant. What matters is that it stays exactly ONE
  // constant in ONE file, so correcting it is a line rather than a hunt.
  const entityFiles = surfaces.filter((f) => /export const ENTITY/.test(read(f)));
  check("the legal entity is exactly one constant, in one file",
    entityFiles.length === 1 && entityFiles[0].endsWith("legal.js"),
    `found in ${entityFiles.length} files — it must stay a one-line change`);
}

// ---------------------------------------------------------------------------
console.log("\n§ 10 — the two screens, which are the half no behavioural check sees");
{
  const payments = read("app/src/screens/more/Payments.jsx");
  const manage = read("app/src/book/ManageBookingPage.jsx");
  const receipt = read("supabase/functions/get-booking-receipt/index.ts");
  const main = read("app/src/main.jsx");
  const app = read("app/src/App.jsx");
  const invoice = read("supabase/functions/send-invoice/index.ts");

  // NEITHER SCREEN MAY WORK OUT "READY" FOR ITSELF. `cardStatus` lives in
  // Deno and cannot be imported from `app/`, so the only thing stopping a
  // second implementation appearing in a browser file is this check. A screen
  // that decided for itself would disagree with the server the first time
  // Stripe turned an account off, and the disagreement would be a Pay button
  // that fails at the till.
  for (const [name, src] of [["the settings screen", payments], ["the customer's page", manage]]) {
    check(`${name} reads the server's verdict rather than the three flags`,
      !/charges_enabled|card_payments_enabled|stripe_account_id/.test(src), name);
  }

  // THE DETAILER'S SWITCH CANNOT BE OFFERED BEFORE STRIPE SAYS YES. The
  // server answers 409; the control is disabled so nobody meets the refusal.
  check("the switch is disabled until Stripe has approved the account",
    /disabled=\{!card\.chargesEnabled/.test(payments));

  // DISCONNECTING IS ONE PRESS BEHIND ONE CONFIRM, and the confirm names what
  // stops — the same posture the billing screen's cancel button ships with.
  check("disconnect asks first, and says what stops",
    /confirm\(t\("Disconnect Stripe\?[^"]*Pay button/.test(payments), "no confirm, or it does not say");

  // THE CONSENT CODE IS SINGLE USE, so a refresh must not retry it.
  check("the returning consent code is wiped out of the address bar",
    /history\.replaceState/.test(payments) && /q\.delete\("code"\)/.test(payments));

  // WHERE STRIPE SENDS THEM BACK HAS TO BE A ROUTE. Without it the callback
  // falls through to the catch-all, lands on Today, and the connection
  // silently does not happen. `tests/route-contract` pins the path itself
  // against `connect.ts`; this pins that something reads the code.
  check("the router serves the return path", main.includes(CONNECT_RETURN_PATH));
  check("and it forwards the code and the state rather than dropping them",
    /settings=payments\$\{window\.location\.search/.test(main));
  check("and the dashboard opens the screen that reads them",
    /deepLink\.current === "payments"/.test(app));

  // THE PUBLIC ENDPOINT MUST NOT SHIP THE DETAILER'S ONBOARDING STATE. The
  // `detail` sentence is written in the detailer's words and this endpoint is
  // reachable by anybody holding a booking link.
  check("the receipt endpoint sends a boolean, not the detailer's status sentence",
    /card = \{ ready:/.test(receipt) && !/\bdetail\b/.test(receipt.split("let card")[1] ?? ""));

  // AND ALL FOUR CALLERS ASK THE SAME FUNCTION. Four copies of "can this
  // business take a card" is four chances to offer a button that does not
  // work; the count is what makes a fifth copy visible.
  //
  // **IT LOOKS FOR THE IMPORT, NOT FOR THE NAME, AND THE FIRST VERSION DID
  // THE OPPOSITE AND TESTED NOTHING.** Baselined by taking `cardStatus` out
  // of `send-invoice` and replacing it with an inline flag: the check still
  // passed, because that file's own COMMENT says "it is `cardStatus` that
  // answers" and the regex was reading comments. A file cannot import a
  // module in a comment.
  const callers = ["supabase/functions/pay-booking/index.ts",
    "supabase/functions/get-booking-receipt/index.ts",
    "supabase/functions/send-invoice/index.ts",
    "supabase/functions/connect-account/index.ts"]
    .filter((f) => /^import \{[^}]*\} from "\.\.\/_shared\/connect\.ts";/m.test(read(f)));
  check("every server caller goes through the shared decision", callers.length === 4,
    `only ${callers.length}: ${callers.join(", ")}`);

  // THE INVOICE'S BUTTON IS A LINK, NEVER A CHECKOUT. A Stripe session made
  // when the email was written would carry that morning's amount and would
  // still be in the inbox after the customer paid cash.
  check("the invoice email is handed the answer rather than deciding it",
    /cardReady,?\n?\s*\);/.test(invoice) || /cardReady,/.test(invoice));
  const tpl = read("supabase/functions/_shared/emailTemplates.ts");
  check("and a PAID receipt never carries a pay button",
    /!paid && cardReady/.test(tpl), "the branch does not test `paid`");
}

// ---------------------------------------------------------------------------
console.log("\n§ 11 — both payment events fire for ONE payment, and what makes that safe");
{
  const hook = read("supabase/functions/stripe-webhook/index.ts");

  // WHY THIS SECTION EXISTS — his cloud coworker's Update 8, 2026-09-10.
  // `checkout.session.completed` and `payment_intent.succeeded` are BOTH
  // enabled on the connected-accounts endpoint, and both fire for one
  // successful payment. He asked for the pair to be checked rather than
  // assumed. It was, against the real database, and the answer is that the
  // transition is idempotent — **but not for the reason the code says.**
  //
  // MEASURED 2026-09-10 on two demo bookings, then put back:
  //   · same intent, SAME row, twice        → ok. NO unique violation.
  //   · same intent, DIFFERENT row          → 23505, refused.
  //
  // So `bookings_stripe_payment_intent_key` does NOT make a repeat of the
  // same payment a no-op, which is what migration 20260908001000's own
  // comment claims. **The thing that does is the `payment_status === "paid"`
  // guard**, and the migration cannot be edited to say so — migrations are
  // append-only in this repo. So the fact lives here, next to the check that
  // keeps the guard alive.
  //
  // THE TRAP THIS CLOSES: somebody reading that migration comment would
  // reasonably delete the guard as redundant. Doing so returns two paid
  // transitions per payment.
  check("11a · the handler takes both payment events",
    /type !== "checkout\.session\.completed" && type !== "payment_intent\.succeeded"/.test(hook));

  // THE GUARD, AND IT IS THE IDEMPOTENCY. Named in a check so it cannot be
  // removed silently. `waived` is in it for a different reason — a detailer
  // who took cash and then got a card payment has a refund to make, not a
  // status to flip — and both halves are load-bearing.
  // § 6 ALREADY CHECKED THAT THIS GUARD EXISTS — "an already-settled booking
  // is left alone" — and deleting it fails both. What § 11 adds is the
  // POSITION, which nothing held, and the RECORD of why the guard rather than
  // the index is the idempotency. Said out loud rather than quietly
  // duplicated: a check that looks new and is not is how a suite grows without
  // covering more.
  check("11b · an already-settled booking returns BEFORE the write",
    /if \(booking\.payment_status === "paid" \|\| booking\.payment_status === "waived"\) return;/
      .test(hook),
    "the guard that makes the second delivery a no-op is gone");

  // AND IT HAS TO SIT AFTER THE READ AND BEFORE THE UPDATE. A guard moved
  // above the read has nothing to read; one moved below the update is
  // decoration.
  const readAt = hook.indexOf('.select("id, business_id, payment_status, stripe_payment_intent")');
  const guardAt = hook.indexOf('if (booking.payment_status === "paid"');
  const writeAt = hook.indexOf('payment_status: "paid",');
  check("11b-i · and it is between the read and the write",
    readAt > 0 && guardAt > readAt && writeAt > guardAt,
    `read ${readAt}, guard ${guardAt}, write ${writeAt}`);

  // THE TWO EVENTS MUST COLLAPSE TO ONE INTENT ID, or the guard is the only
  // thing standing between a payment and two rows claiming it. On the intent
  // it is `object.id`; on a session it is `object.payment_intent`.
  check("11c · both events resolve to the same payment-intent id",
    /type === "payment_intent\.succeeded"\s*\?\s*String\(object\.id/.test(hook)
      && /object\.payment_intent === "string"/.test(hook));

  // A 23505 IS THIS HANDLER WORKING. Throwing would release the event claim
  // and invite Stripe to retry for three days.
  check("11d · a unique violation is swallowed, not thrown",
    /error\.code !== "23505"/.test(hook));

  // AND THE CONNECTED BRANCH SENDS NO EMAIL, which is the other half of his
  // question — "possibly two confirmation emails". The only tenant send in
  // this file is the PLATFORM billing branch. Counted rather than asserted,
  // so a send added to the payment path fails this.
  const sends = (hook.match(/sendTenantEmail\(/g) ?? []).length;
  check("11e · exactly one email send in the whole webhook, and it is billing's",
    sends === 1, `${sends} sends — a payment path that emails would double it`);

  // NOR DOES A PAYMENT RE-ARM A REMINDER. `reset_reminder_markers_on_edit`
  // fires BEFORE UPDATE on every booking row, and a payment write that
  // matched it would clear the customer's reminder stamp and mail them again.
  // It keys on time and on the fields the reminder email states; none of the
  // three payment columns is in either list.
  const trig = read("supabase/migrations/20260829000100_reminder_marker_reset.sql");
  check("11f · the reminder trigger ignores the payment columns",
    !/payment_status|paid_online_at|stripe_payment_intent/.test(trig),
    "a payment would re-arm a reminder and email the customer twice");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
