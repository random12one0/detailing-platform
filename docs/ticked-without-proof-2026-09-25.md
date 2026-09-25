# Ticked items whose proof a stranger cannot check — the first pass

**2026-09-25. The mirror image of the stale-blocker sweep.** That one asked
whether items marked OPEN are still blocked; ten of twenty-three were not. **This
one asks the opposite: of the items marked DONE, which were ticked without the
proof ever being written down?**

**Nothing was unticked and nobody's checks were re-run**, as instructed.

---

## THE NUMBERS, and they add up or this file is wrong

| | |
|---|---|
| `- [x]` items in `ROADMAP.md` | **76** |
| scanned by pattern | **76** |
| **opened and judged as a stranger would** | **12** |
| of those 12, carry proof a stranger can check | **12** |
| of those 12, carry **no** checkable proof | **0** |
| **could not judge** | **64** |
| *overlay:* ticked items whose OWN text names something unproved or unbuilt | **26** |
| of those 26, the gap is **live** | **3** |

**12 judged + 64 not judged = 76.** The 26 and the 3 are an overlay on the same
76, not a separate population.

---

## THE CENTRAL FINDING: THIS AUDIT CANNOT BE DONE BY PATTERN, AND FOUR ATTEMPTS PROVED IT

**Every automated route produced mostly false positives, in both directions.**

| attempt | result |
|---|---|
| Count proof "markers" per entry (named check, number, date, commit, screenshot…) | **16 flagged as weak. Opening four: all four were fine.** 0.1 is a dated quote from Andrew and needs no measurement; 11.2 names a component, a **1,103-row** data file and a covering test |
| Require *strong* evidence, not a bare file path | **3 flagged. Opening all three: all three were fine.** 2.14 carries pixel clearances — **56px clear at 320, 50px at 392** — plus Andrew's own reproduction and his words; 9.3 names four widths and a console read; 2.7 quotes the three exact strings the fix produces |
| Find self-declared gaps in the entry's own words | **26 — and this one works**, because it reads the entry's admission rather than my inference |
| Decide which of the 26 are still live, automatically | **4 flagged; 3 were false positives** — a sentence describing the *fault*, a UI **label** that literally reads "NOT SEEN IN 3 MONTHS", and my own item-boundary bug swallowing the heading of a different, open item. **And it missed the two real ones**, which I found by reading |

**So the honest position is: the 64 I did not open are NOT graded. They are
unjudged.** Calling them proved because they are long and confident is the exact
failure this pass was sent to find, and a proxy that mislabels four out of four in
one direction and three out of four in the other is not evidence about the rest.

**What IS reliable is the entry's own admission**, and that is what the list below
is built from.

### UNJUDGED IS NOT A SYNONYM FOR FINE

**Sixty-four items nobody has read as a stranger is a real number, and this file
is not a clean bill of health.** It says three gaps are live because three were
opened and found; it does **not** say the other sixty-four are sound. **It says
nobody has looked.**

The two cases that started this pass are the reason that distinction matters:
**2.5 had been ticked-in-fact for three days** while its entry said nothing had
been added to its check, and **2.15's real fault was fixed on 2026-09-20 with the
proof recorded nowhere** — and neither was found by an audit. **Both were found by
somebody picking the item up and discovering the file did not match the world.**
There is no reason to think the remaining sixty-four are different in kind; the
only difference is that nobody has picked them up yet.

> **Read this file as an invitation to keep going, not as a result.** § *"The
> procedure for a later sitting"* is the next shift's work, and the honest
> estimate is about eleven hours.

---

## THE THREE WERE SETTLED THE SAME NIGHT — AND TWO OF THEM WERE NOT GAPS

**Read this before the list below it. The list was written an hour earlier and
two of its three entries were wrong.**

Each was given the ten minutes its own "cheapest thing" called for. **Result: one
live gap, not three. No tick comes off.**

### VERDICT 1 · ROADMAP 2.1c — **THE TICK STANDS. I LISTED IT WRONGLY.**

Both halves of the gap were already closed **inside the same entry**, in a
paragraph headed *"PRESSED IN FULL AND TICKED — third attempt, 2026-09-21"*:

* **the two-car case WAS pressed** — a five-row table at **320 / 390 / 768 /
  1440**, both languages, console clean at each, recording the actual Spanish
  string **`2.º vehículo · Small`** and the bar reading **$160** with
  `vehicle_count: 2`;
* **`i18n-survey.mjs` was run** — *"flags none of these files."*

**How I got it wrong: I read the gap sentence and not the paragraph that
answered it**, forty lines below, while writing a document whose own headline
says a scan cannot tell a paragraph from its own correction. **The automated
pass had classified 2.1c as resolved and I overrode it by hand.**

**ONE REAL FINDING CAME OUT OF DOING IT ANYWAY, and it is worth more than the
gap was.** I ran `node scripts/i18n-survey.mjs`: **128 candidate strings in 30
files, from 111 files scanned, exit 0.** It describes itself as *"heuristic — for
ordering the work, not for signing it off."*

**CORRECTED 2026-09-25, SAME NIGHT: "exits 0 unconditionally" was too coarse and
it was wrong.** The script **has** `process.exit(1)` and a canary —
`I18N_SURVEY_CANARY=1` exits 1, confirmed by running it. **But the guard is on
FILES SCANNED, not on findings**, and its own comment says why: *"finding nothing
is the goal, scanning nothing is the fault, and conflating those two is the
bug."* Its floor is 50 files and it walked 111. **So it can tell you it ran; it
cannot tell you the work is done** — which is the finding, stated properly. **The
fourth time tonight one of my own claims was coarser than the thing it
described.** **So 2.1c's own *Done when* names an instrument that cannot pass or
fail.** Running it produces a number and settles nothing. That is not 2.1c's
fault and it does not unseat its tick — the tick rests on the pressed table —
but **any future item that names `i18n-survey.mjs` as a done-when is naming a
survey as a gate.**

### VERDICT 2 · ROADMAP 7.4 — **THE TICK STANDS AND THE GAP IS LIVE.** The only one.

Nothing after it resolves it; the item ends six lines later. Its own words:
*"**NOT measured, same as every pass:** actual screen-reader audio
(VoiceOver/NVDA) — no headless browser runs one."*

**The tick is honest and should stay.** What 7.4 claims is narrower than "a blind
user can use this" — it claims linear DOM order and an accessible name on every
element, and both were measured. **The gap is a different claim nobody has made.**

**IT CANNOT BE SETTLED FROM THIS LANE.** A screen reader needs the running app,
which means the dev server and the browser, and those are DP Cowork's.

> **ONE LINE FOR WHOEVER HAS THE BROWSER:** *with the dev server up, turn on
> Windows Narrator (`Ctrl`+`Win`+`Enter`), then tab through (a) the booking
> page's date step and (b) the job record's pinned action bar, and write down any
> control that announces nothing, announces only "button", or announces a
> different thing from its visible label — five minutes, then turn Narrator
> off.*

**Zero cost, no install, nothing to build.** It belongs in the family with 8.3's
daylight read and 8.2's phone pass — human-only checks that no script substitutes
for — and `docs/testing/phones-we-do-not-own.md` is where that family is written
down.

### VERDICT 3 · `track-visit` inside 14.12 — **THE TICK STANDS. RESOLVED, AND I RE-CONFIRMED IT MYSELF.**

