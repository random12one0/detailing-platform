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

- **`docs/dashboard-spec.md` still isn't in the repo.** It was said to exist
  now, but it is not on this branch, not on `main`, not on any other remote
  branch, and not anywhere on disk. The gap report was therefore not
  possible; ask for the file (or paste its contents) and it can be done
  immediately.

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
