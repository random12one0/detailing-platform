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

> **THE PHONE IS PORTRAIT. YOUR RULING, 2026-08-31, AND IT IS §2a.**
> *"For the phone version, it should always just stay portrait… when someone
> flips their phone over sideways, I don't want it to completely readjust. I
> could tell if we had that, it might get annoying."*
> **This file is portrait-only.** An earlier draft designed a sideways layout
> as well; that is withdrawn, and **§20 keeps the measurements** so that nobody
> re-discovers the problem in six months and files it as new.
> **There is one thing your ruling does need built**, and it is small: the
> dashboard *does* readjust sideways today, and badly. §2a is the guard that
> stops it.

---

## 0a. The whole thing on one page

**Everything here is about a phone held upright, which is how the work
actually happens.** Your five decisions, one line each:

1. **Only the job you are actually doing is a big card.** A five-job day draws
   **five identical 289-pixel cards** today — which is, word for word, a named
   "AI slop" tell in our own anti-slop file. The other four become one line
   each. You would see **the job you are on plus the next three**, where today
   you see one and a sliver of the second.
2. **Settings screens stop being floating boxes and become proper pages** you
   go into and come back from — which is what the little `›` arrow has been
   promising all along, and what the desk version already does.
3. **The job count and the money become one line** at the top of Today instead
   of a 112-pixel panel, so the day starts higher up the screen.
4. **Clients shows what it already knows and hides.** Today a row prints a name
   and an **email address**. It becomes name · what they have spent · when they
   were last in · their number.
5. **Rotating the phone changes nothing** — your ruling. Right now it changes
   quite a lot, and §2a is the one guard that stops it.

**On (5), so it is not a surprise later.** Sideways is a 390-pixel-tall window
and it stays a cramped one — the guard stops the layout from *changing*, it
does not make a short screen tall. What you are buying is that the dashboard
you know does not turn into a different dashboard in your hand.

**What does NOT change.** No colours, no fonts, no look — that is still "the
look stays". The five tabs and their order. The desk layout from step 3. And
nothing is built here.

---

## 1. What was measured, and how

**Everything below was taken from the running app today**, signed in as the
seeded demo owner with a full five-job day, not read off the code.

At **392 x 844** — an iPhone is 393x852 and a Samsung 360x800, so this is the
shape, and 320 is the floor `PRODUCT.md` promises:

| Screen | Measured |
|---|---|
| Today, five jobs | document **2,500px**; the usable band between the sticky top bar and the tab bar is **737px** → **3.4 screens** |
| Today, job cards | **five cards, 289px each, identical** |
| Today, first card | top **318px**, bottom 607; the tab bar starts at **785**, so **card 2 shows 126px of 289** — one whole job of five |
| Today, the sunken strip | **112px** (y 153–265) for two figures |
| Clients, first row | y=**229**, under a 62px masthead and a 46px search field |
| Clients, a row | name and `phone · email` |
| Money, the period chips | 388px of chips in a 356px column — **already two rows, 4 + 1**, with "Lifetime" orphaned |
| Money, the chart | **64px tall**, no zero line |
| The chrome | sticky top bar 48px, floating tab bar 68px with its clearance — **14% of 844**, which is normal |

**And one defect that is not about size**, seen again while measuring: the
label **"NEXT UP" sits over a job that finished at 8:00 AM.** That is step 4's
D3 and it is not re-opened here; it is noted because it is the first thing on
the screen this file spends its longest section on.

---

## 2. The rules that hold on every screen

Step 4 §1 still holds in full — the six states, the lit order, what the accent
may say, law 1's skeleton register. **These are the additions the phone
forces.**

### 2a. Rotating the phone does not change the layout — and today it does

**Your rule, and the whole of the landscape question:**

> **The phone's layout is the portrait layout, at every orientation. Turning
> the phone sideways must not produce a second design.**

**The reason this needs building rather than just not-building is that the
dashboard already readjusts when you rotate, and nobody chose it.** Measured
at 844x390 — a phone on its side:

- **A settings screen stops being a sheet and becomes a floating centred box.**
  `theme.css:1067` says *"on a wide screen the sheet stops being a sheet and
  becomes a panel"* at `min-width: 700px`, and a sideways phone is 844px wide,
  so it counts as a wide screen. It gets `max-height: 86vh` of 390px = **335px,
  showing 276px of Business info's 1,365px form — 20%.**
