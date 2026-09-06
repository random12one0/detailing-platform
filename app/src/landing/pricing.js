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

  // THE THIRD WAY TO PAY, added 2026-09-05 with roadmap 2.20 stage 2's
  // pricing page. It is the only NEW number in the locked set, and it is
  // priced off the committed one rather than picked: no commitment means he
  // carries all the risk, and the category's premium for that is 20-30%.
  // $75 is 25% over $60 and keeps the whole ladder in round numbers a
  // detailer can do in their head. docs/pricing-2026-09-04.md, question 5.
  monthToMonth: 75,

  // Founding pricing for the website plan.
  //
  // THE FOUNDING LADDER FOLLOWS THE LIST LADDER'S OWN TWO RULES rather than
  // being a second set of opinions — $400 is two months free on $40 exactly
  // as $600 is on $60, and $50 is the same 25% no-commitment premium. Change
  // one side and tests/landing-pricing.test.mjs fails, because what is
  // pinned there is the RULES, not the figures.
  founding: { setup: 499, monthly: 40, annual: 400, monthToMonth: 50 },

  // THE TERM AND THE FEE, and they live here rather than in the page's copy
  // because AB 2863 makes them a disclosure rather than a sentence:
  // California requires the auto-renewal terms, the commitment and the
  // early-exit fee to be clear and conspicuous BEFORE billing details are
  // taken. So the pricing page PRINTS them and the checkout will CHARGE
  // them, and two files reading one number is the only way those can never
  // disagree.
  //
  // Twelve months, and half of whatever is left if you leave early — the
  // owner proposed Adobe's exact model, and the FTC sued Adobe over the
  // PRESENTATION rather than over the fee. It applies to the
  // annual-paid-monthly plan ONLY; the other two have no term and no fee.
  term: { months: 12, exitFeeShare: 0.5 },
};

// ROADMAP 4.4 STAGE 4 — the owner's own prices, if he has set any.
//
// `platform_settings.prices` overrides the table above, and the back office is
// where it is typed. **This file stays the DEFAULT and the FALLBACK**: null,
// unparseable, a missing key or a price that is not a positive number all mean
// the built-in table, which is what the product charged yesterday.
//
// THIS IS THE SECOND COPY OF THAT VALIDATION and the first is `pricesFrom` in
// `supabase/functions/_shared/platformBilling.ts` — the same wall that forced
// the price table itself to be typed twice, because a Deno bundle cannot
// import out of `supabase/`. `tests/landing-pricing.test.mjs` runs both on the
// same inputs, so a table the page would accept and the checkout would refuse
// cannot exist. **That, rather than tidiness, is why the rules are spelled out
// identically in both places.**
//
// AND IT RETURNS THIS FILE'S DIALECT, not the row's. The row is shaped like
// the CHARGING side (`website.annual`); this page has always kept `annual` and
// `monthToMonth` at the top level. Converting here means the eleven printing
// sites are untouched by where the numbers came from.
export function livePricing(raw) {
  const money = (v, min = 0.01) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v < 100_000 ? v : null;
  const ladder = (l) => {
    if (!l || typeof l !== "object") return null;
    const setup = money(l.setup, 0), monthly = money(l.monthly);
    const annual = money(l.annual), monthToMonth = money(l.monthToMonth);
    return setup === null || monthly === null || annual === null || monthToMonth === null
      ? null : { setup, monthly, annual, monthToMonth };
  };
  try {
    if (!raw || typeof raw !== "object") return PRICING;
    const website = ladder(raw.website);
    const founding = ladder(raw.founding);
    const booking = money(raw.bookingOnly?.monthly);
    const months = raw.term?.months;
    const share = raw.term?.exitFeeShare;
    if (!website || !founding || booking === null) return PRICING;
    if (!Number.isInteger(months) || months < 0 || months > 60) return PRICING;
    if (typeof share !== "number" || !(share >= 0 && share <= 1)) return PRICING;
    return {
      website: { setup: website.setup, monthly: website.monthly },
      bookingOnly: { monthly: booking },
      annual: website.annual,
      monthToMonth: website.monthToMonth,
      founding,
      term: { months, exitFeeShare: share },
    };
  } catch {
    return PRICING;
  }
}
