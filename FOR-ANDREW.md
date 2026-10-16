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

## DO · Say "merge it" once more on two fixes (ROADMAP 97.1 and 97.2)

Your "merge it" this afternoon did not go through for either. Nothing in the
work was wrong. The belt tripped over its own rules:

- **97.1, the clock-change Sunday bookings.** One of its tests ran a small
  program, which the belt does not allow. The supervisor changed that one line
  and re-checked it. The next clock change is 1 November.
- **97.2, the duplicate-booking answer that showed private details.** It was
  held because an unrelated test got a different error page from the internet.
  The belt no longer holds work for that.

**Recommendation: say "merge it" on both.** The belt restarts itself on the
fixed rules when this supervision ends.
97.3's test has now been rewritten; it has its own row just below.

## DO · Say "merge it" on 97.3, then set up the scheduler's key at your next release (ROADMAP 97.3)

Until now anybody on the internet could start the reminder sweep, the weather
refresh, the job watcher and the nightly photo check. That is fixed in the code:
each one now needs a password-like value (the "cron secret") on every call, and
the scheduler is set up to send it. Proved here, without touching the internet
or any real key: all four refuse a call without it and run with it, and the
"send reminder" button in a job still works with no change.

**First, say "merge it" on 97.3.** The test the belt refused last time has been
rewritten the way the supervisor asked: no local server, no fake keys, no
secret read.

**Then, at your next back-end release, these steps in this order.** Nothing is
decided here; these are the setup steps.

1. **Make the value.** In your password manager, generate a random 40-character
   password (letters and numbers only) and save it as "Detailing platform —
   cron secret". It lives there and nowhere else. Never paste it into a chat, a
   document or this repo.
2. **Put it in Vault.** Supabase dashboard, project `kguqylyzgyzfktkfnhjb` (not
   your business's project) → Vault (under Integrations; or type "Vault" in the
   dashboard search) → Add new secret. Name: `cron_secret`. Value: the password
   from step 1.
3. **Put the same value on the server programs.** Same project → Edge Functions →
   Secrets → Add. Name: `CRON_SECRET`. Value: the same password.
4. **Check step 2 landed.** SQL editor, run
   `select name from vault.secrets where name = 'cron_secret';` — it must show
   one row (it prints the name only, never the value).
5. **Update the four scheduled jobs.** SQL editor: paste and run the whole of
   `supabase/migrations/20261016100000_cron_jobs_send_secret.sql`. It is safe
   before step 6: the programs running today ignore the extra value.
6. **Publish the four programs**, with your next back-end release:
   `send-owner-reminders`, `refresh-weather`, `watch-jobs`, `photo-reconcile`.
   **Not before steps 2–5** — published first, every scheduled run is refused
   and reminders stop going out.
7. **Check it worked, about 20 minutes later.** SQL editor:
   `select status_code, count(*) from net._http_response where created > now() - interval '30 minutes' group by 1;`
   You want only `200`. A `401` means the two values in steps 2 and 3 differ;
   a `503` means step 3 is missing.
8. **For two of the test suites, afterwards.** `tests/dead-mans-switch.test.mjs`
   and `tests/customer-reminder.test.mjs` call the live watcher and sweep, and
   once step 6 is done they will be refused too. Add `CRON_SECRET=` with the same
   value to the repo's `.env` yourself, then ask any session to add the header
   line to those two suites (ROADMAP 97.3 names the exact change). The supervisor
   kept that out of this item so its own test reads no secret.

If you skip this row, nothing breaks: the jobs stay open to strangers exactly as
they are today, until the four programs are published.

## DO · Unfinished receipt cleanup (ROADMAP 14.39)

The fix is built and committed locally: a receipt upload remains recorded even
if its reply is lost or the tab closes, so the nightly job can reclaim it.
The local proof passes and catches a deliberately retained file. The required
real-R2 cleanup proof is unfinished because this runner has none of the existing
R2 environment that is configured in your Supabase function secrets.

**Your move:** arrange a proof runner with that existing R2 environment;
keep secret values out of chat and docs. Recommendation: use the committed
proof's real-R2 mode before releasing, rather than treating the local result
as evidence about Cloudflare. It saves a manifest before writing each fixture
and has a recovery command for an interrupted run.

**Release step, not a decision:** apply this item's two new migrations in order,
then publish `photo-door` and `photo-reconcile`. A session repeats the real-R2
sabotage, successful receipt and scheduled-cleanup proof before ticking 14.39.
The exact files, commands and limits are in
[the unfinished-receipt release guide](docs/receipt-abandonment-release.md).
No new public upload origin, account setup or allowance decision is requested.

## RELEASE STEP · Expense receipts use the new photo store (ROADMAP 0.11cc)

The final upload switch is committed locally. Your cron, its timeout and the
10 GB allowance were already live; they were checked again without changing
the database. No new account setup or decision is needed for those steps.

Before publishing the app, have the session for **98.5** repair the stale photo
checks and get the full photo and Spanish run green. The protected tests were
left unchanged by this job, and their failed output is saved. Then include the
receipt switch in your ordinary app release; a session verifies the published
upload and ticks 0.11cc. The control-room copy on port 5180 has a separate
browser-origin restriction, so its transport check records that limitation.
The failed-upload cleanup gap found during proof is now numbered **14.39**;
all of this job's temporary receipt files and expenses were removed.

## DO · Let deleted gallery images leave Cloudflare's cache (ROADMAP 0.11bd)

The deletion fix is built locally. It needs a new Cloudflare **Cache Purge**
permission for **detailingplatform.com**, separate from the R2 upload setup
you already finished. Create a token restricted to that zone, then save it
directly in this platform's Supabase function secrets as `CF_CACHE_PURGE_TOKEN`;
save the domain's Zone ID as `CF_MEDIA_ZONE_ID`. Configure those before you
publish **photo-door**, or the new code refuses media deletion.
The exact account steps and repeatable checks are in
[the deletion setup](docs/media-cache-deletion.md). No values go in chat.
The local check catches the old cached-image leak. The real browser check
reproduces it at phone and desktop widths: the original URL remains `200 HIT`
after the deployed door says it removed the file; a separate origin read is 404.
Cached deletion with the new fix is still unproved and the box is open.
After setup and your publish, a session repeats the real warmed-URL check.
These are server checks. ROADMAP 0.11be separately repairs the Gallery Remove
button, which currently deletes only the row. Recommendation: require that
button's browser proof as well as the cache proof before calling gallery
removal complete; the session can build it while this account setup waits.

## DO, AT YOUR NEXT RELEASE · Bring the server up to the saved code (ROADMAP 98.2)

The red server inventory is a real release backlog, and was already red before 14.24 refreshed it.
Recommendation: use your existing `0.6b-handoff` launch checklist in "YOURS, WHEN YOU LAUNCH" below.
Full green also waits for the separate `platform-admin` release (4.3c) and the Google function's
migration-before-function release (99.1). Those remain their existing jobs; this adds no new decision.
After those releases, have a session run `node scripts/deployed-inventory.mjs` and
`node scripts/receipt.mjs receipts/deployed-inventory.json`, retain the receipt, and tick 98.2 only when both pass.
The session has not pushed, published, deployed or changed a check to hide the backlog.

## DO, AT YOUR NEXT RELEASE · Use the shorter email dates and times (ROADMAP 99.2a)

The email formatter is built locally: `10:00 AM` becomes `10 AM`, real minutes stay, and the long date loses its year.
Long links and Spanish fact labels also wrap inside a phone. This is the first part of 99.2; the new wording, consent box,
message routing and automatic texting are still separate work, so this does not make texting ready for registration.

**Your move:** include the functions that bundle `supabase/functions/_shared/emailKit.ts` in your next planned release,
then have a session verify a real confirmation's subject, body and plain-text copy. Publishing the app alone does not update
emails. The session has not pushed, published, deployed, enabled texting or spent money. Before/after copies are in the
control room's `shots/99.2` folder. No decision about the approved wording is being reopened.

