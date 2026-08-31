# Decisions Log

Judgment calls made while working autonomously, per the Phase 2 brief —
each picked as the option easiest to change later.

<!-- INDEX:START — checked by `node scripts/decisions-index.mjs`. Add a section
     to this file and add its line here, or that check fails the build. Find
     things by HEADING TEXT, not by line number: headings are stable, line
     numbers move every time anyone appends. -->

## Read this before you go digging

**This file is over 3,600 lines and nobody reads it end to end — including the
agent that wrote most of it.** That is the problem this index exists to fix.
Do not read the whole file. Find the two or three sections that touch what you
are about to change, read *those* in full, and move on. A decision you did not
find is worse than one that was never written down, because it looks like
diligence.

### The five that have actually cost sessions

Each one is a mistake this project has already paid for, and the first three
were made more than once.

1. **A tint of the accent is a ground.** The tenant's colour has been
   corrected against the wrong background *three separate times* — roadmap
   2.3, 2.4 and 2.6 — and the error is identical every time: the ground was
   named from the stylesheet's surface tokens, while the value was actually
   landing on something built out of the accent. Before touching any colour
   read *Roadmap 2.4*, *Roadmap 2.3, reopened* and *Roadmap 2.6*, then run
   `node scripts/accent-sweep.mjs`.
2. **Verify by looking, in a real browser, at his widths.** Two sections exist
   only because a bug survived code review and screenshots taken at the wrong
   size — *Test at HIS screen size, not yours* and *He asked whether we
   actually look at the screens*. 1920 is his monitor, 392 is his phone, and
   `node scripts/sweep-widths.mjs` is the automated half.
3. **A skipped check reads exactly like a passing one.** Five contrast rows
   guarded by an always-false `if` "passed" for weeks by doing nothing. See
   *A skipped check reads exactly like a passing one* and *Baseline a new
   check against the last known-good version*.
4. **Never measure a transformed element with `getBoundingClientRect`.** This
   design animates by transform almost everywhere, so a rect is a scaled box,
   not a layout box. Design-system law 12, and it came from a real bug.
5. **The owner has already decided a great deal — do not re-propose it.** See
   *Owner decisions*, *The owner's answers of 2026-08-30* and *The owner
   walked the whole product*. Re-opening a settled call wastes his time and
   reads as not having done the reading.

### If you are about to touch this, read these

| About to touch | Sections to read |
|---|---|
| **Any colour, accent or contrast** | Roadmap 2.4 · Roadmap 2.3, reopened · Roadmap 2.6 · ANSWERED: the dashboard DOES take the tenant's colour · The new design system |
| **The customer booking page `/book/:slug`** | Roadmap 2.1 · The customer booking page is dark · Roadmap 2.6 · Roadmap 2.7 · Roadmap 2.8b · Roadmap 2.4, the last piece |
| **The dashboard `/app`** | Roadmap 2.3 · Roadmap 2.3, reopened · Roadmap 2.6 · Roadmap 2.7 · Roadmap 2.8b · Phase 2 · Phase 2 follow-ups |
| **The marketing page `/`** | Roadmap 2.2 · Positioning: what we sell is the pair · Building 1.4 · Building the marketing rewrite · Cutting a section · His four instructions on the rewrite |
| **Anything animated** | Ease the beat, not the hold · The load-in animation is too slow · Roadmap 2.3, reopened · Roadmap 1.3, the rebuild |
| **Spacing, layout, or anything at phone width** | Roadmap 2.6 · Test at HIS screen size, not yours |
| **A test, a check, or a measuring script** | A skipped check reads exactly like a passing one · Baseline a new check against the last known-good version · Never measure a transformed element with getBoundingClientRect |
| **`main`, deploying or publishing** | The owner put the redesign on `main` and published it · ANSWERED: Netlify does auto-publish `main` |
| **Keys, RLS, the public repo, or the live business** | Phase 0 — 0.4 deployment sanity · Abuse check on the live project · Roadmap 0.1 cleanup · A guessable demo login |
| **Email or reminders** | Phase 0 — 0.2 email · Test deployment and later fixes |
| **Signup or a new tenant's first run** | Signup · Phase 2 follow-ups |
| **The design system itself** | The new design system · Roadmap 1.3, the rebuild · Phase 1 — reference analysis · Design system (August 2026), for history only |
| **Anything he may already have ruled on** | Owner decisions · The owner's answers of 2026-08-30 · The owner walked the whole product · Removed on purpose · Four threads from the owner before clearing |

### Everything in here, oldest first

**Phase 2 and earlier — the original build**

- **Phase 2** — the first batch: no dashboard spec existed, overlap edits became hard rejections, vehicle pricing moved per-service.
- **Phase 2 follow-ups** — the spec turned up; the missing `.ics` file, theming, staff accounts.
- **Test deployment and later fixes** — the private Netlify test site, and what it is and is not for.
- **Design system (August 2026)** — the OLD system, "Raking Light". Anti-reference only; it was replaced in 1.5. Read *The new design system* instead unless you want the history.
- **Signup (August 2026)** — two screens, not a wizard, and what `create-business` seeds so a new booking page works immediately.
- **Removed on purpose** — features cut from the old site. **Superseded by the next entry**: he wants them all back.
- **Owner decisions (2026-08-28)** — he reversed those removals. Full parity with the old business, rebuilt as per-tenant features.

**Phase 0 — plumbing, security, email**

- **Roadmap 0.1 cleanup** — the old project was never opened to anonymous writes; proven with read-only queries, not assumed.
- **Phase 0 — 0.2 email** — root cause: the from-address was Resend's shared sandbox sender, deliverable only to the account owner. No code was at fault.
- **Phase 0 — 0.4 deployment sanity + a security finding** — **the repo is PUBLIC and a live service-role key sits in its history.** Still open; he will rotate when the build work settles.
- **Abuse check on the live project** — was that key ever used? No sign of it, proven read-only without ever presenting the key to anything.

**Phase 1 — choosing the look**

- **Phase 1 — 1.1/1.2 the design brief** — built the instrument and asked the questions; nothing visual was invented ahead of him.
- **Phase 1 — 1.2 answered** — he declined every defect offered. B3 reframed the whole brief.
- **Phase 1 — Part C answered** — he refused to rank the screens ("I do want all of them") and gave an expressiveness budget instead.
- **Phase 1 — reference analysis** — seven sites read at code level. `TASTE-NOTES.md` is his own words on how pages MOVE and is the primary evidence.
- **Four threads from the owner before clearing** — the Apple framing was wrong, and the correction is load-bearing.
- **Phase 1.3 — four directions** — Apple read at code level first; four directions built, all rejected.
- **Roadmap 1.3, the rebuild — direction 5, "The Thread"** — the direction that won, and why split-stage was killed.
- **Ease the beat, not the hold** — distribution across a scroll must be linear; the easing belongs inside each beat.
- **Never measure a transformed element with getBoundingClientRect** — design-system law 12, from a real bug.
- **Test at HIS screen size, not yours** — a rail with 40px of travel on his 1920 monitor. A process lesson worth more than its fix.
- **"Something feels a little missing" — the likely answer** — he was right: the page has no proof on it, and there is none to invent.
- **Removing the owner section** — and why its word-brightening mechanic was deliberately not re-homed.
- **His four instructions on the rewrite** — including which table row is ours rather than the deck's.
- **Building the marketing rewrite** — what was mine versus his approved deck, and one pre-ship blocker.
- **The owner's review of the repointed page** — the iPhone check passed; four decisions, all his.
- **Building 1.4** — the judgment calls made while turning the positioning into a page.
- **Positioning: what we sell is the pair** — **read the correction at the end of that section first;** he amended the framing the same day.
- **Cutting a section** — measure what the length is actually made of before choosing what to cut.
- **Baseline a new check against the last known-good version** — a checker that fails a known-good build is measuring the wrong thing.
- **The new design system** — roadmap 1.5. "The Thread" is law, and the reference page outranks the document.
- **A skipped check reads exactly like a passing one** — five contrast rows silently did nothing for weeks.
- **The owner's answers of 2026-08-30** — 1.4 approved, and no light theme.

**Phase 2 — applying the look**

- **The customer booking page is dark** — asked separately from the dashboard, and decided on positioning rather than taste.
- **Roadmap 2.1** — the booking page restyled. The first surface in `app/` to carry the system.
- **Roadmap 2.2** — the landing page ported. A transplant of the approved rendering, not an interpretation.
- **The owner put the redesign on `main` and published it** — his instruction, overriding the standing rule for that one action.
- **ANSWERED: Netlify does auto-publish `main`** — settled by pushing it and watching the live site change. **A push to `main` IS a publish.**
- **Roadmap 2.3** — the dashboard restyled, and the four things it deleted. The one surface with no reference page to copy.
- **ANSWERED: the dashboard DOES take the tenant's colour** — the opposite of the way 2.3 had built it.
- **The load-in animation is too slow** — a precise report from him: the ground was fine, the panels were not.
- **A guessable demo login, on purpose and temporarily** — and why removing the sign-in page would achieve nothing.
- **He asked whether we actually look at the screens** — yes, and it is a standing expectation, not a one-off question.
- **Roadmap 2.3, reopened** — three things he sent back. The three defects found on the way are the part worth reading.
- **The owner walked the whole product** — twenty-seven items and two decisions; his verdict on the design was positive.
- **Roadmap 2.4** — making almost any colour work everywhere. **Law 11b was born here: the accent is identity, never meaning.**
- **Roadmap 2.4, the last piece** — the manage page drew four identical pills and had no first thing.
- **Roadmap 2.6** — the clipping and spacing half of the walkthrough, plus design-system law 15 and a third accent-ground fix.
- **DECISIONS.md got an index** — why this file has a map, why the hooks are hand-written, and why nothing was deleted.
- **Roadmap 2.7** — the features half of the walkthrough. W16 got an instrument, W1 was not where the roadmap pointed, and W4 turned out to be a live hole rather than a feature.
- **Roadmap 2.8** — how other detailers actually work. **Two of the five open items needed no migration at all, and the owner's W22 premise turned out backwards.**
- **Roadmap 2.8b** — building the five. **Step 1’s tightest screen is 1440x900, not the phone, and the vehicle-size ceiling is four rather than six.**
- **The owner asked whether the categories were actually researched** — they were, and he found a hole: a complete package and its own components in different categories can both be booked. **$1,645 for $625 of work, reproduced.**
- **The owner's answers to 2.8, and the one that overruled the research** — he was the sixth menu shape. **Five menus rule shapes IN; they cannot rule the rest OUT.** Carries the measured step-1 ceiling: his own menu overflows by 119px.

<!-- INDEX:END -->

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

## Roadmap 2.2 — the landing page ported, and what the port had to change (2026-08-30)

The reference rendering `docs/design-directions/5-the-thread.html` **is** this
page — the owner approved it as this page over fifteen rounds of corrections —
so this was a transplant, not an interpretation. Its markup became
`app/src/landing/LandingPage.jsx`, its stylesheet became
`app/src/landing/landing.css` scoped under `.ld`, and its script became
`app/src/landing/thread.js`. The old `motion.jsx` is gone; so is
`app/public/img/booking-page-example.png`, which existed only for the section
the new page replaces.

**The port is faithful by measurement.** The page comes out at **10.41 screens
at 1920, 11.26 at 1440 and 14.14 on a phone** — the same three numbers the
approved page measured. Nine sections, nine skeletons, and every mechanic: the
message-to-row transfer, the pinned hold that prints its own cost, the two
light bands, the wipe on the comparison table, the count-ups, the rotating
tail, the weighted scroll, the pointer light, the parallax, the tilt, the
native disclosures.

### The four things the port had to decide, and why

1. **The tokens live under `.ld`, not on `:root`.** The system file said Phase
   2 would move them into `theme.css` unchanged. It cannot yet: `theme.css`
   puts its tokens on `:root` and `:root` still flips with the dashboard's
   light/dark switch until 2.3 removes it, so a prospect would inherit
   whatever the last dashboard user picked on that device. Same reason 2.1
   scoped the booking page under `.bk`. **The system file was corrected rather
   than the code contorted** — `docs/design-system.md` § Tokens now says where
   the values actually live and flags the one-`:root` question for 2.3.
   Unlike the booking page these keep the system's own names (`--ink-0`,
   `--fog`, `--ac`): nothing is injected per tenant here, so there is nothing
   to prefix around, and identical names keep a diff against the reference
   readable.

2. **Nine class names were renamed, and this is the one thing a later reader
   will not guess.** `theme.css` is global and loads first; its class rules
   apply inside `.ld` for every property the landing rules do not themselves
   declare. Nine names collided, and two were live bugs on the first render:
   `.btn` carries `width:100%` for the phone-first dashboard, which stretched
   the nav's pill across the whole bar, and `.lit` carries an `::after`
   gradient and a 3px accent bar that would have been drawn over the hero
   card. So the landing page uses `.cta`, `.litcard`, `.getsheet`, `.ruled`,
   `.tile`, `.fig`, `.pip`, `.substack` and `.softlink`. The ninth,
   `.quiet` → `.softlink`, was harmless on specificity today and was renamed
   anyway: "harmless today" is the reasoning the other eight exist to stop
   having to do.

   **The rule the renames leave behind, written into `landing.css`'s
   header:** no selector in `theme.css` may be able to match an element on
   this page. Seven names are still shared — `sm`, `wrap`, `block`, `on`,
   `nm`, `n`, `lead` — and each is safe because `theme.css` only ever uses
   it in a compound anchored on something it owns (`.btn.sm`, `.dot.block`,
   `.figure.lead`, `.cal-cell .n`, `.settled-row .nm`). The header carries
   the one-line grep that checks a new name. It is documented rather than
   tested because the precise invariant is "no theme rule can reach in",
   and a naive same-name test would fail on all seven of those and be
   ignored within a week.

   The alternative was a block of "un-declare what leaked" rules. It was
   rejected because it can only ever list the leaks somebody thought of, and
   because `theme.css` still has `[data-theme="light"]` blocks that could
   redefine any of those names later — a landing page whose card lightens
   because of a dashboard preference is precisely what the `.ld` scope
   exists to prevent. Renaming ends the whole class of bug instead of
   patching today's instances. It costs a slightly less literal diff against
   the reference, which is why it is written down here.

3. **`overflow-x` is `clip`, not `hidden`.** The reference sets it on `<body>`,
   where the viewport is the scroll container and `position:sticky` keeps
   working. On a scoped `<div>`, `hidden` would make `.ld` its own scroll
   container and the pinned thread section would stop sticking. `clip` cuts
   the overhang — the lit comparison row's negative margins — without creating
   one.

4. **The bubble container is built in JavaScript, not rendered by React.** The
   thread is re-parented between the left column and the dashboard as the
   layout crosses 820px. React must never be asked to remove a node that has
   been moved out from under it, so `#thread` is created in `thread.js` and
   only React-created hosts are ever handed back. The job rows go into a
   container React renders once and never re-renders. Verified against
   StrictMode's deliberate double-mount: four bubbles, four rows, one thread.

### `?lite=1` — built, and it took a rule with it

It now lives in `app/src/main.jsx`, at the app root, before React renders, so
the class is on `<html>` for the first paint. `?lite=1` and
`prefers-reduced-motion` both route into it — the system's single-code-path
rule. **`booking.css`'s own `@media (prefers-reduced-motion)` block was
swapped for `.lite` in the same session**, because leaving it would have been
exactly the second implementation that rule forbids, and it would have been
the one that rots: `?lite=1` never reached the booking page before today.
Nothing is lost by the swap — both pages are React, so a visitor with no
JavaScript has no page either way. Confirmed: `?lite=1` on `/book/:slug` now
gives `animation-duration: 1e-05s` and the step still reads.

### The font claim in the roadmap was wrong, and no family could be dropped

Roadmap 2.2 said to "drop the three this item stops using". It assumed the
landing page and the dashboard each owned a share of Anybody / Public Sans /
DM Mono. They do not: `app/src/theme.css` uses **all three** on its own, in
`--f-display` / `--f-body` / `--f-num`. Restyling the landing page therefore
freed none of them, and removing any would have left the dashboard in a
fallback face. All three go together in 2.3, and `app/index.html` drops from
five families to two in one edit. Corrected in the roadmap, in 2.3's own
entry, and in `index.html`'s comment so it is not re-derived.

