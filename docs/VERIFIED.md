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
| **Tenant mail stops at `cap - reserve` and platform mail reaches the full cap** | `email-budget` **26 passed, 0 failed, 0 skipped**, baselined by **4** deliberate breaks | `supabase/migrations/20260913030000_*.sql`, `supabase/functions/send-email/index.ts` |
| The day's real numbers, against a cap of 100 | 09-07 **240** attempts, 09-08 **117**, 09-13 **94 by 06:55 and 99 by 07:45** | nothing — history, and the reason the reserve exists |
| **The gate refuses live, through the DEPLOYED relay, on a real domain** | tenant → **429 `daily_cap`**, `claimed` 99→99, `failed` 12→12, `refused` 0→1, `refused_platform` unchanged. Platform (cap dropped to 99 for one call so nothing had to be sent) → 429 with a **different sentence**, `refused_platform` 0→1 | `supabase/functions/send-email/index.ts`, `supabase/migrations/20260913030000_*.sql`, `20260913040000_*.sql` |
| **The suites that send REAL mail still pass with the day's budget spent** | `multi-vehicle` **63/0** and `staff-roles` **64/0**, run at `claimed` 99 of 100 — a refused send does not fail a booking, which is `sendTenantEmail` being best-effort everywhere except the sweep | `supabase/functions/send-email/index.ts`, those suites |
| A budget refusal is never counted as a provider failure | `email-budget` § 1f, 4 checks, baselined by a break that records no refusal at all | `20260913040000_*.sql` |
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


## 3e · THE STACKING RULE, AND THE SWEEP THAT PROVED IT — lane B, 2026-09-13

### THE RULE, WHICH IS WORTH MORE THAN THE THREE FILES IT CHANGED

**AN ARRIVAL ANIMATION WITH A FORWARDS FILL TURNS EVERY ELEMENT IT TOUCHES INTO
A PERMANENT STACKING CONTEXT, SO ANY OVERLAY PLACED INSIDE ONE IS ALREADY
LOSING.**

`animation: … both` (or `forwards`) leaves the end frame's computed value on the
element for ever. When the keyframes animate a transform, that value is
`matrix(1, 0, 0, 1, 0, 0)` — **an identity matrix, painting nothing, and still a
sealed box.** An overlay inside it can only rank against its own siblings;
against the next block down the page it loses on document order, every time.

**THE FIX IS ONE WORD AT THE SHARED RULE, NEVER A `z-index` AT THE CALL SITE.**
An entrance keyframe set with a `from` and no `to` ends at the element's base
style, so `backwards` renders identically and leaves no transform behind. It
also keeps the `.lite` behaviour intact, which is the reason `both` was there:
at the 0.01ms duration reduced motion forces, the element still shows its end
state, because its end state IS the base style.

- **An ENTRANCE takes `backwards`.** Always.
- **An EXIT keeps `forwards` / `both`.** Without it the thing being removed
  snaps back to visible for the last frames before React unmounts it.
- **A `position: fixed` overlay inside a transformed ancestor is worse than a
  paint-order bug** — it stops being positioned against the viewport at all.

### WHAT WAS CHANGED

| file | rule | was | now |
|---|---|---|---|
| `app/src/book/booking.css` | `.bk-step > *, .bk-step-head > *` | `bk-rise … both` | `bk-rise … backwards` |
| `app/src/book/booking.css` | the `:has(.bk-typeahead-list)` z-index hatch added at `da4f8d1` | a call-site patch | **deleted** — the cause is gone, so it was dead weight |
| `app/src/admin/admin.css` | `.pa-in > *`, `.pa-col`, `.pa-swap > *` | `… both` | `… backwards` |
| `app/src/admin/admin.css` | `.pa-col.pa-leaving`, `.pa-bar-rise` | `both` | **unchanged** — an exit needs its fill, and the bar holds no overlay |

**In the bundle, not only the dev server:** `app/dist/assets/*.css` carries
`bk-rise … backwards`, `pa-arrive … backwards`, `pa-col-in … backwards`,
`pa-swap-in … backwards`, and **zero** copies of the deleted `:has()` rule.

### THE SWEEP, WITH ITS SUBJECT COUNTS

