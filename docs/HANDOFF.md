# Handoff — running this project from your own machine

Written when the work moved out of a cloud sandbox and onto a local machine.
Two parts: **the context prompt** to paste into a fresh Claude Code session,
and **the setup**, which is shorter than you'd expect.

## The short version

Almost nothing needs transferring. Everything already lives outside the
sandbox:

| Thing | Where it lives | Does it move? |
|---|---|---|
| Code, migrations, edge functions, tests, docs | GitHub — `random12one0/detailing-platform` | No. `git clone`. |
| Database, auth, deployed functions, secrets | Supabase cloud, project `kguqylyzgyzfktkfnhjb` | No. Hosted service. |
| Hosting, DNS, builds | Netlify, auto-publishing `main` → detailingplatform.com | No. Same. |
| Transactional email | Resend | No. |
| **Credentials** | Your Supabase dashboard | **Yes — the only thing that moves.** |
| **Why things are the way they are** | Was only in one conversation | **Yes — that's this file.** |

The sandbox was a place to run commands, not a place anything was stored.

---

# Part A — the context prompt

Paste this as the first message to a fresh Claude Code session in the cloned
repo.

> This is **Detailing Platform** — multi-tenant SaaS that gives independent car
> detailers a website with booking built in. It was converted from a
> single-business site (Andrew's Auto Detail), which still exists, still takes
> real customers' money, and is off-limits. Live at detailingplatform.com.
>
> **Read these three before touching anything:**
> - `docs/design-system.md` — the visual law. Every visual decision derives
>   from it. If a change contradicts it, either the change is wrong or the file
>   gets updated first. Never silent drift.
> - `DECISIONS.md` — every judgment call made while building the engine, and
>   why. Read it before deciding something looks wrong.
> - `docs/dashboard-spec.md` — what the dashboard is supposed to be.
>
> **Architecture, one paragraph.** A React/Vite SPA in `app/` serves three
> audiences from one bundle: marketing at `/`, the owner dashboard at `/app`,
> and the customer booking page at `/book/:slug` (receipt at `/booking/:id`).
> It talks to 18 Deno edge functions in `supabase/functions/`, which are the
> only things that write anything consequential; the browser's own Supabase
> client is for reads and settings-shaped writes, all behind RLS. Schema lives
> in `supabase/migrations/`, applied in filename order. Tenant isolation is
> enforced in the database, not the application — RLS is FORCEd and an event
> trigger auto-enables it on new tables.
>
> **Standing constraints. These do not expire:**
> - Never touch the old business's live Supabase project, its Netlify site, or
>   its Resend sending domain (`andrewsdetail.com`).
> - The Resend account belongs to that live business and contains real
>   customers' email addresses. Read carefully, send nothing casually.
> - `reference/` is read-only. It is the old site, kept for reference. It is
>   never deployed and never edited.
> - Never paste live credentials into chat or commit them.
> - Develop on `claude/superbase-access-anj1h7`. Never push to another branch
>   without explicit permission. `main` is what Netlify deploys — a push to it
>   is a production release.
>
> **What's unfinished — don't rediscover these:**
> 1. **Email does not send — ROOT CAUSE FOUND 2026-08-28. Owner action.**
>    The cause was the second secret named here:
>    `PLATFORM_FROM_ADDRESS=onboarding@resend.dev` is Resend's *shared*
>    sandbox sender, which Resend restricts to the account owner's own
>    address no matter what domains the account has verified. Every send is
>    rejected 403 `validation_error` at Resend's validation step, which is
>    before an email record is created — hence *nothing in the log*. It had
>    been printing in `function_logs` the whole time (2026-08-28 07:01Z,
>    ~20 occurrences); nobody had read them. **No code is at fault.**
>    Blocked on the owner: the Resend account's only verified domain is
>    `andrewsdetail.com` (the live business's), so `detailingplatform.com`
>    must be verified before the from-address can change. Full evidence in
>    DECISIONS.md §"Phase 0 — 0.2 email".
> 2. **pg_cron was never installed** and the reminder sweep
>    (`send-owner-reminders`) has never been proven to fire on its own. The
>    function works when called by hand.
> 3. Five deferred dashboard items, agreed non-blocking: calendar week view;
>    Clients sort/filter with last-visit and lifetime value; demote the
>    quoted-vs-on-site metric; Hours multi-glow; calendar cell weight.
> 4. The Android Contacts vCard export has only been verified in Chromium,
>    never on a real Android device.
>
> **How this project has been worked, and it matters:**
> - **Judge from rendered screenshots, not from code.** Every real UX bug
>   found here was found by looking at the running product. Reading the code
>   found none of them.
> - **Write a test for every rule.** `tests/composition.test.mjs` caught four
>   design-system violations that a careful visual pass had missed — including
>   one in a file that had just been rewritten by hand. A rule with no test is
>   a rule that gets broken again.
> - **Run the actual user path.** The worst bug shipped so far — a blank white
>   page at signup — survived a green test suite and was caught in ten seconds
>   of clicking through the real UI.

---

# Part B — setup on your machine

## 1. Clone

```sh
git clone https://github.com/random12one0/detailing-platform
cd detailing-platform
git checkout claude/superbase-access-anj1h7
```

Nothing needs copying by hand. At the time of writing, `main`,
`origin/main` and `origin/claude/superbase-access-anj1h7` are all at the same
commit, with a clean working tree — everything ever written is on GitHub.

**GitHub auth.** The remote is HTTPS, so `gh auth login` is enough; a
credential helper or a PAT also works. If you'd rather use SSH:

```sh
git remote set-url origin git@github.com:random12one0/detailing-platform.git
```

Nothing about the repo's GitHub connection was sandbox-specific — there is no
cloud-side integration to move.

## 2. Node and dependencies

Node 22 (the sandbox ran v22.22.2 / npm 10.9.7). `app/` is the **only** npm
project in the repo:

```sh
cd app && npm install
```

## 3. The two environment files

**`app/.env.local`** — what the browser build needs (gitignored by `app/.gitignore`).

```
VITE_SUPABASE_URL=https://kguqylyzgyzfktkfnhjb.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
```

Both are public by design (the anon key is what every visitor's browser
presents; everything it can reach is behind RLS), which is why
`netlify.toml` lists them in `SECRETS_SCAN_OMIT_KEYS`. Without them the app
still builds and the marketing page still renders, but anything touching the
API fails — see the comment in `app/src/lib/supabase.js` for why it no longer
white-screens.

**Shell environment** — what the scripts and integration tests need. Put it in
your shell profile, a `.env` you source, or a direnv file. Never commit it.

| Variable | Used by | Where to get it |
|---|---|---|
| `SUPABASE_URL` | tests, seeds | Dashboard → Project Settings → API |
| `SUPABASE_ANON_KEY` | tests | same page |
| `SUPABASE_SERVICE_ROLE_KEY` | tests, seeds | same page — **full bypass of RLS. Never in a build, never in the browser, never in chat.** |
| `SUPABASE_PROJECT_REF` | `apply-migrations`, `deploy-functions` | `kguqylyzgyzfktkfnhjb` (it's in the URL) |
| `SUPABASE_ACCESS_TOKEN` | `apply-migrations`, `deploy-functions` | Dashboard → Account → Access Tokens → generate new |

That is the complete set — five names, verified against the source. Get the
values from the dashboard, not from any old chat transcript.

## 4. Run it

```sh
cd app && npm run dev      # http://localhost:5173
```

Tests are standalone scripts — there is no test runner and no `npm test`. Run
them **from the repo root**:

```sh
node tests/route-contract.test.mjs
```

Four of them need no credentials at all and are the fastest way to know you
haven't broken a rule: `composition`, `design-contrast`, `landing-pricing`,
`route-contract`. The other seven talk to the real Supabase project and need
the shell variables above.

---

# Part C — how the pieces connect

```
browser
  ├─ app/src/lib/supabase.js   reads + settings writes, RLS-scoped
  └─ app/src/lib/api.js        →  supabase/functions/<name>   (edge functions)
                                     └─ Postgres, RLS FORCEd

scripts/apply-migrations.mjs  →  Management API  →  runs supabase/migrations/*.sql
scripts/deploy-functions.mjs  →  Management API  →  uploads supabase/functions/*

git push origin main  →  Netlify builds app/  →  detailingplatform.com
```

- **Migrations** apply in filename order. With no arguments the script applies
  everything (which will fail loudly on an already-migrated database — that's
  intentional); pass specific filenames to apply just the new ones.
- **Function deploys** go through the Management API as multipart uploads, so
  no CLI and no direct database connection is required. `_shared/` modules are
  bundled per function automatically.
- **Netlify config is split in two on purpose**: the root `netlify.toml` sets
  `base = "app"`, and `app/netlify.toml` holds the build command, the SPA
  redirect and the headers. Both repeat `SECRETS_SCAN_OMIT_KEYS` because a
  deploy started from inside `app/` never reads the root file. Read the
  comments in both before changing either.
- **Auto-publish is on**, from `main`. Nothing else deploys.

---

# Part D — what changes now that you're local

**Travels with the repo.** `.claude/settings.json` — the permission allowlist —
is committed, so the new session starts with the same tool permissions.

**Does not travel: MCP servers.** Supabase, Netlify, Resend and GitHub were
provided by the cloud environment, not by the repo. Locally, either add them
back (`claude mcp add ...`) or skip them — you now have `gh` and the Supabase
CLI, which the sandbox did not.

**You gain plugins.** The one that was asked for twice and refused by the
sandbox now works:

```
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```

**Two things in this repo are sandbox scaffolding, not requirements:**
- `SMOKE_PROXY_TARGET` in `app/vite.config.js` — the sandbox browser could not
  reach the internet, so `vite preview` proxied Supabase from Node. Locally,
  leave it unset.
- The local-woff2 screenshot pattern in the docs — the sandbox browser could
  not load Google Fonts, so screenshot runs injected downloaded font files.
  Locally, fonts just load.

Screenshots locally use whatever Chromium Playwright installs
(`npx playwright install chromium`); the hardcoded `/opt/pw-browsers/...`
paths in any older script are sandbox-specific and should be dropped.