### What was measured, not eyeballed

- **Text on the photograph (law 9).** The tenant-site mock puts a name and a
  tagline on a real photo, so CSS cannot answer it. The text boxes were
  screenshotted with the words hidden and the lightest painted pixel read
  back through a canvas: at **1440** the headline sits on `#36383a` and
  measures **10.41:1**, the sub-line on `#16191b` at **12.74:1**; at **392**
  they are **9.24:1** and **12.61:1**. The floor for the headline is 3:1
  (large bold) and for the sub-line 4.5:1.
  **A wrong first measurement is worth recording**, because the next person
  will make it: measuring the text BLOCK's box returns 1.34:1, because that
  box includes 34px of padding above the words where the scrim's gradient is
  still transparent. Measure the words' own boxes, and hide the words rather
  than the block — the scrim on the block is the thing doing the work.
- **The reveal sweep, down and back up**, at 1440 and 392, stopping every
  viewport height: **nothing readable was ever left hidden**, and 720 (1440)
  and 891 (392) elements were still hidden below the arrival line across the
  walk, which is the proof the reveal was not simply switched off. The
  criterion is "top above 82% of the screen", not "fully on screen" — an
  element sitting in the bottom 18% has not been reached yet and is supposed
  to be hidden. Checking it the other way produces false alarms.
- **The FAQ's height change re-caches positions (law 5).** Every question was
  toggled, the page grew, and the footer and the last terms still arrived
  correctly at the bottom.
- The photo ships as `app/public/img/tenant-site-hero.jpg` (41 KB, 840x270,
  Unsplash / Deniz Demirci / `dlJelFmdpOc`) rather than the reference's
  inline data URI. Same bytes; the data URI existed only because the artifact
  host's CSP blocks external images, and a real deploy would rather cache the
  file than inline it into the JS bundle.

### The tests that grew, and why each one had to

- **`landing-pricing`**: its "no hardcoded prices" slice ran from the pricing
  section to the end of the file, which now includes the questions — and one
  answer says "a $600 coating costs you the same as a $65 wash". Those are a
  DETAILER's job prices, the same kind of illustrative figure the hero's demo
  card carries, not ours. The slice is bounded at the FAQ rather than the copy
  reworded to satisfy a test aimed at something else. It also now allows two
  struck list prices, because the founding offer discounts the build fee AND
  the monthly and the approved page strikes both. 18/18.
- **`design-contrast`**: the "outgoing: landing" block read `--g` / `--p`,
  which no longer exist, so every row would have printed `skip` and the page
  would have had no coverage again — the exact hole found in 1.5. Replaced
  with the real pairs, plus a token-drift check that pins `landing.css`'s
  thirteen values against the system's. The booking and landing blocks were
  also lifted OUT of the `if (SOURCE !== APP)` guard they sat inside: that
  guard is about the OUTGOING dashboard palettes, and when 2.3 makes
  `theme.css` define `--ink-0` it would have silently switched off the
  coverage for two restyled surfaces.
- **`composition`**: the two-face rule now runs against `landing.css` and
  `booking.css`, not only the reference page — this is the file's own "as
  Phase 2 lands, REFERENCE grows to include the app's own stylesheet" note,
  honoured one surface at a time. A stack can be written inline or held in a
  token, so the check matches on the quoted family name rather than on the
  property. 24 checks now, all passing.

### What 2.2 leaves open

1. **`<meta name="theme-color">` is still `#0F1012`**, the outgoing dashboard
   ground, where two of the three surfaces now paint `#0B0D0E`. Four units
   apart and invisible in practice. It moves in 2.3, which is the item that
   owns the last surface still using that value.
2. **Three font families are still requested and still needed.** See above —
   they leave with `theme.css` in 2.3, together.
3. **Mid-range Android is still unmeasured.** This page is the heaviest thing
   the product renders: a pinned scrub, a backdrop-filter, a grain layer and
   two drifting lights. Nothing uses WebGL and every scrub writes one CSS
   variable per frame, so the risk is low, but nobody has put a thumb on a
   cheap Android. The system names an fps governor as the thing to add when
   something measured drops frames — measured, not assumed.
4. **The nav's "Sign in" and every call to action are full page loads**, not
   router navigations: they are plain `<a href="/app">`, as they were before
   this item. That is deliberate — the dashboard is a different context and
   the landing page tears its motion down cleanly either way — but it means
   the SPA-unmount path is defensive rather than exercised. StrictMode's
   double-mount is what proves it works today.

### What was actually looked at

The whole page walked in viewport-sized steps at **1920, 1440, 768 and 392**,
in the normal path and at `?lite=1`, down and back up; the console read at
every width in both paths (clean apart from the two pre-existing React Router
v7 future-flag warnings); the booking page re-checked at 392 and 1440 to
confirm 2.1's surface was not disturbed; the dashboard loaded, with and
without `?lite=1`. `composition` 24/24, `design-contrast` all pairs,
`landing-pricing` 18/18, `route-contract` 18/18.

## The owner put the redesign on `main` and published it (2026-08-30)

**His instruction, in full: "put it on main and git."** Said immediately after
being shown what each half meant and being recommended to do only the first.
He chose both. This overrides the standing ground rule in `CLAUDE.md` — "NEVER
commit or merge to `main`" — for this action; that rule is his, and so is the
override.

### What he was told before he decided

He asked why detailingplatform.com and GitHub did not look like the page on
`localhost:5173`. The answer was three copies at three different dates:

| Where | State before this |
|---|---|
| this machine | everything, through roadmap 2.2 |
| GitHub, branch `claude/superbase-access-anj1h7` | last pushed **2026-08-28** — 62 commits behind |
| GitHub `main` → detailingplatform.com | `30ae438`, also 2026-08-28 — the OLD landing page |

Confirmed by loading the live site, not inferred: it served the pre-redesign
page, blue accent and all ("Not a page builder. Not a directory listing.").

Two separate things were put to him, with a different recommendation on each:

1. **Push the branch** — a backup, invisible to the public. Recommended,
   because five sessions of work existed on one computer only and a disk
   failure would have taken all of it. The 62 commits were scanned for
   credentials first; the only matches were old audit documents *describing* a
   vulnerability, and those were being deleted rather than added.
2. **Merge to `main`** — publishes to the public site. **Recommended
   against, for now**, on two grounds he has therefore accepted by
   proceeding:
   - **The dashboard is still the old look.** Roadmap 2.3 has not run. A
     visitor meets the new marketing page, presses "Get started", and lands in
     an app that looks like a different product.
   - **Billing charges nobody.** "Take a founding spot" leads to a signup that
     cannot take money.

   Neither is a defect in what shipped; both are consequences of publishing
   mid-phase, which is his call to make.

### What was done

Branch pushed first, then `main` fast-forwarded to it (63 commits, no merge
commit — `main` had nothing the branch did not) and pushed. All four
credential-free suites were re-run immediately before: composition 24/24,
design-contrast all pairs, landing-pricing 18/18, route-contract 18/18. The
session then switched back to the working branch, so `main` is not where the
next item is built.

### The rule, as it now stands

`main` is still production and the default is still to work on the branch and
leave it alone. What has changed is only that it is no longer 63 commits
behind: `main`, the branch and this machine are the same commit. **Do not
merge to `main` on your own initiative — ask.** He can say yes, as he did
here, and that is the whole mechanism.

### This also answered the deploy question the roadmap has carried since 0.1

`docs/HANDOFF.md` said Netlify auto-publishes `main`; an older DECISIONS note
said deploys were manual uploads, and PROJECT-STATE listed the disagreement as
unresolved. Pushing `main` settled it by observation — see the note recorded
immediately below this section.

## ANSWERED: Netlify does auto-publish `main` (2026-08-30)

Open since roadmap 0.1 and listed in PROJECT-STATE §6 under "what I don't
understand": `docs/HANDOFF.md` said Netlify auto-publishes `main`, an older
DECISIONS note said deploys were manual uploads, and nobody had tested it.

**Settled by observation.** `main` was pushed to GitHub and nothing else was
done — no upload, no dashboard visit, no CLI. The live site rebuilt and
republished on its own within a few minutes. HANDOFF was right; the manual-
upload note is history.

**So the operational fact is: a push to `main` is a publish.** There is no
second step to forget and no second step to protect you. That is why the
default stays "work on the branch and ask before merging".

### The live site was then verified, not assumed

Checked against the deployed production build, which is minified and does not
run React's development double-mount, so it is not the same artifact that was
tested locally:

- **1920, 1440, 768 and 392**: page heights 11243 / 10130 / 11809 / 11938 —
  identical to the local build and to the approved reference page.
- Four message bubbles, four job rows, one thread at every width — the
  script's mount is correct without StrictMode to shake it out.
- Archivo resolving as the display face; prices settling on `$499` and `$35`
  from `pricing.js`; the founding badge reading `3 of 3 left` from the
  database.
- **No console errors and no HTTP response >= 400 at any width.**
- `?lite=1` on the live site: class set, tiles read `4/$520`, nothing hidden.
- **The tenant-site photograph loads: 200, `image/jpeg`, 41,478 bytes,
  natural size 840x270.** Worth recording how this looked wrong first: at
  scroll 0 it reports `naturalWidth 0`, because it is `loading="lazy"` and
  sits six screens down. That is the attribute working, not a broken path —
  scroll to it and it fetches. Do not "fix" a 0x0 lazy image that has never
  been scrolled to.

## Roadmap 2.3 — the dashboard restyled, and the four things it deleted (2026-08-30)

The last surface. 2.1 and 2.2 both had the approved rendering
`docs/design-directions/5-the-thread.html` to copy from; **the dashboard had
no reference page and no worked skeleton**, which `docs/design-system.md`
said plainly was where the system would actually be tested. The plan was
written before any code, in `docs/dashboard-skeletons.md`, and that is the
file to read before changing a shape in `app/src/theme.css`.

### What the dashboard IS, in the system's terms

The landing page's idea is that a detailer's Saturday already exists,
scattered, and the product sorts it; its signature move is four text messages
resolving into four rows of a schedule. **The dashboard is what they resolve
into** — the far end of the same thread. Two things follow. It is the
destination, not a second marketing page, so it is quieter and denser with no
scroll choreography. And the green keeps its meaning without needing a new
one: on the landing page it marks a booking arriving, here it marks a job
finished and paid.

**The signature move is the thread, drawn.** Today's jobs hang off one
continuous hairline with a node each — hollow while the job is ahead, a solid
`--ac` disc once it has landed. It is the only rail in the product, it cost a
wrapper class and two pseudo-elements, and it is what makes Today
unmistakable at a glance. Tomorrow is deliberately NOT on it: the point of
the rail is that the day ends.

### The five skeletons (law 1)

Today the only **rail**, Calendar the only **grid**, Money the only **chart**,
Clients the only screen with **no panel on it**, More the only screen **made
of panels**. Each shape follows from what the screen holds rather than being
applied to it.

**The eleven settings screens share one skeleton on purpose** — a form in a
sheet. They are modal panels reached one at a time and a person never sees
two of them together; law 1 governs what is on screen at once. What varies
between them is internal structure, which follows their content.

### The class API was kept, and that was the biggest single decision

`theme.css` was rewritten end to end, but **every class name in it stayed**.
Thirty components and roughly three hundred call sites read `--surface`,
`--text-muted`, `.card`, `.chip`, `.label`; renaming them to the system's own
token names would have produced a several-thousand-line diff that changed no
pixel and buried the ones that mattered. So the sixteen system tokens are
defined on `:root` under their own names, and a short ROLES block maps the old
names onto them. That block is now the only place in the app where a role and
a colour value meet.

### Four deletions, each because the system has fewer things than the old one

1. **`.stripe` is gone.** The roadmap handed it forward undecided — *"probably
   keep the job it does; the shape is 2.3's call."* Looked at: its one
   remaining use was `Money.jsx`'s waiting-on-payment list, where it sat
   **inside a `.card`**, so it was literally "an accent bar on a rounded
   card", a named never-default — and where every row has the same status, so
   the colour it carried was information nobody needed. Its real job,
   status-without-reading on Today, is done better by the thread node.

2. **`--success` and `--warning` are gone.** The system has one accent and one
   warm value and says so twice; a second green beside `--ac` and an amber
   beside it is a four-hue palette, which is the "timid, evenly distributed"
   failure `design-knowledge.md` §1 names. **The five booking statuses are
   carried by two hues and three shapes instead**: confirmed is a hollow
   `--bone-2` ring (just what is next), completed/paid a solid `--ac` disc (it
   landed), pending a hollow `--fog` ring, cancelled a solid `--bad` disc, and
   no-show a hollow `--bad` ring — the same colour as cancelled with a
   different shape, because they are the same outcome reached two ways. The
   pill beside the mark still says the word, so colour is never alone. A
   blocked day on the calendar is a solid `--fog` disc: a day you marked off
   is a decision, not an error.

3. **`.warn-box` stopped being a warning.** Its one real use is *"N more
   finished jobs still need payment recorded"* — a thing to DO, not an error,
   and already a `<button>`. It is drawn as a control now: a panel, a
   `--line-2` edge, `--bone` text, the accent only on its marker.

4. **The light theme, and the tap-duration token.** The old file had a 90ms
   `--dur-tap` for press feedback. A press now scales with **no transition at
   all**, so contact is instant in both directions — better feedback than a
   fast transition was, and one fewer number to keep in step with the
   system's four.

### The light theme took five places, not the four that were scoped

`docs/design-system.md` listed `theme.css`, `lib/theme.js`,
`more/Appearance.jsx` and the per-user preference key. The fifth was
**`context/BusinessContext.jsx`**, which held the `themeMode` state and made
the `applyTheme` call — it is the thing that actually *set* `data-theme`, and
it was not on the list. Worth recording because the same shape of miss is
likely again: the file that *stores* a setting is easy to scope, the file that
*applies* it is the one that gets forgotten. There is no `data-theme` anywhere
in the product now, and `:root` carries `color-scheme: dark`, which is what
makes native controls, scrollbars and date pickers come back dark for free —
a win that only became available once there was one ground.

### The rule that fell out of looking: a fill is an action, a tint is a selection

Not planned; found in the screenshots. Hours renders **five** solid green day
chips beside a solid green "Apply to 5 days", and Calendar's History view
stacks **three** chiprows — a solid selection would have lit nine things on
one screen and made the accent the loudest thing on a settings form. So:

- **A solid accent fill means an action (`.btn.primary`), a fact (today's
  date disc, a switch that is on) or a job that has landed (a thread node).**
- **Anything merely SELECTED gets the tint** — `--ac` at 15%, an `--ac`
  border, `--accent-text` words. `.chip.active` and `.choice.on`.

It reads better, and it is the system's "one sharp accent used sparingly"
rather than a contradiction of it. A disabled `.btn.primary` also stopped
being the accent at 42% opacity, which on this ground is a muddy dark green
that reads as a *different colour* rather than as an unavailable one; it goes
neutral instead.

### The dashboard no longer takes the tenant's colour — law 11, and an unanswered question

`lib/theme.js` used to write the detailer's brand colour over `--accent` on
the dashboard root at every load. It does not any more. Law 11 says the house
accent is fixed and the tenant's is customer-facing only, and that is the
owner's own reasoning, recorded unprompted in `docs/design-brief.md` §B6b: a
detailer *"probably doesn't really care about the admin dashboard colour
scheme"*, the accent is about what their **customers** see.

**But that brief flagged it as an assumption and asked for it to be confirmed
"before 2.3", and it never was.** It is asked now rather than treated as
settled. Implemented the law's way in the meantime, because that is what is
written down; the change back is small if he wants it.

The screen carries the consequence honestly instead of hiding it.
"Appearance" is now **"Your colour"**, its More row reads *"Shown on your
booking page"*, and the screen shows a **live preview on the booking page's
own ground** — the corrected fill, the ink measured against that fill, and
the accent-as-words value, all from `brandVarsFor`, the same function the
booking page itself calls, so the preview cannot drift from the page. Without
it, picking a colour and seeing nothing change would read as broken.

