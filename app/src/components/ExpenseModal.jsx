// Three-tap expense entry, per the spec: amount, category, done.
//
// Tap 1 is the amount (the keypad is already focused when the sheet opens).
// Tap 2 is a category chip. Tap 3 is Save. Description defaults to the
// category name, and the date defaults to today — both editable behind a
// "More" disclosure for the rare case, so the common case stays at three
// taps. The five categories are fixed; there are no custom ones.

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { todayLocal } from "../lib/format.js";

const CATEGORIES = ["product", "gas", "equipment", "supplies", "other"];

export default function ExpenseModal({ onClose, onSaved }) {
  const { business } = useBusiness();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayLocal(business.timezone));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const amountRef = useRef(null);

  useEffect(() => { amountRef.current?.focus(); }, []);

  const save = async () => {
    if (!Number(amount) || !category) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabase.from("expenses").insert({
      business_id: business.id,
      date,
      category,
      description: description.trim() || category,
      amount: Number(amount),
      payment_method: "unspecified",
    });
    if (err) {
      setError(err.message);
      setBusy(false);
      return;
    }
    onSaved?.();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: 14 }}>Add expense</h2>

        <label className="field">
          <span>Amount</span>
          <input
            ref={amountRef}
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ fontSize: "1.6rem", fontWeight: 700, minHeight: 60 }}
          />
        </label>

        <div className="section-title" style={{ marginTop: 4 }}>Category</div>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`chip ${category === c ? "active" : ""}`}
              style={{ minHeight: 44, textTransform: "capitalize" }}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {!showMore ? (
          <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => setShowMore(true)}>
            Add a note or change the date
          </button>
        ) : (
          <div style={{ marginTop: 12 }}>
            <label className="field"><span>Note</span>
              <input value={description} placeholder={category || "Description"}
                onChange={(e) => setDescription(e.target.value)} /></label>
            <label className="field"><span>Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          </div>
        )}

        {error && <div className="error-box">{error}</div>}
        <button className="btn primary" style={{ marginTop: 12 }}
          disabled={busy || !Number(amount) || !category} onClick={save}>
          {busy ? "Saving" : "Save expense"}
        </button>
      </div>
    </div>
  );
}
