// Step 4 — date and time.
//
// Availability comes ENTIRELY from the available-slots edge function, which
// applies this business's hours, buffer, blockouts, slot interval, minimum
// notice and per-day cap. The page never computes availability itself, so
// what's displayed and what's accepted can't drift.
//
// ROADMAP 8.10 — AND ON A SPLIT BOOKING IT IS ASKED ONCE PER CAR, THROUGH THE
// SAME CALENDAR. A second calendar was the obvious build and does not fit: the
// month grid, its header and the slot chips are most of this step's height, so
// two of them is two screens. Instead the car being scheduled is a chip row
// above the calendar, the ones already picked read back their day and time,
// and the whole block below is unchanged.
//
// **THE LENGTH ASKED FOR IS THAT CAR'S OWN.** A truck takes longer than a
// hatchback, so asking every day of the month with the first car's duration
// would offer a slot too short for the second and lose the booking at the
// submit — which is the one failure this page exists to prevent.

import { intlLocale, t } from "../../lib/i18n.js";
import { useLocale } from "../../hooks/useLocale.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../../lib/api.js";
import { time12 } from "../../lib/format.js";
import {
  businessToday, dayIsOpen, dayRefusesMode, monthGrid, monthHasNothing,
  monthRange, shiftMonth, slotsForType,
} from "../core.js";
import { useBookingBusiness } from "../BookingBusinessContext.jsx";

// **THE WEEKDAY LETTERS, THE MONTH NAMES AND THE DATES ARE `Intl`'s JOB, NOT
// THE CATALOGUE'S — roadmap 8.17.** Translating "Mon" by hand is inventing a
// second, worse copy of something every browser already ships correctly, and
// it is the half of a translation most likely to be quietly wrong.
// `intlLocale()` answers `es-US` rather than `es-ES`, so the 12-hour clock and
// month-before-day ordering survive; only the words change.
//
// The letters are DERIVED rather than typed: a hard-coded `["S","M","T",…]`
// is English by construction, and Spanish's own initials are L M M J V S D —
// a different set in a different order, with two Ms and two Ss that only the
// order tells apart.
const dow = (locale) => {
  // 2024-01-07 is a Sunday, which is the column this grid starts on.
  const base = Date.UTC(2024, 0, 7);
  return Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" })
      .format(new Date(base + i * 86_400_000)));
};
// Just enough of a date to recognise a day already chosen, on a chip that has
// to stay one line at 320.
const shortDay = (d, locale) =>
  new Date(`${d}T12:00:00`).toLocaleDateString(locale, { month: "short", day: "numeric" });

