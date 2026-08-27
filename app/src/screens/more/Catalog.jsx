// Services & add-ons. Flat services — as many as the detailer wants, named
// anything, with optional per-size price/time adjustments. Services are
// DEACTIVATED, never deleted (bookings reference them).

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { money } from "../../lib/format.js";
import Sheet from "../../components/Sheet.jsx";

const EMPTY_SVC = {
  name: "", description: "", price: "", duration_minutes: "60", group_label: "",
  med_price: "15", med_min: "15", lg_price: "30", lg_min: "30",
};
const EMPTY_ADDON = { name: "", description: "", price: "", duration_minutes: "0" };

export default function Catalog() {
  const { business } = useBusiness();
  const [services, setServices] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [editing, setEditing] = useState(null); // {kind, id?, form}
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const [s, a] = await Promise.all([
      supabase.from("services").select("*").eq("business_id", business.id).order("sort_order").order("name"),
      supabase.from("add_ons").select("*").eq("business_id", business.id).order("sort_order").order("name"),
    ]);
    setServices(s.data ?? []);
    setAddOns(a.data ?? []);
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  const openService = (svc) =>
    setEditing({
      kind: "service",
      id: svc?.id,
      form: svc
        ? {
          name: svc.name, description: svc.description || "", price: String(svc.price),
          duration_minutes: String(svc.duration_minutes), group_label: svc.group_label || "",
          med_price: String(svc.vehicle_size_adjustments?.medium?.price ?? 0),
          med_min: String(svc.vehicle_size_adjustments?.medium?.duration_minutes ?? 0),
          lg_price: String(svc.vehicle_size_adjustments?.large?.price ?? 0),
          lg_min: String(svc.vehicle_size_adjustments?.large?.duration_minutes ?? 0),
        }
        : { ...EMPTY_SVC },
    });

  const saveService = async () => {
    const f = editing.form;
    const payload = {
      business_id: business.id,
      name: f.name.trim(),
      description: f.description.trim() || null,
      price: Number(f.price) || 0,
      duration_minutes: Number(f.duration_minutes) || 60,
      group_label: f.group_label.trim() || null,
      vehicle_size_adjustments: {
        small: { price: 0, duration_minutes: 0 },
        medium: { price: Number(f.med_price) || 0, duration_minutes: Number(f.med_min) || 0 },
        large: { price: Number(f.lg_price) || 0, duration_minutes: Number(f.lg_min) || 0 },
      },
    };
    const q = editing.id
      ? supabase.from("services").update(payload).eq("id", editing.id).eq("business_id", business.id)
      : supabase.from("services").insert(payload);
    const { error } = await q;
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Saved." });
    if (!error) setEditing(null);
    load();
  };

  const toggleService = async (svc) => {
    await supabase.from("services").update({ is_active: !svc.is_active }).eq("id", svc.id).eq("business_id", business.id);
    load();
  };

  const saveAddOn = async () => {
    const f = editing.form;
    const payload = {
      business_id: business.id,
      name: f.name.trim(),
      description: f.description.trim() || null,
      price: Number(f.price) || 0,
      duration_minutes: Number(f.duration_minutes) || 0,
    };
    const q = editing.id
      ? supabase.from("add_ons").update(payload).eq("id", editing.id).eq("business_id", business.id)
      : supabase.from("add_ons").insert(payload);
    const { error } = await q;
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Saved." });
    if (!error) setEditing(null);
    load();
  };

  const toggleAddOn = async (a) => {
    await supabase.from("add_ons").update({ is_active: !a.is_active }).eq("id", a.id).eq("business_id", business.id);
    load();
  };

  return (
    <div className="card">
      <div className="row between">
        <h3>Services</h3>
        <button className="btn inline" onClick={() => openService(null)}>+ Add</button>
      </div>
      {services.map((s) => (
        <div className="card row between" key={s.id} style={{ opacity: s.is_active ? 1 : 0.5 }}>
          <div className="tappable" onClick={() => openService(s)} style={{ flex: 1, cursor: "pointer" }}>
            <strong>{s.name}</strong>
            <div className="muted">{money(s.price)} · {s.duration_minutes} min{s.group_label ? ` · ${s.group_label}` : ""}</div>
          </div>
          <button className="btn ghost inline" onClick={() => toggleService(s)}>{s.is_active ? "Deactivate" : "Activate"}</button>
        </div>
      ))}
      {services.length === 0 && <p className="muted">No services yet — customers can't book until you add one.</p>}

      <div className="row between" style={{ marginTop: 16 }}>
        <h3>Add-ons</h3>
        <button className="btn inline" onClick={() => setEditing({ kind: "addon", form: { ...EMPTY_ADDON } })}>+ Add</button>
      </div>
      {addOns.map((a) => (
        <div className="card row between" key={a.id} style={{ opacity: a.is_active ? 1 : 0.5 }}>
          <div onClick={() => setEditing({ kind: "addon", id: a.id, form: { name: a.name, description: a.description || "", price: String(a.price), duration_minutes: String(a.duration_minutes) } })} style={{ flex: 1, cursor: "pointer" }}>
            <strong>{a.name}</strong>
            <div className="muted">{money(a.price)}{a.duration_minutes ? ` · +${a.duration_minutes} min` : ""}</div>
          </div>
          <button className="btn ghost inline" onClick={() => toggleAddOn(a)}>{a.is_active ? "Deactivate" : "Activate"}</button>
        </div>
      ))}

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}

      {editing && (
        <Sheet onClose={() => setEditing(null)}
          title={`${editing.id ? "Edit" : "New"} ${editing.kind === "service" ? "service" : "add-on"}`}>
            <label className="field"><span>Name</span>
              <input value={editing.form.name} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, name: e.target.value } })} /></label>
            <label className="field"><span>Description</span>
              <textarea value={editing.form.description} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, description: e.target.value } })} /></label>
            <div className="grid2">
              <label className="field"><span>Price ($)</span>
                <input type="number" inputMode="decimal" value={editing.form.price} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, price: e.target.value } })} /></label>
              <label className="field"><span>Duration (min)</span>
                <input type="number" inputMode="numeric" value={editing.form.duration_minutes} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, duration_minutes: e.target.value } })} /></label>
            </div>
            {editing.kind === "service" && (
              <>
                <label className="field"><span>Group label (optional, e.g. Interior)</span>
                  <input value={editing.form.group_label} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, group_label: e.target.value } })} /></label>
                <div className="section-title">Bigger vehicles (added on top)</div>
                <div className="grid2">
                  <label className="field"><span>Medium +$</span>
                    <input type="number" value={editing.form.med_price} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, med_price: e.target.value } })} /></label>
                  <label className="field"><span>Medium +min</span>
                    <input type="number" value={editing.form.med_min} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, med_min: e.target.value } })} /></label>
                  <label className="field"><span>Large +$</span>
                    <input type="number" value={editing.form.lg_price} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, lg_price: e.target.value } })} /></label>
                  <label className="field"><span>Large +min</span>
                    <input type="number" value={editing.form.lg_min} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, lg_min: e.target.value } })} /></label>
                </div>
              </>
            )}
            <button className="btn primary" onClick={editing.kind === "service" ? saveService : saveAddOn}>Save</button>
        </Sheet>
      )}
    </div>
  );
}
