# THE CUSTOMER APPOINTMENT REMINDER — what it sends, when, and why it had never sent

**Lane C, 2026-09-13.** Andrew's item: *"Build the CUSTOMER appointment
reminder. There is `send-owner-reminders`, which reminds the detailer, and
across 125 delivered messages spanning three days there is no message reminding
a CUSTOMER of their appointment at all. A no-show costs the detailer a whole
slot, so this is money."*

---

## THE ANSWER TO "BUILD IT" IS THAT IT WAS ALREADY BUILT AND HAD NEVER RUN

**Every part of it existed and read correctly** — `customerReminderEmail` in
`_shared/emailTemplates.ts`, rendered in the customer's own language, on the
detailer's own brand, with a second optional reminder, four settings and a
marker each. The sweep looped over the due rows and called it.

**And it had produced nothing.** Measured in the database the same morning:

| | |
|---|---|
| bookings the product has ever had | **56** |
| with `customer_reminder_sent_at` set | **0** |
| with `customer_reminder_2_sent_at` set | **0** |

**So his 125-message sample was not a sample that happened to miss one.** There
was nothing to find.

**THAT IS THE TRANSFERABLE PART OF THIS ITEM.** A feature can be complete in
every file and produce nothing, and no amount of reading the files says so. The
question that found it was *"how many has it actually sent"*, asked of the
database rather than of the code.

---

## WHY IT NEVER FIRED — THREE FAULTS ON ONE LINE

`send-owner-reminders` did this, once per due booking:

```js
await sendCustomerReminder(b);
await mark(b.id, "customer_reminder_sent_at");
```

### 1 · `sendTenantEmail` DOES NOT THROW. IT RETURNS `false`, AND EVERY CALLER IGNORED IT

Its own header says *"best-effort by design: an email failure must never fail a
booking"*, which is **correct on the booking path and exactly wrong in a
reminder sweep**. A refused send, a 429 from the daily cap, a relay 500 — every
one of them fell through to `mark()`. The booking was stamped *reminded*, and
the due-ness query only ever returns rows whose marker is null, so **the
customer was never reminded and never could be.**

**AND IT WAS INVISIBLE IN EVERY INSTRUMENT.** `results` recorded `sent: true`,
the heartbeat summary counted it as sent, and the Plumbing tab drew it as sent.
The reporting machinery for a failed reminder already existed and was simply
never reached. **A skipped check reads exactly like a passing one — again.**

**THE SAME FALSE SENTENCE WAS WRITTEN IN THE MAINTENANCE BLOCK OF THE SAME
FILE**: *"STAMPED AFTER THE SEND AND ONLY ON SUCCESS — `sendTenantEmail` throws
on a hard failure."* It has never thrown. **A ceramic-coating warranty deadline
was advanced on a send that failed**, which is the $1,500 the maintenance
feature exists to protect.

### 2 · A BUSINESS WITH REMINDERS SWITCHED OFF WAS STAMPED TOO

The RPC never asked `email_customer_reminder`. The edge function asked it,
returned early, **and the marker went on anyway.** So every booking of every
business with the switch off is permanently marked *reminded*, and the day that
detailer switches reminders on, **none of their existing bookings can ever
produce one.**

### 3 · AN UNREACHABLE CUSTOMER WAS ASKED ABOUT FOREVER

The three ways to be unreachable — no address, opted out, already bounced — are
asked by the Clients count, by `send-campaign`, and by the maintenance reminder
**in this same sweep**, and were not asked here. Without them a bad address is
retried every fifteen minutes until the appointment: **about forty-eight sends
of a hundred-a-day allowance for one broken booking.**

---

## WHAT CHANGED

**THE FIX IS IN THE DUE-NESS QUERY, NOT IN THE CALLER.** A condition the caller
checks after the answer comes back **cannot stop the caller writing the
marker**; a condition in the `where` clause is one the caller cannot forget.

| | |
|---|---|
| `supabase/migrations/20260913020000_…` | the switch and the three unreachable tests move into `get_bookings_due_for_reminder`, and the second reminder's RPC gains the PARENT switch it had never asked for |
| `send-owner-reminders/index.ts` | `mustSend()` — a refused relay now throws, so the existing `catch` records `sent: false`, **leaves the marker alone**, and puts `customer_reminder_failed` in the heartbeat summary |
| `tests/customer-reminder.test.mjs` | 33 checks, baselined by five deliberate breaks |

**`mustSend` IS DELIBERATELY NOT A CHANGE TO `sendTenantEmail`.** That function
is called from about thirty places where a booking must survive a dead relay.
The sweep is the one caller for which a silent failure is the defect.

---

