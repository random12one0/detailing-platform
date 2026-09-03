# Every component the dashboard needs — 2026-08-31 (roadmap 2.11, step 5)

**Nothing here is built.** Step 6 is where you approve the whole
specification, and only then does code start.

This is the bookkeeping pass over what step 4 named. Step 4 designed eighteen
screens in *shapes and behaviour* and said out loud that it does not name
components. This file names them: **which exist, which are new, which die** —
and it rules the three things step 4 deliberately left open.

It is not a design round. No skill ran against it. Every judgment below is
either a reading of step 4's own file or a measurement taken from the source
in `app/src`, and where the two disagree, this file says so rather than
picking quietly.

---

## 0a. The whole thing on one page

**Nothing new is being invented.** The rebuild needs **twelve new files** and
kills **one**. Sixty-one source files become seventy-two. Everything else is
either untouched or is a rewrite of something already there.

**The three things step 4 left, ruled:**

1. **History's rows and Clients' rows are ONE shape, not two components.**
   What they share — the hairlines, the tap height, the hover nudge, the
   two-columns-on-a-phone rule — is CSS that already exists and gets one
   addition. What differs is *which words go in the cells*, and that is each
   screen's own markup. **No new component, and no new "table" in the
   vocabulary.** A table was the obvious thing to add and it is refused: this
   is the ruled list you already have, widening.
2. **The setup form's progress bar is seven small segments, and a segment
   fills in only when a step is actually finished.** Skipping a step leaves a
   hole. That is on purpose — the hole is how you find the thing you skipped,
   and it makes the bar and the *"3 of 7 done"* row on Business the same
   number instead of two numbers that disagree.
3. **The walkthrough's spotlight is one element with a very large shadow.**
   That is the whole trick: a shape cut out of a dim sheet over the real
   screen. No pictures, no second copy of the dashboard, nothing to keep in
   sync.

**And one thing settled that has been open since roadmap 2.10.** The automatic
test that is supposed to catch "a long list drawn as a stack of cards" cannot
see it when the cards come from a shared component — which is exactly how it
missed History's eighteen. **§1a says what a list is and what a card is,
once**, and the last part of §1a is the rule the test gets rewritten to.

**Three things found by counting rather than by designing** — which is what
this step is for:

- **`--wrap` does not exist in the dashboard's stylesheet.** The desktop
  specification names its own breakpoint after it (1180px). It is defined in
  `landing.css`, scoped to `.ld`, and `theme.css` has never had it. §3e.
- **`.badge` is dead** — seven rules in `theme.css`, zero users, and a
  byte-for-byte duplicate of `.pill`. It goes, and **`accent-sweep.mjs` loses
  no coverage at all** — it never had a `.badge` row; it has one row that names
  both. §3e.
- **Two counts in step 4's own file are off by one and are corrected here:**
  there are **thirteen** settings screens, not twelve, and the desktop
  specification's *"all eleven"* is the same slip one step earlier. §3f.

---

## 1. The three rulings

### 1a. History and Clients — one shape, two callers, no new component

**The question, from step 4 §17:** History and Clients both want a ruled list
whose rows carry columns. Is that one component with two configurations, or
two components? And 2.10's declined decision 7 rides on the same answer.

**The ruling, in three parts.**

**(i) The vocabulary gains nothing. This is the ruled list, widening.**
Bucket 2 of roadmap 2.11 permits exactly one addition, *"at step 5,
deliberately and once"*, and the desktop specification §9 nominated a
**table**. It is refused. A table would be a new container with its own edges,
its own header row and its own rules about what a cell is; what these two
screens actually need is the hairline, the row rhythm and the tap height
`.rows` / `.row-item` already have, with the row's *interior* going from one
stacked pair to N columns above 1024. Nothing about the container changes.
Calling that a table would put a second enumeration shape into a system whose
first law is that two things sharing a skeleton is the failure.

> **The composition vocabulary stays seven: lit card, quiet card, ruled list,
> receipt, rail, bare figures, sunken panel.** Bucket 2's one permitted
> addition is spent on nothing, deliberately, and that is the whole of this
> line.

**(ii) The chassis is CSS, not a React component.** `.rows` / `.row-item`
gains a column mode. One block in `theme.css`, one place, where a later
session sees both screens' column templates next to each other:

```
.rows.cols .row-item     grid, not flex
                         < 1024   two cells: (name / total) over
                                  (date / detail) — NN/g's ceiling, F12
                         >= 1024  grid-template-columns, per screen
.rows.cols.clients       4 columns: name · last visit · spend · phone
.rows.cols.history       5 columns: date · who · what · mark · total
```

**Why CSS and not a `<ListRow columns={…}>`:** a component that takes a column
list is a generic table primitive, and a generic table primitive is the thing
a future screen drops in without thinking — which is the eighth screen
inventing a fourth kind of list, arriving through the front door. Two column
templates sitting three lines apart in one stylesheet is boring, is readable
by a session that has never seen either screen, and cannot be imported.

**(iii) Each screen writes its own row markup.** History's row carries a
status mark (the existing `.dot` vocabulary from `dashboard-skeletons.md` §5b,
dropped into a cell — not a new mark) and lives under a month rule. Clients'
row carries no mark, no date axis and no rule. Those are eight lines of JSX
each and they are genuinely different content; sharing them would mean a prop
that switches half the row off.

**What this means for `composition.test.mjs` test 1 — and it settles 2.10's
declined decision 7.**

