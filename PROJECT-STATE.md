# PROJECT-STATE.md

Investigated 2026-08-28, updated through 2026-08-30, by reading the files cited below. Claims not backed by a read are marked **(guess)**.

## 1. WHAT IT IS

Multi-tenant SaaS giving independent car detailers a professional website with online booking built in. Converted from a single-business site ("Andrew's Auto Detail" — the old code is kept read-only in `reference/`, 2.5 MB, never deployed). Three audiences from one React bundle: prospects on the marketing page (`/`), detailer-owners in a phone-first dashboard (`/app`), and their customers on a public booking page (`/book/:slug`).

**Two things to know before anything else (2026-08-30).** **(1) ~~`main` does
NOT have the 2.3 dashboard.~~ IT DOES — published 2026-08-30 on the owner's
explicit go-ahead**, so detailingplatform.com now serves the new dashboard
behind its sign-in page. He also stated the stakes, which is the part worth
carrying forward: **the live site is his private preview, not a launched
product** — *"no one knows about it, only me. And it's not going out until
everything's finished."* Still ask before merging to `main`; just know the
answer is usually yes and why. **(2) There is a simple demo login now**, so
the dashboard can actually be looked at:
`demo@detailplatform.com` / `demo123` (owner) and
`demo-staff@detailplatform.com` / `staff123` (staff). Guessable on purpose and
temporary — they reach the demo business only, and they must change before
there is a real customer. See DECISIONS.md, "A guessable demo login".

**State: late beta, pre-revenue — and PUBLIC as of 2026-08-30.** detailingplatform.com serves the redesigned marketing page (roadmap 2.2), on the owner's explicit instruction and against the recommendation to wait. **One of the two consequences of publishing mid-phase is now closed: the dashboard behind it was restyled in roadmap 2.3 (2026-08-30), so a visitor who presses "Get started" no longer meets the old look.** The other stands — billing still charges nobody. Note that 2.3 is on the branch and NOT on `main` at the time of writing, so the live site still shows the old dashboard until someone merges. See DECISIONS.md.

 The engine works end to end (real bookings have been made), 11 test suites exist, a private Netlify test deploy exists — but transactional email now works (fixed and proven delivered 2026-08-29), the reminder scheduler is now wired and proven (2026-08-29), billing is not implemented ("nothing charges anyone" — DECISIONS.md), and signup is brand new. Sources: `docs/HANDOFF.md`, `DECISIONS.md`, git log.

## 2. STACK

