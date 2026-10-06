# For Andrew — the things only you can do

> ## Read this first: the six emails tonight are ours. Nothing broke.
>
> **You will open your phone to six alerts from healthchecks.io. Every one of
> them was us, and nothing was wrong with your site at any point.**
>
> We built two new alarms tonight and then set each one off on purpose, because
> an alarm nobody has ever seen ring is not an alarm. Setting them off is what
> sent the mail.
>
> | time (Tue 23rd) | what it said | what it really was |
> |---|---|---|
> | **9:55pm** | site check DOWN | us breaking the homepage check on purpose |
> | **9:56pm** | site check UP | us putting it straight back |
> | **10:30pm** | detailer check DOWN | **a real mistake of ours** — the new alarm counted a test business as a real one |
> | **10:32pm** | detailer check UP | us fixing that |
> | **10:33pm** | detailer check DOWN | us breaking it on purpose, properly this time |
> | **10:33pm** | detailer check UP | us putting it back |
>
> **You do not need to do anything.** Both alarms are green and quiet now.
>
> **From here on they only ring for something real** — and we have stopped
> testing alarms against your inbox. Any future one is worth reading.
>
> *Written 2026-09-23.*

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

- [ ] **DECIDE · Four finished things are waiting on you. Say go, and say when.
  Written 2026-09-23.**

  **NOTHING HERE IS WAITING ON YOU ANY MORE — rewritten 2026-09-24 on your own
  ruling.** You said you don't care about the live site because nothing is using
  it, and that is the right call: nobody is on it, no real money is connected, so
  a program running last week's version harms nobody. **So this stopped being a
  list of chores and became a list of switches.**

  **Four things are finished and switched off until you launch. One needs you to
  paste one line.** They are built, tested and sitting still, and they all go up
  together in one go whenever you decide to launch. **You do not need to do any
  of it today.** This row exists so that on the day you do press it, nobody has
  to work out afterwards what it was for.

  **One thing worth keeping in your head, and then you can forget this page.**
  The gap between what is written and what is running keeps growing while you
  wait — that is normal and it is not something going wrong. But on launch day
  it is the difference between your customers getting what we built and getting
  something a week old. **So it is not urgent, and it is still real.**

  **25 of your 39 back-end programs are running something older than what we
  have written** — measured 2026-09-24 in the evening, not copied from an older
  note. **It said 14 until tonight, and it went UP rather than down. That is
  normal and it is not something going wrong.** Several of these programs share
  one piece of writing between them, so when we correct one sentence in that
  shared piece, every program that uses it counts as out of date at the same
  moment. Tonight that was the rescheduled-booking email. **Publishing is the
  only thing that brings the number down**, and none of it reaches a customer
  until you do.

  **What is waiting, and what each one starts doing the moment it lands:**

  1. **A customer is shown $65 and charged $95.** Pick a weekend day, the page
     says $65, pick a time and it becomes $95 — no mention of a weekend
     anywhere. **The fix is written and it is not live.** Publishing makes the
     page say the real price before they choose. *(Roadmap 2.1.)*
  2. **Your back office under-reports how set up every detailer is.** It says a
     business is "4 of 12 done" when their own dashboard says 9 of 12, because
     it was being told about their opening hours under a name the scoring
     couldn't read. **So the list of who needs a call is wrong for everyone on
     it.** Fixed tonight; publishing makes the numbers agree. *(Roadmap 9.1.)*
  3. **Your public pages have no working limit on how fast anyone can hammer
     them.** The limits are written, and **no running copy has them**, so we
     have never once seen one actually refuse anybody. Publishing puts the
     ceilings into force. *(Roadmap 14.9.)*
  4. **The rescheduled-booking email did not say which time was the old one.**
     A customer who got one saw two dates, one under the other, with a line
     through the old one and nothing else telling them which was which — and in
     the plain-text version that mail apps fall back to, the line disappears and
     the words were not there, so it was two dates and no explanation. It now
     says **"Was"** before the old time, in English and in Spanish. **The fix is
     written and it is not live.** Publishing makes it real. *(Roadmap 3.4.)*
  5. **Two of the four new outside checks are switched off** — the ones that
     watch a booking page loading a detailer's details, and **signing in**.
     **This one is not a publish.** It is the one-line paste further down this
     list, because those two checks need a key and no session may handle one.

  **What it costs you:** no money. This is the back end, not the website, so
  Netlify's build credits are not touched. Call it fifteen minutes and one
  decision.

  **If you leave it another week:** nothing breaks and nothing gets worse on
  its own — but every real customer who books a weekend job in that week is
  shown the wrong price, every call you make off the back-office list is aimed
  at the wrong detailer, the public pages stay unthrottled, and sign-in stays
  unwatched. **Four pieces of work that are already paid for keep doing
  nothing.**

  **The order is already settled — this is restating it, not reopening it.**
  From the night of 2026-09-21: `report-problem` alone first; then
  `create-booking`, `get-booking-receipt`, `platform-admin`,
  `send-owner-reminders` together; then everything remaining in one pass; then
  `platform-billing` alone; and **the payment webhook LAST and ALONE, because
  it touches money. That is your ruling and nobody is reinterpreting it.**
  Run the inventory before and after, and use the number it gives at the
  moment you start rather than the one written above.

  **Your answer can be one line:** *go, in that order* — or tell us which of
  the four you want and we hold the rest.

