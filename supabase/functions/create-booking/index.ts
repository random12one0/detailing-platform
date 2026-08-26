// The authoritative booking gate. Independently re-checks every rule that
// available-slots used for display (the double-validation pattern), ignores
// every client-supplied price, and re-runs the shared pricing engine. Even
// if all of this were bypassed, the DB's exclusion constraint still rejects
// an overlapping insert — that error is translated to a friendly 409.
//
// Serves BOTH the public widget and the admin dashboard: an admin request
// carries a JWT (verified against business_users) and may set admin_notes,
// but goes through the SAME validation as a customer.
//
// Input: { business_slug, customer_name, customer_phone, customer_email?,
//          customer_address?, service_type, vehicle_size, vehicle_model?,
//          service_ids[], add_ons[], booking_date, start_time,
//          has_water_electric?, customer_notes?, applied_promo_code?,
//          visitor_id?, campaign_slug?, admin_notes? (members only) }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { businessBySlug, getSettings, requireMember } from "../_shared/tenant.ts";
import { computeQuote, resolveAddOns, resolvePromo, resolveServices, sizeAdjustmentFor } from "../_shared/pricing.ts";
import { validateSlot } from "../_shared/slotValidation.ts";
import { buildBrand, sendTenantEmail } from "../_shared/email.ts";
import { customerConfirmationEmail, ownerNewBookingEmail } from "../_shared/emailTemplates.ts";
import { receiptUrl } from "../_shared/config.ts";
import { sendOwnerPush } from "../_shared/ownerPush.ts";
import { timeStrIn } from "../_shared/tz.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json();
    const business = await businessBySlug(body.business_slug);
    if (!business) return json({ error: "unknown_business" }, 404);
    const settings = await getSettings(business.id);

    // Admin caller? Verified against business_users for THIS business; a
    // stray JWT from some other business's staff gets no admin powers here.
    const member = await requireMember(req, business.id);

    // --- Required fields ---------------------------------------------------
    if (!body.customer_name?.trim()) return json({ error: "Customer name is required" }, 400);
    if (!body.customer_phone?.trim()) return json({ error: "Customer phone is required" }, 400);
    if (!body.booking_date) return json({ error: "Booking date is required" }, 400);
    if (!body.start_time) return json({ error: "Start time is required" }, 400);
    const serviceType = body.service_type === "dropoff" ? "dropoff" : "mobile";
    const serviceIds: string[] = Array.isArray(body.service_ids) ? body.service_ids : [];
    const addOnIds: string[] = Array.isArray(body.add_ons) ? body.add_ons : [];
    if (serviceIds.length === 0) return json({ error: "At least one service must be selected" }, 400);
    // Public bookings need an email for the confirmation; an admin logging a
    // phone booking may omit it.
    if (!member && !body.customer_email?.trim()) return json({ error: "Customer email is required" }, 400);

    // --- Resolve catalog + price server-side (client prices are ignored) ---
    let services, addOns;
    try {
      [services, addOns] = await Promise.all([
        resolveServices(supabase, business.id, serviceIds),
        resolveAddOns(supabase, business.id, addOnIds),
      ]);
    } catch (_e) {
      return json({ error: "Invalid service or add-on selection" }, 400);
    }

    const promoCode = body.applied_promo_code || null;
    const promo = await resolvePromo(supabase, business.id, promoCode);
    if (promoCode && !promo) return json({ error: "That promo code is not valid." }, 409);

    const vehicleSize = String(body.vehicle_size || "small").toLowerCase();
    const quote = computeQuote({
      services,
      addOns,
      vehicleSize,
      siteDiscountPercent: settings.site_discount_active ? Number(settings.site_discount_percent) : 0,
      promo: promo ? { type: promo.type, value: promo.value } : null,
      roundingNearest: Number(settings.price_rounding_nearest),
    });

    // --- The authoritative slot gate ---------------------------------------
    const check = await validateSlot({
      business,
      settings,
      bookingDate: String(body.booking_date),
      startTime: String(body.start_time),
      durationMinutes: quote.totalDurationMinutes,
      serviceType,
    });
    if (!check.ok) return json({ error: check.error }, check.status ?? 409);

    // Per-person promo limit (authoritative — the widget's early check is
    // advisory only).
    if (promo?.once_per_customer) {
      const email = String(body.customer_email || "").trim();
      const phone = String(body.customer_phone).trim();
      const [byEmail, byPhone] = await Promise.all([
        email
          ? supabase.from("bookings").select("id").eq("business_id", business.id).eq("applied_promo_code", promo.code).ilike("customer_email", email).limit(1)
          : Promise.resolve({ data: [] }),
        supabase.from("bookings").select("id").eq("business_id", business.id).eq("applied_promo_code", promo.code).eq("customer_phone", phone).limit(1),
      ]);
      if (byEmail.data?.length || byPhone.data?.length) {
        return json(
          { error: `The code ${promo.code} is limited to one use per customer, and it looks like you've already used it.` },
          409,
        );
      }
    }

    // Campaign attribution — resolved from the slug server-side, scoped to
    // this business, best-effort.
    let campaignId: string | null = null;
    if (body.campaign_slug) {
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("id")
        .eq("business_id", business.id)
        .eq("slug", String(body.campaign_slug).trim().toLowerCase())
        .eq("is_active", true)
        .maybeSingle();
      if (campaign) campaignId = campaign.id;
    }

    // Customer upsert, scoped to this business by phone.
    let customerId: string | null = null;
    {
      const phone = String(body.customer_phone).trim();
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("business_id", business.id)
        .eq("phone", phone)
        .maybeSingle();
      if (existing) {
        customerId = existing.id;
      } else {
        const { data: created } = await supabase
          .from("customers")
          .insert({
            business_id: business.id,
            name: String(body.customer_name).trim(),
            email: body.customer_email?.trim() || null,
            phone,
            address: body.customer_address?.trim() || null,
          })
          .select("id")
          .single();
        customerId = created?.id ?? null;
      }
    }

    // --- Insert. The exclusion constraint is the final, unbeatable guard. --
    const { data: booking, error: insertErr } = await supabase
      .from("bookings")
      .insert({
        business_id: business.id,
        customer_id: customerId,
        customer_name: String(body.customer_name).trim(),
        customer_phone: String(body.customer_phone).trim(),
        customer_email: body.customer_email?.trim() || null,
        customer_address: body.customer_address?.trim() || null,
        start_at: check.startAt!.toISOString(),
        end_at: check.endAt!.toISOString(),
        service_type: serviceType,
        vehicle_size: ["small", "medium", "large"].includes(vehicleSize) ? vehicleSize : "small",
        vehicle_size_fee: quote.sizeAdd,
        vehicle_model: body.vehicle_model?.trim() || null,
        has_water_electric: body.has_water_electric === true,
        customer_notes: body.customer_notes?.trim() || null,
        admin_notes: member ? body.admin_notes?.trim() || null : null,
        subtotal: quote.subtotalAfterSite,
        total_price: quote.total,
        applied_promo_code: promo ? promo.code : null,
        promo_discount: quote.promoDiscount,
        campaign_id: campaignId,
        status: "confirmed",
      })
      .select()
      .single();

    if (insertErr) {
      if (insertErr.code === "23P01") {
        return json({ error: "That time was just taken by another booking. Please choose a different time." }, 409);
      }
      console.error("Booking insert failed:", insertErr);
      return json({ error: insertErr.message }, 500);
    }

    // Children: chosen services (price/duration snapshotted) + add-ons.
    await supabase.from("booking_services").insert(
      services.map((s) => ({
        business_id: business.id,
        booking_id: booking.id,
        service_id: s.id,
        name_at_booking: s.name,
        price_at_booking: Number(s.price) + sizeAdjustmentFor(s, vehicleSize).price,
        duration_at_booking: Number(s.duration_minutes) + sizeAdjustmentFor(s, vehicleSize).duration_minutes,
      })),
    );
    if (addOns.length) {
      await supabase.from("booking_add_ons").insert(
        addOns.map((a) => ({ business_id: business.id, booking_id: booking.id, add_on_id: a.id })),
      );
    }

    // Promo usage counter — best-effort, never fails the booking.
    if (promo) {
      const { error: usageErr } = await supabase.rpc("increment_promo_usage", {
        p_business_id: business.id,
        p_code: promo.code,
      });
      if (usageErr) console.error("Failed to increment promo usage:", usageErr);
    }

    // --- Notifications (all best-effort) ------------------------------------
    const tz = business.timezone;
    const brand = await buildBrand(business, settings);
    const emailData = {
      id: booking.id,
      customerName: booking.customer_name,
      customerPhone: booking.customer_phone,
      customerEmail: booking.customer_email,
      customerAddress: booking.customer_address,
      dateStr: String(body.booking_date),
      startTime: timeStrIn(tz, check.startAt!),
      endTime: timeStrIn(tz, check.endAt!),
      serviceType,
      vehicleSize,
      vehicleModel: booking.vehicle_model,
      customerNotes: booking.customer_notes,
      serviceNames: services.map((s) => s.name),
      addOnNames: addOns.map((a) => a.name),
      subtotal: quote.subtotalAfterSite,
      siteDiscount: quote.siteDiscount,
      siteDiscountPercent: settings.site_discount_active ? Number(settings.site_discount_percent) : 0,
      promoCode: promo ? promo.code : null,
      promoDiscount: quote.promoDiscount,
      total: quote.total,
      receiptUrl: receiptUrl(business.slug, booking.id),
    };

    if (booking.customer_email) {
      const msg = customerConfirmationEmail(brand, emailData);
      await sendTenantEmail({ businessId: business.id, to: booking.customer_email, subject: msg.subject, html: msg.html });
    }
    if (brand.contactEmail) {
      const msg = ownerNewBookingEmail(brand, emailData);
      await sendTenantEmail({ businessId: business.id, to: brand.contactEmail, subject: msg.subject, html: msg.html });
    }
    try {
      await sendOwnerPush(business.id, {
        title: "New booking",
        body: `${booking.customer_name} — ${emailData.dateStr} at ${emailData.startTime} ($${Number(quote.total).toFixed(2)})`,
        url: `/admin/job/${booking.id}`,
        tag: `booking-${booking.id}`,
      });
    } catch (pushErr) {
      console.error("Owner push send error:", pushErr);
    }

    return json({
      success: true,
      booking: {
        id: booking.id,
        booking_date: emailData.dateStr,
        start_time: emailData.startTime,
        end_time: emailData.endTime,
        total_price: quote.total,
        receipt_url: emailData.receiptUrl,
      },
    });
  } catch (err) {
    console.error("create-booking error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