The test's blindness is precise: it matches a `.map(…)` whose callback
contains a `className` with `card` **in the same file**, and `BookingCard.jsx`
is on a global ALLOWED list. So `Calendar.jsx` maps eighteen bookings onto
`<BookingCard>` and passes. The rule the test should enforce, now that a list
is defined:

> **An unbounded `.map(…)` may not render a component whose own file draws a
> `.card` at its root, unless that (file, component) pair is on the allowed
> list with a stated reason.**

Two changes, and the second is the one that matters:

1. The test resolves components — it collects the components whose own file
   renders a `.card`, then looks for those component names inside `.map(…)`
   callbacks anywhere in `app/src`. That is what makes it able to see the
   failure it exists to catch.
2. **The allowed list is keyed to `file > component`, not to component.**
   `Today.jsx > BookingCard` and `DaySheet.jsx > BookingCard` are allowed with
   reasons — a small set of jobs you act on one at a time, each carrying its
   own buttons. `Calendar.jsx > BookingCard` is not, and neither is
   `Clients.jsx > BookingCard`. A component-level allowance is what made the
   rule optional for everybody; rewriting it per-component and not per-caller
   would leave the hole exactly where it is.

**The test is written when the code lands (step 6), not now.** What is settled
now is what it must assert.

### 1b. The stepped setup form's progress rule

> **BUILT 2026-09-02, roadmap 2.11 step 6 stage 7 — `.progress-rule` in
> `theme.css`, drawn by `components/SetupForm.jsx`. Two corrections below,
> both from measuring rather than from taste.**
>
> **THE CEILING WAS PESSIMISTIC.** This section derives ~31px a segment at 320
> from 244px of usable width. The real figure is **284px and 37.14px a
> segment** — the form's own container gives more back than the arithmetic
> here assumed. The ≥28px check in §6 passes with room.
>
> **AND THE RULE GREW A HALF NOBODY WROTE DOWN: completion is DERIVED where
> the database can answer it.** The reasoning below is exactly right that
> filled must mean COMPLETED so the bar and Business's row cannot disagree.
> What it does not say is that five of the seven steps are facts the schema
> already holds — a business with three services has finished the services
> step whether or not it ever opened this form, and **every business that
> existed before this change is in that position.** So `setupProgress()` asks
> the data first and the stored list carries only what nothing else can. One
> step (*where you work*) can never be derived, because `mobile_enabled` and
> `dropoff_enabled` both default to true and "I do both" is indistinguishable
> from "nobody has been asked".

**The one new mark in the product**, used on one screen, and it is a mark
rather than a container — so §1a's refusal of a new vocabulary item stands
alongside it. `.bars` is Money's own furniture and is not in the vocabulary
either; this is the same kind of thing.

**What it is:** seven segments of a 2px rule across the top of the form.
`--hairline` track, `--accent` fill, small rounding, `--sp-1` gaps. Under it,
in the `.label` face: **`STEP 3 OF 7 · YOUR SERVICES`**.

**The rule that makes it worth specifying — a segment fills in when a step is
COMPLETED, never when it is passed.**

Step 4 §13a made setup *skippable at any point*, on the owner's own words, and
it made Business carry a row reading *"Finish setting up · 3 of 7 done"*.
Those two facts collide if the bar paints position: a detailer who taps *"I'll
do this later"* seven times would watch the bar fill to the end and then find
Business telling them nothing is done. **One number, in both places, and it
counts finished steps.** Where you currently are is said in words underneath,
not by the fill.

**A skipped step is a hole in the bar, and the hole is the feature.** Segments
rather than one continuous fill exist for exactly this: a gap at position two
with position three full is a legible instruction to go back. A continuous bar
cannot express it.

**No colour carries meaning here** — filled and empty differ in fill, not in
hue, so this adds nothing to the 1.4.1 surface. The current step is named in
words, which is the accessible form of "you are here".

**The ceiling, stated so nobody has to re-derive it:** at 320px the form has
244px of usable width, so seven segments plus six 4px gaps put a segment at
**~31px**. Past about **ten steps** the segments stop being readable as
separate things and the count in words is doing all the work — which is the
condition that would make this a plain *"3 of 7"* with no rule at all.

**Motion:** the fill transitions on `--t-hover`, the existing token. `.lite`
already kills every transition in the app (`theme.css` § DEGRADATION), so
reduced motion needs no new rule.

**The setup form itself is one column at every width** (§13a), so it needs
nothing from the desktop split and nothing from `RecordHost`.

### 1c. The walkthrough's spotlight

