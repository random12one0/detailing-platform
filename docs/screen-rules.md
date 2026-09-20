# Screen rules

Extracted verbatim from CLAUDE.md on 2026-09-16. These are Andrew's own rulings from a review of ~35 screens; nothing here is edited.

## SCREEN RULES — Andrew, 2026-09-12

From a review of about 35 screens at desk and phone width. They apply to every
screen a detailer or a customer sees.

**The reference for any design decision is this product's own best screens, not
outside best practice.** Those are the seven-step booking flow, the writing on
the "Your web address" settings screen, and the job page layout.

**AND THE JOB PAGE IS THE REFERENCE FOR A DESTRUCTIVE ACTION — measured
2026-09-12, and it satisfies the whole criterion in one place.** Delete sits
behind a `details.disclose` so the dangerous thing takes a deliberate press to
reach; the copy says what it does that the REVERSIBLE thing beside it does not
(*"Cancelling frees the slot and keeps the job in your history. Removing takes
it out of your records and your totals as well. It cannot be undone."*); and
the button is `.btn.danger`, the one colour this theme reserves for harm.
**The distinction is deliberate rather than accidental:** "Didn't show up" and
"Cancel the job" sit beside it at the same size and do NOT take `--bad`,
because they are outcomes a detailer can live with rather than deletions. **So
`--bad` means "this destroys something" in this product, consistently.**
**Copy it rather than designing a second answer** — the client record had a
plain `--bone` button with no heading, no fold and no explanation ten feet
away, and the fix was to port this pattern word for word.
Two things this pattern gets wrong and a copy should not: **phrase the summary
as the SUBJECT, not a command** (*"Removing it from your records"*, not
*"Remove this…"*, which reads as a button that acts and invites a press past
the sentence that is the point of the fold), and **give it a heading that
describes the ACTION** — the job page's sits under "Change the time or
details", which is about editing. When unsure,
copy the best screen that already exists here rather than importing a pattern
from somewhere else.

**Make setup look like booking.** The booking flow asks a customer about ten
questions. Setup asks a detailer about forty. That is the problem to solve.

**THE TEST — AND IT IS A TEST, NOT A QUOTA. Before finishing any screen, ask
whether a detailer would find this page exhausting.** If the answer is yes, the
fix is to present some of it differently — chips, cards, a bar, a grouped pair,
a live preview, bullets — using the components this product already has. Not to
hit a number of anything.

**THE FAULT IS MONOTONY, NOT SIMILARITY.** Screens can look alike, and often
should. The advanced money screen is the example: nearly every block is the
same shape, a label on the left and a number on the right, all the way down the
page. Same format forty times is what made it feel like work. The one block on
that page that breaks the pattern, "WHERE IT WENT" with its bars, is the one
that reads fastest. That is the counter-example that proves the point.

**A rule would be worse than the test here, because a rule can be satisfied
without fixing the problem.** Splitting twelve identical rows into two blocks of
six meets a quota and changes nothing about how the page reads.

**Two to five choices is a segmented control, never a native `<select>`.** This
is `docs/design-system.md` § Composition, it is existing law, and it is cited
here rather than restated in weaker words. A draft of this section said *prefer
chips or cards for four or fewer* and that was wrong twice: it softened an
absolute rule into a preference, and it stopped at four where the law goes to
five. **The rule is about the `<select>`, not about the count** — a fifth
mutually exclusive choice does not become a drop-down, it wraps. Use
`Segmented` from `components/controls.jsx`.
**The searchable-list exemption already exists in code, so nothing about
behaviour changes.** `tests/composition.test.mjs` test 2 skips any `<select>`
whose options come from `.map()`, on the stated grounds that a mapped list is a
searchable list and not a two-way choice. The US timezone picker is that case.

**Size every field to its content.** A year is 6ch, a phone 16ch, an address
full width. Two short fields share a row.

**A TITLE IS NOT A QUESTION AND NOT A FULL DECLARATIVE SENTENCE. A SHORT
IMPERATIVE THAT NAMES THE ACTION IS CORRECT.** *"Pick a time"* and *"Check
everything over"* are right and stay exactly as they are. What is banned is a
question put to the reader as a heading, and a clever or rhetorical line.

**THE FIRST VERSION OF THIS RULE SAID "a noun phrase, not a sentence and not a
question" AND IT WOULD HAVE REWRITTEN BOTH OF THE TITLES ITS OWN AUTHOR HAD
JUST APPROVED.** That is the tell that a rule is wrong rather than the work
being wrong, and it is worth keeping the correction visible: a rule whose
examples fail it will be applied literally by the next session, which will then
"fix" screens nobody complained about.

**AND EVERY BOOKING STEP'S TITLE COMES FROM ONE FUNCTION IN
`app/src/book/BookingPage.jsx`, NOT FROM THE STEP FILE.** A sweep of
`book/steps/` finds no headings at all and reports the flow clean. That is a
real audit that returned a false pass on 2026-09-12.

**`.lab` IS A SECTION EYEBROW, SO ONE PER SECTION — NOT ONE PER FIELD.** The
11px uppercase label is already the `.lab` role in `docs/design-system.md`
§ Type and it is already correct; there was never anything to fix about caps
themselves. The defect is quantity. **Setup step 4 uses twenty of them on one
screen, which is twenty eyebrows** — an eyebrow that appears above every field
has stopped marking where a section begins and has become the field label, at
which point the screen is shouting twenty times and nothing is emphasized.
A draft of this section said *sentence case labels, caps only for an eyebrow*,
which named the wrong culprit.

**One currency formatter, one date formatter, one phone formatter, used
everywhere.** Two of the three exist: `app/src/lib/format.js` is the single
module and holds `money`, `time12`, `duration`, `dateLong`, `localDate` and
`localTime`. **There is no phone formatter anywhere in `app/src`** — measured
2026-09-12. That one is unbuilt rather than violated, and it goes in
`lib/format.js` beside the others in Wave 0.

**THE GREEN IS CORRECT AND IT IS NOT A FINDING.** `--ac: #38E08B` in
`app/src/theme.css` is the accent token the whole product is built on, and
`docs/design-system.md` § The one sharp accent is where it is defined. An
outside review of 2026-09-11 called it off-palette on the sign-in and
unsubscribe buttons; **that reading was backwards — those buttons are the one
place it is meant to be.** Nothing was changed on the strength of it. Written
down so the finding is not acted on later by somebody who only meets the
report.

**A DECORATIVE CONTROL THAT IS DELIBERATELY SMALL KEEPS ITS SIZE AND GROWS ITS
TARGET. THE MARK AND THE TARGET ARE TWO DIFFERENT THINGS — 2026-09-12.** A 7px
scroll-rail dot, a carousel pip, a colour swatch: the painted thing is the
design and it is right, and shrinking the design to satisfy a floor is the
wrong answer. Pad the ANCHOR with an absolutely positioned `::after`, which
takes no part in layout, until the hit area reaches 32.

**Two ways this goes wrong, and both were live on `y-kinzie`.** If the PITCH is
under 32 the boxes overlap and each control steals its neighbour's presses, so
the GAP has to open until the targets tile exactly — padding alone makes
neighbours fight. And a `transform:scale()` marking the CURRENT item **scales
its pseudo-element with it**: put the scale on the paint, never on the anchor,
or the item you are already on grows a 48px box and eats 8px of the ones beside
it. Read (n) above for how to measure any of this, because none of it shows up
in a bounding rect.

**Never remove a field because software filled it in.** Prefill it and let the
person correct it.

**WHEN A BUTTON'S WORDS AND THE PRODUCT'S SURFACES DISAGREE, CHANGE THE
WORDS — 2026-09-12.** Three landing-page CTAs promised a demo and delivered a
price list. Two were fixed by pointing them at what they named. The third,
*"Look inside the dashboard"*, had **nowhere to point**: `/app` renders
`<Auth />` without a session and `/preview` is correctly guarded as the back
office's door, so there is no signed-out dashboard in this product at all.
**Building one to justify a button is the tail wagging the dog.** It says "See
what the dashboard does" now and points at the section that already shows it.
And the quieter half of the same rule: *"See it with your name on it"* pointed
at `/examples`, which is the right destination and shows five OTHER businesses,
so the words were wrong there too. **A promise a surface cannot keep is a
copy bug, not a missing feature.**

**THE KIT IS `app/src/components/controls.jsx` AND YOU REACH FOR IT BEFORE YOU
WRITE A COMPONENT.** `Setting`, `Switch`, `Segmented`, `DurationChoice`,
`Stepper`, `MoneyField`, `HourChoice`, `Group`, `PasswordInput`, and **`Folded`**
— a settings row that states its current value and opens onto the settings it
has put away, for the ones with a default nobody changes. `Folded` is the
Business tab's own `.nav-row` used as the `<summary>` of the native `<details>`
behind `.disclose`: two of this product's patterns meeting, not a third idea.
**Its summary must state the CURRENT SETTING in words** — a row that says only
"Reminders" has hidden something, where "Reminders · one the day before, one
three hours out" has answered it. A caller that cannot write that sentence
leaves its settings open instead. If none of the kit fits, ask before building.


---

## A PINNED BAR IS A BAND OR AN OBJECT, AND ITS CORNERS SAY WHICH — Andrew, 2026-09-18

He turned down the job record's action bar twice in one day, and the second
time named the rule the first fix had broken: *"it's very square whereas
everything else is like rounded and it just looks a little like weird."*

**If it reaches the edges of what it sits in, it is a BAND: square, with a
hairline under it.** That is the slide-up sheet, where the bar is the sheet's
own header tray and a radius would be a corner cut out of a wall.

**If it sits inside the margins, level with the cards, it is an OBJECT: it
takes the same 12px `--r-panel` they take.** That is `/job/:id` and the desk's
second column. A square box on a screen where everything else is rounded reads
as broken even when its geometry is perfect — the first repair measured
correctly at four widths in three containers and he rejected it on sight.

**And whatever is above it gets real clearance.** The two status pills sat flat
on the bar's top edge, measured at **0px in all three containers** — *"the
completed unpaid and planned member rate all like touch this kind of box."* A
pinned bar is a separate object from the thing above it and has to look like
one before it moves.

**The thing that made this hard to see from code:** which one a bar IS cannot
be read off its container. `.record-body` carries no padding — the 18px of
margin a person plainly sees belongs to `.record` outside it — so a check
asking "does the bar reach its scrollport's edge" called the desk panel's bar
a band and demanded square corners on the one place he could see they were
wrong. **Ask the CARDS.** Wider than them is a band; level with them is an
object. `scripts/pinned-bar.mjs` asks it that way.
