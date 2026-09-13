# `tests/platform-admin.test.mjs` — the 49 failures, triaged

**Started 2026-09-13, lane C.** Andrew: *"A suite sitting at 49 failures teaches
everyone to ignore it, which is the same disease as the watchdog that only cried
wolf."*

**WHERE IT STANDS: 111 passed / 49 failed → 118 passed / 43 failed.** Seven
closed in this pass, every one of them the CHECK being wrong about a product that
was right.

## THE CAUSE, AND IT IS ONE EVENT RATHER THAN ROT

**Lane B rebuilt the back office on 2026-09-13** — `a3e35d5` *"Today, written in
sentences"*, `aff33a0` *"Growth, Money and Detailers, built to Today's shape"*,
`28e7ae3` *"The photo storage alarm could never sound"*. `AdminPage.jsx` is 1,462
lines of new screen. Every failing check reads that file, `admin.css` or
`platform-admin/index.ts`, and every one is a **source-text grep**.

**So the default hypothesis for any of the 43 is trap (k): the check names a
spelling and the spelling changed.** It is a hypothesis, not an answer — several
name a capability with no trace in the new screen, and one of those is already
recorded in `FOUND.md` as a real loss.

## THE INSTRUMENT WAS BROKEN FIRST, AND HAD TO BE FIXED BEFORE ANY TRIAGE

`strip()` ended with the rule that blanks a SQL string literal. Correct for a
migration. Pointed at JSX, TypeScript or CSS it pairs an apostrophe in ordinary
prose (`owner's`, `detailer's`, `don't`) with the next apostrophe **anywhere in
the file** and deletes everything between them, code included.

| file | before | after `strip` | survived |
|---|---|---|---|
| `app/src/admin/AdminPage.jsx` | 73,108 | 41,651 | **57%** |
| `app/src/admin/admin.css` | 25,156 | 15,536 | 62% |
| `supabase/functions/platform-admin/index.ts` | 48,115 | 23,679 | 49% |
| `supabase/functions/_shared/emailTemplates.ts` | 67,527 | 16,976 | **25%** |

Check `14e` asserted a signature that is on line 1213 of `emailTemplates.ts` and
was reading a file that no longer contained it. **Every stripped check in the
suite was asserting against a mangled file**, so a red one said nothing about the
product either way. `strip` is comments-only now; `stripSql` keeps the old
behaviour for the six migration call sites.

## CLOSED IN THIS PASS — seven, all of them the check

| check | what it asserted | what is actually there |
|---|---|---|
| `2b-i` | `status: "anon"` | the status moved from a `state` object to a `useState` local: `setStatus("anon")` |
| `2b-ii` | the string `Page not found` inside the denied branch | the branch renders **`<NotFound />`** — the product's one 404 page, the same component the router serves. Better, not worse. Now asserts the component AND reads `screens/NotFound.jsx` to confirm it is the not-found page |
| *"and the SCREEN says the same thing"* | same string | same fix |
| `2b-iii` | the sign-in error, sliced between the two status branches | the rebuilt screen SETS the error at line 254 and renders the anon branch at 260, so the slice no longer contained the sentence. Scoped to `doorErr`, the door's own error state |
| `13c` | same string | same fix as `2b-ii` |
| `14c` | `email: {` within **200 characters** of `cap: ps?.email_daily_cap` | seventeen lines apart, in a function that sends exactly what it is asked to. Both halves asserted, neither measured in characters — which this file's own note at `2b-ii` already said to do |
| `14e` | `platformAlertEmail`'s signature | present on line 1213; `strip` had eaten it |

