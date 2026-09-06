// ROADMAP 5.1 — turning the old site's rows into this platform's rows.
//
// THE PURE HALF, deliberately separated from the script that talks to two
// databases. Everything here is a function over plain objects: no fetch, no
// Supabase, no credentials. That is the only reason any of it can be checked,
// because **the source project is not reachable from this machine** — the
// access token in `.env` answers 403 for `adtlnvihwrcqcasqcjwd` — so the I/O
// half cannot be exercised until the owner supplies a key, and the part that
// can actually be WRONG is the mapping rather than the plumbing.
//
// WHAT MAKES THIS DANGEROUS IS NOT THE VOLUME, IT IS THE CLOCK. The old
// bookings table stores `booking_date` (a date) and `start_time` (a time) with
// no zone at all, because that site served one business in one place. This
// platform stores `start_at` as an absolute instant. **Reading the pair as UTC
// moves every historical job by seven or eight hours**, silently, and a
// history that is off by a day either side of midnight is worse than no
// history: it is a record the owner would have to disbelieve. So the
// conversion goes through `_shared/tz.ts`, which is the same code the product
// itself books with, and it needs the business's IANA timezone.
//
// AND `line_items` IS NOT MIGRATED AS ITSELF. The old finalisation wrote a
// free-form jsonb blob; this platform has `price_adjustments`, a labelled
// array every render path already draws (CLAUDE.md: "when you add a money line
// anywhere, set its `kind`; a sign is not a kind"). Anything that cannot be
// turned into a labelled, signed line is left OUT of the array and reported,
// because a money line the receipt cannot draw is a total that stops adding
// up — which is this repo's oldest rule with somebody's real history behind
// it.

import { localDateTimeToInstant } from "../supabase/functions/_shared/tz.ts";

// ---------------------------------------------------------------------------
// The vocabularies. Both schemas happen to agree on all four, which is worth
// asserting rather than assuming: the old CHECK constraints and this
// platform's were written eight months apart.
// ---------------------------------------------------------------------------
export const STATUSES = ["pending", "confirmed", "cancelled", "completed", "no_show"];
export const PAYMENT_STATUSES = ["pending", "paid", "partial", "waived"];
export const SERVICE_TYPES = ["mobile", "dropoff"];
export const VEHICLE_SIZES = ["small", "medium", "large"];

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const text = (v) => (v === null || v === undefined ? null : String(v).trim() || null);

// ---------------------------------------------------------------------------
// packages → services
//
// THE OLD SITE'S CATALOG IS TWO COLUMNS AND THIS ONE'S IS A LIST. A package is
// `interior` or `exterior` at one of three tiers, and a booking picks at most
// one of each. Here a service is just a service and the grouping is a LABEL,
// which is how `groupServices` in `book/core.js` already draws it — so
// `category` becomes `group_label` and the tier joins the name, which is what
// a customer reads on the card anyway.
// ---------------------------------------------------------------------------
const TIER_WORD = { standard: "Standard", deluxe: "Deluxe", ultimate: "Ultimate" };
const CATEGORY_LABEL = { interior: "Interior", exterior: "Exterior" };

export function serviceFrom(pkg, businessId, sortOrder = 0) {
  const tier = TIER_WORD[pkg.tier] ?? pkg.tier;
  return {
    business_id: businessId,
    // The old `name` is already the customer-facing one ("Full Interior"); the
    // tier is a separate column that never reached the page, so it is appended
    // rather than substituted — dropping it would merge three different prices
    // into three services with the same name.
    name: text(pkg.name) && !String(pkg.name).toLowerCase().includes(String(pkg.tier).toLowerCase())
      ? `${pkg.name} — ${tier}`
      : text(pkg.name) ?? tier,
    description: text(pkg.description),
    price: num(pkg.base_price),
    duration_minutes: num(pkg.duration_minutes),
    group_label: CATEGORY_LABEL[pkg.category] ?? text(pkg.category),
    is_active: pkg.is_active !== false,
    sort_order: sortOrder,
    // BOTH MODES, because the old site offered every package both ways and
    // these two columns did not exist there. Defaulting them false would take
    // the whole catalog off the booking page with nothing to explain it.
    allows_mobile: true,
    allows_dropoff: true,
  };
}

// ---------------------------------------------------------------------------
// add_ons → add_ons, and the ones that are NOT add-ons
//
// The old table did two jobs: real extras with a price, and DISCOUNTS carrying
// `discount_type` / `value` and no price. This platform's add-on is only ever
// something a customer chooses and pays for; a discount belongs in
// `promo_codes` or in a booking's `price_adjustments`, and neither is a thing
// this function can invent. **So a discount row is REPORTED, never converted**
// — a $25 discount imported as a $25 add-on would silently charge the next
// customer who ticks it.
// ---------------------------------------------------------------------------
export function isDiscountRow(row) {
  return num(row.price) <= 0 && (num(row.value) > 0 || row.discount_type === "percentage");
}

