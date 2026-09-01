// Month calendar + a real booking history.
//
// Two fixes here:
//   1. Tapping a date used to do nothing. It now opens the day sheet, which
//      is the only route to blockouts, one-off hours and drop-off-only
//      periods — all of which had schema and no UI.
//   2. List mode used to be Today with a status filter. It is now the full
//      searchable history: name, phone or service text, a status filter, a
//      date range, and totals for whatever the filter currently matches.
//
// The month grid carries three independent facts per day, and since roadmap
// 2.4 item 3c it carries them by SHAPE: jobs are circles (hollow = ahead,
// solid = landed) or a bar (it did not happen), and facts about the DAY —
// blocked, drop-off-only — are squares. No two marks that can share a cell
// share a form, so the grid still reads under any tenant accent, including
// the near-blacks and silvers that used to collide with the neutral marks.
// The rule and the measurements are in theme.css § THE MARKS.
//
// The legend below decodes all five. It used to decode four of seven, which
// is how a red no-show dot survived here for months meaning nothing to
// anybody.

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { useBookings } from "../hooks/useBookings.js";
import { addDays, money, todayLocal } from "../lib/format.js";
import BookingCard from "../components/BookingCard.jsx";
import BookingDetail, { jobRecordProps } from "../components/BookingDetail.jsx";
import Sheet from "../components/Sheet.jsx";
import NewBookingModal from "../components/NewBookingModal.jsx";
import DaySheet from "../components/DaySheet.jsx";

const pad = (n) => String(n).padStart(2, "0");
const STATUSES = [
  ["all", "All"], ["confirmed", "Confirmed"], ["completed", "Completed"],
  ["cancelled", "Cancelled"], ["no_show", "No show"],
];
const RANGES = [
  ["30", "Last 30 days"], ["90", "Last 90 days"], ["365", "Last year"], ["all", "Everything"],
];

