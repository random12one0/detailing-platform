# Release sheet — everything still to go live, in order

Written by `node scripts/release-sheet.mjs` from the database check taken at `46efdb7d` and the server check taken at `e5c6a8a1`. Do not edit by hand; re-run it.

## In plain words

This is one list for your next release, built from the release notes in your list and the release lines in the roadmap. **4 database changes** go into the live database, **0 programs** go onto the server, then **the website** goes out, then **3 more programs** straight after it. **2 programs are held back on purpose** and are listed at the bottom, never as a step. Where an order matters, the step says so and names the step it must come after.

**When to start.** Step 1 must already be done before you begin; if it is not, do not start. Steps 1 to 5 change nothing anybody sees, so you can stop anywhere in them. **Once you start step 6, go through to the end of the sheet in the same sitting:** the database changes, the programs and the website go out together, so no half-done state is left standing; create-booking and create-business must follow the website within minutes.

**The website step will be refused at first, and that is expected.** Your push first checks the server, and it stops while any program is out of date. At that moment 5 always are: the 2 held back, and the 3 that go straight after the website. When it names only those, push with `SHIP_WITH_DRIFT=1 git push`, as your launch notes (0.6b) say.

**Two of your notes disagree, and this sheet settles it.** The 99.2f note (in "Use the shorter email dates and times", and ROADMAP 99.2) says publish create-booking before the website. ROADMAP 97.64 says the website first, then create-booking. **This sheet does the website first and create-booking straight after it, in the same sitting.** Why: the other way round, a customer whose first press was lost and who presses Book again from the old page gets no link to their booking (97.64). Website first, the only cost is that a text-consent tick made in those few minutes is not saved by the old program, and no texts are sent yet anyway (99.2f).

**Two of your rules pull against each other, and this sheet settles it.** Your launch notes (0.6b) say the payment webhook goes last and alone. ROADMAP 97.37 says the payment webhook goes before create-business, and create-business also has to wait for the website. **This sheet publishes the payment webhook alone, then create-business as the very last step.** Why: 0.6b's reason for last and alone is that if anything goes wrong with money there is only one thing it can have been, and the webhook still goes out by itself. The other way round, a detailer who signs up and pays in the minutes between the two would pay and still not go live (97.37).

Nothing here has been done for you. No session applies, publishes or pushes. Each step ends with the ROADMAP items it is for; your notes for each stay in your list as the detail.

## Part 0 — before you start

1. **Must be done first:** a session with the keys runs 0.11cc's one skipped Spanish check, clean. The website step below carries the receipts switch, and you ruled on 2026-10-13 that nothing may go out with a check skipped. If this has not happened, do not start: 97.14's two database changes in Part 2 need the website in the same sitting. · for 0.11cc
2. Recommended, not required: before you start, have a session with the existing R2 setup run 14.39's committed real-R2 proof, rather than relying on the local result. · for 14.39
3. Optional, before the release: twenty minutes on your iPhone with the keyboard up (2.15 and 8.2), following your list's "AT RELEASE" row. · for 2.15
4. Two reads, nothing changes: in the platform's folder, `git status --porcelain supabase/functions` must print nothing (if it prints a file, a session is changing the programs right now; stop). And no browser check may be running on the practice business while you publish. · for 0.6b

## Part 1 — setup outside the code

5. In Stripe: Developers, Webhooks, open the endpoint for connected accounts and add the event `charge.refunded`. While there, check `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed` are on it too (97.68, 97.11). · for 97.68

## Part 2 — the database changes, oldest first

Apply each file from `supabase/migrations/` in this order. One program goes in between them, where a rule needs it.

6. Apply `20261024150000_calendar_feed_token.sql` — only after step 1 (the database check cannot see this kind of change; it is listed because your note says it is not applied) · for 97.53 (Calendar sync is one file per booking; there is no feed to subscribe to)
7. Apply `20261024160000_damage_ack.sql` (the database check cannot see this kind of change; it is listed because your note says it is not applied) · for 97.55 (No pre-job vehicle check-in or customer sign-off)
8. Apply `20261024210000_awaiting_first_payment.sql` (the database check cannot see this kind of change; it is listed because your note says it is not applied) · for 97.37 (Open self-serve signup gives strangers a free, working booking page with no payment)
9. Apply `20261024230000_support_sessions_unlock.sql` (the database check cannot see this kind of change; it is listed because your note says it is not applied) · for 4.3b (Make account audit history include previously orphaned events); 4.3e (Finish the held preview-unlock branch without English fallback)

## Part 3 — the programs

**Then these, in one pass, in any order among themselves:**


