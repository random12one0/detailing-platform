# How the dashboard's screens should work — research, 2026-08-31 (roadmap 2.11, step 2)

**Roadmap 2.10 researched NAVIGATION — which tabs, in what order — and stopped
there. This is the half it did not do:** how an individual screen should work.
The day view, the job record, the money screen, the client record, dense list
design, and dashboard layout at desktop width.

Same discipline as roadmap 2.8 and 2.10, and it is not decoration: **the
products' own documentation rather than review sites, source strength marked
per claim, counts rather than impressions, and what the sample cannot tell you
written down at the end.**

**Nothing here decides anything.** It is the evidence step 3 (the desktop
specification) and step 4 (screen by screen) are allowed to lean on. Where a
finding contradicts something already approved, it says so and defers — the tab
bar is settled and this file does not reopen it.

---

## 1. Method, and how much each claim weighs

Every claim below is tagged with a strength, and the tag is not a formality —
it is what says whether a finding can carry a design decision on its own.

| Tag | What it means |
|---|---|
| **STRONG** | The vendor's own help centre, describing its own screen, retrieved and read in full today |
| **MEDIUM** | The vendor's own material, but reached through a search summary rather than the full page, or a page whose body would not retrieve |
| **INDEPENDENT** | Not a vendor. Nielsen Norman Group and Apple's Human Interface Guidelines — research and platform convention rather than a competitor's choice |

**Six products were compared in 2.10 (Jobber, Housecall Pro, Square
Appointments, Zenbooker, Mobile Tech RX, fieldd).** Only three of them publish
screen-level documentation at all: **Jobber, Housecall Pro and Zenbooker.** So
where 2.10 could say "6 of 6", this file mostly says "2 of 3" or "3 of 3", and
that is a smaller sample doing more specific work. **Counts below are out of
the three that document their screens, never out of six.**

**Two pages would not give up their body** and are marked MEDIUM for that
reason alone: Housecall Pro's job-details article and Apple's split-views page.
Their claims are used only where a search summary quoted the page directly.

---

## 2. The day screen — "what am I doing right now"

### What Jobber's Home actually carries — STRONG

Five sections, in this order:

1. **Dynamic setup guide** — *"Actions that will help you get your Jobber
   account up and running will be highlighted in this section"*
2. **Today's appointments** — the team's progress through the day; cards
   scrolled sideways; tapping one opens the visit
3. **Jobber Payments** — money pending to the bank, and available instant
   payout funds
4. **Reminders** — **and this is the finding**: *"only appears when there's
   something to show"*
5. **Business performance** — receivables, upcoming jobs, revenue (current
   month), upcoming payouts, and the **top three** overdue clients

Admin and non-admin users get different Home screens — stated explicitly.

### What Housecall Pro's Home carries — STRONG

*"a centralized view of your business activity with quick access to open items,
key stats, employee status, recent activity, and your schedule."*

### F1 — A home screen's sections are conditional, not fixed. **2 of 2.**

