// Admin edit of a booking — the ONE write path for dashboard changes.
// Field allowlist (never spread the payload onto the row); date/time moves
// are re-validated through the same authoritative slot gate as customer
// bookings; soft delete only.
//
// Input: { business_id?, booking_id, soft_delete?, add_ons?, ...allowlisted
//          fields; booking_date/start_time as business-local values }
//
// ---------------------------------------------------------------------------
// AND IT TELLS THE CUSTOMER, WHICH UNTIL 2026-09-20 IT DID NOT — ROADMAP 3.4
// ---------------------------------------------------------------------------
// This file's own first line calls it the ONE write path for dashboard
// changes. It imported no email template and called no sender: a detailer who
// cancelled a job from the dashboard, or moved it to another day, told the
// customer **nothing at all**. The customer's last word on the subject stayed
// their confirmation email saying the appointment was on.
//
// **BOTH EMAILS ALREADY EXISTED AND BOTH WERE ALREADY GOOD.** They were
// reachable from exactly one direction — `cancel-booking` and
// `reschedule-booking`, the two endpoints the CUSTOMER drives from their own
// link. When the BUSINESS did the same thing, silence. `BookingDetail.jsx`
// even names this path in a comment (*"the detailer's own 'Cancel the job'
// button just below (`update-booking` with `status: \"cancelled\"`)"*) and
// notes that two of the three cancellation paths send no OWNER email; nobody
// noticed the CUSTOMER got nothing on this one either.
//
// **THE CUSTOMER ONLY, NEVER THE OWNER.** The two sibling endpoints send an
// owner copy because a customer acted and the detailer needs telling. Here the
// detailer IS the actor — they pressed the button a second ago and are looking
// at the result. Mailing somebody a report of what they just did is how a
// product teaches people to filter its mail.
//
// **DECIDED FROM THE ROW, NOT FROM THE PAYLOAD.** `status: "cancelled"` sent
// twice must email once, and a save that touches neither the status nor the
// time must email not at all — so both questions are asked as "what is
// different about this row now", which is the only form that survives a
// screen deciding to re-send a field it did not change.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { servicesForBooking } from "../_shared/pricing.ts";
import { businessById, getSettings, requireMember } from "../_shared/tenant.ts";
import { validateSlot } from "../_shared/slotValidation.ts";
import { sendOwnerPush } from "../_shared/ownerPush.ts";
import { recordActions } from "../_shared/actionLog.ts";
import { buildBrand, extraVehiclesFor, sendTenantEmail } from "../_shared/email.ts";
import { cancellationEmail, rescheduleEmail, restoredEmail } from "../_shared/emailTemplates.ts";
import { refundOwed } from "../_shared/connect.ts";
import { receiptUrl } from "../_shared/config.ts";
import { siteFor } from "../_shared/tenantSite.ts";
import { dateStrIn, timeStrIn } from "../_shared/tz.ts";

