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
//          has_water_electric?, has_water?, has_power?, vehicle_condition?,
//          customer_notes?, applied_promo_code?,
//          visitor_id?, campaign_slug?, admin_notes? (members only) }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { businessBySlug, getSettings, requireMember } from "../_shared/tenant.ts";
import {
  computeQuote, matchPriceRules, planInputFor, resolveAddOns, resolvePlan,
  resolvePromo, resolveServices, resolveTravel, sizeAdjustmentFor, whenContextFor,
} from "../_shared/pricing.ts";
import { validateSlot } from "../_shared/slotValidation.ts";
import { buildBrand, ownerRecipients, sendTenantEmail } from "../_shared/email.ts";
import { customerConfirmationEmail, ownerNewBookingEmail } from "../_shared/emailTemplates.ts";
import { receiptUrl } from "../_shared/config.ts";
import { siteFor } from "../_shared/tenantSite.ts";
import { vcardAttachment } from "../_shared/vcard.ts";
import { sendOwnerPush } from "../_shared/ownerPush.ts";
import { localDateTimeToInstant, timeStrIn, weekdayOf } from "../_shared/tz.ts";

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

    // W25 — THE CATEGORY CAP, ENFORCED HERE. The booking page applies the same
    // rule as a courtesy (picking a second service in a "choose one" category
    // swaps the first out), but this is the copy that holds: a stale tab, a
    // second window or a hand-made request all arrive here, and roadmap 2.7's
    // W4 found a live hole of exactly that shape — a restriction the customer
    // could read on the page and book straight past.
    const groupIds = [...new Set(services.map((s) => s.group_id).filter(Boolean))] as string[];
    if (groupIds.length) {
      const { data: groups } = await supabase
        .from("service_groups")
        .select("id, name, max_select, is_exclusive")
        .eq("business_id", business.id)
        .in("id", groupIds);
      for (const g of groups ?? []) {
        // ROADMAP 2.8c — the category that IS the whole booking. This is the
        // rule `max_select` could not see: it counts inside ONE category, and
        // a complete package sitting alone in its own category never trips it
        // while the customer also buys the parts from the next category along.
        // Measured on a real menu: $1,645 of work a $625 package contained.
        if (g.is_exclusive && services.some((s) => s.group_id === g.id) && services.length > 1) {
          return json({
            error: `${g.name} is booked on its own — it already includes the rest. `
              + "Please remove the other services, or choose something else.",
          }, 409);
        }
        if (!g.max_select) continue;
        const chosen = services.filter((s) => s.group_id === g.id).length;
        if (chosen > g.max_select) {
          return json({
            error: g.max_select === 1
              ? `Please choose just one service from ${g.name}.`
              : `Please choose no more than ${g.max_select} services from ${g.name}.`,
          }, 409);
        }
      }
    }

    const promoCode = body.applied_promo_code || null;
    const promo = await resolvePromo(supabase, business.id, promoCode);
    if (promoCode && !promo) return json({ error: "That promo code is not valid." }, 409);

    // ROADMAP 2.14 STEP 3 — THE PLAN, RESOLVED HERE AND PRICED BY THE SAME
    // ENGINE. The client sends an id; the name, the kind and the amount all
    // come off this row, so there is no path by which a page can name its own
    // discount. Unlike the promo above, an id that does not resolve is NOT an
    // error — a retired plan should still let somebody book the ordinary way
    // rather than turning a stale tab into a dead end.
    const plan = await resolvePlan(supabase, business.id, body.plan_id);

    // W9 — the size is whatever key the tenant's own list uses, so it is no
    // longer checked against small/medium/large. It still has to BE one of
    // their sizes: an unknown key would price at zero adjustment and print a
    // label nobody recognises on the invoice.
    const sizes = Array.isArray(settings.vehicle_sizes) && settings.vehicle_sizes.length
      ? settings.vehicle_sizes
      : [{ key: "small", label: "Small" }];
    const requested = String(body.vehicle_size || "").toLowerCase();
    const size = sizes.find((v) => String(v.key).toLowerCase() === requested) ?? sizes[0];
    const vehicleSize = String(size.key);
    // ROADMAP 2.8c — travel and the time-based surcharges, resolved through the
    // SAME shared helpers the quote endpoint uses. The customer's own
    // travel_zone is a key, never a price: the fee comes off the business's
    // settings here, exactly like every other number on this path.
    const travel = resolveTravel(settings, serviceType, body.travel_zone);
    const when = whenContextFor(
      business.timezone, body.booking_date, body.start_time,
      localDateTimeToInstant, weekdayOf,
    );
    const adjustments = matchPriceRules(settings.price_rules, when);
    const quote = computeQuote({
      services,
      addOns,
      vehicleSize,
      siteDiscountPercent: settings.site_discount_active ? Number(settings.site_discount_percent) : 0,
      promo: promo ? { type: promo.type, value: promo.value } : null,
      roundingNearest: Number(settings.price_rounding_nearest),
      travelFee: travel.fee,
      adjustments,
      plan: planInputFor(plan),
    });

    // --- The authoritative slot gate ---------------------------------------
    const check = await validateSlot({
      business,
      settings,
      bookingDate: String(body.booking_date),
      startTime: String(body.start_time),
      durationMinutes: quote.totalDurationMinutes,
      serviceType,
      // W22 — the resource answers travel with the request, so the block that
      // depends on them lives at the same junction as every other slot rule.
      // `undefined` when the field is absent, which the guard reads as "this
      // caller is not answering" and skips; an explicit false blocks where the
      // detailer has marked the resource required.
      hasWater: body.has_water === undefined ? undefined : body.has_water === true,
      hasPower: body.has_power === undefined ? undefined : body.has_power === true,
      // Roadmap 2.8c — the chosen services carry their own availability now.
      services,
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

    // ROADMAP 2.14 STEP 3 — A SIGN-UP IS A REQUEST, IN EITHER BOOKING MODE.
    //
    // The research's opening finding is that the sale and the schedule are two
    // acts and nobody joins them: five of the seven sampled detailers set up a
    // new member by TALKING to them. Pressing a plan button is asking to join,
    // and the detailer has to agree — so it arrives on the request rail 2.12
    // already built, even for a business whose ordinary bookings confirm
    // themselves. It is also the honest reading of the price: the plan rate on
    // that quote is only true once somebody agrees they are on the plan.
    //
    // AN EXISTING MEMBER BOOKING THEIR OWN COVERED VISIT IS NOT A SIGN-UP and
    // must not be held up — they joined weeks ago. That is the only reason
    // this asks the question rather than keying off `plan` alone.
    let planSignup = false;
    if (!member && plan && customerId) {
      const { data: already } = await supabase
        .from("plan_members")
        .select("id")
        .eq("business_id", business.id)
        .eq("customer_id", customerId)
        .eq("plan_id", plan.id)
        .eq("status", "active")
        .maybeSingle();
      planSignup = !already;
    } else if (!member && plan) {
      planSignup = true;
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
        vehicle_size: vehicleSize,
        // The SNAPSHOT. A detailer who renames or deletes a size must not
        // corrupt the record of jobs already done — vehicle_size_fee is
        // snapshotted here for the same reason, and booking_services snapshots
        // name, price and duration. Without it, last month's invoice starts
        // printing a key that no longer resolves.
        vehicle_size_label: String(size.label ?? size.key),
        vehicle_size_fee: quote.sizeAdd,
        // SNAPSHOTS, all three. A detailer who edits a travel fee, renames a
        // zone or deletes a surcharge must not rewrite what a past job was
        // sold for — the same rule vehicle_size_label follows.
        travel_fee: quote.travelFee,
        travel_zone: travel.zone,
        price_adjustments: quote.adjustmentLines.length ? quote.adjustmentLines : null,
        vehicle_model: body.vehicle_model?.trim() || null,
        // W27 — information, never arithmetic. The trade prices condition
        // after inspection, so this must not reach computeQuote.
        vehicle_condition: ["light", "moderate", "heavy", "extreme"]
          .includes(String(body.vehicle_condition)) ? String(body.vehicle_condition) : null,
        // W22 — two answers where there was one. Null is "not asked", which is
        // a different fact from "asked and told no". The old single column is
        // still written, because everything already deployed reads it.
        has_water: body.has_water === undefined ? null : body.has_water === true,
        has_power: body.has_power === undefined ? null : body.has_power === true,
        has_water_electric: body.has_water_electric === true
          || (body.has_water === true && body.has_power === true),
        customer_notes: body.customer_notes?.trim() || null,
        admin_notes: member ? body.admin_notes?.trim() || null : null,
        subtotal: quote.subtotalAfterSite,
        total_price: quote.total,
        applied_promo_code: promo ? promo.code : null,
        promo_discount: quote.promoDiscount,
        campaign_id: campaignId,
        // ROADMAP 2.14 step 3. Explicit, so it beats the auto-link trigger:
        // somebody switching plans is booking against the one they PRESSED,
        // not the one they are currently on.
        plan_id: plan ? plan.id : null,
        // ROADMAP 2.12 — THE ONE LINE THE WHOLE MODE SWITCH COMES DOWN TO.
        // `pending` is not `cancelled`, so the exclusion constraint above has
        // already refused anybody else this slot: a request HOLDS the time,
        // exactly like a confirmed booking, and only the promise differs. An
        // admin logging a booking by hand from the dashboard is never a
        // request — they are the person who would be accepting it.
        // `planSignup` above is the second thing that makes a booking a
        // request, and it is mode-independent on purpose.
        status: !member && (settings.booking_mode === "request" || planSignup)
          ? "pending"
          : "confirmed",
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
      vehicleSize: booking.vehicle_size_label || vehicleSize,
      vehicleModel: booking.vehicle_model,
      customerNotes: booking.customer_notes,
      serviceNames: services.map((s) => s.name),
      addOnNames: addOns.map((a) => a.name),
      // Roadmap 2.8c — the subtotal below contains these, so they have to be
      // itemised or the email shows a number nobody can add up.
      travelFee: quote.travelFee,
      travelZone: travel.zone,
      adjustments: quote.adjustmentLines,
      subtotal: quote.subtotalAfterSite,
      siteDiscount: quote.siteDiscount,
      siteDiscountPercent: settings.site_discount_active ? Number(settings.site_discount_percent) : 0,
      promoCode: promo ? promo.code : null,
      promoDiscount: quote.promoDiscount,
      total: quote.total,
      receiptUrl: receiptUrl(await siteFor(supabase, business.id), booking.id),
    };

    const isRequest = booking.status === "pending";

    if (booking.customer_email && settings.email_customer_confirmation) {
      const msg = customerConfirmationEmail(brand, emailData, isRequest);
      await sendTenantEmail({ businessId: business.id, to: booking.customer_email, subject: msg.subject, html: msg.html, text: msg.text });
    }
    if (settings.email_owner_new_booking) {
      const msg = ownerNewBookingEmail(brand, emailData, isRequest);
      // ROADMAP 4.2 — THE CUSTOMER'S CONTACT CARD RIDES THE ALERT. The old
      // site did this and the conversion dropped it. One tap and the customer
      // is in the detailer's phone, which is how this trade actually works;
      // without it they retype a number off an email while standing at a car.
      // Only on the DETAILER's copy, and only where there is something to
      // save — a card with a name and no way to reach them is a contact that
      // wastes the tap.
      const card = (booking.customer_phone || booking.customer_email)
        ? [vcardAttachment({
          name: booking.customer_name,
          phone: booking.customer_phone,
          email: booking.customer_email,
          address: booking.customer_address,
          // Whose customer this is, so a phone book full of them still says.
          org: `${business.name} customer`,
        })]
        : undefined;
      // Every configured recipient, not just one address.
      for (const to of ownerRecipients(business, settings)) {
        await sendTenantEmail({
          businessId: business.id, to, subject: msg.subject, html: msg.html, text: msg.text,
          attachments: card,
        });
      }
    }
    try {
      if (settings.push_enabled) await sendOwnerPush(business.id, {
        title: isRequest ? "Booking request" : "New booking",
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
        // Roadmap 2.12 — the confirmation SCREEN has to make the same promise
        // the confirmation EMAIL just made, and it cannot re-read the setting
        // without a second round trip that could disagree with this one.
        status: booking.status,
      },
    });
  } catch (err) {
    console.error("create-booking error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
