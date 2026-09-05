// The one internal path for sending tenant mail: builds the tenant's brand
// object and posts to the send-email relay function. Every edge function
// sends email through here; only send-email/index.ts knows the provider.

import { SERVICE_ROLE_KEY, SUPABASE_URL, supabase } from "./db.ts";
import { businessSiteUrl } from "./config.ts";
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
    siteUrl: businessSiteUrl(business.slug),
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
  businessId: string;
  to: string;
  subject: string;
  html: string;
  /** The plain-text alternative. Every template derives one; see emailKit. */
  text?: string;
  attachments?: Attachment[];
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
      }),
    });
    if (!res.ok) console.error("send-email relay failed:", await res.text());
    return res.ok;
  } catch (e) {
    console.error("send-email relay error:", e);
    return false;
  }
}
