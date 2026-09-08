// Confirmation shown when a business changes timezone AND has future
// bookings. Existing bookings keep their real instant — the appointment
// didn't move — but the clock they're read on does, so this spells out the
// effect using a real job from their own calendar.
//
// If there are no future bookings (the common case: fixing a wrong setting
// during onboarding), this never renders and the change is silent.

import { time12 } from "../lib/format.js";
import Sheet from "./Sheet.jsx";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

export default function TimezoneChangeGuard({ from, to, sample, count, onCancel, onConfirm }) {
  useAppLocale();
  const dayName = new Date(`${sample.date}T12:00:00`).toLocaleDateString(appIntlLocale(), { weekday: "long" });
  return (
    <Sheet onClose={onCancel} title={t("Check your booked jobs")} peek={52}>
        <p className="muted" style={{ marginBottom: 12 }}>
          You have {count} booked job{count === 1 ? "" : "s"} coming up. Moving from{" "}
          {from.replace(/_/g, " ")} to {to.replace(/_/g, " ")} does not move any appointment —
          each one still happens at the same moment — but the times shown will change.
        </p>

        <div className="card">
          <div className="muted" style={{ marginBottom: 6 }}>{sample.customerName}</div>
          <div className="row between">
            <div>
              <div className="muted" style={{ fontSize: "0.75rem" }}>{t("Shows now")}</div>
              <strong>{dayName} {time12(sample.oldTime)}</strong>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="muted" style={{ fontSize: "0.75rem" }}>{t("Will show as")}</div>
              <strong style={{ color: "var(--accent-text)" }}>{dayName} {time12(sample.newTime)}</strong>
            </div>
          </div>
        </div>

        <p className="muted" style={{ marginBottom: 12 }}>
          {t("Your working hours, buffers and future availability all follow the new timezone.")}
        </p>

        <div className="grid2">
          <button className="btn" onClick={onCancel}>Keep {from.split("/").pop().replace(/_/g, " ")}</button>
          <button className="btn primary" onClick={onConfirm}>{t("Change timezone")}</button>
        </div>
    </Sheet>
  );
}
