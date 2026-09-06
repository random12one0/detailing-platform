// How to reach a person, in one place.
//
// ITEM G — *"a detailer who gets stuck has nowhere to go"*: no help text, no
// address, no way to ask a question from inside the dashboard. Roadmap 7.1 put
// a support policy in the FOOTER of the marketing page, which is the one
// surface a detailer never looks at once they have signed up.
//
// ONE ADDRESS AND A PROMISE ABOUT TIME, which is that item's own
// recommendation and the whole of it. Not a help centre, not a ticket form,
// not a chat widget: he has fewer than ten customers and the honest answer to
// *"where do I go"* is his inbox.
//
// IT LIVES IN `lib/` RATHER THAN BESIDE EITHER SCREEN because both surfaces
// need it — the marketing footer and the dashboard's gear — and a second copy
// is a second address to keep in step with the one the emails send from.
// `tests/landing-pricing.test.mjs` pins it against
// `supabase/functions/_shared/platformBrand.ts`, which is the third copy the
// Deno wall forces and the only one allowed.

export const SUPPORT_EMAIL = "support@detailingplatform.com";
export const SUPPORT_PHONE = "(562) 310-1075";

// The sentence under a marketing page. It is a POLICY — how to reach a person
// and how long it takes — rather than a link, because "contact us" says
// neither.
export const SUPPORT_LINE =
  "Questions and problems go to one person, and you get an answer the same working day.";

// The shorter one, for inside the product, where the person reading it is
// already a customer and is stuck right now.
export const SUPPORT_SHORT = "Stuck on something? One person answers, same working day.";
