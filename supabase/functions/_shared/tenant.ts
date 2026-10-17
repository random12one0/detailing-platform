// Tenant resolution — the ONLY approved ways to obtain a business_id.
//
// Public flows:  the browser sends a business slug (part of the public URL);
//                the server resolves it to an id. A client can never pass a
//                business_id directly.
// Admin flows:   the caller's JWT is verified and the business_id is taken
//                from their business_users membership — never from the
//                request body.

import { supabase } from "./db.ts";
import { readFailed, retryRead } from "./retryRead.ts";
import { isSupportSession } from "./supportSession.ts";

export interface Business {
  id: string;
  slug: string;
  name: string;
  status: string;
  timezone: string;
  contact_email: string | null;
  contact_phone: string | null;
  dropoff_address: string | null;
  service_area: string | null;
  // ROADMAP 2.19. The postal address a marketing email is legally required to
  // carry, and deliberately NOT `dropoff_address` — a mobile detailer has no
  // unit, and this may be a PO box.
  mailing_address: string | null;
  // ROADMAP 8.13 — the day the detailer is back, in their own timezone, or
  // null. NOT `status`: that column is billing's suspension, and one column
  // with two meanings would let a detailer switch their own page back on while
  // their subscription was unpaid.
  closed_until?: string | null;
  closed_note?: string | null;
}

export interface BusinessSettings {
  business_id: string;
  buffer_minutes: number;
  min_advance_minutes: number;
  max_advance_days: number | null;
  slot_interval_minutes: number;
  max_bookings_per_day: number | null;
  // Nullable since roadmap 8.4: null means nobody has been asked, and the
  // whole booking engine already refuses on that — slotValidation turns down
  // every service type and available-slots returns no slots.
  mobile_enabled: boolean | null;
  dropoff_enabled: boolean | null;
  travel_radius_miles: number | null;
  travel_fee: number | null;
  ask_water_electric: boolean;
  // W22 — 'not_needed' | 'ask' | 'required'. The old single boolean is kept
  // beside them: every deployed function and every existing row still reads
  // it, and this schema is append-only.
  water_requirement: string;
  power_requirement: string;
  ask_vehicle_condition: boolean;
  // W9 — the detailer's own ordered list of [{key,label,examples}].
  vehicle_sizes: { key: string; label: string; examples?: string }[];
  // Roadmap 2.8c — the detailer's own price rules and travel areas.
  // deno-lint-ignore no-explicit-any
  price_rules: any[];
  travel_zones: { key: string; name: string; fee: number }[];
  customer_reminder_lead_minutes: number;
  // Roadmap 2.18 — the SECOND customer reminder. Off by default; two is the
  // trade's ceiling rather than its floor (Jobber caps there, nobody offers
  // three), and a third costs deliverability for the receipt.
  customer_reminder_2_enabled: boolean;
  customer_reminder_2_lead_minutes: number;
  // Roadmap 2.18 — the detailer's own paragraph per email kind, keyed by
  // template name. The design and the money are not editable; this is.
  email_messages: Record<string, string | null>;
  evening_before_enabled: boolean;
  evening_before_latest_start: string;
  evening_before_send_time: string;
  owner_nudge_lead_minutes: number;
  wrapup_nudge_lead_minutes: number;
  finalize_nudge_delay_minutes: number;
  daily_digest_hour: number;
  cancellation_window_hours: number;
  price_rounding_nearest: number;
  site_discount_active: boolean;
  site_discount_percent: number;
  site_discount_label: string | null;
  google_review_url: string | null;
  yelp_review_url: string | null;
  notification_emails: string[];
  email_customer_confirmation: boolean;
  email_customer_reminder: boolean;
  email_customer_followup: boolean;
  // ROADMAP 99.2d — sign customer emails as the business, not the owner's first
  // name. Optional: absent until its migration is applied, and absent means false.
  email_sign_as_business?: boolean;
  // ROADMAP 3.4 finding A — the "maintenance due" email, which SELLS a service
  // the customer has not bought. Its own switch, deliberately NOT folded into
  // `email_customer_reminder`, and the only email switch on this table that
  // defaults off. See the migration for Andrew's ruling and why it is here.
  email_customer_maintenance_due: boolean;
  email_owner_new_booking: boolean;
  email_owner_reminder: boolean;
  push_enabled: boolean;
  // Roadmap 2.12 — 'reserve' | 'request'. What a booking through the page
  // MEANS. Both hold the slot; only the promise differs.
  booking_mode: string;
  // Roadmap 2.20 stage 1 — the detailer's own ways to be paid, printed on the
  // confirmation, the reminders and the UNPAID invoice. `_shared/payments.ts`
  // is the only place that decides what these render as and what links.
  pay_cash: boolean;
  pay_venmo: string | null;
  pay_cashapp: string | null;
  pay_zelle: string | null;
  pay_paypal: string | null;
  pay_other: string | null;
  /** His review 2026-09-11 — the detailer's own ways to be paid. See the
   *  migration for why it is a jsonb array rather than a table. */
  pay_custom: { label?: string | null; handle?: string | null }[] | null;
}

