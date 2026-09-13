# LANE C QUEUE — Andrew's four items, 2026-09-13

**Written because three of these exist only in a chat message and a `/clear`
would take them.** Item 1 is done; items 2, 3 and 4 are untouched and are
recorded here in his own terms, including the measurements he took himself,
because a reproduction he observed is worth more than one a session re-derives.

**Lane C only** — `supabase/**`, `tests/**`, `scripts/**`, `docs/**`. His
instruction with these: *"do not touch app/src, lane B is live."* **Lane B was
confirmed writing into this tree during item 1** (`appEs.js`, `theme.js`,
`SiteIntake.jsx`, `theme.css` all modified and none of them ours), so
`node scripts/lane-check.mjs C` before every `git add` is not a formality here.

**The doorbell is done and live. Do not revisit it** — his words.

---

## 1 · ~~The lane C half of translate-on-save~~ — DONE 2026-09-13

`05decd9` and `2869963`. The server side was already built, deployed and proved
(67/67); what was left was the half it had PARKED, and that turned out to matter.

- **`get_bookings_due_for_second_reminder()` was readable by the anon key** —
  `setof public.bookings`, no tenant filter, and `postgres` carries
  `rolbypassrls` so a definer function it owns has no RLS at all. Five definer
  functions were open; all five closed by
  `supabase/migrations/20260913005000_definer_execute_swept.sql`.
- **`tests/definer-grants.test.mjs`** is the standing check — 11 checks, asks
  `pg_proc.proacl` rather than grepping a migration, baselined against the live
  broken state before the fix.
- **`tests/translations.test.mjs` § 4g** widened the classifier's completeness
  check from one business to all fifteen.
- Full account, the two things left open, and the default-privilege root cause:
  `FOUND.md` § THE DEFINER SWEEP.

---

## 2 · ~~`available-slots` CAN ANSWER 200 WITH AN EMPTY CALENDAR~~ — DONE 2026-09-13

**An empty success. He hit this live tonight on `demo-detail` and it is the
defect with a customer on the other end of it.**

### WHAT HE MEASURED, IN HIS OWN TERMS

Three consecutive month requests, `duration 60`, one service id:

| range | answer |
|---|---|
| `2026-09-12..09-30` | **200, zero days** |
| `2026-10-01..10-31` | **200, zero days** |
| `2026-11-01..11-30` | **200, zero days** |
| `2026-12-01..12-31` | a full month |

**Minutes later the identical October request returned 31 days, 23 open**, and
he *"could not reproduce it again across eight rapid calls."*

### WHY IT IS SERIOUS

**The customer sees a calendar where no day is selectable, with no error, and
cannot book.** Nothing on the page can tell the difference between *this
business is fully booked* and *we failed to find out*.

### WHAT HE ASKED FOR

> Find the path that returns success with no days — **suspect a catch block or a
> cold-start timeout fabricating a successful empty answer, which is the same
> fault we have hit before** — and make it answer honestly so the page can say
> *"couldn't load times, try again"* rather than showing an empty month.

### WHAT THE REPO ALREADY KNOWS THAT BEARS ON IT — read before investigating

- **`FOUND.md` § THE "GATEWAY TIMEOUT" IS OUR OWN CATCH BLOCK.** Roughly **1.1%
  of every REST call this project makes returns 504** from Supabase's own API
  layer — 30 of 2,645 in ninety minutes, 14–22 an hour whatever the traffic. **A
  function's chance of dying is its NUMBER OF REST CALLS.** An intermittent,
  unreproducible, request-shaped failure is exactly that signature, and "three
  in a row then fine" fits a burst (they arrive **three to six inside a single
  second**, which is a `Promise.all` landing).
- **`_shared/retryRead.ts` retries 5xx on READS ONLY, three attempts** — and
  `ROADMAP.md` records that **34 of 35 edge functions are still running WITHOUT
  it**. `node scripts/check-deployed.mjs` is how to find out whether
  `available-slots` is one of them. **That may be the whole fix**, and if so the
  honest answer is a deploy plus a check, not new code.
- **The empty answer is the seventh costume** — an instrument reporting fine when
  it cannot tell. `ROADMAP.md` item 3's `up_to_date` three-valued contract is the
  precedent Andrew already approved for this exact shape: `true` / `false` /
  **`null` meaning we cannot tell**, never a cheerful empty.
