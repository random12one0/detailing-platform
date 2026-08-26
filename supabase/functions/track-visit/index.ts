import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// Records a site visit — either a campaign landing (slug provided, e.g. the QR
// code at the golf course pointing at /golf) or a plain organic homepage visit
// (no slug). Service-role only; the public site never touches campaigns /
// campaign_visits directly, so RLS on those tables can stay closed to anon.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const visitorId = typeof body.visitor_id === "string" ? body.visitor_id.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
    const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 500) : null;
    const path = typeof body.path === "string" ? body.path.slice(0, 200) : null;
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null;
    // When true, resolve the campaign as normal but DON'T record the visit. The
    // owner previewing their own campaign link (signed into /admin) sends this so
    // they see the banner/promo exactly like a customer without inflating stats.
    const skipLog = body.skip_log === true;

    if (!visitorId) {
      return new Response(JSON.stringify({ error: "visitor_id is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    let campaign: { id: string; slug: string; name: string; promo_code: string | null; destination: string } | null = null;

    if (slug) {
      const { data } = await supabase
        .from("campaigns")
        .select("id, slug, name, promo_code, destination")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (!data) {
        // Unknown/inactive slug — no campaign to attribute, and nothing worth
        // logging (typo or a dead link), so skip the insert entirely.
        return new Response(JSON.stringify({ ok: true, campaign: null }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      campaign = data;
    }

    if (!skipLog) {
      const { error: insertError } = await supabase.from("campaign_visits").insert({
        campaign_id: campaign?.id || null,
        visitor_id: visitorId,
        referrer,
        path,
        user_agent: userAgent,
      });
      if (insertError) {
        console.error("Failed to record visit:", insertError);
      }
    }

    return new Response(JSON.stringify({ ok: true, campaign, logged: !skipLog }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error in track-visit function:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
