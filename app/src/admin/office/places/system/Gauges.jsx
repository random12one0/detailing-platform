// Photo storage and today's email, each as a half-dial against its limit.
import { mb } from "../../../../lib/officeSystem.js";
import { Count } from "../../ui.jsx";

const COLOR = { ok: "var(--ac)", warn: "var(--bo-warn)", never: "var(--bo-warn)", bad: "var(--bad)" };

function Dial({ c, label, pct, big, unit, of, testid }) {
  return (
    <div className="bo-slab" data-testid={testid}>
      <div className="bo-label">{label}</div>
      <div className="bo-gauge">
        <svg viewBox="0 0 170 100" aria-hidden="true">
          <path d="M15 90 A70 70 0 0 1 155 90" fill="none" stroke="var(--ink-3)" strokeWidth="14" strokeLinecap="round" />
          <path className="bo-arc" d="M15 90 A70 70 0 0 1 155 90" fill="none" stroke={COLOR[c.state]} strokeWidth="14" strokeLinecap="round"
                pathLength="100" style={{ "--v": Math.max(pct, 0.5), filter: `drop-shadow(0 0 8px ${COLOR[c.state]})` }} />
        </svg>
        <div className="bo-gauge-n">
          <b>{big}<small> {unit}</small></b>
          <span>{of}</span>
        </div>
      </div>
    </div>
  );
}

export default function Gauges({ checks, i }) {
  const s = checks.find((c) => c.key === "storage"), m = checks.find((c) => c.key === "email");
  const gb = (b) => Math.round((b / 1073741824) * 10) / 10;
  const usedMb = Math.round(s.used / 1048576);
  return (
    <section className="bo-sec bo-gauges" style={{ "--i": i }} aria-label="Storage and email">
      <Dial c={s} label="Photo storage" testid="storage" pct={s.total ? Math.min(100, (s.used / s.total) * 100) : 0}
            big={usedMb >= 1024 ? gb(s.used) : <Count to={usedMb} />} unit={usedMb >= 1024 ? "GB" : "MB"} of={s.total ? `of ${mb(s.total)}` : "size unknown"} />
      <Dial c={m} label="Email today" testid="email" pct={m.cap ? Math.min(100, (m.sent / m.cap) * 100) : 0}
            big={<Count to={m.sent} />} unit="sent" of={`of ${m.cap} a day`} />
    </section>
  );
}
