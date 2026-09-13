# CAN THE CHECKS ACTUALLY SEE? — the whole-repo audit, lane C, 2026-09-13

**The brief:** three instruments had been caught blind in two days —
`platform-admin`'s `strip()` eating up to three quarters of every file so
eighteen passes were hollow; `e2e-booking`'s `slotsOn()` ending `?? []` so the
double-booking guard would have gone green with the availability service
completely dead; the overlap probe disqualifying everything under a sticky
ancestor and reporting zero findings over nothing. **That is a pattern, not
three accidents.** So: go through every suite in `tests/` and every script in
`scripts/`, establish what it would take for each check to pass while the thing
it guards is broken, close the hole, and baseline it by breaking the real thing.

---

## THE ANSWER, IN ONE LINE

**Sixty-nine checks across ten suites could not fail. Two whole suites and one
script could report success having measured nothing at all. And one instrument
— the deployed-code checker — was structurally blind to twenty-eight imports,
which is how seventeen edge functions ran yesterday's money formatter while it
printed *"all 37 functions are current."***

Every one is fixed and every fix is baselined below.

---

## 1 · THE TWO INSTRUMENTS

Neither reads code looking for smells. Both make the thing being guarded
*actually broken* and ask what stays green.

### (a) `scripts/blind-run.mjs` — blank the subject, count the greens

`docs/VERIFIED.md` § 1g records the one-line version: *replace a suite's
`read()` with `() => ""` and count what stays green.* This is that, applied to
every suite at once and without editing any of them.

Two `git worktree`s off `HEAD`. In one, every product source file —
`app/src`, `app/public`, `supabase`, `docs/design-directions`, `scripts` — is
truncated to **zero bytes**. Every file in `tests/` runs in both, with no `.env`
in either tree, so nothing touches the live project and no mail can be spent.

**Why the tree and not a mock:** suites here read by `new URL(…, import.meta.url)`,
by `readFileSync`, by `import()`, and by walking directories. There is no single
seam to stub. Blanking the bytes catches all four — **and it catches a subject
counter that counts FILES**, which is exactly how `geoapify`'s own *"the check
has subjects"* passed over 67 empty files.

**The instrument was broken on purpose before it was believed.** With blanking
disabled it saturates (route-contract: 30 of 30 greens reported as hollow); with
it on, 3. A filter matching no suite reports `0 across 0`, not silence.

**AND IT HAS A BLIND SPOT, MEASURED AND WRITTEN INTO ITS OWN HEADER.** A suite
whose subject is `tests/` itself cannot be blanked, because blanking it deletes
the suite. The first pass left `scripts/` intact and reported **38 hollow checks
in `session-ping` and 6 in `mail-sink` that do not exist** — an artefact of
where the blanking stopped. With `scripts/` blanked too, `session-ping` crashes
outright and `mail-sink`'s survivors are its own pure classification logic plus
its own subject counter, *"4a it read the whole of tests/ and scripts/"*.
**Both suites are clean.** Read the survivor NAMES before believing a number.

### (b) A scan for `.every()` with no subject count

`.every()` over an empty collection is `true`. Fifteen sites; **twelve were
already anchored by a neighbouring check** and three were not. The false
positive rate is stated because it is part of what the scan is worth.

This one reaches what blanking cannot: a check over LIVE data, where the
emptiness comes from a dead service rather than an empty file.

---

## 2 · WHAT WAS FOUND, IN THE ORDER THE BRIEF ASKED FOR

### DOUBLE BOOKINGS — `booking-engine`, 2 checks

```js
const days = slots.data?.days ?? {};
check("available-slots closes the days the service is not offered on",
  Object.entries(days).every(…));
check("available-slots offers no mobile slots for a drop-off-only service",
  Object.values(days).every(…));
```

`?? {}` turns a dead or erroring `available-slots` into an empty object, and
both `.every()` calls then pass. **This pair is the DISPLAY half of the
double-validation pattern** — it is what proves a greyed-out day agrees with a
refused booking, so that a customer does not meet the refusal at submit.

**Baselined by pointing that one call at `available-slots-DEAD`.** Before: the
suite ran **105 passed, 0 failed** with the availability service entirely gone.
After: one failure, `404 · 0 day(s) for 2026-10-13..2026-10-15`. Same shape as
`e2e-booking`'s `slotsOn() ?? []`.

