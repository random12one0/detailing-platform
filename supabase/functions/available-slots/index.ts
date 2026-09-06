// What slots to SHOW for one business. This is the display half of the
// double-validation pattern: create-booking independently re-checks every
// rule at submit time, and the DB exclusion constraint backstops both.
//
// Input (POST JSON):
//   { business_slug, duration_minutes, booking_date }            — one day
//   { business_slug, duration_minutes, start_date, end_date }    — a range
//   + service_ids[]  (optional) — roadmap 2.8c. Two rules now live ON a
//     service rather than on the business: which weekdays it is offered, and
//     whether it can be done at the customer's address at all. Passing the
//     chosen services lets this endpoint grey out exactly what the submit-time
//     gate would refuse. Computed here INDEPENDENTLY of
//     _shared/slotValidation.ts, which is the double-validation pattern this
//     file's header describes — the two agree because the rules are the same,
//     not because they share code.
//
// All rules come from the business's own settings row: slot interval,
// buffer, minimum/maximum advance, per-day cap. All local-time math uses the
// business's own timezone.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { CORS_HEADERS, json, preflight } from "../_shared/http.ts";
import { businessBySlug, getSettings } from "../_shared/tenant.ts";
import { dateStrIn, localDateTimeToInstant, weekdayOf } from "../_shared/tz.ts";

const hm = (t: string) => String(t).slice(0, 5);
const toMin = (t: string) => {
  const [h, m] = hm(t).split(":").map(Number);
  return h * 60 + m;
};
const pad = (n: number) => String(n).padStart(2, "0");
const fromMin = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const overlaps = (aS: string, aE: string, bS: string, bE: string) => !(hm(aE) <= hm(bS) || hm(aS) >= hm(bE));

interface DayResult {
  open: boolean;
  slots: string[];
  dropoff_slots: string[];
  dropoff_only: boolean;
  // Roadmap 2.7, W4. A restricted period used to be able to say one thing —
  // "drop-offs only" — because that is the shape the owner's own business
  // needed. A detailer whose unit is shut for the day needs the opposite, so
  // `dropoff_only_periods.mode` now carries which way it goes, and this is
  // the mirror of the two fields above it. Both lists stay because a period
  // may cover only part of a day; the flags are the whole-day case, which is
  // the only one the dashboard can currently create.
  mobile_slots: string[];
  mobile_only: boolean;
  hours: { open: string; close: string } | null;
}

