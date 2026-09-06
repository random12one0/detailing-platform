// Customer-facing reschedule. Fresh implementation (the old deployed one was
// never committed to git). Same UUID-bearer access model as cancel-booking;
// the move must clear the SAME authoritative slot gate as a new booking
// (hours, blockouts, buffer, advance notice, per-day cap), and the
// cancellation window applies to the ORIGINAL start — inside it, call us.
//
// Input: { booking_id, booking_date, start_time }  (business-local values)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { businessById, getSettings } from "../_shared/tenant.ts";
import { servicesForBooking } from "../_shared/pricing.ts";
import { validateSlot } from "../_shared/slotValidation.ts";
import { buildBrand, sendTenantEmail } from "../_shared/email.ts";
import { rescheduleEmail } from "../_shared/emailTemplates.ts";
import { sendOwnerPush } from "../_shared/ownerPush.ts";
import { receiptUrl } from "../_shared/config.ts";
import { siteFor } from "../_shared/tenantSite.ts";
import { dateStrIn, timeStrIn } from "../_shared/tz.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const { booking_id, booking_date, start_time } = await req.json();
    if (!booking_id || typeof booking_id !== "string") return json({ error: "booking_id is required" }, 400);
    if (!booking_date || !start_time) return json({ error: "booking_date and start_time are required" }, 400);

    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id.trim())
      .is("deleted_at", null)
      .maybeSingle();
    if (!booking) return json({ error: "not_found" }, 404);
    // ROADMAP 2.12 — a pending request can be moved, and it stays pending.
    // A customer picking a different time has not been accepted by anybody;
    // silently confirming them here would let the request mode be walked
    // straight past.
    if (booking.status !== "confirmed" && booking.status !== "pending") {
      return json({ error: "This booking can no longer be rescheduled online." }, 409);
    }

    const business = (await businessById(booking.business_id))!;
    const settings = await getSettings(business.id);
    const tz = business.timezone;

    const cutoffMs = new Date(booking.start_at).getTime() - settings.cancellation_window_hours * 3600_000;
    if (Date.now() > cutoffMs) {
      return json(
        {
          error:
            `Online changes close ${settings.cancellation_window_hours} hours before the appointment. ` +
            `Please ${business.contact_phone ? `call ${business.contact_phone}` : "contact us"} to reschedule.`,
        },
        409,
      );
    }

    const durationMinutes = Math.round(
      (new Date(booking.end_at).getTime() - new Date(booking.start_at).getTime()) / 60_000,
    );
    const check = await validateSlot({
      business,
      settings,
      bookingDate: String(booking_date),
      startTime: String(start_time),
      durationMinutes,
      serviceType: booking.service_type,
      excludeBookingId: booking.id,
      // Roadmap 2.8c — a MOVE re-checks the rules that depend on the date.
      // A service offered only on Tuesdays has to refuse a Thursday, and
      // this is the path a customer reschedules through.
      services: await servicesForBooking(supabase, business.id, booking.id),
    });
    if (!check.ok) return json({ error: check.error }, check.status ?? 409);

    const oldDateStr = dateStrIn(tz, new Date(booking.start_at));
    const oldStartTime = timeStrIn(tz, new Date(booking.start_at));

    const { data: moved, error } = await supabase
      .from("bookings")
      .update({ start_at: check.startAt!.toISOString(), end_at: check.endAt!.toISOString() })
      .eq("id", booking.id)
      .eq("business_id", business.id)
      .select()
      .single();
    if (error) {
      if (error.code === "23P01") {
        return json({ error: "That time was just taken by another booking. Please choose a different time." }, 409);
      }
      throw error;
    }

    // Notifications — best-effort.
    const brand = await buildBrand(business, settings);
    const emailData = {
      id: booking.id,
      customerName: booking.customer_name,
      customerPhone: booking.customer_phone,
      customerEmail: booking.customer_email,
      customerAddress: booking.customer_address,
      dateStr: String(booking_date),
      startTime: timeStrIn(tz, check.startAt!),
      endTime: timeStrIn(tz, check.endAt!),
      serviceType: booking.service_type,
      travelFee: Number(booking.travel_fee) || 0,
      travelZone: booking.travel_zone,
      adjustments: booking.price_adjustments ?? [],
      vehicleSize: booking.vehicle_size_label || booking.vehicle_size,
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
    };
    if (booking.customer_email) {
      const msg = rescheduleEmail(brand, emailData, oldDateStr, oldStartTime, false);
      await sendTenantEmail({ businessId: business.id, to: booking.customer_email, subject: msg.subject, html: msg.html, text: msg.text });
    }
    if (brand.contactEmail) {
      const msg = rescheduleEmail(brand, emailData, oldDateStr, oldStartTime, true);
      await sendTenantEmail({ businessId: business.id, to: brand.contactEmail, subject: msg.subject, html: msg.html, text: msg.text });
    }
    try {
      await sendOwnerPush(business.id, {
        title: "Booking rescheduled",
        body: `${booking.customer_name} — now ${emailData.dateStr} at ${emailData.startTime}`,
        url: `/admin/job/${booking.id}`,
        tag: `booking-${booking.id}`,
      });
    } catch (pushErr) {
      console.error("Owner push send error:", pushErr);
    }

    return json({
      success: true,
      booking: {
        id: moved.id,
        booking_date: emailData.dateStr,
        start_time: emailData.startTime,
        end_time: emailData.endTime,
      },
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