### CUSTOMER DATA — `booking-page-isolation`, 3 checks

*"no service name appears on both"*, *"no service ID appears on both"*, *"A's
services carry no group label"*. All three are negatives over two service
lists and **neither list had a count**. A tenant that returned zero services —
a bad slug, a failed profile read, a seed that did not run — proved perfect
isolation. 63/0 with the anchor in.

### CUSTOMER DATA — `tests/definer-grants`, the whole suite

The suite that says who may execute a `security definer` function. Every SKIP
prints *"this check proved NOTHING"*, which is honest to a person reading the
output. **It was not honest to the exit code: with no credentials it asserted
zero things and exited 0.** That is this repo's oldest recorded failure — a
skipped check reading exactly like a passing one — in the one suite whose
subject is who can reach a detailer's data.

It exits 1 now when a run measures NOTHING. Deliberately narrower than failing
on any skip: a partial run still proved something. Verified both ways — 11
passed / exit 0 with credentials, exit 1 and a named reason without.

### A SECRET — `geoapify`, 5 checks including both of its own subject counters

**`geoapify` already HAD the check this whole audit keeps adding.** *"1a · the
check has subjects"* and *"2a · the check has subjects"*. Both counted files:
`fns.length > 50`. Truncate all 67 to zero bytes and **both still pass**, and
they take 1b, 1c, 1d, 2b, 2c and 2c-i green with them.

**2b is *"nothing under app/ mentions the key or the host"*.** A blanked `app/`
proved the Geoapify key does not leak into the browser bundle.

**A subject counter that counts FILES is the same blindness one level up.** Both
read BYTES now. And 2b got a positive control it never had: a negative over a
tree where zero is the right answer proves nothing about whether the pattern can
match at all, so the same regex is run over `_shared/geoapify.ts`, the one file
that is supposed to name the provider.

### CUSTOMER-VISIBLE — `spanish` § 2, 5 checks

Every check filters `Object.entries(es)` and asserts the result is empty. § 9
next door already had *"9b · the check has subjects, pairs.length > 1000"*; § 2
never got one. Baselined by swapping the catalogue for `{}`: red.

### A GREEN LINE PRINTED UNDER ITS OWN FAILURES — `design-contrast`

It compared landing.css's thirteen tokens against the system's values, counted
every mismatch — and then printed
`ok  landing.css tokens match the system's values` **unconditionally, on the
next line**. Thirteen FAIL lines with a green line under them.

**This is the worst shape a report can take: a green result that stops the
search, sitting directly beneath the findings.** It counts now.

*(Its other 15 greens in the blanked tree are a FALSE POSITIVE and are recorded
as such: those rows carry hard-coded hex pairs in the test file and are
arithmetic against pinned values, so they are legitimately independent of the
tree.)*

### THE REST — 53 checks, all the same shape

| suite | green over nothing | what they are |
|---|---|---|
| `composition` | **41** of 95 | every one a pure negative: *no screen maps records onto `.card`*, *no hand-written `<select>` with 2–4 options*, *no never-default font*, all eight squircle pairings, all three reduced-motion rules |
| `route-contract` | 3 | *"/book/:slug is not wrapped in the session provider"* and two like it — over **0 routes parsed** |
| `dead-mans-switch` | 3 | *"watch-jobs stamps no heartbeat of its own"*, *"no cron entry making it stamp one"* |
| `customer-reminder` | 2 | *"every sendTenantEmail in the sweep is inside mustSend"* |
| `email-budget` | 2 | *"a refusal is NOT counted as a provider failure"* |
| `tours` | 2 | |

**A negative over an empty file is `true`.** The assertions are correct; what
was missing is an anchor. Each took one content check, in BYTES.

`composition` is the one to read: its existing `scanning ${files.length}
components` line **could not catch this** — `files.length` was still 60-odd with
every one of them empty. And its anchor names the three stylesheets explicitly,
because most of the 41 are CSS rules and **not one of the `.jsx` files carries
them**.

---

## 3 · THE SCRIPTS

### `check-deployed.mjs` — blind to 28 imports, and it is the highest-cost find

It is the ONLY thing in this repo that can say a deployed edge function is
running yesterday's code. Nothing else notices: the function answers, every
suite passes against the repo, and the customer gets the old behaviour.

