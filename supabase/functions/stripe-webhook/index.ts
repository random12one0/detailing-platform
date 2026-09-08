// What Stripe tells us, and what this product does about it — roadmap 2.20
// stage 2. The only public, unauthenticated endpoint in this repo that WRITES,
// which is why the first thing it does is a signature check and the second is
// an idempotency check.
//
// ============================================================================
// THE SIGNATURE IS THE ENTIRE AUTHENTICATION
// ============================================================================
// Stripe has no bearer token to present, so this URL is open to the internet.
// Without `verifyWebhook` anybody could POST `invoice.paid` and give themselves
// a free subscription, or POST `customer.subscription.deleted` and take a
// competitor's booking page offline. `_shared/stripe.ts` carries the mechanics;
// the two easy mistakes are noted there and both are made here on purpose:
// the RAW body is read before anything parses it, and the timestamp tolerance
// is not skipped.
//
// **IT MUST BE DEPLOYED WITH JWT VERIFICATION OFF** (`--no-verify-jwt`), or
// Supabase rejects Stripe's request before this file runs. That is safe
// precisely because of the paragraph above, and it is the one deployment flag
// in this repo that is load-bearing rather than convenient.
//
// ============================================================================
// STRIPE REDELIVERS. EVERY HANDLER HERE MUST BE SAFE TO RUN TWICE.
// ============================================================================
// Stripe retries until it gets a 2xx and will send the same event again even
// after one. `stripe_events` is the lock and the INSERT is what takes it — a
// primary-key conflict means somebody else already has this event, so we stop.
// Doing the work first and recording afterwards is the version that suspends a
// business twice, or charges an exit fee twice.
//
// ============================================================================
// A 2xx ON ANYTHING WE CANNOT HANDLE, AND THAT IS DELIBERATE
// ============================================================================
// Returning 500 for an event this file does not care about makes Stripe retry
// it for three days and eventually disable the endpoint — so an unrecognised
// event type, or one for a business that no longer exists, is acknowledged.
// What is NOT acknowledged is a bad signature (400) or a database write that
// actually failed (500), because both of those are worth retrying.
//
// ============================================================================
// SUSPENSION IS `businesses.status = 'paused'` AND NOTHING ELSE
// ============================================================================
// `businessBySlug` and `get_public_business_profile` both filter on
// `status = 'active'`, so one column takes the PUBLIC booking page offline.
// `businessById` does not, so a customer who already booked keeps the page
// they cancel and reschedule from — and the dashboard is reached by membership,
// so the detailer keeps every screen and every row. That is the pricing page's
// printed promise exactly: *"the site goes offline until it is paid. Nothing is
// deleted."* Roadmap 4.4's platform-admin suspend is the same mechanism.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json } from "../_shared/http.ts";
import { ipOf, LIMITS, withinLimits } from "../_shared/rateLimit.ts";
import { PLATFORM_URL } from "../_shared/config.ts";
import { stripe, verifyWebhook, webhookSecret, connectWebhookSecret, API_VERSION, StripeError } from "../_shared/stripe.ts";
import { ourStatus } from "../_shared/platformBilling.ts";
import { sendTenantEmail } from "../_shared/email.ts";
import { platformBrand, PLATFORM_NAME } from "../_shared/platformBrand.ts";
import { billingEmail } from "../_shared/emailTemplates.ts";

const BILLING_URL = `${PLATFORM_URL}/app?settings=billing`;

type Obj = Record<string, unknown>;
const asObj = (v: unknown): Obj => (v && typeof v === "object" ? v as Obj : {});
const stamp = (unix: unknown) =>
  typeof unix === "number" ? new Date(unix * 1000).toISOString() : null;

