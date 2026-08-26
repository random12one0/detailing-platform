// Single source of truth for booking pricing + promo/plan resolution.
// Used by calculate-booking (the quote shown in the widget) and create-booking
// (the price that is stored/charged) so the two can never drift apart.

export const VEHICLE_SIZE_ADDS: Record<string, number> = {
  small: 0,
  medium: 15,
  med: 15, // older booking rows store the abbreviated form
  large: 30,
};

// NOTE: this module deliberately does NOT export BUFFER_MINUTES.
// It used to, with a stale value of 30, while the only two things that
// actually enforce a buffer (available-slots and create-booking) each used a
// local 60. Nothing imported the 30 — it just sat here waiting to be picked up
// by mistake and silently halve the gap between jobs. The authoritative value
// lives next to the code that enforces it, in those two functions, and they
// carry matching comments telling you to change both together.

// Extra service TIME (minutes) a bigger vehicle needs, on top of the base package
// duration. Larger vehicles take longer to detail; small is the baseline.
export const VEHICLE_SIZE_DURATION_ADDS: Record<string, number> = {
  small: 0,
  medium: 15,
  large: 30,
};

export function roundToNearest5(value: number): number {
  return Math.round(value / 5) * 5;
}

export function vehicleSizeAdd(size: string | null | undefined): number {
  return VEHICLE_SIZE_ADDS[(size || "").toLowerCase()] ?? 0;
}

export function vehicleSizeDuration(size: string | null | undefined): number {
  return VEHICLE_SIZE_DURATION_ADDS[(size || "").toLowerCase()] ?? 0;
}

export interface QuoteInput {
  basePrice: number; // interior + exterior base prices
  sizeAdd: number; // vehicle-size surcharge
  addOnsTotal: number; // sum of add-on prices
  siteDiscountPercent: number; // active site-wide sale %, else 0
  plan: { discount_type: string; discount_value: number | string } | null;
  promo: { type: string; value: number | string } | null;
}

export interface Quote {
  subtotalBase: number; // base + size + add-ons, before any discount
  siteDiscount: number;
  subtotalAfterSite: number; // post site-discount, pre monthly-plan (the surfaced "subtotal")
  monthlyPlanDiscount: number;
  promoDiscount: number;
  total: number; // final charged total, rounded to nearest $5
}

// Discount ordering (unchanged, must match historical behavior):
//   subtotal = base + size + add-ons
//   → site-wide sale %  → monthly-plan discount  → promo code  → round to $5
export function computeQuote(inp: QuoteInput): Quote {
  const subtotalBase = inp.basePrice + inp.sizeAdd + inp.addOnsTotal;
  let subtotal = subtotalBase;

  let siteDiscount = 0;
  if (inp.siteDiscountPercent > 0) {
    siteDiscount = Math.round(subtotal * (inp.siteDiscountPercent / 100));
    subtotal = Math.max(0, subtotal - siteDiscount);
  }
  const subtotalAfterSite = subtotal;

  let monthlyPlanDiscount = 0;
  if (inp.plan) {
    const val = parseFloat(String(inp.plan.discount_value));
    if (inp.plan.discount_type === "percentage") monthlyPlanDiscount = Math.round(subtotal * (val / 100));
    else if (inp.plan.discount_type === "amount") monthlyPlanDiscount = Math.min(val, subtotal);
  }
  subtotal = subtotal - monthlyPlanDiscount;

  let promoDiscount = 0;
  if (inp.promo) {
    const val = parseFloat(String(inp.promo.value));
    if (inp.promo.type === "percentage") promoDiscount = Math.round(subtotal * (val / 100));
    else if (inp.promo.type === "amount") promoDiscount = Math.min(val, subtotal);
  }

  const total = roundToNearest5(Math.max(0, subtotal - promoDiscount));
  return { subtotalBase, siteDiscount, subtotalAfterSite, monthlyPlanDiscount, promoDiscount, total };
}

// --- Shared DB resolvers so both endpoints fetch inputs identically ---------

// deno-lint-ignore no-explicit-any
type DB = any;

// Active site-wide sale percent (0 when off). Single source: business_info id=1.
export async function getSiteDiscountPercent(supabase: DB): Promise<number> {
  const { data } = await supabase
    .from("business_info")
    .select("site_discount_active, site_discount_percent")
    .eq("id", 1)
    .single();
  const pct = data ? parseFloat(data.site_discount_percent) : 0;
  return data && data.site_discount_active && pct > 0 ? pct : 0;
}

// An active monthly plan by id, or null.
export async function resolvePlan(supabase: DB, planId: number | null | undefined) {
  if (!planId) return null;
  const { data, error } = await supabase
    .from("monthly_plans")
    .select("id, name, discount_type, discount_value, is_active")
    .eq("id", planId)
    .eq("is_active", true)
    .single();
  return error ? null : data;
}

// A usable promo code (active, not expired, under any usage limit), or null.
export async function resolvePromo(supabase: DB, code: string | null | undefined) {
  if (!code) return null;
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", code)
    .eq("is_active", true)
    .or(`expires_at.is.null,expires_at.gte.${nowIso}`)
    .single();
  if (error || !data) return null;
  if (!data.usage_limit || data.usage_limit === 0 || data.times_used < data.usage_limit) return data;
  return null;
}
