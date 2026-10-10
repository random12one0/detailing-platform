// This month's money in, counting up, against last month's mark. "Money in" is
// what detailers paid the platform in invoices that were PAID in the month
// (`platform_net`), never the recurring figure: that is a snapshot of right now
// and is shown beside it, labeled as such.
import { useMemo } from "react";
import { lastMonths } from "../../../../lib/officeToday.js";
import { Count } from "../../ui.jsx";
import { useNet } from "../../useNet.js";

const D = (cents) => Math.round((cents ?? 0) / 100);
const failed = (a) => a && a.error;

export default function MoneyNow({ ctx, i }) {
  const months = useMemo(() => lastMonths(2), []);
  const got = useNet(months);
  const [prev, now] = months.map((m) => got[m]);
  const t = ctx.totals;
  const max = Math.max(now?.revenue_cents ?? 0, prev?.revenue_cents ?? 0, 1);

  return (
    <section className="bo-sec bo-hero" style={{ "--i": i }} aria-label="Money in this month">
      <div className="bo-label">Money in this month</div>
      <div className="bo-big" data-testid="money-now">
        {!now ? <span className="bo-dim">Reading…</span>
          : failed(now) ? <span className="bo-dim">Could not read</span>
          : <>$<Count to={D(now.revenue_cents)} /></>}
      </div>
      <div className="bo-vs" role="img"
           aria-label={`This month ${D(now?.revenue_cents)} dollars, last month ${D(prev?.revenue_cents)} dollars`}>
        <i className="bo-vs-fill" style={{ "--w": `${((now?.revenue_cents ?? 0) / max) * 100}%` }} />
        <i className="bo-vs-mark" style={{ left: `${((prev?.revenue_cents ?? 0) / max) * 100}%` }} />
      </div>
      <div className="bo-vs-l">
        {!prev ? "Reading last month…"
          : failed(prev) ? "Could not read last month"
          : <>Last month <b>${D(prev.revenue_cents).toLocaleString("en-US")}</b></>}
      </div>
      <dl className="bo-stats">
        <div><dt>Recurring now</dt><dd>${D(t.mrr_cents).toLocaleString("en-US")}<small> a month</small></dd></div>
        <div><dt>Detailers</dt><dd><Count to={t.businesses ?? 0} /></dd></div>
        <div><dt>Joined this month</dt><dd><Count to={t.new_month ?? 0} /></dd></div>
      </dl>
    </section>
  );
}
