# The dashboard's desktop specification — 2026-08-31 (roadmap 2.11, step 3)

**This is decision 6, written out.** His word was **"specified"** — *"desktop
should get an actual layout specified just for desktop"* — not "widened", and
the difference is the whole point of this file. Nothing here is built. Step 6
is where he approves the whole specification and only then does code start.

**It also answers the one conditional row on the feature inventory** — the week
view, row 31 — and the answer is **no**, with a replacement. §7.

---

## 0a. The whole thing on one page

**Because the last file you had to approve was too long to read, this is the
top layer. Everything below is the detail behind it.**

**The problem, measured today on your own monitor.** The dashboard draws one
724-pixel column no matter how big the screen is. Today's screen is **1,810
pixels tall on your 1920 monitor and 1,815 on a phone** — five pixels apart
across a fivefold difference in width. The calendar is a grid of 99-pixel
boxes with 1,196 pixels of empty black beside it and 290 pixels of empty black
below it. It is a phone app parked in the middle of a large screen.

**What this specification does about it, in five sentences.**

1. **The bar of five buttons moves from the bottom to the left edge** when the
   screen is 1024 pixels or wider, and it is the same glass pill turned on its
   side — same five destinations, same order, same look.
2. **The content gets wider — up to 1,180 pixels**, which is the width the
   design system already uses everywhere else on the product.
3. **Five of the screens get a second column** instead of just being stretched:
   today's jobs beside what's coming next, the money figures beside the money
   lists, the client list beside the client you clicked, and so on.
4. **A record you clicked opens BESIDE the list, not on top of it** — the
   research is blunt about this being the mistake, and right now every record
   in the product opens as a panel covering the thing you were reading.
5. **Below 1024 pixels nothing changes at all.** The phone, which is where the
   work actually happens, is untouched — this is added, not swapped.

**The numbers it has to hit** (measured today → required after):

| | today | after |
|---|---|---|
| Content column, any screen ≥1180 | 724px | **1,180px** |
| Today, height at 1440x900 | 1,810px | **≤1,200px** |
| Money, height at 1440x900 | 1,589px | **fits one screen** |
| Calendar day cell | 99px, one dot | **163px, the names written in** |
| Business/More, height | 1,620px | **≤1,000px** |
| Screen carrying content at 1920 | 38% | **~62%** |

**The week view: no.** You said yes *if it can be made convenient*. It cannot,
and the reason is the good kind: at 1,180 pixels a **month** cell has room to
write "9:00 Tom O." instead of drawing a dot — so the month view becomes a week
view five times over, with no third mode to learn and nothing new on the phone.
A real week view would be a seven-column time grid that cannot exist on a phone
at all, and a mode that only works at a desk is the burden you told me to avoid.
**§7 has the full reasoning; nothing is being quietly dropped.**

**One thing to know that is not a layout.** Your clarification about
request-vs-reserve — *"a request, it will take up that time slot"* — is written
into roadmap 2.12 now, and it makes that item **smaller** than it was. §8.

---

## 1. What was measured, and where

Every number in this file came out of the running app on 2026-08-31, signed in
as the seeded demo owner with a full day of work on it. Nothing is estimated.

| Viewport | `.app-main` | Content | Today | Calendar | Money | More |
|---|---|---|---|---|---|---|
| 1920 x 1080 | 760px | **724px** | 1,810px | 1,080px* | 1,589px | 1,620px |
| 1440 x 900 | 760px | **724px** | 1,810px | 900px* | 1,589px | 1,620px |
| 1280 x 900 | 760px | **724px** | 1,810px | 900px* | 1,589px | 1,620px |
| 768 x 900 | 760px | **724px** | 1,792px | 900px* | 1,568px | 1,612px |

\* Calendar's document height is the viewport because the month *under*-fills
it. Measured: the grid is **553px tall and its bottom edge is at y=753 at both
1920x1080 and 1440x900** — identical, because it is inside the same 724px
column. **On the monitor that leaves 327px of viewport below it** (about 290px
of it black, once the legend is counted) **while 1,196px of black sits beside
it.** It is the only screen in the product that is short and narrow at the same
time, and no file had said so before today.

Other measurements this file leans on:

