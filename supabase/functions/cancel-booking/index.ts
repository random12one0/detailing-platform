// Customer-facing cancellation. The old repo had a deployed cancel-booking
// nothing called, and its code was never committed to git — this is a fresh
// implementation.
//
// Access model: the unguessable booking UUID is the bearer token (same
// posture as the public receipt page). The business's own
// cancellation_window_hours decides how close to the appointment a customer
// can still self-cancel; inside the window they're told to call instead.
//
// Input: { booking_id }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { ipOf, LIMITS, withinLimits } from "../_shared/rateLimit.ts";
import { businessById, getSettings } from "../_shared/tenant.ts";
import { buildBrand, extraVehiclesFor, recipientLang, sendTenantEmail } from "../_shared/email.ts";
import { T } from "../_shared/i18n.ts";
import { cancellationEmail } from "../_shared/emailTemplates.ts";
import { refundInstruction, refundOwed } from "../_shared/connect.ts";
import { money } from "../_shared/emailKit.ts";
import { sendOwnerPush } from "../_shared/ownerPush.ts";
import { receiptUrl } from "../_shared/config.ts";
import { siteFor } from "../_shared/tenantSite.ts";
import { dateStrIn, timeStrIn } from "../_shared/tz.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    // ROADMAP 14.12 — the same blunt per-IP ceiling the other public
    // endpoints already carry. This one cancels a real booking, so the risk here is a write a script can spam
    // rather than a read it can scrape.
    // **The same mechanism on purpose.** 14.9 settled that the blunt
    // ceiling is the right tool here; a tighter per-purpose limit is a
    // separate question and inventing a second mechanism for it would
    // leave two things to keep true.
    if (!await withinLimits(supabase, [{ ...LIMITS.publicCeiling, bucket: "cancel-booking", key: ipOf(req) }])) {
      return json({ success: false, error: "too_many_requests" }, 429);
    }

    const { booking_id } = await req.json();
    if (!booking_id || typeof booking_id !== "string") return json({ error: "booking_id is required" }, 400);

    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id.trim())
      .is("deleted_at", null)
      .maybeSingle();
    if (!booking) return json({ error: "not_found" }, 404);
    if (booking.status === "cancelled") return json({ success: true, message: "Already cancelled." });
    // ROADMAP 2.12 — a PENDING request is cancellable too, and this is also
    // how a customer says no to a quote. They asked for a time and changed
    // their mind, or the price is not for them; either way the slot has to go
    // back, and the detailer has to be told. There is no separate "decline the
    // quote" path for exactly this reason.
    if (booking.status !== "confirmed" && booking.status !== "pending") {
      return json({ error: "This booking can no longer be cancelled online." }, 409);
    }

    const business = (await businessById(booking.business_id))!;
    const settings = await getSettings(business.id);

    // ROADMAP 14.4 — DOES CANCELLING THIS LEAVE MONEY TO SORT OUT.
    //
    // Asked BEFORE the update, and asked of the row already selected above —
    // this function has always read the whole booking, so the payment fact was
    // sitting here unused the entire time. Nothing about the answer changes
    // whether the cancellation goes ahead: Andrew's call, and the roadmap's,
    // is that a customer who wants out gets out. What changes is that somebody
    // is now told about the money instead of nobody.
    const refund = refundOwed(booking);

    const cutoffMs = new Date(booking.start_at).getTime() - settings.cancellation_window_hours * 3600_000;
    if (Date.now() > cutoffMs) {
      return json(
        {
          error:
            `Online cancellation closes ${settings.cancellation_window_hours} hours before the appointment. ` +
            `Please ${business.contact_phone ? `call ${business.contact_phone}` : "contact us"} to cancel.`,
        },
        409,
      );
    }

    const { data: cancelled, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", booking.id)
      .eq("business_id", business.id)
      // ROADMAP 6.4 — ONLY FROM THE STATE THE CHECKS ABOVE READ. Two presses
      // on a bad connection both pass those checks; this is what lets only
      // one of them cancel, and only that one send the two emails and the push.
      .eq("status", booking.status)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!cancelled) return json({ success: true, message: "Already cancelled." });

    // Notifications — best-effort.
    const tz = business.timezone;
    const brand = await buildBrand(business, settings);
    const emailData = {
      id: booking.id,
      // ROADMAP 8.17 STAGE 2A — the language this customer chose, from
      // `bookings.lang`. Absent means English, which is what every booking
      // made before that column existed was written in.
      lang: booking.lang,
      customerName: booking.customer_name,
      customerPhone: booking.customer_phone,
      customerEmail: booking.customer_email,
      customerAddress: booking.customer_address,
      dateStr: dateStrIn(tz, new Date(booking.start_at)),
      startTime: timeStrIn(tz, new Date(booking.start_at)),
      endTime: timeStrIn(tz, new Date(booking.end_at)),
      serviceType: booking.service_type,
      travelFee: Number(booking.travel_fee) || 0,
      travelZone: booking.travel_zone,
      adjustments: booking.price_adjustments ?? [],
      vehicleSize: booking.vehicle_size_label || booking.vehicle_size,
      // ROADMAP 8.10 — the other cars on this same visit, or an empty list.
      extraVehicles: await extraVehiclesFor(booking.id),
      vehicleModel: booking.vehicle_model,
      customerNotes: booking.customer_notes,
      serviceNames: [],
      addOnNames: [],
      subtotal: Number(booking.subtotal),
      siteDiscount: 0,
      siteDiscountPercent: 0,
      promoCode: booking.applied_promo_code,
      promoDiscount: Number(booking.promo_discount) || 0,
      total: Number(booking.total_price),
      receiptUrl: receiptUrl(await siteFor(supabase, business.id), booking.id),
      // Owner-facing only — `cancellationEmail` prints it on that half alone.
      refundNote: refundInstruction(refund, money),
      // ROADMAP 3.4 FOLLOW-UP — the customer-safe half of the same fact.
      refundOwed: refund.owed,
    };
    if (booking.customer_email) {
      const msg = cancellationEmail(brand, emailData, false);
      await sendTenantEmail({ bookingId: booking.id, businessId: business.id, to: booking.customer_email, subject: msg.subject, html: msg.html, text: msg.text });
    }
    if (brand.contactEmail) {
      // ROADMAP 3.4 FAULT 4 — in each recipient's own dashboard language. The refund
      // sentence inside it follows the same language.
      const ownerLang = await recipientLang(brand.contactEmail, business.id);
      const msg = cancellationEmail(
        brand, { ...emailData, refundNote: refundInstruction(refund, money, T(ownerLang)) }, true, ownerLang,
      );
      await sendTenantEmail({ bookingId: booking.id, businessId: business.id, to: brand.contactEmail, subject: msg.subject, html: msg.html, text: msg.text });
    }
    try {
      await sendOwnerPush(business.id, {
        title: "Booking cancelled",
        body: `${booking.customer_name} · ${emailData.dateStr} at ${emailData.startTime}`,
        url: `/job/${booking.id}`,
        tag: `booking-${booking.id}`,
      });
    } catch (pushErr) {
      console.error("Owner push send error:", pushErr);
    }

    // ROADMAP 14.4 — AND THE CUSTOMER IS TOLD TOO, IN THEIR OWN WORDS.
    //
    // NOT `refundInstruction`, which names Stripe and names the detailer's
    // balance and is for the detailer. A customer who has just cancelled
    // something they paid for needs one fact — their money is coming from the
    // business, not from us — and one thing to do if it does not.
    //
    // This is also the half a caller can SEE, which is what makes the fix
    // measurable against the deployed endpoint rather than only in an inbox.
    const refundMessage = !refund.owed
      ? null
      // A SENTENCE JOINT TAKES A FULL STOP — CLAUDE.md, and
      // `tests/em-dash.test.mjs` is the gate. The continuation capitalises
      // with it; it is a sentence now, not a trailing clause.
      //
      // **AND THIS ONE HAS NO SPANISH KEY TO MOVE, WHICH IS ITSELF A GAP.**
      // Checked rather than assumed: neither catalogue holds any fragment of
      // it. It is composed HERE, returned in the JSON, and printed raw by
      // `ManageBookingPage.jsx:390`, so a Spanish-speaking customer who
      // cancels a booking they paid for reads this sentence in English.
      // Logged to ROADMAP 2.12; not fixed on the way past, because giving it
      // a key means deciding which catalogue owns server-composed customer
      // text and that is a design call, not a rename.
      : `You paid for this booking. ${business.name} will arrange your refund directly. `
        + (business.contact_phone
          ? `Call ${business.contact_phone} if you have not heard from them.`
          : "Contact them if you have not heard from them.");

    return json({
      success: true,
      booking: { id: cancelled.id, status: cancelled.status },
      refund: { owed: refund.owed, message: refundMessage },
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
