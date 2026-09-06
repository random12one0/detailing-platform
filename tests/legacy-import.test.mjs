// ROADMAP 5.1 — the old site's rows becoming this platform's rows.
//
// WHY THIS FILE EXISTS AT ALL, given that the import cannot be run: the source
// project is not reachable from this machine (the access token in `.env`
// answers **403** for `adtlnvihwrcqcasqcjwd`), so the half that talks to two
// databases cannot be exercised until the owner supplies a key. **The half
// that can be WRONG is the mapping**, and it is a pure function over plain
// objects precisely so that it can be checked without either database.
//
// AND THE MAPPING IS WHERE THE DAMAGE WOULD BE. A plumbing failure is loud —
// a 401, a constraint, a run that stops. A mapping failure is a history that
// imports cleanly and is wrong: every job seven hours early, a discount
// charged as an extra, a total that no longer adds up to its own lines. **The
// owner would have to disbelieve his own records to find it.**
//
// Run: node tests/legacy-import.test.mjs   (credential-free)

import {
  STATUSES, PAYMENT_STATUSES, SERVICE_TYPES, VEHICLE_SIZES,
  serviceFrom, addOnFrom, isDiscountRow, customerFrom, bookingFrom,
  adjustmentsFrom, bookingServicesFrom, promoCodeFrom, expenseFrom,
  blockoutFrom, dropoffPeriodFrom, hoursOverrideFrom, UNMAPPED,
} from "../scripts/legacy-map.mjs";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};

const BIZ = "11111111-1111-1111-1111-111111111111";
const TZ = "America/Los_Angeles";

// ─── 1. The clock, which is the whole risk ────────────────────────────────
// The old table stores a date and a time with NO ZONE, because that site
// served one business in one place. This platform stores an absolute instant.
// Reading the pair as UTC moves every historical job by seven or eight hours.
console.log("1. the clock");
{
  const summer = bookingFrom(
    { booking_date: "2026-07-15", start_time: "09:00:00", end_time: "11:30:00" },
    { businessId: BIZ, timezone: TZ });
  // PDT is UTC−7 in July.
  check("a summer morning lands at the right instant",
    summer.start_at === "2026-07-15T16:00:00.000Z", summer.start_at);
  check("and so does its end",
    summer.end_at === "2026-07-15T18:30:00.000Z", summer.end_at);

  // PST is UTC−8 in January — a FIXED offset would be an hour out here, and
  // an hour is enough to move a 17:00 job into the next day's column near the
  // end of a month.
  const winter = bookingFrom(
    { booking_date: "2026-01-15", start_time: "09:00:00", end_time: "11:30:00" },
    { businessId: BIZ, timezone: TZ });
  check("a winter morning is an hour further from UTC, not the same",
    winter.start_at === "2026-01-15T17:00:00.000Z", winter.start_at);

  // The one that would print as "the day before" on a receipt.
  const late = bookingFrom(
    { booking_date: "2026-07-31", start_time: "17:00:00", end_time: "18:00:00" },
    { businessId: BIZ, timezone: TZ });
  check("an evening job at month end does not fall into the next day locally",
    late.start_at === "2026-08-01T00:00:00.000Z", late.start_at);

  // A different tenant's zone must give a different instant from the same
  // pair: this is what proves the timezone is READ rather than assumed.
  const ny = bookingFrom(
    { booking_date: "2026-07-15", start_time: "09:00:00", end_time: "11:30:00" },
    { businessId: BIZ, timezone: "America/New_York" });
  check("the zone is read, not assumed",
    ny.start_at === "2026-07-15T13:00:00.000Z" && ny.start_at !== summer.start_at, ny.start_at);

  const overnight = bookingFrom(
    { booking_date: "2026-07-15", start_time: "23:00:00", end_time: "01:00:00" },
    { businessId: BIZ, timezone: TZ });
  check("a job whose end time is before its start time ends the NEXT day",
    Date.parse(overnight.end_at) - Date.parse(overnight.start_at) === 2 * 3_600_000,
    `${overnight.start_at} → ${overnight.end_at}`);
}

