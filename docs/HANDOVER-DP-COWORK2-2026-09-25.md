# Handover — DP Cowork2, 2026-09-25

**Written at the end of the sitting, before being cleared. Assume the session
that wrote this no longer exists.** Everything below is either committed or
stated here as the only record.

**Read § 6 first if you read nothing else.** It is what I got wrong, and it is
the part that does not survive a clear.

---

## 1 · WHERE THE TWENTY-FIVE DONE-WHENS STAND — all 25 addressed

**25 of 59 open items had no acceptance criteria at all.** An item with none
cannot be finished, only abandoned or argued about, and it gets picked up and
put down by session after session each deciding for itself what "done" meant.

| | |
|---|---|
| **Real criteria written** | **24** |
| **Marked needs-a-decision** | **1** |
| **Open items with nothing now** | **0** |

Commits: `2f6dfd8` (8), `494dfa6` (7), `84e6b7e` (9), then `c079e37` (the
execute-it pass).

**THE ONE PARKED, AND WHY.** **12.3 — optional deposit at booking.** Its whole
entry is one line: *"Optional deposit at booking. *A2 Part 8 item 2*"*. **The
missing piece is named in the entry:** who sets the deposit and in what form — a
percentage of the quote or a fixed amount, per business or per service — and what
happens to it on a cancellation. **Until that is answered there is nothing to
test.** A plausible-sounding criterion there would have had to be un-written
later, which is worse than none.

**WHAT MAKES THESE CRITERIA DIFFERENT FROM THE ONES THAT WERE THERE**, and it is
worth copying rather than re-deriving: **each names a SHAPE rather than a service
or a screen, so it survives us changing either.**
* **0.13** — failing is *a message that sends and leaves no delivery row.* That
  outlives Telnyx.
* **6.4** — the retry cases are read **off the rows, not the screen**, *because a
  screen showing one booking is exactly what two rows look like to the person who
  made them.*
* **9.14** — *a period with no costs entered reads as "costs not entered" rather
  than as profit.* The unknown-versus-known-empty fault written as an acceptance
  criterion instead of as a warning after the event.
* **0.3** — *a pass obtained on a tenant with no fixture rows is zero targets
  discovered, which is a failure and never a pass.*

**THREE RESOLVE TO ANDREW, not to a session:** 0.14's six-digit code (free, and
nothing else in that chain can start until it is entered), 0.7's answer to
`docs/what-we-send.md` § Question 3, and 0.4's two factual questions (which legal
entity trades as Detailing Platform; whether the export gets built or the promise
removed).

**ONE NEEDS NOBODY AT ALL AND IS THE CHEAPEST THING ON THE BOARD:** **9.11's first
clause** — `sweep-widths.mjs` has never been run against the fixed tree, so
`receipts/sweep-widths-1920-1440-392-360-320.json` still reads `"status": "fail"`
over a `git_sha` that is an **ancestor** of the fix. Anyone reading that receipt
without checking its sha reads a live failure that was repaired days ago.

---

## 2 · THE UNJUDGED TICKS — 23 of 76 judged, resume at `ROADMAP.md:3099`

`docs/ticked-without-proof-2026-09-25.md` is the whole of it. **Do not re-derive
the method; it is in § "The procedure for a later sitting".**

| | |
|---|---|
| `- [x]` items | **76** |
| **judged** (opened and read as a stranger) | **23** |
| **unjudged** | **53** |
| live gaps found so far | **1** (7.4) |
| ticks that should come off | **0** |

**RESUME AT `ROADMAP.md:3099`** — the 42px-preset-chip item, which 2.32 hands
off. Then 2.6, 2.8, 2.9, 2.10 in roadmap order. **Batches of ten, report per
batch, and a quiet batch is a result** — batch 1 was ten read, ten proved, no new
gaps, and that is worth recording rather than apologising for.

**THE HEADLINE OF THAT FILE IS THAT THE AUDIT CANNOT BE DONE BY PATTERN**, and
that paragraph will save the next person an afternoon. Four scans were tried;
each produced mostly false positives, in **both** directions. **Every entry
opened by hand turned out well-evidenced.** Keep that paragraph.

**ALSO IN THAT FILE, and it must not be read as a clean bill:** *unjudged is not
a synonym for fine.* 53 items nobody has read as a stranger is a real number. The
two faults that started the pass — 2.5 ticked-in-fact for three days, 2.15's
proof recorded nowhere — **were both found by picking an item up, not by any
audit.**

**Its appendix carries a separate finding nobody has picked up:** three distinct
faults in acceptance criteria, of which one (a done-when naming a check that
cannot fail) was fixed in 2.12, and **25 with none** — now closed by § 1 above.

---