Deno.serve(async (req) => {
  // No preflight: a browser never calls this, and answering OPTIONS would only
  // advertise it.
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // ROADMAP 2.21 — THE CEILING ONLY, AND ONE THING THAT MUST NOT BE DONE
  // HERE. The signature is checked before any database work and an unsigned
  // POST cannot even consume an event id, so a flood costs function
  // invocations and nothing else.
  //
  // **NO PER-CALLER THROTTLE KEYED ON ANYTHING STRIPE CONTROLS.** Every
  // legitimate event arrives from their address range IN BURSTS — a
  // subscription cycle is four or five events in a second — and throttling
  // those means a payment that succeeded is never recorded, which presents as
  // a paying detailer's booking page going offline. The ceiling below is
  // deliberately far above any burst Stripe produces, and it is the same one
  // every public endpoint gets rather than a rule invented for this one.
  if (!await withinLimits(supabase, [
    { bucket: "public:ip", key: ipOf(req), ...LIMITS.publicCeiling },
  ])) return json({ error: "Too many requests" }, 429);

  // RAW FIRST. The signature is over bytes — see _shared/stripe.ts.
  const raw = await req.text();
  let event: Obj;

  // TWO SECRETS, TRIED IN TURN — 2026-09-08, and `connectWebhookSecret`'s own
  // header is why. A Stripe endpoint's "Events from" is CREATE-ONLY, so
  // connected-account events need a SECOND endpoint, and a second endpoint
  // gets its own signing secret. Both point here.
  //
  // TRIED RATHER THAN CHOSEN, and that is deliberate. The obvious version
  // parses `event.account` out of the raw body first and picks a secret from
  // it — which means an UNVERIFIED field decides which key verifies it. It is
  // arguably still safe (a forged field just picks a key the signature then
  // fails against), but it is a sentence somebody has to reason about
  // correctly every time they read it, and getting it wrong is silent. Two
  // HMACs over a few hundred bytes is nothing; a subtle authentication
  // argument is not.
  //
  // The PLATFORM secret goes first because it is every event today. The error
  // reported is the FIRST one, because "no signature header" is the useful
  // message and the connect attempt's failure would only ever restate it.
  const secrets = [webhookSecret(), connectWebhookSecret()].filter(Boolean);
  let firstErr: StripeError | null = null;
  for (const secret of secrets) {
    try {
      event = await verifyWebhook(raw, req.headers.get("Stripe-Signature"), secret);
      firstErr = null;
      break;
    } catch (err) {
      firstErr ??= err as StripeError;
    }
  }
  if (firstErr || !secrets.length) {
    // No secret configured at all is a 503, not a 400: nothing is wrong with
    // the request, and telling Stripe 400 makes it stop retrying an event we
    // could have handled once somebody sets the secret.
    const e = firstErr ?? new StripeError("Webhook secret is not configured.", 503);
    console.error("webhook rejected:", e.message);
    return json({ error: e.message }, e.status ?? 400);
  }
  event = event!;

  const id = String(event.id ?? "");
  const type = String(event.type ?? "");

  // THE API VERSION THIS EVENT WAS SHAPED BY — checked, not assumed, 2026-09-08.
  //
  // An endpoint is registered AT a version and Stripe renders every event to
  // that version's shape. Two endpoints on two versions send two different
  // payloads for the same event, and **Stripe's create-endpoint form defaults
  // to the newest version rather than to the one your other endpoints use** —
  // so a mismatch is what you get by pressing the obvious button.
  //
  // **IT PASSES EVERY TEST IN THIS REPO**, because they all run against the
  // pinned shape, and it fails only in production. This repo has measured the
  // damage once already: at `2024-06-20` an invoice carries `charge`; at a
  // newer version it does not, so the decline reason went silently null and
  // the email simply stopped printing the one line a detailer can act on.
  //
  // **IT LOGS AND DOES NOT REJECT, and that is deliberate.** A 400 makes
  // Stripe retry for three days and then disable the endpoint, which turns a
  // wrong-shaped payment record into no payment record at all — a worse
  // failure than the one being reported. What this buys is that the cause is
  // named in the logs in ten seconds instead of never.
  const sentWith = typeof event.api_version === "string" ? event.api_version : "";
  if (sentWith && sentWith !== API_VERSION) {
    console.error(
      `API VERSION MISMATCH: endpoint sent ${sentWith}, this code is written for ${API_VERSION}.` +
      ` Event ${id} (${type}) may have a different payload shape than every test here assumes.` +
      ` Fix it on the ENDPOINT in Stripe — the version is create-only, so it needs a new endpoint.`,
    );
  }

  // THE LOCK, TAKEN BEFORE ANY WORK. A conflict means a duplicate delivery.
  const { error: claim } = await supabase.from("stripe_events").insert({ id, type });
  if (claim) {
    // 23505 is unique_violation: already handled, and a 200 stops the retries.
    if (claim.code === "23505") return json({ received: true, duplicate: true });
    console.error("could not record the event:", claim);
    return json({ error: "could not record the event" }, 500);
  }

  try {
    // ROADMAP 2.20 STAGE 3 — WHOSE EVENT IS THIS?
    //
    // `event.account` is present on an event from a CONNECTED account and
    // absent on one about this platform's own Stripe account. That single
    // field is the whole discriminator, and routing on it is not optional:
    // `checkout.session.completed` now arrives from both directions, and a
    // detailer's customer paying $150 would otherwise be handed to
    // `completed()`, which reads it as a DETAILER buying a subscription.
    const account = typeof event.account === "string" ? event.account : "";
    const object = asObj(asObj(event.data).object);
    await (account ? handleConnected(type, object, account) : handle(type, object));
    return json({ received: true });
  } catch (err) {
    // The event is recorded but its work failed, so a retry would see a
    // duplicate and skip. Release the claim so Stripe's retry can do the work.
    await supabase.from("stripe_events").delete().eq("id", id);
    console.error(`webhook ${type} failed:`, err);
    return json({ error: (err as Error).message }, 500);
  }
});

