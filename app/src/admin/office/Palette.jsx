// CTRL K: type a detailer's name, link or email, or a place, and jump to it.
// Places come from places.jsx, so a new place is findable the moment it exists.
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Av } from "./ui.jsx";
import { PLACES } from "./places.jsx";

export default function Palette({ ctx, onClose }) {
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const input = useRef(null);
  const list = useRef(null);
  useEffect(() => { input.current?.focus(); }, []);

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const places = PLACES.map((p) => ({ kind: "Places", label: p.label, hint: "Go", run: () => ctx.go(p.key) }));
    const people = ctx.rows.map((r) => ({
      kind: "Detailers", row: r, label: r.name, hint: r.owner_email ?? r.slug,
      hay: [r.name, r.slug, r.owner_email].join(" ").toLowerCase(),
      run: () => ctx.open(r.id),
    }));
    return [...places, ...people].filter((it) => !needle || (it.hay ?? `${it.label} ${it.hint}`.toLowerCase()).includes(needle));
  }, [q, ctx]);

  const at = Math.min(hi, Math.max(0, items.length - 1));
  useEffect(() => { list.current?.querySelector(".hi")?.scrollIntoView({ block: "nearest" }); }, [at, items]);
  const run = (i) => { const it = items[i]; if (it) { onClose(); it.run(); } };

  const onKey = (e) => {
    if (e.key === "ArrowDown") { setHi(Math.min(items.length - 1, at + 1)); e.preventDefault(); }
    else if (e.key === "ArrowUp") { setHi(Math.max(0, at - 1)); e.preventDefault(); }
    else if (e.key === "Enter") run(at);
    else if (e.key === "Escape") onClose();
  };

  let last = "";
  return (
    <div className="bo-pal-wrap on" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bo-pal" role="dialog" aria-modal="true" aria-label="Find a detailer">
        <svg className="si" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <input ref={input} value={q} placeholder="Type a detailer or a place" autoComplete="off" aria-label="Find a detailer or a place"
               onChange={(e) => { setQ(e.target.value); setHi(0); }} onKeyDown={onKey} />
        <ul ref={list}>
          {items.map((it, i) => {
            const head = it.kind !== last ? <li className="gl" key={`g${it.kind}`}>{it.kind}</li> : null;
            last = it.kind;
            return (
              <Fragment key={i}>
                {head}
                <li className={i === at ? "hi" : ""} onMouseMove={() => setHi(i)} onClick={() => run(i)}>
                  {it.row ? <Av name={it.row.name} size={32} /> : <span className="bo-av go-ic">→</span>}
                  {it.label}<span>{it.hint}</span>
                </li>
              </Fragment>
            );
          })}
          {items.length === 0 && <li className="gl">Nothing matches “{q}”</li>}
        </ul>
      </div>
    </div>
  );
}