- **A day's time row reorders** — `theme.css:1182`, `min-width: 560px`.
- The content column goes from the screen's width to a **760px** centred one.

**Every one of those is a width-only media query asking a width-only question
on a screen whose real problem is height.** The rule underneath, written once:

> **A layout decision that spends height must ask about height.**

**The guard, and it is one clause in two places.** The breakpoints below the
desktop threshold gain a minimum height:

```
@media (min-width: 700px) and (min-height: 500px)   /* the sheet rule   */
@media (min-width: 560px) and (min-height: 500px)   /* the day-row rule */
```

- **500px** because a phone is 800–852 tall upright and 360–393 sideways, and
  nothing real sits between. A laptop is 900.
- **Nothing above the desktop threshold needs a guard**: the desktop rail
  engages at 1024px wide and no phone is 1024px wide in any orientation.
- **The desktop is untouched.** A desk screen is taller than 500px.

**What it looks like sideways after the guard:** the portrait dashboard,
centred, with the ground either side — and the ground is the design's own
material, not dead space (law 1). Nothing re-flows, nothing moves, nothing is
a second layout to design, check or maintain.

**What it does NOT do, said plainly.** It does not give back height. Sideways
is still a 390px window and still a lot of scrolling. **You accepted that
trade explicitly** — the annoyance you named was the *readjusting*, not the
cramping.

> **A true orientation lock — where the screen does not even turn — is not
> available to a web page.** It needs the dashboard installed to the Home
> Screen with a web app manifest, and **Android honours it while iPhone
> ignores it.** There is no manifest in `app/` at all today. It is worth one
> line **if and when the push-notification work lands**, because that work
> already requires a Home Screen install on iPhone — **not worth creating a
> manifest for on its own**, since the guard above already delivers what you
> asked for on every phone.

### 2b. What a container is, on a phone

Step 4 §1d has two categories. **The phone needs three**, and the third was
hiding inside the first:

| | Phone | ≥1180 |
|---|---|---|
| **A record** — a job, a client | a sheet, pulled up over its list | the second column |
| **A place you go** — a settings screen | **a page, with a back control** | the second column |
| **A form you commit** — new booking, finalize payment, add expense | a full-screen sheet, **primary action pinned to the bottom edge** | a modal |

**Why a settings screen stops being a sheet, and it is the second-biggest
change here.** Four reasons and none of them is taste:

- The row that opens it draws a **`›` chevron**, which promises a push, and
  delivers a peek. The affordance has been lying since it was built.
- A sheet with its own inner scroller, inside a page that also scrolls, is
  **two scrollers**. *Services & add-ons* is four lists inside one of them.
- It is a 640px floating box **at every width today**, including the desk.
- **Step 4 already moved this direction at the desk** — §10: *"the selected
  settings screen, rendered in place — the eleven stop being 640px modals."*
  The phone is not being given a new idea; it is being given the same one.

`dashboard-skeletons.md` §3's reasoning survives untouched: it allows the
twelve to share one skeleton because *"they are modal panels reached one at a
time… Law 1 governs what is on screen at once."* **Reached one at a time is
still true of a page.** Only the container changes; two are still never on
screen together.

### 2c. What does not change, and why that is a decision

- **The five tabs and their order.** Derived, defended and approved
  (`dashboard-architecture-2026-08-31.md` §3a/§3b); re-deriving them wastes
  your time, which the roadmap says in as many words.
- **The floating pill at the bottom.** `theme.css:525` says why it exists — it
  is *"what stops the dashboard reading as a default mobile app shell"*. It is
  thumb-reachable, it is the product's own shape rather than the platform
  default, and it costs 8% of an 844px screen. **Kept on its merits, not
  inherited.**
- **It does not hide on scroll.** A navigation that disappears to buy 68px
  costs discoverability every time it is not there.
- **The 320 floor's own layout stays exactly as `theme.css` has it**: paired
  fields stack, a setting puts its control under its words, a segmented control
  goes full-width and wraps, the palette is 4x3. Every decision below is
  checked against it.

### 2d. One duplicate is deleted everywhere

The top bar prints the screen's name on its right — measured: `"Coastline Auto
Detailing" + "Today"`. **So the screen is named three times**: the lit tab, the
top bar, and the screen's own masthead. **The top bar's copy goes.** Its right
side is where the approved header puts the `+` and the gear, and step 4 §1g
already caught the same family of error (*a screen titled "Settings" under a
tab labelled "More"*).

---

## 3. Today

