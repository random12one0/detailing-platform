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