- [ ] **DECIDE · What to put live, and in what order.**
  **SUPERSEDED 2026-09-23 by the row directly above**, which carries the
  current count and what is actually waiting. The number in the next paragraph
  — *22 of the 39* — was true when it was written and is not now; it is left
  in place rather than edited because the paragraph under it explains the
  `create-booking` trap, and that is still worth reading.

  **UPDATE 2026-09-24 — YOU AUTHORISED THIS TONIGHT, IN PLAIN WORDS, FOUR
  TIMES. THE FREEZE IS NOT WHAT IS HOLDING IT UP ANY MORE.**

  **What stopped it was a limit on our side, not a missing decision from
  you.** The manager could not start the publish: the environment refused the
  action outright as a production deploy, and refused to let it be routed
  through a working session either. So it was handed back to you as a
  paste-ready instruction with the order below intact — **payment webhook
  last, and on its own.**

  **What this means for whoever picks this up next: do not try to run it.**
  Hand it to Andrew directly, already written out, and let him press it. The
  blocker is tooling, and attempting it again only spends the night
  rediscovering that.

  **Nothing has gone live.** The authorisation stands and is on record here;
  the order below is unchanged.

  ### THE ACTUAL COMMAND — written down 2026-09-25, because it never was

  **This block said the instruction had been handed over "paste-ready" and then
  printed no command anywhere in this file.** The paste-ready part lived in a
  chat window that is gone. Here it is, checked against this machine rather
  than remembered.

  **First, the thing everybody assumes and it is not true here: there is no
  `supabase` command on this computer.** Not on the PATH, not in the project,
  not installed by any package manager — checked in both shells. So every
  instruction anybody writes starting `supabase functions deploy` is wrong for
  this machine, and the question of whether that command has an `--exclude`
  flag never arises. **This project publishes with its own small program**,
  which talks to Supabase directly and takes the names of the programs you want
  published.

  **Open Git Bash, then:**

  ```bash
  cd /d/Users/rando/Downloads/claude/detailing-platform
  set -a; . ./.env; set +a
  ```

  That loads the keys. Nothing has happened yet. **Now find out what is
  actually out of date** — about a minute, and it publishes nothing:

  ```bash
  node scripts/deployed-inventory.mjs
  ```

  **It prints every out-of-date program by name, and that list is the only
  list to trust.** Then publish everything it named **except the payment
  one**, which this line does for you — it reads the names the check just
  wrote down and leaves `stripe-webhook` out:

  ```bash
  node scripts/deploy-functions.mjs $(node -e "console.log(JSON.parse(require('fs').readFileSync('receipts/deployed-inventory.json','utf8')).dimensions.differing.filter(f=>f!=='stripe-webhook').join(' '))")
  ```

  **Then the payment one, last and on its own, never in a batch with anything
  else**, so that if something goes wrong there is only one thing it can have
  been:

  ```bash
  node scripts/deploy-functions.mjs stripe-webhook
  ```

  **Then check it took:**

  ```bash
  node scripts/deployed-inventory.mjs
  ```

  It should say everything matches. If it still names something, that one did
  not publish — tell us the name, do not re-run the big line.

  #### WHY THE LINE READS THE LIST INSTEAD OF NAMING NAMES, AND IT IS NOT NEATNESS

  **A typed list of names goes stale in under an hour, and it did, here, in the
  hour this block was being written.** The first version of this block named
  **13** programs and told you the payment webhook did not need publishing at
  all. Both were true when measured at **02:24** and both were **wrong by
  02:54**: a commit that evening changed two files the programs all share, and
  the count went **13 → 24 with `stripe-webhook` now among them.** A list that
  omits the payment webhook while the surrounding paragraph says the payment
  webhook is fine is exactly the kind of confident wrong instruction this file
  exists to stop.

  **The count going UP is normal and is not damage** — it rises whenever
  somebody fixes something in a file the programs share, and falls only when
  you publish. `docs/gotchas.md` 85 has the full explanation.

  **For the record, as measured at 02:54 on 2026-09-25 — 24 of 39**, and the
  23 the first line would publish: `accept-invite`, `accept-quote`,
  `available-slots`, `calculate-booking`, `cancel-booking`, `create-booking`,
  `create-business`, `get-booking-receipt`, `invite-user`, `plan-link`,
  `platform-admin`, `platform-billing`, `preview-emails`, `report-problem`,
  `reschedule-booking`, `respond-to-booking`, `send-campaign`, `send-invoice`,
  `send-owner-reminders`, `track-visit`, `update-booking`,
  `validate-promo-code`, `watch-jobs`. **That is a photograph. Run the check
  and use what it prints.**

  #### THREE THINGS TO KNOW BEFORE YOU PRESS ANYTHING

  **It publishes immediately, for real.** There is no preview and no undo
  button; the way back is publishing the previous version.

  **It costs no Netlify credits.** That is the website, and this does not touch
  the website.

  **The old numbered order below is now out of date in one place.** It lists
  the payment webhook as job 3 and the "report a problem" form as job 4 on the
  strength of a measurement from the 20th. Both are still out of date today,
  so the order still holds — but do not read the numbered list as current on
  its own. The check is what is current.

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


