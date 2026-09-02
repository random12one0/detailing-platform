// The one internal path for sending tenant mail: builds the tenant's brand
// object and posts to the send-email relay function. Every edge function
// sends email through here; only send-email/index.ts knows the provider.

import { SERVICE_ROLE_KEY, SUPABASE_URL, supabase } from "./db.ts";
import { businessSiteUrl } from "./config.ts";
import type { Business } from "./tenant.ts";
import type { BusinessSettings } from "./tenant.ts";
import type { TenantBrand } from "./emailTemplates.ts";
import { emailBrandColors } from "./brandColor.js";

// The house colours an unbranded business sends with. There is no second
// one any more: a tenant has ONE accent (law 11), and the email derives its
// band, its band ink and its on-paper value from that single hex.
const DEFAULT_BRAND = "#0f172a";

export async function buildBrand(business: Business, settings: BusinessSettings): Promise<TenantBrand> {
  const { data: branding } = await supabase
    .from("business_branding")
    .select("primary_color")
    .eq("business_id", business.id)
    .maybeSingle();
  return {
    businessId: business.id,
    slug: business.slug,
    brandName: business.name,
    contactEmail: business.contact_email,
    contactPhone: business.contact_phone,
    dropoffAddress: business.dropoff_address,
    siteUrl: businessSiteUrl(business.slug),
    // ONE COLOUR IN, THREE OUT, AND EACH CORRECTED AGAINST THE GROUND IT
    // LANDS ON. `secondary_color` is no longer read here: "Your colour"
    // writes the same hex to both columns, so reading the second one bought
    // nothing and, before this, drew a rule the same colour as the band
    // underneath it. brandColor.js carries the whole reasoning.
    ...(() => {
      const c = emailBrandColors(branding?.primary_color || DEFAULT_BRAND);
      return { primaryColor: c.band, headerInk: c.bandInk, accentColor: c.onPaper };
    })(),
    googleReviewUrl: settings.google_review_url,
    yelpReviewUrl: settings.yelp_review_url,
    paymentMethodsLine: null,
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
