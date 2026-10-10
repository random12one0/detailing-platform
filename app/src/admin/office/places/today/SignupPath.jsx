// Where detailers get to. Each bar is its own count out of everyone, not a funnel
// (a booking detailer with setup half done is in both rows, and that is correct;
// see signupPath in lib/officeToday.js). Real detailers only.
import { useMemo } from "react";
import { signupPath } from "../../../../lib/officeToday.js";

export default function SignupPath({ ctx, i }) {
  const path = useMemo(() => signupPath(ctx.rows), [ctx.rows]);
  return (
    <section className="bo-sec" style={{ "--i": i }} aria-label="Sign-up path">
      <div className="bo-label">Where detailers get to</div>
      {path.of === 0 ? <p className="bo-none bo-calm">Nobody has signed up yet.</p> : (
        <ul className="bo-path">
          {path.stages.map((s, k) => (
            <li key={s.key}>
              <span className="bo-path-l">{s.label}</span>
              <span className="bo-path-bar"><i style={{ "--w": `${(s.count / path.of) * 100}%`, "--d": `${k * 90}ms` }} /></span>
              <b className="bo-path-n">{s.count}<small> of {s.of}</small></b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
