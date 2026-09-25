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

---

## THE LIST — 3 live gaps, with the cheapest thing that settles each

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
