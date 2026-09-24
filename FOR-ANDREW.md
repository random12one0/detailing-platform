# For Andrew — the things only you can do

**This is your list. Nothing on it can be done by a session.** It is accounts to
open, money to spend, names to decide, and keys to paste. Everything else in
this repo is somebody else's job.

**How it works.** When a session hits something it cannot do, it adds a row here
and *keeps going* — it does not stop and wait. So this file grows on its own,
and checking it is how you unblock work that is already built and waiting.

**Two kinds of row.** A **DO** is an action. A **DECIDE** is a question with a
recommendation attached — answer it in one line and a session picks it up.

**Nothing on this list is on fire.** There are no paying customers and nothing
was published overnight. The groups below are in the order they are worth your
attention, not the order they arrived in.

**2026-09-21 — twelve rows moved to Done in one sitting.** You answered most of
the Waiting pile out loud, applied the database change yourself, and one row
turned out to be flatly wrong. Your answers are in **Done** in your own words
rather than summarised, so a session reads what you actually said. **What is
left above the line is genuinely still open**, and it is short now.

**How a row is written, so the next one looks like these.** One thing you can
act on in thirty seconds or decide in ten, in plain words, with no internal
names and no background you do not need. A **DECIDE** carries a recommendation
unless the answer is genuinely not ours to recommend, and says so when it is
not. **A row goes in the group that is true of it** — *Urgent* only if
something is wrong now, *Recorded* if nothing is needed from you yet — and the
group is the honest answer to "what happens if he does not read this today?"

**How a row is REMOVED, which is newer and cost more to learn.** A row whose
premise Andrew has since settled is deleted outright rather than reworded —
but **check the size of what you are about to delete before you delete it.**
Cutting from a row's first line to the next `- [ ]` swallowed a section
heading and everything under it on 2026-09-21: **182 lines instead of 51**,
taking the survey, a correction and three settled decisions with it. Nothing
was committed and it was restored from `HEAD`. **A deletion that overruns
looks exactly like one that worked, because both leave a file that still
parses** — so the only thing that catches it is expecting a number first. A
row here is eight to forty lines; refuse anything bigger and look again.

**Dates are only written on rows that have been waiting.** A row added today
carries no date; one still sitting here next week says **"waiting since 20
September"**, so age is visible at a glance instead of every row claiming the
same birthday. **Nothing needed a date today** — every row below was either
written or rewritten this morning.

Updated 2026-09-21.

---

## Start here — the one decision that unblocks the most

- [ ] **DECIDE · What to put live, and in what order.**

  **Read this first because it is holding up more than anything else on the
  list.** Your site's back end is 39 small programs, and each one has to be
  *published* before a change to it does anything. **22 of the 39 are running
  something older than what we have written**, some by a week, because nothing
  ever forced the publishing step to happen and nobody noticed.

  **What this one decision unblocks:** most of the communication work, most of
  the backup and monitoring work, the first two dashboard items, and half of
  the tenant-security item. You cannot see that from any single row, which is
  why it is at the top.

  **Publishing is yours, the same as pushing code is yours.** Nothing has gone
  live and nothing will until you say so.

  **UPDATE 2026-09-21 — the ordering rule below is now SATISFIED.** You ran
  the database change yourself on the night of the 20th, so the column exists
  and `create-booking` is safe to publish whenever it is swept up. The rule is
  kept here rather than deleted, because it is how the trap is understood if
  anybody ever wonders why this paragraph existed.

  **The rule, added 2026-09-20, strict rather than a preference: if you ever
  publish `create-booking`, the database change has to be applied FIRST, not
  after, not the same day, first.** `create-booking` is
  the program that saves every new booking. Tonight's change made it always
  try to write to a column that does not exist in your database yet. Apply
  the database change and nothing happens — bookings save exactly as they do
  today, with one more fact recorded. Publish `create-booking` while that
  column is still missing and **every single new booking fails**, not just the
  address-flag part of it — nobody can book at all until you notice and fix
  it. **That window is now closed.** It is written down because the shape of
  it — a program that always writes a column, published before the column
  exists — will happen again with some other column some other night, and the
  next one will not have a paragraph waiting for it.

  **The order we recommend:**

  1. **Already live, nothing to approve.** When a detailer cancelled or moved a
     job from their dashboard, the customer was never told anything at all —
     they would have waited in for somebody who was not coming. Fixed and
     published before the freeze. Listed so you know it is done.
  2. **The Spanish emails.** Ten English words sitting in the middle of Spanish
     emails, including the money column of every invoice and receipt. *Risk:
     low — labels only, nothing about what anyone is charged changes.*
  3. **The payment webhook.** The running copy is older than the change that
     made its security check testable, so the test we trust has been checking
     code that is not the code running. Nothing is known to be broken; we just
     cannot vouch for it. *This one touches money — do it when you are awake.*
  4. **Two programs that would probably fail if used.** The "card declined"
     email and the "report a problem" form are running from before parts they
     depend on existed. If either is triggered, what happens is unpredictable.
  5. **Everything else** — the remaining 17, small changes, none
     customer-visible on their own. Cheapest done in one go.

  **Recommendation: 2, 4 and 5 together whenever suits you; 3 on its own when
  you have a few minutes to watch it.**

  **If you do nothing:** the same as today. Nothing gets worse on its own. 3
  and 4 are risks that are already live, not new ones.

---

## What you set up the night of 2026-09-21 — the record

**Nothing here needs building yet. This is so none of it lives only in your
memory.** You spent the evening signing up for the things the product has been
waiting on. Six of them changed, and not one was written down anywhere.

### 1 · Photo storage is solved — Cloudflare R2

**Ten gigabytes free instead of the one you had**, and downloads cost nothing,
which is the part that makes other storage expensive. Past the free tier it is
about a penny and a half per gigabyte a month.

**Three buckets already exist and are named to match the code exactly** —
`job-photos`, `business-media`, `expense-receipts`.

- Account id `3ebc9f9dfd8b21c849e43fcd9e22887c`
- Endpoint `https://3ebc9f9dfd8b21c849e43fcd9e22887c.r2.cloudflarestorage.com`
- **Three keys are saved** in Supabase's edge-function secrets, named
  `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`. Verified in
  the list, timestamped that day. *(Where they live is written here. What they
  are is not, and must never be.)*

> **⚠ READ THIS BEFORE ANY PHOTO MOVES, BECAUSE IT CHANGES THE SIZE OF THE
> JOB.** Right now **the database itself refuses to hand one detailer another
> detailer's photo.** That is not a rule written in our code that could have a
> gap in it — the database enforces it, and it was proved four separate ways.
>
> **R2 is a dumb bucket. It has no idea what a business is.** The moment
> photos live there, that protection is gone unless it is rebuilt in our own
> code first.
>
> **So the switch is not "change five bucket names". It is five bucket names
> plus rebuilding the guard that stops one customer seeing another's
> photographs — and the rebuilt one has to be right before a single real
> photo goes in.**
>
> It is still cheap today for one reason only: **there are zero photos
> stored.** That is the whole of the discount, and it expires at the first
> upload.

**What it means for how many photos a detailer gets: about 47 each today,
about 340 each after the move.** Ten times more, and enough for a solo
detailer doing before-and-afters without thinking about it.

**One thing deliberately NOT done, so nobody does it kindly:** the allowance
number has **not** been raised yet. It has to describe storage that actually
exists, and right now not one byte goes to Cloudflare. **It goes up on the
same day uploads actually move, not before** — otherwise your screen promises
space the product cannot give.

**And the cost, so this never needs agonising over again:** past the free ten
gigabytes it is about a cent and a half per gigabyte a month. **A hundred
detailers at 200 MB each works out at roughly fifteen cents a month.** Being
more generous later is one number and costs almost nothing.

Also in `docs/recovery.md`, beside the three stores and what the nightly
backup does and does not carry — and the full working, including how the
limit would actually be enforced, is in `docs/the-photo-allowance.md`.

### 2 · Email is splitting in two — and it is blocked

**ZeptoMail for the seventeen transactional emails** — confirmations,
reminders, receipts — at **$2.50 per ten thousand, no monthly fee**. **Resend's
free tier kept for campaigns**, because ZeptoMail flatly bans marketing mail
and will cut you off for sending it.

**Splitting is better anyway, for a reason worth keeping:** a campaign that
gets flagged as spam cannot drag your booking confirmations down with it.

**It is stuck, and not at your end.** Zoho refuses to add
`detailingplatform.com` or `email.detailingplatform.com`, answering only
*"Domain could not be added. Please contact support@zeptomail.com"* —
while `andrewsdetail.com` added fine **on the same account**, so it is that
domain rather than the account or the plan. Support has been emailed.
**No API token exists until a domain verifies**, so nothing can be built
against it. The secret name reserved for it is `ZEPTOMAIL_TOKEN`.

