// The detailer's side of MONEY IN — roadmap 2.20 stage 2.
//
// Four actions, one function, because they share a subject (this business's
// subscription), an authorisation rule (owner, never a permission tick) and a
// key. Splitting them into four deployments would be four places to forget the
// ownership check.
//
//   summary   -> everything the billing screen prints, computed server-side
//   checkout  -> a Stripe Checkout URL for a business with no subscription
//   portal    -> a Stripe-hosted page for updating the CARD, and only the card
//   cancel    -> stop the renewal, charging the early-exit fee if one is owed
//   resume    -> undo a cancellation before the period actually ends
//
// ============================================================================
// OWNER-ONLY, NOT A PERMISSION TICK
// ============================================================================
// Roadmap 2.13 refused a `team` permission because whoever can hand out
// permissions can hand themselves every other one. The same argument decides
// this: whoever can change what the business PAYS can change everything, and
// there is no tick a detailer could give a member that means "may cancel our
// subscription but nothing else". `role === "owner"` is the whole rule.
//
// ============================================================================
// CONSENT IS RECORDED BEFORE STRIPE IS CALLED, NOT AFTER
// ============================================================================
// AB 2863 wants express affirmative consent BEFORE billing details are taken.
// Stripe's page is where the card is entered, so the row is written — consent
// text and all — on the way TO it. A subscription that never completes leaves
// an `incomplete` row with a consent on it, which is exactly right: they
// agreed, then did not pay.
//
// AND THE SENTENCE IS GENERATED, NEVER SENT BY THE BROWSER. The screen prints
// `consentSentence(snapshot)` and this function stores `consentSentence(
// snapshot)` — the same function over the same snapshot — so a client cannot
// post a friendlier sentence than the one it showed. All the browser sends is
// that the box was ticked.
//
// ============================================================================
// `summary` EXISTS SO THE SCREEN NEVER DOES THE ARITHMETIC
// ============================================================================
// The billing screen has to PRINT the exact sentence this function will STORE,
// and the exact fee it will CHARGE. There were three ways to arrange that: a
// second copy of `platformBilling.ts` inside `app/` (a second implementation of
// a money path, which is the thing this repo has a rule against), an import
// across the `app/` -> `supabase/` boundary (which works and is strange), or
// asking the server. Asking the server is the only one where the words on the
// screen and the words in the database are produced by the SAME CALL to the
// SAME FUNCTION, so they cannot differ even in principle.
//
// It needs no Stripe key, which is what lets the whole screen be built and
// verified in a browser on a machine that has none. Only the last button does.
//
// ============================================================================
// THE PORTAL IS DELIBERATELY CRIPPLED, AND THE CRIPPLING IS IN THIS FILE
// ============================================================================
// Stripe's customer portal will happily let somebody cancel from it. That
// would skip the early-exit fee and skip our own `canceled_at`, so the row and
// the reality drift apart in the one place that must not.
// **`flow_data` ALONE WAS NOT ENOUGH and the security review was right about
// it**: a deep link decides where they LAND, and the portal CONFIGURATION
// decides what they can reach around it — dashboard state nothing here can
// read, which is the exact failure this item refused for the dunning emails.
// `cardOnlyConfiguration()` below creates that configuration from code with
// cancellation and plan changes off. The cancel button stays ours — and stays
// ONE CLICK, which is the fourth item on the FTC's Adobe list.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { requireMember } from "../_shared/tenant.ts";
import { PLATFORM_URL } from "../_shared/config.ts";
import { stripe, stripeConfigured, StripeError } from "../_shared/stripe.ts";
import {
  consentSentence,
  dunningState,
  exitFeeCents,
  firstChargeCents,
  isPlan,
  isTerm,
  lineItemsFor,
  planFor,
  planLabel,
  termEndDate,
  TERMS,
} from "../_shared/platformBilling.ts";

