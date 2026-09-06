# A guide on every tab — the step lists, and the six decisions

Roadmap 2.24. The owner, 2026-09-05:

> *"Remember we made a kind of, like, guide that goes step by step and it kinda
> highlights things. Well, it did it for the home page, and then it stopped
> there. And it was a little weird. What it should do is, basically, every time
> you click on a new tab for the first time, there should be a full guide for
> every single thing inside of that, that's not, like, obviously explainable.
> Don't combine multiple things into one step and keep it kinda short."*

**This is the writing half.** The roadmap entry splits the item in two and says
so: with this document in hand, 2.24 is the overlay and the sweep. Nothing here
is JSX and nothing here is a `data-tour` attribute — it is the step lists as
words, and the decisions they rest on.

---

## The six decisions, settled

### 1. Where "seen" lives — one key, a set of names

`dp.tour` is one localStorage key today and it is deliberately a fact about
this BROWSER rather than this account, because two people share one tablet in
this trade. Per-tab keeps that: **one key, `dp.tours`, holding a list of tour
names already seen** (`["shell","today","money"]`).

Five separate keys would be five things to clear, and a detailer who wanted to
see the guides again would have to know all five names. One key means *Show me
around* in the gear can offer "start again" and mean it.

### 2. The shell tour gets shorter, not deleted

Its job becomes *here are the five places, and here is the link*. Everything it
half-explains moves into the tab it belongs to. Without this the detailer meets
the same sentence twice — which is his complaint arriving from the other side.

**It goes from seven steps to four** (see below).

### 3. A tab guide never fires while the shell tour is running

Two overlays on one screen. The tab guide's trigger is *this tab has been
opened and no tour is on screen*; the shell tour's own steps move tabs, so
without this the first move would open a second overlay on top of it.

### 4. **A guide never advances the screen.** (The one the item said to settle first.)

The choice was: does a Clients guide open a record and point inside it, or does
it only cover the resting screen?

**It only covers the resting screen, and the reasons are not convenience.**

- **Rule 1 exists because this runs over live data.** *The lit element is not
  clickable* keeps the product's hand off a detailer's real bookings. A tour
  that drives the screen is the same risk with our hand on it instead of
  theirs, and carving an exception into the one safety rule for the sake of a
  nicer tour is the wrong trade.
- **It leaves them somewhere they did not go.** A tour that opens a job and is
  then dismissed with Escape has moved the detailer into a record they did not
  choose. Every other overlay in this product returns you exactly where you
  were.
- **It is not actually the complaint.** He said it *"did it for the home page,
  and then it stopped there"* — the fault is that four of the seven steps were
  signposts to doors, not that the guide failed to walk through them. Five
  guides that explain the resting screen ARE the fix.
- **And where a screen's meaning genuinely is behind a click, one sentence
  says so.** *"Open a client to see what they have spent and everything they
  have booked"* is a step. Simulating the click is not needed to say it.

**Consequence for the lists below:** every step targets something visible on
the resting screen, and any step that would need a click first is rewritten as
a sentence about what is behind it — or cut.

### 5. Permissions — the list is filtered before it is counted

Staff have three tabs, so there are three guides for them and five for an
owner. The count is worked out first, exactly as the shell tour already does
after the staff-login defect (*"of 7"* while running four).

Money and Business do not exist for staff, so their guides never arrive; the
Clients guide loses its "what they have spent" step, which is `can("money")`.

### 6. A tab whose honest guide is one step does not get a guide

Applied below, and it cost one: **Calendar**.

---

## The filter, applied hard

His new rule — *"that's not, like, obviously explainable"* — is the 2026-09-01
copy rule pointed at a tour: **does the sentence add a fact the control does
not already carry?** A step that points at a control and reads its label back
is what made the first tour feel weird.

**More was cut than kept.** What follows lists the cuts as well as the steps,
because the cuts are the part that will otherwise be re-added by the next
person to look at this.

---

## The shell tour — 7 steps to 4

| # | Target | Sentence |
|---|---|---|
| 1 | `day` | Every morning starts here. |
| 2 | `new` | A job booked over the phone goes in here. |
| 3 | `business` | Everything a customer sees is set here. |
| 4 | `link` | Send this link to a customer. |

**Cut, because each tab now explains itself:** the `job` step (moves to the
Today guide), `calendar` and `money` (their own guides say what they are on
arrival). The last step is still the link, per screen designs §13b — it is the
one thing they have to go and use, and ending on it leaves them on the screen
it lives on.

---

## Today — 4 steps

The shell tour already introduced the day itself, so this one starts inside it.

| # | Target | Sentence | If absent |
|---|---|---|---|
| 1 | `job` | Open a job to see everything about it — the car, the price, the notes. | Skipped on an empty day |
| ~~2~~ | ~~`rail`~~ | **CUT AT BUILD TIME.** `.dayrail` IS the thread and it already carries `job` — a second name on the same element would light the same thing twice. | — |
| 3 | `requests` | Somebody asked for a time. Nothing is confirmed until you answer. | Skipped in reserve mode, and when nothing is waiting |
| 4 | `wrapup` | When a job is done, this is where the money gets written down. | Skipped when nothing is finished |

