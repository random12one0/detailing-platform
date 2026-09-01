# The phone, re-decided — 2026-08-31 (roadmap 2.11, step 4b)

**Nothing here is built.** This is the last file before code. Step 6 is the
build; this is the half of it step 4 did not do.

**Why it exists, in your words.** You read step 4's line *"Not the phone"* and
answered: *"the whole admin dashboard is changing both with desktop and phone."*
You were right and the wording was ours. But the gap you found is bigger than
the sentence: **step 4 describes five screens' phone form as "what ships
today"**, and under your own instruction — *"forget that the old dashboard even
existed"* — an unchanged screen is not a decision. It is the absence of one.

**So every screen's phone form is decided again here from nothing.** Where the
answer comes out the same as what ships, the reason is written down and the
screen has earned it. Where it does not, it is redrawn. **"Unchanged" is not
an answer this file is allowed to give.**

---

## 0a. The whole thing on one page

**The one-line version: the phone has two shapes, not one, and the product has
only ever designed the first.**

Held upright, a phone is tall and narrow — lots of height, no width. Turned on
its side it is the exact opposite: **844 pixels across and 390 tall**, which is
less height than any screen this product has ever been checked at. Today the
dashboard decides its layout by width alone, so turning your phone sideways
hands it the *widest* layout it has and the *shortest* screen it has ever seen,
at the same time. That is the whole bug, and it is one line of code wide.

**What I measured on your own demo business today, sideways:**

| | |
|---|---|
| Your day, five jobs, top to bottom | **2,480px in a 274px window — nine screens of scrolling** |
| The bar across the bottom | **covers the first job** |
| The month calendar | **1.3 weeks of 5 visible** |
| Clients | **1.3 rows of 8 visible**, under 229px of title and search box |
| Opening a job | a floating box showing **38%** of the job |
| Opening Business info | a floating box showing **20%** of the form |
| The sign-in screen, after a wrong password | **25 pixels off the bottom** — "Create an account" is cut off |

**And the checking script said "clean" for all of it**, because it only ever
looks at the right-hand edge. That is the same trap this project has already
walked into twice, and §1c is where it gets closed.

**The five decisions that fix it, in one line each.**

1. **Sideways, the bottom bar stands up and moves to the left edge** — the
   same navigation, rotated. It is not a new thing to build: the desk version
   of the dashboard already does exactly this, and it was already approved. It
   only ever asked "is the screen wide?" It now also asks "is the screen
   short?" **That one change gives back a quarter of the screen.**
2. **Sideways, wide things pair up.** A phone number field is 549px wide on a
   sideways phone today, on a screen that can only show 276px of height. Two
   columns of fields instead of one, and the same form goes from five screens
   of scrolling to two.
3. **Upright, only the job you are actually doing is a big card.** Five jobs
   today are five identical 289px cards — which is also, word for word, a
   named "AI slop" tell in our own anti-slop file. The other four become one
   line each. **Your day goes from 3.4 screens to 2.1**, and the one big card
   on the screen is the one thing to do, which is the whole point of the
   design.
4. **Settings screens stop being floating boxes and become proper pages** you
   go into and come back from — which is what the little `›` arrow has been
   promising all along, and what the desk version already does.
5. **The job count and the money become one line instead of a 112px panel** at
   the top of Today. On its own that is only 56 pixels — but together with (3)
   it changes what you can see without scrolling: **one job and a sliver of the
   second today, against the job you are on plus the next three.**

**What does NOT change.** No colours, no fonts, no look — that is still "the
look stays". The five tabs and their order. The desk layout from step 3. The
booking page your customers see (one thing about it is flagged in §18 and it
is not for this session). And nothing is built here.

---

## 1. What was measured, and how

**Everything below was taken from the running app today**, signed in as the
seeded demo owner with a full five-job day, not read off the code.

### 1a. The two phones

They are opposite problems and the product has one answer for both:

| | Upright | Sideways |
|---|---|---|
| Size | 392 x 844 (iPhone 393x852, Samsung 360x800, floor 320) | **844 x 390** |
| What is scarce | **width** | **height** |
| What is spare | height | width |
| What the app does today | designs for it | **gives it the desk layout** |

### 1b. The chrome, sideways

| Piece | Height | Share of a 390px screen |
|---|---|---|
| The sticky bar at the top (`.topbar`) | 48px | 12% |
| The floating tab bar (`.tabbar`, fixed, +12px clearance) | 68px | 17% |
| **What is left for the screen itself** | **274px** | **70%** |

**Nearly a third of a sideways phone is navigation.** Upright it is 14% of 844,
which is normal. The chrome did not grow; the screen shrank by 54%, and nothing
in the layout knows.

### 1c. The finding that matters most: the sweep is blind to this

`node scripts/sweep-widths.mjs 844` was run first, as the baseline, before
anything was added to its default list. **It reported clean on all 18 screens.**

**It is clean and it is not true.** Every check that script owns —
`past-viewport`, `past-parent`, `self-clipped`, `touching`, `dead-width` — asks
a question about the RIGHT-HAND EDGE. Landscape's entire failure is the BOTTOM
one. The proof is on the very first screen of the product: the sign-in card
with an error message on it is **399px tall in a 390px viewport, its bottom
edge 25px past the screen**, and the sweep calls that screen clean.

**This is the third time this exact shape has appeared in this repo**, and it
is written at the top of `DECISIONS.md`: *a check that cannot see the common
failure looks exactly like a check that passes.* It was `past-parent` in
roadmap 2.9 (two defects sat outside their card for two roadmap items while the
sweep said clean), it was `dead-width` in step 3 (18 screens clean at 1920 with
a 724px column), and it is this now.