- **`tests/booking-core.test.mjs` § 14 is the calendar's stale-answer guard** —
  whatever is added here belongs beside it, and `app/src/book/core.js` holds the
  rules. **The core is lane C's to read; the PAGE that draws the error is lane
  B's**, so expect this to end in a handover for the message itself.

### THE TRAP TO AVOID

**Do not conclude from an unreproducible failure that it was transient.**
`FOUND.md` has the sentence for this: *"It was failing intermittently" invites a
future reader to wait and see; "it could never have worked" tells them the green
runs were the job having nothing to do.* Establish which this is — the
distinguishing evidence last time was one job at 0 successes while its neighbour
was at 11 of 24, i.e. a structural limit rather than a flaky network.

---

## 3 · ~~THREE EMAIL DEFECTS~~ — ALL THREE DONE 2026-09-13. THE QUESTION IS ANSWERED BELOW.

**All three found by reading real delivered mail out of Resend**, not by reading
code. `node scripts/render-emails.mjs` writes `email-preview/*.html`; **send him
the INDIVIDUAL files, never `index.html`**, which is only links to files he does
not have.

### (a) EVERY DETAILER EMAIL EMITS `color: undefined`

In the dark-mode block, literally:

- `.c-accent`, `.bg-accent` and `.c-accent-ink` all say **`undefined
  !important`**
- and so does the `[data-ogsc] .c-accent` rule

**The identical PLATFORM email emits real values** — `#38e08b`, `#0b1220`. So
**the tenant accent is skipping the colour-derivation step the platform brand
goes through.** Start at `supabase/functions/_shared/brandColor.js`,
`platformBrand.ts`, `emailKit.ts` and `emailTemplates.ts`, and find where the
platform path derives and the tenant path does not.

### (b) SAME ROOT CAUSE, WORSE SYMPTOM — A TENANT WITH NO ACCENT FALLS BACK TO OUR GREEN

A tenant with no accent set falls back to the **PLATFORM green `#38e08b`** and
uses it **raw as a footer link colour on the `#EFEEE7` background** —
**unreadable, and it makes the detailer's mail look like ours.**

The contrast proof that the derivation exists and works:

| | stored | used for text |
|---|---|---|
| Riverside | `#dc2626` | **`#e35252`**, correctly darkened |
| platform | `#38e08b` | **`#116e3f`**, correctly darkened |
| a tenant with nothing set | `#38e08b` **ours** | **raw** |

**His instruction: derive per tenant, and pick a real per-detailer fallback
rather than our green.** The second half is a product decision he has already
made — the fallback must not be platform green.

**RELATED RULE ALREADY SETTLED, so do not re-decide it:** `ROADMAP.md` § Not ours
to decide records **THE COLOUR FOLLOWS WHOSE RELATIONSHIP IS ENDING** — a
customer-facing page of a detailer's gets the detailer's colour; a detailer
unsubscribing from something of OURS gets platform green. An email from a
detailer to their customer is the detailer's colour.

### (c) THE "WHERE" ROW RENDERS ITS LABEL WITH AN EMPTY VALUE

**In every booking email he read, across two different tenants** — so **a mobile
booking confirmation that never says where.** `_shared/email.ts` is where the
address is assembled; note it already reads `vehicle_size_label || vehicle_size`
for the vehicle, which is the pattern a missing field wants.

### AND ONE THING HE PUT TO MY JUDGEMENT

> The request-accepted email (**"You're booked in"**) carries **no services and
> no price at all**, while **"Booking confirmed"** carries the full table and
> total.

**That is a question, not an instruction.** Worth noting the product context
before answering it: `respond-to-booking/index.ts` confirms a request at
`total_price` and **nulls `quoted_amount`**, and `FOUND.md` already records that
*the card does not say which number Accept will use* and that **it is money.** So
the missing table may be hiding the one number the customer most needs to see.

### AND THE BIGGER ITEM THIS SITS INSIDE

`ROADMAP.md` § A · THE EMAILS, REVIEWED END TO END is his standing ask: two
lists, **every email we send with a judgement on each, and the ones we are
MISSING.** Start from *"nobody has ever read these"* — the reminder sweep was
dead eighteen hours and nobody noticed, **which means nobody was reading its
output either.** These three defects are evidence for that, not exceptions to it.

