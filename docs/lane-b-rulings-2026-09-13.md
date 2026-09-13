# THE THIRTY `platform-admin` CHECKS, RULED — lane B, 2026-09-13

**This answers § 2 of `docs/lane-b-handover-2026-09-13.md`**, which said the
work was *"a decision per row, not a repair: for each, either the capability
comes back or the check goes"* and asked lane B to **say which**.

**WHERE IT STANDS: 130 / 30 when the handover was written, 131 / 29 now.** One
was fixed rather than ruled. **Of the 29 left, 26 are checks against a design
Andrew replaced and go; 3 name a capability that is genuinely stranded and stay
red until somebody builds it.**

**THE DELETIONS ARE ONE COMMIT IN `tests/` AND THEY ARE LANE C'S.** Nothing in
this file changes `tests/`.

---

## THE THREE THAT STAY RED — a server action nobody can reach

**All three are the same shape as the price editor the handover's § 1 found,
and that shape is the one worth naming:** the EDGE FUNCTION still does the
work, the audit row is still written, and the rebuilt screen has no control
that sends it. A red check is the only thing left pointing at the gap.

| check | the action | what a person cannot do |
|---|---|---|
| `9h · the screen hands over a file rather than drawing it` | `platform-admin` `action === "export"`, `index.ts:749`, and `logIt(admin, "export", …)` still fires | take a detailer's data off the platform. No `URL.createObjectURL`, no `a.download`, no Blob anywhere in `app/src/admin/` |
| `13f-iii · the invite that fixes it is offered by the same test` | `action === "resend_invite"`, `index.ts:779` | get an owner onto a business that has none. The impersonate button is correctly disabled without `row.owner_email` — so the screen states the problem and offers no way out of it |
| `11j · the promised total is printed only when it is over the ceiling` | nothing server-side; the arithmetic was on the screen | see how much photo storage has been PROMISED against how much exists. The alert *"Photo storage is nearly full"* still fires at four fifths, so the alarm works and the number behind it is gone |

**RECOMMENDATION, IN ORDER:** `13f-iii` first — it is the only one of the three
that leaves a DETAILER stuck rather than leaving Andrew uninformed, and the
server half is one call. Then `9h`. `11j` last; the alarm covers the dangerous
case and the figure is a nicety.

## THE ONE THAT WAS FIXED INSTEAD OF RULED

**`14c-ii-c · and the warning says the account may be higher` — FIXED.** The
email alert said *"Platform emails: 78 of 100 today"* and stopped. `sent` counts
what THIS project sent; the cap is Resend's ACCOUNT-WIDE daily allowance, shared
with andrewsdetail.com. Two different populations, so the line under-reports —
the unsafe direction. It finishes the sentence now.

## THE TWENTY-SIX THAT GO — grouped by the decision behind them

### Impersonation was replaced, not dropped — 3

`the button warns before it acts` · `13c-ii` · `13e`

Andrew, 2026-09-09, quoted in `AdminPage.jsx`: *"I don't even wanna be signing
in as someone to view their dashboard… there should be just a way that I can
view it just from me."* It opens `/preview` in a new tab holding its own session
in its own drawer; the admin's session is untouched. The file's own comment:
**"No warning, because there is nothing left to warn about."** The server half is
unchanged — it still logs before it acts and a failed log still stops it, which
is what `13d` and `13h` guard, and both are green.

### The Growth strip is gone on purpose — 4

`the check has a strip to count` · `seven figures across the top, and never more
than eight` · `and exactly one of them is the lead` · `and the two new ones are
about the product, not the business`

`pa-strip`, `pa-num` and `pa-lead` are zero occurrences. Figures are `Tile`
(`pa-tile` / `pa-n` / `pa-t`) inside sections now, and Growth is a funnel of
sentences rather than a row of numerals. **"Exactly one of them is the lead" is
a rule about a strip**, so it cannot be re-pointed at something that is not one.

### The open business is a drawer, not a second column — 6

`12a` · `12c` · `12d` · `12e` · `12f` · `11k`

