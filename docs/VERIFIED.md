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
`tests/booking-core.test.mjs` as a **§ 19 — § 18 was taken by the vehicle-to-tier matcher on 2026-09-13, see § 1h** — **the four-character floor, an empty
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

---

## 1h · PROVEN TONIGHT — lane C, 2026-09-13, the vehicle-to-tier matcher

**THE SUITE THAT DECIDES WHAT SOMEBODY IS CHARGED.** Lane B built
`suggestVehicleSize` and could not guard it, because `tests/` is not lane B's.
`tests/booking-core.test.mjs` § 18 is that guard, and it is the only permanent
check anywhere on the path from *what a customer types* to *the tier they are
quoted at*.

| what was proven | number | invalidated by a change to |
|---|---|---|
| **A vehicle that matches cleanly lands in the same tier on a two-, three- and five-tier detailer**, no two of whom share a key | `booking-core` **281 passed, 0 failed** (was 237 — § 18 is 44 new checks) | `app/src/book/core.js`, `app/src/book/vehicles.json`, `app/src/book/steps/StepVehicle.jsx` |
| A car in a DIFFERENT tier is quoted differently — five shapes, five distinct keys on one five-tier detailer | § 18e–18i | the same paths |
| **A typo suggests no tier on its own, and the chain that absorbs it does** — five typos, each resolved by the type-ahead and then tiered | § 18j/18k, 10 checks | the same paths |
| **A make with no model quotes nothing — checked across all 45 makes in the index** | § 18l/18m, 1 recorded exception (Genesis) | `app/src/book/vehicles.json`, `core.js` |
| **Text that matches nothing chooses NO tier and blocks NOBODY** — nine unrecognised strings, each proved to leave the detailer's own first tier untouched and `canAdvance("Vehicle")` true | § 18o–18s, 13 checks | `core.js` |
| A word two tiers both claim abstains rather than picking one | § 18t/18u | `core.js` |
| The suggestion never overrules a customer's own tap, and never fires into a multi-vehicle booking | § 18y–18aa | `app/src/book/steps/StepVehicle.jsx` |

### BASELINED BY TEN DELIBERATE BREAKS, EVERY ONE RED, EACH BY NAME

**Run in lane C's own `git worktree` at `HEAD`, never in lane B's tree** — the
rule in `docs/START-HERE.md` § A PORT IS A LANE'S PROPERTY TOO applies to files
as well as ports, and a worktree at a commit cannot disturb a session that is
building.

| break | what went red |
|---|---|
| the body table emptied | **17 checks**, starting with § 18a's own subject count |
| the table's rule order reversed | 18n |
| the body WORDS tried least-specific first | **9 checks** |
| a word two tiers claim picks the first of them | 18t, 18u |
| a car no tier claims falls back to the first tier | 18s |
| an empty tier list silently uses OUR three sizes | 18r |
| the printed word becomes the whole field | 18v |
| our three keys returned instead of the detailer's | **5 checks** |
| the suggestion keeps firing after the customer taps | 18y, 18z |
| the step refuses to advance until a tier is chosen | 18q, and § 8's own gate check |

### TWO DEFECTS FOUND BY WRITING IT, AND NEITHER IS FIXED HERE

Both are in `app/src/book/core.js`, which is lane B's. `FOUND.md` carries them
in full and the suite **prints both on every run** rather than hiding them
behind a green line.

- **THE GENESIS COLLISION.** `Genesis` is a MAKE with six models — three sedans,
  three SUVs — and also a word in the sedan rule, so typing the make alone quotes
  the small tier. It is the only one of 45 makes that does this, and § 18m is
  pinned to that single name.
- **THE TYPO RANKING.** `matchVehicle`'s pass 5 holds one-typo and two-typo hits
  together and offers them in alphabetical-make order, so a worse match can be
  the first row. **371 of 1,336 synthetic one-letter typos offer a worse match
  first; 156 of those cross a price tier.** `esclade` offers Buick Enclave
  (medium) ahead of Cadillac Escalade (large).

### AND ONE THING THAT LOOKS LIKE A DEFECT AND IS THE FEATURE

**`suggestVehicleSize` has no fuzzy matching at all, and abstains constantly.**
A misspelling, an unknown car, a bare make, a tier list with no words, and a
word two tiers both claim all return null. That is Andrew's own rule — *a wrong
guess quotes somebody the wrong price, which is worse than not guessing* — so
none of those is a gap to close later. **Do not "improve" the matcher by making
it guess more.**

```bash
git diff --name-only HEAD -- app/src/book/core.js app/src/book/vehicles.json app/src/book/steps/StepVehicle.jsx
```

## 1i · PROVEN TONIGHT — lane C's stopper cannot touch lane B's port

| what was proven | number | invalidated by a change to |
|---|---|---|
| `scripts/stop-my-servers.mjs` **refuses 5173 by name and kills nothing at all**, including the allowed port in the same command | `4173 5173` → one REFUSED line naming lane B, exit **1**, and the live listener on 4173 **still up afterwards** | `scripts/stop-my-servers.mjs` |
| It really can see and stop its own | a throwaway listener on 4173 was found by pid (66284), stopped, and read back idle | the same file |
| It counts, rather than merely matching | prints `stopped N, M of K already idle` — a run over zero ports cannot read as a pass | the same file |

---

## 1j · PROVEN TONIGHT — lane C, 2026-09-13: TEXT THAT ONLY EXISTS AFTER AN ACTION

**The blind class is measurable now, both from the source and in a browser, and
both halves were broken on purpose before being believed.**

| proven | by | invalidated by a change to |
|---|---|---|
| **Every native dialog a detailer can reach puts its words through `t()`** — 20 call sites found, 13 outside `admin/` | `spanish` **76/0**, § 11, baselined FOUR ways | `app/src/screens/**`, `app/src/components/**`, `app/src/book/**`, `app/src/hooks/**` |
| **A native dialog's words can be read at runtime and classified** | `spanish-dom.mjs` captured **16 dialogs on 5 screens** at `c089ad3` — **0 English / 3 Spanish / 13 unclassifiable**, with the catalogue and the bundle from the SAME tree | `app/src/**`, `scripts/spanish-dom.mjs` |
| **The gear opens** — and 8 settings screens are measured for the first time | the row set changes after the press; anchor red when the locator is pointed at `data-tour="new"` | `app/src/screens/**`, `app/src/components/AppShell*` |
| **The catalogue is read whole** — 1,961 keys by `import()`, not 1,546 by regex | `catalogue: 1973 keys · 1723 exact tells · 115 interpolated patterns`, printed every run | `app/src/lib/strings/appEs.js` |
| **The press pass cannot write** | `594 writes blocked at the network`, printed every run | `scripts/spanish-dom.mjs` |

### THE FOUR BASELINES ON `spanish.test.mjs` § 11

| break | result |
|---|---|
| the tree as it stood at `c089ad3` | **RED — 7 untranslated dialogs**, six of them the ones Andrew reported and a SEVENTH nobody had named (`Faq.jsx`) |
| every dialog wrapped in `t()` | green — and § 9a then went red on the new key with no Spanish, which is the two checks composing |
| `DaySheet.jsx`'s `const ask` rewritten to glue English round a value | **RED** |
| every `confirm`/`alert`/`prompt` renamed away | **11a RED — 0 found**, the subject anchor |

**AND THE THIRD BASELINE CAUGHT A BUG IN THE CHECK ITSELF.** The first version
resolved a bare-identifier argument by reading the next **400 characters**, and
that window ran past the end of the statement into an unrelated
`label={t("Block this day")}` eleven lines below — **green over a real break.**
The window is the STATEMENT now, ended by the first `;` at bracket depth zero.
A character budget is a guess about how long code is.

### THE TWO BASELINES ON `spanish-dom.mjs`

| break | result |
|---|---|
| `--prove` (the dashboard left in ENGLISH) | **RED — 38 screens `NOT MEASURED`**, and the flag inverts its own exit code so a clean run there is a failure |
| the gear locator pointed at `data-tour="new"` | **RED — "pressing it did not change the settings list (14 rows, all of them the Business tab's) — it never opened"** |
| a `t()` unwrapped on `Catalog.jsx`'s size-removal confirm, rebuilt | **0 English → 3 English** — the planted press-only string Andrew asked for, and the only change in the whole run |

### AND THE NUMBER MOVED ON A FROZEN SUBJECT, WHICH IS ITS OWN FINDING

**Two runs against ONE unchanged build reported 46 findings and then 35, and an
earlier run reported 8 English dialogs where the correct answer is 0.** Nothing
about the page had changed. **The script reads `appEs.js` from the REPO while
`BASE` serves a build from a worktree**, and lane B was adding Spanish entries
to the repo's catalogue all evening — so an English string in the old bundle
started matching a key that only existed in the new catalogue.

**A finding is then neither the build's nor the catalogue's**, and the count
drifts with somebody else's unrelated work. `CATALOGUE=<path>` points the script
at the tree that was actually built, and **both the catalogue path and `BASE`
are printed on every run**, because a silent default is how the two came apart.

**THE 8 WAS A LUCKY ACCIDENT AND IT IS CORRECTED ABOVE.** Under matched trees a
dialog that was never wrapped in `t()` has no key and classifies `?`, not `EN`
— which is the documented split and not a weakness: § 11 catches those, from the
source, where the difference between our untranslated string and the detailer's
own words is visible. **A number that flatters the instrument is exactly the
number to distrust.**

### WHAT NEITHER HALF CAN DO, SAID OUT LOUD

**A key-based detector cannot see a string that never reached `t()`, because
there is no key to match.** `Faq.jsx` raised `Delete "Do you need my water?"?`
— plain English to a Spanish detailer — and the runtime pass classified it `?`,
not `EN`. **That is why there are two halves and why neither is sufficient:**
§ 11 reads the source, where the difference between *our* untranslated string
and *the detailer's own words* is visible; `spanish-dom` reads the screen, where
it is not. A `?` is reported and counted and does not fail.

### THE REAL NUMBER — how big the never-checked class was

**Counted, not estimated, at `c089ad3`.**

| | |
|---|---|
| keys in the detailer's catalogue (`appEs.js`) | **1,973** |
| **lost to the old regex parser** — the value wrapped onto the next line, so the key came back with no Spanish and was filtered out of the tells | **415** |
| **keys carrying a `{placeholder}`** — exact matching could never see one, because what reaches the screen is the sentence with a name in it | **225** |
| **UNION: keys no runtime check in this repo could detect in English** | **586 — 30% of the catalogue** |
| native dialog call sites, all invisible to all four i18n instruments | **20** (13 a detailer reaches, 7 in `admin/`, English on purpose) |
| **settings screens never opened in Spanish by anything** | **8** — carrying 258 Spanish strings between them |

**WHAT A DETAILER ACTUALLY SEES OUT OF THAT.** The 13 dialogs are all
destructive warnings — *delete this booking, delete this review, remove this
person, disconnect Stripe, stop using this domain* — so the class is small and
sits at the highest-consequence moment in the product. The 8 unopened screens
are Team, Password, Billing, Notifications, Templates, Preferences, Report and
Tour. **A customer sees none of it**: every one of these is behind the
detailer's sign-in, and the customer's own surface (`book/`) has its own
catalogue and its own § 4 check.

**THE 30% FIGURE IS THE ONE TO REMEMBER, BECAUSE NOTHING ABOUT IT LOOKED
BROKEN.** Every run printed `ok` per screen and `clean` at the end. The parser
did not throw, the walker did not skip, and no count was printed that anybody
could have compared against the catalogue's own size. **The instrument was
measuring 70% of its subject and reporting on 100% of it.**

---

## 14.1 · THE PUBLIC RECEIPT NOW SENDS A NAMED LIST — 2026-09-16, at `2a10b86`

**What was proven, in numbers.** `get-booking-receipt` was called on the
development project (`kguqylyzgyzfktkfnhjb`) with **no `apikey` header of any
kind** — the booking uuid was the only credential — against two bookings that
carry a real `admin_notes` value.

| | before | after |
|---|---|---|
| keys in the `booking` object | **66** | **31** |
| `admin_notes` | `"staff note"` / `"phone booking"` | **absent** |
| fields dropped | — | **35**, listed below |

Dropped: `business_id`, `customer_id`, `vehicle_size`, `has_water_electric`,
`admin_notes`, `campaign_id`, `payment_status`, `payment_notes`, `finalized_at`,
`google_calendar_event_id`, `deleted_at`, `owner_reminder_sent_at`,
`customer_reminder_sent_at`, `owner_nudge_sent_at`, `owner_wrapup_nudge_sent_at`,
`owner_finalize_nudge_sent_at`, `created_at`, `updated_at`, `has_water`,
`has_power`, `declined_at`, `owner_request_nudge_sent_at`,
`customer_reminder_2_sent_at`, `plan_member_id`, `plan_id`, `booking_group_id`,
`bulk_vehicle_count`, `miles`, `lang`, `stripe_payment_intent`,
`stripe_session_id`, `paid_online_at`, `weather`, `weather_at`, `vehicle_year`.
Nothing was added. Raw before/after bodies: `artifacts/receipt-fields/`.

**The two paths that read the row rather than render it still work.** The
sibling-appointment list was exercised by grouping two real bookings on one
business: the group came back with **1 sibling** and `booking_group_id` was
**not** in the reply. Both rows were set back to `null` afterwards. The card
button reads `payment_status`, which is still selected and still dropped.

**The check, and it was broken on purpose three times before being trusted.**
`tests/receipt-fields.test.mjs` — 51 assertions, 60 targets (one per column on
the row, so a migration grows the target count by itself), receipt at
`receipts/receipt-fields.json`, validated by `node scripts/receipt.mjs`.

| sabotage | what it did | caught |
|---|---|---|
| 1 | put `admin_notes` back in the endpoint's list **and deployed it** (v56) | **yes** — 5 red, including the live reply and the note's own text |
| 2 | restored the `...booking` spread in the reply | **yes** — 5 red |
| 3 | removed `travel_zone` from the test's own list | **yes** — 5 red |

The receipt validator refused the sabotaged run (`0 of 1 receipt(s) valid`) and
accepts the clean one. Clean deploy is **v57**.

**Ran green alongside:** `composition` 97, `landing-pricing` 109,
`route-contract` 34, `design-contrast` all pairs, `connect` 126,
`booking-page-isolation` 63, `timezone-and-slots` 34.

| surface | proven | at | invalidated by a change to |
|---|---|---|---|
| **the public booking receipt's field list** | 31 keys, allow-listed; 35 dropped; anonymous, no key | 2026-09-16, `2a10b86` | `supabase/functions/get-booking-receipt/**`, `app/src/book/ManageBookingPage.jsx`, any migration adding a `bookings` column |

## 14.2 · THE OWNER'S CALENDAR FILE NOW NEEDS THE OWNER'S SESSION — 2026-09-16, at `2a10b86`

**What was proven, on the deployed function, before and after.** `booking-ics`
on the development project (`kguqylyzgyzfktkfnhjb`) was called with **no
`apikey` header and no `Authorization` header of any kind** — the booking uuid
was the only credential — with `&audience=owner` typed on the end, which is the
whole attack: the customer edits their own confirmation link.

| the anonymous flip returned | before (v50) | after (v51) |
|---|---|---|
| `SUMMARY:Chris Vogel · Express Wash` | **present** | **absent** |
| `Customer: Chris Vogel · 562-555-0447` | **present** | **absent** |
| the file it hands back | the **owner's** copy | the **customer's** copy, line for line |
| HTTP status | 200 | 200 |

Raw bodies: `artifacts/ics-audience/BEFORE-anonymous-owner.txt` (taken before
any change, with `curl`-equivalent), and `AFTER-anonymous-owner.ics`,
`owner-signed-in.ics`, `customer-anonymous.ics` from the check's own run.

**The two things that had to keep working, both exercised.** A signed-in member
of that business still gets the private copy — `562-555-0447` present, 200. The
customer's own link, with no credential at all, still answers 200 with the
customer's copy; it was never touched.

