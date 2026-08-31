# Decisions Log

Judgment calls made while working autonomously, per the Phase 2 brief —
each picked as the option easiest to change later.

## Phase 2

- **`docs/dashboard-spec.md` does not exist in the repo.** The brief said to
  build to it, but it was never committed. The dashboard was built from the
  brief's own requirements plus the old admin's screen structure (which
  already matches the five specified tabs). If the spec turns up, diff the
  built dashboard against it.

- **`cancel-booking` / `reschedule-booking` were rewritten from scratch.**
  The old project had them deployed, but their code was never committed to
  git (and the old Supabase project is off-limits), so there was nothing to
  assess. The new ones use the same access model as the public receipt page
  (the unguessable booking UUID) plus the per-business
  `cancellation_window_hours`; inside the window the customer is told to
  call.

- **Vehicle-size pricing is now per service, and it sums.** The old system
  charged one flat surcharge per booking (+$15 medium / +$30 large),
  implemented three separate times. The new `services.vehicle_size_adjustments`
  puts the adjustment on each service (a big vehicle adds time and cost to
  each job performed on it), and the pricing engine is the single
  implementation. A detailer who wants the old behavior sets the adjustment
  on one service and zero on the rest.

- **Admin overlap edits are now hard-rejected, not warned.** The old
  update-booking deliberately allowed the owner to double-book with a
  warning. Phase 1's database exclusion constraint (per the Phase 1 brief:
  "the database must make this impossible regardless of what the application
  does") makes that physically impossible, so a conflicting admin move
  returns a clear error instead. If deliberate double-booking matters later,
  it needs a schema-level change (e.g. an allow_overlap flag excluded from
  the constraint).

- **Minimum advance notice now applies to every day, not just today.** The
  old 2-hour rule only ran for same-day bookings (a 2-hour setting can't
  reach past midnight anyway). With per-business values that can be days
  long, the rule is now "no slot closer than X minutes from now," which is
  what a big value obviously intends.

- **No hours = closed.** The old available-slots fell back to Andrew's
  hardcoded weekly schedule when the business_hours table had no row. A
  platform can't guess another business's hours, so a weekday without a row
  is closed until the owner sets hours.

- **Owner reminder emails reuse the owner-notification layout** with an
  "Upcoming job" subject, rather than porting the old separate reminder
  template — same information, one less template to maintain.

- **Booking line items write directly to the database** (RLS-scoped), while
  the final amount/payment status go through update-booking. Line items
  don't affect scheduling or conflict rules — they're settings-style child
  rows — so they follow the brief's "don't over-engineer settings writes"
  rule.

- **The reminder sweep needs a scheduler.** The old pg_cron job was created
  in the Supabase dashboard and never committed. The new send-owner-reminders
  function is idempotent (marker-guarded) and deployed verify_jwt:false like
  the old one; schedule it every 15 minutes (Supabase Dashboard → Cron, or
  pg_cron + pg_net) when going live. Not wired up in SQL because the
  function URL/key don't belong in a migration.

- **Email/push provider keys are not configured yet.** send-email logs and
  skips when RESEND_API_KEY is unset; owner push skips without VAPID keys.
  Set `RESEND_API_KEY`, `OWNER_VAPID_PUBLIC_KEY`, `OWNER_VAPID_PRIVATE_KEY`,
  `OWNER_VAPID_SUBJECT` as function secrets when going live. All mail sends
  from `bookings@detailplatform.com` (one config constant) with the
  tenant's own Reply-To.

- **Multi-business users are supported by the schema but not the dashboard
  UI.** business_users allows one login in many businesses; the dashboard
  currently uses the first membership. A business switcher is a later,
  additive feature.

## Phase 2 follow-ups (visual direction, theming, staff accounts)

- **`docs/dashboard-spec.md` is now in the repo** (supplied directly and
  committed). The gap report against it is in
  `docs/dashboard-spec-gap-report.md`.

- **No `.ics` / add-to-calendar file exists in the new build.** The old app
  had one (`reference/frontend/src/lib/ics.js`); it was not ported, and the
  spec asks for an "add to calendar" button on the job detail page. It is
  listed as a gap, not a timezone defect — there is no wrong timezone in it
  because there is no file. When it is built it must stamp times with the
  business's IANA zone (`DTSTART;TZID=`), not a UTC offset.

- **`businesses.timezone` defaults to `America/Los_Angeles`.** It is the one
  remaining hardcoded zone in non-test code, and only as a column default
  for a business created without one. Signup should always set it
  explicitly; changing the default to something neutral is a one-line
  migration if preferred.

- **Per-employee job assignment and per-employee availability are
  deliberately deferred.** The availability engine answers "is the BUSINESS
  free," not "is a specific person free," and changing that is a significant
  piece of work not needed for launch. The schema does not foreclose it: a
  later `bookings.assigned_user_id` (nullable, FK to business_users) plus a
  per-user hours/blockout table can be added additively, and
  `_shared/slotValidation.ts` takes its inputs from settings rather than
  hardcoding a single calendar, so a per-person branch slots in there.

- **Staff can read `services` and `add_ons`.** They need the catalog to
  create a booking. They cannot WRITE it (catalog edits sit behind the
  owner-only Services screen and, at the database, the tenant policy plus
  the owner-only More section). If read access to pricing should also be
  owner-only, that is a one-line policy change — but staff then cannot book
  for a walk-in.

- **`business_settings` is owner-only to READ, not just write.** The brief
  said staff cannot see business settings; the strict reading (zero rows,
  not just a hidden screen) is what is enforced. Consequence: a staff
  session cannot see the booking rules, so any future staff-facing screen
  needing e.g. the slot interval must get it from an edge function rather
  than a direct query.

- **Theme choice is stored per user in the browser (localStorage), not in
  the database.** It is a personal display preference, and keeping it
  client-side avoids a write on every toggle. It therefore does not follow a
  user to a different device. Moving it to a `business_users.theme_mode`
  column later is additive.

- **Brand color is stored raw; correction happens at render time.** What is
  saved in `business_branding.primary_color` is exactly what the owner
  picked (so the booking page and the dashboard agree on one value), and
  `app/src/lib/theme.js` adjusts its lightness per theme only when it fails
  contrast. Nothing is silently rewritten in the database.

- **The last-owner trigger needed a cascade exception.** As first written it
  also blocked deleting a whole business (the cascade into `business_users`
  tripped the guard). Fixed in `20260827003100_last_owner_cascade_fix.sql`:
  the check is skipped when the parent business row is already gone.

## Test deployment and later fixes

- **A private test deployment exists on Netlify**
  (`detailplatform-admin-test.netlify.app`), built from the working branch,
  with a seeded demo business. It is for device testing only — not for real
  customers, and the demo credentials are shared in chat, so treat anything
  in that business as public.

- **The Netlify site is deployed from an uploaded build of `app/`, not wired
  to the GitHub repo.** Re-deploying is a manual step (the deploy command in
  `docs/phase2-engine-and-dashboard.md`). Connecting the repo for automatic
  branch deploys is worth doing before this is used regularly.

- **`.env.production` must not be committed in `app/`.** Vite loads it after
  `.env.local`, so its presence silently overrides local development config.
  Netlify supplies the build env from its own dashboard variables instead.

- **The old `.ics` emitted floating times** (no `TZID`), which a calendar
  client interprets in the VIEWER's zone — a 10am Los Angeles job showed as
  10am wherever the customer was. The port fixes this rather than
  reproducing it.

- **`expenses.payment_method` is written as "unspecified"** by the three-tap
  flow. The column is from the old schema and the spec's flow doesn't ask
  for it; drop the column or start collecting it, but it shouldn't stay
  half-used forever.

- **Signup has an edge function but no UI.** `create-business` enforces the
  timezone requirement; there is no sign-up screen yet, so businesses are
  still created by script for now. The screen belongs with the public site
  work.

## Design system (August 2026)

- **docs/design-system.md is law for UI work.** "Raking Light": matte dark
  ground where one thing per screen is lit (accent bar + bloom + lifted
  surface). Three voices — Anybody (wide titles / narrow tracked labels),
  Public Sans prose, DM Mono for every figure. Dark is the home theme;
  light is the disciplined daytime mode with a tinted bar and no bloom.
- **Composition varies with content, the theme doesn't.** Cards are for
  objects, not sections; enumerations are ruled lists, money is a receipt,
  sequences are rails, headline stats are bare mono figures. Two adjacent
  blocks with the same treatment should be the same kind of thing.
- **Accent correction is two-tier.** Fills correct to 3:1 (--accent);
  accent-as-text corrects to 4.5:1 (--accent-text). Small text colored with
  --accent is a bug. tests/design-contrast.test.mjs measures the promises.
- **Routes:** marketing at `/`, dashboard at `/app/*` (legacy `/*`
  catch-all kept for bookmarks), booking `/book/:slug`, receipts
  `/booking/:id`. tests/route-contract.test.mjs ties these to the email
  builders in config.ts, whose fallback is now detailingplatform.com.
- **Landing prices live in `app/src/landing/pricing.js`,** not in the JSX:
  website + booking $900 setup / $60 month (or $600/year), booking page
  only $35/month, founding $499 setup / $40 month.

- **The founding offer is COUNTED, not declared.** `platform_settings`
  holds the cap and `businesses.plan_tier = 'founding'` marks an account;
  `public.founding_offer()` (SECURITY DEFINER, granted to anon) returns
  `{total, left}` and nothing else — a visitor can read the number without
  reading a row. Mark a founding customer with
  `update businesses set plan_tier = 'founding' where slug = '<slug>';`
  and change the cap with `update platform_settings set founding_total = n;`.
  A churned account releases its spot. The page **fails closed**: if the
  count cannot be read, it shows standard pricing and makes no scarcity
  claim at all.

- **The struck $900 is honest.** It is the real, current list price,
  rendered only while a real founding discount is live and only from
  config — never a literal typed in to make another number look smaller.
  `tests/landing-pricing.test.mjs` enforces exactly that, plus: no
  hardcoded prices, no founding copy outside the guard, no urgency
  theater, and no free-trial claim.

- **Landing motion** lives in `app/src/landing/motion.jsx`: the opening
  sequence waits on the display font (no typeface swap mid-headline), a
  specular sweep crosses the headline, Anybody's width axis opens as
  headings arrive, figures count up, the demo card holds the cursor, and
  the rail draws. All transform/opacity; `prefers-reduced-motion` lands
  every element on its final state immediately; a failsafe reveals content
  if an observer never fires. The ambient glow is capped at 0.35 opacity
  because it tints the ground behind text and therefore enters the
  contrast maths.

- **The "30 free days" copy is gone.** It was written beside the
  placeholder price and no such trial was ever offered; with setup fees it
  would have been a false claim. Billing is still not implemented — nothing
  charges anyone yet.

## Signup (August 2026)

- **Signup is two screens, not a wizard:** email + password, then business
  name, booking link and timezone. `create-business` seeds settings,
  branding and a Mon–Fri 9–5 week, so a new booking page has open days
  from the moment it exists. Services are left empty — that is the first
  thing the owner does.

- **Email confirmation is OFF** (`mailer_autoconfirm = true`). "Straight
  into the dashboard" is incompatible with a confirmation round trip, and
  the project has no custom SMTP — Supabase's built-in mailer is rate
  limited to a handful an hour. The cost is that email addresses are
  unverified; revisit when a real sending domain exists.

- **Founding pricing is granted by the database, never by the client.**
  `?offer=founding` is a REQUEST; `claim_founding_spot()` takes a lock on
  the settings row, counts what is taken and only then marks the business,
  so the query string cannot mint founding accounts and two simultaneous
  signups cannot both take the last spot.

- **A user with no business lands in business creation,** not on the old
  "This login isn't linked to a business yet" dead end. That is also where
  a Google sign-in for a new account arrives.

## Removed on purpose (per the brief — don't be surprised they're gone)

- **Monthly plans** — permanent discount with no billing behind it. Table
  dropped, pricing engine no longer knows about them.
- **Referral / loyalty system** — zero live rows, manual redemption.
  Columns dropped, email blurb removed.
- **Google Calendar sync** — needs per-tenant OAuth; separate project.
- **Owner "test booking" preview mode** in create-booking — the old
  owner_access_token no-persist path. The dashboard's real create flow (with
  admin notes) replaces it; a preview mode can return later if missed.
- **The old dead functions** (`tz-debug-temp`, `create-booking-backup`,
  `admin-selftest`, `hyper-task`, fitness-app functions) — never ported;
  they only ever existed deployed, not in git.
- **vCard attachment on owner emails** — small nicety from the old owner
  notification, dropped in the port; easy to re-add to the templates module
  if missed.

## Owner decisions (2026-08-28)

