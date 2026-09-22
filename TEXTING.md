# Texting — the shape, before any of it is built

---

## PARKED — 2026-09-22. DESIGNED AND DELIBERATELY NOT BUILT.

**This is a deliberate pause, not unfinished work.** The design below is
finished and is meant to survive the pause. **Andrew wants to decide what the
messages actually say — the wording and the content — before any of it is
written**, and that is the right order: the hard part of texting a stranger is
what the text says, not the code that carries it.

**Do not build the consent checkbox, the privacy paragraph, `send-sms`, or the
inbound webhook** until he has settled the message content and unparked this.

**Where the 10DLC registration actually stands.** The brand *"Andrew's Auto
Detail & Car Wash"* — brand id `4b2001a0-c7e7-ede3-76fa-a67ec4841df8`, TCR ID
`BMKZFBT` — is **VERIFIED**. The campaign form is **filled in but NOT submitted
and NOT paid**; the $15 vetting fee is non-refundable, which is why it is being
held rather than tried.

**Two things block submission. Both are free, both are ours, neither is
started:**

1. **The consent checkbox on our booking page** — `app/src/book/steps/`, the
   step that collects the phone number. Filed wording, which is not ours to
   improve because a reviewer compares the live page against the filing:
   *"Text me about my appointment. Message frequency varies. Message and data
   rates may apply. Reply STOP to opt out, HELP for help."* **Unchecked by
   default, non-negotiable** — a pre-ticked box is not consent, and the filing
   states that the booking completes without it and that agreeing is not a
   condition of purchase. Privacy and terms links sit beside it.
2. **A text-messaging paragraph on the privacy page** —
   `app/src/landing/legal.js`, the `PRIVACY` sections. The carriers look for
   language to the effect that **mobile information is not sold or shared with
   third parties for promotional or marketing purposes**. That page says
   nothing about texting at all today. It is well written, so the paragraph has
   to match its voice rather than arrive as legal boilerplate.

**ONE THING WAS DONE BEFORE THE PAUSE AND IT IS LIVE IN THE DATABASE.**
Migration `20260922010000_consent_is_not_a_default.sql` **has been applied to
`kguqylyzgyzfktkfnhjb`**: three nullable columns on `customers`
(`sms_consent_at`, `sms_consent_source`, `sms_stopped_at`) and one partial
index. **Nothing reads them and nothing writes them.** No existing column was
touched and no row was rewritten. It is recorded here rather than left as a
schema change with no file behind it, which is the worse of the two. Dropping
it is three `alter table … drop column` lines if that is preferred.

---

## THE HARD BOUNDARY: `andrewsdetail.com` IS NOT OURS

**It is Andrew's own detailing business — a separate website, on a separate
host, with its own booking form built into the page. This repo does not serve
it, cannot deploy to it, and has no business touching it.**

**Measured, 2026-09-22, not assumed:** it serves `static/array.js`, while this
product's bundle is `assets/index-*.js`. `docs/CHECKPOINT.md` says the same
thing in its own words — *"the OWNER'S LIVE BUSINESS, site `andrewsauto`.
Nothing in this repo deploys there. Do not touch it."* Its database is the one
`CLAUDE.md` names as never-write.

**Our product is `detailingplatform.com`.** Every customer-facing page this
repo serves is on that domain: `siteFor()` returns the platform origin for
every tenant, because no tenant has verified a custom domain.

**So nothing in this repo may ever assume we can change `andrewsdetail.com`,
and nobody should propose adding a checkbox, a page, a script or a tag to it.**
When texting needs a booking page with a consent box on it, that page is **ours
and on our domain**, and the campaign filing should name that URL rather than
his own site — because the URL on the filing is the page a carrier reviewer
opens to look for the checkbox.

**A related fact worth having before anyone writes that URL down: Andrew's real
business is not a tenant on this platform yet.** Every row in `businesses` today
is a demo or a test fixture; the slug is chosen by the person signing up, so
the URL cannot be quoted until he signs the business up and picks one. It will
have the shape `https://detailingplatform.com/book/<slug>`.

**This is in the record because it was got wrong once, on the night of
2026-09-22, and corrected before it became a fact in the repo.**

---


