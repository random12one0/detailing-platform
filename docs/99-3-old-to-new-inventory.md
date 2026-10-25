# ROADMAP 99.3 — every old back-office control, and where it lives now

The old back office was one screen, `app/src/admin/AdminPage.jsx`, deleted in commit `002639c3`
(read it with `git show 002639c3^:app/src/admin/AdminPage.jsx`; old line numbers below are from that
copy). This page lists every button, form, tab and section it had and finds its home in the new
office, so nothing the old screen could do disappears without anyone saying so. It was built by reading
both sides' source on 2026-10-24 at `52ccb399`; the two 99.14 rows were updated at `1bee5eb0`. Nothing was run in a browser for it.

Short paths: `office/` is `app/src/admin/office/`, `lib/` is `app/src/lib/`, `old:N` is a line in the
deleted file. "Action sent" is the `action` the control posts to the `platform-admin` edge function;
"none" means the control only reads what `list` or `get` already sent.

**What the server is asked to do, old against new.** The old screen sent 14 actions: `list`, `whoami`,
`create`, `get`, `build_start`, `restore`, `suspend`, `impersonate`, `export`, `resend_invite`,
`platform_net`, `platform_cost_add`, `prices`, `email_list`. The new office sends 13 of them (found
with `grep -rn 'action' app/src/admin/office`). **`build_start` is the only one with no sender left**:
the one place it still appears in `app/src` is the history wording at `office/DetailerPanel.jsx:25`.

## The frame (sign-in, tabs, header)

| Old control | What it did | New home (file:line) | Action sent | Status | Proof |
|---|---|---|---|---|---|
| Sign-in door (old:274-339) | Email and password form; one refusal sentence for both wrong halves | `office/OfficePage.jsx:82-90`, `:140-176` | none (Supabase sign-in) | MOVED | `scripts/office-move.mjs` |
| Show/hide password eye (old:312-318) | Toggles the password field | `office/OfficePage.jsx:160-164` | none | MOVED | not confirmed (office-move covers the door; the eye itself not confirmed) |
| Admin gate, 404 for everyone else (old:262-270, 350) | `whoami`; failure renders the product's own 404 | `office/OfficePage.jsx:70-71`, `:177` | `whoami` | MOVED | `scripts/admin-refuses.mjs`; `tests/platform-admin.test.mjs` (server boundary) |
| Platform read (old:246) | One `list` read feeds every tab | `office/OfficePage.jsx:57-59` | `list` | MOVED | `scripts/office-detailers.mjs`, `scripts/office-today.mjs` (live passes) |
| Signed-in address + Sign out (old:420-421) | Printed the admin's email and a Sign out button | `office/OfficePage.jsx:217-220` (rail), `:228-231` (phone header), `:80` | none | CHANGED: shows a name worked out from the address (`nameOf`, `:31-34`), not the address; Sign out now reloads the page | `scripts/office-move.mjs` (`--break=no-signout`) |
| Five tabs: Today, Growth, Money, Detailers, System health (old:120-126, 424-432) | Switched the page body | `office/places.jsx:270-281` | none | CHANGED: four places; there is no Growth place (its parts went to Today's sign-up path and the per-detailer issue line); number keys and Ctrl K added | `scripts/office-today.mjs`, `office-money.mjs`, `office-system.mjs` (each checks its place's position); `scripts/office-detailers.mjs` (Ctrl K) |
| Red dot on the System health tab (old:359-410, 429) | Lit when any alert was on: a stopped job, email at 80% of the cap, any failed email, storage at 80%, storage over-promised, any suspended detailer | `office/places.jsx:280` (`brokenOf`, `lib/officeSystem.js:122`) | none | CHANGED: counts only "broken" checks. Email or storage near a limit and over-promised storage are "warn" and do not count; suspended detailers are not a System alert at all | `scripts/office-system.mjs` (badge equals broken count) |
| "Could not load" box (old:436) | Showed the `list` error | `office/OfficePage.jsx:243` | `list` (Try again) | MOVED (now has a Try again button) | none found |

## Old tab 1 · Today

