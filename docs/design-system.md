# Design system — "The Thread"

**Read this before touching anything a person looks at.** Every visual
decision in the product derives from this file. If a change contradicts it,
either the change is wrong or this file gets updated first — never silent
drift. Drift back to generic-SaaS defaults is the failure mode this document
exists to prevent.

**This file outranks any skill's opinion.** From roadmap 1.5 onward the
skill-collision rule is back on: auditors and appliers only
(`impeccable`, `animate`, `ship-check`). No direction-inventing skill runs
against this product again unless the owner reopens the direction.

## Where it came from

Replaces **"Raking Light"** (chosen 2026-08-27, deprecated as identity
2026-08-28 by the owner's decision in `DESIGN.md`). His answer when asked
what was worth keeping was *"Nah. Throw it out. It's all fine."* — so
nothing carries over from it as a look. The old file is anti-reference; its
useful residue is listed in **§11**.

The direction is **`docs/design-directions/5-the-thread.html`**, built
2026-08-29 and approved by the owner the same day — *"so much better", "the
layout is good, I like it"* — then taken through fifteen rounds of his
corrections. That file is the reference rendering and the tie-breaker: where
this document and that page disagree, **the page is right and this document
is stale**, because the page is what he approved.

The evidence underneath it, in the order it should be read:

| file | what it is |
|---|---|
| `docs/design-directions/README.md` | every round, what was found by looking, what it cost |
| `docs/design-directions/BUILD-BRIEF.md` | the plan — **§7 carries his answers and overrides §2** |
| `docs/design-directions/VERDICT.md` | why the first four directions were killed |
| `docs/references/ANALYSIS.md` | his seven reference sites read at code level — the frame |
| `docs/references/TASTE-NOTES.md` | his own words on how those sites MOVE (primary evidence) |
| `docs/design-brief.md` | the interview; §B4 and §B5 are the load-bearing answers |
| `docs/references/APPLE-READ.md` | one input among eight, not the frame — his instruction |
| `docs/design-knowledge.md` | the anti-slop floor; §1 is not negotiable by any skill |

---

## The idea

A detailer's Saturday already exists. It is just scattered across a text
thread, a Yelp inbox and a note on a phone. **The product does not add work;
it sorts what is already there.** So the interface is one continuous dark
ground that the reader travels down, and the work of the design is
*gathering* — scattered things resolving into ordered ones as you go.

That is why the signature move is four text messages becoming four rows of a
schedule, and why there is exactly one accent: the page is mostly the ground
and the type, and the green is what marks the thing that has landed.

Dark is not a mood choice and it is not a default. It was tested against the
one condition that would have killed it — *"Sunlight is NOT a constraint"*
(`design-brief.md` §B5): the dashboard is read before and after a job, not
out in the sun mid-detail. Dark stays on its merits.

---

## The laws

Not suggestions. Where a test enforces one, it is named.

1. **One continuous ground, and every section a different skeleton over
   it.** His words: *"throughout the entire website no one scroll area, one
   page looked the same — as you scroll everything morphs into different
   layouts."* Two sections that share a skeleton is the failure. The landing
   page runs nine sections and nine skeletons; a dashboard screen is not
   exempt, it just has fewer.
   *Enforced by `tests/composition.test.mjs`.*

2. **Something is always animating.** His requirement, recorded in
   `BUILD-BRIEF.md` §7 and easy to lose in a refactor. The ground carries
   drifting lights, a dot lattice and grain that never stop. A screen where
   all motion is triggered is a screen that is dead while you read it.

3. **Motion is not spendable.** *"I don't want us to lose any of that cool
   animations and scrolling effects... we might have to change them up,
   switch them, the order, maybe completely redo some of them."* Re-point a
   mechanic, re-order it, rebuild it — do not quietly end up with fewer
   because a new layout was easier to lay out flat. If a mechanic is
   deliberately dropped, say so and say why, the way round ten did.
   *Enforced by `tests/composition.test.mjs`.*

4. **Two motion presets and nothing else: reveal, and scrub.** One rAF
   listener, one ease, transform and opacity only. Ad-hoc durations are how
   a page ends up feeling like a pile of effects instead of one system.
   Exits are faster than entrances (`--t-exit` against `--t-reveal`).
   *Enforced by `tests/composition.test.mjs`.*

5. **Reveals are position-driven and reversible, and the arrival line is
   not the departure line.** An element arrives when its top crosses 82% of
   the screen; it does not leave until it is past the bottom edge. The band
   between them is exactly as wide as the easing at the end of a scroll
   container can travel, so the two lines can never cross and nothing
   oscillates. Two consequences that were both real bugs: the trigger line
   must stay reachable at maximum scroll, and **anything that changes the
   document's height must re-cache positions** — a `<details>` toggle, a
   font arriving, a width change.

6. **A pin must return more than it costs, and it declares its cost.** A
   locked section's floor is about **1.8 screens** before any beat happens —
   one screen of sticky stage plus the stillness budgeted at each end — so
   the question is never "should this pin" but "does it buy two screens".
   The thread holds 3.0 screens for four beats and prints *"holds for 3.0
   screens · then releases"* on itself. Nothing else on the product pins.

7. **Distribute the beats linearly across a hold; ease each beat
   individually.** Easing the whole hold crushes every beat into its middle
   — measured, and worse than the problem it was fixing. Inside a lock the
   page also gets heavier: a wheel notch carries half as far and the
   smoothing may not bank more than 0.55 of a screen. See DECISIONS.md,
   "Ease the beat, not the hold".

8. **Two faces, and every figure is monospaced.** Archivo worked across
   both axes, JetBrains Mono for money, time and counts, with
   `font-variant-numeric: tabular-nums`. A price set in the body face is a
   bug. See §5.
   **Never put `font-variation-settings` on a root element.** It inherits,
   and it beats `font-weight` — declaring the default instance on a page root
   looks harmless and silently pins every descendant to weight 400: every
   `<strong>`, every 500-weight price, every selected chip. Set both axes
   explicitly on the roles that need them and leave `font-weight` working
   everywhere else. Cost a real bug in 2.1.
   *Enforced by `tests/composition.test.mjs`.*

9. **Legibility beats style, and it is measured, not eyeballed.** Text
   ≥ 4.5:1 on every surface it sits on; large bold ≥ 3:1; non-text
   interactive edges ≥ 3:1 — **and a CHART BAR is one of those**, which
   nobody had measured until 2026-09-01: Money's bars were 26% and 34%
   of their colour, **1.51:1 and 1.68:1** on `--ink-0`. A bar is the
   graphical object the content is IN, not decoration around it. 60% and
   65% clear it. A ramp's dim end is a contrast floor, not a
   taste call — `--fog-2` exists at `#7B858A` because `#6B757A` measured
   4.22:1 and that ramp carries every 10–13px label. **Text on a photograph
   cannot be checked from CSS**: screenshot the box with the text hidden,
   read the lightest pixel, and bind the scrim to the text block rather than
   darkening the whole picture until it stops being one.
   **Measure the WORDS' own boxes, and hide the words, not the block.**
   Learned in 2.2 by getting it wrong: the text block's box includes the
   padding above the words, where the scrim's gradient is still transparent,
   so measuring it returns the photograph rather than what the words sit on —
   1.34:1 against a true 10.41:1. The scrim on the block is the thing doing
   the work, so hiding the block removes the very layer being tested.
   *Enforced by `tests/design-contrast.test.mjs`.*

10. **Never a grey placeholder box.** The Unsplash connector is wired and
    confirmed working. If it cannot find the right shot, **ask the owner** —
    he has said plainly he will go and source images rather than have work
    limited by what is to hand. And one distinction written into the markup
    so a later session does not "fix" it: **no photograph of a car is ever
    the platform's own subject** (we sell software), but photographs of
    their own work are what a *tenant's* site is made of.

11. **The tenant's accent applies EVERYWHERE, including their dashboard.**
    **CHANGED BY THE OWNER 2026-08-30**, after roadmap 2.3 shipped the
    previous version of this law and asked him to confirm it. He said no:
    *"I think that we should have them be able to customize their admin
    dashboard accent color, because I think that the majority of accent
    colors will work… it's just with black, so almost anything goes with
    black or a darker colour."* So a detailer picks one colour and it paints
    their booking page, their site AND their own dashboard.

    What this replaces: *"the house accent is fixed; the tenant's accent is
    customer-facing only… the dashboard keeps one fixed house palette."* That
    reading came from his own earlier remark that a detailer "probably doesn't
    really care about the admin dashboard colour scheme"
    (`docs/design-brief.md` §B6b), which was flagged there as an assumption
    and never confirmed. It is now answered, the other way.

    **What does NOT change.** `#38E08B` stays the HOUSE default — what a
    business that has picked nothing gets, and what the marketing page uses.
    `app/src/lib/theme.js` remains the ONLY file allowed to compute or write
    colour from JS. And the two-value rule below still holds on every
    surface: a fill clears 3:1, and the same colour as words clears 4.5:1.

    **The ground each is corrected against is per-surface, and it is not
    always the ground the surface paints.** This sentence read "the ground
    both are corrected against is `--ink-0`" until it was swept and
    measured — see § Tokens, "Which ground an accent is corrected against".

    **What this costs, stated plainly because it is the reason the old
    reading existed:** every dashboard screen now has to survive an arbitrary
    tenant colour, which `docs/design-knowledge.md` §4 calls the hardest
    visual problem in the product. It is bounded by the correction in
    `lib/theme.js`, by law 11b below, and it has to be swept at the extremes —
    `node scripts/accent-sweep.mjs`, which does the twelve presets, neon,
    black and white on every run.

11b. **The accent is IDENTITY. It never carries MEANING.** *The owner's rule,
    2026-08-30, roadmap 2.4:* "Not everything, not every single colour needs to
    be changed just because they changed the accent colour… the paid should
    always be green because that's just kind of paid. Money green is all kind
    of cohesive… the accent colour is more like the mark complete button, or
    the calendar highlight — what day it is — and the outline for month, and
    the colour theming on the money page."

    So the product now has two kinds of colour and they must not be confused:

    | | Carries | Follows the tenant? | Where |
    |---|---|---|---|
    | `--accent*` | identity | **yes** | actions, navigation, selection, focus, today's disc, the selected day, chart bars, **the completed node on the day rail** |

    **~~"THE 'IT LANDED' NODE" IS AMBIGUOUS AND ROADMAP 2.11 STEP 4 SPLITS IT.~~
    SPLIT AND SHIPPED, 2026-09-01, roadmap 2.11 step 6** — the row above and the
    `--ac` row below now say which node each carries, and `theme.css`'s
    `.dayrail > .landed` / `.dayrail > .paid` draw them. The reasoning, kept
    because it is what stops the split being re-argued:
    It reads as either *finished* or *paid*, and that ambiguity produced a real
    defect: the day rail paints a PAID job in the tenant's accent while the
    calendar paints the same fact `--ac`. The ruling is that `--accent` carries
    the **completed** node and `--ac` the **paid** one, which is what the
    calendar already does. **The table row above is corrected in the same
    change that ships the rebuilt Today screen** (roadmap 2.11, step 6);
    `docs/dashboard-screen-designs-2026-08-31.md` §16 is the reasoning, and the
    paragraph below is answered by it rather than overruled — the accent stays
    on every finished-and-unpaid node, on the lit card's bloom and on every
    button, so it does not leave the screen the detailer opens every morning.
    | `--ac` (green) | meaning: paid, money up, it worked | **no** | `.pill.paid`, `.badge.paid`, `.dot.paid`, **the paid node on the day rail**, `.delta.up`, `.ok-box`, Money's `tone="good"` figure |
    | `--bad` (red) | meaning: cancelled, no-show, error, destructive | **no** | `.pill.cancelled`, `.error-box`, `.btn.danger`, `--bk-danger` |

    **Why it is a law and not a preference.** Paid-is-green and error-is-red
    are conventions a customer already knows before they open the product; a
    brand colour does not get to overwrite them. Concretely, on the accent a
    red-branded business — 48% of this trade, see DECISIONS.md → "Roadmap
    2.4" — got a red "Paid" beside a red "Cancelled", a red ▲ beside a red ▼,
    and an `.ok-box` identical to the `.error-box` above it. The rule removes
    all three at the root rather than patching each.

    **The judgment call inside it, recorded so it is not re-derived.**
    *Completed* stays on the accent while *paid* moves to green. A finished
    job is not money, "mark complete" is the owner's own example of an
    accent-side control, and the Today rail's landed node is the one place
    the detailer's colour appears on the screen they open every morning —
    moving it to green would put the house colour back on their main screen,
    which is what law 11 was rewritten to stop. Flipping it is a one-line
    change in `theme.css` if that reading is ever rejected.

    **`grep 'var(--ac)'` in `theme.css` finds every fixed-meaning site.** That
    file's token block used to say "below here there is no `var(--ac)` left";
    that rule is now exactly inverted, and the comment says so.

12. **Measure with layout values, not with transformed boxes.** This design
    animates by transform almost exclusively, so `getBoundingClientRect()`
    returns a scaled box for most of it. Anything measured *for layout*
    wants `offsetLeft` / `offsetWidth`; a rect is correct only when you
    genuinely need where a thing is on screen right now. And `offsetTop` is
    a document coordinate only when the offset parent is the body — inside a
    positioned section it is not. Both of these have already caused real
    bugs; see DECISIONS.md.

13. **No third-party JavaScript.** No GSAP, no ScrollTrigger, no Lenis, no
    Three.js. The whole of the direction's motion is hand-rolled and smaller
    than Lenis alone. This is not asceticism: it closed the GSAP Club
    licence question by not having it, which matters for something we sell.
    *Enforced by `tests/composition.test.mjs`.*

14. **One ground. There is no light theme.** Owner decision 2026-08-30 —
    *"no light theme needed"* — and it is a decision about the dashboard's
    light/dark switch, which goes. The light band (`--paper`) is the only
    light surface in the product, and it is a change of ground inside a dark
    page, not a second palette. **Removed 2026-08-30 in roadmap 2.3** — there
    is no `data-theme` attribute left anywhere in the product, and `:root`
    carries `color-scheme: dark` so native controls follow. The five places
    it touched are listed at the end of this file.

15. **A selected thing's hover moves the SAME WAY its selection does.** The
    owner's rule, walkthrough W24, 2026-08-30, and the clearest interaction
    note he has given: *"when you hover over something that's already
    selected, it kinda goes to like a darker color… it almost feels like
    you're unselecting it when you're not."* He was right and it was real —
    `.bk-card.selectable:hover` had no `:not(.selected)` and outranked
    `.bk-card.selected`, so hovering the service you had chosen replaced its
    accent ring and its lift with a plain grey hairline.
    **More hover means more selected, in that control's own language:** a
    tint gets more tint (`.chip.active`, `.choice.on`, 15% → 20%), a ring gets
    thicker and lifts further (`.bk-card.selected`), a lift lifts more
    (`.segmented button.on`). Never a different colour, never a darker one,
    and never nothing where the unselected version brightens.
    **Two things this law does NOT ask for.** A hover that is already scoped
    away from the selected state is not broken — it does not move against the
    selection, and adding one to a *solid accent fill* costs a floor: for a
    very dark tenant accent the corrected fill is a mid grey carrying white
    ink, and brightening it drops that label from 4.95:1 to 3.84:1. So
    `.bk-chip.selected` and `.bk-cal .cell.selected` were deliberately left
    alone. And a hover for a state nothing renders is speculative code:
    `.cal-cell.selected` is dead CSS and did not get one.
    **Raising a tint is not free** — it is the ground `--accent-text` is
    corrected against, so it moves `lib/theme.js` too, and
    `scripts/accent-sweep.mjs` fails if the two drift apart.

---

## Tokens

Defined once. The direction file holds them in its own `:root`.

**Where they live in the app — SETTLED 2026-08-30 (roadmap 2.3).** All
sixteen now live on `:root` in **`app/src/theme.css`**, which is the
system's home in the app. `tests/design-contrast.test.mjs` switches its
source to that file the moment it defines `--ink-0`, so the reference page
is no longer what the app is measured against, and the outgoing-palette
blocks in that test stopped running by themselves.

The other two surfaces **keep their scopes**, and that was the decision 2.3
was asked to make. `app/src/book/booking.css` holds them under `.bk` with
`--bk-*` names (2.1, because its accent is injected per tenant by
`lib/theme.js`) and `app/src/landing/landing.css` under `.ld` with the
system's own names (2.2, because nothing is injected there). The reason
they were scoped — `:root` flipping with the dashboard's light/dark switch —
is gone with the switch. Two reasons that are not gone kept them: each file
staying self-contained is what makes it diffable against the reference
rendering, and `theme.css` is still a GLOBAL sheet whose bare selectors
reach into both pages. `design-contrast` pins all three sets against each
other, so they cannot drift apart.

### The ground — cool-biased, so no pure mid-grey ever appears

| Token | Value | Job |
|---|---|---|
| `--ink-0` | `#0B0D0E` | the ground everything sits on |
| `--ink-1` | `#111417` | a surface lifted off it |
| `--ink-2` | `#171B1E` | the top of a panel gradient |
| `--ink-3` | `#1E2327` | the highest surface |
| `--line` | `#272D31` | every hairline and inset ring |
| `--line-2` | `#333B40` | a line that has to be seen |
| `--fog` | `#939CA1` | secondary prose |
| `--fog-2` | `#7B858A` | 10–13px labels — **the floor, do not darken** |
| `--bone` | `#F2F1EC` | the dominant: warm, **never `#fff`** |
| `--bone-2` | `#CFD2CE` | bone stepped back |

### The one sharp accent

| Token | Value | Job |
|---|---|---|
| `--ac` | `#38E08B` | signal green — the thing that has landed |
| `--ac-deep` | `#0E5C36` | the accent at rest, on light |

**An accent has two jobs and they take different floors.** As a FILL — a
button face, a selected day, a ring — it clears **3:1**, the non-text
minimum. As WORDS — a running total, a link, a status line — it is small
text and clears **4.5:1**. For the house green those are the same colour; for
a *tenant's* accent they are not. Crimson `#DC2626`, a real preset, measures
**3.27:1** on `--ink-0`: it passes as a fill and fails as type. So
`lib/theme.js` corrects twice and hands out two values —
`--bk-accent` / `--bk-accent-text` on the booking page, `--accent` /
`--accent-text` on the dashboard. **Any surface that prints the tenant's
colour as words takes the text variant**, and that includes every tenant site
built in Phase 3. Found and fixed in roadmap 2.1; see DECISIONS.md.

#### Which ground an accent is corrected against

**Not always the one the surface paints — measured 2026-08-30, roadmap 2.3
reopened.** Correcting against a ground guarantees a floor *on that ground and
nowhere else*. So the question is not "what colour is this page" but **"what
is the lightest thing this accent can land on"**, because lighter ground means
lower contrast for these colours.

| Value | Corrected against | Why |
|---|---|---|
| Dashboard **fill** `--accent` | **`--ink-3`** `#1E2327` | The accent does not stay on the ground. `.cal-cell.today` sits in a panel, `.pill` and `.badge` sit on cards, `a` can be anywhere. |
| Dashboard **text** `--accent-text` | **`--ink-3` mixed 20% with the corrected fill** | **Corrected again in roadmap 2.6 — the row above was still not far enough, and this was a LIVE defect.** A tinted panel is not `--ink-3`: it is `--ink-3` with the accent ITSELF mixed into it, which is lighter again. `.chip.active` and `.choice.on` are 15% of the accent, 20% while hovered; `.pill.completed` and `.badge.completed` are 11%; the selected tab is 12%. Measured across the twelve presets and the extremes, **nine presets plus black and near-black were under 4.5:1**, worst 3.92 on a selected chip. `dashboardTextBg()` in `lib/theme.js` computes the ground; the 20% must stay equal to the largest tint `theme.css` paints under `--accent-text`. |
| Booking **fill** `--bk-accent` | **`--ink-3`** `#1E2327` | **Corrected in roadmap 2.4 — it was `--ink-0` and that was a LIVE defect.** `.bk-card.selected` draws its accent ring on `linear-gradient(166deg, var(--bk-lit), ...)`, whose top is `--ink-3`, and `.bk-cal .cell.today` rings a lifted cell. On `--ink-0` Violet measured **2.78:1** there, Slate 2.62, a black pick 2.56 and a deep navy 2.51 — all under the 3:1 fill floor, on the ring that is the only thing telling a customer which service they picked. |
| Booking **text** `--bk-accent-text` | `--ink-0` `#0B0D0E` | Stays. `booking.css` prints it in exactly two places and both are borderless rows on the ground. Checked in 2.3, re-checked in 2.4. Pushing it to `--ink-3` would move every tenant colour further from the owner's pick on the surface their customers see, to buy a floor it already clears. |

**The rule underneath all four rows is one sentence: correct against the
lightest surface THAT VALUE can land on.** Roadmap 2.6 is the third time this
file has had to be pushed one surface further in, and the pattern in all three
is the same: the ground was named from the STYLESHEET's surface tokens, and the
value was actually landing on something built out of the accent. **A tint of
the accent is a ground.** If a rule paints `color-mix(… var(--accent) N% …)`
and something prints `--accent-text` on it, that mix is the ground to correct
against, not the token underneath it. Not the ground the page paints, and
not one answer per page — the fill and the text of the same accent can need
different grounds, and on the booking page they do. `accentTriple()` takes both.
`scripts/accent-sweep.mjs` measures the booking page's values on its own
surfaces every run, and reverting the fill ground makes it exit 1 with those
four numbers.

**This was a real defect, not a precaution.** When law 11 was rewritten and
the dashboard started taking the tenant's colour, the correction was still
against `--ink-0`. Sweeping the eight presets showed **six of them under the
4.5:1 text floor on a panel**, and violet and slate under even the 3:1 *fill*
floor on `--ink-3`. `scripts/accent-sweep.mjs` is what found it, prints all
three grounds, and exits non-zero if it ever comes back.

It costs almost nothing: **the house green does not move at all** (`#38E08B`
clears 9.21:1 on `--ink-3` by itself), and six of the eight preset *fills* are
unchanged. Only violet and slate shift, slightly. The text variants push
further, which is the 4.5:1 floor doing its job.

### The one warm value

| Token | Value | Job |
|---|---|---|
| `--bad` | `#E2705F` | an error, and a destructive control's edge |

**Added 2026-08-30 in roadmap 2.1, and deliberately NOT invented.** The
approved reference page contains no red at all — it is a marketing page with
no error states — so there was nothing to derive from and a hole where every
later screen would have invented its own hex, which is the named failure mode
(`design-knowledge.md` §2). `#E2705F` is the value the product *already*
ships in the outgoing dashboard palette: continuity rather than a new
decision. It measures **6.23:1 on `--ink-0`** and **5.54:1 on `--ink-2`**,
both above the body floor.

**"It is the only warm value anywhere in the system, so it can never be
confused with the accent" — that sentence stood here until 2026-08-30 and law
11 killed it.** It was true while the accent was fixed at signal green. Now a
tenant picks the accent, and two of the eight presets are warm reds:
corrected for text, **Crimson lands at `#E55B5B`, which is ΔE 11.4 from
`--bad`** — close enough to read as the same colour at a glance. On a screen
that shows a *paid* pill and a *cancelled* pill together, the same red would
then mean both "good" and "bad".

Measure it with `node scripts/accent-sweep.mjs`. Ember (ΔE 35.9) and
everything else are clear; Crimson is the only one at risk.

**The fix is NOT to drop red — decided by the owner 2026-08-30**, against the
recommendation to prune the presets. His reason is a business fact: *"a lot of
detailers' color is probably red"*, so a list with no reds in it excludes real
customers. He wants MORE colour coverage, not less, plus a custom picker that
classifies any colour into a hue family. See
`docs/owner-walkthrough-2026-08-30.md` → D2, which also carries his explicit
instruction that the shape of the fix is an engineering call and not his.

**Two things that follow, and they are law:**

1. **Never invent a second red.** A new error colour to dodge a tenant's red is
   the failure mode `design-knowledge.md` §2 names, and red-for-error is a
   stronger convention than any tenant's brand. *This is about `--bad`, the
   error colour. It has never been about the preset list — 2.4 added a second
   tenant red (Rose) on evidence, and that is a different thing.*
2. **Status must not be carried by colour alone.** — **DONE, roadmap 2.4,
   2026-08-30.** Circles are jobs, squares are the day, a bar is a job that did
   not happen; `--bad` left the calendar entirely. The vocabulary and the
   measurements are `docs/dashboard-skeletons.md` §5b.

**Three things 2.4 established that supersede the analysis above.**

- **The collision was never red-only.** Measured on the shipped markup, a
  *silver* accent collided with the "booked" ring at ΔE 8.5 and a *near-black*
  accent with the blocked-day grey at ΔE 17.1 — the silver case is exactly as
  severe as the red one. So the fix is a form vocabulary that always holds, not
  a branch that fires on red.
- **Dropping Crimson would not have worked either.** A deep red typed into the
  custom picker corrects to `#E26666`, ΔE **8.5** from `--bad` — closer than
  Crimson's 11.4. The preset list was never the lever. The owner's instinct was
  right for a reason the recommendation did not have.
- **The real fix is law 11b: the accent is identity, never meaning.** Paid is
  always green, cancelled and errors are always red, for every tenant. That
  removes the red-on-red pairing at the root instead of patching each site.

It is the one token that is **not** in the reference page, for the reason
above, so it is exempt from the sixteen-token drift check in
`composition.test.mjs` — `design-contrast.test.mjs` measures it against this
document instead. If the owner wants a different red, this is the single
place to change it.

Signal green because orange was ruled out by name and he flagged his own
lean toward blue as *"kind of typical AI"*. One dominant plus one sharp
accent, never a timid even palette — `design-knowledge.md` §1.

### The light band

A light section is a **change of ground**, not a card. Warm off-white, never
paper white.

| Token | Value |
|---|---|
| `--paper` | `#EFEEE7` |
| `--paper-ink` | `#12161A` |
| `--paper-fog` | `#565F64` |
| `--paper-line` | `#D2D1C9` |

Two light bands on the landing page, and they are rhythm work as much as
emphasis: three added sections in a row without one leaves eight dark
screens together.

### Layout

| Token | Value |
|---|---|
| `--wrap` | `1180px` |
| `--gut` | `clamp(20px,5vw,48px)` |

Radii are a small set, used by role and not by habit: `100px` for pills
(nav, buttons, small state chips), `16–18px` for panels, `11–13px` for
sunken and inset blocks, `50%` for dots. `rounded-lg on everything` is a
named tell.

#### The corner is a SQUIRCLE where the browser can draw one — one token, and it degrades

**THE OWNER'S ASK, 2026-09-01:** *"One thing: I want everything to be a
squircle. Like, the kind of professional rounded corners that Apple has."*

A `border-radius` corner is a circular arc: the curvature jumps from zero to
maximum at the point the straight edge ends. Apple's corner is a
**superellipse** — the curvature ramps in, so the corner reads as continuous
rather than as an arc stuck onto a line. That is the whole difference, and it
is why an Apple corner looks softer at the same radius.

**The route is `corner-shape: squircle`, set ONCE next to the radii**, and the
reason is that it is additive: a browser that does not know the property draws
the `border-radius` it already draws. There is no fallback to write, no
feature query, and no second corner language.

```css
:root { --corner: squircle; }
.card, .btn, .chip, .sheet, .record, .cal-cell, … {
  corner-shape: var(--corner);       /* ignored where unsupported */
  border-radius: var(--r-panel);     /* unchanged, and still the shape */
}
```

**BROWSER SUPPORT, MEASURED 2026-09-03 rather than assumed** — from
`api.webstatus.dev/v1/features/corner-shape` and MDN's browser-compat-data:

| | |
|---|---|
| Chrome / Chrome Android / Edge | **139+**, shipped 2025-08-05 |
| Safari (macOS and iOS) | **no** — Technology Preview only |
| Firefox | **no** |
| Baseline | **limited** |

**So the detailer sees squircles at a Chrome desk and does not see them on an
iPhone**, because every iOS browser is WebKit. That is the honest cost and it
is the one thing the owner has to agree to. It resolves itself: when WebKit
ships the property, the corners change on their own with no release from us.

**THE TWO ALTERNATIVES ARE REJECTED, AND ONE OF THEM FOR A REASON THAT IS NOT
OBVIOUS.**

- **A Houdini paint worklet is Chromium-only too** — `CSS.paintWorklet` is
  Chrome 65+, Firefox never (bugzil.la/1302328), Safari never
  (webkit.org/b/190217). Verified from browser-compat-data on 2026-09-03. **It
  costs a JS paint pass per element and reaches exactly the same browsers as
  the free property**, so it is strictly worse. Do not re-propose it on
  rediscovering that `corner-shape` is Chromium-only; that is the same fact.
- **An SVG mask is the only route that reaches Safari, and it is the expensive
  one.** A mask composite on `.card`, `.chip`, `.btn`, `.cal-cell` and
  `.row-item` — components that appear in the hundreds on one calendar month —
  is a real frame cost on the least powerful device the product runs on. And
  it takes the hairline with it: a mask clips the element's own 1px
  `var(--hairline)` border at the corner, and this system draws that border on
  nearly every surface, so the mask route is a border rewrite as well as a
  corner one.

**DO NOT HAND-ROLL A SQUIRCLE ON ONE COMPONENT.** The value belongs in the
token next to the radii, or the product ends up with two corner languages —
which is a worse outcome than having one corner language that is rounder on
some browsers than others.

**IT IS ON BOTH TOKENISED SURFACES, AND THAT IS THE SAME RULE ONE LEVEL UP.**
Every surface in this product defines its own copy of the radii (§ Tokens), so
a corner set on one of them is a corner the others drift away from —
`theme.css` gets `--corner` and `booking.css` gets `--bk-corner`, because the
detailer's page and the customer's page having different corners is precisely
the two-corner-languages outcome the paragraph above forbids.
`tests/composition.test.mjs` 8a sweeps both, and asserts on each that the check
HAS SUBJECTS so renaming the radius tokens fails loudly rather than going
quiet.

**THE LANDING PAGE IS DELIBERATELY NOT DONE, AND IT IS WITH THE OWNER.**
`landing.css` and the approved reference rendering
(`docs/design-directions/5-the-thread.html`) use **literal pixel radii** — 16,
13, 11, 18, 100, 50% — and no radius tokens at all, so there is no token to
change: it is ~20 hand edits across the page he signed off pixel by pixel, and
the reference rendering would have to move with it or the two stop agreeing.
That is a different-sized decision from a token, so it was raised rather than
taken. See roadmap 2.17.

### Motion

| Token | Value | Job |
|---|---|---|
| `--e-out` | `cubic-bezier(.16,.84,.34,1)` | the only curve |
| `--t-reveal` | `950ms` | an entrance |
| `--t-exit` | `420ms` | a departure — faster, and unstaggered |
| `--t-hover` | `180ms` | pointer feedback |

There is deliberately **no second curve for pinned beats.** A message
leaving while a row arrives is an exit and an entrance, which takes the
ease-out above; the gentleness at the ends of a lock comes from budgeted
stillness, not from bending the curve.

#### The dashboard's own reveal — 420ms, not 950ms

**Set 2026-08-30 by the owner, reopening roadmap 2.3** after he looked at the
restyled dashboard: *"when the page loads, the page animations and loading,
it's perfect, but the GUIs just take a little too much time to go up and do
the load-in animation. So if you can make that just a little speedier."*

The four durations above are the **landing page's**, and 950ms is right
there: you meet each section once, on the way past, and the reveal is part of
the argument the page is making. A dashboard is a tool opened forty times a
day. At 950ms with a 55ms stagger the last card on a screen settled **1.16
seconds** after it appeared, which made the entrance the slowest thing on the
product's most-used surface.

`app/src/theme.css` therefore defines its own copy of these tokens:

| Token | Landing / reference page | Dashboard (`theme.css`) |
|---|---|---|
| `--t-reveal` | `950ms` | **`420ms`** |
| `--t-exit` | `420ms` | **`180ms`** |
| `--t-hover` | `180ms` | `180ms` |
| `--e-out` | `cubic-bezier(.16,.84,.34,1)` | same — **one curve, always** |

Stagger drops with it: **40ms** on `arrive` (was 55) and on `bar-rise` (was
60), so the tail of the screen does not land late. The last element now
settles at **580ms**.

**This is not a fifth duration and not a second system.** Both dashboard
values are numbers the system already holds — 420 is `--t-exit`, 180 is
`--t-hover` — so nothing new was invented, and every surface already defines
its own copy of these tokens (`landing.css` under `.ld`, `booking.css` as
`--bk-*`). The curve is not per-surface and never will be.

`--t-exit` had to come down with it for two reasons. Law 4 says an exit is
faster than an entrance, and at 420/420 it would not have been. And it
corrects a pair that was **already** inverted before this change: the sheet
backdrop faded in at `--t-hover` (180ms) and out at `--t-exit` (420ms), so
leaving took longer than arriving.

`tests/composition.test.mjs` test 5 reads the **reference page**, not
`theme.css`, so it still measures 950/420 and is unaffected — which is
correct, because it is testing the system's own page.

#### ANYTHING THAT OPENS, ANIMATES IN — the budget grows, on purpose

**THE OWNER GREW THIS BUDGET DELIBERATELY, 2026-09-01, and confirmed it
2026-09-02. This section used to say the opposite of what he asked for**, and
a session that reads only the three bullets in `dashboard-skeletons.md` §4
will still find the old answer. Both halves are one rule now.

> "There's a few things I just don't like — I don't have animations. For
> example, on the booking page, when I click on a booking, it just kind of
> spawns in on the side, like, instantly with no animation. It just instantly
> opens, which kinda goes against a lot of the stuff that we usually do —
> usually every single UI that opens has an animation."

> "And have that as a keynote for the entire site. As the design process is
> going, everything should have a very nice animation. That makes everything
> feel very fluid and connected — **without being in the way of actual
> productivity and usability**."

> *(2026-09-02, confirming it had stuck)* "Throughout the site, there's
> multiple points where stuff just kinda pops into place, and there's no
> fluid animation. Keep that in mind when we build future things so it's
> already there; but for the past things, it needs to get revised. **It's for
> desktop** — desktop's the majority of the things where you click something
> in the calendar, you click a booking, whatever, and it just instantly pops."

**The last clause of the second quote is the acceptance test, not a caveat.**
*Fluid and connected, without being in the way of productivity.* Three things
follow from it and they are the whole law:

- **Interruptible.** Nothing waits for an animation to finish. A record that
  is being replaced by another record does not play an exit first.
- **Fast.** An entrance you meet forty times a day is `--t-exit` (180ms), not
  `--t-reveal` (420ms). 420 is right for a screen you meet once and is a gate
  on a thing you do seven times in two minutes. *(That distinction was learned
  in roadmap 2.11 step 6 stage 7 and it is the same one here.)*
- **Never a gate.** The thing you tapped for is on screen and usable at frame
  one; the motion is the last 14px and the last of the opacity, not the wait.

**THIS DOES NOT CONTRADICT THE THREE-ITEM BUDGET ABOVE IT — it is a fourth
item with a different subject.** The budget in `dashboard-skeletons.md` §4 is
about a screen's ARRIVAL: one stagger on first paint, and no more. This is
about a thing somebody OPENED. It appeared because a person clicked, and **it
has to come from somewhere.**

**A NEW COMPONENT THAT OPENS SHIPS ITS ENTRANCE AND ITS EXIT IN THE SAME
CHANGE.** Not the entrance now and the exit later — an exit is the half that
gets skipped, and `.record` had a sheet's entrance below `--wrap` and a hard
cut at a desk for the whole life of the second column.

**Where it comes from is the design, and the answer is different per
container:**

| It opens as | It comes from | Keyframes |
|---|---|---|
| a bottom sheet, below `--wrap` | the bottom edge it is anchored to | `sheet-in` / `sheet-out` |
| the SECOND COLUMN, at or above `--wrap` | **its own side** — 14px of X, because the column edge is where it came from, not the top of the page | `column-in` / `column-out` |
| a screen taking the main area (a tab, the gear, the setup form) | the screen's own staggered arrival | `arrive` — **it already has one, do not give it a second** |

**14px and 180ms are numbers the system already holds** — `arrive` travels
14px, `step-fwd` travels 14px on X, and 180ms is `--t-exit`. Nothing new was
invented here, which is the same argument the 420/180 table above makes.

**REACT UNMOUNTS, SO AN EXIT NEEDS A `leaving` STATE.** There is no CSS-only
exit for an element the tree removes. `components/Sheet.jsx` has carried the
pattern since it was written — `setLeaving(true)`, then `setTimeout(onClose,
180)` — and `RecordHost` and `SettingsHost` use the same one rather than a
second mechanism. **The timeout and `--t-exit` must move together.**

**AND THE EXIT IS SKIPPED WHEN THE RECORD IS BEING REPLACED**, which is the
acceptance test doing work: clicking job B while job A is open is one gesture,
and playing A out before B in puts 180ms between a tap and the thing tapped
for. Replacement changes the content in place.

**WHAT MUST NOT ANIMATE, and this is measured rather than assumed.** A
container swap that REMOUNTS the thing you were already looking at reads as a
page refresh — his words: *"it's almost like I refresh the page when I click
on something. I don't want everything to disappear and come back."* The
calendar did exactly this: picking a day swapped `.group` for `.split.calday`,
React threw away the month subtree and rebuilt it, and `arrive` re-ran on the
whole left column while the NEW day panel animated not at all. **The wrong
element was moving.** The fix is a stable container, not a nicer animation —
see `docs/dashboard-skeletons.md` §4.

**Verified by reading `document.getAnimations()` on the live dashboard, never
from the stylesheet.** A selector that matches nothing looks exactly like a
finished screen; roadmap 2.11 step 6 shipped Today's whole arrival dead for
that reason, and stage 3 shipped another. 120ms after the click, list what is
actually running.

### Atmosphere

Never a flat solid background. The ground carries, in this order of cost:
an SVG `feTurbulence` grain as a data URI at `opacity:.055` with
`mix-blend-mode:overlay`; two slow drifting radial lights; a drifting dot
lattice; and a pointer light on fine-pointer devices only. All four are
CSS-driven and none of them stops — that is law 2.

---

## Type

Two faces. Loaded from Google Fonts, both variable where it matters.

```
Archivo        wdth 62..125, wght 100..900   — everything that is words
JetBrains Mono wght 400;500                  — everything that is a figure
```

**Archivo alone, worked hard across both axes**, is the high-contrast
pairing `design-knowledge.md` §1 asks for — one variable font at its
extremes beats two safe families. The width axis carries as much of the
hierarchy as the weight axis does, which is the part that is easy to lose:

| Role | Class | Size | Axes |
|---|---|---|---|
| Display | `.disp` | `clamp(38px,6.4vw,86px)` | `wdth 112, wght 700` |
| Display, hero | `.disp.xl` | `clamp(38px,5.15vw,74px)` | `wdth 116, wght 760` |
| Display, small | `.disp.sm` | `clamp(26px,3.4vw,42px)` | `wdth 108, wght 640` |
| Eyebrow / label | `.lab` | `11px`, `.22em`, uppercase | `wdth 72, wght 620` |
| Lede | `.lede` | `clamp(17px,1.7vw,21px)`, `56ch` | inherits |
| Body | — | `17px / 1.5` | `wdth 100, wght 400` |
| Every figure | `.mono` | by context | tabular-nums |

Size jumps are 3x or more, not 1.5x. Display line-height is `.94` with
`-.028em` tracking; at that size the default leading is a hole.

**A display size is derived from a measurement, not from taste.** The hero
clamp is what it is because the longest rotating tail measured 741px inside
a 742px column at 1440 and was wrapping. Below 470px the *width* axis
absorbs it rather than the size, so a phone keeps a 38px headline. Any
change to a display string re-measures the longest one at 392, 1440 and
1920.

---

## Composition

- **A collection of records is a ruled list.** A card is for an object you
  pick between or act on one at a time. Mapping records onto cards is the
  specific shape that keeps coming back and it has its own test.
- **Two to four choices is a segmented control, never a native `<select>`.**
  **FIVE IS STILL A SEGMENTED CONTROL** (Money's period switch, 2026-09-01).
  The rule is about the `<select>`, not about the count: a fifth mutually
  exclusive choice does not become a drop-down, it wraps. Below 700px that
  one goes full-width and wraps **3 + 2**, which is the shape § THE 320
  FLOOR already gives a segmented control that will not fit.
- **Numbers only on sequences.** `01 / 02 / 03` on content that is not a
  sequence is the "structure as decoration" tell. The pricing terms are
  numbered because they are an enumeration; the comparison table's rows are
  not.
- **A table when it genuinely is one** — a comparison across two axes. The
  landing page has exactly one and nothing else on the page is tabular.
- **Native elements before hand-rolled ones.** The FAQ is
  `<details>`/`<summary>` with `::details-content` and `interpolate-size`
  behind an `@supports` guard: no script, no ARIA to get wrong, keyboard and
  screen-reader behaviour free, and it survives every script on the page
  failing.
- **Centred exactly once, at the end.** Centred everywhere is the tell.
- **A column of identical full-width buttons is a column of identical
  sections** — the same tell as "five identical full-width stacked sections"
  (`docs/design-knowledge.md` §1), and it arrives by accident rather than by
  choice: buttons dropped straight into a flex column inherit its SECTION gap,
  so each one lands as a page-level block. Two rules follow. **Actions are a
  GROUP with its own tighter rhythm**, not siblings of the content above them.
  And **three or more actions take three weights** — filled, ringed, ringless
  — because a set where everything is equally loud has no first thing, and a
  destructive action weighted the same as a convenience is a hazard, not a
  neutral choice. Where the tiers collapse to a stack on a phone, the weights
  are what still carry the order. Roadmap 2.4, the customer manage page.

---

## Verification

Visual work is verified by **looking**, and the report says what was
observed — never "this should work".

- Screenshot at **1920, 1440x900, 768x1024 and 392x844.** The three small
  ones are a floor, not the whole check. **1920 is the owner's own monitor**
  and it is where "there is not enough content to fill the viewport" bugs
  live; they get *better* on a phone. The 01/02/03 rail was broken at 1920
  from the day it was built and three checks missed it.
- Read the console at every width, in the normal path **and `?lite=1`.**
- Sweep the reveals down **and back up** — an element above the arrival line
  and still hidden is a defect; some element still hidden below the fold at
  almost every position is the proof the reveal was not simply switched off.
- **Baseline a new check against the last known-good version before
  believing what it says about your change.** A checker that fails a page
  that was already verified is measuring the wrong thing. Two numbers are
  diagnosable; one is not.
- **When he reports something, reproduce it at his conditions before forming
  a theory.** And when a report is ambiguous between "X is broken" and "X is
  gone", ask — do not delete X.
- Before cutting for length, **measure every section's scroll cost.** A note
  in a previous round's write-up is not evidence.

---

## Degradation

Apple's strategy, with one thing borrowed from riangle — the conclusion of
`docs/references/APPLE-READ.md`, and **this is the answer to the
device-tier question the roadmap left open for 1.5**.

**Never ask what the device is; ask whether the thing arrived.** No
`deviceMemory`, no `hardwareConcurrency`, no `saveData`, no user-agent
tiering. Guessing quality from hardware buys less than a load timeout does,
and its failure mode is blacklisting a browser by name.

The whole defence is three layers:

1. **`.lite`** on the root element turns every animation off by rendering
   the same end state the animation targets — one code path, so it cannot
   rot. Reachable as `?lite=1`.
2. **`prefers-reduced-motion`** routes into that same `.lite` path. Not a
   second implementation.

**Built 2026-08-30, roadmap 2.2, and it lives in `app/src/main.jsx`** — at
the app root, before React renders, so the class is on `<html>` for the
first paint and every surface can answer it. Both triggers are read there
and nowhere else; a stylesheet that wants to degrade writes `.lite`
selectors, never its own `@media (prefers-reduced-motion)` block.
`booking.css` had one from 2.1 and it was swapped for `.lite` in the same
session, which is also what made `?lite=1` work on the booking page — it
never had before. It is read once, at load: a visitor who changes the
system setting mid-session gets it on the next navigation.
3. **Nothing is hidden behind an animation.** Every scrub target has a
   `.lite` end state and every revealable ends at `.in`. If the script never
   runs, the page reads.

The one piece worth borrowing from riangle is an **fps governor**, because a
page can load fast and still animate badly. It is not built yet and nothing
on the page needs it — there is no WebGL anywhere. Add it when something
measured is dropping frames, not before.

`?smooth=0` disables the weighted scroll, so the two can be compared on the
same phone in one sitting.

---

## Never-defaults

In addition to everything above. From `CLAUDE.md` and
`docs/design-knowledge.md` §1, and they are not negotiable by any skill.

- **Fonts:** Inter, Roboto, Open Sans, Lato, Arial, system-ui as a *design
  choice* — and Space Grotesk, the "trying to be original" default.
- **Colour:** purple-to-blue gradients on white; timid evenly-distributed
  palettes; a pure mid-grey.
- **Layout:** three evenly spaced cards; everything centred; five identical
  full-width stacked sections; `rounded-lg` on everything; an accent bar on
  a rounded card.
- **Surface:** a flat solid background with no atmosphere.
- **Structure as decoration:** numbered markers on a non-sequence; emoji as
  section markers.
- **Copy:** "modern and clean", "seamless", "elevate", feature triplets,
  Lorem ipsum, "Feature One / Feature Two / Feature Three".
- **Copy that explains what the label already said.** THE OWNER'S RULE,
  2026-09-01, and he named the instance: the job record printed
  *"Mobile — we go to them"*. His words: *"no duh. you don't need to say
  that, and it just looks bad… it thinks that humans can't think, or it
  feels the need to explain literally every single thing, which just gets
  annoying and cluttered."* **The test is whether the sentence adds a fact
  the control does not already carry.** A switch called *"A new booking
  comes in"* does not need *"So you know before they do."* A choice between
  *I go to them* and *They come to me* does not need each option defined
  under it. A *Saved.* does not need *"…and your booking page uses it
  straight away."* **He is not asking for nothing to be explained** — the
  non-obvious still gets its sentence, and *"Picking another swaps it"* or
  *"Past bookings keep it"* are exactly the sentences worth keeping. What
  goes is the restatement. **Swept across the whole product on 2026-09-01;
  DECISIONS.md → "The copy pass" carries the 24 sites and the rule.**
- **A label that names WHO the result is for, rather than what the control
  DOES.** THE OWNER'S RULE, 2026-09-02, and he named the instance: Money's
  export button said *"Export for my accountant"*. His words: *"they may go by
  a different name. Maybe they're not even exporting for the accountant,
  they're exporting for some separate reason. It's weird to have a button that
  says exclusively export for my accountant."* **The test is whether the extra
  words are true of every person who will press it.** A use case is the
  detailer's business; naming one narrows a button that was never narrow, and
  a detailer whose bookkeeper is their spouse reads it as "not for me".
  **This is a SIBLING of the rule above it, not the same rule** — that one is
  about restating what is already on the screen, this one is about presuming
  why somebody is here. The button is *"Export"*. **Swept across the whole
  product the same day** — every button and link label, every `Setting` label,
  every `help=` and `blurb=` — and nothing else named a use case; DECISIONS.md
  → "Roadmap 2.11, step 6, stage 5" carries the sweep and the two borderline
  labels that were kept.
- **Claims:** nothing the product does not do. "Start free" shipped on the
  direction page when there is no free tier; `landing-pricing.test.mjs`
  exists because of that class of bug. No invented testimonials, customer
  counts, logos or statistics — the marketing deck ruled them out itself,
  and there are no customers yet to count.

---

## §11 — what survived from "Raking Light"

The look did not. These did, and they are contracts rather than style:

- **The accessibility floors** — 4.5:1 body, 3:1 large and non-text, both
  measured. They were right and they are unchanged.
- **`app/src/lib/theme.js` is the only place colour is computed in JS.**
  Tenant accents are contrast-corrected there against the active ground.
- **Tokens are defined once** and everything reads `var(--…)`. The old
  system's real achievement was that discipline, not the palette.
- **Content and copy facts**, per `DESIGN.md`: `app/src/landing/
  LandingPage.jsx` is the substance the marketing pass edits, not a file to
  throw away. **Read this as it was meant after roadmap 2.2**: that file was
  rewritten as a port of the approved reference page, so its words are now
  the marketing deck's, in the reference's running order. The rule that
  survived is the one about not discarding the substance — the claims, the
  prices, the terms and the register are still edited there, and a change to
  them belongs in the reference page too.
- **The composition rule** — records are lists, cards are objects — which
  was written down, ignored, and then given teeth by a test. It carries over
  word for word.

---

## What this file does NOT settle

Named rather than invented. Direction-inventing is banned from here on, so
these go to the owner rather than being decided by a skill.

1. ~~**There is no light theme.**~~ **SETTLED 2026-08-30 by the owner: "no
   light theme needed."** The dashboard's light/dark switch goes. One ground,
   with the light band as the only light surface.
   - **This is about the DASHBOARD's toggle**, which is the thing he was
     asked about. It does not by itself decide the customer booking page,
     which is a separate surface — see item 2.
   - **DONE 2026-08-30 in roadmap 2.3**, and it came out at five places
     rather than four. The four that were scoped: `app/src/theme.css` (the
     `[data-theme]` blocks, gone with the rewrite), `app/src/lib/theme.js`
     (`THEME_BG`, `DEFAULT_ACCENT`, `loadThemeMode`/`saveThemeMode` and the
     `dp-theme:` key), `app/src/screens/more/Appearance.jsx` (the Light/Dark
     chips), and the per-user preference. The fifth was
     `app/src/context/BusinessContext.jsx`, which held `themeMode` state and
     called `applyTheme` on every load — it is the thing that actually *set*
     `data-theme`, and it was not on the list. `design-contrast`'s "outgoing:
     dashboard light" block went by itself, because that block is guarded on
     the test still reading the reference page. There is no `data-theme`
     attribute anywhere in the product now, and `:root` carries
     `color-scheme: dark`, which is what makes native controls, scrollbars
     and date pickers come back dark for free.
   - The reasoning, on the record: sunlight is not a constraint
     (`design-brief.md` §B5), a second theme doubles every contrast check and
     every tenant-accent retint test forever, and the identity is the dark
     ground. The cost is that anyone who prefers light UI loses it; he
     accepted that.

2. ~~**The customer booking page is light-first.**~~ **SETTLED 2026-08-30
   by the owner: dark — and APPLIED in roadmap 2.1, so this is done, not
   just decided.** The comment was re-pointed rather than deleted, as
   required below.
   The deciding argument was the
   positioning, not taste — the page claims the booking form is built INTO
   the detailer's site, and a light form inside a dark site breaks that on
   sight. **What survives:** the page keeps its own fixed ground independent
   of any dashboard state, which is what `BookingBusinessContext.jsx`'s
   comment was always actually arguing for — re-point that comment, do not
   delete it. **Reopen in Phase 3**, when bespoke tenant sites exist and one
   of them is light; "follow the tenant's own ground" was offered and
   declined only because there is nothing to follow yet.

3. ~~**The tenant's curated accent set has no colours in it yet.**~~
   **SETTLED 2026-08-30, roadmap 2.4 — and the question itself was wrong.**
   "A curated four to six" is dead: the owner does not want the list narrowed,
   he wants coverage, and he said the eight that were there carried no
   authority — *"those eight colors were chosen by AI… I really don't care
   about them."* `PRESET_COLORS` is now **twelve, built from evidence** rather
   than taste: a 46-brand car-care sample plus general logo-colour studies, in
   DECISIONS.md → "Roadmap 2.4". Red leads the trade at 48%, twice blue's 24%,
   which is why there are two reds; green is 0 of 46, which makes the house
   green a genuine differentiator rather than a coincidence.
   **There is no dark preset**, and that is a finding rather than an omission:
   the correction moves lightness only, so deep navy paints `#4269D6` and deep
   garnet paints `#D72727` — both collapse onto brighter presets already in the
   list. A detailer whose brand IS deep navy uses the custom picker and
   `describeAccent()` tells them in words why it came back brighter.
   **"Customer-facing only" is no longer part of it** — see law 11: the colour
   reaches the dashboard too, so the set has to work on every surface.

4. ~~**The dashboard's own skeletons are undrawn.**~~ **DRAWN 2026-08-30 in
   roadmap 2.3, and written up in `docs/dashboard-skeletons.md`** — read that
   before changing a shape in `app/src/theme.css`. Five tabs, five skeletons:
   Today is the only **rail** (the day's jobs strung on one hairline with a
   node each, hollow while a job is ahead and solid green once it has
   landed — the approved page's "scattered becomes ordered" at the far end of
   the same thread), Calendar the only **grid**, Money the only **chart**,
   Clients the only screen with **no panel on it**, More the only screen
   **made of panels**. The eleven settings screens share one skeleton — a
   form in a sheet — deliberately, because they are modal panels reached one
   at a time and a person never sees two of them together; law 1 governs what
   is on screen at once.
   That file also records the three judgments the system did not settle: why
   `.stripe` was deleted rather than kept, why `--success` and `--warning`
   went (five statuses carried by two hues and three shapes instead of four
   hues), and why `.warn-box` stopped being a warning.

5. **Mid-range Android is still unmeasured** (`README.md` "Still open" #4).
   Nothing uses WebGL so the risk is low, but nobody has put a thumb on a
   cheap Android.

---

## What the tests enforce

Both suites are credential-free and run from the repo root.

```bash
node tests/composition.test.mjs
```

```bash
node tests/design-contrast.test.mjs
```

`composition` checks the rules that keep getting broken by hand: records
mapped onto cards, a hand-written `<select>` with two to four options, the
two-face type rule, third-party animation libraries, motion presets, and
that the laws above are actually still written in this file. `design-contrast`
reads the shipped token values and prints a WCAG ratio for every pair this
file promises.

Neither can check whether it looks good. That is what the screenshots at
four widths are for.
