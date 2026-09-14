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

> ## ⚠ § 2 IS CLOSED — `docs/blind-browser-2026-09-13.md`, later the same day
>
> **The blocker was never "we have no instrument". It was "lane B owns port
> 5173", which is a resource, and a resource can be duplicated.** Lane C built
> the production bundle from its own `git worktree` at `873d7a1` and served it
> on 4173, then blanked `app/src` and `app/public` in a second worktree, rebuilt,
> and served THAT on 4174. All twelve then ran against both, on lane C's
> schedule, against a subject lane B could not disturb.
>
> **THREE OF THE TWELVE COULD NOT FAIL.** `sweep-widths` printed `clean` five
> times over an empty page; `admin-contrast` printed *"clear of the floor"*
> while sampling **zero pixels against the REAL product** — all five of its
> selectors had been renamed out of `app/src` and its sentinel `99:1` is not a
> ratio any two colours can reach; `snapshot-page` wrote a 0 KB file and exited
> 0. A fourth, `sweep-booking-steps`, threw on a page that was perfect and
> **silently dropped every subject below it.** All four fixed and baselined.
>
> **AND THE CAVEAT IS PART OF THE RESULT: seven of the eight that passed were
> saved by the sign-in form**, not by an anchor anybody wrote. A blank page has
> no `input[type=email]`. The three that were caught are the three that reach a
> public page first.

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
| scripts that need a browser and a still tree | **12 — CLOSED 2026-09-13**, `docs/blind-browser-2026-09-13.md`: 3 were blind, 1 lost its subjects, 8 can fail |
| scripts with assertions, no browser, never baselined | **0** — `adversary-probe` was the last, and it was blind: 47 of its 50 checks stayed green on a garbage key |
| suites whose subject the blanking could not reach | 2, both recorded, both anchored another way |

---

## THE STANDING QUESTION, ONE MORE ROUND — lane C, 2026-09-13, at `691d55a`

*What else here reports success in a way that cannot distinguish working from
broken?* Two answers this pass, one large and one bounded.

### 1 · NOTHING IN `tests/` ASSERTS THE 44px TAP FLOOR. ANYWHERE.

**Measured: `grep -rn '44' tests/composition.test.mjs` returns nothing, and
`admin.css` is read by exactly one suite (`platform-admin`), which never looks at
a height.** The floor is the first thing `docs/START-HERE.md` § 3 puts in front
of a session, `docs/BAR.md` has a whole section on it, and **the entire 58-suite
battery is green with a 30px close button shipped.**

`.pa-x` — the only way out of the back office's open-detailer drawer that a thumb
can find — is `width: 30px; height: 30px` at `admin.css:348`, and **there is no
`::after` anywhere in `admin.css` except the tab underline**, so nothing is
carrying it to 44. `.pa-chip` computes to about 29. Both are in
`docs/lane-b-handover-2026-09-13.md` § 2d.

**THIS IS THE PURE FORM OF THE QUESTION.** The battery does not say the floor is
met. It says nothing about the floor, and a session reading "58 suites green"
cannot tell those two apart. **The reason it has never been caught is that the
floor is a COMPUTED value and every suite in `tests/` reads source text** —
`elementFromPoint` needs a browser, and the twelve browser-driven scripts are the
ones § 2 of this file already records as unrun.

**What would close it, and it is not a browser:** a source-level check that every
interactive selector in a stylesheet either sets `min-height: var(--tap)` / 44 or
declares a `::after` inset, failing on any that does neither. **It would be a
proxy and it must say so** — it cannot see padding on an inline child, and it
would have to be baselined against a control that passes by `::after` (the `.chip`
pattern) as well as one that fails. Owed; not built tonight.

### 2 · THE UNGUARDED PLURAL IS A CLASS, AND IT IS BOUNDED — swept, not assumed

Triggered by finding `"1 hours ago"` in the back office. **Two sweeps over
`app/src`, one for `${...} words` in template literals and one for `{...} words`
in JSX.**

**Result: the three in `AdminPage.jsx` are the only ones where the number lands
on 1 in ordinary use.** Everything else the sweep surfaced is guarded and was
checked by opening it:

| where | why it is safe |
|---|---|
| `BookingDetail.jsx:356` | inside `length > 0`, so the printed value is at least 2 |
| `GearMenu.jsx:209` | inside `memberships.length > 1` |
| `Business.jsx` `humanNotice()` | an explicit `d === 1 ? ... : ...` on both units |
| `AdvancedMoney.jsx:322` | uses the `n()` plural helper |
| `PricingPage.jsx:211` | `total` is the founding-spot count, never 1 |

**Two genuine but minor ones stay open and are NOT worth a screen edit on their
own** — `ManageBookingPage.jsx:737` reads *"1 hours before your appointment"*
when a detailer sets a one-hour change window, and `AdvancedMoney.jsx:318` reads
*"1 hours booked"*. Both are `t()` strings, so **both need their Spanish key
changed in the same edit**. Lane B, next time either file is open for another
reason — `docs/START-HERE.md` § 5 says a named fault is the bar, and these two
are named.

**THE INSTRUMENT'S OWN LIMIT, said out loud:** the sweep matches a number
followed by a lower-case word ending in `s`. It cannot see a plural built by
joining two values, and it cannot see one inside `lib/setup.js` or
`lib/templates.js`, which hold user-facing prose as plain object values — the
same blind spot the em-dash sweep hit on 2026-09-12. **A clean sweep here means
"clean in the shape I looked at", not "clean".**