> **BUILT 2026-09-02, roadmap 2.11 step 6 stage 7 — `components/Walkthrough.jsx`
> and `.tourblock` / `.spotlight` / `.tourcard` in `theme.css`. The mechanic
> below is exactly what shipped, including the 9999px shadow and `--overlay`,
> the product's existing dim, rather than a new `color-mix`. Four corrections.**
>
> **RULE 5 HAS A THIRD CASE, and it is the day rail.** "Under the hole if it
> fits, above it otherwise, two branches, no third case" leaves nowhere for a
> caption when the hole is most of the screen: at 392x844 `.dayrail` is a
> **665px** hole with 98px above and 80px below, and the card is 130px.
> Clamping to the top covers the first job, which is what the sentence is
> about. The third branch pins the card to the bottom edge.
>
> **RULE 3 RUNS THE TOUR CORRECTLY AND CANNOT COUNT IT.** Skipping an absent
> target as it is reached is right; discovering the absences one at a time is
> not, because the card says "N of 7" from the first step. Measured on a staff
> login: four steps delivered against seven promised, since Money, Business
> and the booking link are all gone for that role. **The plan is resolved once
> before the first step is drawn** — a step that names a TAB is available when
> that tab's own button exists (so `App.jsx`'s role filter does the work for
> free), and a step that names nothing is available when its target is on the
> screen the tour starts on. Owner with jobs: 7. Empty dashboard: 6. Staff: 4.
>
> **RULE 6 NEEDED A FOCUS TRAP, and rule 1 turns out to depend on it.** A
> backdrop stops a POINTER and stops nothing else: `Tab` walked into the
> dashboard behind the dim and `Enter` pressed the very control the caption
> was pointing at, which is the outcome rule 1 exists to prevent — and
> `aria-modal="true"` was telling a screen reader the opposite. It is
> `Sheet.jsx`'s own fix, not a second one. **Two React defects had to be
> fixed before it worked, and both are invisible in the stylesheet**: the
> effect depended on `onClose`, an inline arrow that is a new identity every
> render, so its cleanup re-ran constantly and yanked focus back out; and the
> caption is `visibility: hidden` until it has been placed, and a hidden
> element cannot take focus, so the "focus moves to the caption card" call
> did nothing at all. Both found with a real `Tab` walk, which is the only
> place either is visible.
>
> **THE FIRST STEP NAMES ITS TAB.** The tour is re-runnable from the gear, and
> the gear TAKES THE MAIN AREA — so a tour started from there had no Today on
> the page and silently skipped its own first step. Saying which screen it
> starts on makes it deterministic from wherever it was asked for.

**The only overlay in the product that is not a sheet**, and the laziest
mechanic that actually works is one element:

```
.spotlight  position: fixed; pointer-events: none;
            border-radius: var(--r-panel);
            box-shadow: 0 0 0 9999px color-mix(in srgb, var(--ink-0) 74%, transparent);
            transition: all var(--t-hover) var(--e-out);
```

A very large spread shadow dims everything **outside** the element's box, so
the box is the hole. One element, one `getBoundingClientRect()`, no mask, no
`clip-path` arithmetic, no canvas, no second copy of the screen. It is placed
over the target plus ~8px, and it never touches the target's own styles —
which matters, because the walkthrough runs over the **live** dashboard with
the detailer's real data and must not restyle a single thing it points at.

**Six rules that come with it, each because the obvious version gets it
wrong:**

1. **The lit element is not clickable.** A backdrop above the page catches
   every pointer event; you advance with the walkthrough's own *Next*. The
   alternative — letting the real `+` be tapped while a caption points at it —
   opens New booking in the middle of a tour, and there is no good answer for
   what the tour does then.
2. **Targets are named by a stable attribute** (`data-tour="new-booking"`),
   never by position or selector shape. §13b requires the walkthrough be
   re-checked at ≥1180 where its targets have moved into a second column; a
   live-measured rect follows them for free, and an attribute is what makes
   the step list survive the move.
3. **A step whose target is not on the page is skipped, silently.** This is
   not a nicety: the walkthrough is designed for a **brand-new** dashboard,
   and step 4's own step list includes *"a job"* — which a first-run detailer
   does not have. The tour is six steps that day and seven later, and both are
   correct. **It must be verified against the EMPTY dashboard, not the seeded
   demo**, which is the opposite of every other screen in this rebuild.
4. **Scroll the target into view first** (`scrollIntoView({ block: "center" })`)
   and then measure, then lock the body — reusing `Sheet.jsx`'s existing
   body-overflow lock, so nothing scrolls underneath a hole that has stopped
   moving. Recompute on `resize` only.
5. **One sentence, placed on whichever side has room** — below the hole if the
   caption fits between it and the bottom of the viewport, above it otherwise.
   Two branches, no third case.
6. **`Escape`, a visible *Skip the tour*, and it never returns on its own.**
   Re-runnable from the gear. `role="dialog"`, focus moves to the caption
   card, the sentence is an `aria-live` region so a screen reader hears each
   step.

`.lite` covers the motion, as above.

---

## 2. The one rule that reorganises the most code

> **A record renders its content. Its container is the caller's.**

This is not a new idea — it is the mechanical consequence of the desktop
specification's §4a, which step 4 restated as §1d: above 1180px a record opens
**beside** its list, and below it, as a sheet. Today **eleven `<Sheet>` call sites across ten files render their own
container**, and four of them are records that are about to stop being able
to.

| Component | Renders its own Sheet today | After |
|---|---|---|
| `BookingDetail` (the job record) | yes | **no** — the caller hosts it |
| `Clients`' client sheet → ~~`ClientRecord`~~ | yes | **DONE 2026-09-02, stage 5 — and NO `ClientRecord.jsx` was created; see §3c** |
| `DaySheet` (the day) | yes | **no** — a sheet below 1180, an inline panel under the grid above it (step 4 §5) |
| `More`'s settings host → `Business` | yes | **no** — a sheet below 1180, the right column above it |
| `ExpenseModal` · `FinalizeModal` · `NewBookingModal` · `TimezoneChangeGuard` | yes | **yes, unchanged** — forms you commit are modals at every width |
| `BookingDetail`'s text-template picker · `Catalog`'s editor · `BookingRules`' editor | yes | **yes, unchanged** — same reason |

**`Sheet.jsx` itself does not change.** It is a good component and its
behaviour is the best interaction in the product. What changes is that four
things stop *being* a sheet and start being *hosted in* one.

