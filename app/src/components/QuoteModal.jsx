// ROADMAP 2.12 — SENDING A QUOTE. The owner's second half of question 5:
// "and then they can also send quotes, to have that option".
//
// WHAT A QUOTE IS, in this product: a price the detailer OFFERS on a request,
// which the customer then has to say yes to. It does not change what the job
// costs — `respond-to-booking` writes `quoted_amount`, never `total_price`,
// and only the customer pressing the button in their email moves one to the
// other. That split is CLAUDE.md's rule that a number printed is not a number
// charged, applied to the one place in the product where the two are genuinely
// days apart.
//
// The shape is FinalizeModal's, deliberately: a sheet, the number first, a
// confirm step before the thing that leaves the building. Two fields, because
// a quote is two facts — how much, and why.

import { useState } from "react";
import { api } from "../lib/api.js";
import { money } from "../lib/format.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import Sheet from "./Sheet.jsx";

export default function QuoteModal({ booking, onClose, onSent }) {
  const { business } = useBusiness();
  const [amount, setAmount] = useState(
    booking.quoted_amount != null ? String(booking.quoted_amount) : String(booking.total_price ?? ""),
  );
  const [note, setNote] = useState(booking.quoted_note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // The email goes to a real person and cannot be recalled, which is the same
  // reason Finalize asks. It states the number before it sends it.
  const [confirming, setConfirming] = useState(false);

  const value = Math.round(Number(amount) * 100) / 100;
  const valid = Number.isFinite(value) && value > 0;
  const asked = Number(booking.total_price);
  const diff = valid ? Math.round((value - asked) * 100) / 100 : 0;

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      await api.respondToBooking(business.id, booking.id, "quote", { amount: value, note: note.trim() || null });
      onSent?.();
    } catch (e) {
      setError(e.message);
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <Sheet onClose={onClose} title="Send a quote"
      subtitle={`${booking.customer_name} asked for ${money(asked)}`}>

      <label className="field"><span>Your price</span>
        <input type="number" inputMode="decimal" value={amount} autoFocus
          onChange={(e) => { setAmount(e.target.value); setConfirming(false); }} /></label>

      {/* The difference, named rather than left to subtract — the same rule
          the job record's money line follows. Absent when there isn't one. */}
      {valid && diff !== 0 && (
        <p className="quiet" style={{ marginTop: "calc(-1 * var(--sp-2))" }}>
          {diff > 0 ? `${money(diff)} more than they were quoted` : `${money(-diff)} less than they were quoted`}
        </p>
      )}

      <label className="field"><span>Why, in a sentence</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Optional — they'll read this in the email" /></label>

      <p className="muted" style={{ marginBottom: 8 }}>
        Their time stays held while they decide, and nothing changes on the job
        until they accept.
      </p>

      {error && <div className="error-box">{error}</div>}

      {confirming ? (
        <div className="confirm-box">
          <p>
            Email <strong>{booking.customer_name}</strong> a price of{" "}
            <strong>{money(value)}</strong>?
          </p>
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <button className="btn ghost inline" disabled={busy} onClick={() => setConfirming(false)}>
              Go back
            </button>
            <button className="btn primary inline" disabled={busy} onClick={send}>
              {busy ? "Sending…" : "Yes, send it"}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn primary" disabled={!valid} onClick={() => setConfirming(true)}>
          Send {valid ? money(value) : "quote"}
        </button>
      )}
    </Sheet>
  );
}
