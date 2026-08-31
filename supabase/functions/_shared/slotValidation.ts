// The AUTHORITATIVE slot gate — the server-side re-check that runs at
// submit time (create-booking and reschedule-booking). available-slots has
// its own independent computation of what to DISPLAY; the two are kept
// deliberately separate (the old system's double-validation pattern), so a
// stale or bypassed client can never book something the rules forbid.
//
// Every rule reads business_settings; nothing is hardcoded. And even if all
// of this were bypassed, the bookings_no_overlap exclusion constraint in
// Postgres still makes an overlapping insert impossible.

import { supabase } from "./db.ts";
import type { Business, BusinessSettings } from "./tenant.ts";
import { dateStrIn, localDateTimeToInstant, timeStrIn, weekdayOf } from "./tz.ts";

const hm = (t: string) => String(t).slice(0, 5);
const toMin = (t: string) => {
  const [h, m] = hm(t).split(":").map(Number);
  return h * 60 + m;
};
const pad = (n: number) => String(n).padStart(2, "0");
const fromMin = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const overlaps = (aS: string, aE: string, bS: string, bE: string) => !(hm(aE) <= hm(bS) || hm(aS) >= hm(bE));

export interface SlotCheck {
  ok: boolean;
  status?: number;   // HTTP status to return when !ok
  error?: string;    // customer-facing message when !ok
  startAt?: Date;    // resolved absolute instants when ok
  endAt?: Date;
}

