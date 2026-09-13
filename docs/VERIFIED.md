# VERIFIED — the checked-off ledger

**Read this BEFORE you measure anything.** Created 2026-09-13 at `130ae94`.

## THE RULE

**A row here is un-proven by a CHANGE, never by age.** A measurement taken three
weeks ago against code nothing has touched since is still true; a measurement
taken an hour ago against a file somebody has edited since is not.

**So before re-measuring anything in this file, run its row's own command:**

```bash
git diff --name-only <row commit>..HEAD -- <row paths>
```

**Empty output means DO NOT RE-MEASURE.** Cite the row and move on. Output means
the row is stale for exactly the surface those paths cover — re-measure that, not
the whole product.

**Adding a row** means recording four things: what was proven (in numbers, not
adjectives), when, at which commit, and which paths would invalidate it. A row
without paths is not a row, because nobody can ever retire it.

**A row is never deleted.** A row disproved by a later measurement is marked
disproved with the new figure beside it — the reversal is usually the
load-bearing part.

---

## 1 · PROVEN CLEAN — Andrew's own measurements, 2026-09-13, at `130ae94`

**What was proven, identically on all three rows:** zero overlapping tap-target
pairs and no sideways scroll, at **1440 / 1024 / 768 / 392 / 320**.

| surface | proven | at | invalidated by a change to |
|---|---|---|---|
| **Back office, all five tabs** | zero overlapping pairs, no sideways scroll at all five widths | 2026-09-13, `130ae94` | `app/src/admin/**`, `app/src/theme.css` |
| **Detailer dashboard, all five tabs** | same | 2026-09-13, `130ae94` | `app/src/screens/**`, `app/src/components/**`, `app/src/theme.css` |
| **Customer booking, steps 1–5** | same | 2026-09-13, `130ae94` | `app/src/book/**` |

**A NOTE ON THE PATHS, because getting them wrong retires a row that is still
good:** the dashboard row was handed over as `app/src/app/**`. **That directory
does not exist** — the five tabs live in `app/src/screens/` (`Today`, `Calendar`,
`Clients`, `Money`, `Business`) and draw most of their controls from
`app/src/components/`. Both are listed above. The shared stylesheet is
`app/src/theme.css`; `app/src/admin/admin.css` shares its TOKENS and no rule, so
a change to one does not invalidate the other's row.

```bash
# back office
git diff --name-only 130ae94..HEAD -- app/src/admin app/src/theme.css
# dashboard
git diff --name-only 130ae94..HEAD -- app/src/screens app/src/components app/src/theme.css
# booking
git diff --name-only 130ae94..HEAD -- app/src/book
```

## 1b · PROVEN TONIGHT — lane C, 2026-09-13, at `38ce516`

| what was proven | number | invalidated by a change to |
|---|---|---|
| **All 35 edge functions are running the repo's code**, including the 504 retry | `check-deployed.mjs`: *"all 35 functions are current"*, every one 05:37 UTC | **any** file under `supabase/functions/**` — a deploy is undone by the next edit, not by time |
| `available-slots` answers honestly: 503 + `retryable` on a read failure, 400 on a reversed range, never an empty success | `availability-honesty` 31/31, 0 skipped, baselined by 6 breaks | `supabase/functions/available-slots/**`, `_shared/tenant.ts`, `_shared/retryRead.ts` |
| The demo business has bookable days at the live endpoint | 19/31/30/31 day keys across four month ranges, 11–23 bookable, three rounds | the same paths, plus the demo seed |
| Every email's six brand colours derive through `brandFrom`; no rendered shell contains `undefined`; an empty fact row is dropped | `email-brand` 226 checks, baselined by 2 breaks | `_shared/email.ts`, `_shared/emailKit.ts`, `_shared/brandColor.js`, `app/src/lib/theme.js` |
| 29 emails render with no rot, every money column reaching its own total | `render-emails.mjs` reports 0 problems | `_shared/email*.ts`, `_shared/brandColor.js`, any template |
| The booking core and the 504 retry still hold | `booking-core` 210/210, `gateway-retry` 15/15 | `app/src/book/core.js`, `_shared/retryRead.ts` |
| Translation and the definer grants still hold after the shared-read change | `translations` 69/69, `definer-grants` 11/11, both 0 skipped | `supabase/migrations/**`, `_shared/translat*.ts` |
| The four credential-free checks | `composition` 95, `landing-pricing` 109, `route-contract` 33, `design-contrast` all pairs | `app/src/**`, `docs/design-directions/5-the-thread.html` |

