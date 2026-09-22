# Manager note — 2026-09-22, cold start

**Written by the Cowork manager session started 2026-09-22 ~14:56 Pacific,
before any work was dispatched.** Everything here is measured, not assumed.

## What was found

| Thing | State, measured |
|---|---|
| Doorbell (`session-ping`) | **Working.** HTTP 200, both labels present |
| Last ping, `DP Cowork` | 2026-09-22 00:36 Pacific |
| Last ping, `DP Cowork2` | 2026-09-22 00:36 Pacific |
| Both Claude Code panes on claude.ai/code | Open, history intact, banner: **"Can't reach your computer. It may be asleep or offline."** |
| `http://localhost:5173` | **Refused** — no dev server running |
| The computer itself | **Awake and reachable.** The file bridge listed `docs/` and staged four files while the panes said otherwise |

**The banner is misleading and that is the useful part.** The machine is not
asleep. The two `claude` CLI processes are simply gone — the terminals were
closed at about 00:36 Pacific. A Cowork manager reading "may be asleep or
offline" will go looking for a connection fault and there isn't one.

## THE MANAGER CANNOT RESTART A WORKER SESSION. THIS IS STRUCTURAL.

`claude-code-manager-brief.md` § 7 says *"a session that can press the button
presses the button"*, and a manager meeting this will reasonably try to open a
terminal and start `claude` itself. **It cannot, and the reason is a hard
platform limit rather than a missing permission.**

Computer control on this device grants terminals and IDEs in **"click" mode
only** — the manager can see the window and left-click in it, and **cannot
type, press a key, or paste.** Verbatim from the access resolver:

> *"Terminals and IDEs can only be granted in 'click' mode — you can see and
> left-click, but cannot type, press keys, or paste."*

So there is no sequence of clicks that types `claude` into a prompt. **Asking
Andrew for terminal access does not fix it** — the restriction is on the tier,
not on the grant, so the approval prompt would cost him an interruption and
buy nothing. Do not ask for it.

**Restarting the two worker sessions is Andrew's, and it belongs on
`FOR-ANDREW.md` as a recurring cost rather than as a one-off.** Every time the
terminals close, the whole loop in the brief is stopped until he reopens them.

## Also true, and it changes how hard to run

claude.ai shows **"Approaching weekly usage limit · Resets Wednesday
2026-09-23, 8:00 PM."** Two worker sessions plus a verifying manager is the
most expensive shape this project runs in, and the cap resets in about a day.
Worth Andrew's decision before a full batch pair is dispatched, not after.

## What was NOT done

No work was dispatched. No batch was started. `ROADMAP.md`, `DECISIONS.md`,
`FOR-ANDREW.md` and `docs/VERIFIED.md` were not touched by this session.
Batch 1A and Batch 1B are both still open and unclaimed in `docs/BATCHES.md`.

## One thing the brief is stale on

`docs/BATCHES.md` Batch 4 says it is *"blocked on Andrew's publish-order
decision."* `docs/MANAGER-CLOSE-2026-09-21.md` § 4 records that he lifted the
freeze on 2026-09-21 and that **all 39 edge functions were published that
night, 39/39 matching.** Batch 4 as written is describing a block that has
since cleared. Flagged, not edited — `docs/BATCHES.md` belongs to whoever
picks the batch up.
