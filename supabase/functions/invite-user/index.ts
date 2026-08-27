// Owner-only: create a staff/owner invite and email the link.
// Invites expire after 7 days (schema default). Revoking is a plain
// database update by the owner, so it needs no function of its own.
//
// Input: { business_id?, email, role }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { businessById, getSettings, requireMember } from "../_shared/tenant.ts";
import { buildBrand, sendTenantEmail } from "../_shared/email.ts";
import { inviteEmail } from "../_shared/emailTemplates.ts";
import { PLATFORM_DOMAIN } from "../_shared/config.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json();
    const member = await requireMember(req, body.business_id ?? null);
    if (!member) return json({ error: "Unauthorized" }, 401);
    if (member.role !== "owner") return json({ error: "Only an owner can invite people." }, 403);

    const email = String(body.email || "").trim().toLowerCase();
    const role = body.role === "owner" ? "owner" : "staff";
    if (!email || !email.includes("@")) return json({ error: "A valid email address is required." }, 400);

    // Already on the team?
    const { data: existingUserId } = await supabase.rpc("get_user_id_by_email", { p_email: email });
    if (existingUserId) {
      const { data: already } = await supabase
        .from("business_users")
        .select("user_id")
        .eq("business_id", member.businessId)
        .eq("user_id", existingUserId)
        .maybeSingle();
      if (already) return json({ error: "That person is already on your team." }, 409);
    }

    // Supersede any live invite for the same address.
    await supabase
      .from("business_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("business_id", member.businessId)
      .eq("email", email)
      .is("accepted_at", null)
      .is("revoked_at", null);

    const { data: invite, error } = await supabase
      .from("business_invites")
      .insert({ business_id: member.businessId, email, role, invited_by: member.userId })
      .select()
      .single();
    if (error) throw error;

    const business = (await businessById(member.businessId))!;
    const settings = await getSettings(business.id);
    const brand = await buildBrand(business, settings);
    const link = `https://${PLATFORM_DOMAIN}/invite/${invite.token}`;
    const msg = inviteEmail(brand, { role, link, expiresAt: invite.expires_at });
    const sent = await sendTenantEmail({ businessId: business.id, to: email, subject: msg.subject, html: msg.html });

    // The link is returned so the owner can copy it if email is unavailable.
    return json({ success: true, invite: { id: invite.id, email, role, expires_at: invite.expires_at, link }, emailed: sent });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