**The membership is scoped to the booking's own business**, so a detailer's
session cannot open another detailer's job either. `requireMember(req,
booking.business_id)` is the same helper every other owner surface uses.

**And the browser's own button was re-proven in the running app**, because the
fix broke the mechanism it relied on: an `<a href>` cannot send an
Authorization header, so the dashboard's Calendar control is a `<button>` that
fetches and hands over the file, the way `saveContact` already hands over a
vCard. Measured at `localhost:5173/job/<id>` with the session live: the request
carried the Authorization header, returned 200, and the body contained
`562-555-0447`. The same URL re-fetched **from the same browser with the header
removed** returned 200 **without** the phone. With the calendar preference set
to Google, the button opens `calendar.google.com/calendar/render?...` and
**never calls our server at all** — that branch builds the event in the URL and
was unaffected.

**Geometry unchanged by the tag swap.** The control measures **376×38** at 1440
and **89×38** at 320, identical to the `Contacts` and `Reminder` buttons beside
it, with **84px of reach down and 395px across** by `elementFromPoint` probe
(floor 44). No horizontal overflow at 320, 392, 768 or 1440; no console errors
at any of them.

**Also closed the "no rate limit" half of the item.** The endpoint now takes
the same blunt `publicCeiling` (600/hour per address) that `pay-booking` takes.

**The check, and it was broken on purpose three times before being trusted.**
`tests/ics-audience.test.mjs` — 20 assertions, and its targets are **discovered
by subtraction, never named**: it fetches the owner's copy with a session and
the customer's copy without one, and every line in the difference becomes a
target the anonymous flip must not contain. Add an owner-only line to the
endpoint tomorrow and the check grows a target with nobody editing it. A run
that finds **zero** owner-only lines is a failure, not a pass. Receipt at
`receipts/ics-audience.json`, validated by `node scripts/receipt.mjs`.

| sabotage | what it did | caught |
|---|---|---|
| 0 | **the real one** — ran the check against the still-deployed v50 | **yes** — 5 red, naming both leaked lines and the phone number |
| 1 | made the comparator blind (`leaked = () => []`) | **yes** — canary red, and `receipt.mjs` refused the receipt |
| 2 | made the subtraction yield zero targets | **yes** — 2 red and **no receipt written at all** |
| 3 | a half-fixed server: phone withheld, name still in `SUMMARY` | **yes** — 2 red, caught by the line-level target the named-value assertion missed |

Sabotage 3 is the one worth keeping: the assertion that looks for
`Customer: <name>` passed, and only the discovered-by-subtraction target caught
it. That is the argument for never naming a field.

**`tests/ics-and-notifications.test.mjs` was updated in the same edit** — three
of its fetches asked for `audience=owner` with an anon key, which is precisely
what no longer works. It signs the owner in for those, drops the audience from
the Phoenix fixture nobody is a member of, and carries one new line asserting
the flip. 33 passed, 0 failed.

**Ran green alongside:** `composition` 97, `landing-pricing` 109,
`route-contract` 34, `design-contrast` all pairs.

| surface | proven | at | invalidated by a change to |
|---|---|---|---|
| **the calendar link's owner view** | anonymous `audience=owner` returns the customer's copy; signed-in member still gets the owner's | 2026-09-16, `2a10b86`, fn v51 | `supabase/functions/booking-ics/**`, `app/src/lib/api.js`, `app/src/components/BookingDetail.jsx` |

## 14.3 · EVERY EMAIL LEAVES A ROW, AND THE ROW SAYS WHAT BECAME OF IT — 2026-09-16, at `2a10b86`

**What was there before, measured.** Nothing. `platform_email_days` is a daily
counter holding no recipient and no outcome; `send-email` received Resend's
message id and returned it to its caller without storing it; three of the
function's exits wrote a `console.warn` or `console.error` and nothing else.
So *"I never got the confirmation"* had no answer anywhere in the system.

**What was proven, on the deployed functions.** A real product action — the
detailer pressing **Email invoice** on a finalised demo booking — run three
times against three different addresses.

| | before | after |
|---|---|---|
| rows recorded per send | **0** | **1** |
| sends the platform counter saw | 4 | 4 |
| rows written in the same window | **0** | **6** |
| sends that reached the provider with no record | **all of them** | **0** |

The six rather than four is the point: the two extra are the sends that never
reached the provider (a reserved domain), which is exactly the half that used
to be silent. Raw rows: `artifacts/email-sends/rows.json`.

**The reconciliation is the measurement, and it uses two independent records.**
The check never names an email kind. It reads `platform_email_days` — the
counter `send-email` has bumped on every send since roadmap 8.6, untouched by
14.3 — drives real sends, reads it again, and requires a row for each. Add a
seventeenth template tomorrow and the counter counts it, so the check grows a
target by itself. Fooling it would mean editing the quota machinery.

**The delivery half, six signed events against the live endpoint.**

| event | result |
|---|---|
| `email.delivered`, correctly signed | 200, matched 1, row reads **delivered** |
| `email.bounced`, correctly signed | 200, matched 1, row reads **bounced** with the provider's words |
| the same bounce signed with the **wrong secret** | **400 Bad signature**, target row untouched |
| a genuine signature **six minutes old** | **400 Signature timestamp outside tolerance** |
| `email.opened` — a type we do not model | 200, acknowledged, nothing written |
| a **late** `email.delivered` on the bounced row | 200, **matched 0** — the bounce stands |

**And the banner that has existed since 2.20 finally sees a real bounce.**
`customers.email_failed_at` draws *"This address bounced"* on the client record
and `send-campaign` filters on it — and it was stamped ONLY when Resend refused
a message synchronously. **Most bounces are not synchronous**: a mailbox that
does not exist is usually accepted first and rejected minutes later. So the
flag was in the right place and could not see the common case. It is now
stamped from the webhook as well, for `bounced` and deliberately not for
`complained` (that address works; the person does not want the mail).

**What the screen shows, looked at rather than assumed.** Client record → under
History → **Emails**: subject, then date · outcome · reason. Measured on the
running app at **1920, 1440, 768, 392 and 320**: 12 rows, no text clipped
against its own box, no sideways scroll at any width, and the only console
output is the two React Router v7 future-flag warnings this app prints on every
screen. `Delivered` carries a grey tick, `Bounced` and `Not sent` carry the
fixed red `--bad` alert and the word in red, `On its way` carries neither —
which is the correct asymmetry, because you only need drawing to the bad ones.
Shots: `artifacts/email-sends/emails-*.png`.

**One defect found by looking, which nothing in this repo could have caught.**
At 392 the line read *"that address cannot receive e…"*. `.row-item .sub` clips,
and `theme.css` carries the warning in its own words — *"Nothing in this repo
can see this failing: clipped text has a perfectly normal box."* Fixed with the
existing `.clamp2`, not `.full`: the tail of that line is the PROVIDER's
wording capped at 200 characters, and an unbounded row is six lines on a phone.

**The body is not stored, and that is a decision.** Every email is generated
from a template plus the booking, so it is reproducible from data already here
(`scripts/render-emails.mjs` does it). A stored copy would put the customer's
name, address and phone into a second table with its own retention question and
its own leak surface, to show the detailer something they can already see. 14.1
and 14.2 were both about a reply carrying more than the screen draws.

**The row is read-only to every browser, including the owner's.** RLS chooses
rows and never columns, so the policy is `for select` alone and
`insert, update, delete` are revoked from `authenticated` and `anon` — the
`verified_at` rule from 4.4. Without it a detailer's browser could mark its own
bounced send as delivered.

**The checks, broken on purpose four times before being trusted.**
`tests/email-sends.test.mjs` — 33 assertions, 4 discovered targets, receipt
`receipts/email-sends.json`. `tests/svix-signature.test.mjs` — 21 assertions,
credential-free, and it **imports `_shared/svix.ts` and runs it** rather than
grepping it, which is why the verifier lives in its own import-free file
(CLAUDE.md trap (k), the lesson `_shared/stripe.ts` wrote down).

| sabotage | what it did | caught |
|---|---|---|
| 1 | **the 14.3 defect restored** — the successful send stopped recording, **and it was deployed** (v64) | **yes** — 3 red, and the receipt validator refused the run |
| 2 | the signature check skipped in `resend-webhook`, **deployed** | **yes** — 3 red, and the forged bounce visibly changed a delivered row |
| 3 | the out-of-order guard removed, **deployed** | **yes** — 2 red; a late `delivered` un-bounced a bounced address |
| 4 | the RLS policy widened from `for select` to `for all` | **yes** — 1 red |

Sabotage 2 is the one worth keeping: it does not merely fail, it shows the
damage — a record that said *delivered* was rewritten to *bounced* by a
stranger's forged event.

**And one assertion in this check was wrong and said so.** The first version
tested `!/for all/` against the migration and failed on the migration's own
COMMENT explaining why there is no `for all` policy — a check reading prose as
if it were code. It now matches the statement. It is written down because it is
`docs/gotchas.md`'s grep-coupled-to-a-spelling class, caught by the check going
red rather than by somebody noticing months later.

**Not built, and named rather than left implied:** the message preview Andrew
raised and talked himself out of in the same breath; the same list in the BACK
OFFICE, which is what roadmap 3.1 still asks for; the link from a row to its
BOOKING (the relay is never told which booking it is sending about, so wiring
that means touching sixteen call sites, not one file); and `delivery_delayed`
and `suppressed`, which `resend-webhook` explains.

**Andrew has a three-minute job before the delivery half works in production**
— point Resend's webhooks at the endpoint and paste the signing secret.
`FOR-ANDREW.md`, first row. Until then nothing breaks: every email still leaves
a row, the rows simply stay at *"On its way"*.

**Ran green alongside:** `composition` 97, `landing-pricing` 109,
`route-contract` 34, `design-contrast` all pairs, `campaign` 16,
`ics-and-notifications` 33, `ics-audience` 20, `receipt-fields` 51, and all
4 receipts valid.

| surface | proven | at | invalidated by a change to |
|---|---|---|---|
| **every send leaves a row** | counter 4, rows 6, unaccounted 0 | 2026-09-16, `2a10b86`, send-email v65 | `supabase/functions/send-email/**`, any new email path that bypasses the relay |
| **the provider's outcome reaches the row** | 6 signed events, 2 forgeries refused | 2026-09-16, `2a10b86`, resend-webhook v6 | `supabase/functions/resend-webhook/**`, `supabase/functions/_shared/svix.ts` |
| **the detailer can see it** | 12 rows at 5 widths, nothing clipped | 2026-09-16, `2a10b86` | `app/src/screens/Clients.jsx` |

---

## 14.4 · CANCELLING A PAID BOOKING NOW TELLS SOMEBODY ABOUT THE MONEY — 2026-09-17, at `2a10b86`

**What was there before, measured against the deployed function.** A confirmed
booking already marked `paid`, worth **$195** at the detailer's agreed final
amount, cancelled by an **anonymous caller with no apikey and no Authorization
header** — which is the customer clicking the link in their own email:

```
POST /functions/v1/cancel-booking   {"booking_id":"dbfb72f9…"}
200  {"success":true,"booking":{"id":"dbfb72f9…","status":"cancelled"}}
```

Not a word about money. `payment_status` was `paid` before and `paid` after;
`final_amount` was 195 before and 195 after. Nothing refunded it, nothing
flagged it, and nothing told the detailer that $195 was sitting in their Stripe
balance for work that will not happen. The same call, on the same shape of
booking, after the fix:

```
200  {"success":true,"booking":{…"status":"cancelled"},
      "refund":{"owed":true,"message":"You paid for this booking. Coastline
      Auto Detailing will arrange your refund directly — call 562-555-0180 if
      you have not heard from them."}}
```

Both runs in full: `artifacts/cancelled-refund/before.json` and `after.json`,
each carrying the row before and the row after. A third run,
`after-unpaid-control.json`, is the control — an unpaid booking cancelled on the
same deployed version answers `"refund":{"owed":false,"message":null}`, so a
clean verdict means the product *decided*, not that it says this to everybody.

**THE FIX IS AN INSTRUCTION, NOT A REFUND, AND THAT IS THE REPO'S OWN
REASONING.** The charge was a direct charge on the detailer's own connected
account. `_shared/connect.ts` is entirely about why this platform must never
hold or move that money — doing so makes it a money transmitter and puts it
between a detailer and their own customer. So the platform **cannot** give it
back, and pretending otherwise would be worse than silence. What it can do is
put the sentence in front of the one person who can act on it. ROADMAP 14.4
offered blocking the cancellation instead; that was not taken, because a
customer who wants out should get out.

**THERE ARE THREE CANCEL PATHS, NOT TWO** — the ground read before this work
named two. Measured: `update-booking` carries `"status"` in its editable-field
allowlist, so the detailer's own **Cancel the job** button is a third writer,
alongside `cancel-booking` (the customer's link) and `respond-to-booking`'s
decline branch. **And the decline branch is genuinely reachable with money on
it**: `payability()` refuses to charge a `pending` request, but
`update-booking`'s allowlist also carries `payment_status`, with no status guard
— so a detailer who takes cash for a request up front, then declines it, lands
exactly there. Checked rather than assumed.

**Two of the three send the detailer no email at all.** That is why the
instruction is drawn from the ROW on the job screen rather than passed back by
whichever endpoint did it — one condition on `status` and `payment_status`
covers all three, including any fourth added later.

| where | who reads it | says |
|---|---|---|
| owner's cancellation email | the detailer, when the customer cancelled | *This was paid. Refund $195 from your own Stripe — the money went straight into your account, so we cannot send it back for you.* |
| the job screen, pinned bar | the detailer, on all three paths | the same sentence, in `var(--bad)`, above the action buttons |
| the endpoint's answer | the customer, at the moment they cancel | *You paid for this booking. ‹business› will arrange your refund directly — call ‹phone›…* |

The customer is never handed the detailer's version, and the check asserts it:
it names Stripe and it names their balance.

**THE FIGURE IS `amountDueCents`, NOT `total_price`.** The fixture is quoted
$180 and charged $195 on purpose, so a regression to the quote prints a
different number rather than the same one. Three assertions fail if it moves.

**One defect in this work was found by looking at the screen, not by a test.**
The first version formatted the money itself with `toFixed(2)` and printed
*"Refund $195.00"* into an email whose own facts table two rows above says *"Was
worth $180"*, onto a job screen that says *"charged $195"* an inch below. Both
of this product's money formatters drop the cents on a whole number, so a third
rule invented inside `connect.ts` was wrong on every surface at once.
`refundInstruction` now takes the caller's formatter — CLAUDE.md's *one
formatter each* — and the check compares against `money(195)` rather than a
literal, so the two cannot drift.

**Seen, not assumed.** The job screen at **1920, 1440, 768, 392 and 320**, and
at 392 with `?lite=1`. Nothing clipped, no sideways scroll at any width, the
instruction 284px wide inside a 320px viewport. Contrast **4.95:1** at 13px on
the composited background, over the 4.5:1 floor — measured by compositing three
translucent layers, because a first probe read `color(srgb … / 0.09)` as opaque
and reported a ratio of 590 million. **Zero console errors** in a clean tab; the
432 refused loads in the older tab were stale from before the dev server was
listening, which a fresh tab settled.

**The check, broken on purpose seven times before being trusted.**
`tests/cancelled-refund.test.mjs` — 48 assertions, 4 targets, receipt
`receipts/cancelled-refund.json`. Its targets are **every value
`bookings.payment_status` is allowed to hold**, read off the migration's CHECK
constraint rather than typed in, so a fifth state added tomorrow is discovered,
finds no expectation written for it, and fails. It **runs** `connect.ts` and
**renders** `cancellationEmail` rather than grepping them.

| sabotage | what it did | caught |
|---|---|---|
| 1 | **the 14.4 defect itself, live** — the check run against the real unfixed deployment | **yes** — 6 red |
| 2 | the instruction dropped from the owner's email template | **yes** — 3 red |
| 3 | `refundOwed` returns "nothing owed" for a paid booking | **yes** — 6 red |
| 4 | the figure reads `total_price` instead of `final_amount` | **yes** — 3 red; it printed **$180**, fifteen dollars short |
| 5 | the job screen stops drawing for `partial` | **yes** — 1 red |
| 6 | **the comparator blinded** — `ownerTellsThem` always true | **yes** — 3 red, and **the canary caught itself** |
| 7 | a payment state with no expectation written for it | **yes** — 3 red |

Sabotage 6 is the one worth keeping: it proves the canary is load-bearing
rather than decoration. Sabotage 4 is the other — it fails with a *plausible*
number, which is the shape that survives review.

**What this does NOT do, named rather than left implied.** A customer who
reopens their cancelled link **later** is told nothing about their money: the
sentence is shown at the moment they cancel, because `get-booking-receipt` does
not carry `payment_status` and must not start to — 14.1 narrowed that reply to
31 named fields on purpose. The detailer has no such gap; theirs is drawn off
the row. Nothing was refunded, by design. And `respond-to-booking` grew no owner
email — the detailer is standing at the screen when they decline, and the screen
now says it.

**Test data left in place, flagged, per ROADMAP 0.3.** Five bookings named
`ROADMAP 14.4 TEST …` and `ROADMAP 14.4 CHECK …`. The four CHECK rows are the
suite's own fixtures and it resets them to `confirmed` on each run rather than
creating more.

| surface | proven | at | invalidated by a change to |
|---|---|---|---|
| **a paid cancellation reaches the detailer** | before/after on the deployed endpoint, $195 | 2026-09-17, `2a10b86`, cancel-booking v68 | `supabase/functions/cancel-booking/**`, `_shared/connect.ts`, `_shared/emailTemplates.ts` |
| **all four payment states answered correctly** | 4 live cancellations, 48 assertions | 2026-09-17, `2a10b86`, cancel-booking v68 | the `payment_status` CHECK constraint |
| **the detailer sees it on the job** | 5 widths + `?lite=1`, 4.95:1, 0 console errors | 2026-09-17, `2a10b86` | `app/src/components/BookingDetail.jsx` |
| **the customer is not handed the detailer's copy** | no `Stripe` anywhere in the public answer | 2026-09-17, `2a10b86`, cancel-booking v68 | `supabase/functions/cancel-booking/**` |

## 14.5 · A PAYMENT HAS NOW ACTUALLY SETTLED — 2026-09-17, at `2a10b86`

**What was true before, counted rather than characterized.** 566 money
assertions passed in this repo and **not one of them touched a network** —
`connect.test.mjs` 126, `payments.test.mjs` 83, `platform-billing.test.mjs`
357, zero `fetch(` between them. They import `payability`, `amountDueCents`,
`cardStatus` and `verifyWebhook` and exercise them directly, which is good work
and all of it correct. What none of them could say is whether a payment
**settles**. Measured in the development database before this work:

| | rows |
|---|---|
| `connected_accounts` | **0** |
| bookings with a `stripe_session_id` | **0** |
| bookings with a `stripe_payment_intent` | **0** |

**The customer-pays-the-detailer half of this product had never run once, in
any environment.** The *other* half had — 66 recorded `stripe_events`, all
subscription and invoice traffic on the platform's own account. That is the
trap this entry exists to close: a healthy billing endpoint says nothing at all
about `pay-booking`, which shares a URL with it and almost nothing else.

### THE RUN, WITH ITS NUMBERS

```
pay-booking   -> https://checkout.stripe.com/c/pay/cs_test_…   amount_cents 19500
card          4242 4242 4242 4242 typed into Stripe's hosted page
Stripe        evt_3UGa9SJeoZ7g84se13ptuECc  payment_intent.succeeded    07:54:39
              evt_1UGa9TJeoZ7g84segAuYMaKN  checkout.session.completed  07:54:39
booking       payment_status paid · pi_3UGa9SJeoZ7g84se1Torfagi · paid_online_at 07:54:40
Money screen  waiting on payment  $490 -> $295
```

Both event ids carry the connected account's own suffix `84se`, so these are
**connected-account** events reaching `handleConnected()`, not platform ones.
The customer's receipt page said *"Thank you. Your card payment went through
and your receipt is on its way by email."* Seen on the Money screen with the
period on September 2026: **WAITING ON PAYMENT · $295**, three rows — Priya
Anand $120, Dana Ruiz $110, the canary fixture $65 — and the $195 job absent.

### FOUR THINGS THIS FOUND THAT NO DOCUMENT HERE KNEW

1. **THE CONNECT WEBHOOK IS LIVE AND WAS BELIEVED NOT TO BE.**
   `docs/OUTSTANDING.md` § 13 records `STRIPE_CONNECT_WEBHOOK_SECRET` as *"not
   set yet"* with deliveries 0/0, and warns that Stripe disables an endpoint
   after about three days of failures. It is set, the endpoint is listening to
   the payment events and not only `account.updated`, and the first delivery it
   ever accepted was `evt_1UGZ8GQrzxoETEQU…` at 06:49 today. **That section is
   out of date and the deadline in it has already been met.**
2. **A CONNECTED ACCOUNT FROM STRIPE'S "USE BLANK ACCOUNT" SHORTCUT CANNOT
   CHARGE.** The OAuth consent screen in test mode offers *"Skip setup by
   connecting a blank test account"*; it returns a real `acct_…`, and
   `charges_enabled` is **false** and stays false. `cardStatus` correctly
   refuses to show a Pay button for it. Anybody testing Connect by that route
   will conclude the product is broken. It is not.
3. **CHECKOUT DOES NOT OPEN ON THE CARD FORM.** This connected account has
   Link, Cash App, Affirm and Klarna enabled, so Stripe Checkout opens on
   Link's phone-number step and **the card inputs are not in the document at
   all**. A script that fills `#cardNumber` on that page fills nothing and
   Stripe answers *"Payment method Required"* — which reads exactly like a
   declined card and is nothing of the kind. Cost two runs.
4. **`pay-booking`'s IDEMPOTENCY KEY MAKES A NAIVE RE-RUN IMPOSSIBLE.** The key
   is `pay:<booking id>:<cents>`, correct for a customer who double-taps, and
   it means Stripe answers the same key with the SAME session for 24 hours.
   Resetting a fixture row to `pending` and running again therefore hands the
   check a completed session that cannot be paid. The check creates a **new
   booking every run** and soft-deletes the last one.

### THE CHECK, AND TWO OF ITS SABOTAGES WERE THEMSELVES WORTHLESS

`scripts/e2e-payment.mjs` — six targets, 22 assertions, receipt
`receipts/e2e-payment.json`, artifacts `artifacts/e2e-payment/`. It refuses any
project but the development one, and with no credentials it prints SKIPPED and
writes **no receipt**.

**THE FIRST TWO SABOTAGES PASSED, AND THAT WAS A DEFECT IN THE CHECK.** Both
merely *loosened an assertion that was already satisfied*: `--break=amount`
compared the outstanding total against `>= $180` instead of `>= $195`, and the
demo's other unpaid jobs make both true; `--break=session` accepted any URL,
and the URL was a real one. **A sabotage has to change what is compared, not
how loosely.** Both were replaced, and the § 2 assertion they exposed — which
could not fail — was rewritten to read the figure on that one row.

| sabotage | what it does | caught |
|---|---|---|
| `amount` | the check measures against the **$180 quote** instead of the $195 agreed; the product is untouched | **yes** — 3 red, including *"it is priced at $180 got 19500"* |
| `nopay` | the card is never typed; nothing else changes | **yes** — 5 red across §§ 5 and 6 |
| `webhook` | § 5 declares the booking paid without waiting for Stripe, **and no payment is made** | **yes** — § 5 goes green on the lie and **§ 6 catches it**, 2 red |
| `stale` | § 6 compares the after-total against itself, the classic dead delta | **yes** — 1 red, *"it fell by $0"* |
| `canary` | stands in a product where a **declined** card marks a booking paid | **yes** — and `receipt.mjs` refused the whole run |
| ~~`amount`, first version~~ | loosened a `>=` that was already true | **NO** — replaced |
| ~~`session`, first version~~ | accepted any URL, and the URL was valid | **NO** — replaced |

The canary is a real declined payment on the real connected account
(`4000 0000 0000 0002`), given the same 25 seconds Stripe took to deliver the
successful one, and the booking must still read `pending`.

### WHAT THIS DOES NOT DO, NAMED RATHER THAN LEFT IMPLIED

- **The connected account was attached by writing the row, not by OAuth.** The
  handshake itself was exercised end to end earlier the same morning and works
  — consent screen, `code`, `oauthToken`, `acct_…` stored — but it yields the
  blank account of finding 2, which cannot charge. So the row was pointed at
  `acct_1UCMp1JeoZ7g84se`, a Standard test account already present in this
  Stripe sandbox since 2026-09-08. **`connect-account`'s `refresh` then asked
  STRIPE**, and Stripe's own answer is what set `charges_enabled` — the value
  is measured, not typed in. The one leg never run by a machine here is a
  detailer completing Stripe's onboarding, which is Stripe's screen and not
  this product's.
- **Nothing was refunded and no payout was checked.** The money sits in the
  connected account's test balance. Payouts are Stripe's and are not this
  product's code.
- **No email was sent.** `handleConnected()` marks the row and sends nothing.
- **Test data left in place, flagged, per ROADMAP 0.3.** Bookings named
  `ROADMAP 14.5 PAY` and `ROADMAP 14.5 CANARY`; every run soft-deletes the
  previous pair. The demo business is left connected with card payments **on**.

| surface | proven | at | invalidated by a change to |
|---|---|---|---|
| **a customer's card actually settles** | `pi_3UGa9SJeoZ7g84se1Torfagi`, $195, Stripe test mode | 2026-09-17, `2a10b86` | `supabase/functions/pay-booking/**`, `_shared/stripe.ts` |
| **the real webhook marks it paid** | two connected-account events, row paid one second later | 2026-09-17, `2a10b86` | `supabase/functions/stripe-webhook/**`, the Stripe endpoint's event list |
| **the Money screen moves by the right amount** | $490 to $295, seen on the screen and in its own query | 2026-09-17, `2a10b86` | `app/src/screens/Money.jsx` |
| **a declined card changes nothing** | canary, `4000…0002`, row still `pending` | 2026-09-17, `2a10b86` | `supabase/functions/stripe-webhook/**` |


---

## 14.6 · ALL TEN OF THE NEVER-RUN FEATURES HAVE NOW RUN — 2026-09-17, at `2a10b86`

**THE LIST WAS RE-MEASURED BEFORE IT WAS TRUSTED, AND IT WAS ONE ROW OUT OF
DATE.** ROADMAP 14.6 named ten tables at zero. Counted again at the start of
this work:

| table | rows at the start |
|---|---|
| `connected_accounts` | **1** — 14.5 put it there the day before |
| every other one of the ten | **0** |

So **14.5 moved ONE of these ten, not two.** The card payment it proved is
real, and it is not one of these tables — it lands on
`bookings.stripe_payment_intent`. Saying "two of the ten ran yesterday" would
have been half true and would have quietly excused a table that was still
empty. **Nine were still at zero, and all nine have now run.**

### WHAT "A REAL RUN" WAS HELD TO MEAN, BECAUSE IT IS THE WHOLE VALUE

**NO FEATURE ROW IN EITHER CHECK IS WRITTEN WITH THE SERVICE KEY.** An
admin-key insert proves the column names and nothing else — it skips
row-level security, which is the half of these features most likely to be
wrong and the half no unit test touches. Every row below went in through **the
demo owner's own signed-in session**, over the same wire calls `supabase-js`
makes from the dashboard, or through the product's own endpoint. The service
key appears only for fixture housekeeping and for reading back what the
customer's side did.

**AND EVERY TARGET ASSERTS THE CONSEQUENCE, NOT ONLY THE ROW.** A row nothing
reads is not a feature.

| table | the row | and the consequence that was checked |
|---|---|---|
| `dropoff_only_periods` | owner's session, 2026-11-04 | `available-slots` returns `dropoff_only: true` and **no mobile time at all**; `create-booking` refuses a mobile job with *"That day is drop-off only"* (409) |
| `booking_line_items` | an `add_on` $45 **and a `custom` $30**, on a finished job | `advancedMoney` — the Money screen's own function — puts the figure **exactly $75 higher** than the same call without those two lines. The `custom` is the finalize form's own default and was counted as $0 until this item; see finding 1 |
| `job_photos` | private bucket, owner's session | a signed link serves back **the same 160 bytes**, and the same path answers non-200 without the link |
| `gallery_images` | public bucket, owner's session | a **signed-out** fetch of the row's own URL returns the photo |
| `site_intake` | answers + step 3 | reads back the typed answer, keeps a multi-choice answer as a list, resumes at the step, and `submitted_at` is still null — a draft is not a brief |
| `translations` | 91 rows, `translate-content` for real | `get_business_translations` answers a **signed-out customer** in Spanish, and the business's NAME is not in the table |
| `owner_push_subscriptions` | a real endpoint on `wns2-by3p.notify.windows.com` | a customer books, and the detailer's device **shows the notification**, naming that customer, tagged with that booking |
| `platform_subscriptions` | $35 booking plan, `active` | the row carried the plan, the price and the consent sentence **before** the card was typed, and Stripe's own webhook turned it active |
| `platform_invoices` | `LGOU3CDN-0006`, 3500 cents, `paid` — the first of nine, one per run that paid | Stripe's own document, created after this run began and carrying Stripe's own numbering |

### THE TWO CHECKS, AND EVERY SABOTAGE THEY WERE BROKEN WITH

`scripts/e2e-ten-features.mjs` — six targets, 42 assertions, receipt
`receipts/e2e-ten-features.json`, artifacts `artifacts/e2e-ten-features/`.
Credentials only, no dev server. Refuses any project but the development one;
with no credentials it prints SKIPPED and writes **no receipt**.

`scripts/e2e-browser-features.mjs` — three targets, receipt
`receipts/e2e-browser-features.json`, artifacts
`artifacts/e2e-browser-features/`. Needs the dev server and Microsoft Edge, and
refuses (does not skip quietly) if either is missing.

**14.5 RECORDED THAT TWO OF ITS SEVEN SABOTAGES WERE THEMSELVES WORTHLESS —
both only loosened an assertion that was already satisfied. Every sabotage
below changes WHAT IS COMPARED, never how loosely**, and each one was run and
watched to fail.

| check | sabotage | what it changes | caught |
|---|---|---|---|
| ten-features | `otherday` | asks the drop-off question about the day the period does NOT cover; the product still refuses mobile on the 4th | **yes** — 3 red |
| ten-features | `noitems` | hands the Money screen's own arithmetic an EMPTY line-item list while the row really is in the database | **yes** — 2 red |
| ten-features | `wrongbytes` | compares the stored photo against a DIFFERENT image of the same length, and asks the gallery for a key nothing uploaded | **yes** — 3 red |
| ten-features | `wrongnonce` | reads the questionnaire back against a value nobody wrote | **yes** — 1 red |
| ten-features | `english` | asks the customer's own endpoint for `en`, which is the key the SOURCE is stored under | **yes** — 2 red |
| ten-features | `canary` | stands in a product whose tables are open to anybody | **yes** — `receipt.mjs` refused the whole run |
| browser | `nopush` | the device never subscribes; nothing else changes | **yes** — 6 red, including the row count |
| browser | `wrongcustomer` | looks in the DELIVERED notification for a customer who was never booked | **yes** — 1 red, and see below |
| browser | `nopay` | the card is never typed; the product is untouched | **yes** — 7 red, and see below |
| browser | `wrongplan` | measures against the WEBSITE plan's $60 while the product charges the booking plan's $35 | **yes** — 5 red across all three targets |
| browser | `canary` | stands in a product where a stranger can register a device or start a plan | **yes** — `receipt.mjs` refused the whole run |

Two of them deserve naming, because they are the shape 14.5 got wrong.
`noitems` and `english` do not touch the product at all — one changes WHAT IS
SUMMED and the other WHICH LANGUAGE IS ASKED FOR. Neither loosens a comparison
that was already true, which is what made 14.5's first `amount` and `session`
sabotages worthless.

**ONE SABOTAGE WAS CONSIDERED AND DELIBERATELY NOT WRITTEN.** The deepest lie
either check could tell is *writing the feature rows with the service key* —
the tables would fill identically and every downstream assertion would still
pass. **Nothing could catch it**, because a row carries no record of which key
put it there. So it is a limitation stated here rather than a test pretending
to cover it; what actually holds the claim up is the code path (`own()` for
every feature row, never `svc()`) and the canary proving row-level security is
switched on at all.

**AND TWO OF THESE SABOTAGES DID NOT COUNT ON THEIR FIRST RUN, WHICH IS THE
POINT OF RUNNING THEM.**

- **`wrongcustomer` went red for the wrong reason.** The notification did not
  arrive at all that run, so the three red lines were the flake in finding 3
  below and not the assertion under test — it had never been asked whether it
  could tell one customer's name from another. Counting that as *caught* would
  have been 14.5's mistake in a new coat. It was re-run until the notification
  DID arrive, and then it went red on exactly one line: *"it names the customer
  who booked"*, beside a notification correctly naming the real one.
- **`nopay` found that THREE OF THIS CHECK'S OWN ASSERTIONS COULD NOT FAIL.**
  § 3 asked whether the business had an invoice at all and took the newest
  one — so with no payment made and no invoice created, it went GREEN on an
  invoice a previous run had left behind. A fourth line, *"it belongs to the
  subscription that was just paid"*, compared a column `platform_invoices` does
  not have, guarded by an `||` that made it true whatever happened. The section
  now demands an invoice created **after this run started**, and asserts
  Stripe's own invoice number. Re-run against the corrected file, `nopay`
  produces **7 red** including all four.

Both canaries are the same negative control and it is the one that decides
whether any of the above is evidence: **a signed-out stranger must be
refused.** Every green here is a claim about WHO made the row, and that claim
is worth nothing if anybody could have. Both strangers were refused 401.

### FIVE THINGS THIS FOUND THAT NO DOCUMENT HERE KNEW

1. **TWO COPIES OF THE SAME LIST HAD DRIFTED, AND ONE OF THEM COUNTED THREE
   CATEGORIES THAT CANNOT EXIST.**

   ```
   the database allows                 service, upgrade, add_on, custom, travel_fee, tip, discount
   FinalizeModal.jsx offers                     upgrade, add_on, custom, travel_fee, tip, discount
   Money.jsx counted (correct)                  upgrade, add_on, custom, travel_fee,      discount
   moneyAdvanced.js counted (wrong)                      add_on, upsell, surcharge, adjustment
   ```

   `upsell`, `surcharge` and `adjustment` are refused outright by
   `booking_line_items_category_check` — the first insert this repo ever
   attempted with one came back `23514`. **The tile a detailer actually taps,
   *"Added on site"* on the Money screen, was RIGHT.** The wrong list fed *"The
   full picture"*: its *"Sold at the job"*, its quoted-vs-added bar and its
   *"Sells an extra"* percentage. The same three words, two different figures,
   two screens. The comment in `moneyAdvanced.js` promised the two lists "move
   together" — they had not, and nothing could tell, because
   `booking_line_items` was empty until this item put a row in it.

   **AND ON THE DEMO DATA THE WRONG FIGURE WAS NEVER VISIBLE**, because *"The
   full picture"* hides its rates below eight finished jobs and this business
   has six. That is why it survived: not hidden in code, hidden behind a floor.

   **FIXED THE SAME DAY, on Andrew's ruling:** *"anything beyond the base price
   — any upgrade of either package, add-on, a travel fee, whatever — counts as
   more money we made."* `ON_SITE` is now exported from `moneyAdvanced.js` and
   imported by `Money.jsx`, so a second copy cannot exist. A discount is
   negative and nets against the rest; a tip stays out, because it is not a sale
   and counting it would show the same dollar twice. Recorded at ROADMAP 14.6a,
   proved by `tests/money-advanced.test.mjs` § 10 (four sabotages, all caught)
   and by this check's own § 2, which now adds an `add_on` AND a `custom` and
   requires $75 — against the old code it reads $45 and names the reason.
   **Seen on the screen at 1440x900 and 392x844, no console errors:** BROUGHT
   IN $810, QUOTED UP FRONT $735, ADDED ON SITE +$75.

2. **A HEADLESS PUSH TEST NEEDS A BRANDED BROWSER AND A PERSISTENT PROFILE,
   AND NEITHER IS OPTIONAL.** In order: Playwright's bundled Chromium in an
   ordinary context prints *"Chrome currently does not support the Push API in
   incognito mode"* and then `AbortError: Registration failed - permission
   denied` — every Playwright context is incognito-shaped, so granting the
   permission does not help. The same Chromium with `launchPersistentContext`
   clears that and hits `Registration failed - push service not available`:
   plain Chromium has no push credentials compiled in. `channel: "chrome"` is
   not installed on this machine. **`channel: "msedge"` with a persistent
   profile subscribed on Microsoft's own service first time.**

3. **PUSH DELIVERY IS VARIABLE, AND A CHECK THAT READS ONE MISS AS A DEFECT
   WILL LIE ABOUT THE PRODUCT.** Measured over seven runs against unchanged
   code: **five delivered in seconds; two delivered nothing inside 36–60
   seconds.** The run immediately after each miss, with nothing altered,
   delivered normally. A diagnostic added for the second miss reported the
   worker **registered, active, subscribed and permitted** at the moment
   nothing arrived — so the browser half was intact and the variable is
   Microsoft's push service. **The first explanation offered was that stale
   device rows from earlier runs were starving the live one, and that was a
   guess and it was wrong**: one miss happened with four stale rows and one
   with none. It is written down as wrong because the next person will reach
   for the same theory. The wait is 60 seconds, and a miss here is worth
   re-running before it is worth investigating.
   *(The check does clear its own previous devices, which is ordinary fixture
   housekeeping — each run is a new throwaway profile — but it is not the
   fix for this and is no longer described as one.)*

4. **A CHECK THAT NEVER PRESSED THE BUTTON REPORTED A BROKEN PRODUCT.** The
   first version of the billing section located Pay by its text, clicked
   something that was not it, and failed sixty seconds later with *"the
   subscription went active: incomplete"*. `Billing.jsx`'s `confirm()` opens
   with `if (!stripeRef.current) return;`, so a press that does not land
   produces **no error, no spinner and no navigation** — it is
   indistinguishable from a product that ignored the button. The press is now
   verified against three possible endings (Stripe navigates away, the label
   turns to *One moment*, or the screen paints a refusal) and the run says so
   out loud.

5. **AND THE CHECK ITSELF SHIPPED THREE ASSERTIONS THAT COULD NOT FAIL.**
   Recorded here rather than quietly fixed, because it is the fourth time this
   repo has found one and the pattern is always the same: **an assertion whose
   subject is "any row" rather than "the row this run made".** § 3 asked
   whether the business had an invoice, not whether THIS run produced one, and
   a previous run's invoice satisfied it. The fix is a `created_at` filter on
   this run's own start time — there is nothing older for it to fall back on.
   **A sabotage found it; reading the file twice had not.**

### WHAT THIS DOES NOT DO, NAMED RATHER THAN LEFT IMPLIED

- **Neither file presses the buttons.** Six of these features are written by
  the browser client, so the wire call is identical — but `FinalizeModal`,
  `DaySheet`, `SiteIntake`, `Gallery` and `JobPhotos` are not exercised as
  forms. `shrink()` in `lib/photos.js` is browser-only (canvas plus EXIF
  orientation) and is skipped: the bytes that go up are a real JPEG, just not
  one a canvas re-encoded.
- **The check cannot tell an owner-written row from a service-written one**
  after the fact, for most of these tables. What makes the claim stand is the
  code path (`own()` for every feature row, never `svc()`) plus the canary
  proving row-level security is on at all. A sabotage for this was considered
  and refused: it would be uncatchable by construction, which makes it a
  limitation to state rather than a test to write.
- **Nothing was refunded and no subscription was cancelled at the end.** The
  demo business finishes subscribed, `active` on the $35 booking plan in Stripe
  TEST mode. Each run cancels the previous one first, so they do not pile up.
  Its `plan_tier` was already `founding`, and the booking plan never claims a
  founding spot, so **none of the three spots was consumed**.
- **Test data left in place and flagged, per ROADMAP 0.3.** Rows named
  `ROADMAP 14.6 …`, storage under `roadmap-14-6/`, and a booking named
  `ROADMAP 14.6 PUSH` that is soft-deleted when the run ends.

| surface | proven | at | invalidated by a change to |
|---|---|---|---|
| **a drop-off-only day refuses a mobile booking** | 409, *"That day is drop-off only"*, on 2026-11-04 | 2026-09-17, `2a10b86` | `supabase/functions/_shared/slotValidation.ts` |
| **work added at the car moves the Money screen** | `advancedMoney` exactly $45 higher with the line than without | 2026-09-17, `2a10b86` | `app/src/lib/moneyAdvanced.js`, the `booking_line_items` constraint |
| **a job photo survives the round trip** | 160 bytes back through a signed link; non-200 without it | 2026-09-17, `2a10b86` | `app/src/lib/photos.js`, the `job-photos` storage policy |
| **a gallery photo is public** | signed-out fetch returns the bytes | 2026-09-17, `2a10b86` | `app/src/lib/upload.js`, the `business-media` policy |
| **the website questionnaire saves and resumes** | answer, list, step 3, `submitted_at` null | 2026-09-17, `2a10b86` | `app/src/screens/SiteIntake.jsx`, `site_intake` policies |
| **a Spanish customer gets the detailer's own words** | 90 rows; `get_business_translations` answers signed-out | 2026-09-17, `2a10b86` | `supabase/functions/translate-content/**`, `_shared/translate.ts` |
| **a booking lights up the detailer's phone** | WNS endpoint, notification naming the customer and tagged with the booking | 2026-09-17, `2a10b86` | `app/public/sw.js`, `_shared/ownerPush.ts`, the VAPID secrets |
| **a detailer can pay us, on our own card form** | `active`, $35 booking plan, Stripe Elements | 2026-09-17, `2a10b86` | `supabase/functions/platform-billing/**`, `app/src/screens/more/Billing.jsx` |
| **and gets an invoice for it** | `LGOU3CDN-0006`, 3500 cents, `paid` | 2026-09-17, `2a10b86` | `supabase/functions/stripe-webhook/**` |
| **none of these rows can be written by a stranger** | both canaries refused 401 | 2026-09-17, `2a10b86` | every one of these tables' RLS policies |

---

## 14.7 · THE MONEY SCREEN NO LONGER CALLS UNPAID WORK "BROUGHT IN" — 2026-09-17, at `2a10b86`

**THE CONTRADICTION WAS RESOLVED BEFORE ANYTHING WAS CHANGED, WHICH IS WHY
THIS ITEM EXISTED AT ALL.** `Money.jsx` carried a comment saying the accrual
maths *"has to stay that way"*. ROADMAP 5.1 said to compute net from collected
money only. Both cannot be true, and an item settled one way on Tuesday and the
other on Thursday is an item that comes back.

**BOTH WERE RIGHT ABOUT DIFFERENT THINGS.** The comment was right that the
headline figure has to stay accrual: four other things count work done in the
period — the six-bar chart the headline is drawn on top of, the *vs last month*
delta beside it, the tour step above it (*"what is left after expenses, not
what came in"*) and the accountant CSV whose Amount column foots to it. A
cash-basis headline would disagree with the chart under it, which is this
repo's own failure mode with the sign flipped. 5.1 was right that the WORDS
were a false claim: "brought in" is money that came in, and $295 of it had not.
**So: 5.1 wins on the labels, the comment wins on the maths** — 14.7's own
recommendation, and the only reading under which nothing on the screen has to
lie.

### THE FIGURE WAS RE-MEASURED AND IT HAD MOVED, WHICH IS WORTH KEEPING

ROADMAP 14.7 recorded $3,383 / $3,153 / **$230**. Read again at the start of
this work, on the same business, all time:

| | |
|---|---|
| earned — 22 finished jobs | **$4,745** |
| collected — what customers have paid | **$4,450** |
| still owed — three jobs | **$295** |
| expenses | **$1,102** |
| the screen's *Net, all time* | **$3,643** |
| cash received less expenses | **$3,348** |
| **overstatement** | **$295**, to the dollar the amount owed |

**The shape is identical and the dollars moved because ROADMAP 14.5's own
check left a $65 `pending` booking in the demo data**, named `ROADMAP 14.5
CANARY` and dated 2026-09-11 — flagged not deleted, per ROADMAP 0.3. So the
overstatement is $295 today and was $230 before that row existed. **This is why
the check asserts the identity and not the amount:** *accrual net − cash
position = what is owed*, which is true at any dollar figure and false the
moment the arithmetic drifts.

### AND THE FIGURE DID HAVE A SECOND COPY — 14.6a's DEFECT, NEW SUBJECT

`Money.jsx` had its own `revenueIn`, its own expense filter, its own net,
average job and quoted/added split: **every one a second implementation of a
figure `lib/moneyAdvanced.js` was already computing from the same rows on the
same period** for the screen behind *The full picture*. They had already begun
to differ, and not in the value — `moneyAdvanced` hardens every amount with
`num()` (a non-numeric reads as 0) while `Money.jsx` used a bare `Number()` (a
non-numeric turns the whole figure into `NaN`), and the two named the same
total `inNow` and `collected`. Nobody had to be careless; they only had to be
edited on different days.

**WORSE, AND THIS IS THE PART THAT WOULD HAVE BITTEN SOMEBODY:**
`moneyAdvanced.js` returned the ACCRUAL figure under the name `collected`, and
the cash figure under `collectedPaid`. `Today.jsx`, one screen over, uses
`collected` for money actually received. So whoever came to add 5.1's
*Collected* cell would have reached for `m.collected`, got the accrual number,
and shipped the overstatement under the one label that promises it cannot
happen. **It nearly happened during this very change** — a two-pass rename
turned the cash tile's `m.collectedPaid` into `m.earned`, caught by reading the
grep output rather than by any test, and the reason the check now asserts the
per-state figures rather than only the identity.

Renamed: **`earned` / `collected` / `owed`**, three words, three amounts, and
`owed` is `earned − collected` rather than a third tally.

### WHAT CHANGED, AND WHAT DELIBERATELY DID NOT

| | was | now |
|---|---|---|
| everyday headline | *Net this month* | *Earned less expenses this month* |
| everyday cell | *Brought in* | *Earned* |
| everyday — new | — | *Collected* and *Still owed*, the period's |
| advanced lede | *You brought in X and kept Y of it.* | *You earned X and Y is left after expenses.* |
| advanced bar | *Kept · $285* | *Left after expenses · $285* |
| advanced tiles | *Brought in*, *Net*, *In the bank* | *Earned*, *Earned less expenses*, *Collected* |
| back office | *$810 taken*, *Taken this month / all time* | *$810 earned*, *Earned this month / all time* |
| the arithmetic | two copies | one `advancedMoney()` call, the chart included |

- **5.1's *"Expenses paid"* was NOT adopted, on purpose.** There is no
  paid/unpaid on an expense row — the table has no such column — so *Expenses
  paid* would be a new unverifiable claim replacing an honest one. It stays
  *Expenses*. Recorded rather than silently dropped.
- **Net stays accrual and the CSV foot stays accrual with it.** 5.1's *"Net is
  computed from collected money only"* is the half 14.7 overruled.
- **Two scopes for owed money, and they are given different words for that
  reason.** *Still owed* is the period's; the *Waiting on payment* list below
  is every period, because who owes you money is not a period question and
  switching Month to Week used to make last month's unpaid job vanish off the
  one screen that exists to chase it. A *Still owed* meaning the period in one
  place and all time in another is 14.6a wearing a new coat.
- **`ON_SITE` is no longer imported by `Money.jsx` at all**, which is a step
  past where 14.6a got: that item ended the second COPY of the list, this one
  ended the second USE. The screen holds no category list to keep in step.
- **Nine Spanish keys replaced eight in the same edit**, which `appEs.js`
  requires — it is keyed on the English text, so a renamed label falls back to
  English with no error anywhere.

### THE CHECK, AND THE EIGHT SABOTAGES IT WAS HELD TO CATCH

`tests/money-overstatement.test.mjs` — credential-free, 48 assertions, one
target per value `bookings.payment_status` is allowed to hold, **read off the
migration's CHECK constraint rather than typed into the file**, so a fifth
state makes the check discover five, find no decision written for it, and fail.
Every assertion's subject is the job THIS run built, at a price no pair of the
others can sum to (100 / 200 / 400 / 800) — ROADMAP 14.6's *"any row rather
than the row this run made"* lesson applied before the fact rather than after.

**BROKEN ON PURPOSE EIGHT WAYS BEFORE IT WAS TRUSTED. ALL EIGHT CAUGHT.**

| sabotage | red |
|---|---|
| the original defect — `collected` with no `payment_status` filter | **6** |
| `owed` tallied separately instead of `earned − collected` | **3** |
| the cash label put back to *Brought in* on the everyday screen | **2** |
| the back office back to *Taken this month* | **1** |
| one Spanish key dropped, so the label silently falls back to English | **1** |
| the migration's `payment_status` constraint made to parse nothing | **4** |
| a fifth payment state nobody has decided about | **2** |
| the everyday screen grows its own period tally back (`money-advanced` § 10) | **2** |

The sixth is the one worth naming: with nothing parsed, the fixture is empty,
and **the check fails closed** — the *"the fixture actually overstates, so the
check above can fail"* guard and the canary both fire rather than the run
reporting clean over nothing. `node scripts/receipt.mjs` also refuses the
receipt under the seventh (*target counts disagree: expected 4, discovered 5*),
so the machine-readable verdict fails alongside the human one.

### SEEN ON THE SCREEN

September 2026, English and Spanish, at 1920 / 1440x900 / 768x1024 / 392x844 /
320, in the normal path and `?lite=1`, **no console errors at any of them**:

- **EARNED LESS EXPENSES THIS MONTH $285** — and $810 − $525 = $285.
- **EARNED $810 · EXPENSES $525 · COLLECTED $515 · STILL OWED $295** (red, the
  product's fixed `--bad`, never the tenant's accent) — and $515 + $295 = $810.
  Cash less expenses is −$10; the headline is +$285; the $295 difference is now
  named on the screen instead of implied.
- *The full picture* agrees figure for figure: $810 / $525 / $285 / $515 /
  $295, under *"You earned $810 and $285 is left after expenses."*
- The back office lists Coastline at **$810 earned** — the same word and the
  same number as the detailer's own screen, where it said *$810 taken*.
- Spanish: **GANADO MENOS GASTOS, ESTE MES · GANADO · COBRADO · TE DEBEN**, and
  *"Ganaste $810 y quedan $285 después de gastos."* No English fallback on
  either screen.
- Every label fits one line at 320px, the narrowest supported width, including
  the longest new one — *EARNED LESS EXPENSES*.

`composition` 97/0, `design-contrast` all pairs, `landing-pricing` 109/0,
`route-contract` 34/0, `money-advanced` 80/0, `money-export` 22/0,
`money-overstatement` 48/0, `admin-insight`, `dead-mans-switch` 51/0,
`mileage` 32/0, `tours` 24/0. `tests/spanish.test.mjs` is 70/6 and **all six
pre-date this change** — vehicle-size wording, the plan-price strings and a
duplicate `"Nothing"` key that is at `2a10b86` too; none names a money string.

| surface | proven | at | invalidated by a change to |
|---|---|---|---|
| **accrual net overstates cash by exactly what is owed** | identity holds on a fixture where all five figures differ; a non-zero overstatement is asserted so it cannot hold vacuously | 2026-09-17, `2a10b86` | `app/src/lib/moneyAdvanced.js` |
| **only `paid` counts as collected** | one target per state, off the migration's constraint; a fifth fails the run AND the receipt | 2026-09-17, `2a10b86` | the `payment_status` CHECK constraint |
| **no screen calls an accrual figure by a cash name** | 7 forbidden spellings absent, 6 replacements present, across three screens | 2026-09-17, `2a10b86` | `Money.jsx`, `AdvancedMoney.jsx`, `AdminPage.jsx` |
| **one arithmetic, the chart included** | `Money.jsx` keeps exactly one money sum and it is the unpaid list | 2026-09-17, `2a10b86` | `app/src/screens/Money.jsx` |
| **nine new Spanish keys exist and render** | asserted by key, and both money screens read in Spanish on a 392px phone | 2026-09-17, `2a10b86` | `app/src/lib/strings/appEs.js` |
| **marking a job paid moves money between the two** | *Mark paid* on the $65 job: collected $515 → $580, still owed $295 → $230, earned unchanged; row restored to `pending` | 2026-09-17, `2a10b86` | `api.updateBooking`, `app/src/screens/Money.jsx` |

### 5.1's DONE-WHEN WAS PRESSED, NOT ASSUMED

*Mark paid* on the $65 job, in the browser at 1440x900:

| | before | after |
|---|---|---|
| COLLECTED | $515 | **$580** |
| STILL OWED | $295 | **$230** |
| EARNED | $810 | **$810** — unchanged |
| EARNED LESS EXPENSES | $285 | **$285** — unchanged, by design |
| WAITING ON PAYMENT | $295, three rows | **$230**, two rows |

**$65 IS A PRICE NO OTHER UNPAID ROW HAS** — the other two are $110 and $120,
and no pair of the three sums to a fourth — so the observation could only pass
for the right reason. That is 14.6's *"the row this run made, not any row"*
lesson applied to a manual step.

**THE UNCHANGED NET IS THE DEVIATION FROM 5.1 AND IT IS STATED RATHER THAN
HIDDEN.** 5.1's done-when says *"net changes only then"*. Under 14.7's
resolution net is accrual, so marking a job paid does not move it; what moves
is the pair beside it and the cash position it describes (−$10 to +$55). The
demo row was set back to `pending` and `finalized_at` to null afterwards, and
the screen re-read at $515 / $295 — the demo data is exactly as it was found.

### TWO THINGS FOUND ON THE WAY AND NOT FIXED HERE

- **A check's leftover row is changing the demo business's money figures.**
  `ROADMAP 14.5 CANARY` exists **fifteen times** in `bookings`; fourteen are
  soft-deleted and **one is live**, `pending`, $65, dated 2026-09-11. It is
  correctly flagged rather than deleted per ROADMAP 0.3 — but it is why 14.7's
  own $230 read as $295 today, and the next person to measure this screen will
  hit the same thing. Parked for 14.5's owner, not silently cleaned up.
- ~~**`node --test tests/` from `CLAUDE.md` § Commands does not run.**~~
  **RESOLVED 2026-09-20 — decided, and the fix is a glob.** It exited
  `Cannot find module <repo>/tests` because Node reads the bare directory as a
  module specifier. `node --test tests/*.test.mjs` runs the whole battery in
  one command: **79 suites, 68 pass, 11 fail.** `CLAUDE.md` now carries the
  glob and says why. **The "run it file by file" advice above was right about
  the workaround and wrong about the cause** — it is not that these are plain
  scripts rather than `node:test` files; `node --test` runs a plain script
  perfectly well and counts each file as one test, which is where the 79 comes
  from. **And file-by-file turns out to matter for a second reason nobody had
  found:** all 79 share one seeded database and interfere, so
  `booking-engine` fails in the battery and passes **110/0** alone. A red in a
  full run is a lead, not a verdict.

---

## 5.2 · THE MONEY SCREEN NO LONGER COMPARES HALF A MONTH TO A WHOLE ONE — 2026-09-18, at `2a10b86`

**THE FILE THAT DID IT HAD WARNED AGAINST IT IN ITS OWN HEADER SINCE THE DAY
IT WAS WRITTEN.** `app/src/lib/periods.js` opens by saying the comparison is
"the SAME PERIOD, one step back … comparing a part-finished week against a
whole one is the classic wrong number", and then handed `Money.jsx` the WHOLE
previous period on every render. Measured on the demo business
(`Coastline Auto Detailing`, project `kguqylyzgyzfktkfnhjb`) on 2026-09-18:

| | |
|---|---|
| September so far, 1–18, earned less expenses | **−$50** |
| the whole of August, 1–31 | **$853** |
| August to the same point, 1–18 | **$742** |
| **what the screen used to say** | **down $903 vs $853 last month** |
| **what it says now** | **down $792 vs $742 at this point last month** |

$111 of August had not happened yet by the 18th, and the screen was counting
it against seventeen days of September. The error shrinks every day until the
30th, which is worse than being wrong steadily: it reads as a recovery.

### THE CHOICE WAS TRIM OR HIDE, AND IT IS WRITTEN DOWN BECAUSE IT WAS CLOSE

ROADMAP 5.2 offered both: *"compare to the same point last month, or hide until
the month ends."*

**HIDING LOSES THE FIGURE ON EVERY DAY IT IS WORTH ANYTHING.** On Month it
would be absent for up to 30 days at a stretch and appear on the 31st; on Year,
absent for 364 days and present on one. A detailer looks at this screen to
decide whether to go and find work this week, and the answer would be blank
until the week it no longer mattered.

**TRIMMING IS ALSO THE BORROWED CONVENTION** this file already commits to —
month-to-date against the same point last month is what every dashboard means
by "vs previous". Its one cost is that the sentence must say it is against a
part period, which is a label, and the labels are checked here too: an honest
number under a label naming the whole of August is the same defect in the
fix's clothes.

### ONE PLACE DECIDES, WHICH IS 14.7's RULE KEPT

`previousSoFar(period, previous, today)` in `lib/periods.js`. `Money.jsx` calls
it once; `stats` passes that object to `advancedMoney`, and `AdvancedMoney` is
handed the same object as a prop. So the four tiles behind *The full picture*
cannot compare against a different stretch of time from the headline in front
of it. **Days elapsed, not calendar arithmetic** — one rule covers day-of-week,
day-of-month, day of the sixth month and day of the year — **clamped to the
previous period's own end**, and **a finished period is not trimmed at all**.

| | was | now |
|---|---|---|
| the comparison period | the whole of the one before | the same point in it, while this one runs |
| a finished period | the whole of the one before | unchanged — still the whole of it |
| the everyday label | *vs $853 last month* | *vs $742 at this point last month* |
| a flat part period | *Same as last month* | *Same as this point last month* |
| the advanced screen's arrows | silent, against a whole period | against the same point, and it says so once |
| Spanish | — | nine new keys, no English fallback |

- **`Changes are against the same point in the period before.` is shown once,
  under the lede, and NOT when the tiles that carry an arrow are withheld.**
  Under `THIN` (fewer than eight finished jobs) the advanced screen hides every
  changing tile, and the sentence described nothing on the screen — seen on the
  demo business at four finished jobs and gated before this was written up.
- **Eight label keys rather than a `{when}` placeholder**, for the same reason
  the four beside them are four: Spanish agrees the demonstrative with the
  noun's gender, so a placeholder is wrong half the time in a language nobody
  here can check.

### THE CHECK, AND THE NINE SABOTAGES IT WAS HELD TO CATCH

`tests/mid-period-comparison.test.mjs` — credential-free, 87 assertions, **one
target per period kind the screen offers, read out of `PERIOD_KINDS` rather
than typed in**, so a sixth kind makes the check discover six, find no decision
written for it, and fail. Every fixture price is a distinct power of two times
$100, so any total decodes to exactly one set of bookings.

**THE FIRST DRAFT PASSED TWO SABOTAGES WITH FIFTY-NINE GREEN LINES AND THAT IS
THE FINDING WORTH KEEPING.** It placed its fixture jobs off `previousSoFar`'s
own answer, so moving the trim by a day moved the fixture with it and the
"job on the boundary" was still on the boundary. **A check whose subject is
derived from the thing under test has no subject.** The trim dates are now
worked out from the calendar, by hand, in the check itself.

**BROKEN ON PURPOSE NINE WAYS. ALL NINE CAUGHT, AND `receipt.mjs` REFUSED THE
RECEIPT IN ALL NINE.**

| sabotage | red |
|---|---|
| the original defect — the whole previous period, untrimmed | **17** |
| off by one — the trim point made exclusive | **8** |
| the "is this period over?" guard removed | **3** |
| the clamp removed, so a trim runs into the current period | **1** |
| `Money.jsx` put back to `periodAt(kind, today, offset - 1)` | **1** |
| the part period labelled as a whole one again | **1** |
| one Spanish key dropped, so the label falls back to English | **1** |
| a sixth period kind nobody has decided about | **4** |
| the advanced screen stops saying what its arrows are against | **1** |

Two of those only fail because of cases the check had to be taught. The third
needs a **finished period SHORTER than the one before it** — February 2026 on
the 28th, where 27 days elapsed reads January only to its 28th of 31; without
that case the guard looks like dead code and the clamp hides it. The fourth
needs a **running period that has already outlasted its predecessor** — March
30th, where 29 days elapsed runs past a 28-day February and an unclamped trim
would pull the first two days of March into "last month", counting them on
both sides of the comparison. The eighth also fails the receipt independently:
*target counts disagree: expected 5, discovered 6*.

### SEEN ON THE SCREEN

Demo business, September 2026, English and Spanish, at 1920 / 1440x900 /
768x1024 / 392x844 / 320, normal path and `?lite=1`, **no console errors at any
of them** (the only warnings are the React Router v7 future-flag notices, which
are on every screen in this product and pre-date this change):

- **down $792 · vs $742 at this point last month** — and $742 is August 1–18
  read straight from the demo rows, against $853 for the whole month.
- **The sign flipped, so it prints the distance and not a percentage.** −$50
  against +$742 is two numbers on opposite sides of zero; the 2026-09-12 rule
  already in `Delta` caught it, which is that rule working rather than a new
  one being needed.
- Spanish: **baja $792 · vs $742 en este punto del mes pasado**. No English
  fallback on either money screen.
- **At 320px, the narrowest supported width, the English sentence is 176px
  wide in a 284px row and fits on one line with 30px to spare** — measured,
  not eyeballed: natural width 176px against a rendered 176px, nothing
  clipped, no page overflow.
- **The worst case wraps rather than clipping.** Spanish + *6 months* —
  *vs $720 en este punto de los 6 meses anteriores* — takes two lines at 320px
  (row 39px instead of 20px), nothing clipped, page overflow still 0.
- *The full picture* on the Year period shows the arrows and the one sentence
  that explains them; on September, with four finished jobs, the arrows are
  withheld and so is the sentence.

| surface | proven | at | invalidated by a change to |
|---|---|---|---|
| **a running period is compared with the same point, not a whole one** | per kind, against a trim date the check works out itself; a job on the boundary counts and one a day past it does not | 2026-09-18, `2a10b86` | `app/src/lib/periods.js` |
| **a finished period still gets the whole of the one before it** | February 2026 on the 28th, Oct–Mar on 31 March, 2025 on 31 December — each shorter than its predecessor | 2026-09-18, `2a10b86` | the `today >= period.end` guard |
| **a trim never reaches into the current period** | 30 March 2026, 29 days elapsed against a 28-day February, capped at 28 February | 2026-09-18, `2a10b86` | the clamp to `previous.end` |
| **every period kind has a decision written for it** | five targets off `PERIOD_KINDS`; a sixth fails the run AND the receipt | 2026-09-18, `2a10b86` | `PERIOD_KINDS` |
| **the sentence says which of the two it is showing** | 8 label keys present, the old bare `periodAt` call absent, across two screens | 2026-09-18, `2a10b86` | `Money.jsx`, `AdvancedMoney.jsx` |
| **nine new Spanish keys exist and render** | asserted by key, and both money screens read in Spanish | 2026-09-18, `2a10b86` | `app/src/lib/strings/appEs.js` |
| **the headline and the advanced tiles compare the same stretch of time** | one `previousSoFar` call, passed to `advancedMoney` and to `AdvancedMoney` as a prop | 2026-09-18, `2a10b86` | `app/src/screens/Money.jsx` |

`composition` 97/0, `design-contrast` all pairs, `landing-pricing` 109/0,
`route-contract` 34/0, `money-advanced` 80/0, `money-overstatement` 48/0,
`money-export` 22/0, `mid-period-comparison` 87/0. `node scripts/receipt.mjs`
validates **10 of 10** receipts.

### ONE THING FOUND ON THE WAY AND NOT FIXED HERE

**The demo tenant could not reach the Money screen at all before it was
re-seeded.** Signing in as `demo@detailplatform.com` landed on the website
brief, and closing it reopened it; `?setup=1` opened the setup form, which the
rail buttons could not get past either. `node scripts/seed-demo.mjs` cleared it
in one run. Worth knowing because it costs the next session twenty minutes and
looks like a broken app rather than a demo whose setup flags have drifted. Not
investigated further — it is a seed-state question, not this item's.

---

## 5.3 · THE RECEIPT FOR A PAID JOB IS FINDABLE NOW — 2026-09-18, at `2a10b86`

**A1 P1-04 would not call this a defect and was right not to.** It marked
receipts and invoices *"needs verification, not a proven missing feature"*,
because the payment it would have been asked about had never been made. 14.5
made one on 2026-09-17 and stated, in its own "what this does not do" section,
*"No email was sent. `handleConnected()` marks the row and sends nothing."*
This entry is the question that follows from that sentence, asked of a real
payment rather than of the code.

### WHAT THE RUN FOUND, COUNTED RATHER THAN CHARACTERIZED

A $195 test payment was taken through Stripe's own hosted page on the
development project, settled by the real webhook, and then everything it
produced was read back.

| after a card settles | |
|---|---|
| emails our product sent | **0** |
| rows in `email_sends` | **0** |
| `paid_online_at`, `stripe_payment_intent` on the booking | set, correctly |
| `finalized_at` | **null — paying does not close the job** |

That last row is the whole item. **The job record gated its only receipt
button on `canFinalize`**, which is `status = completed && !finalized_at`. A
customer paying from the link in their own email — which is the entire point
of the pay button — settles the money *before* the detailer closes the job. So
the record showed **Finalize payment** and nothing else: no receipt, no way to
send one, and no trace anywhere that a document existed. Measured on this run,
not inferred.

**THE DOCUMENT ITSELF WAS NEVER MISSING.** `send-invoice` renders a real one
and its subject is `Receipt · $195 · Coastline Auto Detailing` — the run sent
it to Resend's `delivered@resend.dev` simulator and it came back accepted with
a provider id. The receipt page the customer opens (`/booking/:id`) was there
too. Neither was reachable from the job.

### WHAT CHANGED

- **A `Receipt` section on the job record**, drawn whenever there is a final
  amount. It carries all five answers the done-when asks for, in one place:
  the page the customer sees, the button that emails it, the address it goes
  to, and every email to that address with its date and what became of it.
- **The send no longer waits for finalizing.** `send-invoice` never required
  it — only the screen did.
- **`EmailTrail.jsx`**, because the client record had these rows already and a
  second copy of the seven-states-to-three mapping is two screens that can
  disagree about whether an email bounced. One file, both screens.
- **The button says "Email it again" only for THIS job's receipt**, matched on
  the subject *and* the amount. Matching the word alone made a returning
  customer's old receipt light up a job that had never had one — found by
  sabotage, below.
- **Three weights, after looking.** The send and the link were both filled
  blue to begin with, stacked under *Finalize payment*: three equally loud bars
  on a phone. Seen at 392, changed to filled / ringed / ringless.
- **`act()` now translates its own notice.** All four callers passed bare
  English and `appEs.js` has carried Spanish for them since 14.x, so a Spanish
  dashboard has been answering *"Reminder sent to customer."* in English with
  the key sitting right there unused. One line, four call sites.

### THE CLAIM THAT WAS NARROWED

The customer's paid screen said **"Thank you. Your card payment went through
and your receipt is on its way by email."** Nothing sends that email. It now
says the payment went through, and that the detailer emails the receipt when
they close the job.

**IT DOES NOT PROMISE STRIPE'S RECEIPT EITHER, AND THAT WAS THE FIRST
ATTEMPT.** `pay-booking` hands Stripe the address precisely so Stripe can send
one from the detailer's account — but whether it actually goes is a setting
inside *their* Stripe account, off by default in test mode. Swapping a claim
this product cannot keep for one it cannot check is not a narrowing.

### THE THING THAT CANNOT BE ANSWERED YET, AND IT IS THREE MINUTES OF ANDREW'S

**"Did it arrive" stops at "On its way".** Re-measured this run: **every email
ever sent to `delivered@resend.dev` — an address Resend guarantees accepts
instantly — is still `sent`.** Not one delivery report has ever arrived. The
endpoint is deployed on the project and its signing secret is set; what has
never happened is somebody adding it in Resend's own dashboard, which is row 1
of `FOR-ANDREW.md`. The check prints this tally every run and asserts nothing
about it: demanding `delivered` would be red for a reason that is not a defect,
and skipping the question quietly is this repo's oldest failure.

### THE CHECK, AND TWO OF ITS FOUR SABOTAGES REWROTE IT FIRST

`scripts/e2e-receipt-trail.mjs` — six targets, 21 assertions, receipt
`receipts/e2e-receipt-trail.json`, artifacts `artifacts/e2e-receipt-trail/`.
**It makes its own subject**: it runs `e2e-payment.mjs` first, so the payment
it asks about is a real card on Stripe's hosted page rather than a row somebody
flipped to `paid`. It refuses any project but the development one, and with no
credentials it prints SKIPPED and writes no receipt.

| sabotage | what it does | caught |
|---|---|---|
| `nopay` | no payment is made; the run asks its questions about whatever paid booking is lying around | **yes** — 0/6 targets |
| `nosend` | the receipt is never sent; nothing else changes | **yes** — 9 red across §§ 4, 5 and 6 |
| `screen` | reads the DASHBOARD instead of the job record — a real screen, full of plausible words | **yes** — all 6 of § 6 red |
| `canary` | stands in a product where an unsent receipt reads as sent | **yes** — and `receipt.mjs` refused the whole run |
| ~~`nosend`, first version~~ | **left § 6 GREEN.** Yesterday's run had put an identical `Receipt · $195` row on the same address, so the screen still showed a subject and still said "again" | **NO** — the check now clears its own prior rows first |
| ~~the canary, first version~~ | read the page body for *"on its way"* — which the trail honestly says about the person's OTHER mail. It failed a canary that was behaving perfectly | **NO** — it now reads the BUTTON, which is narrower, not looser |

**The canary is a second paid booking at a price nothing else shares, on the
SAME address as the real one.** An unused address makes it trivial — of course
a screen with no rows claims nothing. Sharing the address is what forced the
product to tell *"a receipt went to this person"* apart from *"a receipt went
for this job"*, and the first version of the screen could not.

### WHAT THIS DOES NOT DO, NAMED RATHER THAN LEFT IMPLIED

- **The payment still emails nobody, and § 2 asserts that on purpose.** If a
  future change makes the webhook send the receipt itself, that assertion goes
  red — correctly: the sentence on the customer's paid screen was narrowed to
  match this silence and would have to be put back in the same change. It is a
  tripwire on a decision, not a preference.
- **The public receipt page still never says it was paid.** `payment_status`
  is deliberately withheld from `get-booking-receipt`, so a customer reopening
  their link tomorrow sees no trace of the payment — the `?paid=1` banner lives
  for one visit. Recorded in `FOUND.md`, not fixed: it is a change to a public
  allow-list and it is not this item's.
- **The trail on a job is every email to that ADDRESS, and says so.** It is a
  stronger match than the customer record, which misses mail sent to a second
  address the same person booked with — but it is not per-job, and two jobs for
  one customer at the same price would share a receipt subject.
- **Test data left in place, flagged, per ROADMAP 0.3.** `ROADMAP 14.5 PAY`,
  `ROADMAP 14.5 CANARY` and `ROADMAP 5.3 NO RECEIPT`; each run soft-deletes the
  last set.
- **`e2e-payment.mjs` had to be repaired before any of this could run**, and
  the repairs are findings of their own — below.

### THREE THINGS FOUND ON THE WAY, ALL IN THE INSTRUMENTS

1. **14.5'S CHECK WAS ALREADY DEAD, ONE DAY OLD.** It carried the demo
   business's UUID as a constant. `seed-demo.mjs` had rebuilt the demo tenant
   overnight and a rebuilt row gets a NEW id, so the run died on
   `bookings_business_id_fkey`. **A reseed changes the id every time and never
   changes the slug** — it now resolves `demo-detail` at run time, and
   re-attaches the sandbox Stripe account if the reseed took that too. What § 1
   proves is unchanged: `refresh` asks STRIPE, and the assertions read Stripe's
   answer, never our own row. *(`e2e-browser-features.mjs` and
   `e2e-ten-features.mjs` carry the same dead constant and are untouched —
   `FOUND.md`.)*
2. **STRIPE'S "SAVE MY INFORMATION" TICK COST A RUN.** It is on by default and
   ticked it reveals a **required phone number** field nothing fills; Stripe
   then answers the submit with the single word *"Required"*, which reads
   exactly like a declined card. The old code called `uncheck` once, swallowed
   the failure and never looked again. It now waits for the control, clicks the
   label if the input refuses, fills the phone as a last resort, and the
   pre-submit readback names `phoneNumber` if it is still empty.
3. **A LITERAL BACKSPACE BYTE IN A REGULAR EXPRESSION, INVISIBLE IN EVERY
   TOOL.** `\b` written through a script became character 8 in the source, so
   `/^(receipt|recibo)<BS>/i` matched nothing and the button said "Email the
   receipt" over a job whose receipt was listed three lines below it. `grep`
   printed the line looking correct, the served module looked correct in JSON,
   and the same regex typed by hand into the console returned `true`. It was
   only found by reading the character codes of the served file. **Worth a
   `docs/gotchas.md` entry: a source file can contain a control character that
   no editor, grep or diff will show you.**

| surface | proven | at | invalidated by a change to |
|---|---|---|---|
| **a card payment produces no email and no record** | 0 rows in `email_sends` after `paid_online_at` | 2026-09-18, `2a10b86` | `supabase/functions/stripe-webhook/**` |
| **the receipt exists and can be sent on an unfinalized paid job** | `send-invoice` 200, `Receipt · $195 · …` accepted by Resend | 2026-09-18, `2a10b86` | `supabase/functions/send-invoice/**` |
| **the row says what, when, to whom** | subject, `sent_at`, `to_email`, provider id, filed on the customer | 2026-09-18, `2a10b86` | `supabase/functions/send-email/**`, migration `20260916010000` |
| **the owner finds all of it on the job** | six assertions against the rendered record, screenshot in `artifacts/` | 2026-09-18, `2a10b86` | `app/src/components/BookingDetail.jsx`, `EmailTrail.jsx` |
| **an unsent receipt does not read as sent** | canary at a unique price on the same address | 2026-09-18, `2a10b86` | the subject match in `BookingDetail.jsx` |
| **no delivery report has ever arrived** | every send to `delivered@resend.dev` still `sent` | 2026-09-18, `2a10b86` | Resend's own webhook list — Andrew's, not ours |

---

## 5.4 · THE TWO SCREENS AGREE ABOUT LINKS NOW — 2026-09-18

**A2 4.5 marked this NOT CONFIRMED and guessed the two screens covered
different stretches of time.** They did not. The guess was reasonable and
wrong, and the real answer was worse: one screen was counting things that were
not link opens at all.

### WHAT THE MEASUREMENT FOUND, COUNTED RATHER THAN CHARACTERIZED

Read from the development database, every business, not a fixture:

| | |
|---|---|
| rows in `campaign_visits` for the demo business | **1** |
| of those, tagged to a tracking link | **0** |
| of those, belonging to no link at all | **1** |
| visits tagged to a link **anywhere in the database** | **0** |
| what Business printed | `1 link · 1 open` |
| what Money printed about the same rows | *None of your links were opened in this period* |

**Money was right.** The single row is somebody opening the plain booking page
directly — no link involved. The audit saw `21 opens` because the demo then
held 21 such rows; a reseed since has left one.

### THE BUSINESS ROW WAS WRONG THREE WAYS AT ONCE

Not one defect with three symptoms — three independent faults in one figure:

1. **It counted visits belonging to NO link.** A head-count of
   `campaign_visits` filtered on the business and nothing else. That table's
   commonest row is a plain booking-page visit.
2. **It counted visits to links that had been SWITCHED OFF** while printing a
   count of **live** links beside them. The row's own comment argued that a
   campaign turned off is not a campaign running — and then the figure next to
   it counted the dead one's traffic.
3. **It counted page loads where Money counts people.** One person reloading
   five times was five.

### WHAT CHANGED

- **Both screens read `whereFrom()`.** Business ran its own count; it does not
  any more. The repo's own argument applies — a second copy of an arithmetic
  is how two screens come to disagree, and this is that failure happening.
- **`whereFrom()` gained an all-time mode**, because Business has no period
  control and never will. `inRange` itself is untouched; its three other
  callers all pass a real period, and widening a shared helper to suit one
  caller is how a fourth definition of *this period* gets born.
- **The row says people, and it says the span.** `1 link · not opened yet`, or
  `1 link · 3 people so far`. **"So far" is load-bearing, not padding**: Money's
  figure moves with its period control and this one cannot, so a number here
  with no span on it invites exactly the comparison that opened the item.
- **Spanish in the same edit**, per the rule that a renamed English string
  silently falls back with no error anywhere. The old `{count} open(s)` keys
  are kept rather than deleted — a key nobody reads costs nothing.

### THE CHECK, AND THE FOUR SABOTAGES

`scripts/link-counts-agree.mjs` — 5 targets, 11 assertions, min 9, receipt
`receipts/link-counts-agree.json`, artifact
`artifacts/link-counts-agree/what-each-screen-says.txt` (one line per business,
both screens side by side).

**The canary is the defect itself**: the old count-every-row arithmetic is run
against the same fixture every time, and every green verdict is void unless it
is *seen* to disagree with the truth.

| sabotage | what it reinstates | caught |
|---|---|---|
| `untagged` | the old count — every row in the table | **yes** — 1/5 targets, 6 red, **and it reproduced the original symptom on the real data**: *"demo-detail: Business says 1, Money says none opened"* |
| `inactive` | switched-off links counted again | **yes** — 3/5, 3 red |
| `loads` | page loads instead of people | **yes** — 2/5, 3 red |
| `period` | Money ignoring its own period control | **yes** — 4/5, 1 red |

`node scripts/receipt.mjs` recomputes the verdict independently and agrees —
and **it refused the first version**, which had no artifact: *"there is nothing
for a person to look at."* The check was not trusted until it produced one.

### WHAT THIS DOES NOT DO, NAMED RATHER THAN LEFT IMPLIED

- **It does not assert that any link has ever been opened**, and that is
  deliberate. Nobody has made one and used it, so demanding a non-zero would go
  red for a reason that is not a defect. The artifact prints the zero plainly
  instead.
- **The live-rows target SKIPS loudly without credentials** and is recorded as
  skipped, never as passed. A run with no `.env` prints *"NOTHING was read.
  This is not a pass."*
- **`whereFrom`'s `linkVisits` is returned and nothing draws it.** Page loads
  are the honest denominator for a future "how many opened it more than once",
  and returning it beside `linkPeople` is what stops a second count appearing
  when somebody wants that.

### TWO THINGS FOUND ON THE WAY

1. **A SHELL HEREDOC ATE A BACKSLASH, TWICE, IN TWO DIFFERENT FILES.** A regex
   written through a heredoc arrived as `/^/([A-Za-z]:)/` and the file died on
   a syntax error. Same family as 5.3's literal backspace byte. The fix both
   times was to stop escaping anything: `fileURLToPath` instead of a path
   regex, a plain substring instead of a separator normalizer. **`grep` shows
   the mangled line looking almost correct.**
2. **A STALE HOT-RELOAD ERROR READ EXACTLY LIKE A LIVE DEFECT.** The job record
   threw *"Cannot access 'charged' before initialization"* in the console —
   with `charged` demonstrably declared before use in the source. It was Vite
   hot-swapping the module while the page sat open during editing, which
   `CLAUDE.md` warns about. **Proved stale by opening a FRESH tab, which logged
   nothing at all**; the old tab keeps its buffer, so re-reading the same tab
   would have "confirmed" a defect that did not exist.

| surface | proven | at | invalidated by a change to |
|---|---|---|---|
| **the two screens agree on every business with a link** | 4 businesses, 0 disagreements, from the real rows | 2026-09-18 | `app/src/lib/moneyAdvanced.js` |
| **untagged visits are not link opens** | fixture where 2 of 5 rows belong to no link | 2026-09-18 | `whereFrom`'s `onLive` filter |
| **a switched-off link's traffic is excluded** | turning it back on moves the figure | 2026-09-18 | `app/src/screens/Business.jsx` |
| **people, not page loads** | a repeat visit does not move it, a new visitor does | 2026-09-18 | `peopleIn` |
| **Money's period control still filters** | one day of the fixture sees 1 visit, all-time sees 2 | 2026-09-18 | `app/src/screens/Money.jsx` |

## THE JOB RECORD'S PINNED ACTION BAR, IN ALL THREE CONTAINERS — 2026-09-18

`scripts/pinned-bar.mjs`, 17 targets, 119 assertions, receipt
`receipts/pinned-bar.json` validated by `scripts/receipt.mjs`. Every row
measured at 1920, 1440x900, 768x1024 and 392x844, normal path and `?lite=1`.

**Broken on purpose in both directions before it was trusted.** Its canary
target rebuilds, every run, the exact screen Andrew turned down — square
corners, no elevation, the status pills flat on the bar's top edge — and the
check is required to catch all three. Run with `--break=canary`, which removes
that injected defect, the canary goes green, the run reports FAIL and
`receipt.mjs` rejects the receipt.

| surface | proven | at | invalidated by a change to |
|---|---|---|---|
| **nothing sits beside the bar to slide up past it** | 0 cards outside the bar's span, 16 targets | 2026-09-18 | `.jobbar` width, `--jobbar-bleed`, any container's side padding |
| **a band is square, an object is rounded** | sheet 390px wide over 354px cards at 0px radius; page and desk panel level with their cards at 12px, the same as the cards | 2026-09-18 | `.jobbar`'s radius, `--r-panel` |
| **the pills are not sitting on the bar** | 12px of clearance in all three containers, up from 0px | 2026-09-18 | `.jobbar`'s `margin-top` |
| **its buttons start where the cards start** | bar content box within 1px of the first card's left edge, 16 targets | 2026-09-18 | `.jobbar` padding, `.card` |
| **it is visibly in front of what passes under it** | the strip below it is ~10 levels darker than the same frame with the elevation removed | 2026-09-18 | `.jobbar`'s `box-shadow` |
| **it really covers, not just overlaps** | `elementFromPoint` at the bar's centre returns the bar in all 16 | 2026-09-18 | `.jobbar`'s `z-index`, any new stacking context |
| **the sheet and the desk's record were not harmed** | 8 of the 16 targets are those two, all green | 2026-09-18 | `.sheet-body`, `.record-body` |
| **the console is clean at every size** | 2 distinct messages, both React Router v7 future-flag deprecations from the library | 2026-09-18 | `react-router-dom` |

## 2026-10-08 — supervision pass: ROADMAP 0.11 slice 4 reproduced, four belt faults fixed

**At HEAD `1a13886`.** The supervisor was called in after 97 minutes. **Nothing was ticked by
either belt run in that window** (`tallyDelta` 0/0 on both), so **nothing was unticked**: the list
is **48 open, 121 done**, counted with `grep -c '^- \[ \]' ROADMAP.md` and `grep -c '^- \[x\]'`,
which matched what the belt reported.

### ROADMAP 0.11 slice 4 — reproduced, and the box is correctly still open

Slice 4 landed as the code in `662cd34` plus the write-up in `1a13886`. What was checked, by
running it rather than reading it:

* **The four credential-free suites: 4 pass, 0 fail**, 938ms.
  `node --test tests/composition.test.mjs tests/design-contrast.test.mjs tests/landing-pricing.test.mjs tests/route-contract.test.mjs`
* **The six suites slice 4 touches: 53 pass, 0 fail**, 914ms.
  `node --test tests/photo-key-isolation.test.mjs tests/photo-call-sites.test.mjs tests/photo-door-media.test.mjs tests/photo-door-server.test.mjs tests/job-photos.test.mjs tests/sweep-methods-are-pinned.test.mjs`
* **THE WIDENING OF THE TENANT GUARD WAS SABOTAGED INDEPENDENTLY, NOT TAKEN ON TRUST.** Slice 4
  deliberately widens `supabase/functions/_shared/photoKey.ts` to admit a second key shape for the
  public `business-media` bucket — and `CLAUDE.md` says that file may only be widened on purpose,
  never loosened to make a run go green. The **end anchor was removed from `MEDIA_KEY`**, which is
  the classic traversal hole, and
  `node --test tests/photo-door-media.test.mjs tests/photo-key-isolation.test.mjs` went from
  **18 pass / 0 fail** to **17 pass / 1 fail**. Restored and confirmed byte-clean with
  `git diff --numstat` both ways. **The design holds up on reading too:** one anchored pattern per
  store, a closed literal folder list, a closed extension list taken from the bucket's own
  `allowed_mime_types` in `20260827001000_phase2_cleanup_and_storage.sql`, and `"private"` as the
  default so every existing caller is byte-for-byte unchanged.
* **NOT proven, and the slice says so itself:** no browser, no R2 call, no deploy, nothing applied
  to the live database. **That is why the box is right to stay `[ ]`** and the supervisor left it
  alone. Slices 4's app half, 5's app half and the publish remain.

**The one thing that nearly went into this file as a false proof** is written up as
`docs/gotchas.md` **102**: the first attempt at that sabotage silently never applied, and printed
`18 pass / 0 fail` — identical to a clean run, and readable as *"the guard survives a missing
anchor"*. It was only caught because the script asserted its own target count.

### The belt itself — four faults, each measured, each fixed

Full reasoning and what would reverse each: `DECISIONS.md` § *"The belt commits nothing it did not
write, and only one belt runs at a time"*.

1. **Two belt instances shared this working tree.** `belt.pid` was written and never read.
   `BELT START 23:49:30` dispatched 0.13 while the `23:11:28` instance's worker was 38 minutes into
   a 43-minute 0.11 job. **Fixed:** a real lock. **Proved against the genuinely running belt** —
   `node belt.mjs --dry-run` now prints *"belt is already running as pid 37984"* and dispatches
   nothing, while `--status` is untouched and still answers.
2. **The checkpoint committed another worker's live work.** `git add -A` + a bare `git commit`
   produced `662cd34`, twenty files of 0.11 slice 4 under a message naming 0.13. **Fixed:** the
   commit is gone; the already-dirty paths are recorded by name in the run record instead
   (`dirtyPathsBefore`, `notThisItem`).
3. **The Codex triage role cannot read this repo at all.** Its sandbox rejects the shell on this
   machine — `CreateProcess ... rejected: blocked by policy`, `log.md` line 10 — so it escalated
   **3 of 3** times at ~25k tokens each, which inverts the cadence it exists to protect.
   **Fixed:** switched to the `claude`/`sonnet` spare already in the config.
4. **`blockedBy` did not recognise 0.13's prose.** **Fixed:** `"Queued behind"` added — it occurs
   exactly once in `ROADMAP.md`, so `--status` moved from *35 eligible (27 ready)* to
   *34 eligible (26 ready)*, measured before and after. 0.13 also gained the standard
   `NEEDS ANDREW:` phrase.

**`node belt.mjs --self-check`: 46 assertions, 0 fail**, up from 40 — four new ones for the lock,
plus the pass line's count **derived instead of hardcoded**. It printed the literal `40 assertions`
with 44 running, which is this repo's own stale-derived-tally gotcha living inside the checker.
**Both new guards were broken on purpose and both bit:** reading `EPERM` as *dead* (the exact bug
that lets a second belt start) fails its assertion by name, and disabling one assertion fails the
floor with *"only 45 assertions ran, floor is 46"*. **The floor was wrong first** — set at 44 with
46 present, it passed a real sabotage at 45 before being corrected to equal the true count.

## 2026-10-08 — triage: 0.4 and 2.15 checks re-run; 2.15 correctly parked

**Against commit `cb59887`, before this note was written. No browser was opened; this
was the belt's cheap triage pass.**

- `node --test tests/legal-promises.test.mjs` passed clean. Each documented
  `LEGAL_BREAK` value — `rename`, `unbacked`, `host`, `debt`, and `call` — was
  then run through the same command and failed. Each sabotage printed the change
  it injected, so these were not clean runs wearing sabotage names.
- `node --test tests/keyboard-boxes-declared.test.mjs` passed clean. `BREAK=new-box`,
  `BREAK=walk-step`, and `BREAK=label` each failed the intended population, walk,
  or label assertion. **Eight of eight declared sabotages bit across the two new
  checks.**
- `node scripts/receipt.mjs` reported `0 valid · 48 stale · 29 failed` at
  `cb59887`. That proves the repo-wide receipt command is a useful census and a
  useless per-item regression gate while the belt stores only a pass/fail baseline:
  it begins false and cannot turn false again.
- ROADMAP 0.11 and 2.15 remain open. 0.11 says no code remains and waits on
  Andrew's media address, Cloudflare CORS, publish and flag flips; 2.15's only
  remaining acceptance step is his physical-phone keyboard walk. Both now carry
  the belt's existing `NEEDS ANDREW` marker. No product claim was ticked from
  these source checks.

## 2026-10-08 — supervisor: ROADMAP 0.4's `/terms` change reproduced in a browser, at `f88c3e7`

**The triage pass escalated exactly one thing: 0.4 changed a page a stranger can read
and nobody had opened it.** This is that pass. Chromium, the real dev server on
`:5173`, two widths, scrolled the way a reader scrolls rather than jumped to the
bottom.

| proven | figure | invalidated by a change to |
|---|---|---|
| The **Sales tax** clause renders, and renders **immediately after "What you pay"** | at **1440** and **392**, order index 2 of 11 both times | `app/src/landing/legal.js`, `app/src/landing/LegalPage.jsx` |
| **All eleven clauses reach `opacity: 1`** once a reader has scrolled to the end | 11 of 11 at both widths, tail row `Ending it` at `1`, `visibility: visible`, 137px tall at 1440 and 189px at 392 | same, plus `app/src/landing/thread.js`, `landing.css` |
| **No British spelling survives on the finished page** | `cancelling\|whilst\|organis\|colour\|licence\|cheque\|centre` → **0 matches**; `canceling` present **twice** (§ Renewals, § Ending it) | `app/src/landing/legal.js` |
| **Console clean** | **0** errors and **0** warnings at both widths, including `pageerror` | any of the above |
| The new clause is **typographically identical to the ten around it** | all 11 `dd` elements group into **one** colour/size bucket, `rgb(147, 156, 161) / 14.5px` | `app/src/landing/landing.css`, `theme.css` |
| Nothing is painted over the new clause | `elementFromPoint` at its top-left returns the clause's own `DD`, and its box does not overflow the viewport at either width | same |
| `EFFECTIVE` moved with the words | the page prints **"Effective 8 October 2026"** | `app/src/landing/legal.js` |

Shots: `.manager-shots/supervision-2026-10-08-terms/` — `terms-tail-1440.png`,
`terms-tail-392.png`, `terms-salestax-1440.png`, `terms-salestax-392.png`,
`salestax-centered-1440.png`. Written as FILES, per `docs/gotchas.md` 99.

**`docs/gotchas.md` 103 reproduced independently, which is the part worth keeping.**
Read from the top of the page, **all eleven clauses measure `opacity < 1`** — a
correct page measuring as entirely blank. The same eleven measure `1` after an
ordinary scroll to the end. A supervisor who had jumped straight to a measurement
would have escalated a perfect page as eleven broken clauses; the entry written
the night before is what stopped that.

**The measuring script was broken on purpose before either colour was believed**
(`docs/gotchas.md` 102): pointing the order assertion at `Renewals` instead of
`Sales tax` flipped `salesTaxRightAfterWhatYouPay` to `false` at **both** widths,
and the change was confirmed present in the file before the run.

**NOT proven here, and named rather than omitted:** 320px and `?lite=1` (the 0.4
worker's own nine views covered them; this pass re-took only the two widths the
escalation named), and contrast as a ratio — colour PARITY with the existing ten
clauses was measured, which is a weaker claim than `contrast-insitu.mjs` makes.
**0.4's box stays open**, and not for anything on this page: the open half is
Andrew's decision about the "told on the day" build-start notice.

---

## ROADMAP 7.10 — the `/ex3` hero measured, and the thumbnail gate certified · 2026-10-08 @ `cfd8932`

**Two of the item's three clauses. The box stays open on the third, which is Andrew's.**

### 1 · The hero: a measurement, not a build

Two records disagreed — the queue said the 21st's edit landed (1111px → 903px), `FOR-ANDREW.md`
said the question was still open. The item's instruction was that **the next action is a
measurement**. Nothing was edited and no build was run; the built copy under `app/public/ex3/`
was compared against `docs/tenant-sites/x-ballantyne.html` first and already carried all five
trimmed values.

| what | recorded 2026-09-21 | measured 2026-10-08 | |
|---|---|---|---|
| `/ex3` hero @ 1440x900 | 903px, 1.00 viewports | **903px, 1.00** | reproduces |
| `/ex3` hero @ 1920x1080 | 0.91 | **986px, 0.91** | reproduces |
| `/ex3` hero @ 390x844 | 0.78 | **661px, 0.78** | reproduces |
| `/ex1` hero @ 1440x900 (control) | 774px, 0.86 | **774px, 0.86** | reproduces |
| `/ex1` hero @ 1920x1080 (control) | 0.72 | **780px, 0.72** | reproduces |
| `/ex1` hero @ 390x844 (control) | 0.83 | **700px, 0.83** | reproduces |

**6 of 6 reproduce. 0 console errors or warnings at any of the six.** The control is the load-
bearing half: `/ex1` was untouched and returned the figure this item has recorded since
2026-09-20, which is how the measurement is known to be of the page and not of the method.

**Method** (pinned by recipe, not by a command — the script is scratch and is not in the repo,
said in those words per `docs/gotchas.md` 94): dev server on :5173, Playwright,
`document.querySelector(".hero")`, `getBoundingClientRect().height`, polled every 100ms until the
value held for six consecutive samples, at the three viewports above.

**A failed read was reported as a failed read.** The first attempt keyed on `section.hero` and
returned `-1` on `/ex1`, whose hero is a `<header>`. The harness printed `-1`, not `0` — a probe
that cannot tell "not found" from "zero" would have recorded the control as 0px and DIFFERS.

### 2 · The thumbnail staleness gate, certified

Built in `83737c4`; **never certified until now.** Eight runs in a scratch sandbox (a parallel
tree with both gates, the scripts they import, the five tenant sources and a generated green
manifest). Nothing in the repo, in `app/public` or on the dev server was touched.

| run | gate | flag | result |
|---|---|---|---|
| A | fixed | — | pass, `5 sites, 1 injected block` |
| B | fixed | `--break=inject` | names **ex3 and only ex3** |
| C | fixed | `--break=drift` | names **ex3 and only ex3** |
| D | pre-fix `9570e97` | `--break=inject` | **all five `current`, 0 findings — the hole** |
| E | pre-fix | — | pass, 0 stale (baseline really is green) |
| F | pre-fix | `--break=drift` | catches ex3 — it did do the half it knew |
| G | fixed | `injectedFor` → null, recaptured in that state | **FAIL, `ZERO INJECTED BLOCKS`** |
| H | fixed | `injectedFor` → null, manifest still vouching | **FAIL**, names ex3's orphaned record |

The pre-fix gate is the **actual parent of the fix commit**, fetched with `git show`, not a copy
with a block deleted. Each sabotage was **proved to have landed before either color was believed**
(`docs/gotchas.md` 102): B moved the block hash `b254a42ed3ea1ab0` → `c3beade6b50fda57`, C moved
the source hash `8a27c500cb4b253b` → `9e235c970b0e3818`, G's edit was diffed against a held copy.

**NOT a clean bill, and this is the limit of the claim:** these eight runs certify the gate's
*behavior*, on a manufactured green baseline. They say nothing about the thumbnails themselves.

### 3 · What the gate found when it was run for real

`node scripts/example-shots-check.mjs` @ `cfd8932`: **5 of 5 sites STALE, 31 assertions, exit 1.**
Not ex4 alone, which is what the item and the gate's own comment both said. Capture was
`2026-09-21T12:26:17.293Z`; `1acd9a6` — *the hero fix in § 1* — landed 11:04 -0700 the same day,
after it. **The picture of `/ex3` on `/examples` still shows the 1111px hero.**

**Deliberately not recaptured.** It needs `build-examples.mjs --dev` (writes `app/public`) plus
ten loads on the shared dev server, and another session was editing `app/src` six minutes earlier
(`theme.css`, 20:41, read off its mtime). That is the `docs/shared-resources.md` collision in
which **both runs complete and report clean.** Left red and naming five files.

### 4 · The `/ex2` wordmark — measured, not decided

| width | `.ghost` bottom | `h1` top | overlap |
|---|---|---|---|
| 1920 / 1440 | 305 | 307 | **0px, clear** |
| 768 | 206 | 220 | **0px, clear** |
| 392 / 320 | 165 | 123 | **42px, OVERLAPS** |

The audit's "overlaps the headline" is **false on a desktop and true on a phone.** The defending
reading is also true: `.ghost` has a negative left and a right equal to the viewport at all five
widths, so it is genuinely cropped by the viewport, as `docs/TASTE-NOTES.md` § 1 describes.
Stroke `rgba(255, 255, 255, 0.086)`. **Nobody decided it; it went to Andrew with both shots.**

Shots: `.manager-shots/7.10/` — `ex2-wordmark-1440.png`, `ex2-wordmark-392.png`,
`ex3-hero-1440-measures-903.png`. Written as FILES, per `docs/gotchas.md` 99.

**Gotcha 105 came out of run D** and is the thing most worth carrying forward: its verdict line
said `FAIL` while it found nothing, so the spec's own acceptance test was satisfied by the broken
gate. Certify on the findings list, never on the verdict word.

---

## Supervision 2026-10-08 — 7.10 and 4.1 re-measured independently, at `f56be2e`

**Re-measured by the supervisor in a browser, from scratch, not read off the
previous session's receipts.** Shots are FILES per `docs/gotchas.md` 99:
`.manager-shots/supervision-2026-10-08-7.10/` and `…-4.1/`.

### 7.10 — 3 of 3 claims reproduce

| Claim (commit `f56be2e`) | Supervisor's measurement | Verdict |
|---|---|---|
| `/ex3` hero is 903px at 1440x900 | **903px** | reproduces exactly |
| `/ex1` hero is 774px (the control) | **774px** | reproduces exactly |
| `/ex2` wordmark overlaps the headline by 42px at 392/320, clears at 1920/1440/768 | **−42px at 392 and 320**; clears by **2px** at 1920/1440 and **14px** at 768 | reproduces exactly |
| all five `/examples` thumbnails are stale, not `ex4` alone | **all five** | confirmed by a second method |

Console: **0 errors and 0 warnings** on `/ex1`, `/ex2`, `/ex3` at every width
measured. No sideways scroll at 320 or 392.

**The thumbnail staleness was confirmed a different way than the gate confirms
it**, because agreeing with an instrument using that instrument proves nothing.
The gate compares content fingerprints; the supervisor compared commit
timestamps against the manifest's own `captured_at` of `2026-09-21T12:26:17Z`.
Every one of the five sources was committed *after* that moment — `5fe5eff` at
16:49Z, `1acd9a6` at 18:04Z, `da40720` on 2026-10-06. **Two independent methods,
same answer: all five are stale.**

**One thing worth carrying: the 1920/1440 clearance is 2px.** The commit's word
"clears" is true and the margin is two pixels, which is one font-metric or
line-height change away from being the same defect as the phone. Whoever takes
clause 3 should treat the desktop case as *barely* clear, not as safe.

### 4.1 — `cfd8932`'s two Decline surfaces reproduce, with one new defect

**Reproduced at 1440x900 and 392x844, on both surfaces:** the request card on
Today and the job record's pending bar both ask before they act; the question
names the record (*"Decline Marcus Webb's Ceramic Coating at 8:30 AM? The
customer is emailed."*); "Not yet" removes the question, restores the Decline
button and brings "Quote" back; focus lands on the question rather than on the
destructive answer; the question takes 375px of a 413px card at 1440 and 318px of
356px at 392, so it takes the row rather than a sliver. **0 console errors or
warnings at either width on either surface.**
`tests/confirm-questions.test.mjs` passes **6/6**, and
`CONFIRM_BREAK=no-ask-card-decline` goes red against the correct control — the
sabotage was proved to land rather than believed.

**"Yes, decline it" was deliberately never pressed.** It writes a cancellation
and emails a customer on the shared demo tenant, and an outward-facing send is
not the supervisor's to trigger. **The write half of 4.1 is therefore NOT
re-verified here** — it rests on `cfd8932`'s own throwaway-business run. Said
plainly because a skipped check reads exactly like a passing one.

**NEW DEFECT, recorded as ROADMAP 4.1 (f):** on both surfaces, at both widths,
**two buttons carry the identical accent fill `rgb(14, 165, 233)` while the
question is open — "Accept" and "Yes, decline it"**, 101px apart on the card and
155px apart on the record. Measured as computed `backgroundColor` of every
visible button, not read off a screenshot. See ROADMAP 4.1 (f) and `DECISIONS.md`
§ *"The supervisor names a composition defect and does not fix it"*.

## ROADMAP 2.1b — the booking total moves on the first price-changing click, and on every later priced one

**Proved 2026-10-09 by the supervisor, at commit `a07a2dc`**, against the
`demo-detail` tenant on `localhost:5173`. Receipt:
`.manager-shots/2-1b-price-walk.json`; screenshots `.manager-shots/2-1b-*.png`.
Instrument: `.supervisor/walk4.mjs` (not committed — it is reproduced by the
method below, which is the part that transfers).

**Method, so the figures can be re-taken.** Open `/book/demo-detail`, read
`.bk-bar .total`, and for each priced control: record the bar, click by **stable
text** (never by index — `docs/gotchas.md` 108), require the element's
`aria-pressed` to have flipped, then read the bar again **once no
`calculate-booking` request is in flight** (never on text stability — 109).

| Click | Before | After |
|---|---|---|
| (at rest) | *"Choose a service to start"*, no figure | — |
| Express Wash | *Choose a service to start* | **$65** |
| + Interior Refresh | $65 | **$160** |
| add-on Pet hair removal | $65 | **$105** |
| add-on Engine bay clean | $105 | **$160** |
| vehicle size Large | $160 | **$190** |
| vehicle size Medium | $190 | **$175** |

**10 of 10 priced clicks moved the total**, at **1440 and 392**, with **0
console errors at both widths** — a proportion rather than a bare count, so it
survives the demo's service list changing. The first service click is the one
Andrew's 2026-10-09 ruling turns on, and it moves.

**What this does NOT prove, stated as not-proved rather than as fine:** the
**travel zone** on *Pick a place* and the **date/time** surcharge on *When*
were **not reached** — *Pick a place* holds Continue until an address or
drop-off is supplied. The day-before-time case was proved earlier under 2.1;
**the travel zone has been compared by nobody.** 2.1b stays open on that.

**The four clicks that did not move the total are correct and must not be
"fixed":** the condition chips. `app/src/book/core.js` calls condition
*"INFORMATION, never arithmetic: the trade prices condition after
inspection"*, and `grep condition supabase/functions/_shared/pricing.ts`
returns nothing — the server never reads it.

**Broken on purpose, twice, which is why the green is worth anything.** The
first two versions of this walk each reported *"the price did not move"* for
`+ Interior Refresh` at both widths — a **false defect** over a page pricing
correctly, with no error and no console noise. Causes and fixes are
`docs/gotchas.md` 108 and 109. The passing run above is the third instrument,
and the two failures are what establish that it can see a difference at all.

## ROADMAP 3.1a — the mail log scrolls in its own box, proved at 653bf3b

**Supervision, 2026-10-09.** `node scripts/mail-log-scroll.mjs` (dev server +
seed + `.env`, signs in as the demo tenant's owner, writes nothing):
**PASS — 20 assertions, 0 failed, 2 UNJUDGEABLE**, at **1440x900** and
**392x844**. Receipt `receipts/mail-log-scroll.json`; shots
`.manager-shots/3.1a/scroll-<width>-<0|05|1>.png` — **six files, and they are LOCAL ONLY**: `.manager-shots/` is in `.git/info/exclude`, so they exist on the machine that ran this and nowhere else. Re-run the script to regenerate them; the figures in this entry are what transfers. **Taken at `653bf3b`**,
with the figures below read in that same run.

**Proved, per width, both widths:**

| What | 1440x900 | 392x844 |
|---|---|---|
| the list is longer than its box | `scrollHeight` 2818 vs `clientHeight` 520 | 3790 vs 506 |
| the box scrolls on its own | asked 200, landed **200** | asked 200, landed **200** |
| `.settings-body` moves while it scrolls | **0px** | not in this layout |
| the document moves while it scrolls | **0px** | **0px** |
| the page's own overflow, against the list's | 12px vs **2298px** | 78px vs **3284px** |
| rows clear of each other at 0% / 50% / 100% | 29 rows, tightest **0.00px** | 29 rows, tightest **0.00px** |
| `scrollbar-width` reaching the element | `thin` | `thin` |
| `scrollbar-color` reaching the element | `rgb(123, 133, 138) rgba(0, 0, 0, 0)` | same |

`rgb(123, 133, 138)` is `--fog-2` (`#7B858A`, `theme.css:61`) resolved — so the
declaration reaches the element rather than a `var()` sitting on its fallback.

**BROKEN ON PURPOSE, TWICE, AND THE FIRST BREAK REPRODUCES THE ORIGINAL
DEFECT** — which is what makes the green mean anything.
`--break=unbound` restores `max-height: none; overflow: visible` on the live
page: **6 of 20 red**, and at 1440 the report prints **`.settings-body
overflows true`** — the shared container behind all 24 "more" screens pushed
past its height, which is the full-height browser bar Andrew pointed at. At 392
the same sabotage grows the page by **3361px**. `--break=unstyled`
(`scrollbar-width: auto; scrollbar-color: auto`) reds `rules-in-effect` at both
widths. **Each sabotage is required to prove its own edit changed the computed
style before the run is judged either colour** (`docs/gotchas.md` 102).

**WHAT THIS DOES NOT PROVE, STATED AS NOT-PROVED RATHER THAN AS FINE: the
thumb's appearance.** No browser on this machine lays out a classic scrollbar
gutter — the `chrome` channel is not installed, `headless: false` dies with
`spawn UNKNOWN`, `--disable-features=OverlayScrollbar` leaves the gutter at
**0px** (probed both with the flag and without), and Firefox is not downloaded.
An overlay scrollbar reserves no gutter and composites into no screenshot, so
**the run records this UNJUDGEABLE by name, twice, rather than passing it.**
Andrew's own eyes are the instrument; the ten-second look is in
`FOR-ANDREW.md`. The reasoning behind closing the box on this is `DECISIONS.md`,
"Ticking on structural proof when the appearance is unmeasurable".

**ALSO FOUND BY THIS RUN AND NOT THIS ITEM'S — filed as ROADMAP 9.24.** A
`user_tours` read refused **401** in the console at 1440 on a fresh sign-in,
intermittently: present on one run, absent on the next, never at 392. The same
read with a fully settled owner token answers **200** with the row present, so
it is a race rather than a permission. 3.1a's own check reports it because the
check reads the console honestly.

**One honest property of the figures above:** the row count (29) and the
`scrollHeight` numbers move as `demo-detail`'s own `email_sends` rows move. They
are read fresh every run rather than written into the check's floor, so a later
run quoting different numbers is not a contradiction — the **proportions** (29
of 29 clear, 0 of 2 ancestors moving) are what survive the population changing.

## 2026-10-09 — ROADMAP 0.11a reverified and closed on Andrew's ruling

At `9649424`, supervision ran:

```text
node --test tests/photo-door-receipt-wire.test.mjs tests/photo-door.test.mjs tests/spanish.test.mjs
```

Result: 17 of 17 Node test cases passed; the Spanish suite separately printed
83 passed and 0 failed. The receipt-wire suite runs the real app receipt module
against the real photo-door handler in memory, then removes six production
guards one at a time and requires the matching damage to appear. The reader
suite separately restores the exact `s >= 500` branch that swallowed the
server's useful sentence and requires that sabotage to be named. This proves
the build slice and its regression net; it does not claim that R2 is published
or that Cloudflare accepts a real upload. Those remain 0.11c and 0.11d.

## 2026-10-09 — ROADMAP 0.11d1's two declared gaps, closed in a browser

At `ccc1e9c`, supervision opened the real screens rather than reading them.
0.11d1 was ticked with two things written down as unproven: the expense sheet's
rendering of the over-cap refusal, and the Spanish rendering of either
sentence. Both are now measured.

Four cases — job record and expense sheet × English and Spanish — at 1440×900
and 392×844. **22 of 22 checks, console clean at every width and language.**
Each sentence was compared to the character against the string composed from
`appEs`, hit-tested at its own centre (`docs/gotchas.md` 100), and checked for
clipping. What the screens said:

```text
job/es      El almacenamiento de fotos está lleno: 10.0 MB de 10.2 MB usados.
            Quita algunas fotos para agregar más.
expense/es  Gasto guardado, pero el recibo no se adjuntó. El almacenamiento de
            fotos está lleno: 10.0 MB de 10.2 MB usados. Quita algunas fotos
            para agregar más.
```

Method: one intercept, the `job_photo_budget` answer, in the shape the RPC
really gives it — the same one this slice's own gate uses, because the cap
cannot be filled while `photo-door` is unpublished. Everything after it is the
product's: `roomFor` decides, `fullWords` composes, `t` translates. Nothing in
`app/src` was patched. The run inserted one `expenses` row per press into
`demo-detail` (the sheet's own order: the number is saved before the paper is
attached) and deleted all four afterwards.

Screenshots, local only: `.manager-shots/sup-overcap-{job,expense}-{en,es}-{1440,392}.png`.

**What this does NOT claim.** Nothing about R2, the door being published, or a
real upload. It also does not re-prove 320 — the slice's own gate covers that
width for the job path, and this run added 1440 and 392 for the paths that had
never been opened.

**The first run of this probe printed 8 false defects** and the reason is now
`docs/gotchas.md` 112: the two callers of the cap weigh different bytes, so the
fixture that breaches one legitimately fits through the other.

Re-run: the probe is a scratchpad script, not committed. It is reproducible
from the gotchas entry and this paragraph — the ingredients are the intercept
above, a random-noise canvas at `MAX_EDGE` for the file, and a budget of 10.0
MB of 10.24 MB so that only 251 KB of room is left.

## 2026-10-09 — pinned-sweep gate launch repair

The belt's `sweep-pinned` gate was red because its test invoked `bash`, which
is absent in this Windows workspace, then converted that launch failure into an
empty git history. `tests/sweep-methods-are-pinned.test.mjs` now invokes `git`
directly. Normal run: 8 passed, 0 failed. Deliberate controls remained live:
`PIN_CANARY=scope` and `PIN_CANARY=fragment` each failed as required.

## 2026-10-09 — supervision: the pinned-sweep launch fallback, and /terms looked at

**`tests/sweep-methods-are-pinned.test.mjs` — the launch-failure fallback the
same-day repair left behind.** That repair swapped `bash -c` for `git` and kept
`catch (e) { return e.stdout || "" }`, so a launch failure was still measured as
an empty history. Substituting `git-does-not-exist` (one line, landing asserted
with `diff`) reddened the run with *"0 commits name an open item, floor 339"* —
a claim about rewritten history from a run where git never started. The helper
now throws when the process never ran (`e.status == null`) and keeps the output
of a real non-zero exit.

Measured in the same edit, at `68f2f38` plus this change:

| run | result |
|---|---|
| normal | **8 passed, 0 failed** |
| `PIN_CANARY=scope` | **6 passed, 2 failed** |
| `PIN_CANARY=fragment` | **6 passed, 2 failed** |
| `git` replaced by a missing executable | **`git could not RUN (ENOENT)`**, named as a launch failure |

Re-run: `node --test tests/sweep-methods-are-pinned.test.mjs`, then the same
with each `PIN_CANARY` value. The launch sabotage is one `sed` substitution of
the executable name in the `git` helper.

**`scripts/r2-public-base.mjs` (ROADMAP 0.11ba) reproduces its recorded canary
figures exactly.** Credential-free, no `--base`: **6 rules asked, 1 failed, 5
UNJUDGEABLE, 29 assertions**, the failure being that no public address is bound
(Andrew's step 9a2) and the five unjudgeable rules named rather than folded into
a pass. `--break=accept-get-only`: **7 of 8 canaries caught, 1 MISSED — mode
`cors-get-only` went UNNOTICED by `cors-allows-our-pages`**, which is the
repaired negative control doing its job. The verdict word is `FAIL` either way,
so the distinguishing signal is the canary line, not the status — `gotchas` 105.

**`/terms` looked at, 2026-10-09, dev server at `localhost:5173`.** 1440x900 and
392x844: **console CLEAN at both** (errors and warnings, plus `pageerror`),
**3372** characters of body text at 1440 and **3346** at 392, and **11 clauses
present** — they are `<dt>` elements under one `h1.disp`, which is recorded here
because this session's first probe counted `h2, h3` and got **0**, then nearly
wrote that up as a blank page. `gotchas` 106: the selector came from the word
"heading" rather than from the page. Shots
`.manager-shots/supervision-2026-10-09/terms-{1440,392}-{top,tail}.png`.
This says the page renders and is quiet; it does not re-close ROADMAP 0.4, which
`a07a2dc` reopened for proving the checkout rather than the product.

**ROADMAP 0.11d2's CLIENT HALF IS PROVED; ITS R2 HALF IS NOT. 2026-10-09,
`scripts/job-photo-wire.mjs`, receipt graded PASS at `08f0f11`.** Dev server +
the seeded demo tenant, a real 402-byte 16x16 PNG pressed into the job record's
own file input at **1440 and 392**: **17 assertions, 0 failed, 2/2 widths,
console clean at both**. What it establishes, on the network rather than from
source:

- **every byte of a job photo leaves through the door's presigned URL** —
  exactly one PUT, to the URL `start` handed out, with a body whose length
  equals the `claimed_bytes` the client declared;
- **nothing reaches `/storage/v1/object`** during the whole press. Supabase
  Storage READS are recorded separately and are not counted as uploads, because
  folding the two together would fail toward a false defect;
- **the `finish` request names no size of any kind** — not `bytes`, `size`,
  `claimed_bytes`, `content_length`, `contentLength` or `byte_length`. This is
  the client half of criterion 2 and the entire reason *"regardless of the
  client's claimed size"* can hold: the browser states its size once, at
  `start`, where it is used to refuse early, and is never given a second chance
  to tell the server how big its file is;
- **the client accepts the door's figure without a cross-check** — `finish` is
  answered with `bytes: 7777777`, a figure matching neither the claim nor the
  body, and `readFinish` takes it.

**Broken on purpose twice, and certified on the FINDINGS LIST naming its own
rule rather than on the verdict word** (`gotchas` 105).
`--break=storage-fallback` puts a second door back — a Supabase Storage upload
of the same blob after the signed PUT — and reddens **2**, naming the POST at
both widths. `--break=client-size` makes the browser state `bytes` at `finish`
as well and reddens **2**. An unrecognised `--break=` exits **2** and writes no
receipt. Both rewrites happen to the RESPONSE, fetched in node and returned
`no-store`, never with `route.fetch()` (`gotchas` 113), and **they sign
themselves**: the run asserts `served 1, landed 1, executed 1` per width, so a
rewrite that landed in a copy nothing ran cannot pass as green (`gotchas` 102).
Nothing in `app/src` was edited; `git status` showed only this session's two new
files.

**WHAT THIS DOES NOT SAY, and the receipt names both as UNJUDGEABLE rather than
folding them into the pass:** that R2 accepts a signature R2 itself minted, and
that `head` states the stored object's real length so `job_photos.bytes` equals
it. Both need the release — `photo-door` is undeployed and `.env` holds no R2
credential, only the three `R2_*` NAMES as edge-function secrets, so nothing
here can head an object or list a bucket. The server's side of that arithmetic
is proved in memory by `tests/photo-door-server.test.mjs` §§ 11 and 13, which
are statements about this checkout and not about what is answering on the
internet. **0.11d stays open.**

## ROADMAP 3.1a reproduced by the supervisor, and its receipt was lying — 2026-10-09, at `0626b158`

**The tick stands.** `node scripts/mail-log-scroll.mjs`, dev server + seed +
`.env`, headed Chromium: **20 assertions, 0 failed**, all four canaries caught
(`the-browsers-own-scrollbar`, `the-list-that-never-filled`,
`the-stacked-rows`, `the-page-grown-by-the-list`), and **2 UNJUDGEABLE named
rather than folded in** — the thumb's appearance, which no browser on this
machine lays out a gutter for and which stays Andrew's eyes. Measured:
`scrollbar-width "thin"`, `scrollbar-color "rgb(123, 133, 138) rgba(0,0,0,0)"`
at both 1440 and 392; the box overflows 2818-vs-520 at 1440 and 3790-vs-506 at
392; `.settings-body` moved **0px** and the document moved **0px**; 0 console
errors and 0 warnings at both widths. The `[data-mail-log]` scope was checked to
reach a real element (`MailLog.jsx:101`) rather than taken from the CSS — a
scoped declaration that matches nothing is this repo's "declaration is
decoration" fault.

**What the receipt on disk said before that run: `"status": "fail"`,** with two
failures reading `scrollbar-width "auto", scrollbar-color "auto"` — a precise
description of the exact defect 3.1a fixed. It was a sabotage run
(`dimensions.break: "unstyled"`) left as the standing verdict. Written up as
`docs/gotchas.md` 117 and fixed at the shared writer; see below.

## The sabotage-receipt guard, broken on purpose before it was trusted — 2026-10-09

`scripts/receipt.mjs`'s `writeReceipt` now routes a receipt recording a
`dimensions.break` to `receipts/<name>.sabotage.json`, and the directory
validator skips those as it already skips `holds.json`. Proved in both
directions rather than read:

* `node scripts/mail-log-scroll.mjs --break=unbound` → **FAIL, 6 of 20 failed**
  on real assertions, receipt written to `receipts/mail-log-scroll.sabotage.json`,
  and `receipts/mail-log-scroll.json` read `pass` before and after the run.
* `node scripts/receipt.mjs` → still **36 failed** receipts reported, and
  **0** mentions of a sabotage file, so the filter silenced no genuine red.
* `receipts/r2-public-base.json` was in the same clobbered state from item 0's
  gate-regression run. Its red is **honest** — `base-configured`, nobody has
  bound `business-media`'s public address — but it was unreadable as either, so
  the check was re-run clean (`break: null`, 1 failed, 5 UNJUDGEABLE) and the
  sabotage run kept beside it. **0.11ba's blocker is unchanged and still
  Andrew's.**

`status` was deliberately left alone: `validate()` grades that field and must
keep failing a red receipt.

## ROADMAP 0.11d3a's cron timeout reproduced — 2026-10-09, at `0626b158`

`node tests/photo-cron-call.test.mjs` → **37 passed, 0 failed**.
`CRON_BREAK=no-timeout node tests/photo-cron-call.test.mjs` → **34 passed, 3
failed**, red on three real assertions rather than on a status rule
(`docs/gotchas.md` 105), and the run names itself a sabotage in its own note.
Checked independently of the test: `20261006060000_photo_reconcile_cron.sql`
contains `net.http_post` and **no `timeout_milliseconds`**, so pg_net's 5,000 ms
default stood against a job whose cost scales with every object in the bucket;
`20261009120000_photo_reconcile_cron_timeout.sql` reschedules the same job name
with `timeout_milliseconds := 60000`. **Applying it is Andrew's**, and the
migration says so.

## Belt multi-suffix item IDs and self-check guard — 2026-10-10

The belt had dispatched `0.11ba` as item `0`, bypassing its `NEEDS ANDREW`
block. `node belt.mjs --self-check` now passes **344 assertions and 3 canaries**;
the new fixture proves `0.11ba` is skipped while `0.11d3a` remains selectable.
Restoring the prior one-suffix parser made both assertions fail. The same run
also exposed and then cleared a CRLF false positive in its control-character
guard; its character-8 canary still passes.

## Supervision 2026-10-10 (second pass) — 4.1a, 2.1b, 3.1c reproduced

At `321a98a0`. **4.1a**: throwaway Playwright walk as the demo owner, Today
card, 1440 and 392 — only Accept accent-filled, "Yes, decline it" ringed,
question names the job, console 0/0; runtime sabotage red at both widths
(after a transition settle, `docs/gotchas.md` 119). **2.1b**:
`node scripts/travel-price-walk.mjs` — PASS 3/3 widths, 39 assertions, canary
caught 3/3; `receipt.mjs` grades it valid. **3.1c**:
`node scripts/mail-log-groups.mjs` — 17 assertions, 0 failed;
`--break=nobands` — 9 of 17 failed. 3 of 3 reproduced.

**Supervision 2026-10-10 (second pass), at `dd29835f`.** **4.1c**:
`ONLY=392` and `ONLY=1440 node scripts/suspend-delete-waive.mjs` — 25
assertions, 0 failed, 3 of 3 action-widths at each, console clean, canary
caught; committed receipt restored afterwards (6 more permanent `action_log`
rows on throwaway fixtures). **3.4b**: `node scripts/communication-lifecycle.mjs`
— 125 assertions, 0 failed; `--break=new-push` 1 failed; independently, all 17
`*Email` exports and all 18 sender folders are named in the doc. **3.4e**:
`node scripts/email-failure-design.mjs` — 50/0; `--break=new-status` 3 failed.
3 of 3 reproduced.

## Supervision 2026-10-10 (third pass) — 8.10d, 9.12, 7.6 reproduced

At `4be6a25b`, against `kguqylyzgyzfktkfnhjb` (ref checked before the first
query). **8.10d**: read-only grant query through the Management API —
`authenticated` holds 0 column UPDATE grants on `public.bookings`,
`has_table_privilege(UPDATE)` false, `weather` and `admin_notes` UPDATE false,
and SELECT **true** (the positive half, so the query is not blind). **9.12**:
`node --test tests/admin-preconditions.test.mjs` 6/0; sabotage aimed at the
PRODUCTION function (`actionFor` made to return the ring advice with no phone,
`git diff --numstat` 1/1, file restored, porcelain empty after) — 1 failed, the
ring test, by name. `node --env-file=.env scripts/admin-preconditions.mjs` —
PASS, 18 assertions, 0 failed, both canaries caught; screenshots read by eye:
the one account needing a call has no phone and is told "Email them", with its
email button; Money shows "Nobody who pays has a problem" and the non-payer
under "Not paying yet". **7.6**: live `photo_total_bytes()` 10737418240 /
`photo_tenant_share()` 100 = 107374182 bytes (102.4 MB); `/pricing` in a headed
Chrome at 392 and 1440 has one "unlimited", and it is "services, bookings and
staff logins" — no photo claim. Console 0 errors at both; 1 warning, the
manifest icon, which is not this item (`FOUND.md`, 2026-10-10). 3 of 3
reproduced.

## Supervisor, 2026-10-10 (fourth pass) — 9.15/9.15a, 9.17, 8.10d at `51412207`

**9.15/9.15a:** demo owner at 1440 and 392 in headless Chromium: 0 `.tourblock/.tourcard/.spotlight`
on Today and 0 after pressing every tab; Today's notice names "Vehicle types" and pressing it opens
Getting started at "STEP 2 OF 12 · VEHICLE TYPES"; console 0 errors/warnings at both
(`.manager-shots/sup-prompt-1440.png`, `-392.png`, not committed). English sweep receipt PASS 171 of
171. **Spanish half not reproduced:** the 320+1440 Spanish receipt reached 85 of 171 — ROADMAP 9.26.
**9.17:** three gear opens per page → `platform-admin` request count 1, 1, 1 at both 1440 and 392,
console 0 errors (owner is an admin, so 200; the non-admin 404 path not re-run).
**8.10d:** live `kguqylyzgyzfktkfnhjb`, read-only: `has_table_privilege('authenticated','public.bookings','UPDATE')`,
the same for `anon`, and column UPDATE on `weather` and `admin_notes` — all four `false`.
3 of 3 reproduced (9.15a on its English criterion only).

## Supervisor, 2026-10-10 (fifth pass, deep) — 2.1d, 9.1a at `fa17139f`

**2.1d:** by hand on `localhost:5173/book/demo-detail` (live `calculate-booking`), Express Wash,
drop-off, Saturday Oct 10 at about 09:40 Pacific. At 392: the day tap reads **$115** with
`Weekend rate · +$30` and `Short notice · +$20` named; tapping 12:00 PM and 5:00 PM leaves it
$115 with both lines still named. The refusal case, Tuesday Oct 13: **$65**, neither line. At 1440
the day tap reads $115 with both lines named. Console at both: 0 errors, the one manifest-icon
warning already in FOUND.md.
**9.1a:** `node scripts/live-carries-commit.mjs --fn=platform-admin --present=99ed3922
--absent=83a0a740,8bd5d24b,3e002b1d` → PASS: live v63 (deployed 2026-10-10 07:53 UTC) carries 36 of
36 of the 9.1 commit's comment lines (no `--strings`, hence 36 not the entry's 39) and 0 of the 42
unpublished 4.3b/4.3c lines; canary read absent. `--break=swap` → FAIL, 42 of 78 missing.
2 of 2 reproduced.

## Supervisor, 2026-10-10 (sixth pass) — 3.4f, 9.19, 9.20 at `806e4274`

Instrument: `belt/shots/sup-1010b/look.mjs` (outside the repo), demo owner, headless Chromium,
**nothing stubbed and nothing written** — the real `email_sends` rows, read through the real query.
**3.4f:** Today at 1440, 392 and 320 shows *"Booking alerts to demo@example.com are not arriving. Fix
the address in Notifications."*; pressing Fix this opens Notifications, which shows *"… Change it on
Business info, or add a working address below."* True on this tenant (reserved domain, F6 rows).
Console 0 errors/warnings at all three. The clearing case (a later delivered row) was not re-run.
**9.19:** calendar scrolled to its end: at 392 the last text line ends at 686px and the scrim begins
at 708px (136px tall); at 320x640, 482 against 504. 22px clear of the fade at both; screenshot read
by eye, last card fully legible. 1440 has no scrim, as designed.
**9.20:** sabotage by hand — removed the `delErr` throw and the still-stored refusal from
`removeReceipt` (`git diff --numstat` 1/2, gotchas 102) → `photo-door-receipt-wire` red, *"Missing
expected rejection: a delete that fails did not refuse"*; restored (`git status` empty) → 10 pass, 0
fail. The browser half (`scripts/receipt-viewer.mjs`, writes to the demo tenant) was not re-run.
3 of 3 reproduced.

## Supervisor, 2026-10-10 (seventh pass) — 9.25, 9.26, 9.14c at `fb6d65ea`

**9.25:** walked by a scratch script outside the repo (demo owner, headless Chromium, nothing
stubbed): Business → Monthly plans → Add a plan, then Log a member, Spanish and English at 320, 392
and 1440. Cancel's right edge against its row: never past it (closest −4px, English 320 plan form).
Spanish 320 wraps both rows; page never wider than the viewport; console 0 errors/warnings at all
six. **Caveat, gotchas 121:** the committed `sweep-widths-320*.json` receipts carry `git_sha`
`38bf73b3`, the commit BEFORE the fix (`de72b29b`), so they cannot be re-taken at the revision they
claim. This browser walk is the proof at a commit that holds the fix.
**9.26:** `receipts/sweep-widths-320-es.sabotage.json` (SWEEP_SHORT_CANARY) is `fail` and names
*"SHORT RUN: 320px measured 85 of 86 … Unreached: Money · Lifetime"*; the canary is in production
code (`sweep-widths.mjs:1086`). The 320+1440 Spanish receipt reached 171 of 171 and was red only on
the +6px Cancelar 9.25 then fixed. Same gotchas-121 caveat on SHAs.
**9.14c:** live leftovers read (service key, `kguqylyzgyzfktkfnhjb` confirmed): `platform_costs`
returns `[]`; `platform_admins` holds only the two deliberate demo logins, no throwaway admin.
3 of 3 reproduced.

## Supervisor, 2026-10-10 (eighth pass) — 12.2, 14.17, 14.15 at `fab1069c`

**12.2:** the published site itself, in Playwright, not the receipt: `https://detailingplatform.com/`
serving `index-CT8xjH8F.js` (the bundle the receipt names). At 1440 and 392 the page text holds
*"Log a card payment"* and not *"Take a card payment"*; at 392 the phrase is opacity 1, hit-tested on
top, and the page is not wider than the viewport. Console at both: 0 errors, 1 warning — the manifest
`icon.svg`, already parked in `FOUND.md`, not this item.
**14.17:** `node --test tests/shared-resources-guard.test.mjs` 7 passed / 0 failed. Sabotage aimed at
production code (`claimed()` in `scripts/lib/sharedResources.mjs` forced to `true`, landing proved by
`git diff --numstat` 1/1): 2 passed / 5 failed. Restored; `git status` clean. Live half not re-run
(credentialed); its receipt was read.
**14.15:** receipt read against the entry: 370 of 370 targets, burst 300 × 400 `bad_query` and 0 × 429
(by design — the 2-character query is refused before the limiter, so any 429 there could only come
from above), 70 presses all 429 with body `busy`, per-IP counter +70. Sabotage receipt `--break=blind`
is `fail` naming 70 unattributed. Consistent; closing as UNREPRODUCED stands.
3 of 3 reproduced. Gate red on 14.15 and 14.17 was the belt's own stranded split (`line-24345a/b`),
not either item — fixed in `08228259`.

### Supervision 2026-10-10 (late) — 99.3a and 12.2 re-run by the supervisor, both reproduce

- **99.3a** (no back-office row in the Settings gear, no `platform-admin` ask): `node scripts/gear-whoami.mjs`
  at `d4fa55f1` — **PASS, 37 assertions, 0 failed**, both accounts, 1440/392/320 and 392 `?lite=1`, console
  silent, both canaries caught. `--break=ask` (the old door put back) — **FAIL, 24 of 37**: 2 calls per open,
  the row drawn. Receipts committed in `5f8e5c03`.
- **12.2** (live home page no longer promises "Take a card payment"): `node scripts/live-card-claim.mjs`
  against detailingplatform.com — **PASS**, 0 problems at every width, canary refused; `--break=old-wording`
  — **FAIL** at every width naming the old words. Receipts in `5f8e5c03`.
- **9.25** read, not re-run: the fix is `row` → `row wrap` on two button rows of `Plans.jsx`, and `.row.wrap`
  exists (`theme.css:483`). Its sweep receipt is stamped `38bf73b3`, the commit BEFORE the fix `de72b29b`
  (docs/gotchas.md 121), so it cannot be re-taken at the revision it claims.
2 of 2 re-run reproduced.

## Supervision 2026-10-11

- **99.1 Disconnect Google outline** (commit `4aae9af4`): `node scripts/google-business.mjs` with `.env` loaded,
  dev server on :5173 — **210 assertions, 0 failed**; the new `disconnect-outlined` reads `border 1px rgb(51, 59, 64)
  on rgb(23, 27, 30)` at 1440, 392, 320 and 392 `?lite=1`. **Sabotage:** the old `btn ghost` class put back by hand —
  **4 failed, `border 1px rgba(0, 0, 0, 0)`, one per width** — then restored. Screenshots looked at by the supervisor:
  `.manager-shots/99.1/connected-392.png`, `connected-1440.png`, an outlined pill with a gap above it.
1 of 1 re-run reproduced.

## Supervision 2026-10-11 (second)

- **9.12a 6b price editor** at `64db1735`: `node scripts/office-prices.mjs` — **66 assertions, 0 failed, 3 of 3 widths**, canary
  caught; `--break=wide` — **4 failed** (plans cut by the right edge at 392 and 320). All server calls stubbed, nothing written.
  Read the server's `prices` action: an invalid table is refused with a 400 via `pricesFrom`, so a blank box can no longer save $0.
  Looked at `artifacts/office-prices/read-392.png`, `edit-392.png`, `read-1440.png`: everything on the phone, nothing cut.
  Small look note, not a defect: at 1440 the price section runs 220px wider than the bills section above it.
- **9.12b Coming-in timeline** at `64db1735`: `node scripts/office-coming-in.mjs` — **156 assertions, 0 failed, 6 of 6 widths**;
  `--break=offscreen` — **16 failed**, the same figures the entry records. Looked at `artifacts/office-coming-in/fed-390.png`:
  vertical rail from Today, nine renewals with name, date, amount, yearly and card-failed states, $1,620 expected (failed card left out).
2 of 2 re-runs reproduced.
