# When an email does not arrive — how a detailer finds out, and what they do instead

ROADMAP **3.4e**, written 2026-10-10 against commit `3a41b555`. This is the
DESIGN: the states, where each one is shown, and the fallback for each. Building
the parts marked **NEW** is ROADMAP 3.4f, and it waits on the three decisions at
the bottom.

Andrew, 2026-10-09 (3.4): *"there should be some way of … the detailer knowing
that the email failed to send that way they could message out through text or
whatever."*

**Held against the product by `node scripts/email-failure-design.mjs`**
(credential-free, no network). It reads the code that WRITES each failure and
reddens when a state exists in the product that this page does not name, or
when a sentence this page quotes is no longer what the screen says. Read its
header for what it cannot see.

---

## 1. Where failure comes from

Every email the product sends goes through one relay,
`supabase/functions/send-email/index.ts`, and every attempt leaves one row in
the `email_sends` table. The row's `status` is one of seven words, fixed by the
table's own check (`supabase/migrations/20260916010000_every_email_leaves_a_row.sql`).
Two later writers change or add rows:

- `supabase/functions/resend-webhook/index.ts` — Resend tells us later what
  happened to a message it accepted (`email.delivered`, `email.bounced`,
  `email.complained`, `email.failed`), and the row's status is updated.
- `supabase/functions/send-owner-reminders/index.ts` — writes a `skipped` row
  itself when a maintenance reminder cannot legally go out.

A second fact lives on the customer, not the email: `customers.email_failed_at`
(with `email_failed_reason`). It means *"this address is bad"* and it is what
stops later mail being wasted on it. It is set in two places only — the relay,
when the provider rejects the address outright, and the webhook, when a message
bounces — and it is **cleared by the next send to that address that the
provider accepts**.

## 2. The failure states

Each state has a number so it can be cited. *Whose side* is the question a
detailer actually needs answered: is something wrong with the customer's
address, or with us?