**The screen he opens forty times a day**, and the one this file changes most.

**What it is for** has not moved and it is the test everything below is
measured against: *standing in a driveway, one hand, sun on the screen — what
am I doing now, what is left, did I get paid.*

### The two things wrong with it, measured

| | |
|---|---|
| **Five identical 289px cards** | 1,522px of cards and gaps for a five-job day |
| Document **2,500px** in a 737px band | **3.4 screens** for one day's work, and **one whole job visible of five** |

### 3a. The masthead and the strip become one line

Today: a 30px date, a subtitle, and a **112px** sunken two-cell panel — three
blocks before any work.

**Redrawn:** the date stays, and the panel becomes **one row of three bare
figures on the ground**, hairline-separated, no container, in the figure face
at ~28px so it is readable at arm's length in daylight — which is what the
panel was actually for.

```
Tuesday, September 1
Afternoon · 3 of 5 still to do
─────────────────────────────────────────
   5 jobs   │   2 done   │   $455 expected
─────────────────────────────────────────
```

- **~56px instead of 112px**, so the first job moves **318 → ~262px**. That is
  56px and no more, because **the masthead is not cut** — it is the type
  contrast that keeps these screens off the default-app-shell shape, and
  cutting it would be a move toward the generic, not away.
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
sections"*). It is also 1,522px of screen for a day you could read in 600.

**Redrawn:**

| Run | Form |
|---|---|
| **Needs payment** — the lit one, first | **the card**, full, with its actions: Navigate · Call · Text, and Finalize payment |
| **Still to do** | **rows** — one line each |
| **Done** | **settled rows**, as step 4 already has them |

**A row is two lines at 392** — the same NN/g ceiling History and Clients use,
and a comparable row measures **71px** today (`.row-item` on Clients):

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

**What it costs, projected from the measured parts.** One card (289) + four
rows (71) + gaps (12) = **~633px against 1,522, a saving of ~890.** With §3a's
56 and §3c's ~289, **the document goes 2,500 → ~1,265px: 3.4 screens → 1.7.**
**The number that matters is not the total but what sits above the tab bar at
785px: the lit card and three rows, against one card and a sliver of a
second.** These are projections from measured parts, not measurements — the
requirement step 6 has to hit is in §21 and it is deliberately looser.

### 3c. Tomorrow is one line

Today it is **two 172px cards**. A phone in a driveway does not need tomorrow's
detail; it needs to know tomorrow exists and to be able to look.

```
 Tomorrow · 4 jobs, first at 8:00 AM                    ›
```

One row, opens tomorrow's day. **Saves ~289px.** At ≥1180 Tomorrow keeps the
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

### 3e. States

Step 4 §2 in full. **Empty:** the masthead, and then one thing — tomorrow if
tomorrow has work, otherwise one sentence and **your booking link**, because a
detailer with no bookings needs the thing that gets them. No ledger row (a row
of zeroes states nothing), no dashed box, no empty rail.

### 3f. The 320 floor

The row form is what makes 320 comfortable rather than survivable: two lines,
time and figure at the ends, name and service under. The lit card is unchanged
at 320 and already passes the sweep.

---

## 4. The job record

**26 of the product's 126 capabilities in one object**, and step 4 redrew it as
*an action bar over named sections*. **The shape is right and is not re-opened.**
What is decided here is its container and its behaviour on a phone.

- **A sheet, and confirmed on merits** — a record is a thing you pull up over
  the list you found it in, and dismiss back to where you were. The grab handle
  is a thumb gesture and the list stays behind it. This is the one place the
  sheet is exactly right.
- **The action bar is the first thing under the header and it does not scroll
  away.** Step 4 put it first because *"that is the only thing you need while
  you are standing there"*. On a phone that argument is stronger, not weaker:
  it is **pinned**.
- **The two rows of three are measured and stand**: 89px per button at 320,
  *Reminder* fits at 59px of text, and the ceiling is a label of about nine
  characters. Step 4 §3 took those numbers; nothing here moves them.
- **Photos (row 126, designed not built)**: two slots side by side.

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

- **The cell is 51px** ((392−36)/7) and carries a date numeral and up to three
  marks. That is the ceiling and it is honest. **The words the desk's 163px
  cell gets are a desk feature**, exactly as step 4 says.
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
- **It removes a full-height sheet with an inner scroller** from a screen whose
  own content is the thing you want to keep looking at.