The More row's swatch also shows the **corrected** colour now rather than the
raw hex out of the database: that row is a summary of a setting, and the
setting's effect is what the customer sees after correction.

### Found while verifying, and fixed: Promos crashed the whole app

`screens/more/Promos.jsx` used `<Segmented>` and never imported it. Opening
**Promo codes & sale** threw `ReferenceError: Segmented is not defined` and
took the app down. Pre-existing, nothing to do with the restyle, and it had
survived because **nobody had ever walked all eleven settings screens in a
browser** — which is exactly what this item's verification routine is for.

### Two other things the screenshots caught

- **A `.card` inside a `.sheet` did not lift.** Both are `--ink-2`, so every
  settings panel was reading as an outline rather than an object. One rule
  fixes it everywhere: `.sheet-body .card` takes `--surface-lit`. Inputs stay
  on `--ink-1`, so a form still sinks INTO a card that sits on a sheet —
  three levels, three values, in the order the eye expects. Catalog and Team
  additionally wrapped their cards in another `.card`, which no surface value
  can rescue; those wrappers became plain containers, and their card lists
  got a `.tight` so they stopped butting into one striped block.
- **The calendar left a third of the screen empty at 768 and 1440.** The "not
  enough content to fill the viewport" failure the system names, and it is
  worse on a wide screen, never better. Cells go from 56px to 88px at ≥700px,
  which fills it and makes a day a bigger tap target for the day sheet at the
  same time.

Clients also had **no masthead** — the only one of the five tabs with no
identity and no count, opening straight into a search field. It has one now,
and the count is the thing an owner actually wants from that tab at a glance.

### Where the tokens live now — the question 2.2 left for this item

All sixteen are on `:root` in **`app/src/theme.css`**.
`tests/design-contrast.test.mjs` was written to switch its source to that file
the moment it defines `--ink-0`, so it did, by itself, and the
outgoing-palette blocks stopped running.

**The other two scopes stay.** `.bk` and `.ld` were introduced because `:root`
flipped with the light/dark switch and a customer must not inherit a dashboard
preference. That reason is gone with the switch. Two that are not: each file
being self-contained is what makes it diffable against the reference
rendering, and `theme.css` is still a global sheet. `design-contrast` pins all
three sets against each other, so they cannot drift apart.

### The leak bit this session too, on the live marketing page

Not a theoretical risk. The day rail's first name was `.thread`, declared bare
in `theme.css`. **`landing.css` already owns `.thread`** — it is the class on
the messages-becoming-a-schedule element, the approved page's own signature
move. Because `theme.css` is global, that bare rule reached straight into it
and gave the marketing page a 26px left pad, a one-pixel rail and a seven-pixel
node on every child. Reproduced in the browser before touching anything
(`paddingLeft: "26px"`, `railWidth: "1px"`, a node `box-shadow` on the first
child), renamed to `.dayrail`, and re-checked: `paddingLeft: "0px"`,
`position: static`, `content: none` on both pseudo-elements.

**So the grep has become a test.** `tests/composition.test.mjs` now has a
check called *"theme.css cannot reach into a scoped sheet"*: it parses every
selector in `theme.css`, keeps the ones whose WHOLE form is a single class
(anything anchored on an ancestor or a second class cannot match over there),
and fails if `landing.css` or `booking.css` uses that name. `landing.css`'s
header has prescribed exactly this grep since 2.2 and nobody ran it — which is
the argument for a test rather than a note, and it is the standing rule in
that file: a test is for a rule that has already been broken by hand.

It immediately found a second one: **`booking.css` used `.line.muted`**, and
`theme.css` declares a bare `.muted`. That one was inert — the two font sizes
and the two greys happen to be the same values today, and every visible string
sits in a `<span>` the booking sheet colours itself — **which is exactly why it
would have stayed invisible until one of them changed.** Renamed to
`.line.dim`.

`.lite` is excluded from the check by name, and deliberately: it is the
app-wide degradation class, set on `<html>` in `main.jsx`, and reaching every
surface is its entire job.

### A note in `landing.css` was wrong, and 2.3 is where that shows

It said the nine class renames *"all goes away in roadmap 2.3, when theme.css
stops being the outgoing system."* **They do not.** The leak has nothing to do
with `theme.css` being the OLD system and everything to do with it being a
GLOBAL one, imported by `main.jsx` on every route. It was rewritten onto The
Thread and every bare selector in it still reaches into `.ld` and `.bk` for
any property those sheets do not declare themselves. The renames and the grep
in that header stay load-bearing. Scoping the sheet would mean putting a class
on the app shell, the auth screen, the invite page, the job page and the sheet
portal — a bigger and riskier change than the nine renames it would undo. Not
done, and not obviously worth doing; the header now says so, and so does
`theme.css`'s.

### What was verified, by looking

Signed in as the seeded demo owner against real data, through the real
sign-in form:

- **All five tabs at 1920 / 1440x900 / 768x1024 / 392x844**, full-page.
- **All eleven settings screens at all four widths** — 44 screenshots.
- **The whole set again with `?lite=1`**, which renders identically: nothing
  on this surface is hidden behind an animation, and only the ground's drift
  and the bars' arrival stop.
- **Console read at every width.** Clean apart from two React Router v7
  future-flag warnings that predate this work and are unrelated to it.
- **One unexplained thing, recorded rather than swept up:** a single HTTP 409
  appeared at 1920 during the FIRST settings sweep and never again — not in
  three later full sweeps, roughly a hundred and fifty more page loads. Every
  write on those screens is behind a Save button that nothing pressed, so the
  most likely explanation is a duplicate upsert racing the sheet's close. It
  is written down because "I saw it once and could not reproduce it" is the
  honest state, not because it is known to be a defect.
- **The two PUBLIC pages re-checked afterwards**, because the sheet that was
  rewritten is global and reaches both. The landing page measures
  **11243 / 10130 / 11809 / 11938** at the four widths — byte-for-byte the
  numbers DECISIONS.md records for the deployed production build in 2.2, so
  the rewrite moved nothing there. Console clean and no response ≥ 400 on
  either page.

The tenant-accent retint sweep is deliberately NOT part of this item: the
dashboard's palette is fixed now (law 11), so there is nothing here to
retint. That check belongs to the booking page and to 2.4.

**The demo business was re-seeded to do this** (`scripts/seed-demo.mjs`,
which deletes and recreates `demo-detail` on the PLATFORM project only), and
three of its bookings were shifted onto the current date so Today had a real
day on it rather than an empty state. The empty state was looked at too,
before the re-seed, and reads as calm rather than unfinished.

## ANSWERED: the dashboard DOES take the tenant's colour (2026-08-30)

The question roadmap 2.3 handed the owner, answered the same day, the
opposite way to how 2.3 built it.

**His words:** *"I think that we should have them be able to customize their
admin dashboard accent color, because I think that the majority of accent
colors will work. You know, I mean, it's just with black, so almost anything
goes with black or a darker colour."*

So a detailer picks one colour and it paints their booking page, their site
**and their own dashboard**. `docs/design-system.md` law 11 has been rewritten
to say so — the system file is updated first, never silent drift.

**Why the old reading existed, and why it was still right to ask.** It came
from his own earlier remark that a detailer *"probably doesn't really care
about the admin dashboard colour scheme"* (`docs/design-brief.md` §B6b),
which that file flagged as an assumption and told a later session to confirm
**before** 2.3. Nobody did. 2.3 implemented the written law, said plainly in
the handover that it had never been confirmed, and asked. That is the process
working: the assumption surfaced, got a real answer, and the answer cost one
conversation instead of a retrofit.

**His reasoning is sound and worth keeping.** A near-black ground is
forgiving: almost any hue clears contrast against `#0B0D0E` once
`lib/theme.js` has nudged its lightness. The old law's real argument was never
"it will look bad" — it was cost: every dashboard screen now has to survive an
arbitrary tenant colour, which `docs/design-knowledge.md` §4 calls the hardest
visual problem in the product, because the failures stay invisible until a
specific customer signs up. That cost is now accepted, and it is bounded by
two things that already exist: the curated four-to-six set (still unpicked),
and the correction in `lib/theme.js`.

**What has to be built is written out step by step in `docs/roadmap.md` under
2.3 (b)** — it is not started. The short version: `applyTheme` was deleted in
2.3 and needs an equivalent back; `BusinessContext` has to call it; and
`theme.css` writes `var(--ac)` directly in about thirty places that must
become `var(--accent)` or `var(--accent-text)` depending on whether the colour
is a FILL or is used AS WORDS. That distinction is law and it is the whole
reason there are two values — crimson `#DC2626` is a real preset and it passes
as a fill while failing as text on this ground.

**One thing that does NOT change:** `#38E08B` stays the house default — what a
business that has picked nothing gets, and what the marketing page uses. The
marketing page keeps reading `--ac` and must not be retinted.

## The load-in animation is too slow (2026-08-30)

**His words:** *"When the page loads, the page animations and loading, it's
perfect, but the GUIs just take a little too much time to, like, you know, go
up and do the load-in animation. So if you can make that just a little
speedier."*

Read carefully, because it is a precise report: **the ground and the page as a
whole are right; the ARRIVAL of the screen's elements is not.** So this is not
"turn the motion down" — law 3 says motion is not spendable — it is one
duration being wrong for this surface.

What he is feeling is `app/src/theme.css`'s `@keyframes arrive`: it runs for
`--t-reveal`, which is **950ms**, with a 55ms stagger up to 210ms, so the last
element on a screen settles roughly **1.16 seconds** after the screen appears.
`bar-rise` (the Money chart) and `sheet-in` (every settings panel) run at the
same 950ms.

950ms is the system's value and it was right where it came from: the marketing
page, where a reveal is tied to scrolling and the reader is travelling. A
dashboard screen is not travelled, it is opened — forty times a day — and
there the entrance should not be the slowest thing on it.

Not fixed yet. Roughly 380–450ms with a ~40ms stagger is the target, and the
system's own `--t-exit` is already 420ms. **Whatever value is chosen goes into
`docs/design-system.md` § Motion with its reason**, because law 4 forbids
ad-hoc durations and a number changed quietly in a stylesheet is exactly that.

## A guessable demo login, on purpose and temporarily (2026-08-30)

The owner tried to look at the dashboard on the live site and on his phone and
met a sign-in page. He asked either to remove the sign-in page for now, or for
a simple login he could type.

**Removing it is not an option that does anything**, and the reason is worth
writing down so it is not re-proposed: the dashboard shows one business's real
rows, and the database — not the app — decides who may read them. RLS is
FORCEd on every table. With no session there is no identity, so every query
returns zero rows; a dashboard with the sign-in page taken off is not an open
dashboard, it is an empty one. The sign-in page is not a gate in front of the
data, it is what makes the data exist.

**So: a simple login instead.** The seeded demo owner's password was changed
from `DemoDetail2026!` to **`demo123`**, and the staff account to
`staff123`. `scripts/seed-demo.mjs` was updated to match, so re-running the
seed no longer silently restores the long ones. Proven by signing in through
the real form at 392px.

    demo@detailplatform.com / demo123     (owner — sees everything)
    demo-staff@detailplatform.com / staff123   (staff — no Money tab)

**The blast radius, measured rather than assumed:** these reach the DEMO
business only. Tenant isolation is enforced in the database and
`tests/tenant-isolation.test.mjs` proves it, so the worst a stranger who
guesses one can do is scribble on fake data in `demo-detail`. That is
acceptable for a temporary testing login on a pre-revenue product and it is
not acceptable once there is a single real customer. **Change them before
then.** The note is also in `scripts/seed-demo.mjs` beside the values.

## He asked whether we actually look at the screens, and the answer is yes (2026-08-30)

*"You are screenshotting every single page and looking back on it, right?
Because that's a major thing — you guys are able to visualise it instead of
just looking at the code, that way you could fix any errors."*

Confirmed to him, and recorded here because it is a standing expectation
rather than something 2.3 happened to do. Every screen is opened in a real
browser and looked at, at **1920 / 1440x900 / 768x1024 / 392x844**, in the
normal path and `?lite=1`, with the console read at each width. 2.3 did that
for all five tabs and all eleven settings screens — 44 screenshots for the
settings sheets alone, then the whole set again in `.lite`.

It is not ceremony, and 2.3 is the evidence: **two real defects were found
that way and neither was findable by reading code.** The Promos screen crashed
the whole app on open — a missing import that had survived because nobody had
ever walked all eleven settings screens in a browser. And the day rail leaked
onto the LIVE marketing page, because the class name it was given belonged to
that page already.

`scripts/shoot-dashboard.mjs` exists so this is repeatable rather than
re-invented each time; it is documented in `docs/HANDOFF.md` §4b.

---

## Roadmap 2.3, reopened — the three things the owner sent back (2026-08-30)

He looked at the restyled dashboard and returned three items. All three are
now done. Three defects and one design-system contradiction were found on the
way, and those are the part worth reading.

### (a) The load-in was too slow — a tool's reveal is not a page's

*"the GUIs just take a little too much time to go up and do the load-in
animation. So if you can make that just a little speedier."*

`app/src/theme.css` now defines its own `--t-reveal: 420ms` and
`--t-exit: 180ms`, with the stagger down from 55ms to 40ms. **The last element
on a screen settles at 580ms, against 1160ms before** — measured in the
browser, not calculated. Written up in `docs/design-system.md` § Motion, "The
dashboard's own reveal", because law 4 says a duration choice goes into the
system with its reason and not into a stylesheet quietly.

**Why this is not a fifth duration.** Both numbers already exist in the
system — 420 is `--t-exit`, 180 is `--t-hover` — so nothing was invented, and
every surface already defines its own copy of these tokens (`landing.css`
under `.ld`, `booking.css` as `--bk-*`). The 950ms reveal is the LANDING
page's number and it is untouched there; verified by reading the computed
`--t-reveal` on `/` after the change (still 950ms). The curve is not
per-surface and never will be.

`--t-exit` had to come down with it, and that also fixed a pair that was
already inverted: the sheet backdrop faded IN at `--t-hover` (180ms) and OUT
at `--t-exit` (420ms), so leaving took longer than arriving.

### (b) The dashboard takes the tenant's accent — law 11, in code

`applyDashboardAccent()` is back in `app/src/lib/theme.js` (the old
`applyTheme` minus the `data-theme` half, which stays dead — there is one
ground). `BusinessContext` calls it on load, on every change to
`branding.primary_color`, and **with null on unmount**. Every one of the ~30
`var(--ac)` uses in `theme.css` became `var(--accent)`; `--ac` stays as the
house default that `--accent` falls back to, and the marketing page's `--ac`
was not touched.

**The 30-way fill-vs-text split the roadmap describes turned out to be "all
fills."** The 2.3 rewrite had already routed every *text* use through
`--accent-text`. Checked line by line rather than assumed.

**The unmount call is not tidiness.** `theme.css` is a GLOBAL sheet and
`landing.css` defines no `--accent*` of its own, so a colour left on `<html>`
would follow a signed-in user out to the public marketing page. Verified in
the browser: on `/` the inline properties are gone and `--accent` computes
back to `#38E08B`.

#### The defect this found: the correction ground was the wrong ground

**`lib/theme.js` corrected the accent against `--ink-0`, and that guarantees a
floor on `--ink-0` and nowhere else.** A dashboard accent does not stay on the
ground: `.cal-cell.today` sits in a panel, and `.pill` / `.badge` /
`.chip.active` / `.choice.on` print `--accent-text` on a tinted panel. Those
surfaces are lighter, so contrast on them is LOWER than the number just
guaranteed.

Sweeping the eight presets: **six of them under the 4.5:1 text floor on a
panel, and violet and slate under even the 3:1 FILL floor on `--ink-3`.**

Fixed by correcting against `--ink-3`, the lightest surface an accent can land
on — every one of these colours is lighter than every ground, so clearing the
floor there clears it on all the darker ones. One correction, guaranteed
everywhere. It costs almost nothing: **the house green does not move at all**
and six of the eight preset fills are unchanged.

