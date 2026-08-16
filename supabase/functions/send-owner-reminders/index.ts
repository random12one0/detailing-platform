import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

const hm = (t: string) => String(t).slice(0, 5);
const formatTime12hr = (time24: string) => {
  const [hours, minutes] = hm(time24).split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};
const dayOfWeek = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" });
const dateLong = (dateStr: string) =>
  `${dayOfWeek(dateStr)}, ${new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`;
const carSizeDisplay = (size: string) =>
  !size ? "Unknown" : size.charAt(0).toUpperCase() + size.toLowerCase().slice(1);

const OWNER_ADDRESS = "3538 del amo blvd lakewood ca";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const bookingId: string | undefined = body?.booking_id;

    let bookings: any[] = [];

    if (bookingId) {
      // Manual single-booking (re)send, triggered from the admin UI — admin-gated,
      // since anyone able to call this could otherwise spam the owner's inbox.
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

      const { data: b, error } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
      if (error || !b) return json({ error: "Booking not found" }, 404);
      bookings = [b];
    } else {
      // Scheduled sweep — called by pg_cron every 15 minutes with no auth (this
      // function is verify_jwt:false, same posture as available-slots/create-booking).
      // Safe to expose publicly: it only ever sends a reminder ONCE per booking
      // (owner_reminder_sent_at gates it), so a stray or repeated call is a no-op.
      const hoursBefore = Number(body?.hours_before) || 24;
      const { data, error } = await supabase.rpc("get_bookings_due_for_owner_reminder", {
        hours_before: hoursBefore,
      });
      if (error) throw error;
      bookings = data || [];
    }

    const results: { id: string; sent: boolean; error?: string }[] = [];
    for (const b of bookings) {
      try {
        await sendReminderFor(b);
        await supabase
          .from("bookings")
          .update({ owner_reminder_sent_at: new Date().toISOString() })
          .eq("id", b.id);
        results.push({ id: b.id, sent: true });
      } catch (err) {
        console.error("Failed to send owner reminder for booking", b.id, err);
        results.push({ id: b.id, sent: false, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return json({ success: true, count: bookings.length, results });
  } catch (err) {
    console.error("Error in send-owner-reminders:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

async function sendReminderFor(b: any) {
  const [interiorRes, exteriorRes, addOnsRes] = await Promise.all([
    b.interior_package_id
      ? supabase.from("packages").select("name").eq("id", b.interior_package_id).maybeSingle()
      : Promise.resolve({ data: null } as any),
    b.exterior_package_id
      ? supabase.from("packages").select("name").eq("id", b.exterior_package_id).maybeSingle()
      : Promise.resolve({ data: null } as any),
    supabase.from("booking_add_ons").select("add_on:add_ons(name)").eq("booking_id", b.id),
  ]);

  const interiorName = interiorRes.data?.name || null;
  const exteriorName = exteriorRes.data?.name || null;
  const addOnNames: string[] = (addOnsRes.data || [])
    .map((r: any) => r.add_on?.name)
    .filter(Boolean);

  const isMobile = String(b.service_type || "").toLowerCase().includes("mobile");
  const address = isMobile ? (b.customer_address && b.customer_address.trim() ? b.customer_address : OWNER_ADDRESS) : OWNER_ADDRESS;

  const displayPrice = b.final_amount ?? b.total_price;
  const priceLabel = b.finalized_at ? "Finalized total" : "Estimated total";

  const dateLongStr = dateLong(b.booking_date);
  const startStr = formatTime12hr(b.start_time);
  const endStr = b.end_time ? formatTime12hr(b.end_time) : null;

  const subject = `Reminder: ${b.customer_name} — ${dateLongStr} at ${startStr} ($${Number(displayPrice || 0).toFixed(2)})`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Upcoming Booking Reminder</title>
</head>
<body style="margin:0; padding:0; background-color:#eef2f6; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 6px 24px rgba(10,47,82,0.10);">

          <!-- Header -->
          <tr>
            <td style="background-color:#0A2F52; padding:24px 28px;">
              <div style="font-family:Arial,Helvetica,sans-serif; font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#0EA5E9; font-weight:bold;">Upcoming job reminder</div>
              <div style="font-family:Arial,Helvetica,sans-serif; font-size:20px; font-weight:bold; color:#ffffff; margin-top:6px;">${b.customer_name}</div>
              <div style="font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#cfe3f2; margin-top:4px;">${dateLongStr} &middot; ${startStr}${endStr ? ` &ndash; ${endStr}` : ""}</div>
            </td>
          </tr>

          <!-- Total banner -->
          <tr>
            <td style="padding:20px 28px 4px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f8fb; border:1px solid #e2eaf1; border-radius:12px;">
                <tr>
                  <td style="padding:14px 18px; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#64748b;">${priceLabel}</td>
                  <td style="padding:14px 18px; font-family:Arial,Helvetica,sans-serif; font-size:22px; font-weight:bold; color:#0A2F52; text-align:right;">$${Number(displayPrice || 0).toFixed(2)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Timing -->
          <tr>
            <td style="padding:18px 28px 4px 28px; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#0EA5E9; font-weight:bold; margin-bottom:10px;">Timing</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:15px; color:#0f172a;">
                <tr><td style="padding:5px 0; color:#64748b; width:110px;">Start</td><td style="padding:5px 0; font-weight:bold;">${startStr}</td></tr>
                ${endStr ? `<tr><td style="padding:5px 0; color:#64748b;">End (est.)</td><td style="padding:5px 0; font-weight:bold;">${endStr}</td></tr>` : ""}
                ${b.total_duration_minutes ? `<tr><td style="padding:5px 0; color:#64748b;">Duration</td><td style="padding:5px 0;">${b.total_duration_minutes} min</td></tr>` : ""}
              </table>
            </td>
          </tr>

          <!-- Customer -->
          <tr>
            <td style="padding:18px 28px 4px 28px; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#0EA5E9; font-weight:bold; margin-bottom:10px;">Customer</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:15px; color:#0f172a;">
                <tr><td style="padding:5px 0; color:#64748b; width:110px;">Name</td><td style="padding:5px 0; font-weight:bold;">${b.customer_name}</td></tr>
                <tr><td style="padding:5px 0; color:#64748b;">Phone</td><td style="padding:5px 0; font-weight:bold; color:#0A2F52;">${b.customer_phone}</td></tr>
                ${b.customer_email ? `<tr><td style="padding:5px 0; color:#64748b;">Email</td><td style="padding:5px 0; color:#0A2F52;">${b.customer_email}</td></tr>` : ""}
              </table>
            </td>
          </tr>

          <!-- Vehicle & service -->
          <tr>
            <td style="padding:18px 28px 4px 28px; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#0EA5E9; font-weight:bold; margin-bottom:10px;">Vehicle &amp; Service</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:15px; color:#0f172a;">
                <tr><td style="padding:5px 0; color:#64748b; width:110px; vertical-align:top;">Type</td><td style="padding:5px 0; vertical-align:top;">${isMobile ? "Mobile" : "Drop-off"}</td></tr>
                <tr><td style="padding:5px 0; color:#64748b; vertical-align:top;">Vehicle</td><td style="padding:5px 0; vertical-align:top;">${carSizeDisplay(b.vehicle_size)}${b.vehicle_model ? ` &middot; ${b.vehicle_model}` : ""}</td></tr>
                <tr><td style="padding:5px 0; color:#64748b; vertical-align:top;">${isMobile ? "Address" : "Drop-off"}</td><td style="padding:5px 0; vertical-align:top;">${address}</td></tr>
              </table>
            </td>
          </tr>

          <!-- Services -->
          <tr>
            <td style="padding:18px 28px 4px 28px; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#0EA5E9; font-weight:bold; margin-bottom:10px;">Services</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px; color:#0f172a;">
                ${interiorName ? `<tr><td style="padding:5px 0; border-bottom:1px solid #eef2f6;">Interior: ${interiorName}</td></tr>` : ""}
                ${exteriorName ? `<tr><td style="padding:5px 0; border-bottom:1px solid #eef2f6;">Exterior: ${exteriorName}</td></tr>` : ""}
                ${addOnNames.map((n) => `<tr><td style="padding:5px 0; border-bottom:1px solid #eef2f6;">Add-on: ${n}</td></tr>`).join("")}
                ${b.monthly_plan_name ? `<tr><td style="padding:5px 0; border-bottom:1px solid #eef2f6;">Monthly Plan: ${b.monthly_plan_name}</td></tr>` : ""}
                ${b.applied_promo_code ? `<tr><td style="padding:5px 0; border-bottom:1px solid #eef2f6;">Promo: ${b.applied_promo_code}</td></tr>` : ""}
              </table>
            </td>
          </tr>

          ${b.customer_notes ? `
          <!-- Customer notes -->
          <tr>
            <td style="padding:18px 28px 4px 28px; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#0EA5E9; font-weight:bold; margin-bottom:8px;">Customer notes</div>
              <p style="margin:0; font-size:14px; line-height:1.6; color:#475569;">${b.customer_notes}</p>
            </td>
          </tr>` : ""}

          ${b.admin_notes ? `
          <!-- Admin notes -->
          <tr>
            <td style="padding:18px 28px 4px 28px; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#0EA5E9; font-weight:bold; margin-bottom:8px;">Your notes</div>
              <p style="margin:0; font-size:14px; line-height:1.6; color:#475569;">${b.admin_notes}</p>
            </td>
          </tr>` : ""}

          <!-- Footer -->
          <tr>
            <td style="padding:16px 28px 28px 28px; font-family:Arial,Helvetica,sans-serif; text-align:center;">
              <p style="margin:0; font-size:11px; color:#a8b4c0; border-top:1px solid #eef2f6; padding-top:16px;">Automated reminder from your booking system.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") || "andrewswashing@gmail.com";
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: OWNER_EMAIL, subject, body: html }),
  });
  if (!res.ok) {
    throw new Error(`send-email failed: ${await res.text()}`);
  }
}
