// Single-booking page — what a push-notification tap opens.
//
// EVERY WAY OUT OF THIS PAGE WENT TO `/`, WHICH IS THE MARKETING SITE. Found
// 2026-09-01 by pressing the back control this page had just been given: `/`
// is LandingPage in main.jsx and the dashboard is `/app`, so a detailer who
// opened a job from a notification and pressed anything landed on the sales
// page for the product they already bought. Three call sites, all now `/app`.
// It predates the rebuild; it surfaced because nothing had ever exercised the
// way out — the record's own Sheet used to swallow the close.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { withLocal, BOOKING_SELECT } from "../hooks/useBookings.js";
import Auth from "./Auth.jsx";
import BookingDetail, { jobRecordProps } from "../components/BookingDetail.jsx";

export default function JobPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session, business, loading } = useBusiness();
  const [booking, setBooking] = useState(undefined);

  useEffect(() => {
    if (!business) return;
    supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle()
      .then(({ data }) => setBooking(data ? withLocal(data, business.timezone) : null));
  }, [business, id]);

  if (loading) return <div className="center"><div className="spinner" /></div>;
  if (!session) return <Auth />;
  if (booking === undefined) return <div className="center"><div className="spinner" /></div>;
  if (booking === null) {
    return (
      <div className="center">
        <p>Booking not found.</p>
        <button className="btn inline" onClick={() => navigate("/app")}>Go to dashboard</button>
      </div>
    );
  }
  // The record no longer carries its own Sheet, and at /job/:id there is no
  // list to open it beside — so the page IS the container, and this is the
  // one caller that got simpler (component inventory §3b).
  //
  // THE WAY OUT HAS TO BE DRAWN HERE, and that is the one thing losing the
  // Sheet cost. The Sheet's header carried the X; without it this page had
  // `onClose` wired to the dashboard and nothing on screen that called it, so
  // a job opened from a notification was a dead end. Checked in a browser,
  // not reasoned about.
  return (
    <div className="app-shell">
      <main className="app-main">
        <button className="btn inline ghost" style={{ marginBottom: "var(--sp-3)" }}
          onClick={() => navigate("/app")}>
          <ChevronLeft strokeWidth={2} /> Dashboard
        </button>
        {/* THIS PAGE IS THE RECORD'S CONTAINER, SO IT OWES THE HEADER A
            CONTAINER GIVES. The record deliberately does not repeat the date
            and time — a sheet and the desk's second column both print them
            above it — and this page printed only the name, so a job opened
            from a push notification did not say WHEN it was. Same shape as
            the two defects stage 1 found here: the page inherited a job it
            never took over. `jobRecordProps` is the one place that string is
            composed, so all three containers title a job the same way. */}
        <h1 className="title">{jobRecordProps(booking).title}</h1>
        <p className="quiet" style={{ marginTop: 2, marginBottom: "var(--sp-4)" }}>
          {jobRecordProps(booking).subtitle}
        </p>
        <BookingDetail
          booking={booking}
          onClose={() => navigate("/app")}
          onChanged={() => navigate("/app")}
        />
      </main>
    </div>
  );
}
