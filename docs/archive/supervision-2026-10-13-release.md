# Supervision — 2026-10-13, release interval

Baseline: `aa4a69fb`. Read CLAUDE.md, DESIGN.md and its design-system pointer,
gotchas, the decisions index, belt/log.md and belt/state.json. RTK.md is absent
from this workspace. State's last supervision is 2026-10-13T10:25:50.911Z.
`git log --oneline 008204e4..aa4a69fb` and the actual diffs show one closure in
the latest six runs: 0.11cb. Other landed items remain open. To get a second
consequential closure, rechecked the adjacent earlier 0.11ca, then 9.1c's local
preview work. Recount at baseline: 66 open / 182 done; after adding completed
98.7, open 98.8 and completed 98.9: 67 open / 184 done. Command for either tree:
`node -e "const t=require('fs').readFileSync('ROADMAP.md','utf8'); console.log({open:(t.match(/^- \[ \]/gm)||[]).length,done:(t.match(/^- \[x\]/gm)||[]).length})"`.

## Reproduced, with limits

- **0.11ca stays ticked.** At `aa4a69fb`, `node scripts/bucket-cors.mjs
  --break=foreign-allowed` caught nine named foreign-origin failures; then
  `node scripts/bucket-cors.mjs` passed 76 of 76 targets, 77 assertions.
  Chromium at 1440 and 392 distinguished allowed preflights from refused
  foreign preflights. The expected unsigned-PUT refusals do not prove an
  authenticated upload. Raw outputs: `receipts/supervisor-bucket-cors-{break,clean}.txt`.
  Secret presence was rechecked by name only in the release-order run.
- **0.11cb stays ticked.** Confirmed project `kguqylyzgyzfktkfnhjb` and its
  matching Supabase hostname before requests. At `e58b0dc7`,
  `node scripts/photo-door-deployed.mjs --base=https://media.detailingplatform.com`
  passed six of six rules and caught all eleven planted defects. Live response:
  owner start 200, foreign business 401, foreign key removal 404, no login 401.
  No object uploaded or customer row changed. Its `--break=accept-stranger`
  run failed because two stranger canaries went unnoticed, as intended.
  `node scripts/photo-release-order.mjs` passed ten of ten rules with bucket
  CORS explicitly unjudgeable here and covered above; `--break=door-public`
  failed the JWT rule. `node scripts/photo-cron-live.mjs` at `aa4a69fb`
  passed three of three targets: active anonymous HTTP cron, 10 GB setting,
  recent unseeded heartbeat with all five numeric drift counters. Its
  `--break=no-timeout` caught the cron defect. This proves release capability,
  not that every deployed bundle is current.
- **9.1c remains open for publish.** Built with `npm run build --prefix app`.
  At `aa4a69fb`, `node scripts/preview-frame-headers.mjs --break=blanket-allow`
  caught four dashboard/admin framing failures; clean run passed seven of
  seven targets, sixteen assertions. Both preview widths rendered with no
  console warning/error. Own-origin and stranger framing of /app and /admin
  were refused; stranger framing of booking was refused; the unprotected-path
  canary rendered. This models Netlify headers locally, not Netlify itself.
  At `e58b0dc7`, `node scripts/supervision-preview-2026-10-13.mjs` drove the
  actual localhost:5173 Business screen: preview populated; clicked Open it;
  empty services refused; selected Express Wash advanced to Add-ons. Four of
  four widths, twenty assertions, quiet console at 1440x900, 768x1024,
  390x844 and 392x844. No booking submitted. Also ran
  `node ../belt/tools/check-page.mjs /app/business --sizes 1440x900,392x844 --json`:
  no sideways overflow, accessibility failures or console errors.

Opened each current screenshot under
`.manager-shots/supervision-2026-10-13-release/business-{1440,768,390,392}.png`,
and the built-header preview shots under `.manager-shots/9.1c/`. Compared with
DESIGN.md's adopted system: continuous dark ground and atmosphere remain;
Archivo headings and monospaced prices remain; the tenant's blue accent is
consistent; service cards are choices, settings are ruled lists; text stays
within the preview's edges at all four widths. The tall inert preview scrolls
with Business. No page styling was changed. Screenshots are local files;
the committed driver and JSON receipt identify exactly how to retake them.

## Evidence correction and held work

**98.7 fixed at `e58b0dc7`.** Read the 0.11cb writer diff: it separates
`broken_on_purpose` JSON, but both release-order and door-deployed continued
overwriting the text artifact shared by clean and sabotage runs. Directly
opened both JSON-linked files after the clean run: they described clean runs
instead of their red receipts. Corrected only each script's artifact path.
Reran the named sabotages, then clean at that committed code; each sabotage
now retains its named failures in its own TXT/LOG. Both clean receipts pass,
and their artifact paths are disjoint from the sabotage receipts. Full
outputs are `receipts/supervisor-{release,door}-{break,clean}.txt`.

