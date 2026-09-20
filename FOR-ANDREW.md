# For Andrew — the things only you can do

**This is your list. Nothing on it can be done by a session.** It is accounts to
open, money to spend, names to decide, and keys to paste. Everything else in
this repo is somebody else's job.

**How it works.** When a session hits something it cannot do, it adds a row here
and *keeps going* — it does not stop and wait. So this file grows on its own,
and checking it is how you unblock work that is already built and waiting.

**Two kinds of row.** A **DO** is an action. A **DECIDE** is a question with a
recommendation attached — answer it in one line and a session picks it up.

Updated 2026-09-20.

---

## Waiting on you now

- [ ] **DO · Nine test emails are sitting in your support inbox. They are ours.
  Delete them. Added 2026-09-20.**
  At about **half past six this morning** a session put **nine** messages into
  **`support@detailingplatform.com`**, all with the subject
  **`Problem report · EDGEREPLAY-A-SECRET DETAIL`**.

  **They are test messages and nothing is wrong.** A check that calls every
  part of the back end in turn, to prove one detailer cannot reach another's
  data, was sending all its mail to a throwaway address — except the
  "report a problem" feature, which sends to you no matter what the caller
  says. Nine calls, nine reports.

  **Nothing went to a customer**, and no real person other than you received
  anything. The check now refuses to call anything that mails an address it
  cannot redirect, so it will not happen again.

  **Nothing to decide. Delete them, and you are done.** The reason this row
  exists at all is so you do not have to sit and work out whether something in
  your own inbox is real. *Full write-up in FOUND.md.*

- [ ] **DECIDE · What to put live, and in what order. Added 2026-09-20.**
  **Two minutes of reading. Say yes to a number and a session does the rest.**

  **The background, in four sentences.** Your site's back end is 39 small
  programs. Each one has to be *published* before a change to it does anything
  — writing the change is not enough. **22 of the 39 are currently running
  something older than what we have written**, some by a week, because nothing
  in the project ever forced the publishing step to happen and nobody noticed.
  **Publishing is yours, the same as pushing to GitHub is yours**, so nothing
  has gone live tonight and nothing will until you say so.

  **This is the recommended order. You can say "all of it", or a number, or
  no.** Each one says what it fixes and what else goes along for the ride,
  because publishing one program always carries whatever else has been written
  for it since it was last published.

  **1 · The one a customer actually feels.** *Fixes:* right now, when a
  detailer cancels a job from their dashboard, **the customer is never told
  anything at all.** Same if the detailer moves the job to another day. The
  customer's last word on it is the confirmation saying the appointment is on,
  so they wait in for somebody who is not coming. *Status:* fixed, tested
  against the live program, and **already published** — this one went live
  before the freeze, so there is nothing for you to approve. It is listed
  first because it is the most important thing in the list and you should know
  it is done.

  **2 · The one that tells YOU a booking came in.** *Fixes:* when somebody
  books, your phone is supposed to buzz. On 19 September a test with a real
  phone, a real browser and notifications switched on and accepted waited a
  full minute and **nothing arrived.** The program that sends that buzz is one
  of the 22 running old code, so we cannot tell whether it is genuinely broken
  or just running a copy from before it was written. *What publishing it buys:*
  **an answer.** Either the buzz starts working, or it does not and we have
  found a real fault with a test already pointing at it. *Rides along:* the
  change written on 20 September that marks an address the lookup could not
  find, so your job records start saying "typed by hand" on the ones nobody
  verified. *Risk:* low — it is the program that takes bookings, it is heavily
  tested, and the test that covers it is the most exercised thing we have.

  **3 · The Spanish emails.** *Fixes:* ten English words sitting in the middle
  of Spanish emails — the word "at" between a date and a time on four of them,
  and the money column of every invoice and receipt reading "Booking total",
  "Tip", "Discount" in English. *Rides along:* publishing the invoice program
  also carries a change written on 20 September about how a customer's address
  was arrived at. *Risk:* low. Nothing about what anyone is charged changes;
  these are labels only, and the English versions are unchanged.

  **4 · The Stripe webhook.** *Fixes:* the running copy predates the change
  that made its security check testable, so **the test we trust has been
  checking code that is not the code running.** Nothing is known to be broken;
  we simply cannot vouch for it until the two match. *Rides along:* a week of
  other written-but-unpublished changes to the payment modules. *Risk:* this
  one touches money. Worth doing, worth doing when you are awake.

  **5 · The two that would probably fail if used.** *Fixes:* `platform-billing`
  (the email telling a detailer their card was declined) and `report-problem`
  (the "something is wrong" form) are running from **before parts they depend
  on even existed.** Not "a bit out of date" — they are built from pieces we no
  longer have. If either is triggered, what happens is genuinely unpredictable.
  *Risk:* low to publish, because almost anything is better than what is there.

  **6 · Everything else.** The remaining 17. Mostly one or two small changes
  each, none customer-visible on their own. Cheapest to do in one go once you
  have decided you are happy publishing at all.

  **The recommendation, in one line:** do **2, 3, 5 and 6** together whenever
  suits you, and do **4** separately when you have a few minutes to watch it,
  because it is the payment one.

  **Why the order is this order.** **1 is first because it is the only one on
  this list a customer feels** — somebody waiting in a driveway for a job that
  was cancelled without telling them. **2 is second because what it buys is an
  ANSWER rather than a fix**: it matters enormously to us and not at all to a
  customer today. If you disagree with that ranking, say so and it changes —
  it is a judgement about whose day is worse, not a technical fact.

  **What happens if you do nothing:** the same as tonight. Nothing gets worse
  on its own. Items 3 and 4 are risks that are already live, not new ones — so
  "not yet" is a real answer, it just leaves them where they are.
  *Full technical detail in ROADMAP 0.6. Measured by
  `node scripts/deployed-inventory.mjs`, which now refuses to pass while any
  of them are out of date.*

