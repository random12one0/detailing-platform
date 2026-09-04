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

**AND SINCE 2026-09-03, ROADMAP 2.18 IS OPEN AND MOVING.** He asked for the
emails deleted and rebuilt from scratch, and for the research first. **Step 1
is done** — `docs/email-research-2026-09-03.md`, §6x here — **and he has since
answered, overruling two of its recommendations: §6y.** "Premade templates"
means a **block EDITOR**, not prewritten wording; reminders have **no cap**;
and he rejected the existing look outright, correctly. **The new world is built
on two emails and deliberately NOT wired up** (`emailKit.ts`, `emailsNew.ts`,
`scripts/render-emails-new.mjs`) — the edge functions still send the old
templates and `email-brand` is still green at **138** on the old file, because
porting ten templates into a look he has not approved is the expensive mistake
here. **Waiting on: does the new world get a yes.** The colour half is done and
was EXTENDED rather than edited; the trap that remains is that `email-brand`'s
138 checks are partly SOURCE-SHAPE checks pointed at a file the port deletes.

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
