// Member-gated: stores (or refreshes) the caller's Web Push subscription
// FOR ONE BUSINESS. The same browser can subscribe to several businesses
// (unique on business_id + endpoint, not endpoint alone).
//
// Input: { business_id?, subscription: { endpoint, keys: { p256dh, auth } } }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { requireMember } from "../_shared/tenant.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json();
    const member = await requireMember(req, body.business_id ?? null);
    if (!member) return json({ error: "Unauthorized" }, 401);

    const subscription = body.subscription;
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;
    if (!endpoint || !p256dh || !auth) return json({ error: "Invalid push subscription" }, 400);

    const { error } = await supabase.from("owner_push_subscriptions").upsert(
      {
        business_id: member.businessId,
        user_id: member.userId,
        endpoint,
        p256dh,
        auth,
        user_agent: req.headers.get("user-agent") || null,
      },
      { onConflict: "business_id,endpoint" },
    );
    if (error) throw error;
    return json({ success: true });
  } catch (error) {
    return json({ success: false, error: (error as Error)?.message || "internal_error" }, 400);
  }
});