Its walk matched at least one `../` before `_shared/`. A FUNCTION reaches
`_shared` that way and was followed correctly. A `_shared` module reaching a
**sibling** writes `from "./brandColor.js"`, with no `../` at all, and matched
nothing. **So the walk stopped dead at the first hop** — and the example its own
comment gives as the thing it exists to catch, *a stale `brandColor.js` reached
through `email.ts`*, was exactly what it could not see.

**Found by the tool disagreeing with reality, not by reading it.** The money
formatter in `_shared/emailKit.ts` was changed; the script reported **3 stale**
and all 37 current. The true figure is **17**.

`sharedFor` now lives in `scripts/lib/sharedDeps.mjs` so it can be tested at
all — `check-deployed.mjs` fetches the Management API at the top level, so it
cannot be imported without credentials and its walk had never had a baseline.
`tests/deploy-freshness.test.mjs` is 14 credential-free checks.

**ONE OF ITS FOUR BREAKS STAYED GREEN AND IS WRITTEN DOWN RATHER THAN HIDDEN.**
Deleting the `seen` dedupe — the only thing stopping a cycle looping for ever —
failed nothing, because the graph has no cycle today: **29 modules, 0 cycles**,
measured. So the check asserts the property that makes the walk safe rather
than pretending to assert the guard, and is baselined by adding
`import "./db.ts"` to `retryRead.ts`: red, naming `db.ts → retryRead.ts → db.ts`.

### `db-audit.mjs` — the same exit-code lie as `definer-grants`

Printed `SKIPPED` with no credentials and **exited 0**. `CLAUDE.md` sends a
session here after every migration, so a green exit that audited nothing is the
most expensive answer it can give. Exits 1 now, with the reason and the command.

### `render-emails.mjs` — a check coupled to a spelling, found as collateral

Its money-column tie-out required two decimal places. The moment
`emailKit.money` started printing `$150` instead of `$150.00`, every
whole-dollar figure stopped matching, all three columns read as EMPTY, and it
reported *"no money column found"* — over three correct emails. **CLAUDE.md trap
(k).** The behaviour it guards is that the lines add to the total, and that is
what it asserts now.

### Checked and clean

`adversary-probe` and `final-pass` both exit 1 on missing credentials.
`i18n-coverage`'s `continue` is a reported-not-skipped path with the reasoning
already written above it. The `continue`s in `sweep-widths`, `sweep-booking-steps`
and `overlap-probe` are element-level filters inside a scan, not skipped checks.
**The browser sweeps were NOT run** — lane B is live on `app/src` and a
measurement taken while somebody is building is worth nothing (trap (f)).

---

## 4 · THE COUNT

| | |
|---|---|
| checks that were green over a blanked subject, and are now anchored | **59** |
| checks that were vacuous over live data (`.every()` with no count) | **10** |
| **total checks that could not fail** | **69** |
| whole suites that could report success having read nothing | **2** (`em-dash`, `definer-grants`) |
| scripts that exited 0 having measured nothing | **1** (`db-audit`) |
| instruments structurally blind | **1** (`check-deployed`, 28 invisible imports, 17 functions misreported) |
| deliberate breaks used to baseline the fixes | **24**, every one red |
| findings withdrawn after measuring properly | **2 suites** (`session-ping` 38, `mail-sink` 6 — both artefacts of the instrument) |

**`em-dash` is its own entry because it is a FINDER**, so zero findings is its
pass. Over 67 zero-byte files it printed *"scanned 67 files"* and *"0 findings —
PASS"*. It counts code lines and quoted lines now — **8,467 and 2,833** on the
real tree — and fails under either floor.

---

## 5 · WHAT TO DO WITH THIS

```bash
node scripts/blind-run.mjs
node scripts/blind-run.mjs booking
```

**Run it after adding a suite, and read the NAMES rather than the number.** A
green line means *this check cannot prove it looked at anything* — usually a
correct negative missing an anchor, not a wrong assertion. The fix is a subject
count in bytes, not a rewrite.

**And the rule the whole audit reduces to, which is already in `docs/BAR.md` and
earned itself nine more times today:** *a green result from an instrument nobody
has checked is worth less than no result, because it stops the search.*
