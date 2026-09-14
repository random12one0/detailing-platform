# WHAT THE HONEST CHECKS FOUND IN `app/src` — for lane B, from lane C, 2026-09-13

**Written at `63509d5`, after running all 58 suites against a tree lane C did
not touch.** Nothing in here is lane C's to fix: every item is a screen, and
`app/src` is lane B's. Each one is a check that is RED TODAY and is red about
the product rather than about itself — lane C has already been through the
stale-spelling ones and closed them.

**READ THIS BEFORE LOOKING AT A RED SUITE**, because two of these are *"a
capability that has no trace in the rebuilt screen"* rather than *"a bug"*, and
the fix for one of them is to DELETE the check.

---

## 1 · THE PRICE EDITOR IS GONE FROM THE BACK OFFICE, AND THE SERVER HALF IS STILL THERE

`tests/platform-billing.test.mjs` — **1 failure of 336.**

```
FAIL  and clearing it back to the files is a real button
```

**What the check asks for, in two halves:** the server carries
`let value: PriceTable | null = null;` in `platform-admin/index.ts` — it does,
still — and `app/src/admin/AdminPage.jsx` carries `action: "prices", prices: null`,
the button that sends it. **That string is nowhere in `app/src` any more.**

**WHAT THE REBUILT SCREEN ACTUALLY HAS** is a read-only display:
`AdminPage.jsx:1321` draws a *"What we charge"* section that prints
`p?.current ?? p?.built_in` through `priceRows()` and says *"Set here,
overriding the built-in table"* or *"The built-in table · nothing is
overridden"*. **There is no editor and no clear button.** So the whole override
feature — `platform_settings.prices`, validated by `pricesFrom`, audited by
`logIt(admin, "prices", …)` — is reachable only through the API.

**HOW BAD IT IS TODAY, MEASURED RATHER THAN ASSUMED:** `platform_settings.prices`
is `null` on `kguqylyzgyzfktkfnhjb` right now, so nothing is stuck and no
detailer is being charged a number Andrew cannot see. **The loss is a
capability, not a live fault.** But the shape of the risk is the one CLAUDE.md
already names: an override set by any route at all could then never be cleared
from the screen, and `null` means *fall back to the files WHOLE*, which is the
safety valve.

**THE DECISION IS ANDREW'S AND IT IS A REAL ONE:** restore the editor, or
delete the feature and the check together. What must not happen is the third
option — a server action nobody can reach and a red check nobody reads.

## 2 · THE THIRTY IN `platform-admin` ARE NOW THREE, AND HERE IS EACH ONE

**RE-CLASSIFIED 2026-09-13 at `af58108`. The suite is 146 passed, 3 failed, 7
skipped — it was 129 / 23 / 7.** Twenty of the twenty-three were checks naming a
spelling or a design the rebuild replaced; those are fixed in `tests/`, which is
lane C's, and the full name-by-name split is
`docs/platform-admin-triage-2026-09-13.md` § 6.

**THE THREE BELOW ARE RED ABOUT `app/src` AND ARE YOURS.** Each was proven to go
GREEN under a plausible fix — the fix applied to a scratchpad copy, suite re-run,
**149 / 0 / 7** — so none of them is a check you cannot satisfy.

### 2a · An action on an open detailer leaves the panel showing stale data

**Check:** `9i · the open detailer is re-read after an action, not left on a snapshot`
**File:** `app/src/admin/AdminPage.jsx:994`, `:1061`, `:1143`

`TabWho` holds the open detailer as `open` — the row OBJECT captured at
`setOpen(r)` when the row was clicked. `act()` awaits `reload()`, which refreshes
`rows` in the parent and **never re-points `open` at the new row**. The `detail`
fetch is worse: its effect keys on `[open]`, which did not change, so it is never
re-read either.

**What Andrew sees:** press Suspend, confirm it, and the panel still says the
detailer is live and still offers Suspend. Nothing anywhere says it worked. He
presses it again.

**The fix that was measured green:**

```js
const [openId, setOpenId] = useState(null);
const open = openId ? rows.find((x) => x.id === openId) ?? null : null;
const setOpen = (r) => setOpenId(r ? r.id : null);
```