- [ ] **SWITCH · One database change, then the email functions, so a detailer
  who uses the dashboard in Spanish gets their own alerts in Spanish.**

  **What this is.** Your customers already get Spanish emails when they book in
  Spanish. The emails that go to YOU, your staff and the platform's own alerts
  were always English. The manager decided (on your standing instruction) that
  those follow whatever language that person picked for the dashboard, and
  English when nobody picked. It is built and checked. The dashboard's choice
  was only ever saved inside the browser, where no email can see it, so it
  needs one new spot in the database to live.

  **Order: database first, then functions.** Publishing the functions first is
  harmless: they quietly fall back to English until the database change is in.

  ```bash
  set -a; . ./.env; set +a
  node scripts/apply-migrations.mjs 20261006030000_dashboard_language_reaches_the_server.sql
  node scripts/deployed-inventory.mjs   # names every function not yet live
  ```

  **The functions that send these emails:** `accept-quote`, `cancel-booking`,
  `create-booking`, `reschedule-booking`, `send-owner-reminders`, `plan-link`,
  `stripe-webhook`, `invite-user`, `platform-admin`, `create-business`,
  `preview-emails`.

  **Nothing changes for anybody even after both**, until one more small piece
  lands: the dashboard's EN/ES switch has to start saving the choice to the
  database. That is a one-line change on the other session's side and it is
  queued for them (ROADMAP 3.4). Every email stays English until then.

  **Nothing to decide.** DECISIONS.md says how to undo it.


- [ ] **SWITCH · Seven functions to publish so that tapping a job
  notification opens the job instead of a "page does not exist" screen.**

  **What this is.** When a booking comes in, is cancelled, moved, accepted or
  invoiced, or a reminder fires, your phone gets a notification. Tapping it was
  sending you to an address that does not exist, so you landed on the 404
  page. Every one of those twelve notifications now points at the job's own
  page. It is fixed in the code; your live site still sends the old link until
  these are published.

  **The seven:** `accept-quote`, `cancel-booking`, `create-booking`,
  `reschedule-booking`, `send-invoice`, `send-owner-reminders`,
  `update-booking`. One line changed in each and nothing else.

  ```bash
  node scripts/deployed-inventory.mjs   # names every function not yet live
  ```

  **Nothing to decide.** Once they are live, tap the next job notification you
  get; it should open that job. If it does, tell a session and it ticks
  ROADMAP 14.34.

  **One of the seven now carries a second fix (2026-10-06):**
  `send-owner-reminders` also gives the "your maintenance is due" email your
  address and an unsubscribe link at the bottom, and skips it for any business
  with no address on file instead of sending it without one. That email is
  switched off for every business today, so nothing changes for anyone until a
  business turns it on. The manager decided this one for you; DECISIONS.md
  says how to undo it.


