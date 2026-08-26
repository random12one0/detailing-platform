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
import { businessById, getSettings } from "../_shared/tenant.ts";
import { buildBrand, sendTenantEmail } from "../_shared/email.ts";
import { cancellationEmail } from "../_shared/emailTemplates.ts";
import { sendOwnerPush } from "../_shared/ownerPush.ts";
import { receiptUrl } from "../_shared/config.ts";
import { dateStrIn, timeStrIn } from "../_shared/tz.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
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
    if (booking.status !== "confirmed") return json({ error: "This booking can no longer be cancelled online." }, 409);

    const business = (await businessById(booking.business_id))!;
    const settings = await getSettings(business.id);

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
      .select()
      .single();
    if (error) throw error;

    // Notifications — best-effort.
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
      vehicleSize: booking.vehicle_size,
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
      receiptUrl: receiptUrl(business.slug, booking.id),
    };
    if (booking.customer_email) {
      const msg = cancellationEmail(brand, emailData, false);
      await sendTenantEmail({ businessId: business.id, to: booking.customer_email, subject: msg.subject, html: msg.html });
    }
    if (brand.contactEmail) {
      const msg = cancellationEmail(brand, emailData, true);
      await sendTenantEmail({ businessId: business.id, to: brand.contactEmail, subject: msg.subject, html: msg.html });
    }
    try {
      await sendOwnerPush(business.id, {
        title: "Booking cancelled",
        body: `${booking.customer_name} — ${emailData.dateStr} at ${emailData.startTime}`,
        url: `/admin/job/${booking.id}`,
        tag: `booking-${booking.id}`,
      });
    } catch (pushErr) {
      console.error("Owner push send error:", pushErr);
    }

    return json({ success: true, booking: { id: cancelled.id, status: cancelled.status } });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
