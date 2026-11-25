# Detailing Platform: instructions for any AI agent

This is the one instruction file for this repo. Codex, ChatGPT and Claude all
read it (`CLAUDE.md` points here). Keep it short and current. Do not add
history or "this number said X until..." paragraphs; put those in
`DECISIONS.md` or `docs/gotchas.md`.

The old 909-line rulebook is kept, unedited, at
`docs/archive/CLAUDE-2026-11-25.md`. Open it only to look something up.

## What this is

A booking and business-management SaaS for car detailers. Each detailer (a
"tenant") gets a dashboard, a public booking page, and optionally their own
website and domain. Owner: Andrew, who also runs a real detailing business and
is **not a programmer**. He directs the work. Live site: detailingplatform.com.

## Stack

- Front end: React + Vite, in `app/`.
- Back end: Supabase (Postgres + edge functions in `supabase/functions/`,
  migrations in `supabase/migrations/`).
- Hosting: Netlify. Email: Resend. Payments: Stripe.
- Tests: Node's built-in runner, in `tests/`. Helper scripts in `scripts/`.

## Commands

```bash
npm ci --prefix app                       # install
npm run dev --prefix app                  # dev server on :5173
npm run build --prefix app                # production bundle -> app/dist
node --test tests/*.test.mjs              # all suites (the glob is required)
node scripts/seed-demo.mjs                # demo tenant the suites sign in as
node scripts/build-examples.mjs --dev     # example tenant sites at /ex1../ex5
```

- Credential-free suites (what CI runs; no secrets needed):
  `node --test tests/composition.test.mjs tests/design-contrast.test.mjs tests/landing-pricing.test.mjs tests/route-contract.test.mjs`
- Also run `node --test tests/no-credentials-in-tracked-text.test.mjs` before every commit.
- Many other suites and scripts need credentials from the local `.env` file
  (load it into the shell environment; never print or open it). Without it
  they print `Missing SUPABASE_URL`; that means "did not run", not "broken".
- The full battery shares one seeded demo database, so suites can interfere.
  A red in a full run is a lead, not a verdict: re-run that suite alone.
  Do not run the battery while anything else is looking at the demo tenant.
- A check that found zero targets is a failure, not a pass. If you write a
  check, break it on purpose once to prove it can fail.

## Workflow (full text: `docs/WORKFLOW.md`)

- The work queue is **GitHub Issues**: https://github.com/random12one0/detailing-platform/issues.
  Label `launch` = must be done before the first paying detailer; work those
  first. Label `needs-andrew` = waiting on his decision or a real-world step.
- New bug or idea: open an issue. `ROADMAP.md` is a frozen archive; do not add to it.
- One issue, one branch (`fix/<issue-number>-<short-name>` off `main`), one
  pull request with `Closes #<n>`.
- CI (`.github/workflows/checks.yml`) builds the site and runs the credential-free
  suites. Red means not mergeable. Netlify posts a **deploy preview** link on
  the PR; put that link in your reply so Andrew can look on his phone.
- Merging to `main` updates detailingplatform.com. Do not merge your own PR
  unless Andrew said so for that session.
- Edge functions and migrations go through `scripts/deploy-functions.mjs` and
  `scripts/apply-migrations.mjs` as part of the same issue; afterwards
  `node scripts/deployed-inventory.mjs` must be green.
- The belt / Control Room was deleted on 2026-11-25. Its code history is
  `../archive/belt-final-2026-11-25/belt-staging-all.bundle`. Don't rebuild it.
  The Website Studio and site audit live in `tools/studio-audit/`.

## Hard safety rules

1. **Two Supabase projects.** `kguqylyzgyzfktkfnhjb` is this platform's database
   (fake data, no customers) and is what the local `.env` points at; read and
   write it freely, but say what you are about to write first, because the
   public site reads it. `adtlnvihwrcqcasqcjwd` is presumed to be Andrew's real
   business (andrewsdetail.com): **never write to it**. If you are ever
   connected to a project that is not `kguqylyzgyzfktkfnhjb`, stop and ask.
2. **The Supabase MCP connector is a different credential from `.env`.** It
   lists the real business project first and does NOT list ours. A session that
   uses the connector believing it points at this platform is one `project_id`
   away from writing to the real business. Use `.env` and the Management API;
   if the connector is the only way, check its project list first.
3. **No credentials in tracked files.** No password, token or key in any file,
   markdown included; say where it lives, never what it is. Never commit
   `app/.env.production`. `tests/no-credentials-in-tracked-text.test.mjs`
   enforces it. Where each service's key lives: `docs/services-and-secrets.md`.
