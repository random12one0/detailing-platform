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
  You ruled on this plainly on 20 September: *"Let's just have no emails that
  will be, you know, marketing at all."* The coating email is the one that
  sells — it tells a customer a service is due and asks them to book it.

  **It was never switched off in the software.** It was off in a conversation.
  The only thing stopping it was your ordinary appointment-reminder setting —
  so any detailer who wanted reminders was sending the sales email with them,
  and the job that sends it has been running every fifteen minutes all along.

  **It now has its own off switch, off by default, and the reminder setting can
  no longer turn it on.** That is built and the database part is applied.
  **The last step is yours: publish `send-owner-reminders`.** Until you do, the
  old version is still running and a customer can still receive it.

---

## Urgent — two minutes when you next open your laptop

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

- [ ] **DO · Turn on two-factor login for your Supabase and Netlify accounts.**
  Ten minutes for both. **Only you can do it** — your account, your phone.

  Right now the database holding every booking is behind one password.

  Supabase: **Account settings → Security → enable MFA.** Netlify has the same
  under user settings.

---

## Waiting on you — nothing breaks while these wait

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

- [ ] **DO · Tell a session where the key to your backups is kept. This is the
  most important row on the page.**

  **Your backups are real and they work** — see Done below; the page that said
  otherwise was wrong. Every night at 02:10 a copy of your whole database is
  taken, locked, and stored in your private backups repository. Eleven of them
  are sitting there right now.

  **They are locked with a key, and the key is deliberately not on GitHub.**
  That is the right way round — a lock whose key sits next to it is not a lock.
  **But nothing anywhere records where the key actually is**, and a backup
  nobody can unlock is not a backup, it is a very tidy pile of noise.

  **What is needed from you is one sentence, not the key itself.** *"It's in my
  password manager"*, *"it's on the USB stick in my desk"*, *"I don't know
  where it is"* — any of those is a complete answer and the third is the one
  worth knowing fastest.

  **Do not paste the key into a chat, a document, or this file.** No session
  will ask you for it, read it, or move it. Where it lives is the answer; what
  it is never is.

  **Why it is first:** nobody has ever restored one of those nightly backups,
  and nobody can until this is answered. Everything else about backups is
  settled and paid for at zero; this is the whole remaining risk.

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

- [ ] **DECIDE · You have a "send all my customers an email" feature, and your
  own rule forbids it. Which one gives?**

  You ruled: *"Let's just have no emails that will be, you know, marketing at
  all."* Every email the product sends was read against that this week. One
  feature sits squarely on the wrong side of it — the campaign sender, the
  screen where a detailer writes a message and sends it to their whole customer
  list. Its button says **"Book again"**. It is marketing, and there is no
  reading of it that is not.

  **It is also the most carefully built thing in the set**, which is why this
  is a question and not a bug report:
  - It refuses to send at all unless the business has given a real postal
    address.
  - Every one of those emails carries an unsubscribe link and that address —
    which is exactly what the law asks of marketing email.
  - Only a signed-in member of the business can fire it, at their own list.

  **So nothing here is broken and nothing is illegal.** The problem is that
  your rule and your product currently say opposite things, and anyone reading
  either one on its own would be misled.

  1. **The rule wins** — the feature comes out, along with the unsubscribe
     plumbing built for it.
  2. **The feature is an exception** — it stays, and the rule gets written down
     with its exception attached, so nobody reads "no marketing email, ever"
     next to a working campaign sender and has to guess.

  **No recommendation attached, on purpose.** This is whether you want to be
  able to email your customers at all, and that is a decision about your
  business rather than about the software. **Answer: "remove it" or "keep it".**

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
