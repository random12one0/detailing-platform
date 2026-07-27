// TodayScreen — the morning-open home for the solo detailer, rebuilt on the new
// admin primitives. Single-scroll, mobile-first: time-aware header, a 3-stat strip,
// a Needs-Payment queue (all dates), and today's run sheet of job cards.
// Logic (needs-payment rule, service summary, earnings) mirrors components/TodaySection.
import React, { useMemo, useState } from "react";
import {
  DollarSign,
  ClipboardList,
  ArrowRight,
  Phone,
  MessageSquare,
  Navigation,
  MapPin,
  Droplets,
  CheckCircle2,
  CreditCard,
  CalendarDays,
} from "lucide-react";
import { formatTime, parseLocalDate, money } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  StatCard,
  Button,
  StatusBadge,
  EmptyState,
  SectionHeader,
} from "@/admin/ui";
import { useBookings } from "@/admin/data/useBookings";
import PaymentFinalizationModal from "@/admin/modals/FinalizePaymentModal";
import BookingDetailModal from "@/admin/modals/BookingDetailModal";

// Local YYYY-MM-DD for "today".
const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Short services summary from packages + add-ons.
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

// Contact link — tel:/sms: action styled like a secondary button, 44px target.
function ContactLink({ href, icon: Icon, label }) {
  return (
    <Button asChild variant="secondary" size="sm" className="flex-1 min-w-[80px]">
      <a href={href}>
        <Icon />
        {label}
      </a>
    </Button>
  );
}

// One job card in the run sheet. Pass showDate for jobs on a future date.
// The info region (time/name/service/address) is a button that opens full details;
// the action buttons below sit outside it so taps don't collide.
function RunSheetCard({ booking, onOpen, onFinalize, onStatusChange, showDate }) {
  const isMobile = booking.service_type === "mobile";
  // Apple Maps turn-by-turn (owner is on iOS).
  const directionsUrl = `https://maps.apple.com/?daddr=${encodeURIComponent(
    booking.customer_address || ""
  )}`;
  const dayLabel = showDate
    ? parseLocalDate(booking.booking_date)?.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Card className="flex flex-col gap-3">
      {/* Tap the info region for full details */}
      <button
        type="button"
        onClick={() => onOpen(booking)}
        className="-m-1 flex flex-col gap-3 rounded-lg p-1 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Header: time + name on the left, price on the right */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-accent">
              {dayLabel ? `${dayLabel} · ` : ""}{formatTime(booking.start_time)}
            </div>
            <div className="truncate text-lg font-semibold text-foreground">
              {booking.customer_name}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {isMobile ? "Mobile" : "Drop-off"}
              </span>
              <StatusBadge status={booking.status} />
            </div>
          </div>
          <div className="whitespace-nowrap text-lg font-semibold text-foreground">
            {money(amountFor(booking))}
          </div>
        </div>

        {/* Service summary */}
        <div className="text-sm text-muted-foreground">
          {serviceSummary(booking)}
        </div>

        {/* Mobile-only: address + water/electric note */}
        {isMobile && booking.customer_address && (
          <div className="flex items-start gap-1.5 text-sm text-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate">{booking.customer_address}</span>
          </div>
        )}
        {isMobile && booking.has_water_electric && (
          <div className="flex items-center gap-1.5 text-xs text-status-confirmed">
            <Droplets className="size-3.5" />
            Water &amp; electric available
          </div>
        )}
      </button>

      {/* Contact + navigate actions */}
      <div className="flex flex-wrap gap-2">
        {isMobile && booking.customer_address && (
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="flex-1 min-w-[100px]"
          >
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
              <Navigation />
              Navigate
            </a>
          </Button>
        )}
        {booking.customer_phone && (
          <>
            <ContactLink
              href={`tel:${booking.customer_phone}`}
              icon={Phone}
              label="Call"
            />
            <ContactLink
              href={`sms:${booking.customer_phone}`}
              icon={MessageSquare}
              label="Text"
            />
          </>
        )}
      </div>

      {/* Primary state-advancing action */}
      {booking.status === "confirmed" && (
        <Button
          fullWidth
          size="sm"
          onClick={() => onStatusChange(booking.id, "completed")}
        >
          <CheckCircle2 />
          Mark Complete
        </Button>
      )}
      {booking.status === "completed" && !booking.finalized_at && (
        <Button fullWidth size="sm" onClick={() => onFinalize(booking)}>
          <CreditCard />
          Finalize
        </Button>
      )}
      {booking.finalized_at && (
        <Button
          fullWidth
          size="sm"
          variant="secondary"
          onClick={() => onFinalize(booking)}
        >
          <CreditCard />
          Edit payment
        </Button>
      )}
    </Card>
  );
}

