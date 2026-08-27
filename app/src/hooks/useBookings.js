// Booking reads (RLS-scoped to the signed-in member's business). All WRITES
// go through the edge functions in lib/api.js — never through this file.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { localDate, localTime } from "../lib/format.js";

export const BOOKING_SELECT =
  "*, services:booking_services(name_at_booking, price_at_booking), booking_add_ons(add_on:add_ons(id, name, price))";

// Attach business-local date/time strings so screens never re-derive them.
export function withLocal(b, tz) {
  return {
    ...b,
    booking_date: localDate(b.start_at, tz),
    start_time: localTime(b.start_at, tz),
    end_time: localTime(b.end_at, tz),
  };
}

// Bookings whose LOCAL date falls in [fromDate, toDate] (inclusive).
export function useBookings(fromDate, toDate, { includeCancelled = true } = {}) {
  const { business } = useBusiness();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!business || !fromDate || !toDate) return;
    setLoading(true);
    const tz = business.timezone;
    // Pad the UTC window a day either side, then filter by local date.
    const fromUtc = new Date(`${fromDate}T00:00:00Z`);
    const toUtc = new Date(`${toDate}T00:00:00Z`);
    let q = supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("business_id", business.id)
      .is("deleted_at", null)
      .gte("start_at", new Date(fromUtc.getTime() - 36 * 3600_000).toISOString())
      .lte("start_at", new Date(toUtc.getTime() + 60 * 3600_000).toISOString())
      .order("start_at", { ascending: true });
    if (!includeCancelled) q = q.neq("status", "cancelled");
    const { data } = await q;
    const rows = (data ?? [])
      .map((b) => withLocal(b, tz))
      .filter((b) => b.booking_date >= fromDate && b.booking_date <= toDate);
    setBookings(rows);
    setLoading(false);
  }, [business, fromDate, toDate, includeCancelled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { bookings, loading, reload };
}
