# The dashboard's skeletons — roadmap 2.3

`docs/design-system.md` § "What this file does NOT settle", item 4: *"the five
dashboard tabs and eleven settings screens have none [no worked skeletons].
That is the body of 2.3, and it is where this system will actually be
tested."* This file is that answer, written before the code so the reasoning
survives.

There is **no reference page for the dashboard.** The landing page had one and
2.2 was a transplant; this is the first surface where "The Thread" is
*applied* rather than ported. So every decision below cites the law it comes
from, and the ones that go beyond the law are marked as such.

---

## 1. What the dashboard IS, in the system's own terms

The landing page's idea is that a detailer's Saturday already exists,
scattered across a text thread and a Yelp inbox, and the product *sorts what
is already there*. Its signature move is four text messages resolving into
four rows of a schedule.

**The dashboard is what they resolve into.** It is the far end of the same
thread. That gives two consequences that shape everything else:

- **It is the destination, not a second marketing page.** Quieter, denser, no
  scroll choreography. A tool opened forty times a day, standing in a
  driveway, one-handed.
- **The green still means "the thing that has landed."** On the landing page
  that is a booking arriving. Here it is a job finished and paid. Same
  semantics, so the accent needs no new meaning.

## 2. The signature move: the thread, drawn

**Today's schedule hangs on a literal thread** — a one-pixel `--line` rail
down the left of the day, with a node per job. Nothing else in the product uses
a rail, so Today is unmistakable at a glance, and it is the same "scattered
becomes ordered" reading the approved page opens with.

**THE NODE HAS THREE STATES, NOT TWO, AND THEY ARE THE CALENDAR'S OWN
(built 2026-09-01, roadmap 2.11 step 6).** This paragraph said *"a hollow ring
while the job is ahead and a solid `--ac` disc once it has landed"*, which is
two states for three facts — and the shipped screen drew a job that finished
hours ago with the hollow "ahead" ring, and a PAID job in the tenant's accent
where the calendar's `.dot.paid` draws the fixed green. Same fact, two
components, two colours. Now:

- **ahead** — hollow ring, `--bone-2`
- **finished** — solid `--accent` (a finished job is a job, not money: law 11b)
- **paid** — solid `--ac`, the fixed green, on every tenant

**And there is ONE rail, not one per run.** This section always said *one
continuous hairline with a node per job*; the first build drew three
`.dayrail` elements, one per section. The runs are labels ON the rail now, and
the screen's staggered arrival moved INSIDE it so the day still arrives one job
at a time rather than all at once — §4's budget is unchanged.

Cost: one wrapper class and two pseudo-elements. It replaces `.stripe`, which
did the same job in the shape the never-defaults name (see §5).

**The class is `.dayrail`, and it must not be called `.thread`.** That name
belongs to `landing.css`, for the messages-becoming-a-schedule element. Since
`theme.css` is global, the first version of this rule reached into the live
marketing page and gave it a rail it never had. `tests/composition.test.mjs`
now fails on any bare class in `theme.css` that a scoped sheet also uses.

## 3. The five tabs, five skeletons (law 1)

Law 1: *"One continuous ground, and every section a different skeleton over
it. Two sections that share a skeleton is the failure."* A dashboard screen
is not exempt, it just has fewer sections.

| Tab | Skeleton | Nothing else in the app is this |
|---|---|---|
| **Today** | the day rail (`.dayrail`) — a vertical rail with nodes, jobs hanging off it, under a date masthead and a two-cell ledger strip | the only rail |
| **Calendar** | a seven-column grid, with the day beside it at ≥1180 and under it below that; History is a filtered ruled list | the only grid |
| **Money** | one display-sized lead figure, a six-bar **signed** chart on a zero rule, then a paired-cell ledger | the only chart |
| **Clients** | a full-bleed ruled list of PEOPLE — a masthead, a search field, a sort and one chip, then four columns under no headings, and a record beside it with no container either | the only screen with no panel on it, **and the only record with none** (built 2026-09-02) |
| **More** | grouped panels of self-answering nav rows | the only screen made of panels |

Each is structurally different from the other four, and each shape follows
from what the screen holds rather than being applied to it.

**CLIENTS AND HISTORY BOTH USE `.rows.cols`, AND THAT IS NOT A COLLISION —
what separates them is structure, which is what law 1 asks about.** History is
a list of EVENTS: it has a time axis, so every row carries a status mark and
the rows sit under month rules that total the month. Clients is a list of
PEOPLE: no mark, no grouping, a search field as the screen's first control,
and a sort whose only job is to reorder the same set. Their column ORDER
differs for the same reason — History ends with the money because you are
scanning a ledger; Clients ends with the phone number, because the row's last
job is to let you act on the person. Built 2026-09-02; the shared chassis was
settled in the component inventory §1a.

