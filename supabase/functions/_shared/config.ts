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

// ROADMAP 3.3 — EVERY ONE OF THESE TAKES THE TENANT'S OWN SITE NOW, AND THE
// ARGUMENT IS REQUIRED ON PURPOSE.
//
// Until this item all five were built from the single global `PLATFORM_URL`,
// so a detailer on their own domain still sent confirmation emails whose
// "view, change or cancel" link went to detailingplatform.com — the one seam a
// customer can see, in the one artifact the detailer did not write (contract
// §6a). `siteFor()` in `./tenantSite.ts` is what resolves it, and it returns
// `PLATFORM_URL` for every tenant without a verified domain, which is all of
// them today.
//
// **A DEFAULT WOULD HAVE BEEN THE WRONG CHOICE AND IT WAS CONSIDERED.**
// `site = PLATFORM_URL` makes every existing call keep working untouched —
// and makes a call site that FORGETS the tenant silently keep the seam,
// which is this repo's most repeated failure wearing a new hat. Required, a
// forgotten argument is `undefined` in the URL, and
// `scripts/render-emails.mjs` already fails on the string "undefined"
// appearing anywhere in a rendered email.
//
// `site` is an ORIGIN with no trailing slash: `https://book.example.com`.

// Where a business's public booking page lives.
export function businessSiteUrl(site: string, slug: string): string {
  return `${site}/book/${slug}`;
}

// The customer's own page for one booking: view, reschedule, cancel. The
// booking id is the credential, so the slug is not part of the path — the
// receipt endpoint resolves the business from the booking itself.
export function receiptUrl(site: string, bookingId: string): string {
  return `${site}/booking/${bookingId}`;
}

// ROADMAP 2.14 STEP 3 — a plan member's own page. Same access model as
// receiptUrl above and for the same reason: the membership UUID is the
// credential, which is what let the owner's customer-account idea ship as a
// link instead of an auth system (round 3 of the plans research).
export function planUrl(site: string, memberId: string): string {
  return `${site}/plan/${memberId}`;
}

// Where a business publishes its plans. A page of its own rather than a step
// inside the booking flow — 7 of 7 sampled detailers and 5 of 6 products put
// plans beside the flow, and the booking page's step budgets are measured to
// 10px of spare room.
export function plansUrl(site: string, slug: string): string {
  return `${site}/book/${slug}/plans`;
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
export function unsubscribeUrl(site: string, customerId: string): string {
  return `${site}/unsubscribe/${customerId}`;
}

// A hostname to the origin we send people to. Not a URL join — every host we
// store is a bare hostname (the column's own check), and https is not
// negotiable for a page that carries somebody's booking.
export const originForHost = (host?: string | null): string =>
  host ? `https://${String(host).replace(/^https?:\/\//, "").replace(/\/+$/, "")}` : PLATFORM_URL;
