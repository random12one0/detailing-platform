# What comes next

**THE SINGLE SOURCE OF WHAT IS LEFT, IN ORDER. Created 2026-09-12.**

This file exists because a worklist lived in a conversation and in a file only
one side could read, and a `/clear` would have taken it. The rules live in
`CLAUDE.md`, the parked finds live in `FOUND.md`, the history lives in the
commits, and **what comes next lives here.** One line each, in the order they
get done. Tick a line by deleting it and letting the commit be the record.

`docs/roadmap.md` is the PRODUCT roadmap, phases 0–9, and still outranks this
for anything it names. This file is the current run of polish work in front of
it.

---

## Next, in order — SET BY COWORK AT THE 2026-09-13 BOUNDARY, do these first

**This order is his, not a guess, and it replaces whatever a session infers
from the list below.**

1. **The 45 unclassified `platform-admin` check failures.** Classify each BY
   NAME into *real defect* or *stale assertion*. **Deliverable: the split as two
   numbers, and every real defect named.** Proof, not a plausible story —
   `CLAUDE.md` trap (h) and (k) are the two ways these go wrong, and tonight
   found three filters that asserted something the code had never returned.
2. **The Gateway Timeout logged in `FOUND.md`.** One unexplained 500 from
   Supabase's own edge gateway on the first cron tick after the pg_net timeout
   was raised to 30s; the same call by hand returned 200 in 5.3s a minute later.
   One occurrence, never explained.
3. **Translate-on-save.** Designed, not built. **Both secrets are already live
   in the Supabase secret store for `kguqylyzgyzfktkfnhjb`:**
   `DEEPL_API_KEY` and `GOOGLE_TRANSLATE_API_KEY`. DeepL first (lifetime 1M
   characters), Google as the fallback (500k/month, recurring), automatic and
   invisible handover, the provider behind a seam from the start.
   **NEITHER KEY MAY APPEAR ANYWHERE UNDER `app/`** — read only through
   `Deno.env.get()` inside the edge function. Andrew created and pasted both
   himself and neither has passed through a session. **A schema sketch is owed
   before any migration.**

**AND THE BACK OFFICE IS FROZEN UNTIL ANDREW LOOKS AT IT — his instruction via
Cowork, 2026-09-13.** Today, Growth, Money, Detailers and Plumbing are built and
verified; **he asked for the whole dashboard finished first and to review it
visually himself.** Do not change those screens further unless he asks. Fixing a
defect somebody reports is not "changing them further"; redesigning, reordering
or improving them is.

## Next, in order

1. ~~Wave F — the em dash sweep, all three categories.~~ **DONE 2026-09-12.**
   Zero single em dashes left in any user-facing string; the eight
   parenthetical pairs stand.
2. **Setup step 11 and two touch targets.** Step 11 is five 467px template
   cards, 2,980px and 62 buttons on the last screen of onboarding — one open,
   four as `Folded` rows reading *"Ask about access · Not changed yet"*. Plus
   the 28px checkbox row wherever the dashboard renders one (Promo codes, setup
   step 9), and the unnamed switch on *How you get paid*.
3. ~~**The platform landing page.**~~ **DONE 2026-09-12** — it grew to five
   items and then six. The three show-me CTAs, the developer annotation, the
   four header targets, the 42 figcaptions, the corner labels at both widths.
