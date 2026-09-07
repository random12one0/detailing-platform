# Standing work — what to do so a session never stops

Written 2026-09-07, at the owner's ask, in two messages an hour apart:

> *"I need your help on how to make it so you never stop even when you're
> quote unquote done… a plan for after you're done building everything to keep
> doing work infinitely that is actually beneficial."*

> *"Do all the things you said and also make the docs better… read through
> everything, analyse what could be improved to make everything better. Also
> automatically implementing features that you know like 90% will be better.
> Also doing lots of real-time research… browse the web, find some websites the
> majority of people like the look of. Do research on what people say makes
> Claude build better websites and build 5 websites based on that. All without
> my approval… Most important part is you never stop."*

**The hard half of the first sentence is "actually beneficial".** Producing
work forever is easy and worthless; the failure mode is a session that invents
a feature nobody asked for, or writes a fourth document about something already
decided twice. This file is the queue AND the rule that stops that.

## THE COMMAND

```
/loop Follow docs/standing-work.md. Never stop, never wait for me — park anything that needs me and keep going.
```

That is the whole mechanism. `/loop` with no interval puts the session in
**dynamic mode**: at the end of every turn it schedules its own next wake-up,
so finishing a piece of work starts the next one instead of ending the
conversation. It survives nothing — close the terminal and it stops — so the
line above is the thing to re-paste, and it points at this file rather than at
anybody's memory of what to do.

---

## 1. HIS STANDING PERMISSIONS, 2026-09-07

These change what a session may do on its own. They are permissions, not
instructions to find work to spend them on.

**BUILD WHAT YOU ARE ~90% SURE IS BETTER, WITHOUT ASKING.** *"Automatically
implementing features that you know like 90% will be better."* This overrides
the older "no unrequested features" rule for improvements at that confidence.
The bar is real: 90% means you can say in one sentence what is worse today and
how you will know the change fixed it. If the honest number is 60%, it is a
line in `docs/overnight-log.md`, not a commit.

**FOUR CARVE-OUTS SURVIVE THE PERMISSION** — they are about damage, not taste,
and none of them is a thing he was asked to approve:

1. **Never re-open a decision he has made** or redesign something he has
   approved. `demo@demo.com` / `demo` is the standing example: a session that
   "improves" it locks him out of his own back office.
2. **Never write to the live business project** `adtlnvihwrcqcasqcjwd`. Reads
   only. Never deploy to the `andrewsauto` Netlify site.
3. **A push to `main` IS a publish.** He has given standing permission, so the
   question is not "may I" but "is it needed" — and the commit has to say why.
4. **Migrations stay append-only, and `reference/` stays read-only.**

## 2. The order of precedence

Never skip a rung while one above it has anything in it.

1. **`docs/roadmap.md` — the next unchecked item.** The roadmap is the plan
   (CLAUDE.md). If something there is unticked and unblocked, it is the work.
2. **Anything red or unfinished.** A failing suite, a stale deploy, a sweep
   reporting a geometry problem, an item built but not committed. See § 4A —
   this is the pass that pays most often.
3. **`docs/overnight-log.md` — anything he has since ANSWERED.** An answer
   sitting unread in that file is the cheapest work in the building.
4. **The five recurring passes in § 4.** Rotate; never the same one twice
   running.
5. **`docs/ideas.md` entries marked `[~]`** — he said yes and no item exists.
   Write the roadmap item first; never build straight off an idea.
6. **Say the work has run out.** § 6.

## 3. The three tests for self-chosen work

Adapted from `docs/cloud/README.md` § 6, which was written for a session with
no database and no browser. All three must be yes.

- **Can it be FINISHED here?** Not started, not sketched — finished, with its
  check, in this session.
- **Can it be CHECKED here?** If the only way to know it works is to ask him,
  it is not this session's work. Something built and unverified is worse than
  something not built: it looks done.
- **Would HE recognise it as the next sensible thing?** If explaining why you
  did it takes a paragraph, it is not it.

## 4. The five recurring passes

These never run out, every one is verifiable here, and every one has already
caught something real.

### A. Run the whole battery and fix what is red

The full list is CLAUDE.md § Verification. **This is the highest-yield pass in
this file and the least interesting**, which is exactly why it gets skipped. On
2026-09-07 it recovered two suites — `timezone-and-slots` and
`ics-and-notifications` — that roadmap 8.4 had broken that morning: 8.4 fixed
three fixtures of that shape, these two were never re-run, and both sat red in
the standing gate for hours.

