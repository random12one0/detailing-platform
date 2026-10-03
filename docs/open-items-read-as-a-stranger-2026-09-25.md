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
**exactly the population the open item at `ROADMAP.md:3514` (**now 14.26**) says a reseed eats**
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

**The ten:** 1.3, 2.1, 2.1b, the reseed item (**14.26**), the stale-blocker item
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
IT.** `ROADMAP.md:3551` (**now 14.27**) — *"Nothing notices when a blocker goes stale, so an
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
* **`:3514` (a reseed eats the evidence — **now 14.26**)** — four numbered shapes,
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

---

## BATCH 10 — 3.3 through 7.17, and the question is now only "could somebody execute this"

**Read 2026-10-02. Resumed at the next open item after 3.1 in roadmap order.
Four of the ten criteria failed and all four were rewritten in place, commit
`1db118c`** — this batch had the mandate to fix rather than only record.

| | |
|---|---|
| items in this batch | **10** |
| criterion a stranger could execute | **6** |
| **criterion rewritten because it could not be** | **4** (3.3, 3.4, 4.1, 4.3) |
| could not judge | **0** |
| **running total** | **30 of 59** |

**The ten:** 3.3, 3.4, 3.4c, 4.1, 4.3, 4.6, 6.1, 6.2, 6.4, 7.17.

**THE FOUR FAILED IN FOUR DIFFERENT WAYS, WHICH IS THE USEFUL PART** — they are
not one fault repeated, so "make criteria more specific" would not have caught
them. **One was unpressable, one carried a stale count, one named a thing that
does not exist, and one was perfectly executable and pointed at the wrong
place.** The last is the dangerous kind and had not been seen before in this
audit.

### 3.4 · A CRITERION THAT CARRIED A COUNT OF THE THING IT WAS MEASURING

**Old:** *"confirmation, acceptance, reminder, quote, receipt, cancellation and
reschedule have each been sent, received and read."* **Seven kinds.**

**Measured, not quoted:**
`grep -cE '^export (const|function) [a-zA-Z]+Email' supabase/functions/_shared/emailTemplates.ts`
→ **16**.

**And 3.4b had already said so in its own words** — *"sixteen, not seven — the
done-when's list undercounts what is actually in the file."* **So the correction
existed in a sibling entry and never reached the criterion**, which is the same
shape as 0.6's title being corrected at another item while the title kept its
number. **Twice in one file, found twice by accident.**

**New:** every template that file exports, **sent** to a real inbox, opened, read
against what it claims, **with the count taken off the file at the time of the
pass and never typed into the line** — plus each leaving a delivery row.
**Failing:** a pass claimed from rendering, which is the half this item already
has; and **a seventeenth template added after the pass**, which a typed number
cannot notice.

### 4.3 · EXECUTABLE, AND POINTED AT THE WRONG PLACE — THE WORST OF THE FOUR

**Old:** *"an attempted state change fails and the access appears in an audit
history."* **Anybody can do that today, in a browser, and it would prove
nothing.** `lib/supabase.js` wraps `insert/update/upsert/delete` in a preview tab
and `lib/preview.js` says in terms that this *"stops a stray click, not an
attacker"*. **A press refused in a preview tab satisfies the sentence
completely.**

**The entry already knew** — its own *"WHY THIS ENTRY STAYS OPEN"* paragraph
analyses both halves and says the first is enforced in the browser only. **So the
analysis was right and the criterion was the thing left wrong**, and a stranger
reading only the criterion would have closed the item on a browser press.

**New:** the refusal must be observed **from the server, with the support
session's own credentials, not through the dashboard**. **Failing:** a refusal
that only ever came from client code — *"which looks identical on screen to one
the database enforced."*

> **THE GENERAL LESSON, AND IT IS NEW TO THIS PASS:** every earlier finding was a
> criterion somebody **could not** execute. This one was a criterion somebody
> **could** execute, on the wrong thing, and get a clean result. **A vague
> criterion stalls; a precise criterion aimed one layer too high closes the item
> falsely.** Specificity is not the property to optimise for — **the property is
> whether the thing you can press is the thing the item is about.**

### 3.3 · NO RECIPIENT, NO ROW, NO SCHEDULE, AND HALF ITS OWN FIX MISSING

**Old:** *"a test booking sends a real text and a reminder fires on schedule."*
Three holes: **to whom**, **recorded where**, and **what schedule** — and the
Fix's own *"Reply C to confirm"* appeared in no criterion at all, so the inbound
half could have been skipped entirely by somebody working to the letter.

**New:** one booking produces **two** texts — one at booking, one the day before
— each **independently switchable**, each **leaving a delivery row**, each
**stopping when its switch is off**; and **a reply recorded against that
booking**. **Failing:** a text that arrives and leaves no row, *"the shape every
email fault in this repo has had"*; or a switch that removes the message from the
screen while the send still happens, **which reads as working from both ends.**

**And one line was added that neither item had:** **how 3.3 differs from 0.13.**
0.13 is the **pipe** — one message, any message, with a receipt back through the
webhook. 3.3 is **the two product messages, their switches and the reply.**
**0.13 can be finished while 3.3 is untouched; 3.3 cannot start until it is.**
Without that sentence either one could be read as closing the other.

### 4.1 · "ACCIDENTAL" IS NOT SOMETHING ANYBODY CAN PRESS

**Old:** *"no consequential state change happens from one accidental tap, and
each is recorded in an audit history."* **Nobody can press "accidental"**, and
*"an audit history"* named no table, no columns and no list of actions — while
*"each"* silently referred back to seven verbs in the Fix line.

**New:** for **each of the seven** the Fix names — complete, cancel, no-show,
suspend, delete, waive, owner-invite — **one press produces a step that names the
record before anything changes**, and the change is **either reversible from the
same screen** or **leaves a row saying who did it, what it was before, and
when** — read off the row, never off the screen.

**Both failure modes are drawn from this item's own history rather than
imagined.** A confirmation that closes the record, leaving the undo a navigation
away, **was built and fixed on 2026-09-20 across five call sites** — so it is now
a **regression** shape, not a hypothetical. And **a row that records the new value
and not the old one cannot answer *what was this before*, which is the one
question an undo needs.**

### THE SIX THAT PASSED, AND WHY EACH ONE PASSES

* **3.4c** — names **two literals**, the function they must pass through
  (`formatDateLong`), the fixture whose date must be one day out, a rendered
  Spanish email, **and a sabotage requirement**: *"put an English literal back and
  the run must say so — which today it does not, and that is 3.4's FAULT 5."* A
  criterion that names its own instrument's current blind spot is the strongest
  shape in the file.
* **4.6** — names the command, the receipt, the grader and the sections:
  *"a default run of `sweep-tap-targets.mjs` produces a receipt `receipt.mjs`
  grades for the dashboard/settings sections, not only for `/admin`."* Nothing to
  interpret.
* **6.1** — restore a copy, open it, check it against a known set of bookings,
  customers and settings, **with the date visible in the back office.** Four
  observable things; `restore-drill.mjs` already fails the run and keeps failing.
* **6.2** — four clauses, each observable: a controlled failure **raises an
  alert**, **appears in incident history**, **names the affected path**, and
  **clears only after a successful check.** 6.3 then demonstrated exactly this
  shape end to end, which is the best evidence a criterion is executable — somebody
  executed its twin.
* **6.4** — written 2026-09-25, **one clause per thing the Fix names**, and the
  clauses carry numbers rather than adjectives: *"an update interrupted mid-flight
  and retried leaves **one** change, not two"*, *"a booking submitted twice through
  a retry leaves **one** booking."*
* **7.17** — *"no example site states a figure whose producing field or endpoint
  cannot be named, and the rule is in the tenant-site brief."* Both halves are
  checkable by reading, and the second half is what stops it being re-derived.

### WHAT THIS BATCH COULD HAVE MISSED

* **The zero-criteria scan was re-run after the rewrites and reports one item:
  12.3**, the deliberately parked deposit design, which is Andrew's and is handled
  when the audit reaches it in roadmap order. **So no criterion was lost by these
  edits** — checked, because an edit that fixes four things and drops a fifth is
  exactly what batch 9 found somebody else doing.
* **I judged executability by reading, not by executing.** None of the six was
  run. **6.2's claim is the strongest precisely because its twin WAS run** (6.3),
  and that is the only one in the batch with that support.
* **4.1 and 4.3 are 275 and 166 lines; I read 4.1's opening, its measured section
  and its closing three paragraphs, and 4.3's opening plus its "WHY THIS ENTRY
  STAYS OPEN" analysis.** The 4.3 finding came out of that analysis paragraph —
  **the entry diagnosed its own criterion and nobody had acted on it**, which is
  the third time in this audit that a correction sat in prose and never reached
  the line it was about.

---

## BATCH 11 — 7.3 through 9.1, and one criterion could not fail at all

**Read 2026-10-02. Four rewritten in commit `de83986`.**

| | |
|---|---|
| items in this batch | **10** |
| criterion a stranger could execute | **6** |
| **criterion rewritten** | **4** (7.3, 7.8, 7.9, 8.10c) |
| could not judge | **0** |
| **running total** | **40 of 59** |

**The ten:** 7.3, 7.6, 7.8, 7.9, 7.10, 8.10c, 7.18, 8.2, 8.5, 9.1.

**EIGHT OF TEN FAILING CRITERIA ACROSS TWO BATCHES SHARE NOTHING BUT THE
SYMPTOM**, which is worth saying because it rules out a cheap fix. The eight
kinds so far: unpressable adverb (4.1, 7.3), a count of the thing being measured
(3.4), a missing recipient and row (3.3), the right test aimed one layer too high
(4.3), a process rather than an observation (7.8), a judgement word (7.9), and
now **a criterion satisfiable by writing a sentence (8.10c)**. **No scan finds
these. They are eight different questions.**

### 8.10c · THE CRITERION COULD NOT FAIL ON ITS OWN SUBJECT

**Old:** *"whoever builds it says, in the receipt's own words, which of the
remaining kinds it now sees and which it still does not."*

**A receipt sentence reading *"it still sees none of the remaining kinds"*
satisfies that completely, with `migration-drift.mjs` unchanged.** The item's
subject is making the check **see** grants and indexes; the criterion asks only
that somebody **describe** what it sees. **So the item closes by documenting its
own blindness — which is precisely the thing 8.10c was split out of 8.10b to
prevent**, and the entry says so in its own opening: *"a check that reports clean
over a blindness is worse than one that says what it did not measure."*

**IT IS THE SAME FAULT AS 2.12's OLD DONE-WHEN NAMING A SURVEY AS A GATE**, and
it was found the same way: **by asking what the laziest honest pass would look
like.** That question is now the only reliable instrument this pass has — eight
findings, eight different shapes, one question.

**New:** `migration-drift.mjs` **compares at least GRANTS** — which the entry
itself calls *"probably the next-most-tractable"*, readable from
`information_schema.role_table_grants` / `has_table_privilege` — **names a real
match or difference per grant** in `supabase/migrations/`, sends anything
unparseable to a declared **UNJUDGEABLE bucket by file name**, and **is proved by
a sabotage that revokes one declared grant and must turn the run red by name.**
The receipt's sees/cannot-see sentence becomes **the paperwork, not the
criterion.** **Failing:** a receipt whose sentence grew while the comparison did
not, and an UNJUDGEABLE bucket quietly holding every grant in the repo — *"a pass
over zero judged targets, which `receipt.mjs` already refuses elsewhere and must
refuse here."*

