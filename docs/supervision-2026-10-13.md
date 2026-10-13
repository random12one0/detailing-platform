# Supervision 2026-10-13 — tenth pass

Audited main at `bf08d943`, since supervision `5a37198c`. The belt's six
completed dispatches produced one new tick on main, 0.11ca. Practice branches
were not merged. 14.24's attempted tick was also not merged. The preview and
audit-history branches were held. The starting queue was 61 open / 181 done:
`node --input-type=module -e "import fs from 'node:fs'; import {tally} from '../belt/lib.mjs'; console.log(tally(fs.readFileSync('ROADMAP.md','utf8')))"`
at `bf08d943`. An initial supervision scratch regex counted nested boxes and
missed heading-numbered items; that number was discarded before publication.

## What I reproduced

**0.11ca:** read the actual landed script diff, then ran
`node scripts/bucket-cors.mjs` on main at `bf08d943`: 76 of 76 targets,
no failures, nonexistent-bucket canary caught. Actual Cloudflare preflights
permit each prescribed origin and refuse strangers, lookalikes, wrong port
and DELETE. Real Chromium at 1440x900 and 392x844 passed localhost's preflight
and blocked evil.example's preflight. The subsequent unsigned PUT is refused
as expected; it is not proof of an authenticated upload. I read the console
artifact: only the expected CORS/ERR_FAILED lines. `--break=foreign-allowed`
produced nine named failures. Both receipts remain historical evidence pinned
to `bf08d943`. The separate secret-presence criterion is the name-only result
in `receipts/photo-release-order.json` at `8b4ab85e`; no fresh credentialed
secret inventory was run. Corrected the entry's arithmetic: 64 preflights
includes the 22 refused cases, rather than implying another 22.

**99.5:** although closed before this interval, this was the consequential
visual claim in the practice alert. Main's layout diff is the original
`e7749485`/`0309136b` work, not the failed Muse branch. Set
`$env:BASE='http://localhost:5173'`, then run `node scripts/booking-consent.mjs`:
76 of 76 targets completed, 1009 assertions, no failures, canary caught at
`bf08d943`. The script pressed incomplete input, unchecked/checked/uncheck,
keyboard selection, failed consent save and retry in English and Spanish;
all external business/delivery responses were local stand-ins. No live booking
or message was created. `--break=half` reproduced the narrow-column defect:
36 named layout failures. Only the section-16 test commit `000a24e4` landed
during that sabotage; it changed neither booking code nor this instrument.
The receipt records both SHAs and the movement is not concealed.

I opened the new screenshots at 390x844, 392x844, 768x1024 and 1440x900,
including Spanish and the save refusal. See
`receipts/supervision-2026-10-13/consent-*.jpg`. Against DESIGN.md and its
design-system reference: Archivo/JetBrains typography, dark layered ground,
green accent, ruled layout, labels and fields inside the viewport. Desktop
consent uses the whole form, with links beside its two English / three Spanish
lines; phone consent sits between Phone and Email with readable links beneath.
The save-refusal message is visible above the fixed bar and offers retry.
Consoles were silent except the expected injected 500 in save-failure cases.
The known pre-interaction screenshot-state problem is still 99.11, not another
new issue. Both checked closures remain checked.

**0.11bd (still open):** read the handler/adapter and actual landed diff.
`node scripts/media-cache-delete.mjs` at `bf08d943` passed 13 of 13 scenario
groups. `--break=no-purge` failed seven, including a successful deletion
response over a warmed URL still serving 200 HIT. Wrong-business and
unauthenticated removals are refused; failed purge does not confirm deletion;
retry handles an already-absent origin. These are local handler responses,
not Cloudflare publication proof. Read the live receipt itself: 4 of 4
completed, two cached-URL failures, so the box correctly stays open. I did not
repeat the credentialed upload/delete run. Gallery.jsx remove() only deletes
its row. That documented limitation now has executable work of its own, 0.11be.

## Held check edits

