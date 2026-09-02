# The dashboard's architecture, rethought — 2026-08-31 (roadmap 2.10)

**Nothing in `app/` changed in this item. This is a proposal; the owner
approves it before any code, and the build gets its own roadmap item the way
2.8b did for 2.8.**

**THIS FILE IS IN TWO PARTS, and the second was added on his instruction.**

- **Part A (§0–§7) — the navigation.** Which tabs exist, what is on each, how
  the More screen is grouped. **He answered all five of its decisions on
  2026-08-31 (§5): the fifth tab is called "Business", and the other four were
  delegated.**
- **Part B — every screen, looked at.** He said the item was bigger than the
  tab bar: *"more than just the order of the tabs but of every GUI and how
  things look and are laid out, going through every single GUI tab page."*
  Part B is that pass — every screen and sheet shot at four sizes and audited.
  **It ends with two more decisions (§B6) and they are still open.**

**The LOOK is not reopened, in either part.** "The Thread"
(`docs/design-system.md`) stands, the skill-collision rule stands, and no
direction-generating skill ran against this. What is reopened is WHERE THINGS
LIVE — across the tabs in Part A, and inside each screen in Part B: which
container a thing sits in, how many of them there are, what a screen shows,
and what it does at a width nobody designed it for. No new colours, faces,
tokens or motion anywhere in this document.

---

## 0. The short version

**Four of the five tabs survive a from-scratch derivation unchanged.** Today,
Calendar, Money and Clients each answer a question a detailer asks every day
or every week, and four of the six trade products carry the same destinations.
Saying that plainly is part of the job: the roadmap asked for it, and it means
most of the current layout is not a copy of anything — it is the right answer
arrived at without the reasoning ever being written down.

**The fifth tab is the whole problem.** "More" holds the eleven settings
sheets, and roughly two-thirds of them are not settings at all — they are the
detailer's shopfront: what they sell, what it costs, when they are open, what
their photos are, what colour their page is, and the booking link itself.
Those are the things a customer meets. Filing them under a gear icon called
More says they are plumbing.

**The proposal, in one line:** keep Today, Calendar, Money and Clients; delete
"More" as a tab; put the customer-facing two-thirds of it into a fifth tab of
its own; and move the genuine plumbing behind a gear in the header, where it
costs a tab slot nothing.

```
NOW       Today  Calendar  Money  Clients  More ──▶ 11 sheets, mixed together

PROPOSED  Today  Calendar  Money  Clients  Business        [⚙ in the header]
                                           └ the 7 a        └ the 5 that are
                                             customer sees    app plumbing
```

**Those five decisions were answered on 2026-08-31 — see §5.** Everything
above them is the reasoning.

**And the biggest single finding in the whole item is not in Part A at all.**
**The dashboard draws one 724-pixel column at every width from 768px upward** —
the same column on a 1920 monitor as on a 1440 laptop, so the More screen is
1,620px tall on the monitor and 1,626px on a phone, and Calendar's History is
3,619px on both. Sixty per cent of the owner's own screen is empty. That is
**§B1**, and it is decision 6.

---

## 1. Evidence, not taste

### 1a. How this was done, and how much weight it carries

Two kinds of source, kept apart, the same way `detailer-research-2026-08-31.md`
did it:

- **What the trade's software actually puts in front of a field user** — six
  products, read from their own help centres and app-store listings, never
  from review sites or comparison blogs where a feature list is a sales
  document.
- **What a working detailer's day looks like** — trade write-ups and vendor
  research. **This half is the weaker half and is marked as such below.** The
  strong sources for how detailers work are the ones already in this repo: the
  ten real menus in `detailer-research-2026-08-31.md` and
  `detailer-menu-shapes-2026-08-31.md`, and the owner's own walkthrough.

**A caveat that matters more here than it did in 2.8.** Navigation is the part
of a product a vendor documents worst. Jobber publishes its bottom bar
explicitly; Housecall Pro publishes its top-level nav and confirms a mobile
bottom bar exists; Square, Zenbooker, Mobile Tech RX and fieldd had to be read
from proxies (help-centre categories, App Store feature lists, marketing
pages). **Every column in the table below carries how strong its source is,
and no percentage should be attached to any of it.** Six products is six
products.

### 1b. What the six products put at the top level

| Destination | Jobber | Housecall Pro | Square Appts | Zenbooker | Mobile Tech RX | fieldd | Carried by |
|---|---|---|---|---|---|---|---|
| **Schedule / calendar** | ✓ Schedule | ✓ Schedule | ✓ Calendar | ✓ Managing Jobs | ✓ scheduling | ✓ | **6 of 6** |
| **Customers** | ✓ (under Search) | ✓ Customers | ✓ Clients | ✓ | ✓ CRM | ✓ | **6 of 6** |
| **What you sell** | web only | ✓ **Price Book** | ✓ Items | ✓ **Services** (first) | ✓ Pricing | ✓ Services | **5 of 6** |
| **Money / reports** | web only | ✓ My Money + Reporting | ✓ Reports | ✓ reporting | ✓ analytics | ✓ payments | **5 of 6** |
| **Messages / inbox** | ✓ Messages | ✓ Inbox | ✗ | ✗ | ✓ texting | ✓ chat | **4 of 6** |
| **Home / today** | ✓ Home | ✓ Home | ✗ | ? | ? | ✓ | **3 of 4 known** |
| **Settings / more** | ✓ More | ✓ gear | ✓ Settings | ✓ | ? | ? | **4 of 4 known** |
| **Marketing** | ✗ | ✓ Marketing | ✗ | ✗ | ✓ | ✓ | 3 of 6 |
| **Timesheet** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | **1 of 6** |

Source strength, per column:

- **Jobber — STRONG.** Its own help centre names the bottom bar: Home,
  Schedule, Timesheet, Search, Messages, and a More section.
- **Housecall Pro — STRONG for the destinations, MEDIUM for the bar.** Its
  help centre lists the top-level nav in order (Home, Inbox, Schedule,
  Customers, My Money, Reporting, Marketing, Price Book) and separately
  confirms the iPhone app has a bottom navigation bar carrying Schedule, with
  a More button bottom-right and settings behind a gear.
- **Square Appointments — MEDIUM.** Calendar, Clients, Items, Reports and
  Settings appear as the app's own sections in Square's support material; the
  page that would show them in order could not be retrieved.
- **Zenbooker — MEDIUM, and it is a proxy.** Its help centre's twelve
  top-level collections are the product's areas, not its navigation. The order
  is meaningful anyway: **Services is first**, before Availability and before
  Managing Jobs.
- **Mobile Tech RX — WEAK, App Store feature list only.** Estimating,
  invoicing, pricing, vehicle tracking, documentation, analytics, team.
- **fieldd — WEAKEST, marketing pages only.** Included because it is the only
  one of the six written specifically for mobile detailing, and because it
  states the thing this product also believes: services and prices sync
  straight to the customer-facing portal.

### 1c. The four findings that actually change our layout

**F1 — "What you sell" is a top-level destination in five of six products. In
ours it is one row, in the second group, of a screen called Settings.** It is
also our single largest screen (`screens/more/Catalog.jsx`, 614 lines — the
biggest file in `app/src` outside the landing page), it is the screen that
decides whether the customer's step 1 fits on a phone (roadmap 2.8b: **10px of
spare room at 1440x900**), and it is the one thing on this platform that is
different per tenant by design. Zenbooker lists Services before anything else.
Housecall Pro gives Price Book a top-level tab. **We give it a chevron.**

