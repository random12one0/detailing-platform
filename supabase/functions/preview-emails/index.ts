// ROADMAP 4.2 — "what does my customer actually get?"
//
// Input: { business_id? }   Member-gated.
//
// The old site answered this with a token on `create-booking` that sent every
// email and persisted nothing (`reference/.../create-booking/index.ts:965`,
// `isOwnerTest`). The conversion dropped it, and the only answer left is to
// make a real booking and delete it — which leaves a row, an email to a real
// address, and a hole in somebody's calendar.
//
// **IT IS ITS OWN FUNCTION RATHER THAN A FLAG ON `create-booking`, and that is
// a deliberate refusal.** The obvious build is `preview: true` threading past
// the slot gate, the promo limit, the customer upsert and the insert — four
// new branches through **the single most important function in the product**,
// every one of them a path the e2e does not walk, to save a customer nothing.
// A booking engine that is a little bit conditional is how a booking engine
// starts being wrong.
//
// **WHAT THAT COSTS, STATED HONESTLY: this does not exercise the insert.** It
// exercises everything a detailer is actually asking about — their brand,
// their colour, their logo, their prices through the REAL engine, their own
// wording — and nothing about whether a row lands. `e2e-booking.mjs` is what
// covers the row.
//
// EVERY EMAIL GOES TO THE DETAILER'S OWN ADDRESSES. Never to a typed one:
// a preview that can be pointed at an address is a way to make this platform
// email a stranger with a real business's branding on it.
//
// AND THE SUBJECT SAYS SO. A preview lands in the same inbox as the real
// alerts, and one forwarded to a customer with a dead receipt link inside it
// is worse than no preview at all.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { getSettings, requireMember } from "../_shared/tenant.ts";
import {
  computeQuote, matchPriceRules, resolveAddOns, resolveServices,
  resolveTravel, whenContextFor,
} from "../_shared/pricing.ts";
import { buildBrand, ownerRecipients, sendTenantEmail } from "../_shared/email.ts";
import { customerConfirmationEmail, ownerNewBookingEmail } from "../_shared/emailTemplates.ts";
import { receiptUrl } from "../_shared/config.ts";
import { siteFor } from "../_shared/tenantSite.ts";
import { vcardAttachment } from "../_shared/vcard.ts";
import { localDateTimeToInstant, timeStrIn, weekdayOf } from "../_shared/tz.ts";

const PREFIX = "[Preview] ";

