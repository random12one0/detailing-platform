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

Invalidated by a change to that screen's own file, or to `app/src/theme.css`,
`app/src/components/controls.jsx`.

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
