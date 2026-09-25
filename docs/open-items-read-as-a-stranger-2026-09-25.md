# The OPEN items, read as a stranger — the successor pass

**Started 2026-09-25, immediately after
`docs/ticked-without-proof-2026-09-25.md` finished all 77 ticked entries.**

---

## FIRST, AN ARITHMETIC DISAGREEMENT, SAID OUT LOUD RATHER THAN QUIETLY PICKED

**The instruction that started this pass was "carry on with the audit, forty-nine
to go."** There are **no ticked items to go.** All 77 were judged and the file
above enumerates every one by line number.

**Counted rather than argued** — `grep -c '^- \[x\]' ROADMAP.md` and its `[ ]`
twin, at commit `931e41c`:

| | |
|---|---|
| `- [x]` ticked items | **77** — all judged |
| `- [~]` deferred | **1** |
| `- [ ] ` open items | **63** |
| of those, written by this session tonight (14.21–14.24) | **4** |
| **open items nobody has read as a stranger** | **59** |

**Fifty-nine is almost certainly the number that was meant** — it is the figure
in this session's own handover (*"25 of 59 open items had no acceptance
criteria"*), and forty-nine is the figure from the running-total correction two
messages earlier. **Recorded rather than silently corrected, because a session
that quietly substitutes its own number for the one it was given is the same
fault as a check that derives its expectation from the thing it is checking.**

**The work is unambiguous either way: the open items are the only unread
population, so this pass reads them.** If forty-nine meant something else, say
so and this pivots.

## THE QUESTION, WHICH IS NOT THE SAME QUESTION AS THE TICKED PASS

A ticked item claims something was done, so the question was *could a stranger
check that claim.* **An open item claims something about the world and about
what closing it would take**, so there are two:

1. **Is what it says about the world still TRUE?** This is the stale-blocker
   sweep's question widened past the blocker line to the whole entry. That sweep
   read 23 blockers on 2026-09-24 and **10 had expired**, so the prior is not
   good.
2. **Could a stranger EXECUTE its `Done when`?** Not *is there one* — the
   appendix above already swept for presence and 25 were written on 2026-09-25.
   This asks whether the criterion names something a person could go and do
   without asking what it meant.

**A third thing gets recorded when it appears: a criterion that is executable
but whose PRECONDITION has quietly stopped holding.** 0.3 is the worked example
below, and it is the shape nobody was looking for.

---

## BATCH 8 — Wave 0, the ten blocker items

| | |
|---|---|
| items in this batch | **10** |
| state still true | **9** |
| **state STALE** | **1** (0.6, and it moved the wrong way) |
| `Done when` a stranger could execute | **10** |
| **criterion whose precondition is decaying** | **1** (0.3) |
| could not judge | **0** |
| **running total** | **10 of 59** |

**The ten:** 0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.3, 0.4, 0.6, 0.7.

**Nine of the ten carry a `Done when` written on 2026-09-25**, which is this
session's own work from earlier tonight, so **that half is marking my own
homework and is reported as such.** What is new here is question 1, and the two
findings below both come from it.

### FINDING 1 · 0.6's HEADLINE NUMBER IS STALE, AND THE DRIFT HAS GROWN — MEASURED TODAY