## 3 · `platform-admins-declared` — THE RED HAS CLEARED, AND THE RULE STANDS

**The manager's closing instruction said to leave that check red until DP Cowork
cleared its temporary row. IT HAS CLEARED — verified, not assumed, at the end of
this sitting.**

`public.platform_admins` holds **exactly two rows** again —
`demo@demo.com` (2026-09-07) and `demo@detailplatform.com` (2026-09-20) — read
off `kguqylyzgyzfktkfnhjb` after 6.2a finished. `shoot-admin@detailplatform.com`,
created 03:48 by `scripts/shoot-admin.mjs`, is gone. **The check is
18 passed / 0 failed.**

**THE RULE THAT OUTLIVES THE RED, AND IT IS THE POINT:**

> **If that check ever goes red on an undeclared row, DO NOT SILENCE IT BY
> DECLARING THE ROW.** A check that absorbs whatever it finds is the thing this
> whole night was spent removing.

The declaration is `docs/platform-admins.md` and **it is read by the check, never
the reverse** — a check that derives its expectation from the thing it is checking
agrees with whatever it finds, including a row somebody added at three in the
morning. Adding a row to the table means adding a line to that file **in the same
change**, with a reason and a removal condition.

**It earned its keep on its first day**: forty minutes after being written it
caught a third full-platform admin appearing from a script, with nobody deciding
anything. That is the case for it, and no sabotage could have made it.

**STILL OPEN AND NOT URGENT:** `platform_admins.note` on the master login holds
that account's password **in plain text**. It is in no repo file — the credential
scanner confirms that — but anything with service access reads the column. **It
was deliberately NOT deleted:** `docs/standing-work.md` § 1 makes that exact
account the standing example of a tidy-up that *"locks him out of his own back
office"*, and nothing readable here says whether Andrew holds the value anywhere
else. **NEEDS ANDREW**, and ROADMAP 12.4 retires the question at the first real
signup anyway.

---

## 4 · WHAT ELSE LANDED TONIGHT, in one line each

* **Credentials out of markdown** — 8 files, 25 occurrences, **4 distinct
  credentials, 0 left**, and `tests/no-credentials-in-markdown.test.mjs` on
  `CLAUDE.md`'s before-you-finish list so the rule stops being optional. **161
  files, ~126k lines, 6 shape rules, 0 findings.**
* **14.14 closed** — the endpoint was right, the test's list was stale, and the
  list now declares **why** it is 32 long (26 + 3 + 3) so a 33rd field cannot
  arrive quietly.
* **The stale-blocker pass** — 23 blockers read, **10 had expired**, four of them
  naming a deploy freeze lifted three days earlier.
* **Andrew's publishing ruling** — publishing is a **deferral he chose**, not a
  blocker. Twelve entries reframed to *done and correct on disk, switched off
  until launch*. **What did not change:** `deployed-inventory` going red is still
  true and still worth knowing; it stops being urgent, not real.
* **8.6 closed** — `docs/testing/phones-we-do-not-own.md`, with a recommendation
  and an **eighteen-step** walk. 2.15 and 8.2 both close on those twenty minutes.
* **3.4's rendering half** — 64 documents read, 3 faults, and the reschedule
  email now says **"Was"** in words instead of relying on a strikethrough that
  `htmlToText` deletes.
* **gotchas 81–87** — seven new entries; `CLAUDE.md`'s count moved 80 → 87 and was
  corrected in the same edit each time.

---

## 5 · THINGS I KNOW THAT ARE NOT IN A FILE

1. **`i18n-survey.mjs` cannot close anything, and that is correct behaviour.** It
   has a real failure path — `I18N_SURVEY_CANARY=1` exits 1 — **but the guard is
   on FILES SCANNED, not findings.** Floor 50, walks 111, reports **128 candidate
   strings and exits 0**. So it tells you it ran; it cannot tell you the work is
   done. **2.12's done-when named it as the gate and now names
   `tests/spanish.test.mjs`, which is red today on six failures that are 2.12's
   own subject.** Do not "fix" the survey — the job it was given was wrong, not
   the script.
2. **Shell heredocs in this environment mangle regex escapes.** Writing
   `\\b` through a heredoc produced **literal backspace characters (0x08)** in a
   test's source — invisible in any editor, and the exact bug `DECISIONS.md`
   records from 2026-09-03. **Write the script to a file and run it**, and check
   the bytes afterwards. It cost me two rounds.
3. **`process.exit()` races a closing `fetch` on this machine.** A test printed
   `18 passed, 0 failed` and exited **127**, aborting inside libuv. **Use
   `process.exitCode`.** A green body with a red exit code is a failure to every
   runner and a pass to every person.
