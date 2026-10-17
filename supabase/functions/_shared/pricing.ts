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

// ─────────────────────────────────────────────────────────────────────────────
// ROADMAP 2.1a + 2.1c — A MONEY LINE SAYS WHAT KIND IT IS AND CARRIES ITS WORDS
// AS PARTS. 2026-09-21.
// ─────────────────────────────────────────────────────────────────────────────
//
// `adjustmentLines` glues three unrelated things into one array — the extra
// cars, the day-and-time price rules, and the plan — and until now a line was
// `{ label, amount }` and nothing else. Two defects fell out of that, and they
// are the same missing field seen from two sides:
//
//   **2.1a** The booking page must show the day-and-time surcharges on the
//   date step and NOT the other two, because only those were caused by
//   anything on that step. With no way to tell them apart it guessed from
//   `vehicle_count === 1 && !plan_name` — correct but blunt, so a plan booking
//   or a two-car booking showed NOTHING. Measured: with the Member rate plan
//   attached, picking a Saturday took the bar $60 → $85 with nothing on screen
//   explaining the $25. Slicing by POSITION was rejected on purpose: it welds
//   the page to the order this function happens to build the array in.
//
//   **2.1c** Two of the three kinds compose their label from ENGLISH written
//   here — "plan rate", "included", "{n}% off", "2nd vehicle" — where `t()`
//   does not exist, so a Spanish receipt reads them in English.
//
// **`source` IS NOT CALLED `kind`, AND THAT IS NOT A STYLE CHOICE.**
// `emailTemplates.ts` already builds its own row objects with a `kind` of
// "discount" or a charge, meaning *which way the money goes*. A second `kind`
// meaning *where the line came from* would collide in the one file that reads
// both.
//
// **`label` IS UNCHANGED AND STAYS.** It is snapshotted onto the booking as
// `price_adjustments` and read by the receipt, the invoice, every email, the
// dashboard and the manage page. This is additive: old stored rows keep
// rendering, and a caller that does not know about `source` behaves exactly as
// it did. `parts` is the same words the label already contains, handed over
// separately so a caller that CAN translate does not have to parse English
// back out of a finished sentence.
//
// **A RULE LINE GETS NO `parts`, ON PURPOSE.** Its label is the DETAILER'S own
// text out of `business_settings.price_rules` — their data, in their words,
// printed as written and never translated. That was established 2026-09-21:
// the settings screen that collects it translates only the placeholder
// ("e.g. Weekend rate" → "ej. Tarifa de fin de semana") and leaves the typed
// answer alone, exactly as a service name or a travel-zone name is left alone.
// Giving a rule line `parts` would invite somebody to translate it.
export type AdjustmentSource = "vehicle" | "rule" | "plan";

/** What a plan does to the price, as a value rather than as an English phrase. */
export type PlanBenefit = "included" | "plan_rate" | "percent_off";

export type AdjustmentParts =
  /** `ordinal` is 1-based over the EXTRA cars, so the second car is 2. */
  | { of: "vehicle"; ordinal: number; size: string; model?: string }
  | { of: "plan"; planName: string; benefit: PlanBenefit; percent?: number };

export interface AdjustmentLine {
  /** English, finished, and exactly what it has always been. The fallback for
   *  every caller that cannot or need not translate. */
  label: string;
  amount: number;
  source: AdjustmentSource;
  /** Absent on a rule line. See the block above for why. */
  parts?: AdjustmentParts;
}

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
  // ROADMAP 2.1d — with a day and no hour: hours from now until the END of
  // that day, the most notice any slot on it can give. Only ever compared
  // with "fewer than", where it is exact: inside the window at the last
  // minute means inside it at every minute.
  latestLeadHours?: number | null;
}