`pa-split`, `pa-rail`, `pa-back` and `pa-rest` are all zero. A business opens as
`<div className="pa-open" role="dialog">` — a scrim plus a `pa-col` drawer, the
same at every width. **Every reason those checks give is still satisfied, by
something else:** the way back is the `pa-x` button AND Escape (`12e`); a blank
half-screen is impossible because there is no half-screen (`12f`); and `11k`'s
*"scroll only where the panel is not already beside the list"* has no case left,
because the panel is never beside the list.

### A confirmation is shown, not announced — 2

`9i` · `11l`

Both assert `keepMsg`, which does not exist. The drawer reports an action by
CHANGING — press Suspend and the button becomes Restore and a `pa-flag pa-off`
appears on the row. A failure still speaks, through `window.alert`. **A state
that shows the new truth is better than a sentence claiming it**, and `11l`'s
"does not move him" has no scroll left to prevent.

### The watchdog's job list — 3, and the FINDING survives the checks

`10g` · `10h` · `10i`

`jobKeys.map(` and `if (!beat) return true;` are gone; the rebuilt Plumbing tab
loops `state.heartbeats` and prints *"X has not finished in N minutes (it should
every N)"*, with `"ever"` where nothing has ever reported. So staleness IS
printed and a never-reported job IS called stale — the checks name a deleted
implementation. **`10h-ii` is the one that asserts the RULE — the window comes
off the row — and it is green.**

**DO NOT DELETE THE FINDING WITH THE CHECKS.** `FOUND.md` § THE WATCHDOG'S BLIND
SPOT still stands: the loop walks rows that EXIST, so a job whose row is missing
entirely is invisible rather than stale. That is a real gap and it is not what
any of these three was measuring. `10i`'s smaller point also survives — 300
minutes prints as "300 minutes" and not as five hours.

### Spellings that moved — 4

| check | wanted | the screen has |
|---|---|---|
| `11f · a demo row is tagged in the list` | `pa-tag` | `{r.is_demo && <span className="pa-flag">demo</span>}` |
| `11g · the headline says how many were left out` | a `detailers · N demo` headline | the filter chips carry their own counts (`pa-chip` + `pa-c`), including *Real detailers* |
| `11m · the signed-out door names itself` | `The back office</h1>` | the eyebrow says *Detailing Platform · back office* above `<h1>Sign in</h1>` |
| `14c-iii · it goes red before the cap, not at it` | a `pa-bad` class at 0.8 | `mail.sent >= mail.cap * 0.8` pushing into `alerts`, which render inside `pa-fire` — already the red block |

**Three of these four should be RE-POINTED rather than deleted**, because the
behaviour they describe is real and worth guarding: the demo flag, the door
naming itself, and the four-fifths threshold. **`11g` has no subject left and
goes.**

### One figure that is no longer on the summary — 1

`11i · the jobs tile says the jobs are finished ones`

There is no jobs tile. The five are MRR, Detailers, Joined this month, Suspended
and Founding spots left. Finished work is stated as prose under them and per
detailer in the drawer (`Row k="Finished this month"`). **The wording defect the
check was written about cannot recur, because the label it guarded is gone.**

### The arithmetic

3 + 4 + 6 + 2 + 3 + 4 + 1 = **23 retired**, of which **3 are better re-pointed
than deleted**; plus **3 that stay red** and **1 fixed** = **30**. The 26 in the
heading counts the four "spellings that moved" as going, which they do — three
of them go by being rewritten.

---

## THE RULE THIS PASS ADDS TO THE TRIAGE'S OWN

The triage ended with *a check that can pass without reading anything will
eventually be the only thing standing between a regression and production.*
True, and this pass met the mirror image:

**A CHECK THAT GOES RED BECAUSE A SCREEN WAS REDESIGNED IS SOMETIMES THE ONLY
RECORD THAT THE OLD SCREEN COULD DO SOMETHING.** Twenty-six of these thirty were
noise and three were the only thing in the repo pointing at a live edge-function
action with no button on it. **So do not sweep a red suite by deleting whatever
no longer matches the new file** — read each one for the CAPABILITY it names,
because that is the half a redesign loses silently.
