# Working on this repo from Claude Code on the web

> ## IF THE OWNER JUST SAID "FOLLOW `docs/cloud/README.md`", THIS IS YOUR WHOLE BRIEF.
>
> He is away from his computer and will not be steering. Do this, in order:
>
> 1. **Read this file to the end.** §1 is five things this environment cannot
>    do, and every one of them removes a kind of work. Do not skip it.
> 2. **Read `../../CLAUDE.md`.** It is the project's law and it outranks
>    anything here except §1.
> 3. **Open `QUEUE.md` and take the FIRST TASK WHOSE BOX IS NOT TICKED.**
>    Follow its PROMPT block as if he had typed it.
> 4. **Do that one task and stop.** One task per session — the cloud has no
>    `/clear`, so a new session from the sidebar is how you get a clean one.
>    Tick the box and open the PR in the same breath (§4 says what the PR must
>    say).
> 5. **If every box is ticked**, go to §6, *When the queue runs out*. Do not
>    ask him what to do next; he cannot answer.
>
> **The one thing you must never do:** open a pull request against `main`. A
> push to `main` publishes the live site. Everything targets
> `claude/superbase-access-anj1h7`.

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
of the **twelve** credential-free checks imports anything outside `node:` and
this repo. They run on a bare clone. (Eleven until roadmap 2.20 stage 2 added
`tests/platform-billing.test.mjs` the same day — it imports two `_shared/*.ts`
modules directly, which Node 24 type-strips, so it stays credential-free and
runs here. **Anything under `_shared/` that a test imports must therefore stay
strippable and must not touch `Deno` at module scope**: a TypeScript parameter
property and a top-level `Deno.env.get` each broke that once on the day it was
written.)

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
| **The twelve credential-free checks** | zero install, no network, no browser. This is the real safety net |
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

---

## 6. WHEN THE QUEUE RUNS OUT — choosing your own work

Every box in `QUEUE.md` is ticked and the owner is still away. **You may pick
your own task. You may not pick any task.** What follows is the whole of the
permission.

### 6a. THREE TESTS. A task needs all three, and you write the answers down in
the PR before you start.

1. **CAN IT BE FINISHED HERE?** If the definition of done includes applying a
   migration, deploying a function, seeing a screen, or asking the owner
   something — it cannot. That is not a reason to do a worse version of it.
   Write what you worked out into a document, say what the laptop has to do,
   and that is the task.
2. **CAN IT BE CHECKED HERE?** Name, *before* you start, which of the checks in
   §2 would go red if the work were wrong. **If the honest answer is "none of
   them", then it is a document, not a change** — so write the document instead
   of the change. This is the rule that keeps an unattended session from
   shipping something plausible and unverifiable.
3. **WOULD HE RECOGNISE IT AS THE NEXT THING?** It has to trace to a line
   somebody already wrote: an item in `docs/roadmap.md`, an entry in
   `docs/open-threads.md`, a `ponytail:` comment, or a *"still open"* block in
   a doc. **Never invent a feature.** He is not here to say no, and "I thought
   it would be useful" is how an unattended agent spends three days on
   something nobody wanted.

### 6b. WHAT TO REACH FOR, in this order

1. **Anything `docs/open-threads.md` marks as blocking launch that is not
   code** — a decision that needs writing up, a document that contradicts
   another, a policy nobody has written.
2. **A check that cannot see its own failure.** This repo's most repeated
   defect is a green check with no subjects. Take one existing suite, break
   what it guards, confirm it goes red, put it back. If it stays green, that is
   a real finding and the fix is a task of its own.
3. **A fact in a document that a script can prove stale.** Every count, every
   "13 settings screens", every "eight suites". Run the thing, correct the
   prose. CLAUDE.md has had four of these.
4. **A `ponytail:` deferral whose stated ceiling has actually been reached.**
   The comment names the ceiling; check the code against it.
5. **Reading work the roadmap already asks for** — a research doc, an audit, a
   comparison. This environment is unusually good at it and the laptop is
   unusually bad at finding time for it.

### 6c. WHAT IS OFF LIMITS, whatever the reasoning

- **Any screen, any stylesheet, any animation.** `theme.css`, `booking.css`,
  `landing.css` and every `.jsx` that draws something. You cannot look at it,
  so you cannot change it. This is §1b and it has no exceptions.
- **Anything touching a payment key, a webhook, a credential, or roadmap
  2.20.** `security-review` is not optional on those and it needs a human.
- **`main`.** Ever. Not a PR, not a push, not a rebase.
- **Editing an existing migration.** They are append-only.
- **Adding a dependency.**
- **A second task in the same session.** Finish, PR, stop.

### 6d. WRITE DOWN WHAT YOU CHOSE

**Append it to `QUEUE.md` as a ticked entry**, under a heading
`## Chosen by a cloud session — <date>`, with three lines: what you did, which
check covers it, and what the laptop still has to run. The queue is the record
of what happened while he was away; a task that only exists in a session
transcript is a task he will never find.

### 6e. THE STOP RULE

**If two self-chosen sessions in a row produce only documents and no verified
change, stop choosing.** Write one final note at the top of `QUEUE.md` saying
so, and leave the rest for the laptop. That pattern is the signal that the work
which fits this environment has run out — and three days of documents nobody
asked for is worse than two days of work and a quiet Sunday.