4. **The five example sites, floors only — MEASURED BY THE REVIEWER 2026-09-12,
   all five at phone width.** The sampled guess this line used to carry is
   replaced by real numbers. **Aesthetic variety is explicitly out of scope;
   the floors are not aesthetics.** Lane A owns `docs/tenant-sites/`, and
   Andrew has authorised the crossing — say so in the commit.

   | | horizontal scroll | under 11px | targets under the floor |
   |---|---|---|---|
   | ex1 `v-goldenhour` Prime | none | 8, down to 9px | 6 at 22-24px |
   | ex2 `w-delgado` | none | 15, all 10.5px section labels | 1 at 78x19 |
   | ex3 `x-ballantyne` | none | 1 at 8.5px | 12, incl. 5 service rows 337x28, wordmark 108x30 |
   | ex4 `y-kinzie` | **YES, at 377px** | 22, down to 9.5px | 10 at 17px tall |
   | ex5 `z-tampabay` | none | 10 | 9 |

   **DO THE CONTACT DETAILS FIRST ON ALL FIVE, then the service rows, then the
   rest. Do not sweep for a pixel value** — his instruction, and the reason is
   the same disease as the landing page: **on a detailing website the phone
   number IS the conversion, and on these sites it is the smallest thing on the
   page.** ex5 renders its number at 10px inside an 11px-tall target and its
   email at 211x11; ex1's number is 153x24.

   **AND ex4 IS WORSE THAN THE TABLE SAYS — measured here 2026-09-12, not by
   him: it has ZERO `tel:` and ZERO `mailto:` links.** Its only phone number is
   plain text in a footer list item, `(312) 555 0148`, spaces and all. So the
   worst site for tap targets does not have a tap target to fail — there is
   nothing to press. That is a bigger miss than any figure in the row above it.

   **Two named extras:**
   - **ex5 writes its number with EN DASHES** — `(813) 402&ndash;7719`, in four
     places — which is wrong typographically and can defeat click-to-call
     parsing. Hyphens. (The `href` is already `tel:+18134027719` and correct;
     it is the visible text that is wrong.)
   - **ex1's five `font-size: 0` labels** — Services, Extras, Vehicle,
     Location, When, the booking steps. They read fine to a screen reader and
     are invisible to everyone else **by accident rather than by design**, so
     the mechanism is a visually-hidden class, not zero type.

   **ORDER OF WORK, HIS RULING 2026-09-12: ex4's MISSING contact goes FIRST,
   ahead of every target size on all five sites.** *"A number you cannot tap is
   not a small target, it is not a control."* So: give ex4 a real `tel:` and a
   real `mailto:` before touching a single font-size anywhere. Then the rest of
   the contact pass across the other four, then ex4's sideways scroll at 377px
   (the only hard-floor break in the set), then the service rows, then the rest.

   **AND THE BLOCKOUT THREAD IS CLOSED — do not re-open it.** Andrew fired the
   switch himself: `confirm` received the exact sentence, cancelling left the
   day blocked and nothing was destroyed, and the accessibility tree reads
   `checkbox "Block this day"`. His method is CLAUDE.md trap (l). The two
   follow-ups are in `FOUND.md` and neither is this wave's work.

4a. **NOTHING HERE CATCHES A MISSING IMPORT, AND THAT IS THE BIGGEST HOLE IN
   THE INSTRUMENTS.** Cowork's ask, 2026-09-12, after the previous session
   forgot an import twice: *"a missing import fails only at runtime, so the
   suites pass and the page dies."* It is numbered 4a rather than 13 because
   he ranked it **worth more than most of what is left on this list** — a
   check that catches a whole CLASS of dead page beats another screen's polish.

   **WHY EVERY EXISTING CHECK IS BLIND TO IT.** `npm run build` succeeds: an
   undefined identifier is legal JavaScript until it is evaluated, so Rollup
   bundles `<Folded …/>` with no `Folded` in scope and says nothing. The ten
   credential-free suites read source as TEXT. There is no React test runner
   here. The only instrument that has ever caught one is a person opening the
   page — which is CLAUDE.md trap (k) in its purest form: **every check we own
   asserts how something is WRITTEN, and this is a fault in what it DOES.**

   **WHAT WOULD CLOSE IT, cheapest first, and do not reach for ESLint by
   reflex** — it is a new dependency, a config file and a plugin chain for one
   rule, and this repo has no linter at all today.

   - **A ~60-line script over the AST.** For each `app/src/**/*.{js,jsx}`,
     collect what the module declares (imports, `const`/`let`/`function`/
     `class`, parameters, catch bindings) and report every identifier
     referenced that is neither declared nor on a small browser-globals
     allowlist. `esbuild` is ALREADY a dependency and parses JSX; `acorn` is
     not installed but ships inside `rollup`, which is. **Baseline it by
     deleting one import and watching it name the file.**
   - ESLint with `no-undef` only, if the script turns out to fight JSX scoping.
     Correct, and three dependencies heavier.

   **THE ACCEPTANCE TEST IS ONE SENTENCE: delete the `Folded` import from a
   screen that uses it, and the check must name that file.** A check that
   passes on a deliberately broken import is this repo's oldest failure — a
   skipped check reading exactly like a passing one — and there are at least
   six shipped examples of it. Lane C.

