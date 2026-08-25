import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getFollowupEmailHtml } from "../_shared/followupEmail.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// Service-role client — reads all invoice data server-side (bypasses RLS).
// verify_jwt is FALSE for this function (deployer sets it), so we gate sending
// on the booking actually being FINALIZED (final_amount + payment_status set).
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// Same joined shape used elsewhere: booking + interior/exterior package names +
// originally-selected add-ons for human-readable base service names.
const BOOKING_SELECT = `
  *,
  interior_package:packages!interior_package_id(id, name, tier, base_price),
  exterior_package:packages!exterior_package_id(id, name, tier, base_price),
  add_ons:booking_add_ons(add_on_id, add_on:add_ons(id, name, price))
`;

const money = (n: number) => `$${(Math.round(Number(n) * 100) / 100).toFixed(2)}`;

const formatTime12hr = (time24: string) => {
  if (!time24) return "";
  const [hours, minutes] = time24.substring(0, 5).split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const formatDateLong = (dateStr: string) => {
  const date = new Date(dateStr);
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const rest = date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return `${weekday}, ${rest}`;
};

const carSizeDisplay = (size: string) => {
  if (!size) return "Unknown";
  const normalized = size.toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // Accept the booking id via POST JSON { id } and/or a ?id= query param.
    let id: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body && typeof body.id === "string") id = body.id;
      } catch (_) {
        // no/invalid JSON body — fall back to query param below
      }
    }
    if (!id) {
      const url = new URL(req.url);
      id = url.searchParams.get("id");
    }
    if (!id || typeof id !== "string" || id.trim() === "") {
      return new Response(JSON.stringify({ error: "id is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    id = id.trim();

    // Load the booking (with joins), the finalized line items, and business info.
    const [bookingRes, lineItemsRes, businessRes] = await Promise.all([
      supabase.from("bookings").select(BOOKING_SELECT).eq("id", id).single(),
      supabase
        .from("booking_line_items")
        .select("category, label, amount, quantity, created_at")
        .eq("booking_id", id)
        .order("created_at", { ascending: true }),
      supabase.from("business_info").select("brand_name, phone, dropoff_address").eq("id", 1).single(),
    ]);

    if (bookingRes.error || !bookingRes.data) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const booking = bookingRes.data;

    // GATE: only send an invoice for a booking that is actually FINALIZED.
    const isFinalized =
      booking.final_amount !== null &&
      booking.final_amount !== undefined &&
      !!booking.payment_status;
    if (!isFinalized) {
      return new Response(JSON.stringify({ error: "not_finalized" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!booking.customer_email) {
      return new Response(JSON.stringify({ error: "no_customer_email" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const business = businessRes.error ? null : businessRes.data;
    const brandName = (business && business.brand_name) || "Andrew's Auto Detail & Car Wash";
    const businessPhone = business && business.phone ? business.phone : "";
    const lineItems = Array.isArray(lineItemsRes.data) ? lineItemsRes.data : [];

    // --- Build the itemized invoice rows ------------------------------------
    // kind: 'charge' (positive) | 'discount' (negative) | 'tip'
    type Row = { label: string; qty: number; lineTotal: number; kind: "charge" | "discount" | "tip" };
    const rows: Row[] = [];

    // 1) Base service (mirrors the finalize modal's base reconstruction)
    let baseSubtotal = 0;
    if (booking.interior_package) {
      const amt = parseFloat(booking.interior_package.base_price || 0);
      baseSubtotal += amt;
      rows.push({ label: `Interior: ${booking.interior_package.name}`, qty: 1, lineTotal: amt, kind: "charge" });
    }
    if (booking.exterior_package) {
      const amt = parseFloat(booking.exterior_package.base_price || 0);
      baseSubtotal += amt;
      rows.push({ label: `Exterior: ${booking.exterior_package.name}`, qty: 1, lineTotal: amt, kind: "charge" });
    }
    const vehicleSize = (booking.vehicle_size || "").toLowerCase();
    let sizeAdd = 0;
    if (vehicleSize === "medium" || vehicleSize === "med") sizeAdd = 15;
    if (vehicleSize === "large") sizeAdd = 30;
    if (sizeAdd !== 0 && baseSubtotal > 0) {
      rows.push({
        label: `Vehicle size (${carSizeDisplay(booking.vehicle_size)}, +${money(sizeAdd)})`,
        qty: 1,
        lineTotal: sizeAdd,
        kind: "charge",
      });
    }
    // Originally-selected add-ons on the booking
    if (Array.isArray(booking.add_ons)) {
      for (const a of booking.add_ons) {
        if (a && a.add_on && a.add_on.name) {
          const amt = parseFloat(a.add_on.price || 0);
          rows.push({ label: `Add-on: ${a.add_on.name}`, qty: 1, lineTotal: amt, kind: "charge" });
        }
      }
    }
    // Monthly plan discount (stored on the booking)
    if (booking.monthly_plan_name && booking.monthly_plan_discount && Number(booking.monthly_plan_discount) > 0) {
      rows.push({
        label: `Monthly plan: ${booking.monthly_plan_name}`,
        qty: 1,
        lineTotal: -Math.abs(parseFloat(booking.monthly_plan_discount)),
        kind: "discount",
      });
    }

    // 2) Finalized line items (upgrades, add-ons, custom, travel, tip, discount)
    const CATEGORY_LABELS: Record<string, string> = {
      upgrade: "Upgrade",
      add_on: "Add-on",
      custom: "Custom charge",
      travel_fee: "Travel / Mobile fee",
      tip: "Tip",
      discount: "Discount",
    };
    for (const li of lineItems) {
      const qty = parseInt(String(li.quantity || 1), 10) || 1;
      const amt = parseFloat(String(li.amount || 0));
      const lineTotal = amt * qty;
      const kind: Row["kind"] =
        li.category === "tip" ? "tip" : li.category === "discount" || lineTotal < 0 ? "discount" : "charge";
      const prefix = CATEGORY_LABELS[li.category] ? `${CATEGORY_LABELS[li.category]}: ` : "";
      rows.push({ label: `${prefix}${li.label}`, qty, lineTotal, kind });
    }

    // Totals for the breakdown (final_amount is the authoritative TOTAL PAID)
    const chargesSubtotal = rows.filter((r) => r.kind === "charge").reduce((s, r) => s + r.lineTotal, 0);
    const discountsTotal = rows.filter((r) => r.kind === "discount").reduce((s, r) => s + r.lineTotal, 0);
    const tipTotal = rows.filter((r) => r.kind === "tip").reduce((s, r) => s + r.lineTotal, 0);
    const totalPaid = parseFloat(String(booking.final_amount));

    const bookingDateLong = formatDateLong(booking.booking_date);
    const isMobile = booking.service_type && String(booking.service_type).toLowerCase().includes("mobile");

    const rowHtml = rows
      .map((r) => {
        const isNeg = r.lineTotal < 0;
        const amountColor = isNeg ? "#0EA5E9" : "#0f172a";
        return `
        <tr>
          <td style="padding:10px 0; border-bottom:1px solid #eef2f6; font-size:14px; color:#0f172a;">
            ${r.label}${r.qty > 1 ? ` <span style="color:#94a3b8;">&times;${r.qty}</span>` : ""}
          </td>
          <td style="padding:10px 0; border-bottom:1px solid #eef2f6; font-size:14px; text-align:right; color:${amountColor}; font-weight:${isNeg ? "bold" : "normal"}; white-space:nowrap;">
            ${isNeg ? "-" : ""}${money(Math.abs(r.lineTotal))}
          </td>
        </tr>`;
      })
      .join("");

    const invoiceRef = String(booking.id).split("-")[0].toUpperCase();
    const paidLabel = booking.payment_status === "paid" ? "PAID" : String(booking.payment_status || "").toUpperCase();

    const invoiceHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=yes, address=yes, date=yes">
  <title>Invoice / Receipt</title>
</head>
<body style="margin:0; padding:0; background-color:#eef2f6; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">Your invoice from ${brandName} — total paid ${money(totalPaid)}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 6px 24px rgba(10,47,82,0.10);">

          <!-- Header -->
          <tr>
            <td style="background-color:#0A2F52; padding:30px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:top;">
                    <div style="font-family:Arial,Helvetica,sans-serif; font-size:19px; font-weight:bold; color:#ffffff; line-height:1.3;">${brandName}</div>
                    <div style="height:3px; width:44px; background-color:#0EA5E9; margin:12px 0 14px 0; border-radius:2px;"></div>
                    ${businessPhone ? `<div style="font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#cfe3f2;">${businessPhone}</div>` : ""}
                  </td>
                  <td style="vertical-align:top; text-align:right;">
                    <div style="font-family:Arial,Helvetica,sans-serif; font-size:13px; letter-spacing:2px; text-transform:uppercase; color:#0EA5E9; font-weight:bold;">Invoice / Receipt</div>
                    <div style="font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#cfe3f2; margin-top:6px;">Ref #${invoiceRef}</div>
                    ${paidLabel ? `<div style="display:inline-block; margin-top:10px; padding:4px 12px; background-color:#0EA5E9; border-radius:20px; font-family:Arial,Helvetica,sans-serif; font-size:12px; font-weight:bold; color:#ffffff; letter-spacing:1px;">${paidLabel}</div>` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bill-to + service info -->
          <tr>
            <td style="padding:26px 32px 6px 32px; font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:top; width:50%;">
                    <div style="font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#0EA5E9; font-weight:bold; margin-bottom:8px;">Billed to</div>
                    <div style="font-size:15px; font-weight:bold; color:#0f172a;">${booking.customer_name || ""}</div>
                    ${booking.customer_email ? `<div style="font-size:13px; color:#64748b; margin-top:3px;">${booking.customer_email}</div>` : ""}
                    ${booking.customer_phone ? `<div style="font-size:13px; color:#64748b; margin-top:2px;">${booking.customer_phone}</div>` : ""}
                  </td>
                  <td style="vertical-align:top; width:50%; text-align:right;">
                    <div style="font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#0EA5E9; font-weight:bold; margin-bottom:8px;">Service</div>
                    <div style="font-size:14px; color:#0f172a;">${bookingDateLong}</div>
                    <div style="font-size:13px; color:#64748b; margin-top:3px;">${formatTime12hr(booking.start_time)}${booking.end_time ? ` &ndash; ${formatTime12hr(booking.end_time)}` : ""}</div>
                    <div style="font-size:13px; color:#64748b; margin-top:3px;">${isMobile ? "Mobile" : "Drop-off"} &middot; ${carSizeDisplay(booking.vehicle_size)}${booking.vehicle_model ? ` &middot; ${booking.vehicle_model}` : ""}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Itemized table -->
          <tr>
            <td style="padding:22px 32px 4px 32px; font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 0 8px 0; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#94a3b8; font-weight:bold; border-bottom:2px solid #dbe4ec;">Description</td>
                  <td style="padding:0 0 8px 0; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#94a3b8; font-weight:bold; text-align:right; border-bottom:2px solid #dbe4ec;">Amount</td>
                </tr>
                ${rowHtml}
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding:16px 32px 4px 32px; font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td></td>
                  <td style="width:260px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px; color:#0f172a;">
                      <tr>
                        <td style="padding:5px 0; color:#64748b;">Subtotal</td>
                        <td style="padding:5px 0; text-align:right;">${money(chargesSubtotal)}</td>
                      </tr>
                      ${discountsTotal < 0 ? `<tr><td style="padding:5px 0; color:#64748b;">Discounts</td><td style="padding:5px 0; text-align:right; color:#0EA5E9; font-weight:bold;">-${money(Math.abs(discountsTotal))}</td></tr>` : ""}
                      ${tipTotal > 0 ? `<tr><td style="padding:5px 0; color:#64748b;">Tip</td><td style="padding:5px 0; text-align:right;">${money(tipTotal)}</td></tr>` : ""}
                      <tr><td colspan="2" style="padding:6px 0 0 0;"><div style="border-top:2px solid #0A2F52;"></div></td></tr>
                      <tr>
                        <td style="padding:10px 0 0 0; font-size:16px; font-weight:bold; color:#0A2F52;">Total paid</td>
                        <td style="padding:10px 0 0 0; text-align:right; font-size:22px; font-weight:bold; color:#0A2F52;">${money(totalPaid)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Payments accepted -->
          <tr>
            <td style="padding:20px 32px 4px 32px;">
              <div style="background-color:#f4f8fb; border:1px solid #e2eaf1; border-radius:12px; padding:14px 20px; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#0f172a;">
                <strong style="color:#0A2F52;">Payments accepted:</strong> Cash, Cash App, PayPal, Venmo &amp; Zelle
              </div>
            </td>
          </tr>

          ${booking.payment_notes ? `
          <tr>
            <td style="padding:16px 32px 4px 32px; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#0EA5E9; font-weight:bold; margin-bottom:6px;">Notes</div>
              <p style="margin:0; font-size:13px; line-height:1.6; color:#475569;">${booking.payment_notes}</p>
            </td>
          </tr>` : ""}

          <!-- Thank you / footer -->
          <tr>
            <td style="padding:26px 32px 32px 32px; font-family:Arial,Helvetica,sans-serif; text-align:center;">
              <div style="border-top:1px solid #eef2f6; padding-top:22px;">
                <p style="margin:0 0 6px 0; font-size:16px; font-weight:bold; color:#0A2F52;">Thank you for your business!</p>
                <p style="margin:0 0 10px 0; font-size:13px; color:#64748b;">We appreciate you choosing ${brandName}.</p>
                <p style="margin:0; font-size:13px; color:#64748b;"><a href="https://andrewsdetail.com" style="color:#0EA5E9; text-decoration:none;">andrewsdetail.com</a></p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    // Send the invoice via the internal send-email relay (service-role gated).
    const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: booking.customer_email,
        subject: `Your invoice from ${brandName} - ${money(totalPaid)} (Ref #${invoiceRef})`,
        body: invoiceHtml,
      }),
    });

    if (!emailResponse.ok) {
      const details = await emailResponse.text();
      console.error("Failed to send invoice email:", details);
      return new Response(JSON.stringify({ error: "email_failed", details }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Second, SEPARATE email — the post-service "thank you" / review-request
    // note (Google/Yelp links, referral program). Distinct message from the
    // invoice above, just triggered by the same Finalize-payment action so
    // both land together. Best-effort: its failure must not fail the invoice
    // response, but the outcome IS reported so the caller can surface it.
    let thankYouSent = false;
    try {
      const firstName = booking.customer_name ? String(booking.customer_name).split(" ")[0] || "Customer" : "Customer";
      const { subject: thankYouSubject, html: thankYouHtml } = getFollowupEmailHtml(firstName);
      const thankYouResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: booking.customer_email,
          subject: thankYouSubject,
          body: thankYouHtml,
        }),
      });
      thankYouSent = thankYouResponse.ok;
      if (!thankYouResponse.ok) console.error("Failed to send thank-you email:", await thankYouResponse.text());
    } catch (e) {
      console.error("Error sending thank-you email:", e);
    }

    return new Response(JSON.stringify({ success: true, thank_you_sent: thankYouSent }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error in send-invoice function:", err);
    return new Response(JSON.stringify({ error: err?.message || "internal_error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
