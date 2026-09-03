// ROADMAP 2.12 — THE CUSTOMER SAYING YES TO A QUOTE. Public, and the
// unguessable booking UUID is the credential, exactly like `cancel-booking`
// and `get-booking-receipt`.
//
// This is the ONLY place `quoted_amount` ever becomes `total_price`. That is
// the whole reason a quote is stored in its own column rather than written
// over the price when it is SENT: CLAUDE.md's rule is that a number printed is
// not a number charged, and until the customer presses this button, the quote
// is a number printed.
//
// SAYING NO IS `cancel-booking`, NOT A SECOND ACTION HERE. A customer who
// won't pay the quoted price is a customer cancelling their booking: the slot
// frees, the detailer is emailed, and the record reads the same as any other
// customer cancellation, which is what it is. One less function, and one less
// path to get the exclusion constraint wrong on.
//
// THE ITEMISATION HAS TO STILL ADD UP, and this is the part that is easy to
// skip. The confirmation email and the invoice both print services, add-ons,
// travel and `price_adjustments` and then a total. Moving `total_price` on its
// own would leave the customer a receipt whose lines are short by the exact
// size of the quote — the same shape of defect as the travel fee that was
// drawn on the booking page and never charged (roadmap 2.8c). So the
// difference lands as a `price_adjustments` line, which every surface that
// itemises already reads, and `subtotal` moves with it.
//
// Input: { booking_id }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { businessById, getSettings } from "../_shared/tenant.ts";
import { buildBrand, ownerRecipients, sendTenantEmail } from "../_shared/email.ts";
import { customerConfirmationEmail, ownerNewBookingEmail } from "../_shared/emailTemplates.ts";
import { sendOwnerPush } from "../_shared/ownerPush.ts";
import { receiptUrl } from "../_shared/config.ts";
import { dateStrIn, timeStrIn } from "../_shared/tz.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const { booking_id } = await req.json();
    if (!booking_id || typeof booking_id !== "string") {
      return json({ error: "booking_id is required" }, 400);
    }

    const { data: booking } = await supabase
      .from("bookings")
      .select("*, services:booking_services(name_at_booking), add_ons:booking_add_ons(add_on:add_ons(name))")
      .eq("id", booking_id.trim())
      .is("deleted_at", null)
      .maybeSingle();
    if (!booking) return json({ error: "not_found" }, 404);
    if (booking.quoted_at === null || booking.quoted_amount === null) {
      return json({ error: "There is no quote waiting on this booking." }, 409);
    }
    if (booking.status !== "pending") {
      return json({ error: "This booking is no longer waiting on you." }, 409);
    }

    const quoted = Math.round(Number(booking.quoted_amount) * 100) / 100;
    const previous = Math.round(Number(booking.total_price) * 100) / 100;
    const delta = Math.round((quoted - previous) * 100) / 100;

    const adjustments = Array.isArray(booking.price_adjustments) ? [...booking.price_adjustments] : [];
    if (delta !== 0) {
      adjustments.push({ label: delta > 0 ? "Quoted price" : "Quoted discount", amount: delta });
    }

    const { data: updated, error } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        total_price: quoted,
        subtotal: Math.round((Number(booking.subtotal) + delta) * 100) / 100,
        price_adjustments: adjustments.length ? adjustments : null,
        quoted_amount: null,
        quoted_note: null,
        quoted_at: null,
      })
      .eq("id", booking.id)
      .eq("business_id", booking.business_id)
      .select()
      .single();
    if (error) throw error;

    // --- Notifications. The customer gets the ordinary confirmation, because
    // that is now exactly what this is: a confirmed booking at an agreed
    // price. Best-effort, like every other send in this repo.
    const business = (await businessById(booking.business_id))!;
    const settings = await getSettings(business.id);
    const tz = business.timezone;
    const brand = await buildBrand(business, settings);
    const emailData = {
      id: booking.id,
      customerName: booking.customer_name,
      customerPhone: booking.customer_phone,
      customerEmail: booking.customer_email,
      customerAddress: booking.customer_address,
      dateStr: dateStrIn(tz, new Date(booking.start_at)),
      startTime: timeStrIn(tz, new Date(booking.start_at)),
      endTime: timeStrIn(tz, new Date(booking.end_at)),
      serviceType: booking.service_type,
      vehicleSize: booking.vehicle_size_label || booking.vehicle_size,
      vehicleModel: booking.vehicle_model,
      customerNotes: booking.customer_notes,
      serviceNames: (booking.services ?? []).map((s: { name_at_booking: string }) => s.name_at_booking),
      addOnNames: (booking.add_ons ?? [])
        .map((a: { add_on?: { name?: string } }) => a?.add_on?.name)
        .filter(Boolean) as string[],
      travelFee: Number(booking.travel_fee) || 0,
      travelZone: booking.travel_zone,
      adjustments,
      subtotal: Number(updated.subtotal),
      siteDiscount: 0,
      siteDiscountPercent: 0,
      promoCode: booking.applied_promo_code,
      promoDiscount: Number(booking.promo_discount) || 0,
      total: quoted,
      receiptUrl: receiptUrl(business.slug, booking.id),
    };

    if (booking.customer_email && settings.email_customer_confirmation) {
      const msg = customerConfirmationEmail(brand, emailData);
      await sendTenantEmail({
        businessId: business.id, to: booking.customer_email, subject: msg.subject, html: msg.html,
      });
    }
    // The detailer has to know the job is on. This is the answer to something
    // THEY sent, so it goes out whatever the new-booking preference says —
    // that setting is about bookings arriving, not about replies to their own
    // quotes. It is the ordinary owner template rather than a bespoke one:
    // what just happened IS a new booking, at the price they named, and a
    // fourth near-copy of the same money table is a fourth place to fix.
    // The push below is what carries the word "quote".
    const ownerMsg = ownerNewBookingEmail(brand, emailData);
    for (const to of ownerRecipients(business, settings)) {
      await sendTenantEmail({
        businessId: business.id, to, subject: ownerMsg.subject, html: ownerMsg.html,
      });
    }
    try {
      if (settings.push_enabled) {
        await sendOwnerPush(business.id, {
          title: "Quote accepted",
          body: `${booking.customer_name} — ${emailData.dateStr} at ${emailData.startTime} ($${quoted.toFixed(2)})`,
          url: `/admin/job/${booking.id}`,
          tag: `booking-${booking.id}`,
        });
      }
    } catch (pushErr) {
      console.error("Owner push send error:", pushErr);
    }

    return json({ success: true, booking: { id: updated.id, status: updated.status, total_price: updated.total_price } });
  } catch (err) {
    console.error("accept-quote error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
