# `tests/platform-admin.test.mjs` — the 49 failures, triaged

**Started 2026-09-13, lane C.** Andrew: *"A suite sitting at 49 failures teaches
everyone to ignore it, which is the same disease as the watchdog that only cried
wolf."*

**WHERE IT STANDS: 111 / 49 → 118 / 43 → 130 passed / 30 failed.** Seven closed
in the first pass, twelve more and one deletion in the second. Every single one
was the CHECK being wrong about a product that was right.

**READ § THE SECOND TRIAGE PASS AT THE BOTTOM BEFORE ANYTHING HERE — it closes
group A, probes group C, and carries the number that matters: eighteen of the
118 green lines were green against nothing at all.** It also settles group B's
largest item (impersonation is not gone; it moved to a `/preview` tab at
Andrew's own ask), so do not hand that over as a lost capability.

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

---

# THE SECOND TRIAGE PASS — 2026-09-13, lane C

**WHERE IT STANDS NOW: 118 passed / 43 failed → 130 passed / 30 failed.** Twelve
closed, one deleted, and **eighteen of the checks that were already green have
been found to be green against nothing at all.** That last number is the one
that mattered tonight, and it is § 3.

## 1 · GROUP A IS CLOSED — twelve re-points, every one the check

Nine rows, twelve check ids. All baselined against **mutated copies of the
screen held in memory** — `app/src` was never written, lane B owns it — and each
went red on exactly the mutation it guards and on no other. Twenty-six mutations
in all.

| check | the old spelling | what is there now, and what the check asserts instead |
|---|---|---|
| `10h-ii` | `beat.stale_after_seconds` | the loop variable is `h`. Asserts the COLUMN, not whose local holds it |
| `11h-iv` | `monthlySeries(..., b?.timezone)` | `row.timezone`. Asserts that a timezone off the business row is the fourth argument, whatever the row is called |
| `12h-ii` | `>= 3` calc'd stagger delays | there are two staggered containers. **Now counts the subjects and asserts every one conforms** — a magic threshold failed a correct file |
| `12j` | `key={b.id}` | `key={row.id}` |
| `12k` | `useLeaving(() => setOpen(null))`, `.pa-col.leaving` | `useLeaving(onClose)`, `.pa-col.pa-leaving`. **Asserts the IMPORT PATH** — a local re-implementation is the failure it guards — not the callback's name |
| `12m` | exactly ONE `@media (prefers-reduced-motion)` | **the correct answer is now ZERO.** `main.jsx` toggles `.lite` for the media query AND `?lite=1`, which is what makes them one mechanism. A block in `admin.css` would be the fork `?lite=1` cannot reach |
| `12n` | `.lite .pa-in, .lite .pa-col` | a four-selector group. Asserts `?lite=1` ORs with the media query in `main.jsx` and that `.lite` is what kills the animation |
| `12o` | `<svg className="pa-bars"` | `pa-chart`. Asserts an `<svg>` with a COMPUTED `viewBox` and names no class at all |
| `12q` | `.pa-barr.now.has` | `.pa-barr.pa-now.pa-has`. **And a new second half: no rule may light the current month WITHOUT requiring work in it** |
| `13a` | `{state.me}` | a `useState` local. Reads whatever identifier `pa-who` renders, then requires something to SET it — drawn versus merely stored, which is the warning already sitting above that check |
| `13a-ii` | `sess.session.user?.email` | **the CHAIN, not the call.** `auth.getSession()` appears twice in this file, so "getSession is somewhere" is satisfied by the other one. The first mutation of this one stayed green, which is why it is written this way |
| `13b` | a local `function signOutNow` | the button is wired straight to `signOutEverything` from `lib/signout.js`. Asserts the import — roadmap 8.18's one door — and the handler being it |

**THE ONE WORTH REMEMBERING:** `12m`'s number flipped from one to zero. A count
inside a check is a claim about an architecture, and when the architecture moves
the count is wrong in a direction nobody looks for.

## 2 · `no chart` IS DELETED, AND IT COULD NEVER HAVE PASSED

It asserted that `AdminPage.jsx` contains no chart — *"fewer than ten customers
means every trend line is noise"* — while `11h`, `11h-iv`, `12o`, `12q` and
`12r` **in the same file** assert that a six-month bar chart is drawn on that
same page, with the detailer's own months and an unlit empty month. Both cannot
hold. The chart was specified and built after that line was written.

**A check that contradicts five of its own neighbours is a finding about the
suite, not about the product** — and a permanently red check is what teaches
people to stop reading the output, which is the disease this whole triage is
about.

## 3 · THE HOLLOW PASSES — **EIGHTEEN OF THE 118, AND THE NUMBER IS MEASURED**

**The question:** `strip` had been deleting 43-75% of every non-SQL file this
suite reads, so its PASSES were as meaningless as its failures. How many of the
118 were passing only because the text they wanted had been eaten, or was never
in what survived?

**THE INSTRUMENT.** Every `read()` in the suite replaced by `() => ""` —
`readdirSync` left real, so a check that COUNTS subjects still sees them while
the CONTENT is gone — and the suite re-run. A check still green there is green
whatever the file says.

| | |
|---|---|
| green against empty files, before | **20** |
| of those, failing in the real run anyway (`no chart`) | 1 |
| of those, a BEHAVIOURAL check that reads no source (`11h-v` runs `monthlySeries`) — correctly green | 1 |
| **hollow: of the 118, green whatever the file said** | **18** |
| green against empty files, after | **1** — `11h-v`, the behavioural one |

**AND FIVE MORE CHECKS DID NOT EXIST AT ALL** on gutted input: the `13k` and
`13l-ii` loops are driven by file contents, so they produced zero checks rather
than false ones. Both are guarded by their own `the check has subjects`
companions, and both companions correctly went red. **That pattern works and is
the one to copy.**

### THE SEVENTEEN ABSENCE CLAIMS, AND WHY AN ANCHOR WAS THE ONLY FIX

Sixteen were pure `!/x/.test(file)`. **A negative assertion is satisfied by an
empty file**, so each now names an ANCHOR — something that must be present for
the absence to mean anything — through one helper, `absent()`. A missing anchor
is reported as a missing subject, which is a FAILURE and never a silent pass.

`no role claim is trusted` · `no environment variable is the gate` ·
`no second permission system for admins` · `no refunds or card handling` ·
`NOT ONE supabase.from() ON THE ADMIN SCREEN` ·
`NO DETAILER-FACING FILE READS admin_notes_platform` ·
`NO POLICY MENTIONS THE ADMIN CHECK` · `platform_admins has NO policy` ·
`platform_admin_events has NO policy` ·
`it is in no version of the public profile` ·
`the site action never writes business_domains` · `12h` · `12l` · `12p` ·
`13d` · `11n`.

**AND NO AGGREGATE GUARD CAN REPLACE IT — measured, and this is the part that
generalises.** The obvious fix is to fail when `strip` removes too much of a
file. It cannot work here: **the FIXED, comments-only strip legitimately removes
83% of `signout.js`, 78% of `impersonation.js` and 73% of `App.jsx`**, because
this repo comments that heavily. No survival ratio separates *that was all
comments* from *that was the comments and the code*. **The reason the `strip`
bug survived weeks is that in this codebase a massive deletion looks completely
normal.**

### TWO SUBJECT COUNTERS WERE COUNTING THE WRONG THING

Both existed to prove their loop had looked at something, and both counted
something that exists no matter what is inside the files — so **neither could
ever have detected the mangling they were there to catch.**

| check | counted | now counts |
|---|---|---|
| `...and the migrations were actually read` | migration FILES (`> 20`) | `create policy` STATEMENTS found (`> 40`; there are 71) |
| `...and the walk actually looked at something` | DIRECTORY ENTRIES under `app/src` (`> 5`) | files with text in them after `strip` (`> 80`; there are 131) |

And `it is in no version of the public profile` ran `[].every()` over a list it
never checked was non-empty — true for an empty list, so it passed while
inspecting nothing.

### `11n` HAD THE `indexOf` TRAP, WHICH THIS SUITE ALREADY NAMES

It sliced from `indexOf('status === "denied"')` with no presence check.
`indexOf` returns **-1** when the anchor is gone and `slice(-1, 399)` is **the
last character of the file**, so a renamed status would have made the check read
one character and pass. § 3 of the suite already carries the paragraph about
`indexOf(a) < indexOf(b)` passing loudest when `a` has been deleted; this was
the same trap in a second costume four hundred lines away.

### BASELINED BOTH WAYS

- **The anchor half:** the gutted run. All eighteen report NO SUBJECT.
- **The negative half:** fourteen violations injected one at a time into
  in-memory copies — a `refunds.create`, an `app_metadata` read, a
  `supabase.from` on the screen, a `create policy` on `platform_admins`, a
  `250ms` duration, a `setTimeout(..., 180)`, a `height: 100%`, a `fetch(` in
  `impersonation.js`, a reason string in the denied branch. **Every one went
  red.** Wrapping a negative could otherwise have left it reporting only a
  missing subject for ever.
- One failed injection attempt is worth keeping: `// admin_notes_platform` as a
  COMMENT left the leak-hunt green, and it was **right** to — `strip` removes
  comments first. Re-injected as code, it went red.

## 4 · GROUP C IS PROBED, AND IT IS GROUP B — all of it is lane B's

| check | probe | verdict |
|---|---|---|
| `the check has a strip to count` | `pa-strip` x0 | the Growth strip header is gone |
| `seven figures across the top` | `pa-num` x0 | same |
| `and exactly one of them is the lead` | `pa-lead` x0 | same |
| `and the two new ones are about the product` | `jobs finished this month` x0, `through the platform` x0 | same |
| `the button warns before it acts` | `confirm(` x1, `written down` x0 | **NOT a loss — a deliberate change, and Andrew's own words are in the file** |

**THE LAST ROW SETTLES GROUP B'S BIGGEST ITEM.** The first pass said of
`13c-ii` and `13e` — impersonation — *"if this really is gone it is the largest
of the group."* **It is not gone.** `AdminPage.jsx:1165` quotes him asking to
*"view their dashboard... just from me"*, and impersonation now opens a
`/preview` tab holding its own session in its own drawer (`lib/preview.js`,
`admin/PreviewEntry.jsx`), with the comment **"No warning, because there is
nothing left to warn about."** The server half is untouched: the action still
logs before it acts and a failed log still stops it.

`lib/impersonation.js` is still live and imported by `App.jsx`,
`BusinessContext.jsx` and `signout.js`, so the `13d` and `13h` families still
guard something real. What changed is that the BACK OFFICE no longer writes the
note.

**So `13c-ii`, `13e` and `the button warns before it acts` are checks against a
design Andrew replaced, not evidence of a dropped capability** — which is a
different handover for lane B: three checks to retire, not a feature to restore.

## 5 · THE RULE, SHARPER THAN THE FIRST PASS PUT IT

The first pass ended with *a source-text check against a screen another lane
owns has a half-life*. That is true and it is not the expensive half.

**THE EXPENSIVE HALF: A CHECK THAT CAN PASS WITHOUT READING ANYTHING WILL
EVENTUALLY BE THE ONLY THING STANDING BETWEEN A REGRESSION AND PRODUCTION.**
Eighteen of this suite's 118 green lines were that, and the way to find out was
to **take the files away and see who noticed**. Do that to any suite before
trusting a number it prints — it costs one `read()` replaced by `() => ""`.

---

# 6 · THE CLASSIFICATION, EVERY FAILURE BY NAME — lane C, 2026-09-13, at `af58108`

**ROADMAP § Next 1 asked for 45 classified into real defect or stale assertion.
The 45 was the morning's figure; two triage passes had already taken it to 30
before this one started, and 30 is what was red. THE SPLIT IS 3 AND 27.**

| | count |
|---|---|
| **REAL DEFECTS** — the product is wrong | **3** |
| **STALE ASSERTIONS** — the check named a spelling, or a design that was replaced | **20** |
| **ALREADY-CLASSIFIED SKIPS** — the dead `impersonation.js` family, printing their own reason | **7** |
| **total** | **30** |

**THE SUITE IS 146 / 3 / 7 NOW**, was 129 / 23 / 7. The three reds are red about
`app/src` and are lane B's; the twenty are fixed in `tests/`, which is lane C's.

## 6a · THE THREE REAL DEFECTS

**All three go GREEN under a plausible fix** — proven by applying one to a
scratchpad copy and re-running: **149 / 0 / 7.** So none of the three is a check
that cannot be satisfied.

### 1 · The open detailer is a SNAPSHOT, so an action leaves the panel lying

`9i · the open detailer is re-read after an action, not left on a snapshot`

`TabWho` keeps the open detailer as `open`, the row OBJECT captured at
`setOpen(r)` (`AdminPage.jsx:994`, `:1061`). `act()` awaits `reload()`, which
refreshes `rows` in the parent and **never re-points `open`**. The `detail`
fetch keys on `[open]`, which did not change, so it is not re-read either.

**Press Suspend, confirm it, and the panel still says the detailer is live and
still offers Suspend.** Nothing on the screen says the action worked — the old
screen's confirmation sentence went with the rebuild, and the one thing that
could have replaced it, the state itself, is the stale copy. Andrew presses it
twice.

**The fix that was proven green:** hold `openId` and derive
`open = rows.find((x) => x.id === openId) ?? null`.

### 2 · Three unguarded plurals in two date helpers

`10i-ii · and one of anything is never printed with an s`

`shortAgo()` and `ago()` both round and then append a plural:

| helper | input | prints |
|---|---|---|
| `shortAgo`, `hours ago` | 60–89 minutes | **"1 hours ago"** |
| `ago`, `months ago` | 30–44 days | **"1 months ago"** |
| `ago`, `years ago` | 365–547 days | **"1 years ago"** |

**The first one is the worst and it is not a corner case.** `shortAgo` prints
the "last ran" figure on Plumbing's *Jobs that run on their own*, and the
reminder sweep's own staleness window is 45 minutes — so **the 60-to-89-minute
band is exactly where a stopped sweep sits when Andrew first looks at it.** The
string he is most likely to read on a broken job is the ungrammatical one.

`ago()`'s two are on the Detailers list and in the open panel's *Last booking*.

**THE OLD CHECK HELD THIS AND THE REBUILD DROPPED IT** — it pinned the
`hour` / `hours` ternary, which WAS the guard. Same family as "1 visits", which
`CLAUDE.md` already names once.

### 3 · F-016 is back, on the Detailers list, in the same two adjacent lines

`11i · the jobs figure says the jobs are finished ones, in BOTH places`

The rebuild got the open panel right — `<Row k="Finished this month" />` — and
dropped the word from the list row, which prints
`{r.jobs_month} jobs this month` (`AdminPage.jsx:1074`) **directly under** the
attention sentence, which for a healthy detailer reads `Booking · last one
today`.

`jobs_month` counts COMPLETED jobs: `platform-admin/index.ts:271` is
`monthJobs.length` off `done`. So a detailer with work booked and nothing
finished yet reads **"0 jobs this month"** an inch under **"last one today"**.
Both true; together they read as a broken screen. That is F-016 word for word.

**One word, in one row.**

## 6b · THE TWENTY STALE ASSERTIONS, BY NAME

Every one verified by finding the capability under its new spelling, or by
finding the design Andrew replaced it with. **All twenty are re-pointed or
deleted in `tests/platform-admin.test.mjs`, and seventeen were baselined by
breaking the real subject on a scratchpad copy and watching the check go red.**

| # | check | verdict |
|---|---|---|
| 1 | `the button warns before it acts` | **DELETED.** Impersonation opens `/preview` instead of swapping the session; `AdminPage.jsx` quotes him asking for that and says "nothing left to warn about". The server half — log before acting, failed log stops it — is untouched and still checked. |
| 2 | `the check has a strip to count — the header was found` | **RE-POINTED** to `.pa-tiles`. The `pa-strip` header went with the one-screen back office; Today ends with five `<Tile>`s. |
| 3 | `seven figures across the top, and never more than eight` | **RE-POINTED** to `no more than eight figures in one run`. The CEILING was always the property; the exact count never was. |
| 4 | `and exactly one of them is the lead` | **DELETED.** It asserted a hierarchy — one lead against the ground, six in a ruled row — that the rebuild flattened to five equal tiles on purpose. Softening it would have made it unfailable. |
| 5 | `and the two new ones are about the product, not the business` | **RE-POINTED** to the takings line, which survives twice. The platform-wide finished-jobs figure is on no tab, and `platform-admin/index.ts:430` still computes `totals.jobs_month` **for nobody** — a server field with no reader. Andrew's own cut, recorded rather than asserted back. |
| 6 | `10g · and the screen prints it either way` | **RE-POINTED.** `jobKeys.map(` became a map straight off `state.heartbeats`; `pa-quiet` became `pa-ok`. |
| 7 | `10h · a job that has never reported counts as stale` | **RE-POINTED.** `if (!beat) return true` became one expression. Null still falls on the bad side, which is the property. |
| 8 | `10i · in minutes and hours, not "today"` | **RE-POINTED** to `shortAgo()`. The unit claim survives; the plural guard did not — that half is defect 2 above, split out as `10i-ii` so one claim is not two. |
| 9 | `11f · a demo row is tagged in the list` | **RE-POINTED.** `pa-tag` became `pa-flag`. |
| 10 | `11g · and the headline says how many were left out` | **RE-POINTED.** The count moved out of the headline into one sentence under the list. |
| 11 | `11j · the promised total is printed only when it is over the ceiling` | **RE-POINTED.** The comparison was lifted into `overPromised`; both halves are asserted now. |
| 12 | `11k · the scroll only happens where the panel is not already beside the list` | **MERGED into one claim about the mechanism.** The open detailer is a `position: fixed` drawer at every width, so there is no scroll to get right and none in the file. |
| 13 | `11l · but a refresh after an action does not move him` | **MERGED into 11k** for the same reason. |
| 14 | `11m · the signed-out door names itself` | **RE-POINTED.** The heading became the ACTION ("Sign in") and the identity moved to the eyebrow above it, which is § SCREEN RULES' own shape. F-021's property is intact. |
| 15 | `12a · the list and the open business are a two-column split` | **RE-POINTED** to the drawer. F-015 was the open business a hundred rows down; a fixed overlay cannot be. |
| 16 | `12c · below 1024 the open business replaces the list` | **RE-POINTED** to `width: min(560px, 100%)` — full width below 560, so a phone still gets two levels. |
| 17 | `12d · and the split knows when something is open` | **RE-POINTED** to the drawer being mounted only when something is open. |
| 18 | `12e · with a way back that only exists where it means something` | **RE-POINTED, and STRENGTHENED to three ways back** — the ×, the scrim and Escape — because a drawer with only a scrim is a trap on a keyboard and one with only an × is a trap for a thumb. |
| 19 | `12f · the resting state says what the column is for` | **DELETED.** It guarded an empty half-screen reading as a failed load. There is no resting column to be empty. |
| 20 | `14c-ii` and `14c-iii` (the email cap line and its 80% trigger) | **RE-POINTED.** `state.email` became the local `mail`, and both now appear TWICE — an alert on Today when it matters, a Quotas row on Plumbing always. Both are asserted, because the alert alone is unreadable on a quiet day and the row alone tells nobody on a busy one. |

## 6c · `PA_MUT`, AND WHY IT HAD TO EXIST

**`docs/BAR.md` says break a check on purpose before believing it, and every
subject this suite reads lives in `app/src` — lane B's.** Editing those files to
prove a check can fail is a lane breach AND trap (f), a measurement taken while
somebody else is building.

So `read()` now honours `PA_MUT`, a JSON map of `path -> replacement path`.
Copy the real file to the scratchpad, break it there, point the suite at the
copy for one run. **Empty by default, so a normal run reads the real tree.**

**Seventeen of the twenty were baselined this way — seventeen breaks, seventeen
reds.** The other three are the deletions, which have nothing left to break. And
the three REAL defects were baselined the other way round: the fix applied to a
copy, all three green, suite 149 / 0 / 7. `blind-run --only platform-admin`
reports **0 checks green with the subject blanked**, so none of the new ones is
hollow.

## 6d · THE RULE THIS PASS ADDS TO § 5

**A REBUILD DOES NOT PRODUCE ONE KIND OF FAILURE, IT PRODUCES THREE, AND ONLY
ONE OF THEM IS A BUG.** Twenty checks named a spelling that changed. Three named
a property the rebuild genuinely lost. Seven named a module nobody calls any
more. **A triage that reports them as one number — "30 failures" — tells nobody
which pile to pick up**, and both earlier passes did exactly that.

**AND THE SPLIT IS NOT GUESSABLE FROM THE FAILURE TEXT.** `11i` and `11f` are
the same shape on the page — a word on a list row — and one is a defect and one
is a rename. The only way to tell was to open the screen and read what it says
now.
