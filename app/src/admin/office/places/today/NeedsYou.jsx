// "Needs you": at most five, dearest first, one fix button each. The button is the
// one `issueOf` chose from what we can reach them on, and it is absent when there
// is nobody to reach (a button must have somewhere to go).
import { needsYou } from "../../../../lib/officeToday.js";
import { contactOf } from "../../../../lib/officeDetailers.js";
import { Arrow, Av, usd } from "../../ui.jsx";

export default function NeedsYou({ ctx, i }) {
  const { items, more, total } = needsYou(ctx.rows);
  return (
    <section className="bo-sec" style={{ "--i": i }} aria-label="Needs you">
      <div className="bo-label">Needs you<span className="bo-label-n">{total}</span></div>
      {items.length === 0 && <p className="bo-none bo-calm">Nobody needs you.</p>}
      <ol className="bo-needs">
        {items.map(({ row, issue }) => {
          const c = contactOf(row);
          const href = issue.kind === "sms" ? c.sms : issue.kind === "mail" ? c.mail : null;
          return (
            <li key={row.id} className="bo-need">
              <button type="button" className="bo-need-who" onClick={() => ctx.open(row.id)}>
                <Av name={row.name} />
                <span><b>{row.name}</b><em style={{ color: issue.color === "bad" ? "var(--bad)" : "var(--bo-warn)" }}>{issue.kicker}</em></span>
              </button>
              <p className="bo-need-t">{issue.text}</p>
              <span className="bo-need-cost">{issue.costCents != null ? `${usd(issue.costCents)} a month` : ""}</span>
              {href ? <a className="bo-btn go" href={href}>{issue.act} <Arrow /></a> : <span className="bo-dim">Nobody to reach</span>}
            </li>
          );
        })}
      </ol>
      {more > 0 && (
        <button type="button" className="bo-btn ghost bo-more" onClick={() => ctx.go("detailers", { filter: "need" })}>
          {more} more <Arrow />
        </button>
      )}
    </section>
  );
}
