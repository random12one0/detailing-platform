# START HERE

**The front door. Read this, then open a long file only when the work actually
touches its subject.** Written 2026-09-13.

## WHY THIS FILE EXISTS — the numbers, measured at `130ae94`

`wc -w` on the four files a session was being told to read before doing anything:

| file | words |
|---|---|
| `CLAUDE.md` | 19,166 |
| `FOUND.md` | 17,602 |
| `ROADMAP.md` | 8,123 |
| `docs/BAR.md` | 4,240 |
| **total** | **49,131** |

**That is roughly 95% of a fresh session's clear threshold spent before it reads
a line of code, and it is paid again at every clear.** It was the single largest
waste in this run. Those files are all still TRUE and none is deleted — what
changed is WHEN you open them. **This file carries only what changes what a
session DOES.** Everything else is a pointer.

---

## 1 · WHICH LANE ARE YOU? ANSWER BEFORE YOU WRITE A FILE.

Three or four sessions run in this one folder at once, each owning folders it
never writes outside.

| | Session | Writes |
|---|---|---|
| **A** | websites | `docs/tenant-sites/`, `docs/schemes/`, design docs, `scripts/build-examples.mjs`, `app/public/img/` |
| **B** | product | `app/src/**` — and it is the only session that runs the dev server |
| **C** | build | `supabase/**`, `tests/**`, `scripts/**`, the rest of `docs/**` |
| **M** | manager | `CLAUDE.md`, `ROADMAP.md`, `OUTSTANDING`, `PROJECT-STATE`, `DECISIONS`, `docs/sessions/` |

**THE LANE TRAVELS IN THE PROMPT AND NOWHERE ELSE.** Nothing in this repo can
work it out, and inferring it from the task is circular.

- Prompt names a lane → work only in those folders.
- Prompt names work OUTSIDE your lane → **say which lane owns it and STOP.** Not
  a smaller version of it.
- Prompt names no lane → **ASK before writing anything.** Reading is always fine.
- Andrew tells you to cross a lane → do it, and say so in the commit message.

**`node scripts/lane-check.mjs <lane>` BEFORE EVERY `git add`.**

→ Long version and the incident that caused this: `CLAUDE.md` § WHICH LANE,
`docs/sessions/README.md`.

## 2 · CLEARING, AND WHY IT IS NOT THE SAME AS COMPACTING

**Every message ends with one line: context used, context left, whether you are
near compacting.** `node scripts/context-check.mjs` prints the real figure.

**Clear at a finished section, never at the ceiling.** You cannot clear
yourself, so: name the boundary, give the number, stop. Andrew clears and
restarts you pointed at the repo.

**A compaction is a lossy summary a machine chose under pressure; a clear loses
nothing, because everything that matters is already on disk.** That is what
these files are FOR. *"If a wave is long enough to compact, it is long enough to
have been two waves."*

**Anything agreed in conversation goes into `CLAUDE.md`, `ROADMAP.md`,
`FOUND.md` or a commit BEFORE the clear.** If it is not in one of those, it is
not safe.

**The handover prompt's FIRST LINE IS THE LANE.** A prompt without one is not a
valid prompt. Hand over to the lane that owns the next item's DELIVERABLE — a
screen is B, a migration or an edge function is C.

**The prompt IS the sign-off.** It only ever appears together with "Safe to
clear." If either half is missing, both are. Blocked on Andrew → finish
everything that does not depend on his answer, commit, end with the ask ALONE,
and stay open.

→ `CLAUDE.md` § TWO STANDING RULES ABOUT CONTEXT and § Process.

## 3 · THE TAP FLOOR IS 44px OF REAL HIT AREA

Three floors were live in this repo at once — 32, 46, and a note reasoning that
36 cleared it — which is how a 30px control shipped with a green check beside
it. **44 governs. It is a floor, not a target.**

**THE SANCTIONED EXCEPTION:** a deliberately small decorative mark — a 7px
scroll dot, a carousel pip, a colour swatch — **keeps its painted size and grows
its TARGET.** Pad the anchor with an absolutely positioned `::after` at a
negative inset until the reachable area hits 44. The mark and the target are two
different things.

Two ways that goes wrong, both already found here: if the **PITCH** is under 44
the boxes overlap and neighbours steal each other's presses, so the gap has to
open until the targets tile exactly; and a `transform: scale()` marking the
current item **scales its pseudo-element with it**, so put the scale on the
paint, never on the anchor.

**A BOUNDING RECT CANNOT MEASURE ANY OF THIS.** The instrument is
`elementFromPoint`, probed at centre and ±4, ±10, ±15, asserting every probe
returns the control itself. For a row of controls, also read the tops and assert
the spacing.

→ `docs/BAR.md` § The tap floor moved and § The sanctioned exception.

## 4 · PROVE YOUR INSTRUMENT BEFORE YOU BELIEVE IT

**A green result from an instrument nobody has checked is worth less than no
result, because it stops the search.** This repo has shipped at least six checks
that tested nothing: `sweep-widths.mjs` printed *clean* over 38 real findings;
`spanish.test.mjs` passed 58 checks while half a screen rendered English; a
`pushState` sweep passed 22 screens it never visited.

**So break the instrument on purpose before you trust it, and COUNT subjects
every run rather than merely matching.** A skipped check reads exactly like a
passing one — a guard that skips must PRINT that it skipped.