**Status: design only. Nothing in this document is built, nothing is deployed,
and nothing can send** — no phone number has been bought, no 10DLC campaign
exists, and `TELNYX_API_KEY` is an empty named box in the edge-function secrets
on `kguqylyzgyzfktkfnhjb`. That is the good version of this moment: the shape
gets decided against the email path rather than against a deadline.

**What is already true, 2026-09-22.** The Telnyx account is paid. The 10DLC
brand **"Andrew's Auto Detail & Car Wash"** is submitted — brand id
`4b2001a0-c7e7-ede3-76fa-a67ec4841df8`, TCR ID `BMKZFBT` — and is pending phone
verification. A messaging profile called **DetailingPlatform** exists and is
switched on, with no numbers attached and no webhook set.

---

## 0 · What the product does today, measured rather than assumed

**This product already texts, and it costs nothing, because the detailer's own
phone sends it.** Five surfaces hand off to the phone's messaging app with an
`sms:` deep link — `BookingCard.jsx:121`, `BookingDetail.jsx:254` and `:873`,
`Clients.jsx:303` (the whole filtered list at once) and `Clients.jsx:750`. The
one at `BookingDetail.jsx:254` prefills the body from a saved template, and
`MessageTemplates.jsx` exists to write those templates: its header says in as
many words that *"every template here is an SMS sent from a job, and a text has
no subject."* The `{{customer_name}}` tokens and `fillTemplate` are already
there.

**So the copy is written and the feature is half-shipped.** What is missing is
not the words — it is that the message leaves the detailer's own number, by
hand, one thumb at a time, and the product has no idea whether it was sent,
arrived, or was answered. Nothing about a reminder can be scheduled, nothing
can be recorded, and a detailer standing on a driveway is the sending
infrastructure.

**And here is the argument for the whole capability, from the schema.** On
`customers`, **`phone` is `not null` and `email` is nullable**
(`20260827000200_tenant_data.sql:202`). Every customer in this product has a
phone number; only some have an email. `send-campaign`'s first rule skips
anybody with no address — *"most of this trade's customers are a name and a
phone number"* — so the people the email channel silently cannot reach are
exactly the people the text channel reaches first.

---

## 1 · The send path: one relay, one file that knows the provider

**`send-sms` is `send-email` with the provider swapped, and it should be a
near-copy on purpose.** `send-email/index.ts` opens with *"this file is the
only place that knows the provider (Resend today — swap providers by editing
this file alone)"*, and `_shared/email.ts`'s `sendTenantEmail` is the one thing
every other function calls. The same two pieces:

| Email today | Texting |
|---|---|
| `send-email/index.ts` — service-key only, knows Resend | `send-sms/index.ts` — service-key only, knows Telnyx |
| `_shared/email.ts` → `sendTenantEmail()` | `_shared/sms.ts` → `sendTenantSms()` |
| `email_sends` — a row per attempted send | `sms_sends` — same |
| `resend-webhook` — what happened to it | `telnyx-webhook` — what happened to it, **and replies** |

**Input:** `{ business_id, to, body, kind, dedupe_key? }`. No subject, because a
text has none. `business_id` is **required with no platform exception** — the
one carve-out in `send-email` exists for billing mail and the dead man's
switch, and neither of those is ever going to be a text message.

**The call is one `POST` to `https://api.telnyx.com/v2/messages`** with
`Authorization: Bearer $TELNYX_API_KEY` and a body of
`{ from, to, text, messaging_profile_id, webhook_url }`, which returns a
`data.id` — the provider's message id, and the thing the webhook later finds
the row by, exactly as Resend's `data.id` is today.

**The exits copy across almost one for one.** `send-email` has six and roadmap
14.3 made every one of them leave a row after three of them had been a
`console.warn` into a log nobody watches. Texting's are: no API key →
`skipped`; no number configured for this business → `skipped`; no consent →
`refused` (see §3, and it is the loud one); provider refusal → `failed`;
accepted → `sent`; the fetch itself threw → `failed`. **Every one writes a
row.** A silent exit is this repo's single most repeated defect and it is not
being reintroduced on a channel that costs money.

