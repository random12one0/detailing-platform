# ECONOMY — nine rules for spending Andrew's usage

**Written 2026-09-13.** Every rule here was paid for by a session that broke it.
Usage is the scarce thing in this project — not ideas, not time. A session that
does the right work twice has done half the work.

---

## 1 · CHECK THE LEDGER BEFORE YOU CHECK THE PRODUCT

`docs/VERIFIED.md` records what has been proven, when, at which commit, and which
paths would invalidate it. **Run the row's `git diff --name-only` first.** Empty
output means the answer is already known and re-measuring buys nothing.

The expensive version of this mistake is not a wasted check — it is a **withdrawn
finding reported for a second time.** Five of those are in § 2 of the ledger by
name for exactly that reason.

## 2 · WRITE A FINDING DOWN ONCE AND POINT AT IT

A fact belongs in one file. Retyping it into a brief, a handover and a commit
message creates three copies, and **the copy nobody maintains is the one the next
session reads.** That has already happened here with a branch name, a check count,
a deploy rule and a password.

So: the finding goes in `FOUND.md`, the next task goes in `ROADMAP.md`, the rule
goes in `CLAUDE.md`, and everything else **cites** it in one line.

## 3 · READ THE SMALLEST THING THAT ANSWERS THE QUESTION

`docs/START-HERE.md` instead of four long files. One `CLAUDE.md` section instead
of `CLAUDE.md`. One roadmap item instead of the roadmap. `grep` for the symbol
instead of reading the file it lives in.

**Measured:** `CLAUDE.md` + `ROADMAP.md` + `FOUND.md` + `docs/BAR.md` is **49,131
words** — about 95% of a fresh session's clear threshold, spent before any work
begins, and paid again at every clear. `START-HERE.md` is 1,730.

## 4 · CLEAR AT A FINISHED SECTION, NEVER AT THE CEILING

**An auto-compaction costs a whole extra pass** — a machine picks what survives,
under pressure, at an arbitrary moment, and the thing most likely to be dropped is
the spec that was mid-flight. Then somebody re-derives it.

A clear at a boundary costs nothing, because everything that matters is already on
disk. **You cannot clear yourself**, so the protocol is: name the boundary, print
the context figure, stop. *"If a wave is long enough to compact, it is long enough
to have been two waves."*

## 5 · TWO SESSIONS IS THE CAP

Two self-chosen iterations in a row producing only documents means the work that
fits has run out. **Say so and stop.** A session that manufactures work to avoid
saying that is worse than one that stops, because somebody then has to read and
undo it.

## 6 · DO NOT VERIFY WHAT THE CHANGE COULD NOT HAVE TOUCHED

A migration does not need a width sweep. A copy edit does not need a contrast
pass. A lane C change does not need the dashboard photographed.

**The question is which surface the diff can physically reach**, and the answer is
usually narrower than the battery. `CLAUDE.md` § Verification's table is keyed on
*what you changed*, not on *what could be run*. The battery is the most expensive
thing in a session, so start the long check and **write prose while it runs — never
source.**

## 7 · PROVE THE INSTRUMENT ONCE PER SESSION, AND COUNT SUBJECTS EVERY RUN

**A green result from an unchecked instrument is worth less than no result,
because it stops the search.** Break it on purpose once, at the start, then trust
it for the session.

**And count rather than match, every single run.** This repo has passed checks
with half their subjects broken, passed 22 screens it never visited, and printed
*clean* over 38 real findings. A guard that skips must PRINT that it skipped — a
skipped check reads exactly like a passing one.

## 8 · GIVE THE ANSWER, NOT THE JOURNEY

Andrew reads the bottom line. **What you found, what he must do, what you
recommend.** Not the four things you ruled out, not the reasoning that got there,
not a tour of the files you opened. The reasoning goes in the repo where it is
free to store and free to skip; the chat carries the conclusion.

Corollary: **never hand him a decision without what he needs to make it, in about
one paragraph** — what the thing is, what happens either way, and your
recommendation. "Your call" is an unfinished sentence and costs a whole round trip.

## 9 · A QUESTION STOPS THE QUESTION, NOT THE SESSION

Park what needs him, carry on with everything that does not, and put the ask in a
file as well as in the message. An answer that exists only in the chat has not
been captured — it dies at the next clear and gets asked again.

---

## THE ONE-LINE TEST

**Before any expensive action: is this answer already written down, and could this
change have broken the thing I am about to measure?** Two no's and it is worth
doing.
