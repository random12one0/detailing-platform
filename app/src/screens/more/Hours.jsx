// Weekly hours, one-off date overrides, and blockout dates. Direct DB writes
// through RLS (settings-style data — deliberately not over-engineered).

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { todayLocal } from "../../lib/format.js";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Hours() {
  const { business } = useBusiness();
  const [week, setWeek] = useState(null); // {0..6: {open_time, close_time} | null}
  const [overrides, setOverrides] = useState([]);
  const [blockouts, setBlockouts] = useState([]);
  const [ovForm, setOvForm] = useState({ date: todayLocal(business.timezone), open_time: "", close_time: "", notes: "" });
  const [blForm, setBlForm] = useState({ event_name: "", start_date: todayLocal(business.timezone), end_date: todayLocal(business.timezone), all_day: true, start_time: "", end_time: "" });
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const [h, o, b] = await Promise.all([
      supabase.from("business_hours").select("*").eq("business_id", business.id),
      supabase.from("booking_hours_overrides").select("*").eq("business_id", business.id).gte("date", todayLocal(business.timezone)).order("date"),
      supabase.from("blockout_dates").select("*").eq("business_id", business.id).gte("end_date", todayLocal(business.timezone)).order("start_date"),
    ]);
    const map = {};
    for (let i = 0; i < 7; i++) map[i] = null;
    for (const row of h.data ?? []) map[row.weekday] = row;
    setWeek(map);
    setOverrides(o.data ?? []);
    setBlockouts(b.data ?? []);
  }, [business.id, business.timezone]);

  useEffect(() => { load(); }, [load]);

  const saveDay = async (wd, open_time, close_time) => {
    setMsg(null);
    const { error } = await supabase.from("business_hours").upsert({
      business_id: business.id,
      weekday: wd,
      open_time: open_time || null,
      close_time: close_time || null,
    });
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Hours saved." });
    load();
  };

  const addOverride = async () => {
    setMsg(null);
    const { error } = await supabase.from("booking_hours_overrides").upsert({
      business_id: business.id,
      date: ovForm.date,
      open_time: ovForm.open_time || null,
      close_time: ovForm.close_time || null,
      notes: ovForm.notes || null,
    }, { onConflict: "business_id,date" });
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Special hours saved." });
    load();
  };

  const addBlockout = async () => {
    if (!blForm.event_name.trim()) return;
    setMsg(null);
    const { error } = await supabase.from("blockout_dates").insert({
      business_id: business.id,
      event_name: blForm.event_name.trim(),
      start_date: blForm.start_date,
      end_date: blForm.end_date,
      all_day: blForm.all_day,
      start_time: blForm.all_day ? null : blForm.start_time || null,
      end_time: blForm.all_day ? null : blForm.end_time || null,
    });
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Blockout added." });
    setBlForm({ ...blForm, event_name: "" });
    load();
  };

  if (!week) return <div className="spinner" />;

  return (
    <div className="card">
      <div className="section-title">Weekly hours (blank = closed)</div>
      {DAYS.map((label, wd) => (
        <DayRow key={wd} label={label} row={week[wd]} onSave={(o, c) => saveDay(wd, o, c)} />
      ))}

      <div className="section-title">Special hours for one date</div>
      <div className="grid2">
        <label className="field"><span>Date</span>
          <input type="date" value={ovForm.date} onChange={(e) => setOvForm({ ...ovForm, date: e.target.value })} /></label>
        <label className="field"><span>Note</span>
          <input value={ovForm.notes} onChange={(e) => setOvForm({ ...ovForm, notes: e.target.value })} /></label>
      </div>
      <div className="grid2">
        <label className="field"><span>Open (blank = closed)</span>
          <input type="time" value={ovForm.open_time} onChange={(e) => setOvForm({ ...ovForm, open_time: e.target.value })} /></label>
        <label className="field"><span>Close</span>
          <input type="time" value={ovForm.close_time} onChange={(e) => setOvForm({ ...ovForm, close_time: e.target.value })} /></label>
      </div>
      <button className="btn" onClick={addOverride}>Save special hours</button>
      {overrides.map((o) => (
        <div className="card row between" key={o.id}>
          <span>{o.date} · {o.open_time ? `${o.open_time.slice(0, 5)}–${o.close_time?.slice(0, 5)}` : "closed"}{o.notes ? ` · ${o.notes}` : ""}</span>
          <button className="btn ghost inline" onClick={async () => {
            await supabase.from("booking_hours_overrides").delete().eq("id", o.id).eq("business_id", business.id);
            load();
          }}>✕</button>
        </div>
      ))}

      <div className="section-title">Blockouts (vacations, appointments)</div>
      <label className="field"><span>Name</span>
        <input value={blForm.event_name} onChange={(e) => setBlForm({ ...blForm, event_name: e.target.value })} placeholder="e.g. Vacation" /></label>
      <div className="grid2">
        <label className="field"><span>From</span>
          <input type="date" value={blForm.start_date} onChange={(e) => setBlForm({ ...blForm, start_date: e.target.value })} /></label>
        <label className="field"><span>To</span>
          <input type="date" value={blForm.end_date} onChange={(e) => setBlForm({ ...blForm, end_date: e.target.value })} /></label>
      </div>
      <label className="field row" style={{ alignItems: "center", gap: 10 }}>
        <input type="checkbox" checked={blForm.all_day} onChange={(e) => setBlForm({ ...blForm, all_day: e.target.checked })} style={{ width: 22 }} />
        <span style={{ margin: 0 }}>All day</span>
      </label>
      {!blForm.all_day && (
        <div className="grid2">
          <label className="field"><span>From time</span>
            <input type="time" value={blForm.start_time} onChange={(e) => setBlForm({ ...blForm, start_time: e.target.value })} /></label>
          <label className="field"><span>To time</span>
            <input type="time" value={blForm.end_time} onChange={(e) => setBlForm({ ...blForm, end_time: e.target.value })} /></label>
        </div>
      )}
      <button className="btn" onClick={addBlockout}>Add blockout</button>
      {blockouts.map((b) => (
        <div className="card row between" key={b.id}>
          <span>{b.event_name} · {b.start_date}{b.end_date !== b.start_date ? `→${b.end_date}` : ""}{!b.all_day && b.start_time ? ` · ${b.start_time.slice(0, 5)}–${b.end_time?.slice(0, 5)}` : ""}</span>
          <button className="btn ghost inline" onClick={async () => {
            await supabase.from("blockout_dates").delete().eq("id", b.id).eq("business_id", business.id);
            load();
          }}>✕</button>
        </div>
      ))}

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
    </div>
  );
}

function DayRow({ label, row, onSave }) {
  const [open, setOpen] = useState(row?.open_time?.slice(0, 5) || "");
  const [close, setClose] = useState(row?.close_time?.slice(0, 5) || "");
  return (
    <div className="row" style={{ gap: 8, marginBottom: 8 }}>
      <span style={{ width: 86, fontSize: "0.85rem" }}>{label}</span>
      <input type="time" value={open} onChange={(e) => setOpen(e.target.value)} style={{ minHeight: 40 }} />
      <input type="time" value={close} onChange={(e) => setClose(e.target.value)} style={{ minHeight: 40 }} />
      <button className="btn ghost inline" onClick={() => onSave(open, close)}>Save</button>
    </div>
  );
}
