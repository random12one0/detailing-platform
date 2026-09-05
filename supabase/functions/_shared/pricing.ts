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
  // W25 — which category this service belongs to, so create-booking can
  // enforce that category's max_select. It is fetched here rather than in a
  // second query because this is already the one place both endpoints resolve
  // services identically, and drift between them is the bug this module was
  // written to prevent.
  group_id?: string | null;
  // Roadmap 2.8c — per-service availability. Same argument: one place resolves
  // services, so the slot gate and the price come from the same row.
  allows_mobile?: boolean;
  allows_dropoff?: boolean;
  available_weekdays?: number[] | null;
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

// Roadmap 2.8c — a price rule as the detailer writes it. Two kinds, which is
// what the research found the trade's own software sells:
//   'time'      weekdays (null = every day) plus an optional time window —
//               a Saturday surcharge, or an evening one.
//   'lead_time' booked fewer than `within_hours` hours before the job — a
//               rush fee.
export interface PriceRule {
  label: string;
  kind: "time" | "lead_time";
  weekdays?: number[] | null;   // 0 = Sunday
  start_time?: string | null;   // "HH:MM", business-local
  end_time?: string | null;
  within_hours?: number | null;
  amount: number;
  is_percent?: boolean;
}

// When the job is, expressed as plain numbers. The CALLER works these out,
// because turning a business-local date and time into an instant needs the
// timezone helpers and this module is dependency-free on purpose so the tests
// can run it under Node. Everything is optional: at step 1 the customer has
// not picked a day yet, and a rule that cannot be evaluated simply does not
// apply — which is the honest answer, not a guess.
export interface WhenContext {
  weekday?: number | null;      // 0 = Sunday, business-local
  startTime?: string | null;    // "HH:MM", business-local
  leadHours?: number | null;    // hours from now until the job starts
}

// Which rules apply. Pure, and separate from computeQuote so both endpoints
// and the tests can ask the question without building a whole quote.
export function matchPriceRules(rules: PriceRule[] | null | undefined, when: WhenContext): PriceRule[] {
  const hm = (t: string) => String(t).slice(0, 5);
  return (rules ?? []).filter((r) => {
    if (r.kind === "lead_time") {
      if (when.leadHours == null || r.within_hours == null) return false;
      return when.leadHours < Number(r.within_hours);
    }
    if (r.kind !== "time") return false;
    // A rule with neither a day nor a window applies to everything, which is
    // a flat surcharge and a legitimate thing to want.
    if (Array.isArray(r.weekdays) && r.weekdays.length) {
      if (when.weekday == null || !r.weekdays.includes(when.weekday)) return false;
    }
    if (r.start_time && r.end_time) {
      if (!when.startTime) return false;
      const t = hm(when.startTime);
      // A window that wraps past midnight ("20:00"–"02:00") is two ranges.
      const from = hm(r.start_time), to = hm(r.end_time);
      const inside = from <= to ? (t >= from && t < to) : (t >= from || t < to);
      if (!inside) return false;
    }
    return true;
  });
}

// ROADMAP 2.8c — TRAVEL AND SURCHARGES, RESOLVED IN ONE PLACE.
//
// calculate-booking (the quote the customer is shown) and create-booking (the
// price that is stored) both call this. That is the same rule the pricing
// engine itself was written under: two implementations of a price is how a
// quote and a charge drift apart, and this module exists so they cannot.
export function resolveTravel(
  settings: { travel_fee?: number | null; travel_zones?: { key: string; name: string; fee: number }[] | null },
  serviceType: string,
  zoneKey: string | null | undefined,
): { fee: number; zone: string | null } {
  // Drop-off is the customer coming to the detailer. Nobody travels.
  if (serviceType !== "mobile") return { fee: 0, zone: null };
  const zones = Array.isArray(settings.travel_zones) ? settings.travel_zones : [];
  if (zones.length) {
    const z = zones.find((v) => String(v.key) === String(zoneKey)) ?? zones[0];
    return { fee: Number(z.fee) || 0, zone: String(z.name) };
  }
  return { fee: Number(settings.travel_fee) || 0, zone: null };
}

// The job's WHEN, as the plain numbers matchPriceRules wants. Returns an empty
// context when the customer has not picked a day yet, which is most of the
// booking flow — and an unevaluable rule correctly does not apply.
export function whenContextFor(
  tz: string,
  bookingDate: string | null | undefined,
  startTime: string | null | undefined,
  localDateTimeToInstant: (tz: string, d: string, t: string) => Date,
  weekdayOf: (d: string) => number,
): WhenContext {
  if (!bookingDate || !startTime) return {};
  const start = localDateTimeToInstant(tz, bookingDate, String(startTime).slice(0, 5));
  return {
    weekday: weekdayOf(bookingDate),
    startTime: String(startTime).slice(0, 5),
    leadHours: (start.getTime() - Date.now()) / 3_600_000,
  };
}

