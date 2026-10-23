// This month's platform bills, one line per kind. A bill nobody typed in reads
// "Not entered" and is never guessed; "Add it" types one in through the server's
// own checks (`platform_cost_add`, `costEntry`). Its refusal sentence is shown as-is.
// Above the lines, the chosen month's totals (98.15): what came in, what the bills
// came to and what was kept. With no bill typed in, the profit is "Not entered" (9.14).
// With some but not all bills typed in, the profit figure carries how many are not
// entered beside it (98.16); a complete month shows no note.
// Every figure here is to the cent: a bill somebody typed reads back as typed (98.14).
import { useState } from "react";
import { centsOf, monthsumNote } from "../../../../lib/officeMoney.js";
import { call } from "../../api.js";
import { money } from "../../../../lib/format.js";
import { reread } from "../../useNet.js";
import { BILL_COLOR, BILL_MONTHS, useMonth } from "./month.js";

const cash = (cents) => money(cents / 100);

function MonthSum({ name, k, count }) {
  const net = k.kept === null ? "Profit" : k.kept < 0 ? "We lost" : k.kept === 0 ? "We broke even" : "We kept";
  const note = monthsumNote(k);
  return (
    <dl className="bo-monthsum">
      <div><dt>Paid to us in {name}</dt><dd>{cash(k.in)}</dd></div>
      {k.kept !== null && <div><dt>Costs entered · {count} {count === 1 ? "bill" : "bills"}</dt><dd>{cash(k.out)}</dd></div>}
      <div className={k.kept < 0 ? "net neg" : "net"}>
        <dt>{net}</dt>
        <dd>{k.kept === null ? <span className="unentered">Not entered</span> : (<><span data-testid="monthsum-net">{cash(Math.abs(k.kept))}</span>{note && <span className="bo-chip" style={{ "--k": "var(--bo-warn)", color: "var(--bo-warn)" }} data-testid="monthsum-missing">{note}</span>}</>)}</dd>
      </div>
    </dl>
  );
}

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
  const [at, setAt] = useState(BILL_MONTHS.length - 1);
  const { month, name, net, k } = useMonth(BILL_MONTHS[at]);
  const [adding, setAdding] = useState(null);
  // An open form belongs to the month it was opened on, so a switch closes it.
  const go = (to) => { setAt(to); setAdding(null); };
  return (
    <section className="bo-sec" style={{ "--i": i }} aria-label="Platform bills">
      <div className="bo-label">Platform bills</div>
      <div className="bo-monthstep">
        <button type="button" className="bo-btn ghost" aria-label="Earlier month" disabled={at === 0} onClick={() => go(at - 1)}>‹</button>
        <span className="bo-monthname" aria-live="polite">{name} {month.slice(0, 4)}</span>
        <button type="button" className="bo-btn ghost" aria-label="Later month" disabled={at === BILL_MONTHS.length - 1} onClick={() => go(at + 1)}>›</button>
      </div>
      {!k ? <p className="bo-dim">Reading…</p> : k.failed ? <p className="bo-dim">Could not read the bills for {name}.</p> : (<>
        <MonthSum name={name} k={k} count={net.cost_count ?? 0} />
        <ul className="bo-bills">
          {k.bills.map((b) => (
            <li key={b.kind} className={b.cents === null ? "missing" : ""} data-bill={b.kind}>
              <div className="bo-bill">
                <span className="lg" style={{ color: BILL_COLOR[b.kind] }}>{b.cents === null ? "?" : b.name[0]}</span>
                <b>{b.name}</b>
                <span className="amt">{b.cents === null ? "Not entered" : cash(b.cents)}</span>
                {adding !== b.kind && (
                  <button type="button" className="bo-btn ghost" onClick={() => setAdding(b.kind)}>{b.cents === null ? "Add it" : "Add"}</button>
                )}
              </div>
              {adding === b.kind && <AddBill month={month} kind={b.kind} name={b.name} done={() => setAdding(null)} />}
            </li>
          ))}
        </ul>
      </>)}
    </section>
  );
}
