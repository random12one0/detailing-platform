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
import { brandFrom } from "./emailKit.ts";
import { readFailed, retryRead } from "./retryRead.ts";
import { reachedProvider } from "./reachedProvider.ts";

// ---------------------------------------------------------------------------
// THE TENANT'S COLOUR NOW GOES THROUGH THE SAME DERIVATION AS OURS — 2026-09-13
// ---------------------------------------------------------------------------
// **Andrew read the real delivered mail out of Resend and found every detailer
// email emitting the literal word `undefined` as a colour** — for `.c-accent`,
// `.bg-accent`, `.c-accent-ink` and `[data-ogsc] .c-accent` — while the
// identical PLATFORM email carried `#38e08b` and `#0b1220`. Reading code would
// not have found it; reading the delivered email did.
//
// **THE CAUSE WAS THAT THIS FUNCTION COMPUTED ONE TRIPLE WHERE SIX ARE
// NEEDED.** `TenantBrand` is `Brand & {...}` and `Brand` declares six colour
// fields — three for the light email every client shows by default, three for
// the dark override Apple Mail swaps in. This called `emailDarkBrandColors`
// only, put the dark values in the LIGHT fields, and left `accentDark`,
// `accentFillDark` and `accentInkDark` absent. `darkStyle()` interpolates them
// straight into a stylesheet, so absent became the word `undefined`.
//
// **AND IT IS A TYPE ERROR THAT SHIPPED.** An object literal missing three
// required fields of its declared return type does not compile — but there is no
// Deno on this machine and the deploy bundler does not type-check, so the
// compiler that would have caught this in a second has never run on it. That is
// worth more than the bug itself: no type error anywhere in `supabase/` is
// currently being caught by anything.
//
// **AND `scripts/render-emails.mjs` HAS CHECKED FOR THE WORD `undefined` SINCE
// IT WAS WRITTEN.** Its rot list is literally `["undefined", /undefined/]` and it
// passed every run, because the previewer builds its fixture with `brandFrom` —
// the correct path — while production used this one. **The instrument bypassed
// the code under test, so the guard that would have caught this sat in the repo,
// green, for as long as the bug existed.** The email preview is not a preview of
// what is sent unless it is built the way what is sent is built.
//
// **THE WORSE HALF WAS THE SAME CAUSE.** The dark values are corrected against
// the `#171B1E` panel and were being printed inline on the `#EFEEE7` PAPER — a
// different ground, with the opposite direction of correction — so a colour that
// was legible where it was computed was arbitrary where it was used.
// `brandColor.js`'s own header says getting that direction backwards is "how the
// same defect has arrived four times". This was the fifth.
//
// `brandFrom` already does all six correctly and is what `platformBrand.ts`
// uses. One derivation, one place; the two paths differing WAS the bug.
//
// ---------------------------------------------------------------------------
// AND AN UNBRANDED DETAILER NO LONGER SENDS IN OUR GREEN — his instruction
// ---------------------------------------------------------------------------
// This file used to hold a `DEFAULT_BRAND` of `#38E08B` — the PLATFORM accent —
// and hand it to a detailer who had never picked a colour. He named both faults:
//
//   1. **It made the detailer's mail look like ours.** `ROADMAP.md` § Not ours
//      to decide already settles the principle — THE COLOUR FOLLOWS WHOSE
//      RELATIONSHIP IS ENDING — and an email from a detailer to their own
//      customer is the detailer's.
//   2. **It was used RAW as a footer link colour on the `#EFEEE7` paper**,
//      because that green already clears 4.5:1 against the dark panel it was
//      corrected against and so came back untouched. On paper it is ~1.5:1 —
//      unreadable.
//
// **THE FALLBACK IS NO COLOUR AT ALL, AND THAT IS A DECISION RATHER THAN AN
// OMISSION.** Passing null lets `brandColor.js` reach for each ground's own ink
// — `#12161A` on paper, `--bone` in dark — which its header describes as making
// an uncorrectable accent "read as ordinary type rather than as a smudge". So an
// unbranded detailer's email is SET IN INK: a dark button with a light label on
// paper, a bone button with a dark label in dark mode. It is legible by
// construction on both grounds, it looks deliberate, and it belongs to nobody.
// The day a detailer picks a colour, their mail gets it.
export async function buildBrand(business: Business, settings: BusinessSettings): Promise<TenantBrand> {
  const { data: branding, error } = await retryRead("buildBrand:branding", () =>
    supabase
      .from("business_branding")
      .select("primary_color, logo_url")
      .eq("business_id", business.id)
      .maybeSingle());
  // A FAILED READ IS NOT AN UNBRANDED BUSINESS. Swallowing it here would send a
  // branded detailer's mail in the neutral ink with no logo and nothing to say
  // it happened — FOUND.md § 85 READS DISCARDED THEIR ERROR is the class.
  if (error) throw readFailed("business_branding", error);
  // ONE COLOUR IN, SIX OUT: three corrected against the light paper and three
  // against the dark panel. `secondary_color` is still not read — "Your colour"
  // writes the same hex to both columns. `brandColor.js` carries the arithmetic
  // and `tests/email-brand.test.mjs` pins it against `lib/theme.js`.
  return {
    ...brandFrom({
      brandName: business.name,
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
    }, branding?.primary_color || null),
    contactEmail: business.contact_email,
    // ROADMAP 99.2c — "today" / "tomorrow" in a subject is the business's day.
    timezone: business.timezone,
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

/**
 * ROADMAP 8.17 STAGE 2A — WHAT LANGUAGE TO WRITE TO A CUSTOMER IN WHEN THERE
 * IS NO BOOKING IN FRONT OF YOU.
 *
 * The maintenance nudge and the detailer's campaign are both addressed to a
 * CUSTOMER rather than to a booking, so there is no `bookings.lang` at the
 * call site. Their most recent booking is where the answer is: it is the last
 * time this person told us anything, and the choice is a fact about how they
 * read rather than about that one appointment.
 *
 * **ENGLISH FOR ANYBODY WHO HAS NEVER BOOKED**, which is the honest answer and
 * also the safe one — the worst case is an email in the language the product
 * was written in.
 *
 * One function rather than the same query at two call sites, for the reason
 * `extraVehiclesFor` above is one: a third caller copies whichever version it
 * finds, and the one it finds is not necessarily the corrected one.
 */
export async function langForCustomer(customerId: string | null | undefined): Promise<string> {
  if (!customerId) return "en";
  const { data } = await supabase
    .from("bookings")
    .select("lang")
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.lang === "es" ? "es" : "en";
}

/**
 * ROADMAP 3.4 FAULT 4 — WHICH LANGUAGE AN ADDRESS READS, for every email that
 * is NOT to a customer. DECISIONS.md 2026-10-06: the language that person chose
 * for the DASHBOARD, English when unknown. Asked per recipient, because the
 * owner list can hold two people who chose differently, or a shared inbox that
 * is nobody's login. `businessId` narrows it to one business's members; left
 * out (the platform owner's alerts, an invite) it is any membership.
 *
 * **ANY FAILURE IS ENGLISH, ON PURPOSE.** Until migration 20261006030000 is
 * applied `recipient_lang` does not exist and this answers "en", so a deploy
 * that lands before the migration changes nothing, and a lookup that breaks
 * later can never cost somebody their alert.
 */
export async function recipientLang(to: string, businessId?: string | null): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("recipient_lang", { p_email: to, p_business: businessId ?? null });
    return !error && data === "es" ? "es" : "en";
  } catch {
    return "en";
  }
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
  /**
   * ROADMAP 3.1 — WHICH BOOKING THIS EMAIL IS ABOUT.
   *
   * 3.1 wants the delivery list linked to booking as well as to detailer and
   * recipient, and its own entry names the obstacle: *"the relay is never told
   * which booking it is sending about."* This is that gap, closed at the one
   * boundary every tenant email crosses.
   *
   * **OMITTED IS A REAL ANSWER, not a forgotten one** — an invite, a campaign,
   * a plan link and the platform's own mail are about no booking, and a null
   * `email_sends.booking_id` is correct for all four. Which is exactly why a
   * missing argument cannot be detected here and
   * `tests/email-row-knows-its-booking.test.mjs` discovers the call sites from
   * the source instead: `extraVehiclesFor` above carries the same warning, and
   * that one is there because a hand-written caller list in this repo was
   * already short by one.
   */
  bookingId?: string | null;
  /**
   * ROADMAP 0.4 — TRUE ONLY IF THE PROVIDER WAS ACTUALLY HANDED IT.
   *
   * Off by default, because a skipped send (reserved domain, no provider key)
   * is meant to read as sent: that is the fixture sink. `build_start` turns it
   * on, because a skip there would record a refund boundary nobody was told
   * about. See `reachedProvider.ts`.
   */
  mustReachProvider?: boolean;
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
        // ROADMAP 3.1 — the one hop where the booking used to be dropped.
        booking_id: opts.bookingId,
      }),
    });
    if (!res.ok) console.error("send-email relay failed:", await res.text());
    if (!opts.mustReachProvider || !res.ok) return res.ok;
    const answer = await res.json().catch(() => null);
    if (!reachedProvider(res.ok, answer)) console.error("send-email skipped a send that had to reach the provider:", answer);
    return reachedProvider(res.ok, answer);
  } catch (e) {
    console.error("send-email relay error:", e);
    return false;
  }
}
