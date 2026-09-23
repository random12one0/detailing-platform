// Public, shareable receipt data — access-controlled by the unguessable
// booking UUID (same posture as the old system). Returns only that one
// booking plus the OWNING business's public contact fields; local date/time
// are derived from the business's timezone.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { businessById, getSettings } from "../_shared/tenant.ts";
import { dateStrIn, timeStrIn } from "../_shared/tz.ts";
import { cardStatus, payability } from "../_shared/connect.ts";
import { ipOf, LIMITS, withinLimits } from "../_shared/rateLimit.ts";

// ROADMAP 14.1 — THE LIST IS WHAT THE CUSTOMER'S PAGE DRAWS, NOT WHAT TO HIDE.
//
// This was `select("*")`, which handed an anonymous caller every column on the
// row. Including `admin_notes` — the box `BookingDetail.jsx` prints to the
// business under the label **"Private:"**. Measured before the change: an
// anonymous GET with no API key returned `admin_notes: "staff note"`, plus
// `payment_notes`, both Stripe ids, and the internal `customer_id`,
// `business_id`, `campaign_id`, `plan_id` and `plan_member_id`.
//
// AN ALLOW-LIST AND NOT A DENY-LIST, BECAUSE THE DENY-LIST IS ALWAYS ONE
// MIGRATION OUT OF DATE. A column added to `bookings` tomorrow is private
// until somebody puts its name here on purpose. `business_settings` three
// screens down already works this way — one setting exposed by name, the rest
// never sent — and this is the same move applied to the booking row.
//
// Every name below is rendered by `app/src/book/ManageBookingPage.jsx`.
const BOOKING_COLUMNS = [
  "id",
  "status",
  "service_type",
  "start_at",
  "end_at",
  "customer_name",
  "customer_phone",
  "customer_email",
  "customer_address",
  // ROADMAP 2.8 — named here ON PURPOSE, which is what this allow-list is
  // for. The manage page prints "you typed this one in; we could not find it"
  // beside the address, and it can only do that if the column is sent. It is
  // the customer's own booking and their own address: nothing here is private
  // from them.
  "address_source",
  "customer_notes",
  "vehicle_model",
  "vehicle_size_label",
  "vehicle_size_fee",
  "vehicle_condition",
  "subtotal",
  "total_price",
  "final_amount",
  "travel_fee",
  "travel_zone",
  "price_adjustments",
  "promo_discount",
  "applied_promo_code",
  "quoted_amount",
  "quoted_note",
  "quoted_at",
];

// READ, AND NEVER SENT. `business_id` and `booking_group_id` find the sibling
// appointments further down; `payment_status` is what `payability()` reads to
// decide whether a Pay button is drawn at all. None of the three is any of the
// customer's business, so they are selected and then dropped.
const SERVER_ONLY_COLUMNS = ["business_id", "booking_group_id", "payment_status"];

const EMBEDDED = ["services", "add_ons", "vehicles"];

// Derived from the business's timezone in the reply below, never stored.
const DERIVED = ["booking_date", "start_time", "end_time"];

/**
 * EVERY KEY THE PUBLIC RECEIPT MAY CARRY. `tests/receipt-fields.test.mjs`
 * reads this array out of this file and asserts the deployed endpoint's answer
 * has exactly these keys — the list itself, not the absence of one bad name.
 */
export const PUBLIC_BOOKING_FIELDS = [...BOOKING_COLUMNS, ...EMBEDDED, ...DERIVED];

