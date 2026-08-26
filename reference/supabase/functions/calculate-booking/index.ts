import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  BUFFER_MINUTES,
  computeQuote,
  getSiteDiscountPercent,
  resolvePlan,
  resolvePromo,
  vehicleSizeAdd,
  vehicleSizeDuration,
} from "../_shared/pricing.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { interior_package_id, exterior_package_id, vehicle_size, add_ons, promo_code, monthly_plan_id } =
      await req.json();

    if (!interior_package_id && !exterior_package_id) {
      return new Response(
        JSON.stringify({ success: false, error: "At least one package must be selected" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    let base_price = 0;
    let add_ons_total = 0;
    let total_duration = 0;
    const packages_info: any[] = [];

    if (interior_package_id) {
      const { data, error } = await supabase.from("packages").select("*").eq("id", interior_package_id).single();
      if (error) throw error;
      if (data) {
        base_price += parseFloat(data.base_price);
        total_duration += data.duration_minutes;
        packages_info.push(data);
      }
    }

    if (exterior_package_id) {
      const { data, error } = await supabase.from("packages").select("*").eq("id", exterior_package_id).single();
      if (error) throw error;
      if (data) {
        base_price += parseFloat(data.base_price);
        total_duration += data.duration_minutes;
        packages_info.push(data);
      }
    }

    let addOnsInfo: any[] = [];
    if (Array.isArray(add_ons) && add_ons.length > 0) {
      const { data: addOnsData, error: addOnsError } = await supabase
        .from("add_ons")
        .select("id, price, duration_minutes")
        .in("id", add_ons);
      if (addOnsError) throw addOnsError;
      if (Array.isArray(addOnsData)) {
        for (const addOn of addOnsData) {
          add_ons_total += parseFloat(addOn.price);
          total_duration += addOn.duration_minutes || 0;
        }
        addOnsInfo = addOnsData;
      }
    }

    // Bigger vehicles take longer — add the size time to the service duration so
    // the slot engine reserves enough time (small=0, medium=+15, large=+30).
    total_duration += vehicleSizeDuration(vehicle_size);

    // Resolve discount inputs via the shared resolvers, then run the shared quote
    // engine — identical to create-booking so the quote matches the charged price.
    const sizeAdd = vehicleSizeAdd(vehicle_size);
    const siteDiscountPercent = await getSiteDiscountPercent(supabase);
    const plan = await resolvePlan(supabase, monthly_plan_id);
    const promo = await resolvePromo(supabase, promo_code);

    const quote = computeQuote({
      basePrice: base_price,
      sizeAdd,
      addOnsTotal: add_ons_total,
      siteDiscountPercent,
      plan: plan ? { discount_type: plan.discount_type, discount_value: plan.discount_value } : null,
      promo: promo ? { type: promo.type, value: promo.value } : null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        subtotal: quote.subtotalAfterSite, // post site-discount, pre monthly-plan
        vehicle_size_add: sizeAdd,
        site_discount: siteDiscountPercent > 0
          ? { percent: siteDiscountPercent, amount: quote.siteDiscount }
          : null,
        total_price: quote.total,
        base_duration: total_duration,
        buffer_minutes: BUFFER_MINUTES,
        total_duration: total_duration + BUFFER_MINUTES,
        packages: packages_info,
        add_ons: addOnsInfo,
        monthly_plan: plan
          ? {
              id: plan.id,
              name: plan.name,
              discount_type: plan.discount_type,
              discount_value: plan.discount_value,
              discount: quote.monthlyPlanDiscount,
            }
          : null,
        promo: promo
          ? { code: promo.code, type: promo.type, value: promo.value, discount: quote.promoDiscount }
          : null,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