The check asserts `setOpen(` and `rows.find(`, and says in its own comment that
it is pinning a SHAPE because source text is the only instrument this repo has
for a React screen. An id-keyed fix and a re-pointing fix both satisfy it.

### 2b · "1 hours ago", "1 months ago", "1 years ago"

**Check:** `10i-ii · and one of anything is never printed with an s`
**File:** `app/src/admin/AdminPage.jsx:83`–`:103` (`ago()` and `shortAgo()`)

Both helpers round and then append a bare plural:

| helper | input | prints |
|---|---|---|
| `shortAgo`, `hours ago` | 60–89 minutes | **"1 hours ago"** |
| `ago`, `months ago` | 30–44 days | **"1 months ago"** |
| `ago`, `years ago` | 365–547 days | **"1 years ago"** |

**The first one is not a corner case.** `shortAgo` prints the *last ran* figure
on Plumbing's "Jobs that run on their own", and the reminder sweep's own
staleness window is 45 minutes — so **60 to 89 minutes is exactly the band a
stopped sweep is in when he first looks at it.** The string he is most likely to
read on a broken job is the ungrammatical one.

**The old check held this and the rebuild dropped it**: it pinned the
`hour`/`hours` ternary, which was the guard itself. `plural()` is already in this
file and is what the rest of the screen uses.

### 2c · F-016 is back on the Detailers list — one missing word

**Check:** `11i · the jobs figure says the jobs are finished ones, in BOTH places`
**File:** `app/src/admin/AdminPage.jsx:1074`

The open panel is right — `<Row k="Finished this month" v={row.jobs_month} />`.
The list row is not: it prints `{r.jobs_month} jobs this month` **directly under**
the attention sentence, which for a healthy detailer reads
`Booking · last one today`.

`jobs_month` counts COMPLETED jobs (`platform-admin/index.ts:271` is
`monthJobs.length` off `done`). So a detailer with work booked and nothing
finished yet reads **"0 jobs this month"** an inch under **"last one today"**.
Both are true and together they read as a broken screen — which is F-016's
original wording exactly.

```jsx
{r.jobs_month === 1 ? "finished job" : "finished jobs"} this month
```

## 2d · AND ONE THING NO CHECK IN THIS REPO CAN SEE — the back office tap floor

**Not a `platform-admin` failure, because nothing in `tests/` asserts the 44px
floor on any surface.** Found by reading `app/src/admin/admin.css` while doing
the above, and stated as SOURCE evidence rather than a measurement, because the
dev server is yours and your tree had uncommitted work (trap (f)).

- **`.pa-x` — the drawer's close button — is `width: 30px; height: 30px`**
  (`admin.css:348`). **There is no `::after` anywhere in `admin.css` except the
  tab underline**, so nothing can be carrying its hit area to 44. It is the only
  way out of the open-detailer drawer that a thumb can find.
- **`.pa-chip` — the Detailers filter chips — has `padding: 6px 12px` at
  `font-size: 12px` and no `min-height`.** That computes to roughly 29px. It is
  the same defect, in the same shape, as the Clients and Money sort chips lane B
  already fixed at `7aacb02` with `.chip`'s vertical-inset `::after`.

**MEASURE BEFORE FIXING** — `docs/START-HERE.md` § 3: a bounding rect cannot
settle this, the instrument is `elementFromPoint` probed at centre and ±4, ±10,
±15. What source CAN settle is that no pseudo-element exists to save them.

**`docs/VERIFIED.md` § 1 does NOT cover this.** That row proved *zero overlapping
pairs and no sideways scroll* on the back office at five widths. It never
measured the floor, and `.pa-x` at 30px is exactly the control § 3 of
`START-HERE.md` was written about.

## 3 · WHAT IS NOT IN HERE, DELIBERATELY

**Nothing about the tap floor, the em dash, the Spanish catalogue or the
stacking rule.** Those surfaces all have rows in `docs/VERIFIED.md` and every
one of their suites is green today: `composition` 97/0, `design-contrast` 43/0,
`spanish` clean, `landing-pricing` 109/0, `route-contract` 30/0.

