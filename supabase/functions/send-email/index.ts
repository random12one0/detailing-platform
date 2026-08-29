// The ONE internal email relay. Every other function sends mail by calling
// this with the service-role key; this file is the only place that knows the
// provider (Resend today — swap providers by editing this file alone).
//
// Addressing policy: mail is sent FROM the platform's verified domain with
// the tenant's brand name as display name; Reply-To is the tenant's own
// contact address, so replies reach the right detailer and never another
// business.
//
// Input: { business_id, to, subject, body, attachments? }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { PLATFORM_FROM_ADDRESS } from "../_shared/config.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  // Internal-only: callable ONLY with the service-role key, so this can
  // never be abused as an open relay.
  const auth = req.headers.get("Authorization") || "";
  if (!SERVICE_ROLE_KEY || auth !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const { business_id, to, subject, body, attachments } = await req.json();
    if (!business_id || !to || !subject || !body) {
      return json({ error: "business_id, to, subject and body are required" }, 400);
    }

    // Reserved and non-existent domains (RFC 2606 / 6761) can never receive
    // mail: sending anyway produces a hard bounce, and bounces damage the
    // sending domain's reputation. Seeded demo tenants use these addresses,
    // and a real detailer typo'd into one is equally undeliverable.
    const domain = String(to).split("@").pop()?.toLowerCase() ?? "";
    if (/(^|\.)(test|invalid|localhost|example)$/.test(domain) || /^example\.(com|net|org)$/.test(domain)) {
      console.warn("undeliverable domain - email not sent:", { to, subject });
      return json({ success: true, skipped: "undeliverable_domain" });
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("name, contact_email")
      .eq("id", business_id)
      .maybeSingle();
    if (!business) return json({ error: "unknown_business" }, 404);

    const payload: Record<string, unknown> = {
      from: `${String(business.name).replace(/[<>]/g, "")} <${PLATFORM_FROM_ADDRESS}>`,
      to: [to],
      subject,
      html: body,
    };
    if (business.contact_email) payload.reply_to = business.contact_email;
    if (Array.isArray(attachments) && attachments.length > 0) payload.attachments = attachments;

    if (!RESEND_API_KEY) {
      // No provider key configured (e.g. a fresh environment): log instead of
      // failing the calling flow — bookings must never depend on email.
      console.warn("RESEND_API_KEY not set — email not sent:", { to, subject });
      return json({ success: true, skipped: "no_provider_key" });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Resend API error:", data);
      return json({ error: "Failed to send email", details: data }, res.status);
    }
    return json({ success: true, id: data.id });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
