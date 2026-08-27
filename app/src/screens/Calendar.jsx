// Month calendar + selected-day job list, with a "List" mode that replaces
// the old standalone "All Bookings" screen (which duplicated Today/Calendar
// and had a broken Edit-payment button).

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBusiness } from "../context/BusinessContext.jsx";
import { useBookings } from "../hooks/useBookings.js";
import { addDays, todayLocal } from "../lib/format.js";
import BookingCard from "../components/BookingCard.jsx";
import BookingDetail from "../components/BookingDetail.jsx";
import NewBookingModal from "../components/NewBookingModal.jsx";

const pad = (n) => String(n).padStart(2, "0");

export default function Calendar() {
  const { business } = useBusiness();
  const today = todayLocal(business.timezone);
  const [mode, setMode] = useState("month"); // month | list
  const [cursor, setCursor] = useState(today.slice(0, 7)); // "YYYY-MM"
  const [selectedDay, setSelectedDay] = useState(today);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const [y, m] = cursor.split("-").map(Number);
  const monthStart = `${cursor}-01`;
  const monthEnd = `${cursor}-${pad(new Date(y, m, 0).getDate())}`;
  // List mode shows a rolling ±1 year window; month mode the cursor month.
  const from = mode === "month" ? monthStart : addDays(today, -365);
  const to = mode === "month" ? monthEnd : addDays(today, 365);
  const { bookings, loading, reload } = useBookings(from, to);

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

  const listRows = useMemo(() => {
    let rows = [...bookings].sort((a, b) => b.start_at.localeCompare(a.start_at));
    if (statusFilter !== "all") rows = rows.filter((b) => b.status === statusFilter);
    return rows.slice(0, 200);
  }, [bookings, statusFilter]);

  const dayRows = byDay[selectedDay] ?? [];

  return (
    <>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 8 }}>
          <button className={`chip ${mode === "month" ? "active" : ""}`} onClick={() => setMode("month")}>Month</button>
          <button className={`chip ${mode === "list" ? "active" : ""}`} onClick={() => setMode("list")}>List</button>
        </div>
        <button className="btn inline primary" onClick={() => setCreating(true)}>+ New</button>
      </div>

      {mode === "month" && (
        <>
          <div className="row between" style={{ marginBottom: 8 }}>
            <button className="btn ghost inline" onClick={() => moveMonth(-1)} aria-label="Previous month"><ChevronLeft size={20} strokeWidth={1.75} /></button>
            <h2>{new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
            <button className="btn ghost inline" onClick={() => moveMonth(1)} aria-label="Next month"><ChevronRight size={20} strokeWidth={1.75} /></button>
          </div>
          <div className="cal-grid" style={{ marginBottom: 4 }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="muted" style={{ textAlign: "center", fontSize: "0.72rem" }}>{d}</div>
            ))}
          </div>
          <div className="cal-grid">
            {cells.map((date, i) =>
              date === null ? (
                <div key={`x${i}`} />
              ) : (
                <div key={date}
                  className={`cal-cell ${date === today ? "today" : ""} ${date === selectedDay ? "selected" : ""}`}
                  onClick={() => setSelectedDay(date)}>
                  {Number(date.slice(8))}
                  <div className="dots">
                    {(byDay[date] ?? []).filter((b) => b.status !== "cancelled").slice(0, 3).map((b) => (
                      <span key={b.id} className="dot" />
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>

          <div className="section-title">{selectedDay}</div>
          {loading && <div className="spinner" />}
          {!loading && dayRows.length === 0 && <p className="muted">No jobs this day.</p>}
          {dayRows.map((b) => <BookingCard key={b.id} booking={b} onClick={() => setSelected(b)} />)}
        </>
      )}

      {mode === "list" && (
        <>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {["all", "confirmed", "completed", "cancelled", "no_show"].map((s) => (
              <button key={s} className={`chip ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
                {s === "all" ? "All" : s.replace("_", " ")}
              </button>
            ))}
          </div>
          {loading && <div className="spinner" />}
          {!loading && listRows.length === 0 && <p className="muted">No bookings.</p>}
          {listRows.map((b) => <BookingCard key={b.id} booking={b} showDate onClick={() => setSelected(b)} />)}
        </>
      )}

      {selected && (
        <BookingDetail booking={selected} onClose={() => setSelected(null)}
          onChanged={() => { reload(); setSelected(null); }} />
      )}
      {creating && (
        <NewBookingModal initialDate={selectedDay} onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); reload(); }} />
      )}
    </>
  );
}
