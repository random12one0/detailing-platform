// Tenant resolution — the ONLY approved ways to obtain a business_id.
//
// Public flows:  the browser sends a business slug (part of the public URL);
//                the server resolves it to an id. A client can never pass a
//                business_id directly.
// Admin flows:   the caller's JWT is verified and the business_id is taken
//                from their business_users membership — never from the
//                request body.

import { supabase } from "./db.ts";

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
}

export interface BusinessSettings {
  business_id: string;
  buffer_minutes: number;
  min_advance_minutes: number;
  max_advance_days: number | null;
  slot_interval_minutes: number;
  max_bookings_per_day: number | null;
  mobile_enabled: boolean;
  dropoff_enabled: boolean;
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
  email_owner_new_booking: boolean;
  email_owner_reminder: boolean;
  push_enabled: boolean;
  // Roadmap 2.12 — 'reserve' | 'request'. What a booking through the page
  // MEANS. Both hold the slot; only the promise differs.
  booking_mode: string;
}

// Missing settings row → every default the schema declares. Fetched fresh per
// request (no caching) so a settings edit takes effect immediately.
export async function getSettings(businessId: string): Promise<BusinessSettings> {
  const { data } = await supabase
    .from("business_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  if (data) return data as BusinessSettings;
  return {
    business_id: businessId,
    buffer_minutes: 60,
    min_advance_minutes: 120,
    max_advance_days: null,
    slot_interval_minutes: 30,
    max_bookings_per_day: null,
    mobile_enabled: true,
    dropoff_enabled: true,
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
    evening_before_latest_start: "10:00:00",
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
    google_review_url: null,
    yelp_review_url: null,
    notification_emails: [],
    email_customer_confirmation: true,
    email_customer_reminder: true,
    email_customer_followup: true,
    email_owner_new_booking: true,
    email_owner_reminder: true,
    push_enabled: true,
  };
}

export async function businessBySlug(slug: unknown): Promise<Business | null> {
  if (typeof slug !== "string" || !slug.trim()) return null;
  const { data } = await supabase
    .from("businesses")
    .select("id, slug, name, status, timezone, contact_email, contact_phone, dropoff_address, service_area")
    .eq("slug", slug.trim().toLowerCase())
    .eq("status", "active")
    .maybeSingle();
  return (data as Business) ?? null;
}

export async function businessById(id: string): Promise<Business | null> {
  const { data } = await supabase
    .from("businesses")
    .select("id, slug, name, status, timezone, contact_email, contact_phone, dropoff_address, service_area")
    .eq("id", id)
    .maybeSingle();
  return (data as Business) ?? null;
}

// Verifies the request's JWT and returns the caller's membership in the
// requested business, or null. When businessId is omitted and the user
// belongs to exactly one business, that one is used.
export async function requireMember(
  req: Request,
  businessId?: string | null,
): Promise<{ userId: string; businessId: string; role: string } | null> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data: userData, error } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (error || !user) return null;

  let q = supabase.from("business_users").select("business_id, role").eq("user_id", user.id);
  if (businessId) q = q.eq("business_id", businessId);
  const { data: rows } = await q;
  if (!rows || rows.length === 0) return null;
  if (!businessId && rows.length > 1) return null; // ambiguous — caller must specify
  return { userId: user.id, businessId: rows[0].business_id, role: rows[0].role };
}
