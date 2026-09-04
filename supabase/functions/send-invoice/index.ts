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
        .select("*, services:booking_services(name_at_booking, price_at_booking), add_ons:booking_add_ons(add_on:add_ons(id, name, price))")
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

    // --- Itemized rows: snapshotted services (size fee already included in
    // price_at_booking), original add-ons, then finalized line items. -------
    const rows: InvoiceRow[] = [];
    for (const s of booking.services ?? []) {
      rows.push({ label: s.name_at_booking, qty: 1, lineTotal: Number(s.price_at_booking) || 0, kind: "charge" });
    }
    for (const a of booking.add_ons ?? []) {
      if (a?.add_on?.name) {
        rows.push({ label: `Add-on: ${a.add_on.name}`, qty: 1, lineTotal: Number(a.add_on.price) || 0, kind: "charge" });
      }
    }
    // ROADMAP 2.8c — travel and the time-based surcharges live ON the booking
    // row, not in booking_line_items, so an invoice built only from services,
    // add-ons and line items silently dropped them. The bottom line was still
    // right (it is final_amount, what was actually collected) but the
    // itemisation above it did not add up to anything.
    if (Number(booking.travel_fee) > 0) {
      rows.push({
        label: booking.travel_zone ? `Travel — ${booking.travel_zone}` : "Travel",
        qty: 1, lineTotal: Number(booking.travel_fee), kind: "charge",
      });
    }
    for (const a of booking.price_adjustments ?? []) {
      rows.push({ label: String(a.label), qty: 1, lineTotal: Number(a.amount) || 0, kind: "charge" });
    }

    const CATEGORY_LABELS: Record<string, string> = {
      service: "Service",
      upgrade: "Upgrade",
      add_on: "Add-on",
      custom: "Custom charge",
      travel_fee: "Travel / Mobile fee",
      tip: "Tip",
      discount: "Discount",
    };
    for (const li of lineItemsRes.data ?? []) {
      const qty = parseInt(String(li.quantity || 1), 10) || 1;
      const lineTotal = (parseFloat(String(li.amount || 0)) || 0) * qty;
      const kind: InvoiceRow["kind"] =
        li.category === "tip" ? "tip" : li.category === "discount" || lineTotal < 0 ? "discount" : "charge";
      const prefix = CATEGORY_LABELS[li.category] ? `${CATEGORY_LABELS[li.category]}: ` : "";
      rows.push({ label: `${prefix}${li.label}`, qty, lineTotal, kind });
    }

    // THE PROMO LINE THAT WAS NEVER DRAWN, AND THE BUG IT FIXES.
    //
    // Roadmap 2.18 rendered an invoice and looked at it for the first time in
    // the product's life. The column did not reach its own total: the charge
    // rows sum to `subtotalBase` — services, add-ons, travel, surcharges, all
    // BEFORE any discount — while `final_amount` is `total_price`, already
    // PAST the site sale AND the promo, and rounded. Rendered: Subtotal $405,
    // Tip $30, Total paid $395 — $40 missing and unexplained.
    //
    // It is `travel_fee`'s twin, in this file, a few lines below the fix for
    // it — *a fix that names one instance of a pattern fixes one instance.*
    // And no test saw it because `money-export` ties out the ACCOUNTANT EXPORT
    // and `booking-engine` test 17 ties out the QUOTE ENGINE: **a tie-out is
    // only a tie-out for the document it names.**
    //
    // ONLY THE PROMO IS ITEMISED BY NAME, AND THAT IS A LIMIT RATHER THAN A
    // CHOICE. `promo_discount` and `applied_promo_code` are columns on the
    // booking; **the site sale's AMOUNT is not stored anywhere** — it is baked
    // into `subtotal` at booking time (`create-booking` writes
    // `quote.subtotalAfterSite`) and the settings it came from may have
    // changed since. `invoiceEmail` passes its lines through `reconcile`,
    // which draws whatever is left — the sale, the rounding — as one honest
    // "Discount applied" line instead of a silent gap. Storing the amount on
    // the booking row is a migration and its own item.
    if (booking.applied_promo_code && Number(booking.promo_discount) > 0) {
      rows.push({
        label: `Promo ${booking.applied_promo_code}`,
        qty: 1, lineTotal: -Math.abs(Number(booking.promo_discount)), kind: "discount",
      });
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
      addOnNames: [],
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
