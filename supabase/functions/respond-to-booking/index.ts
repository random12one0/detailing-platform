// ROADMAP 2.12 — THE DETAILER'S ANSWER TO A REQUEST. Accept, decline, or
// quote, member-gated, one function.
//
// WHY THIS IS NOT THREE FIELDS ON `update-booking`. That function is a field
// ALLOWLIST: the caller names columns and it writes them after validation.
// Accepting is not a column write — it is a status change AND a customer email,
// and declining is a status change AND a timestamp AND a different customer
// email. Putting the three actions behind an allowlist would mean the browser
// composing the rule ("set status confirmed, and also clear quoted_at, and
// also send this email"), which is exactly the thing every other write path in
// this repo refuses to let it do. One verb per action, decided here.
//
// Input: { business_id?, booking_id, action: "accept" | "decline" | "quote",
//          amount? (quote only), note? (quote only) }
//
// WHAT A QUOTE DOES AND DELIBERATELY DOES NOT DO. It writes `quoted_amount`,
// never `total_price`. CLAUDE.md's rule is that a number PRINTED is not a
// number CHARGED, and a price the customer has not agreed to is the purest
// case of that: the booking keeps the price it was taken at until the customer
// presses the button in the email, which is `accept-quote`'s job. The slot is
// held throughout — a quoted booking is still `pending`, and `pending` is still
// inside the exclusion constraint.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { businessById, getSettings, requireMember } from "../_shared/tenant.ts";
import { buildBrand, sendTenantEmail } from "../_shared/email.ts";
import { requestDecisionEmail } from "../_shared/emailTemplates.ts";
import { receiptUrl } from "../_shared/config.ts";
import { dateStrIn, timeStrIn } from "../_shared/tz.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json();
    const member = await requireMember(req, body.business_id ?? null);
    if (!member) return json({ error: "Unauthorized" }, 401);

    const action = String(body.action || "");
    if (!["accept", "decline", "quote"].includes(action)) {
      return json({ error: "action must be accept, decline or quote" }, 400);
    }
    if (!body.booking_id) return json({ error: "Booking ID is required" }, 400);

    // Scoped to the caller's own business — a UUID from another tenant 404s,
    // exactly like a nonexistent one.
    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", body.booking_id)
      .eq("business_id", member.businessId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!booking) return json({ error: "Booking not found" }, 404);
    if (booking.status !== "pending") {
      return json({ error: "This booking is not waiting to be accepted." }, 409);
    }

    let update: Record<string, unknown>;
    let amount = 0;
    if (action === "accept") {
      // Accepting clears any outstanding quote: the detailer has just agreed
      // to the price the customer already has. Leaving a stale `quoted_amount`
      // on a confirmed booking would put a second number on the record with no
      // rule saying which one is charged.
      update = { status: "confirmed", quoted_amount: null, quoted_note: null, quoted_at: null };
    } else if (action === "decline") {
      // 'cancelled' is what frees the slot and what every existing filter
      // already understands; `declined_at` is the one fact it cannot carry.
      update = { status: "cancelled", declined_at: new Date().toISOString() };
    } else {
      amount = Math.round(Number(body.amount) * 100) / 100;
      if (!Number.isFinite(amount) || amount <= 0) {
        return json({ error: "A quote needs a price above zero." }, 400);
      }
      update = {
        quoted_amount: amount,
        quoted_note: String(body.note || "").trim() || null,
        quoted_at: new Date().toISOString(),
      };
    }

    const { data: updated, error } = await supabase
      .from("bookings")
      .update(update)
      .eq("id", booking.id)
      .eq("business_id", member.businessId)
      .select()
      .single();
    if (error) throw error;

    // --- The customer's email. Best-effort, like every other notification in
    // this repo: the answer is already recorded, and a mail failure must not
    // put the request back in the queue.
    const business = (await businessById(member.businessId))!;
    const settings = await getSettings(business.id);
    const tz = business.timezone;
    const brand = await buildBrand(business, settings);
    const emailData = {
      id: booking.id,
      customerName: booking.customer_name,
      customerPhone: booking.customer_phone,
      customerEmail: booking.customer_email,
      customerAddress: booking.customer_address,
      dateStr: dateStrIn(tz, new Date(booking.start_at)),
      startTime: timeStrIn(tz, new Date(booking.start_at)),
      endTime: timeStrIn(tz, new Date(booking.end_at)),
      serviceType: booking.service_type,
      vehicleSize: booking.vehicle_size_label || booking.vehicle_size,
      vehicleModel: booking.vehicle_model,
      customerNotes: booking.customer_notes,
      serviceNames: [],
      addOnNames: [],
      travelFee: Number(booking.travel_fee) || 0,
      travelZone: booking.travel_zone,
      adjustments: booking.price_adjustments ?? [],
      subtotal: Number(booking.subtotal),
      siteDiscount: 0,
      siteDiscountPercent: 0,
      promoCode: booking.applied_promo_code,
      promoDiscount: Number(booking.promo_discount) || 0,
      total: Number(booking.total_price),
      receiptUrl: receiptUrl(business.slug, booking.id),
    };

    if (booking.customer_email) {
      const msg = requestDecisionEmail(
        brand,
        emailData,
        action === "accept" ? "accepted" : action === "decline" ? "declined" : "quote",
        { manageUrl: emailData.receiptUrl, quotedAmount: amount, quotedNote: update.quoted_note as string | null },
      );
      await sendTenantEmail({
        businessId: business.id, to: booking.customer_email, subject: msg.subject, html: msg.html, text: msg.text,
      });
    }

    return json({ success: true, booking: updated });
  } catch (err) {
    console.error("respond-to-booking error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
