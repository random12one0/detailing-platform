// What happens when you tap a date.
//
// Previously: nothing. The schema has had blockout_dates,
// booking_hours_overrides and dropoff_only_periods since phase 1 and there
// was no way to reach any of them from the calendar — you had to go to
// More → Hours and type the date in by hand. That is the functional gap.
//
// This sheet is the whole day: its jobs, and the three things you can say
// about it. Each control shows the CURRENT state for that date and toggles
// it, rather than being a blank form that only ever adds.

import { useCallback, useEffect, useState } from "react";
import { Ban, CalendarClock, Plus, Truck, X } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { dateLong } from "../lib/format.js";
import BookingCard from "./BookingCard.jsx";

const hhmm = (t) => (t ? t.slice(0, 5) : "");

export default function DaySheet({ date, bookings, onClose, onOpenBooking, onNewBooking, onChanged }) {
  const { business, role } = useBusiness();
  const [state, setState] = useState({ loading: true, blockout: null, override: null, dropoff: null });
  const [editing, setEditing] = useState(null); // null | "hours" | "blockout" | "dropoff"
  const [hours, setHours] = useState({ open_time: "", close_time: "", notes: "" });
  const [block, setBlock] = useState({ event_name: "", all_day: true, start_time: "", end_time: "" });
  const [dropoff, setDropoff] = useState({ end_date: date, reason: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [bl, ov, dp] = await Promise.all([
      supabase.from("blockout_dates").select("*").eq("business_id", business.id)
        .lte("start_date", date).gte("end_date", date).limit(1),
      supabase.from("booking_hours_overrides").select("*").eq("business_id", business.id)
        .eq("date", date).limit(1),
      supabase.from("dropoff_only_periods").select("*").eq("business_id", business.id)
        .lte("start_date", date).gte("end_date", date).limit(1),
    ]);
    const override = ov.data?.[0] ?? null;
    setState({ loading: false, blockout: bl.data?.[0] ?? null, override, dropoff: dp.data?.[0] ?? null });
    if (override) {
      setHours({ open_time: hhmm(override.open_time), close_time: hhmm(override.close_time), notes: override.notes ?? "" });
    }
  }, [business.id, date]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      const { error: e } = await fn();
      if (e) throw new Error(e.message);
      setEditing(null);
      await load();
      onChanged?.();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  const saveHours = () => run(() => supabase.from("booking_hours_overrides").upsert({
    business_id: business.id, date,
    open_time: hours.open_time || null,
    close_time: hours.close_time || null,
    notes: hours.notes || null,
  }, { onConflict: "business_id,date" }));

  const clearHours = () => run(() => supabase.from("booking_hours_overrides")
    .delete().eq("business_id", business.id).eq("date", date));

  const saveBlockout = () => run(() => supabase.from("blockout_dates").insert({
    business_id: business.id,
    event_name: block.event_name.trim() || "Closed",
    start_date: date, end_date: date,
    all_day: block.all_day,
    start_time: block.all_day ? null : block.start_time || null,
    end_time: block.all_day ? null : block.end_time || null,
  }));

  const clearBlockout = () => run(() => supabase.from("blockout_dates")
    .delete().eq("id", state.blockout.id).eq("business_id", business.id));

  const saveDropoff = () => run(() => supabase.from("dropoff_only_periods").insert({
    business_id: business.id,
    start_date: date,
    end_date: dropoff.end_date < date ? date : dropoff.end_date,
    reason: dropoff.reason.trim() || null,
  }));

  const clearDropoff = () => run(() => supabase.from("dropoff_only_periods")
    .delete().eq("id", state.dropoff.id).eq("business_id", business.id));

  const active = bookings.filter((b) => b.status !== "cancelled");
  // Staff can see the day but not rewrite the schedule; the database policies
  // are the real enforcement, this just doesn't offer what would be refused.
  const canEdit = role === "owner";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <h2>{dateLong(date)}</h2>
            <p className="quiet" style={{ marginTop: 2 }}>
              {active.length === 0 ? "No jobs" : `${active.length} job${active.length > 1 ? "s" : ""}`}
            </p>
          </div>
          <button className="x" onClick={onClose} aria-label="Close"><X size={18} strokeWidth={2} /></button>
        </div>

        <div className="group">
          <div className="tight">
            {active.length === 0
              ? <div className="dashed">Nothing booked.</div>
              : active.map((b) => (
                <BookingCard key={b.id} booking={b} dense onClick={() => onOpenBooking(b)} />
              ))}
            <button className="btn filled" onClick={() => onNewBooking(date)}>
              <Plus strokeWidth={2} /> Add a job on this day
            </button>
          </div>

          {state.loading ? <div className="spinner" /> : (
            <div className="tight">
              <span className="label">This day</span>

              {/* --- Blocked out ------------------------------------------ */}
              <div className={`card${state.blockout ? " attend" : ""}`}>
                <div className="row top between">
                  <div className="row" style={{ gap: 8 }}>
                    <Ban size={18} strokeWidth={2} style={{ flexShrink: 0, color: "var(--text-muted)" }} />
                    <div>
                      <div className="strong">Blocked out</div>
                      <div className="quiet" style={{ marginTop: 2 }}>
                        {state.blockout
                          ? `${state.blockout.event_name}${state.blockout.all_day ? "" : ` · ${hhmm(state.blockout.start_time)}–${hhmm(state.blockout.end_time)}`}`
                          : "Bookings allowed as normal"}
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <button className="btn sm inline" disabled={busy}
                      onClick={() => (state.blockout ? clearBlockout() : setEditing(editing === "blockout" ? null : "blockout"))}>
                      {state.blockout ? "Remove" : "Block"}
                    </button>
                  )}
                </div>
                {editing === "blockout" && !state.blockout && (
                  <>
                    <hr className="rule" />
                    <div className="fields">
                      <label className="field"><span>Reason</span>
                        <input value={block.event_name} placeholder="Vacation, appointment…"
                          onChange={(e) => setBlock({ ...block, event_name: e.target.value })} /></label>
                      <label className="row" style={{ gap: 10 }}>
                        <input type="checkbox" checked={block.all_day}
                          onChange={(e) => setBlock({ ...block, all_day: e.target.checked })} />
                        <span className="body">All day</span>
                      </label>
                      {!block.all_day && (
                        <div className="grid2 wide">
                          <label className="field"><span>From</span>
                            <input type="time" value={block.start_time}
                              onChange={(e) => setBlock({ ...block, start_time: e.target.value })} /></label>
                          <label className="field"><span>To</span>
                            <input type="time" value={block.end_time}
                              onChange={(e) => setBlock({ ...block, end_time: e.target.value })} /></label>
                        </div>
                      )}
                      <button className="btn primary" disabled={busy} onClick={saveBlockout}>
                        {busy ? "Saving…" : "Block this day"}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* --- Custom hours ----------------------------------------- */}
              <div className={`card${state.override ? " attend" : ""}`}>
                <div className="row top between">
                  <div className="row" style={{ gap: 8 }}>
                    <CalendarClock size={18} strokeWidth={2} style={{ flexShrink: 0, color: "var(--text-muted)" }} />
                    <div>
                      <div className="strong">Hours</div>
                      <div className="quiet" style={{ marginTop: 2 }}>
                        {state.override
                          ? (state.override.open_time
                            ? `${hhmm(state.override.open_time)}–${hhmm(state.override.close_time)} just for this day`
                            : "Closed just for this day")
                          : "Your normal hours for this weekday"}
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <button className="btn sm inline" disabled={busy}
                      onClick={() => setEditing(editing === "hours" ? null : "hours")}>
                      {state.override ? "Change" : "Set"}
                    </button>
                  )}
                </div>
                {editing === "hours" && (
                  <>
                    <hr className="rule" />
                    <div className="fields">
                      <div className="grid2 wide">
                        <label className="field"><span>Open</span>
                          <input type="time" value={hours.open_time}
                            onChange={(e) => setHours({ ...hours, open_time: e.target.value })} /></label>
                        <label className="field"><span>Close</span>
                          <input type="time" value={hours.close_time}
                            onChange={(e) => setHours({ ...hours, close_time: e.target.value })} /></label>
                      </div>
                      <p className="quiet">Leave both blank to be closed this day.</p>
                      <label className="field"><span>Note</span>
                        <input value={hours.notes} placeholder="Optional"
                          onChange={(e) => setHours({ ...hours, notes: e.target.value })} /></label>
                      <div className="btnrow">
                        {state.override && (
                          <button className="btn" disabled={busy} onClick={clearHours}>Back to normal</button>
                        )}
                        <button className="btn primary" disabled={busy} onClick={saveHours}>
                          {busy ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* --- Drop-off only ---------------------------------------- */}
              <div className={`card${state.dropoff ? " attend" : ""}`}>
                <div className="row top between">
                  <div className="row" style={{ gap: 8 }}>
                    <Truck size={18} strokeWidth={2} style={{ flexShrink: 0, color: "var(--text-muted)" }} />
                    <div>
                      <div className="strong">Drop-off only</div>
                      <div className="quiet" style={{ marginTop: 2 }}>
                        {state.dropoff
                          ? `No mobile jobs until ${state.dropoff.end_date}${state.dropoff.reason ? ` · ${state.dropoff.reason}` : ""}`
                          : "Mobile and drop-off both bookable"}
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <button className="btn sm inline" disabled={busy}
                      onClick={() => (state.dropoff ? clearDropoff() : setEditing(editing === "dropoff" ? null : "dropoff"))}>
                      {state.dropoff ? "Remove" : "Set"}
                    </button>
                  )}
                </div>
                {editing === "dropoff" && !state.dropoff && (
                  <>
                    <hr className="rule" />
                    <div className="fields">
                      <label className="field"><span>Until (inclusive)</span>
                        <input type="date" value={dropoff.end_date} min={date}
                          onChange={(e) => setDropoff({ ...dropoff, end_date: e.target.value })} /></label>
                      <label className="field"><span>Reason</span>
                        <input value={dropoff.reason} placeholder="Van in the shop…"
                          onChange={(e) => setDropoff({ ...dropoff, reason: e.target.value })} /></label>
                      <button className="btn primary" disabled={busy} onClick={saveDropoff}>
                        {busy ? "Saving…" : "Drop-off only for these days"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {error && <div className="error-box">{error}</div>}
        </div>
      </div>
    </div>
  );
}