| # | Stored as | Written by | What happened | Whose side | Flags the address? |
|---|---|---|---|---|---|
| **F1** | `bounced` | `resend-webhook`, on `email.bounced` or `email.failed` | Resend accepted it, then the receiving server sent it back | The address | Yes, if the address belongs to a customer |
| **F2** | `failed` | `send-email`, provider answered 4xx (not 408, not 429) | Resend refused the address before sending | The address | Yes, if a customer, and not for platform mail |
| **F3** | `failed` | `send-email`, provider answered 5xx, 408 or 429, or the call threw | Resend was down, slow, or rate-limiting us | Ours | No |
| **F4** | `complained` | `resend-webhook`, on `email.complained` | It arrived and the customer pressed "spam" | Neither — the customer does not want email | No |
| **F5** | `refused` | `send-email`, `claim_email_send` said no; the reply carries `reason: "daily_cap"` | Our shared daily allowance was spent, so it never reached Resend. Row detail: *the day's email allowance was already spent* | Ours | No |
| **F6** | `skipped` | `send-email`, reserved domain; the reply carries `skipped: "undeliverable_domain"` | The address ends in `.test`, `.invalid`, `example.com` and the like. Row detail: *that address cannot receive email* | The address (a typo or a made-up address) | No |
| **F7** | `skipped` | `send-email`, no provider key; the reply carries `skipped: "no_provider_key"` | Email is switched off for the whole deployment. Row detail: *email is not switched on for this deployment* | Ours (the platform's setup) | No |
| **F8** | `skipped` | `send-owner-reminders`, maintenance reminder | The business has no mailing address, which the law requires at the foot of that email. Row detail: *Not sent: the business has no mailing address, and the law requires one at the bottom of this email.* | The detailer's settings | No |
| **F9** | *no row at all* | `_shared/maintenance.ts` and `send-campaign` decide not to try | The address is already flagged (or the customer unsubscribed), so the email is never attempted | Already known | Already flagged |

Two things that look like failures and are not, recorded so nobody builds an
alarm for them:

- **`sent`, forever.** Resend took the message and no later word came. The
  webhook deliberately ignores `email.delivery_delayed`, because a "delayed"
  warning for mail that lands ninety seconds later teaches a detailer to ignore
  the screen. The list shows *On its way*. **No signal, by design.**
- **No email address on the job.** Nothing is attempted and nothing failed. The
  job record already says so beside the receipt button. Out of scope here.

**Who the failed email was going TO changes everything below**, so each state
above can happen to three kinds of recipient:

- **a customer** — confirmations, reminders, reschedules, cancellations,
  receipts, quotes, maintenance reminders, marketing. This is the case Andrew
  asked about and the rest of this page is mostly about it.
- **the detailer themselves** — new-booking and request alerts, the morning
  summary. The row is filed with no customer (`markAddress` matches none), so
  the address is never flagged. **Nothing tells the detailer their own alerts
  are bouncing**, and the channel that would tell them is the one that is
  broken. Called **F-own** below.
- **the detailer, from the platform** — billing mail. That is ours to chase,
  not theirs. Andrew sees it on the back office's email list
  (`app/src/admin/AdminPage.jsx`). Out of scope for the detailer.

## 3. The signal: what the detailer sees, and where

### What exists today (proved, not just read — see § 6)

| Where | What it shows | States |
|---|---|---|
| **Client record** (`app/src/screens/Clients.jsx`), under the contact buttons | *"This address bounced. The last email to it was refused, so check it with them or call instead."* in red | F1, F2 (anything that flags the address) |
| **Client record**, "Emails" list (`app/src/components/EmailTrail.jsx`) | Every email to that person, each with its outcome word, red for a bad one, and the provider's own reason beside it | All rows |
| **Job record** (`app/src/components/BookingDetail.jsx`), inside the receipt section | "Emails to this address" — the same list, for the address on this job | All rows |
| **Emails we sent** (`app/src/screens/more/MailLog.jsx`), from the gear menu | The whole business's mail, grouped Today / This month / All time, with a Problems filter | All rows, including F-own |

The words each stored state is drawn as, from `EmailTrail.jsx`'s `MAIL_STATE`:

| Stored | Drawn as |
|---|---|
| `delivered` | Delivered |
| `sent` | On its way |
| `bounced` | Bounced |
| `complained` | Marked as spam |
| `failed` | Refused |
| `refused` | Not sent — our daily limit |
| `skipped` | Not sent |

**The gap, in one sentence: every signal today is somewhere the detailer has to
go and look.** Nothing comes to them. A detailer opens the client record when
they already have a reason to; a bounced confirmation for tomorrow's 8 AM job
gives them no reason. That is what Andrew asked for and what is missing.

### What to add (NEW — built in 3.4f)

**S1 — On the job record's pinned bar.** The pinned bar is the part of a job
that never scrolls away and is where the Call and Text buttons already are.
It already carries one red line of the same kind — the "Refund … from your own
Stripe" line. Add one more, under the same rule:

> *The confirmation email to dana@example.com bounced. Text or call them instead.*

- Drawn when **the most recent email to the job's address about this booking**
  (matched on `booking_id`) is F1, F2, F3, F4, F5 or F6. Not F7 (a platform
  setup problem the detailer cannot fix — that one is Andrew's to see on the
  back office) and not F8 (that is about maintenance, not a booking).
- **Names the email by kind** ("confirmation", "reminder", "receipt", "change of
  time", "cancellation", "quote") rather than by subject line, and names **what
  to do**, not just what happened — the bounced-address line already follows
  this rule.
- **The wording differs on whose side it is**, because a detailer told
  "bounced" about a perfectly good address will go and check it for nothing:
  - address side (F1, F2, F6): *"… bounced. Check the address with them, and
    text or call them instead."*
  - our side (F3, F5): *"… did not go out — our side, not their address. Text
    them if it matters before the job."*
  - spam (F4): *"… was marked as spam by them. Text them instead, and don't
    email them again."*
- **It clears itself** when a later email about this booking to the same
  address is accepted, and **it stops being drawn once the job's day has
  passed** — so there is no "dismiss" button and nothing new to store. A
  warning about a job that is over is clutter.

**S2 — On Today, a short list above the day's jobs.** Today is the one screen a
detailer opens between jobs. Add a section, drawn only when it has rows:

> **Emails that did not arrive · 2**

One row per **upcoming or today's** job whose S1 line would be drawn, oldest job
first, each opening that job. Same clearing rule as S1, so the list empties on
its own. **This is the "comes to them" half and it is the decision in § 5.**

**S3 — For the detailer's own alerts (F-own).** When an alert to one of the
business's own notification addresses comes back F1, F2 or F6, draw a yellow
warning on Today and on the Notifications screen:

> *Booking alerts to you@yourbusiness.com are bouncing. Fix the address in Notifications.*

The detailer does not lose bookings in the meantime — new requests already show
on Today whatever happens to email — but they would stop being told on their
phone, and they would not know.

**Built 2026-10-10 (3.4f), two places it differs from the above, on purpose.**
It reads the newest row to each address the server actually alerts — the
"Also send to" list, or the main address when that list is empty
(`ownerRecipients`, which `tests/own-alert-warning.test.mjs` runs against the
browser's copy). It warns on F1 and F6 but **not `failed`**: the stored row
cannot tell F2 from F3 (the same reason S1 gives `failed` a neutral sentence),
and here a guess would draw "your address is broken" over a good one for as
long as the business stays quiet; the usual F2, a malformed address, cannot be
added on Notifications. The wording is *"Booking alerts to … are not
arriving"*, which is true of a bounce and of a made-up address alike. Proved by
`node scripts/own-alert-warning.mjs`. **The demo tenant is in this state for
real** — its address is `demo@example.com`, so every alert to it is F6.

**S4 — The existing client-record line (F1, F2) gains a spam wording for F4.**
Today a spam complaint flags nothing and the client record says nothing. The
line should read *"They marked an email from you as spam. Text them instead."*
That needs the complaint to be readable from the customer — **decision 2**.

## 4. The fallback: what the detailer does, per state

**Texting is the detailer's own phone today.** The product's own texting
(Telnyx) is not switched on — Andrew, 2026-10-09 (3.3): it is coming and he
wants to be reminded. Until then the Call and Text buttons hand off to the
phone: Call opens the dialler, and on the job record Text opens the template
picker, which fills in a message and opens the phone's own Messages app. So the
fallback is always *"tap Text on the job"*, and the work is making sure there is
a sensible message to send.

The built-in texts today (`app/src/lib/templates.js`) are *On my way*, *Running late*
, *Confirm tomorrow*, *Job finished*, *Ask about access* and, since 3.4f
(2026-10-10), *Booking confirmed* (date, time, address, and the booking link),
because the confirmation is the single most important email to replace when it
fails and none of the first five said it. Everything else maps to a template
that exists or to *Write my own*.

| State | What the detailer does | What the product does |
|---|---|---|
| **F1** bounced | Tap **Text** on the job and send the matching message (confirmation → *Booking confirmed*, reminder → *Confirm tomorrow*, anything else → *Write my own*). Ask them for the right address in the same text, then fix it with **Edit** on the job or client. | Flags the address, so marketing and maintenance mail stop being wasted on it (F9). The flag clears by itself on the next accepted send. |
| **F2** rejected | Same as F1. | Same as F1. |
| **F3** our side | If the job is within a day, tap **Text**. Otherwise nothing — a receipt can be sent again with **Email it again**. | Reminders are tried again on the next 15-minute sweep, because `send-owner-reminders` only marks a reminder sent when the relay accepted it. Other emails are not retried. |
| **F4** spam | Tap **Text** if they need to know. **Do not email them again** — not even a receipt by hand. | NEW (decision 2): treat it as an unsubscribe for marketing and maintenance mail. Today `send-campaign` and the maintenance sweep skip only bounced and unsubscribed customers, so a customer who reported spam is still on the marketing list. |
| **F5** our daily limit | Same as F3. | Reminders retried, same as F3. The platform's own mail (billing, signup alerts) has a reserved share of the day, so it still goes. |
| **F6** made-up address | Tap **Text**, and ask for a real address. (The seeded demo customers use addresses like these on purpose, so the demo tenant will show this state.) | Nothing is sent and nothing is spent. |
| **F7** email switched off | Nothing; it is not theirs to fix. | Andrew sees it on the back office. It should never happen on the live site. |
| **F8** no mailing address | Add a mailing address in the business settings. If the reminder matters, text the customer. | The reminder for that stage is lost, and the row says why. |
| **F9** never tried | Already covered by the F1/F2 line on the client record. | Nothing new. |
| **F-own** | Fix the notification address. Until then, Today still shows every new request. | S3 above. |

## 5. Three decisions for Andrew before 3.4f builds this

1. **Should Today show "Emails that did not arrive" (S2)?** Yes means the
   detailer is told without going to look; no means the job record's line (S1)
   is the only new signal and they see it only when they open the job.
   **Recommendation: yes.** It is exactly what was asked for, it empties itself,
   and it only ever lists upcoming jobs. *This reverses a call 3.1 made* — the
   gear menu's "Emails we sent" row deliberately carries no problem count, on
   the reasoning that the bad rows should be findable rather than a second
   alarm. That was a session's reading of 3.1, not a ruling of Andrew's, and it
   was about the gear menu; this proposal leaves that row alone.
2. **Should a spam report stop marketing and maintenance email to that
   customer?** Yes means a customer who pressed "spam" gets no more promotional
   mail from that detailer; booking emails still go. No means they keep
   getting it, and every further one risks the shared sending domain.
   **Recommendation: yes.** It protects every detailer on the platform.
3. **When the product's own texting arrives, should it text automatically when
   a booking email fails?** Yes means the confirmation, reminder, change of time
   and cancellation would be sent as a text by themselves when the email does
   not land; never marketing. No means the detailer always taps Text.
   **Recommendation: yes, but only when texting is built**, and parked with the
   texting reminder rather than decided now. It costs per message, so it is
   Andrew's call on the day.

## 6. How this page was checked

- **Against the code**: `node scripts/email-failure-design.mjs` reads the
  status list in the migration, in `_shared/emailList.js` and in
  `EmailTrail.jsx`; every place the relay records a send; every event the
  webhook handles; every function that inserts its own row; every file that
  reads the address flag to decide not to send; and every on-screen sentence
  this page quotes. It fails if any of them is missing here.
- **On screen, today's signals**: `node scripts/mail-log.mjs` (read-only; signs
  in as the demo owner) draws the real "Emails we sent" list and a fixture row
  for each stored state, at five widths. Its receipt is
  `receipts/mail-log.json`. 2026-10-10 at `1a69a71f`: 103 of 103 assertions,
  three canaries caught.
- **On screen, the client record's red line**: `node scripts/bounced-line.mjs`
  (read-only; the flag is put on the browser's copy of the customer list, never
  on the table) opens one flagged and one clean customer at 1440, 392 and 320.
  2026-10-10 at `1a69a71f`: 16 of 16 — shown, painted in `--bad`, inside the
  width, absent on the clean record, console clean at every width.
  `--break=noflag` and `--break=always` each turn their own assertions red.
- **S1, S3 and the *Booking confirmed* text are built and proved** (3.4f;
  `node scripts/job-mail-warning.mjs`, `node scripts/own-alert-warning.mjs`).
  S2 and S4 were declined by Andrew on 2026-10-10.
- **Not checked, because nothing of it exists yet**: (superseded by the line above) S1–S4 and the *Booking
  confirmed* text. Those are 3.4f's to build and prove.
