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
          <span className={`pill ${booking.status}`}>{booking.status.replace("_", " ")}</span>
          <span className={`pill ${booking.payment_status}`}>{booking.payment_status}</span>
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
                {booking.vehicle_size}
                {booking.vehicle_model ? ` · ${booking.vehicle_model}` : ""}
              </p>
              <p style={{ marginTop: 6 }}>
                Estimated {money(booking.total_price)}
                {booking.final_amount != null && <> · Final <strong>{money(booking.final_amount)}</strong></>}
              </p>
            </div>

            <div className="section-title">Contact</div>
            <div className="card stack" style={{ gap: 8 }}>
              <a className="btn" href={`tel:${booking.customer_phone}`}><Phone size={18} strokeWidth={2} /> Call {booking.customer_phone}</a>
              <button className="btn" onClick={openTextPicker}><MessageSquare size={18} strokeWidth={2} /> Text</button>
              {/* Works on Android AND iOS (the old app was Apple-Maps-only). */}
              {address && <a className="btn" href={mapsUrl(address)} target="_blank" rel="noreferrer"><Navigation size={18} strokeWidth={2} /> Navigate — {address}</a>}
              {/* One .ics implementation, served with the business's own
                  timezone stamped on it — or a pre-filled Google Calendar
                  event, per Preferences → Calendar. */}
              <a
                className="btn"
                href={calendarUrlFor(
                  { ...booking, service_name: (booking.services ?? [])[0]?.name_at_booking },
                  icsUrl(booking.id, "owner"),
                )}
                {...(loadPrefs().calendar === "google"
                  ? { target: "_blank", rel: "noreferrer" }
                  : {})}
              >
                <CalendarPlus size={18} strokeWidth={2} /> Add to calendar
              </a>
              {/* There was no way to keep a customer's number. A contact card
                  is the only route a web app has to the address book. */}
              {loadPrefs().contacts !== "off" && booking.customer_phone && (
                <button
                  className="btn"
                  onClick={() => saveContact({
                    name: booking.customer_name,
                    phone: booking.customer_phone,
                    email: booking.customer_email,
                    address: booking.customer_address,
                  })}
                >
                  <UserPlus size={18} strokeWidth={2} /> Add to contacts
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
              <button className="btn" disabled={busy} onClick={() => setEditing(true)}>Edit details / reschedule</button>
              <div className="grid2">
                {booking.status !== "completed" && (
                  <button className="btn" disabled={busy} onClick={() => setStatus("completed")}>Mark completed</button>
                )}
                {booking.status !== "no_show" && (
                  <button className="btn" disabled={busy} onClick={() => setStatus("no_show")}>No-show</button>
                )}
                {booking.status !== "cancelled" && (
                  <button className="btn" disabled={busy} onClick={() => setStatus("cancelled")}>Cancel</button>
                )}
                {booking.status === "cancelled" && (
                  <button className="btn" disabled={busy} onClick={() => setStatus("confirmed")}>Un-cancel</button>
                )}
              </div>
              <button className="btn danger" disabled={busy} onClick={softDelete}>Delete booking</button>
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