- [ ] **DECIDE · The maintenance reminder needs your postal address, or it
  needs to stop. Added 2026-09-20.**
  The product sends customers a "your ceramic coating is due, book it in"
  email. **US anti-spam law treats that as marketing rather than as a receipt**,
  and marketing email has to carry an unsubscribe link and a real postal
  address. Ours carries neither.

  **The campaign feature already does this properly** — it refuses to send at
  all unless the business has a postal address on file. The maintenance
  reminder does not ask.

  **The question is not about the email, it is about the product.** To fix it
  the way the campaign does, **every detailer would have to give us a postal
  address**, and as far as we can tell nothing in setup asks for one. So:
  1. **Add a postal address to setup** and make the reminder use it. Correct,
     but it is a new required question for every detailer including you.
  2. **Turn the maintenance reminder off** until that exists.
  3. **Decide it is not marketing** — a judgment about what the product is
     for, which is yours and not a session's.

  **Recommendation: (2) now, (1) when you next touch setup.** Turning it off
  costs a feature nobody is relying on yet; leaving it on is a small legal
  exposure that grows with every detailer who signs up.

  **What a session must NOT do, and why this is a question rather than a fix:**
  the tempting shortcut is to put a placeholder address in the footer. That
  would be a false statement in a legal notice, which is worse than the
  omission. *Full detail in ROADMAP 0.7.*

