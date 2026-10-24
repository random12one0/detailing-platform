// ROADMAP 97.55 — THE CUSTOMER TICKING THE VEHICLE CHECK-IN BOX. Public, and
// the unguessable booking UUID is the credential, exactly like
// `cancel-booking` and `get-booking-receipt`.
//
// The tick is a timestamp, not a flag: `damage_ack_at` is null until the
// customer presses, and the FIRST press wins. A retry (a double tap, a
// reopened link) answers `duplicate: true` with the stored time rather than
// moving it, the same shape as `accept-quote`'s already-accepted answer.
//
// Cancelled bookings are refused: there is no job arriving to check in.
// So is a booking with NO damage photo yet: the check-in is the detailer
// recording the car's existing marks, and until one is recorded there is
// nothing to acknowledge (finish review 2026-10-24). The tick saves HOW MANY
// damage photos it covered in `damage_ack_photo_count`, so a photo added
// afterwards is never read as something the customer confirmed.
// Nothing is emailed; the detailer sees the time on the job record.
//
// Input: { booking_id }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { ipOf, LIMITS, withinLimits } from "../_shared/rateLimit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    // ROADMAP 14.12 - the same blunt per-IP ceiling the other public
    // endpoints already carry. This one writes a timestamp a script could
    // spam, so the risk here is a write a script can repeat rather than a
    // read it can scrape.
    if (!await withinLimits(supabase, [{ ...LIMITS.publicCeiling, bucket: "acknowledge-checkin", key: ipOf(req) }])) {
      return json({ success: false, error: "too_many_requests" }, 429);
    }

    const { booking_id } = await req.json();
    if (!booking_id || typeof booking_id !== "string") {
      return json({ error: "booking_id is required" }, 400);
    }

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, status, damage_ack_at")
      .eq("id", booking_id.trim())
      .is("deleted_at", null)
      .maybeSingle();
    if (!booking) return json({ error: "not_found" }, 404);
    // An already-ticked box is not ticked twice: the first time is the
    // record, and the retry learns it rather than moving it.
    if (booking.damage_ack_at) {
      return json({ success: true, duplicate: true, damage_ack_at: booking.damage_ack_at });
    }
    if (booking.status === "cancelled") {
      return json({ error: "This booking is cancelled, so there is nothing to check in." }, 409);
    }

    const { count, error: countError } = await supabase
      .from("job_photos")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", booking.id)
      .eq("kind", "damage");
    if (countError) throw countError;
    if (!count) {
      return json({ error: "Nothing has been recorded for this check-in yet." }, 409);
    }

    const { data: acked, error } = await supabase
      .from("bookings")
      .update({ damage_ack_at: new Date().toISOString(), damage_ack_photo_count: count })
      .eq("id", booking.id)
      // Only from the unticked state the read above saw: two presses at
      // once land one timestamp, and only that one answers as new.
      .is("damage_ack_at", null)
      .select("damage_ack_at, damage_ack_photo_count")
      .maybeSingle();
    if (error) throw error;
    if (!acked) {
      const { data: reread } = await supabase
        .from("bookings")
        .select("damage_ack_at")
        .eq("id", booking.id)
        .maybeSingle();
      return json({ success: true, duplicate: true, damage_ack_at: reread?.damage_ack_at ?? null });
    }
    return json({ success: true, damage_ack_at: acked.damage_ack_at, damage_ack_photo_count: acked.damage_ack_photo_count });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