- [ ] **SWITCH · Two more, same shape as the pair below: somewhere to type what
  the platform costs you, so the back office can show what it actually made.**

  **What this is.** The back office already shows what detailers pay you. It
  has never shown what the platform costs you — hosting, the database, email,
  the domain — so there has never been a figure for what you actually keep.
  There is now a place to type those bills in, one line per bill per month, and
  one read that does the subtraction.

  **THE ONE THING I WANT YOU TO KNOW ABOUT IT, because it is the whole reason
  the item was written that way.** If nobody has typed in a month's costs, the
  screen will say **“costs not entered”** and show **no profit figure at all**.
  It will not show your revenue as profit. That sounds obvious and it is
  exactly the mistake this kind of screen usually makes: with an empty cost
  list, subtraction gives you back the whole of your income and labels it
  profit, and it looks completely normal. So there is deliberately no number to
  look at until you have entered something.

  **SWITCH ONE — the database needs one new table.**

  ```bash
  node scripts/migration-drift.mjs   # names it as not yet applied
  ```

  `supabase/migrations/20261006020000_hand_entered_platform_costs.sql`. It
  **adds** one table and one index and **changes and removes nothing.** Only
  you can read or write it — no detailer's browser can reach it at all, by two
  separate locks rather than one.

  **SWITCH TWO — one function needs publishing: `platform-admin`.**

  ```bash
  node scripts/deployed-inventory.mjs   # names every function not yet live
  ```

  **The same order as the pair below: the table first, the function second.**
  If the function goes live first it will show an error on that one figure
  rather than a wrong number — which is deliberate, because a failed read must
  never be mistaken for “no costs this month”.

  **The part that saves a typed-in bill is now built too (2026-10-06), inside
  the same `platform-admin` function — so it is still one publish, not two.**

  **WHAT IS NOT BUILT YET, so you are not waiting on me for it.** The screen
  itself, and the little form for typing a bill in. Both are written up in
  `ROADMAP.md` under 9.14 for whoever builds the front end. **Nothing for you to
  decide there either** — I have already picked the categories (hosting,
  database, email, domain, and “other” so a real bill is never turned away).

  **ONE THING THAT IS YOURS TO DECIDE, AND IT CAN WAIT.** Revenue is counted as
  money that actually arrived — paid invoices in that month — rather than what
  subscriptions *should* bring in. That is the honest figure but it means a
  month where somebody paid late looks worse and the next month looks better.
  **My recommendation is to leave it as paid-money**, because the alternative
  flatters every month and you would stop trusting it. Say so if you would
  rather see it the other way.


- [ ] **SWITCH · Two things are built and waiting for you to turn them on —
  the emails can tell you which booking they were about. Neither is urgent and
  nothing is broken while they wait.**

  **What this is, in plain words.** When this product sends a customer an
  email, it already writes down that it sent it and what happened to it —
  delivered, bounced, marked as spam. What it could not write down was **which
  job the email was about**. So a list of emails existed with no way to get
  from one of them back to the appointment it concerned. That is now wired up,
  and it needs two switches that are yours and not mine.

  **SWITCH ONE — the database needs one new column.**

  ```bash
  node scripts/migration-drift.mjs   # says it has not been applied yet
  ```

  The file is
  `supabase/migrations/20261006010000_an_email_row_knows_its_booking.sql`. It
  **adds** one column and one index and **changes and removes nothing** — it
  cannot lose data, because the only thing it does is make room for something
  new. **Applying it is a change to the live database and that is yours**, so I
  have written it and left it. Until it runs, the new column does not exist and
  every email row reads blank.

  **SWITCH TWO — nine of the email functions need publishing.**

  ```bash
  node scripts/deployed-inventory.mjs   # names every function not yet live
  ```

  The change touches nine of them, and **all nine are currently running an
  older copy** — along with seventeen others that were already behind before
  today, 26 of 39 in total. **Publishing is yours** (ROADMAP 0.6), so I have not
  done it. The shipping order is the one already on this list.

  **WHICH ORDER, AND IT MATTERS A LITTLE.** **The column first, the functions
  second.** If the functions go live before the column exists, every email still
  sends perfectly and the bookkeeping row is simply written without the new
  field — so nothing breaks either way, but doing it in that order means you
  never have to come back and wonder why the field is empty.

  **WHAT YOU GET WHEN BOTH ARE ON.** Every email about a job carries the job's
  identity, so the back-office list can show *this email, about this
  appointment, to this customer, and here is what became of it*. **The screen
  itself is not built yet** — that is the other half of the same item and it is
  written up in `ROADMAP.md` under 3.1 so whoever builds it does not have to
  ask. There is nothing for you to decide about the screen.

  **WHAT IS ALREADY TRUE WITHOUT EITHER SWITCH.** You can already see whether a
  customer's email was delivered or bounced on their client record, and a
  bounced address already raises a banner. **These two switches add the link to
  the job, not the delivery tracking** — that part has been working since
  September.

  **NOTHING FOR YOU TO READ IN THE CODE.** If you want one sentence to check it
  against: 15 of the 28 places this product sends email now carry the job's
  identity, and the other 13 are emails that genuinely are not about a job — an
  invitation, a campaign to a whole customer list, a billing notice. A blank
  there is correct, not missing.