Every element whose COMPUTED style seals a stacking context (transform,
translate, rotate, scale, filter, backdrop-filter, perspective, opacity < 1,
isolation, mix-blend-mode, contain, will-change, content-visibility, a z-index
on a positioned element, fixed/sticky), then every visible **pressable** overlay
living inside one, hit-tested with `elementFromPoint` on a **5-column grid**
rather than by rectangle.

| surface | subjects | hit probes | findings |
|---|---|---|---|
| Landing page, 5 scroll stops @392 | 62 visible overlays, **2 pressable, 0 inside a seal** | — | 0 |
| Dashboard, 5 tabs @392, 5 scroll stops each | 25 | 375 | 0 |
| **Dashboard, 15 settings screens @392**, each at 3 scroll positions, folds shut AND open | **164** | **2,460** | 0 |
| Dashboard, 5 tabs @1440, record opened where one exists | 40 | 1,960 | 0 |
| Booking, steps 1–7 @392, type-ahead opened | 14 | 320 | 0 |
| Booking, steps 1–5 @1440, type-ahead opened | 13 | 270 | 0 |
| Booking, address list open @392 / @320 / @1440 / `?lite=1` | 3 per run | 65–80 per run | 0 |

**THE BACK OFFICE WAS NOT SWEPT IN A BROWSER AND THAT IS A GAP, NOT A PASS.**
`/admin` needs `demo@demo.com`, whose password is deliberately in no file, and
the seeded admin accounts are deleted. Its stylesheet was fixed at the same
shared rule and the bundle confirms the change; **nobody has hit-tested those
screens.**

### THE INSTRUMENT WAS BROKEN ON PURPOSE FOUR TIMES BEFORE IT WAS BELIEVED

**And it was genuinely blind twice, which is the whole argument for doing this.**

1. **It reported the synthetic trap as clean** — the fixture was appended below
   the fold, every probe point fell outside the viewport and was skipped, and a
   subject with **zero** probes read exactly like a subject that passed. Fixed
   by counting skipped probes and never letting an all-skipped subject pass.
2. **It missed the REAL recorded bug** with the `:has()` patch disabled, because
   centre-and-four-corners walks straight past an overlap covering only the
   MIDDLE BAND of an overlay — which is the shape of this bug, since the block
   below starts part-way down the list. Fixed by sampling a grid. It then
   reported **25 of 60 points stolen** by the block below.
3. It reported 60 findings on the landing page that were grain layers, corner
   marks and glows. A decorative overlay is *meant* to sit behind the page;
   subjects are now pressable overlays only.
4. It reported an `opacity: 0` checkbox inside a `<label>` as lost behind its
   own switch knob. That is a styled control, not a trapped overlay.

**AND ONE MORE COSTUME FOR THE FROZEN-ANIMATION TRAP, at 1440 in `?lite=1`:**
the probe reported the address list lost, with `.bk-field` reading
`transform: matrix(1,0,0,1,0,20)` and `opacity: 0` — the `bk-rise` START frame.
A hidden browser pane produces no frames, so `currentTime` sits at 0 for ever.
**Taking a screenshot forces a paint**; re-measured immediately after, the field
read `transform: none`, the list `opacity: 1`, and the findings were zero.
**So: force a paint before believing any run of this probe.**

Invalidated by a change to: `app/src/book/booking.css`, `app/src/admin/admin.css`,
`app/src/theme.css`, `app/src/landing/landing.css`.

## 3f · THE ADDRESS FIND BUTTON — lane B, 2026-09-13

**Built to `docs/address-autocomplete.md` § THE FIND BUTTON. It is a press,
never a type-ahead, and the decision behind that is closed.**

