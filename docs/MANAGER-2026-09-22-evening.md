# Manager note — 2026-09-22 evening into 09-23

**Written by the Cowork manager at ~22:05 Pacific, after both Claude Code
sessions went offline mid-item.** Everything below is measured or quoted, not
remembered.

## 1. Both worker sessions are down again, and the manager cannot restart them

| | |
|---|---|
| `DP Cowork` last ping | 2026-09-23 04:35 UTC (21:35 Pacific) |
| `DP Cowork2` last ping | 2026-09-22 22:10 UTC (15:10 Pacific) — idle all evening at 795.6k/1M, deliberately not given work |
| The pane says | *"Remote Control disconnected. Claude Code on the computer running this session is offline."* |
| The computer itself | **awake.** The file bridge listed `receipts/` seconds after the pane reported the session offline |

So the machine is fine and the two `claude` processes are gone — the same
state as this morning, for the second time in one day.
`docs/MANAGER-2026-09-22-cold-start.md` explains why the manager cannot fix
it: computer control grants terminals in **click-only** mode, so there is no
way to type `claude` into a prompt. **This is now a recurring cost, not a
one-off**, and it belongs on `FOR-ANDREW.md` as such.

The session was also found **archived** at one point, which silences the
doorbell without any error: no ping arrives and nothing says why. Unarchiving
restored the conversation and revealed the disconnect underneath it. **An
archived session and a dead session look identical from the doorbell.**

## 2. Two decisions were left for the manager and are still open

`DP Cowork` stopped and asked, correctly, rather than changing numbers that
are not its lane:

- **`receipts/pinned-bar.json` and `receipts/e2e-receipt-trail.json` both
  carry a floor that cannot bind.** `e2e-receipt-trail`'s own comment says
  *"20 is what a clean run executes"* beside a declared floor of **21** — the
  comment and the number already disagree, so one of them is wrong today.
  The session's offer: read both and declare the true structural counts, or
  lower the floors. **Not yet done.**
- **Four of 48 receipts had this shape in total.** Two were written tonight
  and were corrected in place; these two pre-date tonight.

## 3. A test is failing at committed HEAD and nobody had written it down

**`tests/receipt-fields.test.mjs` fails at HEAD.** The booking-receipt
endpoint returns **32** columns where the test expects **31**; the extra one
is `address_source`, which arrived with 2.8. **Pre-existing, unrelated to
tonight's work, and recorded nowhere until this note.** `DP Cowork` declined
to fix it on the grounds that it is not what 2.3 is about — which is right —
but a red test at HEAD that no document names is exactly the silence this
repo keeps paying for.

## 4. Where 2.3 stopped

Rewritten in `ROADMAP.md:1567` to Andrew's ruling — it now asks for the
**flag**, not for distance pricing. Findings established before the session
died, none of them yet built on:

- **The mismatch flag needs no geocode.** It is pure word comparison, wired
  end to end, and `bookings.travel_zone_address_mismatch` **exists now** —
  Andrew applied it himself on the night of 09-20, which makes the roadmap
  entry's "the column does not exist" text stale.
- **The zone `<select>` is NOT a rule violation, checked rather than
  assumed.** Two options — Long Beach at $0 and Beyond 15 miles at +$40 —
  but CLAUDE.md's own next clause exempts a mapped or searchable list, and
  `tests/composition.test.mjs` implements exactly that: it skips any
  `<select>` whose options come from `.map()`. **The tension is worth
  keeping**: the exemption is written for a list of *unknown* length, and
  this tenant's length is two, so a customer really does see a two-option
  dropdown. That is a design question, not a rule breach.

## 5. What closed today, and what it cost to prove

Batch 1A and Batch 1B are both finished; Batch 2 is part-done. Open items
counted, not remembered: **63** (`grep -c '^- \[ \]' ROADMAP.md`).

**Eight things were sent back today, and six of them were half-done items
that had already been reported as finished.** The recurring shape, in the
worker's own words, is that *every fix and every check in this codebase is
scoped to the one file or one element somebody happened to be looking at,
never to "every place this is supposed to exist."*

**The most expensive single correction was the manager's own:** `2.1` was
reported as no-fault after a walk that tapped a day, then a time, then looked.
The manager repeated the walk and **stopped between the two taps** — a
weekend day chosen, no time chosen, waited 3.5 seconds — and found the bar
still reading **$65** with no "Weekend rate", no "+$30", nowhere on the page.
The surcharge is a function of the **day** alone, so the product knows the
price is $95 the moment the day is tapped and keeps showing $65 while the
customer browses times. **The disclosure does not precede the charge; it
arrives with it.** That is 2.1 word for word and it was nearly closed clean.

**The lesson generalised into `docs/gotchas.md` as one class: an instrument
that disturbs the state it is inspecting.** Three instances in one day — a
screenshot taken before the reveal animation finished, a canary fired once
and called deterministic, and a walk that closes the very gap it is
measuring.
