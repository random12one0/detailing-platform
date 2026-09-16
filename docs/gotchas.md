# Gotchas — ways a measurement lies to you

Extracted verbatim from CLAUDE.md on 2026-09-16. Every one of these produced a false reading in this repo at least once. Read before trusting any browser measurement or grep-based check.

## FOUR WAYS A BROWSER MEASUREMENT LIES — every one has already produced a false reading, 2026-09-12

**All four were found in one day, three of them by an outside reviewer whose
tooling was sound.** A measurement is evidence only if you know what it counts.

**(a) A CLOSED `<details>` KEEPS ITS CHILDREN LAID OUT.** Chromium hides them
with `content-visibility: hidden`, which leaves elements measurable and
unpainted rather than removing them, so `querySelectorAll` and `getClientRects`
both report twelve buttons on a screen showing one row. **Count with
`el.checkVisibility({ checkVisibilityCSS: true, contentVisibilityAuto: true })`,
or measure the CONTAINER'S own `offsetHeight`** — never the child count. Cost:
a finished item reported as unfinished.

**(b) `innerText` INCLUDES `<option>` TEXT.** Every `<select>` in this product
therefore reads as a long inline list of values to any text extractor. That is
where *"twenty-four hours rendered as chips"* and *"the timezone list dumps
hundreds of cities"* both came from; both controls were ordinary closed
drop-downs. **If a description implies something is RENDERED and you measure a
`<select>`, the description is wrong, not the code — say so and stop.**

**(c) `pushState` DOES NOT RE-RENDER THE ROUTER'S HOST.** A sweep that
navigates that way measures ONE screen N times and comes back entirely green —
22 settings screens with byte-identical numbers. **Click the row.** This is the
repo's oldest failure wearing new clothes: a skipped check reads exactly like a
passing one.

**(d) A BACKGROUND TAB PAUSES CSS ANIMATIONS.** Every `section.tight` arrives
through the `arrive` keyframe, so in a tab that is not fronted they sit at
`opacity: 0` for ever. Two consequences: a visibility check including
`opacityProperty` calls the whole screen invisible, and **a screenshot of a
backgrounded tab shows an empty-looking page** — the probable cause of one
withdrawn "the left half of the screen is empty" finding. **Front the tab
before measuring opacity or taking a screenshot**, and where you cannot, use
`checkVisibility` WITHOUT `opacityProperty`.

**(e) A CLASS CAN BE ON BOTH A HEADER ROW AND ITS GRID, SO `querySelector`
RETURNS THE WRONG ONE.** The booking calendar renders TWO `.bk-cal` elements —
the weekday header (7 `.bk-dow`) and the day grid (32 cells). Reading the first
and finding seven children produced *"zero day cells, a customer cannot book"*
about a flow that works end to end. **Query ALL of them and assert the count
you expect; if the count surprises you, THAT is the finding, not the
contents.** And a disabled *Continue* is not corroboration — it is the correct
state when nothing has been chosen yet. Two wrong readings pointing the same
way feel like confirmation and are not.

**(f) A MEASUREMENT TAKEN WHILE SOMEBODY IS BUILDING IS WORTH NOTHING, AND
WORSE THAN NOTHING ONCE IT BECOMES A FINDING.** CLAUDE.md § Verification
already says do not EDIT `app/src` while a browser script runs; the other half
was missing and cost both sides of this pair an hour on 2026-09-12. A Vite hot
reload remounts components under a walk in progress, so a script that is four
steps into the booking flow measures a tree that was rebuilt beneath it —
**this is the most likely cause of the "zero day cells, a customer cannot book"
report against a flow that works end to end.** So: **verify against a COMMITTED
state with the builder idle.** While a wave is in flight, read and plan.

**(g) THE DEV SERVER IS NOT EVIDENCE. THE BUNDLE IS.** On 2026-09-12 the Vite
dev server on 5173 had been running since the previous night and was serving a
**stale CSS transform**: three edits to one file, one live in the browser and
two not, with the file on disk and the file Vite served BOTH carrying all
three. Two hours of "my rule is not applying" followed, and it was never the
rule.

