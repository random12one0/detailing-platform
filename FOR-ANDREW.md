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

---

## Waiting on you — nothing breaks while these wait

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

- [ ] **DECIDE · Your pricing page promises customers can export their data.
  They cannot.**
  It says: *"Your customers, their numbers and your photos are yours. **You
  export them and go.**"*

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

- [ ] **DECIDE · One example site uses what is probably a real company's name.**
  The fifth example site is called "Tampa Bay Auto Detail", with a matching
  email domain. **Recommendation: invent a name and a domain** — the page
  demonstrates the same thing and the question disappears. Costs nothing.
  **Answer: "rename" or "leave it".**

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

---

## Done

- [x] **Stripe ownership decided — 2026-09-16.** You, not a parent. December.
- [x] **No lawyer for the legal pages — 2026-09-16.** *"If you could find the
  templates, then just edit them."* Accepted; the rewrite is ours.
- [x] **Texting is one platform number, not one per detailer — 2026-09-16.**
- [x] **The demo account's dual access is deliberate — 2026-09-16.** You set it
  up that way on purpose. **It must not be "fixed".** It comes out before the
  first real detailer signs up — not before.