**And this is why it is urgent rather than tidy: you have already gone over
Resend's free limit.** There are *"you have reached 100% of your daily"* and
*"200% of your daily"* warnings sitting in your business inbox from the 6th
and 7th of September.

### 3 · Texting is Telnyx, and the account is live

The supplier this repo had written down was right, and **nothing in the code
had assumed it**, so you were free either way.

**Sole Proprietor 10DLC registration needs no EIN and no Social Security
number** — it verifies with a one-time code to your mobile. **$4 once, $15 for
the campaign review, then $2 a month, for a thousand texts a day.**

The account went from Pretrial to Trial by connecting GitHub and is now
**paid**. A messaging profile called **DetailingPlatform** already exists.
**The brand registration form is filled in and waiting on you to agree the
$4.**

### 4 · Google — the application went in

**Case 9-7552000041929, opened that night, seven to ten business days.** Filed
from `andrewswashing@gmail.com` for *Andrew's Auto Detail & Car Wash*, against
project number `37262651400`.

**How to check without waiting for an email: the quota.** It reads **zero
requests per minute** now; **three hundred means approved.**

**One thing the research note got wrong, now corrected there.**
`docs/google-business-profile-research-2026-09-07.md` said everything was
blocked on you having a mailbox on `detailingplatform.com`. **You have one** —
`andrew@detailingplatform.com`, the address on your Telnyx account. **What is
genuinely still not done** is the second gate that note is right about: the
**OAuth consent screen verification** for the sensitive permission. Nobody has
started it.

### 5 · The website is "unrated", which is why some networks block it

Symantec confirmed `detailingplatform.com` is **unrated** in those words —
which is what gets a site blocked on school and office networks. **A
categorisation request went in that night** as *Business/Economy* plus
*Office/Business Applications*. **FortiGuard and Palo Alto are filled in but
stuck behind CAPTCHAs you have to clear yourself.**

### 6 · Which email address is on which service

**You asked for this because you have three addresses and keep losing track.**
Add to it as you go. **A row marked *unconfirmed* is a row nobody has
verified — leave it marked rather than guessing**, because one wrong row makes
the whole table untrustworthy.

| Service | Address on it | |
|---|---|---|
| Telnyx (texting) | `andrew@detailingplatform.com` | confirmed |
| Supabase (the database) | `andrewsauto@andrewsdetail.com` | confirmed |
| Cloudflare (photo storage) | `Random12one0@yahoo.com` | confirmed |
| Google Cloud project *detailing-platform* | `ramdom12one0@gmail.com` | confirmed |
| Google Business Profile *detailing platform* | `ramdom12one0@gmail.com` | confirmed |
| Google Business Profile *Andrew's Auto Detail & Car Wash* | `andrewswashing@gmail.com` | confirmed |
| The Google API application | `andrewswashing@gmail.com` | confirmed |
| Resend (email) | `andrewswashing@gmail.com` | confirmed |
| GitHub — account `ramdom12one0-sys` | `ramdom12one0@gmail.com` | confirmed |
| Netlify (the website host) | signs in through GitHub | confirmed |
| Stripe (payments) — notifications | `ramdom12one0@gmail.com` | confirmed |
| ZeptoMail — Zoho org *Detailing Platform* | signed in with Google | **which Google address: unconfirmed** |
| Symantec + FortiGuard submissions | `andrewswashing@gmail.com` | confirmed |

---

## State that changed outside the repo — 2026-09-21 night

**Nothing needed from you in this section except the last line.** It exists
because four facts about your product changed on the night of the 20th in a
chat window that no longer exists, and `docs/MANAGER-CLOSE-2026-09-21.md` had
to be written to recover them. These are tonight's, written down while somebody
still knows them.

- **A new column now exists on your live database.** On
  `kguqylyzgyzfktkfnhjb`, `business_settings.email_customer_maintenance_due`,
  added by the manager on the night of 2026-09-21, run by hand in the SQL
  editor. It defaults to **off**. It was checked afterwards rather than taken
  on the success message: your settings table now lists four email switches,
  three of them on by default and this one off. The written record is
  `supabase/migrations/20260921010000_the_maintenance_due_email_is_off_where_git_can_see_it.sql`.
  **Nothing changed for anyone when it ran** — it added a fact your database
  can hold, and nothing reads it yet.

- **Two repairs were applied to your database later the same night.** Two
  files that were written on 7 September had never actually been run against
  your database — nobody knew, and nothing anywhere would have told anybody.
  They were run on 2026-09-21 and then checked by reading the database back.
  **Neither touches any of your data:** both replace the same single
  read-only lookup that a customer's booking page asks for your business
  details. No table was altered, nothing was deleted, no booking was touched.
  **What it fixes:** the page can now see how many vehicles you allow on one
  booking. Until tonight it could not, **for any business at any setting** —
  so the "two cars on one visit" feature has never once worked for anybody,
  and the fault was invisible because nothing compares your database against
  what has been written for it. **That missing check is now its own job**, and
  it is the more important half of this row.

- **Your scheduled jobs were read the same night. Four of them, all running.**
  The one that sends reminders runs **every fifteen minutes** and last ran at
  **1:00 in the morning, Pacific, on 21 September**. That is the fact that made
  the next row urgent rather than tidy.

- [ ] **DO · Publish one program, and then the "your coating is due" email is
  actually off.**
  **This is not about the marketing-email rule any more — you overturned that
  on 21 September, and this row survives it unchanged.** It was never really
  about whether the message is allowed. It is about **who decides to send it.**

  The coating email is the one that sells: it tells a customer a service is due
  and asks them to book. **It used to go out on the back of the ordinary
  appointment-reminder setting**, so a detailer who wanted reminders was
  sending a sales email without ever choosing to. That is what is being fixed,
  and it would still be worth fixing if marketing email had never been
  questioned. What the law asks of a selling email is set out on the messaging
  page rather than repeated here.

  **It now has its own off switch, off by default, and the reminder setting can
  no longer turn it on.** That is built and the database part is applied.
  **The last step is yours: publish `send-owner-reminders`.** Until you do, the
  old version is still running and a customer can still receive it.

- [ ] **DO · Publish the quote program, and the weekend price stops being a
  surprise.**
  **The fault you found on 22 September is fixed in the code and no customer
  can see the fix yet.** You picked a Sunday, waited, and the page showed nine
  Sunday times over a total of **$65** with nothing anywhere saying Sunday
  costs **$30** more. The moment a time was tapped it jumped to **$95**. The
  thirty dollars was always honest — weekends cost you more and you set that
  rate yourself — but the customer was told about it one step too late, on the
  one screen that takes money.

  **What was wrong is that the price was worked out from the DAY and the hour,
  when your weekend rate does not care about the hour at all.** So the program
  knew the answer was $95 the instant somebody tapped Sunday, and kept showing
  $65 while they browsed. It now says so straight away, with the words
  "Weekend rate · +$30" next to a total that already reads $95.

  **Two things had to change and only one of them reaches people on its own.**
  The page is fixed and would go out with the next site build. **The pricing
  program has to be published by you**, and until it is, a real customer sees
  the old behaviour exactly as you described it.

  **What to publish: `calculate-booking`.** Four others share the same pricing
  file and will be swept along — `create-booking`, `preview-emails`,
  `reschedule-booking`, `update-booking`. That is expected. Three more
  (`available-slots`, `validate-promo-code`, `get-booking-receipt`) are already
  waiting from the night before, for the spam-limit work, and are unrelated.
  **Nothing has been published and nothing will be without you.**

  **How you will know it worked:** `node scripts/surcharge-visible.mjs` goes
  from 40 failures to none. It is red today on purpose and the roadmap says
  why.

---

## Urgent — two minutes when you next open your laptop

