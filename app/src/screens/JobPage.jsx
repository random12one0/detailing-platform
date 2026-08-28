// Single-booking page — what a push-notification tap opens.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { withLocal, BOOKING_SELECT } from "../hooks/useBookings.js";
import Auth from "./Auth.jsx";
import BookingDetail from "../components/BookingDetail.jsx";

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
        <button className="btn inline" onClick={() => navigate("/")}>Go to dashboard</button>
      </div>
    );
  }
  return (
    <BookingDetail
      booking={booking}
      onClose={() => navigate("/")}
      onChanged={() => navigate("/")}
    />
  );
}
