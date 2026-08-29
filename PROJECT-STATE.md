# PROJECT-STATE.md

Investigated 2026-08-28 by reading the files cited below. Claims not backed by a read are marked **(guess)**.

## 1. WHAT IT IS

Multi-tenant SaaS giving independent car detailers a professional website with online booking built in. Converted from a single-business site ("Andrew's Auto Detail" — the old code is kept read-only in `reference/`, 2.5 MB, never deployed). Three audiences from one React bundle: prospects on the marketing page (`/`), detailer-owners in a phone-first dashboard (`/app`), and their customers on a public booking page (`/book/:slug`).

**State: late beta, pre-revenue.** The engine works end to end (real bookings have been made), 11 test suites exist, a private Netlify test deploy exists — but transactional email now works (fixed and proven delivered 2026-08-29), the reminder scheduler is now wired and proven (2026-08-29), billing is not implemented ("nothing charges anyone" — DECISIONS.md), and signup is brand new. Sources: `docs/HANDOFF.md`, `DECISIONS.md`, git log.

## 2. STACK

- **Frontend:** React 18 + Vite 5, `react-router-dom` 6, `lucide-react` icons, `@supabase/supabase-js`. That is the *entire* dependency list (`app/package.json`) — no UI library, no CSS framework, no state library.
- **Styling:** three hand-written plain-CSS files (`app/src/theme.css` 848 lines, `landing/landing.css` 588, `book/booking.css` 306) driven by CSS custom properties; ~290 `var(--…)` usages in theme.css alone.
- **Database:** Supabase Postgres, 16 migrations in `supabase/migrations/` applied in filename order. RLS is FORCEd; tenant isolation and double-booking prevention are enforced in the database (exclusion constraint), not the app.
- **Backend:** 18 Deno edge functions in `supabase/functions/` (booking CRUD, slots, pricing, email, invites, push, promo, founding offer). All consequential writes go through them; the browser client does reads and settings-writes behind RLS (`app/src/lib/api.js` header comment).
- **Auth:** Supabase Auth — email/password plus Google sign-in (`git log: "Google sign-in that switches itself on"`); email confirmation deliberately off (DECISIONS.md).
- **Hosting:** Netlify serving `app/` as an SPA (split config: root `netlify.toml` sets `base="app"`, `app/netlify.toml` has build/redirects/headers — both duplicate `SECRETS_SCAN_OMIT_KEYS` on purpose). HANDOFF.md says auto-publish from `main` → detailingplatform.com; an older DECISIONS.md note says deploys were manual uploads — HANDOFF is newer, but verify before relying on it.
- **Email:** Resend (broken — see §5). **Deploys of DB/functions:** `scripts/apply-migrations.mjs` and `scripts/deploy-functions.mjs` via the Supabase Management API — no CLI needed.

## 3. STRUCTURE

Routes (`app/src/main.jsx`, verified by `tests/route-contract.test.mjs`):

| Route | What | Session context |
|---|---|---|
| `/` | Marketing landing (`landing/LandingPage.jsx`, 350 lines) | none |
| `/book/:slug` | Customer booking wizard (`book/BookingPage.jsx` + 6 step components) | none — own `BookingBusinessContext` from slug |
| `/booking/:id` | Receipt / cancel / reschedule (`book/ManageBookingPage.jsx`); UUID is the credential | none |
| `/invite/:token` | Staff invite acceptance | `BusinessProvider` |
| `/job/:id` | Job detail page | `BusinessProvider` |
| `/app/*` | Dashboard — 5 tabs (Today, Calendar, Money, Clients, More) via **internal state, not routes** (`App.jsx`) | `BusinessProvider` |
| `/*` | Legacy catch-all → dashboard (old bookmarks) | `BusinessProvider` |

- **State:** `context/BusinessContext.jsx` (session, business, settings, branding, role, theme) wraps only signed-in routes — public routes deliberately sit outside it. No global store; screens fetch their own data.
- **Data-fetching:** `hooks/useBookings.js` (RLS reads, adds business-local date/times), `lib/api.js` (all edge-function calls). Staff role hides the Money tab in UI, mirroring DB policy (`App.jsx`).
- **More tab** fans out into 11 settings screens in `screens/more/` (Catalog, Hours, BookingRules, Team, Branding/Appearance, Gallery, Promos, Templates, Notifications, Preferences, BusinessInfo).