5. ~~**The copy pass that the call-site sweeps never reached.**~~ **DONE
   2026-09-12.** Every live single em dash in `lib/`, `scripts/` and the
   dashboard is sorted: 13 middle dots, four colons, three commas, one
   semicolon, the rest full stops. Six parenthetical pairs stand. The joins are
   swept too — the step-1 vehicle fee was the step-4 travel fee's unfixed
   sibling. British spellings gone from the seed (tyres, Odour). **AND THE
   SWEEP HAD LEFT THE SPANISH HALF OF EVERY STRING IT FIXED: 68 catalogue
   values still carried the dash their English key had dropped.** What is
   deliberately left is in `FOUND.md` — the guided tour's remaining copy, the
   landing page, one attribution dash.
   ~~Old text, kept so the measurement is not lost:~~
   User-facing English in this product does NOT only live in `t()` calls in
   components: `lib/siteIntake.js`, `lib/templates.js`, `lib/emailMessages.js`,
   `lib/setup.js`, `lib/push.js`, `lib/photo-rules.js`, `lib/adminInsight.js`
   and `scripts/seed-demo.mjs` all hold prose in plain data tables.
   **91 em dashes measured there on 2026-09-12**, against zero left in `t()`
   calls — so the sweep that reported "zero" was true and incomplete. Same
   blind spot produced the sixth "tap" and the Microfibre seed string. Classify
   by the four axes and move each Spanish key with its English.
6. ~~**Spanish: 139 to zero.**~~ **DONE 2026-09-12 — and the count was the
   floor rather than the total.** 139 translated, coverage 100%, the § 9 ceiling
   stepped 139 → 0, and § 9 gained the three shape checks that had only ever
   read `es.js` (placeholders, `usted`, empty) — 63 passed, 0 failed, all four
   new checks baselined by breaking their subject. **Then a browser walk with
   the toggle on Spanish found 34 more the count could not see**: the entire
   36-step guided tour, drawn with `t(sentence)` from a data table. Plus
   Payments' handle table, Billing's five invoice words, Money's two bare
   labels, the gear's `aria-label`, and eleven `dateLong()` calls printing
   English weekdays beside Spanish ones. **THE REMAINING GAP IS A CLASS, NOT A
   COUNT: a `t()` whose argument is a variable is invisible to every instrument
   here.** `FOUND.md` names it and says what the honest instrument would be.
7. **Mileage.**
8. **Route awareness.**
9. **Weather, from open-meteo.**
10. **Deposits.**
11. **Making photos do work.**
12. **Quote from scratch.**

---

---

## PHASE: MAKE THE EDITING SCREENS FEEL LIKE A PRODUCT

**Andrew's words, 2026-09-12:** the editing screens feel like *a thousand text
boxes* rather than something integrated into the product. He wants them
**visually good and pleasant to use, the way a well-made app feels, not a form.**

**WHY THIS COMES AFTER THE CURRENT WORK AND NOT BEFORE.** A beautiful screen
with a wrong price on it is worse than a plain screen with a right one. A
detailer who loses a booking to a stale number does not care how the page
looked, and a defect shipped inside a redesign is twice as hard to find because
nobody knows whether the look or the logic moved it. Correctness first, then
this — and this is not optional afterwards.

