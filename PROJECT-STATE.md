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
- **Tests:** 11 suites, no runner — plain `node tests/X.test.mjs` from repo root. 4 run credential-free (all passed for me); 7 hit the real Supabase project and need env vars.

## 6. LANDMINES

- **`main` = production, and a push to it IS a publish — CONFIRMED 2026-08-30, not inherited.** `main` was pushed and Netlify rebuilt and republished the live site on its own, with no upload and no dashboard visit. Work still happens on `claude/superbase-access-anj1h7`; **never merge to `main` on your own initiative — ask.** The owner said yes on 2026-08-30, so the redesign through roadmap 2.2 IS live and `main`, the branch and the working machine are all the same commit. **THAT PARITY IS STALE AS OF 2026-08-31: `main` is 19 commits behind the branch** — everything from roadmap 2.6 onward (the whole walkthrough, the research, and 2.8b’s five builds) is committed and unpublished. Nothing is wrong; no session since has been asked to publish, and the live site is his private preview rather than a launched product. **It is a standing question for him, not a blocker on any roadmap item:** say what is on the branch, recommend publishing when he next looks, and do not merge without his word.
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

**The lever was copy again — third item in a row.** Two native time fields
cannot share 244px at any spacing (Chromium will not draw one under 138px), so
they stack; stacked, "to" no longer says which field is which, so each took its
own word. `Hours.jsx` gained a `.tfield` wrapper that renders identically
above 360px and exists only to carry those words below it.

## 7. WHAT I'D DO NEXT (payoff ÷ effort)

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
7. **The five deferred dashboard items** (calendar week view, Clients sort/filter with lifetime value, demote quoted-vs-on-site, Hours multi-glow, calendar cell weight) — agreed non-blocking, but Clients sort/filter is the one owners will hit daily; do it first of the five.
