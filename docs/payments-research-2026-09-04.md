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

---
---

# ROUND 2 — his answers, and four facts that change the plan (2026-09-04)

He answered the four questions and told us two things nobody had asked:
**he is under 18 and he is in California.** Both have consequences, **neither is
a blocker**, and every one of the four findings below was checked against a
primary or near-primary source rather than assumed.

---

## 1. Under 18: Stripe says yes, with a parent on the account

**Stripe's own support pages:** the minimum age for a **Standard** account is
**13**, and *"if you are under 18, a legal guardian must assume the role of
owner of your account before your account can accept charges and funds can be
transferred to your bank account."* Stripe asks the guardian for name, date of
birth, the last four of their SSN, address and a consent statement.

**So the platform's own Stripe account needs a parent or guardian as its
owner.** That is the whole of it. He can build, test and run everything else;
the account cannot take a charge or pay out until an adult is on it.

**One thing this does NOT break:** Connect **Standard** for the detailers.
Express and Custom Connect accounts require 18 — Standard does not, and the
detailers will be adults with their own Stripe accounts anyway. **The design
chosen in round 1 survives his age unchanged.**

**The second consequence is contractual, and it lands squarely on his lock-in
idea.** California Family Code §6700: a minor may make a contract, **subject to
the power of disaffirmance** — a minor can back out — and the standing rule is
that **adults contract with a minor at their own risk.** He is not prevented
from selling subscriptions. **He is in a weak position to ENFORCE a term
against someone who refuses to pay it**, and an early-termination fee is the
single hardest term to collect. See §3.

## 2. California starts taxing SaaS on 1 January 2027 — it does not today

His question was *"do I charge sales tax on a $40/month subscription and a $499
setup fee in California?"* The answer has a date in it:

- **Today: no.** California has not taxed electronically delivered or remotely
  accessed software where nothing tangible changes hands.
- **From 1 January 2027: yes.** **SB 122, signed 29 June 2026**, applies sales
  and use tax to digital products and prewritten software *"transferred on
  tangible media, transferred electronically, or accessed remotely."* CDTFA
  guidance is expected in the second half of 2026.
- **Custom software stays exempt** — worth remembering when Phase 3's bespoke
  tenant websites are priced, because they may not be the same thing as the
  subscription.

**He is a California business selling to California customers, so he has nexus
in California from his first sale.** From that date the $40/month becomes
taxable and he must register with CDTFA, collect, and file. **That is about
four months away.**

**What this does to the Stripe-vs-merchant-of-record choice, which round 1
called too early to make:**

| | Fee on $40 | What it does about California tax |
|---|---|---|
| **Stripe** | **$1.66** (4.1%) | Nothing by itself. **Stripe Tax** calculates and monitors thresholds at **0.5% per transaction**, but **filing is through outside partners at extra cost** — he still registers and still files |
| **Paddle / Lemon Squeezy** | **$2.50** (6.3%) | **It stops being his problem.** They become the seller of record: they register, collect and file |

**The gap is 84¢ per detailer per month.** At twenty detailers that is $17 a
month to make a tax-filing obligation belong to someone else — and the person
who would otherwise be doing CDTFA filings is a seventeen-year-old and his
parent.

**Recommendation: start on Stripe, and decide by November 2026.** California
does not tax this until January, Stripe is cheaper and simpler to build against,
and he will have few enough subscribers before then that moving them is an
email rather than a migration. **Switching AFTER he has a hundred subscribers
means every one of them re-enters a card**, so this decision has an expiry date
and it should go in the calendar.

## 3. California's click-to-cancel law constrains the lock-in he described

He proposed: *"they have their subscription that's like a yearly, monthly
subscription. So basically they're locked in for a year and they pay every
month… if they cancel early, obviously there's a cancel early fee."* And on
leaving: *"if they contact me, I could figure out the best way…"*

**California's Automatic Renewal Law, as amended by AB 2863 (in force since 1
July 2025), says three things that bear on that**, and they apply to any
business offering auto-renewal to California consumers:

- **Clear and conspicuous disclosure of the auto-renewal BEFORE billing
  information is taken.**
- **Express affirmative consent** to the renewal terms.
- **Cancellation in the same medium the customer signed up in** — sign up
  online, cancel online. The law also prohibits contract wording that
  *"interferes with, detracts from, contradicts, or otherwise undermines"* a
  consumer's ability to understand their rights.

