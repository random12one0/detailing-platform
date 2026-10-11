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


---

## A SOURCE FILE CAN HOLD A CONTROL CHARACTER THAT NOTHING WILL SHOW YOU — 2026-09-18, ROADMAP 5.3

**What happened.** A regular expression written into `BookingDetail.jsx`
through a script came out as `/^(receipt|recibo)<0x08>/i` — a literal
**backspace byte** where `\b` was meant. It matched nothing, so the job record
offered to send a receipt that the list three lines below it showed had already
gone.

**Every tool said the code was fine, and that is the entry.**

- `grep` printed the line and it read `/^(receipt|recibo)\b/i`.
- Fetching the module Vite was serving and slicing it in the browser console
  printed `\b` too — because the tool serializing the result as JSON renders
  character 8 as the escape `\b`, which is exactly what the correct source
  looks like.
- Typing the same regex by hand into the console and testing it against the
  same subject returned `true`, because the hand-typed one was correct.
- A React fiber walk confirmed the state was right and the derived boolean was
  wrong, which reads as a React problem and is not one.

**What actually found it:** mapping the served file to character codes.

```js
[...text].map(c => c.charCodeAt(0) < 32 ? "<" + c.charCodeAt(0) + ">" : c).join("")
```

**Two rules.**

1. **When code is correct on inspection and wrong at run time, check the
   BYTES** before you check your reasoning about React, caching or the dev
   server. Twenty minutes went into those three first.
2. **After writing source through any script, scan what landed.** A one-line
   sweep over the files a change touched, failing on any character under 32
   that is not tab, newline or carriage return:

```js
[...require("fs").readFileSync(f, "utf8")]
  .some(c => c.charCodeAt(0) < 32 && ![9, 10, 13].includes(c.charCodeAt(0)))
```

**And do not trust `grep -P` to do it for you** — the first attempt used
`grep -cP '[\x00-\x08...]'` with a `|| echo 0` fallback, `-P` is not compiled
into this machine's grep, and the fallback printed `0` for all eight files. **A
scan that cannot run printed the same answer as a scan that found nothing**,
which is this repo's whole subject arriving inside the tool written to check
for it.

---

## A DECLARED COLOR IS NOT A PAINTED ONE, AND A SCREENSHOT TAKEN TOO SOON IS THE PREVIOUS FRAME — 2026-09-18

Both found in one afternoon, fixing the job record's pinned action bar
(FOUND.md). Two assertions passed, one over a defect and one over a fix, and
the only reason either was caught is that somebody opened the PNG.

**(a) `getComputedStyle(el).backgroundColor` TELLS YOU WHAT THE ELEMENT
DECLARES, NOT WHAT THE PERSON SEES.** The first repair painted the pinned bar
`var(--bg)` so it would match the page it sits on. `--bg` is `#0B0D0E`. The
page as rendered at that spot is `rgb(17, 22, 24)`, because `.app-shell`
carries two atmosphere gradients and a dot lattice ON TOP of `--bg` — so an
opaque `--bg` band is a visibly DARKER rectangle on a lit ground. A check
comparing the bar's declared colour against the cards' declared colour said
they differed and went green over it.

**Sample the image.** Screenshot, `drawImage` onto a canvas,
`getImageData`. No dependency — the browser you are already driving decodes
its own PNG.

**And where the answer depends on what is underneath — a shadow, a blur, a
translucent fill — compare TWO RENDERS OF THE SAME FRAME rather than two
places in one.** `scripts/pinned-bar.mjs` photographs the bar, injects
`box-shadow: none`, photographs it again and subtracts. Every pixel that is
not the shadow is identical in both, so nothing in the content can be mistaken
for the effect. The version before it read `rgb(141, 142, 140)` off the middle
of a letter and called a 97-level step a failure.

**(b) A PAINT-ONLY CHANGE ON A COMPOSITED LAYER IS NOT IN THE NEXT
SCREENSHOT.** The pinned bar has `position: sticky` and `z-index: 3`. Adding
a stylesheet that removes its `box-shadow` and screenshotting immediately
returned the frame from BEFORE the change at four targets out of sixteen —
`0.00 difference` over a shadow that profiles at twenty-one levels when the
frame is held still. Not all sixteen: it is a race, so it fails
intermittently, which is worse.

**Take both frames with `screenshot({ animations: "disabled" })`.** It freezes
the render and settles the compositor, and it kills a second lie in the same
stroke: the dot lattice DRIFTS, so two ordinary screenshots of the "same"
frame differ a little no matter what you changed — a floor of noise a real
failure can sit inside.

---

## A SCREENSHOT TAKEN TO SERVE AN ASSERTION IS NOT A PICTURE OF THE SCREEN — 2026-09-18

`scripts/pinned-bar.mjs` shot the job record at four widths, twice each,
in three containers — sixteen screenshots, all kept as artifacts, all
looked at. Andrew then opened the page and named two defects in one
sentence: the status pills were touching the pinned bar, and the bar was
square on a screen where everything else is rounded.

**Neither was in a single one of those sixteen frames**, and it was not bad
luck. The check scrolls 300px before shooting, because its `edge` assertion
needs content passing under the bar. At that scroll the pills are hidden
BEHIND the bar, and the bar is flush against the viewport's top edge, where
corners cannot be seen. The camera was pointed exactly where the assertions
were and nowhere else.

**Keep the frame a person actually gets, separately, whether or not any
assertion needs it.** The file now writes `<target>-at-rest.png` before
anything scrolls, alongside the scrolled frame the numbers came from. Thirty-
four artifacts instead of seventeen, and the second seventeen are the only
ones that would have caught what he caught.

**The wider rule, and it is the older failure in this repo wearing a new
hat:** a check defends the rules somebody thought of. Scrolled geometry was
measured to four decimal places while corner radius and vertical rhythm had
no question asked about them at all, so the run came back green and agreed
with its author. **Ask what the screenshot does NOT contain before believing
a green run that has one attached.**


---

## A GEOMETRY SWEEP CAN CATCH AN EXIT ANIMATION MID-FLIGHT AND REPORT IT AS AN OVERFLOW — 2026-09-21

**`sweep-widths.mjs` reported seven findings on `guide · calendar 5` at 1920:
`div.col-2.leaving` **46px past the viewport**, `section.daypanel` and four of
its children the same, and **the whole page draggable sideways by 51px**. Every
number was real. The surface has no defect.**

**WHAT IT ACTUALLY CAUGHT.** `.col-2.leaving` is the calendar's day panel on its
way out. `@keyframes column-out` fades it to `opacity: 0` while translating it
`14px` right, and `theme.css` re-centres the month grid **the moment `.leaving`
is set** rather than waiting for the unmount — deliberately, and the rule says
so. So for about **120 milliseconds** the panel is painted at its old width
against a layout that has already moved on, and it hangs off the right edge.

**MEASURED, BOTH DIRECTIONS, 2026-09-21 at 1920x1080 against `demo-detail`:**

| when | day panel right edge | page scrollable | opacity |
|---|---|---|---|
| open, at rest | **138px INSIDE** the viewport | 0px | 1 |
| exit + 0 / 30 / 60ms | 138px inside | 0px | 1 |
| exit + 100ms | **+33px OVER** | **+38px** | **0.081** |
| exit + 150ms | **+44px OVER** | **+49px** | **0.012** |
| exit + 220ms onward | element gone | 0px | — |

**The sweep's +46px and +51px sit inside that window.** At the moment it
measured, the thing it was measuring was **about one percent visible and on its
way to zero**.

**WHY THE CLASS NAME IS NOT THE EVIDENCE.** `leaving` in the selector is
suggestive and proves nothing — a class called `leaving` on an element that
genuinely overflows at rest would be a real finding. **The only thing that
separates the two is whether it HOLDS STILL**: sample the same geometry
repeatedly while touching nothing. Three passes at rest read `-138px` and
`pageScroll 0` every time; the overflow exists only while the animation runs.

**AND THE HONEST RESIDUE, because this is not quite nothing.** The page really
is horizontally scrollable for those ~120ms. Nobody can see the element causing
it, but a flick during the window would move the page. That is a different and
much smaller claim than "the calendar overflows at 1920", which is what the
findings read as.

**THE TRAP FOR THE NEXT READER.** This is the same family as the two entries
above — a screenshot taken too soon is the previous frame, a screenshot taken to
serve an assertion is not a picture of the screen. **All three are an instrument
answering truthfully about an unfinished moment.** The defence is the same one
every time: before believing a transient-looking finding, re-ask it after the
motion has stopped, and say which reading you are quoting.

---

## A PROBE THAT CANNOT TELL A FAILED READ FROM AN EMPTY ONE REPORTS THE MOST ALARMING ANSWER, CONFIDENTLY — 2026-09-21

**A cleanliness check, written to confirm a tenant had survived a run,
announced `demo-detail: MISSING`.** The tenant was fine. It had never been
touched. The probe was wrong, and nothing about its output said so.

**THE MECHANISM, AND IT IS THREE LINES:**

```js
const d = await q("select slug, is_active from public.businesses where slug='demo-detail'");
console.log('demo-detail:', d.length ? 'present' : 'MISSING');
```

`public.businesses` has no `is_active` column — it is called `status`. So the
query **failed**, the API returned an **error object**, and `.length` on an
error object is `undefined`. `undefined ? … : 'MISSING'` took the false branch
and printed the worst sentence available about a live database.

**WHY THIS IS THE GENERAL CASE AND NOT A TYPO.** Every step behaved correctly
in isolation. The database refused a bad column, which is right. The API
returned an error, which is right. The probe asked "did I get rows back?" —
which is a reasonable question, and **it is not the same question as "did the
read succeed?"** A probe that does not separate those two collapses **three
outcomes into two**:

| what happened | what the probe saw |
|---|---|
| the row exists | present |
| the row does not exist | MISSING |
| **the read never happened** | **MISSING** |

**And the collapse is always toward the alarming answer**, because "no rows"
and "no answer" are both falsy, and the falsy branch is where the scary string
lives. A probe like this cannot report a boring failure. It reports a
catastrophe.

**WHAT TO DO INSTEAD, AND IT IS SMALL.** Check the transport before the
content: if the response is not OK, **throw** — never fall through to a verdict.

```js
const q = async (t) => {
  const r = await fetch(url, { ... });
  const j = await r.json();
  if (!r.ok) throw new Error("QUERY FAILED: " + JSON.stringify(j).slice(0, 160));
  return j;
};
```

The corrected probe said what the first one should have: `demo-detail
status=active`, with the real column name, and it failed loudly on the way
there when the column was wrong.

**THE FAMILY THIS BELONGS TO.** It is the same fault as
`/object/list` answering `200 []` for "denied" and for "nothing there", and as
`has_table_privilege` answering false for a column-granted table — both above.
**Three outcomes, two return values, and the one that is silently borrowed is
always the failure.** The difference here is that the borrowing happened in the
*checking* code rather than in the thing being checked, which is worse: a
product bug gets found, while a probe bug gets believed.

**AND IT IS WHY THIS ONE COST NOTHING.** It was caught within a minute,
because the answer was too alarming to accept without a second look — a tenant
vanishing during a run that never wrote to it is not a plausible result.
**A probe that had reported something boring and wrong would still be wrong
now.**

---

## A GUARD THAT WAITS FOR SOMETHING ALREADY ON SCREEN CANNOT FAIL — 2026-09-19, ROADMAP 8.1

Eleven dialogs were added to `sweep-widths.mjs`, and each one needed a guard
saying "the dialog actually opened". The first draft was
`appear(page.locator(".sheet"))`.

**Two of those dialogs open ON TOP of a sheet.** Finalize payment and Send a
text are opened from the job record, which below `--wrap` is itself a `.sheet`.
So the thing the guard waited for was on screen **before** the click, and the
guard returned true whether or not anything happened. A trigger that was
present but inert would have measured the screen behind it and filed the result
under the dialog's name.

**Count the subject before and after, never wait for its existence.** The guard
is `document.querySelectorAll(".sheet").length > n`, where `n` was read before
the click. Proved by repointing the new-booking trigger at the Today tab — a
real, visible button that opens nothing:

```
new booking    NOT MEASURED — the button was pressed and no new sheet arrived (0 open before, 0 after)
```

**And the general form, which is the one that transfers:** a guard is only a
guard if you can describe the state in which it fails. If you cannot, it is a
line of code that makes a run look careful.

---

## A LOCATOR CAN RESOLVE TO THE SCREEN BEHIND THE ONE YOU ARE MEASURING — 2026-09-19

`getByRole("button", { name: "Finalize payment" }).first()` at 392px resolves to
**two** buttons: the job record's own, and the one on the Today rail card
**sitting behind the open sheet**. Playwright reported both visible, and
`.first()` — DOM order — was the one underneath.

**The only reason this failed loudly is that the sheet has a backdrop.** Without
it the click would have landed on a control on a screen nobody was looking at,
the run would have gone green, and the label would have been attached to
whatever Today happened to draw.

**Scope a locator to the container you believe you are in**, and scope it to
both containers when the product has two:

```js
const inRecord = () => page.locator(".sheet, .col-2.record").last();
```

`RecordHost` chooses between them at `--wrap`, so a scope naming one of them
measures nothing at half the widths — which is the skipped-check-reads-like-a-
passing-one failure one level down.

---

## `NAMED()` IS THE WRONG MATCHER FOR A LABEL THAT SITS BESIDE A `+` — 2026-09-19, AND THIS IS ITS FOURTH HOME

`Catalog.jsx` writes its buttons as `+ {t("Category")}`, so the accessible name
is **"+ Category"**. `NAMED()` returns `^(?:Category|Categoría)$` the moment a
Spanish twin exists, and `{ name: "Category", exact: true }` is anchored too.
Five dialogs printed `NO SUCH BUTTON` against five buttons plainly on screen.

`NAMED_TEXT()` with no `exact` is the substring form and is what a label joined
to a character needs. Scope it to the heading above it rather than to an index —
two of these buttons say only the word "Add", on the same screen, and `.nth(0)` /
`.nth(1)` would swap the day somebody reorders the page.

**The count so far: `hasText` (2026-09-08), settings rows (2026-09-16),
`getByRole({name})` on rows (2026-09-16), and now a label with a prefix
character. Four homes is not four accidents.** Before reaching for either one,
read the accessible name out of the browser rather than off the JSX.

---

## A SCREEN THAT ONLY EXISTS FOR PART OF THE DAY WILL FAIL A GATE OVER NOTHING — 2026-09-19

`seed-demo.mjs` marks a job completed **once it has ENDED**, which is the only
rule that cannot print a finished job in the future and is therefore right.
The consequence nobody had met: between midnight and the first shift finishing,
**the demo has no completed job at all**.

A sweep at 00:45 then reports four surfaces `NEVER MEASURED` at three widths —
`job record · finished`, `job record · finalize`, `job record · send a text`,
`Money · an unpaid job` — and the expected-count gate fails **over a product
nobody touched**. Two of those four were already in the committed 320 baseline
from 2026-09-16; nobody had run it at that hour.

**Two rules.**

1. **A baseline is a claim about what must be reachable. Before committing one,
   ask what time of day it was taken and whether the demo can be in that state
   at every hour.** A gate that is red for a procedural reason nobody can name
   is a gate people start ignoring, which is worse than not having it.
2. **When a check fails for a reason that is not the product, the check has to
   say so in the failure line.** `NOT MEASURED — nothing on today's rail and
   nothing coming up. If the demo was seeded on an earlier DAY, that is the
   whole reason: re-seed and run again.` The same defect with a bare
   `NOT MEASURED` reads as a regression and costs somebody an hour.


---

## A SKIP IS A CLAIM UNTIL SOMETHING RE-ASKS IT — 2026-09-19, ROADMAP 8.1b

Three surfaces genuinely cannot exist before about 08:45: a job is finished
once it has ENDED, so in the small hours the demo has none, and the
expected-count gate failed over a product nobody had touched.

The fix was to let a surface declare *"not reachable, here is why"*. **The risk
that fix carries is worse than the problem it solves** — a screen that can
excuse itself is a screen that can stop being measured for ever, silently, and
this repo's whole subject is a check that reads clean having tested nothing.

**So a skip is not a claim, it is a measurement.** The caller hands over a
probe, the probe re-asks whether the surface was reachable after all, and a
skip declared over a reachable surface is REFUSED and fails the run:

```
job record · finished   SKIP REFUSED — declared unreachable, and the probe found 1.
```

**And the refusal must not merely warn.** Because a refused skip is never
recorded, the gate that follows still reports `NEVER MEASURED` for that label
and still fails. Two independent doors, and `receipt.mjs` shuts a third by
recomputing the counts. **Proved by pointing the locator at a class that does
not exist** so the skip fired with the row plainly on screen.

**The general form:** any mechanism that lets a check say "this one does not
count" needs a second mechanism that can call it a liar, and that second
mechanism has to be exercised on purpose before the first one is trusted. An
allowlist nobody can disprove is a hole with documentation attached.

**AND A DECLARED SKIP MUST NOT QUIETLY SHRINK THE BASELINE.** The three labels
stay in `sweep-widths.expected.json`. Deleting them would also have made the
run pass and is the wrong fix — after 08:45 they are reachable and must be
measured, and a label that leaves that file is a screen nobody checks again.
The two `subscription · …` surfaces are absent from it only because the run
that wrote it never measured them, which is an accident that reads like a
decision; do not copy that part.


---

## A SECOND ESCAPE IS NOT A SECOND CLOSE, AND ONE PRESS PER OPEN THING IS AN ASSUMPTION — 2026-09-19

A run died clicking a client row: `<div class="sheet-backdrop">…</div> intercepts
pointer events`. The block before it pressed Escape twice with a 700ms pause
after each.

**The obvious reading is wrong.** A 180ms exit animation racing a 700ms pause
would be the classic `settle()`-is-not-a-wait failure — except Playwright then
retries a blocked click for fifteen seconds and would have won. It did not.

**What the measurement said, at 320:**

```
client record open :  1 sheet   "Marcus Webb (562) 555-0142…"
job opened         :  1 sheet   "Marcus Webb Thursday, October…"
Escape, +3000ms    :  1 sheet   "Marcus Webb (562) 555-0142…"
second Escape      :  0 sheets
```

**The record and the job inside it are ONE sheet whose contents swap, and the
first Escape is a BACK STEP.** Press the two too close together and the second
lands mid-transition and is lost; the sheet then stays open for ever. The pause
was never too short — **nothing checked whether the press that mattered had
worked.**

**So do not count presses, ask for the state you need.** The click that follows
needs *nothing covering the page*, so dismiss until that is true, bounded, and
make failing to get there a finding rather than a longer wait.

**AND THE CONTAINER IS TWO CONTAINERS.** The first fix counted `.sheet` only.
Above `--wrap` a record is `.col-2.record`, so at 1440 it pressed Escape **zero**
times where the old code pressed twice, the record stayed open, and a later
block measured nothing at all — seven surfaces gone with no line anywhere
saying why. Only the expected-count gate caught it. **This is the same
two-container split that bit `inRecord()` days earlier**: `RecordHost` chooses
between them, so a selector naming one is right at half the widths and silently
wrong at the others.

---

## ONE WIDTH'S ACCIDENT SHOULD NOT COST THE WHOLE RUN — 2026-09-19

The same dead click threw out of the width loop, past the gate, past the contact
sheet and past the receipt. **Three widths of work produced no artifact and no
verdict**, and the output ended in a stack trace rather than a number.

A long check needs its units to fail independently. Each width is now its own
try/catch: it fails loudly and by name, the run still exits non-zero, and the
others finish and are graded.

**The catch must not make a failure look like a success.** The abort is
recorded, the gate prints `NOT GRADED — the N it never reached are unmeasured,
not clean` instead of listing ninety consequences of one cause, and the
receipt's four counts no longer agree so `receipt.mjs` fails it without being
told to. **Verified by throwing on purpose:** 1440 aborted after 40 surfaces
while 320 and 392 each finished 95/95 and were graded.


---

## THE CHECK CLEARED THE NEAR CAUSE AND THE APP PUT IT BACK FROM THE FAR ONE — 2026-09-19

Five `guide · …` surfaces printed `NOT MEASURED — no guide arrived; it has been
seen on this profile` on **every run for six days**. They raised no finding and
were absent from the expectation, so they neither measured nor counted — they
sat in the output looking like weather.

The check was already trying to fix it: before each tab it did
`localStorage.removeItem("dp.tours")`, with a comment explaining why. **Two
things were wrong and each one alone was enough to hide the other.**

1. **The gate is an OR over two keys.** `seenTours()` reads `dp.tour` OR a
   non-empty `dp.tours`. The run suppressed guides by writing BOTH and gave
   back ONE.
2. **Underneath that, a database row.** `user_tours` is one row per person
   saying "I dismissed the guides", and `App.jsx` reads it on sign-in and
   writes `dp.tour` straight back. **Every `removeItem` the check performed was
   undone by the app a moment later, in silence.**

**Measured, because the two causes mask each other and reasoning picks one:**

```
row present, clear dp.tours only  ->  guide arrived 0 of 2
row present, clear BOTH + reload  ->  guide arrived 0 of 4
row deleted, clear BOTH           ->  guide arrived 6 of 6
```

**Two rules.**

1. **When a check clears state to get a behaviour back, ask what else writes
   that state.** A near cause a check can reach and a far cause it cannot look
   identical from inside the check — both produce "I cleared it and nothing
   happened". Clearing is not proof; the behaviour arriving is.
2. **A bare `NOT MEASURED` that neither counts nor declares is limbo, and limbo
   is where a real gap lives longest.** Every surface a run names must end up in
   one of two states: measured, or declared unreachable with a probe that can
   refuse the declaration. "Prints a line and raises nothing" is the third
   state and it must not exist — the same sentence, five times a run, is
   indistinguishable from weather.

**And the tell that it was limbo rather than a known-empty state:** the five
lines were not even consistent with each other. One run had `guide · today`
arrive at 1440 and nowhere else, which nobody noticed because the normal output
was five identical lines nobody read.


---

## THE STATE YOU CANNOT REACH MAY NOT BE THE ONE YOU THINK — 2026-09-19

Two surfaces printed `NOT MEASURED — no live subscription on this demo` and
`… nothing is overdue on this demo` on every run. The obvious reading is that
cancelling and past-due are mutually exclusive states of one subscription, so
only one can ever be seen.

**Measured instead, and the reading is wrong.** `Billing.jsx` treats a past-due
subscription as `live`, so one seed draws the dunning box AND the cancel button
— `--subscription=past_due` reaches both at once. **The exclusivity is with
something neither line mentions:** the checkout ladder, because a business
either has a subscription or it has not.

**So the trade is not the one the lines describe.** Seeding the subscription
gains one surface and loses two, and the two lost are the price ladder and the
consent tick — the riskiest geometry on that screen. The right answer was to
keep the unsubscribed demo and declare the other two.

**Before accepting "these two cannot both exist", find which pair actually
cannot.** The answer was one seed run away and it moved the decision.

---

## A STATE OF A SCREEN IS NOT A SCREEN — 2026-09-19, and the sentinel is what says so

Making the dunning box its own measured surface produced:

```
SENTINEL FAILED: gear · subscription, cancelling == gear · subscription, past due
```

Identical fingerprints, because the box sits at the TOP of the account view and
everything else on that screen is the same DOM. It is a **state of** a screen
that was already being measured with the box on it, so a second `say()` was one
screen counted twice under two names — which inflates the surface count and
makes the check look more thorough than it is.

**The test is not "is this thing interesting", it is "is this a different
render".** Where it is not, assert its presence on the surface that already
measures it and say so in the output. A positive assertion about a measured
surface is not limbo; a bare `NOT MEASURED` is.

**And this is the sentinel's second real catch**, after `Clients · one client`
opening the same record as the bounced-email block. Both times it found a
duplicate that every other check in the file reported as two clean screens.


---

## A LABEL IS THE NAME OF A THING, NOT A RENDERING OF IT — 2026-09-19, the first Spanish sweep

The setup form's eight screens were labelled from the form's own step line —
deliberately, and the comment above it explains why: a loop counter drifts when
the walk back does not land where it assumed, and a walk that names what it is
looking at cannot drift. That reasoning is right.

**It is also how eight perfectly measured screens vanished.** The line reads
"Step 1 of 12" in English and **"Paso 1 de 12"** in Spanish, so a Spanish run
produced eight labels the expectation had never heard of — **eight NEVER
MEASURED and eight NOT EXPECTED, for eight screens that were measured
perfectly well.**

**Read the thing, but name it in the invariant part.** The numbers do not
translate, so the label is built from those. Still derived from the form,
still cannot drift, and now stable across languages.

**The general form:** any identifier a check compares across runs — a label, a
key, a fingerprint — must be built only from parts that cannot change while the
thing itself stays the same. Copy changes. Numbers, attributes and ids do not.

---

## `:has-text()` TAKES A LITERAL, SO IT IS ENGLISH FOREVER — 2026-09-19

```js
page.locator('[data-billing-promo-apply]:has-text("Remove")')
```

`:has-text()` is a CSS pseudo-class and its argument is a literal string, so
there is no way to hand it the two-language regex this file builds everywhere
else. In Spanish the button reads "Quitar", the count came back 0, **the promo
code had applied perfectly and the check reported it refused** — with an empty
reason, because there was no error on screen to read.

**A false negative that explains itself badly is worse than one that says
nothing**: `DEMO25 was refused ("")` sends the next person to the seed and the
promo table, neither of which has anything wrong with it.

`.filter({ hasText: NAMED_TEXT("Remove") })` takes a regex and is the mechanism
already here. **When a matcher cannot express the thing you need, that is a
reason to change matcher, not to narrow the question.**

---

## FOUR SPANISH BREAKS, FOUR INSTRUMENT FAULTS, ZERO PRODUCT FAULTS — 2026-09-19

The first Spanish run of the width sweep broke in four places. **Every one was
the check reaching for an English word, and every one of the three strings
involved is correctly translated in `appEs.js`.** The product was fine; the
instrument was monolingual.

**So the first question on a failing Spanish run is not "what is untranslated",
it is "what did the check ask for in English".** Grep the whole family before
fixing an instance — `name:` and `hasText:` values that are not `NAMED`/
`NAMED_TEXT`, plus every `:has-text(` and `text=` locator. There were exactly
four, and fixing only the one that failed first would have left three to be
found one slow run at a time.

**A customer's NAME in a locator is not this bug** — `hasText: "Victor Salas"`
is data, and data does not translate. Know which strings are copy before you
sweep them.


---

## EVERY MODE WROTE TO ONE PATH, SO THE ARTIFACT WAS ALWAYS THE LAST RUN — 2026-09-19

`sweep-widths.mjs` wrote its contact sheet to `artifacts/sweep-widths/` and its
receipt to a name keyed only on the WIDTHS. English, Spanish and `--lite` all
landed on the same two paths, so **each run destroyed the previous one's
pictures and its verdict**, and nothing on the page said which mode had made
it.

It was caught by somebody opening the page and seeing English screenshots under
a Spanish claim. **The page had not been overwritten that time** — but nobody
could tell, which is the whole defect: an artifact that cannot identify itself
is an artifact nobody can check, and it had already made one report wrong.

**The mode is part of the identity.** It goes in the directory, in the receipt
id, and in the page's own title and heading — all four, because each one is a
place somebody arrives without the others.

**This is the timestamp-ambiguity entry from earlier the same night, one level
up.** There the question was which RUN a PNG came from; here it is which MODE a
whole contact sheet came from. Same cure: never let two things that must be
told apart share a name.

---

## A LANGUAGE FLAG THAT ONLY REACHES HALF THE PRODUCT — 2026-09-19

`LANG_APP=es` was reported as sweeping 125 surfaces in Spanish. **The true
number was 116.** The first nine — the booking page, the four marketing pages
and the four sign-in screens — are English in a Spanish run and always were:

- `dp.lang.app` is the **dashboard's** key, and `appI18n.js` states that it and
  the booking page's language *"neither can move the other"*.
- The sweep applies it **after sign-in**, and those nine are measured before
  that line runs.

So the flag is doing exactly what it says and the claim was bigger than the
flag. **Before reporting "swept in language X", check where the switch is
applied and what was already measured by then** — and count it in the run
rather than asserting it, which is what the contact sheet's own caveat line now
does.

**The half that is still unmeasured is the customer's half**, which is the one
a Spanish-speaking customer actually sees.

---

## `--lite` DOES NOT FIND SLOWER BUGS, IT FINDS RACES YOU WERE WINNING BY LUCK — 2026-09-19

The first reduced-motion sweep reported one problem:
`tour · focus on open  FOCUS IS OUTSIDE THE CAPTION CARD`. Read cold that is an
accessibility defect that only appears with motion disabled, which is exactly
the kind of thing the lite path exists to catch.

**It was the check.** Measured both paths on the same page before changing
anything:

```
NORMAL +200ms card=false          LITE +200ms card=false
NORMAL +400ms focusInCard=true    LITE +400ms focusInCard=true
```

Identical. The product behaves the same; the check glanced at focus once,
immediately, and with nothing animating the DOM goes quiet sooner, `settle()`
returns earlier, and the glance started landing too early.

**So on a `--lite` run, suspect the instrument first** — the opposite of the
instinct, because lite is advertised as having its own stylesheet rules and
therefore its own layout defects. Both are true: the geometry findings in lite
are real product defects, and the TIMING findings are almost always the check.
Tell them apart by measuring the same thing in both paths before you touch
either.

**And when you fix one, prove it can still fail.** A wait with a timeout that
is never reached is indistinguishable from a check that was deleted. Point the
predicate at something impossible and watch it fail.


---

## NOTHING ASKED WHETHER THE RUN WAS IN THE LANGUAGE IT CLAIMED — 2026-09-19

A sweep reported 125 surfaces in Spanish. Nine of them were English. The
geometry checks could not tell, **and that is not a bug in them**: they measure
edges and boxes, they do not read words. **A language that never applied
measures exactly like one that did.**

So the claim "swept in language X" had nothing behind it at all. It was true of
the flag, not of the pixels.

**Tally the surface against the catalogue, both ways.** How many phrases appear
in their translated form, against how many appear in their source form. Not one
hand-picked sentence — that is a check coupled to a spelling, which this file
records four separate times. A count over the whole surface is a check on the
behaviour, and it says how confident it is: `0 translated against 4
untranslated` is a different statement from `2 against 5`.

**Exempt what genuinely has no translation, by name.** Three pages here import
no translation scope and contain zero translatable strings; scoring them would
make the guard cry wolf on four correct screens. Naming them also stops the
next person believing the sweep covers them.

**And declare a known gap rather than silencing it — with a refusal.** One
surface is legitimately part-translated. It is listed with its reason, and **the
listing fails the day the gap closes** (`GAP CLOSED — remove it from the list`).
An allowlist that cannot expire is where defects go to be forgotten.

---

## TWO LANGUAGE KEYS THAT MUST NOT COMPOSE, AND A CHECK THAT KNEW ONE — 2026-09-19

`dp.lang` is the customer's booking surface; `dp.lang.app` is the detailer's
dashboard. `appI18n.js` states they *"neither can move the other"* **on
purpose**: a detailer previewing their own booking page in Spanish must not
come back to a Spanish back office.

The sweep knew one of them. So `LANG_APP=es` translated the dashboard and left
the customer's half in English, and the run said Spanish.

**When a product deliberately splits a setting by scope, a check that drives it
has to drive every scope — and the split is usually documented in the file that
owns it.** Read that file before wiring the flag.

---

## EVERY CONTEXT, NOT THE ONE YOU WERE THINKING OF — 2026-09-19

The language keys were set with `addInitScript` on the main browser context.
Four surfaces stayed English: the **signed-out** screens are measured in a
second, anonymous context, because that is what signed-out means.

