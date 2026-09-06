# Moving Andrew's Auto Detail onto the platform — roadmap 5.1

Written 2026-09-06. **The import is built and tested; it has never been run,
and it cannot be run from this machine.** What is missing is one credential and
one decision, both the owner's, and both are named at the bottom.

---

## 1. What this is, in plain words

The old site keeps its bookings, customers, prices and expenses in its own
database. The new platform keeps the same things in a different shape, because
it has to hold many detailers rather than one. **This is the program that reads
the first and writes the second**, so eight months of real jobs come across
rather than starting again.

- `scripts/legacy-map.mjs` — the rules: which old field becomes which new one.
- `scripts/import-legacy.mjs` — the program that fetches, converts and inserts.
- `tests/legacy-import.test.mjs` — 47 checks over the rules, no database needed.

**It shows you the whole report before it writes anything.** Run it once and it
tells you how many rows it would copy, what it refused and why, and what has no
home at all. Only `--write` actually changes anything.

---

## 2. What is copied, and in what order

The order matters because later rows point at earlier ones.

| # | Old table | Becomes | Notes |
|---|---|---|---|
| 1 | `packages` | `services` | `category` becomes the group label, the tier joins the name |
| 2 | `add_ons` (real ones) | `add_ons` | the discount rows are refused — see § 4 |
| 3 | `promo_codes` | `promo_codes` | codes upper-cased, ids preserved |
| 4 | `customers` | `customers` | **id changes shape**: bigint → uuid |
| 5 | `bookings` | `bookings` | the clock — see § 3 |
| 6 | `booking_add_ons`, packages on a booking | `booking_add_ons`, `booking_services` | |
| 7 | `expenses`, `blockout_dates`, `dropoff_only_periods`, `booking_hours_overrides` | the same tables, per business | |

**IDS ARE KEPT WHERE BOTH SIDES USE UUIDS** — bookings, packages, add-ons,
promo codes. Two things fall out of that, and both are worth having:

- **The run is repeatable.** A second run updates the same rows instead of
  doubling the history, so a dry run, a fix and a real run cost nothing.
- **Every `/booking/:id` link the old site ever emailed still opens the right
  job here.** Customers have those links in their inbox.

`customers.id` was a whole number there and is a uuid here, so that one map is
built while the import runs — which is why customers go in before bookings.

---

## 3. The four things that could go wrong quietly

**The clock, and it is the big one.** The old table stores a DATE and a TIME
with no timezone at all, because that site served one business in one place.
This platform stores an exact moment. **Read the pair as if it were UTC and
every job in eight months of history moves seven or eight hours** — a five
o'clock job lands on the next day. So the conversion goes through the same code
the product itself books with (`_shared/tz.ts`) and uses the business's own
timezone. Six of the tests are about nothing else, including one that proves a
January booking is an hour further from UTC than a July one, because the
daylight-saving difference is exactly what a fixed offset would get wrong.

**A discount imported as an extra.** The old `add_ons` table did two jobs: real
extras somebody pays for, and DISCOUNTS. On this platform an add-on is only
ever something a customer chooses and is charged for, so **a $25 discount
imported as an add-on charges the next customer $25**. Those rows are refused
and listed by name.

**A total that stops adding up.** A booking's plan discount becomes a line in
`price_adjustments` — and it carries a `kind`, because this repo has already
shipped a negative line that printed as a positive charge. The promo is
deliberately NOT copied there: it has its own two columns and every receipt
itemises it from them, so a second copy would discount twice.

**A word this platform has never had.** Both databases restrict status,
payment status, service type and vehicle size to a list, and the lists were
written eight months apart. They happen to agree — but a value outside them
would stop the entire run on one row from last winter, so anything unfamiliar
falls back to the safe value instead.

---

## 4. What does NOT come across, and why

Each of these is a decision, not a gap in the program. The import prints the
whole list every time it runs.

| What | Why |
|---|---|
| `customers.referral_code`, `loyalty_reward_eligible` | Roadmap 4.2 item P is open: **what a referral EARNS is a business decision nobody has made.** They are dropped rather than written into the notes field, where they would look supported. |
| `referrals` (the table) | Never used; empty on the live database, and it points at the two columns above. |
| Add-ons that are really discounts | See § 3. Listed by name so they can be re-created as promo codes if they are still wanted. |
| `monthly_plans` | **The old plan is a discount with no price; this platform's plan needs a cadence and what the member pays.** They are not the same object — roadmap 4.3 closed into 2.14 for exactly this reason. Anyone on an old plan needs to be put on a new one by hand. |
| `bookings.line_items` | Free-form; a money line here needs a label, an amount AND a kind, and a line the receipt cannot draw is a total that stops adding up. |
| `ics_file_sent`, `total_duration_minutes` | One is a send flag this platform does not keep; the other is the gap between start and end. |
| `admin_users` | A login needs an account, and an account is created by accepting an invite. The back office's *resend the owner's invite* is that path. |

---

## 5. How to run it

```bash
# 1. Make the business on the platform first: /admin → Add a detailer.
#    Its TIMEZONE must be right before the import — every booking depends on it.

# 2. Read the report. This writes nothing.
LEGACY_SUPABASE_URL=https://<old-project>.supabase.co \
LEGACY_SERVICE_KEY=<old project service-role key> \
node scripts/import-legacy.mjs --business=andrews-auto-detail

# 3. Only when the report reads right:
LEGACY_SUPABASE_URL=... LEGACY_SERVICE_KEY=... \
node scripts/import-legacy.mjs --business=andrews-auto-detail --write
```

It refuses to write into a business that already has bookings, because two
histories in one place cannot be told apart afterwards.

**Afterwards, check three numbers rather than trusting the run:** the total on
Money · Lifetime against the old site's, the number of customers, and one
booking you remember — open it and check the DATE AND TIME, which is the thing
a wrong timezone breaks.

---

## 6. What is needed from the owner

1. **The old project's service-role key.** The access token in this repo's
   `.env` answers **403** for project `adtlnvihwrcqcasqcjwd`, so nothing here
   can read the old database. It is on that project's API settings page. It is
   a full-access key — it goes into the shell for one command and never into a
   file, a commit or a chat.
2. **A decision about the old monthly plans**, if anybody is on one: they do
   not convert (§ 4) and would be set up by hand on the new plans screen.
3. **The go-ahead itself.** Roadmap 5.2 is the owner running his own business
   on the platform in parallel while real bookings stay on the old site; the
   import is what makes that possible, and when it happens is his call.

**Nothing in this plan writes to the old project.** It is read-only there, and
the only writes are into the platform.