**An annual term and an early-termination fee are not illegal.** What is not
allowed is making the exit run through him. *"If they contact me I'll work with
them"* is a fine thing to offer and **cannot be the only route out** — a
cancel button has to exist in the dashboard.

### The version that gets the same lock-in with nothing to enforce

**Discount the annual PREPAY instead of penalising the annual exit.**

That is the plans research's own strongest finding pointed at his own pricing:
**money already taken binds structurally, and needs no enforcement at all.**
*"Pay for the year up front and get two months free"* produces the same twelve
months of commitment, with:

- **nothing to chase** — no fee to invoice to someone who has stopped answering,
  which matters twice over given §1;
- **no ARL friction** — a prepaid year is not an auto-renewing monthly
  subscription with a penalty attached;
- **better cash**, which is the thing a business at this stage actually needs.

**Recommendation: month-to-month with no fee, plus a discounted annual prepay.**
If he still wants the monthly-with-commitment version, it is buildable — it
just needs the disclosure, the affirmative tick, and a working cancel button,
and he should expect some fees never to be collected.

## 4. His Resend correction is right, and it moves the ceiling

He corrected round 1: *"I was able to have two domains on my Resend account, and
I'm not gonna have each detailer have their own domain… my Resend's only gonna
have just my domain, and I'm the one that's sending out all the emails."*

**Accepted — the one-domain limit is not the constraint.** But the caps still
are, and the one that bites is **100 emails a day** (3,000 a month). At roughly
five emails per booking — confirmation, owner alert, two reminders, invoice —
**that is about twenty bookings a day across every tenant combined.**

**And the failure is silent.** `sendTenantEmail` is best-effort by design so a
booking never fails because an email did; a rejected send is a `console.error`
inside an edge function, invisible from every screen. **Whoever ships the first
paying tenant should watch that number, not discover it.**

## 5. His backup idea works, and it is Supabase's own advice

*"Maybe I could create another Supabase account and we could do our own type of
backing up for free."* **Yes.** Supabase's documentation tells free-plan
projects to export with `supabase db dump` and keep off-site copies, and the
GitHub Actions pattern — a nightly cron job running `pg_dump` — is well
travelled.

**One gotcha that costs an afternoon if unknown: GitHub Actions runners are
IPv4-only and a free-tier project's DIRECT connection resolves to IPv6.** Use
the **Session pooler on port 5432**; the Transaction pooler does not work with
`pg_dump`.

**Two rules that are not optional:**

- **The destination must be private and encrypted.** This dump is real
  customers' names, phone numbers and home addresses. A public repo would be
  the worst single thing that could happen to this product.
- **A backup nobody has restored is not a backup.** One restore, once, into a
  scratch project, or it does not count. That is the entire reason this was
  raised.

**His "I've had no problems for over a year" is true and is not evidence.**
Nothing has gone wrong yet because nothing has been under load and nobody else's
customers were in it.

## 6. He was right about invoices — and the product already agrees with him

> *"Am I thinking of invoices the wrong way? Usually I'd send out invoices after
> they've already paid… even on my invoice it says 'here's the payments we
> accept', which is so weird since they already paid."*

**He is not thinking about it wrong. His OLD site was wrong, and this one was
already fixed.** An invoice asks for money; a receipt proves it was paid. His
old site sent one document for both, which is why it read strangely.

**`_shared/emailTemplates.ts` already branches on `payment_status`:** paid gives
*"Receipt"* and *"Paid in full"*, unpaid gives *"Invoice"* and *"Amount due"* —
different heading, different money label, different opening sentence. The file
even carries a comment about the old behaviour: a *"document headed 'invoice'
for money it had already taken."*

**So stage 1 is smaller than it looked and gets sharper: the payment handles
belong on the UNPAID branch only.** Printing "here's how to pay me" on a receipt
would recreate exactly the thing he finds weird about his own site.

---

## The build order, in plain words

He said *"I don't know what that means."* Fair — here it is without the jargon.

1. **Your payment handles on the bill.** You type your Venmo, Zelle and Cash App
   names into settings once. When a customer is sent a bill they have not paid
   yet, those appear on it. **Nothing goes through the site; it just stops being
   handwritten.** Days of work, no fees, no accounts.
2. **Detailers pay you automatically.** A proper sign-up page: they enter a card
   once, it charges $499 now and $40 every month after, forever, without you
   doing anything. **This is the one you said you will not do by hand.**
