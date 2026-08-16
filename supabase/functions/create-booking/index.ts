import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  computeQuote,
  getSiteDiscountPercent,
  resolvePlan,
  resolvePromo,
  roundToNearest5,
  vehicleSizeAdd,
  vehicleSizeDuration,
} from "../_shared/pricing.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

interface BookingRequest {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address?: string | null;
  service_type: string;
  vehicle_size: string;
  vehicle_model?: string | null; // New field
  interior_package_id?: number | null;
  exterior_package_id?: number | null;
  has_water_electric?: boolean;
  customer_notes?: string;
  booking_date: string;
  start_time: string;
  end_time?: string | null;
  status?: string;
  add_ons?: number[]; // Array of add-on IDs
  applied_promo_code?: string | null;
  promo_discount?: number | null;
  monthly_plan_id?: number | null;
  // Campaign attribution (e.g. the golf-course QR link) — both optional, set by
  // the widget from localStorage when the visitor landed via a tracked link.
  visitor_id?: string | null;
  campaign_slug?: string | null;
  // When present, the owner is previewing the flow while signed into /admin. It
  // is VERIFIED server-side; if it resolves to an active admin the booking is
  // treated as a no-persist preview (email sends, nothing is saved).
  owner_access_token?: string | null;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...CORS_HEADERS,
        "Vary": "Origin",
        "Content-Type": "text/plain",
      },
    });
  }

  try {
    const bookingRequest: BookingRequest = await req.json();
    console.log("Creating booking with data:", bookingRequest);

    // Validate required fields
    if (!bookingRequest.customer_name?.trim()) {
      return new Response(JSON.stringify({ error: "Customer name is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (!bookingRequest.customer_email?.trim()) {
      return new Response(JSON.stringify({ error: "Customer email is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (!bookingRequest.customer_phone?.trim()) {
      return new Response(JSON.stringify({ error: "Customer phone is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (!bookingRequest.booking_date) {
      return new Response(JSON.stringify({ error: "Booking date is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (!bookingRequest.start_time) {
      return new Response(JSON.stringify({ error: "Start time is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (!bookingRequest.interior_package_id && !bookingRequest.exterior_package_id) {
      return new Response(
        JSON.stringify({ error: "At least one package (interior or exterior) must be selected" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // Calculate pricing and duration from packages, and get package names
    let basePrice = 0;
    let addOnsTotal = 0;
    let totalPrice = 0;
    let totalDuration = 0;
    let interiorPackageName = "";
    let exteriorPackageName = "";
    let addOnNames: string[] = [];

    if (bookingRequest.interior_package_id) {
      const { data: interiorPkg, error: interiorError } = await supabase
        .from("packages")
        .select("base_price, duration_minutes, name")
        .eq("id", bookingRequest.interior_package_id)
        .single();

      if (interiorError || !interiorPkg) {
        return new Response(JSON.stringify({ error: "Invalid interior package ID" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      basePrice += interiorPkg.base_price;
      totalDuration += interiorPkg.duration_minutes;
      interiorPackageName = interiorPkg.name;
    }

    if (bookingRequest.exterior_package_id) {
      const { data: exteriorPkg, error: exteriorError } = await supabase
        .from("packages")
        .select("base_price, duration_minutes, name")
        .eq("id", bookingRequest.exterior_package_id)
        .single();

      if (exteriorError || !exteriorPkg) {
        return new Response(JSON.stringify({ error: "Invalid exterior package ID" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      basePrice += exteriorPkg.base_price;
      totalDuration += exteriorPkg.duration_minutes;
      exteriorPackageName = exteriorPkg.name;
    }


    // Vehicle-size surcharge (shared pricing table).
    const sizeAdd = vehicleSizeAdd(bookingRequest.vehicle_size);
    // Bigger vehicles also take longer — add size time to the service duration so
    // the stored end_time reflects the real work window (small=0, med=+15, lg=+30).
    totalDuration += vehicleSizeDuration(bookingRequest.vehicle_size);

    // --- Add-on duration and price logic ---
    let addOnsData: any[] = [];
    if (bookingRequest.add_ons && bookingRequest.add_ons.length > 0) {
      const addOnsResult = await supabase
        .from("add_ons")
        .select("id, name, duration_minutes, price")
        .in("id", bookingRequest.add_ons);

      if (addOnsResult.error) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch add-ons", details: addOnsResult.error }),
          {
            status: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          },
        );
      }

      addOnsData = addOnsResult.data || [];
      if (Array.isArray(addOnsData)) {
        for (const addOn of addOnsData) {
          totalDuration += addOn.duration_minutes || 0;
          addOnNames.push(addOn.name);
          addOnsTotal += addOn.price || 0;
        }
      }
    }

    // Resolve discount inputs, then run the SHARED quote engine — identical to
    // calculate-booking so the quoted price always equals the charged price.
    // (Ordering: base+size+add-ons → site sale % → monthly plan → promo → $5.)
    const siteDiscountPercent = await getSiteDiscountPercent(supabase);
    const siteDiscountActive = siteDiscountPercent > 0;
    const planData = await resolvePlan(supabase, bookingRequest.monthly_plan_id);
    const promo_code = bookingRequest.applied_promo_code || bookingRequest.promo_code || null;
    const promoData = await resolvePromo(supabase, promo_code);

    const quote = computeQuote({
      basePrice,
      sizeAdd,
      addOnsTotal,
      siteDiscountPercent,
      plan: planData ? { discount_type: planData.discount_type, discount_value: planData.discount_value } : null,
      promo: promoData ? { type: promoData.type, value: promoData.value } : null,
    });

    const siteDiscount = quote.siteDiscount;
    const appliedMonthlyPlanId = planData ? planData.id : null;
    const monthlyPlanName = planData ? planData.name : "";
    const monthlyPlanDiscount = quote.monthlyPlanDiscount;
    const appliedPromoCode = promoData ? promoData.code : null;
    const promoDiscount = quote.promoDiscount;

    // Stored subtotal is post-site / pre-plan, rounded to $5 (unchanged shape).
    const subtotal = roundToNearest5(quote.subtotalAfterSite);
    totalPrice = quote.total;

    // Calculate end_time if not provided
    let endTime = bookingRequest.end_time;
    if (!endTime) {
      const startTimeParts = bookingRequest.start_time.split(":");
      const startHours = parseInt(startTimeParts[0]);
      const startMinutes = parseInt(startTimeParts[1]);
      const startTotalMinutes = startHours * 60 + startMinutes;
      const endTotalMinutes = startTotalMinutes + totalDuration;
      const endHours = Math.floor(endTotalMinutes / 60);
      const endMinutes = endTotalMinutes % 60;
      endTime = `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}:00`;
    }

    // Ensure start_time has seconds
    let startTime = bookingRequest.start_time;
    if (startTime.split(":").length === 2) {
      startTime = `${startTime}:00`;
    }

    // SERVER-SIDE availability guard: reject a booking that falls on a blocked-out
    // date/time. The widget greys these out, but the client can be stale (page
    // loaded before the owner closed the day) or bypassed, so the server is the
    // source of truth. An all-day block rejects the whole day; a timed block
    // rejects only when the job's [start,end) overlaps it — and because endTime
    // already includes the service duration, a job that STARTS before a block but
    // RUNS INTO it is correctly rejected too.
    {
      const { data: blocks, error: blockErr } = await supabase
        .from("blockout_dates")
        .select("all_day, start_time, end_time")
        .lte("start_date", bookingRequest.booking_date)
        .gte("end_date", bookingRequest.booking_date);
      if (blockErr) {
        console.error("Blockout check failed:", blockErr);
      } else {
        const hm = (t: string) => String(t).slice(0, 5);
        const jobStart = hm(startTime);
        const jobEnd = hm(endTime);
        const timesOverlap = (aS: string, aE: string, bS: string, bE: string) =>
          !(aE <= bS || aS >= bE);
        const isBlocked = (blocks || []).some((bl: any) => {
          if (bl.all_day) return true;
          if (bl.start_time || bl.end_time) {
            return timesOverlap(jobStart, jobEnd, hm(bl.start_time || "00:00"), hm(bl.end_time || "23:59"));
          }
          return false;
        });
        if (isBlocked) {
          return new Response(
            JSON.stringify({ error: "That date and time is not available for booking. Please choose another day or time." }),
            { status: 409, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
          );
        }
      }
    }

    // SERVER-SIDE weekly-hours guard: reject a booking on a CLOSED weekday, one
    // that starts before opening, or one that would RUN PAST closing. The weekly
    // schedule lives in business_hours (0=Sun..6=Sat); a row with null open/close
    // means that day is closed. A per-date override in booking_hours_overrides
    // supersedes it for one day. endTime already includes the full service
    // duration, so a job that starts in-hours but finishes after close is caught.
    {
      const [by, bm, bd] = bookingRequest.booking_date.split("-").map(Number);
      const weekday = new Date(by, (bm || 1) - 1, bd || 1).getDay();
      const hmv = (t: string) => String(t).slice(0, 5);

      const { data: dayOverride } = await supabase
        .from("booking_hours_overrides")
        .select("open_time, close_time")
        .eq("date", bookingRequest.booking_date)
        .maybeSingle();

      let openTime: string | null = null;
      let closeTime: string | null = null;
      let hoursKnown = false;
      if (dayOverride && dayOverride.open_time && dayOverride.close_time) {
        openTime = hmv(dayOverride.open_time);
        closeTime = hmv(dayOverride.close_time);
        hoursKnown = true;
      } else if (!dayOverride) {
        const { data: wh } = await supabase
          .from("business_hours")
          .select("open_time, close_time")
          .eq("weekday", weekday)
          .maybeSingle();
        if (wh) {
          hoursKnown = true;
          if (!wh.open_time || !wh.close_time) {
            // Explicitly closed weekday.
            return new Response(
              JSON.stringify({ error: "We're closed that day. Please choose another day." }),
              { status: 409, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
            );
          }
          openTime = hmv(wh.open_time);
          closeTime = hmv(wh.close_time);
        }
      }

      if (hoursKnown && openTime && hmv(startTime) < openTime) {
        return new Response(
          JSON.stringify({ error: `We open at ${openTime} that day. Please choose a later time.` }),
          { status: 409, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }
      if (hoursKnown && closeTime && hmv(endTime) > closeTime) {
        return new Response(
          JSON.stringify({ error: `That service would run until ${hmv(endTime)}, past our ${closeTime} close that day. Please choose an earlier time or a shorter service.` }),
          { status: 409, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }
    }

    // Resolve campaign attribution server-side from the slug (never trust a
    // client-supplied id directly) — best-effort, never blocks the booking.
    let attributedCampaignId: string | null = null;
    if (bookingRequest.campaign_slug) {
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("id")
        .eq("slug", String(bookingRequest.campaign_slug).trim().toLowerCase())
        .maybeSingle();
      if (campaign) attributedCampaignId = campaign.id;
    }

    // Owner preview detection. If the request carries an access token that VERIFY
    // as belonging to an active admin, the owner is testing the flow: we'll send
    // the confirmation email so they can see it, but persist nothing (no booking,
    // customer, add-ons, promo usage, or calendar event) so it never shows in the
    // dashboard or skews the stats. Verified server-side on purpose — a client
    // flag alone is never trusted, so a real customer's booking can't be dropped.
    let isOwnerTest = false;
    if (bookingRequest.owner_access_token) {
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser(
          bookingRequest.owner_access_token,
        );
        if (!userErr && userData?.user?.id) {
          const { data: adminRow } = await supabase
            .from("admin_users")
            .select("id")
            .eq("id", userData.user.id)
            .eq("is_active", true)
            .maybeSingle();
          if (adminRow) isOwnerTest = true;
        }
      } catch (ownerErr) {
        console.error("Owner-token verification failed (treating as normal booking):", ownerErr);
        isOwnerTest = false;
      }
    }

    // Per-person promo limit (authoritative). Some codes (e.g. the golf campaign)
    // allow unlimited TOTAL uses but only ONE per customer. If this code is
    // once_per_customer and a prior booking already used it for this email or
    // phone, reject so it can't be farmed. Skipped for owner previews (they must
    // always see the discount, and previews are never persisted anyway).
    if (!isOwnerTest && promoData && promoData.once_per_customer) {
      const email = bookingRequest.customer_email.trim();
      const phone = bookingRequest.customer_phone.trim();
      const { data: byEmail } = await supabase
        .from("bookings")
        .select("id")
        .eq("applied_promo_code", promoData.code)
        .ilike("customer_email", email)
        .limit(1);
      const { data: byPhone } = await supabase
        .from("bookings")
        .select("id")
        .eq("applied_promo_code", promoData.code)
        .eq("customer_phone", phone)
        .limit(1);
      if ((byEmail && byEmail.length > 0) || (byPhone && byPhone.length > 0)) {
        return new Response(
          JSON.stringify({ error: `The code ${promoData.code} is limited to one use per customer, and it looks like you've already used it. Please remove the code to continue booking.` }),
          { status: 409, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }
    }

    // Prepare booking data for insertion
    const finalPrice = totalPrice;
    const bookingData = {
      customer_name: bookingRequest.customer_name.trim(),
      customer_phone: bookingRequest.customer_phone.trim(),
      customer_email: bookingRequest.customer_email.trim(),
      customer_address: bookingRequest.customer_address?.trim() || null,
      service_type: bookingRequest.service_type,
      vehicle_size: bookingRequest.vehicle_size,
      vehicle_model: bookingRequest.vehicle_model?.trim() || null, // New field
      interior_package_id: bookingRequest.interior_package_id || null,
      exterior_package_id: bookingRequest.exterior_package_id || null,
      has_water_electric: bookingRequest.has_water_electric || false,
      customer_notes: bookingRequest.customer_notes?.trim() || null,
      booking_date: bookingRequest.booking_date,
      start_time: startTime,
      end_time: endTime,
      subtotal: subtotal,
      total_price: finalPrice,
      total_duration_minutes: totalDuration,
      status: "confirmed",
      applied_promo_code: appliedPromoCode,
      promo_discount: promoDiscount,
      monthly_plan_id: appliedMonthlyPlanId,
      monthly_plan_discount: monthlyPlanDiscount,
      monthly_plan_name: monthlyPlanName || null,
      campaign_id: attributedCampaignId,
      visitor_id: bookingRequest.visitor_id?.trim() || null,
    };

    console.log("Inserting booking:", bookingData);

    let data;
    if (isOwnerTest) {
      // Owner preview: persist NOTHING. Synthesize the row shape the email
      // templates read from so the confirmation still renders exactly as a
      // customer would receive it, then fall through to the email step.
      data = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...bookingData,
      };
      console.log("Owner preview booking — not persisted:", data.id);
    } else {
      // Check if customer exists, create if not
      try {
        const { data: existingCustomer, error: checkError } = await supabase
          .from("customers")
          .select("id")
          .eq("phone", bookingRequest.customer_phone)
          .maybeSingle();

        if (!existingCustomer && !checkError) {
          const { error: customerError } = await supabase.from("customers").insert([
            {
              name: bookingRequest.customer_name.trim(),
              email: bookingRequest.customer_email.trim(),
              phone: bookingRequest.customer_phone.trim(),
              address: bookingRequest.customer_address?.trim() || null,
              notes: null,
            },
          ]);
          if (customerError) {
            console.error("Failed to create customer:", customerError);
          } else {
            console.log("✅ Customer created automatically");
          }
        } else if (checkError) {
          console.error("Error checking for existing customer:", checkError);
        } else {
          console.log("Customer already exists");
        }
      } catch (customerCheckError) {
        console.error("Customer check error:", customerCheckError);
      }

      // Insert booking into database
      const { data: inserted, error } = await supabase
        .from("bookings")
        .insert([bookingData])
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        return new Response(JSON.stringify({ error: error.message, details: error }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      data = inserted;
      console.log("Booking created successfully:", data);

      // Bump the promo code's usage count now that it's actually been used on a
      // real booking. Best-effort — a failure here must not fail the booking,
      // since the discount is already locked in. (This was previously never
      // incremented anywhere, so usage_limit silently never took effect.)
      if (appliedPromoCode) {
        const { error: promoUsageError } = await supabase.rpc("increment_promo_usage", {
          p_code: appliedPromoCode,
        });
        if (promoUsageError) {
          console.error("Failed to increment promo usage:", promoUsageError);
        }
      }
    }

    // Insert add-ons if provided (skipped for owner previews — nothing persisted)
    if (!isOwnerTest && bookingRequest.add_ons && bookingRequest.add_ons.length > 0 && data?.id) {
      const addOnRows = bookingRequest.add_ons.map((add_on_id) => ({
        booking_id: data.id,
        add_on_id,
      }));
      const { error: addOnError } = await supabase.from("booking_add_ons").insert(addOnRows);

      if (addOnError) {
        return new Response(JSON.stringify({ error: addOnError.message }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    }

    // Helper functions for email formatting
    const formatTime12hr = (time24: string) => {
      const [hours, minutes] = time24.substring(0, 5).split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    };
    const getDayOfWeek = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", { weekday: "long" });
    };
    const carSizeDisplay = (size: string) => {
      if (!size) return "Unknown";
      const normalized = size.toLowerCase();
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    };
    // Address display logic: for mobile, show customer address if provided, else owner's address. For drop-off or missing, always owner's address.
    const OWNER_ADDRESS = "3538 del amo blvd lakewood ca";
    const isMobile = (bookingRequest.service_type && bookingRequest.service_type.toLowerCase().includes("mobile"));
    const isDropoff = (bookingRequest.service_type && bookingRequest.service_type.toLowerCase().includes("drop"));
    const addressDisplay = (address: string | null | undefined) => {
      if (isMobile) {
        return (address && address.trim()) ? address : OWNER_ADDRESS;
      }
      // For drop-off or any other case, always show owner's address
      return OWNER_ADDRESS;
    };

    // CUSTOMER EMAIL TEMPLATE (with estimate disclaimer)
    const bookingDateLong = `${getDayOfWeek(data.booking_date)}, ${new Date(data.booking_date).toLocaleDateString(
      "en-US",
      { year: "numeric", month: "long", day: "numeric" }
    )}`;
    const receiptUrl = `https://andrewsdetail.com/booking/${data.id}`;

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=yes, address=yes, date=yes">
  <title>Booking Confirmed</title>
</head>
<body style="margin:0; padding:0; background-color:#eef2f6; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">Your booking with Andrew's Auto Detail & Car Wash is confirmed for ${bookingDateLong}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 6px 24px rgba(10,47,82,0.10);">

          <!-- Header -->
          <tr>
            <td style="background-color:#0A2F52; padding:32px 32px 28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="font-family:Arial,Helvetica,sans-serif; font-size:20px; font-weight:bold; color:#ffffff; line-height:1.3;">Andrew's Auto Detail &amp; Car Wash</div>
                    <div style="height:3px; width:44px; background-color:#0EA5E9; margin:14px 0 16px 0; border-radius:2px;"></div>
                    <div style="font-family:Arial,Helvetica,sans-serif; font-size:15px; color:#cfe3f2;">Booking confirmed</div>
                    <div style="font-family:Arial,Helvetica,sans-serif; font-size:26px; font-weight:bold; color:#ffffff; margin-top:4px;">You're all set!</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:28px 32px 8px 32px; font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 8px 0; font-size:16px; color:#0f172a; font-weight:bold;">Hi ${data.customer_name},</p>
              <p style="margin:0; font-size:15px; line-height:1.6; color:#475569;">Thanks for booking with us. Here are the details of your appointment. We look forward to making your vehicle shine.</p>
            </td>
          </tr>

          <!-- Appointment card -->
          <tr>
            <td style="padding:20px 32px 4px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f8fb; border:1px solid #e2eaf1; border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px; font-family:Arial,Helvetica,sans-serif;">
                    <div style="font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#0EA5E9; font-weight:bold; margin-bottom:12px;">Appointment</div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#0f172a;">
                      <tr>
                        <td style="padding:5px 0; color:#64748b; width:120px; vertical-align:top;">Date</td>
                        <td style="padding:5px 0; vertical-align:top; font-weight:bold;">${bookingDateLong}</td>
                      </tr>
                      <tr>
                        <td style="padding:5px 0; color:#64748b; vertical-align:top;">Time</td>
                        <td style="padding:5px 0; vertical-align:top; font-weight:bold;">${formatTime12hr(data.start_time)} &ndash; ${formatTime12hr(data.end_time)}</td>
                      </tr>
                      <tr>
                        <td style="padding:5px 0; color:#64748b; vertical-align:top;">Service type</td>
                        <td style="padding:5px 0; vertical-align:top;">${isMobile ? "Mobile (we come to you)" : "Drop-off"}</td>
                      </tr>
                      <tr>
                        <td style="padding:5px 0; color:#64748b; vertical-align:top;">Vehicle</td>
                        <td style="padding:5px 0; vertical-align:top;">${carSizeDisplay(data.vehicle_size)}${data.vehicle_model ? ` &middot; ${data.vehicle_model}` : ""}</td>
                      </tr>
                      <tr>
                        <td style="padding:5px 0; color:#64748b; vertical-align:top;">${isMobile ? "Address" : "Drop-off"}</td>
                        <td style="padding:5px 0; vertical-align:top;">${addressDisplay(data.customer_address)}</td>
                      </tr>
                    </table>
                    <p style="margin:12px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.5; color:#94a3b8;">Your appointment time is approximate. We aim to arrive within about 30 minutes of it &mdash; for a 3:00 booking, that&rsquo;s roughly 2:30&ndash;3:30 &mdash; depending on how the day&rsquo;s jobs run. We&rsquo;ll always do our best to be on time.</p>
                    <p style="margin:6px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.5; color:#94a3b8;">This is a booking request &mdash; your time is our best availability, not a guaranteed slot until we confirm it with you.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Services -->
          <tr>
            <td style="padding:20px 32px 4px 32px; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#0EA5E9; font-weight:bold; margin-bottom:12px;">Services</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px; color:#0f172a;">
                ${interiorPackageName ? `<tr><td style="padding:6px 0; border-bottom:1px solid #eef2f6;">Interior: ${interiorPackageName}</td></tr>` : ""}
                ${exteriorPackageName ? `<tr><td style="padding:6px 0; border-bottom:1px solid #eef2f6;">Exterior: ${exteriorPackageName}</td></tr>` : ""}
                ${
                  addOnsData && addOnsData.length > 0
                    ? addOnsData.map((a) => `<tr><td style="padding:6px 0; border-bottom:1px solid #eef2f6;">Add-on: ${a.name}</td></tr>`).join("")
                    : ""
                }
                ${appliedMonthlyPlanId ? `<tr><td style="padding:6px 0; border-bottom:1px solid #eef2f6;">Monthly Plan: ${monthlyPlanName}${planData ? (planData.discount_type === 'percentage' ? ' (' + planData.discount_value + '% off)' : ' ($' + Number(planData.discount_value).toFixed(2) + ' off)') : ''}</td></tr>` : ""}
              </table>
            </td>
          </tr>

          <!-- Price breakdown -->
          <tr>
            <td style="padding:20px 32px 4px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f8fb; border:1px solid #e2eaf1; border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px; font-family:Arial,Helvetica,sans-serif;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px; color:#0f172a;">
                      <tr>
                        <td style="padding:4px 0; color:#64748b;">Subtotal</td>
                        <td style="padding:4px 0; text-align:right;">$${data.subtotal ? Number(data.subtotal).toFixed(2) : Number(data.total_price).toFixed(2)}</td>
                      </tr>
                      ${siteDiscountActive && siteDiscount > 0 ? `<tr><td style="padding:4px 0; color:#64748b;">${siteDiscountPercent}% Sale</td><td style="padding:4px 0; text-align:right; color:#0EA5E9; font-weight:bold;">-$${siteDiscount.toFixed(2)}</td></tr>` : ''}
                      ${(appliedMonthlyPlanId && data.monthly_plan_discount && Number(data.monthly_plan_discount) > 0) ? `<tr><td style="padding:4px 0; color:#64748b;">${monthlyPlanName || 'Monthly plan'}</td><td style="padding:4px 0; text-align:right; color:#0EA5E9; font-weight:bold;">-$${Number(data.monthly_plan_discount).toFixed(2)}</td></tr>` : ''}
                      ${data.applied_promo_code ? `<tr><td style="padding:4px 0; color:#64748b;">Promo (${data.applied_promo_code})</td><td style="padding:4px 0; text-align:right;">${(data.promo_discount && Number(data.promo_discount) > 0) ? `<span style="color:#0EA5E9; font-weight:bold;">-$${Number(data.promo_discount).toFixed(2)}</span>` : 'Applied'}</td></tr>` : ''}
                      <tr><td colspan="2" style="padding:6px 0 0 0;"><div style="border-top:2px solid #dbe4ec;"></div></td></tr>
                      <tr>
                        <td style="padding:8px 0 0 0; font-size:16px; font-weight:bold; color:#0A2F52;">Estimated total</td>
                        <td style="padding:8px 0 0 0; text-align:right; font-size:20px; font-weight:bold; color:#0A2F52;">$${Number(data.total_price).toFixed(2)}</td>
                      </tr>
                    </table>
                    <p style="margin:12px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.5; color:#94a3b8;">This total is an estimate based on the information provided and is subject to change if the vehicle&rsquo;s condition requires additional time or services.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Receipt button -->
          <tr>
            <td style="padding:24px 32px 8px 32px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:10px; background-color:#0EA5E9;">
                    <a href="${receiptUrl}" target="_blank" style="display:inline-block; padding:14px 32px; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:10px;">View / save your confirmation</a>
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#94a3b8;">Or open: <a href="${receiptUrl}" target="_blank" style="color:#0EA5E9; text-decoration:none;">${receiptUrl}</a></p>
            </td>
          </tr>

          ${data.customer_notes ? `
          <!-- Notes -->
          <tr>
            <td style="padding:16px 32px 4px 32px; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#0EA5E9; font-weight:bold; margin-bottom:8px;">Your notes</div>
              <p style="margin:0; font-size:14px; line-height:1.6; color:#475569;">${data.customer_notes}</p>
            </td>
          </tr>` : ''}

          <!-- Payments -->
          <tr>
            <td style="padding:20px 32px 8px 32px;">
              <div style="background-color:#f4f8fb; border:1px solid #e2eaf1; border-radius:12px; padding:14px 20px; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#0f172a;">
                <strong style="color:#0A2F52;">Payments accepted:</strong> Cash, Cash App, PayPal, Venmo &amp; Zelle
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px 32px 32px; font-family:Arial,Helvetica,sans-serif; text-align:center;">
              <div style="border-top:1px solid #eef2f6; padding-top:20px;">
                <p style="margin:0 0 4px 0; font-size:14px; font-weight:bold; color:#0A2F52;">Andrew's Auto Detail &amp; Car Wash</p>
                <p style="margin:0 0 10px 0; font-size:13px; color:#64748b;"><a href="https://andrewsdetail.com" style="color:#0EA5E9; text-decoration:none;">andrewsdetail.com</a></p>
                <p style="margin:0; font-size:11px; color:#a8b4c0;">This is an automated confirmation email. Please do not reply.</p>
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

    // OWNER EMAIL TEMPLATE (concise internal notification)
    const ownerEmailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=yes, address=yes, date=yes">
  <title>New Booking</title>
</head>
<body style="margin:0; padding:0; background-color:#eef2f6; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${data.customer_name} &middot; ${bookingDateLong} &middot; $${Number(data.total_price).toFixed(2)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 6px 24px rgba(10,47,82,0.10);">

          <!-- Header -->
          <tr>
            <td style="background-color:#0A2F52; padding:24px 28px;">
              <div style="font-family:Arial,Helvetica,sans-serif; font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#0EA5E9; font-weight:bold;">New booking received</div>
              <div style="font-family:Arial,Helvetica,sans-serif; font-size:20px; font-weight:bold; color:#ffffff; margin-top:6px;">${data.customer_name}</div>
              <div style="font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#cfe3f2; margin-top:4px;">${bookingDateLong} &middot; ${formatTime12hr(data.start_time)} &ndash; ${formatTime12hr(data.end_time)}</div>
            </td>
          </tr>

          <!-- Total banner -->
          <tr>
            <td style="padding:20px 28px 4px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f8fb; border:1px solid #e2eaf1; border-radius:12px;">
                <tr>
                  <td style="padding:14px 18px; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#64748b;">Booking total</td>
                  <td style="padding:14px 18px; font-family:Arial,Helvetica,sans-serif; font-size:22px; font-weight:bold; color:#0A2F52; text-align:right;">$${Number(data.total_price).toFixed(2)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Customer -->
          <tr>
            <td style="padding:18px 28px 4px 28px; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#0EA5E9; font-weight:bold; margin-bottom:10px;">Customer</div>
              <!-- Contact details are PLAIN TEXT (not tel:/mailto: links) so iOS Mail's
                   data detectors recognize them: long-press the number/email/address to
                   "Add to Contacts" with the fields auto-filled. A .vcf is also attached
                   for one-tap contact creation. -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:15px; color:#0f172a;">
                <tr><td style="padding:5px 0; color:#64748b; width:90px;">Name</td><td style="padding:5px 0; font-weight:bold;">${data.customer_name}</td></tr>
                <tr><td style="padding:5px 0; color:#64748b;">Phone</td><td style="padding:5px 0; font-weight:bold; color:#0A2F52;">${data.customer_phone}</td></tr>
                <tr><td style="padding:5px 0; color:#64748b;">Email</td><td style="padding:5px 0; color:#0A2F52;">${data.customer_email}</td></tr>
                ${data.customer_address ? `<tr><td style="padding:5px 0; color:#64748b; vertical-align:top;">Address</td><td style="padding:5px 0; color:#0A2F52;">${data.customer_address}</td></tr>` : ""}
              </table>
            </td>
          </tr>

          <!-- Service -->
          <tr>
            <td style="padding:18px 28px 4px 28px; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#0EA5E9; font-weight:bold; margin-bottom:10px;">Service</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px; color:#0f172a;">
                <tr><td style="padding:4px 0; color:#64748b; width:90px; vertical-align:top;">Type</td><td style="padding:4px 0; vertical-align:top;">${isMobile ? "Mobile" : "Drop-off"}</td></tr>
                <tr><td style="padding:4px 0; color:#64748b; vertical-align:top;">Vehicle</td><td style="padding:4px 0; vertical-align:top;">${carSizeDisplay(data.vehicle_size)}${data.vehicle_model ? ` &middot; ${data.vehicle_model}` : ""}</td></tr>
                <tr><td style="padding:4px 0; color:#64748b; vertical-align:top;">Address</td><td style="padding:4px 0; vertical-align:top;">${addressDisplay(data.customer_address)}</td></tr>
              </table>
            </td>
          </tr>

          <!-- Services & pricing -->
          <tr>
            <td style="padding:18px 28px 4px 28px; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#0EA5E9; font-weight:bold; margin-bottom:10px;">Services</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px; color:#0f172a;">
                ${interiorPackageName ? `<tr><td style="padding:5px 0; border-bottom:1px solid #eef2f6;">Interior: ${interiorPackageName}</td></tr>` : ""}
                ${exteriorPackageName ? `<tr><td style="padding:5px 0; border-bottom:1px solid #eef2f6;">Exterior: ${exteriorPackageName}</td></tr>` : ""}
                ${
                  addOnsData && addOnsData.length > 0
                    ? addOnsData.map((a) => `<tr><td style="padding:5px 0; border-bottom:1px solid #eef2f6;">Add-on: ${a.name}</td></tr>`).join("")
                    : ""
                }
                ${appliedMonthlyPlanId ? `<tr><td style="padding:5px 0; border-bottom:1px solid #eef2f6;">Monthly Plan: ${monthlyPlanName}${planData ? (planData.discount_type === 'percentage' ? ' (' + planData.discount_value + '% off)' : ' ($' + Number(planData.discount_value).toFixed(2) + ' off)') : ''}</td></tr>` : ""}
                ${data.applied_promo_code ? `<tr><td style="padding:5px 0; border-bottom:1px solid #eef2f6;">Promo: ${data.applied_promo_code}${(data.promo_discount && Number(data.promo_discount) > 0) ? ` (-$${Number(data.promo_discount).toFixed(2)})` : ''}</td></tr>` : ''}
              </table>
            </td>
          </tr>

          <!-- Notes -->
          <tr>
            <td style="padding:18px 28px 8px 28px; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#0EA5E9; font-weight:bold; margin-bottom:8px;">Notes</div>
              <p style="margin:0; font-size:14px; line-height:1.6; color:${data.customer_notes ? '#0f172a' : '#94a3b8'};">${data.customer_notes ? data.customer_notes : "None"}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 28px 28px 28px; font-family:Arial,Helvetica,sans-serif; text-align:center;">
              <p style="margin:0; font-size:11px; color:#a8b4c0; border-top:1px solid #eef2f6; padding-top:16px;">Automated notification from your booking system.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    // Send confirmation email
    try {
      const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: data.customer_email,
          subject: `Booking confirmed - ${bookingDateLong} | Andrew's Auto Detail & Car Wash`,
          body: emailHtml,
        }),
      });
      if (emailResponse.ok) {
        console.log("✅ Customer confirmation email sent successfully");
      } else {
        console.error("❌ Failed to send customer email:", await emailResponse.text());
      }
    } catch (emailError) {
      console.error("❌ Customer email send error:", emailError);
    }

    // Build a vCard (.vcf) for the customer so the owner can tap it in the email
    // and create a fully pre-filled contact (name, phone, email, address) in one tap.
    const vcardEscape = (s: string) =>
      String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
    // N is "Family;Given;Additional;Prefix;Suffix" — split on the last space so
    // the contact's first/last name fields come out right instead of dumping the
    // whole name into "last name".
    const vcardSplitName = (full: string) => {
      const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return { first: "", last: "" };
      if (parts.length === 1) return { first: parts[0], last: "" };
      return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
    };
    const { first: vcardFirst, last: vcardLast } = vcardSplitName(data.customer_name);
    const vcardLines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${vcardEscape(data.customer_name)}`,
      `N:${vcardEscape(vcardLast)};${vcardEscape(vcardFirst)};;;`,
      data.customer_phone ? `TEL;TYPE=CELL:${vcardEscape(data.customer_phone)}` : "",
      data.customer_email ? `EMAIL;TYPE=INTERNET:${vcardEscape(data.customer_email)}` : "",
      data.customer_address ? `ADR;TYPE=HOME:;;${vcardEscape(data.customer_address)};;;;` : "",
      "ORG:Andrew's Auto Detail Customer",
      "END:VCARD",
    ].filter(Boolean);
    const vcard = vcardLines.join("\r\n");
    // base64-encode the UTF-8 vCard for the Resend attachment content field.
    const vcardBase64 = btoa(unescape(encodeURIComponent(vcard)));
    const vcardFilename = `${String(data.customer_name || "contact").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "contact"}.vcf`;

    // Send notification email to owner (skipped for owner previews — no point
    // notifying the owner about their own test).
    if (!isOwnerTest) try {
      const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") || "andrewswashing@gmail.com";
      const ownerEmailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: OWNER_EMAIL,
          subject: `New booking - ${data.customer_name} - ${bookingDateLong} ($${Number(data.total_price).toFixed(2)})`,
          body: ownerEmailHtml,
          attachments: [{ filename: vcardFilename, content: vcardBase64 }],
        }),
      });
      if (ownerEmailResponse.ok) {
        console.log("✅ Owner notification email sent successfully");
      } else {
        console.error("❌ Failed to send owner email:", await ownerEmailResponse.text());
      }
    } catch (ownerEmailError) {
      console.error("❌ Owner email send error:", ownerEmailError);
    }

    // Calendar event (optional; skipped for owner previews — nothing persisted).
    if (!isOwnerTest) try {
      const calendarResponse = await fetch(`${SUPABASE_URL}/functions/v1/create-calendar-event`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: `Car Wash - ${data.customer_name}`,
          description: `Service: ${data.service_type}\nVehicle: ${data.vehicle_size} - ${data.vehicle_model || ''}\nPrice: $${data.total_price}`,
          startDateTime: `${data.booking_date}T${data.start_time}`,
          endDateTime: `${data.booking_date}T${data.end_time}`,
          attendees: [data.customer_email],
        }),
      });
      if (calendarResponse.ok) {
        console.log("Calendar event created");
      } else {
        console.error("Failed to create calendar event:", await calendarResponse.text());
      }
    } catch (calendarError) {
      console.error("Calendar creation error:", calendarError);
    }

    return new Response(JSON.stringify({
      booking: data,
      success: true,
      test: isOwnerTest,
      site_discount: siteDiscountActive ? { percent: siteDiscountPercent, amount: siteDiscount } : null,
    }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in create-booking function:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
        details: err instanceof Error ? err.stack : String(err),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
});