`scripts/accent-sweep.mjs` is new, credential-free, imports the same functions
the app calls, prints all three grounds, and **exits non-zero** if this ever
comes back.

**The booking page deliberately did NOT follow.** Checked rather than assumed:
`booking.css` prints `--bk-accent-text` in exactly two places and both are
borderless rows sitting directly on the ground. Correcting that page against
`--ink-3` would push every tenant colour further from the owner's pick on the
surface their customers see, to buy a floor it already clears.

#### A second defect: stale tenant state survived sign-out

`BusinessContext.reload()`'s two "no tenant" exits cleared only `business`,
leaving `branding`, `settings`, `role` and `firstName` behind. Invisible until
the dashboard started wearing the tenant's colour — then signing out left the
last detailer's colour on the sign-in screen, and signing in as a different
one wore their predecessor's colour until the fetch returned. Fixed at the
shared point (`clearTenant()`), not in the accent effect. Verified by signing
out in a real browser: the inline properties clear and `--accent` falls back
to `#38E08B`.

#### OPEN, and it is the owner's: Crimson reads as the error colour

Law 11 makes one sentence in `docs/design-system.md` false. `--bad` `#E2705F`
was "the only warm value anywhere in the system, so it can never be confused
with the accent" — true only while the accent was fixed green. Corrected for
text, **Crimson lands at `#E55B5B`, ΔE 11.4 from `--bad`**: the same colour to
a glance. A *paid* pill and a *cancelled* pill on one screen would then be the
same red meaning opposite things. Ember measures ΔE 35.9 and is fine; Crimson
is the only one at risk.

**Not fixed in code on purpose.** The fix is to drop Crimson from the presets,
which is the owner's open "curated four to six" decision (roadmap 2.4). A
second red invented to dodge it is the exact failure mode
`design-knowledge.md` §2 names. The system file now records the collision
instead of the false claim.

### (c) Every screen IS opened and looked at — and the tool was broken

Confirmed, and the standing routine ran again: 1920 / 1440x900 / 768x1024 /
392x844, console read at each, normal path and `?lite=1`, plus the retint
sweep under crimson, violet, gold and slate. Console is clean apart from two
pre-existing React Router v7 future-flag warnings.

**`scripts/shoot-dashboard.mjs` could not sign in.** The demo login was
simplified to `demo123` in commit `1f3f945` and this script kept
`DemoDetail2026!`, so the one tool that opens the dashboard at all was dead.
Fixed, with a comment naming `seed-demo.mjs` as the file it must match. It
also gained `--accent <PresetName>`, which picks the colour through the REAL
screen (More > Your colour > the swatch) rather than writing the database, so
it proves the save and the live retint and not just the stylesheet.

#### A third defect, found only by reading the live cascade

The sheet backdrop is rendered inside `.app-main > .group` rather than in a
portal, so the screen-reveal rule `.app-main > .group > *` — specificity
(0,2,0) — beat `.sheet-backdrop`'s own (0,1,0) `animation: backdrop-in`. **The
full-screen dark overlay was running `arrive`: sliding up 14px and fading in
on a 160ms staggered delay** instead of fading straight in. Pre-existing; the
duration change halved it but did not cause or cure it.

Fixed with `:not(.sheet-backdrop)` on the reveal rule **and on the five
stagger rules** — `animation-delay` is a separate property with its own
cascade, and excluding it from one but not the other left the overlay fading
correctly and still 160ms late. Chosen over raising the backdrop's specificity
to tie at (0,2,0), because a tie decided by source order is one reorder away
from silently coming back.

**This was invisible in the stylesheet and invisible in a screenshot.** It was
found by reading `getComputedStyle(...).animationName` on a live open sheet.
Worth repeating on anything inside `.app-main > .group` that is not content.

### Screens

`shots/23b-final/` — five tabs and three settings sheets at four widths.
`shots/23b/` — the four retint extremes and the `?lite=1` pass.

---

## The owner walked the whole product, and answered both open questions (2026-08-30)

Full record, in his words: `docs/owner-walkthrough-2026-08-30.md`. Two
decisions and about twenty-seven feedback items. His overall verdict on the
design was positive — *"how good it looks so far. I really like the design"* —
so everything below is refinement, not rejection.

### He published, and told us why the stakes are low

*"Now you could publish this to the website."* Merged and pushed to `main`.

The reasoning is worth keeping because it answers every future publish
question: *"no one knows about it, only me. And it's not going out until
everything's finished. So in reality, it's not like something bad should
happen if we don't publish, but it's nice for me to be able to view it
anywhere."*

**So detailingplatform.com is his private preview, not a launched product.**
That is a different thing from what the earlier notes assumed when they
weighed "publishing mid-phase" as a risk. The rule in CLAUDE.md does not
change — still ask before merging — but the expected answer, and the reason,
are now on the record.

### Do NOT drop Crimson — and the curated four-to-six is dead

This reverses the recommendation this session put to him.

*"those eight colors were chosen by AI. They weren't by me, so I really don't
care about them. But I do want to have a good amount of color choices for
detailers, because a lot of detailers' color is probably red. So I don't think
you [should drop it] — maybe find some way around that."*

**The business fact the code did not know: red is a common colour for a
detailing business.** Pruning reds from the preset list prunes real customers.
So the plan inverts — MORE coverage, not less:

1. Research which colours real detailers and small businesses actually use.
2. A hue-family classifier in `lib/theme.js` (reds, oranges, yellows, greens,
   blues, purples, whites), so *"almost every single color in the world will
   work."*
3. Break the status signals' dependence on colour, so a red accent stops
   colliding with `--bad`.

Now roadmap 2.4 item 3, in three parts.

**The measurement that prompted the original recommendation still stands** —
Crimson corrected for text is `#E55B5B`, ΔE 11.4 from `--bad` `#E2705F`. The
number did not change; the response to it did. Do not let a future session
"rediscover" the number and re-propose dropping red.

### He explicitly removed his own authority from the fix

*"maybe we switch that color, or maybe you warn the detailer, or make it more
obvious that it's cancelled with words or sizing or something. You figure that
out. Don't use my word in any way to kind of decide your decision."*

That is an instruction, not modesty, and it is unusual enough to honour
precisely: he listed three candidate fixes and then said not to weight them
because he said them. The analysis is already done and is recorded in
`docs/design-system.md` § "The one warm value" and in the walkthrough file, so
it does not get re-derived:

- **Pills and badges are already safe.** They print "Paid" and "Cancelled" as
  words, so colour is reinforcement, not the message.
- **The exposed surfaces are the ones with no text** — `.dot.completed` /
  `.dot.cancelled` (7px circles) and the calendar's `.marks`. That is where a
  fix has to land, and it is a **WCAG 1.4.1** obligation regardless of the
  accent, so it is worth doing even for a tenant who picks blue.
- **The system already owns the vocabulary.** `docs/dashboard-skeletons.md`
  uses hollow versus solid for "ahead" versus "landed"; a third form for
  "cancelled" is a smaller invention than a new colour.
- **Rotating `--bad` off red is the option to be most careful with.**
  Red-for-error is a stronger and more universal convention than any tenant's
  brand colour. Moving it trades a convention every user knows for one only
  this product knows.
- **Never invent a second red.** That is the failure mode
  `design-knowledge.md` §2 names by name. It is now written into the system
  file as law.

### The walkthrough itself — 27 items, none started

Split into roadmap **2.6** (clipping and spacing — small, checkable, and the
screenshot routine already catches this class), **2.7** (features — calendar
ranges, Money time ranges, and a booking-widget pass organised around his one
general rule that every step should fit without scrolling), and **2.8**
(research how other detailers actually work).

**2.8 exists because three separate items are the same gap:** the product is
modelled on his business and he knows it. The water-and-electricity question
on the booking page was built for him specifically, because he has no water
tank or generator, and he says most detailers do. Several 2.7 build decisions
depend on that research, so it runs first.

**The one caveat that governs half of 2.6:** he was on a Windows phone
emulator, not a real phone, and flagged it himself. Every "cut off to the
right" item must be reproduced at 392x844 before it is treated as a bug.
`scripts/shoot-dashboard.mjs` already shoots that width.

**The best-argued single item he gave** is the hover bug (W24): hovering an
already-selected option darkens it, which reads as un-selecting it. A selected
element's hover has to move in the same direction as its selected state, not
against it. That one needs no research and no decision.

## Roadmap 2.4 — making almost any colour work everywhere (2026-08-30)

The item the owner set in D2: stop the tenant's accent colliding with the
system's status colours, without dropping red from the palette. Three parts —
research the colours real detailers use (3a), classify an arbitrary colour into
a hue family (3b), and break the status signals' dependence on colour (3c).
He removed his own authority from 3c's shape: *"You figure that out. Don't use
my word in any way to kind of decide your decision."*

**Then he corrected the framing mid-session, and the correction is the most
important thing in this entry.** See "The owner's rule" below.

### 3a — the preset list, built from evidence instead of taste

**Twelve presets, up from eight.** The eight that were there carried no
authority — *"those eight colors were chosen by AI… I really don't care about
them"* — but he was explicit that the COVERAGE matters, and that a curated
four-to-six is the wrong direction.

The evidence, and it is worth keeping because it settles the argument that
started this item:

- **A 46-brand car-care sample** (1000logos, "Most Famous Car Detailing Brands
  and Logos"), counted by hue: **red 22 of 46 (48%)**, black/grey ~43% (almost
  always as the neutral, not the accent), **blue 11 of 46 (24%)**, yellow/gold
  6 (13%), orange 4 (9%), purple 2 (4%), **green 0**.
- **General logo-colour studies** for the small-business baseline: blue
  37–40%, black/grey 28–31%, red 23–29%, yellow/gold ~15% (Fortune 500 and
  Fortune Global 500 samples).
- **Detailing-specific convention:** white, silver and metallic accents, and
  deep navy or charcoal paired with gold for premium positioning.

**What that changes.** Red is the most common colour in this trade by a
distance — twice blue. Pruning the reds would have pruned roughly half the
addressable market, so the owner's business instinct was right, and now it has
a number behind it. **Green being 0 of 46 also means the house green is a real
differentiator** rather than an arbitrary pick.

The twelve, hue-ordered so the swatch row reads as a spectrum: Crimson, Rose,
Ember, Sunflower, Gold, Forest, Teal, Sky, Ocean, Violet, Slate, Silver. Four
are new (Rose, Sunflower, Teal, Silver); the eight that were there all survived,
because every one of them clears both floors.

**WHY THERE IS NO DEEP NAVY AND NO DEEP GARNET, though both are real detailing
brand colours.** `correctToward` moves lightness only. Measured: navy `#1E3A8A`
paints `#4269D6` and garnet `#9B1C1C` paints `#D72727` — each collapses onto a
brighter preset already in the list. Two swatches that paint the same colour
are worse than one. The custom picker plus `describeAccent()` covers those
detailers instead, in words.

**The swatch row became a 6-column grid** rather than a wrapping flex row:
twelve wrapped as eleven-plus-one at 1440, which reads as a mistake. 6x2 fits
every width down to 392.

### 3b — `hueFamily()` and `describeAccent()` in `lib/theme.js`

His framing: *"there's a group of reds and oranges and blues and greens and
yellows, whites and purples… even though obviously they're a different color
technically, they're that same type of color… basically make sure that almost
every single color in the world will work."*

`hueFamily(hex)` returns a family key and a human label. Nine families: red,
orange, yellow, green, teal, blue, purple, pink, and neutral. Saturation below
0.10 is neutral, which is what stops `#0A0A0A` being called "a red" because its
hue rounds to zero. It classifies the colour AS PICKED, which is the same
answer as the colour as painted, because correction never changes hue.

**It deliberately does NOT gate any styling** — see 3c. Its job is
`describeAccent()`, one live sentence on the Appearance screen saying what the
colour is and what was done to it. That replaced a fixed paragraph which said a
pale colour "may look slightly deeper than the one you chose" — backwards, since
the ground is dark and it is DARK colours that get lightened. Someone who types
in their deep navy and gets royal blue now finds out why.

**Its own check lives in `scripts/accent-sweep.mjs`**, which pins sixteen
colours against their expected family. It earned its keep immediately: the
first version had three bands mislabelled (`#EA580C` came back "yellow",
`#EAB308` "lime", `#059669` "teal") and the check caught all three.

**The sweep also grew the extremes 2.4 owns** — neon green, neon magenta, neon
cyan, pure black, near-black and pure white are swept on every run now, not
only when someone remembers to pass a hex. All clear both floors. Pure black
paints `#707070` as a fill and `#8A8A8A` as text.

### 3c — the decision: form, unconditionally

**Three options were on the table, in his words: switch the colour, warn the
detailer, or "make it more obvious that it's cancelled with words or sizing or
something."**

**Chosen: a form vocabulary that always holds, for every tenant, plus his own
rule below. Rejected: switching `--bad`, and warning the detailer.**

Switching `--bad` is already forbidden by law ("never invent a second red") and
trades a convention every user knows for one only this product knows. Warning
the detailer moves the problem onto the customer and leaves the product broken
for anyone who clicks past it.

**The measurement that decided the shape.** The premise everyone had been
working from — "red accents collide with the error red" — is only a third of
the problem. Measured on the shipped markup, ΔE against the mark each collides
with:

| Accent | Collides with | ΔE | Both were |
|---|---|---|---|
| silver `#D4D7DA` | "booked" ring, `--bone-2` | **8.5** | hollow rings |
| deep red -> `#E26666` | `--bad` | **8.5** | — |
| Crimson -> `#E55B5B` | `--bad` | **11.4** | solid discs |
| near-black -> `#707070` | "blocked", `--fog` | **17.1** | solid discs |
| Slate -> `#5C6E87` | "blocked", `--fog` | **21.8** | solid discs |

Three of the five have nothing to do with red. **A silver accent is exactly as
bad as a red one.** So a fix conditional on `hueFamily() === "red"` would have
left most of the problem in place, and would have been a code path six tenants
in seven never exercise. One rule that always holds beats a branch that
sometimes fires.

**It also disposes of "drop Crimson" for good.** A deep red typed into the
custom picker corrects to `#E26666`, ΔE 8.5 from `--bad` — *closer* than
Crimson's 11.4. The preset list was never the lever.

**The vocabulary** (`docs/dashboard-skeletons.md` §5b is the table): circles
are jobs — hollow ahead, solid landed; a bar is a job that did not happen;
squares are facts about the DAY. `--bad` left the calendar entirely. Confirmed
and pending merged into one mark, because on a month grid both mean "booked,
nothing has happened yet" and keeping them apart cost a third hollow ring
distinguished by hue alone.

**Two things were found while doing it and are worth carrying forward.**

- **`.dot.cancelled` — the roadmap's flagship collision site — is unreachable.**
  `Calendar.jsx` filters cancelled out of the month grid and `Today.jsx` filters
  it out of the rail. The rule was styled for a mark that never renders.
- **The legend decoded four of seven marks.** Pending and no-show had no legend
  entry at all, so a red no-show dot sat on the month grid meaning nothing to
  anybody. It decodes all five now.

**`.ring` kept the accent and did not go neutral.** Making it a square is what
fixes its collision with "booked"; dropping it to `--fog` on top of that was
tried and looked worse — a hollow grey square beside a solid grey square is a
1px hole apart at 7px. Checked in a browser at 6x.

**Pills and badges: filled means it happened, outlined means it did not.** They
were never a 1.4.1 failure — they print the word — but under a red accent
"Completed" and "Cancelled" were the same red, and that is the common case, not
the edge one. The tint is the difference now, which is the system's own
hollow-versus-solid vocabulary one level up.

### THE OWNER'S RULE: the accent is identity, never meaning

**Said mid-session, and it is the better answer.** Full quote in
`docs/owner-walkthrough-2026-08-30.md` -> D3. The short version: *"the paid
should always be green because that's just kind of paid. Money green is all
kind of cohesive… the accent colour is more like the mark complete button or
the calendar highlight — what day it is — and the outline for month, and the
colour theming on the money page."*

