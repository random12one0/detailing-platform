# Code-health and correctness audit, 2026-10-14

Read-only. Taken at `3501cde0`. No code was changed and nothing was committed.
Scope: booking and scheduling, time zones, pricing and payments,
notifications, state changes, tests, dead code, and clutter in the repo root.
Findings already in `docs/audits/comprehensive-audit-2026-09.md` were skipped.
Each finding below was checked against `ROADMAP.md` and `FOUND.md` with grep,
and is marked **new** or **known (item)**.

Method: the code was read and traced by hand. Bugs that could be proved
offline were proved with small local node scripts against the pure modules
(no network, no database). Line numbers are taken at `3501cde0`.

## Test results

Command: `node --test --test-concurrency=4 <files>`, run without `.env`
loaded, on the **82 suites that need no credentials**. The other 71 suites
read `.env` and talk to the live database, so they were not run.

**389 tests: 380 pass, 9 fail, across 8 files.**

| Suite | What fails | Status |
|---|---|---|
| `em-dash` | 6 em dashes in user-facing copy, all from commit `0914a145` (0.4, the build-start notice): `platform-admin/index.ts:1029,1083`, `_shared/emailTemplates.ts:1737,1765`, `_shared/strings/es.ts:434,436` | **new** |
| `mail-sink` | 3 undeclared test addresses that can cause a send: `scripts/office-money.mjs:42`, `office-system.mjs:40`, `office-today.mjs:41`. They also use `@detailplatform.com`, which is not the platform's own domain | **new** (the older two in ROADMAP were different files) |
| `skip-census` | `user-tours-race.mjs` and `visual-regression.mjs` count their skips with an expression but are not declared | **new** |
| `skip-evidence` (2 tests) | `sweep-widths.mjs` has 1 `addSkip` site (`:1349`); the test requires at least 2, and its canary still edits a removed `pressEvidence(k.endMs, TOUR_WAIT_MS)` line. The tour skip went with the tour removal; the test was not updated | **new** |
| `admin-insight`, `growth-lines` | Both crash reading `app/src/admin/AdminPage.jsx`, which was deleted in `002639c3` | known (ROADMAP 99.10 §5) |
| `photo-release-order` §6, `photo-door-contract` §3 | Still pin the pre-release world (`RECEIPTS_VIA_DOOR = false`, the old error wording) | known (ROADMAP 98.5, fix held on a branch) |

**Side effect worth knowing:** running the suites **rewrote 2 tracked
files** (`receipts/mid-period-comparison.json`, `receipts/money-overstatement.json`).
17 test files write receipts into the tracked `receipts/` folder, so a plain
test run makes the git tree dirty. Both files were restored with
`git checkout --` straight after, and the tree is clean.

---

## Ranked findings

Severity is about what a detailer or customer would actually lose.
**H** = money or a booking goes wrong without anyone being told. **M** = a
real fault with a narrower trigger. **L** = small, rare, or cosmetic.

### H1. On the two clock-change Sundays, morning bookings are saved an hour off. New.
- **Evidence:** `supabase/functions/_shared/tz.ts:15-35` (`localToDate`).
  It finds the zone offset once, at a guessed instant that is the wall-clock
  time read as UTC. In Los Angeles that guess is 7 to 8 hours early, so it
  falls on the wrong side of the clock change.
- **Proved in node, America/Los_Angeles:** on 2026-03-08, 08:00 is saved as
  16:00Z, which is 9:00 AM. 09:00 and 10:00 are both saved as 17:00Z. On
  2026-11-01, 08:00 is saved as 15:00Z, which is 7:00 AM. Ordinary days are
  correct.
- **Callers:** `slotValidation.ts:149` produces the stored `start_at`
  (`create-booking/index.ts:489-490`, `reschedule-booking/index.ts:108`),
  plus the confirmation email time, the notice check
  (`available-slots/index.ts:381`), the rush-fee math (`pricing.ts:352,358`)
  and `BulkJobModal.jsx:81`.
