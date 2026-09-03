# What the trade's booking systems actually send — 2026-09-03 (roadmap 2.18, step 1)

The owner asked for the emails to be **deleted and rebuilt from scratch**, and
he asked for research first, by name:

> *"For the emails — just delete all of the existing emails and work them from
> scratch. Make them look the best. Have email customizability for each
> customer. Have multiple options for when emails get sent out and whatnot. If
> you could do some research into that… an option to set reminder emails, when
> the reminder emails will be sent out, what is contained in the reminder
> email. Have some premade templates. And also have them be able to change
> colour based off of the person's business. So the emails need to be
> completely reworked from scratch and thought of properly, not just made
> quickly."*

**Nothing in `app/` or `supabase/` changed in this file.** It is the input to
the build, the same way `docs/detailer-research-2026-08-31.md` was the input to
2.8b and `docs/dashboard-architecture-2026-08-31.md` was to 2.11.

---

## How this was done, and how much weight it carries

**The same six products 2.10 and 2.14 used**, so the counts are comparable
across roadmap items rather than being a fresh panel each time:

| | What it is | How good its public documentation is |
|---|---|---|
| **Jobber** | Field-service, the category leader | **Excellent** — a per-notification help page that names every one |
| **Housecall Pro** | Field-service, the other leader | **Good** — a notifications overview plus per-feature pages |
| **Zenbooker** | Online booking for field service, closest in shape to ours | **Excellent** — a customisation page, a variables page, a changelog |
| **Square Appointments** | General appointments, huge installed base | **Good** — a communications settings page |
| **Urable** | **Detailing-specific** CRM | **Weak** — marketing pages and blog posts; its help centre is behind a login |
| **Mobile Tech RX** | **Detailing / reconditioning-specific** | **Weak** — marketing pages and one public lesson page |

**Source strength is marked per claim below and it is not uniform.** The two
detailing-specific products are the two with the worst public documentation,
which is annoying, because they are the two whose customers are ours. Where a
claim rests only on their marketing copy it says so, and it is not counted as
evidence for a shape — only as evidence that the feature exists at all.

**Six products is not a survey.** It answers *"is our shape normal / missing /
unusual"*, which is what the four questions in the roadmap item actually ask.
Where the evidence is thin, the recommendation is the one that is cheapest to
change later.

**One bias worth naming:** four of the six are general field-service or
appointment tools, and they serve trades where the customer is often not
present (cleaning, HVAC, lawn). Detailing is closer to "the customer hands over
keys and waits", which pushes weight toward same-day messages and away from long
reminder chains. Both detailing-specific products are the most SMS-heavy of the
six, and that is probably why.

---

## Question 1 — which emails does the trade actually send?

Ours sends **eleven template kinds** today
(`supabase/functions/_shared/emailTemplates.ts`). Here is every kind any of the
six sends, against ours. **E = email, S = SMS, — = not offered.**

| Kind | Jobber | Housecall Pro | Zenbooker | Square Appt | Urable | Mobile Tech RX | **Ours** |
|---|---|---|---|---|---|---|---|
| Booking confirmation | E S | E S | E S | E S | E S | S | **E** |
| **Request / quote-request acknowledged** | E | — | E ×2 | — | — | — | **folded into the confirmation** |
| Quote / estimate sent | E S | E | E S | — | E | E | **E** |
| Quote approved / declined | E | — | — | — | — | — | **E ×3** |
| Appointment reminder | E S (×2) | S (E via add-on) | E S | E S | E S | S | **E ×1** |
| Reschedule notice | E S | E S | E | E | — | — | **E** |
| Cancellation notice | — | — | E S | E | — | — | **E** |
| On my way / en route | — | S | S | — | S | S | **S** (message template) |
| Job finished | — | S | — | — | S | S | **S** (message template) |
| Invoice | E S | E | E | E | E | E | **E** |
| **Payment receipt, separate from the invoice** | E | E | E | E | E | — | **— (the invoice doubles as it)** |
| Review request / job follow-up | E | E S | E | — | E | S | **E** |
| **Re-book / maintenance reminder** | E (paid add-on) | E (separate app) | — | — | E | S | **—** |
| Statement / account summary | E | — | — | — | — | — | **—** |
| Card-on-file request | E S | — | — | — | E | — | **—** |
| Staff invite | E | E | E | E | ? | ? | **E** |
| Owner alert on a new booking | E | E | E | E | E | E | **E** |
| Owner alert: nobody answered a request | — | — | — | — | — | — | **E** (ours alone) |

