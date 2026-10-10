// ROADMAP 99.1 — connect / disconnect a detailer's Google Business profile.
//
// Three actions: `status`, `start`, `disconnect`. Every one answers with the
// same object (`describeLink`), so the screen has one shape to draw.
//
// OWNER ONLY, answering 404 to anybody else — the posture `connect-account`
// set and for the same reason: which Google account a business is tied to is
// not a thing staff get to change, and a 403 names the endpoint worth poking.
//
// NO GOOGLE CALL EXISTS IN THIS FILE. `start` in stub mode writes our own row
// and returns; with the mode off it answers 503 and the screen says the
// feature is not switched on. See `_shared/googleBusiness.ts` for why.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { requireMember } from "../_shared/tenant.ts";
import { describeLink, stubMode, stubOutcome } from "../_shared/googleBusiness.ts";

const linkFor = async (businessId: string) =>
  (await supabase.from("google_business_links").select("*").eq("business_id", businessId).maybeSingle()).data;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "";
    const businessId = typeof body?.business_id === "string" ? body.business_id : null;

    const member = await requireMember(req, businessId);
    if (!member || member.role !== "owner") return json({ error: "not_found" }, 404);
    const bid = member.businessId;
    const available = stubMode(Deno.env.get("GOOGLE_BUSINESS_MODE"));

    if (action === "status") return json(describeLink(await linkFor(bid), available));

    if (action === "start") {
      if (!available) return json({ error: "not_configured" }, 503);
      // `outcome` lets a tester see the two failure screens without a broken
      // Google. It is read only here, in stub mode.
      const state = stubOutcome(body?.outcome);
      const now = new Date().toISOString();
      const { error } = await supabase.from("google_business_links").upsert({
        business_id: bid,
        state,
        account_label: state === "connected" ? "test account (stub)" : null,
        connected_at: state === "connected" ? now : null,
        last_error_at: state === "connected" ? null : now,
        updated_at: now,
      }, { onConflict: "business_id" });
      if (error) return json({ error: "could_not_save" }, 500);
      return json(describeLink(await linkFor(bid), available));
    }

    if (action === "disconnect") {
      const { error } = await supabase.from("google_business_links").delete().eq("business_id", bid);
      if (error) return json({ error: "could_not_save" }, 500);
      return json(describeLink(null, available));
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("google-business", e);
    return json({ error: "server_error" }, 500);
  }
});
