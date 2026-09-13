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
