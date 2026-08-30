# PROJECT-STATE.md

Investigated 2026-08-28, updated through 2026-08-30, by reading the files cited below. Claims not backed by a read are marked **(guess)**.

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

- **System: WRITTEN AND LAW AGAIN, 2026-08-30 (roadmap 1.5).**
  `docs/design-system.md` is now **"The Thread"** — thirteen laws, sixteen
  tokens, a two-face type scale, the composition grammar, the verification
  routine, the never-defaults, and what survived the old system. The
  reference rendering is `docs/design-directions/5-the-thread.html`, the page
  the owner approved, and **where the document and that page disagree the
  page is right.** The skill-collision rule is back on: appliers and auditors
  only. Both design tests were rewritten to enforce the new rules —
  `composition` is 22 checks now, including a token-drift check that makes
  the page, the document and the test agree on all sixteen values.
  **Not yet applied to `app/` — that is the whole of Phase 2.** The
  description that follows is the OLD look, which is still what ships.
- **Fonts (new system):** exactly two — **Archivo**, one variable face worked
  across both axes (`wdth` 62–125, `wght` 100–900), and **JetBrains Mono**
  for every figure. Down from three.
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

## 6b. THE VISUAL REDESIGN, AS AT 2026-08-30

**Phase 1 is finished except for one look from the owner.** The direction is
chosen, refined over fifteen rounds of his corrections, written up as a
system, and enforced by rewritten tests.

- **Roadmap 1.1/1.2/1.3 done.** Seven reference sites read at code level
  (`docs/references/ANALYSIS.md`), the owner's own words on how they MOVE
  (`docs/references/TASTE-NOTES.md` — primary evidence), the brief
  (`docs/design-brief.md`), four directions built and rejected
  (`VERDICT.md`), and the rebuild — `docs/design-directions/5-the-thread.html`,
  "The Thread" — approved by him 2026-08-29.
- **Roadmap 1.5 done 2026-08-30.** `docs/design-system.md` is "The Thread"
  and is law; `DESIGN.md` and `CLAUDE.md` say so; both design tests enforce
  the new rules. **Direction-inventing skills are banned again from here.**
  The device-tier question that was parked for 1.5 is closed inside that
  file: Apple's strategy, never ask what the device is.
- **Roadmap 1.4 is the ONE thing still open, and it needs only his eyes.**
  Everything he has asked for is applied and verified. On 2026-08-29 he was
  asked to approve and answered "cut a section — it's too long"; measurement
  showed the two named candidates would have bought 5%, and the real cost was
  the 01/02/03 rail at 4.07 screens of his 14.44. It was cut on his
  instruction (README "Round fifteen"). **He has not yet seen the result:
  10.41 screens at 1920, 11.26 at 1440, 14.14 on a phone.** He also kept the
  "A Facebook page" row, which closes that question.
- **The artifact is republished** and carries round fifteen:
  https://claude.ai/code/artifact/e678cecb-94c3-4be8-9b4f-d3066b15b15e —
  but **anyone opening the SHARED link still sees a pinned earlier version
  until he moves the share pin from the page's share menu.** Only he can do
  that. If the page looks like an older round, that is why; open it from the
  artifacts gallery instead.
- **POSITIONING, settled 2026-08-29 and unchanged:** we sell "a website and
  the dashboard that runs it" as ONE purchase. The website half leads because
  it is the half that is not a commodity; the dashboard is in the same
  sentence, never a later section that reads as a bonus. His description of
  the delivery model is `docs/tenant-websites.md`; the reasoning is
  `DECISIONS.md` → "Positioning: what we sell is the pair", including its
  correction section, which is the operative version.
- **Copy is provisional by agreement.** The marketing deck he approved is
  built verbatim; the sections it did not touch — "What you get" rows, the
  terms, the footer — still carry their `LandingPage.jsx` wording and have
  not been through him.
- **Three things the new system deliberately does not settle**, and the first
  is the first question of Phase 2: **whether there is a light theme at all**
  (the evidence says drop it; it is a visible takeaway, so it is his call);
  the tenant's curated four-to-six accent colours, which nobody has picked
  and 2.4 needs; and the dashboard's own section skeletons, which are the
  body of 2.3.
- **Still unmeasured:** mid-range Android. Nothing uses WebGL so the risk is
  low, but nobody has put a thumb on a cheap one.

## 7. WHAT I'D DO NEXT (payoff ÷ effort)

0. **The owner looks at the shortened page and approves 1.4, or sends the
   next round.** It is the only thing left in phase 1 and it is the only
   thing that cannot be done without him. The rail is cut on his
   instruction; he has not seen the result. See §6b. (~~The iPhone check~~
   passed 2026-08-29 — closed, do not re-open.)
0b. **He answers the light-theme question**, which is the first decision of
   Phase 2 and blocks 2.3 and 2.4 rather than 2.1. See the end of
   `docs/design-system.md`.
1. ~~**Fix email.**~~ Done and proven 2026-08-29 — see §5. The next-highest open thread is now the reminder scheduler (item 2).
2. ~~**Wire the reminder scheduler.**~~ Done and proven 2026-08-29 — see §5. HANDOFF thread #2 is closed.
3. ~~**Delete the pre-conversion junk.**~~ Done 2026-08-28 — roadmap 0.1.
4. **Resolve the deploy question** — confirm whether Netlify auto-publishes `main`; if it's still manual uploads, connect the repo. One config change; prevents a stale-production surprise.
5. **The five deferred dashboard items** (calendar week view, Clients sort/filter with lifetime value, demote quoted-vs-on-site, Hours multi-glow, calendar cell weight) — agreed non-blocking, but Clients sort/filter is the one owners will hit daily; do it first of the five.