- **What it means:** a customer books 8:00 AM, and the calendar, the email and
  the reminders all say 9:00. A second customer is refused a slot that looked
  free. This happens twice a year, every year.
- **Fix:** one function, so every caller is fixed at once. Re-derive the
  offset at the first result. Two passes were checked against all 24 hours of
  three clock-change days, with 0 mismatches. Add a DST case to a
  credential-free test.

### H2. A plan member booking several cars on different days gets every car free. New.
- **Evidence:** `app/src/book/core.js:1502-1511` copies `plan_id` onto every
  car's booking. `_shared/pricing.ts:537-541` prices each car in a split-day
  booking as its own one-car booking. `pricing.ts:665-671` covers "the first
  car", so every car counts as the first.
- **Proved:** 3 cars on the same day comes to $400 (one car covered). The same
  3 cars on 3 different days comes to **$0**.
- **Fix:** send `plan_id` only with the first car, or have `create-booking`
  refuse a plan on any row with `group_with` set.

### H3. Different-day multi-car bookings are quoted at car 1's day and charged at each car's own day. New.
- **Evidence:** `core.js:328-331` sends only size and model for the other
  cars. `calculate-booking/index.ts:67-71` matches price rules once, against
  car 1's date. `create-booking/index.ts:231-235` matches each car against its
  own date.
- **Proved:** with a +$30 weekend rate, car 1 on Monday and car 2 on Saturday
  are quoted **$400** and charged **$430**. Reversing the order quotes $460
  and charges $430.
- **What it means:** the customer is shown one price and charged another. That
  breaks the product's first rule.
- **Fix:** send each car's date and time with the quote and match rules per
  car. The cheapest guard for H3, M3 and the rush-fee case in L-misc: the page
  sends the total it showed, and `create-booking` refuses with "the price
  changed" when its own total differs.

### H4. The Stripe webhook marks a job paid before the money has arrived, and never checks the amount. New.
- **Evidence:** `stripe-webhook/index.ts:609-669` sets `payment_status: "paid"`
  on `checkout.session.completed` without reading the session's own
  `payment_status`. `pay-booking/index.ts:121-148` does not limit payment
  methods. There is no handler for `checkout.session.async_payment_succeeded`
  or `async_payment_failed`, and no check that the amount charged equals the
  amount owed.
- **Scenarios:**
  - A detailer has bank debit (ACH) turned on in Stripe. The job reads as paid
    days before the money lands, and if the debit fails it stays "paid".
  - A $100 checkout page is still open after the final amount is changed to
    $150. Paying that page marks the full $150 as paid.
  - Two live checkout pages can both be paid. The second payment is ignored
    and the detailer is never told they owe a refund.
- **Fix:** mark paid only when the session's status is `paid`. Handle the two
  async events. Store and compare the amount charged. Expire the old session
  when the amount changes.

### H5. The reminder sweep sends every due reminder twice if two runs overlap. New.
- **Evidence:** `send-owner-reminders/index.ts` writes each "sent" marker only
  after its send (around 212-213, 240-263, 274-318, 351). The endpoint has no
  login by design (`:552-557`), and nothing stops a second run starting while
  one is in progress (compare `photo-reconcile/index.ts:9`). The digest
  (513-546) and the maintenance stages (385-495) work the same way.
- **What it means:** a manual run during a cron tick, or anyone posting to the
  endpoint, sends customers and owners duplicates and burns the daily email
  allowance.
- **Fix:** claim each row before sending it (`update … set x_sent_at = now()
  where id = ? and x_sent_at is null returning`, and clear the marker if the
  send fails), or refuse a run when the last one was under 5 minutes ago.

### H6. One bad owner address makes the other owner addresses get the same email every 15 minutes. New.
- **Evidence:** `send-owner-reminders/index.ts:149-165`. `mustSend` throws
  inside the loop over recipients, so recipient A's successful send leaves no
  marker when recipient B fails. The push at `:167` is skipped as well. The
  stale-request nudge (335-351) does the same.
