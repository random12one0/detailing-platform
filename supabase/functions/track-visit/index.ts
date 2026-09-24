// Records a site visit for ONE business — a campaign landing (slug given)
// or an organic visit.
//
// **THIS HEADER SAID "Service-role only; campaigns / campaign_visits stay
// closed to anon." THAT WAS FALSE AND IS CORRECTED HERE — measured
// 2026-09-23, ROADMAP 14.12.** Two independent sources say so:
//
//   · the DEPLOYED function config on `kguqylyzgyzfktkfnhjb` reads
//     `verify_jwt=false` (Management API, the `.env` token — there is no
//     `supabase/config.toml` in this repo, so the deployed value is the
//     only value);
//   · `scripts/deploy-functions.mjs` lists `track-visit` in
//     `PUBLIC_FUNCTIONS`, and it sets `verify_jwt: !PUBLIC_FUNCTIONS.has(fn)`
//     — so the repo's own tooling is what produces that `false`.
//
// **So a stranger can reach this, and every call writes a visit row.** The
// claim was not merely unverified; it was contradicted by the thing that
// deploys it. Nothing in this source ever enforced it — no key check, no
// header check, no `requireMember`.
//
// **A comment asserting a security property that nothing enforces is worse
// than no comment**, because it answers the question a reader came to ask.
//
// Input: { business_slug, visitor_id, slug?, referrer?, path?, skip_log? }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { ipOf, LIMITS, withinLimits } from "../_shared/rateLimit.ts";
import { businessBySlug } from "../_shared/tenant.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    // ROADMAP 14.12 — the same blunt per-IP ceiling the other public
    // endpoints already carry. This one writes a visit row per call. Its header claimed service-role-only; the
    // DEPLOYED config says verify_jwt=false and deploy-functions.mjs lists it
    // in PUBLIC_FUNCTIONS, so a stranger can reach it.
    // **The same mechanism on purpose.** 14.9 settled that the blunt
    // ceiling is the right tool here; a tighter per-purpose limit is a
    // separate question and inventing a second mechanism for it would
    // leave two things to keep true.
    if (!await withinLimits(supabase, [{ ...LIMITS.publicCeiling, bucket: "track-visit", key: ipOf(req) }])) {
      return json({ success: false, error: "too_many_requests" }, 429);
    }

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
      // **AN UNKNOWN TAG IS STILL A VISIT — fixed 2026-09-10.** This returned
      // here, BEFORE the insert, so a QR code on a flyer whose link had since
      // been deleted or switched off made its visitors vanish from the count
      // entirely. That is the worst case to lose: the detailer paid to print
      // the thing. The visit is logged as an organic one, which is what it now
      // is — the answer to the caller is unchanged, so no discount is applied.
      campaign = data ?? null;
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
