# Dashboard spec — gap report

Status against `docs/dashboard-spec.md`, updated after the ICS / Money /
notifications / templates round.

## Now closed (was a gap, now built)

- **Add to calendar** — one `.ics` implementation (`_shared/ics.ts` served by
  the `booking-ics` function) for both the owner's button and the customer's
  copy, stamped `DTSTART;TZID=` with the business's own zone.
- **Money: change vs last month** on all four numbers, green up / red down
  (with "money out" inverted, since spending less is the good direction).
- **Money: the 6-month bar chart.** Bars only, one series, brand accent.
- **Money: average job value**, given its own card.
- **Three-tap expense entry** with the spec's five fixed categories
  (product, gas, equipment, supplies, other). Amount → category chip → Save;
  note and date sit behind a disclosure.
- **Notifications settings page** — which emails send, reminder timings,
  push on/off, and multiple owner-alert recipients.
- **Message templates page** — editable prefilled texts with placeholders,
  seeded on first open. Staff can send them; only owners can edit.

## Still open

Ranked by whether I think they should be built.

### Worth building

1. **Greeting with their name** (Today). Needs a `first_name` on
   `business_users`; small, and it's the first thing on the first screen.
2. **Next job highlighted** (Today). Currently a plain time-ordered list.
   Cheap, and it is the screen's stated job ("what am I doing now" in under
   two seconds).
3. **Clients: last visit.** Visit count and total spend are shown; the date
   of the last visit is not. One line of work.
4. **Unpaid jobs tappable-to-mark-paid.** They are listed and tappable to
   open the job, but marking paid still goes through Finalize. A one-tap
   "mark paid" on the Money list is what the spec asks for.

### I'd leave open for now

5. **Add to contacts** (job detail). The old app attached a vCard to owner
   emails. On a phone, the call/text buttons already give the OS an easy
   path to save the number, so this is low value until someone asks.
6. **Business info: description and website fields.** Nothing consumes them
   yet — the public booking site does not exist. Build them with the site.
7. **Owner photo and owner bio as separate fields.** `about_copy` covers the
   bio today; a distinct owner photo only matters once there's a public page
   to show it on.
8. **Website-only tabs and the package flag** — explicitly deferred by you;
   no website customers exist.
9. **Section order (drag to reorder)** — the spec itself says not in the
   first version.

## Divergences — built differently on purpose

- **Branding colors: both presets and a custom picker.** The spec says
  presets "not a free color picker"; you decided to keep both because the
  contrast correction removes the risk the line was guarding against.
- **"All Bookings" is folded into Calendar** as a List mode with status
  filters rather than a separate screen.
- **Appearance & theme** and **Team & access** are More sections the spec
  doesn't mention, added on later instruction.
- **Services are always deactivated, never deleted**, even when no booking
  references them. The spec allows deletion in that case; never deleting is
  simpler and matches the never-hard-delete rule.
- **Money's ranges are 7/30/90/365-day selectable** in addition to the
  month-over-month "this month" block at the top.
- **Expense `payment_method` is recorded as "unspecified".** The column
  exists from the old schema; the spec's three-tap flow doesn't ask for it,
  so the flow doesn't.
