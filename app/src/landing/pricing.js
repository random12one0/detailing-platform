// Pricing shown on the landing page. Plain numbers, edited here only.
//
// THE FOUNDING OFFER IS A REAL LIMIT. `foundingSpotsLeft` is the count of
// unclaimed founding accounts — update it by hand as they fill. When it
// reaches 0 (or you set `founding: null`), the section disappears entirely;
// nothing else references it, so there is no stale "2 spots left" to forget.
export const PRICING = {
  website: { setup: 900, monthly: 60 },
  bookingOnly: { monthly: 35 },
  annual: 600, // per year, instead of website.monthly × 12

  founding: {
    total: 3,
    spotsLeft: 3, // ← update as founding accounts are claimed; 0 hides the offer
    setup: 499,
    monthly: 40,
  },
};
