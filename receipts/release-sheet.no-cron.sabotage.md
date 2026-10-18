# Release sheet — everything still to go live, in order

Written by `node scripts/release-sheet.mjs` from the database check taken at `49e2cfb0` and the server check taken at `49e2cfb0`. Do not edit by hand; re-run it.

## In plain words

This is one list for your next release, built from the release notes in your list. **21 database changes** go into the live database, **36 programs** go onto the server, and then **the website** goes out. **2 programs are held back on purpose** and are listed at the bottom, never as a step. Where an order matters, the step says so and names the step it must come after.

**When to start.** Step 1 must already be done before you begin; if it is not, do not start. Steps 1 to 7 change nothing anybody sees, so you can stop anywhere in them. **Once you start step 8, go through to the website in the same sitting:** 97.14's two database changes and the website must go out together, or the Notes box stops saving.

**The website step will be refused at first, and that is expected.** Your push first checks the server, and it stops while any program is out of date, which the held ones always are. When it names only the held programs, push with `SHIP_WITH_DRIFT=1 git push`, as your launch notes (0.6b) say.

Nothing here has been done for you. No session applies, publishes or pushes. Each step ends with the ROADMAP items it is for; your notes for each stay in your list as the detail.

## Part 0 — before you start

1. **Must be done first:** a session with the keys runs 0.11cc's one skipped Spanish check, clean. The website step below carries the receipts switch, and you ruled on 2026-10-13 that nothing may go out with a check skipped. If this has not happened, do not start: 97.14's two database changes in Part 3 need the website in the same sitting. · for 0.11cc
2. Recommended, not required: before you start, have a session with the existing R2 setup run 14.39's committed real-R2 proof, rather than relying on the local result. · for 14.39
3. Optional, before the release: twenty minutes on your iPhone with the keyboard up (2.15 and 8.2), following your list's "AT RELEASE" row. · for 2.15
4. Two reads, nothing changes: in the platform's folder, `git status --porcelain supabase/functions` must print nothing (if it prints a file, a session is changing the programs right now; stop). And no browser check may be running on the practice business while you publish. · for 0.6b

## Part 1 — setup outside the code

5. Cloudflare cache purge (0.11bd): create a Cache Purge token restricted to detailingplatform.com and save it in this platform's Supabase function secrets as `CF_CACHE_PURGE_TOKEN`, and the domain's Zone ID as `CF_MEDIA_ZONE_ID` (docs/media-cache-deletion.md). If you skip this, skip the photo-door program in Part 4 too. · for 0.11bd
6. In Stripe: Developers, Webhooks, open the endpoint for connected accounts and add the event `charge.refunded`. While there, check `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed` are on it too (97.68, 97.11). · for 97.68

## Part 2 — programs that go before the database

7. Publish `verify-domain` FIRST, before the database changes. · for 97.13, 98.2

## Part 3 — the database changes, oldest first

Apply each file from `supabase/migrations/` in this order.

