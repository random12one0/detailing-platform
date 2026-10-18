# Release sheet — everything still to go live, in order

Written by `node scripts/release-sheet.mjs` at `51b93c8b` from the database check taken at `49e2cfb0` and the server check taken at `49e2cfb0`. Do not edit by hand; re-run it.

## In plain words

This is one list for your next release, replacing thirteen separate notes. Do it top to bottom, in one sitting. **21 database changes** go into the live database, **38 programs** go onto the server, and then **the website** goes out. Where an order matters, the step says so and names the step it must come after. If you stop halfway, stop at the end of a part, never in the middle of one.

Nothing here has been done for you. No session applies, publishes or pushes.

Each step ends with the ROADMAP items it is for. Your own notes for each item are in your list under "AT YOUR NEXT RELEASE", and they stay there as the detail.

## Part 1 — before the database

1. In Stripe: Developers, Webhooks, open the endpoint for connected accounts and add the event `charge.refunded`. While there, check `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed` are on it too. · for 97.68
2. Publish the program `verify-domain` FIRST, before the database changes. · for 97.13, 98.2

## Part 2 — the database changes, oldest first

Apply each file from `supabase/migrations/` in this order.

3. Apply `20261010010000_email_sends_keeps_the_body.sql` · for 3.1d (a mail-log row opens a preview of the email as sent)
4. Apply `20261010030000_support_sessions_read_only.sql` · for 4.3c (Implement server-recognized read-only support sessions)
5. Apply `20261010040000_google_business_links.sql` · for 99.1 (Let a detailer connect their Google Business profile)
6. Apply `20261011010000_email_sign_as_business.sql` · for 99.2a; 99.2d
7. Apply `20261013130000_receipt_upload_attempts.sql` · for 14.39 (Reclaim a receipt upload that never reaches finish)
8. Apply `20261013131000_receipt_attempts_late_put.sql` · for 14.39 (Reclaim a receipt upload that never reaches finish)
9. Apply `20261016160000_booking_payment_problem.sql` · for 97.10 (The Stripe webhook marks a job paid without checking that the money arrived or how much it was)
10. Apply `20261017000000_booking_lines_same_business.sql` · for 97.12 (Another tenant can insert lines into a business's receipts and invoices)
11. Apply `20261017010000_photos_deadlines_same_business.sql` · for 97.71 (A detailer can attach a job photo or a maintenance deadline to another business's booking)
12. Apply `20261017020000_customer_same_business.sql` · for 97.72 (A maintenance deadline can name another business's CUSTOMER, and the coating-due email goes to whoever that is)
13. Apply `20261017030000_staff_cannot_delete_bookings_or_write_customers.sql` · for 97.14 (Staff logins can hard-delete bookings and edit or delete customers directly, whatever their permissions)
14. Apply `20261017130000_set_customer_notes_refuses_support_sessions.sql` — only after step 13 · for 97.14 (Staff logins can hard-delete bookings and edit or delete customers directly, whatever their permissions)
15. Apply `20261017180000_support_sessions_expire.sql` · for 97.15 (Support ("view as") sessions never expire and hand out a refresh token)
16. Apply `20261017190000_support_sessions_end_at_auth.sql` · for 97.15 (Support ("view as") sessions never expire and hand out a refresh token)
17. Apply `20261017200000_campaigns_get_a_daily_share.sql` · for 97.19 (One tenant's campaigns can use up every other tenant's booking emails for the day)
18. Apply `20261017210000_forget_customer_forgets_their_email.sql` · for 97.20 ("Delete for good" leaves the customer's email address and full email copies behind)
19. Apply `20261017220000_reminders_ignore_marketing_opt_out.sql` · for 97.21 (Unsubscribing from marketing also stops appointment reminders)
20. Apply `20261017230000_reminder_reset_covers_every_marker.sql` · for 97.22 (After a booking moves, the second customer reminder never goes out again)
21. Apply `20261018010000_domain_claims_need_proof.sql` — only after step 2 · for 97.13 (A detailer can mark any domain "verified", or keep the badge after switching domains)
22. Apply `20261018030645_booking_day_rules_lock.sql` · for 97.18 (Two bookings sent at once can both beat the daily cap and the buffer)
23. Apply `20261018050000_forget_customer_forgets_their_street.sql` · for 97.20a (The address cache keeps a deleted customer's street address)

## Part 3 — the programs

Publish each of these to the server. They can go in any order among themselves.

24. Publish `accept-invite` · for 98.2
25. Publish `accept-quote` · for 97.12, 98.2, 99.2a
26. Publish `available-slots` · for 98.2
27. Publish `booking-ics` · for 97.12, 98.2
28. Publish `calculate-booking` · for 97.7, 98.2
29. Publish `cancel-booking` · for 98.2, 99.2a
30. Publish `connect-account` · for 98.2
31. Publish `create-booking` — only after step 22 · for 97.18, 97.7, 98.2, 99.2a
32. Publish `create-business` · for 98.2, 99.2a
33. Publish `delete-customer` · for 98.2
34. Publish `forecast` · for 98.2
35. Publish `get-booking-receipt` · for 97.12, 98.2
36. Publish `google-business` — only after step 5; never published before · for 98.2
37. Publish `invite-user` · for 98.2, 99.2a
38. Publish `owner-push-subscribe` · for 98.2
39. Publish `owner-push-unsubscribe` · for 98.2
40. Publish `pay-booking` · for 98.2
41. Publish `photo-door` · for 98.2
42. Publish `photo-reconcile` · for 98.2
43. Publish `plan-link` · for 97.72, 98.2, 99.2a
44. Publish `platform-admin` · for 98.2, 99.2a
45. Publish `platform-billing` · for 98.2, 99.2a
46. Publish `preview-emails` · for 97.7, 98.2, 99.2a
47. Publish `refresh-weather` · for 98.2
48. Publish `report-problem` · for 98.2, 99.2a
49. Publish `reschedule-booking` — only after step 22 · for 97.18, 97.7, 98.2, 99.2a
50. Publish `respond-to-booking` · for 97.12, 98.2, 99.2a
51. Publish `send-campaign` — only after step 17 · for 97.19, 98.2, 99.2a
52. Publish `send-email` — only after step 17 · for 97.19, 98.2
53. Publish `send-invoice` · for 97.12, 98.2, 99.2a
54. Publish `send-owner-reminders` · for 97.72, 98.2, 99.2a
55. Publish `stripe-webhook` — after step 1; only once 97.10, 97.11, 97.69 are finished, because this one program carries all of them (still open today: 97.10, 97.11, 97.69) · for 97.68, 98.2, 99.2a
56. Publish `track-visit` · for 98.2
57. Publish `translate-content` · for 98.2
58. Publish `update-booking` — only after step 22 · for 97.18, 97.7, 98.2, 99.2a
59. Publish `validate-promo-code` · for 97.7, 98.2
60. Publish `watch-jobs` · for 98.2, 99.2a

## Part 4 — the website, last

61. **Publish the website** (a push to main). It goes last because the push gate refuses it while any program above is not live. · for 97.13, 97.14, 97.19, 97.7

## The rules each note set, and where this sheet keeps them

- **98.2 — Bring the server up to the saved code.** Full green waits for platform-admin (4.3c) and the Google program (99.1); both are on this sheet, and the Google program's database change comes first. Kept: 20261010040000_google_business_links.sql (step 5) before google-business (step 36).
- **97.7 — Two cars on two days show the price they are charged.** No order of its own.
- **97.12 — Stop another business adding lines to a customer's receipt.** Either order is safe.
- **97.18 — Stop two bookings at the same moment beating your daily limit.** The other way round, every booking fails until the database change is in. Kept: 20261018030645_booking_day_rules_lock.sql (step 22) before create-booking (step 31); 20261018030645_booking_day_rules_lock.sql (step 22) before reschedule-booking (step 49); 20261018030645_booking_day_rules_lock.sql (step 22) before update-booking (step 58).
- **97.14 — Stop team logins deleting bookings or changing customers behind the app's back.** Both database changes and the website in ONE sitting. Only one half live: the Notes box stops saving (old website, new database) or says "Your notes were not saved" (new website, old database). Kept: 20261017030000_staff_cannot_delete_bookings_or_write_customers.sql (step 13) before 20261017130000_set_customer_notes_refuses_support_sessions.sql (step 14); 20261017130000_set_customer_notes_refuses_support_sessions.sql (step 14) before the website (the website step).
- **97.21 — Customers who unsubscribe from promo emails still get appointment reminders.** Any order.
- **97.20 — "Delete for good" also wipes the customer from your sent emails.** Nothing to publish with it.
- **97.19 — Stop one detailer's promo emails using up everyone's booking emails.** Programs before the database stops promo emails until it is in. The row lists the website before the two programs; this sheet puts the website last because the push gate refuses the website while any program is not live. The hazard the row names (programs before the database) is still kept. Kept: 20261017200000_campaigns_get_a_daily_share.sql (step 17) before send-email (step 52); 20261017200000_campaigns_get_a_daily_share.sql (step 17) before send-campaign (step 51).
- **97.13 — A web address only goes live when its owner proves it.** The other way round, nobody can add a web address until the program lands. Kept: verify-domain (step 2) before 20261018010000_domain_claims_need_proof.sql (step 21); verify-domain (step 2) before the website (the website step).
- **97.72 — Stop another business putting YOUR customer on ITS jobs, plans or warranty dates.** Either order is safe.
- **97.71 — Stop another business attaching photos or warranty dates to a customer's job.** No program needs publishing.
- **97.68 — Let Stripe tell us about refunds.** Skipping the Stripe setting breaks nothing; the refund line just stays until it is on. Kept: the Stripe setting (step 1) before stripe-webhook (step 55).
- **99.2a — Use the shorter email dates and times.** Publishing the website alone does not update emails; the programs do. Its database change only matters for the "Sign emails with the business name" switch; until it is in, turning that one switch on fails and everything else saves.

## After the release

- Have a session run the server check (`node scripts/deployed-inventory.mjs`, then `node scripts/receipt.mjs receipts/deployed-inventory.json`) and keep the receipt; 98.2 is ticked only when both pass. · for 98.2
- Optional, ten seconds on your phone: book two cars, put the second on a Saturday, and check "Weekend rate" sits under that car on the last step. · for 97.7
- The live-database test `owner-writes` turns green only once this database change is in. · for 97.13
- Have a session check a real booking confirmation's subject, body and plain-text copy. · for 99.2a
- Have a session re-run the database check and the server check, then this sheet. Anything still listed did not go live.

## What this sheet cannot see

The database check cannot see a change made only of triggers, constraints or data, so a file like that is on this sheet only if one of your notes names it. Each step's item comes from your notes and from the commit that added the file.