- [ ] **DO · Open your password manager and search it for the backup key. You
  said this morning that you do not know where it is and that it was never
  written down. It was written down — twice — and I can tell you exactly
  where it was meant to go.**

  **What this is.** Every night a copy of the whole database is made and
  locked with a key, so that if something is ever destroyed it can be brought
  back. The lock is deliberately one-way: the machine that makes the copy
  **cannot open it**, which is the right way round, because it means a
  stolen account still cannot read your customers' names and addresses.
  **The other half of that is that only you can open them.**

  **What is written down.** Two files from the week the backups were built —
  the setup write-up of 7 September and the operations page of 8 September —
  both say, in the same words, that the key went into **your password
  manager, and deliberately nowhere else**. A third file said it was "not
  recorded anywhere", which is wrong and is almost certainly why nobody ever
  found it; that has been corrected today.

  **What I checked, so you do not have to.** I searched your machine this
  morning: both user folders, your desktop, documents, downloads, the hidden
  config folders, OneDrive, and the whole project drive. **The key is not on
  this computer**, and that is correct rather than alarming — it is not
  supposed to be. The backup tool itself is not installed here either.

  **What only you can do:** open your password manager and search it for
  "backup", "age", or "detailing backup". **Thirty seconds.**

  - **If it is there** — nothing is wrong. Tell a session it exists (not what
    it says, just that it is there) and the last real gap in the backup story
    closes this week.
  - **If it is not there** — then **ten nightly backups** exist as files that
    **nobody can ever open, including you**, and we need to talk about it
    before anything else is done. *(Ten is the number actually counted, one
    release at a time, on 20 September, plus one for each night since if the
    schedule has held. The night of 15 September failed and can never be
    recovered, for a reason that was GitHub's and not ours. "Fifteen" was the
    number of nightly **runs**, fourteen of which worked — a different thing,
    and mine to correct.)* **Do not let anyone make a new key without
    deciding that with you first** — replacing it is a decision with money
    and risk in it, and it is yours.

  **Nobody will read that key out, paste it, or copy it anywhere**, including
  into this file. If you ever need it somewhere, you move it yourself.


- [ ] **DO · Decide what happens to the demo logins before your first real
  detailer signs up. You chose to make them guessable. Nobody told you they
  are also published.**

  **This is not an emergency tonight and this row does not want you out of
  bed.** There is no real customer, no real money and no real data on that
  project — every account on it is a fixture. **It stops being true the day
  the first real detailer signs up**, and that is the only deadline in this
  row.

  **WHAT IS EXPOSED.** Two back-office logins. One is the demo detailer's,
  which you deliberately made a platform administrator on 13 September so the
  back office could be checked. The other belongs to no business at all and is
  already written up as an untracked second master login.

  **WHERE IT IS EXPOSED, and this is the part that is new.** Your code
  repository, `github.com/random12one0/detailing-platform`, is **public** —
  anyone on the internet can read every file in it without an account. The
  demo detailer's email and password sit in plain text in **eight** of those
  files. The second login's password is written into a note **inside your own
  database**. Both accounts are real and working: one of them signed in
  **today**.

  **WHY THAT IS A DIFFERENT THING FROM WHAT YOU AGREED TO.** You decided a
  guessable password was fine while nothing real is on the platform, and
  **that decision is still yours and still reasonable.** But a guessable
  password behind a door nobody can find is a choice. The same password
  printed in eight files of a public repository is a different object — one
  needs somebody to try, the other needs somebody to read. **The note in your
  database says it must be changed "before launch", and it was written by
  somebody who assumed launch was the deadline. Publication moved it.**

  **WHAT IT UNLOCKS.** The back office. Somebody signing in could suspend a
  business, press *"Download everything they own"*, open *"Look at their
  dashboard"*, change prices, and write rows into the database that
  **detailingplatform.com itself reads** — so the live site can be altered by
  a stranger.

  **WHAT IT DOES NOT UNLOCK, so the size of this is clear.** Not your real
  business. `andrewsdetail.com` is a separate Supabase project and nothing
  here can reach it. Not your money — no card, bank or Stripe key is in that
  repository. Not any real person's data, because there is none. Not your
  GitHub, Netlify or Supabase accounts themselves.

  **WHAT HAS TO HAPPEN BEFORE THE FIRST REAL DETAILER SIGNS UP.** This is
  already a tracked job — **ROADMAP 12.4, "Split the demo account before the
  first real detailer signs up"** — and it is written as something to do
  eventually. **The publication fact is what makes 12.4 urgent rather than
  tidy.** It needs: the demo detailer split back into an ordinary demo
  account with no back-office access, a separate owner login with a real
  password, the second untracked admin removed, and `/admin` refusing anyone
  who is not on the list. Item 14.8 is the note about that second login.

  **Nobody here will touch either password — not change one, not read one
  out, not write one down.** That is yours alone. This row exists so the
  choice is made with the word "public" in front of you.

  **Where to look, so you are not taking this on trust:** the repository is
  `github.com/random12one0/detailing-platform` and its setting is
  Settings → General → Danger Zone. The note is on the `platform_admins`
  table in Supabase. **Neither password is written anywhere in this file, on
  purpose.**


- [ ] **DO · Ten test emails are sitting in your support inbox. They are ours.
  Delete them.**
  All with the subject **`Problem report · EDGEREPLAY-A-SECRET DETAIL`**, at
  about half past six this morning.

  **Nothing is wrong.** A check that calls every part of the back end was
  sending its mail to a throwaway address — except the "report a problem"
  feature, which sends to you no matter what the caller says. Nine calls, nine
  reports, and a tenth later when the fix's own test switch briefly undid it.

  **Nothing went to a customer** and no real person but you received anything.
  It cannot happen again. **Delete them and you are done** — this row exists so
  you never have to sit and work out whether something in your own inbox is
  real.

  **These ten are not the thirteen that were cleared out today.** Those
  thirteen were rows inside the practice database, left behind by a test, and
  a session has already deleted them. **These ten are real emails that really
  arrived in your inbox**, and nobody but you can remove them — which is the
  whole reason this row exists.

---

## Waiting on you — nothing breaks while these wait

- [ ] **DECIDE · On the smallest phones, the day squares in your booking
  calendar are a bit smaller than our own rule says a tappable thing should
  be. One line from you settles it. My recommendation: leave them alone.**

  **The picture is the fastest way in** — `docs/decisions/day-squares-at-320.png`
  shows the three choices side by side, drawn at the real size, and
  `docs/decisions/day-squares-at-320-real-page.png` is the actual screen.

  **What we found.** We have a rule that anything a finger presses should be
  at least as wide as a fingertip. On the narrowest phones we support, the
  little date squares on the "pick a day" step come out slightly under that.
  On every other phone size, and on tablets and computers, they are fine.

  **Why it cannot just be nudged.** Seven squares have to fit across the
  width of a phone. At full size, seven of them plus the space between them
  need **more room than the phone has** — about an inch more than the screen
  is wide. Closing up the space between them does not get there either. So
  there is no small adjustment that fixes this; the shape of the screen has
  to change, or it stays as it is.

  **Your three choices.**

  1. **Leave them.** They stay square and slightly small on the smallest
     phones. Nothing else changes.
  2. **Make them taller than they are wide.** They reach full size
     downwards, and stop being squares.
  3. **Drop the month grid on tiny phones** and show a simple list of the
     days you are open instead. Full-size rows, but it is a different screen.

  **My recommendation: number one, leave them.** You already made this exact
  call once — *"job buttons stay square on a phone"* — and this is the same
  question about a different button. Squares reading as squares is worth
  more here than the last few millimetres, and the days are still easy to
  hit on a real phone.

  **What happens either way.** Nothing breaks and nobody is blocked. The
  measuring tool that found this will keep reporting it in red until you
  answer, which is on purpose — a real gap should not be able to go quiet
  just because we decided to live with it. **Once you answer, it stops.**

  **One thing worth knowing, because it is how this went unnoticed.** There
  is a note in the code that already worked this out and says the squares are
  comfortably big enough. It is right — for a slightly larger phone. Nobody
  ever checked the smallest one. The reasoning was done once and then trusted
  everywhere.

- [ ] **DO · When you publish, one five-minute check has to actually be run —
  and it is the only thing left on the rate-limit work.**

  **What was built.** Eighteen of your back-end programs now refuse a caller
  who hammers them — someone hitting the same one hundreds of times in an
  hour gets turned away instead of running up your bill. That is written and
  checked.

  **What has NOT happened, and this is the row.** **Nobody has ever seen one
  of them actually refuse anybody.** The check that proves this work reads
  the code; it has never called a live one. **It cannot, because the versions
  running on your server are still the old ones without the limit in them** —
  testing those today would just prove the old code has no limit, which we
  already know.

  **So: after you publish, somebody runs a quick loop against three of them
  and confirms each gets turned away.** Five minutes. **Until that happens
  the work is proved on paper and not in the world, and those are different
  things.**

  **Why this is a row on your list rather than a note.** Two of the three
  roadmap items in this thread are already ticked, so it would be very easy
  for somebody later to read the whole thing as finished and never run the
  check. **Nothing is broken while this waits** — the limits either work or
  they are not live yet, and neither costs you anything today.

