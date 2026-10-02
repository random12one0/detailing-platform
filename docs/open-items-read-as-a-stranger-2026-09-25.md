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
