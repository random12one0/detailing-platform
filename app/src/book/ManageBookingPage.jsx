// Customer-facing manage page — /booking/:id. Linked from the confirmation
// email and the confirmation screen. This is what stops the detailer's
// phone ringing for "can I move my Tuesday?".
//
// Access model matches the receipt endpoint: the unguessable booking UUID
// is the credential.
//
// The cancellation window is enforced server-side, and this page now checks
// it too so the customer is told BEFORE they tap rather than after a refusal.
// That is a display convenience only — cancel-booking re-checks the window
// itself, so a stale page cannot cancel late.

import { intlLocale, t } from "../lib/i18n.js";
import { useLocale } from "../hooks/useLocale.js";
import LanguagePicker from "./LanguagePicker.jsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CalendarClock, Check, CreditCard, Phone, X } from "lucide-react";
import { api, icsUrl, slotsForType } from "../lib/api.js";
import { money, phone, time12 } from "../lib/format.js";
import { BookingBusinessProvider, useBookingBusiness } from "./BookingBusinessContext.jsx";
import "./booking.css";

// The four `vehicle_condition` values, in words a customer wrote rather than
// the key the column stores. Kept here rather than imported from the
// dashboard's copy: this is the CUSTOMER surface and its strings live in
// `es.js`, not `appEs.js`.
const CONDITION_WORDS = {
  light: "Light",
  moderate: "Moderate",
  heavy: "Heavy",
  extreme: "Extreme",
};

