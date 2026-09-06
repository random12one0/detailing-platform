# Your back office — what it shows, what it is sitting on, and what it should be

2026-09-06. The owner:

> *"I want to make sure that's the best dashboard that has basically anything
> that's... I don't wanna have anything that's, like, could be visible hidden
> because I wanna have the most information to make it the most convenient to
> me possible. I don't want to be like, I can't really see that information
> here, but I know that it's published somewhere and that it's an option for
> me to have it."*

**Nothing here is built.** He asked for the thinking, and said explicitly that
anything needing new code or data we do not have should be *noted and saved*,
not written yet.

---

## 1. The frame: a back office answers questions, not tables

The temptation with "show me everything" is a wall of fields. That is the
opposite of convenient — it is the same wall his booking page's first version
had, and it is why this document is organised by **the seven questions he
actually asks about a detailer**, with the data each one needs underneath it.

A field that answers none of the seven is noise no matter how available it is.
A question with no field is the actual gap.

1. **Is this detailer making money?**
2. **Are they actually using it?**
3. **Are they about to leave?**
4. **Am I being paid?**
5. **Is their site working?**
6. **Do they need me?**
7. **And across all of them: how is the business doing?**

---

## 2. What it does today, honestly

**The list.** Name, slug, three tags (suspended / founding / has-note), a
subtitle line, a link to their booking page, search, and a filter.

**One business open.** Created date and plan, booking mode, service count,
people count, their website field, domains, your private notes, export, the
price editor, suspend/restore, founding toggle, resend invite, sign-in-as, and
the log of what has been done to the account.

**That is a good administrative tool and almost no business intelligence.**
Every control is about *changing* an account. Almost nothing tells him how an
account is *doing* — which is the half he is asking for.

---

## 3. Tier 1 — already sent to the browser, not drawn

**This is the cheapest tier and it is exactly his complaint**: the server puts
it in the payload and the screen throws it away.

| Already in the payload | What it answers | Notes |
|---|---|---|
| **`detail.bookings`** — the whole array | Q1, Q2, Q3 | **The biggest one by far.** The screen currently draws none of it. Every revenue figure, every trend, "last booking", "bookings this month", "cancellation rate" is already downloaded and discarded. |
| **`detail.subscription`** — `platform_subscriptions`, 30 columns | Q4 | Status, current period end, trial end, cancel-at, past-due. Today the screen says nothing about whether a detailer is paying. |
| **`detail.invoices`** — `platform_invoices` | Q4 | Paid, open, failed, amounts, dates. |
| **`detail.counts`** — addOns, promos, photos, hoursOpen | Q6 | Only `services` is drawn. |
| **`heartbeats`** (list payload) | Q5 | The nightly jobs' health. Drawn as one line; deserves to be a per-business signal, since a dead reminder job hurts one tenant's customers. |
| **`domain_verified`** | Q5 | Sent, and the screen only shows the domain string. |
| **`setup_inputs`** → progress | Q6 | Drawn as a number; the useful version is **which** step is missing. |

**Recommendation: draw all of it.** No new endpoint, no new query, no
migration. This alone turns the page from an admin tool into a dashboard.

---

## 4. Tier 2 — in the database, one query away

Everything here exists in the 39 tables the platform already has. It needs the
`platform-admin` function to select it — no new schema, no new writes.

### Q1 · Is this detailer making money?

- **Revenue this month / last month / lifetime**, from `bookings.final_amount`
  — the same arithmetic the detailer's own Money screen does. **Use their
  numbers, not a second calculation**, or the two will disagree and he will
  not know which to believe.
- **Jobs completed** vs **cancelled** vs **no-show**, as three counts.
- **Average job value**, and whether it is moving.
- **Recurring revenue**: `plans` and `plan_members` — a detailer with twelve
  plan members is a different business from one with none, and it is the
  single best predictor that they will stay.
- **Expenses** (`expenses`) — their profit, not just their takings. He can
  already see this per-tenant if he wants it; whether he *should* is §7.

### Q2 · Are they actually using it?

- **Last booking created** and **last booking finalised** — two different
  facts. A detailer taking bookings but never finalising them is not using the
  money half at all.
- **When they last signed in.** `auth.users.last_sign_in_at` exists; it is not
  currently read anywhere. **This is the single strongest usage signal and it
  is one column.**
- **Which screens they have used**, approximated by what exists: templates
  edited, promos made, campaigns made, gallery photos, testimonials, FAQ
  answers, maintenance deadlines.
- **Staff**: how many people, and whether any staff member has ever signed in.
  An owner who invited nobody runs alone.

### Q3 · Are they about to leave?

This is the question the whole page should be built to answer early, and
nothing on it answers it today.

- **Days since last booking**, against their own normal. Seven quiet days is
  nothing for a detailer who books six a month and an emergency for one who
  books sixty.
