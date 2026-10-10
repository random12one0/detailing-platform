// Every check, in one fixed order, each with when it was last checked.
import { ago } from "../../../../lib/officeSystem.js";

export default function Every({ checks, now, i }) {
  return (
    <section className="bo-sec" style={{ "--i": i }} aria-label="Every check">
      <div className="bo-label">Every check</div>
      <ul className="bo-checks">
        {checks.map((c) => (
          <li key={c.key} className={c.state} data-check={c.key}>
            <span className="ic" aria-hidden="true">{c.state === "ok" ? "✓" : "!"}</span>
            <div><b>{c.name}</b><span>{c.says}</span></div>
            <time>{ago(c.at, now)}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}
