// The one internal path for sending tenant mail: builds the tenant's brand
// object and posts to the send-email relay function. Every edge function
// sends email through here; only send-email/index.ts knows the provider.

import { SERVICE_ROLE_KEY, SUPABASE_URL, supabase } from "./db.ts";
import { businessSiteUrl } from "./config.ts";
import { siteFor } from "./tenantSite.ts";
import type { Business } from "./tenant.ts";
import type { BusinessSettings } from "./tenant.ts";
import type { TenantBrand } from "./emailTemplates.ts";
import { paymentHandles } from "./payments.ts";
import { emailDarkBrandColors } from "./brandColor.js";

// What an unbranded business sends with. The house accent, because the email
// ground is now the product's own near-black and a slate hex on it is not a
// brand, it is a smudge. A tenant has ONE accent (law 11) and the email
// derives all three of its values from that single hex.
const DEFAULT_BRAND = "#38E08B";

export async function buildBrand(business: Business, settings: BusinessSettings): Promise<TenantBrand> {
  const { data: branding } = await supabase
    .from("business_branding")
    .select("primary_color, logo_url")
    .eq("business_id", business.id)
    .maybeSingle();
  // ONE COLOUR IN, THREE OUT, EACH CORRECTED AGAINST THE GROUND IT LANDS ON.
  // Roadmap 2.18 moved the email onto the product's own near-black, so these
  // are the DARK values now: the accent as words and as a fill on `--ink-2`
  // (the lightest surface either can land on), plus the measured ink that goes
  // on the fill. `secondary_color` is still not read — "Your colour" writes
  // the same hex to both columns. brandColor.js carries the whole reasoning.
  const c = emailDarkBrandColors(branding?.primary_color || DEFAULT_BRAND);
  return {
    brandName: business.name,
    contactEmail: business.contact_email,
    contactPhone: business.contact_phone,
    // ROADMAP 3.3 — the tenant's OWN origin where one is verified, and
    // PLATFORM_URL for everybody else. This is the choke point every email's
    // brand passes through, so a detailer on their own domain gets their own
    // domain in the masthead link of all sixteen templates at once.
    siteUrl: businessSiteUrl(await siteFor(supabase, business.id), business.slug),
    // FIRST TIME IN THE PRODUCT'S LIFE THAT AN EMAIL CARRIES THE LOGO. The
    // column has existed since the first migration and is already drawn on
    // three customer-facing pages; `buildBrand` had simply never read it.
    logoUrl: branding?.logo_url || null,
    accent: c.text,
    accentFill: c.fill,
    accentInk: c.fillInk,
    dropoffAddress: business.dropoff_address,
    googleReviewUrl: settings.google_review_url,
    yelpReviewUrl: settings.yelp_review_url,
    // The detailer's own paragraph per email kind. `{}` for every business
    // that has not written one, which is all of them until they do — the
    // templates render nothing when a key is absent.
    messages: (settings.email_messages ?? {}) as Record<string, string | null>,
    // Roadmap 2.20 stage 1. Normalised once, here, so no template ever sees a
    // raw `pay_*` column — `_shared/payments.ts` is the one place that decides
    // what a handle displays as and whether it can safely be linked. `[]` for
    // every business that has not filled the form in, and the templates then
    // draw nothing at all.
    payment: paymentHandles(settings),
  };
}

// Where owner alerts go: the configured list, or the business contact
// address when the list is empty, so notifications never silently stop.
/**
 * ROADMAP 8.10 — THE VEHICLES AFTER THE FIRST, FOR AN EMAIL'S FACT ROW.
 *
 * Eight edge functions assemble a `BookingEmailData` and seven of them read a
 * booking row that says nothing about a second car. **A sender that forgets
 * this produces a perfectly valid email naming one car for a three-car job**,
 * and nothing on any screen ever reports it — the same invisible shape as a
 * `site` argument forgotten at one of thirteen call sites (roadmap 3.3).
 *
 * So it is ONE function, called by every sender, and
 * `tests/multi-vehicle.test.mjs` discovers the senders by reading the source
 * rather than trusting a list in a comment: a hand-written caller list in this
 * repo has already been short by one.
 *
 * The LABEL is what an email prints, exactly as the primary vehicle prints
 * `vehicle_size_label || vehicle_size`.
 */
// deno-lint-ignore no-explicit-any
export async function extraVehiclesFor(bookingId: string): Promise<{ size: string; model: string | null }[]> {
  const { data } = await supabase
    .from("booking_vehicles")
    .select("position, vehicle_size, vehicle_size_label, vehicle_model")
    .eq("booking_id", bookingId)
    .order("position");
  // deno-lint-ignore no-explicit-any
  return (data ?? []).map((v: any) => ({
    size: v.vehicle_size_label || v.vehicle_size,
    model: v.vehicle_model ?? null,
  }));
}

export function ownerRecipients(business: Business, settings: BusinessSettings): string[] {
  const list = (settings.notification_emails ?? []).map((e) => String(e).trim()).filter(Boolean);
  if (list.length) return [...new Set(list)];
  return business.contact_email ? [business.contact_email] : [];
}

export interface Attachment {
  filename: string;
  content: string; // base64
}

// Best-effort by design: an email failure must never fail a booking.
export async function sendTenantEmail(opts: {
  /**
   * OPTIONAL ONLY FOR PLATFORM MAIL — roadmap 8.12.
   *
   * Every email a DETAILER sends is a fact about one business, and omitting
   * this is a 400 from `send-email` rather than a quietly unbranded send. The
   * one direction with no tenant at all is the platform talking about its own
   * plumbing (the dead man's switch), and that is exactly the case
   * `senderName` already marks.
   */
  businessId?: string;
  to: string;
  subject: string;
  html: string;
  /** The plain-text alternative. Every template derives one; see emailKit. */
  text?: string;
  attachments?: Attachment[];
  /**
   * ROADMAP 2.20 STAGE 2 — the one direction that is not a detailer speaking.
   *
   * Present ONLY for platform billing mail, where the sender is us rather than
   * the tenant. It swaps the `From:` display name and tells `send-email` this
   * is not a message to a customer, so the bounce flag stays off a row that
   * merely shares an address with the detailer's own contact email.
   */
  senderName?: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        business_id: opts.businessId,
        to: opts.to,
        subject: opts.subject,
        body: opts.html,
        text: opts.text,
        attachments: opts.attachments,
        sender_name: opts.senderName,
      }),
    });
    if (!res.ok) console.error("send-email relay failed:", await res.text());
    return res.ok;
  } catch (e) {
    console.error("send-email relay error:", e);
    return false;
  }
}