Sources per row are at the bottom. The Jobber, Zenbooker and Square rows come
from the products' own settings documentation and are strong. Housecall Pro's
rows come from its notifications overview plus two feature pages and are good.
**The Urable and Mobile Tech RX rows come from marketing and blog pages** — they
establish that a feature exists, not how it is configured.

### The three things the roadmap guessed at, answered

**(a) A "you're next in the queue" email — NO, and this is settled.** Nothing in
the six sends a queue-position email. What they send is **on-my-way**, and it is
**SMS in all four products that have it, without exception** — Housecall Pro,
Zenbooker, Urable, Mobile Tech RX. Not one of them offers it as an email. That
is not an accident: it is a message that has to arrive in the ten minutes before
somebody turns into a driveway, and email is the wrong pipe for it. **We already
have it, as an SMS message template** (`on_my_way` in `app/src/lib/templates.js`),
which puts us exactly where the trade is. **Nothing to build, and the reason is
worth keeping** so a future session does not add it as an email and think it has
closed a gap.

**(b) A review request — WE ALREADY HAVE ONE, and it is one of the most
universal kinds in the set: five of six.** Ours is `followupEmail`, sent after
payment is recorded, and it carries the Google and Yelp links. The only thing
the trade does that we do not is **let the detailer choose the delay** — Jobber
and Urable both send it a configurable interval after completion, Urable
describing "a waiting period of hours to days"; ours fires the moment the owner
records payment, with no delay at all. **That is a schedule gap, not a missing
email.**

**(c) A receipt separate from the invoice — YES, THIS IS A REAL GAP, and it is
five of six.** Jobber, Housecall Pro, Zenbooker, Square and Urable all send a
payment receipt as its own thing. Zenbooker even gives it its own variable set
(`{{payment.method}}`, `{{payment.date}}`, `{{payment.amount}}`) on top of the
invoice's. **Ours makes one email do both jobs**: `invoiceEmail`'s subject is
*"Your invoice from X — $N"* and it is sent from `send-invoice` after the money
has been taken, so a customer receives a document called an invoice for
something they have already paid. **That is a framing defect more than a missing
feature**, and it is cheap to fix — the same itemisation with a different
headline, a different subject and one extra line saying what was paid and how.

### The one gap that is genuinely new work

