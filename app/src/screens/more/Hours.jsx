// Weekly hours, with the bulk editor from the reference admin.
//
// Setting seven days one at a time is not how a detailer sets hours — they
// work Tuesday to Saturday, ten to six, and want to say that once. Ported
// from BusinessSettingsSection.jsx: day chips, three presets, one open and
// one close time, "Apply to N days" (the button counts the selection so you
// can see what you are about to do), and "Mark closed" for the same
// selection. Per-day rows stay underneath for fine-tuning.
//
// One detail kept verbatim from the old implementation because it is right:
// a closed day is a row with NULL open and close, not a missing row. Closed
// is then a decision rather than an absence, and the slot engine can tell
// the difference between "we don't work Sundays" and "hours never set up".
//
// One-off dates and blockouts moved OUT of this screen: they belong on the
// day you tap in the calendar, not in a form where you type the date in by
// hand. This screen is now only the weekly pattern.

import { useCallback, useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PRESETS = [
  ["All days", [0, 1, 2, 3, 4, 5, 6]],
  ["Weekdays", [1, 2, 3, 4, 5]],
  ["Weekends", [0, 6]],
];
const hhmm = (t) => (t ? t.slice(0, 5) : "");

export default function Hours() {
  const { business } = useBusiness();
  const [week, setWeek] = useState(null);      // {0..6: {open,close}} — "" means closed
  const [dirty, setDirty] = useState(false);
  const [picked, setPicked] = useState([1, 2, 3, 4, 5]);
  const [bulk, setBulk] = useState({ open: "09:00", close: "17:00" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("business_hours").select("*").eq("business_id", business.id);
    const map = {};
    for (let i = 0; i < 7; i++) map[i] = { open: "", close: "" };
    for (const r of data ?? []) map[r.weekday] = { open: hhmm(r.open_time), close: hhmm(r.close_time) };
    setWeek(map);
    setDirty(false);
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  const toggleDay = (d) =>
    setPicked((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort()));

  const applyTimes = () => {
    setWeek((w) => {
      const next = { ...w };
      for (const d of picked) next[d] = { open: bulk.open, close: bulk.close };
      return next;
    });
    setDirty(true);
    setMsg(null);
  };

  const applyClosed = () => {
    setWeek((w) => {
      const next = { ...w };
      for (const d of picked) next[d] = { open: "", close: "" };
      return next;
    });
    setDirty(true);
    setMsg(null);
  };

  const setDay = (d, field, value) => {
    setWeek((w) => ({ ...w, [d]: { ...w[d], [field]: value } }));
    setDirty(true);
    setMsg(null);
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    // A row per weekday, always. Closed is null open/close on a present row.
    const rows = Object.entries(week).map(([d, v]) => ({
      business_id: business.id,
      weekday: Number(d),
      open_time: v.open || null,
      close_time: v.close || null,
    }));
    const bad = rows.find((r) => (r.open_time && !r.close_time) || (!r.open_time && r.close_time));
    if (bad) {
      setMsg({ ok: false, text: `${DAYS[bad.weekday]} needs both an open and a close time, or neither.` });
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("business_hours")
      .upsert(rows, { onConflict: "business_id,weekday" });
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Hours saved." });
    if (!error) setDirty(false);
    setSaving(false);
  };

  if (!week) return <div className="center"><div className="spinner" /></div>;

  const openCount = Object.values(week).filter((v) => v.open).length;

  return (
    <div className="group">
      <div className="tight">
        <span className="label">Set several days at once</span>
        <div className="card">
          <div className="thoughts">
            <div className="row wrap" style={{ gap: 6 }}>
              {DAYS.map((name, i) => (
                <button key={i} type="button" aria-pressed={picked.includes(i)}
                  className={`chip ${picked.includes(i) ? "active" : ""}`}
                  onClick={() => toggleDay(i)}>
                  {name.slice(0, 3)}
                </button>
              ))}
            </div>
            <div className="row wrap" style={{ gap: 6 }}>
              {PRESETS.map(([label, days]) => (
                <button key={label} type="button" className="btn sm inline"
                  onClick={() => setPicked(days)}>{label}</button>
              ))}
            </div>

            <hr className="rule" style={{ margin: 0 }} />

            <div className="grid2 wide">
              <label className="field"><span>Open</span>
                <input type="time" value={bulk.open}
                  onChange={(e) => setBulk({ ...bulk, open: e.target.value })} /></label>
              <label className="field"><span>Close</span>
                <input type="time" value={bulk.close}
                  onChange={(e) => setBulk({ ...bulk, close: e.target.value })} /></label>
            </div>
            <div className="btnrow">
              <button className="btn" disabled={picked.length === 0} onClick={applyClosed}>
                Mark closed
              </button>
              <button className="btn primary" disabled={picked.length === 0} onClick={applyTimes}>
                Apply to {picked.length} day{picked.length === 1 ? "" : "s"}
              </button>
            </div>
            <p className="quiet">
              Pick the days, set the times, then apply. Adjust any single day below.
              Nothing saves until you press Save hours.
            </p>
          </div>
        </div>
      </div>

      <div className="tight">
        <span className="label">Your week · {openCount} day{openCount === 1 ? "" : "s"} open</span>
        <div className="card">
          {DAYS.map((label, d) => (
            <div key={d}>
              {d > 0 && <hr className="rule tight" />}
              <div className="row" style={{ gap: 8 }}>
                <span className="body" style={{ width: 46, flexShrink: 0 }}>{label.slice(0, 3)}</span>
                {week[d].open ? (
                  <>
                    <input type="time" value={week[d].open} aria-label={`${label} open`}
                      onChange={(e) => setDay(d, "open", e.target.value)} style={{ minHeight: 38 }} />
                    <span className="quiet">to</span>
                    <input type="time" value={week[d].close} aria-label={`${label} close`}
                      onChange={(e) => setDay(d, "close", e.target.value)} style={{ minHeight: 38 }} />
                    <button className="btn sm inline ghost" aria-label={`Close ${label}`}
                      onClick={() => { setDay(d, "open", ""); setDay(d, "close", ""); }}>Close</button>
                  </>
                ) : (
                  <>
                    <span className="quiet" style={{ flex: 1 }}>Closed</span>
                    <button className="btn sm inline"
                      onClick={() => { setDay(d, "open", bulk.open); setDay(d, "close", bulk.close); }}>
                      Open
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}

      <button className="btn primary" disabled={saving || !dirty} onClick={save}>
        {saving ? "Saving…" : dirty ? "Save hours" : "Saved"}
      </button>

      <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
        <CalendarDays size={17} strokeWidth={2} style={{ flexShrink: 0, color: "var(--text-muted)", marginTop: 2 }} />
        <p className="quiet">
          One-off changes — a day off, different hours for a single date, or a
          drop-off-only stretch — are set by tapping that date on the Calendar.
        </p>
      </div>
    </div>
  );
}