## THE TIMING — ANDREW DECIDED IT, 2026-09-13, AND THE THRESHOLD MOVED TO NOON

**The evening-before threshold was 10:00 and it is 12:00 now.** Migration
`20260913050000_the_evening_before_threshold_moves_to_noon.sql` moves the column
default and moves every row still sitting on the old default; the TypeScript
fallback in `_shared/tenant.ts` moved with it, because a business with no
settings row must not answer a different question from one that has one.

His reason, and it is the one the old text below had already written down:
**a customer has to move the car and find an outdoor tap, and an email two hours
out is too late to act on.** A 10:30 job was reminded at 08:30 that morning,
after most people have left the house.

### WHAT IT IS

| | |
|---|---|
| **A job starting at or before 12:00 local** | reminded **at 19:00 the evening before** |
| **Every other job** | reminded **2 hours before it starts** |
| **A second reminder** | off by default; 2 hours out when switched on |

All four numbers are per-business settings (`evening_before_latest_start`,
`evening_before_send_time`, `customer_reminder_lead_minutes`,
`customer_reminder_2_lead_minutes`).

### WHY

**THE EVENING-BEFORE RULE EXISTS BECAUSE A REMINDER HAS A JOB TO DO BESIDES
REMINDING.** For detailing, the customer has to move the car, clear the
driveway, and find an outdoor tap. **A two-hour warning about an 8am mobile job
arrives at 6am**, which is both useless as a nudge and too late to act on. 19:00
the night before is when somebody is at home and can go and move the car.

**TWO HOURS IS RIGHT FOR EVERYTHING ELSE** because it is late enough to be about
today and early enough to cancel politely rather than no-show. A whole day's
notice on an afternoon job is a second confirmation email, not a reminder.

**TWO REMINDERS MAXIMUM, THE SECOND OFF BY DEFAULT.** Recorded in
`DECISIONS.md` and not reopened here: Jobber caps at two, nobody in the
six-product sweep offers three, **and a third costs deliverability for every
OTHER email** — sender reputation is shared, and the receipt landing in junk is
worse than a missed appointment.

### WHAT MOVING IT COSTS, AND WHAT IT DOES NOT

**An afternoon job is unaffected.** Only jobs starting between 10:00 and 12:00
change branch, and what they gain is a reminder at 19:00 the night before
instead of one 2 hours out that morning.

**NOTHING IN THE APP EXPOSES THIS FIELD.** `BookingRules.jsx` offers the on/off
switch and no threshold, so every 10:00 in the table was the shipped default
rather than a detailer's choice — which is why the migration is allowed to move
existing rows. A row set to any other time is left alone. If the field ever
gains a control, that update clause must not be copied forward.

---

## HOW IT IS PROVED, AND WHAT IS STILL NOT PROVED

`tests/customer-reminder.test.mjs` § 4 **calls the real deployed sweep** and
reads what it did: 200, `customer_reminder_sent: 1`, and the booking comes back
stamped. The fixture is in Spanish, so the language path runs too.

**IT COSTS NO EMAIL ALLOWANCE AND THAT IS NOT A COMPROMISE.** The fixture
address is on `example.com`, which `send-email` refuses before it reaches the
provider. Everything up to that point is the real thing — the query, the brand
build, the template render, the relay call, the return value being read, the
marker being written.

**WHAT IS NOT PROVED HERE IS RESEND ACCEPTING THE MESSAGE.**
`scripts/e2e-booking.mjs` is the instrument for that, and **it could not be run
today**: the day's allowance was already at 94 of 100 by 06:55 UTC. See
`docs/email-budget.md`.

**THE BASELINE, because a green run from an unchecked instrument is worth less
than no run:**

| break | what went red |
|---|---|
| the business switch removed from the RPC | 1b |
| the customer join removed from the RPC | 1c (two) |
| one `mustSend` unwrapped in the sweep | 2b |
| the false maintenance comment put back | 2e |
| `mustSend` made to throw always, and **deployed** | 4b, 4c, 4d |

**The last one is the useful one twice over**: it proved the check can see a
failure, and it proved the FIX — a refused send left the booking unstamped and
reported `customer_reminder_failed` instead of lying.

---

## WHAT IS STILL OPEN

- **Every booking already stamped by a failed or skipped send stays stamped.**
  Nothing here backfills them, deliberately: there are 0 such rows today (the
  marker has never been written at all), so a backfill would be a migration
  that does nothing and a risk with no reward. **If a business turns reminders
  on later and finds old bookings silent, this is why.**
- **The OWNER branch still has no switch test in its RPC**, because
  `email_owner_reminder` off does not mean the owner wants nothing — that path
  also sends a push, which has a switch of its own. Its marker is no longer
  stamped on a failed send.
