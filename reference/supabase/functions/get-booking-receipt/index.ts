import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// Service role client — bypasses RLS. This is a public receipt link, access-
// controlled by the unguessable booking UUID, so verify_jwt is FALSE for this
// function. We only ever return the ONE booking requested by id.
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// Same joined shape the receipt UI renders: booking + interior/exterior package
// names + booking_add_ons -> add_ons for human-readable service names.
const BOOKING_SELECT = `
  *,
  interior_package:packages!interior_package_id(id, name, tier, base_price),
  exterior_package:packages!exterior_package_id(id, name, tier, base_price),
  add_ons:booking_add_ons(add_on_id, add_on:add_ons(id, name, price))
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // Accept the booking id via POST JSON { id } and/or a ?id= query param.
    let id: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body && typeof body.id === "string") id = body.id;
      } catch (_) {
        // no/invalid JSON body — fall back to query param below
      }
    }
    if (!id) {
      const url = new URL(req.url);
      id = url.searchParams.get("id");
    }

    if (!id || typeof id !== "string" || id.trim() === "") {
      return new Response(
        JSON.stringify({ error: "id is required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }
    id = id.trim();

    const [bookingRes, businessRes] = await Promise.all([
      supabase.from("bookings").select(BOOKING_SELECT).eq("id", id).single(),
      supabase
        .from("business_info")
        .select("brand_name, dropoff_address, phone")
        .eq("id", 1)
        .single(),
    ]);

    if (bookingRes.error || !bookingRes.data) {
      return new Response(
        JSON.stringify({ error: "not_found" }),
        { status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        booking: bookingRes.data,
        business: businessRes.error ? null : businessRes.data,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "internal_error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