- [ ] **DECIDE · Do you want a deposit at booking, and if so, four things only
  you can settle. Nothing is built and nothing is waiting on code.**

  **What this is.** A deposit means the customer pays something at the moment
  they book, and it comes off what they owe on the day. It is on the list as a
  thing to build, and **it is the only item left on the whole list with nothing
  written down about what "done" would even look like** — because nobody can
  write that until you answer these.

  **The four questions, and none of them is technical:**
  1. **Who sets the amount?** You, once, for everybody — or each detailer for
     their own business?
  2. **A percentage or a fixed amount?** "20% of the quote" or "$25".
  3. **One figure per business, or a different one per service?** A wash and a
     full ceramic coating are very different jobs.
  4. **What happens if the customer cancels?** Do they get it back, and does
     that depend on how late they cancelled?

  **MY RECOMMENDATION, and the reasons are worth more than the answer:**
  **each detailer sets it themselves, as a percentage, one figure for their
  whole business, refunded if the customer cancels inside the window you already
  let them cancel in.**
  * **They set it, not us** — every other money setting in the product already
    works that way: their prices, their travel fee, their cancellation window.
    One more switch on a screen they already use.
  * **A percentage, not a fixed figure** — on the demo business alone the jobs
    run from **$65 to $999**. One fixed number is either pocket change on the
    big job or a wall in front of the small one.
  * **One per business, not one per service** — a figure per service multiplies
    the setting-up you already think is too long, and nobody has asked for it.
  * **Refunded inside the cancellation window** — because that window already
    exists, and **the customer has already been told about it in words on the
    last screen before they book**. Reusing it means we do not have to write a
    second promise, and two promises about cancelling is how they end up
    disagreeing.

  **ONE THING TO KNOW BEFORE YOU ANSWER, because it nearly decided this for
  you.** One of the example websites used to say a deposit was **$25 and not
  refundable**. That was **deleted on 2026-09-21** along with the ruling that
  *a deposit does not get built so an example page can quote $25* — so the
  design is genuinely open and that old sentence is not a vote. **If you happen
  to prefer $25 and non-refundable, say so and it is yours** — just not because
  a page you never wrote already said it.

  **What it costs once you answer.** Taking a deposit is taking a card payment,
  so it needs the card side working — the same connected-account step already
  on this list. **Nothing can start before your answer, and nothing is stuck
  behind it either**: everything else on the list moves without this.
- [ ] **DECIDE · How long may a detailer's own words be? Right now the answer is
  "as long as they like", and that is not a decision anybody made.**

  **What this is.** When a detailer sets up their business they type in their
  own names for things — the business name, each service, each extra, and the
  headings they group services under. Four of those five have **no limit at
  all.** Nothing stops somebody pasting a whole paragraph into the box where
  "Express Wash" goes. The fifth one, the name of a monthly plan, **does** have
  a limit: 60 characters. So the rule already exists in the product; it was
  just never applied to the other four.

  **Why it is on your list and not ours.** A cap on what somebody may type is a
  product decision with a number in it. Picking that number is yours.

  **What I would suggest, and why: 60 characters, the same as the plan name.**
  It is not a new number, it is the one already in use on the neighbouring box,
  so nothing new has to be justified. For scale, the longest name in the demo
  business today is "Bi-weekly maintenance", which is 21 characters, and
  "Coastline Auto Detailing and Mobile Valeting" would be 44. Sixty leaves
  plenty of room and still rules out a paragraph.

  **What is NOT wrong, so you can weigh this properly.** I stretched all of
  those names to 120 characters — twice what I am suggesting — and walked the
  booking page at five screen sizes, all seven steps, pressing the controls
  nearest them. **Nothing broke.** Nothing was covered, nothing became
  unpressable, nothing spilled off the side. So this is not a bug being
  reported, and nothing is broken while it waits.

  **What I did not check**, said plainly so the gap is yours to weigh and not a
  surprise later: I only measured the booking page. Those same names also
  appear in the emails a customer gets and on a detailer's own screens, and I
  have not stretched them there.

  **If you would rather not decide tonight**, the honest alternative is to
  leave it — nothing is failing. The reason I am raising it at all is that
  "no limit" is currently an accident rather than a choice, and one line in
  this file turns it into a choice.


- [ ] **DO · Five minutes with your computer reading the screen out loud. No
  install, nothing to download, no cost.**

  **Why you and not us:** we can check that every button has a name in the code.
  **We cannot listen.** Nobody here can tell you whether it actually sounds right,
  and ticking that off without hearing it is the exact thing this project refuses
  to do. So it is five minutes of yours.

  **What to do — somebody will start the site for you first and send you the
  link:**

  1. Press **`Ctrl` + `Windows` + `Enter`** together. Your computer starts reading
     things out. It is called Narrator and it is already installed.
  2. Open the **booking page** and go to the step where a customer **picks a
     date**. Press the **Tab** key over and over, slowly, and listen.
  3. Open a **job** in your dashboard and Tab along the **row of buttons pinned at
     the bottom** — Mark completed, Didn't show up, Cancel the job.
  4. **Tell us about anything that sounds wrong.** Three kinds: it says
     **nothing at all**; it just says **"button"** with no idea which one; or it
     says **something different from the words you can see.**
  5. Press **`Ctrl` + `Windows` + `Enter`** again to turn it off.

  **You do not need to fix or diagnose anything** — *"the third button just said
  button"* is a complete report.

  **Why it matters:** someone who cannot see the screen uses your booking page by
  listening to it. Right now nobody has ever heard what it says. **It closes
  ROADMAP 7.4's last gap**, which is the only unproved gap in the whole ticked-item
  audit (`docs/ticked-without-proof-2026-09-25.md`).

  **Nothing breaks while this waits.**

