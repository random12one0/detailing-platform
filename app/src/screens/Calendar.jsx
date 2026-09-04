// Calendar — the month, the day under it, and the history.
//
// REBUILT IN ROADMAP 2.11 STEP 6, STAGE 3, against
// docs/dashboard-screen-designs-2026-08-31.md §4-6 (the shape) and
// docs/dashboard-phone-pass-2026-08-31.md §5-7 (the phone, which overrides it
// wherever the two disagree). What changed and why:
//
//   THE MONTH  The desk writes the month out. At --wrap a cell is 163px and
//              carries a time and a name, so Booked / Done / No-show stop
//              being 7px marks and become WORDS — and the legend shrinks to
//              the two facts a cell cannot write, Blocked and One type only.
//              At every width the legend now lists only the marks that are
//              actually ON the month shown: a five-symbol legend physically
//              larger than the marks it decodes is a tell, and on a phone it
//              is a full row of screen spent explaining two things that are
//              not there.
//   THE DAY    Tapping a date used to throw a full-height sheet over the
//              month. It opens INLINE, directly beneath the grid, at every
//              width — one component instead of two, and the month stays on
//              the screen, which is the whole of §4a's concern answered
//              rather than traded away. `.cal-cell.selected` had been dead
//              CSS since roadmap 2.6; this is what revives it.
//   THE HISTORY  18 records drew as 18 cards, 3,942px tall, at every width
//              (Part B row 8). They are a ruled list with columns now —
//              two cells on a phone, five at a desk — broken by month rules
//              that carry the month's own total, which is the only
//              navigation 400 rows need. The nine filter chips collapse
//              behind one control on a phone and live in the second column
//              at a desk.
//
// AND TWO DOORS CLOSED. The screen's own *New booking* button is gone — the
// header's `+` is the one doorway (component inventory §3d) — and the job
// record no longer renders its own <Sheet> here: RecordHost decides, so at a
// desk a job opens BESIDE the list it came from instead of over it (F11).
//
// The month grid still carries three independent facts per day by SHAPE
// (roadmap 2.4 item 3c): jobs are circles (hollow = ahead, solid = landed) or
// a bar (it did not happen), and facts about the DAY — blocked, one-type-only
// — are squares. No two marks that can share a cell share a form, so the grid
// reads under any tenant accent. The rule is in theme.css § THE MARKS.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { useBookings } from "../hooks/useBookings.js";
import { useWide } from "../hooks/useWide.js";
import { useLeaving } from "../hooks/useLeaving.js";
import { addDays, dateLong, money, time12, todayLocal } from "../lib/format.js";
import BookingDetail, { jobRecordProps } from "../components/BookingDetail.jsx";
import RecordHost from "../components/RecordHost.jsx";
import NewBookingModal from "../components/NewBookingModal.jsx";
import DaySheet from "../components/DaySheet.jsx";

const pad = (n) => String(n).padStart(2, "0");
const STATUSES = [
  ["all", "All"], ["confirmed", "Confirmed"], ["completed", "Completed"],
  ["cancelled", "Cancelled"], ["no_show", "No show"],
];
// ROADMAP 2.12. The sixth chip exists only for a business that takes requests:
// a reserve-mode detailer can never have a pending booking, and a filter that
// can only ever return nothing is a control that teaches the row above it is
// incomplete. `STATUS_SAID` below is built from BOTH so a pending job that
// predates a mode change is still named correctly wherever it is printed.
const WAITING = ["pending", "Waiting"];
const RANGES = [
  ["30", "Last 30 days"], ["90", "Last 90 days"], ["365", "Last year"], ["all", "Everything"],
];
const RANGE_SAID = {
  30: "the last 30 days", 90: "the last 90 days", 365: "the last year", all: "your history",
};
const STATUS_SAID = Object.fromEntries([...STATUSES, WAITING]);
const DEFAULT_RANGE = "90";

// "Tom O." — a given name and a last initial is what fits a 163px cell, and
// it is also how a detailer says the name out loud.
const shortName = (n) => {
  const parts = String(n ?? "").trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : (parts[0] ?? "");
};
const shortDate = (d) => new Date(`${d}T12:00:00`)
  .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const monthName = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};
const sum = (rows) => rows
  .filter((b) => b.status !== "cancelled")
  .reduce((s, b) => s + Number(b.final_amount ?? b.total_price ?? 0), 0);

