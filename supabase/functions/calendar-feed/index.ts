// ROADMAP 97.53 - the subscribable calendar feed: one private URL per business
// that Google and Apple Calendar can poll, instead of one .ics file per
// booking.
//
//   GET /calendar-feed?business=<slug>&token=<token>  -> VCALENDAR, owner view
//
// THE TOKEN IS THE CREDENTIAL. The slug is public (it is already in the
// booking URL), so it names the business and nothing more; the secret half is
// `business_settings.calendar_feed_token`, random hex the detailer can reset
// from Notifications. A wrong, missing or reset token gets the SAME answer as
// an unknown business, so neither response tells a caller which half they got
// wrong.
//
// THE OWNER-VIEW PROTECTIONS FROM 14.2 HOLD HERE TOO. The feed carries the
// detailer's copy of every job - customer names, phone numbers and notes, the
// exact fields 14.2 put behind the owner's session on booking-ics. There is
// no session on a calendar poll (Google's fetcher cannot log in), so the
// unguessable per-business token stands in for it: no token, no names. The
// booking rows are read service-role and scoped to THIS business only, and
// so are their service lines (ROADMAP 97.12): a line another business
// smuggled onto one of these bookings never reaches the feed.
//
// Only upcoming jobs: ended ones are history a calendar does not need, and
// cancelled or deleted ones must never appear.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { CORS_HEADERS, json, preflight } from "../_shared/http.ts";
import { businessBySlug } from "../_shared/tenant.ts";
import { ipOf, LIMITS, withinLimits } from "../_shared/rateLimit.ts";
import { buildCalendar } from "../_shared/ics.ts";

// Every upcoming job is read, a page at a time (PostgREST caps one response
// at 1000 rows): a cap here would silently drop the latest jobs from the
// detailer's calendar, which looks exactly like a job that was never booked.
const FEED_PAGE = 1000;
// Service lines are fetched by booking id, a slice at a time, so the id list
// stays well inside a URL's length.
const LINES_SLICE = 200;

// A failed read must never become an empty calendar: a subscriber that gets
// a successful empty feed DELETES every job it was showing. 503 + Retry-After
// tells Google and Apple to keep what they have and come back.
const retryLater = () =>
  new Response(JSON.stringify({ error: "try_again" }), {
    status: 503,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", "Retry-After": "300" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  // A subscription is a GET. Anything else is not this endpoint.
  if (req.method !== "GET") return json({ error: "not_found" }, 404);

  try {
    // ROADMAP 14.2 - the blunt ceiling every other public endpoint already
    // has. This one reads and never writes, so the ceiling is all it wants.
    if (!await withinLimits(supabase, [{ ...LIMITS.publicCeiling, bucket: "calendar-feed", key: ipOf(req) }])) {
      return json({ error: "too_many_requests" }, 429);
    }

    const url = new URL(req.url);
    const slug = (url.searchParams.get("business") || "").trim().toLowerCase();
    const token = (url.searchParams.get("token") || "").trim();
    if (!slug || !token) return json({ error: "not_found" }, 404);

    const business = await businessBySlug(slug);
    if (!business) return json({ error: "not_found" }, 404);

    // THE CHECK THE ITEM IS ABOUT. Compared only against this business's own
    // stored token, and a miss answers exactly like an unknown business.
    const { data: settings, error: settingsError } = await supabase
      .from("business_settings")
      .select("calendar_feed_token")
      .eq("business_id", business.id)
      .maybeSingle();
    if (settingsError) return retryLater();
    if (!settings?.calendar_feed_token || settings.calendar_feed_token !== token) {
      return json({ error: "not_found" }, 404);
    }

    // Only this business's jobs, only the ones still ahead, newest first
    // would bury today - soonest first. `id` breaks ties so pages never
    // overlap or skip when two jobs start at the same minute.
    const now = new Date().toISOString();
    // deno-lint-ignore no-explicit-any
    const rows: any[] = [];
    for (let from = 0; ; from += FEED_PAGE) {
      const { data: page, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("business_id", business.id)
        .neq("status", "cancelled")
        .is("deleted_at", null)
        .gte("end_at", now)
        .order("start_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + FEED_PAGE - 1);
      if (error || !page) return retryLater();
      rows.push(...page);
      if (page.length < FEED_PAGE) break;
    }

    // ROADMAP 97.12 - only lines of this business reach the feed.
    const names = new Map<string, string[]>();
    for (let i = 0; i < rows.length; i += LINES_SLICE) {
      const { data: lines, error } = await supabase
        .from("booking_services")
        .select("booking_id, name_at_booking")
        .eq("business_id", business.id)
        .in("booking_id", rows.slice(i, i + LINES_SLICE).map((r) => r.id));
      if (error || !lines) return retryLater();
      for (const l of lines) names.set(l.booking_id, [...(names.get(l.booking_id) ?? []), l.name_at_booking]);
    }

    const events = rows.map((booking) => {
      const serviceNames = names.get(booking.id) ?? [];
      const location = booking.service_type === "mobile" && booking.customer_address
        ? booking.customer_address
        : business.dropoff_address || "";
      const descriptionLines = [
        serviceNames.length ? `Service: ${serviceNames.join(", ")}` : "",
        booking.vehicle_model ? `Vehicle: ${booking.vehicle_model}` : "",
        `Customer: ${booking.customer_name} - ${booking.customer_phone}`,
        booking.customer_notes ? `Notes: ${booking.customer_notes}` : "",
        business.contact_phone ? `Questions? ${business.contact_phone}` : "",
      ].filter(Boolean);
      return {
        uid: `booking-${booking.id}-owner`,
        timezone: business.timezone,
        start: new Date(booking.start_at),
        end: new Date(booking.end_at),
        summary: `${booking.customer_name} - ${serviceNames.join(", ") || "Detail"}`,
        description: descriptionLines.join("\n"),
        location,
        organizerName: business.name,
        organizerEmail: business.contact_email,
      };
    });

    // No upcoming jobs is an empty calendar, not an error: a subscription
    // must survive a quiet week without looking broken in Google's UI.
    const ics = buildCalendar(events);

    return new Response(ics, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    // Same rule as a failed read: never answer an outage with anything a
    // calendar client could take as "no jobs".
    return retryLater();
  }
});