It is now `docs/design-system.md` **law 11b**. Two kinds of colour:

- **`--accent*` carries IDENTITY** and follows the tenant: actions,
  navigation, selection, focus, today's disc, the selected day, chart bars, the
  "it landed" node.
- **`--ac` green and `--bad` red carry MEANING** and are fixed for every
  tenant: paid / money up / it worked, and cancelled / no-show / error /
  destructive.

**Why this is better than what was being built.** The form work makes a red
accent *survivable*. His rule makes the collision *not exist* for the pair that
matters, because "Paid" is no longer red at all. Both shipped: the forms also
cover the silver and near-black cases, which his rule does not touch.

**He said "there might be other places that that rule applies to also", and
that was taken as an instruction to extend it.** Four sites he did not name:

- **`.delta.up`** was `--accent-text`, so a red-branded detailer got a red ▲
  beside a red ▼ — the two directions of the Money screen's headline saying the
  same thing in the same colour. Now green up, red down.
- **`.ok-box`** was accent-tinted, so under a red accent it was identical to
  the `.error-box` above it — the two states of one message, indistinguishable.
  Now green.
- **Money's `tone="good"` figure** ("Added on site") — money earned. Now green.
- **`.badge.paid`**, which mirrors `.pill.paid`.

**The judgment call inside the rule, recorded so it is not re-derived:
*completed* stays on the accent while *paid* moves to green.** A finished job is
not money; "mark complete" is his own example of an accent-side control; and
the Today rail's landed node is the one place the detailer's colour appears on
the screen they open every morning, so moving it to green would put the house
colour back on their main screen — exactly what law 11 was rewritten to stop.
The residual is that under a red accent "Completed" (filled) and "Cancelled"
(outlined) are both red, carried by the fill difference and the words. It is a
one-line change in `theme.css` if that reading is rejected.

**`grep 'var(--ac)'` in `theme.css` finds every fixed-meaning site.** That
file's token block used to say "below here there is no `var(--ac)` left". That
rule is now exactly inverted and the comment says so.

**A collision the rule could have INTRODUCED was checked, and it does not
exist.** Moving paid to a fixed green puts two greens side by side for a
green-branded tenant: Forest's accent-as-text `#05A070` against the money green
`#38E08B`. Measured ΔE **29.3** — comfortably separable, against the ~8–11 that
reads as the same colour. Teal is 46.5; every other preset is 46 or more.
Looked at as well, in the History list under a Forest accent: "Completed" deep
green and "Paid" mint green are clearly two pills, and both mean compatible
things anyway, unlike the paid/cancelled pair.

### Two defects found on the way, both in the demo seed

Neither is 2.4's subject; both were fixed because they block LOOKING at the
product, which is how this project verifies visual work.

- **The demo had no cancelled and no no-show booking** — twenty-one rows, every
  one confirmed or completed. So the entire "Cancelled" / "No-show" family of
  styling could not be seen in a browser at all, which is why a red "Paid"
  beside a red "Cancelled" survived unnoticed. One of each added. *A status
  with no seed row is a status nobody ever looks at.*
- **The seed silently dropped bookings on weekends.** `openDay(1)` is the next
  open day after TODAY, and the demo business is closed Sunday and Monday, so
  on a Sunday it resolved to the same Tuesday `day0` had already resolved to.
  Both "tomorrow" rows then overlapped the day0 jobs, the double-booking
  constraint refused them (23P01), and the script printed "skipped" and carried
  on — so the Today screen's TOMORROW section read "Nothing booked yet" every
  weekend. `openDay(3)` had the same bug one day further out. Every upcoming
  day is now CHAINED off the one before it rather than measured from today,
  which is what makes them provably distinct. 22 of 22 seed now; it was 20.

### Verified

`composition` 26, `design-contrast`, `landing-pricing` 18, `route-contract` 18,
and `accent-sweep` (18 colours x 3 grounds x 2 floors, plus 16 hue-family
pins) all pass. Screenshotted at 1920 / 1440 / 768 / 392 under Crimson, Silver
and the house default, normal path and `?lite=1`; the marks were also inspected
at 6x, and the History list was walked under Crimson to see a green "Paid"
beside an outlined red "Cancelled" on one screen. Console at every width carries
only the two pre-existing React Router v7 future-flag warnings, which predate
this item.

### A LIVE defect on the customer-facing booking page, found while checking

The sweep measures the DASHBOARD's values. The booking page computes its own
through `brandVarsFor`, against its own ground — so none of the work above had
actually checked it. Checking it found the 2.3 bug still live on the public
page, which is the one a paying customer sees.

**`.bk-card.selected` draws its accent ring on
`linear-gradient(166deg, var(--bk-lit), var(--bk-sunken))`.** The top of that
gradient is `--ink-3`. `.bk-cal .cell.today` rings a cell painted
`rgba(255,255,255,.025)` over the ground. Both are LIFTED, and the fill was
corrected against `--ink-0`. Measured on `--bk-lit`:

| Accent | Ring contrast | Floor |
|---|---|---|
| Violet `#7C3AED` | **2.78:1** | 3:1 |
| Slate `#475569` | **2.62:1** | 3:1 |
| a black pick | **2.56:1** | 3:1 |
| a deep navy | **2.51:1** | 3:1 |

**That ring is the only thing telling a customer which service they picked.**
Violet and Slate are shipped presets, so this was not hypothetical.

**The fix, and the rule it clarifies.** The booking page now corrects its two
values against two DIFFERENT grounds: the FILL against `--ink-3` because rings
land on panels, the TEXT against `--ink-0` because the only two places it is
printed are borderless price rows on the ground (checked in 2.3, re-checked
here). `accentTriple()` gained an optional `textBg`, defaulting to `bg` so the
dashboard is unchanged. **The rule is not "one ground per page" — it is
"correct against the lightest surface THAT VALUE can land on".**

A side effect worth knowing: the booking fill and the dashboard fill are now
corrected against the same ground, so a tenant's colour paints identically on
both surfaces. That is an improvement, not a coincidence to preserve.

**`scripts/accent-sweep.mjs` now measures the booking page every run** — fill
on the ground, on the calendar cell and on `--bk-lit`; text on the ground; and
the ink ON the fill. The check was proved to work by reverting the ground: it
exits 1 and prints exactly those four numbers. The script's final line is now
the only one that speaks for the whole run, because a per-section "all clear"
printed before the next section runs is how a green sweep hides a red one.

**Both swatch previews were re-pointed at `brandVarsFor`** (Appearance's twelve
circles and More's nav-row dot). They used `correctAccent(hex, CUSTOMER_BG)`,
which after this change paints a colour the page never uses. One function, no
drift — which is the rule that file already stated for the preview card.

Verified live: `/book/demo-detail` under Violet now injects
`--bk-accent: #8243ee` (3.01:1 on `--bk-lit`) instead of the raw `#7c3aed`
(2.78:1), with `--bk-accent-text` unchanged at `#955ff0`.

### Still open in 2.4, NOT done in this session

- **The customer cancel/reschedule page's composition** — its three stacked
  full-width buttons carry no hierarchy. It is the non-colour half of 2.4 and
  it was never started. Its *colour* is fine: the cancelled state there is
  carried by the word "Cancelled" and a line-through on the date, so it has no
  colour-alone dependence to fix. `booking.css` itself was not edited — the
  booking fix above is entirely in `lib/theme.js`, which is the only file
  allowed to compute colour.
- **`a { color: var(--accent-text); text-decoration: none; }`** in `theme.css`
  is a latent 1.4.1 hazard: a link identified by colour alone. Chasing it found
  **one LIVE instance and it is fixed** — the booking confirmation page's
  *"Questions? Call &lt;number&gt;"*, a prose link inside a `<p>` marked only by
  the tenant's accent. `booking.css` now underlines links inside `.bk-muted`
  and `.bk-body` prose and explicitly exempts `.bk-btn`, which reads as a
  button already. It matters most for the accents nearest the prose around
  them: a Silver accent `#D4D7DA` against `--bk-muted` `#939CA1` is 1.9:1,
  under the 3:1 a colour-only link would need.
  **What is still flagged and NOT fixed is the DASHBOARD's `a` rule.** Every
  anchor there is classed as a button except one, `BookingDetail.jsx:292`,
  which is a card — underlining a card would be wrong, so there is nothing to
  fix yet. It becomes real in Phase 3, when tenant sites have prose.

## Roadmap 2.4, the last piece — the manage page had no first thing (2026-08-30)

`/booking/:id` — the page a customer reaches from the confirmation email to
move or cancel an appointment — drew **four** identical full-width pills in a
column: *Add to my calendar*, *Change the time*, *Cancel this booking*, *Call
&lt;number&gt;*. The roadmap said three; it was one short, because the last one
only draws when the business has a phone number on file, which the demo tenant
does.

**The root cause was structural, not stylistic, and it is worth naming because
it will recur.** The buttons were direct children of `.bk-wrap`, which is
`display: flex; flex-direction: column; gap: 26px` — the page's SECTION gap.
Every button therefore inherited a section's worth of space above it *and*
carried its own `marginTop: 10`, so the four of them read as four page-level
blocks rather than as one set of choices. That is the "five identical
full-width stacked sections" tell (`docs/design-knowledge.md` §1) arriving by
accident: nobody chose it, the container did.

**What it is now: one group, three weights.**

| Weight | Control | Why |
|---|---|---|
| Filled, the tenant's accent | Change the time | The page's own header says it exists to stop the detailer's phone ringing for "can I move my Tuesday?". That is the primary, and it is an *action*, which law 11b puts on the accent side. |
| Ringed | Add to my calendar | Useful, not the reason you came. |
| Ringless, sharing a row under a hairline | Cancel this booking · Call … | The two ways *out* — one destructive, one human. The rule is the line between doing something WITH the booking and doing something INSTEAD of it. |

New in `booking.css`: `.bk-actions` (the group and its tighter internal
rhythm), `.bk-exits` (the row, which stacks below 440px because a phone number
and "Cancel this booking" cannot share a line that narrow), and
`.bk-btn.danger` with a `.bare` variant. `.danger` also replaced the same
inline `boxShadow + color` style that had been copied into the JSX twice.

**The destructive control lost its ring, and that was the point.** The trigger
that OPENS the question and the button that ANSWERS it are not the same act:
the confirmation step keeps the full red ring, the trigger is bare and takes
the ring back on hover. Its red stays — law 11b fixes `--bad` to destructive,
and it is the one colour on this page the tenant does not own. Colour is not
carrying it alone either: it keeps its `<X>` icon, and `.bk :focus-visible`
paints a 2px accent outline, which was screenshotted rather than assumed.

### The red-on-red adjacency: measured, and left alone

Making "Change the time" an accent fill puts a red-branded tenant's identity
colour in the same view as the red destructive control — the exact adjacency
law 11b exists to prevent, and the reason item 3c pulled `--bad` out of the
calendar. So it was measured before it was accepted. CIE76 ΔE against `--bad`
`#E2705F`, on the corrected fill each preset actually paints:

| | ΔE | | ΔE |
|---|---|---|---|
| Crimson `#dc2626` | **31.9** | Gold | 45.9 |
| Rose `#e11d48` | **30.8** | Slate | 64.9 |
| Ember `#ea580c` | **35.9** | Silver | 59.6 |
| Sunflower | 61.1 | Ocean | 105.6 |

The collisions item 3c judged real were **ΔE 8.5** (a Silver accent against the
"booked" ring) and **17.1** (near-black against the blocked-day grey). The
worst case here is 1.8x the larger of those and 3.7x the smaller. `hueFamily()`
does put Crimson, Rose and `--bad` in the same band — but they differ in form
as well as distance (a solid 48px fill against bare text, with a rule between
them), and a red `.bk-btn.primary` already ships on this same page in the
reschedule and cancelled states. **No colour was changed.** If the owner looks
at a crimson tenant and disagrees, the one-line answer is to drop `--bad` from
the trigger and leave it on the confirmation button, which is what 3c did to
the calendar.

### A live defect fixed on the way

With the cancellation window closed, the note explaining that changes are
locked already prints whatever contact the business has — and a "Call
&lt;same number&gt;" button was drawn directly beneath it. The same number,
twice, in a row. **Checked at the source rather than assumed:**
`receiptBusiness.phone` comes from `get-booking-receipt` and `business.phone`
from the public-profile RPC, and both read `businesses.contact_phone`, so
there is no shape of the data where the note is empty and that button is not.
The whole exits row now goes when the window closes.

### What was looked at, and how

`scripts/shoot-manage.mjs` is new — `shoot-dashboard.mjs` signs in and walks
the owner's side, and nothing reached the page the CUSTOMER lands on. Its
states are branches on data, not clicks, so it takes a booking id per state.

Walked at **1920 / 1440x900 / 768x1024 / 392x844**, console clean at every
width, normal path and `?lite=1`: the default state, mid-reschedule, the
cancel confirmation, cancelled, and the locked window — that last one reached
by temporarily setting the demo tenant's `cancellation_window_hours` to 200
and putting it back to 24. Retinted through the tenant's real
`business_branding` row at three extremes and restored to `#eab308`: Crimson
(a saturated red fill), Silver (a near-white fill with dark ink) and
near-black (which corrects to a mid-grey fill — bright enough not to read as
the disabled treatment, which is darker and has muted text). The booking page,
which shares the same stylesheet, was re-shot at two widths and is unchanged.
All four credential-free tests and `scripts/accent-sweep.mjs` pass.

### One thing observed and deliberately not fixed

The page ends around y=570 on a 1920x1080 screen, so the lower half is bare
ground — and this change made it about 100px *shorter*, because three weights
take less room than four equal ones. It is left alone: this is a phone page
reached from a text message, its approved sibling the booking page has the
same shape, the ground's drifting light means it is not a dead screen (law 2),
and the only way to "fill" it would be filler. Flagged to the owner rather
than solved, because "not enough content at 1920" is a named hazard in this
repo and silently ignoring it is how it gets ignored twice.

### What was NOT done, and why

No test was added for "a column of identical full-width buttons". The check
would have to count sibling elements across JSX to mean anything, which is
brittle in a way the existing 26 checks are not — they read stylesheets and
markup for facts, not for shapes. The rule went into
`docs/design-system.md` § Composition instead, where the never-defaults live.

### Two things checked during the above and found NOT to be findings

Recorded so they are not re-discovered and re-argued.

**`.bk-btn`'s default ring measures 1.71:1 against the ground** (`--line-2`
`#333B40` on `#0B0D0E`), which is under law 9's 3:1 for non-text interactive
edges. It is not a finding: the ring is a secondary affordance on a control
whose own label runs 19.48:1, so the boundary is not what identifies the
button. It is also pre-existing on every secondary button on the booking page,
not something this item introduced. The new tiers were measured too and both
clear the text floor comfortably — the bare destructive label `#E2705F` at
**6.23:1** and the ghost `#939CA1` at **6.97:1**, with the accent fill at
10.16:1 as a non-text edge.

**"Keep my booking" appeared bone-coloured rather than muted in the first
confirmation screenshots.** It is `.bk-btn.ghost:hover`, not a defect:
Playwright leaves the pointer where it clicked, and the confirmation panel that
replaces the exits row puts a different button under that exact spot. Measured
with the pointer parked off-canvas it is `#939CA1`, as designed.
`scripts/shoot-manage.mjs` now moves the mouse to (2,2) before every shot, so
the artifact cannot come back.

---

## Roadmap 2.6 — the owner's walkthrough, the clipping and spacing half (2026-08-31)

Eight of his items, every one reproduced at 392x844 in a real browser before
anything was edited, per the emulator caveat he wrote himself. The outcomes are
recorded item by item in `docs/owner-walkthrough-2026-08-30.md`; what follows is
the judgment behind them.

- **The emulator caveat cuts BOTH ways, and one item proves it.** The
  instruction was "reproduce it or close it", and read literally that would
  have closed **W14** as a phantom: the Open button does not overflow in a
  headless browser. It overflows when `navigator.share` exists, which adds a
  third button — Chrome on Windows has it, every real phone has it, and a
  headless Chromium does not. With it stubbed in, Open ends 24px off a 392px
  screen, exactly as he described. **The right question was never "is this
  broken in my browser" but "what did HIS browser render."** Anything that
  reads the caveat as licence to dismiss reports is reading it wrong.

