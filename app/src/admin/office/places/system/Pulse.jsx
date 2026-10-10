// "N of M working" beside a pulse, and every check as a node wired to the middle.
// A working line carries a slow flow; anything else is dashed and its node rings.
import { Count } from "../../ui.jsx";

const COLOR = { ok: "var(--ac)", warn: "var(--bo-warn)", never: "var(--bo-warn)", bad: "var(--bad)" };
const W = 720, H = 400, CX = 360, CY = 200, RX = 196, RY = 150;

export default function Pulse({ checks, i }) {
  const ok = checks.filter((c) => c.state === "ok").length;
  const broken = checks.some((c) => c.state === "bad");
  const nodes = checks.map((c, k) => {
    const a = -Math.PI / 2 + (k / checks.length) * Math.PI * 2;
    const x = CX + Math.cos(a) * RX, y = CY + Math.sin(a) * RY, side = Math.abs(x - CX) < 30 ? 0 : Math.sign(x - CX);
    return { c, x, y, side };
  });
  return (
    <section className="bo-sec bo-sys-hero" style={{ "--i": i }} aria-label="How many checks are working">
      <div className="bo-calmrow">
        <div className={`bo-pulse${broken ? " bad" : ""}`} aria-hidden="true"><i /><i /><i /><b /></div>
        <div className="bo-big" data-testid="working"><Count to={ok} /><small> of {checks.length} working</small></div>
      </div>
      <svg className="bo-constel" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${ok} of ${checks.length} checks working`}>
        {nodes.map(({ c, x, y }) => (
          <line key={`l${c.key}`} className={`bo-wire ${c.state}`} x1={x} y1={y} x2={CX} y2={CY} stroke={COLOR[c.state]} />
        ))}
        {nodes.map(({ c, x, y, side }) => {
          const tx = side === 0 ? x : x + side * 18, ty = side === 0 ? (y < CY ? y - 22 : y + 30) : y + 5;
          const anchor = side === 0 ? "middle" : side > 0 ? "start" : "end";
          return (
            <g key={c.key} className={`bo-node ${c.state}`} data-check={c.key}>
              {c.state !== "ok" && <circle className="bo-node-ring" cx={x} cy={y} r="10" stroke={COLOR[c.state]} />}
              <circle cx={x} cy={y} r="8" fill={COLOR[c.state]} style={{ filter: `drop-shadow(0 0 8px ${COLOR[c.state]})` }} />
              <text x={tx} y={ty} textAnchor={anchor} className="bo-node-l" fill={c.state === "ok" ? "var(--bone-2)" : COLOR[c.state]}>{c.name}</text>
            </g>
          );
        })}
        <circle className="bo-core-wave" cx={CX} cy={CY} r="40" />
        <circle cx={CX} cy={CY} r="36" className={`bo-core${broken ? " bad" : ""}`} />
        <text x={CX} y={CY + 6} textAnchor="middle" className="bo-core-t">LIVE</text>
      </svg>
    </section>
  );
}
