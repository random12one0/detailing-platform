// Confirmation screen — shown straight after booking, and the same
// information the confirmation email carries.

import { intlLocale, t } from "../lib/i18n.js";
import { useLocale } from "../hooks/useLocale.js";
import { Check, Clock } from "lucide-react";
import { icsUrl } from "../lib/api.js";
import { money, time12 } from "../lib/format.js";
import { useBookingBusiness } from "./BookingBusinessContext.jsx";

export default function BookingConfirmed({ booking, form }) {
  useLocale();
  const { business, branding, brandVars } = useBookingBusiness();
  // ROADMAP 2.12 — THE SCREEN MAKES THE SAME PROMISE THE EMAIL JUST MADE, and
  // it reads the status the server actually wrote rather than the setting,
  // because those are two reads that can disagree. What does NOT change: the
  // time is held either way, so nothing about the appointment card moves.
  const isRequest = booking.status === "pending";
  const dateLabel = new Date(`${booking.booking_date}T12:00:00`).toLocaleDateString(intlLocale(), {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="bk" style={brandVars}>
      <header className="bk-header">
        <div className="inner">
          {branding?.logo_url && <img src={branding.logo_url} alt="" />}
          <div>
            <h1>{business.name}</h1>
            <div className="tagline">{isRequest ? t("Request received") : t("Booking confirmed")}</div>
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
            {/* A TICK MEANS DONE, AND A REQUEST IS NOT. Roadmap 2.12 — the
                first screenshot of this screen in request mode put a big
                confirmation tick over the words "we're holding your time",
                which is the mark saying one thing and the sentence another. */}
            {isRequest
              ? <Clock size={30} strokeWidth={2.5} />
              : <Check size={30} strokeWidth={2.5} />}
          </div>
          <h1>{isRequest ? t("We’re holding your time") : t("You’re booked")}</h1>
          <p className="bk-muted" style={{ marginTop: 6 }}>
            {isRequest
              ? t("Nobody else can take it while we look at your request. We’ll email {email} as soon as it’s accepted.",
                { email: form.customerEmail })
              : t("We’ve emailed your confirmation to {email}.", { email: form.customerEmail })}
          </p>
        </div>

        <div className="bk-card">
          <div className="bk-step-label">{isRequest ? t("What you asked for") : t("Your appointment")}</div>
          <h3>{dateLabel}</h3>
          <p className="bk-muted">{time12(booking.start_time)} – {time12(booking.end_time)}</p>
          <p className="bk-muted" style={{ marginTop: 6 }}>
            {form.serviceType === "mobile"
              ? t("We’ll come to {address}", { address: form.customerAddress })
              : business.dropoff_address
                ? t("Drop off at {address}", { address: business.dropoff_address })
                : t("Drop-off — we’ll confirm the address")}
          </p>
          <div className="bk-row between" style={{ marginTop: 10 }}>
            <span>{t("Estimated total")}</span>
            <strong className="bk-price">{money(booking.total_price)}</strong>
          </div>
        </div>

        <a className="bk-btn primary" href={icsUrl(booking.id, "customer")}>
          {t("Add to my calendar")}
        </a>
        <a className="bk-btn" style={{ marginTop: 10 }} href={booking.receipt_url}>
          {isRequest ? t("View, change or cancel this request") : t("View, change or cancel this booking")}
        </a>

        {business.phone && (
          <p className="bk-muted" style={{ marginTop: 18, textAlign: "center" }}>
            {t("Questions? Call")}{" "}
            <a href={`tel:${business.phone}`} style={{ color: "var(--bk-accent-text)" }}>{business.phone}</a>
          </p>
        )}
      </div>
    </div>
  );
}
