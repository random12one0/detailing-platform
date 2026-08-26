// useBookings — the admin's single source of booking data AND the single place
// bookings get written.
//
// Every mutation here goes through the `update-booking` edge function rather
// than writing to the table directly. That function is the only thing that
// re-validates a rescheduled job against the rest of the day, applies the
// editable-field allowlist, and replaces add-ons. Four screens used to carry
// their own copy of these handlers writing straight to Supabase, which meant
// admin edits skipped all of that — and silently discarded add-on changes.
// Don't reintroduce a direct write; add it here instead.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, SUPABASE_FUNCTIONS_URL } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

// The exact select AdminDashboard.fetchBookings uses — keep in sync so the new
// screens see the same joined data (packages + add-ons).
const BOOKINGS_SELECT = `
  *,
  interior_package:packages!interior_package_id(
    id,
    name,
    tier,
    base_price
  ),
  exterior_package:packages!exterior_package_id(
    id,
    name,
    tier,
    base_price
  ),
  add_ons:booking_add_ons(
    add_on_id,
    add_on:add_ons(
      id,
      name,
      price
    )
  )
`;

// Shared POST to update-booking with the signed-in admin's token. Returns the
// parsed body on success, or throws with a usable message.
async function callUpdateBooking(payload) {
  const functionsUrl =
    SUPABASE_FUNCTIONS_URL || process.env.REACT_APP_SUPABASE_FUNCTIONS_URL;

  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error("Your admin session expired. Please sign in again.");
  }

  const response = await fetch(`${functionsUrl}/update-booking`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.error) {
    throw new Error(result.error || "Failed to update booking.");
  }
  return result;
}

export function useBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Keep a stable ref to the latest fetch so the realtime callback and effect
  // cleanup never close over a stale function.
  const fetchRef = useRef(null);

  const refetch = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("bookings")
        .select(BOOKINGS_SELECT)
        .is("deleted_at", null)
        .order("booking_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (fetchError) throw fetchError;
      setBookings(data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  fetchRef.current = refetch;

  // updateStatus — change just the status field.
  const updateStatus = useCallback(
    async (bookingId, status) => {
      try {
        await callUpdateBooking({ booking_id: bookingId, status });
        toast({
          title: "Booking Updated",
          description: "Booking status updated successfully.",
          variant: "success",
        });
        await refetch();
        return true;
      } catch (err) {
        toast({
          title: "Update Failed",
          description: err?.message || "Failed to update booking.",
          variant: "destructive",
        });
        return false;
      }
    },
    [refetch]
  );

  // updateNotes — save the admin-only note.
  const updateNotes = useCallback(
    async (bookingId, adminNotes) => {
      try {
        await callUpdateBooking({ booking_id: bookingId, admin_notes: adminNotes });
        toast({ title: "Notes saved", variant: "success" });
        await refetch();
        return true;
      } catch (err) {
        toast({
          title: "Update Failed",
          description: err?.message || "Failed to save notes.",
          variant: "destructive",
        });
        return false;
      }
    },
    [refetch]
  );

  // updateBooking — full edit, including add-ons. `fields` is the shape
  // BookingDetailContent's edit form produces.
  const updateBooking = useCallback(
    async (bookingId, fields) => {
      try {
        const result = await callUpdateBooking({ booking_id: bookingId, ...fields });
        // The function allows an overlapping reschedule but reports it, since
        // double-booking is sometimes deliberate. Surface it rather than
        // letting the owner discover it on the day.
        if (result.conflict) {
          toast({
            title: "Saved — but this now overlaps",
            description: `Overlaps ${result.conflict.customer_name} (${String(
              result.conflict.start_time
            ).slice(0, 5)}–${String(result.conflict.end_time).slice(0, 5)}).`,
            variant: "destructive",
          });
        } else {
          toast({ title: "Booking updated", variant: "success" });
        }
        await refetch();
        return true;
      } catch (err) {
        toast({
          title: "Update Failed",
          description: err?.message || "Failed to update booking.",
          variant: "destructive",
        });
        return false;
      }
    },
    [refetch]
  );

  // deleteBooking — soft delete. The row is hidden everywhere but retained, so
  // revenue history and invoices stay intact and it can be restored.
  const deleteBooking = useCallback(
    async (bookingId) => {
      try {
        await callUpdateBooking({ booking_id: bookingId, soft_delete: true });
        toast({ title: "Booking deleted", variant: "success" });
        await refetch();
        return true;
      } catch (err) {
        toast({
          title: "Delete Failed",
          description: err?.message || "Failed to delete booking.",
          variant: "destructive",
        });
        return false;
      }
    },
    [refetch]
  );

  useEffect(() => {
    fetchRef.current?.();

    // Live updates: any change to bookings re-pulls the joined list.
    const subscription = supabase
      .channel("admin_bookings_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          fetchRef.current?.();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    bookings,
    loading,
    error,
    refetch,
    updateStatus,
    updateNotes,
    updateBooking,
    deleteBooking,
  };
}

export default useBookings;
