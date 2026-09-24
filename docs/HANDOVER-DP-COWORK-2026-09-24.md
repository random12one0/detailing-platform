# Handover — DP Cowork, the night of 2026-09-23, written 2026-09-24

**Read this if you are picking up `app/src` work.** It is short on purpose. The
detail is in the roadmap entries and the two findings files named below.

---

## WHERE I STOPPED

**On 4.1** — *one tap completes a job* — at the **shape stage**, stopped by the
manager before any code. **Nothing was built, no row was changed, no email was
sent.** The whole diagnosis, the recommendation and **what to press first** are
in **`docs/4.1-findings-2026-09-23.md`**.

**The one thing to press before trusting any of it:** open a booking that is
already `no_show` and look for a way back. The claim that none exists was read
out of `BookingDetail.jsx`, **not pressed**, because that was a database write
nobody granted. **If a way back is on screen, the recommendation collapses.**

---

## WHAT IS UNCOMMITTED

**Nothing of mine.** Every file I touched is committed. At the time of writing
the working tree holds only other sessions' work:
`FOR-ANDREW.md`, `ROADMAP.md`, `scripts/render-emails.mjs`,
`supabase/functions/_shared/pricing.ts` and several receipts — **DP Cowork2's,
not mine. Do not commit around them.**

**Two of my write-ups are FILES rather than roadmap entries**, because
`ROADMAP.md` was busy when the night ended:

* `docs/8.3-findings-2026-09-23.md` — the contrast counting pass, **and the
  manager's own correction that 9.7's box is Andrew's to tick, not a
  session's.** That correction belongs in 9.7's entry.
* `docs/4.1-findings-2026-09-23.md` — above.

**Fold both into `ROADMAP.md` when it is free, then delete them.** They are
committed rather than untracked deliberately: 9.1's findings file was untracked
and is now gone — consumed correctly by the session that acted on it, but with
no trace either way.

---

## WHAT I KNOW THAT IS NOT IN A FILE

1. **Two decisions were made late and DP Cowork2 is recording them. Do not
   duplicate them.** (a) The **320 day squares stay as they are**, on Andrew's
   own precedent that squares stay square on a phone; `bk-bar-clearance.mjs`
   **stays red and graded**, with the exception named rather than softened.
   (b) The **Charlotte example site at `/ex3`** gets its opening picture
   brought down to fit the screen, because the reason it was left alone was a
   measurement that turned out wrong. **(b) is `app/src` and therefore ours —
   it is the next session's first item.**
2. **`receipts/deployed-inventory.json` was red all night** — 13 edge functions
   running something other than this checkout, including the one that prices a
   day. **Publishing is Andrew's. Do not deploy to clear it.**
3. **A check going green is not a fixed product.** `setup-inputs-contract.mjs`
   went green when 9.1's payload was widened; the back office a real detailer
   sees still scores them wrong until Andrew publishes. Both facts are in the
   file's header now.

---

## THE CHECKS I LEFT BEHIND, AND WHAT EACH IS RED OR GREEN FOR

| check | state | why |
|---|---|---|
| `scroller-clearance.mjs` | **PASS** 11/11 | the settings column's clip, fixed |
| `bk-bar-clearance.mjs` | **RED**, one failure, on purpose | 32 calendar day cells at 320 measure 37px against 44. **Parked by decision, not forgotten** — see its entry. It goes green when that is answered, by a fix or by a hold Andrew signs |
| `setup-inputs-contract.mjs` | **PASS** 16/16 | 9.1's payload, widened by DP Cowork2 |
| `client-card.mjs` | **PASS** 6/6 | 9.7's four basics |
| `calendar-legible.mjs` | **PASS** 11/11 | 9.4, both languages |
| `contrast-insitu.mjs` | **PASS** 56/56 | 8.3, now both languages |

---

## THE HABIT WORTH KEEPING, AND IT IS ALREADY BESIDE THE CHECK

**`scripts/tabbar-clearance.mjs` DELETES every `address%` bucket from
`rate_hits` to buy itself an address budget.** Three other scripts read those
rows as their evidence. A run of it in the middle of one of theirs does not
fail anything — **it silently changes their numbers**, and nobody afterwards
can tell a real result from a cleared bucket.

**On 2026-09-23 a green from that file was declined for exactly this reason**
and the same evidence was taken from a check that writes nothing. The reasoning
is **in that file's own header, where somebody about to run it will see it**,
and the general shape is `docs/gotchas.md` #78 — not only in a chat window.

**The rule it stands for:** before running a check, ask what it **writes**, not
only what it reads.

---

## THE SHAPE OF ALMOST EVERY FAULT I FOUND TONIGHT

Worth knowing because it kept recurring, in the product and in my own checks:

> **A reader handed less than it needs answers confidently anyway.**

The settings column clipped what it could not see. The back office scored
twelve steps from six inputs. My own parser lost a key to a comment. My own
contrast walk measured English twice and printed it as two languages. **None of
them errored. All of them looked like answers.** When a number surprises you,
ask what the instrument could not see before you ask what the product did
wrong.