- **Fix:** keep a marker per recipient, or mark once at least one send
  succeeds and log the rest. Send the push separately from the email loop.

### M1. Unsubscribing from marketing also stops appointment reminders. New.
- **Evidence:** `supabase/migrations/20260913020000_customer_reminder_is_due_only_if_sendable.sql:116,169`
  filter on `c.unsubscribed_at is null`. That contradicts
  `unsubscribe/index.ts:24-28`, which says reminders are exempt and "Only
  `send-campaign` reads this flag".
- **What it means:** a customer who unsubscribes from a campaign still gets
  booking confirmations but never a reminder, which means more no-shows.
- **Fix:** a new migration that drops that condition from both reminder
  functions and keeps `email_failed_at`.

### M2. After a booking moves, the second customer reminder never goes out again. New.
- **Evidence:** the trigger in
  `20260829000100_reminder_marker_reset.sql:27-32` clears five markers. It was
  written before `customer_reminder_2_sent_at` existed (`20260903001000`) and
  was never updated. `owner_request_nudge_sent_at` is not cleared either.
- **What it means:** move a job from Thursday to Friday and the reminder two
  hours before Friday's appointment is never sent.
- **Fix:** a new migration that recreates the trigger function and clears both
  markers.

### M3. Different-day multi-car booking plus a one-use promo: car 1 books and car 2 is refused. New.
- **Evidence:** the quote applies the code to every car (`pricing.ts:530-535`).
  Car 1's save counts the code as used (`create-booking:669-675`). Car 2 is
  then refused with a 409 at `:289-303` (once per customer) or `:196-197`
  (`usage_limit = 1`).
- **Fix:** let rows in the same group share one use of the code, or apply it
  to one car in both the quote and the save.

### M4. "Closed until" (away mode) only hides days on screen; the server never refuses them. New.
- **Evidence:** `closed_until` is read only at `available-slots/index.ts:302-335`.
  `_shared/slotValidation.ts` never checks it, and neither does create-,
  reschedule- or update-booking. The value is already loaded at
  `tenant.ts:250`.
- **What it means:** a page opened before the detailer went away, or a direct
  post to the endpoint, books a day the detailer is closed.
- **Fix:** about 3 lines in `validateSlot`.

### M5. A promo code typed into the dashboard's New Booking form is always rejected. New.
- **Evidence:** `app/src/components/NewBookingModal.jsx:261` tests `r?.valid`.
  `validate-promo-code/index.ts:72-74` returns `{ success, promo }` and never
  sends `valid`. The form also does not upper-case the code, while codes are
  stored in capitals (`Promos.jsx:109`) and looked up exactly as typed
  (`pricing.ts:857`).
- **Fix:** test `r?.success`, and upper-case inside `resolvePromo` so every
  path into it is covered.

### M6. A customer can accept a revised quote they never saw. New.
- **Evidence:** `accept-quote/index.ts:74-106` guards on the `quoted_at` it
  reads itself. The page sends only `booking_id` (`app/src/lib/api.js:214`).
  `respond-to-booking` allows a re-quote while the booking is pending
  (`:98-102`).
- **Scenario:** the page shows $200. The detailer re-quotes $300. The customer
  presses Accept, and $300 is what gets accepted.
- **Fix:** the page sends the `quoted_at` (or amount) it showed, and the update
  requires it to match.

### M7. "Un-cancel" brings a booking back silently, then reminds the customer. Partly known (ROADMAP 4.1 records that there is no transition guard; these effects are new).
- **Evidence:** `update-booking/index.ts:176-178` (status guard only) and
  `:226-239` (only a cancellation or a move sends an email). The button is at
  `components/BookingDetail.jsx:1113`.
- **Scenarios:** a customer cancels, the detailer taps Un-cancel, and the
  customer's next email is "See you soon". Un-cancelling a *declined* request
  confirms it with `declined_at` still set and no email sent.
