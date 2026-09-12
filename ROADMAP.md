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