| what was proven | number |
|---|---|
| Under the four-character floor the button is not pressable and **the server is never asked** | typed `12` → Find disabled, **0** requests, Continue still enabled |
| A real street comes back and fills the box | `350 Fifth Ave New York` → **4** rows; picking one put *"350 5th Avenue, New York, NY 10001, United States of America"* in the field |
| An address nobody has heard of changes nothing | `Zzqx Nowhere Lane 99999` → *"No matches. We will use the address as you typed it."*, box unchanged, no list, **Continue enabled** |
| Pressing Find again on an unchanged box spends no second credit | calls before 1, calls after **1** |
| A customer who never presses it at all is not stopped | `my place behind the blue gate` → Continue enabled |
| **429 is the only failure that earns a sentence** | *"Too many lookups right now. Try again in a moment, or just carry on."*, text kept, Continue enabled |
| `not_configured`, `unavailable` and a dead network say **nothing** | note `null` in all three, text kept, Continue enabled |
| **A slow answer for a string the customer has already edited is dropped** | stub 2.5s + edit mid-flight → list not shown, the stale label appears nowhere in the document |
| Tap targets and pitch | options **44px**, tops 567/611/655/699 — **pitch exactly 44, zero overlapping pairs**, `elementFromPoint` at centre and ±4, ±10, ±15 returns the option at every width. Find button **48px** |
| No sideways scroll | **0** at 320, 392, 1440 |
| Spanish, at 320 | label, placeholder, `aria-label`, *Buscar*, *Buscando…*, *Direcciones que encontramos* and both fallback sentences all Spanish. **Buscar measures 79x48** — the longer word does not squeeze the control, because `.bk-find` carries `flex-shrink: 0` |
| `?lite=1` at 1440 | 4 rows, 44px each, credit rendered, 0 findings after a forced paint |
| Console | clean on a fresh load, apart from the two pre-existing React Router v7 future-flag warnings |
| The suites | `geoapify` **22/0**, `booking-core` **237/0**, `spanish` **72/0**, `composition` **95/0**, `landing-pricing` **109/0**, `route-contract` **33/0**, `design-contrast` all pairs |

### THE ONE THAT WAS ONLY FOUND BY LOOKING, AND IT FAILED SILENTLY

**`website` IS THE HONEYPOT, NOT A TENANT FIELD.** The contract reads
`POST { q, business_id?, website? }`, and the first build sent the tenant slug in
`website`. `_shared/rateLimit.ts` § looksAutomated treats any non-empty `website`
as a bot and the endpoint answers **`ok: true` with an EMPTY LIST**, deliberately
indistinguishable from a real *"no such street"* so a script cannot tune against
it. So every lookup came back with nothing and the screen said *"No matches"*
over a street that exists. **Nothing errored, nothing logged, and no check in
this repo could have caught it.** The call now sends `{ q }` and nothing else.

### WHAT IS OWED, AND IT IS LANE C'S

**There is no runnable regression check for any of the table above.** The rules
live in `app/src/book/core.js` as `ADDRESS_MIN`, `canLookUpAddress`,
`readAddressAnswer` and `addressFault`, so they belong in
`tests/booking-core.test.mjs` as a § 18 — **the four-character floor, an empty
`suggestions` array being a real answer rather than a failure, 429 being the only
status that produces a sentence, and `website` never appearing in the request
body.** Everything in the table was measured by hand and is un-guarded until
then.

### THE ATTRIBUTION, AND THE DEVIATION ANDREW MAY WANT TO REVERSE

The credit renders from the server's own `attribution` payload, so the sentence
exists exactly once in the repo and `geoapify` § 3c still passes. **Nothing
under `app/` names the provider or its host** — § 2b of that suite forbids it,
and the component finds each link's word inside the server's sentence by
comparing letters rather than by naming anything.

**IT SITS UNDER THE ADDRESS FIELD, NOT IN A PAGE FOOTER.** ROADMAP § 6 says
footer; **the booking page has no footer**, and building one to hold a credit
line is the tail wagging the dog. It shows once a lookup has succeeded, and it is
one component in one place, removable in a single edit. **Andrew's call if he
wants it elsewhere.**

Invalidated by a change to: `app/src/book/AddressField.jsx`,
`app/src/book/core.js`, `app/src/book/steps/StepLocation.jsx`,
`app/src/book/booking.css`, `app/src/lib/api.js`, `app/src/lib/strings/es.js`,
`supabase/functions/_shared/geoapify.ts`, `supabase/functions/address-suggest/**`.

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

## 3g · THE DETAILER'S OWN WORDS, IN SPANISH — lane B, 2026-09-13