// Where Stripe sends them back to. The dashboard opens on the billing screen
// in both cases — a detailer who abandoned the card form should land where
// they can try again rather than on a tab that says nothing about it.
const RETURN_URL = `${PLATFORM_URL}/app?settings=billing`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json().catch(() => ({}));
    const member = await requireMember(req, body.business_id ?? null);
    if (!member) return json({ error: "Unauthorized" }, 401);
    if (member.role !== "owner") {
      return json({ error: "Only the owner can change the subscription." }, 403);
    }
    const businessId = member.businessId;

    const { data: sub } = await supabase
      .from("platform_subscriptions")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();

    switch (String(body.action || "")) {
      case "summary":   return await summary(businessId, sub);
      case "checkout":  return await checkout(businessId, body, sub);
      case "portal":    return await portal(sub);
      case "cancel":    return await cancel(businessId, sub);
      case "resume":    return await resume(businessId, sub);
      default:          return json({ error: "Unknown action." }, 400);
    }
  } catch (err) {
    // Stripe's own message is written for the person paying and is worth
    // showing ("your card was declined"). Anything else is a database or
    // runtime error whose text is for the logs — even though the only reader
    // is the verified owner of this business.
    if (err instanceof StripeError) return json({ error: err.message }, err.status);
    console.error("platform-billing failed:", err);
    return json({ error: "Something went wrong. Nothing was charged." }, 500);
  }
});

// ---------------------------------------------------------------------------

/**
 * Everything the billing screen prints, in one call.
 *
 * THE THREE QUOTES ARE ALWAYS RETURNED, EVEN WHEN THERE IS A SUBSCRIPTION.
 * They cost nothing (pure arithmetic) and the alternative is a second round
 * trip the first time somebody's card is declined and they want to see what
 * the other ways to pay would cost.
 */
