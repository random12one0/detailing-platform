// Member-gated: removes this browser's push subscription for one business.
//
// Input: { business_id?, endpoint }

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

    const endpoint = body.endpoint;
    if (!endpoint || typeof endpoint !== "string") return json({ error: "endpoint is required" }, 400);

    const { error } = await supabase
      .from("owner_push_subscriptions")
      .delete()
      .eq("business_id", member.businessId)
      .eq("endpoint", endpoint);
    if (error) throw error;
    return json({ success: true });
  } catch (error) {
    return json({ success: false, error: (error as Error)?.message || "internal_error" }, 400);
  }
});
