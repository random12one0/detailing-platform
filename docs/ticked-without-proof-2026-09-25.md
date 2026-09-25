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
files, from 111 files scanned, exit 0.** It **exits 0 unconditionally** and says
so about itself — *"heuristic — for ordering the work, not for signing it
off."* **So 2.1c's own *Done when* names an instrument that cannot pass or
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
