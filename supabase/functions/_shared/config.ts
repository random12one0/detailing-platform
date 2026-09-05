// Platform-wide configuration.
//
// PLATFORM_URL is read from the environment so a deployment can point at
// wherever it actually lives. detailingplatform.com is the real, purchased
// domain (2026-08-27).
//
// THESE PATHS MUST MATCH app/src/main.jsx. They did not: this file emitted
// /{slug} and /{slug}/booking/{id} while the router serves /book/:slug and
// /booking/:id. The result was that "View, change or cancel this booking"
// in a customer's confirmation email fell through to the catch-all route
// and showed them the STAFF SIGN-IN screen. Caught end-to-end in a browser,
// not by any unit test — nothing had ever followed the link.

const DEFAULT_PLATFORM_URL = "https://detailingplatform.com";

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

// ROADMAP 2.14 STEP 3 — a plan member's own page. Same access model as
// receiptUrl above and for the same reason: the membership UUID is the
// credential, which is what let the owner's customer-account idea ship as a
// link instead of an auth system (round 3 of the plans research).
export function planUrl(memberId: string): string {
  return `${PLATFORM_URL}/plan/${memberId}`;
}

// Where a business publishes its plans. A page of its own rather than a step
// inside the booking flow — 7 of 7 sampled detailers and 5 of 6 products put
// plans beside the flow, and the booking page's step budgets are measured to
// 10px of spare room.
export function plansUrl(slug: string): string {
  return `${PLATFORM_URL}/book/${slug}/plans`;
}

// All tenant mail is sent from the platform's own domain (one verified
// sending domain), with the tenant's brand as the display name and the
// tenant's contact address as Reply-To.
//
// The sending domain is the SUBDOMAIN email.detailingplatform.com, verified
// in Resend 2026-08-29. The bare domain detailingplatform.com is NOT a
// verified sender and never was — sending from it fails. Keeping mail on a
// subdomain is deliberate: the platform's sending reputation stays separate
// from the root domain that serves the site.
//
// This default cost a week once already: it used to read
// bookings@detailingplatform.com while the deployed secret was Resend's
// SHARED sandbox sender onboarding@resend.dev, which Resend delivers only to
// the account owner's own address and rejects (403) for everyone else —
// before creating an email record, so the Resend dashboard showed nothing at
// all. If mail ever goes silent again, read the edge function logs first.
//
// It is deliberately NOT derived from PLATFORM_URL: a preview deployment
// must not silently change which domain mail claims to come from — that is a
// deliverability decision, not a URL one.
export const PLATFORM_FROM_ADDRESS =
  Deno.env.get("PLATFORM_FROM_ADDRESS") || "bookings@email.detailingplatform.com";

// ROADMAP 2.19 — a customer's own opt-out page. Same access model as
// receiptUrl and planUrl above: the row's UUID is the credential, so there is
// no token to sign, expire or leak. MUST MATCH app/src/main.jsx — the comment
// at the top of this file records what it cost the last time one of these
// paths and the router disagreed.
export function unsubscribeUrl(customerId: string): string {
  return `${PLATFORM_URL}/unsubscribe/${customerId}`;
}