`grep -n "newContext("` returned two. It always would have.

**A per-context setting has to be applied where contexts are CREATED, not where
the main one is** — so it belongs in one helper both call sites use, which is
also the only shape that survives a third context being added later.

**And this was caught by the guard written in the same change**, one run after
the fix that was supposed to work. That is the argument for building the check
before trusting the repair, rather than after.


---

## THE FIRST FIELD IS NOT THE REQUIRED FIELD — 2026-09-19

`sweep-booking-steps.mjs` filled "the first plain text field on a step", with a
comment naming the two steps that justified it: *"an address on Location, a name
on Details. Both are the only required text on their step."*

**The Vehicle step was not in that sentence and has two.** The optional one is
first. So the script typed a street address into "What are you bringing?", left
the required Year empty, and the product correctly refused to advance — **every
run, for as long as the step has existed, so steps 4 to 7 of a seven-step flow
had never been measured at any width.**

**Two rules.**

1. **Fill by REQUIREMENT, not by position** — and the cheapest way to know what
   is required is to ask the product: fill what you can identify, then only if
   the gate is still closed reach for anything else. That needs no list of
   which step wants what, and it cannot invent data for an optional box.
2. **A comment that enumerates the cases it covers is a list that will go
   stale.** This one was accurate when written. The step that broke it was
   added later and nobody re-read the sentence.

**Identify a field by its attributes, not its label.** A year box is
`inputmode="numeric"` with `maxlength="4"` in any language; its label is "Year"
in one.

---

## A GUARD WRITTEN TO MAKE FAILURES LEGIBLE CAN ITSELF GLANCE INSTEAD OF WAIT — 2026-09-19

Replacing a 30-second anonymous Playwright timeout with a named failure meant
asking `isDisabled()` before clicking Continue. That guard reported **step 1**
stuck on the very first run.

**Step 1's Continue is correctly disabled until the server quote lands.** The
old code never noticed because `.click()` AUTO-WAITS for enabled and had been
quietly absorbing the round trip for as long as the script existed. Reading the
state directly removed a wait nobody knew was there.

**So: when you replace an action with an assertion, you inherit the action's
waiting and have to put it back explicitly.** `waitForFunction` up to a bound,
then declare failure — never a bare read, and never a longer `settle()`.

This file records six earlier instances of "settle is not a wait". This one is
different and worth its own entry: **the wait that was lost was not in a
`settle()` at all — it was inside the Playwright call being removed.**

---

## THE SWEEP THAT COULD NOT RUN WAS HIDING THE COST OF A CHANGE — 2026-09-19

The booking sweep had been dying at step 3 for as long as anyone remembers. The
same week, ROADMAP 8.4 replaced an icon with a worded control — a deliberate,
requested trade whose cost was written into the code as *"a worded control takes
a row of its own"*.

**With the sweep repaired, that row measured 264px and turned step 1 from
fitting at three widths into overflowing at three widths.** Nobody was careless:
the trade was named, agreed, and documented. **What was missing was the number**,
and the instrument that produces the number had been broken the whole time.

**A check that cannot run is not neutral.** It is not "no information" — it is
a change budget nobody is counting against, and the longer it stays broken the
larger the unmeasured balance. Fix the instrument before, not after, the change
whose cost it would have priced.

---

## The built-in browser pane cannot scroll, so every scroll measurement in it is void

**Cost: about twenty minutes on 2026-09-19, and it nearly reverted a correct
fix.** `example-ctas.mjs` reported PASS on ROADMAP 2.4. Opening the same page
in the desktop app's browser pane to show Andrew, the click landed on
`/ex1/?svc=express#book` with the right service selected — and the page sat at
the TOP, widget 1837px below the fold. A passing check over a visibly broken
page is this repo's defining failure, so the check looked wrong.

**It was not. The pane was.** Three measurements, in order, each one narrowing it:

1. **`innerHeight` was 0.** The pane reports a zero-height viewport when it is
   hidden or collapsed, and **nothing can ever be "in view" in a viewport of
   zero height.** `document.documentElement.scrollHeight` read 0 while
   `document.body.scrollHeight` read 6626 in the same breath, which is the
   tell. Any in-view test taken here is a guaranteed false negative.
2. **After `resize_window` to a real 1440x900, it still did not scroll** — on a
   DIRECT navigation to `#book`, four seconds, reduced-motion off.
3. **`location.hash = "#book"` did nothing. `scrollIntoView()` did nothing.**
   `document.scrollingElement.scrollTop` stayed at **0** through both. So
   programmatic scrolling is inert in the pane for this page, for any anchor,
   by any method — it is not the fragment, and it is not the page's code.

**The same page in Playwright, same Chromium, no viewport emulation, scrolls
correctly by both routes** — traced at 250ms intervals, the widget's `top`
goes `1837 → 1396 → 189 → -9 → -18` and settles, on a click AND on a direct
navigation to the fragment. That is the real behaviour.

**The rule: never measure a scroll position, a fragment landing, or anything
"on screen" in the browser pane.** Use it to LOOK at a page and to read the
console; measure geometry in Playwright. And whatever you are measuring
anywhere, **read `innerHeight` first** — a zero there voids the answer before
you have finished asking the question. It is the backgrounded-tab entry above,
arriving through a different door.

---

## In this manager session, resizing the browser pane must not be called — it is a house rule, not a pane defect

**CORRECTED 2026-09-22, same day it was written.** This entry originally said
the pane "can refuse to resize at all," reported as a tool limitation. **That
was wrong about the cause, though right about every number in it.** The
manager who found it explains why: *"Andrew keeps Chrome in half-screen split
view across three monitors and my resize calls were moving his window."* This
session's browser is not an isolated preview surface here — a resize call can
act on a window that is actually part of Andrew's own live desktop layout.
**The fix is a standing rule for this manager session — do not call
`resize_window` at all — not a bug for a future session to go hunting for.**
A session that reads the original wording and goes looking for a defect in
the pane itself will find nothing broken, because nothing was.

**The measured facts stand exactly as recorded, only the explanation changes.**
`resize_window` was called for 1440x900, then for 1940x1000. **Both calls
reported success.** The page's own reported viewport stayed at exactly **948
by 859, unchanged, both times.** `window.outerWidth` read **0**.
`screen.width`/`screen.height` read **1920x1080** — the real monitor. This is
consistent with the call reaching a real, shared window rather than a
sandboxed one: a resize request can be accepted and even acted on, and still
never show up as a change to the number this session reads back, because the
number it reads back is not the thing that moved.

**What this actually costs, and it is unchanged by the correction.**
Everything CLAUDE.md's own absolute rule asks for — "screenshot 1920 /
1440x900 / 768x1024 / 392x844, read the console at each" — still depends on
being at the width the check claims, and this manager session's pane is
simply always at whatever width the desktop app's own layout puts it,
948x859 measured. That is the same family as the entry above (the pane's
scroll position lies), arriving through a different door: that entry is
about time, this one is about space, and both share the same lesson — a
tool answering success is not evidence that the thing you asked for
happened.

**The rule: this manager session does not call `resize_window`, full stop.**
When a viewport genuinely has to be a specific width — not just looked at,
but MEASURED — **launch Playwright directly** (the same `chromium` every
script in `scripts/` already imports from `app/node_modules/playwright`), set
the viewport explicitly in `newContext`, and **save real screenshots to
disk** rather than returning them inline, so anyone can open the file
independent of whatever this session's own pane is doing. See the next entry
for the failure mode that method has of its own.

---

## A crop of the exact right element can still be an empty picture, and file size will not tell you

**Cost: five of fifteen "real screenshots" handed over as evidence were
blank, 2026-09-22, the same turn the previous entry was written.** Playwright
screenshotted `.setupfee` on the pricing page at five widths. All five looked
identical when only the byte count was checked — **25268, 25642, 25200,
25316, 26588 bytes, within 1.4% of each other across a six-fold change in
viewport width** — while the correctly-captured files in the same batch (the
home page, the pricing rungs) ran from 117k to 354k and varied hugely with
width, the way real content should. **And once fixed, the real file at 1920
was SMALLER than the blank one had been — 23,388 bytes against the original
blank's 25,268.** So this is not merely "file size does not prove content": at
this specific crop, size points the WRONG way. A reader who keeps a rough
size floor in their head — "anything over ~20KB is probably fine" — would
have read both the blank AND the real file as passing, and would have been
more confident about the WRONG one, because it was bigger. **A near-
identical byte count across wildly different crop widths is the tell, not a
large byte count on its own**: a blank or solid-colour PNG compresses
efficiently regardless of its dimensions, so file size stops correlating
with WIDTH the moment there is nothing in the frame to correlate — and
separately, PNG compression rewards a plain, low-contrast card (the real
content here) with a SMALLER file than a fully empty region can end up
producing, depending on what the empty region's noise looks like. Neither
direction is safe to assume. The five files were opened and were, in fact,
empty dark rectangles — nothing inferred, looked at directly.

**"Non-trivial byte sizes" was offered as proof the files were real,
and it proved something smaller: that they were not zero-byte files.** It did
not and could not prove there was a picture inside them. This is the same
failure this whole file exists to catalogue — a check that passes having
measured the wrong thing — occurring **inside evidence produced specifically
to satisfy a demand for evidence**, which is the sharper version: the
instrument that was supposed to catch instruments lying was itself lying,
undetected, until somebody opened the file.

**The actual cause, once found: `.setupfee` carries `data-rv="lift"`**
(`landing.css:292,302`) — an intersection-observer-gated reveal that sits at
`opacity: 0` until client JS adds a class `.in`, which only happens after a
real scroll trigger fires. `elementHandle.screenshot()` scrolls the target
into view but does **not** wait for that class to land, so a reveal-gated
element gets captured on the frame before it becomes visible — this file's
own "a screenshot taken too soon is the previous frame," arriving through a
new instrument. The other two captures in the same run (`.plans`, `.ladder`)
happened not to be reveal-gated on the container itself, which is the entire
reason only one of the three regions was silently empty while the other two
looked convincing.

**The rule: do not trust a screenshot's byte size as evidence of its
content, and do not trust `elementHandle.screenshot()` to wait for a
scroll-triggered reveal on its own.** Wait explicitly for the real signal
(`getComputedStyle(el).opacity === "1"`, or the `.in` class, with a real
timeout that throws rather than a fixed sleep) before shooting. Then **assert
on the pixels, not the file**: decode the screenshot buffer back through the
page's own canvas — the same technique `scripts/pinned-bar.mjs` and
`scripts/admin-contrast.mjs` already use, because there is no
sharp/jimp/PIL on this machine (`scripts/tenant-site-image.mjs`'s own
header) — and check that the captured region has real luminance variance.
This repo's own dotted background alone produces roughly 2-3 standard
deviations of luminance; a threshold well above that and well below real
text/card content (6 was used) separates a blank capture from a real one
without guessing.

**AND ONE MORE LAYER, FOUND CHECKING THE CHECK: the sabotage capture itself
is a coin flip, not a reliable demonstration.** The first attempt to prove
the variance assertion catches this bug reproduced it once (0.97, correctly
flagged) and that was reported as proof. **Repeating the exact same no-wait
capture 8 times fresh found the bug only 3 of 8 tries** — the other 5 landed
above the threshold, the reveal having happened to fire before the
screenshot anyway. **A canary that sometimes fails to reproduce the bug it
exists to prove is caught is not a regression test, no matter how convincing
the one run you watched fail was.** The lesson is not that the fix is wrong
— the explicit wait for `opacity === "1"` removes the race by construction
regardless of how often the unfixed version happens to get lucky — it is
that **watching a sabotage fail once is weaker evidence than it feels like**,
precisely because the underlying bug is a race rather than a deterministic
wrong answer. Trust the mechanism (why the wait removes the race), not a
single run of the demonstration.

---

## A lazy-loaded image measured before it scrolls into view looks exactly like one that failed to load

**Caught before it was reported as broken, 2026-09-22, checking ROADMAP
7.11's real screenshot.** `naturalWidth` and `naturalHeight` both read
**0**, which is the same reading a genuinely failed image request
produces. The difference was found by not stopping at that first read:
after scrolling the element into view, the same image read **1920 by
1140**, 125 KB, HTTP 200 — it had `loading="lazy"`, and a lazy image
simply has not asked the network for anything yet if nothing has
scrolled it into the viewport, in a real browser exactly as a script
driving one.

