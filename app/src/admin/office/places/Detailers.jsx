// THE DETAILERS PLACE: one list, one row per detailer, and nothing else to
// learn. Click a row (or a bubble) and the side panel opens (DetailerPanel.jsx,
// mounted by the shell so Ctrl K can open it from anywhere).
//
// Each row: a health ring, a setup bar, 12 weeks of bookings, money earned this
// month and the one thing wrong. The bookings line is read lazily, per row, as it
// scrolls into view: the list payload has no weekly series and adding one is a
// server change, which is a publish and so Andrew's. Until a row's history
// arrives it says so; a failed read says that instead of drawing a flat line.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FILTERS, healthOf, issueOf, setupOf, sortRows, statusOf, weeklyBookings,
} from "../../../lib/officeDetailers.js";
import { STEPS } from "../../../lib/setup.js";
import { money } from "../../../lib/format.js";
import { Arrow, Av, Ring, Spark, healthColor } from "../ui.jsx";

const TONE = { good: "var(--ac)", bad: "var(--bad)", warn: "var(--bo-warn)", cool: "var(--bo-cool)", mute: "var(--fog-2)" };

function SetupBar({ row, delay }) {
  const sp = setupOf(row);
  const left = STEPS.filter(([k]) => !sp.done.has(k)).map((s) => s[2]).join(", ");
  const done = sp.count >= sp.total;
  return (
    <div className="bo-setup-wrap">
      <div className="bo-setup" role="img" aria-label={`Setup ${sp.count} of ${sp.total}`} title={done ? "" : `Still to do: ${left}`}>
        {STEPS.map(([k], i) => (
          <i key={k} className={sp.done.has(k) ? "f" : ""}
             style={{ "--d": `${(i * 0.04 + delay).toFixed(2)}s`, "--c": done ? "var(--ac)" : "var(--bo-cool)" }} />
        ))}
      </div>
      <div className="bo-setup-l">{done ? "Setup done" : `${sp.count} of ${sp.total} done`}</div>
    </div>
  );
}

// Lazy history: ask for this row's detail the first time it is on screen.
function useSeen(ref, onSeen) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!("IntersectionObserver" in window)) { onSeen(); return undefined; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); onSeen(); } }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
}

function Trend({ row, detail, color }) {
  if (!detail) return <span className="bo-dim">Reading…</span>;
  if (detail.error) return <span className="bo-dim">Could not read</span>;
  const weeks = weeklyBookings(detail.bookings);
  if (weeks.every((v) => !v)) return <span className="bo-dim">No bookings yet</span>;
  return <Spark series={weeks} color={color} />;
}

function Row({ row, i, ctx }) {
  const ref = useRef(null);
  useSeen(ref, () => ctx.ensure(row.id));
  const st = statusOf(row), h = healthOf(row), issue = issueOf(row);
  const detail = ctx.details[row.id];
  const sc = TONE[st.color];
  return (
    <button ref={ref} type="button" className={`bo-row${ctx.openId === row.id ? " sel" : ""}`}
            style={{ "--i": Math.min(i, 14) }} onClick={() => ctx.open(row.id)}>
      <span className="bo-who c-who">
        <Av name={row.name} />
        <span className="bo-who-t">
          <b><span className="n">{row.name}</span>{row.is_demo && <em className="bo-test">Test</em>}</b>
          <span>{row.owner_email ?? "No owner account yet"}</span>
          <span className="bo-status" style={{ color: sc }}><i style={{ background: sc, boxShadow: `0 0 8px ${sc}` }} />{st.label}</span>
        </span>
      </span>
      <span className="c-ring"><Ring score={h.score} /></span>
      <span className="c-setup"><SetupBar row={row} delay={Math.min(i, 14) * 0.03} /></span>
      <span className="c-spark"><Trend row={row} detail={detail} color={healthColor(h.score)} /></span>
      <span className="bo-earned c-earn">
        <b>{row.revenue_month ? money(row.revenue_month) : "—"}</b>
        <span>{row.jobs_month} {row.jobs_month === 1 ? "job" : "jobs"}</span>
      </span>
      <span className={`bo-issue c-issue${issue ? "" : " ok"}`}>
        {issue
          ? <><span className="k" style={{ color: TONE[issue.color] }}>{issue.kicker}</span>{issue.text}</>
          : "Nothing to do"}
      </span>
      <span className="c-arr"><span className="bo-arrow"><Arrow /></span></span>
    </button>
  );
}

