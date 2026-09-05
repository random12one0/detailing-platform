# The owner's own dashboard — what it is for, 2026-09-04

He asked for this and asked to be educated about it:

> *"I need to have a dashboard myself where I can manage all of the detailers,
> all of my business clients, all of the detailers that I manage their websites,
> in a way that I can keep track of everything. Plus all the features that I
> need. Now I don't really know what features I need, but I'm sure you could
> educate me on kind of how this would work out or how other people do it."*

**It is already on the roadmap as 4.4** — *"Platform admin area: business list +
search, per-business actions (founding mark, suspend, plan tier,
open-their-dashboard), manual business creation for in-person onboarding,
platform settings, basic counts."* **He had not seen it**, which is fair: it is
in Phase 4, a long way down a 3,700-line file. This document is that item made
concrete, and it exists because *"I don't know what features I need"* is a
question with a real answer.

**Nothing is built. This is a specification.**

---

## The one sentence that decides the whole design

**A back office exists to answer questions you are currently answering by
opening the database.**

That is the test for every screen below. Not *"what would be nice to see"* —
**what will he otherwise do by hand, at 11pm, with a SQL query, while a detailer
waits on a text message.** Everything else is a dashboard for looking at, and
those rot.

The general advice for a product this size is the same: **start with the
workflows that would otherwise interrupt a developer**, not with charts.

---

## The three jobs it has

### Job 1 — "who are my customers and what state are they in?"

**One list, searchable, one row per business.** It is the screen he will open
most and probably the only one he needs for months.

Per row: **business name, their booking link, owner's email, plan tier
(founding / standard / booking-only), subscription state (trialing, active,
past due, cancelled), signed up, and last activity.**

**"Last activity" is the column that earns its place** — the date of their most
recent booking. A detailer with no booking in three weeks is either on holiday
or leaving, and both are worth knowing before the card fails.

Filters worth having on day one, and no more: **past due**, **setup
unfinished**, **no bookings ever**, **no bookings in 30 days**.

### Job 2 — "what is going on with this one?"

**One business's page**, reached from the list. Everything he would otherwise
look up in Supabase:

- **Their setup**: services, hours, booking mode (reserve or request), travel
  areas, accent colour, whether their branding is done. **The seven-step setup
  progress already exists in `app/src/lib/setup.js`** and is exactly the "have
  they actually finished" signal — surface the same number rather than a second
  one.
- **Their people**: staff members, their roles and permissions (2.13), pending
  invites.
- **Their work**: bookings this month, all time, last booking, cancellations,
  requests waiting.
- **Their money to him**: plan, price, next charge date, payment state,
  everything they have ever paid, and any failed charge with its reason.
- **Their site** — the column that is specific to this product, because he
  builds sites by hand: **do they have one, what is its address, is a custom
  domain pointed at it, and when was it last touched.** Phase 3 produces this
  data; the admin area is where he looks at it.
- **His own notes on them.** A free-text field per business is the single
  cheapest feature here and the one he will use every day. *"Wants a gallery
  page"*, *"call back after the 3rd"*.

### Job 3 — "do the thing without asking a developer"

The actions, and each one exists because the alternative is editing the database
by hand:

| Action | Why it is here |
|---|---|
| **Open their dashboard as them** | **The biggest single time-saver in any back office.** *"It's not showing my Tuesday hours"* is thirty seconds to see and thirty minutes to describe. **It must be logged** — see the security section. |
| **Suspend / restore** | 2.20 needs it for non-payment and he ruled that the site goes down. **Same mechanism, built once.** |
| **Mark founding / change plan tier** | Today this is `update businesses set plan_tier = 'founding'` typed into a SQL console. |
| **Create a business by hand** | For in-person onboarding — he signs someone up at their shop rather than sending them to a form. |
| **Resend an invite / reset a stuck account** | The support request that otherwise needs him to open the auth table. |
| **Release a founding spot** | The count is computed from accounts (`public.founding_offer()`), so this is really "change their tier", but he will think of it as its own thing. |