**THIS ONE IS INVISIBLE AND IT INVALIDATES WORK SILENTLY** — nothing errors,
the page renders, and a measurement taken against it looks exactly like a
measurement. Worse, it cannot be told from outside WHICH stylesheet was stale,
so every CSS measurement taken against that server is suspect until re-checked.

**THE SEQUENCE, WHEN A CSS CHANGE MEASURES AS NOT-APPLIED.** Suspect the server
BEFORE the rule:

  1. `fetch('/src/…/file.css?direct')` — what the server is actually serving.
  2. `npm run build --prefix app`, then grep `app/dist/assets/*.css` — what a
     visitor actually gets. **This is the authority.**
  3. Only if both carry the change and the live document still disagrees is it
     a specificity or cascade problem worth chasing.
  4. Restart the dev server and re-measure. **Lane B owns the dev server**, so
     lane B restarts it.

**AND RESTART IT AT THE START OF A SESSION THAT WILL MEASURE CSS**, rather than
inheriting one somebody left running. A server old enough to be stale is also
old enough that nobody remembers starting it. **The owner may have been looking
at last night's CSS on localhost all day** without either side being able to
name why.

**(h) A CHECK THAT NAMES A SPELLING IS COUPLED TO THE SPELLING, NOT THE
BEHAVIOUR.** Three of the four `password-reset` failures were this and every
one failed on a product that was correct: `minLength={8}` against a rule that
became TEN; `type="password"` against a field that moved into `PasswordInput`
while the runtime selector still worked; and `padding-left: 120px` against a
rule renamed to `padding-inline` — **that last one was mine, introduced this
morning by a rename, and the break said nothing about the rename.** Assert the
shared constant, the component, or the behaviour. **And count, do not merely
match:** two of today's rewritten checks passed with one of two subjects
broken.

**(i) WHEN COPY ON A CARD CHANGES, RE-READ THE WHOLE CARD — THE BUTTON IS
COPY TOO.** `/reset`'s sentence was corrected to "You will stay signed in" and
the button under it still said "Save it and sign me in" for hours. Same shape
as "Text these 1" being fixed while "Email these 1" sat an inch away. **The
button is the last thing read before pressing**, so it is the worst place to
leave a stale promise.

**(j) REPORT THE REPRODUCTION SEPARATELY FROM THE EXPLANATION, AND DO NOT
WITHDRAW THE REPRODUCTION WHEN THE EXPLANATION DIES.** On 2026-09-12 a reviewer
twice reported `/reset` as broken and twice gave the wrong cause — first "the
flow is uncompletable", then "the session beats the recovery hash". Both
explanations were false. **Both reproductions were exact**, and the thing
underneath them was a lockout neither side had thought of: `detectSessionInUrl`
clears the hash after exchanging the token, so **pressing reload** on the
recovery page yields a session with no hash and drops the person onto the
change-password form, asking for the password they just said they had lost.
**A wrong diagnosis attached to a real observation is still a real
observation.** Keep the steps; let the cause be wrong.

**(k) A CHECK THAT GREPS SOURCE TEXT ASSERTS HOW SOMETHING IS WRITTEN. ONLY A
CHECK THAT READS A COMPUTED VALUE OR A RENDERED RESULT ASSERTS WHAT IT DOES.**
Three in one day, all failing on a product that was correct: `padding-left:
120px` renamed to `padding-inline`; `minLength={8}` against a rule that became
`MIN_PASSWORD`; and `.ld .nav .burger { display: none; }` breaking because a
tap-target floor was added to that same rule. **Three is a pattern, not three
accidents.** Where a source check is the only instrument available — this repo
has no React test runner — say so IN the check, assert the shared constant or
the component rather than the spelling, and **count rather than match**. A pass
over the suites for the others is owed; `ROADMAP.md` carries it.

**(l) A SCRIPTED CLICK IS NOT A GESTURE, AND `window.confirm` BLOCKS THE
SCRIPT THAT WOULD READ IT. Andrew's method, 2026-09-12 — it is the answer to
"I cannot make this control fire", which cost this repo most of a session.**
Two separate problems wearing one symptom, and each needs its own half:

  1. **Click by the ACCESSIBILITY-TREE REFERENCE, not `el.click()`.** A
     synthetic `.click()` on a checkbox React controls can leave `onChange`
     unfired, and `focus()` no-ops entirely in a browser pane whose document is
     not focused — so click, keypress and focus all silently do nothing and the
     control looks dead. Driving it by its tree reference delivers a real
     gesture and React sees it.
  2. **STUB `window.confirm` BEFORE THE CLICK — return `false` and record the
     argument.** A native confirm halts the page, so a script that clicks and
     then looks has nothing to look at, and returning `false` means the test
     costs nothing: the control stays as it was and no data moves.