**One thing does NOT copy across: the daily budget.** `claim_email_send` exists
because Resend's free plan is 100 emails a day across every tenant, and the
platform's own alerts needed a reserve nothing else could spend. Telnyx is
pay-as-you-go — there is no cliff, only a bill. **That makes the ceiling a
money question rather than a capacity one**, and it wants a different shape: a
per-business monthly cap (§5) rather than a platform-wide daily one. I would
not copy `claim_email_send` and I would not leave nothing there either.

---

## 2 · Where the number lives — the real design question

**Recommendation: the number and the messaging profile live on the BUSINESS,
both nullable, and a business with no number cannot text. Ship with exactly one
row filled in — Andrew's — and no fallback of any kind.**

Two new columns on `business_settings`, beside the notification settings that
are already there:

```
sms_from_number          text     -- E.164, e.g. +15035550123. NULL = cannot text.
sms_messaging_profile_id text     -- Telnyx profile this number is attached to.
```

**Why not one shared platform number, which is the cheap answer.** Three
reasons, and the first two are not taste:

1. **The registered brand is Andrew's business, not the platform.**
   `4b2001a0-…` is registered to *"Andrew's Auto Detail & Car Wash"*. 10DLC
   campaign registration binds the message content to the registered brand —
   sending *"Hi Maria, this is Sparkle Auto confirming Thursday"* from a number
   registered to Andrew's detailing business is a mismatch between the sender
   of record and the sender in the text. That is the thing 10DLC exists to
   detect, and carriers filter on it.
2. **STOP is enforced by the carrier on the number pair, not by us.** A
   customer who texts STOP to a shared number is opted out of **every
   detailer** on that number, silently, at a layer this product cannot see or
   override. One person's STOP would quietly stop another detailer's
   confirmations, and our `sms_sends` rows would say `sent` for messages the
   carrier dropped. **That is a cross-tenant leak of opt-out state**, and it is
   the same class as the realtime-channel rule in CLAUDE.md: shared
   infrastructure with only a name separating two tenants.
3. It reads wrong to a customer, which is the reason worth stating last because
   the first two already settle it.

**Why not a number per detailer, bought automatically at signup.** Each
detailer needs their own brand registration and their own campaign — that is a
one-off registration fee, a monthly campaign fee, a recurring number fee, and
**days to weeks of carrier approval before the first message can send**. A
detailer cannot self-serve that inside a signup flow, and a product that buys
numbers on signup is a product with a bill that grows with people who never
send anything.

**So: per-detailer storage, one detailer switched on.** The schema is the
honest one from day one, the cost is one number, and the day a second detailer
completes their own registration it is two column values, not a migration.
**The `NULL` behaviour is the load-bearing part and it must be a refusal, never
a fallback.** A platform default number sitting behind a `??` is how tenant two
silently starts sending as tenant one — the exact shape of the
`--bk-bar-clear` lesson and of every "forgotten argument" defect in this repo.
`send-sms` returns `skipped` with *"texting is not switched on for this
business"*, and the screen says so plainly rather than appearing to send.

---

## 3 · Consent and opt-out — `customers.unsubscribed_at` does NOT cover this

**Your suspicion is correct, and the code settles it rather than my opinion
doing so.** `unsubscribed_at` is set in exactly one place —
`unsubscribe/index.ts:113` — reached from a link in an **email footer**, on a
page (`UnsubscribePage.jsx`) whose own header calls it *"stop getting emails
like this"*. It is read in exactly one place: `send-campaign`, to filter an
email list. It is a fact about email, collected through email, and **agreeing
to be emailed is not agreeing to be texted.**

**And the two channels are opposite in law, which is the part that decides the
schema.** Email under CAN-SPAM is opt-OUT: everybody is in until they leave,
which is why one nullable timestamp is the whole model. Texting under the TCPA
is opt-**IN**: nobody is in until they said so, and a message to somebody who
did not is **$500–$1,500 in statutory damages per message**, which is your
third trap and the only one that carries a fine rather than an apology.

**So texting needs its own three columns, not a second use of the email one:**

```
sms_consent_at      timestamptz  -- NULL = never agreed = we may not text them.
sms_consent_source  text         -- 'booking_form' | 'owner_entered' | 'reply_start'
sms_stopped_at      timestamptz  -- they texted STOP. Never cleared by us.
```