**Cut:** the masthead's date ("Sunday, September 6" is obviously explainable),
the `+` button (the shell tour has it), and the booking-link card (the shell
tour ends on it).

**Note for the build:** three of these four are absent on a brand-new
dashboard, so a new detailer's Today guide is one step — which by decision 6
means **Today's guide does not run on an empty dashboard at all.** That is
correct: there is nothing there to explain.

---

## Calendar — no guide

Every candidate step failed the filter:

- *"Month / History"* — a segmented control with two words on it.
- *"Previous / next month"* — arrows either side of a month name.
- *"Tap a day"* — a gesture, which rule 3 forbids naming, and obvious anyway.
- *"The filter bar"* — it says Status and When.

**The one fact that is NOT obvious** — that a day panel opens beside the month
rather than replacing it — is a thing you learn by pressing a day, and a
sentence about it is a sentence about a layout. **Decision 6: no guide.**

This is the item's own rule doing its job, and it should be left alone rather
than padded to justify a fifth tour.

---

## Money — 3 steps

| # | Target | Sentence | If absent |
|---|---|---|---|
| 1 | `period` | Week, month, year — every figure on this screen follows this. | Always present |
| 2 | `net` | What is left after expenses, not what came in. | Always present |
| 3 | `export` | One file for your accountant, for whatever period you are looking at. | Always present |

**Cut:** the period stepper arrows, the expense form's own label, "Jobs done"
and "Avg job" (a number under its own name), and the unpaid list — which is
important but says *"Nothing outstanding"* when it is empty and names the
customer when it is not.

**Step 2 is the one that earns its place**: *Net* is the single word on that
screen that a detailer can misread as takings, and the consequence of
misreading it is thinking they earned more than they did.

---

## Clients — 3 steps

| # | Target | Sentence | If absent |
|---|---|---|---|
| 1 | `client` | Open somebody to see everything they have ever booked. | Skipped when nobody has booked yet |
| 2 | `sort` | Sort by who has not been back — that is the list worth a text message. | Always present |
| 3 | `compose` | Write to everybody on the list you are looking at, in one go. | `can("marketing")` only |

**Cut:** the search box, "Recent / Most spent / Longest away" as three separate
steps (they are one control and one idea), and the lifetime-spend figure —
which is `can("money")` and is a number under its own label.

**Step 2 is the whole feature.** The lapsed list is the thing this screen can
do that a notebook cannot, and nothing on the screen says so.

---

## Business — 2 steps

| # | Target | Sentence | If absent |
|---|---|---|---|
| 1 | `setup` | Everything with a number beside it is something a customer can already see. | Skipped once setup is finished |
| 2 | `catalog` | What you charge for, and what it costs. This is the one that decides whether the booking page works. | Always present |

**The item predicted this and it was right**: "expect Business's settings rows
to produce almost none: a row that says *Hours & days off* has already said
it." Every row on that screen is a label and a live summary, and a tour that
read them back would be exactly the weirdness he complained about.

**Cut:** all thirteen rows individually, the gear (the shell tour's own
territory), and the booking-link card (the shell tour ends on it).

---

## What the build needs that does not exist yet

**`data-tour` attributes**, all of them new except `job`:

- Today: `rail`, `requests`, `wrapup`
- Money: `period`, `net`, `export`
- Clients: `client`, `sort`, `compose`
- Business: `setup`, `catalog`

Every name is unique across the whole app, which is what makes the existing
`querySelector` targeting safe (`Walkthrough.jsx`'s own note: two elements
answering one selector is a silent wrong target).

**And each new guide is added to `sweep-widths.mjs` in the change that builds
it** — that script is the only thing in this repo that opens the tour at all,
and this lesson is now recorded ten times.

---

## The count, honestly

**Measured after the build rather than predicted:** on the seeded demo at 392
an owner meets **2 + 3 + 2 + 2 = 9 steps** across four arrivals — Today's
`requests`/`wrapup` and Clients' `compose` are all conditional and only two of
the three were on screen. The prediction below was written before the `rail`
step was cut and assumed every conditional target present:

An owner with a seeded dashboard meets **4 + 4 + 3 + 3 + 2 = 16 steps** across
five arrivals, none longer than four.

A brand-new owner meets **4 + 0 + 3 + 0 + 2 = 9**: Today and Clients have
nothing to point at yet, and by decision 6 they do not run.

Staff meet **4 + 4 + 2 = 10** at most, and the Clients compose step only with
`marketing`.

**That is more, shorter steps than the seven-step tour it replaces**, which is
what he asked for — *"more steps and not try to combine any things into one
step"* — and every one of them arrives while the detailer is actually looking
at the thing.