**AND IT IS THE HONEST WEAK SPOT OF THE RUN THAT PRECEDED IT.** Everything from
2026-09-11 to 2026-09-12 was correctness: spelling, tap targets, translation,
stale instruments. **None of it made anything nicer to look at.** That is a real
gap and not a matter of taste; a detailer meets these screens on their first
morning and decides then whether this product is serious.

### How to write each screen's item, and it is not "pick a widget"

**Say what the screen should FEEL like and what a detailer should be able to SEE
at a glance. The widget is the builder's call.** An item that names a component
has decided the answer before anyone has looked at the problem — and this repo
already has a kit (`components/controls.jsx`) whose whole point is that the
answer is usually already in it.

**THE EXHAUSTION TEST STILL GOVERNS AND SO DOES LAW 1** — new or rebuilt work
takes design-system law 1 in full (`CLAUDE.md` § SCREEN RULES). This phase does
not license a new visual language; it licenses using the one that exists
properly.

### The screens, worst first

**1 · SERVICES AND ADD-ONS.** *Agreed, and it is the worst one.* It is the
screen a detailer spends the most time in and the one their whole business
hangs off, and it is a stack of inputs.
**It should feel like looking at your own menu** — a detailer should see the
shape of what they sell without reading: which categories exist, what each costs
and how long it takes, what is an add-on rather than a service, and which one is
the base price. **Today the price ladder and the vehicle tiers are two unrelated
lists on one page, and the relationship between them — the tier multiplies the
service — is the single most important fact on the screen and is nowhere on it.**

**2 · VEHICLE SIZES.** *Agreed, with a correction: it is not a separate screen.*
It lives inside Services and add-ons, so fixing it separately would produce two
designs on one page. **Treat it as part of item 1.**
**It should show what a customer will actually pick between** — the same cards,
in the same order, with the same words, because that IS what the booking page
draws. A detailer setting up tiers is designing a screen they never see.
Note: the count is not fixed at three — a detailer can add, remove and reorder —
so whatever this becomes has to hold two tiers and six.

**3 · THE 21-STEP WEBSITE QUESTIONNAIRE.** *Agreed that it is the longest thing
any detailer will ever do here. I would argue it is NOT a form march and that
the diagnosis matters.* It already has: one question per screen, a progress
rule, its own answer-count, drawn previews of real example sites, and a skip on
every optional step. **It is the best-structured long form in the product.**
**What is actually wrong is that it never shows the detailer what they are
BUILDING.** Twenty-one steps of answering, and the thing being made is not on
screen at any point. It should feel like watching your website appear, not like
filling in a questionnaire about one. **That is one idea, not twenty-one screen
redesigns** — and it is cheaper than rebuilding the form.

**4 · BUSINESS INFO.** *Agreed on importance, disagree on the reason.* It is
eight labelled fields and an honest line about the mailing address and the law —
a reviewer walked it and found nothing wrong with it. **It is not a bad screen;
it is a FIRST screen, which is a different job.** A new detailer meets it before
they trust the product.
**It should feel like being set up, not like being processed** — the difference
between a form and somebody helping you. The cheapest real win: **show what a
customer sees as it is typed.** Every field on it ends up on a booking page or
in an email, and none of them says so.

**5 · ONE I WOULD ADD, and it is a bigger miss than Business info.** **The
customer-facing booking page is the only screen in this product a detailer is
JUDGED on**, and a detailer cannot see it while setting it up. Every screen
above is a form whose output is that page, and the product never shows the two
together. **A live preview of the booking page, beside the settings that change
it, would do more for "feels like a product" than restyling any single form** —
and it makes items 1, 2 and 4 land harder because each becomes visibly
connected to something.

### What finishing this phase means