### 7.3 · NOBODY CAN PRESS FIVE SECONDS

**Old:** *"in five seconds a visitor can say what each plan includes, what is due
now and what repeats."* **Two problems: the stopwatch, and the visitor who is not
in the room.**

**The repair needed no invention, which is the point worth copying.** 7.3's own
**Fix** line is already concrete — two plain plan cards, separate lines for
one-time and repeating cost, *"Pay yearly: $400 (save $80)"*, commitment choices
in the card, raised terms contrast. **The criterion is taken from the Fix rather
than composed**, so it cannot widen the item: separate labelled lines; the saving
never a standalone figure; **the saving not carrying the same visual weight as the
two prices, read off computed style rather than eyeballed**; the commitment choice
inside the card; terms text clearing the floor `contrast-insitu.mjs` enforces.

**Failing:** *"three figures of equal weight on one card… the saving reading as a
third fee — and it survives any amount of rewording while the weights are
equal."* **That last clause matters: the reported fault is visual, so a criterion
about words alone could be met with the defect intact.**

### 7.9 · A JUDGEMENT WORD, AND ITS FAILURE MODE WAS ALREADY WRITTEN DOWN ELSEWHERE

**Old:** *"the full point is understandable with motion disabled."*

**New:** under `prefers-reduced-motion: reduce` **and** this repo's own
`?lite=1`, **every element carrying the page's proposition is present and at full
opacity in the first paint** — nothing stating the offer waits on an animation, a
reveal or a timer — **and the page reads in the same order as it does with motion
on.**

**The failure mode is not hypothetical and did not come from me.** 7.12 records
it: a node added after the `data-rv` reveal list is collected at mount **never
gets `.in` and sits at opacity 0 for ever.** **So an element can be in the DOM, in
the right order, and invisible** — which means presence is not visibility and the
criterion has to say *opacity*. **A reduced-motion criterion written without that
clause would pass a blank page.**

### 7.8 · THE FIRST HALF WAS FINE AND THE SECOND HALF WAS A PROCESS

**Old second half:** *"adding or removing a processor triggers a policy review."*
**Nothing observable, and no mechanism named.** A stranger cannot tell whether a
review was triggered.

**New:** **(a)** every external host the edge functions call is named on
`/privacy` and every processor `/privacy` names is one the code calls, **both
lists derived from the code**; **(b)** a check **fails by name** when they
disagree. **Failing:** *"the two lists reconciled once, by hand, on the day
somebody looked — which is this item's current state and is why it is still
open. A reconciliation is not a mechanism, and the next processor arrives without
one."*

### THE SIX THAT PASSED

* **7.6** — names the surfaces and the arithmetic: the printed figure must equal
  `photo_total_bytes()` ÷ `photo_tenant_share()` **read from the database rather
  than typed into the page.** It also says which branch is not its to pick: 0.11
  raises the allowance in the same change as the upload switch, so **7.6 closes
  inside that change, not before it.**
* **7.10** — three numbered parts, each with a pixel height that decides between
  two different conclusions: *"~903px means the 21st's edit landed and only the
  paperwork lagged; 1111px means the change is specified and ready."* **A
  criterion that tells you what each possible measurement MEANS is rarer than one
  that tells you what to measure.**
* **7.18** — the strongest in the batch. It requires the check to be **run once,
  unmodified, against today's repo, and to name `/terms` and `/privacy`** — *"not
  a hypothetical run, the actual one, before anything about `LegalPage.jsx` is
  patched."* **It forbids fixing the subject before proving the instrument**,
  which is this repo's most repeated lesson written into an acceptance criterion
  instead of a gotcha.
* **8.2** — eighteen numbered steps each needing an answer written into the
  entry, the phone named, the Android half answered on a named device, and —
  the clause that makes it executable rather than aspirational — **"Nothing felt
  wrong" is a valid answer to a step and must be recorded as one**, with 8.3 cited
  as having closed exactly that way.
* **8.5** — five sub-criteria, one per dimension, each observable: reduced motion,
  a visible focus location across a Tab walk, 200% zoom at four widths, the WCAG
  1.4.12 overrides applied with real numbers, and landmarks with headings
  descending without skipping. **Five criteria on one item is right here** —
  they are five different disabilities, not five ways of saying one thing.
* **9.1** — *"the same account shows the same count everywhere"*, later tightened
  to *"on the live site."* Executable, and **the tightening is a real gate rather
  than a vague one**: it cannot be met until Andrew publishes, which is a deferral
  he has chosen, not an ambiguity.

### WHAT THIS BATCH COULD HAVE MISSED

* **8.5 is 373 lines and 7.10 is 352; I read each one's criteria and the
  paragraphs around them, not the whole entry.** For an item whose criteria are
  the thing under judgement that is the right read, and it is **not** a claim to
  have read either entry.
* **Nothing in this batch was executed.** 7.18's criterion in particular asks for
  a run I am not able to make — it needs `scripts/`, which is not this lane — so
  *"executable"* here means *a person with that lane could do it today*, which is
  the question asked, and not *it has been done*.
* **I did not check whether the eight rewritten criteria are themselves
  executable by somebody other than me.** They were written to the same test and
  the test was applied by the author, which is the weakest link in both batches.
  **The honest check is somebody else reading one and trying it.**

---

## BATCH 12 — the cold test first, and BOTH of my own criteria failed it

**Read 2026-10-02. Rewrites in `a5d3637` (the cold test) and `1a67d3c` (the
batch).**

| | |
|---|---|
| **cold test: criteria opened as a stranger** | **2** |
| **cold test: failed** | **2** |
| items in this batch | **10** |
| criterion a stranger could execute | **8** |
| **criterion rewritten** | **2** (9.2, 9.12) |
| closed in fact, open on paper | **1** (11.3) |
| **running total** | **50 of 62** |

### THE COLD TEST — PICKED BY A RULE I COULD NOT GAME, AND IT CAUGHT ME TWICE

**Eight criteria had been written and graded by the same session, which is a
check grading itself.** The selection rule was fixed before looking: **the first
rewrite in roadmap order from each batch** — **3.3** from batch 10, **7.3** from
batch 11. Each was extracted on its own, with the entry out of view, and the
only question asked was *what would I have to ask somebody.*

**BOTH FAILED. Here is each, and the second is the better finding.**

#### 3.3 — I kept the mechanism and dropped the thing that made it matter

My clause: *"a customer's reply is **recorded** against that booking, because
'Reply C to confirm' is in the Fix and was in no criterion."*

**A reply logged and acted on by nobody passes that sentence.** The Fix says
**confirm** — the reply is supposed to *move the booking*, which is the entire
point of putting "Reply C" in a text message. **I cited the Fix in the same
breath as weakening it.**

**This is a fault this session has already written against itself**, in its own
handover: *"my fold dropped the one clause that made a ruling a ruling… the
ruling survived; the thing that made it a ruling did not."* **Recorded then,
repeated eight days later, in a criterion written specifically to stop this
class of thing.** Writing a lesson down does not install it.

**Two more holes surfaced in the same clause once the first one was pulled:**
* *"one the day before the appointment"* — **names no hour.** Two people pick
  two times. **`reminder_lead_minutes` already exists as a column**, so the
  criterion now uses the detailer's own setting rather than a time invented here.
* *"leaves a delivery row in this product's own tables"* — **names no table**,
  and a stranger cannot read a row they cannot find. The SMS table does not
  exist yet (0.13 builds it), so inventing a name would be worse; it now points
  at **the shape `email_sends` already has** — one row per attempted send,
  carrying what became of it. **Confirmed the table is real and live** before
  citing it as the model.

#### 7.3 — clause (c) could be satisfied by one pixel

My clause (c): *"the saving does **not** carry the same visual weight as the two
prices, measured rather than eyeballed — font size and weight read off the
computed style."*

**"Not the same" is satisfied by a one-pixel difference**, with the reported
fault — *the saving reading as a third fee* — entirely intact. **It is the exact
trap clause (b) beside it was written to avoid**, and I wrote it one line later.
**"Measured rather than eyeballed" is what made it feel finished**: naming an
instrument reads as rigour, and the instrument was pointed at a threshold that
was never set.

**There is no type-scale token to anchor to** — `theme.css` carries colour
tokens only, **checked rather than assumed** — so the repair anchors to something
already on the page instead: **the saving must share the computed `font-size` and
`font-weight` of the page's other supporting text, and not of the two price
figures.** Three reads, a comparison, no invented delta.

> **WHAT THE COLD TEST ACTUALLY MEASURED, and it is not \"I write bad criteria\".**
> Both failures are **one clause inside an otherwise sound criterion**, and both
> clauses are the one where I stopped thinking because the sentence had started
> sounding finished. **The failure mode is cadence, not comprehension** — which is
> why re-reading my own work catches it and writing more carefully does not.
> **Eight passes would have told me nothing. Two failures told me where to look.**

### THE TEN — 9.2, 9.4, 9.7, 9.10, 9.11, 9.12, 9.14, 9.15, 11.3, 12.1

#### 9.2 · THE CRITERION WAS AIMED AT A THING THE ENTRY SAYS WAS NEVER THE FAULT

**Old:** *"the counts reconcile and each account has one clear next action."*
Two problems, and the second is structural: **"clear" is a judgement**, and
**"the counts reconcile" is not what is broken.** The entry's own diagnosis:
`STUCK` (`AdminPage.jsx:689`) is five rows of **predicate + computed headline +
a constant string of advice**, and row `first` asserts *"The page works and
nobody has used it"* while row `open` **has just computed that the page cannot
take a booking.** *"One of the two rows has no calculation."*

**So a criterion about counts is already met, today, with the contradiction on
screen** — one non-demo business, `Counter Signup Test Detail`, 0 services, 0
bookings, firing both rows at once. **New:** no row states a fact it did not
compute, and the one live non-demo business cannot produce two rows that
contradict each other.

#### 9.12 · THE SAME STOPWATCH 7.3 CARRIED

**Old:** *"the owner can find the only account needing attention in under ten
seconds."* **New:** taken from the five real complaints already in the entry —
**no row shows an action or a line whose precondition is false**, with the four
named cases as the test: no *"Money at risk"* on an account that pays nothing,
no *"Ring them"* without a phone number, no *"Booking · last one yesterday"* on
an account with 0 customers, no duplicate wide card. **Failing:** *"a prettier
list that still offers 'Ring them' with no number. The four cases are the item;
the list is only the means."* **Scope unchanged — still stepped past**, for the
reason the entry already gives.

#### 11.3 · CLOSED IN FACT, OPEN ON PAPER — THE SECOND INSTANCE AFTER THE CALENDAR ITEM

**Its criterion is a disposition rather than a test:** *"this item closes as
superseded by 9.10"*, because the three judgement calls it was waiting on are
answered and `FOR-ANDREW.md` carries that row **ticked**.

