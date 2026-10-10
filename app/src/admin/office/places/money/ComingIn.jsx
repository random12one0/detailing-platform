// What should land in the next 30 days: each paying real subscription renewing in
// the window and not set to cancel, at its full charge. A dot on a rail per
// renewal, and the same renewals as a list a finger can press.
import { comingIn } from "../../../../lib/officeMoney.js";
import { Arrow, Av, usd } from "../../ui.jsx";

const day = (t) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function ComingIn({ ctx, i }) {
  const { pins, total } = comingIn(ctx.rows);
  return (
    <section className="bo-sec" style={{ "--i": i }} aria-label="Coming in, next 30 days">
      <div className="bo-label">Coming in · next 30 days</div>
      <div className="bo-h2" data-testid="coming">{usd(total)} expected</div>
      <div className="bo-rail30" aria-hidden="true">
        {pins.map((p, n) => (
          <i key={p.row.id} className={p.yearly ? "yr" : ""} style={{ left: `${(p.day / 30) * 100}%`, "--d": `${300 + n * 90}ms` }} />
        ))}
        <span className="now">Today</span>
        <span className="end">{day(Date.now() + 30 * 864e5)}</span>
      </div>
      {pins.length === 0 ? <p className="bo-none bo-calm">Nothing renews in the next 30 days.</p> : (
        <ol className="bo-due">
          {pins.map((p) => (
            <li key={p.row.id}>
              <button type="button" onClick={() => ctx.open(p.row.id)}>
                <span className="when">{day(p.at)}</span>
                <Av name={p.row.name} />
                <b>{p.row.name}</b>
                <span className="amt">{usd(p.cents)}{p.yearly && <small> a year</small>}</span>
                <Arrow />
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