**What was proven:** `tx()` is wired through every customer surface and the
tenant catalogue actually reaches the page. Measured on the demo tenant
(`demo-detail`, 81 of 81 strings already translated by DeepL) against a
committed tree with nothing else running.

| | |
|---|---|
| proven | the whole seven-step flow renders the detailer's own prose in Spanish; the business name is byte-identical in both languages |
| at | 2026-09-13, this commit |
| invalidated by a change to | `app/src/book/**`, `supabase/functions/_shared/translatable.ts`, `supabase/migrations/*translations*` |

### THE NUMBERS

- **Step 1** — six service names and two group headings in Spanish
  (`Lavado rápido`, `Recubrimiento cerámico`, `EXTERIOR · elige uno`), the
  feature bullets too.
- **Step 2** — three add-on names (`Eliminación de pelos de mascotas`).
- **Step 4** — the service-area sentence (`Long Beach y South Bay`) and **both
  travel areas**: `Long Beach` unchanged, **`Más allá de las 15 millas`**, which
  is Andrew's own question of 2026-09-13 answered on the page.
- **Step 7** — **`Traslado · Más allá de las 15 millas`**, which is the
  two-functions-in-one-string rule working: *Travel* is ours and took `t()`, the
  area is the detailer's and took `tx()`. Plus the service, the add-on and the
  vehicle tier (`Pequeño`).
- **The masthead** — tagline translated, **name not**: `Coastline Auto
  Detailing` in both.

### THE CHECK § 7 OF THE HANDOVER ASKED FOR, RUN BY HAND

Two REAL document loads (iframes, a full mount each — **not** `pushState`, which
is trap (c)): `?lang=en` and `?lang=es`. The business name and the tab title are
**byte-identical** across the pair; all six service names and the tagline
**differ**. So the reader distinguishes, and the name survives.

**THE FILE FOR IT IS LANE C'S AND IS NOT WRITTEN.** `tests/` is not lane B's to
write in. The assertion C needs is exactly the paragraph above.

### WHAT THE INSTRUMENTS WERE BROKEN ON FIRST

- **The overflow scan** was run with a deliberately injected 2000px box: it
  reported `sideways: true` and 11 offending elements, and `0` with the box
  removed. It counts and it is not blind.
- **The language comparison** was proven to distinguish by separating six
  service names and a tagline across the two loads. **It was NOT baselined
  against a deliberately translated business name**, because the database
  refuses to store one — `tests/translations.test.mjs` § 3b and § 3i are that
  half and they are already green.

### WIDTHS, LANGUAGES AND PATHS

**320 / 392 / 768 / 1024 / 1440**, Spanish, on step 1, step 4 and step 7 (the
longest strings in the flow): `scrollWidth === clientWidth` at every width, zero
elements past the right edge. Console clean on a fresh tab — the only entries
are the two pre-existing React Router future-flag warnings. `?lite=1` renders
the same Spanish with no overflow and its four animations collapsed to 10ms,
which is the intended degradation.

### ENGLISH COSTS NOTHING, MEASURED RATHER THAN ASSUMED

Counted off the page's own resource timeline: **`?lang=en` makes ZERO calls to
`get_business_translations`**; `?lang=es` makes the same number as the profile
call (two each in dev — React StrictMode double-mounts, which is why the profile
count is two as well; one each in production).

### ONE THING SEEN ONCE AND NOT REPRODUCED — recorded, not diagnosed

On one brand-new tab's first load the page stayed English with a single
recorded RPC entry, while every later load and every reload came back Spanish
with two. **A failed fetch is silently English for the rest of the visit**,
which is the SPECIFIED fallback (handover § 6) and is safe — but "English
because one request blipped" and "English because nothing is translated" look
identical on screen. **No retry was added**: the cause is unproven and an
unbaselined guard is worse than none. Trap (j) — the reproduction is kept and
the cause is left open.

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
- ~~**Geoapify is not wired in anywhere yet**~~ **NO LONGER TRUE — the booking
  page's address field calls it as of 2026-09-13 and it carries the credit. See
  § 3f.** The rest of this entry is kept because its reasoning is what § 3f
  built on: the attribution requirement is real and lands the day
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
