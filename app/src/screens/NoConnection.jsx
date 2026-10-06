// ROADMAP 6.4a — WHAT THE DASHBOARD IS WHEN IT STARTS WITH NO SIGNAL.
//
// Opened with nothing to ask — a reload in a driveway, a tab the phone dropped
// and woke — the dashboard cannot learn who is signed in or which business, and
// used to answer that with the sign-in form or, worse, *Create your business*.
// This is the page instead. It needs no session and no request: it reads the
// last list of jobs this device loaded (lib/offlineJobs.js) and says how old it
// is, in the same sentence Today uses. With nothing stored it says so plainly
// and still offers Retry. It is never blank.
//
// Plain rows rather than JobRow: a job here is read, and a phone number is
// something to press, so the number and address are on the row.

import { useEffect, useState } from "react";
import { Printer, WifiOff } from "lucide-react";
import { asOfLabel, readLastJobs } from "../lib/offlineJobs.js";
import { addDays, phone, time12, todayLocal } from "../lib/format.js";
import { appIntlLocale, t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";
import SchedulePrint from "../components/SchedulePrint.jsx";

export default function NoConnection() {
  useAppLocale();
  const [saved] = useState(readLastJobs);
  const [printing, setPrinting] = useState(false);

  // Signal back: start again, which is the same thing Retry does.
  useEffect(() => {
    const go = () => window.location.reload();
    window.addEventListener("online", go);
    return () => window.removeEventListener("online", go);
  }, []);

  const retry = (
    <button className="btn primary" onClick={() => window.location.reload()}>{t("Retry")}</button>
  );

  if (!saved) {
    return (
      <div className="app-shell"><div className="app-main"><div className="group" data-no-connection="empty">
        <h1 className="title">{t("No connection")}</h1>
        <div className="warn-box" role="status">
          <WifiOff size={18} strokeWidth={2} aria-hidden="true" />
          <span style={{ flex: "1 1 0", minWidth: 0 }}>
            {t("You're offline, and this device has no saved jobs yet. Open the app once with a connection and your jobs will be here next time.")}
          </span>
        </div>
        {retry}
      </div></div></div>
    );
  }

  const today = todayLocal(saved.tz);
  const live = saved.bookings.filter((b) => b.booking_date >= today && b.status !== "cancelled");
  const days = [...new Set(live.map((b) => b.booking_date))].map((d) => [d, live.filter((b) => b.booking_date === d)]);
  const dayName = (d) => (d === today ? t("Today") : d === addDays(today, 1) ? t("Tomorrow")
    : new Date(`${d}T12:00:00`).toLocaleDateString(appIntlLocale(), { weekday: "short", month: "short", day: "numeric" }));
  const next = days.find(([d]) => d > today);

  return (
    <div className="app-shell"><div className="app-main"><div className="group" data-no-connection="saved">
      <h1 className="title">{saved.name}</h1>
      <div className="warn-box" role="status" data-offline="">
        <WifiOff size={18} strokeWidth={2} aria-hidden="true" />
        <span style={{ flex: "1 1 0", minWidth: 0 }}>
          {t("You're offline. Showing your jobs as of {time}.", { time: asOfLabel(saved.at, saved.tz, today) })}
        </span>
      </div>
      {days.length === 0 && <p className="quiet">{t("Nothing booked in the days saved.")}</p>}
      {days.map(([d, jobs]) => (
        <div className="tight" key={d}>
          <h2 className="label">{dayName(d)}</h2>
          <div className="rows">
            {jobs.map((b) => (
              <div className="row-item" key={b.id} style={{ cursor: "default" }}>
                <span className="txt">
                  <span className="nm"><span className="t">{time12(b.start_time)}</span>{b.customer_name}</span>
                  <span className="sub">
                    {[...(b.services ?? []).map((s) => s.name_at_booking), b.customer_address].filter(Boolean).join(" · ")}
                  </span>
                  {b.customer_phone && (
                    <a className="sub" href={`tel:${b.customer_phone}`} style={{ display: "block", minHeight: 44, paddingTop: 10, color: "var(--accent-text)" }}>
                      {phone(b.customer_phone)}
                    </a>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="btnrow">
        {retry}
        {next && (
          <button className="btn" onClick={() => setPrinting(true)}>
            <Printer size={16} strokeWidth={2} /> {next[0] === addDays(today, 1) ? t("Print tomorrow") : t("Print {day}", { day: dayName(next[0]) })}
          </button>
        )}
      </div>
      {printing && next && (
        <SchedulePrint jobs={next[1]} businessName={saved.name}
          title={next[0] === addDays(today, 1) ? t("Tomorrow's schedule") : t("Schedule")}
          dateLabel={new Date(`${next[0]}T12:00:00`).toLocaleDateString(appIntlLocale(), { weekday: "long", month: "long", day: "numeric" })}
          onClose={() => setPrinting(false)} />
      )}
    </div></div></div>
  );
}
