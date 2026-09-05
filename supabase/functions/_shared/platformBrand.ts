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
// THE TENANT'S NAME STILL APPEARS — as `brandName`, because these emails are
// ABOUT a business ("Riverside Detail's booking page is offline") and the
// masthead is where a reader looks to know which of their businesses it is.
// What makes it OUR email is the sender name and the footer's site, both of
// which point at the platform.

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

export function platformBrand(businessName: string, siteUrl: string): TenantBrand {
  return {
    ...brandFrom({
      brandName: businessName,
      contactPhone: null,
      siteUrl,
      logoUrl: null,
    }, PLATFORM_ACCENT),
    contactEmail: null,
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
