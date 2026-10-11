// What should land in the next 30 days: each paying real subscription renewing in
// the window and not set to cancel, at its full charge. A timeline of labeled
// pins (9.12b: who pays, when, how much), and the same renewals as a list a
// finger can press. A failed card is drawn red and left out of the total.
import { comingIn } from "../../../../lib/officeMoney.js";
import { Arrow, Av, usd } from "../../ui.jsx";

const day = (t) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// THE GEOMETRY. Labels take four lanes in turn (above, below, far above, far
// below), so two in one lane are four pins apart; pins keep date order but sit at
// least GAP px apart, so those four steps always clear a label (4 x GAP > LAB).
// The axis is inset by half a label, so no label can leave the track. The track
// is never narrower than MIN; past that it scrolls sideways in its own box.
const LAB = 172, GAP = 46, PAD = LAB / 2 + 4, MIN = 600;
const LH = 96, NEAR = 14, FAR = NEAR + LH + 10, AXIS = 26;
function layout(pins) {
  const span = MIN - 2 * PAD;
  const xs = [];
  pins.forEach((p, k) => xs.push(Math.max(PAD + (p.day / 30) * span, k ? xs[k - 1] + GAP : -Infinity)));
  // Empty, the line fits its box with a small inset: nothing to make room for.
  const tw = pins.length ? Math.max(MIN, xs.at(-1) + PAD) : 0, pad = pins.length ? PAD : 28;
  const reach = (lanes) => (pins.length >= lanes + 2 ? FAR : pins.length >= lanes ? NEAR : -LH) + LH + 8;
  const up = Math.max(reach(1), 30), down = reach(2);
  return { tw, pad, up, height: up + down + AXIS, f: xs.map((x) => (x - PAD) / (tw - 2 * PAD)) };
}

export default function ComingIn({ ctx, i }) {
  const { pins: paid, late, total } = comingIn(ctx.rows);
  const pins = [...paid, ...late.map((p) => ({ ...p, late: true }))].sort((a, b) => a.at - b.at);
  const g = layout(pins);
  const at = (f) => `calc(${PAD}px + ${f} * (100% - ${2 * PAD}px))`;
  return (
    <section className="bo-sec" style={{ "--i": i }} aria-label="Coming in, next 30 days">
      <div className="bo-label">Coming in · next 30 days</div>
      <div className="bo-h2" data-testid="coming">{usd(total)} expected</div>
      <div className="bo-tl" role="group" aria-label="Renewals on a timeline">
        <div className={`bo-tl-in ${pins.length ? "has-pins" : "is-empty"}`} style={{ "--tw": `${g.tw}px`, "--pad": `${g.pad}px`, height: g.height, "--rail": `${g.up}px` }}>
          <i className="bo-tl-rail" />
          {pins.map((p, n) => {
            const state = p.late ? "late" : p.yearly ? "yr" : "";
            const what = `${p.row.name}, ${usd(p.cents)}${p.yearly ? " a year" : ""} on ${day(p.at)}${p.late ? ", card failed" : ""}`;
            return (
              <button key={p.row.id} type="button" title={what} aria-label={what} onClick={() => ctx.open(p.row.id)}
                className={`bo-pin ${n % 2 ? "low" : ""} ${state}`.trim()}
                style={{ left: at(g.f[n]), "--h": `${n % 4 >= 2 ? FAR : NEAR}px`, "--d": `${300 + n * 90}ms` }}>
                <i className="dot" /><i className="stem" />
                <span className="lab"><span><b>{usd(p.cents)}</b> {day(p.at)}</span><span className="n">{p.row.name}</span>{(p.yearly || p.late) && <small>{p.late ? "card failed" : "a year"}</small>}</span>
              </button>
            );
          })}
          {pins.length === 0 && <p className="bo-tl-none">Nothing renews in the next 30 days.</p>}
          <span className="now">Today</span>
          <span className="end">{day(Date.now() + 30 * 864e5)}</span>
        </div>
      </div>
      {pins.length > 0 && (
        <ol className="bo-due">
          {pins.map((p) => (
            <li key={p.row.id} className={p.late ? "late" : ""}>
              <button type="button" onClick={() => ctx.open(p.row.id)}>
                <span className="when">{day(p.at)}</span>
                <Av name={p.row.name} />
                <b>{p.row.name}</b>
                <span className="amt">{usd(p.cents)}{p.yearly && <small> a year</small>}{p.late && <small> card failed</small>}</span>
                <Arrow />
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