export default function Calendar({ refreshKey = 0 }) {
  const { business, settings } = useBusiness();
  const today = todayLocal(business.timezone);
  // The two widths this product asks about are the only two the desktop
  // specification derives, and this screen only needs the second: at --wrap a
  // cell can carry words and History grows a column. Everything else here is
  // CSS. (hooks/useWide.js.)
  const wide = useWide(1180);
  // AND A THIRD, WHICH THE OWNER ASKED FOR ON 2026-09-01 AND WHICH IS DERIVED
  // RATHER THAN CHOSEN. He opened the calendar on his own 1920 monitor:
  // "the calendar kind of has these huge blocks that take up the entire
  // desktop space, and you have to scroll down… we could probably move the
  // calendar to one side, maybe shrink it a little, and have the information
  // that is below it on one of the sides. We have the space."
  // So at a desk the day opens BESIDE the month. The month column loses
  // 420px + a gutter to it, and a cell can only write `12:15 PM Marcus W.`
  // while the grid is at least 1,024px wide — the width it has at --wrap
  // today. 1,024 + 28 + 420 = 1,472px of content, which is 1,628px of screen
  // once the rail and the page padding are paid, so 1,640 is where a month
  // can keep its words AND hold the day beside it. Below that the day still
  // opens beside the month and the cells go back to marks for as long as it
  // is open, which is the trade he named: shrink the calendar, stop
  // scrolling. Nothing about a phone changes.
  const veryWide = useWide(1640);
  const [mode, setMode] = useState("month");
  const [cursor, setCursor] = useState(today.slice(0, 7));
  const [day, setDay] = useState(null);          // the selected date, or null
  const [selected, setSelected] = useState(null); // the open job record
  const [creating, setCreating] = useState(null); // null | date string

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const statuses = settings?.booking_mode === "request" ? [...STATUSES, WAITING] : STATUSES;
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // The cell the open day came from, so closing the panel puts you back on it
  // rather than on the body — the same contract Sheet.jsx keeps.
  const dayCell = useRef(null);
  // THE DAY PANEL LEAVES THE WAY IT ARRIVED — roadmap 2.17. It is the one
  // second column in the product that is not a RecordHost or a SettingsHost,
  // so it needs the hold explicitly; below --wrap it is inline under the month
  // and there is nothing to animate, which is what the `wide` argument says.
  const [dayLeaving, closeDay] = useLeaving(
    () => { setDay(null); dayCell.current?.focus(); }, wide,
  );

  const [y, m] = cursor.split("-").map(Number);
  const monthStart = `${cursor}-01`;
  const monthEnd = `${cursor}-${pad(new Date(y, m, 0).getDate())}`;
  const listFrom = range === "all" ? addDays(today, -3650) : addDays(today, -Number(range));
  const listTo = addDays(today, 365);

  const from = mode === "month" ? monthStart : listFrom;
  const to = mode === "month" ? monthEnd : listTo;
  const { bookings, loading, refreshing, error, reload } = useBookings(from, to);
  const busy = loading || refreshing;

  // Day marks for the month grid — blockouts and one-type-only periods, both
  // of which are date RANGES, expanded into the days they cover.
  const [marks, setMarks] = useState({ blocked: new Set(), dropoff: new Set(), dropoffLabel: {} });
  const loadMarks = useCallback(async () => {
    if (mode !== "month") return;
    const [bl, dp] = await Promise.all([
      supabase.from("blockout_dates").select("start_date,end_date")
        .eq("business_id", business.id).lte("start_date", monthEnd).gte("end_date", monthStart),
      supabase.from("dropoff_only_periods").select("start_date,end_date,mode")
        .eq("business_id", business.id).lte("start_date", monthEnd).gte("end_date", monthStart),
    ]);
    const expand = (rows) => {
      const out = new Set();
      for (const r of rows ?? []) {
        for (let d = r.start_date; d <= r.end_date; d = addDays(d, 1)) {
          if (d >= monthStart && d <= monthEnd) out.add(d);
          if (d > monthEnd) break;
        }
      }
      return out;
    };
    // ONE MARK FOR BOTH RESTRICTIONS, and the title says which. Roadmap 2.7
    // gave dropoff_only_periods a `mode`, so a day can now be closed to
    // drop-offs as well as to mobile — and the ring, which used to be
    // hard-labelled "Drop-off only", would have been a plain lie on half of
    // them. A second FORM is not the answer: docs/dashboard-skeletons.md §5b
    // makes the marks form-first precisely so no two that share a cell share
    // a shape, and inventing a sixth to split a distinction the day panel
    // spells out one tap away buys nothing. The mark means "this day is not
    // normal"; the tooltip and the panel say how.
    const label = {};
    for (const r of dp.data ?? []) {
      for (let d = r.start_date; d <= r.end_date && d <= monthEnd; d = addDays(d, 1)) {
        if (d >= monthStart) label[d] = r.mode === "mobile" ? "Mobile only" : "Drop-off only";
      }
    }
    setMarks({ blocked: expand(bl.data), dropoff: expand(dp.data), dropoffLabel: label });
  }, [business.id, mode, monthStart, monthEnd]);
  useEffect(() => { loadMarks(); }, [loadMarks]);

  // A booking made from the header's + has to reach the month it landed on.
  // refreshKey ALONE, for the reason Today carries: reload's identity changes
  // whenever the hook's dates do, and re-running this on that doubles a read.
  useEffect(() => { if (refreshKey) { reload(); loadMarks(); } }, [refreshKey]);

  const byDay = useMemo(() => {
    const map = {};
    for (const b of bookings) (map[b.booking_date] ??= []).push(b);
    return map;
  }, [bookings]);

  const cells = useMemo(() => {
    const firstDow = new Date(y, m - 1, 1).getDay();
    const daysInMonth = new Date(y, m, 0).getDate();
    const out = [];
    for (let i = 0; i < firstDow; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(`${cursor}-${pad(d)}`);
    return out;
  }, [cursor, y, m]);

  const moveMonth = (delta) => {
    const dt = new Date(y, m - 1 + delta, 1);
    setDay(null);
    setCursor(`${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`);
  };

  // DOES THE MONTH WRITE ITSELF OUT, OR DRAW MARKS? One answer, read by the
  // cells, by the legend and by the grid's own class — three places that must
  // agree or the legend decodes symbols that are not on the screen.
  const writes = wide && (!day || veryWide);

  // THE LEGEND DECODES WHAT IS ON THIS MONTH AND NOTHING ELSE. Five entries
  // every time, three of which the month did not contain, is a legend larger
  // than the thing it explains. At --wrap the first three are words in the
  // cells, so only the two the cell cannot write survive.
  const legend = useMemo(() => {
    const jobs = bookings.filter((b) => b.status !== "cancelled");
    const rows = [
      ["dot confirmed", "Booked", () => jobs.some((b) => b.status === "confirmed" || b.status === "pending")],
      ["dot completed", "Done", () => jobs.some((b) => b.status === "completed")],
      ["dot no_show", "No-show", () => jobs.some((b) => b.status === "no_show")],
      ["dot block", "Blocked", () => marks.blocked.size > 0],
      ["ring", "One type only", () => marks.dropoff.size > 0],
    ];
    return rows.filter((row, i) => (writes ? i >= 3 : true) && row[2]());
  }, [bookings, marks, writes]);

  const openDay = (date, el) => {
    // PRESSING THE OPEN DAY AGAIN IS A CLOSE, and it goes out the same door as
    // the panel's own X — otherwise the one way of putting the day away that
    // does not touch the panel is the one way that skips its exit.
    if (day === date) { closeDay(); return; }
    const next = date;
    setDay(next);
    dayCell.current = next ? el : null;
    // THE MONTH STAYS ON THE SCREEN. On a phone the panel opens below a grid
    // that is most of the viewport, so the selected week is scrolled up under
    // the masthead and the day is read against the row it belongs to
    // (docs/dashboard-phone-pass-2026-08-31.md §5a). At a desk the month and
    // the panel are both already in view, and moving the page would be motion
    // for its own sake.
    if (next && !wide && el) {
      el.scrollIntoView({
        block: "start",
        behavior: document.documentElement.classList.contains("lite") ? "auto" : "smooth",
      });
    }
  };

  // The history. Search matches the things you would actually remember about
  // a job: who it was, their number, and what you did.
  const listRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...bookings]
      .filter((b) => statusFilter === "all" || b.status === statusFilter)
      .filter((b) => {
        if (!q) return true;
        const hay = [
          b.customer_name, b.customer_phone, b.customer_email, b.customer_address,
          b.vehicle_model, ...(b.services ?? []).map((s) => s.name_at_booking),
        ].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => b.start_at.localeCompare(a.start_at));
  }, [bookings, statusFilter, query]);

  // A LIST OF EVENTS HAS A TIME AXIS, and a month rule is what a time axis
  // looks like when the list is long. Already sorted newest first, so this is
  // a single pass rather than a group-and-sort.
  const months = useMemo(() => {
    const out = [];
    for (const b of listRows) {
      const key = b.booking_date.slice(0, 7);
      if (out.at(-1)?.key !== key) out.push({ key, rows: [] });
      out.at(-1).rows.push(b);
    }
    return out;
  }, [listRows]);

  const filtered = statusFilter !== "all" || query.trim() !== "";
  const activeChips = [
    statusFilter !== "all" && [STATUS_SAID[statusFilter], () => setStatusFilter("all")],
    range !== DEFAULT_RANGE && [RANGES.find(([k]) => k === range)[1], () => setRange(DEFAULT_RANGE)],
  ].filter(Boolean);

  const modeSwitch = (
    <div className="row" style={{ gap: 6 }}>
      <button className={`chip ${mode === "month" ? "active" : ""}`}
        onClick={() => setMode("month")}>Month</button>
      <button className={`chip ${mode === "list" ? "active" : ""}`}
        onClick={() => setMode("list")}>History</button>
    </div>
  );

  // `.chiprow WRAP`, at both widths, and it was measured rather than assumed.
  // The bare `.chiprow` is a sideways scroller with `scrollbar-width: none`,
  // and the sweep — the first run that ever opened this filter bar — found
  // «No show» 93px off the right edge of a 392px phone and «Everything» 61px
  // off it, with nothing on screen saying they were there. The product had
  // already answered this once: the phone pass §8 measured Money's five period
  // chips at 388px in a 356px column and wrapped them rather than hiding two.
  // Same question, same answer.
  const chipRow = (opts, value, set) => (
    <div className="chiprow wrap">
      {opts.map(([k, label]) => (
        <button key={k} className={`chip ${value === k ? "active" : ""}`}
          onClick={() => set(k)}>{label}</button>
      ))}
    </div>
  );
  const totals = (
    <div className="sunken flush row between">
      <span className="quiet">
        {listRows.length} booking{listRows.length === 1 ? "" : "s"}
      </span>
      <span className="strong num">{money(sum(listRows))}</span>
    </div>
  );

  const record = selected && (
    <RecordHost onClose={() => setSelected(null)} {...jobRecordProps(selected)}>
      <BookingDetail booking={selected} onClose={() => setSelected(null)}
        onChanged={() => { reload(); setSelected(null); }} />
    </RecordHost>
  );
  const newBooking = creating && (
    <NewBookingModal initialDate={creating} onClose={() => setCreating(null)}
      onCreated={() => { setCreating(null); reload(); loadMarks(); }} />
  );

  // ─── THE MONTH ──────────────────────────────────────────────────────────
  // One column, all of the width into the grid. This is the screen that most
  // wants width and the one that must not be split — a second column takes
  // the width straight back off the cells (step 4 §4).
  if (mode === "month") {
    const month = (
      <>
        {modeSwitch}
        {/* Above the grid, and the last good month stays drawn. */}
        {error && <div className="error-box">{error}</div>}

        <div className="tight">
          <div className="row between">
            <button className="btn sm inline ghost" onClick={() => moveMonth(-1)} aria-label="Previous month">
              <ChevronLeft strokeWidth={2} />
            </button>
            <h2>{monthName(cursor)}</h2>
            <button className="btn sm inline ghost" onClick={() => moveMonth(1)} aria-label="Next month">
              <ChevronRight strokeWidth={2} />
            </button>
          </div>

          <div>
            <div className="cal-head">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
            </div>
            <div className={`cal-grid${writes ? " writes" : ""}`}>
              {cells.map((date, i) => {
                if (date === null) return <div key={`x${i}`} />;
                const jobs = (byDay[date] ?? []).filter((b) => b.status !== "cancelled");
                const blocked = marks.blocked.has(date);
                const limited = marks.dropoff.has(date);
                return (
                  <button key={date} type="button"
                    className={`cal-cell${date === today ? " today" : ""}${day === date ? " selected" : ""}`}
                    aria-expanded={day === date}
                    aria-controls={day === date ? "day-panel" : undefined}
                    // "1 job", not "1 jobs" (Part B row 7) — and the date is
                    // spoken rather than spelled out digit by digit, which is
                    // what a bare "2026-09-02" gets you. The two day marks are
                    // named here too: form carries them for an eye, and this
                    // is the same fact for everyone else.
                    aria-label={[
                      dateLong(date),
                      jobs.length ? `${jobs.length} job${jobs.length === 1 ? "" : "s"}` : null,
                      blocked ? "blocked" : null,
                      limited ? marks.dropoffLabel[date] : null,
                    ].filter(Boolean).join(", ")}
                    onClick={(e) => openDay(date, e.currentTarget)}>
                    <span className="n">{Number(date.slice(8))}</span>
                    <span className="marks" aria-hidden="true">
                      {!writes && jobs.slice(0, 3).map((b) => (
                        <span key={b.id} className={`dot ${b.status}`} />
                      ))}
                      {blocked && <span className="dot block" title="Blocked out" />}
                      {limited && <span className="ring" title={marks.dropoffLabel[date] ?? "One type only"} />}
                    </span>
                    {/* THE DESK WRITES IT OUT. Three lines and an overflow
                        covers the busiest realistic cell — five, this
                        business's own buffer — with room; a cell that needed
                        six is the crew case that reopens the week view, which
                        step 3 §7 named as the condition. */}
                    {writes && jobs.length > 0 && (
                      <span className="jobs" aria-hidden="true">
                        {jobs.slice(0, 3).map((b) => (
                          <span key={b.id} className={b.status}>
                            <span className="t">{time12(b.start_time)}</span>
                            {shortName(b.customer_name)}
                          </span>
                        ))}
                        {jobs.length > 3 && <span className="more">+{jobs.length - 3} more</span>}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* A GRID, NOT A WRAPPING ROW — at 392 a fifth entry wrapped alone
              onto its own line, which reads as a mistake. auto-fit gives one
              row on a desk and an even split on a phone. It stopped being an
              inline style when the day moved beside the month: three entries
              spread across an 836px grid with 240px between them is not a
              legend, so at a desk they sit together (theme.css). */}
          {legend.length > 0 && (
            <div className="cal-legend">
              {legend.map(([cls, label]) => (
                <span className="row" key={label} style={{ gap: 5 }}>
                  <span className={cls} /><span className="quiet">{label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </>
    );

    const daypanel = day && (
      <DaySheet
        inline
        date={day}
        bookings={byDay[day] ?? []}
        onClose={closeDay}
        onOpenBooking={setSelected}
        onNewBooking={setCreating}
        onChanged={() => { loadMarks(); reload(); }}
      />
    );

    // AT A DESK THE DAY IS THE SECOND COLUMN; on a phone it stays inline under
    // the grid, which is step 4b §5a and is unchanged. The record replaces the
    // day rather than sharing the column with it — a job opened from the day
    // belongs beside the month for the same reason the day does, and two
    // panels in one grid cell is two panels on top of each other.
    // AND THE WRAPPER IS THERE WITH NOTHING OPEN TOO — roadmap 2.17, and it
    // is a MOTION fix, not a layout one. It used to be `wide && day`, so
    // picking a day swapped `.group` for `.split.calday` and React threw the
    // month away and rebuilt it. Measured with document.getAnimations() 120ms
    // after the click: `arrive` re-ran on the whole left column while the day
    // panel arrived with no motion at all — the wrong element moving, which is
    // his "it's almost like I refresh the page" exactly. Same wrapper at every
    // desk width means React reconciles and the month keeps its DOM.
    // theme.css collapses `.split.calday:not(:has(> .col-2))` back to a block,
    // so with nothing open the layout is byte-for-byte what it was.
    if (wide) {
      return (
        <div className={`split calday${busy ? " refreshing" : ""}`} aria-busy={busy || undefined}>
          <div className="group col-1">{month}</div>
          {day && !selected && (
          <div className={`col-2${dayLeaving ? " leaving" : ""}`}>{daypanel}</div>
        )}
          {record}
          {newBooking}
        </div>
      );
    }

    return (
      <div className={`group${busy ? " refreshing" : ""}`} aria-busy={busy || undefined}>
        {month}
        {daypanel}
        {record}
        {newBooking}
      </div>
    );
  }

  // ─── THE HISTORY ────────────────────────────────────────────────────────
  // 1.7 / 1 at --wrap: the list, and a second column that holds the selected
  // job — or, with nothing selected, the filters and the totals, which takes
  // two rows of chrome off the top of the results (step 4 §6).
  return (
    <div className="split">
      <div className="group col-1">
        {modeSwitch}
        {error && <div className="error-box">{error}</div>}

        <div className="tight">
          <div style={{ position: "relative" }}>
            <Search size={17} strokeWidth={2} style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: "var(--text-muted)", pointerEvents: "none",
            }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              aria-label="Search bookings"
              placeholder="Search name, phone or service" style={{ paddingLeft: 38, paddingRight: 38 }} />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search" style={{
                position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer",
                padding: 6, display: "flex",
              }}><X size={16} strokeWidth={2} /></button>
            )}
          </div>

          {/* THE FILTER BAR IS THE PHONE PROBLEM, NOT THE LIST. Nine chips, a
              search field and a date range is three rows of chrome before a
              single result. The search stays — on a phone, finding a past job
              IS a search — and the chips go behind one control, with whatever
              is switched on showing as a pill you can drop
              (docs/dashboard-phone-pass-2026-08-31.md §7). */}
          {!wide && (
            <div className="row wrap" style={{ gap: 6 }}>
              <button className={`chip ${filtersOpen ? "active" : ""}`}
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((v) => !v)}>
                <SlidersHorizontal strokeWidth={2} /> Filter
              </button>
              {activeChips.map(([label, clear]) => (
                <button key={label} className="chip active" onClick={clear}
                  aria-label={`Remove filter: ${label}`}>
                  {label} <X size={13} strokeWidth={2.4} />
                </button>
              ))}
            </div>
          )}
          {!wide && filtersOpen && (<>
            {chipRow(statuses, statusFilter, setStatusFilter)}
            {chipRow(RANGES, range, setRange)}
          </>)}
          {!wide && totals}
        </div>

        {/* The list dims while a read is in flight; the filter bar above stays
            live, because changing a filter is how you get out of a slow one. */}
        <div className={busy ? "refreshing" : undefined} aria-busy={busy || undefined}>
          {listRows.length === 0 && !busy && (
            <div className="tight">
              <p className="body">
                {filtered ? "Nothing matches that." : `No bookings in ${RANGE_SAID[range]}.`}
              </p>
              {/* An empty result is a state of the FILTER, not of the
                  business, and with the chips collapsed this is the only way
                  the screen can say which (step 4 §6, phone pass §7). */}
              {filtered && (
                <div className="row wrap" style={{ gap: 6 }}>
                  {query.trim() && (
                    <button className="chip active" onClick={() => setQuery("")}>
                      “{query.trim()}” <X size={13} strokeWidth={2.4} />
                    </button>
                  )}
                  {statusFilter !== "all" && (
                    <button className="chip active" onClick={() => setStatusFilter("all")}>
                      {STATUS_SAID[statusFilter]} <X size={13} strokeWidth={2.4} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {months.map(({ key, rows }) => (
            <div key={key}>
              <div className="month-rule">
                <span className="label">{monthName(key)}</span>
                <span className="num strong">{money(sum(rows))}</span>
              </div>
              <div className="rows cols history">
                {rows.map((b) => {
                  const services = (b.services ?? []).map((s) => s.name_at_booking).filter(Boolean);
                  const what = services.join(" · ") || (b.service_type === "mobile" ? "Mobile" : "Drop-off");
                  const amount = money(b.final_amount ?? b.total_price);
                  return (
                    <button key={b.id} className="row-item" onClick={() => setSelected(b)}
                      aria-label={`${b.customer_name}, ${dateLong(b.booking_date)}, ${what}, ${STATUS_SAID[b.status] ?? b.status}, ${amount}`}>
                      <span className={`c-mark dot ${b.status}`} aria-hidden="true" />
                      <span className="c-who nm">{b.customer_name}</span>
                      <span className="c-sub">
                        <span className="c-date">{shortDate(b.booking_date)}</span>
                        <span className="c-what">{what}</span>
                      </span>
                      <span className="c-total figure sm">{amount}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {wide && !selected && (
        <aside className="col-2">
          {totals}
          <div className="tight">
            <h2 className="label">Status</h2>
            {chipRow(statuses, statusFilter, setStatusFilter)}
          </div>
          <div className="tight">
            <h2 className="label">When</h2>
            {chipRow(RANGES, range, setRange)}
          </div>
        </aside>
      )}

      {record}
      {newBooking}
    </div>
  );
}
