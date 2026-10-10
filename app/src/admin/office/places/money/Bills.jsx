// This month's platform bills, one line per kind. A bill nobody typed in reads
// "Not entered" and is never guessed; "Add it" types one in through the server's
// own checks (`platform_cost_add`, `costEntry`). Its refusal sentence is shown as-is.
import { useState } from "react";
import { centsOf } from "../../../../lib/officeMoney.js";
import { call } from "../../api.js";
import { usd } from "../../ui.jsx";
import { reread } from "../../useNet.js";
import { BILL_COLOR, useThisMonth } from "./month.js";

function AddBill({ month, kind, name, done }) {
  const [dollars, setDollars] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const cents = centsOf(dollars);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await call({ action: "platform_cost_add", period_month: month, category: kind, amount_cents: cents, note: note.trim() || undefined });
      reread(month);
      done();
    } catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <form className="bo-billform" onSubmit={save} aria-label={`Add a ${name.toLowerCase()} bill`}>
      <label><span>Amount</span><input inputMode="decimal" autoFocus placeholder="$0.00" value={dollars} onChange={(e) => setDollars(e.target.value)} /></label>
      <label className="note"><span>Note</span><input maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <div className="acts">
        <button type="submit" className="bo-btn go" disabled={cents === null || busy}>{busy ? "Saving…" : "Save"}</button>
        <button type="button" className="bo-btn ghost" onClick={done}>Cancel</button>
      </div>
      {err && <p className="bo-err" role="alert">{err}</p>}
    </form>
  );
}

export default function Bills({ i }) {
  const { month, name, k } = useThisMonth();
  const [adding, setAdding] = useState(null);
  return (
    <section className="bo-sec" style={{ "--i": i }} aria-label="Platform bills">
      <div className="bo-label">Platform bills · {name}</div>
      {!k ? <p className="bo-dim">Reading…</p> : k.failed ? <p className="bo-dim">Could not read this month's bills.</p> : (
        <ul className="bo-bills">
          {k.bills.map((b) => (
            <li key={b.kind} className={b.cents === null ? "missing" : ""} data-bill={b.kind}>
              <div className="bo-bill">
                <span className="lg" style={{ color: BILL_COLOR[b.kind] }}>{b.cents === null ? "?" : b.name[0]}</span>
                <b>{b.name}</b>
                <span className="amt">{b.cents === null ? "Not entered" : usd(b.cents)}</span>
                {adding !== b.kind && (
                  <button type="button" className="bo-btn ghost" onClick={() => setAdding(b.kind)}>{b.cents === null ? "Add it" : "Add"}</button>
                )}
              </div>
              {adding === b.kind && <AddBill month={month} kind={b.kind} name={b.name} done={() => setAdding(null)} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
