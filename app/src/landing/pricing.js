// What the landing page charges. Prices only — edited here.
//
// The founding offer's CAP and REMAINING COUNT are deliberately NOT here.
// They are counted in the database from the accounts themselves
// (public.founding_offer(), added in the 20260828001000/001100
// migrations), because a number typed into this file goes stale the
// moment somebody signs up: the page would keep advertising spots that
// were already taken. Raise or lower the cap with:
//
//   update platform_settings set founding_total = <n>;
//
// and mark an account as founding with:
//
//   update businesses set plan_tier = 'founding' where slug = '<slug>';
//
// A churned account releases its spot; the price stays locked for the
// life of an account that stays open.
// 999 rather than 900 since 2026-09-04, the owner's call and his reason:
// "things that end in ninety nine feel more professional to me." Charm
// pricing, and it is his product's positioning to set.
export const PRICING = {
  website: { setup: 999, monthly: 60 },
  bookingOnly: { monthly: 35 },
  annual: 600, // per year, instead of website.monthly × 12

  // Founding pricing for the website plan.
  founding: { setup: 499, monthly: 40 },
};