---

## 3b · ~~THE QUESTION HE PUT TO MY JUDGEMENT~~ — ANSWERED, AND BUILT 2026-09-13

> The request-accepted email (**"You're booked in"**) carries no services and no
> price, while "Booking confirmed" carries the full table and total.

**ANDREW CONFIRMED THE ANSWER AND IT IS BUILT — 2026-09-13.** The price table,
the label *"Estimated total"* and the estimate caveat are on *"You're booked
in"*, copied verbatim from the confirmation email's own four lines.
**His reason for keeping the word "Estimated", in his terms: for detailing the
price genuinely can move once they see the vehicle's condition, so calling it
settled would be a promise he cannot keep — and the two emails must not describe
the same number two different ways.** That closes the one thing the answer below
said it would not decide without him.

`respond-to-booking` now selects `services:booking_services(name_at_booking)`
and the add-ons the way `accept-quote` and `send-invoice` already did, so the
total has its lines under it. Deployed and rendered: `email-preview/
customer-accepted.txt` carries the full ladder and the $345.00 total.

**AND IT TURNED UP A SEPARATE DEFECT IN THE SAME BLOCK.** The travel line read
`Travel — Outer ring`, which is the exact string `CLAUDE.md` uses as its worked
example of an em dash that must become a middle dot — nineteen hours after the
Wave F sweep reported zero left. **The sweep never reached
`supabase/functions`; nineteen more are there.** Fixed the one, recorded the
rest: `FOUND.md` § THE EM DASH SWEEP STOPPED AT THE EDGE OF THE EMAILS.

**The original argument, kept because the reasoning is what makes the answer
right:**

**THE ARGUMENT.** In request mode the customer's FIRST email says *"we're holding
your time"* and explicitly charges nothing. **"You're booked in" is therefore the
only email that ever tells them the job is happening**, and it is the moment the
money stops being a hypothetical: `respond-to-booking` writes `total_price` and
**nulls `quoted_amount`** in the same update. `FOUND.md` already records that the
detailer's own Accept card does not say which number Accept will use. **So right
now nobody — not the detailer pressing the button, not the customer receiving the
email — is shown the figure at the moment it becomes binding.** That is a money
path with no statement of the amount on it, which is exactly what
`CLAUDE.md`'s *a number PRINTED is not a number CHARGED* is about.

The template already knows this argument, incidentally: the same branch carries
the payment handles, with a comment saying *"THIS IS THE CONFIRMATION FOR HALF
THE TENANTS… leaving it out would give every request-mode business no payment
handles on the only email that confirms anything."* **The identical reasoning
applies to the total, and it was applied to the handles and not the money.**

**THE COST, WHICH IS WHY IT IS PARKED AND NOT SKIPPED.**
`respond-to-booking/index.ts:127` hard-codes `serviceNames: []` and
`addOnNames: []`, so dropping a `moneyBlock` in today prints a total with no
lines under it. The fix is small and already has two worked examples:
`accept-quote` and `send-invoice` both select
`services:booking_services(name_at_booking)` and map it. So: widen that select,
map the names, and reuse the confirmation email's exact three lines —
`labBlock("What we're doing")`, `moneyBlock(brand, quoteLines(b, b.lang), { label: "Estimated total", amount: Number(b.total) })`,
and the estimate caveat. **Reuse those three verbatim rather than writing new
wording**, or the product grows a second voice for the same fact.

**ONE THING TO GET RIGHT:** for a booking accepted through `accept-quote` the
binding number is the quoted amount, which that function has already moved into
`total_price` — so reading `b.total` is correct for both paths and no branch on
`kind` is needed.

**WHAT I AM NOT DOING WITHOUT HIM:** changing the word *"Estimated"*. A detailer
who has looked at a request and accepted it may be making a firmer promise than
an estimate, and that is his call about what his product promises, not mine.

---

## 4 · ~~NWS WEATHER — `api.weather.gov`~~ — DONE 2026-09-13

**BUILT, DEPLOYED AND PROVED LIVE — 2026-09-13. `docs/weather.md` is the
reference; this entry is now only the pointer.**

