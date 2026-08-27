// Serves a booking's .ics file. Used by BOTH audiences from one
// implementation: the customer clicks it from their confirmation email /
// receipt page, and the owner taps "Add to calendar" in the dashboard.
//
// Access model matches the receipt page: the unguessable booking UUID is
// the credential. ?audience=owner adds the customer's contact details to
// the description (the customer's own copy never needs them).
//
//   GET /booking-ics?id=<uuid>[&audience=owner]

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { CORS_HEADERS, json, preflight } from "../_shared/http.ts";
import { businessById } from "../_shared/tenant.ts";
import { buildIcs, icsFilename } from "../_shared/ics.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const url = new URL(req.url);
    let id = url.searchParams.get("id");
    const audience = url.searchParams.get("audience") === "owner" ? "owner" : "customer";
    if (!id && req.method === "POST") {
      try {
        const b = await req.json();
        if (typeof b?.id === "string") id = b.id;
      } catch { /* query param only */ }
    }
    if (!id?.trim()) return json({ error: "id is required" }, 400);

    const { data: booking } = await supabase
      .from("bookings")
      .select("*, services:booking_services(name_at_booking)")
      .eq("id", id.trim())
      .is("deleted_at", null)
      .maybeSingle();
    if (!booking) return json({ error: "not_found" }, 404);
    if (booking.status === "cancelled") return json({ error: "cancelled" }, 410);

    const business = await businessById(booking.business_id);
    if (!business) return json({ error: "not_found" }, 404);

    const serviceNames = (booking.services ?? []).map((s: { name_at_booking: string }) => s.name_at_booking);
    const location = booking.service_type === "mobile" && booking.customer_address
      ? booking.customer_address
      : business.dropoff_address || "";

    const descriptionLines = [
      serviceNames.length ? `Service: ${serviceNames.join(", ")}` : "",
      booking.vehicle_model ? `Vehicle: ${booking.vehicle_model}` : "",
      audience === "owner" ? `Customer: ${booking.customer_name} — ${booking.customer_phone}` : "",
      audience === "owner" && booking.customer_notes ? `Notes: ${booking.customer_notes}` : "",
      audience === "customer" && business.contact_phone ? `Questions? ${business.contact_phone}` : "",
    ].filter(Boolean);

    const ics = buildIcs({
      uid: `booking-${booking.id}-${audience}`,
      timezone: business.timezone,
      start: new Date(booking.start_at),
      end: new Date(booking.end_at),
      summary: audience === "owner"
        ? `${booking.customer_name} — ${serviceNames.join(", ") || "Detail"}`
        : `${business.name} — ${serviceNames.join(", ") || "Detail"}`,
      description: descriptionLines.join("\n"),
      location,
      organizerName: business.name,
      organizerEmail: business.contact_email,
    });

    return new Response(ics, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${icsFilename(
          audience === "owner" ? booking.customer_name : business.name,
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
