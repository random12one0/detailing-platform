# The detailer's dashboard — what is missing that a detailer would want

2026-09-06. The owner: *"is there anything that's missing from there that a
detailer would want? How to make it the most convenient best admin dashboard
for a detailer of that sort."*

**Nothing here is built.** This is the thinking, ranked, with the honest cost
beside each one.

---

## 1. What is already there, so nothing gets built twice

**Five tabs**: Today, Calendar, Money, Clients, Business.
**Twenty-one settings screens**: Appearance, Billing, Booking rules, Business
info, Campaigns, Catalog, FAQ, Gallery, Hours, Maintenance, Message templates,
Notifications, Password, Payments, Plans, Preferences, Promos, Reviews, Switch
business, Team, Web address.

That is already more than most of the field-service tools a detailer would
otherwise buy. **The gaps below are not "it does nothing" gaps — they are the
specific things a mobile detailer does every day that this does not yet
touch.**

---

## 2. The measure: what does a mobile detailer's day actually contain?

The trade press and the tools detailers already pay for agree on a short list
of what separates a detailer who is growing from one who is busy: quote fast,
**photograph every job before and after**, invoice the same day, **ask for the
review before leaving the driveway**, and **drive the shortest route between
jobs**. This product does two of those five well and does not do three of them
at all.

That is the frame for the ranking.

---

## 3. Ranked: the gaps that matter

### 3.1 Before-and-after photos, attached to the job — **the biggest gap**

`gallery_images` exists, but it is the *marketing* gallery for the public
site. **There is nowhere to put the photos of the car in front of you.**

Why it is first:

- **It is the single most-recommended habit in this trade**, and the product
  does not support the habit at all.
- It is the **dispute killer**. "That scratch was there when I arrived" is a
  conversation every detailer has, and a timestamped before-photo ends it.
- **It feeds the marketing gallery for free.** Photograph the job, tick one
  box, and it is on the public site — instead of the gallery being a chore
  nobody does.
- It is what makes the customer's finished-job email worth opening.

Shape: photos on the booking record, taken on the phone, before/after pairs,
optional on the receipt, one tick to publish.

**Cost: real.** Storage (Supabase buckets, already available), an upload path,
and a size/retention policy. This is the largest item on the list and the one
worth doing first.

### 3.2 Ask for the review, at the right moment

`Reviews` and `testimonials` exist for *displaying* reviews. **Nothing asks
for one.**

The moment is the same day the job finishes — the product already knows when
that is, because the detailer presses *Mark complete*. One message with the
detailer's own Google review link, sent automatically or with one tap, and a
count of how many were asked and how many landed.

**Cost: small.** The email machinery, the templates and the timing all exist.
It is a template, a link field, and a hook on the same event that already
sends the receipt.

### 3.3 Text messages, not just email

**Every reminder, receipt and confirmation this product sends is an email, and
this trade runs on text.** A customer who books a driveway appointment for
Saturday reads a text and ignores an email.

Cost: a real one — an SMS provider, per-message money, a phone number, and
consent handling that email does not need. **But the honest note is that the
product's reminders are quietly less effective than they look**, and that is
worth knowing before we call reminders a feature.

**Recommendation: not next, but decide it deliberately rather than by
omission.** A cheap first step is one tap that opens the phone's own messaging
app with the message pre-written — no provider, no cost, no consent problem,
and it covers most of the value.

### 3.4 The day's driving order

The Calendar and Today show jobs by time. **For a mobile detailer they are
also places on a map**, and the difference between a good day and a bad one is
often the driving between them.

The addresses are already stored on every booking. Even without routing
software, two cheap things help a lot:

- **Show the next job's address as a tappable map link** from Today. (Nearly
  free, and genuinely useful tomorrow morning.)
- **Warn when two jobs are booked far apart with little gap between them** —
  at the moment of booking, not on the day.

Real route optimisation is a much bigger feature and needs a distance service.
Note it, do not build it.

### 3.5 A quick condition note before starting

Detailing software calls this a vehicle inspection. It does not have to be
elaborate: **a note and a few photos taken before the work starts** — which is
3.1 with a text field, and should be built as the same thing.

### 3.6 Money gaps a detailer will notice

- **Who owes me** exists as an unpaid list. **What is missing is chasing it**:
  a reminder to the customer about an unpaid job.
- **Tips** are a line-item category already; whether they are visible as their
  own number on Money is worth checking.
- **Mileage.** A mobile detailer's biggest deductible expense, and expenses
  today are a manual entry. Even a per-job "miles driven" field would be
  worth more at tax time than most of the Money screen.
- **A tax-time summary**: the accountant export exists; a plain
  *"here is your year"* is a smaller, friendlier version of the same thing.

### 3.7 Smaller things, cheap, that add up

- **A customer's vehicle remembered.** `vehicle_model` is on the booking; a
  returning customer should not retype it, and *"the black Tahoe"* is how a
  detailer thinks about a repeat client.
- **Job notes that persist per customer** — "gate code 4412", "dog in the
  yard", "always wants the mats done twice". Some of this exists on the
  customer record; it should be in front of the detailer on the job.
- **A waitlist**: someone who wanted Saturday when Saturday was full, so a
  cancellation gets filled instead of lost.
- **Weather.** Outdoor work, cancelled by rain. Even a read-only forecast
  beside tomorrow's jobs would earn its place.
- **Duplicate a past job** — the same customer, same package, next month.
- **Blocked customers.** Every detailer has one they will not go back to.

---

## 4. What is deliberately NOT recommended

- **A second calendar sync.** Google Calendar sync is already on the roadmap
  (4.2) and half-built; a second path is a second source of truth.
- **Team GPS tracking.** It exists in enterprise field-service tools. For a
  one-or-two-person detailer it is surveillance with a subscription.
- **An inventory system.** Detailers track chemicals informally and a product
  that asks them to count bottles will be ignored, which teaches them to
  ignore the rest of it.
- **A "customer portal" with logins.** The booking link, the receipt link and
  the manage-booking link already do this without a password, which is the
  right trade for a customer who books twice a year.

---

## 5. If only three get built

1. **Before-and-after photos on the job** (3.1 + 3.5 as one feature).
2. **Ask for the review the day the job finishes** (3.2).
3. **The next job's address as a map link, and a warning when two jobs are far
   apart** (3.4's cheap half).

The first is the biggest thing missing. The second is nearly free and directly
grows a detailer's business, which is the strongest argument for renewing. The
third takes two afternoons and a detailer notices it on day one.

---

Sources for §2's list of what the trade actually values:
[Clientility 2026 review](https://www.clientility.com/blog/best-auto-detailing-software-for-car-detailers-in-2026),
[autohustl comparison](https://autohustl.com/blog/best-auto-detailing-software/),
[QuoteIQ field-service roundup](https://myquoteiq.com/top-10-auto-detailing-field-service-software-in-2026/)