**THE DEPLOY ROW IS THE ONE TO READ CAREFULLY**, because it is the one whose
invalidation rule is widest: `_shared/**` is imported by almost every function, so
a single edit there makes all 35 stale at once. That is not the checker being
blunt — it resolves imports transitively.

## 1c · PROVEN TONIGHT — lane C, 2026-09-13, the weather seam and the accepted email

| what was proven | number | invalidated by a change to |
|---|---|---|
| **The NWS refuses a request with no `User-Agent`** | `curl -H "User-Agent:" /points/33.7701,-118.1937` → **403**; with one → 200 | nothing in this repo — it is a fact about `api.weather.gov`, re-measure only if they change their policy |
| **The NWS redirects a point finer than 4 decimals** | `/points/33.770123,-118.193765` → **301** → `/points/33.7701,-118.1938` | same |
| The weather module's failure ladder: User-Agent on every call, 4-place rounding, `outside_coverage` ≠ `unavailable`, no `ok:true` with zero periods, a null chance of rain stays null, one file names the host, open-meteo.com called from nowhere | `weather` **49 passed, 0 failed, 1 skipped**, baselined by **6** deliberate breaks (6 red runs) | `supabase/functions/_shared/weather.ts`, `_shared/retryRead.ts` |
| The live NWS still sends the shape we map, and the deployed endpoint answers | `probe-forecast` **16 passed, 0 failed, 0 skipped** — Long Beach 14 periods, London `outside_coverage`, 999/999 `bad_point`, no session **404**, a member **200**, a bad point **400** | `supabase/functions/forecast/**`, `_shared/weather.ts` — and the NWS's own response shape, which nothing here controls |
| **All 36 edge functions are running the repo's code** (35 + the new `forecast`) | `check-deployed.mjs`: *"all 36 functions are current"*, deployed 05:59 UTC | **any** file under `supabase/functions/**` |
| *"You're booked in"* carries the price table, the words **Estimated total** and the estimate caveat, with the service lines under it | `render-emails.mjs` 29 emails, `customer-accepted.txt` shows the full ladder to **$345.00** | `_shared/emailTemplates.ts`, `respond-to-booking/index.ts` |
| The suites still hold after both changes | `spanish` **72/0**, `translations` **69/0/0**, `email-brand` **226**, `composition` **95/0**, `booking-core` **210/0**, `gateway-retry` **15/0**, `landing-pricing` **109/0**, `route-contract` **33/0**, `definer-grants` **11/0/0** | their own subjects |

**THE ONE ROW THAT IS NOT ABOUT US** is the NWS's response shape. Nothing in
this repo can make it stale and nothing in this repo will notice when it
changes — `scripts/probe-forecast.mjs` is the only instrument that can, and it
only runs when somebody runs it.

## 1d · PROVEN TONIGHT — lane C, 2026-09-13, at `926e002`