**The TWELVE settings screens are one skeleton on purpose: a form.** It said
*“eleven… a form in a sheet”* until 2026-09-02, and both halves moved in the
same change (roadmap 2.11 step 6, stage 6). **Twelve**: the eleven that
existed plus **Reviews**, with the FAQ’s screen deliberately later. **And not
a sheet**: a settings screen is a PAGE with a back control below --wrap and
the second column at or above it (`components/SettingsHost.jsx`). **This
paragraph’s REASONING is untouched, which is the point** — they are still
“reached one at a time”, a person still never sees two together, and law 1
still governs what is on screen at once. Only the container changed. They are not sections of a continuous page — they are modal panels
reached one at a time, and a person never sees two of them together. Law 1
governs what is on screen at once. What varies between them is their internal
structure (a list, a form, a grid), which follows the content.

**The records have a sixth skeleton of their own, and it landed with the job
record on 2026-09-01: a PINNED ACTION BAR over named sections** (`.jobbar` over
`.section-title` blocks). Nothing else in the app pins anything — a tab bar is
fixed furniture, this is content that refuses to scroll — and nothing else
puts its controls above its content. It does not break law 1 against the five
tabs: a record is drawn over a list on a phone and beside one at a desk, so
the two are never the same section of the same page. **The bar is `sticky`,
not `fixed`, because the record has three containers** (a sheet, the desk's
second column, `/job/:id`) and only sticky behaves in all three without any of
them knowing about the others.

**AND THE CALENDAR'S ROW GAINED ITS TWO HALVES ON 2026-09-01 (stage 3), which
is the same skeleton and not a seventh.** *"A seven-column grid; History is a
filtered ruled list"* is still exactly what that tab is. What landed under
each half:

- **The month grid writes words into its cells at ≥1180** — up to three
  `time · name` lines and a `+N more` — so *Booked*, *Done* and *No-show* stop
  being marks there and the legend shrinks to *Blocked* and *One type only*.
  The marks vocabulary in §5b is unchanged; it is the phone's form of the same
  fact, and it is still what the 320-to-1179 grid draws.
- **THE DAY OPENS INLINE UNDER THE GRID, AND THAT IS THE ONE THING WORTH
  KNOWING.** It is not a sheet, not a modal, and NOT the second column — a day
  is not a record, so it does not go through `RecordHost`. The grid stays
  drawn above it at every width, which is the whole reason: the month is the
  thing you are reading the day *against*. `.cal-cell.selected` marks the cell
  it came from. **This is the only place in the product where selecting
  something opens a panel BELOW rather than over or beside.**
- **`.rows.cols` — the ruled list, widening.** The row's interior goes from a
  stacked pair to five columns above 1024 and the container does not change.
  It is not a table and the composition vocabulary stays seven; the reasoning
  is `docs/dashboard-component-inventory-2026-08-31.md` §1a, which spent
  bucket 2's one permitted addition on nothing, deliberately.

## 4. The motion budget, and what is deliberately dropped (law 3)

Law 3: *"Motion is not spendable… If a mechanic is deliberately dropped, say
so and say why."* The dashboard carries:

- **The ground's drifting light and grain** — never stops, which is law 2.
- **One staggered reveal on first paint** per screen. `design-knowledge.md`
  §1: *"one well-orchestrated page load with staggered reveals creates more
  delight than scattered micro-interactions."*
- **Pointer feedback** at `--t-hover`, and an instant `:active` scale with no
  transition at all, so a press registers as contact rather than as
  animation.

**AND ONE MORE, ADDED 2026-09-02 BY THE OWNER, WHICH BINDS NEW WORK NOW AND
NOT ONLY WHEN 2.17 IS SCHEDULED: ANYTHING THAT OPENS, ANIMATES IN.** He said
it first on 2026-09-01 (roadmap 2.17) and again on 2026-09-02 to confirm it
had stuck: *“there’s multiple points where stuff just kinda pops into place,
and there’s no fluid animation… keep that in mind when we build future things
so it’s already there; for the past things it needs to get revised.”*

**The distinction that makes this a rule rather than a contradiction of the
three above:** the budget over this line is about a screen’s ARRIVAL — one
stagger on first paint, and no more. This is about a thing you OPENED. A
record, a day panel, a settings column, a picker: it appeared because somebody
clicked, and it has to come from somewhere. Below `--wrap` this already holds
(`.sheet` has `sheet-in` and `sheet-out`); **at a DESK almost nothing does**,
which is why he named the desk — *“desktop’s the majority of the things where
you click something in the calendar, you click a booking, whatever, and it just
instantly pops”*.

