// ROADMAP 8.5b — THE ONE PUBLIC PAGE THAT CANNOT BE OPENED BY A URL.
//
// `BookingConfirmed` is not a route. It is a state `BookingPage` enters after
// a submit, so the only way anybody has ever seen it is by making a booking —
// which means the screen a customer lands on **at the moment they have just
// handed over their money** is the one screen in this product that no check
// has ever looked at.
//
// This mounts it against a fixture, the way `scripts/render-emails.mjs`
// renders an email template without sending one: no route, no row, no submit.
// **Nothing here is shipped** — this file is only reachable through
// `app/fixture-confirmed.html`, which is not in the router and not linked
// from anything.
//
// THE PROVIDER IS THE REAL ONE, ON PURPOSE. It fetches the demo tenant's
// public profile exactly as the live page does, so the brand colour, the
// business name and the drop-off address are the product's own rather than
// invented. Only the BOOKING is a fixture, because a booking is the thing
// that would otherwise have to be written.

import { createRoot } from "react-dom/client";
import { BookingBusinessProvider, useBookingBusiness } from "../book/BookingBusinessContext.jsx";
import BookingConfirmed from "../book/BookingConfirmed.jsx";
import "../book/booking.css";

const params = new URLSearchParams(location.search);

// A REQUEST-MODE BOOKING BY DEFAULT, because the demo tenant is request mode
// and that is the branch a customer of theirs actually lands on. `?status=
// confirmed` renders the other one; both are worth walking.
const booking = {
  id: "00000000-0000-4000-8000-000000000000",
  booking_date: "2026-09-25",
  start_time: "10:00",
  end_time: "11:00",
  total_price: 65,
  receipt_url: "https://example.com/booking/fixture",
  status: params.get("status") === "confirmed" ? "confirmed" : "pending",
};

const form = {
  customerEmail: "fixture@example.com",
  customerAddress: "1450 Marina Blvd, Long Beach, CA",
  serviceType: params.get("service_type") || "dropoff",
};

// **THE SAME GATE THE REAL PAGE HAS.** The provider renders its children
// immediately and fills the profile in when the fetch lands, so mounting the
// screen straight away throws on `business.name` — `BookingPage` waits for
// `status === "ready"` and so does this. Without it the fixture would be
// measuring a crash.
function WhenReady() {
  const ctx = useBookingBusiness();
  if (!ctx || ctx.status !== "ready") return null;
  return <BookingConfirmed booking={booking} form={form} />;
}

createRoot(document.getElementById("root")).render(
  <BookingBusinessProvider slug="demo-detail">
    <WhenReady />
  </BookingBusinessProvider>,
);
