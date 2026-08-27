import { money, time12 } from "../lib/format.js";

export default function BookingCard({ booking, onClick, showDate = false, isNext = false }) {
  const services = (booking.services ?? []).map((s) => s.name_at_booking).join(", ");
  return (
    <div className="card tappable" onClick={onClick}
      style={isNext ? { borderColor: "var(--accent)", borderWidth: 2 } : undefined}>
      {isNext && (
        <div style={{ color: "var(--accent)", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em", marginBottom: 4 }}>
          NEXT UP
        </div>
      )}
      <div className="row between">
        <div>
          <strong>{booking.customer_name}</strong>
          <div className="muted">
            {showDate ? `${booking.booking_date} · ` : ""}
            {time12(booking.start_time)} – {time12(booking.end_time)} · {booking.service_type === "mobile" ? "Mobile" : "Drop-off"}
          </div>
          {services && <div className="muted">{services}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="big" style={{ fontSize: "1.1rem" }}>
            {money(booking.final_amount ?? booking.total_price)}
          </div>
          <span className={`badge ${booking.status}`}>{booking.status.replace("_", " ")}</span>
        </div>
      </div>
    </div>
  );
}
