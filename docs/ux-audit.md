# UX audit — dashboard changes, design-system gaps, and the tested rule

Provenance: the audit conversation itself is gone; this file is reconstructed
from the commit that acted on it — `1b6dd1a` "Act on the dashboard audit:
fifteen fixes and three rules with teeth" (2026-08-28) — whose message
enumerates the work. Items are worded from that record, not from memory.
Where the record is ambiguous, the item is marked **UNCERTAIN** rather than
guessed.

**Status, read this first — CORRECTED 2026-08-30 in roadmap 2.3.** Every fix
below was already implemented in commit `1b6dd1a`, and roadmap 2.3 restyled
every screen they touch without undoing any of them. A later session should
treat them as "verify still true", not "build".

**But the three design-system gaps no longer live where this file said.** The
old design system was replaced wholesale by "The Thread" in roadmap 1.5, and
none of the three section names below exists in it any more; the "(test 3)"
citation is stale too — that test number is now the third-party-library check.
Where each one actually lives:

- **G2** (segmented over dropdown) and **G3** (records are lists, cards are
  objects) survived as system law — `docs/design-system.md` § Composition,
  enforced by `tests/composition.test.mjs` tests 2 and 1 respectively.
- **G1** (which light wins) **did not survive the rewrite.** The behaviour was
  never lost — it is still encoded in `screens/Today.jsx` — but the rule had
  stopped being written down anywhere. It is written down again in
  `docs/dashboard-skeletons.md` §6, which is its right home now: it is a
  dashboard rule, not a system-wide one.

Item 15 below also changed shape in 2.3: Appearance is called **"Your
colour"** now, it no longer offers a light/dark switch (there is one ground),
and the colour it sets no longer touches the dashboard at all — law 11 keeps
the tenant's accent on customer-facing surfaces. It still shows the colour
rather than a hex code, which is what that item asked for, and it shows the
CORRECTED colour, which is the one their customers actually see.

## The 15 dashboard changes

1. **Booking link was dead text.** The most-shared thing a business owns
   couldn't be acted on. Fixed: the full address shown, with Copy, Open,
   and Share (where the browser has a share sheet). — implemented
2. **Finalize-payment sheet buried the answer.** It opened on a form for
   extra charges; the total, payment method, and the button that ends the
   job were below the fold. Fixed: that order reversed — money-critical
   path first. — implemented
3. **Payment method was a free text box.** Typed forever, untotalable.
   Fixed: chips — Cash, Card, Zelle, Venmo, Cash App, Cheque. — implemented
4. **Money had no month navigation.** Last month's books were unreachable
   from the screen that keeps them. Fixed: month navigation added. — implemented
5. **Today's greeting was the largest thing on screen** and showed the
   email local-part as a name. Fixed: the date is the headline. — implemented
6. **Finished-and-paid jobs took full cards on Today.** Fixed: they
   collapse to a line. — implemented
7. **The payment warning repeated the card above it.** Fixed: it is a
   button that goes where it points. — implemented
8. **The lit card ignored priority.** Fixed: the light marks the genuinely
   next action — money owed outranks a job that hasn't started (the
   "which light wins" rule, gap G1 below). — implemented
9. **Clients was eight cards filling a phone.** Fixed: a ruled list.
   — implemented
10. **The day sheet's block control was an errand.** It is a state.
    Fixed: a switch. — implemented
11. **Delete booking sat beside Cancel as an equal.** Fixed: Delete hides
    behind Cancel and says what deleting does that cancelling does not.
    — implemented
12. **The booking sheet stacked four buttons.** Fixed: two rows. — implemented
13. **The Hours bulk editor lied.** It claimed Mon–Fri 9–5 above a week
    that said Monday closed. Fixed: seeded from the real week. — implemented
14. **Vehicle sizes and statuses rendered as database values.** Fixed:
    they read as words. — implemented
15. **Appearance showed the hex code instead of the colour.** Fixed: shows
    the colour. — implemented

**UNCERTAIN — counting:** the commit also records "six native dropdowns
became segmented controls" and "a template with a broken token will not
save, and the message names the token that is wrong" (message templates got
the cheap fix rather than a pill editor). The commit says "fifteen fixes"
but enumerates more clauses than fifteen; whether the dropdowns→segmented
sweep and the template-token guard are two of the fifteen or ride alongside
them is not recoverable from the record. Both are implemented either way.

## The three design-system gaps

All three were written into `docs/design-system.md` by the same commit, and
`tests/composition.test.mjs` (test 3) asserts the sections exist:

- **G1 — Which light wins.** "One light per screen" said how many, never
  which; Today lit two jobs. Fixed means: the file ranks the candidates —
  unrecorded money, then the current/next job, then unsaved settings; ties
  go to the earlier one; a screen with no qualifying object has no lit
  element. — closed (§"Which light wins")
- **G2 — Segmented over dropdown.** Three native `<select>`s had slipped in
  while an unused `Segmented` sat in `components/controls.jsx`. Fixed
  means: a choice of two to four options is segmented, never a native
  dropdown; the control table says what to use for each kind of choice.
  — closed (§"Controls — what to use for a choice")
- **G3 — Composition: cards are objects, never sections.** The theme stayed
  constant but every screen was becoming a stack of identical rounded
  boxes (Clients was the proof). Fixed means: the composition vocabulary
  (lit card / quiet card / ruled list / receipt / rail / bare figures /
  sunken panel) is written down with the rule that two adjacent blocks
  share a treatment only if they are the same kind of thing. — closed
  (§"Composition — not everything is a card")

## The composition rule's test

The rule needed teeth: a careful visual pass had missed four violations,
including one in a finalize sheet that had just been rewritten. Fixed
means: `tests/composition.test.mjs` fails the build when a screen maps a
list of records straight onto `.card`, or a hand-written `<select>` offers
two to four options, and asserts the three rule sections above are actually
written in the design system. — exists and passes (run
`node tests/composition.test.mjs` from the repo root).
