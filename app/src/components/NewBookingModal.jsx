// Owner-created booking. Goes through the SAME create-booking edge function
// as a customer booking (the old NewBookingModal wrote straight to the
// table, skipping every server-side guard) — so hours, blockouts, buffer,
// advance rules and pricing all apply, and slots come from available-slots.

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { api } from "../lib/api.js";
import { supabase } from "../lib/supabase.js";
import { money, time12, todayLocal } from "../lib/format.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import Sheet from "./Sheet.jsx";
import { Segmented } from "./controls.jsx";

export default function NewBookingModal({ onClose, onCreated, initialDate }) {
  const { business } = useBusiness();
  const [catalog, setCatalog] = useState({ services: [], addOns: [] });
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_address: "",
    service_type: "mobile",
    vehicle_size: "small",
    vehicle_model: "",
    service_ids: [],
    add_ons: [],
    booking_date: initialDate || todayLocal(business.timezone),
    start_time: "",
    admin_notes: "",
  });
  const [quote, setQuote] = useState(null);
  const [slots, setSlots] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const [s, a] = await Promise.all([
        supabase.from("services").select("*").eq("business_id", business.id).eq("is_active", true).order("sort_order"),
        supabase.from("add_ons").select("*").eq("business_id", business.id).eq("is_active", true).order("sort_order"),
      ]);
      setCatalog({ services: s.data ?? [], addOns: a.data ?? [] });
    })();
  }, [business.id]);

  // Quote + slots re-derive from the server whenever the selection changes.
  const selKey = useMemo(
    () => JSON.stringify([form.service_ids, form.add_ons, form.vehicle_size, form.booking_date]),
    [form.service_ids, form.add_ons, form.vehicle_size, form.booking_date],
  );
  useEffect(() => {
    if (!form.service_ids.length) {
      setQuote(null);
      setSlots(null);
      return;
    }
    let stale = false;
    (async () => {
      try {
        const q = await api.calculateBooking(business.slug, {
          service_ids: form.service_ids,
          add_ons: form.add_ons,
          vehicle_size: form.vehicle_size,
        });
        if (stale) return;
        setQuote(q.quote);
        const s = await api.availableSlots(business.slug, {
          booking_date: form.booking_date,
          duration_minutes: q.quote.total_duration,
        });
        if (!stale) setSlots(s.slots ?? []);
      } catch (e) {
        if (!stale) setError(e.message);
      }
    })();
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey, business.slug]);

  const toggle = (key, id) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id],
    }));

  const create = async () => {
    setBusy(true);
    setError("");
    try {
      await api.createBooking(business.slug, {
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_email: form.customer_email || null,
        customer_address: form.customer_address || null,
        service_type: form.service_type,
        vehicle_size: form.vehicle_size,
        vehicle_model: form.vehicle_model || null,
        service_ids: form.service_ids,
        add_ons: form.add_ons,
        booking_date: form.booking_date,
        start_time: form.start_time,
        admin_notes: form.admin_notes || null,
      });
      onCreated?.();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <Sheet onClose={onClose} title="New booking">

        <label className="field"><span>Customer name</span>
          <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></label>
        <div className="grid2">
          <label className="field"><span>Phone</span>
            <input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></label>
          <label className="field"><span>Email (optional)</span>
            <input value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} /></label>
        </div>
        <div className="grid2">
          <label className="field"><span>Type</span>
            {/* Two options do not need an OS wheel; the app already solves
                this with Segmented in Booking rules. */}
            <Segmented value={form.service_type}
              onChange={(v) => setForm({ ...form, service_type: v })}
              options={[["mobile", "Mobile"], ["dropoff", "Drop-off"]]} /></label>
          <label className="field"><span>Vehicle size</span>
            <Segmented value={form.vehicle_size}
              onChange={(v) => setForm({ ...form, vehicle_size: v })}
              options={[["small", "Small"], ["medium", "Medium"], ["large", "Large"]]} /></label>
        </div>
        {form.service_type === "mobile" && (
          <label className="field"><span>Address</span>
            <input value={form.customer_address} onChange={(e) => setForm({ ...form, customer_address: e.target.value })} /></label>
        )}

        <div className="section-title">Services</div>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          {catalog.services.map((s) => (
            <button key={s.id} className={`chip ${form.service_ids.includes(s.id) ? "active" : ""}`}
              onClick={() => toggle("service_ids", s.id)}>
              {s.name} · {money(s.price)}
            </button>
          ))}
          {catalog.services.length === 0 && <p className="muted">No active services yet. Add them in the More tab under Services.</p>}
        </div>
        {catalog.addOns.length > 0 && (
          <>
            <div className="section-title">Add-ons</div>
            <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              {catalog.addOns.map((a) => (
                <button key={a.id} className={`chip ${form.add_ons.includes(a.id) ? "active" : ""}`}
                  onClick={() => toggle("add_ons", a.id)}>
                  {a.name} · {money(a.price)}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="section-title">When</div>
        <label className="field"><span>Date</span>
          <input type="date" value={form.booking_date}
            onChange={(e) => setForm({ ...form, booking_date: e.target.value, start_time: "" })} /></label>
        {slots && (
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            {slots.map((s) => (
              <button key={s} className={`chip ${form.start_time === s ? "active" : ""}`}
                onClick={() => setForm({ ...form, start_time: s })}>
                {time12(s)}
              </button>
            ))}
            {slots.length === 0 && <p className="muted">No open slots that day.</p>}
          </div>
        )}

        <label className="field" style={{ marginTop: 12 }}><span>Private notes</span>
          <input value={form.admin_notes} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} /></label>

        {quote && (
          <div className="card row between">
            <span>Estimated total</span>
            <strong>{money(quote.total)}</strong>
          </div>
        )}
        {error && <div className="error-box">{error}</div>}
        <button className="btn primary" disabled={busy || !form.start_time || !form.customer_name || !form.customer_phone}
          onClick={create}>
          {busy ? "Booking…" : "Create booking"}
        </button>
    </Sheet>
  );
}