- [ ] **DECIDE · Your Spanish dashboard has 134 English strings on it, across
  32 screens. Nothing is broken. You decide whether that is worth a night.**

  **No recommendation on this one, and that is deliberate** — it is a
  judgement about who your customers are, and you are the only one who can
  make it.

  **What we found.** When a detailer switches your dashboard to Spanish, 134
  separate bits of text stay in English. Some are single words sitting inside
  a Spanish sentence — one screen read *"Visitas pendientes · 1 overdue"*.
  Some are whole paragraphs, like the note that appears when you pick your
  brand color.

  **Why nobody knew.** We have one tool whose only job is to find English text
  that should have been translated. **It skipped anything with a number in
  it.** A line like "1 overdue" is written in the code as *"[number] overdue"*,
  and the tool could not see that shape at all — so it kept reporting a clean-
  ish number while these sat on the screen. That tool is now fixed. **The
  count went from 90 to 134 the moment it could see properly**, and that jump
  is the tool getting better, not your product getting worse.

  **What this is, and what it is not.** Nothing crashes. Nothing is broken.
  **A detailer using it in English sees nothing wrong at all.** What it means
  is narrower: the Spanish your product offers is partial, and until now
  nobody could measure how partial.

  **134 is a floor, not a ceiling, and this is the part to hold on to.** The
  tool still cannot see a message that is written across several lines in the
  code. So there are more; we do not know how many. **If you decide to fix
  "all of them", you will finish and then find more** — which is why the
  number is given as a starting point rather than a total.

  **Most of the 134 are plain English text. A few are not, and those are the
  only part that needs you:**

  1. **About 23 are example business names** — "Prime Mobile Detailing",
     "Delgado Mobile Detailing" — used as samples in the website-brief screen.
     Those are names, not words. Nobody translates a name. **The decision is
     whether to teach the tool they are names**, so they stop being counted.
  2. **About 18 are column headings in the files you export** — "First seen",
     "Jobs", "Opted out", "Job date". **The decision is whether a spreadsheet
     you send to your accountant should change language with your dashboard**,
     or always stay in English because of who opens it.
  3. **Two are the app's own time abbreviations** — the "h" and "min" in
     something like "1 h 30 min". Those are **already handled properly in
     Spanish**; the tool is simply wrong about them. **The decision is only
     whether to quieten it**, so the number stops carrying two that are fine.
  4. **A handful sit in the photo screens**, which somebody else is working on
     tonight. **They are listed here so nobody counts them twice**, not
     because anything needs doing about them.

  **What we have not done:** we have not fixed any of the 134, and we have not
  opened this as a job. One string was fixed — the "1 overdue" one — because
  it was the one we found first.

- [ ] **READ · What we send, and what we don't — the messaging page you asked
  for. No recommendation in it on purpose; it is the material for a
  conversation, not a conclusion.**

  It is at `docs/what-we-send.md`. You asked what emails and texts the
  business sends, because the whole thing was thrown together in a rush and
  nobody has ever written it down. That page does it: every message that goes
  out today, what sets it off, who gets it, and whether it starts on or off;
  the moments where nothing is sent and probably should be; what the law asks
  for email and the much stricter rules for texting; and six questions that
  are yours to answer, each with the real options and what each one costs.

  **The one thing to know before you open it:** the product sends **no texts
  at all**. The text buttons open the messaging app on *your phone* with the
  message typed out, and you press send. So texts come from your number, and
  the business keeps no record that any of them happened. Most of the
  questions on that page hang off whether you want to change that.

  **Nothing on it is ranked or recommended** — you are doing the deciding, so
  a page that had already decided would be no use.

- [ ] **DECIDE · How much photo storage a detailer gets. Right now it is
  about forty-seven photos each, and the pricing page said "unlimited". I
  have taken that word off the page; the number is yours.**

  **What is true today, measured this morning rather than estimated.** The
  whole platform has **one gigabyte** of photo space — that is Supabase's
  free allowance, which is what you are on until Cloudflare is connected —
  and the product divides it by a hundred detailers. So each detailer gets
  **about ten megabytes**. I put six real car photographs through the
  product's own resizer and they came out at **229 kilobytes on average**, so
  ten megabytes is **about forty-seven photos**. After that, uploads stop.

  **CHANGED TONIGHT, AND IT CHANGES WHAT THE NUMBER COUNTS.** Since expenses
  can now hold a photo of the receipt, **that allowance is shared**: forty-seven
  is photos **and receipts together**, not forty-seven photos on top of the
  receipts. A detailer who photographs every receipt is spending his
  before-and-after budget on pieces of paper.

  **Sharing it was the right call and I would make it again.** The alternative
  was a second, separate allowance for receipts — and a second store that
  nothing counts is how a limit quietly stops being a limit: the meter would
  read comfortable while the storage filled. **One meter tells the truth.** It
  does mean the number below is smaller in practice than it looks, which is an
  argument about the number rather than about the design.

  **The resizing is already working, so that is not the fix.** Photos are
  shrunk to 1600 pixels on the long edge before they are sent, which took
  those six photographs from about 1.7 megabytes each down to 229 kilobytes —
  roughly a tenth. Nothing is being stored at camera size.

  **The recommendation, with the arithmetic.** A working detailer doing two
  hundred jobs a year at six to twelve photos a job stores **270 to 540
  megabytes a year**. So:

  | allowance each | how long it lasts | 100 detailers | rough cost |
  |---|---|---|---|
  | **10 MB** (today) | **two to four weeks** | 1 GB | free |
  | 100 MB | three to five months | 10 GB | free on Cloudflare |
  | **5 GB** (recommended) | **ten to nineteen years** | 500 GB | **about $7.50 a month** |

  **Five gigabytes each is the right answer and I have not set it**, because
  the space does not exist yet: it needs Cloudflare connected first, and
  writing the bigger number today would just move the failure from "upload
  refused" to "upload lost". **That is the one thing the product was
  deliberately built not to do.**

  **So there are two steps and only the first is yours right now:** connect
  Cloudflare for photo storage, then a session sets the allowance in one
  value. If you would rather a different number than five gigabytes, say it
  and it is a one-line change either way.


- [ ] **DECIDE · One of your five example sites opens with a picture taller
  than the screen. Do you want it changed? No recommendation from us on this
  one.**

  **Which one:** the Charlotte site, `/ex3` — *Ballantyne Mobile Detailing*,
  the two-page one with the three colours you can switch between.

  **What is actually happening.** The opening picture — the photograph, the
  headline and the button over it — is **1,111 pixels tall on a 900-pixel
  screen**. So about **a fifth of it sits below the bottom edge**, and
  somebody landing on that page has to scroll before they have seen the whole
  of the first thing.

  **Why it is being put to you now rather than earlier.** It was looked at on
  20 September and left alone, on the grounds that the picture was **exactly
  one screen tall** — which is a deliberate style, and a common one. **That
  figure was wrong.** Measured again last night it is a quarter of a screen
  taller than that, which is a different thing: not a full-screen opener, but
  one that does not quite fit. The reason it was left alone no longer holds,
  so the question comes back to you rather than staying closed on a mistake.

  **For comparison, measured the same way:** the Seattle site's opening
  picture is **774 pixels** on the same screen, so it fits with room to spare.

  **Nobody here is recommending either way, on purpose.** How tall an opening
  picture should be is taste, and yours is the only one that counts —
  everything we know about what you like comes from the sites you sent us, not
  from anything we would work out. **Nothing is broken either way**, and the
  page works perfectly at every size.

  **"Leave it" is a complete answer** and the row closes.

- [ ] **DECIDE · A recommendation about your publish order, and ten seconds is
  all it needs. The order is yours and I am not changing it.**

  **Your order stands as you set it:** Spanish email labels first, then
  card-declined and report-a-problem, then the remaining seventeen, then the
  payment one last and on its own. **Nothing below reorders anything.** This
  row exists so one fact is in front of you when you decide, rather than
  discovered afterwards.

  **The fact.** Two of those seventeen are **`create-booking`** and
  **`get-booking-receipt`**. Together they are the pair that records *how a
  customer's address was arrived at* — whether they picked it off the
  suggestion list or typed it by hand and it matched nothing. **That work is
  finished and sitting in the repository.** Until those two go out, every
  booking stores nothing at all for that question, and an address nobody
  checked looks exactly like one that was checked.

  **Why that matters more than it sounds.** Your detailer's job sheet prints
  the address and puts a **Navigate** button directly underneath it. So the
  screen a person reads before driving out presents an unchecked address with
  the same confidence as a checked one. **The first time anybody finds out is
  in a van outside the wrong house.**

  **AND THE HONEST OTHER HALF: nobody is outside a wrong house today.** You
  have no real detailers and no real customers — every account is a test one.
  **This is not urgent, it is cheap.** It costs nothing to move two names up a
  list you are going to work through anyway.

  **The comparison, both ways.**
  - **Move them up:** the wrong-address problem stops existing before your
    first real detailer ever books anybody. Cost: the review-map fix and the
    Spanish email labels go out slightly later.
  - **Leave them where they are:** the map fix and the Spanish labels go
    first, and the address flag waits its turn in the seventeen. Cost: if a
    real detailer signs up in between, they can be sent to an address nobody
    checked with nothing on screen saying so.

  - What is actually being weighed: **four dead links on a review page only
    you use**, against **a van full of equipment outside the wrong house.**

  **My recommendation: move those two up.** It is a recommendation and the
  order is yours — say "leave it" and it stays exactly as you wrote it, and
  nothing is worse off than it is tonight.