**0.6's title says `WHAT IS RUNNING IS NOT WHAT IS COMMITTED, ON 22 OF 39 EDGE
FUNCTIONS`, found 2026-09-20.** `node scripts/deployed-inventory.mjs`, run
2026-09-25 against `kguqylyzgyzfktkfnhjb`:

| | |
|---|---|
| functions in the repo / deployed | **39 / 39** |
| **matching** | **15** |
| **DIFFERING** | **24** |
| age of every differing bundle | **3.5 days — all 24 identical** |

**All twenty-four were published in the same moment** — the 2026-09-21 publish
that `docs/MANAGER-CLOSE-2026-09-21.md` § 4 records. **So the drift is not the
old one persisting. It is a new one.** The 21st cleared it; **four days of work
has re-opened it on twenty-four functions**, two more than the number the item's
own title warns about.

**AND MOST OF IT IS ONE SHARED FILE, which changes what the number means.** Of
the 24, **15 differ only or chiefly in `_shared/strings/es.ts`** and **6 in
`_shared/rateLimit.ts`**. That is the shared-modules-ride-along effect
`MANAGER-CLOSE` § 4 already names: one Spanish edit re-opens fifteen functions
at once. **A reader seeing "24 differ" imagines twenty-four separate pieces of
work. It is closer to two.**

**THERE ARE NOW THREE NUMBERS IN THIS REPO FOR THIS ONE FACT AND NONE OF THEM IS
TODAY'S:** 0.6's title says **22** (2026-09-20), 4.4's standing caveat says
**13 of 39** with five of its proved seventeen among them (2026-09-20), and the
live answer is **24**. **None is wrong about its own day; all three read as
current.** This is the derived-tally failure `CLAUDE.md` records about the
gotchas count, in a place where the number is one command away.

**THIS IS NOT A REASON TO DEPLOY** and nothing here suggests it. Andrew's ruling
stands: publishing is a deferral he chose, the work is *done and correct on disk,
switched off until launch*. **What the measurement changes is a number, not a
plan** — and 0.6 itself says the red *"stops being urgent; it does not stop
being real."*

> **NOTHING NEEDED FROM A BROWSER. One command, credentials only:**
> `node scripts/deployed-inventory.mjs` — it prints the count, names every
> function, writes `receipts/deployed-inventory.json` and exits 1 by design.
> **The receipt in the working tree now carries today's measurement** and was
> deliberately not committed, as the receipts already dirty in this tree were
> not.

### FINDING 2 · 0.3's CRITERION IS EXECUTABLE AND ITS NAMED EXAMPLE NO LONGER EXISTS

**0.3's `Done when` is one of the better ones in the file** — it requires the
Clients screen to default to real customers, a DEMO badge on any fixture shown,
fixtures absent from the counts, and it closes the pass-by-absence hole
explicitly: *"a pass obtained by pressing a tenant that has no fixture rows at
all… **Zero fixtures discovered is a failure, never a pass**."* It then names
where to press: *"the demo tenant, **which has such rows today**."*

**That parenthesis was checked, read-only, 2026-09-25:**

| | |
|---|---|
| `demo-detail` customers | **16** |
| fixture-looking rows | **3** |
| what they are | `zone-muew68al`, `ROADMAP 2.8 selected 2026-09-23`, `ROADMAP 2.8 Address Test 2026-09-23` |
| **"Smoke TPMOY"-style rows, the example the entry names** | **0** |

**So the criterion still has something to bite on — and not the thing it names.**
The audit's own "Smoke TPMOY" rows are gone; what is there instead is **three
rows three sessions left behind**, two of them 2.8's own kept evidence.

**WHY THAT IS A DECAYING PRECONDITION AND NOT A NITPICK.** Those three rows are
**exactly the population the open item at `ROADMAP.md:3514` says a reseed eats**
— *"A reseed eats the evidence an open item depends on, and nothing notices"* —
and 2.8 states in terms that its replacement row *"will go the same way at the
next reseed unless something changes."* **So the tenant this criterion points at
can arrive at zero fixture rows between now and somebody picking the item up**,
at which point the pass-by-absence the criterion was written to forbid becomes
the only pass available, and the run that produces it looks completely normal.

> **THE ONE-LINE FIX, and it is a documentation change, not a build:** *0.3's
> `Done when` should say **seed the fixture rows as part of the press** rather
> than rely on the tenant happening to have some — for example `node
> scripts/seed-demo.mjs` and then confirm with one read that the Clients table
> has at least one obviously-fake customer before the screen is opened.*
> **Not applied here**, because rewriting an acceptance criterion a second time
> in one night, on an item somebody may be about to pick up, is worth one
> sentence of agreement first.

### THE OTHER EIGHT — state still true, criterion executable

* **0.11 (R2)** — the dangerous half is built and dated 2026-09-24; both named
  artifacts exist (`supabase/functions/_shared/photoKey.ts`,
  `tests/photo-key-isolation.test.mjs`, 61 assertions) and so does
  `docs/the-photo-allowance.md`. The criterion names five separable conditions
  and one of them is unusually good: **`job_photos.bytes` must equal the size R2
  reports, not the size the client claimed.** Its "what failing looks like" names
  two silent failures, and *"surfacing as a bill rather than a failure"* is the
  right register.
* **0.12 (ZeptoMail)** — blocked at Zoho's end, and the blocker is **falsifiable
  by a stranger**: the domain either verifies or it does not. Corroborated
  independently in `docs/services-and-secrets.md` § 6, which states the same
  facts in the same terms — **the split decision, the $2.50/10,000, the
  marketing ban, and `andrewsdetail.com` adding fine on the same account**, which
  is what makes it the domain rather than the plan. Two documents agreeing is
  worth noting because the item exists *because* this decision once lived in one
  place only.
* **0.13 (SMS)** — *"queued, not stalled"*, behind 0.14 and Andrew's wording
  decisions, both named. The criterion's failure mode is the good part: *"a
  message that sends and leaves no delivery row, which is the shape every email
  fault in this repo has had."*
* **0.14 (10DLC)** — deferred on purpose, with a `Waits on:` and a
  `How the wait ends:`. Nothing to check but the wait.
* **0.15 (OAuth consent)** — same shape, and the wait ends with a checkable
  observation: *"check the quota; three hundred means the first gate passed."*
* **0.16 (unrated domain)** — the criterion is three external lookups returning
  a category other than unrated. **Executable by anybody, needs nothing from
  this repo.**
* **0.4 (legal pages)** — the criterion was **narrowed on purpose** from *"every
  promise"* to a named list of six, with the reason written in: *"'every
  promise' is not something a stranger can execute without first deciding what
  counts as one."* It waits on two factual questions that are genuinely Andrew's
  — which legal entity trades as Detailing Platform, and whether the export gets
  built or the promise removed — and it says plainly that paid legal review is
  out of scope by standing ruling.
* **0.7 (maintenance reminder)** — re-read 2026-09-24, and the re-read is the
  valuable half: the entry reasons from the *"no marketing email, ever"* rule
  that Andrew reversed on 2026-09-21, so **it reads as more expensive than it
  is**, and the entry says so above its own argument rather than rewriting it.
  It waits on one named question in one named document —
  `docs/what-we-send.md` § Question 3, **confirmed present** — and it refuses to
  add a third copy of a question already asked twice.

### WHAT THIS BATCH COULD HAVE MISSED

* **Nine of these ten carry a `Done when` I wrote earlier tonight.** Judging my
  own criteria for executability is the weakest thing in this pass, and the
  honest position is that **question 2 is barely tested on Wave 0.** It will be
  a real test from batch 9 on, where the criteria are other people's.
* **Question 1 was answered by reading plus two live measurements** — the
  deployed inventory and one customer-table read. **For the other eight items,
  "still true" means the entry does not contradict anything I read, not that I
  went and looked.**
* **0.11, 0.4 and 0.7 are long and I read the closing thirds in full and the
  bodies in part.** 0.6 I read whole.

---

## BATCH 9 — 1.3 through 3.1, and the two findings are both about items nobody edited on purpose

| | |
|---|---|
| items in this batch | **10** |
| state still true | **9** |
| **state STALE — closed in fact, open on paper** | **1** (`:4770`) |
| `Done when` a stranger could execute | **8** |
| **`Done when` MISSING because it was orphaned into the next item** | **1** (2.15) |
| `Done when` half-executable | **1** (1.3) |
| **running total** | **20 of 59** |

**The ten:** 1.3, 2.1, 2.1b, the reseed item (`:3514`), the stale-blocker item
(`:3551`), 2.12, 2.15, 2.15a, the 320 calendar item (`:4770`), 3.1.

**Three claims were re-measured live rather than read, and all three held:**

| claim | where | measured 2026-09-25 |
|---|---|---|
| *"the COLUMN is not [applied]"* | 1.3 | **`customers.is_test` does not exist** — the endpoint answers `42703` |
| *"71 passed / 6 failed today"* | 2.12's gate | **71 passed, 6 failed** — unchanged |
| *"the only thing standing between here and the right price is publishing `calculate-booking`"* | 2.1 | **`calculate-booking` is in the DIFFERS list** — still not live |

### FINDING 3 · `ROADMAP.md:4770` IS CLOSED IN FACT AND OPEN ON PAPER

**The item:** at 320 the booking calendar's day cells are 37px against the 44px
absolute, thirty-two of them. It tables three options, notes that Andrew has
ruled on this shape once already (*"job buttons stay square on a phone"*),
recommends leaving it, and says the decision *"goes to Andrew as a
`FOR-ANDREW.md` row"*.

**Its `Done when`, verbatim:** *"Andrew answers the row — **either** every day
cell reaches 44px of hit area at 320, **or the reason it cannot is recorded as a
hold with his decision on it**."*

**The second branch was satisfied on 2026-09-24.** `FOR-ANDREW.md:818`:

> **`- [x] DECIDED · The day squares stay as they are. 2026-09-24 — nothing
> needed from you.`**

It carries the decision, the reason (*"seven squares plus the gaps between them
need about an inch more than the narrowest phone has"*), the basis (his own
earlier ruling, applied rather than re-asked), a reopen condition, **and the
deliberate choice to keep the measuring tool red** — *"a genuine violation
hidden inside a passing check is exactly the failure this project spent tonight
removing."*

**That is the hold the criterion asks for, in more detail than it asks for it.
The box is still `[ ]`.**

**AND THE ITEM THAT SAYS NOBODY WOULD NOTICE THIS IS SIX HUNDRED LINES ABOVE
IT.** `ROADMAP.md:3551` — *"Nothing notices when a blocker goes stale, so an
item can sit closed-in-fact and open-on-paper"* — is open, unbuilt, and was
written after 2.8 sat two days in exactly this state. **This is its second
confirmed instance, found the same way as the first: by holding two documents
next to each other.**

**Recommend the tick.** Not taken here — the audit does not move boxes — but
there is nothing left to do on it, and leaving it open costs somebody a
re-derivation of a decision Andrew has already made twice.

### FINDING 4 · 2.15's ACCEPTANCE CRITERION IS NOW SITTING INSIDE 2.15a

**A NEW SHAPE, AND IT IS A FILE COLLISION THAT LEFT NO CONFLICT.** Commit
`780c280` (*"2.15a: three tenant strings with no length limit"*) inserted a new
item **between 2.15's body and 2.15's `Done when`**. The criterion did not
move; the heading moved above it.

| | |
|---|---|
| 2.15's block today | lines **4486–4703** |
| `Done when` lines inside it | **0** |
| 2.15a's block today | lines **4704–4769** |
| `Done when` lines inside it | **2** — its own at 4733, and 2.15's at **4751–4768** |

**The orphaned text is unmistakably 2.15's and says so three times:** *"does the
pinned bar ride up on the keyboard and cover the field being typed into?"*,
*"the walk asks both of **2.15's** questions rather than one"*, and *"**this
item** and 8.2 close on the same twenty minutes."* **2.15a is about three tenant
strings with no length limit.**

**TWO CONSEQUENCES AND THE SECOND IS WORSE THAN THE FIRST.**
1. **2.15 has no acceptance criterion**, which undoes the result recorded in
   this session's own handover — *"open items with nothing now: 0"*. It was true
   when written and is not true now.
2. **2.15a appears to have two**, and a reader taking the second one would try
   to close a string-length item by **walking a real phone with the keyboard
   up**. That is not a near-miss; it is a completely different piece of work.

**NOT REPAIRED HERE, AND THE REASON IS THE RULE RATHER THAN CAUTION.** The fix
is a pure relocation — eighteen contiguous lines, sixty-five lines up, no word
changed. **But DP Cowork has committed to 2.15 and 2.15a three times in the last
hour** (`2bd0260`, `428e942`, `780c280`), and CLAUDE.md's fourth-version commit
rule exists precisely because `git commit <path>` takes the **working tree**
copy of a shared file — so an eighteen-line move landing underneath a session
that is still writing there is the same-file contamination the rule spent four
corrections learning about. **`ROADMAP.md` was clean when this was checked**, so
the edit is permitted; it is being declined on ownership, not on permission.

> **THE REPAIR, FOR WHOEVER HOLDS 2.15 NEXT — one move, no rewording:** *cut
> `ROADMAP.md:4751–4768` (from `**Done when** (written 2026-09-25 — this item
> had no Done when line` to `…which is why `resize_window` cannot stand in.`)
> and paste it at the end of 2.15's block, immediately before the `- [ ]` that
> opens 2.15a. Then check that 2.15a's own `Done when` at 4733 is the only one
> left in its block.*

**AND THE PATTERN IS WORTH MORE THAN THE INSTANCE.** An insertion between an
item's body and its trailing criterion **produces no merge conflict, no failing
check and no odd-looking diff** — the diff is a clean block of additions, which
is what a correct insertion also looks like. **Nothing in this repo can see it**;
`decisions-index.mjs` guards `DECISIONS.md`'s index and nothing guards an item's
own boundaries. **It was found by asking a question about 2.15 and getting no
answer**, not by looking for it.

### THE OTHER EIGHT

* **1.3** — state true and **verified**: the entry says *"the SCREEN is proved
  and the COLUMN is not"*, and the column really is absent from the live
  database. Two things to record. **Its `Done when` is half-executable** —
  *"the 'gone quiet' count drops to match real customers"* is a number somebody
  can compare; *"a support task never requires scanning test rows"* is not
  something a stranger can go and do. **And its "switched off until launch"
  framing is being applied to a MIGRATION**, where Andrew's ruling was coined
  for publishing. The deferral holds either way — applying a migration is his
  too — but **the switch is `apply-migrations.mjs`, not a Netlify publish**, and
  a reader who knows only the publishing ruling will reach for the wrong one.
  It also names a live gap with no item: **the same three fixture rows appear on
  the Today screen**, because `is_test` is on the customer and Today reads
  bookings. *"Worth its own item."*
* **2.1** — the clearest open item in the file. It says what a customer sees
  today ($65 on a Sunday, charged $95), what they will see after the publish
  ($95 with `Weekend rate · +$30` above the times), and that **nothing else is
  waiting**. Its `Done when` names four assertions at five widths. **Its central
  claim was checked and holds.**
* **2.1b** — superseded 2026-09-22 in place, with Andrew's earlier "not a fault"
  ruling kept above it. Criterion is a two-branch either/or, executable.
* **`:3514` (a reseed eats the evidence)** — four numbered shapes,
  *"deliberately not decided"*, and a criterion that can fail: *"either a
  flagged row survives a reseed, or no open item depends on one surviving."*
  **Batch 8's finding 2 is this item happening again**, to 0.3's criterion.
* **`:3551` (nothing notices a stale blocker)** — criterion: *"no open item's
  blocker can be two days out of date without a…"*. **Finding 3 above is its
  second instance and should be recorded in it.**
* **2.12** — the gate was **re-run**: 71 passed, 6 failed, exactly as the entry
  states. Its three-clause criterion is the best in the batch because every
  clause can go red, and clause 3 demotes `i18n-survey.mjs` to evidence in
  writing.
* **2.15a** — written tonight, state fresh, and its own criterion at 4733 is
  executable (`bk-bar-clearance.mjs`, *"extended, not duplicated"*). **Its only
  problem is the eighteen lines that do not belong to it.**
* **3.1** — half built by 14.3 and says exactly which half: the list exists on
  the client record and not in the back office, and there is no link to the
  booking *"because the relay is never told which booking it is sending
  about"*. Criterion — a deliberately bounced message visible with a next
  action, and delivered visibly different from sent — is executable and the
  first half of it is already demonstrated.

### WHAT THIS BATCH COULD HAVE MISSED

* **2.15 is 218 lines and 2.1 is 336; I read 2.15 whole and 2.1's first third
  plus its closing section.** The finding in 2.15 came from a `Done when` grep
  returning zero, which is a much cheaper instrument than reading — **and it
  only works because every other open item has one.** On a file where half the
  items lacked criteria it would have found nothing.
* **I did not run the same grep across all 63 open items.** Finding 4 could have
  more instances. **That is the obvious next measurement and it is one command:**
  for each open item's block, count `Done when` lines; anything at 0 or ≥2 is a
  candidate. Not run here because the item boundaries need care — my own earlier
  scan had exactly that bug — and a wrong boundary produces the false positives
  this whole audit was warned about.

### THE SCAN WAS RUN AFTER ALL, AND IT BOUNDS THE FINDING RATHER THAN EXTENDING IT

**The paragraph above said the boundary scan was "the obvious next measurement"
and was not run. It was run immediately afterwards, and saying so beats leaving
a stale sentence two lines above the result.** Every open item's block was taken
from its `- [` line to the next one, and its `Done when` lines counted:

| | |
|---|---|
| open items scanned | **63** |
| **zero `Done when` lines** | **2** — **2.15** (finding 4) and **12.3** |
| three or more | **2** — 4.1 and 8.5, **both benign** |

**12.3 is the known, deliberate one.** This session's own handover records it:
*"the missing piece is named in the entry — who sets the deposit and in what
form… until that is answered there is nothing to test. A plausible-sounding
criterion there would have had to be un-written later."* **So 2.15 is the only
orphan, and finding 4 is bounded rather than the first of many.**

**BOTH "THREE OR MORE" WERE OPENED RATHER THAN COUNTED.** **8.5** has five and
all five are its own — one per accessibility dimension (reduced motion, focus,
zoom, text spacing, landmarks), which is the right shape for that item. **4.1**
has one real criterion at `:6125` and two prose sentences that merely *mention*
its done-when. **A count alone would have filed both as suspicious**, which is
the failure mode this whole audit keeps recording; opening them took two
minutes.

**ONE THING THE SCAN CANNOT SEE, stated because it is the same blind spot as
finding 4:** it counts lines containing the words "Done when", so **a criterion
worded differently — *"this closes when…"*, *"it is finished once…"* — reads as
absent, and a criterion orphaned into a NEIGHBOURING item still counts as
present, just in the wrong place.** Finding 4 was caught only because the
orphaning left 2.15 at **zero**. **Had 2.15 carried a second criterion of its
own, the same collision would have been invisible to this scan.**

**LINE NUMBERS IN THIS BATCH ARE AS OF COMMIT `5cc6342` AND MOVE UNDER YOU.**
`780c280` shifted everything below line 4704 down by about seventy lines while
this batch was being read — 4.2 moved from `:6319` to `:6391` mid-scan. **The
item titles are stable; the numbers are not.**