Jobber says it outright about Reminders; Housecall Pro's "open items" is the
same idea wearing a different name. **Ours already does this in one place** —
the warn-box only appears when more than one finished job needs payment — and
**breaks it everywhere else**: an empty Today states the same fact four times
(architecture doc Part B #10), because four sections each print their own empty
message rather than not being there.

**Carries directly into step 4:** an empty state is not each section saying
"nothing"; it is the sections not existing, and one thing on the screen saying
what to do next. That is Part B3's rule 1, and it now has outside agreement.

### F2 — Money summary belongs on the day screen. **2 of 2, and we already agree.**

Both products put money on Home: Jobber gives it two of five sections, Housecall
Pro calls it "key stats". **Our ledger strip — jobs today, expected, collected —
is the same instinct, and this is a confirmation rather than a change.** Worth
recording precisely because step 4 might otherwise "simplify" it away.

Jobber's is richer than ours in one specific way: it names **the top three
overdue clients** on the home screen. Ours puts the unpaid list on Money, and
Part A already proposed a single lit line under the lead figure there. **Two
products in two disagree with putting it only on Money.** Not a decision — a
thing for step 4 to weigh with the one-light rule.

### F3 — The setup guide is Jobber's FIRST home section. **1 of 2, but it is the biggest product in the sample.**

This is direct evidence for the first-run question in the feature inventory
(§9 Q1). The largest product in the category gives its home screen's top slot to
onboarding, and the section is dynamic — it shrinks as you finish. We show a new
detailer five empty screens.

---

## 3. The job record

### What each product's job screen carries

**Housecall Pro — MEDIUM** (the article body would not retrieve; these names
come from its own search summary). The Job Details page has **six sections** —
*"Customer, job, invoice, dispatch, payments, and schedule"* — plus an **action
bar** at the top, a **Summary of Work** field, an **activity feed**, and job
fields (job type, business unit, callback).

**Jobber, in the app — STRONG.** A visit carries a **Details tab** (link to the
client, custom fields, job details) and a **Notes tab** (note plus note
history), then **instructions**, **line items** (quantity shown, cost hidden),
and **checklists** if the job has them. Completing a visit prompts you to
schedule a **follow-up visit for the same job** from the completion prompt.

**Zenbooker — STRONG.** The job object's own fields group into seven blocks:
scheduling (start, end, time slot with an arrival-window length, duration,
timezone), status, customer, service details, location, invoice, and recurring
booking.

### F4 — Every documented job record is SECTIONED. **3 of 3.**

Tabs in Jobber, named sections in Housecall Pro, grouped fields in Zenbooker.
**Not one of them is a single scroll.**

Ours is `BookingDetail.jsx` — 340 lines, one sheet, one scroll — and the feature
inventory counts **23 of the dashboard's 118 capabilities on this one object**,
the largest cluster in the product. **This is the strongest single finding in
this file for step 4:** the job record, not the day, is the screen most in need
of structure, and it is the one screen nobody has ever redesigned.

### F5 — Status vocabularies are small, and cancellation is a flag rather than a state. **1 of 1 that publishes it.**

Zenbooker's job has **three statuses** — `scheduled`, `en-route`, `complete` —
with `rescheduled` and `canceled` as separate booleans beside them. Ours has
five statuses (`pending`, `confirmed`, `completed`, `cancelled`, `no_show`) plus
a payment status.

Two things fall out, and both are step 5's business rather than step 4's:

- **Our mark vocabulary already reached the same conclusion by another route.**
  `theme.css` draws a cancelled job as a **bar** rather than a circle, because
  it is "a job that did not happen" — a different KIND of thing from a job with
  a state. That is Zenbooker's boolean, drawn.
- **`en-route` is a status we do not have**, and it is the one a *mobile* trade
  most obviously needs — it is the moment the customer wants to hear from you,
  and we have message templates for exactly that text. **Named here, not
  proposed:** a new status is a feature and touches the engine, which 2.11 does
  not reopen.

### F6 — Completing a job is a doorway, not an end. **1 of 3, STRONG.**

Jobber offers a follow-up visit from the completion prompt. Ours finishes the
job and, if payment is unrecorded, lights it. **Both are "the completion moment
is worth something"; they spend it differently.** For a detailer, the equivalent
of a follow-up visit is the rebooking that decision 3 put on Clients — so the
question step 4 should ask is whether the completion moment is where "book them
again" belongs.

---

## 4. The money screen

### F7 — Housecall Pro splits money into TWO destinations; we have one. — STRONG

Its top-level nav carries both **My Money** (*"tools for financing and payment
processing"*) and **Reporting** (*"brings together your most important insights
from across all reporting areas into a single, streamlined dashboard"*).

Money you are owed and money you made are different questions, and the biggest
product in the sample gives them different homes. **Ours puts both on one tab**
— the lead figure and chart answer "what did I make", the waiting-on-payment
list answers "who owes me".

**This is not an argument for a sixth tab** — law 1 and the five-slot bar both
forbid it, and Part A settled the bar. It is an argument that **the Money screen
has two readings**, which is exactly what Part B's desktop proposal already
wants to do with it: *"Money: the figures beside the lists."* **The split the
trade makes across two tabs is the split our desktop layout makes across two
columns.** That is a good outcome for step 3 and it should be written into the
spec as the reason, not as a coincidence.

### What the reports actually are — MEDIUM

Housecall Pro's dashboard reports, by name: **Job Revenue Earned** (current week,
against weekly revenue over the past quarter), **Repeat Customer** (percentage
of repeat customers this month, and total revenue from them), **Average Job
Size** (total revenue ÷ jobs completed), **Sales Leaderboard** (per employee).

Three of those four are single figures with a comparison, and **the fourth is
for crews and does not apply to a solo detailer.** Ours is one lead figure and a
six-bar chart, which is the same shape. **Repeat Customer is the one we do not
have and could compute today** — every figure in it is already in `bookings`,
and it is the number decision 3's Clients screen exists to move.

---

## 5. The client record

**Housecall Pro's Customer Profile — STRONG.** Six tabs: **Profile, Estimates,
Jobs, Invoices, Attachments, Notes**. The Profile tab opens with *"Your next
three upcoming appointments show right at the top"*, then contact info in the
left column with customer tasks and private notes, and in the right column the
addresses, a map, **customer tags** and attachments, with an **activity feed**
across the bottom. Tags are internal labels for segmenting. **Lifetime value is
a real metric in the product** — it is what campaigns filter on — though the
profile page's own documentation does not show it as a field.

**Jobber's client screen in the app — STRONG.** The header carries the client's
name and **their balance**. Contact actions are a phone icon and a text icon.
Three tabs: **Client** (details, property, billing address, contact details),
**Work** (*"list of the work for this client, sorted by recent activity"* — type,
status, date last updated, total price, address, filterable by type), and
**Notes**.

### F8 — A client record leads with a NUMBER, and is tabbed. **2 of 2.**

Jobber puts a balance in the header; Housecall Pro puts the next three
appointments at the top and runs lifetime value through the product. Both use
tabs rather than one scroll.

**Ours is a scroll: contact buttons, three facts, a notes box, a history.** And
the figures decision 3 wants — last visit, lifetime spend — **are already
computed and shown only inside the sheet**, never on the list (architecture doc
§B1). So the evidence and our own approved decision point the same way, from
different directions.

### F9 — Tags are how both products segment customers. **2 of 2.**

We have a free-text `customers.notes` field and nothing structured. Decision 3's
Clients screen ("not seen in three months", lifetime value) needs no tags — every
figure is computable from `bookings`. **So tags are NOT proposed**, and this is
recorded as a deliberate no rather than an oversight: they are a second way to
do the same job, and they cost a schema change and a management screen.

---

## 6. Dense lists — the independent research

This is the part with no vendor in it, and it bears directly on the rebuild's
one unresolved craft question: what is a list and what is a card (step 5, where
2.10's declined decision 7 gets settled).

### From NN/g, "The Anatomy of a List Entry" — INDEPENDENT

- *"the top-most and left-most areas of the list entry container garner the most
  attention"* — so priority goes there.
- Emphasise with **font size and weight, or a unique or dark colour**; icons
  help scanning; white space isolates.
- **Consistency across entries is what makes a list comparable.** One exception
  is allowed — a unique callout for a special case — but *"showing unique
  indicators for more than 2–3 situations can make the listing page cluttered."*
- Twenty-two years of testing, one universal request: **the price.**

### F10 — Our booking card carries more indicator types than the research allows. — INDEPENDENT

Counted on the shipped `BookingCard`: a **Mobile/Drop-off** tag, a **status
pill**, a separate **Paid pill**, and on the rail a **node** whose state is a
fourth signal — before the four action buttons. That is four indicator families
where the guidance's ceiling is two or three.

**This is the same finding as Part B #8 (History draws 18 records as 18 cards)
seen from inside a single row rather than across the list.** It is the specific
thing step 5's component inventory has to rule on, and now it has a number
attached rather than an opinion.

**One thing we get right and should not lose:** the price is on every card, top
right. The one attribute every user has ever asked for.

### From NN/g, "Data Tables: Four Major User Tasks" — INDEPENDENT

Tables beat cards through **scalability** and **support for comparison**, because
adjacent data needs minimal eye movement. The four tasks and their guidance:

1. **Find records matching criteria** — the first column must be a
   *human-readable* identifier, not an ID; column order follows user priority;
   filters must be discoverable and visibly active.
2. **Compare** — freeze headers; borders, zebra striping and hover highlighting
   keep the reader's place; sorting must be there.
3. **View or edit a single row** — **"avoid modals, which obscure reference data
   in the table"**; use a non-modal side panel or a separate window. Edit-in-place
   works only for narrow tables.
4. **Act on records** — inline for one or two actions only; more go in a menu.

### F11 — The research says modals are the wrong way to open a record at desktop width. — INDEPENDENT

**Our entire dashboard opens records in modal sheets** — the job, the day, the
client, all eleven settings screens. **On a phone that is right and is not in
question.** On a 1920 monitor it is the pattern NN/g names as the mistake,
because the sheet covers the list you were reading.

Part B's desktop proposal already reached this independently: *"Calendar: the
month beside the selected day, instead of the day arriving as a modal over it."*
**Now it has a reason from outside this repo, and step 3 should write the
principle rather than the instance:** above the desktop breakpoint, a record
opens beside its list, not over it.

### F12 — On a phone, a dense row holds about two columns. — INDEPENDENT

NN/g on mobile tables: *"only 2 columns may fit legibly on a narrow mobile
screen"* for complex entries, though number-heavy columns can be narrower. The
patterns it endorses for small screens are sticky headers, a sticky left column,
letting the user choose which data to show, and accordions for grouped data —
**and it does not recommend collapsing a table into a list.**

**This bounds Part B's third desktop proposal** ("let list rows carry the columns
they already compute"). Our settled row already carries exactly two — a name and
a figure — so **the phone form is already at its ceiling.** The extra columns are
a desktop affordance and nothing is being held back from the phone.

---

## 7. Desktop layout

### From NN/g, "8 Design Guidelines for Complex Applications" — INDEPENDENT

The four that bear on this rebuild:

- **Reduce clutter without reducing capability** — staged disclosure; show
  options only when they are relevant.
- **Ease the transition between primary and secondary information** — let people
  reach supporting detail without leaving the screen they are on.
- **Make important information visually salient** — and the method is the
  interesting part: *"Removing superfluous graphics or visual elements"* makes
  important data stand out **more effectively than adding emphasis.**
- **Help users track actions** — open-ended notes on records reduce the memory
  burden. (We have this on both the customer and the job.)

### F13 — "Make it salient by removing, not by adding" is the design system's own law, from outside. — INDEPENDENT

`dashboard-skeletons.md` §6: at most one object on a screen is lit, and *"a
screen with no qualifying object has no lit element at all."* The research
arrives at the same rule from a different direction. Worth carrying into step 4
as the answer whenever a screen wants a second highlight.

### From Apple's Human Interface Guidelines — MEDIUM

The split-views page would not retrieve its body; the layout page did, and its
headline is the one that matters: **do not simply stretch a small-screen layout
onto a larger display — redesign to use the space**, adding secondary content
rather than widening the primary column, and keeping primary content in a
consistent place across sizes so people are not disoriented.

That is decision 6's own word — **"specified"**, not "widened" — restated as
platform convention. Treated as corroboration only; it is not a measurement.

### F14 — Every product in the sample uses a different navigation SHAPE on desktop than on a phone. — STRONG for Housecall Pro, MEDIUM for the rest.

Housecall Pro states it directly: on desktop there are eight named top-level
destinations, and *"on mobile browsers, navigation items appear in a hamburger
menu (upper left), with a + button replacing the NEW button in the bottom-right
corner."* Jobber's help centre names its **bottom bar** as an app feature and
its Home as *"the landing page for admin users in both Jobber.com and the Jobber
app"* — same destinations, two shapes.

**Ours draws the phone's bottom tab bar unchanged at 1920.**

**Read this carefully, because it is one sentence away from re-opening something
he approved.** Part A settled **which five destinations exist and in what
order**, and that is not in question and does not get re-derived. What F14 raises
is a different question that Part A never asked: **where the bar is DRAWN above
the desktop breakpoint.** That is squarely inside decision 6 — the desktop layout
that has never existed — and it belongs to step 3.

**It also collides with something already true**, which is why it is flagged
rather than recommended: the `+` and the gear were just moved INTO the header
(Part A, approved). If a desktop layout moves navigation to a sidebar, the header
has to be specified for both shapes at once. **Step 3 decides; this file only
says the question exists.**

---

## 8. What this research cannot tell us

Written out because a sample's silence is not agreement.

1. **None of the three products that document their screens is a mobile
   detailer.** They are field-service platforms serving cleaning, HVAC,
   plumbing and lawn care. The one product in the six written specifically for
   mobile detailing (fieldd) publishes marketing pages only — 2.10 already
   rated it the weakest source, and it documents no screen at all. **So every
   screen-level finding here is a shape borrowed from an adjacent trade**, and
   where it collides with what the owner knows about detailing, he wins. That
   has already happened once on this project: roadmap 2.8's menu research was
   overruled by his own menu, correctly.

2. **Not one of them publishes a design RATIONALE.** Help centres describe what
   a screen contains, never why. Every "why" in this file is either NN/g's
   research or my inference, and the inferences are marked as findings rather
   than facts.

3. **Nothing here measures anything.** No source gives a pixel, a density, or a
   count of rows per screen. Where this file needed a number it came from our
   own running app.

4. **Solo operators are invisible in this material.** Every product documented
   assumes employees — Jobber's Home leads with a clock-in button, Housecall
   Pro's Home shows employee status, its Sales Leaderboard ranks staff. **A
   solo detailer's day screen has no such content**, which means roughly a third
   of what these home screens carry is irrelevant to our primary user, and the
   sections that remain have to be worth more.

5. **Two pages would not give up their body** (Housecall Pro's job details,
   Apple's split views). Their claims are MEDIUM and are not load-bearing for
   any recommendation above.

6. **The sample cannot say anything about our own two hardest questions:** how
   the five skeletons should differ from each other at desktop width (law 1 is
   ours alone), and what a from-scratch Today should look like for someone with
   five jobs and no staff. **Step 4 is not a research problem; it is a design
   problem on researched ground.**

---

## 9. The fourteen findings, in one place

| # | Finding | Strength | Where it lands |
|---|---|---|---|
| F1 | A home screen's sections are conditional, not fixed | STRONG, 2 of 2 | Step 4 — Today's empty state |
| F2 | Money summary belongs on the day screen; we already agree | STRONG, 2 of 2 | Step 4 — keep the ledger strip |
| F3 | Jobber gives Home's first slot to a dynamic setup guide | STRONG, 1 of 2 | Inventory §9 **Q1** |
| F4 | Every documented job record is sectioned; ours is one scroll | STRONG, 3 of 3 | **Step 4 — the biggest single finding** |
| F5 | Status vocabularies are small; cancellation is a flag, not a state | STRONG, 1 of 1 | Step 5; `en-route` named, not proposed |
| F6 | Completing a job is a doorway to the next booking | STRONG, 1 of 3 | Step 4 — the completion moment |
| F7 | The trade splits money into two destinations; our desktop splits it into two columns | STRONG | **Step 3 — the reason for Money's two columns** |
| F8 | A client record leads with a number and is tabbed | STRONG, 2 of 2 | Step 4 — corroborates decision 3 |
| F9 | Tags are how the trade segments customers — deliberately NOT proposed | STRONG, 2 of 2 | Recorded as a no |
| F10 | Our booking card carries four indicator families; the ceiling is 2–3 | INDEPENDENT | **Step 5 — the card/list ruling** |
| F11 | A record should open beside its list, not over it, at desktop width | INDEPENDENT | **Step 3 — write it as a principle** |
| F12 | A phone row holds about two columns; ours already carries two | INDEPENDENT | Step 3 — bounds the row-columns proposal |
| F13 | Make it salient by removing, not adding — the one-light rule from outside | INDEPENDENT | Step 4 |
| F14 | Every product changes navigation SHAPE on desktop; ours does not | STRONG/MEDIUM | **Step 3 — and it is decision 6's scope, NOT the tab bar's** |

---

## 10. Sources

**Vendor documentation, read 2026-08-31**

- Jobber — [Home](https://help.getjobber.com/hc/en-us/articles/23846836592023-Home) · [Jobs List Page and Key Metrics](https://help.getjobber.com/hc/en-us/articles/39133110680343-Jobs-List-Page-and-Key-Metrics) · [Client Information in the Jobber App](https://help.getjobber.com/hc/en-us/articles/8196953752855-Client-Information-in-the-Jobber-App) · [Visits](https://help.getjobber.com/hc/en-us/articles/7924045219479-Visits)
- Housecall Pro — [Navigating Housecall Pro](https://help.housecallpro.com/en/articles/6934643-navigating-housecall-pro) · [Customer Profile Overview](https://help.housecallpro.com/en/articles/9764383-customer-profile-overview) · [The Job Details page](https://help.housecallpro.com/en/articles/1153614-what-you-need-to-know-about-the-job-details-page) *(MEDIUM — body would not retrieve)* · [Dashboard Reports Overview](https://help.housecallpro.com/en/articles/690728-dashboard-reports-overview)
- Zenbooker — [The job object](https://help.zenbooker.com/en/articles/3427039-the-job-object) · [Managing Jobs](https://help.zenbooker.com/en/collections/389542-managing-jobs)

**Independent research**

- Nielsen Norman Group — [The Anatomy of a List Entry](https://www.nngroup.com/articles/list-entries/) · [Data Tables: Four Major User Tasks](https://www.nngroup.com/articles/data-tables/) · [Mobile Tables](https://www.nngroup.com/articles/mobile-tables/) · [8 Design Guidelines for Complex Applications](https://www.nngroup.com/articles/complex-application-design/)
- Apple — [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) · [Split views](https://developer.apple.com/design/human-interface-guidelines/split-views) *(MEDIUM — body would not retrieve)*