- [ ] **READ · One sentence came off your privacy page, and you can have it
  back the day we build the thing it promised.**

  **What it used to say.** The paragraph telling a customer how to get their
  own information back ended *"…and they can do both from their own
  dashboard"* — meaning their detailer could both **delete** them and give
  them a **copy** of their record.

  **Deleting is true.** That button is real and is on the Clients screen.
  **The copy was not.** There was no way for a detailer to hand one customer
  a copy of their own record, and that sentence was on the one page a
  stranger reads when they want their data back from a business they have no
  other way of checking.

  **So the clause was removed and nothing was put in its place.** The
  paragraph now stops at *"It is their list."* Everything left on it is true.

  **This is a correction, not a retreat — and it is reversible.** The moment
  a detailer can produce a copy for one customer, the sentence goes back
  exactly as it was. **Nothing reaches anybody until you publish**, as with
  the rest of that page.

- [ ] **READ · Your customers can now be exported, which three of your pages
  have been promising all along. One noun in that promise is still unkept.**

  **What is new.** There is a button on the Clients screen — **"Export my
  customers"** — that hands a detailer a spreadsheet of their whole list:
  name, phone, email, address, notes, when they first appeared, how many jobs
  they have had, what they have spent, when they last came in, and whether
  they have opted out of marketing. **It is their own list and nobody else's**
  — proved by exporting the demo detailer's and counting: 48 customers exist
  on that database across 10 businesses, the demo detailer owns 13, and the
  file had exactly those 13 and none of the other 35.

  **Why it was built tonight rather than queued.** You ruled it a build item
  on 20 September. What made it urgent is that **`/pricing`, your home page
  and your terms all already promised it** — *"You export them and go"* is
  your answer to *"what happens to my customers if I cancel"*, which is the
  question a nervous detailer actually asks before signing up. The only
  download in the product was the accountant's jobs-and-expenses file, which
  has no customer list in it at all.

  **THE PART THAT IS STILL NOT TRUE, and you should know it rather than find
  it.** That same sentence says *"Your customers, their numbers **and your
  photos** are yours."* **There is no photo export.** Not a smaller one — none
  at all. The two honest ways out are to build it or to take the word
  "photos" out of that sentence, and both are yours. Nothing else on the
  promise is outstanding.

  **It reaches nobody until you publish.** Like everything else this week, it
  is in the repository and not on the live site.

- [ ] **READ · Your privacy page now names four things it did not name. The
  words are yours to change; the facts are not.**

  **Nothing has reached anybody.** This is in the repository and not on the
  live site — it appears the next time you publish, which is still your press.
  So there is time to reword it, and that is the only thing being asked of
  you here.

  **Why it was changed without asking first.** The page told a customer their
  address goes to the suggestion service *while they type*, and said nothing
  about three other places their details go. That is not a wording preference,
  it is the page being wrong, and it names you personally. So it was corrected
  now and brought to you for the words rather than the other way round.

  **The four, one line each.**

  - **Google Fonts.** Every page here, including your booking page, asks
    Google for its lettering the moment the page opens — so Google sees the
    IP address of everybody who visits, before they touch anything. This is
    the only one that needs nobody to do anything.
  - **Google Maps, Apple Maps or Waze.** When you tap **Directions** on a
    job, the customer's address is inside the link that opens — so that
    company gets it. Google unless you changed it in your settings.
  - **Google Calendar.** When you tap **Add to calendar** *and your calendar
    is set to Google*, the entry carries the customer's name, address, phone
    number and any notes. **If your calendar is set to Apple or to a file,
    nothing leaves the product** — and the page says that too.
  - **The address, a second time.** Once a booking is saved, its address goes
    back to the suggestion service once, to be turned into map coordinates
    for the weather. The page used to describe only the typing.

  **One more sentence was added because it was true and missing:** the
  translation services only ever receive your own wording — addresses and
  phone numbers are never sent to them.

  **Nothing was invented.** OpenStreetMap is credited on your booking page but
  receives nothing, so it is deliberately not listed. A privacy page naming a
  service you do not use is as wrong as one missing a service you do.

  **What to do:** read the two new sections on `/privacy` — *"The lettering on
  every page"* and *"The two buttons that hand a job to somebody else"* — and
  say if you want different words. **If you are happy with them, this row is
  done and there is nothing to press.**

- [x] **~~DO · Tell a session where the key to your backups is kept.~~
  SUPERSEDED 2026-09-21 — this row said nobody had written the location down,
  and that turned out to be wrong. The live version is the backup-key row in
  *Urgent* near the top of this page. Read that one; ignore this one.**

  **What changed.** This row said *"nothing anywhere records where the key
  actually is"*. **Two files do**, both written the week the backups were
  built: the setup write-up of 7 September and the operations page of 8
  September, in the same words — **your password manager, and deliberately
  nowhere else.** A third file said it was not recorded anywhere, which is
  almost certainly why nobody ever found it, and that has been corrected too.

  **It also said eleven backups. The counted number is ten**, one release at a
  time on 20 September, plus one a night since if the schedule has held. One
  night, 15 September, failed and cannot be recovered.

  **What you are actually asked for has got smaller, not bigger:** it is no
  longer *"tell us where it is"* but *"open your password manager and check
  that it is there"*. **Thirty seconds, and the Urgent row has it.**

- [ ] **DECIDE · "Unlimited photos" is not true, and it is on your pricing
  page.**

  **The export half of this row is settled** — you asked *"Isn't that just like
  one button? Is that really gonna be that hard?"* and it is now a build item,
  not a question. See Done. **This is the other half, and it is still yours.**

  Your pricing page lists what a detailer gets: *"Unlimited services, bookings,
  photos and staff logins."* **Services, bookings and staff logins really are
  unlimited. Photos are capped at about 10 MB per detailer** — and the product
  will accept a single 10 MB photo, so one picture can eat almost the whole
  allowance. Past it the screen refuses the upload and says *"Photo storage is
  full."*

  **Two honest ways out, one line each:**
  1. **Make the allowance real** — raise it so "unlimited" is true, which costs
     storage.
  2. **Say what it actually is** — take "photos" off that line, or print the
     real figure.

  **No recommendation attached, on purpose.** Which way round this goes depends
  on what storage costs you against what the word is worth on that page, and
  that is yours to weigh.

  **The wording stays exactly as it is until you answer** — deliberately not
  made vaguer, because a vague promise is still a promise and harder for
  anybody to spot later.

- [ ] **DECIDE · What the live preview on Business settings should show.**

  ROADMAP 9.10 wants a live preview of your customer-facing page on the
  settings screen, where the right half of the screen currently sits empty.
  Nobody can build it until a person decides what it actually shows, how it
  updates as you type, and what it looks like before you have anything to
  show — three separate judgement calls with no single right answer.

  **No recommendation attached — this one is genuinely yours, not ours.**

  **You asked, 2026-09-20: *"why is there an empty half"*.** That is the same
  empty half — this row is the answer to your question, and it stays open
  because it is waiting on what you want in it, not on anybody building it.

- [x] **ALREADY DONE — the example site with a real company's name was
  renamed.** This asked you to decide about "Tampa Bay Auto Detail". **It is
  now "Sunglade Auto Detail"**, and its email address is on a reserved
  example domain that can never belong to anybody. Checked 2026-09-20.

  The words "Tampa Bay" still appear on it as a *place* — *"Mobile detailing
  across Tampa Bay"* — which is a region rather than a company, and is not
  what the question was about. **Nothing for you to answer.**

