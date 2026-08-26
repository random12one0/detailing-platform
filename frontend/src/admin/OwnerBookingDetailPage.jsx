// OwnerBookingDetailPage — a real URL (/admin/job/:id) a push notification
// can open directly, instead of dumping the owner into the crowded main
// dashboard. Renders the exact same BookingDetailContent used inside the
// dashboard's BookingDetailModal, just as a standalone page with its own
// header/back button instead of modal chrome. Gated by RequireAdmin same as
// the rest of /admin/*.
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Sparkles } from "lucide-react";
import { useBookings } from "@/admin/data/useBookings";
import { Button, EmptyState } from "@/admin/ui";
import BookingDetailContent from "@/admin/modals/BookingDetailContent";
import PaymentFinalizationModal from "@/admin/modals/FinalizePaymentModal";

export default function OwnerBookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bookings, loading, updateStatus, updateNotes, updateBooking, deleteBooking, refetch } = useBookings();
  const [finalizeBooking, setFinalizeBooking] = useState(null);

  const booking = bookings.find((b) => b.id === id) || null;

  // All writes go through useBookings, which routes them to the update-booking
  // edge function (validation + add-on handling + soft delete). This page used
  // to write to Supabase directly, which skipped all of that.
  const handleDelete = async (bookingId) => {
    const ok = await deleteBooking(bookingId);
    if (ok) navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-card/95 px-4 backdrop-blur">
        <Button variant="ghost" size="sm" className="px-2" onClick={() => navigate("/admin")}>
          <ChevronLeft />
          Dashboard
        </Button>
        <span className="ml-auto flex size-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Sparkles className="size-4" />
        </span>
      </header>

      <main className="mx-auto w-full max-w-[640px] px-4 py-4 pb-10">
        {loading && !booking ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading booking…</div>
        ) : !booking ? (
          <EmptyState
            title="Booking not found"
            message="This booking may have been deleted."
            action={
              <Button onClick={() => navigate("/admin")}>Back to dashboard</Button>
            }
          />
        ) : (
          <>
            <h1 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
              {booking.customer_name || "Booking"}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                #{booking.id.slice(0, 8)}
              </span>
            </h1>
            <BookingDetailContent
              booking={booking}
              onClose={() => navigate("/admin")}
              onUpdateStatus={updateStatus}
              onUpdateNotes={updateNotes}
              onUpdateBooking={updateBooking}
              onDelete={handleDelete}
              onEditPayment={(b) => setFinalizeBooking(b)}
            />
          </>
        )}
      </main>

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
    </div>
  );
}