**6.1b remains held; repair 98.8.** Read `git diff 7e95dec9..0cdab2bc` including
the whole new restore script, fixture, and test edit. The test adds an accepted
nightly receipt type and a refused fixture; existing refusals remain.
Detached review checkout: `git worktree add --detach .tmp-supervision-6.1b 0cdab2bc`.
From there, `node --test tests/restore-date.test.mjs` passes all eleven tests.
`node scripts/restore-nightly.mjs --fixture` restores eight of eight tables
and refuses the date. `--fixture --break=lose-table` names missing booking
rows and refuses the date. Output is retained as `supervisor-restore-*.txt`.
These runs create only throwaway local Postgres clusters and delete them.

The sharper test: retain the invented fixture's generated dump before
teardown, without changing its restore/validation logic. Temporarily add
`writeFileSync(join(REPO, "fixture-proof.pgc"), readFileSync(dumpFile));`
after `project = "fixture";`, verify that diff, run `--fixture`, remove that
single added statement, and confirm the script has no diff. Then run the
unmodified held script: `node scripts/restore-nightly.mjs --dump=fixture-proof.pgc`.
It restores eight of eight and says **restore PROVED**; the absent environment
alone prevents the heartbeat write. `receipts/supervision-2026-10-13-release/restore-untrusted-dump.json`
records the platform project for this invented input. Its round trip is true;
its nightly provenance is false. The fake dump is retained locally at
`.manager-shots/supervision-2026-10-13-release/fixture-proof.pgc`; no secret or
actual backup was opened. All per-table values in this fixture are invented.
The branch stays separate. 98.8 must repair provenance and the harness's shared
report artifact before adoption; the actual encrypted nightly still needs 6.1a.
The detached checkout is retained for that repair; its source matches the held
commit, with only generated proof receipts and the invented dump changed. Raw
receipt snapshots live under `receipts/supervision-2026-10-13-release/`; their
artifact paths refer to that detached checkout. They record the flawed harness's
answer and are not a claim that the nightly is proved. The ordinary supervisor
preview-flow receipt is separately graded.

Earlier alerts are not main-tree regressions: 2.1's declared citable count and
4.3b's retarget were adjudicated by the prior audit. The gallery test is a new
test with positive own-key and negative foreign-key cases, not weakened prior
assertions. The 4.3c diffs add unlock/expiry cases and apply later migrations to
the same local SQL fixture; cumulative policy coverage has a canary. They stay
unmerged and their integration remains 4.3e. The 99.5 practice-review alert was
already adjudicated against separately proved main code; it is not reopened.

## Belt and remaining release checks

Edited only belt.config.json taskTemplate: after clean and sabotage, open each
artifact each receipt names and ensure it still describes that run. The edit
is backed by the overwritten logs above. No routing, gates, blockedBy, cadence,
modelStyles, picking or model logic changed. No reasoning self-check is needed
for a prompt-only edit. The new instruction occurs exactly once in the parsed
configuration. Belt/log.md gets the observation and edit in one line.
Grading the selected clean receipts after `eaee66e9` reports STALE with every
rule passed: they are dated proofs at the commits above, not release verdicts
about later trees. No application source changed during this supervision.

Six required credential-free test files and decisions-index pass; complete
output: `receipts/supervisor-standard-gates.txt`. Figures check initially
claimed valid revisions were absent because this shell could not spawn bash.
Direct `git rev-parse --verify d850a97` and `3398470` both resolved. Correct
invocation: `$env:Path='C:\Program Files\Git\bin;' + $env:Path; node --test
tests/figures-carry-their-command.test.mjs` passes, including its injected
canary; both outputs are retained. Do not edit historical figures to fit the
first run's false report. Fixed at `eaee66e9`: a missing bash now produces
NOT MEASURED before scanning; the same file with bash on PATH passes all nine
tests, including its canary. Existing assertions and debt declarations remain.
98.9 and gotchas 131 carry this correction.

Broad read-only release outputs: `receipts/supervisor-inventory.txt` and
`receipts/supervisor-migration-drift.txt`, plus their ordinary JSON receipts.
Their release backlog is already owned by 98.2/98.3 and the unpublished items.
At `e58b0dc7`, `node scripts/deployed-inventory.mjs` discovers 42 of 42 and
compares 41 of 42, with Google Business unpublished and changed bundles named.
`node scripts/migration-drift.mjs` discovers 361 of 378 declared targets,
completes all 378 comparisons and names the absent receipt-attempt ledger and
other unapplied work. Both built-in canaries are caught. These are failures,
not passes. They are not waived and this audit does not certify a release. Nothing pushed,
published, deployed, paid, or changed in live database structure.