- [ ] **DO · Run one command that adds a "this is a test row" tick box to your
  customer list. Everything else for ROADMAP 1.3 is built and proved; this is
  the one step that makes it real, and it is yours because it changes the
  shape of the database.**

  ```bash
  set -a; . ./.env; set +a
  node scripts/apply-migrations.mjs 20260924010000_a_fixture_is_not_a_customer.sql
  ```

  **What it does, in plain words.** Your Clients screen currently lists sixteen
  people for the practice business, and three of them are not people — they are
  left over from automated checks, with names like *zone-muew68al* and phone
  numbers like *(555) 013-3* that no phone can ring. They also sit inside the
  headline figure at the top of the screen: it says **8 have gone quiet** when
  the true answer for real customers is **5**. This command adds one tick box to
  every customer, ticks it on the rows that are obviously fixtures, and **the
  screen then hides them by default** — with a small chip saying *"Show 3 test
  rows"* if you ever want to look.

  **NOTHING IS DELETED, and that is your own ruling being followed.** About
  sixty automated checks sign into these fake accounts; a check that cannot run
  looks exactly like one that passed. Every row stays exactly where it is.

  **It is safe to run twice** — it skips work it has already done. It touches
  only `kguqylyzgyzfktkfnhjb`, the development database, never your real
  business.

  **How you will know it worked:** `node scripts/migration-drift.mjs` says
  `customers.is_test` is absent today and will stop saying it. And
  `node scripts/client-fixtures.mjs` keeps passing either way, printing
  `column_live: true` afterwards instead of `false`.

  **AND IT FINISHES TWO THINGS ON THE LIST RATHER THAN ONE — found 2026-10-03.**
  The screen that hides the test rows **is already written**. It was built, and
  then it quietly stopped working, because the tick box it looks for was never
  added — so it looks at every customer, finds no tick, and shows them all.
  **Running this one command is the whole of what is missing**, and it closes
  **both** of the two jobs on our list about test rows in your lists (0.3 and
  1.3). **Nothing else is needed for either of them.**

  **Nothing breaks while this waits** — the screen simply goes on showing all
  sixteen, exactly as it does today.

- [ ] **DO · Open seven emails in your own inbox and tell us whether they read
  right. It is thirty seconds each and it is the last thing standing between
  ROADMAP 3.4 and done.**

  **The seven:** booking confirmed, request accepted, appointment reminder,
  quote, receipt, cancelled, rescheduled.

  **Why it has to be you.** We have now rendered all sixteen emails the product
  sends, in English and Spanish — sixty-four documents, read one at a time — and
  written up what we found. **What nobody here can do is receive one.** A real
  send costs one of your eighty a day and lands in your inbox, and the question
  is whether it arrives looking right in a real mail app, which a rendered file
  cannot answer. Every fixture we use goes to an address that cannot receive
  anything, on purpose.

  **What we already found by reading, so you are not checking from scratch.**
  The **rescheduled** email is the one to look at hardest. It shows the old time
  and the new time one under the other, and the only thing marking which is
  which is a **line through the old one**. In the plain-text copy that every
  mail app can fall back to, the line disappears and you get two dates and no
  words. If your mail app shows you that version, you will see the problem
  immediately. **The fix is one word — "Was" — and it is not applied, because
  adding words to a customer's email is yours to approve.**

  **Also worth a glance:** the **"your maintenance is due"** email prints its
  date as *12 October 2026* rather than *October 12, 2026*, and in Spanish it
  prints that English date inside a Spanish sentence. **The product itself
  formats it correctly** — that wrong date is in our own test fixture, not in
  what a customer would get — but it means nobody has ever looked at that line
  as a customer will actually see it.

  **Nothing breaks while this waits.** Full write-up:
  `docs/3.4-rendering-findings-2026-09-24.md`, folding into ROADMAP 3.4.

