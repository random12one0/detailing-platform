// Platform-wide configuration. detailplatform.com is a PLACEHOLDER domain —
// when the real domain exists, change it here and nowhere else.

export const PLATFORM_DOMAIN = "detailplatform.com";

// Where a business's public booking site lives. Custom domains come later
// (business_domains table); until then every tenant is a path on the platform.
export function businessSiteUrl(slug: string): string {
  return `https://${PLATFORM_DOMAIN}/${slug}`;
}

export function receiptUrl(slug: string, bookingId: string): string {
  return `${businessSiteUrl(slug)}/booking/${bookingId}`;
}

// All tenant mail is sent from the platform's own domain (one verified
// sending domain), with the tenant's brand as the display name and the
// tenant's contact address as Reply-To.
export const PLATFORM_FROM_ADDRESS = `bookings@${PLATFORM_DOMAIN}`;