**Three, not one, because "they never said yes" and "they said stop" are
different facts and the screen must not confuse them.** The first is a gap to
close by asking; the second is a decision to respect forever. The email path
already learned this distinction the expensive way — `email_failed_at` clears
itself on the next good send *"otherwise a detailer who corrects a typo is told
forever that the address they just fixed is broken"*, while `unsubscribed_at`
never clears. **`sms_stopped_at` is the second kind and must never be cleared
by anything except the customer texting START.**

**`sms_consent_source` earns its column** because consent is the thing you
would have to prove, and a bare timestamp proves nothing about where it came
from.

**Where consent is captured is a UI change and it is yours to approve.**
`StepDetails.jsx:36` collects the phone number with no consent question beside
it. The minimum honest version is one line under that field —
*"Text me about this booking"* — checked or unchecked by default being a real
decision I am not taking alone. **An owner typing a customer in by hand is the
harder case**: the detailer is asserting consent on somebody else's behalf, and
`sms_consent_source = 'owner_entered'` at least records who claimed it.

**And the enforcement is in the edge function, never the browser.** This is
`send-campaign`'s own rule 2, in its own words: *"an opt-out honoured only by
the UI is not honoured."* `send-sms` reads consent itself, on every single
send, and refuses without it.

---

## 4 · The inbound webhook — STOP, HELP, and a reply nobody reads

**`telnyx-webhook` does three jobs, and only the first of them exists on the
email side.** `resend-webhook` handles delivery outcomes. Texting is
bidirectional, so this endpoint also receives **replies from real people**, and
a reply that lands nowhere is worse than no texting at all.

**1 · Delivery receipts.** `message.sent`, `message.finalized`,
`message.delivered`, `message.delivery_failed` → update the `sms_sends` row
found by `provider_id`. **Copy `resend-webhook`'s two decisions verbatim**: it
only ever UPDATEs, never INSERTs — *"that makes the endpoint idempotent for
free"* — and it carries a `FINAL` set so a late `delivered` cannot undo a
failure that arrived out of order.

**2 · STOP, START and HELP — legally required to work.** Telnyx's own opt-out
handling will stop the message at their end, **but our database must know
independently**, or this product keeps queueing messages that are silently
dropped, writes `sent` rows for them, and bills for the attempt. So
`message.received` with a body matching STOP / STOPALL / UNSUBSCRIBE / CANCEL /
END / QUIT writes `sms_stopped_at`; START / UNSTOP clears it; **HELP sends back
one message naming the business, how to reach a human, and "Reply STOP to
stop"**, which is the only auto-reply this system should ever send.

**3 · An ordinary reply, which is the one that needs a screen.** A customer
answering *"can you come at 3 instead?"* must land where the detailer will see
it. Minimum: a row, and the existing unread mechanism on the dashboard. **A
reply stored in a table nobody draws is the same defect as a `console.warn`.**

**Deployment flag, and it is load-bearing:** like `resend-webhook` and
`stripe-webhook`, this **must be deployed with JWT verification off** or
Supabase rejects Telnyx's request before the file runs. And like both of them,
**the signature is the entire authentication** — Telnyx signs with Ed25519
(`telnyx-signature-ed25519` / `telnyx-timestamp`), the raw body is read before
anything parses it, and the timestamp tolerance is not skipped. Without it,
anybody can POST a STOP for a number they do not own, or a fake reply.

---

## 5 · A row per message

**`sms_sends`, mirroring `email_sends` exactly** — same `provider_id text
unique`, same service-role-writes / browser-reads-only RLS, same
`business_id` + `customer_id` shape, same `detail text` capped at 200
characters, same status vocabulary minus `complained` (there is no spam button
on a text) plus `queued` (see §6).

**A separate table rather than a `channel` column on `email_sends`, and this is
the lazy choice rather than the tidy-looking one.** `email_sends.to_email` is
`not null` and load-bearing; a text row cannot go in without dropping that
constraint, which would weaken the email path to accommodate a different
channel. A text also has a **segment count and a per-message cost** that an
email does not, and an email has a subject that a text does not. Two tables,
one screen reading both.

**And `segments` is not bookkeeping — it is the bill.** A message over 160 GSM
characters is billed as multiple messages, and **one emoji or one curly
apostrophe drops the limit to 70**. A detailer writing a friendly template with
a smiley in it has tripled their cost and nothing anywhere would say so. The
count belongs on the row, and the template editor should show it while they
type.

