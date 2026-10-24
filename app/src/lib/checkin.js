// ROADMAP 97.55 — the vehicle check-in rule, in one place.
//
// The receipt page (`ManageBookingPage.jsx`) and the job record
// (`BookingDetail.jsx`) both ask the same two questions of the same row, and
// two copies of this answer would drift: one screen offering a box the other
// calls done. So the rule lives here and both screens import it.

export const hasAcked = (booking) => Boolean(booking?.damage_ack_at);

// A customer may tick the box while their booking is live and unticked, and
// only once the detailer has RECORDED something to acknowledge: at least one
// damage photo. Before that there is no check-in, and a tick would confirm
// nothing (finish review 2026-10-24). Cancelled is refused (there is no job
// arriving to check in), and an already-ticked box is not ticked twice: the
// first time is the record. `acknowledge-checkin` holds the same three rules.
export const canAcknowledge = (booking) => {
  if (!booking) return false;
  if (booking.status === "cancelled") return false;
  if (booking.damage_ack_at) return false;
  return Number(booking.damage_photo_count ?? 0) > 0;
};
