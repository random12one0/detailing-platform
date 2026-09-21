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

**How a row is written, so the next one looks like these.** One thing you can
act on in thirty seconds or decide in ten, in plain words, with no internal
names and no background you do not need. A **DECIDE** carries a recommendation
unless the answer is genuinely not ours to recommend, and says so when it is
not. **A row goes in the group that is true of it** — *Urgent* only if
something is wrong now, *Recorded* if nothing is needed from you yet — and the
group is the honest answer to "what happens if he does not read this today?"

**Dates are only written on rows that have been waiting.** A row added today
carries no date; one still sitting here next week says **"waiting since 20
September"**, so age is visible at a glance instead of every row claiming the
same birthday. **Nothing needed a date today** — every row below was either
written or rewritten this morning.

Updated 2026-09-20.

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

  **One new ordering rule, added 2026-09-20, and it is strict, not a
  preference: if you ever publish `create-booking`, the database change
  below (the one-minute "apply one small database change" row above) has to
  be applied FIRST, not after, not the same day, first.** `create-booking` is
  the program that saves every new booking. Tonight's change made it always
  try to write to a column that does not exist in your database yet. Apply
  the database change and nothing happens — bookings save exactly as they do
  today, with one more fact recorded. Publish `create-booking` while that
  column is still missing, in either order otherwise, and **every single new
  booking fails**, not just the address-flag part of it — nobody can book at
  all until you notice and fix it. `create-booking` is already one of the
  stale programs in the 39 below — running code from before tonight, same as
  most of the others — so whenever it is swept up in that general publishing
  pass, this ordering rule is the one thing to check first, not something
  the list below will flag for you on its own.

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

## Urgent — two minutes when you next open your laptop

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

- [ ] **DO · Turn on two-factor login for your Supabase and Netlify accounts.**
  Ten minutes for both. **Only you can do it** — your account, your phone.

  Right now the database holding every booking is behind one password.

  Supabase: **Account settings → Security → enable MFA.** Netlify has the same
  under user settings.

- [ ] **DO · Apply one small database change — one minute, and it has to
  happen before `create-booking` is ever published, not just before you
  expect to use the flag.**
  This session isn't allowed to change your database directly, on purpose —
  that stays yours to approve. The file is already written:
  `supabase/migrations/20260920020000_a_picked_zone_can_contradict_the_address.sql`.
  It adds one new column to bookings that only ever holds true, false, or
  nothing — no existing booking is touched, nothing is deleted or renamed.

  It's the crude "does this address match the area they picked" flag from
  the ROADMAP 2.3 decision above — built and tested tonight, but invisible
  everywhere until this column exists. In the Supabase dashboard: **SQL
  Editor → paste the file's contents → Run.** Or from a terminal with your
  credentials loaded: `node scripts/apply-migrations.mjs 20260920020000_a_picked_zone_can_contradict_the_address.sql`.

  **Apply this and do nothing else: safe, nothing changes for anyone.**
  **Publish `create-booking` before this is applied: every new booking
  fails**, because the program that saves bookings now always tries to write
  to this column. Not a smaller version of the feature not working — nobody
  can book anything until you catch it and fix it. See the ordering warning
  in "What to put live, and in what order" above; it applies specifically to
  this row.

---

## Waiting on you — nothing breaks while these wait

- [ ] **DECIDE · What the live preview on Business settings should show.**

  ROADMAP 9.10 wants a live preview of your customer-facing page on the
  settings screen, where the right half of the screen currently sits empty.
  Nobody can build it until a person decides what it actually shows, how it
  updates as you type, and what it looks like before you have anything to
  show — three separate judgement calls with no single right answer.

  **No recommendation attached — this one is genuinely yours, not ours.**

- [ ] **DECIDE · Should the home page and pricing page get Spanish at all?**

  Your legal pages (terms, privacy) are already settled — they will never be
  machine-translated, because a translation of a contract that nobody
  qualified has read is a liability, not a feature, and that ruling is
  written into the code itself. This is the other half: the home page and
  the pricing page have no Spanish at all, on purpose or not depending on who
  you ask, and nobody has decided whether they should.

  **The size, so you're deciding with a real number:** roughly 390 pieces of
  text across both pages — real count would move around after de-duplication
  and a proper read-through, but the scale is right. That's an afternoon or
  more of work, not something a session does on the side of another item.

  **No recommendation attached — reaching Spanish-speaking customers on your
  own marketing pages is a real business call, and the cost is real too.**

