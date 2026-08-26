// The reminder sweep — runs every ~15 minutes (scheduler), covering EVERY
// business. Due-ness is computed in SQL per business from that business's
// own settings and timezone (get_bookings_due_for_* functions). Also serves
// a manual member-gated mode: { business_id?, booking_id, target } re-sends
// one reminder on demand.
//
// Reminder kinds, all settings-driven:
//   * customer + owner appointment reminders (evening-before rule included)
//  * "starting soon" owner push, "wrapping up" push, "finalize payment" push
//   * one morning digest per business per local day at daily_digest_hour

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { businessById, getSettings, requireMember, type Business } from "../_shared/tenant.ts";
import { buildBrand, sendTenantEmail } from "../_shared/email.ts";
import { customerReminderEmail, formatTime12hr, ownerNewBookingEmail } from "../_shared/emailTemplates.ts";
import { sendOwnerPush } from "../_shared/ownerPush.ts";
import { receiptUrl } from "../_shared/config.ts";
import { dateStrIn, hourIn, timeStrIn } from "../_shared/tz.ts";

// deno-lint-ignore no-explicit-any
type BookingRow = any;

const bizCache = new Map<string, Business>();
async function biz(id: string): Promise<Business> {
  if (!bizCache.has(id)) bizCache.set(id, (await businessById(id))!);
  return bizCache.get(id)!;
}

function emailDataFor(business: Business, b: BookingRow) {
  const tz = business.timezone;
  return {
    id: b.id,
    customerName: b.customer_name,
    customerPhone: b.customer_phone,
    customerEmail: b.customer_email,
    customerAddress: b.customer_address,
    dateStr: dateStrIn(tz, new Date(b.start_at)),
    startTime: timeStrIn(tz, new Date(b.start_at)),
    endTime: timeStrIn(tz, new Date(b.end_at)),
    serviceType: b.service_type,
    vehicleSize: b.vehicle_size,
    vehicleModel: b.vehicle_model,
    customerNotes: b.customer_notes,
    serviceNames: [],
    addOnNames: [],
    subtotal: Number(b.subtotal),
    siteDiscount: 0,
    siteDiscountPercent: 0,
    promoCode: b.applied_promo_code,
    promoDiscount: Number(b.promo_discount) || 0,
    total: Number(b.total_price),
    receiptUrl: receiptUrl(business.slug, b.id),
  };
}

async function sendCustomerReminder(b: BookingRow) {
  const business = await biz(b.business_id);
  const settings = await getSettings(business.id);
  const brand = await buildBrand(business, settings);
  const msg = customerReminderEmail(brand, emailDataFor(business, b));
  await sendTenantEmail({ businessId: business.id, to: b.customer_email, subject: msg.subject, html: msg.html });
}

