// Admin-gated: stores (or refreshes) the calling admin's Web Push
// subscription so owner-send-push and the reminder cron can reach this
// device. One row per browser subscription (endpoint is unique).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const { subscription } = await req.json();
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;
    if (!endpoint || !p256dh || !auth) return json({ error: "Invalid push subscription" }, 400);

    const { error } = await supabase.from("owner_push_subscriptions").upsert(
      {
        admin_user_id: user.id,
        endpoint,
        p256dh,
        auth,
        user_agent: req.headers.get("user-agent") || null,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw error;

    return json({ success: true });
  } catch (error: any) {
    return json({ success: false, error: error?.message || "internal_error" }, 400);
  }
});