- [ ] **DO · The "review every page" map on your live site has four dead links
  on it. Nobody is working on this and nobody should be — it is fixed already
  and waiting on you to publish.**

  **What you will see if you open it tonight.** Go to
  `detailingplatform.com/map.html` — the one-screen list of every page in the
  product, the one you asked for so you could walk the whole thing without
  getting stopped by a login. Four of those links will open a page that says
  nothing is there: **a customer's own booking, the same booking as a job, a
  plan member's page, and the unsubscribe page.** Every other link on that
  page is fine.

  **Nothing is broken.** Those four links are the only ones on that page that
  have to point at a real record — a receipt, a membership and an opt-out are
  addressed by the thing they are about, so the address has to be a real one.
  The test suites delete and rebuild those records as they run, so the
  addresses go out of date on their own. The four pages behind them work
  perfectly; the addresses simply point at rows that no longer exist.

  **This has bitten you personally before.** On 11 September you reviewed the
  product and wrote *"wasn't able to view it"* and *"nothing showed when
  clicked on link"* about two pages — **both were working.** The links were
  stale. That is the exact reason the map was rewritten to refresh itself.

  **It is already fixed in the software.** The correct four addresses were
  checked against your database tonight and committed. **The copy on your live
  site is just older than the repo.** The only thing that replaces it is a
  publish, and publishing is yours — it is the same freeze that is holding the
  22 edge functions, so this rides along with whatever you publish next and
  costs nothing extra.

  **Until then:** if a link on that page looks dead, it is one of those four,
  and the page behind it is fine.

- [x] **~~ASK · Your business name and andrewsdetail.com are printed on your
  home page next to the line "Mobile detailing, Tacoma and south." What
  should that line say?~~ ANSWERED 2026-09-22.** You told us directly:
  *"that's just like fake, whatever, that's like not a real anything...
  maybe even using an actual example from a website that we built."* The
  city was never what needed fixing — the whole picture being invented was.
  It now shows a real screenshot of one of the five example sites
  ("Prime Mobile Detailing") instead of a made-up business, and your own
  name and andrewsdetail.com no longer appear on it at all. Nothing left
  to answer here.

---

## Two things only you can do, away from the computer

- [ ] **DO · Thirty seconds with your phone reading the screen to you.**
  Everything a machine can check is checked and clean. **What no script can
  tell us is whether the page makes sense when it is read out loud.**

  1. Turn your phone's screen reader on — iPhone: Settings → Accessibility →
     VoiceOver. Android: Settings → Accessibility → TalkBack. Note the shortcut
     to turn it off again before you start; it changes how you tap.
  2. Open your own booking page and try to book something, **listening rather
     than looking**. One service, any date, then stop before the last button.
  3. **One question: could a person who cannot see the screen finish this?**

  **Tell me "they could", or where you got stuck.**

---

## Recorded — nothing needed from you yet

- **There is a corner of your product your own checks cannot look at, and it
  is the dashboard.** Everything a customer sees — your booking page, your
  site, the emails — gets opened, measured and photographed before anyone
  calls it done. **The screens you sign in to do not**, because getting in
  needs your password and no session is allowed to touch one. So the words on
  your own dashboard are the one part of this product that gets checked by
  being **read** rather than by being **looked at**.

  **Why that matters more than it sounds.** Nothing breaks. A sentence that is
  two neat lines on a laptop can be four lines of grey on a phone — measured
  today on one line of help text, and in Spanish it was four lines where the
  two settings either side of it were two. You would see it in a second; a
  session reading the file cannot see it at all.

  **What would close it:** a safe, development-only way for a session to open
  a dashboard — a practice login the product already trusts, never yours and
  never on the real site. **Nobody is building that without you**, because a
  new way into a signed-in dashboard is a decision about how people log in,
  and that is yours rather than ours. Nothing is needed from you today; this
  is here so it is not discovered as a surprise.


- **THE SURVEY YOU ASKED FOR — eight things that exist but were not thought
  all the way through, worst first.** Nothing here is on fire and nothing
  needs answering today. *Worst* means what would hurt a working detailer
  most, not what is quickest to fix. **Six things I checked and found fine are
  at the bottom**, because knowing what was looked at is half of what makes a
  list like this worth reading.

  **1 · Two people cannot work at the same time.**
  *Today:* the calendar refuses to hold two jobs that overlap, for the whole
  business, no matter how many people work there. A job is not assigned to
  anyone, and the booking page has no idea how many of you there are. You sell
  "unlimited staff logins" and the product means logins, not hands.
  *What it costs you:* a second van cannot be booked. Anyone who grows past
  themselves hits a wall on day one, and the only way round it is a second
  account.
  *To fix:* **big.** The calendar, the booking page's idea of what is free,
  and every screen that shows a day. Not an afternoon.

  **2 · Your job photos are not backed up — and as of tonight, neither are
  your receipts.**
  *Today:* the nightly backup copies the database — bookings, customers,
  prices. The photographs themselves live somewhere else and **nothing copies
  them.** If they were ever lost, the backup would bring back a list of
  photos that no longer exist. **The receipts added tonight are kept the same
  way, so they are in the same position from the day they arrive.**
  *What it costs you:* the before-and-after shots are the thing you would most
  want on the day a customer says a scratch was your fault. **The receipts may
  be the sharper loss.** A customer dispute happens occasionally; **a tax year
  happens every year**, and a restore would hand you back a list of expenses
  pointing at photographs of receipts that are gone. They are the one thing in
  here you are expected to keep for years.
  *To fix:* **medium**, and it is the **same** fix for both — whatever copies
  one store copies the other. It needs the photo-storage decision below
  settled first.

  **3 · The whole platform can send about eighty emails a day.**
  *Today:* the email service is on a free plan — a hundred a day across every
  detailer combined, with twenty held back for our own alerts. A booking
  spends roughly five.
  *What it costs you:* **about sixteen bookings a day across everybody.** Four
  busy detailers would use it all, and when it runs out confirmations stop
  going out.
  *To fix:* **small — but it needs money.** A paid email plan, roughly
  **$20 a month** at the first tier. No building.

  **4 · Moving a job never changes the price — and that turns out to be the
  safe behaviour rather than the bug I first called it.**
  *Today:* you can charge more for weekends, for certain times of day, and for
  last-minute bookings. All of that works when a customer books. **When a
  booking is moved, the price stays exactly as it was**, and **nothing tells
  anybody either way** — not a screen, not an email, not you.
  *What it costs you:* somebody books a cheap Tuesday, moves it to a Saturday,
  and your weekend rate does not apply. You are not told.

  **I wrote this as a small fix and I was wrong. Correcting it here rather
  than quietly.** The recalculating part really is small. **What to do with
  the answer is not**, and it is the part that would have surprised you after
  the work was done.

  **Three things that are not obvious:**

  - **Re-pricing uses today's rules, not the ones from the day they booked.**
    A job booked three weeks ago and moved to tomorrow becomes a **last-minute
    booking** and picks up that surcharge — which has nothing to do with the
    move. It would also pick up whatever sale is running now, any price you
    have raised since, and today's rounding.
  - **A higher price has nowhere to go.** There is no way in the product for a
    customer to agree to "thirty dollars more on the job you already have".
    The only thing close to it throws the whole booking back to *waiting*,
    lets go of their slot and sends the messages that go with that — and a
    customer pressing a button would not obviously be agreeing to the money.
  - **A lower price is the one that would catch you out.** Moving a job **off**
    a Saturday takes the weekend rate away. If they have already paid, that is
    money owed back. A build that simply re-prices both ways would be issuing
    refunds nobody asked for.

  **So the honest headline is his, and it is the opposite of a bug report:**
  **carrying the agreed price forward untouched is the only one of the options
  that can never charge somebody something they did not agree to.** This is
  not a fix being put off.

  **The four questions, which are yours:**

  1. When a job moves, should the price be worked out **for the new date
     only** — or as if the booking were being made today, which drags in
     today's prices, today's sale and a last-minute fee that has nothing to do
     with the move?
  2. If the new price is **higher**, how does a customer agree to it? Nothing
     in the product does that today.
  3. If the new price is **lower** and they have already paid, who decides
     about the money — and should it ever happen without you?
  4. Should any of this happen **by itself at all**?

  **And there is a cheap third way, which needs none of the above.** Show
  **you** the difference when you move a job — *"this would now be $30 more"*
  — and let you decide, one job at a time. **No customer ever sees it, no
  agreement is needed, and nothing is charged or refunded without you.** It is
  the only version that needs no new machinery.

  *To fix:* **small if you pick the third way. A real build if you pick
  either of the others**, because both need a way for a customer to agree to a
  change in money, and that does not exist yet.

  **5 · Photo storage is about forty-seven photos per detailer — and since
  tonight that number covers receipts too.**
  *Today:* one gigabyte for the whole platform, divided by a hundred
  detailers. Measured against what a photo actually weighs here, that is about
  forty-seven each. The pricing page said "unlimited"; I have taken that word
  off. **Receipts now share the same allowance**, so it is forty-seven photos
  and receipts combined — deliberately, because a second store nothing counts
  is how a limit stops being a limit.
  *What it costs you:* a detailer photographing jobs properly is full inside a
  month.
  *To fix:* **small once storage exists — and it needs a provider.**
  Cloudflare object storage, about **$7.50 a month** for five gigabytes each
  across a hundred detailers. Full detail is in the row further up this list.

  **6 · An expense cannot have a photo of the receipt.**
  *Today:* you can record what you spent and type a note. There is nowhere to
  put the receipt, while a job photo has a whole system behind it.
  *What it costs you:* at tax time the numbers are in the product and the
  paper is in the van.
  *To fix:* **small.** The photo machinery already exists; it points at jobs
  and not at expenses.

  **7 · "Export everything" is two buttons on two screens.**
  *Today:* customers export from the Clients screen, photos from the Photos
  screen. The promise on the pricing page is one sentence.
  *What it costs you:* somebody leaving, or just backing up, has to know to do
  two things.
  *To fix:* **small.**

  **8 · Nothing tells a customer you are on your way, or that you have
  finished.**
  *Today:* neither message exists, in any form. The product does send **you** a
  phone alert when a job is starting soon and when it is wrapping up — so it
  knows the moment; it just never tells them.
  *What it costs you:* these are the two messages people expect from anyone
  who comes to their house.
  *To fix:* **medium**, and it runs straight into the texting question in
  `docs/what-we-send.md` — these want to be texts, and the product sends no
  texts.

  **Checked and found fine, so you know what was looked at:** refunds (the
  product tells you to refund from your own Stripe because the money went
  straight into your account and we never hold it — a real limit, said
  plainly); deleting a customer (their bookings are anonymised and their
  photos deleted, rather than left behind); monthly plans (visits are kept on
  a proper ledger, not an unchecked number); marking someone a no-show (a real
  status you can set from the job); a quoted price (it cannot be charged
  unless the customer presses accept); and the price a customer is quoted
  being produced by the same code that charges them, so the two cannot drift
  apart.


