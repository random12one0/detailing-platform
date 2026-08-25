import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

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
    // This endpoint mutates bookings, so the caller must be a signed-in admin.
    // verify_jwt only proves the token is a valid project JWT (the public anon
    // key qualifies); we additionally resolve it to a user and require an active
    // row in admin_users.
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
    const { booking_id, status, admin_notes, add_ons } = await req.json();
    if (!booking_id) return json({ error: "Booking ID is required" }, 400);

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) updateData.status = status;
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes;

    const { data, error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", booking_id)
      .select()
      .single();
    if (error) throw error;

    // Replace the booking's add-ons when a new set is provided.
    if (Array.isArray(add_ons)) {
      const { error: deleteError } = await supabase
        .from("booking_add_ons")
        .delete()
        .eq("booking_id", booking_id);
      if (deleteError) return json({ error: deleteError.message }, 500);

      if (add_ons.length > 0) {
        const addOnRows = add_ons.map((add_on_id: number) => ({ booking_id, add_on_id }));
        const { error: addOnError } = await supabase.from("booking_add_ons").insert(addOnRows);
        if (addOnError) return json({ error: addOnError.message }, 500);
      }
    }

    // Note: the post-service "thank you" / review-request email used to send
    // here on status === "completed". It now fires from send-invoice instead,
    // alongside the invoice, at Finalize-payment time — see send-invoice.

    return json({ success: true, booking: data, message: "Booking updated successfully" }, 200);
  } catch (error: any) {
    return json({ success: false, error: error?.message || "internal_error" }, 400);
  }
});
