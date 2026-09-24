# Handover — DP Cowork2, night of 2026-09-23 → 24

Written at the end of the session, before stopping. **Read the three "not in
a file" items at the bottom; everything above them is recoverable from git.**

---

## What I was on

**ROADMAP 14.19 — a two-car booking's stored `subtotal` counted the second car
twice — and then its root cause.** All of it is committed and green.

| commit | what |
|---|---|
| `7ef348c` | 14.19 fixed. One line in `_shared/pricing.ts`, plus `tests/quoted-lines-true.test.mjs` |
| `183ee00` | The carload email fixture computed instead of typed |
| `43540ab` | 14.20 rewritten after I got it wrong |
| `2b0c634` | The base and plan fixtures computed too |
| `74a4d6e` | 6.2 — Andrew's vault key verified, all four probes live |
| `7c2feea` | Tonight's seven manager decisions |

---

## What is uncommitted

**Nothing of mine.** My working tree is clean apart from things that were
already dirty when I started or belong to the other session:

- `receipts/american-english*.json`, `db-audit.json`, `deployed-inventory.json`,
  `label-guard.json`, `migration-drift.json`, `receipt-fields.json` — **dirty
  before I started.** Some were rewritten by gates I ran. **I deliberately did
  not commit any of them**, because they were already modified and committing
  would have swept up whatever the other session left in them. `render-emails.json`
  was clean at session start, so that one I did commit, with its own run.
- `docs/4.1-findings-2026-09-23.md`, `docs/8.3-findings-2026-09-23.md`,
  `docs/MANAGER-2026-09-22-evening.md` — untracked, **not mine.**

---

## The state of the item

**14.19 is fixed, proven, and NOT LIVE.** `deployed-inventory.mjs` reports
**13 of 39** functions behind this checkout, and `create-booking`,
`calculate-booking`, `preview-emails` and `get-booking-receipt` are all four on
the list. The fix reaches nobody until publishing happens, which is Andrew's.

**The new check is `tests/quoted-lines-true.test.mjs`** — credential-free, 14
tests, no dev server. It renders the real customer confirmation and asks
whether each line is **true**, not whether the column adds up. Broken on
purpose twice before it was believed.

---

## THREE THINGS I KNOW THAT ARE NOT IN ANY FILE

### 1 · `render-emails.mjs` reports PASS on a money fault. By design, and it will fool somebody.

Its money tie-out asks whether the lines reach the total. **`reconcile()` in
`_shared/emailKit.ts` guarantees they always do** — it invents a closing line
for any gap it finds. So a wrong `subtotal` produces a wrong service line *and*
a fabricated "Discount applied", and the column balances perfectly.

**I measured this twice tonight.** With 14.19 put back, and with a different
fault injected into the site discount, `render-emails.mjs` printed zero
failures both times while the page in front of it showed nonsense.

**The page shows the fault. The script does not fail on it.** It is in the
roadmap now, but the next person will run the script, see PASS, and stop.

### 2 · `failing: []` from `probe_live_site()` is not a clean bill of health.

`fail_after` is 2, so **a probe that failed once is absent from that array.**
The same "one failure says nothing" rule that makes the monitor trustworthy is
what stops its headline reporting a first failure.

**Read `consecutive_failures` per probe and the response bodies.** I nearly
wrote "all four green" off the ping alone.

### 3 · The two sabotage habits that actually caught things tonight.

Both are in CLAUDE.md as rules. Here is what they were worth in practice:

- **Breaking a check before trusting it** caught that my own first version of
  `quoted-lines-true` was summing the total row in with the lines, and
  reported every scenario broken by exactly double. A check that fails
  everywhere is as useless as one that passes everywhere.
- **Sizing a prose deletion before writing it** — I checked row arithmetic on
  `FOR-ANDREW.md` (open 29 → 23, done 21 → 28) after closing six rows and
  adding one. It balanced, which is the only reason I know nothing was
  swallowed.

---

## Two things left deliberately undone

**`tests/mail-sink.test.mjs` is RED and I did not fix it.** It is **ROADMAP
14.20**, rewritten tonight after I reported it wrong twice. The short version:
it flags 40 addresses of which **at least 39 cost nothing** — 25 are the demo
sign-in (`mailer_autoconfirm` is on, so a fixture login sends nothing) and 14
are addresses written inside comments. **The defect is in the guard**, which
scans raw source line by line, strips no comments, and cannot tell a recipient
from a login. Six of the flagged files were another session's tonight.

**`detailplatform.com` is NOT a typo**, though it reads like one beside
`detailingplatform.com`. It is the established demo credential domain. I nearly
wrote "typo" into the roadmap on a manager's suggestion; `admin-account.mjs`,
ROADMAP 0.1 and `platform_admins` all disagree.

**`/ex3`'s hero: two records disagree and it is not resolved.** ROADMAP says
done on the 21st at 903px; `FOR-ANDREW.md` carried it open at 1,111px. The
next action is **one measurement, not a build.**

---

## Constraints I worked under, so the next session knows what was not tried

No push, no publish, no deploy. Nothing under `supabase/functions` was edited
tonight. No key was read, printed or stored — verifying Andrew's vault secret
meant confirming a row **by name**, and `decrypted_secret` was never queried,
not in full and not as a prefix or a predicate. All fixture mail went to
reserved domains; Andrew's inbox was closed and stayed closed. No tenant was
created and none is suspended. The Supabase MCP connector was not used —
everything went through `.env` and the Management API against
`kguqylyzgyzfktkfnhjb`, checked before the first query.
