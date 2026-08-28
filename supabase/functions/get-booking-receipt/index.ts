// Public, shareable receipt data — access-controlled by the unguessable
// booking UUID (same posture as the old system). Returns only that one
// booking plus the OWNING business's public contact fields; local date/time
// are derived from the business's timezone.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { businessById, getSettings } from "../_shared/tenant.ts";
import { dateStrIn, timeStrIn } from "../_shared/tz.ts";

const BOOKING_SELECT = `
  *,
  services:booking_services(service_id, name_at_booking, price_at_booking, duration_at_booking),
  add_ons:booking_add_ons(add_on_id, add_on:add_ons(id, name, price))
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    let id: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (typeof body?.id === "string") id = body.id;
      } catch (_) { /* fall back to query param */ }
    }
    if (!id) id = new URL(req.url).searchParams.get("id");
    if (!id?.trim()) return json({ error: "id is required" }, 400);

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("id", id.trim())
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !booking) return json({ error: "not_found" }, 404);

    const business = await businessById(booking.business_id);
    const tz = business?.timezone || "UTC";
    // The customer's page needs to know how close to the appointment online
    // cancellation closes, so it can say so BEFORE they tap rather than
    // after the server refuses. Only this one setting is exposed; the rest
    // of business_settings stays private.
    const settings = business ? await getSettings(business.id) : null;

    return json({
      booking: {
        ...booking,
        booking_date: dateStrIn(tz, new Date(booking.start_at)),
        start_time: timeStrIn(tz, new Date(booking.start_at)),
        end_time: timeStrIn(tz, new Date(booking.end_at)),
      },
      business: business
        ? {
          slug: business.slug,
          brand_name: business.name,
          phone: business.contact_phone,
          // Needed by the receipt: when the change window has closed we tell
          // the customer to get in touch, and telling someone to get in
          // touch without giving them any way to do it is not help.
          email: business.contact_email,
          dropoff_address: business.dropoff_address,
          timezone: business.timezone,
          cancellation_window_hours: settings?.cancellation_window_hours ?? 0,
        }
        : null,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