## 4. FRONT END

Better than typical for this stage — there is a real, enforced design system:

- **System: BEING REPLACED.** `DESIGN.md` (owner decision 2026-08-28)
  deprecates the system below as identity — it is evidence and anti-reference
  only, and nothing new should be polished toward it. Four directions were
  built and rejected 2026-08-29 (`docs/design-directions/VERDICT.md`), and
  the rebuilt one — **`5-the-thread.html`, reviewed and approved by the owner
  the same day** — is the direction. See §6b for the one thing still
  unverified. The new system gets written in roadmap 1.5. The description
  that follows is the OLD look.
- **Old system:** `docs/design-system.md` ("Raking Light") was explicit law: matte near-black ground, exactly one "lit" element per screen, tokens defined once in `theme.css` (`:root` dark + `[data-theme="light"]` + `--bk-*` booking mirror). Enforced by tests: `composition.test.mjs`, `design-contrast.test.mjs` — all passing when I ran them.
- **Fonts:** exactly three, loaded from Google Fonts in `app/index.html`: Anybody (variable width — titles/labels), Public Sans (prose), DM Mono (every figure, tabular-nums).
- **Tokens vs hardcoded:** discipline is real. The only hex colors in JS live in `lib/theme.js` (the designated color-math file) and Google-logo colors in Auth **(guess for exact location of the Google hexes — I found the file set, didn't trace each)**. CSS uses `var(--…)` throughout.
- **Inline styles exist but are modest:** heaviest are LandingPage (28 `style={{`), ManageBookingPage (18), Money (15) — mostly layout one-offs, not colors, judging by spot checks.
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

- **`main` = production.** Netlify publishes it to detailingplatform.com. Work happens on `claude/superbase-access-anj1h7` only.
- **The old business is live and off-limits:** its Supabase project, Netlify site, and Resend domain (`andrewsdetail.com`). The Resend account contains real customers' emails. `reference/` is read-only.
- **RLS is the security model.** An event trigger auto-enables RLS on new tables; `business_settings` is owner-only to READ (staff get zero rows — future staff screens must use edge functions). Don't "fix" what looks like an over-strict policy.
- **Migrations are append-only, filename-ordered**; the apply script intentionally fails loudly on an already-migrated DB unless given specific filenames.
- **Both netlify.toml files must stay in sync** (`SECRETS_SCAN_OMIT_KEYS` duplicated on purpose — a deploy from inside `app/` never reads the root file).
- **`app/.env.production` must never be committed** — Vite would silently override local config (DECISIONS.md).
- **`lib/theme.js` is the only file allowed to compute color in JS** — tenant accents get contrast-corrected there; adding color math elsewhere breaks the system's contract.
- **The dashboard's 5 tabs are state, not URLs** — deep-linking a tab doesn't exist; adding router-based tabs would break the home-screen-app behavior comments in `main.jsx`.
- **PUBLIC REPO + a leaked service-role key (found 2026-08-29).** The GitHub repo is public, and `backend/.env` sits in its history (committed 2026-02-01, 4 commits, reachable from `main`) carrying the LIVE business project's `SUPABASE_SERVICE_ROLE_KEY` — full read/write, bypasses RLS — plus `GOOGLE_CLIENT_SECRET`, an older Resend key and a Mongo URL. Earlier notes discussed only the **anon** key and concluded "low severity"; that reasoning does not cover this. **Now verified still live, without exercising it:** the anon key in the public history is byte-identical to the project's current anon key, both issued at project creation, so the JWT secret has never been rotated and the service-role key still works (exp 2036). A read-only abuse check on 2026-08-29 found **no sign it has ever been used** — `pg_stat_statements` covers the whole exposure window unevicted and holds only app-shaped queries, and the auth audit log's only service-role action is the owner's own account creation. **OPEN — owner will rotate once the current build work is finished (their call, 2026-08-29).** See DECISIONS.md.
- **The platform sends through the live business's Resend account.** Same account (`andrewswashing@gmail.com`) that mails Andrew's Auto Detail's real customers. Platform sends accumulate against its reputation and suppression list. Flagged 2026-08-28, not decided.
- **What I don't understand:** whether Netlify auto-publish is actually connected (HANDOFF vs DECISIONS disagree). ~~Why email produces nothing in Resend~~ — answered 2026-08-28, see above.

## 6b. THE VISUAL REDESIGN, AS AT 2026-08-29

The one live thread. `DESIGN.md` and `CLAUDE.md` both say the old system
("Raking Light", `docs/design-system.md`) is deprecated as identity — evidence
and anti-reference only. Backend, content, copy facts and accessibility floors
are kept; only the visual world is being replaced.

- **Roadmap 1.1/1.2 are done.** Seven reference sites read at the code level
  (`docs/references/ANALYSIS.md`, 1,669 lines — the frame for everything
  visual), the owner's own words on how they move
  (`docs/references/TASTE-NOTES.md` — primary evidence), and the brief
  interview (`docs/design-brief.md`). Apple was read too
  (`docs/references/APPLE-READ.md`) but is **one input among eight, not the
  frame** — the owner said so explicitly.
- **Roadmap 1.3, first attempt: all four directions rejected**, 2026-08-29.
  `docs/design-directions/VERDICT.md` is the review, in his words. The brief
  was wrong, not the execution: they sold car detailing, and the product is a
  dashboard plus a website sold to a detailer who books through DMs, Yelp and
  Google.
- **Roadmap 1.3, rebuild: `docs/design-directions/5-the-thread.html`,
  "The Thread". Built 2026-08-29, verified, committed — and NOT yet seen by
  the owner.** That is the only thing outstanding in phase 1.
  - The plan is `docs/design-directions/BUILD-BRIEF.md`; **§7 carries the
    owner's answers and overrides §2 of the same file.**
  - One HTML file, no build step, **zero third-party JavaScript** — which is
    also how the GSAP Club licence question got closed.
  - Grammar: one continuous ground, eight structurally different sections.
    The two-column comparison is two of them, which is the cap he set.
  - Nothing in `app/` was touched. Phase 1 picks a look; phase 2 applies it.
- **REVIEWED and APPROVED by the owner 2026-08-29** — "so much better",
  "the layout is good, I like it". The two-column beat did NOT read as a
  before/after of a car. Three rounds of his corrections are in and verified;
  see `README.md` "Round two" and "Round three".
- **The one blocker: the iPhone fix is unverified.** The pinned section broke
  on his iPhone ("it glitches out"). Phones no longer pin at all — the
  transfer is scrubbed through the viewport, with `svh` units and width-gated
  resize, which removes both known iOS Safari failure classes. Verified at
  392/768/1440 with touch emulation, which is NOT iOS Safari. He has to
  reopen it on the phone and confirm. Nothing else in 1.4 depends on it.
- **Copy is provisional by agreement**, not an oversight: "in the future we'll
  kind of critique the actual text on the page. For now, this is a good
  layout." A copy pass is a named 1.4 task. Only "Stop booking jobs in your
  DMs" has his explicit approval; the rest is carried over from
  `app/src/landing/LandingPage.jsx`, which `DESIGN.md` says to keep.
- **Carried into 1.4 regardless:** the dashboard's empty state is still
  undrawn, and the device-tier question (`APPLE-READ.md`) is still a 1.5
  decision.

## 7. WHAT I'D DO NEXT (payoff ÷ effort)

0. **The owner reopens `5-the-thread.html` on his iPhone** and says whether
   the pinned-section fix works. It is the only unverified thing in phase 1.
   See §6b.
1. ~~**Fix email.**~~ Done and proven 2026-08-29 — see §5. The next-highest open thread is now the reminder scheduler (item 2).
2. ~~**Wire the reminder scheduler.**~~ Done and proven 2026-08-29 — see §5. HANDOFF thread #2 is closed.
3. ~~**Delete the pre-conversion junk.**~~ Done 2026-08-28 — roadmap 0.1.
4. **Resolve the deploy question** — confirm whether Netlify auto-publishes `main`; if it's still manual uploads, connect the repo. One config change; prevents a stale-production surprise.
5. **The five deferred dashboard items** (calendar week view, Clients sort/filter with lifetime value, demote quoted-vs-on-site, Hours multi-glow, calendar cell weight) — agreed non-blocking, but Clients sort/filter is the one owners will hit daily; do it first of the five.
