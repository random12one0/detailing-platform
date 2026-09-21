# Handoff — 2026-09-20, the client-screens / 9.11 regression leg

Written at a clean boundary. Nothing is in flight, the tree holds none of this
thread's work uncommitted, and context was **258% of the clear threshold**
(775,345 tokens) when this was written — which is why it stops here rather
than starting task one. This is a separate thread from
`docs/HANDOFF-2026-09-20.md` (the measurement/spare-figures leg) — do not
merge the two or overwrite either file with the other's content.

---

## TASK ONE — re-run `sweep-widths.mjs` against current HEAD

`receipts/sweep-widths-1920-1440-392-360-320.json` on disk right now reads
`"status": "fail"`, the original four 320px findings on the booking-rule
warning. **That receipt is stale, not wrong** — its `git_sha` (`8cb604c9`) is
an ancestor of `91dc891`, the commit that fixed it (confirmed with `git
merge-base --is-ancestor`, not assumed from the verdict). Nobody has re-run
the sweep against the tree as it now stands, which also includes `fc9d861`
(9.6), `2da98da`/`fdf3d55` (9.7, including Book again). Re-run it, let it
replace the stale receipt properly, and the ghost stops being arguable.

## WHAT LANDED THIS LEG

- **`91dc891` — 9.11's fix.** `w.fix && <button>` gave the booking-rule
  warning a third button; `.warn-box .actions button { flex: 1; nowrap }`
  was only ever right for two. Now a grid copied from `.actions-row`'s own
  proven mechanism, text allowed to wrap. Verified live at 320
  (`scrollWidth === clientWidth`) and 1440 (still flex, untouched). **9.11
  un-ticked rather than amended in place** — a ticked item that breaks a
  supported width was unfinished, not finished-with-a-caveat; re-tick only
  after a real press.
- **`fc9d861` — 9.6.** The client list row's figure gets a caption
  ("lifetime" / "visit(s)"), the one value on the row that doesn't
  self-describe. Date and phone judged self-describing and left alone — the
  test for that judgement, not just the conclusion, is written into the
  entry. Still open on that basis, not a bug.
- **`2da98da` — 9.7, three of four.** Text (bare `sms:`, not the templated
  picker), Last vehicle, Last address — all drawn from `history[0]`,
  already in state via `BOOKING_SELECT`'s `"*"`, no new fetch.
  `customers.address` confirmed dead (nothing writes to it) and left alone
  on purpose, recorded as its own finding rather than wired to.
- **`fdf3d55` — 9.7, the fourth: Book again.** One optional prop,
  `initialCustomer`, routes into `NewBookingModal`'s existing `pick()`
  rather than a second version of it. Scope named out loud: name/phone/
  email travel (real data); address nominally travels but is empty in
  practice (same dead column); vehicle and last service do not travel at
  all, matching what a manual search already does. The three existing
  openers (`App.jsx`, `Calendar.jsx`, `Today.jsx`) pass nothing, confirmed
  unchanged by pressing Today's own button fresh and getting a blank form.
- **`87a3a50`, `09a9e76` — write-up only**, no code: the 9.6 judgement's
  reasoning recorded in the entry itself, and Andrew's own press results
  (what he verified at his reachable width, what he explicitly could not —
  his browser's viewport pins at 1414 inner regardless of outer resize, a
  second independent instance of the class of tooling limit that let the
  320px regression through in the first place).

## STILL OPEN, NOT A GAP IN THIS LEG'S OWN WORK

- **9.11, 9.6, 9.7 (all four pieces) are built and verified live by this
  session — none are ticked.** Andrew presses each himself before `[x]`;
  that is the standard this leg was built to, not a shortfall of it.
- **9.6's own done-when is only half met on purpose** — date and phone
  stay unlabelled, reasoning in the entry. If a future session disagrees,
  argue with the test written there, not the conclusion.
- **The vehicle-size nit** (`Clients.jsx`, "Last vehicle" renders the raw
  `vehicle_size` enum lowercase when `vehicle_size_label` is empty) is
  named, Spanish-checked, and explicitly **held rather than fixed** —
  Andrew's ruling: it isn't run through `t()` at all today, and the
  existing Spanish key only matches the capitalized form, so capitalizing
  the fallback alone would fix the English look and leave the Spanish
  exactly as broken. Fixing it needs a shared size-display helper, not a
  one-line capitalize.

## LANE RULES, AS MEASURED TONIGHT, NOT AS REMEMBERED

`app/src` and the browser were held twice this leg for the other session's
`sweep-widths` runs, and released explicitly both times — never assumed.
**Check what is currently out on loan before touching either**, the same
way you'd run `git status` before trusting memory of the tree; a lane
statement is a claim about a moment, not a fact about the repo
(`docs/how-we-run.md` § "What you say about the other tree expires the
moment you say something new" — written this leg, after the fourth
collision of the night was exactly this).

## STANDING CONSTRAINTS — ANDREW'S OWN, NOT THIS SESSION'S

No push. No deploy. No service-role key work beyond what `.env` already
grants against `kguqylyzgyzfktkfnhjb`. Never write to `adtlnvihwrcqcasqcjwd`
or any project that isn't `kguqylyzgyzfktkfnhjb` — stop and ask if you ever
find yourself connected elsewhere. `ROADMAP.md` edited and committed in the
same turn, never left dirty between turns. Commit with explicit paths, read
`git diff --cached` (content, not just names) before every commit — and
watch for the specific trap this leg hit once: `git commit <path>` takes
the **working tree** copy of that path, not the index: if you have staged a
partial hunk for a split commit, a bare `git commit <path>` will silently
sweep in whatever else is sitting in that file's working tree. Caught and
corrected here via `git reset --soft` before it reached anyone else's work;
it will not always be that cheap.
