// Finalize payment: extra line items (upgrades, tips, discounts, travel) and
// the final amount. The old FinalizePaymentModal wrote straight to the
// bookings table; here the booking fields go through the update-booking edge
// function. Line items themselves are plain child rows covered by RLS.

import { useState } from "react";
import { api } from "../lib/api.js";
import { supabase } from "../lib/supabase.js";
import { money } from "../lib/format.js";
import { useBusiness } from "../context/BusinessContext.jsx";

const CATEGORIES = [
  ["upgrade", "Upgrade"],
  ["add_on", "Add-on"],
  ["custom", "Custom charge"],
  ["travel_fee", "Travel fee"],
  ["tip", "Tip"],
  ["discount", "Discount"],
];

export default function FinalizeModal({ booking, onClose, onDone }) {
  const { business } = useBusiness();
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState({ category: "custom", label: "", amount: "" });
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const extras = items.reduce(
    (s, it) => s + (it.category === "discount" ? -Math.abs(Number(it.amount)) : Number(it.amount)),
    0,
  );
  const finalAmount = Math.max(0, Number(booking.total_price) + extras);

  const addItem = () => {
    if (!draft.label.trim() || !Number(draft.amount)) return;
    setItems([...items, { ...draft, amount: Number(draft.amount) }]);
    setDraft({ category: "custom", label: "", amount: "" });
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      if (items.length) {
        const { error: liErr } = await supabase.from("booking_line_items").insert(
          items.map((it) => ({
            business_id: business.id,
            booking_id: booking.id,
            category: it.category,
            label: it.label.trim(),
            amount: it.category === "discount" ? -Math.abs(Number(it.amount)) : Number(it.amount),
          })),
        );
        if (liErr) throw new Error(liErr.message);
      }
      await api.updateBooking(business.id, {
        booking_id: booking.id,
        status: "completed",
        final_amount: finalAmount,
        payment_status: paymentStatus,
        payment_notes: paymentNotes || null,
        finalized_at: new Date().toISOString(),
      });
      onDone?.();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <h2>Finalize payment</h2>
          <button className="btn ghost inline" onClick={onClose}>✕</button>
        </div>
        <p className="muted">Estimated total {money(booking.total_price)}</p>

        <div className="section-title">Extra items</div>
        {items.map((it, i) => (
          <div className="card row between" key={i}>
            <span>{CATEGORIES.find(([k]) => k === it.category)?.[1]}: {it.label}</span>
            <span className="row" style={{ gap: 8 }}>
              {it.category === "discount" ? `-${money(it.amount)}` : money(it.amount)}
              <button className="btn ghost inline" onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</button>
            </span>
          </div>
        ))}
        <div className="grid2">
          <label className="field"><span>Type</span>
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              {CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></label>
          <label className="field"><span>Amount</span>
            <input type="number" inputMode="decimal" value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /></label>
        </div>
        <label className="field"><span>Label</span>
          <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="e.g. Pet hair removal" /></label>
        <button className="btn" onClick={addItem}>Add item</button>

        <div className="section-title">Payment</div>
        <div className="card row between">
          <strong>Final total</strong>
          <span className="big">{money(finalAmount)}</span>
        </div>
        <label className="field"><span>Payment status</span>
          <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
            <option value="paid">Paid</option>
            <option value="partial">Partially paid</option>
            <option value="pending">Not paid yet</option>
            <option value="waived">Waived</option>
          </select></label>
        <label className="field"><span>Payment notes</span>
          <input value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="e.g. Zelle" /></label>

        {error && <div className="error-box">{error}</div>}
        <button className="btn primary" disabled={busy} onClick={save}>
          {busy ? "Saving…" : `Complete job — ${money(finalAmount)}`}
        </button>
      </div>
    </div>
  );
}