- **Frontend:** React 18 + Vite 5, `react-router-dom` 6, `lucide-react` icons, `@supabase/supabase-js`. That is the *entire* dependency list (`app/package.json`) — no UI library, no CSS framework, no state library.
- **Fonts: exactly two, since 2.3** — Archivo (one variable face worked across `wdth` 62–125 and `wght` 100–900) and JetBrains Mono for every figure. `app/index.html` went from five families to two in one edit when `theme.css` stopped using Anybody / Public Sans / DM Mono.
- **Styling:** three hand-written plain-CSS files, ALL now "The Thread" — `app/src/theme.css` (the dashboard, rewritten in 2.3 and now the system's home in the app: the sixteen tokens live on its `:root`), `landing/landing.css` and `book/booking.css`. The other two keep their `.ld` / `.bk` scopes: the original reason (`:root` flipping with the light/dark switch) died with the switch in 2.3, but each file staying self-contained is what makes it diffable against the approved reference rendering, and `theme.css` is still a GLOBAL sheet that leaks into both. `tests/design-contrast.test.mjs` pins all three token sets against each other. See `docs/design-system.md` § Tokens.
- **Database:** Supabase Postgres, 16 migrations in `supabase/migrations/` applied in filename order. RLS is FORCEd; tenant isolation and double-booking prevention are enforced in the database (exclusion constraint), not the app.
- **Backend:** 18 Deno edge functions in `supabase/functions/` (booking CRUD, slots, pricing, email, invites, push, promo, founding offer). All consequential writes go through them; the browser client does reads and settings-writes behind RLS (`app/src/lib/api.js` header comment).
- **Auth:** Supabase Auth — email/password plus Google sign-in (`git log: "Google sign-in that switches itself on"`); email confirmation deliberately off (DECISIONS.md).
- **Hosting:** Netlify serving `app/` as an SPA (split config: root `netlify.toml` sets `base="app"`, `app/netlify.toml` has build/redirects/headers — both duplicate `SECRETS_SCAN_OMIT_KEYS` on purpose). HANDOFF.md says auto-publish from `main` → detailingplatform.com; an older DECISIONS.md note says deploys were manual uploads — HANDOFF is newer, but verify before relying on it.
- **Email:** Resend (broken — see §5). **Deploys of DB/functions:** `scripts/apply-migrations.mjs` and `scripts/deploy-functions.mjs` via the Supabase Management API — no CLI needed.

## 3. STRUCTURE

Routes (`app/src/main.jsx`, verified by `tests/route-contract.test.mjs`):

| Route | What | Session context |
|---|---|---|
| `/` | Marketing landing (`landing/LandingPage.jsx` 597 lines + `landing/thread.js` 682, restyled in 2.2) | none |
| `/book/:slug` | Customer booking wizard (`book/BookingPage.jsx` + 6 step components) | none — own `BookingBusinessContext` from slug |
| `/booking/:id` | Receipt / cancel / reschedule (`book/ManageBookingPage.jsx`); UUID is the credential | none |
| `/invite/:token` | Staff invite acceptance | `BusinessProvider` |
| `/job/:id` | Job detail page | `BusinessProvider` |
| `/app/*` | Dashboard — 5 tabs (Today, Calendar, Money, Clients, More) via **internal state, not routes** (`App.jsx`) | `BusinessProvider` |
| `/*` | Legacy catch-all → dashboard (old bookmarks) | `BusinessProvider` |

- **State:** `context/BusinessContext.jsx` (session, business, settings, branding, role, theme) wraps only signed-in routes — public routes deliberately sit outside it. No global store; screens fetch their own data.
- **Data-fetching:** `hooks/useBookings.js` (RLS reads, adds business-local date/times), `lib/api.js` (all edge-function calls). Staff role hides the Money tab in UI, mirroring DB policy (`App.jsx`).
- **More tab** fans out into 11 settings screens in `screens/more/` (Catalog, Hours, BookingRules, Team, Appearance, Gallery, Promos, Templates, Notifications, Preferences, BusinessInfo). All eleven were walked in a browser at four widths for the first time in 2.3 — which is how `Promos.jsx`'s missing `<Segmented>` import, a crash that took the whole app down, was finally found.

## 4. FRONT END

Better than typical for this stage — there is a real, enforced design system:

- **System: WRITTEN AND LAW AGAIN, 2026-08-30 (roadmap 1.5).**
  `docs/design-system.md` is now **"The Thread"** — fifteen laws (thirteen at 1.5; law 14 killed the light theme, law 15 is the selected-state hover rule from 2.6), sixteen
  tokens, a two-face type scale, the composition grammar, the verification
  routine, the never-defaults, and what survived the old system. The
  reference rendering is `docs/design-directions/5-the-thread.html`, the page
  the owner approved, and **where the document and that page disagree the
  page is right.** The skill-collision rule is back on: appliers and auditors
  only. Both design tests were rewritten to enforce the new rules —
  `composition` is 24 checks now (22 at 1.5, plus the two-face rule against the
  two restyled stylesheets, added in 2.2), including a token-drift check that makes
  the page, the document and the test agree on all sixteen values.
  **APPLIED EVERYWHERE AS OF 2026-08-30 — booking page (2.1), marketing page
  (2.2), dashboard (2.3).** `/book/:slug` and the receipt/manage page
  `/booking/:id` share `app/src/book/booking.css`; `/` is
  `app/src/landing/landing.css` + `landing/thread.js`, a port of the approved
  reference rendering that lands on the same measured lengths (10.41 screens
  at 1920, 11.26 at 1440, 14.14 on a phone); `/app` and every signed-in screen
  is `app/src/theme.css`, which is now where the sixteen tokens live. `?lite=1`
  and `prefers-reduced-motion` route into one `.lite` class set in
  `app/src/main.jsx`, for the whole app. **Nothing ships the old look any
  more.** The dashboard's own shapes and the reasoning behind them are
  `docs/dashboard-skeletons.md`; read it before changing one.
- **Fonts (new system):** exactly two — **Archivo**, one variable face worked
  across both axes (`wdth` 62–125, `wght` 100–900), and **JetBrains Mono**
  for every figure. `app/index.html` requests exactly those two as of 2.3.
- **Old system, gone:** "Raking Light" — matte near-black ground, one "lit" element per screen, three type faces, a light/dark switch. Its last trace left the codebase when `theme.css` was rewritten in 2.3. The only thing that still names it is `docs/design-system.md` §11, which lists what survived it as contracts rather than style.
- **Fonts:** `app/index.html` requests exactly TWO families as of 2.3 — Archivo + JetBrains Mono. It carried five transitionally because `theme.css` was the last thing using Anybody / Public Sans / DM Mono; 2.2 expected to drop some of the three and correctly dropped none, because that file used all three on its own, so they left together with it.
- **`app/src/lib/theme.js` holds ONE ground now** — `#0B0D0E`, named twice (`DASHBOARD_BG` and `BOOKING_BG`) because only the booking one is what a tenant accent is corrected against and it must track `--bk-bg` in `booking.css`. `THEME_BG`, `DEFAULT_ACCENT`, `loadThemeMode` and `saveThemeMode` are all gone — there is no light theme. **`applyTheme` was deleted in 2.3 and came back in 2.3's reopening as `applyDashboardAccent`**, minus the `data-theme` half: law 11 was rewritten and the dashboard takes the tenant's colour after all. It writes `--accent`, `--accent-text` and `--accent-ink` on `<html>`, and **removes them on unmount** — `theme.css` is global and `landing.css` has no `--accent*`, so a colour left behind would follow a signed-in user out to the public marketing page. `brandVarsFor` corrects the tenant accent against `BOOKING_BG` and returns FOUR values including `--bk-accent-text` — the accent at the 4.5:1 text floor rather than the 3:1 fill floor. `design-contrast` asserts `BOOKING_BG` and `--bk-bg` are the same colour. **Added in 2.4: `hueFamily()` and `describeAccent()`** — they classify an arbitrary colour into one of nine families and say so in a sentence on the Appearance screen. They do NOT gate styling; see §6c. **Also changed in 2.4: `brandVarsFor` corrects the booking FILL against `--ink-3` and the booking TEXT against `--ink-0`** — `accentTriple()` takes both grounds now, because the fill lands on panels and the text does not.

**AND THE DASHBOARD'S TEXT MOVED AGAIN IN 2.6 (2026-08-31).** `--accent-text`
was corrected against plain `--ink-3`, but it is almost never printed on a plain
`--ink-3`: it lands on a panel tinted with THE ACCENT ITSELF, which is lighter
again. Four sites failed the 4.5:1 floor across nine presets plus black and
near-black — a selected chip and a selected choice at 3.92 worst,
`.pill/.badge.completed` at 4.13, the selected tab at 4.46. `applyDashboardAccent`
now passes `dashboardTextBg(hex)` as the text ground: `--ink-3` mixed 20% with
the corrected fill, which is the tint at its lightest (a selected chip being
hovered). Worst case after the fix is 4.52:1; six colours do not move at all.
**That 20% must stay equal to the largest accent tint `theme.css` paints under
`--accent-text`** — `accent-sweep` measures all four tinted grounds and exits 1
if they drift apart. **The rule, third time of asking: a tint of the accent is
a ground.**

**THE BOOKING FLOW IS SEVEN STEPS NOW, AND IT IS BUILT RATHER THAN FIXED
(2026-08-31, roadmap 2.7).** `stepsFor(addOns)` in `book/BookingPage.jsx`
inserts an Extras step after Services only where the business has add-ons —
W19, "add-ons get their own step, in the same format as the services step" —
because an empty seventh step would make "Step 3 of 7" a lie for every
detailer without any. Nothing else about the flow is conditional. Back now
lives in the price bar (W20) rather than at the foot of the column, which is
74px of every step's budget, and the estimated TIME rides the bar's eyebrow
beside "Estimated total" rather than beside the figure (W17). `.bk-choices` is
the flow container that stopped each card being its own page section at the
26px SECTION gap (W18). The measuring instrument is
`node scripts/sweep-booking-steps.mjs`.

**The two surfaces correct against DIFFERENT grounds, and that is deliberate.** The dashboard uses `DASHBOARD_ACCENT_BG` = `--ink-3` `#1E2327` because its accent lands on panels (`.cal-cell.today`, `.pill`, `.badge`, `.chip.active`); the booking page stays on `BOOKING_BG` = `--ink-0` because its two accent-as-text sites are borderless rows on the ground. Correcting against a ground buys a floor on that ground and nowhere else — see DECISIONS.md, "Roadmap 2.3, reopened".
- **Tokens vs hardcoded:** discipline is real, and the guess that used to sit here is now CHECKED: the only hex colours in dashboard JS are in `lib/theme.js` (the designated colour-math file) and the four Google marque colours in `screens/Auth.jsx:32-35`, which Google's brand guidelines require be shown as issued. CSS uses `var(--…)` throughout.
- **Inline styles exist but are modest:** heaviest are ManageBookingPage (18) and Money (15) — mostly layout one-offs, not colors, judging by spot checks. LandingPage carries the reference page's own inline one-offs, values only, no colours outside `var(--…)`.
- **Worst pages (guess — I did not screenshot):** the dashboard-spec gap report and HANDOFF list the known weak spots: Calendar (no week view, cell weight), Clients (no sort/filter, was the screen that previously violated the composition rule), Hours (multi-glow deferred). Money's quoted-vs-on-site metric is flagged for demotion.

## 5. HEALTH

- ~~**Dead component:** `components/MonthlyRevenueChart.jsx`~~ — deleted 2026-08-28 (roadmap 0.1).
- **Root-level junk from the pre-conversion era, all pointing at a DIFFERENT Supabase project (`adtlnvihwrcqcasqcjwd`):** `create_sample_bookings.js` (with a hardcoded anon JWT committed), `update_packages.js`, `temp_enable_inserts.sql` (**a script that opens anonymous inserts on bookings** — never run this), `deploy.sh`, `deploy-admin.sh`, `.emergent/`, `# Code Citations.md`, `test_result.md`, `FEATURES_VERIFICATION.md`, `PRODUCTION_BOOKING_SYSTEM.md`, `ADVANCED_FEATURES.md`, `ADMIN_SETUP.md`. None referenced by the live app. **All deleted 2026-08-28 (roadmap 0.1)**, along with the stray `.gitconfig`; a read-only check proved the anonymous-inserts policy was never applied to the live project. The one thing still open is the owner's: the anon key remains recoverable from git history. See DECISIONS.md.
- ~~**Broken:** email~~ — **FIXED 2026-08-29 (roadmap 0.2), proven delivered.** The deployed `PLATFORM_FROM_ADDRESS` was `onboarding@resend.dev`, Resend's shared sandbox sender: deliverable only to the account owner's own address, rejected 403 for everyone else *before* Resend creates a record — hence a dashboard showing nothing at all rather than a failure. No code was at fault. The sending domain is now the subdomain `email.detailingplatform.com` (verified in Resend 2026-08-29); from-address is `bookings@email.detailingplatform.com`. Note the **bare** `detailingplatform.com` is NOT a verified sender — don't "simplify" the address to it.
- **The local `.env` service-role key is intentional** — the owner put it there so sessions can drive Supabase directly (platform project `kguqylyzgyzfktkfnhjb`; gitignored, never committed). Don't flag it. It IS slightly stale: it is not the value the edge functions hold, so calling `send-email` directly from a script returns 401 from the relay's own guard. Everything actually used — Management API, PostgREST reads/writes, migrations, function deploys — works fine. Refresh from the dashboard before trusting the 7 credentialed test suites.
- ~~**Never proven:** the reminder sweep~~ — **DONE 2026-08-29 (roadmap 0.3), proven.** pg_cron + pg_net now run `send-owner-reminders-sweep` every 15 minutes. A scheduled run sent a real reminder (delivered in Resend), the next tick sent nothing, and a cancelled booking was never mailed. Two defects were fixed on the way: the sweep leaked booking UUIDs to unauthenticated callers, and reminders never re-armed after an edit. Still open: a failed tick is silent — nothing alerts anyone. See DECISIONS.md.
- **Unverified:** Android vCard export — only tested in Chromium (HANDOFF #4).
- **Deps:** clean — 5 runtime deps, all used. `playwright` is a devDep for screenshot scripts.
- **Tests: 16 suites, no runner** — plain `node tests/X.test.mjs` from repo root. **NINE run credential-free** (composition, design-contrast, landing-pricing, route-contract, money-export, email-brand, client-list, setup-progress, and qr-scans — which needs the dev server but no login and no seed); the other seven hit the real Supabase project and need env vars. **This line said "11 suites, 4 credential-free" until 2026-09-02 and had been stale for five suites** — CLAUDE.md's own list under Verification is the authority, and it is the one a session actually runs.

## 6. LANDMINES

- **`main` = production, and a push to it IS a publish — CONFIRMED 2026-08-30, not inherited.** `main` was pushed and Netlify rebuilt and republished the live site on its own, with no upload and no dashboard visit. Work still happens on `claude/superbase-access-anj1h7`; **never merge to `main` on your own initiative — ask.** The owner said yes on 2026-08-30, so the redesign through roadmap 2.2 IS live and `main`, the branch and the working machine are all the same commit. ~~**THAT PARITY IS STALE AS OF 2026-08-31: `main` is 19 commits behind the branch**~~ — **AND THAT SENTENCE WAS ITSELF STALE BY THE END OF THE SAME DAY. Checked 2026-08-31 during roadmap 2.10: `main`, `origin/main` and the branch are all at `b24b95d`, the last commit of roadmap 2.9.** Everything through 2.9 — the walkthrough, the research, 2.8b's five builds, 2.8c's six settings and the money bug, and the 320px floor — **is published and live.** The only commits ahead of `main` are 2.10's two documentation commits, which contain no `app/` code and are not worth a publish on their own. Kept rather than deleted because the lesson is the point: **this line has now been wrong twice in one day, so a session that needs to know should run `git rev-list --count origin/main..HEAD` rather than trust it.** Still never merge without his word.
  **RUN 2026-09-02, AT THE END OF ROADMAP 2.11: THE ANSWER IS 34, AND BOTH REMOTES ARE STILL AT `b24b95d`** — the last commit of roadmap 2.9. `origin/main` and `origin/claude/superbase-access-anj1h7` are the same commit as each other, and **everything from roadmap 2.10 onward — the architecture proposal, the whole seven-stage dashboard rebuild, first run, five new test suites and three migrations — exists only on this machine.** That is not a publish question: pushing the BRANCH deploys nothing (only `main` does), so the risk is one-directional and it is the loss of a month of work to a disk. **ANSWERED THE SAME DAY: he said "push", and it is done.** `origin/claude/superbase-access-anj1h7` is at `92539f0` — the whole of roadmap 2.10 and 2.11 now has a second home. **`origin/main` is deliberately untouched at `b24b95d`, so nothing was published and nothing deployed**; the branch is 40 commits ahead of it and merging that is a separate question nobody has asked yet. **The lesson is the count, not the push: this landmine had said "run the command rather than trust it" since 2026-08-31 and nobody ran it for two days, in which the entire dashboard rebuild accumulated on one disk.** Run it at the end of an item, not when something feels wrong.
- **The old business is live and off-limits:** its Supabase project, Netlify site, and Resend domain (`andrewsdetail.com`). The Resend account contains real customers' emails. `reference/` is read-only.
- **RLS is the security model.** An event trigger auto-enables RLS on new tables; `business_settings` is owner-only to READ (staff get zero rows — future staff screens must use edge functions). Don't "fix" what looks like an over-strict policy.
- **Migrations are append-only, filename-ordered**; the apply script intentionally fails loudly on an already-migrated DB unless given specific filenames.
- **Both netlify.toml files must stay in sync** (`SECRETS_SCAN_OMIT_KEYS` duplicated on purpose — a deploy from inside `app/` never reads the root file).
- **`app/.env.production` must never be committed** — Vite would silently override local config (DECISIONS.md).
- **`lib/theme.js` is the only file allowed to compute color in JS** — tenant accents get contrast-corrected there; adding color math elsewhere breaks the system's contract.
- **The dashboard's 5 tabs are state, not URLs** — deep-linking a tab doesn't exist; adding router-based tabs would break the home-screen-app behavior comments in `main.jsx`.
- **`app/src/theme.css` is a GLOBAL stylesheet and it leaks.** `main.jsx` imports it on every route, so its bare selectors reach into `.ld` (landing) and `.bk` (booking) for any property those sheets do not declare themselves. That is why `landing.css` renamed nine class names away from it; two of the collisions were live bugs on first render. A note in that file used to say the renames "all go away in roadmap 2.3, when theme.css stops being the outgoing system" — **wrong, and corrected in 2.3**: the leak is caused by the sheet being global, not by it being old, and the rewrite changed nothing about that. Before adding a bare class name to `theme.css`, grep `landing.css` and `booking.css` for it. The grep is in `landing.css`'s header.
- **PUBLIC REPO + a leaked service-role key (found 2026-08-29).** The GitHub repo is public, and `backend/.env` sits in its history (committed 2026-02-01, 4 commits, reachable from `main`) carrying the LIVE business project's `SUPABASE_SERVICE_ROLE_KEY` — full read/write, bypasses RLS — plus `GOOGLE_CLIENT_SECRET`, an older Resend key and a Mongo URL. Earlier notes discussed only the **anon** key and concluded "low severity"; that reasoning does not cover this. **Now verified still live, without exercising it:** the anon key in the public history is byte-identical to the project's current anon key, both issued at project creation, so the JWT secret has never been rotated and the service-role key still works (exp 2036). A read-only abuse check on 2026-08-29 found **no sign it has ever been used** — `pg_stat_statements` covers the whole exposure window unevicted and holds only app-shaped queries, and the auth audit log's only service-role action is the owner's own account creation. **OPEN — owner will rotate once the current build work is finished (their call, 2026-08-29).** See DECISIONS.md.
- **The platform sends through the live business's Resend account.** Same account (`andrewswashing@gmail.com`) that mails Andrew's Auto Detail's real customers. Platform sends accumulate against its reputation and suppression list. Flagged 2026-08-28, not decided.
- ~~**What I don't understand:** whether Netlify auto-publish is actually connected (HANDOFF vs DECISIONS disagree).~~ **ANSWERED 2026-08-30 by doing it:** it is connected, and it publishes on push. HANDOFF was right; the manual-upload note is history. ~~Why email produces nothing in Resend~~ — answered 2026-08-28, see above.

## 6b. THE VISUAL REDESIGN — PHASE 1 IS CLOSED (2026-08-30)

**Direction chosen, refined over fifteen rounds of his corrections, written
up as a system, enforced by rewritten tests, and APPROVED.** Nothing in
phase 1 is outstanding.

- **1.1/1.2/1.3 done.** Seven reference sites read at code level
  (`docs/references/ANALYSIS.md`), his own words on how they MOVE
  (`docs/references/TASTE-NOTES.md` — primary evidence), the brief
  (`docs/design-brief.md`), four directions built and rejected
  (`VERDICT.md`), and the rebuild — `docs/design-directions/5-the-thread.html`,
  "The Thread".
- **1.4 approved 2026-08-30** — *"i approve it for now"*. The last change was
  his: cut the 01/02/03 rail, after measurement showed the two sections the
  README had nominated would have bought 5% while the rail cost 4.07 of his
  14.44 screens. The page is **10.41 screens at 1920**, 11.26 at 1440, 14.14
  on a phone. He also kept the "A Facebook page" row and moved the artifact's
  share pin, so both of those are closed.
- **1.5 done 2026-08-30.** `docs/design-system.md` is "The Thread" and is law;
  `DESIGN.md`, `CLAUDE.md`, `PRODUCT.md` all say so. **Direction-inventing
  skills are banned again from here — appliers and auditors only.** The
  device-tier question parked for 1.5 is closed inside that file: Apple's
  strategy, never ask what the device is. Both design tests rewritten;
  `composition` is 24 checks, including a token-drift check that forces the
  page, the document and the test to agree on all sixteen values.
- **A coverage hole was found and fixed while rewriting the tests:** the
  landing page had NO contrast coverage at all — the checks looked for
  `--bg`/`--panel` where `landing.css` defines `--g`/`--p`, and each was
  guarded by `if (token)`, so all five passed by doing nothing. Ten pairs
  now, all passing. It was a hole, not a live defect. (`--g` / `--p` are gone
  as of 2.2 — that block now reads the system's own token names out of
  `landing.css`, and pins them against the system's values.)
- **NO LIGHT THEME**, his decision 2026-08-30, and **removed in 2.3**. There
  is no `data-theme` attribute anywhere in the product; `:root` carries
  `color-scheme: dark`, so native controls, scrollbars and date pickers come
  back dark for free. It took FIVE places, not the four that were scoped —
  `context/BusinessContext.jsx` held the state and made the `applyTheme` call
  and was not on the list.
- **The booking page is DARK**, asked separately on 2026-08-30 rather than
  inferred from the dashboard answer, because it is a different surface. The
  deciding argument was the positioning: the page claims the booking form is
  built into the detailer's site. Its ground stays independent of dashboard
  state, which is what the light-first comment was always for. See
  `DECISIONS.md` → "The customer booking page is dark".
- **POSITIONING, unchanged:** we sell "a website and the dashboard that runs
  it" as ONE purchase. The website half leads because it is the half that is
  not a commodity; the dashboard is in the same sentence, never a later
  section that reads as a bonus. `docs/tenant-websites.md`, and `DECISIONS.md`
  → "Positioning: what we sell is the pair", **including its correction
  section**, which is the operative version.
- **Copy is provisional by agreement, and after 2.2 there is only one copy
  to talk about.** The shipped page now carries the approved reference
  page's words verbatim — 163 lines of rendered text, differing on exactly
  one line, which is the founding flag reading its count from the database.
  So the copy question is no longer "the page versus the reference"; it is
  that "i approve it for now" was said about this wording, and the few
  pieces the marketing deck did not itself write (the "Questions." heading,
  for one) have still never been through him line by line. Edits go into
  `app/src/landing/LandingPage.jsx` and should be mirrored back into the
  reference page, or the two stop being comparable — which is what made 2.2
  checkable at all.
- ~~**Still open:** the tenant's curated four-to-six accent colours.~~
  **CLOSED 2026-08-30 in roadmap 2.4, and the question was wrong.** There is
  no curated four-to-six — the owner wants coverage, not a shorter list. There
  are **twelve presets built from evidence** (a 46-brand car-care sample:
  **red 48%**, blue 24%, yellow/gold 13%, orange 9%, purple 4%, **green 0**),
  plus a hue-family classifier so an arbitrary custom colour is explained to
  the detailer in words rather than silently corrected. Still open, not
  blocking: mid-range Android, which nobody has put a thumb on. Nothing uses
  WebGL, so that risk is low.
  ~~The dashboard's own section skeletons~~ — **drawn in 2.3**, written up in
  `docs/dashboard-skeletons.md`: Today the only rail, Calendar the only grid,
  Money the only chart, Clients the only screen with no panel on it, More the
  only screen made of panels.
- ~~**Does the dashboard carry ANY of the detailer's own colour?**~~
  **ANSWERED 2026-08-30: YES, all of it** — and **the code is written now**,
  in 2.3's reopening. The owner: *"we should have them be able to customize
  their admin dashboard accent color… almost anything goes with black."*
  `docs/design-system.md` law 11 is rewritten, `applyDashboardAccent()` is
  back in `lib/theme.js`, and all ~30 `var(--ac)` fills in `theme.css` are
  `var(--accent)`. The extremes are swept two ways: by eye (crimson, violet,
  gold, slate at four widths) and by measurement
  (`node scripts/accent-sweep.mjs`, credential-free, exits non-zero on a
  regression). **The correction ground is `--ink-3`, NOT `--ink-0`** — that
  was the defect the sweep found, and the reason is that a dashboard accent
  lands on panels, not only on the ground.
- ~~**New, out of 2.1: `?lite=1` is not implemented anywhere in `app/`.**~~
  **BUILT 2026-08-30 in roadmap 2.2**, at the app root in `app/src/main.jsx`:
  `?lite=1` and `prefers-reduced-motion` both add `.lite` to `<html>` before
  React renders. `booking.css`'s own reduced-motion media query was swapped
  for `.lite` in the same session — otherwise the app would have carried the
  two implementations the system forbids, and `?lite=1` would still do nothing
  on the booking page. Also from 2.1 and still true: the Review step prints
  "Estimated total" twice, once in the receipt and once in the price bar below
  it — looked at and deliberately kept, with the reasoning recorded so a later
  pass does not delete the wrong one. Both are written up in DECISIONS.md →
  "Roadmap 2.1", along with the error-colour hole that item found and closed.
- **New, out of 2.2 (2026-08-30):** the landing page renames nine class names
  away from `theme.css`'s (`.cta`, `.litcard`, `.getsheet`, `.ruled`, `.tile`,
  `.fig`, `.pip`, `.substack`, `.softlink`) because that global sheet leaks
  every property a scoped rule does not itself declare — two of the collisions
  were live bugs on the first render. It is the one thing about the port a
  reader will not guess. The rule and the grep that checks a new name are in
  `landing.css`'s header; DECISIONS.md → "Roadmap 2.2" says why renaming beat
  a block of un-declare rules. **The last sentence used to read "all of it
  goes away in 2.3, when theme.css stops being the outgoing system" and that
  was wrong** — checked in 2.3, which rewrote that file and changed nothing
  about the leak. The sheet leaks because it is GLOBAL, not because it was
  old. The renames stay; see §6, LANDMINES.

## 6c. ROADMAP 2.4 — ANY COLOUR WORKS EVERYWHERE (2026-08-30)

**2.4 IS CLOSED.** Item 3 (a/b/c) finished first; the cancel/reschedule page's
composition — the last piece — finished 2026-08-30 and is summarised directly
below. That page's *colour* was checked before and after and is fine.

### The manage page's composition (the last piece of 2.4)

`/booking/:id` had **four** identical full-width pills in a column — add to
calendar, change the time, cancel, call — each one a direct child of a flex
container whose gap is the page's 26px SECTION gap. So they were not four
buttons, they were four page sections, evenly spaced, all one weight: the
"five identical full-width stacked sections" tell, with a destructive action
carrying exactly as much weight as "Add to my calendar".

**They are one group with three weights now.** Filled (the tenant's accent) =
"Change the time", which is the reason the page exists — the file's own header
says it is what stops the detailer's phone ringing for "can I move my
Tuesday?". Ringed = "Add to my calendar". Ringless, sharing a row under a
hairline = "Cancel this booking" and "Call …", the two ways *out*. New in
`booking.css`: `.bk-actions`, `.bk-exits`, and `.bk-btn.danger` (+ `.bare`),
which also replaced the same inline danger style copied into the JSX twice.
The rule is now in `docs/design-system.md` § Composition.

**One live defect fixed on the way:** when the cancellation window is closed,
the note already prints the business's phone, and a "Call <same number>"
button was drawn directly beneath it. Verified at the source rather than
assumed — `receiptBusiness.phone` (get-booking-receipt) and `business.phone`
(the public-profile RPC) are both `businesses.contact_phone`, so there is no
shape of the data where the note is empty and that button is not.

**The red-on-red question was measured, not eyeballed, and the answer is that
it is fine.** A red-branded tenant now gets an accent-filled button in the
same view as the red destructive control, which is the exact adjacency law 11b
exists to prevent. Measured as CIE76 ΔE against `--bad` `#E2705F`: Crimson
**31.9**, Rose **30.8**, Ember **35.9** — against the ΔE **8.5** and **17.1**
that item 3c judged to be real collisions. Same hue family, 2–4x the distance,
and the two differ in form as well (solid fill vs bare text, separated by a
rule). A red `.bk-btn.primary` already ships on this same page in the
reschedule and cancelled states. **No colour was changed.**

**Verified by looking**, 1920 / 1440x900 / 768x1024 / 392x844, console clean
at every width, normal path and `?lite=1`: the default state, mid-reschedule,
the cancel confirmation, cancelled, and the locked-window state (reached by
temporarily widening the demo tenant's window to 200h and restoring it to 24).
Retinted through the tenant's real branding row at three extremes — Crimson,
Silver (near-white fill) and near-black (mid-grey fill) — and restored to
`#eab308`. The keyboard focus ring on the now-ringless cancel button was
screenshotted, not assumed: `.bk :focus-visible` paints a 2px accent outline.
`scripts/shoot-manage.mjs` is new and is the only thing that reaches this page.

**One observation recorded, deliberately not fixed:** the page ends around
y=570 on a 1920x1080 screen, so the lower half is bare ground — and this
change made it ~100px shorter, not longer. It is a phone page reached from a
text message, its approved sibling (the booking page) has the same shape, and
the fix for "not enough content" would be filler. Flagged for the owner rather
than solved.

**THE RULE TO KNOW BEFORE TOUCHING ANY COLOUR: the accent is IDENTITY, never
MEANING** — `docs/design-system.md` **law 11b**, the owner's own words on
2026-08-30: *"the paid should always be green because that's just kind of paid.
Money green is all kind of cohesive… the accent colour is more like the mark
complete button or the calendar highlight."*

| | Follows the tenant? | Where |
|---|---|---|
| `--accent*` | **yes** | actions, navigation, selection, focus, today's disc, chart bars, the "it landed" node |
| `--ac` green | **no** | paid, money up, "it worked" |
| `--bad` red | **no** | cancelled, no-show, error, destructive |

`grep 'var(--ac)'` in `theme.css` finds every fixed-meaning site. That file's
token block used to say "below here there is no `var(--ac)` left" — that rule
is now exactly inverted.

**The presets are TWELVE, built from evidence, not taste.** Crimson, Rose,
Ember, Sunflower, Gold, Forest, Teal, Sky, Ocean, Violet, Slate, Silver —
hue-ordered so the swatch row reads as a spectrum, in a 6x2 grid. From a
46-brand car-care sample: red 48%, blue 24%, yellow/gold 13%, orange 9%,
purple 4%, **green 0** (which is what makes the house green a differentiator).
**There is deliberately no dark preset** — the correction moves lightness only,
so deep navy paints `#4269D6` and deep garnet `#D72727`, each collapsing onto a
brighter preset already in the list. Those detailers use the custom picker.

**`hueFamily()` and `describeAccent()` are in `lib/theme.js`** and do NOT gate
styling. Their job is one live sentence on the Appearance screen telling the
detailer what they picked and what was done to it. Sixteen pinned colours check
the classifier at the bottom of `scripts/accent-sweep.mjs`.

**The status marks are now FORM-first, unconditionally** — circles are jobs
(hollow ahead, solid landed), a bar is a job that did not happen, squares are
facts about the day. `--bad` left the calendar entirely. This is NOT switched on
for red accents, because the collision was never red-only: measured, a *silver*
accent hits the "booked" ring at ΔE 8.5 and a *near-black* accent hits the
blocked-day grey at ΔE 17.1. Table: `docs/dashboard-skeletons.md` §5b.

**A LIVE defect was found on the CUSTOMER-FACING booking page while checking
this**, and fixed: `.bk-card.selected`'s accent ring — the only thing telling a
customer which service they picked — is drawn on a lifted gradient whose top is
`--ink-3`, but the fill was corrected against the ground. Violet measured
**2.78:1** there, Slate 2.62, a black pick 2.56, a deep navy 2.51, all under
the 3:1 floor, and Violet and Slate are shipped presets. **The booking page now
corrects its FILL against `--ink-3` and its TEXT against `--ink-0`** — two
values, two grounds. The rule is not "one ground per page", it is **correct
against the lightest surface THAT VALUE can land on**.

**`scripts/accent-sweep.mjs` now sweeps the extremes AND the booking page on
every run** — neon green/magenta/cyan, pure black, near-black, pure white
alongside the twelve presets on the three dashboard grounds, then every colour
again through `brandVarsFor` on the three surfaces the booking page paints.
Reverting the booking ground makes it exit 1 with those four numbers, so the
check is real. It stays credential-free and must exit 0 after anything touching
accent colour.

**Two demo-seed defects were found and fixed** because both blocked LOOKING at
the product: the demo had no cancelled and no no-show booking at all (so that
whole family of styling was invisible in a browser), and the seed silently
dropped the "tomorrow" bookings every weekend (`openDay(1)` collided with
`day0` on a Sunday; `openDay(3)` had it too). 22 of 22 seed now; it was 20.

**One judgment call is flippable in one line if the owner disagrees:**
*completed* stays on the tenant's accent while *paid* moves to green.
Reasoning in law 11b. **One latent hazard flagged, not fixed:**
`a { color: var(--accent-text); text-decoration: none; }` identifies links by
colour alone — harmless today (one bare `<a>` in the dashboard, and it is a
card) but a real problem for Phase 3's tenant sites.

Full record: DECISIONS.md → "Roadmap 2.4".

## 6d. ROADMAP 2.8 — HOW OTHER DETAILERS ACTUALLY WORK (2026-08-31)

**THE OWNER ANSWERED ALL FOUR DECISIONS ON 2026-08-31 AND TWO CAME BACK
DIFFERENT.** Read this block before the research summary below it, because two
of that summary's conclusions are superseded.

- **Categories, with the selection rule PER CATEGORY** — not one setting for
  the business, which is what the research had concluded. His own menu is
  Interior / Exterior / add-ons, *"one from each category"*, a sixth shape the
  five menus studied did not contain. Decided: a `service_groups` table with
  `max_select` per group (1 = pick one, null = pick any) — the restaurant-POS
  "modifier group" pattern. No `min_select`: the existing "a booking needs at
  least one service" rule already does that work.
- **Vehicle sizes customisable by the detailer**, not the fixed five
  recommended. `business_settings.vehicle_sizes` jsonb; the blocker was and
  still is that `bookings.vehicle_size` is a CHECK constraint. The size's
  label must be SNAPSHOT on the booking, like `vehicle_size_fee` already is.
- **From-prices: yes. The condition question: yes.**

**AND THE BIGGEST FINDING OF THE ITEM CAME OUT OF THAT FIRST ANSWER, MEASURED
AT 392x844 AGAINST THE RUNNING APP.** Roadmap 2.7 said W16 "cannot be true in
the absolute for a list the detailer controls"; his answer made it measurable.
**His own real menu — two categories, three services each — overflows step 1 by
119px.** Today's four-service demo has 18px spare; a service card is 97px, a
category heading 17px, the gap inside a category 8px and between categories
26px. **The fix is measured too: folding the description off the face of the
card takes it 97px → 74px, and that same menu from 119px over to 18px spare.**
So **W21's disclosure holds the description as well as the inclusion list, and
it is a prerequisite for categories, not a sibling.** The vehicle step is the
same shape now that sizes are tenant-defined: 238px spare, 79px per size,
**six sizes is the phone ceiling** — past that it needs a denser control than
cards, and a dropdown is permitted above four options.

The full migration is written out as a specification in the research file, with
a build order. **Nothing is built.**

---

**The research underneath, done the same day.** The record
is `docs/detailer-research-2026-08-31.md` — five real detailing businesses'
published menus and booking flows, one long thread of working detailers, three
trade software vendors, the trade's pricing guides. It answers W9, W10, W21,
W22, W25 and the W27 thread, which roadmap 2.7 deliberately left unbuilt
because each one would have frozen a guess into an append-only migration.

**Read this much before touching the catalogue:**

- **Two of the five items were misfiled as schema work.** `add_ons.sort_order`
  and `services.features` have existed since the foundation migration and
  **nothing writes either one**. W10 (reordering) and W21 (full details) are
  screens over columns already there — zero migration. The schema was built
  ahead of the UI in several places; grep the migration before sizing a
  catalogue item.
- **W21 is a live trap and its ordering is not a preference.**
  `StepServices.jsx` renders `features` inline, capped at five. It is harmless
  only because nothing writes the field. **The disclosure control ships before
  or with any editor for it, never after** — 2.7 measured step 1 at 18px of
  phone headroom with four services and no inclusion lists, and real menus run
  5–10+ bullets per package.
- **W10 is reordering, not groups.** Real add-on lists are 3, 6, 7 and 9 items
  and not one of the five menus groups them. Services DO group in the wild,
  which is why `group_label` is on services and must not be added to add-ons.
- **W22's premise was backwards.** The owner believed he was unusual in having
  no water tank or generator; most working mobile detailers use the customer's
  tap and outlet and ask when booking. So the question he built for himself is
  the standard one. What varies is WHICH resource and what happens on "no", and
  **water and power are independent** — one boolean cannot express a coating
  specialist (power, no hose) or a rinseless operator (neither).
- ~~**W25 is one boolean.**~~ **SUPERSEDED by the owner, above** — the rule is
  per category. Kept because the reason it failed is the lesson: four of five
  real menus are pick-one and the fifth is wholly à la carte, so the sample
  ruled shapes IN and could not rule the remaining ones OUT — and his own
  business was the shape it missed. **Five menus is enough to answer "is this
  normal"; it is not enough to answer "is this all there is."**
- **The only schema-BLOCKING part of W9 is the vehicle classes**, because
  `bookings.vehicle_size` is a CHECK constraint pinned to
  `('small','medium','large')`. `vehicle_size_adjustments` is jsonb and would
  not have cared. ~~Three is below the trade norm of five.~~ The owner's
  answer is a tenant-defined list, which the jsonb already supports.
- **Found and deliberately left:** a service that cannot be done mobile
  (coatings need a garage — we model mobile-vs-drop-off per business and per
  date, never per service), cure/hold time (a single `duration_minutes` and one
  contiguous slot cannot express a 24-hour hold), and deposits (the trade's
  standard no-show answer, blocked on billing).

The four decisions, the full migration written out as a specification, and the
build order are all in that file. Judgment calls: DECISIONS.md → "Roadmap 2.8".

## 6e. ROADMAP 2.8b — THE FIVE ARE BUILT (2026-08-31)

**All five shipped in the order 2.8 specified, plus W27, plus the one
migration.** Item-by-item outcomes with measurements:
`docs/owner-walkthrough-2026-08-30.md` (W9, W10, W21, W22, W25, W27).
Judgment calls: DECISIONS.md → "Roadmap 2.8b".

**What a detailer can now do that they could not on 2026-08-30:** create
CATEGORIES and say whether a customer picks one from each or as many as they
like; REORDER their categories, services and add-ons; write a what’s-included
list per service that customers open behind a little eye on the booking page;
mark a price as "from"; define their OWN vehicle sizes instead of our
small/medium/large; say per-resource whether they bring their own water and
power, just ask, or cannot work without it; and ask how dirty the inside is.

**Three numbers in this repo changed, and they are the part a new session gets
wrong:**

1. **Step 1’s tightest screen is 1440x900, not the phone.** Every older note
   says the phone. A service card is 84px at 1440x900 and 74px at 392x844
   (`.bk-card`’s padding clamps up), and 900px is the shortest screen we
   verify. The owner’s own menu — two categories of three, which the demo seed
   now IS — has **10px spare at 1440x900** and 47px at 392x844. A seventh
   service breaks the laptop first.
2. **The vehicle-size ceiling is FOUR, not the six 2.8 measured.** That figure
   predates W27’s condition question, which lands on the same step and costs
   120px. Past four, `StepVehicle` draws a drop-down instead of cards, so a
   longer list still works — it just stops being boxes.
3. **The demo business is a different shape.** Six services in two pick-one
   categories (Exterior, Interior), every one carrying a what’s-included list,
   two of them "from" prices. `Full Detail` was renamed `Full Interior Detail`.
   Every measurement above was taken against it.

**Two guards are on the server and have tests on the way in**, because roadmap
2.7’s W4 was a rule that only existed on the page: a category’s `max_select`
(in `create-booking`) and a REQUIRED water/power resource (in
`_shared/slotValidation.ts`). `tests/booking-engine.test.mjs` tests 13 and 14;
63 checks pass, up from 52.

**Kept on purpose, not overlooked:** `services.group_label`,
`business_settings.ask_water_electric` and `bookings.has_water_electric` are
all still written alongside the new columns. Everything deployed before 2.8b
reads them, and the migration rule is append-only. They are retired in a later
pass, once nothing reads them.

**THAT HOLE IS CLOSED — roadmap 2.8c, built 2026-08-31 on his “build everything”. The paragraph below is kept because the reproduction is the record of what was wrong.** He asked,
the same day, whether the category system was actually researched and whether
it needs a rule where choosing from one category stops you choosing from
another. It does. A menu with a Complete Packages category AND standalone
Interior and Exterior categories — Oregon Detail Co’s, a real shop — lets a
customer book the complete package plus both components: **$1,645 for work the
$625 package already contains, reproduced on the running app and accepted by
`create-booking`.** Every category obeys its own rule; `max_select` only ever
counts inside one category. The research and the recommended fix (one boolean
per category, “choosing from this category is the whole booking”) are in
`docs/detailer-menu-shapes-2026-08-31.md`; the judgment calls are in
DECISIONS.md → “The owner asked whether the categories were actually
researched”. It shipped along with five more settings, and the section below
says what.

## 6f. ROADMAP 2.8c — SIX MORE SETTINGS, AND A MONEY BUG (2026-08-31)

Built on the owner’s “build everything” after the menu-shapes research. Three
migrations. Judgment calls: DECISIONS.md → “Roadmap 2.8c”.

**What a detailer can now do on top of 2.8b:** mark a category “booked on its
own”, so a complete package clears the parts instead of selling them twice;
give a category a line of description; say which weekdays a single service is
offered on and whether it can be done at the customer’s address at all; name
their own travel areas with a fee each; and add surcharges by day and time
(a weekend rate) or by short notice (a rush fee).

**THE LANDMINE THIS TURNED UP, and it is the most important line here:**
`business_settings.travel_fee` was PRINTED on the booking page and was never in
`computeQuote` at all — the customer saw “+$25” on the “We come to you” card and
the Estimated total underneath it did not contain it. It had been that way
since the quote engine was written, no test caught it (they all asserted the
engine did what the engine did), and it was found only by reading the code
while scoping the distance pricing. It is charged now, and
`tests/booking-engine.test.mjs` test 17 is the regression test.

**Numbers that moved:** step 4 of the booking page went 6px OVER on a phone
when the travel-area picker landed on it, and is back to **52px spare at 392**
and 74px at 1440x900 — won back by cutting a line that restated the step’s own
heading, which is the second time in two items that height came out of copy
rather than layout. Step 1 is unchanged at 47px / **10px at 1440x900**, still
the tightest screen in the product.

**`tests/booking-engine.test.mjs` is 86 checks, up from 63** — tests 15, 16 and
17, including that the quoted total equals the charged total and that travel,
the area name and every surcharge are snapshotted on the booking row.

**The emails and the invoice were fixed as part of it**, because the subtotal
contains travel and surcharges now and neither document itemised them: the
confirmation email showed “Express Wash $65” above “Subtotal $105”, and
`send-invoice` dropped both entirely.

## 6g. ROADMAP 2.9 — THE 320px FLOOR IS REAL NOW (2026-08-31)

PRODUCT.md has promised "responsive 320→1440" all along and the product did
not keep it. It does now: `node scripts/sweep-widths.mjs` exits 0 at 392, 360
**and 320**, in the normal path and `?lite=1`, and **320 is in that default
list rather than an argument somebody has to remember.**

**The four failures 2.6 measured turned out to be one failure.** Below 361px a
settings sheet gives a control 244px of width, and two of anything will not
share it. So the whole item is one block in `app/src/theme.css`
(§ THE 320 FLOOR) that says *pairs stack*: paired fields go one column, the
two time fields take a row each, a segmented control goes full width with
equal columns and a wrapping label, three small buttons across drop their side
padding, and the twelve-colour palette becomes 4x3 (four columns keeps the
circle at 44px; shrinking six would have taken the tap target to 40px).
**Nothing above 360px changed** — 1920, 1440x900, 768x1024 and 392 are
identical, and the Hours row still reads `Tue [08:00 AM] to [06:00 PM] Close`.

**THE LINE WORTH KEEPING FROM THIS ITEM: a clean sweep means nothing is off
the SCREEN, not that nothing is off its box.** Two of the four — the time
fields and the segmented control — were ALREADY overflowing their card at
360px, by 19px and 11px, and the card's own 18px of padding swallowed it, so
nothing ever crossed the viewport edge the sweep watches. They were found by comparing each
element's right edge with its parent's content box — and **that is the sweep's
third check now**, baselined against the pre-2.9 commit, where it reports all
four failures at 360 and nothing else. `sweep-widths.mjs --lite` runs the
`?lite=1` path too, which it could not do before.

**A fifth thing was found by LOOKING and it was the worst of them.** A
`Setting` with its control on the right kept 96px for its explanation and
printed "Replaced by / your travel areas / below — each / area sets its own /
fee." Settings put the control under the words below 361px now. A switch is
exempt: 46px costs the sentence nothing, and a toggle under its own label
reads as a second setting.

**ONE THING WAS NOTICED AND DELIBERATELY NOT CHANGED, so it does not get
rediscovered as a bug.** PRODUCT.md's accessibility line says "tap targets
≥ 46px", and three controls have always been smaller on purpose: `.btn.sm` is
38px, `.choice` 38px, `.chip` 36px, and the colour swatch 44px. That is not a
defect — WCAG 2.2 AA's actual floor is 24x24 CSS px and all of them clear it
comfortably; 46px is this product's PRIMARY control size (`--tap`), and the
small sizes are the deliberate secondary. **The imprecise thing is the
sentence, not the code.** Raising `.btn.sm` to 46px would move every measured
spare-room figure in `sweep-booking-steps.mjs`, so nobody should do it on the
strength of that sentence alone. Roadmap 2.9 kept the 44px swatch for the same
reason it did not shrink it: 44 is where that grid already sat.

**The lever was copy again — third item in a row.** Two native time fields
cannot share 244px at any spacing (Chromium will not draw one under 138px), so
they stack; stacked, "to" no longer says which field is which, so each took its
own word. `Hours.jsx` gained a `.tfield` wrapper that renders identically
above 360px and exists only to carry those words below it.

## 6h. ROADMAP 2.10 — THE ARCHITECTURE PROPOSAL, AWAITING THE OWNER (2026-08-31)

**Research and a written proposal. NOTHING IN `app/` CHANGED, and nothing
should until he answers.** The deliverable is
`docs/dashboard-architecture-2026-08-31.md`; the judgment calls are
DECISIONS.md → "Roadmap 2.10 — the architecture proposal". **Five decisions
are waiting for him at §5 of that file.** The build is a separate roadmap
item, the way 2.8b was for 2.8.

**Four of the five tabs survived a from-scratch derivation unchanged.** A
detailer's day contains five recurring questions plus one thing that is not a
question (how the app behaves for me). Questions 1–4 land exactly on Today,
Calendar, Money and Clients — and Schedule and Customers are top-level in six
of six trade products. **Saying that plainly was part of the job**; the
roadmap asked for it, and a proposal that moved everything would have been a
worse answer rather than a bolder one.

**THE FINDING, AND IT IS A COMPARISON RATHER THAN AN OPINION.** Jobber's
"More" holds nine things and **not one of them changes what a customer sees**;
Housecall Pro puts the same class of thing behind a gear. Ours holds the menu,
the prices, the hours, the promo codes, the photos, the colour and the booking
link. Separately, **"what you sell" is a top-level destination in five of six
trade products** — Housecall Pro calls it Price Book and gives it a tab,
Zenbooker lists Services first — while ours is one row in the second group of
a screen called Settings, and is the largest file in `app/src` outside the
landing page (`Catalog.jsx`, 614 lines).

**What is proposed:** keep Today, Calendar, Money, Clients; delete More as a
tab; the seven customer-facing sheets become a fifth tab, **"Your page"**; the
four plumbing sheets plus the account go behind a **gear in the header**.
**No schema, no new skeleton** — "Your page" inherits the panels skeleton More
gives up (design-system law 1 is why a SIXTH tab was never on the table), and
the Settings sheet is the "form in a sheet" all eleven sheets already are.

**THREE DEFECTS WERE FOUND WHILE TAKING THE INVENTORY AND NONE IS FIXED,
because this item changes no code. Do not rediscover them as new:**

1. **The push-notification switch does nothing.** `Notifications.jsx` writes
   `push_enabled` and `send-owner-reminders` genuinely calls `sendOwnerPush` —
   but there is **no client code anywhere in `app/`**: no service worker, no
   `PushManager`, no call to `owner-push-subscribe`, no permission prompt. No
   device is ever registered. Three edge functions and the whole `/job/:id`
   route ("what a push-notification tap opens") exist for a feature with no
   front end.
2. **Staff are shown "Your colour" and the database refuses the save** — the
   row is not owner-only in `More.jsx`, `Appearance.jsx` has no role check,
   and `business_branding` is member-READ / owner-WRITE.
3. **A staff member's whole More screen is two rows**, one of which is the
   broken one above.

**And four tables still have no interface at all:** `testimonials`,
`campaigns` + `campaign_visits`, `monthly_plans`, `business_domains`. Three of
the four are things he has already said come back or are coming, so the
proposal names a home for each rather than leaving them to surprise someone.
`campaigns` is the one exception and is **deliberately left unplaced** — see
§6 of the proposal.

**HE ANSWERED THE FIVE AND WIDENED THE ITEM, THE SAME DAY.** *"The layout /
redesign was more than just the order of the tabs but of every GUI and how
things look and are laid out, going through every single GUI tab page
whatnot."* **The fifth tab is called "Business"** — his own choice over the
recommended "Your page" — and the other four decisions were delegated
(*"make the correct changes you think is best"*): delete More, yes; Clients
becomes the bring-people-back screen, manual only; Booking rules stays one
sheet; `+` moves to the header. **The screen-by-screen pass he asked for is
Part B of the same file, and two decisions are still open there (§B6).**

**BECAUSE HE CHOSE "BUSINESS", ONE THING HAD TO BE WRITTEN DOWN.** "Your page"
was recommended because the NAME refused anything a customer could not see —
the admission test came free. "Business" admits anything, which is exactly how
"More" filled up. So the rule is stated explicitly instead: *a row belongs on
Business only if it changes what a customer meets; if it changes how the app
behaves for the detailer it goes behind the gear.* **Without that sentence in
a file, "Business" is "More" renamed.**

**THE BIGGEST FINDING OF THE ITEM IS IN PART B AND IT IS NOT ABOUT TABS AT
ALL: there is no desktop layout.** `.app-main` is 760px and the content column
**724px at every width from 768 upward** — measured. Two pages prove the cost
because they are the same HEIGHT on a monitor as on a phone: More is 1,620px
at 1920 and 1,626px at 392, and **Calendar's History is 3,619px at 1440 AND
3,619px at 392, identical to the pixel.** Sixty per cent of his own 1920
monitor is empty. Proposed as three cheap moves, not a second design, with law
1 as the constraint — a skeleton may have a wide form but must stay the same
skeleton — and **recommended LAST**, because it is the only stage that adds
work rather than moving it.

**AND A TEST WAS FOUND THAT CANNOT SEE THE FAILURE IT EXISTS TO CATCH.**
`composition.test.mjs` test 1 ("records are lists, cards are objects") matches
a `.map(...)` whose callback carries a `className` with `card` **in the same
file**. Calendar's History maps onto `<BookingCard>` — a component — and
`BookingCard.jsx` is on the test's ALLOWED list, so **any screen can render an
unbounded list of cards through a component and pass.** History does: 18
records, 18 cards, 3,619px. Same family as the skipped contrast check; fix the
test in the same change as the screen or it returns. That is decision 7.

**§B4 tables 21 findings and NONE is fixed** (this item changes no code). Five
are live defects rather than composition — the push switch, the staff colour
row, New booking offering combinations `create-booking` rejects with a 409,
the superseded travel-fee field that is still editable, and a "Last visit"
that can print a future date. **One claim was checked and WITHDRAWN**: the New
booking modal does respect W9's tenant-defined vehicle sizes.

**A DATA GAP THAT THE BUILD ITEM MUST CLOSE FIRST.** Today is a Monday, the
demo business is closed Sunday and Monday, and the seed puts "completed and
paid" jobs on tomorrow's date. So Today could only be photographed EMPTY —
**the busiest state of the busiest screen in the product has still never been
looked at.** Seed a realistic day before redesigning Today, or it gets
redesigned from its emptiest state. Screenshots: `shots-2.10/` (68 PNGs).

**2.10 IS CLOSED AND HE OPENED 2.11 IN ITS PLACE — read this before starting
anything.** He answered the last two decisions and then replaced what would
have been 2.10's build item with a bigger one: *"create the entire admin
dashboard from scratch… forget everything about it… know every single aspect
of all the features that's gonna be in the admin dashboard, and then create it
from scratch… I wanna do it properly, from the start."*

- **Decision 6 is YES and the word matters:** *"desktop should get an actual
  layout SPECIFIED just for desktop."* A written specification, not
  breakpoints added to the phone layout.
- **Decision 7 he declined** — *"I don't like the question"* — and he was
  right: it asked him to rule on the internals of a test. The finding stands
  and is settled inside 2.11 step 5. **Do not re-ask him.**
- **Roadmap 2.11 is the item**, with his words quoted in full, the order, and
  the skills. Steps 1–5 produce FILES; he approves before any code.
- **THE OPEN QUESTION IS ANSWERED: "The look stays."** The Thread still
  stands, the skill-collision rule stays on, no direction round. **But he
  asked the follow-up that mattered — *"that means just the colors and fonts,
  right?"* — and the answer is NO**, so the boundary is written out in roadmap
  2.11 as three buckets rather than left as the phrase "the look":
  **FIXED** (the sixteen tokens, the two faces, the one dark ground, the
  accent-is-identity-never-meaning rule, the motion budget, the accessibility
  floors, the never-defaults); **FIXED IN KIND BUT GROWABLE ONCE, at step 5**
  (the composition vocabulary — the desktop spec will probably want a table,
  which the set does not have); and **COMPLETELY OPEN** (which block each
  screen uses, what is on it in what order, every layout on phone and desktop,
  every state). **Law 1 — every screen a structurally different skeleton — is
  the one fixed rule that constrains the REBUILD rather than the styling**;
  flagged to him, kept, and it is what stops five tabs becoming five stacks of
  identical rounded boxes.
- **What is already settled and must NOT be re-derived:** 2.10 Part A's tab
  bar (Today · Calendar · Money · Clients · **Business**, gear for plumbing,
  `+` in the header), decision 6, and Part B's 21 findings as the list of what
  the rebuild must not reproduce. The schema, the engine and the booking flow
  are not reopened at all.

## 6i. ROADMAP 2.11, STEPS 0-2 - THE DAY IS SEEDED AND THE LIST IS WRITTEN, AWAITING HIS APPROVAL (2026-08-31)

**Steps 0, 1 and 2 of the six are done. He approves the FEATURE INVENTORY
before a single screen is designed** - that gate is step 1's whole point and
nothing past it has started. Two new files:
`docs/dashboard-feature-inventory-2026-08-31.md` (step 1) and
`docs/dashboard-screen-research-2026-08-31.md` (step 2). Judgment calls are
DECISIONS.md -> "Roadmap 2.11, steps 0-2". **Seven questions are waiting for
him at §9 of the inventory.**

**STEP 0 - TODAY HAS BEEN LOOKED AT FOR THE FIRST TIME, AND IT COST TWO
CHANGES TO `scripts/seed-demo.mjs` AND ONE TO `theme.css`.** The demo was
closed Sun/Mon, today was a Monday, and `day0` resolved to the next OPEN day -
so the seed dated its finished-and-paid jobs to TOMORROW and Today drew "No
jobs booked for today." Both halves are gone:

- **The closed days are derived from today.** `[0, 1]` minus today's weekday.
  Five days in seven nothing changes; on a Sunday the demo is closed Monday
  only, and on a Monday, Sunday only. Still a business with days off, still
  closed cells on the calendar, and Today is always seedable.
- **`day0` is always today, and no row says "completed".** A job is completed
  once it has ENDED, read off the clock - the only rule that cannot print a
  finished job in the future. Five jobs, 08:00-18:00, 45 minutes apart, which
  is this business's own `buffer_minutes`: **five is the busiest day these
  settings allow**, not a number picked to look full. **Consequence to know:
  what Today draws now depends on the hour the seed runs.**
- **THE TWO MOST RECENT FINISHED JOBS HAVE NO PAYMENT RECORDED, and that state
  had never existed in this seed at all** - every "completed" row it wrote also
  carried `finalized_at`, so `needFinalize` was always empty. That is the one
  thing Today lights (`dashboard-skeletons.md` §6) and the only thing that
  draws the warn-box, and **neither had ever rendered against data.**

**AND THE SWEEP FOUND A LIVE DEFECT WITHIN THE MINUTE, WHICH IS THE WHOLE
ARGUMENT FOR DOING STEP 0 FIRST.** A job card's three action buttons sat
**6px outside their own card at 392 and 18px at 320.** `sweep-widths.mjs` had
never seen it because the row only exists on a job card and Today had never
had a job. **Fixed** - roadmap 2.9 had measured the same row and fixed only the
width it could see (<=360), so the padding rule moved out of that media query
and the 320 rule went further. Measured after: **291px in 292px at 392, 219px
in 220px at 320. Both are 1px of spare room and that is a real ceiling** - a
longer label or a fourth button breaks it again. Sweep is clean at 392/360/320
in both paths; the four credential-free tests pass.

**STEP 1 - 118 CAPABILITIES, FROM FIVE SOURCES.** By row status: **98 work, 6
he has said come back, 6 have no door at all, 4 are broken, 3 are questions for
him, 1 is Phase 3 work.** Two narrative counts differ from those on purpose and
the file says so: §3 counts **seven** things with a working back end and no
working front end (the six with no door, plus the push switch, which is *broken*
rather than *no screen* because it IS on a screen), and §4 counts the **five**
removals he reversed in 2026-08-28. Three numbers the layout has to answer to:
**23 of the 118 are about one job** (the densest cluster in the product, and it
lives in one 340-line sheet), **37 are configuration** (nearly a third, and it
is what a customer meets), and **7 have no working front end** - three of the
four things the tenant websites are missing being among them.

**FIVE NEW DEFECTS, AND ONE IS BIGGER THAN A LAYOUT.** Part B listed 21; these
were not among them because nothing could see them until today.

1. **THE COLOUR SCREEN CANNOT CHANGE THE COLOUR CUSTOMERS SEE.** "Your colour"
   writes `primary_color`, with the whole correction system behind it. **In an
   email the two columns swap roles:** `primary_color` is the band behind the
   business name and `secondary_color` is the accent - the confirmation button,
   every label, the site link, and the invoice email's own title.
   `secondary_color` is reachable ONLY from a raw OS colour picker on *Business
   info*, and `create-business` inserts both columns null. Measured today
   against the twelve presets: white-on-band is **under the 3:1 large-text
   floor for four of twelve** (Silver 1.45, Sunflower 1.92, Sky 2.77, Gold
   2.94), and **picking "Sky" makes the invoice email's title 1:1 - the same
   colour on itself**, because the accent falls back to `#0ea5e9` on a
   `#0ea5e9` band. **Email is the one surface where a tenant colour is used
   with no floor at all; `accent-sweep.mjs` does not reach it.** This is the
   costly mistake at the top of DECISIONS.md's index, in a fourth place.
   **It is deliberately NOT one of the seven questions**: law 11 already says a
   tenant has ONE accent, so the two pickers are a schema accident rather than a
   choice the product offers. The fix is craft — one colour written to both
   columns, the email path given the same floor as every other surface, and
   `accent-sweep.mjs` grown to reach it — and it lands in the build stage.
   **Nobody re-asks him.**
2. **Today's section headings describe time; the sections are ordered by work.**
   "NEXT UP" over a job that finished at 4:15 PM, "LATER TODAY" over one that
   finished at 6:00 PM, both marked *Completed*. The ordering is right; the
   words are wrong for it. **Step 4, not a patch** - labels and ordering are one
   decision.
3. **The rail is three rails, and it says a finished job has not happened.**
   Counted in the browser: **three `.dayrail` elements on one screen**, one per
   section, where `dashboard-skeletons.md` §2 describes "one continuous
   hairline with a node per job". And `.landed` is only on the settled rows, so
   a completed job drawn as a CARD gets the hollow "ahead" node. The calendar's
   marks get this right and have three states.
4. **A paid job's rail node is the tenant accent; the calendar's is the fixed
   green.** Law 11b says money is never the tenant's colour. Same fact, two
   components, two colours.
5. **The btnrow overflow** - fixed, above.

**AND PART B'S DESKTOP FINDING NOW HAS THE MEASUREMENT IT COULD NOT TAKE.** Part
B proved there is no desktop layout with More (1,620px at 1920 vs 1,626px at
392) and History (3,619px at both), and had to skip Today because Today was
empty. **With a full day on it, Today is 1,810px tall at 1920 and 1,815px at
392** - five pixels apart across a fivefold difference in width, in a 724px
column with 62% of the monitor unused. **That is the screen he opens forty times
a day**, and it is now the strongest single number for decision 6.

**STEP 2 - FOURTEEN FINDINGS, AND THE SAMPLE IS SMALLER THAN 2.10'S.** Only
three of the six products document their screens at all (Jobber, Housecall Pro,
Zenbooker), so the counts are out of three, never six. The four that matter
most:

- **F4 - every documented job record is SECTIONED, 3 of 3.** Tabs in Jobber,
  named sections in Housecall Pro, grouped fields in Zenbooker. **Ours is one
  340-line scroll carrying 23 capabilities.** The strongest single finding in
  the file, and the job record is the one screen nobody has ever redesigned.
- **F7 - Housecall Pro splits money into TWO destinations** (My Money,
  Reporting). We have one tab doing both jobs. **Not an argument for a sixth
  tab** - it is the reason Part B's desktop Money is two columns.
- **F11 - NN/g says a record should open BESIDE its list, not over it**, because
  a modal hides the reference data. Our whole dashboard opens records in modal
  sheets. Right on a phone; the named mistake at 1920. Independent
  corroboration for decision 6.
- **F14 - every product changes navigation SHAPE on desktop; ours does not.**
  Housecall Pro states it outright. **Read carefully: Part A settled WHICH five
  destinations and in what order, and that is not reopened.** What is open is
  where the bar is DRAWN above the desktop breakpoint, which is decision 6's
  scope and belongs to step 3.

**Also new and useful: F1** (a home screen's sections are conditional - Jobber's
Reminders *"only appears when there's something to show"*), **F10** (NN/g's
ceiling is 2-3 unique indicators per list entry; our booking card carries four
families), and **F3** (Jobber gives Home's first slot to a dynamic setup guide -
direct evidence for the first-run question).

**HE APPROVED THE LIST AND ANSWERED ALL SEVEN, THE SAME DAY. THE LIST IS NOW
126 AND NOTHING IS WAITING ON HIM.** Three of the seven he answered BIGGER than
they were asked, and his caveat is instruction as much as approval: *"I didn't
read every single word because there's just so many words, and I think I'd lose
my mind reading that. But if it's just what we've already had established, then
it's fine."* **It was** - every original row carries a source tag and nothing was
invented outside §9. **§0a of the inventory is now a one-page version, and that
is the lesson: a file he has to APPROVE needs a top layer he can actually read.**

- **Q1, first-run - YES, and he overruled the recommendation.** "Empty states,
  not a wizard" was proposed; he wants **a setup form** that collects everything
  in Settings the booking page needs, **skippable and resumable**, AND
  **separately a guided walkthrough** of the dashboard. His three constraints on
  the guide are the specification and are not stylistic: **no paragraphs, MORE
  steps rather than fewer, never two things in one step.**
- **Q2, FAQ - YES, optional, never a default.** He asks each detailer; **the
  detailer writes the answers** ("they're the detailer"); AI may polish the
  wording only. Three rows, because turning it on, writing it and improving it
  are three different things.
- **Q3, week view - CONDITIONAL, and it is the only conditional row on the
  list.** *"If you could find a way to have a week view that's convenient and
  doesn't make it a burden, then sure."* Step 3 tries it against the desktop
  layout and **if it cannot be made good it does not ship.**
- **Q4, export - YES.** Jobs and expenses, nothing more.
- **Q5 - HE REPLACED THE QUESTION WITH A BIGGER ONE, AND IT IS THE MOST
  CONSEQUENTIAL ANSWER OF THE SEVEN.** Not just quotes: a per-detailer
  **switch between "a booking RESERVES the slot" and "a booking is a REQUEST
  the detailer accepts"**. Reserve-on-booking is Andrew's own model and it is
  currently baked in for everybody. He named where the accept action goes -
  *"the page that the detailer uses their bookings on"*. **This is engine and
  schema work and 2.11 reopens neither, so it is roadmap 2.12** - but it is on
  the list because **step 4 now designs the day screen WITH an accept state**
  instead of having one bolted on.
- **Q6, deposits - PARKED BY HIM**, explicitly, until he reaches payments. Not
  a row. Two things recorded for when he picks it up: the routing he described
  is the normal pattern and is done with Stripe Connect **without the platform
  ever holding the funds**, and deposits are the strongest answer to no-shows.
- **Q7, photos - his only worry was storage, and it is answered rather than
  handed back.** He already stores their photos: gallery images go to the
  `business-media` bucket, per-business folder, 10 MB cap, live since Phase 2.
  A before/after pair is ~1.6 MB, so a busy detailer at 1,560 jobs a year is
  **~2.5 GB/year**; Supabase Pro includes **100 GB** and overage is **$0.0213/GB
  /month** (checked 2026-08-31). **Ten detailers use about a quarter of the
  included storage in year one.**
- **And the email colour defect got a go-ahead it was not asking for:** *"we
  should work on the emails and other places where colors should apply. We
  should have it work and adapt based off of what color the detailer chooses."*
  **`accent-sweep.mjs` grows to cover the email path in the same change**, or
  the floor exists on paper only.

~~**WHAT IS OPEN: NOTHING FOR HIM. Steps 3, 4 and 5 are the next session's
work**~~ — **steps 3 AND 4 are now done too; see §6j and §6k.** **Step 5 is next** — the
component inventory — and step 6 is where he approves the whole specification.

## 6j. ROADMAP 2.11, STEP 3 — THE DESKTOP SPECIFICATION, AND A "NO" HE ASKED FOR (2026-08-31)

**One new file: `docs/dashboard-desktop-spec-2026-08-31.md`.** Nothing is
built. Judgment calls are DECISIONS.md → "Roadmap 2.11, step 3". **Nothing is
waiting on him.**

**THE MEASUREMENTS FIRST, BECAUSE THEY ARE WHAT THE SPEC IS ARGUING WITH.**
Taken today on the running app with a full day seeded: the content column is
**724px at 1920, 1440, 1280 and 768 alike**; Today is **1,810px tall on his
monitor**; Money 1,589px; More 1,620px. Calendar is the one that had never been
looked at properly — the month grid is 7 × **99.14px** cells, **553px tall,
bottom edge at y=753 at 1920x1080 AND 1440x900 alike**, which leaves **327px of
viewport below it on the monitor** as well as 1,196px beside it.
**It is the only screen in the product that is short and narrow at the same
time**, and no file had said so.

**TWO BREAKPOINTS, AND NEITHER IS A TASTE NUMBER.** **1024** is where the tab
bar becomes a rail: the rail costs 120px of left inset and still leaves 880px,
which is **156px more content than today**, so it can never cost width. **1180**
is `--wrap`, the layout token the design system already has and the dashboard is
the only surface ignoring — and it is exactly where a 637px primary + a 320px
secondary + a 24px gap fit. **Below 1024 nothing changes at all**, which is the
guarantee that makes this additive rather than a second design.

**FIVE SCREENS, FIVE DIFFERENT WIDE FORMS, AND THAT IS THE HARD PART.** The
lazy desktop answer is "list left, panel right" on all five, and five screens
sharing a skeleton is the failure law 1 exists to name. So: Today is the rail
plus *the future* (1.7/1); **Calendar · Month stays ONE column on purpose** —
splitting it takes the width straight back off the grid, and one column puts the
cell at **163px, wide enough to write "9:00 Tom O." instead of drawing a dot**;
History is the table plus the record; Money is the figures beside the lists,
which is F7's two destinations as two columns; Clients is a full-bleed table
whose record opens as **ruled rows with no panel**, because Clients is the only
screen in the product with no panel on it; Business is the only screen weighted
toward its RIGHT column, and it is where the **eleven settings sheets stop being
640px modals.**

**THE NAVIGATION ANSWER (F14): the same glass pill, turned vertical.** Fixed
left, vertically centred, 72px, same glass, blur, radius and active fill,
`flex-direction: column`. **Not a 220px label-beside-icon sidebar** — that is
the default admin shell, and `theme.css:525` already says in its own comment
that the pill exists to avoid exactly that. **The header does not change shape
at either width**, which resolves the collision F14 flagged.

**THE WEEK VIEW IS RULED NO, AND THE REASONING IS THE REPLACEMENT.** Row 31 was
the only `conditional` row on the list. A week view is a seven-column time grid;
at 356px of phone content that is **51px a column**, which carries neither a
name nor a time — so it would be desk-only, which is the burden he told me to
avoid. It is also a second grid on the only screen that is a grid, and the
demo's month holds **9 jobs across 5 days**, drawn into a 70-cell grid. **What
replaces it is the desktop month cell writing its jobs out — a week view five
times over, with no third mode and nothing changed on the phone.** The condition
that would overturn it is written down: a detailer with a crew.

**THE SWEEP GREW, AND IT NEEDED MORE THAN THE WIDTHS.** Default is now
**1920 / 1440 / 392 / 360 / 320** at the verification heights (1080, 900, 844),
and there is a fifth check, **`dead-width`**. It was baselined first and that is
the whole story: **the four existing checks report CLEAN on all 18 screens at
both 1920 and 1440 today**, with a 724px column on a 1920 monitor, because
"nothing is off the edge" is trivially true when 62% of the screen is empty.
Adding the widths alone would have bought a gate that stays green whether or not
the layout is ever built — the mistake at the top of DECISIONS.md. `dead-width`
prints **"276px short"** at both desktop widths today. **It is armed by one
constant, `DESKTOP_SPEC_BUILT`, currently `false`**: while false the measurement
prints and does not count, so the failure is visible without leaving a standing
gate red before the thing it gates exists. **Step 6 flips it in the same change
that ships the layout.**

**AND HIS REQUEST-VS-RESERVE CLARIFICATION IS CAPTURED — IT MAKES 2.12
SMALLER.** He said a request **still takes up the time slot**; two customers
cannot request the same time. The difference between the two modes is **the
promise made to the customer**, not the calendar's mechanics. That deletes what
roadmap 2.12 called its hard part — the exclusion constraint stays exactly as it
is and availability behaves identically in both modes. What is left is a
setting, a status, an accept/decline action and different wording. **Roadmap
2.12, inventory §9 Q5 and spec §8 all carry it now**; the harder reading is
struck rather than deleted, so nobody re-derives it.

**ONE QUESTION HANDED FORWARD, NOT TO HIM.** Clients and History both want a
ruled list whose rows carry columns. The recommendation is that this is the
existing *ruled list* widening rather than a new "table" in the composition
vocabulary — but bucket 2 says the vocabulary is added or refused **at step 5,
deliberately and once**, and step 5 is already where card-versus-list is being
settled. **Step 5 rules.**

## 6k. ROADMAP 2.11, STEP 4 — EVERY SCREEN DESIGNED, AND FOUR DEFECTS ON TODAY (2026-08-31)

**One new file: `docs/dashboard-screen-designs-2026-08-31.md`.** Nothing is
built. Judgment calls are DECISIONS.md → "Roadmap 2.11, step 4". **Nothing is
waiting on him.** Step 5 (components) is next; step 6 is his approval gate.

**EIGHTEEN SCREENS, AND THE SIX STATES ARE DEFINED ONCE AT THE TOP.** Empty,
one, many, loading, error and staff are a table in §1a; each screen below says
only what *differs*. Eighteen screens × six states written out in full is the
file he already told us he cannot read — *"there's just so many words"* — and
§0a is the one-page layer that caveat earned.

**THE THREE NAMED DEFECTS WERE RE-MEASURED IN A LIVE BROWSER BEFORE BEING
DESIGNED AGAINST, AND THE NUMBERS ARE THESE.** Signed in as the seeded demo
owner with the full day on screen at 1920:

- **`railCount: 3`** — three `.dayrail` elements where `dashboard-skeletons.md`
  §2 specifies *one continuous hairline with a node per job*.
- **Both completed job cards draw `rgb(11,13,14)` with a `rgb(207,210,206)`
  inset ring** — the hollow "this job is ahead" node, on jobs that finished at
  4:15 PM and 6:00 PM.
- **The three settled rows draw `rgb(14,165,233)`** = `#0ea5e9`, **the tenant's
  accent**, where the calendar's `.dot.paid` draws `--ac` `#38E08B`. Law 11b in
  one component and not the other.
- The labels, in the flesh: **"NEXT UP" over a job that ran 2:45–4:15 PM and is
  marked *Completed*.**
- Also confirmed in passing: `.app-main` **760px** and the document **1,805px**
  tall on a 1920 monitor — step 3's measurement standing up.

**THE LABEL FIX IS A DELETION.** "Next up" and "Later today" collapse into
**one** run, *Still to do*. They were never two kinds of work — one kind, split
by a clock the ordering already respects, and the split is exactly what made
the label lie. Three runs named for the work: **Needs payment · Still to do ·
Done**, with the calendar's own node vocabulary (hollow ring ahead, solid
`--accent` finished, solid `--ac` paid). **The warn-box goes with it** — it says
what the *Needs payment* label now says with its count.

**A FOURTH DEFECT WAS FOUND BY LOOKING AND NOTHING HAD NAMED IT.** Leaving
Today and coming back replaces `.app-main`'s only child with `.center` carrying
a spinner — the whole day thrown away and redrawn. Observed with a
MutationObserver rather than reasoned: `["group|kids=3", "center|kids=1"]`. And
`useBookings.reload()` sets `loading` true, so **the same thing happens after
"Mark complete" and after "Finalize payment"** — the day vanishes and
re-arrives, staggered animation and all, as a reward for finishing a job. Three
screens do three different things while loading today; §1a is one rule for all
of them.

**AND ONE MOTION CONSEQUENCE OF FIXING THE RAIL, CAUGHT BEFORE IT COST
ANYTHING.** The arrival staggers `.app-main > .group > *`. Making the rail one
element would make the whole day arrive in a single slot — the signature move
lost to a bug fix, which is what law 3 forbids. **The stagger moves inside the
rail** and the day arrives one job at a time down the thread, which is closer to
"scattered becomes ordered" than what ships. Same budget, same ~580ms ceiling.

**THE JOB RECORD GOT THE MOST WORK, WHICH IS WHAT F4 ASKED FOR.** 26 of 126
capabilities on one object, in a 340-line single scroll reached from four
places, and the one screen nobody has ever redesigned. **An action bar over six
named sections** — sections not tabs, because a tab strip inside a sheet inside
a phone is a second navigation on a screen whose job is scanning. **The largest
single change in the file is moving Call / Text / Navigate to the top**: they
sit under a heading called *Contact*, four blocks down, on the screen you open
standing at the car.

**THE REQUEST QUEUE IS DESIGNED, EMPTY, AND NOT ON THE RAIL** — the rail is
*today's day* and a request can be for any date, which is the same reason the
skeletons file already refuses to run it through tomorrow. **Two things 2.12
therefore does not have to re-derive:** a waiting request outranks unrecorded
money in the one-lit-thing order, and **a request needs no new calendar mark**.

**ONE QUESTION DELETED ITSELF BY BEING LOOKED UP RATHER THAN ASKED.** "May
staff record a payment?" was about to go to him. `20260827003000_staff_roles.sql`
answers it: staff have **bookings, calendar and customers**, the database
returns zero rows from `expenses`, `business_settings`, `promo_codes` and
`campaigns`, and `update-booking` has no role gate. **So staff may finalize a
payment and may not read the books.** Recorded because the near-miss is the
lesson. The file carries the sentence that came out of it: **a UI that hides a
figure from staff is a courtesy, not a control.**

**FOUR DOORS FOR THINGS THE DATABASE ALREADY HOLDS**, which is what stops the
rebuild being the same thing redrawn: **Reviews** (`testimonials` — the booking
page already reads it and nothing writes it), the three **social links** with
columns and no fields, the **FAQ** he asked for, and **Switch business**.
Built-with-no-door goes from **seven to three**, and each of the three has a
stated reason rather than an omission.

**THREE FILES THAT OUTRANK THIS ONE GET UPDATED AT STEP 6, NONE OF IT SILENT.**
`design-system.md` law 11b's table splits the rail node (`--accent` completed,
`--ac` paid) — **and its paragraph is answered rather than overruled**, since
the accent stays on every unpaid-finished node, the lit bloom and every button.
`dashboard-skeletons.md` §6 gains the request at the top of the lit order. And
**the desktop spec's §4a loses one table row**: the three day controls expand in
place at both widths rather than becoming modals, because that is the owner's
own W1 instruction and a table does not outrank it.

**AND ONE "MEASURE IT AT BUILD TIME" WAS CLOSED IN THIS SESSION INSTEAD OF
HANDED ON.** The job record's second action row (Calendar · Contacts ·
Reminder) was written with a note saying step 6 must check it at 320, because
the neighbouring `.btnrow` on a job card sits at **1px of spare room**. Opened
the sheet at 320 and measured it: `.actions-row` is a CSS **grid**, one column
per child, so it divides rather than overflows — **89px a button, 38px tall,
one line**, and *Reminder* dropped into that column is **90px wide, 38px tall,
zero overflow. It fits.** The ceiling is now a number rather than a worry:
**about eight or nine characters, ~60px of text** — *Remind them* wraps to
41px. That is why the button says *Reminder*.

**WHAT STEP 5 INHERITED AND HAS NOW RULED — see §6l:** History's and Clients'
column-carrying row is **one CSS chassis with two call sites, not a component
and not a new "table"** (which settles 2.10's declined decision 7 —
`composition.test.mjs` test 1's allowance becomes per-CALLER), and both new
shapes are specified: the progress rule fills a segment only when a step is
**completed**, and the spotlight is one element and a 9999px shadow.

## 6l. ROADMAP 2.11, STEP 5 — THE COMPONENT INVENTORY, AND THE THREE RULINGS (2026-08-31)

**One new file: `docs/dashboard-component-inventory-2026-08-31.md`.** Nothing
is built. Judgment calls are DECISIONS.md → "Roadmap 2.11, step 5".
**Step 6 is HIS approval gate and it is the next thing that needs him** — the
whole specification, steps 1 through 5, in one yes.

**TWELVE NEW FILES, ONE DELETED, NOTHING INVENTED.** 61 source files become
72. Sixteen components are untouched, fifteen are rewrites of things that
already exist, `BookingCard` is kept and narrowed from five callers to two,
and `More.jsx` is the only deletion (it becomes `Business.jsx` +
`GearMenu.jsx`). The twelve: Business, GearMenu, the settings registry,
Reviews, Faq, SwitchBusiness, ClientRecord, RecordHost, useWide, SetupForm,
Walkthrough, and the accountant export.

**RULING 1 — HISTORY'S ROW AND CLIENTS' ROW ARE ONE SHAPE, AND IT IS CSS.**
`.rows` / `.row-item` gains a column mode and two column templates three lines
apart in `theme.css`; each screen writes its own row markup. **No React
component, and the desktop spec's nominated "table" is REFUSED** — what these
screens need is the hairline, the row rhythm and the tap height they already
have, with the row's interior going from a stacked pair to N columns above
1024. The container does not change, so there is no new container. **Bucket
2's one permitted vocabulary addition is therefore spent on nothing, on
purpose**, and the vocabulary stays at seven. The reason it is CSS and not a
`<ListRow columns={...}>`: a component that takes a column list IS a generic
table primitive, and that is the eighth screen inventing a fourth kind of list
arriving through the front door rather than by accident.

**AND THAT SETTLES 2.10'S DECLINED DECISION 7, WHICH IS WHY IT WAS PARKED
HERE.** `composition.test.mjs` test 1 is blind because its ALLOWED list is
keyed to a COMPONENT: `BookingCard.jsx` is on it, so any screen may map an
unbounded list onto it and pass. **The allowance becomes `file > component`**
- `Today.jsx > BookingCard` and `DaySheet.jsx > BookingCard` allowed with
reasons, `Calendar.jsx` and `Clients.jsx` not — and the test learns to resolve
components rather than only seeing a `className` in the same file.
`design-system.md` § Composition gains the sentence that makes it enforceable:
**"a card rendered from a list through a component is still a card."**

**RULING 2 — THE SETUP FORM'S PROGRESS RULE IS A DATA QUESTION DRESSED AS A
VISUAL ONE.** Seven segments, `--hairline` track, `--accent` fill, and **a
segment fills in when a step is COMPLETED, never when it is passed.** Step 4
made setup skippable on his own words AND made Business carry *"Finish setting
up · 3 of 7 done"*; a bar that painted position would fill to the end for a
detailer who skipped everything and then be contradicted by Business. One
number, both places. **A skipped step is a hole in the bar and the hole is the
feature** — which is why it is segmented rather than one continuous fill.
Ceiling stated: ~31px a segment at 320 with seven steps.

**RULING 3 — THE SPOTLIGHT IS ONE ELEMENT AND A 9999px SHADOW.** A very large
spread shadow dims everything OUTSIDE the box, so the box is the hole: one
element, one rect, no mask, no `clip-path` arithmetic, no second copy of the
dashboard, and it never touches the styles of the thing it points at. **The
rule a later session would otherwise find the hard way: it must be verified
against the EMPTY dashboard, not the seeded demo** — step 4's step list
includes *"a job"* and a first-run detailer has none, so the tour is six steps
that day and seven later and both are correct. Targets are found by a
`data-tour` attribute, which is what makes the step list survive a target
moving into a second column at 1180.

**ONE RULE REORGANISES MORE CODE THAN ALL THREE, AND IT ONLY APPEARED WHEN THE
COMPONENTS WERE COUNTED: a record renders its content, its container is the
caller's.** There are **eleven `<Sheet>` call sites across ten files** and four
of them are records that above 1180 must open beside a list. `Sheet.jsx` does
not change — four things stop BEING a sheet and start being HOSTED in one,
through one ~20-line `RecordHost`. Six screens each writing their own width
check is how the 320 floor got fixed on one screen and not its neighbour twice
already.

**THREE THINGS FOUND BY COUNTING, WHICH IS WHAT A BOOKKEEPING PASS IS FOR.**
**`--wrap` has never existed in `theme.css`** — the desktop spec names its
breakpoint after it and the token lives in `landing.css:115`, scoped to `.ld`.
**`.badge` is seven dead rules** with zero users anywhere in `app/src` or
`supabase/`, a byte-for-byte duplicate of `.pill`; deleting it costs
`accent-sweep.mjs` **no rows and no coverage** — it never had a `.badge` row,
only one row labelled for both, the two being the same declaration. What it
costs is five stale comments, corrected in the same change. **And two counts are off by one** — there are **thirteen** settings
screens, not step 4's "twelve" or the desktop spec's "eleven"; Switch business
is a fourteenth destination and is not one of them, because it is a picker and
does not share the settings skeleton. **Both were corrected at source in this
session rather than only reported**, each with a dated note.

**AND A FOURTH THING THE COUNT TURNED UP.** `sweep-widths.mjs:90` holds a
`MORE` array of **eleven settings-screen titles**; Reviews and FAQ would never
be visited and the sweep would report clean across eighteen screens having
opened sixteen — the "a skipped check reads like a passing one" family, in the
script that exists to prevent it. It also opens all eleven from one door, and
§10 moves the plumbing behind the gear. Step 6 gives it thirteen titles and two
routes.

**`.dashed` DIES — THE CLASS AND ALL SEVEN USES** — because step 4 leaves no
shape for a dashed box to be. `sweep-widths.mjs`'s `boxy()` matcher lists
`.dashed`; once nothing carries the class that matcher matches nothing, which
is the "a skipped check reads like a passing one" family in miniature, so step
6 takes it out of the selector in the same change.

**ONE THING WAS CONSIDERED AND REFUSED, RECORDED SO IT IS A DECISION RATHER
THAN AN OVERSIGHT: `Calendar.jsx` is NOT split into Month and History.** Two
desktop layouts in one file is a real argument and it lost to the repo's own
evidence — the `mode` branch already separates them and this codebase's norm
is 500–600 line screens (`BookingRules` 541, `Catalog` 614). **The trigger
that reverses it is written down:** if either mode needs its own scroll or
sticky container, split then.

**NOTHING IS WAITING ON ANYONE EXCEPT HIM, AND WHAT HE OWES IS THE WHOLE
SPECIFICATION.** Steps 1–5 are five files. Step 6 is his yes, and then it gets
built one screen at a time.

## 6m. ROADMAP 2.11, STEP 6 — THE ASK IS ON THE TABLE, AND THE SESSION IS OPEN (2026-08-31)

**One new file: `docs/dashboard-spec-approval-2026-08-31.md`. Nothing is built,
and nothing may be built until he answers.** It is the page that stands in for
reading five files totalling ~200KB, which is the only way this gate is
answerable given his own caveat — *"there's just so many words, and I think I'd
lose my mind reading that."* Each of the five files already has a §0a one-pager;
what did not exist was a top layer ACROSS them, and a single place his answer
can be written down.

**IT IS ORGANISED AROUND THE EIGHT PLACES THE SPECIFICATION TAKES SOMETHING
AWAY OR CONTRADICTS HIM, NOT AROUND WHAT IT ADDS.** Additions do not need his
attention; removals are the class of change he has reversed before (five of
them on 2026-08-28). §3 of the approval page: **the week view ruled NO** against
his conditional yes (the one outright contradiction, and the replacement is the
argument); the **push switch withdrawn** until the browser half exists; the
**dead travel-fee field** and the **second colour picker** deleted; the
**"N jobs need payment" box** deleted in favour of the heading that says it;
**Business 8 headings → 3** with the plumbing moving behind the gear; **staff
lose the Business tab**; and **monthly plans still has no door** although it is
one of the five he asked to bring back — named as its own roadmap item rather
than invented in the margin.

**A BUILD ORDER IS PROPOSED BECAUSE NO FILE HAD ONE.** Checked: neither step 3,
4 nor 5 names one. **The shell ships WITH Today rather than before it** — the
vertical rail, `--wrap`, `useWide` and `RecordHost` are shared plumbing, and a
session that builds plumbing alone has nothing to look at, which is this
project's own rule about verifying by LOOKING. Then the job record, Calendar,
Money, Clients, Business + the thirteen settings screens, and **first run last
on purpose**: a walkthrough of screens that are still moving gets rewritten
once per screen.

**ONE CLAIM IN THE DRAFT WAS WRONG AND WAS CAUGHT BY READING `theme.css`
INSTEAD OF ASSUMING.** The approval page called the Today box an *orange
warning box*. `theme.css:755` says the opposite in its own comment — *"NOT a
warning any more… There is no amber in this system and inventing one for a
to-do would be the third hue."* It is a bordered panel with the accent on its
marker only. Described to him by what it SAYS instead.

**AND CHECKING MY OWN SUMMARY AGAINST THE SCHEMA FOUND A HOLE IN THE
SPECIFICATION THAT STEPS 4 AND 5 BOTH WALKED PAST.** The approval page called
the FAQ one of the four "doors", so the claim was checked: **the FAQ has no
table and no column anywhere.** `grep -i faq supabase/migrations/` returns
nothing and `business_branding` has no field for it — and the inventory said so
in step 1 (*"no table, no screen"*, §5) before four steps of design forgot it.
**Both step 4 §17 and step 5 §4 assert "touches no schema" on a page that
designs a screen needing one.** Reviews, the social links and Switch business
are doors onto storage that already exists; the FAQ is not, and grouping all
four under one word is exactly what hid it. **It is a WHEN question, so it went
to him** as §3b of the approval page with a recommendation — build it in Phase 3
alongside the page that would display it, since otherwise a detailer writes
answers nothing renders. **Both spec files carry a dated correction pointing at
it**, so the contradiction cannot be re-inherited. If he takes the
recommendation, `Faq.jsx` leaves the twelve new files and the settings screens
go back to twelve.

~~**WHAT IS WAITING: his yes, and his (a)-or-(b) on §3b. Nothing else.**~~
**HE ANSWERED THE SAME DAY — §6n.** The session stays open per
CLAUDE.md — no sign-off, no next-session prompt, because a prompt in the chat
reads as "go clear" and would bury the ask. **§6 of the approval page is a
blank block for his answer**, and his answer gets written there before anything
is built, because an answer that lives only in the chat dies at the clear.

## 6n. ROADMAP 2.11, STEP 6 — HE ANSWERED: APPROVED WITH AMENDMENTS, AND HE LIFTED A RULE (2026-08-31)

**His answer is §6 of `docs/dashboard-spec-approval-2026-08-31.md`, written out
in full with what each part settles and what it costs.** He approved the
specification and amended it in the same breath: **two of the eight reversed, a
third that was wrong as written withdrawn, the phone reopened, and the
no-schema rule lifted outright.** Nothing is built. **Step 4b, the phone pass,
is the next session and it is the only thing standing between here and code.**

**THE BIGGEST THING HE SAID IS NOT ABOUT A SCREEN.** *"I don't know why there
was a rule that did not edit the back end. You could 100% edit the back end
however much you want… We got tables if we need to."* **Roadmap 2.11's
no-schema constraint is withdrawn by the owner** — it came from the item's own
wording, four steps of specification were written inside it, and he did not
know it was there. Struck at source in `docs/roadmap.md` (2.11's "(b)") and
recorded in CLAUDE.md, because a session that inherits it from an older file
will do LESS than he asked for. **The append-only migration rule is
unaffected** — it governs how you change the schema, not whether you may.
**And what he refuses is the opposite of what that rule protected:** structural
inheritance from the OLD DASHBOARD. *"forget that the old dashboard even
existed… it should be based off of the design of our current landing page."*
The look was never in question; `design-system.md` already derives from the
landing page and `DESIGN.md` already says the page wins.

**TWO OF HIS ANSWERS TURN ON BELIEFS THE CODE DOES NOT SUPPORT, AND BOTH WERE
CHECKED RATHER THAN ARGUED WITH.**

1. **THE PHONE PUSH NOTIFICATIONS DO NOT EXIST — WHAT ALERTS HIM IS EMAIL.**
   He said *"it works since it's been working for me"* and reversed the removal.
   The server half is complete and good: VAPID keys, `web-push`,
   `owner_push_subscriptions`, `sendOwnerPush()` called from `create-booking`.
   **The browser half is absent entirely** — no service worker file anywhere in
   `app/`, no `PushManager.subscribe`, no permission prompt, and nothing ever
   calls `owner-push-subscribe`. So the table is empty and `sendOwnerPush`
   returns `sent: 0` every time. **What reaches him is the switch directly above
   it in the same group — "A new booking comes in", an email** — and his live
   business runs on a different codebase (`carwashweb`) besides. **Decided, not
   re-asked, because his instruction was "keep it": the switch stays and the
   missing half gets BUILT**, so what he believes becomes true.
   **HE CLARIFIED THE SAME DAY AND THE FINDING STANDS:** *"I'm seeing it worked
   on my admin dashboard. Not the one that we're building, but the one for my
   business. So I'm saying we shouldn't remove notifications because I know
   that it's possible."* **He was arguing from proof that it is achievable, not
   claiming this product does it** — so there was never a disagreement, and the
   outcome is unchanged. **The
   constraint to carry: on an iPhone, web push works only once the page is
   added to the Home Screen.** Apple's rule.
2. **HE ALREADY HAS A TRAVEL FEE, AND THE APPROVAL PAGE HAD JUST TOLD HIM IT
   WAS BEING DELETED. THAT WAS THIS SESSION'S SECOND WRONG CLAIM.**
   `pricing.ts:135` returns the flat fee and `computeQuote` charges it — that is
   what roadmap 2.8c fixed — and **travel AREAS with per-area fees already
   exist** and are picked by the customer. **Part B row 5 was precise and step 4
   flattened it:** the field is superseded *only when areas exist*, and the
   change is that it becomes a sentence, not that anything is deleted. **A field
   that is dead in ONE CONFIGURATION is not a dead field**, and dropping that
   condition turned a live money path into a proposed deletion. Corrected at
   source in step 4 §11 and on the approval page.

**WHAT HE ASKED FOR THAT IS NOT DASHBOARD DRAWING — THREE NEW ROADMAP ITEMS,
so 2.11 does not swell until it never lands:**

- **2.13, custom roles and permissions.** He rejected fixed owner/staff:
  *"invite someone, and you could give them a name, like a customizable name,
  and… options on what permissions they should have."* Today
  `business_users.role` is `check (role in ('owner','staff'))` and **the
  enforcement is in row-level security** via `is_business_owner()` across the
  money, settings and marketing tables. This is a permissions MODEL plus every
  one of those policies rewritten. **The thing that must survive it:
  `protect_last_owner()`, a trigger that binds even the service role.**
  **Step 4 §10's "staff get no Business tab" stands until this ships** — it is
  correct for the two roles that exist today.
- **2.14, plans a customer can sign up to — and he asked for RESEARCH FIRST**,
  which is step 1 of the item: do the trade's booking systems carry recurring
  plans at all, and is the plan sold IN the booking flow or beside it? He runs
  plans himself and explicitly does not want that generalised without evidence.
  **`monthly_plans` exists and is ONLY a discount** — name, description,
  percentage-or-amount, active. **No cadence, no enrolment, no recurring
  booking.** So "monthly plans come back" was never a matter of giving an
  existing feature a door, and step 4 §15 was right to refuse it.
- ~~**2.15, travel by measured distance.**~~ **WRITTEN AND CLOSED THE SAME DAY,
  UNSTARTED.** Told what the automatic part costs — a map service, a per-lookup
  fee, every customer address leaving the product — he refused it: *"I don't
  wanna do automatic calculations. Or… we can have the customer check
  themselves… are you outside of, like, ten mile range, and they just click
  something."* **That is `travel_zones`, which shipped in 2.8c**: the detailer
  names and prices their own areas, and the customer picks one from *"Which
  area are you in?"* on the booking page, each option showing its surcharge
  (`StepLocation.jsx:107-122`). **Two areas — "Within 10 miles" at $0 and
  "Outside 10 miles" at his price — IS his example, already working.**
  Kept as a closed item, not deleted, because the refusal is the load-bearing
  part: automatic detection is the obvious next idea and it will be proposed
  again. **He would reopen it "if there's someone to do it for free"** — a cost
  preference, not a rejection of the capability.

**THE TAB BAR WAS REOPENED IN PRINCIPLE AND CLOSED ON HIS OWN CONDITION.** He
said not to keep five tabs merely because the old dashboard had them — *"we
might have five. We might have six. We might have two"* — and then, in the same
answer, *"as long as that's the best order and amount, then that's fine."*
**They pass his test on the record:** `dashboard-architecture-2026-08-31.md`
§3a derives them from **the five questions a detailer's day contains, before
looking at our own tabs at all**, then compares six competitor products; four
landed where the product already was and the fifth changed *because* of the
derivation. §3b states why not four and why not six. **Shown to him rather than
asserted, and not re-derived.**

**THE PHONE IS REOPENED, AND HALF OF THAT IS THIS SESSION'S WORDING.** He
objected to *"not the phone"*: *"the whole admin dashboard is changing both with
desktop and phone."* The sentence meant something narrow and true — **no screen
grows a second column below 1024px** — and read as *the phone keeps the old
dashboard*, which was never the plan. **But his instruction goes further than
step 4 went, and that part is a real gap:** step 4 describes several phone forms
as *"what ships today"*, and under *forget the old dashboard existed* an
unchanged screen is the absence of a decision rather than a decision.
**Step 4b re-decides every screen's phone form from scratch. It is the next
session.**

~~**THE ONE NEW CHECK HIS ANSWER BOUGHT: PHONE LANDSCAPE.**~~ **HE REVERSED
THIS THE SAME DAY — SEE §6o. PHONES ARE PORTRAIT ONLY.** He asked landscape to
survive (*"if you shrink a page or you'll not full screen it or goes to
landscape"*), so step 4b measured 844x390 and it is genuinely broken. He then
said the opposite and was precise about why: *"when someone flips their phone
over sideways, I don't want it to completely readjust… it might get annoying."*
**`844` is NOT in `sweep-widths.mjs` and `heightFor()` has no special case** —
what step 6 owes instead is a guard that stops the layout changing on rotation.
The rest of the paragraph stands and is worth keeping: a current iPhone is
393x852 and a Samsung 360x800, **both already inside 392/360/320**, and the
laptop is 1440x900.

**THE FAQ QUESTION CAME BACK AS HALF OF EACH OPTION, AND HIS SPLIT IS THE
CHEAPER ONE.** *"you could definitely add stuff to the supabase… Just add a
small bit of database now, but we could tackle FAQ later."* **Storage lands in
2.11; the screen waits.** So it is **twelve settings screens, not thirteen** —
the third correction to that count in three sessions.

**WHAT IS WAITING ON HIM: NOTHING.** Every question this session opened is
answered or has become a roadmap item with its decision written into it.
**Two of his clarifications landed after the first sign-off and both are
above** — the push sighting was his OWN business's dashboard (which confirms
the finding rather than contradicting it), and travel-by-distance is refused and
closed. **His verdict on the rest: *"everything else looks good."*** Roadmap
2.13 and 2.14 are the only items his answer added.

## 6o. ROADMAP 2.11, STEP 4b — THE PHONE RE-DECIDED, AND HE RULED IT PORTRAIT-ONLY (2026-08-31)

**One new file: `docs/dashboard-phone-pass-2026-08-31.md`, and it is the phone's
authority over step 4 wherever the two disagree.** Nothing is built here.
**Step 6, the build, is the only thing left in 2.11 — and its STAGE 1 (the shell
and Today) is now built: see §6p.**

**WHY THE STEP EXISTS IS BIGGER THAN THE SENTENCE HE OBJECTED TO.** He rejected
*"below 1024 nothing changes"*; step 4 describes five screens' phone form as
*"what ships today"*, *"exactly what ships"* and *"the sheet, as today"*. Under
his own instruction — *forget the old dashboard existed* — **an unchanged screen
is the absence of a decision.** Every screen was decided again from nothing;
where the answer came out the same the reason is written down and the screen
earned it. **"Unchanged" was not an allowed answer anywhere in the file.**

**THE FOUR PORTRAIT DECISIONS, all measured at 392x844 on the seeded five-job
day:**

1. **Only the lit job is a card.** The day draws **five identical 289px cards**
   — word for word a named tell in this project's own `design-knowledge.md`
   §1. The rest become one row each (71px, the measured `.row-item`): **the rail
   region 1,522px → ~633px, and the day 3.4 screens → a projected 1.7.** What
   actually changes for him is what sits above the tab bar at y=785: **one whole
   job of five today, against the lit card and three rows.** It also makes *one
   thing lit* a matter of FORM rather than colour, which is what the marks
   vocabulary is for.
2. **A settings screen becomes a page, not a sheet.** The row's `›` chevron
   promises a push and delivers a peek; a sheet with an inner scroller inside a
   scrolling page is two scrollers, and *Services & add-ons* is four lists
   inside one; and **step 4 §10 already moved this way at the desk.**
   `dashboard-skeletons.md` §3's justification survives word for word — *reached
   one at a time* is still true of a page.
3. **Today's 112px ledger panel becomes one row of three bare figures**, so the
   first job moves 318 → ~262px. The masthead is deliberately NOT cut — it is
   the type contrast that keeps these screens off the default-app-shell shape.
4. **A Clients row drops the customer's EMAIL** — the least useful thing about
   a customer to a detailer holding a phone — for **lifetime spend and last
   visit**, which is step 4's *"shows what it already calculates and currently
   hides"* made concrete.

**AND HE RULED THE PHONE PORTRAIT-ONLY, WHICH CLOSED THE OTHER HALF OF THE
STEP.** He asked for landscape in the morning (*"or goes to landscape… it
should be able to modify and move around"*), so it was measured; he reversed it
the same day and was precise about why: *"for the phone version, it should
always just stay portrait… when someone flips their phone over sideways, I
don't want it to completely readjust. I could tell if we had that, it might get
annoying."*

**THIS IS NOT "DO NOTHING", AND THAT IS THE ONE THING A COLD SESSION WILL GET
WRONG.** The dashboard **readjusts on rotation today**, and nobody chose it:
`theme.css`'s `min-width: 700px` and `min-width: 560px` fire on a sideways
phone, because a sideways phone is **844px wide**. The 700px rule says *"on a
wide screen the sheet stops being a sheet and becomes a panel"* — so a settings
screen becomes a centred desk panel at `86vh` of 390px = **335px, showing 20% of
Business info's 1,365px form.** **Both breakpoints gain `and (min-height:
500px)` at step 6** — one clause, two places, desktop untouched because a desk
screen is taller than 500px. **The transferable rule: a layout decision that
spends height must ask about height.**

**WHAT THE RULING WITHDREW**, all of it designed and then taken back out: a left
rail on short screens, sideways column-pairing, full-bleed sheets sideways, a
shorter calendar cell sideways, **`844` in `sweep-widths.mjs`'s default sizes,
and the `short-screen` check written for it** — removed rather than left
dormant, because a check nothing triggers is a check that rots. **The
measurements are kept in the phone pass §20** precisely so nobody re-measures
them in six months and files them as a discovery. **A true orientation lock is
not available to a web page** — it needs a manifest and a Home Screen install,
Android honours it and iPhone ignores it, and there is no manifest in `app/` at
all; worth one line if the push-notification work lands, not worth creating one
for on its own.

**ROADMAP 2.16 WAS OPENED AND CLOSED BY THE SAME RULING.**
`sweep-booking-steps.mjs 844x390` reports **all eight steps of the CUSTOMER's
booking page over, the worst by 467px — 120% of the screen, on step 1.** W16 is
the owner's rule that a customer never scrolls inside a step, and he has now
scoped the shape it applies to: **W16 is a portrait rule.** Closed unstarted,
numbers kept in the item.

**WHAT IT CHANGES IN THE FILES ABOVE IT** — three, all dated in place: step 4
§1d gains a **third container** (a settings screen is a place you go, not a
record); step 4 §4/§5 make the day panel **inline at every width, one component
not two**; and `theme.css` gets the height guard above. **The desktop
specification is UNCHANGED** — an earlier draft of the phone pass widened its
`--bp-rail` to short screens and the ruling withdrew that.

**ONE THING STEP 6 CANNOT VERIFY FROM A SCRIPT.** Every number here came from a
headless browser. A real phone has a notch, a home indicator, a URL bar that
comes and goes, and a keyboard — and `100dvh` behaves differently under all
four. **The pinned primary action on a committing form (§13) is the one that
most needs a real thumb on it**, since a phone keyboard takes about 300px of an
844px screen. Mid-range Android is already on `DESIGN.md`'s open list.

**WHAT IS WAITING ON HIM: NOTHING.**

## 6p. ROADMAP 2.11, STEP 6 — STAGE 1 IS BUILT: THE SHELL AND TODAY (2026-09-01)

**The first code in the rebuild.** The approval page's §5 build order is seven
stages and this is stage 1; the phone pass was stage 0 and is done.
Judgment calls are DECISIONS.md → "Roadmap 2.11, step 6, stage 1".
**Nothing is waiting on the owner.**

**THE NUMBERS, WHICH ARE THE POINT OF THE STAGE.**

| | Before | After |
|---|---|---|
| `.app-main` content column, 1920 and 1440 | 724px at every width | **1,144px** |
| Today's document height, 1440x900 | 1,810px | **1,006px** — required ≤1,200 |
| Today's document height, 392x844 | ~2,500px (3.4 screens) | **1,103px** |
| `.dayrail` elements on Today | 3 | **1** |
| A finished job's node | the hollow "still ahead" ring | solid `--accent` |
| A paid job's node | `#0ea5e9`, the tenant's accent | `--ac` `#38E08B` |
| Today's ledger at 392 / 320 | a 112px sunken panel | **75px / 98px**, bare figures |

**`DESKTOP_SPEC_BUILT` IS `true`** and `dead-width` gates from now on. The
sweep is clean at 1920 / 1440 / 392 / 360 / 320 in both the normal and
`?lite=1` paths; `composition`, `design-contrast`, `landing-pricing`,
`route-contract`, `decisions-index` and `accent-sweep` all pass.

**WHAT SHIPPED.** The tab bar becomes a vertical glass pill rail at ≥1024 —
**the same component with `flex-direction: column`**, not a 220px sidebar,
which `theme.css` already argued against in its own comment. `--wrap` finally
exists in `theme.css` (it only ever lived in `landing.css`, scoped to `.ld`)
and `.app-main` takes it. `.split` / `.col-1` / `.col-2` carry the second
column at ≥1180, `hooks/useWide.js` is the one width check and
`components/RecordHost.jsx` the one container decision — **`BookingDetail` no
longer renders its own `<Sheet>`, so a job opens BESIDE the day at a desk and
the rail does not move** (NN/g's F11, desktop spec §5a). The header carries the
`+` and Today's full-width *New booking* button is gone; the top bar's copy of
the screen's name is gone with it, which was the third place one phone screen
named itself. Today is one rail with three runs named for the work — **Needs
payment · Still to do · Done** — carrying the calendar's own node vocabulary,
with **only the lit job as a card** and everything else a row. The phone's
ledger is three bare figures; Tomorrow is one line that opens tomorrow's day.
The warn box is gone (its label says what it said, with the count).

**THREE THINGS A COLD SESSION WOULD OTHERWISE RE-DERIVE THE HARD WAY**, all
three in DECISIONS.md in full:

1. **A flat DOM cannot carry a second column.** The split was built flat first,
   to protect the staggered arrival that reads `.group > *`. A grid row is as
   tall as its tallest item, so the second column at `grid-row: 1` made row 1
   264px tall and pushed the ledger a fifth of a screen down — and there is no
   escape: `grid-row: 1 / -1` resolves against the EXPLICIT grid, which has no
   rows. **`.col-1` wraps and the stagger block carries a second selector on
   every line.**
2. **The rail's `animation: none` must sit AFTER the stagger block**, not next
   to `.dayrail`. Both selectors are (0,3,0); source order decides, and written
   in the obvious place it silently lost.
3. **The rotation guard was THREE places, not the two the phone pass listed.**
   The calendar cell's own `min-width: 700px` rule spends height (56px → 88px),
   so rotating a phone made the month grid taller on the shortest screen in the
   product. **Found by grepping the breakpoint rather than trusting the list —
   and that is the lesson: a file that names two instances of a pattern invites
   a session to fix two and stop.** Verified at 844x390.

**WHAT STAGE 1 DELIBERATELY LEFT, so nobody reads more as built than is.**
~~**The job record is still the 340-line single scroll** — it opens beside the
list now, but the action-bar-over-six-sections redesign is stage 2.~~
**STAGE 2 SHIPPED THE SAME DAY — see §6q.** `.dashed`
and `.badge` do NOT die yet (five of `.dashed`'s uses are on screens not yet
rebuilt, and `sweep-widths.mjs`'s `boxy()` selector moves in the same change
that removes the last one). `.rows.cols` has no caller until History and
Clients. **The header's GEAR is not there** — the `+` is, because Today's own
button died with it; the gear needs `GearMenu.jsx`, which is stage 6.
And the open-slots figure stays on *Booking rules* as well as landing on Today:
there it answers "did that setting do what I wanted", here it answers "what
does the near future look like".


**TWO INTERIM STATES THE SHELL CREATES, both correct, both easy to misread.**
**Calendar's month grid is 1,144px wide now and still draws DOTS** — the shell
gave it the width for free, but writing *"9:00 Tom O."* into a cell, the
trimmed legend, `.cal-cell.selected` and the inline day panel are **stage 3**.
A wide grid of dots is the shell working, not the desktop spec §5b shipped.
And **there are TWO doors to a new booking** — the header `+` and Calendar's own
button, which step 5 already has on the death list and which dies with Calendar.
Today's went with Today's rebuild, because that is the screen this stage owns.

**FOUR FILES THAT OUTRANK THE DESIGNS WERE CORRECTED IN THE SAME CHANGE**, per
step 4 §16 and CLAUDE.md's never-silently rule: `design-system.md` law 11b's
table now names the completed node (`--accent`) and the paid node (`--ac`)
separately; `dashboard-skeletons.md` §2 gains the rail's three states and says
there is ONE rail; the desktop spec §4a's day-controls row is struck (they
expand in place — the owner's own W1); and the phone pass §2a records the third
rotation guard.

**AND EXERCISING THE NEW CONTAINER FOUND TWO DEFECTS ON `/job/:id`, THE PAGE A
PUSH NOTIFICATION OPENS.** `BookingDetail` losing its own `<Sheet>` took that
sheet's `X` with it, so the page had a close handler and nothing on screen that
could call it — a dead end. It has a *Dashboard* control now. **And pressing
that control found the second, which predates the rebuild: all four
`navigate("/")` calls in `JobPage` go to the MARKETING SITE**, because `/` is
`LandingPage` and the dashboard is `/app` — including the not-found screen's own
*"Go to dashboard"* button, which did not. **Neither was findable by reading:
one needed the page rendered, the other needed the control pressed, and it had
never been pressed because the sheet used to swallow the close.**

**AND THE HOOK FIX HAD TO BE FINISHED ON ITS OTHER TWO CALLERS.** Splitting
`loading` from `refreshing` stopped Calendar and Money blanking themselves — but
they did not READ `refreshing`, so walking to another month showed **September's
marks under an August heading**, which is worse than the spinner it replaced.
One class and one `aria-busy` each. Verified with a MutationObserver on a month
change: `["group|kids=3", "center|kids=1"]` became
`["group refreshing|kids=2", "group|kids=2"]`. **Fixing the shared function is
right, and it is only half the fix if the callers each had to answer it.**

**AND TWO SESSIONS WERE GIVEN THIS PROMPT AT ONCE.** A second Claude session
was editing the same working tree and spotted `theme.css` changing under it.
It stood down without reverting — a `git checkout` would have taken this
session's work too — and **its `RecordHost` / `jobRecordProps` work was read
and KEPT**, because it is the shell plumbing stage 1 owes and it had already
avoided the regression that would have justified dropping it. Worth knowing
that this can happen; DECISIONS.md carries the rule that came out of it.

**STAGES 2-7 REMAIN:** the job record · Calendar · Money · Clients · Business
and the twelve settings screens (with the colour repair, Reviews and the
rebuilt push switch) · first run, last on purpose.

## 6q. ROADMAP 2.11, STEP 6 — STAGE 2 IS BUILT: THE JOB RECORD (2026-09-01)

**Stage 2 of the approval page's seven.** 26 of the product's 126 capabilities
live on this one object and it is reached from four places. Judgment calls are
DECISIONS.md → "Roadmap 2.11, step 6, stage 2". **Nothing is waiting on the
owner.**

**WHAT SHIPPED.** The record is **an action bar over named sections**. The bar
is first, unheaded and **PINNED** — two rows of three, *Call · Text · Navigate*
over *Calendar · Contacts · Reminder* — and under it five named sections:
**The job · The money · Notes · What happened · Change the time or details**,
with the *Remove from records* disclosure underneath, untouched because it was
already right. **Photos stays designed and not built** (row 126) and draws
nothing, so it is five sections on the screen against the design's six.
*What happened* was a 2×2 grid of four identical buttons and is now three
weights — *Mark completed* filled, *Didn't show up* ringed, *Cancel the job*
ringless. *Send customer reminder* was a full-width button most of a screen
down and is now one tap in the bar.

**THE MONEY SECTION IS WHERE PART B ROW 19 DIED**, and all three of its cases
were verified in a browser rather than reasoned about — the differing one by
finalizing a real job through the real modal with a real extra charge:

| The job | What it prints |
|---|---|
| Not finalized | `Quoted $95.00`, and nothing else |
| Finalized, nothing changed | `Charged $65.00` — **one figure, not two saying the same thing** |
| Finalized, charged more | `Quoted $110.00 · charged $140.00 (+$30.00 added on site)` |

plus *How they paid: Cash* from `payment_notes`, **which Finalize payment has
always written and which no screen in this product has ever shown.**

**TWO LIVE DEFECTS, AND BOTH WERE ALREADY WRITTEN DOWN AS DESIGN.** Neither
was findable by reading the code; both surfaced from building the screen the
specification describes and noticing the product did not do it.

1. **"A job finished and unpaid — *Finalize payment* is the primary action and
   the record is what Today's lit card opens into" was FALSE.** The record
   showed that button only while `status === "confirmed"`, and finalizing sets
   `status = "completed"` — so **the record you reach by tapping the one card
   on Today that says a job needs paying had no way to take the payment.** It
   uses the card's own condition now (`completed && !finalized_at`), which also
   answers *"a job in the future has no Finalize payment"* for free.
2. **Nobody has ever seen "Reminder sent to customer." or "Invoice +
   thank-you sent."** All four callers wire `onChanged` to *reload the list AND
   close the record*, so both messages were written into a panel that was
   already gone. `act()` takes a `changed` flag and the two email actions pass
   `false`; neither writes to the booking, so there is nothing to reload
   either. **It matters more from here on, because Reminder is now one tap.**

**AND A THIRD, ON THE PAGE A PUSH NOTIFICATION OPENS.** `/job/:id` printed the
customer's name and **not the date or the time** — the record deliberately does
not repeat them because a sheet and the desk's second column both print them
above it, and this page is the one container that never took the job over. Same
shape as the two defects stage 1 found on the same page. It uses
`jobRecordProps` now, so all three containers title a job identically.

**PINNING IT COST TWO THINGS WORTH CARRYING.**

1. **`position: sticky; top: 0` was not enough.** A sticky box may not leave its
   containing block, which for a child of `.sheet-body` is that element's
   *content* box — 16px inside the scrollport. The bar stuck **18px down** and a
   line of the record slid through the band above it. The sheet hands its top
   padding to its first child instead, and only when a record is in it.
   `.record-body` needed none of it: no padding, so its content box **is** its
   scrollport. **And it is only visible at the 56vh peek a phone opens at** —
   every screenshot script here pulls a sheet to 92vh, where the record nearly
   fits and the bar never has to stick at all. *A pinned thing has to be tested
   at the height that scrolls, not the height that is convenient to photograph.*
2. **A pinned bar hides whatever the keyboard scrolls up to.** Shift-tabbing
   backwards put *Finalize payment* and *Didn't show up* underneath it, focus
   ring and all. `scroll-margin-top: 10rem` on everything after the bar **and
   on their descendants** — every control down there is inside a card rather
   than a sibling of the bar, so the sibling selector alone changed nothing.

**AND THE KEYBOARD WALK FOUND SOMETHING THAT WAS NEVER ABOUT THIS SCREEN.**
`Sheet.jsx` carries `aria-modal="true"` and **did not trap focus — on all
eleven sheets in the product.** Opening one left focus on the page behind it,
and tabbing forward out of the job record went through four job rows and
*Tomorrow* before reaching the sheet's own *Close*. The body-overflow freeze
that has always been there stops the MOUSE scrolling past a sheet; nothing
stopped the keyboard, so the markup and the behaviour disagreed. **Fixed in the
shared component**, focus restored to where it came from on close. **It was
written twice:** the first version computed the first and last focusable and
let exactly one stop escape, because **a closed `<details>` lies about its
contents** — the disclosure's hidden button reports `getClientRects().length
=== 1`, a 46px box and a live `offsetParent`; only `checkVisibility()` says
false. What shipped never asks which control is last: it watches where focus
lands and refuses to let it settle outside.

**AND A THIRD THING THE PINNING CHANGED, found by using it.** A confirmation
used to scroll away with the record; now it sits in the one part of the screen
that never moves, so *"Reminder sent to customer."* would have eaten 44px of the
bar for the rest of the session. **The notice clears itself after six seconds;
an error does not**, because an error is a thing you still have to do something
about. Verified: in the bar at 3.5s with the record still open, gone by 11.5s.

**ONE FINDING KEPT RATHER THAN FIXED, so it stops being rediscovered.**
`PRODUCT.md` stated a 46px tap-target floor; `.btn.sm` is **38px**, at 28 call
sites in ten files, including this record's action bar and the job card's own
button row. It clears WCAG 2.2 AA target size (24×24) with room and is under
AAA's 44×44, which this product does not claim; step 4 §3 measured the row at
38px and built its label ceiling on that height; and raising it costs 16px of
PINNED height on the narrowest screen. **Kept, and `PRODUCT.md` now names the
exception** instead of stating a floor the product does not keep. **Reopen with
the owner, not in passing.**

**MEASURED AFTER.**

| | |
|---|---|
| The bar, pinned | flush at the scrollport top at 320, 392 and 1440 (`barTop === scrollportTop`), 109px tall at all three |
| The record's tab cycle | **12 stops, every one inside the sheet, none behind the bar, both directions** |
| `/job/:id` | bar at viewport top after 194px of page scroll; 356px wide in a 392px phone |
| States checked in a browser | finished-unpaid · still-to-do · finalized-and-paid · **cancelled (collapses to *Un-cancel*, driveway row stays)** · **no-show (*Didn't show up* correctly absent)** · edit mode |
| `sweep-widths.mjs` | clean at 1920 / 1440 / 392 / 360 / 320, normal and `?lite=1` |

**THE SWEEP NOW WALKS THE JOB RECORD**, two jobs in two states, because until
this stage it never opened one — so "clean at five widths" was silent about the
widest object in the app. **Same family as the always-false contrast rows and
as `dead-width`: a check that never reaches a thing reports exactly like a
check that reached it and found nothing.**

**TWO THINGS LEFT STANDING ON PURPOSE, so nobody reads them as oversights.**
On the desk *Finalize payment* appears twice — once on Today's lit card and
once in the record open beside it — which is inherent to a record opening
BESIDE its list rather than over it; the alternative is a card that changes
shape when selected, which is worse. And **marking a job complete from the
record closes the record**, so taking the payment afterwards means reopening
it: that is the four callers' `onChanged` policy, not the record's, and it is
the same two-step Today's card already has. Left for stages 3-5, which rebuild
those callers.

**AND TWO SMALL THINGS OBSERVED AND NOT FIXED, written down so they are not
found again as if new.** On `/job/:id` the headings run **h1 → h3 with no h2**,
because the record's five section titles are `<h3>` under a container's `<h2>`
and that page's container is the page, whose title is its `<h1>`. Making them
`h2` there would mean the record knowing which container it is in, which is the
coupling `RecordHost` exists to remove; a skipped level conveys nesting rather
than breaking it, and no WCAG criterion requires contiguous levels. **And every
route in the app answers `document.title` with "Detailing Platform"** — nothing
in the SPA manages it — so the page an emailed job link opens does not name the
job. Product-wide, one line to fix in one place when somebody owns it, and
wrong to fix on one route alone.

**FOUR FILES THAT OUTRANK THE DESIGNS WERE CORRECTED IN THE SAME CHANGE**, per
CLAUDE.md's never-silently rule: step 4 §3 gains a *What shipped* block naming
every place the code and the drawing differ (and the file's own "nothing here
is built" is struck); the phone pass §4 records how the pinning was done and
what it cost; `dashboard-skeletons.md` gains the records' sixth skeleton — a
pinned action bar over named sections, and why it is `sticky` and not `fixed`;
and the component inventory's `BookingDetail.jsx` row is marked built and
corrected from six sections to five.

~~**STAGES 3-7 REMAIN:** Calendar · Money · Clients · Business and the twelve
settings screens (with the colour repair, Reviews and the rebuilt push switch)
· first run, last on purpose.~~ **CALENDAR SHIPPED THE SAME DAY — see §6r.**

## 6r. ROADMAP 2.11, STEP 6 — STAGE 3 IS BUILT: THE CALENDAR (2026-09-01)

**Stage 3 of the approval page's seven**, and it is one tab with three screens:
the month, the day, and the history. Judgment calls are DECISIONS.md →
"Roadmap 2.11, step 6, stage 3" and "The copy pass". **Nothing is waiting on
the owner.**

**THE NUMBERS.**

| | Before | After |
|---|---|---|
| History's document height, 1440 | 3,942px (18 cards) | **1,373px** — a ruled list with columns |
| History's document height, 392 | 3,942px, the same at every width | **1,973px** |
| The month cell at 1440 | 88px, up to 3 dots | **118px, `9:00 AM Tom O.` on up to 3 lines** |
| The legend | five entries, always | **only the marks on the month shown** — three at 392, one at 1440 |
| The day | a full-height sheet OVER the month | **an inline panel UNDER the grid**, at every width |
| `.cal-cell.selected` | dead CSS since roadmap 2.6 | drawn |
| `BookingCard` callers | 4 | **2** (`Today`, `Clients` — and 1 after stage 5) |
| Screens `sweep-widths.mjs` opens on this tab | 1 | **7** (month, day, its three editors, history, a history job) |

**WHAT SHIPPED.** The desk writes the month out — up to three `time · name`
lines per cell and a `+N more`, so *Booked*, *Done* and *No-show* become words
and the legend drops to the two marks a cell cannot write. At every width the
legend lists only what is actually on the month shown. **The day opens inline
under the grid at both widths** and the cell it came from is marked; on a phone
the selected week scrolls up under the masthead so the month stays readable.
History is a ruled list with columns — two cells on a phone, five at a desk —
broken by month rules carrying each month's own total, with the nine filter
chips behind one *Filter* below `--wrap` and in the second column above it, and
a job opening BESIDE the list through `RecordHost`. The screen's own
*New booking* button and its own `<Sheet>` are both gone.

**THE ONE A COLD SESSION MUST NOT RE-DERIVE: TODAY'S STAGGERED ARRIVAL HAD
NEVER RUN.** `theme.css`'s reveal block carries a second selector for split
screens, `.app-main > .group > .col-1 > *`, and it **matched nothing** — a
split screen's root is `.split`, so `.col-1` **is** a `.group` rather than a
child of one. Every child of Today's primary column has arrived with
`animation-name: none` since the shell shipped, on the one screen the signature
move exists for. **Nothing in the product could report it**: no error, no
console line, no layout difference, and every screenshot script photographs the
end state on purpose. Found by reading the *computed* `animation-name` on the
live screen. **Third member of the `dead-width` family**, and the transferable
part is sharper than "check your selectors": **a mechanism whose failure mode is
silence needs a check that asserts it RAN**, not one that asserts the screen
looks right.

**AND FOUR MORE THINGS THAT WERE ONLY FINDABLE BY BUILDING OR BY RUNNING.**

1. **`useBookings` swallowed its error.** `const { data } = await q` — so a
   failed read drew **an empty month, an empty day and an empty Money period**,
   with nothing on screen saying so. Fixed in the hook because all three
   screens had it, **and finished on all three callers in the same change**,
   which is stage 1's own lesson about the other half of a shared fix. The last
   good data stays drawn and the message goes above it.
2. **The filter chips ran 93px and 125px off the right edge of a phone**, and
   the sweep only saw it because this stage taught it to open the filter bar.
   `.chiprow` is a sideways scroller with `scrollbar-width: none`, so two of
   five statuses were simply not on the screen and nothing said they were
   there. **The product had already answered this once** — the phone pass §8
   measured Money's five period chips at 388px in a 356px column and wrapped
   them rather than hiding two. Same question, same answer.
3. **`composition.test.mjs` test 1's rewrite passed against the exact commit it
   was written to catch**, on the first attempt. The caller regex used
   `[^)]{0,90}` to get from `.map(` to the component name, and a callback's own
   parameter list contains a `)` — so it could not cross `(b) =>`, which is how
   every real caller in this repo is written. **A check that has not been shown
   to fail is not evidence of anything**; it is baselined both ways now.
4. **An `auto` amount column made the new ruled list ragged.** Every
   `.row-item` is its own grid, so a row totalling `$65.00` gave the two `fr`
   columns 4px more than one totalling `$235.00`, and *what* started at 572px
   on some rows and 576px on others — in a list whose whole purpose is that you
   scan down it. 92px fixed.

**THE COPY PASS — HIS OWN INSTRUCTION, AND IT IS NOW A NEVER-DEFAULT.** He
found *"Mobile — we go to them"* on the job record: *"no duh… it thinks that
humans can't think, or it feels the need to explain literally every single
thing, which just gets annoying and cluttered."* **Twenty-four sites** across
the dashboard, the settings screens, the booking page and the way in. **The
test: does the sentence add a fact the control does not already carry?** What
went was restatement — a switch called *A new booking comes in* explained with
*"So you know before they do."*, a choice between *I go to them* and *They come
to me* with each option defined underneath, *"Saved."* extended into a sentence
about where the colour lands. **What stayed is the half that stops the rule
becoming its own mistake**: *"Picking another swaps it"*, *"Past bookings keep
it"*, *"Timing is set in Booking rules."* The durable form is in
`docs/design-system.md` § Never-defaults and CLAUDE.md; **nothing on the
landing page changed**, because its copy was already written to this standard
and he approved that page.

**MEASURED AFTER.**

| | |
|---|---|
| `sweep-widths.mjs` | clean at 1920 / 1440 / 392 / 360 / 320, normal and `?lite=1` |
| Console at 1920 / 1440 / 768 / 392 | nothing but the two pre-existing React Router v7 future-flag warnings |
| `composition` (26) · `design-contrast` · `landing-pricing` (18) · `route-contract` (18) · `decisions-index` · `accent-sweep` | all pass |
| Today's arrival | `arrive @0s` / `@40ms` on the masthead and the ledger, and the rail correctly `none` because its own children carry the beats — **all three read `none` before**. `?lite=1` still turns every one of them off. |

**FIVE FILES THAT OUTRANK THE DESIGNS WERE CORRECTED IN THE SAME CHANGE**, per
CLAUDE.md's never-silently rule: the screen designs gain a *What shipped* block
for §4-6; the phone pass records how the week-scroll and the shared `JobRow`
were done; `dashboard-skeletons.md` §3 gains the calendar's two halves and the
fact that the inline-below panel is the only one of its kind in the product;
the component inventory marks `Calendar.jsx` and `DaySheet.jsx` built and
strikes its own `DaySheet > BookingCard` row (the phone pass outranks it — the
day's jobs are rows); and the architecture audit's Part B rows 7, 8 and 9 are
struck with what replaced them.

**TWO THINGS LEFT STANDING ON PURPOSE.** The day's *Add a job* survives step
5's death list, demoted to a `.btn.sm`: the two dead buttons carried no date
and this one carries THIS day, so removing it would cost a real capability to
satisfy a count. And **a no-show still counts toward a month rule's total** —
`status !== "cancelled"` is the rule the totals bar has always used, it is a
money question rather than a layout one, and this stage did not reopen it.

**AND THREE THINGS OBSERVED AND NOT FIXED, written down so they are not found
again as if new.**

1. **The month grid is 30 tab stops.** Every cell is a `<button>`, so getting
   from the month heading to the legend costs thirty presses. **Inherited, not
   introduced** — it has been thirty since the grid was built. No WCAG
   criterion is against it (2.4.3 is about order, not count) and a month view
   is not a date input, but the convention for a grid of dates is a roving
   `tabindex` with arrow keys, which is one stop. **That is a change to the
   cell's interaction model and belongs to a session that owns it**, not to a
   paste at the end of a stage; it would also have to answer what arrow keys do
   at a row edge and at a month edge.
2. **At 1920x1080 the month ends 270px above the fold with nothing under it.**
   That is the *"not enough content to fill the viewport"* shape
   `design-system.md` § Verification names — and it is left, because the
   alternative is inflating the cell past the 112px the design specifies to
   fill a screen, which is spending height on nothing. **Opening a day fills
   it** (to ~1,240px), and opening a day is what the screen is for.
3. **`document.title` is still "Detailing Platform" on every route** — stage
   2's finding, still open, still product-wide and still wrong to fix on one
   route alone.

~~**STAGES 4-7 REMAIN:** Money~~ **— Money is §6s.** Clients · Business and the twelve settings
screens (with the colour repair, Reviews and the rebuilt push switch) · first
run, last on purpose.

## 6s. ROADMAP 2.11, STEP 6 — STAGE 4 IS BUILT: MONEY, THE EXPORT, AND THE CALENDAR HE REOPENED (2026-09-01)

**Stage 4 of the approval page's seven**, plus one thing that is not stage 4:
the owner reopened the calendar's desktop layout in the same prompt, so the
day panel moved beside the month here rather than in stage 3. Judgment calls
are DECISIONS.md → "Roadmap 2.11, step 6, stage 4". **Nothing is waiting on
the owner** — the one thing he might want to revisit is named at the bottom.

**THE NUMBERS.**

| | Before | After |
|---|---|---|
| Money's document height, 1440x900 | 1,284px (it scrolled) | **900px — the whole screen, no scroll** |
| Money's document height, 1920x1080 | 1,284px | **1,080px** |
| A −$114 bar against a +$114 bar | **identical, only the colour differed** | one hangs below the rule, one stands on it |
| The bars' contrast on `--ink-0` | **1.51:1 and 1.68:1** | **3.18:1 and 3.21:1** (the 3:1 non-text floor) |
| The period control | three stacked rows | **one line at ≥700; 3 + 2 below it** |
| "Nothing outstanding" / "Nothing logged" | two dashed boxes | **neither section is drawn** |
| Expenses past twelve | silently cut | **"+3 more in September 2026", which expands** |
| The accountant export (feature row 40) | did not exist | a flat CSV whose total **equals the screen's Net** |
| Calendar, 1440x900, a day open | 1,284px — the panel began **20px below the fold** | **900px, the day beside the month** |
| Screens `sweep-widths.mjs` opens on Money | 1 | **6** (the tab, three period kinds, an unpaid job, the expense form) |

**WHAT SHIPPED ON MONEY.** A signed chart on a zero rule; a segmented period
control with the stepper at the far end of the same line; the export directly
under it; the two questions the trade treats as two destinations as two
columns at `--wrap` (1.35 / 1); the sunken ledger unchanged; the unpaid rows
as quiet cards; the expenses list with a stated cap. A job opened from the
unpaid list now goes through `RecordHost` like every other job in the product
— it was a `<Sheet>` at every width here, which made the same object open two
different ways depending on which screen you reached it from.

**THE ONE A COLD SESSION MUST NOT RE-DERIVE: THE 3:1 NON-TEXT FLOOR APPLIES
TO A CHART BAR.** `design-system.md` law 9 has said *"non-text interactive
edges ≥ 3:1"* since the system was written, and every reading of it had been
about edges — a ring, a fill, a focus outline. Money's bars were `--fog` at
26% and `--bad` at 34%: **1.51:1 and 1.68:1 against the ground, on the only
chart in the product**, for as long as the chart has existed. A bar is not
decoration around the content; it is the graphical object the content is IN.
**And raising it cost something, which is the half worth carrying:** a
corrected tenant accent is only guaranteed to clear the same 3:1 fill floor,
so on the darkest presets a lit bar and a dim one could now measure alike —
selection carried by hue alone, which is the exact failure the zero line was
added to remove. **Measured across four presets after the change: the lit bar
is 3.74:1 against the ground on Slate and the dim ones are 3.18 — 1.18:1
between them, and 1.27:1 on Crimson.** So selection gained two cues that are
not hues: **the column behind the bar is tinted**, which is the system's own
"selection is tinted; a fill is an action or a fact", and **the period's label
is lit**. The tint was then checked the other way — the lit bar still measures
**3.04:1 against its own tinted column** on the worst preset — because a tint
of the accent is a ground, which is the first of the five mistakes at the top
of DECISIONS.md.

**AND FOUR MORE THAT WERE ONLY FINDABLE BY BUILDING OR BY MEASURING.**

1. **"Waiting on payment" was answering a period question.** The unpaid list
   was filtered out of the same window the chart uses, so **switching from
   *Month* to *Week* changed who owed you money**, and last month's unpaid job
   vanished from the one screen that exists to chase it. It is its own read
   now, with no dates on it.
2. **`loadExtras` swallowed all three of its errors.** `const { data } = await`
   turned a dropped connection into *"no expenses, nothing outstanding,
   nothing sold on site"* — `useBookings`'s stage 3 defect, in the file next
   door, written the same way for the same reason (it keeps the line short).
   **Worth treating as a pattern to grep for, not as a bug that was fixed.**
3. **The expenses read stopped at TODAY, not at the end of the period**, so an
   expense dated forward inside the current month — a supply order, an
   insurance instalment — was invisible on the screen whose job is to list it.
4. **The 60/40 chart is right only once there is a loss.** Built exactly as
   the phone pass specified and looked: six winning bars over 48px of reserved
   emptiness made the zero rule read as a gap rather than as an axis. The
   chart is 72px with the rule on its floor until a bucket loses money.

**THE EXPORT, AND WHY IT IS A SEPARATE FILE.** "Jobs and expenses, nothing
more" is one flat ledger — a row per completed job, a row per expense carrying
its own minus sign — because that has a property two stacked tables do not:
**the Amount column adds up to the Net figure printed on the screen it came
from.** `app/src/lib/accountant-export.js` holds the pure builder so
`tests/money-export.test.mjs` can import it with no browser and no
credentials; the test is baselined both ways (flip the expense sign and three
checks fail). This is CLAUDE.md's *a number PRINTED is not a number CHARGED*
one step later: a file handed to somebody who will never check it against the
screen. Verified end to end in a real browser — the download is
`coastline-auto-detailing-september-2026.csv` and its Net row reads `286.00`
against the screen's `$286.00`.

**THE CALENDAR — HIS DECISION, NOT A DESIGN ONE.** *"The calendar kind of has
these huge blocks that take up the entire desktop space, and you have to
scroll down… maybe shrink it a little, and have the information that is below
it on one of the sides. We have the space."* Step 4 §4 said the month **must
not be split**; that was true about the cost and had weighed it against
nothing. **Measured: at 1440x900 with a day open the page was 1,284px against
a 900px screen** — the panel began 20px below the fold.

- **The day opens in a fixed 420px second column at ≥1180**, not a ratio: this
  first column is a seven-column grid whose cell width decides whether the
  month can write itself out, so the panel takes what it needs.
- **`--wrap` lifts to 1720 on that screen only**, through
  `.app-main:has(> .split.calday)`. That is not "stretching the first thing" —
  the grid is the same 1,144px it has at every desktop width today and the
  extra screen goes to the new column.
- **The month keeps its written cells while the grid is ≥1,024px wide**, which
  it is at ≥1640px of screen. So **1920 loses nothing**; at 1440 the cells go
  back to marks for as long as the day is open and the legend grows to decode
  them. One flag (`writes`) is read by the cells, the legend and the grid's
  class, or the legend explains marks that are not there.
- **A job opened from the day replaces the day** in that column and closing it
  puts the day back — the same answer History already gives.

**MEASURED AFTER.**

| | |
|---|---|
| `sweep-widths.mjs` | clean at 1920 / 1440 / 392 / 360 / 320, normal and `?lite=1` |
| Console at 1920 / 1440 / 768 / 392 | nothing but the two pre-existing React Router v7 future-flag warnings |
| `composition` (26) · `design-contrast` · `landing-pricing` (18) · `route-contract` (18) · `money-export` (16, new) · `decisions-index` · `accent-sweep` | all pass |
| Money's arrival | `arrive @0 / 40 / 80 / 120ms` on `.col-1`'s children at 1920 and 1440 and `@0…160ms` at 392; every one `none` under `?lite=1` — asserted on the COMPUTED `animation-name`, which is stage 3's own lesson |

**SEVEN FILES THAT OUTRANK THE DESIGNS WERE CORRECTED IN THE SAME CHANGE**:
the screen designs gain a *What shipped* block for §7 **and an overrule block
on §4**; the phone pass gains one for §8 and a correction to §5a's title; the
component inventory marks `Money.jsx` built and re-marks `Calendar.jsx` and
`DaySheet.jsx`; `dashboard-skeletons.md`'s register says *signed* chart and
names the day's new place; the feature inventory marks row 40 built; the
architecture audit's Part B **row 11 is struck**; and `design-system.md` gains
two clarifications — that five choices is still a segmented control, and that
a chart bar takes the 3:1 non-text floor.

**AND THREE THINGS OBSERVED AND NOT FIXED, carried forward from stages 2 and
3 because none of them belongs to a screen.**

1. **`document.title` is still "Detailing Platform" on every route** —
   stage 2's finding, still open, still product-wide.
2. **The month grid is still 30 tab stops.** Stage 3's note: inherited, no
   WCAG criterion against it, and a roving `tabindex` is a change to the
   cell's interaction model that belongs to a session that owns it.
3. **A no-show still counts toward a month rule's total.** Stage 3's note; it
   is a money question rather than a layout one and stage 4 did not reopen it.

**AND ONE NEW ONE, WHICH IS THE COST OF HIS OWN TRADE:** at 1440x900 the month
loses its written cells while the day is open. It is written down here so a
later session does not find it and file it as a bug. **If he wants the words
at 1440 too, the fix is a wider `--wrap` on that screen, not a different
layout** — and it would cost the day panel width, which is what the 420px was
protecting.

**STAGES 5-7 REMAIN:** Clients · Business and the twelve settings screens
(with the colour repair, Reviews and the rebuilt push switch) · first run,
last on purpose.

**AND HE OPENED A NEW ITEM AT THE END OF THIS SESSION — ROADMAP 2.17, MOTION
AND SHAPE AS A HOUSE STYLE.** Three named complaints and a principle, and the
principle outranks them: *"everything should have a very nice animation — that
makes everything feel very fluid and connected, without being in the way of
actual productivity and usability."* **It deliberately grows a budget the
design system caps**, so `design-system.md` § Motion is updated before any code
is written. The three he named:

1. **A record opens INSTANTLY at a desk.** Verified in the stylesheet: `.sheet`
   carries `sheet-in` and `sheet-out`; `.record` — the second column
   `RecordHost` draws at ≥1180 — has no animation at all, and the arrival
   stagger is scoped to `.col-1` on purpose. **The same object animates on a
   phone and hard-cuts at a desk**, which is the one seam `RecordHost` exists
   to hide. Five screens reach it; one fix.
2. **Squircles everywhere** — Apple's continuous-curvature corner instead of
   `border-radius`'s circular arc. It is a token change if the browsers this
   product supports have the native property, and expensive if they do not;
   **check before choosing, and put the cost back to him rather than shipping
   a slow page.**
3. **The calendar's split transition — which is THIS section's own work.** He
   is not objecting to the split; he asked for it. He is objecting to the
   jump: *"it's almost like I refresh the page."* **He offered two options and
   they are not equal** — always being in split view removes the reflow
   entirely but permanently costs the written-out month at 1440, and animating
   the transition keeps it but is a `view-transition` problem rather than a
   `transition: max-width` one. **The cost of option (a) is the thing to put
   in front of him**, because it takes away the cells he said were helpful.

**Nothing in 2.17 is started and nothing in it blocks stage 5.**

## 6t. ROADMAP 2.11, STEP 6 — STAGE 5 IS BUILT: CLIENTS, AND THREE CORRECTIONS HE SENT WITH IT (2026-09-02)

**Stage 5 of the approval page's seven**, plus three things that are not stage
5: the Money period control, the export button's wording and place, and the
tenant's colour in the ground. Judgment calls are DECISIONS.md → "Roadmap
2.11, step 6, stage 5". **Nothing is waiting on the owner.**

**THE NUMBERS.**

| | Before | After |
|---|---|---|
| What a client row shows | name / phone · email | **name · last visit · lifetime spend · phone** (two cells on a phone) |
| "Last visit" | could print a **future** date (Part B row 6) | the most recent completed job that has **ended** |
| Where "last visit" and spend are visible | inside the sheet only | **on the list**, for every row |
| Sort and filter (rows 47, 48) | did not exist | **three sorts, one chip, and "Text these N"** |
| The 200-row cap | silent | **stated, with the search named as the way past it** |
| The client record's container | a card at every width | **none at either** — law 1's entry for Clients |
| The list's width at 1920 with nothing open | 651px, with **465px dead beside it** | **1,144px, full-bleed** |
| Money's period control at 392 | 3 + 2, cells of **110px and 168px** | **five equal 67.2px cells on one line**, 55.2px tall → 39.6 |
| The export button | "Export for my accountant", its own row | **"Export"**, on the period line; at 768 the whole head is one line |
| The ground's two lights | fixed near-whites | **carry the tenant's colour**, same alphas |
| Clients screens `sweep-widths.mjs` opens | 1 | **6** |

**WHAT SHIPPED ON CLIENTS.** A masthead and a search field; a segmented sort
of three that is absent below three rows; one chip, *Not seen in 3 months*,
which when on offers *"Text these N"* as an `sms:` link to the filtered
numbers; a full-bleed four-column ruled list that drops to 1.4 / 1 when a
client opens; and a record of bare ruled rows on the ground — two figures,
last visit, Call and the email address, the note, and a history of
*date · what · total*. A job opened from that history replaces the client in
the same column and closing it puts the client back.

**THE ONE A COLD SESSION MUST NOT RE-DERIVE: `RecordHost` GAINED A `bare`
PROP, AND `components/ClientRecord.jsx` WAS DELIBERATELY NOT WRITTEN.** The
component inventory predicted that file and gave a reason — *"it cannot stay
inline in `Clients.jsx`'s sheet"* — which dissolved when the record stopped
being a sheet. What was actually needed was for `RecordHost` to draw no box.
The inventory row is marked NOT BUILT with the reasoning rather than deleted.

**AND FOUR MORE THAT WERE ONLY FINDABLE BY BUILDING OR BY MEASURING.**

1. **THE LIST READ SWALLOWED ITS ERROR — the THIRD site of the same line.**
   `const { data } = await q` turned a dropped connection into *"No customers
   yet — they appear on their own when bookings come in"*, which is the most
   reassuring possible way to be wrong. `useBookings` carried it until stage
   3, `loadExtras` until stage 4. **Grep `const { data } = await` before
   writing a new read.**
2. **A full-bleed row has to be pinned at BOTH ends.** Built to step 4 §8's
   order with everything left-aligned, the name started at x=448 at 1920 and
   the last phone number sat **290px short of the hairline's own end** — the
   *"not enough content to fill it"* shape inside a row. The figure and the
   phone are right-aligned now.
3. **`.split`'s always-on grid is wrong for the one screen with nothing to put
   in column two.** 465px of the content column, permanently empty — the
   `dead-width` failure one level down.
4. **`completed_washes_count` on `customers` is dead** — it exists and nothing
   maintains it. The figures come from one aggregate read, the same shape
   Money's Lifetime already has.

**HIS THREE CORRECTIONS.**

- **The period control.** *"Three on top, two on the bottom, and they're spaced
  out weirdly."* `flex: 1 0 28%` let each ROW share itself out, so one control
  had cells of two sizes. It is a grid of equal columns now — the answer
  § THE 320 FLOOR already gives — and **4px of side padding rather than 6 is
  the whole difference between one line and two**: *"6 months"* sets 55.4px
  against the 55.2px that 6px left it, so it wrapped by two tenths of a pixel
  and every cell took the taller row.
- **"Export for my accountant" → "Export", on the period line.** **The rule it
  produced is new and is now in `design-system.md` § Never-defaults: a label
  names what the control DOES, never who the result is for.** A copy sweep
  for the same shape found **nothing else in the product** — every button
  label, every `Setting` label, every `help=` and `blurb=`. This **overrules
  step 4 §7's one-line desk head** by arithmetic (693px of content in a 628px
  column); breaking after the control keeps the period's name beside the
  button that exports it, and at 768 all four fit on one line.
- **The ground carries the tenant's colour.** Mixed into the two existing
  lights, **with the alphas untouched**, because more light moves every floor
  measured against the ground. Built at 8.5% / 7% first and the numbers said
  no: **Money's bars measure 3.07:1 and 3.05:1 against the LIT CORNER**, not
  the 3.18 / 3.21 stage 4 took against the bare token, and the extra alpha
  spent that 0.05 — 3.01 and 2.99 on Silver, a real preset. At 7% / 5.5% the
  worst case across twelve presets and four extremes is **3.02:1**, ten of
  twelve come out higher than before, and text on the same corner is 14.96:1
  at worst against 15.11.

**MEASURED AFTER.**

| | |
|---|---|
| `sweep-widths.mjs` | clean at 1920 / 1440 / 392 / 360 / 320, normal and `?lite=1` |
| Console at 1920 / 1440 / 768 / 392 | nothing but the two pre-existing React Router v7 future-flag warnings |
| `composition` · `design-contrast` · `landing-pricing` · `route-contract` · `money-export` · **`client-list` (31, new)** · `decisions-index` · `accent-sweep` | all pass |
| Clients' arrival | `arrive @0 / 40 / 80 / 120ms` on `.col-1`'s children at 1440 and 392, `none` under `?lite=1`, asserted on the COMPUTED `animation-name` |
| Keyboard | Tab reaches a row with a 2px accent ring, Enter opens, Escape closes back to the list |

**EIGHT FILES THAT OUTRANK THE DESIGNS WERE CORRECTED IN THE SAME CHANGE**:
the screen designs gain a *What shipped* for §8-9 **and a second one for §7
that strikes stage 4's own export bullet**; the phone pass gains one for §10
and a re-decision block on §8; the component inventory marks `ClientRecord.jsx`
NOT BUILT with the reason; `dashboard-skeletons.md`'s register says what keeps
Clients and History apart; the feature inventory marks rows **41–48** built and
row 45 fixed; the architecture audit's Part B **rows 6 and 18 are struck**;
`design-system.md` gains the new copy rule; and `CLAUDE.md` gains the fifth
rotation-guard site.

~~**STAGES 6-7 REMAIN:**~~ **STAGE 6 IS BUILT — §6u.** Business and the twelve settings screens (with the
colour repair, Reviews and the rebuilt push switch) · first run, last on
purpose.

**AND ONE THING LEFT OPEN, WHICH BELONGS TO 2.17:** opening a client reflows
the list from 1,144px to 651px. The chrome above it does not move — the search
field keeps a 520px cap — so the jump is the list alone, but it is the same
jump he named on the calendar (*"it's almost like I refresh the page"*).

## 6u. ROADMAP 2.11, STEP 6 — STAGE 6 IS BUILT: BUSINESS, TWELVE SETTINGS SCREENS, AND THREE REPAIRS (2026-09-02)

**Stage 6 of the approval page's seven.** Judgment calls are DECISIONS.md →
"Roadmap 2.11, step 6, stage 6". **Two things are open and both are named at
the bottom of this section — one question for him, one tap only he can make.**

**THE NUMBERS.**

| | Before | After |
|---|---|---|
| The fifth tab | "More", opening a screen titled "Settings" | **"Business", opening "Business"** |
| Its rows | **eleven rows under eight headings**, three of them owning one row | **eight rows under three headings** |
| Where the other four went | — | **behind a gear in the header**, by the admission test |
| The booking link | **1,156px down** the screen | first on the page; the second column's resting content at a desk |
| A settings screen's container | a **640px floating sheet at every width** | a **page** with a back control below `--wrap`; the **second column** at or above it |
| Settings screens | eleven | **twelve** (Reviews is new; the FAQ's storage landed, its screen did not) |
| Doors onto them | one | **two** |
| Staff rail buttons | four | **three** — Today · Calendar · Clients, plus the gear |
| The email's brand colours | two, uncorrected | **one, and three corrected values** — band 3:1 on paper, ink measured, words 4.5:1 |
| The 3px rule on an email header | **1:1** once a tenant has one colour | the band's own ink |
| Silver as words on email paper | **1.36:1** | 4.71:1 |
| The push switch | wrote a boolean; **no client code at all** | registers **this device**; unsupported / blocked / off each say so |
| VAPID secrets on the project | **none — `sendOwnerPush` had always skipped** | set 2026-09-02 |
| `testimonials` | a table with no door | `screens/more/Reviews.jsx` |
| Colour pickers in the product | **two screens** | one — *Your colour* |
| Arrows per Catalog row | **two** | **one**, up only, absent on the first row |
| Settings screens `sweep-widths.mjs` opens | 11, one door | **12, two doors** |

**WHAT SHIPPED.** `screens/Business.jsx` (the admission test at the top of the
file, three groups, eight self-answering rows, the blocking row in `--bad`),
`components/GearMenu.jsx` (Notifications · Message templates · Team · This
device · Switch business when there is more than one · the account block),
`components/SettingsHost.jsx` (page below `--wrap`, column above — `RecordHost`'s
twin), `screens/more/index.js` (the registry both doors need),
`screens/more/Reviews.jsx`, `screens/more/SwitchBusiness.jsx`,
`app/public/sw.js`, `app/src/lib/push.js`,
`supabase/functions/_shared/brandColor.js`, `tests/email-brand.test.mjs` (97
checks) and `20260902001000_faq_storage.sql`. `screens/More.jsx` is deleted,
and so are `.dashed` and `.badge`.

**THE ONE A COLD SESSION MUST NOT RE-DERIVE: THE GEAR IS A DESTINATION, NOT AN
OVERLAY.** The obvious build is a sheet from the header holding a menu whose
items open inside it. That is a second container mechanism for one set of
screens, and those four would be sheets at a desk — the exact thing this stage
exists to end. It takes the main area instead, so `SettingsHost` decides
page-or-column once for both doors, and pressing the gear again returns you to
the tab you left rather than to Today. `App.jsx` holds it as a boolean beside
`tab`; no tab is lit while it is open.

**AND ONE COUNT THAT TWO DESIGN FILES GOT WRONG: STAFF GET THREE TABS.** Screen
designs §10 says *"staff do not get a Business tab"* and then counts *"four
rail buttons, not five"*. Staff already had no Money, so both cannot be true.
The sentence is load-bearing; the number came from desktop spec §5f, written
while staff still had Business. Both files are corrected.

**FIVE THINGS THAT WERE ONLY FINDABLE BY BUILDING OR BY MEASURING.**

1. **The booking link was drawn TWICE on one 392px screen.** `SettingsHost`
   rendered its resting second column at every width, and below `--wrap`
   `.split` is not a grid, so it stacked under the index — under the copy the
   caller had already put there. Found in a screenshot. Guarded on `wide` now.
2. **`.row.between` is wrong for a heading with no box.** Catalog's category
   heading threw its reorder arrow 700px from the words it moves — the "not
   enough content to fill it" shape inside a row, which is what stage 5 fixed
   on a Clients row.
3. **A settings page's title is not a tab masthead.** At `--t-display`,
   *"Services & add-ons"* beside a 44px back control came back as *"Services &
   add-o…"*. `--t-title` fits the longest of the twelve at 320.
4. **`Switch` took a `disabled` prop and dropped it** in its row form.
   Invisible until push needed a state it must refuse to leave.
5. **`.clamp2` did nothing as written** — `.row-item .sub` is two selectors and
   sets `nowrap`. A rule that loses silently is a rule that is not there.

**AND ONE THAT WAS FOUND BY LOOKING FOR THE OTHER HALF OF A FEATURE: the VAPID
secrets had never been set.** Every file in this repo describes push's server
side as working. `sendOwnerPush` reads three env vars and returns early with a
`console.warn` when they are missing, and they were missing — for the whole
life of the feature. Set on the platform project (`kguqylyzgyzfktkfnhjb`)
2026-09-02; the live business's project was never touched.

**EIGHT FILES THAT OUTRANK THE DESIGNS WERE CORRECTED IN THE SAME CHANGE:** the
screen designs gain a *What shipped* for §10-12; the phone pass gains one for
§11-12; the component inventory marks seven §3b rows and six §3c rows built,
adds `SettingsHost.jsx` as a file it did not predict, marks `Faq.jsx` NOT BUILT
with the reason, and settles the twelve/thirteen count; the architecture audit
strikes Part B rows 14-17 and answers all five of §2c; the desktop spec §5f
takes three corrections including the staff count; `dashboard-skeletons.md`
says twelve and says a settings screen is not a sheet; the feature inventory
marks rows 92, 95, 96, 101, 120 and 121; and `CLAUDE.md` gains the two-doors
rule, the `email-brand` test and the push-secrets warning.

**MEASURED AFTER.**

| | |
|---|---|
| `sweep-widths.mjs` | clean at 1920 / 1440 / 392 / 360 / 320, normal and `?lite=1` |
| Console at 1920 / 1440 / 768 / 392 | nothing but the two pre-existing React Router v7 future-flag warnings |
| `composition` · `design-contrast` · `landing-pricing` · `route-contract` · `money-export` · `client-list` · **`email-brand` (97, new)** · `decisions-index` · `accent-sweep` | all pass |
| The service worker | registers and activates; `/sw.js` served as `text/javascript` and present in `dist/` |
| The VAPID probe | the deployed function returns an 87-character base64url key |
| Rotation | no new breakpoint below 1180, so the five guarded sites are still five |
| **`qr-scans` (14, new)** | the rendered QR decodes back to the same URL, with a light quiet zone, at a printable size |

**STAGE 7 REMAINS:** first run — the setup form and the walkthrough, last on
purpose.

**NOTHING IS LEFT OPEN. Three threads, all closed on 2026-09-02**
(the QR, and the motion rule he asked to have confirmed — DECISIONS.md → “The
QR code, and the motion rule he asked to have confirmed”).

1. ~~**PUSH’S GRANTED PATH IS UNVERIFIED, AND ONLY HE CAN CLOSE IT.**~~
   **CLOSED THE SAME DAY — HE TAPPED IT AND IT WORKS.** Asked to turn the
   switch on and let a booking come through, he answered *“works”*. So the
   feature is delivering for the first time since it was written: the browser
   registers, the row lands in `owner_push_subscriptions`, and
   `sendOwnerPush` reaches the device. **The half nobody had ever checked was
   the SERVER half** — the VAPID secrets had never been set, so it had been
   taking its “skipping” branch silently for its whole life. If push ever
   goes quiet, look there first: the failure is a `console.warn` in an edge
   function and is invisible from the dashboard.

3. **AND HE ADDED ONE THING THAT IS NOT STAGE 6’S:** he asked whether the
   “everything pops into place with no animation” complaint had been written
   down. **It had — roadmap 2.17.** His re-statement sharpened it twice: it is
   a **DESK** problem (below `--wrap` `.sheet` already animates in and out),
   and it must **bind new work now** rather than when 2.17 is scheduled. That
   second half is DONE: the standing rule — *anything that opens, animates in;
   a new component ships its entrance AND its exit in the change that builds
   it* — is in `dashboard-skeletons.md` §4 and `CLAUDE.md`. **The retrofit is
   what is left in 2.17**, and stage 6 itself added two more to its list (a
   settings screen entering the second column, and the gear taking the main
   area).

## 6v. ROADMAP 2.11, STEP 6 — STAGE 7 IS BUILT: FIRST RUN, AND 2.11 IS CLOSED (2026-09-02)

**The last of the approval page's seven stages, so roadmap 2.11 is done.**
Judgment calls are DECISIONS.md → "Roadmap 2.11, step 6, stage 7".
**Nothing is left open.**

**TWO THINGS THE OWNER INSISTED STAY TWO, AND THEY ARE TWO.** He overruled the
"empty states, not a wizard" recommendation and asked for a **setup form**
*and separately* a **guided walkthrough**. Building them as one is how the
form becomes a wizard, which is the thing people abandon.

**THE NUMBERS.**

| | Before | After |
|---|---|---|
| A brand-new dashboard | nothing happened; you were on Today with no jobs and no instruction | **the setup form opens itself**, then the tour |
| The setup form | — | **seven steps, one question each**, one column capped at 560px |
| Skipping | — | *"I'll do this later"* on every step, and it **never blocks the next one** |
| Resuming | — | Business carries **"Finish setting up · N of 7 done"** until it is finished or dismissed, and re-entering lands on the first unfinished step |
| The progress rule | designed, ~31px a segment at 320 | **built; 37.14px measured**, from 284px of usable width rather than the 244 the design assumed |
| Where "N of 7" comes from | designed as a stored count | **derived from the database for five of the seven**, stored only for what nothing else can answer |
| The tour | — | **a spotlight over the live dashboard**, one element and a 9999px shadow |
| Its step count | designed as "six or seven" | **planned before the first step is drawn**: 7 for an owner with jobs, **6** on an empty dashboard, **4** for staff |
| Its keyboard | — | Escape, a visible *Skip the tour*, and **a focus trap** |
| Staff | got neither | **get the tour and not the form** — they are not setting up a business |
| Re-running the tour | — | *Show me around* behind the gear |
| `sweep-widths.mjs` screens | 40 | **54** — the form's seven steps and the tour's seven |
| Roadmap 2.11 | seven stages, six built | **closed** |

**WHAT SHIPPED.** `components/SetupForm.jsx` (the form) and
`app/src/lib/setup.js` (the seven steps and the progress arithmetic, with no
React in them, because Business's row must print the same number the bar
paints and the test can only pin that if it imports without a DOM),
`components/Walkthrough.jsx`, the
`.progress-rule` / `.setupform` / `.setupstep` / `.setupfoot` / `.tourblock` /
`.spotlight` / `.tourcard` block in `theme.css`, and
`20260902002000_first_run.sql` (one jsonb column, `business_settings.setup`).
`App.jsx` mounts both and gained the `data-tour` attributes on the header `+`
and the rail; `Today.jsx` and `BookingLink.jsx` gained one each; `Business.jsx`
carries the resume row; `GearMenu.jsx` carries *Show me around*;
`seed-demo.mjs` pins the demo's first-run state.

**THE ONE A COLD SESSION MUST NOT RE-DERIVE: WHERE THE SEVENTH STEP CAME
FROM.** Screen designs §13a names SIX areas — business info, hours, services,
add-ons, booking rules, promo codes — and every other file says SEVEN
segments. Services and add-ons are one settings screen and two questions,
which gets to six. **The seventh is *Your colour*,** and it is not invented:
it is the eight rows of the Business tab, the ones that pass that screen's own
admission test (*what a CUSTOMER meets*), minus the two a detailer cannot
answer on their first morning — Photo gallery needs photos, Reviews needs
customers.

**AND ONE THAT NO DESIGN FILE COULD HAVE SEEN, because it is about the
businesses that already exist: COMPLETION IS DERIVED.** §1b's ruling is that a
segment fills when a step is COMPLETED rather than passed, so the bar and
Business's row cannot disagree. Building it made the other half obvious — a
business with three services has finished the services step whether or not it
ever opened this form, and **every business that existed before this change is
in exactly that position.** `setupProgress()` therefore asks the database
first and the stored list carries only what nothing else can. Without it the
owner's own live business would have been told it had done nothing. **`where
you work` is the one step nothing can derive** (`mobile_enabled` and
`dropoff_enabled` both default to true, so "I do both" and "nobody has been
asked" are the same two rows), which is why the seeded demo reads *6 of 7
done*.

**SEVEN THINGS THAT WERE ONLY FINDABLE BY BUILDING, MEASURING, OR TABBING.**

1. **THE TOUR'S COUNT LIED FOR A WHOLE ROLE.** Rule 3 skips a step whose
   target is absent, which runs the tour correctly and cannot COUNT it. On a
   staff login it delivered four steps while the card said *"of 7"* the whole
   way. The plan is resolved once now, before the first step is drawn.
2. **THE FOCUS TRAP WAS THREE DEFECTS, NOT ONE.** A backdrop stops a POINTER
   and stops nothing else, so `Tab` walked into the dashboard behind the dim
   and `Enter` pressed the very control the caption was pointing at. Adding
   the trap did nothing, twice over: the effect depended on `onClose`, an
   inline arrow that is a new identity every render, so its own cleanup kept
   yanking focus back out; and the caption is `visibility: hidden` until it
   has been placed, and **a hidden element cannot take focus**, so "focus
   moves to the caption card" had never once happened. All three found with a
   real `Tab` walk, which is the only place any of them is visible.
3. **THE TOUR STARTED ON THE WRONG SCREEN FROM ITS OWN SECOND DOOR.** It is
   re-runnable from the gear, and the gear TAKES the main area — so a tour
   started from there had no Today on the page and silently skipped its first
   step. The first step names its tab now.
4. **A FIXED FRAME BUDGET READ A LOADING SCREEN AS A MISSING TARGET.** Twelve
   frames is plenty once a screen is quiet and nothing at all once it is
   fetching, so the give-up test asks whether a `.spinner` is on the page —
   the same signal `sweep-widths.mjs`'s own `settle()` uses.
5. **THE CAPTION NEEDED A THIRD PLACEMENT, and §1c says "no third case".** At
   392x844 the day rail is a **665px** hole with 98px above and 80px below for
   a 130px card.
6. **AND THE FIX FOR (2) LOOKED FIXED AND WAS NOT — `?lite=1` IS WHAT SAID
   SO.** `sweep-widths.mjs` gained two keyboard assertions with this stage and
   they went red on the reduced-motion pass while the normal pass stayed
   green: 200ms after the tour opened, the caption card already carried its
   top and left and still computed `visibility: hidden`. The focus call was a
   race the normal path won and the lite path lost. It is `opacity: 0` now —
   focusable and measurable, no ordering left to get wrong. **A keyboard walk
   in one path is one sample of a timing-dependent behaviour, and removing
   every animation is a second sample of it for free.**
7. **PINNING THE ACTIONS TO THE BOTTOM HAD TO HAVE NO BREAKPOINT.** The
   obvious rule was `(max-width: 1023px) and (min-height: 500px)` — the guard
   CLAUDE.md requires of any layout decision that spends height. It is wrong
   here: a rule that fires only in portrait means rotating a phone MOVES the
   buttons, which is the owner's ruling being broken by the very clause
   written to respect it. **The same rule at every size cannot change on
   rotation.**

**VERIFIED ON A GENUINELY NEW BUSINESS, WHICH THE SEEDED DEMO CANNOT ANSWER.**
Component inventory §1c asks for the EMPTY dashboard, "the opposite of every
other screen in this rebuild". An account was signed up through the real form
and a business created through `CreateBusiness`: the setup form opened itself
at step 1 with **two of seven segments filled** (`create-business` gives a new
business Mon–Fri 9–5 and the account's own email, and both are true), all
seven steps were skipped without one of them blocking, the tour then ran
**six** steps over the empty dashboard — the missing one being *a job*,
exactly §1c's own example — and Business afterwards read *"Finish setting up ·
2 of 7 done"*. Neither returned on its own after a reload. The business and
its account were then deleted.

**AND EVERY WRITE WAS FOLLOWED INTO THE DATABASE.** The seven steps were run
once with real values on the demo and each row read back: the service, the
add-on and the promo code as typed; seven `business_hours` rows with the four
open days set and the other three present-and-null (the invariant the slot
engine depends on); `contact_phone` and `contact_email`; `mobile_enabled` true
with `dropoff_enabled` false for *"I go to them"*; and all seven keys in
`setup.done`. The demo was re-seeded afterwards.

**MEASURED AFTER.**

| | |
|---|---|
| `sweep-widths.mjs` | clean at 1920 / 1440 / 392 / 360 / 320, normal and `?lite=1` — **54 screens now**, including the form's seven steps and the tour's seven |
| Console at 1920 / 1440 / 392 | nothing but the two pre-existing React Router v7 future-flag warnings |
| `composition` · `design-contrast` · `landing-pricing` · `route-contract` · `money-export` · `email-brand` · `client-list` · `qr-scans` · `decisions-index` · `accent-sweep` | all pass |
| The progress rule at 320 | 37.14px a segment against the ≥28px the inventory set as its floor |
| Keyboard, tour | Tab cycles the caption's two controls and never reaches the page behind; Escape closes; the body lock is restored. **Asserted by `sweep-widths.mjs` at 392 in BOTH paths now**, and baselined by removing the listener |
| First run, new business | form at step 1 with 2 of 7 filled; tour 6 steps; neither returns after a reload |

## 6w. ROADMAP 2.12 — REQUEST-VS-RESERVE, ACCEPT/DECLINE AND QUOTES (2026-09-02)

**DONE.** The owner's answer to 2.11's question 5, and the first item after the
dashboard rebuild. Engine, schema and edge-function work; the only new screen
work fills a slot 2.11 designed and deliberately built empty.

**HIS CLARIFICATION IS THE WHOLE SHAPE OF THE ITEM.** *"Someone sends a request,
it will take up that time slot… one is just a little bit more guaranteed than
the other."* **Both modes hold the slot. Only the promise differs.** Availability
behaves identically, which is what made this a small item rather than a large
one.

### What shipped

| | |
|---|---|
| `business_settings.booking_mode` | `reserve` \| `request`, **default `reserve`**. First control on the Booking rules screen |
| `bookings.status` | one new value, `pending`. **No `declined`** — see below |
| `bookings.declined_at` | the detailer said no. `status` is `cancelled` too |
| `bookings.quoted_amount` / `quoted_note` / `quoted_at` | a price OFFERED, never charged |
| `supabase/functions/respond-to-booking` | member-gated: accept \| decline \| quote |
| `supabase/functions/accept-quote` | public, UUID as the credential, like `cancel-booking` |
| `app/src/components/RequestCard.jsx` | the queue's card — Accept filled, Quote ringed, Decline ringless |
| `app/src/components/QuoteModal.jsx` | the composer: a price, a sentence, a confirm step |
| `tests/request-mode.test.mjs` | **45 checks**, needs the root `.env` |
| Migration | `20260902003000_request_mode_and_quotes.sql`, applied |

### The three decisions worth carrying

**1. The exclusion constraint was NOT touched, and that is the point.**
`bookings_no_overlap` excludes rows `where status <> 'cancelled'`. `pending` is
not `cancelled`, so a request holds its slot with no change at all, and
`available-slots` does not even offer the time. **A load-bearing fact
established by NOT writing something** — invisible in the migration, and
protected only by `tests/request-mode.test.mjs` tests 3 and 4. A later session
that "tidies" `pending` into any of those three filters makes requests
double-bookable.

**2. There is no `declined` status.** Twelve places in this codebase ask
`status <> 'cancelled'` and every one of them is already correct about a
declined request. A sixth status would have meant editing all twelve to say the
same thing twice, and the first one anybody forgot would be a declined request
still holding a time nobody can book. `declined_at` carries the one fact
`cancelled` cannot — who ended it — and the job record prints it.

**3. A quote is offered, never charged.** `quoted_amount` is its own column;
only the customer, pressing the button in their email, moves it to
`total_price`. When it moves, the difference lands as a `price_adjustments`
line so the receipt's itemisation still reconciles — the `travel_fee` family one
step later. Saying NO to a quote is the ordinary `cancel-booking`, which is why
there is no third action.

### Three things the new status broke, none of which announced itself

- **The four `get_bookings_due_for_*` RPCs** would have emailed a customer
  *"your appointment is tomorrow"* about a request nobody had accepted. All four
  now exclude `pending`.
- **The manual Reminder button** did the same by hand, past the RPCs. Guarded in
  `send-owner-reminders` itself, not only in the UI.
- **`sweep-widths.mjs` silently changed what it measured.** `.card.attend` meant
  "the lit job"; a waiting request now takes the lit treatment, so that selector
  resolves to a request card. A rename with no error — the run stays green while
  measuring the wrong object.

### Three things only a screenshot could find

Two accent-filled Accept buttons the moment two requests shared a screen; the
job record printing *"Quoted $165.00"* one line above *Send a quote*, after this
item had given the word the opposite meaning; and a confirmation TICK over the
words *"we're holding your time"* on the customer's screen. Plus, on the
customer's manage page, two filled buttons — the quote's Accept and the page's
own Change the time.

### And a clock-dependent test fixed on the way past

`tests/booking-engine.test.mjs`'s short-notice check failed against an unchanged
pricing path at 22:31 local and passed at 15:00: `Date.now() + 20h` sliced to a
DATE puts 10:00 local anywhere from 14 to 44 hours away. The window is widened
to 96 hours. **A gate that is red at some hours and green at others is worse
than a gate that is red**, because the next session assumes it is theirs.

### The demo takes requests now

`seed-demo.mjs` sets `booking_mode: "request"` and seeds two pending requests,
one already quoted. **A decision about the demo, not about Andrew** — it is the
only business the sweep can log into, and a reserve-mode demo means the request
queue is never rendered at any width by anything. Sixth time this repo has
written that finding.

### And one defect found by rendering an email, which was not part of the item

Checking that the four NEW emails look like anything found that **every email
headline in the product was under the contrast floor**, on every colour. Stage
6's D1 fix gave the header band a measured ink and used it for the brand name
and the 44px rule; every template's own headline went on hardcoding
`color:#ffffff` onto that same band.

| | on the corrected band | floor |
|---|---|---|
| headline `#ffffff` | **3.01 – 3.76 : 1**, all fourteen colours | 4.5 |
| label `#e2e8f0` | **2.44 – 3.05 : 1**, all fourteen | 4.5 |
| *"Invoice / Receipt"* (the PAPER colour, on the band) | **1.20 – 1.57 : 1** | 4.5 |
| the buttons | 4.50 – 4.96 : 1 — fine, left alone | 4.5 |

Plus three fixed greys nothing to do with the tenant: the fine print was
**2.40:1** and the small labels 4.46:1.

**`email-brand.test.mjs` passed throughout** — it pinned the colour ENGINE and
never looked at what the templates did with the answer. *A test can verify the
arithmetic and still be blind to the drawing.* It is **138 checks** now, two of
them reading the SOURCE, and both baselined. **And two of the eleven bad lines
were written that same hour, by copying the template above them** — a defect in
a pattern reproduces into every new instance until somebody renders one and
looks.

### ~~THREE QUESTIONS~~ — ANSWERED 2026-09-03, and one of them became code

1. **Quotes stay on requests only.** His reason is the keeper: *"the final
   pricing is usually done when you're there… you don't really get quoted
   digitally. With the request thing, you send them the quote, but it's really
   gonna be based off of your pricing, not as much as the person's car."*
   **A quote prices the JOB from the price list; the CAR is priced in person**,
   which is what `final_amount` at Finalize payment has always been for.
2. **The stale-request nudge is BUILT** —
   `20260903000000_stale_request_nudge.sql`, a fifth kind in the reminder
   sweep, push AND email, `request_nudge_hours` on Booking rules (default 12,
   0 = never, shown only in request mode). Six behaviours pinned by
   `request-mode` test 13, which is 51 checks now. It measures from
   `created_at` rather than `start_at`, and it never chases a request whose
   time has already gone.
3. **The demo staying in request mode** drew no objection.

### And he asked about animations. Measured, and he is half right.

Read from the COMPUTED style on the live dashboard, because stage 3 already
shipped an arrival that was dead and looked like a finished screen. **Running:**
the staggered arrival on every tab change (420ms, 0/40/80/120/160ms delays),
180ms hover transitions, the sheet in and out below `--wrap`. **Not running:**
opening a job record at a DESK produces no new animation at all — the second
column just appears, and the same is true of the day panel, a settings column
and a picker. **That is roadmap 2.17 exactly**, now carrying the measurement,
and the answer to his question is yes: it is the stage not yet reached.

**MEASURED AFTER.**

| | |
|---|---|
| `sweep-widths.mjs` | clean at 1920 / 1440 / 392 / 360 / 320, normal and `?lite=1` — **56 clean this evening** against 54 before it, the three new states being the request record, the quote sheet and tomorrow's job record. It is 56 rather than 57 because which of the rail's two job records exists depends on the hour the demo was seeded, and the script now says so instead of measuring the same one twice |
| `sweep-booking-steps.mjs` | every step fits at all four sizes; step 1 still 10px spare at 1440x900, unchanged |
| `request-mode` | 45 checks pass; test 8's tie-out baselined by deleting the `price_adjustments` line, which fails it by exactly the quote |
| `booking-engine` · `timezone-and-slots` · `tenant-isolation` · `staff-roles` · `owner-writes` · `ics-and-notifications` · `booking-page-isolation` | all pass (86 / 34 / 40 / 35 / 62 / 32 / 62) |
| `composition` · `design-contrast` · `landing-pricing` · `route-contract` · `money-export` · `email-brand` (**138**) · `client-list` · `setup-progress` · `qr-scans` · `decisions-index` · `accent-sweep` | all pass |
| The four new emails | rendered and LOOKED AT, which is how the contrast defect above was found |
| End to end, real browser | a customer booked through `/book/demo-detail` in request mode and got *"We're holding your time"*; the row came back `pending`; the two test bookings were deleted afterwards |

## 6x. ROADMAP 2.18, STEP 1 — THE EMAIL RESEARCH, AWAITING THE OWNER (2026-09-03)

**Nothing in `app/` or `supabase/` changed.** The owner asked for the emails to
be deleted and rebuilt from scratch and asked for the research first, by name.
Step 1 is done; the item is waiting on him for two answers before any template
is drawn.

- **The file:** `docs/email-research-2026-09-03.md` — tables, per-claim source
  strength, and every URL.
- **The judgment:** DECISIONS.md → "Roadmap 2.18, step 1 — what the trade's
  booking systems actually send".
- **The panel:** the same six 2.10 and 2.14 used — Jobber, Housecall Pro,
  Zenbooker, Square Appointments, Urable, Mobile Tech RX — so the counts are
  comparable across roadmap items. **The two detailing-specific ones have the
  worst public documentation** (Urable's help centre is behind a login), so
  their rows say a feature exists and never how it is configured. That is
  marked in the file rather than averaged away.

### What it found

| Question the item asked | Answer |
|---|---|
| Are we missing an email everybody else has? | **Two.** A **payment receipt separate from the invoice** (five of six) and a **re-book / maintenance reminder** (four of six, all four in a separate paid tier). Nothing else. |
| A "you're next in the queue" email? | **Nobody sends one.** What the trade sends is **on-my-way, and it is SMS in all four products that have it.** We already have it (`on_my_way` message template). |
| A review request? | **We already have one** — `followupEmail`, five of six have the same. What we lack is the configurable **delay**. |
| How much of the SCHEDULE is theirs? | **Two reminders is the trade's ceiling, not its floor** — Jobber caps at two and says so; nobody offers three. **Our timing already beats four of the six**: we carry Square's offset shape and Housecall Pro's clock-time shape at once, per business, timezone-correct. |
| How much of the CONTENT is theirs? | **Five of six give WORDS. One gives a DESIGN.** And the one that gives a design still renders the invoice's itemisation as a single variable the editor cannot open. |
| What does "premade templates" mean here? | **WORDING.** Not one of the six offers a choice of visual designs for a transactional email. Where design galleries exist they are marketing email in a paid tier, and they apply the brand automatically anyway. |

### Three things a cold session must not re-derive

**1. On-my-way is not an email and never was.** Four of six have it, all four
as SMS, and we already ship it. **Adding an on-my-way email and recording it as
a closed gap is the specific mistake this paragraph exists to prevent.**

**2. Half of "multiple options for when emails get sent out" is
discoverability.** The reminder timing control is on **Booking rules**; the
Notifications screen just says *"Timing is set in Booking rules."* The owner has
never been shown a control that is already better than most of the category.

**3. The logo is one field away.** `business_branding.logo_url` exists,
detailers already upload it on Business info, and it is drawn on the booking
page, the confirmation page and the manage page. **`buildBrand()` has never read
it**, so no email has ever carried a logo — the band prints the business name as
text. Cheapest and most visible item in the build.

### THE TRAP, and it is the one thing here that will silently waste a session

**`tests/email-brand.test.mjs` is PARTLY A SOURCE-SHAPE TEST.** Of its 138
checks:

- **1–6, 7b and 7c are arithmetic.** They measure through `brandColor.js`, never
  look at a template, and pass untouched through any rebuild.
- **7a, 7a-ii and 7b-ii read `emailTemplates.ts` as text** and assert facts
  about a file a rebuild deletes: that `const header =` blocks exist, that
  `${brand.headerInk}` appears at least fourteen times, that the literal
  `max-width:600px; background-color:#ffffff;` is present, and that three
  specific greys never return.

**Their intent is right and must survive; their pointers must move — in the same
commit, deliberately, never dropped.** A rebuild that quietly loses 7a is how the
D1 defect returns: 7a exists to stop the NEXT template hardcoding a colour on the
band, and a rebuild is precisely "the next template". This is *a test can verify
the arithmetic and still be blind to the drawing* one step further along — the
test that learned to look at the drawing, pointed at a drawing that no longer
exists.

**Baseline taken at the start of the session: `email-brand` 138 pass,
`composition` 26 pass.**

### The instrument was missing; it was built, and it found a live money defect

**`node scripts/render-emails.mjs`** — new 2026-09-03. Writes all sixteen emails
(eleven kinds; sixteen counting the branches somebody actually receives) to
`email-preview/index.html` from one fixture. `--accent=#hex` re-renders for
another tenant, `--out=` keeps two side by side, and it is **gitignored** — the
script is the artefact, the HTML is what you look at once.

**No new dependency, and that is the design.** Node 24 strips TypeScript types
itself, so it imports `_shared/emailTemplates.ts` directly and reads **the same
file the edge function runs**. 2.12 used `esbuild --bundle` for its one-off; a
permanent script needing a build step is a script that rots. This works only
because that module is dependency-free on purpose — a decision made two roadmap
items ago for testability, paying out here.

**IT FAILS TODAY, ON PURPOSE. THE INVOICE'S COLUMN DOES NOT REACH THE INVOICE'S
TOTAL.** Rendered and looked at: $285 + $35 + $40 + $25 + $20 of charges, a $30
tip, then **Subtotal $405, Tip $30, Total paid $395.** $405 + $30 is $435.
**$40 is missing and nothing on the page mentions it** — the customer's promo
code, which the *confirmation* email drew correctly as `-$40.00` an hour before.

**Mechanism, and it is THREE holes rather than one.** `send-invoice/index.ts`
builds its charge rows from services, add-ons, travel and `price_adjustments`,
which sum to `subtotalBase` — **before the site sale and before the promo**. It
takes `totalPaid` from `final_amount`, which is `total_price`, **past both and
rounded**, plus finalize extras. **Neither discount, and neither the rounding,
is drawn anywhere**, so the gap is `siteDiscount + promoDiscount + rounding`.
`b.promoDiscount` is even passed into `invoiceEmail`; the template never reads
it, and `siteDiscount` is hardcoded to `0` on the way in.
**The detail that hides it: `bookings.subtotal` is NOT what the rows add up
to** — `create-booking` writes `quote.subtotalAfterSite`, already past the site
sale, so the two are equal only when no sale is running. **Fix the promo, watch
the number close, and the site sale is still broken.**

**It is the `travel_fee` family, in the same file, one comment below the fix for
its twin** — that comment reads *"the bottom line was still right… but the
itemisation above it did not add up to anything"*, which describes the promo
today. **A fix that names one instance of a pattern fixes one instance.**

**Why eleven suites missed it:** `money-export` ties out the ACCOUNTANT EXPORT,
`booking-engine` test 17 ties out the QUOTE ENGINE. Both are real, both are
about a different document. **A tie-out is only a tie-out for the document it
names** — and nothing had ever asserted the one arithmetic the person who paid
can actually see.

**Not patched, deliberately.** The fix belongs in `send-invoice` (which survives
the rebuild, unlike the template) but inside the invoice/receipt split this same
item performs — patching now means re-deriving it days later against different
rows. **The failing assertion is the guarantee; a done diff would be weaker.**
Nobody receives these: detailingplatform.com is his private preview and billing
charges nobody.

**AND IT MAY NOT BE OURS ALONE.** `reference/supabase/functions/send-invoice/
index.ts` — the read-only snapshot of his LIVE business's old site — has the
same shape: an explicit negative row for a *monthly plan* discount, and nothing
for `promo_discount`, on a site that does have promo codes. **The omission was
inherited by the port, not introduced by it.** Whether the live `carwashweb`
still matches, and whether its own `final_amount` path (it recomputes from base
items) closes the gap another way, is **not established and must not be assumed
either way.** That is question 5.

### The proposed set: twelve customer kinds, plus two owner ones

Eleven today. The change is two splits, not an expansion: **confirmation splits
into *booking confirmed* and *request received*** (both products with request
mode keep them apart, and they make different promises), and **invoice splits
into *invoice* and *receipt***. Splitting the invoice **doubles the number of
places that arithmetic is drawn**, so both have to tie out — `money-export`
class, and it needs its own check.

### FIVE QUESTIONS STAND FOR HIM; TWO BLOCK THE BUILD, AND THE FIFTH SHOULD NOT WAIT FOR IT

1. **Premade templates — wording or looks?** Recommend wording. **Blocks.**
2. **How many reminders?** Ours sends one. Recommend the second. **Blocks**, and
   it is a migration rather than a number: each send is guarded by exactly one
   marker column (`customer_reminder_sent_at`), so a second reminder needs a
   second marker and a second lead setting or the sweep either double-sends or
   never sends the second.
3. **The re-book / maintenance reminder** — recommend its own roadmap item. It
   is the only **marketing** email in the set, so it needs an unsubscribe, a
   suppression list and a sending reputation the transactional ones are exempt
   from. Does not block.
4. **Logo on the coloured band or on the white paper?** A logo is an arbitrary
   PNG, so its contrast cannot be measured the way every other colour here is.
   Recommend paper. Does not block.
5. **May we READ `carwashweb`'s invoice email?** The read-only snapshot of his
   old site has the same missing promo row. **If the live business still
   matches it, real customers have been getting invoices that do not add up
   whenever they used a promo code.** A read settles it in minutes; CLAUDE.md
   allows reads and forbids writes, and this is a read. **Does not block 2.18
   and should not wait for it.**

**And a constraint on the editor that falls out of the same law as #3:** a
detailer who types *"20% off ceramic coating this month"* into a reminder's
prose slot has reclassified a transactional email as a commercial one. Square
warns its own users in those words; our screen should too, in plainer ones.


## 6y. ROADMAP 2.18 — HE ANSWERED, AND THE LOOK IS REBUILT ON TWO EMAILS (2026-09-03)

**He rejected the existing look, asked for a block EDITOR rather than
prewritten wording, and removed the cap on reminders.** Full reasoning:
DECISIONS.md → "Roadmap 2.18 — his answers, and the look he rejected".

### What he said

- *"i though you werrte gonna make the email from scratch it looks exactly the
  saem sytle as the email template i had before. and doesnt even macth the
  style of the wwebsites."* — **those were the EXISTING emails**, rendered so
  he could see them, handed over without the word BEFORE beside the picture.
  **The finding stands on its own regardless:** a coloured band above a white
  card is the on-distribution default, and it is not The Thread.
- *"by scutom i mean they can choose whats in in and what order ect. we can
  make a email editor page."* — **an editor, not prose slots.**
- *"we can have as many emails as we want i mean i dont care."* — **no cap on
  reminders.**

### What that decides

**A TEMPLATE IS AN ARRAY OF BLOCKS.** Every renderer returns one
self-contained `<tr>`; reordering is reordering an array, switching a block off
is filtering it, changing the words is swapping a string. **A template written
as one HTML literal cannot have an editor over it at any price**, which is why
this had to be settled before the other ten were ported rather than after.

**`moneyBlock` IS THE ONE BLOCK THE EDITOR MAY NOT OPEN** — not reorderable,
not editable, not deletable. This is the half of the research that survived
being overruled: Zenbooker, the most permissive product in the sweep, drew the
same line independently, and it is CLAUDE.md's own rule about a printed number.

**Reminders need a `booking_reminders_sent` row per (booking, rule)**, not a
second marker column. "As many as we want" does not generalise from
`customer_reminder_sent_at`.

**This is the 2.8 pattern for the second time** — research recommended a shape
on a six-product count and he overruled it. *Research rules shapes IN; it
cannot rule them OUT.*

### What is BUILT, and what is deliberately not

**BUILT:** `supabase/functions/_shared/emailKit.ts` (ground, blocks, shell) and
`_shared/emailsNew.ts` (confirmation / request received, receipt / invoice),
drawn by **`node scripts/render-emails-new.mjs`** (`--accent=#hex`, `--out=`).

**NOT WIRED UP, ON PURPOSE.** The edge functions still send
`_shared/emailTemplates.ts`; `tests/email-brand.test.mjs` is still green on the
old file at **138**. **The swap is one commit after he approves the world.**
Doing it first means either porting ten templates into a look he rejects or
re-pointing the 138-check test twice.

### How The Thread survives an inbox

| The law | In the email |
|---|---|
| One continuous cool-biased near-black ground | Full-bleed `#0B0D0E`, `bgcolor` attribute AND inline style — Outlook's Word engine reads the attribute, and a dark design that loses its ground becomes bone-on-white |
| Warm bone, **never `#ffffff`** | `#F2F1EC`. The system names pure white as a tell, and on near-black the warmth is most of why it reads as designed |
| A collection of records is a ruled list | Hairline `#272D31` between rows. An itemised total is the cleanest case of that law in the product |
| One sharp accent, marking what has landed | The appointment, the money, the action. **The eyebrow was accent in the first render and is `--fog-2` now** |
| Centred exactly once, at the end | The footer |
| Size jumps of 3x | 11px label → 15px body → 34px headline |

**THE TYPE LAW SURVIVED EVEN THOUGH THE FACES DID NOT, and this is the
transferable part.** An email cannot load a webfont, so Archivo and JetBrains
Mono are gone and Arial is the only honest stack. But the system's rule is *one
face for everything that is words, one face for every figure* — and that shape
ports intact to Arial + a monospace stack. **The faces were never the law; the
split was. When a constraint kills a rule's implementation, ask what the rule
was FOR before recording it unmeetable.**

### Two defects found by looking, fixed in the same pass

The services were listed once as prose and again in the money table with prices
beside them — **the owner's own copy rule broken in layout form** (*does this
block add a fact the one below it does not already carry?*). And the eyebrow
was painted in the accent 100px above the accent mark, which is the scatter the
one-accent law exists to prevent.

### The colour engine was EXTENDED, never edited

`emailDarkBrandColors()` is a **new export beside** `emailBrandColors()`, which
is byte-identical. 138 checks pin that function against `app/src/lib/theme.js`;
editing it would turn a green suite red for reasons unrelated to the rebuild.

**It corrects against `--ink-2` `#171B1E`, not `--ink-0`** — the accent lands
on a lifted panel as well as the ground, and *correct against the lightest
surface THAT VALUE can land on* is the rule this project has now learned four
separate times. Verified on the house green and on **crimson**, a real preset
that passes as a fill and fails as text.

### Still open

Ten templates to port · the editor screen · schema for reminder rules · the
wiring · re-pointing `email-brand`'s three source-shape checks onto the new
file. **And the invoice's missing promo row is a REBUILD requirement now, not a
patch** — `render-emails-new.mjs` asserts the lines reach the total, and the
rebuilt receipt carries the discount, so the fix ships with the port.

**Not verified, and it is a real gap:** no email client has rendered these.
`render-emails-new.mjs` draws them in a browser, which is not Outlook, not the
Gmail app and not Apple Mail's dark-mode inversion. The design is built to
degrade (square corners, lost tracking, no media queries relied on), but
degradation-by-construction is not the same as having looked.


## 6z. ROADMAP 2.18 — LOOK APPROVED, EDITOR SCRAPPED, COMPATIBILITY CHECKED (2026-09-03)

Third exchange the same day. **The look is approved. The editor he asked for
one message earlier is scrapped. The reminder count was delegated and is
answered. The client-compatibility research is done and changed three things.**
Reasoning: DECISIONS.md → "Roadmap 2.18 — the look approved, the editor
scrapped, and will it work everywhere". Research:
`docs/email-clients-2026-09-03.md`.

### His words

- *"Also it looks good."* — **the world is approved.** The port is unblocked.
- *"Also scrap the custom email editor thing. / make it a lot more simple."*
- *"ima do as many emails as you recommend."*
- *"do some resasserch into how emails and different services open it and make
  sure it will work globally."*

### The reversal cost nothing, and why

**No editor code existed to delete.** The session had built the block
architecture and stopped at two rendered templates to get the look approved
cheaply — no editor screen, no schema, no table, no settings rows. **The
stopping point chosen for the approval gate was the same one that made the
reversal free.** The general form, worth reusing: **when a large item has a
subjective half and a mechanical half, render the subjective half first and
stop.** The gate doubles as a rollback point.

**The blocks stay, with a new justification.** They were an editor substrate;
they are now how the templates are assembled — shorter and more consistent than
hand-written literals — and, more usefully, **the plain-text half of every email
is a second pass over the same block list** rather than eleven hand-written
twins. That matters now (see the HTML-only finding below).

**"A lot more simple" resolves to what the research recommended**: the design is
ours and fixed; the detailer gets an on/off switch per email, one optional
message of their own, and a choice of prewritten wordings. Five of six products
do exactly this. **It was recommended, overruled, reversed, and landed back on
the count — at a cost of two rendered emails, because the shape was proven
before it was built.**

### Reminders: TWO, the second off by default

He delegated the number. The answer and its reasons:

1. **Jobber caps at two; nobody in the sweep offers three.** The category
   leader having a hard ceiling outweighs the median.
2. **Two is the useful pair for this trade** — the evening before (move the
   car, clear the driveway, find the tap) and ~2 hours out (not asleep, not at
   work). A third has no job.
3. **A third costs deliverability for every other email.** Nagging generates
   complaints, and sender reputation is shared with the receipt — the invoice
   landing in junk is worse than a missed appointment.
4. He said "as many as we want" and then "a lot more simple" one message later.

**Still needs the schema the unbounded version needed**: a
`booking_reminders_sent` row per (booking, rule), not
`customer_reminder_sent_at`. **Two markers is exactly where a boolean column
stops generalising**, and the second costs nothing once the first exists.

### Compatibility: it holds

| Client | Share | A DARK email in dark mode |
|---|---|---|
| **Apple Mail** | **~58–65%** | Left alone — **unless it finds pure `#ffffff`/`#000000`** |
| **Gmail** | **~29%** | Desktop leaves it alone; Android respects explicit backgrounds; **the iOS app is the one real risk** and can fully invert |
| **Outlook** | **~4%** | Windows desktop inverts; Outlook.com and mobile do PARTIAL inversion, which leaves a dark ground alone |

**Light-on-light cannot happen here, structurally.** Every colour is declared on
the element that shows it, so an inversion engine flips ground and type
together. **And full inversion mirrors BRIGHTNESS while preserving HUE** —
checked specifically, because several guides say inversion "flips brand colours
to their opposites", which would have meant a green button arriving magenta.
It does not. **Worst case is a light version of the same email, correct hue,
every ratio still passing** — a contrast ratio is symmetric under a brightness
flip.

**The `mix-blend-mode` hack that forces dark through Gmail was deliberately NOT
used.** It wraps every piece of text in two extra elements, half-applies badly,
and buys "looks dark rather than light in one client" — not "readable rather
than unreadable". Add it to the shell once, if he ever says the light rendering
bothers him.

### Three changes it forced

1. **Pure black and white are unreachable in a tenant's colour** —
   `#ffffff` → `#fefefe`, `#000000` → `#010101`, in the dark wrapper only and
   never in `inkFor`, which the 138-check paper suite pins. **Both were
   genuinely reachable**: a tenant picking white got `#ffffff` as their accent,
   and crimson's button ink was `#ffffff`. Asserted in `render-emails-new.mjs`.
2. **`bgcolor` attributes beside every background property.** Outlook's Word
   engine reads the attribute, and a dark design that loses its ground is the
   one genuinely unreadable outcome.
3. **The logo sits on a bone plate**, and this is a straight defect rather than
   a dark-mode subtlety: **a detailer's logo is almost always dark artwork on a
   transparent background**, because it was made for a white website — on
   `--ink-0` it is invisible. **Nothing in this repo could ever detect it**; an
   arbitrary PNG's contrast cannot be measured, which is the same reason the
   logo was kept off a tenant-coloured band. `render-emails-new.mjs --logo`
   draws the worst case and it was looked at. **A code path nobody has drawn is
   a code path nobody has checked — the third time this session.**

### And the finding that is not about dark mode at all

**EVERY EMAIL IN THE PRODUCT IS SENT HTML-ONLY.**
`supabase/functions/send-email/index.ts` builds its Resend payload with `html`
and no `text`. An HTML-only message with no plain-text alternative is a
long-standing spam-filter signal and it applies to **every** email including the
receipt — the one that must never land in junk. **Found by following "will it
work globally" past the templates and into the sender, which is where the
question actually lived.** Fix during the port: a `text` pass over the same
block list.

**Gmail's 102KB clipping threshold was MEASURED rather than assumed** — the
rebuilt emails are **9–10KB**. Two orders of magnitude of headroom.

**One real "globally" gap, named not fixed:** `formatDateLong` is hardcoded
`toLocaleDateString("en-US")`. US-only product, US-only timezone handling; this
is the marker for whoever adds a second country.

### THE HONEST LIMIT

**Nothing has been opened in a real email client.** Research plus a browser is
not Outlook's Word engine, not the Gmail iOS app, not Apple Mail's dark pass.
**A real send to a Gmail, an Outlook and an iCloud address, in both modes, is
twenty minutes** and is what turns "should work" into "does work" — CLAUDE.md's
standing rule, which this does not yet meet.


## 6z-ii. ROADMAP 2.18 — THE PORT LANDED: TWELVE REBUILT, WIRED, AND THE INVOICE ADDS UP (2026-09-03)

On *"do whataver u want and is best"*. The look was approved and the editor
scrapped, so the mechanical half was what remained. Reasoning: DECISIONS.md →
"Roadmap 2.18 — the port: all twelve rebuilt, wired, and the invoice made to
add up".

### What shipped

| | |
|---|---|
| `_shared/emailKit.ts` | The world: ground, design-system tokens, blocks, shell, `htmlToText`, `reconcile`. Its header carries the email-client constraints. |
| `_shared/emailTemplates.ts` | **Rewritten.** Twelve templates, each a LIST OF BLOCKS. The old ~530-line file is gone. |
| Eight edge functions | All send the rebuilt emails, all pass the plain-text half through. |
| `send-email` | Sets `text` on the Resend payload. **HTML-only was a live spam-filter defect for the whole life of the product.** |
| `scripts/render-emails.mjs` | One script again (the `-new` sibling is deleted). Seventeen emails, HTML **and .txt**, `--accent=`, `--logo`, `--out=`. |
| `tests/email-brand.test.mjs` | **186 checks**, was 138. |

**THE FILE KEPT ITS PATH AND MOST EXPORT NAMES ON PURPOSE.** Eight edge
functions import from it and `BookingEmailData` is a shape they already
assemble. **Rebuilding the RENDERING was the item**; changing the data contract
at the same time would have meant rewriting every call site's query as well as
its render, for nothing. Only `TenantBrand` moved, because the colour set
genuinely changed: `primaryColor`/`headerInk`/`accentColor` became
`accent`/`accentFill`/`accentInk` plus `logoUrl`.

### `reconcile()` — a guarantee where there had been a promise

The invoice bug could have been three pushes in `send-invoice`. **That is the
fix 2.8c already applied once and it did not generalise** — that session added
travel and surcharge rows to this exact file, under a comment saying the
itemisation had not added up, and left the promo out. *A fix that names one
instance of a pattern fixes one instance.*

So `reconcile(lines, total)` takes the lines a template is about to draw and
the total it is about to print, and appends the remainder as its own line when
they disagree by a cent or more. **Both money templates run through it. "Did the
caller remember to itemise everything" stops being something anyone has to
remember.**

**AND IT WAS LOAD-BEARING IMMEDIATELY.** The plan was to push a site-sale row
beside the promo — and **`bookings` has no `site_discount` column.** The amount
is baked into `subtotal` at booking time (`create-booking` writes
`quote.subtotalAfterSite`) and the settings it came from may have changed since,
so the invoice cannot attribute it. **The first draft referenced
`booking.site_discount`, which is `undefined`, so `Number(undefined) > 0` is
false and the line silently never draws** — a fix that reads as a fix and does
nothing, caught only because the schema was checked rather than assumed.

Where each of the three holes is answered now: the **promo** is itemised by name
(real columns); the **site sale** and the **rounding** are drawn by `reconcile`
as one honest *"Discount applied"* line. **An unexplained gap is the defect; a
line saying a discount was applied is not.** Storing the sale amount on the
booking is a migration and its own item.

### The plain-text half is DERIVED

`htmlToText()` — one function, not twelve twins. Twins drift, and the first time
somebody edits one and not the other they disagree about a price. It reads well
only because the blocks are structural: every row is a `<tr>` and every figure
sits in its own cell, so "label | value, one per line" falls out of the markup.
**This is now the main thing the block architecture buys, and it is a better
reason than the editor it was built for.**

### Re-pointing `email-brand`, and the check that caught itself going quiet

The three SOURCE-SHAPE checks described a layout that no longer exists. **Two
failed loudly and one went silently vacuous** — the `const header =` regex
matched nothing, so its assertion passed by having no subjects. *A skipped check
reads exactly like a passing one.*

Rewritten **stronger** than the originals could be: the old 7a banned two hex
values on one surface, the new one bans **any literal hex in the templates**,
because every colour now comes from a token or the brand and a literal is by
definition unmeasured. 7a-ii became **"the two accent values may not swap
jobs"** — `accentFill` is corrected 3:1 as a background and `accent` 4.5:1 as
words, so printing one as the other is the old "paper colour on the band"
defect in the only shape it can still take. **7a-iii asserts the checks HAVE
SUBJECTS**, so the next layout change fails loudly instead of going quiet.

**BASELINING FOUND A REAL BUG IN THE NEW CHECK.** 7a passed while a literal
`#ffffff` sat in the file: the regex source contained **a raw backspace
character (0x08)**, left by the script that wrote the test, making it
`/#[0-9a-fA-F]{3,8}\x08/` — which can never match. It was invisible in every
editor and in `sed` output and only showed under `od -c`. **A check written to
prevent silent vacuity was itself silently vacuous on its first run.** Fixed,
then baselined both ways: a literal colour injected into a template fails it,
and swapping the fill value into a `color:` fails 7a-ii.

The check also strips comments before scanning, because this file's own prose
explains the rule by naming the value it bans — **and a check that fails on its
own documentation gets deleted rather than fixed.**

### Verified

| | |
|---|---|
| `render-emails.mjs` | exit 0 on the house green, on **crimson**, and with `--logo`. Seventeen emails, HTML and text. |
| Money | Confirmation 360 + 25 + 20 − 20 − 40 = **345**; receipt 285 + 35 + 40 + 25 + 20 + 30 − 40 − 20 = **375**. Asserted on the RENDERED output, not the inputs. |
| `email-brand` | 186 pass; the two new source checks baselined failing. |
| `composition` · `design-contrast` · `landing-pricing` · `route-contract` · `money-export` · `client-list` · `setup-progress` · `decisions-index` · `accent-sweep` | all pass |

### AND THEN THE INVOICE STOPPED DOING ARITHMETIC, on his instruction

*"We don't need to recalculate everything again when we send out the email…
just have it copy exactly what was calculated on what you finalized. I don't
get why there has to be math."* **He was describing the root cause.**
`send-invoice` rebuilt the customer's bill from five sources — snapshotted
services, add-ons, `travel_fee`, `price_adjustments`, finalize line items — and
hoped the sum matched `final_amount`, which is computed in a different file.
**It never did, and the gap moved every time somebody added a price feature.**

It now prints **`total_price` + the finalize lines**, which is `final_amount`'s
own definition, so **the column cannot disagree with the total**. ~45 lines
deleted. The work is still NAMED on the invoice but no longer carries prices,
because per-service prices are not what was charged. `reconcile` stays as a
guard that should never fire. **Storing the site-sale amount on the booking is
no longer needed** — nothing re-derives it any more.

### THE LIVE BUSINESS WAS READ, AND IT PRODUCED A RETRACTION

He authorised it. Two corrections:

**CLAUDE.md named the wrong repo.** `carwashweb` is a private **99-file
Emergent scaffold last pushed 2026-02-01** with no Supabase functions, no
invoice code and no promo codes. The live code is
**`random12one0/carwebitebooking`**. A session following the old name finds a
shell and concludes there is nothing there. Corrected in CLAUDE.md.

**AND ITS INVOICE ADDS UP — so our bug was INTRODUCED by the port, not
inherited.** The morning's entry said the opposite, on the strength of
`reference/`'s row-building not pushing a promo row. Following `final_amount`
to where it is computed finishes the trace: the live finalize modal and the
live `send-invoice` **both** exclude the promo, so they agree with each other.
Ours did not, because our `final_amount` starts from `total_price` — which is
post-promo — while our rows were rebuilt from pre-discount parts. ***A defect
diagnosed by reading the code that DRAWS a number is half a diagnosis.***

Two smaller things on the live site, named so nobody re-finds them as new:
`roundToNearest5` rounds the total but not the rows (up to $2.50 of drift), and
a fresh finalize starts from **list prices**, so a promo customer defaults to
the full amount unless the owner adjusts — the modal shows the difference on
screen, so it is visible and his call.

### AND THE LAST TWO PIECES LANDED THE SAME DAY

**The second reminder** — `customer_reminder_2_enabled` +
`customer_reminder_2_lead_minutes`, its own marker on the booking, its own RPC,
a row on Booking rules, off by default. **Two columns rather than a
`booking_reminders_sent` table, reversing what was written earlier the same
day**: that shape was right while the count was open-ended and became wrong
when he capped it at two. **Its own RPC because the first one carries the
evening-before rule**, which the second must not inherit — two evening sends
racing on one marker — and it refuses to fire before the first has.

**"Your own words"** — `business_settings.email_messages jsonb`, one optional
paragraph per email kind, rendered in the panel block by one `ownWords()`
helper, with prewritten wordings as a constant in
`app/src/lib/emailMessages.js`. **No `{{placeholders}}`, deliberately**: the
email already greets the customer and states their date, vehicle and address,
so a token would be the owner's own never-default. **The absence removes
everything there is to typo or validate.**

**AND THE EMAILS WERE SENT** — `scripts/send-test-emails.mjs --to=…`, four
different shapes, through the real relay. **It needs `SUPABASE_SECRET_KEY`, not
the legacy service-role JWT**: `send-email` compares against what Supabase
injects, this project has migrated, and the legacy key returns a flat 401 that
reads exactly like a revoked key.

**`buildAddressing` was deleted as dead code and is not dead** —
`booking-engine` test 9 pins TENANT ISOLATION with it, and the caller was in
`tests/` while the grep was of `supabase/functions/`. Restored.

### HE OPENED THEM, AND THE DARK DESIGN FAILED ON GMAIL

*"It looks good in dark and light mode iCloud… but on the Gmail, it does
reverse it when I have dark mode activated… it darkened the green somehow."*

**The research had PREDICTED this and concluded the result would be readable —
that conclusion was reasoning, not measurement, and it was wrong.** Measured
afterwards by applying Gmail's actual transform (an HSL lightness mirror) to
our own palette:

| | before | after Gmail |
|---|---|---|
| accent as words on the ground | 10.07:1 | **1.99:1** |
| ink on the accent button | 10.88:1 | **1.77:1** |

**Unreadable, not off-brand.** The flaw in the reasoning: a ratio IS symmetric
under a flip, but inversion does not flip everything by the same amount — a
mid-lightness accent barely moves while its near-black ink swings to near-white,
so the pair does not travel together. **Unfixable by palette; all four accents
tested fail.** And Gmail ignores `color-scheme` and `prefers-color-scheme`
alike, so there is no way to tell it.

**SO THE EMAILS ARE LIGHT-FIRST NOW**, with the dark design behind
`prefers-color-scheme`. Both palettes are The Thread's own — `--paper` and
`--ink-0`; the light band already existed. Apple Mail (~60% of opens) still
shows the dark design; Gmail now darkens a LIGHT email, which is the one thing
its algorithm is tuned for. Everything is inline and light, so a client that
strips `<style>` shows a complete light email.

**THE NEW FAILURE MODE, AND ITS CHECK: the dark palette applies BY CLASS**, so
an element that sets a colour inline and forgets its class stays light inside a
dark email — invisible to any contrast check, because both values are
individually fine. `render-emails.mjs` walks the rendered output and fails on
any inline colour without a class; it caught six on its first run. **Pure white
was also still reachable in the LIGHT path** (crimson's and violet's button
ink) — Apple Mail's own inversion trigger, one line from making Apple Mail
behave like Gmail.

`email-brand` is **189 checks**; its shell assertions were re-pointed a second
time in two days, which is what a live architecture costs.

### AND THE SPAM ANSWER: AUTHENTICATION IS FINE, REPUTATION IS NOT

Both domains checked rather than guessed. DKIM, SPF on the sending subdomain
and DMARC `p=none` are **present and identical** on `email.detailingplatform.com`
and `andrewsdetail.com`. **Verifying anything further buys nothing** — which is
the useful half, because it stops the obvious next move being a wasted
afternoon of DNS.

What differs: the two sit on **different Resend pools** (his on Amazon SES, the
platform on Resend's newer own-MTA), and far more heavily, **his domain has
months of engaged mail and the platform subdomain has sent almost nothing.**
Gmail weighs sender history hard; a first-ever message from an unknown domain
to a personal Gmail account is a textbook cold-start classification.

**One genuine gap: the ROOT `detailingplatform.com` has no SPF record at all.**
Free to fix, does not affect these sends. Full working and the ordered list of
what actually helps: `docs/email-clients-2026-09-03.md`, last section.

### Still open

`formatDateLong` hardcoded `en-US` · the root SPF and a DMARC `rua=` (his DNS,
in Netlify) · **and his verdict on the light-first sends**, which is the only
thing that closes this loop. A send to a Gmail, an Outlook and an iCloud address in both
modes is twenty minutes, and it is the only thing that turns "should work" into
"does work".


## 6z-iii. ROADMAP 2.5 — THE SMOKE TEST, AND A WHITE SCREEN ON `main` (2026-09-04)

**The loop works. The thing that was broken was a configuration nothing in this
repo had ever rendered.**

**`scripts/e2e-booking.mjs` is rewritten** — it had been dead since before
2026-08-31, pointing at a Linux Playwright path and a container scratch
directory, and nothing noticed because it was in no list. It is now **82 checks
across two tenants, ~3 minutes**, and it is in CLAUDE.md's verification list,
which is the half that stops it rotting again.

**What it does that nothing else did.** `sweep-booking-steps.mjs` walks all
seven steps of the booking page and stops ON the review step — so **nothing in
this repo had ever pressed Confirm.** The one action the product exists for was
exercised at the API level by `booking-engine` and through the UI by nothing.
This presses it, then follows the booking the whole way: the row against what
the price bar printed, both emails through the project's own edge-function
logs, the slot through `available-slots`, the request card on Today, Accept,
the reschedule and the cancel from the receipt page.

**THE DEFECT: `ReferenceError: modeLimit is not defined` — a white screen on
step 4 for every business offering only ONE of mobile and drop-off.**
`StepLocation.jsx` was passed `modeLimit` by `BookingPage.jsx` and never
destructured it; the only branch that reads it is the one a single-mode
business renders. **Live on `main` since 2026-08-31 (`1ed5084`, roadmap
2.8c).** For such a tenant it is a total booking outage — the form dies at the
address step and the customer meets the error boundary. Nobody had seen it
because **the demo enables both modes**, so the branch was unreachable by every
script, every screenshot and every sweep. The seeded mobile-only tenant
(`demo-riverside`) existed the whole time and nothing walked it.

**The same line hid the feature's other half.** `both` was computed inside
`StepLocation` WITHOUT `modeLimit`, while `BookingPage`'s own `bothModes`
includes it and feeds the step's heading. So a business with both modes on and
a service that allows only one got the narrowed heading over two choice cards,
and the *"Ceramic Coating has to be done at our place"* line that file was
written to print was **unreachable in every configuration that did not crash**.
Roadmap 2.8c built that message; it had never once been on screen. One-line
fix covers both halves; verified by hand on a temporarily narrowed demo
service, then restored.

**The second finding: the demo was mailing a parked domain.** `contact_email`
was `demo@detailplatform.com` — a SIGN-IN reused as a MAILBOX.
`notification_emails` is empty, so every owner alert fell back to it, and that
domain belongs to somebody else and has **no MX record**. `send-email`'s
undeliverable-domain guard let it through because the domain looks ordinary, so
every booking on the demo asked Resend to deliver mail that could only
hard-bounce — against the same sending reputation that carries Andrew's real
customers' receipts. Now `demo@example.com`, which is reserved and IS in that
guard. Fixed in `seed-demo.mjs` and on the live demo row.

**What is now proven, and how far.** Both loops are green: the price bar equals
`total_price`, a `pending` request holds its slot (roadmap 2.12's
established-by-not-writing-it constraint fact, now checked from outside the
schema), Accept turns it into a job, the job is findable in the calendar's
history, the reschedule frees the old slot and takes the new one, the cancel
gives it back, no console errors. **The emails are proven to the PROVIDER, not
to an inbox** — the customer address is Resend's `delivered@resend.dev`
simulator, so the send genuinely posts to Resend and a non-2xx fails the run.
Whether a mail client renders it is `send-test-emails.mjs` plus a person, which
2.18 did on 2026-09-03.

**ONE GAP LEFT OPEN ON PURPOSE.** No seeded business has a service that narrows
the mode, so the message above is still rendered by nothing automated. Seeding
one is two lines — but it puts a new sentence on step 4, which has 39px spare
at 392 (W16), so it needs a `sweep-booking-steps.mjs` re-measure and belongs
with the next change to that step's budget.

## 7. WHAT I'D DO NEXT (payoff ÷ effort)


**THE HEADLINE, 2026-09-02: ROADMAP 2.11 AND 2.12 ARE BOTH CLOSED.** All seven
stages of 2.11's step 6 are built — the shell and Today, the job record, the
calendar, Money, Clients, Business with its twelve settings screens behind two
doors, and first run — and **2.12 filled the accept slot 2.11 designed and left
empty**: a booking can now be a REQUEST the detailer accepts, declines or
quotes, and both modes hold the slot. See §6w, which ends with **three questions
standing for the owner**. **The next unchecked item is 2.5**, the booking smoke
test — and note that `scripts/e2e-booking.mjs` does not run (it hardcodes a
Linux Playwright path from a container that no longer exists), so that item
either repairs it or writes the check fresh.

**ROADMAP 2.18 IS CLOSED (2026-09-03).** All twelve emails rebuilt, wired,
sent to a real inbox, and corrected after he opened them — §6x, §6y, §6z,
§6z-ii and the light-first correction below them. **The next item is 2.17,
motion as a house style**, which he has now raised three times. What survives
2.18 is owner-side or time-side rather than code: the root SPF record, a DMARC
`rua=`, `formatDateLong`'s hardcoded `en-US`, a separate Resend account for the
platform, and his verdict on the light-first sends in Gmail dark mode.

**HOW IT WENT, FOR THE RECORD.** He asked for the
emails deleted and rebuilt from scratch, and for the research first. **Step 1
is done** — `docs/email-research-2026-09-03.md`, §6x here — **and he has since
answered, overruling two of its recommendations: §6y.** "Premade templates"
means a **block EDITOR**, not prewritten wording; reminders have **no cap**;
and he rejected the existing look outright, correctly. **THE LOOK IS APPROVED — *"Also it looks
good"* — AND THE EDITOR IS SCRAPPED, both 2026-09-03: §6z.** *"scrap the custom
email editor thing / make it a lot more simple"*, which reverses his own idea
from one message earlier and **cost nothing, because the session had stopped at
two rendered templates and never wrote an editor.** Reminders: **two, the second
off by default** — he delegated the number. Client compatibility is researched
(`docs/email-clients-2026-09-03.md`): **the dark design holds**, and it forced
three changes plus turned up a defect that is not about dark mode at all —
**every email is sent HTML-ONLY, with no plain-text part.**
**AND THE PORT LANDED THE SAME DAY (§6z-ii).** All twelve templates are
rebuilt, the old ~530-line file is gone, all eight edge functions send them,
every email now carries a plain-text half, and **the invoice's column reaches
its own total for the first time** — structurally, through `reconcile()`.
`email-brand` is **186 checks** and its three source-shape checks were
re-pointed deliberately. **What is left is the settings surface and the
reminder schema** — plus the one claim nothing here can make yet: **no email
has been opened in a real client.**

0. ~~**Start Phase 2.1 — the public booking page.**~~ **DONE 2026-08-30.**
   ~~**2.2, the marketing/landing page.**~~ **DONE 2026-08-30** — ported from
   the approved reference rendering, `?lite=1` built at the app root, and the
   contrast/composition tests grown to cover the shipped stylesheets.
   **2.3, the dashboard — BUILT, REOPENED, AND CLOSED, 2026-08-30.** The
   restyle is done and committed (five tabs, eleven settings screens, the
   light-theme removal, five font families down to two, the theme-color meta,
   and four deletions the system forced). The owner then looked at it and sent
   three things back; **all three are now done and verified in a real
   browser** — the load-in is faster (last element settles at 580ms, down from
   1160ms), the dashboard takes the tenant's accent colour, and the
   four-width/console/`?lite=1` routine ran again plus a crimson / violet /
   gold / slate retint sweep.

   **Three defects were found on the way, all fixed:** the accent was
   corrected against the wrong ground (`--ink-0` guaranteed a floor only on
   `--ink-0`, leaving six of eight presets under the text floor on a panel —
   now `--ink-3`); stale tenant state survived sign-out, so the last
   detailer's colour stayed on the sign-in screen; and the sheet backdrop was
   running the screen's reveal animation instead of its own, because it sits
   inside `.app-main > .group` and lost the cascade. `scripts/shoot-dashboard.mjs`
   also could not sign in at all — it kept the pre-`1f3f945` password.

   **The one open question was answered the same day, the other way, and
   then BUILT on 2026-08-30 in roadmap 2.4.** Crimson corrected for text is
   `#E55B5B`, ΔE 11.4 from the error colour `--bad` `#E2705F`. The
   recommendation was to drop Crimson; **the owner said no, because a lot of
   detailers' colour is red** — and he was right for a reason nobody had
   measured: red is **48% of a 46-brand car-care sample**, twice blue. Dropping
   Crimson would not have worked anyway (a deep red from the custom picker
   lands at ΔE 8.5, closer), and the collision was never red-only (a *silver*
   accent hits the "booked" ring at ΔE 8.5 as well). **Do not re-propose
   dropping red on rediscovering the 11.4.** What actually fixed it is in §6c.

   **THEN HE WALKED THE WHOLE PRODUCT** on a phone and on desktop and left
   about twenty-seven items. Verdict on the design itself was positive
   (*"I really like the design"*); everything is refinement. It is all in
   `docs/owner-walkthrough-2026-08-30.md` and split into roadmap 2.6
   (clipping/spacing), 2.7 (features, organised around his rule that every
   booking step should fit without scrolling) and 2.8 (research how other
   detailers work).

   **2.6 IS DONE — 2026-08-31.** All eight clipping-and-spacing items closed,
   each reproduced at 392x844 in a real browser first. Three things worth
   carrying forward. **(a) The emulator caveat cuts both ways:** W14 does not
   reproduce headless because `Share` needs `navigator.share`, which Chrome on
   Windows has and a headless browser does not — reproduce what HIS browser
   rendered. **(b) W24 was real but not where 2.6 said to look** — it was
   `.bk-card.selectable:hover` on the CUSTOMER booking page, and his rule is
   now design-system law 15. **(c) A live contrast defect was found underneath
   it and fixed at the root** — see §4, "the dashboard's text moved again".
   Every dashboard screen, every settings sheet and the booking page are now
   swept clean at 392 AND 360 for both clipping and touching boxes. **320 was
   not clean and became roadmap 2.9**, with the failures measured; **2.9 is
   done 2026-08-31 (§6g) and 320 is now part of the default sweep**, so
   PRODUCT.md's "responsive 320→1440" is a claim the product keeps.

   **2.7 IS DONE — 2026-08-31 — EXCEPT THE FIVE THAT WAIT ON 2.8.** W1, W2,
   W3, W4, W5, W6, W16, W17, W18, W19, W20, W23 and W26 are closed; W9, W10,
   W21, W22 and W25 are deliberately unbuilt, because each decides a SCHEMA
   shape that 2.8's research exists to fix and the roadmap already sequences
   that research first. Five things to carry forward.

   **(a) W16 got an instrument, and it is the definition of done.**
   `node scripts/sweep-booking-steps.mjs` walks the booking flow at all four
   verification sizes, fills it in as a customer would, and reports the
   overflow AND the spare room per step; `--lite` does `?lite=1`,
   `--shots=DIR` saves PNGs. Baseline was 8 of 12 step-views overflowing,
   worst 222px. All fit now, both paths. **(b) THE CEILING IS STEP 1 AND IT
   IS THE TENANT'S.** Steps 2–7 have 90–500px spare; step 1's height is the
   detailer's catalogue, and with the demo's four services it has 18px of
   room on a phone and ONE PIXEL at 1440x900 — a fifth service breaks both.
   Do not shave gaps to buy room, and do not buy it by hiding tenant content
   either (that was tried with the tagline and rejected); the lever is W21,
   which waits on 2.8. **(c) 1440x900 was the only
   size that failed once both of HIS were clean** — the short screen, 180px
   less height than 1920 carrying the same desktop masthead. The four
   verification widths are four SIZES. **(d) W1 was not where the roadmap
   pointed**: the calendar cell has been a whole-box `<button>` all along, and
   the box he meant was one of the three cards inside the day panel. **(e) W4
   and W6 each turned up a live defect underneath the feature** — a
   drop-off-only day was a note the booking gate never read, and the Money
   chart drew a $189 loss identically to a $189 win. Both are in DECISIONS.md
   → "Roadmap 2.7".

   **2.4 — DONE 2026-08-30, see §6c. All of it.** Twelve evidence-built
   presets, a hue-family classifier that explains an arbitrary colour in words,
   and a form-first status vocabulary that holds for ANY accent. The owner
   corrected the framing mid-session and that correction is now law 11b: **the
   accent is identity, never meaning — paid is always green.** The last piece,
   the customer manage page's composition, closed the same day: four identical
   full-width pills became one group with three weights.
1. ~~**Fix email.**~~ Done and proven 2026-08-29 — see §5. The next-highest open thread is now the reminder scheduler (item 2).
2. ~~**Wire the reminder scheduler.**~~ Done and proven 2026-08-29 — see §5. HANDOFF thread #2 is closed.
3. ~~**Delete the pre-conversion junk.**~~ Done 2026-08-28 — roadmap 0.1.
4. ~~**Resolve the deploy question.**~~ **DONE 2026-08-30** — Netlify auto-publishes `main` on push; proven by pushing it and watching the live site change with nothing else done. See DECISIONS.md.
5. ~~**Roadmap 2.8 is now the gate on five walkthrough items, not three.**~~
   **DONE 2026-08-31, AND THE OWNER ANSWERED — see §6d.** The five builds are
   unblocked and specified: one migration, written out in full, plus a build
   order in `docs/detailer-research-2026-08-31.md`. **Start with W21's
   disclosure** — it is the only item that takes height OFF step 1, and his own
   menu overflows it by 119px until that is done.
   ~~**Start with W21.**~~ **ALL FIVE ARE BUILT — 2026-08-31, roadmap 2.8b.
   See §6e**, and read the three corrected numbers there before quoting any
   spare-room figure from §6d.
6. **THE OWNER OPENED A NEW ONE ON 2026-08-31 AND IT OUTRANKS THE FIVE BELOW:
   roadmap 2.10, rethinking the dashboard's architecture from scratch.** His
   point is that the five bottom tabs and the eleven sheets behind More are a
   copy of the admin page he built for his own business "not with much thought
   into it", and that the product needs the layout a detailer would want, not
   the one Andrew happens to have. **The LOOK is not reopened** — the design
   system and the skill-collision rule stand; what is reopened is where things
   live. It is research-then-approve-then-build, like 2.8 → 2.8b, and his
   words are quoted in full in the roadmap item. Several of the five deferred
   items below are decisions this one would make anyway.
   **THE RESEARCH AND THE PROPOSAL ARE DONE — 2026-08-31, see §6h.** It is at
   step 5 of its own five: **five decisions are waiting for him** at §5 of
   `docs/dashboard-architecture-2026-08-31.md`, and nothing in `app/` changes
   until he answers. Clients sort/filter (item 7 below) is folded into that
   proposal and should not be started separately before he replies.
7. **The five deferred dashboard items** (calendar week view, Clients sort/filter with lifetime value, demote quoted-vs-on-site, Hours multi-glow, calendar cell weight) — agreed non-blocking, but Clients sort/filter is the one owners will hit daily; do it first of the five.

## ROADMAP 2.17 — MOTION AND SHAPE AS A HOUSE STYLE (2026-09-03)

**BUILT, except one thing that is the owner's call.** He asked for this three
times — 2026-09-01, confirmed 2026-09-02, and asked again on 2026-09-03
whether the missing animations were just a stage not reached yet. They were.

### What a cold session needs to know first

1. **The rule now lives in `docs/design-system.md` § Motion**, with his quotes
   in full, and the budget in `docs/dashboard-skeletons.md` §4 was grown to
   match. **The system file was changed BEFORE any code**, which is the
   sequence CLAUDE.md requires and the roadmap named explicitly.
2. **`.split > .col-2` is the whole retrofit** — one selector, `column-in` /
   `column-out`, 14px on X at `--t-exit` (180ms) on the one curve. It covers
   the job record, the client record, the settings column through both doors,
   the calendar's day panel and every screen's resting second column.
3. **`hooks/useLeaving.js` is the exit**, used by `RecordHost`,
   `SettingsHost` and `Calendar`. React unmounts, so an exit is a delayed
   unmount. **The 180 lives there and nowhere else** and
   `tests/composition.test.mjs` 8c-i pins it against `--t-exit`.
4. **`--corner: squircle` in `theme.css`**, paired onto every `--r-panel` /
   `--r-inset` corner and onto **no pill, dot or ring**.
5. **The one open thread is the 1440 calendar reflow** — roadmap 2.17, the
   block marked ⚠. Everything else in the item is done.

### The audit was a measurement, and that is the transferable part

`document.getAnimations()` on the live dashboard at 1920, **120ms after each
click**. Not the stylesheet — this repo has shipped two animations that were
dead in the cascade and looked exactly like finished screens (Today's whole
arrival in step 6, another in stage 3), so a selector is not evidence.

It found **five** things arriving with nothing but the ground's 54-second
drift, where the roadmap had named three — and **one thing the roadmap listed
as broken that was already fine**, the gear, which renders a `.split` under
`.app-main` and is caught by the screen's own stagger. *A defect list written
from reading is a list of hypotheses.*

**The fifth was the one nobody had named**: every desk screen staggered its
LEFT column in and left the right one sitting there, on first paint as well as
on open. That is why one selector closes the whole list — they are one object,
the thing beside the list.

### The calendar was the wrong element moving

His words were *"it's almost like I refresh the page when I click on
something."* Literally what the code did: `Calendar.jsx` rendered `.group`
with nothing open and `.split.calday` with a day open, so React discarded the
month subtree and rebuilt it. `arrive` re-ran on the whole left column — the
thing he was already looking at — while the day panel he had just asked for
animated not at all.

**Fixed with a stable container, not a nicer animation.** The wrapper renders
at every desk width; `.split.calday:not(:has(> .col-2))` collapses it to
`display: block` when nothing is open, which is the idiom `.split.clients`
already used. Proved by stamping the `.cal-grid` node before the click and
finding the stamp afterwards.

### Three defects the measurement caught that reading would not have

- **A `:has()` may not contain another `:has()`.** The widening rule was
  written `.app-main:has(> .split.calday:has(> .col-2))`, which is invalid, and
  the browser dropped the whole selector **in silence**: the grid split
  correctly and the page never widened, so at 1920 the month went to 696px
  instead of gaining room to 1,236px. *An invalid CSS rule looks exactly like a
  satisfied one.* Pinned by check 8d-iii.
- **Two `<aside>`s in one slot are RECONCILED, not remounted.** The open
  settings screen and the resting content are both
  `<aside class="col-2 settings-col">` in the same position, so React swapped
  their children and the entrance never fired — while the gear's resting
  column, three lines away, animated correctly. Keyed apart. Same family as the
  `.card.attend` rename: the right element, silently meaning something else.
- **Pressing the open day again toggles it closed**, down a path that called
  `setDay(null)` directly and skipped the exit.

### The squircle: one token, and the honest cost is Safari

`corner-shape: squircle`. **Measured 2026-09-03** from `api.webstatus.dev` and
MDN's browser-compat-data, not assumed: **Chrome / Chrome Android / Edge 139+**
(shipped 2025-08-05); **Safari no** (Technology Preview only); **Firefox no**;
Baseline **limited**.

It is **additive** — an unsupported browser draws the `border-radius` already
there — so there is no fallback, no feature query and no second corner
language. **The cost the owner has to accept: he sees squircles at a Chrome
desk and not on his iPhone**, because every iOS browser is WebKit. It resolves
itself when WebKit ships, with no release from us.

**Both alternatives are worse and one of them is non-obviously worse.** A
Houdini paint worklet is **Chromium-only too** (Chrome 65+, never Firefox
bugzil.la/1302328, never Safari webkit.org/b/190217) — a JS paint pass per
element to reach *exactly the same browsers as the free property*. **Do not
re-propose it on rediscovering that `corner-shape` is Chromium-only; that is
the same fact.** An SVG mask is the only route that reaches Safari, and it
clips the 1px `--hairline` this system draws on nearly every surface, so it is
a border rewrite as well as a corner one.

**Panels and insets only.** A superellipse at a 100px radius is a lozenge and
at 50% a blob — every pill, dot, ring, avatar and spinner would change shape.
Verified live: `.card` and `.sunken` compute `squircle`, `.btn` and `.tabbar`
compute `round`, and with every animation frozen the corner crop still differs
from the `round` one, so it is genuinely rasterised.

### What was verified

- **`document.getAnimations()` re-read after the change** at 1920 and 1440:
  every one of the five now reports `column-in` on open and `column-out` on
  close, and the month's DOM survives a day click.
- **`node scripts/sweep-widths.mjs --all`** — clean at 1920, 1440, 392, 360,
  320 (352s). `--all` rather than the tiered default, because this change
  touches `theme.css` and `SettingsHost`, which is exactly the shared container
  the tiering bets is uniform.
- **`tests/composition.test.mjs`** grown from 26 to **41** checks (test 8, 15
  new), **every family baselined both ways** — each deliberate defect fails
  exactly one check and the file is clean again after restore.
- The rest of the credential-free suite: `design-contrast`, `landing-pricing`,
  `route-contract`, `money-export`, `email-brand` (189), `client-list` (31),
  `setup-progress` (24), `accent-sweep`, `render-emails` — all pass.
- Console at every width: only the two pre-existing React Router future-flag
  warnings. No new errors.

### ⚠ THE ONE OPEN THREAD — the 1440 calendar reflow, and it is his decision

At **1920 nothing is lost, and the fix improved it**: opening a day takes the
month from 1,144px to **1,236px** — it gains room and keeps its written-out
cells. At **1440x900** it goes **1,144px → 836px** and `writes` flips off at the
1,640 rule, so cells go back to dots.

**A third option was tried before putting his two back to him, and it died by
measurement.** Lower the 1,640 threshold so the month keeps its words at 1440
with a day open: built, screenshotted, rejected **by looking**. At 836px a cell
is 115px and the lines render `8:00 AM Mar…`, `9:45 AM Da…`, `12:15 PM Pr…` —
the time survives and the name does not, which is worse than a dot because it
reads as data rather than as a mark. **`text-overflow: ellipsis` means no
overflow check can ever see this**; the only instrument is a screenshot
(`shots-2.17/1440-calendar-day-WORDS.png` against `-marks.png`).

So the roadmap's (a) and (b) stand, **and the remount — most of the
"refresh the page" feeling — is gone from both.** The recommendation given to
him is **(b), do nothing**: the complaint was the disappear-and-come-back, and
(a) would trade a transition he may no longer notice for content he explicitly
said was useful.

### ⚠ THE SECOND OPEN THREAD — does the LANDING page join the squircle

The dashboard and the customer's booking page are squircled. **The marketing
page at `/` is not, and that is deliberate rather than missed.**
`landing.css` and the approved reference rendering
(`docs/design-directions/5-the-thread.html`) use **literal pixel radii** — 16,
13, 11, 18, 100, 50% — and no radius tokens at all. So unlike the other two
surfaces there is no one token to change: it is roughly twenty hand edits, and
the reference rendering has to move with them or CLAUDE.md's *"where the
document and that page disagree, the page is right"* starts pointing at a page
that no longer matches the system.

**A different-sized decision from a token, so it was raised rather than
taken.** His phrase was *"a keynote for the entire site"*, which probably
includes it — but it is the artifact he approved pixel by pixel.
**Recommendation: do it, in its own small item** — the two-corner-languages
argument that put the corner on `booking.css` applies to `/` just as well, and
a visitor who presses *Get started* crosses from one to the other in one click.

### And one thing fixed on the way that is not roadmap 2.17

**`scripts/sweep-booking-steps.mjs` had been passing by luck.** It walked
calendar days by INDEX against a live locator, and choosing a day re-renders
the calendar, so it gave up after ONE day the moment that day had no slots —
which it never did while the demo's own trading day was open. It began failing
at ~22:00 local and looked exactly like the CSS change under test. **A control
run with that change reverted is what proved it innocent, and it should have
been the first thing tried rather than the fifth.** Fixed (days addressed by
date, the grid waited for before it is read), plus `SLOTPROBE=1`. Full write-up
in DECISIONS.md → *The booking sweep had been passing by luck*.

## ROADMAP 2.17, SECOND PASS — THE OWNER WALKED IT (2026-09-03)

He went through the retrofit on his own machine and gave a punch list. Most of
it he liked — *"a lot of stuff kinda has that nice animation that you added, so
that's good"*. Four things were wrong and all four are fixed.

### HIS MONITOR CLOSED THE OPEN QUESTION

**27" at 1080p, so 1920x1080** — worth writing down, because half the layout
decisions in this repo turn on it. The 1440 calendar reflow was handed to him
as a decision; he answered it sideways: *"when I go to the calendar, I see the
names just fine."* That is the 1920 case, where the month **gains** width when
a day opens. **Left as it is, which was the recommendation.**

### A SWAP IS A THIRD KIND OF MOTION

The first pass covered a screen ARRIVING and a thing OPENING and missed the one
he cared most about: *"if I switch between one booking and I click another one,
it just instantly changes… **the GUI kind of doesn't really change, but the
actual text inside of it changes**."*

**That clause is the definition.** Nothing arrived and nothing left. `.swap`
plus a React `key`: opacity and a 4px blur at `--t-exit`. It **dissolves**
rather than travels, because nothing moved.

**IT OVERRULES A DECISION FROM EARLIER THE SAME DAY.** The retrofit skipped the
exit on replacement so as not to put 180ms between a tap and the thing tapped
for. Right about the CONTAINER — the panel still does not leave and come back —
and wrong about the CONTENTS.

Three sites, all named by him: the job record, Money's period figures, the
Clients list.

### THE THING A COLD SESSION WILL GET WRONG

**A SWAP MUST NOT BE A DIRECT CHILD OF `.col-1`.** The arrival selector is
`.app-main > .split > .col-1 > *` at (0,4,0) and beats `.swap` at (0,1,0), so
Money re-ran `arrive` on every period change — a 420ms staggered lift, which IS
the *"page refresh thing"* he was complaining about.

**AND DO NOT FIX IT WITH A SPECIFICITY OVERRIDE.** That was tried. It won the
cascade and broke a different law: on first paint the swapped blocks dissolved
in 180ms while their siblings rose over 420ms, so the screen arrived at two
speeds with its tail landing EARLY. **The fix is MARKUP** — nest the swap in a
wrapper so the outer element keeps its arrival slot. `composition` 8e-iii holds
the cascade half and 8e-iv the markup half, per site.

### THE MONTH TRAVELS WITH THE PANEL

Killing the remount was necessary and not sufficient: *"the calendar, like,
instantly shifts over with a quick snap… the out animation is good, but the
calendar just snaps back into place."*

Measured at 1920: opening a day moved the month **270px left** and grew it
**1,144px → 1,236px** with no transition. `.app-main`'s `max-width` and
`.split.calday`'s track list now carry it, both at `--t-exit`. **`display` is
not transitionable**, so the closed state is a **0px second track** rather than
`display: block` — which is why check 8d-ii was re-pointed at the invariant
instead of the old spelling.
**Both ends key on `:not(.leaving)`** so closing is one 180ms gesture, not
180ms of panel followed by 180ms of month.
**Known artifact, measured and accepted:** the panel's heading re-wraps over
the last ~20px of the open — 18ms at real speed, visible only at 10x. Both
alternatives are worse.

### WHAT BASELINING FOUND, AND IT IS THE MOST REUSABLE PART

Every new check was mutated to prove it could fail. **Four things could not.**

1. `src.includes("swap")` was satisfied by the word *swap* in the comment
   explaining the swap — a check whose only subject was its own documentation.
2. and 3. Two `||`s across independent subjects: unwrapping one Money site left
   the other answering for it. ***An OR across independent subjects is not a
   check on either of them.***
4. **The baseline harness itself.** Written as bash, it `cp`-ed to Git Bash's
   `/tmp` while native Python read a path that does not exist — so every
   mutation silently failed to apply and every run reported a clean pass.
   **A baseline harness that cannot fail is the exact defect it exists to
   catch.** Rewritten in one language; every mutation now asserts it changed
   the file before anything runs.

**And a raw backspace (0x08) got into a regex through a shell heredoc for the
SECOND time in this repo** — CLAUDE.md already records that trap from 2.18 and
it happened anyway, because `\b` in a bash heredoc is a backspace rather than a
word boundary, and it is invisible in every editor. **The rule that actually
prevents it: do not write patches through heredocs.** Everything after that
point was written to a file and applied with Python.

### VERIFIED

- `getAnimations()` at 1920 on all four complaints, before and after.
- Money and Clients **first paint** re-measured after the wrapper change:
  `arrive` at 0/40/80/120ms, one stagger, no two-speed arrival.
- Slow-motion capture at 10x for the calendar travel and the dissolve, because
  a Playwright screenshot costs longer than a 180ms transition and cannot catch
  the middle of one otherwise.
- `composition` 26 → **57**, nine mutations each breaking exactly its own check.
- Full `--all` sweep and `--lite`, five widths; the booking gate.

### ✅ THE DISSOLVE WAS REJECTED AND HAS BEEN REPLACED (2026-09-04)

**Read this before touching anything about the content swap.** The owner looked
at the dissolve on 2026-09-03 and turned it down flat:

> "The dissolve that you created is horrible in the terms of… it just looks
> like a page refresh. **And I'm sorry if I steered you to that. I wasn't
> trying to.** … Same with it today when I switch it. It's, like, this kind of
> harsh fade in… **it doesn't look fluid**."

**THE TRAP, WHICH IS STILL LIVE: his own earlier words are what produced it** —
*"maybe, like, a little dissolve or a blur"* — and that sentence still appears
in `docs/roadmap.md`, `docs/design-system.md` and `DECISIONS.md`. **Every
surviving copy now carries the retraction beside it**, deliberately rather than
being deleted: a deleted retraction is how the idea gets re-derived from a
fourth file nobody thought to check. **A session that finds the earlier quote
and not the withdrawal rebuilds the rejected thing and can cite him for it.**

**He also declined to specify the replacement, on purpose**: *"I'm not gonna
give you an animation idea. You should figure out the animation idea."* He
floated *"text that went down and faded up"* and withdrew it in the same
sentence — a second hint he took back, not a spec.

#### The diagnosis it was designed against, which is the reusable half

**A page reload IS a whole block changing opacity at once.** A uniform
cross-fade of a content block therefore reproduces the optical signature of a
reload no matter how brief it is or what filter rides along. **The fault was
the UNIFORMITY — not the duration, and not the blur**, even though the blur is
the thing his hint named and the duration is what an instinct reaches for.
Designing against the COMPLAINT would have produced a shorter dissolve: the
same defect in less time, defensible against every word he said.

The corroboration was already in the repo: **every motion he has approved moves
its parts on different timelines** — the arrival staggers 0/40/80/120/160ms,
the day rail staggers inside itself. **Nothing he likes fades as a flat plane.**

#### What is in the code now

**`.swap` carries no animation at all** — it is a marker plus a React `key`,
and the key is what mounts new children so their animation runs. **`.swap > *`
runs the screen's own `arrive`** (opacity + 14px on Y) for `--t-exit`,
staggered **20ms**, capped at **160ms**, tail settling at 340ms.

**No new keyframe, duration, distance or property**: 14px is `arrive`'s, 180ms
is `--t-exit`, 20ms is the day rail's step, 160ms the arrival's ceiling. The
product now has **one entrance shape at three scales** — screen 420/40, rail
420/20, a block's parts 180/20. **The blur is gone and law 4 goes back to
transform-and-opacity-only**; the rejected version was also the one that needed
a law bent for it.

**The ladder runs eight deep rather than five**, which is the only number not
simply borrowed: most of the Clients list sits below the fifth row, so a cap at
five would leave the majority of it moving as one plane.

**Two surfaces, three sites, unchanged from before:** the job record
(`RecordHost`, reached from Today *and* the calendar), Money's period figures
and its ledger, the Clients list.

**`composition` is 61.** 8e-i-b fails on **any** rule targeting `.swap`, which
is stricter than the defect on purpose — the flat plane coming back would
arrive looking like a tidy-up, one selector instead of ten. 8e-vii counts
DISTINCT delays, because a stagger that collapses to one beat is a uniform fade
wearing ten selectors. 8e-viii holds the action bar's opt-out and 8e-ix pins
BOTH halves of the chart fix, because a CSS-only edit there would silently kill
the first-paint rise as well. Nine checks baselined both ways with a Python
harness that asserts each mutation changed the file first.

**THEN IT WENT THROUGH `impeccable critique`, WHICH FOUND TWO DEFECTS THE CLEAN
MEASUREMENT COULD NOT.** A clean `getAnimations()` reading tells you what IS
animating, not whether it SHOULD be — that is the whole value of the pass.

- **The pinned action bar was animating.** `.jobbar` is a child of
  `.record-body`, so it was inside the swap: six buttons pixel-identical
  between any two jobs, travelling 14px on every switch, on the record's
  primary tap target. `RecordHost` already pulled the CLOSE BUTTON out for
  exactly this reason. **Furniture opting out is the rule's other half, not an
  exception** — a swap means *the words changed*, and static chrome behaving
  like content is the purest page-refresh tell there is. The test for the next
  one: would this control be pixel-identical in the record you came from?
- **Money's chart is fixed, not accepted.** It had been recorded as
  measured-and-left at 620ms because no SELECTOR can separate a swap from a
  first paint. True of CSS, and three lines of `Money.jsx` can see it — which
  is not a reason to ship the one defect on the one screen he named. The chart
  still takes its beat as a `.swap` part; what stops is the second animation on
  top of the first.
- **The flag's first version was correct-looking and did nothing, and this is
  the reusable part.** Recomputed per render it went true, then FALSE on the
  very next render — the reload finishing sets `refreshing`. The class went on
  and straight back off, and **removing `animation: none` from a live element
  STARTS the animation.** Plausible code, unchanged behaviour, the class gone
  before the DOM could be inspected, and only `getAnimations()` able to see it.
  Latched per period now.
- **The ladder's justification was overclaiming** (`ROW_CAP` is 200, so eight
  beats leaves a majority sharing one too). The cap is a budget — the TOP of a
  list cascades — and it stops at eight because 160ms is the arrival's own
  ceiling. Wording corrected, number kept.

**Left on purpose:** the blank tail (up to 160ms at the bottom of a switched
record) is what the screen's own arrival already does; and switching faster
than ~150ms restarts the keyframes, which was equally true of the dissolve and
cannot be fixed without abandoning the remount that makes a swap a swap.

**And `theme.css` had claimed since the chart was written that a month switch
snapped, deliberately.** That was never true. It is now, and the comment says
so.

**Verified:** `getAnimations()` at 1920 and again at 1440 on all three surfaces
— record: **14** parts at 0…160 with the pinned bar sitting still, and no
`column-in`; Money 0/20/40/60/80 and 0/20/40 with **no `bar-rise` on a switch
and six on first paint**; Clients eight rows at 0…140. Nothing running at 440ms
on any of them. Frame-stepped by pausing and seeking, showing the record
filling top-down at 90ms rather than fading as a plane. `?lite=1` renders the
end state, sampled every frame. Horizontal overflow sampled every frame:
never. Full `--all` sweep clean at five widths and `--lite` clean; nine
credential-free suites, `accent-sweep` and `qr-scans` all pass; the mechanical
design detector reports zero findings on all three changed files; zero console
errors across every run.

### ⚠ STILL WITH THE OWNER: the landing page's corner (asked 2026-09-03, measured 2026-09-04)

The dashboard and the customer's booking page are squircled; **the marketing
page at `/` is not**, and that was raised rather than taken because
`landing.css` and the approved reference rendering
(`docs/design-directions/5-the-thread.html`) use literal pixel radii and no
tokens, and the reference page is the artifact he approved pixel by pixel.

**Now measured, so the ask is a number.** The two files hold **27
`border-radius` declarations each with identical value profiles** — six `100px`
pills, four `50%` dots, one 3px bar, four `inherit`, and **twelve real
panel/inset corners**. So it is **12 pairings in each of two files** plus a
`--ld-corner` token beside them, matching `--corner` and `--bk-corner`.

**Two complications a token pass would have shipped as defects**, and neither
is visible from a list of radii: `.ld .litcard::before` takes
`border-radius: inherit` and **`corner-shape` does not inherit**, so the card's
own highlight would stay a round rect inside a squircled card; and
`.ld .vsrow.mine` reveals through `clip-path: inset(… round 13px)`, which
**`corner-shape` cannot touch at all.**

**He was sent a side-by-side of his own hero card, rendered both ways at 1920**
by injecting the property at runtime — no file was changed. Nothing has been
built. See `docs/roadmap.md` 2.17, last block.

### Found in passing 2026-09-04, FIXED 2026-09-04 as its own item: reduced motion was read once

`app/src/main.jsx:32` reads `prefers-reduced-motion` **once at boot** and adds
`.lite` to `<html>`. There is no `matchMedia` change listener, so **somebody who
turns reduced motion ON while the dashboard is open keeps every animation until
they reload.** The product's own accessibility floor (PRODUCT.md) says
`prefers-reduced-motion` collapses all animation, and that claim is only true at
load time.

Pre-existing, unrelated to the swap, and roughly four lines to fix
(`.addEventListener("change", …)` that toggles the class). **Left alone by the
2.17 session because a session owns one roadmap item**, and recorded here so it
is not rediscovered as new. Found by review, not by a test — nothing in the
repo can see it.

**FIXED THE SAME AFTERNOON, IN ITS OWN SESSION AND ITS OWN COMMIT** —
`main.jsx` toggles `.lite` from a `matchMedia` change listener now, with
`?lite=1` read ONCE into its own constant as a manual override the media query
can never take away. **That constant is the load-bearing half and it is not
decoration**: re-reading the URL inside the listener toggles correctly on the
media query and still passes a naive test, while quietly making the system
setting able to clear a state somebody chose by hand. `composition` 9a-ii pins
the constant, not just the listener, for exactly that reason.
**The paragraph that used to sit here said the fix had "appeared in the working
tree" from outside the 2.17 session. It had not** — `main.jsx` was still
read-once at HEAD and in the tree when this session opened it, so that note
described a change nobody had made. A note that reports work as already done is
worse than no note: the next session skips the item. Verified before rewriting
it, which is the only reason it was caught.

**AND THE STYLESHEET RULE NOW HAS TEETH.** main.jsx's header, theme.css
§ DEGRADATION, booking.css and landing.css all state that
`prefers-reduced-motion` is handled in JS and never as a second `@media` block
— and until this item that rule was enforced by NOTHING, which is precisely the
comment-only rule its own wording warns about. `composition` 9b asserts the
at-rule is absent from all three stylesheets. **It strips CSS comments first,
and skipping that is not a detail**: the first version failed on all three
files by matching the prose that documents the rule.

**IT WENT IN AS TWO COMMITS, AND NOT THE TWO ANYONE INTENDED — worth reading
before trusting a `git log` on this branch.** When this session opened the
tree, eleven files were already modified and uncommitted from roadmap 2.17's
own work. Only `app/src/main.jsx` and `tests/composition.test.mjs` were this
item alone; `CLAUDE.md` and this file carried this fix's edits ON TOP OF that
earlier work, in the same files, and hunks cannot be split by hand here
(`git add -i` is unavailable). The commit was therefore put to the owner rather
than taken. **While he was answering, another session committed the tree it
could see** — `ebc5967`, *"Roadmap 2.17: replace the dissolve he rejected"* —
which swept this fix's DOCUMENTATION in under a 2.17 message while leaving its
CODE behind, because `main.jsx` and the test were still being verified.
**So for a window, HEAD said `composition` had 66 checks and shipped a file
with 61.** The code commit that follows closes it.
**The transferable part is not the race, it is what it looked like from
inside:** a session that had just corrected a note for reporting undone work as
done then wrote a note of its own that was falsified within the hour. **A
sentence about commit state is true for as long as nobody else is working, and
this branch has more than one session on it.** Re-read `git status` immediately
before committing rather than trusting the read that opened the session — that
is the only reason this was caught rather than committed as an eleven-file
mislabel.

**ONE THING WAS LOOKED AT AND DELIBERATELY LEFT.** `landing/thread.js` adds
`.lite` itself as a 6s load-timeout safety net and removes it on teardown, so
it is a second writer of the class. If a visitor turns reduced motion OFF in
the window where that net is holding the landing page open, the listener clears
a class the net wanted. It needs the fonts to hang AND the preference to be
toggled inside that window, and coordinating the two writers costs more
plumbing than the case is worth — recorded rather than built.
**It also cost two full `--lite` sweeps.** Editing a file under `app/src`
while `sweep-widths.mjs` is running makes Vite issue `page reload
src/main.jsx` — that file has a non-component export, so Fast Refresh bails
and the whole document reloads — and the sweep dies with *"Execution context
was destroyed, most likely because of a navigation"* at whatever screen it
happened to be on. It landed in two completely different places on two runs,
which is what a source edit during a browser walk looks like from the outside.
**CLAUDE.md's "start the long check, write while it runs" means write PROSE.
A `.jsx` or `.css` edit during a sweep invalidates the run**, and the dev
server's own log names the cause in one line: `preview_logs` / the Vite
console shows `page reload`.

### THE CORNER IS TIGHTER, AND THE TAB SWITCHER IS NO LONGER A PILL (2026-09-04)

**The owner asked for two things and they were one edit.** He wanted a squircle
that does not depend on the browser knowing `corner-shape`; and, separately,
he said what he actually LIKED when he previewed the product with a browser
extension was that the radius got smaller — *"more blocky with still being
rounded off… but not, like, super blocky, like the casual AI blocky, just a
little bit less rounded"* — and named the tab switcher specifically.

**There is no universal superellipse worth its cost** (a paint worklet is
Chromium-only too; an SVG mask clips the hairline — both were costed in 2.17
and neither was re-opened). **But the difference between a true squircle and
the plain rounded corner every browser draws is proportional to the radius**,
and that was measured by rendering one corner at 4x and counting pixels:
**34 differ at 18px, 14 at 12px, 7 at 10px, 3 at 8px.** So tightening the radii
IS the universal answer — it cuts the Chromium-only difference by **59% on
panels and 79% on insets**, with no mask, no worklet and no JavaScript.

**Shipped:** `--r-panel` 18 → **12**, `--r-inset` 12 → **8** (ratio held at
3:2), the same pair on `booking.css` in the same edit, and the tab switcher off
`--r-pill` onto its own **`--r-nav: 16px`**, buttons at
`calc(var(--r-nav) - 5px)` — arithmetic, because the bar's padding is 5px and
concentric corners have to be. **12px on the bar was tried and rejected by
looking**: at 460×54 it stops reading as an object floating over the ground.
**Pills did not move** — Apple squircles cards and keeps capsules as capsules.
`composition` 8a now covers `--r-nav`, baselined by unpairing it.

**AND THE LANDING PAGE WENT IN THE SAME DAY** — *"just do whatever is needed"* —
**which closes roadmap 2.17 entirely.** `/` had six ad-hoc radii and no tokens;
it now carries `--ld-r-panel: 12px`, `--ld-r-inset: 8px` and `--ld-corner`.
**The approved reference rendering moved in the same edit and is swept as its
own surface**, because where it and the design document disagree the PAGE is
right — a page that drifts from the stylesheet quietly becomes the wrong
authority. `composition` 8a is four surfaces, 72 checks.
**Both files were rewritten from ONE table keyed on the VALUE, not the
selector**: a selector-keyed first pass silently applied 13 of 15 edits to one
and 11 of 15 to the other, because they spell their selectors in two dialects
(`.ld .tile` against `.sunken`, spaced against minified). The rewrite asserts
exactly twelve corners per file.
**Both complications flagged when this was only measured were real**:
`corner-shape` does not inherit (the hero card's own highlight would have
stayed a round rect inside a squircled card) and has no effect on `clip-path`
(the comparison row's reveal). The second is a 3-pixel difference at 8px —
**which is exactly why it would have survived a look**, and it was caught by
reading the file rather than by screenshotting the result.

### A DETAILER NAMES THE ROLE AND TICKS WHAT IT CAN DO (roadmap 2.13, 2026-09-04)

**`business_users.role` is still two values and `owner` still means
everything.** The item's own warning was that `protect_last_owner()` is a
TRIGGER and binds even the service role; a permission set has no
last-anything, so dissolving `owner` into booleans would have taken that
trigger's subject away from it. It was left alone. What is new is that a
NON-owner membership carries **`label`** — the business's own word for the
role — and **`permissions text[]`**.

**Four permissions, and every one is a group of policies that was ALREADY
owner-only** before this item started:

| tick | what the database opens |
|---|---|
| `money` | `expenses` — the Money tab, and lifetime spend on a client |
| `marketing` | `promo_codes`, `campaigns`, `campaign_visits` |
| `settings` | `business_settings`, `business_branding`, `businesses`, `business_domains`, `message_templates` writes — **and, from the second migration, `services` (prices), `business_hours`, `blockout_dates`, the catalog, the gallery and the storage bucket** |
| `requests` | accepting / declining / quoting a booking request |

**There is no `team` tick and that is deliberate**: whoever can hand out
permissions can hand themselves every other one, and making that safe needs a
grant lattice nobody has asked for. Invites and membership stay
`is_business_owner()`.

**`public.has_business_permission(business_id, permission)` is the new
`is_business_owner()`**, and it FOLDS THE OWNER IN — `role = 'owner' or
permission = any(permissions)` — so every re-pointed policy asks one question
and no check can be written that forgets owners. `business_ids_with_permission()`
is its set form, for the storage policies, which compare a folder NAME.

**Nobody's dashboard did less the day this shipped.** `requests` is the one
permission that takes something away rather than granting it (staff have had
it since 2.12, because `respond-to-booking` uses `requireMember`), so the
migration backfilled every existing `staff` row and every live `staff` invite
with it.

**The vocabulary is closed by a CHECK CONSTRAINT** on both tables, and
`invite-user` filters the same list on the way in. A typo'd permission grants
nothing and looks exactly like one that was never ticked.

**Two migrations, and the second one exists because the first left the tick
lying.** The screen tells a detailer `settings` covers *"Prices, hours,
booking rules, branding…"*, and `services.price` and `business_hours` were
`*_tenant_all` — writable by any member since long before there were two
roles. Not reachable through the UI (staff have had no Business tab since
2.11) is not the same as not true, and RLS is the enforcement in this product.
`20260904001000_catalog_behind_settings.sql` splits ten policies in two:
**SELECT stays open to every member** — a member must read `services` to take
a booking at all — and the writing verbs move behind the tick.

**`monthly_plans` DOES NOT EXIST**, found by that migration failing on it:
created in `20260827000200_tenant_data.sql:51`, dropped nine hours later in
`20260827001000_phase2_cleanup_and_storage.sql:16`. **Roadmap 2.14 said it was
real** and has been corrected. A `create table` line is not evidence the table
is there.

**Where it shows up in the app.** `lib/permissions.js` is the single list —
the four names, their sentences, `can()`, `roleName()` and
`permissionSummary()` — with no React in it, for the same reason `setup.js`
has none. `BusinessContext` exposes `label`, `permissions` and a bound
`can(key)`. `App.jsx`'s rail is `TAB_NEEDS` rather than the old fixed
`STAFF_HIDDEN` set; `GearMenu`'s rows carry a permission name instead of a
boolean; Clients' lifetime spend is `can("money")`; DaySheet's `canEdit` is
`can("settings")`. The Team screen carries the name field and the four
switches, on a member and on the invite form, through one `RoleFields`.

**The role editor is a SWAP** — `.swap` plus a React key inside the member's
own card. The card does not move, does not leave and does not come back; its
contents are replaced, which is the owner's own third kind of motion. It cost
no keyframe, no duration, no `useLeaving` and no delayed unmount, and
`composition` 8e-iv/8e-vi hold it.

**Checks: `staff-roles` 30 → 64, `composition` 72 → 74**, and every new check
was baselined by breaking the thing it guards — the helper made unconditional
(17 failures), the constraint dropped, the request gate removed and
redeployed (3 failures), the old `services` policy restored (3 failures).
`sweep-widths.mjs` now walks the opened role editor, which is the **eighth**
time a state behind a button inside a screen has had to be added by hand.

### WHAT THE TICKS DO NOT DO — the honest limits, so nobody re-derives them

**`money` does NOT hide a job's price from the diary, and never did.**
`bookings` is member-level by design — it is the diary, which is the whole job
of a membership with nothing ticked — so Today still prints *EXPECTED $455.00*
and *$65.00* beside each job for a role with no `money` tick, and so does the
job record. **This is not a regression: staff saw exactly this before 2.13**,
and the tick's own words ("The Money tab, expenses, and what each customer has
spent") do not promise otherwise, so nothing on screen is lying. It is worth
KNOWING because a detailer may assume otherwise. **Fixing it is a product
decision rather than a bug fix** — a helper who takes payment on the day needs
the number — and it was left for the owner rather than guessed at. Flagged to
him 2026-09-04.

**A permission changed mid-session takes effect at the database immediately and
in the UI on the next load.** `BusinessContext` reads the membership once, so
a role that loses `settings` keeps the Business tab until reload — and every
row on it then reads nothing, because RLS is live. Same shape as removing a
member, which `tests/staff-roles.test.mjs` test 7 already pins ("removed
staff's existing session now reads nothing"). No crash, and no second source
of truth: the browser is never the enforcement.

**A custom role cannot invite anybody, by design**, so there is no way for a
detailer to delegate "add the new hire" without making that person an owner.
If he asks for it, the thing to build is a grant lattice (you may only give
what you hold), not a `team` tick — see DECISIONS.md → Roadmap 2.13.

### THE SWEEP REPORTED A CRASHED SCREEN AS "clean" (2026-09-04)

A one-word slip — `settings` dropped from `GearMenu`'s destructure while `can`
was added beside it — took the whole gear index down. `ErrorBoundary` caught
it and drew four short lines, and **four short lines are not past the right
edge, not outside their parent, not scrolling sideways and not stacked without
a gap.** Every check `sweep-widths.mjs` owns passed:

```
the gear                 clean
Notifications            NO SUCH ROW (gear)
```

which reads like a renamed control rather than a crash — and the run then died
forty lines later on an unrelated timeout that looked like the real fault.

`say()` now checks for the boundary's own heading before measuring anything,
prints `CRASHED — the error boundary is on screen: <reason>`, and counts it as
a problem. The reason comes from `textContent`, not `innerText`, because it
lives inside a CLOSED `<details>`. Baselined by re-breaking GearMenu.

**The general form, and it is the widest version of a lesson this repo has
already learned twice: every check this script owns is a question about
GEOMETRY, and geometry has nothing to say about whether the screen is the one
you asked for.**

A second gap in the same walk: the Notifications block finished by pressing
the header gear, which LEAVES the gear rather than going back to its index, so
the Team walk after it looked for a row on a screen it had just closed. Escape
is what `walk()` uses; the block uses it now too.

### A PYTHON REWRITE SILENTLY TURNED TWELVE SOURCE FILES CRLF (2026-09-04)

Patching the front end with `python -c "…open(p,'w').write(s)"` reads LF and
writes `os.linesep` — `\r\n` on Windows. Git's autocrlf hid it from
`git status`, and the FIRST symptom was `composition` 8e-iv failing on
**Clients.jsx**, a file this item had barely touched, because that check is a
literal `includes()` of a two-line needle containing `\n`.

Same shape as the raw backspace this repo has hit twice: an invisible byte
change that turns a green check red somewhere unrelated and points the next
session at the wrong diff. Fixed with a binary read/write; every python patch
since opens with `newline=""`. **If a byte-exact check fails in a file you did
not mean to change, `cat -A` it before reading the logic.**

## ROADMAP 2.14, STEP 1 — THE PLANS RESEARCH, AWAITING THE OWNER (2026-09-04)

**Nothing in `app/` or `supabase/` changed.** He asked for plans a customer can
sign up to and asked for the research first, by name. Step 1 is done; the item
is waiting on him for four answers before any table is created.

- **The file:** `docs/plans-research-2026-09-04.md` — tables, per-claim source
  strength, and every URL.
- **The judgment:** DECISIONS.md → "Roadmap 2.14, step 1 — plans a customer can
  sign up to".
- **The panel:** the same six 2.10 and 2.18 used — Jobber, Housecall Pro,
  Zenbooker, Square Appointments, Urable, Mobile Tech RX — **plus seven real
  detailing businesses' own plan pages** and one detailer forum thread. The
  seven pages are the primary evidence and they are what settles the placement
  question; the products settle whether the capability exists at all.

### What it found

| Question the item asked | Answer |
|---|---|
| Do the trade's booking systems carry recurring plans at all? | **Recurrence yes, plans mostly no.** 5 of 6 can repeat a job; only **2 of 6** (Housecall Pro, Urable) have a plan as an object of its own; **1 of 6** (Zenbooker) lets a customer choose a recurrence while booking; **0 of 6** sell a membership inside a booking form. Mobile Tech RX has **no customer-facing online booking at all** — its own FAQ says *"Not yet."* |
| Is the plan sold IN the booking flow or beside it? | **Beside it — 7 of 7 detailers, 5 of 6 products.** Every real plan is on its own page (`/membership`, `/maintenance-plan`). The one in-flow product is a cleaning tool selling a repeat, not a plan. |
| Is that the detailer's choice or the product's? | **The detailer's for wording, cadence and price shape** (all three price shapes appear in the sample: monthly amount, per-visit amount, percent off). **The placement should NOT be a toggle** — a second layout to build and sweep for a placement no evidence supports. |

### Four things a cold session must not re-derive

**1. The sale and the schedule are two different acts, and nobody joins them.**
Not one of the seven detailers schedules the visits at sign-up. Car Detox sells
through a checkout and then *phones* the customer; ZS takes a phone number and a
person sets up visit one; Mint members book each month themselves. **The
expensive half of the obvious design — create the next N bookings on sign-up —
is not a thing the trade does**, and `bookings_no_overlap` (a GiST exclusion
constraint, refusing at the database) would fight it anyway.

**2. WE TAKE NO MONEY.** There is no Stripe, no card on file and no payment
capture anywhere in this repo; `bookings.payment_status` is a flag the detailer
sets by hand in `FinalizeModal.jsx`. Every plan in the sample that charges,
charges a stored card. **So a plan here can be an arrangement, a cadence and a
price — never a subscription**, and a page that says *"$150/month, cancel
anytime"* while cash is still collected on the day is the travel-fee defect in a
new place.

**3. The recommended shape adds almost no machinery: a sign-up is a REQUEST.**
2.12 already built ask → hold the slot → detailer accepts, which is exactly what
the phone call does in five of the seven businesses. Recurrence becomes a
**nudge to book the next visit** on the existing owner-nudge rail, not a
scheduler.

**4. The slot is what a plan customer is actually buying, and a skip is a real
concept.** Visual bills a month ahead *"in order to reserve your scheduled
appointment"* and charges even when the car is not available; Deluxe warns you
*"run the risk of losing your date"*; ZS gives *"One free skip per year"*. If
holding a standing slot is ever built, the skip comes with it.

### Two corrections this step makes to other files

- **Phase 4.3 *"Monthly plans — needs a design conversation first"* is the same
  feature as 2.14** and should be closed into it once the shape is settled.
- **The sample bias is large and is named in the file**: every one of the seven
  pages was found by searching for detailing membership pages, so the evidence
  says what plan-running detailers do — **never how many detailers run plans.**

## TAKING MONEY, AND 2.14 ROUND 2 — AWAITING THE OWNER (2026-09-04)

**Nothing in `app/` or `supabase/` changed.** He read the plans research, asked
for payment to be figured out, said yes to a spam filter, and asked for a deeper
plans pass. All three are researched; two became roadmap items.

- **The files:** `docs/payments-research-2026-09-04.md` (new) and the **ROUND 2**
  half of `docs/plans-research-2026-09-04.md`.
- **The judgment:** DECISIONS.md → "Taking money, and roadmap 2.14 round 2".
- **New roadmap items: 2.20 (taking money, three stages) and 2.21 (a small spam
  filter).** Gaps A and C in the roadmap's "Not on the roadmap yet" list are
  answered and now point at them.

### He corrected the previous session, and the correction changed the build

The last pass reported that his old site listed *"Cash, Cash App, PayPal, Venmo
& Zelle"*. **That is a list, not a checkout** — *"I just have them like scan my
code or whatever for which one they choose. No payment ever goes through my
site."* **So stage 1 of 2.20 is putting a detailer's own payment handles into
settings and onto the invoice**: it costs nothing, charges 0%, needs no
processor, and makes what he already does official. It did not exist as an idea
before he said that sentence.

### The load-bearing facts

**1. There are TWO money problems and they have opposite answers.** MONEY IN
(detailers paying him, recurring, *"I'm not gonna do it manually"*) wants him to
be the merchant. MONEY THROUGH (a detailer's customers paying the detailer)
requires that he never is — holding other people's revenue means owning their
chargebacks and answering for a detailer who did not turn up.

**2. Stripe Connect `Standard` costs the PLATFORM $0**, read from Stripe's own
fee-payer table: the connected account pays processing, **dispute** and
Invoicing/Subscriptions fees, and Stripe charges no Connect fees to it or to the
platform. The $2/active account and 0.25% + 25¢ payout fees apply only where the
platform handles pricing. **The cheapest option and the safest one are the same
option**, and it is what makes real plan billing possible later at no platform
cost.

**3. The work in platform billing is the FAILURE path.** Failed payments are
**20–40% of all SaaS churn**. Retries, a grace period, then **pause rather than
cancel** — the same suspend 4.4 needs, so build it once. Recommended shape: the
dashboard goes read-only, **the public booking page keeps working**, because
taking it down punishes the detailer's customers.

**4. "FREE" IS ~$45/MONTH, AND IT WAS MEASURED.** **Supabase's free plan
includes NO BACKUPS AT ALL** (500 MB, 2 projects, pauses after 7 days idle);
daily backups start on **Pro, $25/month**. **Resend's free plan is 3,000
emails/month, 100 A DAY, ONE domain** — that one-domain limit is the real
blocker under 2.18's open "separate Resend account" thread — **Pro ~$20/month**.
Payments themselves have **no fixed cost**: every fee is a slice of money that
moved. Two detailers cover the lot.

### What round 2 settled about plans

- **Six plan shapes exist and they are FOUR FIELDS**: a cadence, what's
  included, how it's priced, whether there is a term. Cadence is not a fixed
  list, and **price can vary by vehicle size**.
- **The trade does not use contracts and advertises against them** — six of ten
  plan pages sell *"no contracts, cancel anytime"*. **The anti-breakage tools
  that work are PAUSE and SKIP**, because most breakage is a month somebody
  could not do. We could not enforce a penalty anyway.
- **The "requirement" case is ceramic coating warranties, and it is not a
  cadence** — they VOID without documented annual maintenance (System X: within
  ~30 days of the anniversary). It needs a **deadline, an escalating reminder
  and a last-done stamp**, and **none of the six panel products does it.**
- **We log plans, the detailer runs them — on ONE condition**: a member carries
  a **ledger of visits owed and used** from day one, or adding billing later is
  a rewrite. Housecall Pro's most useful screen is *"Unscheduled Visits"*, which
  exists for exactly the reason this research found first: the sale and the
  schedule are two acts. **Three statuses, not their seven.**
- **The schema decision most likely to be regretted: a plan belongs to a
  VEHICLE, not a person.** `customers` has no vehicles today.

### HE ANSWERED THE SAME DAY, AND TOLD US HE IS 17 AND IN CALIFORNIA

**Both facts were checked against primary sources; neither blocks the build.**
Round 2 of `docs/payments-research-2026-09-04.md` and round 3 of the plans file.

- **STRIPE: 13+ FOR A STANDARD ACCOUNT, BUT A LEGAL GUARDIAN MUST OWN IT** before
  it can accept charges or move money. **The build is unblocked; LAUNCH is
  not.** **Stage 3 is untouched** — Express and Custom Connect require 18,
  **Standard does not**, and detailers are adults. **The reflex on hearing
  "under 18" is to redraw the payments design; do not — it survives unchanged.**
- **CALIFORNIA TAXES SaaS FROM 1 JANUARY 2027 (SB 122, signed 2026-06-29), NOT
  TODAY.** He has CA nexus from his first sale. **Stripe Tax calculates (0.5%)
  but does NOT file** — a merchant of record costs **84¢/detailer/month** and
  makes CDTFA registration and filing somebody else's job. **Start on Stripe,
  decide by November 2026**; after ~100 subscribers a switch means every one
  re-enters a card.
- **HIS 12-MONTH LOCK-IN WITH AN EARLY-CANCELLATION FEE WAS ARGUED WITH, ONCE.**
  **AB 2863** (in force 1 July 2025) requires disclosure before billing details,
  affirmative consent, and **cancellation in the same medium they signed up
  in** — a term and a fee are legal, **an exit that runs only through him is
  not.** And **Family Code §6700**: a minor contracts subject to disaffirmance
  and adults deal with a minor at their own risk, so **he has picked the hardest
  term to enforce from the weakest position.** **Recommended instead: discount
  the annual PREPAY** — the plans research's own finding (money already taken
  binds structurally) aimed at his own pricing. Same year, nothing to chase.
- **HE WAS RIGHT ABOUT INVOICES AND 2.18 HAD ALREADY FIXED IT.** `invoiceEmail`
  branches on `payment_status`: paid → *Receipt / Paid in full*, unpaid →
  *Invoice / Amount due*. **So stage 1's payment handles go on the UNPAID branch
  only** — printing them on a receipt rebuilds the thing he finds weird about
  his own site. **Second time in two sessions his instinct corrected a plan.**
- **TWO CORRECTIONS FROM HIM, BOTH ACCEPTED.** Resend: he has two domains, uses
  only his own, sends all tenant mail himself — **so the ceiling is 100 EMAILS A
  DAY**, not the domain count. Backups: *"maybe I could create another Supabase
  account"* is **Supabase's own advice** and is now roadmap 2.22 (nightly
  `pg_dump` via GitHub Actions; **session pooler on 5432, because runners are
  IPv4-only and the free direct URL is IPv6**).
- **HIS CALLS, RECORDED OVER THE RECOMMENDATIONS:** non-payment takes the public
  booking page down too, and **vehicle-or-person is the detailer's choice**
  (one nullable column on the plan member).
- **PLANS ARE LOGGED, NOT BILLED — he chose option A himself** and listed
  cadence, tier, percent and bundle unprompted. **His customer-accounts idea got
  a verdict: good, one step early** — everything it buys comes from a **link**
  (`/booking/:id` already treats the UUID as the credential), while an account
  puts a second kind of human into an auth system holding only detailers and
  staff. **He handed the requirement-case design to us**, owed at build time.

**NEW ROADMAP ITEMS FROM THIS EXCHANGE: 2.20 (taking money), 2.21 (spam
filter), 2.22 (free backups).**

### ROUND 3 — "SHOULD I JUST START WITH PADDLE?" — ANSWERED NO, AND TWO OF HIS PUSHBACKS WON

- **NEITHER PADDLE NOR LEMON SQUEEZY DOES MARKETPLACE PAYOUTS.** Money-through
  is Stripe Connect either way, **so the choice was never "Paddle or Stripe" —
  it is "Paddle AND Stripe, or just Stripe"**: two dashboards and two webhook
  sets for a one-person support desk. **And Paddle's AUP prohibits *"human
  services that are not related to a software offering"*, which his $499
  hand-built website may be** — their call, not ours. **The tax benefit is small
  because he sells in ONE STATE**: one CDTFA registration, one filing schedule.
  **Decision: Stripe, register with CDTFA when the law starts. The trigger to
  revisit is selling outside California, not the calendar.**
- **THE EARLY-EXIT FEE IS BACK ON AND HIS COUNTER-ARGUMENT WAS RIGHT.** He
  proposed Adobe's exact model; **the FTC sued Adobe in June 2024 over the
  PRESENTATION, not the fee** — pre-selected plan, fine print, hover icons,
  obstructed cancellation. **So the complaint is the build checklist.** With a
  card on file the fee collects itself, **so "he is badly placed to chase it"
  converts into "the chargeback is the risk and disclosure is the defence".**
  **Build month-to-month AND annual-paid-monthly; keep the prepay as a third.**
- **HIS TRADE KNOWLEDGE MOVED A BUILD DECISION FOR THE SECOND TIME IN TWO
  SESSIONS.** *"They don't leave a client's house until it's paid"* → the unpaid
  invoice is rare, and **his own old site already printed the payment methods on
  the CONFIRMATION email** (`create-booking/index.ts:776`). **Stage 1 is the
  confirmation and the reminder, plus the unpaid invoice. Never the receipt.**
- **REFUNDS:** setup fee non-refundable once work begins; current month not
  refunded; **the setup fee and the exit fee are two separate arguments** and
  merging them weakens both.
- **AND ONE SMALL THING SHIPS BESIDE THE FREE RESEND PLAN HE IS KEEPING: make a
  REJECTED SEND VISIBLE.** The cap is not the risk, **the silence is.**

**WAITING ON HIM: nothing that blocks work.** His dad on the Stripe account is
settled in principle (*"my dad signed up and I'll manage it"* — and **whoever
owns that account is the business for chargebacks, refunds and tax**). The
lock-in question is answered (build both). The merchant-of-record question is
answered (Stripe).

### ROUND 4 — HE SELLS NATIONWIDE, HIS OWN DASHBOARD IS SPECIFIED, AND $999 SHIPPED

**One code change this session** — the first in four exchanges.
`PRICING.website.setup` is **$999**, not $900, on his instruction (*"things that
end in ninety nine feel more professional to me"*). **Verified in a browser at
1440x900**: struck through beside $499, no overflow, clean console.
**`docs/design-directions/5-the-thread.html` still shows $900 and that is
CORRECT** — a snapshot of what he approved on 2026-08-30, not a live surface.
**PRODUCT.md now says to read the price from `pricing.js` and never from the
reference rendering**, because "where they disagree, the page is right" is a
DESIGN rule and would be actively wrong applied to a price.

- **HE IS SELLING ACROSS AMERICA AND DELIBERATELY NOT LOCALLY** (*"if I sell in
  California, that could potentially be my competition"*), **which breaks round
  3's "he sells in one state, so tax is simple."** Marked rather than rewritten.
  **The threshold that bites is TRANSACTIONS, not revenue** — 200 transactions
  is ~17 subscribers at $40, because each monthly charge is a sale — **but 17+
  states have dropped that test, ~14–20 keep it, and SaaS is taxable in only
  ~26**, so **the exposure is CONCENTRATION, not reach.** **The Stripe decision
  survives on its two non-tax reasons**; what changes is that **Stripe Tax goes
  on at the first out-of-state sale for its NEXUS WARNINGS**, and **the
  merchant-of-record question re-opens on a trigger — three state registrations,
  or a warning about a state he has never filed in — not a date.**
- **CALIFORNIA INVERTS NOW:** nexus only matters where there is a sale, so
  avoiding California customers avoids California sales tax entirely.
  **California INCOME tax is owed regardless and is a different tax.**
- **HIS OWN DASHBOARD WAS ALREADY ROADMAP 4.4** — he had not seen it — **and is
  now specified: `docs/platform-admin-2026-09-04.md`.** **The test for every
  screen: what would he otherwise do by hand at 11pm with a SQL query while a
  detailer waits on a text?** Impersonation is the biggest time-saver **and must
  be logged**; **reuse `lib/setup.js`'s seven-step progress** rather than
  inventing a second completeness number; **the item SPLITS** — suspend rides
  with 2.20's billing, the list follows, the site columns wait for Phase 3.
- **"TYPE YOUR EMAIL AND IT SHOWS YOU" MUST NOT BE BUILT AS DESCRIBED — it is
  address enumeration.** **Email IN, LINK OUT**, which is a third caller of the
  pattern `/booking/:id` and quote acceptance already use. **And the browser
  remembering the last customer on that device covers most of "auto-detect" with
  no lookup at all.** **Reordering the booking steps was declined as a
  default** — the step budgets were measured (1440x900, 10px spare on step 1) —
  **show recognition at the top of step 1 instead.**
- **PRICING STRUCTURE: three ways to pay**, month-to-month being the most
  expensive because he carries the risk ($49 founding / $79 list proposed),
  annual-paid-monthly staying $40/$60 and **visually middle but NOT
  pre-selected**, annual-up-front already on the page.

### ROUND 5 — PRICING, THE LEGAL SETUP, AND A CORRECTION HE MADE TO HOW DECISIONS ARE HANDLED

**Two new files: `docs/pricing-2026-09-04.md` and
`docs/legal-and-tax-2026-09-04.md`.** Judgment in DECISIONS.md → "Pricing, the
legal setup, and being told to stop re-opening a closed decision".

- **HE TOLD US TO STOP RE-OPENING THE PADDLE QUESTION AND HE WAS RIGHT.**
  *"Why do you keep mentioning Paddle? Aren't we just sure on Stripe?"* It was
  decided in round 3 and re-opened twice with "triggers", so he read the same
  argument three times and concluded nothing was settled. **THE RULE, and it is
  worth more than the answer: a session that finds a reason to reconsider a
  settled decision records it in the file and keeps working — it does not put
  the choice back in front of him.** **Stripe. Closed.**
- **HE IS CHARGING TOO LITTLE, NOT TOO MUCH.** A custom site alone is
  $500–$5,000 from a freelancer, $10k+ from an agency; Housecall Pro is $59/month
  for software with NO website; **ongoing site upkeep alone benchmarks at
  $50–$200/month**, which is more than his whole monthly fee. **So the fix for
  "make it feel like a good deal" is putting the alternative on the page, not
  lowering the number** — and **his real differentiator (he edits their site
  whenever they ask) is currently invisible.** Raise the list price after three
  sites exist to point at.
- **$600/YEAR IS ALREADY EXACTLY "2 MONTHS FREE" (16.7%)**, the industry-standard
  discount. **Change the words, not the number** — months-free converts better
  than dollars or percentages.
- **THREE FOUNDING SPOTS, KEPT.** One is an anecdote, three is a portfolio, and
  three at $40 covers the ~$45/month of fixed costs. Already the DB default.
- **THE BEST SALES-TAX TOOL IS HIS CALLING LIST.** SaaS is untaxed in ~25 states
  and **he chooses who to cold-call** — Florida, Georgia, North Carolina,
  Michigan, Missouri, Virginia, New Jersey, Nevada means **nothing to calculate,
  register or file anywhere.** **Numeral's nexus monitoring is FREE** and is the
  safety net he asked for; Stripe Tax only goes on when a state needs it.
  **California creates an obligation immediately** (he lives there; SB 122 lands
  1 Jan 2027), which agrees with his own reason for skipping it. **Guardrail:
  never turn away a good customer over tax** — it costs him paperwork, not money.
- **SOLE PROPRIETORSHIP, NOT A CALIFORNIA LLC.** $70 to file then **$800 EVERY
  YEAR regardless of revenue, no first-year exemption since 2024**, against
  ~$1,440 of founding-year revenue. **The LLC decision is his dad's**, who
  already carries the liability by owning the payment account. **A minor CAN be
  an LLC member in California** — no age minimum in state law; the obstacle is
  contracts, fixed by a manager-managed LLC with the parent as manager.
- **TWO THINGS HE ASKED FOR ALREADY EXISTED:** Resend emails at **80% and 100%
  of quota** on every plan, so that alerting work shrinks to non-quota send
  failures; and his own admin dashboard was already roadmap 4.4.
- **AND THE WRITING FAILED HIM ONCE** — *"I have no idea what this whole
  paragraph means"* about 4.4. **CLAUDE.md's first rule.** Both versions are
  kept in the roadmap now: the precise one for whoever builds it, a plain one
  underneath.
- **HIS BOOKING-PAGE APPROVALS ARE DECISIONS NOW:** remember the customer in
  their browser, welcome-back message at the top of step 1, **no step reorder**,
  one button per plan where a detailer has several, and the emails carry the
  booking link with a "don't lose it" nudge.

### ROUND 6 — PRICING LOCKED, THE SETUP CHECKLIST, AND THE LLC ADVICE REVERSING

**`docs/setup-steps-2026-09-04.md` is the followable version of the legal file**,
written at his request (*"go here, click these links, this is what I have to do,
this is why"*). Judgment: DECISIONS.md → "The setup checklist, and the LLC advice
reversing on one fact about Stripe".

- **PRICING IS LOCKED** — *"I like that pricing. Lock all that in."* $999 / $60 /
  $600 / $35, three founding spots, month-to-month at $75. **The rest of the
  structure lands with 2.20 stage 2's checkout**; a third plan with nothing to
  click is an option that does nothing.
- **SHIPPED: the annual line reads "2 months free"** rather than "$120 less" —
  same saving, better framing, still derived from config. **`landing-pricing` is
  20 checks now**, two of them new and pinning the claim: **whole months, and
  inside the 15–20% band.** Baselined at `annual: 610`, which prints
  *"1.8333333333333333 months free"*. **Verified in a browser at 1440 and 392**,
  one line, no overflow, and a FRESH tab showed no console errors — **the 483
  `ERR_CONNECTION_REFUSED` in the old tab were it retrying a dev server that had
  been stopped between sessions, not a page defect.**
- **THE LLC ADVICE REVERSED ON ONE FACT: a Stripe account CANNOT move between
  legal entities.** So a sole proprietorship in his dad's name means **every
  subscriber re-enters their card on his 18th birthday**; an LLC hands over as
  one document with entity, EIN, bank and Stripe account intact. **The earlier
  "skip the LLC" weighed $800/year against $1,440 of revenue and never weighed
  the migration** — the same cost this project had already used, two exchanges
  earlier, to refuse switching payment providers.
- **HENCE STEP 0, THE QUESTION NOBODY HAD ASKED: how many months until he turns
  18?** Under six → **wait, launch billing in his own name, no handover ever.**
  Longer → the $800 buys a migration he does not have to do. **Neither answer
  wastes any other step.**
- **HIS LAKEWOOD EXPERIENCE WAS CORRECT AND APPLIES HERE TOO.** The city's code
  requires the applicant **and the person principally in charge** to be over 18,
  so **his dad applies**. The city asks you to phone first — **(562) 866-9771
  x2622** — which makes one call the fastest way to confirm the whole document.
- **STRIPE TAX, ANSWERED:** one switch for the ACCOUNT, not per customer; once
  on it reads each customer's address itself; **but it only charges where a
  REGISTRATION exists and returns zero otherwise.** **A Texas detailer signing up
  tomorrow is charged $0 and that is correct. Take the customer.**
- **THE MOST URGENT ITEM IS ABOUT HIS OTHER BUSINESS:** he mentioned in passing
  that he makes **~$2,000/month detailing**, which is past the $400
  self-employment threshold. **Being under 18 exempts nobody.** Recorded because
  it arrived as an aside.

### ROUND 7 — A PRICING PAGE, AND THE LLC QUESTION REDUCED TO ONE FREE TICKET

- **THE PLAN BUTTONS SHOULD LAND ON A PRICING PAGE, NOT A SIGNUP FORM** — his
  ask, and it is right: a customer who has not chosen between three ways to pay
  is not ready for a form. **AND THAT PAGE IS WHERE AB 2863's DISCLOSURES
  LEGALLY SIT** — auto-renewal terms, the twelve-month commitment and the exit
  fee, all before billing details — **so it is the load-bearing half of the
  checkout, not decoration in front of it.** Part of 2.20 stage 2. **He is right
  that the landing page's annual line becomes redundant — but the LINE STAYS
  UNTIL THE PAGE SHIPS**, or the only mention of the annual option vanishes
  before its replacement.
- **HIS "SET IT UP RIGHT SO I DON'T NEED AN LLC" INSTINCT SURVIVED CHECKING.**
  **The IRS sets no minimum age for an EIN** (a parent is named *responsible
  party* — a role on a form, changeable later without a new EIN), there is no
  age rule for being a sole proprietor, and **only three things genuinely need
  an adult: the Lakewood licence, the bank account and Stripe.** Three roles, not
  a whole business, and at 18 they come off.
- **SO THE WHOLE LLC QUESTION REDUCES TO ONE FREE STRIPE SUPPORT TICKET.**
  Their wording — *"a legal guardian must assume the role of owner"* — does not
  say whose legal entity the account is, and their docs are silent on turning
  18. **Entity = him → 18 removes the guardian, $800/year saved. Entity = dad →
  new account, every subscriber re-enters a card.** **Exact wording to send is
  in `docs/setup-steps-2026-09-04.md`, and it must be asked BEFORE the account
  is opened** — the one ordering mistake here that cannot be undone cheaply.
- **STRIPE TAX GOES ON FROM DAY ONE, and he was right about why.** Stripe's own
  pricing page: fees are incurred *"only for transactions in jurisdictions where
  you have an active tax registration"* — **no registrations, no cost, no
  monthly minimum.** Enabling it early removes a thing to remember at no price.

### ROUND 8 — HE TURNS 18 ON 2 DECEMBER 2026, AND THAT IS THE PROJECT'S REAL DEADLINE

**`docs/timeline-2026-09-04.md` is the measured estimate.** Judgment:
DECISIONS.md → "2 December 2026 is the date the whole plan turns on".

- **THE STRUCTURE QUESTION COLLAPSED RATHER THAN BEING ANSWERED.** Three months
  out means **no LLC, no dad on the Stripe account, no guardian, no handover**,
  and **the Stripe support ticket the setup file opened with is MOOT** — a
  guardian only exists if an account is opened before 18. **He worked most of it
  out himself**, including the detail that **changing a payout bank account in
  Stripe is a settings change** that touches no customer, subscription or stored
  card. **`docs/setup-steps-2026-09-04.md` is rewritten around one week in
  December.**
- **THE BUILD IS UNAFFECTED: Stripe TEST MODE needs no activated account**, so
  payments can be written and tested now and activated the week of the 2nd.
- **MEASURED FROM GIT: eleven consecutive days (25 Aug – 4 Sep), 214 commits,
  104 touching code, 28 roadmap items closed, 23 open.** **The repo's first 137
  commits are the Jan/Feb Emergent scaffold and are NOT this project** — anyone
  measuring from the initial commit gets an eight-month project instead of an
  eleven-day one.
- **18–27 SESSIONS REMAIN before he could sell.** Software lands **late
  September / mid-to-late October / late November** on three honest paces —
  **all before 2 December.** **THE SOFTWARE IS NOT THE CONSTRAINT; HIS BIRTHDAY
  IS.** First sales call realistically **the week of 8 December**.
- **WHAT THE SLACK IS FOR: Phase 5**, his own business on the platform in
  parallel — no legal setup, no cost, and the best bug-finder in the plan.
- **THE RISK NOT IN THE ESTIMATE: the discovery rate has not slowed.** The same
  eleven days found a live white-screen crash, an invoice that never added up
  and eleven under-floor email headlines, none of them on any list beforehand.


## ROADMAP 2.14, STEP 2 — PLANS ARE BUILT: THE TABLES, THE LEDGER AND THE SCREEN (2026-09-04)

**The detailer's half is done and live on the platform project.** Step 1 was
four rounds of research; this is the first code. The owner decided the shape
himself: **a plan is LOGGED, never sold and never billed by us.**

**What exists now**

| | |
|---|---|
| `supabase/migrations/20260904002000_plans.sql` | `plans`, `plan_members`, `plan_visits`, `bookings.plan_member_id`, the auto-link trigger, `accrue_plan_visits()`, a nightly `pg_cron` job, and RLS |
| `app/src/lib/plans.js` | the arithmetic — cadence and price words, the ledger, the visits-owed list. No React |
| `app/src/screens/more/Plans.jsx` | the settings screen. **Business has NINE rows now**, under *What you sell* |
| `tests/plans.test.mjs` | 51 checks, credential-free, baselined both ways |
| `scripts/seed-demo.mjs` | 3 plans, 4 members (3 active, 1 paused), a skipped visit, and the grants come from the real accrual function |
| `scripts/sweep-widths.mjs` | the row plus **both of its forms** |

**A plan is four fields, and six shapes fall out of them** — a cadence (a count
and a unit, not a fixed list; both NULL is a real answer and means a member rate
with no schedule), what is included, how it is priced (a monthly amount, a
per-visit amount, or a percentage — all three are in the sample), and whether
there is a term (`term_months` records what was agreed and **nothing acts on
it**, because six of ten sampled detailers advertise "no contracts" as a
feature).

**THE ONE THING TO READ BEFORE TOUCHING ANY OF IT: the ledger's two halves live
in two places on purpose.** OWED is append-only rows in `plan_visits`; **USED is
`bookings.plan_member_id`, a column** — because cancellation already works
there. Twelve places in this codebase ask `status <> 'cancelled'` and every one
is already correct about a plan visit that was called off. The obvious build
(one ledger with `used` rows) needs a thirteenth rule and a compensating row
nobody remembers to write.

**Three more that are invisible from the code**

- **Pause is a DATE, not a flag.** `plan_members.accrue_from` exists beside
  `started_on` so that a member coming back is not backfilled with every visit
  the pause was meant to skip.
- **`on delete no action`, not `restrict`,** on `plan_members.plan_id` — the
  seed deletes the demo business every run and that cascade hits both tables in
  one statement.
- **The auto-link trigger over-counts on purpose and it is stated**: a member
  booking something their plan does not cover has it counted, because
  `booking_services` rows land after the booking.

**Verified by looking**, at 1920 / 1440 / 768 / 392 / 320, console clean
(`shots-2.14/`). Three defects came out of that and none of them was reachable
by any check in the repo: the member editor never named the person it was about,
"No plans yet" was painted before the first read returned, and at 320 the *how
often* number box was squeezed to ~40px with its digit behind the padding.
`composition` caught a fourth, and it was a real design error rather than a
technicality — both lists were cards, and a member list grows with the business.

**OPEN FOR HIM — one small question.** Defining a plan needs the *Settings*
tick; logging a member needs *Money*. The demo's "Detailer" role can do the
first and not the second. Should they be the same tick, or should plans get one
of their own? Nothing is blocked either way.

**STEP 3 IS THE CUSTOMER'S HALF AND IS NOT BUILT** — the booking page's plan
buttons, the welcome-back line at the top of step 1, the remembered browser, the
"your plan" link and the email nudge. It is separate because all of it lands on
the booking page, whose per-step budgets are measured to 10px spare.
`get_public_business_profile` returns no plans yet, and when it does, **the
plan's effect on the price goes through `_shared/pricing.ts` or it is the
travel-fee defect for the third time.**