**So: a NEW component that opens gets its entrance and its exit in the change
that builds it.** *(First honoured 2026-09-02, roadmap 2.11 step 6 stage 7:
the setup form fades and drops 8px out at `--t-exit` and the walkthrough's dim
and caption go with it, and each step's caption arrives from the direction it
travelled at `--t-exit` rather than at `--t-reveal` — a step change is a thing
somebody does seven times in two minutes, and 420ms there is a gate. The
form's own ENTRANCE is the screen's existing staggered arrival: it is a
`.group` directly under `.app-main`, so adding a second one would be two
animations running the same 420ms.)* The existing ones are roadmap 2.17’s job and are a list, not
two items — he named the two he happened to hit. His own limit is the
acceptance test and it has not moved: *fluid and connected, without being in
the way of productivity*. Interruptible, fast, never a gate between a tap and
the thing tapped for.

Dropped, each with its reason:

- **The scrub preset and the pin.** Law 6 puts a pin's floor at ~1.8 screens
  and says nothing but the landing thread pins. A dashboard screen is read,
  not travelled; locking a scroll position on a tool someone opens forty
  times a day is the definition of motion that draws attention to itself.
- **The sticky horizontal rail and the rotating-tail typewriter.** Both are
  narrative devices for a page that is arguing something. Nothing here is
  arguing.
- **The drifting dot lattice.** Same reason 2.1 dropped it from the booking
  page: behind a seven-column calendar grid a 46px lattice reads as moiré.
- **The pointer light.** Fine-pointer only, and this is the most phone-first
  surface in the product.

## 5. Where this goes beyond the law, and why

Three judgments the system does not settle. Each is recorded here rather than
made silently.

**a. `.stripe` is deleted, not kept.** Roadmap 2.3 handed it forward: *"it is
not on a card, it is on a list row… probably keep the job it does; the shape
is 2.3's call."* Looked at: its only remaining use is `Money.jsx`'s
waiting-on-payment list, where it sits **inside a `.card`** — so it is
literally "an accent bar on a rounded card", a named never-default — and
where every row has the same status, so the colour it carries is information
nobody needs. The job it did on Today is done better by the thread node.
Deleted in both places.

**b. `--success` and `--warning` are deleted.** The system has one accent and
one warm value, and says so twice: *"one dominant plus one sharp accent,
never a timid even palette"*, and of `--bad`, *"it is the only warm value
anywhere in the system, so it can never be confused with the accent."* A
second green beside `--ac` and an amber beside it are a four-hue palette. The
five booking statuses are carried by **two hues and three shapes** instead:

**REWRITTEN IN ROADMAP 2.4 (2026-08-30).** The table below is the current one;
the version it replaces is at the end of this section, because the reason it
failed is worth keeping.

| Mark | Form | Colour | Reading |
|---|---|---|---|
| confirmed / pending | hollow **circle** | `--bone-2` | a job that is ahead |
| completed | solid **circle** | `--accent` | a job that landed |
| paid | solid **circle** | `--ac` **fixed** | money in — never the tenant's colour, law 11b |
| cancelled / no-show | **bar** | `--fog` | a job that did not happen |
| blocked day | solid **square** | `--fog` | a day you closed |
| one type only | hollow **square** | `--accent` | a day with a constraint |

**The hollow square carries BOTH restrictions, and the tooltip says which**
(roadmap 2.7, W4). It read "drop-off only" until a detailer could also close a
day to drop-offs, at which point a fixed label on the mark would have been a
plain lie on half of them. A sixth FORM was the obvious move and it is the
wrong one: the rule below is that no two marks which can share a cell share a
shape, and the two restrictions cannot share a cell — a day is one or the
other. The distinction is a tooltip and one tap into the day sheet, which
spells it out in a sentence; the mark's job is "this day is not normal".

**Circles are jobs, squares are the day, a bar is a job that did not happen.**
No two marks that can appear in the same cell share a form, so the grid reads
without colour at all. `.dot.confirmed` and `.dot.pending` were merged: on a
month grid both mean "booked, nothing has happened yet", and keeping them apart
cost a third hollow ring distinguished from the others by hue alone.

**Why the old table failed, and why the fix is unconditional.** It carried
seven meanings on two forms — disc and ring — with hue doing the rest, on 7px
marks that carry no text. That is a WCAG 1.4.1 failure before any tenant colour
is involved, and once law 11 let the tenant paint the dashboard it became a
visible one. Measured on the shipped markup (ΔE against the mark it collides
with):

