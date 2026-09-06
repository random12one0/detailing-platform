# The final pass — roadmap 7.3

Walked 2026-09-06 as a **brand-new business** and as **staff**, at 392 and
1440, by `scripts/final-pass.mjs`. It builds its own throwaway tenant on the
platform project (never the owner's live business), signs in as both people,
and deletes it again.

**Why a new business rather than the demo.** Every other browser script in this
repo drives `demo-detail`: 31 bookings, 13 customers, six services, four plans
and a subscription. **The state a real detailer meets on their first morning is
the exact opposite**, and a screen that is handsome with data and blank without
it is a screen nobody has seen the way its first user will. CLAUDE.md already
says this about the walkthrough; nothing had ever done it for the whole app.

**Ranking, as the roadmap asks:** *blocks launch* means a detailer would be
stuck or a customer would lose something; *embarrassing* means it works and
makes us look unfinished; *cosmetic* means only we would notice.

---

## Blocks launch

*(The one item here was fixed the same day; it is kept, struck, because a pass
that quietly deletes what it found cannot be checked afterwards.)*

### 1. ~~There is no way to reset a password, or to change one~~ FIXED the same day

**Built 2026-09-06, hours after this pass ranked it** — *I forgot my password*
on the sign-in screen, `/reset` where the emailed link lands, and *Your
password* behind the gear. Exercised against a real recovery link: saved,
signed in, the new password proved against the auth API, and the same link then
refused as expired. `tests/password-reset.test.mjs`, 18 checks, four baselined.
**The finding is kept because the reasoning is the useful part:**

Confirmed by reading the sign-in screen: no *forgot your password* link, and
nothing anywhere in `app/src` calls `resetPasswordForEmail` or `updateUser`.
**A detailer who forgets their password cannot get back in**, and the only
remedy is the platform owner editing the auth table by hand.

It is already written up as **item N** in the roadmap's unscheduled list, where
it is unranked. This pass ranks it: **it is the one thing here that stops a
real customer using the product**, and it will happen to the first detailer who
signs up on a Tuesday and comes back in a fortnight.

Supabase does the sending; what is missing is a link on the sign-in screen, a
`/reset` route, and one row behind the gear for changing it while signed in.

---

## Embarrassing

*(All three were fixed the same day. They are kept, struck, for the
same reason as the one above.)*

### 2. ~~One tap during first run ends both the setup form and the tour, for good~~ FIXED

**Fixed 2026-09-06 in `SetupForm.jsx`, and not where it looked.** `setup.seen`
is written when the form CLOSES now rather than when it mounts — which is what
the mount-write was reaching for anyway: a form somebody FINISHED must not
reopen tomorrow, and one they walked away from is not finished. Walked
end to end: first sign-in shows the form, tapping a tab leaves it with `seen`
still false, **the next sign-in has it waiting again**, walking all seven steps
hands over to the tour and sets `seen`, and the sign-in after that asks
nothing. Four checks in `tests/setup-progress.test.mjs` § 4, baselined by
putting the mount-write back.
**The version I tried first was worse and the sweep caught it:** letting an
owner fall through to the tour whenever this device had not seen it fixed the
finding and gave the tour to every established owner on every new browser —
which broke the width sweep at its first width, because that is a fresh browser
each time. **The narrower fix touches nobody who has already finished setting
up.** The finding as written:

The sequence a new owner is designed to get is: the seven-step form, then the
guided tour. Confirmed working — walking every step lands on **"1 of 6"** of
the tour.

**But the form is dismissed by navigating away from it.** Tapping any rail
button during first run closes it and writes `business_settings.setup.seen`,
and because an owner's tour only follows a form that *auto-opened*, the tour
never arrives — and never will, because `seen` is now true and the branch that
decides this runs once per sign-in.

Nothing is broken and both are reachable afterwards: *Finish setting up* on
Business, and *Show me around* in the gear. **But the first-run experience an
entire roadmap stage was spent on can be lost by one curious tap**, silently,
in the first ten seconds.

*What I would do:* if the form is closed by navigation rather than finished,
leave `seen` alone. The Business row already nags; the tour then still arrives
next time.

### 3. ~~An empty dashboard leaves most of a laptop screen blank~~ FIXED

**Fixed 2026-09-06, and the first thing the fix did was prove the finding was
written from a screenshot rather than a number.** `final-pass.mjs` now
measures how far down the viewport anything is drawn, at desk widths only,
and prints THIN below 45%. Measured on a brand-new business at 1440x900:

| | before | after |
|---|---|---|
| **Today** | THIN, 256px of 900 (28%) | 685px (76%) |
| **Clients** | THIN, 300px of 900 (33%) | 800px (89%) |
| **Money** | THIN, 357px of 900 (40%) | **unchanged, deliberately** |
| Calendar | 794px (88%) | 794px (88%) |
| Business | 1258px (140%) | 1258px (140%) |

**THE FINDING NAMED THE WRONG SCREENS.** It said Clients, and *"Money and
Calendar are the same shape"*. Calendar is **not** — it fills 88% of the
viewport, because a month grid is drawn whether or not anything is on it.
**Today was thin and the finding did not mention it at all**, at 28%, the
worst of the five. Three sentences of looking, three screens named, two of
them wrong in one direction or the other.

**MONEY IS LEFT ALONE AND THAT IS §1a, NOT AN OVERSIGHT.** An *empty whole
screen* is "one sentence and one way forward"; Money is not one. It draws its
period control, its figures and its export with zeros in them, which is the
**One** rule — *"the screen looks like the screen, with one row on it. Never
a special layout for one."* Centring a screen that has a CONTROL at the top
would move that control into the middle of the page on the day a detailer has
no money yet and put it back the day they do. A screen that rearranges itself
as data arrives is a worse fault than a short one.

**What the fix is:** one class, `.emptyscreen`, worn beside the `.tight` those
blocks already use. It sets nothing below 1024px and it never sets `display`;
at a desk it gives the block `min-height: 58vh` and centres it in that. **Only
the vertical.** The block stays left-aligned on the same column as every other
screen — centring the text would be a different-looking product rather than a
fuller screen — and the phone is untouched, because it was measured as reading
fine and the reason is not incidental: the sentence belongs at the top where
the thumb is.

**And Clients gained the half of §1a it never had.** *"No customers yet — they
appear on their own when bookings come in."* is one sentence and NO way
forward, on a screen whose whole question is *where are my customers*. It now
asks the same question Today asks — is there anything to sell — and gives the
same two answers: **Finish setting up** when there are no services, the
booking link when there are. While the count is still unknown it draws
neither, rather than flashing the wrong one on every arrival.

The finding as written:

Clients at 1440x900: everything on the page ends **260px down a 900px
viewport**, and the content column is 1,144px wide with nothing in it. Money
and Calendar are the same shape. On a phone it reads fine — the sentence is at
the top where the thumb is — and at a desk it reads as an app that has not
loaded.

The words themselves are good and were checked one at a time: *"No customers
yet — they appear on their own when bookings come in."*, *"$0.00 · No
comparison yet · Nothing recorded in September 2026."* **The problem is the
proportion, not the copy.**

---

### 3b. THE PASS ITSELF WAS BROKEN AND HAD BEEN SINCE THE DAY THE TAB GUIDES SHIPPED

**Found 2026-09-06 while trying to measure finding 3, which is the only reason
it was found at all.** Roadmap 2.24 put a guided overlay on four of the five
tabs, arriving the first time a browser opens each one. `final-pass.mjs` walks
a business that is minutes old, so it meets every one of them — and
`.tourblock` deliberately swallows pointer events. The first tab press after
the shell tour died with *"`<div class="tourblock">` intercepts pointer
events"*, and the whole pass ended at Clients.

**`sweep-widths.mjs` was fixed the day the guides shipped and this script was
not re-run.** `docs/tour-steps-2.24.md` had already written the rule down —
*"each new guide is added to `sweep-widths.mjs` in the change that builds
it"* — and named only that one script, so that is the one that got fixed. The
rule is about every script that walks the product.

**The two scripts need OPPOSITE fixes, which is why one cannot be copied to
the other.** The sweep seeds the guides as already seen, because it is
measuring fifty layouts for an account that has used the product before. This
script must not: **a guide arriving unasked on four of five tabs is exactly
what a final pass exists to see.** Each one is now photographed, its caption
noted, and then skipped — the path a detailer in a hurry takes — and the
screen is measured only after it is gone, or every number above would have
been a number about an overlay.

### 4. ~~Today offers the booking link before there is anything to book~~ FIXED

**Fixed 2026-09-06.** With no active services Today says *"Nobody can book yet
— your page has no services on it"* and offers **Finish setting up · Your
services come first**, which opens the form; the link comes back by itself the
moment there is one service. **The link is not shown with a warning beside
it** — a caveat under a Copy button is a caveat nobody reads. It asks ONE
question (is there a service) rather than repeating Business's seven-step
arithmetic, which would be six queries for a sentence on the screen a detailer
opens every morning. Verified in a browser in both states, no console errors,
and the first subtitle I wrote was **truncated at 392** and had to get shorter.
The finding as written:

A brand-new Today is the heading, *"Morning · nothing booked"*, and the booking
link with **Copy**, **Open** and **Generate QR code** — with nothing saying the
page behind it has no services on it yet.

**The booking page itself is honest** — *"Final Pass Detailing hasn't listed
any services online yet"*, no crash, no console errors, measured at 392 and
1440 — so nobody is misled for long. But the first thing the product invites a
detailer to do is share a link that cannot take a booking, and the setup
prompt that would stop them is one tab away on Business.

*What I would do:* the same *Finish setting up* row Business carries, on Today,
while setup is unfinished. It is the screen they open every morning.

---

## Cosmetic

### 5. `Business` says "2 of 7 done" before anything has been done

The two are the weekday hours every new business is given (`newBusiness.ts`,
Mon–Fri 09:00–17:00) and the contact email that came in with the invite. Both
are true — the progress is derived from the database exactly as it should be —
but *2 of 7* on a business created ten seconds ago reads like a head start
nobody earned.

### 6. A doc figure has drifted: the staff tour is 3 steps, not 4

CLAUDE.md says *"7 for an owner with jobs, 6 on an empty one, 4 for staff."*
Measured here: **6 for an empty owner (correct) and 3 for a staff member with
one permission tick.** The tour counts what that dashboard actually has, so 4
was measured against a differently-permissioned staff member. Not a defect —
the count is doing its job — but the sentence in CLAUDE.md is a figure, and
figures in that file have gone stale five times before.

---

## What was checked and was right

- **The rails.** Owner: Today, Calendar, Money, Clients, Business. Staff:
  Today, Calendar, Clients. Exactly `TAB_NEEDS`.
- **The gear.** Owner: Notifications, Message templates, Team, Your
  subscription, This device, Show me around. Staff: Message templates, This
  device, Show me around — and *Message templates* is deliberately open to
  staff (they send those texts from a job), which is written into
  `GearMenu.jsx`'s own header rather than being an accident. **Both lists were
  measured BEFORE finding 1 was fixed; *Your password* joined the gear for
  both people a few hours later.**
- **No console errors anywhere**, at either width, for either person.
- **The empty booking page** of a business with no services: an honest
  sentence, no crash.
- **The setup form runs all seven steps** and hands over to the tour.

---

## How to run it again

```bash
node scripts/final-pass.mjs           # build the fixture, walk it, delete it
node scripts/final-pass.mjs --keep    # leave it behind, with both passwords
```

It prints one line per screen — the rail it found, how much text each screen
carries and its first line — and writes a screenshot per screen to
`shots-final/`. **The lines are the check and the screenshots are the point:**
every finding above except the password one was found by looking, and three of
them are invisible to every automated check in this repo, because they are
about proportion, sequence and what a screen does not say.
