import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { pacificDateStr, pacificToDate } from "../_shared/timezone.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// FALLBACK weekly hours (0=Sunday … 6=Saturday), used only when the business_hours
// table has no row for a weekday. The AUTHORITATIVE weekly schedule lives in the
// business_hours table (edited in the admin), which this function now reads: a row
// with null open/close means that weekday is CLOSED. A per-date row in
// booking_hours_overrides (open_time/close_time) still supersedes it for one day.
const BUSINESS_HOURS: Record<number, { start: string; end: string } | null> = {
  0: { start: "14:00", end: "18:00" }, // Sunday
  1: { start: "16:00", end: "18:00" }, // Monday
  2: { start: "16:00", end: "18:00" }, // Tuesday
  3: { start: "16:00", end: "18:00" }, // Wednesday
  4: { start: "16:00", end: "18:00" }, // Thursday
  5: { start: "16:00", end: "18:00" }, // Friday
  6: { start: "10:00", end: "18:00" }, // Saturday
};

// Minimum gap kept on EITHER side of each existing booking (travel time).
// MUST match the identical constant in create-booking/index.ts. Deliberately local
// rather than shared — see the note in _shared/pricing.ts for why.
const BUFFER_MINUTES = 60;
const ADVANCE_MS = 2 * 60 * 60 * 1000; // earliest bookable = now + 2h (for "today")

const toMin = (t: string) => {
  const [h, m] = t.substring(0, 5).split(":").map(Number);
  return h * 60 + m;
};
const pad = (n: number) => String(n).padStart(2, "0");
const fromMin = (mins: number) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;

// Weekday (0-6) for a "YYYY-MM-DD" string, timezone-safe (no UTC shift).
const weekdayOf = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};

function generateTimeSlots(
  hours: { start: string; end: string },
  durationMinutes: number,
): string[] {
  const slots: string[] = [];
  const startMinutes = toMin(hours.start);
  // HARD cutoff: a job must FINISH by closing time — no running past close. The
  // latest start is therefore governed by (close - duration), not a fixed cap.
  const closeMinutes = toMin(hours.end);
  for (let t = startMinutes; t + durationMinutes <= closeMinutes; t += 30) {
    slots.push(fromMin(t));
  }
  return slots;
}

// Normalize any "HH:MM" or "HH:MM:SS" (Postgres returns time as HH:MM:SS) to
// "HH:MM" so string comparisons at exact boundaries are correct.
const hm = (t: string) => String(t).slice(0, 5);

// Does [slotStart, slotEnd) overlap [rangeStart, rangeEnd)? Any time format.
const overlaps = (slotStart: string, slotEnd: string, rangeStart: string, rangeEnd: string) =>
  !(hm(slotEnd) <= hm(rangeStart) || hm(slotStart) >= hm(rangeEnd));

interface DayInputs {
  bookings: { start_time: string; end_time: string }[];
  blockouts: { all_day: boolean; start_time: string | null; end_time: string | null }[];
  dropoffs: { start_time: string | null; end_time: string | null }[];
  overrideHours: { start: string; end: string } | null;
  // Resolved weekly hours for this date's weekday (null = closed that day).
  weekdayHours: { start: string; end: string } | null;
}

interface DayResult {
  open: boolean; // business is open at all this day
  slots: string[]; // bookable start times (mobile OR drop-off)
  dropoff_slots: string[]; // subset of slots that are DROP-OFF ONLY
  dropoff_only: boolean; // every returned slot is drop-off only (whole-day period)
  // Effective open/close window to SHOW the customer ("Hours this day: X – Y"),
  // = the set hours trimmed by any block-out that touches an edge. null = closed.
  hours: { open: string; close: string } | null;
}

