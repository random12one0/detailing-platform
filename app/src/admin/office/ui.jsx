// Small pieces every place draws with. Each is a few lines so a place can be
// rebuilt without touching them. Colors come from the tokens in office.css.
import { useEffect, useState } from "react";

export const usd = (cents) => `${cents < 0 ? "−" : ""}$${Math.abs(Math.round(cents / 100)).toLocaleString("en-US")}`;

const lite = () => typeof document !== "undefined" && document.documentElement.classList.contains("lite");

// A number that counts up to its value. Under ?lite=1 or reduced motion it is the
// end state at once (docs/design-system.md § Degradation).
export function useCount(to, ms = 1400) {
  const [n, setN] = useState(lite() ? to : 0);
  useEffect(() => {
    if (lite()) { setN(to); return undefined; }
    let raf; const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      setN(Math.round(to * (k === 1 ? 1 : 1 - Math.pow(2, -10 * k))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return n;
}

export const Count = ({ to }) => <>{useCount(to).toLocaleString("en-US")}</>;

const initials = (n) => String(n).replace("&", "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const PALETTE = ["#38E08B", "#5FB4E2", "#F2B84B", "#E2705F", "#9FE9C2", "#E6E4DC", "#F5B3A8"];
// Stable per name, so a detailer keeps their color between visits.
export const colorOf = (name) => PALETTE[[...String(name)].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

export const Av = ({ name, size }) => {
  const c = colorOf(name);
  return (
    <span className="bo-av" style={{
      "--c": c, ...(size ? { width: size, height: size, fontSize: size * 0.3, borderRadius: size * 0.3 } : null),
    }}>{initials(name)}</span>
  );
};

export const healthColor = (s) => (s >= 75 ? "var(--ac)" : s >= 50 ? "var(--bo-warn)" : "var(--bad)");

// A ring that fills. `pathLength=100` lets the dash be the score with no maths.
export function Ring({ score, big }) {
  const vb = big ? 130 : 48, r = big ? 56 : 19, sw = big ? 9 : 4.5, c = healthColor(score);
  return (
    <span className={`bo-ring${big ? " bo-ring-big" : ""}`} role="img" aria-label={`Health ${score} out of 100`}>
      <svg viewBox={`0 0 ${vb} ${vb}`} aria-hidden="true">
        <circle cx={vb / 2} cy={vb / 2} r={r} fill="none" stroke="var(--ink-3)" strokeWidth={sw} />
        <circle className="bo-ring-v" cx={vb / 2} cy={vb / 2} r={r} fill="none" stroke={c} strokeWidth={sw}
                strokeLinecap="round" pathLength="100" style={{ "--v": score, filter: `drop-shadow(0 0 ${big ? 8 : 4}px ${c})` }} />
      </svg>
      <b>{big ? <span><Count to={score} /><small>HEALTH</small></span> : score}</b>
    </span>
  );
}

let gid = 0;
// A line that draws itself. `series` is any list of numbers; all-zero is drawn by
// the caller as words, not as a flat line.
export function Spark({ series, color = "var(--ac)" }) {
  const [id] = useState(() => `bos${gid++}`);
  const W = 120, H = 36, m = Math.max(...series, 1);
  const p = series.map((v, i) => [(i * W) / (series.length - 1), H - 3 - (v / m) * (H - 8)]);
  const d = p.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" ");
  return (
    <svg className="bo-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={color} stopOpacity=".32" /><stop offset="1" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      <path d={`${d} L${W} ${H} L0 ${H}Z`} fill={`url(#${id})`} />
      <path className="bo-draw" pathLength="1" d={d} fill="none" stroke={color} strokeWidth="1.8"
            strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export const Arrow = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
