// Full booking detail + every action: status, edit, finalize payment,
// invoice, reminders, soft delete. Every booking WRITE goes through the
// update-booking edge function (validation + conflict checks server-side).

import { useState } from "react";
import { CalendarPlus, MessageSquare, Navigation, Phone, UserPlus, X } from "lucide-react";
import { api, icsUrl } from "../lib/api.js";
import { calendarUrlFor, loadPrefs, saveContact } from "../lib/platform.js";
import { supabase } from "../lib/supabase.js";
import { fillTemplate } from "../lib/templates.js";
import { dateLong, mapsUrl, money, time12 } from "../lib/format.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import FinalizeModal from "./FinalizeModal.jsx";
import Sheet from "./Sheet.jsx";

// One vocabulary for the values a person reads, so the same booking does
// not say "completed" in the sheet and "Completed" on the card, or show the
// database's own word for a vehicle size.
const STATUS_LABELS = {
  confirmed: "Confirmed", completed: "Completed",
  cancelled: "Cancelled", no_show: "No-show", pending: "Pending",
};
const PAY_LABELS = {
  paid: "Paid", pending: "Unpaid", partial: "Part paid", waived: "Waived",
};
// W9 — sizes are the detailer's own list now, so a booking carries the LABEL
// it was taken at (bookings.vehicle_size_label). This map is the fallback for
// rows taken before that column existed; a key we do not know is de-slugged
// rather than printed raw.
const SIZE_LABELS = { small: "Small", medium: "Medium", large: "Large" };
const sizeLabel = (b) => b.vehicle_size_label
  || SIZE_LABELS[b.vehicle_size]
  || String(b.vehicle_size || "").replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase());
// W27. Shown only when it was asked — null means "not asked", which is a
// different fact from a clean car.
const CONDITION_LABELS = {
  light: "Light dirt", moderate: "Moderately dirty", heavy: "Heavily soiled", extreme: "Extreme",
};

