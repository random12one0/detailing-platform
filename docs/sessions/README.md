# Three sessions at once — how to run them without them fighting

**Written 2026-09-08, at his ask:** *"I wanna take advantage of running multiple
different Claude agents at the same time… different sessions that are both
working in our same folder to kind of do two things at once."*

**It works, and it has already happened here by accident.** On 2026-09-08 two
sessions ran in this repo without either knowing about the other, and it went
fine — but only because one happened to be in `scripts/` and `docs/` while the
other was in the edge functions. `docs/OUTSTANDING.md` § 7 is the account.

**THE ONE RULE THAT MAKES IT SAFE IS A CONVENTION, NOT A TOOL: each session
owns a set of folders and never writes outside them.**

## Why it matters more than it sounds

A browser sweep in this repo takes about nine minutes, and **any write to
`app/src` while one is running makes Vite reload the page underneath it.** The
run does not fail — it finishes and prints `clean`, having measured a screen
that navigated away mid-walk. **A green run that measured nothing is this
repo's oldest failure mode.** `scripts/source-guard.mjs` names the file
afterwards, which is how you find out; the ownership rule is how you avoid it.

## The three lanes

| | Session | Owns (writes here) | Never touches |
|---|---|---|---|
| **M** | **Manager** — `manager.md` | `CLAUDE.md`, `docs/README.md`, `docs/roadmap.md`, `docs/OUTSTANDING.md`, `docs/overnight-log.md`, `docs/sessions/` | **Everything else.** It reads, it does not build. |
| **A** | **Websites** — `websites.md` | `docs/tenant-sites/`, `docs/TASTE-NOTES.md`, `docs/design-*`, `scripts/build-examples.mjs` | `app/src`, `supabase/`, `tests/` |
| **B** | **Product** — `product.md` | `app/src/**` — **exclusively** | `supabase/`, `docs/tenant-sites/` |
| **C** | **Build** — `build.md` | `supabase/**`, `tests/**`, `scripts/**` (except build-examples), `docs/**` (except A's and M's) | `app/src`, `docs/tenant-sites/` |

**Nothing overlaps.** M holds the plan and the record and writes no product
code. A works on static HTML files that no test reads. B is the only writer of
the React app. C is the only writer of the database, the edge functions, the
tests and the rest of the docs.

**There is exactly one manager and it is a long-running conversation** — it is
not cleared at a work boundary the way a building session is. **Anything he does
outside this repo** (Google, Stripe, Netlify, Resend, the bank, the CPA)
**goes to the manager**, which writes it into the file it belongs in and
unblocks whichever lane was waiting. A defect he can see on a screen goes
straight to the lane that owns that screen.

## Starting one

**Open a NEW session in this same folder — do not fork an existing one.** A
fork carries the other conversation's whole context in with it, so a builder
starts with a manager's head full of analysis instead of a clean read of its
own brief, and the tokens it needs for the actual work are already spent.

Then paste one line. That is the whole thing.

```
Read docs/sessions/websites.md and do what it says. Start by interviewing me.
```
```
Read docs/sessions/product.md and do what it says. Start with the public pages.
```
```
Read docs/sessions/build.md and do what it says.
```
```
Read docs/sessions/manager.md. You are the manager for this project.
```

## The five rules all three share

1. **Commit often, and commit only your own folders.** `git add <your paths>`,
   never `git add -A` — that stages the other sessions' half-finished work.
2. **`git pull --rebase` before you commit**, because the others are pushing.
3. **Never revert, restage or tidy a file you do not own**, committed or not.
   If it looks wrong, say so; do not fix it.
4. **Write your findings into a NEW dated file**, not into `CLAUDE.md`, which
   the others may have open with uncommitted edits.
5. **Only ONE session runs the dev server** (`npm run dev` on :5173) — that is
   **B**. A drives `file://` pages and needs no server; C runs node tests and
   edge-function deploys and needs no browser.

## The one thing that is genuinely shared and cannot be split

**The Supabase project `kguqylyzgyzfktkfnhjb` is one database.** C applies
migrations to it and B's browser reads it. So:

- **C says in chat before it applies a migration or deploys a function.**
- **B re-runs `node scripts/check-deployed.mjs` after C says it deployed** —
  otherwise B's green suites were green against the old copy.
- **Resend's daily cap is shared too** (see `docs/verification.md`). A session
  that books repeatedly spends it for everybody; `e2e-booking` costs ~5 emails
  a booking. If the email leg goes red with `daily_quota_exceeded`, that is not
  a regression and there is nothing to bisect.

## If you need two sessions in ONE lane

Do not share the tree. Use a git worktree — a second checkout of the same repo
in its own folder, so two sessions can edit the same files with no collision
and you merge at the end. Ask the session to set it up; it is one command.
