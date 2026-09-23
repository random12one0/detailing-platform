// Early promo validation for the widget — best-effort; create-booking is the
// authoritative gate at submit. Scoped to one business by slug.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { businessBySlug } from "../_shared/tenant.ts";
import { resolvePromo } from "../_shared/pricing.ts";
import { ipOf, LIMITS, withinLimits } from "../_shared/rateLimit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    // ROADMAP 14.9 — the blunt ceiling every other public endpoint already
    // has. NOTE FOR WHOEVER REVISITS THIS: promo codes are plain `text`
    // (`promo_codes.code`), not a random token, so this endpoint is also a
    // guessing oracle for short human-chosen codes, a different shape of
    // risk than the invocation-cost problem the ceiling exists for. The
    // ceiling still bounds the cost of a loop; whether a code-guessing
    // pattern deserves a tighter, purpose-built limit the way `plan-link`
    // has one for mail-bombing is a decision for Andrew, not made here —
    // matching how the six existing limits every got their own number
    // because "the numbers are not interchangeable."
    if (!await withinLimits(supabase, [{ ...LIMITS.publicCeiling, bucket: "validate-promo-code", key: ipOf(req) }])) {
      return json({ success: false, error: "too_many_requests" }, 429);
    }

    const { business_slug, code, customer_email, customer_phone } = await req.json();
    const business = await businessBySlug(business_slug);
    if (!business) return json({ success: false, error: "unknown_business" }, 404);
    if (!code) return json({ success: false, error: "Promo code required" }, 400);

    const promo = await resolvePromo(supabase, business.id, code);
    if (!promo) return json({ success: false, error: "Invalid or expired promo code" }, 404);

    // "One per customer" codes: warn at apply time if this person already
    // used it with THIS business. Matched on email OR phone.
    if (promo.once_per_customer) {
      const email = typeof customer_email === "string" ? customer_email.trim() : "";
      const phone = typeof customer_phone === "string" ? customer_phone.trim() : "";
      let used = false;
      if (email) {
        const { data } = await supabase
          .from("bookings")
          .select("id")
          .eq("business_id", business.id)
          .eq("applied_promo_code", promo.code)
          .ilike("customer_email", email)
          .limit(1);
        used = !!data?.length;
      }
      if (!used && phone) {
        const { data } = await supabase
          .from("bookings")
          .select("id")
          .eq("business_id", business.id)
          .eq("applied_promo_code", promo.code)
          .eq("customer_phone", phone)
          .limit(1);
        used = !!data?.length;
      }
      if (used) {
        return json(
          { success: false, error: "You've already used this code. It's limited to one use per customer." },
          403,
        );
      }
    }

    // Only public-safe fields — never leak usage counters or limits.
    return json({
      success: true,
      promo: { code: promo.code, type: promo.type, value: promo.value, once_per_customer: promo.once_per_customer },
    });
  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 500);
  }
});
