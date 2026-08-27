// Step 6 — review and confirm, with the promo code entry.
//
// The quote shown here is the SERVER's (calculate-booking), never a local
// sum. If the server quote is unavailable, the parent blocks this step
// entirely rather than letting the customer submit something we can't
// price — the failure mode the old widget had.

import { money, time12 } from "../../lib/format.js";
import { useBookingBusiness } from "../BookingBusinessContext.jsx";

export default function StepReview({ form, setForm, quote, services, addOns, promoState, onApplyPromo }) {
  const { business, settings } = useBookingBusiness();
  const dateLabel = form.bookingDate
    ? new Date(`${form.bookingDate}T12:00:00`).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    })
    : "";

  return (
    <>
      <div className="bk-card">
        <div className="bk-step-label">When</div>
        <h3>{dateLabel}</h3>
        <p className="bk-muted">
          {time12(form.startTime)}
          {quote?.total_duration ? ` · about ${Math.round(quote.total_duration / 60 * 10) / 10} hours` : ""}
        </p>
        <p className="bk-muted" style={{ marginTop: 6 }}>
          {form.serviceType === "mobile"
            ? `We come to you${form.customerAddress ? ` — ${form.customerAddress}` : ""}`
            : `Drop-off${business.dropoff_address ? ` — ${business.dropoff_address}` : ""}`}
        </p>
      </div>

      <div className="bk-card">
        <div className="bk-step-label">What</div>
        {services.map((s) => (
          <div className="bk-row between" key={s.id} style={{ marginBottom: 4 }}>
            <span>{s.name}</span>
            <span className="bk-muted">{money(s.price)}</span>
          </div>
        ))}
        {addOns.map((a) => (
          <div className="bk-row between" key={a.id} style={{ marginBottom: 4 }}>
            <span>{a.name}</span>
            <span className="bk-muted">{money(a.price)}</span>
          </div>
        ))}
        {quote?.vehicle_size_fee > 0 && (
          <div className="bk-row between" style={{ marginBottom: 4 }}>
            <span className="bk-muted">Vehicle size</span>
            <span className="bk-muted">{money(quote.vehicle_size_fee)}</span>
          </div>
        )}
      </div>

      <div className="bk-card">
        <div className="bk-step-label">Promo code</div>
        <div className="bk-row" style={{ gap: 8 }}>
          <input
            value={form.promoCode}
            placeholder="Have a code?"
            onChange={(e) => setForm((f) => ({ ...f, promoCode: e.target.value.toUpperCase() }))}
          />
          <button className="bk-btn inline" onClick={onApplyPromo} disabled={promoState.checking || !form.promoCode.trim()}>
            {promoState.checking ? "Checking" : "Apply"}
          </button>
        </div>
        {promoState.error && <div className="bk-error" style={{ marginBottom: 0 }}>{promoState.error}</div>}
        {promoState.applied && (
          <p className="bk-muted" style={{ marginTop: 8, color: "var(--bk-success)" }}>
            {promoState.applied} applied.
          </p>
        )}
      </div>

      <div className="bk-card">
        <div className="bk-step-label">Total</div>
        {quote?.site_discount > 0 && (
          <div className="bk-row between" style={{ marginBottom: 4 }}>
            <span className="bk-muted">
              {settings.site_discount_label || `${quote.site_discount_percent}% off`}
            </span>
            <span className="bk-muted">-{money(quote.site_discount)}</span>
          </div>
        )}
        {quote?.promo_discount > 0 && (
          <div className="bk-row between" style={{ marginBottom: 4 }}>
            <span className="bk-muted">Promo {quote.promo_code}</span>
            <span className="bk-muted">-{money(quote.promo_discount)}</span>
          </div>
        )}
        <div className="bk-row between" style={{ marginTop: 6 }}>
          <strong>Estimated total</strong>
          <strong style={{ fontSize: "1.3rem" }}>{money(quote?.total ?? 0)}</strong>
        </div>
        <p className="bk-muted" style={{ marginTop: 8 }}>
          An estimate based on what you told us. If your vehicle needs more work,
          we’ll talk to you before doing anything extra.
        </p>
      </div>
    </>
  );
}