The exhaustion test passes on every screen above; the detailer can see the
result of what they are editing without leaving the screen; and Andrew looks at
it and does not say *a thousand text boxes*. **That last one is the only
acceptance test that matters and it is a person, not a check** — the same shape
as the tenant-site work, where five pages passed every automated floor in this
repo and he still said they looked AI.

## Settled at the compaction, 2026-09-12 — both were mid-flight and both are answered

- **The bare-switch check IS committed and IS baselined.** `composition` test
  **1b** landed in `ad584c0` and the suite reads **95 passed, 0 failed** on
  `3803b47`. Baselined the only honest way: Team's `<Switch bare>` had its
  `label` stripped, 1b failed and named the file, the label went back.
- **THE UNBLOCK CONFIRMATION STILL WILL NOT FIRE FROM A SCRIPT, AND THAT IS
  WHERE IT IS BEING LEFT — his instruction.** Both fixes are in the served
  file and a real click no longer throws, but nothing automation can deliver
  reaches `onChange`: the input will not take focus in a browser pane whose
  document is not focused, so click, keypress and `focus()` all no-op. **Andrew
  will exercise it in a real browser the way he launched the guided tour.**
  Do not spend another session chasing it. What IS verified: `aria-label` is on
  the `input[type=checkbox]`, measuring 46x44, on a fresh load; and `own()` no
  longer throws `TypeError` on the boolean `Switch` passes it.

## Standing checks — run these when the thing they guard changes

- **EVERY CALL TO ACTION ON EVERY MARKETING PAGE LANDS WHERE ITS OWN WORDS
  PROMISE.** Three of ten large CTAs on the landing page said *"See how booking
  works"*, *"See it with your name on it"* and *"Look inside the dashboard"*
  and all three went to `/pricing`. **Nothing errored, which is why it
  survived** — a dead link looks like a mistake and this looked like a
  decision. It rots quietly every time somebody adds a button, so check the
  destinations whenever the marketing copy changes.
- **THE DEV SERVER IS NOT EVIDENCE; THE BUNDLE IS.** A Vite server left running
  overnight served a stale CSS transform on 2026-09-12 and cost hours. Restart
  it at the start of any session that will measure CSS, and settle a
  "not applying" with the served file and then `app/dist/assets/*.css`.
  CLAUDE.md trap (g) has the sequence. **If the owner says "the site is not
  working" and localhost looks wrong, ask how long that tab has been open.**

- **A SWEEP OF ENGLISH STRINGS LEAVES THE SPANISH HALF OF EVERY ONE IT FIXES.**
  Wave F reported zero single em dashes and was measuring only the keys; 68
  catalogue values still read `— `. The instrument is one line — compare the
  dash count of every key against its value — and it belongs beside any copy
  sweep from here. Run it whenever product punctuation changes.
- **AND A `t()` WHOSE ARGUMENT IS A VARIABLE IS INVISIBLE TO EVERY CHECK HERE.**
  Coverage counts `t("literal")` and says so about itself. Four data tables
  rendering in English were found by walking the dashboard in Spanish in a real
  browser, which is the only instrument that can see them. `FOUND.md` has it.

- **Sweep the suites for checks coupled to a SPELLING rather than a behaviour.**
  Three were found and fixed on 2026-09-12 — a renamed CSS property, a
  hard-coded `minLength`, and a literal CSS rule that gained a declaration —
  and every one failed on a correct product. CLAUDE.md trap (k). Not started.

## Not ours to decide — waiting on Andrew

