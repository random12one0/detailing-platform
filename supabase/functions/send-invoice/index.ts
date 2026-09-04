// Emails the finalized invoice (plus a separate thank-you/review email) for
// one booking. Member-gated: only someone in the booking's business can
// trigger it. Only sends when the booking is actually finalized.
//
// The vehicle-size surcharge on the invoice comes from the booking's
// snapshotted vehicle_size_fee — pricing has exactly ONE implementation
// (_shared/pricing.ts) and this function never re-derives it.
//
// Input: { booking_id, business_id? }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { businessById, getSettings, requireMember } from "../_shared/tenant.ts";
import { buildBrand, sendTenantEmail } from "../_shared/email.ts";
import { followupEmail, invoiceEmail, type InvoiceRow } from "../_shared/emailTemplates.ts";
import { sendOwnerPush } from "../_shared/ownerPush.ts";
import { receiptUrl } from "../_shared/config.ts";
import { dateStrIn, timeStrIn } from "../_shared/tz.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json().catch(() => ({}));
    const member = await requireMember(req, body.business_id ?? null);
    if (!member) return json({ error: "Unauthorized" }, 401);

    const id = typeof body.booking_id === "string" ? body.booking_id.trim() : "";
    if (!id) return json({ error: "booking_id is required" }, 400);

    const [bookingRes, lineItemsRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("*, services:booking_services(name_at_booking), add_ons:booking_add_ons(add_on:add_ons(name))")
        .eq("id", id)
        .eq("business_id", member.businessId)
        .maybeSingle(),
      supabase
        .from("booking_line_items")
        .select("category, label, amount, quantity, created_at")
        .eq("booking_id", id)
        .eq("business_id", member.businessId)
        .order("created_at", { ascending: true }),
    ]);
    const booking = bookingRes.data;
    if (!booking) return json({ error: "not_found" }, 404);

    const isFinalized = booking.final_amount !== null && booking.final_amount !== undefined && !!booking.payment_status;
    if (!isFinalized) return json({ error: "not_finalized" }, 400);
    if (!booking.customer_email) return json({ error: "no_customer_email" }, 400);

    const business = (await businessById(member.businessId))!;
    const settings = await getSettings(business.id);
    const brand = await buildBrand(business, settings);
    const tz = business.timezone;

    // --- THE INVOICE COPIES WHAT WAS FINALIZED. IT DOES NOT RE-DERIVE IT. ---
    //
    // THE OWNER'S OWN INSTRUCTION, 2026-09-03, and he was right:
    //
    //   *"I feel like it's so much simpler than it could be. We don't need to
    //   recalculate everything again when we send out the email. When you click
    //   finalize payment, it knows the total price and it has all the stuff you
    //   just put in. Just have it copy exactly what was calculated on what you
    //   finalized inside of the website. I don't get why there has to be math."*
    //
    // WHAT THIS FILE USED TO DO, and why it kept being wrong. It rebuilt the
    // customer's bill from scratch out of five different sources — snapshotted
    // services, original add-ons, `travel_fee`, `price_adjustments`, then the
    // finalize line items — and hoped the total of those five matched
    // `final_amount`, which is computed somewhere else entirely. **It never
    // did, and the gap moved every time somebody added a price feature.**
    // Roadmap 2.8c patched travel and surcharges in; 2.18 rendered one, looked
    // at it, and found the promo still missing — *Subtotal $405, Tip $30, Total
    // paid $395*, with $40 unexplained. Two fixes, same file, same defect,
    // because the shape was wrong rather than the arithmetic.
    //
    // WHAT IT DOES NOW, IN ONE SENTENCE: `FinalizeModal.jsx` computes
    // `final_amount = booking.total_price + Σ(line items)`, so the invoice
    // prints exactly those terms. **The column cannot disagree with the total,
    // because it IS the total's own definition.**
    //
    // No services, no add-ons, no travel, no `price_adjustments`, no promo, no
    // site sale, no rounding remainder — every one of those is already inside
    // `total_price`, which is the figure the customer agreed to and the one
    // their confirmation email itemises. **Re-itemising it here was rebuilding
    // a number that was never in doubt, and every rebuild was a chance to be
    // wrong about it.** The work is still NAMED on the invoice; it just does
    // not carry its own prices any more, because those are not what was
    // charged — `total_price` is.
    const CATEGORY_LABELS: Record<string, string> = {
      service: "Service",
      upgrade: "Upgrade",
      add_on: "Add-on",
      custom: "Custom charge",
      travel_fee: "Travel / Mobile fee",
      tip: "Tip",
      discount: "Discount",
    };
    const rows: InvoiceRow[] = [
      { label: "Booking total", qty: 1, lineTotal: Number(booking.total_price) || 0, kind: "charge" },
    ];
    for (const li of lineItemsRes.data ?? []) {
      const qty = parseInt(String(li.quantity || 1), 10) || 1;
      const lineTotal = (parseFloat(String(li.amount || 0)) || 0) * qty;
      const kind: InvoiceRow["kind"] =
        li.category === "tip" ? "tip" : li.category === "discount" || lineTotal < 0 ? "discount" : "charge";
      const prefix = CATEGORY_LABELS[li.category] ? `${CATEGORY_LABELS[li.category]}: ` : "";
      rows.push({ label: `${prefix}${li.label}`, qty, lineTotal, kind });
    }

    const chargesSubtotal = rows.filter((r) => r.kind === "charge").reduce((s, r) => s + r.lineTotal, 0);
    const discountsTotal = rows.filter((r) => r.kind === "discount").reduce((s, r) => s + r.lineTotal, 0);
    const tipTotal = rows.filter((r) => r.kind === "tip").reduce((s, r) => s + r.lineTotal, 0);
    const totalPaid = parseFloat(String(booking.final_amount));

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
      serviceNames: (booking.services ?? []).map((s: { name_at_booking: string }) => s.name_at_booking),
      addOnNames: (booking.add_ons ?? []).map((a: { add_on?: { name?: string } }) => a?.add_on?.name).filter(Boolean),
      subtotal: Number(booking.subtotal),
      siteDiscount: 0,
      siteDiscountPercent: 0,
      promoCode: booking.applied_promo_code,
      promoDiscount: Number(booking.promo_discount) || 0,
      total: Number(booking.total_price),
      receiptUrl: receiptUrl(business.slug, booking.id),
    };

    const invoice = invoiceEmail(
      brand,
      emailData,
      rows,
      { chargesSubtotal, discountsTotal, tipTotal, totalPaid },
      booking.payment_status,
      booking.payment_notes,
    );
    const sent = await sendTenantEmail({
      businessId: business.id,
      to: booking.customer_email,
      subject: invoice.subject,
      html: invoice.html,
      text: invoice.text, text: invoice.text,
    });
    if (!sent) return json({ error: "email_failed" }, 502);

    // Separate thank-you / review-request email — best-effort.
    let thankYouSent = false;
    if (settings.email_customer_followup) try {
      const firstName = String(booking.customer_name || "Customer").split(" ")[0] || "Customer";
      const followup = followupEmail(brand, firstName);
      thankYouSent = await sendTenantEmail({
        businessId: business.id,
        to: booking.customer_email,
        subject: followup.subject,
        html: followup.html,
        text: followup.text, text: followup.text,
      });
    } catch (e) {
      console.error("Error sending thank-you email:", e);
    }

    try {
      if (settings.push_enabled) await sendOwnerPush(business.id, {
        title: "Payment finalized",
        body: `${booking.customer_name} — $${totalPaid.toFixed(2)} (invoice + thank-you sent)`,
        url: `/admin/job/${booking.id}`,
        tag: `booking-${booking.id}`,
      });
    } catch (pushErr) {
      console.error("Owner push send error:", pushErr);
    }

    return json({ success: true, thank_you_sent: thankYouSent });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