**Added 2026-10-11, same release (99.2c):** the seven customer booking emails now carry your approved wording ("You're booked
for Friday at 6 PM", "New time: ...", "Your Friday appointment is cancelled", the Pick another time and Book again buttons),
in English and Spanish. "Today" and "tomorrow" follow the business's own time zone. The same email functions carry it, so
one release covers both parts. The live-email check `scripts/dashboard-notifies.mjs` accepts the old and the new subjects,
so it stays honest on either side of the release.

**Added 2026-10-11, same release (99.2d):** the receipt, the invoice and the thank-you email now use your approved
wording, and every email a customer gets ends "Thanks again, Andrew · Andrew's Auto Detail · andrewsdetail.com" (the first
name comes from the Team screen; with none set it signs as the business). A new switch on Notifications, "Sign emails with
the business name", swaps the first name for the business name. **One extra step for that switch only:** apply the new
database file `supabase/migrations/20261011010000_email_sign_as_business.sql` (one added on/off column, off for everyone).
Until it is applied, every email still goes out signed with the first name and the rest of the Notifications screen
saves normally; only turning that one switch on would fail. Publish `send-invoice` and the other email functions in the
same release. No decision is waiting on you.

**Added 2026-10-11, same release (99.2e):** the emails you get as the detailer now read the way you approved ("Maria Lopez
wants Friday at 6 PM", "New booking: Maria Lopez, Friday at 6 PM ($185)", "Tomorrow at 6 PM: Maria Lopez, 1234 Oak St",
"Your card didn't go through"), and a promo or maintenance-due email ends with the same sign-off. Include `invite-user` and
`send-owner-reminders` with the other email functions. Two things were done differently from the plan, on purpose: the
request email keeps one "Answer this request" button instead of separate Accept and Decline buttons, because nothing can
accept from an email yet; and the maintenance email does not say "two months since your last detail", because it is about
a deadline you set, which can be any length of time. Nothing to decide.

**Added 2026-10-11, same release (99.2f):** the booking page now has the exact filed text-consent sentence under Phone,
unticked, with Privacy and Terms links. The Privacy page now includes the mobile-information paragraph. Both booking
choices and saving consent are proved locally with no real messages or database writes. **Publish `create-booking`
before publishing the app**, so the new checkbox actually saves the choice. The same publish also turns on the short-phone refusal (ROADMAP 99.8: a 7-digit number is refused with a 400), proved locally. Its existing consent columns need no new
database change. A session then checks checked and unchecked bookings against the released function and ticks 99.2f.
Automatic texting stays off; the relay, templates and routing are the remaining parts of 99.2. Do not submit or pay the
texting registration just from these local copies: the checkbox and privacy paragraph must first be live. No new decision.

---

## DECIDE · One text message needs fewer words (ROADMAP 99.2g)

The exact approved “You're all set” booking text cannot also meet the required one-text limit: it is already too long when
the bare `detailingplatform.com` link is added, before a usable booking path. Please approve a shorter version of that one message that keeps the
appointment facts and “Reply STOP to opt out.” My recommendation is to shorten the sentence, not buy or configure a
second short web address just for texts.

---

## AT RELEASE · Twenty minutes on your iPhone with the keyboard up (ROADMAP 2.15 and 8.2)

The booking page's bottom bar is proven clear of every choice on every screen size a computer can pretend to be. What no computer can pretend is the iPhone keyboard, and that is the one question left. Four booking steps have a text box: vehicle, address, name/phone/email/notes, and the promo code. On each, tap the box, type three letters, and look: can you still see what you are typing and the button you need next? Does the bar sit behind the keyboard, or ride up over the box?

**How:** on the computer run `npm run dev --prefix app -- --host`, open the `Network:` address it prints on your phone (same Wi-Fi), and follow section 5 of `docs/testing/phones-we-do-not-own.md`, steps 4, 5, 7 and 8. Tell a session what you saw, even if it is "nothing wrong at all". That answer closes both items. (Andrew, 2026-10-12: nothing here needs you before release — this is release-time, not a task for today.)

**Nothing is broken.** Sessions have already checked everything a computer can check, and the walk itself is guarded by a test (6 of 6 passing today). This waits until you are about to release.

## DO, WHEN YOU LIKE · Type this month's real bills into "Did we make money?" (ROADMAP 9.14c)

The profit screen is finished and proven: a session typed four test bills into it, checked every figure against two separate sums, and then removed them. What it did not do is enter YOUR bills, because nobody here knows what you actually pay, and a saved bill cannot be removed from the screen yet.

**How:** open `/admin`, press **Money**, and find **Did we make money?**. It opens on the current month. For each bill (Netlify, Supabase, Resend, the domain, anything else), pick its kind, type the dollars, add a note if you like, and press **Save this bill**. If a month really cost nothing, save one $0 bill so it reads as $0 rather than "Costs not entered".

**Check before saving.** A wrong bill stays there until edit and delete are built. Nothing else is waiting on this.

## DO · Publish the two 4.3 pieces and check them live (ROADMAP 4.3b + 4.3c, you said go 2026-10-13)

You approved publishing both pieces and checking them live. Piece one (4.3b) puts orphaned history rows onto the live panel — publish `platform-admin`. Piece two (4.3c) is the support-session lock: the migration plus the functions sharing `_shared/tenant.ts`. **Known consequence, your call:** until 4.3c part (a) is built, the preview's "Let me make changes" button promises what the server refuses — pressing it shows *WORKING in … Anything you change is theirs* while every save is refused. If that is acceptable for now, publish in this order: migration first, then the functions, then check Coastline's detail (4.3b) and the preview banner (4.3c) live. A session ticks the boxes after.

**Update 2026-10-13, about the "merge it" questions on 4.3c: please don't answer them yet.** Two separate jobs built the fix for that button, each in its own way, and the two versions can't both be kept. One also has the two-hour time limit. The other keeps your button working if the website goes live before the server half does. A follow-up job (ROADMAP 4.3e) combines them into one version and then asks you once. Nothing needs doing from you until then.

**Recommendation:** publish, since you said go — but expect the unlock mismatch above until (a) lands, and do not demo the unlock button live before then.

## DO · Publish the booking-preview fix after it is prepared (ROADMAP 9.1b)

You already said go, and the live comparison ran. The same demo business shows **9 of 12** on the dashboard and both back-office views at phone and laptop widths. However, the booking preview in Business is blank: the live site's protection header forbids loading that page inside the dashboard. That leaves the required browser check red, so 9.1b and 9.1 remain open. Nothing was published or changed in the live business records.

**Update 2026-10-13: the fix is built and proved (ROADMAP 9.1c).** One new line in the site's settings lets only our own dashboard show booking pages inside its frame. The dashboard and back office still refuse to be shown inside anyone's frame, and checked on a copy of the site on this computer they both refused. The preview showed the real booking page at phone and laptop width with no errors. Your step: publish as usual. Ten seconds after publishing, open Business on your phone; under "What customers see" you should see your booking page instead of a white box.

**Recommendation (Andrew said fix now, 2026-10-12 — ROADMAP 9.1c builds it):** have a separate session prepare and verify a narrowly scoped fix that allows the intended booking preview while keeping the dashboard and back office protected. Once that fix is ready, you publish it; a session then reruns `node --env-file=.env scripts/live-setup-counts.mjs` and its `--break=count` control. This is a publication step after a fix is prepared, not another request to authorize the comparison. Proof: `receipts/live-setup-counts.json` and `.sabotage.json`; commands, revisions, discovered-of-expected targets, console findings, and inspected screenshots are recorded under ROADMAP 9.1b.

## LOOK, THEN LATER DO · Connect Google Business, built up to Google's gate (ROADMAP 99.1)

The screen is there: Business, then **Google Business**. You can connect and disconnect, and if Google says no or the link breaks it says so in plain words and says your Google listing was not touched. **Nothing is sent to Google yet**, and the screen says so while that is true. Google still has to approve the permission (ROADMAP 0.15) before hours and services can reach a listing.

**Look (ten seconds, on your phone):** Business, then Google Business, and check the spacing and wording. If you dislike it, tell me what and I change it. **Later, when you publish:** apply the new database change, deploy the `google-business` function, and only then publish the app. Published without the function, an owner is wrongly told "Only the owner can connect Google."

**Recommendation:** leave it unpublished until 0.15 is through, so detailers are not shown a Connect button that cannot do anything yet.

## DECIDE · The test emails (ROADMAP 3.4 and 3.4g, 2026-10-10)

Every email the product sends has been drawn in English and Spanish and read for mistakes; the faults that turned up were fixed. What is left is sending one real copy of each to an inbox, which uses part of the 100-a-day email allowance shared with your real business. You earlier said not to spend it just to tick a box, so no session sent anything.

**Recommendation:** drop the sending. It would only prove the same delivery pipe works sixteen more times. Say "drop it" and the two roadmap items get closed as "drawn and reviewed". If you do want real copies, name the inbox address and a session will send one of each, once.

## LOOK AND DECIDE · The rebuilt back office, all four places (ROADMAP 9.12a, 2026-10-10)

**2026-10-12 price-editor follow-up:** in the Control Room's 9.12a Before/After, compare the compact phone preview, then the laptop editor pair. The three monthly prices now stay visible without opening; open All prices and contract for the full table, then Change these prices for grouped plus/minus controls. The saved copies are viewable without publishing. Keyboard folding preserves typing, successful saves and refusals were exercised with intercepted writes, and the normal/lite browser receipts each reached 6 of 6 widths with no failures (`node scripts/office-prices.mjs`, `--lite`, at `98d30e12`). If the layout still looks wrong, describe the spot and it changes. The broader compact-preview work and 6c–6e are still ours to build; no new approval is needed to continue.


**Updated 2026-10-10: Today, Detailers, Money and System are all built now.**
Run the dev server, sign in at `/admin` as usual, then open `/admin/office`. You
get the dark look you approved, with a side rail (a bottom dock on a phone) and
four places. **Today:** this month's money and the five things waiting on you.
**Detailers:** one list, a health ring and setup bar on every row; click a row
for the side panel, and press **Ctrl K** to find anyone. **Money:** what you kept,
where it went, income by plan and the bills. **System:** how many checks are
working, and only what is broken or never proven standing out.

**Already proved, so you judge only the look:** nothing overlaps at laptop,
tablet and phone widths, the console is silent, and an account with no phone
number gets no Text or Call button. Bills nobody typed in say "Not entered" and
are never guessed. **On purpose, not like the mockup:** the setup bar has 12
segments (the detailer's own screen counts 12 steps), the health score is a rule
of mine with every point listed in the panel, and System leaves out the mockup's
text-message, sign-in and website-uptime checks, because nothing feeds them yet.

**What I need from you, two things:**
1. **Do you accept the look?** If not, say what is wrong and it changes.
2. **Where the old screen's leftover jobs go — the account actions and price editor are now built,
   so you can judge the result rather than a plan (2026-10-10).** A green **Sign
   up a detailer** button sits at the right of the Detailers list, and every
   detailer's side panel has a **Their account** part with **Download everything
   they own** and **Send an owner invite**. Proved with made-up detailers, nothing
   written: both the success and the refusal case, at laptop and two phone
   widths, 81 checks and 0 failed. Still to build, same way: a past-month switch on Money and the mail list on System. If you want any
   of them somewhere else, say where and it moves. The old `/admin` stays
   untouched until all six have a home.

## DECIDED · When an email does not arrive (ROADMAP 3.4e, 2026-10-10)

The plan for how a detailer finds out an email failed, and texts the customer
instead, is written: `docs/email-failure-recovery.md`. **Built 2026-10-10,
because it does not depend on these answers:** a red line on a job when an
email about it did not arrive, and a ready-made "Booking confirmed" text to send
instead. The three below are the rest of ROADMAP 3.4f. Three yes-or-no answers, each with a
recommendation:

1. **Show "Emails that did not arrive" on Today**, listing upcoming jobs whose
   email bounced, so the detailer is told without going to look. **Recommend
   yes.**
2. **When a customer marks an email as spam, stop marketing and maintenance
   email to them.** Booking emails still go. **Recommend yes**, because it
   protects the sending address every detailer shares.
3. **When the product's own texting is switched on, text automatically when a
   booking email fails.** **Recommend yes, but decide it on the day texting is
   built**, because each text costs money.

**Andrew answered 2026-10-10: no, no, no — keep things as they are.** The three
proposals are declined and must not be re-presented as pending choices.

## DECIDED · Every message the product sends, listed (ROADMAP 3.4b, 2026-10-10)

Every email, push alert and text is now in one table, with who gets it, why,
when, and what changes: `docs/communication-lifecycle.md`. It finds **no message
to remove and none to merge**. One thing is yours to answer:

1. **The "alerts" switch on the Notifications screen is ignored by 8 of the 12
   alerts you get.** Turning it off stops only the phone you are holding; every
   other device still buzzes for a cancelled job, a moved job, an edited job,
   "starting soon", "wrapping up", "finalize payment", "still waiting on you"
   and the morning summary. **Recommend yes: make all eight obey the switch.**
   It is one check in four places.

**Andrew answered 2026-10-10: no — keep things as they are.** The eight alerts
continue with their present behavior; this is not a pending implementation choice.

## YOURS, WHEN YOU LAUNCH · Put the back-end programs live, in this order (ROADMAP 0.6b, written 2026-10-11)

**This is the one to follow.** The two older publish blocks further down are kept for
their reasoning. Both have a line that would publish everything at once if its list
came out empty, and each now says so. **This is your switch, and you flip it when you choose.**
Your ruling of 2026-09-24 stands: nobody is on the site, so leaving this for launch
day is a choice you made, not something stuck. No session will run it for you.

**What it does.** Several back-end programs on the server are older than what we have
written. Most of the gap is two shared files every program carries: the read-only
lock for "Look at their dashboard", and the email wording. The check below names them.
The list is not written here, because a typed list goes stale within the hour.

**The order, and why.**
1. **`update-booking` first, alone.** It is the program that emails a customer when
   you cancel or move their job from your dashboard (ROADMAP 3.4, finding 1–2). A
   customer whose job you cancel has to hear about it, so this goes first.
2. **Then one small database change, then everything else in one pass.** The change
   adds one empty column so the "Emails we sent" list can show an email's content
   (ROADMAP 3.1d). It must go **before** `send-email`. Published first, `send-email`
   would try to save into a column that is not there, and the record of every email
   would quietly stop.
3. **`platform-billing` alone.** It charges detailers for the platform.
4. **The payment webhook last and alone.** It touches money, so if anything goes
   wrong there is only one thing it can have been. This is your rule and it has not
   changed.

**Held back on purpose: `platform-admin`.** Published today, it would make your "Let
me make changes" button promise you can edit while every save is refused (ROADMAP
4.3c). It goes up when 4.3c is finished, and that session removes it from the held
names in step 2. **Also not in this list: `google-business`**, which has never been
published and waits for Google (ROADMAP 99.1).

**Open Git Bash. Before you start — two reads, nothing changes:**

<!-- 0.6b-handoff:start -->
```bash
cd /c/Users/rando/Downloads/claude/detailing-platform
set -a; . ./.env; set +a
git status --porcelain supabase/functions
node scripts/deployed-inventory.mjs
node scripts/migration-drift.mjs
```

The `git status` line must print **nothing**. If it prints a file, a session is
changing the programs right now. Stop, because the steps would publish different
copies of the shared files. The inventory prints the out-of-date programs by name.
That list is the only one to trust, and step 2 reads it for you.

**Step 1 · the cancellation email:**

```bash
node scripts/deploy-functions.mjs update-booking
```

**Step 2 · the one-column change, then everything else the inventory named:**

```bash
node scripts/apply-migrations.mjs 20261010010000_email_sends_keeps_the_body.sql
LIST=$(node -e "const hold=['update-booking','platform-admin','platform-billing','stripe-webhook'];const l=JSON.parse(require('fs').readFileSync('receipts/deployed-inventory.json','utf8')).dimensions.differing.filter(f=>!hold.includes(f));if(!l.length){console.error('NOTHING TO PUBLISH IN STEP 2 - go on to step 3');process.exit(1)}console.log(l.join(' '))") && echo "$LIST" && node scripts/deploy-functions.mjs $LIST
```

**Why the second line is shaped like that.** Given no names, the publishing program
publishes **every** program at once, including the payment webhook. So the line
stops if the list comes out empty, and never hands it zero names.

**Step 3 · platform billing, alone:**

```bash
node scripts/deploy-functions.mjs platform-billing
```

**Step 4 · the payment webhook, last and alone. Nothing else running:**

```bash
node scripts/deploy-functions.mjs stripe-webhook
```

**Then check it took:**

```bash
node scripts/deployed-inventory.mjs
```
<!-- 0.6b-handoff:end -->

**What "done" looks like.** The last check names **only `platform-admin`**, the one
held back. If it names anything else, that program did not publish. Tell a session
its name, and do not re-run step 2. If any step prints `FAILED`, stop there. The
publishing program stops at the first failure and says which one.

**New, 2026-10-11: your push now does this check for you (ROADMAP 0.6d).** When you push
to `main`, which is the website release, the computer first runs the same check as the
first step above. It takes about seven minutes. If any program on the server is older
than the website you are pushing, the push stops and lists them by name. Nothing is
published either way. Publish them with the steps above, or, to send the website out
anyway, push with `SHIP_WITH_DRIFT=1 git push`. Expect it to stop even after the steps
above: `platform-admin` is held back on purpose and `google-business` has never been
published, and that is when pushing anyway is the right answer. Pushes to any other
branch are not checked.

**Two rules for the whole thing.** Do not publish while a browser check is running on
the practice business. And this does not touch the website: no Netlify credits.

**Checked 2026-10-11 without publishing anything:** `node --test
tests/publish-handoff.test.mjs` pulls these exact commands out of this block. It runs
step 2's name-picking line against today's inventory and against two made-up ones,
and checks the order: cancellation first, the webhook last and alone, the held ones
left out, an empty list refused. Three deliberate breaks each turn it red.

## Publish and apply — the one ordered list. Written 2026-10-06, re-ordered 2026-10-07.

> **DONE 2026-10-10, STEPS 1 TO 9 — NOTHING LEFT HERE FOR YOU.** Done by Claude
> with Andrew's explicit go-ahead, in this order, each step checked before the
> next: steps 1–8 (all 9 database changes plus the `site_build_start` one this
> list never named; 31 programs), then all of step 9 — CORS on the three buckets
> (9a1); the domain's DNS moved from Netlify to Cloudflare so the bucket could
> get its own address, and `media.detailingplatform.com` bound to
> `business-media` (9a2, full record in `docs/services-and-secrets.md` § 3a);
> `R2_MEDIA_BASE` set; `photo-door`, `delete-customer`, `photo-reconcile`
> published (9c–e); the nightly schedule and its timeout (9f); the allowance
> 1 → 10 GB (9g). **Checks at the end:** `migration-drift` PASS,
> `deployed-inventory` 41/41, `photo-release-order` 0 failed,
> `photo-door-deployed` 6/6, `r2-public-base` 5 pass + 1 that needs a real logo.
> **Step 10 is handed to the belt** (ROADMAP 0.11, answered on its card): flip
> `RECEIPTS_VIA_DOOR` and `MEDIA_VIA_DOOR` to `true`, run the photo and Spanish
> suites, prove one real upload of each kind (0.11d), commit. **The only thing
> still yours is the push that publishes the website afterwards.**

**This is the single list of everything that is built, finished and waiting on you
to switch on.** The rows further down this file keep the reasoning and the exact
wording; this list keeps the ORDER. **Nothing here is urgent** — your ruling of
2026-09-24 stands: nobody is on the site, so these are switches for launch day,
not chores.

**Three things about how to read it.** Every database change and every program
appears **once**, at the step where it should happen, so if you see something
twice anywhere else in this file, this list is the one to follow. **No session has
applied or published any of it.** And **the counts below are photographs** — they
carry the date and the commit they were taken at, and the two commands under
*Before you start* re-take them.

**Each step says the same four things:** what it is in plain words, the command,
which ROADMAP items it unlocks, and the one check to run afterwards.

### Before you start · Two reads. They change nothing.

```bash
cd /c/Users/rando/Downloads/claude/detailing-platform
set -a; . ./.env; set +a
node scripts/migration-drift.mjs
node scripts/deployed-inventory.mjs
```

**The first names the database changes that have never run.** When it was last
read it named **seven** of the ten files in this list.
**AND IT CANNOT SEE THE OTHER THREE, which is written in its own report rather
than hidden:** the nightly photo schedule (step 9f), the photo allowance number
(step 9g) and the name-length limits (step 7) are kinds of change it does not
compare. **So for those three, "it said nothing" is not "it is done."** The step
itself says how to tell.

**The second compares every program on the server against what we have written.**
Read at **2026-10-08 02:08 (commit `8fcb154`)**: **32 of 39 differ, 7 match.** The
32 are every program named in this list — the 31 in steps 1, 3, 5, 6 and 8, plus
`delete-customer` in step 9d.
**AND A PROGRAM THAT HAS NEVER BEEN PUBLISHED AT ALL IS IN NEITHER LIST.**
`photo-door` and `photo-reconcile` are new; they appear in neither the 32 nor the
7, so their absence from that check is not a sign they are live. Steps 9c and
9e are the only thing that puts them there.

**Two rules for the whole list.** **Never run `apply-migrations.mjs` with no file
names after it** — with none it tries to re-run every file in the folder. It stops
at the first failure and tells you which. And **do not apply or publish while a
browser check is running on the practice business**: a check measuring a screen
mid-change reports your change as a fault.

---

### Step 1 · Publish `report-problem`, alone

The "report a problem" form and the error emails. **Smallest and oldest, so it is
the test of the whole routine** — if this goes smoothly the rest will.

```bash
node scripts/deploy-functions.mjs report-problem
```

**Unlocks:** part of ROADMAP 3.4 and 3.1.
**Then:** `node scripts/deployed-inventory.mjs` — it should stop naming
`report-problem`.

### Step 2 · Apply the five database changes that the programs expect

Four of the five add something and take nothing away. The fifth takes one
permission away from the dashboard, which the dashboard does not use.

```bash
node scripts/apply-migrations.mjs 20260924010000_a_fixture_is_not_a_customer.sql 20261006010000_an_email_row_knows_its_booking.sql 20261006020000_hand_entered_platform_costs.sql 20261006030000_dashboard_language_reaches_the_server.sql 20261006040000_bookings_browser_updates_nothing.sql
```

1. **`20260924010000_a_fixture_is_not_a_customer.sql`** — a "test row" tick on
   customers, so your Clients list can keep the leftovers from automated checks
   out of the list and out of the figures at the top of it. Nothing is deleted.
   **You will see no change on your own practice business, and that is expected.**
   This line used to promise that the "gone quiet" figure would drop from 8 to 5;
   that was true on 2026-09-24 and is not true now. Measured 2026-10-09: your
   practice business has **13 customers and not one of them is a fake**, the three
   leftovers are gone from the database, and the headline already reads **5**. The
   command still ticks **31 fake rows on six other practice businesses you never
   open**. Think of it as fitting the filter before the dirt arrives.
   **Unlocks ROADMAP 1.3 and the client-list half of 0.3.** The screen is already
   written and appears with the website publish (step 11). The full version of
   this row, with how you will know it worked, is under *"Waiting on you"* as
   job **0.3b**.
2. **`20261006010000_an_email_row_knows_its_booking.sql`** — lets the record of
   each email say which booking it was about. **Unlocks ROADMAP 3.1.**
   **This one must be applied before `send-email` is published** (step 6):
   published first, it writes that new field and the record of every email sent
   would quietly stop being saved until the column exists.
3. **`20261006020000_hand_entered_platform_costs.sql`** — one table where you type
   what the platform costs you; only you can read or write it. **Unlocks ROADMAP
   9.14** together with `platform-admin` (step 4). If `platform-admin` goes first
   the screen shows an error on that one figure rather than a wrong number, on
   purpose.
4. **`20261006030000_dashboard_language_reaches_the_server.sql`** — saves each
   person's English or Spanish choice so emails to them can follow it. **Part of
   ROADMAP 3.4.** It changes nothing visible yet: no screen saves the choice today,
   so every email stays English until that small screen change is built.
5. **`20261006040000_bookings_browser_updates_nothing.sql`** — takes away the
   dashboard's permission to edit a booking directly; every edit already goes
   through the server. **Unlocks ROADMAP 8.10d.**

**Then:** `node scripts/migration-drift.mjs` should stop naming all five, and
`node tests/owner-writes.test.mjs` goes from one red line to green.

### Step 3 · Publish four programs together

```bash
node scripts/deploy-functions.mjs create-booking get-booking-receipt platform-admin send-owner-reminders
```

**HOLD `platform-admin` out of this line for now (supervisor, 2026-10-10).** The
copy on disk now carries the unfinished 4.3c lock (migration row 3 above). Published
today it would make "Look at their dashboard" refuse to open, because the table it
needs does not exist yet. The live copy (v63) already carries this step's
`platform-admin` parts (9.1, 9.14, 3.1, 9.18); only 4.3b's history fix waits with it. Publish the other three; `platform-admin` comes back when 4.3c is finished.

**Unlocks:** a double-press leaving one booking (6.4); the public ceilings (14.9,
14.18); the back-office costs read (9.14, with step 2.3); the back-office "Email
we sent" list's server half (3.1, with step 2.2); **the System health tab's error
(9.18) — that tab asks for this list and is answered about a parameter it never
sent**; setup progress agreeing between dashboard and back office (9.1); the
maintenance email's legal footer (0.7); the push-notification links pointing at
the job page instead of a page that does not exist (14.34).
**Then:** `node scripts/deployed-inventory.mjs` should stop naming all four.

**When you open the "Email we sent" list, nearly every row on the first screen
will be red, and that is the fake test accounts rather than anything broken.**
The seeded practice detailers use `@example.com` addresses, which are reserved
by the internet standards and can never receive mail, so the program refuses to
send to them on purpose and records each one as *"Not sent - that address cannot
receive email"*. **The rows worth looking at are near the top**: a handful that
say *Bounced* in red with the provider's own reason, and a handful that say
*Delivered*. Counts and the command that produces them are in `ROADMAP.md` under
3.1.

### Step 4 · Apply the two changes written after that list

Both are finished and tested on a throwaway database, and **the program works
without the table and says so in its answer** — it just does not do the extra
thing until the table exists.

```bash
node scripts/apply-migrations.mjs 20261006050000_action_log.sql 20261006062000_send_invoice_attempts.sql
```

1. **`20261006050000_action_log.sql`** — the memory behind "who completed,
   cancelled, no-showed, waived or deleted a job, and when" (ROADMAP 4.1). It
   holds the one field that changed and nothing about the customer.
   **Apply it before `update-booking` is published** (step 6): the other way round,
   the program works and logs the failure until the table exists.
   **AND IT IS TWO ITEMS WAITING ON IT, NOT ONE.** ROADMAP **4.7** is built: a
   detailer who picked the wrong answer on Finalize — said a job was paid when it
   was not, or gave it away by accident — can change it back from the job's own
   page. **That works today; what is missing is only the written record of the
   correction, which is this table.** Neither half changes anything a detailer
   sees.
2. **`20261006062000_send_invoice_attempts.sql`** — the memory behind "press Send
   invoice twice, get one invoice" (ROADMAP 6.4). **The website's half is done.**
   The protection starts only when both this and `send-invoice` (step 6) are done;
   until then a detailer who presses the receipt button twice in a bad signal still
   sends two invoices, which is what happens now.
3. **`20261010030000_support_sessions_read_only.sql`** — makes "Look at their
   dashboard" truly read-only at the database, not just in the browser (ROADMAP
   **4.3c**). Your own dashboard is untouched: the rule is on the support tab's
   sign-in, not on you. **Apply it BEFORE publishing `platform-admin`**: the
   other way round, "Look at their dashboard" refuses to open (on purpose, it
   will not open a tab it cannot lock). Publishing the other functions first is
   harmless. Proved on a throwaway copy of Postgres, not on the live one.
   **NOT YET — skip this one for now (supervisor, 2026-10-10).** As built, it
   would lock the preview so hard that your "Let me make changes" button stops
   working: the banner would say you are working while every save is refused.
   A session is building the fix (that button unlocks the server too, and the
   unlock is logged). This row comes back when that is proved. Rows 1 and 2
   are unaffected.

