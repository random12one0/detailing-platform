// Edge-function callers. ALL booking writes go through these — the dashboard
// never writes the bookings table directly, so every change passes the same
// server-side validation as a customer booking (hours, blockouts, buffer,
// price recalculation, the DB overlap constraint).
//
// Settings-style writes (services, hours, promo codes, gallery, branding)
// go straight to the database through RLS — deliberately not over-engineered.

import { supabase } from "./supabase.js";

async function callFn(name, body) {
  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData?.session?.access_token;
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  // Booking writes — the one write path.
  createBooking: (businessSlug, payload) => callFn("create-booking", { business_slug: businessSlug, ...payload }),
  updateBooking: (businessId, payload) => callFn("update-booking", { business_id: businessId, ...payload }),
  softDeleteBooking: (businessId, bookingId) =>
    callFn("update-booking", { business_id: businessId, booking_id: bookingId, soft_delete: true }),
  // Reads / utilities.
  availableSlots: (businessSlug, payload) => callFn("available-slots", { business_slug: businessSlug, ...payload }),
  calculateBooking: (businessSlug, payload) => callFn("calculate-booking", { business_slug: businessSlug, ...payload }),
  sendInvoice: (businessId, bookingId) => callFn("send-invoice", { business_id: businessId, booking_id: bookingId }),
  sendReminder: (businessId, bookingId, target) =>
    callFn("send-owner-reminders", { business_id: businessId, booking_id: bookingId, target }),
};
