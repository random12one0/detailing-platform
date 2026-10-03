# The silence census — which checks can tell a pass from a did-not-run

**2026-09-20.** Started because `langCheck()` in `sweep-widths.mjs` was found to
be a check that **can only fail**. It says nothing when a surface is correctly
Spanish, and nothing when the catalogue recognises no phrase on it at all —
**and those two silences are identical in the log.** It had been running for
days and everybody read its silence as a yes. No run had ever *asserted* that
the customer's half rendered Spanish; runs had only failed to assert that it
did not.

That is not a `langCheck` bug. It is the shape this whole repo exists to catch,
found inside one of the instruments. So the same question was asked of every
other check: **can it distinguish a pass from a did-not-run, and if not, what
would make it say which?**

---

---

## THIS DOCUMENT CANNOT TELL A PASS FROM A DID-NOT-RUN ABOUT ITS OWN NUMBERS — 31 of 31 bare

**Every figure in the table below carries the command that produced it and the
revision it was taken at, which is the one thing nothing else in this file does.**

| | measured 2026-10-02 @ `9901b16` | re-take |
|---|---|---|
| figures in this file's tables | **31** | `node --test tests/figures-carry-their-command.test.mjs` @ `9901b16` |
| carrying a command **and** a revision | **0** | `node --test tests/figures-carry-their-command.test.mjs` @ `9901b16` |
| **bare** | **31 — one hundred per cent** | `node --test tests/figures-carry-their-command.test.mjs` @ `9901b16` |
| figure-bearing rows | **29** | `node --test tests/figures-carry-their-command.test.mjs` @ `9901b16` |
| of those, carrying a command | **1** | `node --test tests/figures-carry-their-command.test.mjs` @ `9901b16` |
| of those, carrying a revision | **2** | `node --test tests/figures-carry-their-command.test.mjs` @ `9901b16` |
| carrying **both** | **0** | `node --test tests/figures-carry-their-command.test.mjs` @ `9901b16` |

`docs/gotchas.md` **94** is the rule: *a recorded number carries the command that
produced it and the revision it was taken at, or it is not a measurement, it is a
memory.* **This file holds the repo's census of which checks can report honestly
about their own silence. Not one of its own 31 figures can.**

> **The document that exists to catch a check which cannot distinguish a pass
> from a did-not-run is itself a set of numbers nobody can distinguish from
> memories.**

### IT WAS CHECKED BEFORE IT WAS CLAIMED, because the obvious way to be wrong here is a scanner that misses the commands actually present

The first pass reported 100% bare while row 76 plainly carries `ls scripts/*.mjs`.

***AND THE FIRST CORRECTION WAS MADE IN THE WRONG INSTRUMENT, WHICH IS WORTH MORE
THAN THE FINDING.*** The widening was done in a throwaway probe, the sentence
below was written describing *that*, and **the committed check
`tests/figures-carry-their-command.test.mjs` was still matching only four command
names.** So this file carried a true sentence about an instrument nobody runs,
while the instrument that gates the repo went on calling pinned rows bare. Caught
2026-10-02 only because the check named a row as bare that visibly carried a
command. **Two instruments and one sentence: say which one you widened.**
**So the command pattern was widened from four names to thirteen** — `git`,
`grep`, `node`, `sed`, `ls`, `wc`, `awk`, `find`, `cat`, `curl`, `npm`, `test`,
`rg` — **and the figure did not move**, because 94 requires BOTH halves and no row
here has both. **A finding that survives having its own instrument widened is a
finding; one that does not is a bug in the instrument**, which is the distinction
that cost this repo a correct measurement earlier the same night (`gotchas.md` 93).

The two rows with a revision are the timeline rows at `c024f89` and `f2dc0fc`.
**Both resolve to real commits** — checked, because a fabricated sha is the
cheapest fake annotation — and they are the best rows in the file: half-pinned,
one edit from pinned.

### AND THE CHECK CAUGHT THIS SECTION'S OWN TABLE, WHICH IS THE SHORTEST PROOF IT WORKS

The table above was first written with the revision in its HEADER row and the
command in each data row. **The scan classified every one of its figures as bare**,
and it was right: the rule is per figure, and a figure whose revision lives in a
different row does not carry one. The revision was added to each row, and the
figures moved from bare to pinned in the same edit.

**IT HAPPENED A SECOND TIME, THREE SECTIONS DOWN, WHILE PINNING THE TIMELINE.**
The re-take commands were written into a fenced code block ABOVE that table
rather than into each row. **The scan counted those rows bare and was right
again** — and because the annotation added figures, the bare count went UP, 8 to
10, while the work was supposed to be reducing it. **The command has to be on the
row, because the rule is per figure and a row cannot inherit evidence from its
neighbours.** Twice in one sitting, by the person writing the rule down.

**A paragraph about pinning figures, whose own figures were not pinned, corrected
by the check it was describing.** That is the whole case for mechanising the rule
rather than trusting a reader to hold it — including the reader writing it down.

### NOTHING BELOW IS RETRACTED AND NO FIGURE IN IT HAS BEEN EDITED

**Every number in the census was true when taken.** What is missing is the half
that makes it re-takeable. **The 31 reached ZERO on 2026-10-02** — 51 figures, every one carrying a command and a revision or naming in 94's own words why it cannot be re-taken. **This is the repo's first fully pinned document.** The declaration was lowered 31 → 0 in the same commit as the pinning, and only after the check went red at 31 and said so. **Lowering a declaration is the work, one row at a time**, and
the check declares 31 per document — not as part of a single total, because a
total lets a rise in one file hide behind a fall in another — **so that a
thirty-second cannot arrive quietly.**

## The two sentences to take away, if you read nothing else here

**1. A general fault count wearing a specific sentence.** `failing` in
`sweep-booking-steps.mjs` was incremented in six places, one of them the W16
step-fit case, and the summary printed all six as *"N steps do not fit — W16 is
not met."* It reported **12** over a list of **10**, and it survived a 315px
layout change without moving **because it was never counting the thing that
moved.** Split and proved: the twelve were **8 and 4**.

**2. When a summary number and the list under it disagree, the number is not
rounding — it is counting something the list does not show.** That is the test
the first sentence implies, and it is cheap: the discrepancy is visible without
running anything, in any report where a total sits above its own detail.

Those two are the most transferable thing in this file. Everything below is
evidence for them.

---

**This file is the census, not the fix.** One silence was closed (below). The
rest are listed with the distinguishing test named, so the next person does not
have to re-derive it.

---

## THE ONE PART OF THE PRODUCT NO CHECK CAN LOOK AT — 2026-09-21

**A session can change what a detailer reads on the dashboard and cannot see
it.** Every route into a signed-in dashboard runs through a credential, and no
session may handle one — so the screens behind the sign-in are the one part of
this product where *"nothing is done until somebody has opened it and pressed
it"* has no way to be obeyed. **This is not an inconvenience, it is a hole in
the rule this repo cares most about**, and its failure mode is the quiet kind:
not a crash, but a string that has been verified **by reading** for months
while nobody has seen it render. A line that is two tidy lines in a desktop
column is four lines of grey on a phone, and in Spanish it is longer again —
measured, this date, on one sentence of help text: 2 lines at 1254px, 3 at
390px in English, **4 at 390px in Spanish**, which made that row twice the
height of both its neighbours. None of that is visible from the source.
**The fix is a sanctioned dev-only way in — a seeded session the repo already
trusts — and it is NOT built here on purpose: a new route into a signed-in
dashboard is an authentication decision and it is Andrew's.** Until it exists,
dashboard copy is checked by one session asking another to look, which is what
happened today and does not scale past two people awake at the same time.

## THE CENSUS RECOUNTED — 2026-09-21, 03:45

**Everything below this section described a repo that no longer exists.** It
was written on 2026-09-20 against 33 checks in `scripts/`, seven ungraded
gates, five hollow receipts and no receipt anywhere that could say what commit
it had measured. All four of those statements are now false. **The old numbers
are kept and marked rather than corrected in place**, because in every case so
far the reversal has been the load-bearing half.

**Recounted against the repo, not against the old table:**

| | 2026-09-20 | now | how it was counted |
|---|---|---|---|
| `.mjs` files in `scripts/` | 74 | **76** | `ls scripts/*.mjs \| wc -l` → **91** @ `30b7804`, 2026-10-02. *Top-level only, as the original command was; `git ls-files 'scripts/*.mjs'` answers 97 because it recurses into `lib/`* |
| checks that write a receipt, so `receipt.mjs` grades them | 21 | **28** | `grep -rl 'writeReceipt(' scripts/ \| wc -l` → **43** @ `30b7804`, 2026-10-02 |
| checks carrying a canary in that receipt | 8 | **28** | `grep -rl observed_failure scripts/ \| wc -l` → **43** @ `30b7804`, 2026-10-02. **The same 43 files as the row above, identical sets** — checked with `diff`, because two patterns returning one number is usually a broken command. Here it is the document's own claim holding: every receipt-writer carries a canary |
| checks carrying a `--break=` sabotage switch | not counted | **21** | `grep -rl -- '--break=' scripts/ \| wc -l` → **36** @ `30b7804`, 2026-10-02 |
| **§ A** gates named in `CLAUDE.md` writing **no** receipt | **7** | **0 of those seven** | ***UNRE-TAKEABLE — a judgement, not a count.*** Which `CLAUDE.md` rows are “gates” was decided by reading. No command re-takes a ruling. Dated snapshot 2026-09-21; see § A's header |
| **§ B** receipts whose four counts could not disagree | **5** | **0** | ***UNRE-TAKEABLE — a judgement, not a count.*** “Could not disagree” was established by reading each receipt's arithmetic. Dated snapshot 2026-09-21; see "SECTION B, TWO OF FIVE" and the rows after it |
| receipts on disk | 45, **ten untracked** | **45, all tracked** | `git ls-files 'receipts/*.json' \| wc -l` → **61** @ `30b7804`, 2026-10-02. **Tracked-only on purpose: `ls` answers 62 while the other lane is mid-run**, so an `ls` here measures another session's in-flight output (`docs/shared-resources.md`) |
| receipts that state whether HEAD moved under them | **0 — the field did not exist** | **4** | `git ls-files 'receipts/*.json' \| xargs grep -l git_sha_started \| wc -l` → **35** @ `30b7804`, 2026-10-02. `git_sha_started` present |
| `tests/*.test.mjs` | **never censused** | **74** | `ls tests/*.test.mjs \| wc -l` → **86** @ `30b7804`, 2026-10-02; see "THE CENSUS NEVER LOOKED IN `tests/`" |

### THE FORTY THAT CANNOT SAY, AND WHY THEY ARE STAYING THAT WAY

41 of the 45 receipts on disk carry no start sha, because they were written
before `receipt.mjs` recorded one. `receipt.mjs` reports **40**, and the one it
does not is `sweep-widths-ledger.json`, which has no `check_id` and is not a
receipt at all — `validate` returns on the missing field before it reaches the
line. *Chased rather than rounded, because a summary that disagrees with the
list under it is this file's own opening test.*

**LEAVING THEM UNKNOWN IS A DECISION, NOT A BACKLOG, AND THE NEXT PERSON IS
ASKED NOT TO TIDY IT.** Forty honest unknowns are worth more than forty numbers
produced by a mass re-run that nobody asked for and no fault prompted. The
field says what is true: **those runs predate the fix and cannot say whether
HEAD moved under them.** The count falls on its own as each check is next run
for its own reasons, and a number arrived at that way means something. **A
number arrived at by refreshing a field means nothing, and it would look
identical.** That is the entire subject of this document, so producing one here
would be the census committing the fault it exists to catch.

### WHAT THE RECOUNT FOUND THAT NOBODY WAS LOOKING FOR

Section A closed its seven. It did not empty the bucket. `CLAUDE.md` names
**22** real scripts across its verification table and prose; **7 of them write
no receipt**, and they are not the original seven:

- **4 are not checks at all** — `build-examples`, `context-check`,
  `deploy-functions`, `seed-demo`. A builder and a seeder have no verdict to
  grade.
- **3 are checks**: `decisions-index`, `var-scope-guard`, `i18n-survey`. **Two
  of them were never on § A's list.**