- [ ] **DECIDE · Nothing is backed up, and fixing it costs money.**

  **Measured, not assumed.** Your database is on the free plan, which means
  **no backups you can restore from, and no way to roll back to an earlier
  moment.** **If the database were lost today, nothing would bring it back.**
  **Nobody has ever tested a restore, because there has never been anything to
  restore from.**

  **Nothing is wrong right now** — there are no real customers on it. This
  matters the day you move the real business onto it.

  **What we did instead:** proved your records can be exported to a file and
  put back, every row identical, and wrote the procedure down. A session runs
  it before anything risky. It does **not** bring back logins or the actual
  photo files.

  **Your options, with prices read off Supabase's own system today:**
  1. **A paid plan** — turns on daily backups kept for a week. The cheaper half
     and probably the right first step. The plan price is on Supabase's own
     pricing page; we did not want to quote a number from memory.
  2. **Add roll-back-to-any-moment: $100/month** for 7 days, $200 for 14, $400
     for 28. Needs a paid plan first.
  3. **Do nothing yet**, and keep running the export before risky changes.

  **Recommendation: (1) now, (2) when you take a real customer's booking.**

  **Not started:** a full restore rehearsal needs a second copy of the
  database, which costs money and creates something inside your account.
  Neither was touched. Say the word and it takes about an hour.

