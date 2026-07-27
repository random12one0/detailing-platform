// useBookings — the new admin's single source of booking data.
// Fetches the SAME shape AdminDashboard uses (bookings + interior/exterior packages
// + booking_add_ons -> add_ons), exposes a refetch + status mutation, and keeps the
// list live via a realtime subscription on the bookings table.
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

  // updateStatus — mirrors AdminDashboard.updateBookingStatus: POST to the
  // update-booking edge function, toast the result, then refetch.
  const updateStatus = useCallback(
    async (bookingId, status) => {
      try {
        const functionsUrl =
          SUPABASE_FUNCTIONS_URL ||
          process.env.REACT_APP_SUPABASE_FUNCTIONS_URL;

        // update-booking is admin-gated: send the signed-in admin's session
        // token (not the public anon key) so the function can verify the caller.
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) {
          toast({
            title: "Update Failed",
            description: "Your admin session expired. Please sign in again.",
            variant: "destructive",
          });
          return false;
        }

        const response = await fetch(`${functionsUrl}/update-booking`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ booking_id: bookingId, status }),
        });
        const result = await response.json();

        if (!response.ok || result.error) {
          toast({
            title: "Update Failed",
            description: result.error || "Failed to update booking.",
            variant: "destructive",
          });
          return false;
        }

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

  return { bookings, loading, error, refetch, updateStatus };
}

export default useBookings;