- ~~**The unsubscribe page's accent.**~~ **SETTLED AND BUILT 2026-09-12 —
  Andrew's rule, in his words: THE COLOUR FOLLOWS WHOSE RELATIONSHIP IS
  ENDING.** A customer unsubscribing from a detailer's emails gets that
  detailer's colour, because the relationship being ended is with the detailer
  and the page belongs to them. Both halves shipped: `unsubscribe`'s `get`
  action now returns `primary_color` from `business_branding`, and
  `UnsubscribePage.jsx` runs it through `brandVarsFor` — the same legibility
  correction the booking page uses — onto all four of its `.bk` roots.
  Measured live: Riverside's stored `#dc2626` paints the button, and the TEXT
  accent is lifted to `#e04040` to clear 4.5:1, which is the "Your color"
  screen's promise doing its job on the one preset that fails it. A business
  with no branding row returns `null` and falls back to house green, which is
  byte for byte what `booking.css` already declares.

  **THE OTHER ARM IS A RULE, NOT CODE, AND THIS IS WHERE IT LIVES.** A DETAILER
  unsubscribing from something of OURS gets platform green, `--ac #38E08B`.
  **There is no detailer-facing unsubscribe page in this product today** —
  `owner-push-unsubscribe` is a push-subscription delete inside the dashboard
  and has no page at all — so the branch was deliberately NOT written. A branch
  with one live arm and one arm nobody can reach is a branch that rots
  untested. **Whoever builds that page reads this line and paints it green.**
- ~~"Look inside the dashboard" has nowhere to go.~~ **SETTLED 2026-09-12 by
  changing the WORDS, not the destination** — the rule is in CLAUDE.md now.
  There is no signed-out dashboard to look inside and building one to justify a
  button would be the tail wagging the dog. It reads "See what the dashboard
  does" and points at the landing page's own pinned dashboard section.
  **Logged as a TASTE CALL for Andrew's stamp, not a verified fix**, along with
  "See five sites built with it", which keeps `/examples` and stops promising
  the visitor their own name on a page showing five other businesses.
- **The five example sites that nobody has walked.** The six guided tours WERE
  walked end to end on 2026-09-12 — 36 steps, four findings in `FOUND.md`, one
  of them a real bug at 1280x800.

---

## Red, and unexplained all day

- **`platform-admin`, 46 failing.** Sampled on 2026-09-11: a mix of checks
  pointing at source that MOVED (`AdminPage.jsx` 1,436 → 813 lines plus
  `PreviewEntry.jsx`) and checks enforcing rules the owner has since REVERSED
  (`check("no chart")` fails because a chart was deliberately built at his
  request). **Somebody has to sort which is which, one failure at a time** —
  a suite this red gets ignored wholesale, and the one real regression hiding
  in 46 stale checks is the reason that matters. Lane C.
- ~~**`password-reset`.**~~ **GREEN 2026-09-12 — 29 passed, 0 failed.** All
  three were WRONG TESTS, not wrong code, and a permanently red suite trains
  everybody to stop reading it. They assert behaviour now: `MIN_PASSWORD` is
  used in BOTH length fields rather than a hard-coded 8; the sign-in form has
  an email input, a password input **or** `PasswordInput`, and a submit inside
  the form. Both rewrites were baselined by breaking their subject.
  **A fourth failure was mine**, introduced that morning by renaming
  `padding-left` to `padding-inline` — fixed and baselined too.

---

## The standing instruments

Run these rather than trusting a number written in prose — every check count in
this repo has been wrong at least once.

| | |
|---|---|
| `composition`, `design-contrast`, `landing-pricing`, `route-contract` | credential-free, must pass before any wave is finished |
| `booking-core` | includes § 14, the calendar's stale-answer guard |
| `spanish` | includes § 9, the coverage ratchet |
| `scripts/i18n-coverage.mjs` | the count, with `--list` for every gap |
| `scripts/lane-check.mjs <lane>` | before every `git add` |

**`scripts/sweep-widths.mjs:605` still prints "clean" whatever it measures**
(`found += await say(...)` where `say` returns undefined). Do not trust it
until that is fixed. Lane C, in `FOUND.md`.

---

## HANDOFF — the DP Website session stood down here, 2026-09-12

**Andrew asked for DP Cowork to be the single building session. Everything
below is written down because it was agreed in a conversation this session does
not survive.** Last commit: `3b9f058`. Run range for the accounting:
`f8a1b2e^..3b9f058`, 76 commits, 118 files, +8,202 / -1,701.

### What was verified, and how

