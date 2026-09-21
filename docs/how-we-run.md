# How we run — speed, without giving up the proof

Andrew commissioned two pieces of research. They do not carry equal weight and
this file says which wins where.

- **`docs/operating-system-report-2026-09-16.md` is the constitution.** Its
  finding — *a check can print "clean" having tested nothing, which makes every
  other process unsafe* — is the reason this project is where it is. Its
  week-one sequence is in `ROADMAP.md` § "Adopting the operating-system report".
- **The speed report ("How to Work This Fix List Fast, Cheap, and Unattended")
  is technique.** Most of it is right and is adopted below. **Where the two
  disagree, the operating-system report wins.** Andrew's ruling, 2026-09-16:
  *"we should follow the earlier plan, just with stuff that we found from this
  current research implemented. Not this directly going against what the earlier
  research."*

---

## Read this before running the speed report's kickoff prompt

**It points at a file that is no longer the queue.** The speed report was written
against `detailingplatform-fix-list.md`, which is not in this repo; its numbering
is `docs/audits/fix-list-2026-09-15.md` (**A2**). `ROADMAP.md` **merged A1 and A2
into waves with different numbering, and carries two rounds of Andrew's answers
that the audits predate.** Every item number in the speed report therefore points
at the superseded file.

**Five places where following it literally would undo a decision Andrew has
already made.** The first is not a style question:

| Speed report says | What is actually true |
|---|---|
| § 7 routes **"1.1"** to Opus as *"money, permissions or customer data"* | A2's 1.1 is *"The demo login has owner access to the back office"* — **deliberate, Andrew's own setup, and it must not be "fixed".** `ROADMAP.md` § 0.1 says so in capitals. Combined with § 8's *"Don't ask me anything"*, an unattended session would **lock Andrew out of his own back office.** It comes out before the first real detailer signs up and not before — ROADMAP 12.4 |
| § 3: name test data "FIXLIST TEST…" and **delete it** at the end | ROADMAP 0.3: **flag, don't delete.** ~60 suites sign into the seeded fake business. Deleting it removes the safety net for all 79 items |
| § 8: texting needs **Twilio** | **Telnyx at $0.0040/SMS**, about half Twilio's real cost, one platform number for everybody |
| § 8: the email cap needs **a paid plan now** | **Deferred to ~December 2026.** The audits assumed a hard wall; Andrew has sent 100+ a day with no failure |
| § 8: terms need **a lawyer** | **No lawyer.** *"If you could find the templates, then just edit them."* The rewrite is ours; only the business name is Andrew's |

---

## The one technical disagreement that matters

The speed report's § 3 says: **turn every "Done when" into a Playwright test,
tick the item, move on.**

On its own, **that is the practice that produced a 54/100 product.** A test that
silently matches zero elements passes. This is not theoretical here:

- **Three out of three** red gates in this repo turned out to be stale checks
  rather than real defects (`composition` 11e-iii, and two in `connect`). All
  three were matching a *spelling of the source* that had legitimately changed.
- Certifying **one** tool (`sweep-widths.mjs`) found **five defects in the tool
  itself**, every one a screen silently going unmeasured while the run looked
  healthy. Surfaces measured went 69 → 84.
- The sentinel built to catch that was **itself broken** — it hashed screenshots,
  and this repo's background animates forever, so it could never fire. Only a
  deliberate sabotage found it.

**So a "Done when" test is not finished until it carries the receipt discipline.**
Roughly ten extra lines per file, via `scripts/receipt.mjs`:

1. **Declare how many things you expect to check**, and fail if you checked
   fewer. Zero discovered targets is a failure, never a pass.
2. **Include one deliberately broken case the check must catch** (a canary). If
   it passes, every green verdict beside it is void.
3. **Never let the check grade itself** — `node scripts/receipt.mjs` recomputes
   the verdict from the counts and ignores the word the check printed.
4. **Break it on purpose before trusting it.** A check nobody has watched fail
   is a check nobody has verified.