export default function StepWhen({ form, setForm, durationMinutes, durations }) {
  useLocale();
  const loc = intlLocale();
  const { slug, business } = useBookingBusiness();
  // THE BUSINESS'S TODAY, never the customer's — somebody booking from
  // another state must not be shown yesterday.
  const today = businessToday(business.timezone);
  // A stable key for the selection, so the calendar reloads when the services
  // change but not on every render. The ids themselves are a new array each
  // time the parent renders.
  const serviceIds = form.serviceIds;
  const serviceKey = serviceIds.join(",");
  // ROADMAP 8.10 — WHICH CAR IS BEING SCHEDULED. Index 0 is the booking's own
  // date and time; the rest live on `form.extraVehicles`, which is the same
  // split the database keeps. On an ordinary booking there is one leg and this
  // is always 0, so nothing below behaves differently.
  const split = !!form.splitDays && (form.extraVehicles ?? []).length > 0;
  const legCount = split ? 1 + form.extraVehicles.length : 1;
  const [leg, setLeg] = useState(0);
  const which = Math.min(leg, legCount - 1);
  const legDate = which === 0 ? form.bookingDate : (form.extraVehicles[which - 1]?.date || "");
  const legTime = which === 0 ? form.startTime : (form.extraVehicles[which - 1]?.time || "");
  const setLegWhen = (date, time) => setForm((f) => (which === 0
    ? { ...f, bookingDate: date, startTime: time }
    : {
      ...f,
      extraVehicles: (f.extraVehicles ?? []).map((v, i) =>
        (i === which - 1 ? { ...v, date, time } : v)),
    }));
  // That car's own length, falling back to the whole job's — which is what a
  // one-car booking has always sent.
  const askFor = (Array.isArray(durations) ? durations[which] : null) || durationMinutes;

  const [month, setMonth] = useState(today.slice(0, 7));
  const [days, setDays] = useState(null);   // { "YYYY-MM-DD": {slots: []} }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [y, m] = month.split("-").map(Number);
  // Never ask for days in the past — the clamp is the core's.
  const { start: rangeStart, end: monthEnd } = monthRange(month, today);

  const load = useCallback(async () => {
    if (!askFor) return;
    setLoading(true);
    setError("");
    try {
      const r = await api.availableSlots(slug, {
        start_date: rangeStart,
        end_date: monthEnd,
        duration_minutes: askFor,
        // Roadmap 2.8c — two of the rules now live on the SERVICE (which
        // weekdays it is offered, whether it can be done at an address), so
        // the calendar has to say which services it is being asked about or it
        // will offer a day the submit-time gate refuses.
        service_ids: serviceIds,
      });
      setDays(r.days ?? {});
    } catch (e) {
      setError(e.message || t("Could not load available times."));
      setDays({});
    }
    setLoading(false);
  }, [slug, rangeStart, monthEnd, askFor, serviceKey]);

  useEffect(() => { load(); }, [load]);

  const cells = useMemo(() => monthGrid(month), [month]);

  const moveMonth = (delta) => {
    setMonth(shiftMonth(month, delta));
    setLegWhen("", "");
  };

  // W4 — a day can now be restricted EITHER way (drop-offs only, or mobile
  // only), so the times offered are the ones this customer's chosen service
  // type can actually have. Showing the rest and refusing them at submit is
  // the hole this closes: the page used to print "This day is drop-off only"
  // and then let a mobile booking through anyway.
  const allowed = (date) => slotsForType(days?.[date], form.serviceType);
  const daySlots = legDate ? allowed(legDate) : [];
  const day = legDate ? days?.[legDate] : null;
  // Named for what it is: this day cannot take the service type they picked.
  const wrongMode = dayRefusesMode(day, form.serviceType);

  return (
    <>
      {split && (
        // WHICH CAR. Each chip reads back the day and time already chosen for
        // it, because the one thing a customer needs on this step is to see
        // that the second car is not on the same afternoon as the first.
        <div className="bk-field">
          <span>{t("Pick a time for each car")}</span>
          <div className="bk-chips">
            {Array.from({ length: legCount }, (_, i) => {
              const d = i === 0 ? form.bookingDate : (form.extraVehicles[i - 1]?.date || "");
              const time = i === 0 ? form.startTime : (form.extraVehicles[i - 1]?.time || "");
              return (
                <button
                  key={i}
                  type="button"
                  className={`bk-chip word ${which === i ? "selected" : ""}`}
                  aria-pressed={which === i}
                  onClick={() => setLeg(i)}
                >
                  {t("Car {n}", { n: i + 1 })}
                  {d && time ? ` · ${shortDay(d, loc)} ${time12(time)}` : ""}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* One calendar unit. Without the wrapper, bk-wrap's flex gap opens a
          26px void between the month header, the weekday row and the grid —
          the same reason .bk-step-head exists in BookingPage.jsx. */}
      <div className="bk-cal-block">
        <div className="bk-row between">
          <button className="bk-btn ghost inline" onClick={() => moveMonth(-1)} aria-label={t("Previous month")}
            disabled={month <= today.slice(0, 7)}>
            <ChevronLeft size={20} strokeWidth={1.75} />
          </button>
          <h2>{new Date(y, m - 1, 1).toLocaleDateString(loc, { month: "long", year: "numeric" })}</h2>
          <button className="bk-btn ghost inline" onClick={() => moveMonth(1)} aria-label={t("Next month")}>
            <ChevronRight size={20} strokeWidth={1.75} />
          </button>
        </div>

        <div className="bk-cal">
          {dow(loc).map((d, i) => (
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
                className={`cell ${open ? "" : "closed"} ${date === today ? "today" : ""} ${legDate === date ? "selected" : ""}`}
                onClick={() => open && setLegWhen(date, "")}
                onKeyDown={(e) => {
                  if (open && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setLegWhen(date, "");
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
          {business.phone
            ? t("No open times this month. Try the next month, or call {phone}.",
              { phone: business.phone })
            : t("No open times this month. Try the next month.")}
        </div>
      )}

      {legDate && (
        <>
          <div className="bk-step-label" style={{ marginTop: 18 }}>
            {t("Times on {date}", {
              date: new Date(`${legDate}T12:00:00`)
                .toLocaleDateString(loc, { weekday: "long", month: "long", day: "numeric" }),
            })}
          </div>
          {wrongMode && (
            <div className="bk-note">
              {form.serviceType === "mobile"
                ? t("{business} is taking drop-offs only that day — go back a step to change how it’s done, or pick another day.",
                  { business: business.name })
                : t("{business} is coming to customers that day rather than taking drop-offs — go back a step, or pick another day.",
                  { business: business.name })}
            </div>
          )}
          <div className="bk-slots">
            {daySlots.map((slot) => (
              <button
                key={slot}
                className={`bk-chip ${legTime === slot ? "selected" : ""}`}
                onClick={() => setLegWhen(legDate, slot)}
              >
                {time12(slot)}
              </button>
            ))}
          </div>
          {daySlots.length === 0 && !wrongMode && <p className="bk-muted">{t("Nothing open that day.")}</p>}
        </>
      )}
    </>
  );
}
