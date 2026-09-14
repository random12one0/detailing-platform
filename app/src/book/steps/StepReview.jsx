// Step 6 — review and confirm, with the promo code entry.
//
// The quote shown here is the SERVER's (calculate-booking), never a local
// sum. If the server quote is unavailable, the parent blocks this step
// entirely rather than letting the customer submit something we can't
// price — the failure mode the old widget had.

import { getLocale, intlLocale, t } from "../../lib/i18n.js";
import { useLocale } from "../../hooks/useLocale.js";
import { duration, money, phone, time12 } from "../../lib/format.js";
import { useBookingBusiness } from "../BookingBusinessContext.jsx";
import { sizeText } from "./StepVehicle.jsx";

export default function StepReview({ form, setForm, quote, services, addOns, promoState, onApplyPromo }) {
  useLocale();
  const loc = intlLocale();
  const { business, settings, tx } = useBookingBusiness();
  const dateLabel = form.bookingDate
    ? new Date(`${form.bookingDate}T12:00:00`).toLocaleDateString(loc, {
      weekday: "long", month: "long", day: "numeric",
    })
    : "";

  // The vehicle, in the customer's own words where they gave any. The size
  // label comes from the tenant's own list, so a detailer who renamed
  // "Medium" to "Crossover" sees their word here too.
  // **THROUGH STEP 3'S OWN RULE, NOT `.label` RAW.** This read the stored
  // string straight out and printed it, so a platform tier came out "Small" in
  // English on an otherwise Spanish page and a detailer's own word was never
  // translated at all. `sizeText` answers the ownership question once: ours
  // takes `t()`, theirs takes `tx()`.
  const sizeRow = (settings?.vehicle_sizes ?? []).find((s) => s.key === form.vehicleSize);
  const sizeLabel = sizeRow ? sizeText(sizeRow, "label", tx) : "";
  const vehicleLine = [form.vehicleModel?.trim(), sizeLabel].filter(Boolean).join(" · ");

  // ROADMAP 8.10 — CARS ON DIFFERENT DAYS ARE SEPARATE APPOINTMENTS, so the
  // card at the top of this step becomes a list of them. The server sends one
  // entry per car and each `total` is what THAT booking will be charged,
  // because it is that booking's own quote — so the figures below are not a
  // split of the total, they are the totals.
  const legs = quote?.per_vehicle ?? null;

  // WHAT COMES OFF, AND IT ALWAYS ADDS UP. Every discount the engine applied,
  // with the final rounding folded into the last of them so the lines a
  // customer can add reach the total they are asked to pay. See the block that
  // renders these for why no line here says "Rounding".
  const cents = (v) => Math.round(Number(v || 0) * 100);
  const gross = cents(quote?.subtotal_before_discounts ?? quote?.subtotal);
  const shownDiscounts = [];
  if (quote?.site_discount > 0) {
    shownDiscounts.push({
      key: "site",
      // The detailer's own name for their sale where they wrote one — `tx()`;
      // our fallback sentence where they did not — `t()`.
      label: settings.site_discount_label
        ? tx(settings.site_discount_label)
        : t("{percent}% off", { percent: quote.site_discount_percent }),
      amount: quote.site_discount,
    });
  }
  if (quote?.promo_discount > 0) {
    shownDiscounts.push({
      key: "promo",
      label: t("Promo {code}", { code: quote.promo_code }),
      amount: quote.promo_discount,
    });
  }
  // The gap between what the parts come to and what is actually charged. It is
  // the rounding, and it belongs to the last discount rather than to a line of
  // its own.
  const gap = gross && quote
    ? gross - cents(quote.total) - shownDiscounts.reduce((s, d) => s + cents(d.amount), 0)
    : 0;
  if (shownDiscounts.length && gap !== 0) {
    const last = shownDiscounts[shownDiscounts.length - 1];
    last.amount = (cents(last.amount) + gap) / 100;
  }
  // NOTHING TO FOLD IT INTO. A business that rounds and is running no discount
  // charges a total that is not the sum of its prices, and the honest thing is
  // a sentence rather than a fee-shaped line.
  const roundedOnly = !shownDiscounts.length && gap !== 0 ? gap : 0;
  const legWhen = (i) => (i === 0
    ? { date: form.bookingDate, time: form.startTime }
    : (form.extraVehicles?.[i - 1] ?? { date: "", time: "" }));
  const longDay = (d) => (d
    ? new Date(`${d}T12:00:00`).toLocaleDateString(loc, { weekday: "short", month: "long", day: "numeric" })
    : "");

  return (
    <>
      {/* The appointment is the one lit object on this screen — it is the
          thing being created. Everything else is paper. */}
      <div className="bk-card selected">
        <div className="bk-step-label">{legs ? t("Your appointments") : t("When")}</div>
        {legs ? (
          // TWO LINES PER CAR, NOT ONE. Appended to the date with an em-dash,
          // "Tue, September 8 · 8:00 AM — Ford F-150 · Small" wraps mid-name
          // at 392 and leaves a dangling dash at the end of the first line —
          // looked at, not reasoned about. The day is what the customer is
          // checking; the car is which one it is for.
          legs.map((v, i) => (
            <div key={i} style={{ marginTop: i ? 10 : 0 }}>
              <div className="bk-row between">
                <span>{longDay(legWhen(i).date)} · {time12(legWhen(i).time)}</span>
                <span className="bk-price">{money(v.total)}</span>
              </div>
              <p className="bk-muted">{[v.model, v.label].filter(Boolean).join(" · ")}</p>
            </div>
          ))
        ) : (
          <>
            <h3>{dateLabel}</h3>
            <p className="bk-muted">
              {time12(form.startTime)}
              {quote?.total_duration
                ? ` · ${t("about {time}", { time: duration(quote.total_duration, getLocale()) })}`
                : ""}
            </p>
          </>
        )}
        <p className="bk-muted" style={{ marginTop: 6 }}>
          {form.serviceType === "mobile"
            ? (form.customerAddress
              ? t("We come to you · {address}", { address: form.customerAddress })
              : t("We come to you"))
            : (business.dropoff_address
              ? t("Drop-off · {address}", { address: business.dropoff_address })
              : t("Drop-off"))}
        </p>
        {/* ---------------------------------------------------------------
            THE SKY, FOR THE HOUR AND THE PLACE THEY JUST PICKED.
            ---------------------------------------------------------------
            Andrew's idea, 2026-09-13, and it sits here — under the day, the
            time and the address — because it is a fact ABOUT that line rather
            than a new subject.

            **NO WARNINGS ON THE CUSTOMER'S SIDE, AND THIS IS THE ONE RULE TO
            KEEP.** The detailer's rows say "Too hot" and "Rain" because those
            change what he loads into the van. A customer reading "rain
            expected" with their thumb over Confirm is being handed a reason to
            abandon the booking, about weather that may well have changed by
            the day. So: the condition and the number, in the National Weather
            Service's own words, and nothing that reads as a caution.
            `calculate-booking` returns only those two fields — the warnings
            are not filtered out here, they never arrive.

            IT IS ABSENT MORE OFTEN THAN PRESENT and that is correct: a booking
            past about six days out has no forecast, and one at an address
            nothing has resolved yet has none either. Silence, never a guess
            and never a "we don't know yet" line. */}
        {quote?.weather && (
          <p className="bk-muted" style={{ marginTop: 2 }}>
            {/* "Forecast · Sunny, 76°" — the word FORECAST is doing real work,
                and it is the one thing the line could not do without. Without
                it, "Sunny · 76°" under an address reads as a promise about the
                day rather than as what somebody currently expects, and a
                customer who arrives to rain has been told something untrue by
                us. `shortForecast` stays in the National Weather Service's own
                words on a Spanish page for the same reason the record does:
                rewriting it would be inventing a forecast. */}
            {t("Forecast · {condition}, {temp}°", {
              condition: quote.weather.shortForecast,
              temp: quote.weather.temperature,
            })}
          </p>
        )}
      </div>

      {/* WHO WE ARE COMING TO, AND WHAT IN — testing loop F-007, 2026-09-06.
          This step is headed "Check everything over" and, until now, showed
          none of what a person would actually check: the name, the phone,
          the email and the vehicle were typed two steps earlier and never
          shown again. The phone and the email are the two that decide
          whether the confirmation and the reminder ever arrive, and a
          transposed digit in either is invisible until the day of the job.

          IT RIDES THE APPOINTMENT CARD RATHER THAN A CARD OF ITS OWN, and
          that is a height decision as much as a design one: step 7 is the
          second-tightest step on a phone and its spare room belongs to the
          TENANT — a detailer with six services, an add-on, a travel fee and
          a promo already has a longer receipt than the demo does. Two muted
          lines cost ~34px; a second `.bk-receipt` cost ~56px with its own
          padding and rule.

          NO EDITING HERE. The back arrow already goes to the step that owns
          each field, and a second set of inputs is a second place the same
          value can be typed differently. */}
      <p className="bk-muted" style={{ marginTop: 10 }}>
        {[form.customerName, vehicleLine].filter(Boolean).join(" · ")}
      </p>
      <p className="bk-muted" style={{ marginTop: 2 }}>
        {[phone(form.customerPhone), form.customerEmail].filter(Boolean).join(" · ")}
      </p>

      {/* The money is a receipt — ruled rows, mono figures, a dashed rule
          before the total — not another card. */}
      <div className="bk-receipt">
        {/* ROADMAP 8.10 — A SPLIT BOOKING'S ITEMISATION BELONGS TO EACH
            APPOINTMENT, NOT TO THE SET. Every figure below is a SUM across
            two or three separate bookings, so "Full Detail $400" for two
            cars is a line nobody can add up — the exact defect the invoice
            tie-out exists to prevent. The list above already gives each car
            its own total, and each car's own confirmation email itemises the
            booking it belongs to. */}
        {!legs && services.map((s) => (
          <div className="line" key={s.id}>
            <span>{tx(s.name)}</span>
            <span className="bk-price">
              {s.price_is_from && <span className="bk-from">{t("from")} </span>}
              {money(s.price)}
            </span>
          </div>
        ))}
        {!legs && addOns.map((a) => (
          <div className="line" key={a.id}>
            <span>{tx(a.name)}</span>
            <span className="bk-price">{money(a.price)}</span>
          </div>
        ))}
        {!legs && quote?.vehicle_size_fee > 0 && (
          <div className="line dim">
            <span>{t("Vehicle size")}</span>
            <span className="bk-price">{money(quote.vehicle_size_fee)}</span>
          </div>
        )}
        {/* ROADMAP 2.8c. Travel was PRINTED on the location step and never
            charged — computeQuote had no travel input at all — so a customer
            was shown a mobile surcharge their Estimated total did not contain.
            It is a real line on the receipt now, named after the area they
            picked where they picked one. */}
        {!legs && quote?.travel_fee > 0 && (
          <div className="line dim">
            {/* TWO FUNCTIONS IN ONE STRING, AND THAT IS THE RULE RATHER THAN
                an oversight: "Travel" is OUR word and takes `t()`, the area is
                the DETAILER'S and takes `tx()`. The comment here used to say
                the area "stays as they typed it" — it is in the TRANSLATE set
                and DeepL has already done it, so what it really needed was the
                other lookup. */}
            <span>{quote.travel_zone
              ? t("Travel · {zone}", { zone: tx(quote.travel_zone) })
              : t("Travel")}</span>
            <span className="bk-price">{money(quote.travel_fee)}</span>
          </div>
        )}
        {/* Each surcharge on its own line under the detailer’s own name for
            it. A total that moved when the customer picked a Saturday has to
            say WHY on the page that asks them to confirm it. */}
        {!legs && (quote?.adjustments ?? []).map((a, i) => (
          <div className="line dim" key={i}>
            <span>{a.label}</span>
            <span className="bk-price">{money(a.amount)}</span>
          </div>
        ))}
        {/* **NO LINE ON THIS PAGE SAYS "ROUNDING" — an outside review of the
            live product, 2026-09-11, and it is the sharpest thing in that
            report.** A customer saw:

              Express Wash    $65.00
              Promo SUMMER10  -$7.00
              Rounding        +$2.00
              Estimated total $60.00

            Every figure there is arithmetically correct — the engine takes
            `Math.round(65 × 10 / 100)` = $7, then rounds the total to the
            business's nearest-$5 setting, which puts $2 back. It is still
            indefensible. **"Rounding" on a checkout reads as the business
            adjusting the price after the fact**, and the discount it sits
            under is not the discount the customer was offered.

            SO THE ROUNDING IS FOLDED INTO THE DISCOUNT AND THE LINES ADD UP.
            The same customer now sees `Promo SUMMER10 -$5.00` over a $60
            total, which is exactly what happened: they were offered 10% off
            and they paid $5 less. Nothing is hidden — the total is unchanged
            and every line is true.

            IT GOES ON THE LAST DISCOUNT SHOWN, because that is the one nearest
            the total and the only one a reader is still holding. Where there
            is no discount at all, the rounding cannot be folded into anything
            and becomes a plain sentence under the total instead of a price
            line — see below. */}
        {!legs && shownDiscounts.map((d) => (
          <div className="line dim" key={d.key}>
            <span>{d.label}</span>
            <span className="bk-price">-{money(d.amount)}</span>
          </div>
        ))}
        <div className="line total">
          <strong>{t("Estimated total")}</strong>
          <strong className="bk-price" style={{ fontSize: "1.3rem" }}>{money(quote?.total ?? 0)}</strong>
        </div>
        {/* The one case the fold cannot cover: a business that rounds its
            totals and is running no discount. A sentence, not a price line —
            a fee-shaped row for something that is not a fee is what the old
            "Rounding" line got wrong. */}
        {!legs && roundedOnly !== 0 && (
          <p className="bk-muted" style={{ marginTop: 6 }}>
            {roundedOnly > 0
              ? t("Rounded down to the nearest dollar.")
              : t("Rounded up to the nearest dollar.")}
          </p>
        )}
        <p className="bk-muted" style={{ marginTop: 10 }}>
          {/* W9 — a from-price is only honest if the page says what it is. The
              arithmetic is identical either way; this sentence is the whole of
              what "from" costs, and it replaces rather than joins the general
              one, because two paragraphs saying the same thing is worse than
              one saying the sharper version. */}
          {services.some((s) => s.price_is_from)
            ? t("Some of this is priced from. We’ll confirm once we’ve seen the vehicle, and we’ll ask before doing anything extra.")
            : t("An estimate. If the vehicle needs more work, we’ll ask before doing anything extra.")}
        </p>
      </div>

      {/* Promo entry rides under the receipt as a plain row, not a box. */}
      <div>
        <div className="bk-step-label" style={{ marginBottom: 8 }}>{t("Promo code")}</div>
        <div className="bk-row" style={{ gap: 8 }}>
          <input
            value={form.promoCode}
            placeholder={t("Have a code?")}
            onChange={(e) => setForm((f) => ({ ...f, promoCode: e.target.value.toUpperCase() }))}
          />
          <button className="bk-btn inline" onClick={onApplyPromo} disabled={promoState.checking || !form.promoCode.trim()}>
            {promoState.checking ? t("Checking") : t("Apply")}
          </button>
        </div>
        {promoState.error && <div className="bk-error" style={{ marginBottom: 0, marginTop: 8 }}>{promoState.error}</div>}
        {promoState.applied && (
          <p className="bk-muted" style={{ marginTop: 8, color: "var(--bk-accent-text)" }}>
            {t("{code} applied.", { code: promoState.applied })}
          </p>
        )}
      </div>
    </>
  );
}