- **Setup never finished** — still at *2 of 7* three weeks in.
- **Booking page never shared**: no campaign, no QR, no domain.
- **Subscription past due or cancel-at-period-end.**
- **Their own churn**: customers who booked once and never returned. A
  platform cannot fix that, but it tells him what to talk to them about.

**Suggested: one "needs attention" list at the top of the page**, above the
business list, built from those signals. That is the difference between a
dashboard he reads and a dashboard he searches.

### Q4 · Am I being paid?

- **MRR**, and the split between founding and standard.
- **Failed payments** and **open invoices**, as a list rather than per-account.
- **Term commitment**: months remaining, exit fee if they left today. The
  price editor already knows the ladder; nothing shows what it means per
  tenant.
- **Trials ending in the next N days.**

### Q5 · Is their site working?

- **Is the booking page actually bookable?** Not "do they have services" but
  the real question: active services **and** open hours **and** not suspended.
  A detailer whose page cannot take a booking is losing money silently and
  neither of us finds out.
- **Domain state**: none / added-unverified / verified. Unverified for a week
  is a support ticket waiting to happen.
- **Traffic**: `campaign_visits` and `plan_visits` are already recorded. **He
  can see how many people looked at a detailer's page and how many booked.**
  A conversion rate per tenant is two counts and it is the most persuasive
  number he could ever put in front of a detailer at renewal.
- **Spam pressure**: `rate_hits`. If one tenant is being hammered he should
  know before they complain.

### Q6 · Do they need me?

- **Which setup step is missing**, by name.
- **Pending invites** (`business_invites`) that were never accepted.
- **Maintenance deadlines overdue** — their customers' warranties, and a
  reason to call.
- **Message templates left at default** — a tenant sending our words rather
  than theirs is one that has not made the product theirs.

### Q7 · How is the whole business doing?

A strip across the top, above everything:

- Detailers: total, active, suspended, trialling.
- **Founding spots left** — already computed by `founding_offer()`.
- MRR, and change since last month.
- Signed up this month / churned this month.
- **Total bookings taken through the platform this month.** This is his proof
  that the thing works, and it is the number he will want on a sales call.
- Jobs health, one line, already there.

---

## 5. Tier 3 — needs new code or data. Noted, not built.

Per his instruction: *"Don't do that yet. Maybe keep it, save it for later if
you think it's a good idea."*

**Worth building later, in this order:**

1. **A per-tenant activity feed.** `platform_admin_events` records what *he*
   does to an account. Nothing records what the *detailer* does. A light
   event log per business would answer Q2 and Q3 properly instead of by
   inference.
2. **Notes with dates and reminders.** The notes field is one blob. *"Call
   back after the 3rd"* is a note he will never see again on the 3rd.
3. **Impersonation that returns.** Sign-in-as currently signs him out of his
   own account. A short-lived view-only session that ends is a different and
   much better tool.
4. **A message to a detailer, from here.** He can suspend a business but not
   email its owner without leaving the page.
5. **Comparisons.** "This detailer is in the bottom quarter for bookings" is
   only possible once several tenants exist, and it is the thing that makes
   the page smart rather than merely complete.

**Deliberately not recommended:**

- **Reading a detailer's customer list, notes or messages.** He *can* — the
  service role sees everything — and the export button already hands him the
  lot when a tenant asks for it. But a back office that browses a customer's
  phone number for no stated reason is a different product with a different
  privacy promise, and the moment a tenant asks *"can you see my customers?"*
  the honest answer should be *"only when you ask me to export them."*
  **The aggregate is his; the individual customer is theirs.** Every Q1–Q7
  figure above is deliberately a count, a total or a date, never a person.

---

## 6. Layout: what it should look like

Not a redesign, a shape:

1. **The strip** — Q7, six or seven figures, always visible.
2. **Needs attention** — Q3's list, absent when empty (§1a's rule applies here
   too: an empty section is not drawn).
3. **The business list** — as today, plus a second line per row carrying
   *last booking · this month's revenue · subscription state*. Three facts
   turn a directory into a dashboard.
4. **One business open** — four blocks in the order he asks the questions:
   **money**, **use**, **site**, **account controls last**. Controls are last
   because he opens a business to *look* far more often than to *act*.

---

## 7. The one thing to decide before any of it is built

**How much of a detailer's business is his to look at?**

Everything in §4 is technically available and most of it is unarguable — he
hosts their site and bills them, so their subscription and their page's health
are plainly his business. **Their revenue, their expenses and their customers'
behaviour are less obviously his.**

The line this document assumes: **he sees what he needs to keep them working
and to know they are getting value — counts, totals, dates and health.** He
does not browse their customers.

If he wants the other side of that line, it should be a stated part of what a
detailer signs up to, not a thing the back office quietly does.
