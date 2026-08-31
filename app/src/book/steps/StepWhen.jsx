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

  // W4 — a day can now be restricted EITHER way (drop-offs only, or mobile
  // only), so the times offered are the ones this customer's chosen service
  // type can actually have. Showing the rest and refusing them at submit is
  // the hole this closes: the page used to print "This day is drop-off only"
  // and then let a mobile booking through anyway.
  const allowed = (date) => {
    const d = days?.[date];
    if (!d) return [];
    const blocked = form.serviceType === "mobile" ? d.dropoff_slots : d.mobile_slots;
    return (d.slots ?? []).filter((t) => !(blocked ?? []).includes(t));
  };
  const daySlots = form.bookingDate ? allowed(form.bookingDate) : [];
  const day = form.bookingDate ? days?.[form.bookingDate] : null;
  // Named for what it is: this day cannot take the service type they picked.
  const wrongMode = !!day
    && ((form.serviceType === "mobile" && day.dropoff_only) || (form.serviceType !== "mobile" && day.mobile_only));

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
            // OPEN means the BUSINESS has times that day, not that this
            // customer can have them. A day restricted the other way (W4) is
            // still worth opening: greyed out it says only "closed", while
            // opening it says which way it is restricted and that going back
            // a step fixes it. The submit gate is validateSlot either way.
            const open = (days?.[date]?.slots ?? []).length > 0;
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
          {wrongMode && (
            <div className="bk-note">
              {form.serviceType === "mobile"
                ? `${business.name} is taking drop-offs only that day — go back a step to change how it’s done, or pick another day.`
                : `${business.name} is coming to customers that day rather than taking drop-offs — go back a step, or pick another day.`}
            </div>
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
          {daySlots.length === 0 && !wrongMode && <p className="bk-muted">Nothing open that day.</p>}
        </>
      )}
    </>
  );
}