// ROADMAP 2.14 STEP 3 — WHAT A PLAN DOES TO ONE VISIT'S PRICE.
//
// The plan the customer pressed, as the SERVER read it. Never as the client
// sent it: the caller passes a plan id and resolves the row itself, exactly
// like the promo code and the travel zone, because "a plan price shown on the
// booking page and not charged by computeQuote is the travel-fee defect for
// the third time" (roadmap 2.14, round 4).
export interface PlanInput {
  name: string;
  priceKind: "monthly" | "per_visit" | "percent_off" | "total";
  priceAmount: number;
}

// THE RULE, IN ONE SENTENCE: the plan governs the SERVICES; add-ons and travel
// are always extra.
//
//   percent_off        the advertised member rate, off the whole job — that is
//                      how "10% off every visit" reads on every plan page in
//                      the sample, and reading it any other way would print a
//                      smaller saving than the words promise.
//   per_visit          the visit's services cost the plan's rate, whatever the
//                      catalogue says. Never a surcharge: a plan rate ABOVE
//                      the list price takes nothing off rather than adding.
//   monthly / total    the visit is already paid for, on the month or up
//                      front, so this job's services come to nothing.
//
// THE CEILING, STATED RATHER THAN DISCOVERED: what a plan actually includes is
// PROSE (`plans.description`), so this cannot know that the member's plan
// covers a wash and not a ceramic coating. It discounts whatever they chose.
// The correction is the same human one the auto-link trigger already relies
// on — the detailer accepts the request, and a plan booking arrives as a
// request precisely so somebody looks at it. Narrow it with
// `included_service_ids` only when a detailer complains, not before.
export function planLineFor(
  plan: PlanInput | null | undefined,
  serviceCost: number,
  jobCost: number,
): { label: string; amount: number } | null {
  if (!plan) return null;
  const amount = Number(plan.priceAmount) || 0;
  let off: number;
  let what: string;
  if (plan.priceKind === "percent_off") {
    off = Math.round(jobCost * amount / 100);
    what = `${amount}% off`;
  } else if (plan.priceKind === "per_visit") {
    off = Math.max(0, serviceCost - amount);
    what = "plan rate";
  } else {
    off = serviceCost;
    what = "included";
  }
  // Never past the whole job, and never a line worth nothing — a $0 row on a
  // receipt is a question the customer has to ask somebody.
  off = Math.min(Math.max(0, off), Math.max(0, jobCost));
  if (off <= 0) return null;
  return { label: `${plan.name} — ${what}`, amount: -off };
}

export interface QuoteInput {
  services: ServiceRow[];
  addOns: AddOnRow[];
  vehicleSize: string;
  siteDiscountPercent: number; // active site-wide sale %, else 0
  promo: { type: string; value: number | string } | null;
  roundingNearest: number;
  // Roadmap 2.8c. The mobile travel charge, ALREADY RESOLVED to money by the
  // caller (a chosen travel zone's fee, or the flat one, or 0 for drop-off).
  // It was printed on the booking page and never charged until now.
  travelFee?: number;
  // Rules that already matched, from matchPriceRules above.
  adjustments?: PriceRule[];
  // Roadmap 2.14 step 3 — the plan this booking is against, if any.
  plan?: PlanInput | null;
}

export interface Quote {
  basePrice: number;         // sum of service prices
  sizeAdd: number;           // summed per-service vehicle-size surcharge
  addOnsTotal: number;
  travelFee: number;         // 2.8c — mobile travel, now actually charged
  adjustmentLines: { label: string; amount: number }[];  // 2.8c, resolved to money
  adjustmentsTotal: number;
  subtotalBase: number;      // base + size + add-ons + travel + surcharges
  siteDiscount: number;
  subtotalAfterSite: number; // post site-discount (the surfaced "subtotal")
  promoDiscount: number;
  total: number;             // final charged total, rounded per settings
  totalDurationMinutes: number;
}

