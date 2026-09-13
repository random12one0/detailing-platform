# WHAT THE AUDIT DID NOT REACH — the gap, on paper, 2026-09-13

**`docs/check-audit-2026-09-13.md` says in one line that the browser sweeps
were not run. This file says exactly WHICH, exactly HOW MANY, and exactly what
would have to be true to close each one** — because *"the browser sweeps were
not run"* is a sentence somebody can read twice and still not know what is
unguarded.

Written at `63509d5`, lane C. **Every figure here is counted, not estimated.**

---

## THE ANSWER, IN ONE LINE

**Fifty-eight of fifty-eight suites in `tests/` have now been blind-tested, and
so have ten of the thirty-three scripts that assert anything. The twelve that
drive a browser are untested BY THE INSTRUMENT AS WELL AS BY THE AUDIT, because
`blind-run` cannot start a dev server and lane B owns the one that exists.**

---

## 1 · WHAT **IS** COVERED, SO THE GAP IS THE REMAINDER AND NOT A GUESS

| instrument | reaches | how many |
|---|---|---|
| `scripts/blind-run.mjs` | every file in `tests/`, with `app/src`, `app/public`, `supabase`, `docs/design-directions`, `docs/tenant-sites` and `scripts` blanked to zero bytes | **58 suites** |
| the `.every()`-with-no-count scan | checks over LIVE data, where emptiness comes from a dead service rather than an empty file | 15 sites, 3 real |
| run by hand today, against the live project | `accent-sweep`, `probe-forecast`, `i18n-coverage`, `decisions-index`, `db-audit`, `render-emails`, and the whole 58-suite battery | **9 scripts** |

**`docs/tenant-sites` WAS ADDED TO THE BLANK LIST TODAY AND IT CLOSED A WHOLE
SUITE.** `tenant-sites.test.mjs` is **129 checks over 8 pages in 5 sites**, and
its subject was in none of the five blanked roots. `blind-run` therefore
reported it as *0 green, exits 0* — a line that reads as *"nothing to see"* and
actually meant *"this suite has never been blinded"*. **Same shape as the
`session-ping` and `mail-sink` false positives the audit already recorded: an
artefact of where the blanking STOPPED.** With the root added, the suite goes
red when its pages are empty, and the whole run now carries zero exit-0 flags.

---

## 2 · THE TWELVE THAT DRIVE A BROWSER — the real gap

**None of these has ever been blind-tested, by the audit or by anything else,
and `blind-run` structurally cannot reach them: it runs `tests/` only, and
these need a dev server on 5173 that lane B owns.** Trap (f) — a measurement
taken while somebody is building is worth nothing — is why the audit read them
instead of running them.

| script | lines | what it would fail to catch if it were blind |
|---|---|---|
| `sweep-widths.mjs` | 1,679 | **the one with the worst record in this repo.** Line 605 printed *clean* over 38 real findings. It is a FINDER, so zero findings is its pass — the exact shape `em-dash` was caught in |
| `sweep-booking-steps.mjs` | 484 | the seven-step flow's spare-room figures at every width; also a finder |
| `e2e-booking.mjs` | 873 | **48 assertions, the customer's whole path.** Its `slotsOn() ?? []` was one of the three blind instruments that started the audit, and it was fixed BEFORE the audit rather than by it |
| `two-detailers.mjs` | 308 | 12 assertions on tenant isolation as a BROWSER sees it |
| `spanish-dom.mjs` | 178 | what a Spanish screen actually renders — the subject of the suite that passed 58 checks while half a screen was English |
| `final-pass.mjs` | 307 | the last look before a publish |
| `admin-contrast.mjs` | 132 | the back office's computed contrast |
| `shoot-dashboard` / `shoot-admin` / `shoot-manage` / `snapshot-page` | 817 | photographers rather than checkers, but a photographer that shoots the wrong screen is the `pushState` failure again |
| `overlap-probe.mjs` | 214 | **a probe LIBRARY, not a runner** — exported source strings the sweeps `eval` inside the page. It cannot be run on its own, so it can only ever be baselined through a caller |

**WHAT WOULD CLOSE IT, AND IT IS ONE SESSION'S WORK RATHER THAN A NEW
INSTRUMENT:** lane B commits and stands down, lane C starts the dev server
against the committed tree, runs each sweep once for a baseline, then breaks the
thing each sweep guards and confirms it goes red. **It cannot be done while
`app/src` is dirty**, which it was for the whole of today.

---

## 3 · THREE SCRIPTS THAT RUN WITHOUT A BROWSER AND WERE NEVER AUDITED — all three closed

Found by cross-referencing every script carrying an assertion against the audit
document's own text. **All three were run and read this session, and the last
one turned out to be the most blind instrument in the repo.**

- **`accent-sweep.mjs` — 16 assertions, and it reads NO PRODUCT FILE.** Every
  hex it checks is a constant in the script. It is arithmetic against pinned
  values, so it is legitimately immune to blanking — and the limitation that
  follows is the part worth writing down: **it proves the accent PALETTE is
  contrast-safe and proves nothing about whether the product still uses that
  palette.** Ran clean today. Same category as `design-contrast`'s 15 recorded
  false positives.
- **`probe-forecast.mjs` — 23 assertions, and its live half had never run.**
  Closed today; see § 4.
