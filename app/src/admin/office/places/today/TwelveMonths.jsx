// Twelve months of money in (green) and money out (amber). Out is drawn ONLY for a
// month someone typed a bill in; a month with none has no bar and the key says
// "not entered", because an absent bill is not a free month (9.14). A month the
// server could not answer is marked as unread, not drawn as zero.
import { useMemo } from "react";
import { lastMonths, monthBars } from "../../../../lib/officeToday.js";
import { usd } from "../../ui.jsx";
import { useNet } from "../../useNet.js";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function TwelveMonths({ i }) {
  const months = useMemo(() => lastMonths(12), []);
  const got = useNet(months);
  const bars = months.map((m) => (got[m] ? monthBars(got[m]) : null));
  const top = Math.max(1, ...bars.map((b) => Math.max(b?.in ?? 0, b?.out ?? 0)));
  const unentered = bars.filter((b) => b && !b.failed && b.out === null).length;
  const unread = bars.filter((b) => b?.failed).length;
  const nothing = bars.every(Boolean) && !unread && bars.every((b) => !b.in);

  return (
    <section className="bo-sec" style={{ "--i": i }} aria-label="Twelve months">
      <div className="bo-label">Money in and out, 12 months</div>
      <div className="bo-key">
        <span><i className="in" />Money in</span>
        <span><i className="out" />Money out{unentered === 12 ? " · not entered" : unentered ? ` · not entered for ${unentered} months` : ""}</span>
        {unread > 0 && <span className="bo-dim">{unread} could not be read</span>}
      </div>
      <div className={`bo-months${nothing ? " flat" : ""}`} role="list">
        {months.map((m, k) => {
          const b = bars[k], mo = MON[Number(m.slice(5, 7)) - 1];
          const say = !b ? `${mo}: reading`
            : b.failed ? `${mo}: could not be read`
            : `${mo}: ${usd(b.in)} in, ${b.out === null ? "money out not entered" : `${usd(b.out)} out`}`;
          return (
            <div key={m} className="bo-mcol" role="listitem" aria-label={say} title={say}>
              <div className="bo-mbars">
                <i className="in" style={{ "--h": `${((b?.in ?? 0) / top) * 100}%`, "--d": `${k * 40}ms` }} />
                <i className="out" style={{ "--h": `${((b?.out ?? 0) / top) * 100}%`, "--d": `${k * 40 + 80}ms` }} hidden={!b || b.out === null} />
              </div>
              <span className={`bo-mlab${k === 11 ? " now" : ""}`}>{mo}</span>
            </div>
          );
        })}
      </div>
      {nothing && <p className="bo-dim bo-mnote">Nothing has come in yet.</p>}
    </section>
  );
}