**All three print a subject count, so none is a silence in this file's sense**
— measured by running them: `decisions-index` says *144 sections*,
`var-scope-guard` says *4 stylesheets, 1788 rules, 183 custom-property
declarations, 24 var() reads*, `i18n-survey` says *109 file(s) scanned*. Only
`i18n-survey` carries a **floor**; the other two would print a smaller number
and exit 0 if their walk shrank. That is a weaker gap than § A's and it is
named here rather than opened as work.

### THE HONEST HEADLINE OF THE NIGHT: THE OPEN COUNT WENT **UP**

**56 → 60, and nothing got worse.** Measured from `ROADMAP.md` at three
commits rather than taken on trust:

**Each row's figures are re-takeable at the commit named in it** — which is what
makes a timeline evidence rather than a recollection:

```bash
git show <commit>:ROADMAP.md | grep -c '^- \[ \] '    # open
git show <commit>:ROADMAP.md | grep -c '^- \[x\] '    # ticked
```

| commit | when | open | ticked | total |
|---|---|---|---|---|
| `c024f89` | 09-20 23:59 | **56** | 43 | 99 — `git show c024f89:ROADMAP.md \| grep -c '^- \[ \] '` → **56**, exact, re-taken 2026-10-02 |
| `f2dc0fc` | 09-21 01:57 | **62** (the peak) | 44 | 106 — `git show f2dc0fc:ROADMAP.md \| grep -c '^- \[ \] '` → **62**, exact, re-taken 2026-10-02 |
| `8ae32e4` *(was `HEAD`)* | 09-21 03:41 | **60** | **47** | 107 — ***THIS ROW SAID `HEAD` UNTIL 2026-10-02, AND “HEAD” IS NOT A REVISION.*** **Recovered rather than deleted:** `8ae32e4` was HEAD at 03:41 — it landed 03:37 and the next commit was 03:44 — and `git show 8ae32e4:ROADMAP.md \| grep -c '^- \[ \] '` → **60**, exact, re-taken 2026-10-02. The two rows above cite `c024f89` and `f2dc0fc` and are re-findable for ever; this one cites a moving pointer and became unrecoverable the next time anybody committed. **The sharpest small lesson in this file:** a timeline whose last row says `HEAD` has no last row |

**Eight items were added and four were closed.** The additions are not
regressions. They are faults that were **already true and already shipped**,
and they became visible for the first time because somebody finally asked of
each check *can this fail at all* — which is the question this document was
opened to ask. Two migrations that had never run. A `db-audit` with no
`process.exit` on its findings. An `accent-sweep` that read any stray argument
as a colour and swept one eighteenth of its subject. A suite that printed
`FAIL` and exited 0 for its entire life. None of those were created on the
20th; all four were found on it.

**A CENSUS THAT CANNOT SAY THAT ABOUT ITSELF IS THE SAME FAULT IT EXISTS TO
CATCH.** A queue that only ever shrinks is not a queue that is being worked —
it is a queue nobody is measuring against the product. The number going up is
the instrument working, and it is written here in plain words so that the next
person reading `56 → 60` finds an explanation instead of an alarm.

---

## The number — SUPERSEDED 2026-09-21, kept because the old shape is the lesson

| | |
|---|---|
| `.mjs` files in `scripts/` | 74 |
| of those, **checks** (produce a verdict about the product) | **33** | ***UNRE-TAKEABLE — a judgement, not a count.*** “Produces a verdict about the product” was decided by opening each script. Dated snapshot 2026-09-21 |
| write a receipt, so `receipt.mjs` grades them | **21** | `grep -rl 'writeReceipt(' scripts/ \| wc -l` → **43** @ `30b7804`, 2026-10-02 |
| named as a gate in `CLAUDE.md` but write **no receipt** | **7** | ***UNRE-TAKEABLE — a judgement, not a count***, as at the row above: which `CLAUDE.md` lines are gates was read, not counted. Dated snapshot 2026-09-21 |
| have a canary block at all | **8** | `grep -rl observed_failure scripts/ \| wc -l` → **43** @ `30b7804`, 2026-10-02 |
| **§ B members whose four counts could not disagree** | **5 → 0**, closed 2026-09-21 |

**The honest reading of that:** 21 of 33 checks are graded by something other
than themselves. The remaining 12 are graded by whoever reads the console, and
the console is where a silence lives.

**AND THE TABLE'S FIRST ROW IS ITS OWN BLIND SPOT — 2026-09-21.** Every number
above is a count of `scripts/`. **`tests/` was never censused**, and it holds
**74 more files**, 67 of them hand-rolled suites that set their own exit code.
One of them had this file's exact fault for its entire life. See "THE CENSUS
NEVER LOOKED IN `tests/`" below.

---

## Why a receipt is most of the answer

`receipt.mjs` already refuses the three shapes a did-not-run takes, and this is
worth knowing before adding anything new:

- `expected_targets <= 0` or `discovered_targets <= 0` → **fails.** *"A check
  that expects nothing proves nothing."*
- the four target counts not all equal → **fails.**
- `canary.observed_failure !== true` → **fails.** A check that cannot see a
  defect handed to it on purpose is not trusted with the ones it found.
- `skipped_targets > 0` with no dated allowlist → **fails.**

**So a check that writes an honest receipt can already tell a pass from a
did-not-run, and does not need a new mechanism.** The gap is entirely in checks
that either write no receipt, or write one whose numbers cannot disagree.

---

## The silences, and the test that would break each

### A · Gates with no receipt at all — 7

Named in `CLAUDE.md`'s verification table, so sessions are told to run them,
and nothing grades the result. **None of the seven prints how many subjects it
examined**, so a run that examined everything and a run that examined nothing
end with the same summary line.

| script | what its silence looks like | the distinguishing test |
|---|---|---|
| ~~`sweep-booking-steps.mjs`~~ | **ROW CORRECTED 2026-09-20 — the claim was wrong, and the truth was worse. See below** | **CLOSED 2026-09-21, `b5022b0`.** It had NO canary and no sabotage switch at all. One is now aimed at `MEASURE`: a step read in a 1440x200 window must report OVER, and it reads **788px over**. `16 16 16 16`, 504 assertions, receipt graded. |
| ~~`accent-sweep.mjs`~~ | `SWEEP CLEAN — dashboard, booking page and hue families` on `failures === 0` | **CLOSED 2026-09-21, `8585701`.** 18 declared accents, 288 comparisons, a canary aimed at the contrast floor, and a receipt. **Breaking it found a real defect: any stray argument was read as a colour**, so `--lite` swept ONE and printed CLEAN. See below. |
| ~~`e2e-booking.mjs`~~ | exits 0 with no subject count | **CLOSED 2026-09-21 — SECTION A IS NOW SEVEN OF SEVEN.** 13 declared legs, 95 assertions / floor 52, a canary aimed at the availability READ, and a receipt. **Breaking it found a real defect: the cleanup deleted customers by a phone number the product reformats, so 22 rows had been leaking since 2026-09-13.** See below |
| ~~`render-emails.mjs`~~ | exits 0 with no subject count | **CLOSED 2026-09-21, `af3b9a8`.** 32 declared emails, 161 assertions, a canary aimed at the ROT patterns, a receipt. **The row was wrong on both halves** — it printed `32 emails` and exited 1 on problems. What it could not tell you was a run that rendered nothing: `0 emails`, exit 0. |
| ~~`db-audit.mjs`~~ | exits 0 with no subject count | **CLOSED 2026-09-21, `81fc751` — and the row understated it. It had NO `process.exit` on findings at all**, so two real problems printed and returned 0, inside CLAUDE.md's verification table. Findings now fail; 4 declared checks; canary aimed at `q()`. See below. |
| ~~`check-deployed.mjs`~~ | exits 0 with no subject count | **CLOSED 2026-09-21, `d4ac4ac`.** 39 declared functions, a canary aimed at the freshness comparison, a receipt. **The row was slightly wrong**: it does print `all N functions are current` — but only on a clean run, and no run is clean today. Its earlier correction (it printed `PASS` having fetched nothing, fixed at `4b804ec`) is below. |
| `i18n-survey.mjs` | **CLOSED — see below** | — |

**Two of these were misread by a grep first and corrected by reading.** A
`grep` for `process.exit(1)` reported `accent-sweep` and `sweep-booking-steps`
as never exiting non-zero. Both do — `process.exit(failures === 0 ? 0 : 1)` and
`process.exit(failing ? 1 : 0)`. They were wrong in the *other* direction than
expected, which is the reason the table above is written from reading the tails
rather than from the grep.

**That mistake now has its own entry**, because it happened twice more the same
day and is one lesson rather than three: `docs/gotchas.md` § *"A thing
assembled at the point of use cannot be found by searching for its written
form."* The exit code is COMPUTED, so `1` is never adjacent to
`process.exit(` — the same shape as the em dash that only existed after two
values met, and as `$?` reporting `tail`'s status instead of `node`'s.
**Before trusting any zero result from a search for a literal, ask whether the
string could be built rather than typed.**

**`sweep-booking-steps.mjs` — the row was wrong, and correcting it found a
bigger fault than the one alleged.** The census said it reports clean over
nothing. **It does not: it dies loudly.** Run on 2026-09-20 it crashed at step
4 of 7 with a 30-second Playwright timeout and a stack trace naming no step.

The script already had a guard for exactly that — print `STUCK`, name the step,
quote the page's own reason, break — written under a comment saying it replaced
a bug where the script *"used to click a disabled button and time out thirty
seconds later inside Playwright, with nothing in the output saying WHICH step
or what it wanted."* **The guard could never fire.** It asked
`!button.disabled`, and `BookingPage.jsx:920` renders Continue as
`aria-disabled={!canAdvance}` with **no `disabled` attribute** — deliberately,
since roadmap 2.6, so a press stays receivable and `Refusal.jsx` can explain
the refusal. `b.disabled` is `false` on a refusing button, so the predicate
returned true.

**The remediation was written against a spelling the product had already
moved off, so it never took — and nobody noticed, because a guard's silence
looks identical to a step that advanced.**

And the consequence was larger than legibility. The same wrong predicate
skipped the outer branch that fills the address field, so the step could never
become satisfiable — the check could not complete its walk at all:

```
before   4 step lines, 1 width, crash at step 4/7, anonymous stack trace
after    32 step lines, 4 widths, 70 findings across 23 distinct controls
```

**So the honest correction is: the row named the wrong symptom, and the real
fault was that this gate had not measured its own subject for some time.** The
original point still holds one level down — a guard that cannot fire is a
silence — but it was not where the census said it was.

**Its first honest output is triaged in
`docs/booking-steps-triage-2026-09-20.md`:** 70 findings, 23 distinct controls,
**all 23 the same calendar day grid — one underlying issue, not seventy.** The
check's own exemption text calls the 44px floor *"arithmetically impossible"*;
measured, 44px needs a 338px grid and the viewport is 392px, so it is
impossible only at the grid's current width. The product's own CSS comment
expects a 47px cell and the delivered cell is 36.4px.

**A GENERAL FAULT COUNT WEARING A SPECIFIC SENTENCE — 2026-09-20, and this is
the best one-line description of the whole class anybody has produced.**
Andrew's manager's words, on `sweep-booking-steps.mjs`. Its summary printed
`12 steps do not fit — W16 is not met`, and `failing` was incremented in **six**
places of which exactly **one** was the W16 step-fit case. The rest were a step
that would not advance, a second tenant that did not load, a missing
vehicle-count control, console errors, and the tap block — **and the tap block
prints AFTER the summary, so the sentence quoted a total containing things no
reader could see in the list above it.**

**It was specifically false rather than merely vague**, and that is why it
looked stable through a 315px layout change: **it was never measuring the thing
that moved.** Split and proved — the twelve were **8 W16 failures and 4
instances of one missing seed fixture**, 8 + 4 = 12, with all 48 step readings
byte-identical across the change.

**The test this adds to the file:** when a summary number and the list under it
disagree, the number is not rounding — **ask what else increments it**. A count
that can be fed from more than one place will be read as a count of the thing
its sentence names.


## SECTION A — SEVEN OF SEVEN, 2026-09-21. THE SECTION IS CLOSED

**The header below says three, and it was true when it was written.**
`render-emails` and `sweep-booking-steps` went in the lane swap that followed,
and `e2e-booking` — the last one, 1,019 lines with no canary and no count of
anything — closed on the round after that, once the browser, the dev server,
the service-role key and the demo tenant were all handed over at once. The
original header is kept because the four it could not take were a decision
with a named blocker, and that decision is the useful part.

