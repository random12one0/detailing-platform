// Public: redeem an invite token. Creates the account (or attaches an
// existing one), adds the membership with the invited role, name and
// permissions, and marks the invite accepted. Expired, revoked and
// already-used tokens are refused.
//
// GET  ?token=…              → { business_name, email, role, label } for the form
// POST { token, password }   → creates/attaches the account

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { ipOf, LIMITS, withinLimits } from "../_shared/rateLimit.ts";
import { businessById } from "../_shared/tenant.ts";

async function loadInvite(token: string) {
  const { data } = await supabase
    .from("business_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (!data) return { error: "That invite link isn't valid." };
  if (data.accepted_at) return { error: "That invite has already been used." };
  if (data.revoked_at) return { error: "That invite was cancelled." };
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { error: "That invite has expired. Ask the owner to send a new one." };
  }
  return { invite: data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    // ROADMAP 14.13 — the same blunt per-IP ceiling the other twelve public
    // endpoints carry. **THIS IS A COST ITEM, NOT A SECURITY HOLE, AND THE
    // DISTINCTION MATTERS FOR WHOEVER READS THIS NEXT.** The invite token is
    // 192 bits of randomness — `encode(gen_random_bytes(24),'hex')` — so it
    // was never guessable and no amount of looping finds one. What an
    // unmetered public endpoint costs is the project's invocations, which is
    // a bill rather than a way in. Do not read this guard as closing a hole.
    //
    // Public on purpose: `accept-invite` is in `deploy-functions.mjs`'s
    // `PUBLIC_FUNCTIONS`, so it deploys `verify_jwt=false` — an invitee has
    // no session yet, which is the whole point of an invite landing page.
    if (!await withinLimits(supabase, [{ ...LIMITS.publicCeiling, bucket: "accept-invite", key: ipOf(req) }])) {
      return json({ success: false, error: "too_many_requests" }, 429);
    }

    if (req.method === "GET") {
      const token = new URL(req.url).searchParams.get("token") || "";
      const { invite, error } = await loadInvite(token);
      if (error) return json({ error }, 400);
      const business = await businessById(invite!.business_id);
      return json({ business_name: business?.name ?? null, email: invite!.email, role: invite!.role, label: invite!.label ?? null });
    }

    const { token, password } = await req.json();
    if (!token) return json({ error: "token is required" }, 400);
    const { invite, error } = await loadInvite(String(token));
    if (error) return json({ error }, 400);

    // Attach an existing account, or create one with the chosen password.
    let { data: userId } = await supabase.rpc("get_user_id_by_email", { p_email: invite!.email });
    if (!userId) {
      if (!password || String(password).length < 8) {
        return json({ error: "Choose a password of at least 8 characters." }, 400);
      }
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: invite!.email,
        password: String(password),
        email_confirm: true,
      });
      if (createErr || !created?.user) return json({ error: createErr?.message || "Could not create the account." }, 400);
      userId = created.user.id;
    }

    const { error: memberErr } = await supabase.from("business_users").upsert({
      business_id: invite!.business_id,
      user_id: userId,
      role: invite!.role,
      // The name and the ticks the owner chose travel with the invite, so the
      // membership arrives already shaped (roadmap 2.13).
      label: invite!.label ?? null,
      permissions: invite!.permissions ?? [],
      email: invite!.email,
    }, { onConflict: "business_id,user_id" });
    if (memberErr) throw memberErr;

    await supabase
      .from("business_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite!.id);

    return json({ success: true, email: invite!.email });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