**Baselined without editing `app/src`** (lane B's): each re-pointed assertion was
run against four deliberately mutated copies of the screen held in memory. Each
went red on exactly the mutation it guards and on no other — inline text back in
the denied branch, the `NotFound` import removed, the anon branch never set, and
the sign-in error naming the wrong half.

## THE REMAINING 43 — grouped, with what was measured

**The probe:** grep the new `AdminPage.jsx` / `admin.css` for the CAPABILITY the
check is about, not for the string the check greps. Present means a stale check;
absent everywhere means a candidate loss for lane B.

### A — CAPABILITY IS PRESENT, THE CHECK NAMES AN OLD SPELLING (lane C, next)

| checks | the capability | found in the new screen |
|---|---|---|
| `12k` | closing animates out through the shared hook | `useLeaving` ×2 |
| `12o` | the chart is drawn with explicit coordinates | `viewBox` ×1 |
| `13a`, `13a-ii` | the bar prints the signed-in address | `pa-who` ×1, `user?.email` ×1 |
| `11h-iv` | the chart's months are the detailer's | `monthlySeries` ×3 |
| `10h-ii` | the staleness window comes from the row | `stale_after_seconds` ×2 |
| `12m`, `12n` | reduced motion once, `?lite=1` rides it | `prefers-reduced-motion` ×1 and `.lite` ×7 in `admin.css` |
| `12h-ii` | the stagger steps are the only bare numbers | `animation-delay` ×2; the check wants ≥ 3, so **count, then decide** |
| `12j` | the frame is re-keyed so the swap runs | `pa-swap` ×1 |
| `12q` | an empty month is not lit | `pa-barr` ×6 in `admin.css` |

### B — NO TRACE ANYWHERE: a capability the rebuild may genuinely have dropped

**Do not "fix" these checks. They go to lane B as findings.** Zero occurrences of
the named token in `AdminPage.jsx` or `admin.css`:

| checks | what is missing | note |
|---|---|---|
| `10g`, `10h`, `10i` | the named job list and its staleness wording (`jobKeys`, `minutes ago`) | **already recorded** — `FOUND.md` § THE WATCHDOG'S BLIND SPOT says the rebuilt Plumbing tab dropped the named job list, and `watch-jobs` relies on it as a compensating control. These three are that finding wearing a different hat |
| `9h` | the export hands over a FILE (`URL.createObjectURL`, `a.download`) | |
| `9i`, `11l` | a confirmation survives the refresh after an action (`keepMsg`) | |
| `11k` | the desk layout does not scroll (`matchMedia`) | |
| `12a`, `12c`, `12d`, `12e`, `12f` | the two-column split (`pa-split`, `pa-back`, `pa-rest`) | the rebuilt layout may simply be a different shape — this group needs a LOOK, not a grep |
| `13c-ii`, `13e` | impersonation (`impersonation(`, `beginImpersonation`) | if this really is gone it is the largest of the group |
| `13f`, `13f-ii`, `13f-iii` | the owner-account guard and the invite (`ownerMember`, "Resend the owner's invite") | |
| `14c-ii`, `14c-ii-c`, `14c-iii` | the screen printing today's email count against the cap (`state.email`, `andrewsdetail`) | the SERVER half is fine — `14c` passes now |
| `11f`, `11g` | demo rows tagged and counted (`pa-tag`) | |
| `11i`, `11j` | the jobs tile wording, the promised storage total | |
| `11m` | the signed-out door names itself ("The back office") | |
| `no chart`, the strip counters, `pa-lead` | the Growth strip's shape | `aff33a0` rebuilt exactly this |

### C — NOT YET PROBED

`the button warns before it acts`, `the check has a strip to count`, `seven
figures across the top`, `and exactly one of them is the lead`, `and the two new
ones are about the product`. All in the rebuilt Growth strip; expect group B.

## THE RULE THAT COMES OUT OF IT

**A source-text check against a screen another lane owns is a check with a
half-life.** Nine of these would have survived the rebuild if they had asserted a
component, a shared constant or a computed value. Where the grep is the only
instrument available — this repo has no React test runner — assert the COMPONENT
rather than the class name, the STATE SETTER rather than the state shape, and
never a proximity window.