**Then:** `node scripts/migration-drift.mjs` should stop naming all three.

### Step 5 · Publish the remaining 24, in one pass

**SUPERSEDED 2026-10-11 by "YOURS, WHEN YOU LAUNCH" near the top of this file (ROADMAP 0.6b).** If this line's list ever comes out empty, `deploy-functions.mjs` gets no names and publishes **every** program at once, the payment webhook included. Use that block's guarded line instead.

```bash
node scripts/deploy-functions.mjs $(node -e "const x=['report-problem','create-booking','get-booking-receipt','platform-admin','send-owner-reminders','platform-billing','stripe-webhook','delete-customer'];console.log(JSON.parse(require('fs').readFileSync('receipts/deployed-inventory.json','utf8')).dimensions.differing.filter(f=>!x.includes(f)).join(' '))")
```

That line reads the names out of the check's own last answer, so it cannot go
stale. At the last read they were: `address-suggest`, `unsubscribe`,
`resend-webhook`, `send-email`, `accept-invite`, `available-slots`, `pay-booking`,
`track-visit`, `validate-promo-code`, `accept-quote`, `plan-link`,
`reschedule-booking`, `calculate-booking`, `booking-ics`, `cancel-booking`,
`send-invoice`, `respond-to-booking`, `update-booking`, `create-business`,
`invite-user`, `preview-emails`, `send-campaign`, `watch-jobs`, `connect-account`.

