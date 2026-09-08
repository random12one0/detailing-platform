# Why the Spanish sweep had never once passed — four bugs in one instrument

**2026-09-08.** Roadmap 8.17 stage 2b shipped a translated dashboard and a
`LANG_APP=es` mode for `sweep-widths.mjs`, and commit `294a7eb` recorded
honestly that **the Spanish sweep at all five widths had never passed.** This is
what was wrong. All four are fixed and both languages now pass.

**The through-line: every one of them was silent.** Not one produced an error
saying what it was. Three of the four made the sweep report *more* success than
it had measured.

---

## 1. `NAMED()` NEVER WORKED — `readFileSync` was never imported

The Spanish lookup was built like this:

```js
const APP_ES = (() => {
  try { const src = readFileSync(...); return new Map(...); }
  catch { return new Map(); }          // <- silent
})();
```

and `readFileSync` was **not in the import list**. The catch swallowed
`ReferenceError: readFileSync is not defined`, returned an empty Map, and
`NAMED()` — whose entire job is *match the English name OR the Spanish one* —
fell back to English for **every control, on every run, since the day it was
written.**

**The code reads correctly.** Nothing in that block is wrong to the eye; the
defect is a missing line four hundred lines above it. It survived a review, a
commit and three sessions.

**What found it, after two nine-minute runs went on wrong theories: printing the
value.** `APP_ES entries: 0` ended it in one run.

**Both wrong theories came from misreading the tool.** Playwright's timeout said
`name: 'Quote'`, and that was twice read as a formatting quirk of a regex. It is
not — proven with a four-line script against `setContent`: **a regex name
matches and clicks; a quoted string in that log always means a string was
passed.** Measuring the tool beat arguing about it.

**Fixed and made loud.** The catch prints `SPANISH CATALOGUE DID NOT LOAD`, and
the sweep exits 1 when `LANG_APP=es` and the catalogue is empty — because an
English sweep wearing a Spanish label is worse than no sweep.

## 2. `NAMED()` IS ANCHORED, AND `hasText` IS A SUBSTRING MATCH

With NAMED repaired, the next Spanish run **still** reported nineteen settings
rows as `NO SUCH ROW`. The fix had swapped one wrong matcher for another.

`NAMED()` returns `^(?:English|Español)$`. Anchors are right for
`getByRole({ name })`, where the accessible name is the whole string. They are
wrong for `hasText`, which matches a SUBSTRING: a `.nav-row` carries its label,
its description and a chevron, so demanding the row's entire text equal the
label matches nothing.

**It was invisible in English by construction.** A plain STRING handed to
`hasText` already matches as a substring — the anchors only came into existence
at the moment the value became a regex, which is only in Spanish.

`NAMED_TEXT()` is the unanchored twin. All ten `hasText` call sites use it.
**Two matchers that look interchangeable and are not.**

## 3. FOUR LOCATORS ADDRESSED CONTROLS BY THEIR ENGLISH NAME

Found by writing a probe that reads the sweep's own literals back against the
catalogue, rather than by guessing one per nine-minute run:

| what | was | now |
|---|---|---|
| the request card's Quote button | `name: NAMED("Quote")` | `[data-quote]`, an attribute |
| Money's Week / 6 months / Lifetime | `name: k` — the raw string | `NAMED(k)` |
| the calendar day's three editors | `hasText: label` | `NAMED_TEXT(label)` |
| Clients' two sort chips | `name: s` | `NAMED(s)` |
| the four tab guides | `name: tab` | `[data-tour]` — **which the pair already carried as its second element** |

**The Quote button gets an ATTRIBUTE rather than a translation**, because its
words change twice over: *Quote* becomes *Re-quote* once a quote exists, AND
both translate. A name-based locator there has four things to be right about.
`RequestCard.jsx` carries `data-quote` for the same reason the rail buttons have
carried `data-tour` since 8.17.

## 4. TWO LOOPS SKIPPED SILENTLY, AND SO DID A GUARD

`if (!(await card.count())) continue;` — twice, in the calendar day's editors
and Clients' sorts. **That is why a Spanish run could report "clean at all five
widths" while never opening those screens.** They print `NOT MEASURED` now.

So does the bare `await appear(...)` before Money's periods, whose result
nothing read. **That silence is why the failure surfaced fifteen seconds later
as a click timeout on a DIFFERENT line**, pointing the next session at the wrong
place entirely.

**And the unconditional `Month` click after that loop threw and killed the whole
run** — after the guard above had already reported the control missing. A sweep
that dies at the first width measures nothing at the other four. It is
conditional now: a check is a diagnosis, never a gate.

**One more, and it was not a language bug at all:** Money's period control was
absent because the block arrived with the job record still open in the second
column. It presses Escape first now.

---

## The source guard: a TOUCH is not an EDIT

Two consecutive sweeps were condemned over `landing/LegalPage.jsx`, a file this
session never opened and whose content matched HEAD both times. Something else
on the machine had moved its mtime.

**An mtime that moved while the bytes did not is a touch, and a touch cannot
change what the page rendered.** `source-guard.mjs` fingerprints `app/src` at
the start and compares hashes: a touch is reported in one line and does NOT
condemn the run.

**A warning that says "this run is not trustworthy" about a file nobody changed
is a warning people learn to scroll past** — which is precisely the fate this
guard exists to save real findings from.

Baselined three ways: nothing happens → silent; mtime moved, bytes identical →
one line, run stands; real edit → full warning, run condemned.

---

## Where both sweeps stand now

```
  LANG_APP=es   exit 0   clean at 1920, 1440, 392, 360, 320
  (English)     exit 0   clean at 1920, 1440, 392, 360, 320
```

Nine to eleven `NOT MEASURED` lines remain in each, and **they are the same
lines in both languages** — so none is a translation gap. All are seed-dependent
and each names the command that would fix it: `--subscription=past_due` for the
two subscription states, `seed-demo.mjs` for the promo code, and a Team member
and a notification line for the two buttons.

## The one that is NOT fixed

**A third i18n blind spot exists and is now caught by
`scripts/i18n-fragments.mjs`**: English broken into short fragments by `{...}`
holes — `{done} done · {left} to go`. Both older instruments reported clean on
it (`i18n-survey` reads string LITERALS; `spanish-dom` compares against
catalogue KEYS, and *"1 done · 4 to go"* could never be a key). Thirteen found
across 95 files, all fixed, 19 catalogue entries added. **It ignores single
words on purpose** — one-word fragments are units and separators, and this repo
has already deleted an entire intersection detector for crying wolf every run.