**So 844 joins the default list AND the script gains the one measurement that
can see landscape** — §19. Adding the width without the check would have bought
a gate that stays green whether or not this file is ever built.

### 1d. The root cause, and it is one media query

`app/src/theme.css:1067`:

```
@media (min-width: 700px) {
  /* On a wide screen the sheet stops being a sheet and becomes a panel */
  .sheet { height: auto !important; max-height: 86vh; }
}
```

**A sideways phone is 844px wide, so it is "a wide screen"**, and it gets the
desk's centred floating panel: `86vh` of 390px = **335px**, measured exactly.
Inside it, Business info's form is 1,365px long — **20% visible**. The job
record is 694px — **38% visible**.

The comment is right about *why* the rule exists (*"dragging a thing up from the
bottom edge is a thumb gesture, not a mouse one"*) and wrong about *when*: it
asked only about width. **Every landscape defect in this file is a version of
that same question.** The rule this file adds is one sentence:

> **A layout decision that spends height must ask about height.**

### 1e. What the numbers were

Signed in, five-job day, at **844 x 390** unless the row says otherwise.

| Screen | Measured |
|---|---|
| Today, five jobs | document **2,480px** in a 274px band = **9.05 screens** |
| Today, first job card | top at **307px** — below the fold on a sideways phone |
| Calendar · Month | grid starts at y=200, row pitch 93px, tab bar at y=322 → **1.3 of 5 rows visible** |
| Money | document 1,270px = **4.6 screens**; the chart is below the fold and under the tab bar |
| Clients | first row at y=**229**, rows 71px, tab bar at y=322 → **1.3 of 8 rows visible** |
| Clients, a row | **724px wide** carrying a name and a phone number |
| The job record sheet | 640px wide, scroller **265 of 694px = 38%** |
| Business info sheet | 640px wide, scroller **276 of 1,365px = 20%**; one text field **549px wide** |
| Sign in, no error | card 355px in 390 — 17px of clearance |
| Sign in, with an error | card **399px, bottom 25px off-screen**, "Create an account" clipped |
| `.app-main` | max-width **760px** — the same column it gets at 1920 |

At **392 x 844** (upright), same day:

| Screen | Measured |
|---|---|
| Today | document **2,500px** in a 728px band = **3.4 screens** |
| Today, job cards | **five cards, 289px each, identical** |
| Today, first card | top at **318px**, bottom 607; the tab bar starts at **785**, so **card 2 shows 126px of 289** |
| Today, the sunken strip | **112px** (y 153–265) for two figures |
| Money, the period chips | 388px of chips in a 356px column — **already two rows, 4 + 1**, with "Lifetime" orphaned |
| Money, the chart | **64px tall** |

**And one defect that is not about size at all**, seen again while measuring:
the label **"NEXT UP" sits over a job that finished at 8:00 AM**. That is step
4's D3 and it is not re-opened here; it is noted because it is the first thing
on the screen this file spends its longest section on.

---

## 2. The rules that hold on every screen

Written once. Step 4 §1 still holds in full — the six states, the lit order,
what the accent may say, law 1's skeleton register. **These are the additions
the phone forces, and nothing here contradicts that file.**

### 2a. The height rule — the single structural decision in this file

**The shell chooses its shape by width AND by height.**

| Condition | The shell |
|---|---|
| width ≥ 1024 | vertical rail on the left (desktop spec §6a, approved) |
| **height ≤ 500 AND width ≥ 520** | **vertical rail on the left — the same one** |
| everything else | the floating tab bar pill at the bottom |

**Why a rail and not something new.** The desktop specification already turned
the tab bar into *"a vertical glass pill rail, fixed to the left edge,
vertically centred, 72px wide, 24px from the edge… the same component with
`flex-direction: column`."* It is approved, it is drawn, and it exists for
precisely this reason — an edge with room on it. **Landscape has a left edge
with 844px of room and a bottom edge with none.** Nothing is invented; a
condition is widened.

**Why 500px of height.** A current phone is 852 or 800 tall upright and 393 or
360 tall sideways. There is nothing between 500 and 800, so the line can sit
anywhere in that gap; 500 is round and it is comfortably above the tallest
sideways phone.

**Why 520px of width is also required, and this is the trap.** The rail costs
120px of left inset. An old iPhone SE upright is **320 x 480** — 480 is under
500, so a height-only rule would give a 320px-wide screen a 120px rail and
leave 200px of content. At 520px wide the rail leaves **400px**, which is still
wider than the 392 this product designs its upright phone at. Below 520 there
is no device in landscape. **Both conditions, always.**

**What it buys, measured:** the live band goes from **274px to 342px, +25%**,
and the navigation stops covering the first job. **Content width goes 724 →
673 — measured, by putting the 120px inset on `.app-shell` in the running app.
That is 51px, 7%**, and it is 51 rather than 36 because a headless viewport
carries a scrollbar a phone does not; on a real 844px device it is 36px.

**The header stays at both shapes.** The desktop spec settled that
deliberately — *"a rail that stole them back would make the header mean two
different things at two widths"* — and the `+` and the gear live in it. 48px is
affordable once the tab bar's 68 is gone; taking both would be paying twice for
one problem.

### 2b. The width rule — sideways, things pair

Landscape has width to spend and nothing spending it. Three specific pairings,
and no others:

1. **A form's paired fields pair.** This is the mirror of the 320 floor already
   in `theme.css` (*"below 361px a sheet gives a control 244px, and two of
   anything will not share that"*) — the same rule read the other way. Business
   info's 1,365px of fields becomes ~690px: **five screens of scrolling
   becomes two.**
2. **The screen's masthead sits on the line with the screen's first control.**
   "Money" beside its period chips; "Clients" beside its search field;
   "Business" beside its booking link. A 60px display line costs 18% of a
   sideways screen and nothing at all upright. **The masthead is not deleted** —
   it is the type contrast that keeps these screens from reading as a default
   app shell, and deleting it would be a move toward the generic, not away.
3. **A record's named sections flow into two columns** — §4.

**And one pairing that is refused: the screen does not grow a second column.**
The desktop split needs 1,180px and gets 673 here. What landscape gets is **two
columns of CONTENT inside one column of SCREEN**, which is a different thing
and does not touch the desktop specification's breakpoint.

### 2c. What a container is, on a phone

Step 4 §1d has two categories. **The phone needs three**, and the third was
hiding inside the first:

| | Upright phone | Sideways | ≥1180 |
|---|---|---|---|
| **A record** — a job, a client | a sheet, pulled up over its list | **full-bleed**, sections two-up | the second column |
| **A place you go** — a settings screen | **a page, with a back control** | a page | the second column |
| **A form you commit** — new booking, finalize payment, add expense | a full-screen sheet, **primary action pinned to the bottom edge** | full-bleed, fields two-up, action pinned | a modal |

**Why a settings screen stops being a sheet, and it is the second-biggest
change here.** Four reasons and none of them is taste:

- The row that opens it draws a **`›` chevron**, which promises a push, and
  delivers a peek. The affordance has been lying since it was built.
- A sheet pinned to 92vh (86vh above 700px wide) with its own inner scroller,
  inside a page that also scrolls, is **two scrollers**. Sideways that measured
  **276px of a 1,365px form — 20% visible**.
- *Services & add-ons* is four lists and the most-edited screen in the product,
  and it is a 640px floating box at every width today.
- **Step 4 already moved this direction at the desk** — §10: *"the selected
  settings screen, rendered in place — the eleven stop being 640px modals."*
  The phone is not being given a new idea; it is being given the same one.

`dashboard-skeletons.md` §3's reasoning survives untouched: it allows the
twelve to share one skeleton because *"they are modal panels reached one at a
time… Law 1 governs what is on screen at once."* **Reached one at a time is
still true of a page.** Only the container changes; two are still never on
screen together.

### 2d. Sideways, a floating panel is always wrong

The `min-width: 700px` rule at `theme.css:1067` gains a height condition. **A
sheet on a short screen is full-bleed** — edge to edge, top to bottom, its own
header and back control. It buys 390px instead of 335 and, more importantly, it
buys the full width of the screen for §2b's two columns — a full-bleed sheet
keeps all 844 rather than the rail's 673, because there is no rail behind it.

### 2e. What does not change, and why that is a decision

- **The five tabs and their order.** Derived, defended and approved
  (`dashboard-architecture-2026-08-31.md` §3a/§3b); re-deriving them wastes
  your time, which the roadmap says in as many words.
- **The floating pill, upright.** `theme.css:525` says why it exists — it is
  *"what stops the dashboard reading as a default mobile app shell"*. It is
  thumb-reachable, it is the product's own shape rather than the platform
  default, and 68px of an 844px screen is 8%. **Kept on its merits, not
  inherited.**
- **It does not hide on scroll.** A navigation that disappears to buy 68px
  costs discoverability every time, and the height it buys is only scarce on
  the shape that no longer has it.

### 2f. One duplicate is deleted everywhere

The topbar prints the screen's name on its right — measured: `"Coastline Auto
Detailing" + "Today"`. **So the screen is named three times**: the lit tab, the
topbar, and the screen's own masthead. **The topbar's copy goes.** Its right
side is where the approved header puts the `+` and the gear, and step 4 §1g
already caught the same family of error (*a screen titled "Settings" under a tab
labelled "More"*).

---

## 3. Today

**The screen he opens forty times a day**, and the one this file changes most.

**What it is for on a phone** has not moved and it is the test everything below
is measured against: *standing in a driveway, one hand, sun on the screen —
what am I doing now, what is left, did I get paid.*

### The three things wrong with it upright, measured

| | |
|---|---|
| The first job card starts **318px down**, and the tab bar begins at 785 | **you see one job and 126px of the second** — one of five |
| **Five identical 289px cards** | 1,445px of job cards for a five-job day |
| Document **2,500px** in a 728px band | **3.4 screens** for one day's work |

### 3a. The masthead and the strip become one line

Today: a 30px date, a subtitle, and a **112px** sunken two-cell panel — three
blocks, 270px from the top of the viewport, before any work.

**Redrawn:** the date stays, and the panel becomes **one row of three bare
figures on the ground**, hairline-separated, no container, in the figure face at
~28px so it is readable at arm's length in daylight — which is what the panel
was actually for.

```
Tuesday, September 1
Afternoon · 3 of 5 still to do
─────────────────────────────────────────
   5 jobs   │   2 done   │   $455 expected
─────────────────────────────────────────
```

- **~56px instead of 112px**, so the first job moves **318 → ~262px**. That is
  56px and no more, because **the masthead is not cut** (§2b: it is the type
  contrast that keeps these screens off the default-app-shell shape). The
  57px is worth having and it is not where the win is — §3b is.
- **The fourth fact is not lost.** *Collected* has no cell of its own; the
  third cell carries both — **`$455 expected`** until money comes in, then
  **`$120 of $455`**. One cell, both facts, and no empty state that says
  "nothing collected yet" in a slot sized for a figure.
- **Bare figures are already Today's vocabulary** (step 4 §2). Nothing new.
- **≥1024 the sunken two-cell strip stays**, exactly as step 4 drew it. The
  desk has the height; the phone does not.

### 3b. Only the lit job is a card

**Five identical full-width stacked cards is a named tell in our own anti-slop
file** (`design-knowledge.md` §1: *"five identical full-width stacked
sections"*). It is also 1,445px of screen for a day you could read in 300.

**Redrawn:**

| Run | Form |
|---|---|
| **Needs payment** — the lit one, first | **the card**, full, with its actions: Navigate · Call · Text, and Finalize payment |
| **Still to do** | **rows** — one line each |
| **Done** | **settled rows**, as step 4 already has them |

**A row is two lines at 392** — the same NN/g ceiling History and Clients use:

```
 ○  10:15 AM   Dana Ruiz                       $110.00
    Full detail · Mobile
```

- **Time and figure in the figure face** (law 8), name and service in the body
  face, the rail node on the left.
- Tapping the row opens the job record — which step 4 gave **an action bar at
  the top** precisely so Call / Text / Navigate live one tap away. The actions
  are not lost; they are where step 4 decided they belong.
- **The lit card is the only card on the screen**, which makes "one thing lit"
  a matter of *form* rather than colour — the marks vocabulary's own rule, and
  the reason law 11b does not have to work harder.
- **At most one card.** When nothing needs payment the lit object is the next
  job (step 4 §1b), and that row becomes the card. When a booking is waiting to
  be accepted, that is the lit object and no job is a card.

**What it costs, projected from the measured parts** — the rail region runs
318→1,840 today, which is **1,522px of cards and gaps for five jobs.** A
two-line row of this kind is **71px measured** (a `.row-item` on Clients), so
one card (289) + four rows (71) + gaps (12) = **~633px, a saving of ~890.**
With §3a's 56 and §3c's ~289, **the document goes 2,500 → ~1,265px: 3.4 screens
→ 1.7.** These are projections from measured parts, not measurements — the
requirement step 6 has to hit is in §21 and it is deliberately looser.
**The number that matters is not the total but what is above the tab bar at
785px: the lit card and three rows, against one card and a sliver of a second.**

### 3c. Tomorrow is one line

Today it is **two 172px cards**. A phone in a driveway does not need tomorrow's
detail; it needs to know tomorrow exists and to be able to look.

```
 Tomorrow · 4 jobs, first at 8:00 AM                    ›
```

One row, opens tomorrow's day. **Saves ~350px.** At ≥1180 Tomorrow keeps the
right column step 4 gave it, as settled rows.

### 3d. The rest

- **Requests waiting to be accepted** (built empty, roadmap 2.12 fills them):
  cards, above everything, absent when there are none. **A card is right here** —
  it carries two unequal actions and it is the one object with somebody else
  waiting on the answer. Confirmed, not inherited.
- **The rail**: one continuous hairline, three runs, the calendar's node
  vocabulary. Step 4's design, and it is the phone-native shape — a vertical
  thread down a tall screen. Confirmed on merits.
- **New booking** is the `+` in the header. The full-width button at the bottom
  goes with it.

### 3e. Sideways

Rail left, masthead line, figures row, rail. Live band 342px:

- the figures row and the date **share one line** (§2b): `Tuesday, September 1
  · 5 jobs · 2 done · $455 expected`, ~48px.
- the lit card's action row is **already a grid that divides** — at 673px it is
  three comfortable buttons, no change needed.
- **Projected against the redraw:** ~1,180px in a 342px band = **3.5 screens,
  down from 9.05.**

### 3f. States

Step 4 §2 in full. The phone adds one: **an empty day sideways** is a masthead,
one sentence and the booking link — which fits the 342px band with room, and is
the only screen in the product that gets *better* sideways.

### 3g. The 320 floor

The row form is what makes 320 comfortable rather than survivable: two lines,
time and figure at the ends, name and service under. The card at 320 is
unchanged and already passes.

---

## 4. The job record

**26 of the product's 126 capabilities in one object**, and step 4 redrew it as
*an action bar over named sections*. **The shape is right and is not re-opened.**
What is decided here is its container and its behaviour on a phone.

- **Upright: a sheet.** Confirmed on merits — a record is a thing you pull up
  over the list you found it in, and you dismiss it back to where you were. The
  sheet's grab handle is a thumb gesture and the list stays behind it. This is
  the one place the sheet is exactly right.
- **The action bar is the first thing under the header and it does not scroll
  away.** Step 4 put it first because *"that is the only thing you need while
  you are standing there"*. On a phone that argument is stronger, not weaker:
  it is **pinned**. Measured today, sideways, the CONTACT row was below the
  fold — the buttons step 4 moved to the top were off the screen again for a
  different reason.
- **The two rows of three are measured and stand**: 89px per button at 320,
  *Reminder* fits at 59px of text, and the ceiling is a label of about nine
  characters. Step 4 §3 took those numbers; nothing here moves them.
- **Sideways: full-bleed, and the named sections flow into two columns.** The
  action bar spans the full width above them. **694px of content in ~350px of
  column = one screen with room, against 2.6 screens today at 38% visible.**
- **Photos (row 126, designed not built)**: two slots side by side upright; in
  the second column sideways.

**Nothing else about this screen changes.** Step 4's sections, weights and the
`Estimated / Final` copy fix are the design; this file gave it a container and
pinned its bar.

---

## 5. Calendar · Month

**The grid is right on a phone and it is not replaced.** The obvious phone
alternative is an agenda list, and it fails the screen's own question: *which
days have work, and which days are not normal.* An agenda cannot draw an empty
day, a closed day or a blocked one — it only lists what exists. Step 3 already
ruled the week view out and named the month cell as its replacement. **Kept on
its merits.**

- **Upright the cell is 51px** ((392−36)/7) and carries a date numeral and up
  to three marks. That is the ceiling and it is honest. **The words that the
  desk's 163px cell gets are a desk feature**, exactly as step 4 says.
- **"1 job", not "1 jobs"** (Part B row 7) — carried.
- **The legend lists only the marks in the month shown** — carried, and it
  matters more here: a five-symbol legend is a full row of a phone screen.

### 5a. The day opens inline, at every width — one component, not two

Step 4 gave the desk **an inline panel directly beneath the grid** and left the
phone a sheet. **Decided: the phone gets the inline panel too.**

- **One component instead of two.** The panel already had to be designed for
  the desk; a phone sheet is a second thing to build, test and keep in step.
- **The month stays on the screen.** Tapping a day scrolls the selected week to
  the top and opens the panel under it, so you keep the row you are working in
  — which is the whole of step 4 §4a's concern about not covering the grid.
- **It removes the last full-height sheet from the calendar**, the container
  §1d measured at 20–38% visible sideways.
- `.cal-cell.selected` already exists in `theme.css:816` and is dead CSS. This
  is what revives it, at both widths rather than one.

### 5b. Sideways — and the cell gets shorter, which is a real decision

**Measured, so the arithmetic is honest.** Today the Month/History + New
booking row is 38px at y=66; the month stepper and the weekday letters take
another 68px; **the grid starts at y=200 and its row pitch is 93px** (88px cell
+ 5px gap). With the tab bar at y=322 that is **1.3 rows of 5 visible.**

Two changes, and the second is not just a re-flow:

1. **The Month/History control, New booking and the month stepper share one
   line** — 673px holds all three easily (§2b). **Grid top 200 → ~160px.**
2. **The cell's minimum height drops from 88px to 64px on a short screen.** The
   88 exists to give the desk's cell room for three written job lines; a
   sideways phone has no height to give and its cell is **~96px wide**, which
   still holds the date and up to three marks comfortably. **Row pitch 93 →
   69px.**

**Result: (390 − 160) / 69 = ~3.3 rows visible, against 1.3 today** — with the
whole 390 usable at the bottom because the tab bar is now a rail.

**A full month will not fit in 342px and is not meant to.** The measurement to
hold is *rows visible without scrolling*, and three is the difference between
reading a month and reading a fortnight.

---

## 6. The day

- **The three state cards** — *Block this day* · *Hours just for this day* ·
  *How this day works* — each showing the day's current state and opening its
  editor when tapped anywhere. **This is your own instruction from walkthrough
  W1** (*"you should be able to click anywhere in that box to open it up"*) and
  it is confirmed, not inherited. Clearing a block stays on its own explicit
  control, because a 300px target that silently unblocks a day is worse than
  the bug W1 was about.
- **Upright:** the three stack, full width, under the day's jobs.
- **Sideways: the three sit side by side** — 3 x ~230px. They are small state
  cards with a label and a switch and they pair naturally. This is §2b spending
  width on something that wants it, and it takes the day's chrome from ~330px
  to ~110.
- **Jobs in the day panel are rows**, same form as §3b. The panel is not the
  place a job is a card; the job record is.
- Staff see the jobs and not the state cards, as step 4 has it.

---

## 7. Calendar · History

**A ruled list with columns is right and is confirmed** — it is a list of
events with a time axis, and the month rules that break it are the only
navigation 400 rows need.

- **Two columns upright**, five at desktop (step 4). Which two, decided here:
  **line 1 is `who` and `the total`; line 2 is `date · what`, with the status
  mark at the left of line 1.** The name is what you are scanning for and the
  figure is what you came to check.
- **The filter bar is the phone problem, and it is not the list.** Nine chips,
  a search field and a date range is three rows of chrome before a single
  result. **Upright, the nine chips collapse behind one control — `Filter` —
  and an active filter shows as one removable pill.** The search field stays
  visible, because on a phone *find a past job* is a search, and filters are
  the second-order tool. At ≥1180 the chips live in the right column exactly as
  step 4 put them.
- **Empty, filtered** says which filter is doing it and offers to drop it —
  step 4's rule, and on a phone with the chips collapsed it is the only way the
  screen can be honest about why it is empty. **This is the one place the
  collapse costs something, and the empty state is what pays it back.**
- **Sideways:** rail; masthead, search and Filter on one line; rows two-up is
  refused — a row is a horizontal thing and two side by side would read as four
  columns of one record. **Rows stay full width and simply get more of them.**
  Measured on Clients, which has the same stack: the masthead block is 62px at
  y=66 and the search field 46px at y=155, so pairing them puts the first row
  at **~156px instead of 229** — and with no tab bar eating the bottom,
  **(390 − 156) / 71 = 3.3 rows visible against 1.3.**

---

## 8. Money

- **The period control.** Step 4 says *"it goes on one line"*. **Measured: it
  cannot, upright.** The five chips are 388px of content in a 356px column and
  already wrap **4 + 1**, orphaning "Lifetime". **Decided: they are a segmented
  control and they follow the 320 floor rule that already exists** — full-width
  and wrapping, **3 + 2**, which is a deliberate shape rather than an orphan.
  The stepper and the period label share the row below. Two rows upright, one
  row from ~520px up. Step 4's one-line target is a desk target and is met
  there.
- **The chart.** Measured **64px tall**. Step 4 adds the zero line, and a
  signed chart needs room on both sides of it — a −$114 bar that is 30px tall
  says nothing. **Upright the chart is 120px with the zero line at 60% of its
  height**, because losses are rarer and shallower than wins; a −$114 against a
  +$455 must be visibly below the line without giving half the chart to the
  half that is usually empty.
- **The two questions stack in order** upright — *what did I make*, then *who
  owes me and what went out* — and split into the two columns step 4 specified
  at ≥1180. Confirmed: the order is the order you ask them in.
- **The export** — *"Send this month to my accountant"* — is a full-width
  action beside the period label. It uses the period already chosen, so it
  needs no control of its own.
- **The expenses cap is stated**: 12 rows then *"+9 more this month"*, which
  expands. Silent truncation reads as a complete list.
- **Sideways:** rail; masthead and the period chips on one line (the chips fit
  on one row at 673px — they need 388 and fit twice over); the chart, then the
  ledger. Live band 342px shows the
  lead figure and the chart together, which is the pair that answers the
  screen's first question. **Document 1,270px → ~1,230px in a 342 band = 3.6
  screens, from 4.6** — a smaller gain than the other screens, because the
  chart growing 64 → 120px spends back most of what the merged lines save. That
  is the right trade: a signed chart that cannot show a loss is the defect.

---

## 9. Clients

**Two jobs: look somebody up, and find who has not been back.**

- **The row changes, and this is the real phone decision.** Today it prints
  **name / phone · email** — and email is the least useful thing about a
  customer to a detailer holding a phone. Step 4 says the list *"shows what it
  already calculates and currently hides"*. On a phone that is two columns, and
  which two is decided here:

```
 Marcus Webb                                    $640.00
 Last in 3 weeks ago · 562-555-0142
```

  **Line 1: name and lifetime spend. Line 2: last visit and phone.** Spend is
  the figure the client record itself leads with, and *last visit* is the
  answer to the second job the screen exists for. **Email is dropped from the
  row** and stays in the record.

- **Staff see visits where the owner sees spend** — step 4's rule, and it fits
  the same slot.
- **The sort control** — *Recent · Most spent · Longest away* — is a segmented
  control of three, full width at 392, wrapping at the 320 floor by the rule
  that already exists. **Absent below three rows**, because a control that
  cannot change anything is noise.
- **One chip: `Not seen in 3 months`**, and when it is on the list header
  offers *"Text these 12"*.
- **The 200-row cap is stated**: *"Showing the 200 most recent — search for
  anyone older."*
- **229px of chrome upright is 27% of an 844px screen and is accepted.** The
  masthead is the type contrast that keeps this screen from reading as a
  default list app, and the search field is the screen's purpose. It is only a
  defect sideways, and §2b is where that is paid.
- **Sideways:** masthead and search field on one line. Measured: the masthead
  block is **62px at y=66** and the field **46px at y=155**, so the paired line
  is 62px and **the first row lands at ~156px instead of 229**. With the tab bar
  gone, **(390 − 156) / 71 = 3.3 rows visible against 1.3.**

---

## 10. The client record

- **Upright: a sheet**, and confirmed — it is a record, opened from the row it
  belongs to, dismissed back to it.
- **Bare ruled rows on the ground, no container** — law 1's entry for Clients
  is *the only screen with no panel on it*, and a card around the record would
  end that. Confirmed.
- **It leads with two bare figures** — visits and lifetime spend — side by side
  at 392. Then last visit, then the note, then the history.
- **Two copy defects go** (step 4, Part B row 18): the phone number printed
  twice, and every history row repeating the client's own name. In the record a
  history row is **date · what · total**.
- **The history caps at 50, stated.**
- **Sideways: full-bleed, two columns** — the facts and the note left, the
  history right. The history is the long part and giving it its own column is
  the whole win.

---

## 11. Business

- **The booking link block is the first thing on the screen** (it is 1,156px
  down today) and it is a block, not a settings row.
  **The phone form is measured against a known ceiling**: walkthrough W14 was a
  Share button pushing Open off the screen at 392. So — **the link on line 1,
  truncated with an ellipsis, which is a designed truncation that says there is
  more; three buttons on line 2: `Copy · Share · Open`.** Three-up at 392 is
  118px each, and the job record's action row proved 89px works at 320.
- **Three groups, nine rows, every row answering itself** — *"Mon–Fri, 9:00 AM
  – 5:00 PM"*, *"7 services · 2 add-ons"*. **This is the best thing about the
  screen it replaces and it is kept on its merits**: most visits here are to
  *check* something, and those visits cost no taps.
- **The title is "Business"**, matching its tab.
- **The gear holds the plumbing**: Notifications · Message templates · Team ·
  This device · Switch business · the account block and Sign out.
- **The admission test is part of the design**: *a row belongs on Business only
  if it changes what a customer meets.* Without it written down, "Business" is
  "More" with a better name in six months.
- **Sideways:** masthead beside the booking-link block; the three groups
  stacked at full width — **panels do not pair**, because two panels side by
  side at 350px each is the "three evenly spaced cards" shape and this screen is
  law 1's *only screen made of panels*. Width goes to the link, which is the
  thing you hand someone.

---

## 12. The settings screens (twelve)

**One skeleton, twelve screens** — a form: a row per setting, control right, a
plain sentence underneath saying what it does. Unchanged and right: *a label
alone tells you the name of a setting, not its consequence.*

**What changes is the container, and it changes for all twelve** — §2c: **a
page you go into and come back from, not a floating box.** Reasons in §2c.

- **Upright:** full width, a back control at the top left, the screen's name
  beside it. One scroller, not two.
- **The rows keep the 320 floor rules that already exist**: paired fields
  stack, a setting puts its control under its words, a segmented control goes
  full-width and wraps, the palette is 4x3.
- **Sideways: two columns of rows** (§2b). Business info: **1,365px → ~690px, 2
  screens instead of 5.** *Your colour*'s palette goes 6x2. *Hours & days off*
  is seven day-rows and pairs into two columns of four and three — the one
  screen that gains most, since it is seven near-identical rows.
- **Loading:** the form draws with its fields disabled, not a spinner. A
  settings form that appears field by field cannot be filled in.
- **Errors sit at the field that failed**, not at the top.
- **Empty states name the customer's loss**: *"No services yet — your booking
  page has nothing to sell."*

**Twelve, not thirteen** — the FAQ gets its storage in 2.11 and its screen
later, which is your own split.

---

## 13. The forms you commit

**New booking · Finalize payment · Add an expense.** Modals at every width,
because by the time you are in one you have left the list and there is nothing
behind it to protect.

**The phone decision is one thing and it is not the container:**

> **The primary action is pinned to the bottom edge, above the keyboard, and
> the fields scroll under it.**

*Finalize payment* is the most-used form in the product and it is filled in
with a keyboard up. A `Finalize payment` button that has scrolled out of reach
behind a keyboard is the classic phone failure and it costs the product its
single most important action.

- **Sideways is the worst case in the whole product**: 390px of height minus a
  keyboard is about **190px**. Full-bleed, fields two-up, action pinned — that
  is three or four fields visible instead of one. **Named because it is the
  hardest measurement step 6 has to take, not because it is solved on paper.**
- **Never close a form on an error**, and keep everything typed. The one rule
  that matters here, because it was all typed by hand.
- **New booking must ask the server what is bookable** rather than compose
  freely — it currently offers combinations `create-booking` rejects with a 409
  (Part B row 4). Named, not designed around.

---

## 14. First run — the setup form

**One stepped form, one question per step, a progress rule.** Skippable at any
point (*"I'll do this later"* on every step) and resumable (Business carries
*"Finish setting up · 3 of 7 done"* until it is done or dismissed). The order is
the order a booking needs: **what you sell → when you work → who you are**, so a
detailer who quits after two steps still has a bookable page.

- **One column at every width, and that is a decision not a default**: a
  stepped form that widened would put more air around one question.
- **Sideways it is the best-behaved screen in the product** — one question and
  a progress rule fit 342px with room. It gets the rail and nothing else
  changes.
- **Each step commits on leaving it**, so a failure costs one step, not seven.

---

## 15. First run — the walkthrough

**A spotlight over the live screen** — the real dashboard, real data, one
element lit at a time. Your three constraints are the specification: *no
paragraphs · more steps rather than fewer · never two things in one step.* If a
step needs "and", it is two steps.

- It walks **Today → the `+` → a job → Calendar → Money → Business → the
  booking link**, and **the last step is the link**, because that is the thing
  you have to go and use.
- Leaves at any time, never returns on its own, re-runnable from the gear.

**The phone decision: the walkthrough points at things that MOVE.** Step 4
already said it must be re-checked at ≥1180 where its targets move into a
second column. **Sideways is a third case and a worse one — the tab bar it
points at is not at the bottom any more, it is a rail on the left.** Any step
that names a position (*"the bar at the bottom"*) is wrong sideways.

> **Rule: a walkthrough step names the thing, never its position.** *"Your five
> destinations"*, not *"the bar at the bottom"*. The spotlight is what shows
> where it is.

---

## 16. The way in — sign in, create a business, accept an invitation

**One shape: a single centred card on the ground.** This is where the design
system's *"centred exactly once"* is spent, and it is spent here because these
are the only screens in the product with exactly one thing on them. Confirmed.

**And this is where the measured landscape defect is.**

| | |
|---|---|
| The card, no error, at 844x390 | 355px in 390 — **17px of clearance** |
| **The card with `Invalid login credentials`** | **399px. Bottom edge 25px past the screen.** "Create an account" clipped. |

**The rule that fixes it, and it is not "make the card shorter":**

> **A card that is centred must stop being centred the moment it is taller than
> the screen.** Below 500px of height the card is **top-aligned with normal
> page scrolling and its own vertical padding**, so it can be any height and
> every part of it is reachable.

Centring a box taller than its container clips it at **both** ends, and the
first thing lost is the bottom — which here is the error message's own remedy.
**One rule, all three screens, and it is why this defect is worth its own
section on a 355px card.**

Also kept in view: **signing out must clear the previous tenant's accent**, or
the last detailer's colour stays on the sign-in screen. A defect that already
happened once, fixed in 2.3.

---

## 17. What this file changes in the files that outrank it

CLAUDE.md's rule: *if a test and a real design decision collide, the system file
gets updated first, never silently.* **Four changes, all landing at step 6 with
the build.**

**1. `docs/dashboard-desktop-spec-2026-08-31.md` §5 and §6a — the rail's
condition.** The file says *"at ≥1024 the tab bar is a vertical glass pill
rail"* and *"below 1024 pixels nothing changes at all."* The second sentence is
now false by the owner's own instruction, and the first gains a clause: **the
rail also appears at height ≤500 and width ≥520.** The component, its geometry
and its reasoning are untouched; only the condition widens. §2a.

**2. `docs/dashboard-screen-designs-2026-08-31.md` §1d — a third container.**
That table has *a record* and *a form you commit*. **A settings screen is
neither**: it is a place you go, and on a phone it is a page, not a sheet. §2c.
Desktop behaviour is unchanged — both still become the right column.

**3. The same file, §4 and §5 — the day panel is inline at every width.** Step
4 gave the phone a sheet and the desk an inline panel. **One component, inline
at both.** §5a.

**4. `app/src/theme.css:1067` — the `min-width: 700px` sheet rule gains a
height condition.** It is the root cause of every sideways container defect
measured here. §1d and §2d.

**Nothing else moves.** No token, no face, no motion preset, no accessibility
floor, no never-default, no tab, no colour meaning. The step 4 designs stand
except where named above.

---

## 18. What this file does not do

- **It does not build anything.** Every measurement is from the running app;
  every design is on paper.
- **It does not re-open the tab bar, the visual world, the desktop breakpoints
  or step 4's screen designs.** It decides phone *form*, and where it touches
  step 4 it says so in §17.
- **It does not name components.** Step 5's inventory is unaffected except
  where §17 names a container change; the shapes are the same shapes.
- **It does not fix the customer's booking page**, and there is a finding there
  that needs a home. `node scripts/sweep-booking-steps.mjs 844x390` was run as
  part of the landscape baseline: **all eight steps overflow, the worst by
  467px — 120% of the screen, on step 1.** W16 is the owner's rule that a customer never
  scrolls inside a step, and **sideways it is not met on any step.** That is
  the booking widget, not the dashboard, and folding it into 2.11 would swell
  the item — **it is written up as a roadmap item of its own** (§20). The
  numbers are recorded here because they were measured here.
- **It does not measure a real device.** Everything is a headless browser at a
  set viewport. A real phone has a notch, a home indicator, a URL bar that
  comes and goes, and a keyboard — and `100dvh` behaves differently under all
  four. **The `env(safe-area-inset-*)` values are already in `theme.css` and the
  rail will need its own.** Named as the known gap, since mid-range Android is
  already on the open list in `DESIGN.md`.

---

## 19. The check, and what it can and cannot see

**`sweep-widths.mjs` changes twice in one edit, and the second half is the
point.**

1. **844 joins the default `SIZES`.** Baselined first, at the top of this
   session, on the version of the app that ships today: **clean on all 18
   screens.** So it is a green gate from the moment it is added, which is this
   repo's own rule for a new check.
2. **A new measurement, `short-screen`, because §1c proved the other five
   cannot see landscape.** On any viewport 500px tall or under it measures the
   **sticky and fixed chrome as a share of the viewport height** and reports
   over 20%. Today at 844x390 it is **116px of 390 = 30%**. After §2a it is
   **48px = 12%**.

**It does not gate yet.** `PHONE_PASS_BUILT` is `false` until step 6 ships the
shell, exactly as `DESKTOP_SPEC_BUILT` works and for the same reason: a
standing red gate against a layout nobody has built yet is noise, and a silent
pass is a lie. **It prints every run and the summary says out loud that a clean
sweep is not proof while it is false.**

**What `short-screen` still cannot see**, said plainly so the next session does
not trust it further than it goes: it measures the chrome budget, not the
content. It would not have caught the sign-in card (§16) — that is a document
taller than its viewport on a screen that should not scroll, and it is the same
question `sweep-booking-steps.mjs` already answers for the booking page. **If a
sixth check is ever wanted, that is the one**, and it is not written here
because it needs a per-screen answer to *"is this screen allowed to scroll?"*
and most dashboard screens are.

---

## 20. What this file hands to the roadmap

| | |
|---|---|
| **The phone forms above** | roadmap 2.11 step 6, the build |
| **`sweep-widths.mjs` gains 844 and `short-screen`** | this session — §19 |
| **The booking widget sideways: 8 of 8 steps overflow, worst 467px on step 1** | **a new item** — W16 in landscape. Not 2.11: 2.11 is the dashboard, and the fix is the booking page's step layout |

---

## 21. The measurements step 6 has to be able to take on this file

Step 4 §17 lists its own; these are step 4b's. All at **844 x 390** unless
stated.

| Check | Today | Required |
|---|---|---|
| Chrome as a share of a sideways screen | **30%** (116px of 390) | **≤ 20%** — 12% after the rail |
| The tab bar over the first job | **it covers it** | the rail; nothing covers content |
| Today, five jobs, sideways | **2,480px, 9.05 screens** | **≤ 4.5 screens** (projected 3.5) |
| Today, five jobs, at 392x844 | **2,500px, 3.4 screens** | **≤ 2.2 screens** (projected 1.7) |
| Today, cards on a five-job day at 392 | **5 identical 289px cards** | **1 card, 4 rows** |
| Today, top of the first job at 392 | **318px**, and only card 1 of 5 is whole | **≤ 270px, and the lit card plus 3 rows above the tab bar at 785** |
| Calendar rows visible sideways | **1.3 of 5** (grid top 200, pitch 93) | **≥ 3** — grid top ~160, pitch ~69 |
| Clients rows visible sideways | **1.3** (first row y=229, tab bar y=322) | **≥ 3** — first row ~156, no tab bar |
| Clients row content at 392 | name / phone · **email** | name · **spend** / **last visit** · phone |
| The job record sheet, sideways | **38% visible, 2.6 screens** | full-bleed, two columns, **≤ 1.2 screens** |
| Business info, sideways | **20% visible, 1,365px** | two columns, **≤ 700px** |
| A settings screen on a phone | a full-height sheet with an inner scroller (86vh = 335px sideways, 20% of the form) | **a page, one scroller, a back control** |
| The day panel on a phone | a sheet | **inline under the grid** |
| Money period chips at 392 | **two rows, 4 + 1** | **two rows, 3 + 2** |
| The Money chart | **64px, no zero line** | **120px, zero line at 60%** |
| Sign in with an error, sideways | **399px card, 25px off the bottom** | **top-aligned and fully reachable** |
| The screen's name on the topbar | printed, and it is the third copy | **gone**; `+` and gear in its place |
| `sweep-widths.mjs` default sizes | 1920, 1440, 392, 360, 320 | **+ 844** |