- **Fix:** treat cancelled→confirmed as news. Email the customer, clear
  `declined_at`, and send declined requests through `respond-to-booking`.

### M8. The Money screen drops data without saying so past 1,000 rows. New for these screens (the export already pages; ROADMAP around line 17289).
- **Evidence:** `hooks/useBookings.js:107-116` (10 years, oldest first, so the
  newest rows are the ones cut), `Money.jsx:278-279` (every invoice line, no
  limit), `Money.jsx:295-296` (every page visit).
- **What it means:** a detailer doing 3 jobs a day crosses 1,000 bookings in
  about a year. After that the long views under-count.
- **Fix:** read in pages, or total the figures in a database function.

### M9. The daily cap and the buffer can both be beaten by two bookings sent at once. New.
- **Evidence:** `slotValidation.ts:281-328` checks, and then
  `create-booking:489` inserts, with no lock between the two. The
  `bookings_no_overlap` constraint (`20260907000400_multiple_vehicles.sql:154-158`)
  catches only true overlaps. Nothing enforces `max_bookings_per_day` or
  `buffer_minutes`.
- **Fix:** take a lock per business per day around the check and the insert
  (`pg_advisory_xact_lock` inside an RPC), or re-check in a trigger.

### L1. A reschedule can land on a booking that was just cancelled. New.
`reschedule-booking/index.ts:106-115` guards the update on `start_at` only.
Add `.eq("status", booking.status)`.

### L2. Customer cancel and reschedule notices skip the detailer's notification list. New.
`cancel-booking/index.ts:144-152` and `reschedule-booking/index.ts:174-180`
send only to `brand.contactEmail`. Every other owner alert uses
`ownerRecipients()`.

### L3. Final rounding can make a promo discount negative. New.
`pricing.ts:714-716`. Proved: a $104 job with a $1-off code, rounded to the
nearest $5, gives `promo_discount = -1` and a $105 total, with no "rounded
up" line shown (`StepReview.jsx:80`, `emailTemplates.ts:607` hide a promo
that is not above $0).

### L4. "Today" is taken from the UTC date in three browser and server paths. New.
- `app/src/book/ManageBookingPage.jsx:268`: after 5 PM Pacific, the reschedule
  picker starts at tomorrow.
- `app/src/screens/more/Maintenance.jsx:100`: Mark done records tomorrow's date
  as `last_done_on` in the evening, which also moves the next due date. It also
  writes from the browser, against the "consequential writes go through edge
  functions" rule.
- `send-owner-reminders/index.ts:384`: the lower bound of the maintenance
  window is the UTC date.
- `core.js:1166` already has `businessToday(tz)` for this.

### L5. Open-ended drop-off-only periods are missed by the slot screen. New, latent.
`available-slots/index.ts:238` uses `.gte("end_date", …)`, which drops rows
where `end_date` is empty. `slotValidation.ts:217` treats an empty end as
"never ends". This is latent today, because `DaySheet.jsx:175-181` always
sets an end date.

### L6. Smaller notification gaps. New unless marked.
- `push_enabled` gates only 4 senders. It is ignored by the starting-soon,
  wrap-up, finalize and request nudges, the digest
  (`send-owner-reminders:277,292,307,335,534`), and by cancel, reschedule and
  update-booking.
- The manual "send reminder" (`send-owner-reminders:197-203`) allows cancelled
  and completed bookings, returns `success` when reminders are switched off,
  and sets no marker, so the sweep sends a second one.
- `accept-quote` has no `start_at > now()` check, so a quote can be accepted
  after the appointment has passed.
- `send-campaign` has no guard against a second press.
- A spam complaint does not opt the customer out (`resend-webhook/index.ts:149-167`).
  Known (ROADMAP 3.4e).

### L7. Smaller pricing gaps. New unless marked.
- A promo `usage_limit` is checked before it is counted (`pricing.ts:862`),
  so two bookings at once both pass. Declined and cancelled bookings also
  count against the limit. A percent code above 100 is allowed by the schema.