3. **Detailers can take cards from their own customers.** Each detailer links
   their own Stripe; the money goes straight to their bank, never through you.
   Costs you nothing.
4. **Then monthly plans**, which need 3 before they can charge anything — and
   the version you described does not need to charge anything, so it can come
   earlier.

---

## His decisions, recorded

- **Non-payment takes the whole thing down.** *"If they just stop paying, then
  yes, their site will go down."* **Recorded as his call over the
  recommendation.** One consequence worth knowing rather than arguing: their
  customers' existing bookings are already made, and those customers lose the
  page they cancel and reschedule from — so the detailer gets the phone calls
  during the week they are already unhappy. **A grace period before the public
  page goes dark costs nothing to build and is not the same as being lenient.**
- **Help on the way out is discretionary and may carry a fee.** *"I'll help
  them, like, maybe transfer their website… or they have no fee but I just won't
  help them with anything."* Fine, and it belongs in the terms rather than in
  code — but see §3: **discretionary help cannot replace a cancel button.**
- **Vehicle or person is the detailer's decision** — *"that's the detailer's
  decision."* Implemented as an **optional vehicle on the plan member**: a
  detailer who thinks in cars fills it in, one who thinks in people leaves it
  empty. It costs one nullable column to let both be right.

## What still needs him

1. **A parent or guardian has to go on the Stripe account** before it can take a
   single payment. Nothing else in the build waits on this, but launch does.
2. **Annual lock-in with a fee, or a discounted annual prepay?** *Recommendation:
   the prepay* — same commitment, nothing to enforce, no California
   complication, better cash.
3. **A calendar note for November 2026: Stripe or a merchant of record.**
   California taxes this product from 1 January 2027 and moving subscribers
   later means asking every one of them for their card again.

## Sources added in round 2

- Stripe — age requirement to create an account (13+, guardian must own it under 18): https://support.stripe.com/questions/age-requirement-to-create-a-stripe-account
- Stripe — age requirement for Connect accounts (Express/Custom require 18): https://support.stripe.com/embedded-connect/questions/age-requirement-to-create-an-account
- California Family Code §6700 (a minor may contract, subject to disaffirmance): https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=FAM&sectionNum=6700
- California SB 122 — sales tax on SaaS and digital software from 1 Jan 2027: https://www.pwc.com/us/en/services/tax/library/california-imposes-sales-and-use-tax-on-digital-products-and-saas.html
- The same, with the custom-software exemption: https://ktslaw.com/kilpatrick/blog/kilpatricks-state-and-local-tax-blog/2026/7/california-expands-sales-and-use-tax-to-saas-and-electronically-delivered-software
- California's current (pre-2027) treatment of SaaS: https://taxcloud.com/blog/california-saas-sales-tax/
- California AB 2863 — the amended Automatic Renewal Law: https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202320240AB2863
- What AB 2863 requires in practice (same-medium cancellation, affirmative consent): https://www.dwt.com/insights/2024/10/ab-2863-updates-california-automatic-renewal-law
- Stripe Tax pricing and what it does not do (filing is via partners): https://stripe.com/tax/pricing
- Supabase backups on the free plan, and the export-it-yourself advice: https://axonbuild.com/blog/supabase-backup/
- Automatic Supabase backups with GitHub Actions, incl. the IPv4 / session-pooler gotcha: https://backupdrill.com/guides/supabase-backup-github-actions
- This repo, read directly: `supabase/functions/_shared/emailTemplates.ts` (`invoiceEmail` branching on `payment_status`)

---
---

# ROUND 3 — "should I just start with Paddle?" (2026-09-04)

He asked whether to start on a merchant of record so the tax filing is never his
problem, whether those also do the Connect-style split so detailers get paid
directly, whether the early-exit fee can stay, and what to do about refunds. He
also settled the age question — **his dad signs up and he runs the account** —
and made an observation about his own trade that moves a build decision.

---

## 1. The Paddle question has a hard answer: it cannot do the other half

**Neither Paddle nor Lemon Squeezy does marketplace payouts.** They are merchant
of record for *your own* product sales; splitting a payment and paying out a
third party is the thing Stripe Connect exists for and they *"cannot match"* it.

**So money-through is Stripe Connect either way.** That reframes his question
completely: it is not *"Paddle or Stripe"*, it is **"Paddle AND Stripe, or just
Stripe."** Choosing the merchant of record means running **two payment systems**
— two dashboards, two sets of webhooks, two failure modes, two things to
reconcile — for a business run by one person who is also the support desk.

