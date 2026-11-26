# Test status, 2026-11-25

Every suite in `tests/*.test.mjs` was run alone against `main` at 79cfe3b4 on a Windows checkout, with
`node --env-file=<.env> --import ./scripts/lib/inject-app-env.mjs --test tests/<name>.test.mjs`.
Suites that touch the shared demo tenant ran one at a time; the rest ran six at a time. Cap 120s (the 18 suites
from a first partial pass used 180s). Nothing was left unrun.

Result with LF line endings, before any test fix: 201 pass, 25 fail, 5 timeout, of 231.
Classes: a = product or guard gap, b = stale test, c = environment, d = flaky or slow.

**First finding, fixed in its own PR:** with git's default `core.autocrlf=true` a Windows checkout turns every
file CRLF, and suites that slice source on `\n` fail (e.g. admin-contrast-teardown went red then green).
`.gitattributes` now forces LF. Without it, expect extra reds on Windows that CI never sees.

## Run before merging

1. CI's four: `composition`, `design-contrast`, `landing-pricing`, `route-contract`.
2. `no-credentials-in-tracked-text`.
3. Whatever suite is named for the area you touched (grep `tests/` for the file you edited).
4. After a migration or edge-function change: `definer-grants`, `tenant-isolation`, `customer-data-inventory`, `legal-promises`, `support-sessions-sql`.
5. Never as a batch: the 160 or so suites that use the demo tenant interfere. Re-run a red one alone.

## Table (before-fix status; the After column says what this effort did)