- The rush fee is re-checked at submit against the current clock
  (`pricing.ts:362`), so a customer who crosses the cut-off while typing is
  charged a fee the page never showed.
- Percentage discounts round to whole dollars. Known (ROADMAP around 10853).
- Moving a booking does not re-price it. Known (ROADMAP around 12117, item 2.1).

### L8. A second money formatter in the back office that rounds negatives the wrong way. New.
`app/src/admin/office/ui.jsx:5`, `usd`, used 17 times under `admin/office/`,
rounds to whole dollars with `Math.round` on the signed value. Proved:
`usd(150)` gives `$2` but `usd(-150)` gives `−$1`, and `usd(250)` gives `$3`
but `usd(-250)` gives `−$2`. It also uses a different minus sign from
`format.js` `money`, against the "one formatter each" convention.
**Fix:** round the absolute value, or use `money` from `lib/format.js`.

---

## Code health

### C1. Dead code.
- **`supabase/functions/_shared/stripePrices.ts` (265 lines): no edge function
  imports it.** Its only user is `scripts/check-stripe-prices.mjs`. Its header
  argues for Stripe lookup keys so a founding price cannot be re-priced by
  editing a constant. Live billing does the opposite: `_shared/platformBilling.ts:29-46`
  sends inline `price_data` from a `PRICES` constant. Either the design
  decision was reversed and this file is dead, or the reversal was never
  intended and the "locked for life" promise rests on nobody editing
  `PRICES`. **This needs Andrew's ruling, not just a deletion.** New.
- `app/src/lib/growthLines.js` has had no caller since `AdminPage.jsx` was
  deleted. Known (ROADMAP 99.10 §1).
- 11 test files and 5 scripts still name `AdminPage.jsx`. Known (99.10 §5).

### C2. Duplicated logic that has already drifted.
- The split-day branch of `computeQuote` (`pricing.ts:530-541`) is effectively
  a second pricing path, and the server prices those cars differently at save
  (H2, H3, M3).
- The back-office `usd` versus `format.js` `money` (L8).
- The server phone rule copy. Known (99.9).
- `Billing.jsx:63` has its own `usd`. It is correct but is a third formatter.

### C3. A test run dirties tracked files.
17 test files write into the tracked `receipts/` folder (381 tracked files,
16 MB), so `node --test` changes git state. A session that then commits with
explicit paths is fine; one that does not commits test noise. Suggested fix:
write local runs to an ignored folder, and commit a receipt only when it is
evidence for a ticked item.

### C4. Clutter in the repo root.
**It is all gitignored, so none of it reaches GitHub or Netlify. It costs
about 3.0 GB of local disk** (`du -sh --total`) and makes the root hard to
read:

- **51 `shots-*` folders:** about 450 MB. The largest are `shots-final`
  (43 MB), `shots-brief` (34 MB) and `shots-weather` (28 MB).
- **`artifacts/`:** 2.4 GB, of which `artifacts/sweep-widths` is 1.4 GB.
- **`.manager-shots/`:** 173 MB.
- **`.tmp-supervision-6.1b/`** (44 MB) and **`.tmp-99.3/`**.
- **6 `email-preview*` folders:** about 9 MB.
- **`detailingplatform-site.zip`:** 6.2 MB, dated 2026-09-14.
- **`lx.tmp.mjs`:** a one-off script that runs Playwright against three
  outside websites.
- **Tracked but stale:** `HANDOFF-2026-09-19.md` and
  `REVIEW-BRIEF-2026-09-14.md`.
- **`README.md`:**
  - Line 33 says "Eleven test suites live in `tests/`". There are 153.
  - Lines 13 and 23 call `docs/roadmap.md` the plan of record. `CLAUDE.md`
    says `ROADMAP.md` is the live queue and `docs/roadmap.md` is history.
- **`.gitignore`:** has redundant entries, for example `shots-admin/` at
  line 152 after `shots-*/` at line 116.

