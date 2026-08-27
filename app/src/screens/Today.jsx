// Today — the morning-open home.
//
// Rebuilt on the new scale. The changes that matter:
//   - the two stat tiles sank onto --surface-sunken with no border, because
//     they are context, not content: two fewer boxes on the screen.
//   - "Next up" became a section LABEL above the card rather than a shouted
//     line inside it; the card carries the accent tint instead. The accent
//     no longer has to be a 2px border and a caps line and a colour at once.
//   - one weight-700 element on the screen (the greeting), and 8px inside a
//     thought against 24px between groups.
//   - the job card is dense and acts in place — Navigate, Call, Text and
//     Mark complete without tapping through.

import { useState } from "react";
import { Plus, TriangleAlert } from "lucide-react";
import { useBusiness } from "../context/BusinessContext.jsx";
import { useBookings } from "../hooks/useBookings.js";
import { api } from "../lib/api.js";
import { addDays, money, todayLocal } from "../lib/format.js";
import BookingCard from "../components/BookingCard.jsx";
import BookingDetail from "../components/BookingDetail.jsx";
import NewBookingModal from "../components/NewBookingModal.jsx";
import FinalizeModal from "../components/FinalizeModal.jsx";

export default function Today() {
  const { business, firstName, session } = useBusiness();
  const today = todayLocal(business.timezone);
  const tomorrow = addDays(today, 1);
  const { bookings, loading, reload } = useBookings(today, tomorrow);
  const [selected, setSelected] = useState(null);
  const [finalizing, setFinalizing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const todays = bookings.filter((b) => b.booking_date === today && b.status !== "cancelled");
  const tomorrows = bookings.filter((b) => b.booking_date === tomorrow && b.status !== "cancelled");

  const expected = todays.reduce((s, b) => s + Number(b.final_amount ?? b.total_price), 0);
  const collected = todays
    .filter((b) => b.payment_status === "paid")
    .reduce((s, b) => s + Number(b.final_amount ?? b.total_price), 0);
  const done = todays.filter((b) => b.status === "completed").length;

  const nowIso = new Date().toISOString();
  const nextJob = todays.find((b) => b.end_at > nowIso && b.status === "confirmed");
  const later = todays.filter((b) => b.id !== nextJob?.id);
  const needFinalize = todays.filter((b) => b.status === "completed" && !b.finalized_at);

  const greetingName = firstName || (session?.user?.email || "").split("@")[0];
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: business.timezone, hour12: false, hour: "2-digit" })
      .format(new Date()),
  );
  const partOfDay = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  const longDate = new Date(`${today}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const markComplete = async (b) => {
    setBusyId(b.id);
    try {
      await api.updateBooking(business.id, { booking_id: b.id, status: "completed" });
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="center"><div className="spinner" /></div>;

  return (
    <div className="group">
      <div>
        <h1 className="display">{partOfDay}{greetingName ? `, ${greetingName}` : ""}</h1>
        <p className="quiet" style={{ marginTop: 2 }}>{longDate}</p>
      </div>

      <div className="grid2">
        <div className="sunken">
          <span className="label">Jobs today</span>
          <div className="figure" style={{ marginTop: 6 }}>{todays.length}</div>
          <div className="quiet" style={{ marginTop: 2 }}>
            {todays.length === 0 ? "Nothing booked" : `${done} done · ${todays.length - done} to go`}
          </div>
        </div>
        <div className="sunken">
          <span className="label">Expected</span>
          <div className="figure" style={{ marginTop: 6 }}>{money(expected)}</div>
          <div className="quiet" style={{ marginTop: 2 }}>
            {collected > 0 ? `${money(collected)} collected` : "Nothing collected yet"}
          </div>
        </div>
      </div>

      {nextJob && (
        <div className="tight">
          <span className="label">Next up</span>
          <BookingCard
            booking={nextJob} isNext
            onClick={() => setSelected(nextJob)}
            onMarkComplete={busyId === nextJob.id ? undefined : markComplete}
            onFinalize={setFinalizing}
          />
        </div>
      )}

      {later.length > 0 && (
        <div className="tight">
          <span className="label">{nextJob ? "Later today" : "Today"}</span>
          {later.map((b) => (
            <BookingCard key={b.id} booking={b} onClick={() => setSelected(b)}
              onMarkComplete={busyId === b.id ? undefined : markComplete}
              onFinalize={setFinalizing} />
          ))}
        </div>
      )}

      {todays.length === 0 && <div className="dashed">No jobs booked for today.</div>}

      {needFinalize.length > 0 && (
        <div className="warn-box">
          <TriangleAlert strokeWidth={2} />
          <span>
            {needFinalize.length} finished job{needFinalize.length > 1 ? "s" : ""} still need
            {needFinalize.length === 1 ? "s" : ""} payment recorded.
          </span>
        </div>
      )}

      <div className="tight">
        <span className="label">Tomorrow</span>
        {tomorrows.length === 0
          ? <div className="dashed">Nothing booked yet.</div>
          : tomorrows.map((b) => (
            <BookingCard key={b.id} booking={b} dense onClick={() => setSelected(b)} />
          ))}
      </div>

      <button className="btn filled" onClick={() => setCreating(true)}>
        <Plus strokeWidth={2} /> New booking
      </button>

      {selected && (
        <BookingDetail booking={selected} onClose={() => setSelected(null)}
          onChanged={() => { reload(); setSelected(null); }} />
      )}
      {finalizing && (
        <FinalizeModal booking={finalizing} onClose={() => setFinalizing(null)}
          onDone={() => { setFinalizing(null); reload(); }} />
      )}
      {creating && (
        <NewBookingModal onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); reload(); }} />
      )}
    </div>
  );
}