// The hours window to DISPLAY: the set open/close, pulled in by any blockout
// touching an edge (ported unchanged from the reference implementation).
function effectiveHours(
  base: { start: string; end: string },
  blockouts: { all_day: boolean; start_time: string | null; end_time: string | null }[],
): { open: string; close: string } | null {
  let openM = toMin(base.start);
  let closeM = toMin(base.end);
  for (const bl of blockouts) {
    if (bl.all_day) return null;
    const bs = bl.start_time ? toMin(bl.start_time) : 0;
    const be = bl.end_time ? toMin(bl.end_time) : 24 * 60;
    if (bs <= openM && be > openM) openM = be;
    if (be >= closeM && bs < closeM) closeM = bs;
  }
  if (openM >= closeM) return null;
  return { open: fromMin(openM), close: fromMin(closeM) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json();
    const business = await businessBySlug(body.business_slug);
    if (!business) return json({ success: false, error: "unknown_business" }, 404);
    const settings = await getSettings(business.id);
    const tz = business.timezone;

    const durationMinutes = Number(body.duration_minutes);
    // Roadmap 2.8c. Absent or empty = no service-level narrowing, which is
    // every caller that existed before this.
    const serviceIds: string[] = Array.isArray(body.service_ids) ? body.service_ids : [];
    let svcWeekdays: number[] | null = null;   // null = every day
    let svcAllowsMobile = true;
    let svcAllowsDropoff = true;
    if (serviceIds.length) {
      const { data: svcs } = await supabase
        .from("services")
        .select("allows_mobile, allows_dropoff, available_weekdays")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .in("id", serviceIds);
      for (const sv of svcs ?? []) {
        if (sv.allows_mobile === false) svcAllowsMobile = false;
        if (sv.allows_dropoff === false) svcAllowsDropoff = false;
        // A booking has to satisfy EVERY chosen service, so the offered days
        // are the intersection. Two services with no day in common leave an
        // empty list, which correctly closes the whole calendar rather than
        // offering a day that would be refused at submit.
        const d = sv.available_weekdays;
        if (Array.isArray(d) && d.length) {
          const set = d.map(Number);
          svcWeekdays = svcWeekdays === null ? set : svcWeekdays.filter((x) => set.includes(x));
        }
      }
    }
    const startDate: string | undefined = body.start_date || body.booking_date;
    const endDate: string | undefined = body.end_date || body.booking_date;
    if (!startDate || !endDate || !durationMinutes) {
      return json({ success: false, error: "duration_minutes and a date (or start_date/end_date) are required" }, 400);
    }

    // Enumerate requested days (inclusive), capped for safety.
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

    // Batch-fetch everything for the range, scoped to this business. Bookings
    // are stored as absolute instants; pad the window a day each side and
    // bucket by business-local date.
    const rangeStartUtc = new Date(localDateTimeToInstant(tz, days[0], "00:00").getTime() - 36 * 3600_000);
    const rangeEndUtc = new Date(localDateTimeToInstant(tz, days[days.length - 1], "00:00").getTime() + 60 * 3600_000);

    // ITEM F — A BOOKING BEING MOVED MUST NOT BLOCK ITS OWN MOVE.
    //
    // Without this, a customer trying to shift an hour later is refused by
    // their own booking: this counts it as occupied exactly like any other,
    // so if the day's only remaining room IS that slot, the day has zero free
    // slots **for its own occupant** and drops out of its own reschedule
    // picker. They can still move to another DAY, so nothing looks broken —
    // they simply cannot do the most obvious thing.
    //
    // IT WENT UNSEEN FOR MONTHS BECAUSE IT IS DATE- AND OCCUPANCY-DEPENDENT:
    // it only bites when the booked service is long enough to swallow what is
    // left of that day. `e2e-booking` failed on it on 2026-09-05 and passed
    // on the same code the day before.
    //
    // THE PARAMETER IS A UUID OR IT IS IGNORED. It is a public endpoint, and
    // the worst a wrong id can do is hide one booking from an availability
    // count — it cannot reveal anything, because this returns times and never
    // rows. **The slot is still validated server-side on the way in**
    // (`validateSlot`, and the exclusion constraint underneath it), so a
    // client that excluded somebody else's booking would be offered a time
    // the reschedule then refuses.
    const excludeId = typeof body.exclude_booking_id === "string"
        && /^[0-9a-f-]{36}$/i.test(body.exclude_booking_id)
      ? body.exclude_booking_id
      : null;

    const [bookingsRes, blockoutsRes, dropoffRes, overridesRes, hoursRes] = await Promise.all([
      (() => {
        let q = supabase
          .from("bookings")
          .select("start_at, end_at")
          .eq("business_id", business.id)
          .neq("status", "cancelled")
          .is("deleted_at", null)
          .gte("start_at", rangeStartUtc.toISOString())
          .lte("start_at", rangeEndUtc.toISOString());
        if (excludeId) q = q.neq("id", excludeId);
        return q;
      })(),
      supabase
        .from("blockout_dates")
        .select("all_day, start_time, end_time, start_date, end_date")
        .eq("business_id", business.id)
        .lte("start_date", endDate)
        .gte("end_date", startDate),
      supabase
        .from("dropoff_only_periods")
        .select("start_date, end_date, start_time, end_time, mode")
        .eq("business_id", business.id)
        .lte("start_date", endDate)
        .gte("end_date", startDate),
      supabase
        .from("booking_hours_overrides")
        .select("date, open_time, close_time")
        .eq("business_id", business.id)
        .gte("date", startDate)
        .lte("date", endDate),
      supabase
        .from("business_hours")
        .select("weekday, open_time, close_time")
        .eq("business_id", business.id),
    ]);
    for (const r of [bookingsRes, blockoutsRes, dropoffRes, overridesRes, hoursRes]) {
      if (r.error) throw r.error;
    }

    // Bucket bookings by business-local date, as local "HH:MM" windows.
    const bookingsByDay: Record<string, { start: string; end: string }[]> = {};
    for (const b of bookingsRes.data ?? []) {
      const start = new Date(b.start_at);
      const end = new Date(b.end_at);
      const day = dateStrIn(tz, start);
      (bookingsByDay[day] ??= []).push({
        start: timeIn(tz, start),
        end: timeIn(tz, end),
      });
    }

    // Weekly schedule: a row with null open/close = CLOSED; a weekday with no
    // row at all = CLOSED (no per-tenant fallback constants on a platform).
    const weeklyHours: Record<number, { start: string; end: string } | null> = {};
    for (const row of hoursRes.data ?? []) {
      weeklyHours[Number(row.weekday)] =
        row.open_time && row.close_time ? { start: hm(row.open_time), end: hm(row.close_time) } : null;
    }

    const todayLocal = dateStrIn(tz);
    const maxDateStr = (() => {
      if (settings.max_advance_days === null || settings.max_advance_days === undefined) return null;
      const [ty, tm, td] = todayLocal.split("-").map(Number);
      const h = new Date(ty, tm - 1, td + settings.max_advance_days);
      return `${h.getFullYear()}-${pad(h.getMonth() + 1)}-${pad(h.getDate())}`;
    })();

    const inRange = (date: string, s: string, e: string | null) => date >= s && (e === null || date <= e);
    const nowMs = Date.now();
    const advanceMs = settings.min_advance_minutes * 60_000;
    const buffer = settings.buffer_minutes;

    const dayResults: Record<string, DayResult> = {};
    for (const date of days) {
      const closed: DayResult = {
        open: false, slots: [], dropoff_slots: [], dropoff_only: false,
        mobile_slots: [], mobile_only: false, hours: null,
      };

      if (date < todayLocal || (maxDateStr && date > maxDateStr)) {
        dayResults[date] = closed;
        continue;
      }

      // A weekday none of the chosen services is offered on is CLOSED, and it
      // reads as closed rather than as empty — same as a day the business does
      // not open, which is what it is for this selection.
      if (svcWeekdays !== null && !svcWeekdays.includes(weekdayOf(date))) {
        dayResults[date] = closed;
        continue;
      }

      const override = (overridesRes.data ?? []).find((o) => o.date === date);
      const hours = override
        ? override.open_time && override.close_time
          ? { start: hm(override.open_time), end: hm(override.close_time) }
          : null
        : weeklyHours[weekdayOf(date)] ?? null;
      if (!hours) {
        dayResults[date] = closed;
        continue;
      }

      const dayBookings = bookingsByDay[date] ?? [];
      if (
        settings.max_bookings_per_day !== null &&
        settings.max_bookings_per_day !== undefined &&
        dayBookings.length >= settings.max_bookings_per_day
      ) {
        dayResults[date] = closed;
        continue;
      }

      const blockouts = (blockoutsRes.data ?? []).filter((bl) => inRange(date, bl.start_date, bl.end_date));
      const dropoffs = (dropoffRes.data ?? []).filter((p) => inRange(date, p.start_date, p.end_date));
      const displayHours = effectiveHours(hours, blockouts);

      const [y, mo, d] = date.split("-").map(Number);
      const slots: string[] = [];
      const dropoffSlots: string[] = [];
      const mobileSlots: string[] = [];

      // Slot grid at the business's own interval; a job must FINISH by close.
      for (let t = toMin(hours.start); t + durationMinutes <= toMin(hours.end); t += settings.slot_interval_minutes) {
        const slot = fromMin(t);
        const slotEnd = fromMin(t + durationMinutes);

        // Minimum advance notice, in the business's timezone.
        const slotInstant = localDateTimeToInstant(tz, date, slot);
        if (slotInstant.getTime() - nowMs < advanceMs) continue;

        // Buffered-conflict rule on BOTH sides of every existing booking.
        // CLOSED bounds (touching counts as a conflict) so the display, the
        // submit-time gate, and the DB exclusion constraint always agree.
        const bookingConflict = dayBookings.some((b) => {
          const bufferedStart = fromMin(Math.max(0, toMin(b.start) - buffer));
          const bufferedEnd = fromMin(toMin(b.end) + buffer);
          return !(hm(slotEnd) < bufferedStart || hm(slot) > bufferedEnd);
        });
        if (bookingConflict) continue;

        const blockoutConflict = blockouts.some((bl) => {
          if (bl.all_day) return true;
          if (bl.start_time || bl.end_time) {
            return overlaps(slot, slotEnd, bl.start_time || "00:00", bl.end_time || "23:59");
          }
          return false;
        });
        if (blockoutConflict) continue;

        // Which restrictions are live for THIS slot. A period with no times
        // covers the whole day; one with times covers the hours it names.
        const restricts = (mode: string) =>
          dropoffs.some((p) => (p.mode ?? "dropoff") === mode
            && (!p.start_time || !p.end_time || overlaps(slot, slotEnd, p.start_time, p.end_time)));

        // Drop-off is the only option when the business does not do mobile at
        // all, or when a 'dropoff' period is closing mobile for these hours.
        // ...and now also when a CHOSEN SERVICE cannot be done at the
        // customer's address. A ceramic coating needs a garage; the trade says
        // so, and roadmap 2.8 found the gap and left it for here.
        const isDropoff = !settings.mobile_enabled || restricts("dropoff") || !svcAllowsMobile;
        const isMobile = !settings.dropoff_enabled || restricts("mobile") || !svcAllowsDropoff;

        // Both at once is a detailer who has restricted the same hours two
        // opposite ways. Nothing can be booked then, and saying so by leaving
        // the slot out is better than offering a time that will be refused.
        if (isDropoff && isMobile) continue;

        slots.push(slot);
        if (isDropoff) dropoffSlots.push(slot);
        if (isMobile) mobileSlots.push(slot);
      }

      dayResults[date] = {
        open: true,
        slots,
        dropoff_slots: dropoffSlots,
        dropoff_only: slots.length > 0 && dropoffSlots.length === slots.length,
        mobile_slots: mobileSlots,
        mobile_only: slots.length > 0 && mobileSlots.length === slots.length,
        hours: displayHours,
      };
    }

    if (body.booking_date && !body.start_date && !body.end_date) {
      const r = dayResults[body.booking_date] ?? {
        slots: [], dropoff_slots: [], dropoff_only: false,
        mobile_slots: [], mobile_only: false, hours: null,
      };
      return json({
        success: true, slots: r.slots, hours: r.hours,
        dropoff_slots: r.dropoff_slots, dropoff_only: r.dropoff_only,
        mobile_slots: r.mobile_slots, mobile_only: r.mobile_only,
      });
    }
    return json({ success: true, days: dayResults });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});

// "HH:MM" of an instant in a zone (local helper to avoid importing the whole
// formatter twice per booking).
function timeIn(tz: string, d: Date): string {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, hour: "2-digit", minute: "2-digit" })
    .formatToParts(d)
    .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {} as Record<string, string>);
  return `${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}
