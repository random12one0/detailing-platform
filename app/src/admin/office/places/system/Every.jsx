// Every check, in one fixed order, each with when it was last checked.
// 9.12d: folded to one line of counts that opens on one press, the price
// editor's pattern (9.12c). Nothing is hidden by it: every check that is not
// working is also in "Needs a look" above, which never folds.
import { ChevronDown } from "lucide-react";
import { ago } from "../../../../lib/officeSystem.js";

const KINDS = [["ok", "Working", "var(--ac)"], ["bad", "Broken", "var(--bad)"], ["warn", "Near a limit", "var(--bo-warn)"], ["never", "Never proven", "var(--bo-warn)"]];

export default function Every({ checks, now, i }) {
  const counts = KINDS.map(([k, word, c]) => [k, word, c, checks.filter((x) => x.state === k).length]).filter((x) => x[3] > 0);
  return (
    <section className="bo-sec" style={{ "--i": i }} aria-label="Every check">
      <details className="bo-fold">
        <summary className="bo-fold-summary">
          <span className="bo-label">Every check</span>
          <span className="bo-fold-preview">
            {counts.map(([k, word, c, n]) => <span key={k} data-state={k} style={{ "--c": c }}><span>{word}</span><b>{n}</b></span>)}
          </span>
          <span className="bo-fold-more">All {checks.length} checks <ChevronDown size={18} aria-hidden="true" /></span>
        </summary>
        <ul className="bo-checks">
          {checks.map((c) => (
            <li key={c.key} className={c.state} data-check={c.key}>
              <span className="ic" aria-hidden="true">{c.state === "ok" ? "✓" : "!"}</span>
              <div><b>{c.name}</b><span>{c.says}</span></div>
              <time>{ago(c.at, now)}</time>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