Not "should work" — each of these was measured after the change.

- **A customer's `?lang=` link no longer touches the detailer's language.**
  Reproduced first as a five-step browser walk (clear both stores → visit
  `/book/demo-detail?lang=es` → visit `/nothing-here`), which rendered the 404
  in Spanish to an English visitor; re-ran identically after the fix and it
  renders English while the booking page stays Spanish.
- **A detailer's renamed vehicle tier is never translated.** Measured on a
  throwaway tenant `lang-scratch`, cloned from the demo's rows and **deleted
  afterwards** — never the demo seed. English: `Compact runabout / Heavy /
  Large`. Spanish: `Compact runabout / Heavy / Grande`. Examples likewise —
  the detailer's *"Anything with a tow bar"* passes through, the untouched
  *"Truck, large SUV, van"* becomes *"Camioneta, SUV grande, van"*. **Zero
  empty labels in either language.** A service deliberately named **"Travel"**
  — which IS a catalogue key (`Traslado`) — stayed "Travel" in Spanish, because
  service names never reach `t()` at all.
- **Suites at handover:** spanish 70, composition 95, landing-pricing 109,
  route-contract 33, booking-core 210, setup-progress 32, design-contrast all
  pairs, `npm run build --prefix app` clean.

### The decision Andrew's reviewer asked for, made explicitly

**`?lang=` SETS THE LANGUAGE FOR THE VISIT, NOT FOR THE DEVICE. Only pressing
EN/ES persists.** A detailer texts a Spanish link, the customer opens it on the
household computer, and the next person to book on that machine must not get
Spanish with no idea why. Following a link is not choosing a language for a
device; pressing a button is.

**AND IT NEEDS A PER-VISIT STORE RATHER THAN NOTHING AT ALL, WHICH IS THE PART
THAT IS EASY TO UNDO BY ACCIDENT.** `ManageBookingPage.jsx:336` hands the
browser to `checkout.stripe.com`, and Stripe returns to `?paid=1` with no
`lang` on it. A locale held only in module memory would therefore drop a
Spanish customer into English **mid-payment**. `sessionStorage` is exactly the
right scope: it survives the redirect and the reload, and it dies with the tab.
**Do not "simplify" this to no storage.**

### The new checks, and what they are for

`tests/spanish.test.mjs` § 10 — a lane C crossing, on Andrew's instruction
*"whatever check would have caught this, add it"*, named in `3b9f058`.

- **10a-d** run the real `localeStore` against a stubbed browser (it has no
  imports, so Node can load it). They fail if a `?lang=` link moves the
  dashboard scope, if a link's language persists to `localStorage`, or if the
  picker's choice stops persisting.
- **10e-g** walk `DEFAULT_VEHICLE_SIZES` itself and fail if a default tier word
  has no Spanish, or if `StepVehicle` passes a tenant's own text to `t()`.
- **Both baselined by reintroducing the bug** — 68 passed, 2 failed — then back
  to 70 / 0. Every check above them asks whether a Spanish string EXISTS;
  **none could see a Spanish string that is correct and shown to the wrong
  person**, which is what both of the day's faults were.

### What was deliberately NOT done, and why

- **The already-leaked `dp.lang.app=es` is not healed**, the dashboard has no
  EN/ES control, `<html lang>` is fought over by two scopes, and `/app/today`
  mixes languages. All four are in `FOUND.md` under this date with the
  mechanism for each. They are separate bugs from the leak and need decisions,
  not a patch.
- **`.btn.sm`'s 38px exception was left standing** — `PRODUCT.md` records it
  across 28 call sites and says to reopen it with the owner rather than in
  passing. Only the one wizard link was raised.
- **The Spanish `"unos 1 h 15 min"`** was flagged and not changed: the reviewer
  asked for a native speaker and said explicitly not to act on his say-so.
- **`app/public/img/`'s twelve untracked files are lane A's** and were left
  untouched, as `lane-check` reports them.
