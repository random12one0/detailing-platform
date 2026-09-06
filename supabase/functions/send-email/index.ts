// The ONE internal email relay. Every other function sends mail by calling
// this with the service-role key; this file is the only place that knows the
// provider (Resend today — swap providers by editing this file alone).
//
// Addressing policy: mail is sent FROM the platform's verified domain with
// the tenant's brand name as display name; Reply-To is the tenant's own
// contact address, so replies reach the right detailer and never another
// business.
//
// Input: { business_id, to, subject, body, text?, attachments? }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { PLATFORM_FROM_ADDRESS } from "../_shared/config.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

/**
 * STAMP OR CLEAR THE ADDRESS ON THE CUSTOMER IT BELONGS TO — roadmap 2.20.
 *
 * `failure` null means the send worked and the flag comes off.
 *
 * IT IS BEST-EFFORT, LIKE EVERY OTHER LINE IN THIS FILE. This function is
 * bookkeeping about an email; it must never be the reason a send is reported
 * as failed, so it swallows its own errors exactly as `sendTenantEmail` does.
 *
 * AN OWNER ALERT MATCHES NOTHING AND THAT IS CORRECT: a detailer's own
 * notification address is not one of their customers, so the update touches
 * zero rows and the owner's mail is not tracked here.
 *
 * ponytail: exact-match on the address, not case-folded. Every caller passes
 * an address read back out of the row it would update (`create-booking` stores
 * what the customer typed and every later send reads it), so the two agree by
 * construction. A `lower()` comparison needs an RPC or a functional index;
 * add one if a real mismatch ever turns up rather than on principle.
 */
async function markAddress(
  businessId: string,
  to: string,
  failure: unknown | null,
): Promise<void> {
  try {
    await supabase
      .from("customers")
      .update(
        failure === null
          ? { email_failed_at: null, email_failed_reason: null }
          : {
            email_failed_at: new Date().toISOString(),
            // The provider's own words, capped: this is drawn in one line
            // beside the address and a whole JSON body would not be read.
            email_failed_reason: String(
              (failure as { message?: string; name?: string })?.message
                ?? (failure as { name?: string })?.name
                ?? JSON.stringify(failure),
            ).slice(0, 200),
          },
      )
      .eq("business_id", businessId)
      .eq("email", to);
  } catch (e) {
    console.error("could not record the send result against the customer:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  // Internal-only: callable ONLY with the service-role key, so this can
  // never be abused as an open relay.
  const auth = req.headers.get("Authorization") || "";
  if (!SERVICE_ROLE_KEY || auth !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const { business_id, to, subject, body, text, attachments, sender_name } = await req.json();
    // ROADMAP 2.20 STAGE 2. Set only by platform billing mail, and it changes
    // two things: who the email says it is from, and whether the send result
    // is recorded against a CUSTOMER. A billing email goes to the detailer, so
    // there is no customer row it is a fact about — and stamping one because
    // the detailer's contact address happens to match a customer of their own
    // would put "this address bounced" on somebody it says nothing about.
    const fromPlatform = typeof sender_name === "string" && sender_name.trim() !== "";
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
      from: `${String(fromPlatform ? sender_name : business.name).replace(/[<>]/g, "")} <${PLATFORM_FROM_ADDRESS}>`,
      to: [to],
      subject,
      html: body,
    };
    // THE PLAIN-TEXT ALTERNATIVE — added roadmap 2.18, 2026-09-03, and it had
    // been missing for the whole life of the product. An HTML-only message
    // with no text part is a long-standing spam-filter signal, and it applied
    // to EVERY email including the receipt, which is the one that must never
    // land in junk. Found by asking whether the emails work globally and
    // following the question past the templates into the sender, which is
    // where it actually lived. Every template derives its own text half from
    // its own markup (`emailKit.ts` → `htmlToText`), so the two cannot drift.
    if (text) payload.text = text;
    // Reply-To is the TENANT's address so a customer's reply reaches the right
    // detailer — which is exactly wrong for a billing email, where a reply
    // would go from us to the detailer and straight back to themselves.
    if (!fromPlatform && business.contact_email) payload.reply_to = business.contact_email;
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
      // ROADMAP 2.20 — AND THIS `console.error` IS EXACTLY WHY. A booking never
      // fails because an email did, so until this line the only record of a
      // rejected send was a log nobody reads, and the first symptom was a
      // customer saying they never got their confirmation. The fact goes on the
      // CUSTOMER, next to the address, where the detailer meets it at the
      // moment they are about to rely on it.
      //
      // 4xx ONLY, AND THAT IS WHAT MAKES THE FLAG HONEST. A 5xx is the
      // provider having a bad day, not this address being wrong — stamping it
      // would put "this address bounced" on every customer emailed during a
      // Resend outage, which is both false and the fastest way to teach a
      // detailer to ignore the flag. The send still failed and is still
      // logged; it is simply not the customer's fault.
      // **AND 429 IS NOT THE ADDRESS EITHER — testing loop F-025, 2026-09-06.**
      // The paragraph above is right about 5xx and stopped one status short.
      // Resend's free plan is **100 emails a day across every tenant** and the
      // transactional set spends about five per booking, so the platform's
      // twenty-first booking of the day is refused — with a 429, which is
      // under 500, so every customer emailed after the cap was being stamped
      // `email_failed_at` and told, permanently, that their address bounced.
      //
      // That is worse than the outage case the 5xx rule exists to prevent,
      // because it is **self-inflicted, arrives on the busiest days, and is
      // enforcement rather than display**: `send-campaign` filters on this
      // column, so a good day's customers quietly stop being reachable.
      // 408 for the same reason — a timeout is our side of the wire.
      const ourFault = res.status >= 500 || res.status === 429 || res.status === 408;
      if (!ourFault && !fromPlatform) await markAddress(business_id, to, data);
      return json({ error: "Failed to send email", details: data }, res.status);
    }
    // A BOUNCE MUST CLEAR ITSELF, unlike `unsubscribed_at`. Otherwise a
    // detailer who corrects a typo is told forever that the address they just
    // fixed is broken, and the flag becomes something to ignore.
    if (!fromPlatform) await markAddress(business_id, to, null);
    return json({ success: true, id: data.id });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
