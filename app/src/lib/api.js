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
  // ROADMAP 2.12 — answering a request. Its own function rather than three
  // more allowlisted fields on update-booking: each of these three is a
  // status change AND a customer email, and which email is not a decision the
  // browser gets to make.
  respondToBooking: (businessId, bookingId, action, extra = {}) =>
    callFn("respond-to-booking", { business_id: businessId, booking_id: bookingId, action, ...extra }),
  // Reads / utilities.
  availableSlots: (businessSlug, payload) => callFn("available-slots", { business_slug: businessSlug, ...payload }),
  calculateBooking: (businessSlug, payload) => callFn("calculate-booking", { business_slug: businessSlug, ...payload }),
  createBusiness: (payload) => callFn("create-business", payload),
  sendInvoice: (businessId, bookingId) => callFn("send-invoice", { business_id: businessId, booking_id: bookingId }),
  sendReminder: (businessId, bookingId, target) =>
    callFn("send-owner-reminders", { business_id: businessId, booking_id: bookingId, target }),
  inviteUser: (businessId, email, role, label, permissions) =>
    callFn("invite-user", { business_id: businessId, email, role, label, permissions }),

  // ROADMAP 2.19 — the detailer emailing customers they picked themselves.
  // The browser sends the ids it chose and the words it typed; WHO ACTUALLY
  // GETS AN EMAIL is decided on the server, because two of the three rules
  // (an address, and not having opted out) are promises to the customer rather
  // than to the detailer, and a promise honoured only by the UI is not
  // honoured. The counts come back so the screen can say what happened.
  sendCampaign: (businessId, customerIds, subject, message) =>
    callFn("send-campaign", { business_id: businessId, customer_ids: customerIds, subject, message }),

  // PUSH, THE BROWSER HALF (roadmap 2.11 step 6 stage 6). All three of these
  // functions already existed and nothing in `app/` had ever called one.
  // `pushPublicKey` is a probe rather than a build-time VITE_ variable so the
  // VAPID key has ONE home, beside its private half as a function secret.
  pushPublicKey: (businessId) => callFn("owner-push-subscribe", { business_id: businessId, probe: true }),
  pushSubscribe: (businessId, subscription) => callFn("owner-push-subscribe", { business_id: businessId, subscription }),
  pushUnsubscribe: (businessId, endpoint) => callFn("owner-push-unsubscribe", { business_id: businessId, endpoint }),

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
  // Roadmap 2.12. Saying NO to a quote is cancelBooking above — a customer who
  // won't pay the price is cancelling, and the slot has to go back either way.
  acceptQuote: (bookingId) => callFn("accept-quote", { booking_id: bookingId }),
  rescheduleBooking: (bookingId, bookingDate, startTime) =>
    callFn("reschedule-booking", { booking_id: bookingId, booking_date: bookingDate, start_time: startTime }),

  // ROADMAP 2.14 STEP 3 — the customer's own plan, reached by the membership
  // UUID exactly the way `/booking/:id` is reached by the booking UUID. There
  // is no account and no password; the owner's account idea was answered with
  // a link (round 3 of the plans research).
  planMember: (memberId) => callFn("plan-link", { action: "get", member_id: memberId }),
  cancelPlanMember: (memberId) => callFn("plan-link", { action: "cancel", member_id: memberId }),
  // EMAIL IN, LINK OUT. It answers the same way whether or not the address
  // belongs to a member — the version the owner first described ("type your
  // email and it shows you") is address enumeration.
  emailPlanLink: (businessSlug, email) =>
    callFn("plan-link", { action: "email", business_slug: businessSlug, email }),

  // ROADMAP 2.19 — the opt-out at the bottom of a marketing email. The
  // customer's own UUID is the credential, the fourth caller of the pattern
  // /booking/:id started. TWO CALLS RATHER THAN ONE LINK: mail scanners and
  // prefetchers follow links, so the link only READS, and a person presses the
  // button that writes.
  unsubscribeLookup: (customerId) => callFn("unsubscribe", { action: "get", customer_id: customerId }),
  unsubscribeConfirm: (customerId) => callFn("unsubscribe", { action: "set", customer_id: customerId }),
};

// The times on a day that THIS service type can actually have.
//
// available-slots returns every time the business has open, plus the subsets
// that are drop-off-only and mobile-only for that day (roadmap 2.7, W4 — a
// detailer can close either way, for a day or a stretch of days). Three
// screens ask the same question of that payload — the customer's step 4, the
// dashboard's new-booking modal and the customer's reschedule — so it is one
// function rather than the same three lines copied around.
//
// `validateSlot` on the server is the gate either way; this is so the UI does
// not OFFER a time it is going to refuse. Pass the day object from
// `days[date]`, or the single-day response, which has the same shape.
export function slotsForType(day, serviceType) {
  if (!day) return [];
  const blocked = serviceType === "mobile" ? day.dropoff_slots : day.mobile_slots;
  return (day.slots ?? []).filter((t) => !(blocked ?? []).includes(t));
}