4. **Migrations are append-only.** Never edit an existing one.
5. **`reference/` is read-only** (the old site, kept as canon).
6. **Consequential writes go through edge functions**, not the browser client.
7. **Every realtime channel is private**: `supabase.channel(...)` must be opened
   with `{ config: { private: true } }`. A channel without it is authorised by
   nothing; any anonymous client can read another tenant's messages.
8. **Commit with explicit paths**: `git commit <path> ...`, never a bare
   `git commit`, because a bare commit takes the whole shared index. Read
   content back with `git diff <path>` (it never touches the index). Do not
   leave `ROADMAP.md`, `DECISIONS.md`, `FOUND.md` or `FOR-ANDREW.md` dirty
   between turns; if one is dirty and the changes are not yours, stop and say so.
9. **Publishing.** `.githooks/pre-push` runs `scripts/deployed-inventory.mjs`
   and refuses a push to `main` when the server is not running this checkout.
   `SHIP_WITH_DRIFT=1 git push` is Andrew's override only; never use it
   yourself. Enable the hook on a fresh clone with
   `git config core.hooksPath .githooks`. A production deploy costs 15 Netlify
   credits; deploy previews cost zero, so prefer previews.
10. **Do not change the live database's structure** except through a migration
    that is part of an issue. Experiment on a throwaway local copy.

## Conventions

- **American English** in everything a person reads (color, license, tires).
  Two data exceptions: `"cancelled"` is the database's own value, and
  `"colour"` is a stored setup-step key. Do not rename them.
- **Changing an English string means changing its Spanish key in the same
  edit.** `app/src/lib/strings/appEs.js` is keyed on the English text; a
  renamed string silently falls back to English. `node scripts/i18n-survey.mjs`
  finds them.
- `app/src/book/core.js` has **no `import` statements** and must stay that way
  (the booking rules, droppable into a tenant's own site). New booking rules
  go there.
- Reach for `app/src/components/controls.jsx` (`Setting`, `Switch`, `Segmented`,
  `Stepper`, `MoneyField`, `Group`, ...) before writing a component.
- One formatter each, in `app/src/lib/format.js` (`money`, `time12`, `duration`,
  `dateLong`, `localDate`, `localTime`). Add new formatters there.
- Two to five mutually exclusive choices is a **segmented control**, never a
  native `<select>` (a searchable list like the timezone picker is exempt).
- Appending to `DECISIONS.md` means adding your line to its index in the same
  edit (`node scripts/decisions-index.mjs` exits 1 if you forget). Mark
  superseded entries; do not delete them.

## Design absolutes (system: `docs/design-system.md`)

- Reference rendering: `docs/design-directions/5-the-thread.html`. Where the
  document and that page disagree, the page is right.
- **44px of real hit area** on every control. A small mark (a 7px dot) keeps
  its size and grows its target with an `::after` negative inset.
- **Phone first.** Most views are on a phone. Design at 390px, then widen;
  320px is the narrowest supported width. A phone stays portrait.
- Check by looking: screenshot 1440x900, 768x1024 and 390x844, read the
  browser console at each. Never say "should look good"; say what you saw.
- Anything that opens or animates in ships its exit in the same change
  (`hooks/useLeaving.js`).
- **Never-defaults**: Inter/Roboto/Arial/system-ui/Space Grotesk as a design
  choice, purple-blue gradients on white, three evenly spaced cards, numbered
  markers on non-sequences, "modern and clean" copy, never a gray placeholder
  box (ask Andrew for an image instead).
- Voice: short declarative sentences, one fact each. No exclamation marks,
  nothing "seamless" or "effortless".
- Before calling a screen finished read `docs/screen-rules.md`; for what Andrew
  likes read `docs/TASTE-NOTES.md`.

## Talking to Andrew

- Plain English, short sentences. Define any technical term the first time.
- Say what happened, what he must DO (name it concretely, or "Nothing"), and
  what he must DECIDE with your recommendation and what happens either way.
- Show him the deploy-preview URL, not screenshots. He does not take your word
  for it; give him something to open.
- If two documents disagree, say so rather than quietly picking one.

## Where to look (open only what the work touches)

| File | What it is |
|---|---|
| `docs/WORKFLOW.md` | How work happens now |
| `BUSINESS-RULES.md` | The product's business rules |
| `docs/design-system.md` | The design system |
| `docs/gotchas.md` | How measurements lie in this repo; read before trusting a printed number |
| `docs/services-and-secrets.md` | Every third-party service and where its key lives (never the value) |
| `DECISIONS.md` | Every judgment call and why. Start at its index; never read it end to end |
| `FOUND.md` | Known problems parked |
| `FOR-ANDREW.md` | Things only the owner can do |
| `docs/archive/CLAUDE-2026-11-25.md` | The old long rulebook |