Includes `check-deployed.mjs` (what is RUNNING drifts from the repo silently
and every test that reads SOURCE passes while it does), the credential-free
suites, the env-backed ones, `accent-sweep`, `sweep-widths --all`,
`sweep-booking-steps` and `e2e-booking`.

### B. Baseline a check that has never been baselined

**A check nobody has deliberately broken is a check nobody knows works.** This
repo has shipped at least six that tested nothing: a slice on an id that did
not exist, a regex matching a file's own comment about the thing it checks for,
`indexOf` finding an IMPORT rather than the code, an ordering check that was
greenest with its subject deleted, a raw backspace inside a pattern, a
sentence-presence check that passed because a hidden preheader said it too.
**Every one was found by breaking what it guards, and none by reading it.**

Take one suite. Break each rule it claims to protect, one at a time, restore in
a `finally`, and assert that the check NAMING that rule is the one that goes
red. Anything that misbehaves is either vacuous or mis-documented, and both are
worth the hour. Keep the baseline script in the scratchpad, not the repo.

### C. Check what the docs CLAIM against what the code DOES

**The most repeated defect in this repository is a file confidently describing
something that stopped being true.** Seven stale counts have been found in
CLAUDE.md alone; a roadmap gap-list named four gaps of which one had been fixed
a week earlier and copied forward unread; PROJECT-STATE has twice called a
built thing missing.

Pick a claim — a count, a list of call sites, "X is the only place that Y", a
figure like *39px spare* — and MEASURE it. Correct the file, and say IN the
file how it was measured, so the next session does not measure it again.

**And this is the pass his "make the docs better" belongs to.** Better means
shorter and truer, never longer: CLAUDE.md is past 2,500 lines and DECISIONS.md
past 11,000, and the cost of that is a session that cannot find the paragraph
that would have saved it. Prefer deleting a superseded sentence to adding one
qualifying it — except where the reversal is the load-bearing part, which is
the one case DECISIONS.md says to mark rather than delete.

### D. Look at a screen, at his widths

1920 / 1440x900 / 768x1024 / 392x844, and `?lite=1`. **Three real defects on
2026-09-07 were found by looking at a picture and none by any test**: a heading
that landed in the middle of its own list, a placeholder cut off mid-word,
spinner arrows on the one money field in a form. No check here can see any of
those, and the width sweep is blind to text painted over a control by design.

Send him the PNGs — `SendUserFile` reaches his phone; a description does not.
392 first, because that is the shape he is holding.

### E. Research, on the live web

His words: *"lots of real-time research."* The two he named:

- **What sites people actually like the look of.** Not a design blog's opinion
  — what a majority responds to. Write it down with sources in
  `docs/design-knowledge.md`, and be specific about what TRANSFERS to a
  detailer's site and what does not.
- **What people say makes Claude build better websites**, and then **five
  websites built from that finding.** They go in `docs/tenant-sites/`.

**THIS IS AN OVERRIDE AND THE FILE IT OVERRIDES SAYS SO.** CLAUDE.md's design
section says not to attempt tenant sites again, because two attempts burned on
guessing his taste and *"a fourth guess is how this item already burned two."*
He has now asked for a fifth attempt — but **research-led rather than another
guess**, which is exactly what that entry said was missing. So: do the research
FIRST, write down what it found, and only then build. Five that are genuinely
unalike; three agents given one brief produced one family last time, and
varying the palette while keeping the skeleton is not variety.

**The three existing pages in `docs/tenant-sites/` are the STRUCTURAL range and
NOT the taste reference** — he said they *"look very AI"*. Do not rebuild them
and do not copy them.

## 5. What is NOT standing work

- **A refactor.** Smallest possible diff; no unrequested renames.
- **A fifth document about something already decided.** If a decision is in
  `DECISIONS.md`, the work is to EXECUTE it, not restate it.
- **Anything that needs him.** Park it in `docs/overnight-log.md` with a
  recommendation and carry on with everything that does not depend on the
  answer. **Never block.**
- **A feature below the 90% bar.** That is a line in the overnight log.

## 6. The stop rule

**Two self-chosen iterations in a row that produce only documents means the
work that fits here has run out.** Say so plainly, list what is left and what
each piece needs from him, and stop. A session that manufactures work to avoid
saying that is worse than one that stops — it fills the repo with things
somebody then has to read and undo.

---

*Kept in the repo rather than in a session, for the reason CLAUDE.md gives:
everything durable is portable markdown, because he expects to move to a
different coding agent.*