`_shared/weather.ts` is the one module (nothing else in the repo names the host,
and `tests/weather.test.mjs` § 12 fails if that stops being true).
`supabase/functions/forecast` is the member-gated endpoint. 49 stubbed checks,
baselined by six deliberate breaks; 16 live checks through
`scripts/probe-forecast.mjs`, including the deployed function.

**TWO THINGS TO CARRY FORWARD.**

1. **NOTHING IN THIS PRODUCT STORES A LATITUDE** — measured, zero matches across
   every migration — and the NWS has no geocoder. That is NOT a blocker: the
   endpoint takes a POINT and `navigator.geolocation` supplies one with no
   service and no attribution. Geoapify stays § 6 and stays unstarted.
2. **THE SCREEN IS LANE B'S AND IS NOT BUILT.** `docs/weather.md` § THE SCREEN
   is the handover, and its three notes are the ones that matter.

**Specified in full in `ROADMAP.md` § FREE THIRD-PARTY SERVICES → 1 · WEATHER.
Andrew's order: after the doorbell, before Geoapify.** The doorbell is done.

- **No key, no account, commercial use explicitly permitted.** US-only, which is
  all this product needs.
- **It REQUIRES a `User-Agent` header identifying the application.** A request
  without one is refused. **Not optional politeness.** He named this twice.
- **Their own docs warn a key may arrive later**, so **the base URL and the
  User-Agent go behind ONE small module**, not scattered `fetch` calls. The day a
  key arrives that is a one-file change or a week of grep — the same posture
  `_shared/translate.ts` takes for the two translation providers.
- **DO NOT USE OPEN-METEO.** It is better documented and looks free; **its free
  tier is NON-COMMERCIAL ONLY and this is a commercial product.** The reason is
  recorded so nobody swaps it back in for looking cheaper.
- **`ROADMAP.md`'s old item 9 says "Weather, from open-meteo" and is SUPERSEDED
  by this.** Whoever works the numbered list should not read that line as the
  instruction.

---

## WHAT IS PARKED FROM ITEM 1 AND IS NOT ITEM 2, 3 OR 4

Both in `FOUND.md` § THE DEFINER SWEEP, neither blocking:

- **`job_photo_budget(uuid)` still does not check membership** — authenticated
  only now, so the internet is out, but a detailer can still read another
  business's storage usage and cap by passing that id. Needs a decision about
  which permission gates it.
- **`accrue_plan_visits()` is granted to `authenticated` explicitly** in its own
  migration, so it was left alone. Bounded and idempotent, but nothing explains
  why `authenticated` needs a platform-wide writer at all.
- **The live business project `adtlnvihwrcqcasqcjwd` has never been checked for
  either the 504 rate or the definer grants.** Standing ruling: Andrew's
  decision, with him present, and **no session goes looking for credentials.**

---

## HANDOVERS OWED AFTER ITEM 4 — written down 2026-09-13 because none of them is this lane's to do

**Three files needed an edit that lane C is not allowed to make, and one screen
belongs to lane B.** Recorded here rather than said in a message, because a
thread that lives only in a conversation dies at the clear.

### LANE M — three lines in files only M writes

1. **`ROADMAP.md` item 9 still reads *"Weather, from open-meteo."*** It is
   superseded and **following it is a licence breach** — open-meteo's free tier
   is non-commercial. Item 4 of this queue already says so; the numbered list
   does not. **This is the dangerous one.**
2. **`ROADMAP.md` § 5 · THE NATIONAL WEATHER SERVICE WORK is done** and says only
   *"Andrew's order: after the doorbell, before Geoapify."* Point it at
   `docs/weather.md`. **Geoapify (§ 6) is now the next of the three.**
3. **`docs/README.md` needs one row**, which lane C wrote and then reverted when
   `lane-check.mjs` named the file as M's:
   `| `weather.md` | **LIVE** | The NWS seam — api.weather.gov, the required User-Agent, the one-module rule, the three honest failures, and why no screen draws it yet. Built 2026-09-13. |`

### LANE B — the screen, and it is small

`docs/weather.md` § THE SCREEN is the whole brief. The endpoint is live and
proved (`POST /functions/v1/forecast`, member-gated, 16/16 in
`scripts/probe-forecast.mjs`). Three notes decide whether it is right:
`navigator.geolocation` supplies the point and no geocoder is needed;
**`outside_coverage` and `unavailable` are two different sentences** and only one
of them offers a retry; and **`precipChance` can be `null`, which is not 0.**

