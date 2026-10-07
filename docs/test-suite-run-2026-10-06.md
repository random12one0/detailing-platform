# The credential-free test suite, run 2026-10-06

**Taken at `0f10bc1` (the commit the run started on, before the five test fixes it led to).** Command, per file: `PGLITE_DIR=<dir> PGLITE_REQUIRED=1 node --test tests/<file>.test.mjs` and the `pass`, `fail` and `skipped` lines it prints. **88 files run, 31 skipped by reading, 119 test files in total** (`ls tests/*.test.mjs | wc -l`).

**What was run and what was not.** Every file was classified by a scan for the tokens that mean credentials, the network or a shared write (`_env.mjs`, `.env`, `SUPABASE_*`, `rate_hits`, `fetch(`, `chromium`, `edgeLocal`, process spawns), and the ambiguous ones were read before running. A test that loads `.env` is credentialed and needs the manager's say-so; none of those was run (second table).

## Run (per file, after the fixes below)

| file | exit | pass | fail | skipped |
|---|---|---|---|---|
| action-log-sql | 0 | 9 | 0 | 0 |
| action-log | 0 | 5 | 0 | 0 |
| address-source | 0 | 6 | 0 | 0 |
| adjustment-kinds | 0 | 11 | 0 | 0 |
| admin-contrast-teardown | 0 | 8 | 0 | 0 |
| admin-insight | 0 | 1 | 0 | 0 |
| attention | 0 | 1 | 0 | 0 |
| billing-decline | 0 | 4 | 0 | 0 |
| blocker-claims-are-dated | 0 | 4 | 0 | 0 |
| booking-core | 0 | 1 | 0 | 0 |
| bookings-update-grant | 0 | 11 | 0 | 0 |
| campaign | 0 | 1 | 0 | 0 |
| client-list | 0 | 1 | 0 | 0 |
| composition | 0 | 1 | 0 | 0 |
| connect | 0 | 1 | 0 | 0 |
| custom-domains | 0 | 1 | 0 | 0 |
| customer-export | 0 | 1 | 0 | 0 |
| deploy-freshness | 0 | 1 | 0 | 0 |
| design-contrast | 0 | 1 | 0 | 0 |
| em-dash | 0 | 1 | 0 | 0 |
| email-adjustment-spanish | 0 | 3 | 0 | 0 |
| email-brand | 0 | 1 | 0 | 0 |
| email-list | 0 | 9 | 0 | 0 |
| email-row-knows-its-booking | 0 | 9 | 0 | 0 |
| email-sale-label | 0 | 2 | 0 | 0 |
| every-open-item-is-citable | 0 | 6 | 0 | 0 |
| expected-failures | 0 | 8 | 0 | 0 |
| figures-carry-their-command | 0 | 9 | 0 | 0 |
| forget-photos | 0 | 11 | 0 | 0 |
| fullpage-frames-lie | 0 | 1 | 0 | 0 |
| furniture-at-end | 0 | 11 | 0 | 0 |
| gateway-retry | 0 | 1 | 0 | 0 |
| growth-lines | 0 | 7 | 0 | 0 |
| job-photos | 0 | 1 | 0 | 0 |
| landing-pricing | 0 | 1 | 0 | 0 |
| ld-pages-carry-the-nav | 0 | 5 | 0 | 0 |
| legacy-import | 0 | 1 | 0 | 0 |
| mail-sink | 1 | 0 | 1 | 0 |
| maintenance-email-off | 0 | 5 | 0 | 0 |
| maintenance-legal | 0 | 5 | 0 | 0 |
| maintenance | 0 | 1 | 0 | 0 |
| mid-period-comparison | 0 | 1 | 0 | 0 |
| money-advanced | 0 | 1 | 0 | 0 |
| money-export | 0 | 1 | 0 | 0 |
| money-format | 0 | 1 | 0 | 0 |
| money-overstatement | 0 | 1 | 0 | 0 |
| no-credentials-in-tracked-text | 0 | 1 | 0 | 0 |
| owner-reminder-address-flag | 0 | 3 | 0 | 0 |
| password-reset | 0 | 1 | 0 | 0 |
| payments | 0 | 1 | 0 | 0 |
| photo-call-sites | 0 | 4 | 0 | 0 |
| photo-door-contract | 0 | 4 | 0 | 0 |
| photo-door-server | 0 | 20 | 0 | 0 |
| photo-door | 0 | 6 | 0 | 0 |
| photo-export | 0 | 1 | 0 | 0 |
| photo-key-isolation | 0 | 1 | 0 | 0 |
| photo-reconcile-sql | 0 | 6 | 0 | 0 |
| photo-reconcile | 0 | 25 | 0 | 0 |
| plans | 0 | 1 | 0 | 0 |
| platform-admin | 0 | 1 | 0 | 0 |
| platform-billing | 0 | 1 | 0 | 0 |
| platform-net | 0 | 16 | 0 | 0 |
| price-a-day | 0 | 8 | 0 | 0 |
| pricing-lines-sum | 0 | 14 | 0 | 0 |
| push-urls-are-routes | 0 | 4 | 0 | 0 |
| quoted-lines-true | 0 | 14 | 0 | 0 |
| receipt | 0 | 27 | 0 | 0 |
| reschedule-old-time | 0 | 1 | 0 | 0 |
| route-contract | 0 | 1 | 0 | 0 |
| send-invoice-key-sql | 0 | 6 | 0 | 0 |
| send-invoice-key | 0 | 6 | 0 | 0 |
| session-ping-label | 0 | 6 | 0 | 0 |
| session-ping | 0 | 1 | 0 | 0 |
| setup-progress | 0 | 1 | 0 | 0 |
| skip-census | 0 | 5 | 0 | 0 |
| skip-evidence | 0 | 7 | 0 | 0 |
| spam-filter | 0 | 1 | 0 | 0 |
| svix-signature | 0 | 1 | 0 | 0 |
| sweep-methods-are-pinned | 0 | 8 | 0 | 0 |
| sweep-tap-targets-leaving-door | 0 | 5 | 0 | 0 |
| tenant-sites | 0 | 1 | 0 | 0 |
| tours | 0 | 1 | 0 | 0 |
| two-logins | 0 | 1 | 0 | 0 |
| vcard | 0 | 1 | 0 | 0 |
| weather-cache | 0 | 1 | 0 | 0 |
| weather-warnings | 0 | 1 | 0 | 0 |
| weather | 0 | 1 | 0 | 0 |
| zone-address-mismatch | 0 | 7 | 0 | 0 |