| Accent | Collides with | ΔE | Both were |
|---|---|---|---|
| silver `#D4D7DA` | "booked", `--bone-2` | **8.5** | hollow rings |
| deep red → `#E26666` | `--bad` | **8.5** | — |
| Crimson → `#E55B5B` | `--bad` | **11.4** | solid discs |
| near-black → `#707070` | "blocked", `--fog` | **17.1** | solid discs |
| Slate → `#5C6E87` | "blocked", `--fog` | **21.8** | solid discs |

Three of the five have nothing to do with red, which is why the fix is a form
vocabulary that always holds rather than a branch that fires when the accent is
red. `hueFamily()` exists in `lib/theme.js` to EXPLAIN a colour to the
detailer, not to gate styling — see its header.

**The legend now decodes all five marks.** It decoded four of seven before,
which is how a red no-show dot sat on the month grid for months meaning nothing
to anybody. And the demo seed had neither a cancelled nor a no-show booking in
twenty-one rows, so none of this could be seen in a browser at all — both were
added in 2.4 (`scripts/seed-demo.mjs`). A status with no seed row is a status
nobody ever looks at.

*Replaced 2026-08-30:* confirmed = hollow ring `--bone-2`; completed/paid =
solid disc `--ac`; pending = hollow ring `--fog`; cancelled = solid disc
`--bad`; no-show = hollow ring `--bad`; blocked = solid `--fog` disc;
drop-off-only = hollow `--accent` ring.

**c. `.warn-box` stops being a warning.** Its one real use is *"N more
finished jobs still need payment recorded"*, which is a **thing to do**, not
an error — and it is already a `<button>`. It is drawn as a control now: a
panel, a `--line-2` edge, `--bone` text, and the accent on its marker.
`.error-box` keeps `--bad`; `.ok-box` and `.confirm-box` take `--ac`.

## 6. Which one is lit — a rule that nearly got lost

`docs/ux-audit.md` gap **G1** ("which light wins") was written into the OLD
design system in 2026-08-28 and **did not survive the rewrite to "The
Thread"** — that file has no section by that name, and the test that used to
assert it now checks something else. Checked in 2.3 and recorded here, which
is the right home for it now, because it is a dashboard rule rather than a
system-wide one. The behaviour itself never broke: it is still encoded in
`screens/Today.jsx` (`needFinalize[0] ?? the next confirmed job`).

**At most one object on a screen is lit, and this is the order:**

1. **Money not yet recorded** — a finished job with no payment against it.
   That is what the day is actually waiting on.
2. **The current or next job.**
3. **An unsaved setting.**

**ROADMAP 2.11 STEP 4 ADDS ONE ABOVE ALL THREE, AND IT LANDS WITH 2.12.** *A
booking waiting for you to accept it* becomes the first item on this list.
Unrecorded money is money you already hold and can write down tonight; an
un-accepted request has a customer at the other end of it who does not know
whether they are booked, and it goes stale on its own. It is the only object on
the screen with somebody else waiting on the answer.
`docs/dashboard-screen-designs-2026-08-31.md` §1b. ~~**Nothing changes until
roadmap 2.12 ships the request status.**~~ **SHIPPED 2026-09-02, roadmap 2.12.**
`screens/Today.jsx` reads it as written: when `requests.length > 0` the rail has
NO lit card at all and `lit` is null, because at most one object on a screen is
lit and the request has taken it.

**The consequence, stated because it is a real cost and somebody will notice it
before they find this line:** while a request is waiting, the finished-and-unpaid
job loses its one-tap *Finalize payment* on Today and becomes a row like any
other. The action is still one tap away inside the record, and this is the order
saying what it says — a customer who does not know whether they are booked
outranks money the detailer is already holding. Reopen it with him if a real
detailer finds the trade wrong, not on a hunch.

Ties go to the earlier one. **A screen with no qualifying object has no lit
element at all** — nothing is promoted just to have something lit.

Under "The Thread" the lit treatment is the highest surface (`--ink-3`), a
`--line-2` edge and a soft accent bloom behind the card — never an accent bar
across its top, which is the named never-default the old `.lit` was.

The other two gaps that audit recorded DID survive, as system law rather than
dashboard rules: **G2**, two-to-four choices are a segmented control and never
a native `<select>` (`design-system.md` § Composition, and
`composition.test.mjs` test 2), and **G3**, a collection of records is a ruled
list and a card is for an object you act on (§ Composition, test 1).

## 7. Verification

Per `docs/design-system.md` § Verification: **1920 / 1440x900 / 768x1024 /
392x844**, console read at each, in the normal path and `?lite=1`, across all
five tabs and all eleven settings screens. Signed in as the seeded demo
owner, against real data.

The house palette is fixed (law 11), so there is no per-tenant retint to
sweep here — that check belongs to the booking page and to 2.4.