### AND ONE THING EVERY LANE SHOULD KNOW

**All 36 edge functions were redeployed at 05:59 UTC** — `_shared/emailTemplates.ts`
is imported by most of them, so a partial deploy would have left
`check-deployed` reporting thirty stale. **Any green browser run taken before
that time is against different server code.**

---

# THE SECOND LANE C SESSION — 2026-09-13, `eaa3df3` and `926e002`

**All three of Andrew's items are delivered. ONE DECISION IS OPEN and it is
his.** The three one-line handover edits below were done first, on his explicit
authorisation for this session only.

## DONE — the three handover edits lane M owns

All three applied, and the commit message says he authorised it:

1. **`ROADMAP.md` item 9** no longer reads *"Weather, from open-meteo."* It is
   struck through and says open-meteo is BANNED because its free tier is
   non-commercial. **That line was a licence breach sitting in writing.**
2. **`ROADMAP.md` § 5** is struck through as done and points at `docs/weather.md`.
3. **`docs/README.md`** has the `weather.md` row.

## DONE — 1 · THE EM DASHES, AND IT WAS 106 RATHER THAN 19

`tests/em-dash.test.mjs` is the standing check, baselined by four breaks.
English and every Spanish key moved together. The full account, including why
the first count was low and the renderer-fixture divergence it turned up:
`FOUND.md` § THE EM DASH SWEEP IS DONE.

## DONE — 2 · THE WATCHDOG THAT NEVER SAID ALL-CLEAR

**Root cause found in the project's own edge logs, to the millisecond:**
`watch-jobs` claimed the change set and THEN read the address to send it to, and
the settings read 504'd 95ms after the claim. Three fixes — the order, the
discarded error, and an undo that only worked one way. `FOUND.md` § THE WATCHDOG
CRIED WOLF AND NEVER SAID ALL-CLEAR.

**The alarm itself was TRUE**: the sweep's heartbeat stopped at 08:00:54 on
12 Sept and did not return until 01:53:52 on 13 Sept, eighteen hours, while the
function booted every fifteen minutes.

## DONE — 3 · GEOAPIFY, THE LANE C HALF. **AND A DECISION IS OPEN.**

Built, deployed, proved: `_shared/geoapify.ts`, `address-suggest`,
`tests/geoapify.test.mjs`, and `docs/address-autocomplete.md` as the lane B
handover. The key is server-side only and the attribution exists once.

**HE ASKED TO BE TOLD IF THE ROUND TRIP WAS TOO SLOW, AND IT IS.** Ten warm
calls: 2.0–3.2 seconds, with a tail past six on an ambiguous query. Typeahead
wants 300ms. **Nothing was done about it, on purpose** — his instruction was to
come back and tell him rather than quietly put the key in the client.
`docs/address-autocomplete.md` § THE LATENCY has the numbers and three options.

---

## STILL OWED, AND NONE OF IT IS LANE C'S

### LANE M — `ROADMAP.md` § 6 is now half-built and does not say so

It still reads *"DO NOT START IT UNTIL TRANSLATION AND THE DOORBELL ARE DONE"*,
which is spent. **Lane C did not touch it** — the authorisation was for three
specific lines and nothing else. It needs to say: the server half is built and
deployed, the screen is lane B's, `docs/address-autocomplete.md` is the
handover, and **the latency decision is with Andrew.**

### LANE B — two screens, both with their brief already written

1. **The weather screen.** `docs/weather.md` § THE SCREEN. Unchanged from the
   last session's handover.
2. **The booking address field.** `docs/address-autocomplete.md` is the whole
   brief. **Do not start it until Andrew has answered the latency question** —
   the answer decides whether it is live typeahead or a *Find* button.

### AND TWO THINGS FOUND IN PASSING, BOTH LANE B's

- **The back office has no price editor.** `platform-admin` answers fifteen
  actions and the screen calls six; `prices`, `promo_new`, `promo_off`, `note`,
  `site`, `export`, `tier` and `resend_invite` have no caller anywhere in
  `app/src`. `tests/platform-billing.test.mjs` is **335 passed, 1 failed** and
  **the failure is correct** — it has been left red on purpose rather than
  edited to pass, because making it pass would hide a missing screen.
  `FOUND.md` § EIGHT BACK-OFFICE ACTIONS HAVE NO DOOR.