- [ ] **DO · Turn on Resend's delivery reports (about three minutes).**
  *(ROADMAP 14.3)*
  The product now keeps a record of every email it sends and shows it on the
  client's record — who it went to, and whether it arrived. The "it arrived"
  half comes from Resend telling us, and Resend only tells us if you point it
  at us, and as of 2026-09-17 **it has never been pointed at us**.
  1. In Resend, go to **Webhooks** and add an endpoint.
  2. The address is the line printed below. It is the only one; there is no
     second "real" project to do this on as well.
  3. Tick the events **delivered**, **bounced**, **complained** and **failed**.
     The others are ignored on purpose.
  4. Resend then shows you a **signing secret** starting `whsec_`. **There is
     already one set**, from when this was built and proved — so if Resend
     shows you a DIFFERENT one, it has to replace the stored one or every
     report will be refused as a forgery. Paste it into the Supabase project's
     function settings as `RESEND_WEBHOOK_SECRET`. **Do not paste it into a
     chat, a document or this file** — it is the only thing that stops a
     stranger posting fake "this address bounced" reports about your customers.
     If Resend lets you reuse the existing endpoint's secret, nothing needs
     pasting at all; tell a session and it can prove which case you are in.
  Until that is done nothing breaks: every email still leaves a row saying it
  went out. The rows simply stay at *"On its way"* instead of turning into
  *"Delivered"*.

  **Andrew sent the address on 2026-09-17 and IT IS THE RIGHT ONE. The only
  thing still missing is the three minutes in Resend.**

      https://kguqylyzgyzfktkfnhjb.supabase.co/functions/v1/resend-webhook

  A session first told him this was only the "practice" address and that the
  real business needed a different one. **That was wrong and it is corrected
  here rather than quietly edited out**, because the mistake is the sort that
  sends somebody to configure the wrong thing. There is ONE project behind this
  product, and the live site runs on it: the bundle served by
  `detailingplatform.com` today was fetched and it talks to
  `kguqylyzgyzfktkfnhjb`. The other project in `CLAUDE.md`'s hard rule,
  `adtlnvihwrcqcasqcjwd`, is Andrew's **old, separate** business site
  (andrewsdetail.com, 22 tables). It does not run this product, so there is
  nothing about email tracking to install there and never was. It stays
  read-only for the reason `CLAUDE.md` gives: it takes real money today.

  **Two of the three pieces are already done, checked rather than assumed on
  2026-09-17.** The part that receives the reports is installed on the project
  (v9, one of 39), and the signing secret is set there (one of 22).

  **The third is not done, and there is a measurement rather than a guess.**
  Resend publishes an address, `delivered@resend.dev`, that always accepts mail
  instantly. **Eighteen** emails have gone to it from this product. Only
  **eight** ever turned into *"Delivered"* — and those eight are the ones a test
  reported on by hand. The other **nine are still sitting at "On its way", the
  oldest for 74 minutes.** If Resend were calling us, all eighteen would have
  flipped within seconds. So the endpoint has never been added in Resend's own
  dashboard, which is steps 1-3 above.

  **RE-MEASURED 2026-09-18, doing ROADMAP 5.3, and it is still not done.**
  The practice database was rebuilt since the last count, so the old numbers
  are gone and these are fresh: **every single email this product has sent to
  Resend’s own always-accepts test address is still sitting at “On its way”.**
  Not one has ever turned into “Delivered”. If the endpoint were added, they
  would all flip within seconds. The receipt work finished today puts the
  emails for a job right on the job’s own screen — what was sent, when, and to
  whom — and the one column that stays blank is whether it arrived. **Your
  three minutes in Resend is the only thing missing.**

  **Nothing is broken while it waits** — every email still leaves a row saying
  it went out. The rows just never learn what happened to them, which is the
  half 14.3 was built for.

- [ ] **DECIDE · Test accounts: flag them, or delete them?** *(ROADMAP 0.3)*
  The back office lists 16 detailers and 15 are fakes, plus rows like "Smoke
  TPMOY" in the client list. **Recommendation: flag, don't delete.** About 60
  automated checks work by signing into a seeded fake business and clicking
  through it. Delete the fakes and roughly 60 checks stop being able to run —
  and a check that cannot run prints something that looks very like a pass. You
  would lose the safety net for all 79 roadmap items in exchange for a tidier
  screen. Flagging gets you the same clean screens and keeps the net.
  **Answer needed: "flag" or "delete".**