- `.cal-grid` is `repeat(7, 1fr)`, gap 5px → **99.14px cells, 88px tall.**
- The month contains 3 of the legend's 5 marks. The 31st carries 5 jobs and
  draws **three dots**, because the mark row caps.
- The day sheet is **640px wide, 660px tall** with one job on it.
- The eleven settings sheets are **640px modals** at every width.
- A `.row-item` on Clients is **724 x 71px** carrying a name and
  `phone · email` — two columns of information.
- `--wrap` is already **1180px** in `docs/design-system.md` § Layout, and the
  dashboard is the only surface that ignores it.

---

## 2. The responsive audit above 768px

The `impeccable audit` pass, scoped to responsive behaviour, and it is short
because there is almost nothing there to audit.

| Dimension | Score | Finding |
|---|---|---|
| Responsive ≤768px | **4/4** | 320/360/392 sweep clean in both paths; the 320 floor has its own layout |
| Responsive ≥768px | **1/4** | One fixed 760px container; no breakpoint above 700px does anything structural |
| Accessibility at desktop | 3/4 | `:focus-visible` is global and correct; hover states exist on every list row, chip, button and calendar cell |

**P1 — one container, no structure.** `theme.css:518` — `.app-main` is
`max-width: 760px` and there is no rule above it. The three `@media` blocks in
the file are 700px, 560px and 360px; the 700px ones adjust a settings row and a
sheet, not a layout. **Nothing in this stylesheet knows a desktop exists.**

**P2 — the four checks that gate layout cannot see a desktop failure.**
`sweep-widths.mjs` at 1920 and 1440 reports **clean on all 18 screens**,
because "nothing is off the edge" is trivially true when the content is 38% of
the screen. Baselined before touching it, and it is the same family as the
mistake at the top of `DECISIONS.md` — *a check that cannot see the common
failure looks exactly like a check that passes.* §6 is what is done about it.

**P2 — a job card is clickable and never says so with the pointer.**
`BookingCard.jsx:43` renders `.card` with an inner clickable region; `.card`
has no `:hover`. Invisible on a phone, wrong at a desk. Fold into step 5.

**P3 — hover styles are unguarded.** No `@media (hover: hover)` anywhere, so
`:hover` sticks after a tap on touch. Pre-existing and unrelated to desktop;
recorded, not scheduled.

**Positive, and it is why this specification is cheap.** The vocabulary is
already fluid: `.rows`, `.facts`, `.cal-grid`, `.actions-row`, `.sunken` are
all percentage or grid based and will widen without being rewritten. What is
missing is the container that lets them.

---

## 3. Breakpoints — two, and both are derived

Neither number is a taste choice; each is the width at which something
specific stops fitting.

| Name | Value | Why exactly this |
|---|---|---|
| **`--bp-rail`** | **1024px** | The rail costs a 72px pill plus a 24px gutter each side = 120px of left inset. At 1024 the content is still 880px — **156px wider than today**, so the rail never costs width. Below it are both phone-shaped verification sizes (768x1024 portrait, 392x844). |
| **`--bp-split`** | **1180px** | `--wrap`. Two columns need a primary ≥637px and a secondary ≥320px with a 24px gap; at 1180 the content region is 1,036px, which is exactly that. And a breakpoint that equals the layout token is a number nobody has to look up. |

There is **no third breakpoint and no maximum beyond `--wrap`.** At 1920 the
content is 1,180px centred in the band right of the rail; the rest is the
ground, which is the design's own material (law 1, one continuous ground) and
not dead space to be filled.

**Below 1024, this specification changes nothing.** That is a guarantee, not a
default: every screen at 1023px and below is byte-for-byte what ships today,
which is what makes this additive rather than a second design.

### The shell, in one block

```
< 1024      the shell exactly as it ships: .app-main max-width 760px,
            the floating bottom pill, sheets as sheets.

>= 1024     shell padding-left 120px; .app-main max-width var(--wrap);
            the tab bar becomes the vertical rail; list rows gain
            their extra columns. Still ONE column. Records still
            open as sheets.

>= 1180     the second column engages per screen (§5); a RECORD opens
            beside its list instead of over it (§4); the eleven
            settings screens stop being modals.
```

