// Confirmation screen — shown straight after booking, and the same
// information the confirmation email carries.

import { Check } from "lucide-react";
import { icsUrl } from "../lib/api.js";
import { money, time12 } from "../lib/format.js";
import { useBookingBusiness } from "./BookingBusinessContext.jsx";

export default function BookingConfirmed({ booking, form }) {
  const { business, branding, brandVars } = useBookingBusiness();
  const dateLabel = new Date(`${booking.booking_date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="bk" style={brandVars}>
      <header className="bk-header">
        <div className="inner">
          {branding?.logo_url && <img src={branding.logo_url} alt="" />}
          <div>
            <h1>{business.name}</h1>
            <div className="tagline">Booking confirmed</div>
          </div>
        </div>
      </header>

      <div className="bk-wrap" style={{ paddingBottom: 40 }}>
        <div style={{ textAlign: "center", padding: "26px 0 18px" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", margin: "0 auto 12px",
            background: "var(--bk-accent)", color: "var(--bk-accent-ink)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Check size={30} strokeWidth={2.5} />
          </div>
          <h1>You’re booked</h1>
          <p className="bk-muted" style={{ marginTop: 6 }}>
            We’ve emailed your confirmation to {form.customerEmail}.
          </p>
        </div>

        <div className="bk-card">
          <div className="bk-step-label">Your appointment</div>
          <h3>{dateLabel}</h3>
          <p className="bk-muted">{time12(booking.start_time)} – {time12(booking.end_time)}</p>
          <p className="bk-muted" style={{ marginTop: 6 }}>
            {form.serviceType === "mobile"
              ? `We’ll come to ${form.customerAddress}`
              : business.dropoff_address
                ? `Drop off at ${business.dropoff_address}`
                : "Drop-off — we’ll confirm the address"}
          </p>
          <div className="bk-row between" style={{ marginTop: 10 }}>
            <span>Estimated total</span>
            <strong className="bk-price">{money(booking.total_price)}</strong>
          </div>
        </div>

        <a className="bk-btn primary" href={icsUrl(booking.id, "customer")}>
          Add to my calendar
        </a>
        <a className="bk-btn" style={{ marginTop: 10 }} href={booking.receipt_url}>
          View, change or cancel this booking
        </a>

        {business.phone && (
          <p className="bk-muted" style={{ marginTop: 18, textAlign: "center" }}>
            Questions? Call <a href={`tel:${business.phone}`} style={{ color: "var(--bk-accent-text)" }}>{business.phone}</a>
          </p>
        )}
      </div>
    </div>
  );
}