### And one number, not a dashboard of them

**Businesses, active businesses, monthly recurring revenue, founding spots
left.** Four figures across the top of the list. **Everything past that is a
chart nobody acts on**, and the advice for a product this size is explicit that
analytics come later — the panel earns its keep on workflows first.

---

## The part he did not ask about, and will need first

**The detailer's OWN billing page**, in their dashboard rather than his.

They need to see: which plan they are on, what they pay, when the next charge
lands, the card on file, past invoices, **and a cancel button.**

**That cancel button is not a nicety — California's AB 2863 requires it.**
Someone who signed up online must be able to cancel online, in the same place.
It also has to be where the twelve-month term and any early-exit fee are stated
plainly, since that is the disclosure the whole arrangement rests on.

**It belongs behind the header gear**, with the four screens that change how the
app behaves for the detailer rather than the eight on Business that change what
a customer meets — that is the test written into `screens/Business.jsx`'s own
header. **And it is `owner`-only**, not a permission tick: 2.13 deliberately has
no "team" permission, and billing is the same shape — whoever can change what
the business pays can change everything.

---

## Security, and it is not optional here

**This is the one screen in the product where a bug exposes every tenant at
once.** Everything else is protected by RLS scoped to one business; this is
deliberately not.

- **The gate is a `platform_admins` table checked in the DATABASE**, not a role
  claim in the browser and not an environment variable. 4.4 already says so.
- **A test that proves a business owner gets nothing.** `tests/staff-roles.test.mjs`
  is the shape — 64 checks, each baselined by breaking what it guards.
- **Impersonation is logged, always, with who and when and which business.**
  It is the most useful action here and the one that will look worst if it is
  ever questioned. A row in an audit table costs nothing.
- **Read-only by default is worth considering** — most visits are looking, not
  changing — but it is not worth a second permission system for one user.
  **Revisit if anyone else ever gets an account.**
- **It is a separate route with its own layout**, not a tab inside the detailer
  dashboard. A screen that can see every business must never be one CSS mistake
  away from a screen a detailer opens.

---

## What NOT to build

- **Charts and cohort analysis.** Four numbers and a list. He has fewer than ten
  customers; every trend line is noise.
- **Roles and permissions for admins.** There is one admin. Adding a permission
  lattice for a table with one row is the exact thing 2.13 refused to do for
  "team".
- **A ticketing system.** The notes field and his own inbox are enough.
- **Anything that duplicates Stripe's dashboard.** Refunds, disputes and card
  details live in Stripe and are better there. **Show the state, link out for
  the action.**
- **A second copy of the detailer's own screens.** *Open their dashboard as
  them* is why those screens exist.

---

## Where it sits in the plan

**Roadmap 4.4, and it should move earlier.** It is written into Phase 4, after
tenant websites — but **2.20 (taking money) needs suspend, and the day he has
three paying customers he needs the list.** The natural order is:

1. **2.20 stage 2** builds subscriptions, and with them *suspend* and the
   detailer's own billing page.
2. **The list and one business's page** come next, because that is when he stops
   being able to hold his customers in his head.
3. **The site columns** fill in during Phase 3, when there are sites to track.

**So 4.4 splits**: the parts that ride along with billing, and the parts that
wait for websites. Nothing here needs to be built all at once.

---

## Sources

- Roadmap 4.4, as originally written (this document expands it, and does not
  replace its security requirement)
- What belongs in a small SaaS admin panel — start with the workflows that
  otherwise interrupt a developer: https://www.sequenzy.com/blog/how-to-build-saas-admin-panel
- Admin panel scope and impersonation as the first workflow to solve: https://yaro-labs.com/blog/saas-admin-panel
- Subscription-management essentials (plan changes, billing history): https://www.cloudblue.com/blog/saas-subscription-management-software/
- This repo, read directly: `app/src/lib/setup.js` (the seven-step progress),
  `app/src/screens/Business.jsx` (the Business-vs-gear test),
  `app/src/landing/pricing.js` and `public.founding_offer()` (the founding count
  is computed, never typed)