### `e2e-booking.mjs`, THE LAST OF THE SEVEN

| run | legs (expected · discovered · attempted · completed) | verdict |
|---|---|---|
| control | **13 · 13 · 13 · 13**, 94 passed / 0 failed, 95 assertions / floor 52 | **PASS**, canary caught |
| `--break=blind` | **13 · 13 · 13 · 13** | **FAIL** — canary NOT CAUGHT |
| `--break=leg` | **13 · 11 · 11 · 11** | **FAIL** — names `demo-detail:cancel`, `demo-riverside:cancel` |
| `--break=none` | **13 · 0 · 0 · 0** | **FAIL** — four separate rules, before the canary is even reached |

**THE COUNTS PASSING IS NOT THE SAME AS THE RUN MEANING ANYTHING, AND
`--break=blind` IS THE PROOF.** It makes the availability read answer `[]` for
everything. The four counts stay perfect at `13 13 13 13` and **four of this
script's double-booking assertions go green over an empty list** — `08:00 is
no longer offered` on both tenants, `08:30 is taken`, `09:00 is taken`. Only
**two** checks go red, and they are the two that read a time that must be
PRESENT rather than absent, exactly as this file's 2026-09-13 note predicted.
**The canary is the only thing that refuses the run**, and before 2026-09-21
there was no canary.

**WHAT THE CANARY IS AIMED AT, AND IT IS THE READ, NOT THE PRODUCT.** The
2026-09-13 fix stopped a `null` answer being read as an empty list. It did
nothing about a **200 carrying no slots**, which is lane C queue item 2 — a
thing that has happened on a live tenant, three months running. In that state
a missing time in an empty list is indistinguishable from a held slot. So a
second open day the engine listed seconds earlier is asked again at the same
duration, with no booking of this run on it. It cannot legally come back
empty. It is a control, not a second opinion: it asserts no particular time,
because a stricter test here would invent findings out of a correct database.

**`--break=leg` IS THE QUIET ONE AND THE REASON THE ARITHMETIC EXISTS.** It
leaves the cancel leg's work running and stops it being counted. The console
reads `94 passed, 0 failed` — **byte-identical in verdict to the control** —
and under the old file it exited 0. Only the counts notice, and they name both
legs.

### AND BREAKING IT FOUND A REAL DEFECT: 22 CUSTOMER ROWS, LEAKING SINCE THE 13th

Not found by a sabotage. Found by **re-reading the tenant afterwards to prove
the restoration instead of asserting it**, which is the condition the work was
handed over under.

The cleanup deleted the run's customer with `phone=eq.555-0111`.
`create-booking` **stores a formatted phone** — the row reads `(555) 011-1` —
so the filter matched nothing and the customer row survived every run. The
booking row was deleted correctly, and the stale sweep at the top of the loop
only ever looked at bookings.

**NOTHING IN THIS REPO COULD HAVE SEEN IT.** A PostgREST delete that matches no
rows answers `204` with an empty body — the same answer as a delete that
removed exactly what it meant to. The residue was invisible from the console,
from the exit code, and from the receipt. It is the file's own subject wearing
a new spelling: **a success and a no-op that are identical to the caller.**

22 rows, oldest 2026-09-11, one per tenant per run. The cleanup now matches on
`Smoke <runId>`, the one field the product does not reformat, and the stale
sweep reclaims customers as well as bookings — it cleared all 16 historical
rows on the first fixed run.

### THE RECEIPT'S `git_sha` IS STAMPED WHEN THE RUN ENDS, NOT WHEN IT STARTS

Recorded here because it turned up under this work and it is **every receipt in
this repo, not this one**. HEAD moved under two of the four runs — another
session committed mid-flight, twice in forty minutes — so the receipt claims a
commit that landed **after the measurement began**. Tonight both commits
touched `ROADMAP.md` only, `source-guard.mjs` correctly stayed silent, and the
run is sound. **But the receipt could not have told anybody that.** What told
them was `git show --stat`. The source guard's verdict is not carried into the
receipt, and `receipt.mjs`'s staleness rule compares the stamp to HEAD at
GRADING time, not to the tree the run actually walked. Not fixed; named.

---

## SECTION A — THREE OF SEVEN CLOSED, AND THE OTHER FOUR ARE A DECISION — 2026-09-21

**The seven were triaged out loud before any were taken**, so the four not
taken are a decision with a named blocker rather than a silence.

| gate | needs | this round |
|---|---|---|
| `accent-sweep.mjs` | nothing — fully offline | **TAKEN**, `8585701` |
| `render-emails.mjs` | `supabase/functions/_shared` to stop moving | **TAKEN 2026-09-21 in the lane swap**, `af3b9a8` — 4 of 7 |
| `sweep-booking-steps.mjs` | browser + dev server | **TAKEN 2026-09-21 in the lane swap**, `b5022b0` — 5 of 7 |
| `e2e-booking.mjs` | browser + dev server + service-role + tenant — **all held that round** | **TAKEN 2026-09-21 on the next round, once all four were handed over — 7 of 7** |
| `check-deployed.mjs` | Management API read | **TAKEN**, `d4ac4ac` |
| `db-audit.mjs` | Management API read | **TAKEN**, `81fc751` |
| `render-emails.mjs` | imports 6 modules from `supabase/functions/_shared` | **DEFERRED** — that lane is the other session's, took 2 commits in 90 minutes with 3 items unpressed, so any reading is against a tree that will move |
| `sweep-booking-steps.mjs` | browser + dev server | **DEFERRED** — both held by the other session |
| `e2e-booking.mjs` | browser + dev server + service-role + tenant | **DEFERRED** — all four held |
| `i18n-survey.mjs` | — | closed 2026-09-20 |

**Each of the three got the same four things:** an expectation declared before
the run, zero-discovered as a failure, a receipt `receipt.mjs` grades, and a
canary it must catch.

| gate | control | the break |
|---|---|---|
| `accent-sweep` | **`18 18 18 18`**, 288 comparisons / floor 250 | `--break=blind` → canary MISSED, exit 1 · `--break=none` → **`18 0 0 0`**, three named failures |
| `check-deployed` | **`39 39 39 39`**, 80 assertions / floor 60 | `--break=blind` → canary MISSED · `--break=none` → **`39 0 0 0`** |
| `db-audit` | **`4 4 4 4`**, 5 assertions / floor 5 | `--break=blind` → all four checks print `ok`, summary prints `clean`, **run fails anyway** |

### THE BREAK THAT MATTERS FOR A GATE IS THE ONE WHERE IT DOES NOT RUN

That is the case none of the seven could distinguish from success. It is now
visible, and this is what it looks like:

```
STALE accent-sweep  every rule passed; receipt is for a59f6480, HEAD is
85857014 — a valid record of a run that happened, now out of date
```

**A gate that does not run no longer looks like a gate that passed.** It looks
like a receipt that has stopped keeping up, and `receipt.mjs` names it.

### TWO OF THE THREE WERE WORSE THAN THE CENSUS SAID, AND ONE WAS BETTER

- **`db-audit` had no `process.exit` on findings at all.** The row said "exits
  0 with no subject count". The truth: the only `process.exit` in the file
  guards missing credentials, so it found **2** real problems, printed *"2 to
  look at"*, and **returned 0** — inside CLAUDE.md's verification table, where
  a session is told to run it after a migration. **It could not fail.**
- **`accent-sweep` read any argument as a colour.** `process.argv[2]` was taken
  as a hex with no validation, so `node scripts/accent-sweep.mjs --lite` swept
  **one** colour named "custom" whose hex was the string `--lite`, made **12**
  comparisons instead of **288**, and printed `SWEEP CLEAN`. **Found by
  breaking the file on purpose — the sabotage flag itself was swallowed as a
  colour.** A gate that measures one eighteenth of its subject on a typo is
  this section's disease with a different spelling.
- **`check-deployed` was slightly better than its row.** It does print
  `all N functions are current` — the row said it printed no subject count.
  But it prints **no total at all when anything is stale**, which is every run
  today, and it wrote nothing to grade. **Recorded because a census that
  overstates a fault is the same kind of error as one that misses it.**

### WHAT EACH CANARY IS AIMED AT, AND IT IS NEVER THE PRODUCT

All three canaries target **the measuring instrument**, because that is what
fails silently:

- `accent-sweep` — a colour against itself scores **1.00** and must be refused
  by both floors. If `contrastRatio` started returning 21, every pair would
  clear and the sweep would print CLEAN over a product gone black on black.
- `check-deployed` — a commit dated **a year after** its deploy must read
  STALE. If `lastCommit` returned 0 for everything, nothing is ever newer than
  its deploy and every function reads `current`.
- `db-audit` — `public` must contain tables. Every check is `say(label, rows)`
  and `say` prints `ok` on an empty array, so `q()` returning `[]` makes all
  four print `ok`. **Demonstrated:** blinded, all four print `ok`, the summary
  prints **`clean`**, and only the canary fails the run.

### B · Receipts whose numbers cannot disagree — 5, ALL FIVE NOW CLOSED (2026-09-21)

**Every row below is struck through and every one was broken on purpose before
it was believed.** The closing evidence is in "SECTION B IS CLOSED" further
down; the rows are kept as written because **what the fault looked like is the
half that teaches**. The counts that closed them:

| check | the break | counts |
|---|---|---|
| `deployed-inventory.mjs` | `--break=unreadable` | **`39 39 39 38`** |
| `restore-drill.mjs` | `--break=fewer` | **`52 51 51 51`**, names `weather_grids` |
| `tenant-matrix.mjs` | `--break=declared` | **`38 39 39 39`**, names `add_ons` |
| `dashboard-notifies.mjs` | `--break=step` | **`7 6 7 6`**, names the step |
| `example-shots-check.mjs` | `--break=norecord` | *(closed 2026-09-20)* |

These write a receipt, but set `discovered`, `attempted` and `completed` to the
**same variable**, so `receipt.mjs`'s "the four counts must agree" rule can
never fire for them. Three go further and derive that variable from what the
run produced (`rows.length`), which is a gate following the data.

| script | `expected_targets` | note |
|---|---|---|
| ~~`dashboard-notifies.mjs`~~ | `rows.length` | **CLOSED 2026-09-21, `330c3e4`.** `EXPECTED_STEPS` names the seven claims before the run; `--break=step` gives **`7 6 7 6`**. **And the reason it was deferred was WRONG** - see the correction below. |
| ~~`restore-drill.mjs`~~ | `rows.length` | **CLOSED 2026-09-21, `bf55bb9`.** Was declaring **2 targets** for a drill over the whole `public` schema - `rows.length` counted the STAGES it finished. Now `expected` is a declared `EXPECTED_TABLES = 52`, `discovered`/`attempted`/`completed` are the live tables found, restored and compared back. Zero tables was a `throw` past `writeReceipt` and is now a graded failure. See below. |
| ~~`tenant-matrix.mjs`~~ | `rows.length` | **CLOSED 2026-09-21, `3eda57b`** - the most valuable of the five, the check that proves one detailer cannot see another's customers. `expected` is now the `business_id` tables `supabase/migrations/` declares, compared by name; 39 declared, 39 live, set-identical. `--break=declared` gives **`38 39 39 39`** and names `add_ons`. See below. |
| ~~`deployed-inventory.mjs`~~ | `dirs.length` | **CLOSED 2026-09-21, `988e7dd`.** Confirmed by running first - 39/39/39/39 full, 0/0/0/0 empty - then `completed_targets` became `judged.length`, which the file already computed. A function walked but never compared is now a gap: **40/40/40/39**. See below. |
| ~~`example-shots-check.mjs`~~ | `SITES.length` | **CLOSED 2026-09-20 — see below** |

**One of the five is closed, and the choice was constrained — recorded because
the reasoning matters more than the pick.** On cost alone the right target was
`tenant-matrix.mjs`: it is the check that proves one detailer cannot see
another's customers, so its silent failure is the worst in the repo. **It could
not be taken.** It needs a service-role key and it writes to the demo tenant,
and neither was authorised — and a change to the tenant-isolation check that
nobody has watched fail is precisely what this file refuses to accept from
anyone else. Four of the five need credentials. **`example-shots-check.mjs` was
the only one provable under the rules, and it is the lowest-cost of the five.**
That is an honest account of a compromise, not a claim that it was the best
available fix. **The highest-cost one remains open and remains unproven.**

What changed: `expected` stays `SITES.length`, a declared constant — the one
count that must never be derived from what the run found. The other three
became quantities the loop already knew: `discovered` (the manifest has a
record at all), `attempted` (the source file exists, so a fingerprint could be
taken), `completed` (it reached the comparison). **Nothing was invented to make
a rule fire**, which was the constraint: a site that is STALE still counts as
completed, because it was measured and found wrong, and that is the check
working.

```
clean                     expected 5 discovered 5 attempted 5 completed 5   PASS
--break=norecord          expected 5 discovered 4 attempted 4 completed 4   FAIL
                          receipt.mjs: "target counts disagree: expected 5,
                          discovered 4, attempted 4, completed 4"