**F2 — Schedule and Customers are universal, and we have both.** Six of six.
Our Calendar and Clients tabs are not inherited from Andrew's admin page by
accident; they are what every product in this category ships. **No case exists
for removing either.**

**F3 — Nobody's "More" contains their shopfront, and ours does.** Jobber's
More holds Apps & Integrations, Payments, Support, Refer a Friend, Product
Updates, About, Subscription, Logout and a Settings submenu — **nine things,
and not one of them changes what a customer sees.** Housecall Pro puts the
same class of thing behind a gear. Ours holds the menu, the prices, the hours,
the promo codes, the photos, the colour and the booking link. **That single
comparison is the answer to the owner's question about the More area.**

**F4 — Messages is top-level in four of six and we have none.** Not a defect
of layout: two-way texting needs a dedicated phone number, a carrier
registration and a per-message cost, which is a business decision and a build,
not a tab. What we have instead is `screens/more/MessageTemplates.jsx` plus
the phone's own SMS app, reached from a job. **Recommendation: do not build an
inbox for this item, and do not reserve a tab slot for one.** Named here so it
is not rediscovered later as an oversight.

### 1d. What a detailer's day looks like — and how much to trust it

**This is the weak half of the evidence and it is used only to ORDER things,
never to decide whether they exist.** The trade write-ups agree on a shape: an
early start with a physical setup routine, **a review of the day's schedule
confirming times and locations**, contact with customers between stops to
confirm arrival, and week-scale maintenance. Vendor research (weaker still —
it is written to sell software) converges on two recurring admin jobs:
**reminders to cut no-shows**, and **follow-up to bring past customers back
and fill slow days**. That second one is the only claim below that changes a
recommendation, and it is flagged where it is used (§3d).

---

## 2. What our own product already knows

This is the part that is allowed to look at the current dashboard, because it
is an inventory, not a model. **Everything below was read out of the code
today**, not carried over from a note.

### 2a. Every destination that exists, sorted by how often a detailer touches it

| How often | What | Where it lives now |
|---|---|---|
| **Many times a day** | The day's jobs; the next one; mark complete | Today tab |
| **Many times a day** | One job: call, text, navigate, complete, change, invoice, delete | `BookingDetail` sheet (from anywhere) |
| **Daily** | Record payment, method, tip, extra line items | `FinalizeModal` (from Today or a job) |
| **Daily** | What is coming tomorrow / this week | Today's "Tomorrow" block; Calendar month |
| **Several times a week** | Take a booking over the phone | `NewBookingModal` — button at the **bottom** of Today, and on Calendar |
| **Several times a week** | Am I free on a date? Block a day, one-off hours, drop-off only | Calendar month → `DaySheet` |
| **Weekly** | Who owes me money | Money → "Waiting on payment" |
| **Weekly** | Look a customer up; their notes and history | Clients tab |
| **Weekly** | Find a past job | Calendar → History |
| **Weekly** | Log an expense | Money → Expenses |
| **Weekly / monthly** | Did I make anything | Money → lead figure + chart |
| **When the business changes** | Services, add-ons, categories, vehicle sizes | More → Services & add-ons |
| **When the business changes** | Hours and days off | More → Hours & days off |
| **Seasonally** | Promo codes, site sale | More → Promo codes & sale |
| **Seasonally** | Photos | More → Photo gallery |
| **Occasionally, and shared constantly** | **The booking link** | More → **bottom of the screen** |
| **At setup, then rarely** | Business info, colour | More → Your business |
| **At setup, then rarely** | Booking rules — travel, water/power, notice, gaps, start times, max per day, cancellation window, surcharges | More → Booking rules (541 lines, four sections) |
| **At setup, then rarely** | Which emails send, where alerts go, timing | More → Notifications |
| **At setup, then rarely** | Message templates | More → Message templates |
| **At setup, then rarely** | Team | More → Team |
| **Per device, once** | Maps / calendar / contacts app | More → This device |
| **Once** | Sign out | More → Account |

### 2b. The shape that falls out of that table

The eleven sheets behind More split cleanly in two, and the line is not
"important vs unimportant" — it is **"a customer meets this" vs "this is how
the app behaves for me."**

- **A customer meets it (7):** Services & add-ons · Promo codes & sale ·
  Photo gallery · Hours & days off · Booking rules · Business info · Your
  colour. Plus the booking link, which is not a sheet at all.
- **Plumbing (4, plus the account):** Notifications · Message templates ·
  Team · This device · Sign out.

**Seven of the eleven are the product the detailer sells.** That is the
sentence this whole item turns on.

### 2c. Five things found while taking the inventory

These were not being looked for. Three are defects, two are dead weight.

