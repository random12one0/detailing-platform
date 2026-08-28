// Promo codes + the site-wide sale. Codes are unique per business — two
// different detailers can both run "SUMMER10".

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { money } from "../../lib/format.js";
import { DurationChoice, Group, Setting, Switch } from "../../components/controls.jsx";

export default function Promos() {
  const { business, settings, reload } = useBusiness();
  const [codes, setCodes] = useState([]);
  const [form, setForm] = useState({ code: "", type: "percentage", value: "", usage_limit: "", once_per_customer: false });
  const [sale, setSale] = useState({
    active: settings?.site_discount_active ?? false,
    percent: String(settings?.site_discount_percent ?? 0),
    label: settings?.site_discount_label ?? "",
  });
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("promo_codes").select("*").eq("business_id", business.id).order("created_at", { ascending: false });
    setCodes(data ?? []);
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  const addCode = async () => {
    if (!form.code.trim() || !Number(form.value)) return;
    setMsg(null);
    const { error } = await supabase.from("promo_codes").insert({
      business_id: business.id,
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      usage_limit: form.usage_limit === "" ? null : Number(form.usage_limit),
      once_per_customer: form.once_per_customer,
    });
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Code added." });
    setForm({ ...form, code: "", value: "" });
    load();
  };

  const toggleCode = async (c) => {
    await supabase.from("promo_codes").update({ is_active: !c.is_active }).eq("id", c.id).eq("business_id", business.id);
    load();
  };

  const saveSale = async () => {
    setMsg(null);
    const { error } = await supabase.from("business_settings").update({
      site_discount_active: sale.active,
      site_discount_percent: Number(sale.percent) || 0,
      site_discount_label: sale.label.trim() || null,
    }).eq("business_id", business.id);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Sale settings saved." });
    if (!error) reload();
  };

  return (
    <>
      <Group title="Site-wide sale"
        blurb="Comes off every booking automatically — no code for the customer to enter.">
        <Switch label="Sale is running" checked={sale.active}
          help={sale.active
            ? `Every booking is ${sale.percent || 0}% cheaper right now.`
            : "Turn on to discount everything at once."}
          onChange={(v) => setSale({ ...sale, active: v })} />
        {sale.active && (
          <>
            <Setting label="How much off" stacked
              help="Applied before any promo code the customer enters.">
              <DurationChoice value={Number(sale.percent) || 0} unit="percent" customMax={90}
                presets={[[5, "5%"], [10, "10%"], [15, "15%"], [20, "20%"], [25, "25%"]]}
                onChange={(v) => setSale({ ...sale, percent: v })} />
            </Setting>
            <Setting label="What to call it" stacked
              help="Shown on the booking page beside the discount. Leave blank for just the percentage.">
              <input value={sale.label} placeholder="e.g. Spring Sale"
                onChange={(e) => setSale({ ...sale, label: e.target.value })} />
            </Setting>
          </>
        )}
      </Group>
      <button className="btn" onClick={saveSale} style={{ marginBottom: "var(--sp-5)" }}>Save sale</button>

      <div className="card">
      <div className="section-title" style={{ marginTop: 0 }}>Promo codes</div>
      <div className="grid2">
        <label className="field"><span>Code</span>
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SUMMER10" /></label>
        <label className="field"><span>Type</span>
          <Segmented value={form.type}
            onChange={(v) => setForm({ ...form, type: v })}
            options={[["percentage", "% off"], ["amount", "$ off"]]} /></label>
      </div>
      <div className="grid2">
        <label className="field"><span>Value</span>
          <input type="number" inputMode="decimal" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></label>
        <label className="field"><span>Usage limit (blank = unlimited)</span>
          <input type="number" inputMode="numeric" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} /></label>
      </div>
      <label className="field row" style={{ alignItems: "center", gap: 10 }}>
        <input type="checkbox" checked={form.once_per_customer} onChange={(e) => setForm({ ...form, once_per_customer: e.target.checked })} style={{ width: 22 }} />
        <span style={{ margin: 0 }}>One use per customer</span>
      </label>
      <button className="btn" onClick={addCode}>Add code</button>

      {codes.map((c) => (
        <div className="card row between" key={c.id} style={{ opacity: c.is_active ? 1 : 0.5 }}>
          <div>
            <strong>{c.code}</strong>
            <div className="muted">
              {c.type === "percentage" ? `${c.value}% off` : `${money(c.value)} off`} · used {c.times_used}
              {c.usage_limit ? `/${c.usage_limit}` : ""}
              {c.once_per_customer ? " · once per customer" : ""}
            </div>
          </div>
          <button className="btn ghost inline" onClick={() => toggleCode(c)}>{c.is_active ? "Deactivate" : "Activate"}</button>
        </div>
      ))}

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
    </div>
    </>
  );
}