### And there is a second problem, specific to his $499

**Paddle's Acceptable Use Policy prohibits *"human services that are not related
to a software offering (e.g., pure consulting or advisory services, including
but not limited to legal advice, coaching, IT services…)"*.**

His $499 is **building somebody a website by hand**. Whether that reads as
"related to a software offering" — it is onboarding onto his SaaS — or as a
prohibited human service is **Paddle's call, not ours**, and their policy does
not address setup or implementation fees either way. **Being told after launch
that his main up-front product cannot be sold through his payment provider is a
worse day than filing a tax return.** If he goes this route, that question goes
to Paddle in writing *before* anything is built.

### And the tax benefit is smaller than it looks, because he sells in one state

This is the part that actually decides it. **A merchant of record earns its 2
extra points when you are selling into forty states and twenty countries** —
dozens of registrations, dozens of filing calendars. **He is a California
business whose first customers are California detailers.** From 1 January 2027
that is **one state, one registration, one filing schedule** — the simplest
sales-tax situation that exists.

**Paying 84¢ per detailer per month, forever, to avoid one state's returns —
while also running a second payment system and risking his setup fee being
disallowed — is the wrong trade.**

**REVISED RECOMMENDATION: Stripe, and register with CDTFA when California's law
starts.** This is a sharpening of round 2's "decide by November", not a
reversal: the November decision now has a predicted answer, and the thing that
would change it is **selling meaningfully outside California**, which is the
condition to watch rather than the calendar.

## 2. The early-exit fee: yes, and the Adobe lawsuit is the instruction manual

He proposed exactly Adobe's model — *"a year long term that's split… subscribed
monthly, but if they try to cancel, they have to pay half of whatever was
remaining for the year"* — and asked whether he can still have it.

**Yes. And the reason to be careful is not the fee, it is how Adobe presented
it.** In June 2024 the FTC sued Adobe over its **"Annual, Paid Monthly"** plan:
a year-long commitment, paid monthly, with an early-termination fee of **50% of
the remaining subscription** — the identical shape. **The complaint is not that
the fee existed.** It is that Adobe **pre-selected that plan by default**,
**buried the commitment and the fee in fine print and hover-over icons**, and
**put roadblocks in front of cancelling.** The case is pending in the Northern
District of California.

**So the fee is fine and the presentation is the whole risk.** Four things it
needs, and none of them costs anything:

- **The plan is not pre-selected.** Month-to-month and annual-paid-monthly are
  shown side by side, neither ticked by default.
- **The commitment and the fee are in the plain text of the plan**, at the same
  size as the price — not behind an icon, not in a linked document only.
- **A separate, explicit tick** acknowledging the twelve months and the fee
  before payment details are taken. (California's AB 2863 requires express
  affirmative consent anyway.)
- **Cancelling stays one click.** The fee is charged at that moment to the card
  on file; it is never a reason to make the button harder to find.

### He asked what "worst-placed person to collect it" meant — and he is mostly right

**It meant: if somebody simply refuses, chasing them costs more than the fee,
and a minor is poorly placed to chase anyone.** He answered it correctly:
**there is a card on file, and cancellation charges it automatically**, so
refusal is not really the path. He is also right that his customers are adults
and that he turns 18 soon.

**The residual risk is not refusal, it is a CHARGEBACK** — the customer telling
their bank the charge was unexpected. **The defence against that is the
disclosure above**, which is the same list. **So the objection largely
dissolves, and what survives of it is: make the disclosure loud enough to win a
dispute.**

**Recommendation, softened from round 2: build both and let him price them.**
Month-to-month, and an annual-paid-monthly at a lower rate with the fee
disclosed. **The discounted prepay stays worth offering as a third option** — it
is the only one where the money is already in the account — but he is right that
it is a different product from a monthly-feeling commitment, and *"guaranteed at
least half the year"* is a real answer to a real problem.

## 3. Refunds — he asked, and the answer is mostly "write it down"

He is right that a full refund with the website already built is a bad deal for
him. The normal shape for this kind of business, and the one to write:

- **The setup fee is non-refundable once work begins.** He is delivering custom
  work against it, and the whole reason it exists is that the work is front-
  loaded. **Say so before purchase, not in a policy nobody reads.**
- **The subscription's current month is not refunded**; cancelling stops the
  next charge. Standard, and it is what the cancel button should say.
