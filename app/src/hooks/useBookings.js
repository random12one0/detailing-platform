// Booking reads (RLS-scoped to the signed-in member's business). All WRITES
// go through the edge functions in lib/api.js — never through this file.

import { useCallback, useEffect, useRef, useState } from "react";
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
// LOADING IS THE FIRST PAINT ONLY. `loading` used to go true on every read,
// and all three screens that use this hook answer it by replacing themselves
// with a centred spinner — so leaving Today and coming back threw the whole
// day away and re-arrived it, staggered animation and all, and so did marking
// a job complete and finalizing a payment, because both call reload().
// Observed with a MutationObserver rather than reasoned about:
// ["group|kids=3", "center|kids=1"].
//
// The rule is one rule for every screen (docs/dashboard-screen-designs-
// 2026-08-31.md §1a): the FIRST paint of a session may show a spinner; every
// read after it leaves the screen exactly where it is and dims what is
// changing. So the flag splits in two, HERE rather than in each screen —
// three callers writing their own version of this is how one gets fixed and
// its neighbours do not.
export function useBookings(fromDate, toDate, { includeCancelled = true } = {}) {
  const { business } = useBusiness();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // A ref, not state: it must survive fromDate/toDate changing (Calendar
  // walking to another month is not a first paint either).
  const painted = useRef(false);

  const reload = useCallback(async () => {
    if (!business || !fromDate || !toDate) return;
    if (painted.current) setRefreshing(true); else setLoading(true);
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
    painted.current = true;
    setLoading(false);
    setRefreshing(false);
  }, [business, fromDate, toDate, includeCancelled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { bookings, loading, refreshing, reload };
}