export function addOnFrom(row, businessId, sortOrder = 0) {
  return {
    business_id: businessId,
    name: text(row.name) ?? "Add-on",
    description: text(row.description),
    price: num(row.price),
    duration_minutes: num(row.duration_minutes),
    is_active: row.is_active !== false,
    sort_order: sortOrder,
  };
}

// ---------------------------------------------------------------------------
// customers → customers
//
// THE ID CHANGES SHAPE — old `bigint`, new `uuid` — so nothing that points at
// a customer can be copied verbatim. The importer keeps an old-id → new-id map
// in memory and the caller must insert customers FIRST; there is no ordering
// this can enforce by itself, which is why the script's order is written down.
//
// `referral_code` and `loyalty_reward_eligible` HAVE NO HOME and that is not
// an oversight: roadmap 4.2 item P is open precisely because what a referral
// EARNS is a business decision nobody has made. They are reported as dropped
// rather than stuffed into `notes`, where they would look like something the
// product supports.
// ---------------------------------------------------------------------------
export function customerFrom(row, businessId) {
  return {
    business_id: businessId,
    name: text(row.name) ?? "Customer",
    email: text(row.email),
    // NOT NULL on both sides, and the old site made it required at the form.
    phone: text(row.phone) ?? "",
    address: text(row.address),
    notes: text(row.notes),
    completed_washes_count: num(row.completed_washes_count),
    created_at: row.created_at ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// bookings → bookings
//
// The clock is the whole risk; see the header. `end_at` is taken from the old
// `end_time` rather than recomputed from a duration, because a job that ran
// long was edited there and the duration column was not always updated with
// it — the pair on the row is what actually happened.
//
// A JOB THAT CROSSES MIDNIGHT is why `end_at` is nudged: the old row holds two
// times and no dates, so `end_time < start_time` means the next day. It has
// never happened on this business's data (nothing runs past 18:00) and it
// costs one line to be right about.
// ---------------------------------------------------------------------------
export function bookingFrom(row, { businessId, timezone, customerId = null }) {
  const start = localDateTimeToInstant(timezone, row.booking_date, row.start_time);
  let end = localDateTimeToInstant(timezone, row.booking_date, row.end_time);
  if (end <= start) end = new Date(end.getTime() + 86_400_000);

  const adjustments = adjustmentsFrom(row);
  return {
    business_id: businessId,
    customer_id: customerId,
    // The denormalised snapshot is kept as it was, NOT refreshed from the
    // customer row. It is what the receipt said on the day.
    customer_name: text(row.customer_name) ?? "Customer",
    customer_phone: text(row.customer_phone) ?? "",
    customer_email: text(row.customer_email),
    customer_address: text(row.customer_address),
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    service_type: SERVICE_TYPES.includes(row.service_type) ? row.service_type : "mobile",
    vehicle_size: VEHICLE_SIZES.includes(row.vehicle_size) ? row.vehicle_size : "medium",
    vehicle_size_fee: num(row.vehicle_size_fee),
    vehicle_model: text(row.vehicle_model),
    has_water_electric: row.has_water_electric === true,
    customer_notes: text(row.customer_notes),
    subtotal: num(row.subtotal),
    total_price: num(row.total_price),
    applied_promo_code: text(row.applied_promo_code),
    promo_discount: row.promo_discount === null || row.promo_discount === undefined
      ? null : num(row.promo_discount),
    final_amount: row.final_amount === null || row.final_amount === undefined
      ? null : num(row.final_amount),
    payment_status: PAYMENT_STATUSES.includes(row.payment_status) ? row.payment_status : "pending",
    payment_notes: text(row.payment_notes),
    finalized_at: row.finalized_at ?? null,
    google_calendar_event_id: text(row.google_calendar_event_id),
    status: STATUSES.includes(row.status) ? row.status : "confirmed",
    price_adjustments: adjustments,
    created_at: row.created_at ?? undefined,
    // TRAVEL IS ZERO AND NOT NULL. The old site had no travel fee at all (it
    // arrived in roadmap 2.8c), so every historical job genuinely had none —
    // and the column is NOT NULL here.
    travel_fee: 0,
  };
}

// ---------------------------------------------------------------------------
// THE MONEY LINES. `price_adjustments` is the labelled-amount array every
// render path already draws, and the rule from CLAUDE.md applies to a row
// written eight months ago exactly as it does to a new one: **set the `kind`;
// a sign is not a kind.** A −$60 line with no kind prints as a $60 CHARGE
// while the total is $60 lower, which is the column silently ceasing to add
// up.
//
// The promo is NOT put in here. `bookings.applied_promo_code` and
// `promo_discount` are their own columns on both sides and the templates
// itemise them from there; adding a second copy would double the discount on
// every receipt.
// ---------------------------------------------------------------------------
export function adjustmentsFrom(row) {
  const out = [];
  const planOff = num(row.monthly_plan_discount);
  if (planOff > 0) {
    out.push({
      label: text(row.monthly_plan_name) ?? "Monthly plan",
      amount: -planOff,
      kind: "discount",
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// A booking's SERVICES. The old row points at up to two packages by id and
// stores no name or price of its own, so the historical figures have to come
// from the package as it is TODAY — which is the one place this import cannot
// be faithful, and the plan says so out loud rather than hiding it.
// ---------------------------------------------------------------------------
export function bookingServicesFrom(row, { businessId, bookingId, serviceByPackage, packageById }) {
  const out = [];
  for (const key of ["interior_package_id", "exterior_package_id"]) {
    const pkgId = row[key];
    if (!pkgId) continue;
    const pkg = packageById.get(pkgId);
    if (!pkg) continue;
    out.push({
      business_id: businessId,
      booking_id: bookingId,
      service_id: serviceByPackage.get(pkgId) ?? null,
      name_at_booking: serviceFrom(pkg, businessId).name,
      price_at_booking: num(pkg.base_price),
      duration_at_booking: num(pkg.duration_minutes),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The tables that are the same table with a `business_id` bolted on. They are
// listed rather than looped over generically, because a generic copier is how
// a column that means something different on the two sides gets carried
// across without anybody reading it.
// ---------------------------------------------------------------------------
export const promoCodeFrom = (r, businessId) => ({
  business_id: businessId,
  code: String(r.code || "").trim().toUpperCase(),
  type: r.type === "percentage" ? "percentage" : "amount",
  value: num(r.value),
  expires_at: r.expires_at ?? null,
  usage_limit: r.usage_limit ?? null,
  times_used: num(r.times_used),
  is_active: r.is_active !== false,
});

export const expenseFrom = (r, businessId) => ({
  business_id: businessId,
  date: r.date,
  category: text(r.category) ?? "Other",
  description: text(r.description) ?? "",
  amount: num(r.amount),
  payment_method: text(r.payment_method) ?? "cash",
  notes: text(r.notes),
  created_at: r.created_at ?? undefined,
});

export const blockoutFrom = (r, businessId) => ({
  business_id: businessId,
  event_name: text(r.event_name) ?? "Blocked",
  start_date: r.start_date,
  end_date: r.end_date ?? r.start_date,
  all_day: r.all_day !== false,
  start_time: r.start_time ?? null,
  end_time: r.end_time ?? null,
  repeat: text(r.repeat) ?? "none",
});

// `mode` is NOT NULL here and did not exist there. The old table's whole
// meaning is its name: these are windows where only drop-off is offered.
export const dropoffPeriodFrom = (r, businessId) => ({
  business_id: businessId,
  start_date: r.start_date,
  end_date: r.end_date ?? null,
  start_time: r.start_time ?? null,
  end_time: r.end_time ?? null,
  reason: text(r.reason),
  mode: "dropoff",
});

export const hoursOverrideFrom = (r, businessId) => ({
  business_id: businessId,
  date: r.date,
  open_time: r.open_time,
  close_time: r.close_time,
  notes: text(r.notes),
});

// ---------------------------------------------------------------------------
// WHAT HAS NO HOME. Every one of these is a decision rather than a gap in this
// file, and the importer PRINTS them: a migration that quietly drops rows is
// a migration nobody can check afterwards.
// ---------------------------------------------------------------------------
export const UNMAPPED = [
  ["customers.referral_code / loyalty_reward_eligible",
   "roadmap 4.2 item P is open — what a referral EARNS is a business decision nobody has made, and inventing one is what this repo forbids"],
  ["referrals (whole table)",
   "the old site never used it; empty on the live database and it points at the two columns above"],
  ["add_ons that are discounts (price 0, discount_type/value set)",
   "an add-on here is something a customer chooses and PAYS for; imported as one, a $25 discount charges $25"],
  ["monthly_plans (whole table)",
   "the old plan is a discount with no price; this platform's `plans` needs a cadence and what the member pays. Roadmap 4.3 closed into 2.14 for exactly this reason — the two are not the same object"],
  ["bookings.line_items (jsonb)",
   "free-form; `price_adjustments` needs a label, an amount AND a kind, and a line the receipt cannot draw is a total that stops adding up"],
  ["bookings.ics_file_sent / total_duration_minutes",
   "one is a send flag this platform does not keep, the other is derivable from start_at and end_at"],
  ["admin_users",
   "a membership needs an `auth.users` row; the owner's own account is created by accepting an invite, which is roadmap 4.4's resend-invite path"],
];