---

## 6 · Your three traps — all three are real, and one of them already happened here

**Trap 1 · A message that costs money on every retry. TRUE, and this product
has already shipped the mechanism.** `send-owner-reminders/index.ts:238` marks
a booking as reminded **only after the send succeeds** — `await
sendOwnerReminder(b); await mark(b.id, …)` — and the sweep runs every fifteen
minutes. `send-email` documents the consequence in its own comments: a refused
send *"could not survive a sweep: a refused reminder is no longer marked as
sent, so it retries every fifteen minutes, and ten of those over an evening
would have added three hundred"* to the day's count. On email that distorted a
number. **On texting it is a bill, and worse: a failure that was actually a
success** — a timeout after Telnyx accepted the message — sends the customer
the same text every fifteen minutes all evening.

**The fix, and it is the one `send-email` already predicted.** That file's
`record()` carries this ponytail note: *"written AFTER the outcome is known…
if this function ever grows a second await after the send, write the row first
instead."* Texting is that case. **Write the `sms_sends` row FIRST with status
`queued`, then call the provider, then update.** A row that is still `queued`
twenty minutes later is a message whose outcome we do not know, and **the
correct action on an unknown outcome is to stop and show it, never to send
again.** A retry is only ever allowed on an exit that provably never reached
the provider — no API key, no number, refused for consent.

**Trap 2 · The same message twice because a webhook arrived twice. TRUE, and
texting does NOT get the free pass email got.** `resend-webhook` is idempotent
because every branch is an UPDATE. The texting webhook **inserts** — a reply is
a new row — so a redelivery creates a second copy of the customer's message,
and a redelivered **HELP** sends a second auto-reply that costs money. The fix
is a `unique` on the provider's inbound message id and `on conflict do
nothing`, **with the auto-reply sent only when the insert actually inserted** —
not after a separate existence check, which is a race rather than a lock.

**Trap 3 · A text to somebody who never agreed. TRUE, and it is the only one
that carries a fine.** §3 is the whole answer: opt-in as a column with a
timestamp and a source, enforced in the edge function rather than the browser,
refusing rather than falling back.

**And a fourth I found looking, which you did not name: quiet hours.** The TCPA
restricts marketing texts to **8am–9pm in the recipient's local time**. This
product knows the **business's** timezone (`businesses.timezone`, used to turn
absolute `timestamptz` into wall-clock) and knows nothing about the customer's.
For a mobile detailer whose customers are all local that is the same number in
practice — but it is an assumption, not a fact, and the one time it breaks is a
customer who moved away and kept their number. **A confirmation someone just
triggered by booking is a transactional message and is not restricted.
A campaign is.** So the hours rule belongs on the campaign path only, and it
belongs there before the campaign path exists rather than after.

---

## 7 · What I am NOT proposing to build yet

- **No texting campaign.** `send-campaign` took three legal rules and a cap to
  do this over email. The same feature over text needs consent per recipient,
  quiet hours, and a cost ceiling, and it should follow transactional texting
  rather than ship beside it.
- **No automatic replacement of any `sms:` link.** The five deep links are
  free, they work, and they are the detailer speaking in their own voice from
  their own number. Platform texting is for what the detailer cannot do by
  hand — the reminder at 6pm the night before — not for what they already do
  well.
- **No number purchasing flow.** One number, configured by hand, until a second
  detailer has their own registration.

## 8 · The order it would get built in

1. `sms_sends` + the three consent columns + the two number columns — one
   migration, **announced before it is applied**, applied to
   `kguqylyzgyzfktkfnhjb` only.
2. `send-sms` + `_shared/sms.ts`, with every exit writing a row. Testable with
   no number and no key: every send takes the `skipped` path and leaves a row,
   which is exactly the behaviour that must be right anyway.
3. `telnyx-webhook` — signature first, delivery receipts, STOP/START/HELP.
4. The consent question on the booking form — **yours to approve**, since it
   adds a line to a flow whose step budgets are measured to 10px.
5. One real text, to Andrew's own phone, from Andrew's own number, once the
   brand clears and a number exists.

**Nothing in steps 2–5 can send anything until the key box is filled, the
brand clears, and a number is bought.** That is three gates between this
document and a message reaching a stranger, and none of them is ours to open.
