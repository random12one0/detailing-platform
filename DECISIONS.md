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