- `.cal-cell.selected` already exists in `theme.css:816` and is dead CSS. This
  is what revives it, at both widths rather than one.

---

## 6. The day

- **The three state cards** — *Block this day* · *Hours just for this day* ·
  *How this day works* — each showing the day's current state and opening its
  editor when tapped anywhere. **This is your own instruction from walkthrough
  W1** (*"you should be able to click anywhere in that box to open it up"*) and
  it is confirmed, not inherited. Clearing a block stays on its own explicit
  control, because a 300px target that silently unblocks a day is worse than
  the bug W1 was about.
- **The three stack, full width**, under the day's jobs.
- **Jobs in the day panel are rows**, same form as §3b. The panel is not the
  place a job is a card; the job record is.
- Staff see the jobs and not the state cards, as step 4 has it.

---

## 7. Calendar · History

**A ruled list with columns is right and is confirmed** — it is a list of
events with a time axis, and the month rules that break it are the only
navigation 400 rows need.

- **Two columns**, five at desktop (step 4). Which two, decided here: **line 1
  is `who` and `the total`; line 2 is `date · what`, with the status mark at
  the left of line 1.** The name is what you are scanning for and the figure is
  what you came to check.
- **The filter bar is the phone problem, and it is not the list.** Nine chips,
  a search field and a date range is three rows of chrome before a single
  result. **The nine chips collapse behind one control — `Filter` — and an
  active filter shows as one removable pill.** The search field stays visible,
  because on a phone *find a past job* is a search, and filters are the
  second-order tool. At ≥1180 the chips live in the right column exactly as
  step 4 put them.
- **Empty, filtered** says which filter is doing it and offers to drop it —
  step 4's rule, and with the chips collapsed it is the only way the screen can
  be honest about why it is empty. **This is the one place the collapse costs
  something, and the empty state is what pays it back.**

---

## 8. Money

- **The period control.** Step 4 says *"it goes on one line"*. **Measured: it
  cannot, on a phone.** The five chips are 388px of content in a 356px column
  and already wrap **4 + 1**, orphaning "Lifetime". **Decided: they are a
  segmented control and they follow the 320 floor rule that already exists** —
  full-width and wrapping, **3 + 2**, which is a deliberate shape rather than
  an orphan. The stepper and the period label share the row below. Step 4's
  one-line target is a desk target and is met there.
- **The chart.** Measured **64px tall**. Step 4 adds the zero line, and a
  signed chart needs room on both sides of it — a −$114 bar that is 30px tall
  says nothing. **The chart is 120px with the zero line at 60% of its height**,
  because losses are rarer and shallower than wins; a −$114 against a +$455
  must be visibly below the line without giving half the chart to the half that
  is usually empty.
- **The two questions stack in order** — *what did I make*, then *who owes me
  and what went out* — and split into the two columns step 4 specified at
  ≥1180. Confirmed: the order is the order you ask them in.
- **The export** — *"Send this month to my accountant"* — is a full-width
  action beside the period label. It uses the period already chosen, so it
  needs no control of its own.
- **The expenses cap is stated**: 12 rows then *"+9 more this month"*, which
  expands. Silent truncation reads as a complete list.

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

- **Staff see visits where the owner sees spend** — step 4's rule, same slot.
- **The sort control** — *Recent · Most spent · Longest away* — is a segmented
  control of three, full width at 392, wrapping at the 320 floor by the rule
  that already exists. **Absent below three rows**, because a control that
  cannot change anything is noise.
- **One chip: `Not seen in 3 months`**, and when it is on the list header
  offers *"Text these 12"*.
- **The 200-row cap is stated**: *"Showing the 200 most recent — search for
  anyone older."*
- **229px of chrome before the first row is 27% of an 844px screen, and it is
  accepted.** The masthead is the type contrast that keeps this screen from
  reading as a default list app, and the search field is the screen's purpose.
  Three rows are visible under it, which is what a lookup needs.

---

## 10. The client record

- **A sheet**, and confirmed — it is a record, opened from the row it belongs
  to, dismissed back to it.
- **Bare ruled rows on the ground, no container** — law 1's entry for Clients
  is *the only screen with no panel on it*, and a card around the record would
  end that. Confirmed.
- **It leads with two bare figures** — visits and lifetime spend — side by side
  at 392. Then last visit, then the note, then the history.
- **Two copy defects go** (step 4, Part B row 18): the phone number printed
  twice, and every history row repeating the client's own name. In the record a
  history row is **date · what · total**.