**Unlocks:** the price shown on the day, before the time (2.1, 2.1b); the second
car counted once (14.19); the rate ceilings on every public page (14.9, 14.18);
the booking-id link in the delivery record (3.1, with step 2.2); a repeated press
leaving one change (6.4, with step 4.2); Spanish and car-size wording in emails
(3.4); maintenance and campaign legal footers (0.7); **the written record of a
corrected payment (4.7, with step 4.1 — the correction screen itself is live
either way)**; and the sentence a long business name gets, which **step 7 needs**.
**Then:** `node scripts/deployed-inventory.mjs` — only `platform-billing`,
`stripe-webhook` and `delete-customer` should still be named.

### Step 6 · Publish `platform-billing`, alone

The paid-restart fix (ROADMAP 12.1). **Already done — measured 2026-10-10,
`platform-billing` v62 is running this fix; skip this step.**

```bash
node scripts/deploy-functions.mjs platform-billing
```

**Then:** `node scripts/deployed-inventory.mjs`.

### Step 7 · Apply the name-length limits — AFTER step 5, not before

**This is the one change in the whole list where the order is the other way
round: the programs go first.** A limit of sixty characters on the five names a
detailer types — their business name, their services, their add-ons, their service
groups and their plans.

```bash
node scripts/apply-migrations.mjs 20261007010000_tenant_string_lengths.sql
```

**Why after.** With `create-business` and `platform-admin` published first (steps
3 and 5), somebody typing a very long business name is told in a sentence that a
name can be at most sixty characters. Applied first, for the hours in between,
they are shown a line of database jargon with the words *"violates check
constraint"* in it — at signup, which is the first thing a new detailer ever does
here. Nothing is lost or broken either way; it is only which sentence they get.

**Nothing in the database is anywhere near the limit** — the longest business name
on there is 48 characters and the longest of anything else is 22 — so this cannot
make any existing row illegal. Checked by reading, before the file was written.
**Unlocks ROADMAP 2.15a's database half.**
**Then:** nothing to run. **`migration-drift` cannot see this kind of change and
will not mention it either way** — that is the check's own limit, not a problem.
To see it worked, type a 61-character business name on the signup form: it is
refused with a sentence.

### Step 8 · Publish `stripe-webhook`, last and alone

**Last because it touches money.** The ceilings (14.9, 14.18) and the email
wording (3.4) on the one program that handles payments.

```bash
node scripts/deploy-functions.mjs stripe-webhook
```

**Then:** `node scripts/deployed-inventory.mjs` — only `delete-customer` should
still be named, and step 9d is where it goes.

### Step 9 · The photos — ROADMAP 0.11, in this order and in one sitting

**DECIDED 2026-10-09: do this release now, for all customers.** This is no
longer waiting for a product decision. It is still your publish: follow the
steps below in order, run `node scripts/photo-release-order.mjs` after each one,
and do not publish the website until the photo tests and both English and
Spanish strings are green.

Everything for it is built and committed and none of it is live. **The reason for
"one sitting" is a rule from the design** (`docs/the-photo-allowance.md` § 2): the
allowance goes from 1 GB to 10 GB **in the same change that switches uploads to
Cloudflare, and not one step earlier**, because a 10 on a detailer's screen with
nothing behind it is a promise the platform cannot keep.

**a · Cloudflare, in your dashboard — yours alone. TWO ORDERED SETUP STEPS:
complete a1, then a2. Neither is a product decision or a question for review.**

**a1 · The CORS rule, on all THREE buckets:** `job-photos`, `expense-receipts`
and `business-media`. **Without it every upload is blocked by the browser even
though the program works.**

**Paste this exact block into each of the three buckets' CORS settings.** It is
the same block all three times. It allows GET and PUT with the `Content-Type`
header, from the six addresses the product actually runs on:

