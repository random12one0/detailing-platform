// Admin edit of a booking — the ONE write path for dashboard changes.
// Field allowlist (never spread the payload onto the row); date/time moves
// are re-validated through the same authoritative slot gate as customer
// bookings; soft delete only.
//
// Input: { business_id?, booking_id, soft_delete?, add_ons?, ...allowlisted
//          fields; booking_date/start_time as business-local values }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { businessById, getSettings, requireMember } from "../_shared/tenant.ts";
import { validateSlot } from "../_shared/slotValidation.ts";
import { sendOwnerPush } from "../_shared/ownerPush.ts";
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
      return json({ success: true, booking: deleted, message: "Booking deleted" });
    }

    const updateData: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
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
    if (body.booking_date || body.start_time) {
      const settings = await getSettings(member.businessId);
      const durationMinutes = Number(body.duration_minutes) ||
        Math.round((new Date(current.end_at).getTime() - new Date(current.start_at).getTime()) / 60_000);
      const check = await validateSlot({
        business,
        settings,
        bookingDate: String(body.booking_date || dateStrIn(tz, new Date(current.start_at))),
        startTime: String(body.start_time || timeStrIn(tz, new Date(current.start_at))),
        durationMinutes,
        serviceType: String(body.service_type || current.service_type),
        excludeBookingId: bookingId,
      });
      if (!check.ok) return json({ error: check.error }, check.status ?? 409);
      updateData.start_at = check.startAt!.toISOString();
      updateData.end_at = check.endAt!.toISOString();
    }

    const { data, error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId)
      .eq("business_id", member.businessId)
      .select()
      .single();
    if (error) {
      if (error.code === "23P01") {
        return json({ error: "That time overlaps another booking." }, 409);
      }
      throw error;
    }

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

    try {
      await sendOwnerPush(member.businessId, {
        title: "Booking updated",
        body: `${data.customer_name}${body.status ? ` — status: ${body.status}` : ""}`,
        url: `/admin/job/${data.id}`,
        tag: `booking-${data.id}`,
      });
    } catch (pushErr) {
      console.error("Owner push send error:", pushErr);
    }

    return json({ success: true, booking: data, message: "Booking updated successfully" });
  } catch (error) {
    return json({ success: false, error: (error as Error)?.message || "internal_error" }, 400);
  }
});
