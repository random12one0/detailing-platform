# Moving a job never re-prices it — the shape of the decision

**Investigation only, 2026-09-21. Nothing was built, nothing was changed, no
roadmap item and no migration.** Andrew has to decide whether moving a booking
should change its price, because charging a customer more for moving to a
Saturday is a decision about his own customers. This is so that whoever builds
it afterwards has no thinking left to do.

---

## 1. Where it happens and what it does with price today

**Two paths can move a booking**, and they behave identically on price:

- **The customer moves it** — the reschedule endpoint.
- **The detailer moves it from the dashboard** — the update endpoint.

**Neither one recalculates anything.** Both read the *stored* numbers off the
booking row — subtotal, total, and the saved list of price adjustments — and
use them only to fill in the email. The new date is written; every number is
carried forward untouched.

So a booking made on a Tuesday for a Tuesday, moved to a Saturday, keeps its
Tuesday price. The detailer's own weekend surcharge does not apply, and
nothing anywhere notices.

**And nothing tells anybody.** The detailer's move screen says nothing about
price. The customer's "your booking has been moved" email says nothing about
money — checked, it contains no price line at all. **There is no message to
change and no silence to break: the subject simply never comes up.**

## 2. Can the booking page's pricing be called from there?

**Yes, and more easily than expected.** The pricing engine is a shared module
with one entry point that takes a plain bundle of inputs. It does not care who
calls it.

**Every input needed is already recoverable from the booking**, which was the
thing worth checking:

| What the quote needs | Where it already is |
|---|---|
| The services | A join table, and **both move paths already read it today** |
| The add-ons | A join table |
| Extra vehicles | A join table |
| Vehicle size | On the booking |
| The travel charge and chosen zone | On the booking |
| Any plan it is against | On the booking |
| The promo code used and what it took off | On the booking |

**Both move paths already import from the pricing module and already load the
services.** So this is not a case of an endpoint that lacks what it needs.

### But there is one real trap, and it is not a missing input

**Re-pricing prices against TODAY, not against the day the booking was made.**
Four things would come from the present rather than from the booking:

1. **The detailer's current service prices.** If he raised them last week, a
   move would pick up the rise.
2. **Any site-wide sale running right now** — not the one running when they
   booked.
3. **His current rounding setting.**
4. **Lead time**, and this is the sharpest one. A "short notice" surcharge is
   measured from *now*. A booking made three weeks ago and moved to tomorrow
   would become short notice — even though the customer booked a month out.

**So a re-price can produce a difference that has nothing to do with the
move.** Any version of this has to decide whether it is re-pricing *the new
date* or re-pricing *the whole booking as if it were made today*. Those give
different answers and only the first is what anyone means.

## 3. When the new price is HIGHER

**The product cannot currently charge more without asking, and it should not
start.**

There is an existing consent path, and it is worth being precise about what it
is: a booking can sit in a **pending** state until the customer accepts it,
and accepting turns it into a confirmed booking. That is how a quote works
today.

**It is the right idea and the wrong mechanism to reuse as-is.** Two reasons:

- It is a state of the **whole booking**, not of a price change. Pushing an
  already-confirmed booking back to pending to ask about a surcharge would
  mean it stops being a confirmed booking — which affects whether the slot is
  held, and sends the messages that go with those changes.
- It answers "do you want this booking at all?", not "do you accept $30 more
  for the new day?" A customer pressing accept would not obviously be agreeing
  to the money.

**So the honest reading is that a higher price needs something new** — a small
thing, but new: a price change the customer is shown and agrees to, separate
from the booking's own status. Roughly: the move is recorded, the new price is
proposed, and the old price stands until they say yes.

**There is also a third option that needs no consent machinery at all:** show
the detailer the difference and let *him* decide, one job at a time. That
keeps the whole question out of the customer's path and out of the product's
hands.

## 4. When the new price is LOWER

**This is the half that is easy to forget, and charging less silently is also
a decision.** Moving off a Saturday would remove a surcharge.

Three things follow, none of them automatic:

- **If the customer has already paid**, a lower price means a refund is owed,
  and nothing in the move path touches money that has already been taken.
- **If they have not paid**, the total simply drops — but nobody is told,
  because no message mentions money.
- **A detailer may not want it.** He may reasonably hold the price he quoted.

**A lower price is not obviously the customer's gain to take automatically**,
and a build that treats "re-price" as one symmetrical feature will end up
issuing refunds nobody authorised.

## 5. What nobody is told today

Nothing, in either direction. No screen, no email, and no note on the job says
that a move changed the price or that it did not. **If re-pricing is ever
switched on, the message that says so is part of the work, not a follow-up** —
a price that changes silently is worse than one that does not change.

---

## What a builder would still need decided

Four answers, and none of them is technical:

1. **Re-price the new date only, or re-price as if booked today?** Only the
   first is what "moving it changed the price" means to a person.
2. **Higher price: ask the customer, or ask the detailer?** Asking the
   detailer needs no new consent path. Asking the customer does.
3. **Lower price: drop it, hold it, or show the detailer?** And if it drops
   after payment, who authorises the refund?
4. **Does a move count as short notice?** Measured from now, a move onto
   tomorrow is short notice even for a booking made a month ago.

**Nothing here is recommended.** The one thing worth saying flatly is that
**this is not a bug being left unfixed** — the current behaviour, carrying the
agreed price forward untouched, is the only one of the options that can never
charge somebody something they did not agree to.