**Checked rather than taken from the sentence:** `FOR-ANDREW.md:1315` reads
**`- [x] DECIDED · The empty half of Business settings shows your real
booking…`**, and 9.10's criterion now carries the same three calls as four
observable clauses. **So there is nothing left in 11.3 and the box is open.**

**Recommend the tick. Not taken here** — the audit does not move boxes on its own
and the calendar item only moved on an explicit ruling. **It is the second
confirmed instance of the fault `ROADMAP.md`'s own stale-blocker item (**now 14.27**) says
nothing notices**, and both were found the same way: two documents held next to
each other.

#### THE SIX THAT PASSED, briefly

* **9.4** — three repairs named individually: **seven distinct weekday labels**
  (`Sun Mon Tue…`, not `S M T W T F S`), a **rectangular** month with no ragged
  last row, and a legend covering **every** status colour rather than only
  "Blocked". *"Nothing wrong" is a close.*
* **9.7** — four named things including **Book again opening the form already
  holding that customer**, and the failure mode that matters: *"a report that the
  button merely exists."*
* **9.10** — four clauses, and the hard one is specified rather than waved at:
  where the page has nothing worth showing it renders **the page as a customer
  would see it today plus one line naming what is missing** — *"not a blank panel
  and not a placeholder."*
* **9.11** — two parts and **the first needs nobody**: re-run `sweep-widths.mjs`
  against the fixed tree so the receipt stops reading `"status": "fail"` over a
  `git_sha` that is an **ancestor** of the fix.
* **9.14** — carries the unknown-versus-known-empty clause as a criterion rather
  than as a warning: **a period with no costs entered reads as "costs not
  entered" rather than as a profit.**
* **9.15** — three clauses pressed **on one complete business and one incomplete
  one**, 320 first. The two-business requirement is what makes *"a business with
  nothing unfinished sees no prompt at all"* checkable.
* **12.1** — Stripe **sandbox**, every transition **observed in this product's own
  rows and on the actual booking page**, *"not asserted from the Stripe
  dashboard"* — reachable after paying, **unreachable after the failed payment**,
  reachable again once paid.

### A MEASUREMENT NOTE AGAINST MYSELF, BECAUSE IT IS THE SAME TRAP TWICE IN ONE DAY

**The script that enumerated the remaining items reported 21 and the answer is
22.** Its exclusion list held `"1.3 —"` and `t.includes("1.3 —")` is **true for
`"11.3 —"`**, so 11.3 was silently dropped — **and 11.3 is the item carrying this
batch's third finding.** A substring match used where an anchored one was needed,
which is `docs/gotchas.md`'s oldest family and **the same shape as the one-term
grep in entry 88 written four hours earlier.** It was caught because the printed
list was read against a `grep` for `11.3`, not because the count looked wrong —
**21 and 22 look equally plausible, which is the whole problem with a derived
tally.**

### WHAT THIS BATCH COULD HAVE MISSED

* **The cold test is two criteria of eight.** Six remain graded only by their
  author. **The failure rate so far is two of two**, which is a reason to do the
  other six rather than a reason to assume they are fine.
* **9.2 and 12.1 are 308 and 11 lines; I read 9.2's diagnosis section and 12.1
  whole.** 9.2's remaining two "different things" were not read, so **its rewritten
  criterion covers the contradiction and may not cover all three.** Said rather
  than implied.
* **11.3's tick is recommended on two reads — the `FOR-ANDREW.md` row and 9.10's
  clauses — and not on a third.** If the three judgement calls differ between
  those two places, I did not catch it.

---

## THE COLD TEST, FINISHED — EIGHT OF EIGHT OPENED COLD, EIGHT FAILED

**2026-10-02. The experiment the manager asked to be finished rather than
stopped at two, because *"two of eight opened cold, both failed"* and *"eight of
eight opened cold, N failed"* are different claims and only the second is worth
anything.**

| | |
|---|---|
| criteria rewritten to name a shape | **12** |
| of those, opened cold by the same ungameable rule | **8** |
| **failed** | **8** |
| **passed** | **0** |
| second drafts then re-opened cold | **2** |
| **of those, failed** | **2** |

**THE HEADLINE: THE PASS RATE ON SELF-GRADED CRITERIA IS ZERO OUT OF EIGHT.**
Not low. Zero. **Every single criterion this session wrote and graded itself had
at least one clause a stranger would have had to ask about.**

### THE EIGHT, AND WHAT EACH ONE'S HOLE WAS