---

## Adopted from the speed report, unchanged

These conflict with nothing and are in force now.

- **Never wait on a timer.** Already this repo's position — `settle()` in
  `sweep-widths.mjs` waits for the DOM to go quiet, for finite animations to
  finish and for spinners to clear, using the old sleep only as a *ceiling*.
  **Keep `settle()`; do not replace it with `expect().toBeVisible()`**, which
  would lose the "nothing is still animating" guarantee every geometry
  measurement depends on. `npx wait-on http://localhost:5173` for the dev server
  is a real small win and needs no install.
- **Cheapest check first, stop at the first failure.** Type check, then lint,
  then build, then the one browser check for this item — against localhost.
- **Deploy once per Part, and use a preview.** The speed report does not mention
  the cost: a production deploy is **15 credits**, a **deploy preview is zero**
  and is a real link Andrew can open on his phone.
- **Keep output short.** `| tail -40`, and `grep -iE "error|warn" | head -30` for
  builds. Never print a whole log.
- **Read screenshots only on failure, or in one visual pass per Part.** This is
  what `artifacts/sweep-widths/index.html` already is — one page, every screen,
  failures ringed in red. Use the page text or the accessibility tree to read
  content, not a picture.
- **Model per item.** Sonnet/medium for wording and layout; Sonnet/high for
  booking logic and dashboard features; **Opus/high for anything touching money,
  permissions or customer data — and for anything Sonnet has already failed
  once.** (Apply this to `ROADMAP.md`'s numbering, not A2's.)
- **A helper agent for big searches**, so only the summary comes back.
- **`NEEDS ANDREW: <what, and why>`** under an item, then keep going — build
  everything up to the blocking point with the outside service faked. Every such
  line also gets a row in **`FOR-ANDREW.md`**, which is his list.
- **One report per Part**, led by "Nothing for you to do" or "One thing for you
  to do", with the evidence and the link that was checked. No progress updates
  in between.

## Adopted with a change

- **Reduced motion.** The speed report says run everything with
  `reducedMotion: 'reduce'`. **Do not.** This product's reduced-motion path is
  `?lite=1`, it has its own stylesheet rules, and layouts genuinely differ — so
  forcing it everywhere would stop measuring the normal path. `CLAUDE.md`
  requires **both**. Run `--lite` as a second pass, not as a replacement.
  *(Making the site itself honour reduce-motion — final text and prices at once —
  is a good idea and a real product change. It belongs in the roadmap, not in a
  testing-speed rule.)*
- **One task per session, then clear.** Adopted, with Andrew's own framing:
  clear at a **task boundary**, not at a token count. Context is large; the
  reason to clear is that a finished task's detail makes the next one worse, not
  that we are running out of room.

## Not adopted

- **`npx playwright test` and `playwright.config` projects.** This repo has the
  `playwright` **library** driven from plain Node scripts, run by `node --test`.
  There is no `@playwright/test` and no config file. Adopting the runner means a
  second test system beside 62 existing suites — a real change, worth proposing
  on its own, not smuggled in as a speed tip.
- **The `jq`-based Stop hook.** **`jq` is not installed on this machine**, so the
  script fails on its first line — and because the failure path is the *blocking*
  path, it could wedge every session. `.claude/settings.json` also already has a
  Stop hook (`session-ping.mjs`). If a completion gate is wanted later, write it
  in Node, and make it fail **open**.

---

## The reply card — the shape of every reply

**Replaced the status block and the "What's next" block on 2026-09-18.** Both
are gone. They said the same thing the closing paragraph said, so a reply
carrying four sentences of news printed it three times and buried the news in
scaffolding. Andrew's verdict: *"I'm not fully liking the responses I'm
getting… we need to kind of completely rethink this."*

**What he asked it to do**, in his own words: *"I kind of want to know what we
did and what's next… if there's any things I need to decide… but also I have
to be there to prove what you've done"* — and *"instead of just relying on
your word."* That last clause is the one the old format never served.

