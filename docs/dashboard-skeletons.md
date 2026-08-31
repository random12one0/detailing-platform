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
down the left of the day, with a node per job. The node is a hollow ring
while the job is ahead and a solid `--ac` disc once it has landed. Nothing
else in the product uses a rail, so Today is unmistakable at a glance, and it
is the same "scattered becomes ordered" reading the approved page opens with.

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
| **Calendar** | a seven-column grid; History is a filtered ruled list | the only grid |
| **Money** | one display-sized lead figure, a six-bar chart, then a paired-cell ledger | the only chart |
| **Clients** | a full-bleed ruled list, no panels at all | the only screen with no panel on it |
| **More** | grouped panels of self-answering nav rows | the only screen made of panels |

Each is structurally different from the other four, and each shape follows
from what the screen holds rather than being applied to it.

**The eleven settings screens are one skeleton on purpose: a form in a
sheet.** They are not sections of a continuous page — they are modal panels
reached one at a time, and a person never sees two of them together. Law 1
governs what is on screen at once. What varies between them is their internal
structure (a list, a form, a grid), which follows the content.

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
| drop-off only | hollow **square** | `--accent` | a day with a constraint |

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