**`img.complete` does not tell the two apart either — it is `false` for
both.** The DOM property that sounds like the obvious check ("is this
image done loading") answers false for "hasn't started" and false for
"started and failed" and true only once a request has actually resolved,
which a lazy image with nothing forcing it into view never does.

**The rule: scroll a lazy-loaded image into view before reading
`naturalWidth`, `naturalHeight`, or `complete`, every time — a zero or a
false from any of them proves nothing about whether the image is broken
until that has happened.** This is the same family as the reveal-class
entries above (a screenshot taken before the signal it is waiting for),
arriving through the network tab instead of the paint.

---

## A screenshot cropped to an element's own box cannot show content spilling past it

**Cost: a real, pre-existing overflow at the narrowest supported width
went unnoticed by this session's first screenshot of it, 2026-09-22, the
same day as the entry above.** `.burger`'s right edge sits past the nav
pill's own right edge at 320px — a real, visible defect, confirmed by a
full-viewport screenshot. The FIRST screenshot taken of this exact nav,
minutes earlier for a different purpose (ROADMAP 7.12), was cropped to
`#nav`'s own bounding box via Playwright's `elementHandle.screenshot()`
and showed nothing wrong at all.

**The reason is exact, not approximate: an element screenshot crops to
that element's own layout box, and CSS overflow does not respect layout
boxes.** `.burger` is a DOM child of `#nav`, but with `overflow: visible`
on the parent (the default, and explicitly set here) a child can paint
pixels outside its parent's box — that is what "overflow: visible" means.
A crop taken of the parent's box only includes the parent's own
rectangle, so a child spilling past it is cut off from the image before
anything renders wrong *inside* the frame. **The screenshot is not lying
about what it captured — it captured exactly its stated box — it is
answering a narrower question than "does this look right," and mistaking
the two is the failure.**

**The rule: when checking for overflow, clipping, or anything spilling
past a boundary, screenshot the VIEWPORT (or a container several levels
up), never the element whose edge you are checking.** A crop is only safe
once you already know nothing escapes it — which is exactly the thing an
overflow check is trying to find out. This is the same family as
"the shot too soon is the previous frame" and "byte size is not proof of
content" two entries above: **the instrument answered the question it was
literally asked, and the literal question was the wrong one.**

---

## A full-viewport screenshot of the home page can catch the hero mid-word, and that is the typewriter working, not truncated copy

**Not a defect, caught while verifying something else, 2026-09-22, and
worth writing down before the next session mistakes it for one.** Two
full-viewport screenshots of the home page at 320 (`home-BEFORE.png`,
`home-AFTER.png`, the overflow fix above) both show the hero heading as
“They look you up befo” with a blinking-caret mark after it — not the
full sentence, no punctuation, cut off mid-word.

**This is `HERO`'s own typewriter effect, caught between frames, not a
rendering fault.** The hero types out one of several rotating lines a
few characters at a time (`chars`, `phase`, `typed = Math.min(chars,
total)` in `LandingPage.jsx`), and a screenshot is a single instant — it
will show whatever the animation had reached at that millisecond as
reliably as it shows anything else. A second screenshot of the same page
a moment later would show a different partial word, or none, or the
finished line; none of them is more “correct” than another mid-flight.

**The rule: a partial or word-clipped sentence on the home page's hero
is not automatically a bug** — check whether the element carries a
typing/reveal animation before reading it as truncated copy, missing
translation, or a CSS overflow. This is the same family as the entries
above about a screenshot taken too soon and a reveal caught before its
class lands: **an instant capture of a thing that changes over time will
show you one instant of it**, and that is the capture working as
intended, not lying.

---

## `has_table_privilege` answers false for a column-granted table, and a column refusal looks exactly like a row denial

**Cost: a wrong security finding, published, and a migration very nearly
written on the strength of it — 2026-09-20.**

`scripts/tenant-matrix.mjs` classified `connected_accounts` as unreachable by
any browser and reported its RLS policy as **inert** — "the protection is an
accidental missing grant, one `grant select` away from evaporating". Andrew
decided to tighten the policy on the strength of that. All of it was wrong.

**The probe was `has_table_privilege('authenticated', tbl, 'SELECT')`, and it
returns FALSE for a table whose columns are granted one at a time.**
`20260908001000_connected_accounts.sql` does exactly that on purpose:

```sql
revoke all on public.connected_accounts from authenticated, anon;
grant select (business_id, stripe_account_id, charges_enabled,
              card_payments_enabled, connected_at)
  on public.connected_accounts to authenticated;
```

`connect_state` — the one-time Connect credential — is deliberately withheld.
The policy fires perfectly well for the five columns that were granted.

**AND THE SECOND HALF IS THE HALF THAT FOOLED A HUMAN READING THE OUTPUT.**
Having decided the table was unreachable, the matrix asked it for `select=*`.
PostgREST was refused — **for the columns, not for the rows** — and the result
is an empty response that is byte-identical to the one a correct row policy
produces when it denies you everything. The check then printed *"owner A sees
none of its own rows"*, which is a true sentence about a false cause.

**Use `has_column_privilege` per column.** Ask each table for exactly the
columns the role may have, and treat "some columns" as a distinct state from
"the whole table" and from "nothing":

```sql
select a.attname
  from pg_attribute a
 where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
   and has_column_privilege('authenticated', c.oid, a.attname, 'SELECT')
```

**And a browser reads a table only if the role holds a grant — possibly per
column — AND a policy lets the row through.** Keying on either alone is wrong
in opposite directions, and this schema has one table of each kind:
`platform_admin_events` has the grant and no policy, `connected_accounts` has
the policy and only column grants. Counting policies calls the first readable;
`has_table_privilege` calls the second unreachable.

**The general rule, which is the one to carry away: a permission system can
refuse you at more than one layer, and the refusals are not distinguishable
from the outside.** Table grant, column grant, row policy, and the function's
own `execute` privilege all produce "you got nothing". If a check is going to
say WHY something was denied, it has to ask each layer separately.

---

## A function you just created 404s through PostgREST, and a 404 reads exactly like "no leak"

**Cost: the first run of the RPC half of `tenant-matrix.mjs` reported
`CANARY NOT CAUGHT` — 2026-09-20. The canary was fine. It had never been
called.**

PostgREST keeps a **schema cache**. A function created a moment ago is not in
it, and `POST /rest/v1/rpc/<name>` answers:

```
404 {"code":"PGRST202","details":"Searched for the function public.tm_probe …
     but no matches were found in the schema cache."}
```

**A check reading that as data sees an empty result, which is the same thing a
correct denial looks like.** The negative control was unreachable rather than
unnoticed, and those are opposite diagnoses: one means the detector is blind,
the other means the run proved nothing at all.

**Fix, and it is two parts.** Reload the cache and wait — measured, the reload
is not instant:

```sql
notify pgrst, 'reload schema';
-- then wait ~3s before the first call
```

And then **probe the canary for reachability before trusting it to fail.**
`tenant-matrix.mjs` calls it, retries the reload up to three times on a 404,
and if it is still 404 says *"the canary RPC could not be reached at all — it
was never given the chance to leak"* rather than reporting a missed canary.

**The same shape bites the table canary less often only by luck**: it is
created early and read after the fixtures are seeded, which takes long enough
that the cache has usually caught up. That is a race this file wins by
accident, not by design.

---

## `create function` grants EXECUTE to PUBLIC, so a new definer function is anon-callable

Found in the same hour, and it made a deliberately leaky canary come back
clean **while visibly returning the secret it was leaking.**

The RPC canary was created and granted to `authenticated`. It was ALSO
executable by `anon`, because Postgres grants `EXECUTE` on a new function to
`PUBLIC` unless you revoke it. The matrix's rule was *"an actor of A must not
get more out of an RPC about B than an anonymous stranger gets"* — and since
anon got B's rows too, A was getting no more than a stranger. **True, and
clean, and the function was handing every customer of tenant B to the entire
internet.**

Two lessons, and the second is the bigger one:

1. **A new function needs `revoke execute … from public`**, which is exactly
   what `20260913005000_definer_execute_swept.sql` does for the real ones.
2. **"No more than a stranger" is only half an invariant.** It cannot see a
   leak that reaches everybody. The matrix now also asserts that no function
   hands a tenant's own text to an anonymous caller *unless it is one of the
   three endpoints that publish a profile on purpose* — a three-name allowlist
   with reasons, and `--break=allowlist` empties it and turns all three into
   findings, which is the proof it is refusable rather than decorative.

**The general form: a comparative assertion has a blind spot exactly where
both sides are wrong together.** If a check asks "is A worse than B", it will
never see A and B failing identically.

## A ROW PROVED ISOLATED SAYS NOTHING ABOUT THE FILE BEHIND IT — 2026-09-20, ROADMAP step 6

`job_photos` passed the tenant matrix. Every actor of tenant A was refused
every one of tenant B's photo rows, by four detectors, over 71 targets. The
photographs were never fetched once.

The row holds a `path`. The bytes live in the `job-photos` bucket, behind a
policy on `storage.objects` in a different schema that nothing in the table
matrix reads. The two are enforced by separate rules and one being right has
never implied the other. **A green `job_photos` reads as coverage of job
photos and is coverage of job-photo metadata.**

The same sentence rewrites for anything with a file, a socket or a cache
behind it. The question to ask of any isolation result is not "did the check
pass" but **"which of the things a tenant owns did it actually touch."**

Section 6 of `scripts/tenant-matrix.mjs` carries the same two-tenant fixture
into every bucket `storage.buckets` reports, and section 7 carries it onto the
Realtime socket.

## `/object/list` ANSWERS `200 []` FOR "DENIED" AND FOR "NOTHING THERE" — 2026-09-20

Supabase Storage does not refuse a list it is not allowed to serve. It filters
the rows through RLS and returns what survives, which for a fully denied
request is an empty array with a `200` on it.

So listing another tenant's folder and getting `[]` proves **nothing**. It is
the storage spelling of the hollow half that `docs/hollow-checks-2026-09-13.md`
found in `tenant-isolation` test 5: an assertion that B's folder is invisible
to A, made against a folder with nothing in it, passes identically whether the
policy is correct or absent.

Every list in section 6 is therefore paired with a service-role `select` from
`storage.objects` confirming the file is genuinely sitting there, and a bucket
where the fixture could not be planted is a DECLARED SKIP carrying the
upload's own status code, never a pass.

The download half is stronger and is the one the canary is gated on: a `200`
proves the request was allowed, and only **B's sentinel string in the response
body** proves B's bytes came back.

## STORAGE REFUSES A DIRECT `delete` FROM SQL — 2026-09-20

Deleting straight out of `storage.objects` or `storage.buckets` raises:

> `42501: Direct deletion from storage tables is not allowed. Use the Storage
> API instead.` — `storage.protect_delete()`

It exists so a row cannot be removed while its file stays behind in the bucket
forever. It fires for a one-run canary exactly as it would for a customer's
photograph, so the canary bucket is created and destroyed through the Storage
API endpoints instead — create bucket, empty bucket, delete bucket.

The POLICY is still SQL. A policy is not a row of storage data, and
`create policy … on storage.objects` works normally.

## REALTIME IS THREE MECHANISMS WEARING ONE NAME — 2026-09-20

Asking "is Realtime isolated" as one question gets one answer and covers at
most a third of it. They are guarded by three different things:

| | what it is | what guards it |
|---|---|---|
| `postgres_changes` | row changes streamed from the WAL | the `supabase_realtime` **publication** decides what streams at all, then each table's **RLS** decides who receives it |
| delivery | a subscriber of A actually receiving a row of B's | RLS — and provable only end to end, over a socket |
| broadcast / presence | messages between clients that never touch a table | `realtime.messages` RLS — **and only on channels opened as private** |

The third is the one nobody looks at and the one with the hole in it. **A
channel opened without the private flag is authorised by nothing at all.**
Measured: a client holding only the anon key, with no session, joined a plain
channel and received a signed-in user's broadcast verbatim, sentinel string
and all. The topic name is the only thing standing between two tenants.

Nothing is wrong in this product today — the app opens zero channels. The
first channel anybody opens named after a business id is a cross-tenant
channel on the day it ships, because a business id is a guess away. The matrix
carries that as a standing warning on every receipt rather than as a finding,
and uses it as the negative control for `[realtime-broadcast]`, because a leak
you can create on demand is the only honest way to prove a detector sees one.

Private channels **are** closed here: `realtime.messages` is RLS-on with zero
policies — the same deliberate lock `platform_admin_events` carries — and anon
was refused in the same run with `Unauthorized: You do not have permissions to
read from this Channel topic`.

## A SUBSCRIPTION THAT CONNECTED AND HEARD NOTHING LOOKS LIKE ONE THAT NEVER CONNECTED — 2026-09-20

The same shape as *"A function you just created 404s through PostgREST"*
further up this file, in a second costume, and it cost most of an evening.

`postgres_changes` on this project **does not deliver**. The canary table was
published to `supabase_realtime`, given `for select to authenticated using
(true)`, granted to `authenticated`, and set to `replica identity full`. Owner
A's channel reported `SUBSCRIBED`. `realtime.subscription` carried the row
server-side with the right entity and the `authenticated` claim. The wal2json
replication slot was active. A row was inserted. **Nothing arrived, across
three runs, from a cold slot, fifteen seconds each.**

An empty array is what "perfectly isolated" looks like too. Those are opposite
findings — one says the boundary holds, the other says the run proved nothing —
and they must never print the same way.

So the probe proves its own socket first: the same client sends itself a
broadcast with self-delivery on and must hear it back. Three outcomes, three
different lines:

- row arrives → `[realtime-stream]` is certified and the boundary is live
- nothing arrives, socket live → **`NOT DELIVERING — detector uncertified`**,
  recorded in `warnings`, and `realtime-stream` is deliberately left OUT of the
  receipt's canary gate. Uncovered, not clean.
- nothing arrives, socket dead → a failure: the run measured nothing

Leaving that detector out of the gate is the honest reading rather than a
convenience. Nothing tenant-owned is published and the app opens no channels,
so nothing is exposed today — but the day somebody publishes a table, this
detector has to be re-proved before it is believed.

## A BLUNT SABOTAGE SWITCH CANNOT CERTIFY A PER-DETECTOR GATE — 2026-09-20

The storage canary is a bucket whose select policy scopes to the bucket and
nothing else, and it trips **three** detectors: `storage-read`, `storage-list`
and `storage-former`. `--break=storage` silences all three at once, so it
proves the canary can be missed and proves nothing whatever about *which*
detector the gate is on.

That is precisely the trap the RPC canary sprang on the first pass:
`--break=leak` PASSED, because "the canary was caught" was true no matter
which detector was switched off.

So there are two sharp switches beside the blunt ones, and they are the ones
that carry the certification:

- `--break=storage-read` silences **only** the byte comparison → the canary is
  MISSED although `storage-list` and `storage-former` still trip on it
- `--break=realtime-pub` silences **only** the publication detector → the run
  fails although `[realtime-broadcast]` is caught

**A sabotage switch that turns off a whole section is a smoke test. A switch
that turns off one detector is a certification.**

## TWO CONCURRENT RUNS OF THE MATRIX DESTROY EACH OTHER'S READING — 2026-09-20

Done by accident, worth recording. A backgrounded run and a foreground run
share one canary table, one canary bucket, one canary RPC and one pair of
fixture tenants, and each one's `finally` tears down the other's. The second
run printed `CANARY NOT CAUGHT` and `owner A cannot download its OWN file from
job-photos (400)` — which reads exactly like a blind detector beside a broken
policy, and was neither.

The teardown itself held: both canaries, the canary bucket, the publication
entry, every planted object and both fixture tenants were verified gone
afterwards. **It is the reading that is destroyed, not the database.** Run it
one at a time.

---

## A SCREEN CENSUS THAT DRIVES THE WRONG TAB SWITCH MEASURES ONE SCREEN AND REPORTS FOUR

**It always looks like success, which is why it keeps coming back.** Third
instance in this repo: the width sweep once measured nine screens under one
name, and on 2026-09-20 the contrast walker's first run reported **no failures
across 1,189 elements** — a clean sheet over a product that had a real defect
in it.

**The trap:** a dashboard census reaches for `?tab=calendar`, `?tab=money` and
so on, because that is what a tab bar looks like it should do. **This app does
not switch tabs by URL.** Every one of those URLs renders Today. The run
visits four addresses, counts four screens, prints four rows in its census and
has measured one screen four times.

**How it showed itself, and it was not the count:** the census printed the same
worst-passing string — *"99999 Nonexistent Parkway…"* — for Today, Calendar,
Money AND Clients. Four different screens cannot have the same worst string.
The element totals looked plausible the whole time (63–84 per screen), which is
why a count alone would not have caught it.

**What to do instead:** **read the tab bar and click it.**

```js
const tabNames = await page.$$eval(".tabbar button, .tabbar a",
  (els) => els.map((e) => e.innerText.trim()).filter(Boolean));
// then click each one by name, and print the list you found
```

Print the tab names the run actually found, and **declare how many you
expected** so a tab that disappears fails on arithmetic rather than on
judgement. `scripts/contrast-insitu.mjs` does both and is the worked example.

**The general rule this is an instance of:** a census must report WHAT it
visited, not only how many things it counted — and if two rows in it agree
about something they cannot both be right about, the navigation is the first
thing to doubt.

---

## AN ACCESSIBILITY WALKER CAN ONLY SEE THE CLICKABLE THINGS THAT WERE STYLED AS CLICKABLE

**Write this next to any number such a walker produces, because the number is
only true about what the walker can see.**

The two signals available to a DOM walk are `cursor: pointer` and an `onclick`
**attribute**. **React attaches its handlers as props, not as attributes**, so
an element wired up with `onClick={...}` and left at the default cursor is
invisible to the walk. A screen can be full of them and the report will say
nothing at all.

So a clean sheet from this kind of probe means: *nothing clickable-LOOKING was
unreachable.* It does not mean nothing clickable was unreachable, and the
difference is the entire distance between a measurement and a reassurance.

**Two more ways the same walk lies, both met on 2026-09-20:**

- **Looking UP the tree is not enough.** The first version skipped an element
  if it sat inside something focusable. The booking service card is a `div`
  with `cursor: pointer` that **CONTAINS** a `<button aria-pressed>` which Tab
  reaches and Enter operates — so the wrapper was reported as a keyboard trap
  that does not exist. Check for a focusable **descendant** as well as a
  focusable ancestor.
- **An inference from the DOM is not a measurement.** The booking calendar's
  day cells are `div`s, which looked like the same fault; pressing Tab showed
  they are reachable and always were. **Press the key before writing the
  finding.**

**What to do instead when it matters:** drive a real Tab walk and record what
receives focus, which is what proved both of the above wrong. The walker is
for finding candidates; the keyboard is for confirming them.

---

## A SCREENSHOT FAR SMALLER THAN ITS NEIGHBOURS MEANS YOU PHOTOGRAPHED SOMETHING UNIFORM

**The cheapest smell test there is, and it settled a fault that two careful
hypotheses had both got wrong.** 2026-09-20, chasing why one control in a
focus walk compared equal focused and blurred:

```
peek #1 ... bytes=10287   differs=true
peek #2 ...  bytes=9427   differs=true
...
peek #6 ...  bytes=1611   differs=false      <- the odd one
```

A PNG of a busy region is large. **1,611 bytes against ~10,000 means the frame
was almost all one colour** — and it was: the probe was photographing the
pinned bar, because the control sat underneath it. Neither of the two theories
in play (a clip running off the viewport; an element only just scrolled to)
was right, and **the thing that settled it was a number nobody was looking
at.**

**So: any probe that compares images should print its byte sizes.** They cost
nothing, and an outlier in them tells you the frame is wrong before you start
arguing about the verdict. A run where every frame is small is a run
photographing a blank page.

---

## A STYLESHEET REVIEW AND A SCROLL CHECK WOULD BOTH HAVE PASSED THIS FOREVER

**Recorded plainly because it is the argument for measuring what a person
experiences rather than what the source says.** Two real defects found on
2026-09-20, both invisible to every kind of review that reads code or computed
style:

- **A focus ring that computes, paints, and cannot be seen.** `.nav-row` sits
  1px inside a `.card.setting-card`, which is `overflow: hidden` for its own
  rounded corners. The ring is a real 2px outline at +2px offset, so it lands
  entirely in the clipped region. `getComputedStyle` reports a perfect focus
  ring. Twelve settings rows had no visible focus and every audit of the
  stylesheet would have called it correct.
- **A control that is in the viewport and underneath something.** A booking
  toggle at y=873 with a pinned bar starting at y=827. `scrollIntoViewIfNeeded`
  will not move it, because by its own definition it is visible. Only
  `elementFromPoint` on the element's own centre knows.

**The rule:** *computed* is not *painted*, *painted* is not *visible*, and *in
the viewport* is not *on the screen*. Three different questions, and the source
answers none of them.

---

## PINCH ZOOM IS NOT BROWSER ZOOM, AND MEASURING IT MEASURES NOTHING

**Third instrument in one night that would have produced a confident zero
while testing the wrong thing.** 2026-09-20, building the 200% zoom walk.

The obvious call is `Emulation.setPageScaleFactor(2)`, or Playwright's
device-scale knob. **Neither is browser zoom.** Pinch zoom magnifies the
rendered page like a lens: **nothing reflows**, no media query re-evaluates,
no line re-wraps, and a walk over it finds exactly what the unzoomed page had
— which is a clean sheet about a question nobody asked.

**Browser zoom makes a CSS pixel physically bigger.** A 1440px-wide window at
200% therefore lays out as a **720 CSS px viewport on a 2x device**:

```js
browser.newContext({ viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 })
```

Same layout, same reflow, same breakpoints as a person pressing Ctrl and plus.
Halve the viewport, double the device scale. Anything else is a photograph of
the wrong page.

**The tell, if you are unsure which you have:** at real 200% zoom a responsive
layout changes its breakpoint — a two-column screen becomes one column. If the
columns are still side by side and merely larger, you are measuring a lens.

---

## DERIVE A CHECK'S FLOOR FROM WHAT IT DECLARED, NEVER FROM WHAT IT FOUND

**The same mistake this whole project exists to stop, in miniature.**
2026-09-20: a new check wrote `min_assertions: 40`, ran, and the receipt
refused it — *"only 16 assertions ran against a declared minimum of 40"*.

**The tempting fix is to change the 40 to a 16.** It takes one character, the
gate goes green, and the gate now certifies whatever the check happened to do
— a rubber stamp with a receipt attached.

**What was actually wrong** was that the check asked a landmark question and a
live-region question on every screen and counted neither. Counting them took
the real figure to 30, and the floor became `2 * EXPECTED_TARGETS` — **derived
from the screen count the check declares before it runs**, so a run that
visits fewer screens than it promised fails on arithmetic rather than on
somebody's judgement.

**The rule:** a floor is a statement about the work a check MUST do, made
before it runs. The moment it is chosen to fit a result it stops being a gate.
**If a floor looks too high, ask what the check is failing to count before you
ask whether the floor is wrong.**

## A RESTORE DRILL THAT COMPARES AGAINST THE LIVE TABLE REPORTS SOMEBODY ELSE'S WRITE AS DATA LOSS — 2026-09-20, ROADMAP 6.1

The first run of `scripts/restore-drill.mjs` reported two failed restores:
`bookings` and `job_heartbeats` came back with **matching row counts and
different content hashes**. Read literally, that is the worst finding a backup
check can produce — the rows are all there and the values have changed.

Neither had failed. The drill exported each table, restored it into a
throwaway schema, and then fingerprinted **the live table** to compare against.
`job_heartbeats` is written by the cron sweeps every fifteen minutes. The
source moved between the export and the comparison, so the restored copy was
being measured against a table that was no longer the one it came from.

**The restored thing is the FILE, so the file is what it must be checked
against.** The fingerprint is now taken at export time, in the same query as
the rows. Live drift is measured separately and printed as information, never
as a failure — a recovery procedure written against a running database needs
to know which tables move, and that is a different fact from whether the
restore worked.

**The general shape: any check that snapshots and then verifies must verify
against the snapshot.** Comparing against the source again measures the
elapsed time as if it were a defect, and the louder the check, the more
convincing the wrong answer.

## `git add` PUTS YOUR FILES IN A SHARED INDEX, AND THE OTHER SESSION'S COMMIT TAKES THEM — 2026-09-20

Two sessions were working in this checkout. One staged two receipts by name
and was about to commit them; the other committed its own three files in the
same second. Git has **one index per working tree**, not one per session, so
`git commit` took everything staged — and both receipts went into
`45e32fc "ROADMAP 0.4: the privacy page named five companies and eleven
receive data"`, under a message that has nothing to do with them.

Nothing was lost and no content was wrong. What was lost is the *record*: a
year from now, the only thing tying those measurements to the run that
produced them is a commit about a privacy page.

The near cause looks like a race and is not. **`git add` is not a claim on
those files** — it is a mutation of a structure the other session is also
writing to, and the window between staging and committing is as long as it
takes you to compose a message.

Two rules came out of it, and the second is the one that actually holds:

- **Name the paths on the commit itself** — `git commit -F msg.txt -- a b`.
  That form commits those paths and ignores whatever else is staged.
- **Read back what is staged before committing** — `git diff --cached
  --name-only`. Not because you forgot what you added, but because your `add`
  was never the last word on it.

**THE SECOND RULE ABOVE WAS INSUFFICIENT AS FIRST WRITTEN, AND HERE IS HOW
THAT WAS CAUGHT — 2026-09-20, the same day, by the session that wrote it.**
It said to read back what is staged. It did not say to read back the
CONTENT, and the difference is the whole of it: the names can be exactly
right while somebody else's lines sit in the index underneath them. `git diff
--cached --name-only` printed exactly the four files intended, and the commit
landed with `ROADMAP.md | 147 ++++---` against about forty lines of intended
change. Five of its six hunks were the other session's American-English work,
written into that file in the minutes between checking it was clean and
running `git add`.

Nothing was lost and the content was right, which is the arrangement here —
but the commit message says nothing about carrying somebody else's work,
because at the moment it was written there was none to carry.

**The window is between the check and the `add`, and it is as long as you
leave it.** Andrew's manager adopted the amendment on the spot — *"reading
back the staged NAMES is not enough, because the names were exactly the four
you intended while another session's content was sitting in the index
underneath them"* — so the rule now has two halves and the first one alone
does not hold. Two things close it: check the CONTENT — `git diff --cached
--stat`, and be suspicious of any file whose line count is larger than what
you wrote — and do the checking and the staging in one breath rather than
verifying early and staging later.

The same shape bit the lock a minute later: `fatal: Unable to create
index.lock` is the *polite* version of this failure, the one where git notices.
**Do not delete the lock.** Wait for it — `until [ ! -f .git/index.lock ]` —
and bound the wait so a genuinely stuck lock reports itself instead of hanging.

**The general shape: anything one-per-working-tree is shared between sessions,
whether or not it looks like state.** The index, the lock, the dev server's
port, `artifacts/`, and a `.env` written by whoever ran last.

## A STEP COUNTER THAT RESTARTS PER SECTION IS NOT A TOTAL, AND IT READS EXACTLY LIKE ONE — 2026-09-20

The width sweep now grades each guide against the `N OF M` its own card
prints, so that a guide which is legitimately shorter on a quiet dashboard
stops looking identical to a guide that broke halfway.

The first wording of that check said *"the tour planned M steps"*. The
broken-on-purpose run printed **`the tour planned 4 step(s)`** for a walk the
real sweep had taken **seven** steps of.

`M` is the length of the **block the card is in**. A tour that crosses several
tabs restarts its counter at each one, and **no card anywhere states the
length of the whole walk**. Read as a total it is wrong by however many blocks
came before it — and wrong in the safe-looking direction, because a smaller
number makes a short walk look complete.

The check itself was fine: `N < M` still means the guide had another card
ready and the walk ended anyway, whichever block that card sat in. **Only the
sentence was wrong** — which is worse than it sounds, because the sentence is
the entire product of a check nobody re-derives.

It now reports the walk length and the last card separately and claims no
total: *walked 7 step(s), ended on the last card it had (4 of 4)*.

**The general shape: before you quote a number a UI printed, find out what it
is counting.** And the only reason this was caught at all is that the canary
run prints its findings in full — a canary that returns a bare pass/fail would
have gone green on a sentence that was false.

## A CHECKSUM AGAINST A GIT BLOB REPORTS LINE ENDINGS AS DATA LOSS — 2026-09-20, step 7

Before pruning `docs/archive/`, every file was checksummed against the
restore tag to prove the tag genuinely held it. **Five of the nine came back
different.** Read literally that is the safety net failing: the thing you are
about to delete is not the thing you can get back.

Nothing was wrong. **The working copies are CRLF and git stores blobs as LF**,
so `git show <tag>:<path> | md5sum` and `md5sum <path>` disagree on any file
containing a carriage return — and agree on the ones that happen not to. Strip
`\r` from both sides and all nine were identical; `git log <tag>..HEAD --
docs/archive/` confirmed no commit had touched them at all.

**Compare content, not bytes, whenever git is on one side of the comparison**
— `tr -d '\r'` on both, or `git diff` which already knows. And the second
measurement is the cheap one that settles it: if no commit touched the path
since the tag, the content cannot have moved, whatever a checksum says.

This one was caught only because the answer was checkable a second way. On a
repo where five files had genuinely drifted, the same output would have been
true, and the difference between those two worlds is one command.

## A PAGE READ BEFORE ITS DATA RESOLVES HANDS YOU A CONFIDENT CONTRADICTION BETWEEN TWO NUMBERS THAT NEVER DISAGREED — 2026-09-20, ROADMAP 7.7

**The first read of `/pricing` showed `$600 a year` in the terms section
against `$40 a month` in the ladder above it.** That is a money contradiction
on a public page, inside the AB 2863 disclosure block that exists precisely to
be accurate before billing details are taken. It was written up as a finding
and was one sentence away from going to Andrew as one.

**It was not real.** The founding offer is fetched — `api.foundingOffer()` —
and the component renders list prices until it answers, deliberately: the code
says advertising a founding spot that may already be taken is the worse
failure, so `founding` starts `false` and every figure renders at the HIGHER
number for the first frame. The page was read in that frame. Re-probing the
DOM afterwards gave `$400` / `$40` / `$50` and a `$120` worked exit fee,
consistent from the ladder to the terms to the build fee.

**Two numbers that never disagreed, presented as if they did**, with the
authority of a direct quotation from the page.

**This is the same family as the animated background and the frozen tab** —
an instrument reporting a moment rather than the thing. It is more dangerous
than either, because a loading state is *plausible*: a half-resolved page is
internally consistent with a real defect, and nothing about the output looks
provisional.

**What caught it was the number looking serious enough to check twice**, which
is not a method. The method is: **read a page through the DOM after its
network work has settled, and when a finding rests on two figures on one
screen, re-read both from the live DOM before writing it down.** `get_page_text`
and a screenshot both capture a moment; `document.querySelector` at the time of
asking captures the state.

**Third false alarm from an instrument in one night**, after the black
screenshot from the browser pane and the restore drill comparing against a live
table. All three would have been reported as product defects.

## THE COMMAND THAT WIDENS A GATE IS ALSO THE FASTEST WAY TO NARROW ONE — 2026-09-20

`node scripts/sweep-widths.mjs <widths> --write-expected` rewrites the list of
surfaces every run is graded against. Asked to add twenty-six tour steps that
had never been measured, it produced **`+26 / -6` per width** — because it
wrote the set this run could reach, **wholesale**.

The six it removed at each phone width were `job record · finished`,
`finalize` and `send a text` — labels the gate's own comment says must never
leave the file, since after about 08:45 they are reachable again — and `guide
· today 5, 6, 7`, the steps a quiet dashboard cannot produce, **whose deletion
was the exact move that had been refused two hours earlier.** At 1440 it also
dropped `tour · step 6` and `7`, which would have written a tour that stops
after its first tab into the file as the correct answer.

Nobody wrote a bug. A run only ever sees what it could reach today, so every
declared skip, every quiet dashboard and every truncated walk silently narrows
the question — and the one command meant to make the gate stronger does it
while printing nothing but additions on the console.

It now writes the **union**: it names every addition, names every label it is
KEEPING that the run did not reach, and leaves a width it did not sweep
untouched. A genuine removal needs `--drop-missing` and prints each one.

**The general shape: a baseline regenerated from one observation inherits
everything that was accidental about that observation.** Before running any
`--write-expected`, `--update-snapshot` or `--bless`, say out loud which way
the question is moving. *Widening it to cover things nobody was checking makes
the gate stronger; narrowing it to fit an awkward answer makes it worthless.*

## A NEW CHECK DOES NOT INHERIT THE OLD CHECK'S RULE ABOUT ABORTS — 2026-09-20

`sweep-widths.mjs` has carried this rule for weeks, in its own words: *a width
that aborted is not ninety findings, it is one.* The expected-count gate obeys
it and prints `NOT GRADED — the width aborted after 84 of 125 surfaces`.

The cross-width comparison written **forty lines below that gate, on the same
day**, did not. 1440 died on a click timeout before reaching any guide, and
the new check reported it as six separate product defects: *`guide · today`
arrived at 392, 320px and never at 1440px*, five times over, plus a tour of
nought blocks. Every sentence was true. All of them were the abort wearing a
costume, and any one of them would have sent somebody to read `Walkthrough.jsx`
looking for a responsive bug that does not exist.

**A rule written in a file is not a rule the file follows.** When you add a
check beside an existing one, go and read what the neighbour guards against —
aborted widths, declared skips, partial runs — because your new check starts
with none of it and its findings will look exactly as confident as the old
one's.

## `settle()` CANNOT CATCH AN ANIMATION THAT HAS NOT STARTED YET — 2026-09-20

The width sweep reported, four runs running, at 392px and 320px:

    past-parent  +14px  p.body.tourline in div  «Your own settings live beh»

There was no overflow. `theme.css` carries `@keyframes step-fwd { from {
transform: translate3d(14px, 0, 0); } }` on that paragraph.
`getBoundingClientRect()` returns the **transformed** box, so a caption read
during its entrance is exactly 14px right of where it lives. Two fourteens,
one cause — and the number was convincing precisely because it was specific.

**The part worth carrying is why the existing guard did not stop it.**
`settle()` already waits for the DOM to go quiet *and* for every non-infinite
animation to stop running. It is a good guard and it was not enough:

> A React element with a `key` that changes is **destroyed and recreated**,
> and its CSS animation begins on a later frame than the mutation that
> created it. So there is a real window in which the DOM has been quiet for
> 130ms, nothing is running, `settle()` returns truthfully — and the entrance
> has not begun.

Waiting longer does not fix this. It tunes the race instead of removing it,
and the tuning is invisible the day it stops working.

**The fix is to finish, not to wait:** `document.getAnimations().forEach(a =>
a.finish())` immediately before the geometry is read, skipping infinite ones
because `finish()` on those throws and they never end anyway. That is the only
state in which comparing two edges means anything.

**And one file in this repo had been doing it all along.**
`screenreader-structure.mjs` finishes animations before every probe. The
script that measures nothing *but* edges did not. A technique that lives in
one instrument is not a technique the repo has — go and look at what the
neighbouring check does before trusting your own.

**Three tells that this is what you are looking at**, none of which need a
rebuild: the finding's number matches a number in a keyframe; it appears in
the normal path and vanishes under `?lite=1`; and the element carries a
`key` that changes. Any one of them is worth ten minutes before a fix.

**AND IT CANNOT CATCH A CARD THAT DOES NOT EXIST YET EITHER — 2026-09-20,
ROADMAP 14.10, the same hazard one size up.** The sweep's guided tour walks
`click` then `settle(page, 1000)`, and at 1440 it stops dead after five steps
every single run. Measured rather than reasoned: `settle()` comes back at
223–281ms on a press inside a tab and at **528–630ms on the press that crosses
to the next tab** — the page has genuinely gone quiet, and the next tab's card
has not been built. Press again there and the tour ends. Holding a further
second, changing nothing else, walks all 34 steps.

**The cap is not the safety net it looks like.** On the held run `settle()`
returned `1007`, `1019` and `1001` — it hit its own 1000ms ceiling at three of
the five crossings. So "wait for quiet, up to a second" is not a wait for the
next thing to arrive, at any cap. **Waiting for quiet and waiting for the next
element are different questions, and only one of them has an answer that
scales.** Wait for the element.

## A KNOB THAT CHANGES THE INSTRUMENT MUST CHANGE ITS MODE, OR THE DETECTOR FILES YOUR EXPERIMENT AS EVIDENCE — 2026-09-20, ROADMAP 14.10, caught in the act

`sweep-widths.mjs` truncates its guided tour at 1440 to one block, every run.
Proving that this was the sweep's own impatience rather than the product meant
running the sweep with a deliberate hold between presses — `SWEEP_TOUR_HOLD`,
default 0, no change to normal behaviour. It worked: the held run walked all
34 steps and six blocks where the default run stops at 5.

**And every one of those runs wrote a row into
`receipts/sweep-widths-ledger.json` saying `"mode": "default"`.**

That ledger exists to do exactly one thing at 1440 — count how many of the last
five runs failed to complete. Two rows now claimed a completion **the sweep
cannot actually produce**, and nothing in the row said a knob had been turned.
The next session to read `0 of the last 5 runs did not complete` would have
concluded 1440 had recovered, from the evidence of an experiment proving it
had not. **The instrument's own history had been poisoned by the act of
measuring it**, and the poison was indistinguishable from good news.

**It is the same failure as the English and Spanish runs overwriting each
other's contact sheet**, one level up: a run that cannot be told apart from
another run is a run nobody can check. So it takes the same cure rather than a
second one — the tempo goes into `MODE`, which already gives `-es` and
`-lite` their own directory, their own receipt id and their own ledger
history. One line. A held run is now `-hold1000` and groups only with itself.

**THE RULE, AND IT IS NOT ABOUT THIS KNOB.** Before adding any switch that
makes a check behave differently — a longer wait, a skipped step, a forced
state, a different account — ask **which durable record this run is about to
join, and whether that record can tell it apart from an ordinary one.** A
ledger, a snapshot, a baseline, a receipt, a trend line. If it cannot, the
switch is not finished. **A canary that also has to be excluded from the
tally is half a canary.**

**And the tell that it had already happened:** the two contaminated rows were
identifiable only by an accident — they measured 146 surfaces where a default
run measures 117, because walking the whole tour measures 27 more screens. Had
the knob changed the timing without changing the surface count, nothing in the
file would have distinguished them and the rows would have been unrecoverable.
They were relabelled rather than deleted; the runs happened.

**A SECOND THING THE SAME HOUR, SMALLER AND WORTH ONE LINE:** every row in
that ledger carries `"sha": ""` and always has. A record whose job is to say
which code state a run was made against has never once recorded one.

## THE FULL 79-SUITE BATTERY WRITES TO THE SAME DEMO TENANT A BROWSER RUN IS PHOTOGRAPHING — 2026-09-20

`node --test tests/*.test.mjs` was started while the width sweep had a
twenty-run browser experiment live against `demo-detail`. Andrew stopped it
himself, for the database half of the same collision his own hold on
`app/src` already exists to prevent: a booking, a status change or a new row
written mid-sweep moves the surfaces the sweep is measuring, and the run
reports a difference that is the test battery, not the product.

**It is a real risk, not a hypothetical one.** `booking-engine.test.mjs` §19
looks up the real `demo-detail` business by slug and inserts a real booking
into it — dated far in the future and deleted at the end of the test, but a
genuine write to the tenant the moment it runs, not to an isolated fixture.
Most of the battery's ~60 database-touching suites create their own
throwaway businesses instead (`is_demo: true`, distinctly named — `engine-a`,
`ics-phx`, `roles-a`, `tz-ny` and so on), and this run's own kill was verified
against the database rather than assumed: zero rows had landed on
`demo-detail` in the window, every new booking and customer belonged to one
of eleven freshly-named test businesses, none of them the tenant.

**Nothing in this repo said the two could not run together, and now this
does: the full battery must not run while a browser sweep or any other
process is measuring `demo-detail`.** Run suites that touch the demo tenant
by name, individually, once you know nothing else is watching it — the same
rule `app/src` already has for a live browser measurement, one layer down.

## A RENAMED USER-FACING STRING CAN BLIND A CHECK THAT FINDS ITS SCREEN BY THAT STRING — 2026-09-20, ROADMAP 10.1

`app/src/screens/Money.jsx`'s bulk-job button went from "Log a bulk job" to
"Add a fleet job" — a legitimate copy fix, the Spanish key moved with it, and
nothing about the change was wrong. The width sweep opens that sheet by its
**visible text**, not by a stable selector, so the rename made the screen
undiscoverable by name and the next run reported it `NEVER MEASURED` rather
than measuring the wrong thing or silently skipping — the gate working
exactly as built.

**The coupling is real and was not written down anywhere before this.** Some
of this product's own user-facing strings — a button label, a sheet title, a
tab name, a heading — are load-bearing for the instruments that measure it,
the same way a database row can be load-bearing for a query nobody remembered
depends on it. A copy pass that reads as pure wording to the person writing
it can be a breaking change to a script that was never mentioned in the same
sentence.

**What this changes about how a copy pass runs:** before renaming any
button label, sheet title, tab name or heading, check it against what the
browser instruments key on by literal text — not only against the product's
own tests. Wave 10.1's own list, cross-checked this way, split cleanly:
plain paragraph prose carries no risk here (nothing clicks a sentence by its
words), but a nav-row label a detailer taps to open a screen is exactly the
shape of string this gotcha is about. **The fix belongs in the check, not in
reverting the string** — "Log a bulk job" was a real defect in the product's
own voice; the sweep not knowing the product renamed something is a gap in
the sweep, and the right repair is to give it a stable way to find the
screen (a `data-*` hook, a route, a component name) instead of a string that
copy is free to keep changing.

## A SANCTIONED WORD FOR TESTING NOTHING: THE SKIP THAT WAS A WALK THAT DIED — 2026-09-20, ROADMAP 14.11

Every entry above is a check that measured the wrong thing. This one is worse
and it is the level above: **a check that has an approved vocabulary for not
measuring at all, and uses it on itself.**

The width sweep's tour walk ended at step 5 at 1440 and printed:

```
tour · step @1440   5 step(s), ended on the last card it had (5 of 5)
                    — 2 inventory label(s) this dashboard cannot produce
```

*This dashboard cannot produce* is a claim about the **product**, and it rested
on one test: `last.at === last.of`, the walk ended on the last card of a block.
**At a tab boundary that is exactly what a walk that died looks like** — the
card there reads `5 of 5` too. So the run wrote its own truncation off as a
property of the dashboard, **once per run**, which is why the truncating run
exits 0 and passes the gate while the complete walk fails it.

**THE TELL, AND IT IS THE ONE TO LEARN.** A skip is a POSITIVE claim about the
world. Ask of any skip you meet: *what act established this, and what could
have contradicted it?* Here the answer was "the walk stopped" — which is the
same sentence a broken walk produces, so nothing could ever have contradicted
it. **A skip nothing can refuse is an assertion wearing a measurement's
clothes.**

**AND THE REPO ALREADY HAD THE RULE, FORTY LINES AWAY.** `sweep-widths.mjs`
issues skips in exactly two places. One is `declareSkip(label, reason,
reachable)`, which re-probes and **refuses** the skip if the surface is
actually there — *"the run proves the surface was genuinely out of reach rather
than taking the caller's word for it"*. The other was a bare `SKIPPED.push`
with no probe at all. Same shape as the animation fix that lived in
`screenreader-structure.mjs` while the script measuring nothing but edges went
without: **a technique that lives in one instrument is not a technique the repo
has.** When you add a skip, go and read how the neighbouring skip proves
itself.

**The rule now:** a skip carries the evidence that the surface was reached and
refused, or it is not a skip and the run does not get to pass on it. The
evidence is an **act** — a probe that came back empty, a press and a full wait
that produced no card — never a state observed in passing. And **a run may not
grade itself on skips it issued**, which is the whole failure in one sentence.

## `git commit <pathspec>` READS THE WORKING TREE, NOT THE INDEX YOU CAREFULLY BUILT — 2026-09-20

A second costume for *"`git add` puts your files in a shared index"*, further
up this file — same disease, different door in.

Two sessions were both mid-edit on `ROADMAP.md`, in different sections. A
plain `git add ROADMAP.md` would have staged the other session's uncommitted
hunk along with mine, so the partial-stage was done properly instead:
`git diff` to a file, trimmed to the two hunks that were mine, applied with
`git apply --cached`. `git diff --cached` read back exactly those two hunks —
proof the index held only what was intended.

**Then `git commit ROADMAP.md FOR-ANDREW.md` threw the careful index away.**
Naming paths on a commit does not commit the index for those paths — it
re-adds them from the CURRENT WORKING TREE first, as `--only` in git's own
docs describes, which for a file another session is still editing is a
different, larger diff than the one just verified. The commit landed at 112
insertions against a staged 34, silently carrying the other session's
half-finished audit into a commit message about something else entirely.

**Caught by checking the committed diff, not the staged one** — `git show
--stat HEAD` and a grep for the other session's own words, found only because
the insertion count didn't match what `--cached` had just shown. Undone with
`git reset --soft HEAD~1`, which moves HEAD back without touching the index
or the working tree, so nothing already typed by either session was at risk;
redone as `git apply --cached` followed by a bare `git commit` with **no
pathspec at all**, which commits the index exactly as it stands.

**The rule the existing one did not cover:** reading back `git diff --cached`
proves the index at the moment you check it. It proves nothing about the
commit that follows if that commit command names paths — because naming
paths is its own silent `git add`. Commit what you staged either by leaving
the pathspec off entirely, or by re-reading `git show --stat HEAD` /
`git diff HEAD~1 --stat` **after** the commit, the same way the staged
content gets read back before it. A commit is not verified until the commit
itself has been looked at.

## AN ENGLISH REGEX DOES NOT MISS ON A SPANISH PAGE — IT READS ABSENCE AS PROGRESS AND RUNS AWAY — 2026-09-20, ROADMAP 14.10

Every other entry about language in this file is about a check going **blind**:
nineteen settings screens unopened, eight labelled screens vanishing, a
`:has-text()` frozen in English. This one is worse, and it is the reason it has
its own section. **A word-matcher that fails to match does not always stop. It
can hand back a value that the code above it reads as good news.**

The width sweep reads the tour card's step counter:

```js
const m = /(\d+)\s*OF\s*(\d+)/i.exec(raw);   // "3 OF 8"
return m ? { at: …, of: … } : null;
```

The card renders `t("{n} of {total}")`, and `appEs.js` maps that to
`"{n} de {total}"`. **So on every Spanish card this returned `null`.** One line
up the stack, the wait that decides whether the next card has arrived read
`null` as *"this is not the card I pressed, so a new one is here"* — and
returned immediately, every time. The walk therefore never waited, never saw
the tour end, and pressed *Next* up to its ceiling of 48 on a card that was no
longer advancing, until a click timed out **and took the entire width with it**:
`WIDTH ABORTED at 1440px after 124 surface(s)`.

**Two sessions read that as a slow page and a flaky timeout before anybody read
it as a regex.** It was reproducible — 118 of 152, then 124 of 152 — and both
times the language was the only thing the English runs did not share.

**THE RULE.** Anything in these instruments that matches on WORDS has to be
language-aware, or it is only measuring one of the two languages this product
ships. That means the visible strings, and it also means the **grammar around
them** — a joining word like `of` is as English as a label is. `NAMED()` and
`NAMED_TEXT()` exist for the labels; a regex over rendered text has no such
helper and must carry both spellings itself.

**AND THE PART THAT GENERALISES BEYOND LANGUAGE.** The regex failing was a
one-line bug. What made it cost a whole width was the caller treating
*unparseable* as *changed*. Ask of any parser in a check: **what does the code
above me do when I return nothing, and is that the same thing it does when I
return something new?** If it is, an unreadable page and a progressing one are
indistinguishable, and the check will run away rather than stop. The fix keeps
the raw text as an identity, so a card whose counter cannot be parsed at all
still compares equal to itself.

**The stale-key half, in the same hour, in the same file.** `BUSINESS_ROWS`
named a settings row `"Maintenance deadlines"` after it was renamed to
`"Visits due"`. `NAMED_TEXT()` looks the English up in `appEs.js`, which is
keyed on the CURRENT English, so a stale key returns the bare old English and
matches nothing — **invisible twice over in Spanish.** The comment at the top
of that array already says exactly this, in those words. The array went stale
anyway. **A warning above a list does not keep the list current; only a check
that fails does** — here the expected-count gate, which named the screen.

## A CHECK THAT REPORTS A MISSING TRANSLATION WHEN THE TRANSLATION IS PRESENT — 2026-09-20, ROADMAP 14.14

**This is the worst shape in this file and it belongs at the end of it.** Every
other entry describes a check that failed to see something. This one describes
a check that produced a **confident, specific, wrong finding** — and the cost
is not a missed defect, it is **sending somebody to change a file that was
already right.** A manager nearly turned it into a work order for another
session; the string it named had been correct all along.

**Say it plainly, because it inverts the usual instinct: a check that reports
a present translation as missing is WORSE than one that misses a real gap.** A
missed gap leaves the product exactly as it was and waits to be found again. A
false one spends somebody's afternoon editing a file that was already correct,
and — worse — it spends their confidence, because they end up defending work
that never needed defending. The other session did exactly that today.

**AND NOTE HOW IT WAS CAUGHT, BECAUSE THAT IS THE EXPENSIVE PART.** Not by the
instrument. **By two sessions disagreeing, and a third party opening the actual
file and reading line 464.** That is the most costly detection path this repo
has: it needs two people to be in the loop, one of them to refuse the finding,
and somebody senior to go and look. It does not scale and it will not happen
the next time nobody is watching. **The canary below is what makes the same
catch cost nothing** — one filesystem read, no browser, at the top of every
run.

**What actually happened, in the order it happened, because the order is the
lesson.**

1. A settings row was renamed from `"Maintenance deadlines"` to `"Visits due"`,
   and `"Visits due": "Visitas pendientes"` was added to `appEs.js` **in the
   same edit**. That work was correct and committed.
2. `sweep-widths.mjs` still named the row by its old English in `BUSINESS_ROWS`.
3. `NAMED_TEXT("Maintenance deadlines")` looked that up in the catalogue, found
   nothing, and **silently fell back to the bare English string** — which also
   matches nothing, because the product no longer renders those words.
4. The run printed `NEVER MEASURED  Business · Maintenance deadlines`. **That
   output was TRUE.** The sweep did not measure that surface and said so.
5. Then a second, ad-hoc check grepped `appEs.js` for each of the seven row
   names **taken from the sweep's own stale array**, found no key for
   `"Maintenance deadlines"`, and reported *"the only settings row with no
   Spanish entry"*.

**Step 5 is the defect and it is not a grep bug.** The second check inherited
its search term from the first check's wrong input, so it could only ever
agree. **Two instruments, one shared stale string, and the agreement read as
corroboration.** `docs/gotchas.md` already says *"two wrong readings pointing
the same way feel like confirmation and are not"* — this is the sharper
version, where the readings were never independent because one fed the other.

**THE RULE THAT FALLS OUT OF IT.** When a check reports that something is
absent, **do not confirm it with a second check built from the same identifier.**
Go to the artefact a human would open — here, the row in `Business.jsx`, which
says `["maintenance", "Visits due", …]` and settles it in one line. A
confirmation is only worth the independence of its input.

**AND THE ENABLING DEFECT IN THE INSTRUMENT, which is the fixable half.**
`NAMED_TEXT(x)` falls back to bare English whenever the catalogue has no entry
for `x`. That fallback cannot distinguish:

- `x` is deliberately untranslated, so English is correct; from
- `x` was renamed, so the array is stale and the pattern matches nothing.

Both produce the same regex and the same silence. **A missing catalogue key is
not automatically an English string — it is just as likely a stale key**, and
the check had no way to say which.

**The guard, and it needs no browser:** every row label the sweep names must
still appear somewhere in `app/src`. `node scripts/sweep-widths.mjs --labels-only`
runs just that and exits; `SWEEP_LABEL_CANARY=1` injects a label that cannot
exist. Verified both ways, and verified against the real case: with the array
holding `"Maintenance deadlines"` the guard flags it, with `"Visits due"` it
passes. It would have caught this on the first run after the rename.

**The audit that followed, for the size of the problem:** of the **27 strings
this sweep matches on**, exactly **one** was stale and **none** lacked a Spanish
key. So the other six settings rows were never in this state — the blast radius
was one row. That number is worth having, because the fear was that six more
findings were the same shape and they were not.

---

## A BROWSER TAB'S OWN CONSOLE LOG DOES NOT CLEAR ON RELOAD, SO ONE OLD ERROR READS AS A REPEATING ONE — 2026-09-20

**Cost: a wrong claim written into ROADMAP.md and caught only because Andrew
asked for the exact string before believing it.**

A console error appeared once during a long session — `Uncaught
NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be
removed is not a child of this node.`, caught by `ErrorBoundary`, paired with
`createRoot() called on a container that has already been passed to
createRoot()`. `location.reload()` was called on the same tab several times to
see whether it recurred, and every time, the SAME error was still in the
console output. It was written up as "reproduces on a plain reload with no
interaction."

**It had not reproduced even once. It had never gone away.** The tool that
reads a tab's console messages was returning that tab's whole accumulated
history, not what the current page had just logged, and nothing about a
`location.reload()` call clears it. A fresh tab, navigated cold to the same
URL against the same server, showed zero errors. So the "reproduction" on
every reload was one event from early in the session, read back N times and
mistaken for N events.

**The tell was there and was not read as a tell:** the entries never moved.
Same order, same text, every time, with only a manually-logged marker string
appending after them. A REAL repeating error varies at least in its stack's
line numbers or its surrounding lines as the app's state drifts; this one was
byte-identical across every "reproduction."

**The rule:** a claim that something recurs on reload must be proven from a
FRESH tab — `tabs_create`, navigate cold, read console — never from re-reading
a tab that has been open and reloaded before. If a console tool's own
behavior on reload is not documented, assume it accumulates until proven
otherwise, the same way (g) says assume the dev server is stale until proven
otherwise. Age a tab the same way you age a dev server: an instrument that has
been running the whole session is not neutral evidence about what just
happened.

**AND THE TWO STALENESSES COMPOUND, AND THE ORDER MATTERS — the other
session's addendum, 2026-09-20.** A stale server serves code that is no
longer on disk; a stale tab misreports what the current code just did.
Restarting one and not the other still leaves a false reading, because a
tab reconnected to a fresh server carries forward everything it accumulated
against the old one — the console entries from before the restart are still
sitting there, now attributed to code that never produced them. **Kill the
server, start it cold, THEN open a new tab** — reconnecting an old tab to a
fresh server is not the same as starting fresh.

## A THING ASSEMBLED AT THE POINT OF USE CANNOT BE FOUND BY SEARCHING FOR ITS WRITTEN FORM — 2026-09-20, and this is the THIRD instance in one day

Three separate searches in one day returned a confident wrong answer for the
same reason: **the string being looked for does not exist anywhere in the
source. It only comes into existence when the code runs.** A grep can only see
what somebody typed.

**Instance one, earlier and already recorded above: the em dash that only
existed after two values met.** A sweep for `t("…")` strings found sixty-five
dashes and missed `Beyond 15 miles — +$40`, because that dash lives in a
template literal joining a travel area's NAME to its FEE. The dash is written
nowhere; it is produced.

**Instance two: `process.exit(cond ? 1 : 0)` escaping a search for
`process.exit(1)`.** Auditing which gates fail loudly, a grep for
`process.exit(1)` reported `accent-sweep.mjs` and `sweep-booking-steps.mjs` as
**never exiting non-zero**. Both do:

```js
process.exit(failures === 0 ? 0 : 1);      // accent-sweep
process.exit(failing ? 1 : 0);             // sweep-booking-steps
```

The exit code is computed. `1` is never adjacent to `process.exit(`. The audit
had classified two gates as toothless when they had teeth.

**Instance three, in the measurement OF instance two: `$?` after a pipe is the
LAST command's status.** Proving a new guard, the check was:

```bash
I18N_SURVEY_CANARY=1 node scripts/i18n-survey.mjs 2>&1 | tail -6; echo "exit=$?"
```

which printed `exit=0` over a guard that had correctly exited **1**. `$?` was
`tail`'s. The failure path was working and the instrument measuring it said it
was not. Re-run without the pipe: `exit=1`. **Never read `$?` through a pipe**
— capture to a file, or `${PIPESTATUS[0]}`, or drop the pipe.

**BOTH OF MINE WERE WRONG IN THE FLATTERING DIRECTION, WHICH IS THE HALF A
READER WILL SKIP.** The `process.exit` grep made the repo look worse than it
was — it manufactured a finding, which is the direction that gets written up
and acted on. The `$?` reading made my own new guard look broken when it
worked — the direction that gets a working thing "fixed" until it breaks.
Neither error was in the direction that would have been caught by somebody
disagreeing with me, because **an error that flatters your own thesis reads as
confirmation and an error that indicts your own work reads as honesty.** Both
survive review.

**THE RULE.** Before trusting any search for a literal, ask: **could this
string be built rather than typed?** If it could, the grep answers a different
question than the one asked, and a zero result means nothing. Three shapes seen
so far, all in this repo:

- **Concatenation and interpolation** — a label joined from two values, an exit
  code from a ternary, a class name from a template literal.
- **Indirection** — `button:has-text("${tab}")`, where the real labels are one
  `const TABS = [...]` away. `scripts/label-guard.mjs` follows exactly one such
  hop for this reason.
- **A different process's answer** — `$?` after a pipe, an exit code swallowed
  by a wrapper, a status read from the wrong end of a chain.

**And the general form, which is the one to carry:** a grep asserts how
something is WRITTEN. Only running it asserts what it DOES. That sentence is
already in this file, in `(k)`, about source checks versus computed values —
**it was written months ago and did not stop any of the three.** Which is its
own lesson: a rule stated abstractly at the top of a long file does not fire
at the moment somebody types a grep. Three instances now carry the concrete
shape, and the concrete shape is what a person recognises.

## AN INSTRUMENT WILL ANSWER A QUESTION ABOUT A MOMENT THAT HAS NOT FINISHED HAPPENING — 2026-09-20, three times in one night, which makes it a rule

Three separate readings in one session, from three different instruments, all
the same shape: **the thing being asked had not finished being itself yet, and
nothing in the answer said so.**

1. **A browser tab's console log, read across reloads.** One old error, still
   in the buffer, read as a fresh error recurring on every reload. Two sessions
   chased a phantom. *(Its own entry above.)*
2. **`$?` after a pipe.** `node script.mjs | tail -6; echo "exit=$?"` printed
   `exit=0` over a guard that had correctly exited **1**. `$?` was `tail`'s.
   *The failure path was working and the instrument measuring it said it was
   not.*
3. **A `javascript_tool` read taken from a browser pane mid-reload.** It
   returned `innerWidth: 0`, and with it `choicesW: 0` and `wrapW: 32` — a
   complete, confident, structured answer about an element on a page that was
   not there yet.

**THE THIRD ONE IS THE ONE TO BE FRIGHTENED OF, AND IT IS WHY THIS IS A RULE
RATHER THAN THREE ANECDOTES.** It was caught **only because zero is obviously
wrong.** Nothing in the tool's response distinguished it from a real reading —
no error, no warning, no flag. **Had that same mid-reload moment returned a
viewport of 380 instead of 392**, the numbers would have been plausible, would
have been believed, would have gone into a document, and would have been
argued from. The catch was luck dressed as diligence.

**THE RULE.** Before trusting any reading from a live surface, establish that
the surface finished arriving. Not "wait a bit" — **check a value that is
impossible before it has**:

- a **viewport of zero**, or one that does not match what you set;
- a **`document.readyState`** that is not `complete`;
- a **`location`** that is not where you navigated;
- an **exit status read through a pipe** — capture to a file, or
  `${PIPESTATUS[0]}`, or drop the pipe;
- a **console buffer** from a tab that was already open.

**And the general form, which is the half that transfers past browsers:** an
instrument asked about an in-progress state does not usually refuse. **It
answers.** The answer is well-formed, fully populated and wrong, and it is
indistinguishable from a good one **except by whether the number is impossible
on its face.** So build checks whose wrong answers are impossible rather than
merely improbable — that is the whole reason `expected_targets` must be a
declared constant, why a canary must be a defect nothing could survive, and why
`docs/silences.md` counts checks that can only fail. **This entry is the same
principle pointed at the moment of measurement rather than at the design of the
check.**

## `display: contents` HAS NO BOX, SO A SUM OF CHILDREN SILENTLY DROPS ITS SUBTREE — 2026-09-20

Measuring a column by adding up its children is the obvious thing to do, and it
undercounts without a word of warning:

```
.bk-wrap's children at 1440x900, riverside step 1
  div.bk-step-head   display: flex       rect  58px
  div.bk-step        display: contents   rect   0px   <- 309px inside it
```

**A `display: contents` element generates no box**, so `getBoundingClientRect()`
returns 0 for it while its children are laid out as though they were the
parent's own. A naive sum read **58px** for a step that actually needs **435px**
— it dropped 84% of the column, and it looked like a plausible number rather
than a mistake.

It cost real work: **58px** went into three committed documents as the
illustration of a different finding, before the flattening version of the same
measurement contradicted it. The conclusion it illustrated survived, because
that had been measured directly; the illustration had not. **An illustration
nobody measured is not evidence, however true the thing it illustrates.**

**The fix is one line, and this repo already had it in the neighbouring code** —
`sweep-booking-steps.mjs` has flattened contents children for months when it
names the tallest blocks. The height sum now flattens the same way:

```js
[...el.children].flatMap((k) =>
  getComputedStyle(k).display === "contents" ? [...k.children] : [k])
```

**Ask of any child sum: could one of these be `contents`?** The symptom is a
total that is suspiciously small and does not move when the page plainly does.

## A DOCUMENT ABOUT ANOTHER DOCUMENT GOES STALE SILENTLY, BECAUSE NOTHING CHECKS PROSE AGAINST THE THING IT DESCRIBES — 2026-09-20, BROADENED 2026-09-23

**Third one caught in one night, which is what makes it a pattern rather than
a typo.** A sentence that states a fact about a DIFFERENT file — a line
count, a command, a verdict — has no test watching it, because the thing it
is wrong about lives somewhere else entirely. Nothing re-reads the target and
diffs it against the claim; the prose just sits there being believed.

**BROADENED 2026-09-23: it is not only documents describing documents.**
Three days and four more instances later, the same failure showed up
describing LIVE SYSTEM STATE — a roadmap line counting protected edge
functions, a receipt's own bookkeeping field, a self-referential floor
inside a check's own code. The target does not have to be another file for
this to happen; it only has to be something that can change without the
sentence noticing.

1. **The verification table told people to run a test suite as a script.**
   `node --test tests/*.test.mjs` read as `node --test tests/` for long
   enough that `docs/VERIFIED.md` parked the failure twice as "somebody's
   decision" rather than the missing-glob typo it was. Corrected in
   `CLAUDE.md`, this repo's own command reference.
2. **A receipt's stored verdict outlived the commit it was measuring.**
   `receipts/sweep-widths-1920-1440-392-360-320.json` still reads `"status":
   "fail"` for four findings a later commit (`91dc891`) fixed — confirmed
   with `git merge-base --is-ancestor`, not assumed from the word "fail."
   Stale, not wrong, and indistinguishable from the outside without checking
   the `git_sha` against the tree.
3. **This file's own rulebook drifted past the number written about it.**
   `ROADMAP.md` said `CLAUDE.md` was 192 lines against a 200-line ceiling. It
   is 382 (`awk 'END{print NR}' CLAUDE.md`, 2026-09-20) — grown 190 lines
   since whoever wrote that sentence last measured it, and nothing here
   re-measures a claim like that on its own.
4. **A roadmap item's own title named a count that was already wrong before
   the session touched it.** ROADMAP 14.9 said "nine public endpoints have
   no rate limit," naming `booking-ics` among them. A different item, 14.2,
   had already given `booking-ics` a rate limit — the true count was eight,
   not nine, and had been for however many days sat between the two items
   landing. `grep -rl withinLimits supabase/functions/*/index.ts` is the
   only thing in this repo that has never been wrong about it.
5. **The same session's own fix created the identical trap one layer up.**
   Fixing four of those eight and writing "six have it, four do not" beside
   the old "six have it, nine do not" is two true sentences that add to a
   false total: 6+4=10, and the real surface was fifteen. Nobody lied;
   the two numbers were just never designed to be added together, and
   nothing about how they were written down says so.
6. **A receipt's own dimensions field carried a bookkeeping number nobody
   would notice.** `migration-drift.json`'s `types_unjudged: 116` sat beside
   neutral fields like `tables_declared` with no denominator — 116 of what?
   116 of 592, it turned out, meaning "columns checked by type" quietly
   meant 80% of what the receipt's own prose claimed. Moved into `warnings`
   with the denominator attached; a count with nothing to divide it by
   reads as bookkeeping even when it is a blindness.
7. **A check's own pass/fail floor was computed from the same number it
   was meant to police.** `rate-limit-coverage.mjs` set
   `min_assertions: EXPECTED_COUNT + CANARY_RUNS` — so shrinking the
   declared function list and the floor moved together, and the floor could
   never fail on a shrinkage no matter how large. `receipt.mjs` graded it
   PASS on a test run with two-thirds of the real list removed. Fixed by
   making the floor a literal, independent of the constant it is supposed
   to catch drifting — the same shape `migration-drift.mjs`'s
   `min_assertions: 1000` already was, copied rather than reinvented.

**The fix in each case is the same shape: cite the measurement, not the
number.** A sentence that says what a file contains should say how and when
that was checked, the same way every entry in this file is dated — a bare
claim about another document's line count, status, or wording has no expiry
date stapled to it, and it will outlive the thing it describes without
anyone deciding that it should.

**THE PATTERN, ASKED FOR DIRECTLY RATHER THAN LEFT IMPLIED IN SEVEN EXAMPLES:
is there a class of number in this repo that is systematically unreliable,
and can a counted number be told from a remembered one by looking at it?**
Every instance above is a **derived count written down as prose** — a
tally somebody produced once, by running something or reading something,
and then typed into a sentence that outlived the act of counting. The
class is not "numbers in this repo" generally: `LIMITS.publicCeiling`'s
`600` doesn't drift, because it is a value the CODE reads, not a claim
ABOUT the code. It is specifically **any count whose only home is a
sentence** — nine endpoints, 192 lines, six protected, 116 unjudged. That
class is unreliable not most of the time but **eventually, always**,
because nothing re-runs the count when the thing counted changes, and nine
files and 592 columns don't announce their own drift.

**Told apart by looking, honestly: no, not reliably.** "Nine public
endpoints have no rate limit" and "eight public endpoints have no rate
limit" are typographically identical in every way that matters — same
confidence, same font, same absence of a date or a command. The one tell
that exists is exactly what item 1 above's fix already was: whether the
sentence names **the command that produced it** and, ideally, **when**.
`grep -rl withinLimits supabase/functions/*/index.ts` beside a count is a
number with an expiry test built in — anyone doubting it can re-run four
words and know. A bare "nine" is not lying, but it is asking to be
believed rather than checked, and looking at it harder does not help,
because the sentence that is still true and the sentence that has gone
stale read exactly the same. **This argues for something this repo does
not have: a convention that a derived count is never written without the
command beside it** — not a new tool, not a new check, just the same
discipline `docs/silences.md` already holds every receipted script to
(state the method, state the scope, state what it does not cover),
applied to the sentences in `ROADMAP.md` and `docs/` that quote a number
without quoting how it was gotten. Nothing here enforces that today, which
is the honest way to end this rather than claiming the problem is solved
by writing the seventh example of it down.

---

## SIX THINGS FROM THE 2026-09-22 SPANISH SWEEP, NONE OF THEM WRITTEN DOWN ANYWHERE ELSE

**Recorded at the end of a session rather than lost with it.** Each was
measured, not reasoned about.

**1 · A whole pocket of the dashboard is Andrew-only and must NOT be
translated.** `App.jsx`'s six untranslated strings are the **impersonation
bar**, and the comment above it says *"a detailer can never see it"* — it
renders only in a back-office preview tab. `i18n-survey.mjs` excludes
`admin/`, but this bar lives in `App.jsx`, so it slips the net and reads as
six chores. **English is correct there.**

**2 · The survey's new interpolated-string pass does not exclude URL
schemes.** `BookingDetail.jsx:254` reports `` `sms: body=` `` as a phrase. The
pass filters `://`, a leading slash and media queries; **`sms:` and `tel:` get
through.** One more alternation would fix it. Not done — the instrument was
not to change while a sweep was running against its number.

**3 · `tests/spanish.test.mjs`'s duplicate-key check does not see a duplicate
whose VALUE is identical.** Proved by accident: a duplicate
`"They asked for": "Pidieron"` was added at line 1795 beside the original at
1221, **and 9f did not report it** — while reporting six others, all of which
have differing values. **So "no duplicate keys" means "no CONFLICTING
duplicate keys".**

**4 · An existence check that greps with a trailing space finds nothing.**
That is how the duplicate above was created: `grep '"They asked for '` misses
`"They asked for":`. **Check for the key with its colon, or let the Edit tool's
ambiguous-match refusal be the guard** — which is what actually caught it.

**5 · A settings save can report "Saved." having written nothing.**
`BusinessInfo.jsx` writes the review links with `.update()`, not an upsert. A
business with **no `business_settings` row** matches zero rows, PostgREST
returns no error, and the screen says *Saved.* **Not reachable through normal
signup** — all 16 real businesses have a settings row and only a hand-made
fixture lacked one — so it is a fragility, not a live bug. Same shape as the
`e2e-booking` customer leak: **a success and a no-op that are identical to the
caller.**

**6 · SUPERSEDED 2026-09-22 — KEPT VISIBLE, NOT DELETED, BECAUSE THE
REVERSAL IS THE LOAD-BEARING PART. THIS PARAGRAPH WAS NEVER TESTED AND
WAS WRONG; READ THE CORRECTION THAT FOLLOWS IT.**

**6 · A SESSION CANNOT OPEN A SIGNED-IN DASHBOARD, AND THIS IS THE STRUCTURAL
ONE.** `business_users`' select policy is
`business_id IN (SELECT current_business_ids())`. A row inserted with the
service role is **not visible to that user's own session**, so a fixture
business built by script **cannot be opened in the browser** — the app shows
the create-a-business gate. Every other route in needs a password or an
admin-generated sign-in link, and **both are credentials a session may not
handle.** So dashboard copy can be *changed* by a session and never *seen* by
one. **The failure mode is not a crash: it is copy verified by reading, for
months, with nothing anywhere saying that is what happened.**

**6 · CORRECTED 2026-09-22, THE SAME DAY IT WAS ACTED ON TWICE — "A SESSION
CANNOT OPEN A SIGNED-IN DASHBOARD" WAS NEVER TESTED, AND IT WAS FALSE.**
Andrew's own words, relayed: *"If I click sign in, it takes me straight to
it. And if you look at them, it should be able to log in just fine, it has
its own passwords and ways. There should be nothing blocking it from
viewing its own code. There's nothing, no password can be blocking it."*
He was right, and this entry was wrong — not overstated, wrong, and **no
receipt, script, or test run anywhere in this repo backs the original
claim.** It reads as reasoning about how RLS should behave, stated as
something measured.

**Tested rather than argued, by signing in as the demo owner
programmatically** (`scripts/verify-backoffice-access.mjs`, committed as a
real, reusable tool rather than a one-off — the next session that doubts
this should run it, not re-argue it; the credential is read out of
`scripts/seed-demo.mjs` into memory and never printed, logged, or pasted
anywhere, per standing rule). The demo owner's
own `business_users` row is itself inserted by a direct POST to
`/rest/v1/business_users` using the **service role key**
(`scripts/seed-demo.mjs:147`) — exactly the scenario this entry claimed was
invisible to that user's own session. **It was not.** A cold sign-in
reached the real, live dashboard — "Coastline Auto Detailing," real jobs,
real figures — and the Clients screen loaded 13 real rows with real names,
dates, lifetime spend and phone numbers. Screenshotted:
`receipts/screenshots/backoffice-access-2026-09-22/`.

**Why the wrong claim survived unnoticed for a day: the person who wrote it
had, in the same session, already signed into this exact account and used
the exact dashboard it claims is unreachable** — the Spanish sweep that
ran earlier the same day walked Today, Calendar, Money and Clients through
this identical login. The claim was written despite direct, contradicting,
first-hand evidence sitting in the same session's own history. **A
measurement is not "already known" just because a document says it was
measured; check the receipt, not the confidence of the sentence.**

**AND A REAL, NARROWER GOTCHA HIDING INSIDE THE FALSE ONE, WORTH KEEPING ON
ITS OWN: Andrew's browser and a fresh session are not the same starting
state, and confusing them reads as a contradiction that is not one.**
Andrew clicking "Sign in" lands him straight inside, because his own
browser already holds a live session from signing in earlier. A session
testing the same route cold gets the credential form every time, because
it has no session to reuse. **Same page, different starting state — not a
disagreement about whether the route is reachable.** A session reporting
"the sign-in form appears" and an owner reporting "it opens straight up"
can both be telling the truth about the same URL.

**WHAT THIS ACTUALLY MEANS FOR THE REST OF THIS REPO, SAID PLAINLY: THE
DEMO ACCOUNT IS A REAL, WORKING, ANDREW-SANCTIONED DOOR INTO THE SIGNED-IN
DASHBOARD, AND SESSIONS MAY USE IT.** Andrew, relayed: the demo password
already being committed in this repo (`scripts/seed-demo.mjs` and
elsewhere) *"is his own decision rather than a risk"* — he knows it is
there. **Sign in programmatically, from a script, never by printing or
pasting the value anywhere — not into a document, not into chat.** The
part of the original entry that remains true: a **real** detailer's
password or an admin-generated link for a **real** account are still
credentials no session may handle. The demo account is the one, specific,
already-authorised exception, not a general licence to type any password
found in the repo.

**THE COST WAS NOT ONE ITEM, IT WAS EVERY ITEM: this claim capped what
ANY session could verify across the ENTIRE back office, for as long as it
stood.** Every dashboard screen this repo has ever shipped, changed, or
planned to change was, by this entry's own words, unseeable by a session
— not "hard to check," not "needs care," *unseeable*. That is not a
limitation on one roadmap item. It is a limitation on the single most
load-bearing verification this repo has: showing Andrew the evidence
before checking a box. Named concretely rather than left as a general
claim: ROADMAP 9.6 was closed today citing exactly this entry as the
reason a session could not add its own verification — it closed
correctly, on Andrew's own prior, dated, on-screen approval, but the
session doing the closing believed, wrongly, that it structurally could
not have checked the screen itself. It could have. That item happened to
survive on a quote already sitting in the file. **The next one might not
have, and would have stayed open, or been handed to Andrew as a question,
for a reason that was never true.**

**AND WHY IT SURVIVED A FULL DAY UNCHALLENGED: it was never tested, it
was INHERITED.** Whoever wrote it did not run it against the account this
same session had already used successfully hours earlier — the claim
carried forward from one stretch of work into the next as settled fact,
the way a conclusion crosses a handoff or a context summary without the
receipt that produced it crossing along with it. **That is the same
failure as a check nobody broke on purpose**, one level up: a check
untested is a claim no different in kind from a person's untested
assertion, and this repo already has a rule for the first ("break it on
purpose before trusting it") with no equivalent yet for the second
("re-run it before repeating it"). Andrew was right, and he was right
without looking at any of it — the claim had never been tested by anyone
who did.

**Sweep state when this was written:** `i18n-survey.mjs` reads **134 → 128 in
30 files**; three screens done (the job record, the day sheet, the quote
sheet), each committed separately with the survey re-run after every one and
the fall matching the fix exactly. Next by frequency: the money screens.


## AN INSTRUMENT THAT DISTURBS THE STATE IT IS INSPECTING — three of them in one day, 2026-09-22

**This is a class, not an incident, and it is named here because all three
turned up inside a single item (ROADMAP 2.1) and every one of them printed
CLEAN while measuring nothing.** None is a bug in the product. Each is a check
whose own act of looking changed, hid or skipped the thing it was looking at.

**One — a walk that closes the gap it is measuring.** `surcharge-visible.mjs`
walked the booking flow day → time → look, and asked whether the weekend
surcharge was visible. It was, at fifteen targets, at five widths. **The fault
lives only in the state BETWEEN the two taps** — a day chosen, no time chosen,
a bar showing a price the server already knows is wrong — and tapping the time
is what ends that state. So the instrument destroyed the evidence on its way to
the measurement, then correctly reported that it found none. Andrew found it in
minutes by choosing a Sunday and *waiting*. **The check asked "is it visible"
and needed to ask "is it visible BEFORE the customer can be charged it": one
word apart, opposite answers.** The fix is to assert on the intermediate state
explicitly, and to notice that any check which advances a wizard has the same
hole for every other step.

**Two — a probe that scrolls the page it is about to photograph.** The same
file pressed Continue early to prove the step refuses to be left without a
time. Roadmap 2.6 says a refused press turns the reason on **and scrolls to
it** — so the probe left the page near the bottom of a 1,400px step, and every
geometry reading afterwards was taken from a scroll position the script itself
created. Its canary, which rebuilds a real defect (the surcharge note rendered
below nineteen time chips), then **caught 0 of 5** — the note was in view only
because the probe had scrolled there. The defect was plainly visible in the
canary's own saved screenshot the whole time. **A probe that presses something
is a probe that moves something.** Reset the state it disturbed, or measure
before you press.

**Three — a canary fired once and called deterministic.** Running a canary a
single time cannot tell "it caught it" from "it happened to catch it". Five
runs is the floor, and the catch count goes in the receipt rather than a
boolean, because 4/5 is a coin and reads identically to 5/5 in any check that
only records `observed_failure: true`. Related and worse: **a canary flavour
that exercises only one of a check's assertions leaves the others untested.**
`surcharge-visible.mjs` had a canary for "the line is in the wrong place" and
none for "the line is not there at all" — so its `named` assertion had never
once been observed failing, and an assertion that has never failed is an
assertion nobody has tested. It grew a second flavour that strips the
adjustments out of the server's answer.

**WHAT THE THREE HAVE IN COMMON, AND THE QUESTION TO ASK NEXT TIME.** Not
"does my check look at the right thing" — all three did — but **"does the act
of looking change what is there?"** A screenshot taken before a reveal
animation settles, a walk that advances past the state under test, a press that
scrolls, a canary that only ever tested one branch. `pinned-bar.mjs` learned the
same lesson from the other end when its `edge` assertion had to become the
difference between two renders of the same frame, because everything else it
tried was reading the background instead of the shadow. **CLAUDE.md's
`git diff --cached` correction is this class in the rulebook rather than in a
script**: the obvious way to verify a commit safely was to stage it first,
which opened the exact window the rule existed to close.

## A REMOTE-CONTROL SESSION DOES NOT TIME OUT ON IDLE — MEASURED, 2026-09-23

**Keep-alive pinging a Claude Code session to stop it dying is spent usage
buying nothing.** This was assumed for some time and never checked.

**What was measured, from two real gaps rather than a test:**

| session | gap since its previous turn | result |
|---|---|---|
| DP Cowork | **20 h 08 m** | answered, cold, **first try** |
| this session | **26 h 33 m** | answered, cold, **first try** |

**Lower bound: 26 hours 33 minutes. No upper bound was found, because nothing
timed out** — the gaps ended when somebody sent a message, not when anything
expired.

**So a 20-minute keep-alive ping is buying nothing** and costs real usage
every time it fires. **Do not add one, and delete one if you find it.**

**Stated honestly: this proves a floor, not a ceiling.** Something may expire
at some length nobody has reached. What it removes is the belief that a
session goes stale in minutes or hours, which is the belief the pinging was
built on.

## TYPING INTO A CLAUDE.AI COMPOSER RIGHT AFTER NAVIGATING GOES NOWHERE — 2026-09-23

**Three dispatches were lost this way in one night before anybody noticed.**

Navigate to a session, type into the composer, press send. **The keystrokes
are accepted. The box stays empty. No message is sent. Nothing anywhere
reports an error** — not the type call, not the page, not the console. The
composer is not ready yet and silently discards the input.

**It is this file's oldest shape: an action that reports success having done
nothing.** It is worse than most, because the thing lost is an instruction to
another session, so the failure shows up later as that session doing nothing
and looking idle.

**THE RELIABLE SHAPE, and it is four steps rather than one:**

1. **Click** the composer.
2. **Type one throwaway word.**
3. **Read the box back** and confirm the word is in it.
4. **Select all, type the real message, read it back again**, then send.

**It was caught by screenshotting the box instead of trusting the type
call** — which is the general rule underneath: *after any input into a page
you did not watch load, read the field, do not read the tool's return value.*
The tool is reporting that it typed, not that anything received it.


## THE COMMENT DESCRIBING THE FIX CONTAINS THE STRING YOU ARE SEARCHING THE BUNDLE FOR — 2026-09-23

**You want to know whether a deployed edge function carries a fix. You pick a
distinctive string from the new code, count it in the deployed bundle, and get
a number. The number can be produced entirely by the comment that explains the
fix, sitting in the same file.**

`deployed-inventory.mjs` says so in its own header — its method is *"comment-text
comparison against the deployed eszip bundle"*. **Comments survive into the
bundle.** So do the comments inside a shared module, once per copy of that
module the bundle carries.

**THE CASE.** ROADMAP 2.1 changed one line in `whenContextFor`:

```
-  if (!bookingDate || !startTime) return {};
+  if (!bookingDate) return {};
+  if (!startTime) return { weekday: weekdayOf(bookingDate) };
```

and the new code carries a comment that reads *"This used to be
`if (!bookingDate || !startTime) return {}`"*. Searching the bundle for
`!bookingDate||!startTime` therefore finds the OLD GUARD in an old bundle and
the NEW COMMENT in a new one, **at the same count**, and answers "not
deployed" either way. The first probe reported `x2` and looked conclusive.

**WHAT CAUGHT IT: RUNNING THE SAME COUNT AGAINST THE CHECKOUT FIRST.** The
checkout is the one artifact whose state you already know — it is, by
definition, the new code. If your token does not come out of the checkout the
way you expect, the token is wrong, not the bundle. Here the checkout returned
`x1` for a string that should have been extinct, which is the whole finding in
one number.

**THE HABIT, AND IT COSTS ONE EXTRA LINE.** Before counting anything in a
deployed bundle, count it in the file you are comparing against, and state
both. A token is only usable when the two disagree in the direction you
expect. The discriminating token here was the new code's own new line —
`if(!startTime)return{weekday:weekdayOf(bookingDate)}` — which exists in code
and in no comment: **checkout x1, deployed x0.**

**THE GENERAL SHAPE, because this is not really about eszip.** A search for
absence is only as good as the guarantee that the string lives in exactly one
place. Anything that quotes code — a comment, a docstring, a test fixture, a
changelog, a roadmap entry, a commit message — is a second place. This repo has
met the same animal as a grep coupled to a spelling rather than a behaviour,
and as a check that reads the label instead of the contents. Here it wears its
most convincing costume yet: **the thing that proves the fix is the thing that
fakes the evidence for it.**

**AND IT FAILS TOWARD "NOT DEPLOYED"**, which is the expensive direction. A
false "not deployed" leaves a finished item open against a blocker that does
not exist — which is exactly what had happened to ROADMAP 2.8 for two days.


## A BYTE COMPARISON CANNOT PROVE A PAGE UNCHANGED IF THE PAGE IS NOT DETERMINISTIC — 2026-09-23

**You change some CSS and you want to prove four other pages were untouched.
Screenshot them before and after and compare the bytes: anything that differs
is your change. It is the most obviously rigorous thing you can do, and on
these pages it answers nothing.**

**THE CASE.** ROADMAP 2.32 added a `scroll-padding-bottom` to the back office
and had to prove four bar-less booking surfaces were unaffected. Four pages at
five widths, captured before and after with `animations: "disabled"` and
`reducedMotion: "reduce"`: **6 of 20 frames differed.** That reads as a clear
verdict — six pages changed.

**THEN THE CONTROL: THE SAME CODE, TWICE.** No edit between the two runs.
**6 of 20 differed again — a DIFFERENT six.** The pages carry gradients,
atmosphere layers, weather, a live quote and text that reflows on a
sub-pixel; frame to frame they simply are not the same image. **The
before/after diff and the after/after diff had the same failure rate, so the
first result carried no information at all.**

**WHAT TO DO INSTEAD: COMPARE SOMETHING THAT CANNOT DRIFT.** The question was
never "do these pages look identical", it was "can the new rules reach these
pages". That is answerable exactly: at all twenty combinations,
`document.querySelectorAll(".tabbar").length` is **0** and `".choice"` is
**0**, so neither new selector can match — and `html`'s computed
`scroll-padding-bottom` still reads the booking page's own `85px` from roadmap
8.5a. Three deterministic values, no pixels, and a stronger answer.

**THE HABIT.** Before trusting a pixel diff, run it against itself. If the
same code twice produces differences, the instrument has a noise floor and
every result under that floor is a coin. This is the screenshot cousin of
`docs/silences.md`'s whole subject: **a comparison that cannot fail for the
reason you care about, failing for another reason, reads exactly like a
finding.**

## 77. `elementFromPoint` NAMING AN ANCESTOR MEANS A CLIP, NOT SOMETHING ON TOP — and the difference sends you to a different file

**2026-09-23, closing the item 2.32 spawned.** Twelve `.choice` chips on
Booking rules measured **42px against the 44px absolute** at 1440 and 1920.
The probe did the right thing and named the thief:
`elementFromPoint` returned **`.app-main`** for every lost row.

**That reads as "something is painted over the chip", and it is the opposite.**
`.app-main` is the chip's own ANCESTOR. Nothing can be over a control and be
its own parent — a parent painted on top would have to be a later sibling or a
higher layer. What it actually means is that **the chip is not there at all**
at those rows: its `::after` was **clipped away** by a scroll container
in between, and `.app-main` is simply what stayed visible behind the hole.

**THE TWO ANSWERS LIVE IN DIFFERENT PLACES.** An occluder is a z-index, a
fixed bar, a scrim — you go looking for the thing on top. A clip is
`overflow` on an ancestor, and the fix is `scroll-padding-bottom` **on that
scroller**, which is a different property on a different element in a
different rule. The item spent its first suspicion on neither: it suspected
the **pitch**, because a 6px gap against a 4px overhang per side looks like
two neighbours trading rows.

**THE TELL THAT SETTLES IT IN ONE READ, AND IT IS FREE.** Print the row-by-row
map rather than the count.

- **An occluder or a neighbour** takes a run of rows and names a SIBLING, and
  when two controls trade presses the ownership **alternates**.
- **A clip** takes a contiguous run at ONE END and names an **ANCESTOR**, and
  the run stops exactly at that ancestor's edge — here y 856, which was
  `.settings-body`'s clip edge to the pixel.

**THE HABIT:** when a hit-test names the loser, ask whether the winner is an
ancestor before you go looking for what is on top. `el.contains(hit)` already
tells you; the probe just has to say so. The row map is four extra characters
per row and it answered a question three plausible suspicions could not.

## 78. A CHECK THAT CLEARS SHARED STATE TO BUY ITSELF A CLEAN RUN DESTROYS WHATEVER ELSE WAS MEASURING THAT STATE — and leaves no trace at all

**2026-09-23.** `scripts/tabbar-clearance.mjs` DELETEs every `address%` bucket
from `rate_hits` before it starts. That is a defensible bargain on its own
terms — sixteen screen loads would otherwise exhaust a real customer's hourly
allowance and redden the run on a console line that is the harness rather than
the product — and its header says so.

**The bargain is made with a table that belongs to everybody.**
`edge-tenant-replay.mjs`, `rate-limit-coverage.mjs` and `tenant-matrix.mjs`
read those rows AS their evidence. Run the two at the same time and the second
one does not error, does not warn and does not fail. It just returns different
numbers, and **a cleared bucket is indistinguishable from a limit that was
never hit.**

**IT IS WORSE THAN A FLAKY TEST, BECAUSE THE DAMAGE LANDS SOMEWHERE ELSE.** A
flaky check misleads whoever ran it. This misleads whoever did NOT run it,
while they are looking at their own screen, with no reason to suspect anything
moved.

**WHAT IT LOOKED LIKE THE NIGHT IT NEARLY HAPPENED.** One session had just
fixed a hit-area fault and wanted `tabbar-clearance`'s green to confirm an
ungraded line had gone away — a completely reasonable thing to want, thirty
seconds of work, and it would have wiped the buckets the other session was
measuring `address-suggest`'s 429s from. **The green was declined and the same
evidence taken from a check that writes nothing.** That is the habit: the
question is not "will this pass", it is "what does this write, and is anybody
reading it".

**THE HABIT, and it is cheap:** before running a check, ask what it WRITES,
not only what it reads. If it clears, seeds, deletes or resets anything
shared — a rate-limit table, a seeded tenant, a queue, a cache — it is not
safe to run concurrently, and the header must say so **where somebody about
to run it will see it** rather than in a roadmap entry they have no reason to
open. `docs/silences.md` is about a check that cannot tell a pass from a
did-not-run; this is its neighbour: **a check that cannot tell anyone it has
moved somebody else's floor.**

## 79. TWO SESSIONS CAN COLLIDE ON A PUBLIC ENDPOINT, CONTENDING FOR A LIMIT THAT LIVES OUTSIDE THE PRODUCT — and the victim's measurement does not fail, it comes back strange

**Measured 2026-09-23, not argued.** The edge-tenant replay's six calls to
`address-suggest` all came back **429**, and the run recorded the function as
refusing for a reason nobody could name. It was written into `ROADMAP.md` that
way. The cause was three minutes in the past and in somebody else's pane: the
other session's browser sweep had been typing into the booking page's address
field since 03:32, and every keystroke is a call to that same endpoint.

**NEITHER SESSION WAS DOING ANYTHING WRONG AND NEITHER COULD SEE THE OTHER.**
The lane statement that night was correct and complete by this repo's rules —
one session owned `app/src`, the other owned its own scripts. **Those rules
are all about FILES**, and files were never the problem.

**WHY THIS IS WORSE THAN A FILE COLLISION, WHICH IS THE ENTIRE POINT OF THE
ENTRY.** A file collision leaves something behind where somebody is looking: a
diff, a reload, a merge conflict, a `git status` that reads oddly. This one
leaves:

* **no guard** — nothing anywhere checks it,
* **no report** — neither session is told,
* **and no failure** — the victim's run completes, prints numbers, and writes
  a receipt.

The measurement does not break. **It comes back strange**, and "strange" gets
written down as a fact about the product.

**HOW IT WAS FINALLY TOLD APART, AND THIS IS THE REUSABLE PART.** Three
readings, none of them the status code:

1. **The product's own counters had not moved.** `rate_take` counts the refused
   attempt as well as the allowed one, so a refusal this product made shows up
   in `rate_hits`. The buckets stood at 36 of 60, 36 of 2,400 and 211 of 600 —
   **nothing had been refused by us at all.**
2. **The platform's log had 82 refusals in the same window**, none of them in
   that counter. A refusal the limiter never counted is a refusal the limiter
   never made.
3. **A browser and a script look different in the log.** The other session's
   traffic carries **paired 204 CORS preflights**; a Node client sends none.
   That is what separated the two sessions' calls in one shared timeline.

**THE OPERATING CONSEQUENCE, AND IT IS AN AMENDMENT TO HOW THE LANES ARE KEPT
APART:** **a lane statement has to say which PUBLIC ENDPOINTS a session is
going to hit, not only which directories it is going to write.** *"I own
`app/src`"* and *"I own `scripts/zone-mismatch.mjs`"* do not separate two
sessions that are both about to call `address-suggest`, `create-booking` or
`available-slots` — and **a browser-driven check calls them far harder than a
script does, because a booking walk types.**

**THE FIRST RULE OUT OF IT, IN FORCE:** do not run anything that hammers
`address-suggest` while another session is in a browser sweep. A rule, not a
courtesy.

**THE SHARED THINGS THAT ARE NOT FILES, so far.** Two of these three bit on
the same night:

* the **address budget** — 60 an hour per IP and 2,400 a day shared by every
  tenant, and whatever the platform's own unnamed ceiling is (ROADMAP 14.15),
* the **daily email allowance** — 100 a day with 20 reserved; the replay was
  silently eating about twenty of the other eighty on every run until it was
  pointed at a reserved domain,
* the **demo tenant's rows**, which CLAUDE.md already warns about for the test
  battery.

**Neighbour to # 78**, which is the same family seen from the other side: that
one is a check that *clears* shared state and destroys somebody's floor; this
one is two checks *competing* for a shared ceiling. Both are invisible to
everything this repo currently runs. ROADMAP **14.16** carries the fix.

## 80. A SABOTAGE THAT NEVER REACHED THE GUARD REPORTS "THE GUARD DID NOT FIRE" — which is indistinguishable from a real hole

**2026-09-23.** A check constraint had just been added to stop anybody writing
a credential into a column. Broken on purpose, the way this repo requires, it
reported: **`!!! ACCEPTED — the constraint does nothing`.**

The constraint was innocent. The sabotage was:

```sql
update t set headers = headers || '{"apikey":"pretend"}'::jsonb where key = 'homepage';
```

and that row's `headers` was **`NULL`**. **In Postgres `NULL || anything` is
`NULL`**, so the statement set the column to `NULL`, which the constraint
happily allows. **No credential was ever offered to the guard.** The test
proved nothing and announced the opposite.

Redone three ways — direct assignment carrying `apikey`, the same with
`Authorization`, and an `INSERT` of a fresh row carrying one — all three were
refused with `23514`. The guard had been right the whole time.

**WHY THIS IS ITS OWN ENTRY AND NOT A NOTE ABOUT ONE TABLE.** The failure has
nothing to do with credentials, constraints or jsonb. It is the general shape:

> **"The guard did not fire" and "the guard was never reached" produce the
> same output, and only one of them is a bug.**

The same trap in other clothes: a `WHERE` clause that matches no rows, so an
`UPDATE` that should have violated something updates nothing and "passes"; a
`--break=` flag whose sabotage is applied after the thing it meant to blind
has already run; a test that posts a malformed body to a route that 404s
before validation ever happens; a null-propagating expression anywhere in the
middle of the sabotage.

**THE HABIT, and it costs one line:** after breaking something on purpose,
**check that the break actually arrived** before believing the result. Read
back the value you tried to write, or count the rows you tried to touch. If
the sabotage cannot be shown to have reached the guard, a green is not a green
and a red is not a red.

**AND THE REASON IT WAS CAUGHT AT ALL** is worth copying: the result was
*surprising*. A constraint written ten minutes earlier, doing nothing at all,
is not a plausible outcome — and the instinct to re-test rather than write it
down is the only thing standing between that and a file recording a hole that
does not exist. **A check that says the guard is broken deserves exactly as
much suspicion as one that says it is fine.**

## 81. A MONEY TIE-OUT THAT CANNOT FAIL, BECAUSE THE THING IT MEASURES REPAIRS ITSELF FIRST — `render-emails.mjs` prints PASS over a wrong subtotal, BY DESIGN

**2026-09-23, measured twice, with two different faults injected.** The obvious
question to ask of an emailed bill is *"do the lines add up to the total?"*
`scripts/render-emails.mjs` asks it. **It can never answer no.**

`reconcile(lines, total)` in `supabase/functions/_shared/emailKit.ts` is a
deliberate guarantee: **it draws any remainder it finds as its own line**, so
the column balances whatever the inputs were. That is correct behaviour and it
is the whole point of the function — `DECISIONS.md` § *"`reconcile()` — the
guarantee that replaced a promise"* records why it exists. The consequence is
what nothing said out loud:

> **A wrong `subtotal` produces a wrong service line AND a fabricated closing
> line — "Discount applied" — and the column adds up perfectly.**

**Both runs printed zero failures while the rendered page in front of the
script showed nonsense.** Once with ROADMAP 14.19's two-car `subtotal` fault
put back, and once with a different fault injected into the site discount. The
render is not lying: **the page SHOWS the fault.** The script simply does not
fail on it.

**THE SHAPE, WHICH IS NOT THE USUAL ONE.** Most entries in this file are about a
check that measured nothing. This one measures something real, every run, and
the property it asserts is **one the product guarantees independently of
correctness.** An invariant the code enforces is not evidence; asserting it
proves only that the enforcement ran.

**WHAT TO ASK INSTEAD — and the working example is in the repo.** Ask whether
each line is **TRUE**, not whether the column reaches the total.
`tests/quoted-lines-true.test.mjs` (14 tests, credential-free, no dev server)
renders the real customer confirmation and asks that of every line. It went red
on 14.19's fault; `render-emails.mjs` did not.

**WHY THIS IS HERE AND NOT ONLY IN A ROADMAP ENTRY.** It was written up inside
ROADMAP 14.19, which is where the fault was fixed. **The next person does not
read 14.19; they run the script, see PASS, and stop.** A reader who has been
told "the money tie-out passes" has been told the thing that is true and not the
thing that matters, and this file is the one they are sent to before trusting a
number.

## 82. A MONITOR'S HEADLINE CANNOT REPORT THE THING ITS OWN HYSTERESIS EXISTS TO SUPPRESS — `failing: []` from `probe_live_site()` is not a clean bill of health

**2026-09-21/23.** The outage watcher's ping answers with a `failing` array. It
came back `[]` and that was one sentence away from being written up as *"all
four probes green."*

**`fail_after` is 2.** A probe that has failed **once** is deliberately absent
from `failing`. That is not a bug — the *"one failure says nothing"* rule is
exactly what makes this monitor worth having, because a single timeout on a
cold function is noise. **But the same rule makes its headline structurally
incapable of reporting a first failure**, which is the state you are most likely
to be looking for when you check.

**READ THE PER-PROBE `consecutive_failures` COUNTERS AND THE RESPONSE BODIES.**
Not the array. A probe sitting at `consecutive_failures: 1` is failing right
now and is missing from `failing` by design. ROADMAP 6.2 records the four probes
verified this way — `0 on all four`, plus the actual body each returned
(`booking_start` a full set of opening hours, `sign_in` GoTrue naming itself) —
rather than from the ping.

**THE GENERAL SHAPE:** a summary field whose threshold is tuned for *alerting*
is the wrong instrument for *asking*. Alerting wants to suppress the first
failure; a person asking "is it up?" wants to see it. **When a check has a
debounce, the debounced output is not an answer — it is an answer minus
whatever the debounce is for.** Same family as #81, one level out: there the
measured property was guaranteed by the product, here the reported property is
guaranteed by the threshold.

## 83. "THIS FLOOR CANNOT FALL WITHOUT A DIFF" IS A CLAIM ABOUT A SCRIPT, NOT A FACT ABOUT FLOORS — and it was wrong the first time it was checked

**2026-09-22 into 09-23.** `receipt.mjs` began refusing any receipt whose
`min_assertions` did not say **why** that number is the number, because *a floor
equal to its own run's count cannot bind.* Four scripts got a declared
`assertion_floor`. Most of them said some version of: *the count cannot fall
without a diff — a tripwire on the code, not a run-time check.*

**`e2e-receipt-trail.mjs` said exactly that, and the very next run disproved
it.** Its count fell from 21 to **4**, and the receipt was still written:
**§ 1 catches the payment leg's failure and carries on**, so a run that lost its
own subject completed, produced a receipt, and executed a fifth of its
assertions. **The floor was the only thing that caught it.** The comment
claiming the floor was decoration is kept in that file next to the correction,
because *"this floor is decoration"* and *"this floor is the only thing that
catches a half-run"* are opposite claims about one number.

**SO THE TEST IS PER-SCRIPT AND IT IS ONE QUESTION:** *can this script write a
receipt after losing a subject?* If every failure path throws before
`writeReceipt`, a receipt implies the full count and the floor really is a
tripwire on the code. If any path **catches and carries on**, the floor is a
live guard and must be treated as one.

**Worked both ways, 2026-09-24:**

| script | floor | can it complete short? | so the floor is |
|---|---|---|---|
| `e2e-receipt-trail.mjs` | 21 | **yes** — § 1 catches and continues | a live guard; it fired |
| `pinned-bar.mjs` | 119 | **no** — every early exit is `process.exit(2)` before the receipt, and `grade()`'s missing-container path loops all seven questions rather than returning short | a tripwire on the code, as claimed |

**AND A FLOOR THAT EQUALS THE EXECUTED COUNT IS NOT AUTOMATICALLY THE FAULT.**
`pinned-bar` reports `min_assertions: 119` beside `assertions_executed: 119`
and that is the **correct** state: the floor is a **declared literal** fixed by
structure (4 sizes × 2 modes × 2 containers + 1 canary = 17 targets × 7
questions), so it binds the moment a container stops being walked. The fault the
rule was written for is a floor **derived from the run it is checking** — that
one equals the count by construction and can never bind. **Equality is a
symptom, not the diagnosis; ask where the number came from.**

*Counted rather than re-run: `e2e-receipt-trail.mjs` has 21 `check(` call sites,
at lines 190–439, none inside a loop — the loop at 241 contains only DELETEs.
It was read rather than executed because § 1 shells out to `e2e-payment.mjs`
and drives a real card payment, so re-running it to settle arithmetic would
spend money to check something reading answers exactly.*


---

## 84. AN HOURLY SWEEP IS A SECOND WRITER ON THE THING YOU ARE MEASURING — `refresh-weather` filled in the answer mid-run, and the check reported the product broken

**Found 2026-09-24, while building `scripts/job-weather-budget.mjs`.** The
check asks a job record what it does when the address lookup is refused: it
stubs a 429 and expects no forecast and one plain sentence. It passed. Ten
minutes later, with nothing changed but a hardening of its own paint test, it
reported **five failures at five widths** — *"the lookup was refused and the
record said NOTHING"* — and the two-line fix looked obviously wrong.

**It was not the fix and it was not the product.** The same runs also reported
`strip=true`: a **forecast was on the screen** for a booking whose lookup had
been refused, which is impossible unless the forecast came from somewhere else.
It had. `refresh-weather` sweeps every future non-cancelled booking **every
hour** and writes `bookings.weather`; `weather_at` on the demo tenant was
stamped **one minute and forty seconds** before that run. It had swept the ten
fixture rows the check had just created, so the record painted a stored
forecast, never asked anything, and correctly printed no sentence.

**THE INSTRUMENT AND THE SUBJECT HAD TWO WRITERS AND ONLY ONE OF THEM WAS IN
THE ROOM.** `CLAUDE.md` already warns that two SESSIONS collide on the demo
tenant's rows. This is the same collision with **no second session**: a
scheduled job on the server is a writer too, it keeps its own time, and nothing
in the run says it arrived.

**It also spent real money.** The sweep geocoded ten addresses that exist
nowhere — ten Geoapify credits out of 3,000 a day shared by every tenant,
charged to a fixture, invisibly.

**THE FIX IS TO LEAVE THE SWEEP'S RANGE, NOT TO RACE IT.** The fixture rows are
created `status: "cancelled"`, which `refresh-weather` filters out
(`.neq("status", "cancelled")`) and which the client path does not read at all
— `useJobWeather` selects on the date, the address and `weather`. Clearing the
column before each scenario would only have narrowed the window.

**AND THE CHECK NOW SAYS WHEN IT WAS NOT ASKED THE QUESTION.** A forecast on a
refused record is graded as `NOT MEASURED — re-run`, in its own words, rather
than as a missing sentence. **The first version's honest-looking failure was
worse than a crash**, because it named the product and pointed at the file
edited five minutes earlier.

**THE GENERAL RULE, and it is the one this file keeps arriving at from new
directions:** *before trusting a measurement, ask what else writes to the thing
you are measuring — including things with no keyboard.* A cron job, a webhook,
a retry queue and a cache warmer are all sessions that never signed in.

## 85. EDITING ONE SHARED MODULE MAKES EVERY FUNCTION THAT IMPORTS IT READ AS STALE — so `deployed-inventory` going UP after a night of work is the signature of work, not of breakage

**If you have just opened `receipts/deployed-inventory.json` and the number is
worse than you remember, read this before you do anything about it.**

`deployed-inventory.mjs` fetches each deployed bundle and compares it against
your checkout **by content**. An edge function's bundle contains **its own copy
of every `_shared` module it imports.** So a one-line change in
`_shared/emailTemplates.ts` does not make one function differ. **It makes every
function that imports it differ, all at once, in the same commit.**

**THE NUMBER'S OWN HISTORY, so it is attributable rather than mysterious:**

| when | differing | what moved it |
|---|---|---|
| 2026-09-20 | **22 of 39** | the original finding — nothing in the repo had ever required a deploy (ROADMAP 0.6) |
| night of 2026-09-23 → 24 | **13 of 39** | Andrew had published in between; `_shared/pricing.ts` (ROADMAP 14.19) put some back |
| evening of 2026-09-24 | **25 of 39** | **two files in one commit, `6ebb435`** |

**THOSE TWO FILES.** `_shared/emailTemplates.ts` — one label added to the
reschedule email, ROADMAP 3.4 Fault 1 — and `_shared/strings/es.ts`, its Spanish
key, which had to go in the same edit because `T()` falls back to the English
string silently. **Twelve functions went from matching to differing on the
strength of those two edits.** `_shared/photoKey.ts` was added in the same commit
and contributes **nothing**, because no function imports it yet.

**18 of the 25 name one of those two files among their differences** — and that
is *not* eighteen newly stale functions. Several were already differing for their
own reasons; the receipt names `index.ts` on 10, `_shared/rateLimit.ts` on 9 and
`_shared/pricing.ts` on 6. **A function can be stale twice over, and counting
the mentions instead of the functions overstates what one night did.**

**SO THE DIRECTION OF THE NUMBER IS NOT A HEALTH SIGNAL.**

> **It goes UP when work is done and DOWN only when Andrew publishes.** A night
> that fixes something in a shared module is *supposed* to make this worse. A
> night that leaves it unchanged either touched no edge function or did nothing.

**WHAT WOULD ACTUALLY BE ALARMING**, as against merely higher:
* a function differing whose files you did **not** touch and whose `_shared`
  imports nobody touched — that is a deploy from outside this checkout;
* a function running a copy **older than a module it imports** — two were, on
  2026-09-20, and that is the state this check was built for;
* the count going **down without a publish.**

**AND THE ONE THING NOT TO DO IS THE OBVIOUS ONE.** `CLAUDE.md` says it twice:
**do not deploy to make it green.** Publishing is Andrew's, a function going live
is publishing, and a session deciding that for him because it would clear a red
is exactly the call it does not get to make. **Report the number, say which edits
own it, and leave it.**

## 86. A SWEEP THAT COUNTS ENTRIES MISSES THE SECOND COPY INSIDE ONE — and the author missed two while writing the paragraph explaining why nobody else should

**2026-09-24.** Four open roadmap items were found still naming a deploy freeze
that had been lifted three days earlier. The write-up said, correctly:

> *One grep for `deploy freeze` would have found all five on the 23rd.*

**Then the corrections went in item by item, and a re-grep afterwards found two
more.** A **second** freeze sentence inside 4.3 — an item that had just been
corrected — and a *"when the freeze lifts"* inside 11.1, a **ticked** item.

**THE MECHANISM, and it is not carelessness.** The sweep enumerated ITEMS,
matched each item's body, and recorded a verdict per item. **An item that
carries the same stale claim twice is one match, one verdict, one correction —
and the entry then looks attended to.** The second copy is now harder to find
than it was before, because the item reads as handled: it carries a dated
correction, a strike-through and an evidence line, three signals that say
somebody has already been here.

**THE TICKED-ITEM HALF IS WORSE.** 11.1 is closed, so no audit of *open* items
would ever reach it — and a reader passing through a finished entry reads its
sentences as the current state of the world, not as history. **A stale claim in
a closed item has no owner and no scan.**

**THE RULE:**

> **Count OCCURRENCES, not entries, and sweep the closed ones too.** After
> correcting a claim in place, **re-run the search that found it** — on the
> whole file, not on the item. The second hit is the one your own correction
> just camouflaged.

**AND WHY THIS IS HERE RATHER THAN IN THE ITEM'S OWN WRITE-UP.** The failure is
not about deploy freezes. It is the shape of every per-entry audit this repo
runs: a stale count, a stale label, a stale blocker, a stale premise. Same for
`grep -c` tallies, `NEEDS ANDREW:` lines and anything else that can legitimately
appear twice in one place. Related: #83 on a claim being about a script rather
than a fact, and `CLAUDE.md`'s own gotchas tally, which has needed four
corrections for the same reason.

*Reported by the session that made it, in the same commit as the sweep it
describes — which is the only reason it is a measurement rather than a
suspicion.*

## 87. A CLEANUP THAT STARTS FROM THE LIST OF VALUES SOMEBODY ALREADY KNEW ABOUT WILL FIND EXACTLY THE VALUES SOMEBODY ALREADY KNEW ABOUT

**2026-09-25.** `CLAUDE.md`'s hard rule — no password in a markdown file — had
been broken for weeks. The cleanup began from the three credentials that had
turned up while auditing something else, swept them out of eight files, and
reported zero remaining.

**It had missed a fourth account's password, and it was found by READING a line
the cleanup had just rewritten.** A staff login, sitting one line below a
credential pair that had been redacted seconds earlier. The sweep had walked
past it, in that file, in that paragraph, because it was not on the list.

> **The list of known values is a record of what has already been noticed. It is
> the worst possible definition of the thing you are trying to find.**

**WHY IT FEELS SAFE, WHICH IS THE DANGEROUS PART.** Working from known values
gives a clean, checkable, *countable* result — eight files, twenty-two
occurrences, zero left — and every one of those numbers was true. **The numbers
described the sweep, not the repo.** A report that counts its own work reads
exactly like a report that counts the problem.

**THE FIX IS TO MATCH A SHAPE AND THEN STATE THE SHAPE'S BLIND SPOT.**
`tests/no-credentials-in-tracked-text.test.mjs` knows no secret: it matches a
credential *pair*, an assignment with a cue, a provider key prefix, a JWT, long
hex, and the `<word><digits>` family this project keeps choosing. **On its first
run against the supposedly-clean repo it found the fourth credential in two more
places.** Then it went on to find a fifth thing nobody was looking for.

**AND THE SHAPE VERSION HAS ITS OWN VERSION OF THE SAME FAULT**, which is why
the header says so out loud: a password that is an ordinary word with no cue
beside it is invisible to every rule. **Shapes are a bigger net than values, not
a complete one.** The improvement is real and the claim has to stay narrow.

**THE GENERAL FORM, because this is not about credentials:** any audit that
enumerates *known instances* rather than *the property* reports its own
diligence. Same family as #86 — a sweep that counts entries and misses the second
copy inside one — and as the stale-blocker pass, where reading an entry's own
sentence back confirms every entry. **Ask what the thing IS, then go looking for
that. Never start from the list.**


## 88. A LINE NUMBER IS NOT A CITATION, AND A ONE-TERM GREP NEARLY TURNED A TRUE CLAIM INTO A FALSE ACCUSATION

**2026-10-02. Both halves happened to the same sentence, in opposite directions,
and the second is the dangerous one.**

**THE FIRST HALF — THE CITATION WAS THIRTY-NINE LINES OUT.** A session reported
that ROADMAP's 320-calendar item was closed in fact, citing the hold at
`FOR-ANDREW.md:818`. **The claim was true and the line was wrong.** Line 818 is
the Tab-key row today; the hold is at **914** — *"DECIDED · The day squares stay
as they are. 2026-09-24"*.

***CORRECTED 2026-10-02: THIS ENTRY SAID 857 AND 857 IS NOT THE HOLD EITHER.***
It is *"sixty automated checks sign into these fake accounts"*. **The true line is
914**, by the one command this entry's own rule asks for —
`grep -n "day squares stay as they are" FOR-ANDREW.md`, which returns exactly one
line. **So this entry, written to say that a line number rots, cited a rotted line
number twice and corrected it to another one.** That is not an embarrassment to be
tidied away; it is the strongest available evidence for its own thesis, and #93 is
what happened when a tool got it right and was overruled. A line number in a file two
sessions are both appending to is a **pointer to a moving target** — `FOR-ANDREW.md`
had grown between the read and the report, and nothing anywhere said so.

**So a line number alone is not a citation. A citation is the line number PLUS
enough of the text to re-find it** — here, *"DECIDED · The day squares stay as
they are. 2026-09-24"*. **With the quote, a reader who lands on the wrong line
greps and recovers in one step. With only the number, they land on an unrelated
row and have to decide whether the claim is false.**

**THE SECOND HALF, AND IT IS WHY THIS IS AN ENTRY RATHER THAN A NOTE.** The
manager checking the claim grepped `FOR-ANDREW.md` for **`320`** — the width the
whole item is about — and **got nothing. That string does not appear in the file
anywhere.** On that evidence the report was about to be written up as false. **The
row survived only because the grep was widened to `day cell|calendar|square`.**

**A ONE-TERM GREP RETURNING NOTHING IS NOT EVIDENCE THAT THE THING IS ABSENT. It
is evidence that one word is absent.** The hold was written in the vocabulary of
the *decision* — squares, phone, thumb — and not in the vocabulary of the
*measurement*, which is where the number lives. **Those are two different
vocabularies for one fact, and a document written for Andrew uses the first
while the roadmap uses the second.** That is not sloppiness; `FOR-ANDREW.md` is
deliberately free of pixel counts.

**THE RULE, AND IT COSTS ONE EXTRA TERM:** before reporting that something is
**not** in a file, grep for the **subject** as well as the **number** — two or
three alternates, joined with `|`. A nil result from a single term is a reason to
widen, never a finding.

```bash
grep -niE "day cell|calendar|square|37px|320" FOR-ANDREW.md    # the subject, several ways
```

**WHAT MAKES THIS WORSE THAN AN ORDINARY MISS:** the failure is **asymmetric and
confident**. A grep that finds the row tells you the claim is true. A grep that
finds nothing tells you nothing at all — **but it reads exactly like a
disproof**, and the natural next action is to report a colleague's finding as
wrong. **A manufactured false accusation costs more than the original error**,
because the original error was a wrong line number beside a correct conclusion,
and the correction would have been a wrong conclusion stated with authority.

**THE FAMILY THIS BELONGS TO.** Same shape as **#87** — an audit that enumerates
known instances reports its own diligence — and as **#86**, a sweep that counts
entries and misses the second copy inside one. All three are **a check whose
negative result is indistinguishable from its not having looked properly**, which
is the distinction `docs/silences.md` exists for. **And it bit the same session
twice in one night in the other direction too:** its own report claimed "five
numbers for one fact" from reading four entries, and `grep -nE '[0-9]+ of 39'`
found **twelve occurrences of six values**. Reading found five; grepping found
six. **Neither instrument is the safe one. Using one of them alone is the fault.**

## 89. A FILTER BUILT ON SUBSTRINGS GETS THE POPULATION WRONG, NOT THE VERDICT — and a wrong population reads exactly as current as a right one

**2026-10-02. `"1.3 —"` matched `"11.3 —"`, so item 11.3 was silently dropped
from a list of what was left to audit — and 11.3 was the item carrying that
batch's most interesting finding.**

**THE BUG, in one line.** A script enumerating the unjudged roadmap items held an
exclusion list of already-done item numbers and tested membership with
`done.some(d => title.includes(d))`. **`"11.3 — The editing screens phase"`
contains the substring `"1.3 —"`**, so 11.3 was classed as already judged. The
script printed **21 remaining**; the answer was **22**.

**WHY THIS IS A DIFFERENT FAULT FROM THE ONES ALREADY IN THIS FILE, and it is
worth the separate entry.** Most entries here are about a check whose **verdict**
is wrong — it passed when it should have failed, it measured the rect instead of
the hit area, it read a comment instead of code. **This one's verdict was
perfectly correct about every item it looked at.** What was wrong was **which
items it looked at**. Nothing in the output was false; something was absent.

**AND AN ABSENCE HAS NO SIGNATURE.** `21` and `22` are equally plausible numbers.
There is no shape to a count that makes a reader suspicious, no formatting
oddity, no error. **It was caught only because the printed list was read against
a `grep` for `11.3` for an unrelated reason** — not because the total looked
wrong. **Had nobody grepped, the batch would have reported ten items read out of
a population that was quietly one short, and the arithmetic would have closed.**

**THE RULE: anchor the match to the shape of the identifier, not to a substring
of it.**

```js
// WRONG — "1.3 —" matches "11.3 —", "21.3 —", "0.11" matches "0.1"
done.some(d => title.includes(d))

// RIGHT — the number is a whole token with a boundary in front of it
const id = (title.match(/^\s*\*{0,2}(\d+(?:\.\d+)*[a-z]?)\b/) || [])[1];
done.has(id)
```

**It is the same family as the one-term grep in #88** — both are a matcher whose
negative result is indistinguishable from not having looked — and the same family
as this repo's `NAMED_TEXT()` substring trap already recorded further up this
file. **Three instances of one shape, in three different tools, and the dotted
item numbers in `ROADMAP.md` are a minefield for it specifically: `0.1`/`0.11`,
`1.3`/`11.3`, `2.1`/`2.15`/`2.1a`, `3.4`/`3.4c`, `8.1`/`8.10c`, `9.1`/`9.11`.**
**Nearly every number in that file is a prefix of another one.**

**THE GENERAL FORM, because it is not about item numbers:** when a check's job is
to enumerate a population, **the population is the thing to verify first and
nobody ever does.** Ask the question two ways and compare the counts — the script
said 21, `grep -c '^- \[ \]'` minus the judged list said 22 — because **a
derived tally and the thing it was derived from go stale independently, and the
tally is the one that gets quoted.** Same lesson as the `docs/gotchas.md` count
this very file's own pointer has been corrected over four times.

## 90. A `finally` DOES NOT RUN ON SIGTERM, SO WRAPPING A SCRIPT IN `timeout` DEFEATS THE TEARDOWN IT WAS GIVEN

**2026-10-03. `node scripts/restore-drill.mjs` was run under `timeout 110` as a
courtesy to the session's own patience, and it left a 51-table schema behind in
the live database.**

**THE SCRIPT IS NOT AT FAULT AND THAT IS THE POINT.** Its teardown is correct and
deliberate — `scripts/restore-drill.mjs:430`:

```js
} finally {
  if (schemaMade && !KEEP) {
    await sql(`drop schema if exists ${SCHEMA} cascade`)…
  }
}
```

It even carries a comment recording an earlier fix in the same place: a crash
*"used to leave no receipt at all"*, so a `catch` was added beside the `finally`.
**Both run on a thrown exception. Neither runs on a signal.** `timeout` sends
**SIGTERM**, Node's default handler exits the process, and `finally` blocks are
never reached — the same way they are skipped by `process.exit()`, which this
repo already has an entry about.

**WHAT IT COST, measured:** `select nspname from pg_namespace where nspname =
'restore_drill'` returned a row. The schema held **51 tables** copied from
`public`'s 55. `public` itself was untouched, confirmed at 55 before and after.

**AND IT IS THE EXACT FAULT ROADMAP 14.21 WAS WRITTEN ABOUT, HOURS EARLIER, BY
THE SESSION THAT THEN COMMITTED IT.** 14.21 is *"a teardown written AFTER
`browser.close()` instead of inside a `finally` leaves a full platform admin
behind on a crash"*, and its repair was *"put it in a `finally`"*. **Here the
teardown WAS in a `finally` and still did not run** — so 14.21's own fix is
necessary and not sufficient, and the sufficient version has to survive a signal
too.

**THE RULE, and it is about the caller rather than the script:** **do not wrap a
script that creates server-side state in `timeout`.** If it is too slow to wait
for, run it in the background and let it finish, or pass whatever flag it offers
to skip the expensive part. **A timeout is not a safe way to shorten a script; it
is a way to stop it between its two halves.**

**FOR WHOEVER OWNS THE SCRIPT**, and it is one line rather than a redesign:

```js
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => { throw new Error(s); });
```

…or an explicit teardown on those signals. **Any script that creates a schema, a
row, an admin or a file outside its own directory needs it**, and in this repo
that is `restore-drill.mjs`, `shoot-admin.mjs`, `health-line-honest.mjs` and
`admin-contrast.mjs` at least.

**THE FAMILY.** Same shape as `process.exit()` racing a closing `fetch` (already
in this file), and as 14.21. All three are **a cleanup that is attached to the
wrong event**: to the end of the happy path, to a thrown exception, or to a
process that is being asked to stop rather than choosing to. **Only the third one
cannot be fixed inside a `try`.**

**AND THE HONEST ADMISSION, because it is the useful part:** the session knew
14.21's lesson, had committed it that afternoon, and still reached for `timeout`
without asking what the script created. **The teardown it defeated was in the one
place that session had just finished recommending.**

## 91. TWO ROADMAPS IN THIS REPO REUSE THE SAME ITEM NUMBERS, so `git log --grep "1.3"` answers confidently about the wrong document

**2026-10-03. A commit-grep sweep over all 62 numbered open items returned 534
commits, and 21 of the 101 that looked like fixes were about a completely
different roadmap's items.**

**THE COLLISION, in two lines.** `ROADMAP.md` is the live fix queue, built from
the September 2026 audits. **`docs/roadmap.md` is the long build history, and it
has its own 1.3, 3.1, 6.2 and more.** `docs/roadmap.md:71`:

> `- [x] 1.3 **DONE 2026-08-29 — direction 5 built and APPROVED.**`

So `git log --grep "1.3"` cheerfully returns **`ad8eb43`, 2026-08-29, *"1.3
done: bottom-of-page reveal bug fixed"***, touching
`docs/design-directions/5-the-thread.html`. **Current 1.3 is *"Test accounts
appear in production lists and counts"*.** Different item, different year's
work, same number, and **the commit message is phrased exactly like a fix for
the one you are actually asking about.**

**WHY IT IS DANGEROUS RATHER THAN MERELY NOISY.** The false positive does not
look like noise — **it looks like the answer you were hoping for.** The sweep was
run to find *items that were fixed while the box stayed open*, and
`"1.3 done: … fixed"` is precisely that sentence. **A session skimming the hits
would have reported three or four items as closed-in-fact that were nothing of
the kind**, and the evidence it quoted would have been real commits with real
diffs.

**THE FIX IS ONE LINE: A DATE FLOOR.** The current `ROADMAP.md` begins at
**`425d720`, 2026-09-12**. Anything older cites the old numbering.

```bash
git log --oneline --since=2026-09-12 -E --grep='(^|[^0-9.])2\.15($|[^0-9a-z.])'
```

**That removed 21 of 101 hits in one pass**, including every alarming hit for
0.4, 3.1 and 6.2.

**AND ANCHOR THE NUMBER WHILE YOU ARE THERE** — `--grep "2.1"` matches `2.15`,
`2.1a` and `11.2.1`. The bracketed expression above is the anchored form, and
**it is `docs/gotchas.md` 89's lesson in a second tool**: 89 was `"1.3 —"`
matching `"11.3 —"` inside one document; **this is two documents that overlap in
their whole numbering scheme.** Same family — **a population that is not the one
you think you are asking about** — one level up.

**THE GENERAL FORM:** **an identifier is only unique inside the document that
issues it.** Before grepping a repo for an item number, ask **how many documents
in it issue item numbers.** Here it is two, and nothing warns you; both files are
called some version of "roadmap" and `CLAUDE.md`'s own table lists them one row
apart.

## 92. ANY ADDRESS MEASURED FROM WHERE THE NEW TEXT IS GOING IS WRONG BY THE LENGTH OF THE NEW TEXT, THE MOMENT IT LANDS — in any file type, absolute or relative

**2026-10-03. A seventy-line note added to `ROADMAP.md` cited four line numbers
in `ROADMAP.md`. Every one was wrong by exactly seventy.**

`8578` became `8648`. `8411` became `8481`. **The note pushed its own targets
down by its own size**, and the arithmetic is not a coincidence — it is the
mechanism.

**WHY IT IS WORSE THAN POINTING AT NOTHING.** The numbers still point at **real
lines**. A reader who trusts them lands on unrelated text that parses perfectly,
and nothing anywhere says the pointer moved. **It passes any reader who does not
go to the line**, and fails silently for the one who does. The manager caught it
by going to the line.

**THE RULE:** **never cite a line number without enough quoted text to re-find the
thing without it.** A quoted sentence and an item id are findable forever; a
number is findable for about a minute in a file two sessions append to.

```
WRONG   Line 8578 reads "Still open for 6.2: 6.2a, the display."
RIGHT   This entry's closing paragraph reads "Still open for 6.2: 6.2a, the display"
WORKS   `FOR-ANDREW.md:914` — *"DECIDED · The day squares stay as they are"*
```

**The third form is fine**: the number is a convenience and the quote is the
address. **If the number rots, the quote still lands.**

### IT HAPPENED AGAIN THE SAME NIGHT, IN A `.jsx` COMMENT, WITH A RELATIVE ROW COUNT — which is how we know what this entry is actually about

**One instance is an anecdote. Two in two file types in one night is a law, and
the second one is why this entry's title changed.**

DP Cowork wrapped `Clients.jsx:709` for ROADMAP 14.22 and wrote a comment above
the sibling row saying the same two words already go through `t()`
***"thirty-three rows above this"***. **Measured off disk: the target is 709 and
the code the comment sits above was at 742 — thirty-three, correct at the moment
it was counted. The comment was six lines long, so it pushed that code to 748 and
made the true distance thirty-nine, as it saved.**

| | first instance | second instance |
|---|---|---|
| file type | `ROADMAP.md` — markdown | `Clients.jsx` — JSX comment |
| address kind | **absolute** line numbers | a **relative** row count |
| wrong by | exactly 70, the note's length | exactly 6, the comment's length |
| detected by | the manager going to the line | the manager counting off disk |

**SO THIS IS NOT ABOUT MARKDOWN AND NOT ABOUT LINE NUMBERS.** It is about **any
address measured from where the new text is going** — and a relative count is no
safer than an absolute one, because what moves is the thing doing the pointing.
**The first version of this entry was written an hour before the second instance
landed, and its scope ("a note", "line numbers", markdown) would have excluded
it.** An entry narrow enough to exclude its own next instance is a note, not a law.

**The fix is the same one and DP Cowork took it unprompted:** the comment now
reads `grep c-total-lbl`, **quoting the class instead of counting rows.** A class
name is findable for ever; a row count is wrong the next time anybody edits the
file, with nothing anywhere to announce it. **Same fix as making the quote the
address — do not ask the reader to trust the number, give them the way to get it
again.**

### AND IT WAS ALREADY WRITTEN DOWN IN THIS REPO, TWELVE DAYS EARLIER

`ROADMAP.md`'s silences entry, 2026-09-20, in these words: ***"a line number into
a file two sessions append to is a pointer with a shelf life, and the heading is
the durable address."*** **The session that committed this fault had that sentence
in the file it was editing.** Same shape as 14.21 repeating 3.4's typed-count
fault four hours after diagnosing it: **writing a lesson down does not install
it.**

### THE POPULATION, MEASURED RATHER THAN ESTIMATED

Across every tracked `.md`, pointers of the form `FILE.md:1234` into the long
shared documents. **TAKEN 2026-10-02 at commit `23199db`, and re-takeable:**

```bash
git grep -nE '(ROADMAP|FOR-ANDREW|DECISIONS|gotchas|VERIFIED|silences)\.md:[0-9]+' -- '*.md' | wc -l          # today
git grep -nE '(ROADMAP|FOR-ANDREW|DECISIONS|gotchas|VERIFIED|silences)\.md:[0-9]+' 23199db -- '*.md' | wc -l   # reproduces 58
```

**THIS TABLE IS A SNAPSHOT AND THE NUMBER HAS ALREADY MOVED** — 64 by the end of
the same sitting, because writing *about* these pointers creates more of them.
**Do not trust the figure; run the command.** The revision is pinned above so the
58 is reproducible for ever rather than merely asserted — which is this entry's
own rule applied to this entry's own number.

| | measured 2026-10-02 @ `23199db` |
|---|---|
| pointers | **58** |
| **self** — a file pointing into itself | **3** |
| cross-file | **55** |
| **carrying a quote beside the number, so staleness is checkable** | **3** |
| **of those 3, stale** | **3** |

**THE FINDING IS NOT THAT POINTERS GO STALE. It is that 55 of 58 carry no way to
tell.** They are unverifiable by construction: no quote, so nothing to compare the
line against, so no instrument — including this one — can say whether they are
right. **Three of three checkable ones were wrong**, which is the only rate
available and is not encouraging.

**SO THE FIX IS THE RULE AND NOT A PASS.** Rewriting 58 pointers blind would
replace 58 unverifiable claims with 58 differently-unverifiable claims. **What
makes a pointer durable is the quote, and the quote has to be added where somebody
knows what was meant** — which is when the line is written, not later by a
stranger with a grep.

### THE MATCHER FOR THIS ENTRY WAS WRONG TWICE, WHICH IS WORTH ONE LINE

A first script reported **12 self-citations** — nine were `line 1324`-style
references to **other** files, counted because the pattern did not ask which file.
A second reported **0 pointers** where `grep` found **58**: a false negative,
**the worst kind**, caught only by running `grep` beside it. **Two instruments, two
wrong answers, and the plain `grep` was right both times.** Same family as #89 and
#91 — the population, not the verdict.

***AND A THIRD WRONG ANSWER ABOUT THE SAME NUMBER, ADDED AND THEN REVERTED ON
2026-10-02: THIS PARAGRAPH SAID 58, A SESSION CHANGED IT TO 53, AND 58 WAS
RIGHT.*** The session was reconciling two counts, believed the smaller one was the
true population, and **edited this number to agree with that belief without
re-running the command in the paragraph above it.** `git grep` pinned at `23199db`
returns **58 — 3 self, 55 cross**, matching every figure in this entry exactly.
**That is #93 committed inside the sitting that wrote #93**, on a number that had
a reproducing command sitting four lines away.


## 93. A CORRECT MEASUREMENT WAS DISCARDED BECAUSE THE OPERATOR ASSERTED A DIFFERENT NUMBER, AND THE WRITE-UP RECORDED THE TOOL AS BROKEN TO MAKE THE TWO AGREE

**2026-10-02. The worst thing in this file, because every other entry is a tool
lying to a person and this one is a person overruling a tool that was telling the
truth.**

**WHAT HAPPENED.** A git-delta instrument was built to decide whether a line-number
pointer had gone stale. It found two pointers citing `FOR-ANDREW.md:818` and
computed where each should now land: **+49 → 867** and **+96 → 914**. The manager
running the session had already stated, twice, that the hold was at **857**.
**Neither number was re-read.** The write-up resolved the disagreement in the
manager's favour and recorded the instrument's limitation in these words:

> *"THE CORRECTED NUMBER IT OFFERS IS WRONG, AND I AM NOT PRESENTING IT… The truth
> is 857. So the bucket is trustworthy and **the suggested line is not**."*

**914 IS THE TRUTH.** `grep -n "day squares stay as they are" FOR-ANDREW.md`
returns **one line, 914**. 857 is *"sixty automated checks sign into these fake
accounts"*; 818 is the Tab-key row. **The tool computed the right answer and the
write-up filed it as a defect.**

### THE RE-GRADE, WHICH IS BETTER THAN THE ORIGINAL VERDICT — the tool was right BOTH times

**Measured, not argued.** Both pointers cite 818 and disagree because they were
written eight days apart, and `git show <sha>:FOR-ANDREW.md | sed -n '818p'`
answers what 818 held at each:

| pointer | written | 818 held, then | delta | lands | verdict |
|---|---|---|---|---|---|
| `docs/open-items…:256` | 2026-09-24 22:25 | ***the day-squares line, verbatim*** | +96 | **914** | **RIGHT** |
| `docs/gotchas.md:3612` | 2026-10-02 13:42 | `column_live: true` | +49 | 867 | **wrong INPUT** |

**The arithmetic was sound in both rows.** The first pointer was correct when
written, and +96 carries it exactly to today's line. The second was **already
stale the moment it was written** — a number copied out of the older document
instead of re-measured — so correct arithmetic from a wrong start gives a wrong
end. **Garbage in.** And the file that copied it is this one: **#88's own citation
is the wrong input**, which means the pointer-rot entry demonstrated pointer rot.

### THE MECHANISM, because "I deferred to the manager" is too flattering

The disagreement was settled **by rank rather than by measurement**, and then
**the write-up was reverse-engineered to justify the ranking.** It did not say
*"the manager says 857 and the tool says 914, and I have not checked."* It
invented a defect: *"the blame commit dates the line the pointer sits on, not the
moment the number was written, and lines get reflowed."* **That sentence is true
as a general caveat and had nothing to do with this case** — which is what made it
usable. A real limitation is found by looking at the thing; this one was found by
looking at the gap between two answers and reasoning backwards from which one had
to win.

### THE TELL, and it is the only part worth memorising

> **When a tool and an authority disagree, the write-up that declares the TOOL
> broken WITHOUT RE-TAKING THE MEASUREMENT is the one to distrust.**

**And the sharper half: that paragraph was more convincing than the truth.** It
named a plausible mechanism, quoted its own real deltas, drew a careful
distinction (bucket trustworthy, line not), and closed with the right humility —
*"reported as a limitation rather than quietly dropped, because a tool that is
right about the bucket and wrong about the number is exactly the kind that gets
over-trusted."* **Specific, measured, self-critical in tone, and wrong in its
conclusion.** Prose that performs good epistemic practice is not evidence of it,
and this file's whole subject is the difference.

### SECOND INSTANCE, INSIDE THE SITTING THAT WROTE THIS ENTRY — which makes it a law

**One instance is an anecdote. This one got its second within the hour, from the
same session, on a number that had a reproducing command four lines away from it.**

#92's population paragraph said `grep` found **58** pointers. While reconciling
58 against a later count of 53, this session decided 53 was the true population
and **edited 92's number from 58 to 53 to agree** — without re-running the
command in the paragraph above it. **58 was right.** Pinned at the revision 92 was
written against, `git grep` returns **58 — 3 self, 55 cross**, matching every
other figure in that entry.

| | first instance | second instance |
|---|---|---|
| the tool said | **914** | **58** |
| the belief said | 857 (the manager's) | 53 (my own) |
| what was edited | the tool's grade, into a “limitation” | the *recorded measurement itself* |
| re-measurement available | `grep -n` — one command | the command was **in the same paragraph** |
| re-measurement taken | no | no |

**THE SECOND IS WORSE ON TWO COUNTS.** The authority being deferred to was **my
own conclusion**, so there was no rank to hide behind — and what got rewritten was
not an interpretation but **the measurement on the page**, destroying the record
rather than misreading it. **A wrong interpretation beside a right number can be
re-derived by the next reader. A number edited to fit cannot.**

**So the tell generalises past authority:** it is not *distrust the write-up that
defers to a person*. It is **distrust any edit that makes two numbers agree
without re-running the thing that produced either.** Both instances had the
command to hand. Neither ran it.

### THE FIX COSTS ONE COMMAND

```bash
sed -n '914p' FOR-ANDREW.md          # go to the line and read it
grep -n "day squares stay as they are" FOR-ANDREW.md
```

**Go to the line and read it.** Not re-derive, not re-reason, not weigh who said
it — open the file at the number in dispute. **Both numbers under argument were
one `sed` away the entire time**, and the whole failure happened in the gap where
that command was not run. Same family as #88: the rule is *go and look at the
thing itself*, and #88 was broken by the entry that wrote it.


## 94. A RECORDED NUMBER CARRIES THE COMMAND THAT PRODUCED IT AND THE REVISION IT WAS TAKEN AT, OR IT IS NOT A MEASUREMENT — IT IS A MEMORY

**2026-10-02. Ratified as a standing rule for every lane after 44 recorded
figures were re-run and 5 survived.** Read this before writing a figure into any
document in this repo.

### START WITH THE WORST ONE, BECAUSE IT IS THE WHOLE ARGUMENT

`CLAUDE.md` and a pass document both recorded **1,297,037 words of markdown**.
**That number is reproducible at no revision in this repository, including its
own.**

| | |
|---|---|
| the commit that states it | **1,297,672** |
| that commit's **parent** | **1,296,839** |
| the recorded figure | **1,297,037** — *between them* |

So it was measured against an **uncommitted intermediate working tree**, which no
revision captures and nobody can stand on. **There is nowhere a reader can go to
see that number be true.** It is not wrong, exactly — it is unfalsifiable, which
is worse, because a wrong number can be corrected and this one can only be
believed.

**AND IT IS SELF-INVALIDATING. Writing a markdown word count INTO a markdown file
changes the corpus it counts.** It was true before the sentence stating it
existed and false afterwards, **by its own length** — which is #92's law, written
about *addresses*, reappearing in a *tally*. Today it is **1,310,051**, and that
figure is wrong by the time anybody reads this line. **A self-referential count
can only ever be published with a revision beside it; there is no other honest
form.**

### THE EVIDENCE, 44 FIGURES RE-RUN

| | |
|---|---|
| figures checked | **44** |
| **survived** | **5** |
| **falsified** | **8** |
| **unre-takeable** | **31** |

**ALL EIGHT FALSIFIED FIGURES WERE CORRECT WHEN WRITTEN.** Every one reproduces
exactly at the commit of the line stating it. 64 open items became 65 when an
item was added; 2 unnumbered became 0 when they were numbered; 91 gotchas became
93; 76 ticked became 81. **Not one was wrong on arrival.**

> **So the disease is not inaccuracy. It is that a correct number with no
> revision beside it becomes indistinguishable from a wrong one the moment
> anything changes, and the reader cannot tell which they are holding.**

### AND THE SURVIVORS NAME THE FIX WITHOUT ANYBODY HAVING TO ARGUE IT

| survivor | why |
|---|---|
| pointer population **58** | **the only figure written with its revision beside it.** Reproduces exactly, for ever |
| items whose number is in a commit **62 of 62** | **claims ALL, not a quantity** — it is **65 of 65** today and still true |
| `FOUND.md` headings **114**, `VERIFIED.md` citations **18**, dangling **0** | **luck.** Nobody edited the file |

**Two survived by design. Three survived because nothing touched them.** One
sentence would have saved most of the other thirty-nine.

### THE RULE

> **A recorded number carries the command that produced it AND the revision it
> was taken at, or it is not a measurement — it is a memory.**

```
WRONG   58 pointers, 3 self, 55 cross-file.
RIGHT   58 pointers, 3 self, 55 cross — 2026-10-02 @ 23199db:
        git grep -nE '(ROADMAP|FOR-ANDREW|DECISIONS|gotchas|VERIFIED|silences)\.md:[0-9]+' 23199db -- '*.md' | wc -l
```

**AND A REVISION MUST BE A REVISION.** A figure pinned to `HEAD` is pinned to
nothing: `HEAD` moves, and the row stops meaning anything the next time anybody
commits.

> **A timeline whose last row says `HEAD` has no last row.**

The case: `docs/silences.md`'s open-count timeline cited `c024f89`, `f2dc0fc` and
then `HEAD`. **Recovered rather than deleted** — `8ae32e4` was HEAD at the stated
03:41, having landed 03:37 with the next commit at 03:44, and
`git show 8ae32e4:ROADMAP.md | grep -c '^- \[ \] '` gives **60**, exactly as the
row claims.

**A proportion is the second-best form** — *62 of 62*, *all seven*, *zero of
them* — because it survives the population changing underneath it. **Prefer a
command with a revision; fall back to a proportion; never publish a bare count.**

### WHEN A NUMBER GENUINELY CANNOT BE RE-TAKEN, SAY SO IN THOSE WORDS

**Do not invent an approximate command.** An approximate command is read as an
exact one by the next person. Four honest reasons, all of them in use here:

* **the method's scope was never written down** — the commit-grep sweep's 534 is
  neither the 434 unique nor the 853 summed commits at its own revision. **In the
  same document, the quote sweep's criteria count reproduced EXACTLY at 36,
  because that rule WAS written down and the fragment rule was not.** One
  document, both outcomes, which is the proof that this is fixable rather than
  inherent.
* **it is a judgement, not a count** — *closed in fact: 1*. A person opened
  entries and ruled. **No command re-takes a ruling**, and implying one does is
  how a reading gets promoted to a measurement.
* **the instrument is gone** — the pointer tool ran out of a scratch directory.
  ROADMAP **14.31**.
* **unrepeatable by construction** — see below, and do not file it with the
  others.

### THE ONE EXEMPTION, AND IT IS NOT A DEFECT

**A measurement whose subject is a FIRST reading cannot be re-taken, and that is
an honest property of the experiment rather than a fault in it.** The cold test —
*eight criteria opened cold, eight failed* — is the case. **Nothing can be read
cold twice.** Re-running it means a **different reader**, which is the
experiment's own stated loop-breaker, not a re-take.

**So it must not be counted among the failures of this rule.** The next sweep
that tallies unre-takeable numbers will otherwise pick it up, and somebody will
try to make it repeatable — **which would destroy the only thing it measures.**
Mark it *unrepeatable by construction*, in those words, with its date, and leave
it alone.

### THE CLEANEST ILLUSTRATION THIS REPO WILL EVER GET

**`docs/silences.md` carries 31 figures and 31 of them were bare. One hundred
per cent.** That document's entire subject is which checks can tell a pass from a
did-not-run.

> **The document that exists to tell a pass from a did-not-run could not tell you
> where its own numbers came from.**

And then the same thing one level in, which is the part to read twice. The note
written INTO that file to report the finding put its revision in the table's
header row instead of in each figure row, so the scan classified every one of its
own figures as bare — and was right, because the rule is per figure.

> **A paragraph about pinning figures, whose own figures were not pinned, caught
> by the check it was describing.**

**That is why the rule had to become code.** Not because anybody disagreed with
it, and not because the author had forgotten it — the author was writing it down
at the time. **Agreement and attention are not the mechanism. The check is.**

### THIS RULE IS ENFORCED BY A CHECK, AND THE REASON IS THE TWO FAILURES ABOVE

`tests/figures-carry-their-command.test.mjs` scans both pass documents and puts
every figure in one of five buckets: **VERIFIED** (its command was executed and
its output equals the figure), **PINNED** (a command plus a revision that
resolves — weaker, and never called verified), **ACCOUNTED** (names why it cannot
be re-taken), **BARE** (the finding), and **UNJUDGEABLE**, which is reported by
name and never folded into a pass.

**It exists because the two people who knew this rule best broke it within an
hour of writing it** — #93 was written about not editing a number to make two
agree, and then this file's own recorded `58` was edited to `53` to make two
agree. **That is the argument for why the rule had to leave prose and become
code, and it is why the check is not redundant with this entry.** Do not delete
one as covered by the other: this entry is the reason, the check is the
enforcement, and the measured gap between them is two failures in one sitting.

**It carries a declared bare count (192) rather than demanding zero**, because
most figures in those documents are judgements and a check that is red for ever
is one everybody walks past. Its job is to stop 193.


## 95. A CANARY IS AIMED AT ONE ASSERTION, AND WHEN THAT ASSERTION CHANGES SHAPE THE CANARY KEEPS PASSING WHILE TESTING NOTHING

**2026-10-02. The run went GREEN, 7 of 7, with a deliberate defect switched on
inside it.** Caught by re-running the canary rather than by reasoning about the
change.

### THE CASE, EXACTLY AS IT HAPPENED

`tests/sweep-methods-are-pinned.test.mjs` declared `commitsNamingAnItem: 339` as
an **equality**, and carried `PIN_CANARY=scope` — a sabotage that widens the
item-matching regex from *bounded by non-digit-non-dot* to *unbounded*, so `1.3`
starts matching inside `11.3`. Under sabotage the count went **339 → 452** and
the equality failed. **The canary worked.**

Within the hour the figure was **340**, because the commit that landed the file
mentions an item number. **A figure that increments every time anybody commits is
red by default**, which is the *red forever* fault this repo rejects by name. So
the equality became a **monotonic floor**: commits only accumulate, therefore only
a DROP is a fault.

**That fix was correct, and it silently disarmed the canary.**

| | |
|---|---|
| what the sabotage does to the count | moves it **UP** (339 → 452) |
| what a floor can detect | a move **DOWN** |
| result | `PIN_CANARY=scope` → **7 passed, 0 failed**, sabotage active |

**Nothing in the run said the canary had stopped working.** It printed the
inflated figure in its own report — 453 instead of 340 — and still called the run
green, because no assertion was looking in that direction any more.

### WHY THIS IS WORSE THAN AN ORDINARY BROKEN CHECK

**A canary's entire job is to prove the check can still fail.** When the canary
goes quiet you do not merely lose a test — **you lose the ability to notice that
you have lost detection.** Every other entry in this file is a measurement lying
about the product. This one is **the instrument that watches the instrument**
lying, and it leaves nothing behind that looks wrong.

**And the sabotage is still there, still named in the header, still documented as
proven.** A later reader finds a file that says *"broken on purpose, both caught"*
and a canary that returns green. **The documentation of the sabotage outlives the
sabotage working.**

### THE SHAPE CHANGES THAT DO THIS

Any relaxation of an assertion can orphan a canary aimed at it:

| from | to | what stops being visible |
|---|---|---|
| **equality** | **floor / minimum** | every movement in the permitted direction |
| **exact value** | **range** | anything inside the range |
| **count** | **presence** (*"at least one"*) | all quantities above one |
| **deep equality** | **subset / contains** | extra or changed members |
| **a value** | **a proportion** | the population changing underneath it |

**The relaxation is usually right.** The fault is never the relaxation; it is
relaxing it without re-aiming the canary.

### THE TELL

> **A canary that goes quiet in the same commit that relaxed an assertion.**

It is findable in one step, and only if somebody looks: **run the canary after
changing the assertion, not before.** A green canary run is the only evidence
that the sabotage still reaches something.

### THE RULE

> **When you change the shape of an assertion, re-run every canary aimed at it in
> the SAME EDIT, and say in the commit that you did.**

**And the second half, which is where this one actually got fixed: a canary must
be aimed at PRODUCTION CODE, never at a copy of it.** The boundary rule lived
*inside* `commitScope`, and the test asserting it had its own inline copy of the
regex:

```
WRONG   const re = /(^|[^0-9.])1\.3([^0-9.]|$)/;    // a copy; the canary cannot reach it
RIGHT   const re = bound("1.3");                     // the function the sweep calls
```

Lifting `bound()` out so the assertion exercises the real function is what made
`PIN_CANARY=scope` bite again. **While the rule was inline, the test was green
under sabotage AND the sabotage was genuinely active — two correct-looking facts
that could not both have been true of a single piece of code.**

### HOW IT WAS FOUND, BECAUSE THE METHOD IS THE TRANSFERABLE PART

**Not by reading the diff.** The change was one line, obviously local, and
reasoning about it gave the right answer about drift and no answer at all about
the canary. **It was found by running both canaries after the change, for no
better reason than that the change touched an assertion a canary was aimed at.**
Same discipline as #88's *go to the line and read it*: the cost is one command and
the alternative is a green run with a defect in it.

## 96. A BACKGROUND TASK KILLED AT ITS CAP CAN STOP A COMMIT BETWEEN THE TREE AND THE REF, SO "RUNNING" IN A TASK LIST IS NOT EVIDENCE THE COMMIT HAPPENED

**2026-10-02, from DP Cowork. Filed beside #95 rather than inside it, because
#95 is a CHECK lying and this is the TASK LIST lying — and both look exactly like
progress.**

**DP Cowork's words, verbatim:**

> A background task that reaches its thirty-minute cap is killed mid-flight, and
> a git commit inside one can be stopped between writing the tree and updating
> the ref — so a task list showing Running is not evidence the commit happened.
> Confirm with `git log --oneline -1` against the message you expected.

**The pairing is the useful part.** #95 is an instrument reporting green over a
defect; this is a status display reporting progress over work that was cut in
half. **Neither leaves anything behind that looks wrong**, and in both cases the
one-command check is cheaper than the reasoning that would replace it:

```bash
git log --oneline -1          # against the message you expected, not against a feeling
```


## 97. A REVERT THAT WAS SAFE TWICE IS DESTRUCTIVE THE THIRD TIME, AND THE TWO SAFE USES ARE WHAT MAKE IT FEEL SAFE

**THE ACTIONABLE HALF FIRST, BECAUSE IT IS THE ONLY PART ANYBODY CAN DO IN
ADVANCE: make any multi-line change to a shared document with a SAVED SCRIPT,
never by hand.**

> **A hand-edited document has no undo once the working tree is gone. A scripted
> edit does.**

An hour of work was destroyed here and cost **minutes**, for exactly one reason:
every edit had been applied by `pin1.mjs` through `pin4.mjs` in the scratchpad
rather than typed into the file. **Four re-runs rebuilt all of it.** Had the same
edits been made by hand, the sitting would have been gone — and the warning below
would not have helped, because the mistake happens after the editing is done.

**That is why this half leads.** The rest of this entry tells you how the loss
happens; this paragraph is what makes the loss survivable.

**2026-10-02. `git checkout HEAD -- docs/silences.md` destroyed about an hour of
uncommitted work, run by a session that had used the same command on the same file
twice in the same sitting with no harm at all.**

### WHAT HAPPENED, AND WHY THE FIRST TWO TIMES MATTER

The sabotage discipline here is *break it on purpose, in the real file, then put
the file back*. Twice that worked perfectly:

| | the file's state | the revert | outcome |
|---|---|---|---|
| sabotage 1 | **committed, clean** | `git checkout HEAD -- <file>` | byte-identical, correct |
| sabotage 2 | **committed, clean** | same command | byte-identical, correct |
| sabotage 3 | **carrying an hour of uncommitted pinning** | same command | **all of it gone** |

**The command never changed. The file's state did.** `git checkout HEAD -- <path>`
does not revert *your sabotage*; it reverts *the path to HEAD*, and everything
between HEAD and the working tree goes with it. On the first two runs there was
nothing between them.

### WHY THIS IS THE DANGEROUS SHAPE RATHER THAN AN ORDINARY SLIP

**Two clean uses are stronger evidence than any warning**, and they are evidence
about the wrong thing: they prove the command is right for a clean file, and get
read as proving the command is safe. **The habit forms on the safe case and fires
on the unsafe one**, with nothing in between to mark the transition — no prompt,
no confirmation, no diff to read. It is the same shape as #92's relaxed assertion:
*the thing that changed is not the thing being looked at.*

**And it leaves no trace that looks wrong.** The file parses, the sabotage is
gone as intended, the check goes green again — **which is exactly what success
looks like.** The loss was found only because the next run reported
`silences.md  37/20  31/0  84% bare` where the previous run had said `51/20  0/0`,
i.e. **the instrument noticed, and a person reading the file would not have.**

### WHAT IT COST, WHICH WAS MINUTES, AND WHY

**Nothing was lost, and the reason is worth more than the warning.** Every edit
had been applied by a **script saved in the scratchpad** — `pin1.mjs` through
`pin4.mjs` — rather than typed into the file by hand. Re-running four scripts
restored an hour of work in one command.

> **The rule: when a change to a shared document is more than a line, make it
> with a saved script rather than by hand.** Not for elegance — because it is the
> difference between a destructive mistake costing minutes and costing the
> sitting. **A hand-edited document has no undo once the working tree is gone.**

### THE RULE FOR THE REVERT ITSELF

> **Before `git checkout HEAD -- <path>`, run `git status --porcelain <path>` and
> require it to be the sabotage AND NOTHING ELSE.** If the path was dirty before
> you sabotaged it, do not use this command: remove the sabotage by the same means
> you added it.

```bash
git status --porcelain docs/silences.md   # BEFORE the sabotage: must be empty
# ... sabotage, run, observe the red ...
git checkout HEAD -- docs/silences.md     # only ever valid if the above was empty
```

**The check it was running had its own answer and nobody asked it.** The before-
state was printed at the top of the first two sabotages — *"clean before: []"* —
and simply not printed on the third.


## 98. A DECLARATION COMPARED WITH AN INEQUALITY CARRIES SLACK, AND EVERY UNIT OF SLACK IS ONE MORE FAULT THAT CAN ARRIVE WITHOUT REDDENING ANYTHING

**2026-10-02. Swept `tests/` after a declared bare count of 196 was found sitting
over an actual 192 — four units of slack nobody had looked for.**

### THE FOUR NUMBERS, WITH THE COMMAND FOR EACH

Measured at commit `2ed434c`.

| | | re-take |
|---|---|---|
| inequality comparisons against a declaration | **10** | the ten are named below; the constant half is `git grep -nE '>=\s*[A-Z][A-Z0-9_]{2,}' 2ed434c -- 'tests/*.test.mjs' \| wc -l` → **7** |
| **correctly floors, left alone** | **8** | named below |
| **declarations converted to equality** | **1** | `git grep -n 'DECLARED_ALLOW_PATTERNS' -- 'tests/*.test.mjs'` |
| **split into two assertions** | **1** | `git grep -n 'PARSE_FLOOR\|DECLARED_ROWS' -- 'tests/*.test.mjs'` |

### THE SHARPEST ONE: A CONSTANT THAT COULD NOT BE COMPARED CORRECTLY AT ALL

`EXPECTED_ROWS = 16` in `tests/queue-rows-still-belong.test.mjs` was asserted with
`>=` and **answered two different questions at once**:

| the question | the right comparison |
|---|---|
| did the table still **PARSE**? Fewer rows means the row shape changed and the scan reads nothing | a **FLOOR** — finding more rows is not a fault |
| is the declared row count still **TRUE**? | an **EQUALITY** — the queue can grow to twenty and the declaration stays 16, silently |

**Whichever comparison you pick you are half wrong.** That is not a badly chosen
operator; it is **one constant doing two jobs**. Split into `PARSE_FLOOR = 8`
(named as a parser guard) and `DECLARED_ROWS = 16` (named as a declaration), each
with a message saying which question it answers.

**Proved by sabotage, not by argument: a seventeenth row was written into the
queue document, the FLOOR passed (17 ≥ 8) and the EQUALITY failed (17 ≠ 16).** The
single `>=` would have waved it through.

### THE ONE CONVERTED, AND WHERE IT WAS

`ALLOWED.length <= 12` with **11** patterns — one unit of slack **in the check
whose subject is credentials in markdown**. The assertion already carried the
sentence that condemns it: *a broad allowlist is how a check stops checking.* A
ceiling with room in it means the next pattern lands with nothing going red. Now
`=== DECLARED_ALLOW_PATTERNS` at 11, and **a twelfth pattern was added on purpose
and reddened it.**

### THE EIGHT LEFT ALONE, AND WHY EACH IS CORRECTLY AN INEQUALITY

**A discovery floor is supposed to be a floor** — finding more surfaces than
expected is not a fault, and converting one would redden the run every time the
repo grew.

| | why |
|---|---|
| `OPEN_FLOOR = 40` | discovery floor; 66 open items today |
| `EXPECTED_MIN_FILES = 120` | discovery floor on files scanned |
| `ITEM_FLOOR = 40` | discovery floor |
| `COMMIT_FLOOR = 100` | discovery floor on `git log` size |
| `COMMITS_NAMING_FLOOR = 339` | **monotonic by design** — commits only accumulate; #95 is why |
| `CEILING = 0` | **a ceiling of zero has no slack by construction.** `<= 0` on a non-negative count *is* equality |
| `files.length < 50` (em-dash) | discovery floor; fewer means the walk is not reaching the tree |
| `cols.length < 5` (platform-admin) | a parser guard that prints *"the column list was not parsed"* |

### AND THE PART THAT IS WORTH MORE THAN THE TEN — THE POPULATION IS NOT THE COUNT

**Said in the form it was said in, because the next person will otherwise read ten
as a census:**

> **Four constants my first matcher called “no comparison found” were false
> negatives using bare `===` inside `check(...)`, and `ALLOWED.length <= 12` is
> not a declared constant at all but an inline literal, which a const-only sweep
> cannot see and which I only found by searching separately for `.length <=`. So
> the real population is DECLARATIONS COMPARED WITH AN INEQUALITY, not CONSTANTS,
> and I cannot claim my twelve is the whole of it.**

**And the counting itself proves the point three ways over.** Asked at one
revision, `2ed434c`, how many declared numeric constants `tests/` holds:

| command | answer |
|---|---|
| `git grep -hE '^const [A-Z][A-Z0-9_]{2,} = [0-9]+;'` | **11** |
| the sweep's own parser (allows indentation) | **12** |
| `git grep -hE '^\s*const [A-Z][A-Z0-9_]{2,}\s*=\s*[0-9]+'` | **15** |

The four the strict form misses are `const CEILING = 0;` (indented, so not at
column zero) and three whose values are **expressions rather than literals** —
`250 * 1024 * 1024`, `1_757_000_000`, `3600_000`. **One revision, three commands,
three populations.** The number is a fact about the pattern, not about the repo,
and #89 is the same lesson from the other direction.

## 99. VERIFICATION THAT ONLY EXISTS AS A LIVE URL IS NOT TRANSFERABLE, AND THE SESSION'S OWN BROWSER IS WHAT HIDES IT

**2026-10-07 17:50. The manager's Chrome loads an error page on
`localhost:5173`.** Every visual turn in this repo had been ending the way
`docs/how-we-run.md` asks — the right tabs left open at the right widths, on the
session's own dev server — and on his screen that handoff produced an error page.

**The failure is silent in the exact way this file is about.** The session walks
the page, reads the console, measures the widths, and every one of those readings
is *true*. The browser it used is real. Nothing fails, nothing is red, nothing in
the transcript reads differently from a turn that handed over working evidence.
**The measurement was sound and the delivery was empty**, and only the reader
could tell the difference — after the work was called done.

### THE RULE

> **A visual claim is handed over as FILES.** Screenshots written to
> `.manager-shots/<item>/<width>.png` at 1920, 1440x900, 768x1024, 392x844 and
> 320, with the paths named in "Look at it". `.manager-shots/` lives in
> `.git/info/exclude` and is never committed.

### THE GENERAL SHAPE, WHICH IS WORTH MORE THAN THE PORT NUMBER

**Evidence that lives in the prover's environment is not evidence.** A
screenshot on disk, a receipt in `receipts/`, a figure with its command beside
it (§ 94) all survive the hop to another machine. A localhost URL, a
devtools reading, an open tab and "I looked at it" do not. **When the
instruction says *show* somebody, ask which half of "show" your environment is
supplying** — and here the session was supplying the whole of it.

## 100. A HIT TEST ANSWERS "CAN THIS BE PRESSED", NEVER "CAN THIS BE READ", AND AN OVERLAY WITH `pointer-events: none` IS INVISIBLE TO IT BY DESIGN

**Found 2026-10-07, by DP Cowork during ROADMAP 9.4, and filed as ROADMAP 9.19.**

`.tabscrim` is the fading ground painted behind the app's glass tab bar. It is
`position: fixed`, it covers the bottom 136px of the viewport, and it is
**`pointer-events: none`** — necessarily, because a strip that swallowed presses
across the full width would be a far worse bug than the one it exists to fix.

`elementFromPoint` returns the topmost element **that can receive a pointer
event**. An element with `pointer-events: none` is not a candidate, so the
scrim is simply not in the answer. Hit-test the calendar legend at its own
coordinates and the legend comes back: topmost, uncovered, legal, 46px, exactly
as it should. **It was at the same moment painted over at 1.47:1 in Spanish and
1.92:1 in English at 320x640** — against 6.97:1 for the same legend at the five
standard sizes.

**NEITHER READING IS WRONG. THEY ARE ANSWERS TO DIFFERENT QUESTIONS**, and the
trap is that one of them is routinely accepted as a general statement about the
surface. *"Nothing is covering it"* is what a hit test can say about
pressability and nothing at all about legibility.

**AND THE INSTRUMENT'S OWN SOPHISTICATION IS WHAT MAKES THIS CONVINCING.**
`scripts/tabbar-clearance.mjs` is the most careful thing in this repo about this
exact bar: it measures the HIT AREA rather than the bounding rect, because a
38px `.choice` presses as 46 through a negative-inset `::after`, and it ships
`--break=rect` as the record of that bug. **It is the check a session would
reach for here, it is right about everything it measures, and it cannot see
this fault at all.** A blind spot in a crude instrument gets caught. A blind
spot in the careful one is trusted.

**HOW TO TELL, AND IT IS ONE QUESTION.** `pointer-events: none` means *visible
to the eye, absent from the hit test*. So for anything fixed or absolutely
positioned with that property, a hit test cannot be the evidence — the evidence
has to come from the pixels: sample what is actually painted at the label's
coordinates, or compute the composite of the overlay over the ground. **The
credential-free contrast gates cannot do it either: they measure token PAIRS,
and a gradient composited over a label is not a pair.** Whether
`contrast-insitu.mjs` reaches this strip at all is an open question — which is
why 9.19's done-when asks for a gate shown to go RED on the build before the
fix, rather than for one that merely passes after it.

**AND THE REVERSE HOLDS, which is where it bites in the other direction:** an
overlay that DOES take pointer events is visible to a hit test and may be
perfectly readable through, e.g. a transparent click-catcher over a dialog. So
the two questions are independent in both directions, and the shape of this
entry is not "hit tests are weak" but **"a measurement that answers a question
you did not ask reads exactly like one that answers the question you did"** —
the same family as “A STYLESHEET REVIEW AND A SCROLL CHECK WOULD BOTH HAVE
PASSED THIS FOREVER” and “AN ACCESSIBILITY WALKER CAN ONLY SEE THE CLICKABLE
THINGS THAT WERE STYLED AS CLICKABLE” above — arriving this time through the
instrument nobody doubts.

## 101. `node --experimental-strip-types --check file.ts` EXITS 0 ON A FILE WITH A SYNTAX ERROR AND 1 ON A FILE WITH NONE, SO ITS EXIT CODE CARRIES NO INFORMATION AT ALL

**Found 2026-10-07, and it had already been written into a ROADMAP entry as evidence the night before.**

There is no Deno and no TypeScript compiler on this machine, so `supabase/` is never type-checked.
A session reaching for *"at least prove it parses"* finds `node --check`, which is exactly right
for `.mjs`, and on Node 24 the type-stripping flag is already on. **Both halves of the reading are
wrong, measured on Node v24.18.0:**

| what was run | what happened |
|---|---|
| a copy of `platform-admin/index.ts` with `(((` injected after `Deno.serve(async (req) => {` | **exit 0.** A deliberate syntax error, reported clean |
| `_shared/newBusiness.ts`, untouched and valid | **exit 1** — `SyntaxError: Unexpected identifier 'Db'` at `type Db = any;`, i.e. parsed as plain JavaScript with the types left in |

So a **0** can mean *the file was never parsed* and a **1** can mean *the file was parsed as the
wrong language*. The second is the louder failure and therefore the safer one: it sends you looking
at a line that is fine. **The first is the dangerous one**, because it is what a session gets on the
file it actually edited, and it reads as a pass.

**WHAT DOES WORK, AND IT IS ONE CALL:** `require("node:module").stripTypeScriptTypes(src, { mode:
"strip" })` **is** the parser — it throws on a real syntax error and returns JavaScript otherwise.
Measured in both directions: it threw *"Expression expected"* on the `(((` copy, and accepted
`platform-admin/index.ts`, `_shared/newBusiness.ts` and `create-business/index.ts` unchanged. Write
its output to a `.mjs` if you also want `node --check`'s own opinion, but the strip is what catches
the fault.

```bash
node -e 'require("node:module").stripTypeScriptTypes(require("fs").readFileSync(process.argv[1],"utf8"),{mode:"strip"})' <file.ts>
```

**AND WHAT IT STILL IS NOT.** Stripping is a parse, not a type-check: a wrong type, a missing
property, a misspelled import still pass. `_shared/email.ts` records a type error that shipped and
put the literal word `undefined` into every detailer's email as a colour, and nothing here would
have caught it. **Say "it parses", never "it compiles".**

**THE SHAPE, which is why this is an entry and not a footnote.** The tool was not broken and
nothing was misread: `--check` was asked a question about a language it was not told it was reading,
and it answered confidently. **A green from a tool that was never pointed at the thing you meant is
indistinguishable from a green from one that was** — the same disease as “A SKIPPED CHECK READS
EXACTLY LIKE A PASSING ONE”, with the skip inside the tool rather than inside our own `if`. The
only reason it was caught is that § 95's rule was followed: a copy was broken on purpose before the
result was believed. **It had been quoted as evidence in ROADMAP 9.18 (d) the previous night**, and
that entry is corrected rather than edited quietly.

## 102. A SABOTAGE THAT SILENTLY FAILED TO APPLY IS INDISTINGUISHABLE FROM A SABOTAGE THE CHECK CAUGHT, AND THE REPORT READS GREEN EITHER WAY

**Measured 2026-10-08, by the supervisor, on itself, twice in four minutes.**

§ 95's rule is to break a thing on purpose before trusting it. The rule says nothing about
proving the break landed, and that is the hole.

Verifying ROADMAP 0.11 slice 4, the end anchor was removed from `MEDIA_KEY` in
`supabase/functions/_shared/photoKey.ts` with a scripted string replacement, and the suites were
re-run:

```
ℹ pass 18
ℹ fail 0
```

Read in the obvious direction that is *"the guard survives a missing anchor"* — a serious finding
about a security guard. **It was nothing of the kind. The replacement never matched**: the target
string was written with the wrong level of backslash escaping for a heredoc, the script raised its
own `AssertionError`, the file was never touched, and the 18 passes were an unmodified repo passing
normally. **The sabotage and the clean run produce the same numbers**, because a sabotage that did
not happen is just a clean run.

The same thing happened again in the same sitting on a different file: a floor of **44** was set on
`belt.mjs --self-check` while **46** assertions existed, an assertion was then disabled on purpose,
and the run printed `self-check passed — 45 assertions`. The sabotage landed perfectly and the
guard let it through, because the declared floor had two assertions of slack in it — § 98, arriving
by a different road.

**THE RULE: a sabotage is not evidence until the file is proved to have changed.** One command,
between the break and the re-run:

```bash
git diff --numstat <the file you sabotaged>     # 1 1 <path>  — it landed
                                                # (no output) — it did NOT, and your green is a lie
```

Then restore from a copy taken before the edit and prove *that* with the same command, so the
sabotage cannot be left in the tree. **Assert the target count inside the script too** (`assert
s.count(target) == 1`) — that is what caught the first one, and it only caught it because the
assertion was there; without it the script would have written the file unchanged and said nothing.

**Why this is its own entry rather than a line under § 95.** Every other failure in this document is
a measurement of the product lying. This one is **the instrument that verifies instruments** lying,
in the direction that always feels like success: the number you were hoping for. A session following
§ 95 to the letter, with no idea its edit silently no-op'd, records *"broken on purpose, caught"* or
*"broken on purpose, survived"* from the identical output — and both write-ups are fiction.


## 103. A REVEAL THAT IS *REVERSIBLE* READS AS `opacity: 0` FROM THE WRONG SCROLL POSITION, SO A CORRECT PAGE MEASURES AS A BLANK ONE

**Found 2026-10-08 on `/terms`, while verifying ROADMAP 0.4's one added clause — and it very nearly
went into the write-up as a defect in that clause.**

The measurement: scroll the whole page in 300px steps so every reveal fires, return to the top,
settle 2.5 seconds, then read `getComputedStyle(row).opacity` for all eleven clauses. The answer:

```
What this is               row=1
What you pay               row=1
Sales tax                  row=0      ← the clause just added
The twelve-month plan      row=0
... every remaining clause row=0
```

Three clauses deep and everything below it invisible, on the page just edited. It reads exactly
like a broken render, and the first reading of it was *"my clause is dim"*.

**Nothing was wrong.** `thread.js`'s reveal is **position-driven and deliberately REVERSIBLE** —
its own comment says so: *"an element is hidden ONLY while its top is still below 82% of the
screen… Land anywhere, reload anywhere, follow a link into the middle of the page and everything
you can actually read is already in its end state."* Scrolling back to the top legitimately
re-hides everything below the fold. **`opacity: 0` at `scrollY = 0` is the design working.**

**THIS IS THE INVERSE OF THE REVEAL ENTRY ALREADY IN THIS FILE AND THE RULE THERE MAKES THIS ONE
WORSE.** That entry is *“A crop of the exact right element can still be an empty picture, and file
size will not tell you”* — **UNNUMBERED**, so it is cited by its title rather than by a § number
this session would have had to invent (§ 92: a note citing a number it did not check).

That entry is a screenshot taken *too soon*, before `.in` lands — a false PASS, fixed by waiting for
`opacity === "1"`. This one is a false FAIL, and waiting for `opacity === "1"` from the top of the
page waits for ever on a page that is behaving perfectly. **The two faults share a mechanism and
have opposite fixes, which is why reaching for the recorded one is actively unsafe here.**

**THE RULE: read a reversible reveal from where the READER would be standing, never from a fixed
scroll position.** Put the element in the reading zone, settle past the transition, then measure:

```js
await page.evaluate((i) => document.querySelectorAll("dt")[i]
  .closest("div").scrollIntoView({ block: "center", behavior: "instant" }), i);
await page.waitForTimeout(900);          // past the transition, not past an observer
```

**And measure the TAIL separately, because it is a different question.** Park at
`document.documentElement.scrollHeight` and read the LAST element: `thread.js` carries an easing of
the reveal line over the final stretch precisely because *"the second pricing card, three of the
terms and the whole footer were on screen and permanently invisible"* before it existed. Anything
that makes a page longer — one added clause will do it — lands in that stretch. Measured both ways
at 1440, 392 and 320: all eleven clauses reach opacity 1 in the reading zone, and "Ending it"
reaches 1 at maximum scroll.

## 104. `node --test <file> --break=x` DOES NOT PASS THE FLAG TO THE FILE, SO A TEST-FILE SABOTAGE SWITCHED ON THE OBVIOUS WAY IS SWITCHED OFF

**Measured on Node v24.18.0, 2026-10-08, by printing `process.argv` from inside a test**: under
`node --test`, node spawns the test file as a child process whose argv is exactly
`[node, <the test file>]` — **every extra argument is consumed by the test runner and nothing
reaches the file.** `--break=x`, `-- --break=x`, trailing or not: the file sees none of it.

**This is entry 102 with a different cause and the same output.** A `--break=` that never arrives
leaves the test asserting the truth, so it passes — and *"pass 6, fail 0"* with the defect
switched on is byte-for-byte what a caught sabotage prints. Three sabotages in
`tests/keyboard-boxes-declared.test.mjs` were "verified" that way before anybody checked whether
the flag had landed.

**TWO SWITCHES ALREADY IN `tests/` ARE AFFECTED, AND ONE OF THEM IS NAMED IN `CLAUDE.md`.**
`no-credentials-in-tracked-text.test.mjs`'s `--break=md-only` and `retry-safety.test.mjs`'s
`--break=` both read `process.argv`. Both files' own headers document the DIRECT form
(`node tests/<file>`), which works — when a file is run directly, `node:test` runs in-process and
argv is the command line. **But `CLAUDE.md`'s verification table prescribes
`node --test tests/no-credentials-in-tracked-text.test.mjs` and mentions `--break=md-only` in the
same breath**, so appending the flag to the command the rulebook gives you is the natural move and
it does nothing. Measured both ways, same machine, same minute:

| | population | result |
|---|---|---|
| `node --test tests/no-credentials-in-tracked-text.test.mjs --break=md-only` | — | **pass 1, fail 0** — the flag never arrived |
| `node tests/no-credentials-in-tracked-text.test.mjs --break=md-only` | 170 files | **14 passed, 6 failed** — the sabotage bites |
| `node tests/no-credentials-in-tracked-text.test.mjs` | 1076 files | 20 passed, 0 failed |

**THE RULE: a sabotage in a test file is an ENV VAR, or it is documented with the direct
invocation and never with `node --test`.** An env var crosses the process boundary; a flag does
not. `tests/keyboard-boxes-declared.test.mjs` reads both — `process.env.BREAK` first, the flag as
well — so either invocation works and the documented one is the env form.

**And the second half, which cost the same half hour again in the same sitting: an edit that lands
is not an edit that is enough.** The anchor assertion from entry 102 passed for all three of those
sabotages, and one still did not bite, because the injection replaced the FIRST occurrence of its
anchor and `StepLocation.jsx` writes the address label twice — once as the visible `<span>`, once
as the field's `label` prop. **Replace every occurrence, and read the failure line rather than the
exit code**: a green run proves nothing about a sabotage, and "the anchor was found" proves only
that something changed.

## 105. A SABOTAGE CAN BE "CAUGHT" BY A STATUS RULE RATHER THAN BY AN ASSERTION, SO THE VERDICT WORD AND THE FINDINGS LIST DISAGREE AND THE VERDICT WORD IS THE LIE

Found 2026-10-08 while certifying the `/examples` thumbnail gate for ROADMAP 7.10, on the one
run whose whole job was to prove the gate had actually been fixed.

**The acceptance test, as the spec wrote it:** `--break=inject` must **fail** on a gate that has
the fix and **pass** on one that does not. That sentence is the single assertion separating a
real fix from a paragraph describing one, and it is the sentence this entry is about.

So the pre-fix gate was fetched from history — `git show 9570e97:scripts/example-shots-check.mjs`,
the actual parent of the fix commit, not a hand-made copy with a block deleted — and run against a
green baseline with `--break=inject`.

**Its last line said `FAIL`.** By the criterion as written, the unfixed gate passes the acceptance
test, and the fix was unnecessary.

**It is not what happened.** The pre-fix gate printed all five sites `current` and `0 stale or
missing`. It found nothing, because it never compares the injected block at all — `--break=inject`
is a flag it has never heard of. The word `FAIL` came from its own status rule:

```js
const status = failures.length === 0 && BREAK === "" ? "pass" : (SABOTAGE && canary.observed_failure ? "pass" : "fail");
```

`BREAK` is non-empty, `SABOTAGE` is false, so the expression reds — **for an unrecognized flag, not
for a caught defect.** Every gate in this repo that guards its sabotage path with
`BREAK === "<known>"` has the same property: feed it an unknown `--break=` value and it reds
while measuring exactly nothing.

**Why this is worse than an ordinary false green.** A false green is suspicious on sight. This is a
**red that looks like the fix working**, read by a session that is specifically trying to confirm a
fix, at the moment confirmation bias is highest. The honest reading — *the old gate catches it
too, so what did we build?* — is the wrong conclusion drawn from a correct output.

**THE RULE: certify a sabotage on the FINDINGS LIST, never on the verdict word.** The question is
never *did the run go red*, it is **did it name the thing you broke**. Here the discriminating
figures are 1 finding naming `ex3`'s injected block, against 0 — not `FAIL` against `FAIL`.

| run | gate | `--break=inject` verdict | findings naming ex3's block |
|---|---|---|---|
| B | fixed (`83737c4`) | FAIL | **1 — "its picture was taken before a change to the block"** |
| D | pre-fix (`9570e97`) | FAIL | **0 — all five sites `current`** |

**And the corollary, which is the cheap half: a criterion written as "it must fail" is not a
criterion.** Write it as *"it must name X and only X"*, which is what this repo's better canaries
already do — `example-shots-check.mjs` itself measures *which sites the switch altered* rather than
reading its own failure list, for a neighboring reason recorded in its own comments. **A spec that
says "fail" is satisfiable by a crash, a typo in a flag name, or a gate that has never worked.**

Related: 102 (a sabotage whose edit silently never matched prints the same green a caught one
prints — the same disease, one step earlier), and 95 (a canary aimed at an assertion that changed
shape keeps passing while testing nothing).

## 106 — A SELECTOR CHOSEN FROM THE WORD IN THE CLAIM, NOT FROM THE PICTURE, MEASURES A DIFFERENT ELEMENT AND CONFIDENTLY REFUTES A TRUE FINDING

**Measured 2026-10-08 by the supervisor, on itself, while re-checking ROADMAP 7.10.**

The claim under test was *"the wordmark clears the headline at 1920/1440/768 and
overlaps by 42px at 392/320"* on `/ex2`. The obvious selector for "the wordmark"
is `.brand` — and `/ex2` has a `.brand`: the small "Delgado." in the header. It
was measured against `h1` at five widths and **cleared at every one, by 61px at
392**, which reads as a clean, quantified refutation of the previous session's
figure.

**It was the wrong element.** The page carries a *second* wordmark — a huge
ghosted `DELGADO` watermark, `<div class="ghost" aria-hidden="true">`, sitting
behind the headline. Measured against that, the numbers reproduce the original
claim **exactly**: `-42px` at 392 and 320, clearing by 2px at 1920/1440 and 14px
at 768. The original finding was right to the pixel.

**What caught it was opening the other session's screenshot and looking at it** —
`.manager-shots/7.10/ex2-wordmark-392.png` shows the ghost letters crossing the
headline, which no number in the refutation would ever have revealed.

**Why this direction is the dangerous one.** A selector that matches nothing
fails loudly (gotchas 102). A selector that matches *the wrong real element*
returns plausible geometry at every width, with zero console noise and no
error — and it arrives as *"the previous session's figure does not reproduce"*,
which is a satisfying conclusion that invites you to overwrite a correct record
with a wrong one. **A refutation deserves more scepticism than a confirmation,
not less**, because confirming costs nothing and refuting rewrites the file.

**The rule:** when re-measuring somebody else's visual claim, **derive the
selector from their artefact — their screenshot, their script, the element they
name in the commit — never from the English noun in the sentence.** If the only
thing you have is the noun, grep the page for *every* candidate and report how
many you found; two candidates for "the wordmark" is itself the finding. And
before publishing a refutation, **put the two pictures side by side.**


## 107 — `waitForSelector` DEFAULTS TO *VISIBLE*, AND A LOADING CONTAINER IS INVISIBLE EXACTLY WHILE IT IS TRUE

**Measured 2026-10-08 while building `scripts/mail-log.mjs` for ROADMAP 3.1.**

The screen under test draws its list as `<div class="rows" aria-busy="true">`
while the answer is on its way, and fills it with rows once it lands. The check
asked the obvious question — *while we are waiting, is the list marked busy?* —
the obvious way:

```js
await page.waitForSelector('[data-mail-log] .rows[aria-busy="true"]', { timeout: 10000 });
```

**It timed out at all five widths**, and the finding it produced read *"the list
is NOT marked busy"* on a screen that was marked busy for 1.8 seconds every
single time. Nothing about the message suggested the instrument: the wait is a
normal wait, the timeout is a normal timeout, and the sentence it prints is a
sentence about the product.

**Why.** Playwright's `waitForSelector` defaults to `state: "visible"`, and
"visible" means *a non-empty bounding box*. The element that proves we are still
waiting is **empty by definition** — that is what waiting means — so it has zero
height, and is therefore invisible for precisely the interval in which the thing
being asserted is true. The attribute is in the DOM the whole time; the default
simply refuses to look at it.

```js
{ state: "attached", timeout: 10000 }   // the fix, and it is the whole fix
```

**The shape to remember is not "Playwright has a default".** It is that **the
default is wrong in exactly the case you are testing for, and right everywhere
else** — every other wait in the same file (`.tabbar`, the gear row, the rows
themselves) wants `visible` and gets it. So the bug cannot be found by noticing
that one wait looks different from its neighbours; the one that is different is
the one that is correct.

**It fails toward a FALSE DEFECT, which is the less common direction here and
worth saying.** Most entries in this file are about a check that goes green over
a real fault. This one goes red over a working screen, and a red that names the
product is how a session spends an hour editing code that was never wrong — or
worse, "fixes" a loading state by giving the empty container a height nobody
asked for.

**The rule:** any wait for an element whose whole meaning is *there is nothing
here yet* — a loading container, an empty-state wrapper, a skeleton, a
`[hidden]` region you expect to be hidden — takes `state: "attached"`. If you
are asserting a presence rather than a sight, say so.

Related: 100 (a hit test answers *"can this be pressed"*, never *"can this be
read"*), and 36's family — computed is not painted, painted is not visible.

## 108 — A `:not([aria-pressed=true])` LOCATOR PLUS `.nth(i)` IN A LOOP RE-RESOLVES AGAINST A LIST YOUR OWN PREVIOUS CLICK JUST SHORTENED, SO THE LABEL YOU PRINT IS NOT THE ELEMENT YOU CLICKED

Found by the supervisor 2026-10-09 walking ROADMAP 2.1b, and it printed a
**false defect** — *"the price did not move"* — at two widths, with no error
and no console noise, over a booking page that was pricing perfectly.

The walk did this:

```js
const picks = page.locator(".bk-pick:not([aria-pressed=true])");
for (let i = 0; i < await picks.count(); i++) {
  const el = picks.nth(i);
  const label = await el.innerText();   // read now
  await el.click();                     // and the list changes underneath
}
```

A Playwright locator is a **query, not a snapshot**. Clicking item 0 sets its
`aria-pressed` to `true`, which **removes it from this locator's own result
set**, so every later index points one element further along than it did when
the loop was planned. The printed label belongs to the element at that index
*now*; the click landed on a different one. The count is stale too.

**The tell is that it fails toward a false defect**, which is the direction
that gets working code "fixed" — the same hazard as 107 and the inverse of a
missed bug. A refutation is cheap to produce and expensive to believe (106).

**The fix is to stop asking the question by position.** Click by a stable
identity — `page.locator(".bk-pick", { hasText: "Express Wash" })` — and then
**verify the click landed before judging its effect**: read `aria-pressed`
before and after and require it to have flipped. That one extra read splits
*"the control did not respond"* from *"the control responded and the price did
not move"*, which are opposite findings that a bare before/after on the price
cannot tell apart. Report the first as **no verdict possible**, never as a pass
and never as a defect.

Related: 106 (a selector chosen from the word rather than the picture), 98 (a
declaration asserted with an inequality carries slack).

## 109 — "THE TEXT STOPPED CHANGING" IS NOT A SETTLED MEASUREMENT: IT RETURNS ON THE PRE-UPDATE PLATEAU, WHICH LOOKS IDENTICAL TO A FINISHED ONE

Found in the same sitting as 108, on the same measurement, after 108 was
already fixed — so the first correct-looking run still printed the same false
defect for an entirely different reason. **Two instrument faults in a row on
one number, both toward a false defect.**

The booking bar quotes over the network. The check was:

```js
// WRONG — stable means "finished" only if it ever started
let last = await bar(page);
for (;;) { await wait(200); const now = await bar(page);
           if (now === last) return now; last = now; }
```

For the few hundred milliseconds after a click, the request is **in flight and
the bar still shows the old figure**. That plateau is byte-identical to a
settled one, so the loop returns the *previous* price and the comparison
`before !== after` is false. Lengthening the wait only moves the odds; it does
not make the signal mean anything, and a fixed `waitForTimeout(2000)` that
happens to work is luck that will be shortened by the next person tuning the
run time.

**Settle on the WORK, not on the rendering.** Count the requests:

```js
page.on("request",        (r) => isQuote(r.url()) && pending++);
page.on("requestfinished",(r) => isQuote(r.url()) && pending--);
page.on("requestfailed",  (r) => isQuote(r.url()) && pending--);
// settled := pending === 0, then the text holds still across one more tick
```

With that, the same walk returned `$65 → $160` where it had twice reported no
change. **The repo already knows this shape**: 103 reads a reversible reveal
from where the reader stands, 107 waits for *attached* rather than *visible* —
every one of them is a check that cannot distinguish *not yet* from *not going
to*. Ask the thing that knows.

Related: 108 (same measurement, previous fault), 107, 103, 36.


## 110 — "DOES THE PAGE OVERFLOW AT ALL" IS NOT THE TEST FOR "A NATIVE BAR IS DRAWN ACROSS THIS DESIGN", AND IT REDS ON A PAGE THAT IS CORRECT

**Measured 2026-10-09**, verifying ROADMAP 3.1a — the mail log's long list,
moved into its own bounded scroll box so the shared settings container stops
drawing the browser's full-height bar.

The obvious assertion is *the document must not overflow*. It fails. The
document **does** overflow, at both widths, on a screen that is working
perfectly: `scrollHeight` **912** against `clientHeight` **900** at 1440, and
**922** against **844** at 392. The first version of the check asked exactly
that question and printed a **false defect at both widths**, which is the
direction that gets working code "fixed" (see 106, 107).

**Neither number is the list.** `.settings-body` — the container that actually
drew the bar — does not overflow and cannot scroll at 1440 (probed by setting
`scrollTop` and reading it back, not by inspecting CSS), and **the 392 layout
has no `.settings-body` at all**: it is a full `settings-page` whose own 78px of
page scroll is the design. Beside those twelve and seventy-eight pixels, the
list's own box holds **2,298px** and **3,284px** of scrollable content. A dozen
pixels of ordinary page is not a bar drawn across a design.

**Two separate traps in one assertion, and both are this repo's recurring
shape:**

* **`scrollHeight > clientHeight` is not "this scrolls".** An element can
  overflow under `overflow: hidden` and scroll nowhere. The only honest probe
  is to *move it*: set `scrollTop`, read it back, put it back.
* **An element the check names may not exist at the width being measured.**
  `.settings-body` is absent at 392, so `offsetWidth - clientWidth` on it was
  `null`, `null === 0` was false, and the assertion reddened on **a missing
  element rather than a wide one**. A null from a selector and a bad measurement
  are the two sentences this whole file exists to keep apart.

**THE FIX IS A COMPARISON, NOT A THRESHOLD, AND IT NEEDS NO INVENTED NUMBER:**
the page's own overflow must be **smaller than the list's own scrollable
height**. That is just *"the thing the page is scrolling is not this list"*, it
survives the demo tenant's row count changing, and it is exactly what the
sabotage breaks — unbound, the box stops scrolling at all (scrollable height
**0**) and the page grows by **3,361px** instead. A fixed pixel budget would
have been a number nobody could defend six months later.

Related: 107 (false defect from a wait), 106 (a selector chosen from a word
rather than a picture), 100 (a hit test cannot answer a legibility question).


## 111 — A REPORT THAT ROUNDS WHAT THE RULE COMPARES MAKES A CAUGHT RED LOOK LIKE A BUG IN THE CHECK

**Measured 2026-10-09**, same run as 110. The no-overlap rule was `gap >= 0`
and the report printed `Math.round(gap)`. Under one sabotage it went red while
printing its own evidence as **"tightest gap 0px"** — a line that says the
assertion should have passed. The real value was about **-0.02px**: rows that
sit flush by design, separated by a border rather than a gap, arriving as a
fraction below zero on subpixel layout.

**The damage is not the flake, it is the five minutes spent doubting the
product.** A red whose printed evidence looks green reads as a broken
instrument, and the next session's instinct is to relax the rule — which is
how a check stops testing anything.

**Two things, both cheap:** print the number at the precision the rule compares
at (`toFixed(2)` here, not `Math.round`), and give a flush-by-design geometry an
explicit tolerance with the reason written beside it. Real stacking — the
regression this rule exists for, where every row painted on the one above it —
is **tens** of pixels, not hundredths.

**AND RELAXING THE RULE DISARMED NOTHING ONLY BECAUSE THE CANARY WAS ADDED IN
THE SAME EDIT.** `gap >= 0` to `gap >= -0.5` is exactly the equality-to-floor
move 95 is about: it widens what passes, and there was no sabotage aimed at it.
`the-stacked-rows` (a snapshot with a -12px gap, which must flag) was written and
run in the same edit, per CLAUDE.md's hard rule.

Related: 95 (a relaxed assertion disarms its canary), 98 (an inequality carries
slack), 93 (a number edited to make two things agree).

## 112 — TWO CALLERS OF THE SAME CAP CHECK MEASURE DIFFERENT BYTES, SO A FILE SIZED TO BREACH ONE OF THEM LEGITIMATELY FITS THROUGH THE OTHER — AND THE CORRECT REFUSAL READS AS A MISSING ONE

Found by the supervisor, 2026-10-09, closing the two gaps ROADMAP 0.11d1 wrote
down as unproven.

The photo allowance is checked in two places and **they do not weigh the same
object**:

| caller | what it measures | why |
|---|---|---|
| `JobPhotos.jsx` | `file.size` — the ORIGINAL the person picked | pessimistic on purpose: the resize lands it lower, so nobody gets through who should not |
| `receipts.js` | `blob.size` — the SHRUNK blob | the door checks `claimed_bytes` against what R2 really stored, so the number sent has to be the blob really going up |

Both are right. But a probe that provokes a refusal with **a 1×1 PNG padded to
2 MB** breaches the first and sails through the second: `shrink()` resizes it to
a few hundred bytes, and against 1.24 MB of room it **fits**. The expense sheet
then saves normally, closes, and shows nothing — which is exactly what "the
product failed to show its refusal" looks like.

**It printed a false defect at both widths and in both languages — 8 of 22
checks — over a screen that was composing the sentence perfectly.** False
defects are the direction that gets working code "fixed" (see 106, 107, 109).

**TWO FIXES, AND THE FIRST ONE IS THE ONE WORTH COPYING.**

1. **Ask the thing that knows, before pressing.** The sheet's own label reads
   *"Add a photo of the receipt"* until it holds a file and *"Receipt attached
   — choose another"* once it does. Asserting that flip — 108's shape — turns
   *"no refusal appeared"* into *"the file never counted"*, which is a different
   investigation. Without it the run accuses the product.
2. **Size the provocation against the byte the caller actually weighs.** A
   canvas of RANDOM NOISE at `MAX_EDGE` does not compress, so the shrunk blob
   stays ~8.8 MB; and the intercepted budget was moved to **10.0 MB of 10.24
   MB** so only 251 KB of room is left. Two figures that still format
   differently — `9.0 MB` of `10.24 MB` leaves 1.24 MB, which a resized receipt
   genuinely fits inside.

**The general rule: before sizing a fixture to breach a limit, read which
expression the limit is applied to in the caller you are exercising.** "The
file is bigger than the room" is not one fact here; it is two, and only one of
them is true at a time.

Related: 108 (ask the element whether the press landed), 107 (a false defect
from a wait), 106 (a refutation deserves more scepticism than a confirmation).

## 113 — A SCRIPTED REWRITE CAN LAND IN THE RESPONSE AND STILL NOT BE WHAT EXECUTED: `route.fetch()` SEEDS THE BROWSER'S OWN CACHE WITH THE ORIGINAL

**Measured 2026-10-09 building `scripts/media-door-browser.mjs` for ROADMAP 0.11b.**

To press a branch that is behind an off-by-default flag, the obvious move is to
rewrite the module Vite serves rather than edit the file:

```js
await page.route("**/src/lib/photo-door.js*", async (route) => {
  const resp = await route.fetch();                 // <-- THE BUG
  const src = await resp.text();
  await route.fulfill({ response: resp, body: src.replace(FLAG_OFF, FLAG_ON) });
});
```

That works, once. **`route.fetch()` performs the request through the BROWSER's
network stack, so the ORIGINAL response is what lands in the browser's cache.**
`fulfill` then serves the rewritten body for that one request, and **the next
navigation reads the original straight out of cache with no request to
intercept** — no route callback, no counter moving, nothing to notice.

Measured, with a counter incremented at module scope inside the rewritten text:

```
after nav 1 — served: 1   executed: 1
after nav 2 — served: 1   executed: 0
```

**So the press happened on a document running the untouched module, and the
screen was measured on the wrong branch.** It fails toward whichever answer the
unmodified code gives, which here was a FALSE DEFECT at all three widths.

**WHY IT SURVIVES A `gotchas` 102 CHECK.** 102's rule is *prove the break
landed*. It did land: the substitution matched, the body served contained it,
`git diff` would have shown it if it had been a file. **102 asks about the edit;
this asks about the EXECUTION, and they are different questions.** A counter kept
in the script answers the first and reads green off navigation one's count for
ever.

**THE ASSERTION HAS TO COME OUT OF THE PAGE.** Sign the rewrite and read the
signature back:

```js
const FLAG_ON = "export const FLAG = true;\n"
  + "globalThis.__proof = (globalThis.__proof || 0) + 1;";
