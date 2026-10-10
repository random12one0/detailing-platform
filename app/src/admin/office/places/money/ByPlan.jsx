// Monthly income split by plan, from each real detailer's own subscription. A
// declined card is shown apart and is not in the total: it did not arrive.
import { byPlan } from "../../../../lib/officeMoney.js";
import { Count, usd } from "../../ui.jsx";

const COLOR = { month: "#38E08B", year: "#5FB4E2" };
const R = 70, C = 2 * Math.PI * R;

export default function ByPlan({ ctx, i }) {
  const p = byPlan(ctx.rows);
  let acc = 0;
  return (
    <section className="bo-sec" style={{ "--i": i }} aria-label="Monthly income by plan">
      <div className="bo-label">Monthly income by plan</div>
      <div className="bo-h2" data-testid="by-plan">{usd(p.total)} a month</div>
      <div className="bo-donut-wrap">
        <div className="bo-donut">
          <svg viewBox="0 0 190 190" aria-hidden="true">
            <circle cx="95" cy="95" r={R} fill="none" stroke="var(--ink-3)" strokeWidth="24" />
            {p.parts.filter((x) => x.cents > 0).map((x) => {
              const len = (x.cents / p.total) * C, off = acc; acc += len;
              return <circle key={x.key} className="bo-arc" cx="95" cy="95" r={R} fill="none" stroke={COLOR[x.key]} strokeWidth="24"
                             strokeDasharray={`${Math.max(0, len - 3)} ${C}`} strokeDashoffset={-off}
                             style={{ filter: `drop-shadow(0 0 8px ${COLOR[x.key]}66)` }} />;
            })}
          </svg>
          <div className="bo-donut-c"><b><Count to={p.paying} /></b><span>paying</span></div>
        </div>
        <dl className="bo-dl">
          {p.parts.map((x) => (
            <div key={x.key}><i style={{ background: COLOR[x.key] }} /><dt>{x.label}</dt><dd>{usd(x.cents)}</dd></div>
          ))}
          {p.late.n > 0 && (
            <div className="late" data-testid="late"><i /><dt>Card failed · {p.late.n}</dt><dd>{usd(p.late.cents)}</dd></div>
          )}
        </dl>
      </div>
    </section>
  );
}
