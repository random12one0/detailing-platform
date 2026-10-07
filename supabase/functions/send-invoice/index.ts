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
import { buildBrand, extraVehiclesFor, sendTenantEmail } from "../_shared/email.ts";
import { followupEmail, invoiceEmail, type InvoiceRow } from "../_shared/emailTemplates.ts";
import { cardStatus } from "../_shared/connect.ts";
import { sendOwnerPush } from "../_shared/ownerPush.ts";
import { money } from "../_shared/emailKit.ts";
import { receiptUrl } from "../_shared/config.ts";
import { siteFor } from "../_shared/tenantSite.ts";
import { dateStrIn, timeStrIn } from "../_shared/tz.ts";
// ROADMAP 3.4 findings 4 and 5 — the eight money-column labels this file
// invents are ours rather than the detailer's, so they go through the lookup.
import { T } from "../_shared/i18n.ts";
// ROADMAP 6.4 — a client key, so a repeated press leaves ONE invoice email. See `_shared/sendInvoiceClaim.ts`.
import { claim, type ClaimStore, settleFailed, settleSent } from "../_shared/sendInvoiceClaim.ts";

// The claim store, over `send_invoice_attempts`. Any error but "already there" throws, and `claim` turns a throw
// into `unavailable`, which sends as before (the table is a migration that may not be applied yet).
const claimStore: ClaimStore = {
  async insert(businessId, bookingId, key, nowIso) {
    const { error } = await supabase.from("send_invoice_attempts").insert({
      booking_id: bookingId, idempotency_key: key, business_id: businessId, state: "sending", created_at: nowIso, updated_at: nowIso,
    });
    if (!error) return true;
    if (error.code === "23505") return false;
    throw error;
  },
  async get(bookingId, key) {
    const { data, error } = await supabase.from("send_invoice_attempts").select("state, response, updated_at")
      .eq("booking_id", bookingId).eq("idempotency_key", key).maybeSingle();
    if (error) throw error;
    return data;
  },
  async move(bookingId, key, from, to, nowIso, olderThanIso, response) {
    let q = supabase.from("send_invoice_attempts")
      .update({ state: to, updated_at: nowIso, ...(response ? { response } : {}) })
      .eq("booking_id", bookingId).eq("idempotency_key", key).in("state", from);
    if (olderThanIso) q = q.lt("updated_at", olderThanIso);
    const { data, error } = await q.select("state");
    if (error) throw error;
    return (data ?? []).length > 0;
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  // Set once this call owns a client key, so every way out below can release it.
  let claimedBooking = "", claimedKey = "";

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

    // ROADMAP 6.4 — A REPEAT OF THE SAME PRESS IS ANSWERED, NOT SENT AGAIN. After the checks above, so an unfinalized
    // booking never claims a key, and before anything is built or sent. No key (every existing client) sends as before.
    const attempt = await claim(claimStore, new Date(), member.businessId, booking.id, body.idempotency_key);
    if (attempt.kind === "bad") return json({ error: "idempotency_key must be a UUID" }, 400);
    if (attempt.kind === "duplicate") return json({ success: true, duplicate: true, thank_you_sent: attempt.thankYouSent });
    if (attempt.kind === "busy") return json({ error: "in_progress" }, 409);
    if (attempt.kind === "go") { claimedBooking = booking.id; claimedKey = body.idempotency_key; }
    // A key was sent and the store could not be used: the invoice goes out as it always did, and the answer says
    // nothing was deduped, so a screen can tell.
    const notDeduped = attempt.kind === "unavailable";

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
    // ROADMAP 3.4, findings 4 and 5 — **EIGHT ENGLISH WORDS ON THE MONEY
    // COLUMN OF EVERY SPANISH INVOICE AND RECEIPT, until 2026-09-20.**
    //
    // `invoiceEmail` will never translate these and it is right not to: its
    // comment says *"THE ROW LABELS ARE THE DETAILER'S OWN LINE ITEMS and stay
    // as typed"*, and machine-translating a business's own name for its own
    // work is the one thing this feature must not do. **But these eight are
    // not the detailer's words. They are ours**, written here, prefixed onto
    // whatever the detailer typed — so a Spanish receipt read `Add-on:
    // Limpieza de motor`, half in each language, and the largest line on the
    // page read `Booking total`.
    //
    // The lookup belongs HERE, where the label is invented, rather than in the
    // template where the detailer's own text arrives. `booking.lang` is the
    // same column every other customer-facing send reads.
    const tt = T(booking.lang);
    const CATEGORY_LABELS: Record<string, string> = {
      service: tt("Service"),
      upgrade: tt("Upgrade"),
      add_on: tt("Add-on"),
      custom: tt("Custom charge"),
      travel_fee: tt("Travel / Mobile fee"),
      tip: tt("Tip"),
      discount: tt("Discount"),
    };
    const rows: InvoiceRow[] = [
      { label: tt("Booking total"), qty: 1, lineTotal: Number(booking.total_price) || 0, kind: "charge" },
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
      // ROADMAP 8.17 STAGE 2A — the language this customer chose, from
      // `bookings.lang`. Absent means English, which is what every booking
      // made before that column existed was written in.
      lang: booking.lang,
      customerName: booking.customer_name,
      customerPhone: booking.customer_phone,
      customerEmail: booking.customer_email,
      customerAddress: booking.customer_address,
      dateStr: dateStrIn(tz, new Date(booking.start_at)),
      startTime: timeStrIn(tz, new Date(booking.start_at)),
      endTime: timeStrIn(tz, new Date(booking.end_at)),
      serviceType: booking.service_type,
      vehicleSize: booking.vehicle_size_label || booking.vehicle_size,
      // ROADMAP 8.10 — the other cars on this same visit, or an empty list.
      extraVehicles: await extraVehiclesFor(booking.id),
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
      receiptUrl: receiptUrl(await siteFor(supabase, business.id), booking.id),
    };

    // ROADMAP 2.20 STAGE 3 — WHETHER THIS INVOICE CARRIES A PAY BUTTON, and
    // it is `cardStatus` that answers, not this file. Three things have to be
    // true — an account connected, Stripe happy with it, the detailer having
    // switched card on — and a fourth copy of that test is a fourth chance to
    // put a button in front of somebody that does not work.
    const { data: conn } = await supabase
      .from("connected_accounts")
      .select("stripe_account_id, charges_enabled, card_payments_enabled")
      .eq("business_id", business.id)
      .maybeSingle();
    const cardReady = cardStatus({
      stripe_account_id: conn?.stripe_account_id ?? null,
      stripe_charges_enabled: conn?.charges_enabled ?? false,
      card_payments_enabled: conn?.card_payments_enabled ?? false,
    }).ready;

    const invoice = invoiceEmail(
      brand,
      emailData,
      rows,
      { chargesSubtotal, discountsTotal, tipTotal, totalPaid },
      booking.payment_status,
      booking.payment_notes,
      cardReady,
    );
    const sent = await sendTenantEmail({ bookingId: booking.id,
      businessId: business.id,
      to: booking.customer_email,
      subject: invoice.subject,
      html: invoice.html,
      text: invoice.text,
    });
    if (!sent) {
      if (claimedKey) await settleFailed(claimStore, new Date(), claimedBooking, claimedKey);
      return json({ error: "email_failed" }, 502);
    }

    // Separate thank-you / review-request email — best-effort.
    let thankYouSent = false;
    if (settings.email_customer_followup) try {
      const firstName = String(booking.customer_name || "Customer").split(" ")[0] || "Customer";
      // ROADMAP 8.17 — the same booking's language. This email is the last
      // word on a job somebody booked in Spanish; switching to English for it
      // is the seam a customer notices.
      const followup = followupEmail(brand, firstName, booking.lang);
      thankYouSent = await sendTenantEmail({ bookingId: booking.id,
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
        body: `${booking.customer_name} · ${money(totalPaid)} (invoice + thank-you sent)`,
        url: `/job/${booking.id}`,
        tag: `booking-${booking.id}`,
      });
    } catch (pushErr) {
      console.error("Owner push send error:", pushErr);
    }

    // The invoice is out, so the key is spent. If THIS write is lost the row stays `sending`, and a retry after two
    // minutes could send once more: said in `_shared/sendInvoiceClaim.ts`, and the only way left to see a second one.
    if (claimedKey && !(await settleSent(claimStore, new Date(), claimedBooking, claimedKey, thankYouSent))) {
      console.error("send-invoice: the invoice went out but its key could not be marked sent:", claimedBooking);
    }
    return json({ success: true, thank_you_sent: thankYouSent, ...(notDeduped ? { idempotent: false } : {}) });
  } catch (err) {
    if (claimedKey) await settleFailed(claimStore, new Date(), claimedBooking, claimedKey);
    return json({ error: (err as Error).message }, 500);
  }
});