const EDITABLE_FIELDS = [
  "status",
  "admin_notes",
  "customer_name",
  "customer_phone",
  "customer_email",
  "customer_address",
  "service_type",
  "vehicle_size",
  "vehicle_model",
  "vehicle_condition",
  "customer_notes",
  "has_water_electric",
  "has_water",
  "has_power",
  "final_amount",
  "payment_status",
  "payment_notes",
  "finalized_at",
  // ROADMAP 8.19 — the mileage log. It rides this list rather than getting an
  // endpoint of its own because it is a field ON a booking, edited from the
  // same modal that finalises one, and every booking write in the product
  // already goes through here.
  "miles",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json();
    const member = await requireMember(req, body.business_id ?? null);
    if (!member) return json({ error: "Unauthorized" }, 401);

    const bookingId = body.booking_id;
    if (!bookingId) return json({ error: "Booking ID is required" }, 400);

    // The booking must belong to the caller's business — a UUID from another
    // tenant 404s, exactly like a nonexistent one.
    const { data: current } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("business_id", member.businessId)
      .maybeSingle();
    if (!current) return json({ error: "Booking not found" }, 404);

    if (body.soft_delete === true) {
      const { data: deleted, error } = await supabase
        .from("bookings")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", bookingId)
        .eq("business_id", member.businessId)
        .select()
        .single();
      if (error) throw error;
      // ROADMAP 4.1: who deleted it and when. Best-effort and reported, see `_shared/actionLog.ts`.
      const audited = await recordActions(supabase, member, bookingId, current, deleted);
      return json({ success: true, booking: deleted, message: "Booking deleted", ...(audited ? {} : { audit_recorded: false }) });
    }

    const updateData: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    // ROADMAP 97.24 — A DECLINED REQUEST IS NOT UN-CANCELLED HERE. A decline is
    // stored as `cancelled` plus `declined_at`, so "Un-cancel" used to confirm
    // it with `declined_at` still set and the customer still holding "we can't
    // make that one". Taking it after all is `respond-to-booking`'s accept: it
    // clears `declined_at` and sends the "You're confirmed" email.
    if (updateData.status !== undefined && updateData.status !== current.status
      && current.status === "cancelled" && current.declined_at) {
      return json({
        error: "You declined this request. To take it after all, press \"Accept it after all\" so the customer is told.",
        code: "declined_request",
      }, 409);
    }

    // W9 — MOVING THE SIZE MOVES ITS SNAPSHOT WITH IT. `vehicle_size_label`
    // is the human label frozen at booking time so a detailer who renames or
    // deletes a size cannot rewrite the record of jobs already done; a size
    // changed here without it would leave the invoice printing the OLD name
    // for the NEW size, which is worse than either. No screen sends
    // vehicle_size today — this exists so that the day one does, the pair
    // cannot come apart.
    if (updateData.vehicle_size !== undefined) {
      const settings = await getSettings(member.businessId);
      const sizes = Array.isArray(settings.vehicle_sizes) && settings.vehicle_sizes.length
        ? settings.vehicle_sizes
        : [{ key: "small", label: "Small" }];
      const want = String(updateData.vehicle_size).toLowerCase();
      const size = sizes.find((v) => String(v.key).toLowerCase() === want);
      if (!size) return json({ error: "That is not one of your vehicle sizes." }, 400);
      updateData.vehicle_size = size.key;
      updateData.vehicle_size_label = String(size.label ?? size.key);
    }

    // A date/time move is re-validated like any customer booking (excluding
    // the booking being moved). The old system only warned on conflicts; the
    // DB exclusion constraint now makes a hard overlap impossible, so this
    // returns a clear 409 instead.
    const business = (await businessById(member.businessId))!;
    const tz = business.timezone;
    // ROADMAP 97.17 — ONLY A REAL MOVE IS RE-CHECKED. The edit form sends the
    // date and time back on every save, so re-checking an unmoved job refused a
    // phone-number fix on any job that later fell inside an away stretch or a
    // blockout. A job staying where it is already holds its slot.
    const curDur = Math.round((new Date(current.end_at).getTime() - new Date(current.start_at).getTime()) / 60_000);
    const askDate = String(body.booking_date || dateStrIn(tz, new Date(current.start_at)));
    const askTime = String(body.start_time || timeStrIn(tz, new Date(current.start_at)));
    const askDur = Number(body.duration_minutes) || curDur;
    const askType = String(body.service_type || current.service_type);
    const unmoved = askDate === dateStrIn(tz, new Date(current.start_at))
      && askTime.slice(0, 5) === timeStrIn(tz, new Date(current.start_at))
      && askDur === curDur && askType === current.service_type;
    if ((body.booking_date || body.start_time) && !unmoved) {
      const settings = await getSettings(member.businessId);
      const durationMinutes = askDur;
      const check = await validateSlot({
        business,
        settings,
        bookingDate: askDate,
        startTime: askTime,
        durationMinutes,
        serviceType: askType,
        excludeBookingId: bookingId,
        // Roadmap 2.8c — same reason as reschedule: this path moves a date,
        // and two of the new rules are about the date and the service type.
        services: await servicesForBooking(supabase, member.businessId, bookingId),
      });
      if (!check.ok) return json({ error: check.error }, check.status ?? 409);
      updateData.start_at = check.startAt!.toISOString();
      updateData.end_at = check.endAt!.toISOString();
    }

    // ROADMAP 6.4 — A STATUS CHANGE OR A MOVE IS WRITTEN ONLY FROM THE STATE
    // IT WAS READ IN. Two presses of Cancel on a bad connection both read
    // `confirmed`; without this both wrote, both counted as "just cancelled"
    // and the customer got two cancellation emails. Every other field is a
    // plain value and repeats harmlessly, so it is not fenced.
    let write = supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId)
      .eq("business_id", member.businessId);
    if (updateData.status !== undefined && updateData.status !== current.status) {
      write = write.eq("status", current.status);
    }
    const moving = updateData.start_at !== undefined
      && new Date(updateData.start_at as string).getTime() !== new Date(current.start_at).getTime();
    if (moving) write = write.eq("start_at", current.start_at);
    const { data, error } = await write.select().maybeSingle();
    if (error) {
      if (error.code === "23P01") {
        return json({ error: "That time overlaps another booking." }, 409);
      }
      throw error;
    }
    if (!data) {
      // The other press got there first. If it left the booking where this
      // one asked for, this one has nothing left to do and says so.
      const { data: now } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
      const same = now
        && (updateData.status === undefined || now.status === updateData.status)
        && (updateData.start_at === undefined
          || new Date(now.start_at).getTime() === new Date(updateData.start_at as string).getTime());
      if (same) return json({ success: true, duplicate: true, booking: now, message: "Booking updated successfully" });
      return json({ error: "This booking was just changed on another device. Reload it and try again." }, 409);
    }

    // ROADMAP 4.1: a status, payment-status or delete change leaves a row saying who, from what and to what.
    // Written from the row's before and after, so a duplicate press (handled above) writes nothing twice.
    const audited = await recordActions(supabase, member, bookingId, current, data);

    // Replace add-ons when a new set is provided.
    if (Array.isArray(body.add_ons)) {
      await supabase.from("booking_add_ons").delete().eq("booking_id", bookingId).eq("business_id", member.businessId);
      if (body.add_ons.length > 0) {
        const { error: addErr } = await supabase.from("booking_add_ons").insert(
          body.add_ons.map((add_on_id: string) => ({
            business_id: member.businessId,
            booking_id: bookingId,
            add_on_id,
          })),
        );
        if (addErr) throw addErr;
      }
    }

    // -----------------------------------------------------------------------
    // TELL THE CUSTOMER — roadmap 3.4, see this file's header.
    // -----------------------------------------------------------------------
    // Both questions are asked of the ROW's before and after, never of the
    // payload, so a screen re-sending an unchanged field cannot send a second
    // email and a screen omitting one cannot suppress a real change.
    const justCancelled = String(data.status) === "cancelled"
      && String(current.status) !== "cancelled";
    // `updateData.start_at` is only set when the slot gate above re-validated a
    // move, and it is already an ISO string; `current.start_at` arrives from
    // Postgres in its own spelling, so both go through `Date` before they are
    // compared. A "move" to the same instant is not a move.
    const movedTo = updateData.start_at as string | undefined;
    const justMoved = !!movedTo
      && movedTo !== new Date(current.start_at).toISOString()
      // A CANCELLED JOB'S NEW TIME IS NOT NEWS. If one call does both, the
      // cancellation is the only true thing left to say.
      && String(data.status) !== "cancelled";
    // ROADMAP 97.24 — UN-CANCELLED IS NEWS TOO. The customer's last email said
    // cancelled; without this their next one was the reminder's "See you soon".
    const justRestored = String(current.status) === "cancelled"
      && String(data.status) === "confirmed";

    if ((justCancelled || justMoved || justRestored) && data.customer_email) {
      // Read from `data` rather than `current`: name, email, address and
      // vehicle are all editable in the same call, and the email must describe
      // the booking as it now stands.
      const settings = await getSettings(member.businessId);
      const brand = await buildBrand(business, settings);
      const emailData = {
        id: data.id,
        // ROADMAP 8.17 STAGE 2A — the language this customer chose. Absent
        // means English, which is what every booking predating the column was.
        lang: data.lang,
        customerName: data.customer_name,
        customerPhone: data.customer_phone,
        customerEmail: data.customer_email,
        customerAddress: data.customer_address,
        dateStr: dateStrIn(tz, new Date(data.start_at)),
        startTime: timeStrIn(tz, new Date(data.start_at)),
        endTime: timeStrIn(tz, new Date(data.end_at)),
        serviceType: data.service_type,
        travelFee: Number(data.travel_fee) || 0,
        travelZone: data.travel_zone,
        adjustments: data.price_adjustments ?? [],
        vehicleSize: data.vehicle_size_label || data.vehicle_size,
        // ROADMAP 8.10 — the other cars on this same visit, or an empty list.
        extraVehicles: await extraVehiclesFor(data.id),
        vehicleModel: data.vehicle_model,
        customerNotes: data.customer_notes,
        serviceNames: [],
        addOnNames: [],
        subtotal: Number(data.subtotal),
        siteDiscount: 0,
        siteDiscountPercent: 0,
        promoCode: data.applied_promo_code,
        promoDiscount: Number(data.promo_discount) || 0,
        total: Number(data.total_price),
        receiptUrl: receiptUrl(await siteFor(supabase, business.id), data.id),
        // `refundNote` is owner-facing and the owner gets no copy here, so the
        // customer's half of `cancellationEmail` never reads it.
        //
        // ROADMAP 3.4 FOLLOW-UP — `refundOwed` IS READ HERE, THOUGH. This is
        // the "Cancel the job" button on the detailer's own dashboard, the
        // third path `_shared/connect.ts` names as writing `status:
        // "cancelled"` with no refund question asked. `cancel-booking`
        // already asked it for the customer's own cancel link; this call was
        // the one still silent about a paid job the DETAILER cancelled.
        // Computed only for a cancellation — a reschedule has no refund
        // question, and `rescheduleEmail` does not read this field.
        refundOwed: justCancelled ? refundOwed(data).owed : false,
      };
      // Back on beats a move made in the same save: it states the time the
      // booking is back on for, and "your booking has moved" would be news
      // about a booking the customer believes is cancelled.
      const msg = justCancelled
        ? cancellationEmail(brand, emailData, false)
        : justRestored
        ? restoredEmail(brand, emailData)
        : rescheduleEmail(
          brand,
          emailData,
          dateStrIn(tz, new Date(current.start_at)),
          timeStrIn(tz, new Date(current.start_at)),
          false,
        );
      // Best-effort by construction: `sendTenantEmail` catches its own errors
      // and returns a boolean, so a dead relay can never fail a write that has
      // already happened.
      await sendTenantEmail({ bookingId: bookingId,
        businessId: business.id,
        to: data.customer_email,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      });
    }

    try {
      await sendOwnerPush(member.businessId, {
        title: "Booking updated",
        body: `${data.customer_name}${body.status ? ` · status: ${body.status}` : ""}`,
        url: `/job/${data.id}`,
        tag: `booking-${data.id}`,
      });
    } catch (pushErr) {
      console.error("Owner push send error:", pushErr);
    }

    return json({ success: true, booking: data, message: "Booking updated successfully", ...(audited ? {} : { audit_recorded: false }) });
  } catch (error) {
    return json({ success: false, error: (error as Error)?.message || "internal_error" }, 400);
  }
});