- **Seven of eight reproduced; the eighth reproduced somewhere else.** W7, W8,
  W11, W12, W13, W14 and W15 all reproduced at 392. **W24 did not reproduce
  where the roadmap said to look** — `.chip.active` and `.choice.on` in
  `theme.css` were already scoped away from their selected state, so nothing
  darkened there. The bug was real and on the CUSTOMER-facing booking page:
  `.bk-card.selectable:hover` had no `:not(.selected)` and carries one more
  selector than `.bk-card.selected`, so hovering an already-chosen service
  replaced its accent ring and its lift with a grey hairline. His description
  was accurate; the location in the roadmap was a guess and it was wrong.

- **The shared cause was fixed once, not eight times.** Both spacing items
  (W7, W11) and the Team clipping (W15) came from the same habit: children
  dropped into a container with no flow of its own, and flex children left
  free to refuse to shrink. So `.card.row.between` — the "what it is on the
  left, what you can do to it on the right" shape, which has **eight call
  sites** — now wraps and tells its two halves which one gives; and the two
  screens got the system's own flow containers instead of margins. Catalog
  and the two modals were never reported broken and are unchanged on screen:
  the rule only fires when the content genuinely does not fit.

- **The client's three stats lost their boxes rather than gaining a gap.**
  W7 asked for spacing and W8 asked for less bulk, and one change answers
  both: three related facts are an enumeration, and the composition rule's
  answer to an enumeration is a ruled list. The new `.facts` device has no
  boxes at all, so there is no gap left to get wrong, and it is the Clients
  tab's own skeleton besides.

- **`.row-item`'s `padding-left` question, open since 2.3, is ANSWERED — and
  the 2.3 note was right to reject the obvious rewrite.** Translating the row
  is genuinely not equivalent, because it slides the chevron too and the row
  drifts away from its destination instead of toward it. Translating the
  **text** is equivalent: measured, the words move 6px, the row's box does not
  move, the chevron does not move, and `.txt` keeps its width — so the ellipsis
  point no longer shifts either, which the padding version did. Layout
  animation gone, effect identical or better. The design hook now reports one
  finding on `theme.css` instead of two, and the survivor (`.sheet`'s height
  transition) is the one already documented as deliberate.

- **THE ACCENT-TEXT GROUND, ONE SURFACE FURTHER IN — a live defect found
  while doing W24, and fixed.** Applying law 15 meant raising the tint on a
  selected chip's hover, which meant measuring what its label sits on. It sits
  on `--ink-3` **mixed with the accent itself**, and `--accent-text` was
  corrected against plain `--ink-3`. So the floor bought by the correction did
  not hold where the value is actually printed. Measured over the twelve
  presets and the six extremes, four sites failed 4.5:1 — a selected chip and
  a selected choice at **3.92 worst**, `.pill.completed` / `.badge.completed`
  at 4.13, the selected tab at 4.46 — with **nine presets plus black and
  near-black under the floor**. `lib/theme.js` now corrects the text against
  `dashboardTextBg()`, the ground at its lightest (the selected tint while
  hovered, 20%); worst case after the fix is 4.52:1 and six colours do not
  move at all. `scripts/accent-sweep.mjs` measures all four tinted grounds
  every run and exits 1 if the two numbers drift apart — proven by setting the
  tint to 0 and watching it fail.
  **This is the third time the same mistake has been made in this file's
  history** (2.3 corrected against the ground, 2.4 corrected the booking fill,
  2.6 this), and the pattern is identical every time: the ground was named
  from the stylesheet's SURFACE tokens while the value was landing on
  something built out of the accent. The design system now says it in one
  line — **a tint of the accent is a ground.**

- **Two things law 15 deliberately does NOT do.** A hover already scoped away
  from the selected state is not broken — it does not move against the
  selection — so `.bk-chip.selected` and `.bk-cal .cell.selected` were left
  alone. Brightening them was tried and rejected on a measurement: those are
  solid accent FILLS, and for a very dark tenant accent the corrected fill is a
  mid grey carrying WHITE ink, so brightening it drops that label from 4.95:1
  to **3.84:1**. A card can intensify because its selection is a ring; a fill
  cannot without moving a floor. Separately, `.cal-cell.selected` turned out to
  be **dead CSS** — nothing in the app ever sets it — so it did not get a hover
  either; a rule for a state that never renders is speculative code. The dead
  rule is left in place with a comment saying so.

- **The 320px floor is REAL, MEASURED and DEFERRED to roadmap 2.9.** After the
  fixes the sweep is clean at 392 and 360 on every dashboard screen and on the
  booking page. At 320 five things still clip. It is deferred rather than
  fixed because it is not one of his items, not one of the four verification
  widths, and not the width he was looking at — and because each of the five
  needs its own layout decision, which is a body of work rather than a
  follow-through. **PRODUCT.md claims "responsive 320→1440", so that claim is
  currently false**; 2.9 is what makes it true, and the exact list is in it.

- **A 409 was logged once and never came back.** The first sweep recorded one
  `409` response with no other detail. Two later walks of the same path with
  the network logged produced no 4xx or 5xx at all. Most likely the probe's own
  doing — it clicked `.card button` blind on the Clients tab and may have hit a
  Save twice. Recorded rather than chased further; if it reappears it has a
  note waiting.

- **`ship-check` found one thing the sweeps could not, and it is not a 2.6
  item.** Focus rings: 215 focusable controls across every changed screen were
  tabbed through and all 215 show one, including the Promos checkbox whose
  markup was rewritten. Contrast: every text node on all eleven changed screens
  was measured against its real composited ground at 392 and all clear AA —
  which together with `accent-sweep`'s twelve presets and six extremes across
  seven grounds is the whole surface. What it DID turn up is
  `app/index.html`: **no meta description, no Open Graph tags**, on a site that
  is published. Filed as roadmap 7.5 rather than fixed here, because the copy
  is a positioning decision and the OG image needs the owner — there is no
  logo, by design.

---

## DECISIONS.md got an index, because nobody was reading it (2026-08-31)

The owner's ask, after 2.6: *"maybe there's information in there that we don't
need anymore, or we could just have, like, kind of a thing at the top that
every agent reads at the start… so that way it doesn't have to go digging
through the entire file."* He also set the priority explicitly — *"time's not
that big of an issue. My main concern is just the accuracy"* — and told me to
make the call rather than hand it back.

- **The problem is real and measurable.** This file was 218KB, about 54,000
  tokens. A cold session's whole mandatory reading is roughly 20–25k tokens, so
  reading this file would have been more than doubling it. Nothing did. **The
  2.6 session searched it and appended to it without ever reading the body**,
  which is the honest description of what "too long" had turned into: a file
  where knowledge goes to be safely forgotten. It looks like diligence and
  performs like a cleared chat, only slower.
- **Clearing between items STAYS, and this is what makes it work.** Compacting
  was considered and rejected: the summary is lossy, *I* pick what survives,
  and nobody can audit what I dropped. Files can be checked. The decider is
  portability — the owner expects to move to OpenAI's coding agent in about a
  month, so a compacted conversation ports as nothing while markdown ports for
  free. See the portability rule in `CLAUDE.md`.
- **The index is written by hand, and that is deliberate.** Generating it was
  tried first: pull each section's first bold run as its hook. It produced
  entries like "four", "40 pixels" and "`docs/dashboard-spec.md` is now in the
  repo". **A wrong hook is worse than no index** — it is a lie in the one place
  a session trusts — so the hooks are written by someone who read the section.
- **What the script does instead is refuse to let it rot.**
  `scripts/decisions-index.mjs` checks two things and nothing else: every `##`
  section appears in the index, and no index entry names a section that is
  gone. It exits 1 either way. Proven both directions: it passes on 48
  sections, and appending an unindexed section makes it fail. Matching is on
  the heading's opening clause, so the index can keep listing the short form of
  a long heading; it errs toward passing on purpose, because its job is to
  catch a forgotten section, not to police wording.
- **Nothing was deleted, and superseded entries were MARKED instead.** He
  floated deleting what is no longer needed and it is the wrong move here: the
  value of a decisions log is largely in its reversals. "Removed on purpose"
  reads as dead weight until you notice the next entry is the owner putting all
  of it back — delete the first and the second stops making sense. The index
  labels it superseded and points forward. That rule is now in `CLAUDE.md`.
- **The index leads with the five mistakes that have actually cost sessions**,
  not with a table of contents. Three of them have been made more than once —
  the accent-ground error alone in 2.3, 2.4 and 2.6 — so the highest-value
  thing at the top of this file is not "what is in here" but "what you are
  about to get wrong".
- **Watched, not fixed: `docs/roadmap.md` is 73KB and heading the same way.**
  It is not acute yet, because sessions arrive knowing which item they want and
  items are findable by number. If a session ever starts guessing which phase a
  thing lives in, it needs the same treatment.


## Roadmap 2.7 — the owner's walkthrough, the features half

Closed 2026-08-31. W1, W2, W3, W4, W5, W6, W16, W17, W18, W19, W20, W23 and
W26. W9, W10, W21, W22 and W25 were left for 2.8 on purpose — see the last
section here. The item-by-item record with the measurements is
`docs/owner-walkthrough-2026-08-30.md`, which is still the primary source; what
follows is only the judgment calls.

### W16 got an instrument before it got a fix

*"A good general rule is that everything should be able to fit without having
to scroll anywhere. Each step, you shouldn't have to scroll down or up."*

A rule with no instrument is a preference. `sweep-widths.mjs`, written in 2.6,
answers "is anything off the RIGHT edge"; nothing answered "is anything off the
BOTTOM", and those are different questions with different fixes — the right edge
is one element too wide, the bottom edge is the whole step's budget.

`scripts/sweep-booking-steps.mjs` walks the flow at all four verification sizes,
fills it in as a customer would, and reports the overflow per step plus the
three tallest blocks when it fails. **Baseline: 8 of 12 step-views overflowed,
worst 222px — 26% of a phone screen.** Without that number the first instinct
(and the wrong one) is to start shaving gaps at the bottom of whatever screen
you happen to be looking at.

**Two things about the script are worth keeping.**

- **It reports the SPARE ROOM, not just the failures.** "Fits" is only true of
  the business that was measured. A detailer with two more services than the
  demo is a different page, and the headroom is what says how much more the
  layout can take. That number is what made the ceiling below visible.
- **It reads the flow rather than assuming it.** W19 made the step list BUILT
  (add-ons only get a step where a business has any), so a script that assumes
  six steps silently measures the wrong screen. It reads "STEP n OF m" off the
  page and drives each step by what that step actually asks for.

**1440x900 was the only size that failed after both of his were clean.** 392x844
is his phone and 1920x1080 is his monitor, and fixing those two left step 1
55px past the bottom on a 1440x900 laptop — the SHORT screen, 180px less height
than 1920 carrying the same desktop masthead. The masthead's own comment says
why it grows: "a 60px bar above a centred column leaves the top third of a 1920
screen empty." That reasoning is about height and the gate only checked width.
It is `(min-width: 1000px) and (min-height: 950px)` now. **The lesson is that
the four verification widths are four SIZES, and the short one is where a
height budget breaks.**

### The honest ceiling: step 1 is the tenant's, not ours

Steps 2–7 have 90–500px of room. **Step 1's height is the detailer's
catalogue**, and with the demo's four services it has 18px of room on a phone —
a fifth service breaks it. W16 cannot be true in the absolute for a list whose
length the tenant controls, and pretending otherwise would mean either deleting
information a customer needs or shaving the layout until the next detailer
breaks it again.

**The lever that actually raises the ceiling is W21** — his "little eye" control
that folds a service's full contents out of the card — and W21 is one of the
five waiting on 2.8's research, which is a good reason it is sequenced there.
Recorded here so a later session does not rediscover the 18px and go hunting for
gaps to shave.

**The headroom by size, so nobody has to re-measure to know where they stand:
1920 has 125px, 768x1024 has 158px, a phone has 18px, and 1440x900 has ONE.**

**That 1px is a decision, and the alternative was tried and rejected.** The
tenant's tagline is 23px, and hiding it on a laptop as well as on a phone would
have bought comfortable room at 1440x900. It is not worth it: the tagline is the
tenant's own line on the tenant's own page, the height-gated masthead padding
already buys 38px there on its own, and margin bought this way is spent the
moment the detailer adds a fifth service. **Suppressing tenant identity to
protect a limit the tenant's own catalogue controls is the wrong trade** — the
phone is the one screen where the tagline genuinely does not fit, and that is
the only place it is hidden. Both halves were measured, not reasoned.

**And the class was nearly the wrong one.** `.tagline` is reused by the manage
page for "Your booking", a page LABEL rather than marketing, so the first
version of the phone rule hid the customer's receipt subtitle too. It is
`.tagline.brand` now. Grep a class before writing a rule against it — the same
lesson `landing.css`'s header has been carrying for two roadmap items.

### W20 was ours to call, and his own doubt is why

He asked for Back beside Continue, stuck to the page, and then immediately
doubted it against W17: *"I might [be wrong] if we do an estimated time. Figure
out what it looks best."*

Measured, it is not close. As a block at the foot of the column, Back cost 48px
plus the 26px section gap above it — **74px of the budget on every step but the
first** — and W16, which he stated as the general rule, is what this whole item
is organised around. It also reaches now: at the bottom of a scroll, Back was
the one control you had to scroll to find.

His doubt does not survive contact with where W17 actually went. The estimated
time rides the bar's EYEBROW, beside the words "Estimated total", not beside the
figure: the figure is the thing being decided on and the one mono number in the
bar, so a second number next to it would make two leads. The bar is
`[← icon] [ESTIMATED TOTAL · 3 HRS / $220] [Continue]` and nothing is crowded.

### W1 was not where the roadmap pointed

The roadmap read W1 as the calendar CELL. **The cell has been a whole-box
`<button>` since the day sheet was built**, so on that reading the item was
already finished and would have been closed as "does not reproduce" — the same
failure mode W14 nearly had in 2.6, arrived at from the opposite direction.

His sentence names the panel FIRST — "clicking a date opens a panel with Block
this day, Set hours and Drop-off only" — and only then says "you should be able
to click anywhere in that box". The box is one of the three cards INSIDE that
panel, and "that specific little button" is the Set / switch on its right.

**One thing a whole-card tap deliberately will not do is UNDO.** Clearing a
blockout, a set of hours or a restriction stays on its own explicit control. A
300px target that silently unblocks a day is a worse bug than the one W1 is
about, and the asymmetry is the point rather than an oversight.

### W3's range is N rows, not a second end on the row

`blockout_dates` and `dropoff_only_periods` already had `start_date` and
`end_date`, so W2 and W4 were fields on a form. `booking_hours_overrides` is
keyed one row PER DATE (`unique (business_id, date)`), and the temptation is to
give it a range the way its siblings have one.

It writes N rows instead, and that is the table doing what it was built for: an
override is a fact about ONE DAY, the weekly schedule is the thing that speaks
in patterns, and clearing one day later must not disturb the others. The write
is capped at 366 days because the field is a free `<input type=date>` and a
mistyped year would otherwise ask for 36,000 upserts.

### W4 was a live hole wearing a feature request

He asked for the drop-off-only control to follow the detailer's own settings.
Building it meant reading `dropoff_only_periods`, and reading it turned up
this: **the table reached the customer as a NOTE on the booking page and
nothing else.** Nothing on the way IN ever looked at it. A customer could read
"This day is drop-off only" and book a mobile job anyway, and the detailer
found out on the day.

The guard went into `_shared/slotValidation.ts` rather than into
`create-booking`, because `reschedule-booking` and `update-booking` move a
booking's date with exactly the same freedom and had exactly the same hole.
One guard where all three meet — the same reasoning that put the reminder
re-arm on a table trigger in phase 0 rather than inside `reschedule-booking`.

