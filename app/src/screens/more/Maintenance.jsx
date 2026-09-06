// ROADMAP 2.23 — maintenance deadlines. A warranty that VOIDS, not a cadence.
//
// The owner, 2026-09-04: *"there was, like, the requirement case things… I
// don't really know how to do all that. You could figure out the best way to
// implement it… and just be customizable for the detailer who might have a lot
// of different things."*
//
// **THE CUSTOMISABLE PART IS THE LABEL AND IT IS THE WHOLE SCREEN.** The
// product never invents a name for what is owed: a detailer types "Ceramic Pro
// annual inspection" or "System X yearly service" or "5-year warranty check",
// and every email uses their words. A dropdown of coating brands would be this
// product deciding which manufacturers exist.
//
// A LIST, NOT A SETTING — the same call `Faq` and `Reviews` made. Each row is
// a fact about one car, and the ordering is by DATE rather than by the
// detailer's hand, because the only question this screen answers is *what is
// about to be lost.*
//
// THE STATE IS DERIVED AND NEVER STORED (`lib/maintenance.js`), so a service
// recorded late moves the row on its own — and the screen and the reminder
// email can never disagree about whether something is missed.

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, X } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { nextDue, saySoon, stateOf } from "../../lib/maintenance.js";

const BLANK = { customer_id: "", label: "", vehicle: "", due_on: "", repeat_months: "12" };

// MISSED FIRST. This screen exists to stop somebody losing a warranty, so the
// ones already lost and the ones about to be come before the settled ones —
// and "met" sinks to the bottom rather than disappearing, because the proof
// that it was done is the other half of what a warranty claim needs.
const ORDER = { missed: 0, due: 1, waiting: 2, met: 3, cancelled: 4 };