async function summary(businessId: string, sub: Record<string, unknown> | null) {
  const { data: business } = await supabase
    .from("businesses")
    .select("plan_tier")
    .eq("id", businessId)
    .single();
  const founding = business?.plan_tier === "founding";

  // AND THE LIST FIGURE BESIDE EACH FOUNDING ONE — the owner's ask, 2026-09-05:
  // *"it should visually show like the discount price vs the regular price for
  // the founder spots."* He is right, and the landing page has done it since
  // 2.2 (`<s className="was">` beside the setup fee and the monthly).
  //
  // IT IS COMPUTED HERE RATHER THAN ON THE SCREEN because `quotes` is already
  // resolved to ONE column by the time the browser sees it — a founding
  // account is handed founding figures and has no way to know what the list
  // price was. This is the same `planFor` with `founding: false`, so the struck
  // number is a REAL price the product charges somebody, never an anchor
  // invented to make the other one look smaller. That rule is written on
  // `LandingPage.jsx` and it applies here.
  const quotes: Record<string, unknown> = {};
  for (const term of TERMS) {
    const snap = planFor("website", term, founding);
    const list = planFor("website", term, false);
    quotes[term] = {
      ...snap,
      consent: consentSentence(snap),
      first_charge_cents: firstChargeCents(snap),
      // Equal to the charged figure when there is no founding spot, so the
      // screen's test is "do these differ" rather than "am I founding".
      list_recurring_cents: list.recurring_cents,
      list_setup_cents: list.setup_cents,
    };
  }
  const bookingSnap = planFor("booking", "monthly", false);
  quotes.booking = {
    ...bookingSnap,
    consent: consentSentence(bookingSnap),
    first_charge_cents: firstChargeCents(bookingSnap),
  };

  // The receipts, newest first. Mirrored by the webhook, so this reads our own
  // table and Stripe is not called at all.
  const { data: invoices } = await supabase
    .from("platform_invoices")
    .select("id, number, amount_cents, status, hosted_url, pdf_url, period_start, period_end, paid_at, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(24);

  return json({
    subscription: sub,
    founding,
    quotes,
    invoices: invoices ?? [],
    // What cancelling costs TODAY, from the snapshotted figures on the row.
    exit_fee_cents: sub ? exitFeeCents(sub as never) : 0,
    dunning: dunningState(sub as never),
    // Whether the last button on the screen can do anything yet. False until
    // the owner's Stripe key is set as a function secret.
    configured: stripeConfigured(),
  });
}

async function checkout(
  businessId: string,
  body: Record<string, unknown>,
  sub: Record<string, unknown> | null,
) {
  if (sub && sub.status !== "canceled" && sub.status !== "incomplete") {
    return json({ error: "This business already has a subscription." }, 409);
  }
  if (body.consented !== true) {
    // The tick is the statute, so it is a server-side requirement rather than
    // a disabled button. A disabled button is a UI convenience; this is the
    // thing that would be quoted back in a card dispute.
    return json({ error: "The agreement has to be ticked before we can take payment." }, 400);
  }

  const plan = isPlan(body.plan) ? body.plan : "website";
  const term = isTerm(body.term) ? body.term : "annual-monthly";

  // FOUNDING IS THE DATABASE'S ANSWER, NEVER THE BROWSER'S. `create-business`
  // already refuses to believe `?offer=founding`; believing it here would put
  // the price back in the query string one step later.
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, plan_tier, contact_email")
    .eq("id", businessId)
    .single();
  const snapshot = planFor(plan, term, business?.plan_tier === "founding");
  const consent = consentSentence(snapshot);

  if (!stripeConfigured()) {
    // A deployment with no key is the state this was BUILT in, and it must
    // fail out loud rather than half-write a subscription. Everything above
    // this line still runs, which is what makes the screen testable.
    return json({ error: "Payments are not switched on yet." }, 503);
  }

  // A Stripe customer per business, reused if this is a second attempt.
  let customerId = (sub?.stripe_customer_id as string) || null;
  if (!customerId) {
    const created = await stripe("/customers", {
      name: business?.name,
      email: business?.contact_email || undefined,
      metadata: { business_id: businessId, slug: business?.slug },
    }, { idempotencyKey: `cust:${businessId}` });
    customerId = String(created.id);
  }

  const session = await stripe("/checkout/sessions", {
    mode: "subscription",
    customer: customerId,
    line_items: lineItemsFor(snapshot),
    success_url: `${RETURN_URL}&checkout=done`,
    cancel_url: `${RETURN_URL}&checkout=abandoned`,
    // The webhook is handed the business by Stripe rather than looking it up
    // from a customer id, so an event can be acted on with one read.
    subscription_data: {
      metadata: { business_id: businessId, term, plan: snapshot.plan },
    },
    metadata: { business_id: businessId, term, plan: snapshot.plan },
    // Stripe Tax from day one: it costs nothing until there is a registration
    // to calculate against, and switching it on later means remembering to.
    automatic_tax: { enabled: true },
    customer_update: { address: "auto" },
  }, { idempotencyKey: `co:${businessId}:${term}:${Date.now()}` });

  // The row goes in BEFORE they reach the card form. See the header.
  const now = new Date();
  // THE PREVIOUS CYCLE'S COLUMNS ARE CLEARED IN THE SAME WRITE. This row is
  // reused when somebody cancels and comes back, and a stale
  // `stripe_subscription_id` is not cosmetic: `cancel` and `resume` address
  // Stripe by it, so in the window before `checkout.session.completed` lands
  // they would act on the subscription that was already ended.
  await supabase.from("platform_subscriptions").upsert({
    business_id: businessId,
    ...snapshot,
    consented_at: now.toISOString(),
    consent_text: consent,
    stripe_customer_id: customerId,
    stripe_session_id: String(session.id),
    stripe_subscription_id: null,
    status: "incomplete",
    term_ends_on: termEndDate(now, snapshot.term_months),
    cancel_at_period_end: false,
    canceled_at: null,
    suspended_at: null,
    exit_fee_charged_cents: null,
    dunning_attempts: 0,
    last_failure_at: null,
    last_failure_reason: null,
    current_period_end: null,
  }, { onConflict: "business_id" });

  return json({ url: session.url, label: planLabel(snapshot) });
}

// The portal configuration this product uses, tagged so it can be found again.
const PORTAL_TAG = "dp-card-only";

/**
 * WHAT THE PORTAL IS ALLOWED TO DO, DECIDED IN THIS REPO RATHER THAN IN AN
 * ADMIN PANEL — the security review's own words turned back on this file.
 *
 * `flow_data` deep-links a customer into the card-update flow, but what they
 * can reach AROUND it is governed by the portal CONFIGURATION, which is Stripe
 * dashboard state that nothing here can read. That is precisely the failure
 * this item already refused for the dunning emails: *a guarantee resting on a
 * setting nobody in this repo can see is resting on nothing.* And the money at
 * stake is real — a portal that offers cancellation lets somebody leave a
 * twelve-month term without the early-exit fee ever being charged.
 *
 * So the configuration is created here, with cancellation and plan changes
 * OFF, and found again by its metadata tag rather than stored — one extra GET
 * on a screen somebody opens twice a year, against a migration for one string.
 */
async function cardOnlyConfiguration(): Promise<string> {
  const list = await stripe("/billing_portal/configurations?limit=100");
  const existing = (list.data as Record<string, unknown>[] | undefined)
    ?.find((c) => (c.metadata as Record<string, unknown> | undefined)?.tag === PORTAL_TAG);
  if (existing) return String(existing.id);

  const made = await stripe("/billing_portal/configurations", {
    business_profile: { headline: "Update the card on your subscription" },
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      // ALL THREE OFF ON PURPOSE. Cancelling here would skip the exit fee and
      // our own `canceled_at`; changing the plan would charge a price no
      // screen in this product ever printed; editing the customer record is
      // Stripe's own address form rather than ours.
      subscription_cancel: { enabled: false },
      subscription_update: { enabled: false },
      customer_update: { enabled: false },
    },
    metadata: { tag: PORTAL_TAG },
  }, { idempotencyKey: `portalcfg:${PORTAL_TAG}` });
  return String(made.id);
}