**The page scrolls, never a column.** The secondary column is
`position: sticky; top: calc(topbar + 16px); align-self: start`. Two
independent scrollbars on one screen is the thing that makes web apps feel
like web apps, and it is not happening here.

---

## 4. Two principles, written as principles

The research asked for these to be rules rather than instances
(`dashboard-screen-research-2026-08-31.md` F11, F7), so here they are.

### 4a. A record opens beside its list. A form opens over everything.

> **Above `--bp-split`, a RECORD opens in the secondary column, never as a
> modal. A FORM YOU COMMIT stays a modal at every width.**

NN/g's objection to modals is specific — *"avoid modals, which obscure
reference data in the table"* — and it applies to a thing you are *reading
against* its neighbours. It does not apply to a thing you are *filling in*,
because you have already left the list.

| Opens beside its list ≥1180 | Stays a modal at every width |
|---|---|
| A job (from Today, from History, from the day) | New booking |
| A client | Finalize payment |
| A settings screen (all eleven) | Add an expense |
| The selected day (inline — see Calendar, §5b) | Block this day / Hours / How this day works |

**Everything in the left column stays where it was while a record is open.**
That is the whole point: you can see the next job while you read this one.

### 4b. Width buys a second thing, it does not stretch the first thing.

Apple's own layout guidance, and it is the reason five screens get a *column*
rather than a wider *column*: *do not simply stretch a small-screen layout onto
a larger display — redesign to use the space, adding secondary content rather
than widening the primary column.*

Concretely: **the primary column lands at 637–728px across the desktop range**,
which is within a rounding error of the 724px every one of these screens was
already designed at. Nothing in the primary column reflows. The second column
is new content, not stretched content. That also keeps prose under ~75
characters a line, which one 1,180px column would not.

---

## 5. The five screens, and why no two of them are the same shape

**Law 1 is the constraint that makes this hard**, and it is the one a desktop
layout fails by default: the lazy answer is "list left, panel right" on all
five, and five screens that share a skeleton is exactly the failure law 1
names. So each screen's wide form is derived from what that screen *is*, and
the five splits below are deliberately five different ratios and five
different jobs for the second column.

| Screen | Wide form | Split | The second column is… |
|---|---|---|---|
| **Today** | rail + what's next | 1.7 / 1 | *the future* — and it becomes the job record |
| **Calendar · Month** | **one column, full width** | — | *nothing* — the width goes into the cells |
| **Calendar · History** | table + record | 1.7 / 1 | *the record*, and the filters when none is open |
| **Money** | figures + lists | 1.2 / 1 | *the other question* (F7) |
| **Clients** | full-bleed table → table + record | 1.4 / 1 when open | *the person*, drawn with no panel |
| **Business** | index + screen | 1 / 1.9 | *the primary* — the only screen weighted right |

### 5a. Today — the rail keeps the left, the future takes the right

**What it is at desktop:** the day rail runs down the left at ~700px, exactly
the skeleton it is on a phone. The right column is everything that is not
today.

**Left column, in order:** the date masthead · the two-cell ledger strip · **one
continuous `.dayrail`** carrying every job section · the warn-box.

> **One rail, not three.** `dashboard-skeletons.md` §2 describes *"one
> continuous hairline with a node per job"*, and the shipped screen draws
> **three separate `.dayrail` elements**, one per section — counted in the
> browser today. Widening a screen that has this defect bakes it in, so the
> desktop form is specified against the corrected rail, and step 4 fixes it in
> the phone form at the same time. Same for the section labels: "NEXT UP" is
> currently printed over a job that finished at 4:15 PM.

**Right column, in order:**

