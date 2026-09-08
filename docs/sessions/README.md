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
| **A** | **Websites** — `websites.md` | `docs/tenant-sites/`, `docs/TASTE-NOTES.md`, `docs/design-*`, `scripts/build-examples.mjs` | `app/src`, `supabase/`, `tests/` |
| **B** | **Product** — `product.md` | `app/src/**` — **exclusively** | `supabase/`, `docs/tenant-sites/` |
| **C** | **Build** — `build.md` | `supabase/**`, `tests/**`, `scripts/**` (except build-examples), `docs/**` (except A's) | `app/src`, `docs/tenant-sites/` |

**Nothing overlaps.** A works on static HTML files that no test reads. B is the
only writer of the React app. C is the only writer of the database, the edge
functions, the tests and the rest of the docs.

## Starting one

Paste one line. That is the whole thing.

```
Read docs/sessions/websites.md and do what it says.
```
```
Read docs/sessions/product.md and do what it says.
```
```
Read docs/sessions/build.md and do what it says.
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