- **The rebuilt Plumbing tab dropped the named job list**, so a scheduled job
  whose heartbeat ROW went missing is now watched by nothing — and `watch-jobs`'
  own comment relies on that list as its compensating control.
  `FOUND.md` § THE WATCHDOG'S BLIND SPOT.

---

# THE THIRD LANE C SESSION — 2026-09-13, `92ef895`

**All three of Andrew's items are delivered and the handover edit he asked for
first is done. Nothing is blocked on him.**

## DONE FIRST — the lane B handover now specifies the Find button

`docs/address-autocomplete.md`. The latency question is CLOSED, in his words —
*"a Find button the customer presses once after typing, not suggestions as they
type"* — and § THE FIND BUTTON is the spec. **The sentence he asked for in as
many words is in the file twice, in the header and in its own heading: if the
address does not resolve, the customer still continues with whatever they
typed.** The old debounce section is struck through rather than deleted, with
the two of its four rules that survive marked STILL LAW.

## DONE — 1 · THE CUSTOMER REMINDER, WHICH WAS BUILT AND HAD NEVER RUN

**`customer_reminder_sent_at` was non-null on 0 of the 56 bookings this product
has ever had.** His 125-message sample was not a sample that happened to miss
one; there was nothing to find.

Three faults on one line of the sweep, the root one being that
**`sendTenantEmail` returns `false` and does not throw**, so a refused send fell
through to `mark()` and the booking was stamped *reminded* for ever. The same
false sentence — *"sendTenantEmail throws on a hard failure"* — sat in the
maintenance block, so a **warranty deadline** was advanced on a send that
failed.

Full account, the timing decision he asked me to make, and the one thing about
it I would change but did not: **`docs/customer-reminder.md`.**

## DONE — 2 · THE SPANISH TRAVEL ZONE. ANSWERED, NOT BUILT.

**We do NOT generate "Beyond 15 miles" from a radius**, so it is not our copy
and needs no Spanish key. It is `settings.travel_zones[].name`, free text a
detailer types; the demo's copy was typed by us in `scripts/seed-demo.mjs:226`.
It is already classified translatable and **DeepL has already stored *"Más allá
de las 15 millas"***. It renders in English because **nothing in `app/` has ever
called `get_business_translations`** — no tenant prose is translated on any
page. `docs/handover-translate-lane-b.md` § 8 is the answer and the three-line
fix, and it notes that *"Long Beach"* reads correctly today **by luck**.

## DONE — 3 · THE EMAIL CAP

**True, and it had already happened twice in a week**: 240 attempts on 09-07,
117 on 09-08, 94 by 06:55 today, against a cap of 100. A reserve of 20 is now
claimed atomically before the provider is called, and only mail the platform
sends in its own name can reach it. `docs/email-budget.md`.

**What it does NOT fix is the bill** — the suites still spend up to 80 a day.
That needs a decision rather than an edit and is in `FOUND.md`.

## FOUND IN PASSING, NOT FIXED

- **Seven edge functions were running pre-Geoapify code**: every importer of
  `_shared/rateLimit.ts` except `address-suggest`. Redeployed; all 37 current.
- **`tests/platform-admin.test.mjs` is 111 passed, 49 failed**, identical with
  lane C's changes stashed, and every failing check reads `app/src/admin/**`.
  **Lane B's.** `FOUND.md`.
- The two Andrew named — **no price editor** and **the Plumbing tab's dropped
  job list** — were already in `FOUND.md` and were left exactly as they are.

## STILL OWED BY LANE M — one line, and it is the same one as last time

`docs/README.md` needs rows for the files written tonight. Lane C did not touch
it; it is M's.

```
| `customer-reminder.md` | **LIVE** | Why the customer appointment reminder had sent zero emails in 56 bookings, the three faults, and the timing decision. 2026-09-13. |
| `email-budget.md`      | **LIVE** | The daily email allowance, the platform's reserved slice, and what the test suites actually spend. 2026-09-13. |
```


---