**4.3:** reviewed the full security diff at `8b8f033d`. Created a throwaway
checkout with `git worktree add --detach .tmp-supervision-held 8b8f033d`.
Read both test files before executing them. From that checkout,
`node tests/support-sessions-edge.test.mjs` passed 22 of 22 function targets;
`$env:BREAK='unlogged-unlock'` with the same command failed the named missing
audit-row assertion. The new code logs before flipping and refuses a revoked
opener or failed marker read. No real session token was used.

For SQL, use the existing local package:
`$env:PGLITE_DIR='C:/Users/rando/AppData/Local/Temp/pglite'` and
`$env:PGLITE_REQUIRED='1'`, with BREAK cleared; run
`node tests/support-sessions-sql.test.mjs`. Real local PostgreSQL passed
24 of 24 write-path/session targets; the owner and unlocked preview write,
locked support is refused, re-lock refuses again, and marker edits are denied.
`$env:BREAK='ignore-working'` made that same test fail its unlocked-write
assertions. Both runs stayed local. Raw output is saved under
`receipts/supervision-2026-10-13/support-*.txt`. The added Google-table coverage
and cumulative-migration scan are fair; no revert. The product branch remains
separate: its added client refusal messages lack Spanish lookup keys/calls.
4.3e now owns adopting that work and verifying translated browser refusals.

**4.3b:** the held diff at `f2710c0e` retargets old AdminPage wording to the
current DetailerPanel. I checked the current historyOf and loading markup and
applied only that small test repair to main in `000a24e4`. The original query
still requires the name arm's business_id to be null. Section 16 now passes
all eleven assertions, including missing-name-arm, widened-name-arm and
missing-unknown-action canaries. Full suite command:
`node tests/platform-admin.test.mjs`. Before at `bf08d943`: 134 passed,
50 failed, seven skipped. After at `000a24e4`: 137 passed, 48 failed,
seven skipped. Complete outputs are retained, not described as a green suite.
The old three-failure sentence was stale. Existing 99.3b-ii part 2 already owns
the broader repair; its platform-admin remainder is split into top-level 98.4
and the original entry points there. The held-review owner question is removed
from 4.3b, but its existing AWAITS PUBLISH remains.

**Muse 2.1:** read the actual practice diff. The cross-file collision count
14 to 13 follows closing 2.1, and preserves the parser/discovery/canary rules.
It is a fair declared-count update, already documented in that test's header.
It is not a main-tree change and the branch remains unmerged. The earlier
99.5 practice-review problem does not require unticking main's separately
proved implementation.

## Belt and limits

Changed only the supervision-trigger wording in belt.mjs to "item runs
completed", because the counter increments after progress and held verdicts
too. Counter, cadence and picking/model logic are unchanged; `node --check
../belt/belt.mjs` passes. Added one taskTemplate instruction requiring a
numbered follow-up for an out-of-scope product defect, based on the buried
Gallery removal gap. No routing, gate, blockedBy or modelStyles setting moved.
The broad previous proposal diffs remain proposals.

Six credential-free suites ran with the exact combined command:
`node --test tests/composition.test.mjs tests/design-contrast.test.mjs tests/landing-pricing.test.mjs tests/route-contract.test.mjs tests/no-credentials-in-tracked-text.test.mjs tests/every-open-item-is-citable.test.mjs`.
At `000a24e4` with these documentation edits: eleven tests passed, no failures.
`node scripts/decisions-index.mjs` passed after the index/entry edit.
`node --test tests/figures-carry-their-command.test.mjs` remains red for six
existing bare figures in unchanged docs/silences.md; saved output names them.
No declaration was raised to silence that check. No authenticated inventory
or live migration check ran: this supervision never handled a credential.
Historical receipt grading is saved in historical-grades.json, explicitly
pinned to each tested revision; it does not certify an arbitrary later HEAD.

No push, publish, deployment, paid call, live database write or structural
change. reference/ and existing migrations were untouched.
