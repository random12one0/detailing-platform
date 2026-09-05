# Working on this repo from Claude Code on the web

**Read this file first, then `QUEUE.md`, then `../../CLAUDE.md`.**

This folder exists because the owner is away from his machine for a few days
and wants the project to keep moving. A cloud session runs on Anthropic's
infrastructure with a fresh copy of this repo cloned from GitHub — it is a
different environment from the laptop, and **most of this project's
verification does not exist there.** Everything below is about that gap.

Written 2026-09-05, at the end of roadmap 2.19.

---

## 1. THE FIVE THINGS A CLOUD SESSION CANNOT DO HERE

These are not preferences. Each one removes a whole class of work, and a
session that does not know them will produce a confident, unverifiable diff.

### 1a. It cannot reach the database. At all.

The Supabase credentials live in the repo-root `.env`, and **`.gitignore` line
96 (`*.env`) means that file is not in the clone.** Even with the keys,
`*.supabase.co` is not on the cloud sandbox's default network allowlist —
that list covers package registries, GitHub and the big cloud SDKs, and
Supabase, Resend and Netlify are all absent from it.

**So none of this works in the cloud:** applying a migration, deploying an
edge function, seeding the demo, `scripts/e2e-booking.mjs`, `send-test-emails`,
or any of the eight env-backed test suites (`request-mode`, `booking-engine`,
`staff-roles` and the rest).

**What that means in practice:** a cloud session may WRITE a migration or an
edge function. It may not verify one. Say so in the PR.

### 1b. It cannot open a browser, so it cannot see anything.

Playwright is a devDependency here, but the cloud image ships Node, npm and
`chromedriver` — **not Playwright's browsers**, and their download CDN is not
on the allowlist either. `sweep-widths.mjs`, `sweep-booking-steps.mjs`,
`shoot-dashboard.mjs`, `qr-scans` and `e2e-booking.mjs` all drive a real
browser and all of them are unavailable.

**CLAUDE.md's rule that visual work is verified by LOOKING has no escape
hatch.** A cloud session therefore does not build screens, does not change
`theme.css`, `booking.css` or `landing.css`, and does not touch anything whose
correctness is a layout. Not "carefully" — at all. `QUEUE.md` is built out of
work that has no pixels in it.

### 1c. `npm ci` may fail, and nothing important needs it.

`playwright`'s install step downloads browsers from a host the sandbox blocks.
If a task genuinely needs `node_modules` (only `npm run build --prefix app`
does), install with the download switched off:

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --prefix app
```

**Everything else needs no install whatsoever.** Verified 2026-09-05: not one
of the ten credential-free checks imports anything outside `node:` and this
repo. They run on a bare clone.

### 1d. There is no `/clear`.

This project's process is one roadmap item per session, `/clear` between them.
The cloud has no `/clear` — **the equivalent is starting a NEW SESSION from the
sidebar for each task.** One task per session, exactly as before. Do not take a
second task in a session that has finished one; the handoff is the point.

### 1e. The user-level skills are not there.

`impeccable`, `animate`, `ship-check` and the rest live in the owner's own
`~/.claude`, not in this repo, so a cloud session does not have them. Repo
files — `.claude/settings.json`, and any subagent in `.claude/agents/` — do
come across. This is another reason `QUEUE.md` has no design work in it: the
skill the roadmap names for a new screen is not available and the screenshots
that would replace its judgement are not either.

---

## 2. WHAT STILL WORKS, AND IT IS MORE THAN IT SOUNDS

| | |
|---|---|
| **The ten credential-free checks** | zero install, no network, no browser. This is the real safety net |
| **The production build** | `npm run build --prefix app` — catches every import, syntax and module error a screenshot never would |
| **`gh`** | pre-installed and authenticated through a proxy. **`random12one0/carwebitebooking` (the old live site) is readable**, which is what roadmap 4.1 needs |
| **Reading and writing** | the whole repo, including `reference/`, `DECISIONS.md` and the research docs |
| **Web search** | available; general web FETCHING may be blocked by the allowlist. If a fetch fails, that is the sandbox, not the page |

**The finish line for a cloud session on this repo:**

```bash
node tests/composition.test.mjs
node tests/design-contrast.test.mjs
node tests/landing-pricing.test.mjs
node tests/route-contract.test.mjs
node tests/money-export.test.mjs
node tests/email-brand.test.mjs
node tests/client-list.test.mjs
node tests/plans.test.mjs
node tests/setup-progress.test.mjs
node tests/campaign.test.mjs
node scripts/accent-sweep.mjs
node scripts/render-emails.mjs
node scripts/decisions-index.mjs
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --prefix app && npm run build --prefix app
```

All of them must pass. **If a change cannot be checked by anything on that
list, the change does not belong in a cloud session** — put what you learned
in a document instead and leave the code for the laptop.

---

## 3. THE RULES THAT DO NOT CHANGE

- **NEVER open a PR against `main`.** A push to `main` IS a publish — Netlify
  auto-deploys detailingplatform.com, confirmed by observation. The working
  branch is **`claude/superbase-access-anj1h7`**. Every cloud PR targets that
  branch and nothing else.
- **Append-only migrations.** Never edit an existing one.
- **`DECISIONS.md` gets a section AND its index line in the same edit**, then
  `node scripts/decisions-index.mjs`. This is the check that keeps that file
  usable.
- **Write for a coding agent that is not Claude.** Every durable decision goes
  in plain markdown in the repo, never in a tool-specific mechanism.
- **Explain to the owner in plain language.** He is not a coder. A PR body he
  cannot read is a PR he cannot approve.
- **`reference/` is read-only.** The old site, kept as canon.

---

## 4. WHAT A CLOUD SESSION'S PR MUST SAY

The owner will read these on a phone, days later, out of order. Four
headings, in this order, and the third is the one that matters most:

1. **What changed**, in plain words.
2. **What was checked** — paste the actual output lines, not "tests pass".
3. **WHAT COULD NOT BE CHECKED HERE, and what has to happen on the laptop.**
   Name the exact command. *"Needs `node scripts/apply-migrations.mjs
   <file>.sql` then `node scripts/deploy-functions.mjs create-booking` and a
   `sweep-widths.mjs` run"* is useful; "should be verified locally" is not.
4. **Anything still open** — a question, a judgement call, a thing you would
   have done differently with a browser.

Tick the task's box in `QUEUE.md` **in the same PR**, so the next session does
not pick it up again.

---

## 5. STARTING A SESSION

At [claude.ai/code](https://claude.ai/code), new session, this repository, then
paste the task's prompt from `QUEUE.md` — each one is written to be pasted
whole. Work down the queue in order unless a task's own note says otherwise.

**One optional bit of setup that saves an install every time**: in the cloud
environment's settings, add a setup script of
`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --prefix app`. Nothing in the queue
requires it, but it makes `npm run build` instant instead of a two-minute wait.

**Do not add the Supabase keys to the cloud environment's variables to "unlock"
1a.** They are the platform's service-role credentials — full read and write
over every tenant's customers — and an environment variable is readable by
anything that runs in that environment. Whatever a task seems to need them for,
that part belongs on the laptop.
