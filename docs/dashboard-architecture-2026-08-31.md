# The dashboard's architecture, rethought — 2026-08-31 (roadmap 2.10)

**Nothing in `app/` changed in this item. This is a proposal; the owner
approves it before any code, and the build gets its own roadmap item the way
2.8b did for 2.8.**

**The LOOK is not reopened.** "The Thread" (`docs/design-system.md`) stands,
the skill-collision rule stands, and no direction-generating skill ran against
this. What was reopened is WHERE THINGS LIVE: how many bottom tabs there
should be, what belongs on each, and how the eleven settings sheets behind
More should be grouped, ordered and named.

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

PROPOSED  Today  Calendar  Money  Clients  Your page        [⚙ in the header]
                                           └ the 7 a        └ the 5 that are
                                             customer sees    app plumbing
```

**Five decisions for the owner are at the end (§5).** Everything above them is
the reasoning.

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
| 5 | **Your page** | Question 5. "What you sell" is 5 of 6, and top-level in every product where the booking page IS the product | Slot 5 is where the hand already goes for "the business-y one" — the habit is kept while its contents change | **New. Replaces More** |

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
skeleton:** "Your page" inherits the panels skeleton that More gives up, and
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

**5 · Your page** — a new screen, and mostly More re-grouped.

```
Your page                                          [owner only]

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
a junk drawer because its name admitted anything; "Your page" refuses
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
| Reviews / `testimonials` | Table, no UI; a website page in Phase 3 | Your page → **Your website** group (Phase 3) |
| Monthly plans | Table, no UI; the owner has said it comes back | Your page → What you sell |
| Referral / loyalty | Removed; the owner has said it comes back | Your page → What you sell |
| Google Calendar sync | Removed; the owner has said it comes back | Settings → This device |
| Custom domain (`business_domains`) | Roadmap 3.3 | Your page → Your website group |
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
(mirroring the database), and no Your page, because `business_settings` is
**owner-only to read** and nine of the eleven sheets are already owner-only.
Their gear holds **This device** and **Account**.

That is cleaner than what they have now, which is a Settings tab containing
two rows, one of which is broken (§2c, items 2 and 3). **The fix it forces:
"Your colour" must stop being offered to staff** — it is offered today and the
database refuses the write.

### 4d. Two costs that are not this item's, but land on it

- **Tabs are state, not URLs** (a standing landmine, PROJECT-STATE §6). This
  proposal does not change that and does not need to; the `+` and the gear are
  state too. But it means a push notification still cannot open "Your page" —
  only `/job/:id` is addressable.
- **The push switch (§2c item 1)** should be resolved in the same build:
  either the client subscription gets written, or the switch comes off the
  Notifications sheet until it does. Leaving a switch that does nothing on a
  screen this item is already re-homing would be re-shipping the bug on
  purpose.

### 4e. What this proposal deliberately does NOT do

- **No inbox.** Four of six have one; ours would need a phone number and a
  per-message cost. Named in F4, not reserved for.
- **No new screens invented.** Everything on Your page exists today.
- **No visual change.** Same skeletons, same tokens, same components. A row
  that moves looks identical when it arrives.
- **No re-litigation of Today or Calendar.** Both survived the derivation.

---

## 5. The five decisions — the owner answers these before anything is built

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