| Old control | What it did | New home (file:line) | Action sent | Status | Proof |
|---|---|---|---|---|---|
| Lead sentence "N things need you" / "Nothing needs you right now" (old:516-530) | Counted broken jobs, detailers needing a call and waiting customers together | `office/places/today/NeedsYou.jsx:12-13` | none | CHANGED: "Needs you N" and "Nobody needs you." count detailers only, not broken jobs or waiting customers | `scripts/office-today.mjs` |
| "Something is broken" card (old:533-546) | Listed every alert at the top of Today | `office/places/system/Loud.jsx:7-24` (from `lib/officeSystem.js:54-117`) | none | CHANGED: not on Today any more; it is on the System place and the rail badge | `scripts/office-system.mjs`; `tests/office-system.test.mjs` |
| "Customers waiting on an answer" (old:549-564) | Named each detailer with unanswered booking requests (`requests_waiting`) | none | — | MISSING: `requests_waiting` appears nowhere in `app/src/admin/office` or `lib/office*.js` (grep) | none found |
| "Detailers who need a call" (old:566-613) | Every detailer from `needsALook`, the reasons, the advice, a phone link and an email link | `office/places/today/NeedsYou.jsx:8-37`, using `issueOf` (`lib/officeDetailers.js:125-147`) and `needsYou` (`lib/officeToday.js:225-234`) | none | CHANGED: at most five shown (`lib/officeToday.js:217`) with an "N more" button; one button each (Text if there is a phone, else Email), not a phone link and an email link side by side | `tests/office-today.test.mjs`; `scripts/office-today.mjs`; `tests/admin-preconditions.test.mjs` |
| "See everyone" button (old:572) | Jumped to the Detailers tab | `office/places/today/NeedsYou.jsx:31-35`; rail `office/OfficePage.jsx:199-211` | none | MOVED (the in-section button appears only past five; the rail is always there) | `scripts/office-today.mjs` |
| Tile: a month, recurring (old:621) | `totals.mrr_cents` | `office/places/today/MoneyNow.jsx:39` | none | MOVED | `scripts/office-today.mjs` |
| Tile: Detailers (old:622) | `totals.businesses` | `office/places/today/MoneyNow.jsx:40` | none | MOVED | `scripts/office-today.mjs` |
| Tile: Joined this month (old:623) | `totals.new_month` | `office/places/today/MoneyNow.jsx:41` | none | MOVED | `scripts/office-today.mjs` |
| Tile: Suspended (old:624) | `totals.suspended`, warning-colored when above zero | per row: status pill `lib/officeDetailers.js:56`, "At risk" chip `:159` | none | CHANGED: no count anywhere; each suspended detailer has a Suspended pill and sits in the "At risk" chip with late and quiet ones | `scripts/office-detailers.mjs` |
| Tile: Founding spots left (old:625) | `totals.founding_left` | none | — | MISSING: `founding_left` appears nowhere in the new office (grep) | none found |
| "$X passed through the platform this month" (old:627-630) | `totals.revenue_month`, the detailers' own takings, labeled as not ours | none | — | MISSING: `totals.revenue_month` is not read. "Money in this month" (`office/places/today/MoneyNow.jsx:22-27`) is a different figure: invoices paid to the platform, from `platform_net` | none found |

## Old tab 2 · Growth