| what was proven | number | invalidated by a change to |
|---|---|---|
| **Zero em dashes in any user-facing string the edge layer emits**, both spellings, English and Spanish | `em-dash` 0 findings over 65 files, 1 sanctioned entry, baselined by 4 breaks | **any** file under `supabase/functions/**` |
| 29 emails render with no em dash anywhere in the output | `render-emails.mjs` 0 problems; a grep of `email-preview/*` returns nothing | `_shared/email*.ts`, `_shared/strings/es.ts`, `scripts/render-emails.mjs` |
| **The watchdog re-arms a claim it could not send, in BOTH directions** | `dead-mans-switch` 50/50, 0 failed; § 2i-iv proved against the live deployed function | `supabase/functions/watch-jobs/**`, `supabase/migrations/20260913010000_*.sql` |
| The reminder sweep's 18-hour outage on 12 Sept and its recovery at 01:53 on 13 Sept | read out of the project's own `function_logs` — `note_heartbeat` 204 at 08:00:54, then nothing until 01:53:52 | nothing; it is history, not a state |
| **The Geoapify key is in no file under `app/`**, and the attribution sentence exists exactly once in the repo | `geoapify` 18/18 credential-free, baselined by 3 breaks | `supabase/functions/_shared/geoapify.ts`, anything under `app/`, `docs/tenant-sites/` |
| The live `address-suggest` endpoint returns real streets with usable points, refuses a short query for free, and throttles | `geoapify` § 4, 6/6 when the per-IP limit has room | `supabase/functions/address-suggest/**`, `_shared/geoapify.ts`, `_shared/rateLimit.ts` |
| **Address autocomplete is too slow for typeahead** — provider leg 1.3–2.3s, tail past 6s on an ambiguous query | ten warm calls: 2117 1963 2103 3127 2541 2096 3076 3171 2498 2104 ms; baseline without the provider call 760–960ms | nothing in this repo — it is a property of Geoapify and of the hop. **Re-measure only if the provider or the region changes.** |
| All 37 edge functions are running the repo's code | `check-deployed.mjs`: *"all 37 functions are current"* | **any** file under `supabase/functions/**` |

**THE LATENCY ROW IS THE ONE TO READ BEFORE RE-MEASURING ANYTHING HERE.** It is
not a defect waiting to be fixed in this tree and it is not stale because time
has passed — it is the measurement Andrew asked for in order to make a decision,
and that decision is open. `docs/address-autocomplete.md` § THE LATENCY carries
it with the three options.

**AND ONE FIGURE THAT IS DELIBERATELY NOT A ROW:** `tests/platform-billing.test.mjs`
is **335 passed, 1 failed** and the failure is correct — the back office has no
price editor. See `FOUND.md` § EIGHT BACK-OFFICE ACTIONS HAVE NO DOOR. A row
here would read as a clean bill.

## 1e · PROVEN TONIGHT — lane C, 2026-09-13, at `92ef895` and after

| what was proven | number | invalidated by a change to |
|---|---|---|
| **The customer appointment reminder actually fires**, through the REAL deployed sweep, on a Spanish booking: 200, `customer_reminder_sent: 1`, and the booking comes back stamped | `customer-reminder` **33 passed, 0 failed, 0 skipped**, baselined by **5** deliberate breaks including one that was deployed | `supabase/functions/send-owner-reminders/**`, `supabase/migrations/20260913020000_*.sql`, `_shared/emailTemplates.ts` |
| A refused relay leaves the booking UNSTAMPED and reports `customer_reminder_failed` | proved by break 5, which deployed a `mustSend` that always throws: 4b, 4c and 4d all went red and the marker stayed null | the same paths |
| The due-ness query excludes a switched-off business and all three ways a customer is unreachable, and still returns a genuinely due booking | `customer-reminder` § 1, 17 checks against the live RPC | `supabase/migrations/**`, the two `get_bookings_due_for_*reminder` functions |
| **`customer_reminder_sent_at` had NEVER been non-null on any booking** | 0 of 56, read from the live database at 06:55 UTC | nothing — it is history. The count is what made the item real |
| **Tenant mail stops at `cap - reserve` and platform mail reaches the full cap** | `email-budget` **22 passed, 0 failed, 0 skipped**, baselined by **3** deliberate breaks | `supabase/migrations/20260913030000_*.sql`, `supabase/functions/send-email/index.ts` |
| The day's real numbers, against a cap of 100 | 09-07 **240** attempts, 09-08 **117**, 09-13 **94 by 06:55** | nothing — history, and the reason the reserve exists |
| **All 37 edge functions are running the repo's code** | `check-deployed.mjs`: *"all 37 functions are current"* | **any** file under `supabase/functions/**` |
| Nothing else broke | `composition` 95/0, `route-contract` 33/0, `landing-pricing` 109/0, `design-contrast` all pairs, `em-dash` 0 findings over 67 files, `booking-core` 237/0, `dead-mans-switch` 50/0, `maintenance` 38/0, `ics-and-notifications` 32/0, `request-mode` 51/0, `campaign` 16/0, `spanish` 72/0, `translations` 69/0/0 | their own subjects |

