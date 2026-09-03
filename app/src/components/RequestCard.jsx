// ROADMAP 2.12 — A BOOKING WAITING TO BE ACCEPTED.
//
// The slot was designed in 2.11 step 4 and deliberately built EMPTY
// (docs/dashboard-screen-designs-2026-08-31.md §2, "the request queue —
// designed, empty, and not on the rail"). This is what goes in it, and the
// design is the specification: one card — who, when, what — and Accept filled
// against Decline ringless, "because they are not equal choices".
//
// THE THIRD ACTION IS THE OWNER'S, and it is ringed rather than filled for the
// same reason: "they can also send quotes, to have that option". Three
// actions take three weights (design-system.md § Composition), and at most one
// accent fill is ever on the card.
//
// WHY THIS IS NOT `BookingCard`. That card answers the questions you have
// standing in a driveway — Navigate, Call, Text, Mark complete — about a job
// that is happening. Nothing here is happening yet; the only question is yes
// or no. Sharing the component would have meant four booleans switching half
// of it off.
//
// IT IS NOT ON THE RAIL AND MUST NOT GO ON IT. The rail is today's day; a
// request can be for any date, which is why the card prints its own.

import { Check, MessageSquareQuote, X } from "lucide-react";
import { dateLong, money, time12 } from "../lib/format.js";

export default function RequestCard({
  booking, lit = false, busy = false, leaving = false,
  onAccept, onDecline, onQuote, onClick,
}) {
  const services = (booking.services ?? []).map((s) => s.name_at_booking).filter(Boolean);
  const quoted = booking.quoted_at ? Number(booking.quoted_amount) : null;

  return (
    <div className={`card reqcard${lit ? " attend" : ""}${leaving ? " leaving" : ""}`}>
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
              {/* THE DATE IS ALWAYS PRINTED. Every other card on Today is
                  today's; this one is the only object on the screen that can
                  be for any day, so leaving the date off would read as today. */}
              <div className="quiet" style={{ marginTop: 2 }}>
                {dateLong(booking.booking_date)} · {time12(booking.start_time)} – {time12(booking.end_time)}
              </div>
            </div>
            <div className="strong num" style={{ whiteSpace: "nowrap" }}>
              {money(booking.total_price)}
            </div>
          </div>

          <div className="row wrap" style={{ gap: 6 }}>
            <span className="tag">{booking.service_type === "mobile" ? "Mobile" : "Drop-off"}</span>
            {/* A quote already sent is a DIFFERENT wait — on them, not on you —
                and it is the only fact on this card the controls do not say. */}
            {quoted !== null && <span className="pill pending">Quoted {money(quoted)}</span>}
          </div>

          {services.length > 0 && <div className="body">{services.join(" · ")}</div>}

          {booking.service_type === "mobile" && booking.customer_address && (
            <div className="quiet" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {booking.customer_address}
            </div>
          )}
        </div>
      </div>

      <hr className="rule" />

      {/* Filled, ringed, ringless. Accept is the answer nearly every request
          gets; the quote is the useful extra; declining is the way out.
          ONLY THE LIT CARD'S ACCEPT IS FILLED — seen in the first screenshot
          of two requests together, which put two accent buttons on one screen
          and broke the "at most one accent fill" rule the design system and
          this product's own BookingCard both keep. Same expression as
          BookingCard's Mark complete, and for the same reason. */}
      <button className={`btn${lit ? " primary" : ""}`} disabled={busy} onClick={() => onAccept(booking)}>
        <Check size={18} strokeWidth={2} /> Accept
      </button>
      <div className="btnrow" style={{ marginTop: "var(--sp-2)" }}>
        <button className="btn sm" disabled={busy} onClick={() => onQuote(booking)}>
          <MessageSquareQuote size={18} strokeWidth={2} /> {quoted === null ? "Quote" : "Re-quote"}
        </button>
        <button className="btn sm ghost" disabled={busy} onClick={() => onDecline(booking)}>
          <X size={18} strokeWidth={2} /> Decline
        </button>
      </div>
    </div>
  );
}