// A made-up customer, clearly made up. Not a real-looking name: a detailer
// scanning their inbox has to be able to tell this from a booking, and the
// subject line alone is read at a glance.
const SAMPLE = {
  name: "Sample Customer",
  phone: "555-0100",
  email: "sample@example.com",
  address: "12 Example Street",
  notes: "This is a sample booking — nothing has been saved.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json().catch(() => ({}));
    const member = await requireMember(req, body.business_id ?? null);
    if (!member) return json({ error: "Unauthorized" }, 401);

    const { data: business } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", member.businessId)
      .single();
    if (!business) return json({ error: "unknown_business" }, 404);
    const settings = await getSettings(business.id);

    const to = ownerRecipients(business, settings);
    if (to.length === 0) {
      // NAMED IN THE DETAILER'S TERMS, and it is a real state rather than an
      // error: a business with no contact email and no notification list has
      // nowhere for ANY alert to go, which is worth finding out here rather
      // than on the first real booking.
      return json({ error: "There's no email address on your business yet, so there's nowhere to send it. Add one on Business info." }, 400);
    }

    // THE DETAILER'S OWN FIRST SERVICE, not an invented one. The whole point
    // is to see THEIR prices in THEIR email; a fabricated £100 service would
    // preview somebody else's business.
    const { data: svcRows } = await supabase
      .from("services")
      .select("id")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("sort_order")
      .limit(1);
    if (!svcRows?.length) {
      return json({ error: "You haven't listed a service yet, so there's no price to show. Add one on Services & add-ons." }, 400);
    }

    const services = await resolveServices(supabase, business.id, [svcRows[0].id]);
    const addOns = await resolveAddOns(supabase, business.id, []);

    // Tomorrow at 10:00, in the business's own timezone. A fixed date would
    // eventually be in the past, and a past date in a confirmation email reads
    // as a bug in the product rather than as a sample.
    const now = new Date();
    const tz = business.timezone;
    const local = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
      .format(new Date(now.getTime() + 24 * 60 * 60 * 1000));
    const bookingDate = local;
    const startTime = "10:00";

    const serviceType = settings.mobile_enabled ? "mobile" : "dropoff";
    const sizes = Array.isArray(settings.vehicle_sizes) && settings.vehicle_sizes.length
      ? settings.vehicle_sizes
      : [{ key: "small", label: "Small" }];
    const vehicleSize = String(sizes[0].key);
    const travel = resolveTravel(settings, serviceType, settings.travel_zones?.[0]?.key ?? null);
    const when = whenContextFor(business.timezone, bookingDate, startTime, localDateTimeToInstant, weekdayOf);
    const adjustments = matchPriceRules(settings.price_rules, when);

    // THE SAME ENGINE `create-booking` RUNS. Every figure in the preview is a
    // figure this business would really charge — which is the only thing that
    // makes the preview worth looking at, and the reason this function
    // imports the pricing module rather than making numbers up.
    const quote = computeQuote({
      services,
      addOns,
      vehicleSize,
      siteDiscountPercent: settings.site_discount_active ? Number(settings.site_discount_percent) : 0,
      promo: null,
      roundingNearest: Number(settings.price_rounding_nearest),
      travelFee: travel.fee,
      adjustments,
      plan: null,
    });

    const startAt = localDateTimeToInstant(tz, bookingDate, startTime);
    const endAt = new Date(startAt.getTime() + quote.totalDurationMinutes * 60 * 1000);
    const brand = await buildBrand(business, settings);
    const site = await siteFor(supabase, business.id);
    const isRequest = settings.booking_mode === "request";

    const emailData = {
      // A zero UUID rather than a plausible one: the receipt link in a preview
      // cannot work — there is no booking — and a link that 404s on an id
      // shaped like every other id is the confusing version. This one is
      // visibly nothing.
      id: "00000000-0000-0000-0000-000000000000",
      customerName: SAMPLE.name,
      customerPhone: SAMPLE.phone,
      customerEmail: SAMPLE.email,
      customerAddress: serviceType === "mobile" ? SAMPLE.address : null,
      dateStr: bookingDate,
      startTime: timeStrIn(tz, startAt),
      endTime: timeStrIn(tz, endAt),
      serviceType,
      vehicleSize,
      vehicleModel: "2019 Honda Civic",
      customerNotes: SAMPLE.notes,
      serviceNames: services.map((s) => s.name),
      addOnNames: [],
      travelFee: quote.travelFee,
      travelZone: travel.zone,
      adjustments: quote.adjustmentLines,
      subtotal: quote.subtotalAfterSite,
      siteDiscount: quote.siteDiscount,
      siteDiscountPercent: settings.site_discount_active ? Number(settings.site_discount_percent) : 0,
      promoCode: null,
      promoDiscount: 0,
      total: quote.total,
      receiptUrl: receiptUrl(site, "00000000-0000-0000-0000-000000000000"),
    };

    const customer = customerConfirmationEmail(brand, emailData, isRequest);
    const owner = ownerNewBookingEmail(brand, emailData, isRequest);
    const card = [vcardAttachment({
      name: SAMPLE.name, phone: SAMPLE.phone, email: SAMPLE.email,
      address: SAMPLE.address, org: `${business.name} customer`,
    })];

    let sent = 0;
    for (const address of to) {
      // BOTH SIDES, because they are different emails and a detailer has
      // never seen either. The customer's is the one they are really asking
      // about; their own is the one that carries the contact card.
      if (await sendTenantEmail({
        businessId: business.id, to: address,
        subject: PREFIX + customer.subject, html: customer.html, text: customer.text,
      })) sent++;
      if (await sendTenantEmail({
        businessId: business.id, to: address,
        subject: PREFIX + owner.subject, html: owner.html, text: owner.text,
        attachments: card,
      })) sent++;
    }

    return json({ success: true, sent, to, total: quote.total });
  } catch (error) {
    console.error("preview-emails error:", error);
    return json({ error: (error as Error)?.message || "internal_error" }, 400);
  }
});