| # | item | what a cold read found |
|---|---|---|
| 1 | **3.3** | asked the reply be **recorded**; the Fix says **confirm**. A reply logged and acted on by nobody passes. Plus no hour for "the day before", plus no table named |
| 2 | **7.3** | *"not the same visual weight"* is satisfied by **one pixel**, fault intact |
| 3 | **3.4** | **silently spends 16 of a 100-a-day shared allowance**, and makes no provision for a template that **cannot be sent today** (`maintenanceDueEmail` is gated off on purpose; `send-email` answers 401 without the service key) |
| 4 | **4.1** | *"either reversible **or** leaves a row"* — the **OR was a hole**: any action somebody made reversible needed no audit row at all, which deleted the half the original criterion existed for, hardest on `delete` and `suspend` |
| 5 | **4.3** | *"from the server"* covers **two enforcement layers** — the Data API where RLS decides, and edge functions which bypass RLS entirely (4.4). A refusal from one proves nothing about the other: **the original fault one step down** |
| 6 | **7.8** | no **inclusion rule** for what counts as an external host, and no requirement that the check **declare what it cannot see** — a host reached through a variable is not greppable |
| 7 | **7.9** | replaced *"understandable"* with *"every element carrying the page's proposition"* — **a judgement word swapped for another judgement word** |
| 8 | **8.10c** | its sabotage said *"revokes one grant"* — **a privilege change on the live database**, the only criterion in this file that told somebody to break a standing rule, and a crash between revoke and restore leaves the grant off (14.21's teardown fault with a privilege instead of an admin row) |

**8.10c is the worst and it is worth separating from the rest.** The other seven
would have cost somebody an argument or a wasted afternoon. **That one would have
had a session altering privileges on `kguqylyzgyzfktkfnhjb`** — and it was
written by the session that had, four hours earlier, documented 14.21 as *a
teardown that leaves something behind when a run crashes*. **It was repaired to
be repo-side or synthetic, with `platform-admins-declared`'s own discipline cited
as the precedent: sabotages re-proved from synthetic fixtures so none ever
touches the real thing.**

### THE SECOND-ORDER TEST: IT IS TURTLES, AND HERE IS THE EVIDENCE RATHER THAN THE FEELING

**Both second drafts were re-opened cold and both failed.**

* **3.3's repair** said the reply *"moves the booking into the state the detailer
  would otherwise have had to set by hand"* — **naming neither the state nor the
  mode.** `booking_mode` is `request` or `reserve` (falling back to `reserve`),
  and **in reserve mode nothing needs confirming**, so the clause was
  unexecutable on half the product.
* **7.3's repair** said the saving must share *"the page's other supporting
  text"* — **an unnamed anchor.** A stranger has to choose an exemplar, which is
  the judgement the clause was removing.

**AND THE TWO FAILURES ARE THE SAME MOVE:** *"not the same weight"* became *"the
page's other supporting text"*; *"understandable"* became *"carrying the page's
proposition"*. **An unset threshold is easiest to replace with an unnamed anchor,
and a judgement word with another judgement word.** The repair reaches for the
nearest thing that *sounds* like an anchor and stops there.

**SO: YES, TURTLES — BUT CONVERGING RATHER THAN INFINITE, and the distinction
decides what to do about it.** The failures are getting **smaller and more
specific** each pass:

| pass | kind of hole found |
|---|---|
| 1st | a whole missing requirement — no recipient, no table, no cost, an OR that deleted a clause |
| 2nd | an anchor named too loosely, a mode left unscoped |
| 3rd (predicted) | which selector when the markup changes; which column `reminder_lead_minutes` sits on |

**Each pass finds less. None finds nothing.** Reading cannot terminate this,
because the reader and the author share the cadence that caused the hole.

### WHAT WOULD ACTUALLY BREAK THE LOOP — three things, in order of strength

1. **EXECUTE THE CRITERION INSTEAD OF READING IT.** This is the strong one and it
   is available today. **Every single one of the ten failures was a question you
   only ask when you try** — *which inbox, which layer, revoke what on which
   database, which element, which mode*. **Not one would have survived a first
   attempt to do the thing.** Reading tests whether a sentence sounds complete;
   executing tests whether it is. **This lane cannot execute most of them** — they
   need the browser, the dev server, `scripts/` — which is precisely why they were
   written rather than run, and why the loop stayed closed.
2. **A DIFFERENT READER.** The only true independence, and the reason the manager
   checking `FOR-ANDREW.md:857` caught a citation thirty-nine lines out that the
   author had read past twice. **Costly, and not always available.**
3. **A MECHANICAL PROPERTY CHECK, which is weaker but author-independent.** Not
   *is this criterion good* but: does it name **(a)** the thing to do, **(b)**
   where — a file, selector, table or endpoint, **(c)** with what — a credential,
   a fixture, a mode, **(d)** what it costs from a shared budget, and **(e)** what
   counts as failing? **Nine of the ten failures are a missing (b), (c) or (d).**
   A checklist does not need taste and does not share the author's cadence, which
   is exactly why it catches what careful re-reading does not.

**AND THE ANTI-FIX, NAMED BECAUSE IT IS WHAT I WOULD HAVE REACHED FOR:** *write
them more carefully.* **Eight of eight were written carefully.** Care is the thing
that produces a sentence that sounds finished, which is the exact condition the
hole hides in.

### WHAT THIS EXPERIMENT COULD STILL BE WRONG ABOUT

* **The cold reads were done by the author on the author's own work, minutes to
  hours later.** That is not independence; it is **distance**, and the only honest
  claim is that distance found ten holes. **A real stranger might find more, and
  might find these eight repairs inadequate too** — which is the point of saying
  the pass rate is zero rather than that the criteria are now good.
* **The ten repairs are untested.** Eight have had one cold read; two have had
  two. **By this experiment's own result, the expected number of surviving holes
  is not zero.**
* **The sample is this session's own criteria.** It says nothing about the
  criteria written by other sessions and already judged executable in batches 8
  to 12 — **those were graded by a reader who was not their author**, which by the
  argument above is the stronger test, and **they were not re-opened cold.** If
  that grading was as generous as self-grading, the executable counts in those
  batches are soft. **Not checked, and it is the next obvious thing.**

---

## BATCHES 13 AND 14 — THE PASS IS COMPLETE. ALL 62 OPEN ITEMS READ.

**2026-10-02. Repairs in `4ba6e67` (batch 13) and `6325b7c` (batch 14).**

| | |
|---|---|
| items in batch 13 | **10** |
| items in batch 14 | **2** |
| criterion a stranger could execute | **8** |
| **criterion rewritten** | **4** (12.4, the sweep-widths item, 14.21, 14.23) |
| could not judge | **0** |
| **running total** | **62 of 62 — the pass is finished** |

**Batch 13:** 12.2, 12.4, 14.9's `withinLimits` item, the five-runs
sweep-widths item, the declared-skip item, 14.15, 14.17, 14.18, **14.21**,
**14.22**. **Batch 14:** **14.23**, **14.24**.

**FOUR OF THE TWELVE WERE WRITTEN BY THIS SESSION THIS AFTERNOON, AND THREE OF
THOSE FOUR FAILED.** 14.21, 14.23 failed; 14.22 and 14.24 passed, the latter
with a clause added. **That is consistent with the cold-test result above and it
is the part worth carrying: self-written criteria fail at roughly the rate the
experiment measured, including ones written hours after the lesson.**

### 14.21 · I REPEATED, IN A NEW ENTRY, THE EXACT FAULT I HAD DIAGNOSED FOUR HOURS EARLIER

Its criterion required `platform-admins-declared` to read **"18 passed / 0
failed"**. **A typed count of the thing being measured** — add one assertion to
that test and the criterion becomes unmeetable. **This is 3.4's fault verbatim**,
and 3.4's repair was committed at 13:46 while 14.21 was written at 13:41 and
cold-read at 22:0x. **The lesson was written down between the two and did not
reach the second one**, which is the same shape as 3.4b's correction never
reaching 3.4's criterion, and as 0.6's title keeping its number while another
item corrected it.

**Second fault in the same clause:** *"read off the table in both directions"*.
**In this repo "both directions" means a sabotage proved two ways** — it is used
that way in `platform-admins-declared`'s own write-up. I meant *before and
after*. **The phrase said something other than what I meant, in a vocabulary the
repo had already fixed.**

### 14.23 · A BASELINE IT NEVER RECORDED, AND THE WRONG UNIT

**Fault one:** *"a discovered-control count strictly higher than **today's**"* —
**today's was never written down.** A stranger has nothing to compare against,
and the baseline moves while they look. **This repo's own rule, quoted from the
booking-column item: *"the before number, so the size of this is visible without
re-measuring anything."*** The run now walks the settings doors **twice in one
run** — folds closed, then opened — and reports both counts, so the comparison is
self-contained.

**Fault two, and it is the more interesting one:** *"a run that reports no change
on any of the **eighteen files**"*. **The eighteen are `app/src` files that use
`<details>`. The sweep reports controls per SCREEN and never mentions a file.**
A unit error — not a vague clause but a clause about the wrong kind of thing —
**which would have made the failure condition unreadable rather than merely
loose.** Now stated per screen.

### 12.4 · A CRITERION NAMING ONE OF TWO IS CLOSED BY HALF THE WORK

*"the demo account is refused at `/admin`"* — **singular, and there are two.**
14.8 established exactly this and **sized this very item on it**: *"12.4 said
'one guessable login' and there are **two** guessable logins, one of which
nothing tracks."* **So the correction existed, in the item that depends on it,
and never reached the criterion.** Fourth instance of that pattern today.

**New:** both rows dealt with, the roster in `docs/platform-admins.md` as the
list to work from, each removed or renamed to something unguessable, and
**`platform-admins-declared` passing against the updated roster** so the table
and the document still agree afterwards — because the obvious way to finish this
item is to delete rows and leave the document describing accounts that no longer
exist.

### THE SWEEP-WIDTHS ITEM · A STATISTICAL CLAUSE ON A SAMPLE THAT CANNOT MEASURE IT

*"a fix in `Walkthrough.jsx` that drops the 2-in-20 cold-open rate measurably."*
**Twenty runs cannot measure that drop.** Against a 10% base rate, **1-in-20 and
2-in-20 are the same observation** — so the clause could be closed on noise, or
left open by noise, and neither reading would mean anything. **It is the only
failing criterion in the whole pass that was unexecutable for a statistical
reason rather than a verbal one.**

**New:** closed **deterministically** — force the cold-open condition, show the
tour still reaches six blocks under it, name the mechanism. **One run instead of
twenty**, and if the condition cannot be forced, that is the finding.

### THE EIGHT THAT PASSED, AND THREE ARE WORTH COPYING

* **14.15** — *"a run that cannot reproduce it IS a valid close, provided it says
  so"*, plus **the body of any 429 read rather than its status**, because the
  function's own refusal carries `reason: "busy"` and the status cannot tell the
  two apart. **A criterion that anticipates its own null result is rare here.**
* **14.18** — *"if either call leaves no row, the per-IP limits are advisory
  rather than enforced. **That is the finding, not a failure of the test**, and it
  closes this item as much as a clean result would."*
* **14.17** — requires the check to **state which resources it cannot see**, with
  the 14.15 platform ceiling named explicitly as one of them. **The declared blind
  spot as a criterion rather than as an apology.**
* **12.2** — a two-branch close where **one branch is free and the entry says so**
  (*"or the home page stops promising it"*). Branch one names no card hardware,
  which is a small gap; branch two is executable today, and either closes it.
* **14.9's loop, the declared-skip item, 14.22, 14.24** — all executable;
  14.24 gained one clause saying where the record goes and that its three checks
  have separate pass conditions.

**ONE COST LEFT UNNAMED AND FLAGGED RATHER THAN FIXED:** 14.9's criterion —
*"a loop against each of the three writes is refused, and the refusal is proved
by running the loop"* — **is executable and spends a shared resource silently.**
A loop that trips a rate limit writes real rows until it trips, and `rate_hits`
is a declared shared resource (`docs/shared-resources.md`). **Not rewritten: the
cost is small, the criterion is otherwise exact, and adding a clause to every
criterion that touches a live endpoint is a bigger change than this pass should
make unasked.** Recorded so it is a decision rather than an oversight.

---

## THE PASS, COMPLETE — 62 OF 62

| | |
|---|---|
| open items read as a stranger | **62 of 62** |
| criteria rewritten to name a shape | **19** |
| of those, written by this session and then cold-read | **10** |
| **of those, failed the cold read** | **10** |
| items found closed in fact, open on paper | **2** — the 320 calendar item (ticked) and 11.3 (recommended) |
| items with no criterion at the start | **26** · **now 0** |
| gaps named in an entry but owned by no item | **3**, all now items (14.21–14.23) |

**THE SINGLE MOST USEFUL NUMBER IN THIS FILE IS TEN OUT OF TEN.** Every criterion
this session wrote *and* later read cold had a hole. **The pass rate on
self-graded work is zero**, measured across two sittings and three separate
batches, **including criteria written hours after the lesson had been written
down and committed.**

**WHAT THAT MEANS FOR WHOEVER READS THIS NEXT, said plainly:** the nineteen
rewritten criteria are **better than what they replaced and are not finished.**
Nine of them have never been read by anyone but their author. **By this file's own
measured rate, expect holes in them.** The three loop-breakers are named in the
cold-test section above, and the strong one is the cheap one: **execute the
criterion once. Every one of the twelve failures was a question nobody asks until
they try.**

---

## EXECUTING THE CRITERIA INSTEAD OF READING THEM — the per-criterion log

**2026-10-03. The pass file's own conclusion was that reading cannot tell whether
a criterion is executable, and that executing it is the loop-breaker available
without a second person. This section is that, done.** Eleven criteria run in
this lane. Three columns per criterion: **could it be executed from the entry
alone**, **what question did the entry not answer**, and **what one clause would
have saved me.**

### THE ANSWER TO THE QUESTION THE MANAGER ASKED, FIRST, BECAUSE IT IS NOT WHAT I EXPECTED

**Executing found one fault that reading had missed. Reading had found one fault
that executing cannot catch. Neither instrument dominates, and my own conclusion
does not flip — it narrows.**

* **14.22** was graded a **PASS on a read** in batch 13. **Run, its command cannot
  tell a pass from a fail.** Only execution found that.
* **14.21** had its criterion repaired *by reading* because it typed `"18 passed /
  0 failed"`. **Executed today it reports exactly 18 passed / 0 failed** — the
  typed number is correct right now, **so running it proves nothing is wrong, and
  running it next week after somebody adds an assertion is the only way execution
  ever catches it.** That fault is visible to reading and invisible to running.

**So the honest form of the conclusion is narrower than "execute, don't read":
execution catches a criterion that does not WORK; reading catches a criterion
that will not KEEP working.** Nine of the ten earlier failures were the first
kind, which is why executing looked like the whole answer.

### THE LOG

| # | criterion | executable from the entry alone? | the question the entry did not answer | the one clause that would have saved me |
|---|---|---|---|---|
| 1 | **14.22** grep half | **No** | *How do I tell a pass from a fail, when the command prints the same two lines either way?* | a command whose **output** decides — `grep -oE '.{2}"visits?"' … \| grep -v '^t('`, must print nothing |
| 2 | **3.4** count clause | **Yes** | — | — |
| 3 | **7.17** second half | **Yes**, and it is **already met** | *Is this half open or closed?* The entry reads as two open things; the rule **is** in `docs/tenant-site-kit.md` | one line saying which half is already done |
| 4 | **7.18** expected output | **Yes** — and its expected answer **verified** | — | — |
| 5 | **2.12** clause 1 | **Yes** | — | — |
| 6 | **14.21** second half | **Yes** | — *but see above: running it cannot see the fault reading found* | — |
| 7 | **14.14** receipt-fields | **Yes** | — | — |
| 8 | **0.6** receipt clause | **Yes** | — | — |
| 9 | **1.3** column clause | **Yes** | — | — |
| 10 | **8.10c** grants | **Yes** (as a precondition read) | — | — |
| 11 | **4.6** receipt scope | **Yes** (as a precondition read) | — | — |

### WHAT EACH RUN ACTUALLY RETURNED, so none of the above is a claim

| criterion | command | result |
|---|---|---|
| **14.22** | `grep -n '"visits\?"' app/src/screens/Clients.jsx` | **709 and 742** — and **709 and 742** again against a fixed copy. See below |
| **3.4** | `grep -cE '^export (const\|function) [a-zA-Z]+Email' …/emailTemplates.ts` | **16** — the criterion's own count mechanism works |
| **7.17** | `grep -ic "number the product cannot" docs/tenant-site-kit.md` | **1** — the rule is in the brief; **that half is closed** |
| **7.18** | `grep -c "navmenu\|burger" app/src/landing/LegalPage.jsx` | **0** — so the check's expected output (*it must name `/terms` and `/privacy`*) is **correct**, confirmed without building the check |
| **2.12** | `node --test tests/spanish.test.mjs` | **71 passed, 6 failed** — clause 1 correctly does not pass |
| **14.21** | `node --test tests/platform-admins-declared.test.mjs` | **18 passed, 0 failed** |
| **14.14** | `node --test tests/receipt-fields.test.mjs` | **56 passed, 0 failed, 56 assertions** |
| **0.6** | `node scripts/deployed-inventory.mjs` then read the receipt | **status fail · matching 15 · differing 24** — the generated figure works |
| **1.3** | `select is_test from customers limit 1` | **`42703` — column does not exist.** The entry's *"the SCREEN is proved and the COLUMN is not"* holds |
| **8.10c** | `grep -c "role_table_grants\|has_table_privilege" scripts/migration-drift.mjs` | **0** — grants genuinely uncompared, so the rewritten criterion has real work behind it |
| **4.6** | `grep -c "writeReceipt" scripts/sweep-tap-targets.mjs` | **2** — the entry says *"called exactly once, inside the admin section alone"*. **It is 2 now.** See below |

### THE ONE FAULT EXECUTION FOUND, IN FULL — 14.22

**The criterion said:** *no bare `"visit"`/`"visits"` literal remains —
`grep -n '"visits\?"' app/src/screens/Clients.jsx` returns only occurrences
inside a `t(` call.*

**Executed against today's file:** prints **709** and **742**.
**Executed against a copy with 742 fixed** (`sed` in a scratch directory;
`app/src` untouched): prints **709** and **742**.

**Byte-identical output either side of the fix.** `grep -n` prints **lines**; the
question is about **occurrences**; and **one line can hold a wrapped and an
unwrapped one**. So the command is a prompt to look, not a gate — and a stranger
scripting the criterion gets a pass in both states.

**The replacement, proved both ways before it was written into the entry:**

```bash
grep -oE '.{2}"visits?"' app/src/screens/Clients.jsx | grep -v '^t('   # must print NOTHING
```

**Today:** prints `? "visit"` and `: "visits"`. **Fixed copy:** prints nothing.

**And the part that matters for the experiment: a read graded this criterion a
PASS in batch 13.** It names a file, a command and a screen — everything a read
checks for. **Four minutes of running showed the command was decorative.**

### A SECOND THING EXECUTION TURNED UP, WHICH IS NOT A CRITERION FAULT

**4.6's entry says `writeReceipt` is *"called exactly once in the whole file,
inside the admin section alone — checked by grep, not assumed."*** **It is 2
today.** Measured just now. So either the second call site arrived after that
sentence was written, or the original count is wrong. **4.6's criterion is
unaffected** — it asks for a receipt covering the dashboard/settings sections,
which is a different question from how many times the function is called — **but
the entry now contains a stale measured number, and the next person to grep will
hit a 2 beside a sentence saying 1.** Recorded here rather than edited into 4.6,
because `scripts/` is not this lane and the explanation might be DP Cowork's
work in flight.

### THE CRITERIA THAT NEED THE BROWSER OR THE DEV SERVER — one line each, not reached

**Written for whoever has them, and deliberately not attempted here.**

* **7.3** clause (c) — *with the pricing page open, read the computed `font-size`
  and `font-weight` of `.ld .fine`, of `.ld .rungfig .fig`, and of the saving
  figure, and confirm the saving matches the first and neither matches the
  second.*
* **7.9** — *load the home page twice, once under `prefers-reduced-motion:
  reduce` and once with `?lite=1`, and after the first paint settles list every
  element whose computed opacity is 0 or which is absent from the layout; the
  list must be empty, and the DOM order must match the motion-on order.*
* **14.23** — *run `sweep-tap-targets.mjs` over the settings doors twice in one
  invocation, once without opening closed `<details>` and once with, and report
  both discovered-control counts per screen; the difference is the answer.*
* **9.11** first part — *re-run `sweep-widths.mjs` against the fixed tree so
  `receipts/sweep-widths-1920-1440-392-360-320.json` stops reading
  `"status": "fail"` over a `git_sha` that is an ancestor of the fix.*
* **9.4 / 9.7 / 9.10 / 9.15 / 12.1 / 8.2 / 8.5 / 3.4's send half** — all need a
  browser, a dev server, Stripe sandbox or a real phone. Their criteria already
  name what to do; none was reached.

### WHAT THIS LOG COULD BE WRONG ABOUT

* **Eleven of sixty-two, and they are the cheap end on purpose.** Every criterion
  that needs a browser is untested, and **those are the ones most likely to be
  wrong**, because they are the ones nobody can check in a minute.
* **Four of the eleven were executed as a *precondition read* rather than as the
  criterion itself** — 7.18, 8.10c, 4.6, and 7.17's second half. That tests
  whether the criterion's expected answer is right, which is weaker than running
  the criterion and stronger than reading it.
* **The 14.22 repair has not itself been cold-read by anyone else.** By this
  file's own measured rate, expect a hole in it.

### THE 11.3 PATTERN, RULED AND RECORDED — a criterion whose first clause reads as the whole test

**The manager verified this off the files rather than off my reply: 11.3 STAYS
OPEN, and I was wrong to recommend the tick.**

Its `Done when` has **two clauses that read as one**. The first — *"this item
closes as superseded by 9.10"* — is self-contained. The second, further down —
*"What closing it looks like: 9.10 is built and pressed"* — is the actual
condition. **9.10 is unticked and is not built.** The ticked `FOR-ANDREW.md` row
settles the open **question**, not the **build**, and the entry says both things
in the same breath: *"So there is no open question here to wait for"* sits beside
*"9.10 is built and pressed."* **I read the first clause and stopped, which is the
fault I have spent two days documenting.**

> **THE LESSON, WHICH IS THE DELIVERABLE AND NOT THE RULING:** a `Done when`
> whose **first clause looks sufficient on its own will be read that way**, and
> the rest will not be reached. **So the closing condition goes first, or the two
> clauses merge into one sentence.**

**AND THE MANAGER'S SHARPER VERSION, WHICH IS THE PART THAT GENERALISES:** **an
item whose criterion says it closes as superseded by another item has no owner —
because the superseding item does not know it is supposed to close anything.**
9.10's criterion says nothing about 11.3. **So 11.3 waits on an event nobody will
report.** That is a structural orphan, not a wording problem, and the two
closed-in-fact candidates found so far are both this family: the calendar item
waited on a `FOR-ANDREW.md` row nobody re-read, and 11.3 waits on a sibling
item's completion nobody will announce.

**WHAT WAS DONE ABOUT IT, mechanically rather than by re-reading.** For every
open item: does a **requirement** sit after its *"What failing looks like"* line,
where a reader takes it for commentary? **Ten hits, eight false positives** —
prose tails, and one from the scan leaking past an item boundary into the next
section, which is `docs/gotchas.md` 89's own bug in the tool written to find 89's
cousin. **Two were real and both were mine, both created yesterday by the
cold-read repairs while I was fixing something else:**

* **3.4** — the shared-cost clause and the unsendable-template clause sat below
  the failing line. **A stranger stopping there would have sent sixteen real
  emails to a charged domain and folded two unsendable templates into "sixteen of
  sixteen".**
* **7.8** — clauses **(c)** and **(d)** sat below the failing line, continuing an
  (a)/(b) list that ended above it. **Worse than a missing clause, because the
  numbering implies nothing is missing.**

Both moved above the failing line, each with a note saying where it used to be.

### FIVE MORE EXECUTIONS, AND TWO CRITERIA HAVE A HALF ALREADY MET

| # | criterion | command | result |
|---|---|---|---|
| 12 | **7.6** arithmetic | `rpc/photo_total_bytes`, `rpc/photo_tenant_share` | **1073741824** and **100** — so the criterion's arithmetic is **1 GB / 100 = 10.24 MB**, and both functions answer |
| 12a | **7.6** first clause | `grep -rin unlimited … \| grep -i photo` over `app/src` | **nothing.** No surface pairs "unlimited" with photos |
| 12b | **7.6** second clause | `grep -rn capBytes\|cap_bytes\|roomFor` | the figure comes from `photo_store_state()` / `photo_budget.cap_bytes`, **computed, not typed** |
| 13 | **12.2** branch two | `grep -ric "in person\|driveway\|card on the spot"` on `LandingPage.jsx` | **2** — so branch two has something real to remove; the precondition holds |

**7.6's FIRST CLAUSE IS ALREADY MET AND THE ENTRY DOES NOT SAY SO.** `/pricing`'s
"unlimited" list now reads *"Unlimited services, bookings and staff logins"* —
photos are out — and `LandingPage.jsx:1098` carries a comment recording that
*"photos" removed 2026-09-21*. **That is the second criterion in this log with a
half already satisfied, after 7.17.** A reader sees two open conditions and there
is one.

**AND IT IS NOT A CLOSED-IN-FACT ITEM, WHICH I CHECKED BEFORE SAYING SO**, having
just been caught doing the opposite on 11.3. **7.6's entry holds it deliberately:**
0.11 raises the allowance from 1 GB to 10 GB *in the same change as the upload
switch*, so *"this item closes inside that change, not before it — changing the
words now to describe 1 GB means changing them again a week later."* **The second
clause also cannot be settled from this lane**: the back office's own printed
per-tenant figure needs the screen, and `AdminPage.jsx`'s comments warn that
`photo_store_state()` returns the **platform** row while `cap_bytes` belongs to
`photo_budget` — two different numbers one grep apart.

> **ONE LINE FOR WHOEVER HAS THE BROWSER:** *open the back office's photo
> figure and confirm the per-business number it prints equals
> `photo_total_bytes() ÷ photo_tenant_share()` — 10.24 MB today — and that it is
> the `photo_budget` figure rather than the platform total.*

### TWO CRITERIA DELIBERATELY NOT EXECUTED, WITH THE REASON

**14.15** (*"the body of any 429 read rather than its status"*) and **14.18**
(*"one rate-limited public function called from outside with `x-forwarded-for`
absent, and again forged"*) are both executable in this lane — no browser, no dev
server. **Neither was run.** They spend the **address budget** and write to
**`rate_hits`**, both named on `docs/shared-resources.md`, and **DP Cowork is live
right now.** 14.16 exists because exactly this collision put a wrong reason into
`ROADMAP.md` once already. **Executing a criterion is not worth corrupting
somebody else's measurement**, and the criteria themselves are unchanged and
ready for a quiet moment.

### THE THREE THAT TOUCH NOTHING SHARED — and the third one bit me

| # | criterion | executable from the entry alone? | the question the entry did not answer | the one clause that would have saved me |
|---|---|---|---|---|
| 14 | **12.2** branch two | **Yes — and it is ALREADY MET** | *Is the promise still on the page?* The entry says it is, in the present tense. **It has not been since 2026-09-20** | the entry needed no clause; it needed **re-reading before the criterion was written five days later** |
| 15 | **4.1** audit-table precondition | **Yes** | — | — |
| 16 | **6.1** restore drill | **Yes, and it should not have been run the way I ran it** | *What does this script CREATE while it runs?* The entry says it is graded and fails; it does not say it builds a schema in the live database | *"this drill creates and drops a schema in `kguqylyzgyzfktkfnhjb`; let it finish"* |

#### 12.2 · THE SHARPEST CLOSED-IN-FACT FINDING YET, AND ONLY A GREP COULD SEE IT

**The entry says the home page promises *"Take a card payment on the
driveway."*** Executed: `grep -rnoE "card payment" app/src/landing/*.jsx` returns
**one** phrase, `LandingPage.jsx:895` — **"Log a card payment" · "on the
driveway"**. *Log* is exactly what the product does (`FinalizeModal.jsx` writes
the method into `payment_notes`).

**`git log -S"Take a card payment"` names the commit: `6097a7e`, 2026-09-20,
*"Home page promised a claim the product cannot keep yet: ROADMAP 12.2"*.** One
line: `Take` → `Log`. **The item's own fix, naming the item, thirteen days ago,
box still open.**

**And the criterion was written on 2026-09-25 — five days AFTER the fix — saying
*"which is the state today"*.** I graded it executable in batch 13 on a read and
did not notice. **Reading an entry cannot tell you its present tense has
expired.** Third closed-in-fact candidate, and unlike the calendar item and 11.3
this one waited on nothing external: **the answer was in its own git history.**

#### 4.1 · PRECONDITION CONFIRMED ABSENT, which is what the entry claims

Four candidate table names probed read-only: `booking_events` **404**,
`audit_log` **404**, `booking_audit` **404**, `platform_admin_events` **200**.
**So there is no booking-level audit table**, which is exactly what the entry
says — *"the audit history this item's own Done when asks for needs a migration
and a deploy"*. The one that exists is 4.3's, platform-admin scoped. **Criterion
survives; its second clause genuinely has nothing behind it yet.**

#### 6.1 · THE DRILL RAN AND PRODUCED A REAL RESULT — then I broke its teardown

**The measurement, which is 6.1's whole subject:**

| | |
|---|---|
| plan | **free** |
| point-in-time recovery | **OFF** |
| restorable backups listed | **0** |
| WAL archiving | **on, 15,046 segments, 0 failures**, last `2026-10-03 00:50:26Z` |
| export step | **55 tables, 1,833 rows → `artifacts/restore-drill/public-export.json`, 1,306 kB** |

**So *"there is no restore point"* is confirmed by running it**, not by reading
the entry, and the criterion's first steps work.

**AND THEN THE PART THAT IS MINE.** I ran it under `timeout 110`. **`timeout`
sends SIGTERM; a `finally` does not run on a signal.** The drill creates a
throwaway schema in step 3 and drops it in a `finally` at
`scripts/restore-drill.mjs:430` — **and that drop never happened.**
`select nspname from pg_namespace where nspname = 'restore_drill'` returns a row;
the schema holds **51 tables**. **`public` is untouched — 55 tables before, 55
after, checked.**

**It is `docs/gotchas.md` 90 now, and it is ROADMAP 14.21's own fault committed by
the session that wrote 14.21 that afternoon.** 14.21 says *put the teardown in a
`finally`*. **Here it was in a `finally` and still did not run**, so 14.21's fix
is necessary and not sufficient.

**THE SCHEMA IS STILL THERE.** Dropping it was **refused by the permission
classifier as a mass-delete action**, and I did not work around it. **It is in the
manager's hands**, and the natural remedy needs no decision: **the drill's own
next full run, not under `timeout`, drops it in the same `finally`** — which is
`scripts/`, DP Cowork's lane.

> **ONE LINE FOR WHOEVER HAS `scripts/`:** *run `node scripts/restore-drill.mjs`
> to completion with no `timeout` wrapper; its `finally` drops `restore_drill`.
> Then add a SIGINT/SIGTERM handler that throws, so the next caller cannot do
> what I did.*

**WHAT I SHOULD HAVE DONE, said plainly rather than filed as bad luck:** read what
the script creates before running it, and announce the write — `CLAUDE.md` says
*"say what you are about to write before you write it"* for this database, and I
ran a schema-creating script without doing either. **The criterion did not warn
me and that is a real gap in the entry; it is also not an excuse.**

---

## THE PRESENT-TENSE SWEEP — 252 asserted strings checked against git, 4 expired

**2026-10-03, on the manager's instruction after 12.2.** *A criterion in the
present tense expires without anyone touching it, and reading cannot catch that —
only running `git log -S` against the thing it claims can.*

### THE METHOD, so it can be repeated or disbelieved

1. **Every open item's text** scanned for **double-quoted phrases** of 10–70
   characters containing a space — the shape of a quoted UI string. Paths, code
   and single tokens filtered out. **350 candidates across 64 open items.**
2. Each tested against **one in-memory blob of every tracked file under
   `app/src`**. **98 are present today** — those claims are live and need nothing.
3. The remaining **252** got `git log --oneline -S"<string>" -- app/src`. **A
   string with commits behind it and no presence today is a claim that WAS true
   of the product and is not now.** That is the whole test.

| | |
|---|---|
| quoted strings found in open items | **350** |
| present in `app/src` today — claim live | **98** |
| **checked with `git log -S`** | **252** |
| **expired — once in `app/src`, gone now** | **4** |
| of those, already known | **1** (12.2) |
| **genuinely new findings** | **1** (7.8) |
| false positives on inspection | **2** |

### THE ONE NEW FINDING — 7.8, and it is 12.2's mechanism exactly

**`git log -S"name, email address and booking details" -- app/src`** →
**`2942f6f`, 2026-09-21, *"7.8: the privacy page now names all four, and the
conditional ones say so"*** — `legal.js`, +32/−2. **The commit names the item.**

7.8's entry carries a four-point audit of what the privacy page fails to say.
**All four were fixed twelve days ago.** `legal.js` now carries *"Geoapify a
second time, per distinct address"*, the weather service and its name, and a
line recording what the Resend sentence used to say. **A reader working that
list would redo finished work.**

**IT IS NOT A CLOSED-IN-FACT ITEM AND I CHECKED THAT BEFORE SAYING SO.** 7.8's
criterion has two clauses, and clause **(b)** — *a check that fails by name when
the code's host list and `/privacy`'s list disagree* — **does not exist.** The
page was reconciled **by hand, once**, which is the exact thing that criterion's
own *What failing looks like* warns about. **The copy half is done; the mechanism
half is the item.** So this is a **stale-audit** finding, a third category beside
closed-in-fact and a bad criterion.

### THE TWO FALSE POSITIVES, named so the yield is honest

* **9.7 — *"on my way,"***. Left `app/src` in a copy pass (`2fff045`). But the
  entry quotes it as **an example of what a template token fills**, inside an
  aside explaining why the client card cannot reuse `BookingDetail`'s picker.
  **The claim is about the picker, which still exists.** The phrase changing is
  not the claim expiring.
* **The `withinLimits` item — *"four fixed"***. Prose, not a UI string; it
  matched `45eaf85` by coincidence of wording.

**Two of four is a 50% false-positive rate on the expired set**, which is the
honest number and is why each of the four was opened rather than reported from
the list. **The list is a lead; the entry is the verdict** — the same rule the
ticked-item audit arrived at four scans in.

### WHAT THE SWEEP IS GOOD FOR, AND WHAT IT CANNOT SEE

**It is cheap and it works: 252 git calls, one real finding, and the finding is
the kind nothing else catches** — an entry describing a past state in the
present tense, which reads as perfectly current and is checkable only against
history.

**Three things it cannot see, stated so the next person does not over-trust
it:**
1. **A claim with no quoted string.** *"the page promises a driveway card
   payment"* with no quote attached has nothing to search for. **12.2 was
   catchable only because somebody had quoted the exact words.**
2. **A claim about behaviour rather than text** — *"Continue stays disabled"*,
   *"the count includes fixtures"*. No string, no `git log -S`.
3. **A string that changed in a file outside `app/src`** — a migration, an edge
   function, a script. The sweep was scoped to `app/src` because that is where
   screen copy lives; **a claim about an edge function's wording would be
   missed.**

**So: 4 of 252, 1 real, and the method's ceiling is quoted screen text.** Worth
re-running whenever an item is picked up, and **not** worth treating as a clean
bill for the entries it passed over.

---

## THE THREE CATEGORIES — the taxonomy, because a later reader needs to know which question they are answering

**Three different faults have been found in this pass and conflating them is how
a half-finished item gets ticked. Different evidence, different fix, different
owner.**

| | **CLOSED IN FACT** | **STALE AUDIT** | **BAD CRITERION** |
|---|---|---|---|
| **what is wrong** | the work is done and the box never moved | the findings the entry LISTS were fixed; the list still reads as outstanding | the test cannot tell a pass from a fail |
| **what is still true** | nothing — it is finished | the item is open for a *different*, real reason | the item may be wholly unstarted |
| **how it is found** | `git log --grep`/`-S`, or two documents side by side | same | reading, or executing the criterion |
| **the fix** | tick it | rewrite the entry's findings list | rewrite the criterion |
| **whose** | the manager's — closures are not a session's call | whoever owns the entry | whoever owns the entry |
| **the example** | the 320 calendar item; **12.2** | **7.8** | 8.10c, 7.3, 4.1, 4.3 |

> **THE RULE 9.2 GIVES, AND IT APPLIES TO EVERY CRITERION ANYBODY WRITES HERE
> FROM NOW ON: a criterion that quotes the product must be written FROM the
> product, never from the entry describing it.** 9.2's rewritten criterion quoted
> a sentence removed from `AdminPage.jsx` eleven days earlier. It was written from
> the entry's diagnosis, by the session that had found 12.2 doing exactly that the
> day before. **An entry is a description of the product at a moment; the product
> is the product.** One `grep` of the file would have cost ten seconds.

**DECLARED PARTIAL IS A HEALTHY STATE, NOT A FINDING.** Nine items have a commit
that names them, does real work and stops, and **seven of the nine say so in
their own subject line.** *"4.3: the history half is built and pressed; the entry
stays open for the other half."* **That is the record working exactly as it
should.** It is listed here so it has a name and stops being mistaken for the
other two — **nine is not nine problems**, and a later reader who counts it as a
backlog has misread the taxonomy.
**7.8 IS WHY THE TAXONOMY EXISTS.** Its four listed findings were fixed on
2026-09-21 by a commit naming 7.8 — **and it is not closed in fact**, because its
criterion's clause (b), a check that fails by name, does not exist. **Treating a
stale audit as a closed-in-fact item would have ticked an item whose mechanism
half was never built.**

---

## THE COMMIT-GREP SWEEP — what the repo says was done, against what the entries say is true

**2026-10-03.** The string sweep asked *is this quoted text still on screen* and
found 1 real in 252, because its ceiling is quoted copy in `app/src`. **This asks
the other direction: did a commit name an open item and claim to finish it.** No
dependence on quotes, on screen text, or on `app/src`.

### THE NUMBERS

| | |
|---|---|
| open items | **64** — 62 numbered, **2 with no number at all and therefore ungreppable** |
| **items whose number appears in a commit message** | **62 of 62** |
| commits naming an open item | **534** |
| of those, **completion-shaped** subjects (done/fixed/closed/built/lands/no longer/stops…) | **146** |
| minus this audit's own reporting commits | **101** |
| minus commits predating the current `ROADMAP.md` | **80**, across **36 items** |
| **items whose own number LEADS a claimed-fix commit** — the hand-opened set | **19** |
| **closed in fact** | **1** (12.2, found earlier by the string sweep; this sweep re-found it independently) |
| **stale audit** | **2** — 7.8, and **9.2** |
| **partial fix that named the item and did not finish it** | **9** |

**THE THIRD BUCKET IS THE BIGGEST, AS PREDICTED, AND IT IS NOT A FAULT.** Nine
items have a commit that names them, does real work, and stops — **and in seven
of the nine the commit SAYS SO in its own subject line.** *"4.3: the history half
is built and pressed; the entry stays open for the other half."* *"8.5 measured
and split proposed, nothing built."* *"14.9 is open on one thing."* **That is not
a gap in the record; it is the record working.** The bucket needs a name so it
stops being mistaken for the other two, and the name is **declared partial**.

### THE ONE THAT WAS NOT DECLARED — 9.2, and it is mine

`git log --grep "9\.2"` names **`5202586`, 2026-09-21, *"9.2(b): the row stops
claiming the page works, because it never checked"***. **The sentence is gone
from `AdminPage.jsx`** — replaced by *"Ask how they are telling their own
customers about their booking page"*, under eighteen lines of comment asking the
next person not to put a lead fact back.

**My rewritten criterion, written 2026-10-02, quotes that sentence in the present
tense.** I rewrote it from the entry's own diagnosis **without checking the
code** — **12.2's fault, committed by the session that had found 12.2 the day
before, in the criterion it wrote to fix a different fault in the same item.**
Corrected; `first` is marked done and must not be re-fixed.

### THE METHOD'S OWN TRAP, WHICH COST 21 FALSE POSITIVES BEFORE IT WAS CAUGHT

**`ROADMAP.md` and `docs/roadmap.md` REUSE ITEM NUMBERS.** `docs/roadmap.md:71`
carries its own **1.3** — *"DONE 2026-08-29 — direction 5 built and APPROVED"* —
and `git log --grep` happily returned `ad8eb43`, *"1.3 done: bottom-of-page
reveal bug fixed"*, dated **2026-08-29**, touching
`docs/design-directions/5-the-thread.html`. **A different roadmap, a different
item, the same number.**

**The fix is a date floor.** The current `ROADMAP.md` begins at `425d720`,
**2026-09-12**. Commits older than that cite the old numbering. **21 of the 101
claimed fixes fell away on that one line**, including every hit for 0.4, 3.1 and
6.2 that had looked alarming.

**It is `docs/gotchas.md` 89's family again — a population fault, not a verdict
fault** — and the identifier collision is the same shape as `"1.3 —"` matching
`"11.3 —"`, one level up: **not two strings that overlap, but two numbering
schemes that do.**

### WHY EVERY SURVIVING HIT WAS OPENED BY HAND

**The string sweep's false-positive rate on its hit set was 50%** — two of four.
**This sweep's was worse before the date floor**: 21 of 101. **A list of commit
subjects is a lead and never a verdict**, and both numbers are here so nobody
quotes the headline without the caveat.

### WHAT THIS SWEEP CANNOT SEE

* **The two unnumbered open items** — the reseed item and the stale-blocker item
  — **have no number to grep.** They are structurally invisible to this method
  and to any method keyed on identifiers. **Two of sixty-four, permanently.**
* **A fix whose commit message never named the item.** The whole method assumes
  the discipline of citing the number, which this repo mostly has and does not
  enforce.
* **A fix that landed in a commit about something else** — the subject names item
  A, the diff also closes item B.

---

## AN ITEM WITH NO IDENTIFIER IS NOT HARD TO FIND — IT IS UNCHECKABLE

**Put here, near the top of the file, because it is the sentence a stranger most
needs and it cost two weeks to learn.**

**14.26 and 14.27 had no numbers for ten days.** Every instrument in this repo
keys on the item number — the commit-grep sweep, the present-tense sweep, the
batch audits, `git log --grep`. **So neither item was ever checked by any of
them, and nothing said so**, because an instrument that enumerates by identifier
cannot report an item it never enumerated. Other entries cited them as *"the
reseed item"* and *"the stale-blocker item"*, **which is itself the evidence they
needed numbers**: a thing referred to by description is a thing nothing can
index.

**THE MOMENT THEY WERE NUMBERED, ONE OF THEM TURNED OUT TO BE THE SHARPEST
FINDING OF THE NIGHT.** 14.26 had predicted its own fault in writing on
2026-09-23 — that the replacement evidence row *"will go the same way at the
next reseed"* — and **it had already happened**: both rows gone, the tenant
recreated under a new `business_id`, and **zero rows anywhere in the database
with `address_source = 'picked'`**, which was the single piece of evidence 2.8's
tick rested on.

> **An item with no identifier is not merely hard to find. It is uncheckable,
> and the cost is invisible until somebody looks.**

**The cheapest guard is the one this file now has: count the open items with no
number, and expect zero.** It was 2 for ten days and nothing noticed.

---

## THE 9.2 RULE, APPLIED TO EVERY CRITERION THAT QUOTES A STRING — a clean sweep

**2026-10-03.** *A criterion that quotes the product must be written FROM the
product, never from the entry describing it.* **Here is that rule run as a
check.**

### THE METHOD AND THE NUMBERS

1. For every open item, take the **criterion zone** — first `Done when` to the
   end of the entry — and collect **quoted fragments** of 8–70 characters
   containing a space, where the zone also **names a file**.
2. Test each against one blob of every tracked file in **`app/src`,
   `supabase/functions`, `scripts` and `tests`**.
3. For every miss, run **`git log -S`** over `app/src` and
   `supabase/functions`. **A fragment that was once in the source and is not now
   is the 9.2 shape.** Everything else is prose.

| | |
|---|---|
| open items whose criterion quotes a string **and** names a file | **36** |
| quoted fragments in those criteria | **247** |
| **still present in the source** | **125** |
| not found | **122** |
| of those, **once in the source and now gone** | **4** |
| **new misses** | **0** |

**ZERO NEW MISSES, AND THAT IS THE RESULT.** All four hits were already found
and recorded: **7.8**, **9.2**, **12.2**, and the known prose false positive
*"four fixed"*. **A clean sweep after 9.2 is worth saying plainly** — the rule
was written from one instance and the instance turned out not to be a pattern in
the criteria.

### BUT IT WAS A PATTERN SOMEWHERE ELSE, AND THE SWEEP FOUND IT BY ACCIDENT

**The three real hits are not in the criteria. They are in the items' OPENING
PARAGRAPHS.** I had corrected all three criteria over the last two days and left
the headline framing untouched, so:

* **9.2's** first paragraph still read *Growth says a page "cannot take a
  booking" and also "the page works and nobody has used it"* — **removed
  2026-09-21.**
* **7.8's** still read *"It names Supabase, Netlify, Resend, Stripe and Google…
  so typed addresses go somewhere the policy does not mention"* — **fixed
  2026-09-21.**
* **12.2's** still read *the home page promises "Take a card payment on the
  driveway"* — **changed 2026-09-20.**

**That is 11.3's lesson in a second place: a reader stops at the opening
paragraph, and three items opened with a false present tense while their
corrections sat forty to a hundred lines below.** Each now carries a one-line
`***STALE SINCE …***` marker naming the commit and pointing down. **The original
audit wording is kept rather than rewritten** — it is what the auditors saw, and
the reversal is the load-bearing part.

### WHAT THIS SWEEP CANNOT SEE

* **A criterion that paraphrases the product instead of quoting it.** No quote,
  no fragment, no check. **This is the big one**, and it is unbounded.
* **A quote that still matches the source but means something different now** —
  the string survives, the surrounding logic changed.
* **Prose quotes are indistinguishable from product quotes** at 122 misses, so
  the `git log -S` step is doing all the discrimination; without it the sweep
  would report 122 findings and be useless.

---

## THE OTHER DOCUMENTS THAT ISSUE IDENTIFIERS — asked, answered, and NOT built

**2026-10-03. The question before the build: do `FOUND.md` and
`docs/VERIFIED.md` issue identifiers, does anything cite them, and is the
citation unambiguous.**

| | **FOUND.md** | **docs/VERIFIED.md** |
|---|---|---|
| issues identifiers? | **No numbers at all** — 114 headings, all prose sentences | **Yes**, `## 14.1`-style sections |
| cited? | **Yes, 14 times**, by heading text | **Yes, 18 times**, by section number |
| **dangling citations today** | **0** | **0** |

### THE ANSWER IS ZERO AND NOTHING GETS BUILT

**Every one of the 32 citations into those two files resolves.** `FOUND.md` has
no id scheme, so nothing cites it by id — it is cited by heading, and **every
heading cited still exists.**

**AND THE STRONGER REASON NOT TO BUILD IT: my own matcher produced three false
positives and zero true positives across two attempts.**

* Attempt 1 flagged `ROADMAP.md § "Four things this product does silently"`. The
  heading is `FOUND.md:3827` — ***"PROPOSAL · FOUR THINGS THIS PRODUCT DOES
  SILENTLY, AND WHAT IT WOULD COST TO SAY THEM"***. My prefix match failed on
  the word *PROPOSAL*.
* Attempt 2, with containment instead, flagged two more. Both resolve —
  `FOUND.md:397` and `:991` — and failed only because the citation text runs
  **past** the heading into the sentence around it.

**So a text-matching citation check would be noisier than the problem it
watches.** Three false alarms against zero real ones, on a population of 32.
**A check with no reader is the same waste as a sentence nobody reads, and a
check that cries wolf three times out of three is worse** — it trains the next
person to skip it. **Not built, and this paragraph is the record of why**, so
the next session does not build it on the strength of the idea alone.

**WHAT WOULD CHANGE THE ANSWER:** `FOUND.md` adopting numbered entries, or a
heading being reworded and a citation rotting for real. **The second is worth
re-measuring whenever somebody renames a `FOUND.md` heading** — the command is
in this section's own method and takes seconds.

---

## THE WORK QUEUE — open items ready to be handed to the build lane, cheapest first

**2026-10-03. Not a summary of the roadmap: a list to hand over item by item
without re-reading anything.** Every item below has a **criterion executable
from its own entry**, **no decision of Andrew's in the way**, and **no
dependency on something unbuilt**. The first step is the literal next action.

### READY NOW

| # | item | lane | first step |
|---|---|---|---|
| **1** | **9.11**, first clause | `scripts/` | **Re-run `sweep-widths.mjs` against the fixed tree.** Nothing to build — the receipt on disk still reads `"status": "fail"` over a `git_sha` that is an **ancestor** of the fix, so it reads as a live failure to anyone who does not check the sha. One run. |
| **2** | **14.22** | `app/src` | **Wrap `Clients.jsx:742` in `t()`**, matching line 709 thirty-three rows above. Then `grep -oE '.{2}"visits?"' app/src/screens/Clients.jsx \| grep -v '^t('` must print nothing, and the record card must read `visita`/`visitas` in Spanish. |
| **3** | **14.21** | `scripts/` | **Put `admin-contrast.mjs`'s teardown in a `finally` AND add a SIGINT/SIGTERM handler**, then prove all three exits — clean, `--crash-after-signin`, SIGTERM — each leaving `platform_admins` unchanged. A `finally` alone is not enough; `gotchas` 90 is why. |
| **4** | **14.26's fix** | `scripts/` | **Make `seed-demo.mjs` create one booking with `address_source = 'picked'` every run.** There are **zero** such rows in the database today and 2.8's tick depends on one existing. |
| **5** | **3.4c** | `supabase/` + fixture | **Put both hard-coded literals through `formatDateLong`**, make the 1-day fixture carry a date one day out, render a Spanish maintenance email, and **break it on purpose** — put an English literal back and the run must say so, which today it does not. |
| **6** | **7.18** | `scripts/` | **Write the `.ld` nav check and run it ONCE, unmodified, before patching anything** — it must name `/terms` and `/privacy`. Verified 2026-10-03: `grep -c "navmenu\|burger" app/src/landing/LegalPage.jsx` is **0**, so that expected output is correct. |
| **7** | **4.6** | `scripts/` | **Make a default run of `sweep-tap-targets.mjs` write a receipt for the dashboard/settings sections**, not only `/admin`. `writeReceipt` appears **2** times today against an entry claiming 1 — reconcile that while you are in the file. |
| **8** | **14.23** | `scripts/` | **Walk the settings doors twice in one run** — folds closed, then opened — and report both discovered-control counts per screen. `scripts/sweep-tap-targets.mjs` and `lib/tapProbe.mjs` contain the string `details` **zero** times against **18** files that use one. |
| **9** | **8.10c** | `scripts/` | **Add GRANTS to `migration-drift.mjs`** from `information_schema.role_table_grants`, with an UNJUDGEABLE bucket by file name. **The sabotage is repo-side or synthetic — never revoke a live grant.** |
| **10** | **2.12** | `app/src` | **Fix the six failures in `tests/spanish.test.mjs`**, all of which are 2.12's own subject. It is **71 passed / 6 failed** today, so the gate is already pointing at the work. |
| **11** | **9.2** | `app/src` | **Audit the other four `STUCK` rows** in `AdminPage.jsx` for advice that states a fact the row never computed. The `first` row **is already fixed** (`5202586`) and must not be re-fixed. |
| **12** | **7.9** | `app/src` | **Load the home page under `prefers-reduced-motion: reduce` and `?lite=1`** and list every element at opacity 0 or absent from layout after first paint. The list must be empty; 7.12's `data-rv` bug is the known offender. |

### BLOCKED, AND ON WHAT

| item | blocked on |
|---|---|
| **0.12** | **Zoho** — it refuses the domain; no API token exists until one verifies |
| **0.13**, **0.14**, **0.15** | **third parties** — a number, a six-digit code, a Google review |
| **0.4**, **0.7**, **12.3** | **Andrew** — two factual questions, `what-we-send.md` Question 3, the deposit design. All three have a `FOR-ANDREW.md` row with a recommendation |
| **1.3**, **2.1**, **2.8**'s live half | **a publish or a migration** — Andrew's, and a deferral he chose |
| **6.1** | **the platform** — point-in-time recovery is OFF and 0 backups are listed on the free plan |
| **7.6** | **0.11** by design — the allowance moves 1 GB → 10 GB in the same change; fixing the words now means fixing them twice |
| **8.2**, **9.4**, **9.7**, **9.10**, **9.15** | **Andrew's own eyes** — a phone he owns, a screen he presses |
| **14.15**, **14.18** | **parked by the manager** — they spend the address budget and `rate_hits` while the other lane is live |
| **restore_drill** cleanup | already queued for the build lane; **not an item** |

### HOW THIS LIST WAS BUILT, SO IT CAN BE DISBELIEVED

**Every "ready" row rests on something measured in this file**, not on a reading
of the entry: 9.11's stale receipt sha, 14.22's grep proved both ways, 14.21's
SIGTERM leak measured on `restore-drill`, 14.26's zero `picked` rows,
7.18's zero nav matches, 4.6's `writeReceipt` count of 2, 14.23's zero `details`
against 18 files, 2.12's 71/6, 9.2's `5202586`.

**What it does not tell you:** how long any of them takes. **Cheapest-first here
means fewest unknowns, not fewest minutes** — #1 is one command and #12 could be
an afternoon.

---

## A SMALL RULE, EARNED THREE TIMES TODAY — match by containment, confirm by opening

**A prefix match is a guess about FORMATTING; containment is a guess about
MEANING; opening it is the answer.** Three times on 2026-10-03 a prefix died on
something harmless: `"1.3 —"` against `"11.3 —"` (gotcha 89), an exclusion list
against an item number, and a citation matcher against
`"PROPOSAL · FOUR THINGS THIS PRODUCT DOES SILENTLY…"` — **where the only fault
was the word `PROPOSAL` in front.** Containment would have survived all three.
**And containment still produced two more false positives in the same sweep, so
the second half of the rule is not optional: open every hit before calling it
one.**

---

## RE-PROVING THE QUEUE — one command per row, and it caught a stale row on its first run

**The queue is a derived list and derived lists rot here: 12.2 and 7.8 both
went stale inside a fortnight.** So every ready row now carries **one command
that re-proves it still belongs.**

### THE WORKED EXAMPLE FOR THE WHOLE CONVENTION — same word, opposite meaning

**9.11's receipt said `fail` before and says `fail` now, and they are different
fails.** This is the cleanest case in the repo of **a verdict that is honest and
a reading that is not.**

| | before | after |
|---|---|---|
| `status` | **`fail`** | **`fail`** |
| `git_sha` | an **ancestor** of the fix | **`50767da`** — that hour's HEAD |
| run time | days earlier | `started_at 01:52:40Z` → `finished_at 02:01:56Z` |
| what it means | **a stale red** — nobody had re-run it since the fix | **a live red** — 2 real findings, the first `guide · calendar 5` at 1920, *"the whole page can be dragged sideways, +51px"* |
| what to do | re-run it; the row is free work | **hand it to nobody**; the clause is met and the remaining findings are new |

**A reader comparing the two sees the same word and concludes nothing changed.**
The only thing that separates them is the **sha and the timestamp**, which is why
9.11's clause was written about the sha and not about the status — **and why a
command can tell them apart when a sentence cannot.** The manager was ninety
minutes from handing out finished work.

**AND THE SECOND HALF OF THE ARGUMENT IS THE ERROR RATE.** **Every one of the ten
commands was executed before it was written down, and one of the ten was wrong.**
Row 3.4c's first version probed `2026-10-12` — the ISO date the entry proposes as
the **fix** — instead of `"12 October 2026"`, the literal actually in
`scripts/render-emails.mjs`. **It exited 1 and would have retired a live row.**

**One in ten, written by somebody who knew exactly what each command meant.**
That is the rate on a good day with full context, and it is the reason the rule
is *run it before you write it down* rather than *write it carefully*.

**A THIRD ONE, FOUND BY THE SCRIPT ITSELF:** row 2.12's command runs
`node --test`, and a **nested runner inherits `NODE_TEST_CONTEXT`**, so it exited
1 while the suite behaved exactly as the row expects — **a false "HAS MOVED" in
the file written to prevent false "HAS MOVED"**. Inherited env exit 1, stripped
env exit 0, same command. `run()` strips it now. **So the honest count is one
wrong command in ten, plus one wrong HARNESS, and both were found by running.**
### THE CONVENTION, so no reader has to interpret anything

> **Run it. `exit 0` means the row still belongs. Any non-zero exit means the
> row has MOVED — go and look before handing it to anybody.**

**No output needs reading.** Several commands are deliberately inverted (`!
grep …`) so that *the fault still being present* is the success case. That looks
odd and it is the point: **the thing being re-proved is the row's membership,
not the product's health.**

### IT CAUGHT ONE IMMEDIATELY, WHICH IS THE WHOLE ARGUMENT

**Row #1 — 9.11's first clause — was stale within ninety minutes of being
written.** The queue said *"nothing to build: the receipt still reads
`"status": "fail"` over a `git_sha` that is an ancestor of the fix."*

**Measured:** `receipts/sweep-widths-1920-1440-392-360-320.json` carries
`started_at 2026-10-03T01:52:40Z`, `finished_at 02:01:56Z`, and
`git_sha 50767da` — **this session's own commit from twenty minutes earlier.**
**DP Cowork re-ran it.** The clause asked for the sweep to be re-run against the
fixed tree, **and it has been.**

**The receipt still says `fail`, and that is now an HONEST fail** — 2 findings,
the first being `guide · calendar 5` at **1920**, *"the whole page can be dragged
sideways, +51px"*. **A stale red became a live red while the queue was being
written**, and only a command could tell the two apart, because **both print the
word `fail`.**

> **ROW #1 IS DONE. Do not hand it to anybody.** What is left of 9.11 is its
> second clause — the press at a width Andrew's browser cannot reach — and that
> is blocked on him, not on the build lane.

### THE COMMANDS, EVERY ONE RUN BEFORE IT WAS WRITTEN DOWN

**Credential-free unless the row says otherwise.**

| # | item | re-prove command — `exit 0` = still belongs |
|---|---|---|
| ~~1~~ | ~~9.11~~ | **DONE 2026-10-03 02:01 — see above.** |
| **2** | 14.22 | `grep -oE '.{2}"visits?"' app/src/screens/Clients.jsx \| grep -qv '^t('` |
| **3** | 14.21 | `! grep -qE 'SIGTERM\|SIGINT' scripts/admin-contrast.mjs` |
| **4** | 14.26 fix | `test "$(curl -s "$SUPABASE_URL/rest/v1/bookings?address_source=eq.picked&select=id" -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY")" = "[]"` — **needs the service key; it is in the repo-root `.env` as `SUPABASE_SECRET_KEY`, loaded with `set -a; . ./.env; set +a`. Never printed.** |
| **5** | 3.4c | `grep -q '"12 October 2026"' scripts/render-emails.mjs` |
| **6** | 7.18 | `! grep -qE 'navmenu\|burger' app/src/landing/LegalPage.jsx` |
| **7** | 4.6 | `grep -q 'the /admin back office only' receipts/sweep-tap-targets.json` |
| **8** | 14.23 | `! grep -qi details scripts/lib/tapProbe.mjs` |
| **9** | 8.10c | `! grep -q role_table_grants scripts/migration-drift.mjs` |
| **10** | 2.12 | `! node --test tests/spanish.test.mjs` — inverted: the suite failing **is** the row's membership |
| **11** | 9.2 | **NO COMMAND — see below** |
| **12** | 7.9 | **NO COMMAND — see below** |

**Every command in that table was executed before it was written here**, and #5
was **wrong on the first attempt** — it probed `2026-10-12`, the ISO date the
entry proposes as the *fix*, rather than `"12 October 2026"`, the literal that is
actually in the file. **It exited 1 and would have retired a live row.** Caught
because the commands were run rather than reasoned, which is the same lesson one
more time.

### THE TWO THAT CANNOT BE RE-PROVED BY A COMMAND, said rather than invented

**An honest unverifiable row beats a check that cannot go red.**

* **9.2** — its membership is *"do the other four `STUCK` rows state facts they
  did not compute?"* **That is a reading of five advice strings against five
  predicates, and no grep expresses it.** A command could only confirm the file
  still exists. **Re-prove it by opening `AdminPage.jsx`'s `STUCK` array and
  reading the four, which is also the first step of the work.**
* **7.9** — its membership is *"is anything at opacity 0 after first paint under
  reduced motion?"* **That needs a rendered page**, which is the browser, which
  is why the item is on the list at all. **No command in this lane can answer
  it**, and inventing one that greps for `data-rv` would re-prove the wrong
  thing — presence is not visibility, which is 7.12's whole finding.

### AND THE CAVEAT STAYS AT THE TOP OF THE QUEUE, IN THESE WORDS

> **Cheapest-first means fewest unknowns, not fewest minutes.** Number one was a
> single command; number twelve could be an afternoon. **A reader who takes
> *cheapest* to mean *quickest* will pick wrong.**
