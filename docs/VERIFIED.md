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


## 1f - PROVEN TONIGHT - lane C, 2026-09-13, at 5351d00

| what was proven | number | invalidated by a change to |
|---|---|---|
| **The evening-before reminder threshold is noon**, in the schema default and on every row that held the old one | column_default 12:00:00; **15 of 15 rows** read 12:00:00, read back from the live database | supabase/migrations/**, _shared/tenant.ts |
| **A fixture recipient on a reserved domain costs nothing, and a deliverable one is charged** - proved live through the DEPLOYED relay | sink-probe@fixture.test -> success/undeliverable_domain, claimed 99->99, refused 5->5. real-probe@detailplatform.com -> 429 daily_cap, refused 5->6 | supabase/functions/send-email/index.ts |
| **No suite or script can spend real mail without declaring it** | mail-sink **13 passed, 0 failed**, over 101 files and 161 address occurrences - 134 free, 27 declared, 0 undeclared. Baselined by **5** deliberate breaks, every one red | tests/**, scripts/**, supabase/functions/send-email/index.ts |
| **Auth accounts are not spenders**, which looks like they would be | mailer_autoconfirm = true and smtp_host = null on kguqylyzgyzfktkfnhjb, read from the Management API | that project's auth config - nothing in this repo |
| The suites that were converted still pass | multi-vehicle **63/0**, staff-roles **64/0**, promo-checkout **102/0**, booking-core **237/0**, booking-engine **104/0**, two-logins **56/0**, email-budget **26/0/0** | their own subjects |
| **dead-mans-switch counts what the gate counts** | 48/2 before the fix and **50/0** after, same day, same tree. It now prints *the provider leg NOT MEASURED - 100 of 100 claimed today (88 of them sent)* | tests/dead-mans-switch.test.mjs, the two email-budget migrations |
| **All 37 edge functions are running the repo shared tenant default** - the _shared/tenant.ts change made 30 of them stale at once and all 30 were redeployed | check-deployed.mjs: *all 37 functions are current* | **any** file under supabase/functions/** |
| The platform-admin suite moved off a broken instrument | **111/49 -> 118/43**. strip() had been deleting 43-75% of every non-SQL file the suite reads. Four re-pointed checks baselined against four mutated copies of the screen in memory | tests/platform-admin.test.mjs, app/src/admin/** |

**THE FIGURE THAT IS STILL DELIBERATELY NOT A CLEAN BILL:** platform-admin is
**43 failed**, and docs/platform-admin-triage-2026-09-13.md says which are stale
spellings for lane C and which name a capability the rebuild may have dropped,
which are lane B's.

---

---

## 1g · PROVEN TONIGHT — lane C, 2026-09-13, at `a3d8ed0`

**THE WHOLE SECTION IS ABOUT ONE SUITE'S HONESTY, NOT ABOUT THE PRODUCT.** Read
`docs/platform-admin-triage-2026-09-13.md` § THE SECOND TRIAGE PASS first — it
carries the reasoning; this is the ledger.

| what was proven | number | invalidated by a change to |
|---|---|---|
| **The nine group-A checks are re-pointed, and every one was the check** | **118/43 → 130/30.** Twelve check ids across nine capabilities. Baselined against **26 deliberate mutations of in-memory copies** of `AdminPage.jsx`, `admin.css`, `main.jsx` and `adminInsight.js`; every assertion green on the real file and red on exactly the mutation it guards | `tests/platform-admin.test.mjs`, `app/src/admin/**`, `app/src/main.jsx`, `app/src/lib/adminInsight.js` |
| **EIGHTEEN of the 118 green lines were green against nothing at all** | every `read()` replaced by `() => ""`: **20 green**, minus `no chart` (failing anyway) and `11h-v` (behavioural, reads no source) = **18 hollow**. After the fix: **1**, and it is `11h-v` | `tests/platform-admin.test.mjs` |
| **Every anchored negative still catches its violation** | 14 violations injected one at a time into in-memory copies — a `refunds.create`, an `app_metadata` read, a `supabase.from` on the screen, a `create policy` on `platform_admins`, a `250ms` duration, a `setTimeout(…, 180)`, a `height: 100%`, a `fetch(` in `impersonation.js`, a reason string in the denied branch. **14 of 14 red** | `tests/platform-admin.test.mjs` |
| **A `strip`-survival guard is IMPOSSIBLE in this repo** — measured, so nobody proposes it again | the FIXED comments-only strip removes **83% of `signout.js`, 78% of `impersonation.js`, 73% of `App.jsx`, 51% of `platform-admin/index.ts`**. Legitimate comment density, not damage. Worst survival **17.5%** | nothing — it is a fact about this codebase's comment style |
| **Two subject counters were counting things that exist whatever the files contain** | `migrations were actually read` counted FILES (`>20`) and now counts `create policy` statements (**71**); `the walk actually looked at something` counted DIRECTORY ENTRIES (`>5`) and now counts non-empty stripped files (**131**) | `tests/platform-admin.test.mjs`, `supabase/migrations/**`, `app/src/**` |
| **Group C of the triage is not lane C's — it is group B** | `pa-strip` ×0, `pa-num` ×0, `pa-lead` ×0, `jobs finished this month` ×0, `through the platform` ×0 in the rebuilt `AdminPage.jsx` | `app/src/admin/AdminPage.jsx` |
| **Impersonation was NOT dropped — group B's largest item is a design Andrew replaced** | `confirm(` ×1, `written down` ×0; `lib/preview.js` and `admin/PreviewEntry.jsx` exist and are imported; `lib/impersonation.js` still imported by `App.jsx`, `BusinessContext.jsx`, `signout.js`. The server still logs before it acts | `app/src/admin/**`, `app/src/lib/preview.js`, `app/src/lib/impersonation.js` |
| The four mandatory credential-free suites still pass with all of this in the tree | `composition`, `design-contrast`, `landing-pricing`, `route-contract` — all PASS | their own subjects |

**THE FIGURE THAT IS STILL DELIBERATELY NOT A CLEAN BILL:** platform-admin is
**30 failed**, and every one of the thirty reads `app/src/admin/**`, which is
lane B's. Three of them (`13c-ii`, `13e`, `the button warns before it acts`) are
checks to RETIRE rather than findings — see the handover in
`docs/lane-c-queue-2026-09-13.md`.

**AND THE ONE-LINE INSTRUMENT WORTH REUSING ON ANY SUITE IN THIS REPO:** replace
its `read()` with `() => ""` and count what stays green. Eighteen hollow checks
cost one edit to find.

## 1i · THE TWELVE BROWSER-DRIVEN SCRIPTS, BLIND-TESTED — lane C, 2026-09-13, at `873d7a1`

**The last unknown in `docs/check-audit-2026-09-13.md` is closed.** Full account:
`docs/blind-browser-2026-09-13.md`.

**How, and it needs no dev server from anybody:** `git worktree` at `HEAD`,
`npx vite build`, `npx vite preview --port 4173` — and a second worktree with
`app/src` and `app/public` blanked to zero bytes, built and served on **4174**.
Both at once. A check green on both is green over nothing. **Lane B committed
twice and saved four files while this ran and disturbed nothing**, because a
worktree at a commit cannot be edited.

| what was proven | number | invalidated by a change to |
|---|---|---|
| **8 of 12 go red on a page that renders nothing** — `e2e-booking`, `two-detailers`, `spanish-dom`, `final-pass`, `sweep-booking-steps`, `shoot-dashboard`, `shoot-admin`, `shoot-manage` | all exit 1 | the script itself |
| **`sweep-widths` was blind: 5 × `clean` over an empty page** — `book · step 1`, `landing`, `pricing`, `terms`, `privacy` | now 5 × `NOT MEASURED`; the run prints `N surface(s) measured, N element(s) probed` | scripts/sweep-widths.mjs |
| **`admin-contrast` was blind AGAINST THE LIVE PRODUCT**: all five selectors renamed out of `app/src`, 0 pixels sampled, sentinel `99:1` printed as *"clear of the floor"* | rebuilt — **13 pixels measured, worst 5.16:1**, over the sign-in card and all five tabs | scripts/admin-contrast.mjs, app/src/admin/** |
| **`snapshot-page` wrote a 0 KB file and exited 0** | now exits 1 on zero captured text | scripts/snapshot-page.mjs |
| **`sweep-booking-steps` threw on a page that was perfect** and killed every subject below it | `.bk-actions` added; the unsubscribe page and the multi-vehicle section are measured again | scripts/sweep-booking-steps.mjs, app/src/book/UnsubscribePage.jsx |
| **`settle()` did not know the booking flow's spinner** — `.bk-spinner`, seven components — so `book · step 1` measured 3 elements and 0 text at every width, forever | `.spinner, .bk-spinner, [data-loading]` in all three copies; `book · step 1` now measures 168 elements | scripts/sweep-widths.mjs, scripts/shoot-dashboard.mjs, scripts/shoot-admin.mjs, app/src/book/** |
| **`source-guard` discredited a run it could not have affected** — *"the failures are very likely this rather than a defect"* over a frozen bundle | gated on `BASE`; prints **THIS RUN STANDS** off the dev server | scripts/source-guard.mjs |

**THE CAVEAT IS PART OF THE RESULT: seven of the eight that passed were saved by
the sign-in form**, not by an anchor anybody wrote — a blank page has no
`input[type=email]`. This instrument answers *"can it be green over nothing"*.
It does not answer *"can it be green over the WRONG screen"*, which is trap (c).

**TWO MORE OF THE SAME SHAPE, FOUND BY ASKING THE QUESTION MECHANICALLY:**

| what was proven | number | invalidated by a change to |
|---|---|---|
| **`scripts/dead-selectors.mjs` exists** — every class token in every quoted selector in the Playwright scripts, looked up in `app/src`+`app/public`; `--prove` invents one and must report it | 15 scripts, **64 tokens**, 3.67 MB of product read; **5 dead, all in `shoot-admin.mjs`** — `.pa-bar-r`, `.pa-panel .pa-grid`, `.pa-checks`, `.pa-rail`, `.pa-h1`, so its prices and promo-code shots never happen | scripts/*.mjs, app/src/**, app/public/** |
| **`adversary-probe`'s receipt leak check had never read a receipt** — its helper slices every body to 600 chars for display, `JSON.parse` threw on the truncated payload, and the check ran over `{}` | the new positive control failed on its first run printing `{}`; with the full body kept, **53 passed, 0 failed** | scripts/adversary-probe.mjs, supabase/functions/get-booking-receipt/** |
| **`sweep-widths` green baseline after both fixes** | **306 surface(s) measured, 66,234 element(s) probed, 10 problems, ZERO "rendered nothing"** — 301 before, the five extra being `book · step 1` at five widths | app/src/**, scripts/sweep-widths.mjs |

**THE SIX PROVIDER EMAIL LEGS ARE STILL OWED**, for two reasons and neither is
an instrument: the UTC day had not rolled at 23:12, and `app/src` carried five
uncommitted files all evening. `docs/e2e-booking-triage-2026-09-13.md` has the
exact commands and the pass condition (`90 passed, 0 failed, 0 skipped`).

**AND IT FOUND ONE PRODUCT DEFECT, LANE B'S:** booking step 4, *"Pick a place"*,
is **10px over the screen at 392x844** — W16 not met — measured against the
frozen bundle so no in-flight edit can explain it. Every other step fits at
every width.

---

## 1h · THE BOOKING LOOP, END TO END — lane C, 2026-09-13, at `36dd489`

**`scripts/e2e-booking.mjs`: 84 passed, 0 failed, 6 skipped**, both tenants,
exit 0, on a quiet tree with `app/src` committed and untouched. It had been red
for two days.

| what was proven | at | invalidated by a change to |
|---|---|---|
| A customer picks a service, a day and a time, submits, and the row matches the screen — name, status, instant, and **the price charged equals the price printed** | 2026-09-13, `36dd489` | `app/src/book/**`, `app/src/lib/format.js`, `supabase/functions/create-booking/**`, `supabase/functions/_shared/pricing.ts` |
| A request holds its slot, Accept turns it into a job, and the job is findable in the calendar's history | 2026-09-13, `36dd489` | `app/src/screens/**`, `app/src/components/RequestCard.jsx`, `supabase/functions/respond-to-booking/**` |
| Reschedule and cancel from the receipt page, with the old slot freed and the new one taken, asked of `available-slots` itself | 2026-09-13, `36dd489` | `app/src/book/**`, `supabase/functions/available-slots/**`, `supabase/functions/reschedule-booking/**` |
| Zero console errors anywhere in the loop, both tenants | 2026-09-13, `36dd489` | `app/src/**` |

**WHAT WAS *NOT* PROVEN, AND THE RUN SAYS SO ITSELF:** the six skipped checks
are the provider leg. Today's TENANT email allowance was spent before the run
(`send-email` answered 429 `daily_cap`), so *"did the email reach Resend"* is
unanswerable rather than answered. **Re-run after 00:00 UTC to close it.**

**AND ALL FIFTEEN FAILURES WERE THE CHECK, NOT THE PRODUCT** — three stale
assertions with three root causes, every one of them a deliberate product change
nobody updated the check for, plus the email six.
`docs/e2e-booking-triage-2026-09-13.md` sorts them one by one.

**THE HOLLOW PASS FOUND IN THE SAME PASS, BECAUSE THE GREENS WERE AUDITED TOO:**
`slotsOn()` ended `?? []`, so a dead `available-slots` became an empty list and
**both double-booking guards went green.** Proven by pointing the script at a
non-existent function: before, ONE failure; after, three, each naming the 404.

---

## 3f · PROVEN CLEAN — the Money tab, lane B, 2026-09-13

**Andrew's brief: this is the screen a detailer opens to answer one question —
am I making money, and is anyone late paying me.** What changed and what was
measured after it.

| what was proven | number |
|---|---|
| Tap targets, phone | **29 controls counted** at 392, **0 under 44**, **0 overlapping pairs**, sideways scroll **0** |
| Tap targets, 320 | same 29 · 0 under 44 · 0 overlapping · 0 sideways |
| Tap targets, 1440 | same 29 · 0 under 44 · 0 overlapping · 0 sideways |
| Spanish, 392 | same 29 · 0 under 44 · 0 overlapping · 0 sideways · `LO QUE ENTRÓ`, `ESPERANDO EL PAGO · $300` |
| 1920, his own monitor | sideways **0**, page fits in 1080 with no empty-viewport gap |
| Both questions in the first screenful, phone | net figure at **268px**, *Waiting on payment · $300* at **558px**, first name and amount under it — all above the 760px the tab bar leaves |
| Hierarchy | lead figure **34px**, cell values **17px**, labels **11px** |
| A period switch is still ONE beat | `getAnimations()` 120ms after the press: every part on `arrive` at **180ms**, `.bars` carrying `replacing`, **no second `bar-rise`** |
| The Calendar `dowLetters` console errors | **stale buffer, not live** — proven by opening Calendar, which renders its weekday row |
| The suites | `composition` **95/0**, `landing-pricing` **109/0**, `route-contract` **33/0**, `spanish` **73/0**, `design-contrast` all pairs, `npm run build` clean and the bundle carries `Brought in` / `Lo que entró` |

**THE INSTRUMENT WAS WRONG TWICE AND BOTH FAULTS WOULD HAVE BEEN BELIEVED.**
This is the whole of § 4 of `docs/START-HERE.md` happening in one sitting.

1. **Probing at whole pixels `±d` read every box 2px short** — 20→18, 60→58,
   44→42. The last pixel inside the box is never hit. Probe at `±(d − 0.5)`.
   Caught because all three baselines were off by the SAME 2, which is a
   signature and not a coincidence.
2. **Counting an ANCESTOR hit as a hit inflated every reach across the gaps
   between siblings.** `e.contains(el)` was in the predicate beside
   `el.contains(e)`; a point in `.segmented`'s own padding returned the parent
   and was scored as a hit, so 36px segments read **72 × 66** and the sweep
   invented **17 overlapping pairs** on a control the ledger had already proven
   clean. A pseudo-element hit-tests as its originating element, so
   `el.contains(e)` alone is right. **`e.contains(el)` is never a hit.**

**AND A THIRD, WHICH IS THE ONE MOST LIKELY TO BE REPEATED: `elementFromPoint`
IS VIEWPORT-ONLY.** Every control below the fold read reach **0** and would have
been reported as under-44 — six of them, including two that are 46. Scroll each
element into view and wait a frame before probing.

Invalidated by a change to: `app/src/screens/Money.jsx`,
`app/src/components/AdvancedMoney.jsx`, `app/src/theme.css`,
`app/src/components/Walkthrough.jsx`.

```bash
git diff --name-only HEAD -- app/src/screens/Money.jsx app/src/components/AdvancedMoney.jsx app/src/theme.css app/src/components/Walkthrough.jsx
```

**WHAT IS NOT PROVEN:** the unpaid list was measured against a temporary
in-component fixture of two rows, because **the demo database has no unpaid
completed job at all** — see `FOUND.md`, 2026-09-13. The fixture was removed
before the final run and every number above was taken without it except the four
that name `$300`. A real unpaid row is lane C's seed change.

---

---

## 1i · PROVEN TONIGHT — lane C, 2026-09-13, at `6717887` and after

**THE WHOLE SECTION IS ABOUT WHETHER THE CHECKS CAN SEE, NOT ABOUT THE
PRODUCT.** Read `docs/check-audit-2026-09-13.md` first — it carries the
reasoning; this is the ledger.

| what was proven | number | invalidated by a change to |
|---|---|---|
| **Sixty-nine checks across ten suites could not fail**, and every one is now anchored and baselined | 59 green over a blanked subject + 10 vacuous over live data; **24 deliberate breaks, every one red** | `tests/**`, `scripts/blind-run.mjs` |
| **`booking-engine`'s double-booking DISPLAY pair went green with `available-slots` completely dead** | before: **105 passed, 0 failed** against `available-slots-DEAD`; after: 1 failure naming `404 · 0 day(s)` | `tests/booking-engine.test.mjs`, `supabase/functions/available-slots/**` |
| `booking-page-isolation`'s three cross-tenant negatives had no service count — zero services proved perfect isolation | **63/0** with the anchor in | `tests/booking-page-isolation.test.mjs` |
| **`definer-grants` asserted nothing and exited 0 without credentials** | now **11 passed / exit 0** with them, **exit 1 and a named reason** without | `tests/definer-grants.test.mjs` |
| **`geoapify`'s own two "the check has subjects" counters passed over 67 zero-byte files**, taking the key-leak check 2b with them | both read BYTES now (>200,000); 2b gained a positive control; **23/0** | `tests/geoapify.test.mjs` |
| `spanish` § 2's five checks filtered `Object.entries(es)` with no count, where § 9 already had one | **73/0**; red when the catalogue is swapped for `{}` | `tests/spanish.test.mjs` |
| **`design-contrast` printed `ok  landing.css tokens match` UNCONDITIONALLY, under its own thirteen FAIL lines** | now `13 drifted, 13 of 13 compared` red / `(13 compared)` green | `tests/design-contrast.test.mjs`, `app/src/landing/landing.css` |
| `composition` 41 of 95, `route-contract` 3, `dead-mans-switch` 3, `customer-reminder` 2, `email-budget` 2, `tours` 2 — all pure negatives over files that could be empty | anchored in BYTES; live: 97/0, 34/0, 51/0, 27/0, 19/0 | those suites' own subjects |
| **`em-dash` is a FINDER, so it passed over 67 zero-byte files** | counts content now: **8,467 code lines, 2,833 quoted**; red at 0 | `tests/em-dash.test.mjs` |
| **`check-deployed.mjs` was blind to 28 sibling imports inside `_shared`** | it said **3 stale**; the truth was **17**. `deploy-freshness` 14/0, four breaks | `scripts/lib/sharedDeps.mjs`, `scripts/check-deployed.mjs` |
| `_shared` has no import cycle | **29 modules, 0 cycles**; red when `retryRead.ts` is given `import "./db.ts"` | `supabase/functions/_shared/**` |
| **`scripts/db-audit.mjs` printed SKIPPED and exited 0** | exits 1 now; verified both ways | `scripts/db-audit.mjs` |
| **The email and the booking page print the same price** | `money-format` **50 checks over 36 values, 0 skipped**, baselined by **7** breaks; `render-emails` 29 emails 0 problems, the accepted ladder $360 / $25 / $20 / $20 / $40 / **$345** | `supabase/functions/_shared/emailKit.ts`, `app/src/lib/format.js`, `_shared/platformBilling.ts` |
| **All 37 edge functions are running the repo's code** after the 17 stale ones were redeployed | `check-deployed.mjs`: *"all 37 functions are current"*, 21:08 UTC | **any** file under `supabase/functions/**` |
| Nothing else broke | `composition` 97/0, `design-contrast` all pairs, `landing-pricing` 109/0, `route-contract` 34/0, `email-brand` 226, `em-dash` 0 findings, `booking-core` 237/0, `spanish` 73/0, `tours` 19/0, `deploy-freshness` 14/0, `platform-billing` 335/1 (the known missing price editor), `booking-engine` 105/0, `booking-page-isolation` 63/0, `dead-mans-switch` 51/0, `email-budget` 27/0, `geoapify` 23/0 | their own subjects |

**TWO FINDINGS WITHDRAWN AFTER MEASURING PROPERLY — NEVER RE-REPORT THEM.**
The first blanking pass left `scripts/` intact and accused **`session-ping` of
38 hollow checks and `mail-sink` of 6**. Both are **clean**: with `scripts/`
blanked too, `session-ping` crashes outright, and `mail-sink`'s survivors are
its own pure classification logic plus its own subject counter, *"4a it read
the whole of tests/ and scripts/"*. Its subject is `tests/`, which cannot be
blanked without deleting the suite.

**AND THREE FIGURES THAT ARE DELIBERATELY NOT ROWS:**
`customer-reminder` is **14 passed, 1 failed** — *"4z the sweep fixture was
created"* — because the demo tenant's slot an hour out is already taken and the
exclusion constraint refuses the fixture. **Measured with these changes
stashed: 13/1, the same failure.** Not ours, and the suite refusing to read
green when it could not measure is it behaving correctly.
`platform-admin` is still **130/30**, every one reading `app/src/admin/**`.
**The six provider checks in `e2e-booking` are still unanswered** — today's
tenant allowance was 100 of 100 claimed at 21:28 UTC, so *"did the mail reach
Resend"* cannot be asked until 00:00 UTC.

```bash
git diff --name-only 6717887..HEAD -- tests scripts/check-deployed.mjs scripts/lib scripts/db-audit.mjs
```

---

## 3h · PROVEN CLEAN — the Clients tab, lane B, 2026-09-13

**Andrew's brief: this is the screen a detailer opens to answer who is worth
ringing.** It now states two of those answers as figures at the top of the page,
and each figure is the control that shows the people behind it.

| what was proven | number |
|---|---|
| Tap targets, phone 392 | **30 controls counted**, **0 under 44**, **0 overlapping pairs**, sideways scroll **0** |
| Tap targets, 320 | same 30 · 0 under 44 · 0 overlapping · 0 sideways |
| Tap targets, 320 with the quiet list showing | **24 counted** · 0 under 44 · 0 overlapping · 0 sideways |
| Tap targets, 1440 | 24 counted · 0 under 44 · 0 overlapping · 0 sideways |
| Spanish, 392 | 30 counted · 0 under 44 · 0 overlapping · 0 sideways · `sin venir`, `Tom Okafor es quien más gasta` — **the NAME untranslated**, which is the rule |
| The strip answers correctly | `8` matches the chip's own filtered count (`8 of 16` in the masthead after the press); `$795 Tom Okafor` is his two completed jobs, 700 + 95 |
| Both cells act | pressing the count sets the chip AND the *Longest away* sort and raises *Email these 5 / Text these 8*; pressing the amount clears the chip and sets *Most spent* |
| A record open at the desk | masthead at y=81, strip at y=175, search at y=282 inside the narrowed 651px column — nothing above the list moves when a client opens |
| The suites | `composition` **97/0**, `route-contract` **34/0**, `spanish` **73/0**, `design-contrast` all pairs, `npm run build` clean and the bundle carries `gone quiet` / `ledger answers` / `spends most` |

**THE INSTRUMENT WAS PROVEN AND THEN IMMEDIATELY POISONED BY ITS OWN PROOF.**
A 20x20 button was injected to check the probe could see an under-44 target. It
could. But the same fixture was `position: fixed; z-index: 99999` over the page,
and the run that followed it reported the sort control at **40x72 reach** — a
false finding on a control that measures **45** high once the fixture is out of
the document. **Clear the baseline fixture before the real run**, and treat a
first finding on a control nobody touched as a suspect rather than a result.

**AND `overlapHairline` IS 16 AND IS NOT AN OVERLAP.** Adjacent rows in a ruled
list share a sub-pixel boundary, so probing at `±0.5` scores 1px of contact
between every consecutive pair. The number that matters is overlap beyond 2px,
which is **0** at every width. Both figures are printed so nobody has to
re-derive which one was being reported.

Invalidated by a change to: `app/src/screens/Clients.jsx`,
`app/src/lib/client-list.js`, `app/src/theme.css`.

```bash
git diff --name-only HEAD -- app/src/screens/Clients.jsx app/src/lib/client-list.js app/src/theme.css
```

**WHAT IS NOT PROVEN, AND IT IS THE THIRD QUESTION IN THE BRIEF.** *"Who is
new"* has no honest answer in this database and so was deliberately not built:
`customers.created_at` is the moment the seed ran for every seeded customer, so
a "new this month" cell reads **13 of 13**; and "first completed visit in the
last 30 days" is **nobody**, because the earliest completed job for every
customer is 45 days back or more. Either way the cell would be all-or-nothing on
the only database anything can sign into — the same blindness the five lapsed
customers were seeded to end. **A seeded customer created recently with no
completed job is lane C's change**, and only then is the cell worth building.

**AND THE DEMO'S OWN `8` IS PART TEST RESIDUE.** Three of the eight — *Smoke
AHG4L*, *Smoke ACJZK* and one whose NAME is `140 Market Street, Long Beach, CA`
— are leftovers from end-to-end booking runs, with `Never` as their last visit
and `$0` spent. The screen is counting them correctly (never-been-in is inside
the chip's own filter, by `client-list.js`'s design) but the demo reads worse
than the product is. Lane C's seed/cleanup.


## 1j · THE WHOLE BATTERY, RUN AGAINST HONEST INSTRUMENTS — lane C, 2026-09-13, at `63509d5`

**This is the audit's payoff run.** `docs/check-audit-2026-09-13.md` made 69
checks across ten suites capable of failing; this is what they said. **All 58
suites in `tests/`, sequentially, with `.env` loaded.**

| what was proven | figure | at | invalidated by a change to |
|---|---|---|---|
| **The battery is green except for two suites that are red about `app/src`** | 52 of 58 suites exit 0; the other 6 were run down one by one | `63509d5` | `tests/**`, `supabase/**`, `app/src/**` |
| **`blind-run` reports zero suites that still exit 0 with their subject blanked** | 58 suites, 369 files blanked, **0** exit-0 flags (was 1) | `63509d5` | `tests/**`, `scripts/blind-run.mjs` |
| The 80 individual green lines that survive blanking are negatives whose SUITE goes red on its anchor — the designed state, not a hole | 80 across 11 suites | `63509d5` | `tests/**` |

```bash
git diff --name-only 63509d5..HEAD -- tests scripts/blind-run.mjs
```

### THE FOUR THAT WERE THE CHECK, AND ARE FIXED AND BASELINED

| suite | was | is | what it actually was |
|---|---|---|---|
| `customer-reminder` | 14 / 1 / 1 | **36 / 0 / 0** | both fixtures pinned at `now + 30min` against an exclusion constraint over a SEEDED calendar, so it measured nothing **depending on the hour it ran**. `freeSlot()` walks to the first free hour; the leads are derived from where it landed |
| `availability-honesty` | 26 | **31** | never imported `tests/_env.mjs` — one of the eleven that file was written for, missed. § 4's five live checks against `available-slots` had never run |
| `connect` · `plans` | 125 / 1 · 72 / 1 | **126 / 0 · 73 / 0** | both pinned a label containing an EM DASH that the label-separator rule replaced with the middle dot. Trap (k) |
| `spam-filter` | 32 / 1 | **36 / 0** | *"every window is 3600"* against a deliberate 86,400 daily Geoapify budget. The property is that a whole UTC day aligns with the provider's reset, because `rate_take` buckets on `floor(epoch / window) * window` |

**Every one baselined by breaking the real thing** — 9 deliberate mutations,
9 reds, tree restored each time.

### AND TWO SCRIPTS

- **`probe-forecast` 11 / 1 skipped → 16 / 0.** `weather.test.mjs` § 13 SKIPS
  saying the status mapping is *"proved live by scripts/probe-forecast.mjs
  instead"* — **and the delegate skipped too and exited 0.** Two honest skip
  lines adding up to a capability nobody had ever checked. Baselined against
  `forecast-DEAD`: 4 red.
- **`db-audit` 2 findings → clean.** `session_pings` and `translation_usage` are
  RLS-forced with no policies and `revoke all from anon, authenticated` — the
  same three lines as the eight already allowlisted, so a policy would be the
  thing that WEAKENED them. Allowlisted with the reason; baselined by removing
  one, which brings it back.

### THE TWO STILL RED, AND NEITHER IS LANE C'S

`docs/lane-b-handover-2026-09-13.md` carries both in full.

- **`platform-billing` 335 / 1** — the back office can no longer clear a price
  override back to the built-in files. The server half is intact; the button is
  gone from the rebuilt `AdminPage.jsx`. **Measured: `platform_settings.prices`
  is `null` today, so nothing is stuck** — the loss is a capability, not a live
  fault.
- **`platform-admin` 130 / 30** — **unchanged and already triaged** in
  `docs/platform-admin-triage-2026-09-13.md` § 4. Was 49, then 43, now 30. All
  thirty name a capability the rebuilt screen does not have; three of them are
  checks against a design Andrew replaced and should be DELETED rather than
  satisfied.

### WHAT IS STILL OWED, AND WHY IT WAS NOT DONE TONIGHT

**`scripts/e2e-booking.mjs`'s six provider-email legs, from § 1h.** Two
conditions had to hold and neither did at 22:04 UTC:

- **The day had not rolled.** `platform_email_days` for 2026-09-13 reads
  `claimed 100, sent 88, failed 12, refused 45` against a cap of 100. Spent.
- **Lane B's tree was not still.** `app/src/App.jsx`, `app/src/book/booking.css`
  and `app/src/theme.css` were all uncommitted, and `App.jsx` appeared DURING
  this session. Trap (f): a measurement taken while somebody is building is
  worth nothing, and `e2e-booking` drives lane B's own dev server.

**So it stays owed, and it needs both: after 00:00 UTC, on a committed tree,
with lane B idle.** `docs/check-coverage-gaps-2026-09-13.md` § 2 has the other
eleven browser scripts in the same position.

## 1k · THE PER-PERSON TOUR STORE, PROVEN LIVE — lane C, 2026-09-13, at `877391d`

**`public.user_tours` was applied to `kguqylyzgyzfktkfnhjb` and its row security
was proven with a REAL session** (`demo@detailplatform.com`), not read off the
migration. Every refusal below was confirmed by reading the row back afterwards,
because **a PATCH and a DELETE that RLS refuses both answer `204`** — the same
status a successful one gives — so the status code proves nothing on its own.

| probe | result |
|---|---|
| select own rows, empty table | `200 []` |
| insert own row | `201`, row returned |
| insert ANOTHER user's row | `403 42501` — new row violates row-level security |
| update own row (no update policy) | `204`, and `dismissed_at` **unchanged** on read-back |
| delete own row (no delete policy) | `204`, and the row **still there** on read-back |
| `anon` select | `401 42501` |

**The verification row was deleted afterwards with the service key and the table
was left empty** — `select` returns `[]`.

| proven | at | invalidated by a change to |
|---|---|---|
| the six probes above | 2026-09-13, `877391d` | `supabase/migrations/*user_tours*`, any later migration touching `public.user_tours` |

**NOTHING READS OR WRITES THIS TABLE YET.** It is the store half of the tour
replay fix; the wiring is lane B's — `docs/tour-replay-2026-09-13.md` § 5.

---

---

## HOW THIS FILE EARNS ITS KEEP

Andrew paid for every number above once. **The cost of this file is one `git
diff --name-only`; the cost of not having it is a full re-measure of five widths
across fifteen screens, plus the five withdrawn findings in § 2 being reported a
second time.** That is the arithmetic — see `docs/ECONOMY.md`.

## 1f · PROVEN TONIGHT — lane C, 2026-09-13/14, at `e6f27fd`

| what was proven | number | invalidated by a change to |
|---|---|---|
| **The six provider email legs are REAL, not skipped** — the day rolled and the provider was actually called | `e2e-booking` at **00:00:08 UTC**: *the provider took it*, *the customer email reached delivered@resend.dev*, *the owner email skipped as undeliverable* | `supabase/functions/send-email/**`, `_shared/email*.ts`, the email-budget migrations |
| **`e2e-booking` completes both tenants** | **89 passed, 1 failed, 0 skipped** — free run, frozen build on 4175 | `scripts/e2e-booking.mjs`, `app/src/book/**`, `supabase/functions/create-booking/**` |
| Seven `platform-admin` checks guarded an unreachable mechanism; they skip now and re-arm themselves | one added `beginImpersonation` call turned all seven skips into passes | `app/src/lib/impersonation.js`, `app/src/App.jsx`, `app/src/admin/AdminPage.jsx` |
| `tenant-isolation` compares real rows in all five tables, **customers included** | **45 passed, 0 failed** — was 40, and three of the five tables had **zero** A-rows | `tests/tenant-isolation.test.mjs` and the RLS policies it reads |
| `check-deployed` names an uncommitted function **DIRTY** rather than current | clean tree `all 37 functions are current`, exit 0; a probe on `create-booking` names it alone; a probe on `_shared/pricing.ts` names all six importers | `scripts/check-deployed.mjs`, `scripts/lib/sharedDeps.mjs` |
| `adversary-probe` reads the **whole** 10,781-character public profile, behind a parsed positive control | **54 passed, 0 failed**; `pay_venmo` red on the full read and green the instant the 4,000 slice returns | `scripts/adversary-probe.mjs`, `get_public_business_profile` |
| Five double-booking and never-translate guards require their subject to exist | `timezone-and-slots` 34/0, `booking-engine` 105/0, `translations` 69/0/0 — each baselined red | those three files, `available-slots`, the translation classifier |
| `render-emails` fails if a template is exported and never rendered | *all 16 exported templates are rendered*; deleting both rows gives 27 emails, 1 problem, exit 1 | `_shared/emailTemplates.ts`, `scripts/render-emails.mjs` |
| The credential-free battery, after every change above | `composition` 97, `landing-pricing` 109, `route-contract` 34, `booking-core` 237, `gateway-retry` 15, `definer-grants` 11, `em-dash` 0 findings, `design-contrast` all pairs | `app/src/**` |

**THE ROW NOT TO MISREAD IS THE SECOND.** *89 passed, 1 failed* is **not a clean
bill** — `FOUND.md` § THE SECOND RUN WENT 89/1 carries the open question, and the
00:00 run of the same script went **19/10 and then threw**. **The refusal is
intermittent**, so a single green run is not evidence that it is gone.

## 1n · THE INTERMITTENT BOOKING REFUSAL, RUN TO GROUND — lane C, 2026-09-13, at `80e7c11`

**The subject was the frozen build on `127.0.0.1:4175`, and `git diff
--name-only 9d88fa2..HEAD -- app/src` was EMPTY**, so that bundle is byte-for-
byte the committed app source at `80e7c11`. Lane B's three uncommitted edits
could not reach it — trap (f) and trap (g) both retired rather than dodged.

| what was proven | number | invalidated by a change to |
|---|---|---|
| **`available-slots` never offers a time a live booking forbids** | **1,807 offered slots** across 46 days × 2 tenants × 3 durations each, compared against the buffered-conflict rule applied to the rows in the database: **0 clashes** | `supabase/functions/available-slots/**`, `_shared/slotValidation.ts`, `business_settings.buffer_minutes` |
| **The calendar is asked about the length actually booked**, not the service's base minutes | 90 min asked against a **60**-min base service, 105 against a **75**-min one — the numbers differ, so the check bites; both matched `end_at - start_at` | `app/src/book/steps/StepWhen.jsx`, `app/src/book/BookingPage.jsx`, `supabase/functions/calculate-booking/**` |
| **The refusal reproduces on demand** — two customers, one slot | first books 200, second **409 "That time is too close to another booking. Please choose a different time."** — byte-identical to the 00:00 run's failure | `supabase/functions/create-booking/**`, `_shared/slotValidation.ts` |
| **And through the real booking page at 392x844** | the error is drawn, **no** confirmation, the customer is left on **step 7 of 7**, their chip deselected; Back reaches *"Pick a time"* with a re-fetched calendar | `app/src/book/**` |
| **One booking costs four slots, not one** | demo-riverside, 75-min job, 45-min buffer: the day went from **8 offered times to 4** | `business_settings.buffer_minutes`, `slot_interval_minutes` |
| **`bookings_no_overlap` is real and bites** — proven by an insert, not by a grep | service-role insert of an overlapping row: **`23P01`**, naming `(business_id, tstzrange(start_at, end_at, '[]'))` | the `bookings` exclusion-constraint migrations |
| **`e2e-booking`, five consecutive runs after the instrumentation** | **94 passed, 0 failed**, five times (was 89/1) — **all five chose the same day and time**, so this is one scenario five times, not five trials | `scripts/e2e-booking.mjs`, `app/src/book/**`, `supabase/functions/create-booking/**` |
| **The reschedule DOES move the booking**, so the cancel check asks about the moved time | five runs, five moves, each to the adjacent half-hour (08:00 → 08:30 / 09:00) — `FOUND.md`'s step 2, answered in the output | `scripts/e2e-booking.mjs`, `supabase/functions/reschedule-booking/**` |
| **`booking-engine` now proves the constraint, and the new checks were baselined red** | **110 passed, 0 failed** (was 105); removing the overlap turns 19b and 19c red and leaves 19a/19d/19e green | `tests/booking-engine.test.mjs` |
| **The residue sweep works** | *"swept 2 booking(s) a killed run left behind: Smoke 7Z2G9 2026-09-14T13:00, Smoke 88GST 2026-09-14T17:00"* — created 2026-09-11 and live for six days | `scripts/e2e-booking.mjs` |

**THE ROW THAT IS NOT A CLEAN BILL IS THE LAST-BUT-ONE.** Four greens do not
disprove an intermittent fault — that reasoning has bitten this project twice.
**What settles it is the reproduction**, which says the refusal needs a writer
to change the calendar mid-form, and `FOUND.md` § THE INTERMITTENT REFUSAL IS A
STALENESS RACE carries the whole account.

**AND ONE CHECK IN THIS REPO IS STILL A GREP WHERE A MEASUREMENT NOW EXISTS.**
`tests/booking-engine.test.mjs` 18a-18e read `create-booking/index.ts` as TEXT
for its 23P01 handling — trap (k). The constraint itself had never been proven
by anything; the row above is that proof, taken once so nobody pays for it
again.

## 1o · THE PLATFORM-ADMIN CLASSIFICATION — lane C, 2026-09-13, at `a2408f5`

| what was proven | figure | at | invalidated by a change to |
|---|---|---|---|
| **The 30 red `platform-admin` checks split 3 real defects / 27 not** | suite went 129/23/7 to **146/3/7** | `691d55a` | `tests/platform-admin.test.mjs`, `app/src/admin/**` |
| Seventeen re-pointed checks each go RED when their real subject is broken on a scratchpad copy | 17 breaks, 17 reds | `691d55a` | `tests/platform-admin.test.mjs`, `app/src/admin/**` |
| The three real defects each go GREEN under a plausible fix applied to a copy | suite **149/0/7** | `691d55a` | `app/src/admin/AdminPage.jsx` |
| `blind-run --only platform-admin` reports zero checks green with the subject blanked | **0** of 372 files' worth | `691d55a` | `tests/platform-admin.test.mjs` |
| **No suite in `tests/` asserts the 44px tap floor on any surface** | 0 suites | `a2408f5` | `tests/**` |
| The unguarded-plural class in `app/src` is three in `AdminPage.jsx` plus two minor `t()` strings; five other candidates are guarded and were each opened | 3 + 2 live, 5 clear | `a2408f5` | `app/src/**` |

```bash
git diff --name-only 691d55a..HEAD -- tests/platform-admin.test.mjs app/src/admin
```

**THE THREE DEFECTS ARE LANE B'S AND ARE WRITTEN OUT IN FULL** in
`docs/lane-b-handover-2026-09-13.md` § 2: the open detailer held as a snapshot so
Suspend leaves the panel lying, `"1 hours ago"` in the two date helpers, and
F-016 back on the Detailers list as one missing word. The name-by-name split of
all thirty is `docs/platform-admin-triage-2026-09-13.md` § 6.

**AND `PA_MUT` IS THE REUSABLE PART.** `read()` in that suite honours a JSON map
of `path -> replacement path`, empty by default, so a check whose subject lives
in another lane can be baselined on a scratchpad copy without writing in that
lane and without trap (f). Any source-reading suite can take the same two lines.

## 3e · PROVEN TONIGHT — lane C, 2026-09-13: THE 44px TAP FLOOR IS MEASURED NOW

**Nothing in the 58-suite battery had ever checked it.** `docs/START-HERE.md`
§ 3 puts the floor in front of every session, `docs/BAR.md` has a section on it,
and a 38px close button shipped with every suite green. Every weekend since
Friday had been spent measuring tap targets by hand, screen by screen.

**THE INSTRUMENT:** `scripts/lib/tapProbe.mjs` is the measurement,
`scripts/sweep-tap-targets.mjs` is the walk, and `scripts/sweep-booking-steps.mjs`
is its second caller. It does not read rectangles and it does not read source.
From each control's own centre it walks one pixel at a time left, right, up and
down with `document.elementFromPoint`, stopping at the first pixel that answers
something else.

**THAT SUBSUMES THE PITCH PROBLEM INSTEAD OF NEEDING A SECOND CHECK.** A walk
cannot measure through a thief: the moment a pixel answers the neighbour the
walk stops there, so a control this reports as reaching 44 has 44 pixels nobody
else is taking.

| what was proven | number | invalidated by a change to |
|---|---|---|
| **The whole detailer dashboard clears the floor** — five tabs and every settings screen behind BOTH doors, at 1440 / 768 / 392 / 320, in English AND Spanish | **288 screens, 6,730 controls, 739,340 press probes**, 0 findings on any dashboard screen | `app/src/screens/**`, `app/src/components/**`, `app/src/theme.css`, `app/src/App.jsx` |
| **`.pa-x` and `.pa-chip` in the back office now pass** — the two controls `docs/lane-b-handover-2026-09-13.md` § 2d reported from SOURCE | measured clean at 1440 / 392 / 320 with the detailer drawer open; `.pa-chip` 29 painted / 44 reachable, pitch 45.4 | `app/src/admin/admin.css` |
| **`.pa-out` does NOT** — *Sign out* and *See everyone* are **17px tall** | 46 findings, every back-office tab, both languages, all four widths | `app/src/admin/admin.css` |
| The landing and pricing pages are **14 narrow and 30 short** — the footer links, two `.softlink`s and `.cta.sm` | see § C of the lane B handover for the table | `app/src/landing/**` |
| The gear's **Your subscription** screen carries a **14px** mailto link | 8 findings, every width, both languages | `app/src/screens/more/**` |
| **The booking flow clears the floor except the vehicle-count chips** — measured for the first time | **72 step readings, 893 controls**; `.bk-chip.word` "1"/"2"/"3" read **40px wide, 41-42px of reach** at 1920 / 1440 / 768 / 392 | `app/src/book/**` |
| The exceptions both fire and both are printed every run | `btn.sm.icon` 378 subjects, `seven-column-grid` 240 subjects | `scripts/lib/tapProbe.mjs` |

```bash
git diff --name-only HEAD -- app/src/screens app/src/components app/src/theme.css app/src/App.jsx app/src/admin app/src/landing app/src/book
```

### THE INSTRUMENT WAS BROKEN ON PURPOSE FIVE TIMES, AND ONE OF THE FIVE IS THE WHOLE ARGUMENT

`--baseline` shrinks REAL controls on a REAL screen and fails if the check does
not report its own fault by name. All five seen, all five restored to the exact
starting reading:

| break | what it did | what came back |
|---|---|---|
| `short` | the tab buttons squeezed to 20px tall | `button "Today" — 36px of reach down (rect 20px), floor 44` |
| `narrow` | the tab buttons squeezed to 18px wide | `button "Today" — 18px of reach across` |
| `covered` | a transparent sheet over the shell | 38 controls whose centres answer the sheet |
| **`short_after`** | **ONLY the `::after` extensions removed from `.chip`, `.segmented button`, `.choice`, `.btn.sm`** | **a passing sort chip drops to `37px of reach down (rect 36px)`** |
| `no-subjects` | every control hidden | the screen reports that it measured nothing |

**`short_after` IS THE ONE THAT MATTERS.** It changes no paint at all — every
rectangle is byte-identical before and after — so an instrument secretly reading
rectangles could not produce that number. It is the direct proof that the
`::after` hit area is being credited, which is the thing that made five
hand-measured findings false this weekend (§ 2 above).

**AND THE `narrow` BREAK WAS WRONG FIRST, WHICH IS THE REUSABLE PART.** Its
first version set `width: 18px` on `.tabbar button` and the check reported
BLIND. The buttons are flex children, so `width` is a BASIS and not a floor and
they never moved: **the break was the fault not happening.** The instrument's
own instrument can be wrong, which is why the baseline prints WHAT IT DID and
not merely whether it saw.

### THE TWO STATED EXCEPTIONS, PRINTED EVERY RUN WHETHER OR NOT THEY FIRE

- **`.btn.sm.icon` at 38 wide.** PRODUCT.md's recorded exception, **Andrew's to
  reopen and nobody else's.** 378 subjects took it.
- **The seven-column month grid.** A month is seven columns, so the widest a
  date can be is the grid's own content width over seven. The floor there is the
  COLUMN, computed at runtime and printed with its arithmetic, and the HEIGHT
  floor still applies in full. 240 subjects took it. **Calling it a pass would
  be a lie and calling it a failure would be a finding nobody could fix.**

### FOUR WAYS THE WALK WAS SILENTLY MEASURING NOTHING, ALL FOUND BY ITS OWN COUNTERS

Every one produced a clean-looking run. **The subject count per screen is what
made each visible** — a walk that measured nothing prints the same word as one
that measured everything.

- **The gear button is a TOGGLE**, so re-pressing it after every settings screen
  CLOSED it and the Business index underneath was read instead. The "gear" list
  came back as an interleaving of gear rows and Business rows and nothing
  errored.
- **The settings index is GROUPED under headings**, and the Business tab draws a
  one-row setup prompt above it in a box of its own — so both "the first row's
  parent" and "the container with the most rows" walked a fraction of the index.
- **Above `--wrap` the index STAYS on screen** beside the opened screen, so a
  document-wide row count moves under the walk.
- **Every back-office tab drew 6 controls** — the five tabs and *Sign out* —
  because a screen waiting on the `platform-admin` round trip is quiet in all
  three senses `settle()` asks about. It now waits for the panel itself, and
  Detailers went from 6 controls to 31.

### AND ONE CLASS OF FINDING THAT WAS NOT REAL, RECORDED SO IT IS NOT RE-REPORTED

A run taken while lane B was editing `app/src` reported **42 controls on the
Spanish calendar at 392 whose centres all answered `main.app-main`** and **13
settings rows that vanished mid-walk**. **Neither reproduced.** Re-run in
isolation that screen measures 54 controls and is clean. Vite reloaded the page
under the walk — CLAUDE.md trap (f), and the script's own source guard named the
file. **Read that line at the end of a run before believing the rest of it.**

### ONE THING OWED TO LANE M, WRITTEN DOWN SO IT DOES NOT DIE AT THE CLEAR

**`CLAUDE.md` § Verification's "What to run, and when" table has no row for this
check, and `CLAUDE.md` is the manager's file.** The row it needs:

| After changing | Run |
|---|---|
| Any screen, control or stylesheet | `node scripts/sweep-tap-targets.mjs` (needs the dev server and the demo seed; `--baseline` first if you have not seen it prove itself) |

**Until that row exists, the only thing pointing at the instrument is this
section and `docs/check-coverage-gaps-2026-09-13.md` § 1** — and a check nobody
is told to run is a check nobody runs, which is the same failure as a check that
tests nothing wearing different clothes.
