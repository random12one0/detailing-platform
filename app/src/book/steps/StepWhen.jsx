// Step 4 — date and time.
//
// Availability comes ENTIRELY from the available-slots edge function, which
// applies this business's hours, buffer, blockouts, slot interval, minimum
// notice and per-day cap. The page never computes availability itself, so
// what's displayed and what's accepted can't drift.

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../../lib/api.js";
import { time12, todayLocal } from "../../lib/format.js";
import { useBookingBusiness } from "../BookingBusinessContext.jsx";

const pad = (n) => String(n).padStart(2, "0");
const DOW = ["S", "M", "T", "W", "T", "F", "S"];

export default function StepWhen({ form, setForm, durationMinutes }) {
  const { slug, business } = useBookingBusiness();
  const today = todayLocal(business.timezone);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [days, setDays] = useState(null);   // { "YYYY-MM-DD": {slots: []} }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [y, m] = month.split("-").map(Number);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${pad(new Date(y, m, 0).getDate())}`;
  // Never ask for days in the past.
  const rangeStart = monthStart < today ? today : monthStart;

  const load = useCallback(async () => {
    if (!durationMinutes) return;
    setLoading(true);
    setError("");
    try {
      const r = await api.availableSlots(slug, {
        start_date: rangeStart,
        end_date: monthEnd,
        duration_minutes: durationMinutes,
      });
      setDays(r.days ?? {});
    } catch (e) {
      setError(e.message || "Could not load available times.");
      setDays({});
    }
    setLoading(false);
  }, [slug, rangeStart, monthEnd, durationMinutes]);

  useEffect(() => { load(); }, [load]);

  const cells = useMemo(() => {
    const firstDow = new Date(y, m - 1, 1).getDay();
    const count = new Date(y, m, 0).getDate();
    const out = Array.from({ length: firstDow }, () => null);
    for (let d = 1; d <= count; d++) out.push(`${month}-${pad(d)}`);
    return out;
  }, [month, y, m]);

  const moveMonth = (delta) => {
    const dt = new Date(y, m - 1 + delta, 1);
    setMonth(`${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`);
    setForm((f) => ({ ...f, bookingDate: "", startTime: "" }));
  };

  const slotsFor = (date) => days?.[date]?.slots ?? [];
  const daySlots = form.bookingDate ? slotsFor(form.bookingDate) : [];
  const dropoffOnly = form.bookingDate ? days?.[form.bookingDate]?.dropoff_only : false;

  return (
    <>
      {/* One calendar unit. Without the wrapper, bk-wrap's flex gap opens a
          26px void between the month header, the weekday row and the grid —
          the same reason .bk-step-head exists in BookingPage.jsx. */}
      <div className="bk-cal-block">
        <div className="bk-row between">
          <button className="bk-btn ghost inline" onClick={() => moveMonth(-1)} aria-label="Previous month"
            disabled={month <= today.slice(0, 7)}>
            <ChevronLeft size={20} strokeWidth={1.75} />
          </button>
          <h2>{new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
          <button className="bk-btn ghost inline" onClick={() => moveMonth(1)} aria-label="Next month">
            <ChevronRight size={20} strokeWidth={1.75} />
          </button>
        </div>

        <div className="bk-cal">
          {DOW.map((d, i) => (
            <div key={i} className="bk-dow">{d}</div>
          ))}
        </div>

        {loading && <div className="bk-center" style={{ minHeight: 160 }}><div className="bk-spinner" /></div>}

        {!loading && (
        <div className="bk-cal">
          {cells.map((date, i) => {
            if (!date) return <div key={`e${i}`} className="cell empty" />;
            const open = slotsFor(date).length > 0;
            return (
              <div
                key={date}
                role={open ? "button" : undefined}
                tabIndex={open ? 0 : undefined}
                className={`cell ${open ? "" : "closed"} ${date === today ? "today" : ""} ${form.bookingDate === date ? "selected" : ""}`}
                onClick={() => open && setForm((f) => ({ ...f, bookingDate: date, startTime: "" }))}
                onKeyDown={(e) => {
                  if (open && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setForm((f) => ({ ...f, bookingDate: date, startTime: "" }));
                  }
                }}
              >
                {Number(date.slice(8))}
              </div>
            );
          })}
        </div>
        )}
      </div>

      {error && <div className="bk-error">{error}</div>}

      {!loading && !error && Object.values(days ?? {}).every((d) => (d.slots ?? []).length === 0) && (
        <div className="bk-note" style={{ marginTop: 12 }}>
          No open times this month. Try the next month
          {business.phone ? `, or call ${business.phone}` : ""}.
        </div>
      )}

      {form.bookingDate && (
        <>
          <div className="bk-step-label" style={{ marginTop: 18 }}>
            Times on {new Date(`${form.bookingDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          {dropoffOnly && form.serviceType === "mobile" && (
            <div className="bk-note">This day is drop-off only.</div>
          )}
          <div className="bk-slots">
            {daySlots.map((t) => (
              <button
                key={t}
                className={`bk-chip ${form.startTime === t ? "selected" : ""}`}
                onClick={() => setForm((f) => ({ ...f, startTime: t }))}
              >
                {time12(t)}
              </button>
            ))}
          </div>
          {daySlots.length === 0 && <p className="bk-muted">Nothing open that day.</p>}
        </>
      )}
    </>
  );
}