async function sendOwnerReminder(b: BookingRow) {
  const business = await biz(b.business_id);
  const settings = await getSettings(business.id);
  const brand = await buildBrand(business, settings);
  const data = emailDataFor(business, b);
  // The owner reminder reuses the owner notification layout — same info, new
  // subject line.
  const msg = ownerNewBookingEmail(brand, data);
  if (brand.contactEmail) {
    await sendTenantEmail({
      businessId: business.id,
      to: brand.contactEmail,
      subject: `Upcoming job - ${data.customerName} - ${data.dateStr} at ${formatTime12hr(data.startTime)}`,
      html: msg.html,
    });
  }
  await sendOwnerPush(business.id, {
    title: "Upcoming job reminder",
    body: `${b.customer_name} — ${formatTime12hr(data.startTime)}`,
    url: `/admin/job/${b.id}`,
    tag: `booking-${b.id}`,
  }).catch((e) => console.error("push failed", e));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json().catch(() => ({}));

    // --- Manual mode: one booking, member-gated -----------------------------
    if (body.booking_id) {
      const member = await requireMember(req, body.business_id ?? null);
      if (!member) return json({ error: "Unauthorized" }, 401);
      const { data: b } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", body.booking_id)
        .eq("business_id", member.businessId)
        .maybeSingle();
      if (!b) return json({ error: "Booking not found" }, 404);

      if (body.target === "customer") {
        if (!b.customer_email) return json({ error: "This booking has no customer email on file." }, 400);
        await sendCustomerReminder(b);
        return json({ success: true, count: 1 });
      }
      await sendOwnerReminder(b);
      await supabase.from("bookings").update({ owner_reminder_sent_at: new Date().toISOString() }).eq("id", b.id);
      return json({ success: true, count: 1 });
    }

    // --- Scheduled sweep (idempotent; every send is marker-guarded) ---------
    const results: { id: string; kind: string; sent: boolean; error?: string }[] = [];
    const mark = (id: string, col: string) =>
      supabase.from("bookings").update({ [col]: new Date().toISOString() }).eq("id", id);

    const [ownerDue, customerDue, nudgeDue, wrapupDue, finalizeDue] = await Promise.all([
      supabase.rpc("get_bookings_due_for_reminder", { target: "owner" }),
      supabase.rpc("get_bookings_due_for_reminder", { target: "customer" }),
      supabase.rpc("get_bookings_due_for_nudge"),
      supabase.rpc("get_bookings_due_for_wrapup_nudge"),
      supabase.rpc("get_bookings_due_for_finalize_nudge"),
    ]);
    for (const r of [ownerDue, customerDue, nudgeDue, wrapupDue, finalizeDue]) {
      if (r.error) throw r.error;
    }

    for (const b of ownerDue.data || []) {
      try {
        await sendOwnerReminder(b);
        await mark(b.id, "owner_reminder_sent_at");
        results.push({ id: b.id, kind: "owner_reminder", sent: true });
      } catch (e) {
        results.push({ id: b.id, kind: "owner_reminder", sent: false, error: String(e) });
      }
    }
    for (const b of customerDue.data || []) {
      try {
        await sendCustomerReminder(b);
        await mark(b.id, "customer_reminder_sent_at");
        results.push({ id: b.id, kind: "customer_reminder", sent: true });
      } catch (e) {
        results.push({ id: b.id, kind: "customer_reminder", sent: false, error: String(e) });
      }
    }
    for (const b of nudgeDue.data || []) {
      try {
        const business = await biz(b.business_id);
        await sendOwnerPush(business.id, {
          title: "Starting soon",
          body: `${b.customer_name} — ${formatTime12hr(timeStrIn(business.timezone, new Date(b.start_at)))}`,
          url: `/admin/job/${b.id}`,
          tag: `booking-${b.id}`,
        });
        await mark(b.id, "owner_nudge_sent_at");
        results.push({ id: b.id, kind: "nudge", sent: true });
      } catch (e) {
        results.push({ id: b.id, kind: "nudge", sent: false, error: String(e) });
      }
    }
    for (const b of wrapupDue.data || []) {
      try {
        const business = await biz(b.business_id);
        await sendOwnerPush(business.id, {
          title: "Wrapping up soon",
          body: `${b.customer_name} — finalize the payment when you're done`,
          url: `/admin/job/${b.id}`,
          tag: `booking-${b.id}`,
        });
        await mark(b.id, "owner_wrapup_nudge_sent_at");
        results.push({ id: b.id, kind: "wrapup", sent: true });
      } catch (e) {
        results.push({ id: b.id, kind: "wrapup", sent: false, error: String(e) });
      }
    }
    for (const b of finalizeDue.data || []) {
      try {
        const business = await biz(b.business_id);
        await sendOwnerPush(business.id, {
          title: "Finalize payment",
          body: `${b.customer_name} — job ended, payment not finalized yet`,
          url: `/admin/job/${b.id}`,
          tag: `booking-${b.id}`,
        });
        await mark(b.id, "owner_finalize_nudge_sent_at");
        results.push({ id: b.id, kind: "finalize", sent: true });
      } catch (e) {
        results.push({ id: b.id, kind: "finalize", sent: false, error: String(e) });
      }
    }

    // --- Morning digest: per business, once per local day, after that
    // business's own daily_digest_hour. ------------------------------------
    const { data: businesses } = await supabase
      .from("businesses")
      .select("id, slug, name, status, timezone, contact_email, contact_phone, dropoff_address, service_area")
      .eq("status", "active");
    for (const business of (businesses || []) as Business[]) {
      try {
        const settings = await getSettings(business.id);
        const tz = business.timezone;
        if (hourIn(tz) < settings.daily_digest_hour) continue;
        const today = dateStrIn(tz);
        const { data: existing } = await supabase
          .from("owner_daily_digest_state")
          .select("sent_at")
          .eq("business_id", business.id)
          .eq("digest_date", today)
          .maybeSingle();
        if (existing?.sent_at) continue;

        const dayStart = new Date();
        const { data: todays } = await supabase
          .from("bookings")
          .select("id, customer_name, start_at, end_at, total_price")
          .eq("business_id", business.id)
          .neq("status", "cancelled")
          .is("deleted_at", null)
          .gte("start_at", new Date(dayStart.getTime() - 24 * 3600_000).toISOString())
          .lte("start_at", new Date(dayStart.getTime() + 24 * 3600_000).toISOString());
        const jobsToday = (todays || []).filter((b) => dateStrIn(tz, new Date(b.start_at)) === today);
        if (jobsToday.length > 0) {
          jobsToday.sort((a, b) => a.start_at.localeCompare(b.start_at));
          const first = jobsToday[0];
          await sendOwnerPush(business.id, {
            title: `Today: ${jobsToday.length} job${jobsToday.length === 1 ? "" : "s"}`,
            body: jobsToday
              .map((b) => `${formatTime12hr(timeStrIn(tz, new Date(b.start_at)))} ${b.customer_name}`)
              .join(" · "),
            url: `/admin/job/${first.id}`,
            tag: `digest-${today}`,
          });
        }
        await supabase.from("owner_daily_digest_state").upsert(
          { business_id: business.id, digest_date: today, sent_at: new Date().toISOString() },
          { onConflict: "business_id,digest_date" },
        );
      } catch (e) {
        console.error("digest failed for business", business.id, e);
      }
    }

    return json({ success: true, count: results.length, results });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