async function portal(sub: Record<string, unknown> | null) {
  if (!sub?.stripe_customer_id) return json({ error: "There is no card on file yet." }, 409);
  const session = await stripe("/billing_portal/sessions", {
    customer: sub.stripe_customer_id,
    return_url: RETURN_URL,
    configuration: await cardOnlyConfiguration(),
    // The deep link on top of the configuration: they land on the card form
    // rather than on a menu with one item.
    flow_data: { type: "payment_method_update" },
  });
  return json({ url: session.url });
}

async function cancel(businessId: string, sub: Record<string, unknown> | null) {
  if (!sub?.stripe_subscription_id) return json({ error: "There is nothing to cancel." }, 409);
  if (sub.status === "canceled") return json({ success: true, already: true });

  // WHAT LEAVING COSTS IS COMPUTED FROM THE ROW, NEVER FROM pricing.js. The
  // figures were snapshotted at checkout precisely so a later price change
  // cannot rewrite a fee somebody already agreed to.
  const fee = exitFeeCents(sub as never);

  if (fee > 0) {
    // Charged NOW, to the card on file, which is what makes the button able to
    // stay one click. An invoice item plus an immediate invoice, so the
    // detailer gets a document naming what it was for — an unexplained charge
    // is a chargeback, and the disclosure is the whole defence.
    await stripe("/invoiceitems", {
      customer: sub.stripe_customer_id,
      amount: fee,
      currency: "usd",
      description: `Ending your ${sub.term_months}-month plan early`,
    }, { idempotencyKey: `exit:${businessId}:${sub.stripe_subscription_id}` });
    const invoice = await stripe("/invoices", {
      customer: sub.stripe_customer_id,
      auto_advance: false,
      metadata: { business_id: businessId, kind: "exit_fee" },
    }, { idempotencyKey: `exitinv:${businessId}:${sub.stripe_subscription_id}` });
    await stripe(`/invoices/${invoice.id}/pay`, {});
    // RECORDED THE MOMENT IT IS TAKEN, BEFORE THE CALL THAT CAN THROW. Money
    // has left their card; if the cancellation below fails, the fee must not
    // be a charge with no record of what it was for. The idempotency keys mean
    // a retry of this whole action reuses the same invoice item rather than
    // charging twice.
    await supabase.from("platform_subscriptions")
      .update({ exit_fee_charged_cents: fee })
      .eq("business_id", businessId);
  }

  // CANCEL AT PERIOD END, not immediately: they have paid for this month and
  // taking the site down the moment they press the button would be charging
  // for something we then withdrew. The refund policy says the current period
  // is not refunded, and that only reads as fair if they keep it.
  await stripe(`/subscriptions/${sub.stripe_subscription_id}`, { cancel_at_period_end: true });

  await supabase.from("platform_subscriptions").update({
    cancel_at_period_end: true,
    canceled_at: new Date().toISOString(),
  }).eq("business_id", businessId);

  return json({ success: true, exit_fee_cents: fee });
}

async function resume(businessId: string, sub: Record<string, unknown> | null) {
  if (!sub?.stripe_subscription_id || !sub.cancel_at_period_end) {
    return json({ error: "There is nothing to restart." }, 409);
  }
  await stripe(`/subscriptions/${sub.stripe_subscription_id}`, { cancel_at_period_end: false });
  // THE EXIT FEE IS NOT REFUNDED HERE AND THE SCREEN SAYS SO BEFORE THE PRESS.
  // Reversing it would mean an unpick nobody has asked for, and a detailer who
  // cancels and un-cancels twice in a week would otherwise be a free loop.
  await supabase.from("platform_subscriptions").update({
    cancel_at_period_end: false,
    canceled_at: null,
  }).eq("business_id", businessId);
  return json({ success: true });
}