## WAVE OF 2026-09-13, LATE - THREE ITEMS, AND WHAT IS LEFT OF THEM

**Done and committed:** the evening-before reminder threshold moved to noon
(dc426cb); the fake mail transport is now the default for every suite (3a9c8cb)
with a guard that fails on any undeclared charged address; dead-mans-switch
counts what the gate counts (18d0ee0-ish, see log); platform-admin went from
111/49 to 118/43 (5351d00) after its strip() was found deleting 43-75% of every
non-SQL file it reads.

**STILL OWED, AND MOST OF IT IS NOT LANE C.**

- **Lane C, next wave:** the nine stale-spelling checks in group A of
  docs/platform-admin-triage-2026-09-13.md. Each is a re-point, and each needs
  baselining against a mutated copy of the screen IN MEMORY - never by editing
  app/src, which is lane B.
- **Lane B:** everything in group B of that file. Several name a capability with
  no trace in the rebuilt back office; three of them are FOUND.md's watchdog
  blind spot wearing a different hat.
- **Everything in the two OWED sections above this one is unchanged** and none of
  it is lane C. Re-read before assuming otherwise.

---

# THE WAVE OF 2026-09-13, LATE — `tests/platform-admin.test.mjs`, FINISHED

**All three items in the prompt are delivered. Nothing is blocked on Andrew.**
Full account: `docs/platform-admin-triage-2026-09-13.md` § THE SECOND TRIAGE
PASS. Ledger rows: `docs/VERIFIED.md` § 3.

## DONE — 1 · THE NINE GROUP-A CHECKS (twelve ids)

**118 passed / 43 failed → 130 passed / 30 failed.** Every one was the check
naming a spelling the rebuild changed. Baselined against **mutated copies of the
screen held in memory**, 26 mutations, each red on exactly what it guards.
`app/src` was never written.

Two are worth knowing about beyond the re-point:

- **`12m`'s count flipped from ONE to ZERO.** The degradation switch moved out of
  `admin.css` into one live listener in `main.jsx` that toggles `.lite` for both
  the media query and `?lite=1`. A `@media (prefers-reduced-motion)` block in
  that stylesheet is now the defect, not the requirement.
- **`12h-ii` was a magic threshold** (`>= 3` staggers) failing a correct file
  with two. It counts its subjects and asserts every one conforms now.

## DONE — 2 · THE HOLLOW-PASS AUDIT. **EIGHTEEN OF THE 118.**

Gutted every `read()` to `() => ""` and re-ran: **20 checks stayed green against
nothing.** One of those was failing in the real run anyway (`no chart`) and one
is a behavioural check that reads no source at all and is correctly green
(`11h-v`, which runs `monthlySeries`). **So eighteen of the 118 were hollow.**
It is **1 now**, and that one is `11h-v`.

Sixteen were bare absence claims; they name an ANCHOR through a new `absent()`
helper, so a missing subject is a FAILURE. Two were subject counters counting the
wrong thing — migration FILES and DIRECTORY ENTRIES, both of which exist whatever
is inside them, **so neither could ever have detected the `strip` damage they
were there to catch.** One (`11n`) had the `indexOf`/`-1` slice trap this suite
already documents four hundred lines away.

**AND THE AGGREGATE GUARD WAS TRIED AND ABANDONED, WHICH IS THE TRANSFERABLE
PART.** Failing when `strip` removes too much of a file cannot work here: the
FIXED strip legitimately removes **83% of `signout.js`, 78% of
`impersonation.js`, 73% of `App.jsx`**. In this codebase a massive deletion looks
completely normal, which is exactly why the bug lived for weeks.

**`no chart` was DELETED.** It asserted `AdminPage.jsx` has no chart while five
checks in the same file assert a six-month bar chart is drawn on that page. It
could never have passed.

## DONE — 3 · NOTHING ELSE IN THIS FILE WAS LANE C's

Re-read, item by item. Every remaining OWED line belongs to lane M or lane B and
is unchanged. Group C of the triage was un-probed and has now been probed,
because leaving it would have left the handover wrong.

## HANDOVER TO LANE B — and the biggest item is NOT what the first pass thought

`docs/platform-admin-triage-2026-09-13.md` § 4 has the probes. The correction:

**IMPERSONATION IS NOT GONE, AND IT WAS ANDREW WHO CHANGED IT.**
`AdminPage.jsx:1165` quotes him — *"view their dashboard... just from me"* — and
it now opens a `/preview` tab holding its own session in its own drawer
(`lib/preview.js`, `admin/PreviewEntry.jsx`), with the comment **"No warning,
because there is nothing left to warn about."** The server half never changed:
the action still logs before it acts and a failed log still stops it.

**So `13c-ii`, `13e` and `the button warns before it acts` are three checks to
RETIRE, not a feature to restore.** Lane C did not retire them, because deciding
that a product change is deliberate is one thing and editing a check whose
subject is another lane's live screen is another — and these three are the ones
where getting it wrong deletes the guard on a cross-tenant door.

**The genuine group-B losses stand**: the Growth strip (`pa-strip`, `pa-num`,
`pa-lead` all zero), the named job list in Plumbing (already `FOUND.md` § THE
WATCHDOG'S BLIND SPOT), the export-as-a-file, `keepMsg`, the two-column split,
the owner-account guard and the email-cap figures on the screen.

## OWED, AND NOT LANE C's

- **`FOUND.md` is at the repo root and `lane-check.mjs` calls it "lane nobody"**,
  so nothing was written there tonight. The hollow-pass finding deserves an entry
  — it is the second time in one day that this suite's own instrument was the
  bug — and the material is in the triage file ready to be lifted. **Lane M's
  call.**
- Everything in the three earlier OWED sections above is unchanged.

---

## WAVE OF 2026-09-13 — `scripts/e2e-booking.mjs`, RED FOR TWO DAYS, NOW GREEN

**Full account: `docs/e2e-booking-triage-2026-09-13.md`.** In one paragraph:
**65 passed / 15 failed** at `36dd489` on a quiet tree, and **not one failure
was a product defect.** Ten were stale checks with three root causes, all three
being deliberate product changes nobody updated the check for; six were the
day's tenant email allowance being spent, which is the reserve working.

- **The money four** — `lib/format.js` has printed `$105` rather than `$105.00`
  since 2026-09-11; the check demanded the cents. It now imports the product's
  own `money()` instead of keeping a second copy of the rule.
- **The name five** — the details step's heading became "Your details" on
  2026-09-12 and the script keyed its name-vs-address decision on the old
  wording, so the customer was called "140 Market Street, Long Beach, CA". That
  ONE line took out four more checks, and **all four named the detailer's
  dashboard, which was never at fault.** It fills by `autocomplete` token now,
  and a new check goes red if the name box is not found.
- **The tenth** — `FOUND.md` guessed trap (e) then trap (f); it is **neither**.
  `count()` does not auto-wait and `getAttribute()` does, so on a slow
  `available-slots` the check reads zero cells and then prints the class of the
  perfectly good cell it just missed. Intermittent, caught passing and failing
  on the same commit an hour apart. Fixed by waiting for the grid.
- **The email six** — `send-email` answered 429 `daily_cap`. Two of the three
  red lines carried a FALSE diagnosis, naming the undeliverable-domain guard
  for mail that was refused a budget. They **skip loudly** now, and the summary
  line carries a skipped count so a skip can never read as a pass.

### AND THE GREENS WERE AUDITED TOO — one hollow pass, and it was the big one

`slotsOn()` ended `?? []`, so **every failure of `available-slots` became an
empty list**, and the two checks that read a MISSING time as proof — *"08:00 is
no longer offered"* and *"09:00 is taken"*, which together are the
double-booking guard — went green on a call that died. **Item 2 of this very
file is Andrew watching that endpoint answer 200 with no days at all.** The read
is asserted where it is made now.

## OWED, AND NOT LANE C's TO DECIDE

- **THE EMAILS PRINT `$150.00` WHERE THE PAGE PRINTED `$150`.** Captured live in
  this run's own subject line. `supabase/functions/_shared/emailKit.ts:154` is a
  **second money formatter** that never got the 2026-09-11 decision, which said
  it was *"safe to apply everywhere at once"*. It is lane C's folder but it is
  its own item: nineteen edge functions import `money`, and it needs a deploy,
  `check-deployed.mjs`, and the email fixtures re-rendered. **Not folded into
  this commit, on purpose.**
- Everything in the four earlier OWED sections above is unchanged.