const BOOKING_SELECT = `
  ${[...BOOKING_COLUMNS, ...SERVER_ONLY_COLUMNS].join(", ")},
  services:booking_services(service_id, name_at_booking, price_at_booking, duration_at_booking),
  add_ons:booking_add_ons(add_on_id, add_on:add_ons(id, name, price)),
  vehicles:booking_vehicles(position, vehicle_size_label, vehicle_model)
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    // ROADMAP 14.9 — the blunt ceiling every other public endpoint already
    // has. CHECKED BEFORE WIRING THIS IN, NOT ASSUMED: `bookings.id` is
    // `uuid primary key default gen_random_uuid()` (`supabase/migrations/
    // 20260827000200_tenant_data.sql:232`), a real version-4 UUID with no
    // sequential or predictable component, and this handler does one lookup
    // by that id and nothing that lists or paginates bookings. So a stranger
    // cannot guess a valid id at any practical rate — this is a cost problem
    // (a loop spending invocations), not a data-exposure one, and the
    // ceiling is the right size of fix. Same shape as `booking-ics`, which
    // already protects the sibling endpoint with the identical access model
    // ("the unguessable booking UUID is the credential").
    if (!await withinLimits(supabase, [{ ...LIMITS.publicCeiling, bucket: "get-booking-receipt", key: ipOf(req) }])) {
      return json({ error: "too_many_requests" }, 429);
    }

    let id: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (typeof body?.id === "string") id = body.id;
      } catch (_) { /* fall back to query param */ }
    }
    if (!id) id = new URL(req.url).searchParams.get("id");
    if (!id?.trim()) return json({ error: "id is required" }, 400);

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("id", id.trim())
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !booking) return json({ error: "not_found" }, 404);
    // deno-lint-ignore no-explicit-any
    const row = booking as any;

    const business = await businessById(booking.business_id);
    const tz = business?.timezone || "UTC";
    // The customer's page needs to know how close to the appointment online
    // cancellation closes, so it can say so BEFORE they tap rather than
    // after the server refuses. Only this one setting is exposed; the rest
    // of business_settings stays private.
    const settings = business ? await getSettings(business.id) : null;

    // ROADMAP 8.10 — THE OTHER APPOINTMENTS THIS CUSTOMER MADE IN THE SAME GO.
    // Two cars on two days are two bookings, so they are two emails and two of
    // these pages; without this the customer is holding two links and neither
    // one mentions the other, which reads as a double booking.
    //
    // IT EXPOSES NOTHING NEW. A group only ever contains bookings this server
    // itself grouped, and grouping required the same person's own identifiers
    // to match — so every row here belongs to whoever is already holding this
    // booking's id, which is the credential this whole endpoint runs on.
    // Scoped to the business as well, because a group id is a plain uuid
    // column with no foreign key behind it.
    let group: unknown[] = [];
    if (booking.booking_group_id) {
      const { data: sibs } = await supabase
        .from("bookings")
        .select("id, start_at, end_at, status, vehicle_size_label, vehicle_model, total_price")
        .eq("business_id", booking.business_id)
        .eq("booking_group_id", booking.booking_group_id)
        .neq("id", booking.id)
        .is("deleted_at", null)
        .order("start_at");
      // deno-lint-ignore no-explicit-any
      group = (sibs ?? []).map((b: any) => ({
        ...b,
        booking_date: dateStrIn(tz, new Date(b.start_at)),
        start_time: timeStrIn(tz, new Date(b.start_at)),
      }));
    }

    // ROADMAP 2.20 STAGE 3 — MAY THIS CUSTOMER BE OFFERED A CARD BUTTON?
    //
    // TWO BOOLEANS AND NOT ONE WORD OF EXPLANATION. `cardStatus().detail` is
    // written in the DETAILER's words — "finish the details Stripe asked for"
    // — and this endpoint is public, so shipping it here would print a
    // business's onboarding state to anybody holding a booking link. The
    // customer gets a button or no button.
    //
    // AND IT IS ASKED AGAIN AT THE PRESS. `pay-booking` runs the same two
    // functions on the same row, because this answer travels into a page that
    // can sit open on a phone for a day, and into an email that lives in an
    // inbox for ever. This one decides whether to DRAW the button; that one
    // decides whether it works.
    let card = { ready: false, amountCents: 0 };
    if (business) {
      const { data: conn } = await supabase
        .from("connected_accounts")
        .select("stripe_account_id, charges_enabled, card_payments_enabled")
        .eq("business_id", business.id)
        .maybeSingle();
      const settingsForCard = {
        stripe_account_id: conn?.stripe_account_id ?? null,
        stripe_charges_enabled: conn?.charges_enabled ?? false,
        card_payments_enabled: conn?.card_payments_enabled ?? false,
      };
      if (cardStatus(settingsForCard).ready) {
        const verdict = payability({
          booking,
          settings: settingsForCard,
          businessStatus: business.status,
        });
        if (verdict.ok) card = { ready: true, amountCents: verdict.amountCents };
      }
    }

    return json({
      // Empty for every booking that is not part of one, which is all of them
      // until a customer books two cars on two days.
      group,
      card,
      // THE SPREAD WAS THE SECOND HALF OF THE LEAK AND IT IS GONE. Narrowing
      // the select alone still ships `payment_status` and the two ids the
      // group query needs, so the reply is BUILT from the allow-list rather
      // than copied from the row and trimmed.
      booking: {
        ...Object.fromEntries(
          [...BOOKING_COLUMNS, ...EMBEDDED].map((k) => [k, row[k]]),
        ),
        booking_date: dateStrIn(tz, new Date(booking.start_at)),
        start_time: timeStrIn(tz, new Date(booking.start_at)),
        end_time: timeStrIn(tz, new Date(booking.end_at)),
      },
      business: business
        ? {
          slug: business.slug,
          brand_name: business.name,
          phone: business.contact_phone,
          // Needed by the receipt: when the change window has closed we tell
          // the customer to get in touch, and telling someone to get in
          // touch without giving them any way to do it is not help.
          email: business.contact_email,
          dropoff_address: business.dropoff_address,
          timezone: business.timezone,
          cancellation_window_hours: settings?.cancellation_window_hours ?? 0,
        }
        : null,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