// Which rules apply. Pure, and separate from computeQuote so both endpoints
// and the tests can ask the question without building a whole quote.
export function matchPriceRules(rules: PriceRule[] | null | undefined, when: WhenContext): PriceRule[] {
  const hm = (t: string) => String(t).slice(0, 5);
  return (rules ?? []).filter((r) => {
    if (r.kind === "lead_time") {
      const lead = when.leadHours ?? when.latestLeadHours;
      if (lead == null || r.within_hours == null) return false;
      return lead < Number(r.within_hours);
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

// ROADMAP 2.3 — A CRUDE, HONEST FLAG, NOT A GATE, AND NOT DISTANCE. The
// customer picks a travel zone off a list with nothing checking it against
// the address they typed a few fields below it — someone in San Diego can
// pick "Long Beach" and pay its fee, and nothing here or anywhere else
// notices. Real distance pricing needs a stored business location (there
// isn't one) and a real geographic definition of what a "zone" is (there
// isn't one of those either) — a product decision, not a bug, written up
// for Andrew rather than guessed at here.
//
// This is the smaller, honest half: does the zone's OWN NAME show up
// anywhere in the address text. Nothing more. It catches a customer whose
// address flatly contradicts the zone they picked ("San Diego" typed under
// a zone named "Long Beach") and it will NOT catch a street twenty miles
// off inside a correctly-named city — comparing words is not measuring
// distance, and a silence from this check is not a promise the address is
// close. A zone name with nothing but a distance or a generic word in it
// ("Within 10 miles", "Zone 1") has nothing to compare, so it is skipped
// rather than guessed at — same rule `readAddressAnswer` already follows:
// "we could not tell" must never be dressed up as "it's fine".
const ZONE_WORD_STOPWORDS = new Set([
  "the", "and", "of", "in", "area", "zone", "within", "miles", "mile", "mi", "km", "radius",
]);
export function zoneAddressMismatch(zoneName: string | null | undefined, address: string | null | undefined): boolean {
  if (!zoneName || !address) return false;
  const words = zoneName.toLowerCase().match(/[a-z]+/g) ?? [];
  const meaningful = words.filter((w) => w.length > 2 && !ZONE_WORD_STOPWORDS.has(w));
  if (!meaningful.length) return false;
  const addr = address.toLowerCase();
  return !meaningful.some((w) => addr.includes(w));
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
  if (!bookingDate) return {};
  // **A DAY WITH NO TIME STILL PRICES A DAY-ONLY RULE — ROADMAP 2.1, 2026-09-22.**
  //
  // This used to be `if (!bookingDate || !startTime) return {}`, and that one
  // extra clause was the whole of the fault both audits reported. The layer
  // below has always been ready for this: `matchPriceRules` only demands a
  // `startTime` INSIDE the branch for a rule that carries a start AND an end
  // time, and refuses a `lead_time` rule whenever `leadHours` is null. So
  // returning the weekday alone is not a loosening — every rule that needs
  // the hour still correctly declines, and this tenant's own
  // `Weekend rate` (weekdays [0,6], start_time null, end_time null, read off
  // `business_settings` rather than off a document) finally gets asked.
  //
  // **WHY IT MATTERS MORE THAN THE THIRTY DOLLARS.** The surcharge is a
  // function of the DAY. The hour contributes nothing to it. So the product
  // knew the price was $95 the instant the customer tapped Sunday and went on
  // showing $65 while they browsed nine times — a disclosure late by one step
  // for no reason, on the one screen that takes money. The header comment on
  // `calculate-booking/index.ts` has described THIS behaviour since 2.8c
  // ("the quote starts without it and grows the surcharge when the day is
  // chosen"); the code simply did not do it. They agree now.
  //
  // `create-booking` and `preview-emails` are the other callers and neither
  // can reach this line with a date and no time — a booking has both.
  //
  // **AND A RUSH FEE THAT EVERY SLOT ON THE DAY CARRIES — ROADMAP 2.1d,
  // 2026-10-10.** Booking today on the demo showed $95 on the day and $115 on
  // ANY time tapped, first slot and last alike, because a `lead_time` rule
  // declined with no hour. The day alone does answer it when even the last
  // minute of the day is inside the window, so that is what is sent. A day
  // only partly inside (tomorrow, mostly) is still more than the window away
  // at its end, so the rule keeps waiting for the hour, as it must.
  if (!startTime) {
    const endOfDay = localDateTimeToInstant(tz, bookingDate, "23:59").getTime() + 60_000;
    return {
      weekday: weekdayOf(bookingDate),
      latestLeadHours: (endOfDay - Date.now()) / 3_600_000,
    };
  }
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
): AdjustmentLine | null {
  if (!plan) return null;
  const amount = Number(plan.priceAmount) || 0;
  let off: number;
  let what: string;
  // ROADMAP 2.1c — `benefit` is the same decision as `what`, taken once and
  // carried as a VALUE. `what` stays because it builds the English `label`
  // every stored booking and every email already renders.
  let benefit: PlanBenefit;
  if (plan.priceKind === "percent_off") {
    off = Math.round(jobCost * amount / 100);
    what = `${amount}% off`;
    benefit = "percent_off";
  } else if (plan.priceKind === "per_visit") {
    off = Math.max(0, serviceCost - amount);
    what = "plan rate";
    benefit = "plan_rate";
  } else {
    off = serviceCost;
    what = "included";
    benefit = "included";
  }
  // Never past the whole job, and never a line worth nothing — a $0 row on a
  // receipt is a question the customer has to ask somebody.
  off = Math.min(Math.max(0, off), Math.max(0, jobCost));
  if (off <= 0) return null;
  // Same join, same ruling: a plan's NAME against what it covers is a label
  // and its value, not a sentence. Found by grepping template literals rather
  // than strings, alongside the vehicle line below.
  return {
    label: `${plan.name} · ${what}`,
    amount: -off,
    source: "plan",
    // The plan's NAME is the detailer's own data and is never translated; the
    // benefit beside it is ours and always was, which is the whole of 2.1c.
    parts: {
      of: "plan",
      planName: plan.name,
      benefit,
      ...(benefit === "percent_off" ? { percent: amount } : {}),
    },
  };
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
  adjustmentLines: AdjustmentLine[];  // 2.8c, resolved to money
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
    // ROADMAP 97.6 — `plan: null`: the plan covers the FIRST car and only the
    // first call carries it (`bookingRequests` in core.js). Passing it here
    // priced every car as the first, and three cars on three days came to $0.
    const one = (v: { key: string; label: string; model?: string | null }) =>
      computeQuote({ ...inp, vehicleSize: v.key, extraVehicles: [], splitDays: false, plan: null });
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
    // **A LABEL SEPARATOR, SO THE MIDDLE DOT — and this template used BOTH,
    // six characters apart: "2nd vehicle — Small · Ford F-150".** The em dash
    // ruling, 2026-09-12. It was never in a `t()` literal — the dash sits
    // between two values and exists only after they meet — so no sweep of
    // translated strings could ever find it. Grep the JOINS, not the strings.
    label: `${ORDINALS[i + 1] ?? `#${i + 2}`} vehicle · ${v.label}`
      + (v.model ? ` · ${v.model}` : ""),
    amount: basePrice + vehicleSizeFee(inp.services, v.key),
    source: "vehicle" as const,
    // The same three values the label above is built from. `ordinal` is the
    // NUMBER, not "2nd": English ordinals do not survive translation, and a
    // page that has the number can spell it however its own language does.
    parts: {
      of: "vehicle" as const,
      ordinal: i + 2,
      size: v.label,
      ...(v.model ? { model: v.model } : {}),
    },
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
  // No `parts`: `r.label` is the detailer's own words and is never translated.
  const ruleLines = (inp.adjustments ?? []).map((r) => ({
    label: r.label,
    amount: r.is_percent
      ? Math.round(beforeAdjustments * (Number(r.amount) || 0) / 100)
      : Number(r.amount) || 0,
    source: "rule" as const,
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
  // Annotated rather than inferred: without this the array's element type is
  // the union of the two literal shapes above, and pushing the plan line below
  // stops type-checking. Node strips these types rather than checking them, so
  // nothing at test time would have told us.
  const adjustmentLines: AdjustmentLine[] = [...extraLines, ...ruleLines];
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

  const precise = Math.max(0, subtotal - promoDiscount);
  const total = roundToNearest(precise, inp.roundingNearest);

  // ROADMAP 2.2 — ROUND ONCE, FOLDED INTO A LINE, RATHER THAN TWICE WITH
  // NOWHERE FOR THE DIFFERENCE TO SHOW. Every line above rounds itself
  // (`planLineFor`, a percent rule, `siteDiscount`, `promoDiscount`) and
  // THEN the total rounds again to the business's own nearest-N setting —
  // two independent roundings, so the lines a customer is shown and the
  // amount actually charged could differ by up to half of `roundingNearest`
  // with no line anywhere accounting for it. `gap` is exactly that
  // difference — positive means the final rounding took money OFF what the
  // lines add up to (the customer is undercharged relative to the
  // breakdown), negative means it added money ON (overcharged) — and it is
  // folded into whichever discount sits nearest the total, the same choice
  // `app/src/book/steps/StepReview.jsx` already makes on the client for
  // site/promo (a dated, reviewed UI decision, 2026-09-11: "the rounding is
  // folded into the discount and the lines add up... it goes on the LAST
  // discount shown, because that is the one nearest the total"). Doing it
  // here means the server's own numbers are correct before the client ever
  // sees them, and it reaches a plan/member discount, which the client-side
  // version never did — see the test named after this item.
  let gap = Math.round((precise - total) * 100) / 100;
  if (gap !== 0 && promoDiscount !== 0) {
    promoDiscount += gap;
    gap = 0;
  } else if (gap !== 0 && siteDiscount !== 0) {
    siteDiscount += gap;
    gap = 0;
  } else if (gap !== 0) {
    const lastDiscount = [...adjustmentLines].reverse().find((l) => l.amount < 0);
    if (lastDiscount) { lastDiscount.amount -= gap; gap = 0; }
  }
  // NOTHING TO FOLD IT INTO — a business that rounds and charges no
  // discount at all on this booking. `gap` stays real and unresolved here;
  // `StepReview.jsx` already renders exactly this case as a sentence
  // ("Rounded up/down to the nearest dollar") rather than inventing a line,
  // and that half did not need porting — it was already correct.
  //
  // Recomputed from the (possibly folded) lines above, not assumed: if the
  // fold changed the last adjustment line, `adjustmentsTotal` and
  // `subtotalBase` have to agree with it, or this function would fix the
  // customer's total while quietly breaking the one truth about `subtotal`
  // every email and the dashboard already read as correct.
  const adjustmentsTotalFinal = adjustmentLines.reduce((s, l) => s + l.amount, 0);
  // ROADMAP 14.19 — AND THE EXTRA CARS COME BACK OUT, BECAUSE
  // `beforeAdjustments` ALREADY HOLDS THEM. `adjustmentsTotal` means two
  // different things sixty lines apart and both are right: the LOCAL one
  // above is rules + plan only, because the cars are already inside
  // `beforeAdjustments`; the RETURNED one is every drawn line, because
  // `StepReview.jsx` and `tests/pricing-lines-sum.test.mjs` sum the lines a
  // customer is SHOWN and the base price describes one car. Adding the
  // returned figure to `beforeAdjustments` charges the second car twice — a
  // two-car booking stored `subtotal` 315 against `total_price` 215.
  //
  // **AND IT BALANCED, WHICH IS WHY IT SURVIVED.** The email derives the
  // service line as *subtotal minus every named line*, so the inflated
  // subtotal printed the service at $215 and then a `Discount applied
  // −$100` to reach $215 — arithmetic that satisfies every money-column
  // check in this repo, including `render-emails.mjs`'s own, while telling
  // the customer they were quoted a price they never saw and given a
  // discount that does not exist. `tests/quoted-lines-true.test.mjs` is the
  // check that asks the other question.
  const subtotalBaseFinal = beforeAdjustments + adjustmentsTotalFinal - extrasTotal;
  const subtotalAfterSiteFinal = Math.max(0, subtotalBaseFinal - siteDiscount);

  return {
    basePrice,
    sizeAdd,
    addOnsTotal,
    travelFee,
    adjustmentLines,
    adjustmentsTotal: adjustmentsTotalFinal,
    subtotalBase: subtotalBaseFinal,
    siteDiscount,
    subtotalAfterSite: subtotalAfterSiteFinal,
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
// limit), or null. `ignoreLimit` is for a car sharing its group's one use of
// the code (ROADMAP 97.9, create-booking) — active and expiry still apply.
export async function resolvePromo(db: DB, businessId: string, code: string | null | undefined, { ignoreLimit = false } = {}) {
  // ROADMAP 97.23 — codes are stored in capitals, so "summer10" is SUMMER10.
  code = String(code ?? "").trim().toUpperCase();
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
  if (ignoreLimit || !data.usage_limit || data.usage_limit === 0 || data.times_used < data.usage_limit) return data;
  return null;
}