--break=drift (existing)  counts 5/5/5/5, canary observed true             PASS
```

**The counterfactual is read, not run, and the distinction is worth keeping.**
Under the old code the same sabotage would have written `5, 5, 5, 5`: the four
fields were four copies of one constant, so they could not differ from each
other *by construction*. That is a property visible in the diff rather than
something a run would add information to — but it is still a claim from
reading, and it is labelled as one.

**The distinguishing test for the remaining four is the same:** derive `expected_targets`
from a declared constant or a structural fact, and count the other three for
real. Their canaries still protect them, which is why this is a list rather
than an emergency.

### C · Closed today — 1

`i18n-survey.mjs`. **Chosen because zero is its DESIRED answer**, which makes it
the worst of the set: a survey of *what is still English* that scans nothing
prints `0 candidate strings in 0 files` — the same sentence a finished job
prints. A broken walk, a moved `SRC` or an `--only` filter matching nothing all
produce it, and a session skimming reads it as good news.

The guard is on **files scanned, not on findings** — finding nothing is the
goal, scanning nothing is the fault, and conflating them was the bug. Below a
floor of 50 files it prints `SCANNED NOTHING` and exits 1.

```
clean    74 candidate strings in 10 files, from 108 file(s) scanned   exit 0
canary   I18N_SURVEY_CANARY=1 → SCANNED NOTHING, 0 walked            exit 1
```

### D · Also closed today, in the check that started this

`sweep-widths.mjs` now positively certifies the five customer-facing surfaces
under `LANG_APP=es` — each must be reached and hold more translated phrases
than English, or it is a finding, and "the catalogue recognised nothing" is a
finding rather than a silence. **Its proof is owed**: the one run so far was
tainted by a concurrent `app/src/lib/strings/appEs.js` edit, and the source
guard's verdict on that run is *"do not sign anything off"*. The canary
(`SWEEP_LANG_CANARY=1`) has not been run either.

---

## What was PROVED and what was READ

Applying the standard this census exists to enforce.

**Proved — run, and watched fail:**

- `i18n-survey.mjs` — both directions, exit 0 clean and exit 1 under the canary.
  *(The first attempt read `exit=0` for the canary because the command was
  piped to `tail` and `$?` was tail's — **the guard was working and the
  measurement of it was not.** Re-checked without the pipe: exit 1. Written up
  in `docs/gotchas.md` as the third instance of a value assembled at the point
  of use; never read `$?` through a pipe.)*
- `label-guard.mjs` — clean, canary, and against the real historical case.
- `receipt.mjs`'s skip rule — three probes built from a real receipt.
- `example-shots-check.mjs` — clean, the new `--break=norecord` counter canary,
  and the existing `--break=drift` canary re-run to confirm the change did not
  disturb it. Receipt restored clean afterwards.
- `sweep-widths.mjs`'s Spanish certification — **added since this file was
  written, and proved.** All five customer-facing surfaces certify SPANISH on a
  clean run, and under `SWEEP_LANG_CANARY=1` the forgotten surface reports
  `NOT CERTIFIED` while the other four still certify. That second half is the
  one that matters: it shows the guard distinguishes *not reached* from *not
  Spanish*, which is exactly the distinction the twelve silences below cannot
  make. **What it asserts is that the screen rendered the catalogue's Spanish
  rather than English — not that the catalogue is right.** `"Light"` maps to
  `"Claro"` because a theme toggle reached that key before the soiling scale
  did, so a surface can certify on a word that means something else entirely.
  The run now names a certification that leaned on a known-ambiguous key; that
  is a filter, not coverage.

**Three readings of a moment that had not finished happening** — the stale
console buffer, `$?` reporting `tail`'s status instead of `node`'s, and a
browser-pane read taken mid-reload that returned `innerWidth: 0`. Three of one
shape in one night is a rule, and it has its own entry in `docs/gotchas.md`:
*an instrument will answer a question about a moment that has not finished
happening.* **The zero was caught only because zero is obviously wrong; a
viewport of 380 instead of 392 would have been believed.**

**Read, not run — the classification is from source, and could be wrong:**

- All seven in group A. Their tails were read; none was executed. `e2e-booking`,
  `render-emails`, `db-audit` and `check-deployed` need credentials or a
  browser and were not run under the hold this census was written during.
- All five in group B. The counts were read at the `writeReceipt` call site.
- Group D's certification result.

**A check nobody has watched fail is a check nobody has verified.** Six of the
twelve silences named here are unverified claims about unverified checks, and
that is the honest state of this file on the day it was written.

---


## `deployed-inventory.mjs` WAS RUN FOR THE FIRST TIME, AND IT PRINTS A PASS HAVING FETCHED NOTHING — 2026-09-21

**It had never been executed in its life.** CLAUDE.md puts it in the
before-you-finish list, ROADMAP 0.6 is built on it, and it gates a publishing
order Andrew has not authorised. Run, then broken on purpose four ways.

**IT READS. Nothing was deployed, nothing was written to the database.** The
project reached was `kguqylyzgyzfktkfnhjb` — this platform's own, not the
presumed-real-business ref.

### What it counted, on a real run

| | |
|---|---|
| functions in the repo | **39** | `ls -d supabase/functions/*/ \| wc -l` → **40** @ `30b7804`, 2026-10-02 |
| deployed on the project | **39** | **PINNED, NOT VERIFIED: `node scripts/deployed-inventory.mjs`, which needs credentials this lane does not load.** The command is named rather than run, so this figure is as strong as the script and no stronger. Dated snapshot 2026-09-21 |
| bundles fetched and compared | **39** (`assertions_executed`, floor 30) | **PINNED, NOT VERIFIED: `node scripts/deployed-inventory.mjs`** — needs credentials and the Management API. Dated snapshot 2026-09-21 |
| running this checkout | **15** | **PINNED, NOT VERIFIED: `node scripts/deployed-inventory.mjs`** — needs credentials. **And it is a figure about two trees at once**, so it is only ever true of a stated checkout. Dated snapshot 2026-09-21 |
| **NOT running this checkout** | **24** | **PINNED, NOT VERIFIED: `node scripts/deployed-inventory.mjs`** — needs credentials; `receipts/deployed-inventory.json` holds the last answer. Dated snapshot 2026-09-21 |
| widest gap | **7.8 days** |
| verdict | `fail`, exit 1, all 24 named |

**24, not ROADMAP 0.6's 22** — two more have drifted since it was written. The
24: `accept-quote`, `calculate-booking`, `cancel-booking`, `connect-account`,
`create-booking`, `create-business`, `forecast`, `get-booking-receipt`,
`invite-user`, `pay-booking`, `plan-link`, `platform-admin`,
`platform-billing`, `preview-emails`, `report-problem`, `reschedule-booking`,
`respond-to-booking`, `send-campaign`, `send-invoice`, `send-owner-reminders`,
`stripe-webhook`, `update-booking`, `validate-promo-code`, `watch-jobs`.

### The four breaks

| what was broken | what it did | verdict |
|---|---|---|
| `--only=` a function that does not exist | `0 function(s) in the repo` → **`PASS — every function is running this checkout's source`, exit 0** | **NOT CAUGHT on screen** |
| a repo function never deployed | printed `NOT DEPLOYED`, then **`PASS`**, exit 0 | **NOT CAUGHT on screen** |
| one comment line altered | `DIFFERS`, `1 of 49 comment lines`, named the exact line, exit 1 | **caught** |
| sanitiser deleted + `slice(0,64)`→`slice(0,8)`, no comment touched | **`matches — running copy contains this checkout's source`**, exit 0 | **not caught, and documented** |

### The finding, and it is the shape this file exists to name

**The defence exists and it works — in the file nobody reads.** On the
fetched-nothing run the receipt said `status: fail`, the canary said
`NOT CAUGHT — no bundle was readable, so this run proves nothing about any
function`, and `receipt.mjs` said *"only 0 assertions ran against a declared
minimum of 30"*. **Meanwhile stdout said `PASS` and the exit code was `0`.**

The cause is one line. The verdict and the exit are computed from
`failures.length` alone; the canary reaches `status` in the receipt and nothing
else:

- `failures` is built only from `DIFFERS`. `NOT DEPLOYED`, `UNREADABLE` and
  `UNJUDGEABLE` become `warnings`, which change no verdict and no exit code.
- So **zero subjects and zero fetches is indistinguishable from a clean
  estate** to anyone reading the terminal, which is the one way the script's
  own header says it could lie.

**`--only=<typo>` reaches this in one keystroke**, and `--only=` is the flag a
session uses to ask the only question it has: *is the one I just edited in the
list?*

### Two claims already in this file that this corrects

- **Line 93 said `deployed-inventory.mjs` "already does this properly — copy
  it"**, as the fix for `check-deployed.mjs`. It does it properly in the
  receipt and not on screen, so copying it would copy the hole. Marked there.
- It sits in **§ B, receipts whose numbers cannot disagree**, as
  `dirs.length` / "structural floor — much weaker fault". **Confirmed by
  running:** `expected`, `discovered`, `attempted` and `completed` were all
  `39`, and on the empty run all four were `0` — four counts, one variable,
  agreeing about nothing.

### And the mitigation the header promises is not printed

The header concedes the comment blind spot and answers it: *"The git column
beside it is what covers that gap, and the two are printed together on purpose
so neither is read alone."* **For a `matches` verdict there is no git column.**
`behind` is computed for every function and appended to the output only in the
`DIFFERS` branch; the receipt carries `widest_gap_days` for differing functions
only. Measured against the real run: **4 of the 15 `matches` functions have a
commit newer than their running deploy** — `booking-ics`, `resend-webhook` and
`send-email` at **3.1 days**, `refresh-weather` marginal. Nothing in stdout or
the receipt says so.

### Proved, not read

All four breaks were executed against the live Management API and the tree was
restored and re-verified afterwards (full re-run: 15 / 24 again, identical).
**One measurement of mine was wrong first and this file already held the
reason:** the comment-break run reported `EXIT=0` because the command was piped
to `grep` and `$?` was grep's. Re-run without the pipe: exit 1. That is the
same trap recorded above for `i18n-survey.mjs` — **never read `$?` through a
pipe** — hit again, three entries later.

**Nothing was deployed to make anything green. The 24 stand.**


### CLOSED — all four were ruled on and built the same night, `4b804ec`

**The section above is the before-state and is kept as written.** Andrew's
manager ruled on all four; each was rebuilt and then **re-broken the same way
it was broken the first time**, because a fix trusted on its author's word is
the thing this file exists to refuse.

| broken | before | after `4b804ec` |
|---|---|---|
| `--only=` a function that does not exist | `PASS`, **exit 0** | **`FAIL - THE COMPARISON DID NOT RUN. 0 of 0 function(s) were fetched`**, exit 1 |
| a repo function never deployed | `NOT DEPLOYED` then `PASS`, **exit 0** | **named failure, exit 1, `warnings: []`** |
| one comment line altered | `DIFFERS`, named to the line, exit 1 | unchanged — still caught |
| behaviour changed, no comment touched | `matches`, exit 0 | **still `matches`** — this is the METHOD, and it is now printed |

**The second one was proved in isolation on purpose.** Run scoped, an
undeployed function also trips the fetched-nothing rule, so both fixes fire and
neither is tested. It was run **full**: 39 bundles fetched, canary true, so the
only rule that could fail the run was the new one. It did.

**What changed, in one line each:** the verdict and exit now read the canary
the receipt already computed; `NOT DEPLOYED` moved out of `warnings` into
`failures`; the git note prints on a `matches` verdict, where the header had
always promised it and the code only ever printed it on `DIFFERS`; and the
method prints at the top of **every** run including a green one, so a reader
knows the blind spot before the verdict rather than afterwards in the header.

**The git note was cross-checked rather than eyeballed** — against a separate
instrument written before the change, on its own code path: same four names,
same four gaps (`booking-ics` 3.1d, `resend-webhook` 3.1d, `send-email` 3.1d,
`refresh-weather` marginal). The other 11 print `and no commit since the
deploy`, so **both branches are exercised on every run**.

**Counts unchanged across the rewrite, which is how it is known nothing broke:**
39 in the repo, 39 deployed, 39 fetched and compared, 15 matching, 24
differing, widest gap 7.8 days. Nothing was deployed. The 24 stand.

### TWO RESIDUALS, LEFT OPEN ON PURPOSE AND BOTH BELONG TO THIS CENSUS

Neither was in the four rulings, and neither is the fixer's to decide.

- **A scoped run writes a receipt that `receipt.mjs` must fail.**
  `--only=session-ping` passes and exits 0 with `assertions_executed: 1`
  against `min_assertions: 30`, so the check says pass and the grader says
  *"only 1 assertions ran against a declared minimum of 30"*. **That is the
  floor working, not breaking** — one function compared really does prove
  almost nothing about an estate of 39. But it means the honest way to ask
  *"is the one I just edited in the list?"* produces a receipt that is correct
  to reject, and nothing tells the reader that. Either `--only` should not
  write a receipt, or it should declare a floor of its own.
- **The four target counts are still one variable.** `expected`, `discovered`,
  `attempted` and `completed` are all `dirs.length` — measured at **39, 39, 39,
  39** on a full run and **0, 0, 0, 0** on the empty one. This is § B above and
  the row already says so; it is recorded here only because a run has now
  confirmed it rather than a reading. **The obvious candidate is
  `completed_targets`, which could be the number actually fetched and
  compared** — that is `judged.length`, which the file already computes — and
  then the four counts could disagree, which is the entire point of § B.


## SECTION B, TWO OF FIVE CLOSED — 2026-09-21

**The fault in one sentence: a gate that declares it expected exactly as many
things as it happened to find can never find fewer than it expected, so the
receipt's own rule that the four counts must AGREE can never fire.**

| check | before | after | the break that proved it |
|---|---|---|---|
| `deployed-inventory.mjs` `988e7dd`, `8565266` | `39 39 39 39`, all `dirs.length` | `completed_targets` = `judged.length` | **`--break=unreadable` → `39 39 39 38`**, and `receipt.mjs`: *"target counts disagree"*. See the correction below |
| `restore-drill.mjs` `bf55bb9`, `6cfe2e8` | `2 2 2 2`, all `rows.length` — **two targets for a drill over 52 tables** | `expected` parsed from `supabase/migrations/`, the rest measured | `--break=fewer` → **`52 51 51 51`** and it **names the table**: *"the migrations declare are NOT in `public`: weather_grids"* |

**`rows.length` in `restore-drill` was not even the tables.** It was the number
of report STAGES the script finished — two — so the receipt said a whole-schema
restore drill had *two targets*. It now judges the live table count against
`EXPECTED_TABLES = 52`, declared above the run.

**THE ONE WEAKNESS, WRITTEN DOWN RATHER THAN HIDDEN.** 52 came from a
measurement taken the same day. A first declaration has to come from somewhere,
and the W16 bound in `sweep-booking-steps.mjs` has the same shape — measured
subject, declared bound. What makes it a floor rather than a mirror is that it
is now a **committed constant**: the live count is measured every run and
judged against it, and a migration that adds or drops a table fails the receipt
until a person re-derives it **and says which migration**. Moving it to make a
run pass is the failure this file exists to catch.

**AND ZERO DISCOVERED WAS A CRASH, NOT A FAILURE.** `restore-drill`'s only
`try` had a `finally` and no `catch`, so the deliberate `throw` for zero tables
killed the process **before `writeReceipt`** — the one outcome that proves
nothing at all left **no receipt to grade**, which in the receipts directory is
indistinguishable from a run that never happened. A `catch` now records it and
writes the receipt with the counts as far as the run got. Proved with
`--break=none`: **`52 0 0 0`**, status `fail`, canary `false`, naming *ZERO
TABLES* and *THE DRILL DID NOT FINISH*. That fix covers every crash in the
drill, not only this one.


### THE FIRST VERSION OF BOTH FIXES WAS WRONG, AND THE CORRECTIONS ARE THE USEFUL PART — 2026-09-21

Both were caught by Andrew's manager reading the receipts on disk rather than
the report of them. **Kept in the open, because each is the same fault the fix
was removing, one level up.**

**(1) `39/39/39/39` WAS NOT EVIDENCE.** `completed_targets` became
`judged.length`, and the receipt offered as proof read `39 39 39 39` — but on a
full run `judged.length` **is** `dirs.length`, so that receipt demonstrates
nothing. The empty `--only` run reads `0 0 0 0`, which agrees too, because
`--only` scopes `dirs` as well. **A number that happens to match is not
evidence that it can differ.**

The answer is **yes, they can differ** — three states are walked but never
compared: `NOT DEPLOYED`, `UNREADABLE`, `UNJUDGEABLE`. Proved twice:

| how | counts |
|---|---|
| a function directory that was never deployed | **`40 40 40 39`** |
| **`--break=unreadable`**, one body fetch failed on purpose | **`39 39 39 38`** |

The first needed a write under `supabase/`. The second needs no write anywhere
and lives in the file, so **the disagreement is reproducible by anyone with one
flag, for ever**. It stamps its own receipt *"run with `--break=unreadable`;
this receipt is a sabotage, not a result"*.

**(2) A CONSTANT MEASURED OFF THE LIVE DATABASE IS STILL A GATE FOLLOWING THE
DATA.** `restore-drill`'s first fix declared `EXPECTED_TABLES = 52` from a live
count. **If a table were dropped in the live database the number would follow
it down and the check could not fail** — the same fault this section exists to
remove, wearing a constant's clothes. `supabase/migrations/` is declared,
append-only and in the repo, so it is what the live database is supposed to
match. The check now parses it every run and compares **by name**:

- measured: **53 created − `monthly_plans` dropped = 52**, set-identical to
  live, no renames
- `--break=fewer` no longer says *"51 vs 52"* — it says **"1 table(s) the
  migrations declare are NOT in `public`: `weather_grids`"**
- `--break=nodeclared` → **`0 52 52 52`**, because an expectation of nothing is
  how this check would go back to proving nothing

### AND THE DRILL WAS REPEATING A SENTENCE ANDREW HAD ALREADY CORRECTED

`restore-drill`'s one failure read **"THERE IS NO RESTORE POINT A CUSTOMER CAN
REACH… nothing the platform holds would bring it back."** That is **the exact
sentence `docs/recovery.md` opened with before Andrew corrected it** — and it
is false. The check looked only at Supabase and wrote the result down as a fact
about everywhere. **The same mistake, in the same words, about the same
subject, hardcoded into a check that would repeat it nightly for ever.**

It now says **"SUPABASE HOLDS NO RESTORE POINT"**, states that this is a fact
about Supabase only, and names the path that does exist —
`github.com/random12one0/detailing-platform-backups`, private, nightly 02:10
Pacific, `pg_dump` custom format, refuses a dump under 50 KB, age-encrypted,
published as a release asset, 30-day retention keeping the 1st of each month —
together with its **two real gaps: nobody has ever restored one, and the age
private key's location is unrecorded.** Not re-measured here; `docs/recovery.md`
did that release by release.

**The Supabase half was always correct. The scope was not, and nothing in the
wording admitted a scope** — which is the whole of this file's subject.


### THREE OF FIVE CLOSED — `tenant-matrix.mjs`, 2026-09-21, `3eda57b`

**Most of what this needed was already built, and that is worth saying before
the fix.** `tenant-matrix.mjs` already carried a **real canary** —
`public.tenant_matrix_canary`, a real table with a real hole (`for select to
authenticated using (true)`), created and dropped every run and **discovered by
the same schema query as every other table**, so it travels the identical code
path. It also already carried six sabotage switches, per-assertion subject
counts on both halves, honest `skipped_targets`, and a floor of **700**
assertions that has been raised when boundaries were added. **The counts were
the only hollow part of it.**

| | before | after |
|---|---|---|
| four counts | `rows.length` ×4 | `expected` from `supabase/migrations/`, the rest measured |
| declared vs live | not asked | **39 declared, 39 live, set-identical, compared by name** |
| zero discovered | not asked | its own failure, and so is a zero-size parse |

**The break that matters, and it is the one the manager asked for by name:**
`--break=leak` stops comparing `business_id`. The deliberately leaky canary
table then **survives undetected**, and the run reports **`CANARY MISSED`** and
exits 1 — so a genuine cross-tenant leak is seen, and a blinded detector
**refuses its own green lines** instead of printing them.

| run | counts | verdict |
|---|---|---|
| control | **`39 39 39 39`**, 733 assertions / floor 700 | **PASS**, canary caught |
| `--break=leak` | `39 39 39 39` | **FAIL** — `CANARY MISSED` |
| `--break=declared` | **`38 39 39 39`** | **FAIL** — names `add_ons`, and `receipt.mjs`: *"target counts disagree"* |

### THE PARSER RETURNED ZERO AND SAID SO, WHICH IS THE ONLY REASON IT WAS NOT A GREEN

The first version of the migrations parse matched **nothing**. A heredoc turned
two `\b` word boundaries into **literal backspace characters**, so the regex
was `/^Hbusiness_id^H/` and it silently matched no table. The run printed *"THE
MIGRATIONS DECLARED NO business_id TABLES… this run proves nothing"* — **the
zero-size guard written in the same edit was what caught it.** Without that
guard the expectation would have been an empty set, and an expectation of
nothing is exactly the fault this section exists to remove, reintroduced by the
fix for it.

**`docs/gotchas.md:348` already holds this trap** — *a source file can hold a
control character that nothing will show you* — and `node --check` passed, the
diff looked right, and the file read correctly in every tool. Rewritten without
`\b`; the file is verified to contain zero control characters.

### THE TENANT WAS LEFT AS FOUND, AND ONE OF MY OWN PROBES LIED ABOUT IT

Verified after the last run on `kguqylyzgyzfktkfnhjb`: canary table, canary
RPC, canary bucket and both fixture tenants **GONE**; `public` still **52**
tables; `demo-detail`, `demo-riverside` and `demo-ironclad` all
**`status=active`**; **zero** businesses suspended. `seed-demo` was not run.

**The first version of that verification reported `demo-detail: MISSING`.** It
selected an `is_active` column, which does not exist — the column is `status` —
so the query errored and the check counted the length of an *error object*.
**A probe written to confirm cleanliness announced the opposite because of its
own bug**, which is the same shape as everything else in this file: the
measurement failed, not the thing measured.

### THE LAST ONE

`dashboard-notifies.mjs` is the only entry left. It needs
`SUPABASE_SERVICE_ROLE_KEY` and it **cancels and moves real bookings in the
demo tenant** — it is the one remaining member of § B and it needs that tenant
to itself.


### SECTION B IS CLOSED — five of five, 2026-09-21

| check | commit | the break that proved it |
|---|---|---|
| `example-shots-check.mjs` | 2026-09-20 | *(closed before this round)* |
| `deployed-inventory.mjs` | `988e7dd` `8565266` | `--break=unreadable` → **`39 39 39 38`** |
| `restore-drill.mjs` | `bf55bb9` `6cfe2e8` | `--break=fewer` → **`52 51 51 51`**, names `weather_grids` |
| `tenant-matrix.mjs` | `3eda57b` | `--break=leak` → **`CANARY MISSED`**; `--break=declared` → **`38 39 39 39`**, names `add_ons` |
| `dashboard-notifies.mjs` | `330c3e4` | `--break=step` → **`7 6 7 6`**, names the step |

**`dashboard-notifies` control: `7 7 7 7`, 19 assertions against a floor of 15,
canary caught.** `EXPECTED_STEPS` writes down the seven claims the file makes
before the run, so a step that stops running is a failure rather than a smaller
run. `--break=canary` leaves the counts at `7 7 7 7` while the canary goes
false and the run fails, which shows the two guards are independent.

**UNPROVEN AND LABELLED:** the `missedSteps` branch — a *declared* step that
never reaches a verdict — has no sabotage that exercises it. `--break=step`
proves the undeclared side of the same comparison. **The missing side is
written and not demonstrated**, and it is written here rather than left to be
discovered as a surprise. *(A `--break=skip` now exists for it. It is built and
has not been run — see the section immediately below, which is the correction
to this paragraph and to the "closed" above it.)*

### THE SECTION WAS CLOSED AND THE ONE CASE IT COULD NOT TELL FROM SUCCESS WAS STILL OPEN — 2026-09-21

**`330c3e4` fixed the four counts, and the counts were never the case this
gate could not see.** Three sections up, § A states the rule in its own
heading: **the break that matters for a gate is the one where it does not
run.** `dashboard-notifies` had no such break — and the reason was worse than
a missing flag. **It had a `finally` and no `catch`.**

Four `throw`s sat inside that try: the fixture business, the sign-in, the
fixture booking, and one inside `sql()` — which **every step calls twice**.
Any of them killed the process before `writeReceipt`. What stayed on disk was
the previous run's `pass`, `7 7 7 7`. **A crashed run and a run that never
happened were byte-identical in the receipts directory**, which is this
document's subject wearing its plainest spelling.

Same fault and same fix as `restore-drill.mjs` (`bf55bb9`, § B above). It
survived here because the skip audit at `ROADMAP.md:8186` asked about the
**skip** paths — which are honest, loud, and exit before any receipt exists —
and never asked about the **crash** path. *That row still reads as though the
question was settled for all ten scripts; it was settled for one of their two
exits.*

**PROVED BY RUNNING BOTH SIDES, NOT BY READING THE DIFF**, because this file
has accepted a read counterfactual before and said so at the time.
`HEAD`'s copy of the script was extracted **unmodified** and run against an
unreachable database, so the crash is a genuine network failure and not a
planted throw:

| the run | the receipt afterwards |
|---|---|
| HEAD's file, `fetch failed` | **UNCHANGED, to the byte** — the 08:25 `pass 7 7 7 7` still stood as the record of a run that never happened |
| the fixed file, same failure | **`7 7 0 0`**, status `fail`, *"THE RUN DID NOT FINISH: fetch failed"*, exit 1 |

| sabotage | counts | verdict |
|---|---|---|
| `--break=none` | **`7 7 0 0`** | **FAIL**, exit 1 — and `receipt.mjs` refuses it on **four independent rules**: counts disagree, 0 assertions against a floor of 15, canary not caught, 3 failures recorded |

**`--break=none` MAKES NO NETWORK CALL AND WRITES NOTHING**, which is the only
reason it could run while the demo tenant was held by another session. It
throws as the first statement inside the try. **Measured rather than
asserted**, the discipline every round tonight has been handed over under:
`businesses` read **16** before and **16** after, `dash-notify-fixture`
**absent** both times, `demo-detail` / `demo-riverside` / `demo-ironclad` all
**`active`** both times.

### ALL FOUR RUN, 2026-09-21 — AND THE TWO GUARDS ARE PROVED INDEPENDENT

The tenant was handed over and the remaining three ran, plus the control. **The
middle two rows are the valuable ones**, because each is refused by exactly one
guard while the other stays green:

| run | counts | assertions | canary | what refused it |
|---|---|---|---|---|
| **control** | **`7 7 7 7`** | 19 / 15 | caught | **nothing — PASS, exit 0** |
| `--break=skip` | **`7 7 6 6`** | 16 / 15 | **caught** | **the counts alone**, naming *put back and moved again* as never reaching a verdict |
| `--break=canary` | **`7 7 7 7`** | 19 / 15 | **false** | **the canary alone** — `0` failures recorded, every count in agreement |
| `--break=step` | **`7 6 7 6`** | 19 / 15 | caught | the counts, naming the same step as *undeclared* |
| `--break=none` | **`7 7 0 0`** | 0 / 15 | false | **four rules at once** |

**`skip` and `canary` are the pair worth reading twice.** One has a perfect
canary and disagreeing counts; the other has perfect counts and a blind canary.
Neither could mask the other. Before tonight the counts could not disagree at
all, so the canary was the *only* guard — and `--break=skip` is now the proof
that it is no longer carrying the file on its own.

**`--break=step` returned `7 6 7 6`, byte-identical to what was recorded before
the edit**, which is how it is known the change disturbed nothing.

### WHAT A GREEN HERE IS ABOUT, AND IT IS NOT THIS CHECKOUT

**Found at the end of this round, by running `deployed-inventory.mjs` because
CLAUDE.md says to before finishing.** It exits 1 over **24** functions not
running this checkout, and **`update-booking` is one of them** — which is the
single endpoint `dashboard-notifies` presses.

So a passing run certifies the `update-booking` that is **live**, not the one
in `supabase/functions/update-booking/index.ts`. Those are the same question
only on a day they were deployed together, and today is not that day. **The
check is not wrong** — its header says it presses the buttons a detailer
presses, and the live endpoint is the more useful of the two questions. But
**a green here must not be read as "the committed fix works"**, and nothing in
the run, the console or the receipt says which version answered.

**This is the repo's own headline rule pointed at one of its own
instruments:** *what is running is not what is committed, and you have to
look.* Every session that has read `dashboard-notifies`' green and reasoned
about the committed source was doing the thing ROADMAP 0.6 exists to stop.

### FIXED RATHER THAN NAMED, AND RE-PROVED — 2026-09-21

**Andrew's manager ruled: fix it.** The reasoning was the same one applied to
`git_sha` three hours earlier, and it is worth copying out because it settles
this class of question: **a receipt that IMPLIES what it measured is the fault
this whole night has been about, and a caveat written next to a number is read
by nobody at the moment they are trusting that number.** Ten lines that make
the receipt state what it saw beat a sentence in a document explaining why it
cannot.

The receipt now carries `dimensions.endpoint_deployed`, and the run prints it
**above** the verdict rather than below it. On every run this round it read:

```
v59, deployed 2026-09-20 10:02Z, body sha256 f9502c470e54, 6694466 bytes
```

**THE FIELD SAYS WHAT THE RUN SAW, NEVER WHAT IT ASSUMED — including when it
saw nothing.** An absent field reads as nothing to report, which is the same
lie in smaller print, so every path writes it. **Proved, not reasoned:** a run
made with a made-up access token wrote

```
NOT IDENTIFIED — metadata fetch answered 401
```

into the field *and* promoted it into `warnings`, so it is visible from the
summary and not only from the JSON. A body fetch that fails after the metadata
succeeds has its own wording and keeps the version it did learn.

**It deliberately does not claim whether the deployed bundle equals this
checkout.** That needs the shared-module assembly and the sanitiser, it is
`deployed-inventory.mjs`'s job, and a second implementation here would be a
second thing to keep true. This records an identity; the printed line says so.

### THE RE-PROVE: SIX RUNS, ONE FROZEN FILE, NOTHING DIFFERENT

The file was hashed before the first run and after the last —
`a35417cdd19c1e3b` both times, so all six judged the same bytes. **Every
sabotage caught exactly as it did on the first proving; nothing came back
different, and that is stated as a result rather than as reassurance.**

| run | counts | assertions | canary | vs the first proving |
|---|---|---|---|---|
| control | `7 7 7 7` | 19 / 15 | caught | **same** — PASS, exit 0 |
| `--break=skip` | `7 7 6 6` | 16 / 15 | caught | **same** — counts alone |
| `--break=step` | `7 6 7 6` | 19 / 15 | caught | **same** |
| `--break=canary` | `7 7 7 7` | 19 / 15 | false | **same** — canary alone, 0 failures |
| `--break=none` | `7 7 0 0` | 0 / 15 | false | **same** |
| `--break=none`, junk token | `7 7 0 0` | 0 / 15 | false | **new** — the not-identified path |

**Tenant left as found**, against a baseline taken before the first of the six:
nine measures identical by `diff`, **0** dangling rows across all 39
`business_id` tables, `email_sends` still **300** rows total — so the cascade
removed every row the six runs created — `auth.users` still **44**, and the
fixture owner still created 2026-09-20, unchanged.

### A STRUCTURAL PROPERTY OF RECEIPTS, FOUND WHILE DECIDING WHAT ORDER TO COMMIT IN

**A receipt is stale the moment it is committed.** `receipt.mjs` compares
`git_sha` against **HEAD at grading time**, and the commit that carries a
receipt moves HEAD past the sha that receipt names. Demonstrated rather than
argued: `receipts/label-guard.json` was run and graded `PASS` at `e0932868`,
committed in `e96f624`, and an hour later graded

```
STALE label-guard  every rule passed; receipt is for e0932868, HEAD is 24e3dc5a
```

having changed in no way whatsoever.

**What follows is not "stale is bad" — this file already agrees stale is not
broken.** It is narrower and nobody had written it down: **`pass` is only
reachable in an uncommitted working tree.** A session that clones this repo
and grades the receipts directory can never see a valid one, however healthy
every check is, so the grader's headline `N valid` does not mean what a reader
assumes it means. It is also the shape CLAUDE.md's commit rule reached at its
fourth version — **an act of recording that changes the thing being
recorded.**

#### THE OPEN QUESTION, SCOPED AND DELIBERATELY NOT STARTED

**Ruled 2026-09-21 by Andrew's manager: leave the grader tonight, hand it
over as a scoping question.** The reasoning is worth keeping because it is
the third time the same ruling was made in one night: changing
`scripts/receipt.mjs` changes the thing **every** check in this repo is
judged by, and making that change at seven in the morning at the end of a
long night is the same shape as the two decisions already refused — a shared
CSS variable, and a mass re-run of forty receipts. CLAUDE.md's own rule
covers it: **before changing a shared variable, find out whether a previous
item already decided not to.**

**The proposed fix, written down as scoped rather than as done:** compare
`git_sha` against **the commit that last touched the check and its subject**,
not against bare HEAD.

**Why that and not something else.** Staleness is meant to answer *could this
receipt be out of date about the thing it measured?* Bare HEAD answers a
different question — *has anything at all happened since?* — and in a repo
where two sessions commit through the night the answer is always yes. So the
line fires constantly, for reasons that have nothing to do with the check,
and **a line readers ignore is worse than no line**: it is a warning that has
been trained to mean nothing, which is this document's subject in its most
ordinary form.

**The observation that makes it worth doing at all:** `pass` is not merely
rare, it is **structurally unreachable in a committed state**. Any clean
checkout grades `0 valid`, however healthy every check in the repo is.

**What a taker must be careful of, and it is the reason this is not a
five-minute job.** "The check and its subject" is easy to say and is the
whole design. `dashboard-notifies`' subject is a **deployed edge function and
a live database**, neither of which is a path in this tree — and its receipt
now records the deployed version precisely because the repo could not answer
that. A rule written only in terms of file paths would call that check fresh
for ever, which is a worse failure than calling it stale too often. **The
easy half is the commit range; the hard half is that some subjects are not in
git at all.**

**Not filed in `ROADMAP.md` by this session** — that file is the other
session's lane tonight, and the manager is carrying the line across.

#### TAKEN 2026-09-21, AND STOPPED BEFORE ANY EDIT — THE RULE IS RIGHT AND THE REPO CANNOT FEED IT

**The ruling was reversed and the work authorised**, under a standing
condition: *if the right comparison needs something the receipt does not
currently record, STOP rather than widen it.* **It does, and this is that
stop.** `scripts/receipt.mjs` was not edited. What follows was measured with
a prototype in a scratch directory that implements the scoped rule and grades
all 44 receipts without touching the grader.

**THE BLOCKER IN ONE LINE: a receipt records its OUTPUTS, not its SUBJECT,
and most of the outputs are gitignored.** `artifacts` is the only
path-bearing field — there is no `subject`, `watches`, `inputs` or `sources`
field in `REQUIRED` or anywhere else — and `.gitignore:174` ignores
`artifacts/` entirely, as does `email-preview/`.

| of 44 receipts | |
|---|---|
| currently graded stale | **44** | ***UNRE-TAKEABLE — a judgement, not a count:*** the grading is `receipt.mjs`'s own rule applied by reading each receipt. Dated snapshot 2026-09-21 |
| the scoped rule **cannot answer** — subject has no git history | **27** | ***UNRE-TAKEABLE — a judgement, not a count:*** “cannot answer” was established per receipt by hand. Dated snapshot 2026-09-21 |
| it answers, but the "subject" is **the check's own script** | **15** | ***UNRE-TAKEABLE — a judgement, not a count:*** which file is a check's “subject” is a reading, not a field. Dated snapshot 2026-09-21 |
| it answers against a real, tracked, non-script file | **2** | ***UNRE-TAKEABLE — a judgement, not a count:*** same reading as the row above. Dated snapshot 2026-09-21 |
| would flip `stale` → `fresh` | **4** | ***UNRE-TAKEABLE — a judgement, not a count:*** a counterfactual about a rule nobody has changed. Dated snapshot 2026-09-21 |

**The mechanism works. That was tested and it is not the problem.** The pair
the manager asked for both behave: `label-guard` — filed by its own commit
`e96f624`, its subject untouched by it — grades **fresh**, which is the
entire motivating case; and genuinely-stale receipts stay **stale**
(`dashboard-notifies`, `e2e-booking`, `db-audit`, `check-deployed`, nine
more). **The rule is correct. The data underneath it is not there.**

**AND TWO OF THE FOUR FLIPS GO THE DANGEROUS WAY, WHICH IS WHAT TURNS THIS
FROM "INCOMPLETE" INTO "DO NOT SHIP".** For the 15 whose recorded artifact is
their own script, `fresh` would mean *nobody edited the check* — not *the
product has not moved*. Measured:

| check | subject | scoped verdict | commits touching `app/src` since its receipt |
|---|---|---|---|
| `keyboard-walk` | `app/src` | **fresh** | **21** (of 134 commits) — `git log --oneline -- app/src \| wc -l` → **393** @ `30b7804`, 2026-10-02, so the denominator has tripled |
| `accent-sweep` | `app/src` | **fresh** | **5** (of 44) — same command as the row above; the 44 was that check's own window, not a repo total. Dated snapshot 2026-09-21 |
| `deployed-inventory` | Management API | fresh | 0 — correct |
| `label-guard` | the label catalogue | fresh | 0 — correct |

**`keyboard-walk` would be certified fresh over twenty-one commits into the
exact tree it exists to measure.** Today it says `stale`, which is noisy and
true. The change would make it say `fresh`, which is quiet and false.
**Trading an over-firing line for a silent one is this document's subject,
and doing it inside the grader would do it to every check at once.**

**WHAT IS ACTUALLY MISSING, STATED SO THE NEXT PERSON DOES NOT RE-DERIVE IT.**
One field: each check declaring the paths it measures — `subject_paths` —
plus a convention for subjects that are not paths at all. `dashboard-notifies`
already demonstrates both halves of that problem: its subject is a deployed
edge function and a live database, and it now records
`dimensions.endpoint_deployed` precisely because git could not answer for it.

**SO THE REAL SHAPE OF THE WORK IS NOT A GRADER CHANGE.** It is a field added
to 21 graded checks, each of which then has to be re-proved, and a decision
about what staleness even means for a check whose subject is not in the
repository. **That is a larger and different piece of work than the one
authorised**, which is why it stopped here rather than being widened into it.
The one-line version for whoever picks it up: **add `subject_paths` first,
change the grader second, and never in the other order** — a grader taught to
trust `artifacts` would start certifying 15 checks fresh on the day it
shipped.

**THE DRIFT FIELD FIRED ON ITS FIRST REAL RUN AND WAS ADJUDICATED, NOT
IGNORED.** The first control reported `HEAD MOVED DURING THIS RUN: started
5794d677, finished e0932868`. Read rather than waved through: the only commit
inside that window touched **`ROADMAP.md` only**, and this check's subject is
the deployed `update-booking` function and the database — it reads no
front-end source at all, so nothing that landed could move what it measured.
The run was sound. It was re-run anyway, to `e0932868 → e0932868`, so the
receipt on disk needs no paragraph attached to it. **The adjudication is
recorded here because next time the answer may be different, and the field is
worthless if the habit is to re-run until the line disappears.**

**One switch was deliberately not built and is named rather than left
missing:** a sabotage that empties `EXPECTED_STEPS`. That guard can only trip
if a person deletes a constant by hand, and firing it would cost a full
fixture cycle of real writes to demonstrate the consequence `--break=none`
already demonstrates.

### THE TENANT WAS LEFT AS FOUND, AND THIS TIME THERE IS A BASELINE TO SAY SO AGAINST

**A baseline was taken BEFORE the first run**, which every previous round
tonight did without — and the reason it happened here is that the other
session volunteered, unprompted, that its own as-you-found-it rested on
counts matching rather than on a before-and-after diff. **That admission is
why this round has one.**

Nine measures, read before the first run and again after the fifth, and
`diff` reports them **identical**: `businesses` **16**, `dash-notify-fixture`
**absent**, `customers` table-wide **48**, `customers` in `demo-detail`
**13**, `bookings` in `demo-detail` **32**, `public` **52** tables,
`demo-detail` / `demo-riverside` / `demo-ironclad` all **`active`**,
**0** suspended, **0** orphaned `business_users`.

**Then the residue question was asked structurally rather than by naming
tables to check.** All **39** `public` tables carrying a `business_id` were
swept for rows whose business no longer exists: **0 genuinely dangling rows,
anywhere.** The mechanism was confirmed rather than inferred —
`email_sends_business_id_fkey` is **`ON DELETE CASCADE`**, so the fixture's
sends are destroyed with the fixture. Today's 56 sink-addressed sends belong
to `demo-detail` and `demo-riverside` between 09:15 and 11:45, which is
before this round held the tenant.

**AND MY OWN PROBE LIED FIRST, WHICH IS THE THIRD TIME THIS FILE HAS RECORDED
THAT.** The sweep's first version reported **71 orphans** across
`email_sends` and `platform_admin_events`. It used `left join … where b.id is
null`, which matches a row with a **NULL** `business_id` exactly as it matches
a dangling one. All 71 are platform-level rows with no business, by design;
the real count is **0**. The tell was in the output already — a
`count(distinct business_id)` of **0** beside a row count of 61 — and it was
read rather than skimmed. Same shape as the `is_active`/`status` probe two
sections up: **a probe written to confirm cleanliness announced the opposite
because of its own bug.**

**ONE THING DID CHANGE AND IT IS NAMED RATHER THAN OMITTED.** The fixture's
owner, `dash-notify-owner@isolation.test`, is created outside the business and
is **not** deleted with it — it is one of a standing family of 14
`@isolation.test` accounts. It was created **2026-09-20 10:04**, a day before
this round; the five runs re-signed in as it and moved only its
`last_sign_in_at`. **No auth user was created tonight.** That is a real
residue class — the same one that let 22 customer rows leak for ten days — and
it is inert here only because the account is reused rather than recreated.

### AND THE REASON THIS ONE WAS DEFERRED WAS WRONG, WHICH IS MINE

Earlier this same night I reported that `dashboard-notifies.mjs` *"cancels and
moves real bookings in the demo tenant"*, and it was held back partly on that.
**It does not.** It creates its own fixture business `dash-notify-fixture`,
works only on that, deletes it in `finally`, and **the string `demo-detail`
does not appear anywhere in the file**. Mail goes to `delivered@resend.dev`,
Resend's own sink address.

**The service-role key requirement was the only correct half of the
objection** — and that was enough to hold it, so the conclusion survived while
the stated reason did not. That is the same shape as the 58px/435px correction
in the second-leg handoff and the `SUPABASE HOLDS NO RESTORE POINT` correction
above: **a true conclusion resting on an illustration nobody had checked.** I
had read the header, which says the method is *"press the buttons a detailer
presses"*, and not the fixture block forty lines further down.

### THE TENANT WAS LEFT AS FOUND

Verified on `kguqylyzgyzfktkfnhjb` after the last run: `dash-notify-fixture`
**GONE**, both matrix fixtures **GONE**, **16** businesses exactly as before,
`demo-detail` / `demo-riverside` / `demo-ironclad` all **`status=active`**,
**zero** suspended, `public` still **52** tables. **`seed-demo` was not run**,
so this round nominated no re-seeder.

### The two not taken, and neither reason is authorisation

- **`dashboard-notifies.mjs`** needs `SUPABASE_SERVICE_ROLE_KEY`, and its
  method is *"press the buttons a detailer presses"* — it calls `update-booking`
  and **cancels and moves real bookings in the demo tenant**, then reads
  `email_sends`. Running it while anything else measures that tenant moves the
  surfaces under the other run, which is CLAUDE.md's own warning.
- **`tenant-matrix.mjs`** writes to the demo tenant for the same reason. **It is
  the most valuable of the five** — it proves one detailer cannot see another's
  customers — and it deserves the tenant to itself rather than the tail of a
  round.

**`restore-drill` was safe to run and it is worth saying why**, because the
distinction is the whole of the lane rule: it uses the Management API token,
not a service-role key, and every write goes into a scratch schema
`restore_drill` which it drops afterwards. It **reads** `public` and never
modifies it. Verified after the last run: `restore_drill` **GONE**, `public`
still **52** tables, unchanged.


## A LIVE COMMITMENT, NOT A CLOSED ITEM — `tenant-matrix`'s realtime skip, 2026-09-21

**`receipts/tenant-matrix.json` reads `pass` for the first time. It carries one
declared skip, and that skip is a promise somebody has to keep.**

**WHAT WAS SKIPPED.** The canary table was published to `supabase_realtime`
with a `using (true)` select policy. Owner A's subscription reported
`SUBSCRIBED`, the socket was proved live **on itself** (it heard its own
broadcast back), B's row was inserted — **and nothing arrived in 15 seconds.**
`postgres_changes` is not delivering on this project, so the
**`[realtime-stream]` detector was never given the chance to fail.**

**IT IS UNCERTIFIED, NOT CLEAN.** Those are different sentences and only one
of them is true here. The detector's code ran; the thing it detects never
happened; so the run says nothing about whether it works.

**WHY IT IS SAFE TODAY, STATED SO NOBODY RELAXES ABOUT THE WRONG PART.** The
publication carries **no tenant table** (asserted separately as `7a`, and that
assertion is certified), and the app opens **no channels**. There is nothing
to leak through a mechanism nothing is using.

> **THE CONDITION THAT RE-OPENS THIS, AND IT IS THE WHOLE POINT OF WRITING IT
> DOWN: the day any table is published to `supabase_realtime`, the
> `[realtime-stream]` detector must be re-proved BEFORE anyone trusts a green
> from this check.** Until then `tenant-matrix` is green on the tables, the
> RPCs, storage and broadcast — and **silent** on `postgres_changes`.

**The other three realtime canaries ARE certified** and were caught in the same
run: `[realtime-publication]` (the canary table's own publication entry),
`[realtime-broadcast]` (an anonymous client with no session receiving tenant
B's message verbatim on a non-private channel), and the private-channel refusal
that proves the closed case. The broadcast one is now a **hard rule in
`CLAUDE.md`** rather than a note here, because the app opens zero channels and
the fault begins to exist the moment somebody writes the first
`supabase.channel` line.

**Why this is not filed as a failure.** A skip with a written reason, a probe
that was actually attempted, and a named condition for re-opening is the
opposite of a silence — it is the one shape of not-measured that a later
session can act on. **A skip nobody has to re-justify on a condition is a skip
that becomes permanent by not being looked at**, which is § A's subject, three
sections up.


## THE SILENCE UNDER ALL THE OTHERS: NOTHING HAS EVER RECORDED WHICH MIGRATIONS RAN — 2026-09-21

**`supabase_migrations.schema_migrations` does not exist in
`kguqylyzgyzfktkfnhjb`.** Measured, not inferred: the query returns
`42P01 relation "supabase_migrations.schema_migrations" does not exist`, and an
`information_schema` sweep finds `schema_migrations` in exactly two schemas,
`auth` and `realtime` — both Supabase's own internals, neither this project's.

**So there is no applied-migrations ledger, and there never has been.** The 92
files in `supabase/migrations/` are a list of intentions. Nothing in the
database records which of them ran, when, in what order, or whether one was
applied by hand and edited on the way in.

### What follows from that, stated plainly

- **Every answer anybody has ever given about this schema was a guess or a
  direct look.** There was no third option. "That migration is applied" has
  never been a checkable claim in this project.
- **It is the silence under the others in this file.** Section A was about
  gates that cannot tell a run from a no-run. This is a *database* that cannot
  tell an applied migration from one that never ran.
- **It is how ROADMAP 8.10a happened.** Two migrations never ran,
  `get_public_business_profile` stayed old, and the multi-car booking feature
  reached nobody at any setting. Nothing anywhere would have said so, because
  there was nothing to say it with.
- **`scripts/migration-drift.mjs` is the workaround, and it is not the fix.**
  It infers what ran from what the schema LOOKS like — 49 functions by body,
  52 tables and their columns by name. **It answers "does the schema match the
  repo", not "did every migration run", and those are different questions.**
  Two migrations producing the same end state are indistinguishable to it, and
  one that ran and was later undone by hand reads as never having run.

**The real fix is a ledger**, which means adopting the Supabase CLI's migration
workflow or writing an equivalent table. **That is a change to how this project
is operated, not a check, so it is Andrew's — recorded here rather than done.**

---


### THE LEDGER IS ANDREW'S CHOICE, NOT A SESSION'S — stated, not argued

**Recorded here rather than in `FOR-ANDREW.md` because that file is the other
session's lane this round.** It belongs in front of him either way: adopting a
migration workflow changes how he OPERATES the project, which is a different
kind of decision from anything a session or a manager gets to make.

**The situation.** Nothing in `kguqylyzgyzfktkfnhjb` records which of the 92
files in `supabase/migrations/` ever ran. There is no
`supabase_migrations.schema_migrations` table. Two migrations had already
silently never run, and the multi-car booking feature reached nobody at any
setting as a result.

**The two options, and what each costs him:**

| | **Adopt the Supabase CLI migration workflow** | **Keep `migration-drift.mjs` as the answer** |
|---|---|---|
| What it gives | A real ledger. "Did this migration run?" becomes a lookup, permanently, for every object type | Functions, tables and columns compared against the repo — nothing else |
| What it costs | Installing and learning a tool; every future migration goes through `supabase db push` rather than by hand. **The existing 92 have to be reconciled with the ledger once, carefully, or the first run reports all 92 as unapplied** | Nothing new. It already runs |
| What stays broken | Nothing about migrations | A `grant`, an `update`, a backfill, an index, a policy, a column's TYPE — none of those are visible. **It answers "does the schema match the repo", not "did every migration run"** |
| Risk of the change itself | A one-time reconciliation against a live database | None — it is read-only |

**Neither option is recommended here.** Both are defensible: the first buys a
permanent answer for a one-time cost against his live database; the second
costs nothing and leaves a named, written-down gap. **It is his call and the
material for making it is above.**

## `db-audit`'S TWO FINDINGS, INVESTIGATED RATHER THAN ALLOWLISTED — 2026-09-21

They were printed and ignored on every run until findings started failing the
gate. **Named, measured, and NOT allowlisted** — and the investigation found
something bigger than the two tables.

**What they are.** Shared caches, neither carrying a `business_id`:

| table | columns | rows | written by |
|---|---|---|---|
| `address_points` | `key, lat, lon, found, resolved_at` | **19** | geocoding, via edge functions. **PINNED, NOT VERIFIED: `node scripts/db-audit.mjs`** — a row count in the live database, which needs credentials and changes without anybody editing this file. Dated snapshot 2026-09-21 |
| `weather_grids` | `grid_key, lat, lon, periods, place, fetched_at` | **11** | the NWS forecast cache. **PINNED, NOT VERIFIED: `node scripts/db-audit.mjs`** — a live row count, as above. Dated snapshot 2026-09-21 |

**What the check says.** RLS on, zero policies, not on the by-design list —
"locked with nothing to unlock it".

**What a person would see if it were real: nothing, today.** Proved with the
anon key against PostgREST rather than reasoned about — both return **HTTP 200
with 0 rows**, while the Management API shows the tables really hold 19 and 11
rows. Forced RLS with no policy denies every row. `session_pings`, by contrast,
returns **HTTP 401 permission denied**.

### But the investigation found the thing worth ruling on, and it is not these two

**`db-audit.mjs`'s own comment is wrong.** It says the by-design tables each
carry *"`enable`, `force`, and `revoke all from anon, authenticated`"*.
Measured across all ten:

| tables | grants to anon / authenticated |
|---|---|
| `session_pings`, `translation_usage` | **0 / 0 — revoked. A browser is refused outright (401).** |
| the other **eight**, incl. `platform_admins`, `platform_admin_events`, `platform_settings` | **7 / 7 — every privilege still granted** |
| `address_points`, `weather_grids` | **7 / 7 — identical to those eight** |

**So the two flagged tables are not anomalous. They are typical** — in exactly
the state of 8 of the 10 tables the audit already accepts.

**What that costs.** Those eight are held shut by forced-RLS-with-no-policy
*alone*, with `INSERT`, `UPDATE`, `DELETE` and `TRUNCATE` still granted to
`anon`. **The day anybody adds one permissive policy to one of them for one
purpose, the grants are already there** — the policy they wrote to allow a
`SELECT` opens the writes too. `platform_admin_events` is the audit trail
"which must not be forgeable", and `anon` holds `INSERT` on it today.

**This is `db-audit`'s own "an inert policy is a trap" lesson, inverted:** a
grant with no policy reads as safe and is one policy away from not being.

**Two questions for Andrew, and neither is "allowlist these two":**
1. Should the eight carry `revoke all from anon, authenticated` like the two
   that do — making the comment true and the lock double?
2. Should `db-audit` check the GRANT as well as the policy, so the difference
   between those two groups stops being invisible to it?

## THE CENSUS NEVER LOOKED IN `tests/`, AND A SUITE THERE PRINTED `FAIL` AND EXITED 0 FOR ITS WHOLE LIFE — 2026-09-21

**The number at the top of this file is 33, and it is a count of `scripts/`.**
That was never stated as a scope, so it read as a count of the checks in this
repo. It is not. `tests/` holds **74 more files**, and `tests/admin-insight.test.mjs`
had this document's subject in its purest form.

**57 checks in nine sections, and not one of them could turn the run red.**
`check()` counted a failure, printed `FAIL`, and the file ended. There was no
`process.exit` on the count. Under `node --test tests/*.test.mjs` **a file that
exits 0 is a pass**, so all 57 were decoration — the console said `FAIL`, the
battery said green, and both were telling the truth about different things.

**Measured, not suspected.** A copy of the file with one deliberately false
check appended printed `FAIL  CANARY` and exited **0**.

**WHAT IT WAS GUARDING MATTERS, WHICH IS WHY THIS IS NOT A FOOTNOTE.**
Section 9 is the privacy line from `docs/platform-admin-audit-2026-09-06.md`
§5 — **the aggregate is his, the individual customer is theirs.** It reads
`app/src/lib/adminInsight.js` as text and asserts the module never touches
`customer_name`, `customer_phone`, `customer_email` or `customer_address`.
That promise is made to visitors on the disclosure page. For the whole life of
the file, a change that broke it would have printed `FAIL` into a green run.

Fixed by the other session in `c99b2bb`, two lines: `process.exit(failed ? 1 : 0)`.

### ONE FILE, NOT A CLASS — AND THAT WAS CHECKED RATHER THAN HOPED

7 of the 74 use `node:test`, where the framework sets the exit code. The other
**67 are hand-rolled and each must set its own.** All 67 were read. **Every one
of them now has a failure-driven exit**, so `admin-insight` was the only
instance and there is no cleanup queued behind this entry.

**THE FIRST ANSWER WAS FOUR FILES AND IT WAS WRONG, BY THIS FILE'S OWN
FAVOURITE MISTAKE.** A grep for `process.exit(...fail...)` reported
`deploy-freshness`, `em-dash`, `email-brand` and `money-format` as having no
failure-driven exit. Read, all four set **`process.exitCode = 1` inside the
check helper** — correct, and spelled differently. **A search for a spelling
instead of a behaviour**, which is `docs/gotchas.md` § *"A thing assembled at
the point of use cannot be found by searching for its written form"* — hit
while writing the census entry about exactly that trap. The four were cleared
by reading them, the way the group A table above was.

---

## THE SILENCE NO CHECK IN THIS FILE CAN COVER — added 2026-09-20

**A figure inherited from an instrument whose definition moved is stale in a way
no check can catch, because the number is still arithmetically correct.**

Everything else censused here is a check that might not have run. This is the
opposite: the check ran, printed a true number, and the number was written down
— and then the thing it measured changed underneath the words, so the figure
stayed correct and stopped meaning what it says.

The worked example is `fits, Npx spare` from `scripts/sweep-booking-steps.mjs`.
On 2026-09-20 at 02:34:23, `52a3d70` gave `.bk-wrap` `flex: 1 0 auto` inside a
`min-height: 100dvh` column, so the column stretches to fill the screen and the
figure became a cap — about 54 to 77px — rather than headroom. A step needing
435px, whose column stretched to 748px, reads as 73px spare at viewport heights
900, 1200 and 740 alike. **No receipt,
no gate, no canary and no expected-count file can see this**: the run is clean,
the arithmetic is right, and the only evidence is that two very different screens
print the same number.

`docs/spare-figures-2026-09-20.md` classifies all 64 written figures against
that boundary. The reason it was catchable at all is that somebody read the
thing that produced the number instead of the number.

---

## TWO FINDINGS THAT ARE ONE LESSON — THE SPANISH SURVEY, 2026-09-21

**Written together on purpose. Apart they read as two bugs; together they are
one statement about what that instrument can and cannot see.**

**The symptom.** A detailer's Business index rendered
*"Visitas pendientes · 1 overdue"* on a Spanish dashboard — one English word
inside a Spanish line, on a screen used every day.

### Finding one: the translation existed and the code never asked for it

That row's status has **four branches**. Two were written as `t(...)` and were
translated. Two were not — a bare `"Nothing scheduled"` and a backtick
`` `${n} overdue` `` — and were therefore never offered to the translator.

**`"Nothing scheduled"` was already in the Spanish catalogue.** It had a
translation the whole time. The code simply never called `t()` on it.

**So the completeness check could not have caught it.** That check compares
`t()` call sites against the catalogue. **A string that never calls `t()` is
not a call site**, so it belongs to neither set: it is not a missing
translation and it is not an untranslated key. It is outside the question.

### Finding two: the survey that exists to catch that was blind to the shape

`scripts/i18n-survey.mjs` is the one instrument whose whole job is *what is
still English*. Until today it had **two passes**: JSX text matched with
`>([^<>{}]+)<` — a class that **excludes `{` and `}`** — and quoted strings.
**Nothing in it had ever looked at a backtick.** So every string with a value
interpolated into it was invisible to it **by construction**.

It could report **90 candidates** and the suite **71 passing** while
**134 strings** rendered English on a detailer's dashboard.

### The lesson, and it is the one this repo names most often

**A check that reads the label instead of the contents** — sitting inside the
instrument we would use to find that fault anywhere else. Finding one is the
same thing one level down: a check comparing the catalogue against call sites
can only ever see strings that asked to be translated, and the ones that
render English are precisely the ones that did not ask.

**Neither is visible from the other end.** Reading the catalogue finds
nothing wrong. Reading the call sites finds nothing wrong. **Only opening the
screen in Spanish and reading it finds it** — which is how both of these were
found, and it is why the number is now produced by a committed instrument
rather than by a session's scratch script.

### What was done, and what deliberately was not

- The survey gained a third pass. **`90 in 13 files` → `134 in 32 files`**,
  same 111 files scanned, proved in both directions before the number was
  believed: `lib/theme.js` **0 → 3**, `SiteIntake.jsx` quoted literals
  **21 → 21**. Commit `7584181`, alone, touching nothing else.
- **The first version of that pass said 151.** Seventeen were code fragments
  from sliced nested templates. Removed rather than explained away.
- The one reported string was fixed; **the other 133 were not.** The true
  number goes to Andrew before anybody spends a night on them, because it is
  a fact about his product that may change what he wants done.
- **Four of them are in `lib/format.js` and a previous item already decided
  not to touch it** — `localeStore.js` names that file as one of two places
  the rule *a shared formatter must never read the active locale* was written
  against. Its English `min` is a consequence of a decision, not a miss.
