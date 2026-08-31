// Confirmation shown when a business changes timezone AND has future
// bookings. Existing bookings keep their real instant — the appointment
// didn't move — but the clock they're read on does, so this spells out the
// effect using a real job from their own calendar.
//
// If there are no future bookings (the common case: fixing a wrong setting
// during onboarding), this never renders and the change is silent.

import { time12 } from "../lib/format.js";
import Sheet from "./Sheet.jsx";

export default function TimezoneChangeGuard({ from, to, sample, count, onCancel, onConfirm }) {
  const dayName = new Date(`${sample.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });
  return (
    <Sheet onClose={onCancel} title="Check your booked jobs" peek={52}>
        <p className="muted" style={{ marginBottom: 12 }}>
          You have {count} booked job{count === 1 ? "" : "s"} coming up. Moving from{" "}
          {from.replace(/_/g, " ")} to {to.replace(/_/g, " ")} does not move any appointment —
          each one still happens at the same moment — but the times shown will change.
        </p>

        <div className="card">
          <div className="muted" style={{ marginBottom: 6 }}>{sample.customerName}</div>
          <div className="row between">
            <div>
              <div className="muted" style={{ fontSize: "0.75rem" }}>Shows now</div>
              <strong>{dayName} {time12(sample.oldTime)}</strong>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="muted" style={{ fontSize: "0.75rem" }}>Will show as</div>
              <strong style={{ color: "var(--accent-text)" }}>{dayName} {time12(sample.newTime)}</strong>
            </div>
          </div>
        </div>

        <p className="muted" style={{ marginBottom: 12 }}>
          Your working hours, buffers and future availability all follow the new timezone.
        </p>

        <div className="grid2">
          <button className="btn" onClick={onCancel}>Keep {from.split("/").pop().replace(/_/g, " ")}</button>
          <button className="btn primary" onClick={onConfirm}>Change timezone</button>
        </div>
    </Sheet>
  );
}