### The five slots, in this order, every reply

```
**<Headline>** · <where we are> · <anything broken>

| Before | After |
|---|---|
| <what it was> | <what it is now> |

**Look at it** — <the tabs that are open and what to check in them>
  (or **Nothing to look at** — <why> and <how it was proven instead>)

**Your move** — Nothing. (or the one thing, with a recommendation)

**Next up** — Right now <X>. We're changing it so <Y>. By <Z>.
```

### The rules each slot carries

- **The headline is one line and it is scannable.** What happened, how many
  items are left, and whether anything is broken. If something is broken it
  goes here, never further down.
- **Before and After is a TABLE, side by side — his call.** *"The was and now
  could be the table because that could be side by side, whereas other things
  could be bullet pointed."* Two columns, one row per thing that changed.
  Plain words in both cells; a cell nobody can picture is a cell that failed.
- **"Look at it" is the proof slot and it is never skipped.** When the work is
  visual it names the tabs left open and what to check in them. When it is
  not, it says **Nothing to look at** and gives the proof another way — what
  was counted, or which sabotage the check caught. **A missing proof slot
  reads exactly like a passing one**, which is this repo's oldest failure
  applied to prose.
- **"Your move" is Nothing, or one thing.** Never a menu. A decision always
  carries a recommendation and says what happens either way.
- **"Next up" states the FIX, not the problem — his correction, 2026-09-18.**
  *"It should be not as much of a what's up next, like the problem, but it
  should be like what we're fixing… like right now it's this, so we need to
  change it to do this, by doing this."* So never *"5.4, the link-open counts
  that disagree."* Instead: *"Right now the Money screen says none of your
  links were opened while the Business screen says 21 opens, so one of them is
  lying to you. We're going to find out which, and either label them as
  covering different time spans or fix the wrong number."*

### And at a task boundary, the clear prompt goes UNDER "Next up"

**A finished task ends with the copy-paste prompt, handed over without being
asked.** That is the "Handing off" rule below, and the card has a slot for it:
straight after **Next up**, a fenced block he can lift whole.

**THIS WAS MISSED ON THE CARD'S FIRST OUTING, 2026-09-18.** ROADMAP 5.4 was
finished, verified and ticked, the next item was a different task, and the
reply stopped at "Next up" — so Andrew had to ask: *"You forgot the thing that
prompt for me to clear."* The old shape carried it inside "What's next"; the
card replaced that block and the slot went with it. Written down here so the
next rewrite cannot lose it the same way.

**AND IT WAS MISSED AGAIN ON 2026-09-18, IN THE SAME WEEK, BY A SESSION THAT
HAD READ THIS FILE.** Andrew: *"And where's the prompt to clear it then? This
is the second time I forgot. You forgot."* Writing the warning louder has now
failed twice, so here is the mechanical version instead — **the last thing you
do before sending a reply is ask these two questions in order:**

1. *Is the thing I was asked to do finished, verified and written down?* If
   no, there is no prompt and no handoff; keep going.
2. *If yes — is there a fenced prompt under "Next up" in what I am about to
   send?* If no, the reply is not finished. Add it before sending.

Question 2 takes three seconds and catches it every time. Re-reading the
paragraph above evidently does not.

**Only at a boundary.** Mid-task replies carry no prompt — the step is to
continue, and offering a clear with the work half done is how the context that
made it worth doing gets thrown away. The test is the "Handing off" rule
below: the thing is finished and proven, and nothing is outstanding.

### Length

**As short as the news actually is.** The card has no minimum. A turn that
changed one sentence of copy gets a four-line card. Nothing is padded to fill
a slot, and no slot is dropped to save room — if a slot has nothing in it,
that fact is the content ("Your move — Nothing.").

**The detail goes BELOW the card, not inside it**, and only when it exists.
Anything technical — a script, a measurement, a file name — lives under a
heading of its own beneath the card, so he can stop at the card and lose
nothing he needs.

