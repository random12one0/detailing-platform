// useCustomers — the new admin's customer source. Fetches the `customers` table
// (kept live via a realtime subscription + exposed refetch) and, given the bookings
// from useBookings(), enriches each customer — matched by phone, the same key
// components/RevenueAndCustomers.jsx#CustomersSection uses — with:
//   - bookingCount:  how many of their bookings are on the books
//   - lifetimeValue: sum of (final_amount ?? total_price) over their completed &
//                    finalized bookings
//   - lastVisit:     their most recent booking_date (YYYY-MM-DD) or null
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

// Amount rule mirrors the rest of the admin (TodayScreen/useBookings): prefer the
// finalized amount, fall back to the quoted price.
const amountFor = (b) => Number(b.final_amount ?? b.total_price ?? 0);

export function useCustomers(bookings = []) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stable ref so the realtime callback never closes over a stale fetch.
  const fetchRef = useRef(null);

  const refetch = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.error("useCustomers: failed to fetch customers", err);
    } finally {
      setLoading(false);
    }
  }, []);

  fetchRef.current = refetch;

  useEffect(() => {
    fetchRef.current?.();

    // Live updates: any change to the customers table re-pulls the list.
    const subscription = supabase
      .channel("admin_customers_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customers" },
        () => fetchRef.current?.()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Merge booking history onto each DB customer, keyed by phone. Only customers
  // that exist in the DB are returned (bookings without a matching customer are
  // ignored) — the same rule CustomersSection follows.
  const customers = useMemo(() => {
    const byPhone = {};
    rows.forEach((c) => {
      byPhone[c.phone] = {
        ...c,
        bookings: [],
        bookingCount: 0,
        lifetimeValue: 0,
        lastVisit: null,
      };
    });

    (bookings || []).forEach((b) => {
      const entry = byPhone[b.customer_phone];
      if (!entry) return;

      entry.bookings.push(b);
      if (b.status !== "cancelled") entry.bookingCount += 1;

      // Lifetime value: completed + finalized only.
      if (b.status === "completed" && b.finalized_at) {
        entry.lifetimeValue += amountFor(b);
      }

      // Last visit: most recent booking_date.
      const d = b.booking_date;
      if (d && (!entry.lastVisit || d > entry.lastVisit)) entry.lastVisit = d;
    });

    return Object.values(byPhone);
  }, [rows, bookings]);

  return { customers, loading, refetch };
}

export default useCustomers;
