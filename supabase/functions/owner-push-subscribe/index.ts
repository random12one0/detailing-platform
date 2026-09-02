// Member-gated: stores (or refreshes) the caller's Web Push subscription
// FOR ONE BUSINESS. The same browser can subscribe to several businesses
// (unique on business_id + endpoint, not endpoint alone).
//
// Input: { business_id?, subscription: { endpoint, keys: { p256dh, auth } } }
//    or: { business_id?, probe: true } -> { public_key }
//
// THE PROBE EXISTS BECAUSE THE BROWSER CANNOT SUBSCRIBE WITHOUT THE VAPID
// PUBLIC KEY, and roadmap 2.11 step 6 stage 6 built the browser half that
// had never existed. It is served from here rather than shipped as a
// VITE_ env var on purpose: the key already lives beside its private half
// as a function secret, and a second copy in the front-end build is one
// more thing to rotate and to get wrong. It is a PUBLIC key — the whole
// point of it is that a browser holds it — so serving it costs nothing,
// and it still goes through requireMember so the endpoint has one gate.
// A null key is the honest answer when VAPID is not configured: the switch
// then says so instead of failing at the moment the detailer taps it.

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

    if (body.probe) {
      return json({ public_key: Deno.env.get("OWNER_VAPID_PUBLIC_KEY") ?? null });
    }

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
