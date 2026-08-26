import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { code, customer_email, customer_phone } = await req.json();
    if (!code) {
      return new Response(JSON.stringify({ success: false, error: "Promo code required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }
    // Allow codes that are not expired or have no expiration
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gte.${nowIso}`)
      .single();
    if (error || !data) {
      return new Response(JSON.stringify({ success: false, error: "Invalid or expired promo code" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }
    // Allow unlimited usage if usage_limit is null or 0
    if (data.usage_limit && data.usage_limit > 0 && data.times_used >= data.usage_limit) {
      return new Response(JSON.stringify({ success: false, error: "Promo code usage limit reached" }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }
    // "One per customer" codes: warn at apply time if this person already used it.
    // Best-effort — email/phone may be blank this early; create-booking is the
    // authoritative gate at submit. Matched on email OR phone (either identifies
    // the customer). A no-op when neither is provided.
    if (data.once_per_customer) {
      const email = typeof customer_email === "string" ? customer_email.trim() : "";
      const phone = typeof customer_phone === "string" ? customer_phone.trim() : "";
      let alreadyUsed = false;
      if (email) {
        const { data: byEmail } = await supabase
          .from("bookings")
          .select("id")
          .eq("applied_promo_code", data.code)
          .ilike("customer_email", email)
          .limit(1);
        if (byEmail && byEmail.length > 0) alreadyUsed = true;
      }
      if (!alreadyUsed && phone) {
        const { data: byPhone } = await supabase
          .from("bookings")
          .select("id")
          .eq("applied_promo_code", data.code)
          .eq("customer_phone", phone)
          .limit(1);
        if (byPhone && byPhone.length > 0) alreadyUsed = true;
      }
      if (alreadyUsed) {
        return new Response(JSON.stringify({ success: false, error: "You've already used this code — it's limited to one use per customer." }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }
    }
    return new Response(JSON.stringify({ success: true, promo: data }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }
});