// The hours window to DISPLAY for a day: the set open/close (override or weekly),
// pulled in by any block-out that touches an edge — an evening block moves the
// close earlier, a morning block moves the open later. Mid-day blocks leave the
// window as-is (they show up as gaps in the slot list instead). Returns null when
// the day is closed or an edge-trim leaves no window at all.
function effectiveHours(
  base: { start: string; end: string },
  blockouts: { all_day: boolean; start_time: string | null; end_time: string | null }[],
): { open: string; close: string } | null {
  let openM = toMin(base.start);
  let closeM = toMin(base.end);
  for (const bl of blockouts) {
    if (bl.all_day) return null; // whole day blocked
    // A one-sided window runs to the matching edge (start-only → to end of day,
    // end-only → from start of day), same as the slot-conflict logic above.
    const bs = bl.start_time ? toMin(bl.start_time) : 0;
    const be = bl.end_time ? toMin(bl.end_time) : 24 * 60;
    if (bs <= openM && be > openM) openM = be; // trims the opening edge
    if (be >= closeM && bs < closeM) closeM = bs; // trims the closing edge
  }
  if (openM >= closeM) return null; // fully blocked after trimming
  return { open: fromMin(openM), close: fromMin(closeM) };
}

function computeDay(dateStr: string, durationMinutes: number, inp: DayInputs): DayResult {
  // A one-off date override wins; otherwise the weekday's weekly hours (which may
  // be null = CLOSED). No hours → the business is closed that day → zero slots.
  const hours = inp.overrideHours ?? inp.weekdayHours;
  if (!hours) return { open: false, slots: [], dropoff_slots: [], dropoff_only: false, hours: null };

  const displayHours = effectiveHours(hours, inp.blockouts);

  // Pacific "today", computed via the timezone-aware helper — the runtime's own
  // clock is UTC, so this is NOT the same as `new Date().toDateString()` for
  // roughly the back half of every business day (see _shared/timezone.ts).
  const isPacificToday = dateStr === pacificDateStr();
  const nowMs = Date.now();
  const [y, mo, d] = dateStr.split("-").map(Number);

  const allSlots = generateTimeSlots(hours, durationMinutes);
  const slots: string[] = [];
  const dropoffSlots: string[] = [];

  for (const slot of allSlots) {
    // 2-hour advance rule when the date is today (Pacific).
    if (isPacificToday) {
      const [slotH, slotM] = slot.split(":").map(Number);
      const slotInstant = pacificToDate(y, mo, d, slotH, slotM);
      if (slotInstant.getTime() - nowMs < ADVANCE_MS) continue;
    }

    const slotStart = slot;
    const slotEnd = fromMin(toMin(slot) + durationMinutes);

    // Existing-booking conflict — a minimum BUFFER_MINUTES gap is required on
    // BOTH sides of every existing booking (not just after it), so a new job
    // can't be scheduled to end right as another one starts, or start right as
    // another one ends.
    const bookingConflict = inp.bookings.some((b) => {
      const bufferedStart = fromMin(Math.max(0, toMin(b.start_time) - BUFFER_MINUTES));
      const bufferedEnd = fromMin(toMin(b.end_time) + BUFFER_MINUTES);
      return overlaps(slotStart, slotEnd, bufferedStart, bufferedEnd);
    });
    if (bookingConflict) continue;

    // Blockout conflict. slotEnd already includes the service duration, so a job
    // that STARTS before a blockout but RUNS INTO it is correctly rejected. A
    // one-sided window (only start_time, e.g. "blocked from 5pm on") is treated
    // as running to end of day; only-end_time as running from the day's start.
    const blockoutConflict = inp.blockouts.some((bl) => {
      if (bl.all_day) return true;
      if (bl.start_time || bl.end_time) {
        return overlaps(slotStart, slotEnd, bl.start_time || "00:00", bl.end_time || "23:59");
      }
      return false;
    });
    if (blockoutConflict) continue;

    // Drop-off-only: a period with no times covers the whole day; a timed period
    // only marks the slots it overlaps.
    const isDropoff = inp.dropoffs.some((p) => {
      if (!p.start_time || !p.end_time) return true;
      return overlaps(slotStart, slotEnd, p.start_time, p.end_time);
    });

    slots.push(slot);
    if (isDropoff) dropoffSlots.push(slot);
  }

  return {
    open: true,
    slots,
    dropoff_slots: dropoffSlots,
    dropoff_only: slots.length > 0 && dropoffSlots.length === slots.length,
    hours: displayHours,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const durationMinutes = Number(body.duration_minutes);

    // Range mode: { start_date, end_date, duration_minutes } → one call covers a
    // whole month so the calendar can grey-out days with zero availability.
    // Single mode: { booking_date, duration_minutes } → the slot list for a day.
    const startDate: string | undefined = body.start_date || body.booking_date;
    const endDate: string | undefined = body.end_date || body.booking_date;

    if (!startDate || !endDate || !durationMinutes) {
      return new Response(
        JSON.stringify({ success: false, error: "duration_minutes and a date (or start_date/end_date) are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Enumerate the requested days (inclusive), capped for safety.
    const days: string[] = [];
    {
      const [sy, sm, sd] = startDate.split("-").map(Number);
      const [ey, em, ed] = endDate.split("-").map(Number);
      const cur = new Date(sy, sm - 1, sd);
      const end = new Date(ey, em - 1, ed);
      let guard = 0;
      while (cur <= end && guard < 62) {
        days.push(`${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`);
        cur.setDate(cur.getDate() + 1);
        guard++;
      }
    }

    // Batch-fetch everything the range needs (plus the weekly business_hours table).
    const [bookingsRes, blockoutsRes, dropoffRes, overridesRes, hoursRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("booking_date, start_time, end_time")
        .gte("booking_date", startDate)
        .lte("booking_date", endDate)
        .neq("status", "cancelled"),
      supabase
        .from("blockout_dates")
        .select("all_day, start_time, end_time, start_date, end_date")
        .lte("start_date", endDate)
        .gte("end_date", startDate),
      supabase
        .from("dropoff_only_periods")
        .select("start_date, end_date, start_time, end_time")
        .lte("start_date", endDate)
        .gte("end_date", startDate),
      supabase
        .from("booking_hours_overrides")
        .select("date, open_time, close_time")
        .gte("date", startDate)
        .lte("date", endDate),
      supabase
        .from("business_hours")
        .select("weekday, open_time, close_time"),
    ]);

    if (bookingsRes.error) throw bookingsRes.error;
    if (blockoutsRes.error) throw blockoutsRes.error;
    if (dropoffRes.error) throw dropoffRes.error;
    if (overridesRes.error) throw overridesRes.error;
    // business_hours is best-effort: if it can't be read, fall back to the constant.

    const bookings = bookingsRes.data ?? [];
    const blockouts = blockoutsRes.data ?? [];
    const dropoffs = dropoffRes.data ?? [];
    const overrides = overridesRes.data ?? [];

    // Build the authoritative weekly schedule from business_hours (0=Sun..6=Sat).
    // A row present with null open/close = CLOSED that weekday. A weekday with no
    // row at all falls back to the BUSINESS_HOURS constant.
    const weeklyHours: Record<number, { start: string; end: string } | null> = {};
    for (const row of hoursRes.data ?? []) {
      const wd = Number((row as any).weekday);
      const open = (row as any).open_time;
      const close = (row as any).close_time;
      weeklyHours[wd] = open && close ? { start: hm(open), end: hm(close) } : null;
    }
    const hoursForWeekday = (wd: number) =>
      Object.prototype.hasOwnProperty.call(weeklyHours, wd) ? weeklyHours[wd] : BUSINESS_HOURS[wd];

    const inRange = (date: string, s: string, e: string) => date >= s && date <= e;

    const dayResults: Record<string, DayResult> = {};
    for (const date of days) {
      const override = overrides.find((o) => o.date === date);
      dayResults[date] = computeDay(date, durationMinutes, {
        bookings: bookings.filter((b) => b.booking_date === date),
        blockouts: blockouts.filter((bl) => inRange(date, bl.start_date, bl.end_date)),
        dropoffs: dropoffs.filter((p) => inRange(date, p.start_date, p.end_date)),
        overrideHours: override ? { start: hm(override.open_time), end: hm(override.close_time) } : null,
        weekdayHours: hoursForWeekday(weekdayOf(date)),
      });
    }

    // Single-date mode keeps the original response shape (plus dropoff_slots).
    if (body.booking_date && !body.start_date && !body.end_date) {
      const r = dayResults[body.booking_date] ?? { slots: [], dropoff_slots: [], dropoff_only: false, hours: null };
      return new Response(
        JSON.stringify({
          success: true,
          slots: r.slots,
          dropoff_slots: r.dropoff_slots,
          dropoff_only: r.dropoff_only,
          hours: r.hours,
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Range mode: per-day availability for greying-out the calendar.
    return new Response(
      JSON.stringify({ success: true, days: dayResults }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