## Four were red on the first run, and what became of each

| file | first run (pass/fail) | cause | now |
|---|---|---|---|
| `price-a-day` | 6/2 | the fixture dates were literals that fell into the past, so the 24-hour short-notice rule fired and added $20 to every quote that carried an hour | fixed: dates computed a week ahead of the clock (the old literals still go red in a copy) |
| `tenant-sites` | 0/1 | the placeholder check matched the word inside an HTML comment in `w-delgado.html` | fixed: comments stripped first, a real `class="placeholder"` still fails (shown on a planted page) |
| `sweep-methods-are-pinned` | 6/2 | declared figures stale: 68 to 47 open items (equals `grep -c '^- [ ]' ROADMAP.md`), 37 to 32 criteria, 280 to 254 fragments | fixed: re-taken in the same edit with the reason |
| `mail-sink` | 0/1 | 12 undeclared charged addresses: 6 in my `admin-contrast-teardown`, 4 in `email-list.test.mjs`, 2 in `scripts/email-list-admin.mjs` | **still red**: ten declared; the last two are in `scripts/email-list-admin.mjs:117` and `:123`, outside any grant |

## Skipped, and why

| file | reason |
|---|---|
| availability-honesty | loads .env, calls the live booking engine |
| booking-engine | loads .env, live, and deletes `rate_hits` rows (shared table) |
| booking-page-isolation | loads .env, live reads through the Management API |
| cancelled-refund | loads .env, writes fixture rows live |
| closed-until | loads .env, writes fixture rows live |
| customer-reminder | loads .env, live sends through the relay |
| dead-mans-switch | loads .env, writes the heartbeat table live |
| definer-grants | loads .env, queries the live catalog through the Management API |
| email-budget | loads .env, spends the Resend sandbox allowance |
| email-sends | loads .env; started once by mistake, refused its real-mail sections and wrote nothing |
| forget-customer | loads .env, deletes live fixture rows |
| geoapify | loads .env, can spend the shared address budget |
| ics-and-notifications | loads .env, live |
| ics-audience | loads .env, live, writes a fixture booking |
| mileage | loads .env, writes live rows |
| multi-vehicle | reads .env, writes `rate_hits` and fixture bookings |
| owner-writes | loads .env, live writes as an owner |
| picked-evidence-survives | loads .env, writes a fixture tenant's rows |
| platform-admins-declared | loads .env, reads the live `platform_admins` table with the service key |
| promo-checkout | loads .env, writes live rows |
| qr-scans | visits the live website and the dev server on 5173 |
| queue-rows-still-belong | needs the service key for one row (not run again without your say-so) |
| rate-limit-loops | loads .env, writes `rate_hits` (shared table) |
| receipt-fields | loads .env, reads live endpoints |
| request-mode | loads .env, writes live rows and deletes `rate_hits` |
| retry-safety | loads .env, writes live fixture rows |
| spanish | loads .env (credentialed half) |
| staff-roles | loads .env, live |
| tenant-isolation | loads .env, live |
| timezone-and-slots | loads .env, live |
| translations | loads .env, live |

**No failure was in `app/src`.** The one for DP Cowork from the neighbouring work is in the 4.1 review (ROADMAP 4.1, 2026-10-06).