export default function BookingDetail({ booking, onClose, onChanged }) {
  const { business } = useBusiness();
  const [templates, setTemplates] = useState([]);
  const [pickingText, setPickingText] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [form, setForm] = useState({
    customer_name: booking.customer_name,
    customer_phone: booking.customer_phone,
    customer_email: booking.customer_email || "",
    customer_address: booking.customer_address || "",
    booking_date: booking.booking_date,
    start_time: booking.start_time,
    admin_notes: booking.admin_notes || "",
  });

  const act = async (fn, doneMsg) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      if (doneMsg) setNotice(doneMsg);
      onChanged?.();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  const setStatus = (status) =>
    act(() => api.updateBooking(business.id, { booking_id: booking.id, status }), `Marked ${status}.`);

  const saveEdit = () =>
    act(async () => {
      await api.updateBooking(business.id, {
        booking_id: booking.id,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_email: form.customer_email || null,
        customer_address: form.customer_address || null,
        booking_date: form.booking_date,
        start_time: form.start_time,
        admin_notes: form.admin_notes || null,
      });
      setEditing(false);
    }, "Saved.");

  const softDelete = () =>
    act(async () => {
      if (!confirm("Delete this booking? It is hidden, not destroyed, and can be restored by support.")) return;
      await api.softDeleteBooking(business.id, booking.id);
      onClose?.();
    });

  const address =
    booking.service_type === "mobile" && booking.customer_address
      ? booking.customer_address
      : business.dropoff_address;

  // Prefilled texts, loaded only when the owner opens the picker.
  const openTextPicker = async () => {
    const { data } = await supabase
      .from("message_templates").select("*")
      .eq("business_id", business.id).order("sort_order");
    setTemplates(data ?? []);
    setPickingText(true);
  };
  const smsHref = (body) =>
    `sms:${booking.customer_phone}${/iPhone|iPad|Mac/.test(navigator.userAgent) ? "&" : "?"}body=${encodeURIComponent(body)}`;
  const filled = (body) =>
    fillTemplate(body, {
      booking, business,
      dateLabel: dateLong(booking.booking_date),
      timeLabel: time12(booking.start_time),
      address: address || "",
      total: money(booking.final_amount ?? booking.total_price),
    });

  return (
    <Sheet onClose={onClose} title={booking.customer_name}
      subtitle={`${dateLong(booking.booking_date)} · ${time12(booking.start_time)} – ${time12(booking.end_time)}`}>
        {/* The date and time live in the sheet's own header now, so they are
            not repeated here. */}
        <div className="row wrap" style={{ gap: 6 }}>
          {/* These read as raw enum values — lowercase here, title case on
              the card for the same booking. One vocabulary, one casing. */}
          <span className={`pill ${booking.status}`}>{STATUS_LABELS[booking.status] ?? booking.status}</span>
          <span className={`pill ${booking.payment_status}`}>
            {PAY_LABELS[booking.payment_status] ?? booking.payment_status}
          </span>
        </div>

        {error && <div className="error-box">{error}</div>}
        {notice && <div className="ok-box">{notice}</div>}

        {!editing ? (
          <>
            <div className="section-title">Job</div>
            <div className="card">
              <p>{booking.service_type === "mobile" ? "Mobile — we go to them" : "Drop-off"}</p>
              <p className="muted">
                {(booking.services ?? []).map((s) => s.name_at_booking).join(", ")}
                {(booking.booking_add_ons ?? []).length > 0 &&
                  ` + ${(booking.booking_add_ons ?? []).map((a) => a.add_on?.name).filter(Boolean).join(", ")}`}
              </p>
              <p className="muted">
                {sizeLabel(booking)}
                {booking.vehicle_model ? ` · ${booking.vehicle_model}` : ""}
                {CONDITION_LABELS[booking.vehicle_condition]
                  ? ` · ${CONDITION_LABELS[booking.vehicle_condition]}` : ""}
              </p>
              {/* W22 — what they can supply at the address, and only for a
                  mobile job. Written as what you have to BRING, because that
                  is the decision this answer feeds. */}
              {booking.service_type === "mobile" && (booking.has_water === false || booking.has_power === false) && (
                <p className="muted">
                  Bring your own {[
                    booking.has_water === false ? "water" : null,
                    booking.has_power === false ? "power" : null,
                  ].filter(Boolean).join(" and ")}
                </p>
              )}
              <p style={{ marginTop: 6 }}>
                Estimated {money(booking.total_price)}
                {booking.final_amount != null && <> · Final <strong>{money(booking.final_amount)}</strong></>}
              </p>
            </div>

            <div className="section-title">Contact</div>
            {/* Four stacked full-width buttons took about 290px to do what
                the job card does in one 46px row — and Navigate wrapped onto
                two lines because the address was inside the label. The
                address is a line of text; the actions are a row. */}
            {address && <p className="quiet" style={{ marginBottom: 8 }}>{address}</p>}
            <div className="actions-row">
              <a className="btn sm" href={`tel:${booking.customer_phone}`}>
                <Phone size={18} strokeWidth={2} /> Call
              </a>
              <button className="btn sm" onClick={openTextPicker}>
                <MessageSquare size={18} strokeWidth={2} /> Text
              </button>
              {address && (
                <a className="btn sm" href={mapsUrl(address)} target="_blank" rel="noreferrer">
                  <Navigation size={18} strokeWidth={2} /> Navigate
                </a>
              )}
            </div>
            <div className="actions-row" style={{ marginTop: 8 }}>
              <a
                className="btn sm"
                href={calendarUrlFor(
                  { ...booking, service_name: (booking.services ?? [])[0]?.name_at_booking },
                  icsUrl(booking.id, "owner"),
                )}
                {...(loadPrefs().calendar === "google"
                  ? { target: "_blank", rel: "noreferrer" }
                  : {})}
              >
                <CalendarPlus size={18} strokeWidth={2} /> Calendar
              </a>
              {loadPrefs().contacts !== "off" && booking.customer_phone && (
                <button
                  className="btn sm"
                  onClick={() => saveContact({
                    name: booking.customer_name,
                    phone: booking.customer_phone,
                    email: booking.customer_email,
                    address: booking.customer_address,
                  })}
                >
                  <UserPlus size={18} strokeWidth={2} /> Contacts
                </button>
              )}
            </div>

            {(booking.customer_notes || booking.admin_notes) && (
              <>
                <div className="section-title">Notes</div>
                <div className="card">
                  {booking.customer_notes && <p><span className="muted">Customer:</span> {booking.customer_notes}</p>}
                  {booking.admin_notes && <p><span className="muted">Private:</span> {booking.admin_notes}</p>}
                </div>
              </>
            )}

            <div className="section-title">Actions</div>
            <div className="stack" style={{ gap: 8 }}>
              {booking.status === "confirmed" && (
                <button className="btn primary" disabled={busy} onClick={() => setFinalizing(true)}>
                  Finalize payment
                </button>
              )}
              {booking.final_amount != null && booking.customer_email && (
                <button className="btn" disabled={busy}
                  onClick={() => act(() => api.sendInvoice(business.id, booking.id), "Invoice + thank-you sent.")}>
                  Email invoice
                </button>
              )}
              {booking.customer_email && (
                <button className="btn" disabled={busy}
                  onClick={() => act(() => api.sendReminder(business.id, booking.id, "customer"), "Reminder sent to customer.")}>
                  Send customer reminder
                </button>
              )}
              <button className="btn" disabled={busy} onClick={() => setEditing(true)}>Change time or details</button>
              <div className="grid2">
                {booking.status !== "completed" && (
                  <button className="btn" disabled={busy} onClick={() => setStatus("completed")}>Mark completed</button>
                )}
                {booking.status !== "no_show" && (
                  <button className="btn" disabled={busy} onClick={() => setStatus("no_show")}>Didn’t show up</button>
                )}
                {booking.status !== "cancelled" && (
                  <button className="btn" disabled={busy} onClick={() => setStatus("cancelled")}>Cancel the job</button>
                )}
                {booking.status === "cancelled" && (
                  <button className="btn" disabled={busy} onClick={() => setStatus("confirmed")}>Un-cancel</button>
                )}
              </div>
              {/* Delete used to be the biggest, reddest thing in the sheet —
                  the rarest action given the most weight, sitting beside two
                  others with no stated difference. Cancelling is what a
                  detailer nearly always means, so deleting hides behind it
                  and says what it does that cancelling doesn't. */}
              <details className="disclose">
                <summary>Remove this from my records too</summary>
                <p className="quiet" style={{ margin: "0 0 10px" }}>
                  Cancelling frees the slot and keeps the job in your history.
                  Removing takes it out of your records and your totals as well.
                  It cannot be undone.
                </p>
                <button className="btn danger" disabled={busy} onClick={softDelete}>
                  Remove from records
                </button>
              </details>
            </div>
          </>
        ) : (
          <>
            <div className="section-title">Edit</div>
            <label className="field"><span>Name</span>
              <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></label>
            <label className="field"><span>Phone</span>
              <input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></label>
            <label className="field"><span>Email</span>
              <input value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} /></label>
            <label className="field"><span>Address</span>
              <input value={form.customer_address} onChange={(e) => setForm({ ...form, customer_address: e.target.value })} /></label>
            <div className="grid2">
              <label className="field"><span>Date</span>
                <input type="date" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} /></label>
              <label className="field"><span>Start</span>
                <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></label>
            </div>
            <label className="field"><span>Private notes</span>
              <textarea value={form.admin_notes} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} /></label>
            <p className="muted" style={{ marginBottom: 8 }}>
              Date/time changes are re-checked against your hours, blockouts and other jobs — a conflicting move is rejected, not silently saved.
            </p>
            <div className="grid2">
              <button className="btn" onClick={() => setEditing(false)}>Back</button>
              <button className="btn primary" disabled={busy} onClick={saveEdit}>Save</button>
            </div>
          </>
        )}

        {pickingText && (
          <Sheet onClose={() => setPickingText(false)} title="Send a text" peek={48}>
            <div className="tight">
              {templates.length === 0 && (
                <div className="dashed">No templates yet. Add them in More, under Message templates.</div>
              )}
              {templates.map((t) => (
                <a key={t.id} className="card tappable" href={smsHref(filled(t.body))}
                   style={{ display: "block", color: "inherit" }}>
                  <div className="strong">{t.label}</div>
                  <div className="quiet" style={{ marginTop: 4 }}>{filled(t.body)}</div>
                </a>
              ))}
              <a className="btn" href={`sms:${booking.customer_phone}`}>Write my own</a>
            </div>
          </Sheet>
        )}

        {finalizing && (
          <FinalizeModal
            booking={booking}
            onClose={() => setFinalizing(false)}
            onDone={() => {
              setFinalizing(false);
              onChanged?.();
            }}
          />
        )}
    </Sheet>
  );
}