// Missing settings row → every default the schema declares. Fetched fresh per
// request (no caching) so a settings edit takes effect immediately.
//
// **AND THE SCHEMA STOPPED DECLARING TWO OF THEM — roadmap 8.4.**
// `mobile_enabled` and `dropoff_enabled` were `not null default true` and are
// now nullable with no default, so this fallback has to say null as well. It
// said `true` for both, which meant a business with NO SETTINGS ROW AT ALL —
// the one case this branch exists for — would have been treated as offering
// everything, which is the assumption the migration removed, surviving in the
// one place nobody would look for it. Null here also makes the fallback agree
// with what an inserted row now holds.
//
// **AND IT THROWS WHEN THE READ FAILED, RATHER THAN RETURNING THE DEFAULTS —
// 2026-09-13, and this is the fix for an empty calendar a customer could not
// book from.** The line below used to read `const { data } = await …`, with the
// error destructured away. ~1.1% of this project's PostgREST calls answer 504
// (`FOUND.md` § THE "GATEWAY TIMEOUT" IS OUR OWN CATCH BLOCK), and when this
// was one of them `data` came back null, this function could not tell that from
// a business with no settings row, and it returned the defaults.
//
// **THE DEFAULTS ARE THE RIGHT ANSWER TO THE WRONG QUESTION.** They say
// `mobile_enabled: null` and `dropoff_enabled: null`, because a business nobody
// has set up offers neither — and in `available-slots` that makes
// `isDropoff && isMobile` true for every slot in the grid, which skips every
// one. The endpoint then answers 200, `success: true`, a full month of open
// days and **zero bookable times**, which is indistinguishable from a fully
// booked detailer. Andrew hit it live on `demo-detail`: three month requests in
// a row with nothing selectable, then the same request fine minutes later.
//
// So: a row → the row. No row and no error → the defaults, which is what this
// fallback was always for. **An error → throw**, and the caller says so.
export async function getSettings(businessId: string): Promise<BusinessSettings> {
  const { data, error } = await retryRead("getSettings", () =>
    supabase
      .from("business_settings")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle());
  if (error) throw readFailed("business_settings", error);
  if (data) return data as BusinessSettings;
  return {
    business_id: businessId,
    buffer_minutes: 60,
    min_advance_minutes: 120,
    max_advance_days: null,
    slot_interval_minutes: 30,
    max_bookings_per_day: null,
    mobile_enabled: null,
    dropoff_enabled: null,
    travel_radius_miles: null,
    travel_fee: null,
    ask_water_electric: true,
    water_requirement: "ask",
    power_requirement: "ask",
    ask_vehicle_condition: true,
    vehicle_sizes: [
      { key: "small", label: "Small", examples: "Coupe, sedan, hatchback" },
      { key: "medium", label: "Medium", examples: "Small SUV, crossover, wagon" },
      { key: "large", label: "Large", examples: "Truck, large SUV, van" },
    ],
    price_rules: [],
    travel_zones: [],
    customer_reminder_lead_minutes: 120,
    evening_before_enabled: true,
    evening_before_latest_start: "12:00:00",
    evening_before_send_time: "19:00:00",
    owner_nudge_lead_minutes: 30,
    wrapup_nudge_lead_minutes: 20,
    finalize_nudge_delay_minutes: 120,
    daily_digest_hour: 7,
    // The schema's own default, and it has to stay 'reserve' here too: a
    // business with no settings row must not silently start telling
    // customers their booking is only a request.
    booking_mode: "reserve",
    cancellation_window_hours: 24,
    price_rounding_nearest: 5,
    site_discount_active: false,
    site_discount_percent: 0,
    site_discount_label: null,
    // A business with no settings row accepts nothing in particular, so the
    // emails print no payment block at all — the same shape as every other
    // default here, and the state every existing tenant is in on the day this
    // migration lands.
    pay_cash: false,
    pay_venmo: null,
    pay_cashapp: null,
    pay_zelle: null,
    pay_paypal: null,
    pay_other: null,
    // AN EMPTY ARRAY, NOT NULL — the column is `not null default '[]'`, so a
    // business with no settings row at all should read the same as one that
    // has never added a custom method. A fallback that disagrees with the
    // schema is a second definition of "no methods".
    pay_custom: [],
    google_review_url: null,
    yelp_review_url: null,
    notification_emails: [],
    email_customer_confirmation: true,
    email_customer_reminder: true,
    email_customer_followup: true,
    email_sign_as_business: false,
    // ROADMAP 3.4 finding A — FALSE, and it is the only one here that is.
    // **This fallback matters more than the column default.** It is what
    // answers when `business_settings` has no row at all for a business, and
    // a fallback that said `true` would send the sales email to exactly the
    // tenants whose settings were never written — the ones nobody has looked
    // at. A default that disagrees with the schema is a second definition of
    // the rule; this one agrees with it.
    email_customer_maintenance_due: false,
    email_owner_new_booking: true,
    email_owner_reminder: true,
    push_enabled: true,
  };
}

