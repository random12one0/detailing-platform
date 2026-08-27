import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { useBusiness } from "../context/BusinessContext.jsx";
import { useBookings } from "../hooks/useBookings.js";
import { addDays, money, todayLocal } from "../lib/format.js";
import BookingCard from "../components/BookingCard.jsx";
import BookingDetail from "../components/BookingDetail.jsx";
import NewBookingModal from "../components/NewBookingModal.jsx";

export default function Today() {
  const { business, firstName, session } = useBusiness();
  const today = todayLocal(business.timezone);
  const tomorrow = addDays(today, 1);
  const { bookings, loading, reload } = useBookings(today, tomorrow);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);

  const todays = bookings.filter((b) => b.booking_date === today && b.status !== "cancelled");
  const tomorrows = bookings.filter((b) => b.booking_date === tomorrow && b.status !== "cancelled");
  const expected = todays.reduce((s, b) => s + Number(b.final_amount ?? b.total_price), 0);
  // The next job still to happen today — the one the screen exists to answer.
  const nowIso = new Date().toISOString();
  const nextJob = todays.find((b) => b.end_at > nowIso && b.status === "confirmed");
  const greetingName = firstName || (session?.user?.email || "").split("@")[0];
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: business.timezone, hour12: false, hour: "2-digit" })
      .format(new Date()),
  );
  const partOfDay = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  const needFinalize = todays.filter((b) => b.status === "confirmed" && b.finalized_at == null);

  if (loading) return <div className="center"><div className="spinner" /></div>;

  return (
    <>
      <h1 style={{ marginBottom: 12 }}>
        {partOfDay}{greetingName ? `, ${greetingName}` : ""}
      </h1>
      <div className="grid2">
        <div className="card"><div className="muted">Jobs today</div><div className="big">{todays.length}</div></div>
        <div className="card"><div className="muted">Expected</div><div className="big">{money(expected)}</div></div>
      </div>

      <button className="btn primary" onClick={() => setCreating(true)}>+ New booking</button>

      <div className="section-title">Today</div>
      {todays.length === 0 && <p className="muted">No jobs today.</p>}
      {todays.map((b) => (
        <BookingCard key={b.id} booking={b} onClick={() => setSelected(b)} isNext={b.id === nextJob?.id} />
      ))}

      {needFinalize.length > 0 && (
        <div className="warn-box"><TriangleAlert size={16} strokeWidth={1.75} /> {needFinalize.length} job{needFinalize.length > 1 ? "s" : ""} today still need{needFinalize.length === 1 ? "s" : ""} payment finalized when done.</div>
      )}

      <div className="section-title">Tomorrow</div>
      {tomorrows.length === 0 && <p className="muted">Nothing yet.</p>}
      {tomorrows.map((b) => <BookingCard key={b.id} booking={b} onClick={() => setSelected(b)} />)}

      {selected && (
        <BookingDetail booking={selected} onClose={() => setSelected(null)}
          onChanged={() => { reload(); setSelected(null); }} />
      )}
      {creating && (
        <NewBookingModal onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); reload(); }} />
      )}
    </>
  );
}