**One small component carries it: `RecordHost`.** Six call sites would
otherwise each write their own width check, and six copies of a width check is
how the 320 floor got fixed on one screen and not its neighbour twice already.

```
<RecordHost open={…} onClose={…} title={…}>{ the record }</RecordHost>
   < 1180   <Sheet …>{children}</Sheet>
  >= 1180   <aside className="col-2">…{children}</aside>
```

`hooks/useWide.js` is the six lines of `matchMedia` underneath it, exported
separately because Calendar's day panel needs the width and does **not** want
`RecordHost` — its panel goes under the grid, not beside it.

**And the split itself is CSS, not a component.** Five screens want five
different ratios (1.7/1, 1.7/1, 1.2/1, 1.4/1, 1/1.9), which is one class and
one custom property:

```
.split { display: grid; gap: var(--sp-4); }
@media (min-width: 1180px) {
  .split { grid-template-columns: var(--split, 1.7fr) 1fr; }
  .split > .col-2 { position: sticky; top: calc(…); align-self: start; }
}
```

The page scrolls; a column never does. That is the desktop specification's own
line and it survives here unchanged.

---

## 3. The inventory

### 3a. Kept, untouched — 16

`ErrorBoundary` · `ExpenseModal` · `FinalizeModal` · `Sheet` (**13 `<Sheet` sites across 12 files as of 2026-09-02 — counted, not remembered. `More.jsx`’s went with it; the twelve settings screens are pages or columns now, and the sheets that remain are forms you commit, records below `--wrap`, and the editors INSIDE two settings screens**) ·
`TimezoneChangeGuard` · `TimezonePicker` · `controls.jsx` (all eight exports:
`Setting`, `Switch`, `Segmented`, `DurationChoice`, `Stepper`, `MoneyField`,
`HourChoice`, `Group`) · `Auth` · `AcceptInvite` · `CreateBusiness` ·
`Gallery` · `Hours` · `MessageTemplates` · `Preferences` · `Promos` · `Team`.

Two notes, because both look like defects and are not:

- **`HourChoice` renders a `<select>` with 24 options** and stays. Test 2 bans
  a hand-written `<select>` with **two to four**; twenty-four hours is a list,
  not a choice between a handful, and the segmented rule was never about it.
- **`Hours` is the best settings screen in the product** (step 4 §11) and this
  file changes nothing about it, including at 320 where its `.day > .times`
  stacking is one of the five measured rules in `theme.css` § THE 320 FLOOR.

### 3b. Kept, rewritten — 15

