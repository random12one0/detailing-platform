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
//
// ROADMAP 2.7 — and W1 is not where the roadmap pointed. It reads as being
// about the calendar cell, but the cell has been a whole-box <button> since
// this sheet was built. The box he was describing is one of the THREE BELOW:
//   "Clicking a date opens a panel with Block this day, Set hours and
//    Drop-off only… you should be able to click anywhere in that box to open
//    it up instead of having to click that specific little button."
// So the card is the target, and the small button on its right is what he was
// aiming at. Each card opens its own editor when tapped anywhere.
//
// ONE THING A WHOLE-CARD TAP DELIBERATELY WILL NOT DO: undo. Clearing a
// blockout, a set of hours or a restriction stays on its own explicit
// control, because a 300px target that silently unblocks a day is a worse
// bug than the one W1 is about.

import { useCallback, useEffect, useState } from "react";
import { Ban, CalendarClock, Plus, Truck, X } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { addDays, dateLong } from "../lib/format.js";
import BookingCard from "./BookingCard.jsx";
import Sheet from "./Sheet.jsx";
import { Segmented, Switch } from "./controls.jsx";

const hhmm = (t) => (t ? t.slice(0, 5) : "");
// An end date typed backwards is a slip, not an instruction to write nothing.
const laterOf = (a, b) => (!b || b < a ? a : b);
const datesFrom = (start, end) => {
  const out = [];
  // Capped, because this writes one row per day and the field is a free date
  // input: a mistyped year would otherwise ask for 36,000 upserts.
  for (let d = start; d <= laterOf(start, end) && out.length < 366; d = addDays(d, 1)) out.push(d);
  return out;
};
// The three cards each open one editor, and it is the card that opens it (W1).
// The controls that live INSIDE a card must not also fire the card, or the
// switch would toggle the block and immediately reopen the form under it.
const own = (fn) => (e) => { e.stopPropagation(); fn(); };
// One place the two restrictions are worded, so the summary line, the save
// button and the customer-facing note cannot drift apart.
const MODES = {
  dropoff: { said: "Drop-offs only — no mobile jobs", only: "Drop-offs only" },
  mobile: { said: "Mobile only — no drop-offs", only: "Mobile only" },
};
// "· through Fri 5 Sep", and nothing at all for a single day.
const spanNote = (start, end) => (end && end > start
  ? ` · through ${new Date(`${end}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`
  : "");

export default function DaySheet({ date, bookings, onClose, onOpenBooking, onNewBooking, onChanged }) {
  const { business, role, settings } = useBusiness();
  const [state, setState] = useState({ loading: true, blockout: null, override: null, dropoff: null });
  const [editing, setEditing] = useState(null); // null | "hours" | "blockout" | "dropoff"
  // W2/W3 — every one of the three can now cover a RANGE. "There should be an
  // option to block multiple days in a row", modelled on the until control the
  // restriction already had, and then the same for hours because he asked
  // ("maybe we do the same for the set hours"). Defaulting to this day means
  // the one-day case costs nobody an extra decision.
  const [hours, setHours] = useState({ open_time: "", close_time: "", notes: "", end_date: date });
  const [block, setBlock] = useState({ event_name: "", all_day: true, start_time: "", end_time: "", end_date: date });
  const [dropoff, setDropoff] = useState({ end_date: date, reason: "", mode: "dropoff" });
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

  // W3. booking_hours_overrides is keyed one row PER DATE — unique
  // (business_id, date) — so a range is N rows, not a row with two ends. That
  // is the table doing what it was built for rather than a shape change: an
  // override is a fact about one day, and clearing one day later must not
  // disturb the others.
  const saveHours = () => run(() => supabase.from("booking_hours_overrides").upsert(
    datesFrom(date, hours.end_date).map((d) => ({
      business_id: business.id, date: d,
      open_time: hours.open_time || null,
      close_time: hours.close_time || null,
      notes: hours.notes || null,
    })), { onConflict: "business_id,date" }));

  const clearHours = () => run(() => supabase.from("booking_hours_overrides")
    .delete().eq("business_id", business.id).eq("date", date));

  const saveBlockout = () => run(() => supabase.from("blockout_dates").insert({
    business_id: business.id,
    event_name: block.event_name.trim() || "Closed",
    start_date: date, end_date: laterOf(date, block.end_date),
    all_day: block.all_day,
    start_time: block.all_day ? null : block.start_time || null,
    end_time: block.all_day ? null : block.end_time || null,
  }));

  const clearBlockout = () => run(() => supabase.from("blockout_dates")
    .delete().eq("id", state.blockout.id).eq("business_id", business.id));

  const saveDropoff = () => run(() => supabase.from("dropoff_only_periods").insert({
    business_id: business.id,
    start_date: date,
    end_date: laterOf(date, dropoff.end_date),
    mode: dropoff.mode,
    reason: dropoff.reason.trim() || null,
  }));

  const clearDropoff = () => run(() => supabase.from("dropoff_only_periods")
    .delete().eq("id", state.dropoff.id).eq("business_id", business.id));

  const active = bookings.filter((b) => b.status !== "cancelled");
  // W4 — a restriction only means something where there are two things to
  // choose between. `settings` is null for a moment on first paint and both
  // flags default true in the schema, so an unknown is treated as both.
  const bothModes = (settings?.mobile_enabled ?? true) && (settings?.dropoff_enabled ?? true);
  // A card is tappable when it HAS an editor to show. The two that are
  // already set do not: their editor would be a second way to say what the
  // card already says, and the only thing left to do to them is clear them,
  // which stays on its own explicit control.
  const openable = (key) => canEdit
    && !(key === "blockout" && state.blockout) && !(key === "dropoff" && state.dropoff);
  // W1 — the CARD is the target, not the button on its right. It TOGGLES, so
  // the way out is the way in; the fields inside stop the event so typing in
  // the form never closes the form.
  const cardProps = (key) => {
    if (!openable(key)) return {};
    const toggle = () => setEditing(editing === key ? null : key);
    return {
      role: "button", tabIndex: 0, "aria-expanded": editing === key,
      onClick: toggle,
      onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } },
    };
  };
  const spanOf = (end) => datesFrom(date, end).length;
  const blockSpan = spanOf(block.end_date);
  const hoursSpan = spanOf(hours.end_date);
  const dropoffSpan = spanOf(dropoff.end_date);
  // Staff can see the day but not rewrite the schedule; the database policies
  // are the real enforcement, this just doesn't offer what would be refused.
  const canEdit = role === "owner";

  return (
    <Sheet
      onClose={onClose}
      title={dateLong(date)}
      subtitle={active.length === 0 ? "No jobs" : `${active.length} job${active.length > 1 ? "s" : ""}`}
    >

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
              <div className={`card${state.blockout ? " attend" : ""}${openable("blockout") ? " tappable" : ""}`}
                {...cardProps("blockout")}>
                <div className="row top between">
                  <div className="row" style={{ gap: 8 }}>
                    <Ban size={18} strokeWidth={2} style={{ flexShrink: 0, color: "var(--text-muted)" }} />
                    <div>
                      {/* The heading used to name a state the day was not in
                          ("Blocked out") while the line under it named the
                          opposite, with a button to the side. It is one
                          thing with two states, so it is a switch. */}
                      <div className="strong">Block this day</div>
                      <div className="quiet" style={{ marginTop: 2 }}>
                        {state.blockout
                          ? `${state.blockout.event_name}${state.blockout.all_day ? "" : ` · ${hhmm(state.blockout.start_time)}–${hhmm(state.blockout.end_time)}`}`
                            + spanNote(state.blockout.start_date, state.blockout.end_date)
                          : "Bookings allowed as normal"}
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <Switch
                      bare
                      checked={!!state.blockout}
                      disabled={busy}
                      onChange={own(() => (state.blockout
                        ? clearBlockout()
                        : setEditing(editing === "blockout" ? null : "blockout")))}
                      label="Block this day"
                    />
                  )}
                </div>
                {editing === "blockout" && !state.blockout && (
                  <>
                    <hr className="rule" />
                    <div className="fields" onClick={(e) => e.stopPropagation()}>
                      <label className="field"><span>Reason</span>
                        <input value={block.event_name} placeholder="Vacation, appointment…"
                          onChange={(e) => setBlock({ ...block, event_name: e.target.value })} /></label>
                      {/* W2 — a range, defaulting to this one day. */}
                      <label className="field"><span>Through (inclusive)</span>
                        <input type="date" value={block.end_date} min={date}
                          onChange={(e) => setBlock({ ...block, end_date: e.target.value })} /></label>
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
                        {busy ? "Saving…" : blockSpan > 1 ? `Block these ${blockSpan} days` : "Block this day"}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* --- Custom hours ----------------------------------------- */}
              <div className={`card${state.override ? " attend" : ""}${openable("hours") ? " tappable" : ""}`}
                {...cardProps("hours")}>
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
                      onClick={own(() => setEditing(editing === "hours" ? null : "hours"))}>
                      {state.override ? "Change" : "Set"}
                    </button>
                  )}
                </div>
                {editing === "hours" && (
                  <>
                    <hr className="rule" />
                    <div className="fields" onClick={(e) => e.stopPropagation()}>
                      <div className="grid2 wide">
                        <label className="field"><span>Open</span>
                          <input type="time" value={hours.open_time}
                            onChange={(e) => setHours({ ...hours, open_time: e.target.value })} /></label>
                        <label className="field"><span>Close</span>
                          <input type="time" value={hours.close_time}
                            onChange={(e) => setHours({ ...hours, close_time: e.target.value })} /></label>
                      </div>
                      <p className="quiet">Leave both blank to be closed.</p>
                      {/* W3 — the same range control the blockout has. He was
                          less sure about this one ("maybe we do the same for
                          the set hours as this for just a short time"), and
                          the shape that answers it is the one already on the
                          other two cards, so there was nothing to invent. */}
                      <label className="field"><span>Through (inclusive)</span>
                        <input type="date" value={hours.end_date} min={date}
                          onChange={(e) => setHours({ ...hours, end_date: e.target.value })} /></label>
                      <label className="field"><span>Note</span>
                        <input value={hours.notes} placeholder="Optional"
                          onChange={(e) => setHours({ ...hours, notes: e.target.value })} /></label>
                      <div className="btnrow">
                        {state.override && (
                          <button className="btn" disabled={busy} onClick={clearHours}>Back to normal</button>
                        )}
                        <button className="btn primary" disabled={busy} onClick={saveHours}>
                          {busy ? "Saving…" : hoursSpan > 1 ? `Save for ${hoursSpan} days` : "Save"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* --- W4: what this day can be booked AS ------------------- */}
              {/* His words: "that button should depend on what customers
                  choose… and that button just adapts to what you choose in
                  the setting too." Three things follow from it.

                  (1) IT DISAPPEARS when the business only offers one way of
                  working. A mobile-only detailer restricting a day to
                  drop-off is offering something they do not do; the control
                  was a fixed "Drop-off only" for everyone.
                  (2) IT GOES BOTH WAYS. He needs to close mobile for a day
                  when the van is out; the detailer with a unit needs to close
                  DROP-OFF when the yard is. Same table, one `mode` column.
                  (3) IT ACTUALLY BLOCKS. `dropoff_only` reached the booking
                  page as a note and nothing else — create-booking never
                  looked at it, so a customer could read "this day is drop-off
                  only" and book a mobile job anyway. Now the slots function
                  hides the wrong ones and create-booking refuses them. */}
              {bothModes && (
              <div className={`card${state.dropoff ? " attend" : ""}${openable("dropoff") ? " tappable" : ""}`}
                {...cardProps("dropoff")}>
                <div className="row top between">
                  <div className="row" style={{ gap: 8 }}>
                    <Truck size={18} strokeWidth={2} style={{ flexShrink: 0, color: "var(--text-muted)" }} />
                    <div>
                      <div className="strong">How this day works</div>
                      <div className="quiet" style={{ marginTop: 2 }}>
                        {state.dropoff
                          ? `${MODES[state.dropoff.mode ?? "dropoff"].said}`
                            + spanNote(state.dropoff.start_date, state.dropoff.end_date)
                            + (state.dropoff.reason ? ` · ${state.dropoff.reason}` : "")
                          : "Mobile and drop-off both bookable"}
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <button className="btn sm inline" disabled={busy}
                      onClick={own(() => (state.dropoff ? clearDropoff() : setEditing(editing === "dropoff" ? null : "dropoff")))}>
                      {state.dropoff ? "Remove" : "Set"}
                    </button>
                  )}
                </div>
                {editing === "dropoff" && !state.dropoff && (
                  <>
                    <hr className="rule" />
                    <div className="fields" onClick={(e) => e.stopPropagation()}>
                      <label className="field"><span>Only take</span>
                        <Segmented value={dropoff.mode}
                          onChange={(v) => setDropoff({ ...dropoff, mode: v })}
                          options={[["dropoff", "Drop-offs"], ["mobile", "Mobile jobs"]]} /></label>
                      <label className="field"><span>Through (inclusive)</span>
                        <input type="date" value={dropoff.end_date} min={date}
                          onChange={(e) => setDropoff({ ...dropoff, end_date: e.target.value })} /></label>
                      <label className="field"><span>Reason</span>
                        <input value={dropoff.reason} placeholder="Van in the shop…"
                          onChange={(e) => setDropoff({ ...dropoff, reason: e.target.value })} /></label>
                      <button className="btn primary" disabled={busy} onClick={saveDropoff}>
                        {busy ? "Saving…" : `${MODES[dropoff.mode].only} for ${dropoffSpan > 1 ? `these ${dropoffSpan} days` : "this day"}`}
                      </button>
                    </div>
                  </>
                )}
              </div>
              )}
            </div>
          )}

          {error && <div className="error-box">{error}</div>}
        </div>
    </Sheet>
  );
}
