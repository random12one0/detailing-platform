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
  `docs/design-system.md` is now **"The Thread"** — thirteen laws, sixteen
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

- **`main` = production, and a push to it IS a publish — CONFIRMED 2026-08-30, not inherited.** `main` was pushed and Netlify rebuilt and republished the live site on its own, with no upload and no dashboard visit. Work still happens on `claude/superbase-access-anj1h7`; **never merge to `main` on your own initiative — ask.** The owner said yes on 2026-08-30, so the redesign through roadmap 2.2 IS live and `main`, the branch and the working machine are all the same commit.
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
   detailers work). **None of it is started.**

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
5. **The five deferred dashboard items** (calendar week view, Clients sort/filter with lifetime value, demote quoted-vs-on-site, Hours multi-glow, calendar cell weight) — agreed non-blocking, but Clients sort/filter is the one owners will hit daily; do it first of the five.