// ROADMAP 8.13 — BOTH SELECTS CARRY `closed_until` NOW, and the list is what
// every public endpoint sees. `available-slots` reads it to close the days
// before a detailer is back; `status` is untouched, because that column is
// billing's suspension and one column with two meanings would let a detailer
// reopen a page the platform had darkened for non-payment.
//
// **NULL MEANS THERE IS NO SUCH BUSINESS. IT MUST NOT ALSO MEAN WE COULD NOT
// FIND OUT — 2026-09-13.** Both of these swallowed their error too, and every
// public endpoint turns a null into `404 unknown_business`. A 504 on this one
// read therefore told a customer that the detailer whose page they were
// standing on does not exist. **A 503 saying "try again" is true; a 404 is a
// lie**, and it is the lie that makes people give up rather than reload.
export async function businessBySlug(slug: unknown): Promise<Business | null> {
  if (typeof slug !== "string" || !slug.trim()) return null;
  const { data, error } = await retryRead("businessBySlug", () =>
    supabase
      .from("businesses")
      .select("id, slug, name, status, timezone, contact_email, contact_phone, dropoff_address, service_area, mailing_address, closed_until, closed_note")
      .eq("slug", (slug as string).trim().toLowerCase())
      .eq("status", "active")
      .maybeSingle());
  if (error) throw readFailed("businesses", error);
  return (data as Business) ?? null;
}

export async function businessById(id: string): Promise<Business | null> {
  const { data, error } = await retryRead("businessById", () =>
    supabase
      .from("businesses")
      .select("id, slug, name, status, timezone, contact_email, contact_phone, dropoff_address, service_area, mailing_address, closed_until, closed_note")
      .eq("id", id)
      .maybeSingle());
  if (error) throw readFailed("businesses", error);
  return (data as Business) ?? null;
}

