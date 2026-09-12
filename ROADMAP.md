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
4. **The five example sites, floors only.** They are load-bearing now — the
   landing page's front door sends real traffic to `/examples`. **The aesthetic
   variety is the whole point and is not in scope; the floors are not
   aesthetics.** Sampled on `ex1` Prime at 392: six link targets under the
   floor (the phone number 153x24; "Express Wash", "Full Detail", "Ceramic
   Package", "Recent work", "Get a price" at 112x22 or 80x22) and eight
   sub-11px elements including "MOBILE DETAILING" at 9px. **Five labels are
   `font-size: 0`** — Services, Extras, Vehicle, Location, When, the booking
   steps; if they are dots with names for a screen reader then the mechanism is
   a visually-hidden class, not zero type. One site measured of five, so treat
   it as a sample. No horizontal scroll at either width, and the 27 overflowing
   elements are `.motes` and `.marq` decoration inside clipping parents.
   **Lane A owns `docs/tenant-sites/`.**
4. **Spanish: 139 to zero.** `scripts/i18n-coverage.mjs` counts it and
   `tests/spanish.test.mjs` § 9 holds the ceiling. **Step the ceiling down as
   you go.** Worst first: `SiteIntake.jsx` 58, `AdvancedMoney.jsx` 47,
   `Payments.jsx` 10, `WebAddress.jsx` 7, `ReportProblem.jsx` 6, `Money.jsx` 5.
5. **Mileage.**
6. **Route awareness.**
7. **Weather, from open-meteo.**
8. **Deposits.**
9. **Making photos do work.**
10. **Quote from scratch.**

---

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

## Not ours to decide — waiting on Andrew

- **The unsubscribe page's accent.** The reviewer's diagnosis is right and one
  bug, not two: the page never loads the business context, so it has no
  masthead colour. But `UnsubscribePage.jsx`'s header records the OPPOSITE as a
  deliberate decision — platform colours, because this is the customer stepping
  away and dressing that in the detailer's branding uses their colour to make
  something harder. **Andrew's to settle**, and it needs an edge-function
  change either way (`unsubscribe-lookup` returns a name and nothing else).
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