- [x] **DECIDED · The day squares stay as they are. 2026-09-24 — nothing
  needed from you.**

  **Decided on your own earlier ruling, not by you tonight.** You already
  settled this exact question once — *"job buttons stay square on a phone"* —
  against an audit that wanted otherwise. This is the same question about a
  different button, so it was answered the same way rather than asked again.
  **If you disagree, say so and it reopens;** it is recorded this way so that
  it is not put back in front of you a third time.

  **Why there was no middle option.** Seven squares plus the gaps between them
  need about an inch more than the narrowest phone has. Closing the gaps does
  not get there. So there was no small adjustment available — the shape of the
  screen would have had to change — and that is what made this a decision
  rather than a fix.

  **THE MEASURING TOOL STAYS RED, ON PURPOSE, AND THAT IS PART OF THE
  DECISION.** It keeps reporting this in red with the exception named beside
  it. It is not being softened, silenced or marked as passing. A real gap that
  we have chosen to live with must stay visible as a real gap — **a genuine
  violation hidden inside a passing check is exactly the failure this project
  spent tonight removing**, and buying a green tick with one would undo the
  reason the tick is worth anything.

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

- [x] **DECIDED · The Spanish dashboard gets finished. 2026-09-24 — nothing
  needed from you.** It asked whether 134 English strings across 32 screens
  were worth a night. **They are, and it is queued as the next session's
  work.**

  **The reasoning, so it is not re-argued.** The Spanish setting already
  exists and a detailer can find it and switch it on. Once that is true,
  half-delivering the language reads as **sloppiness rather than as a stated
  limit** — somebody who turns it on and hits English paragraphs concludes
  the product is careless, not that Spanish is unfinished. The other way out
  would be removing the setting, and that means **pulling out something that
  already works, which Andrew has ruled against before.** So finishing it is
  the only door left that does not cost something he has already refused.

  **Not done tonight.** Recorded as decided, with the four sub-questions below
  still to be answered by whoever picks it up — they are about what counts as
  a string, not about whether to do the work.


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


- [x] **DECIDED · The Charlotte example site's opening picture gets made to
  fit the screen. 2026-09-24 — nothing needed from you.**

  **Which one:** the Charlotte site, `/ex3` — *Ballantyne Mobile Detailing*,
  the two-page one with the three colours you can switch between.

  **Why this was decided rather than asked.** It was only ever open because of
  a measurement, and the measurement was wrong. It was left alone on 20
  September on the grounds that the opening picture was **exactly one screen
  tall** — a deliberate, common style. It is **1,111 pixels on a 900-pixel
  screen**, about a fifth of it below the edge, which is not a style. **The
  reason for leaving it no longer exists, so the decision goes with it**
  rather than sitting on your list waiting for taste you were never really
  being asked for.

  **AND IT MAY ALREADY BE BUILT — TWO OF OUR OWN DOCUMENTS DISAGREE, SAID
  OUT LOUD RATHER THAN QUIETLY PICKING ONE.** The build queue records this as
  answered and done on **21 September**, with the picture taken from 1,111 to
  **903** pixels by trimming five spacing values and restyling nothing. This
  row stayed open anyway. **One of the two is stale and it was not resolved
  tonight**, because resolving it means opening the page and measuring it,
  and that page belongs to another session's work tonight.

  **So what actually happens next is one measurement, not a build:** whoever
  picks this up opens `/ex3` and measures the opening picture. If it is ~903,
  this row was simply never ticked and everything is already right. If it is
  still 1,111, the change is specified and small.

  **Nothing is broken either way** and the page works at every size.

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

- [x] **DECIDED · "Photos" comes off the pricing page, and no number goes on
  it yet. 2026-09-24 — nothing needed from you.**

  Your pricing page promised *"Unlimited services, bookings, photos and staff
  logins."* Services, bookings and staff logins really are unlimited. Photos
  are not. **The word comes off. No figure replaces it for now.**

  **Why no figure, when we have one.** Today's real allowance works out at
  roughly **forty-seven photos-and-receipts per detailer**. But the allowance
  is already committed to rising about **tenfold**, in the same change that
  moves photo storage to Cloudflare — that is not a plan, it is written into
  the build queue and tied to that one commit. **So printing a small number
  now means printing a different number shortly**, on the page a stranger uses
  to judge whether to pay you. A page that is quietly true beats a figure with
  a short life.

  **What happens when the storage move lands:** the real number goes onto the
  page **in the same change**, so the promise and the allowance cannot be out
  of step with each other even for a day.

  **This closes the photo allowance question too** — the two were one decision
  wearing two hats, and they are answered together here.

- [x] **DECIDED · The empty half of Business settings shows your real booking
  page. 2026-09-24 — nothing needed from you.**

  **You asked, 2026-09-20: *"why is there an empty half"*. This is the
  answer.** It was sitting open waiting on three judgement calls; they are
  made, so it can be built.

  - **What it shows:** your own public booking page — the real one, exactly
    as a customer arriving at it would see it. Not a mock-up of it.
  - **When it updates:** when you **save**, not as you type. Live-as-you-type
    is a noticeably bigger build, and worse than that it would show you
    half-typed nonsense while you are in the middle of judging how your own
    page looks.
  - **Before there is anything to show:** the page as a customer would see it
    **today**, with one line naming what is still missing — rather than a
    blank panel or a cheerful placeholder that tells you nothing.

  **It is a build item now, not a question.** Written into ROADMAP 9.10.

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