- **The history caps at 50, stated.**

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

---

## 12. The settings screens (twelve)

**One skeleton, twelve screens** — a form: a row per setting, control right, a
plain sentence underneath saying what it does. Unchanged and right: *a label
alone tells you the name of a setting, not its consequence.*

**What changes is the container, and it changes for all twelve** — §2b: **a
page you go into and come back from, not a floating box.**

- **Full width, a back control at the top left, the screen's name beside it.
  One scroller, not two.**
- **The rows keep the 320 floor rules that already exist**: paired fields
  stack, a setting puts its control under its words, a segmented control goes
  full-width and wraps, the palette is 4x3.
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
with a keyboard up. **A phone keyboard takes about 300px of an 844px screen**,
so a form whose primary action sits at the end of the fields can put it out of
reach at exactly the moment it is needed. That is the classic phone failure and
it costs the product its single most important action.

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

**The phone decision: a step names the thing, never its position.** *"Your five
destinations"*, not *"the bar at the bottom"* — because at 1024px and above the
tab bar becomes the rail on the left edge (desktop spec §6a) and every step
that named a position would be wrong there. The spotlight is what shows where
it is.

---

## 16. The way in — sign in, create a business, accept an invitation

**One shape: a single centred card on the ground.** This is where the design
system's *"centred exactly once"* is spent, and it is spent here because these
are the only screens in the product with exactly one thing on them. Confirmed.

**One rule it needs, and it is general rather than about any one size:**

> **A card that is centred must stop being centred the moment it is taller than
> the screen** — below that it is top-aligned with normal page scrolling and
> its own vertical padding.

Centring a box taller than its container clips it at **both** ends, and the
first thing lost at the bottom is the error message's own remedy. **Measured:
the sign-in card is 355px with no error and 399px with one** — a 44px error
line — so at the 320 floor, on a short phone, or with two lines of error, the
card can outgrow its window and take *Create an account* off the screen with
it. One rule, all three screens.

Also kept in view: **signing out must clear the previous tenant's accent**, or
the last detailer's colour stays on the sign-in screen. A defect that already
happened once, fixed in 2.3.

---

## 17. What this file changes in the files that outrank it

CLAUDE.md's rule: *if a test and a real design decision collide, the system file
gets updated first, never silently.* **Three changes, all landing at step 6.**

**1. `docs/dashboard-screen-designs-2026-08-31.md` §1d — a third container.**
That table has *a record* and *a form you commit*. **A settings screen is
neither**: it is a place you go, and on a phone it is a page, not a sheet. §2b.
Desktop behaviour is unchanged — both still become the right column.

**2. The same file, §4 and §5 — the day panel is inline at every width.** Step
4 gave the phone a sheet and the desk an inline panel. **One component, inline
at both.** §5a.

**3. `app/src/theme.css` — the `min-width: 700px` and `min-width: 560px` rules
gain `and (min-height: 500px)`.** This is the owner's portrait ruling made
real: they are the two places the dashboard currently re-lays-out when a phone
is rotated. §2a.

**Nothing else moves.** No token, no face, no motion preset, no accessibility
floor, no never-default, no tab, no colour meaning, and **no change to
`docs/dashboard-desktop-spec-2026-08-31.md`** — an earlier draft of this file
widened its `--bp-rail` condition to short screens, and the owner's ruling
withdrew that.

---

## 18. What this file does not do

- **It does not build anything.** Every measurement is from the running app;
  every design is on paper.
- **It does not design a landscape layout** — §20, and that is the owner's
  ruling rather than an omission.
- **It does not re-open the tab bar, the visual world, the desktop breakpoints
  or step 4's screen designs.** It decides phone *form*, and where it touches
  step 4 it says so in §17.
- **It does not name components.** Step 5's inventory is unaffected except
  where §17 names a container change; the shapes are the same shapes.
- **It does not measure a real device.** Everything is a headless browser at a
  set viewport. A real phone has a notch, a home indicator, a URL bar that
  comes and goes, and a keyboard — and `100dvh` behaves differently under all
  four. **The pinned action in §13 is the one that most needs a real thumb on
  it.** Named as the known gap, since mid-range Android is already on
  `DESIGN.md`'s open list.

---

## 19. The check

**`sweep-widths.mjs` is unchanged and stays portrait: 1920, 1440, 392, 360,
320.** An earlier draft of this file added 844 (phone landscape) to the default
and gave the script a `short-screen` check to go with it. **The owner's ruling
removed the reason for both**, so both were taken back out rather than left
dormant — a check nothing ever triggers is a check that rots.

