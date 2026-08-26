// BookingDetailModal — thin Modal wrapper around BookingDetailContent (the
// dedicated OwnerBookingDetailPage renders the same content bare, no Modal
// chrome, so a push-notification tap opens a real page instead of a modal
// over the crowded dashboard). SAME props and SAME write callbacks:
//   { booking, onClose, onUpdateStatus, onUpdateNotes, onUpdateBooking, onDelete, onEditPayment }
import React from "react";
import { Modal } from "@/admin/ui";
import BookingDetailContent from "./BookingDetailContent";

export default function BookingDetailModal(props) {
  const { booking, onClose } = props;
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={booking.customer_name || "Booking"}
      description={booking.id ? `Job #${booking.id.slice(0, 8)}` : undefined}
    >
      <BookingDetailContent {...props} />
    </Modal>
  );
}