- **`adversary-probe.mjs` — 50 checks. DONE, and it was blind — closed the same
  session.** The audit had only checked that it exits 1 without credentials.
  **Broken on purpose by giving the probe a garbage anon key: 47 of 50 stayed
  green**, including all fourteen *"X returns nothing to a stranger"* and every
  *"X refuses an anonymous caller"*. Every one of those passes on a **401**,
  which is what RLS refusing looks like AND what a dead key looks like — **a
  probe whose own credential had rotted would have reported the whole security
  model perfect.** Three positive controls fifty lines away in later sections
  were the only thing holding it, so the suite was anchored by accident and a
  reader looking at either loop had nothing.
  **Each loop carries its own anchor now, and the FIRST ATTEMPT AT ONE WAS
  WRONG in a way worth keeping:** calling a public edge function
  (`available-slots`) stayed green with the garbage key, because `verify_jwt` is
  off there and it answers the same whatever is sent. It proved the function was
  up and nothing about the key. **Only PostgREST validates the key itself** —
  200 `[]` live, 401 *"Invalid API key"* dead — so that is the control in both
  places. 50 → 52 checks, and both anchors go red on the garbage key naming
  their own cause.

---

## 4 · A SKIP THAT DELEGATED TO A SKIP — closed today, and the shape generalises

`tests/weather.test.mjs` § 13 prints:

```
SKIPPED  13 · forecast/index.ts status mapping — needs Deno;
         proved live by scripts/probe-forecast.mjs instead
```

**That sentence was honest and the delegate never ran.** `probe-forecast.mjs`
skipped its own live section for want of `SUPABASE_ANON_KEY` — which has been in
the root `.env` all along; the suites load it through `tests/_env.mjs` and the
scripts do not — and exited 0. **Two honest skip lines in a row add up to a
capability nobody has ever checked.** 11 passed / 1 skipped became 16 / 0, and
the five new ones are the deployed `forecast` function's whole status mapping.

`tests/availability-honesty.test.mjs` was the same fault without the
delegation: it was one of the eleven suites `_env.mjs` was written for and was
missed, so § 4's five live checks against `available-slots` had never run
either. 26 became 31. Both are baselined against a dead endpoint.

**THE RULE: A CHECK THAT NAMES ANOTHER CHECK AS ITS PROOF IS ONLY AS GOOD AS
THAT CHECK'S OWN EXIT CODE, AND NOTHING IN THIS REPO FOLLOWS THAT LINK.** Grep
for the delegation words — *proved by*, *covered by*, *instead* — and run what
they name.

**AND NINE SCRIPTS STILL DO NOT LOAD `.env`:** `db-audit`, `db-census`,
`e2e-booking`, `final-pass`, `import-legacy`, `seed-demo`, `seed-two-tenants`,
`send-test-emails` and `set-healthcheck`. **That is deliberate for the doers** —
a person runs them with `set -a; . ./.env` and sees the error, and `db-audit`
and `final-pass` both exit 1 rather than pretending — **and it was a silent hole
for the one that was a CHECKER.** The distinction to apply to the next script:
does it DO something, or does it ASSERT something? An asserter loads the file.

---

## 5 · WHAT THE BLANKING STILL CANNOT SEE, BY CONSTRUCTION

- **A suite whose subject is `tests/` itself** cannot be blanked, because
  blanking it deletes the suite. `mail-sink` and `session-ping` are both this;
  both were reported and both withdrawn. Their own subject counters —
  *"4a it read the whole of tests/ and scripts/"* — are what stands in.
- **A check over LIVE data.** Blanking a file cannot make a deployed function
  return an empty array. That is what the `.every()` scan is for, and it found
  3 real ones in 15 sites.
- **A suite that prints only a summary.** `blind-run` counts green LINES, so a
  quiet suite contributes zero and reaches it only through the exit code.
  `availability-honesty` and `tenant-sites` are both quiet. **The exit-code flag
  is the only thing holding them**, which is why the `** AND THE SUITE STILL
  EXITS 0 **` line matters more than the number beside it.
- **Anything needing a browser.** § 2.

---

## 5b · ONE ASSUMPTION WRITTEN INTO A CHECK TODAY, AND IT IS UNPROVEN

`tests/spam-filter.test.mjs` now asserts that `addressPerDay`'s window is
**exactly 86,400 seconds**, on the stated grounds that `rate_take` buckets on
`floor(epoch / window) * window` — so a whole-day bucket starts at **UTC
midnight** and cannot straddle Geoapify's own daily reset.

**THE SQL HALF IS MEASURED AND THE PROVIDER HALF IS NOT.** Nothing in this repo
records when Geoapify's 3,000-credit day actually rolls. If it rolls at some
other hour, one caller could take the 2,400 ceiling either side of our boundary
and spend **4,800 inside one provider day**, which is 1,800 over the allowance —
and the failure is not a bill, it is every other detailer's customers losing
address help until the provider resets.

**It is narrow — it needs a deliberate adversary, and `addressPerIp` caps them
at 60 an hour, so one IP cannot get near 2,400 in a day anyway.** Recorded
rather than fixed because the fix depends on a fact about a third party that
nobody here has looked up. **Look it up before raising that limit.**

---

## 6 · THE SCORE

| | |
|---|---|
| suites in `tests/` | 58 — **all blind-tested** |
| scripts carrying assertions | 33 |
| scripts run and read this session | 9 |
| scripts that need a browser and a still tree | **12 — the gap** |
| scripts with assertions, no browser, never baselined | **0** — `adversary-probe` was the last, and it was blind: 47 of its 50 checks stayed green on a garbage key |
| suites whose subject the blanking could not reach | 2, both recorded, both anchored another way |
