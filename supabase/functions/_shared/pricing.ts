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

// ROADMAP 8.10 — MULTIPLE CARS ON ONE VISIT.
//
// What a vehicle of a given size costs, and how long it takes, across the
// chosen services. Both are exported because `create-booking` snapshots the
// fee onto each `booking_vehicles` row — a detailer who renames or deletes a
// size must not rewrite what a past job was sold for.

// Ten is the ceiling `business_settings.max_vehicles_per_booking` enforces —
// above it is a phone call with a dealership — so the list is complete rather
// than clever, and there is no ordinal-suffix arithmetic to get wrong at 11th.
const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];

export const vehicleSizeFee = (services: ServiceRow[], size: string): number =>
  services.reduce((s, sv) => s + sizeAdjustmentFor(sv, size).price, 0);

export const vehicleMinutes = (services: ServiceRow[], size: string): number =>
  services.reduce(
    (s, sv) => s + (Number(sv.duration_minutes) || 0) + sizeAdjustmentFor(sv, size).duration_minutes,
    0,
  );

// THE OWNER'S OWN SENTENCE, AS ARITHMETIC: *"it's not gonna be double the time
// of one car, because there's not gonna be the setup time."* Each vehicle
// after the first costs its own full time LESS the setup, which happens once.
//
// THE FLOOR IS PROPORTIONAL RATHER THAN ABSOLUTE, and it is the only judgment
// in this function: a detailer who saves 40 minutes of setup and then sells a
// 20-minute express wash would otherwise have the second car take a negative
// amount of time. Half of one car is the least a second car may ever take.
//
// PRICE IS NOT TOUCHED. A second car is a second car's worth of work, and he
// said the saving is in the TIMING. A detailer who wants a two-car discount
// has promo codes.
export function extraVehicleMinutes(services: ServiceRow[], size: string, minutesSaved: number): number {
  const per = vehicleMinutes(services, size);
  return Math.max(per - (Number(minutesSaved) || 0), Math.ceil(per / 2));
}

// THE SERVER DECIDES HOW MANY CARS FIT, AND IT IS THE ONLY THING THAT DOES.
// A bespoke tenant site draws its own form (contract §2), so the cap has to
// live where a form cannot reach it — the same floor as every other rule on
// this path: *a site can only OFFER something the server then refuses.*
//
// An unresolvable size falls back to the tenant's first, exactly as the
// primary vehicle already did in `create-booking` (W9): a key nobody
// recognises would otherwise price at zero adjustment and print a label
// nobody recognises on the invoice.
export interface VehicleInput { size?: string | null; model?: string | null }

