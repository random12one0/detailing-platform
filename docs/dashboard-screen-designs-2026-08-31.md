# Every dashboard screen, designed — 2026-08-31 (roadmap 2.11, step 4)

~~**Nothing here is built.**~~ **STEP 6 IS BUILDING IT, ONE STAGE AT A TIME.**
Step 5 was the component inventory, step 6 is the build, and the approval
page's §5 carries the stage order and what has landed. **§2 (Today) shipped in
stage 1 on 2026-09-01; §3 (the job record) shipped in stage 2 the same day and
carries a *What shipped* block naming every place the code and this design
differ.** A design file that still reads as a proposal after the code exists is
how a later session rebuilds what is already there.

> **EVERY "WHAT SHIPS TODAY" IN THIS FILE IS SUPERSEDED — 2026-08-31, STEP 4b.**
> The owner rejected *"below 1024 nothing changes"*: *"the whole admin dashboard
> is changing both with desktop and phone."* This file describes several phone
> forms as *unchanged in shape from what ships* (§2), *exactly what ships* (§4),
> *the sheet, as today* (§3, §9) and *nothing on the phone gets worse to make the
> desk better* (§0a). **Under "forget the old dashboard existed", an unchanged
> screen is the absence of a decision.**
> **`docs/dashboard-phone-pass-2026-08-31.md` re-decides every one of them from
> scratch and is the phone's authority where the two disagree.** Everything else
> in this file — the screens' content, sections, states, copy fixes and desktop
> forms — stands, and the phone pass names its changes to it in its §17.
> **The phone is PORTRAIT, by his ruling the same day** — *"it should always
> just stay portrait… when someone flips their phone over sideways, I don't want
> it to completely readjust"* — so there is no landscape form of any screen in
> this file or that one.

This is the step your own words asked for: *"just basically see every
component and just see what best fits where."* Steps 1–3 listed the features
(126), researched how the trade's screens work (14 findings) and specified the
desktop layout. **This file is the screens themselves** — what each one is
for, what it must show, what it looks like when it is empty and when it is
full, and what it does on a phone and at a desk.

It also **fixes three defects that steps 1–3 found and deliberately left**,
because widening a broken screen bakes the break in. All three are on Today,
all three were re-measured in the running browser today, and §2 is where they
go.

---

## 0a. The whole thing on one page

**Your caveat on the last file is the instruction here** — *"there's just so
many words"* — so this is the layer to read. Everything below it is the
working.

**What changes on each of the five screens, in one line each.**

1. **Today** — the day hangs on **one** thread instead of three, the headings
   stop lying about what is under them, and a paid job's dot goes green like
   it does on the calendar. Plus a slot at the top for bookings waiting on
   your yes, empty until the next item builds it.
2. **Calendar** — at a desk, the day boxes get big enough to write "9:00 Tom
   O." in, so the month reads like five weeks at once. On a phone it is
   exactly what it is now.
3. **Money** — a losing week hangs **below** the line instead of drawing the
   same bar as a winning one, and the accountant export you asked for lives
   here, using the period buttons that are already on the screen.
4. **Clients** — the list shows what it already knows and currently hides:
   last visit, what they have spent, their number. And you can sort it to
   find who has not been back.
5. **Business** — the fifth tab you named. Your booking link is the first
   thing on it instead of 1,156 pixels down, and your services stop being
   filed under "Settings".

**The one screen nobody has ever redesigned gets the most work.** Opening a
job is 26 of the product's 126 features in a single scroll. Every product in
the trade breaks that screen into named sections and puts Call / Text /
Navigate at the top. Ours does not. §3 does.

**Four screens that exist underneath and have no door get one** — reviews
customers leave, your Facebook / TikTok / YouTube links, an FAQ page you write
yourself, and a way to switch between two businesses on one login. These are
things the database already holds and no screen can reach.

**Three things I am doing differently from what you might expect, and why:**

- **Nothing on the phone gets worse to make the desk better.** Below 1024
  pixels every screen is what ships today plus the fixes above.
- **The empty screens are designed, not left over.** A section with nothing to
  show does not draw an empty box saying so — it is simply not there. Today's
  empty day currently states the same fact four times.
- **When you press "Mark complete", the screen will stop blanking.** Right now
  the whole day is replaced by a spinner and redrawn. Observed in the browser
  today; §1a is the rule that ends it.

**What is NOT here.** No colours, fonts or look are changed — that was your
"the look stays". No database, engine or email work. No week view (ruled out
in step 3). Nothing is built.

---

## 1. The rules that hold on every screen

Written once so that eighteen screens below do not each restate them. **If a
screen says nothing about a state, this section is what it does.**

### 1a. The six states, defined once

| State | The rule | Why |
|---|---|---|
| **Loading, first paint** | The screen may show one spinner, centred, once — the first time it is opened in a session. | You have nothing to draw yet. |
| **Loading, every time after** | **The screen does not move.** What is already drawn stays; the part that is changing dims to 55% and is not clickable until the answer comes back. | Observed today: leaving Today and coming back replaces the whole day with a centred spinner. `reload()` sets `loading` true, so the same replacement happens after *Mark complete* and after *Finalize payment* — the day disappears and re-arrives, animation and all, as a reward for finishing a job. |
| **Empty, a section** | **The section is not drawn at all.** No dashed box, no "Nothing yet." | F1: Jobber's Reminders *"only appears when there's something to show"*, 2 of 2 in the sample. Part B row 11 caught ours doing the opposite. |
| **Empty, a whole screen** | **One sentence and one way forward**, in the screen's own words. Never the same fact twice. | Part B row 10: an empty Today states one fact four times. |
| **One** | The screen looks like the screen, with one row on it. Never a special layout for one. | A layout that only looks right when full is a layout that is wrong on day one. `design-knowledge.md` §4: *"the empty state is the real product."* |
| **Many** | Named per screen, with the number that breaks it. Nothing on this list is allowed to say "it scrolls" and stop there. | |
| **Error** | The message sits **where the thing failed**, in `.error-box`, and says what to do. It never replaces the screen. A failed read shows the last good data with the error above it. | Copy rule, PRODUCT.md: *errors say what to fix*. |
| **Staff** | Named per screen. The default is: staff see it. | The database is the enforcement (`20260827003000_staff_roles.sql`); the UI only avoids offering what the session cannot use. |

**One thing this file will not do, and it matters: a UI that hides something
from staff is a courtesy, not a control.** The database returns zero rows from
`expenses`, `business_settings`, `promo_codes` and `campaigns` for a staff
session. It does **not** restrict bookings — read *or* write — so a staff
member can record a payment, and every design below assumes they may. Where a
screen hides a money figure from staff it is because you chose to hide the
Money tab from them and showing the same number elsewhere would undo your
choice — not because anything is being protected.

### 1b. Which one thing is lit

`dashboard-skeletons.md` §6, with **one addition** for what roadmap 2.12
brings. At most one object on a screen is lit, in this order:

1. **A booking waiting for you to accept it** *(new — see below)*
2. Money not yet recorded — a finished job with no payment against it
3. The current or next job
4. An unsaved setting

Ties go to the earlier one. A screen with no qualifying object has **no lit
element at all**.

**Why the request goes above the money, and it is a judgment.** Unrecorded
money is money you already have; it can be written down tonight and nothing is
lost. An un-accepted request has a customer sitting at the other end of it not
knowing whether they are booked, and it goes stale on its own. It is the only
object on the screen with somebody else waiting on the answer. *This changes
`dashboard-skeletons.md` §6 and is listed in §16.*

### 1c. What the accent is allowed to say

Law 11b, unchanged, plus **one clarification the rail forced** (§16):