export default function Calendar() {
  const { business } = useBusiness();
  const today = todayLocal(business.timezone);
  const [mode, setMode] = useState("month");
  const [cursor, setCursor] = useState(today.slice(0, 7));
  const [daySheet, setDaySheet] = useState(null);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(null); // null | date string

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [range, setRange] = useState("90");

  const [y, m] = cursor.split("-").map(Number);
  const monthStart = `${cursor}-01`;
  const monthEnd = `${cursor}-${pad(new Date(y, m, 0).getDate())}`;
  const listFrom = range === "all" ? addDays(today, -3650) : addDays(today, -Number(range));
  const listTo = addDays(today, 365);

  const from = mode === "month" ? monthStart : listFrom;
  const to = mode === "month" ? monthEnd : listTo;
  const { bookings, loading, reload } = useBookings(from, to);

  // Day marks for the month grid — blockouts and drop-off-only periods, both
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
    // a shape, and inventing a sixth to split a distinction the day sheet
    // spells out one tap away buys nothing. The mark means "this day is not
    // normal"; the tooltip and the sheet say how.
    const label = {};
    for (const r of dp.data ?? []) {
      for (let d = r.start_date; d <= r.end_date && d <= monthEnd; d = addDays(d, 1)) {
        if (d >= monthStart) label[d] = r.mode === "mobile" ? "Mobile only" : "Drop-off only";
      }
    }
    setMarks({ blocked: expand(bl.data), dropoff: expand(dp.data), dropoffLabel: label });
  }, [business.id, mode, monthStart, monthEnd]);
  useEffect(() => { loadMarks(); }, [loadMarks]);

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
    setCursor(`${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`);
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

  const listTotal = listRows
    .filter((b) => b.status !== "cancelled")
    .reduce((s, b) => s + Number(b.final_amount ?? b.total_price ?? 0), 0);

  return (
    <div className="group">
      <div className="row between">
        <div className="row" style={{ gap: 6 }}>
          <button className={`chip ${mode === "month" ? "active" : ""}`} onClick={() => setMode("month")}>Month</button>
          <button className={`chip ${mode === "list" ? "active" : ""}`} onClick={() => setMode("list")}>History</button>
        </div>
        <button className="btn sm inline filled" onClick={() => setCreating(today)}>New booking</button>
      </div>

      {mode === "month" && (
        <>
          <div className="tight">
            <div className="row between">
              <button className="btn sm inline ghost" onClick={() => moveMonth(-1)} aria-label="Previous month">
                <ChevronLeft strokeWidth={2} />
              </button>
              <h2>{new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
              <button className="btn sm inline ghost" onClick={() => moveMonth(1)} aria-label="Next month">
                <ChevronRight strokeWidth={2} />
              </button>
            </div>

            <div>
              <div className="cal-head">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
              </div>
              <div className="cal-grid">
                {cells.map((date, i) => {
                  if (date === null) return <div key={`x${i}`} />;
                  const jobs = (byDay[date] ?? []).filter((b) => b.status !== "cancelled");
                  return (
                    <button key={date} type="button"
                      className={`cal-cell ${date === today ? "today" : ""}`}
                      aria-label={`${date}${jobs.length ? `, ${jobs.length} jobs` : ""}`}
                      onClick={() => setDaySheet(date)}>
                      <span className="n">{Number(date.slice(8))}</span>
                      <span className="marks">
                        {jobs.slice(0, 3).map((b) => (
                          <span key={b.id} className={`dot ${b.status}`} />
                        ))}
                        {marks.blocked.has(date) && <span className="dot block" title="Blocked out" />}
                        {marks.dropoff.has(date) && <span className="ring" title={marks.dropoffLabel?.[date] ?? "Limited"} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* A GRID, NOT A WRAPPING ROW. Five entries since 2.4 (it decoded
                four of seven marks before), and at 392 the fifth wrapped alone
                onto its own line, which reads as a mistake. auto-fit gives one
                row on desktop and an even 3+2 on a phone. Inline because it is
                layout for this one element, like the row above it. */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))",
              gap: 12, paddingTop: 8, borderTop: "1px solid var(--hairline)",
            }}>
              <span className="row" style={{ gap: 5 }}><span className="dot confirmed" /><span className="quiet">Booked</span></span>
              <span className="row" style={{ gap: 5 }}><span className="dot completed" /><span className="quiet">Done</span></span>
              <span className="row" style={{ gap: 5 }}><span className="dot no_show" /><span className="quiet">No-show</span></span>
              <span className="row" style={{ gap: 5 }}><span className="dot block" /><span className="quiet">Blocked</span></span>
              <span className="row" style={{ gap: 5 }}><span className="ring" /><span className="quiet">One type only</span></span>
            </div>
          </div>

          {loading && <div className="spinner" />}
        </>
      )}

      {mode === "list" && (
        <>
          <div className="tight">
            <div style={{ position: "relative" }}>
              <Search size={17} strokeWidth={2} style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                color: "var(--text-muted)", pointerEvents: "none",
              }} />
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, phone or service" style={{ paddingLeft: 38, paddingRight: 38 }} />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Clear search" style={{
                  position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer",
                  padding: 6, display: "flex",
                }}><X size={16} strokeWidth={2} /></button>
              )}
            </div>
            <div className="chiprow">
              {STATUSES.map(([k, label]) => (
                <button key={k} className={`chip ${statusFilter === k ? "active" : ""}`}
                  onClick={() => setStatusFilter(k)}>{label}</button>
              ))}
            </div>
            <div className="chiprow">
              {RANGES.map(([k, label]) => (
                <button key={k} className={`chip ${range === k ? "active" : ""}`}
                  onClick={() => setRange(k)}>{label}</button>
              ))}
            </div>
          </div>

          <div className="sunken flush row between">
            <span className="quiet">
              {listRows.length} booking{listRows.length === 1 ? "" : "s"}
              {query ? ` matching “${query}”` : ""}
            </span>
            <span className="strong num">{money(listTotal)}</span>
          </div>

          {loading && <div className="spinner" />}
          {!loading && listRows.length === 0 && (
            <div className="dashed">
              {query || statusFilter !== "all"
                ? "Nothing matches that. Try a different search or filter."
                : "No bookings in this period yet."}
            </div>
          )}
          <div className="tight">
            {listRows.map((b) => (
              <BookingCard key={b.id} booking={b} showDate dense onClick={() => setSelected(b)} />
            ))}
          </div>
        </>
      )}

      {daySheet && (
        <DaySheet
          date={daySheet}
          bookings={byDay[daySheet] ?? []}
          onClose={() => setDaySheet(null)}
          onOpenBooking={(b) => { setDaySheet(null); setSelected(b); }}
          onNewBooking={(d) => { setDaySheet(null); setCreating(d); }}
          onChanged={() => { loadMarks(); reload(); }}
        />
      )}
      {selected && (
        <Sheet onClose={() => setSelected(null)} {...jobRecordProps(selected)}>
          <BookingDetail booking={selected} onClose={() => setSelected(null)}
            onChanged={() => { reload(); setSelected(null); }} />
        </Sheet>
      )}
      {creating && (
        <NewBookingModal initialDate={creating} onClose={() => setCreating(null)}
          onCreated={() => { setCreating(null); reload(); loadMarks(); }} />
      )}
    </div>
  );
}
