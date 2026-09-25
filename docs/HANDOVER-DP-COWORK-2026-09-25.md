# Handover — DP Cowork, lane A, the night of 2026-09-24/25

**Read this if you are picking up `app/src`, `scripts/`, or `FOR-ANDREW.md`.**
Short on purpose. Two of the three things below are deferred decisions that
would otherwise live only in a chat window, which is what
`docs/MANAGER-CLOSE-2026-09-21.md` exists to stop happening again.

---

## WHAT SHIPPED

**The unnumbered Wave-14 weather item — `0a47faf`.** A refused
`address-suggest` lookup is now remembered for five minutes in `localStorage`,
so browsing job records costs **one** call instead of one per record, and the
record prints a plain sentence where the weather strip used to vanish.
`scripts/job-weather-budget.mjs` is the check: 7 targets, 14 assertions, five
widths, three `--break=` sabotages, two canaries.

**ROADMAP 2.5 — `618141a`.** Ticked after **verifying, not building**. See the
next section.

**`FOR-ANDREW.md`'s publish block — `618141a`.** The real command, finally.

---

## THE THREE THINGS THAT ARE NOT IN ANY OTHER FILE

### 1 · DO NOT REWRITE THE PUBLISH BLOCK'S FIVE-POINT ORDER TONIGHT — and it IS wrong

**The finding stands and the fix is deferred on purpose.** `FOR-ANDREW.md`'s
numbered publishing order ("1. already live … 5. everything else") was written
on **2026-09-20** against a measurement of **22 of 39** out-of-date programs.
It lists the payment webhook as job **3** and the "report a problem" form as
job **4**. Measured **2026-09-25 02:54**, the count is **24 of 39** and the
membership has moved twice since that list was typed.

**It should be derived from `deployed-inventory.mjs` the same way the command
now is, with the risk grouping applied to whatever the check prints.**

**The manager's ruling, 2026-09-25, and it is the reason this is a note rather
than an edit:** *"Andrew has that block in front of him right now and a block
being edited while he reads it is worse than a block with a stale ordering
paragraph in it."* The block already carries a paragraph saying the numbered
order is not current and that the check is. **That is enough for tonight.**

**Do it when Andrew is not mid-read.** It is a `FOR-ANDREW.md`-only change.

### 2 · ROADMAP 0.3's TITLE IS STALE AND THE RULING IS BINDING — make this edit when `ROADMAP.md` is free

0.3's title still reads **"Awaiting Andrew's yes."** He has ruled, and the
ruling is binding:

> **Flag the test detailers. Do not delete them.**

**The reason is not sentiment, it is that about sixty checks sign into those
fixtures, and a check that cannot run looks exactly like one that passed.**
Deleting them would convert the whole verification battery into silence of the
most expensive kind this repo has.

**So "awaiting" should come out and the ruling should be written in its
place.** This session did not make that edit because it had been asked to
release `ROADMAP.md` and a second dirty window on a shared prose file is the
shape that lost the 9.7 correction earlier the same night.

**And the half that is already built must not be redone.** 0.3 records it
plainly: `businesses.is_demo` exists, `platform-admin` reads it, the platform
screen renders a `demo` flag and strips those rows from every count it
computes. **That is the back-office half and it is done.**

**What is open is the CLIENT-LIST side**, which is ROADMAP 1.3: there is no
`is_test` or equivalent anywhere on the customer or booking side, so a
detailer's own Clients screen has no flag, no badge and no default-to-real
filter — which is why "Smoke TPMOY" with a broken phone number sits in the
list, and why the "gone quiet" count counts fixtures.

### 3 · A LIST OF NAMES WENT STALE INSIDE THE HOUR IT WAS WRITTEN, AND THAT IS WHY THE COMMAND DERIVES ITS OWN

The first draft of the publish block named **13** programs and said the payment
webhook needed nothing. Both were true at **02:24** and both were **wrong by
02:54**: commit `6ebb435` changed two `_shared` files and the count went
**13 → 24, with `stripe-webhook` now among them.**

**The command in `FOR-ANDREW.md` therefore names no names.** It reads what
`deployed-inventory.mjs` just wrote and filters out `stripe-webhook`, which
goes last and alone. Tested to 23 valid names; nothing was deployed.

**Keep that paragraph if you rewrite the block.** It is the argument for the
shape, made by the failure happening to the person writing it.

---

## THE ONE FACT WORTH MORE THAN TONIGHT'S CODE

**There is NO `supabase` binary on this machine.** Not on the PATH, not in
`node_modules`, not installed by scoop or winget — checked in Git Bash and in
PowerShell. So **every instruction ever written for Andrew beginning
`supabase functions deploy` was wrong for his computer**, and the question of
whether that command has an `--exclude` flag never arises.

**This repo publishes with `node scripts/deploy-functions.mjs <names…>`**, over
the Supabase Management API, from the repo root with `.env` loaded. Both that
script and `scripts/deployed-inventory.mjs` were confirmed present on disk.

---

## THE CHECKS I LEFT BEHIND

| check | state | why |
|---|---|---|
| `job-weather-budget.mjs` | **PASS** 7/7, 14 assertions | new tonight; 3 sabotages, 2 canaries |
| `example-ctas.mjs` | **PASS** 51/51 controls, 477 assertions | 2.5; 8 `--break=` switches, all now in its header |
| `deployed-inventory.mjs` | **RED**, 24 of 39 | **Correct and expected.** `docs/gotchas.md` 85: the number rises when work is done and falls only when Andrew publishes. **Do not deploy to clear it** |
| `label-guard.mjs` | **PASS** 45/45 | after the one new string |
| `american-english.mjs` | **PASS** 11/11 pages | |
| `contrast-insitu.mjs` | **PASS** 56/56 | |

**Dirty and NOT mine to commit:** `docs/BATCHES.md`, `receipts/db-audit.json`,
`receipts/migration-drift.json`, `receipts/receipt-fields.json`,
`receipts/render-emails.json`, and `docs/MANAGER-2026-09-22-evening.md`
(untracked). **Dirty and mine, left deliberately:**
`receipts/american-english*.json`, `receipts/contrast-insitu.json`,
`receipts/label-guard.json` — regenerated by running the gates, regenerable
again, and not worth committing over another session's runs.

---

## THE SHAPE OF TONIGHT'S TWO REAL FAULTS, AND THEY WERE THE SAME ONE

> **A document went on describing a state that had stopped being true, and
> nothing anywhere said so.**

ROADMAP 2.5 said its check had had *"nothing added to it"* — three days after a
commit whose subject line says it added exactly that. My own publish list said
13 programs — thirty minutes after it had become 24. Neither errored. Neither
looked stale. **Both read as answers.**

The defence is the same in both directions: **derive the number from the thing
that measures it, and when you must write one down, write the time you measured
it beside it.**