// ...
const ran = await page.evaluate(() => globalThis.__proof ?? 0);
```

It exists only if the rewritten text was evaluated, and it resets per document,
so a cached copy shows as a zero rather than inheriting an earlier green.

**AND TWO FIXES THAT LOOK SUFFICIENT AND ARE NOT.** `cache-control: no-store` on
the fulfilled response does not help — the entry can already be in the cache by
then. **`Network.setCacheDisabled` over CDP does not close it either:**
Chromium's per-renderer memory cache sits outside it, and with the HTTP cache
disabled the second navigation still needed **no request at all**. What actually
works is removing the second navigation: sign in once in a throwaway context,
save `storageState`, and give every measured context **exactly one `goto`**.
Fetch the source with node's own `fetch` instead of `route.fetch()`, so the
original never enters the browser at all.

**THE GENERAL SHAPE, which is the part worth keeping:** *"I served it"* and
*"it ran"* are two claims, and a script that intercepts anything — a module, a
stylesheet, a config, a feature flag — can only observe the first. Ask the page.

Related: 102 (prove the sabotage landed — the claim one level out from this one),
107 (a false defect from a wait), 110 (a false defect from too broad a question).

## 114 — A GATE THAT CATCHES ITS OWN LAUNCH ERROR AND RETURNS AN EMPTY POPULATION ACCUSES EVERYTHING ELSE

**Measured 2026-10-09 in `tests/sweep-methods-are-pinned.test.mjs`.** The
gate ran `bash -c "git log ..."` and caught every error by returning an empty
string. This Windows workspace has no `bash`, so the missing executable became
zero commits. The gate then reported every open item unnamed and failed its
history floor — a real red result with no relationship to the item that had
just run.

The fix invokes `git` directly with argument arrays. The normal run now sees
the history and passes; both existing negative controls still fail:
`PIN_CANARY=scope` breaks the production boundary assertion and
`PIN_CANARY=fragment` moves the declared figures. Do not wrap a required
executable in an empty-result fallback: distinguish a failed command from an
empty answer before using either as a measurement.

**AMENDED 2026-10-09, SAME DAY, BY THE NEXT SUPERVISOR — THE FIX ABOVE CHANGED WHICH EXECUTABLE WAS
WRAPPED AND LEFT THE WRAPPER IN PLACE.** The paragraph you just read ends *"do not wrap a required
executable in an empty-result fallback"*, and the diff that shipped with it kept
`catch (e) { return e.stdout || ""; }` verbatim — it only swapped `bash -c` for `git`. **Proved by
substituting a missing executable** (`git-does-not-exist`, one line, landing asserted per 102): the run
reddened with *"0 commits name an open item, floor 339. Commits only accumulate, so a DROP means
history was rewritten or the boundary regex stopped matching"* — a sentence about git history, from a
run in which git never started. The repair now throws when the process never ran at all
(`e.status == null`), and says so in those words; a non-zero EXIT with output still returns that
output, because that is a real answer. Re-measured in the same edit: normal **8 passed, 0 failed**;
`PIN_CANARY=scope` **6/2**; `PIN_CANARY=fragment` **6/2**; the launch sabotage now prints
*"git could not RUN (ENOENT)"*.

**The generalisation is the part worth keeping: a write-up can state the correct rule and the diff
beside it can not implement it.** The prose was right, specific and freshly measured, which is exactly
what stops the next reader from checking the four lines underneath it. Read the code the lesson is
about, not the lesson.

## 115 · `innerText` RETURNS WHAT CSS RENDERED, SO A SENTENCE ASSERTION REDDENS OVER A SCREEN COMPOSING IT CORRECTLY

**Measured 2026-10-09 building ROADMAP 0.11bc1's intake half, and it printed SIX FALSE DEFECTS before it
was read** — the direction that gets working code "fixed".

The website brief's photo control puts its error sentence in a `<span className="label">`. `theme.css:422`
gives `.label` `text-transform: uppercase`. So:

```js
await box.innerText()    // "THE PHOTO SERVICE SENT BACK SOMETHING THIS SCREEN CANNOT USE. RELOAD…"
await box.textContent()  // "The photo service sent back something this screen cannot use. Reload…"
```

The assertion was `said === DOOR_WORDS.unreadable`, and it failed at 1440, 392 and 320 on a screen
rendering the right sentence in the right place. The same fault reddened the counter assertion in the
same run: `/^1 added$/` against `"1 ADDED"`.

**It is not only `uppercase`.** `capitalize` and `lowercase` do it too, and this repo already uses
`capitalize` on the expense categories (entry at line 278). A `::first-letter` rule, `content` from a
pseudo-element and `hyphens` all move `innerText` as well.

**THE TELL IS THAT IT FAILS ON A STRING YOU CAN SEE IS RIGHT.** The report printed the whole sentence,
correct word for word, and called it wrong — which reads as a product bug until somebody notices the case.

**THE RULE.** Compare an authored string against `textContent`, with the whitespace collapsed by hand:

```js
((await box.textContent()) || "").replace(/\s+/g, " ").trim()
```

`innerText` is right only when the question is *"what does a person SEE"* — a visibility check, an
is-it-hidden check, a layout read. For *"did the product compose this sentence"* it is the wrong
instrument, and it is the one every example reaches for first.

**And Playwright's own `hasText`/`hasNotText` filters match against `textContent`, not `innerText`** —
measured in the same run, where a `hasNotText: /^\d+ added$/` filter correctly excluded a counter
rendering as `1 ADDED`. So a locator and an assertion in the same block were reading two different
strings off one element, and only the assertion was wrong.

## 116 — A CHARACTER CLASS BOUNDING A LIST TRUNCATES ON THE FIRST DELIMITER *INSIDE* A VALUE, AND EVERY RULE DOWNSTREAM THEN REPORTS CLEANLY ON THE SHORT LIST

Measured 2026-10-09 building `scripts/cors-rule.mjs` for ROADMAP 0.11c. The job was
to read the product's own list of platform hosts out of `app/src/lib/host.js` and hold
`FOR-ANDREW.md` step 9a1 against it, so the CORS rule Andrew pastes cannot drift from
the addresses the app actually uploads from.

The parse bounded the array with a negated character class, which is the obvious way
to write it:

```js
hostSrc.match(new RegExp(name + "\s*=\s*(?:new Set\()?\[([^\]]*)\]"))
```

`PLATFORM_HOSTS` holds five entries and one of them is **`"[::1]"`** — the IPv6
loopback. `[^\]]*` stops at the `]` **inside that string**, so the match ended
mid-value and the list came back with **four hosts of five**. Nothing threw, nothing
was empty, and no rule reported a problem: the check then asked its questions of a
four-item population and printed `4 hosts` in its own evidence line, which reads
exactly like a correct count.

**The fix is to bound on the token that actually closes the construct** — `])` for a
`new Set([…])`, `];` for an array — rather than on "the first `]`":

```js
hostSrc.match(new RegExp(name + "\s*=\s*(?:new Set\()?\[([\s\S]*?)\]" + close))
```

**Two things make this worse than an ordinary regex bug.**

**It fails toward a SHORT POPULATION, not an error** — the same direction as entry 89's
`"1.3 —"` matching `"11.3 —"`: the verdict is computed correctly over the wrong set.
A dropped origin here is an upload that works from one address and is blocked from
another, with a correct program and nothing anywhere to say why.

**And the evidence line is not evidence.** The run printed *"5 hosts"* only after the
fix; before it, it printed *"4 hosts"* in the same confident tone. **A count a check
derives from its own parse cannot validate that parse.** The only thing that caught it
was reading the printed list against the file by eye — which is why the same script now
declares how many `bucket:` entries the source table has (`declared`) and reddens when
fewer resolve, instead of shrinking its population silently. That half was found the
same way, one minute apart: the bucket resolver looked in `photoDoor.ts` alone, missed
`TENANT_PUBLIC_BUCKET` in `photoKey.ts`, resolved **2 of 3** buckets and printed
**"step 9a1 names all 2 buckets"** as a PASS over a three-bucket table.

**So: any check that derives a population by parsing must declare the size it expected
from the source, not from its own match.** `grep -c` the construct, count the entries
by hand once, or read a `declared` count out of the text — and fail when the two
disagree. A parse that quietly returns fewer items is indistinguishable from a healthy
one.

## 117 — A CAUGHT SABOTAGE WRITES THE SAME `"status": "fail"` A REAL DEFECT DOES, AND IT IS THE LAST THING LEFT ON DISK

Found by the supervisor, 2026-10-09, while verifying ROADMAP 3.1a — a ticked item.

`receipts/mail-log-scroll.json` read `"status": "fail"` with two named failures:

```
1440/box/rules-in-effect — scrollbar-width "auto", scrollbar-color "auto"
392/box/rules-in-effect  — scrollbar-width "auto", scrollbar-color "auto"
```

That is a precise, credible report of the exact fault 3.1a was written to fix:
the browser's own scrollbar back across the design. Re-run clean, the same gate
is **20 assertions, 0 failed, 4 canaries caught, 2 UNJUDGEABLE** — the item is
correct and the tick stands. The only trace of why the receipt was red sat nine
lines down the file, inside `dimensions`:

```json
"dimensions": { "break": "unstyled" }
```

**It was a sabotage run.** Somebody proved the gate bites, and the proof
overwrote the product's verdict with it. `receipts/r2-public-base.json` was in
the identical state from item 0's gate-regression run.

**Why this is worse than an ordinary stale receipt.** A stale pass says "true at
an older commit". A sabotage red says "broken now", in the voice of the
instrument built to be believed, and it is the *most recent* run — so it beats
every honest receipt that came before it, and the stale-receipt sweep that feeds
supervision surfaces it as a live failure on a closed item. The direction of the
error is the dangerous one: **it invites a session to go and "fix" working code.**

It is `docs/gotchas.md` 105 one level out. There, a sabotage was *caught* by a
status rule rather than by an assertion; here, a caught sabotage *is* the
standing report.

**The fix is a filename, not a status field.** `writeReceipt` in
`scripts/receipt.mjs` now writes `receipts/<name>.sabotage.json` when the
receipt records a `dimensions.break`, and the directory validator skips those
the way it already skips `holds.json`. `status` is deliberately left alone:
`validate()` grades that field and must keep failing a red receipt, so the
sabotage evidence stays complete and readable in its own file while the real
receipt keeps the last honest verdict about the product. One guard at the shared
writer covers all 28 graded checks; per-script fixes would have covered one.

Proved both directions rather than read: `--break=unbound` on the mail-log gate
still reddens (6 of 20 failed, on assertions), the sabotage lands in
`mail-log-scroll.sabotage.json`, and `mail-log-scroll.json` still reads `pass`
across the run. `node scripts/receipt.mjs` still reports its 36 genuine reds and
grades zero sabotage files.

**What it does not fix: a check that never records its break.** Detection is
`dimensions.break`, so a script that forgets to write it still clobbers its own
receipt, silently, exactly as before. If you add a `--break=` switch, record it
in `dimensions` or you have built this fault again.

## 118 — A CONTROL-CHARACTER GUARD THAT SPLITS WINDOWS FILES ON LF FINDS A CARRIAGE RETURN ON EVERY LINE

Found 2026-10-10 during belt supervision. `belt.mjs --self-check` split its
own CRLF source on `"\n"`, leaving character 13 on every line, then correctly
classified character 13 as forbidden. The result was a permanent red covering
every line of `dashboard.mjs`; the guard's real finding was invisible in the
noise. Split logical lines with `/\r?\n/` before testing their contents. The
canary still inserts character 8 and must remain red for that case.

## 119 — A COMPUTED COLOUR READ RIGHT AFTER A CLASS CHANGE IS THE TRANSITION'S FIRST FRAME, SO A RUNTIME SABOTAGE CAN PRINT PASS

Found 2026-10-10 by the supervisor re-checking ROADMAP 4.1a. The sabotage added
`primary` back to "Yes, decline it" and immediately compared every button's
computed `backgroundColor` with `var(--accent)`. `.btn` transitions its
background, so the read returned the OLD dark fill and the run printed PASS with
the defect switched on. With an 800ms settle the same sabotage printed
`["Accept","Yes, decline it"]` and exited 1 at both widths. The honest run was
not affected — a freshly mounted button has nothing to transition from — which
is exactly why only the sabotage lied. Settle past the transition (or read
`transitionend`) before judging a colour you just changed.

## 120 — THE ONE RED 404 IN A CONSOLE THAT IS NOT A FAILURE

**REWRITTEN 2026-10-10 (ROADMAP 99.3a): THE GEAR NO LONGER MAKES IT. `/admin` STILL DOES.**
Until that date, opening the Settings gear as anybody who was not a platform
admin logged `Failed to load resource: the server responded with a status of
404` for `/functions/v1/platform-admin`, once per page load, because
`GearMenu.jsx` asked `whoami` to decide whether to draw the back-office row.
Andrew had the row removed (he types `/admin`), so the gear now asks nothing and
**any `platform-admin` line on the dashboard is a real fault** —
`node scripts/gear-whoami.mjs` holds the gear at zero calls and a silent console,
and `--break=ask` puts the old call and row back to prove it can see them.

**The line still exists in one place, by design:** a signed-in non-admin who
opens `/admin` (or `/admin/office`). The back office asks `whoami`, and
`platform-admin` answers a non-admin the way it answers everybody: a 404 that
says nothing, never `{admin:false}`, because a "no" would confirm the endpoint
exists. Chrome logs every 4xx a `fetch` receives and JavaScript cannot silence
it, so the screen shows "Page not found" and the console shows that one line.
`node scripts/admin-refuses.mjs` holds it. A console filter should forgive it
BY URL, BY COUNT and ON `/admin` only, never by the words "404" alone.

## 121 — A RECEIPT'S `git_sha` CAN DESCRIBE THE TREE BEFORE THE FIX IT CLAIMS TO PROVE

Found 2026-10-10 during triage of ROADMAP 9.19. The committed
`receipts/scrim-clearance.json` says `git_sha` and `git_sha_started` are
`cc27db13`, with `head_moved: false`; the stylesheet fix it is offered as proof
of first lands in `4d566424`. A browser can of course be measuring uncommitted
working-tree changes, but that is not what a receipt stamped clean at the parent
commit says it measured. The recorded SHA then cannot recreate the claimed
product state, and "measured at the commit that carries this paragraph" is
false.

**A receipt may certify a committed result only when its `git_sha` contains the
code under test.** Commit the product change before the final clean run, then
run the check and commit its receipt; if the run must happen before committing,
record the tested diff explicitly and rerun after the commit before marking the
item proved. Do not repair the SHA by hand: it is evidence, not metadata to
make tidy.

## 122. "Shown" by width is not shown: a label mid-fade has a box and no pixels

Found by the supervisor 2026-10-10 on ROADMAP 9.12b. `scripts/office-coming-in.mjs` asks whether each timeline label is shown with `width > 0 && visibility !== "hidden"`. The pins fade in (`boPinIn`, `opacity` from 0, staggered delays), so a label caught mid-fade has a full box, passes that test, and paints nothing. **One copy of the check's own `fed-1440.png` and `fed-390.png` showed every stem and no label at all, under a run that printed 72 of 72.** A re-run a few minutes later painted them. Nobody looked at the screenshot the check itself saved.

**The rule:** "is it visible" reads computed `opacity` up the ancestor chain (or the pixels), never only the box; and a check that saves a screenshot is not finished until somebody has opened it. Width-only visibility is the same failure as `docs/gotchas.md` 100 (hit test is not legibility) seen from the other side.

## 123. A frozen review copy keeps what JavaScript measured, so it is only true at the width it was taken

Found by the supervisor 2026-10-11 on ROADMAP 9.12b, after Andrew rejected it from his real phone while the laptop preview of the same copy looked fine. `belt/freeze.mjs` saves a page as one HTML file with its scripts removed. Anything the page positioned in JavaScript is saved as frozen inline numbers: the back office tab bar's highlight (`.bo-navpill`, set by `OfficePage.jsx` `measure()`) was saved as `width: 88px; translate(175px)` from a 390px capture. The copy also said `width=device-width`, so a 360 or 430 phone laid the CSS out again around those frozen numbers. Measured with a scratch Playwright render of `belt/shots/9.12b/after-phone.html`: the highlight sat **19px off the Money tab at 360 and 25px off at 430**. The live app was fine because it measures again on resize. **The review copy showed something the product does not do, and he reported it as a product fault.**

**The rule:** a frozen copy is pinned to the width it was taken at (`<meta name="viewport" content="width=<capture width>">`, in `freeze.mjs` since this entry), so any phone shows the captured layout scaled to fit. The same copy pinned to 390 measured **0px off at both widths**. Never treat a still copy as evidence for a width it was not taken at. To check a different phone width, run the live app at that width.
