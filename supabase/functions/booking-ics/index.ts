// Serves a booking's .ics file. Used by BOTH audiences from one
// implementation: the customer clicks it from their confirmation email /
// receipt page, and the owner taps "Add to calendar" in the dashboard.
//
// Access model for the CUSTOMER's copy matches the receipt page: the
// unguessable booking UUID is the credential, because the customer opens it
// from an email and has no account.
//
// ROADMAP 14.2 — AND THAT MODEL WAS WRONG FOR THE OWNER'S COPY. `audience`
// was a plain query word, so anyone holding their own confirmation link could
// type `&audience=owner` on it and get back the detailer's version: the
// customer's full name and phone number in the SUMMARY and DESCRIPTION, and
// the customer's own note. Measured anonymously against the deployed function
// on 2026-09-16 with no apikey and no Authorization header at all — name
// `Chris Vogel`, phone `562-555-0447`. The owner's copy now needs the owner's
// session, exactly like every other owner surface; a caller without one is
// handed the customer's copy rather than an error, because the customer's
// link is a legitimate request and must keep working.
//
//   GET /booking-ics?id=<uuid>                  -> the customer's copy
//   GET /booking-ics?id=<uuid>&audience=owner   -> the owner's copy, WITH
//                                                  `Authorization: Bearer <session jwt>`

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { CORS_HEADERS, json, preflight } from "../_shared/http.ts";
import { businessById, requireMember } from "../_shared/tenant.ts";
import { ipOf, LIMITS, withinLimits } from "../_shared/rateLimit.ts";
import { buildIcs, icsFilename } from "../_shared/ics.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    // ROADMAP 14.2 — the blunt ceiling every other public endpoint already
    // has. This one reads and never writes, sends nothing and holds no slot,
    // so the ceiling is all it wants: a loop cannot spend the project's
    // invocations. Same shape and same number as `pay-booking`.
    if (!await withinLimits(supabase, [{ ...LIMITS.publicCeiling, bucket: "booking-ics", key: ipOf(req) }])) {
      return json({ error: "too_many_requests" }, 429);
    }

    const url = new URL(req.url);
    let id = url.searchParams.get("id");
    const askedForOwner = url.searchParams.get("audience") === "owner";
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

    // THE ONE LINE THE ITEM IS ABOUT. Asking for the owner's copy is not the
    // same as being the owner: the membership is checked against THIS
    // booking's business, so a detailer's session cannot open another
    // detailer's job either. Anyone else silently gets the customer's copy.
    const audience = askedForOwner && await requireMember(req, booking.business_id, { allowSupport: true })
      ? "owner"
      : "customer";

    const serviceNames = (booking.services ?? []).map((s: { name_at_booking: string }) => s.name_at_booking);
    const location = booking.service_type === "mobile" && booking.customer_address
      ? booking.customer_address
      : business.dropoff_address || "";

    const descriptionLines = [
      serviceNames.length ? `Service: ${serviceNames.join(", ")}` : "",
      booking.vehicle_model ? `Vehicle: ${booking.vehicle_model}` : "",
      audience === "owner" ? `Customer: ${booking.customer_name} · ${booking.customer_phone}` : "",
      audience === "owner" && booking.customer_notes ? `Notes: ${booking.customer_notes}` : "",
      audience === "customer" && business.contact_phone ? `Questions? ${business.contact_phone}` : "",
    ].filter(Boolean);

    const ics = buildIcs({
      uid: `booking-${booking.id}-${audience}`,
      timezone: business.timezone,
      start: new Date(booking.start_at),
      end: new Date(booking.end_at),
      summary: audience === "owner"
        ? `${booking.customer_name} · ${serviceNames.join(", ") || "Detail"}`
        : `${business.name} · ${serviceNames.join(", ") || "Detail"}`,
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
