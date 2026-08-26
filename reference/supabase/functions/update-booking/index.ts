import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { sendOwnerPush } from "../_shared/ownerPush.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Fields an admin may edit on a booking. An ALLOWLIST on purpose: the payload
// is never spread onto the row, so a caller can't set final_amount,
// payment_status, finalized_at, campaign_id, or any other field that is owned
// by a different flow (finalize-payment, campaign attribution, the reminder
// sweep's sent-markers).
const EDITABLE_FIELDS = [
  "status",
  "admin_notes",
  "customer_name",
  "customer_phone",
  "customer_email",
  "customer_address",
  "booking_date",
  "start_time",
  "end_time",
  "service_type",
  "vehicle_size",
  "vehicle_model",
  "customer_notes",
  "has_water_electric",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // --- Admin gate --------------------------------------------------------
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("id")
      .eq("id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (!adminRow) return json({ error: "Forbidden" }, 403);

    // --- Payload -----------------------------------------------------------
    const body = await req.json();
    const { booking_id, add_ons, soft_delete } = body;
    if (!booking_id) return json({ error: "Booking ID is required" }, 400);

    // --- Soft delete -------------------------------------------------------
    // Bookings are never hard-deleted: revenue history, invoices, and line
    // items hang off them. Setting deleted_at hides the row from every admin
    // view while keeping it recoverable.
    if (soft_delete === true) {
      const { data: deleted, error: delErr } = await supabase
        .from("bookings")
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", booking_id)
        .select()
        .single();
      if (delErr) throw delErr;
      return json({ success: true, booking: deleted, message: "Booking deleted" }, 200);
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    // --- Validate a rescheduled booking against everything else ------------
    // Admin edits used to write straight to the table from the client, so a
    // typo could put a job on top of another one. If this edit moves the
    // booking in time, re-check it against the other bookings that day.
    let conflict: any = null;
    if (updateData.booking_date || updateData.start_time || updateData.end_time) {
      const { data: current } = await supabase
        .from("bookings")
        .select("booking_date, start_time, end_time")
        .eq("id", booking_id)
        .single();

      const nextDate = (updateData.booking_date ?? current?.booking_date) as string;
      const nextStart = (updateData.start_time ?? current?.start_time) as string;
      const nextEnd = (updateData.end_time ?? current?.end_time) as string;

      if (nextDate && nextStart && nextEnd) {
        const { data: sameDay } = await supabase
          .from("bookings")
          .select("id, customer_name, start_time, end_time")
          .eq("booking_date", nextDate)
          .neq("status", "cancelled")
          .is("deleted_at", null)
          .neq("id", booking_id);

        const hm = (t: string) => String(t).slice(0, 5);
        const found = (sameDay || []).find(
          (b: any) => hm(nextStart) < hm(b.end_time) && hm(b.start_time) < hm(nextEnd),
        );
        // Warn rather than reject: the owner sometimes double-books deliberately
        // (two cars at one address, a helper on site). The response carries the
        // conflict so the admin UI can surface it.
        if (found) {
          conflict = {
            id: found.id,
            customer_name: found.customer_name,
            start_time: found.start_time,
            end_time: found.end_time,
          };
        }
      }
    }

    const { data, error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", booking_id)
      .select()
      .single();
    if (error) throw error;

    await replaceAddOns(supabase, booking_id, add_ons);
    await pushUpdate(data, body.status);

    return json({
      success: true,
      booking: data,
      conflict,
      message: conflict
        ? "Booking updated, but it now overlaps another job that day."
        : "Booking updated successfully",
    }, 200);
  } catch (error: any) {
    return json({ success: false, error: error?.message || "internal_error" }, 400);
  }
});

// Replace the booking's add-ons when a new set is provided. Previously the
// admin screens dropped `add_ons` on the floor, so editing them silently did
// nothing; routing every edit through here fixes that.
async function replaceAddOns(supabase: any, booking_id: string, add_ons: unknown) {
  if (!Array.isArray(add_ons)) return;
  const { error: deleteError } = await supabase
    .from("booking_add_ons")
    .delete()
    .eq("booking_id", booking_id);
  if (deleteError) throw deleteError;

  if (add_ons.length > 0) {
    const addOnRows = (add_ons as number[]).map((add_on_id) => ({ booking_id, add_on_id }));
    const { error: addOnError } = await supabase.from("booking_add_ons").insert(addOnRows);
    if (addOnError) throw addOnError;
  }
}

// Push notification — best-effort, never fails the update response.
async function pushUpdate(data: any, status?: string) {
  try {
    await sendOwnerPush({
      title: "Booking updated",
      body: `${data.customer_name}${status ? ` — status: ${status}` : ""}`,
      url: `/admin/job/${data.id}`,
      tag: `booking-${data.id}`,
    });
  } catch (pushError) {
    console.error("Owner push send error:", pushError);
  }
}
