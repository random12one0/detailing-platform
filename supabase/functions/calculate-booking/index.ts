// The quote shown in the booking widget. Runs the SAME shared pricing engine
// as create-booking, so the quoted price always equals the charged price.
// (The old version imported a BUFFER_MINUTES constant that no longer existed
// — the buffer now comes from business_settings like everything else.)
//
// Input: { business_slug, service_ids[], add_ons[], vehicle_size,
//          applied_promo_code?, service_type?, travel_zone?,
//          booking_date?, start_time? }
//
// The last four arrived with roadmap 2.8c and every one of them is optional,
// because the price bar is on screen from step 1 and the customer has not
// picked a day, an address or a time yet. A time-based rule that cannot be
// evaluated does not apply — so the quote starts without it and grows the
// surcharge when the day is chosen, which is the honest order.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { businessBySlug, getSettings } from "../_shared/tenant.ts";
import {
  computeQuote, matchPriceRules, planInputFor, resolveAddOns, resolvePlan,
  resolvePromo, resolveServices, resolveTravel, whenContextFor,
} from "../_shared/pricing.ts";
import { localDateTimeToInstant, weekdayOf } from "../_shared/tz.ts";

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
    // Roadmap 2.14 step 3. A plan id, never a plan price — the row is read
    // here and priced by the same engine that will charge it.
    const plan = await resolvePlan(supabase, business.id, body.plan_id);
    const serviceType = body.service_type === "dropoff" ? "dropoff" : "mobile";
    const travel = resolveTravel(settings, serviceType, body.travel_zone);
    const when = whenContextFor(
      business.timezone, body.booking_date, body.start_time,
      localDateTimeToInstant, weekdayOf,
    );
    const adjustments = matchPriceRules(settings.price_rules, when);
    const quote = computeQuote({
      services,
      addOns,
      vehicleSize: String(body.vehicle_size || "small"),
      siteDiscountPercent: settings.site_discount_active ? Number(settings.site_discount_percent) : 0,
      promo: promo ? { type: promo.type, value: promo.value } : null,
      roundingNearest: Number(settings.price_rounding_nearest),
      travelFee: travel.fee,
      adjustments,
      plan: planInputFor(plan),
    });

    return json({
      success: true,
      quote: {
        base_price: quote.basePrice,
        vehicle_size_fee: quote.sizeAdd,
        add_ons_total: quote.addOnsTotal,
        travel_fee: quote.travelFee,
        travel_zone: travel.zone,
        // Already resolved to money and already labelled, so the review step
        // can print "Saturday surcharge  +$25" without knowing the rule.
        adjustments: quote.adjustmentLines,
        subtotal_before_discounts: quote.subtotalBase,
        site_discount: quote.siteDiscount,
        site_discount_percent: settings.site_discount_active ? Number(settings.site_discount_percent) : 0,
        site_discount_label: settings.site_discount_active ? settings.site_discount_label : null,
        subtotal: quote.subtotalAfterSite,
        promo_code: promo ? promo.code : null,
        promo_discount: quote.promoDiscount,
        total: quote.total,
        // The page prints "your <name> plan applies" from this, so it comes
        // from the resolved row and is absent when the id did not resolve —
        // a retired plan must not leave the page claiming one is attached.
        plan_id: plan ? plan.id : null,
        plan_name: plan ? plan.name : null,
        total_duration: quote.totalDurationMinutes,
        buffer_minutes: settings.buffer_minutes,
      },
    });
  } catch (err) {
    return json({ success: false, error: (err as Error).message }, 500);
  }
});