The `mode` column is `dropoff` or `mobile`, defaulting to `dropoff` so every
existing row keeps the meaning it was written with. **The table's name is now
half wrong and it is staying**: renaming it would touch the dashboard, the
slots function and the booking page for no behaviour, and migrations here are
append-only.

**The customer-facing half is that a restricted day stays OPEN in the calendar
rather than going grey.** Filtering it to nothing would have been simpler and
says only "closed"; opening it says which way the day is restricted and that
going back a step fixes it. Either way `validateSlot` is the gate.

### W6: what "the standard online" turned out to mean

He was explicit about not wanting an invention — *"whatever is the standard
online for the different amount of ranges"* — so `app/src/lib/periods.js` is a
list of borrowed conventions with the reasoning written next to each:

- **The comparison is the SAME period one step back.** This week vs last week,
  this year vs last year. Comparing a part-finished week against a whole one is
  the classic wrong number.
- **Six months and a year ROLL off the current month**, not calendar halves and
  not a fiscal year. A detailer has no fiscal year.
- **The week starts Sunday**, matching both calendars already in the product.
- **Lifetime does not step**, because there is only one of it, and it charts by
  YEAR — every other kind charts itself, but "the last six lifetimes" is not a
  thing.

**Lifetime was anchored to `businesses.created_at` first and read $0.00 with
three years of takings on the screen behind it.** The row is created when the
detailer signs up; their HISTORY can be older, because bookings get seeded,
imported and back-dated. The account's birthday is not the business's. It
reaches back ten years now, the same as the Calendar's "Everything" filter, so
the two screens agree about what "all" means.

**Two defects that a month-only screen could never have shown, both found by
looking at the result rather than by reading the diff:**

- `money()` printed `$-189.00` for a net-negative week. Nothing was wrong with
  the arithmetic — the minus was inside the amount instead of in front of it,
  and it reads as a corrupted figure rather than a loss. Fixed in the one
  formatter, so every caller gets it.
- **The bar chart plotted `Math.abs(value)`, so a $189 LOSS drew the identical
  bar to a $189 win.** Survivable while the screen only ever showed months;
  not once a week is selectable, where "expenses, no completed jobs yet" is a
  normal Tuesday. Negative bars are the fixed `--bad` red now, carrying
  selection the same way the positive ones do — dim either side, full strength
  for the one you are on. That is law 11b rather than a new mechanic: money
  moving is MEANING, and it is the same red `.delta.down` already used.

### Why five items were left unbuilt

W9, W10, W21, W22 and W25 are not deferred out of time pressure. Each one
decides a SHAPE that roadmap 2.8's research exists to fix: what fields a
service needs (W9), whether add-ons group or reorder (W10), how a service shows
its full contents (W21), which on-site resources a detailer must have (W22),
and whether packages exclude each other (W25). Every one of them is a schema
question, and 2.8 is explicitly sequenced before them in the roadmap — "do this
BEFORE the parts of 2.7 that depend on it, not after."

Building them now would freeze a guess into a migration, and migrations here
are append-only. W22 is the sharpest case: the water-and-electricity question
exists in the product *because of his own business*, and he is the one who said
most detailers are not like him. Guessing a second time is the failure mode
this ordering was designed to avoid.

### The class-name leak caught one more, and the test earned its keep

W18's group label was called `.bk-step-label.group`, and `tests/composition.test.mjs`
test 4b failed on it inside a minute: **`theme.css` declares `.group` bare and
`theme.css` is GLOBAL**, so the name would have reached into the booking page
and made the label a 26px-gap flex column. It is `.bk-group` now. This is the
tenth rename in that family and the first one a human did not have to find.

### What W4 broke elsewhere, and what found it

Giving `dropoff_only_periods` a `mode` changed the meaning of a table four
other places already read, and three of them were wrong the moment the
migration landed. None of it showed up in a test; it came from asking "who
else reads this" after the feature worked.

- **The month grid's ring was hard-labelled "Drop-off only"** in both the cell
  tooltip and the legend, so a mobile-only day would have been marked with a
  plain lie. **It is ONE mark for both restrictions now** and the tooltip says
  which; the legend reads "One type only". A second FORM was the obvious move
  and it is the wrong one: `docs/dashboard-skeletons.md` §5b makes the marks
  form-first precisely so no two that can share a cell share a shape, and
  inventing a sixth form to split a distinction the day sheet spells out one
  tap away buys nothing.
- **The dashboard's new-booking modal and the customer's reschedule page both
  offered every time the business had open**, including the ones
  `validateSlot` was now going to refuse. Not a data risk — the gate holds —
  but a form you fill in and then get a 409 from is the same defect W4 fixed,
  one screen over. Both filter now, through `slotsForType()` in `lib/api.js`:
  one function beside the call whose payload it interprets, rather than the
  same three lines in three screens.
- **`scripts/e2e-booking.mjs` walked the flow by COUNTING Continue clicks**,
  and W19 inserted a step. Riverside, the tenant it books at, has an add-on —
  so the script was a step behind for its whole run and typed a street address
  into the vehicle-model field. It advances by HEADING now, which survives the
  next inserted step too. Two of its field fills were also targeting `input`
  by index and had phone and email the wrong way round; they target by type
  now. **Flagged honestly: that script's chromium path is Linux-only, so this
  change is reasoned, not run.** The same technique is exercised on every run
  of `sweep-booking-steps.mjs`.

The pattern worth keeping: **a column added to a shared table is a change to
every reader of that table, and the readers do not announce themselves.** The
grep that found all four was `dropoff_only` across `app/src` and
`supabase/functions`, and it took a minute.