## Two things only you can do, away from the computer — **BOTH DONE, 2026-09-24**

**You did both tonight and reported nothing wrong on either.** This section is
finished. It is kept rather than deleted because what was checked, and by whom,
is the evidence — and because **if you later remember something that did look
off, both of these reopen.** Neither is airtight; each is one person looking
once, which is still more than any script here can do.

- [x] **DONE BY YOU · Thirty seconds with your phone reading the screen to
  you.** You ran a screen reader over your own booking page and tried to book
  something by listening rather than looking. **Nothing wrong reported.** The
  question was *could a person who cannot see the screen finish this*, and the
  answer came back yes.

- [x] **DONE BY YOU · Reading a screen outdoors in daylight.** You read the
  product outside, in real light, which is the one thing no automated check
  can reproduce — glare is not something a contrast number knows about.
  **Nothing wrong reported.**

  **AND THIS ONE HAD BEEN DROPPED, THEN UN-DROPPED.** On 2026-09-21 it is
  recorded further down this file as *"the daylight check is dropped"*. It was
  evidently reinstated and then done. Both facts are left standing rather than
  one being quietly deleted, because the sequence is what a reader needs: it
  was dropped, it came back, and it passed.

  **What it closes:** ROADMAP 8.3, small grey text outdoors. Both automated
  halves were already clean; yours was the last piece.

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
  - ~~**The daylight check is dropped.**~~ **REINSTATED AND THEN DONE,
    2026-09-24** — Andrew read a screen outdoors in daylight and reported
    nothing wrong. It is ticked at the top of this file and it closes
    ROADMAP 8.3. Left here struck through rather than deleted, because a
    ruling that was reversed is more useful than one that vanished.

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

- [x] **DONE BY YOU · You switched on the two extra outside checks.
  2026-09-24.** You ran the line, and both of them woke up. **Nothing more to
  do here.**

  **All four checks on your live site are now running**, every five minutes:
  your homepage really serving the site, the booking page's open-slots
  calculation, a booking page loading a detailer's own details, and
  **signing in**. That last one is the one worth caring about — the whole
  product could have been sitting behind a broken sign-in and nothing would
  have told either of us.

  **Checked, not assumed.** Two full cycles were run and watched. Both new
  checks came back with a real answer: the details check returned a real set
  of opening hours, and the sign-in check got the authentication service
  naming itself. No failures on any of the four, and the monitor no longer
  reports anything as skipped.

  **And the key you used was the right one.** You used the newer
  `sb_publishable_` key rather than the older long one, which we were not
  certain would work — it is sent in two places at once and one of those
  was designed for the older format. It works in both. **Nothing needs
  swapping.**

  **Your key was never read.** Checking this meant confirming a secret *by
  that name* exists, and nothing more. The value was not selected, printed,
  logged or written down anywhere, here or in any other file.

  **Proof the checks are really doing something:** both of those two paths
  refuse a request that carries no key at all, so before you ran that line
  they genuinely could not be watched. They are not decorative.

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
  stays as written. **The "unlimited photos" half of that row is CLOSED now,
  2026-09-24** — the word comes off the pricing page and no figure replaces it
  until the storage move puts the real one there. See the decided row above.

- [x] **~~No marketing email at all — ever~~ — 2026-09-20, AND YOU REVERSED
  THIS ON 2026-09-21. Kept struck through, not deleted, because you told us the
  reversal matters more than the rule.** What is true now is further up this
  file, at *"REVERSED 2026-09-21: marketing email is allowed again"*, and the
  full version with its one exception is in
  `docs/MANAGER-CLOSE-2026-09-21.md` § 2. **The one thing the reversal does NOT
  change: the "your maintenance is due" email stays off unless a detailer
  deliberately switches it on.** That was never about marketing — it was about
  nobody having chosen to send it. **The words below are what you said on the
  20th and are no longer the rule.** *"how about we just
  leave all marketing things to text?... I just don't wanna deal with my address
  being on every single person's email... Let's just have no emails that will
  be, you know, marketing at all."* **So the "your coating is due" email is
  off**, and the whole postal-address problem goes with it — US anti-spam law
  requires the address on marketing mail, and there is now no marketing mail.
  ~~**A clean line a session can apply without asking again:** email is receipts,
  reminders and alerts; anything selling goes by text.~~ **That line is retired —
  a session must NOT apply it.** Texting still has its own rules (written
  consent, STOP) and those are handled when the number is registered.

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