- **Everything "Removed on purpose" above comes back.** The owner wants
  full parity with the old business: monthly plans, referral/loyalty,
  Google Calendar sync, the owner test-booking preview, and the vCard
  attachment are to be re-added — but redesigned as per-tenant,
  configurable platform features ("in a way that will be best for
  detailers in the future"), not ports of the single-business versions.
  Before building, audit `reference/` for anything else dropped silently.
- **Andrew's Auto Detail becomes tenant #1.** Migrate a copy of its data
  from the old project (`adtlnvihwrcqcasqcjwd` — the owner has authorized
  reads), run both sites in parallel, and cut the domain over only when
  the owner trusts the platform. Nothing on the old site is decommissioned
  until then. This doubles as the feature-parity test.
- **Tenant URL tiers.** Booking-only customers live at
  `detailingplatform.com/book/:slug`. Website-package customers get their
  own custom domain (Netlify domain alias + a `custom_domain` →
  business lookup, to be built before the first website customer).
- **Tenants need full websites, not just booking pages** — home, services,
  gallery, about, reviews, FAQ, contact — built entirely from tenant
  configuration. This is the largest remaining build and a prerequisite
  for the demo business.
- **The visual design restarts from scratch (2026-08-28).** "Raking
  Light" was picked from a handful of renders before the owner's design
  research existed; the owner has un-settled it. The backend is kept;
  every surface gets a new visual world chosen in a proper direction
  round (references → distinct rendered directions → owner pick →
  documented system → rewritten design tests). Until the new system is
  written, docs/design-system.md is evidence of the old look, not a
  contract — see DESIGN.md and docs/roadmap.md Phase 1.

## Roadmap 0.1 cleanup (2026-08-28)

- **The old project was never opened to anonymous writes — proven, not
  assumed.** `temp_enable_inserts.sql` sat in the repo root offering to
  create `"Allow anonymous inserts for testing"` on `bookings`
  (`TO anon WITH CHECK (true)`), and nobody knew whether it had ever been
  run. Three read-only queries against `adtlnvihwrcqcasqcjwd` settle it:
  no `INSERT` policy exists for `anon` on any table in `public`; no policy
  by that name exists; `bookings` carries exactly one policy,
  `bookings_admin_all` (`{authenticated}`, `ALL`, guarded by
  `is_active_admin()`); RLS is enabled on all 22 public tables. The broad
  `anon` table grants visible in `information_schema` are the Supabase
  default and grant nothing without a permitting policy. **No fix was
  needed on the live project, and the question is closed.**
- **`.gitconfig` was deleted although roadmap 0.1 does not name it.** Same
  Emergent provenance as `.emergent/`; it set the commit author to
  `emergent-agent-e1 <github@emergent.sh>`. Removing it changes no
  behaviour — git reads `.git/config`, and the effective author was
  already the owner's.
- **README.md was rewritten rather than left or deleted (owner's call).**
  It was 24 KB describing the old single-business site, carried its own
  "this README is stale" banner, and was the only file outside the
  deletion set linking to `ADMIN_SETUP.md`. Now 41 lines: what the repo
  is, and a pointer table into the docs that are actually maintained.
- **`PROJECT-STATE.md` and `PRODUCT.md` are now tracked (owner's call).**
  Both existed only on the owner's machine, yet `CLAUDE.md` orders every
  new session to read `PROJECT-STATE.md` first — a fresh clone would not
  have had it. Neither contains a credential.
- **OPEN — owner only: rotate the old project's anon key.** Deleting
  `create_sample_bookings.js` removed the committed JWT from HEAD but not
  from git history, where it stays recoverable (ref
  `adtlnvihwrcqcasqcjwd`, expires 2036). Rotating is a write against a
  live money-taking system, so it is the owner's action. Severity is low:
  an anon key is designed to be public-facing, and the check above proves
  it grants no write access to any table.

## Phase 0 — 0.2 email

- **Email's root cause found: `PLATFORM_FROM_ADDRESS` is Resend's shared
  sandbox sender.** The secret is set to `onboarding@resend.dev`. Resend
  restricts that address — it is shared by every account on the platform —
  to the account owner's *own* address, whatever domains the account has
  verified. Every send to any other recipient is rejected at validation
  with HTTP 403 `validation_error`, verbatim:

  > "You can only send testing emails to your own email address
  > (andrewswashing@gmail.com). To send emails to other recipients, please
  > verify a domain at resend.com/domains, and change the `from` address to
  > an email using this domain."

  Evidence: Supabase `function_logs` for project `kguqylyzgyzfktkfnhjb`,
  2026-08-28 07:01Z, ~20 occurrences across the booking test runs, each
  paired with the relay's own `send-email relay failed:` line. The
  rejection happens *before* Resend creates an email record, which is
  exactly why the Resend dashboard showed nothing at all — not a bounce,
  not a failed send. Nobody had read the function logs; the error had been
  printing all along.

- **No code is at fault, and nothing was edited.** The logs prove the whole
  chain is healthy up to Resend's validation: the relay's service-role auth
  passes, the business lookup resolves, the payload builds, and the API key
  authenticates (an invalid key returns `401`/`API key is invalid`, which
  is not what we see). The `email_customer_confirmation` and
  `email_owner_new_booking` gates are `true` for all 14 businesses, so the
  send is attempted, not skipped. One value is wrong; the code around it is
  correct.

- **The blocker is that `detailingplatform.com` is not a verified sender.**
  The Resend account (`andrewswashing@gmail.com`) has exactly one verified
  domain: `andrewsdetail.com`, verified 2026-03-02, sending enabled — the
  live business's domain. So `PLATFORM_FROM_ADDRESS` cannot simply be
  flipped to `bookings@detailingplatform.com` today; that would fail with a
  domain-not-verified error instead. Verifying the platform domain is DNS
  work on a production domain and is the owner's call. **OPEN — owner.**

- **Noted, not acted on: the platform shares the live business's Resend
  account.** The same account sends Andrew's Auto Detail's real customer
  mail. Platform test sends, seed runs and future tenants' mail would
  accumulate against that account's reputation and suppression list. Worth
  a separate account for the platform before real tenants exist; flagged,
  not decided.

- **Both domains use Netlify DNS** (`nsone.net` nameservers), so adding
  Resend's verification records is done in the Netlify DNS panel, not at a
  registrar. Read-only `nslookup` check, 2026-08-28.

- **Fixed and proven 2026-08-29.** Owner verified the subdomain
  `email.detailingplatform.com` in Resend (DKIM + two SPF CNAMEs, all
  verified); `PLATFORM_FROM_ADDRESS` now reads
  `bookings@email.detailingplatform.com`, and the default in
  `_shared/config.ts` was corrected to match — it previously named the
  **bare** domain `detailingplatform.com`, which is not a verified sender,
  so deleting the secret would have re-broken mail. Seven functions
  redeployed. Proof: a booking created through `create-booking` exactly as
  the public widget does it produced a customer confirmation to the owner's
  inbox, status **delivered** in Resend's log, plus the owner-notification
  to the demo tenant's contact address. The proof booking was then deleted
  from the demo tenant.

- **The existing Resend API key was kept; no new key was needed.** The 403
  had always been about the sender, never the key, so the key already had
  the access required. An owner-pasted key was declined rather than written
  into infrastructure, and flagged for revocation because pasting put it in
  a chat transcript.

- **`scripts/deploy-functions.mjs` did not run on Windows.** It built its
  root path with `new URL(...).pathname`, which yields `/D:/...`; `readdir`
  then resolved that against the drive as `D:\D:\...` and the script died
  before deploying anything. Now `fileURLToPath`. This is a
  moved-to-a-local-machine bug — the script had only ever run in the Linux
  sandbox.

- **OPEN — the local `.env` service-role key is stale.** It is not the value
  the edge functions hold: calling `send-email` directly from a script
  returns the relay's own 401. It still authenticates to PostgREST, so the
  mismatch hides until something calls a function that gates on the key.
  Function-to-function calls are unaffected (they read their own env), which
  is why production works. Refresh it from the Supabase dashboard before
  trusting the 7 credentialed test suites.

## Phase 0 — 0.4 deployment sanity (partial) + a security finding

- **The GitHub repo `random12one0/detailing-platform` is PUBLIC**
  (`"visibility": "public"`, unauthenticated API check 2026-08-29). Nothing
  in the docs said so, and the 0.1 write-up's severity reasoning assumed
  "recoverable from git history" meant *locally* recoverable. It does not:
  it means readable by anyone.

- **`backend/.env` was committed on 2026-02-01 and is still in the public
  history** (4 commits, reachable from `main`; deleted from HEAD only).
  It carried, in plaintext:
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (both for the LIVE
  business project `adtlnvihwrcqcasqcjwd`), `RESEND_API_KEY`,
  `GOOGLE_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `MONGO_URL`, `OWNER_EMAIL`.
  Emergent-era file; predates the platform conversion.

- **The serious one is the service-role key.** Decoded header/payload:
  `ref=adtlnvihwrcqcasqcjwd`, `role=service_role`, `exp=2036-02-01`. A
  service-role key bypasses RLS entirely — it is full read/write on the
  database that takes the live business's real customer bookings and money.
  Every prior note in this repo discussed only the **anon** key, which is
  publishable by design and was proven harmless by the 0.1 policy check.
  That reasoning does not transfer to this key. **Not verified as still
  live** — attempting to exercise a leaked credential was correctly blocked,
  and was not worked around. Treat as compromised until rotated.

- **The leaked Resend key appears already rotated.** Its commit is
  2026-02-01 07:25Z; the oldest API key now in the Resend account
  (`CarWash`) was created the same day at 21:06Z, ~14 hours *later*, and the
  leaked value matches none of the three current keys. Most likely replaced
  the same day. Low priority, but confirm rather than assume.

- **`GOOGLE_CLIENT_SECRET` should be treated as compromised** — cannot be
  validated read-only, and OAuth client secrets do not expire on their own.

- **OPEN — owner, and it needs care, not a click.** Rotating the live
  project's JWT secret invalidates BOTH the anon and service-role keys at
  once, which breaks the live booking site until the new anon key is rebuilt
  into its frontend and redeployed. That is a coordinated change on a
  money-taking system, so it is the owner's call and their sequencing.

- **Deployment (roadmap 0.4, partially answered).** `detailingplatform.com`
  is served by the Netlify project **`detailplatform-admin-test`** (site id
  `12ee8817-…`). Its current production deploy is git-linked: `branch=main`,
  `context=production`, `manual_deploy=false`, with a real
  `commit_ref`/`commit_url` into the GitHub repo. So HANDOFF was right and
  the older DECISIONS note about manual uploads is stale: **`main` builds to
  production.** Caveat: that deploy's `deploy_source` is `"api"`, so it was
  triggered through the API rather than observed firing from a bare `git
  push` — the repo linkage is proven, the push trigger is not yet.
- **A stray deploy from this working directory would hit production.**
  `.netlify/state.json` here pins `siteId` to the production site, so
  `netlify deploy --prod` run in this folder publishes to
  detailingplatform.com regardless of branch. Worth knowing before anyone
  runs a deploy command casually.

- **The local `.env` service-role key is deliberate, not a leak (owner,
  2026-08-29).** The owner put it there so sessions can drive Supabase
  directly — migrations, edge functions, queries — instead of handing them
  back dashboard steps. It is for the PLATFORM project
  `kguqylyzgyzfktkfnhjb`, the file is gitignored, and it has never been
  committed (verified). Do not flag it. It is unrelated to the exposed key.

- **The two service-role keys are not the same key.** Decoded side by side
  2026-08-29: local `.env` → `ref=kguqylyzgyzfktkfnhjb` (the platform beta);
  public git history `backend/.env` → `ref=adtlnvihwrcqcasqcjwd` (the live
  business, andrewsdetail.com). Different projects, different keys. The
  owner's intent covers the first; the second is an Emergent-era accident
  and the exposure stands.

- **Netlify auto-publishes on push (owner-confirmed, 2026-08-29).** The
  owner states Netlify is linked to git and every publish to git updates the
  site — which matches the git-linked production deploy observed on the
  Netlify side. Roadmap 0.4's central question is answered: **pushing to
  `main` deploys to production.** The working directory's
  `.netlify/state.json` pinning the production site remains a separate
  hazard for anyone running a manual deploy command here.

## Abuse check on the live project (2026-08-29, read-only)

Question asked by the owner: **was the exposed service-role key ever
actually used?** Answered without ever presenting the leaked key to
anything — every check below runs through the owner's own legitimate
Supabase access.

- **The key is still valid today, and that is now proven rather than
  assumed.** The anon key sitting in the public git history is
  byte-for-byte identical to the project's *current* anon key
  (`get_publishable_keys`, 2026-08-29). Both tokens carry
  `iat=1769922897` — 2026-02-01 05:14:57Z, the moment the project was
  created — and both are signed by the same JWT secret. Rotating that
  secret reissues both keys with a new `iat`; it has not happened. So the
  leaked `service_role` token (`exp=2085498897` → 2036-02-01) is live.

- **No evidence it has been used by anyone but the owner's own apps.**
  Findings, each with the source that supports it:
  - `pg_stat_statements` covers the **entire** exposure window and has not
    lost a single entry: `stats_reset = 2026-02-01 05:15:31Z` (project
    birth), `pg_postmaster_start_time = 2026-02-01 05:17Z` (never
    restarted since), and 3075 of a possible 5000 entries used, so nothing
    has been evicted. Every distinct SQL statement ever run on this
    database is still listed.
  - Of those, the 168 executed as `service_role` are all PostgREST-shaped
    application queries against the booking tables (plus `forge_*` and
    storage — see below). **No** reconnaissance or exfiltration
    fingerprint: no `information_schema` sweep, no `pg_read_file`, no
    `COPY`, no DDL, no bulk `SELECT customers.*` dump.
  - `auth.audit_log_entries` runs back to 2026-02-05 (1340 rows) and
    contains exactly **one** action ever taken as `service_role`:
    `user_signedup` at 2026-02-05 01:54:53Z, which is the creation of the
    owner's own `andrewswashing@gmail.com` account during setup.
  - `auth.users` holds two accounts, both the owner's, both from
    2026-02-05. No planted user, none banned, none deleted.
  - `pg_roles` is stock Supabase — no attacker-created role.
  - No foreign tables, and no planted `SECURITY DEFINER` function: the 11
    functions in `public` are all the app's own.
  - The public-facing RLS policies are still read-only SELECTs. The
    anonymous-INSERT policy from `temp_enable_inserts.sql` is still absent,
    confirming the 0.1 check.
  - One `cron.job` exists — the legitimate `send-owner-reminders-sweep`.
    Nothing else is scheduled.
  - Storage holds 2 buckets and 2 objects, all from the owner's own
    unrelated `forge` project.
  - API/edge logs corroborate the visible window (traffic is real visitors,
    Googlebot/AhrefsBot, and the Supabase edge runtime) but retention only
    reaches back to roughly June 2026 — 2026-08-01 returns rows,
    2026-03-01 returns none — so logs cannot speak for Feb–May.

- **What this evidence cannot prove.** `pg_stat_statements` records
  statement *shapes*, not rows or arguments: a read that happens to use the
  same query shape the app already uses is invisible in it. A pure
  data-read through PostgREST that mimicked the app's own calls would
  therefore leave no distinguishable trace, and the API logs that would
  have shown it are gone for the first four months of exposure. The honest
  verdict is **no sign of misuse, not a guarantee of none** — every
  durable, tamper-relevant surface (users, roles, schema, functions,
  policies, cron, storage) is clean, and every destructive or
  privilege-escalating use of the key would have shown up in one of them.

- **Side finding, unrelated to the leak:** this live business database was
  also used for the owner's personal `forge` fitness app (its `forge_*`
  tables have since been dropped; two storage buckets remain). Anything
  reachable with the leaked key covered that data too.

### 0.3 — the proof

Proven 2026-08-29 on the demo tenant (`demo-detail`), mailing only Resend's
`delivered@resend.dev` simulator, never a real address.

Method: the real job runs `*/15`, so a second job with the identical body was
scheduled at `* * * * *` to exercise the same mechanism on a one-minute
cadence, then removed. What was unproven was pg_cron → pg_net → edge function
firing unattended, not the parsing of a cron expression — and `*/15` is the
expression already running 1,255 times on the live site.

| Tick (UTC) | Function response | What it means |
|---|---|---|
| 01:25:00 | **500** `{"error":"JWT issued at future"}` | first call after deploy — see below |
| 01:26:00 | 200 `count:0, summary:{}` | nothing due, nothing sent |
| 01:27:00 | 200 `count:2, {owner_reminder_sent:1, customer_reminder_sent:1}` | **the scheduled run sent a real reminder** |
| 01:28:00 | 200 `count:0, summary:{}` | **no duplicate** — same booking, next tick, silent |

- **A reminder really sends, on schedule, untouched by hand.** Booking "ZZ
  Cron Proof C" was stamped `owner_reminder_sent_at 01:27:00.792` /
  `customer_reminder_sent_at 01:27:01.23` by the scheduler. Both emails show
  **delivered** in the Resend log at 01:27:00.881 and 01:27:01.325
  ("Upcoming job — ZZ Cron Proof C" and "Reminder: your appointment").
- **No duplicates.** The 01:28 tick returned `count:0` and C's stamps were
  unchanged. The marker guard holds.
- **No reminders for cancelled bookings.** "ZZ Cron Proof B", cancelled but
  timed to be due, kept both stamps `null` across all four runs and produced
  no mail. It is also absent from `get_bookings_due_for_reminder` while a
  confirmed booking at the same offset is present.
- **The response body carries no booking ids**, confirming the security fix
  is live in the deployed function, not just in source.

- **OPEN — the sweep can fail silently, and did once.** The 01:25 run
  returned 500 `JWT issued at future` from inside the function and sent
  nothing; the three following runs succeeded unchanged, and the keys in use
  have `iat` 2026-08-26 (comfortably past), so this reads as clock skew on a
  cold container on the first invocation after a deploy rather than a bad
  credential. Impact is bounded by the design: the sweep is idempotent and
  due-ness is recomputed every run, so a failed tick delays reminders by up
  to 15 minutes and never loses them. Nothing alerts anyone when a tick
  fails, though — worth an alert before real tenants depend on it.

- Cleanup: the one-minute job was unscheduled, both proof bookings deleted,
  and `cron.job` now holds exactly one active job,
  `send-owner-reminders-sweep` at `*/15 * * * *`. All 11 test suites pass —
  the four credential-free ones and the seven that hit the real project,
  which is what clears the new bookings trigger of breaking anything.

## Phase 1 — 1.1/1.2 the design brief (2026-08-29)

Both items are OWNER-gated, so this session built the instrument and asked
the questions rather than producing anything visual. `docs/design-brief.md`
holds them; `docs/design-references/` is where reference images go. No
direction was invented, sketched or hinted at — roadmap 1.3 explicitly comes
after the answers, and a direction proposed before the references exist would
anchor the owner's choice to my guess.

Judgment calls in how the brief is written:

- **The "feeling" question is asked with real-world anchors, not
  adjectives.** B2 offers Snap-on/Milwaukee, a high-end independent garage, a
  banking app, a barbershop/tattoo studio, Apple. `docs/design-knowledge.md`
  §1 is explicit that "modern and clean" *is* the slop — an adjective answer
  would produce five directions that are secretly the same one. Five named
  brands produce five genuinely different starting points, which is what 1.3
  requires.
- **An anti-reference is requested, not optional.** Costs the owner ten
  seconds and rules out a whole region of the space. Cheapest signal in the
  brief.
- **B1 forces a ranking of the three audiences.** Marketing page, dashboard
  and booking page want opposite things (bold vs. fast vs. warm); refusing to
  rank them is how a design lands bland. `design-knowledge.md` §4 already
  holds an OPINION that the booking page carries the most weight — the owner
  gets to overrule it, but only if asked directly.
- **B5 asks about sunlight and customer age** because they are facts only the
  owner has and they constrain the design harder than taste does. Direct sun
  on a phone is the strongest argument against a dark ground, and the old
  system was matte near-black. Guessing this wrong wastes all of Phase 2.
- **B6 confirms per-tenant accent colour survives.** Every visual decision
  has to remain legible after a stranger recolours it (neon green, near
  black). If the owner wants that taken away the design space widens a lot,
  so it is worth confirming before, not after.
- **B4 offers to keep parts of the old look.** The owner called for a
  complete restart, but "restart" and "hate every part of it" are not the
  same statement, and the three fonts / dark ground / one-lit-element rule
  are separable. Default if unanswered: throw it all out.
- **No screenshots of the old look were produced.** They would only be
  evidence for B3, which the owner has already formed an opinion on — they
  use the product. Offered rather than assumed.

### Tooling checked while 1.1/1.2 wait (2026-08-29)

1.3 has to render mockups and be verified by looking at them, so the path was
tested before it is needed rather than during:

- **Playwright had no browser binary on this machine** — `chromium.launch()`
  failed with "Executable doesn't exist". Fixed with
  `npx playwright install chromium` (114 MB, machine-local, no repo change —
  `playwright` was already a devDep). Re-tested: launches and screenshots.
- **`npm run dev` works** — Vite 5.4.21 on `localhost:5173`, `/` returns 200.
  `app/.env.local` supplies the config; there is no `app/.env`.
- Two screenshots of the CURRENT landing page (392 px and 1440x900) were
  taken and sent to the owner as evidence for B3, so "what bothered you about
  the old look" can be answered against a picture instead of memory. They are
  scratch files, not committed — the old look is already recorded in
  `docs/design-system.md`.

### Sign-off rule tightened (2026-08-29, owner correction)

The 1.1/1.2 handover gave the owner a next-session prompt *and* told them the
session was not safe to clear. They caught the contradiction: a prompt in the
chat reads as "you are done, go clear", so pairing it with "don't clear yet"
issues two opposite instructions. CLAUDE.md now states that the prompt and
"Safe to clear." are one signal that never appears by halves, and that a
session blocked on the owner ends with the ask alone — the sign-off comes
after their answer has been written into a file, not before.

Worth naming the real hazard: had the owner acted on the prompt instead of
the sentence, they would have cleared with the brief still blank and the next
session would have opened on 1.3 with nothing to design from.

## Phase 1 — 1.2 answered (2026-08-29)

Owner answered Part B by voice; recorded in `docs/design-brief.md`. Five of
six landed, and two of them change the shape of 1.3 more than expected.

- **B3 reframes the whole brief.** Every specific defect offered — too dark,
  too cold, too plain, hard to read, didn't look worth the money — was
  declined. The old look was "one of the better looks I've seen it create."
  The single complaint is that it "still kinda looked like it was made by
  AI", and the ask is "a fresh start with more thinking behind it."
  **Consequence: competence is the failure mode, not the target.** A
  direction that is merely well-executed reproduces the exact thing being
  rejected. `docs/design-knowledge.md` §1 is promoted from background reading
  to the pass/fail test, and each direction in 1.3 has to carry a stated
  argument for why it looks the way it does — the owner asked for visible
  thinking, so the reasoning ships with the mockups.
- **B2's "no"s are weak, its "yes" is strong.** Apple was the only anchor
  named without hesitation. Snap-on/Milwaukee and barbershop/tattoo were
  declined, but the owner also said they could not picture those looks — so
  those are "I don't know what that is" as much as "I don't want it", and
  they are not treated as hard exclusions. High-end independent garage was
  never resolved either way; it stays live and gets settled with images in
  1.3 rather than with another question the owner cannot answer from words.
  This is why 1.3 shows pictures: the question format itself was the limit.
- **The Apple answer carries a trap worth naming now.** That look is carried
  by world-class photography and large empty space; our hardest tenant is a
  new detailer with two services and no photos, which §4 of design-knowledge
  calls the real product. An honest Apple direction is the most likely to
  collapse into a blank page there. Kept, with the requirement that at least
  one direction is proven EMPTY rather than fully configured.
- **B5 removes the strongest argument against dark.** Sunlight is not a
  constraint — the dashboard is used before and after a job, not out in the
  sun mid-detail. Dark is therefore judged on merit, not ruled out by
  conditions. Customer age is genuinely spread (18 to old, no skew), so
  neither youth-app conventions nor senior-optimised oversizing apply;
  hierarchy and honest contrast have to do that work.
- **B4: nothing is kept.** `docs/design-system.md` is anti-reference only.
- **B6: no existing brand at all**, so a wordmark is in scope rather than a
  constraint to work around.

Two questions returned to the owner rather than assumed:

- **B1 was a badly-asked question and is my error, not theirs.** "Whose
  experience wins" assumed the owner would picture three screens competing
  for effort. Re-asked as B1b with a shop analogy (front window / back office
  / counter) and a recommendation: favour the booking page, because it runs
  the customers' money AND doubles as the thing shown in a sales call.
- **B6b, the per-tenant accent colour, was not answered** and is not safe to
  assume — it decides whether every visual choice must survive a stranger
  picking neon green. Recommendation given: keep it but narrow it to a
  curated set, which preserves the "your site, your colour" selling line and
  removes the failure mode. Nothing is designed around either answer yet.

## Phase 1 — Part C answered, and one constraint removed (2026-08-29)

- **B1b: the owner refused the ranking and gave a better one.** "I do want
  all of them", and specifically pushed back on the premise that a screen
  being out of the way excuses not making it good. What they gave instead is
  an expressiveness budget: landing page gets the most ambitious visual and
  scroll work, booking page gets real step-to-step motion and is "definitely
  more visually appealing" than the dashboard, dashboard gets things loading
  and popping in but **no scroll animation** ("could get annoying") and
  "don't overdo it". The governing sentence for the dashboard is theirs:
  **"the design that is visually appealing needs to be convenient"** —
  convenience sets the shape and beauty is built around it, which is not the
  same as making it plain. Recorded in the brief as a table because it is a
  per-surface contract that Phase 2 will be held to.
- **The failure mode this creates for 1.3, named now:** a direction that
  sings on the landing hero and dies on the dashboard Today screen has failed
  half the test, and it is the easiest failure to mistake for success,
  because the landing hero is what gets looked at first.
- **B6b: curated colours, and smaller than proposed.** "A few or a couple" —
  narrower than my eight-to-twelve; read as roughly four to six, settled once
  a direction exists. Free-form picking is gone.
- **The big one — retinting is now confined to customer-facing surfaces.**
  Unprompted, the owner said the detailer "probably doesn't really care about
  the admin dashboard colour scheme"; the accent is about what their
  customers see. **So the dashboard gets one fixed house palette and does not
  have to survive retinting at all.** `docs/design-knowledge.md` §4 called
  per-tenant retinting the hardest visual problem here and the highest-risk
  code, precisely because failures stay invisible until a specific customer
  signs up. This removes it from the largest and most token-dense surface and
  reduces it to a handful of known colours on two screen types — small enough
  to test exhaustively rather than hope about. Biggest single constraint
  lifted in the whole brief. Flagged as an assumption in the brief rather
  than treated as settled: if the dashboard is meant to carry a light touch
  of tenant colour after all, that must be said before 2.3.
- **Anti-reference recorded: Kōpiko**, an artisan bakery subscription page.
  Pasted as an image, not saved to disk (checked — the paste is not written
  anywhere findable), so it is recorded by a detailed description of what is
  actually on the page: one enormous cream wordmark as the entire hero, flat
  dark-brown ground, two colours total, the buying form as a small editorial
  order form, numbered steps, and no middle of the type hierarchy. **The
  owner gave no reason** — "i dont like this one" — so those traits are
  recorded as observations and explicitly must not be quoted back as their
  objection. Valuable because it sits close to a boutique/editorial direction
  we might otherwise have proposed, and shares the huge-display-type move.
- **Owner idea parked in the roadmap under Phase 3**, not started: a reusable
  instruction set / agent for building tenant websites, dashboard-wired and
  customisable per client. They deferred it themselves. Filed against 3.1
  rather than as its own item, since it cannot be specified before the tenant
  pages and settings are.

## Phase 1 — reference analysis (2026-08-29)

Seven sites, twenty screenshots looked at one by one, seven codebases fetched
and read. Written to `docs/references/`: `TASTE-NOTES.md` (the owner's verbatim
words, pasted in chat and put on disk because they were the only record of how
the pages MOVE), `ANALYSIS.md` (per-site, 1,669 lines), `DESIGN-BRIEF.md` (the
ranked conclusions). No app code was touched and nothing was implemented.

Method notes worth keeping:

- **Screenshots are not where the brief said they were.** They are flat in
  `screenshots/` with timestamp filenames, not `docs/references/<domain>/`. The
  site mapping was established by looking at all twenty in order and is the
  table at the top of `ANALYSIS.md`. They are cited by filename throughout.
  **Left untracked deliberately — 21 MB of other people's sites in a PUBLIC
  repo is a one-way door.** Owner decision below.
- **Two greps would have produced wrong answers and are recorded as such.**
  `framer-motion` returns zero on finseo because the package renamed to
  `motion`; it is identifiable only by internals like `motionComponentSymbol`.
  And riangle's smooth scroll is not Lenis, which a library-name grep would
  have implied — it is GSAP's paid ScrollSmoother.
- **One thing was not found and is recorded as not found:** riangle's
  cursor-following triangle. Three.js is confirmed present and draws it, but
  the pointer→rotation code could not be isolated in the minified bundle —
  every `lerp` hit resolved to Three's own `Vector2.lerp`, every pointer event
  to GSAP's Observer. No implementation was guessed.

Findings that change what we build:

- **The owner praised the typeface on riangle and sharplink independently,
  and both set Archivo.** He did not know they matched. That is the strongest
  convergent signal in the exercise and Archivo goes into 1.3 as the working
  display face.
- **His #1 stated preference is contradicted by his own choices.** subscrr
  built smooth scroll, shipped it, and turned it off behind
  `const SMOOTH_SCROLL = false` with a comment saying native is faster and less
  viscous; finseo never had it; he called both good. riangle gates it behind
  `(pointer: fine)` so it never runs on a phone. `DESIGN-BRIEF.md` recommends
  dropping it as a priority and settling it empirically at the end, because it
  is a question about feel that cannot be answered from evidence alone.
- **His one hard no now has a number.** momentolegal pins for `end: "+=1830%"`
  — 18.3 viewport heights — to pan one horizontal list. sharplink pins for 1.5
  and assembles an entire section. webtactics' rail is 5 viewport heights of
  plain CSS `position: sticky`. That bracket produces a testable rule for the
  new design system: a pin declares its length and must deliver a section's
  worth of content; ceiling 2 viewport heights, or 5 for a rail; never capture
  vertical touch.
- **Scroll weight was never the problem.** webtactics has the heaviest smooth
  scroll of all seven (`lerp: 0.065`, `wheelMultiplier: 0.75`, and it runs on
  touch) and he loved it. Pin length is the variable, not viscosity.
- **Two engineering patterns outrank every visual idea here.** riangle's
  device tier (`poster`/`still`/`full` from WebGL2, `saveData`, `deviceMemory`,
  `hardwareConcurrency`, plus a runtime FPS governor) is a shipped answer to
  our mid-range Android constraint in about fifteen lines. webtactics'
  `.wt-lite` class gives every entrance animation a CSS end state, so "all
  motion off" is one class on `<html>` rather than a code path. The
  counter-example is in the same set: gustavobatista switches its hero off by
  user-agent sniff for Samsung Internet, the default browser on Samsung
  Androids — our audience.
- **The texture he asked for is not on the site he found it on.**
  gustavobatista's grain is a Three.js particle-and-fog scene and it uses
  `mix-blend-mode` zero times. What he described is a tiling noise PNG or SVG
  turbulence at low opacity with a blend mode — a few kilobytes, no JS. It is
  ranked #2 precisely because no reference does it.
- **The central conflict is named rather than averaged.** He named Apple as
  his confident anchor in B2 and reacted most strongly to webtactics here.
  Those are opposite aesthetics — four effects versus twenty-four, and a 5–10×
  cost difference. `DESIGN-BRIEF.md` refuses to split it and instead requires
  1.3 to build both, with the quiet one carrying one extraordinary detail and
  the dense one shown EMPTY, because that is where density fails.

**OPEN — owner decision: commit the screenshots or not.** They are the evidence
`ANALYSIS.md` cites by filename, they are 21 MB, and the repo is public. Once
committed they are in the history permanently. Recommendation: leave them out
and keep a local copy; the analysis quotes what matters and the sites are all
still live. Nothing depends on the answer.

## Four threads from the owner before clearing (2026-08-29)

### 1. The Apple framing was wrong, and the correction is load-bearing

`DESIGN-BRIEF.md` had posed Apple (restrained) against webtactics (maximal) and
asked the owner to choose. He rejected the axis: "Apple does have some really
cool scrolling effects, especially when they release new products… there's some
middle ground that we could find. I don't want super plain." And on webtactics:
"I know that was completely overdone… I just really enjoyed that website, and I
still wanted some characteristics from it."

He is right. Apple's product-launch pages are among the most scroll-
choreographed on the web — scrubbed sequences, pinned assembly. What they are
restrained in is **decoration**, not motion. So the axis is not quiet-vs-loud,
it is **where the expressiveness is spent**: Apple spends all of it on the
product; webtactics spends it on the studio's own skill, across two dozen
effects. The middle ground he is describing has a name — **maximum
choreography, minimum decoration** — and Conflict 1 was rewritten around it.

**The idea this produces, which is the best to come out of the whole
exercise:** a car is a product too. A hero that scrubs a car from filthy to
finished as the visitor scrolls is Apple's technique aimed at the thing our
customers actually buy, it is footage a detailer already generates every
working day, and no generator produces it by accident — which is the
"it looked AI-made" complaint answered directly.

Two consequences recorded rather than assumed: the pinned hero moves from
"dropped on cost" to "budgeted, because it is the centre of the design", still
bound by the pin discipline the analysis derived; and scroll-scrubbed video
needs an isolated feasibility test on a throttled CPU before anything depends
on it, since it usually needs an image sequence rather than a video element.

**Flagged honestly: Apple's pages have NOT been read at the code level**, unlike
the seven references. The reframe is reasoned from his description and from what
those pages visibly do. Reading one properly is now the first task of 1.3.

### 2. Imagery — the Unsplash connector works, and the owner is a resource

He mentioned the connector and added: "I don't want you to be limited to what
you have. Obviously, I'm a person that could go online and do whatever."

Verified rather than assumed: `search_photos` for "car detailing" returns 4,832
results including real photos of cars being washed. Recorded as a standing rule
in `CLAUDE.md` alongside the existing never-a-grey-box rule, with the part that
matters — **ask him** when the connector cannot find the right shot. His offer
is more valuable than the connector and would otherwise be forgotten at the next
clear.

### 3. The tenant-site build kit is now a real roadmap item (3.4)

Previously a parked note. He described it properly: open an agent pointed at
this repo and have it already carry the reference research and why each site was
liked, the anti-slop floor, the finished design system, and the landing page as
the worked example — with the platform's own landing page as the DEFAULT that
tenant sites inherit, and per-client instructions layered on top.

Three constraints follow from things already decided, and are written into the
item: it is a **markdown brief in the repo**, not a skill or agent definition,
because of the portability rule below; it carries no client content, since 3.2
requires tenant sites to be built from configuration; and it cannot be written
before 1.5, because the design system it must encode does not exist yet.

### 4. Portability — the migration is close to free today, and the rule is to keep it that way

He expects to move to OpenAI's coding agent in roughly a month.

Audited rather than speculated about. **The only tool-specific file in the
entire repo is `.claude/settings.json`**, which contains nothing but a
permissions allowlist and is trivially replaceable. Every durable decision —
all 20-plus knowledge files including `CLAUDE.md`, `DECISIONS.md`,
`PROJECT-STATE.md`, the roadmap and everything in `docs/` — is plain markdown
that any coding agent can read. The only naming friction is that OpenAI's agent
looks for `AGENTS.md` where Claude looks for `CLAUDE.md`; that is a copy or a
symlink on the day, not a project.

So the migration is not a task to plan, it is a property to preserve. Written
into `CLAUDE.md` as a standing rule: nothing that matters may live in a
tool-specific mechanism — no skills, no hooks, no assistant-side memory. This
also retroactively justifies the habit already in force of writing every thread
to a file before clearing.

### The build-kit question the owner asked, actually answered (2026-08-29)

He asked whether his "open an agent and have it build a client's website" idea
had been answered. It had been *filed* (roadmap 3.4) and not answered — filing
is not answering, and the item hid a fork that the roadmap currently straddles.

**The fork:** 3.2 says tenant sites are built "entirely from tenant
configuration — zero hardcoded content", i.e. one shared codebase filled with
each client's data. His description is an agent that *builds a website* per
client, i.e. a separate site each time. Those are different products with
different economics, and only one of them scales for a solo operator:

- Shared system + theme: one codebase, improvements reach every client at once,
  near-zero cost per client after the first. Ceiling is that every site shares
  its bones.
- Bespoke per client: unlimited freedom, but every site is its own thing to
  host, update and fix forever, and nothing propagates. Ten clients is ten
  codebases maintained by one person.

**Recommendation recorded in 3.4:** the kit's default output is a **theme plus
settings for the shared system**; bespoke code is the priced exception, sold
through the website-package tier that 3.3 already assumes. The retint work, the
curated four-to-six palette and the alternating-ground system give real visual
range without forking the codebase — which is exactly why those rank where they
do in `docs/references/DESIGN-BRIEF.md`.

Not asked as a blocking question: it changes 3.1's plan and what 3.2 must
expose as settings, and neither starts for a long time. Flagged in the roadmap
at the point where it will actually bite.

### Screenshots: owner decided (2026-08-29)

Do not commit them. `screenshots/` added to `.gitignore` rather than merely
left untracked, because sessions here routinely use `git add -A` and one of
them would eventually have swept 21 MB into a public repo's permanent history.
The comment in `.gitignore` records why. Closes the open item above.

## Phase 1.3 — four directions (2026-08-29)

### Apple was read at the code level first, and it changed the plan

The roadmap made this the mandatory first task of 1.3 and it earned its place.
Eight product pages read, the iPhone 17 Pro page in full, assets probed by byte
range. Written up in `docs/references/APPLE-READ.md`. Three findings changed
what got built:

- **Apple's dominant technique is play-on-approach, not scroll-scrubbing.**
  Play-on-approach: 8 of 8 pages. Scrub: 3 of 8, once or twice each, and
  absent entirely from the flagship iPhone 17 Pro page. `DESIGN-BRIEF.md`
  Conflict 1 assumed the reverse. So the scrub was demoted from "the
  direction" to "one budgeted sequence in one direction", and the cheap
  technique got used in two.
- **Apple's scrub is never pinned and is never the hero.** Progress maps onto
  ordinary scroll. That dissolves Conflict 3 ("a hero that transforms" versus
  "scrolling that doesn't take you anywhere") — they are not the same
  mechanism after all.
- **Apple does no device tiering whatsoever** — zero `saveData`,
  `deviceMemory`, `hardwareConcurrency`, `effectiveType`. Their whole
  degradation strategy is a per-element load timeout plus a designed still
  frame. This directly contradicts `DESIGN-BRIEF.md`'s recommendation to adopt
  riangle's tier system. Not settled here; recorded for 1.5, with the
  recommendation being Apple's approach plus riangle's fps governor only.

### Four, not five

Five variations on one idea would reproduce the exact complaint that started
the redesign (`design-brief.md` B3: it read as machine-made). Four with
genuinely separate arguments beat five with overlapping ones, and the roadmap
allows three to five. One skill each for three of them, per the roadmap's own
rule; the fourth is built from the Apple read rather than a skill, because at
that point the evidence had more to say than another skill would.

### The empty state is in all four, not one

The prompt asked for any dense direction to be shown empty. All four are,
because all four are photograph-dependent to some degree and the brief calls
the empty state the real product. Direction 2 goes further and makes the empty
case its hero.

### Direction 4 pins, and says so on screen

`APPLE-READ.md` proves Apple does not pin its scrubs. Direction 4 does, because
the owner's lead idea is specifically a *hero* that transforms, and at scroll 0
there is no approach to map progress onto. Rather than hide that, it follows
the `DESIGN-BRIEF.md` pin rule: it declares its length in the hero itself
("held for 1.4 screens"), stays under the 2-screen ceiling, delivers a whole
beat inside the hold, and sets `touch-action: pan-y`. An earlier draft printed
"nothing is pinned", which was simply false; the claim was corrected, not the
build.

### A glow was cut from direction 1 on its own argument

The design hook flagged a jade glow on the seam as the AI-default "cool" look.
It was right, and more to the point it contradicted direction 1's own claim to
a near-zero decoration budget. All four glows removed; the seam is a hard edge.

### Orange stayed out

`design-brief.md` records the owner ruling out orange on subscrr. A sodium-
amber accent was drafted for direction 1 and dropped for that reason. Direction
3's butter yellow is deliberately a yellow, not an orange; if it reads as
orange to the owner, that is a reason to reject direction 3 and worth saying.

### The design hook's font findings were taken, not argued with (2026-08-29)

Fraunces (direction 3) and Instrument Sans (direction 2) were flagged as faces
each new wave of AI-generated interfaces converges on. On this project that is
pass/fail rather than advisory — `design-brief.md` B3 records that the *only*
thing wrong with the old look was that it read as machine-made — so both were
replaced. Fraunces → **Petrona**, which carries a true 100–900 axis and so made
the headline's weight extreme stronger, not weaker; Instrument Sans →
**Familjen Grotesk**.

Two more findings from the same pass, both fixed rather than suppressed:

- **All four directions animated `padding` or `margin` on hover**, several via a
  bare `transition: .18s ease` that silently means `all`. Those are layout
  properties and they re-flow the page every frame, on the mid-range Android
  this product's audience actually holds. Every transition now names its
  properties and moves `transform` instead.
- **Direction 3's ground was a radial colour wash**, which is the glowing-shadow
  tell drawn as a gradient. It is now a linear light-fall at identical hue and
  chroma with only lightness moving.

**Nothing was added to the repo to silence the checker.** An `ignore-value`
entry would have created `.impeccable/config.json`, and `CLAUDE.md`'s
portability rule says the only tool-specific file in this repo is
`.claude/settings.json`. Fixing kept that true.

## Roadmap 1.3, the rebuild — direction 5, "The Thread" (2026-08-29)

### Split stage was demoted from the page's grammar to a two-section beat

`BUILD-BRIEF.md` §2 chose split stage — two columns held in tension for the
whole page. The owner's answer killed it: *"throughout the entire website no
one scroll area, one page looked the same — as you scroll everything morphs
into different layouts and different stuff, and that's what I liked about it,
so use that."* Two columns top to bottom is one layout repeated, which is the
opposite of that. He also capped the comparison himself at *"only like a couple
sections"*.

He did NOT reject the comparison — the risk flagged in §2 ("there is a real
chance he reads it as before/after again") resolved as: he reads it as
before/after, and he is fine with that for about two sections. So the grammar
is what §1 Q7 had already derived from his two favourite sites — one continuous
ground, every section a different structure over it — and the split is two of
those structures. Written up in `BUILD-BRIEF.md` §7, which overrides §2 of the
same file.

### No third-party JavaScript at all, which is how the GSAP licence question closed

`ANALYSIS.md` left an open question: ScrollSmoother and SplitText are GSAP Club
plugins and must not ship unaudited in a product we sell. Rather than read the
licence, the page ships none of it — no GSAP, no ScrollTrigger, no
ScrollSmoother, no SplitText, no Lenis, no Three.js. The weighted scroll is
~30 lines, the line mask is CSS `clip-path`, the sticky rail is
`position: sticky` the way webtactics does it. All the script on the page is
smaller than Lenis alone. Nothing to license, nothing to audit, and one fewer
thing for the next agent to inherit.

The weighted scroll moves the REAL scroll position rather than translating a
wrapper. That matters here specifically: two sections are built on
`position: sticky`, and a translated wrapper breaks sticky.

### Archivo, on the strongest single piece of evidence in the reference set

The owner said "I like the font" about riangle.com and "font is also good"
about sharplink.com, independently, not knowing both set **Archivo**
(`ANALYSIS.md` §2). It carries wdth 62–125 and wght 100–900 in one family,
which is the weight-and-width extreme `design-knowledge.md` §1 asks for.
JetBrains Mono carries every figure — riangle's mono-numerals-as-a-system idea,
which suits a product full of prices, times and counts. Their nav numbering was
NOT copied: four links are not a sequence.

### Near-monochrome with one green, and the reasoning is by elimination

Direction 4 was *"the one that I like visually the most"* and had no brand
colour at all, so the ground is near-black graphite with bone as the dominant.
The single accent is a signal green: orange was ruled out by name on subscrr,
and he flagged his own lean toward blue as *"kind of typical AI"*. Green is
also semantically true here — it marks confirmed and money, nothing else. The
neutral ramp is biased cool so a pure mid-grey never appears.

**`ui-ux-pro-max`'s palette and type output stay rejected**, as disclosed in
`BUILD-BRIEF.md` §5: it returned a light "calendar blue + available green"
system with Fira Code / Fira Sans, and Outfit / Inter / Roboto from its
typography domain. Those are the on-distribution answers this project bans.
What was taken is its structural guidance, not its taste.

### The always-on animation is a requirement, not a flourish

The owner raised it unprompted and it was not in any brief: *"I don't want it
to look like a static page, and also I want some consistent animation, an
animation that's constantly looping itself."* Two loops ship — the rotating
tail on the headline (webtactics' mechanic, values quoted from its source) and
a slow light on the ground.

The risk is real and worth naming: an always-running animation is the fastest
way to make a page feel cheap. The constraints that keep it from being that —
both loops are slow, neither sits under body copy, and both stop dead under
`prefers-reduced-motion`, per webtactics' own comment that a looping `<h1>` is
the single most disruptive thing on a page for that visitor.

### Deposits: verified rather than assumed

`VERDICT.md` said to remove every mention and to confirm what the engine
actually does. `grep -rni deposit` over `app/src` and `supabase` returns zero
matches — the booking engine has no deposit concept at all. Not a copy problem;
there is nothing to reconcile in Phase 2 either.

### A static file cannot know the founding count, so it does not pretend to

The live landing page reads the founding-spot count from the database and fails
CLOSED, so a spot already taken is never advertised. A standalone direction file
has no database. Inventing "3 of 10 left" would be an invented statistic, which
is on the never-defaults list, so direction 5 shows standard pricing only and
says why in a code comment.

### The rail's scroll cost is derived, not chosen

Written first at a fixed 260vh, the horizontal rail cost 2.6 screens of scroll
at 1440 and moved the track **34 pixels** — a reproduction of the owner's one
stated hard no (*"a lot of scrolling that doesn't really take you anywhere"*).
The fix was not a better guess: the wrapper's height is computed from the
track's actual travel, so the exchange rate holds at every viewport instead of
being correct only at the width it was eyeballed on. Same principle applied to
the collapse at the end of the pinned section — the dashboard moves into the
space the thread vacates, measured in script, so no scroll is ever spent on a
half-empty screen.

### The `.in` class collided with itself

The reveal state class and the layout classes `.strip .in` / `.band .in` were
the same string, so an element became a two-column grid the moment it revealed.
Found by looking, not by reading. The layout class is now `.duo`. Worth
recording as a rule for whoever builds this for real: **a state class and a
layout class must never share a name**, because the bug only appears after the
animation runs and never in the markup.

### Round two and three: what his review changed (2026-08-29)

He reviewed the built page — "so much better" — and then tested it on an
iPhone. Five corrections plus two mobile bugs. The reasoning worth keeping:

**A blanket reveal failsafe was deleting the animation it was meant to
protect.** He said elements below the fold "aren't just kinda there, it kind of
animates in" — they were not animating at all. A 4-second timer revealed every
element on the page whether or not it had been reached, so four seconds after
load the whole document was in its end state. The IntersectionObserver AND the
failsafe are both gone, replaced by one pending list checked in the scroll
frame that already runs: an element reveals when its top crosses 82% of the
screen and at no other time, and because it is a comparison rather than an
event it cannot be skipped by fast scrolling or an anchor jump. **General rule:
a safety net that fires on a timer will eventually fire during normal use. Make
the net a property of the same check that does the work, not a race against
it.**

**The scroll weight had two knobs and he was describing both.** "It slowed down
slower... if you scroll it kinda went down a little more" is distance per
gesture AND length of tail. Distance 1.0 → 1.22; lerp 0.11 → 0.055 (webtactics'
territory, and webtactics is the site he liked most). The floor is real:
`ANALYSIS.md` records gustavobatista's `scrub: 2` as "detached from the input".

**The pin was the wrong mechanism for a phone, and the fix was to drop it
rather than patch it.** He reported the pinned section "just doesn't work on
iPhone. It glitches out." The two iOS Safari failure classes were both present:
a sticky element sized in viewport units, and scroll progress measured against
a viewport height that changes as the URL bar hides and returns — which also
fired `resize` on nearly every gesture, re-measuring the flight paths
mid-flight. The phone now does not pin at all; progress comes from the block's
own pass through the viewport, which is riangle's `SCRUB_TRIGGER` and which
`ANALYSIS.md` already called the safe form (`pin:!0` appears zero times in that
site's code). Supporting changes: `svh` for any surviving viewport unit, resize
gated on WIDTH only, an `orientationchange` branch.

**This is disclosed as unverified.** There is no iPhone here. Removing sticky
and viewport-unit arithmetic removes the known failure classes and the
replacement is the mechanism his own favourite site uses — but that is
reasoning, not observation, and `CLAUDE.md` says report what was observed.

**Hover-only states are a piece of the design half the audience cannot see.**
His fix, and it is the right one: on a device that cannot hover, the row
nearest the middle of the screen lights itself as you scroll. Gated on
`!(hover: hover)` so a desktop keeps hover and the two never fight. Worth
generalising in 1.5: **any hover treatment needs a scroll-position equivalent,
or it does not exist on a phone.**

**The founding offer is real data, not a mockup number.** `founding_total
integer not null default 3` in migration `20260828001000` matches his "first
three people get $499", so "3 of 3 left" is the true launch state. The live
page reads the remaining count from the database and fails CLOSED; a static
file has no database, which is why it states the starting figure rather than an
invented midpoint.

**Copy is provisional by agreement.** "I think in the future we'll kind of
critique the actual text on the page. For now, this is a good layout." Recorded
so nobody treats the current wording as approved — it is mostly carried from
`app/src/landing/LandingPage.jsx` and only "Stop booking jobs in your DMs" has
his explicit approval.

### Round four: reversible reveals, and the rule that makes them safe (2026-08-29)

He asked for entrance animations to replay when you scroll back down, and
then raised the objection to his own request before I could: someone landing
halfway down the page must not find text missing because they never scrolled
past it.

**One rule satisfies both, and it is the only thing consulted: an element is
hidden only while its top is still below 82% of the screen height.** Not
whether it has ever been seen, not scroll direction, not a "played" flag. Every
element at or above that line is in its end state, including everything
scrolled off the top — so a reload, a `#hash` link or a restored scroll
position all render correctly by construction rather than by a fallback.

That is the general principle worth keeping: **a reveal system that stores
"has this been shown" has to be rescued when the assumption breaks; one that
derives visibility from position alone has nothing to rescue.** The earlier
version stored it and needed a 4-second blanket timer as the rescue — which
then broke the animation instead (see round two).

Positions are cached at measure time, not read per frame. 42 elements ×
`getBoundingClientRect` per scroll frame is a layout read the mid-range Android
target does not need to pay. `sizeRail()` runs before the cache, because it
sets a wrapper height that moves everything below it.

### When a layout stops pinning, delete the scroll height with it

The mobile blank space he reported was `#threadWrap` at 2,363px around a 984px
section — 1,379px of nothing, about 1.6 phone screens. Cause: a
`.thread-wrap{height:280vh}` left at the end of the mobile media block from the
version that still pinned on phones, sitting after the `height:auto` that was
meant to replace it.

**A pin is two things — the sticky element and the tall wrapper that pays for
it.** Removing the first and leaving the second leaves an empty room behind,
and it is invisible in the diff because both lines look deliberate. Worth a
check in 1.5 when this is rebuilt for real.

### A caption is not an explanation

He read the `$520` section and asked "what is that actually about? I don't get
that section" — and misread "before 6 am" as "six PM", which is its own
evidence. The copy was *"Demo Saturday, before 6 am / Nothing was retyped"*: a
caption for someone who already knew what they were looking at, answering a
question the page had never asked.

Rewritten to name the figure in its first line and point back at the thread the
four jobs came from. The sample-data label the honesty rule requires survives,
but as a quiet mono line rather than as the section's headline — labelling
something as a demo is not the same as explaining what it is.

**This is the first concrete instance of the copy pass he has already
scheduled** ("in the future we'll critique the actual text on the page"), and
it suggests the right test for that pass: every section has to answer "what am
I looking at" before it answers anything else.

## Ease the beat, not the hold (2026-08-29)

A scroll-pinned section that plays several beats has two separate timing
questions, and collapsing them into one is a trap worth naming.

- **How the beats are DISTRIBUTED across the hold** — this must be linear.
  Each beat gets an equal share of the scroll.
- **How each beat PLAYS** — this is where the easing goes.

The first attempt at pacing the thread eased the whole hold with a strong
ease-in-out and then carved each message out of the eased value. A strong
ease-in-out is nearly flat at both ends, so everything between its ends
happens at once: measured, four messages landed 0.10–0.18 of a screen apart
inside a three-screen hold, with about a screen of dead air at either end.
That is worse than the problem it was meant to fix.

**Rule: distribute linearly, ease individually.**

Related, from the same round and from the `animate` skill's own table: a
message leaving while a row arrives is an **exit and an entrance**, which
takes an ease-out — not the ease-in-out that "movement on screen" suggests.
The rail's pan is the other case: constant motion, which takes **linear**, and
gets its gentleness from the stillness budgeted at each end of the hold rather
than from a curve.

### And a locked section needs the page to get heavier

Weighted scrolling banks a whole gesture and eases toward it, so one trackpad
flick can bank more than an entire pinned beat and deliver the user to the far
side having seen none of it. Measured: a 2,880px flick cleared all four
messages.

Two mechanisms fixed it, and both are needed:

- inside a pinned range, a wheel notch carries **half** as far;
- the smoothing may not run more than **0.55 of a screen** ahead of the real
  position.

The range starts a third of a screen BEFORE the pin, so you decelerate into
the lock rather than arriving at full speed. After: the same flick moves 1.30
screens and clears one message of four.

**This only helps a desktop.** The weighted scroll is fine-pointer only, and
native touch momentum cannot be capped without hijacking the gesture, which
would be worse. On a phone the defence is pacing alone — which is why the
holds are budgeted in screens rather than pixels.

## Never measure a transformed element with getBoundingClientRect (2026-08-29)

A rail step carries `transform:scale(.95 + .05 * var(--near))` so the one in
the middle grows. The pan distance was computed from
`steps[0].getBoundingClientRect().width`, which returns the **transformed**
box — so an inactive step measured 1012px instead of its real 1064, every
step-advance came out 5% short, and the error compounded: step two landed 50px
right of centre, step three 104px.

`offsetLeft` and `offsetWidth` are layout values and no transform touches
them. The pitch is now `steps[1].offsetLeft - steps[0].offsetLeft`, which is
also immune to however `gap` happens to resolve.

**The rule: if an element can be transformed, do not measure it with a method
that includes the transform.** This page animates by transform almost
exclusively, so the trap is everywhere in it — the bubbles, the rows, the
steps, the floating cards. Anything that measures one of them for layout
purposes wants `offsetLeft` / `offsetWidth`, not a bounding rect.

The one deliberate exception: the message-to-row flight distances DO use
bounding rects, and correctly — they need where things are on screen right
now, not where the layout says they belong.

## Test at HIS screen size, not yours (2026-08-29)

A process lesson worth more than the fix it came from.

The horizontal rail had a step width capped at 560px. On a 1920 monitor —
which is what the owner uses — three steps plus their gaps came to exactly one
screen, so the section had **40 pixels** of travel and pinned for 0.04 of a
screen. It had been like that since the day it was built.

Every check run against it had used 1440, 768 and 392, because those are the
three viewports `CLAUDE.md` names. At 1440 the fault was present but mild
enough to look intentional (396px of travel), and at 392 it looked fine. **The
one width where it was obviously broken was the only width never tested, and
it is the width he actually looks at the page on.**

Two things follow, and both are general:

1. **The three named viewports are a floor, not a ceiling.** Add the owner's
   own screen to any check where the failure mode is "there is not enough
   content to fill the viewport" — those bugs get BETTER on small screens and
   worse on large ones, so a phone-first check will never find them.
2. **When he reports something, take the measurement at his conditions before
   forming a theory.** I diagnosed this as an iOS pinning fault twice and
   removed the pin on phones to fix it. The pin was never the problem. One
   measurement at 1920 would have shown it immediately.

Related and worth keeping: his report *"the page where it says one, two, and
three, and it kinda, like, stopped your scroll doesn't work anymore"* means
*the section that used to stop your scroll has stopped doing so* — a report
that a feature was MISSING. It was read as *the pinning is broken, remove it*,
and the pin was removed. **When a report is ambiguous between "X is broken" and
"X is gone", ask, or check whether X still happens at all before deleting X.**

## "Something feels a little missing" — the likely answer (2026-08-29)

He ended his round-eleven review with: *"Something feels a little missing, but
I think it's... I don't know. I think I'm kind of overthinking it."* He was not
overthinking it, and it is worth naming so it can be decided deliberately
rather than nagging at him.

**The page has no proof on it.** Not by accident — the marketing deck ruled it
out explicitly in its own header: "Not on this page: invented testimonials,
customer counts, logos, statistics, or a money-back guarantee." That is the
right call, because every one of those would have to be invented today; there
are no customers yet.

The page carried ONE piece of proof that did not have to be invented — the
owner's own story, "I detail cars, I built this for my own shop first" — and
that section was removed the same day, on his instruction. What survives is a
single line under the hero button.

So the shape of the answer is: **the page argues well and proves nothing.**
Every other section is a claim about what the product does. Nothing on it says
anyone has ever used it, because nobody has.

Three honest ways to close it when he wants to, in order of how soon they are
possible:

1. **His own business as the proof.** Andrew's Auto Detail runs on this. That
   is a real, checkable claim available today and it needs no customer — it is
   the section that was just cut, in some form.
2. **The demo business** (roadmap Phase 6) — a working site and dashboard a
   prospect can open and click, which is proof by demonstration rather than by
   assertion.
3. **Real testimonials** after Phase 5, when there are real tenants. Not
   available and not to be faked.

Recorded rather than acted on: he did not ask for a change, and option 1 means
reversing a decision he made hours earlier. Do not re-propose it unprompted —
raise it if he mentions the feeling again.

## Removing the owner section, and why its mechanic was not re-homed (2026-08-29)

He decided the fork: *"Remove the owner section."* Removed in full.

**The word-brightening mechanic went with it and was deliberately not moved
elsewhere.** This is the one place a standing rule of his and a design
principle point in opposite directions, so the reasoning is recorded rather
than left to be re-litigated:

- His rule says motion is not spendable, and a mechanic that has nowhere to
  live is a question for him rather than a silent deletion.
- But that rule exists to stop a page quietly flattening across a rewrite.
  The failure it guards against is losing motion by ACCIDENT. Re-homing a
  mechanic into a section that does not want it fails the same goal by a
  different route: an effect with no reason to be there is decoration, which
  `docs/design-knowledge.md` §1 names as a tell.
- Word-brightening suits a person talking, read at speaking pace. There is no
  first-person copy left on the page. The hero has a typewriter already; the
  closing line is eleven centred words.

So it was cut, and the count still went UP over the rewrite as a whole:
thirteen mechanics before the marketing deck, seventeen after. If he wants it
back, the honest way is to give it something to say, not somewhere to sit.

Recoverable in full from commit `6c6f412`, which is what matters if the
section becomes its own About page later. The claim it carried survives in
the hero's sub-line, so removing the section did not remove the
differentiator.

## His four instructions on the rewrite, and the one still open (2026-08-29)

- **The $520 section was removed** on his instruction. Its count-up mechanic
  survives on the pricing figures, so the motion inventory did not shrink.

- **All competitor pricing removed** — see the closed blocker below.

- **One table row is mine, not the deck's**: "A Facebook page". The table
  stopped being about what you PAY and became about what you're USING, and a
  Facebook page is what most of this audience is actually using — the FAQ's
  own first answer says so. Flagged rather than slipped in; one line to
  remove if he disagrees.

- **The owner section was reformatted, not moved.** He said he is *thinking*
  of removing it or giving it its own page, which is not a decision, so
  nothing was moved or deleted. What was done is the part he did decide —
  "reformatting it like an about me or about the owner type thing" — which
  is a signature block at the end, the thing that separates an about section
  from a sales section written in first person.

  **DECIDED SAME DAY: "Remove the owner section." It is gone.** He was given
  the fork and a recommendation against removing it; he chose removal, which
  is his call to make and is now the record. Do not re-propose it.

  The recommendation that was weighed, kept only as the reasoning: keep a
  SHORT version on the landing page and put the long one on an About page
  later. The reason is that "built by a detailer, for his own shop" is the
  single claim on this page no competitor can copy — a booking startup cannot
  say it — so removing it entirely spends the strongest differentiator to
  save one screen. But a full about section does belong on its own page, and
  a separate page is a Phase 3 shape anyway: this direction file is one page
  with no routing, so a second page is not something to invent here.

  Note that the photograph and the placeholder copy are blockers on that
  section wherever it ends up, so answering this does not remove them.

## Building the marketing rewrite: what was mine, and one pre-ship blocker (2026-08-29)

The copy is the owner's approved deck and is used verbatim. These are the
calls that were not in it.

- **The page grew from 9.47 screens to 12.72 at 1440.** "The page must not get
  longer" was his instruction twice during 1.4; the deck he has since approved
  adds three sections, and "whatever it comes back with, we have to adapt to
  it" is the later instruction. So the growth is sanctioned, not overlooked.
  Recorded because a later session reading only the 1.4 note would try to cut
  it back.

- **His motion rule was met by addition, not by preservation alone.** Thirteen
  mechanics went in and sixteen came out; skeletons went from eight to twelve
  and no two sections share one. The three new sections each got a mechanic of
  their own rather than inheriting one, because a new section carrying no
  motion is how a page quietly flattens across a rewrite even when nothing was
  explicitly deleted.

- **A second light ground was added, which the deck did not ask for.** With
  three sections appended to the back half, one light band left eight dark
  screens in a row. The comparison table takes it. Ground rhythm is structure,
  which his rule assigns to me; if he dislikes it, it is one property.

- **The FAQ uses `<details>`, not a hand-rolled accordion.** No JavaScript, no
  ARIA to get wrong, keyboard and screen-reader behaviour for free, and it
  works if every script on the page fails.

- **"Questions." as a heading is mine.** The deck gives that section an
  eyebrow and eight pairs and no title, and a section with no heading is a
  hole in the document outline. It is a label, not a claim.

- **The $520 strip was KEPT although the deck omits it.** See the roadmap and
  README; it is an open question for him, not a decision I took. Kept rather
  than cut because his rule is that a mechanic is not spent silently, and
  because it is the payoff of the section the deck marks "unchanged".

- **No photograph of the owner was invented.** The deck asks for one of him
  working. A stock photo of a stranger under a first-person paragraph naming
  his real business would be a picture of someone who is not him, presented as
  him, on a page selling that business. Nothing was substituted; the section
  ships as type until he supplies the image, and the two-column CSS is written
  and waiting.

### ~~⚠ PRE-SHIP BLOCKER: four competitor price ranges~~ — CLOSED SAME DAY
### by his instruction to remove them; kept below as the reasoning

**RESOLVED 2026-08-29.** He instructed: *"let's not like directly say
competitor pricing but just have it be like an our thing is an improvement
from all of these services."* Every competitor figure is off the page — the
table's cost column is gone and the pricing section's line was reworded. Our
own price stays, because that one is ours to state. Nothing left to verify.
The original entry follows because the reasoning is worth keeping: it is the
argument for why a competitor's price is a different KIND of claim from
everything else on a marketing page.

### ⚠ PRE-SHIP BLOCKER (now closed): four competitor price ranges are on the
### page and none of them are verified

Section 7's comparison table prints, from the deck: "Per lead, booked or not"
(Yelp, Thumbtack), "$70–$250 a month" (detailing software), "$2,000–$5,000,
then again for changes" (a site you paid for once). The pricing section
repeats the software range.

**This reverses an earlier decision in this same file.** During 1.4 the call
was recorded as "No competitor price is printed on the page — the $2,000–8,000
range is research, not a number this page can stand behind." The deck
overrides it, and the owner approved the deck, so it is built. But the deck
imposes its own condition and that condition is not yet met:

> "Verify all four price ranges against their own pricing pages before this
> ships. Understate rather than overstate."

Two of the four are not fixed prices at all — Yelp and Thumbtack sell leads at
auction — which is why that row states a MODEL rather than a figure, and that
is the safe form for it. The other two are checkable and have not been
checked.

**Nothing here may reach the real landing page until each row is verified
against the source's own pricing page.** This is a direction file, so the
claims are not public yet; roadmap 2.2 is where they become public, and 7.3 is
the final pass that must catch it if 2.2 does not. Printing a competitor's
price wrongly is the one claim on this page that a third party, rather than a
customer, would object to.

## The owner's review of the repointed page, and the rule it sets (2026-08-29)

He reviewed the 1.4 page on his iPhone and answered the three questions that
were put to him. All four items below are HIS decisions, not proposals.

### 1. The iPhone works. The 1.3 blocker is closed.

> "iPhone check everything looks good."

The pinned section was rebuilt in 1.3 so phones never pin, and that could not
be proved without an iPhone. It is proved. **Do not re-open it.** He added one
defect: *"there's still some slight little glitch when you scroll all the way
down to the bottom, but very minor."* Reproduced at 392x844 and fixed — see
`docs/design-directions/README.md` "Round seven".

### 2. Photography is approved, in principle and not only for the mock

> "I'm definitely not against it... a lot of the websites that I was really
> kinda referencing off of have tons of photos... it just needs to elevate
> the website."

So the page's no-photography rule was a **means, not an end**. VERDICT.md §3
banned car photography because the four rejected directions used it to sell
car detailing, and we sell software — that reasoning still holds for the
landing page's own subject. It never meant the product must be sold on type
alone. One photograph is now in the tenant-site mock, which is the place it is
unambiguously correct: photos of their own work are what a detailer's site is
made of. **Whether photography appears anywhere ELSE on the page is deferred
to the marketing rework in §4, not settled here** — that pass may move or
delete the sections it would go in.

### 3. The new hero is WORSE than the old one, in his judgment

> "it's a little bit worse than what I liked before. I kinda liked the...
> 'stop booking jobs in your DMs' or whatever, that would change through."

This is a straight conflict, and it should be recorded as one rather than
resolved quietly. Roadmap 1.4 REQUIRES the hero to lead with the website —
that requirement comes from his own positioning change, argued from the
market. His taste prefers the line the positioning displaced. Both are his.

**Nothing was reverted.** He did not ask for a revert; he asked to wait for
§4, which is the arbiter he chose. So "Your website is currently a Facebook
page." stands as PROVISIONAL. If the marketing pass does not resolve it, the
question to put to him is whether the old line can head the page while the
website still leads the offer — which is roughly what the current thread
section already does one screen lower.

### 4. THE STANDING RULE: the marketing research decides the words and the
### running order; it does not get to spend the motion

He is running the page's full text through a separate marketing AI and will
paste its recommendations back.

> "whatever it comes back with, we have to adapt to it."

and, in the same breath:

> "I don't want us to lose any of that cool animations and scrolling effects
> that we have. We just might have to change them up, you know, switch them,
> the order, maybe completely, you know, redo some of them."

**So the constraint on that rework is: copy and section order are the
marketing pass's to change, freely and including completely. The motion is
not spendable. Every mechanic on the page survives in some form — the
messages becoming the schedule, the weighted scroll, the reveals, the
horizontal rail, the light band, the always-on ground, the rotating tail.**
They may be re-pointed at different content, re-ordered, re-timed or rebuilt,
but the count must not go down because a new copy deck was easier to lay out
flat. If a recommended section genuinely has nowhere for a mechanic to live,
that is a question for him, not a silent deletion.

Two practical notes for whoever picks this up:

- The text he pasted into the marketing tool is every visible string on the
  page, in reading order. It can be regenerated at any time by walking the
  rendered DOM — it is not a file that has to be kept in sync.
- The mechanics are documented section by section at the top of
  `docs/design-directions/5-the-thread.html` and in README.md "Eight
  sections, eight skeletons". Read that BEFORE re-laying-out the page, so
  the rework knows what it is carrying.

## Building 1.4: the judgment calls made while repointing the page (2026-08-29)

The positioning itself is the section below this one. These are the calls made
while turning it into a page, recorded because none of them were spelled out in
the roadmap and a later session would otherwise have to re-decide them.

- **The hero names both halves by DIVIDING them between the headline and the
  object, not by cramming both into one sentence of display type.** The
  headline is the website ("Your website is currently a Facebook page."); the
  floating card beside it is, and always was, the dashboard's own job card; the
  lede states the pair explicitly. The roadmap's named trap was fixing the
  under-selling of the website by demoting the dashboard, and a headline that
  tried to carry both nouns would have subordinated one of them by word order
  alone. Splitting them across the two halves of the hero makes them equal by
  construction rather than by phrasing.

- **The rotating tail was kept and re-aimed rather than replaced.** It is a
  mechanic he named as liked. What rotates is now what a detailer has instead
  of a website, which is the gap the offer closes — the same device doing the
  new job.

- **The headline's type size is now derived from a measurement, not a taste
  call.** The new tails are longer than the old, and the old size overflowed
  the column at both ends of the range. The widths were measured at seven
  viewport widths before anything was changed, and the fix is split: the size
  clamp handles the desktop end, and the FONT'S WIDTH AXIS handles the phone
  end so the headline keeps its size there. Recorded because "make the text
  smaller" was the obvious move and it was the wrong one — a variable font has
  a second dial and this is exactly what it is for.

- **Section 5 was REPLACED, not extended.** He said twice that the page must
  not get longer. A phone-shaped booking widget became a browser window
  containing a website with the booking panel inside it; the window is
  landscape where the panel was portrait, so the section costs the same height.
  This is also why no "here is your website" section was ADDED — the page has
  the same eight sections it had.

- **No competitor price is printed on the page.** The reframed $900 sets the
  offer against "a template you fill in yourself" and "an agency that charges
  again every time a price changes", with no figure attached to the agency.
  The $2,000–8,000 range recorded in the positioning section is research we
  did, not a number this page can stand behind if a detailer challenges it.

- **The tenant-site mock carries NO photograph, and that is a question for the
  owner rather than a decision.** The page has no image on it anywhere, and
  CLAUDE.md bans grey placeholder boxes, so a photo-shaped hole was never an
  option; adding real stock photography would change a look he has already
  approved and was not on the 1.4 list. Not done unilaterally in either
  direction. The risk if it stays as it is: the page now leads with "we build
  you a website" and shows a website with no pictures, and pictures of their
  own work are what a detailer thinks a website IS.

- **A pre-existing bug was fixed at its root rather than patched at the
  symptom.** In the reduced-motion path the dashboard rendered "0 jobs · $0 ·
  nothing booked" above four fully visible job rows. Reproduced on the
  committed file before any 1.4 edit. The `setSummary(JOBS.length, TOTAL)`
  call that exists to prevent exactly this was being overwritten a moment
  later, because the scroll LISTENER is attached only when `!LITE` but
  `ready()` calls `onScroll()` once unconditionally — one scrub frame at
  progress 0. The fix skips the entire scrub loop in LITE rather than
  re-ordering the two calls, because every other scrub was also running once
  and writing values that `.lite` CSS then had to override.

- **"Start free" was removed from the nav because it was untrue.** There is no
  free tier. `tests/landing-pricing.test.mjs` already enforces "no unearned
  free-trial promise" — but it scans `app/src/landing/LandingPage.jsx`, and
  this is a static direction file, so nothing was watching it. Worth knowing
  for 1.5: the design tests being rewritten there cover the app, and the
  direction files are outside their reach.

- **Section 6's "no designer" was removed because it contradicted the pricing
  card.** The card now says the fee is what it costs to have the site built for
  you. Both claims cannot stand. The honest version is that the booking-only
  tier is self-serve and the website tier is built with them, which is what
  the lede now says.

## Positioning: what we sell is the pair (2026-08-29)

**Read the correction at the end of this section first — the owner amended the
framing the same day, and the amendment is the operative version.**

The owner asked me to do the marketing thinking rather than hand it back —
"I'm not a marketer, so actually I want you to do the thinking of what would
be best advertised." This is that, with the reasoning exposed so it can be
argued with.

### The observation he made, and why it is correct

> "At first I was like, I'm just gonna sell this booking engine. But I'm
> realizing there's already a lot of those out there. So my main advertisement
> should be a custom website."

He is right, and the reason is pricing power. Booking software is a commodity
category with free entrants — Square Appointments, Setmore, Calendly, Acuity,
Booksy. **Lead with booking and the buyer files us next to free.** $900 setup
plus $60 a month reads as expensive for "a booking tool" and cheap for "a
website built for me". Same product, same price, opposite reaction, decided
entirely by which noun goes first.

### Where the offer actually sits

A detailer who wants a website has three real options today:

| | What it costs | What it costs them |
|---|---|---|
| Wix / Squarespace | ~$20–30/mo | **They do the work**, and the result looks like they did |
| An agency or freelancer | $2,000–8,000 | Good result, slow, and every price change is an email and a wait |
| A Facebook page, a Yelp listing, nothing | free | It is what most of them have |

Our offer is in the gap: **an agency-quality outcome, none of the DIY labour,
and it stays editable afterwards.** That last clause is the part neither
alternative has — the DIY site is editable but bad, the agency site is good but
frozen.

### The ordering, and why

1. **The website.** Tangible, picturable, high perceived value. It is what
   they would have to spend thousands on otherwise.
2. **"Custom, not a template."** This one line decides which category the buyer
   mentally files us in. Without it we are compared to Wix and lose on price;
   with it we are compared to an agency and win on every axis. It has to be
   explicit, not implied.
3. **The dashboard is why it stays current** — not the headline. He was
   explicit: "don't make that the main point." It is the answer to the agency's
   weakness, so it belongs immediately after the custom-build claim and
   nowhere near the top.
4. **Booking**, as a feature of the site rather than the product.
5. **The terms** — no commission, your customers are yours, cancel any time.

### What this changes on the page, and what it must not

**Must change:** the hero leads with the website, not with booking; the section
currently titled "What your customers see" becomes the tenant website itself
rather than only the booking widget; one ruled row is added for editing from
the dashboard; and the $900 is reframed as *what it costs to have a site built
for you* rather than as a fee to get started.

**"Stop booking jobs in your DMs" survives**, but moves down to head the thread
section — which is literally what that section shows. It stops being the
promise and becomes the pain, which is the job it was always doing.

**Must not:** get longer (his instruction), make live-editing the headline (his
instruction), or add a feature list for a site that Phase 3 has not built yet.

### CORRECTION, same day: it is ONE build, not a website with extras

The owner amended the framing above, and this is the operative version:

> "The website with the admin dashboard is kind of the seller. Like, it's
> combined. It's not like, here's a custom website with you, also comes with
> the admin dashboard. No. So we're building this website and admin dashboard
> for you kinda thing. Obviously the admin dashboard's cookie cutter, but I
> don't want that to be lost."

The ordering above is right; the *grammar* was wrong. "A custom website — and
it comes with a dashboard" makes the dashboard an accessory, and he does not
want it demoted, even though it is the standardised half. **The sentence is
"we build you a website and the dashboard that runs it", as one purchase.**

Practically, on the page: the hero names both. The website is what makes the
offer uncommon and so it leads the sentence; the dashboard is in the same
sentence, not in a later section that reads as a bonus. Only the live-editing
*feature* stays out of the headline — that was his earlier instruction and it
still holds. Do not fix the under-selling of the website by creating the same
problem for the dashboard in the other direction.

### The honesty flag I raised, and why he was right to dismiss it

I flagged that the page sells a tenant website Phase 3 has not built, and that
the first customer's site would have to be hand-built. He answered:

> "We're not selling to customers until literally every single thing is
> completely finished. So that's not a flag. Phase 3, we will build it, and
> then the first customer site will be built by our bot."

He is right and the flag is withdrawn. There is no window in which the page
promises something that does not exist, because nothing is sold before Phase 3
ships — and the first client site is produced by the build kit (3.4), which is
the entire point of building the kit. Recorded because a later session reading
only the paragraph above would otherwise re-raise it.

Everything on the page is real today or will be before anything is sold: the
dashboard, the booking engine, the price, the founding count. Nothing invented
was added to support the new positioning and nothing should be.

## Cutting a section: measure what the length is made of first (2026-08-29)

The owner said the page was too long and chose "cut a section". The candidates
this repo had already written down — the comparison table, or folding the
questions — came from round fourteen's own closing note, which was written
without ever measuring what each section costs.

Measured (`offsetTop`/`offsetHeight`, screens, at 1920/1440/392): the two
LOCKED sections were **8.07 of the 14.44 screens at his monitor width — 56% of
the page**. Everything a reader reads came to 6.4 screens. The two named
candidates were 0.84 and 0.73 screens: cutting either buys **5%**, which he
would not have felt, and it would have spent a section for nothing.

The 01/02/03 rail was the outlier at **4.07 screens to advance three cards
sideways twice** — about 2 screens per beat, against the thread's 0.75 for
four messages. Most of that was fixed cost rather than earned: a full screen
of sticky stage plus 0.8 of budgeted stillness before any travel happens at
all. **A locked section's floor is ~1.8 screens whatever it contains**, which
is the number to check before adding another one.

**Rule: before cutting for length, measure every section's scroll cost at the
owner's own width. The advice in a previous round's write-up is not evidence.**
This is round twelve's lesson ("test at HIS screen size") reappearing as a
documentation problem rather than a CSS one — a stale note in a file is as
capable of sending a session the wrong way as a stale measurement is.

### Carrying the sentence, not just deleting the section

The rail's lede was doing two jobs, and both had to survive the cut: it
answered "is this going to be a project", and its second half is what stops
the pricing card ("we build it for you") contradicting section 4 — a
contradiction found and fixed in round six. It is now term 01 of the pricing
list. **When deleting a section, check what its copy is load-bearing FOR, not
just whether it reads well where it is.**

### What the cut bought beyond the screens

The rail's heading and lede were the only elements on the page revealed by a
pin rather than by approach, which forced an `inRailHead` exception into the
reveal sweep. With the section gone the page is uniformly reveal-driven with
no exceptions. A rule with no exceptions is worth more than the mechanic that
required one.

## Baseline a new check against the last known-good version (2026-08-29)

The reveal-sweep checker written for the cut reported 136 stranded elements,
which read as "the cut broke the reveals". It had not. Run against the
COMMITTED page — which round fourteen had verified as clean — the same checker
reported 110.

**A checker that fails a known-good version is measuring the wrong thing, and
that is cheaper to discover than to debug.** The fault was the definition: it
counted any element merely overlapping the viewport, when the page's own rule
is that an element arrives once its top crosses 82% of the screen. Everything
between 82% and the bottom edge is correctly still hidden.

**Rule: before believing a new measurement about a change, run it against the
version before the change.** Two numbers are diagnosable; one is not.

## The new design system, and what it deliberately leaves open (2026-08-30)

Roadmap 1.5. `docs/design-system.md` is now **"The Thread"**, replacing
"Raking Light". Three choices inside it are worth recording as choices rather
than as facts.

**The reference page outranks the document.** The file says plainly that
where `docs/design-system.md` and `docs/design-directions/5-the-thread.html`
disagree, the page is right and the document is stale. That is unusual — a
system file normally outranks an implementation — and it is deliberate: the
page is the artefact the owner reviewed and approved through fifteen rounds,
and the document is a description of it written afterwards. A description
that can overrule the thing it describes is how a system quietly stops
matching what shipped.

**The tests measure the reference page, not `app/src`.** `app/` has not been
restyled — that is the whole of Phase 2 — so a test asserting the new tokens
against `theme.css` would fail for months, and CLAUDE.md requires the four
credential-free tests to pass at the end of every session. A test suite that
is expected to fail is a test suite nobody reads. `design-contrast` therefore
reads `theme.css` **if it defines `--ink-0`** and the reference page
otherwise, so the switch happens by itself the moment Phase 2 lands the
tokens, with no edit. The outgoing palettes stay checked in the meantime,
because they are what actually ships today and a floor that stops being
enforced during a long migration fails silently.

**The device-tier question is closed, not deferred.** The roadmap parked it
for 1.5. The answer is Apple's, per `docs/references/APPLE-READ.md`: never
ask what the device is, ask whether the thing arrived. No `deviceMemory`, no
`hardwareConcurrency`, no user-agent tiering — guessing quality from hardware
buys less than a load timeout, and its failure mode is blacklisting a browser
by name. The defence is `.lite` (one code path, the same CSS the animation
targets), `prefers-reduced-motion` routed into it, and the rule that nothing
is ever hidden behind an animation. An fps governor is the one piece worth
borrowing from riangle later, when something measured drops frames — not now,
with no WebGL anywhere on the page.

**What it does NOT settle, and why that is not a gap.** Direction-inventing
is banned from 1.5 onward, so three things are named at the end of the file
instead of being decided by a session: whether a light theme exists at all,
which colours the tenant's curated four-to-six are, and the dashboard's own
section skeletons. The light theme is the interesting one — the evidence
points at dropping it (sunlight is not a constraint per `design-brief.md`
§B5, a second theme doubles every contrast check and every retint test, and
the identity is the dark ground), but a toggle exists today and removing it
is a visible takeaway. **Recommendation on the record: drop it, keep the
light band as the only light surface.** His call, and it is the first
question of Phase 2 rather than a blocker for 2.1.

## A skipped check reads exactly like a passing one (2026-08-30)

`tests/design-contrast.test.mjs` had five rows for the landing page, each
guarded by `if (Ld.i && Ld.bg)`. `landing.css` has never defined `--bg` or
`--panel` — it calls them `--g` and `--p` — so every one of those guards was
false and **all five rows silently did nothing.** The landing page has had no
contrast coverage at all for as long as the check has existed, and the suite
reported "all pairs pass" the whole time.

Found only because the rewrite made a skipped row print `skip (token
missing)` instead of vanishing. Corrected to the real token names: ten pairs
now, all passing — so it was a coverage hole rather than a live defect, which
is luck and not vindication.

**Rule: a check that cannot find its input must say so out loud.** Silently
skipping turns a hole into a green tick, and a green tick is worse than no
test because it stops anyone looking. Any guard of the form "only assert if
the value was found" needs an `else` that prints or fails.

## The owner's answers of 2026-08-30: 1.4 approved, no light theme

Three things closed in one message: *"changed the pin, i approve it for now
and yea no light theme needed."*

**1.4 is approved.** "For now" is his own qualifier and it is recorded as
written — the page is approved as the direction and the build, with copy
still provisional by prior agreement (the sections the marketing deck did not
touch have never been through him). Roadmap 1.4 is ticked; phase 1 is closed.

**The artifact's share pin is moved**, so the shared link now serves the
current page rather than a frozen earlier round. That had been silently
serving stale versions to him on his phone since round six.

**There is no light theme.** The dashboard's light/dark switch goes. The
reasoning was put to him and is on the record: sunlight is not a constraint
(`design-brief.md` §B5), a second theme doubles every contrast check and
every tenant-accent retint test for as long as the product exists, and the
identity is the dark ground. The cost — anyone who prefers a light UI loses
it — was stated before he answered.

**Nothing was ripped out today, and that is deliberate.** `app/` still ships
"Raking Light", where light mode works correctly. Deleting it before the new
dashboard exists would take a working feature away from a product that has
not yet gained its replacement, for no benefit — the saving is in *future*
work not done, not in code removed now. **The removal belongs to roadmap
2.3**, and the four places it touches are scoped in `docs/design-system.md`
so the session that does it does not have to rediscover them.

### The trap in this answer, and why it is not being treated as settled

His answer is about the DASHBOARD's toggle, because that is what he was
shown. **It does not decide the customer booking page**, which is a
separate surface and is deliberately light-first today:
`app/src/book/BookingBusinessContext.jsx` says *"a customer arriving from a
text message shouldn't inherit whatever theme the last dashboard user
picked"*, and `booking.css` grounds it on `--bk-bg: #E7E7E5`.

That comment is an argument about not inheriting a stranger's preference. It
survives whichever ground wins and it does not choose one. Reading "no light
theme" as "the booking page is now dark" would be **taking a decision he was
never asked**, on the single highest-traffic customer-facing screen in the
product — exactly the failure mode the "ask, do not infer" rule in this file
exists for. It is the first question of roadmap 2.1 and it is his.

## The customer booking page is dark (2026-08-30)

Asked separately from the dashboard toggle, because his "no light theme"
answer did not cover it and inferring it would have been taking a decision he
was never put. **His answer: dark, like everything else.**

The argument that decided it is the positioning rather than taste: the page
claims the booking form is built INTO the detailer's website, not a link off
to somewhere else — that containment is made as a shape in section 3 of the
reference page, not as a sentence. A light form sitting inside a dark site
breaks the claim on sight.

**What survives from the old light-first decision.** The comment in
`app/src/book/BookingBusinessContext.jsx` — *"a customer arriving from a text
message shouldn't inherit whatever theme the last dashboard user picked"* —
is still correct and still binding. It was never an argument for light; it is
an argument against inheriting a stranger's preference. The page keeps its
own fixed ground, independent of any dashboard state. Only the colour of that
ground changed. **Do not delete that comment while restyling; re-point it.**

**Revisit in Phase 3, and only then.** The third option offered and declined
for now was "follow the detailer's own site" — dark for a dark site, light
for a light one — which is the truest reading of "a custom website for every
detailer". It was declined because Phase 3 has not built any tenant sites, so
there is nothing to follow yet and it would be building a mechanism against
an imaginary input. When the first bespoke sites exist and one of them is
light, this is the decision to reopen.

### Consequence for 2.1

`app/src/book/booking.css` grounds on `--bk-bg: #E7E7E5` and mirrors the old
system under `--bk-*`. That mirror is now the new tokens, dark. The tenant
accent still passes through `app/src/lib/theme.js` — which stays the only
file computing colour in JS — but `brandVarsFor(..., "light")` at
`BookingBusinessContext.jsx` becomes the dark mode, and `THEME_BG` /
`DEFAULT_ACCENT` in `theme.js` collapse to single values along with the
dashboard toggle in 2.3. The contrast test's "outgoing: booking (light-first)"
block goes when the tokens do.

## Roadmap 2.1 — the booking page restyled, and what it cost (2026-08-30)

The first surface in `app/` to actually carry "The Thread". Files touched:
`app/src/book/booking.css` (rewritten), `BookingPage.jsx`, `StepWhen.jsx`,
`StepReview.jsx`, `BookingConfirmed.jsx`, `ManageBookingPage.jsx`,
`BookingBusinessContext.jsx`, `app/src/lib/theme.js`, `app/index.html`, and
the booking block of `tests/design-contrast.test.mjs`.

The light-first comment in `BookingBusinessContext.jsx` was **re-pointed, not
deleted**, as the decision above requires: the page still carries its own
fixed ground independent of dashboard state — only the colour changed.

### The accent had to split in two, and this is a system-level rule

`brandVarsFor` now returns **`--bk-accent-text` as well as `--bk-accent`**,
and the stylesheet says plainly: never use `--bk-accent` on words.

The reason is measured, not stylistic. `correctAccent` clears the **3:1**
non-text floor, which is right for a button fill, a selected day or a ring.
But this page also sets the running total, the "PROMO applied" line and the
phone link IN the accent, and small text takes **4.5:1**. Crimson `#DC2626` —
a real entry in `PRESET_COLORS` and the live accent of `demo-riverside` —
measures **3.27:1** on `--ink-0`: it passes as a fill and fails as type. The
text variant runs the same correction at the 4.5 floor and comes back
`#E04040` (4.62:1) for that tenant, and is identical to the fill for accents
with headroom.

The dashboard already had this distinction (`accentTextFor` → `--accent-text`)
and the booking page simply never used it. **Any surface that prints the
tenant's colour as words needs the text variant — that includes every tenant
site built in Phase 3.**

`correctToward` took `(hex, mode, min)` and now takes `(hex, bg, min,
fallback)`, because the booking page's ground is no longer one of the
dashboard's two. `BOOKING_BG` (`#0B0D0E`) and `BOOKING_ACCENT` (`#38E08B`)
are named constants in `theme.js`, kept separate from `THEME_BG` /
`DEFAULT_ACCENT` on purpose: those still describe the dashboard, which ships
the outgoing palette until 2.3. **`design-contrast` now asserts that
`BOOKING_BG` and `--bk-bg` are the same colour**, because correcting an
accent against one ground and painting it on another is a silent failure.

### The system had no error colour — that hole is now closed, not flagged

The first pass reused `#E2705F` locally and flagged the gap. That was leaving
a hole for 2.3 to fall into on eleven settings screens, so it was chased
instead: **`--bad: #E2705F` is now a named token in
`docs/design-system.md` § Tokens**, under "The one warm value".

It was NOT invented. A grep of the approved reference page found **no red in
it at all** — it is a marketing page with no error states, so there was
nothing to derive from and nothing to contradict. `#E2705F` is the value the
product already ships in the outgoing dashboard palette: continuity rather
than a new decision. On the new ground it measures **6.23:1 on `--ink-0`**
and **5.54:1 on `--ink-2`**, and it is the only warm value anywhere in the
system, so it can never be mistaken for the accent.

It is the one token that is not in the reference page, so it is exempt from
`composition`'s sixteen-token drift check; `design-contrast` now asserts the
stylesheet and the document agree on its value instead. **If the owner wants
a different red, `docs/design-system.md` is the single place to change it and
the test will fail until the stylesheet follows.**

### Two traps found by looking, worth not re-learning

- **`font-variation-settings` inherits and beats `font-weight`.** It was set
  on `.bk` as `"wdth" 100, "wght" 400` — harmless-looking, since that is
  Archivo's default instance — and it silently pinned every descendant to
  weight 400: every `<strong>`, every 500-weight price, every selected chip.
  Confirmed in the browser, not guessed. It is gone from `.bk`; the roles
  that need an axis set both explicitly. **2.2 and 2.3 must not re-add it to
  a root element.**
- **The price bar intermittently failed to paint at all** — the whole strip,
  CTA included — while the DOM reported it present at the right rect. It was
  `backdrop-filter: blur(16px)` on a fixed bar sitting over the fixed
  `mix-blend-mode: overlay` grain layer; removing the filter fixed it every
  time. The bar is now solid `--bk-bg`. Whether or not that reproduces on a
  phone, the primary control on a customer-facing page does not ship on a
  compositing trick, and translucency at 88% bought almost nothing.

### Mechanics deliberately not carried, per law 3

- **The drifting dot lattice.** It is a landing-page mechanic: there the
  ground is mostly empty and the lattice is what makes it a surface rather
  than a colour. Here the ground is never empty — a ruled list, a
  seven-column calendar and a slot grid sit on it — and a 46px lattice behind
  a seven-column grid reads as moire. Law 2 is carried by the drifting light,
  which is the layer above it in the system's own order of cost.
- **The pointer light and the buttons' radial sheen.** Both need a rAF
  pointer listener and both are fine-pointer-only; this is the most
  phone-first surface in the product. The hover lift stays.
- **No `--t-exit` token.** Nothing on this page animates out — a step's
  content unmounts when the step changes, and holding the old step mounted so
  it could leave is real machinery for a transition nobody watches.

The one orchestrated moment is the step's staggered rise: `bk-rise`, keyed on
the step index in `BookingPage.jsx` so React hands back a fresh element and
the CSS animation re-runs. No observer, no rAF, nothing to fail. The wrapper
is `display: contents`, so it changes the motion and nothing about the layout.
Verified with every animation and transition force-disabled: the page reads
completely, so nothing is hidden behind an animation.

### Smaller fixes made on the way, all found by looking

- **The masthead and the price bar sat 16px left of every card edge** at 768
  and up: `.bk-wrap`'s `max-width` included its own padding and the two
  `.inner` elements' did not. One `--bk-col` token now defines the content
  width for all three.
- `.bk-grid2` (the phone/email pair in `StepDetails`) was **used in JSX and
  never defined in CSS** — the fields had been stacking at every width.
- The month header was an `<h2>` at the same size and weight as the step's
  own question two lines above it, and being centred it won. Demoted.
- The calendar's month nav, weekday row and grid are now one `.bk-cal-block`,
  for the same reason `.bk-step-head` exists — the wrap's 26px flex gap was
  opening voids inside what is one control.
- `.cell.today` was styled and commented in the old CSS but **no code ever
  set the class**. Now set, and scoped `:not(.closed)` so a ring never
  appears on a day that cannot be booked.
- A disabled primary button was the accent at 38% opacity, which kept enough
  presence to read as pressable while its dark ink faded into it. Disabled
  primaries go neutral, so the accent only appears when the action is live.
- Money in `BookingConfirmed` and `ManageBookingPage` was a plain `<strong>`,
  not `.bk-price` — law 8 says every figure is monospaced.
- `ManageBookingPage`'s destructive buttons set `borderColor` inline, dead
  since buttons now ring with `box-shadow`; converted.
- Six dead classes and three unused tokens deleted.

### A screenshot trap, so the next session does not chase it

**In the in-app browser pane, a screenshot of a SCROLLED page paints every
`position: fixed` element offset downward by exactly `scrollY`.** It looks
like a hard seam across the page and like the price bar has vanished. It is
the capture path, not the CSS: a plain magenta fixed `div` with no animation,
blend or `will-change` reproduces it exactly, while `getBoundingClientRect()`
reports the correct viewport rect for all of them. Judge fixed elements from
an unscrolled capture. (This is separate from the `backdrop-filter` bar
above, which was real and is fixed.)

Also: while the pane is hidden, CSS animations are throttled, so a screenshot
taken shortly after a step change catches the reveal mid-flight and reads as
"the content is invisible". Front the tab, or finish the finite animations
first via `document.getAnimations()`.

### What 2.1 leaves open

1. ~~**The system has no error colour.**~~ **Closed in this session** — see
   above. `--bad: #E2705F` is in the system file and enforced.
2. **`?lite=1` does not exist in `app/`.** The reference page has `.lite` on
   its root; the shipped app has never implemented that flag, on any page.
   `prefers-reduced-motion` IS handled here and was verified. The flag is a
   Phase 2 gap, not a 2.1 gap — raise it in 2.2, which is the page the
   reference was actually built as.
3. **`index.html` requests five font families**, not two: Archivo and
   JetBrains Mono for this page, plus Anybody / Public Sans / DM Mono, which
   the landing page and the dashboard still ship. It drops back to two when
   2.2 and 2.3 land. Stated in the file itself so it is not mistaken for the
   intended state.
4. **`<meta name="theme-color">` is still `#0F1012`**, the outgoing
   dashboard ground, against this page's `#0B0D0E`. One shared tag, one
   value, four units apart — invisible in practice. It moves in 2.3.
5. **The Review step prints "Estimated total" twice** — once at the foot of
   the receipt, once in the price bar directly below it, which is visible
   together on a desktop. **Looked at and deliberately kept, not left open:**
   a receipt that does not foot to a total is not a receipt, and a running
   total that disappears on the last step is worse than one that repeats. The
   two only coincide on one step at one width. Noted so a later pass does not
   "fix" it by deleting the wrong one.

### What was actually looked at

Every one of the six steps, the confirmation screen, the receipt/manage page
including its reschedule and cancel-confirm states, the not-found screen and
a forced error block — at **392, 768, 1440 and 1920** — across three real
demo tenants chosen for their differences: `demo-detail` (four services in
four groups, both service modes, sky `#0EA5E9`), `demo-riverside` (**two**
services, no groups, mobile-only, travel fee, site discount, crimson
`#DC2626` — the empty-state case the roadmap names), and `demo-ironclad`
(seven services in three groups, drop-off only, forest `#059669`). A real
booking was created end to end and then opened on its own receipt page.
Console clean at every width apart from two pre-existing React Router v7
future-flag warnings. `composition` 22/22, `design-contrast` all pairs,
`landing-pricing` 18/18, `route-contract` 18/18.
