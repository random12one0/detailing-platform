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

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CalendarClock, Check, Phone, X } from "lucide-react";
import { api, icsUrl, slotsForType } from "../lib/api.js";
import { money, time12 } from "../lib/format.js";
import { BookingBusinessProvider, useBookingBusiness } from "./BookingBusinessContext.jsx";
import "./booking.css";

export default function ManageBookingPage() {
  const { id } = useParams();
  const [state, setState] = useState({ status: "loading", booking: null, business: null });

  const load = useCallback(async () => {
    try {
      const r = await api.bookingReceipt(id);
      if (!r?.booking) throw new Error("not_found");
      setState({ status: "ready", booking: r.booking, business: r.business });
    } catch {
      setState({ status: "not_found", booking: null, business: null });
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
          <h1>Booking not found</h1>
          <p className="bk-muted">This link may be out of date, or the booking was removed.</p>
        </div>
      </div>
    );
  }

  // Hydrate the business context from the slug the receipt gave us, so the
  // page carries the same branding as the booking page.
  return (
    <BookingBusinessProvider slug={state.business.slug}>
      <ManageInner booking={state.booking} receiptBusiness={state.business} onChanged={load} />
    </BookingBusinessProvider>
  );
}

// receiptBusiness comes from get-booking-receipt, NOT from the public
// profile RPC. The RPC deliberately returns only name/slug/phone/timezone/
// service_area/dropoff_address, so cancellation_window_hours is not on it —
// reading the window off the context business silently yielded 0, which made
// the whole closed-window branch dead code. It is read from the receipt.
function ManageInner({ booking, receiptBusiness, onChanged }) {
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

  const dateLabel = new Date(`${booking.booking_date}T12:00:00`).toLocaleDateString("en-US", {
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
      });
      setDays(r.days ?? {});
      setMode("reschedule");
    } catch (e) {
      setError(e.message || "Could not load available times.");
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
            <div className="tagline">{isRequest ? "Your request" : "Your booking"}</div>
          </div>
        </div>
      </header>

      <div className="bk-wrap" style={{ paddingBottom: 40 }}>
        <div className="bk-card" style={{ marginTop: 18 }}>
          <div className="bk-step-label">
            {isCancelled ? "Cancelled" : isRequest ? "Waiting to be accepted" : "Confirmed"}
          </div>
          <h3 style={{ textDecoration: isCancelled ? "line-through" : "none" }}>{dateLabel}</h3>
          <p className="bk-muted">{time12(booking.start_time)} – {time12(booking.end_time)}</p>
          {services.length > 0 && (
            <p className="bk-body" style={{ marginTop: 8 }}>{services.join(" · ")}</p>
          )}
          <p className="bk-muted" style={{ marginTop: 6 }}>
            {booking.service_type === "mobile"
              ? `We come to ${booking.customer_address || "you"}`
              : `Drop-off${business.dropoff_address ? ` at ${business.dropoff_address}` : ""}`}
          </p>
          <div className="bk-row between" style={{ marginTop: 10 }}>
            <span>Estimated total</span>
            <strong className="bk-price">{money(booking.final_amount ?? booking.total_price)}</strong>
          </div>
          {isRequest && !isCancelled && (
            <p className="bk-muted" style={{ marginTop: 8 }}>
              This time is held for you while {business.name} looks at it.
            </p>
          )}
        </div>

        {/* THE QUOTE, AND IT IS ITS OWN CARD ON PURPOSE. It is a different
            number from the one above it, and the one above is still what the
            booking costs — putting the two in one card would leave the
            customer working out which they are being asked to agree to. */}
        {quote !== null && !isCancelled && !isPast && (
          <div className="bk-card" style={{ marginTop: 14 }}>
            <div className="bk-step-label">A price from {business.name}</div>
            <div className="bk-row between" style={{ marginTop: 6 }}>
              <span>Their price</span>
              <strong className="bk-price">{money(quote)}</strong>
            </div>
            {booking.quoted_note && (
              <p className="bk-body" style={{ marginTop: 10 }}>{booking.quoted_note}</p>
            )}
            <button className="bk-btn primary" style={{ marginTop: 14 }}
              disabled={busy} onClick={acceptQuote}>
              <Check size={18} strokeWidth={2} /> {busy ? "Saving…" : `Accept ${money(quote)}`}
            </button>
            <p className="bk-muted" style={{ marginTop: 10 }}>
              Not for you? Cancel below and the time goes back.
            </p>
          </div>
        )}

        {error && <div className="bk-error">{error}</div>}

        {isCancelled ? (
          <div className="bk-note">
            This booking is cancelled. You’re welcome to book again any time.
            <div style={{ marginTop: 10 }}>
              <a className="bk-btn primary" href={`/book/${slug}`}>Book again</a>
            </div>
          </div>
        ) : isPast ? (
          <div className="bk-note">This appointment has already happened.</div>
        ) : mode === "reschedule" ? (
          <>
            <div className="bk-step-label" style={{ marginTop: 18 }}>Pick a new time</div>
            {openDates.length === 0 && <p className="bk-muted">No open times in the next few weeks.</p>}
            <div className="bk-slots" style={{ marginBottom: 12 }}>
              {openDates.slice(0, 14).map((d) => (
                <button key={d} className={`bk-chip ${pick.date === d ? "selected" : ""}`}
                  onClick={() => setPick({ date: d, time: "" })}>
                  {new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
                {busy ? "Moving…" : "Move my booking"}
              </button>
              <button className="bk-btn ghost" onClick={() => setMode(null)}>
                Never mind
              </button>
            </div>
          </>
        ) : confirmCancel ? (
          <div className="bk-note">
            <p className="bk-body">
              Cancel your appointment on <strong>{dateLabel}</strong> at{" "}
              <strong>{time12(booking.start_time)}</strong>? The time goes back to
              whoever wants it, so we may not be able to give it back.
            </p>
            {/* Ringed, not bare: this is the button that actually does it. */}
            <button className="bk-btn danger" style={{ marginTop: 12 }}
              disabled={busy} onClick={doCancel}>
              {busy ? "Cancelling…" : "Yes, cancel it"}
            </button>
            <button className="bk-btn ghost" style={{ marginTop: 8 }} disabled={busy}
              onClick={() => setConfirmCancel(false)}>
              Keep my booking
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
                Changes and cancellations close {windowHours} hours before your
                appointment, so this one is now locked in.
                {noteCarriesContact
                  ? " Get in touch and we'll sort it out:"
                  : " Please get in touch and we'll sort it out."}
                {/* Telling someone to make contact without giving them a way
                    to do it is not help. Whatever the business has, show it. */}
                {noteCarriesContact && (
                  <div className="bk-row" style={{ marginTop: 8, gap: 12, flexWrap: "wrap" }}>
                    {receiptBusiness.phone && (
                      <a className="bk-btn inline" href={`tel:${receiptBusiness.phone.replace(/[^+\d]/g, "")}`}>
                        {receiptBusiness.phone}
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
              <button className={`bk-btn${quote === null ? " primary" : ""}`} disabled={busy} onClick={loadSlots}>
                <CalendarClock size={18} strokeWidth={2} /> {busy ? "Loading…" : "Change the time"}
              </button>
            )}

            <a className="bk-btn" href={icsUrl(booking.id, "customer")}>
              <Check size={18} strokeWidth={2} /> Add to my calendar
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
                  <X size={18} strokeWidth={2} /> {isRequest ? "Cancel this request" : "Cancel this booking"}
                </button>
                {business.phone && (
                  <a className="bk-btn ghost" href={`tel:${business.phone}`}>
                    <Phone size={18} strokeWidth={2} /> Call {business.phone}
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