// Discount ordering (must match historical behavior, minus monthly plans):
//   subtotal = services + size + add-ons + TRAVEL + SURCHARGES
//              → site-wide sale % → promo → round
//
// Travel and the 2.8c surcharges join the SUBTOTAL rather than being added
// after the discounts, and that is a decision rather than an accident: a
// weekend surcharge is part of what the job costs, so "10% off" should come
// off the whole of it. Doing it the other way would mean a promo silently
// stopped applying to part of the bill.
export function computeQuote(inp: QuoteInput): Quote {
  const basePrice = inp.services.reduce((s, sv) => s + (Number(sv.price) || 0), 0);
  const sizeAdd = inp.services.reduce((s, sv) => s + sizeAdjustmentFor(sv, inp.vehicleSize).price, 0);
  const addOnsTotal = inp.addOns.reduce((s, a) => s + (Number(a.price) || 0), 0);
  const totalDurationMinutes =
    inp.services.reduce((s, sv) => s + (Number(sv.duration_minutes) || 0) + sizeAdjustmentFor(sv, inp.vehicleSize).duration_minutes, 0) +
    inp.addOns.reduce((s, a) => s + (Number(a.duration_minutes) || 0), 0);

  const travelFee = Number(inp.travelFee) || 0;
  const beforeAdjustments = basePrice + sizeAdd + addOnsTotal + travelFee;
  // Percentages are of everything the job costs before discounts, which is
  // the only reading that does not depend on the order two rules happen to
  // sit in.
  const adjustmentLines = (inp.adjustments ?? []).map((r) => ({
    label: r.label,
    amount: r.is_percent
      ? Math.round(beforeAdjustments * (Number(r.amount) || 0) / 100)
      : Number(r.amount) || 0,
  })).filter((l) => l.amount !== 0);
  // ROADMAP 2.14 — THE PLAN RIDES `price_adjustments`, AND THAT IS THE WHOLE
  // INTEGRATION. It is a labelled amount snapshotted onto the booking, drawn
  // on the review step, the receipt, every email and the invoice, and already
  // reconciled by `reconcile()` — the same rail `accept-quote` lands a quote
  // difference on. A `plan_discount` COLUMN was the obvious build; it would
  // have meant a new field in nine render paths to say what this array already
  // says, and a tenth that forgot it.
  const rulesTotal = adjustmentLines.reduce((s, l) => s + l.amount, 0);
  const planLine = planLineFor(inp.plan, basePrice + sizeAdd, beforeAdjustments + rulesTotal);
  if (planLine) adjustmentLines.push(planLine);
  const adjustmentsTotal = adjustmentLines.reduce((s, l) => s + l.amount, 0);

  const subtotalBase = beforeAdjustments + adjustmentsTotal;
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
    travelFee,
    adjustmentLines,
    adjustmentsTotal,
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
    .select("id, name, price, duration_minutes, vehicle_size_adjustments, group_id, "
      + "allows_mobile, allows_dropoff, available_weekdays")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .in("id", serviceIds);
  if (error) throw new Error(`Failed to fetch services: ${error.message}`);
  if (!data || data.length !== serviceIds.length) throw new Error("invalid_service");
  return data as ServiceRow[];
}

// The services already on a booking, for the rules that live ON a service
// (roadmap 2.8c). reschedule- and update-booking MOVE a booking's date, and a
// service offered only on Tuesdays has to be re-checked when it does — unlike
// the water/power answer, which does not change when a date does. Rows whose
// service has since been deleted are simply absent; the booking stands.
export async function servicesForBooking(db: DB, businessId: string, bookingId: string): Promise<ServiceRow[]> {
  const { data } = await db
    .from("booking_services")
    .select("service_id, services(id, name, price, duration_minutes, vehicle_size_adjustments, "
      + "group_id, allows_mobile, allows_dropoff, available_weekdays)")
    .eq("business_id", businessId)
    .eq("booking_id", bookingId);
  // deno-lint-ignore no-explicit-any
  return (data ?? []).map((r: any) => r.services).filter(Boolean) as ServiceRow[];
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

// ROADMAP 2.14 STEP 3 — the plan the customer pressed, read from the database
// rather than believed. Scoped to this business and to `is_active`, which is
// the one thing that flag decides (a retired plan takes no new sign-ups; the
// people already on it keep accruing — see `accrue_plan_visits()`).
//
// Returns the ROW, so the caller can store `plan_id` and hand `computeQuote`
// the three fields it prices from. Null for a missing, foreign or retired id,
// which the endpoints turn into an ordinary booking rather than an error: a
// stale tab holding a plan the detailer retired should still be able to book.
export async function resolvePlan(db: DB, businessId: string, planId: string | null | undefined) {
  if (!planId) return null;
  const { data } = await db
    .from("plans")
    .select("id, name, price_kind, price_amount")
    .eq("business_id", businessId)
    .eq("id", planId)
    .eq("is_active", true)
    .maybeSingle();
  return data ?? null;
}

// deno-lint-ignore no-explicit-any
export const planInputFor = (row: any): PlanInput | null =>
  row ? { name: row.name, priceKind: row.price_kind, priceAmount: Number(row.price_amount) || 0 } : null;

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