// ---------------------------------------------------------------------------

async function handle(type: string, object: Obj): Promise<void> {
  switch (type) {
    case "checkout.session.completed":       return await completed(object);
    case "customer.subscription.updated":
    case "customer.subscription.deleted":    return await subscriptionChanged(object);
    case "invoice.paid":
    case "invoice.payment_succeeded":        return await invoicePaid(object);
    case "invoice.payment_failed":           return await invoiceFailed(object);
    // Everything else is acknowledged and ignored. See the header.
    default: return;
  }
}

/**
 * Finds the business a Stripe object belongs to.
 *
 * `metadata.business_id` first, because `platform-billing` puts it on both the
 * session and the subscription precisely so this is one read. The customer id
 * is the fallback for objects Stripe creates itself — an invoice for a renewal
 * carries the subscription's metadata, but an invoice raised by hand does not.
 */
async function businessFor(object: Obj): Promise<string | null> {
  const meta = asObj(object.metadata);
  if (typeof meta.business_id === "string") return meta.business_id;
  const customer = typeof object.customer === "string" ? object.customer : null;
  if (!customer) return null;
  const { data } = await supabase
    .from("platform_subscriptions")
    .select("business_id")
    .eq("stripe_customer_id", customer)
    .maybeSingle();
  return (data?.business_id as string) ?? null;
}

/** The card on file, as Stripe describes it. We never see a number. */
function cardFrom(paymentMethod: Obj): Obj {
  const card = asObj(paymentMethod.card);
  if (!card.brand) return {};
  return {
    card_brand: String(card.brand),
    card_last4: String(card.last4 ?? ""),
    card_exp_month: Number(card.exp_month) || null,
    card_exp_year: Number(card.exp_year) || null,
  };
}