// The closed permission vocabulary, mirroring the check constraint in
// 20260904000000_custom_roles.sql. An unknown string is rejected rather than
// stored, because a permission nothing recognises grants nothing and looks
// exactly like one that was never ticked.
export const PERMISSIONS = ["money", "marketing", "settings", "requests"] as const;
export type Permission = (typeof PERMISSIONS)[number];

export function cleanPermissions(input: unknown): Permission[] {
  if (!Array.isArray(input)) return [];
  const set = new Set(input.map((p) => String(p)));
  return PERMISSIONS.filter((p) => set.has(p));
}

/** ROADMAP 4.3c. Call only with a token getUser has already verified. */
export const supportSession = (token: string) =>
  isSupportSession(token, (sid) => supabase.from("support_sessions").select("session_id").eq("session_id", sid).maybeSingle());

export type Member = { userId: string; businessId: string; role: string; permissions: string[] };

// An owner has everything, always — the same fold `has_business_permission()`
// does in SQL, so a caller can never write a check that forgets owners.
export function can(member: Member, permission: Permission): boolean {
  return member.role === "owner" || member.permissions.includes(permission);
}

// Verifies the request's JWT and returns the caller's membership in the
// requested business, or null. When businessId is omitted and the user
// belongs to exactly one business, that one is used.
//
// ROADMAP 4.3c: A READ-ONLY SUPPORT SESSION GETS NULL, unless the caller passes
// `{ allowSupport: true }`. Null is every caller's existing refusal, so all of
// them fail closed without being edited; only functions that change none of
// the business's records opt in. Where null means "treat as the public"
// (create-booking, track-visit), a support session reaches exactly as far as
// anyone on the internet and no further.
export async function requireMember(
  req: Request,
  businessId?: string | null,
  opts: { allowSupport?: boolean } = {},
): Promise<Member | null> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data: userData, error } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (error || !user) return null;
  if (!opts.allowSupport && await supportSession(token)) {
    console.warn("requireMember: refused a read-only support session");
    return null;
  }

  let q = supabase.from("business_users").select("business_id, role, permissions").eq("user_id", user.id);
  if (businessId) q = q.eq("business_id", businessId);
  const { data: rows } = await q;
  if (!rows || rows.length === 0) return null;
  if (!businessId && rows.length > 1) return null; // ambiguous — caller must specify
  return {
    userId: user.id,
    businessId: rows[0].business_id,
    role: rows[0].role,
    permissions: rows[0].permissions ?? [],
  };
}

// ROADMAP 97.12 (S-M2) — A BOOKING'S OWN LINES, AND NOBODY ELSE'S.
// `booking_services` and `booking_add_ons` used to point at a booking by id
// alone, so another business could insert a row carrying ITS business_id and
// THIS booking's id, and a service-role embed would print it on this booking's
// receipt or email. `20261017000000_booking_lines_same_business.sql` makes the
// database refuse such a row; this drops any that got in before it ran, or
// while it has not. Every embed passed through here selects `business_id`, and
// the column is removed again so no reply's shape changes.
// `tests/booking-lines-own-business.test.mjs` holds every caller to it.
// deno-lint-ignore no-explicit-any
export function ownLines<T extends Record<string, any>>(booking: T): T {
  // deno-lint-ignore no-explicit-any
  const keep = (rows: any) => Array.isArray(rows)
    // deno-lint-ignore no-explicit-any
    ? rows.filter((r: any) => r?.business_id === booking.business_id).map(({ business_id: _b, ...r }: any) => r)
    : rows;
  const out: Record<string, unknown> = { ...booking };
  for (const k of ["services", "add_ons"]) if (k in booking) out[k] = keep(booking[k]);
  return out as T;
}