```json
[
  {
    "AllowedOrigins": [
      "https://detailingplatform.com",
      "https://www.detailingplatform.com",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://*.netlify.app",
      "https://*.netlify.live"
    ],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

*Why six and not one, since they are all "your website".* **A browser treats
`detailingplatform.com` and `www.detailingplatform.com` as two different
places**, so one of them being missing blocks uploads for whoever happens to
land on that one. The two `localhost` lines are the test setup on this machine.
The two `netlify` lines are the temporary addresses a preview gets — they are
generated fresh each time and cannot be listed one by one, which is why they are
written with a `*`. **If Cloudflare refuses a line, paste the rest and tell us
which one** — do not drop a line quietly, because the only symptom is an upload
that fails from one address and works from another.

*And this block is not typed from memory — it is produced from the product, so
it cannot drift:* `node scripts/cors-rule.mjs` prints it and checks that this
very step still names every address, both methods, the header and all three
buckets. **It came back red the day it was written**: this step said *"your
website's address"* and *"any preview address you use"*, which named one of the
six addresses and left the other five to be guessed. *The step named only
`job-photos` until 2026-10-08; receipts and the logo-and-gallery bucket need the
same rule and would have failed with a program that was working perfectly.*

**a2 · Give `business-media` its permanent public web address, after a1.**
This is the one Cloudflare setup step in the photo job that only you can do; it
is not a publish or a decision request.

*What it is.* Two of the three buckets are private: nobody can read a photo
without a one-hour link our server signs for them. **`business-media` is the
public one** — your logo and your marketing photographs, which have to be
readable by a stranger looking at a booking page. Supabase gave that bucket a
web address for free. **Cloudflare does not.** A bucket there has no address at
all until you attach one, in the R2 part of your dashboard.

*The required address.* Cloudflare offers a free development address ending
`r2.dev`, and it lets you point one of your own web addresses at the bucket
instead — something like `media.detailingplatform.com`. **Use your own.** This
is the required production setup, not a choice to send back for approval: **the
address gets written into your database, one row
per photograph, and it stays there.** Every logo and every gallery photo stores
its full web address, so whichever one is switched on the day we flip this over
is the address those photographs keep. Changing your mind later does not move
them, it breaks them — and Cloudflare's own documentation says the free
`r2.dev` address is for development and is rate-limited, so it is not the one to
be stuck with. **Photographs already uploaded are safe either way:** the old
bucket stays readable and the addresses already in your database still point at
it. Nothing has to be moved.

*What to tell us.* Just the address. It goes in beside the three Cloudflare keys,
by name, as `R2_MEDIA_BASE`. **Until it is set, every logo or gallery upload on
the new path answers *"Public image storage is not set up on the server yet"* and
writes nothing** — which is why the switch for it is off, see step 10.

*And we can now check your work the minute you have done it, in one command, with
no keys and nothing of yours:* `node scripts/r2-public-base.mjs --base=<the
address>`. It asks the six things that have to be true — the address exists, it is
an `https` one, it is not Cloudflare's rate-limited `r2.dev` development host,
a stranger can read a photograph through it, our pages are allowed to upload
**with a file type**, and *nobody else* is allowed to upload. **It reads only.**
It cannot bind the address, cannot set the CORS rule and cannot upload anything —
those stay yours. Right now it comes back red on the first of the six and says so
in those words: *no public address for business-media.* Written 2026-10-09 because
until then nothing anywhere could tell a1 and a2 done from a1 and a2 forgotten, and
the way that shows up later is a blocked upload with nothing to say why.

**b · ~~Check the three Cloudflare keys are set as secrets on the functions.~~
DONE — NOTHING FOR YOU TO DO HERE. Checked for you on 2026-10-09 and all three
are there.** This step used to ask you to go and look, because
`docs/services-and-secrets.md` recorded that the keys were saved on 2026-09-22
and nobody had ever confirmed they were attached to the programs that need them.
They are. A check now asks the question for us, so it never has to be guessed at
again: `node scripts/photo-release-order.mjs`. It reads the NAMES of the keys and
never their values, which is the only way we would ever look at them.

*One is still missing and it is the one you have not given us yet:* the public web
address for `business-media` from step a2 above. Until that exists, the logo and
gallery switch stays off — see step 10.

**c · Publish `photo-door`.** `node scripts/deploy-functions.mjs photo-door`
It is not in the public list and must not be: every action needs a signed-in
person.

*And this one can be checked the minute you have done it too, same as a2 and b:*
`node scripts/photo-door-deployed.mjs --base=<the address from a2>`. It asks the
six things that have to be true of the **running** program rather than of the
version on this computer — it is there and switched on, it refuses anybody with
no login, the address from a2 is attached to it, it hands back a filing name
under **your** business and nobody else's, it turns away a request for another
business and another business's file, and the web address it gives back is your
address with that filing name on the end. **It reads only.** It cannot publish,
cannot change a setting and cannot upload anything. Today it comes back red on
the first two and says so in those words: *photo-door is not deployed*, and
*no `R2_MEDIA_BASE`*.

**DO a2 BEFORE c, AND THIS IS THE ONE ORDERING SURPRISE IN STEP 9.** Publishing
the program on its own is not enough and it is not harmless-but-incomplete:
until the web address from a2 is attached, the published program **refuses every
logo and gallery request** with *"Public image storage is not set up on the
server yet"*. Measured 2026-10-09 against the real program, not read off the
source. Nothing breaks today, because the switch that would send real uploads to
it is still off (step 10) — but if you publish in this order and then flip that
switch, logos stop working with nothing anywhere to say why. a2, then c, then
step 10.

**d · Republish `delete-customer`.** `node scripts/deploy-functions.mjs delete-customer`
It now removes a forgotten customer's photo files from both stores.

**THIS IS THE ONE STEP IN STEP 9 YOU CANNOT UNDO BY DOING IT LATE, so it is worth
one paragraph.** When somebody asks to be forgotten, the program deletes the
record of their photos and the photo files themselves, in that order. The version
running right now can only reach the old photo store. Once you have done step c,
new photos go to the new store — so if you publish c and never do d, pressing
*forget this customer* deletes the record of their photos and **leaves the photos
themselves sitting in the new store, with nothing left anywhere that knows where
they are.** Nothing shows an error, nothing is written down, and the files cannot
be found again afterwards to delete them by hand. It is a person asking you to
destroy pictures of their car and being told yes.

*Measured 2026-10-09, not assumed:* the version of this program that is live today
is the old one. `node scripts/photo-release-order.mjs` now asks this question on
every run and goes red, naming this step, if c is done and d is not.

**e · Publish `photo-reconcile`.** `node scripts/deploy-functions.mjs photo-reconcile`
It is called every night by a scheduled job with no signed-in person, exactly like
`refresh-weather`, so it is in the public list and is deployed with the sign-in
check off, which that nightly call needs.

**f · Apply the nightly schedule, now that the program exists. TWO FILES, IN
THIS ORDER:**
`node scripts/apply-migrations.mjs 20261006060000_photo_reconcile_cron.sql`
`node scripts/apply-migrations.mjs 20261009120000_photo_reconcile_cron_timeout.sql`
The first seeds the job as *not reported yet* and schedules the call for 03:40
UTC. **Applied before step e it would email you a stopped-job alarm for a job
that was never started.**

**The second file was added 2026-10-09 and it is not optional.** The first one
asks the database to make the nightly phone call but never says how long to wait
for an answer, and the default wait is **five seconds**. This particular job
reads every photograph in the whole store and every photo record in the
database, so five seconds is nowhere near enough as soon as there are real
photos — and this is not a guess: **the exact same missing setting broke your
reminder emails for eighteen hours on 2026-09-13**, because the job was healthy
and took ten seconds while the database gave up at five. The second file sets
the wait to a minute. Nothing else about the schedule changes.

**g · Last, apply the allowance number:**
`node scripts/apply-migrations.mjs 20261006061000_photo_total_gb_ten.sql`
It changes 1 to 10 and **only** when the value is still the default 1, so a number
you set by hand is never overwritten.

**h · One thing to know rather than do, and it is about money.** Your logo and
your marketing gallery are **not counted against the photo allowance** — they
never have been; the allowance counts job photographs and expense receipts.
That did not matter while storage was on Supabase, because their free plan's
1 GB was a hard wall: an upload past it simply failed. **On Cloudflare there is
no wall. There is a bill.** No single file may be bigger than 10 MB, and that is
the only limit; a thousand gallery photographs would simply be stored.
**Nothing is wrong today** — a detailer uploads a handful of marketing shots —
and we have not invented a limit for it, because the number would have to be
yours. **The decision, when you want it:** either leave it as it is and watch the
Cloudflare bill, or tell us a figure for how much marketing-photo space a
detailer gets and we add it to the same allowance the job photographs use. Our
recommendation is to leave it until you have more than a handful of real
detailers, and then pick the number from what they actually use.

**Unlocks ROADMAP 0.11.**

**AFTER EACH STEP ABOVE, ONE COMMAND SAYS WHETHER THE ORDER HELD:**
`node scripts/photo-release-order.mjs`. It only reads — it publishes nothing,
applies nothing and changes nothing. It is here because the order of these steps
matters more than any single one of them, and until 2026-10-09 nothing checked
it: doing step g before step c would put a 10 GB promise on a detailer's screen
with nothing behind it, and finishing everything but forgetting the two switches
in step 10 leaves photos going the old way with nothing to say so. The command
prints a line per rule and tells you which step is out of place. One line in it
will always read `????` next to `bucket-cors` — that is step a1, the Cloudflare
rule, which only you can see; it is printed rather than hidden so nobody mistakes
it for something that was checked. *(2026-10-13: it can be checked after all,
without your dashboard. `node scripts/bucket-cors.mjs` asks each bucket the same
"may this site upload?" question a browser asks, and it found your rule on all three
buckets, letting our sites in and keeping strangers out. 76 of 76. Step a1 is done
and proved. Nothing for you to do here.)*

**Then, the morning after:** one read tells you the first night's reconcile ran
and what it found. In the Supabase SQL editor (it only reads):
`select ran_at, detail from job_heartbeats where job = 'photo-reconcile';`
`detail` carries `clean` (true when the bucket and the records agree), the counts
of objects with no record, records with no object and sizes that do not match, and
`allowance`, how full the store is and how many businesses are over their share.
**The reconcile never changes or deletes anything; it only reports.** A
`clean: false` is a number to look at, not an emergency. **Not proved until that
morning:** that Cloudflare accepts the listing request, which no test short of the
live bucket can show. If the job still shows as stopped on the back office's *Jobs
that run on their own* list about a day after step f, **there are two things it
can be and they look identical from outside**: the gateway refusing the
anonymous call, or the database giving up on the call before the job finishes.
The second one is what step f's second file prevents, so if you applied both
files it is the gateway. Either way — tell us.

### Step 10 · Publish the website, last

The Clients screen (1.3), the delivery list (3.1), the costs screen (9.14) and the
language save (3.4) are all website code. Pushing is yours, and **a production
build costs 15 Netlify credits** (CLAUDE.md, "Publishing"); **measure first whether
a push publishes at all** before spending one.

**It goes after step 9c, not before.** The photo screens in it use the door, and a
website published before `photo-door` exists answers every photo action with
*"Photo storage is not set up on the server yet"*.

**THE TWO RELEASE SWITCHES ARE NOW ON LOCALLY.** Both are in
`app/src/lib/photo-door.js`; the app still needs your publish after the
98.5 photo-test repair passes.

* **`RECEIPTS_VIA_DOOR`, now `true` locally (0.11cc, 2026-10-13)** — receipts for expenses.
  **Needs:** `photo-door` published (step 9c).
* **`MEDIA_VIA_DOOR`, already `true` locally (0.11bc2, 2026-10-10)** — your logo, the marketing gallery and
  the website-intake photographs. **Needs:** `photo-door` published **and** the
  public web address from step 9a2, **and** the CORS rule on `business-media`.
  *Added 2026-10-08.*

The function, public address and CORS prerequisites above are already live.
The website has to be published afterwards for the local receipt switch to take effect.
**Why these switches originally stayed off:** switching working uploads
over before the function existed would break them. (Job
photographs have no switch, because they were already going through a door that
did not exist — there was nothing working to lose.) **If you publish and nobody
flips them, nothing breaks and nothing says so** — both keep going the old way,
straight to Supabase, which does not count against the photo limit. That is the
whole reason these lines are here.

### Step 11 · The invite's written record — ROADMAP 4.1d (one change, one program)

Sending an invite already asks first and names the address. **What was missing is the
written record**: who sent it, whether it replaced an earlier invite to the same address, and
when. It is built and tested on a throwaway database; **nothing is on the live one yet.**
**Safe in either order** — until both are done the invite still goes out and the program says
`audit_recorded: false` in its answer. The record holds ids and a role, never the address.

```bash
node scripts/apply-migrations.mjs 20261010020000_action_log_invites.sql
node scripts/deploy-functions.mjs invite-user
node scripts/owner-invite.mjs
```

The last line is the proof, and it is a browser check on its own throwaway business (no mail is
sent, nothing of yours is touched): it must end `PASS` with no `NOT RUN` line. Run it without
`--audit=pending`. Then a session ticks 4.1d.

### When it is all done · Three proofs that are not publishes

**Publishing is not the same as proved.**

1. `node scripts/deployed-inventory.mjs` says "matches" for all 39 — that is the
   state ROADMAP 0.6 is about.
2. The live refusal for 14.9 is observed once; the row further down says how.
3. A real notification is tapped on a subscribed phone and opens the job (14.34).

**Everything else** open and waiting on you is in the rows below. The count of
what is open, and which of it a session can still do, is in `docs/BATCHES.md`.

## Start here — the routine release step that unblocks the most

- [ ] **DO · Mail-log email previews (ROADMAP 3.1d) are built and await two routine release steps, in this order. No business decision is requested.**
  Clicking a row in "Emails we sent" now opens that email. It cannot show anything real until the
  database can hold the email's text. **1. Apply the new database change**
  `supabase/migrations/20261010010000_email_sends_keeps_the_body.sql` (it adds one empty column).
  **2. Then publish `send-email`.** **Order matters:** if `send-email` goes up first, it tries to
  save a column that is not there, and every email stops being logged until the change is applied.
  Emails sent before this are never recoverable, and the preview says "This email's content was not
  saved" on those. **Checked already:** a row opens the preview, an old row says it was never saved,
  a failed read says so instead of claiming that, at 1440, 392 and 320 with a clean console
  (`node scripts/mail-log-preview.mjs`, 20 checks). **Not checked, because it needs the two steps
  above:** a real stored email opening end to end. After both steps, send one test email and click
  it. This reverses the September decision not to store bodies, on your own request of 2026-10-09.

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

  1. **DONE 2026-10-10, published and checked on the real page (ROADMAP 2.1).**
     **A customer is shown $65 and charged $95.** Pick a weekend day, the page
     says $65, pick a time and it becomes $95 — no mention of a weekend
     anywhere. **The fix is written and it is not live.** Publishing makes the
     page say the real price before they choose. *(Roadmap 2.1.)*
  2. **Your back office under-reports how set up every detailer is.** It says a
     business is "4 of 12 done" when their own dashboard says 9 of 12, because
     it was being told about their opening hours under a name the scoring
     couldn't read. **So the list of who needs a call is wrong for everyone on
     it.** Fixed tonight; publishing makes the numbers agree. *(Roadmap 9.1.)* **PUBLISHED — confirmed live 2026-10-10, ROADMAP 9.1a.**
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
  cd /c/Users/rando/Downloads/claude/detailing-platform
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

  **SUPERSEDED 2026-10-11 by "YOURS, WHEN YOU LAUNCH" near the top of this file (ROADMAP 0.6b).** If this line's list ever comes out empty, `deploy-functions.mjs` gets no names and publishes **every** program at once, the payment webhook included. Use that block's guarded line instead.

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
  **DONE 2026-10-10 — you published it this morning, and it was checked on the
  real page afterwards: a Saturday now shows $95 and "Weekend rate · +$30" the
  moment the day is tapped, at every screen width. ROADMAP 2.1 is ticked.
  Nothing left to do here.**

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

- [x] **DONE 2026-10-10 — you approved it at 09:32 and I published it and ran the test.**
  Only `calculate-booking` went live (version 64), built from the commit holding this fix alone, so
  none of the unfinished support-session work rode along. The six programs named below were NOT
  published and do not need to be for this. Booking for today now reads $115 with "Short notice
  · +$20" the moment today is tapped, at laptop and phone widths, and the live page check passes
  with no stand-in. Nothing for you to do here.
  *The original row, kept as history:* **PUBLISH · `calculate-booking` again, for the rush fee on same-day
  bookings (roadmap 2.1d).** Somebody booking for TODAY saw $95 when they
  tapped the day and $115 the moment they tapped any time, because the $20
  "Short notice" fee only showed up with the time. Every time slot today
  carries that fee, so the program now says so the moment the day is tapped.
  A day that is only partly within 24 hours still waits for the time, because
  there it really does depend on the hour.

  **I proved it on the real booking page with a stand-in** — at laptop and
  phone widths, today reads $115 on the day tap and stays $115 on any time,
  and a later day shows no rush fee. Your publish is the only thing between
  this and real customers. Six other programs share the same pricing file and
  will ride along (`create-booking`, `preview-emails`, `reschedule-booking`,
  `send-invoice`, `update-booking`, `validate-promo-code`); that is expected
  and changes nothing for them.

  **How you will know it worked:** `node scripts/surcharge-visible.mjs` stops
  failing on the six same-day targets and passes with no stand-in.

---

## Urgent — two minutes when you next open your laptop

- [ ] **DO · Ten seconds: open the Emails-we-sent screen and tell me whether
  the scroll bar on that list looks right to you.** You are the only
  instrument I have for this one.

  **Where.** Open the app, click the gear, click **Emails we sent**. The list
  underneath is long — 29 messages. Drag it with your mouse, or flick it on
  your phone.

  **What changed.** The list used to run off the bottom of the screen and make
  the browser draw its own full-height grey bar down the side of every settings
  screen — the thing you pointed at first. It now scrolls inside its own box
  instead, and that box has a slim bar in the product's own grey rather than the
  browser's.

  **What I proved, so you only have to judge the look.** At laptop width and
  phone width: the list is longer than its box and scrolls on its own; the
  screen behind it does not move by a single pixel while you scroll; all 29
  rows stay clear of each other at the top, the middle and the bottom; and when
  I deliberately broke the fix, the old full-height bar came straight back —
  which is how I know the fix is what is holding it off, rather than something
  else having changed.

  **What I could NOT check, and why it is yours.** **What the slim bar actually
  looks like.** The browser this machine runs tests in draws scroll bars as a
  thin overlay with no width at all, so the bar never appears in a screenshot —
  it is invisible to every picture I can take. I tried three ways round it
  (a real Chrome, a visible window, and switching the overlay off) and all
  three are unavailable on this machine. So no session here, today or next
  week, can tell you whether it looks right.

  **What I need from you:** does that bar look like part of the product, or
  still like the browser's? **If it looks wrong, say so in one line and that
  becomes its own small job** — it does not reopen the work above. ROADMAP
  3.1a; `DECISIONS.md`, "Ticking on structural proof when the appearance is
  unmeasurable".

- [ ] **NEEDS ANDREW (ROUTINE CHECK, NO DECISION REQUESTED) · Confirm whether
  the backup key is in your password manager. This is a thirty-second check,
  not a choice or approval request.**

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

  **Routine check:** search the password manager for "backup", "age", or
  "detailing backup", then tell a session only whether it is there. **Thirty
  seconds.**

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
  out, not write one down.** That part is yours alone.

  **UPDATE 2026-10-10 (ROADMAP 12.4) — nothing to decide here.** Both logins
  come out or get renamed before launch; that is required, not optional. The
  timing is set: about a week before you invite the first real detailer.
  Checked today: still no real signup — all 44 logins are test or demo
  addresses, the newest from 2026-09-20. The code half is finished and
  proven: the back office shows the ordinary "page does not exist" screen to
  anyone not on the list, and a check (`scripts/admin-refuses.mjs`) proves it
  on a phone and a laptop. **Your two steps, at that time:** (1) give
  `demo@demo.com` a real password in Supabase → Authentication → Users and
  keep it in your password manager; (2) tell a session "take the demo
  detailer out of the back office". Until then the demo logins are what lets
  every check run.

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

- [ ] **DECIDE · You stopped three belt jobs by hand this morning — did you mean
  to park the belt?** Added 2026-10-13 by supervision. Overnight the belt ran
  its Muse practice set, then at about 10:15–10:30pm your time you killed the
  99.6, 9.15a and 3.4f runs one after another and the belt stopped. Nothing was
  lost: all three were practice copies, nothing reached the product, and the
  belt is set to carry on the next time it starts. **Recommendation:** if you
  want quiet, say "park the belt" and a session will stop it properly; if those
  three kills were just tidying, do nothing and it will keep working through
  the list.

- [x] **DO · Restore the belt worker's Claude Code login and accept this
  workspace's trust prompt.** Added 2026-10-10 by supervision.
  **Login done — checked 2026-10-10 08:10 by the next supervisor:** the belt's
  07:53 dispatch printed `Not logged in`; its 08:08 dispatch ran to completion.
  Nothing for you to do unless the belt's next job fails in under a minute again.

  The two latest worker dispatches (`0` and `0.3b`) both stopped in under a
  minute before a tool call, edit, or command. Claude Code said `Not logged in`
  and that `C:\Users\rando\Downloads\claude\detailing-platform` has not been
  trusted. Open Claude Code interactively in that exact backslash-spelled
  folder, run `/login`, and accept its trust prompt. Then `node belt.mjs
  --once` should reach the worker instead of failing immediately. Do not put
  credentials into the repository or alter the trust file by hand.

- [ ] **One thing to decide, and it is a small one: the mail log's four
  finishing touches are now four separate jobs instead of one.** 2026-10-09,
  from the supervisor. **Nothing for you to do unless you disagree.**

  **What happened.** You looked at the new mail log on the 9th, said keep it,
  and asked for four things: get rid of the ugly scroll bar, stop text
  crowding, group the long list into Today / This month / All time, and let a
  row open the actual email that was sent. The program then tried to do all
  four in one go, three times. Twice it was cut off part-way through with
  almost nothing saved, and once with nothing at all. About two and a half
  hours went into those two attempts and produced one commit between them.

  **What I changed.** Those four are now four separate jobs on the list, so
  each one gets its own run and gets saved on its own. The big combined job is
  marked "do not take this whole" so it stops being picked up as one piece.
  Nothing was dropped and nothing was added — it is the same four things you
  asked for, in four pieces.

  **Why you might care.** The list now reads as five open items where it read
  as one, so the count went up without any new work appearing. That is
  bookkeeping, not slippage. **If you would rather see them as one line on the
  list, say so and I will put them back** — but they will keep being attempted
  together and cut off part-way if I do.

- [ ] **UPDATED 2026-10-11: you did both on the 10th, and the button works.**
  I pressed it for real today on two throwaway detailers (on a laptop-width and
  a phone-width screen): each was emailed, the date was written down, and a
  second press was refused with the date named. **One more publish of
  `platform-admin` closes the last hole**, and there is no decision in it. The
  hole: if a detailer's contact email cannot receive mail at all, today's live
  version still writes the date down as though they had been told. That is
  fixed in the code now and only needs publishing. Recommended: publish it with
  the next batch.
  **Added 2026-10-11, same publish:** two presses of that button at the same
  moment (two tabs, or a retry) could each write the date, and the later one
  won. Now the first date written stays and the other press is told it. Proved
  against the database five times over; it goes live with that same publish.
  *The note as it stood on the 9th, kept for its context:*
  **Still waiting on you from the 8th: the build-start notice cannot be
  finished until you apply one database change and publish one function.**
  Re-stated here because the program has now picked that item up twice and
  could not finish it either time — there is nothing a session can do to close
  it. The item is `0.4`; the file is
  `supabase/migrations/20261008010000_site_build_start.sql`, and the function
  is `platform-admin`. **I have not applied or published anything** — both are
  yours. Everything else on that item is built, and I found and wrote up one
  real defect in it that *can* be fixed without you (`0.4g`: pressing the
  button twice quickly could send the notice twice and move the recorded date,
  which matters because that date is what ends somebody's refund right).

- [x] **DECIDED · The demo owner's login comes off the page the site serves
  (`app/public/map.html`, line 303); the password is left alone. 2026-10-06 —
  nothing needed from you.** The manager took my recommendation below. **The page
  change is the front-end session's and is not made yet**, so the credential
  check keeps printing its OPEN line until that edit lands; whoever makes it
  should confirm the seed script does not write the line back. The password in
  `.env` is untouched.

  *The question as it was asked, kept so the answer has its context:* The demo
  owner's login is written on a page the site serves. Found 2026-10-06 by the
  credential check once it was allowed to read more than markdown.

  **What this is.** The review map page shows "sign in first" and, beside it,
  the demo owner's email and password. Checked tonight by comparing it with the
  value in your `.env` (a yes or no, nothing printed): **it is the same
  password.** That page is under `app/public`, so it ships with the site. This
  is the login you made short on purpose on 2026-08-30 so you could type it on a
  phone, and it opens only the demo business, which is fake data. So the worst
  case is a stranger scribbling on the demo, not a breach.

  **What happens either way.** Leave it, and the page keeps working as a
  cheat sheet for you, and the credential check keeps printing one OPEN line on
  every run. Take it off the page, and you lose the cheat sheet (the login stays
  in your `.env`), and that OPEN line goes away. **Changing the password helps
  only if the demo business ever holds anything you care about; today it does
  not.**

  **My recommendation.** Take it off the page and leave the password alone. The
  seed script rewrites that page (it refreshes the example links), so whoever
  edits it should check the seed does not put the line back. I did not touch
  the page: it is front-end, and publishing is yours.

  **Nothing to rotate in any other file.** Everything else the widened check
  found is a test creating its own throwaway account; none matches a value in
  your `.env`.

- [ ] **DO · When you publish the back end, the public programs that carry the
  hammering limits go up with it — and one of them changed tonight. Added
  2026-10-06.**

  **What this is.** Eighteen of the programs a customer or a payment company can
  reach carry a limit on how often one address may call them. **The live copies
  of three of them — cancelling, rescheduling and accepting a quote — have no
  limit at all today** (checked tonight: the running copy does not contain the
  limiter). Tonight the limiter also got stricter in one way: someone who
  arrives with **no address** used to be counted as nobody, so they had no limit;
  they are now counted together, with a generous cap. Nothing a real customer
  does comes anywhere near it.

  **What you do.** Nothing today. On launch day these go up with everything
  else in the one publish. The eighteen: accept-invite, accept-quote,
  address-suggest, available-slots, booking-ics, calculate-booking,
  cancel-booking, create-booking, get-booking-receipt, pay-booking, plan-link,
  platform-billing, reschedule-booking, resend-webhook, stripe-webhook,
  track-visit, unsubscribe, validate-promo-code. **No database change goes with
  this one**, so there is nothing to apply first.

  **What proves it worked.** We ran the real code against the real database with
  our own made-up address, 610 times at each of the three: exactly 600 were
  answered and 10 were refused, and the same with no address at all (3,000
  answered, 10 refused). **That was the code on this computer, not the live
  site** — so the refusal has still never been seen live. *(Roadmap 14.9, 14.18.)*

- [ ] **DECIDE · After you publish, may a session make a few test calls at your
  live public address? Added 2026-10-06.**

  **What it is.** Two questions about the live site cannot be answered from this
  computer: does it really refuse a hammering caller, and can a stranger reach
  the site without the address header the limits depend on. Answering them means
  calling the real public programs from outside — the first with a loop of about
  610 calls at each of the three, the second with two single calls.

  **If yes:** one session does it right after the publish, from this computer,
  deletes the counter rows it made, and tells you what came back. The only side
  effect is that this computer's address is refused by those three for the
  rest of that hour. **If no:** both stay open and the limits are trusted from
  the tests alone.

  **My recommendation: yes, once, right after you publish** — and not before,
  because today the live copies have no limit and the calls would prove nothing.
  *(Roadmap 14.9, 14.18.)*

- [ ] **DECIDE · Pay for Supabase backups, when you are ready to put real
  customers on it (ROADMAP 6.1).** Added 2026-10-06.

  **What this is.** Today the only backups are the nightly locked file in your
  GitHub repo and the drill folder on this computer. Both work differently from
  a real backup: somebody has to unlock and load them by hand, and the nightly
  one has never been opened. Supabase does this properly, for money:
  - **A paid plan** turns on **daily backups** that Supabase keeps and restores
    for you with one button. The monthly price is on Supabase's billing page;
    check it there.
  - **Point-in-time recovery** on top lets you rewind to any minute. Read off
    Supabase's own add-on list on 2026-09-20: **$100 a month for 7 days**, $200
    for 14, $400 for 28. It needs the paid plan first.

  **My recommendation:** the paid plan before your real business moves onto
  this. Point-in-time later, if ever. Nothing is at risk today because nothing
  real is stored.

  **And one free thing on the same page, worth doing first:** Supabase cannot
  email a detailer a password-reset link today (it sends 2 an hour, only to your
  own team). Pointing its sign-in mail at Resend fixes that for free —
  Supabase → Authentication → Emails → SMTP. `docs/recovery.md` step 4 has why.

  **What happens on the worst day either way** is written step by step at the
  top of `docs/recovery.md`.


- [ ] **SWITCH · Publish six booking functions, so a press repeated on a bad
  connection does not send a customer two emails or refuse their own booking
  (ROADMAP 6.4).** Added 2026-10-06.

  **What this is.** Measured on the live functions today: when the same button
  is pressed twice at once (a detailer in a driveway, a customer on a phone),
  the customer gets **two** cancellation, move or confirmation emails. And a
  customer whose first booking went through, but whose screen never heard back,
  is told the time is taken **by their own booking**. Fixed and checked in the
  code (30 of 30); the live site still has the old behavior until these are
  published.

  ```bash
  node scripts/deploy-functions.mjs create-booking update-booking cancel-booking reschedule-booking respond-to-booking accept-quote
  RETRY_TARGET=deployed node tests/retry-safety.test.mjs   # should read 30 passed
  ```

  **Two older checks expect the old behavior until this goes out** — the
  "accepting it again" checks in `tests/request-mode.test.mjs` read red against
  the live site now and turn green once these are published.

  **Nothing to decide.**


- [ ] **NEEDS ANDREW · Put the Stripe TEST secret key into `.env`, so the
  billing walk can run renewals and failed payments (ROADMAP 12.1).** Added
  2026-10-06.

  **What this is.** The check that walks a pretend detailer through paying,
  renewing, a card failing, the page going offline and coming back is built.
  Half of it ran today. The other half fast-forwards time on Stripe's
  practice account so a month passes in a minute, and that needs the practice
  account's secret key on this computer. Today the key only lives inside
  Supabase, where a session cannot read it.

  **Where it goes, in one sentence.** One new line at the bottom of the file
  called `.env` in the main project folder (`detailing-platform`), the same
  file that already holds the Supabase keys. Nowhere else — not in a chat, not
  in a document.

  **What it unlocks — three steps that cannot run without it:**
  1. **Renewal** — a month passing and the card being charged again.
  2. **A failed card** — the card being declined and Stripe trying it again
     over the following days.
  3. **The page going offline** — the booking page switching off once the
     retries run out, and coming back once paid.

  **What to do, about a minute.** Stripe dashboard, switch on **Test mode**,
  Developers, API keys, copy the **Secret key** (it starts `sk_test_`). Open
  `.env` in this folder in Notepad and add one line: `STRIPE_SECRET_KEY=`
  followed by the key. Save. **Never the live key** — the script refuses
  anything that does not start `sk_test_`, and `.env` is never committed.
  Then tell a session to run `node scripts/billing-walk.mjs`.

  **Nothing breaks while this waits.** No real money moves either way.


- [~] **WAIT · Publish `platform-billing` only after every payment scenario in
  ROADMAP 12.1 has been tested completely, so a detailer whose page went
  offline for not paying gets it back when they pay (ROADMAP 12.1).** Added
  2026-10-06.

  **ALREADY DONE, measured 2026-10-10.** This went out about 11 hours earlier,
  in the same round as the photo functions, so it is live now — before every
  scenario was tested, which is not what you asked for. Nobody was affected (no
  paying detailers yet), and the billing walk now shows a paused page coming
  back once paid. Nothing to do here, and step 6 of the publishing list is
  done too. The only billing step still waiting on you is the test key row
  above.

  **What this is.** Measured on the real booking page today: a detailer whose
  page was switched off for non-payment pays to restart, the billing record
  says "active", and the public page **still says "Page not found"** — for
  good. The restart was wiping the one note the payment step looks for before
  switching the page back on. Fixed in the code; the live function still has
  the old behavior until it is published.

  ```bash
  node scripts/deploy-functions.mjs platform-billing
  node scripts/billing-walk.mjs   # steps 6d and 6e should turn to ok
  ```

  **Nobody is affected today** — there are no paying detailers yet. It matters
  the first time a real card fails.

  **Andrew decided 2026-10-09:** testing comes first; this publish does not go
  out on the strength of the code-only fix.

- [x] **SWITCH · One database change, so a detailer's browser can no longer
  rewrite its own bookings behind the dashboard's back (ROADMAP 8.10d).**
  Added 2026-10-06. **DONE 2026-10-10** — applied in the step 2 catch-up, then
  proved: a signed-in demo owner's browser is refused when it tries to write a
  booking directly, and saving a private note from the job record still works,
  on a laptop screen and a phone screen. Nothing left for you here.

  **What this is.** A detailer's signed-in browser could change any field on
  its own bookings directly — the weather shown on a job, and everything else
  too — without going through the dashboard's own checks. The dashboard never
  does this: every booking edit already goes through the server. The door was
  just left open. Proved today on the live database: a test owner's browser
  wrote a made-up temperature onto its own booking and it stuck. Own bookings
  only, nobody else's, no money moved.

  **The fix shuts that door and changes nothing anybody uses.** It was tried on
  a throwaway copy of the bookings table that was thrown away straight after:
  the browser is refused the weather and every other field; logging a fleet job
  (the one thing the browser does write directly) still works, retries
  included; the dashboard still reads bookings; the server still updates the
  weather.

  ```bash
  set -a; . ./.env; set +a
  node scripts/apply-migrations.mjs 20261006040000_bookings_browser_updates_nothing.sql
  node tests/owner-writes.test.mjs      # red today on one line; green after
  node scripts/migration-drift.mjs      # stops naming public.bookings
  ```

  **No functions to publish.** It **changes one permission and adds nothing.**

  **If something breaks after:** the symptom would be a "permission denied"
  message when saving something on a booking. Nothing in today's dashboard
  should do that; if it does, tell the next session — the fix is to let the
  browser change exactly that one field, never to reopen the whole table.

  **Nothing to decide.**


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


- [~] **NEXT REGULAR UPDATE · Seven functions to publish so that tapping a job
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

  **UPDATE 2026-10-10: all seven ARE live now** (published early on the 10th
  along with a batch of other functions). Checked by reading the running copies:
  every one sends the job-page link and none sends the old one. **So the only
  thing left is the tap below** — nothing to publish for this row.
  **Nothing to decide.** Once they are live, tap the next job notification you
  get; it should open that job. If it does, tell a session and it ticks
  ROADMAP 14.34.

  **Andrew decided 2026-10-09:** hold this for the next ordinary update cycle;
  do not make a special publish for it.

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

  **ADDED 2026-10-06 — what the back-office screen says today, and what it will say.**
  The version of this function that is live now is older than the cost
  figure, so the back-office screen shows the words “business_id is required”
  where the figure should be. That is the old function not knowing the
  question, not a fault in your data. The new version, once published, answers
  in plain words: if the table has not been added yet it says **“Costs cannot
  be shown yet: the costs table has not been set up,”** the same way typing a
  bill already does. So publishing in the order above — table first, function
  second — is what makes that line stop appearing. **Written and checked here
  only; nothing has been published.**

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
  appointment, to this customer, and here is what became of it*.

  **THE SENTENCE HERE SAID "THE SCREEN ITSELF IS NOT BUILT YET" UNTIL
  2026-10-08, AND BOTH SCREENS ARE NOW BUILT.** Corrected rather than quietly
  replaced, because it changes what you are waiting for:

  * **The detailer's own list is live right now and needs no switch from you.**
    Settings (the gear) → **Emails we sent**. It shows everything that business
    has emailed, newest first, with a one-tap **Problems** filter, and it reads
    the table directly under the detailer's own sign-in. Checked today against
    every one of the demo business's own real email rows, at five screen sizes
    down to the narrowest phone — the deliberately bounced test messages read
    *Bounced* in red with the provider's own reason beside them, and the
    delivered ones read *Delivered* with a tick.
  * **Your back-office list still needs the two switches above**, because it
    reads through `platform-admin` rather than through a detailer's sign-in.
    Until you publish it, that one screen says it could not read the email log
    — which is deliberate, so an unpublished function can never be mistaken for
    *no email has been sent*.

  There is still nothing for you to decide about either screen.

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


- [ ] **DECIDE · One question first: should a customer have to pay part of the
  job price when they book? Nothing is built.**

  **What this is.** A deposit means the customer pays something at the moment
  they book, and it comes off what they owe on the day. It is on the list as a
  thing to build, and **it is the only item left on the whole list with nothing
  written down about what "done" would even look like** — because nobody can
  write that until you answer these.

  **You said the earlier version was not understandable. Do not answer four
  design questions first. Answer yes or no to deposits.** Recommendation:
  **yes, but optional for each detailer, and only after every payment scenario
  in ROADMAP 12.1 has been tested.** If yes, the recommended defaults below are
  enough to build without another design round.

  **What it would look like, in dollars (added 2026-10-11).** A detailer turns
  on "20% deposit". A customer books a $200 detail online and pays $40 by card
  right then. On the day they owe $160. If they cancel early enough (inside
  the cancellation window the detailer already set), the $40 goes back to
  them. A detailer who leaves it off sees no change at all. **Three answers
  are enough:** *"yes, as you recommend"*, *"no, not now"*, or *"yes, but
  differently"* and say how.

  **The four details already have recommended defaults:**
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
- [x] **DECIDED 2026-10-09 · Keep the promise and build the notice when work
  starts on a website.**

  **BUILT 2026-10-09, AND IT NEEDS TWO THINGS FROM YOU BEFORE IT WORKS —
  IN THIS ORDER.** The notice, the dated record and the button all exist in
  the code now. They do nothing until:

  1. **Apply the one new database change** (`supabase/migrations/20261008010000_site_build_start.sql`).
     It adds one date to each detailer: the day work started on their website.
     Applying it is yours, as always. `node scripts/migration-drift.mjs` names
     it as missing until you do, in exactly those words.
  2. **Then publish `platform-admin` and `platform-billing`.** In that order —
     the button is in your back office and the server half it presses is in
     `platform-admin`. **Pressed before you publish, it answers "Unknown
     action" and does nothing**, which is what it did when this was tested
     today, on purpose, to see the failure.

  **IF YOU DO IT THE OTHER WAY ROUND — publish first, apply second — nothing
  breaks for a detailer.** That was built for deliberately: the billing screen
  reads the new date on its own rather than alongside the plan and the card, so
  a missing date costs one absent line and never the cancel button.

  **WHAT YOU WILL SEE.** In the back office, open a detailer: a new line that
  reads **Build started · not started**, and a button, **"Tell them work has
  started"**. Press it on the day you actually sit down to build their site. It
  asks once — *"Email them that work on their website started today? That is
  the day their build fee stops being refundable, and it cannot be changed
  afterwards"* — and then it emails them and writes the date down. **It refuses
  a second press**, because that date is the refund deadline and a stray click
  must not move it.

  **WHAT THEY GET.** A plain email: work began today, the date, nothing for
  them to do, and — only if they were actually charged a build fee — that the
  fee stops being refundable from today and **nothing else about their
  subscription changes**. The date then also sits on their own billing screen,
  because an email gets deleted and this one ends a right.

  **A detailer who was never charged a build fee is told work started and is
  told nothing about refunds**, which is the honest version: there is no fee to
  stop being refundable. The first draft said there was, for everybody, and
  that was caught by reading both versions of the email side by side.

  **The sentence, on `/pricing` and in your terms, word for word:** *"It stops
  being refundable once work on your site begins, and you are told on the day
  that happens."*

  **What is actually there.** Nothing. There is no place in the product that
  records a website build as having started — not a date, not a switch, not a
  note — and no email anywhere that says it. The website brief a detailer
  fills in records the day THEY finished it and nothing about what you do next.
  So the day the build fee stops being refundable is a day nobody is told
  about, including you.

  **Why this matters more than it looks.** That sentence is not decoration. It
  is the thing that ends their right to a refund on the largest single charge
  in the product. A fee that quietly stops being refundable on an unannounced
  day is the shape of complaint that gets a card payment reversed, and the page
  promising the notice is the page they will quote back.

  **Decision recorded.** Andrew asked for the best fix rather than another
  legal choice. Build the first option below: one explicit start action, a
  dated record, and a plain notice to the detailer. Do not remove or weaken the
  refund-boundary sentence merely because its wording was confusing.

  **The two options that were considered:**

  1. **Send the notice.** One email, one button you press when you sit down to
     start their site: *"We've started on your website today."* That also gives
     you the date the fee stopped being refundable, written down, on the day.
     **This is the recommendation** — it keeps a promise you are already making
     and it costs one screen and one email.
  2. **Take the sentence off both pages.** Cheaper, and worse: it leaves a fee
     that becomes non-refundable at a moment the detailer cannot see, which is
     the thing the sentence was protecting them from. If you pick this, say so
     and it is done in one edit.

  **What was deliberately NOT done.** The sentence was left exactly as written
  on both pages rather than softened into something vaguer. That is the same
  call made about your export promise on 20 September, for the same reason: a
  vague promise is still a promise, and it is much harder for the next person
  to notice it is unkept.

  **Nothing is on fire.** No website build has been sold, there are no paying
  subscriptions, and nobody has agreed to either document. This blocks your
  first website-plan customer, not today.

- [ ] **NOTE · Three of your pages promise the domain is in the detailer's
  name. If you ever buy one FOR somebody, it has to go in theirs, not yours.**

  **Nothing is wrong and nothing is asked of you today.** This is one fact
  written down because the only way the promise can break is a thing you would
  do outside the product, where no check can see it.

  **What the pages say.** Your terms: *"The domain is in your name. If you
  leave, it leaves with you."* `/pricing` and the home page both say the same.

  **Why the product itself cannot break it.** There is no way for this software
  to own a domain. All it stores is the address a detailer tells it, and all it
  does is knock on that address to confirm it points here. There is no registrar
  account, no credit card, and nothing anywhere that could buy one. So for a
  detailer who already has a domain, the promise is kept by the fact that it was
  never yours to begin with.

  **The one case that is yours.** The website brief asks *"Do you own a
  domain?"*, so some detailers will not. If you buy one for them, **register it
  in their name, not on your own account** — otherwise all three pages are
  saying something untrue for that detailer, and they will only find out on the
  day they leave. Nothing in the repository says who buys it or in whose name,
  which is why it is here.

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


- [x] ~~**DO · Five minutes with your computer reading the screen out loud. No
  install, nothing to download, no cost.**~~ **WITHDRAWN 2026-10-10 — you ruled
  this is internal testing, not yours.** A browser check reads what a screen
  reader would say instead (ROADMAP 14.24 part 3). Nothing for you to do; the
  text below is kept only as history.

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

- [ ] **AT LAUNCH · Run one command that adds a "this is a test row" tick box to your
  customer list. Everything else for ROADMAP 1.3 is built and proved; this is
  the one step that makes it real, and it is yours because it changes the
  shape of the database (Andrew, 2026-10-12: leave test accounts visible for now, run this at launch).**

  ```bash
  set -a; . ./.env; set +a
  node scripts/apply-migrations.mjs 20260924010000_a_fixture_is_not_a_customer.sql
  ```

  **WHAT IT DOES, IN PLAIN WORDS — AND THIS ROW WAS REWRITTEN ON 2026-10-09,
  BECAUSE IT WAS DESCRIBING A SCREEN THAT NO LONGER LOOKS LIKE THAT.** The
  command adds one tick box to every customer and ticks it on the rows that are
  obviously left over from automated checks, so your Clients screen can keep
  them out of the list and out of the figures at the top of it, with a small
  chip to bring them back if you ever want to look.

  **NOTHING IS DELETED, and that is your own ruling being followed.** About
  sixty automated checks sign into these fake rows; a check that cannot run
  looks exactly like one that passed. Every row stays exactly where it is.

  **WHAT CHANGED, AND READ IT BEFORE YOU RUN ANYTHING: THE PRACTICE BUSINESS IS
  ALREADY CLEAN.** This row used to tell you your Clients screen listed sixteen
  people with three fakes among them, and that the headline said *"8 have gone
  quiet"* when the true answer was 5. **That was true on 2026-09-24 and it is
  not true now.** Measured on 2026-10-09: the practice business has **thirteen
  customers and not one of them is a fake**. The three leftovers this row was
  written about are gone from the database, and the headline already reads the
  right number, **5**, without the command having been run.

  **So running it today would change nothing you can see.** It would still tick
  **31 fake rows spread over six other practice businesses** — the ones only the
  automated checks ever open, which you never look at. It is still worth having
  in place, because the next check that leaves a row behind would then be kept
  out of your list automatically instead of sitting in it until somebody
  notices. **Think of it as fitting the filter before the dirt arrives, rather
  than as clearing up dirt.** That is also why it is no longer urgent.

  **IT ALSO SWITCHES ON A REFUSAL, ADDED 2026-10-09.** Until today, if you
  pressed *"Show test rows"* and opened one of them, the record offered
  **"Delete for good"** — and pressing it would have erased that row for good.
  About sixty automated checks sign into rows like that, and a check that
  cannot run looks exactly like one that passed, so one press could have taken
  the safety net away quietly. The screen now shows the reason instead of the
  button on a test row. **Like the rest of this screen, it does nothing until
  you run the command above**, because it has no tick box to read yet.

  **It is safe to run twice** — it skips work it has already done. It touches
  only `kguqylyzgyzfktkfnhjb`, the development database, never your real
  business.

  **How you will know it worked:** `node scripts/migration-drift.mjs` says
  `customers.is_test` is absent today and will stop saying it. And
  `node scripts/client-fixtures.mjs` will print `column_live: true` instead
  of `false`, and `fixtures_fabricated: false` instead of `true` — it will
  be measuring a real ticked row rather than supplying itself a pretend one.

  **AND IT FINISHES TWO THINGS ON THE LIST RATHER THAN ONE — found 2026-10-03.**
  The screen that hides the test rows **is already written**, and it is now also
  proved: on 2026-10-09, at every screen width from a narrow phone to a desk
  monitor, the list keeps the fake row out, the headline counts thirteen people
  and not fourteen, *"gone quiet"* says five and not six, and the chip brings
  the row back with a **Test** mark on it that is actually visible. **The tick
  box is the whole of what is missing**, and adding it closes **both** of the
  jobs on our list about test rows in your lists (0.3 and 1.3).
  **The job number for this command is now 0.3b**, because 0.3 was cut in two
  on 2026-10-09: the screen half (0.3a) is finished and ticked, and this
  command is the whole of what is left.

  **Nothing breaks while this waits** — the screen goes on looking exactly as it
  does today, which is already correct.

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

  **MEASURED 2026-10-08 — IT WAS ALREADY DONE, AND THIS ROW WAS THE STALE
  ONE.** The page was opened and the opening picture measured, which is the one
  thing this row asked for. **It is 903 pixels on a 900-pixel screen — it
  fits.** So the build queue was right and this row was simply never ticked.
  Nothing was rebuilt, and nothing needed to be.

  **How it is known to be a real measurement and not a lucky reading:** the
  Prime site's opening picture was measured the same way at the same moment as
  a control, and it came back at exactly the figure we have had written down
  for it since 20 September. Three screen sizes each, both sites, and all six
  numbers matched what was recorded. No errors on either page.

  **Nothing for you to do on this one.** It is closed.

- [ ] **DECIDE · On a phone, the giant faded "DELGADO" lettering on the Phoenix
  example site runs behind the first line of the headline. On a computer it
  does not. Ten seconds, and either answer is fine.**

  **Which one:** the Phoenix site, `/ex2` — *Delgado Mobile Detailing*, the
  dark one with the orange buttons.

  **What the thing is.** There is an enormous outlined word "DELGADO" sitting
  faintly behind the top of the page, running off both edges of the screen. It
  is meant to read as a watermark, not as something you read.

  **Why you are being asked.** One of our own audits called it a mistake —
  "the lettering overlaps the headline". A later session disagreed and said it
  is the design working on purpose, because **the first of the five sites you
  sent us unprompted does exactly this**, and that file is our record of what
  you actually like. Nobody wanted to overrule you in either direction, so it
  sat unresolved for two and a half weeks.

  **Nobody had measured it until today, and that settles half of it.** On a
  computer the lettering stops two pixels above the headline — it genuinely
  does not touch it, so the audit's complaint is simply not true there. **On a
  phone it does overlap, by about the height of one line of text.** So both
  sides were right, about different screens.

  **Look at it:** `.manager-shots/7.10/ex2-wordmark-1440.png` is the computer
  view and `.manager-shots/7.10/ex2-wordmark-392.png` is the phone view. The
  phone one is where you can see it crossing behind "Mobile paint".

  **What happens either way.** Leave it and the phone keeps a faint word
  crossing behind the headline's first line — it is very pale, and you may well
  like it. Change it and the lettering moves up to sit above the headline on
  phones, exactly as it already does on wider screens; the watermark stays, the
  character stays, nothing is removed.

  **My recommendation, and it is only that:** move it up on phones. It keeps
  the device you liked on every screen and removes the one place the audit's
  complaint is literally true. **But this is taste and taste is yours** — if
  you say leave it, the audit entry gets struck with a reason and nobody
  re-opens it.

  **It is a small change either way and nothing is broken today.**

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

  ~~**THE PART THAT IS STILL NOT TRUE, and you should know it rather than find
  it.** That same sentence says *"Your customers, their numbers **and your
  photos** are yours."* **There is no photo export.** Not a smaller one — none
  at all. The two honest ways out are to build it or to take the word
  "photos" out of that sentence, and both are yours. Nothing else on the
  promise is outstanding.~~

  **CLOSED — THE PHOTO EXPORT WAS BUILT, AND THIS PARAGRAPH SAT HERE SAYING
  OTHERWISE FOR EIGHTEEN DAYS.** There is a second button, **"Export my
  photos"** on Business → Photos, and it hands over both kinds — the before and
  after shots on real jobs AND the marketing gallery on your public site — with
  a list saying which is which. So the whole sentence on your pricing page is
  now true: customers, their numbers, and the photos.

  **Why you are being told about a three-week-old fix.** Because nothing
  noticed. The same stale claim was in three places at once on 2026-10-08 —
  this row, the roadmap item, and a note inside the code — all of them saying a
  promise was unkept that had been kept since 21 September. **Anyone reading
  any of the three would have gone and built it a second time, or come to you
  about a problem you no longer had.** That is the reason the check described
  at the bottom of ROADMAP 0.4 now exists: it reads every promise on the four
  public pages and goes red when either the promise or the thing behind it
  moves, so this cannot happen again quietly.

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

- **WAIT · Texting is approved and planned; finish its setup when this work
  resumes — decided 2026-10-09.** This is no longer a wording decision or a
  question about whether the product will text. It will. You already started
  the supplier setup and asked to be reminded to return to it. When 0.14
  resumes, finish the number/carrier setup; then the team can settle the exact
  confirmation and reminder words as part of the broader email-and-text design
  review recorded under ROADMAP 3.4.
  **This one step is also all that the booking texts wait on** (ROADMAP 3.3:
  a text when somebody books, and a "Reply C to confirm" text the day before).
  Every session that picks 3.3 up stops at the same place: there is no number
  to send from. Nothing for you to do until you choose to launch.

### The six emails of 2026-09-23 — moved here 2026-10-07 because it was the
### first thing on the page a fortnight later

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

- [ ] **DO · Finish the text-messaging setup and register the number.**
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

- [ ] **Ten-second check: can YOUR computer open the photo address? — 2026-10-10.**
  Logos, gallery photos and website-brief photos now go through the new photo
  address. Open `https://media.detailingplatform.com/` in your browser. A plain
  "not found" page means it works. If it says the site cannot be reached, your
  internet provider's lookup has not picked up the new address yet: your logos
  will look missing on that computer only. Changing the computer's DNS to
  1.1.1.1 fixes it at once, and waiting does too. This session's computer did
  exactly that on and off while testing. **Also known, nothing to do yet:** when
  a photo is deleted, Cloudflare can keep showing it for a while from its
  cache. A logo is unaffected (a new logo is a new file). A deleted gallery
  photo stayed visible for at least two minutes in testing (the longest wait measured) until the cache lets
  go; closing that is a cache setting in Cloudflare, and it is queued in
  ROADMAP 0.11bc2.