async function completed(session: Obj): Promise<void> {
  const businessId = await businessFor(session);
  const subId = typeof session.subscription === "string" ? session.subscription : null;
  if (!businessId || !subId) return;

  // Expanded so the card and the period arrive in one call rather than three.
  const sub = await stripe(
    `/subscriptions/${subId}?expand[]=default_payment_method`,
  );

  // `?? "incomplete"` AND NOT `?? "active"`, which is what this line said until
  // the security review read it against the module's own rule. An unknown
  // Stripe status must never resolve to "they have paid" — the safe direction
  // is the row staying `incomplete` until a status we recognise arrives, which
  // costs a detailer a refresh and cannot give the product away.
  await supabase.from("platform_subscriptions").update({
    stripe_subscription_id: subId,
    stripe_customer_id: typeof session.customer === "string" ? session.customer : undefined,
    status: ourStatus(sub.status) ?? "incomplete",
    current_period_end: stamp(sub.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end === true,
    dunning_attempts: 0,
    last_failure_at: null,
    last_failure_reason: null,
    ...cardFrom(asObj(sub.default_payment_method)),
  }).eq("business_id", businessId);

  if (ourStatus(sub.status) === "active") await setSuspension(businessId, false);
}

async function subscriptionChanged(sub: Obj): Promise<void> {
  const businessId = await businessFor(sub);
  if (!businessId) return;

  // NULL MEANS "A STATUS WE HAVE NEVER HEARD OF" AND THE ROW KEEPS WHAT IT
  // HAD. Defaulting an unknown status to `active` gives the product away;
  // defaulting it to `suspended` takes a paying detailer's site down because
  // Stripe shipped a feature we do not use. Neither is a guess worth making.
  const mapped = ourStatus(sub.status);
  const patch: Obj = {
    current_period_end: stamp(sub.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end === true,
  };
  if (mapped) patch.status = mapped;
  if (mapped === "canceled") patch.canceled_at = new Date().toISOString();

  // THE CARD IS CAPTURED HERE NOW, AND IT HAD TO MOVE WHEN THE PAYMENT FORM
  // DID (2026-09-05). With Stripe's hosted page the card arrived on
  // `checkout.session.completed`, which is the ONE event our own Payment
  // Element never produces — so the first subscription bought through the new
  // form went `active` with **"Card · None on file"** on the billing screen.
  // Found by reading the row after a real payment, not by reading the code.
  //
  // `default_payment_method` is set because `subscribe` passes
  // `save_default_payment_method: on_subscription`, and it arrives as an ID, so
  // it costs one call — the same shape as the decline reason two functions
  // down. Best-effort: a card we cannot name must never stop the status being
  // recorded, and it is only fetched when the row has nothing better.
  const pmId = typeof sub.default_payment_method === "string" ? sub.default_payment_method : null;
  if (pmId) {
    try {
      const pm = await stripe(`/payment_methods/${pmId}`);
      Object.assign(patch, cardFrom(pm));
    } catch (e) {
      console.error("could not read the card on file:", e);
    }
  }

  await supabase.from("platform_subscriptions").update(patch).eq("business_id", businessId);

  if (mapped === "suspended") await suspend(businessId, null, 0);
  // A CANCELLED SUBSCRIPTION IS NOT A SUSPENSION AND MUST NOT LOOK LIKE ONE.
  // Somebody who cancelled deliberately, at the end of a period they paid for,
  // gets their page turned off by roadmap 4.4's admin screen or by the churn
  // process — not by an unpaid-invoice mechanism that emails them about a card.
}

/**
 * IS THIS INVOICE THE SUBSCRIPTION'S, OR SOMETHING ELSE WE RAISED?
 *
 * **THE ONE EXPLOITABLE DEFECT THE SECURITY REVIEW FOUND (2026-09-05), and it
 * bit in both directions.** `platform-billing`'s `cancel` raises a ONE-OFF
 * invoice for the early-exit fee, and it carries `metadata.business_id` so
 * `businessFor()` resolves it happily — so without this test:
 *
 *   · PAYING an exit fee cleared the whole dunning state and **brought a
 *     suspended booking page back online with the subscription still unpaid.**
 *     A detailer whose page had gone dark could cancel, pay $240, and be
 *     serving customers again while owing $600.
 *   · A DECLINED exit fee arrives with no `next_payment_attempt` — a manual
 *     invoice has no retry schedule — so `exhausted` was true on the first
 *     failure and **a fully paid, current subscription was suspended
 *     immediately**, skipping the two weeks the pricing page promises in
 *     print. That one needs no attacker; it is an ordinary customer
 *     cancelling with an expired card.
 *
 * The test is the invoice's own `subscription` field, not the metadata, so it
 * also covers the next one-off invoice somebody adds without reading this.
 * A one-off is still MIRRORED — it is a real charge and belongs in the
 * receipts list — it simply does not move the account's state.
 */
const isSubscriptionInvoice = (invoice: Obj) =>
  typeof invoice.subscription === "string" && invoice.subscription !== "";

async function invoicePaid(invoice: Obj): Promise<void> {
  const businessId = await businessFor(invoice);
  if (!businessId) return;

  await mirrorInvoice(businessId, invoice);
  if (!isSubscriptionInvoice(invoice)) return;

  // A PAYMENT CLEARS THE WHOLE DUNNING STATE, including the suspension. That
  // is the promise's other half — *"the page comes back the moment a payment
  // goes through"* — and it must not need a human.
  const { data: sub } = await supabase
    .from("platform_subscriptions")
    .select("status, suspended_at, stripe_subscription_id")
    .eq("business_id", businessId)
    .maybeSingle();
  if (!sub) return;

  // AND IT MUST BE THE LIVE SUBSCRIPTION. A late `invoice.paid` arriving after
  // `customer.subscription.deleted` would otherwise flip a cancelled row back
  // to active — Stripe does not promise the order these land in.
  if (sub.stripe_subscription_id && sub.stripe_subscription_id !== invoice.subscription) return;
  if (sub.status === "canceled") return;

  await supabase.from("platform_subscriptions").update({
    status: "active",
    dunning_attempts: 0,
    last_failure_at: null,
    last_failure_reason: null,
    suspended_at: null,
  }).eq("business_id", businessId);

  // ONLY UN-PAUSE WHAT WE PAUSED. A business an admin churned, or one paused
  // for any other reason roadmap 4.4 invents, must not be quietly reopened by
  // an invoice being paid.
  if (sub.suspended_at) await setSuspension(businessId, false);
}

async function invoiceFailed(invoice: Obj): Promise<void> {
  const businessId = await businessFor(invoice);
  if (!businessId) return;

  await mirrorInvoice(businessId, invoice);
  // See `isSubscriptionInvoice` above: a declined EXIT FEE is not two weeks of
  // failed renewals, and treating it as one takes a paid-up detailer offline.
  if (!isSubscriptionInvoice(invoice)) return;

  // THE BANK'S OWN WORDS, AND THEY COST ONE EXTRA CALL BECAUSE `charge` IS AN
  // ID RATHER THAN AN OBJECT. This read `asObj(invoice.charge).outcome
  // .seller_message` and always produced null — `invoice.charge` is the STRING
  // `ch_...` unless the object was expanded, so `asObj` returned `{}` and the
  // reason silently vanished. Found against a real failed renewal on a Stripe
  // test clock (2026-09-05), not by reading the code: it looked correct and the
  // email simply never printed the one line a detailer can act on.
  //
  // `failure_message` is what a person should read ("Your card was declined",
  // "Your card has insufficient funds"); `outcome.seller_message` is written
  // for the merchant and is often *"The bank did not return any further
  // details"*, which is worse than nothing on a screen. Prefer the first.
  //
  // ONE CALL, ONLY ON A FAILURE, AND IT IS BEST-EFFORT: a reason we cannot
  // fetch must never stop the account being marked past due.
  let reason: string | null = null;
  try {
    const inline = asObj(invoice.last_finalization_error).message;
    if (typeof inline === "string" && inline) {
      reason = inline;
    } else if (typeof invoice.charge === "string" && invoice.charge) {
      const charge = await stripe(`/charges/${invoice.charge}`);
      reason = (charge.failure_message as string)
        ?? (asObj(charge.outcome).seller_message as string)
        ?? null;
    }
  } catch (e) {
    console.error("could not read why the card was refused:", e);
  }
  reason = reason ? String(reason).slice(0, 200) : null;
  const amount = Number(invoice.amount_due ?? 0) / 100;

  // NO MORE ATTEMPTS SCHEDULED IS THE MOMENT THE PROMISE FIRES. Stripe sets
  // `next_payment_attempt` to null when its retry schedule is exhausted, and
  // that is the only signal in the whole flow that says "two weeks are up" —
  // counting attempts ourselves would mean hard-coding a schedule that lives
  // in Stripe's dashboard.
  const exhausted = invoice.next_payment_attempt === null || invoice.next_payment_attempt === undefined;

  const { data: sub } = await supabase
    .from("platform_subscriptions")
    .select("dunning_attempts")
    .eq("business_id", businessId)
    .maybeSingle();
  const attempts = Number(sub?.dunning_attempts ?? 0) + 1;

  await supabase.from("platform_subscriptions").update({
    status: exhausted ? "suspended" : "past_due",
    dunning_attempts: attempts,
    last_failure_at: new Date().toISOString(),
    last_failure_reason: reason,
  }).eq("business_id", businessId);

  if (exhausted) await suspend(businessId, reason, amount);
  else await tell(businessId, "failed", amount, reason);
}

/** Mirror one Stripe invoice so the billing page never has to call Stripe. */
async function mirrorInvoice(businessId: string, invoice: Obj): Promise<void> {
  const id = typeof invoice.id === "string" ? invoice.id : null;
  if (!id) return;
  await supabase.from("platform_invoices").upsert({
    id,
    business_id: businessId,
    number: invoice.number ?? null,
    amount_cents: Number(invoice.amount_due ?? invoice.total ?? 0),
    currency: String(invoice.currency ?? "usd"),
    status: String(invoice.status ?? "open"),
    hosted_url: invoice.hosted_invoice_url ?? null,
    pdf_url: invoice.invoice_pdf ?? null,
    period_start: stamp(invoice.period_start),
    period_end: stamp(invoice.period_end),
    paid_at: stamp(asObj(invoice.status_transitions).paid_at),
  }, { onConflict: "id" });
}

async function suspend(businessId: string, reason: string | null, amount: number): Promise<void> {
  await supabase.from("platform_subscriptions").update({
    status: "suspended",
    suspended_at: new Date().toISOString(),
  }).eq("business_id", businessId);
  await setSuspension(businessId, true);
  await tell(businessId, "suspended", amount, reason);
}

/**
 * The one column that darkens a booking page.
 *
 * Guarded on the CURRENT value in both directions: a business that is
 * `churned` is not made `paused`, and one that was never `paused` is not made
 * `active`. Roadmap 4.4 will have its own reasons to set this column and they
 * must not be overwritten by a card.
 */
async function setSuspension(businessId: string, off: boolean): Promise<void> {
  await supabase
    .from("businesses")
    .update({ status: off ? "paused" : "active" })
    .eq("id", businessId)
    .eq("status", off ? "active" : "paused");
}

/** The email. Best-effort, exactly like every other send in this product. */
async function tell(
  businessId: string,
  kind: "failed" | "suspended",
  amount: number,
  reason: string | null,
): Promise<void> {
  const { data: business } = await supabase
    .from("businesses")
    .select("name, contact_email")
    .eq("id", businessId)
    .maybeSingle();

  // WHO IT GOES TO IS THE OWNER'S OWN ADDRESS, NOT `notification_emails`. That
  // list is where BOOKING alerts go and a detailer may well have pointed it at
  // a shared inbox or a member of staff; a card being declined is not their
  // team's business.
  const to = business?.contact_email;
  if (!to) return;

  const mail = billingEmail(platformBrand(PLATFORM_URL), {
    kind, businessName: String(business.name ?? "Your business"),
    billingUrl: BILLING_URL, amount, reason,
  });
  await sendTenantEmail({
    businessId, to, subject: mail.subject, html: mail.html, text: mail.text,
    senderName: PLATFORM_NAME,
  });
}

// ---------------------------------------------------------------------------
// A DETAILER'S OWN CUSTOMER PAID — roadmap 2.20 stage 3.
//
// These events come from a CONNECTED account, so nothing in here may touch a
// subscription, a suspension or an invoice of ours. The only fact being
// recorded is that one booking has been settled.
//
// TWO EVENT TYPES, ON PURPOSE, AND THE SECOND IS THE ONE THAT SAVES IT.
// `checkout.session.completed` is the ordinary path. `payment_intent.succeeded`
// is what still arrives when the customer's card needs a bank challenge and
// the session finishes minutes later, or when Stripe's own retry completes a
// payment the session never saw. Handling only the first leaves a paid job
// showing as unpaid, which the detailer discovers by chasing somebody who has
// already paid.
//
// IT IS SAFE TO RUN BOTH, AND THAT IS STRUCTURAL RATHER THAN CAREFUL:
// `bookings.stripe_payment_intent` carries a UNIQUE index, so the second
// writer of the same intent changes nothing.
// ---------------------------------------------------------------------------

async function handleConnected(type: string, object: Obj, account: string): Promise<void> {
  // ── THE DETAILER DISCONNECTED US — 2026-09-08.
  //
  // Without this the platform never learns they left: the row keeps saying
  // connected, the dashboard keeps showing it, and `pay-booking` keeps
  // offering a card button that routes to an account which has revoked our
  // access. The customer meets the failure, at the car, with the detailer
  // standing there.
  //
  // **THE TRAP, AND IT IS THE WHOLE REASON THIS IS NOT TWO LINES:
  // `data.object` HERE IS AN APPLICATION, NOT AN ACCOUNT.** Every other event
  // in this function carries its subject in `data.object`; this one carries
  // OURS — the platform application that was deauthorized — and the account
  // that did it is only in `event.account`. Reading `object.id` gets the
  // application id, matches no row, and silently does nothing, which looks
  // exactly like a detailer who never disconnected.
  if (type === "account.application.deauthorized") {
    // `stripe_account_id` is nulled rather than merely disabled, because
    // "connected" is read off that column in three places and a row still
    // naming an account that revoked us is the bug being fixed.
    // `card_payments_enabled` is DELIBERATELY UNTOUCHED — it is the
    // detailer's own preference about being charged 2.9%, not Stripe's
    // answer, and it should survive them reconnecting later.
    const { error } = await supabase
      .from("connected_accounts")
      .update({
        stripe_account_id: null,
        charges_enabled: false,
        connected_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_account_id", account);
    if (error) throw new Error(`could not record the disconnect: ${error.message}`);
    return;
  }

  // ── STRIPE CHANGED ITS MIND ABOUT THEM.
  //
  // `charges_enabled` is STRIPE'S ANSWER and is re-read rather than
  // remembered (the column's own comment): a Standard account can be
  // connected long before Stripe finishes checking it, and can be switched
  // off again later. Without this event the row keeps whatever was true at
  // the moment they connected — so a detailer Stripe has since restricted
  // still gets a card button, and every customer pressing it fails.
  if (type === "account.updated") {
    const { error } = await supabase
      .from("connected_accounts")
      .update({
        charges_enabled: object.charges_enabled === true,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_account_id", account);
    if (error) throw new Error(`could not record the account update: ${error.message}`);
    return;
  }

  if (type !== "checkout.session.completed" && type !== "payment_intent.succeeded") return;

  const meta = asObj(object.metadata);
  const bookingId = typeof meta.booking_id === "string" ? meta.booking_id : "";
  if (!bookingId) return;

  // The payment intent is the identity of the money. On a session it is a
  // reference; on the intent itself it is the object's own id.
  const intent = type === "payment_intent.succeeded"
    ? String(object.id ?? "")
    : typeof object.payment_intent === "string"
    ? object.payment_intent
    : String(asObj(object.payment_intent).id ?? "");
  if (!intent) return;

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, business_id, payment_status, stripe_payment_intent")
    .eq("id", bookingId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!booking) return;

  // ---------------------------------------------------------------------
  // THE CHECK THAT MATTERS, AND IT IS NOT ABOUT STRIPE BEING UNTRUSTWORTHY.
  //
  // The signature proves Stripe sent this. It does NOT prove who chose the
  // metadata: a connected account is a stranger's own Stripe account, and
  // whoever holds it can create a session carrying any `booking_id` they
  // like and have Stripe deliver it here, correctly signed. Without this,
  // one detailer could mark another detailer's jobs paid — for a dollar,
  // from their own dashboard, in bulk.
  //
  // So the account that sent the event must be the account we have on file
  // for the business that owns the booking. Anything else is dropped in
  // silence: it is not our business to tell the sender why.
  // ---------------------------------------------------------------------
  const { data: conn } = await supabase
    .from("connected_accounts")
    .select("stripe_account_id")
    .eq("business_id", booking.business_id)
    .maybeSingle();
  if (!conn?.stripe_account_id || conn.stripe_account_id !== account) {
    console.error("connected event for a booking that is not this account's", bookingId, account);
    return;
  }

  // Already settled — by this same payment, by cash the detailer recorded, or
  // by a waiver. Nothing to do, and OVERWRITING would be wrong: a detailer
  // who marked a job paid in cash and then got a duplicate card payment has a
  // refund to make, not a status to flip.
  if (booking.payment_status === "paid" || booking.payment_status === "waived") return;

  const { error } = await supabase
    .from("bookings")
    .update({
      payment_status: "paid",
      paid_online_at: new Date().toISOString(),
      stripe_payment_intent: intent,
    })
    .eq("id", booking.id);

  // 23505 on the unique index means another delivery of the same payment got
  // here first. That is this handler working, not failing — and throwing
  // would release the event claim and invite Stripe to retry for ever.
  if (error && error.code !== "23505") throw new Error(`could not record the payment: ${error.message}`);
}
