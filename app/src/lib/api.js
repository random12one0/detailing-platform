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

// The .ics endpoint is a plain GET the browser can open directly, so the
// button behaves like a download rather than a fetch.
export const icsUrl = (bookingId, audience = "owner") =>
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/booking-ics?id=${bookingId}&audience=${audience}&apikey=${import.meta.env.VITE_SUPABASE_ANON_KEY}`;

export const api = {
  // Booking writes — the one write path.
  createBooking: (businessSlug, payload) => callFn("create-booking", { business_slug: businessSlug, ...payload }),
  updateBooking: (businessId, payload) => callFn("update-booking", { business_id: businessId, ...payload }),
  softDeleteBooking: (businessId, bookingId) =>
    callFn("update-booking", { business_id: businessId, booking_id: bookingId, soft_delete: true }),
  // Reads / utilities.
  availableSlots: (businessSlug, payload) => callFn("available-slots", { business_slug: businessSlug, ...payload }),
  calculateBooking: (businessSlug, payload) => callFn("calculate-booking", { business_slug: businessSlug, ...payload }),
  createBusiness: (payload) => callFn("create-business", payload),
  sendInvoice: (businessId, bookingId) => callFn("send-invoice", { business_id: businessId, booking_id: bookingId }),
  sendReminder: (businessId, bookingId, target) =>
    callFn("send-owner-reminders", { business_id: businessId, booking_id: bookingId, target }),
  inviteUser: (businessId, email, role) => callFn("invite-user", { business_id: businessId, email, role }),

  // --- Public, customer-facing. No session; the unguessable booking UUID is
  // the credential, the same access model the receipt endpoint already used.
  validatePromo: (businessSlug, code, customerEmail, customerPhone) =>
    callFn("validate-promo-code", {
      business_slug: businessSlug, code,
      customer_email: customerEmail || null, customer_phone: customerPhone || null,
    }),
  bookingReceipt: (bookingId) => callFn("get-booking-receipt", { id: bookingId }),

  // The founding offer's cap and how many spots are actually left, counted
  // from the accounts themselves (see the 20260828001000/001100 migrations).
  // Returns two integers and nothing else — safe to call from the public
  // marketing page, which has no session.
  foundingOffer: async () => {
    const { data, error } = await supabase.rpc("founding_offer");
    if (error) throw error;
    return { total: Number(data?.total ?? 0), left: Number(data?.left ?? 0) };
  },
  cancelBooking: (bookingId) => callFn("cancel-booking", { booking_id: bookingId }),
  rescheduleBooking: (bookingId, bookingDate, startTime) =>
    callFn("reschedule-booking", { booking_id: bookingId, booking_date: bookingDate, start_time: startTime }),
};
