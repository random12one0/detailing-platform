# Taking money — both directions — 2026-09-04

The owner asked for this after reading roadmap 2.14's research, which found that
this product has never taken a payment. His words, in two messages:

> *"We need to figure out payment cuz at least I need a way for my customers to
> pay me."*

> *"The live site doesn't. That's just what I accept and I just have them like
> scan my code or whatever for which one they choose. No payment ever goes
> through my site. But that has to change. I want an official way to pay me
> with reoccurring subscription obv cuz my clients the detailers need to pay me
> and I'm not gonna do it manually."*

**Nothing in `app/` or `supabase/` changed in this file.** It is the input to
the build.

**There are TWO different money problems in those two sentences and they have
different answers.** Keeping them apart is the whole point of this file:

- **MONEY IN — the detailers pay HIM.** $499 setup, $40/month, recurring,
  automatic. This is his own revenue and it is the one he says cannot be
  manual.
- **MONEY THROUGH — a detailer's customers pay THE DETAILER.** His own
  customers paying him for a detail is the same problem seen from inside one
  tenant. **He must never be the one holding this money**, and the section
  below is mostly about how to avoid it.

---

## What exists today, corrected by him

**The old site never took a payment and neither does this one.** The methods
listed on `reference/`'s booking page and invoice — *"Cash, Cash App, PayPal,
Venmo & Zelle"*, and *"Apple Pay"* in its FAQ — are **a list, not a
checkout.** He confirmed it: *"I just have them scan my code."* The customer
pays person-to-person on the day.

In the platform today:

- `bookings.payment_status` is `pending / paid / partial / waived`, set by hand
  in `FinalizeModal.jsx` when the detailer finishes a job.
- **How they paid is FREE TEXT.** `FinalizeModal` offers Cash / Card / Zelle /
  Venmo / Cash App / Cheque and writes the answer into `payment_notes`. There
  is no `payment_method` column on `bookings` — the only one in the schema is
  on `expenses`, which is the detailer's own bookkeeping.
- The platform's own billing charges nobody. `businesses.plan_tier` is a label;
  the founding offer's $499 / $40 exists in `app/src/landing/pricing.js` as
  words on a page.

**So there is no card data anywhere, no processor, no webhook and no
subscription.** That is a clean start, and it is worth saying plainly: **every
option below is a first integration, not a migration.**

---

## MONEY IN — the detailers paying him

### What it costs, on his own numbers

| | Fee on a $40/month charge | Fee on the $499 setup | Fixed monthly cost |
|---|---|---|---|
| **Stripe** (2.9% + 30¢, plus Billing 0.5% on recurring) | **$1.66** (4.1%) | **$14.77** (3.0%) | **$0** |
| **PayPal** subscriptions (~3.49% + 49¢) | ~$1.89 (4.7%) | ~$17.90 | $0 |
| **Paddle / Lemon Squeezy** (merchant of record, 5% + 50¢) | **$2.50** (6.3%) | **$25.45** | $0 |

**None of them charges a monthly fee**, which is the part that matters for
*"what's available to me for free"*: **the cost of taking money is a slice of
money that moved, never a bill that arrives when nothing happened.** Ten
detailers at $40 costs about $17/month in Stripe fees, and it only exists
because $400 came in.

**Stripe Billing's extra 0.5% is real and is capped at $5,000/month**, which he
will not reach. On $40 it is 20¢.

### The one thing a merchant of record buys, and whether he needs it

Paddle and Lemon Squeezy cost roughly 2 points more and in exchange they become
the seller of record: **they handle US sales tax registration, collection and
filing.** That is not nothing — **software is taxable in some form in 26
states**, and California starts in January 2027.

**But at his size it is almost certainly a problem he does not have yet.** A
state can only make him collect if he has nexus there, and economic nexus
thresholds are typically **$100,000 of sales or 200 transactions into that
state**. Selling $40/month subscriptions, he would need ~208 detailers *in one
other state* before that state's threshold is in play. **What he does owe from
day one is his OWN state**, where he has physical presence, and whether SaaS is
taxable there is a question for whoever does his taxes — not a thing this
research can answer without knowing the state.

**Recommendation: Stripe, and revisit merchant-of-record if he ever sells
across state lines at volume.** Paying 6.3% from day one to insure against a
problem that starts at ~200 customers is buying the wrong thing early. **But he
should ask his accountant one question before the first sale: "do I charge
sales tax on a $40/month software subscription in my state, and on a $499 setup
fee?"** — the setup fee may be taxable even where the subscription is not,
because it looks like a service.

### How it works, mechanically