**SEVEN FUNCTIONS WERE FOUND RUNNING PRE-GEOAPIFY CODE** and it was a clean
pattern rather than an accident: **every importer of `_shared/rateLimit.ts`
except `address-suggest` itself.** That file changed when the Geoapify limits
were added and only the new function was redeployed. `create-booking`,
`pay-booking`, `plan-link`, `platform-billing`, `stripe-webhook` and
`unsubscribe` were all stale. **The lesson is the one the deploy row in § 1b
already states and it earned itself within a day: a `_shared` edit makes every
importer stale at once, and `check-deployed.mjs` is the only thing that says so.**

**AND ONE FIGURE THAT IS DELIBERATELY NOT A ROW:** `tests/platform-admin.test.mjs`
is **111 passed, 49 failed**, measured with lane C's changes in the tree AND
with them stashed — identical, so it is not ours. Every failing check reads
`app/src/admin/**`. See `FOUND.md`. A row here would read as a clean bill.

## 2 · LOOKS BROKEN BUT PASSES — NEVER RE-REPORT ANY OF THESE FIVE

**Andrew reported all five as faults and withdrew each one after measuring
properly.** This section exists so the next session does not pay to make the same
five mistakes. Every one of them is a `getBoundingClientRect` reading arguing with
a real hit area, which is trap (n): **a rect cannot measure a target.**

| what it looks like | what it actually is |
|---|---|
| **`.btn.sm` is 38px** — under the 44 floor | its `::after` carries the hit area to **44.4**. Passes. |
| **`.btn.sm.icon` is 38×44** | **`PRODUCT.md`'s own recorded exception.** Andrew's to reopen, nobody else's. |
| **Calendar day cells are `<div>`s** — not buttons | they carry `role="button"` and `tabindex="0"` and measure **46.5**. Passes. |
| **Booking checkboxes are 22px** | 22px MARK inside a **44px** target, with **67px** labels. The painted thing is not the target. |
| **The `Cerrar` (Close) button is 36px** | its `::after` gives **46**. Passes. |

**The general form, and it is why this section is worth more than the five rows
in it:** a measurement that says a control is too small is a measurement of the
PAINT. Probe with `elementFromPoint` at centre and ±4, ±10, ±15 before writing
anything down.

## 3 · CLOSED — lane B fixed all three, 2026-09-13 at `7aacb02`

**These were the three open under-44 targets. They are fixed and re-measured, so
this section is now a record rather than a queue.** Kept, not deleted, because a
row is never deleted and because the SHAPE of the fix is the reusable part.

| where | what it was | what it is now | fixed at |
|---|---|---|---|
| Clients tab | 3 sort chips, **36px** | 36 painted / **45 reachable** | `7aacb02` |
| Money tab | 5 range chips, **36px** | 36 painted / **45 reachable** (47.2 / 56 at 320, where the labels wrap) | `7aacb02` |
| Money tab | 2 payment rows, **43.6px** | **46 / 47** | `7aacb02` |

**IT WAS ONE RULE AND ONE MISSING MINIMUM, NOT EIGHT CALL SITES.**
`.segmented button` carried `min-height: 36px`, written when the floor was 32, so
EVERY segmented control in the product was 8px short and not only the two tabs
that got measured. The paint stays 36 — it sits deliberately under the 38px and
42px buttons beside it — and takes `.chip`'s `::after` pattern, vertical inset
only, because segments sit shoulder to shoulder and a sideways inset would have
each one stealing its neighbour's presses. Money's payment rows were a bare
`<div role="button">` with no class and no height; the rule is
`.card > [role="button"] { min-height: var(--tap) }`, keyed on the ATTRIBUTE, so
a fourth call site written the same way is covered the day it is written.

