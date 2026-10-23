// What he kept this month: money in minus the bills typed in. With no bill typed
// in there is NO figure, only "not entered" (9.14): revenue is never shown as profit.
import { Count, usd } from "../../ui.jsx";
import { BILL_COLOR, useThisMonth } from "./month.js";

export default function Kept({ i }) {
  const { name, k } = useThisMonth();
  const known = k && !k.failed && k.kept !== null;
  const span = known ? Math.max(k.in, k.out, 1) : 1;
  const pct = known && k.in > 0 ? Math.round((k.kept / k.in) * 100) : null;
  return (
    <section className="bo-sec bo-kept" style={{ "--i": i }} aria-label="You kept">
      <div>
        <div className="bo-label">You kept · {name} so far</div>
        <div className="bo-big" data-testid="kept">
          {!k ? <span className="bo-dim">Reading…</span>
            : k.failed ? <span className="bo-dim">Could not read</span>
            : known ? <span className={k.kept < 0 ? "neg" : ""}>{k.kept <= -50 ? "−" : ""}$<Count to={Math.round(Math.abs(k.kept) / 100)} /></span>
            : <span className="bo-unentered">Not entered</span>}
        </div>
      </div>
      {k && !k.failed && (
        <div>
          <div className="bo-chips">
            {pct !== null && <span className="bo-chip">{pct}% of what came in</span>}
            {k.missing.length > 0 && (
              <span className="bo-chip" style={{ "--k": "var(--bo-warn)", color: "var(--bo-warn)" }} data-testid="missing">
                {k.missing.length} {k.missing.length === 1 ? "bill" : "bills"} not entered
              </span>
            )}
          </div>
          {known && (
            <div className="bo-split" role="img" aria-label={`${usd(k.in)} came in, ${usd(k.out)} went out`}>
              {k.kept > 0 && <i className="kept" style={{ "--w": `${(k.kept / span) * 100}%` }} />}
              {k.bills.filter((b) => b.cents).map((b) => (
                <i key={b.kind} style={{ "--w": `${(b.cents / span) * 100}%`, background: BILL_COLOR[b.kind] }} />
              ))}
            </div>
          )}
          <div className="bo-split-l">
            <span>{usd(k.in)} came in</span>
            <span>{known ? `${usd(k.out)} went out` : "Money out not entered"}</span>
          </div>
        </div>
      )}
    </section>
  );
}
