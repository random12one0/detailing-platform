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