- [ ] **DECIDE · Do you want travel priced by distance at all?**

  ROADMAP 2.3 says a far-away customer can pick a cheap travel area from a
  list and pay for it — someone in San Diego can select "Long Beach" and
  the system never checks. That part is real and confirmed. But the item as
  written also asks for four things that turn out to be one decision, not
  four fixes, and building it without you making that decision first would
  mean guessing at how you want to charge your own customers.

  **What we found before asking.** Your address lookup already returns a
  map coordinate for a customer's address when they pick one from the
  suggestions — that part is free, it happens today, and it is just being
  thrown away right now. **But your OWN business has no stored location at
  all** — nothing to measure distance FROM — and a travel "area" today is
  just a name and a flat fee you typed in, with no shape on a map. So
  "derive the distance automatically" is not a small fix sitting on data we
  already have; it needs a new way of capturing where you work, and a real
  decision about what an "area" even means geographically — a radius
  around your shop, a drawn boundary, a list of ZIP codes.

  **Two branches, and each is a real answer, not a placeholder:**

  1. **Yes, price it by real distance.** This needs your own location
     stored (typed once, looked up the same way a customer's address is),
     and a decision on how an "area" is defined on a map. That is a small
     feature to design, not a bug to fix — genuinely bigger than everything
     else in this item put together, because it changes how your customers
     are charged, not just what a screen shows.
  2. **No, keep areas as named, flat-fee zones the customer picks.** Then
     the smallest real fix is enough: flag it for you rather than charge it
     automatically — see below — and 2.3 gets rewritten to ask for that
     rather than sit open asking for a distance feature nobody has decided
     to build.

  **The one thing that surprises people either way, so it is worth knowing
  now rather than later:** a customer who types their address by hand and
  never presses the "Find" button — which this product deliberately allows
  and will keep allowing, on purpose, so nobody with an address the lookup
  has never heard of gets turned away — never has a map coordinate at all.
  **No branch above can price or flag that address by distance, ever,
  because there is nothing to measure.** Distance pricing, if you want it,
  only ever covers the customers who used Find and picked a real
  suggestion.

  **What lands regardless of your answer — built 2026-09-20, not live yet:**
  a crude, honest flag — when the area a customer picks doesn't match the
  words in the address they typed, the detailer sees it on the job record
  and in the owner's alert, the same way an unverified hand-typed address
  already gets flagged (ROADMAP 2.8). It does not block the booking and it
  does not charge anything extra — it is the difference between finding out
  before you drive and finding out when you arrive. It is crude on purpose:
  comparing words, not measuring real distance, so it catches "San Diego"
  typed under a "Long Beach" area and will not catch a street twenty miles
  off inside the right city. 2.3 stays open either way — this flag is a
  partial, not the fix the item actually asks for.

  **One thing needs you before it goes live: a database change is written
  but not applied.** It's one new column that only ever holds true, false or
  nothing — no existing booking is touched. Nobody in this session has
  permission to apply it, on purpose; that stays yours. Until it's applied,
  the flag is built and tested but nothing shows up anywhere yet.

  **No recommendation attached — this one decides how your customers are
  charged, and that is yours.**

- [ ] **DECIDE · Two places where the page sells something the software does
  not do.**

  **A stranger reading that page today would be told they get unlimited photos
  and an export, and they would get roughly one photo and no export.**

  **First, the export.** Your pricing page says *"Your customers, their
  numbers and your photos are yours. **You export them and go.**"* — and so
  does your home page, as the answer to *"What happens to my customers if I
  cancel?"*: *"You export them and go. The list was always yours."*

  **There is no such button.** The only download today is the accountant's
  spreadsheet of jobs and expenses. No customer list, no photos.

  **Two honest ways out:**
  1. **Build it** — a button that downloads their customers and their photos.
  2. **Stop promising it** — change the pricing page to say a copy is available
     on request, which is what actually happens.

  **Recommendation: (1), when you next have a build day.** It is small, and it
  is the most reassuring line on that page for somebody deciding whether to
  trust you with their customer list.

  **The wording stays exactly as it is until you answer** — deliberately not
  made vaguer, because a vague promise is still a promise and harder for
  anybody to spot later.

  ---

  **Second, "unlimited photos".** The same page lists what you get: *"Unlimited
  services, bookings, photos and staff logins."* **Services, bookings and staff
  logins really are unlimited. Photos are capped at about 10 MB per
  detailer** — and the product will accept a single photo of 10 MB, so one
  picture can use up almost the whole allowance. Past it, the screen refuses
  the upload and says *"Photo storage is full."*

  **Two honest ways out, one line each:**
  1. **Make the allowance real** — raise it so "unlimited" is true, which
     costs storage.
  2. **Say what it actually is** — take "photos" off that line, or print the
     real figure.

  **No recommendation attached, on purpose.** Which way round this goes
  depends on what storage costs you against what the word is worth on that
  page, and that is yours to weigh.

- [ ] **DO · What name and what kind of business should your legal pages say?**

  They currently say: **Andrew Dietrich, doing business as Detailing Platform.**

  **Nobody confirmed that — it was a guess at your paperwork**, and the note
  saying so has been in the code since the pages were built. Right now your
  terms are a contract with you personally rather than with a company.

  **The question is just: what should it say?** A sole trader, a DBA on your
  own name, and an LLC are three different legal persons, and only you know
  which is yours. Reply with the name and the kind; it is a one-line change.

  **No recommendation attached, on purpose.** Which entity you trade as is a
  question about your own business and your own liability, and it is not ours
  to advise on.

  **Neither this nor the export question is urgent.** Both legal pages are live
  and linked at the bottom of your site, so anyone can read them — but there
  are **no paying subscriptions and one non-demo business**. **Nobody has
  agreed to either document.** They block your first real signup, not today.

- [ ] **DECIDE · The "your coating is due" email needs a postal address, or it
  needs to stop.**
  The product emails customers *"your ceramic coating is due, book it in"*. **US
  anti-spam law treats that as marketing rather than as a receipt**, and
  marketing email has to carry an unsubscribe link and a real postal address.
  Ours carries neither.

  **The question is about the product, not the email.** Fixing it the proper
  way means **every detailer would have to give us a postal address**, and
  nothing in setup asks for one.

  1. **Add a postal address to setup** and use it. Correct, but a new required
     question for every detailer including you.
  2. **Turn that email off** until that exists.
  3. **Decide it is not marketing** — a judgment about what the product is for,
     which is yours.

  **Recommendation: (2) now, (1) when you next touch setup.**

  **What a session must not do:** put a made-up address in the footer. That
  would be a false statement in a legal notice, which is worse than the gap.

- [ ] **DO · Turn on Resend's delivery reports. Three minutes.**
  Your product records every email it sends and shows it on the client's
  record — who it went to, and whether it arrived. **The "whether it arrived"
  half has never worked**, because Resend only tells us if you point it at us,
  and it never has been. Measured again this week: every test email ever sent
  is still showing *"On its way"* and not one has turned into *"Delivered"*.

  1. In Resend, go to **Webhooks** and add an endpoint.
  2. The address is the line below.
  3. Tick **delivered**, **bounced**, **complained** and **failed**.
  4. Resend then shows a **signing secret** starting `whsec_`. One is already
     set. If Resend shows a **different** one it has to replace the stored one
     — tell a session and it will handle it. **Do not paste it into a chat or a
     document.**

      https://kguqylyzgyzfktkfnhjb.supabase.co/functions/v1/resend-webhook

  **That is the right address.** An earlier note told you this was only the
  "practice" one and that your real business needed a different one. That was
  wrong, and it is corrected here rather than quietly removed.

  **Nothing is broken while it waits.** Every email still leaves a record; the
  records just never learn what happened to them.

- [ ] **DECIDE · Test accounts — flag them, or delete them?**
  Your back office lists 16 detailers and 15 are fakes.
  **Recommendation: flag, don't delete.** About 60 automated checks work by
  signing into a fake business and clicking through it. Delete the fakes and
  those checks stop being able to run — and a check that cannot run looks very
  like one that passed. Flagging gets you the same clean screen and keeps the
  safety net. **Answer: "flag" or "delete".**

- [x] **ALREADY DONE — the example site with a real company's name was
  renamed.** This asked you to decide about "Tampa Bay Auto Detail". **It is
  now "Sunglade Auto Detail"**, and its email address is on a reserved
  example domain that can never belong to anybody. Checked 2026-09-20.

  The words "Tampa Bay" still appear on it as a *place* — *"Mobile detailing
  across Tampa Bay"* — which is a region rather than a company, and is not
  what the question was about. **Nothing for you to answer.**

- [ ] **DECIDE · Your real business domain is on the public marketing page.**
  `andrewsdetail.com` appears in a mock browser bar as the example.
  **Recommendation: swap it for an invented domain.**
  **Answer: "swap" or "leave it".**

- [ ] **DECIDE · The buttons at the top of a job look different on a phone.**
  On the job page and at a desk, the box holding Call / Text / Navigate is a
  rounded card — the thing you asked for. **On a phone, when you tap a job out
  of a list, it is still a full-width band with square corners.** That was
  deliberate: there it runs wall to wall across the panel's own top edge, and a
  rounded corner cut out of a wall looks like a mistake.

  **To see it:** open Money on your phone, tap any job under *Waiting on
  payment*, and look at the top of the panel that slides up.

  **Recommendation: leave it.** Say the word and it gets rounded to match — a
  two-line change. **Answer whenever you next look at a phone.**

- [ ] **DECIDE · Large text on a small phone.**
  Somebody on a small phone with their text size turned up to double opens your
  dashboard. The page has half the room it thinks it has, so some screens run
  off the right edge and they have to drag sideways to read a line. Worst is
  the calendar. **Your booking page is very nearly fine; it is the back office
  that suffers.**

  **Why it is a question rather than a bug:** we promise the product works down
  to a certain width, and at double text size the page behaves as if it were
  half that. Nothing is broken by our own rules — the rules never considered
  this person.

  1. **Make the screens work all the way down.** Real work on the dashboard,
     for a setting most people never turn up that far.
  2. **Change the promise** — say plainly that at very large text some
     back-office screens scroll sideways.

  **Recommendation: (2), and fix only the booking page.** That is the screen a
  **customer** sees, it is a hair from fitting, and a customer with large text
  should never be dragging your booking form sideways.

- [ ] **DECIDE · The dashboard currently says "Troca" and "SUV chica"; the booking page says "Camioneta" and "SUV pequeña"; the new vehicle-type words just added follow the booking page — bring the two dashboard strings into line with it, or move the whole set the other way?**

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

- [ ] **DO · Thirty seconds outside, in daylight.**
  Every piece of text on eight screens was measured and the one that was too
  faint is fixed. **Glare is the half no script can reproduce.**

  1. Go outside — actually outside, the way you are when you are standing at a
     car.
  2. Open your dashboard on your phone and look at **Today**. That one screen.
  3. **One question: which words are hard to read?**

  **Tell me "all readable", or name the words that were not.**

---

## Recorded — nothing needed from you yet

- [ ] **DO · Open the Stripe account. December 2026, your 18th birthday.**
  Yours, not a parent's. **Nothing is waiting on this** — every payment path
  can be built and proved in test mode today, and each detailer connects their
  own account, so their age is their own affair.
  **When you do it we will need:** the two keys and two webhook secrets. Into
  the settings file, never into chat.

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