// ─── 2. The money ─────────────────────────────────────────────────────────
// CLAUDE.md, after a −$120 line printed as a $120 CHARGE: **set the `kind`; a
// sign is not a kind.**
console.log("\n2. the money");
{
  const withPlan = adjustmentsFrom({
    monthly_plan_name: "Monthly Shine", monthly_plan_discount: 60,
  });
  check("a plan discount becomes ONE negative line", withPlan.length === 1 && withPlan[0].amount === -60);
  check("and it carries a `kind`, because a sign is not a kind", withPlan[0].kind === "discount");
  check("labelled with the plan's own name", withPlan[0].label === "Monthly Shine");

  // THE PROMO IS NOT IN HERE. It has its own two columns on both sides and
  // every template itemises it from them; a second copy double-discounts the
  // receipt.
  const withPromo = adjustmentsFrom({
    applied_promo_code: "SPRING20", promo_discount: 20, monthly_plan_discount: 0,
  });
  check("the promo is NOT copied into the adjustments", withPromo.length === 0,
    JSON.stringify(withPromo));

  const b = bookingFrom({
    booking_date: "2026-07-15", start_time: "09:00:00", end_time: "10:00:00",
    subtotal: 200, total_price: 120, applied_promo_code: "SPRING20", promo_discount: 20,
    monthly_plan_name: "Monthly Shine", monthly_plan_discount: 60,
  }, { businessId: BIZ, timezone: TZ });
  // 200 − 20 promo − 60 plan = 120, which is what the old row said. If the
  // plan line were dropped, or the promo duplicated, this stops holding.
  const lines = b.price_adjustments.reduce((a, l) => a + l.amount, 0);
  check("subtotal + every line + the promo still reaches the stored total",
    b.subtotal + lines - b.promo_discount === b.total_price,
    `${b.subtotal} ${lines} ${b.promo_discount} → ${b.total_price}`);

  check("travel is zero and never null — the column is NOT NULL and the old site had no travel fee",
    b.travel_fee === 0);
}

// ─── 3. The vocabularies ──────────────────────────────────────────────────
// Both CHECK constraints were written eight months apart and happen to agree.
// "Happen to" is why this is asserted rather than assumed.
console.log("\n3. the vocabularies");
{
  for (const s of ["confirmed", "cancelled", "completed", "no_show"]) {
    const b = bookingFrom({ booking_date: "2026-07-15", start_time: "09:00:00", end_time: "10:00:00", status: s },
      { businessId: BIZ, timezone: TZ });
    check(`status "${s}" survives`, b.status === s);
  }
  const odd = bookingFrom({
    booking_date: "2026-07-15", start_time: "09:00:00", end_time: "10:00:00",
    status: "archived", payment_status: "refunded", service_type: "shop", vehicle_size: "xl",
  }, { businessId: BIZ, timezone: TZ });
  // A value this platform's CHECK would reject must not reach the insert: the
  // whole run would stop on one row from eight months ago.
  check("a status this platform has never had does not reach the insert",
    STATUSES.includes(odd.status) && PAYMENT_STATUSES.includes(odd.payment_status)
      && SERVICE_TYPES.includes(odd.service_type) && VEHICLE_SIZES.includes(odd.vehicle_size),
    JSON.stringify([odd.status, odd.payment_status, odd.service_type, odd.vehicle_size]));
}

// ─── 4. The catalog ───────────────────────────────────────────────────────
console.log("\n4. the catalog");
{
  const s = serviceFrom({
    name: "Full Interior", category: "interior", tier: "deluxe",
    base_price: 150, duration_minutes: 120, is_active: true,
  }, BIZ, 3);
  check("the tier joins the name, because three tiers share one name",
    s.name === "Full Interior — Deluxe", s.name);
  check("the category becomes a group label, which is how the booking page draws it",
    s.group_label === "Interior");
  check("price and duration carry", s.price === 150 && s.duration_minutes === 120);
  check("and it is offered both ways — those columns did not exist on the old site, and false would empty the booking page",
    s.allows_mobile === true && s.allows_dropoff === true);
  check("a name that already says the tier is not made to say it twice",
    serviceFrom({ name: "Ultimate Detail", tier: "ultimate", category: "exterior" }, BIZ).name === "Ultimate Detail");

  // AN ADD-ON HERE IS SOMETHING A CUSTOMER PAYS FOR. The old table used the
  // same rows for discounts, and importing one as an add-on charges for it.
  check("a discount row is recognised, not converted",
    isDiscountRow({ price: 0, discount_type: "amount", value: 25 })
      && isDiscountRow({ price: 0, discount_type: "percentage", value: 10 }));
  check("a real extra is not mistaken for one",
    !isDiscountRow({ price: 35, discount_type: "amount", value: null }));
  const a = addOnFrom({ name: "Pet hair", price: 35, duration_minutes: 20 }, BIZ, 1);
  check("a real extra carries its price and time", a.price === 35 && a.duration_minutes === 20);

  const pkg = { id: "p1", name: "Full Interior", category: "interior", tier: "deluxe", base_price: 150, duration_minutes: 120 };
  const rows = bookingServicesFrom(
    { interior_package_id: "p1", exterior_package_id: null },
    { businessId: BIZ, bookingId: "b1", serviceByPackage: new Map([["p1", "s1"]]), packageById: new Map([["p1", pkg]]) });
  check("a booking's package becomes one booking_services row", rows.length === 1);
  check("pointing at the new service id", rows[0].service_id === "s1");
  check("with the name and price snapshotted", rows[0].name_at_booking === "Full Interior — Deluxe" && rows[0].price_at_booking === 150);
  check("a package the old table no longer has is skipped rather than inserted as null",
    bookingServicesFrom({ interior_package_id: "gone" },
      { businessId: BIZ, bookingId: "b1", serviceByPackage: new Map(), packageById: new Map() }).length === 0);
}

