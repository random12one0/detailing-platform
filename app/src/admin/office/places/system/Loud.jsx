// Only what is broken, near a limit or never proven, broken first. When every
// check works this section draws nothing at all: quiet is the good news.
import { ago, loudOf } from "../../../../lib/officeSystem.js";

const WORD = { bad: "Broken", warn: "Near a limit", never: "Never proven" };

export default function Loud({ checks, now, i }) {
  const loud = loudOf(checks);
  if (!loud.length) return null;
  return (
    <section className="bo-sec" style={{ "--i": i }} aria-label="Needs a look">
      <div className="bo-label">Needs a look <span className="bo-label-n">{loud.length}</span></div>
      <ul className="bo-loud">
        {loud.map((c) => (
          <li key={c.key} className={c.state} data-check={c.key}>
            <em>{WORD[c.state]}</em>
            <b>{c.name}</b>
            <span>{c.says}</span>
            <time>{c.at ? `checked ${ago(c.at, now)}` : "never checked"}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}
