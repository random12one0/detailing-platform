// Platform-wide configuration.
//
// PLATFORM_URL is read from the environment so a deployment can point at
// wherever it actually lives; detailplatform.com is the PLACEHOLDER default
// for when the real domain exists. Without the override every confirmation
// email links to a domain that does not resolve.
//
// THESE PATHS MUST MATCH app/src/main.jsx. They did not: this file emitted
// /{slug} and /{slug}/booking/{id} while the router serves /book/:slug and
// /booking/:id. The result was that "View, change or cancel this booking"
// in a customer's confirmation email fell through to the catch-all route
// and showed them the STAFF SIGN-IN screen. Caught end-to-end in a browser,
// not by any unit test — nothing had ever followed the link.

const DEFAULT_PLATFORM_URL = "https://detailplatform.com";

// Normalised once: no trailing slash, so joins below are unambiguous.
export const PLATFORM_URL =
  (Deno.env.get("PLATFORM_URL") || DEFAULT_PLATFORM_URL).replace(/\/+$/, "");

export const PLATFORM_DOMAIN = PLATFORM_URL.replace(/^https?:\/\//, "");

// Where a business's public booking page lives. Custom domains come later
// (business_domains table); until then every tenant is a path on the platform.
export function businessSiteUrl(slug: string): string {
  return `${PLATFORM_URL}/book/${slug}`;
}

// The customer's own page for one booking: view, reschedule, cancel. The
// booking id is the credential, so the slug is not part of the path — the
// receipt endpoint resolves the business from the booking itself.
export function receiptUrl(_slug: string, bookingId: string): string {
  return `${PLATFORM_URL}/booking/${bookingId}`;
}

// All tenant mail is sent from the platform's own domain (one verified
// sending domain), with the tenant's brand as the display name and the
// tenant's contact address as Reply-To.
//
// Overridable by environment because the placeholder domain is not a real
// verified sender, so nothing would leave the building. It is deliberately
// NOT derived from PLATFORM_URL: a preview deployment must not silently
// change which domain mail claims to come from — that is a deliverability
// decision, not a URL one.
export const PLATFORM_FROM_ADDRESS =
  Deno.env.get("PLATFORM_FROM_ADDRESS") || "bookings@detailplatform.com";