**And nothing about the browser sweeps**, because lane C did not run them —
`docs/check-coverage-gaps-2026-09-13.md` says exactly which ones and why.

---

# ADDED 2026-09-13, LANE C — THE TAP FLOOR IS MEASURED NOW, AND HERE IS WHAT IT FOUND

**§ 2d of this file said `.pa-x` and `.pa-chip` were under the floor and said so
as SOURCE evidence, because nothing in this repo could probe a screen. That is
no longer true.** `scripts/sweep-tap-targets.mjs` walks the real screens and
measures the real thing — `elementFromPoint`, walked a pixel at a time out from
each control's centre until a press stops landing on it. Run it yourself:

```bash
node scripts/sweep-tap-targets.mjs --baseline    # prove the instrument first
node scripts/sweep-tap-targets.mjs               # the whole product
node scripts/sweep-tap-targets.mjs --only admin  # one surface
```

## A · § 2d IS CLOSED, AND YOUR OWN FIX IS WHAT CLOSED IT

**Both controls now pass, measured rather than read.** `df27d4d` ("The back
office tells you it worked, and its two small controls reach 44") did it, and
this is the independent confirmation that the fix works on the screen and not
only in the stylesheet:

| control | § 2d said | measured now |
|---|---|---|
| `.pa-x`, the drawer's close button | 30x30, no `::after` anywhere in `admin.css` | `::after { inset: -7px }` — **the open drawer measures clean at 1440, 392 and 320** |
| `.pa-chip`, the Detailers filters | about 29px, no `min-height` | 29 painted, **44 reachable**, pitch 45.4, tiles exactly |

## B · THE ONE IT MISSED — `.pa-out` IS 17px TALL, AND IT IS THE ONLY WAY OUT

**`app/src/admin/admin.css:86`.** `padding: 0`, `font-size: 12px`, no
`min-height`, **no `::after`** — so the rule that saved `.pa-x` was not applied
to its neighbour.

```
button.pa-out "Sign out"     — 18px of reach down (rect 17px), floor 44
button.pa-out "See everyone" — 18-19px of reach down (rect 17px), floor 44
```

**Fifteen findings across 1440 / 392 / 320, on every back-office tab, in both
languages.** *Sign out* is the only way out of the back office, and it is the
control at the top right of the one screen that can read every detailer's data.

**It is one rule, not two call sites** — the same shape as `.segmented button`
at `7aacb02` and `.pa-chip` at `df27d4d`. `.pa-out` is a text button with no box
of its own, so the fix is `.pa-chip`'s: leave the paint at 17 and add
`position: relative` plus `::after { content: ""; position: absolute; inset: -14px 0 }`.
**Check the pitch afterwards** — *Sign out* sits in a header bar and *See
everyone* sits under a card, so neither has a neighbour within 44px vertically,
but measure it rather than trusting this sentence.

## C · THE LANDING AND PRICING PAGES — 14 narrow, and the footer is most of it

**`app/src/landing/LandingPage.jsx` and `app/src/landing/landing.css`.** These
reproduced identically across three separate full runs, so they are not noise.

| control | measured | where |
|---|---|---|
| `a "Terms"` (`LandingPage.jsx:1220`) | **36-37px across, 40-41px down** | `/` and `/pricing`, every width |
| `a "Privacy"` (`:1221`) | **43px across, 40-41px down** | same |
| `a "support@detailingplatform.com"` | **40-41px down** | same |
| `a.softlink "See them all"` | **22-23px down** (rect 22) | `/`, every width |
| `a.softlink "Or just the booking page→"` | **23-24px down** | `/`, every width |
| `a.cta.sm "Sign up→"` | **38px down** | `/` at 392 and 320 only |
| `a.lk "Sign in"` | **43px across** (height is fine — `landing.css:348` already sets `min-height: 44px`) | `/` and `/pricing` at 1440 and 768 |

**THE FOOTER IS ONE FIX.** Three bare `<a>`s in a middle-dot-separated line with
no rule of their own. `.ld .softlink` (`landing.css:1110`) is a second, and
`.ld .nav .lk` is a third that is **two pixels short sideways only** — that one
is a judgement call rather than a defect, and it is yours.

**AND `a.lk "Sign in"` IS THE ARGUMENT FOR MEASURING RATHER THAN READING.** Its
rule already carries `min-height: 44px`, so a source-level check would have
passed it. It is 42px WIDE.

## D · THE DETAILER DASHBOARD IS CLEAN, AND THAT IS A REAL RESULT

**Every tab and every settings screen behind both doors, at 1440 / 768 / 392 /
320, in English and Spanish: nothing under 44px of reach.** Your `7aacb02` and
`df27d4d` rules hold everywhere the sweep can reach. The one dashboard finding
is not a dashboard screen:

```
a "support@detailingplatform.com" — 14px of reach down (rect 14px), floor 44
      gear → Your subscription / Tu suscripción, every width, both languages
```

A 14px mailto link on the screen a detailer reaches when their billing is
broken. It is the same footer-link shape as § C and probably the same fix.

## E · WHAT THE SWEEP STILL CANNOT SEE, SAID PLAINLY

- **The booking flow.** Its steps are behind a live availability call and a
  three-month calendar search; `sweep-booking-steps.mjs` owns that walk. The
  probe is a module (`scripts/lib/tapProbe.mjs`) precisely so that script can
  call it, and **that wiring is not done.** Booking steps 1-5 have a row in
  `docs/VERIFIED.md` § 1 for overlap and sideways scroll, and **no row for the
  floor.**
- **Whether a control that reaches 44 is LEGIBLE, or in the right place.** This
  measures reach and nothing else.

## F · AND ONE WARNING ABOUT WHEN TO RUN IT

**A run taken while you are editing `app/src` is worth nothing, and it does not
merely go quiet — it invents findings.** One run reported 42 controls on the
Spanish calendar at 392 whose centres all answered `main.app-main`, and 13
settings rows that "vanished between listing and opening". **Neither
reproduced**: re-run in isolation, that screen measures 54 controls and is
clean. Vite reloaded the page under the walk. The script's own source guard says
so at the end of every run — read that line before believing the rest.

## G · THE BOOKING FLOW — MEASURED FOR THE FIRST TIME, AND ONE CONTROL IS SHORT

**`sweep-booking-steps.mjs` calls the same probe now**, so the customer's side
is covered by the same instrument as everything else. 72 step readings, 893
controls, at 1920 / 1440 / 768 / 392.

**Everything passes except the vehicle-count chips on step 3.**

```
button.bk-chip.word "1" / "2" / "3" — 40px wide, 41-42px of reach, floor 44
      every width, in every state of the multi-vehicle step
```

**`app/src/book/booking.css`, the `.bk-chip.word` rule.** They are 40px square
number buttons in a row, so the fix is `.chip`'s pattern — but **sideways this
time, and the gap decides it.** `docs/VERIFIED.md` § 1 records a `.bk-chip.word`
pitch, and an `::after` that grows each chip past half the gap makes neighbours
steal each other's presses, which trades a small target for a wrong one. Measure
the pitch after, not before.

**`docs/VERIFIED.md` § 1 covers booking steps 1-5 for overlap and sideways
scroll and has never covered the floor.** This is the first reading of it.

## H · A GEAR ROW DISAPPEARS FROM ITS OWN INDEX

**Twice in one clean run, at two different widths and in two languages:**

```
"The website business — Every detailer, and …"     1440/en/gear
"El negocio del sitio web — Cada detailer, y …"    392/es/gear
```

The walk reads the gear index once, then opens each row by its own words. That
row was in the index when the walk started and was **not there when its turn
came** — after some earlier row had been opened and closed.

**This is reported as an observation, not a diagnosis.** It is intermittent, it
is not the Vite-reload artifact (that run's source guard was clean and lane B
was idle), and the same row measured **0 controls** on an earlier run before
vanishing entirely on later ones. Something about opening and leaving a settings
screen is changing what the gear index draws. Worth one look at whatever decides
that row's visibility.