## Part 4 — the website

10. **Publish the website** (a push to main). The push check will stop and name create-booking, create-business, stripe-webhook, google-business, platform-admin; when it names only those, push with `SHIP_WITH_DRIFT=1 git push`. Then wait until Netlify shows this deploy as Published (a few minutes) and go straight on. · for 0.11cc, 9.1b, 97.37, 97.53, 97.55, 99.2

## Part 5 — straight after the website, same sitting

**These go after the website, never before it:**

11. Publish `create-booking` — only after step 9, the website step · for 98.2, 99.2

**Then alone, nothing else running; check it before the next step:**

12. Publish, alone, `stripe-webhook` — only after step 5, step 8; carries 97.10 (ticked); carries 97.11 (ticked); carries 97.69 (ticked) · for 97.37, 97.68, 98.2

**Last of all, after the payment webhook:**

13. Publish, last, `create-business` — only after step 8, step 9, the website step, step 12 · for 97.37, 98.2

## Held back on purpose — do NOT publish these this time

- `google-business` — Never published; waits for Google's approval (0.15). Until it goes up, the Google Business screen wrongly tells an owner "Only the owner can connect Google." · for 0.6b, 99.1
- `platform-admin` — Held on purpose until 4.3c is finished: 4.3e combined its two button fixes on 2026-10-24 and waits for your "approve the 4.3e amendments". When it goes, the unlock database change must already be in, or the button answers "did not go through". · for 0.6b, 4.3b, 97.37

## The rules each note set, and where this sheet keeps them

- **97.55 — Customers confirm the car's condition from their receipt link.** The database change first, and it is not optional: get-booking-receipt now reads the new `damage_ack_at` column in its main booking read, so published before the change it fails and EVERY customer's receipt link says Booking not found. The check-in program and the website card need it too. Kept: 20261024160000_damage_ack.sql (step 7) before get-booking-receipt (step undefined); 20261024160000_damage_ack.sql (step 7) before acknowledge-checkin (step undefined); 20261024160000_damage_ack.sql (step 7) before the website.
- **14.39 — Unfinished receipt cleanup.** photo-door and photo-reconcile. Its two database changes went in with the 2026-10-23 release.
- **0.11cc — Expense receipts use the new photo store.** The website is not ready to publish until its one skipped Spanish check is run clean, so that check is the first step, ahead of every database change. Kept: step 1 before 20261024150000_calendar_feed_token.sql (step 6).
- **0.11bd — Let deleted gallery images leave Cloudflare's cache.** The cache-purge token and zone ID were saved as function secrets on 2026-10-23, so photo-door can go out as it is.
- **98.2 — Bring the server up to the saved code.** Full green waits for platform-admin (4.3c) and google-business (99.1); both are held back on this sheet, so the server check will still name them afterwards, and that is expected.
- **97.68 — Let Stripe tell us about refunds.** The payment webhook goes out with 97.10, 97.11 and 97.69 in it. Skipping the Stripe setting breaks nothing; the refund line just stays until it is on. Kept: step 5 before stripe-webhook (step 12).
- **99.2a — Use the shorter email dates and times.** Publishing the website alone does not update emails; the programs do. Its database change is already in. Kept: the website before create-booking (step 11).
- **97.53 — Subscribe your phone's calendar to your jobs.** The database change first: the feed program and the Notifications screen both read the new column, and without it the screen offers only Create calendar link and the feed refuses every link. Kept: 20261024150000_calendar_feed_token.sql (step 6) before calendar-feed (step undefined); 20261024150000_calendar_feed_token.sql (step 6) before the website.
- **2.15 — Twenty minutes on your iPhone with the keyboard up.** No order of its own.
- **4.3b — Publish the two 4.3 pieces and check them live.** The unlock database change goes before create-business and EVERY program that carries the lock (the shared tenant and support-session files); the three support-session changes before it are already applied. Applied on its own it changes nothing. platform-admin stays held until 4.3c is finished. Kept: 20261024230000_support_sessions_unlock.sql (step 9) before create-business (step 13); 20261024230000_support_sessions_unlock.sql (step 9) before create-booking (step 11).
- **9.1b — Publish the booking-preview fix after it is prepared.** No order of its own.
- **99.1 — Connect Google Business, built up to Google's gate.** Its database change is already in. The program waits for Google, so the website goes out without it, and the Google Business screen shows the wrong "Only the owner" sentence until it does.
- **0.6b — Put the back-end programs live, in this order.** update-booking first and alone; platform-billing alone; the payment webhook last and alone. (Its two database changes, before send-email and before the webhook, went in with the 2026-10-23 release.) platform-admin and google-business are held back. When 97.37's create-business goes in the same release, it follows the payment webhook: settled at the top of this sheet.
- **99.2 — Can we work? Can we work on the text and emails kind of plan out so I’m gonna use that lik (roadmap).** Its email wording goes out with every program carrying the shared email kit (with 99.2a). Its line says create-booking before the website; 97.64 says the reverse. Settled at the top of this sheet: website first, create-booking straight after. Kept: the website before create-booking (step 11).
- **97.37 — Open self-serve signup gives strangers a free, working booking page with no payment (roadmap).** The database change first: create-business writes the new column and the back office list reads it, so either one ahead of it breaks signup or the list. Then the payment webhook and the website before create-business: the other way round, a signup that pays stays dark, and a new account lands on a full dashboard that cannot take bookings. The back office's "Waiting for payment" and "Put live without payment" ride with platform-admin, which is held; until it goes, a waiting signup shows as Suspended there and "Reopen account" puts it live (its mark stays set, which is harmless: the dashboard only waits while the account is also switched off). Kept: 20261024210000_awaiting_first_payment.sql (step 8) before create-business (step 13); 20261024210000_awaiting_first_payment.sql (step 8) before stripe-webhook (step 12); stripe-webhook (step 12) before create-business (step 13); the website before create-business (step 13).