// ─── 5. The people ────────────────────────────────────────────────────────
console.log("\n5. the people");
{
  const c = customerFrom({
    name: " Dana ", email: "", phone: "555-0100", address: null,
    notes: "gate code 4412", completed_washes_count: 7,
    referral_code: "DANA-9", loyalty_reward_eligible: true,
  }, BIZ);
  check("the name is trimmed and the empty email becomes null", c.name === "Dana" && c.email === null);
  check("the visit count carries", c.completed_washes_count === 7);
  // Roadmap 4.2 item P is open: what a referral EARNS is a decision nobody has
  // made. Stuffing these into `notes` would make them look supported.
  check("the referral columns are dropped rather than smuggled into notes",
    !("referral_code" in c) && !("loyalty_reward_eligible" in c) && c.notes === "gate code 4412");

  const b = bookingFrom({
    booking_date: "2026-07-15", start_time: "09:00:00", end_time: "10:00:00",
    customer_name: "Dana", customer_email: "dana@example.test", customer_phone: "555-0100",
  }, { businessId: BIZ, timezone: TZ, customerId: "cust-uuid" });
  check("a booking points at the new customer id", b.customer_id === "cust-uuid");
  check("and keeps the snapshot the receipt actually said",
    b.customer_name === "Dana" && b.customer_email === "dana@example.test");
}

// ─── 6. The tables that are the same table with a business bolted on ──────
console.log("\n6. the rest");
{
  check("a promo code is upper-cased, the way every other code in this product is",
    promoCodeFrom({ code: " spring20 ", type: "percentage", value: 20 }, BIZ).code === "SPRING20");
  check("an unknown discount type falls to `amount` rather than failing the CHECK",
    promoCodeFrom({ code: "X", type: "bogus", value: 5 }, BIZ).type === "amount");
  check("an expense carries its own date and method",
    expenseFrom({ date: "2026-06-02", category: "Supplies", description: "Wax", amount: 24.5, payment_method: "card" }, BIZ).amount === 24.5);
  check("a blockout with no end date ends the day it starts, because end_date is NOT NULL here",
    blockoutFrom({ event_name: "Away", start_date: "2026-08-01", end_date: null }, BIZ).end_date === "2026-08-01");
  check("a drop-off period gets the `mode` this platform requires and the old table implied by its NAME",
    dropoffPeriodFrom({ start_date: "2026-08-01" }, BIZ).mode === "dropoff");
  check("an hours override carries its date and both times",
    hoursOverrideFrom({ date: "2026-08-01", open_time: "10:00", close_time: "15:00" }, BIZ).open_time === "10:00");
  for (const t of [promoCodeFrom({ code: "A", type: "amount", value: 1 }, BIZ),
                   expenseFrom({ date: "2026-01-01", amount: 1 }, BIZ),
                   blockoutFrom({ start_date: "2026-01-01" }, BIZ),
                   dropoffPeriodFrom({ start_date: "2026-01-01" }, BIZ),
                   hoursOverrideFrom({ date: "2026-01-01" }, BIZ)]) {
    // Every one of these tables is per-business here and was not there. A
    // single forgotten `business_id` is a row RLS makes invisible to everyone.
    if (t.business_id !== BIZ) { check("every row carries its business", false, JSON.stringify(t)); }
  }
  check("every row carries its business", true);
}

// ─── 7. What has no home is WRITTEN DOWN ──────────────────────────────────
// A migration that quietly drops rows is a migration nobody can check
// afterwards — and each of these is a decision rather than a gap.
console.log("\n7. what has no home");
{
  check("the unmapped list has subjects", UNMAPPED.length >= 7, `${UNMAPPED.length}`);
  check("every entry says WHY, not just what", UNMAPPED.every(([, why]) => why && why.length > 40));
  const names = UNMAPPED.map(([what]) => what).join(" | ");
  for (const owed of ["referral", "monthly_plans", "line_items", "admin_users"]) {
    check(`${owed} is named`, names.includes(owed), names);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
