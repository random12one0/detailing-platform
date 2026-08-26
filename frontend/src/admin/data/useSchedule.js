// useSchedule — schedule overlays for the calendar: blockout_dates and
// dropoff_only_periods. Both are simple date-range rows; screens ask for the raw
// lists and expand them per-day themselves. Kept separate from useBookings so the
// calendar can fetch bookings and overlays independently.
//
// Mutations (add/remove blockout, add/remove drop-off) write straight to the same
// tables/columns the OLD admin (components/AdminDashboard.jsx) uses, so they operate
// on the live data. Each mutation toasts on failure, refetches on success, and
// returns a boolean so callers can branch on it.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

export function useSchedule() {
  // blockout_dates: { id, event_name, start_date, end_date, all_day, start_time, end_time, repeat }
  const [blockouts, setBlockouts] = useState([]);
  // dropoff_only_periods: { id, reason, start_date, end_date, start_time, end_time }
  const [dropoffPeriods, setDropoffPeriods] = useState([]);
  // booking_hours_overrides: { id, date, open_time, close_time, notes } — one-off
  // per-day hours that replace the weekly default for that single date.
  const [hoursOverrides, setHoursOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRef = useRef(null);

  const refetch = useCallback(async () => {
    try {
      setError(null);
      const [blockoutRes, dropoffRes, overrideRes] = await Promise.all([
        supabase
          .from("blockout_dates")
          .select("*")
          .order("start_date", { ascending: true }),
        supabase
          .from("dropoff_only_periods")
          .select("*")
          .order("start_date", { ascending: true }),
        supabase
          .from("booking_hours_overrides")
          .select("*")
          .order("date", { ascending: true }),
      ]);
      if (blockoutRes.error) throw blockoutRes.error;
      if (dropoffRes.error) throw dropoffRes.error;
      if (overrideRes.error) throw overrideRes.error;
      setBlockouts(blockoutRes.data || []);
      setDropoffPeriods(dropoffRes.data || []);
      setHoursOverrides(overrideRes.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  fetchRef.current = refetch;

  useEffect(() => {
    fetchRef.current?.();
  }, []);

  // Shared error toast + return-false helper for the mutations below.
  const fail = (title, err) => {
    toast({
      title,
      description: err?.message || "Please try again.",
      variant: "destructive",
    });
    return false;
  };

  // addBlockout — insert one blockout row. Accepts camelCase from a form and maps
  // to the DB columns the old admin uses.
  const addBlockout = useCallback(
    async ({
      eventName,
      startDate,
      endDate,
      allDay = true,
      startTime = null,
      endTime = null,
      repeat = "none",
    }) => {
      if (!startDate) return fail("Missing date", { message: "A start date is required." });
      const { error: insertError } = await supabase.from("blockout_dates").insert({
        event_name: eventName || "Blocked out",
        start_date: startDate,
        end_date: endDate || startDate,
        all_day: allDay,
        start_time: allDay ? null : startTime || null,
        end_time: allDay ? null : endTime || null,
        repeat: repeat || "none",
      });
      if (insertError) return fail("Could not add block-out", insertError);
      toast({ title: "Block-out added", variant: "success" });
      await refetch();
      return true;
    },
    [refetch]
  );

  const removeBlockout = useCallback(
    async (id) => {
      const { error: delError } = await supabase
        .from("blockout_dates")
        .delete()
        .eq("id", id);
      if (delError) return fail("Could not remove block-out", delError);
      toast({ title: "Block-out removed", variant: "success" });
      await refetch();
      return true;
    },
    [refetch]
  );

  // addDropoff — insert one drop-off-only period.
  const addDropoff = useCallback(
    async ({ reason = null, startDate, endDate, startTime = null, endTime = null }) => {
      if (!startDate) return fail("Missing date", { message: "A start date is required." });
      const { error: insertError } = await supabase
        .from("dropoff_only_periods")
        .insert({
          reason: reason || null,
          start_date: startDate,
          end_date: endDate || startDate,
          start_time: startTime || null,
          end_time: endTime || null,
        });
      if (insertError) return fail("Could not mark drop-off only", insertError);
      toast({ title: "Drop-off-only period added", variant: "success" });
      await refetch();
      return true;
    },
    [refetch]
  );

  const removeDropoff = useCallback(
    async (id) => {
      const { error: delError } = await supabase
        .from("dropoff_only_periods")
        .delete()
        .eq("id", id);
      if (delError) return fail("Could not remove drop-off period", delError);
      toast({ title: "Drop-off period removed", variant: "success" });
      await refetch();
      return true;
    },
    [refetch]
  );

  // upsertHoursOverride — set one-off open/close hours for a single date. Upserts
  // on the unique `date` column so re-saving the same day updates the existing row.
  // The available-slots edge function reads this row and uses it INSTEAD of the
  // weekly default for that date.
  const upsertHoursOverride = useCallback(
    async ({ date, openTime, closeTime }) => {
      if (!date) return fail("Missing date", { message: "A date is required." });
      if (!openTime || !closeTime)
        return fail("Missing hours", { message: "Open and close times are required." });
      const { error: upsertError } = await supabase
        .from("booking_hours_overrides")
        .upsert(
          { date, open_time: openTime, close_time: closeTime },
          { onConflict: "date" }
        );
      if (upsertError) return fail("Could not save custom hours", upsertError);
      toast({ title: "Custom hours saved", variant: "success" });
      await refetch();
      return true;
    },
    [refetch]
  );

  // removeHoursOverride — delete the override for a date so it reverts to the
  // normal weekly hours.
  const removeHoursOverride = useCallback(
    async (date) => {
      const { error: delError } = await supabase
        .from("booking_hours_overrides")
        .delete()
        .eq("date", date);
      if (delError) return fail("Could not reset hours", delError);
      toast({ title: "Hours reset to normal", variant: "success" });
      await refetch();
      return true;
    },
    [refetch]
  );

  return {
    blockouts,
    dropoffPeriods,
    hoursOverrides,
    loading,
    error,
    refetch,
    addBlockout,
    removeBlockout,
    addDropoff,
    removeDropoff,
    upsertHoursOverride,
    removeHoursOverride,
  };
}

export default useSchedule;