- `--accent` (the detailer's colour) — actions, navigation, selection, focus,
  today's disc, the selected day, chart bars, **a job that is finished**.
- `--ac` (fixed green) — **paid**, money up, it worked.
- `--bad` (fixed red) — cancelled, no-show, error, destructive, **money down**.

**No screen below invents a colour meaning.** Where a screen needs to
distinguish two things and both are identity, it uses a *form* — the marks
vocabulary in `dashboard-skeletons.md` §5b — never a second hue.

### 1d. Where a record opens and where a form opens

The desktop specification's §4a, unchanged, and every screen below obeys it:

- **A RECORD** — a job, a client, ~~a settings screen~~ — opens **beside** its
  list at ≥1180px, and as a sheet below that.
- **A FORM YOU COMMIT** — new booking, finalize payment, add an expense —
  stays a modal at every width.
- Everything in the left column stays where it was while a record is open.

> **CORRECTED 2026-08-31, STEP 4b — there is a third kind and a settings screen
> is it.** A settings screen is not a record you opened out of a list; it is **a
> place you go**, and the `›` chevron on its row has been promising a push and
> delivering a peek. On a phone it becomes **a page with a back control**, not a
> sheet: a sheet with its own inner scroller inside a page that also scrolls is
> two scrollers, and *Services & add-ons* is four lists inside one of them.
> **This is also what §10 already does to it at the desk** (*"the eleven stop
> being 640px modals"*), so the phone is not being given a new idea.
> `docs/dashboard-phone-pass-2026-08-31.md` §2b. **Desktop behaviour is
> unchanged: both still become the right column.**

### 1e. Law 1 — the skeleton register

Every screen in the product and the shape that is only its own. **This table
is the check on this whole file**: two rows with the same shape is the failure
law 1 exists to name.

| Screen | Its skeleton | Nothing else is this |
|---|---|---|
| **Today** | one vertical hairline, a node per job, runs of work hanging off it | the only rail |
| **Calendar · Month** | a seven-column grid | the only grid |
| **The day** | a panel of jobs over three state cards, each with its own switch | the only screen made of switches |
| **Calendar · History** | a dated list, ruled, broken by month, under a filter bar and a totals bar | the only list with a time axis |
| **Money** | one lead figure, a signed bar chart on a zero line, a paired-cell sunken ledger | the only chart |
| **Clients** | a full-bleed ruled list with columns, sorted, no panel anywhere | the only screen with no panel on it |
| **The client record** | bare ruled rows on the ground | the only record with no container |
| **Business** | grouped panels of self-answering nav rows | the only screen made of panels |
| **A settings screen** | a form: a row per setting, control right, consequence underneath | one shape, eleven-plus screens, on purpose |
| **The job record** | an action bar over named sections | the only screen with an action bar |
| **A form you commit** | a modal: fields, one primary action, one way out | |
| **First-run setup** | a stepped form, one question at a time, a progress rule | the only stepped thing |
| **The walkthrough** | a spotlight over the live screen | the only overlay that is not a sheet |
| **Sign in / create / accept** | a single centred card | *"centred exactly once"*, and this is where |

**The two rows that are closest are History and Clients**, and they are close
enough that step 3 flagged it. They are separated by structure, not by
decoration: History is a list of **events** — it has a date axis, it is broken
by month with a rule that carries the month's own total, its rows carry a
status mark, and it lives under a filter bar. Clients is a list of **people** —
no dates as identity, no marks, no filter bar, no totals, edge to edge. **What
step 5 must rule** is whether the row itself is one component with two
configurations or two components; §17.

### 1f. Motion, and the one thing the rail fix costs

Budget unchanged (`dashboard-skeletons.md` §4): the ground never stops, one
staggered arrival per screen, pointer feedback, an instant `:active`.

**The one change, and it is a consequence of §2's fix rather than a new
mechanic.** The arrival staggers `.app-main > .group > *`. Today is currently
eight of those, so the day arrives in five slots. Making the rail **one**
element would make the whole day arrive in a single slot — the signature move
lost to a bug fix, which is exactly what law 3 forbids. **So the stagger moves
inside the rail**: the day arrives one job at a time down the thread, which is
closer to "scattered becomes ordered" than what ships. Same budget, same
curve, same ceiling — **the last element still has to settle by ~580ms**,
which is the measured figure the load-in was tuned to.

### 1g. Copy

Sentence case. Plain verbs. Name the thing the detailer controls. **Four
specific corrections** are carried by the screens below: Today's section
headings (§2), "1 jobs" on a calendar cell (§4), "Estimated $235.00 · Final
$235.00" when nothing changed (§3), and a screen titled "Settings" under a tab
labelled "More" (§10).

---

## 2. Today

**The screen he opens forty times a day**, and the one carrying all three
unfixed defects.

### What it is for

Standing in a driveway with a phone: *what am I doing now, what is left, what
is waiting on me, and did I get paid.*

### What it must show

Inventory rows 1–6 and 124: today's jobs in order · how many done and left ·
expected and collected · the one thing that needs doing, lit · how many
finished jobs still need payment recorded · tomorrow · **bookings waiting to
be accepted**. Desktop adds *open slots in the next 7 days* — the one figure
currently stranded on the Booking rules settings sheet, which is the wrong
neighbourhood for a number about the near future.

### The three defects, measured in the browser today

Signed in as the seeded demo owner, a full day on the screen, at 1920:

| | What was measured | What it should be |
|---|---|---|
| **D3** | Three run labels: **"NEXT UP" over a job that finished at 2:45–4:15 PM**, "LATER TODAY" over one that finished 5:00–6:00 PM, both *Completed*. | Labels that name the **work**, because the ordering already does. |
| **D4a** | **`railCount: 3`** — three separate `.dayrail` elements, one per run, where `dashboard-skeletons.md` §2 specifies *"one continuous hairline with a node per job"*. | One rail. |
| **D4b** | Both completed job cards draw the node `rgb(11,13,14)` with a `rgb(207,210,206)` inset ring — **the hollow "this job is ahead" node, on jobs that finished hours ago.** | A finished job's node says finished. |
| **D5** | The three settled rows draw `rgb(14,165,233)` — `#0ea5e9`, **the tenant's accent** — where the calendar's `.dot.paid` draws `--ac` `#38E08B`. | Law 11b: paid is the fixed green, on both. |

Also confirmed while there: `.app-main` 760px and the document 1,805px tall on
a 1920 monitor, which is step 3's measurement standing up.

### The design

**One rail. Three runs. Each label names the work, not the clock.**

| Run | Label | Holds | Node |
|---|---|---|---|
| 1 | **Needs payment** | finished, no payment recorded | solid, `--accent` |
| 2 | **Still to do** | not yet finished, in time order | hollow ring, `--bone-2` |
| 3 | **Done** | finished and paid, as settled rows | solid, **`--ac` fixed green** |

**Why these three and not the four you might expect.** "Next up" and "Later
today" collapse into one run because they were never two kinds of work — they
were one kind of work split by a clock the ordering already respects, and the
split is what made the label lie. The **first row of "Still to do" is the next
job**, and it is lit when nothing needs payment, so nothing is lost: the
treatment says "this one" where a heading used to say it wrongly.

**A job whose time has passed and is not marked complete stays in "Still to
do"**, which is true of it, and needs no fourth run.

**The node vocabulary is now the calendar's**, which is the point of D4b/D5 —
the same fact was being drawn two ways by two components:

- ahead → hollow ring `--bone-2` · finished → solid `--accent` · paid → solid
  `--ac` · did not happen → a bar `--fog` (a cancelled or no-show job is not
  drawn on Today at all today, and this file does not add it — but the rail
  now has a form waiting if it ever is).

**The warn box is deleted from this screen.** It exists to say *"N more
finished jobs still need payment recorded"* — which is the "Needs payment" run
with its count in the label. One fact, one place. (`.warn-box` itself is still
used on Booking rules and is not being removed; that is step 5's call.)

**The request queue — designed, empty, and not on the rail.** Above everything
when it has anything, absent when it does not (§1a). Each waiting booking is
one card: who, when, what, and two actions — **Accept** and **Decline** — with
Accept filled and Decline ringless, because they are not equal choices. The
lit element on the screen is the first of these (§1b).

> **Why it is not on the thread.** The rail is *today's day.* A request can be
> for any date, and `dashboard-skeletons.md` §2 already refuses to carry the
> rail through tomorrow for exactly this reason: it would say the two are one
> continuous run of work. Roadmap 2.12 fills these cards in; **2.11 designs
> the slot and builds nothing.**
>
> **And it needs no new mark on the calendar.** A request draws the same
> hollow circle a confirmed booking does — on a month grid both mean "booked,
> nothing has happened yet", which is the merge `dashboard-skeletons.md` §5b
> already made deliberately. At desktop the cell writes the job out, and the
> word carries it. **2.12 should not invent a sixth form.**

### The screen, in order

**Phone (< 1024) — unchanged in shape from what ships:**

1. The date masthead: the long date, and under it *part of day · N still to do*
2. **Requests** — only when there are any
3. The two-cell ledger strip: **Jobs today** | **Expected** (sunken, one block
   split by a hairline)
4. **The rail** — the three runs
5. **Tomorrow** — deliberately not on the rail

New booking is the `+` in the header (Part A decision 5), so the full-width
button at the bottom of this screen goes away with it.

**Desktop (≥ 1180) — 1.7 / 1**, per the desktop specification §5a. Left: the
masthead, the strip and the one rail, at ~700px, which is within a rounding
error of the 724px it is designed at, so **nothing in the left column
reflows.** Right, sticky:

1. **Requests waiting to be accepted** (first — the only thing waiting on you)
2. **Tomorrow**, as settled rows rather than the three 176px cards it draws now
3. **Open slots in the next 7 days**

**Opening a job replaces the right column with the job record.** The rail does
not move. A back control returns the column to what is next.

**Between 1024 and 1180:** one column at up to `--wrap`, the right column's
contents returning underneath the rail in the order above.

### States

- **Empty (a new detailer, or a day off).** Masthead reading *"Monday, August
  31 · nothing booked"*, and then **one** thing: if tomorrow has work,
  Tomorrow; if nothing at all is booked, one sentence and **your booking
  link** — because a detailer with no bookings needs the thing that gets them,
  not a button for typing one in by hand. **No ledger strip** (a strip of
  zeroes states nothing), no dashed box, no empty rail.
- **One job.** Every run that has nothing is absent; the rail is one node.
- **Many.** Five is the busiest day this business's own `buffer_minutes`
  allows, and that is what the seed builds. **Twelve is the number to design
  against** — a detailer with a shorter buffer — and at twelve the settled
  "Done" run is what keeps the screen short, because a finished, paid job is
  one line. If "Done" ever exceeds eight rows it collapses behind *"8 done and
  paid"* which expands in place.
- **Loading / error / staff:** §1a. **Staff:** the ledger strip's *Expected*
  cell is not drawn — the second cell becomes *Still to do*. Staff may finish
  a job and record a payment (the database allows it), so both runs and both
  buttons stay.

### Composition vocabulary

The rail; lit card; quiet card; settled rows; the sunken strip; bare figures.
**No new vocabulary.**

---

## 3. The job record

**The strongest single finding in the research (F4, 3 of 3), and the one
screen nobody has ever redesigned.** 26 of the product's 126 capabilities live
on this object; it is a 340-line sheet and a single scroll, reached from four
places. Jobber uses tabs, Housecall Pro six named sections, Zenbooker seven
grouped blocks. **Not one of them is a single scroll.**

### What it is for

Two different moments, and the design has to serve both: **at the car** — who,
where, what am I doing, call them; and **after** — take the money, send the
invoice, fix the time, or write it off.

### The design: an action bar over named sections

**The action bar comes first, above everything, with no heading over it.**
Today those buttons sit under a heading called *"Contact"*, four blocks down.
Every product in the sample puts them at the top because that is the only
thing you need while you are standing there.

```
   [ name · date · time ]            ← the sheet's own header
   [ Confirmed ] [ Unpaid ]          ← two pills, one vocabulary
   ────────────────────────────
   Call    Text    Navigate          ← the driveway row
   Calendar  Contacts  Reminder      ← the desk row
   ────────────────────────────
   The job
   The money
   Notes                (only if there are any)
   Photos               (row 126 — designed, not built)
   What happened
   Change the time or details
   › Remove this from my records too
```

**Named sections, not tabs.** Tabs hide state, this is a screen you scan, and
a tab strip inside a sheet inside a phone is a second navigation on a screen
that already has one. Housecall Pro and Zenbooker both use sections; only
Jobber uses tabs, and Jobber's job carries checklists and line items we do not
have.

**The sections, and what each answers**

| Section | Carries | Note |
|---|---|---|
| **The job** | mobile or drop-off · services and add-ons · vehicle size, model, condition · *"bring your own water and power"* | Unchanged in content; it is already the best block in the sheet. |
| **The money** | the figure, the payment state, and the one primary action — *Finalize payment* or *Email invoice* | **Fixes Part B row 19.** It prints *"Estimated $235.00 · Final $235.00"* when nothing changed. **One figure when they agree**; both only when they differ, and then the difference is named: *"Quoted $235.00 · charged $265.00 (+$30 added on site)"*. |
| **Notes** | the customer's own note, your private one | Absent when there are none (§1a). |
| **Photos** | before and after (row 126) | **Designed, not built.** Two slots, camera and library, ~1.6 MB a pair; storage was answered at §9 Q7. |
| **What happened** | mark completed · didn't show up · cancel · un-cancel | Today these are four equal-weight buttons in a 2×2 grid. **Three or more actions take three weights** (design system § Composition): *Mark completed* filled, *Didn't show up* ringed, *Cancel the job* ringless. A destructive choice weighted the same as a convenience is a hazard. |
| **Change the time or details** | the edit mode | Keeps today's behaviour and its warning that a conflicting move is rejected server-side. |
| **Remove from records** | the `<details>` disclosure | **Unchanged — it is right.** Cancelling is what a detailer nearly always means, and removing hides behind it and says what it does that cancelling does not. |

**Two rows of three, not one row of six.** The driveway row is Call · Text ·
Navigate; the desk row is Calendar · Contacts · Reminder — *Send customer
reminder* moves up out of the actions list, where it was a full-width button
for a thing you do in one tap.

**This was measured rather than assumed, because the neighbouring class has a
1px ceiling.** `.btnrow` on a job card sits at 291px inside 292px at 392 and
219px inside 220px at 320 — a real ceiling that a fourth button or a longer
label breaks. **The sheet's `.actions-row` is a different animal**: it is a
CSS *grid* with one column per child, so it divides rather than overflows.
Measured in the open sheet at **320**, on the seeded demo:

| | |
|---|---|
| A three-up column at 320 | **89px** per button, 38px tall, one line |
| *Navigate* (the longest label in a three-up row today) | 54px of text, **0 overflow** |
| *Reminder*, dropped into that column | 59px of text, button 90px, **38px tall, 0 overflow — it fits** |
| *Remind them* | 47px of text but it **wraps: 41px tall** |

**So the second row of three fits at 320, and the ceiling is a label of about
eight or nine characters (~60px of text) — which is what "Navigate" already
is.** That is the number a later session needs, and it is why the button says
*Reminder* and not *Remind them*. `node scripts/sweep-widths.mjs` still runs at
step 6; it now has a stated ceiling to check against rather than an open
question.

### States

- **A job in the future** — no *Finalize payment*; the money section reads
  *"Quoted $235.00"* and nothing else.
- **A job finished and unpaid** — *Finalize payment* is the primary action and
  the record is what Today's lit card opens into.
- **A cancelled job** — the pills carry it, *What happened* collapses to
  *Un-cancel*, and the driveway row stays (you may still need to ring them).
- **Empty** — a job record is never empty; it exists because a booking does.
- **Loading** — a job opens from a row that already has its data, so the
  record draws immediately. Only the message templates load on demand, and
  they load into their own picker.
- **Error** — `.error-box` directly under the pills, above the actions, which
  is where it already is and is right.
- **Staff** — everything. Staff have bookings and customers.

### Phone and desktop

**Phone:** the sheet, as today. **Desktop ≥1180:** the same sections in the
second column beside whatever list it was opened from — Today's rail, the
history table, the day, the client record. **One record component, four
callers**, which is why it is designed once here.

### Composition vocabulary

Action rows; named section titles; quiet cards; the disclosure; pills. **One
new arrangement — the action bar** — and it is a placement, not a component.

### What shipped (roadmap 2.11 step 6, stage 2 — 2026-09-01)

**Built as designed**: the action bar first and unheaded, two rows of three,
five named sections, the three weights on *What happened*, the disclosure
untouched, and the *Estimated / Final* copy fix. **Photos is still designed
and not built** (row 126), and §1a says an absent thing draws nothing, so
there is no placeholder for it. Six sections in the design, five on the
screen.

**Where the code and the drawing differ, and why:**

- **The bar is PINNED and the pills are not.** The drawing rules a line under
  the pills and another under the bar; the shipped bar has only its own
  bottom hairline, and the pills scroll up behind it. **The error and notice
  boxes ride INSIDE the pinned bar**, which is still "directly under the
  pills, above the actions" at rest — and is the only placement where a
  message answering one of the bar's own buttons can be read. *Reminder* is
  one tap now; its confirmation had to stop being scrollable.
- **`.jobbar` is `position: sticky`, and `top: 0` alone was not enough.** A
  sticky box may not leave its containing block, which for a child of
  `.sheet-body` is that element's CONTENT box — 16px below the scrollport. The
  bar stuck 18px down and a line of the record slid through the band above it.
  Measured at the 56vh peek, which is the height a phone actually opens at.
  The sheet hands its top padding to its first child instead, and only when a
  record is in it (`.sheet-body:has(> .jobbar)`).
- **"Change the time or details" is the section NAME; its button says *Edit*.**
  Today's button carried those words, and a heading over a control repeating
  it is a section that says everything twice. The edit mode itself is
  unchanged, as this design asked.
- **The address moved into *The job*.** It was under the *Contact* heading
  that the action bar replaced, and it is the *where* — so it sits under
  "Mobile — we go to them", the line it qualifies.
- **The money section's agreed case says *Charged $65.00*.** This design named
  the differing case's words and left the agreeing one as "one figure".
- **The money section also prints *How they paid*** when a job carries
  `payment_notes` — the method Finalize payment writes and which, until this
  stage, was stored and shown on no screen in the product. The payment STATE
  is the pill, which is pinned and therefore always on the page; a second copy
  of the word would have been the duplication, not the fix.
- **The Finalize condition is `completed && !finalized_at`, not
  `confirmed`** — and that is the defect this design's own state list caught.
  *"A job finished and unpaid — Finalize payment is the primary action and the
  record is what Today's lit card opens into"* was **false in the shipped
  product**: the button appeared only while the job was still `confirmed`, so
  the record you reach by tapping the "Needs payment" card had no way to take
  the payment. The record now uses the same condition as the card, so the two
  cannot disagree.
- **At most one accent fill is ever on this record**, which the design's
  "filled / ringed / ringless" needed checking against law 11: *Mark
  completed* exists only while the job is not completed and *Finalize payment*
  only once it is, so the two never share a screen.
- **The five section titles are `<h3>`, not `<div>`.** Same argument Today's
  run labels already carry: six named sections a screen reader gets as
  unstructured text cannot be skipped between.

---

## 4. Calendar · Month

### What it is for

*Which days have work, and which days are not normal.* Not *when within a day*
— that is the week view, ruled out in step 3 §7 with the month cell as its
replacement.

### What it must show

Rows 24, 25, 27, 28, 29: a mark per day saying what is on it, readable
**without colour**; the ability to close a day, give it different hours, or
make it one type of job only.

### The design

**Phone (< 1180) — exactly what ships**, plus two corrections:

- **The cell's spoken label says "1 job", not "1 jobs"** (Part B row 7).
- **The legend lists only the marks that are actually on the month shown.** A
  five-symbol legend physically larger than the marks it decodes is a tell,
  and today the demo month contains three of the five while the legend
  explains all five, every time.

**Desktop (≥1180) — one column, all of the width into the grid.** This is the
screen that most wants width and the one that must not be split: a second
column takes the width straight back off the cells. At 1,180 the cell is
**163px** and can carry a time and a name; at 760 it is 104px and carries
nothing.

- Cell min-height **112px**: the date, then **up to three job lines** —
  `09:00` in the figure face, given name and last initial in the body face —
  then *"+2 more"*.
- **Booked, Done and No-show become words in the cell**, so the legend shrinks
  to the two marks a cell cannot write: **Blocked** and **One type only**.
- Blocked and closed days keep their fill.
- **The selected day opens inline, directly beneath the grid** — a panel on
  the ground, not a modal, not a side column, with the cell it came from
  marked. The month stays above it and stays readable, which is the whole of
  4a's concern. `.cal-cell.selected` already exists in `theme.css:816` and is
  currently dead CSS; this is what revives it.

### States

- **Empty month.** A month with no jobs is not an empty state — it is a month,
  and it draws. **The legend is absent** (nothing to decode). Nothing says
  "no bookings"; the empty grid says it.
- **One job.** One cell has one line.
- **Many.** The cap is three lines and a *"+2 more"*; the day panel holds the
  rest. **The busiest realistic cell is five** (this business's buffer), so
  three plus an overflow line covers it with room. A cell that needed six
  lines would be the crew case that reopens the week view — step 3 §7 named
  that condition and this is the same one.
- **Loading.** The grid stays; **the marks fade in.** Today a spinner sits
  under the grid while the month is fetched, which moves the legend.
- **Error.** Above the grid; the last good month stays drawn.
- **Staff.** The full month. The three day controls are owner-only — a staff
  member sees the day's jobs and not the switches that close it.

### Composition vocabulary

The grid; marks; the legend; the inline panel. **The inline day panel is the
one thing to check at step 5** — it must not become a second kind of card.

---

## 5. The day

Reached by tapping a date. ~~**A sheet on a phone, an inline panel under the
grid at desktop**~~ — the same content in both.

> **CORRECTED 2026-08-31, STEP 4b: it is the inline panel at EVERY width.** Two
> containers meant two things to build and keep in step, for one panel that had
> to be designed for the desk anyway. On a phone, tapping a day scrolls the
> selected week to the top and opens the panel beneath it, so the month stays on
> screen — which is §4a's own concern, answered rather than traded away, and it
> takes a full-height sheet with an inner scroller off the one screen whose own
> content is the thing you want to keep looking at.
> `docs/dashboard-phone-pass-2026-08-31.md` §5a.

### What it must show

The day's jobs, and the three things you can say about the day: **Block this
day** · **Hours just for this day** · **How this day works** (drop-off only /
mobile only).

### The design

Unchanged in substance, because the owner specified it himself at walkthrough
W1: *"you should be able to click anywhere in that box to open it up."* Each
of the three is a card that shows the day's **current** state and opens its
own editor when tapped anywhere — and **clearing** a block, an hours override
or a restriction stays on its own explicit control, because a 300px target
that silently unblocks a day is worse than the bug W1 was about.

> **This is the one place this file changes a line of the desktop
> specification.** Spec §4a's table lists *Block this day / Hours / How this
> day works* under "stays a modal at every width". They should not become
> modals: they are already in-place editors inside their own cards, that
> behaviour is the owner's own W1 instruction, and turning them into modals at
> desktop would undo it to satisfy a table. **What the spec's table is
> actually protecting is "these are not records"** — that is true and they do
> not go into a second column. They expand in place, at both widths. §16.

### States

- **Empty (a day with nothing on it).** *"Nothing booked."* and the three
  state cards, which is what the screen is for — this is the one place an
  empty day is still worth opening.
- **One / many.** Jobs as dense cards; past five, the day is the day.
- **Loading.** The three cards draw at 55% until their state arrives, rather
  than a spinner replacing them — otherwise a day's own settings flash.
- **Error.** Above the three cards.
- **Staff.** Jobs, no state cards (they write `business_settings`-adjacent
  tables the staff session cannot reach). The section simply is not drawn.

### Composition vocabulary

State cards with switches — **the only screen made of these**, and that is
what makes it structurally distinct from the job record it sits next to.

---

## 6. Calendar · History

### What it is for

*Find a past job.* Row 30: by customer, service or status.

### What it must show

The search field, the status filter, the date range, the count and total for
whatever is matched, and the jobs.

### The design

**18 records currently draw as 18 cards, 3,619px tall, at every width** (Part
B row 8). They become **a ruled list with columns**, which is the design
system's own rule — *a collection of records is a ruled list; a card is for an
object you pick between or act on one at a time.*

**The row:** date · who · what · a status mark · the total. Two columns on a
phone (name and total on line one, date and service on line two — NN/g's
ceiling for a narrow row, F12), **five at desktop**.

**Broken by month, with a rule carrying the month's own total.** This is what
makes History structurally different from Clients rather than the same list
with different words: it is a list of events, so it has a time axis, and a
month rule is what a time axis looks like when the list is long. It is also
the only navigation a 400-row history needs.

**Desktop (≥1180) — 1.7 / 1.** Left, the table. Right, sticky: **the selected
job**; and **with nothing selected, the nine filter chips and the totals bar**,
which takes two rows of chips off the top of the results and gives the second
column a job when it is otherwise empty.

### States

- **Empty, no filter** — *"No bookings yet."* One sentence, nothing else.
- **Empty, filtered** — *"Nothing matches that."* and **the filter that is
  doing it, with a way to drop it** — an empty result is a state of the
  filter, not of the business, and the screen should say which.
- **One.** One row under one month rule.
- **Many.** **400 rows is the number to design against** — a detailer's third
  year. The month rules carry it; nothing paginates. If a real business ever
  passes ~2,000 the range filter already defaults to 90 days, which is the
  answer.
- **Loading.** The list dims; the filter bar stays live.
- **Staff.** Everything. History is bookings.

### Composition vocabulary

The ruled list with columns; month rules; status marks; the totals bar; chips.

---

## 4-6 · What shipped (roadmap 2.11 step 6, stage 3 — 2026-09-01)

**One block for the three, because they are one screen with two modes and a
panel under one of them.**

**Built as designed.** The desk cell is 159px at 1440 (the design said 163 at
1,180 and the column is capped at `--wrap`, so this is the same number) and
carries `9:00 AM Tom O.` on up to three lines with `+N more`; Booked / Done /
No-show are words there and the legend drops to the two marks a cell cannot
write. The legend lists only what is on the month shown at both widths, the
spoken label says *1 job*, `.cal-cell.selected` is alive, the day opens inline
under the grid at every width, History is a ruled list with columns under month
rules carrying each month's own total, the chips collapse behind *Filter* on a
phone and live in the second column at a desk, and the screen's *New booking*
button and its own `<Sheet>` are both gone.

**Measured.** History **3,942px → 1,373px at 1440** and **1,973px at 392**.
The month at 392 is 844px — one screen, where the legend used to take a second
row. `sweep-widths.mjs` walks the day, its three editors, the history, the open
filter bar and a history job now; it never opened any of them before.

**Where the code and the drawing differ, and why:**

- **The day's *Add a job on this day* survives, demoted.** §12 says the header
  `+` is the one doorway and lists three doors; two of the three were
  *New booking* with no date on them and are dead. This one carries THIS day,
  which is the capability the other two never had, so removing it would cost a
  real thing to satisfy a count. It is a `.btn.sm` beside the jobs now instead
  of a full-width filled button — a control, not a door.
- **The day panel is TWO COLUMNS at ≥1180.** Not in any design; it follows from
  one that is. Month is deliberately unsplit, so the panel under it inherits
  1,144px, and a job row that wide puts the name at one end of the screen and
  the money at the other. The day holds two different things — what is booked,
  and what is true of the day — so width buys a column rather than stretching
  one, which is the desktop spec's own rule one level down.
- **The three state cards dim to `.refreshing` while their state loads** rather
  than growing a class of their own. §5 asks for 55% and that class is 55% and
  no taps. **Each summary line waits** as well: "Bookings allowed as normal" is
  a claim, and a null blockout during a read is not evidence for it.
- **"Staff. Jobs, no state cards… the section simply is not drawn" is BUILT,
  and narrowed by one clause.** §5's States row was never true of the code:
  measured on the seeded staff session, a staff member saw *Block this day /
  Bookings allowed as normal* and *Hours / Your normal hours for this weekday*
  drawn **with zero controls in them** — two panels stating a default and
  offering nothing to do about it, which §1a already forbids and which the
  owner's copy rule forbids twice. **The narrowing:** an existing blockout,
  hours override or restriction still shows to a staff member, because it is a
  fact they need before they load the van — the same reasoning the mode card
  has carried since roadmap 2.7. So the rule is **per card, not per section**:
  an owner can always set one, a staff member only ever sees one that IS set,
  and the *This day* heading is absent when none of the three is.
- **The empty-unfiltered sentence names the range.** *"No bookings yet."* is
  wrong when the range control is sitting at *Last 90 days*, which is its
  default, so it reads *"No bookings in the last 90 days."* — one sentence, and
  true. The filtered case is unchanged.
- **The amount column at a desk is a fixed 92px, not `auto`.** Measured: with
  `auto` a row totalling `$65.00` gave the two `fr` columns 4px more than a row
  totalling `$235.00`, and since every row is its own grid the *what* column
  started at 572px on some rows and 576px on others — a ragged column in a list
  whose whole point is that you scan down it.

## 7. Money

### What it is for

Two questions the trade treats as two destinations (F7 — Housecall Pro carries
**My Money** and **Reporting** separately): *what did I make*, and *who owes
me and what went out.* A sixth tab is forbidden, so **the split the trade
makes across two tabs is the split this screen makes across two columns.**

### What it must show

Rows 32–40: what the business made over a period · its shape over six periods
· the period switch · who has not paid and an action on it · expenses in and
out · income against expenses · **an export for the accountant (row 40,
new).**

### The design

**The chart gets a zero line, and this is a live defect with a half-fix on
it.** `.bars` is `align-items: flex-end` with `height: |value|`, so **−$114
and +$114 draw the identical bar** and only the colour differs. Roadmap 2.4
made a losing bar red, which was right and is not enough: colour alone is the
same WCAG 1.4.1 problem the calendar marks were rewritten to remove, and it is
the one the marks vocabulary exists to answer. **A loss hangs below a 1px
`--line` rule; a win stands on it.** Scale is the larger of the two extremes,
so a single bad week does not flatten five good ones.

**The period control goes on one line.** It is three stacked rows today —
chips, then a stepper row, then the label — for one question. Chips left,
stepper and label right.

**The export (row 40) lives here and nowhere else.** *Jobs and expenses,
nothing more* — your answer to Q4. It uses **the period already chosen on this
screen**, so it needs no control of its own: a button beside the period label
reading *"Send this month to my accountant"*. Putting a second export on
History would be two doors to one answer, and History's filter is a search
tool, not a reporting period.

**Desktop (≥1180) — 1.2 / 1.**

- **Left, "what did I make":** the period control · the lead figure and its
  comparison · the chart · the sunken ledger (collected, expenses, avg job,
  jobs done; quoted vs added on site; tips when there are any).
- **Right, "who owes me and what went out":** waiting on payment, then
  expenses.

Measured today stacked: left ≈547px, right ≈769px, 1,589px total → **≈830px
side by side including the header**, which is the whole screen inside one
900px viewport. This is the screen the width helps most.

### States

- **Empty (no jobs, no expenses).** The lead figure is **$0.00** and it is
  correct — not an empty state. The chart, the waiting-on-payment section and
  the expenses section are **absent**. One line under the figure: *"Nothing
  recorded this month."* and the *Add expense* action. Today *"Nothing
  outstanding"* draws a dashed box (Part B row 11) — that box goes.
- **One.** One bar, and **no comparison** — the screen already says *"No
  comparison yet"* rather than inventing a previous period, which is right.
- **Many.** Expenses are capped at 12 rows today with no indication that they
  are capped. **The cap becomes a stated one**: 12 rows and then *"+9 more this
  month"*, which expands. A silent truncation reads as a complete list.
- **Loading.** The screen currently vanishes behind a centred spinner; under
  §1a the figures dim in place.
- **Error.** Above the lead figure.
- **Staff.** **The whole tab is not offered** — the database returns zero
  expense rows for them, so a Money screen for staff would be revenue with a
  hole in it. This is what ships and it stands.

### Composition vocabulary

Bare figures; the lead figure; the signed bar chart; the sunken paired-cell
ledger; quiet cards for the unpaid rows.

---

## 8. Clients

### What it is for

Two jobs, and today it only does the first: **look somebody up**, and — your
decision 3 — **find who has not been back.**

### What it must show

Rows 41–48: search by name · contact details and act on them · a private note
· everything they have booked · when they were last in · what they have spent
· **sort and filter** · **text a group** (both *comes back*, manual only).

### The design

**The list shows what it already calculates and currently hides inside the
sheet.** Columns: **name · last visit · lifetime spend · phone.** Four at
desktop, **two on a phone** — which is where it already sits and is NN/g's
stated ceiling for a narrow row, so nothing is being held back from the phone.

**Sort and filter, manual only** (decision 3, and *"automatic 'we miss you'
messages on a timer are a different thing entirely"*):

- A segmented control of three: **Recent · Most spent · Longest away.** Three
  choices is a segmented control, never a `<select>` (design system §
  Composition, and the test that enforces it).
- One chip: **Not seen in 3 months.**

**When the filter is on, the list header offers the action** — *"Text these
12"* — which is decision 3's *"act on the answer"* and row 48. **Designed, not
built:** it opens the phone's own messages app with the numbers, because this
product does not send texts and is not going to (the inbox question was
settled *no* in the architecture doc).

**Fix, Part B row 6: "last visit" can print a future date.** It reads the
first row of a newest-first history without checking that the job has
happened. **Last visit is the most recent *completed* job that has already
ended** — the same rule the seed had to learn in step 0, for the same reason:
nothing finished may ever be printed in the future.

**Desktop:** full-bleed and one column until a client is opened, then **1.4 /
1**. Nothing about the list narrows away — that is what beside-not-over buys.

### States

- **Empty.** *"No customers yet — they appear on their own when bookings come
  in."* One sentence. Correct and reassuring: this list is never typed into.
- **One.** One row. The sort control is **absent** below three rows — a
  control that cannot change anything is noise.
- **Many.** Currently capped at **200 rows with no indication**, and a search
  that hits the database each keystroke. **200 becomes a stated cap** with the
  search as the way past it: *"Showing the 200 most recent — search for
  anyone older."*
- **Loading.** The list dims; the search field stays live.
- **Error.** Above the list.
- **Staff.** The list, the record and the notes. **Lifetime spend is not
  drawn** — for staff the third column is *visits*, which is what they need
  and what the sheet already does.

### Composition vocabulary

The full-bleed ruled list with columns; a segmented control; one chip. **No
panels anywhere on this screen** — law 1's entry for Clients, and §9 is what
keeps it true when a record opens.

---

## 9. The client record

**The only record in the product with no container**, and that is deliberate:
Clients is the only screen with no panel on it, and a right-hand card would end
that.

### The design

Bare **ruled rows on the ground.** `.facts` is already exactly this shape and
is the best part of the current sheet; it becomes the record.

**It leads with the numbers** (F8, 2 of 2 — both documented products lead a
client with a figure): **visits** and **lifetime spend**, then last visit.

**Two copy defects go** (Part B row 18): the phone number is printed twice —
once as the subtitle and once as a button — and **every history row repeats the
client's own name**, on the one screen where the name is the least useful thing
in the row. In the record, a history row is *date · what · total*.

**Not tabbed.** F8 says both products tab their client record; both are
carrying invoices, estimates, recurring plans and equipment. Ours carries a
note and a history. **Two things do not need tabs**, and adding them would put
a second navigation inside a record.

**Phone:** a sheet, as today. **Desktop ≥1180:** the right column of §8's 1.4/1
split, and **still with no card around it** — the rows sit directly on the
ground. That is the whole reason this record is specified separately from the
job record, which is made of sections in containers.

**Composition vocabulary:** bare ruled rows (`.facts`); two bare figures; one
text field; a dated list for the history. **No card, no panel.**

### States

- **A client with no completed jobs** — *"No completed visits yet"*, and the
  numbers read 0 and $0.00, which is true.
- **Many.** A ten-year client's history is the longest list in the record;
  **it caps at 50 today, silently.** Stated, and the rest reachable: *"50 most
  recent."*
- **Loading.** The record opens from a row that already holds name, phone and
  the three figures, so **the header draws immediately** and only the history
  dims.
- **Error / staff:** §1a; staff see visits, not spend.

---

## 10. Business

**The fifth tab, and your own word for it.** Part A settled the destination;
this is the screen.

### The admission test, which is the whole design

> **A row belongs on Business only if it changes what a customer meets. If it
> changes how the app behaves for the detailer, it goes behind the gear.**
> Anything that fits neither is a new destination or is not built — it does
> not get filed under Business because there was room.

Without that written into the screen's own design, "Business" is "More" with a
better name and this happens again in six months. **It is the rule that
replaces the one the name used to carry for free.**

### What is on it

**Your booking link is the first thing on the screen** — it is 1,156px down
today (Part B row 16) and it is the single most-shared thing the business
owns. It is not a settings row; it is a block: the link, **Copy**, **Open**,
**Share**.

Then three groups of self-answering nav rows. **Every row answers itself** —
*"Mon–Fri, 9:00 AM – 5:00 PM"*, *"7 services · 2 add-ons"* — because most
visits to this screen are to **check** something, and those visits should cost
no taps. That is the best thing about the screen this replaces and it is kept
wholesale.

| Group | Rows |
|---|---|
| **Your page** | Business info · Your colour · Photo gallery · **Reviews** *(new door)* · **FAQ** *(new)* |
| **What you sell** | Services & add-ons · Promo codes & sale |
| **When you can be booked** | Hours & days off · Booking rules |

**Eight headings for eleven rows, three of them owning one row each** (Part B
row 15) becomes **three headings for nine rows.**

**Behind the gear, in the header** — the plumbing, which is what only changes
how the app behaves for you: Notifications · Message templates · Team · This
device · **Switch business** *(new door, only when the account has more than
one)* · the account block and Sign out.

**The screen's title is "Business", matching its tab** (Part B row 14: it is
titled "Settings" under a tab labelled "More" today).

### Desktop (≥1180) — 1 / 1.9, the only screen weighted toward its right

Because here the left is an index and the right is the actual work.

- **Left (1):** the index — the booking link block, then the three groups.
- **Right (1.9), ~700px:** the selected settings screen, **rendered in
  place — the eleven stop being 640px modals.** *Services & add-ons* is four
  lists and the most-edited screen in the product, and it is a 640px modal at
  every width today.
- **With nothing selected**, the right column holds the booking link, larger,
  with its QR — the thing you would hand someone.

`dashboard-skeletons.md` §3 permits this and it is worth saying why, because
it reads at first like a contradiction: that file allows the eleven to share
one skeleton because *"they are modal panels reached one at a time… Law 1
governs what is on screen at once."* At desktop they become a **column**
reached one at a time. The reasoning is untouched; only the container changes,
and two are still never on screen together.

### States

- **Empty.** Business never is — but a **brand-new** business is, and every
  row says so in its own words: *"No days set — nobody can book"* is already
  the model, and it is the right one. **A row whose answer would block
  bookings carries the lit treatment** (§1b item 4, an unsaved setting) — at
  most one, in the order hours → services → business info.
- **Loading.** The rows draw with their names and a dimmed summary line; the
  summaries fill in. Today they show *"…"*, which is close and stays.
- **Error.** A failed count shows a dash, never a confident **0**. This is
  already the behaviour and the reason is recorded in the code: a wrong
  *"0 people"* reads as a real answer and cost a session.
- **Staff.** A staff member's whole Business tab would be **two rows** (Part B
  row 3), and one of them — *Your colour* — the database refuses to let them
  write (Part B row 2). **Staff do not get a Business tab.** They get four
  rail buttons, not five, exactly as they get four rather than five today
  without Money. The gear keeps *This device*, *Message templates* and the
  account block, which is what a staff session can actually use.

### Composition vocabulary

Grouped panels of nav rows; the booking-link block. **The only screen made of
panels.**

---

## 11. The settings screens — one skeleton, thirteen of them

*(Corrected from "twelve" at step 5, 2026-08-31: the table below lists
thirteen — the eleven that exist plus Reviews and FAQ. Switch business is a
fourteenth destination behind the gear and is not one of them, because it is a
picker and does not share this skeleton.
`docs/dashboard-component-inventory-2026-08-31.md` §3f.)*

**One shape on purpose** (`dashboard-skeletons.md` §3): a form — a row per
setting, its control on the right, and a plain sentence underneath saying what
it does. *The sentence is the point: a label alone tells you the name of a
setting, not its consequence.* What varies is the internal structure, which
follows the content.

Only what **changes** is listed. Everything unnamed keeps its current design.

| Screen | Change | Why |
|---|---|---|
| **Services & add-ons** | Grouped exactly the way the customer meets it — categories with their services inside them, not four flat lists. **One arrow per row**, not two. | Part B row 17. It is the menu; it should look like the menu. |
| **Business info** | **The second colour picker is deleted.** Three fields added: Facebook, TikTok, YouTube. | D1 and inventory row 92. Law 11 says a tenant has **one** accent; two pickers are a schema accident, not a choice the product offers. |
| **Your colour** | Writes **one** colour to both `primary_color` and `secondary_color`, and the email path gets the same contrast floor every other surface has. | **D1, the worst defect on the list.** Picking "Sky" today draws the invoice email's own title at **1:1 — the same colour on itself.** Four of twelve presets put the business name under the 3:1 floor on the email band. `accent-sweep.mjs` grows to reach email in the same change. |
| **Booking rules** | ~~The **superseded flat travel fee is deleted** — still editable, still holding $25, and no longer charged.~~ **CORRECTED AT STEP 6, 2026-08-31: the flat fee IS charged** — `pricing.ts:135` returns it and `computeQuote` adds it, which is what roadmap 2.8c fixed. It is superseded **only when travel areas exist**, which is exactly what Part B row 5 said and what this row lost. **The change is that the field becomes a sentence once areas exist. Nothing is deleted.** | Part B row 5 / row 79 — re-read at step 6 after the owner said *"yes, we should have a travel fee"*. A field that is dead **in one configuration** is not a dead field, and flattening that condition turned a live money path into a proposed deletion. |
| **Notifications** | The push switch **is not offered until the browser half exists.** | Part B row 1: the switch writes `push_enabled` and there is **no client code at all** — no service worker, no permission prompt. A switch that delivers nothing is worse than a missing feature. |
| **Hours & days off** | Unchanged. | It is the best settings screen in the product. |
| **Team** | Unchanged. | |
| **Reviews** *(new)* | Writes `testimonials`, which the booking page **already reads and displays.** Add, edit, hide; each carries a name, the words, and which job it came from. | Inventory §3 — a table with no door, and one of the four things Phase 3's websites need. |
| **FAQ** *(new)* | On or off, and the questions and answers, written by the detailer. *"They're the detailer."* AI may polish wording only — an action on a written answer, never a generator of one. | Your Q2. Three rows on the inventory because turning it on, writing it and improving it are three different things. |
| **Message templates · This device · Promo codes · Photo gallery** | Unchanged, and they move behind the gear or stay on Business per §10. | |

### States, for all thirteen

- **Empty.** Every one of these can be empty on day one, and each says what is
  missing **in terms of the customer**: *"No services yet — your booking page
  has nothing to sell."* Never *"No records."*
- **One / many.** Catalog is the only one that gets long: four groups, and a
  category with 20 services is the ceiling worth designing (the booking page's
  own step 1 measurement caps at six services in two categories at 1440x900,
  so a longer menu is the tenant's budget, not ours).
- **Loading.** The form draws with its fields disabled, not a spinner. A
  settings form that appears field by field cannot be filled in.
- **Error.** At the field that failed, not at the top of the screen.
- **Staff.** Only *Message templates* and *This device* are reachable at all.

---

## 12. The forms you commit

**Modals at every width** (§1d), because you have already left the list.

| Form | What changes |
|---|---|
| **New booking** | **It offers service combinations `create-booking` rejects with a 409** (Part B row 4). The form must ask the server what is bookable rather than compose freely — the same availability the customer's own booking page uses. This is the one item here that is engine-adjacent and it is named, not designed around. Reached from the `+` in the header, which is **one doorway** where there are three today (Part B row 20). |
| **Finalize payment** | Unchanged. It is the most-used form in the product and it works: amount, method, tip, extra line items. |
| **Add an expense** | Unchanged. |

**States, all three:** empty is the blank form; loading disables the primary
action and says what it is doing; an error appears above the primary action
and the form keeps everything typed. **Never close a form on an error** — the
one rule that matters here, because everything in it was typed by hand.
**Staff** reach New booking and Finalize payment; Add an expense is not
offered, because the database returns them no expenses to add one to.

**Phone and desktop are the same**, and that is the point of §1d: a form you
commit is a modal at 320 and at 1920, because by the time you are in it you
have already left the list and there is nothing behind it to protect.

**Composition vocabulary:** the modal; fields; one primary action at one
weight. Nothing else.

---

## 13. First run — the two things you asked for

Your Q1, and you overruled the recommendation: *"empty states, not a wizard"*
was proposed and you asked for **a setup form** and **separately a guided
walkthrough.** They are two different things and this file keeps them two.

### 13a. The setup form (row 118)

**One stepped form that collects everything the booking page needs to work** —
business info, hours, services, add-ons, booking rules, promo codes. **Skippable
at any point and resumable** — your words, and they are the design:

- **Skippable** means every step has *"I'll do this later"*, and skipping never
  blocks the next step.
- **Resumable** means the dashboard remembers where it stopped, and Business
  carries a row at the top — *"Finish setting up · 3 of 7 done"* — until it is
  complete or dismissed.
- **The order is the order a booking needs**: what you sell → when you work →
  who you are. A detailer who quits after two steps still has a bookable page.
- It is a **stepped form** (the only stepped thing in the product), one
  question per step, with a progress rule — never a page of twelve fields.

### 13b. The walkthrough (row 119)

**Your three constraints are the specification, and they are not stylistic:**
*no paragraphs · MORE steps rather than fewer · never two things in one step.*

- **A spotlight over the live screen** — the real dashboard with the real
  data, one element lit at a time. Not a slideshow of pictures.
- **One sentence a step. One element a step.** If a step needs "and", it is
  two steps.
- **Leaves at any time and never comes back on its own**; it is re-runnable
  from the gear.
- It walks the five destinations in the order the work happens: Today → the
  `+` → a job → Calendar → Money → Business → the booking link. **The last
  step is the link**, because that is the thing they have to go and use.

**States.** First run is *the* state; a returning detailer never sees either
unless they ask. **Staff get the walkthrough, not the setup form** — they are
not setting up a business. **Error** inside the setup form never loses a step
that was already saved: each step commits on leaving it, so a failure costs
one step, not seven.

**Phone and desktop.** The setup form is one column at every width — a stepped
form that widened would just put more air around one question. The walkthrough
is a spotlight over whatever the screen is doing at that width, so **it has to
be re-checked at 1180 and above**, where the thing it points at has moved into
a second column. That is the only part of first-run the desktop layout
touches.

**Composition vocabulary:** the stepped form and its progress rule (new, and
used nowhere else); the spotlight (new). **Both go to step 5** as the only two
genuinely new shapes this file asks for.

---

## 14. The way in

**Sign in · Create a business · Accept an invitation.** One shape: a single
centred card on the ground. This is where the design system's *"centred exactly
once"* is spent, and it is spent here because these are the only screens in the
product with exactly one thing on them.

**Unchanged in design.** Named for completeness and because of one live
behaviour worth keeping in view: signing out must clear the previous tenant's
accent, or the last detailer's colour stays on the sign-in screen — a defect
that already happened once and was fixed in 2.3.

---

## 15. The doors for the things that have none

Inventory §3 is the list that decides whether this rebuild is *"the same thing
redrawn"*. **Seven things work underneath with no screen anywhere.** Here is
where each one lands.

| Thing | Door | Where |
|---|---|---|
| `testimonials` | **Reviews**, a new settings screen | §11, Business tab |
| `business_branding.social_facebook / _tiktok / _youtube` | Three fields | §11, Business info |
| Multi-business membership | **Switch business**, only when the account has more than one | §10, behind the gear |
| `owner_push_subscriptions` | **No new screen.** The switch already exists; what is missing is the entire browser half — a service worker, a `PushManager`, a permission prompt. | §11 — the switch is withdrawn until it delivers |
| `monthly_plans` | **Not designed here.** It is one of the five you asked to bring back, and it is a feature with a price, a term and a renewal — not a settings screen. | Named, and left to its own roadmap item |
| `business_domains` | **Not designed here** — roadmap 3.3 | |
| `campaigns` + `campaign_visits` + `track-visit` | **Deliberately unplaced**, and it stays unplaced. It is a report, not a page setting and not really a Money figure, and inventing a sixth destination for a half-built feature is how a five-tab bar becomes six. | Architecture doc §6 |

**Three of the four things Phase 3's tenant websites are missing are on this
page** — reviews, the social links and the FAQ. The fourth is the custom
domain, which is 3.3. That convergence is the reason step 1 insisted this list
existed before any screen was drawn.

---

## 16. What this file changes in the files that outrank it

CLAUDE.md's rule: *if a test and a real design decision collide, the system
file gets updated first, never silently.* **Three updates, none of them
cosmetic, all of them landing at step 6 with the build.**

**1. `docs/design-system.md`, law 11b's table — one word.** The `--accent` row
reads *"the 'it landed' node"*. With the rail carrying three states instead of
one, "landed" is ambiguous between *finished* and *paid*, and the ambiguity is
exactly what produced D5. It becomes:

- `--accent` — *"...the **completed** node on the day rail"*
- `--ac` — *"...`.dot.paid`, `.badge.paid`, **the paid node on the day rail**"*

**And the paragraph under it stands.** It says *completed* stays on the accent
while *paid* moves to green, and it justifies that with the rail: *"the Today
rail's landed node is the one place the detailer's colour appears on the
screen they open every morning — moving it to green would put the house colour
back on their main screen."* **That worry is answered rather than overridden:**
under this design the accent is still on the rail (every finished-and-unpaid
node), still on the lit card's bloom and still on every button. Only the
*paid* node goes green — which is what the calendar has always done.

**2. `docs/dashboard-skeletons.md` §6 — the lit order gains an item.** A
booking waiting to be accepted goes above money not recorded. Reasoning at
§1b. It changes nothing until roadmap 2.12 ships.

**3. `docs/dashboard-desktop-spec-2026-08-31.md` §4a — one table row.** *Block
this day / Hours / How this day works* are listed as "stays a modal at every
width". They expand in place inside the day panel instead, at both widths.
Reasoning at §5, and the spec's actual point — that they are not records and
do not take a second column — is untouched.

**Nothing else moves.** No token, no face, no motion preset, no accessibility
floor, no never-default.

---

## 17. What this file does not do, and what step 5 rules

- **It does not settle what a list is and what a card is.** History and
  Clients both want a ruled list whose rows carry columns; §1e says how they
  are structurally different and what each needs. **Whether that is one
  component with two configurations or two components is step 5's**, together
  with 2.10's declined decision 7 — `composition.test.mjs` test 1 cannot see a
  card rendered through a component, and the test is rewritten to match
  whatever step 5 decides.
- **It does not name components.** Which of these exist, which are new and
  which die is step 5's whole job. This file names *shapes* and *behaviour*.
- **It touches no schema, no edge function, no engine and no email** — with
  one exception that is a defect rather than a feature: the email accent path
  (D1), which is craft and lands in the build.
  **CORRECTED AT STEP 6, 2026-08-31: this claim and the FAQ screen at §11 are
  in each other's way.** The FAQ has **no table and no column** — inventory §5
  says so outright (*"no table, no screen"*) and the schema confirms it: nothing
  in `supabase/migrations/` mentions an FAQ, and `business_branding` has no
  column for one. Reviews, the social links and Switch business are *doors onto
  storage that exists*; the FAQ is not, and calling all four "doors" is what hid
  it. **It is the owner's to settle** and it is §3b of
  `docs/dashboard-spec-approval-2026-08-31.md`: build it in Phase 3 with the
  page that would display it (recommended), or add the storage inside 2.11 and
  accept that a detailer writes answers nothing renders yet.
- **It builds nothing.** Every measurement quoted here was taken from the
  running app; every design is on paper.
- **It does not re-derive the tab bar, the visual world, or the desktop
  breakpoints.** Part A, bucket 1, and step 3.

### The measurements step 6 has to be able to take on this file

Step 3 §10 lists the layout numbers. These are the ones step 4 adds:

| Check | Today | Required |
|---|---|---|
| `.dayrail` elements on Today | **3** | **1** |
| A finished job's rail node | hollow "ahead" ring | solid |
| A paid job's rail node | `#0ea5e9` (the tenant accent) | `--ac` `#38E08B`, on every tenant |
| Today's run labels over a completed job | "NEXT UP" | a label that is true in every combination |
| `.app-main`'s first child after leaving Today and returning | `.center` (a spinner replacing the screen) | the screen, dimmed |
| A −$114 bar against a +$114 bar | identical height | one hangs below the zero line |
| Job record sections | 1 scroll | an action bar over 6 named sections |
| Clients columns / History columns at 1440 | 2 / 1 | 4 / 5 |
| Rows on the Business tab under headings | 11 rows, 8 headings | 9 rows, 3 headings |
| Things with a back end and no door | 7 | **3** (plans, the domain, campaigns — each with a stated reason) |