**Proven at 392 / 320 / 1440:** zero overlapping target pairs, no sideways
scroll, nothing under 44. The probe was baselined in the same run on an injected
20px box (read 20), a 60px box (read 60) and a 20px box with
`::after { inset: -12px 0 }` (rect 20, reach 44).

Invalidated by a change to: `app/src/theme.css`, `app/src/screens/Clients.jsx`,
`app/src/screens/Money.jsx`, `app/src/components/AdvancedMoney.jsx`.

```bash
git diff --name-only 7aacb02..HEAD -- app/src/theme.css app/src/screens/Clients.jsx app/src/screens/Money.jsx app/src/components/AdvancedMoney.jsx
```

## 3b · PROVEN CLEAN — the rebuilt editing screens, lane B

**Andrew's campaign: pick the worst detailer editing screen by COUNTING plain
text boxes against structured controls, not by taste, and rebuild it.** Each row
is a screen that has been through that and been re-measured after.

| screen | was | now | proven | at |
|---|---|---|---|---|
| **Business info** (`more/BusinessInfo.jsx`) | 19 text inputs, 0 structured controls — the only dashboard screen with none | four `Group`s, credentials as a `.menu-row` list you open, two picture tiles, year 6ch / phone 16ch | 36 controls at 392 and at 320, 51 at 1440, none under 44, no sideways scroll, console clean, same 36/0 in Spanish | 2026-09-13, `78ec4af` |
| **Website questionnaire** (`screens/SiteIntake.jsx`) | — | draws the site while you answer it | — | 2026-09-13, `b70836c` |
| **Promo codes & sale** (`more/Promos.jsx`) | the sale half used `Group`/`Switch`/`Setting`/`DurationChoice`; the CODES half was four naked boxes, a raw `<input type="checkbox">` and `Usage limit (blank = unlimited)` | the unit IS the control (`DurationChoice` for %, `MoneyField` for $), limits behind a `Folded` row that states them, the code list a `.menu-row` list | 14–16 controls at 392, 14–16 at 320, 13–15 at 1440 · **0 under 44** · 0 overlapping pairs · no sideways scroll · fold shut AND open · **the same in Spanish** | 2026-09-13 |

Invalidated by a change to that screen's own file, or to `app/src/theme.css`,
`app/src/components/controls.jsx`.

**AND FOUR SHARED RULES IN `theme.css` MOVED WITH IT, each one covering every
call site rather than the screen that happened to be measured** — the shape the
`.segmented button` fix at `7aacb02` established:

| rule | was | now | what it covers |
|---|---|---|---|
| `.choice` | 38px painted, **38 reachable** | `margin-block: 1px` + `::after { inset: -4px 0 }` → **46**, pitch 46, tiles exactly | every `DurationChoice` ladder in the product |
| `.credlist` | `gap: 6px` | `gap: 8px` | promo list and Business info's credentials |
| `.row-item .btn.sm.icon` | **38 wide**, 45 tall | `width: var(--tap)` | Booking rules, Maintenance, Reviews, FAQ |
| `.stepper button` | 42x42 | `var(--tap)` — it cannot take an `::after`, `.stepper` is `overflow: hidden` | every Stepper |
| `.warn-box/.error-box .actions button` | `min-height: 38px`, written against the OLD floor | `var(--tap)` | the alert that says the booking page is offline |
| `.settings-head > .btn.icon` | **41.9px at 320 in Spanish** — `width` is a flex BASIS, not a floor | `flex-shrink: 0` | the Back control on every settings screen |

**Booking rules was measured before and after and it is the proof:** 8 controls
under 44 at 392 before, **0 after**, with nothing edited in that screen's own
file. Business info and Services & add-ons re-measured clean at all three widths
after the change, so none of it regressed the screens already signed off.