**A re-book / maintenance reminder — four of six, and every one of them treats it
as a separate product tier.** Jobber puts it in Campaigns at $29/month on top of
the plan; Housecall Pro puts it in a separate Email Automations app; Urable
describes a six-month service-anniversary follow-up; Mobile Tech RX does it as a
text blast. **Nobody includes it in the base transactional set**, and there is a
reason underneath the pricing: this is the one email in the list that is
**marketing rather than transactional** (see the CAN-SPAM note under "what will
bite"), so it needs an unsubscribe, a suppression list and a sending reputation
the others do not.

**Recommendation: do not build it in 2.18.** It is a different kind of thing
wearing the same clothes, and putting it in the same file as the confirmation is
how the transactional emails end up needing an unsubscribe link. Open it as its
own roadmap item.

### What this says our set should be

Eleven kinds today. The proposal is **twelve**, and the change is small:

1. Booking confirmed *(reserve mode)*
2. **Request received** *(request mode — split out of #1, see below)*
3. Quote offered
4. Request accepted
5. Request declined
6. Appointment reminder
7. Rescheduled
8. Cancelled
9. Invoice *(money still owed)*
10. **Receipt** *(money taken — split out of #9)*
11. Thank-you and review request
12. Staff invite

Plus the two owner-facing ones, which are a different audience and should be
designed as such rather than as a customer email with different words: **new
booking / new request**, and **nobody has answered this request**.

**On splitting #1 and #2:** they are one function with an `isRequest` branch
today. Zenbooker ships them as two separate notifications ("Booking Request
Acknowledgment" and the confirmation) and Jobber has "Submitted requests"
separate from "Booking confirmation" — **both of the products that have request
mode at all keep them apart.** They say genuinely different things ("you have
this slot" versus "we have your request and will answer"), and the owner's own
clarification about request mode — *"one is just a little bit more guaranteed
than the other"* — is precisely a difference in the promise the email makes.

---

## Question 2 — how much of the schedule is the detailer's?

**This is the question where we come out ahead, and the finding saves work.**

| | How many customer reminders | Timing control | Turn individual emails off? |
|---|---|---|---|
| **Jobber** | **Exactly two** — "one text and one email, or two of a kind" | Per reminder, e.g. "one day before"; no stated maximum | Yes, per notification |
| **Housecall Pro** | One (SMS); email reminders only via a separate app | A **clock time on a day offset** — default 9:00 AM the day before, 30-minute increments, or a custom time | Partly — per job and per customer; **not all at once** |
| **Zenbooker** | Not stated publicly; timing explicitly customisable | Customisable per notification | **Yes — "you can disable one or both"**, email and SMS separately |
| **Square Appointments** | One email **and** one SMS | **One hour to three days before**, a fixed picker | Yes, per notification |
| **Urable** | Not stated | "Set reminders to send on their own"; review request after "hours to days" | Not stated |
| **Mobile Tech RX** | Not stated | Not stated | Not stated |
| **Ours** | **One email** | **Both shapes at once** — `customer_reminder_lead_minutes`, *and* an evening-before rule with its own send time and a latest-start cutoff | **Five of eleven kinds** |

**Three findings.**

**1. Two reminders is the ceiling in this trade, not a floor.** Jobber, the most
featured product of the six, caps at two and says so in a sentence. Nobody
offers three. So the honest answer to *"whether anyone lets them send more than
one"* is: **one product does, one does it by using a second channel, and the rest
send one.** A second email reminder is a legitimate thing to build, but it is at
the top of the market, not the middle of it.

**2. Our reminder timing is already better than four of the six.** We carry
Square's shape (an offset before the start) *and* Housecall Pro's shape (a clock
time on the previous day, with a cutoff so a 7am job is not reminded at 8pm the
night before) *simultaneously*, per business, timezone-correct. **The schedule
half of the owner's ask is mostly already built and nobody has ever shown it to
him** — it lives in Booking rules, not Notifications, and the Notifications
screen just says *"Timing is set in Booking rules."*

**3. The real schedule gap is per-kind switches, and it is a small one.** We have
five booleans covering five of eleven kinds. Cancellation, reschedule, invoice
and the three request-decision emails cannot be turned off. Per-notification
switches are the norm in three of the six that document it. **But not every one
of ours should get a switch** — an accepted-request email that does not send
means the customer never learns they have a booking, and Housecall Pro's own
documentation carries the same instinct ("you cannot turn off all customer
notifications at once"). **Recommendation: switches for the ones that are
courtesies (reminder, follow-up, receipt), none for the ones that carry the only
copy of a fact the customer needs (confirmation, accepted, declined,
cancellation, reschedule, invoice).**

### The cost of a second reminder, since it is the one thing here that needs schema

Due-ness is decided in SQL, per business, in
`get_bookings_due_for_reminder(target)`, and **each send is guarded by exactly
one marker column on the booking** — `customer_reminder_sent_at`. A second
customer reminder therefore cannot be done by changing a number; it needs a
second marker (or a small `booking_reminders_sent` table) and a second lead
setting, or the sweep will either send twice or never send the second one. **That
is the whole cost, and it is a migration plus a branch in one RPC.** Named here
so nobody discovers it halfway through the build and calls the feature
expensive.

---

## Question 3 — how much of the content is theirs?

**The roadmap called this "the question with the widest range of answers and the
biggest cost difference", and it is right. The counts are lopsided.**

| | What the detailer can change | Where the ceiling is |
|---|---|---|
| **Jobber** | Message **body** text + variables, per notification, with separate email and SMS versions | The invoice's payment section is added by Jobber and is **explicitly not editable** |
| **Housecall Pro** | SMS wording + variables; default messaging on estimates and invoices | Customer notification emails are **not editable at all**; service-plan reminder wording explicitly cannot be changed |
| **Zenbooker** | **Layout, text, colours, images, links, button labels, footer** — a real visual editor | The money block is **one variable** (`{{invoice.line_items}}`, `{{invoice.pricing_summary}}`) that renders itself |
| **Square Appointments** | **Subject line and an added message**, inside a fixed frame, with bracketed variables | Explicitly *"don't include marketing or promotional material"* |
| **Urable** | Message wording; saved scripts | Not documented |
| **Mobile Tech RX** | SMS templates plus a disclaimer and contact block, set in the admin portal | 160 characters |
| **Ours** | **Nothing. No screen edits any email.** | — |

**Five of six give the detailer WORDS. One of six gives them a DESIGN.**

And the one that gives them a design still does not give them the money. **This
is the single most useful finding in the file:** Zenbooker, the most permissive
product of the six, renders the invoice's itemisation as *one variable the
editor cannot open*. The detailer writes around the money block; they never
write inside it. That is the same instinct as our own `money-export` rule — *a
number printed is not a number charged* — arrived at independently by somebody
shipping the feature.

**Recommendation, and it follows from the counts rather than from taste:**

- **A fixed frame we own, with named editable slots.** Per email: the **subject**
  and one or two **prose blocks**. Everything structural — the band, the logo,
  the details table, the money, the buttons, the footer — is ours and is not
  reachable from the editor.
- **The itemisation is never a slot.** Not a rich-text region, not a variable the
  editor can delete. It is drawn by the function from the booking.
- **Reuse the mechanism that is already in the product.** `message_templates`
  (table, RLS, seed-on-first-open) and `app/src/lib/templates.js`
  (`PLACEHOLDERS`, `fillTemplate`, `findBadTokens`) already do exactly this for
  SMS, and `MessageTemplates.jsx` already has the two things that make it usable
  by a non-technical person: **labelled chips that insert a variable at the
  cursor so nobody types a brace**, and **a live preview filled with sample
  data**. That screen's own header comment already calls the email gap out as
  real. **A second, different editor for email would be two answers to one
  question.**
- **Say no to a visual editor, and say why.** It is one of six, it is the most
  expensive thing on this page, and its failure mode is a detailer producing an
  email that is worse than the one we shipped — which is the opposite of *"make
  them look the best."*

---

## Question 4 — what "premade templates" means in this trade

**It means WORDING. Not visual designs. The evidence is one-sided.**

- **Not one of the six offers a choice of visual designs for a transactional
  email.** Every product has exactly one look, and it is the product's look with
  the business's logo and colour dropped into it.
- **Where prebuilt *design* templates do exist, they are marketing email and a
  separate product.** Jobber's Campaigns — a $29/month add-on — has "pre-built
  templates" that "already include your logo and brand colors". Note what that
  sentence says: even the design gallery **applies the brand automatically
  rather than offering a choice of looks**.
- **Where "templates" appears in the transactional settings, it always means a
  message body.** Jobber: "edit templates for email and text message". Urable:
  "save your favorite scripts so you never have to retype them". Mobile Tech RX:
  "create default text templates in your Admin Portal". Housecall Pro: "set your
  own default messaging".
- **The trade's own idea of a "template" is a paragraph you copy.** Jobber
  publishes an article titled *8 Call, Text, and Email Appointment Reminder
  Templates* — eight blocks of prose. That is the artefact detailers actually
  swap with each other.

**So what he will recognise when he sees it:** a set of **prewritten wordings per
email** — a short one and a warmer one, say — that he picks and can then edit,
with the design staying ours. **Not a gallery of looks.** If he does want a
gallery of looks, that is a different and much larger feature, and it is worth
asking before building rather than guessing (see the decisions below).

---

## Question 5 (not asked, found anyway) — the colour is done, the logo is not

**The colour half is finished and must not be touched.**
`supabase/functions/_shared/brandColor.js` takes the tenant's one accent and
returns three corrected values — the band fill, the ink measured *on* that band,
and the same colour as words on white paper at 4.5:1.
`tests/email-brand.test.mjs` is **138 checks** and pins all of it against
`app/src/lib/theme.js` on twelve presets and four extremes. **Confirmed passing
at the start of this session.** Roadmap 2.12 already fixed the eleven header
lines that ignored it. There is nothing to do here.

**But `business_branding.logo_url` exists, detailers already upload one on the
Business info screen, it is drawn on the booking page, the confirmation page and
the receipt page — and `buildBrand()` never reads it, so it has never appeared
in an email.** The header band prints the business *name* as text and nothing
else.

Square's documentation describes exactly the pattern we are one field away from:
*"the appointment reminder template includes your business logo and information
at the top, in the style and colors you selected"*. **This is the cheapest thing
on this entire page and among the most visible: one column read, one `<img>` in
the shell.** Two things to get right and neither is hard — a fallback to the
current text lockup when there is no logo or the image fails to load, and a
decision about whether the logo sits **on** the coloured band (where its contrast
cannot be measured, because it is somebody's arbitrary PNG) or on the white paper
above it, where any logo is safe. **Recommend the paper.**

---

## What will bite during the build

**1. `tests/email-brand.test.mjs` is partly a SOURCE-SHAPE test, and "rebuilt
from scratch" collides with it.** This is the one thing on this page that will
silently waste a session. Of the 138 checks:

- Checks 1–6, 7b and 7c are **arithmetic** — they measure colours through
  `brandColor.js` and never look at the templates. **They must keep passing
  untouched, and they will.**
- Checks **7a, 7a-ii and 7b-ii read `emailTemplates.ts` as text**, and they
  assert things about a file that a rebuild deletes: that `const header =` blocks
  exist, that `${brand.headerInk}` appears **at least fourteen times**, that the
  literal string `max-width:600px; background-color:#ffffff;` is present, and
  that three specific greys never reappear.

**The intent of those three checks is right and must survive; their pointers are
to a file that will not exist in that form.** So they get **re-pointed at the new
template source with the same intent, deliberately and in the same commit**, per
CLAUDE.md's rule that a test and a real design decision colliding means the file
changes first and never silently. **A rebuild that quietly drops 7a is how the D1
defect comes back** — its whole purpose is to stop the *next* template being
written with a hardcoded white on the band, and a rebuild is exactly "the next
template".

**2. The invoice is a `money-export`-class risk, it is about to be split in
two, AND IT IS ALREADY BROKEN.** `invoiceEmail` itemises services, add-ons,
travel and `price_adjustments` and must reconcile to `final_amount`. **It does
not today** — the promo discount is missing and the column misses the total by
exactly that amount; full reproduction in the section above. Splitting it into
an invoice and a receipt **doubles the number of places that arithmetic is
drawn**, so both have to tie out. `tests/money-export.test.mjs` is the shape of
that check and the new one should look like it; `render-emails.mjs` already
fails on this one.

**3. A template editor writes DATA, never code.** Every template is rendered by a
Deno edge function that cannot import from `app/`. Whatever the editor saves has
to be a string the function substitutes into a frame it already holds. This is
another reason the `message_templates` shape is the right one: it stores a body
with `{{tokens}}`, and `findBadTokens` already refuses to save a broken one.

**4. Email cannot load a webfont.** Arial/Helvetica is the email-safe stack and
`emailTemplates.ts` is the one file in the repo allowed to name it. **"Make them
look the best" therefore has to be won in layout, colour, spacing and
hierarchy** — not type. Worth saying out loud to the owner, because "the emails
don't use our font" will otherwise read as an oversight.

**5. CAN-SPAM: a free-text block can reclassify an email.** Transactional
emails — confirmations, reminders, receipts — are exempt from the unsubscribe
requirement **only while their primary purpose stays transactional**. A detailer
who puts *"20% off ceramic coating this month"* into the reminder's prose slot
has turned it into a commercial email that legally needs an unsubscribe link.
Square's settings page carries exactly this warning to its own users: *"don't
include marketing or promotional material in your custom notifications."*
**Two consequences:** the re-book / maintenance reminder belongs in its own item
with its own unsubscribe machinery, and our editor screen should carry Square's
sentence in plainer words.

**6. Nothing in the repo rendered an email for a human to look at.** ~~There is
no preview script~~ — **BUILT IN THIS SESSION, and it found a live money defect
in its first run. See the next section.** `node scripts/render-emails.mjs`
writes all sixteen (eleven kinds, sixteen counting the branches somebody
actually receives) to `email-preview/`, from one fixture, with no new
dependency: Node 24 strips the types itself, so it reads the *same*
`emailTemplates.ts` the edge function runs rather than a bundle or a copy.

---

## What the instrument found on its first run

**The invoice's own column does not reach its own total whenever a promo code
was used, and it has never done.** Reproduced, rendered and looked at:

| What the invoice prints | |
|---|---|
| Full Interior + Exterior Detail | $285.00 |
| Add-on: Pet hair removal | $35.00 |
| Add-on: Engine bay clean | $40.00 |
| Travel — Outer ring | $25.00 |
| Heavy soiling surcharge | $20.00 |
| Tip | $30.00 |
| **Subtotal** | **$405.00** |
| **Tip** | **$30.00** |
| **Total paid** | **$395.00** |

$405 + $30 is $435. **$40 is missing and nothing on the page mentions it** — it
is the customer's promo code, `FALL10`, which the *confirmation* email drew
correctly as `-$40.00` an hour earlier.

**The mechanism.** `send-invoice/index.ts` builds its charge rows from
services, add-ons, travel and `price_adjustments` — which is exactly
`bookings.subtotal`, i.e. the figure **before** any discount — and takes
`totalPaid` from `bookings.final_amount`, which is `total_price` (already
**past** the promo) plus the finalize extras. **`promo_discount` is in neither
the rows nor `discountsTotal`**, so the gap is exactly the promo, every time.
`b.promoDiscount` is even passed into `invoiceEmail`; the template never reads
it.

**This is the `travel_fee` family, and the resemblance is not loose.**
`send-invoice`'s own comment, written when travel had this bug in roadmap 2.8c,
says it: *"the bottom line was still right (it is final_amount, what was
actually collected) but the itemisation above it did not add up to anything."*
The same sentence describes the promo today. **`site_discount` is the same hole
and has not been reproduced only because no seeded booking carries one.**

**Why no test caught it.** `money-export.test.mjs` ties out the accountant
export, not this email. `booking-engine.test.mjs` test 17 ties out the quote
engine. **Nothing in the repo has ever asserted that the invoice's printed
column reaches the invoice's printed total** — which is the one arithmetic the
person who paid will actually check.

**It is now an assertion rather than a paragraph**, because a paragraph is what
the travel fee had: `render-emails.mjs` computes the totals the way
`send-invoice` computes them and **exits 1 while the column does not close.**
It fails today, deliberately. The rebuild is what makes it pass.

**Not patched here, on purpose.** The fix belongs in the invoice/receipt split
this same roadmap item performs — patching now means the rebuild re-derives it
days later — and the failing check is what makes forgetting impossible.
Nobody is receiving these: detailingplatform.com is the owner's private preview
and billing charges nobody.

### But it may not be ours alone — one thing for the owner to authorise

**`reference/supabase/functions/send-invoice/index.ts` — the read-only snapshot
of his live business's old site — has the same shape.** It pushes an explicit
negative row for a *monthly plan* discount and **pushes nothing for
`promo_discount`**, and that site does have promo codes
(`validate-promo-code`, `promo_discount` on its bookings table). So the
omission was **inherited by the port, not introduced by it.**

**What is NOT established, and must not be assumed either way:** whether the
live `carwashweb` still matches this snapshot, and whether its own
`final_amount` path (it recomputes from base items rather than from
`total_price`) closes the gap by another route. **That is a read of a
different repo against a live business, which CLAUDE.md says needs his explicit
go-ahead.** It is worth asking for: if it does reproduce there, real customers
of Andrew's Auto Detail have been receiving invoices that do not add up
whenever they used a promo code.

---

## Cost, honestly

| Piece | Size | Why |
|---|---|---|
| ~~A script that renders every email to look at~~ | **DONE** | `scripts/render-emails.mjs`, no new dependency. It found the invoice defect on its first run. |
| **Fix the invoice's missing promo row** | **Small** | In `send-invoice`, not the template — that file survives the rebuild. Do it inside the invoice/receipt split. |
| Rebuild the twelve templates + shell | **Large** | The design job. No schema. The 138-check test's source checks move with it. |
| Logo in the header | **Tiny** | One column in `buildBrand`, one `<img>`, one fallback. |
| Split invoice / receipt | **Small** | Same itemisation, second framing — plus its own tie-out test. |
| Split confirmation / request-received | **Small** | Removes an `isRequest` branch rather than adding one. |
| Per-kind on/off switches (the courtesies) | **Small** | Booleans on `business_settings`, one migration, rows on an existing screen. |
| Editable subject + prose slots, 12 kinds | **Medium** | Table + RLS + seeding, and a screen — but `message_templates` and `MessageTemplates.jsx` are the pattern to copy, not invent. |
| Prewritten wordings to choose from | **Small**, once the above exists | A second row in the seed data plus a picker. |
| Review-request delay | **Small** | One setting, one marker, one branch in the sweep. |
| **Second reminder** | **Medium** | Migration for a second marker + a second lead setting + a branch in `get_bookings_due_for_reminder`. |
| **Visual template editor (Zenbooker's model)** | **Large, and recommended against** | One of six. Lets a detailer make the email worse. |
| **Re-book / maintenance campaign** | **Large, and its own item** | Marketing email: unsubscribe, suppression, reputation. |

---

## What needs the owner before the build starts

Five things, and only the first two block the build. **The fifth is not about
this product at all and is the most urgent of them.**

**1. "Premade templates" — wording or looks?** The research says the trade means
**wording**: a few prewritten versions of each email that he picks and edits,
with the design staying ours. Nobody in the six offers a choice of visual designs
for a transactional email. **Recommend wording.** If he actually pictured a
gallery of looks, that is a much bigger feature and it should be said now.

**2. How many reminders?** Ours sends one. Jobber caps at two and nobody offers
three. A second one is a migration and a settings row — not free, not large.
**Recommend building the second**, because *"multiple options for when emails get
sent out"* is close to a direct request for it, and because we would then match
the best product in the category rather than the median.

**3. The re-book / maintenance reminder** — *"we cleaned your car six months ago,
want us back?"* Four of six have it, all four as a separate paid tier, because it
is marketing email with legal machinery attached. **Recommend its own roadmap
item, not 2.18.**

**4. The logo on the band or on the paper?** A logo is an arbitrary image, so its
contrast against the tenant's coloured band cannot be measured the way every
other colour in this product is. **Recommend the paper above the band**, which is
safe for every logo anyone uploads.

**5. May we look at `carwashweb`'s invoice email?** The read-only snapshot of his
old site has the same missing promo row as this platform. **If the live business
still matches it, real customers have been getting invoices that do not add up
whenever they used a promo code.** A read of that repo settles it in minutes;
CLAUDE.md says a read is allowed and a write is not, and this is a read. **Does
not block 2.18 and should not wait for it.**

---

## Sources

Jobber

- Emails and Text Messages Settings — https://help.getjobber.com/hc/en-us/articles/9335574672151-Emails-and-Text-Messages-Settings
- Assessment and Visit Reminders — https://help.getjobber.com/hc/en-us/articles/360033608974-Assessment-and-Visit-Reminders
- Campaigns (Marketing Tools) — https://help.getjobber.com/en/articles/campaigns-marketing-tools/
- 8 Call, Text, and Email Appointment Reminder Templates — https://www.getjobber.com/academy/appointment-reminder-templates/

Housecall Pro

- Customer Notifications Overview — https://help.housecallpro.com/en/articles/357613-customer-notifications-overview
- Setting Up SMS Job Reminders — https://help.housecallpro.com/en/articles/8688152-setting-up-sms-job-reminders
- Service Plan Scheduling Suggestions — https://help.housecallpro.com/en/articles/8124459-service-plan-scheduling-suggestions
- Automated Email Campaigns Overview and FAQ — https://help.housecallpro.com/en/articles/362406-automated-email-campaigns-overview-and-faq

Zenbooker

- Customize emails and text messages sent to clients — https://help.zenbooker.com/en/articles/2397840-customize-emails-and-text-messages-sent-to-clients
- Dynamic variables for customer notifications — https://help.zenbooker.com/en/articles/5049619-dynamic-variables-for-customer-notifications
- Notifications collection — https://help.zenbooker.com/en/collections/1389039-notifications
- Better customer notification management and more customizable email templates — https://zenbooker.com/change-log/better-customer-notification-management-and-more-customizable-email-1594739191464x798663390020763600

Square Appointments

- Manage appointment booking notifications and reminders — https://squareup.com/help/us/en/article/6729-customer-confirmations-with-square-appointments
- Appointment Reminders Are A Great Way to Advance Your Business — https://squareup.com/us/en/the-bottom-line/reaching-customers/an-easy-way-to-keep-your-appointment-schedule-running-smoothly
- Customize receipts — https://squareup.com/help/us/en/article/5424-customize-digital-receipts-and-invoices

Urable *(marketing pages — weak)*

- CRM with Automated Messaging — https://urable.com/automated-messaging/
- The Most Popular Urable Automations for Busy Field Teams — https://urable.com/2026/05/02/the-most-popular-urable-automations-for-busy-field-teams/

Mobile Tech RX *(marketing pages — weak)*

- Communicate with Customers — https://www.mobiletechrx.com/lessons/communicate-with-customers/
- Scheduling — https://www.mobiletechrx.com/scheduling/

Compliance

- CAN-SPAM and transactional email: exemptions and best practices — https://www.socketlabs.com/blog/do-transactional-emails-need-to-be-can-spam-compliant/
- Reminder email compliance: GDPR, CAN-SPAM and CASL — https://instantly.ai/blog/reminder-email-compliance-gdpr-can-spam-casl-guide/