- [ ] **DECIDE · `/ex5` is called "Tampa Bay Auto Detail".** *(ROADMAP 1.2)*
  It is a public example site using what is probably a real firm's name and
  email domain. The XPEL half is already fixed. **Recommendation: invent a name
  and a domain** — the page demonstrates exactly the same thing and the question
  disappears. Costs nothing. **Answer needed: "rename" or "leave it".**

- [ ] **DECIDE · `andrewsdetail.com` is on the public marketing page.**
  `LandingPage.jsx:631` shows your real business domain in a mock browser bar as
  the example. Two other mentions in `AdminPage.jsx` are operational notes that
  are true and useful, and should stay. **Recommendation: swap the landing-page
  one for an invented domain.** **Answer needed: "swap" or "leave it".**

---

## Scheduled — not blocked, just not yet

- [ ] **DO · Open the Stripe account. December 2026, your 18th birthday.**
  Yours, not a parent's — confirmed 2026-09-16. Target: live about three months
  from now.
  **Nothing is waiting on this.** Every Stripe path in the product — checkout,
  webhooks, subscription renewal, failed-payment retry, Connect onboarding —
  can be built and proved in **test mode** today, and that work is not blocked.
  Each detailer connects **their own** Stripe account, so their age is their own
  affair and none of it depends on yours.
  **When you do it, what we will need from you:** the publishable key, the
  secret key, and two webhook signing secrets (one for platform billing, one for
  connected accounts). Paste them into `.env` — never into chat.

- [ ] **DO · Sign up for text messaging, and register the number.** *(ROADMAP 3.3)*
  **Telnyx, at $0.0040 a message** — about half of Twilio's real cost once
  carrier surcharges land. One platform number for everybody, not one per
  detailer, which is what you asked for and is much cheaper and simpler.
  At a few hundred reminders a month this is **under $5/month**.
  **The slow part is US A2P 10DLC registration** — a one-time carrier
  registration that can take days to weeks. One registration, one number, one
  brand. **Start it before you need it.**
  **When you do it, what we will need:** the Telnyx API key and the phone
  number. `.env`, not chat.

- [ ] **DO · Decide a business name and set up the entity.**
  Right now your terms and privacy pages are a contract with you personally,
  rather than with a company. This matters more than a lawyer does — and you
  already ruled that we edit lawyer-written templates rather than hire one, so
  the wording work is ours. **The name and the entity are yours.**

- [ ] **DO · The paid email plan — around December 2026, not before.** *(ROADMAP 3.2)*
  Roughly $60. **The audits were wrong about this being urgent**: they assumed a
  hard daily wall, and you have sent 100+ in a day with no failure. Revisit when
  there are real customers.

- [ ] **DO · Netlify build credits, if publishing matters.**
  Credits ran out once and the state has flipped twice without anybody noticing.
  A production deploy costs 15 credits; **a deploy preview costs zero and is a
  real link you can open on your phone**, so most work needs no credits at all.

- [ ] **DECIDE · The job record's action bar looks different on a phone's
  slide-up panel, and that was my call rather than yours.** *(FOUND.md, the
  pinned-bar entry)*
  On the job page and at a desk, the box holding Call / Text / Navigate is now
  a rounded card lined up with the cards under it — the thing you asked for on
  2026-09-18. **On a phone, when you tap a job out of a list, the same box is
  still a full-width band with square corners.** I left it that way on purpose:
  there it runs wall to wall across the panel's own top edge, and a rounded
  corner cut out of a wall looks like a mistake.
  **To see it:** open Money on your phone, tap any job under *Waiting on
  payment*, and look at the top of the panel that slides up.
  **My recommendation: leave it.** It reads as that panel's own header rather
  than as a box sitting in it. Say the word and I'll round it to match the
  other two — it is a two-line change and the check already measures it.
  *Not blocking anything. Answer whenever you next look at a phone.*

