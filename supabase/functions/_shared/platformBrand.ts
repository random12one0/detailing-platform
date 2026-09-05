// The PLATFORM's own identity as an email needs it — roadmap 2.20 stage 2.
//
// Every other email this product sends is a detailer speaking to somebody, and
// `_shared/email.ts`'s `buildBrand` reads that detailer's colour and logo out
// of the database. Billing mail is the one direction that reverses: it is us
// speaking to the detailer, so there is no tenant to look up and the brand is a
// constant.
//
// IT IS A `TenantBrand` RATHER THAN A NEW SHAPE ON PURPOSE. Every block in
// `emailKit.ts` takes a brand and reads its six colour values, its masthead and
// its footer from one object; a second brand type would mean a second set of
// blocks, which is how twelve consistent templates become thirteen that drift.
// The house accent `#38E08B` is the same default `_shared/email.ts` gives an
// unbranded business, so the colour maths and every contrast check in
// `tests/email-brand.test.mjs` apply here unchanged.
//
// THE FURNITURE IS OURS AND THE TENANT IS IN THE SENTENCE. The first version
// put the business's name in `brandName`, so the masthead and the footer of an
// email about somebody's card both read *"Ridgeline Auto Detail"* — which is
// the same thing the `sender_name` branch was added to stop: an email that
// looks like it came from you, telling you your own card failed, is what
// phishing looks like. The business is named in the SUBJECT and in the prose,
// where it identifies what the email is about rather than who sent it.

import { brandFrom } from "./emailKit.ts";
import type { TenantBrand } from "./emailTemplates.ts";

// NO IMPORT OF `./config.ts`, AND THAT IS THE WHOLE REASON `siteUrl` IS AN
// ARGUMENT. That module reads `Deno.env` at TOP LEVEL, so importing it here
// would make this file — and therefore `emailTemplates.ts`'s newest template —
// unloadable from Node, which is how `scripts/render-emails.mjs` writes the
// page a human actually looks at. The caller has `PLATFORM_URL` in hand
// anyway. Keep this module free of anything Deno-only for the same reason
// `_shared/pricing.ts` is.

/** What the platform signs its mail as. Also the `From:` display name. */
export const PLATFORM_NAME = "Detailing Platform";

/** The house accent — the same one an unbranded tenant sends with. */
const PLATFORM_ACCENT = "#38E08B";

/**
 * HOW A DETAILER REACHES A PERSON, AND IT IS THE OWNER'S OWN MOBILE.
 *
 * Roadmap item L, opened 2026-09-05 when an audit found that **the product had
 * no support contact of any kind** — no email, no phone, no address — while
 * `/pricing` promised *"no phone call, no email and nobody to talk out of it"*,
 * which is a promise about CANCELLING and is not an answer to *"I was charged
 * twice."* He answered with this number the same day.
 *
 * **THIS IS THE ONLY PLACE IT IS WRITTEN.** The billing screen does NOT have a
 * copy — `platform-billing`'s `summary` sends it over the wire, because a
 * phone number typed into `Billing.jsx` as well would be the fourth instance
 * this week of a fact in two files, and the one where being wrong means a
 * detailer whose page is dark dials a stranger.
 *
 * **THE ADDRESS IS ON THE PLAIN DOMAIN AND THAT IS NOT AN ACCIDENT.** Mail
 * goes OUT from `email.detailingplatform.com`, which Resend owns; a mailbox on
 * `detailingplatform.com` itself is why that sub-name was chosen in the first
 * place, so the two never collide. He is hosting it on iCloud+, whose custom
 * domain needs MX records on the plain domain only — **it cannot disturb the
 * sending sub-name, and the sending sub-name cannot disturb it.**
 *
 * `contactEmail` becomes Reply-To on the billing mail, so this address has to
 * RECEIVE before it is worth having: until the iCloud+ domain is verified,
 * a detailer's reply bounces. The phone above is the one that works today.
 */
export const SUPPORT_PHONE = "(562) 310-1075";
export const SUPPORT_EMAIL: string | null = "support@detailingplatform.com";

export function platformBrand(siteUrl: string): TenantBrand {
  return {
    ...brandFrom({
      brandName: PLATFORM_NAME,
      contactPhone: SUPPORT_PHONE,
      siteUrl,
      logoUrl: null,
    }, PLATFORM_ACCENT),
    // NULL UNTIL HE HAS AN INBOX. `contactEmail` becomes Reply-To, and setting
    // it to an address nobody reads is worse than leaving it empty: the footer
    // reads this and stops promising a reply when there is none.
    contactEmail: SUPPORT_EMAIL,
    dropoffAddress: null,
    googleReviewUrl: null,
    yelpReviewUrl: null,
    // Explicitly empty: a detailer's own paragraph is something they wrote for
    // THEIR customers, and pasting it into a message from us about their card
    // would be absurd.
    messages: {},
    payment: [],
  };
}
