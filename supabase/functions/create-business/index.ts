// Signup: create a business and make the caller its owner.
//
// TIMEZONE IS REQUIRED HERE. The businesses.timezone column keeps a default
// only as a backstop for direct inserts; every business created through the
// real signup path must state its zone, because a business quietly running
// on the wrong clock books every job at the wrong time.
//
// Input: { name, slug, timezone, contact_email?, contact_phone?,
//          dropoff_address?, service_area?, claim_founding? }
//
// claim_founding is a REQUEST, never a fact. The database decides (see
// claim_founding_spot), because otherwise anyone who noticed
// ?offer=founding in a URL could grant themselves founding pricing for
// the life of their account.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    // The caller must be a signed-in user; they become the owner.
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const name = String(body.name || "").trim();
    const slug = String(body.slug || "").trim().toLowerCase();
    const timezone = String(body.timezone || "").trim();

    if (!name) return json({ error: "A business name is required." }, 400);
    if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(slug)) {
      return json({ error: "Choose a web address using lowercase letters, numbers and dashes." }, 400);
    }
    if (!timezone) {
      return json({ error: "Choose your timezone — every booking time depends on it." }, 400);
    }
    // Validate against the real tz database before writing (the database
    // trigger would also reject it; this returns a friendlier message).
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    } catch {
      return json({ error: `"${timezone}" is not a recognized timezone.` }, 400);
    }

    const { data: existing } = await supabase.from("businesses").select("id").eq("slug", slug).maybeSingle();
    if (existing) return json({ error: "That web address is already taken." }, 409);

    const { data: business, error } = await supabase
      .from("businesses")
      .insert({
        name,
        slug,
        timezone,
        contact_email: body.contact_email?.trim() || user.email || null,
        contact_phone: body.contact_phone?.trim() || null,
        dropoff_address: body.dropoff_address?.trim() || null,
        service_area: body.service_area?.trim() || null,
      })
      .select()
      .single();
    if (error) throw error;

    // Owner membership, default settings and branding so the dashboard has
    // something coherent to render on first load — plus a working week, so
    // the booking page has open days from the moment it exists. A new
    // business with no hours is a booking page that can never be booked,
    // which is a confusing first impression to hand someone.
    const WEEKDAY_HOURS = [1, 2, 3, 4, 5].map((weekday) => ({
      business_id: business.id, weekday, open_time: "09:00", close_time: "17:00",
    }));
    const WEEKEND_CLOSED = [0, 6].map((weekday) => ({
      business_id: business.id, weekday, open_time: null, close_time: null,
    }));

    await Promise.all([
      supabase.from("business_users").insert({
        business_id: business.id, user_id: user.id, role: "owner", email: user.email,
      }),
      supabase.from("business_settings").insert({ business_id: business.id }),
      supabase.from("business_branding").insert({ business_id: business.id }),
      supabase.from("business_hours").insert([...WEEKDAY_HOURS, ...WEEKEND_CLOSED]),
    ]);

    // The offer is granted by the database or not at all.
    let founding = false;
    if (body.claim_founding) {
      const { data: granted } = await supabase.rpc("claim_founding_spot", {
        p_business_id: business.id,
      });
      founding = granted === true;
    }

    return json({
      success: true,
      founding,
      business: { id: business.id, slug: business.slug, timezone: business.timezone },
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