export function resolveVehicles(
  sizes: { key: string; label?: string }[],
  primary: string | null | undefined,
  extras: VehicleInput[] | null | undefined,
  maxVehicles: number,
): { key: string; label: string; model: string | null }[] {
  const list = sizes.length ? sizes : [{ key: "small", label: "Small" }];
  const pick = (want: string | null | undefined) => {
    const k = String(want || "").toLowerCase();
    const found = list.find((v) => String(v.key).toLowerCase() === k) ?? list[0];
    return { key: String(found.key), label: String(found.label ?? found.key) };
  };
  const cap = Math.max(1, Math.min(10, Number(maxVehicles) || 1));
  const out = [{ ...pick(primary), model: null as string | null }];
  for (const e of Array.isArray(extras) ? extras : []) {
    if (out.length >= cap) break;
    out.push({ ...pick(e?.size), model: (e?.model ?? "").toString().trim() || null });
  }
  return out;
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
  // ROADMAP 8.10 — the vehicles AFTER the first, on this same visit, exactly
  // as `resolveVehicles` returned them. Empty for every booking made before
  // this item and for every business that has not raised its limit, and the
  // arithmetic below is then byte-identical to what it was.
  extraVehicles?: { key: string; label: string; model?: string | null }[];
  // The first vehicle's own label, for the split breakdown. Optional, because
  // every other figure in this module needs only the KEY — a caller that has
  // not resolved a label gets the key back and prints something recognisable
  // rather than nothing.
  vehicleSizeLabel?: string;
  // business_settings.extra_vehicle_minutes_saved — the setup that is not
  // repeated. Duration only.
  extraVehicleMinutesSaved?: number;
  // ROADMAP 8.10 — *"they could set it for two different days without having
  // to create two different bookings."* The FORM is one; underneath it is one
  // booking per day, because one booking is one time range and the whole
  // availability engine rests on that.
  splitDays?: boolean;
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
  // ROADMAP 8.10 — present ONLY for a split booking, one entry per car, in
  // the order the cars were entered. `total` is what that car's own booking
  // will be charged, because it is the quote its own `create-booking` call
  // produces. Absent means one appointment, which is every booking this
  // product has ever taken.
  legs?: SplitLeg[];
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
// The per-vehicle breakdown a split booking needs, and null for everything
// else. `total` is what THAT car's own booking will be charged, because it is
// literally the quote its own `create-booking` call will produce.
export interface SplitLeg {
  size: string;
  label: string;
  model: string | null;
  total: number;
  durationMinutes: number;
}

export function computeQuote(inp: QuoteInput): Quote {
  // ROADMAP 8.10 — CARS ON DIFFERENT DAYS ARE PRICED AS WHAT THEY REALLY ARE:
  // separate bookings. The customer fills one form; the server takes one
  // `create-booking` call per car, and each of those runs this function on its
  // own single-vehicle input. So the figure on the price bar is defined as the
  // SUM OF THOSE CALLS rather than as an arithmetic of its own — which is the
  // only definition that cannot drift from what is charged.
  //
  // It also gets the awkward cases right for free and without a rule for any
  // of them: travel is charged twice because the detailer really does drive
  // out twice, the rounding happens per booking because that is where it
  // happens, and a promo code is spent once per booking exactly as it would be
  // if the customer had booked the two cars separately.
  const legs = (inp.extraVehicles ?? []).filter(Boolean);
  if (inp.splitDays && legs.length) {
    const one = (v: { key: string; label: string; model?: string | null }) =>
      computeQuote({ ...inp, vehicleSize: v.key, extraVehicles: [], splitDays: false });
    const first = computeQuote({ ...inp, extraVehicles: [], splitDays: false });
    const rest = legs.map(one);
    const all = [first, ...rest];
    const sum = (pick: (q: Quote) => number) => all.reduce((s, q) => s + pick(q), 0);
    return {
      basePrice: sum((q) => q.basePrice),
      sizeAdd: sum((q) => q.sizeAdd),
      addOnsTotal: sum((q) => q.addOnsTotal),
      travelFee: sum((q) => q.travelFee),
      // Every leg's own lines, in order. Nothing is invented here: each entry
      // is a line that will really appear on one of the receipts.
      adjustmentLines: all.flatMap((q) => q.adjustmentLines),
      adjustmentsTotal: sum((q) => q.adjustmentsTotal),
      subtotalBase: sum((q) => q.subtotalBase),
      siteDiscount: sum((q) => q.siteDiscount),
      subtotalAfterSite: sum((q) => q.subtotalAfterSite),
      promoDiscount: sum((q) => q.promoDiscount),
      total: sum((q) => q.total),
      // NOT the sum. Each booking is its own appointment on its own day, so
      // the length a slot has to be is ONE car's — handing the combined figure
      // to `available-slots` would ask for a four-hour window for a
      // ninety-minute job and hide most of the month.
      totalDurationMinutes: first.totalDurationMinutes,
      legs: [
        { size: inp.vehicleSize, label: inp.vehicleSizeLabel ?? inp.vehicleSize, model: null,
          total: first.total, durationMinutes: first.totalDurationMinutes },
        ...legs.map((v, i) => ({
          size: v.key, label: v.label, model: v.model ?? null,
          total: rest[i].total, durationMinutes: rest[i].totalDurationMinutes,
        })),
      ],
    };
  }

  // ROADMAP 8.10. `extras` is empty for every booking this product has ever
  // taken, and every line below then reduces to exactly what it was.
  const extras = (inp.extraVehicles ?? []).filter(Boolean);
  const basePrice = inp.services.reduce((s, sv) => s + (Number(sv.price) || 0), 0);
  // THE FIRST CAR'S FEE, NOT THE CARLOAD'S. `bookings.vehicle_size_fee`
  // snapshots this and the booking row describes one vehicle; the others
  // carry their own on their own rows.
  const sizeAdd = vehicleSizeFee(inp.services, inp.vehicleSize);
  const addOnsTotal = inp.addOns.reduce((s, a) => s + (Number(a.price) || 0), 0);
  const totalDurationMinutes =
    vehicleMinutes(inp.services, inp.vehicleSize) +
    extras.reduce((s, v) => s + extraVehicleMinutes(inp.services, v.key, inp.extraVehicleMinutesSaved ?? 0), 0) +
    inp.addOns.reduce((s, a) => s + (Number(a.duration_minutes) || 0), 0);

  // EACH EXTRA CAR IS A LABELLED AMOUNT ON `price_adjustments`, WHICH IS THE
  // WHOLE INTEGRATION — the same rail the plan discount, the quote difference
  // and every 2.8c surcharge already ride. The review step, the receipt, all
  // three money emails, the invoice and the manage page draw that array
  // already, and `reconcile()` already ties it to the total.
  //
  // The alternative was multiplying `basePrice`, and it fails visibly: the
  // email reconstructs its service line as *everything not otherwise named*,
  // so two cars would print as one line reading "Full Detail  $440" — a
  // number the customer cannot add up, which is the invoice defect this repo
  // has already shipped once. Extra `booking_services` rows fail differently:
  // that table has no vehicle column, so three cars would read as the same
  // service sold three times.
  //
  // AN ADD-ON IS PER VISIT, NOT PER CAR, and that one sentence is what makes
  // the two halves of this item agree: three cars in one driveway is one
  // visit and pays for its add-ons once, while the same three cars across
  // three days is three visits and pays three times — which falls out of the
  // split branch above without a rule of its own. The step asks once and the
  // answer belongs to the appointment. Narrow it to per-car if a detailer
  // complains, not before.
  const extraLines = extras.map((v, i) => ({
    label: `${ORDINALS[i + 1] ?? `#${i + 2}`} vehicle — ${v.label}`
      + (v.model ? ` · ${v.model}` : ""),
    amount: basePrice + vehicleSizeFee(inp.services, v.key),
  }));
  const extrasTotal = extraLines.reduce((s, l) => s + l.amount, 0);

  const travelFee = Number(inp.travelFee) || 0;
  // THE EXTRA CARS ARE INSIDE `beforeAdjustments`, NOT ADDED AFTER IT. A
  // Saturday surcharge of 10% is 10% of the DAY'S work, so a percentage rule
  // has to see every car; folding them in afterwards would quietly charge the
  // surcharge on one car and do the rest for free.
  const beforeAdjustments = basePrice + sizeAdd + addOnsTotal + travelFee + extrasTotal;
  // Percentages are of everything the job costs before discounts, which is
  // the only reading that does not depend on the order two rules happen to
  // sit in.
  const ruleLines = (inp.adjustments ?? []).map((r) => ({
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
  const rulesTotal = ruleLines.reduce((s, l) => s + l.amount, 0);
  // The extra cars are DRAWN with the adjustments and are already COUNTED in
  // `beforeAdjustments`, so they lead the list and stay out of the total
  // below. Counting them twice would double the price of the second car,
  // which is the shape of defect this file exists to prevent.
  const adjustmentLines = [...extraLines, ...ruleLines];
  // ROADMAP 8.10 — A PLAN COVERS ONE CAR, NOT THE CARLOAD. The `serviceCost`
  // handed over is the FIRST vehicle's services alone, so "included" and a
  // per-visit rate settle one car and the second is paid for; a percentage
  // still comes off the whole job, because "10% off every visit" says so.
  // Passing the carload would give a member three free details for one
  // month's subscription — the plan feature paying for itself three times.
  const planLine = planLineFor(inp.plan, basePrice + sizeAdd, beforeAdjustments + rulesTotal);
  if (planLine) adjustmentLines.push(planLine);
  const adjustmentsTotal = rulesTotal + (planLine?.amount ?? 0);

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