| Old control | What it did | New home (file:line) | Action sent | Status | Proof |
|---|---|---|---|---|---|
| Lead sentence "N detailers, K of them taking bookings" (old:707-720) | Real-detailer count and how many book | `office/places/today/SignupPath.jsx:7-24` (`signupPath`, `lib/officeToday.js:242-257`) | none | CHANGED: shown as five count bars ("Signed up" … "Booked in the last N days") rather than a sentence | `tests/office-today.test.mjs`; `scripts/office-today.mjs` |
| Stuck line "setup": not got through setup, with names (old:687-693, 722-758; `lib/growthLines.js:54`) | One line naming every real detailer short of the setup floor | `lib/officeDetailers.js:112` ("Stuck in setup" kicker) via `issueOf`; count on `SignupPath` | none | CHANGED: no single line naming them all; each detailer carries it as their one issue | `tests/growth-lines.test.mjs` (re-homed to `issueOf`, commit `cab7ea7e`) |
| Stuck line "open": booking page cannot take a booking (`lib/growthLines.js:61-67`) | Named each active account whose page cannot book, with the missing piece | `issueOf` in `lib/officeDetailers.js` (via `bookabilityOf`), drawn on Today's Needs you, Detailers' Main issue and the drawer | — | CHANGED (2026-10-24, ROADMAP 99.14, `1bee5eb0`): one kicker per detailer, "Can't take bookings", with the missing piece before the advice, instead of a named line | `tests/growth-lines.test.mjs` 6b, `tests/admin-insight.test.mjs` 10g/10h |
| Stuck line "first": never taken a booking (`lib/growthLines.js:89`) | Named each one | `lib/officeDetailers.js:110` ("Never booked") | none | CHANGED: per-detailer issue, not one named line | `tests/growth-lines.test.mjs`; `tests/office-detailers.test.mjs` |
| Stuck line "quiet": not booked in N days (`lib/growthLines.js:102`) | Named each one | `lib/officeDetailers.js:59` (status pill), `:111` ("Gone quiet") | none | CHANGED: per-detailer issue and pill | `tests/growth-lines.test.mjs`; `tests/office-detailers.test.mjs` |
| Stuck line "site": no website (`lib/growthLines.js:107`) | Named each one | `lib/officeDetailers.js:113` ("No website") | none | CHANGED: per-detailer issue. A detailer gets ONE kicker, the first that matches (`:137`), so somebody stuck in setup with no website shows only "Stuck in setup"; the old page put them on both lines on purpose (old:752-756) | `tests/growth-lines.test.mjs` |
| "The founding offer": spots left, how many on the founding price (old:760-785) | A sales-call number that runs out | none | — | MISSING: `founding_left` not read; Money's plan split is by billing interval, not by plan (`lib/officeMoney.js:70-85`) | none found |
| "Not here yet": churn, signup source, average setup time (old:789-801) | Said in words what the screen could not know | none | — | MISSING (whether dropped on purpose is not confirmed) | none found |
| "Open a detailer" button (old:803-810) | Jumped to Detailers | rail `office/places.jsx:272-278`; Ctrl K `office/Palette.jsx` | none | MOVED | `scripts/office-detailers.mjs` |

## Old tab 4 · Detailers (list)

| Old control | What it did | New home (file:line) | Action sent | Status | Proof |
|---|---|---|---|---|---|
| "Sign up a detailer" button and form (old:868-974) | Name, booking link (follows the name), email, phone, timezone; Create and invite; shows the invite link | `office/places/Detailers.jsx:186-188`; `office/SignUp.jsx:223-302` | `create` (`office/SignUp.jsx:252`) | MOVED (the Cancel button became close, Escape or the scrim; Create stays off until the form is complete) | `scripts/office-account.mjs` |
| Search box (old:1011-1012, 993-995) | Filtered the list by name, link, owner email or contact email | `office/Palette.jsx:316-325` (Ctrl K) | none | CHANGED: no search on the list; Ctrl K matches name, link and owner email (not contact email) and opens the panel | `scripts/office-detailers.mjs` (Ctrl K finds by name) |
| Filter chips with counts: Everyone, Real detailers, Past due, Setup unfinished, No bookings ever, Quiet N days, No website yet (old:852-866, 1013-1020) | Narrowed the list | `lib/officeDetailers.js:154-161`; `office/places/Detailers.jsx:171-176` | none | CHANGED: chips are Everyone, Needs you, Live, Setting up, At risk, Test accounts. Past due, No bookings ever and No website yet are no longer filters on their own; "Real detailers" became a real-first sort | `scripts/office-detailers.mjs`; `tests/office-detailers.test.mjs` |
| List row (old:1029-1079) | Name with demo, suspended, past-due and set-up flags; reason line or "last booking" line; jobs, earned, customers, setup n of m | `office/places/Detailers.jsx:59-91` | none | CHANGED: health ring, setup bar, 12-week sparkline, earned and jobs, main issue. The customer count and the "last booking X ago" line are no longer on the row (customers is in the panel) | `scripts/office-detailers.mjs` |
| Footnote "Showing N of M, including D demo rows" (old:1083-1085) | Said how much of the list was fixtures | none | — | MISSING (chip counts remain, `office/places/Detailers.jsx:174`) | none found |
| Opening a detailer (old:998-1005) | Fetched their detail | `office/OfficePage.jsx:93-116` (five at a time, cached) | `get` | MOVED | `scripts/office-detailers.mjs` |

## Old tab 4 · Detailers (one detailer's drawer)