4. **A resolution can sit ABOVE the text it resolves.** This file prepends the
   tick and keeps the original body below it, so reading *forward* from a
   worrying sentence is not enough. **The only reliable read is the whole
   entry.**
5. **DP Cowork's clock has rolled past midnight** — `FOR-ANDREW.md:186` reads
   *"written down 2026-09-25"*. Left alone; it is theirs.

---

## 6 · WHAT I GOT WRONG TONIGHT — read this part

**Six times a claim of mine was coarser than the thing it described, and every
one was caught by re-reading rather than by a tool.** The manager counted four;
it is six. They are listed because the pattern is the most useful thing I learned
and it will not survive a clear.

1. **I read a gap sentence and not the paragraph answering it forty lines
   below.** I listed **2.1c** as carrying a live unpressed gap. Its own entry, in
   a paragraph headed *"PRESSED IN FULL AND TICKED"*, records the two-car case
   pressed at **320/390/768/1440**, both languages, console clean, with the
   Spanish string `2.º vehículo · Small` and the bar at `$160`. **The automated
   pass had classified it resolved and I overrode it by hand** — in a document
   whose own headline says a scan cannot tell a paragraph from its own
   correction.
2. **"exits 0 unconditionally" was wrong** about `i18n-survey.mjs`. It has
   `process.exit(1)`; the guard is on files scanned. The finding survived and got
   sharper, but the sentence I reported upward was false.
3. **Three of four "live gaps" my scan found were false positives** — a sentence
   describing the *fault*, a **UI label that literally reads "NOT SEEN IN 3
   MONTHS"**, and my own item-boundary bug swallowing a different open item's
   heading. **And it missed both real ones.** The label case is the same mistake
   as flagging the word "Blocked" on a calendar day cell an hour earlier.
4. **I was one step from handing over four false accusations.** My first
   ticked-item scan flagged 16 entries as weak. I opened four; **all four were
   well-evidenced.** The scan had missed pixel clearances (`56px clear at 320`),
   quoted UI strings and a 1,103-row data file because none matched a regex.
5. **My fold dropped the one clause that made a ruling a ruling.** 9.7's
   correction landed carrying *who* withdrew the instruction and *what* the
   withdrawal was, and **not *why*** — *"the convention here is that Andrew
   presses the visual ones himself"*. The manager grepped for that phrase and did
   not find it. **The ruling survived; the thing that made it a ruling did not.**
6. **My sweep missed two while I was writing the paragraph explaining why nobody
   else should.** Having written that *one grep for `deploy freeze` would have
   found all five*, I corrected them item by item and a re-grep found a **second**
   freeze sentence inside 4.3 and a *"when the freeze lifts"* in 11.1, a ticked
   item. Now `docs/gotchas.md` 86.

**AND THE WORST ONE, WHICH IS NOT IN THAT LIST BECAUSE IT WOULD HAVE COST SOMEBODY
ELSE THE TIME RATHER THAN ME.** In 2.15's done-when I wrote that the phone walk's
*"steps 4–6 are exactly these two fields."* **Steps 4–6 covered the address field.
The walk did not cover the name/phone/email step at all** — I grepped and found
nothing. **Andrew could have followed all twenty minutes and 2.15 would have
stayed exactly where it started.** A step was added (now § 5 step 7) and the walk
renumbered 17 → 18 — **which immediately falsified the "seventeen numbered steps"
I had written into 8.2's criterion an hour earlier.** Fixing one fact broke
another in the same document.

> **The move that caught all seven: after writing a claim, go and check the thing
> it describes. Not "is it well written" — could I execute it right now without
> asking anybody what it meant.** Five of twenty-five criteria failed that
> question, three of them facts I had written an hour before and felt good about.

---

## 7 · CONSTRAINTS I WORKED UNDER, so nobody assumes something was tried

No `app/src`, no `scripts/` edits, no `supabase/migrations`, no browser, no dev
server, no push, no publish, no deploy. **One exception, granted and spent:** a
two-file `scripts/` grant on 2026-09-24 for `dashboard-notifies.mjs` and
`edge-tenant-replay.mjs`, scoped to that sitting. `scripts/` is closed again and
**is not precedent** — `DECISIONS.md` § *"The `scripts/` freeze in 14.20 was a
moment, not a policy"*.

No credential was written into any file, including the check and its fixtures.
Read-only database and Management API work only, always against
`kguqylyzgyzfktkfnhjb`, ref confirmed before the first query each time.

**The tree at the end:** my work is all committed. What is dirty is not mine —
`app/src/book/BookingPage.jsx`, `scripts/bk-bar-clearance.mjs`,
`docs/BATCHES.md`, untracked `docs/MANAGER-2026-09-22-evening.md`, and 11
receipts that were dirty before I started or were rewritten by gates I ran and
deliberately not committed.
