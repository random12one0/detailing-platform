// Single source of truth for booking pricing + promo resolution — ported
// from the old system's best module. calculate-booking (the quote shown in
// the widget) and create-booking (the price that is stored) both run this,
// so the two can never drift apart.
//
// Changes from the old engine:
//  * Monthly plans are gone (removed product-wide in Phase 2).
//  * The vehicle-size surcharge lives on each SERVICE row
//    (services.vehicle_size_adjustments) — this is now the ONLY
//    implementation; the old code had three separate copies.
//  * Rounding granularity comes from business_settings.price_rounding_nearest
//    (0 = no rounding) instead of a hardcoded $5.
//
// This module is dependency-free on purpose so tests can run it under Node.

export interface SizeAdjustment {
  price: number;
  duration_minutes: number;
}

export interface ServiceRow {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  vehicle_size_adjustments: Record<string, SizeAdjustment> | null;
}

export interface AddOnRow {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

export function sizeAdjustmentFor(service: ServiceRow, vehicleSize: string | null | undefined): SizeAdjustment {
  const key = String(vehicleSize || "").toLowerCase() === "med" ? "medium" : String(vehicleSize || "").toLowerCase();
  const adj = service.vehicle_size_adjustments?.[key];
  return {
    price: Number(adj?.price) || 0,
    duration_minutes: Number(adj?.duration_minutes) || 0,
  };
}

export function roundToNearest(value: number, nearest: number): number {
  if (!nearest || nearest <= 0) return Math.round(value * 100) / 100;
  return Math.round(value / nearest) * nearest;
}

export interface QuoteInput {
  services: ServiceRow[];
  addOns: AddOnRow[];
  vehicleSize: string;
  siteDiscountPercent: number; // active site-wide sale %, else 0
  promo: { type: string; value: number | string } | null;
  roundingNearest: number;
}

export interface Quote {
  basePrice: number;         // sum of service prices
  sizeAdd: number;           // summed per-service vehicle-size surcharge
  addOnsTotal: number;
  subtotalBase: number;      // base + size + add-ons, before any discount
  siteDiscount: number;
  subtotalAfterSite: number; // post site-discount (the surfaced "subtotal")
  promoDiscount: number;
  total: number;             // final charged total, rounded per settings
  totalDurationMinutes: number;
}

// Discount ordering (must match historical behavior, minus monthly plans):
//   subtotal = services + size + add-ons → site-wide sale % → promo → round
export function computeQuote(inp: QuoteInput): Quote {
  const basePrice = inp.services.reduce((s, sv) => s + (Number(sv.price) || 0), 0);
  const sizeAdd = inp.services.reduce((s, sv) => s + sizeAdjustmentFor(sv, inp.vehicleSize).price, 0);
  const addOnsTotal = inp.addOns.reduce((s, a) => s + (Number(a.price) || 0), 0);
  const totalDurationMinutes =
    inp.services.reduce((s, sv) => s + (Number(sv.duration_minutes) || 0) + sizeAdjustmentFor(sv, inp.vehicleSize).duration_minutes, 0) +
    inp.addOns.reduce((s, a) => s + (Number(a.duration_minutes) || 0), 0);

  const subtotalBase = basePrice + sizeAdd + addOnsTotal;
  let subtotal = subtotalBase;

  let siteDiscount = 0;
  if (inp.siteDiscountPercent > 0) {
    siteDiscount = Math.round(subtotal * (inp.siteDiscountPercent / 100));
    subtotal = Math.max(0, subtotal - siteDiscount);
  }
  const subtotalAfterSite = subtotal;

  let promoDiscount = 0;
  if (inp.promo) {
    const val = parseFloat(String(inp.promo.value));
    if (inp.promo.type === "percentage") promoDiscount = Math.round(subtotal * (val / 100));
    else if (inp.promo.type === "amount") promoDiscount = Math.min(val, subtotal);
  }

  const total = roundToNearest(Math.max(0, subtotal - promoDiscount), inp.roundingNearest);
  return {
    basePrice,
    sizeAdd,
    addOnsTotal,
    subtotalBase,
    siteDiscount,
    subtotalAfterSite,
    promoDiscount,
    total,
    totalDurationMinutes,
  };
}

// --- Shared DB resolvers so both endpoints fetch inputs identically --------

// deno-lint-ignore no-explicit-any
type DB = any;

// Active services for a business by ids. Throws if any id is missing,
// inactive, or belongs to another business — the caller turns that into 400.
export async function resolveServices(db: DB, businessId: string, serviceIds: string[]): Promise<ServiceRow[]> {
  if (!serviceIds.length) return [];
  const { data, error } = await db
    .from("services")
    .select("id, name, price, duration_minutes, vehicle_size_adjustments")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .in("id", serviceIds);
  if (error) throw new Error(`Failed to fetch services: ${error.message}`);
  if (!data || data.length !== serviceIds.length) throw new Error("invalid_service");
  return data as ServiceRow[];
}

export async function resolveAddOns(db: DB, businessId: string, addOnIds: string[]): Promise<AddOnRow[]> {
  if (!addOnIds.length) return [];
  const { data, error } = await db
    .from("add_ons")
    .select("id, name, price, duration_minutes")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .in("id", addOnIds);
  if (error) throw new Error(`Failed to fetch add-ons: ${error.message}`);
  if (!data || data.length !== addOnIds.length) throw new Error("invalid_add_on");
  return data as AddOnRow[];
}

// A usable promo code for THIS business (active, not expired, under any usage
// limit), or null.
export async function resolvePromo(db: DB, businessId: string, code: string | null | undefined) {
  if (!code) return null;
  const nowIso = new Date().toISOString();
  const { data, error } = await db
    .from("promo_codes")
    .select("*")
    .eq("business_id", businessId)
    .eq("code", code)
    .eq("is_active", true)
    .or(`expires_at.is.null,expires_at.gte.${nowIso}`)
    .maybeSingle();
  if (error || !data) return null;
  if (!data.usage_limit || data.usage_limit === 0 || data.times_used < data.usage_limit) return data;
  return null;
}
