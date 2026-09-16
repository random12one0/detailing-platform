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

**THERE IS A TOOL NOW, AND THERE IS A TOOL BECAUSE THE CONVENTION FAILED —
2026-09-10.** `node scripts/lane-check.mjs <lane>` lists every file you have
touched that is outside your own lane, and names the lane each one belongs to.
**Run it before `git add`, every time.** With no argument it prints the table
and exits 2, which is also the fastest way to answer *which lane am I*.

---

## THE INCIDENT THIS FILE NOW EXISTS TO PREVENT — 2026-09-10

**A session opened as A (websites) built roadmap 2.20 stage 3.** Nine files
across `app/src`, `supabase/` and `tests/` — B's lane and C's lane at once —
while another session was genuinely running and committing into the same tree.
The two sets of commits are interleaved in the log.

**The work was correct and it was still wrong**, and the owner's own words are
the reason: *"this agent should only be used to be making websites."* A session
that does another lane's item is not just risking a collision — it is doing
work he did not ask that session for, and the session he DID open for it now
finds the item done in a way it never saw.

### Four causes, and only one of them is the session's own fault

**1 · THERE ARE TWO PROMPT SYSTEMS AND THEY DISAGREE.** `CLAUDE.md`'s Process
section says every clear ends with a hand-over prompt filled from
`docs/roadmap.md` — *"Next: roadmap N.N — …"*. This file says a session starts
with *"Read docs/sessions/<lane>.md and do what it says."* **The roadmap
template had no lane field at all**, and it is the one that actually gets used,
because `CLAUDE.md` is loaded into every session automatically and this file is
not. So the previous session, finishing correctly, wrote a hand-over that named
an ITEM and not a LANE. **Fixed: that template now opens with the lane, and
`CLAUDE.md` says a prompt without one is not a valid prompt.**

**2 · `CLAUDE.md`'s POINTER HERE WAS CONDITIONAL ON SOMETHING A SESSION CANNOT
KNOW.** It read *"IF YOU ARE ONE OF THREE SESSIONS RUNNING AT ONCE, read
docs/sessions/README.md."* **A session cannot tell how many other sessions are
open** — there is no signal for it, and the one clue that did arrive (port 5173
already in use) reads as a stale dev server. A conditional nobody can evaluate
is a rule that never fires. **Fixed: it is unconditional now.**

**3 · `websites.md` DID NOT DECLARE ITS OWN BOUNDARY.** `product.md` and
`build.md` both open by naming what they own and what they must never touch;
`websites.md` opened with the design-sheet rule and mentioned its boundary once,
seventy-nine lines down, in passing. **Fixed: all four briefs now open with the
same block.**

**4 · AND THE SESSION READ THE TABLE AND ARGUED PAST IT.** This is the worst of
the four and the one no document can fix. It opened this file mid-run, saw the
ownership table, and reasoned: *"my work spans lane B and lane C — that's fine,
I was given the whole item."* **It was not fine.** The correct move, the moment
the prompt named an item outside the lane, was to stop, say so, and ask.

**So the stop rule below is written as an instruction to REFUSE, not as
guidance to consider** — because "consider your lane" is exactly what happened.

## THE STOP RULE — read this before you write a single file

**IF THE PROMPT NAMES WORK OUTSIDE YOUR LANE, DO NOT DO IT.** Not a smaller
version of it, not "just the part in my folder", not "it is one file". Say
which lane it belongs to and stop. The owner opens a session per lane; there is
already a session for it, or he will open one.

**IF THE PROMPT DOES NOT SAY WHICH LANE YOU ARE, ASK BEFORE YOU WRITE
ANYTHING.** Reading is always fine. `node scripts/lane-check.mjs` prints the
four options. **Do not infer the lane from the task** — that is circular, and
it is how a roadmap item becomes a licence.

**THE OWNER CAN OVERRIDE THIS AND OFTEN WILL.** He is the manager. If he tells
you directly to touch another lane's files, do it — **and say so in the commit
message**, because the next session reading that commit otherwise reads a
breach and may try to undo it.

**ONE EXCEPTION THAT NEEDS NO PERMISSION: your own lane's brief.** If you learn
something that belongs in `docs/sessions/<your lane>.md`, write it there.

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
| **M** | **Manager** — `manager.md` | `CLAUDE.md`, `docs/README.md`, `docs/roadmap.md`, `docs/OUTSTANDING.md`, `docs/overnight-log.md`, `docs/sessions/`, `PROJECT-STATE.md`, `DECISIONS.md`, **`.claude/` and `scripts/lane-check.mjs`** — the two that govern how the other lanes behave | **Everything else.** It reads, it does not build. |
| **A** | **Websites** — `websites.md` | `docs/tenant-sites/`, `docs/TASTE-NOTES.md`, `docs/design-*`, `scripts/build-examples.mjs` | `app/src`, `supabase/`, `tests/` |
| **B** | **Product** — `product.md` | `app/src/**` — **exclusively** | `supabase/`, `docs/tenant-sites/` |
| **C** | **Build** — `build.md` | `supabase/**`, `tests/**`, `scripts/**` (except build-examples), `docs/**` (except A's and M's) | `app/src`, `docs/tenant-sites/` |

**THE TABLE ABOVE IS PROSE AND `scripts/lane-check.mjs` IS CODE — WHERE THEY
DISAGREE, THE SCRIPT WINS**, because the script is what a session actually runs
and prose cannot be executed. It holds the same list with the exact path
prefixes; `node scripts/lane-check.mjs` with no argument prints them. **Edit
both in the same change**, and if you only have time for one, edit the script.

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

**EVERY ONE OF THEM NAMES THE LANE, AND THAT IS THE POINT OF THEM.** A prompt
that names a roadmap item instead is what caused the 2026-09-10 incident above.
If you find yourself pasting anything else, put the lane in front of it.

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

## Every session ends its responses with a "Bottom line" paragraph

**His ask, 2026-09-08:** *"one paragraph at the bottom that has all the
information I need… so I don't have to read any of the rest of this stuff."*

**It is enforced in three places on purpose, because a rule read once at
session start is a rule that drifts by turn forty:**

1. **The `Bottom Line` output style** (`~/.claude/output-styles/`) — in the
   system prompt of every turn, so it survives a `/clear` and a summarization.
2. **A `UserPromptSubmit` hook** in `~/.claude/settings.json` — re-injects the
   rule on every message he sends. Belt and braces.
3. **`~/.claude/CLAUDE.md`** — the portable copy. Works in any folder, on any
   project, and for a coding agent that is not Claude Code.

**All three are GLOBAL, not in this repo**, so a brand-new project in a
different folder gets it with no setup.

**What the paragraph must contain:** what happened · what HE must do (or the
literal words *"Nothing for you to do."*) · what he must decide, with your
recommendation · anything broken or risky · what is next. Plain English, one
paragraph, 40–120 words, no jargon, self-contained.

## The five rules all three share

1. **Commit often, and commit only your own folders.** `git add <your paths>`,
   never `git add -A` — that stages the other sessions' half-finished work.
   **And run `node scripts/lane-check.mjs <your lane>` first**, which is the
   one command that answers whether rule 1 and rule 3 actually held. It reads
   git, writes nothing, and names the lane every stray file belongs to.
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
