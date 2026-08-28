// The job card, dense.
//
// The reference admin's version is the best thing in the old dashboard and
// the reason is that it answers every question standing in a driveway
// without a tap: when, who, how much, what, where — then Navigate, Call,
// Text and the one action that moves the job forward. Ported in substance,
// rebuilt on the new type and spacing scale.
//
// Two things carry status without a word being read: a 3px stripe down the
// left edge (new here — the old admin only had the pill) and the pill
// itself. Everything else on the card is neutral.

import { CheckCircle2, CreditCard, MessageSquare, Navigation, Phone } from "lucide-react";
import { mapsUrl, money, time12 } from "../lib/format.js";

const STATUS_LABEL = {
  confirmed: "Confirmed", completed: "Completed",
  cancelled: "Cancelled", no_show: "No show", pending: "Pending",
};

// The card had its own hardcoded Google Maps link while the detail sheet
// used the shared helper, so the same job navigated differently depending on
// which button you pressed. One helper, which honours Preferences → Maps.

export default function BookingCard({
  booking, onClick, showDate = false, isNext = false,
  onMarkComplete, onFinalize, dense = false,
}) {
  const services = (booking.services ?? []).map((s) => s.name_at_booking).filter(Boolean);
  const isMobile = booking.service_type === "mobile";
  const amount = booking.final_amount ?? booking.total_price;
  const dayLabel = showDate
    ? new Date(`${booking.booking_date}T12:00:00`).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    })
    : null;

  // The action buttons sit OUTSIDE the tappable info region so a thumb
  // aiming for Call never opens the detail sheet instead.
  const hasActions = !dense && (onMarkComplete || onFinalize || booking.customer_phone);

  return (
    <div className={`card${isNext ? " attend" : ""}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } }}
        style={{ cursor: "pointer" }}
      >
        <div className="tight">
          <div className="row top between">
            <div style={{ minWidth: 0 }}>
              <div className="strong" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {booking.customer_name}
              </div>
              <div className="quiet" style={{ marginTop: 2 }}>
                {dayLabel ? `${dayLabel} · ` : ""}
                {time12(booking.start_time)} – {time12(booking.end_time)}
              </div>
            </div>
            <div className="strong num" style={{ whiteSpace: "nowrap" }}>{money(amount)}</div>
          </div>

          <div className="row wrap" style={{ gap: 6 }}>
            <span className="tag">{isMobile ? "Mobile" : "Drop-off"}</span>
            <span className={`pill ${booking.status}`}>
              {STATUS_LABEL[booking.status] ?? booking.status}
            </span>
            {booking.payment_status === "paid" && <span className="pill paid">Paid</span>}
          </div>

          {services.length > 0 && <div className="body">{services.join(" · ")}</div>}

          {isMobile && booking.customer_address && (
            <div className="quiet" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {booking.customer_address}
            </div>
          )}
        </div>
      </div>

      {hasActions && (
        <>
          <hr className="rule" />
          {(isMobile && booking.customer_address) || booking.customer_phone ? (
            <div className="btnrow">
              {isMobile && booking.customer_address && (
                <a className="btn sm" href={mapsUrl(booking.customer_address)}
                  target="_blank" rel="noopener noreferrer">
                  <Navigation strokeWidth={2} /> Navigate
                </a>
              )}
              {booking.customer_phone && (
                <>
                  <a className="btn sm" href={`tel:${booking.customer_phone}`}>
                    <Phone strokeWidth={2} /> Call
                  </a>
                  <a className="btn sm" href={`sms:${booking.customer_phone}`}>
                    <MessageSquare strokeWidth={2} /> Text
                  </a>
                </>
              )}
            </div>
          ) : null}

          {onMarkComplete && booking.status === "confirmed" && (
            <button className="btn primary" style={{ marginTop: "var(--sp-2)" }}
              onClick={() => onMarkComplete(booking)}>
              <CheckCircle2 strokeWidth={2} /> Mark complete
            </button>
          )}
          {onFinalize && booking.status === "completed" && !booking.finalized_at && (
            <button className="btn primary" style={{ marginTop: "var(--sp-2)" }}
              onClick={() => onFinalize(booking)}>
              <CreditCard strokeWidth={2} /> Finalize payment
            </button>
          )}
        </>
      )}
    </div>
  );
}