// Validates a proposed [date, start, start+duration) in business-local time
// against: blockouts, weekly hours/overrides, minimum advance notice,
// maximum advance window, per-day booking cap, service-type availability,
// and the buffered-conflict rule. excludeBookingId lets reschedule ignore
// the booking being moved.
export async function validateSlot(opts: {
  business: Business;
  settings: BusinessSettings;
  bookingDate: string;   // "YYYY-MM-DD" business-local
  startTime: string;     // "HH:MM" business-local
  durationMinutes: number;
  serviceType: string;   // "mobile" | "dropoff"
  excludeBookingId?: string;
}): Promise<SlotCheck> {
  const { business, settings, bookingDate, startTime, durationMinutes, serviceType, excludeBookingId } = opts;
  const tz = business.timezone;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) || !/^\d{2}:\d{2}(:\d{2})?$/.test(startTime)) {
    return { ok: false, status: 400, error: "Invalid date or time format." };
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return { ok: false, status: 400, error: "Invalid duration." };
  }

  if (serviceType === "mobile" && !settings.mobile_enabled) {
    return { ok: false, status: 409, error: "Mobile service is not available. Please choose drop-off." };
  }
  if (serviceType === "dropoff" && !settings.dropoff_enabled) {
    return { ok: false, status: 409, error: "Drop-off is not available. Please choose mobile service." };
  }

  const jobStart = hm(startTime);
  const jobEnd = fromMin(toMin(startTime) + durationMinutes);
  const startAt = localDateTimeToInstant(tz, bookingDate, jobStart);
  const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);

  // Minimum advance notice — generalized from the old same-day-only rule:
  // a slot closer than min_advance_minutes from now is too soon, whatever
  // day it falls on.
  if (startAt.getTime() - Date.now() < settings.min_advance_minutes * 60_000) {
    const hours = Math.round((settings.min_advance_minutes / 60) * 10) / 10;
    return {
      ok: false,
      status: 409,
      error: `That time is too soon — bookings need at least ${hours} hours' notice. Please choose a later time.`,
    };
  }

  // Maximum advance window (didn't exist in the old system; NULL = unbounded).
  if (settings.max_advance_days !== null && settings.max_advance_days !== undefined) {
    const todayLocal = dateStrIn(tz);
    const [ty, tm, td] = todayLocal.split("-").map(Number);
    const horizon = new Date(ty, tm - 1, td + settings.max_advance_days);
    const horizonStr = `${horizon.getFullYear()}-${pad(horizon.getMonth() + 1)}-${pad(horizon.getDate())}`;
    if (bookingDate > horizonStr) {
      return {
        ok: false,
        status: 409,
        error: `Bookings can only be made up to ${settings.max_advance_days} days in advance.`,
      };
    }
  }

  // Blockout guard — an all-day block rejects the whole day; a timed block
  // rejects when the job's [start, end) overlaps it. A one-sided window runs
  // to the matching edge of the day.
  const { data: blocks } = await supabase
    .from("blockout_dates")
    .select("all_day, start_time, end_time")
    .eq("business_id", business.id)
    .lte("start_date", bookingDate)
    .gte("end_date", bookingDate);
  const blocked = (blocks || []).some((bl) => {
    if (bl.all_day) return true;
    if (bl.start_time || bl.end_time) {
      return overlaps(jobStart, jobEnd, bl.start_time || "00:00", bl.end_time || "23:59");
    }
    return false;
  });
  if (blocked) {
    return {
      ok: false,
      status: 409,
      error: "That date and time is not available for booking. Please choose another day or time.",
    };
  }

  // PER-DAY SERVICE-TYPE GUARD. Roadmap 2.7, W4 — and it was a live hole, not
  // a new feature: `dropoff_only_periods` reached the customer as a NOTE on
  // the booking page ("This day is drop-off only") and nothing more. Nothing
  // on the way in ever read the table, so the customer could read the note and
  // book a mobile job anyway, and the detailer found out on the day.
  //
  // It goes here rather than in create-booking because reschedule-booking and
  // update-booking move a booking's date with the same freedom and had the
  // same hole. One guard where all three meet.
  const { data: periods } = await supabase
    .from("dropoff_only_periods")
    .select("start_time, end_time, mode")
    .eq("business_id", business.id)
    .lte("start_date", bookingDate)
    .or(`end_date.is.null,end_date.gte.${bookingDate}`);
  const restricts = (mode: string) =>
    (periods || []).some((p) => (p.mode ?? "dropoff") === mode
      && (!p.start_time || !p.end_time || overlaps(jobStart, jobEnd, p.start_time, p.end_time)));
  if (serviceType === "mobile" && restricts("dropoff")) {
    return {
      ok: false,
      status: 409,
      error: "That day is drop-off only — we can't come to you. Please choose drop-off, or another day.",
    };
  }
  if (serviceType === "dropoff" && restricts("mobile")) {
    return {
      ok: false,
      status: 409,
      error: "That day is mobile only — we come to you rather than taking drop-offs. Please choose mobile, or another day.",
    };
  }

  // Hours guard — per-date override wins over the weekly schedule; a row with
  // null open/close means CLOSED. A job must start at/after open and FINISH
  // by close.
  const { data: dayOverride } = await supabase
    .from("booking_hours_overrides")
    .select("open_time, close_time")
    .eq("business_id", business.id)
    .eq("date", bookingDate)
    .maybeSingle();

  let openTime: string | null = null;
  let closeTime: string | null = null;
  if (dayOverride) {
    if (!dayOverride.open_time || !dayOverride.close_time) {
      return { ok: false, status: 409, error: "We're closed that day. Please choose another day." };
    }
    openTime = hm(dayOverride.open_time);
    closeTime = hm(dayOverride.close_time);
  } else {
    const { data: wh } = await supabase
      .from("business_hours")
      .select("open_time, close_time")
      .eq("business_id", business.id)
      .eq("weekday", weekdayOf(bookingDate))
      .maybeSingle();
    if (!wh || !wh.open_time || !wh.close_time) {
      // No weekly row, or explicitly closed → closed. (The old system fell
      // back to hardcoded default hours; a multi-tenant platform can't guess
      // another business's hours, so no hours = closed.)
      return { ok: false, status: 409, error: "We're closed that day. Please choose another day." };
    }
    openTime = hm(wh.open_time);
    closeTime = hm(wh.close_time);
  }
  if (jobStart < openTime) {
    return { ok: false, status: 409, error: `We open at ${openTime} that day. Please choose a later time.` };
  }
  if (jobEnd > closeTime) {
    return {
      ok: false,
      status: 409,
      error: `That service would run until ${jobEnd}, past our ${closeTime} close that day. Please choose an earlier time or a shorter service.`,
    };
  }

  // Same-local-day bookings (for the buffer rule and the per-day cap). The
  // window is padded a day each side, then bucketed by local date, so a
  // booking near midnight can't slip between timezone cracks.
  const dayStartUtc = localDateTimeToInstant(tz, bookingDate, "00:00");
  const windowStart = new Date(dayStartUtc.getTime() - 36 * 3600_000).toISOString();
  const windowEnd = new Date(dayStartUtc.getTime() + 60 * 3600_000).toISOString();
  let q = supabase
    .from("bookings")
    .select("id, start_at, end_at")
    .eq("business_id", business.id)
    .neq("status", "cancelled")
    .is("deleted_at", null)
    .gte("start_at", windowStart)
    .lte("start_at", windowEnd);
  if (excludeBookingId) q = q.neq("id", excludeBookingId);
  const { data: nearby } = await q;
  const sameDay = (nearby || []).filter((b) => dateStrIn(tz, new Date(b.start_at)) === bookingDate);

  if (
    settings.max_bookings_per_day !== null &&
    settings.max_bookings_per_day !== undefined &&
    sameDay.length >= settings.max_bookings_per_day
  ) {
    return { ok: false, status: 409, error: "That day is fully booked. Please choose another day." };
  }

  // Buffered-conflict guard — a minimum buffer_minutes gap on BOTH sides of
  // every existing booking. CLOSED bounds (touching counts) to match both
  // available-slots' display rule and the DB exclusion constraint.
  const bufMs = settings.buffer_minutes * 60_000;
  const conflict = sameDay.some((b) => {
    const bStart = new Date(b.start_at).getTime() - bufMs;
    const bEnd = new Date(b.end_at).getTime() + bufMs;
    return startAt.getTime() <= bEnd && bStart <= endAt.getTime();
  });
  if (conflict) {
    return {
      ok: false,
      status: 409,
      error: "That time is too close to another booking — please choose a different time.",
    };
  }

  return { ok: true, startAt, endAt };
}

export const localTimes = { hm, toMin, fromMin, overlaps, timeStrIn };