1. **Requests waiting to be accepted** — empty until roadmap 2.12 ships, and
   this is the slot he named (*"the page that the detailer uses their bookings
   on"*). It is first because it is the only thing on the screen that is
   waiting on the detailer. **Designed and empty on purpose** — 2.11 does not
   build it.
2. **Tomorrow** — as `.settled-row` lines, not the three 176px cards it draws
   today. Tomorrow is context, and this screen's own rule already knows how to
   demote something.
3. **Open slots in the next 7 days** — the one figure stranded on the *Booking
   rules* settings sheet, which is the wrong neighbourhood for a number about
   the near future.

**Opening a job** replaces the right column with the job record. The rail does
not move. A back control returns the column to what's-next.

**Below 1180:** the right column's contents return under the rail, in today's
order; a job opens as a sheet. **Below 1024:** today's screen exactly.

**Required after:** ≤1,200px tall at 1440x900, from 1,810px.

### 5b. Calendar · Month — the only screen that stays one column

**This is the screen that most wants width and the one that must not be split**,
because splitting it takes the width straight back off the grid. At a content
width of 1,180 the cells go to **163px** — enough to write a time and a first
name — and at 760 (what a two-column layout would leave) they go to 104px,
which writes nothing. So Calendar spends all of it on the grid.

**The cell at ≥1180:** min-height 112px. The date, then **up to three job
lines** — `09:00` in `--f-num`, the customer's given name and last initial in
the body face — then `+2 more` when there are more. Blocked and closed days
keep their fill.

**The legend shrinks to what the cells cannot say.** Booked, Done and No-show
become words in the cell; **Blocked** and **One type only** stay as marks and
are the only two the legend explains. A five-symbol legend that is physically
larger than the marks it decodes is the tell Part B named.

**The selected day opens INLINE, directly beneath the grid** — a panel on the
ground, not a modal and not a side column, with `.cal-cell.selected` marking
where it came from. (That rule already exists in `theme.css:816` and is
currently dead; this is what revives it.) The month stays above it and stays
readable, which is 4a's actual concern; a side column is not the only way to
satisfy it, and here it would cost the thing being protected.

**Below 1180:** 88px cells, marks, the day opens as a sheet — today exactly.

**Required after:** cell **≥160px wide**, and the grid ~700px tall rather than
553px. **Height is not the goal — legibility is**, and the taller cell is a
consequence of writing three lines into it. At 1920x1080 that fills the screen
(327px of empty viewport below the grid today → ≤180px). At 1440x900 the month
will run a little past the fold and scroll, which is the correct trade: a
99px cell that fits is worth less than a 163px cell that scrolls 150px.

### 5c. Calendar · History — the table, and the record beside it

**Left:** the 18 bookings as a **ruled list with columns** — date · who · what ·
status · total — which is Part B row 8 and design-system § Composition (*a
collection of records is a ruled list*). Not 18 cards, not 3,619px.

**Right, sticky:** the selected job. **With nothing selected it holds the nine
filter chips and the totals bar**, which takes two rows of chips off the top of
the results and gives the second column a job to do when it is otherwise empty
— F1's rule (a section that has nothing to show does not exist) applied to a
column.

**Below 1180:** filters above the list, list below, job opens as a sheet.
**Below 1024:** today's cards, until step 4 replaces them in the phone form too
— which it does regardless of this file.

### 5d. Money — the trade splits it across two tabs; we split it across two columns

Housecall Pro carries **My Money** and **Reporting** as separate top-level
destinations (F7). *What did I make* and *who owes me* are different questions.
A sixth tab is forbidden — law 1 and the five-slot bar, and Part A settled the
bar — so **the split the trade makes across two tabs is the split this layout
makes across two columns.** Writing that down as the reason is what the
research file asked step 3 to do.

**Left (1.2), "what did I make":** the period control on **one line** — chips,
stepper and label are three stacked rows today for one question — then the lead
figure, the six-bar chart **with a zero line so a loss hangs below it** (Part B
row 12: −$114 and +$114 currently draw identically), then the sunken ledger.

**Right (1), "who owes me and what went out":** waiting on payment, then
expenses. When nothing is outstanding the section is **absent**, not a dashed
box saying so (F1, Part B row 11).

**Required after:** the whole screen inside one 900px viewport. Measured today:
left ≈547px, right ≈769px, total 1,589px stacked → **≈830px including the
header** when they sit side by side. This is the screen the width helps most.

### 5e. Clients — the only screen with no panel on it, and it stays that way

**Full width, no second column, until a client is opened.** The list gains the
columns it already computes and currently hides inside the sheet: **name · last
visit · lifetime spend · phone.** Four columns at desktop; **two on the phone**,
which is where it already sits and is NN/g's stated ceiling for a narrow row
(F12) — nothing is being held back from the phone.

**Opening a client** splits to 1.4 / 1, and **the record in that column is
ruled rows on the ground — no card, no panel.** Clients is the only screen in
the product with no panel on it (law 1) and a right-hand card would end that.
`.facts` is already exactly this shape and is the best part of the current
sheet; it becomes the record.

While it is open the list keeps its columns and loses none of them — that is
what beside-not-over buys.

**Below 1180:** two columns per row, record opens as a sheet — today exactly.

### 5f. Business — the eleven settings screens stop being modals

The fifth tab from Part A. **The only screen weighted toward its right column**,
because here the left is an index and the right is the actual work.

**Left (1):** the index — three groups of nav rows, **the booking link first**
(it is 1,156px down today, and it is the most-shared thing the business owns).

**Right (1.9), ~700px:** the selected settings screen, rendered in place. This
is what Part B asked for by name: *Services & add-ons* is four lists and the
most-edited screen in the product, and it is a 640px modal. **With nothing
selected the right column holds the booking link and the account block.**

**Below 1180:** the index is the screen and the eleven open as sheets — today
exactly. The gear's plumbing list behaves the same way.

**`dashboard-skeletons.md` §3 permits this and it is worth saying why**, because
it reads at first like a contradiction. That file allows the eleven to share one
skeleton on the grounds that *"they are modal panels reached one at a time… Law
1 governs what is on screen at once."* At desktop they become a **column**
reached one at a time — the reasoning is untouched, only the container changes,
and two of them are still never on screen together.

**Staff** see four rail buttons, not five (no Money) — the rail is the same
component reading the same `visibleTabs`, so this needs no separate rule. It is
named because step 4 owes every screen a staff state.

---

## 6. The navigation shape, and the check

### 6a. The bar moves and stays itself

F14 is true of every product in the sample and it is one sentence away from
re-opening something already approved, so, precisely:

- **NOT reopened:** which five destinations exist and in what order. Part A
  settled that on 2026-08-31 — Today · Calendar · Money · Clients · Business.
  This file does not touch it.
- **What is specified here:** where the bar is *drawn* above 1024px.

**At ≥1024 the tab bar is a vertical glass pill rail, fixed to the left edge,
vertically centred.** 72px wide, 24px from the edge; the same
`color-mix(--ink-1 82%)` glass, the same `blur(18px) saturate(1.3)`, the same
`--r-pill` radius, the same `--accent 12%` active fill, the same icon-over-label
buttons at the same 44px minimum. **It is the same component with
`flex-direction: column`.**

**Why not a conventional sidebar with labels beside icons.** That shape — a
flat 220px panel welded to the left edge, five text rows — is the default admin
shell, and `theme.css:525` says out loud why the pill exists: it is *"what
stops the dashboard reading as a default mobile app shell."* The same argument
runs at a desk. The floating pill is this product's navigation; rotating it
changes the *shape* (which is what F14 asks for) without inventing a second
visual world (which bucket 1 forbids).

**The header is specified once and is identical at both shapes** — business
name left, `+` and gear right. That is the collision F14 flagged, resolved by
not moving them: the `+` and the gear were just approved into the header, and a
rail that stole them back would make the header mean two different things at
two widths.

### 6b. `sweep-widths.mjs` grows the desktop widths — and one new check

The roadmap's condition on this whole item: *the checking script that walks the
narrow widths should learn the two wide ones at the same time, or the desktop
layout is the only part of this product nothing automatically checks.* Done, in
this session, and with a correction the roadmap did not anticipate.

**What was added:**

1. **1920 and 1440 are in the default sweep**, at 1080 and 900 tall — the two
   verification heights, not the phone's 844. The default is now
   `1920, 1440, 392, 360, 320`.
2. **A fifth check, `dead-width`.** At any viewport ≥1180 it measures the
   content column and reports it short of 1,000px.

**Why the fifth check is not optional.** Baselined first, per the design
system's own rule: the four existing checks report **clean on all 18 screens at
both 1920 and 1440 today** — with a 724px column on a 1920 monitor. "Nothing is
off the edge" is trivially true when 62% of the screen is empty. Adding the
widths alone would have produced a green gate that stays green whether or not
the desktop layout is ever built, which is the mistake at the top of
`DECISIONS.md`.

**How it is kept honest without a red gate.** `DESKTOP_SPEC_BUILT` is a single
constant at the top of the script, currently `false`. While it is false
`dead-width` **prints its measurement every run and does not count toward the
exit code**, so the failure is visible today and nothing is blocked. **Step 6
flips it to `true` in the same change that ships the layout**, and from then on
a regression to a narrow column fails the gate. It is one line, and it is named
here so it cannot be forgotten.

Measured today, unchanged behaviour otherwise:

```
1920  dead-width  276px short   .app-main content is 724px in a 1920px viewport
1440  dead-width  276px short   .app-main content is 724px in a 1440px viewport
```

**One thing the script needs no change for:** after step 6 the eleven settings
screens are columns rather than sheets at desktop widths, so `.sheet` will not
exist there. `grow()` already no-ops when there is no sheet, the index stays
visible in the left column so the next `.nav-row` click still lands, and
`Escape` on a non-sheet is harmless. Verified by reading, not assumed — and it
is the reason the walk is written against `.nav-row` rather than against the
sheet.

---

## 7. The week view — **NO**, and this is the file saying so

**His answer was conditional and the condition is the ruling:** *"I guess we
could have a week view, but I don't know how it generally works. If you could
find a way to have a week view that's convenient and doesn't make it a burden,
then sure."* Row 31 of the feature inventory, the only `conditional` row on
the list. A conditional yes treated as a yes is how features nobody wanted get
built, so here is the working.

**What a week view is for.** A month grid answers *which days have work*. A
week view answers *when, within each day, and where the gaps are* — it puts a
time axis on the horizontal week.

**Four reasons it does not ship.**

1. **It cannot exist on a phone, and the phone is where the work happens.**
   Seven day-columns in 356px of content is **51px a column**. NN/g's finding
   is that a narrow row holds about two columns for anything complex; seven
   columns of a time grid at 51px carry neither a name nor a time. So a week
   view would be a desk-only mode — and *"doesn't make it a burden"* is his
   own test for that.
2. **It is a second grid, and Calendar is already the only grid.** Law 1's
   failure is two things that share a skeleton. A month grid and a week time
   grid are the same skeleton at two zoom levels, which is precisely what law
   1 exists to prevent, and it would be a third mode on a control that has two.
3. **The data does not fill it.** The demo month — built in step 0 to be a
   realistic detailer's month — has **9 jobs across 5 days**: four days with
   one, and today with five, which is the busiest day this business's own
   `buffer_minutes` allows. A seven-day by ten-hour grid is 70 cells drawn to
   show one or two jobs. That is Part B's "42 bordered boxes, mostly empty"
   defect at larger scale.
4. **The thing it would be for is already answered, twice.** *Where are my
   gaps* is what the booking page computes for the customer and what "Open
   slots in the next 7 days" counts for the detailer — and §5a moves that
   figure onto Today, where it has neighbours.

**What replaces it, and this is why the answer is not just "no".** At the
desktop content width a **month** cell is 163px and 112px tall, which is room
for three job lines with a time and a name. **A month that writes its jobs out
is a week view five times over** — you see this week's shape, and next week's,
and last week's, in the view you were already in. It costs no new mode, no new
skeleton, and it changes nothing on the phone.

**What would reopen this.** One thing only: a detailer whose day is dense
enough that three lines and "+2 more" stops being enough — a shop running a
crew, not a solo mobile detailer. If that user ever exists, the week view is the
right answer for them and this section is the record of why it was not built for
this one. **It is not a maybe-later; it is a no with the condition that would
overturn it written down.**

---

## 8. His clarification on request-vs-reserve, and why it lands here

He clarified question 5 while handing over this step, and it is captured here
because a clarification that lives only in a chat message dies at the next
clear. **It changes roadmap 2.12's difficulty, and it changes it downward.**

> *"I didn't mean that if they choose to approve bookings… some could book two
> of the same slots. So someone sends a request, it will take up that time
> slot. But there should be a version they could choose of either: if someone
> books, it's like, yeah, they booked for that time, we're gonna do our best to
> make it to that time — while [in] a request it was like, hey, this is when
> [I want it], and it's like, okay, I have to approve it. You've not really
> guaranteed it. Obviously neither is gonna be a hundred percent guaranteed,
> but one is just a little bit more guaranteed than the other."*

**What that settles.** **A request holds the slot.** Two customers cannot
request the same time. The difference between the two modes is **the promise
made to the customer**, not the mechanics of the calendar:

| | Reserve mode (today, for everyone) | Request mode (the new option) |
|---|---|---|
| Does the slot get taken? | yes | **yes — same thing** |
| Can two people hold it? | no | **no** |
| What the customer is told | you are booked; we will do our best to be there | you have asked for this time; the detailer has to accept it |
| What the detailer does | nothing | accepts or declines |

**Why this matters more than it sounds.** Roadmap 2.12 currently says the hard
part is *"availability that behaves differently in each mode — in request mode
a slot is not taken, so two requests can want the same time, which the exclusion
constraint currently forbids."* **His clarification deletes that problem.** The
exclusion constraint stays exactly as it is, availability behaves identically in
both modes, and what is left is a per-business setting, one more booking status,
an accept/decline action, and different wording on the customer's page and
email. That is a materially smaller item, and roadmap 2.12 has been corrected to
say so.

**What it obliges this step to do:** nothing new. §5a already reserves the top
of Today's second column for the accept queue, and it is reserved as **the first
thing in the column** precisely because a request is the only object on that
screen that is waiting on the detailer rather than on a car.

---

## 9. What this specification deliberately does not do

- **It does not re-derive the tab bar.** Five destinations, that order, settled
  in Part A on 2026-08-31.
- **It does not touch the phone.** Below 1024px every screen is what ships
  today, and that is the guarantee that makes this additive.
- **It does not add a composition-vocabulary item, and it does hand one
  question to step 5.** Clients and History both want a **ruled list whose rows
  carry columns**. The recommendation is that this is the existing *ruled list*
  widening, not a new "table" — the marks, the hairlines and the row rhythm are
  unchanged and only the row's internal layout differs by width. But bucket 2
  says the vocabulary is added or refused **at step 5, deliberately and once**,
  and step 5 is where card-versus-list is being settled anyway (2.10's declined
  decision 7). **Step 5 rules; this file states the requirement and the
  recommendation.**
- **It does not design any screen's states.** Empty, one, twelve, loading,
  error and staff are step 4 for every screen here.
- **It does not settle Today's section labels or the rail's node states.** Both
  are named in §5a because widening a broken rail bakes it in, but the fix is
  step 4's — labels and ordering are one decision.
- **It touches no schema, no edge function, no engine, no email.**
- **It is the DASHBOARD's desktop layout and nothing else.** Decision 6 was
  about `/app`. The customer's booking page and the marketing page each already
  have their own desktop behaviour and their own checks
  (`sweep-booking-steps.mjs` runs all four verification sizes; the landing page
  was ported from a rendering built at desktop width). The booking page is now
  swept at 1920 and 1440 as a side effect of the width list and **came back
  clean at both** — recorded so a later session does not read its absence here
  as an oversight.

---

## 10. What step 6 has to be able to measure

The definition of done for the desktop layout, so that step 6's approval is
against numbers rather than against a screenshot.

| Check | Today | Required |
|---|---|---|
| `.app-main` content at 1440 and 1920 | 724px | **1,180px** (`--wrap`) |
| Today, document height at 1440x900 | 1,810px | **≤1,200px** |
| Money, document height at 1440x900 | 1,589px | **≤900px** — one screen |
| Business, document height at 1440x900 | 1,620px | **≤1,000px** |
| Calendar cell width at 1440 and 1920 | 99.14px | **≥160px**, with times and names |
| Calendar grid height | 553px | **~700px** — 6 rows of 112px cells |
| Calendar, viewport left below the grid at 1920x1080 | 327px | **≤180px** |
| Clients columns per row at 1440 | 2 | **4** |
| Clients columns per row at 392 | 2 | **2 — unchanged** |
| Settings screens at 1440 | 640px modal | **≥700px column, no backdrop** |
| Every screen at 1023px and below | — | **identical to today, byte for byte** |
| `sweep-widths.mjs` default | 392/360/320 | **1920/1440/392/360/320, both paths, exit 0** |
| `DESKTOP_SPEC_BUILT` | `false` | **`true`** |
