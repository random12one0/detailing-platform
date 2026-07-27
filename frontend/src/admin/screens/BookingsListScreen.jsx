// BookingsListScreen — the new admin's full, searchable BOOKINGS LIST. Preserves the
// old admin's "Bookings" tab (a flat, filterable list of every booking) which the new
// shell's Today/Calendar views don't fully replace. Self-contained: pulls the shared
// useBookings feed, filters by search + status + service type + date range, and opens
// the existing BookingDetailModal (wired straight to supabase) for view/edit/delete.
// Hosted as a sub-view of the More hub, so it takes no props.
import React, { useMemo, useState } from "react";
import { ClipboardList, Search, SearchX } from "lucide-react";
import { formatDate, formatTime, money } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  TextInput,
  Select,
  FilterChips,
  StatusBadge,
  EmptyState,
} from "@/admin/ui";
import { useBookings } from "@/admin/data/useBookings";
import BookingDetailModal from "@/admin/modals/BookingDetailModal";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const serviceSummary = (b) => {
  const parts = [];
  if (b.interior_package?.name) parts.push(b.interior_package.name);
  if (b.exterior_package?.name) parts.push(b.exterior_package.name);
  const addOns = Array.isArray(b.add_ons)
    ? b.add_ons.map((a) => a.add_on?.name).filter(Boolean)
    : [];
  let summary = parts.join(" + ");
  if (addOns.length)
    summary += `${summary ? " · " : ""}+${addOns.length} add-on${
      addOns.length > 1 ? "s" : ""
    }`;
  return summary || "Service";
};

const amountFor = (b) => b.final_amount ?? b.total_price ?? 0;

export default function BookingsListScreen() {
  const { bookings, loading, updateStatus, refetch } = useBookings();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [serviceType, setServiceType] = useState("all");
  const [dateRange, setDateRange] = useState("all"); // all | upcoming | past
  const [selected, setSelected] = useState(null);

  const visible = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const q = query.trim().toLowerCase();

    return bookings.filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      if (serviceType !== "all" && b.service_type !== serviceType) return false;

      if (dateRange !== "all") {
        const [y, m, d] = (b.booking_date || "").split("-").map(Number);
        const bd = y ? new Date(y, m - 1, d) : null;
        if (!bd) return false;
        if (dateRange === "upcoming" && bd < today) return false;
        if (dateRange === "past" && bd >= today) return false;
      }

      if (q) {
        const hay = [b.customer_name, b.customer_phone, b.customer_email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bookings, query, status, serviceType, dateRange]);

  // BookingDetailModal handlers — straight to supabase + refetch (mirrors CalendarScreen).
  const handleUpdateNotes = async (id, adminNotes) => {
    const { error } = await supabase
      .from("bookings")
      .update({ admin_notes: adminNotes })
      .eq("id", id);
    if (error)
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Notes saved", variant: "success" });
      await refetch();
    }
  };
  const handleUpdateBooking = async (id, fields) => {
    const { add_ons, ...scalar } = fields;
    const { error } = await supabase.from("bookings").update(scalar).eq("id", id);
    if (error)
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Booking updated", variant: "success" });
      await refetch();
      setSelected(null);
    }
  };
  const handleDelete = async (id) => {
    await supabase.from("booking_add_ons").delete().eq("booking_id", id);
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error)
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Booking deleted", variant: "success" });
      await refetch();
      setSelected(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone or email"
            aria-label="Search bookings"
            className="pl-9"
          />
        </div>
        <FilterChips options={STATUS_FILTERS} value={status} onChange={setStatus} />
        <div className="grid grid-cols-2 gap-3">
          <Select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            aria-label="Service type"
          >
            <option value="all">All services</option>
            <option value="mobile">Mobile</option>
            <option value="dropoff">Drop-off</option>
          </Select>
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            aria-label="Date range"
          >
            <option value="all">All dates</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </Select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <EmptyState
          icon={ClipboardList}
          title="Loading bookings"
          message="Fetching every booking…"
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No bookings found"
          message="No bookings match the current filters."
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {visible.length} booking{visible.length === 1 ? "" : "s"}
          </p>
          <div className="space-y-3">
            {visible.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelected(b)}
                className={`w-full text-left ${
                  b.status === "cancelled" ? "opacity-60" : ""
                }`}
              >
                <Card className="flex items-start gap-3 transition-colors hover:bg-muted/50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-foreground">
                        {b.customer_name || "Unnamed"}
                      </h3>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      {formatDate(b.booking_date)} · {formatTime(b.start_time)}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="rounded-md bg-muted px-1.5 py-0.5 font-semibold uppercase tracking-wide">
                        {b.service_type === "mobile" ? "Mobile" : "Drop-off"}
                      </span>
                      <span className="truncate">{serviceSummary(b)}</span>
                    </div>
                  </div>
                  <div className="whitespace-nowrap font-semibold text-foreground">
                    {money(amountFor(b))}
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Detail / edit modal — reuse the existing component with wired handlers. */}
      {selected && (
        <BookingDetailModal
          booking={selected}
          onClose={() => setSelected(null)}
          onUpdateStatus={updateStatus}
          onUpdateNotes={handleUpdateNotes}
          onUpdateBooking={handleUpdateBooking}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