export default function Maintenance() {
  const { business } = useBusiness();
  const [rows, setRows] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: ds, error: e1 }, { data: cs }] = await Promise.all([
      supabase.from("maintenance_deadlines")
        .select("*, customers(name, phone)").eq("business_id", business.id).order("due_on"),
      supabase.from("customers").select("id, name, phone")
        .eq("business_id", business.id).order("name"),
    ]);
    if (e1) setError(e1.message);
    setRows(ds ?? []);
    setCustomers(cs ?? []);
  }, [business.id]);
  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(() => {
    const list = [...(rows ?? [])];
    list.sort((a, b) => {
      const d = ORDER[stateOf(a)] - ORDER[stateOf(b)];
      return d !== 0 ? d : String(a.due_on).localeCompare(String(b.due_on));
    });
    return list;
  }, [rows]);

  const add = async () => {
    setError("");
    if (!form.customer_id || !form.label.trim() || !form.due_on) return;
    setBusy(true);
    const { error: e } = await supabase.from("maintenance_deadlines").insert({
      business_id: business.id,
      customer_id: form.customer_id,
      label: form.label.trim(),
      vehicle: form.vehicle.trim() || null,
      due_on: form.due_on,
      // AN EMPTY REPEAT IS A ONE-OFF, not a zero. A five-year warranty check
      // that happens once is a real thing and the field has to be able to say
      // so.
      repeat_months: form.repeat_months ? Number(form.repeat_months) : null,
    });
    if (e) setError(e.message); else { setForm(BLANK); await load(); }
    setBusy(false);
  };

  // MARKING IT DONE IS THE PROOF, and it rolls the next one forward in the
  // same write. `reminded_stage` goes back to zero because the next deadline
  // has not been mentioned to anybody yet — leaving it would silence the
  // escalation for a whole year.
  const markDone = async (d) => {
    setBusy(true);
    setError("");
    const today = new Date().toISOString().slice(0, 10);
    const next = nextDue(d, today);
    const { error: e } = await supabase.from("maintenance_deadlines").update({
      last_done_on: today,
      ...(next ? { due_on: next, reminded_stage: 0 } : {}),
    }).eq("id", d.id);
    if (e) setError(e.message); else await load();
    setBusy(false);
  };

  const cancel = async (d) => {
    setBusy(true);
    setError("");
    const { error: e } = await supabase.from("maintenance_deadlines")
      .update({ cancelled_at: new Date().toISOString() }).eq("id", d.id);
    if (e) setError(e.message); else await load();
    setBusy(false);
  };

  return (
    <div className="card">
      <div className="thoughts">
        {/* THE NON-OBVIOUS FACT KEEPS ITS SENTENCE (the owner's copy rule): a
            detailer who has never used this cannot tell it apart from the
            monthly plans they already have, and the difference — a date with a
            consequence rather than a rhythm — is the whole feature. */}
        <p className="quiet" style={{ marginTop: 0 }}>
          For work that has a deadline rather than a rhythm — a coating warranty
          that voids if the yearly inspection is missed. Your customer gets a
          reminder at 60, 30 and 14 days, and again the day before.
        </p>

        <label className="field"><span>Whose car</span>
          <select value={form.customer_id}
            onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
            <option value="">Choose a customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>
            ))}
          </select>
        </label>

        <label className="field"><span>What is owed</span>
          <input value={form.label} placeholder="e.g. Ceramic Pro annual inspection"
            onChange={(e) => setForm({ ...form, label: e.target.value })} /></label>

        <label className="field"><span>Which car (optional)</span>
          <input value={form.vehicle} placeholder="e.g. 2021 Tacoma"
            onChange={(e) => setForm({ ...form, vehicle: e.target.value })} /></label>

        <div className="pair">
          <label className="field"><span>Due by</span>
            <input type="date" value={form.due_on}
              onChange={(e) => setForm({ ...form, due_on: e.target.value })} /></label>
          {/* MONTHS, NOT A CADENCE PICKER. This is how long until the NEXT one
              once this is done, and blank means it never comes round again. */}
          <label className="field"><span>Then every (months)</span>
            <input type="number" min="1" max="120" value={form.repeat_months}
              placeholder="blank = one-off"
              onChange={(e) => setForm({ ...form, repeat_months: e.target.value })} /></label>
        </div>

        <div className="btnrow">
          <button className="btn primary" disabled={busy || !form.customer_id || !form.label.trim() || !form.due_on}
            onClick={add}>Add deadline</button>
        </div>

        {error && <div className="error-box">{error}</div>}

        {rows !== null && rows.length === 0 && !error && (
          <p className="body">Nothing has a deadline yet — this is for coatings and warranties.</p>
        )}

        {/* `rows` AND NOT `rows-stack`. The stacking variant exists for the
            FAQ's three icon buttons beside a two-line question, and at 392 it
            wraps EVERY child onto its own line — which turned each deadline
            into four stacked fragments with two naked icons underneath. This
            row is an icon, two lines and two buttons, which is the shape
            `.row-item` was built for. Looked at, not reasoned about. */}
        <div className={`rows${busy ? " refreshing" : ""}`} aria-busy={busy || undefined}>
          {sorted.map((d) => {
            const state = stateOf(d);
            return (
              <div className="row-item" key={d.id} style={{ cursor: "default", opacity: state === "cancelled" ? 0.5 : 1 }}>
                <span className="ico"><CalendarClock size={19} strokeWidth={2} /></span>
                <span className="txt">
                  <span className="nm">
                    {d.label}
                    {/* `--bad` IS THE PRODUCT'S FIXED RED AND NEVER THE
                        TENANT'S ACCENT (design-system law 11b): a missed
                        warranty is a state, not an identity. */}
                    {state === "missed" && <span className="pill bad" style={{ marginLeft: 8 }}>Missed</span>}
                    {state === "met" && <span className="pill" style={{ marginLeft: 8 }}>Done</span>}
                  </span>
                  {/* THE TIMING COMES FIRST, and that was a fix rather than a
                      choice: with the name first the line clipped at 392 to
                      "Marcus Webb · 2021 Tacoma …" — losing the one fact the
                      row exists to carry. The clipped end is now the car,
                      which the label above usually implies anyway. */}
                  <span className="sub">
                    {saySoon(d)}
                    {" · "}{d.customers?.name ?? "a customer"}
                    {d.vehicle ? ` · ${d.vehicle}` : ""}
                  </span>
                </span>
                {state !== "cancelled" && (
                  <button className="btn sm inline icon ghost" aria-label={`Mark "${d.label}" done`}
                    disabled={busy} onClick={() => markDone(d)}><Check strokeWidth={2} /></button>
                )}
                {state !== "cancelled" && (
                  <button className="btn sm inline icon ghost" aria-label={`"${d.label}" no longer applies`}
                    disabled={busy} onClick={() => cancel(d)}><X strokeWidth={2} /></button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