- **SETTLED 2026-09-21, so nobody raises them again.** Three answers given
  this morning, recorded here because a question that keeps coming back costs
  more than the answer did.
  - **Two-factor sign-in: a permanent no.** Not "later", not "when there are
    customers". **Never to be raised again.**
  - **The demo password living in the repo is your decision, not an
    outstanding risk.** You remove it at the first real signup, roughly two
    months out. It is not a finding and should not be written up as one.
  - **The daylight check is dropped.**

- **REVERSED 2026-09-21: marketing email is allowed again.** The rule that
  email was only for receipts, reminders and alerts, and that anything selling
  had to go by text, is **overturned by the person who made it.** Your words:
  it was a last-minute call made to avoid the work of making marketing email
  legal, and you have changed your mind. **Nothing in the repo should be
  treated as settled because that rule shaped it.**
  **CORRECTION, 2026-09-21, and it is mine.** I wrote here a few hours ago
  that *"there is no marketing email feature in the product today"* and that
  the reversal "opens work rather than switching something back on".
  **That was wrong, and you should not act on it.** I had read the
  **Campaigns screen** — which is link tracking, a shareable link and counts
  of who opened it and who booked — and mistaken it for the whole feature.
  **Emailing a chosen set of your customers already exists and already
  works.** It is on the Clients screen, called *"Email your customers"*: you
  tick the people, write a subject and a message, and it sends. It already
  refuses to send to anyone with no address, anyone who opted out, and anyone
  whose last email bounced, and it already refuses to send at all unless your
  business has a postal address on file. **So the reversal switches something
  on rather than opening work.**


- [ ] **NOTE · Three things are built or decided and have not been looked at in
  a browser yet — 2026-09-21.** Written here so they cannot quietly disappear
  if a session ends. **Nothing is broken by any of them waiting**, and none of
  them needs anything from you except the publish already on your list above.

  1. ~~**The price lines on the booking page now say what kind they are.**~~
     **Done and checked on screen, 2026-09-21.** A customer on a plan, or
     booking two cars, used to watch the total go up on the date step with
     nothing saying why — 60 to 85 with no explanation. It now names the
     charge, in English and in Spanish, on a phone and on a desktop.
     **One thing is still true and worth knowing:** like everything else here
     it is waiting on you to publish, so a real customer will not see it until
     the programs go live.
  2. **The "your coating is due" switch** — the row near the top of this list.
     Built, and the database part is applied. **Waiting on your publish, and
     then on somebody watching it actually stay silent.**
  3. **A warning for detailers who write their own paragraph into an email.**
     A detailer can type anything into their appointment reminder, including a
     sales pitch, and it goes out inside an email that carries no unsubscribe
     link. The fix is a plain warning on the screen where they type it — their
     words stay theirs, nobody filters them. **Decided, written down, not
     built.**

- [ ] **NOTE · The legal pages name you personally, and that is correct until
  December 2026.** They say **Andrew Dietrich, doing business as Detailing
  Platform**, which was originally a guess at your paperwork.

  **You settled it 2026-09-20:** *"I'm not even a registered business yet. I'm
  waiting until I'm 18"*, and on the DBA, *"doesn't a DBA cost money"* — yes,
  a county filing fee, and it is not worth paying before there is anything to
  file it for.

  **So the pages are right as they stand** — a sole trader's terms are a
  contract with the person, which is what you are today. **Moved out of the
  decisions pile and parked here with Stripe**, for the same December. **Answer
  it then with the name and the kind**; it is a one-line change.

  **Nothing is blocked.** Both legal pages are live and linked, there are no
  paying subscriptions and one non-demo business, and nobody has agreed to
  either document. They block your first real signup, not today.

- [ ] **NOTE · The alert emails were set to shout, and they have been turned
  down — 2026-09-21.** You said it plainly: *"usually it's just like a
  one-time thing that's not serious... if I get an email that something like
  failed or whatever, I'm not going to do anything about it."*

  **What was happening.** The watcher on your scheduled jobs expected a signal
  every 15 minutes and complained after 30 — so a single slow minute on
  GitHub's side became an email. It logged **26 separate "outages" in September
  alone, 98.5% uptime**, and not one of them was anything.

  **Changed:** that watcher now waits **2 hours** before it says anything. The
  nightly-backup watcher is untouched at 1 day plus 6 hours, because a missing
  backup genuinely is worth an email.

  **What is still noisy and cannot be fixed from here.** On the one real
  failure — Sep 15 — you got **three emails for one blip**: GitHub Actions mails
  instantly on a red run with no grace at all, then the backup watcher timed
  out because a failed run doesn't check in, then mailed again when the next
  night recovered it. **GitHub's own notification has no delay setting.** If it
  keeps bothering you, the lever is your GitHub notification settings for that
  one repository, and that is your account.

  **Nothing needed from you.** This is here so the change to your own alerting
  isn't something you only find out about by not getting an email.

- [ ] **DO · Open the Stripe account. December 2026, your 18th birthday.**
  Yours, not a parent's. **Nothing is waiting on this** — every payment path
  can be built and proved in test mode today, and each detailer connects their
  own account, so their age is their own affair.
  **When you do it we will need:** the two keys and two webhook secrets. Into
  the settings file, never into chat.

  **ONE SMALL THING IS NOW WAITING ON IT, AND IT IS NOT A PAYMENT — 2026-09-23.**
  We have a check that proves one detailer cannot reach another detailer's
  bookings, customers or money. It now covers 27 of the 39 back-end pieces.
  **The "pay for your booking" piece is the one it cannot test**, because to
  test it the fake practice business has to have a card account connected to
  it, and it does not. The function tells us so in its own words: *"This
  business does not take card payments online."* **Nothing is broken and no
  customer is affected** — the page simply has not been proved safe the way
  the other 27 have. **What would fix it:** one test-mode card account
  connected to the practice business, which is a Stripe action and therefore
  yours, not ours. We did not fake one, because a check that fakes its way
  past a real requirement is only testing the fake.