## After the release

- A session with the keys runs `node scripts/checkin-live.mjs`: it ticks one demo booking through the public function, reads it back, and puts it back. · for 97.55
- A session repeats 14.39's real-R2 sabotage, successful receipt and scheduled-cleanup proof before ticking it. · for 14.39
- A session checks the live site and ticks 0.11cc and 0.11c. · for 0.11cc
- A session repeats 0.11bd's real warmed-URL check after photo-door is up. · for 0.11bd
- Have a session run the server check (`node scripts/deployed-inventory.mjs`, then `node scripts/receipt.mjs receipts/deployed-inventory.json`) and keep the receipt; 98.2 is ticked only when both pass, which is after the held programs go up. · for 98.2
- Have a session check a real booking confirmation's subject, body and plain-text copy. · for 99.2a
- Subscribe for real: Google Calendar, From URL (or Apple Calendar, New Calendar Subscription), paste the link from Notifications, Your calendar. Reset it once and check the old link stops updating. · for 97.53
- Ten seconds after the website is out: open Business on your phone; under "What customers see" your booking page shows instead of a white box. Then a session reruns `node --env-file=.env scripts/live-setup-counts.mjs` and its `--break=count` control. · for 9.1b
- The server check should now name ONLY the held programs. Anything else it names did not publish: tell a session its name. · for 0.6b
- Optional: make a throwaway account at /app, check it lands on "Finish payment to go live" and its booking page is not found, then remove it from the back office. · for 97.37
- Have a session re-run the database check and the server check, then this sheet. Anything still listed did not go live.

## What this sheet reads, and what it does not

It reads every row in your list that carries a release instruction: 97.55, 14.39, 0.11cc, 0.11bd, 98.2, 97.68, 99.2a, 97.53, 2.15, 4.3b, 9.1b, 99.1, 0.6b. It also reads the release line of every open roadmap item (14); 99.2, 97.37 set an order with no row in your list, and the other 9 are excluded by name in the script, each with its reason.  It does not read: "97.91" (this sheet's own pointer row); "97.3" (released 2026-10-23: key set, 22 of 22 scheduled calls 200; ticked); "97.7" (released 2026-10-23; ticked); "97.12" (released 2026-10-23; ticked); "97.13" (released 2026-10-23; ticked); "97.14" (released 2026-10-23; ticked); "97.18" (released 2026-10-23; ticked); "97.19" (released 2026-10-23; ticked); "97.20" (released 2026-10-23; ticked); "97.21" (released 2026-10-23; ticked); "97.71" (released 2026-10-23; ticked); "97.72" (released 2026-10-23; ticked); "3.1d" (released 2026-10-23; ticked); "98.3" (its publish line named only database changes, already steps in Part 2 through migration-drift.json; released 2026-10-23; ticked (98.12)); "97.28" (a two-minute edit in the private backups repository, not part of this release (like 97.25)); "Publish and apply — the one ordered list" (says DONE 2026-10-10, steps 1 to 9, nothing left); "Waiting on you — nothing breaks while these wait" (a 1,400-line group of older rows; NOT READ by this sheet, said on the sheet). The database check cannot see a change made only of triggers, constraints or data, so a file like that is on this sheet only if one of the rows it reads names it.