**What that leaves, said plainly so it is not rediscovered as news:** every
check the script owns — `past-viewport`, `past-parent`, `self-clipped`,
`touching`, `dead-width` — asks a question about the **right-hand edge**. It
cannot see a bottom-edge failure at any size. That has always been true.
`sweep-booking-steps.mjs` is the script that asks the bottom-edge question, and
it asks it only of the booking page.

---

## 20. Landscape — measured, then ruled out by the owner

**Kept because the measurements are real and the decision is his**, and because
without this section somebody re-measures all of it in six months and files it
as a discovery. **This is a record, not a plan.**

**What he asked for in the morning of 2026-08-31**, answering the step 6
approval page: *"if you shrink a page or you'll not full screen it or goes to
landscape. It should be able to modify and move around and not losing the
information."* That put landscape in scope, and it was measured.

**What was measured, at 844 x 390 on the seeded demo:**

| | |
|---|---|
| Today, five jobs | **2,480px in a 274px band — 9.05 screens** |
| The tab bar | **covers the first job** |
| Calendar | grid top y=200, row pitch 93px, tab bar at y=322 → **1.3 of 5 weeks visible** |
| Clients | first row y=229 → **1.3 of 8 rows visible** |
| The job record sheet | 265px of 694px — **38% visible** |
| Business info sheet | 276px of 1,365px — **20% visible**; one text field **549px wide** |
| Sign in, with an error | card **399px in 390px** — bottom edge 25px off-screen |
| The chrome | 116px of 390 — **30% of the screen is navigation** |
| `sweep-widths.mjs 844` | **clean on all 18 screens** |

**What he ruled the same day**, and it supersedes the morning:

> *"Let's not have a horizontal phone setup, only portrait. Because yeah, no
> need and will only be making things harder."*
> *"I'm just seeing the landscape from film because I don't want the detailer
> that actually rotates the phone, then the whole screen rotates and it's kind
> of annoying… for the phone version, it should always just stay portrait. Now
> obviously on the desktop, it'll give you whatever the size of the desktop is
> … but when someone flips their phone over sideways, I don't want it to
> completely readjust."*

**The second quote is the more precise one and it is what §2a implements.** He
is not asking for landscape to be ignored — he is asking for it to **change
nothing**, and the reason is a real one: a dashboard that becomes a different
dashboard in your hand is worse than one that is merely narrow.

**What survived the ruling, and it is the useful part:** the measurements above
are the *evidence* that the app readjusts on rotation today, which is what
makes §2a a fix rather than a preference. **What was withdrawn:** a rail on the
left edge for short screens, two-column pairing sideways, full-bleed sheets
sideways, a shorter calendar cell sideways, `844` in the sweep's default sizes,
and the `short-screen` check.

**What reopens it:** he would have to ask. **Do not re-derive this.**

---

## 21. The measurements step 6 has to be able to take on this file

Step 4 §17 lists its own; these are step 4b's. All at **392 x 844** unless
stated.

| Check | Today | Required |
|---|---|---|
| Today, five jobs | **2,500px, 3.4 screens** | **≤ 2.2 screens** (projected 1.7) |
| Today, cards on a five-job day | **5 identical 289px cards** | **1 card, 4 rows** |
| Today, whole jobs visible above the tab bar (y=785) | **1 of 5** | **the lit card plus 3 rows** |
| Today, top of the first job | **318px** | **≤ 270px** |
| Clients row content | name / phone · **email** | name · **spend** / **last visit** · phone |
| A settings screen | a full-height sheet with an inner scroller | **a page, one scroller, a back control** |
| The day panel | a sheet | **inline under the grid** |
| Money period chips | **two rows, 4 + 1** | **two rows, 3 + 2** |
| The Money chart | **64px, no zero line** | **120px, zero line at 60%** |
| The screen's name on the top bar | printed, and it is the third copy | **gone**; `+` and gear in its place |
| A committing form with the keyboard up | primary action scrolls with the fields | **pinned to the bottom edge** |
| Sign in with an error, in any window shorter than the card | card centred and clipped at both ends | **top-aligned and fully reachable** |
| **Rotating the phone (392x844 → 844x390)** | **the sheet becomes a centred floating panel, the day row reorders, the column recentres** | **nothing changes but the width of the ground either side** |