- [ ] **DO · One line that switches on two more outside checks. 2026-09-23.
  Two minutes, and it is a choice rather than a chore.**
  We now watch your live site from the outside every five minutes and email you
  only if something is genuinely broken — not once for a slow moment, and
  nothing at all while it is fine.

  **What is watched right now, without you doing anything:** your homepage
  really serving the site, and the booking page's open-slots calculation.

  **What is NOT watched until you run this:** whether a booking page can load a
  detailer's own details, and whether **signing in** is working. **That second
  one is the one worth caring about** — the whole product could be sitting
  behind a broken sign-in and nothing would tell either of us.

  **Why we did not just switch them on:** those two checks need one of your
  keys, and no session is allowed to create, read out, paste or store a key
  anywhere — **including into the database.** So the check asks for it by
  *name*, and only you put the real one in. **This is a rule we broke earlier
  tonight and then fixed**, which is why it is spelled out.

  **What to do:** in the Supabase dashboard → **SQL Editor**, paste the line
  below, replacing the part in angle brackets with your project's *publishable*
  key — the **anon** key from Settings → API, not the service-role one:

  ```sql
  select vault.create_secret('<paste the anon key here>', 'site_probe_api_key');
  ```

  **Nothing else changes.** No deploy, no code, no restart — the two checks
  start reporting on their own within five minutes.

  **If you never run it:** nothing breaks and nothing nags. Those two paths
  simply stay unwatched, and the monitor says so honestly every time it reports
  rather than pretending it is covering them.

- [ ] **DO · Sign up for text messaging and register the number.**
  **Telnyx, about $0.0040 a message** — roughly half Twilio's real cost. One
  number for everybody, which is what you asked for. **Under $5/month** at a
  few hundred reminders.
  **The slow part is the US carrier registration**, which can take days to
  weeks. **Start it before you need it.**
  **When you do it we will need:** the key and the number.

- [ ] **DO · The paid email plan — around December 2026, not before.**
  Roughly $60. **The audits were wrong about this being urgent**: they assumed
  a hard daily limit, and you have sent 100+ in a day with no failure.

- [ ] **DO · Netlify build credits, if publishing the website matters.**
  Credits ran out once. A production publish costs 15; **a preview costs zero
  and is a real link you can open on your phone**, so most work needs none.

- [ ] **NOTE · The counters on the pricing page and the home page no longer
  animate — 2026-09-20.** The build fee, the two monthly prices, and the
  three figures in the "What the deal is" strip (0%, 24/7, 3) used to count
  up from zero as you scrolled past them. They now show the real number the
  instant they appear. **This changes how your own page looks**, and you
  reviewed that page — the count-up was a choice, not a bug, so you should
  hear about this before you notice it. The reason: a number climbing from
  zero is not showing the true value at any point during the climb, and
  somebody scrolling past can read and quote the wrong one — you ruled this
  exact thing on the example sites' rating counter yesterday, and this is the
  same fix applied to the platform's own numbers. **Easy to put back** if you
  want the motion: it is one attribute per figure, in `LandingPage.jsx` and
  `PricingPage.jsx`.

---

## Done

- [x] **Stripe ownership decided — 2026-09-16.** You, not a parent. December.
- [x] **No lawyer for the legal pages — 2026-09-16.** *"If you could find the
  templates, then just edit them."* Accepted; the rewrite is ours.
- [x] **Texting is one platform number, not one per detailer — 2026-09-16.**
- [x] **The demo account's dual access is deliberate — 2026-09-16.** You set it
  up that way on purpose. **It must not be "fixed".** It comes out before the
  first real detailer signs up — not before.

### 2026-09-21 — your answers, in your words

- [x] **The database change is applied — you ran it yourself, 2026-09-20.**
  `travel_zone_address_mismatch` exists on `bookings`. The address-mismatch flag
  is live in the data from the next booking on, and `create-booking` is now safe
  to publish. **Your correction is recorded too, and it stuck:** *"If there's
  something you could have done 100%, you should have just done it."* A session
  that can press the button presses the button.

- [x] **Resend's delivery reports are on — 2026-09-21, done for you, not by
  you.** The webhook was already pointed at the right address but subscribed to
  the wrong list of events: it was listening for `delivery_delayed` (which the
  code throws away) and not for `delivered` (which is the entire point). It now
  subscribes to exactly **delivered, bounced, complained, failed** — the four
  the code actually handles, no more and no fewer. **"On its way" will start
  turning into "Delivered" on client records from the next email sent.** No
  signing secret was touched, read, or replaced.

- [x] **Backups: the page saying you had none was WRONG — 2026-09-21.** You
  said *"we have a GitHub connected to it for backing up. We've already dealt
  with this... I'm right, just trust me, I know I'm right."* **You were right.**
  A nightly job has been running the whole time: 02:10 every night, full
  database copy, locked, stored in your private backups repo, kept 30 days with
  the 1st of each month kept forever. Verified run by run and release by
  release, not taken on trust.

  **Why the old page said otherwise, because this is the part worth keeping:**
  it measured Supabase's dashboard, found nothing there, and wrote that down as
  a fact about *everywhere*. It never looked outside Supabase. `docs/recovery.md`
  is rewritten and now opens with that correction.

  **What this changes for you: the paid Supabase plan is no longer urgent.** It
  buys a better recovery point and a path that doesn't depend on one key — worth
  it eventually, on your own timetable, not a hole to plug.

  **One night is missing — Sep 15 — and it is not a defect.** GitHub could not
  hand its own runner the repository that morning; the job died before it ever
  reached your database. 15 runs, 14 green.

  **What replaced this row:** the key question at the top of "Waiting on you".

- [x] **No Spanish on the home and pricing pages — 2026-09-20.** *"no because
  I'm only ever going to sell to people who are speaking english"*. Clean
  answer: your marketing pages sell to detailers, your booking page serves their
  customers, and only the second one needs both languages. ~390 strings of work
  not done, on purpose.

- [x] **Travel stays flat-fee zones — no distance pricing — 2026-09-20.**
  *"no, because it told me that it would... any APIs that you need to like, be
  able to like find the direction to whatever cost money"*. Correct, and it is
  branch 2 of that row. **ROADMAP 2.3 gets rewritten to ask for the flag rather
  than sit open asking for a distance feature nobody is building.** The crude
  word-comparison flag — "San Diego" typed under a "Long Beach" zone — is built
  and now has its column, and it labels, it never blocks or charges.

- [x] **Build the customer export — 2026-09-20.** *"Isn't that just like one
  button? Is that really gonna be that hard? Why do you need my decision for
  that?"* Fair. Your pricing page and home page both promise *"You export them
  and go"* and there was no such button; now it is a build item and the promise
  stays as written. **The "unlimited photos" half of that row is still open** —
  that one really is a cost question, and it is above.

- [x] **No marketing email at all — ever — 2026-09-20.** *"how about we just
  leave all marketing things to text?... I just don't wanna deal with my address
  being on every single person's email... Let's just have no emails that will
  be, you know, marketing at all."* **So the "your coating is due" email is
  off**, and the whole postal-address problem goes with it — US anti-spam law
  requires the address on marketing mail, and there is now no marketing mail.
  **A clean line a session can apply without asking again:** email is receipts,
  reminders and alerts; anything selling goes by text. Texting has its own rules
  (written consent, STOP) and those are handled when the number is registered.

- [x] **Test detailers: flag, don't delete — 2026-09-20.** 15 of your 16
  detailers are fakes and about 60 automated checks sign into them. Deleting
  them would stop those checks running, and a check that cannot run looks very
  like one that passed.

- [x] **Your real domain stays on the marketing page — 2026-09-20.** You are
  happy promoting `andrewsdetail.com` in the example browser bar. **Separately,
  you didn't like the mock browser bar itself** — *"I don't even like that mock
  browser little image too because it kind of looks weird. I'd rather use an
  like, actual example from one of our websites"* — which is a design item, not
  a decision, and it is with the session that owns that screen.

- [x] **The job buttons stay square on a phone — 2026-09-20.** Leave it. The
  band runs wall to wall across the panel's top edge and a rounded corner cut
  out of a wall looks like a mistake.

- [x] **Large text: fix the booking page only — 2026-09-20.** The customer-facing
  screen gets to work all the way down; the back office is allowed to scroll
  sideways at double text size, and the promise says so plainly instead of
  pretending otherwise.

- [x] **Spanish vehicle words: pick what is best for a Spanish speaker —
  2026-09-20.** *"whatever is best for Spanish speakers"*. Delegated rather than
  decided, which is the right call — the dashboard says "Troca" and "SUV chica",
  the booking page says "Camioneta" and "SUV pequeña", and a session brings the
  set into line on that test. **Where it lands: one word per idea, across both
  screens.**

- [x] **The problem-report email reads like a debug dump, and that is being
  fixed — 2026-09-20.** *"it's too technical with the date and time... Make it
  just easy American 24, 12 hour format... regular the like month, day, year
  format. Like just make it look nice... I feel like if I copied a debug menu,
  this is what it looked like."* With the session that owns those emails.
  **Nothing for you to answer** — it is here so you know it was heard.