export default function TodayScreen() {
  const { bookings, loading, updateStatus, refetch } = useBookings();
  const [finalizeBooking, setFinalizeBooking] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const today = todayStr();

  // BookingDetailModal write handlers (straight to supabase + refetch), matching
  // the ones CalendarScreen wires so tapping a card opens the same full editor.
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
      setSelectedBooking(null);
    }
  };
  const handleDelete = async (id) => {
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error)
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Booking deleted", variant: "success" });
      await refetch();
      setSelectedBooking(null);
    }
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const longDate = useMemo(() => {
    const d = parseLocalDate(today) || new Date();
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [today]);

  // Today's non-cancelled jobs, sorted by start_time.
  const todaysJobs = useMemo(
    () =>
      bookings
        .filter((b) => b.booking_date === today && b.status !== "cancelled")
        .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "")),
    [bookings, today]
  );

  // Earnings: today's completed + finalized jobs.
  const earnings = useMemo(
    () =>
      bookings
        .filter(
          (b) =>
            b.booking_date === today &&
            b.status === "completed" &&
            b.finalized_at
        )
        .reduce((sum, b) => sum + Number(amountFor(b)), 0),
    [bookings, today]
  );

  const doneCount = todaysJobs.filter((b) => b.status === "completed").length;
  const toGoCount = todaysJobs.length - doneCount;

  // Next up: next not-completed job today.
  const nextUp = useMemo(
    () => todaysJobs.find((b) => b.status !== "completed") || null,
    [todaysJobs]
  );

  // Needs-Payment queue: ALL dates, completed && not finalized.
  const needsPayment = useMemo(
    () =>
      bookings
        .filter((b) => b.status === "completed" && !b.finalized_at)
        .sort((a, b) =>
          (a.booking_date || "").localeCompare(b.booking_date || "")
        ),
    [bookings]
  );
  const unpaidTotal = needsPayment.reduce(
    (sum, b) => sum + Number(amountFor(b)),
    0
  );

  // Upcoming jobs on FUTURE dates, always shown below today's run sheet so the
  // owner can see what's coming. Soonest first, capped so the list stays scannable.
  const upcomingJobs = useMemo(
    () =>
      bookings
        .filter((b) => b.booking_date > today && b.status !== "cancelled")
        .sort((a, b) => {
          const byDate = (a.booking_date || "").localeCompare(b.booking_date || "");
          return byDate !== 0
            ? byDate
            : (a.start_time || "").localeCompare(b.start_time || "");
        })
        .slice(0, 6),
    [bookings, today]
  );

  return (
    <div className="space-y-6">
      {/* 1. Time-aware header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {greeting}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          {longDate}
        </p>
      </div>

      {/* 2. Stat strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Today's earnings"
          value={money(earnings)}
          icon={DollarSign}
        />
        <StatCard
          label="Jobs today"
          value={todaysJobs.length}
          sublabel={`${doneCount} done · ${toGoCount} to go`}
          icon={ClipboardList}
        />
        <StatCard
          label="Next up"
          value={nextUp ? nextUp.customer_name : "All done"}
          sublabel={nextUp ? formatTime(nextUp.start_time) : "No jobs left"}
          icon={ArrowRight}
        />
      </div>

      {/* 3. Needs-Payment queue — hidden when empty */}
      {needsPayment.length > 0 && (
        <Card className="border-accent/60 bg-accent/5">
          <SectionHeader
            title="Needs payment"
            action={
              <span className="text-sm font-semibold text-foreground">
                {needsPayment.length} unpaid — {money(unpaidTotal)}
              </span>
            }
          />
          <div className="space-y-2">
            {needsPayment.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-foreground">
                    {b.customer_name}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {serviceSummary(b)}
                  </div>
                </div>
                <div className="whitespace-nowrap font-semibold text-foreground">
                  {money(amountFor(b))}
                </div>
                <Button size="sm" onClick={() => setFinalizeBooking(b)}>
                  Finalize
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 4. Today's run sheet */}
      <div>
        <SectionHeader title="Today's run sheet" />
        {loading ? (
          <EmptyState
            icon={CalendarDays}
            title="Loading today"
            message="Fetching your run sheet…"
          />
        ) : todaysJobs.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No jobs today"
            message="Nothing on the books today — enjoy the day off."
          />
        ) : (
          <div className="space-y-3">
            {todaysJobs.map((b) => (
              <RunSheetCard
                key={b.id}
                booking={b}
                onOpen={setSelectedBooking}
                onFinalize={setFinalizeBooking}
                onStatusChange={updateStatus}
              />
            ))}
          </div>
        )}
      </div>

      {/* 5. Upcoming — always shown below today's jobs so future work is visible. */}
      {!loading && upcomingJobs.length > 0 && (
        <div>
          <SectionHeader
            title="Upcoming"
            action={
              <span className="text-sm text-muted-foreground">
                Next {upcomingJobs.length}
              </span>
            }
          />
          <div className="space-y-3">
            {upcomingJobs.map((b) => (
              <RunSheetCard
                key={b.id}
                booking={b}
                showDate
                onOpen={setSelectedBooking}
                onFinalize={setFinalizeBooking}
                onStatusChange={updateStatus}
              />
            ))}
          </div>
        </div>
      )}

      {/* Finalize — reuses the existing payment modal; refetch on save. */}
      {finalizeBooking && (
        <PaymentFinalizationModal
          booking={finalizeBooking}
          onClose={() => setFinalizeBooking(null)}
          onSave={() => {
            setFinalizeBooking(null);
            refetch();
          }}
        />
      )}

      {/* Full booking details — same editor used across the admin. */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onUpdateStatus={updateStatus}
          onUpdateNotes={handleUpdateNotes}
          onUpdateBooking={handleUpdateBooking}
          onDelete={handleDelete}
          onEditPayment={(b) => {
            setSelectedBooking(null);
            setFinalizeBooking(b);
          }}
        />
      )}
    </div>
  );
}