**Stripe Checkout in subscription mode does the whole thing**: one hosted page,
the $499 setup as a one-time line and the $40 as the recurring one, card stored,
renewed monthly, no card number ever touching this product. Two edge functions
(create the session, receive the webhook), one table, one status on
`businesses`.

**The part that is NOT optional is what happens when a card fails**, and it is
where most of the work actually is. Failed payments are **20–40% of all SaaS
churn** — people who want to keep paying and whose card expired. Stripe retries
automatically; the trade's practice is **3–4 retries over 10–14 days**, then a
**3–7 day grace period**, then **pause rather than cancel** (data intact,
one-click return), with hard cancellation only after ~30 days.

**For us that means the detailer's dashboard needs a "past due" state that is
visible and annoying but not destructive**, and it means **4.4's platform admin
"suspend" is the same mechanism** — build it once.

### The risk he is taking on that he does not have today

**Charging a recurring subscription creates an obligation to be reachable.**
Today nobody can be wrongly charged, because nobody is charged. The day this
ships, a detailer can be double-charged, charged after cancelling, or charged
while the product is broken — and every one of those is an email he has to
answer within a day or it becomes a chargeback. **That is the real cost of
"not doing it manually", and it is a support cost, not a code cost.**

---

## MONEY THROUGH — a detailer's customers paying the detailer

### The structural question, and it only has one right answer

**If money for a detail lands in his account and he pays it out, he is running
a money transmission business.** He holds other people's revenue, he owns their
chargebacks, and if a detailer never turns up, the customer's dispute is his to
answer. **Nothing about this product needs that.**

**Stripe Connect with `Standard` accounts avoids all of it, and it is free to
the platform.** Stripe's own pricing page and its fee-payer documentation, read
directly:

- A `type=standard` connected account defaults to the fee payer being **the
  account**, and in that mode Stripe *"collects fees directly from your
  connected account. We don't charge any Connect fees to it or to your
  platform."*
- On that setting the connected account pays **payment processing fees, dispute
  fees, and Invoicing/Subscriptions fees.** The platform pays nothing.
- The **$2 per monthly active account** and **0.25% + 25¢ per payout** in
  Stripe's Connect pricing apply only if the PLATFORM chooses to handle
  pricing. We would not.

**So: each detailer connects their own Stripe account, the money goes straight
to their bank, they pay their own 2.9% + 30¢, they own their own disputes, and
this platform pays $0 and touches no card data.** That is the whole design, and
it is both the cheapest option and the one with the least risk in it.

**What it costs the DETAILER is not nothing and they will notice**: 2.9% + 30¢
on a $150 detail is $4.65, which is exactly the reason a detailer currently
holds up a Venmo QR code. So:

### Card is an addition, not a replacement

Every detailer sampled in the plans research takes cash and phone apps.
Detailing-specific advice pushes the other way — *"if you can't take a credit or
debit card on the spot, you're leaving money on the table"* — and Square's own
solo-detailer plan (2.6% + 15¢ tapped) exists for that reason.

**The honest product answer is both**: the detailer's own payment handles and
QR codes belong in settings and on the invoice, **because that is what he
himself does today and it costs 0%**, and card-on-the-receipt is the option a
detailer switches on when they want it.

**And that ordering is the cheap one to build.** Putting the detailer's Venmo /
Cash App / Zelle / PayPal handles into settings and printing them on the invoice
email is a settings screen and a template block — **no processor, no webhook, no
Stripe, no fees, and it makes today's real behaviour official**, which is what
he asked for in his first sentence. Connect is the second step and does not
invalidate the first.

---

## What "free" actually means here — the fixed costs that are NOT free

He asked how this works out *"with what's available to me for free"*. Payments
are genuinely free of fixed cost. **The rest of the stack is not, and two
free-tier ceilings are already close.**

| | Free tier | What breaks | What it costs to fix |
|---|---|---|---|
| **Supabase** | 500 MB database, 2 projects, **no backups at all**, project pauses after 7 days with no requests | **Backups.** A live product holding every tenant's bookings and customers has no restore point on the free plan | **Pro, $25/month** — daily backups, 7-day retention |
| **Resend** | 3,000 emails/month, **100 a day**, **ONE domain** | **The one-domain limit is already a known problem** — 2.18 left "a separate Resend account for the platform" open, because the platform currently shares the sending domain with his real business | **Pro, ~$20/month** — removes the daily cap, 10 domains |
| **Netlify** | 100 GB bandwidth, 300 build minutes | Nothing yet | — |
| **Stripe** | No monthly fee at all | Nothing | Per transaction only |