8. Apply `20261010010000_email_sends_keeps_the_body.sql` · for 3.1d (a mail-log row opens a preview of the email as sent)
9. Apply `20261010030000_support_sessions_read_only.sql` · for 4.3c (Implement server-recognized read-only support sessions)
10. Apply `20261010040000_google_business_links.sql` · for 99.1 (Let a detailer connect their Google Business profile)
11. Apply `20261011010000_email_sign_as_business.sql` · for 99.2a; 99.2d
12. Apply `20261013130000_receipt_upload_attempts.sql` · for 14.39 (Reclaim a receipt upload that never reaches finish)
13. Apply `20261013131000_receipt_attempts_late_put.sql` — only after step 12 · for 14.39 (Reclaim a receipt upload that never reaches finish)
14. Apply `20261016160000_booking_payment_problem.sql` · for 97.10 (The Stripe webhook marks a job paid without checking that the money arrived or how much it was)
15. Apply `20261017000000_booking_lines_same_business.sql` · for 97.12 (Another tenant can insert lines into a business's receipts and invoices)
16. Apply `20261017010000_photos_deadlines_same_business.sql` · for 97.71 (A detailer can attach a job photo or a maintenance deadline to another business's booking)
17. Apply `20261017020000_customer_same_business.sql` · for 97.72 (A maintenance deadline can name another business's CUSTOMER, and the coating-due email goes to whoever that is)
18. Apply `20261017030000_staff_cannot_delete_bookings_or_write_customers.sql` — only after step 1 · for 97.14 (Staff logins can hard-delete bookings and edit or delete customers directly, whatever their permissions)
19. Apply `20261017130000_set_customer_notes_refuses_support_sessions.sql` — only after step 18 · for 97.14 (Staff logins can hard-delete bookings and edit or delete customers directly, whatever their permissions)
20. Apply `20261017180000_support_sessions_expire.sql` · for 97.15 (Support ("view as") sessions never expire and hand out a refresh token)
21. Apply `20261017190000_support_sessions_end_at_auth.sql` · for 97.15 (Support ("view as") sessions never expire and hand out a refresh token)
22. Apply `20261017200000_campaigns_get_a_daily_share.sql` · for 97.19 (One tenant's campaigns can use up every other tenant's booking emails for the day)
23. Apply `20261017210000_forget_customer_forgets_their_email.sql` · for 97.20 ("Delete for good" leaves the customer's email address and full email copies behind)
24. Apply `20261017220000_reminders_ignore_marketing_opt_out.sql` · for 97.21 (Unsubscribing from marketing also stops appointment reminders)
25. Apply `20261017230000_reminder_reset_covers_every_marker.sql` · for 97.22 (After a booking moves, the second customer reminder never goes out again)
26. Apply `20261018010000_domain_claims_need_proof.sql` — only after step 7 · for 97.13 (A detailer can mark any domain "verified", or keep the badge after switching domains)
27. Apply `20261018030645_booking_day_rules_lock.sql` · for 97.18 (Two bookings sent at once can both beat the daily cap and the buffer)
28. Apply `20261018050000_forget_customer_forgets_their_street.sql` · for 97.20a (The address cache keeps a deleted customer's street address)

## Part 4 — the programs

**First, alone:**

29. Publish, alone, `update-booking` — only after step 9, step 27 · for 97.18, 97.7, 98.2, 99.2a

**Then these, in one pass, in any order among themselves:**

30. Publish `accept-invite` · for 98.2
31. Publish `accept-quote` · for 97.12, 98.2, 99.2a
32. Publish `available-slots` · for 98.2
33. Publish `booking-ics` · for 97.12, 98.2
34. Publish `calculate-booking` · for 97.7, 98.2
35. Publish `cancel-booking` · for 98.2, 99.2a
36. Publish `connect-account` · for 98.2
37. Publish `create-booking` — only after step 27 · for 97.18, 97.7, 98.2, 99.2a
38. Publish `create-business` · for 98.2, 99.2a
39. Publish `delete-customer` · for 98.2
40. Publish `forecast` · for 98.2
41. Publish `get-booking-receipt` · for 97.12, 98.2
42. Publish `invite-user` · for 98.2, 99.2a
43. Publish `owner-push-subscribe` · for 98.2
44. Publish `owner-push-unsubscribe` · for 98.2
45. Publish `pay-booking` · for 98.2
46. Publish `photo-door` — only after step 5, step 13; only if you did step 5; if you skipped it, skip this one too and expect the push check to name it · for 14.39, 98.2
47. Publish `photo-reconcile` — only after step 13; a scheduled program: needs the scheduler key from Part 1 · for 14.39, 98.2
48. Publish `plan-link` · for 97.72, 98.2, 99.2a
49. Publish `preview-emails` · for 97.7, 98.2, 99.2a
50. Publish `refresh-weather` — a scheduled program: needs the scheduler key from Part 1 · for 98.2
51. Publish `report-problem` · for 98.2, 99.2a
52. Publish `reschedule-booking` — only after step 27 · for 97.18, 97.7, 98.2, 99.2a
53. Publish `respond-to-booking` · for 97.12, 98.2, 99.2a
54. Publish `send-campaign` — only after step 22 · for 97.19, 98.2, 99.2a
55. Publish `send-email` — only after step 8, step 22 · for 3.1d, 97.19, 98.2
56. Publish `send-invoice` · for 97.12, 98.2, 99.2a
57. Publish `send-owner-reminders` — a scheduled program: needs the scheduler key from Part 1 · for 97.72, 98.2, 99.2a
58. Publish `track-visit` · for 98.2
59. Publish `translate-content` · for 98.2
60. Publish `validate-promo-code` · for 97.7, 98.2
61. Publish `watch-jobs` — a scheduled program: needs the scheduler key from Part 1 · for 98.2, 99.2a

**Then, alone:**

62. Publish, alone, `platform-billing` · for 98.2, 99.2a

**Last, alone, nothing else running:**

63. Publish, last and alone, `stripe-webhook` — only after step 6, step 14; carries 97.10 (awaits this publish); carries 97.11 (awaits this publish); carries 97.69 (awaits this publish) · for 97.68, 98.2, 99.2a

## Part 5 — the website, last

64. **Publish the website** (a push to main). It goes last because the push check refuses it while any program is not live. It will stop and name google-business, platform-admin (and photo-door if you skipped it); when it names only those, push with `SHIP_WITH_DRIFT=1 git push`. · for 0.11cc, 9.1b, 97.13, 97.14, 97.19, 97.7

## Held back on purpose — do NOT publish these this time

- `google-business` — Never published; waits for Google's approval (0.15). Until it goes up, the Google Business screen wrongly tells an owner "Only the owner can connect Google." · for 0.6b, 99.1
- `platform-admin` — Held on purpose until 4.3c is finished (4.3e is combining two versions of its button fix). Published now, the "Let me make changes" button promises edits that every save refuses. · for 0.6b, 4.3b

## The rules each note set, and where this sheet keeps them

- **14.39 — Unfinished receipt cleanup.** Its two database changes in order, then photo-door and photo-reconcile. Kept: 20261013130000_receipt_upload_attempts.sql (step 12) before 20261013131000_receipt_attempts_late_put.sql (step 13); 20261013131000_receipt_attempts_late_put.sql (step 13) before photo-door (step 46); 20261013131000_receipt_attempts_late_put.sql (step 13) before photo-reconcile (step 47).
- **0.11cc — Expense receipts use the new photo store.** The website is not ready to publish until its one skipped Spanish check is run clean, so that check is the first step, ahead of every database change. Kept: step 1 before 20261017030000_staff_cannot_delete_bookings_or_write_customers.sql (step 18).
- **0.11bd — Let deleted gallery images leave Cloudflare's cache.** Published without those two secrets, the new photo-door refuses every media deletion. Kept: step 5 before photo-door (step 46).
- **98.2 — Bring the server up to the saved code.** Full green waits for platform-admin (4.3c) and google-business (99.1); both are held back on this sheet, so the server check will still name them afterwards, and that is expected.
- **97.7 — Two cars on two days show the price they are charged.** No order of its own.
- **97.12 — Stop another business adding lines to a customer's receipt.** Either order is safe.
- **97.18 — Stop two bookings at the same moment beating your daily limit.** The other way round, every booking fails until the database change is in. Kept: 20261018030645_booking_day_rules_lock.sql (step 27) before create-booking (step 37); 20261018030645_booking_day_rules_lock.sql (step 27) before reschedule-booking (step 52); 20261018030645_booking_day_rules_lock.sql (step 27) before update-booking (step 29).
- **97.14 — Stop team logins deleting bookings or changing customers behind the app's back.** Both database changes and the website in ONE sitting. Only one half live: the Notes box stops saving (old website, new database) or says "Your notes were not saved" (new website, old database). Kept: 20261017030000_staff_cannot_delete_bookings_or_write_customers.sql (step 18) before 20261017130000_set_customer_notes_refuses_support_sessions.sql (step 19); 20261017130000_set_customer_notes_refuses_support_sessions.sql (step 19) before the website.
- **97.21 — Customers who unsubscribe from promo emails still get appointment reminders.** Any order.
- **97.20 — "Delete for good" also wipes the customer from your sent emails.** Nothing to publish with it.
- **97.19 — Stop one detailer's promo emails using up everyone's booking emails.** Programs before the database stops promo emails until it is in. The row lists the website before the two programs; this sheet puts the website last because the push gate refuses the website while any program is not live. The hazard the row names (programs before the database) is still kept. Kept: 20261017200000_campaigns_get_a_daily_share.sql (step 22) before send-email (step 55); 20261017200000_campaigns_get_a_daily_share.sql (step 22) before send-campaign (step 54).
- **97.13 — A web address only goes live when its owner proves it.** The other way round, nobody can add a web address until the program lands. Kept: verify-domain (step 7) before 20261018010000_domain_claims_need_proof.sql (step 26); verify-domain (step 7) before the website.
- **97.72 — Stop another business putting YOUR customer on ITS jobs, plans or warranty dates.** Either order is safe.
- **97.71 — Stop another business attaching photos or warranty dates to a customer's job.** No program needs publishing.
- **97.68 — Let Stripe tell us about refunds.** The payment webhook goes out with 97.10, 97.11 and 97.69 in it. Skipping the Stripe setting breaks nothing; the refund line just stays until it is on. Kept: step 6 before stripe-webhook (step 63).
- **99.2a — Use the shorter email dates and times.** Publishing the website alone does not update emails; the programs do. Its database change only matters for the "Sign emails with the business name" switch; until it is in, turning that one switch on fails and everything else saves.
- **2.15 — Twenty minutes on your iPhone with the keyboard up.** No order of its own.
- **4.3b — Publish the two 4.3 pieces and check them live.** The support-session database change goes before the programs that share its lock. platform-admin waits for 4.3e (your list says not to answer the 4.3c questions yet). Kept: 20261010030000_support_sessions_read_only.sql (step 9) before update-booking (step 29).
- **9.1b — Publish the booking-preview fix after it is prepared.** No order of its own.
- **99.1 — Connect Google Business, built up to Google's gate.** Its database change is harmless on its own and goes in with the rest. The program waits for Google, so the website goes out without it, and the Google Business screen shows the wrong "Only the owner" sentence until it does.
- **0.6b — Put the back-end programs live, in this order.** update-booking first and alone; the one-column change before send-email; platform-billing alone; the payment webhook last and alone, with its database change before it. platform-admin and google-business are held back. Kept: 20261010010000_email_sends_keeps_the_body.sql (step 8) before send-email (step 55); 20261016160000_booking_payment_problem.sql (step 14) before stripe-webhook (step 63).
- **3.1d — Start here — the routine release step that unblocks the most.** The one-column change before send-email, or every email stops being logged until it is in. Kept: 20261010010000_email_sends_keeps_the_body.sql (step 8) before send-email (step 55).

## After the release

- A session repeats 14.39's real-R2 sabotage, successful receipt and scheduled-cleanup proof before ticking it. · for 14.39
- A session checks the live site and ticks 0.11cc and 0.11c. · for 0.11cc
- A session repeats 0.11bd's real warmed-URL check after photo-door is up. · for 0.11bd
- Have a session run the server check (`node scripts/deployed-inventory.mjs`, then `node scripts/receipt.mjs receipts/deployed-inventory.json`) and keep the receipt; 98.2 is ticked only when both pass, which is after the held programs go up. · for 98.2
- Optional, ten seconds on your phone: book two cars, put the second on a Saturday, and check "Weekend rate" sits under that car on the last step. · for 97.7
- The live-database test `owner-writes` turns green only once this database change is in. · for 97.13
- Have a session check a real booking confirmation's subject, body and plain-text copy. · for 99.2a
- Ten seconds after the website is out: open Business on your phone; under "What customers see" your booking page shows instead of a white box. Then a session reruns `node --env-file=.env scripts/live-setup-counts.mjs` and its `--break=count` control. · for 9.1b
- The server check should now name ONLY the held programs. Anything else it names did not publish: tell a session its name. · for 0.6b
- Have a session re-run the database check and the server check, then this sheet. Anything still listed did not go live.

## What this sheet reads, and what it does not

It reads every row in your list that carries a release instruction: 97.3, 14.39, 0.11cc, 0.11bd, 98.2, 97.7, 97.12, 97.18, 97.14, 97.21, 97.20, 97.19, 97.13, 97.72, 97.71, 97.68, 99.2a, 2.15, 4.3b, 9.1b, 99.1, 0.6b, 3.1d. Of "Start here" it reads only the first row (3.1d); the rows under it are the 2026-09-23 publish order your launch notes (0.6b) replaced. It does not read: "97.91" (this sheet's own pointer row); "Publish and apply — the one ordered list" (says DONE 2026-10-10, steps 1 to 9, nothing left); "Waiting on you — nothing breaks while these wait" (a 1,400-line group of older rows; NOT READ by this sheet, said on the sheet). The database check cannot see a change made only of triggers, constraints or data, so a file like that is on this sheet only if one of the rows it reads names it.