export default function ManageBookingPage() {
  useLocale();
  const { id } = useParams();
  // ROADMAP 8.10 — `group` is the OTHER appointments this customer made in
  // the same go, and it is empty for every booking that is not one of a pair.
  // ROADMAP 2.20 STAGE 3 — `card` is the server's answer to "may this person
  // be offered a card button", and it is two booleans with no explanation in
  // it on purpose: the sentence `cardStatus` writes is in the DETAILER's
  // words and this page is public.
  const [state, setState] = useState({ status: "loading", booking: null, business: null, group: [], card: null });

  const load = useCallback(async () => {
    try {
      const r = await api.bookingReceipt(id);
      if (!r?.booking) throw new Error("not_found");
      setState({ status: "ready", booking: r.booking, business: r.business, group: r.group ?? [], card: r.card ?? null });
    } catch {
      setState({ status: "not_found", booking: null, business: null, group: [], card: null });
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (state.status === "loading") {
    return <div className="bk"><div className="bk-center"><div className="bk-spinner" /></div></div>;
  }
  if (state.status === "not_found") {
    return (
      <div className="bk">
        <div className="bk-center">
          <h1>{t("Booking not found")}</h1>
          <p className="bk-muted">{t("This link may be out of date, or the booking was removed.")}</p>
        {/* **THE WAY BACK OUT OF A LANGUAGE — his review, 2026-09-11.**
            *"It was in Spanish with no way to put it in English."*

            Every working customer page carries the switch in its masthead;
            this state carries no masthead at all, so it carried no switch. And
            the language is remembered for the whole browser — a customer who
            taps ES once on a booking page meets Spanish everywhere after it —
            so the ONE page with no way out is the one that failed. Somebody
            who cannot read the sentence explaining why their link is dead has
            no second sentence to fall back on.

            It is `.bk-center`'s own child rather than a masthead, because
            there is nothing here for a masthead to sit above. */}
        <div className="bk-lang-out"><LanguagePicker /></div>
        </div>
      </div>
    );
  }

  // Hydrate the business context from the slug the receipt gave us, so the
  // page carries the same branding as the booking page.
  return (
    <BookingBusinessProvider slug={state.business.slug}>
      <ManageInner booking={state.booking} receiptBusiness={state.business}
        group={state.group} card={state.card} onChanged={load} />
    </BookingBusinessProvider>
  );
}

// receiptBusiness comes from get-booking-receipt, NOT from the public
// profile RPC. The RPC deliberately returns only name/slug/phone/timezone/
// service_area/dropoff_address, so cancellation_window_hours is not on it —
// reading the window off the context business silently yielded 0, which made
// the whole closed-window branch dead code. It is read from the receipt.
function ManageInner({ booking, receiptBusiness, group = [], card = null, onChanged }) {
  const { business, branding, brandVars, slug, status } = useBookingBusiness();
  const [mode, setMode] = useState(null); // null | "reschedule" | "cancelled"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [days, setDays] = useState(null);
  const [pick, setPick] = useState({ date: "", time: "" });
  // Cancelling frees the slot for someone else and cannot be undone from
  // here, so it asks first — inline, naming the appointment, which a native
  // confirm() cannot do.
  const [confirmCancel, setConfirmCancel] = useState(false);
  // ROADMAP 2.20 STAGE 3 — PAYING BY CARD.
  //
  // `?paid=1` IS STRIPE'S `success_url` COMING BACK, and it is the only thing
  // this page knows about the payment for the first second or two: the row is
  // marked paid by the WEBHOOK, which is a different request arriving on its
  // own schedule. Reloading and finding `unpaid` is the ordinary case, not a
  // failure, so the page thanks them from the URL rather than from the row —
  // a page that showed "still owed" one second after a card cleared would
  // have a customer paying twice.
  const [justPaid] = useState(() => new URLSearchParams(window.location.search).get("paid") === "1");
  const [paying, setPaying] = useState(false);

  const durationMinutes = useMemo(
    () => Math.round((new Date(booking.end_at) - new Date(booking.start_at)) / 60000),
    [booking],
  );
  const isCancelled = booking.status === "cancelled" || mode === "cancelled";
  const isPast = new Date(booking.start_at) < new Date();
  // ROADMAP 2.12. Two new facts this page has to be honest about: the booking
  // may be a REQUEST nobody has accepted yet, and there may be a QUOTE waiting
  // on the customer. Both are true of the same row at the same time — a quote
  // is sent on a request and the request stays pending until they say yes.
  const isRequest = booking.status === "pending";
  const quote = booking.quoted_at ? Number(booking.quoted_amount) : null;

  // Online changes close this many hours before the appointment.
  const windowHours = Number(receiptBusiness?.cancellation_window_hours ?? 0);
  const cutoff = new Date(booking.start_at).getTime() - windowHours * 3600_000;
  const windowClosed = windowHours > 0 && Date.now() > cutoff;
  const noteCarriesContact = Boolean(receiptBusiness?.phone || receiptBusiness?.email);

  const services = (booking.services ?? []).map((s) => s.name_at_booking).filter(Boolean);
  // THE CAR, IN ONE LINE. Size, model and condition were on the booking and
  // on no screen the customer could reach — the multi-vehicle block printed
  // them, so a customer with ONE car saw less than a customer with two.
  const vehicleLine = [
    booking.vehicle_model,
    booking.vehicle_size_label,
    CONDITION_WORDS[booking.vehicle_condition],
  ].filter(Boolean).join(" · ");
  // `final_amount` is what was actually charged after the job changed on the
  // day; until it exists the figure is still an estimate and must say so.
  const isFinal = booking.final_amount != null;

  // WHETHER THE ITEMISATION IS SAFE TO DRAW.
  //
  // Every figure on a booking is snapshotted independently, so a row written
  // by anything other than `create-booking` can hold a surcharge the total
  // does not contain. Add the lines up; if they do not reach the stored
  // subtotal, show the services and the total and nothing in between.
  //
  // ROUNDED TO THE CENT BEFORE COMPARING — these are numerics coming back
  // through JSON, and `235.00000000000003 !== 235` would silently switch
  // every receipt in the product to the short form.
  // **AND THE SIZE FEE IS COUNTED TWICE ON SOME BOOKINGS, WHICH IS WHY THIS
  // ASKS THE QUESTION TWICE — measured 2026-09-11 on two real bookings, both
  // made through the booking page, neither of which itemised.**
  //
  // `booking_services.price_at_booking` is a snapshot, and it does not always
  // mean the same thing: on one booking it was the base price with the size
  // uplift ALREADY IN IT (a $240 service stored as $255), and on another it
  // was the bare base with `vehicle_size_fee` sitting beside it. Adding the
  // fee to the first kind double-counts it, so a perfectly consistent booking
  // failed this check and fell back to names with no prices — the feature
  // switched itself off on the ordinary case.
  //
  // So both readings are tried. Itemisation is still only drawn when the
  // lines PROVABLY equal the stored subtotal; what changed is that there are
  // two ways for them to prove it. `sizeIsSeparate` then decides whether the
  // size gets a line of its own, because drawing one when it is already
  // inside the service prices is the same double count on the screen.
  const cents = (n) => Math.round(Number(n || 0) * 100);
  const adjustments = Array.isArray(booking.price_adjustments) ? booking.price_adjustments : [];
  // Everything that ADDS. `price_at_booking` sometimes already contains the
  // vehicle-size uplift and sometimes does not, so the size is tried both ways
  // below rather than assumed.
  const additions = cents(booking.subtotal)
    ? [
      ...(booking.services ?? []).map((sv) => cents(sv.price_at_booking)),
      ...(booking.add_ons ?? []).map((a) => cents(a.add_on?.price)),
      cents(booking.travel_fee),
      ...adjustments.map((a) => cents(a.amount)),
    ].reduce((a, b) => a + b, 0)
    : null;
  // Everything already drawn as a line that SUBTRACTS.
  const shown = cents(booking.monthly_plan_discount) + cents(booking.promo_discount);
  const sub = cents(booking.subtotal);

  // **WHY THE PARTS COULD NEVER MATCH — measured 2026-09-11, and the answer
  // was not a broken booking.** `_shared/pricing.ts` line 344 spells the order
  // out: services + size + add-ons + travel + surcharges → SITE-WIDE SALE % →
  // promo → ROUND TO `price_rounding_nearest`. Two of those five steps had no
  // line on this receipt, and both of them come off the total.
  //
  // On the booking he was looking at: $255 + $110 + $45 + $25 travel = $435,
  // a "New customer 10% off" site sale took $44, and the business rounds to
  // the nearest $10, which took another $1. Stored subtotal $391, stored total
  // $390. **The old check compared the pre-discount lines against the
  // post-discount subtotal, so any business running a sale had every receipt
  // fall back to names with no prices** — which is exactly what he reported:
  // the simple booking itemised and the complicated one did not.
  //
  // So the discount and the rounding are lines now, and the check is that
  // every line together reaches the total exactly.
  //
  // THE SIZE IS RESOLVED BY TAKING THE SMALLER RESIDUAL, not by guessing.
  // Both readings can look plausible once a discount is allowed to absorb the
  // difference — counting the size twice would just inflate the discount by
  // $30 — so whichever reading leaves LESS unexplained is the true one, and an
  // exact zero always wins.
  const residualFor = (n) => (n === null ? null : n - shown - sub);
  const flat = residualFor(additions);
  const withSize = residualFor(additions === null ? null : additions + cents(booking.vehicle_size_fee));
  const sizeIsSeparate = withSize !== null && withSize >= 0
    && (flat === null || flat < 0 || withSize < flat);
  const gross = additions === null ? null
    : additions + (sizeIsSeparate ? cents(booking.vehicle_size_fee) : 0);
  const siteDiscount = residualFor(gross);
  // Rounding is the last step the engine takes, and it is the difference
  // between the subtotal it settled on and what it actually charges.
  const rounding = sub - cents(booking.total_price);
  // WHAT THE DISCOUNT LINE ACTUALLY SAYS. The site sale plus the rounding, so
  // the lines a customer can add reach the total they were charged and no row
  // on this page is shaped like a fee that is not one. Same treatment as the
  // checkout (`StepReview.jsx`), for the same reason.
  const shownDiscount = siteDiscount === null ? 0 : siteDiscount + rounding;
  // Nothing to fold it into: a business that rounds and ran no sale. A
  // sentence under the total, not a price row.
  const roundedOnly = itemisedRounding();
  function itemisedRounding() {
    return siteDiscount !== null && siteDiscount + rounding === 0 && rounding !== 0 ? rounding : 0;
  }
  // A NEGATIVE RESIDUAL IS STILL UNEXPLAINED AND STILL DEGRADES. Money missing
  // from the parts means a figure this page cannot see, and inventing a line
  // to cover it is the one thing a receipt must never do.
  const itemised = siteDiscount !== null && siteDiscount >= 0;

  const loc = intlLocale();
  const dateLabel = new Date(`${booking.booking_date}T12:00:00`).toLocaleDateString(loc, {
    weekday: "long", month: "long", day: "numeric",
  });

  const loadSlots = async () => {
    setBusy(true);
    setError("");
    try {
      const today = new Date().toISOString().slice(0, 10);
      const end = new Date(Date.now() + 45 * 86400_000).toISOString().slice(0, 10);
      const r = await api.availableSlots(slug, {
        start_date: today, end_date: end, duration_minutes: durationMinutes,
        // ITEM F — THE ONE CALL IN THE PRODUCT THAT MUST NOT COUNT THIS
        // BOOKING. Everywhere else availability means "what is free"; here it
        // means "what is free FOR THIS BOOKING", and its own slot is free for
        // it. Without this a customer whose service fills what is left of the
        // day is refused by themselves: the day drops out of its own
        // reschedule picker and moving an hour later is impossible while
        // moving to another day works, which reads as nothing being wrong.
        exclude_booking_id: booking.id,
      });
      setDays(r.days ?? {});
      setMode("reschedule");
    } catch (e) {
      setError(e.message || t("Could not load available times."));
    }
    setBusy(false);
  };

  const doReschedule = async () => {
    setBusy(true);
    setError("");
    try {
      await api.rescheduleBooking(booking.id, pick.date, pick.time);
      setMode(null);
      setPick({ date: "", time: "" });
      onChanged();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  // Saying YES. Saying no is the ordinary Cancel below — a customer who won't
  // pay the quoted price is cancelling, and the slot has to go back either
  // way, so there is no second decline button competing with it.
  const acceptQuote = async () => {
    setBusy(true);
    setError("");
    try {
      await api.acceptQuote(booking.id);
      onChanged();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  const doCancel = async () => {
    setBusy(true);
    setError("");
    try {
      await api.cancelBooking(booking.id);
      setMode("cancelled");
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  if (status !== "ready") {
    return <div className="bk"><div className="bk-center"><div className="bk-spinner" /></div></div>;
  }

  // THE SERVER CREATES THE CHECKOUT AND WE LEAVE FOR IT. Nothing about a card
  // is rendered by this page — `pay-booking` answers with a
  // `checkout.stripe.com` url on the DETAILER's own account, and it re-decides
  // payability inside that same request, so a page that has been sitting open
  // since yesterday cannot start a payment the detailer has since switched
  // off. `message` is written for a customer and is shown as it arrives.
  const pay = async () => {
    setPaying(true);
    setError("");
    try {
      const r = await api.payBooking(booking.id);
      if (!r?.url) throw new Error("no_url");
      window.location.href = r.url;
      return;                        // leaving — no state to unwind
    } catch (e) {
      setError(e?.message || t("We could not start the payment. Please try again."));
    }
    setPaying(false);
  };

  const openDates = Object.entries(days ?? {})
    // The times THIS booking can move to. It keeps its own service type
    // when it is rescheduled, so a day the detailer has closed to mobile is
    // not a day a mobile booking can move onto (W4).
    .filter(([, d]) => slotsForType(d, booking.service_type).length > 0)
    .map(([date]) => date);

  return (
    <div className="bk" style={brandVars}>
      <header className="bk-header">
        <div className="inner">
          {branding?.logo_url && <img src={branding.logo_url} alt="" />}
          <div>
            <h1>{business.name}</h1>
            <div className="tagline">{isRequest ? t("Your request") : t("Your booking")}</div>
          </div>
          <LanguagePicker />
        </div>
      </header>

      <div className="bk-wrap" style={{ paddingBottom: 40 }}>
        <div className="bk-card" style={{ marginTop: 18 }}>
          <div className="bk-step-label">
            {isCancelled ? t("Cancelled") : isRequest ? t("Waiting to be accepted") : t("Confirmed")}
          </div>
          <h3 style={{ textDecoration: isCancelled ? "line-through" : "none" }}>{dateLabel}</h3>
          <p className="bk-muted">{time12(booking.start_time)} – {time12(booking.end_time)}</p>
          {/* ROADMAP 8.10 — the other cars on THIS visit. Their money is
              already itemised below as its own line, so this is what they
              ARE: the customer checking that the truck they typed in is on
              the booking they are looking at. */}
          {(booking.vehicles ?? []).length > 0 && (
            <p className="bk-muted" style={{ marginTop: 6 }}>
              {`${t("{n} vehicles", { n: (booking.vehicles ?? []).length + 1 })} — `}
              {[
                [booking.vehicle_model, booking.vehicle_size_label].filter(Boolean).join(" "),
                ...[...(booking.vehicles ?? [])]
                  .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                  .map((v) => [v.vehicle_model, v.vehicle_size_label].filter(Boolean).join(" ")),
              ].filter(Boolean).join(", ")}
            </p>
          )}
          <p className="bk-muted" style={{ marginTop: 6 }}>
            {booking.service_type === "mobile"
              ? (booking.customer_address
                ? t("We come to {address}", { address: booking.customer_address })
                : t("We come to you"))
              : (business.dropoff_address
                ? t("Drop-off at {address}", { address: business.dropoff_address })
                : t("Drop-off"))}
          </p>
          {/* **EVERYTHING THEY ORDERED — his review, 2026-09-11.** *"It looked
              like there was three lines and it barely had any information…
              that preview screen of what you ordered at the last step, that
              should have information of everything they ordered, the address,
              basically all the details."*

              This is `StepReview`'s receipt, in `StepReview`'s own classes,
              on a SAVED booking instead of a live quote. Same shape on
              purpose: the page a customer confirms on and the page they come
              back to a week later should not itemise the same job two
              different ways.

              EVERY FIGURE IS SNAPSHOTTED ON THE BOOKING and none is
              recomputed here. `price_at_booking`, `vehicle_size_fee`,
              `travel_fee` and the labels inside `price_adjustments` are all
              stored precisely so a detailer who raises a price cannot rewrite
              what a past job was sold for — so a page that re-derived any of
              them would be showing a number nobody was charged. */}
          <div className="bk-receipt" style={{ marginTop: 12 }}>
            {/* **THE PRICES GO WITH THE REST OF THE ITEMISATION, AND UNTIL
                2026-09-11 THEY DID NOT.** The guard above suppressed the size,
                travel and adjustment lines when the figures did not reconcile,
                and left these two printing their prices — so the degrade path
                removed exactly the lines that EXPLAIN the gap and kept the
                ones that CREATE it.
                Measured on a booking made through the real booking page: three
                priced lines reading $255.00, $110.00 and $45.00 above a total
                of $390.00. Adding those up is the first thing a person does
                with a receipt, and they get $410.
                The comment above always said the intent — *"show the services
                and the total and nothing in between"* — and "the services"
                means WHICH ONES, not what each cost. Names are still the
                detail he asked for in review item 15; a price that is not part
                of the total is not detail, it is a contradiction. */}
            {(booking.services ?? []).map((sv, i) => (
              <div className="line" key={`s${sv.service_id ?? i}`}>
                <span>{sv.name_at_booking}</span>
                {itemised && <span className="bk-price">{money(sv.price_at_booking)}</span>}
              </div>
            ))}
            {(booking.add_ons ?? []).map((a, i) => (
              <div className="line" key={`a${a.add_on_id ?? i}`}>
                <span>{a.add_on?.name ?? t("Add-on")}</span>
                {itemised && <span className="bk-price">{money(a.add_on?.price ?? 0)}</span>}
              </div>
            ))}
            {itemised && sizeIsSeparate && booking.vehicle_size_fee > 0 && (
              <div className="line dim">
                <span>{t("Vehicle size")}</span>
                <span className="bk-price">{money(booking.vehicle_size_fee)}</span>
              </div>
            )}
            {itemised && booking.travel_fee > 0 && (
              <div className="line dim">
                <span>{booking.travel_zone
                  ? t("Travel · {zone}", { zone: booking.travel_zone })
                  : t("Travel")}</span>
                <span className="bk-price">{money(booking.travel_fee)}</span>
              </div>
            )}
            {/* The detailer's own word for each surcharge, snapshotted with
                the amount, so a renamed or deleted rule cannot turn last
                month's receipt into a blank line. */}
            {(itemised ? adjustments : []).map((adj, i) => (
              <div className="line dim" key={`x${i}`}>
                <span>{adj.label}</span>
                <span className="bk-price">{money(adj.amount)}</span>
              </div>
            ))}
            {/* THE SITE-WIDE SALE, WHICH HAD NO LINE AT ALL. It is not stored
                on the booking — only the already-discounted subtotal is — so
                it is what the parts exceed the subtotal by. Drawn only when
                that number is positive, and `Discount` is the same neutral
                word the promo line falls back to, because the row cannot say
                which sale it was. */}
            {itemised && shownDiscount > 0 && (
              <div className="line dim">
                <span>{t("Discount")}</span>
                <span className="bk-price">-{money(shownDiscount / 100)}</span>
              </div>
            )}
            {booking.monthly_plan_discount > 0 && (
              <div className="line dim">
                <span>{t("Your plan")}</span>
                <span className="bk-price">-{money(booking.monthly_plan_discount)}</span>
              </div>
            )}
            {booking.promo_discount > 0 && (
              <div className="line dim">
                <span>{booking.applied_promo_code
                  ? t("Promo {code}", { code: booking.applied_promo_code })
                  : t("Discount")}</span>
                <span className="bk-price">-{money(booking.promo_discount)}</span>
              </div>
            )}
            {/* NO "ROUNDED" LINE EITHER — 2026-09-11, matching the checkout.
                An outside review objected to `Rounding` as a price row on the
                booking page, and the objection is just as true here: a
                fee-shaped row for something that is not a fee reads as the
                business adjusting the number after the fact. The rounding is
                folded into the discount above so the lines still reach the
                total exactly, and where there is no discount to fold it into
                it is a sentence under the total instead. */}
                        <div className="line total">
              <strong>{isFinal ? t("Final total") : t("Estimated total")}</strong>
              <strong className="bk-price" style={{ fontSize: "1.3rem" }}>
                {money(booking.final_amount ?? booking.total_price)}
              </strong>
            </div>
            {/* The one case the fold cannot cover: a business that rounds and
                ran no sale, so there is no discount line to absorb it. A
                sentence, not a price row. */}
            {roundedOnly !== 0 && (
              <p className="bk-muted" style={{ marginTop: 6 }}>
                {roundedOnly > 0
                  ? t("Rounded down to the nearest dollar.")
                  : t("Rounded up to the nearest dollar.")}
              </p>
            )}
          </div>

          {/* WHAT THEY TYPED IN, SO THEY CAN CHECK IT. A customer who spots
              their own phone number wrong on this page fixes it with one
              call; one who cannot see it finds out when nobody arrives.
              `.filter(Boolean)` throughout — an empty line reads as a missing
              detail rather than as a detail they did not give. */}
          <div className="bk-receipt" style={{ marginTop: 12 }}>
            <div className="line dim">
              <span>{t("Name")}</span><span>{booking.customer_name}</span>
            </div>
            {booking.customer_phone && (
              <div className="line dim">
                <span>{t("Phone")}</span><span>{phone(booking.customer_phone)}</span>
              </div>
            )}
            {booking.customer_email && (
              <div className="line dim">
                <span>{t("Email")}</span>
                <span style={{ overflowWrap: "anywhere" }}>{booking.customer_email}</span>
              </div>
            )}
            {vehicleLine && (
              <div className="line dim">
                <span>{t("Vehicle")}</span><span>{vehicleLine}</span>
              </div>
            )}
            {booking.customer_notes && (
              <div className="line dim">
                <span>{t("Your note")}</span>
                <span style={{ textAlign: "right" }}>{booking.customer_notes}</span>
              </div>
            )}
          </div>
          {isRequest && !isCancelled && (
            <p className="bk-muted" style={{ marginTop: 8 }}>
              {t("This time is held for you while {business} looks at it.", { business: business.name })}
            </p>
          )}
        </div>

        {/* ROADMAP 8.10 — THE OTHER APPOINTMENTS, WHEN THE CARS WENT ON
            DIFFERENT DAYS. One form made them and each one is a real
            appointment with its own day, its own reminder and its own page —
            so without this the customer is holding two links and neither one
            mentions the other, which reads as a double booking rather than as
            the thing they asked for.

            EACH ROW IS A LINK to that booking's own page, because moving or
            cancelling one car is the whole reason they are separate. */}
        {group.length > 0 && (
          <div className="bk-card" style={{ marginTop: 14 }}>
            <div className="bk-step-label">
              {group.length === 1
                ? t("Also booked · 1 more car")
                : t("Also booked · {n} more cars", { n: group.length })}
            </div>
            {group.map((g) => (
              <a className="bk-row between" key={g.id} href={`/booking/${g.id}`}
                style={{ marginTop: 8, textDecoration: "none", color: "inherit" }}>
                <span>
                  {new Date(`${g.booking_date}T12:00:00`).toLocaleDateString(loc, {
                    weekday: "short", month: "long", day: "numeric",
                  })} · {time12(g.start_time)}
                  <span className="bk-muted">
                    {` — ${[g.vehicle_model, g.vehicle_size_label].filter(Boolean).join(" ") || t("Vehicle")}`}
                  </span>
                </span>
                <span className="bk-price">{money(g.total_price)}</span>
              </a>
            ))}
            <p className="bk-muted" style={{ marginTop: 10 }}>
              {t("Each one can be changed or cancelled on its own.")}
            </p>
          </div>
        )}

        {/* THE QUOTE, AND IT IS ITS OWN CARD ON PURPOSE. It is a different
            number from the one above it, and the one above is still what the
            booking costs — putting the two in one card would leave the
            customer working out which they are being asked to agree to. */}
        {quote !== null && !isCancelled && !isPast && (
          <div className="bk-card" style={{ marginTop: 14 }}>
            <div className="bk-step-label">{t("A price from {business}", { business: business.name })}</div>
            <div className="bk-row between" style={{ marginTop: 6 }}>
              <span>{t("Their price")}</span>
              <strong className="bk-price">{money(quote)}</strong>
            </div>
            {booking.quoted_note && (
              <p className="bk-body" style={{ marginTop: 10 }}>{booking.quoted_note}</p>
            )}
            <button className="bk-btn primary" style={{ marginTop: 14 }}
              disabled={busy} onClick={acceptQuote}>
              <Check size={18} strokeWidth={2} /> {busy ? t("Saving…") : t("Accept {amount}", { amount: money(quote) })}
            </button>
            <p className="bk-muted" style={{ marginTop: 10 }}>
              {t("Not for you? Cancel below and the time goes back.")}
            </p>
          </div>
        )}

        {/* PAYING BY CARD — ITS OWN CARD, ABOVE THE ACTIONS.
            It is not in `.bk-actions` with the others because those three are
            about the APPOINTMENT (move it, save it, cancel it) and this one is
            about the money. Same reason the quote above has its own card: two
            different questions in one box leaves the customer working out
            which one the buttons belong to.

            IT IS DRAWN FROM THE SERVER'S ANSWER AND NOTHING ELSE. `card.ready`
            already accounts for the business having connected an account,
            Stripe having approved it, the detailer having switched it on, this
            booking not being paid, not being cancelled, not being a request
            nobody has accepted, and the amount clearing Stripe's 50c floor —
            `payability` in `_shared/connect.ts` is the one place that decides
            all of it, and the endpoint asks it again at the press. */}
        {justPaid ? (
          <div className="bk-card" style={{ marginTop: 14 }}>
            <div className="bk-step-label">{t("Paid")}</div>
            <p className="bk-body" style={{ marginTop: 6 }}>
              {t("Thank you. Your card payment went through and your receipt is on its way by email.")}
            </p>
          </div>
        ) : card?.ready && !isCancelled ? (
          <div className="bk-card" style={{ marginTop: 14 }}>
            <div className="bk-step-label">{t("Pay online")}</div>
            {/* THE FACT THE BUTTON CANNOT CARRY: that this is optional. A
                customer who has arranged to hand over cash must not read a Pay
                button as a demand — and the detailer's own handles are printed
                in the same email this link came from. */}
            <p className="bk-body" style={{ marginTop: 6 }}>
              {t("You can pay by card now if you like, or settle it with {business} on the day.",
                { business: business.name })}
            </p>
            <button className="bk-btn primary" style={{ marginTop: 14 }}
              disabled={paying} onClick={pay}>
              <CreditCard size={18} strokeWidth={2} />{" "}
              {paying ? t("Opening…") : t("Pay {amount} by card", { amount: money(card.amountCents / 100) })}
            </button>
            <p className="bk-muted" style={{ marginTop: 10 }}>
              {t("Card details are handled by Stripe. We never see them.")}
            </p>
          </div>
        ) : null}

        {error && <div className="bk-error">{error}</div>}

        {isCancelled ? (
          <div className="bk-note">
            {t("This booking is cancelled. You’re welcome to book again any time.")}
            <div style={{ marginTop: 10 }}>
              <a className="bk-btn primary" href={`/book/${slug}`}>{t("Book again")}</a>
            </div>
          </div>
        ) : isPast ? (
          <div className="bk-note">{t("This appointment has already happened.")}</div>
        ) : mode === "reschedule" ? (
          <>
            <div className="bk-step-label" style={{ marginTop: 18 }}>{t("Pick a new time")}</div>
            {openDates.length === 0 && <p className="bk-muted">{t("No open times in the next few weeks.")}</p>}
            <div className="bk-slots" style={{ marginBottom: 12 }}>
              {openDates.slice(0, 14).map((d) => (
                <button key={d} className={`bk-chip ${pick.date === d ? "selected" : ""}`}
                  onClick={() => setPick({ date: d, time: "" })}>
                  {new Date(`${d}T12:00:00`).toLocaleDateString(loc, { month: "short", day: "numeric" })}
                </button>
              ))}
            </div>
            {pick.date && (
              <div className="bk-slots">
                {slotsForType(days[pick.date], booking.service_type).map((t) => (
                  <button key={t} className={`bk-chip ${pick.time === t ? "selected" : ""}`}
                    onClick={() => setPick((p) => ({ ...p, time: t }))}>
                    {time12(t)}
                  </button>
                ))}
              </div>
            )}
            <div className="bk-actions">
              <button className="bk-btn primary"
                disabled={busy || !pick.date || !pick.time} onClick={doReschedule}>
                {busy ? t("Moving…") : t("Move my booking")}
              </button>
              <button className="bk-btn ghost" onClick={() => setMode(null)}>
                {t("Never mind")}
              </button>
            </div>
          </>
        ) : confirmCancel ? (
          <div className="bk-note">
            <p className="bk-body">
              {/* **THE DATE AND THE TIME ARE PLACEHOLDERS, NOT MARKUP GLUED
                  INTO A SENTENCE.** English puts them mid-clause; Spanish does
                  not, and a translation that cannot move them is a translation
                  that reads as a machine's. The bold is lost, and that is the
                  trade — a sentence in the right order matters more here than
                  two emphasised words. */}
              {t("Cancel your appointment on {date} at {time}? The time goes back to whoever wants it, so we may not be able to give it back.",
                { date: dateLabel, time: time12(booking.start_time) })}
            </p>
            {/* Ringed, not bare: this is the button that actually does it. */}
            <button className="bk-btn danger" style={{ marginTop: 12 }}
              disabled={busy} onClick={doCancel}>
              {busy ? t("Cancelling…") : t("Yes, cancel it")}
            </button>
            <button className="bk-btn ghost" style={{ marginTop: 8 }} disabled={busy}
              onClick={() => setConfirmCancel(false)}>
              {t("Keep my booking")}
            </button>
          </div>
        ) : (
          // ONE block with three weights, not four peers. Filled = the thing
          // this page exists for; ringed = the useful extra; ringless, below a
          // rule = the ways out. See booking.css, ".bk-actions".
          <div className="bk-actions">
            {windowClosed ? (
              // The button would be refused by the server, so it isn't drawn.
              // The phone number is the thing that actually helps now.
              <div className="bk-note">
                {t("Changes and cancellations close {hours} hours before your appointment, so this one is now locked in.",
                  { hours: windowHours })}
                {noteCarriesContact
                  ? ` ${t("Get in touch and we'll sort it out:")}`
                  : ` ${t("Please get in touch and we'll sort it out.")}`}
                {/* Telling someone to make contact without giving them a way
                    to do it is not help. Whatever the business has, show it. */}
                {noteCarriesContact && (
                  <div className="bk-row" style={{ marginTop: 8, gap: 12, flexWrap: "wrap" }}>
                    {receiptBusiness.phone && (
                      <a className="bk-btn inline" href={`tel:${receiptBusiness.phone.replace(/[^+\d]/g, "")}`}>
                        {phone(receiptBusiness.phone)}
                      </a>
                    )}
                    {receiptBusiness.email && (
                      <a className="bk-btn inline" href={`mailto:${receiptBusiness.email}`}>
                        {receiptBusiness.email}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // The one filled thing on the screen, and it is the reason the
              // page exists: moving an appointment without ringing anybody.
              // UNLESS A QUOTE IS OUT (roadmap 2.12) — then the reason the page
              // is open is the price, and two filled buttons make the customer
              // choose between two things the page is equally insisting on.
              // Seen in the first screenshot of a quote on this page.
              /* AND A PAY BUTTON TAKES THE FILL THE SAME WAY A QUOTE DOES.
                 The rule is one filled thing per screen; when there is money
                 owed and a way to pay it, that is what the page is insisting
                 on, and two filled buttons make the customer choose between
                 two things the page says are equally the point. */
              <button className={`bk-btn${quote === null && !(card?.ready && !justPaid) ? " primary" : ""}`}
                disabled={busy} onClick={loadSlots}>
                <CalendarClock size={18} strokeWidth={2} /> {busy ? t("Loading…") : t("Change the time")}
              </button>
            )}

            <a className="bk-btn" href={icsUrl(booking.id, "customer")}>
              <Check size={18} strokeWidth={2} /> {t("Add to my calendar")}
            </a>

            {/* The whole row goes when the window is closed, and the "Call"
                button goes with it — the note above is already printing that
                number, so it was the same number twice in a row. Checked
                rather than assumed: receiptBusiness.phone (the receipt) and
                business.phone (the public-profile RPC) are both
                businesses.contact_phone, so there is no shape of the data
                where the note is empty and this button is not. */}
            {!windowClosed && (
              <div className="bk-exits">
                <button className="bk-btn danger bare" disabled={busy}
                  onClick={() => setConfirmCancel(true)}>
                  <X size={18} strokeWidth={2} /> {isRequest ? t("Cancel this request") : t("Cancel this booking")}
                </button>
                {business.phone && (
                  <a className="bk-btn ghost" href={`tel:${business.phone}`}>
                    <Phone size={18} strokeWidth={2} /> {t("Call")} {phone(business.phone)}
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