**Suggested cleanup, which is Andrew's call because it deletes local
evidence:**
- Delete the `shots-*`, `email-preview*`, `.tmp-*` folders, the zip and
  `lx.tmp.mjs`.
- Prune `artifacts/` to the newest run of each check.
- Point screenshot output at a single ignored `out/` folder, so the root stops
  growing.
- Move the two stale root briefs into `docs/` or delete them.
- Correct the two README lines.

---

## Checked and found sound

- **Cancel and reschedule cutoffs** use elapsed time, so the clock change does
  not affect them.
- **Notice and horizon** checks use business-local dates.
- **`weekdayOf`, `dateStrIn`, `timeStrIn`** are correct.
- **Closed days, hours overrides and blockouts** agree between the screen and
  the save.
- **The overlap constraint** treats touching times as a clash.
- **Reminder timing** uses the business time zone, and the evening-before rule
  is correct across clock changes.
- **Cancelled bookings** are excluded from every reminder query.
- **Double presses** are fenced on cancel, update, respond and accept-quote.
- **Refunds:** none are automatic, so a double refund cannot happen.
- **`resend-webhook`** checks the signature before acting.
- **Spanish strings:** all 253 literal email strings have a Spanish entry.
- **Single-day pricing:** quote and save run identical inputs.
- **Card amounts:** `amountDueCents` rounds to cents correctly.
- **Webhooks from other accounts:** one detailer's Stripe event cannot mark
  another's job paid.
- **Money reports:** `moneyAdvanced.js` and `periods.js` add up without double
  counting.
- **Formatting:** `money()` prints negatives as "-$189".

## Suggested roadmap items

None of these is on `ROADMAP.md` today.

1. Fix `localToDate` on clock-change days (two-pass offset) and add a DST case to a credential-free test (H1).
2. Different-day multi-car bookings: send `plan_id` with car 1 only, price each car at its own date and time, and share one promo use across the group (H2, H3, M3).
3. `create-booking` refuses when its total differs from the total the page showed, so no customer is charged an amount they were not shown (H3, L7).
4. Stripe webhook: mark paid only when the session status is `paid`, handle the async success and failure events, compare the amount, and expire stale sessions (H4).
5. Reminder sweep: claim each row before sending, and refuse overlapping runs (H5).
6. Owner reminders and nudges: keep a marker per recipient, and send the push separately from the email loop (H6).
7. Migration: reminders ignore `unsubscribed_at`, matching the unsubscribe page's own promise (M1).
8. Migration: the move trigger also clears `customer_reminder_2_sent_at` and `owner_request_nudge_sent_at` (M2).
9. `validateSlot` refuses dates before `closed_until` (M4).
10. Dashboard New Booking promo: read `success` and upper-case codes in `resolvePromo` (M5).
11. `accept-quote` requires the `quoted_at` the customer saw (M6).
12. Un-cancel emails the customer and cannot revive a declined request (M7).
13. Money screen reads in pages or totals on the server past 1,000 rows (M8).
14. Lock per business per day around the cap and buffer check in `create-booking` (M9).
15. Reschedule update also guards on status, and cancel and reschedule notices use `ownerRecipients()` (L1, L2).
16. Never fold rounding into a negative promo discount (L3).
17. Replace the three UTC "today" computations with `businessToday(tz)` (L4).
18. Make `push_enabled` gate every owner push (L6).
19. Office `usd`: round the absolute value, or reuse `format.js` `money` (L8).
20. Rule on `_shared/stripePrices.ts`: delete it, or wire it in and retire inline `price_data` (C1).
21. Fix the 4 new red credential-free suites: em-dash copy from `0914a145`, mail-sink declarations for `office-*.mjs`, skip-census and skip-evidence after tour removal.
22. Stop test runs rewriting tracked `receipts/` (C3).
23. Root cleanup: about 3.0 GB of ignored screenshots and artifacts, the zip, `lx.tmp.mjs`, two stale briefs, and the README test count and roadmap pointer (C4).