**So the honest number is roughly $45/month of fixed cost the day this has real
tenants** — and at $40/detailer, **the second detailer covers the whole
platform's running costs.** That is a good position, but it is not zero, and
"free" should not be the plan for the database that holds other people's
customers.

**The 100-emails-a-day cap is the one that bites first.** A confirmation, an
owner alert, two reminders and an invoice is 5 emails a booking; 20 bookings a
day across all tenants hits the cap, and `sendTenantEmail` is best-effort — **a
rejected send is a `console.error` inside an edge function and is invisible from
every screen**, which is exactly how the 0.2 defect survived.

---

## The recommendation, in order

**One Stripe integration, built in three stages, each of which stands alone.**

1. **The detailer's own payment handles on the invoice** — settings fields plus
   an email block. No processor, no fees, no risk, and it makes what he already
   does official. *Days, not weeks.*
2. **Platform billing: Stripe Checkout subscription, $499 + $40/month, with a
   past-due state and a suspend.** This is his hard requirement and it is the
   thing he refuses to do manually. Same mechanism as 4.4's suspend, so build it
   once.
3. **Stripe Connect Standard so a detailer can take cards**, free to the
   platform, detailer's own account, detailer's own disputes. **This is also
   what unlocks real plan subscriptions** (see the plans research), because a
   subscription on a connected account is billed to that account.

**Deliberately not recommended:** the platform holding customer money,
merchant-of-record pricing, a card reader integration, and any stored card in
our own database.

---

## What is still his to decide

1. **Is a card required to sign up, or can a detailer start free and add one
   later?** Requiring it is how a subscription business avoids chasing people;
   not requiring it is how a founding offer gets its first ten users.
   *Recommendation: require it at signup once the founding phase ends; during
   the founding offer, take it and set the first charge date manually.*
2. **What actually happens when a detailer stops paying?** Read-only dashboard,
   full lockout, or their booking page going down too — the last one takes their
   customers' bookings offline, which punishes people who did nothing wrong.
   *Recommendation: dashboard goes read-only, the public booking page keeps
   working, and after 30 days it stops taking new bookings.*
3. **Does he want card payment for HIS OWN customers first, or is the invoice's
   payment handles enough for now?** Stage 1 costs almost nothing and matches
   what he does today; stage 3 is a real build and costs him 2.9% + 30¢ a job.
   *Recommendation: stage 1 now, stage 3 when a detailer asks for it.*
4. **One question for his accountant, not for me:** does he charge sales tax on
   a $40/month subscription and a $499 setup fee in his state?

---

## Sources

- Stripe — Connect pricing: https://stripe.com/connect/pricing
- Stripe — fee behaviour on connected accounts (who pays fees and disputes): https://docs.stripe.com/connect/direct-charges-fee-payer-behavior
- Stripe — Billing pricing (0.5% on recurring, capped): https://stripe.com/billing/pricing
- Stripe — main pricing (2.9% + 30¢): https://stripe.com/pricing
- Merchant-of-record comparison, Paddle / Lemon Squeezy / Stripe / Polar: https://fintechspecs.com/blog/stripe-vs-paddle-vs-lemon-squeezy-vs-polar-merchant-of-record-b2b-saas/
- SaaS sales tax by state (26 states, California 2027): https://taxcloud.com/blog/saas-sales-tax-by-state/
- SaaS sales tax nexus thresholds: https://www.anrok.com/saas-sales-tax-by-state
- Dunning and involuntary churn (20–40% of churn, retry and grace-period practice): https://baremetrics.com/blog/dunning-management
- Failed-payment recovery practice: https://www.kinde.com/learn/billing/churn/dunning-strategies-for-saas-email-flows-and-retry-logic/
- Supabase pricing and free-tier limits (no backups on Free, Pro $25): https://uibakery.io/blog/supabase-pricing
- Supabase free-tier pause behaviour: https://www.itpathsolutions.com/supabase-free-tier-limits
- Resend pricing and free-tier caps: https://flexprice.io/blog/detailed-resend-pricing-guide
- How mobile detailers collect payment today: https://doorstephq.com/blog/how-to-collect-payment-for-mobile-detailing-jobs-without-the-awkward-fumble
- Payment software for detailers, incl. Square's solo pricing: https://myquoteiq.com/best-mobile-payment-software-mobile-detailing-2026/
- This repo, read directly: `reference/frontend/src/components/sections/FAQ.jsx`, `reference/supabase/functions/send-invoice/index.ts`, `app/src/components/FinalizeModal.jsx`, `supabase/migrations/20260827000200_tenant_data.sql`
