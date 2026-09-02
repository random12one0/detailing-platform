// Step 6 — review and confirm, with the promo code entry.
//
// The quote shown here is the SERVER's (calculate-booking), never a local
// sum. If the server quote is unavailable, the parent blocks this step
// entirely rather than letting the customer submit something we can't
// price — the failure mode the old widget had.

import { duration, money, time12 } from "../../lib/format.js";
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
      {/* The appointment is the one lit object on this screen — it is the
          thing being created. Everything else is paper. */}
      <div className="bk-card selected">
        <div className="bk-step-label">When</div>
        <h3>{dateLabel}</h3>
        <p className="bk-muted">
          {time12(form.startTime)}
          {quote?.total_duration ? ` · about ${duration(quote.total_duration)}` : ""}
        </p>
        <p className="bk-muted" style={{ marginTop: 6 }}>
          {form.serviceType === "mobile"
            ? `We come to you${form.customerAddress ? ` — ${form.customerAddress}` : ""}`
            : `Drop-off${business.dropoff_address ? ` — ${business.dropoff_address}` : ""}`}
        </p>
      </div>

      {/* The money is a receipt — ruled rows, mono figures, a dashed rule
          before the total — not another card. */}
      <div className="bk-receipt">
        {services.map((s) => (
          <div className="line" key={s.id}>
            <span>{s.name}</span>
            <span className="bk-price">
              {s.price_is_from && <span className="bk-from">from </span>}
              {money(s.price)}
            </span>
          </div>
        ))}
        {addOns.map((a) => (
          <div className="line" key={a.id}>
            <span>{a.name}</span>
            <span className="bk-price">{money(a.price)}</span>
          </div>
        ))}
        {quote?.vehicle_size_fee > 0 && (
          <div className="line dim">
            <span>Vehicle size</span>
            <span className="bk-price">{money(quote.vehicle_size_fee)}</span>
          </div>
        )}
        {/* ROADMAP 2.8c. Travel was PRINTED on the location step and never
            charged — computeQuote had no travel input at all — so a customer
            was shown a mobile surcharge their Estimated total did not contain.
            It is a real line on the receipt now, named after the area they
            picked where they picked one. */}
        {quote?.travel_fee > 0 && (
          <div className="line dim">
            <span>{quote.travel_zone ? `Travel — ${quote.travel_zone}` : "Travel"}</span>
            <span className="bk-price">{money(quote.travel_fee)}</span>
          </div>
        )}
        {/* Each surcharge on its own line under the detailer’s own name for
            it. A total that moved when the customer picked a Saturday has to
            say WHY on the page that asks them to confirm it. */}
        {(quote?.adjustments ?? []).map((a, i) => (
          <div className="line dim" key={i}>
            <span>{a.label}</span>
            <span className="bk-price">{money(a.amount)}</span>
          </div>
        ))}
        {quote?.site_discount > 0 && (
          <div className="line dim">
            <span>{settings.site_discount_label || `${quote.site_discount_percent}% off`}</span>
            <span className="bk-price">-{money(quote.site_discount)}</span>
          </div>
        )}
        {quote?.promo_discount > 0 && (
          <div className="line dim">
            <span>Promo {quote.promo_code}</span>
            <span className="bk-price">-{money(quote.promo_discount)}</span>
          </div>
        )}
        {/* The engine rounds to the business's nearest-dollar setting. Without
            this line, a customer doing the arithmetic watches $1 vanish. */}
        {quote && quote.total !== quote.subtotal - (quote.promo_discount || 0) && (
          <div className="line dim">
            <span>Rounding</span>
            <span className="bk-price">
              {quote.total > quote.subtotal - (quote.promo_discount || 0) ? "+" : "-"}
              {money(Math.abs(quote.total - (quote.subtotal - (quote.promo_discount || 0))))}
            </span>
          </div>
        )}
        <div className="line total">
          <strong>Estimated total</strong>
          <strong className="bk-price" style={{ fontSize: "1.3rem" }}>{money(quote?.total ?? 0)}</strong>
        </div>
        <p className="bk-muted" style={{ marginTop: 10 }}>
          {/* W9 — a from-price is only honest if the page says what it is. The
              arithmetic is identical either way; this sentence is the whole of
              what "from" costs, and it replaces rather than joins the general
              one, because two paragraphs saying the same thing is worse than
              one saying the sharper version. */}
          {services.some((s) => s.price_is_from)
            ? "Some of this is priced from — we’ll confirm once we’ve seen the vehicle, and we’ll ask before doing anything extra."
            : "An estimate. If the vehicle needs more work, we’ll ask before doing anything extra."}
        </p>
      </div>

      {/* Promo entry rides under the receipt as a plain row, not a box. */}
      <div>
        <div className="bk-step-label" style={{ marginBottom: 8 }}>Promo code</div>
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
        {promoState.error && <div className="bk-error" style={{ marginBottom: 0, marginTop: 8 }}>{promoState.error}</div>}
        {promoState.applied && (
          <p className="bk-muted" style={{ marginTop: 8, color: "var(--bk-accent-text)" }}>
            {promoState.applied} applied.
          </p>
        )}
      </div>
    </>
  );
}