**It is also the only way to assert the WORDS of a native confirm**, which is
otherwise unreadable from a script and is therefore the easiest string in a
product to leave untranslated. **Verified working:** the blockout switch fired,
`confirm` recorded the exact sentence, cancelling left the checkbox checked and
the seeded blockout intact.

**(m) A FULL-BLEED `vw` TRICK OVERFLOWS WHERE THE SCROLLBAR AND THE LAYOUT
VIEWPORT DISAGREE MOST, WHICH IS NOT WHERE IT GETS REPORTED — 2026-09-12.**
`100vw` INCLUDES a classic scrollbar and the layout viewport does not, so
`margin:0 calc(50% - 50vw)` bleeds by half the scrollbar width. **An OVERLAY
scrollbar makes that bleed exactly zero**, so a preview pane reads clean while
a real browser scrolls sideways — `y-kinzie` swept clean at 320, 377 and 392,
at eleven scroll positions each, with a per-element right-edge scan, and was
eight pixels over at 1440 (scrollWidth 1433, clientWidth 1425).

**AND `body{overflow-x:clip}` IS NOT A GUARD.** `overflow:hidden` propagates
from body to the viewport; **`overflow:clip` does not.** It clips the body box
and nothing else, so the page still scrolls. It has to be on `html` —
`w-delgado` carries `html,body{overflow-x:clip}` and was the one site of five
without the fault. **Fixing the narrow case can leave the wide one standing:
check both widths, in a browser with a real scrollbar.**

**(n) A HIT AREA IS NOT A BOUNDING RECT, SO A RECT-BASED TARGET AUDIT
UNDER-REPORTS AND WILL FAIL CORRECT WORK — the reviewer's own trap, written
down by him, 2026-09-12.** A pseudo-element with a negative `inset`, or padding
on an inline child, extends what a POINTER can reach **without changing what
`getBoundingClientRect` reports.** `y-kinzie`'s dot rail still reads 7x7 by
rect and every anchor is a 32x32 target.

**THE INSTRUMENT IS `elementFromPoint`, PROBED AT THE OFFSETS YOU CLAIM TO
COVER** — centre, and ±4, ±10, ±15 — asserting that each probe returns the
control itself.

**AND FOR A ROW OF CONTROLS YOU MUST ALSO CHECK THE PITCH, because two 32px
targets 18px apart do not both exist.** They overlap and steal each other's
presses, which trades a small target for a WRONG one. Measure the tops and
assert the spacing: the fixed rail reads 351, 383, 415, 447, 479, 511, 543 —
exactly 32 — and zero overlapping pairs.

**(o) A HIDDEN BROWSER PANE DOES NOT RUN `requestAnimationFrame`, SO ANYTHING
THAT PLANS IN A rAF LOOP DRAWS NOTHING AND READS AS DEAD — 2026-09-13, and it
cost a session an hour.** The pane does not have to be closed; it only has to be
hidden behind another. Chromium throttles rAF in a non-visible surface to zero
callbacks, so a component that measures, lays out or paints inside
`requestAnimationFrame` never gets its first frame.

**WHAT MAKES THIS ONE WORSE THAN (d) IS THAT EVERY INSTRUMENT SAYS THE PAGE IS
FINE.** `document.visibilityState` still reads **`visible`** — it describes the
TAB, not whether the compositor is producing frames — nothing throws, no console
error appears, `readyState` is `complete`, the DOM is fully built, and
`getBoundingClientRect` returns real boxes for everything the rAF pass never got
to. A screenshot of it is a page with a hole in it, and the hole looks exactly
like a broken feature.

**IT IS THE SIBLING OF (d), NOT A DUPLICATE.** (d) is CSS animations pausing, so
elements sit at `opacity: 0` and a visibility check calls the screen invisible.
This is JavaScript scheduling stopping, so elements are never written at all —
and unlike (d) it cannot be worked around by dropping `opacityProperty` from
`checkVisibility`, because there is nothing in the tree to check.