| Old control | What it did | New home (file:line) | Action sent | Status | Proof |
|---|---|---|---|---|---|
| Header: link, name, owner email (old:1162-1166) | Who this is | `office/DetailerPanel.jsx:184-187` | none | MOVED (the booking link slug is no longer printed) | `scripts/office-detailers.mjs` |
| Reasons and what to do (old:1171-1176) | Same sentence as Today | `office/DetailerPanel.jsx:194-201` | none | MOVED (now with a Text or Email button) | `tests/office-detailers.test.mjs` |
| "Their last six months" chart (old:1178-1183) | Finished jobs per month | `office/DetailerPanel.jsx:240-249` (`weeklyBookings`, `lib/officeDetailers.js:185-195`) | none | CHANGED: 12 weeks of bookings made, not six months of finished jobs | `tests/office-detailers.test.mjs` |
| Row: Finished this month (old:1187) | `jobs_month` | `office/DetailerPanel.jsx:234` | none | MOVED | none found |
| Row: Earned this month (old:1192) | `revenue_month` | `office/DetailerPanel.jsx:235` | none | MOVED | none found |
| Row: Earned, all time (old:1193) | `revenue_total` | none | — | MISSING: `revenue_total` not read. "Paid you" (`office/DetailerPanel.jsx:251-256`) is a different figure: what they paid the platform | none found |
| Row: Customers (old:1194) | `customers` | `office/DetailerPanel.jsx:236` | none | MOVED | none found |
| Row: Last booking (old:1195) | "X days ago" | `office/DetailerPanel.jsx:48` (an entry in "What happened") | none | CHANGED: no row of its own; it is one line in the history | none found |
| Row: Requests waiting (old:1196) | `requests_waiting` | none | — | MISSING (see Today, same field) | none found |
| Row: Setup n of m (old:1197) | Count | `office/DetailerPanel.jsx:222-229` | none | MOVED (now lists every step, ticked) | none found |
| Row: Subscription (old:1198) | Billing label | `office/DetailerPanel.jsx:190` (chip) | none | MOVED | none found |
| Row: Their page (old:1199-1202) | `bookability`: taking bookings, takes requests, or why it cannot book | the drawer's issue line (`office/DetailerPanel.jsx`, `issueOf`) | — | CHANGED (2026-10-24, ROADMAP 99.14): a page that cannot book is named with its missing piece; "takes requests" and "taking bookings" are no longer stated | `tests/growth-lines.test.mjs` 6b |
| Row: Website verified / not verified / none yet (old:1203) | `site_url` plus `domain_verified` | `office/DetailerPanel.jsx:264` (a "Their site" link only) | none | MISSING: `domain_verified` not read; whether the domain is verified is not shown | none found |
| Row: Build started (old:1210-1213) | The day the build fee stopped being refundable, or "not started" | none | — | MISSING: `site_build_started_at` not read in the office (the detailer's own `app/src/screens/more/Billing.jsx:829` shows it to the detailer) | none found |
| Their site link (old:1218-1220) | Opens their website | `office/DetailerPanel.jsx:264` | none | MOVED | none found |
| Their booking page link (old:1221) | Opens `/book/<link>` | `office/DetailerPanel.jsx:265` | none | MOVED | none found |
| "Tell them work has started" (old:1222-1242) | Emailed the detailer that work began today and stamped the date; asked first, because it ends their refund right | none | `build_start` (old) — no sender now | MISSING — **confirmed.** The only `build_start` left in `app/src` is the history wording `office/DetailerPanel.jsx:25`. ROADMAP.md:31590 records "legal-promises buildfee-notice-terms UNBACKED (no screen sends build_start since the old screen went — needs a control in DetailerPanel, template/action/migration intact)" | `tests/legal-promises.test.mjs` holds it as an UNBACKED row (its header, lines 55-59) |
| Email them link (old:1243) | `mailto:` | `office/DetailerPanel.jsx:263` ("Email"; Text and Call added beside it) | none | MOVED | `tests/office-detailers.test.mjs` (`contactOf`) |
| Restore (old:1244-1246) | Asked "Let X back in?" in a browser box, then restored | `office/DetailerPanel.jsx:146-151`, `:287-288` | `restore` | CHANGED, then RESTORED by ROADMAP 99.16: asks "Let X back in?" before it sends `restore` (and "Put X live without payment?" for a signup that never paid, ROADMAP 97.37); labeled "Reopen account" / "Put live without payment" | `scripts/office-restore-look.mjs` (browser, no credentials, 76 assertions); `scripts/suspend-delete-waive.mjs` (presses Reopen account then the answer; live run); `tests/office-detailers.test.mjs` |
| Suspend, asks in place (old:1247-1258) | "Suspend X? Their booking page stops taking bookings." | `office/DetailerPanel.jsx:289-297` | `suspend` | MOVED | `scripts/suspend-delete-waive.mjs` |
| "Look at their dashboard" (old:1259-1298) | Opened a read-only preview tab; off when the account has no owner | `office/DetailerPanel.jsx:155-173`, `:266` | `impersonate` | CHANGED: hands the tab the access token only, no refresh token (ROADMAP 97.15). The switch-off when nobody has accepted the owner invite is RESTORED by ROADMAP 99.16, decided from `detail.members` as the old screen did, with the reason written under the button; unknown (detail not read) leaves it on | `scripts/office-restore-look.mjs` (browser, no credentials); `scripts/support-view-ends.mjs` |
| "Download everything they own" (old:1299-1328) | JSON file of the business | `office/DetailerPanel.jsx:64-74`, `:87-89` | `export` | MOVED | `scripts/office-account.mjs` |
| "Send an owner invite" form (old:1329-1387) | Address, Send it; shows the link only if the email failed | `office/DetailerPanel.jsx:75-80`, `:90-112` | `resend_invite` | MOVED | `scripts/office-account.mjs` |
| "Nobody has accepted the owner invite yet" note (old:1339-1343) | Shown when `detail.members` has no owner | `office/DetailerPanel.jsx:85` | none | CHANGED, then RESTORED by ROADMAP 99.16: decided from `detail.members` (the old screen's own note, old:1125-1129, says `row.owner_email` is filled from the contact address when there is no owner) | `scripts/office-restore-look.mjs` B4 |
| "Who has opened this account" (old:1389-1456) | Last 20 admin actions, by whom and when; "twenty most recent" note; "Nothing is recorded" when empty | `office/DetailerPanel.jsx:42-51`, `:275-283` ("What happened") | none (reads `get`'s `events`) | CHANGED: mixed with paid invoices, last booking and signup day, capped at 8 lines in total; does not say which admin did it; no "twenty most recent" or "nothing recorded" sentence | `tests/platform-admin.test.mjs:1690` (source pin on the list) |

## Old tab 3 · Money

| Old control | What it did | New home (file:line) | Action sent | Status | Proof |
|---|---|---|---|---|---|
| Lead sentence "$X a month is ours" (old:1724-1728) | `totals.mrr_cents` | `office/places/money/ByPlan.jsx:15`; also Today `office/places/today/MoneyNow.jsx:39` | none | CHANGED: Money's figure is worked out in the browser from real detailers' subscriptions (`lib/officeMoney.js:70-85`), not the server's `mrr_cents`; whether the two always agree is not confirmed | `tests/office-money.test.mjs`; `scripts/office-money.mjs` |
| "$X passed through the platform" (old:1729-1732) | `totals.revenue_month`, labeled not ours | none | — | MISSING (same as Today's row) | none found |
| "Money at risk" (old:1736-1770) | Paying accounts with a problem, the reason, $/month, an email link, and the total at risk | pieces only: card-failed slice `office/places/money/ByPlan.jsx:33-35`; red pins `office/places/money/ComingIn.jsx:30,41`; "Needs you" sorted dearest first with $/month `office/places/today/NeedsYou.jsx:25`; "At risk" chip | none | CHANGED: no single list and no total of money at risk | `tests/office-money.test.mjs`; `scripts/office-coming-in.mjs` |
| "Not paying yet" (old:1772-1787) | Accounts whose subscription never started | partial: "Waiting for payment" status `lib/officeDetailers.js:53-55` | none | MISSING as a list (the new status covers only signups the server marks `awaiting_first_payment`) | none found |
| "Did we make money?" month switch (old:1561-1568) | Previous/next month, no limit backward | `office/places/money/Bills.jsx:70-74` | `platform_net` (`office/useNet.js:11`) | CHANGED: limited to the last 12 months (`office/places/money/month.js:21`) | `scripts/office-bills-month.mjs` |
| Paid to us, costs entered, each kind, kept / lost / broke even / not entered (old:1584-1613) | One month's net, never a guess | `office/places/money/Bills.jsx:18-31`; `Kept.jsx`; `Steps.jsx` | `platform_net` | MOVED | `tests/office-money.test.mjs`; `tests/platform-net.test.mjs`; `scripts/office-money.mjs` |
| Failed read with Try again (old:1571-1581) | Said no figure is shown, offered Try again | `office/places/money/Bills.jsx:75` | `platform_net` | CHANGED: says "Could not read the bills for X." with no Try again; `office/useNet.js:9-14` keeps the failed answer until a reload (a re-read after a failure is not confirmed) | none found |
| "Add a bill" form: kind, amount, note, Save (old:1616-1638) | Typed in a platform bill | `office/places/money/Bills.jsx:33-59`, `:84-88` (an "Add it" per bill line) | `platform_cost_add` | MOVED | `scripts/office-money.mjs`; `scripts/office-bills-month.mjs`; `tests/platform-net.test.mjs` |
| "What we earn, by plan" (old:1789-1808) | Monthly income by plan tier (founding, standard) | `office/places/money/ByPlan.jsx:9-40` | none | CHANGED: split by monthly against yearly billing, not by plan tier; a failed card is shown apart | `tests/office-money.test.mjs`; `scripts/office-money.mjs` |
| "What we charge" table (old:1810-1891) | The platform's price table, custom or standard | `office/places/money/Prices.jsx:51-131` (folded) | none | MOVED | `scripts/office-prices.mjs` |
| Change / Save / Cancel prices (old:1832-1871, 1888) | Editor; the server judges the figures | `office/places/money/Prices.jsx:35-40`, `:118-123` | `prices` | MOVED (one press opens it editable, 9.12c) | `scripts/office-prices.mjs` |
| "Go back to the built-in prices" (old:1711-1715, 1872-1876) | Browser confirm, then sends `null` | `office/places/money/Prices.jsx:112-117`, `:122` | `prices` (`null`) | MOVED (asks in place instead of a browser box) | `scripts/office-prices.mjs` |
| "Promo codes" list (old:1894-1910) | Each platform code, on or off, times used | none | — | MISSING: `promos` is not read anywhere in the new office (grep) | none found |
| "Not here yet": Stripe (old:1913-1922) | Said Stripe is not connected | `lib/officeSystem.js:114` ("Card payments", never proven, on System) | none | MOVED | `tests/office-system.test.mjs` |

## Old tab 5 · System health

| Old control | What it did | New home (file:line) | Action sent | Status | Proof |
|---|---|---|---|---|---|
| Lead sentence (old:2050-2061) | "Everything that reports in is reporting in", or which have never reported, or nothing reporting | `office/places/system/Pulse.jsx:20-56` ("N of M working") | none | CHANGED: a count and a picture instead of the sentence; never-reported jobs are listed by Loud | `scripts/office-system.mjs` |
| "Jobs that run on their own", three states (old:2068-2101) | Each job: ran X ago / not reported yet, and its limit | `lib/officeSystem.js:45-76`; `office/places/system/Every.jsx`, `Loud.jsx` | none | MOVED (adds a line for a named job with no record at all) | `tests/office-system.test.mjs`; `scripts/office-system.mjs` |
| "No job is reporting" (old:2106-2115) | Not called healthy | `lib/officeSystem.js:71` | none | MOVED | `tests/office-system.test.mjs` |
| Dead man's switch (old:2116-2128) | Set up or not | `lib/officeSystem.js:78-80` ("Outside watcher") | none | MOVED | `tests/office-system.test.mjs`; `tests/dead-mans-switch.test.mjs` |
| Last restore test (old:2132-2151) | Date, tables, logins, files; warns past 90 days | `lib/officeSystem.js:82-91` | none | MOVED (the file count is dropped) | `tests/office-system.test.mjs` (`scripts/restore-date-visible.mjs` refuses since 99.3b-iii) |
| Email today: sent of cap, failed, who signups go to (old:2156-2164) | Meter plus "Signups go to <address>" or "NOBODY is being emailed about signups" | `office/places/system/Gauges.jsx:26-37`; check `lib/officeSystem.js:93-101` | none | CHANGED: the address signups go to is no longer printed (only a warning when there is none); adds a "signup notices lost" state | `tests/office-system.test.mjs`; `scripts/office-system.mjs` |
| Photo storage: used of total, detailer count, share each, over-promised (old:2165-2185) | Meter plus share line | `office/places/system/Gauges.jsx:32-33`; check `lib/officeSystem.js:103-111` | none | CHANGED: the detailer count and the per-detailer share are not shown; over-promised is a warning sentence | `tests/office-system.test.mjs` (`scripts/photo-allowance-figure.mjs` refuses since 99.3b-iii) |
| "Email we sent": Everything / Problems, Try again (old:1962-2042) | Platform-wide mail list | `office/places/system/Mail.jsx:24-106` (folded) | `email_list` | MOVED | `scripts/office-mail.mjs`; `tests/email-list.test.mjs` (`scripts/email-list-admin.mjs` refuses since 99.3b-iii) |
| Not wired up: Stripe (old:2195) | Needs connecting | `lib/officeSystem.js:114` | none | MOVED | `tests/office-system.test.mjs` |
| Not wired up: Netlify (old:2196) | Connected, not read | `lib/officeSystem.js:115` | none | MOVED | `tests/office-system.test.mjs` |
| Not wired up: Supabase (old:2197) | Needs wiring | none | — | MISSING (not in `checksOf`, `lib/officeSystem.js:54-117`) | none found |
| Not wired up: "Was it down on Tuesday?" (old:2198) | Nothing keeps a history | none | — | MISSING (not in `checksOf`) | none found |

## MISSING / CHANGED summary

85 rows above: 38 MOVED, 31 CHANGED, 16 MISSING (counted from the Status column of this file after the 99.14 fix moved two rows from MISSING to CHANGED,
`grep '^| ' docs/99-3-old-to-new-inventory.md` filtered on column 5). The lists below merge repeats: the
"passed through the platform" row appears on two old tabs (18 rows, 17 items), and the four stuck lines
setup, first, quiet and site are one item (29 rows, 26 items).

**MISSING (no new home found)**

1. Today: "Customers waiting on an answer" (`requests_waiting`).
2. Today: Founding spots left tile.
3. Today and Money: "$X passed through the platform this month" (`totals.revenue_month`).
5. Growth: "The founding offer" section.
6. Growth: "Not here yet" (churn, signup source, setup time).
7. Detailers: "Showing N of M, including demo rows" footnote.
8. Drawer: Earned, all time (`revenue_total`).
9. Drawer: Requests waiting.
11. Drawer: Website verified / not verified (`domain_verified`).
12. Drawer: Build started date (`site_build_started_at`).
13. Drawer: "Tell them work has started" (`build_start`) — confirmed; the only action with no sender; legal-promises row UNBACKED.
14. Money: "Not paying yet" list.
15. Money: Promo codes list.
16. System: "Supabase · needs wiring" line.
17. System: "Was it down on Tuesday?" line.

**CHANGED (exists, behaves differently)**

0. Booking page cannot take a booking (Growth "open" line and the drawer's "Their page" row): now the "Can't take bookings" kicker, ROADMAP 99.14, built 2026-10-24.

1. Signed-in address shown as a derived name; Sign out now reloads.
2. Five tabs became four places; no Growth place.
3. System badge counts broken checks only (near-limit email/storage, over-promised storage and suspended detailers no longer light it).
4. Today's lead count covers detailers only.
5. "Something is broken" moved off Today to System.
6. "Detailers who need a call": at most five, one contact button each.
7. Suspended count tile gone; a per-row pill and the "At risk" chip remain.
8. Growth lead sentence became the sign-up path bars.
9. Stuck lines setup, first, quiet, site: per-detailer kickers, ONE per detailer, no named lines.
10. Search moved to Ctrl K; no contact-email match.
11. Filter chips replaced (Past due, No bookings ever, No website yet gone as filters).
12. List row: customers count and last-booking line dropped.
13. Drawer chart: 12 weeks of bookings instead of six months of finished jobs.
14. Drawer "Last booking" is a history line, not a row.
15. Restore: no question first; new labels. **Question restored 2026-10-24 by 99.16.**
16. Look at their dashboard: no longer off when there is no owner; access token only. **Switch-off restored 2026-10-24 by 99.16.**
17. "Nobody has accepted the owner invite" decided from `owner_email`, not the member list. **Fixed 2026-10-24 by 99.16.**
18. "Who has opened this account" became an 8-line mixed history with no admin name.
19. Money's "a month is ours" figure is worked out in the browser, not the server's `mrr_cents`.
20. Money at risk: pieces in four places, no list, no total.
21. Bills month switch limited to 12 months.
22. Bills failed read: no Try again.
23. Earnings split by billing interval, not by plan tier.
24. System lead sentence became the "N of M working" picture.
25. Email gauge no longer prints who signups go to.
26. Storage gauge no longer prints detailer count and share each.
