// Records a site visit for ONE business — a campaign landing (slug given)
// or an organic visit. Service-role only; campaigns / campaign_visits stay
// closed to anon.
//
// Input: { business_slug, visitor_id, slug?, referrer?, path?, skip_log? }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { businessBySlug } from "../_shared/tenant.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json();
    const business = await businessBySlug(body.business_slug);
    if (!business) return json({ ok: false, error: "unknown_business" }, 404);

    const visitorId = typeof body.visitor_id === "string" ? body.visitor_id.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
    const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 500) : null;
    const path = typeof body.path === "string" ? body.path.slice(0, 200) : null;
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null;
    const skipLog = body.skip_log === true;

    if (!visitorId) return json({ error: "visitor_id is required" }, 400);

    let campaign: { id: string; slug: string; name: string; promo_code: string | null; destination: string | null } | null = null;
    if (slug) {
      const { data } = await supabase
        .from("campaigns")
        .select("id, slug, name, promo_code, destination")
        .eq("business_id", business.id)
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (!data) return json({ ok: true, campaign: null });
      campaign = data;
    }

    if (!skipLog) {
      const { error } = await supabase.from("campaign_visits").insert({
        business_id: business.id,
        campaign_id: campaign?.id || null,
        visitor_id: visitorId,
        referrer,
        path,
        user_agent: userAgent,
      });
      if (error) console.error("Failed to record visit:", error);
    }

    return json({ ok: true, campaign, logged: !skipLog });
  } catch (err) {
    return json({ ok: false, error: (err as Error).message }, 500);
  }
});