| Component | What changes | From |
|---|---|---|
| `App.jsx` | **BUILT — the rail and `--wrap` in stage 1, the gear and the fifth tab’s NAME in stage 6 (2026-09-02).** The gear is a destination beside `tab`, not an overlay, so closing it returns you to the screen you were on. Staff lose Business as well as Money — **three rail buttons, not the four §10 counts** (see the screen designs’ §10-12 shipped block). | Part A; desktop spec §6a |
| `Today.jsx` | **One** rail, not three. Three runs — *Needs payment · Still to do · Done*. The request slot above it, empty. No warn box, no bottom button. Right column at ≥1180. | §2 |
| `BookingDetail.jsx` | **BUILT — stage 2, 2026-09-01.** The job record: an **action bar over named sections**, replacing one 340-line scroll. Two rows of three — Call · Text · Navigate, then Calendar · Contacts · Reminder — **pinned** (`.jobbar`, sticky). Stopped rendering its own Sheet in stage 1. **Five sections on the screen, not six: Photos is designed and not built, and an absent thing draws nothing.** | §3 |
| `Calendar.jsx` | **BUILT — stage 3, 2026-09-01; the desk day panel CORRECTED in stage 4 on the owner's instruction — it opens BESIDE the month at ≥1180, in a fixed 420px column, and the cells fall back to marks while the grid is under 1,024px wide.** Month: cells carry job lines at ≥1180, `1 job` not `1 jobs`, a legend that lists only what is on the month shown, `.cal-cell.selected` revived, the day opening **inline under the grid at every width**. History: the ruled list with columns, month rules, the 1.7/1 split, and the nine chips behind one *Filter* below `--wrap`. Its *New booking* button and its own `<Sheet>` are gone. | §4, §6 |
| `DaySheet.jsx` | **BUILT — stage 3, 2026-09-01.** Takes an `inline` prop rather than always being a sheet: the calendar draws it under the grid on a phone and **in the second column at ≥1180 (stage 4, the owner's ask)**, Today's *Tomorrow* row still opens it as a sheet (there is no grid behind that one to cover). **Not RecordHost** — a day is not a record and never opens beside its list. The three state cards keep expand-in-place at **both** widths, and its JOBS became rows. | §5 |
| `Money.jsx` | **BUILT — stage 4, 2026-09-01.** The chart gets a zero line (a loss hangs **below** it, and the bars cleared the 3:1 non-text floor at the same time — they were 1.51:1); the period control is a segmented control on one line at ≥700 and wraps 3 + 2 below it; the accountant export is its own row under that control, **not beside the label** — it did not fit; **1.35/1, not 1.2/1**, for the same measurement. `Cell` and `Delta` unchanged; the job record moved to `RecordHost`. | §7 |
| `Clients.jsx` | The list shows what it already computes: name · last visit · spend · phone. A segmented sort of three, one chip. **`lastVisit` stops being able to print a future date.** | §8 |
| `BookingLink.jsx` | **BUILT — stage 6, 2026-09-02, AND THE QR LANDED THE SAME DAY.** Unchanged component, first on the page below --wrap and the second column’s resting content above it — never both, which was a measured defect in the first build. **The QR is a BUTTON, not the resting content** — the owner’s own shape, answering the question this row raised: *Generate QR code*, replaced by the code plus *Save* and *Copy image*. `qrcode-generator`, zero dependencies; black on white with a 4-module quiet zone; a 1,110px canvas shown at 200 so the saved file prints. Its W14 three-button rule is untouched — the QR takes its own line. `tests/qr-scans.test.mjs` decodes it back with an independent library. | §10 |
| `Appearance.jsx` | **BUILT — stage 6, 2026-09-02.** Writes **one** colour to both columns, and the email path gained the floor through a new `supabase/functions/_shared/brandColor.js` — the band corrected 3:1 on the paper, its ink MEASURED rather than the hardcoded white it was, and the brand colour as words on white pushed to 4.5:1. The 3px rule that was drawn in `secondary_color` on a band of `primary_color` (1:1 once they became one colour) is drawn in the band’s own ink. `tests/email-brand.test.mjs` pins that file against `lib/theme.js` on all twelve presets and four extremes. | §11 |
| `BusinessInfo.jsx` | **BUILT — stage 6, 2026-09-02.** BOTH colour pickers are gone, not one: the row said “the second colour picker” meaning the second SCREEN offering one, and with `Appearance` writing both columns this screen had no business writing either. Facebook, TikTok and YouTube added, paired. | §11, §15 |
| `BookingRules.jsx` | **BUILT — stage 6, 2026-09-02, and NOT as written here.** The deletion was reversed at step 6: `pricing.ts:135` charges the fee, so it is live money whenever there are no travel areas. It becomes a SENTENCE once areas exist and is an editable field again when the last one is removed. `.warn-box` kept. | §11 |
| `Catalog.jsx` | **BUILT — stage 6, 2026-09-02.** The category is the HEADING its services sit under, so the screen looks like the menu it is. One arrow per row — up only, absent on the first row: moving a row above the one before it reaches every order a pair reaches, and two 34px buttons on every row of the longest list in the product is more furniture than list. `above` is an index rather than a direction, because a service’s neighbour on the SCREEN is the previous one in its CATEGORY. | §11 |
| `Notifications.jsx` | **BUILT — stage 6, 2026-09-02, and the OPPOSITE of this row**: the owner reversed it on 2026-08-31 (*“the push switch STAYS and its missing browser half gets built”*). `app/public/sw.js` and `lib/push.js` landed; the switch reads THIS DEVICE’s registration rather than the saved boolean, and unsupported / blocked / off each get their own sentence. `Switch` also gained a working `disabled` — it took the prop and dropped it. | §11 |
| `NewBookingModal.jsx` | Must ask the server what is bookable instead of composing freely, and is reached from the header `+` alone. | §12 |
| `JobPage.jsx` | Gets **simpler**: with `BookingDetail` no longer carrying a Sheet, the record at `/job/:id` is the page and needs no container at all. | §2 above |

**`BookingCard.jsx` is kept and narrowed, and that is a ruling too.** Its
callers go from five to ~~two~~ **one**:

| Caller | After |
|---|---|
| `Today.jsx` | **stays** — the ONE lit job, and at most one card is on the screen |
| `DaySheet.jsx` | ~~**stays**~~ **GOES, 2026-09-01** — the phone pass §6 outranks this row: *"the panel is not the place a job is a card; the job record is."* Its jobs are `JobRow`, the same rows Today uses. |
| `Calendar.jsx` (History) | **GONE, 2026-09-01** — 18 records became 18 ruled rows (§1a) |
| `Clients.jsx` (the record's history) | **GONE 2026-09-02** — a history row is *date · what · total* (§9), a plain `.row-item` with `.txt` / `.figure.sm`, which is markup this file already had |
| `Money.jsx` (unpaid) | never used it; its own inline card stays, and is right |

**So the count is ONE as of 2026-09-02 (`Today`)**, which is what this row predicted, not
the two this section first wrote. And `Today.jsx`'s own `JobRow` moved out to
`components/JobRow.jsx` in the same change, because the day panel needed the
identical eight lines — two copies is how one of them gets a fix and the other
does not, which this repo has already paid for twice.


### 3c. New — 12 files, and one named but not built

**STATUS 2026-09-02 (stage 6):** ten of the twelve are built. `Faq.jsx` is
deliberately not, `SetupForm.jsx` and `Walkthrough.jsx` are stage 7, and
`ClientRecord.jsx` was refused at stage 5 with its reason kept. **One file
this section did not predict was needed is now here: `SettingsHost.jsx`.**

| File | What it is | Why it is not something that exists |
|---|---|---|
| `screens/Business.jsx` | **BUILT 2026-09-02.** The fifth tab: three groups of **eight** self-answering nav rows, the booking-link block, and the admission test written into the file’s own header. | Replaces `More.jsx`, which is deleted. Eight, not the nine §10 designed — there is no FAQ row until there is a FAQ screen. |
| `components/GearMenu.jsx` | **BUILT 2026-09-02.** The plumbing behind the header gear, and a DESTINATION rather than an overlay — it takes the main area, so its four screens are the same page-or-column as Business’s eight. | A sheet holding a menu would have been a second container mechanism for one set of screens, and they would be sheets at a desk — the thing this stage ends. |
| `screens/more/index.js` | **BUILT 2026-09-02.** key → `[component, title]`, thirteen entries (twelve settings screens plus the Switch business picker). | Business and GearMenu both need it; one importing it from the other is a worse shape than a file that holds it. |
| `screens/more/Reviews.jsx` | **BUILT 2026-09-02.** Writes `testimonials`: add, edit, hide, delete, with the stars stored as the number a website draws them from. | A table with no door since the first tenant migration. **The words are not DRAWN anywhere yet** — the booking page reads them into context and its steps are on a height budget — so the screen names the tenant websites rather than implying they are live. |
| ~~`screens/more/Faq.jsx`~~ **NOT BUILT 2026-09-02, and deliberately** | On/off plus the questions and answers. | The owner split it himself: storage now, screen later. `business_settings.faqs` and `faq_enabled` landed in `20260902001000_faq_storage.sql`; there is no Business row for it, because a row that opens nothing is the push switch’s own defect wearing a different label. |
| `screens/more/SwitchBusiness.jsx` | **BUILT 2026-09-02.** Only rendered above one membership. | It also needed `BusinessContext` to stop taking `memberships?.[0]`: the database has supported two businesses per account since the staff-roles migration and the front end could only ever open the first. The choice is a localStorage fact about the DEVICE, not a column. |
| ~~`components/ClientRecord.jsx`~~ **NOT BUILT, 2026-09-02, and deliberately** | Bare ruled rows on the ground — `.facts` promoted from the sheet's best block to the record itself. Leads with visits and spend. | The reason given here dissolved when the record stopped being a sheet: `Clients.jsx` renders `RecordHost` directly, so the rows already sit in a column with no card. `RecordHost` gained a **`bare`** prop (`.record.bare` drops border, background and padding) and that is the whole of it. A component with one caller, extracted to satisfy a prediction, is the abstraction this repo's own rules forbid. |
| `components/RecordHost.jsx` | Sheet below 1180, sticky column above. | §2. Six callers, one width check. |
| **`components/SettingsHost.jsx`** — **NOT PREDICTED BY THIS FILE, built 2026-09-02** | Where a settings screen is drawn: a page below --wrap, the second column at or above it. `RecordHost`’s twin. | **The gap is instructive.** At step 5 a settings screen was still a `Sheet` below 1180, so `Sheet` WAS the container and no new component was needed. Step 4b re-decided that (“a page, with a back control”) and no file came back to name the piece that decision now required. A container change is a component even when it is only a container. |
| `hooks/useWide.js` | Six lines of `matchMedia`. | Calendar's inline day panel needs the width without needing `RecordHost`. |
| `components/SetupForm.jsx` | **BUILT 2026-09-02.** The stepped form, one question a step, skippable and resumable, with §1b's rule. The seven steps and the progress arithmetic live in `app/src/lib/setup.js` with no React in them, because Business's resume row has to print the same number the bar paints and `tests/setup-progress.test.mjs` can only pin that if it imports without a DOM. | The only stepped thing in the product. Six of its seven editors are written in the file; *Your colour* renders `screens/more/Appearance.jsx` whole, because that screen commits on the tap that picks a swatch and has no Save button to lose. The other six settings screens end in one, and a step whose Continue does not save throws away what was typed into it. |
| `components/Walkthrough.jsx` | **BUILT 2026-09-02.** The spotlight and its step list, §1c, plus a resolved PLAN — which of the seven this dashboard actually has, worked out before the first step is drawn. | The only overlay that is not a sheet. Its targets are `data-tour` attributes on Today's masthead and rail, the header `+`, the tab buttons and the booking link — five files gained one attribute each and nothing else. |
| `lib/export.js` | Jobs and expenses for the chosen period, nothing more — his answer to Q4. | Row 40. It uses the period already on the Money screen, so it needs no control of its own. |

**`RequestCard` — named, not built.** Step 4 designed the accept/decline card
and the slot it sits in, and both the roadmap and step 4 say plainly that 2.11
builds the slot empty and 2.12 fills it. It is written down here so that 2.12
does not have to re-derive that a request outranks unrecorded money in the lit
order and needs no new calendar mark.

### 3d. Dies — 1 file, 7 elements, 2 classes

| What | Why | Where it was named |
|---|---|---|
| `screens/More.jsx` | Becomes `Business.jsx` + `GearMenu.jsx`. | §10 |
| Today's `.warn-box` | It says what the *Needs payment* run's own label says with a count. | §2 |
| Today's full-width *New booking* button | The `+` in the header is the one doorway. | §12 |
| Calendar's *New booking* button | Same. | §12 |
| Today's three run labels | *Next up* / *Later today* / *Done and paid* become *Needs payment* / *Still to do* / *Done*. The fix is a deletion: two of the old three were one kind of work split by a clock. | §2 |
| `BusinessInfo`'s second colour picker | A tenant has **one** accent, law 11. Two pickers is a schema accident. | §11 |
| `BookingRules`' travel-fee field | A number a screen offers to set and nothing reads. | §11 |
| `Notifications`' push switch | Writes `push_enabled` with no service worker, no permission prompt, no client code at all. | §11 |
| **`.dashed`** — the class and all **seven** uses | §1a: an empty section is **not drawn**, and an empty screen is one sentence and one way forward. There is no shape left for a dashed box to be. | §1a |
| **`.badge`** — seven rules, zero users | §3e. | found here |

**DONE 2026-09-02, AND IT WAS BOTH HALVES.** `sweep-widths.mjs`’s eleven
titles became `BUSINESS_ROWS` (8) and `GEAR_ROWS` (4), reached through two
doors; “Maps, calendar & contacts” is “This device”; Reviews joined; there is
no FAQ row to visit. `shoot-dashboard.mjs` gained `--gear` for the same
reason — a screenshot tool that can only reach one door photographs two
thirds of the product. **Both scripts also stopped closing a settings screen
by clicking a sheet’s X**, because there is no sheet: Escape closes the page
and the column alike. The original note follows.

**One check will go stale silently unless step 6 moves it, and it is the same
family as everything else on this list.** `sweep-widths.mjs:90` holds a `MORE`
array of **eleven settings-screen titles** and walks each one; Reviews and FAQ
would simply not be visited, and the sweep would report clean on eighteen
screens while never opening two of them. **It also opens all eleven from one
door.** After §10 the plumbing moves behind the gear, so the sweep needs two
routes rather than one. The same eleven is quoted in CLAUDE.md's own
description of the script (*"all eleven settings sheets"*) and becomes thirteen
with the build.

**BOTH DELETIONS LANDED 2026-09-02.** `.dashed` was down to ONE caller by
then (`BookingDetail`’s “no templates yet”), which became a plain sentence;
`.badge` still had zero. `boxy()` in `sweep-widths.mjs` lost `.dashed` in the
same change, and the three `accent-sweep.mjs` comments plus the two in
`lib/theme.js` that named `.badge` were corrected. No measurement moved and
the sweep still exits 0.

**`.dashed` is the one deletion with a side effect worth naming.**
`sweep-widths.mjs`'s `boxy()` matcher lists `.dashed` among the things with an
edge; once nothing carries the class the matcher is harmlessly matching
nothing, and step 6 should take it out of that selector in the same change
rather than leave a check that reads as covering something it cannot find.

**What does NOT die, and each is a deliberate keep:**

- **`.warn-box` the class** survives with one caller (`BookingRules`). A class
  with one user is not debt; deleting it moves twelve lines of CSS into a
  screen for no gain.
- **`Sheet.jsx`** survives with **seven** direct call sites, unchanged, plus
  the one inside `RecordHost` (§2).
- **`.cal-cell.selected`** is currently dead CSS and is **revived** by §4's
  inline day panel, not deleted.
- **`.settled-row`** survives — it is the *Done* run.

### 3e. `theme.css` — what the stylesheet gains and loses

| Change | Detail |
|---|---|
| **`--wrap` is added** | The desktop specification names its breakpoint after this token and **`theme.css` has never had it.** It exists at `landing.css:115`, scoped to `.ld`, at 1180px. Two stylesheets must not each own their own copy of a layout number; `theme.css` gets `--wrap: 1180px` and the breakpoint is written against it. |
| **`--bp-rail` / `--bp-split`** | 1024 and 1180. Both derived in the desktop spec §3; neither is a taste choice. |
| **`.rows.cols` + two column templates** | §1a(ii). The whole of History's and Clients' shared chassis. |
| **`.split` + `.col-2`** | §2. One class, one `--split` property, five ratios. |
| **`.dayrail`** | One rail per screen instead of three, and **the stagger moves inside it** — `nth-child` delays on `.dayrail > *`, same budget, same ~580ms ceiling (step 4 §1f). Node states gain *finished* (`--accent`, solid) and *paid* (`--ac`, solid) against the existing hollow `--bone-2` ring. |
| **`.bars` gains a signed mode** | A loss hangs below a 1px `--line` zero rule; a win stands on it. Colour alone was the 1.4.1 failure the marks vocabulary exists to answer. |
| **`.tabbar` gains a column form** | Same component, same glass, same radius, same 12% active fill, rotated, fixed to the left edge at ≥1024. |
| **`.progress-rule`** | §1b. ~10 lines. |
| **`.spotlight`** | §1c. ~6 lines. |
| **`.dashed` is deleted** | §3d. |
| **`.badge` is deleted** | **Seven rules, zero users.** `.badge` and its six status-modifier rules are a byte-for-byte duplicate of `.pill`, which every screen actually uses. Nothing in `app/src` or `supabase/` references it. |

**`.badge`'s deletion touches `accent-sweep.mjs`, and the coupling was
checked rather than assumed.** CLAUDE.md is explicit that the sweep must exit 0
after anything touching accent colour, so the first thing to establish is what
it would lose. **Nothing.** The sweep has no `.badge` row: `accent-sweep.mjs:78`
measures one surface and labels it *".pill.completed / .badge.completed"*,
because the two are **the same declaration**. What `.badge` actually leaves
behind is **three comments that would become false** — `accent-sweep.mjs:19`,
`:65` and `:78`, and `lib/theme.js:42` and `:68`. Those get corrected in the
same change; no measurement moves, and the sweep must still exit 0.

### 3f. Two counts in step 4's file, corrected

Bookkeeping is what this step is, so:

> **SETTLED BY THE BUILD, 2026-09-02: TWELVE.** The owner split the FAQ
> (storage in 2.11, screen later), so eleven existing + Reviews is what
> shipped, and the phone pass §12’s count was the right one all along.
> Switch business is still a fourteenth destination and still not one of them.

- **Step 4 §11 is titled *"one skeleton, twelve of them"* and its table lists
  thirteen.** Eleven exist today — Business info, Your colour, Services &
  add-ons, Promo codes & sale, Photo gallery, Hours & days off, Booking rules,
  Notifications, Message templates, Team, This device — and Reviews and FAQ
  make **thirteen**. Switch business is a fourteenth destination behind the
  gear and is **not** one of them: it is a picker, not a form, and it does not
  share the settings skeleton.
- **The desktop specification §4a's *"a settings screen (all eleven)"* is the
  same slip one step earlier** and reads **thirteen** from here on.

Neither number changes a design. Both are quoted in three files, which is
exactly how a wrong count outlives the thing it was counting.

---

## 4. What this file deliberately does not do

- **It does not split `Calendar.jsx`.** Month and History are two rows in the
  law-1 register living behind one chip toggle in one 294-line file, and the
  rebuild grows both. Splitting them was considered and refused: the `mode`
  branch already separates them cleanly, this repo's own norm is 500–600 line
  screens (`BookingRules` is 541, `Catalog` is 614), and a refactor nobody
  asked for is not part of "from scratch". **The trigger that reverses it,
  written down so it is a decision and not an oversight:** if either mode needs
  its own scroll or sticky container — anything that makes the two layouts
  fight for the same wrapper — split then, in that change.
- **It does not name every prop.** Which arguments a component takes is code,
  and code starts at step 6.
- **It does not write the test.** §1a settles what `composition.test.mjs` test
  1 must assert; it is rewritten when the screens it measures exist.
- **It does not touch schema, edge functions, the engine or email**, with the
  one exception step 4 already carried: the email accent path (D1).
  **CORRECTED AT STEP 6, 2026-08-31.** `screens/more/Faq.jsx` at §3c has nowhere
  to write — the FAQ has no table and no column, and this file repeated step 4's
  no-schema promise without noticing the screen it had just listed needs one.
  Settled by the owner at §3b of `docs/dashboard-spec-approval-2026-08-31.md`;
  **if the FAQ waits for Phase 3, `Faq.jsx` drops from the twelve new files and
  the settings screens go back to twelve.**
- **It builds nothing.**

---

## 5. What this changes in the files that outrank it

Step 4 §16 already lists three updates landing at step 6 — `design-system.md`
law 11b's table, `dashboard-skeletons.md` §6's lit order, and the desktop
spec's §4a row about the day's three controls. **This file adds two, and
neither is a design change:**

**4. `docs/design-system.md` § Composition — one sentence, and it is the answer
to declined decision 7.** The rule reads *"A collection of records is a ruled
list. A card is for an object you pick between or act on one at a time."* It
gains the half that makes it enforceable:

> **A card rendered from a list through a component is still a card.** The
> allowance is per caller, not per component.

**5. `docs/dashboard-desktop-spec-2026-08-31.md` §9 — the question it handed to
step 5 is answered here**, in the direction that file recommended: the ruled
list widens, and **no table joins the composition vocabulary**. Its §4a count
of settings screens goes from eleven to thirteen (§3f).

**Nothing else moves.** No token except the one that was missing (`--wrap`), no
face, no motion preset, no accessibility floor, no never-default.

---

## 6. What step 6 has to be able to measure

Step 3 §10 holds the layout numbers and step 4 §17 holds the screen ones. These
are the ones this step adds.

| Check | Today | Required |
|---|---|---|
| `<Sheet>` call sites that are a component hosting itself | **11** (ten files) | **7** — the four records are hosted instead |
| `theme.css` occurrences of `--wrap` | **0** | **defined once, and the breakpoint written against it** |
| `.dashed` elements anywhere in the dashboard | 7 | **0**, and out of `sweep-widths.mjs`'s `boxy()` |
| `.badge` rules in `theme.css` / users in `app/src` | 7 / **0** | **0 / 0**, `accent-sweep.mjs` exits 0 with the same measurements and five corrected comments |
| `BookingCard` call sites | 5 | **2** (`Today`, `DaySheet`) |
| `composition.test.mjs` test 1 against `Calendar.jsx` mapping onto `BookingCard` | **passes** | **fails** |
| Settings screens | 11 | **13**, one skeleton |
| `sweep-widths.mjs`'s `MORE` list | **11 titles** | **13**, reached from two doors — Business and the gear |
| CLAUDE.md's *"all eleven settings sheets"* | 11 | **13** |
| Things with a back end and no door | 7 | **3** |
| Setup form: steps skipped vs segments filled | — | **filled == completed**, and equal to Business's *"N of 7 done"*. **MEASURED 2026-09-02:** seven skips leave the bar where it was and Business reads *2 of 7 done* on a new business (the two being what `create-business` itself sets). |
| Walkthrough on an **empty** dashboard | — | **runs, skips the absent steps, never blanks** |
| Spotlight target rect at 392, 1024 and 1440 | — | **on the element at all three**, targets found by `data-tour` |
| `.progress-rule` segment width at 320 | — | **≥ 28px** with seven steps. **MEASURED 2026-09-02: 37.14px**, from 284px of usable width rather than the 244 §1b assumed. |

---

## 7. What is still open after this file

**Nothing that needs the owner.** Step 6 is his approval gate and it is the
next thing that does.

Two threads are carried forward deliberately rather than left loose:

- **`RequestCard` and the accept/decline pair belong to roadmap 2.12**, and the
  slot they land in is designed, specified and built empty here. That is the
  roadmap's own instruction — *do not start 2.12 inside 2.11*.
- **`monthly_plans`, `business_domains` and `campaigns`** stay without a door,
  each with a stated reason (step 4 §15). Three, down from seven, and none of
  the three is an omission.