### The closing "Bottom line" paragraph is GONE here, and it took four edits

Andrew retired it on 2026-09-18 — **for this project only**. It existed to
absorb replies that ran to paragraphs; the card removed the reason, so keeping
it would have been the fourth telling of the same news. His ruling: *"just drop
the bottom line here in this project only… but make sure it sticks."*

**Four separate things mandated it, and a fix to any one of them alone would
have left the other three still firing.** All four are done:

| what mandated it | what changed |
|---|---|
| His global `~/.claude/CLAUDE.md`, which says NO EXEMPTIONS | A carve-out naming this project, at the end of that block. Every other project is untouched |
| The `Bottom Line` output style, set globally | This repo's `.claude/settings.json` now sets `outputStyle: default`, which overrides the user setting for this directory only |
| A global `UserPromptSubmit` hook echoing the reminder every single turn | Now runs `~/.claude/hooks/bottom-line-reminder.mjs`, which prints the reminder everywhere EXCEPT a path containing `detailing-platform` |
| Three memory files describing the old shape | Deleted; one `the-reply-card.md` written in their place |

**The hook fails open and was broken on purpose to prove it.** If anything in
it throws, the catch prints the reminder — the safe direction is the old
behaviour, never silence. Sabotaged by making `process.cwd()` throw: the
reminder still came out. It also checks a plain substring rather than
normalising path separators, because the first version's regex was mangled by
the heredoc that wrote the file and the hook died with a syntax error on its
first run — a global hook that crashes is one every project pays for.

**If a future session sees a reply here ending in a Bottom line paragraph**,
something on that list has been reverted. Check all four before re-adding
anything.

## What you say about the other tree expires the moment you say something new

**Two sessions can be in this repo at once, and whoever is directing them is
the only thing keeping their two trees from colliding.** That means every
sentence describing what the OTHER session is doing — "app/src is quiet
right now", "booking.css is on loan to the other session" — is a claim about
a moment, not a fact about the repo. It is true when said and it is not
self-updating. The failure is not forgetting to check; it is repeating a
true sentence after the thing that made it true has changed.

**Rule one: a statement that a tree is quiet expires the instant the next
item is handed out — to EITHER session.** Handing session B a file inside a
tree you told session A was quiet does not revoke what you told A; it just
makes it false. So the correction is not A's job to notice and not B's job
to guess at — it is due the moment the handout happens, in the same breath
as the handout, to whichever session is now holding the stale sentence. If
that correction does not go out, a session doing exactly what it was told is
what breaks a measurement, a commit, or a merge, and it will look from the
outside like that session's mistake.

**Rule two: a lane is described from what has actually been assigned, not
from memory of what was assigned an hour ago.** "I believe app/src is free"
is a guess wearing the clothes of a fact. Before telling any session what is
theirs to touch, look at what is currently out on loan — not what you last
said was out on loan — the same way a session is expected to run `git status`
before trusting its own memory of the tree. If it matters to what somebody is
about to do, go and look; do not answer from recall.

**Inherit this, don't relearn it.** Neither rule is about being more careful
in the moment — the moment always feels fine, which is exactly how a true
sentence outlives the fact it was describing. It is about treating your own
prior statements to a session as data with a shelf life, the same posture
this repo already asks of a session reading a stale document: check it
against the current state before anyone acts on it, including you.

## Driving the browser — he checks it himself, he does not take your word

**Andrew's ask, 2026-09-18:** *"Whenever there's any visual change or anything
that I kind of need to look at, obviously I want everything open that needs to
be open for me to just quickly look at it, analyze, move around and then say
it's good with the direction."*

So **any turn that changes something a person can see ends with his browser
holding only the tabs he needs**, already on the right screen.

- **Open the new tabs first, then close the old ones.** Closing the last tab
  shuts the browser panel itself.
- **Leave nothing else open.** A stale tab from three items ago is a tab he
  has to work out the relevance of.