- **The setup fee and the exit fee are two different things and should not be
  argued as one.** *"They've already paid for the website"* is a reason the
  setup fee is not refunded. It is not a reason the remaining months are owed —
  that is what the term is for. Keeping them separate is what makes both
  defensible.
- **A written policy is a floor, not a cage.** He can always refund somebody as
  a goodwill decision; what the policy buys is the ability to say no once and
  win the chargeback.

**One thing that changes if he ever does use a merchant of record:** refunds
become partly *their* decision, because they are the seller. Paddle also keeps
the 50¢ fixed fee on a refunded transaction.

## 4. His trade observation moves where the payment handles go

> *"I don't know how detailers work, but usually they don't leave a client's
> house until it's paid. So the amount of times someone's gonna mark something
> finalized and it not be paid is, like, zero percent chance almost."*

**If that is right — and his own old site's FAQ said *"Payment is due upon
completion of service"*, so it is at least right about him — then the UNPAID
invoice is a rare document, and round 2's "put the handles on the unpaid branch"
was aiming at a page almost nobody sees.**

**His old site already put them in the better place and nobody noticed:**
`reference/supabase/functions/create-booking/index.ts:776` prints *"Payments
accepted: Cash, Cash App, PayPal, Venmo & Zelle"* **in the booking confirmation
email** — before the job, when it is genuinely useful — as well as on the
invoice.

**So stage 1 becomes: the confirmation email and the reminder carry the
handles, and the unpaid invoice carries them too.** The receipt does not, which
was the original complaint. **That is the whole of the correction, and it came
from him knowing his trade rather than from any of the research.**

## 5. His dad on the account — one thing worth saying once

> *"I'll just kind of manage the account, but technically it's my dad that
> signed up."*

**That is the normal arrangement and it is what Stripe's own policy asks for.**
The one thing worth stating plainly, once: **whoever owns that account is the
business as far as Stripe, the bank and the state are concerned** — chargebacks,
refunds, and the tax obligations land on his dad's name. **He should know what
he is agreeing to rather than just signing**, and the CDTFA registration in 2027
will be in his name too.

## 6. Resend — accepted, with one small addition

He is staying on the free plan and will upgrade later, and he is probably right
that twenty bookings a day across every tenant is not this year's problem.

**The one thing worth building alongside it costs almost nothing: make a
rejected send visible.** The cap is not the risk; **a silent failure is** — a
booking never fails because an email did, so nothing on any screen would show
it. Whoever builds 2.20 should log a rejected send somewhere he will actually
look, so the first symptom is not a customer saying they never got their
confirmation.

---

## What changed in this round

| | Round 2 said | Round 3 says |
|---|---|---|
| **Stripe vs merchant of record** | Decide by November | **Stripe.** MoRs cannot pay out to detailers, so it would be two systems; Paddle may not accept the $499 at all; and one state is the simplest tax case there is. **Revisit only if he sells outside California.** |
| **The early-exit fee** | Recommended against | **Buildable, with the Adobe complaint as the checklist.** The FTC sued over the presentation, not the fee. |
| **Payment handles** | On the unpaid invoice | **On the confirmation and reminder too** — because jobs are paid before the detailer leaves, so the unpaid invoice is rare. His observation. |
| **Refunds** | Not addressed | Setup fee non-refundable once work starts; current month not refunded; keep the setup fee and the exit fee as separate arguments. |

## Sources added in round 3

- Paddle vs Lemon Squeezy vs Stripe on marketplace payouts (neither MoR splits payments to third parties): https://blog.vibecoder.me/stripe-vs-lemon-squeezy-vs-paddle
- Paddle — Acceptable Use Policy, prohibited categories incl. human services: https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle
- FTC — complaint against Adobe over the "Annual, Paid Monthly" plan and its early-termination fee: https://www.ftc.gov/business-guidance/blog/2024/06/ftc-says-adobe-hid-key-terms-annual-paid-monthly-subscription-plan-set-roadblocks-deter-customer
- FTC press release, June 2024: https://ftc.gov/news-events/news/press-releases/2024/06/ftc-takes-action-against-adobe-executives-hiding-fees-preventing-consumers-easily-cancelling
- Paddle refund fee behaviour (5% returned, 50¢ retained): https://dodopayments.com/blogs/paddle-fees-explained
- This repo, read directly: `reference/supabase/functions/create-booking/index.ts:776` (payment methods on the CONFIRMATION email)
