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