**The ways a browser measurement lies, one line each, every one already having
produced a false reading:** a closed `<details>` keeps its children measurable;
`innerText` includes `<option>` text, so every `<select>` reads as a rendered
list; `pushState` does not re-render the router's host; a background tab pauses
CSS animations, so the screen sits at `opacity: 0`; a class can be on both a
header row and its grid, so `querySelector` returns the wrong one; a measurement
taken while another session is editing is worth nothing; **and the dev server is
not evidence — the bundle is** (`npm run build --prefix app`, then grep
`app/dist/assets/*.css`).

**A check that greps source text asserts how something is WRITTEN, not what it
DOES.** Assert the shared constant, the component, or a computed value.

→ `CLAUDE.md` § FOUR WAYS A BROWSER MEASUREMENT LIES — **fifteen of them as of
2026-09-13; the heading has said FOUR since the day it had four** — and
`docs/BAR.md` § EVERY CHECKING TOOL IS BASELINED.

## 5 · WHAT IS FROZEN — do not reopen, do not "improve"

- **`demo@demo.com` is Andrew's master back-office login.** "Improving" it locks
  him out of his own product. No password is written in any file; it lives in the
  `platform_admins` row's own `note` column, and with him.
- **`demo@detailplatform.com` / `demo123` is the demo DETAILER** and every sweep
  signs in with it. Deleting it takes verification down.
- **`--ac: #38E08B` is correct.** An outside review called it off-palette on the
  sign-in button. That reading was backwards — those buttons are the one place it
  is meant to be.
- **`"cancelled"` is the database's own value** in five tables: data, not
  spelling. **`"colour"` is a setup step's KEY**, and renaming it resets every
  detailer's setup progress. Everything else a person reads is American English.
- **Never write to the live business project `adtlnvihwrcqcasqcjwd`** and never
  deploy to the `andrewsauto` Netlify site. Reads are allowed; writes need his
  explicit go-ahead for that specific action.
- **Migrations are append-only. `reference/` is read-only.**
- **No artifacts unless he asks for one by name.** A tenant site goes out at
  `/ex<N>` and nowhere else.
- **The live domain is not publishing** (Netlify credits). `detailingplatform.com`
  answers 200 for every URL because of `_redirects`, so it is evidence of
  nothing — the bundle hash is the only honest answer.
- **The Netlify site is UNLINKED from the GitHub repo ON PURPOSE — Andrew
  unlinked it himself, 2026-09-13.** Publishing is manual and his alone, and a
  push spends no credits building. **It is not a fault, do not "fix" it, do not
  reconnect it and do not advise him to.** Deploys go out by hand through the
  connector, which uploads the build straight to Netlify and works *because* the
  repo is unlinked.
- **No direction-generating design skill** runs against this product; appliers
  and auditors only. **There is one ground — the light theme is dead.**
- **Open-Meteo is banned**: its free tier is non-commercial and this is a
  commercial product. Weather is `api.weather.gov`, and it REQUIRES a
  `User-Agent`.
- **Geoapify's attribution is settled.** Build exactly what `ROADMAP.md` § 6
  says and stop treating it as open.

→ `CLAUDE.md` for each of these in full; `DECISIONS.md` (start at its index) for
why.

## 6 · TRANSLATION IS SETTLED — two refusals, one reason

**WE TRANSLATE WHAT A BUSINESS SAYS, NEVER WHAT IT IS CALLED, AND NEVER WHAT A
REAL PERSON SAID.** Both are rules about WHOSE WORDS THEY ARE, not about
quality, so neither is a setting, a threshold or a review step.

- **Names stay as typed in every language** — business name, slug, custom domain,
  promo code, payment handle, and anything derived from them. Enforced by the
  `translations_never_a_name` trigger, not by a list somebody maintains. Service,
  add-on and plan names ARE translated.
- **Reviews and testimonials stay in the language they were written in.** A bad
  translation of a detailer's own description is his to correct; a bad
  translation of a review puts sentences in a named stranger's mouth. There is no
  version of that feature that fixes the objection.
- **A Spanish customer reading English reviews on a Spanish page is the correct
  outcome**, not a gap.
- **All three API keys already exist** in the Supabase secret store for
  `kguqylyzgyzfktkfnhjb` — `DEEPL_API_KEY`, `GOOGLE_TRANSLATE_API_KEY`,
  `GEOAPIFY_API_KEY`. **Never ask him for one.** Never echo, never log, never in
  any file under `app/`.
- **Changing an English string means changing its Spanish key in the same edit.**
  `app/src/lib/strings/appEs.js` is keyed on the English text, so a rename
  silently shows English on a Spanish screen with no error anywhere.

→ `ROADMAP.md` § WHAT WE NEVER TRANSLATE and § ALL THREE API KEYS EXIST.

---

## THE FILES TO OPEN, AND ONLY WHEN

| When your work is | Open |
|---|---|
| about to re-measure anything | **`docs/VERIFIED.md` FIRST** — a row there means do not measure it again |
| about to trust a check | `docs/check-audit-2026-09-13.md`, then `docs/check-coverage-gaps-2026-09-13.md` — what the instruments can and cannot see |
| spending Andrew's usage | `docs/ECONOMY.md` |
| a screen, a control, or a check | `docs/BAR.md` |
| picking up the next task | `ROADMAP.md` § Next, in order |
| about to re-find a known bug | `FOUND.md` — start at its first section |
| touching a subject `CLAUDE.md` governs | that section of `CLAUDE.md`, not the whole file |

**`docs/README.md` is the map of all 4.3 MB of markdown** and names each file's
tier: LIVE, REFERENCE or HISTORICAL. HISTORICAL means do not act on it.