| Suite | Status | Class | After | Reason |
|---|---|---|---|---|
| accept-quote-stale | pass | | | |
| accessible-names | pass | | | |
| acknowledge-checkin-handler | pass | | | |
| action-log-sql | pass | | | |
| action-log | pass | | | |
| address-source | pass | | | |
| adjustment-kinds | pass | | | |
| admin-contrast-teardown | pass | | | |
| admin-events-append-only | pass | | | |
| admin-insight | pass | | | |
| admin-preconditions | pass | | | |
| app-icons | pass | | | |
| attention | pass | | | |
| availability-honesty | FAIL | b stale | fixed (tests-guards) | tenant.ts gained a sixth guarded read; the count was 5 |
| backup-retention | pass | | | |
| billing-decline | pass | | | |
| blocker-claims-are-dated | FAIL | b obsolete | deleted (tests-guards) | policed ROADMAP.md claim dates; ROADMAP is frozen, so it could never pass |
| booking-core | pass | | | |
| booking-errors-announced | pass | | | |
| booking-draft | pass | | | |
| client-list | pass | | | |
| calendar-day-aria | pass | | | |
| confirm-questions | pass | | | |
| booking-refs | pass | | | |
| every-open-item-is-citable | pass | | | |
| expected-failures | pass | | | |
| design-contrast | pass | | | |
| customer-export | pass | | | |
| fixed-furniture-is-hit-tested | pass | | | |
| growth-lines | pass | | | |
| keyboard-boxes-declared | pass | | | |
| ld-pages-carry-the-nav | pass | | | |
| legacy-import | pass | | | |
| money-export | pass | | | |
| mid-period-comparison | pass | | | |
| no-tours | pass | | | |
| office-detailers | pass | | | |
| office-system | pass | | | |
| office-today | pass | | | |
| money-screens-spanish | pass | | | |
| office-usd-negative | pass | | | |
| pay-pill | pass | | | |
| photo-export | pass | | | |
| overcap-refusal | pass | | | |
| furniture-at-end | pass | | | |
| receipt-sabotage-route | pass | | | |
| sale-save-blocked | pass | | | |
| price-wait-not-error | pass | | | |
| retry-confirmation | pass | | | |
| fullpage-frames-lie | FAIL | a debt | issue (later) | 42 screenshot sites in scripts/ save fullPage frames with no safety comment; each needs a look |
| seo-files | pass | | | |
| screenshot-output-under-artifacts | pass | | | |
| setup-progress | pass | | | |
| receipt | pass | | | |
| shared-resources-guard | pass | | | |
| share-image | pass | | | |
| site-claims | pass | | | |
| site-families | pass | | | |
| site-spec | pass | | | |
| session-ping-label | pass | | | |
| skip-census | pass | | | |
| skip-evidence | pass | | | |
| sweep-tap-targets-leaving-door | pass | | | |
| tenant-site-edge | pass | | | |
| tenant-sites | pass | | | |
| weather-warnings | pass | | | |
| booking-engine | timeout | d slow | none | passes alone in 148s; over a 120s cap |
| booking-lines-own-business | pass | | | |
| booking-lines-same-business-sql | pass | | | |
| booking-meta | FAIL | b stale | fixed (tests-guards-2) | tenant-site.mjs is the second legitimate edge function |
| qr-scans | timeout | c env | not fixed | needs a dev server on localhost:5173 and hung when pointed elsewhere; unresolved |
| booking-page-isolation | pass | | | |
| studio-check | pass | | fixed (#59) | was a cold-Vite navigation timeout, not a broken preview |
| bookings-update-grant | pass | | | |
| studio-parity | pass | | fixed (#59) | same: cold-Vite navigation timeout |
| build-start-notice | pass | | | |
| business-day-97-32 | pass | | | |
| calendar-feed-token-sql | pass | | | |
| calendar-feed | pass | | | |
| campaign-press-once | pass | | | |
| campaign-share-sql | pass | | | |
| campaign-skips-unsubscribed | pass | | | |
| campaign | pass | | | |
| cancelled-refund | FAIL | b stale | fixed (tests-guards-2) | hard-coded business id no longer exists; now found by slug phase1-a |
| card-payment-settles | pass | | | |
| checkout-page-lifecycle | pass | | | |
| closed-until-server | pass | | | |
| closed-until | pass | | | |
| composition | pass | | | |
| connect | pass | | | |
| create-booking-phone | pass | | | |
| cron-secret | pass | | | |
| custom-domains | pass | | | |
| customer-data-inventory | FAIL | b stale | fixed (tests-guards) | preview_events.body and revisions.note undeclared; neither holds customer data |
| customer-import-edge | pass | | | |
| customer-import | pass | | | |
| customer-reads-own-business | pass | | | |
| customer-reminder | pass | | | |
| customer-same-business-sql | pass | | | |
| damage-checkin | pass | | | |
| day-rule-refusal | pass | | | |
| dead-mans-switch | pass | | | |
| definer-grants | FAIL | b stale | fixed (tests-guards) | get_published_site_by_host is reachable on purpose; needed its ALLOWED reason |
| deploy-freshness | pass | | | |
| domain-claims-sql | pass | | | |
| domain-proof | pass | | | |
| domain-request | pass | | | |
| duplicate-answer | pass | | | |
| e2e-scripts-take-a-target | pass | | | |
| em-dash | pass | | | |
| email-adjustment-spanish | pass | | | |
| email-brand | pass | | | |
| email-budget | pass | | | |
| email-list | pass | | | |
| email-row-knows-its-booking | pass | | | |
| email-sale-label | pass | | | |
| email-sends | FAIL | c env | needs ALLOW_REAL_MAIL=1 | refuses to spend the shared daily email allowance; sections 2-4 not run on purpose |
| expense-amount-positive | pass | | | |
| figures-carry-their-command | pass | | | |
| forget-customer-address-points-sql | pass | | | |
| forget-customer-sql | pass | | | |
| forget-customer | pass | | | |
| forget-photos | pass | | | |
| gallery-remove-keys | pass | | | |
| gateway-retry | pass | | | |
| geoapify | pass | | | |
| google-business | pass | | | |
| ics-and-notifications | FAIL | b time-bomb | fixed (tests-time-bombs) | assumed New York is on daylight time; the booking date is 25 days from today |
| ics-audience | FAIL | b stale | fixed (tests-guards) | requireMember now takes an options argument |
| is-slot-available-dropped | pass | | | |
| job-mail-warning | pass | | | |
| job-photos | pass | | | |
| landing-pricing | pass | | | |
| legal-promises | FAIL | b stale | fixed (tests-guards) | www.detailingplatform.com was unclassified |
| mail-sink | FAIL | b stale | fixed (tests-guards) | customer-import suites used real-domain addresses (@x.com); now reserved .test |
| maintenance-email-off | pass | | | |
| maintenance-legal | pass | | | |
| maintenance | pass | | | |
| migration-versions-unique | pass | | | |
| mileage | pass | | | |
| money-advanced | pass | | | |
| money-format | pass | | | |
| money-overstatement | pass | | | |
| multi-vehicle | pass | | | |
| name-length | pass | | | |
| no-credentials-in-tracked-text | pass | | | |
| office-money | pass | | | |
| own-alert-warning | pass | | | |
| owner-fanout | pass | | | |
| owner-push-gate | pass | | | |
| owner-reminder-address-flag | pass | | | |
| owner-writes | pass | | | |
| password-reset | FAIL | b stale | fixed (tests-guards) | Auth.jsx line the slice ends on was reworded; product behavior unchanged |
| payment-correction | pass | | | |
| payments | pass | | | |
| photo-call-sites | pass | | | |
| photo-cron-call | pass | | | |
| photo-door-contract | pass | | | |
| photo-door-media-wire | pass | | | |
| photo-door-media | pass | | | |
| photo-door-receipt-wire | pass | | | |
| photo-door-receipts | pass | | | |
| photo-door-server | pass | | | |
| photo-door | pass | | | |
| photo-key-isolation | pass | | | |
| photo-reconcile-sql | pass | | | |
| photo-reconcile | pass | | | |
| photo-release-order | pass | | | |
| photos-deadlines-same-business-sql | pass | | | |
| picked-evidence-survives | pass | | | |
| plan-one-car-split | pass | | | |
| plans | pass | | | |
| platform-admin | FAIL | b stale | issue (later) | reads the old AdminPage layout; the office was rebuilt (OfficePage.jsx). Many assertions to re-point |
| platform-admins-declared | FAIL | a/env | issue (later) | live table holds 3 undeclared platform admins (2 sdw-41c fixtures, shoot-admin). Left as is: nothing deleted from the shared DB |
| platform-billing | pass | | | |
| platform-bills-note | pass | | | |
| platform-costs-sql | pass | | | |
| platform-net | pass | | | |
| price-a-day | pass | | | |
| price-shown-equals-charged | pass | | | |
| pricing-lines-sum | pass | | | |
| privacy-processors | pass | | | |
| promo-checkout | pass | | | |
| promo-code-case | pass | | | |
| promo-one-use-group | pass | | | |
| publish-handoff | FAIL | c env | not fixed | asserts the checkout path; fails in any git worktree |
| push-urls-are-routes | pass | | | |
| queue-rows-still-belong | FAIL | b obsolete | deleted (tests-guards) | re-proved rows of the retired work-queue doc; work is GitHub issues now |
| quote-weather-no-geocode | pass | | | |
| quoted-lines-true | pass | | | |
| rate-limit-loops | FAIL | d flaky | not fixed | refuses to run while an earlier suite left a cancel-booking rate bucket; passes when run alone in a fresh hour |
| read-all-97-29 | pass | | | |
| receipt-fields | pass | | | |
| release-gate | timeout | c env | not fixed | timed out at 120s running the real pre-push hook and inventory over the network |
| reminder-claim | pass | | | |
| reminder-ignores-unsubscribe-sql | pass | | | |
| reminder-reset-markers-sql | pass | | | |
| request-mode | pass | | | |
| requests-tick-holds | pass | | | |
| reschedule-cancel-race-97-30 | pass | | | |
| reschedule-old-time | pass | | | |
| restore-date | pass | | | |
| retry-safety | pass | | | |
| route-contract | pass | | | |
| send-invoice-key-sql | pass | | | |
| send-invoice-key | pass | | | |
| session-ping | pass | | | |
| site-preview | pass | | | |
| spam-filter | pass | | | |
| spanish | FAIL | a/b | issue (later) | site/Detailer.jsx NAMES and site/spec.js SERVICE_WORDS need a translate-or-exclude decision |
| split-day-surcharge | pass | | | |
| staff-roles | pass | | | |
| staff-writes-sql | pass | | | |
| studio-live-look | pass | | fixed (#59) | cold-Vite navigation timeout; preview was never broken |
| studio-picker | pass | | fixed (#59) | cold-Vite navigation timeout; preview was never broken |
| support-sessions-edge | pass | | | |
| support-sessions-sql | FAIL | a | issue (later) | preview_links, preview_events, sites, revisions, releases enable RLS without refuse_support_writes. Writes are revoked from authenticated, so likely not exploitable, but the guard is right to ask |
| svix-signature | pass | | | |
| sweep-methods-are-pinned | pass | | | |
| tenant-isolation | FAIL | b stale | fixed (tests-guards) | database now refuses cross-tenant DELETE on bookings (42501) instead of matching 0 rows; still proves the row survives |
| tenant-string-lengths-sql | pass | | | |
| timezone-and-slots | FAIL | b time-bomb | fixed (tests-time-bombs) | assumed a 3 hour NY-Phoenix gap; winter is 2. Passes alone; a recent sweep can trip the create-booking rate limit, wait for the next hour |
| translations | FAIL | b time-bomb | fixed (tests-guards-2) | 5c ignored a month rollover of the usage counter |
| two-logins | pass | | | |
| tz-clock-change | pass | | | |
| uncancel-tells-customer | pass | | | |
| update-booking-keeps-note | pass | | | |
| vcard | pass | | | |
| weather-cache | pass | | | |
| weather | pass | | | |
| zone-address-mismatch | pass | | | |