**The paragraph I quoted was the item's PRE-TICK body** — its original `Fix:`,
`Done when:` and *"Not started."* — which the tick's headline at the **top** of
the item supersedes: *"All four now carry the ceiling, and `track-visit` turned
out to need it — its header was wrong."*

**So reading FORWARD from a gap line is not enough either**, which is a second
instrument lesson: in this file a resolution can sit **above** the text it
resolves, because a tick is prepended and the original body is kept below it.
**The only reliable read is the whole entry.**

**And I did the Management API read rather than trusting the entry — it
corroborates exactly.** Deployed on `kguqylyzgyzfktkfnhjb`, read
2026-09-25: **`track-visit` `verify_jwt=False`, v55** — a stranger can reach it —
alongside `cancel-booking` v70, `reschedule-booking` v71 and `accept-quote` v53,
all `verify_jwt=False`. The repo's own `scripts/deploy-functions.mjs` sets
`verify_jwt: !PUBLIC_FUNCTIONS.has(fn)` and lists `track-visit` there, so the
tooling and the deployment agree. **The item's uncomfortable conclusion — that
its own header was false — is correct.**

### SO THE CORRECTED COUNT

| | |
|---|---|
| gaps listed an hour earlier | **3** |
| **genuinely live after ten minutes each** | **1** (7.4) |
| resolved inside their own entry, mis-listed by me | **2** (2.1c, 14.12's `track-visit`) |
| **ticks that should come off** | **0** |

**The roadmap did not have to go up by two. It would have been fine if it had** —
the instruction was that a true count moving the wrong way beats a lie — but the
true count here is that both items were already proved.

### WHAT COULD THIS HAVE MISSED, AND WHAT WOULD IT HAVE LOOKED LIKE

**Asked of the corrected number, because the previous number was wrong.**

* **A gap resolved somewhere OTHER than its own entry** — in `DECISIONS.md`, a
  receipt, or another item. It would look exactly like a live gap, because I only
  read the entry. **7.4 is the one at risk: if a screen reader was ever run and
  written up elsewhere, I would not have seen it.** I searched for
  `VoiceOver|NVDA|Narrator|screen.reader` across tracked markdown before
  concluding it was live — the only hits are statements that it has **not** been
  done.
* **A tick whose proof names a file that no longer exists.** Not checked for any
  of the three; the procedure below asks for it and this pass did not do it.
* **The 64 unjudged.** Unchanged, and still unjudged.

---

## THE ORIGINAL LIST, KEPT — two of its three entries are corrected above

**Kept rather than rewritten, because the shape of the error is the useful part:
gap sentences read without their answers, in a document warning against that.**

### THE LIST — 3 candidate gaps, with the cheapest thing that settles each

### 1 · ROADMAP 2.1c — the two-car case has never been run

**Its own words:** *"The two-car case was not pressed at all. It needs a tenant
with `max_vehicles_per_booking` above 1, and `demo-detail` is pinned to 1 on
purpose. **Read, never run**, exactly as it was last round."* And: *"`i18n-survey.mjs`,
2.1c's own done-when, was also not run."*

**Why it matters:** this is the multi-car money path, and ROADMAP 14.19 was a
two-car subtotal counting the second car twice. The one case that would have shown
it is the one nobody has executed.

**Cheapest thing that settles it — two steps, and the first is one minute:**
1. **`node scripts/i18n-survey.mjs`** — the item's own done-when, credential-free,
   never run. **Start here**: if it is red, nothing else matters yet.
2. **One SQL read** to find whether any seeded tenant already has
   `max_vehicles_per_booking > 1` — `select slug, max_vehicles_per_booking from
   businesses where max_vehicles_per_booking > 1`. If one exists, the two-car press
   is a normal browser pass on that tenant. **If none exists, that is the finding**
   and the item is blocked on a fixture, not on a press.

### 2 · ROADMAP 7.4 — no screen reader has ever been run

**Its own words:** *"**NOT measured, same as every pass:** actual screen-reader
audio (VoiceOver/NVDA) — no headless browser runs one. What was measured is what
determines the announcement absent an ARIA override: linear DOM order plus the
accessible name each element now carries."*

**This is an honest gap, not a lapse** — and it is the same shape as 8.3's daylight
and 8.2's phone: **a human-only check that no script can stand in for.** The
reasoning about DOM order is sound and is not the same claim as "a blind user can
use this".

**Cheapest thing that settles it:** **Windows already has Narrator** — `Ctrl` +
`Win` + `Enter`. **Five minutes, on two screens**: the booking page's date step and
the job record's action bar. Listen for the button that announces nothing, or
announces the wrong thing. **Zero cost, no install, no subscription** — and it
belongs in the same family as `docs/testing/phones-we-do-not-own.md`, which already
exists for exactly this kind of check.

### 3 · `track-visit`'s access model, inside the rate-limit thread

**Its own words:** *"This has not been checked against the deployed function or the
project's dashboard, and no deploy was made to check it (standing rule). It is
recorded as unverified rather than assumed either way."* And: *"`track-visit` first
needs its access model actually confirmed … before deciding whether it needs the
same fix or nothing at all."*

**Why it matters, in the entry's own words:** it *"writes campaign-attribution rows
with no limit at all — and being wrong here is the one of these five where it
actually costs something, because a written row is a row, not a discount somebody
didn't get."*

**Cheapest thing that settles it:** **one Management API read of the deployed
function's own config** — whether `verify_jwt` is on for `track-visit`. That is a
read, not a deploy, and it does not need Andrew. **One request; it either needs the
ceiling or it does not.**

---

## THE OTHER 23 SELF-DECLARED GAPS — why they are not on the list

**Read so they are dismissed for a reason rather than skipped.** They fall into
three groups, none of which is a tick resting on nothing:

* **Historical.** The gap line is followed, in the same entry, by the work being
  done — *"Not built 2026-09-21"* then *"BUILT AND PRESSED 2026-09-21"* (3.4b,
  2.1a). **The entry contains its own history, which is this repo's convention**,
  and a scan cannot tell a paragraph from its own correction.
* **Struck through.** Already marked superseded in place (2.32's chip work, the
  preset-chip entry).
* **Closed with a report instead of a build, by instruction.** The item's *Fix*
  was deliberately not built because Andrew's stop condition was met, and the
  report is the deliverable (4.5, 6.3, 8.10b, 7.12's sign-up half, 9.13). **These
  are correct ticks and a reader should know the Fix line was not executed** — the
  entries say so.

---

## THE PROCEDURE FOR A LATER SITTING — ten minutes an item, in this order

**Do not try to automate it. Read.** Four scans were tried and the reliable signal
was the entry's own admission.

1. **Read the entry's `Done when:` line first, before anything else.** That is the
   claim. Everything else in the entry is context.
2. **Ask one question: could a stranger check that claim from what is written?** A
   named check they can run, a number they can re-measure, a screen they can open,
   a row they can read, a quote with a date. **Not "is there a lot of text".**
3. **If the proof names a file, confirm the file still exists.** A proof pointing
   at a deleted script is worse than no proof, because it looks like evidence.
4. **Judge BUILD items and RULING items differently.** A ruling's evidence is a
   dated quote from Andrew and needs no measurement; demanding a number of one is
   how a good entry gets flagged. Roughly 8 of the 76 are rulings.
5. **Take the long ones first.** The trap named in advance, and it held up: the
   entries that look proved are long and confident, and length is not evidence.
6. **Write the verdict into the entry**, with the date, so the next pass does not
   re-derive it. One line is enough.

**The 64 unjudged items are the work. At ten minutes each that is about eleven
hours, or two or three sittings** — and it is worth saying that plainly rather
than implying this pass covered them.

---

## WHAT COULD HAVE PROVED ME WRONG

**Grading on length is the failure mode, so the test was to open the entries I was
about to pass.** I did, and it went the other way: **every one of the four my first
scan called "weak" turned out well-evidenced**, and my scan had missed pixel
clearances, quoted UI strings and a 1,103-row data file because none matched a
regex. **I was about to hand over a list of four false accusations.**

Then the reverse check: the automated attempt to find *live* gaps flagged four, of
which **three were false positives — including a UI label reading "NOT SEEN IN 3
MONTHS", which is the same mistake as flagging the word "Blocked" on a calendar
day cell an hour earlier — and it missed both of the real ones.**

**The two the manager already had — 2.5 ticked-in-fact for three days, and 2.15's
proof recorded nowhere — were both found by doing an item, not by scanning for
one.** That is the strongest evidence that this pass's honest output is a
procedure and 3 confirmed gaps, not a long list.

---

## APPENDIX — THE MIRROR FAULT, IN THE *OPEN* ITEMS' ACCEPTANCE CRITERIA

**Swept 2026-09-25, on the manager's instruction, after 2.12 turned out to name a
survey as its gate.** Three distinct faults, and they are not the same thing:

| fault | count | what it does |
|---|---|---|
| **A done-when that cannot FAIL** | **1** | the item can be "met" by an instrument that returns 0 regardless |
| **A done-when that cannot be MET** | **0 found** | — |
| **No done-when at all** | **25 of 59** | nobody can close the item, because nothing says what closing it would take |

### The one that cannot fail — fixed

**2.12, and it is the only open item whose done-when names any script at all.**
Rewritten in place; the reasoning is in the entry. `tests/spanish.test.mjs` is now
the gate — **71 passed / 6 failed today, and all six failures are 2.12's own
subject** — with the survey demoted to evidence.

### The twenty-five with no acceptance criterion

**0.3, 0.4, 0.7, 0.11, 0.13, 0.14, 0.15, 2.15, 6.4, 7.6, 7.10, 8.2, 9.4, 9.7,
9.10, 9.11, 9.14, 9.15, 11.3, 12.1, 12.2, 12.3**, and three unnumbered entries.

**NOT all of these are a defect, and saying which is which matters more than the
number:**

* **Legitimately none yet** — 12.1, 12.2, 12.3 and 9.15 are one-line Wave 12/13
  stubs carrying an audit reference and nothing else. A stub does not need an
  acceptance criterion until somebody picks it up.
* **Waiting on a third party, where the criterion is obvious** — 0.13, 0.14, 0.15
  each carry `Waits on:` / `How the wait ends:` lines, which do the same job in
  different words.
* **The ones worth a done-when, because they are real work somebody will try to
  close** — **0.11** (the R2 move, whose guard was built tonight and whose
  remaining halves are named nowhere as criteria), **8.2** (now pointed at a
  method but with no closing condition), **9.4, 9.7, 9.10, 9.11** (all screens
  awaiting Andrew's press, with no statement of what a passing press looks like),
  **2.15**, **7.6** and **7.10**.

**Not written tonight, and deliberately not**: twenty-five acceptance criteria is
a large write, several of them need Andrew's view of what "done" means, and
inventing them alone would be this session deciding when other people's items
close. **Named here so the next sitting can do it as its own item.**

### WHAT THIS SWEEP COULD HAVE MISSED

* **A done-when phrased without the words "done when"** — *"this closes when…"*,
  *"it is finished once…"*. The scan matched `/Done when/i` across every line of
  each open item, so a differently-worded criterion reads as absent. **Two of the
  25 may be false positives for that reason and I did not open all 25.**
* **A done-when that names a check indirectly** — *"the four credential-free
  suites"* rather than a filename. Those would not appear in the "names a script"
  count of 1, so **the true count of criteria-with-instruments is at least 1 and
  possibly higher.**
* **An instrument that fails on the wrong thing.** `i18n-survey.mjs` was found
  only because I ran it. **A script named in a done-when that fails on a floor,
  a timeout or a canary — but never on its subject — reads as a gate in every
  document and is not one.** Nobody has checked the others this way.

---

## BATCH 1 OF THE SIXTY-FOUR — read 2026-09-25, in roadmap order

**No pattern, no regex. Each entry opened and read.**

| | |
|---|---|
| items in this batch | **10** |
| carry proof a stranger could check | **10** |
| carry no checkable proof | **0** |
| could not judge | **0** |
| **new live gaps found** | **0** |
| **running total judged** | **23 of 76** — 13 earlier + this batch |
| **still unjudged** | **53** |

**The ten:** 1.1, 1.2, 2.1a, 2.2, the discount-label item, 2.3, the job-weather
budget item, 2.4, 2.5, 2.32.

**A QUIET BATCH, AND IT IS A RESULT.** Not one of the ten is a bare tick. What
they carry, in their own words:

* **1.1** — three measurements, each of which *"fails loudly on zero targets"*:
  404 string fields scanned, 4 hits before and 0 after, 6 payment handles
  rendered, and a DOM read of five input `.value`s **because `innerText` does
  not return an input's value**. It also records that **its own done-when grep
  was wrong** — matching a spelling, not a behaviour — and hid a fourth leak.
* **2.2** — the test was **written first and run against the unfixed code**:
  **5 of 9 failing**, with real figures in **both directions** ($247 vs $245
  undercharge, $289 vs $290 over). Then 9 passing, plus five more tests
  *computing* whether the pre-existing client-side fold becomes a double-fold.
* **2.3** — a two-row table of the **stored** flag (`true` / `false`) with both
  bookings unrefused and unrepriced, `scripts/zone-mismatch.mjs` at 17 targets /
  62 assertions / canary 5/5, sabotaged **both** ways, and a declared cost: no
  Geoapify credit, no real mail, two rows written and deleted in a `finally`.
* **2.4** — 51/51 controls, 317 assertions, **five** sabotages each naming its
  own canary and exit code, the pre-fix pages re-served from `HEAD`, and **two
  defects found in the check itself by disbelieving it**.
* **2.5** — 51/51 CTAs, 477 assertions, four sabotages that **plant a real
  defect in the real page** rather than blinding a detector, each producing
  exactly one failure of its own kind; the assertion count **drops to 469** on
  the two where the chain stops early, and that difference is visible in the
  number.
* **2.32** — before/after tables in pixels (**12px → 45px** at three widths),
  `--break=rect` reproducing the instrument's own bug on purpose, and a record
  of the instrument being **wrong twice** before it was right.
* **1.2, 2.1a, the discount-label item, the job-weather item** — all likewise:
  greps with their results, widths walked, call-count tables, named receipts.

**THREE THINGS WORTH CARRYING FORWARD FROM THE BATCH:**

1. **Every one of the ten names something it did NOT do.** 1.1 leaves
   `andrewsdetail.com` on the landing page as a decision; 2.4 logs two defects
   to `FOUND.md`; 2.32 measures 12 chips at 42px at 1440/1920 and says *"it is a
   real finding and it needs an item"* — **and it has one, ticked, immediately
   below it**, which I checked rather than assumed.
2. **One honest named gap, already owned.** The job-weather item states that the
   **refused** state *"was not"* pressed by a person — only the working state
   was, in the manager's own browser, with zero `address-suggest` calls on
   reopen. The refused state needs the hourly allowance to be gone, so neither a
   session nor the manager could reach it by clicking. **Evidence is
   `--break=quiet` at five widths plus screenshots, and the entry says plainly
   that is not the same as a person seeing it.** Not cheaply settleable; left as
   written.
3. **The read cost about ten minutes an item and the estimate holds.** 53 to go,
   which is roughly nine hours.

**WHAT THIS BATCH COULD HAVE MISSED.** I read nine of the ten in full. **2.5 is
520 lines and I read the first 120** — enough to judge the tick, which is what
this audit asks, and **not** enough to claim I read the entry. The remaining 400
lines are its historical diagnosis and its retracted false finding. **If something
is wrong in 2.5 it is in the part I did not read**, and that is stated rather than
papered over.

---

## BATCH 2 OF THE FIFTY-THREE — read 2026-09-25, resumed at `ROADMAP.md:3099`

**No pattern, no regex. Each entry opened and read whole, because a resolution
in this file can sit above the text it resolves as easily as below it.**

| | |
|---|---|
| items in this batch | **10** |
| carry proof a stranger could check | **9** |
| **carry a LIVE named unverified gap** | **1** (the booking-column width item, `ROADMAP.md:4714`) |
| could not judge | **0** |
| **ticks that should come off** | **0** — the one gap is a gap in coverage, not in the fix |
| **running total judged** | **33 of 76** |
| **still unjudged** | **43** |

**The ten, in roadmap order:** the scroller-clearance item (`:3099`), 2.6, 2.8,
2.9, 2.10, 2.11, 2.13, the booking-column width item (`:4714`), 3.4a, 3.4b.

**Two items in that stretch were skipped because they are already judged** —
2.7 (`:3304`) and 2.14 (`:4466`), both opened in the first pass and both found
well-evidenced. Their verdicts stand and were not re-derived.

### THE ONE FINDING WORTH A BROWSER — `ROADMAP.md:4714`, the booking column

**The tick is right and the fix is proved.** `.bk-wrap` measures **632 exactly**
on a fresh load against the **316.9** it was; the calendar's day cells are
**52 by 52**; Andrew pressed all four numbers himself on 2026-09-20 and the
Spanish strings are quoted off the screen.

**What it does not cover, in its own words:** *"The other session's matrix covers
steps one through five at four widths; it does not cover steps six and seven at
any width — for those two the correct sentence is that they have not been
compared, not that they look fine. And at 768px the calendar block itself was
not captured."*

**That gap is still live.** Nothing later in the entry answers it, nothing
elsewhere in `ROADMAP.md` does, and the entry ends two paragraphs later on the
second-instance sweep of `booking.css`. **It matters more than "two screens
unchecked" sounds**, because the one-line fix is on `.bk-wrap`, which the entry
itself says is shared by **all five** booking-side pages — so the change that
doubled the column's width reached steps 6 and 7 too, and only steps 1-5 were
looked at afterwards.

> **ONE LINE FOR WHOEVER HAS THE BROWSER:** *with the dev server up and the demo
> tenant seeded, walk the booking flow to **step 6 (the plan pitch)** and **step
> 7 (review)** at **320, 392, 768 and 1440**, read the console at each, and look
> for anything stranded, stretched or overflowing now the column is 632px
> instead of 317px — then at **768 only**, capture the calendar block on step 5,
> which was recorded as not-captured rather than as a result.*

**Ten minutes, no credentials, no spend.** It is the same family as 7.4's
Narrator pass: cheap, human, and the only thing that can close a gap the entry
already admits.

### 2.8 — THE PROOF WAS RE-MEASURED, NOT JUST READ, AND IT HELD

**Procedure step 3 says to confirm a named proof still exists, and 2.8 is the
item where that is not hypothetical** — it records that its own 2026-09-20
evidence row was eaten by a reseed and warns its replacement will go the same
way. So the three booking ids it cites were queried by id against
`kguqylyzgyzfktkfnhjb`, read-only, 2026-09-25:

| booking | entry claims | live database says |
|---|---|---|
| `3259be4f…` | kept, `address_source` = `picked` | **exists, `picked`, pending** |
| `16c75c74…` | kept, `address_source` = `typed` | **exists, `typed`, pending** |
| `c4c1f0c8…` | **gone**, eaten by the reseed | **gone — no row** |

**All three match, including the one that is supposed to be missing.** The only
row in this database whose `address_source` reads `picked` is still there, which
is the single assertion that can tell a working column from one hard-wired to
`typed`. **2.8 is the first entry in this audit whose evidence was re-taken
rather than re-read**, and it cost one read and no rows.

### TWO DEFECTS OF FORM, NEITHER OF WHICH UNSEATS A TICK

1. **`ROADMAP.md:3099` carries TWO `Done when:` lines, and the closure answers
   the first.** The first — *"the four rows are accounted for"* — is met in full:
   the clip was found, the fix is three selectors, the table reads 41px to 45px at
   1440 and 1920, and 7 of 7 unreserved scrollers went to 0 of 7. The second —
   *"no control anywhere in the back office measures under 44px … and the four
   surfaces above are recorded as re-measured rather than assumed"* — belongs to
   the **`--bk-bar-clear` 104px literal**, the deferred decision CLAUDE.md uses as
   its worked example, and **the four protected surfaces were not re-measured.**
   That is not this item's fix failing; it is a second, larger question folded
   into the same entry and closed by neither. **A stranger reading forward hits a
   done-when the closure does not address and cannot tell which of the two the
   tick rests on.**
2. **A paragraph headed "STILL OPEN, AGAINST ITS OWN DONE-WHEN" sits inside the
   ticked 3.4b.** Read in place it says 3.4b is not done. It is not about 3.4b:
   3.4b's done-when is a warning sentence on the *Your own words* screen, pressed
   at four widths in both languages and quoted. The paragraph describes **3.4's**
   done-when — *"confirmation, acceptance, reminder, quote, receipt, cancellation
   and reschedule have each been sent, received and read"* — and 3.4 is the open
   parent at `ROADMAP.md:4876`. **The text is filed under the wrong item**, and it
   is exactly the shape of thing this audit exists to catch: a sentence that reads
   as a live admission of failure inside an entry that earned its tick.

### THE OTHER EIGHT, IN ONE LINE EACH — what a stranger could go and check

* **`:3099` scroller clearance** — 41px to 45px at 1440 and 1920, 7 of 7 scrollers
  reserving nothing to 0 of 7, `scripts/scroller-clearance.mjs` (**confirmed on
  disk**, 11 targets / 45 assertions, receipt `PASS`), three sabotages including
  `--break=rect` reproducing the instrument's own historic bug.
* **2.6** — the year box left empty and Continue pressed at four widths, page
  moves to step 4 of 7 each time, contact step still refuses an empty email out
  loud; gates quoted with counts. Its two loose ends are **owned elsewhere** —
  the untranslated *"an estimate is fine"* is 2.12's and 2.7 is named as staying
  open — so neither is a gap in this tick.
* **2.8** — six kinds of address pressed, `address_source` read off each row, the
  `picked` case isolated as the only one that can distinguish a live column from
  a stuck one, plus `tests/address-source.test.mjs` (**confirmed on disk**)
  broken four ways, one per link in the chain. Re-verified above.
* **2.9** — the quoted line *"Coastline Auto Detailing comes to you, serving Long
  Beach & South Bay."* at four widths, Spanish rendering named, and the height
  cost measured both ways: 19px desktop, 38px phone, **no screen that fitted
  stopped fitting**.
* **2.10** — a four-row before/after table in pixels; the pitch was **842px on an
  844px phone screen** and is 0 on that step now, intact at 472/462/823/842 on
  step 6. The refusal to rename the $200 plan is argued from the data, not taste.
* **2.11** — two tenants read back two different numbers off two different
  businesses (24h / 48h) with both sentences quoted verbatim, three sabotages,
  and the 320px overlap parked in `FOUND.md` rather than absorbed.
* **2.13** — both headings quoted at four widths with no wrap at 320, the
  behavior pressed as well as the words, the Spanish key **replaced rather than
  left behind** so no stale entry is created.
* **3.4a** — a ruling item, judged as one: a dated reversal, its author, its
  reason, its carve-out, and three named places a stranger can read it. Its
  counter-search is the good part — it looked for a *re-*reversal dated the 22nd,
  23rd or 24th, found none, and found **0.12 on 2026-09-22 building on the
  reversal**, which is corroboration rather than absence. Its pointers were
  spot-checked: `docs/MANAGER-CLOSE-2026-09-21.md` § 2 exists, `FOR-ANDREW.md`
  carries the *"REVERSED 2026-09-21"* entry, `docs/what-we-send.md` carries
  Question 3.
* **3.4b** — the warning sentence quoted in full, pressed **320 first**, both
  languages, console read at each, screenshots showing it lands **above** the
  drawer so a detailer meets it before opening a box; `label-guard` 45/45.

### WHAT THIS BATCH COULD HAVE MISSED

* **`ROADMAP.md:4714` and 2.8 are long and I read them whole; 3.4b is 260 lines
  and I read about 120 of them** — enough to judge the tick, which is what this
  audit asks, and not enough to claim I read the entry. **If something is wrong
  in 3.4b it is in the part I did not read.**
* **The booking-column gap could have been closed somewhere other than
  `ROADMAP.md`.** I searched this file for *"steps six and seven"*, *"all seven
  steps"* and `W16`, and the only later coverage is
  `scripts/sweep-booking-steps.mjs` sweeping all seven steps from 2026-09-19 —
  **which is a fit-and-target sweep, not a before/after width comparison of a
  change made on the 20th.** If somebody compared 6 and 7 and wrote it up in
  `docs/VERIFIED.md` or a receipt, I did not see it.
* **I re-measured one item's evidence and eight items' file paths, and nothing
  else.** No screen was opened, no width was walked, no receipt was re-run. Every
  other verdict here is a judgement about what is written down.

---

## BATCH 3 OF THE FIFTY-THREE — read 2026-09-25, and the denominator moved

**THE TOTAL IS 77 NOW, NOT 76.** DP Cowork ticked **6.2a** in commit `428e942`
while this batch was being read. A tick that lands during the audit is by
definition unjudged, so it was pulled into this batch and read as a stranger the
same hour it was written — which is the cheapest this job will ever be.

| | |
|---|---|
| items in this batch | **10** |
| carry proof a stranger could check | **10** |
| carry a live named gap of their own | **0** |
| could not judge | **0** |
| **ticks that should come off** | **0** |
| **running total judged** | **43 of 77** |
| **still unjudged** | **34** |

**The ten, in roadmap order:** 4.2, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 6.2a, 6.3,
7.1. 7.4 (`:8757`) was skipped as already judged.

**A QUIET BATCH ON THE TICKS AND A LOUD ONE ON WHAT THEY NAME.** Not one of the
ten rests on nothing, and no tick should come off. **But two of them name a real
gap that belongs to no item at all**, and both were measured rather than taken
from the sentence. They are the finding of this batch.

### FINDING 1 · NOTHING OPENS A CLOSED `<details>` BEFORE MEASURING TAP TARGETS, AND EIGHTEEN FILES HAVE ONE

**4.5's own requirement 2 says it plainly** — *"29 of 41 `.choice` controls on
Booking rules sit inside two closed foldrows that still report full-size rects.
A gate that skips them **prints clean over 71% of its population**."* It then
closes on `/admin`, where `grep -c "<details" AdminPage.jsx` is zero, and names
the leftover: *"`BusinessInfo.jsx`, `Campaigns.jsx` and `Notifications.jsx` do
have `<details>` rows and are NOT proven to open them before measuring."*

**Measured here rather than believed, and it is worse than three screens:**

| | |
|---|---|
| `scripts/sweep-tap-targets.mjs` — occurrences of `details` | **0** |
| `scripts/lib/tapProbe.mjs` — occurrences of `details` | **0** |
| files under `app/src` using `<details>` or `<Folded>` | **18** |
| `BusinessInfo.jsx` / `Campaigns.jsx` / `Notifications.jsx` | **2 / 1 / 5** |

**WHAT KIND OF FAULT IT IS, STATED PRECISELY, BECAUSE THE TWO KINDS ARE NOT THE
SAME AND THE ENTRY DOES NOT DISTINGUISH THEM.** `tapProbe.mjs` filters its
candidates through `checkVisibility` (`scripts/lib/tapProbe.mjs:105`), so a
control inside a closed fold is **never discovered** rather than measured and
passed. **So this is a silent coverage hole, not a false green** — which is the
better of the two and still the one `docs/silences.md` exists for, because a
control that is never discovered also never appears in the `n of N` the probe
prints. **Two other scripts in this repo already solved it two different ways
and neither is wired into this one:** `sweep-widths.mjs:2424` opens every
`<details>` before it measures, and `tabbar-clearance.mjs:181` refuses to
measure them and **counts the refusal into its receipt**. Either is correct;
having neither is the gap.

**IT BELONGS TO NO ITEM.** 4.5 is ticked and says so; 4.6 is about receipts, not
folds; 9.2 is the content-assertion gap and is separate. **Recommend it gets an
item** — this is a scoping call and the audit does not make it.

> **ONE LINE FOR WHOEVER HAS THE BROWSER, once it has an item:** *run
> `node scripts/sweep-tap-targets.mjs` against the settings doors with
> `document.querySelectorAll("details").forEach(d => d.open = true)` applied
> first, and compare the discovered-control count with and without it — the
> difference is the population nothing has ever measured.*

### FINDING 2 · `admin-contrast.mjs` CAN STILL LEAVE AN UNDECLARED PLATFORM ADMIN BEHIND

6.2a records that its own check's teardown sat after `browser.close()` with
nothing catching a throw, so **two crashed runs each left a live
`platform_admins` row — an undeclared account that reads every tenant.** It was
wrapped and proved with `--crash-after-signin`. The entry then names the
leftover: *"`admin-contrast.mjs` still has the same hole and carries a
`ponytail:` comment admitting it."*

**Confirmed on disk:** `scripts/admin-contrast.mjs:164` — *"ponytail: no
try/finally around the browser section, so a THROW above this…"*.

**The risk is bounded rather than open**, and saying which matters: the
`platform-admins-declared` check catches exactly this and caught the real one
within the hour, refusing to allowlist it. So the consequence of a crash is a
red check and a row to remove, not a silent one. **The fix is a `finally`, it is
in DP Cowork's lane, and it has no item.**

### THE TEN, IN ONE LINE EACH — what a stranger could go and check

* **4.2** — the altered-audience attack described with the exact reply it got
  (*name, phone, home address and vehicle, with no API key and no token at
  all*), the altered-id case answering `404 not_found`, and the fix recorded in
  `docs/VERIFIED.md` § 14.2, **which is this item's own done-when and which
  exists at `docs/VERIFIED.md:1412`** — checked, not assumed.
* **4.4** — the strongest entry in the batch. A seven-row count table (**27
  exercised · 17 proved by refusing tenant B · 10 public by design · 9 out of
  reach · 3 refusing · 0 leaks**), the three remainders named individually with
  the response body each one returns, two sabotages (`--break=leak`,
  `--break=self`), and **a receipt that deliberately still reads `fail`** with
  the reason written out. It also does the thing this audit keeps asking for and
  rarely finds: it records that its single figures were a **range** because two
  consecutive runs disagreed by one, and names the rate limiter as the cause.
* **4.5** — done-when is *"a deliberate break in `AdminPage.jsx` fails a
  credential-free run, and the break is one a person could plausibly make."*
  Met, and **run five times rather than once** on Andrew's own instruction:
  `.pa-tab` squeezed to 2px/4px padding, `CAUGHT 5/5`, with the two credential
  environment variables printed as empty. The full walk is **293 controls,
  32,056 press probes, 0 findings**. See Finding 1 for what it leaves behind.
* **5.1** — the arithmetic is the proof and it is re-checkable: **$810 earned,
  $515 collected, $295 owed**, $515 + $295 = $810, and *Mark paid* on the $65
  job moved 515 → 580 and 295 → 230 with earned unchanged, row restored
  afterwards. Two parts of the original ask are **overruled with reasons**
  rather than quietly dropped.
* **5.2** — *"down $903 vs $853 last month"* became *"down $792 vs $742 at this
  point last month"*, one decision point (`previousSoFar()`), and
  `tests/mid-period-comparison.test.mjs` — **on disk** — at 87 assertions broken
  nine ways, nine caught.
* **5.3** — a real **$195** payment rather than a reading, the finding that it
  *"sent nothing and recorded nothing"*, and the receipt section built in
  answer. `scripts/e2e-receipt-trail.mjs` — **on disk** — 6 targets, 21
  assertions, four sabotages, **two of which rewrote the check itself before
  they could catch anything**, which is the sort of admission that makes the
  other two believable.
* **5.4** — measured against the database rather than argued: **not one visit in
  the whole table was tagged to a link**, so one screen was right and the other
  was counting three wrong things at once. `scripts/link-counts-agree.mjs` — **on
  disk** — 5 targets, 11 assertions, four sabotages.
* **6.2a** — **judged the hour it was written, and its one honest gap turns out
  to be checkable after all.** The entry says the never-reported state *"he could
  not force by clicking"* and that the half rests on the script's sabotages and
  screenshots. **Those screenshots exist:** `artifacts/health-line-honest/` holds
  **17 PNGs**, including `320x844-three-states.png`, and
  `receipts/health-line-honest.json` reads `"status": "pass"` over 11 targets and
  43 assertions. **So a stranger can open the file and look at the state nobody
  could click their way to**, which moves this from an admitted gap to a gap with
  an artifact. The fixture is the good part: two rows handed the identical
  `ran_at`, differing only by `seeded`, located by the slug the fixture invented
  and **never by the `data-job-state` the markup carries** — the screen's own
  claim about the thing under test.
* **6.3** — a controlled failure with the transitions written down: first bad
  sweep **silent**, second **`/fail`** with the reason string, check **up →
  down**, service restored, **down → up**, recovery row, **tenant deleted and
  verified afterwards** (nothing suspended, 16 businesses active, sweep back to
  `looked: 0`). **Four real emails with Pacific timestamps.** It also corrects
  its own earlier write-up — *"`db-audit` was left at 2 findings, both older than
  this work. That was wrong — both were mine."*
* **7.1** — the sabotage is the reason to believe it: a flag that moves a
  fingerprint inside the check was **rejected as a simulation**, and a **real
  one-byte edit** to `y-kinzie.html` made the gate fail naming **ex4 and only
  ex4**. Both named scripts are on disk. Four widths with the console read at
  each, and three further defects found by measuring.

### WHAT THIS BATCH COULD HAVE MISSED

* **4.4 and 4.5 are the two longest entries in this stretch — roughly 700 and
  300 lines — and I read all of 4.5 and about two thirds of 4.4**, stopping once
  the closing count table and the three remainders were read. The part I skipped
  is its round-one/round-two history. **If something is wrong in 4.4 it is in
  the part I did not read.**
* **6.2a was judged from the entry, the receipt's `status` field and the
  directory listing.** I did not open a PNG and I did not re-run the check, so
  what is proved is that the artifacts exist and the receipt grades `pass` —
  not that the pixels show what the entry says they show.
* **Both findings are about things the entries themselves named.** I measured
  them rather than repeating them, which is the difference between this and a
  scan — but **neither was found by me reading the code first.** An entry that
  names no gap at all would have got nothing of this kind from this pass.

---

## BATCH 4 OF THE FIFTY-THREE — read 2026-09-25, Wave 7 and the migration pair

| | |
|---|---|
| items in this batch | **10** |
| carry proof a stranger could check | **10** |
| carry a live named gap of their own | **0** |
| could not judge | **0** |
| **ticks that should come off** | **0** |
| **running total judged** | **53 of 77** |
| **still unjudged** | **24** |

**The ten, in roadmap order:** 7.2, 7.5, 7.7, 7.11, 7.12, 7.13, 7.16, 8.10a,
8.10b, 8.1. 7.4 (`:8757`) skipped as already judged.

**A QUIET BATCH, AND THE QUIETEST SO FAR.** Ten of ten. No new gap, nothing
unowned, nothing that needs a browser. **The only thing worth carrying out of it
is a pattern in how these entries go stale**, below, and it is a defect of form
rather than of proof.

### THE STRONGEST EVIDENCE IN THE BATCH, BECAUSE IT IS WORTH COPYING

* **7.12 held the network round trip open on purpose.** A code read cannot see a
  one-second window and neither can a normal page load, so `window.fetch` was
  patched to delay `rpc/founding_offer` by 10–12 seconds. **Inside that window
  the page printed seven confident wrong figures, three more than the item
  named** — `$720`, `$600 / $60 / $75`, `$180`, `$999` — each with what it
  settles to beside it. Then a four-width table showing `$35` only, and `$35` is
  deliberately left showing because blanking a true price would be the same
  fault inverted. **The probe was run against the unfixed page first and
  reported seven; that before-run is the canary.**
* **7.16 admits a false pass and says how it was caught, which is the most
  useful paragraph in the batch.** A stale HMR module threw inside
  `<PricingPage>`, the ErrorBoundary swallowed it, the page rendered nothing,
  and the probe reported **zero money on screen — a perfect pass from a page
  that had crashed.** Only the console read caught it. Every probe there now
  asserts `pageRendered`. It caught a second one too: `$$` inside a
  `String.replace` replacement collapses to one `$`, which turned a figure into
  `35 a month` with green tests and no console error.
* **7.7 establishes tenant isolation four independent ways rather than once**, a
  cross-tenant photo planted on purpose so there was something to miss: the
  export did not contain it, the table refused it with the business filter
  *deliberately removed*, the bucket refused both the direct path and a signed
  URL, and the guard throws rather than filtering — proved by making it filter
  instead, which turned 7 checks red. The zip was **extracted by Windows
  `Expand-Archive`**, not by its own reader, and `crc32("123456789")` was
  checked against the published `0xCBF43926`.
* **7.13 needed two instruments and says why neither alone works.** A source
  scan strips `<script>` and so misses `"Aluminium tanks"` inside a JavaScript
  array; a rendered scan that reads one tab reads one eighth of the copy.
  **Each printed clean over words the other found.** Its two exceptions are
  allowed **by position, not by spelling**, because "allow the word cancelled"
  would have waved through the exact sentence it was built to catch.
* **8.10a is the only entry in this audit whose fix was confirmed by the
  feature coming back in the same minute** — profile keys 28 → 29, the
  vehicle-count control `1 | 2` appearing for the first time, a two-car booking
  pricing at **$160**, and the cap put back to 1 afterwards.
* **7.11 is a ruling item and carries Andrew's own words at length**, including
  the part that reframed the question — *"that's just like fake, whatever…"* —
  and it refuses to close on the reference-design file agreeing with the code,
  on the grounds that two files sharing an unverified origin prove nothing.
  `app/public/img/mockup-real-example.jpg` is **on disk at 125,102 bytes**,
  which is the 125 KB the entry claims.
* **7.2, 7.5, 8.10b, 8.1** — a 13-statement audit across 6 surfaces with a
  before/after table and four walks to step 7 in two languages; a `data-still`
  mechanism with the argument that **no code path remains** rather than that
  none was seen; a receipt whose own `warnings` field lists what it **cannot**
  see, corrected when it went stale; and a sweep that found **eleven dialogs
  that had never been opened** and four defects in its own instrument, each
  with the sabotage that proved the gate.

### THE PATTERN WORTH CARRYING: A TICK CLOSES AND ITS OWN SENTENCES DO NOT MOVE

**Three entries in this batch contain a sentence that was true when written and
is false now, left in place unmarked.** None of them unseats a tick and all
three are resolved further down the same entry — but a stranger reading forward
hits the false sentence first, which is precisely the failure mode this audit
was created for.

| where | the sentence | why it is false now |
|---|---|---|
| **7.12**, in its own first half | *"BOX STAYS OPEN: the sign-up button half is not built and was not asked for this round."* | the second half landed **2026-09-22** and the box is ticked; the closure is ~95 lines below |
| **7.16**, first paragraph | *"7.12's box stays open on the sign-up button"* | same event, in a **different item**, so grepping 7.12 alone would not find it |
| **7.7**, third paragraph | *"There is still no photo export anywhere in this product"* | the photo half was **built 2026-09-21** and is described eight lines later |

**The repair is one strikethrough each and it is not mine to make** — this audit
does not edit entries. **The pattern is the point:** this repo's convention of
prepending the resolution and keeping the body works, and it works *only* when
the superseded sentence is struck. Three unstruck ones in ten entries is the
rate, and 3.4b's misfiled *"STILL OPEN"* paragraph in batch 2 is the same fault
one degree worse.

### ONE NAMED LEFTOVER WITH NO ITEM, LOW SEVERITY

**7.7:** *"the two exports are on different screens — customers on Clients,
photos on Photos — because there is no 'your data' screen and inventing one was
not asked for. A detailer told 'you export them and go' has to find two buttons.
Worth an item; not opened."* It is an inconvenience rather than a false claim,
both buttons exist and both work, and it is recorded here so it is not lost.

### WHAT THIS BATCH COULD HAVE MISSED

* **7.7 and 7.12 are 300+ lines each and I read roughly the first two thirds of
  both**, stopping once the build, the press and the sabotages were read. 8.10b
  likewise. **If something is wrong in those three it is in the part I did not
  read.**
* **Every verdict here is a judgement about what is written, plus four file
  checks** — the mockup JPEG's existence and size, and that the entries' named
  scripts are on disk. **No page was opened and no check was re-run.**
* **The staleness table above was found by reading, not by searching.** I did
  not grep the other 67 ticked entries for the same shape, so **three in ten is
  the rate in this batch and not a measurement of the file.**

---

## BATCH 5 OF THE FIFTY-THREE — read 2026-09-25, and the running total was wrong

**FIRST, A CORRECTION TO MY OWN THREE PREVIOUS BATCHES, BECAUSE A TALLY THAT
NOBODY CAN CHECK IS THE THING THIS AUDIT EXISTS TO FIND.** Batches 2, 3 and 4
reported a running total of **53 of 77**. That was carried forward from the
first pass's *"13 earlier + this batch"*, and **the 13 was never itemised.**

**Enumerated by line number instead of tallied**, which anybody can repeat with
`grep -n '^- \[x\]' ROADMAP.md`:

| | |
|---|---|
| `- [x]` items in `ROADMAP.md` | **77** |
| judged, **and nameable**, before this batch | **49** |
| of those, ones I can attribute to the first pass | **19**, not the 23 it claimed |
| judged in this batch | **10** |
| **judged and nameable now** | **59** |
| **remaining, and nameable — the list is below** | **18** |

**So the honest number was 49, not 53**, and the gap is four items the first
pass counted and did not name. They may genuinely have been read; there is no
way to tell from what is written, **which is the same fault, one level up, as a
tick with no proof.** The enumerated list is the better artifact and replaces
the tally from here on.

### THIS BATCH

| | |
|---|---|
| items in this batch | **10** |
| carry proof a stranger could check | **9** |
| **carry a LIVE named gap** | **1** (9.5) |
| could not judge | **0** |
| **ticks that should come off** | **0** |

**The ten, in roadmap order:** 8.1a, 8.1b, 8.3, 8.4, 9.5, 9.6, 9.8, 9.9, 9.13,
9.16. 9.3 (`:12072`) skipped as already judged.

### FINDING 1 · 9.5 — THE ONE CASE THAT COULD CATCH AN OFF-BY-ONE WAS NEVER ON SCREEN

**The tick is right.** Andrew read it off the live screen himself — *"5:00 PM
**Late** Chris Vogel, Express Wash, Mobile, sixty-five dollars"* — the negatives
were checked (a `completed` job past its time is not flagged, none of the seven
Coming up rows is), and the Spanish `"Atrasada"` was checked for gender
agreement with `"cita"`.

**Its own words on what was not proved:** *"Today had exactly one still-to-do
job, so the one check this cannot answer for — two open jobs side by side, one
whose time has passed and one whose has not, only the first reading `Late` —
was never on screen to fail or pass. That is the case that would catch an
off-by-one in the comparison."*

**It is live, and the entry is right that the negatives it did get are weaker**:
`completed` and a future `booking_date` may never reach the same branch the
still-to-do comparison does. The entry hopes somebody's next sweep lands on such
a day *"for free — worth watching for rather than staging on purpose."* **A
hope is not a plan**, and this one is cheap enough to stage.

> **ONE LINE FOR WHOEVER HAS THE BROWSER AND THE SEED:** *put two `confirmed`
> bookings on today for the demo tenant — one whose end time is an hour in the
> past, one an hour in the future — open Today, and confirm **only the first**
> row reads "Late" while both sit in Still to do; then delete both rows.* Two
> rows, no Geoapify credit, no mail. **It is the only case that distinguishes
> `end_at < now` from a comparison that flags everything in the list.**

### FINDING 2 · A BARE ENGLISH STRING 9.6 NAMED IS STILL THERE — VERIFIED, NOT QUOTED

9.6 closes cleanly and then names something adjacent: *"`Clients.jsx`'s own
record card already writes `facts.visits === 1 ? "visit" : "visits"` with no
`t()` wrapper — bare English on a translated dashboard, found while adding the
same two words correctly a few lines away. Worth its own line, not folded into
this commit."*

**Checked rather than repeated. It is still there**, and the contrast with the
line 33 rows above it is the whole point:

| `app/src/screens/Clients.jsx:709` | `{owner ? t("lifetime") : (visits === 1 ? t("visit") : t("visits"))}` |
|---|---|
| **`app/src/screens/Clients.jsx:742`** | **`{facts.visits === 1 ? "visit" : "visits"}`** |

**The same two words, the same screen, one wrapped and one not.** It is one
line, it is in `app/src` and therefore not this lane's, and **it has no item** —
2.12 is the Spanish item but its subject is the booking flow and its named
strings, and nothing points at this. `tests/spanish.test.mjs` reports *10 of
1611 dashboard strings with no entry*; whether this is one of the ten is not
established here.

### THE OTHER EIGHT, IN ONE LINE EACH

* **8.1a** — the done-when is a command anybody can run and it is quoted with
  its result: `sweep-widths.mjs 320 1440 392` exits **0**, **284/284** surfaces
  (95/94/95), receipt graded **PASS, 123,808 assertions**. Nine of the eleven
  defects were one shared line, **proved by putting the defect back** — the five
  New booking findings returned exactly as first reported and vanished again.
  The eleven are kept as a table with pixel overshoots, *"because the
  measurement is the record."*
* **8.1b** — the cleverest fixture in the batch. It did not reason about 1am, it
  **pinned `Date.now()` to 01:00 for the seed process only** and re-ran the
  seed, having first established that the three surfaces' reachability is
  settled entirely by the clock at *seed* time. **92/95 with 3 declared
  unreachable, then 284/284 with zero skips and no allowlist at all** once
  re-seeded normally. It also states its own limit — the browser's clock stayed
  on the real afternoon, so this reproduces the 1am *data*, not a 1am screen.
* **8.3** — one string in the whole product fails WCAG and **both existing gates
  were structurally unable to see it**: they measure token pairs, and a pair does
  not know which surface a label lands on. `--fog-2` is 4.90:1 on `--ink-1` and
  **4.20:1** on `--ink-3`, where the bubble is. Proved by **reverting the
  one-line fix in the stylesheet** and watching the receipt go to FAIL naming the
  string at 4.2:1. Its human half is recorded as exactly what it is: *"one
  person, one screen, once… if Andrew later says he did see something, this
  reopens."*
* **8.4** — the near-miss is the evidence: the "Added" badge first printed
  `--bk-accent-text` on a tint, which measured **3.14:1 on a black tenant pick**
  and would have been a live defect for any detailer choosing a dark colour. Ten
  screenshots claimed in `artifacts/8.4/`; **the directory holds 10 files** —
  checked.
* **9.6** — Andrew's own press quoted, and the width caveat stated rather than
  glossed: *"his browser does not reach 320 (pinned at 1414 inner)"*, so the 320
  evidence is named as this session's own. Its refusal to label the date and
  phone is written as **a test a later reader can re-apply** — *read the phrase
  with no other context; if it still names what it is about, it does not need a
  label* — rather than as a conclusion.
* **9.8** — **pressed at 320 with the request to Supabase held open**, so the
  "still asking" moment was on screen rather than inferred, on real data (6
  services, 2 promo codes, 5 templates). None of the three sibling screens
  printed the false empty sentence at any point during the hold. The ruling was
  **written before the build** so that giving the three siblings a different
  treatment from 9.8's skeleton reads as a decision and not an inconsistency.
* **9.9** — two pairs of eyes at two widths, and it says which is which: Andrew
  at desktop, the other session at 392. That run **proved the `Where` block
  actually OPENS before trusting any field in it** — *"a section that never
  opens has no fields to lose and would pass by absence."*
* **9.13** — a tick on work found already done, and it did not stop at the grep:
  `grep -i "proof"` returns nothing, **then it read the screens live** and quoted
  three hedged sentences off them, on a fresh tab per the console-buffer gotcha.
  *"Ticking a fixed item is not the same as skipping it."*
* **9.16** — both directions, both signed in programmatically, both
  screenshotted, and **the screenshots are on disk**:
  `receipts/screenshots/9-16-gear-row-2026-09-23/{owner,staff}.png` plus a
  `result.json`. The staff account was confirmed **absent from `platform_admins`
  by reading the table**, not assumed. Andrew then found more rows missing than
  the item named, and the entry proves it pre-existing with `git log -1 -L` on
  the exact line — commit `45eaf85`, thirteen days earlier.

### THE EIGHTEEN THAT REMAIN, BY LINE NUMBER

**So the next sitting does not have to re-derive the list.** Line numbers are as
of commit `bc9881f`; the item titles are stable, the numbers are not.

`13376` 10.1 · `13419` 10.2 · `13437` 11.1 · `13619` the private note ·
`13642` the calendar link's password · `13676` every email leaves a row ·
`13716` a paid booking cancelled silently · `13767` a payment settled ·
`13814` all ten tables hold a row · `13932` Andrew ruled, one list ·
`13974` the contradiction settled · `14051` `platform_admins` holds two rows ·
`14855` `accept-invite` carries the ceiling · `15022` 8.6 phones we do not own ·
`15483` found by DP Cowork and reproduced · `15702` found out of a measurement ·
`15871` one line in `_shared/pricing.ts` · `16147` inherited, not caused.

**Nine of the eighteen are the unnumbered 2026-09-16/17 security and money
entries**, which are a different shape from everything judged so far — they
predate the roadmap's current conventions. Expect them to read differently and
judge them on the same question anyway.

### WHAT THIS BATCH COULD HAVE MISSED

* **9.8 and 9.16 are long and I read them in full; 8.3, 8.4 and 9.6 I read in
  full; 8.1a, 8.1b, 9.5, 9.9 and 9.13 are short enough that "in full" is not a
  claim worth making.** No entry in this batch was skimmed to a verdict.
* **Finding 2 was verified in `app/src`, which is not this lane's to change** —
  reading it is not editing it, and the line number is given so whoever owns
  that file can confirm it in one command.
* **The correction at the top rests on enumeration, which I did once.** If a
  ticked item is added or removed the numbers move; the command that regenerates
  them is in the table.