- [ ] **DECIDE · Large text on a small phone. Added 2026-09-20.**
  **One question, and it is about a promise rather than a bug.**

  **What a person sees.** Somebody on a small phone who has turned their text
  size up to double opens your dashboard. The page now has half as much room
  as it thinks it has — so on some screens things run off the right-hand edge
  and they have to drag sideways to read a line. Worst is the calendar, where
  about a finger's width of the screen is off the edge. The booking page your
  customers use is very nearly fine; it is the back office that suffers.

  **Why it is a question and not a defect.** We say in our own notes that the
  narrowest screen this product supports is 320 pixels wide. At double text
  size on a small phone the page behaves as if it were **160** — half our own
  floor. So nothing is broken by our own rules; the rules just never
  considered this person.

  **The two ways:**
  * **Move the floor.** Make the screens work all the way down. *Costs:* real
    work on the dashboard, for a setting most people never touch that far.
  * **Change the promise.** Say plainly that at very large text on a small
    phone some back-office screens scroll sideways. *Costs:* nothing to build,
    and somebody in that situation has a worse time of it.

  **My recommendation: change the promise, and fix only the booking page.**
  That is the screen a CUSTOMER sees, it is 19 pixels from fitting, and a
  customer with large text should never be dragging your booking form
  sideways. The dashboard is yours and you can zoom less on it.
  *Not blocking anything. Answer whenever.*

---

## Thirty seconds, with your phone reading to you — you are the only instrument for this too

**ROADMAP 8.5b, and it is the last piece of the accessibility work.**
Everything a machine can check is checked and clean: every screen now has a
proper "main content" marker, headings run in order, and no image is missing
its description. **What no script can tell us is whether the page makes SENSE
when it is read out loud** — whether the order is sane, whether it says
something useful, whether you can find your way back. That needs ears.

**What to do, once:**

1. **Turn your phone's screen reader on.** iPhone: Settings → Accessibility →
   VoiceOver. Android: Settings → Accessibility → TalkBack. There is a
   shortcut to turn it straight off again on the same screen — worth noting
   before you start, because it changes how you tap.
2. **Open your own booking page and try to book something**, listening rather
   than looking. One service, any date, then stop before you press the last
   button.
3. **One question: could a person who cannot see the screen finish this?**
   Not whether it sounds elegant — whether they could get to the end.

**Then tell me either "they could" or where you got stuck**, in your own
words. If you got stuck, that spot gets measured and fixed the way everything
else tonight was.

*Blocking nothing. 8.5b stays open until somebody has listened to it.*

---

## Thirty seconds, outside, in daylight — you are the only instrument for this

**ROADMAP 8.3, and it is the only thing left on it.** Everything a machine can
check is checked: every one of the 1,910 pieces of text on eight screens was
measured at four widths and one of them was too faint — the little time under
the message bubble on the home page, 4.20 against a 4.5 floor. It is fixed.
**Glare is the half no script can reproduce, and that is why this is yours.**

**What to do, once:**

1. **Go outside in daylight.** Not next to a window — actually outside, the
   way you are when you are standing at a car.
2. **On your phone, open your dashboard and look at Today.** That one screen.
3. **Ask one question: which words are hard to read?** Not whether it looks
   good — whether you can READ it. The small grey lines under the numbers and
   the little labels above them are the ones to look at.

**Then tell me either "all readable" or the words that were not.** If it is
all readable, 8.3 closes and there is nothing further to build. If something
is hard to read, name it and it gets measured and fixed the same way this one
was.

*Blocking nothing else. 8.3 stays open until you have done it.*

---

## Done

- [x] **Stripe ownership decided — 2026-09-16.** You, not a parent. December.
- [x] **No lawyer for the legal pages — 2026-09-16.** *"If you could find the
  templates, then just edit them."* Accepted; the rewrite is ours.
- [x] **Texting is one platform number, not one per detailer — 2026-09-16.**
- [x] **The demo account's dual access is deliberate — 2026-09-16.** You set it
  up that way on purpose. **It must not be "fixed".** It comes out before the
  first real detailer signs up, and it is tracked as ROADMAP 12.4 — not before.
