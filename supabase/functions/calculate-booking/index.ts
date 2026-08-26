// The quote shown in the booking widget. Runs the SAME shared pricing engine
// as create-booking, so the quoted price always equals the charged price.
// (The old version imported a BUFFER_MINUTES constant that no longer existed
// — the buffer now comes from business_settings like everything else.)
//
// Input: { business_slug, service_ids[], add_ons[], vehicle_size,
//          applied_promo_code? }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { businessBySlug, getSettings } from "../_shared/tenant.ts";
import { computeQuote, resolveAddOns, resolvePromo, resolveServices } from "../_shared/pricing.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json();
    const business = await businessBySlug(body.business_slug);
    if (!business) return json({ success: false, error: "unknown_business" }, 404);
    const settings = await getSettings(business.id);

    const serviceIds: string[] = Array.isArray(body.service_ids) ? body.service_ids : [];
    const addOnIds: string[] = Array.isArray(body.add_ons) ? body.add_ons : [];
    if (serviceIds.length === 0) {
      return json({ success: false, error: "At least one service must be selected" }, 400);
    }

    let services, addOns;
    try {
      [services, addOns] = await Promise.all([
        resolveServices(supabase, business.id, serviceIds),
        resolveAddOns(supabase, business.id, addOnIds),
      ]);
    } catch (_e) {
      return json({ success: false, error: "Invalid service or add-on selection" }, 400);
    }

    const promo = await resolvePromo(supabase, business.id, body.applied_promo_code);
    const quote = computeQuote({
      services,
      addOns,
      vehicleSize: String(body.vehicle_size || "small"),
      siteDiscountPercent: settings.site_discount_active ? Number(settings.site_discount_percent) : 0,
      promo: promo ? { type: promo.type, value: promo.value } : null,
      roundingNearest: Number(settings.price_rounding_nearest),
    });

    return json({
      success: true,
      quote: {
        base_price: quote.basePrice,
        vehicle_size_fee: quote.sizeAdd,
        add_ons_total: quote.addOnsTotal,
        subtotal_before_discounts: quote.subtotalBase,
        site_discount: quote.siteDiscount,
        site_discount_percent: settings.site_discount_active ? Number(settings.site_discount_percent) : 0,
        site_discount_label: settings.site_discount_active ? settings.site_discount_label : null,
        subtotal: quote.subtotalAfterSite,
        promo_code: promo ? promo.code : null,
        promo_discount: quote.promoDiscount,
        total: quote.total,
        total_duration: quote.totalDurationMinutes,
        buffer_minutes: settings.buffer_minutes,
      },
    });
  } catch (err) {
    return json({ success: false, error: (err as Error).message }, 500);
  }
});