**THE SPANISH ONE IS THE ONE TO REMEMBER:** the back control read 44 in English
at every width and 41.9 in Spanish at 320, because a longer title squeezed a flex
row. **An English-only tap-target run cannot see it.**

## 3d · PROVEN CLEAN — the vehicle type-ahead, lane B, 2026-09-13 at `da4f8d1`

**Step 3's "What are you bringing?" was a bare text box — measured live by
Andrew: no list, no autocomplete, nothing on "Outback", "toyot" or "f150".** It
offers real cars now, from a 1,103-model index built out of NHTSA vPIC and
shipped in the bundle.

| what was proven | number |
|---|---|
| The index is real cars, not vPIC's raw dump | **45 makes, 1,103 models**, 10.6 KB raw / **4.6 KB gzipped**. Honda is **22** entries; unfiltered vPIC returns **362** |
| The page never waits on another server | the index is in `app/dist/assets/index-*.js`; **zero references to vpic or nhtsa** anywhere under `app/src` or `app/dist` |
| Every one of Andrew's named cases answers | `Outback`→Subaru Outback · `toyot`→Toyota · `f150`/`F-150`/`f 150`→Ford F-150 · `crv`→Honda CR-V · `Escallade`→Cadillac Escalade · `Xterrra`→Nissan Xterra · `civic 2019`→2019 Honda Civic · `runner`→Toyota 4Runner |
| An unknown car is kept exactly and blocks nothing | `my green truck`, `mi camioneta verde`, `Zaporozhets 965`, `the white one` → no list, field unchanged, **Continue enabled** |
| It cannot reach the price tier | choosing "Subaru Outback" left the size on **Small**, untouched. vPIC's own vehicle type is thrown away by the builder and never ships |
| Tap targets and pitch | **44px** options at 320 / 392 / 1440, tops 527/571/615 at 320 — **pitch exactly 44, zero overlapping pairs**. `elementFromPoint` at centre and ±4, ±10, ±15 returns the option itself at every width |
| No sideways scroll | **0** at 320, 392, 1440 |
| Spanish | label, placeholder and `aria-label` all Spanish from existing keys; matching identical; **car names stay as manufactured**, which is § 6's rule about what a thing is CALLED |
| The step costs no height | 3/7 reads **fits 117px spare at 392**, **111px at 1440**, and **over 15px at 320 — the identical figure with the change reverted to HEAD**, so the 320 overflow is pre-existing and not this work |
| The suites | `booking-core` **237/0** (was 210 — section 17 is 27 new checks, **baselined by six deliberate breaks**, every one red), `composition` 95/0, `landing-pricing` 109/0, `route-contract` 33/0, `spanish` 72/0, `design-contrast` all pairs |

Invalidated by a change to: `app/src/book/core.js`, `app/src/book/VehicleField.jsx`,
`app/src/book/vehicles.json`, `app/src/book/steps/StepVehicle.jsx`,
`app/src/book/booking.css`.

```bash
git diff --name-only da4f8d1..HEAD -- app/src/book/core.js app/src/book/VehicleField.jsx app/src/book/vehicles.json app/src/book/steps/StepVehicle.jsx app/src/book/booking.css
```

### THE TWO THINGS FOUND BY LOOKING, WHICH NOTHING IN THIS REPO WOULD HAVE CAUGHT

**(1) A STACKING CONTEXT NOBODY DECLARED. The list drew UNDER the block below
it, and the customer's thumb would have hit a heading instead of their car.**
Every `.bk-step > *` carries the arrival animation `bk-rise`, which animates a
transform — and `both` fill leaves `transform: matrix(1, 0, 0, 1, 0, 0)` on the
element for ever after. **An identity matrix, painting nothing, and still a
sealed stacking context**, so the list's own `z-index: 10` could only rank it
against its siblings inside that box and lost to the next block on document
order. Caught by `elementFromPoint` at the middle of the list returning
`SPAN.` — the "How dirty is the inside?" eyebrow. The fix is
`.bk-field:has(.bk-typeahead-list) { position: relative; z-index: 5 }`.
**The transferable part: a fill-mode `both` arrival animation turns every
element it touches into a permanent stacking context, so ANY overlay placed
inside one is already losing.** That is true of the whole booking page and of
every dashboard screen with `arrive` on it.

