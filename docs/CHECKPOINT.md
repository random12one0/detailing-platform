# Checkpoint — 2026-09-11

**The one living "where are we" file.** Overwritten at each checkpoint, never
appended to. It is a POINTER: `docs/roadmap.md` is the plan, `PROJECT-STATE.md`
is the technical state, `docs/overnight-log.md` holds every open question.
Nothing here restates them.

**EVERY NUMBER BELOW WAS MEASURED ON 2026-09-11, NOT COPIED.** The version this
replaced was written on 2026-09-06 and its headline — *"the bundle hash on
detailingplatform.com matches the local build byte for byte, so the live site is
running everything below"* — **had been false for five days and 246 commits.**
That sentence is why this file is dangerous when it is stale: it is the one doc
titled *where are we*, and it was answering with September the 6th.

---

## Where we are

**69 roadmap items ticked, 15 open, 5 part-done. 44 test suites. 33 edge
functions, all current. 72 migrations.**

### THE LIVE SITE IS 246 COMMITS BEHIND AND HAS BEEN FROZEN SINCE 6 SEPTEMBER

```
live   detailingplatform.com   assets/index-nOASGAhD.js   (deploy c47cfae, 6 Sep)
local  npm run build --prefix app                          a different hash
```

**Netlify build credits — 1,965 used against a 1,000/month plan, at 15 credits
per production deploy.** Every push since has been recorded and **skipped.**
`docs/OUTSTANDING.md` § 17 has the arithmetic.

**THE CREDITS RESET ON 13 SEPTEMBER — TWO DAYS FROM THIS CHECKPOINT** — and
`CLAUDE.md` § Ground rules changes meaning on the 14th as a result. **Do not
read that paragraph without checking the date you are reading it on.**

- **detailingplatform.com** — the platform (site `detailplatform-admin-test`)
- **andrewsdetail.com** — the OWNER'S LIVE BUSINESS, site `andrewsauto`.
  **Nothing in this repo deploys there. Do not touch it.**

### Branch

**Work is on `main`.** `claude/superbase-access-anj1h7` is dead (94+ behind,
nothing unique). `claude/determined-satoshi-936e89` and `claude/product-b2` are
the two product sessions' branches, merged.

**A work branch with `main` reserved for publishing was recommended on
2026-09-08 and has NOT been adopted.** It is the open decision that has a
deadline: branch deploys cost **zero** credits and production deploys cost 15,
so on 14 September the current cadence starts consuming the new allowance
immediately. `OUTSTANDING.md` § 17.

---

## What he reviewed, and what is left

**He walked 62 of 63 pages on 2026-09-10 and marked 17 things. FIFTEEN are done
and HE ticked each one** — not a session, him, screen by screen.

**TWO are open**, and neither is code waiting on a decision:

| | | |
|---|---|---|
| **13** | Money → the full picture | *"the advanced view needs some work"* — **the only note that names no fault.** He said he would go over it himself and come back. Waiting on him. |
| **16** | Language, product-wide | *"some language needs fixing. Not only here but the entire website."* **Not started deliberately** — it touches every file in `app/src`, so it needs ONE session with the other stopped. |

`docs/review-2026-09-10.md` is the record, in his own words.

---

## RED RIGHT NOW — TWO suites, and both were already written down

**`platform-admin` 113/46 red and `password-reset` 26/3 red**, both re-measured
2026-09-11.

> **THE MANAGER'S FIRST DRAFT OF THIS SECTION SAID *"nothing reported it and no
> doc mentions it"* AND THAT WAS FALSE.** Both are in
> `docs/whats-left-2026-09-10.md` § 9, found overnight on 2026-09-10, with the
> identical `platform-admin` count — and that session did the harder thing
> this one had not: it checked out the tree from BEFORE its own work and re-ran
> them there, proving neither was newly broken.
> **A truth pass that declares a finding before reading every status doc is
> doing the thing it exists to stop**, and it happened here on the first
> attempt. Left standing rather than quietly deleted.

**What IS new below is the characterisation, not the discovery.**
`password-reset`'s three: *the reset page refuses a short one*, *the settings
screen refuses a short one*, *the three selectors five scripts sign in through
still exist*. § 9 guesses the first two are the 10-character rule that landed on
2026-09-10 with the checks still asserting eight — **that guess is untested and
the third failure is the dangerous one**, because five browser scripts sign in
through those selectors.

**`platform-admin` is the one screen where a bug exposes every tenant**, so it
cannot sit. What it is NOT is a straightforward regression — sampled, the
failures are a mix of two things:

- **Checks pointing at source that MOVED.** `AdminPage.jsx` went from 1,436
  lines to 813 and gained `PreviewEntry.jsx`, in two deliberate, well-documented
  commits (`45eaf85` replaced sign-in-as-them with a per-tab preview;
  `d155197` added the password eyes).
- **Checks enforcing rules the OWNER has since reversed.** `check("no chart")`
  fails because a six-month chart was deliberately built in roadmap 8.2 at his
  request — the file's own comment says so and keeps the old prohibition
  beside it on purpose.

**Somebody has to sort which is which, one failure at a time.** A suite this
red gets ignored wholesale, and the one real regression hiding in 46 stale
checks is exactly what this repo's own rules warn about. **Lane C.**

---

## Also red or unverified, from the two product sessions

`docs/review-2026-09-10.md` § FOUND WHILE DOING THE ABOVE carries six faults in
`scripts/` and `tests/` that **lane B was not allowed to fix.** They must reach
a build session. The worst of them:

- **`sweep-widths.mjs:605` — `found += await say(...)` where `say` returns
  undefined, so `found` is NaN from the first width and the run prints
  *"clean"* whatever it saw.** One run printed 38 real geometry findings above
  that line. **Every "clean" that script has reported since is worth nothing.**
- `tests/spanish.test.mjs` reads its subject as TEXT, so it passed 58/0 on a
  catalogue that did not parse at all.
- `seed-demo.mjs` writes `vehicle_size_fee` without adding it to the totals, so
  seeded bookings do not reconcile.

---

## What is next

**Nothing substantial is blocked on him except the two review items above and
the branch decision.** The unblocked work, in order:

1. **Lane C: the 46 red checks**, then the six faults above.
2. **Lane C: the deploy**, the moment credits reset on the 13th.
3. **Lane A: the websites.** The diagnosis changed on 2026-09-09 —
   `docs/tenant-sites-diagnosis-2026-09-09.md`. The failure is **thinness, not
   slop**, and `docs/DEVICE-INVENTORY.md` is the list of what to add.
4. **Lane B: review item 16**, the language sweep, with the other product
   session stopped.
5. Roadmap 2.22 — **restore a backup once.** Still never done.

---

## The rule this file exists under

**A checkpoint states what was true when it was written.** The version before
this one said so in its own text and was still believed for five days.
**Re-run the gate rather than reading this line** — and if the date at the top
is more than a couple of days old, measure before you quote it.