// Days since their last booking, for the bubble chart's x axis. Never booked
// sits at the "2 days" edge on purpose: the bubble is hollow, which says why.
const daysOf = (r) => (r.days_since_booking == null ? 2 : Math.min(r.days_since_booking, 30));

function Bubbles({ rows, ctx }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShown(true), 60); return () => clearTimeout(t); }, []);
  return (
    <div className="bo-bubbles">
      <div className="bo-gridl" />
      <div className="bo-zone tl">Doing great</div><div className="bo-zone br">Slipping away</div>
      <div className="bo-ax x">Days since their last booking →</div>
      <div className="bo-ax y">Health →</div>
      {rows.map((r, i) => {
        const h = healthOf(r), st = statusOf(r);
        const x = 7 + (daysOf(r) / 30) * 84, y = 90 - (h.score / 100) * 78;
        const size = 38 + Math.sqrt(Math.max(0, r.revenue_month || 0)) * 0.6;
        const c = TONE[st.color];
        return (
          <button key={r.id} type="button" aria-label={`${r.name}, health ${h.score}`}
                  className={`bo-bub${shown ? " in" : ""}${st.key === "setup" ? " dash" : ""}`}
                  style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, "--c": c, transitionDelay: `${i * 50}ms` }}
                  onClick={() => ctx.open(r.id)}>
            <span className="fl" style={{ animationDelay: `-${(i * 0.9) % 6}s`, animationDuration: `${6 + (i % 4)}s` }}>
              <span>{r.name.slice(0, 2).toUpperCase()}</span>
            </span>
            <span className="nm">{r.name}</span>
          </button>
        );
      })}
    </div>
  );
}

const COLS = [["name", "Detailer"], ["health", "Health"], [null, "Setup"], [null, "Bookings · 12 wks"], ["earned", "Earned"], [null, "Main issue"], [null, ""]];

export default function Detailers({ ctx }) {
  const [filter, setFilter] = useState(ctx.preset?.filter ?? "all");
  const [mode, setMode] = useState("list");
  const [sort, setSort] = useState("need");
  const f = FILTERS.find((x) => x[0] === filter)?.[2] ?? (() => true);
  const list = useMemo(() => sortRows(ctx.rows.filter(f), sort), [ctx.rows, filter, sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useMemo(() => Object.fromEntries(FILTERS.map(([k, , fn]) => [k, ctx.rows.filter(fn).length])), [ctx.rows]);
  const modeRef = useRef(null);
  const [thumb, setThumb] = useState({ w: 0, x: 0 });
  useEffect(() => {
    const b = modeRef.current?.querySelector(`[data-mode="${mode}"]`);
    if (b) setThumb({ w: b.offsetWidth, x: b.offsetLeft - 4 });
  }, [mode]);

  return (
    <>
      <div className="bo-toolbar">
        <div className="bo-filters" role="group" aria-label="Filter detailers">
          {FILTERS.map(([k, label]) => (
            <button key={k} type="button" className={`bo-fchip${filter === k ? " on" : ""}`} aria-pressed={filter === k}
                    onClick={() => setFilter(k)}>{label}<span>{counts[k]}</span></button>
          ))}
        </div>
        <div className="bo-seg" ref={modeRef} role="group" aria-label="View">
          <span className="thumb" style={{ width: thumb.w, transform: `translateX(${thumb.x}px)` }} />
          <button type="button" data-mode="list" className={mode === "list" ? "on" : ""} aria-pressed={mode === "list"} onClick={() => setMode("list")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>List
          </button>
          <button type="button" data-mode="bubbles" className={mode === "bubbles" ? "on" : ""} aria-pressed={mode === "bubbles"} onClick={() => setMode("bubbles")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><circle cx="8" cy="15" r="4" /><circle cx="16" cy="8" r="3" /><circle cx="18" cy="17" r="2" /></svg>Bubbles
          </button>
        </div>
      </div>

      {mode === "list" ? (
        <div className="bo-list">
          <div className="bo-thead" aria-hidden="false">
            {COLS.map(([k, label], i) => (k
              ? <button key={i} type="button" className={sort === k ? "on" : ""} onClick={() => setSort(sort === k ? "need" : k)}>{label}</button>
              : <span key={i}>{label}</span>))}
          </div>
          {list.map((r, i) => <Row key={r.id} row={r} i={i} ctx={ctx} />)}
          {list.length === 0 && <p className="bo-none">Nobody here.</p>}
        </div>
      ) : (
        <Bubbles rows={list} ctx={ctx} />
      )}
    </>
  );
}