- **Size them.** One tab at phone width and one at desk width is two tabs, not
  one tab he has to resize. Most visual work deserves both.
- **Say what to look for**, in the "Look at it" slot: what changed on that
  screen, and what "right" looks like.
- **When nothing visual changed, say so plainly** and do not open anything.

## Handing off — never make Andrew ask to clear

**When a task is finished and the next step is a different task, hand him the
clear prompt yourself.** His ask, 2026-09-16: *"Please give me a prompt to clear
when you think it's ready to clear. Like don't make me ask for it."*

**The order matters, and it is his:** *"we've done this, answer these questions,
and then once we've finalized the thing… and there's no more outstanding
questions, then we can move on."*

1. **Finish the thing.** Not "the code works" — verified, ticked, evidence
   written down.
2. **Ask everything still outstanding**, and wait. A question that would change
   the work is a question that blocks the handoff. **Do not roll it into the
   clear prompt** — a question answered after a clear is answered by a session
   that has lost the context that made it worth asking.
3. **Only when nothing is outstanding**, say so plainly and give him a
   **copy-paste prompt** for the next task, in a `bash`-free code block he can
   lift whole.

A decision he has explicitly **deferred** does not block the handoff. Park it in
`FOR-ANDREW.md` and go. Only questions that change *what happens next* block.

The prompt should name the files the next session must read, the one task, and
nothing else. Short enough that he does not read it — he pastes it.

## Git and Netlify — commit freely, push almost never

**Andrew's rule, 2026-09-16:** *"Files being on my computer is completely fine…
The only reason why I don't want to push to Git is because my Netlify is
connected to Git. So anytime we make a change there, it updates to Netlify…
I'm just trying to save credits. I'm on the base plan, $5 a month, and last
month I ran out of credits the last few days."*

**So: do not push. Do not ask to push.** Push only when Andrew has said, for
that specific change, that he wants it live.

### Committing is not pushing, and it costs nothing

Netlify builds on a **push** to the connected repo. A **local commit** never
leaves the machine and Netlify cannot see it. The proof is in this repo: on
2026-09-16 `main` was **five commits ahead of `origin/main`**, and none of them
had ever triggered a build.

So a local commit is free, and it buys two things worth having:

- a labelled point to roll back to when a change turns out wrong;
- a message saying *why*, which is what the next session reads instead of
  guessing from a diff.

**Still: Andrew said don't commit, and that stands until he changes it.** This
section exists so the distinction is on record, not to argue the ruling. Offer a
commit once at a task boundary; if he declines, drop it and do not raise it
again that session.

### If he ever does want to push without a deploy

Three ways, in order of least setup. Verified 2026-09-16.

1. **`[skip ci]` in the commit message.** Anywhere in it. `[skip netlify]` is an
   accepted alias. For a pull request Netlify reads only the **first** commit's
   message, so for a batch put it on the **last** commit.
2. **An ignore command in `netlify.toml`**, which already exists at the repo
   root pointing `base = "app"`:
   ```toml
   [build]
     ignore = "exit 0"   # 0 stops the build, 1 runs it
   ```
   Blunt — it stops *every* build until removed. It does **not** cancel a build
   started by a build hook.
3. **Branch controls in the Netlify UI** — build only from `main`, and push work
   to another branch. Best if pushing becomes routine.

### What costs what

- **Production deploy: 15 credits.**
- **Deploy preview or branch deploy: zero**, and it is a real URL he can open on
  his phone. Prefer it for anything he needs to *look* at.
- **Nothing at all** for local work, which is almost everything.

`CLAUDE.md` § Publishing has the two commands that *measure* whether publishing
is currently working, rather than trusting any note about it.

*Sources: [Netlify — Ignore builds](https://docs.netlify.com/build/configure-builds/ignore-builds/),
[Netlify — deploy skipping](https://www.netlify.com/blog/2018/10/08/get-more-control-over-netlify-continuous-deployment-with-deploy-skipping/).*
