// Finalize payment: extra line items (upgrades, tips, discounts, travel) and
// the final amount. The old FinalizePaymentModal wrote straight to the
// bookings table; here the booking fields go through the update-booking edge
// function. Line items themselves are plain child rows covered by RLS.

import { useState } from "react";
import { X } from "lucide-react";
import { api } from "../lib/api.js";
import { supabase } from "../lib/supabase.js";
import { money } from "../lib/format.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import Sheet from "./Sheet.jsx";
import { Segmented } from "./controls.jsx";

// The ways a detailer actually gets paid. "Other" keeps the free field
// useful without making it the default path.
const METHODS = ["Cash", "Card", "Zelle", "Venmo", "Cash App", "Cheque"];

const PAYMENT_LABELS = {
  paid: "paid",
  partial: "partially paid",
  pending: "not paid yet",
  waived: "waived",
};

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
  // Finalizing is the one irreversible-feeling action in the app: it closes
  // the job, writes the line items and stamps finalized_at. It ran straight
  // off the button before, so a mis-tap on a phone completed the job at
  // whatever number happened to be on screen. Now it states the amount and
  // the payment status and waits.
  const [confirming, setConfirming] = useState(false);

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
    <Sheet onClose={onClose} title="Finalize payment"
      subtitle={`Estimated total ${money(booking.total_price)}`}>

        {/* THE COMMON CASE FIRST. This sheet used to open on the extra-items
            form, so the answer needed on nearly every job — the total, how
            they paid, and the button that ends it — sat below the fold. */}
        <div className="card row between">
          <strong>Final total</strong>
          <span className="big">{money(finalAmount)}</span>
        </div>

        <div className="section-title">How they paid</div>
        <Segmented
          value={paymentStatus}
          onChange={setPaymentStatus}
          options={[["paid", "Paid"], ["partial", "Part paid"], ["pending", "Not yet"], ["waived", "Waived"]]}
        />

        {/* A detailer takes payment the same three or four ways for years.
            Typing it every time is slower AND leaves text nobody can total. */}
        {paymentStatus !== "pending" && paymentStatus !== "waived" && (
          <>
            <div className="chips" style={{ marginTop: "var(--sp-3)" }}>
              {METHODS.map((m) => (
                <button
                  key={m} type="button"
                  className={`chip${paymentNotes === m ? " active" : ""}`}
                  onClick={() => setPaymentNotes(paymentNotes === m ? "" : m)}
                >
                  {m}
                </button>
              ))}
            </div>
            <label className="field"><span>Anything to note</span>
              <input value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Optional — cheque number, split payment…" /></label>
          </>
        )}

        {/* Extras are the minority of jobs, so they fold away. */}
        <details className="disclose" open={items.length > 0}>
          <summary>Add an extra charge or discount</summary>
          {/* Added charges are a running list of amounts — a receipt, which
              is ruled rows, not a stack of cards. */}
          {items.length > 0 && (
            <div className="rows">
              {items.map((it, i) => (
                <div className="row-item" key={i} style={{ cursor: "default" }}>
                  <span className="txt">
                    <span className="nm">{it.label}</span>
                    <span className="sub">{CATEGORIES.find(([k]) => k === it.category)?.[1]}</span>
                  </span>
                  <span className="figure sm">
                    {it.category === "discount" ? `-${money(it.amount)}` : money(it.amount)}
                  </span>
                  <button className="btn ghost inline" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Remove">
                    <X size={16} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="field"><span>What kind</span>
            <Segmented
              value={draft.category}
              onChange={(v) => setDraft({ ...draft, category: v })}
              options={CATEGORIES}
            />
          </label>
          <div className="grid2">
            <label className="field"><span>Amount</span>
              <input type="number" inputMode="decimal" value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /></label>
            <label className="field"><span>Label</span>
              <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="e.g. Pet hair" /></label>
          </div>
          <button className="btn" onClick={addItem}>Add item</button>
        </details>

        {error && <div className="error-box">{error}</div>}

        {confirming ? (
          <div className="confirm-box">
            <p>
              Mark this job complete and record <strong>{money(finalAmount)}</strong> as{" "}
              <strong>{PAYMENT_LABELS[paymentStatus]}</strong>
              {items.length > 0 && <> , including {items.length} extra item{items.length > 1 ? "s" : ""}</>}?
            </p>
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <button className="btn ghost inline" disabled={busy} onClick={() => setConfirming(false)}>
                Go back
              </button>
              <button className="btn primary inline" disabled={busy} onClick={save}>
                {busy ? "Saving…" : "Yes, finalize"}
              </button>
            </div>
          </div>
        ) : (
          <button className="btn primary" onClick={() => setConfirming(true)}>
            Complete job — {money(finalAmount)}
          </button>
        )}
    </Sheet>
  );
}
