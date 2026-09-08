// ROADMAP 2.20 STAGE 3 — the CUSTOMER's end. Public, like the receipt.
//
// The booking's own unguessable uuid is the credential, exactly as it is for
// `get-booking-receipt`, `cancel-booking` and `reschedule-booking` — the
// customer reaches this from a link in their own email and has no account.
//
// ---------------------------------------------------------------------------
// A DIRECT CHARGE ON THE DETAILER'S ACCOUNT. THIS IS THE WHOLE FEATURE.
// ---------------------------------------------------------------------------
// `stripeAccount` on the call below is the difference between the money
// landing in the DETAILER's balance and landing in this platform's. With it,
// the payment belongs to them, the receipt Stripe sends carries their name,
// the fee comes off their side and the dispute is theirs to answer. Without
// it, the identical code takes a stranger's customer's money into an account
// the owner would then be legally holding — which
// `docs/payments-research-2026-09-04.md` says must never happen.
//
// **There is no `application_fee_amount` and there must never be one.** A
// `type=standard` account with no application fee is the arrangement where
// Stripe charges the platform nothing at all; adding a fee changes who Stripe
// bills and turns this into a product that takes a cut of other people's
// revenue, which is a different business with different rules.
//
// ---------------------------------------------------------------------------
// WHY THIS IS STRIPE'S HOSTED PAGE AND NOT THE EMBEDDED FORM
// ---------------------------------------------------------------------------
// Platform billing (stage 2) embeds Stripe's Payment Element in our own card,
// because that screen is OURS and should look like the rest of the dashboard.
// This one is the opposite case: the payer is a member of the public who has
// never seen this product, on a phone, following a link from an email. A
// hosted page at `checkout.stripe.com` gives them Apple Pay and Google Pay
// with no work, is branded as THE DETAILER on a direct charge, and means no
// card field is ever rendered by a page we serve to a stranger.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { businessById } from "../_shared/tenant.ts";
import { siteFor } from "../_shared/tenantSite.ts";
import { receiptUrl } from "../_shared/config.ts";
import { stripe, stripeConfigured, StripeError } from "../_shared/stripe.ts";
import { checkoutLineName, payability } from "../_shared/connect.ts";
import { ipOf, LIMITS, withinLimits } from "../_shared/rateLimit.ts";

/** `reason` decides the status code, so the screen and the server agree. */
const STATUS: Record<string, number> = {
  not_available: 409,
  already_paid: 409,
  cancelled: 409,
  nothing_due: 409,
  below_minimum: 409,
  business_offline: 409,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    // THE BLUNT CEILING ONLY. Roadmap 2.21's own note applies: a per-caller
    // rule keyed on anything the customer controls turns a household sharing
    // an address into a payment nobody can make, and this endpoint cannot be
    // used to hold a slot or send an email — the two things the throttles
    // exist to protect. It is here so a loop cannot spend the project's
    // invocations.
    if (!await withinLimits(supabase, [{ ...LIMITS.publicCeiling, bucket: "pay-booking", key: ipOf(req) }])) {
      return json({ error: "too_many_requests" }, 429);
    }

    const body = await req.json().catch(() => ({}));
    const id = typeof body?.booking_id === "string" ? body.booking_id.trim() : "";
    if (!id) return json({ error: "booking_id is required" }, 400);

    if (!stripeConfigured()) return json({ error: "not_available" }, 503);

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, business_id, status, payment_status, total_price, final_amount, start_at, stripe_session_id, customer_email, customer_name")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!booking) return json({ error: "not_found" }, 404);

    const business = await businessById(booking.business_id);
    if (!business) return json({ error: "not_found" }, 404);

    const { data: conn } = await supabase
      .from("connected_accounts")
      .select("stripe_account_id, charges_enabled, card_payments_enabled")
      .eq("business_id", booking.business_id)
      .maybeSingle();

    // THE DECISION IS ASKED HERE AND NOT IN THE EMAIL THAT LINKED HERE. A
    // receipt link lives in an inbox for ever, so the button in it outlives
    // every switch on the settings screen — this is the check that is true at
    // the moment somebody presses it.
    const verdict = payability({
      booking,
      settings: {
        stripe_account_id: conn?.stripe_account_id ?? null,
        stripe_charges_enabled: conn?.charges_enabled ?? false,
        card_payments_enabled: conn?.card_payments_enabled ?? false,
      },
      businessStatus: business.status,
    });
    if (!verdict.ok) {
      return json({ error: verdict.reason, message: verdict.message }, STATUS[verdict.reason] ?? 409);
    }

    const site = await siteFor(business.id);
    const back = receiptUrl(site, booking.id);
    const when = booking.start_at
      ? new Date(booking.start_at).toLocaleDateString("en-US", {
        timeZone: business.timezone || "UTC",
        month: "short",
        day: "numeric",
      })
      : null;

    const session = await stripe(
      "/checkout/sessions",
      {
        mode: "payment",
        success_url: `${back}?paid=1`,
        cancel_url: back,
        // Stripe emails its own receipt from the DETAILER's account, which is
        // the one a customer would expect and the one that can answer a
        // dispute. Ours still goes out unchanged.
        customer_email: booking.customer_email || undefined,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: verdict.amountCents,
            product_data: { name: checkoutLineName(business.name, when) },
          },
        }],
        // THE BOOKING ID TRAVELS ON THE PAYMENT INTENT, NOT ONLY ON THE
        // SESSION. On a connected account the events that arrive most
        // reliably are the payment ones, and a `payment_intent.succeeded`
        // carrying no booking id is a payment nobody can attribute — the
        // detailer sees money and cannot tell which job it settled.
        metadata: { booking_id: booking.id, business_id: business.id },
        payment_intent_data: {
          metadata: { booking_id: booking.id, business_id: business.id },
        },
      },
      {
        stripeAccount: conn!.stripe_account_id!,
        // Idempotent on the AMOUNT as well as the booking: a customer whose
        // price changed between two taps must get a second session, not the
        // stale one. Without the amount in the key, Stripe returns the first
        // session and quietly charges the old figure.
        idempotencyKey: `pay:${booking.id}:${verdict.amountCents}`,
      },
    );

    // Recorded before the customer is sent anywhere, so the webhook can find
    // this booking from the session even if the customer closes the tab.
    await supabase
      .from("bookings")
      .update({ stripe_session_id: session.id as string })
      .eq("id", booking.id);

    return json({ url: session.url, amount_cents: verdict.amountCents });
  } catch (e) {
    if (e instanceof StripeError) {
      // A Stripe failure here is almost always the detailer's account rather
      // than the customer's card — no card has been typed yet. So the
      // customer is told something true and useless to an attacker, and the
      // detail goes to the log.
      console.error("pay-booking stripe", e.code, e.message);
      return json({ error: "not_available", message: "Card payment is not available for this business right now." }, 409);
    }
    console.error("pay-booking", e);
    return json({ error: "server_error" }, 500);
  }
});
