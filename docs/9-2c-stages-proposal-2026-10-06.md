# ROADMAP 9.2(c), the stages redesign: a ruling is needed before anyone builds

Written 2026-10-06 by DP Cowork (Lane A). Read-only: the code was read at HEAD
`5539078`, no browser was opened, nothing was changed. **It asks Andrew for one
word: 1, 2, or neither.**

## What is being asked

ROADMAP 9.2(c) says the back office's "Where people are stuck" card should show
each detailer **once**, at their **furthest stage** (Created, Configured,
Bookable, First booking, Active), with warnings beside it and one main blocking
reason. Nobody has started it. 9.2's parts (a) and (b) are done and pressed.

## What the screen does today, in plain words

The card on the Growth tab asks five separate questions of every real detailer:
have they got through setup, can their page take a booking, have they ever taken
one, have they gone quiet, have they got a website. Each question is one line:
a count, the names, and one sentence of advice. A detailer can be on two lines.
**That is on purpose.** The code explains why in its own words: a detailer can be
booking steadily with setup half finished, and a single-file funnel would file
him under "stuck at setup" and stop counting him, a false alarm about a working
business. The screen also says so to the reader, in a sentence under the card.

A second place already answers "who do I ring": the Today tab's list, one row
per detailer, worst first, with their reasons in a few words.

## What is actually wrong today

Three faults, each checked in the code. None of them is "a name can appear twice".

1. **The "cannot take a booking" line gives a menu, not the answer.** Its advice
   says *"Nothing to sell, no open days, or the account is suspended."* The
   program already works out which of those is true for each account
   (`bookability()` returns the reasons) and the line throws that away. Andrew
   has to open every name to learn which one it is.
2. **The "not got through setup" line claims something it never worked out.** Its
   advice ends *"every one of these signed up and then stopped."* Nothing checks
   when they signed up. Somebody who joined an hour ago is on this line with that
   sentence. Each row already carries its signup date, so this is computable.
   It is the same kind of fault as the "page works" sentence 9.2(b) removed.
3. **Growth and Today disagree about a suspended account.** Today's list
   deliberately leaves suspended accounts out of "never booked" and "gone quiet"
   (its comment: reporting that is the list telling Andrew about his own
   decision). Growth's lines do not, so a paused account would appear on both
   "never taken a booking" and "not booked in 21 days". **This cannot show today**:
   at the last read on 2026-09-21 no business was paused, and I have not re-read
   the database.

## Why stages, as written, does not fix any of those

- **"Furthest stage reached" needs history the product does not keep.** The
  Growth tab's own "Not here yet" card says there is no timestamp per setup step.
  Only the **current** state can be read, so a "furthest" stage would really be a
  "current" stage.
- **A current stage needs a tie-break, and the tie-break is the funnel problem.**
  A detailer who is booking steadily but has not finished setup has to go
  somewhere. Put them at the setup stage and it is the false alarm the screen was
  built to avoid. Put them at Active and the setup gap disappears from view.
- **There is one real detailer.** The code's own note says so on the chart it
  declined to build: with one real account every trend is noise. A stage view of
  one account is one name under one heading.
- **It would be a third view of the same facts.** Today's list already shows one
  row per detailer.

## Two directions

**Direction 1. Keep the five questions and fix the three faults inside them.**
On screen: the "cannot take a booking" line shows each name with its own reason
(*"Counter Signup Test Detail, no active services"*), and the menu sentence goes.
The setup line shows each name with how long ago they signed up, and the
"every one of these signed up and then stopped" clause goes. Suspended accounts
come off the never-booked and quiet lines (as on Today) and show once, on the
"cannot take a booking" line, as suspended.
*Cost:* one file (`app/src/admin/AdminPage.jsx`), no server change, no new data,
three copy changes (admin stays English, so no Spanish keys) and new checks in
`tests/admin-insight.test.mjs`. Lines get longer, so it needs a look at phone
width. The card keeps the shape Andrew has already reviewed.

**Direction 2. Build the stages as 9.2(c) describes.**
On screen: five groups with a count each, every detailer under exactly one, a
main blocking reason, and "gone quiet" and "no website" turned into small flags on
the name. The sentence about a name appearing twice goes, because it can no
longer happen.
*Cost:* the whole card is rewritten, plus a written precedence rule Andrew has to
rule on (the booking-steadily case above), plus a decision on where a suspended
account sits. It changes how the screen reads for a person who has already
reviewed it. It shows only the current stage, never the furthest, until a
timestamp per step exists. With one real detailer it shows one name.

## Recommendation

**Direction 1,** and close 9.2(c) as *not built, by ruling*: the named faults are
the three above, they are small and fixable inside the screen that exists, and
stages as written would trade a false alarm for a hidden gap. Revisit stages when
there are several real detailers and a timestamp per setup step, which is what the
"Not here yet" card already asks for. If Andrew says 1, it is a small Lane A slice,
proved by checks that fail when each line goes back to a constant sentence, and a
look at the screen at 1440, 768 and 392 once the browser is free.