**And a fifth, from asking the same question about `settings` rather than about
the table.** W4's card is hidden for a business that only works one way, which
means it reads `business_settings` — and **staff never see
`business_settings` at all.** The policy is owner-only to READ and it returns
staff zero rows rather than an error (PROJECT-STATE §6, "future staff screens
must use edge functions"). So a staff member's `settings` is null forever, and
treating the unknown as "both" would have printed *"Mobile and drop-off both
bookable"* to the one person the app cannot check that claim for — on a
mobile-only business, simply false.

The split is on where the fact comes from. **An existing restriction always
shows**, to staff included: it is a row in `dropoff_only_periods`, which they
can read, and it is worth knowing before they load the van. **The "both
bookable" resting state only shows to someone who can see the settings behind
it.** Verified by signing in as each: the owner gets three cards, the staff
account gets two, and with a mobile-only period set on the day the staff
account gets all three and reads "Mobile only — no drop-offs".

The general form, and it is worth carrying into Phase 3's tenant sites: **a
zero-row RLS read is indistinguishable from "the answer is no". Any default
applied to it is a claim, and the honest default is to say nothing.**

## Roadmap 2.8

**Research, not a build.** The five items 2.7 left open — W9, W10, W21, W22,
W25, plus the W27 thread — were all questions about what a detailer's
catalogue and constraints actually look like, and the reason they were held
back is that a guess would have been frozen into an append-only migration.
The full record is `docs/detailer-research-2026-08-31.md`: five real detailing
businesses' published menus and booking flows, one long thread of working
detailers talking to each other, three trade software vendors, and the trade's
pricing guides. What follows is only the judgment calls.

**Five menus is not a survey, and the file says so in its second paragraph.**
That matters more than it looks: the questions being asked are all of the form
"is our shape normal, possible, or impossible", which five real catalogues can
answer and a statistic could not. Anything that would have needed a real
sample size was left undecided rather than dressed up.

### Two of the five were misfiled as schema work

This is the finding that changes the most work. **W10 (add-on grouping or
reordering) and W21 (a service's full details) need no migration at all.**
`add_ons.sort_order` and `services.features` have both existed since the
foundation migration, the Catalog query already orders by `sort_order`, and
**no UI anywhere writes either one.** Both items are screens over columns that
are already there.

The lesson generalises past these two: the schema was built ahead of the UI in
several places, and "this needs a migration" was assumed rather than checked.
Grep the migration before sizing a catalogue item.

### W10 is reordering, and the groups he asked about would be wrong

He offered both — *"groups maybe… or maybe you could reorder stuff"* — and the
evidence picks one. Real add-on lists are short: 3, 6, 7 and 9 items across the
menus studied, and **not one of them groups.** Nine items under a single
heading is what the largest looked like. A groups table would be building for
a detailer none of the five resemble.

**The asymmetry with services is deliberate and worth writing down**, because
it looks like an inconsistency and is not: services DO group in the wild
(interior / exterior / protection / complete), `services.group_label` already
exists, and step 1 already renders it as a heading. Add-ons do not group and
should not get the same column.

### W21 is a live trap, and its ordering is not negotiable

`StepServices.jsx` renders `services.features` inline on the booking card,
capped at five entries. That is harmless today for exactly one reason: nothing
writes the field. **The moment W9 ships an editor for it, every tenant who
fills it in breaks W16 on step 1.**

Roadmap 2.7 measured step 1 at 18px of phone headroom with four services and
no inclusion lists. The menus studied run 5 to 10+ bullets per package. So the
rule is: **the disclosure control ships before or with the features editor,
never after.** That is not a preference and it is not the owner's call — it is
the difference between shipping a feature and shipping an overflow.

It is also why 2.7 named W21 as the lever for step 1's ceiling. It is the only
item that makes a card's height independent of how much the detailer wrote in
it.

### W22: the owner's premise was backwards, and saying so is the point

He added the *"I can provide access to water and an outlet"* question **for
himself**, believing he was the unusual one — no tank, no generator, and
*"most detailers do."* The research says the opposite: most working mobile
detailers use the customer's tap and the customer's outlet, ask when booking,
and report customers almost never object. Tanks appear as rarely-used backups
or as kit for commercial sites with no tap, and the businesses that ARE
self-sufficient sell it as a premium differentiator — which only works if it
is not the norm.

**So the customisation he asked for is smaller than he feared.** What varies is
not whether to ask; it is which resource, and what happens when the answer is
no.

The second-order finding is the one that sets the shape: **water and power are
independent.** A rinseless operator needs neither; a coating specialist working
in a customer's garage needs power and no hose. One boolean —
`business_settings.ask_water_electric`, `bookings.has_water_electric` — cannot
express either case on either side.

Decided: `water_requirement` and `power_requirement`, each `not_needed` /
`ask` / `required`, both defaulting to `ask` so no tenant's booking page
changes on migration day; `has_water` and `has_power` on bookings, nullable so
"not asked" stays distinguishable from "no". Two columns and two columns, no
new table, and it covers all three of his asks plus the electricity-only case
he named.

**The block goes in `_shared/slotValidation.ts`.** W4 in roadmap 2.7 found a
hole of exactly this shape — `dropoff_only_periods` reached the customer as a
note on the page and nothing on the way in ever read it, so a customer could
read the rule and book against it anyway. A `required` resource enforced only
by grey-ing out a React button is that bug a second time.

### W25 is one boolean, and the reason is where the exception falls

Four of the five real menus are pick-one. The fifth is genuinely multi-select —
but it is a shop whose **entire** menu is a la carte, not a shop that mixes
exclusive tiers with combinable items in one list. **That is what makes it one
setting rather than a per-service flag or a per-group rule**:
`business_settings.services_single_select`, recommended default on.

`group_label` is free text on the service rather than a groups table, so
group-level exclusivity would have meant a new table to hang the rule on. The
`services` / `add_ons` split we already have is the trade's own split — a
package plus extras — and it does not need a second mechanism layered on it.

### W9's honest answer is that the price is a floor, not a price

**All five menus publish a from-price or a range**, and the trade guides give
the same reason: condition decides labour hours and detailers price after
seeing the vehicle. Part of that spread is vehicle size, which we model. The
part we cannot express is that the number is a starting point. One boolean,
`services.price_is_from`, changes what the figure claims without changing any
arithmetic — it is owner decision 3 because it changes what a customer reads.

**The only schema-blocking part of W9 is the vehicle classes**, and it is
blocking for a specific reason: `bookings.vehicle_size` is a CHECK constraint
pinned to `('small','medium','large')`, so adding a class is a migration.
`services.vehicle_size_adjustments` is jsonb and would not have cared. Three is
below the trade norm of five — our "large" is doing the work of a pickup and a
full-size van, which are not the same job — but going to five adds setup work
for every tenant and touches every stored booking, so it is his call, and it is
the one of the four that gets more expensive the longer it waits.

Two more real gaps were found and deliberately left: **a service that cannot be
done mobile** (coatings need a garage; we model mobile-vs-drop-off per business
and per date, and the missing third level is per service), and **cure/hold
time**, which a single `duration_minutes` and a single contiguous slot cannot
express. Neither is named by an owner item. Deposits are the trade's standard
answer to no-shows and are blocked on billing, which charges nobody.

### W27: he was right, and three of the four gaps close for free

Real forms collect four things we do not. Parking/access notes — our "Anything
we should know?" box already covers it, a placeholder word rather than an item.
"How did you find us?" — we have campaigns, visits and `referral_code_used`,
which is a stronger instrument than a self-reported dropdown. Structured
year/make/model — every real form asks, but **nothing in this product would
read it**, and four fields of step height against W16 buys nothing; the one
free-text box stays until something needs the parts. Interior condition is the
one real gap, it is owner decision 4, and it pairs with the from-price: a
starting price is honest only if the detailer is told what they are driving to.

### Nothing was built, and that was the call

2.8 is a research item; the five builds are 2.7's. **Three of the four owner
decisions change the migration**, and migrations here are append-only, so
writing one before he answers would have meant guessing — which is the exact
failure this item exists to prevent. What was written instead is the migration
in full as a specification, plus a build order, so the next session does not
re-derive either.

## The owner's answers to 2.8, and the one that overruled the research

He answered all four decisions on 2026-08-31, the same day they were asked.
Two came back different from the recommendation, and **one of those replaced a
conclusion this project's own research had reached** — which makes it the most
useful entry in the item.

### He was the sixth menu, and five was not enough to find that out

The research studied five real detailing menus and concluded W25 was one
boolean on the business: four of the five let a customer pick exactly one
service, the fifth was wholly a la carte, so the split looked like a per-BUSINESS
property. That reasoning is sound and it is still in
`docs/detailer-research-2026-08-31.md`, marked superseded rather than deleted.

**It was wrong because his own business is a shape the five did not contain.**
Interior packages, exterior packages, and add-ons — *"they could click one from
each category."* One business-level boolean cannot express that: pick-one stops
him selling an interior AND an exterior, and pick-any restores the exact overlap
W25 exists to remove.

**The lesson is about the sample, not about the answer.** The research file
opens by saying five menus is not a survey; what that warning did NOT say
clearly enough is the specific failure mode. **Five real menus are enough to
rule shapes IN — "this is normal, this is possible" — and are not enough to
rule the remaining ones OUT.** Every conclusion of the form "so the rule can
live at level X" was quietly an exhaustiveness claim the sample could not carry.
The one detailer whose menu we can interrogate properly is the owner, and he
was not in the sample.

Worth carrying into Phase 3: when research narrows a shape, state which
direction the evidence runs. "Four of five did X" supports "X must be
possible"; it does not support "nothing else happens".

### The rule lives on the category, and the pattern is borrowed, not invented

Decided: a `service_groups` table — `name`, `sort_order`, and **`max_select`**
— with `services.group_id` pointing into it. `max_select = 1` is pick one,
`null` is pick any.

This is the restaurant point-of-sale **modifier group**, which has solved
exactly this problem for decades: a group of choices with a minimum and a
maximum number of selections, where "choose one" is min 1 max 1 and "choose
any" is an unbounded max. Toast, Lightspeed and the delivery platforms that
sync to them all model it that way. The trade's own menu-building advice
independently describes the same architecture for detailers — interior
services, exterior services, bundled packages, a la carte — and says explicitly
not to force customers into one pattern.

**`min_select` is deliberately NOT built.** The POS systems need a minimum
because a burrito has no equivalent of "the order must contain something"; we
already have that rule globally — a booking needs at least one service — and
nothing in the evidence needs a per-category minimum. It can be added later
without disturbing anything.

**`max_select` is an integer rather than a two-way switch** even though the
editor is a two-way switch today. Same storage, same UI, and an integer never
needs a second migration if "up to two" ever appears. Migrations here are
append-only, so cheap generality in a column type is worth taking where cheap
generality in code would not be.

### Why a table, when a jsonb blob would have been smaller

The cheaper shape was an ordered `[{name, max_select}]` on `business_settings`,
matched to the existing `services.group_label` text by name. It was rejected on
one failure mode: `group_label` is free text typed per service, so **retyping a
label creates a second category with no rule attached, which falls back to
pick-any.** That is a live customer-facing booking page silently reverting to
the behaviour W25 exists to remove, on a money path, with nothing to notice it.

A category is a thing the detailer creates, names and orders. It gets a row.
`group_label` is kept — append-only — and the migration backfills one group per
distinct label per business with `max_select` null, so no booking page changes
behaviour on the day it runs.

### Vehicle sizes: he chose customisable, and he was better evidenced than we were

The research recommended five fixed classes. He said the detailer should define
their own list, and **his answer is better supported by our own evidence than
the recommendation was**: of the menus studied, one uses twelve vehicle classes
and one uses five. Twelve and five is a range, not a norm, and "five" was the
median of a sample of two dressed up as a standard.

The blocker is unchanged and is the reason this was the schema-blocking part of
W9: `bookings.vehicle_size` is a CHECK constraint listing three values.
`services.vehicle_size_adjustments` is jsonb keyed by size name and
`_shared/pricing.ts` looks the key up rather than switching on it, so the
pricing engine never cared.

**One thing that is not optional: snapshot the label on the booking.**
`vehicle_size_fee` is already snapshotted and `booking_services` snapshots price
and duration, for the same reason — a detailer who renames or deletes a size
must not rewrite the record of jobs already done. Without
`bookings.vehicle_size_label`, last month's invoice starts printing a key that
no longer resolves.

### The measurement his answer forced, and it is the biggest finding of 2.8

Roadmap 2.7 wrote that W16 "cannot be true in the absolute for a list the
detailer controls" and left it as a principle. His answer on categories made it
concrete enough to measure, so it was measured — at 392x844, against the
running dev server and the seeded demo, by restructuring step 1's DOM into his
menu shape in the live page. Same CSS, same box model, no data changed.

| | |
|---|---|
| today: 4 services, 4 category headings | fits, **18px spare** |
| one service card | **97px** |
| one category heading | **17px** |
| **his menu: 2 categories, 3 services each** | **119px OVER** |
| the same, with the description folded off the card | **18px spare** (card 74px) |

**The owner's own real menu does not fit step 1 on a phone today**, and the
thing that fixes it is one change: the face of a service card becomes its name,
its price and its length, and the description joins the inclusion list behind
W21's control.

That is a change to what the research file originally said — W21 was written up
as being about `features` alone. **It is also a change in sequencing**: W21
stops being a sibling of the categories work and becomes its prerequisite,
because it is the only one of the five items that takes height OFF step 1 and
every other one adds.

The vehicle step has the same shape now that sizes are tenant-defined: 238px
spare, 79px per size card, so **six sizes fit a phone and the seventh does
not.** Past six it needs something denser than cards — a dropdown, which
`composition.test.mjs` permits above four options, the 2-to-4 range being the
segmented-control rule.

**The general form, and it is the third time this project has met it:** a
number measured against the demo business is a fact about the demo business.
Step 1's 18px, and now step 3's 238px, are the tenant's budget rather than
ours, and the honest question is never "does it fit" but "how much of it does
the detailer get to spend".


## Roadmap 2.8b — building the five, and three numbers that moved

The research (`docs/detailer-research-2026-08-31.md`) and the owner's four
answers left nothing to decide about *shape*. What follows is the calls made
while building it, and — more useful — the three measured numbers this project
had written down that turned out to be wrong once the code existed.

### The order was not a preference and it held

W21's disclosure shipped first, before the `features` editor, because
`StepServices.jsx` rendered that column inline and an editor without a
disclosure arms a step-1 overflow for every tenant who fills it in. Built in
that order, and the prediction was exact: a service card is **74px** on a
phone with its description folded away, against 97px with it. The owner's own
menu — two categories of three, which the demo seed now is — fits step 1 with
**47px spare at 392x844**.

### Step 1's binding screen is 1440x900, not the phone

This is the correction that matters most, and it was found only by running
`sweep-booking-steps.mjs` at **all four** verification sizes rather than at
the one every note about this item talked about.

A service card is **84px** at 1440x900 and 74px at 392x844 — `.bk-card`'s
padding is `clamp(15px, 3.6vw, 20px)`, so a desktop card is 10px taller — and
900px is the shortest screen we verify. Six services in two categories was
**19px OVER** there while the phone had 28px spare.

The fix was copy, not layout. With every category label printing "· choose
one", the step's intro sentence ("Choose one from each category you want…")
said what the screen already said three times, and it cost 19px on a desktop
and 38px on a phone because it wrapped. It is dropped wherever the categories
carry the rule and kept wherever they do not — a business with no categories
still needs to be told how many it may take. 1440x900 now has **10px spare**.

**So the next thing to break step 1 is a seventh service, and it breaks on a
laptop before it breaks on a phone.** Every previous note in this repo says
the phone is the constraint. It is not, any more.

### The vehicle-size ceiling is FOUR, and the research's six was not wrong when it was taken

2.8 measured step 3 at 238px spare, 79px per size card, and concluded six.
That measurement was taken before W27's condition question existed — and W27
lands on the same step, costing 120px. Re-measured with it in:

| sizes | 392x844 | 1440x900 |
|---|---|---|
| 4 | fits, 39px spare | fits, 23px spare |
| 5 | **over by 40px** | **over by 66px** |

So four cards, and a drop-down from five. Two things worth keeping from this:

- **The ceiling landed on the line the design system had already drawn.** A
  choice of two to four is a segmented control; anything longer is a list
  (`composition.test.mjs` test 2). The measurement and the law agreed without
  being made to, which is the only reason a `<select>` appears on this page at
  all.
- **A ceiling measured before a sibling feature lands is a ceiling with an
  expiry date.** Both numbers in this repo were honestly measured; the later
  one is real. Any note quoting a spare-room figure should say what was on the
  step when it was taken.

### The category rule swaps rather than refuses

`max_select = 1` could have disabled the other cards in the category. It
doesn't: tapping a second service in a "choose one" category swaps the first
out. A control that does nothing when pressed reads as broken, and the owner's
original W25 complaint was about being *confused* by step 1 — an unexpected
swap would have been the same complaint in a new costume. So the label states
the rule ("EXTERIOR · choose one") **before** anything is tapped, and the swap
is then the behaviour it promised.

Written as a cap, not a boolean, throughout — `siblings.length - cap` — so
"up to two" is already implemented if a detailer ever wants it.

### Both server guards were built as guards, not as validation

W4 in roadmap 2.7 found a rule the customer could read on the booking page and
book straight past, because nothing on the way in ever read the table. Both of
2.8b's new rules had the same shape available to them, so both are enforced in
the edge function and both have a test:

- **The category cap** is in `create-booking`, which is the only path that ever
  writes `service_ids`. `resolveServices` now selects `group_id` — in
  `_shared/pricing.ts`, so calculate- and create-booking still resolve services
  through exactly one implementation.
- **The water/power block** is in `_shared/slotValidation.ts` beside W4's, as
  the research directed.

`tests/booking-engine.test.mjs` tests 13 and 14 prove both, and test 14
deliberately proves the negatives too: "just ask" must NOT block (a detailer
who turns asking on would otherwise start refusing half their customers), and
a drop-off job is never blocked because the customer supplies nothing there.

**One deliberate narrowing, recorded because the research's wording is wider.**
The resource guard reads two OPTIONAL parameters, and reschedule-booking and
update-booking pass neither. It is genuinely at the junction — but unlike W4's
rule, which varies by DATE and so has to be re-checked every time a booking
moves, a resource answer does not change when a date does. Re-checking it on
reschedule would mean that a detailer switching to "must have" locks every
existing customer out of moving their own appointment, which punishes the
customer for a change made after they booked. The parameter is there; the two
callers that are not setting the answer do not pass it, and the guard skips.

### Deactivate moved off the Catalog row, and measurement is why

The reorder arrows (W10) need two 38px controls per row. A 392px row cannot
also hold "Deactivate". Rather than shrink anything, activate/deactivate moved
into the editor sheet, where it also belongs on its own merits: reordering is
something you do to the LIST; active is a property of the thing, and the sheet
is what edits properties. It costs one extra tap on a rare action, and it made
a previously impossible action possible.

### `group_label` is still written, and that is not an oversight

Every service save writes `group_id` **and** `group_label` (the chosen
category's name). The migration is append-only, the old column is what the
public-profile RPC's fallback reads, and `StepServices` prefers `group_id` and
falls back to the label so a service written before the migration still
appears under its heading. Same pattern for `has_water_electric`, which is
written as `has_water && has_power` alongside the two new columns: everything
deployed before 2.8b still reads the old one. Neither is retired until nothing
reads it.

### The disclosure is a real button, so the card stopped being one

`.bk-card` on the services step was a `<div role="button">`. Putting a second
control inside it would have been interactive content nested in interactive
content — the one thing `role="button"` must not contain, and some screen
readers never reach it. So the service card is a plain box now, holding two
real `<button>`s: the face (which carries `aria-pressed` and the service name
as its label) and the eye (`aria-expanded` + `aria-controls`). The padding
moved off the card and onto the controls, or half the card would have stopped
being a target.

Two consequences worth knowing before touching it:

- **The name is a `<span>`, not an `<h3>`.** A heading is flow content and a
  `<button>` may only contain phrasing content, so `<button><h3>` is invalid
  HTML. `.bk-h3` carries the h3's own type rules. It reads better anyway: an
  `aria-pressed` button labelled with the service name says more than a heading
  sitting beside a click target.
- **Only `.bk-svc` did this.** The extras, the vehicle sizes and the two
  location cards are still single-action cards and were left alone — there is
  no second control in them to nest.

The panel opens as a zero-height grid row (`grid-template-rows: 0fr → 1fr`)
rather than unmounting, so it opens and closes on one easing with no JS
measuring, and `visibility` rides along so the words are out of the
accessibility tree while they are out of sight. Clipped text a screen reader
still announces is worse than no disclosure at all. The inner `<div>` is
load-bearing: a grid item's own padding sits outside the row height, so
padding on the animated element leaves the card 40px taller while shut.

### Two defects were found underneath this item, and neither was ours

**Saving ANY settings screen threw you out of it, and had done since the
dashboard was built.** `BusinessContext.reload()` set `loading = true`, and
`App.jsx` renders a full-screen spinner while that is true — which unmounts
every screen, including whatever sheet you were standing in. Six callers do
this; Booking rules, Appearance and Business info all bounced the detailer
back to the More list on Save. It was invisible enough to survive the owner’s
whole walkthrough because it happens at the END of those flows. The vehicle
size editor writes on every arrow press, so it turned a wart into something
unusable, which is how it was found.

Fixed at the root rather than in six callers: `loading` now means "we do not
know who the tenant is yet", not "a refetch is in flight". It is keyed on the
user id, not on a bare boolean, because a DIFFERENT user signing in genuinely
has to show the spinner or the new tenant briefly wears the old one’s data.
Verified both ways: Booking rules Save now keeps its sheet open; sign-out and
sign-in still show the spinner.

**`scripts/e2e-booking.mjs` cannot run on this machine and has not been able
to for some time.** It hardcodes `/opt/pw-browsers/chromium-1194/...` and a
`/tmp/claude-0/-home-user-detailing-platform/...` scratch path — a Linux
container that no longer exists. It is NOT in CLAUDE.md’s verification list
and nothing depends on it, so it was left alone rather than fixed blind in an
item it has nothing to do with. **Roadmap 2.5 is the smoke test, and this is
the script it will reach for**, so the note is there too.

**The general form, and it is now the fourth time this project has met it:** a
number measured against one screen is a fact about that screen. 2.6 learned it
about widths, 2.7 about the demo's four services, 2.8 about the tenant's
catalogue — and 2.8b about which of the four verification sizes is actually
the tightest, which turned out not to be the one anybody was watching.


## The owner asked whether the categories were actually researched, and found a hole

He asked the same day 2.8b shipped: was the category system researched, will
it work for all detailers, and does it need a rule where choosing from one
category stops you choosing from another.

**The first answer had to be an admission.** 2.8b did no research of its own —
it built what roadmap 2.8's research specified, which studied five real menus.
That file's own second paragraph says five menus can rule shapes IN and cannot
rule the remaining ones OUT, and that limit had already cost this project once:
his own business was a sixth shape the sample missed. He was poking at the same
limit, and he was right to.

The new research is `docs/detailer-menu-shapes-2026-08-31.md` — five more real
menus (ten now) plus what Zenbooker, Square Appointments, Toast and Thryv
actually expose as settings.

### The hole is real, and it was reproduced rather than argued

**Oregon Detail Co** — a real shop — publishes *Full Detail Packages*,
*Interior Detailing* and *Exterior Detailing* as three separate categories.
Built in our system with each set to "customers pick one", which is the honest
way to describe each of them alone, a customer can select the $625 complete
package **and** the $320 interior **and** the $700 exterior: $1,645 for work
the first one already contains.

That menu was loaded onto the demo and put through the real page and the real
function on 2026-08-31. The page allowed all three. The price bar read
**$1,645.00 · 15 hrs**. `create-booking` returned 409 the first time — but for
*"that service would run until 23:00, past our 18:00 close"*, the hours guard,
which runs after the category check. With the durations shortened so the day
fits, the same three services **booked successfully at $1,645**.

Neither half of the enforcement sees it, and neither is broken: `max_select`
counts inside ONE category and there is exactly one service in each. The
relation it cannot express lives between categories.

**It is roadmap 2.7's W25 complaint, one level up.** He ticked "Full Detail"
and "Interior" together and found it confusing; the system built to stop that
reproduces it as soon as a detailer files their packages tidily.

### Pairwise "category A excludes category B" was rejected, and it is his idea that replaces it

His words were the pairwise shape, and rejecting the mechanism is not rejecting
the point. Two reasons, both from evidence:

- **Nothing in this market exposes it.** Zenbooker's modifier group has a name,
  a description, Required and Multi-Select — and nothing else. Square
  Appointments has one business-wide *"Allow multiple services to be booked
  online"*, off by default. Toast has min/max per group and *nested* modifiers
  that drill down, never sideways. Thryv does make services incompatible, but
  it **derives** that from what they already are (same location, staff,
  availability) and the business never hand-configures a pair.
- **It does not scale for the detailer.** Xclusive Detailing Customs runs six
  categories; saying "one service, please" would take thirty pairwise
  decisions at setup.

**Recommended instead: one boolean per category — "choosing from this category
is the whole booking."** Selecting anything inside it clears everything else.
It covers every shape in the ten menus, including two our current model cannot
express:

| Menu | Expressed how |
|---|---|
| Atlanta, SBL, Felix | one category, pick one — works today |
| **Oregon Detail Co** | mark *Full Detail Packages*. Interior and Exterior stay combinable, which is what that shop wants |
| **Xclusive**, one service overall from six categories | mark all six. Six checkboxes, not thirty pairs |
| **The owner's** | mark nothing — Interior and Exterior stay one-each, exactly as 2.8b built |
| à la carte | no categories, or pick-any — works today |

A business-level *"can they book more than one service"* switch was the other
candidate, copying Square. It handles Xclusive and the four one-service menus
and is simpler — but it is too blunt for Oregon Detail, which wants a
standalone interior and a standalone exterior combined, just never with the
complete package. The per-category switch does both; the business-level one
cannot.

**Not built without him.** It costs every detailer one more setting to read
past and it changes what a customer can do — the same test the four decisions
in roadmap 2.8 were handed over on. Roadmap 2.8c holds it.

### The general form, and it is the fifth time

A rule measured against one level of the structure is a fact about that level.
`max_select` is correct about what it counts. What it could not see was the
level above it — and nothing in the code was wrong, which is exactly why a
test would not have found it and a real menu did.
