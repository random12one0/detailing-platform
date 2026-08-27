// Booking rules — every value that used to be a hardcoded constant.
//
// Out-of-range values WARN but never block: a detailer who genuinely needs a
// week of notice can set it. Warnings can be dismissed for the session or
// permanently (stored per-browser). A live count of open slots over the next
// 7 days makes the effect of any change visible immediately.

import { useCallback, useEffect, useMemo, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { api } from "../../lib/api.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { addDays, todayLocal } from "../../lib/format.js";

const FIELDS = [
  { key: "buffer_minutes", label: "Buffer between jobs (minutes)", type: "number", sensible: [0, 120],
    warn: (v) => `A ${Math.round(v / 60 * 10) / 10}-hour buffer means very few slots will be available each day.` },
  { key: "min_advance_minutes", label: "Minimum advance notice (minutes)", type: "number", sensible: [0, 2880],
    warn: (v) => `Customers won't be able to book anything sooner than ${Math.round(v / 1440 * 10) / 10} days out.` },
  { key: "max_advance_days", label: "How far ahead customers can book (days, blank = no limit)", type: "number", nullable: true, sensible: [7, 365],
    warn: (v) => v < 7 ? "A very short window — customers can only book a few days ahead." : "A very long window — your calendar will be bookable years out." },
  { key: "slot_interval_minutes", label: "Slot interval (minutes)", type: "number", sensible: [15, 120],
    warn: (v) => v < 15 ? "Very fine slot grid — the time picker will be crowded." : "Very coarse slot grid — few start times will be offered." },
  { key: "max_bookings_per_day", label: "Max bookings per day (blank = unlimited)", type: "number", nullable: true, sensible: [1, 20],
    warn: () => "That cap is unusual — double-check it's what you want." },
  { key: "cancellation_window_hours", label: "Customers can cancel/reschedule online until (hours before)", type: "number", sensible: [0, 168],
    warn: (v) => `Customers can only self-cancel more than ${Math.round(v / 24)} days ahead — everything closer needs a phone call.` },
  { key: "customer_reminder_lead_minutes", label: "Customer reminder (minutes before)", type: "number", sensible: [30, 2880],
    warn: () => "An unusual reminder lead time." },
];

export default function BookingRules() {
  const { business, settings, reload } = useBusiness();
  const [form, setForm] = useState(() => {
    const f = {};
    for (const { key } of FIELDS) f[key] = settings?.[key] ?? "";
    f.mobile_enabled = settings?.mobile_enabled ?? true;
    f.dropoff_enabled = settings?.dropoff_enabled ?? true;
    f.ask_water_electric = settings?.ask_water_electric ?? true;
    f.travel_fee = settings?.travel_fee ?? "";
    f.travel_radius_miles = settings?.travel_radius_miles ?? "";
    f.evening_before_enabled = settings?.evening_before_enabled ?? true;
    return f;
  });
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("rule-warnings-dismissed") || "{}"); } catch { return {}; }
  });
  const [slotCount, setSlotCount] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const dismiss = (key, forever) => {
    const next = { ...dismissed, [key]: true };
    setDismissed(next);
    if (forever) localStorage.setItem("rule-warnings-dismissed", JSON.stringify(next));
  };

  const warnings = useMemo(() => {
    const out = [];
    for (const f of FIELDS) {
      const raw = form[f.key];
      if (raw === "" || raw === null || dismissed[f.key]) continue;
      const v = Number(raw);
      if (!Number.isFinite(v)) continue;
      if (v < f.sensible[0] || v > f.sensible[1]) out.push({ key: f.key, text: f.warn(v) });
    }
    if (!form.mobile_enabled && !form.dropoff_enabled && !dismissed.no_service_type) {
      out.push({ key: "no_service_type", text: "Both mobile and drop-off are off — customers can't book anything at all." });
    }
    return out;
  }, [form, dismissed]);

  // Live effect preview: total open slots over the next 7 days, straight
  // from the real availability engine, refreshed after every save.
  const refreshSlotCount = useCallback(async () => {
    try {
      const today = todayLocal(business.timezone);
      const r = await api.availableSlots(business.slug, {
        start_date: today,
        end_date: addDays(today, 6),
        duration_minutes: 120,
      });
      const total = Object.values(r.days || {}).reduce((s, d) => s + (d.slots?.length || 0), 0);
      setSlotCount(total);
    } catch {
      setSlotCount(null);
    }
  }, [business]);

  useEffect(() => { refreshSlotCount(); }, [refreshSlotCount]);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const num = (v) => (v === "" || v === null ? null : Number(v));
    const { error } = await supabase.from("business_settings").update({
      buffer_minutes: Number(form.buffer_minutes) || 0,
      min_advance_minutes: Number(form.min_advance_minutes) || 0,
      max_advance_days: num(form.max_advance_days),
      slot_interval_minutes: Number(form.slot_interval_minutes) || 30,
      max_bookings_per_day: num(form.max_bookings_per_day),
      cancellation_window_hours: Number(form.cancellation_window_hours) || 0,
      customer_reminder_lead_minutes: Number(form.customer_reminder_lead_minutes) || 0,
      mobile_enabled: form.mobile_enabled,
      dropoff_enabled: form.dropoff_enabled,
      ask_water_electric: form.ask_water_electric,
      evening_before_enabled: form.evening_before_enabled,
      travel_fee: num(form.travel_fee),
      travel_radius_miles: num(form.travel_radius_miles),
    }).eq("business_id", business.id);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Saved — slot preview updated below." });
    if (!error) {
      reload();
      refreshSlotCount();
    }
    setBusy(false);
  };

  const toggles = [
    ["mobile_enabled", "Offer mobile service (you go to them)"],
    ["dropoff_enabled", "Offer drop-off (they come to you)"],
    ["ask_water_electric", "Ask mobile customers about water & electric access"],
    ["evening_before_enabled", "Remind the evening before for early-morning jobs"],
  ];

  return (
    <div className="card">
      <div className="card row between" style={{ background: "var(--surface-2)" }}>
        <span className="muted">Open slots, next 7 days (2-hour job)</span>
        <span className="big">{slotCount === null ? "…" : slotCount}</span>
      </div>

      {FIELDS.map((f) => (
        <label className="field" key={f.key}>
          <span>{f.label}</span>
          <input type="number" inputMode="numeric" value={form[f.key] ?? ""}
            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
        </label>
      ))}

      <div className="grid2">
        <label className="field"><span>Travel fee ($, optional)</span>
          <input type="number" inputMode="decimal" value={form.travel_fee ?? ""}
            onChange={(e) => setForm({ ...form, travel_fee: e.target.value })} /></label>
        <label className="field"><span>Travel radius (miles, optional)</span>
          <input type="number" inputMode="decimal" value={form.travel_radius_miles ?? ""}
            onChange={(e) => setForm({ ...form, travel_radius_miles: e.target.value })} /></label>
      </div>

      {toggles.map(([key, label]) => (
        <label className="field row" key={key} style={{ alignItems: "center", gap: 10 }}>
          <input type="checkbox" checked={!!form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} style={{ width: 22 }} />
          <span style={{ margin: 0 }}>{label}</span>
        </label>
      ))}

      {warnings.map((w) => (
        <div className="warn-box" key={w.key}>
          <TriangleAlert size={16} strokeWidth={1.75} /> {w.text}
          <span className="actions">
            <button onClick={() => dismiss(w.key, false)}>Dismiss</button>
            <button onClick={() => dismiss(w.key, true)}>Never</button>
          </span>
        </div>
      ))}

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
      {/* Warnings never block: Save is always available. */}
      <button className="btn primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save rules"}</button>
    </div>
  );
}
