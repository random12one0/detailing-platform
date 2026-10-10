// From money in to money kept, as a step-down chart: "Came in", one step down per
// bill typed in, then "You kept". With no bill typed in, the last step is a dashed
// "not entered" box and there is no kept bar (9.14).
import { stepsOf } from "../../../../lib/officeMoney.js";
import { usd } from "../../ui.jsx";
import { BILL_COLOR, useThisMonth } from "./month.js";

const SHORT = { database: "Database" };

export default function Steps({ i }) {
  const { k } = useThisMonth();
  const steps = stepsOf(k);
  const top = Math.max(1, k?.in ?? 0, k?.out ?? 0);
  let level = k?.in ?? 0;
  const pct = (c) => `${(Math.max(0, c) / top) * 80}%`;
  return (
    <section className="bo-sec" style={{ "--i": i }} aria-label="Where every dollar went">
      <div className="bo-label">Where every dollar went</div>
      {!k ? <p className="bo-dim">Reading…</p> : k.failed ? <p className="bo-dim">Could not read this month.</p> : (
        <ol className="bo-wf">
          {steps.map((s, n) => {
            let lo = 0, hi = 0;
            if (s.kind === "bill") { hi = level; level += s.cents; lo = level; }
            else hi = s.kind === "unentered" ? k.in : s.cents;
            const say = s.kind === "unentered" ? "Bills: not entered" : `${s.label}: ${usd(s.cents)}`;
            return (
              <li key={s.key} className={`bo-wf-c ${s.kind}`} aria-label={say} data-step={s.key}>
                <div className="bo-wf-plot">
                  <i style={{ bottom: pct(lo), height: `max(3px, calc(${pct(hi)} - ${pct(lo)}))`, "--d": `${n * 110}ms`,
                              ...(s.kind === "bill" ? { background: BILL_COLOR[s.key] } : null) }} />
                  <b style={{ bottom: `calc(${pct(hi)} + 8px)` }}>
                    {s.kind === "unentered" ? "not entered" : s.kind === "bill" ? `−${usd(-s.cents)}` : usd(s.cents)}
                  </b>
                </div>
                <span>{SHORT[s.key] ?? s.label}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