1. **The push-notification switch does not do anything.** Notifications offers
   "Push notifications on your phone", it writes `push_enabled`, and
   `send-owner-reminders` genuinely tries to send push when it is on. But
   there is **no client code anywhere in `app/`** — no service worker, no
   `PushManager`, no call to `owner-push-subscribe`, no permission prompt. No
   device is ever registered, so nothing is ever delivered. Three edge
   functions and the whole `/job/:id` route ("what a push-notification tap
   opens") exist for a feature with no front end. **A switch a detailer turns
   on that then does nothing is worse than no switch.**
2. **Staff are shown "Your colour" and the database refuses the save.** In
   `More.jsx` that row is flagged not-owner-only, `Appearance.jsx` has no role
   check, and `business_branding` is member-**read**, owner-**write**. A staff
   member can open it, pick a colour, and be silently refused.
3. **A staff member's whole More screen is two rows.** With the owner-only
   rows filtered out it contains "Your colour" (which they cannot save, above)
   and "This device". A tab slot for two rows, one of them broken.
4. **Four tables have no interface at all:** `testimonials`, `campaigns` +
   `campaign_visits` (a `track-visit` function exists and nothing calls it),
   `monthly_plans`, `business_domains`. Three of the four are things the owner
   has already said come back or are coming — reviews and monthly plans are
   named in DECISIONS.md → "Owner decisions", custom domains are roadmap 3.3.
   **They need homes in whatever architecture is chosen, or they get
   rediscovered as surprises.**
5. **The booking link is at the bottom of More.** `docs/ux-audit.md` item 1
   fixed the control — it copies, opens and shares now — and left it below
   eleven rows and six group headings. (**A structural count, not measured in
   pixels.**) It is the most-shared thing the business owns.

---

## 3. The proposed architecture

### 3a. Derived from the day first, then compared

Before looking at our own tabs: a solo detailer's day contains five recurring
questions, and one thing that is not a question at all.

1. **"What am I doing right now?"** — many times a day, one-handed, outdoors.
2. **"When can I fit this in?"** — several times a week, usually while a
   customer is on the phone.
3. **"Did I get paid, and did I make anything?"** — end of day, end of week.
4. **"Who is this, and who should I get back?"** — before a job, and on a slow
   week.
5. **"What do I sell, when am I open, what does my page say?"** — whenever the
   business changes.

And the thing that is not a question: **how this app behaves for me** — which
emails send, which maps app opens, who else can sign in. Set once. **A thing
you set once is not a destination.**

**Five questions, five destinations. The plumbing is not one of them.**

Now the comparison the roadmap asked for: **questions 1 to 4 land exactly
where the product already is** — Today, Calendar, Money, Clients. Question 5
has no home; it is scattered through a screen called Settings. And the
plumbing holds a tab slot it did not earn.

### 3b. The bottom bar

| # | Tab | Why it exists | Why it is in this position | Change |
|---|---|---|---|---|
| 1 | **Today** | Question 1, the highest-frequency screen in the product | Leftmost is home | Role unchanged |
| 2 | **Calendar** | Question 2. Schedule is 6 of 6 in the trade | Next to Today; both are about time | Role unchanged |
| 3 | **Money** | Question 3. Money/reports is 5 of 6 | Owner-only; the middle keeps it off both thumb-easy ends | One change, §3c |
| 4 | **Clients** | Question 4. Customers is 6 of 6 | Beside Money: both are the week, not the day | Re-conceived, §3d |
| 5 | **Business** | Question 5. "What you sell" is 5 of 6, and top-level in every product where the booking page IS the product | Slot 5 is where the hand already goes for "the business-y one" — the habit is kept while its contents change | **New. Replaces More** |

**The header carries the plumbing.** `.topbar` currently shows the business
name on the left and the active tab's name on the right — and the right half
is redundant, because the tab bar already shows which tab is active. A **gear**
goes there and opens Settings as a sheet.

**Why five and not six or four.** Four would mean merging two of the five
questions, and no two of them merge honestly. Six breaks two things at once:
the platform convention (a phone tab bar holds five, and the sixth becomes a
"More" — the thing being removed), and **design-system law 1, every screen a
different skeleton**. There are exactly five skeletons today (the day rail,
the calendar grid, the money chart, the ruled client list, the settings panels)
and a sixth tab would owe the system a sixth. **This proposal needs no new
skeleton:** "Business" inherits the panels skeleton that More gives up, and
the Settings sheet is the "form in a sheet" that all eleven sheets already are.

### 3c. What each tab holds

**1 · Today** — unchanged, with one move.
The day rail, the ledger strip, the lit next job, later today, done and paid,
tomorrow. **The move: "New booking" leaves the bottom of the screen for a `+`
in the header,** available from Today and Calendar. Taking a booking over the
phone happens several times a week, and today that button sits below
everything — including tomorrow's jobs. Housecall Pro does the same thing with
a `+` in the corner. *Cost: the header then carries a name, a `+` and a gear,
and a long business name at 320px has to be measured before it ships.*

**2 · Calendar** — unchanged.
Month grid, the day sheet behind a tapped date (block, one-off hours,
drop-off-only), and History as the second mode. It was worth asking whether
History belongs with Clients — Jobber and Housecall Pro both file past records
with people rather than with the calendar — but ours searches by service text
and status as well as by name, so it is a search over **jobs**, and jobs are
what this tab holds. **No change.** The two deferred items here (week view,
cell weight) are build decisions, not architecture.

**3 · Money** — one change.
The lead figure, the chart and the ledger stay exactly as they are; they are
the screen's identity and its skeleton. **The change: when money is
outstanding, a single lit line goes directly under the lead figure — "$340
waiting on payment" — and jumps to the list further down.** Everything else on
Money is a report you read; the unpaid list is work you do, and it is
currently the fourth thing on the screen. This respects the one-light rule
(`dashboard-skeletons.md` §6: unrecorded money outranks everything) without
putting a list above the figure that gives the tab its name.

**4 · Clients** — re-conceived; see §3d.

**5 · Business** — a new screen, and mostly More re-grouped.

```
Business                                          [owner only]

  ▸ Your booking link — the address, Copy · Open · Share    ← first, not last

  WHAT YOU SELL
     Services & add-ons      6 services · 2 add-ons · 4 sizes
     Promo codes & sale      Site sale on · 2 codes

  WHEN YOU WORK
     Hours & days off        Mon–Sat · 8:00 AM – 6:00 PM
     Booking rules           Mobile & drop-off · 1 day notice

  WHAT YOUR PAGE SAYS
     Business info           Andrew's Auto Detail
     Photo gallery           12 photos
     Your colour             ●  Used everywhere, including here

  [ YOUR WEBSITE — reserved for Phase 3: pages, about, FAQ, reviews ]
```

Three groups instead of six, in the order a detailer meets them: what you
sell, when you can be booked, what your page says about you. Every row keeps
the self-answering summary line it already has — that behaviour is the best
thing about the current More screen and none of it is being thrown away.

**The admission test, and it is the point of the name.** *A row belongs on
this tab only if it changes what a customer meets on your page.* "More" became
a junk drawer because its name admitted anything; the name refuses
everything that is not customer-facing. **That rule is worth more than the
re-grouping, because it is what stops the drawer forming again.**

**Settings — behind the gear, not a tab.**

```
Settings                                    [a sheet, from the header]

  Notifications           8 of 10 emails on
  Message templates       Texts you send from a job
  Team                    2 people                        [owner only]
  This device             iPhone · Apple Maps · Calendar
  Account                 Signed in as an owner · Sign out
```

**Why Notifications stays whole and stays here**, even though three of its
switches are emails a customer receives: the sheet is already grouped as "what
your customers get / what you get / where alerts go / timing", which is one
coherent mental model, and the decision is made once at setup. Splitting it
across two homes to satisfy the admission test would scatter it. **The
admission test governs where a whole subject lives, not where each switch
does.**

### 3d. Clients, and the one thing that changes what it is for

Clients today is a search field over a ruled list, plus a sheet with contact
buttons, three facts, a notes box and a history. **134 lines. It is a phone
book, and a phone book does not earn a slot in a five-button bar.** Six of six
competitors carry a Customers destination, so removing it is not the answer —
giving it a job is.

**The job is repeat business.** The already-agreed deferred item is "Clients
sort/filter with lifetime value", which PROJECT-STATE §7 calls "the one owners
will hit daily". The trade evidence points the same way — that rebooking past
customers and filling slow days is the recurring admin task — and **that is
the weak half of the evidence, so it is being used only to ORDER an item that
was already agreed, never to justify it.** Two things make Clients a
destination:

- **Sort and filter:** last visit, lifetime value, "not seen in three months".
  Needs no schema — every figure is computable from `bookings`, which this
  screen already reads.
- **A way to act on the answer:** the customer's row already carries Call and
  a text button, and `lib/templates.js` and Message templates already exist.
  The smallest honest version is a filter plus the buttons that are already
  there.

**Explicitly NOT proposed here:** automated re-book nudges on a timer. That
needs a "last contacted" marker (schema), a scheduler decision and a judgment
about how often is too often. It is a feature, not an architecture. Named so
it cannot be smuggled in with a layout change.

### 3e. Homes for the things that currently have none

| Thing | Status | Home in this architecture |
|---|---|---|
| Reviews / `testimonials` | Table, no UI; a website page in Phase 3 | Business → **Your website** group (Phase 3) |
| Monthly plans | Table, no UI; the owner has said it comes back | Business → What you sell |
| Referral / loyalty | Removed; the owner has said it comes back | Business → What you sell |
| Google Calendar sync | Removed; the owner has said it comes back | Settings → This device |
| Custom domain (`business_domains`) | Roadmap 3.3 | Business → Your website group |
| vCard on owner emails | Removed; the owner has said it comes back | Not an architecture question — it is an email template |
| `campaigns` / `track-visit` | Half-built attribution, no UI | **Left unplaced on purpose — see §6** |

---

## 4. What it costs

### 4a. Habits this breaks

- **Everything behind More moves.** Anyone who has learned "Settings → scroll
  → the thing" relearns it once. The owner is the only person with that habit
  today, and it is the habit he asked to have broken.
- **The gear is a new gesture.** Settings stops being a tab and becomes an
  icon. This is what Housecall Pro and Square do; Jobber keeps a More tab. It
  is the one place in this proposal where the trade is split.
- **`+` moves off the bottom of Today.** A win for frequency, a loss for
  anyone who has learned to scroll to it.

### 4b. Code

| Work | Size | Notes |
|---|---|---|
| `screens/YourPage.jsx` | **Small** | `More.jsx` re-grouped: same rows, same sheets, three groups instead of six, the booking link moved to the top |
| Settings sheet from the header | **Small** | The five remaining rows, in the same `Sheet` every screen already uses |
| `App.jsx` tab table + header | **Small** | One row of the table changes; the header gains a `+` and a gear |
| Delete `screens/More.jsx` | **Trivial** | Its content is split, not lost |
| Money's lit "waiting on payment" line | **Small** | The figure is already computed on that screen |
| Clients sort / filter | **Medium** | Already an agreed deferred item; no schema |
| Staff role rules | **Small** | See 4c |
| **Schema** | **NONE** | Nothing in this architecture needs a migration |

### 4c. Staff, which this makes better and which forces one fix

A staff member sees Today, Calendar and Clients — three tabs, no Money
(mirroring the database), and no Business, because `business_settings` is
**owner-only to read** and nine of the eleven sheets are already owner-only.
Their gear holds **This device** and **Account**.

That is cleaner than what they have now, which is a Settings tab containing
two rows, one of which is broken (§2c, items 2 and 3). **The fix it forces:
"Your colour" must stop being offered to staff** — it is offered today and the
database refuses the write.

### 4d. Two costs that are not this item's, but land on it

- **Tabs are state, not URLs** (a standing landmine, PROJECT-STATE §6). This
  proposal does not change that and does not need to; the `+` and the gear are
  state too. But it means a push notification still cannot open "Business" —
  only `/job/:id` is addressable.
- **The push switch (§2c item 1)** should be resolved in the same build:
  either the client subscription gets written, or the switch comes off the
  Notifications sheet until it does. Leaving a switch that does nothing on a
  screen this item is already re-homing would be re-shipping the bug on
  purpose.

### 4e. What this proposal deliberately does NOT do

- **No inbox.** Four of six have one; ours would need a phone number and a
  per-message cost. Named in F4, not reserved for.
- **No new screens invented.** Everything on Business exists today.
- **No visual change.** Same skeletons, same tokens, same components. A row
  that moves looks identical when it arrives.
- **No re-litigation of Today or Calendar.** Both survived the derivation.

---

## 5. The five decisions — ANSWERED BY THE OWNER, 2026-08-31

> **He answered all five the same day.** **Decision 2 he answered himself:
> "I think business is a better name"** — so the fifth tab is **"Business"**,
> not "Your page". **The other four he delegated:** *"the other stuff make the
> correct changes you think is best."* Recorded below against each one. He also
> widened the item — see **Part B**, which is the screen-by-screen half he
> asked for.
>
> | # | Decision | Answer |
> |---|---|---|
> | 1 | Delete "More", give slot 5 to the shopfront | **YES** (delegated; recommendation taken) |
> | 2 | What it is called | **"Business"** — *his own words* |
> | 3 | Clients becomes the bring-people-back screen | **YES**, manual only (delegated) |
> | 4 | Split "Booking rules" | **NO**, leave it as one for now (delegated) |
> | 5 | `+` in the header | **YES**, with the 320px measurement first (delegated) |
>
> **THE ONE THING THAT CHANGES BECAUSE HE CHOSE "BUSINESS".** The name was
> carrying the admission test — "Your page" refused anything a customer could
> not see, for free. **"Business" does not refuse anything**, which is the
> property that made "More" fill up. So the test has to be written down as a
> rule instead of ridden on the label, and it is, here and in
> `docs/dashboard-skeletons.md` when the build lands:
>
> > **A row belongs on the Business tab only if it changes what a customer
> > meets. If it changes how the app behaves for the detailer, it goes behind
> > the gear.** Anything that fits neither is a new destination or is not
> > built — it does not get filed under Business because there was room.
>
> Without that written down, "Business" is "More" with a better name, and this
> item happens again in six months.

### The five, as they were put to him

### Decision 1 — Delete the "More" tab and give the fifth slot to the shopfront?

**What it is.** The fifth button along the bottom is called More, and behind
it are eleven screens: your services and prices, your hours, your promo codes,
your photos, your colour, your business details and your booking rules — plus
five that are really app plumbing (which emails send, your text templates,
your staff, your maps app, sign out). The proposal splits that pile in two.
The seven a *customer* can see become a tab of their own; the five that only
change how the app behaves for *you* move behind a small gear at the top of
the screen.

**If you do it:** the thing you actually sell — your menu and your prices —
stops being filed under "Settings", and your booking link stops being at the
bottom of a long scroll. Every product in this trade that owns a booking page
puts the service list at the top level; five of the six do, and Jobber's own
"More" holds nine things of which not one is customer-facing. **If you don't:**
nothing breaks. It stays a working screen organised by "where does this
setting go" instead of by "who is this for."

**Recommendation: do it.** It is the only change here that answers the
question you actually asked, it needs no database change, and the screen it
creates is the old one re-grouped rather than a new build.

### Decision 2 — What is the fifth tab called?

**What it is.** The tab needs a word under its icon, beside Today, Calendar,
Money and Clients. Two candidates: **"Your page"** or **"Business"**.

"Your page" names the thing the tab edits — the page your customers land on —
which gives you a free rule for the future: if a customer can't see it, it
doesn't belong in this tab. That is exactly the rule "More" lacked, and
lacking it is why it filled up. "Business" is the safer, broader word, and it
will still be right in six months when the tab also holds a whole website —
but broad is how a junk drawer starts.

**Recommendation: "Your page".** The narrow name is doing work: it keeps the
tab from becoming the next More. When the full tenant website lands in Phase
3, the page is still the page — there is just more of it.

### Decision 3 — Should Clients become the "bring people back" screen?

**What it is.** Clients today is a search box over a list of names. You can
look someone up and see their history and notes. What it cannot tell you is
who hasn't been back in a while, or who is worth the most to you. The change
is a sort and a filter — last visit, lifetime value, "not seen in three
months" — over the list that is already there, using figures we already have.

**If you do it:** the tab becomes something you open on a slow week to find
ten people to text, instead of a phone book you only open when you already
know the name. **If you don't:** it stays useful and stays the least-visited
of the five tabs, which is a weak claim on a slot in a five-button bar.

**Recommendation: do it, and keep it manual.** The sort and the filter need no
database change and are already on the deferred list. Automatic "we miss you"
messages on a timer are a different thing entirely — they need new database
columns and a judgment about how often is too often, and that should be its
own decision later, not smuggled in with a layout change.

### Decision 4 — Split "Booking rules" into two screens, or leave it as one?

**What it is.** Booking rules is now the biggest settings screen in the
product — four sections and about fifteen settings covering two unrelated
subjects: **where you work and what travel costs** (mobile or drop-off, travel
areas and fees, whether you need their water and power, weekend and rush
surcharges) and **when you can be booked** (gap between jobs, notice needed,
how far ahead, start times, most jobs in a day, cancellation window).

**If you split it:** each half is findable, and the travel-and-surcharge half
sits beside your prices, where money lives. **If you don't:** it stays one
long screen you scroll, and the headings inside it already do half that job.

**Recommendation: leave it as one for now.** It is the only item here that
costs a habit without a clear payoff, and this item's real win is the
tab-level split. If it still feels long after you have used the new layout for
a week, splitting it then costs exactly what splitting it now costs.

### Decision 5 — Move "New booking" to a `+` at the top of the screen?

**What it is.** When someone rings to book, you tap New booking. That button
is currently the last thing on the Today screen, below your jobs and below
tomorrow's. The proposal puts a `+` in the bar at the top instead, reachable
from Today and Calendar without scrolling.

**If you do it:** taking a booking over the phone stops being a scroll.
**If you don't:** it stays where it is, which is fine with two jobs and a
scroll with six.

**Recommendation: do it**, with one measurement first — the top bar would then
carry your business name, the `+` and the gear, and a long business name on a
320px phone has to be checked before it ships. That check is
`node scripts/sweep-widths.mjs`, which already runs 320 by default.

---

## 6. What this proposal could not settle

Named rather than hidden, in the tradition of `detailer-research-2026-08-31.md`.

- **Where "where do my bookings come from" lives.** `campaigns`,
  `campaign_visits` and the `track-visit` function are half of an attribution
  feature with no interface. It is not a page setting, and it is not really a
  Money figure either — it is a report. There is no good home for it in a
  five-tab bar, and inventing a sixth destination for a feature nobody has
  asked for would be exactly the mistake this item exists to undo. **Left
  unplaced deliberately.**
- **Whether a three-tab bar looks broken to a staff member.** Reasoned about
  (§4c), never seen. Nobody has run this product as staff on a phone.
- **How often a detailer who is not Andrew opens each screen.** The frequency
  column in §2a is derived from what each screen does, not from telemetry,
  because there is none. It is the load-bearing assumption of the whole
  proposal, and it is an assumption.
- **Whether the gear is discoverable.** Two of the four documented products
  use an icon; Jobber keeps a More tab. If a detailer cannot find sign-out,
  that is the failure mode, and it is worth watching for rather than arguing
  about now.
- **Nothing here was verified in a browser**, because nothing was built. The
  proposal's measurements — the header at 320px, the new tab's scroll depth —
  belong to the build item.

---

## 7. Sources

The trade's software, read from its own documentation:

- [Jobber — App Basics (the bottom bar, and what is in More)](https://help.getjobber.com/hc/en-us/articles/7061327071639-Jobber-App-Basics)
- [Jobber — Schedule in the Jobber App](https://help.getjobber.com/hc/en-us/articles/6766253760279-Schedule-in-the-Jobber-App)
- [Housecall Pro — Navigating Housecall Pro (top-level nav, in order)](https://help.housecallpro.com/en/articles/6934643-navigating-housecall-pro)
- [Housecall Pro — Viewing your schedule in the field (the mobile bottom bar)](https://help.housecallpro.com/en/articles/1029139-viewing-your-schedule-in-the-field)
- [Square — Navigate your Appointments dashboard](https://squareup.com/help/us/en/article/5348-navigate-your-appointments-dashboard)
- [Square — Square Appointments iPhone app](https://squareup.com/help/us/en/article/5425-square-appointments-iphone-app)
- [Zenbooker Help Center — the twelve top-level areas, Services first](https://help.zenbooker.com/en/)
- [Zenbooker — the mobile app collection](https://help.zenbooker.com/en/collections/6076750-zenbooker-mobile-app)
- [Mobile Tech RX — App Store listing](https://apps.apple.com/us/app/mobile-tech-rx/id962620179)
- [Mobile Tech RX — app features](https://www.mobiletechrx.com/features/)
- [fieldd — CRM (services and prices sync to the customer portal)](https://fieldd.co/crm)

A detailer's day — the weak half, used to order and never to decide:

- [A day in the life of a mobile detailer](https://medium.com/@zscleansandiego/a-day-in-the-life-of-a-mobile-detailer-c75c62ecafad)
- [A day in the life of a mobile auto detailing professional](https://www.autotrainingcentre.com/blog/a-day-in-the-life-of-a-mobile-auto-detailing-professional/)
- [DetailFlow — CRM for auto detailers (vendor marketing; the recurring-reminder claim)](https://usedetailflow.com/)
- [Best appointment reminder software for mobile detailing (vendor marketing)](https://myquoteiq.com/best-appointment-reminder-software-mobile-detailing-2026/)

Already in this repo, and the strongest evidence about detailers we have:
`docs/detailer-research-2026-08-31.md`,
`docs/detailer-menu-shapes-2026-08-31.md`,
`docs/owner-walkthrough-2026-08-30.md`, `docs/dashboard-skeletons.md`.

---
---

# PART B — every screen, looked at

**Added 2026-08-31, on the owner's instruction that the item is bigger than
the tab bar:** *"The layout / redesign was more than just the order of the
tabs but of every GUI and how things look and are laid out, going through
every single GUI tab page whatnot."*

**What that does and does not reopen.** The visual system is still not
reopened — no new colours, faces, tokens or motion, and no
direction-generating skill. What Part B covers is **composition and layout**:
which container a thing sits in, how many of them there are, what a screen
shows, and what it does at a width nobody designed it for. That is the same
kind of question as "which tab does this live on", asked inside a screen
instead of across the bar. Where a change would touch the LOOK, it says so and
stops.

## B0. How this was done

Every dashboard screen and all eleven settings sheets were shot in a real
browser at **1920 / 1440x900 / 768x1024 / 392x844** — 68 PNGs in `shots-2.10/`
via `scripts/shoot-dashboard.mjs`. The four surfaces that script cannot reach
(the day sheet, the booking detail sheet, Calendar's History mode, the client
sheet) were driven by hand in a browser and shot separately. **Console was
clean at every width** apart from two React Router v7 future-flag warnings,
which are notices about a version we are not on.

**Every number quoted below was measured against the running app**, not
estimated from code. Layout boxes only (`offsetWidth` / `offsetTop`), never
`getBoundingClientRect` on a transformed element — design-system law 12.

**The PNGs are NOT committed** — `.gitignore` excludes `shots-*/` on purpose
and this set is 24MB. So every observation below is written out in words and
every number is in this file, because **the file is what survives and the
screenshots are not.** To regenerate them:
`OUT=shots-2.10 node scripts/shoot-dashboard.mjs` with the dev server up, then
the same command with `--more "…"` for the sheets.

**One caveat on the demo data, because it shaped what could be seen.** Today
is Monday and the demo business is closed Sunday and Monday, so **Today had no
jobs on it** and the populated Today could not be photographed. The seed also
puts "completed and paid" jobs on tomorrow's date, which is not a state that
can happen in life. Neither is a product defect — but it means **the busiest
state of the busiest screen in the product has still never been looked at**,
and that is a gap the build item should close by seeding a realistic day
first.

---

## B1. The finding that outranks the tab bar: THERE IS NO DESKTOP LAYOUT

**The dashboard renders one 724px column at every width from 768px upward.
Measured, at both sizes:**

| Viewport | `.app-main` | Content column | Screen unused |
|---|---|---|---|
| **1920 x 1080** (his own monitor) | 760px | **724px** | **60%** |
| **1440 x 900** | 760px | **724px** | 47% |
| 392 x 844 (the phone) | 392px | 356px | — |

The column does not grow. It is the same 724px on a 1920 monitor as on a
1440 laptop, and the page is therefore **exactly as tall on the monitor as on
the phone**. Two measurements make that concrete and neither is a rounding:

- **The More screen is 1620px tall at 1920, and 1626px tall at 392.** Six
  pixels apart across a fivefold difference in screen width.
- **Calendar's History is 3,619px tall at 1440 — and 3,619px at 392.**
  Identical to the pixel.

**This is not a bug and it was not an oversight.** The dashboard was built
phone-first on purpose (PRODUCT.md: owners work "usually on a phone, often
between jobs"), and phone-first is right. But phone-first does not have to
mean *a phone screenshot stretched down the middle of a monitor*, and the
owner's own screen is 1920. What it costs, screen by screen:

- **Calendar** is a month grid — the one screen in the product that genuinely
  wants width — drawn at 95px cells with 1,160px of black on either side. A
  cell has room for a name and a time at that width and shows a 6px dot.
- **Clients** draws eight rows, each using about a third of its own row width,
  with 60% of the monitor empty — while the last-visit date and the lifetime
  spend that decision 3 wants are computed already and shown nowhere.
- **History** stacks 18 bookings down four monitor-heights of scroll.
- **Money** puts a six-bar chart in a 724px strip and scrolls to 1,353px on a
  1080px screen.
- **The client sheet** gives a twelve-character phone number a 600px
  full-width button, and the email another one under it.
- **The eleven settings sheets** are 640px modals — including Services &
  add-ons, which is four lists and the most-edited screen in the product.

**What is proposed, and it is deliberately three cheap moves rather than a
second design:**

1. **Let the column grow where the content is tabular** — roughly 960–1,100px
   on Clients, History and Money. Nothing reflows; the same rows get the width
   they already need.
2. **Two columns where a screen genuinely has two readings.** Calendar: the
   month beside the selected day, instead of the day arriving as a modal over
   it. Money: the figures beside the lists. Today: the day beside tomorrow.
   Below the breakpoint each collapses back to exactly what ships now.
3. **Let list rows carry the columns they already compute.** Clients has last
   visit and lifetime spend in the sheet; History has the status and the
   total. On a phone they stay stacked; on a monitor they become columns.

**The constraint on all three, and it is the one that matters:** this must not
become a second design. Law 1 says every screen a different skeleton — a
skeleton is allowed a wide form, but it must be recognisably the same
skeleton. The day rail stays a rail; the month stays a grid. **This is a
decision for the owner (§B6, decision 6)**, because it is the only part of
Part B that adds work rather than moving it.

---

## B2. Screen by screen

Each entry is what the screen is, what was seen wrong with it, and what
changes. **"Seen" means seen** — every item below was observed in a
screenshot or a live browser, not inferred from the source.

### Today

**What it is:** the day rail — the date masthead, a two-cell ledger strip,
the lit next job, later today, done-and-paid, tomorrow, and a New booking
button at the very bottom. 1,112px tall on a phone with an empty day.

1. **The empty day says "nothing booked" three times.** The masthead subtitle
   says "Afternoon · nothing booked"; the ledger's left cell says "0" and
   "Nothing booked"; the right says "$0.00" and "Nothing collected yet"; and
   then a dashed box says "No jobs booked for today." **Four statements of one
   fact, filling the first screen.** A day with no work is a real and frequent
   state — every Sunday and Monday for this business — and it currently
   produces the emptiest possible screen at maximum verbosity.
   **Change:** the ledger strip and the dashed box are the same information;
   on an empty day one of them goes, and the space belongs to the next thing
   the detailer can actually do (tomorrow, or take a booking).
2. **"New booking" is the last element on the screen**, below tomorrow's jobs.
   Decision 5 already moves it to the header.
3. **Tomorrow's jobs are full cards, not a preview.** Three of them at 176px
   each. Tomorrow is context, and the screen's own rule (settled jobs collapse
   to a line) already knows how to demote something.

**What is right and should not be touched:** the rail, the lit-card rule, the
single ledger strip split by a hairline instead of two tiles.

### Calendar — month

**What it is:** the seven-column grid, a Month/History segmented pair, a New
booking button, and a five-symbol legend.

1. **The legend decodes five marks and the month contains three.** Booked (a
   hollow ring), Done (a filled disc), No-show (a dash), Blocked (a filled
   square), One type only (an outlined square). At the size these render, the
   ring, the filled square and the outlined square are genuinely hard to tell
   apart — and the legend needs two rows on a phone to say so.
   **Change:** the marks are load-bearing (roadmap 2.4 made them shapes on
   purpose, so they survive any tenant accent) — but a legend that is bigger
   than the thing it explains is the tell. On a monitor the cell has room to
   write the fact instead of encoding it.
2. **42 bordered boxes, mostly empty.** Defensible — a day is tappable, so it
   is an object — but at 95px on a monitor it is a grid of empty cards.
3. **New booking is top-right here and bottom-of-page on Today** — the same
   action, two placements, on adjacent tabs. A third lives inside the day
   sheet ("Add a job on this day"). **Three placements for one action.**
   > **RESOLVED 2026-09-01 (stage 3), and not by deleting all three.** The two
   > *New booking* buttons carried no date and are gone; the header `+` is the
   > doorway. The day's third one carries THIS day, which is a capability the
   > other two never had, so it survives demoted to a `.btn.sm` beside the
   > jobs. Two doors for one action, one door for a different one.
4. **The day-cell accessibility label says "1 jobs".** A plural bug in the
   `aria-label`, read aloud by a screen reader.
   > **FIXED 2026-09-01 (stage 3)**, and the label had a second half nobody had
   > written down: it spoke the raw `2026-09-02`, which is read as digits, and
   > it named neither *blocked* nor *one type only* — the two facts the cell
   > carries by SHAPE, and therefore the two a screen reader had no way to
   > reach. It reads *"Wednesday, September 2, 2 jobs"* now.

**What is right:** at 392 this screen is genuinely good — the grid fills the
width, today is an unmistakable filled disc, and it reads as a month.

### Calendar — History

**What it is:** search over every booking, with a status filter, a date range
and a totals bar. 18 results in the demo.

1. **Eighteen records drawn as eighteen identical cards, 3,619px tall.** This
   is the exact defect `docs/ux-audit.md` item 9 fixed on Clients — *"eight
   cards filling a phone → a ruled list"* — reappearing on a different screen
   with more than twice the rows. Design-system § Composition: **a collection
   of records is a ruled list; a card is for an object you act on.**
2. **The test that exists to catch this cannot see it, and that is the more
   important half.** `tests/composition.test.mjs` test 1 matches a `.map(...)`
   whose callback contains `className="…card…"` **in the same file**. History
   maps onto `<BookingCard>`, a component — no `className` in Calendar.jsx —
   and `BookingCard.jsx` is on the test's ALLOWED list, reasoned as "a job is
   an object you act on". **So the rule is enforced only where somebody writes
   a card inline, and any screen may render an unbounded list of cards through
   a component and pass.** That is the "a skipped check reads exactly like a
   passing one" family (DECISIONS.md, the five that have cost sessions) in a
   new shape: not a check that was skipped, a check that cannot see the most
   common way its rule is broken.
   **This is decision 7 (§B6)** — it is a change to a test, and tests in this
   repo are load-bearing.
3. **Nine filter chips in two rows** (five statuses, four ranges) above the
   results.

**Change:** History becomes a ruled list with columns — date, who, what,
status, total. On a phone the columns stack; on a monitor they are columns.
The cards stay where cards belong: Today, the day sheet, and the unpaid list
on Money, each of which is a small set of objects you act on one at a time.

### Calendar — the day sheet

**What it is:** what a tapped date opens — the day's jobs, "Add a job on this
day", and three whole-card controls (Block this day / Hours / How this day
works).

**This is the best-composed screen in the dashboard and nothing should move.**
Each control states its current value and is tappable across its whole box
(roadmap 2.7's W1), and the undo stays on its own explicit control. The one
change is second-order: at desktop width it should be the right-hand column
beside the month (B1), not a modal over it.

### Money

**What it is:** period chips, a stepper, the net lead figure, a six-bar chart,
a sunken ledger of eight to eleven cells, the unpaid list, and expenses.
1,353px tall on a 1080px screen.

1. **"Waiting on payment" is the fourth thing on the screen** and it is the
   only thing on it you can *act* on. §3c already moves a lit line up under
   the lead figure.
2. **"Nothing outstanding" gets a full dashed box.** A non-event given the
   same weight as a list of debts. Same family as Today's empty state.
3. **A loss and a win are still the same size.** The bar height is the
   absolute value, so −$114 and +$114 draw identically; roadmap 2.7 fixed the
   *confusion* by colouring a negative bar red (money down is meaning, law
   11b), and that is the right fix for "which is it". But at a glance the
   month with the biggest loss reads as the smallest month, because the bar is
   short. **Change:** a zero line, so a negative bar hangs below it. That is
   composition, not colour, and it costs one rule.
4. **Three controls for one question.** Chips choose the length, arrows choose
   which one, and a label names it — stacked as three rows. At desktop width
   they fit on one line.
5. **"Quoted up front / Added on site"** is still there and is still the
   metric PROJECT-STATE has flagged for demotion. Part B does not re-decide
   it; it belongs in the build.

### Clients

**What it is:** a masthead with a count, a search field, and a ruled list of
eight people.

1. **A row shows name, phone and email — and nothing that helps you choose
   one.** No last visit, no spend, no next appointment. **The sheet behind the
   row computes all three** (`Visits 3 · Total spent $675.00 · Last visit …`).
   The list has the data and shows the least useful third of it. This is
   decision 3, and the screenshot is the argument for it.
2. **"Last visit" can print a date in the future.** It is
   `completed[0]?.booking_date` from a newest-first list, so a booking already
   marked completed on a future date — which the demo contains — is announced
   as the last visit. Small, real, and a one-line fix.
3. Search matches name and phone only; the placeholder says so, which is
   honest, but History next door searches service text too.

### The client sheet

1. **The phone number is on the screen twice** — as the subtitle under the
   name and again as a full-width button.
2. **Every history row inside one person's sheet repeats that person's name.**
   You are inside Marcus Webb; each card says "Marcus Webb".
3. **A large empty notes textarea sits between the facts and the history**,
   which is the third of the four blocks and the one most often left blank.
4. The three facts (`Visits / Total spent / Last visit`) are ruled rows and
   are the best part of the sheet — and are the thing the list should borrow.

### More → Business

**What it is today:** eleven rows in six cards under **eight** group
headings, plus the booking link and an account block. **1,620px tall at every
width, measured.**

1. **The screen is titled "Settings" and the tab is labelled "More".** Two
   names for one place, visible simultaneously — the tab bar says More, the
   masthead says Settings.
2. **Eight headings for eleven rows.** Three of them own a single row
   ("Access" → Team; "This device" → Maps; "Account" → sign out). A heading
   that owns one row is a label pretending to be a group.
3. **The booking link is 1,156px down — 1.35 phone screens.** Measured. The
   most-shared thing the business owns, below everything.
4. **Six cards of one to three rows each**, stacked, which is close to the
   composition tell the system names by hand.

**Change:** this is §3c — three groups, the link first, and the plumbing
behind the gear. Under the new grouping the same eleven rows sit under **three
headings on the Business tab and one list behind the gear**, and every heading
owns at least two rows.

### The eleven settings sheets

Walked all eleven. Nine are fine and need only their new home. Two are not:

**Services & add-ons — the biggest screen in the product, in a 640px modal.**
Four lists in sequence (Categories, Services, Add-ons, Vehicle sizes), each
row a card, each row carrying **two round reorder arrows** — about 130px of
every row, and eighteen buttons on one screen for an action performed rarely.
And the services are listed flat: **the detailer edits a flat list while the
customer meets a grouped menu**, so the structure being edited is not the
structure being sold. **Change:** services nest under their category, the
reorder control stops occupying every row (drag, or a reorder mode), and at
desktop width this stops being a modal — it is the one settings screen that
deserves the whole tab.

**Booking rules — a setting that announces it is dead and stays editable.**
"Travel fee — *Replaced by your travel areas below — each area sets its own
fee*" sits next to a live `$25` input. Roadmap 2.9 fixed how that sentence
*wraps*; the underlying problem is that a superseded field is still on the
screen and still holds a value. **Given this product has already shipped a
travel fee that was printed and never charged** (roadmap 2.8c), a dead
travel-fee input that a detailer can still type into is the wrong thing to
leave lying around. **Change:** when travel areas exist, the old flat fee
becomes a sentence, not a field.

Also on that sheet: **"Open slots in the next 7 days · 35"** is the only
figure on any settings screen and reads as a stray. It is genuinely useful —
it belongs on Today or Calendar, where a number about the near future has
neighbours.

### The modals

**New booking — it offers choices the server will reject.** Services render
as a flat wrap of chips with no categories and no `max_select`. The demo's
menu is two pick-one categories; `create-booking` enforces that on the server
and returns *"Please choose just one service from Exterior."* **So the owner
can fill in the whole form, submit, and be refused for obeying a rule the form
never showed them.** This is the same shape as roadmap 2.7's W4 — a rule that
existed on the customer's page and not on the gate the owner goes through.
Vehicle sizes were checked and are **fine**: the modal reads
`settings.vehicle_sizes` and only falls back to small/medium/large when the
tenant has defined none.
Its empty state also says *"Add them in the More tab under Services"* — one of
the strings the rename has to follow.

**Booking detail** — five action buttons across two ragged rows (three, then
two wider ones), and "Estimated $235.00 · Final $235.00" prints the same
number twice whenever nothing changed on the job, which is most jobs.

**Finalize payment / Expense** — walked, nothing found. The finalize order
(total and method first, extras after) is the fix ux-audit item 2 made and it
has held.

### Sign in / create business

Small centred card on the ground, with the **default** green accent because no
tenant is loaded yet — correct, and the stale-accent bug from roadmap 2.3 has
stayed fixed. Nothing to change.

---

## B3. The patterns underneath, which are worth more than the list

Six things recur across unrelated screens. Fixing the pattern is cheaper than
fixing the instances, and stops them coming back.

1. **An empty state repeats itself.** Today says "nothing booked" four ways;
   Money gives "Nothing outstanding" a dashed box; the gallery row says "0
   photos". **Rule: an empty state says the thing once, and spends the rest of
   the space on what to do next.**
2. **One action, three doorways.** New booking is bottom-of-page on Today,
   top-right on Calendar, and inside the day sheet. Decision 5 makes it one.
3. **Records drawn as cards.** History (18), and the pull toward it everywhere
   else. The rule exists and its test cannot see the common violation
   (decision 7).
4. **A group heading that owns one row.** Three on More.
5. **A control that is shown and cannot work.** The push switch (no client at
   all), the travel-fee field (superseded), "Your colour" for staff (the
   database refuses it). **Rule: if it cannot do anything, it is not on the
   screen.**
6. **The phone layout is shipped to the monitor unchanged.** §B1.

---

## B4. Everything found by looking, in one table

Nothing here is fixed — this item changes no code.

| # | Where | What | Kind |
|---|---|---|---|
| 1 | Notifications | Push switch has no client anywhere in `app/`; nothing is ever delivered | **Defect** |
| 2 | More / Appearance | Staff are shown "Your colour"; `business_branding` refuses the write | **Defect** |
| 3 | More | A staff member's whole screen is those two rows | Defect |
| 4 | New booking | Offers service combinations `create-booking` returns 409 for | **Defect** |
| 5 | Booking rules | A superseded travel-fee field, still editable, still holding $25 | **Defect** |
| 6 | Clients | "Last visit" can print a future date | Defect |
| 7 | Calendar | ~~Day cell `aria-label` reads "1 jobs"~~ **FIXED 2026-09-01, stage 3** — and the label was rebuilt around it: it spoke a bare `2026-09-02`, which a screen reader reads as digits, and named neither of the day marks. | Defect (a11y) |
| 8 | Calendar / History | ~~18 records as 18 cards; 3,619px~~ **FIXED 2026-09-01, stage 3** — a ruled list with columns under month rules; **3,942 → 1,373px at 1440**, 1,973px at 392. | Composition |
| 9 | `composition.test.mjs` | ~~Test 1 cannot see a card rendered through a component~~ **FIXED 2026-09-01, stage 3** — it resolves card components and keys allowances to `file > component`. **Its first rewrite still passed against the commit it was written to catch**; baselined both ways now. | **Test blind spot** |
| 10 | Today | An empty day states one fact four times | Composition |
| 11 | Money | ~~"Nothing outstanding" gets a dashed box~~ **FIXED 2026-09-01, stage 4** — both dashed boxes are gone; a section with nothing in it is not drawn, and a whole screen with nothing on it says so once under a $0.00 that is correct rather than empty. | Composition |
| 12 | Money | A loss and a win draw the same height; no zero line | Composition |
| 13 | Everywhere ≥768px | One 724px column; 60% of a 1920 screen unused | **Layout** |
| 14 | More | Titled "Settings", tab labelled "More" | Copy |
| 15 | More | Eight headings for eleven rows; three own one row | Composition |
| 16 | More | Booking link 1,156px down | Composition |
| 17 | Services & add-ons | Flat list where the customer meets a grouped menu; 2 arrows per row | Composition |
| 18 | Client sheet | Phone number printed twice; every history row repeats the client's name | Composition |
| 19 | Booking detail | "Estimated $235.00 · Final $235.00" when nothing changed | Copy |
| 20 | Today / Calendar / day sheet | Three doorways to New booking | Consistency |
| 21 | Demo seed | Jobs "completed and paid" on a future date; today is a closed day | **Test data** |

---

## B5. Build order, when he approves

Grouped so that each stage is shippable and verifiable on its own. **Nothing
starts until §B6 is answered**, because decision 6 changes what the screens
are being built into.

1. **The navigation** (Part A) — Business tab, gear, `+` in the header, delete
   More. Small, and it makes the rest easier to describe.
2. **The five defects that are live** — table rows 1, 2, 4, 5, 6. None is
   layout; all are things the product currently says that are not true.
3. **The composition fixes that need no new layout** — rows 10, 11, 14, 15,
   16, 18, 19, plus row 7.
4. **History becomes a ruled list, and the test learns to see it** — rows 8
   and 9 together, because fixing one without the other means it returns.
5. **Clients earns its tab** — decision 3's sort and filter, using the figures
   the sheet already computes.
6. **The desktop layout** — only if decision 6 says yes. Last, because it is
   the only stage that adds rather than moves, and because every stage above
   it is easier to do in the narrow column and then widen.

**Verification for every stage is the routine that already exists:**
`sweep-widths.mjs` (392/360/320, both paths) for anything that moves a box,
the four credential-free tests, `accent-sweep.mjs` if a colour is touched, and
screenshots read at 1920 / 1440x900 / 768x1024 / 392x844. **A desktop layout
adds one thing the routine does not currently have: 1920 and 1440 are
*screenshotted* but not *swept*.** If decision 6 is yes, `sweep-widths.mjs`
should grow the two desktop widths, or the widening will be checked by eye
only.

---

## B6. Two more decisions — BOTH ANSWERED, 2026-08-31

> **Decision 6 — YES.** His words: *"desktop should get an actual layout
> specified just for desktop."* Note **"specified"** — not "widened". The
> desktop layout is a written specification with its own decisions, not a
> couple of breakpoints added to the phone layout as an afterthought. It is a
> deliverable of the rebuild (roadmap 2.11, step 3), not a polish pass.
>
> **Decision 7 — he declined the question**: *"I don't like the question."*
> Taken at face value and not re-argued. What happens to it: **the finding
> does not go away and does not need him.** `composition.test.mjs` test 1
> still cannot see a card rendered through a component, and History still
> draws 18 records as 18 cards. But asking him to rule on the internals of a
> test was the wrong thing to put in front of him — it is a craft decision,
> not an owner decision, and it should never have been on his list. **It is
> settled inside roadmap 2.11 instead:** a from-scratch dashboard decides what
> a list is and what a card is as part of its component inventory (step 5),
> and the test is written to match that decision when the code lands. Recorded
> here so a later session does not re-ask him.
>
> **AND HE REPLACED THE REST OF THE ITEM WITH SOMETHING BIGGER** — a
> from-scratch rebuild of the whole dashboard, properly sequenced. That is
> **roadmap 2.11**, and his words are quoted in full there. Everything in this
> file stays true and becomes an INPUT to it: Part A's architecture is
> approved and does not get re-derived, and Part B's 21 findings are the list
> of what the rebuild must not reproduce.

### The two, as they were put to him

### Decision 6 — Should the dashboard get a real desktop layout?

**What it is.** Right now the dashboard draws one narrow column, 724 pixels
wide, no matter how big the screen is — the same width on your 1920 monitor as
on a 1440 laptop. Measured: on your monitor, **60% of the screen is empty
black**, and the More screen is 1,620 pixels tall on the monitor and 1,626 on
a phone. It was built for the phone on purpose, and that was the right call —
but it means that when you sit at your desk you are looking at a phone app in
the middle of a large screen. The proposal is three things: let the column
grow where the content is a table; put two columns side by side on the three
screens that have two things to show (the month beside the day you tapped, the
money figures beside the lists, today beside tomorrow); and let list rows show
the extra columns they already calculate.

**If you do it:** the calendar becomes usable at a desk — a day cell gets big
enough to write the customer's name in — and Clients and History stop being
four screens of scrolling. **If you don't:** nothing breaks, and the phone,
which is where the work actually happens, is unaffected either way. The cost
is that this is the only part of the whole audit that adds work rather than
moving work: every other change is re-grouping things that exist.

**Recommendation: yes, but last** — after the navigation and the defects, and
built so that below 768 pixels the screens collapse to exactly what ships
today. And one condition: the checking script that walks the narrow widths
should learn the two wide ones at the same time, or the desktop layout is the
only part of this product nothing automatically checks.

### Decision 7 — Should the composition test be taught to see through components?

**What it is.** The design system has a rule: a long list of records should be
a plain ruled list, and a card is for a single thing you act on. There is an
automatic test for it. **It missed a live case** — the History list draws 18
bookings as 18 cards, four screens of scrolling — because the test only spots a
card when someone writes the word "card" directly in the screen's own file, and
History builds its cards through a shared component. So the rule is only
enforced in the easy case.

**If you fix it:** the test starts counting how many cards a screen can produce
from a list, and complains past a small number — which would have caught this
one. **If you don't:** the rule keeps being real on paper and optional in
practice, and the next screen that grows a long list repeats it.

**Recommendation: fix it, in the same change as History.** This repo's own
principle is that a rule with no test is a rule that gets broken again — and
this is worse than no test, because a passing suite reads as proof. It is the
same lesson as the skipped-contrast check: **a check that cannot see the
common failure looks exactly like a check that passes.**