**SO FORCE A PAINT BEFORE BELIEVING A SCREEN IS BROKEN.** Front the tab
(`tabs_select`, or `computer{action:"screenshot"}` on the fronted pane), then
re-measure. Where the surface cannot be fronted, wait on the thing itself rather
than on a frame — `until(() => el.count() > 0, 20000)`, which is the same fix
e2e-booking’s calendar race took. **A `settle()` of N milliseconds is not a
substitute: in a hidden pane no number of milliseconds produces a frame.**

**AND THE GENERAL FORM, WHICH IS THE PART THAT TRANSFERS:** when a screen reads
as dead and nothing anywhere reports an error, suspect the HARNESS before the
product — same reflex as (g), where the dev server was stale and two hours went
on a CSS rule that was always correct.

**AND THE RULE THEY SHARE, WHICH IS THE ONE TO REMEMBER:** a green result from
an instrument nobody has checked is worth less than no result, because it stops
the search. `scripts/sweep-widths.mjs:605` printed *clean* over 38 real
findings; `tests/spanish.test.mjs` passed 58 while half a screen rendered
English; the `pushState` sweep passed 22 screens it never visited. **Break the
instrument on purpose before you believe it.**

**THE EM DASH HAS THREE SHAPES AND THREE TREATMENTS — settled 2026-09-12,
after a sweep found that the rule as first written named only two.**

- **A SENTENCE JOINT DIES.** *"You brought in $300 and spent $433 — that is $133
  down."* The dash is standing in for a full stop or a comma, so use one.
- **A PARENTHETICAL PAIR STAYS.** *"One-off changes — a day off, different hours
  for a single date, or a drop-off-only stretch — are set on the Calendar."*
  Two dashes around an aside is correct English and some of the best writing in
  this product. Leave it alone.
- **A LABEL SEPARATOR BECOMES THE MIDDLE DOT.** *"Travel — {zone}"* becomes
  *"Travel · {zone}"*; *"Also booked — 2 more cars"* becomes *"Also booked · 2
  more cars"*. **The product already owns this** — *"Tue-Sat · 8:00 AM - 6:00
  PM"*, *"1 link · 45 opens"*, *"Full Interior Detail · Mobile"* — so the answer
  was already in the codebase rather than needing to be invented.

**AND SWEEP THE DATA FILES, NOT ONLY THE CALL SITES.** A sweep for `t("…tap")`
across `app/src/**/*.jsx` found five strings and missed a sixth: `lib/setup.js`
holds its copy as **plain object values** that something else passes through
`t()` later, so the word is in a `.js` data table and not in a `t(` call. Same
family as the join above — **the sweep looked for the CALL and the content was
somewhere else.** `lib/setup.js`, `lib/templates.js`, `lib/password.js` and the
two string catalogues all carry user-facing prose this way.

**AND SWEEP THE JOINS, NOT ONLY THE STRINGS.** One dash survived a sweep that
took 65 others: `Beyond 15 miles — +$40` on booking step 4, where a travel
area's NAME is joined to its FEE at render time. The dash is in a template
literal, not in a `t("…")` string, so a literal sweep returns zero and the next
person believes it. Grep for an em dash inside template literals and array
joins as well.

**THE GENERAL MISTAKE, WHICH WORE FOUR COSTUMES IN ONE DAY:** treating a
RENDERED RESULT as if it were the thing that produced it. *"1 visits"* from an
unguarded plural, twelve `Add a line` rows that were one collapsed row, two
`.bk-cal` elements read as one, and now a dash that exists only after two
values meet. **Measure the render; then go and find what produced it.**

**AND THE FOURTH AXIS IS NOT A SHAPE AT ALL — IT IS WHOSE WORDS THEY ARE.**
The customer plans page carries *"Two visits a month — one full exterior, one
interior refresh."* By the three shapes above that is a sentence joint and a
colon fixes it. **It is not our sentence.** It is `plans.description`, which a
detailer writes about his own business, and the block beside it holds his
"Exterior wash, wheels and glass every other week, plus a quick interior
wipe-down."