**(2) A NEW COSTUME FOR TRAP (d), AND IT CALLED CORRECT WORK BROKEN.** In
`?lite=1` the list measured `opacity: 0` and `transform: translateY(-5px)` — the
animation's own start frame — which reads exactly like a popup that never
appears for a reduced-motion visitor. **It was the instrument.** A *hidden
browser pane* never produces frames, `requestAnimationFrame` never fires, and a
CSS animation therefore sits at time zero for ever. **The signature is
`playState: "running"` with `currentTime: 0`**, and `document.hidden` is
`false` the whole time, so the documented "background tab" test does not catch
it. A screenshot forces a paint and settled it: the list is fully visible.
**So: before believing any opacity or animation reading, assert
`getAnimations()[0].currentTime > 0` — or take the screenshot and look.**


## 3c · FOUND AND NOT FIXED — lane B, 2026-09-13

**Measured with the baselined probe while checking that the shared-rule changes
above had not broken anything else. Real, and deliberately left** — they are on
screens this session did not open, and chasing them would have made a one-screen
change into a five-screen one.

| where | what | measured |
|---|---|---|
| Getting paid → the Zelle handle | an `<input>` inside `label.field` reaches **141x43** of a 693x46 box at 1440 | 2026-09-13 |
| Monthly plans | **the probe found 1 control at 320 and 0 at 1440** and still printed "0 under 44". That screen has NOT been measured — do not read it as clean | 2026-09-13 |

Invalidated by: `app/src/screens/more/Payments.jsx`, `app/src/screens/more/Plans.jsx`,
`app/src/theme.css`.

**The second row is the more useful one, and it is about the instrument rather
than the product:** a green line over zero subjects reads exactly like a pass.
Count subjects every run.

## 4 · FROZEN — recorded, deliberately not fixed

**These are real and they are not being repaired.** Recording them is the
decision, not a step towards one. Do not open them without Andrew saying so, and
do not re-report them as new findings.

| where | what | measured |
|---|---|---|
| Back office → Detailers | 7 filter chips, **no `::after`** | **29.4px**, rows **35.4px** apart |
| Back office | Sign out | **17.4px** |
| Back office | three buttons | **34.1px** |

Invalidated by: `app/src/admin/**`, `app/src/theme.css`.

**Why frozen and the dashboard is not:** the back office has exactly one user and
he is at a desk with a mouse. The detailer dashboard has detailers on phones.

## 5 · CHECKED AND NOT A PROBLEM — five things that look like defects and are not

Each of these was investigated to a conclusion. **Do not re-investigate.**

- **`app/public/map.html` owes no attribution.** It is the **page-review index**,
  not a map. The name is the whole reason it reads as one.
- **Geoapify is not wired in anywhere yet**, so nothing in this product is
  missing its credit today. The attribution requirement is real and lands the day
  that work starts — `ROADMAP.md` § 6, already settled, build exactly that.
- **The Detailers tab's 15 unfinished setups are test rows.** Growth counts **1
  real detailer**, which is the honest figure. A session that reads "15 businesses
  stalled in setup" as a product problem is reading fixtures.
- **`send-owner-reminders` is running inside its threshold.** What is broken is
  different and smaller: **the watchdog's mails stopped, and it never mailed to
  say it had recovered.** The sweep is fine; the thing that tells you the sweep is
  fine is not.
- **Booking links in delivered TEST emails 404 because the test suite deletes its
  own rows.** The link was correct when it was sent. This is not a URL-builder
  bug and not a `PLATFORM_URL` bug.

---

## HOW THIS FILE EARNS ITS KEEP

Andrew paid for every number above once. **The cost of this file is one `git
diff --name-only`; the cost of not having it is a full re-measure of five widths
across fifteen screens, plus the five withdrawn findings in § 2 being reported a
second time.** That is the arithmetic — see `docs/ECONOMY.md`.
