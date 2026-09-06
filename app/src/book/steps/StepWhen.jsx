// Step 4 — date and time.
//
// Availability comes ENTIRELY from the available-slots edge function, which
// applies this business's hours, buffer, blockouts, slot interval, minimum
// notice and per-day cap. The page never computes availability itself, so
// what's displayed and what's accepted can't drift.

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../../lib/api.js";
import { time12 } from "../../lib/format.js";
import {
  businessToday, dayIsOpen, dayRefusesMode, monthGrid, monthHasNothing,
  monthRange, shiftMonth, slotsForType,
} from "../core.js";
import { useBookingBusiness } from "../BookingBusinessContext.jsx";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

export default function StepWhen({ form, setForm, durationMinutes }) {
  const { slug, business } = useBookingBusiness();
  // THE BUSINESS'S TODAY, never the customer's — somebody booking from
  // another state must not be shown yesterday.
  const today = businessToday(business.timezone);
  // A stable key for the selection, so the calendar reloads when the services
  // change but not on every render. The ids themselves are a new array each
  // time the parent renders.
  const serviceIds = form.serviceIds;
  const serviceKey = serviceIds.join(",");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [days, setDays] = useState(null);   // { "YYYY-MM-DD": {slots: []} }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [y, m] = month.split("-").map(Number);
  // Never ask for days in the past — the clamp is the core's.
  const { start: rangeStart, end: monthEnd } = monthRange(month, today);

  const load = useCallback(async () => {
    if (!durationMinutes) return;
    setLoading(true);
    setError("");
    try {
      const r = await api.availableSlots(slug, {
        start_date: rangeStart,
        end_date: monthEnd,
        duration_minutes: durationMinutes,
        // Roadmap 2.8c — two of the rules now live on the SERVICE (which
        // weekdays it is offered, whether it can be done at an address), so
        // the calendar has to say which services it is being asked about or it
        // will offer a day the submit-time gate refuses.
        service_ids: serviceIds,
      });
      setDays(r.days ?? {});
    } catch (e) {
      setError(e.message || "Could not load available times.");
      setDays({});
    }
    setLoading(false);
  }, [slug, rangeStart, monthEnd, durationMinutes, serviceKey]);

  useEffect(() => { load(); }, [load]);

  const cells = useMemo(() => monthGrid(month), [month]);

  const moveMonth = (delta) => {
    setMonth(shiftMonth(month, delta));
    setForm((f) => ({ ...f, bookingDate: "", startTime: "" }));
  };

  // W4 — a day can now be restricted EITHER way (drop-offs only, or mobile
  // only), so the times offered are the ones this customer's chosen service
  // type can actually have. Showing the rest and refusing them at submit is
  // the hole this closes: the page used to print "This day is drop-off only"
  // and then let a mobile booking through anyway.
  const allowed = (date) => slotsForType(days?.[date], form.serviceType);
  const daySlots = form.bookingDate ? allowed(form.bookingDate) : [];
  const day = form.bookingDate ? days?.[form.bookingDate] : null;
  // Named for what it is: this day cannot take the service type they picked.
  const wrongMode = dayRefusesMode(day, form.serviceType);

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
            const open = dayIsOpen(days?.[date]);
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

      {!loading && !error && monthHasNothing(days) && (
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