**PRODUCT COPY FOLLOWS THESE RULES. CONTENT A DETAILER AUTHORS DOES NOT.**
Policing it would be us editing his voice inside his own product, and the
never-defaults are about what WE write. **So a sweep that reaches a database
column holding somebody's own words stops there** — service names and
descriptions, plan descriptions, FAQ answers, reviews, message templates once
edited, anything typed into a settings field.

**AND A STYLESHEET CAN EDIT A USER'S WORDS TOO — Claude Cowork's ruling,
2026-09-12. The axis holds in CSS, not only in copy.** `.advmeter.cap` carried
`text-transform: capitalize` so the four expense categories would read *Product,
Gas, Equipment, Supplies*. Choosing *other* on the expense form stores whatever
the detailer TYPED as the category, so the same rule rewrote his "microfiber
towels (bulk)" into "Microfiber Towels (Bulk)". **The comment above that rule
had admitted the problem for months** — *"an expense category is whatever the
detailer typed… this is a display rule"* — which is the tell that somebody knew
and reached for a stylesheet anyway.

**HIS TWO REASONS, AND THE SECOND IS THE ONE THAT GENERALISES:**

- **`text-transform` cannot tell whose words it is transforming.** The
  distinction this whole section is about is one the instrument is incapable of
  making, so it is **the wrong instrument, not a wrong setting.** No value of
  `text-transform` fixes it.
- **CAPITALISATION IS NOT UNIVERSAL.** Spanish does not capitalise common nouns,
  so *"Producto"* and *"Gasolina"* were wrong the moment the language toggle
  existed, and a CSS rule cannot know that either. **A rule that decides casing
  decides it for every language at once.**

**SO THE CAPITAL GOES IN THE STRING.** `ExpenseModal.jsx`'s `CATEGORY_WORDS`
maps the stored token to the English word, `appEs.js` carries the Spanish in the
case Spanish wants, and a token in neither is the detailer's own — it misses the
map, misses the catalogue, and renders exactly as he typed it. **The general
form: any display-layer transform of text — case, truncation, an added suffix,
a forced ellipsis — is a rule about words, so ask whose words can reach it
before you write it.**

**THE ONE THING THAT DOES FOLLOW: THE SEED IS OURS.** `scripts/seed-demo.mjs`
is what every demo, every screenshot and every sales conversation shows, so it
models the writing we would want even in fields we do not govern. Fix the seed
string; leave the rule alone.

**A COUNT OF DASHES CANNOT TELL THESE APART, so this is done by hand.** A
single dash is not automatically a joint: 65 user-facing strings carried one
and roughly a third were labels. Classify, then apply.

**THE VOICE IS PLAIN AND DIRECT, AND THIS RULE IS FIRM.** All text stays in the
voice the product already has. No startup register: nothing "seamless",
"effortless", "powerful", "supercharged", "take it to the next level", "we've
got you covered". No exclamation marks. No rhetorical openers. Short
declarative sentences, one fact each. The writing already in this product is
good — the "Your web address" screen, the FAQ answers, "Nothing is saved and no
time is taken". Match that and do not invent a new voice. If a sentence sounds
like a landing page, cut it.

**RESOLVED 2026-09-12, by the reviewer under Andrew's delegation that morning
— and it is a SPLIT, decided by whether the screen is being built or already
exists.** The exhaustion test above and design-system law 1 were two answers to
one question. Law 1 says *one continuous ground, and every section a different
skeleton over it — two sections that share a skeleton is the failure*, and
`tests/composition.test.mjs` enforces it.

- **Anything built or rebuilt from here: law 1 stands, unchanged, test and
  all.** It is not weakened, and the exhaustion test does not excuse a new
  screen from it.
- **A screen that already exists and already shares skeletons: the exhaustion
  test governs.** We do not tear a working screen apart to satisfy law 1.
- **If the composition test complains about an untouched old screen, that goes
  in `FOUND.md`** — it does not become a reason to rebuild the screen around
  it.

The reasoning: law 1 is about what a page is composed OF and answers best while
a page is being composed; the exhaustion test is about what a finished page
COSTS to read. Applied to new work they agree. Applied backwards to shipped
work, law 1 turns into a demand to rewrite screens nobody has complained about,
which is the opposite of why the exhaustion test was written.
