# Design analysis: the old admin vs. the new dashboard

Measured against `reference/frontend/src/admin/**` and `reference/frontend/src/index.css`,
compared with `app/src/theme.css` as deployed. Reported before implementing;
sections 1–9 are NOT applied.

Presented with live before/after mockups at:
https://claude.ai/code/artifact/2d4ef4f1-12e6-4938-9160-c4e966829bc6

## The finding

The new dashboard is not short of colour — it has the same five hue families as
the old admin, and the same number of type steps. It is short of *difference*.

| | Old admin | New dashboard |
|---|---|---|
| Weights in use | 400, 500, 600, 700 — **700 once per screen** | 600, 700, 800 — **7 of 8 rules are 700+** |
| Four main sizes span | 14 → 30px (2.1×) | 0.95 → 1.35rem (1.4×) |
| Related : unrelated spacing | 6–8px : 24px ≈ **1 : 3.5** | 10–12px : 12–20px ≈ **1 : 1.2** |
| Grouping devices | card, rule, dashed, ring, tint, circle, pill, tag | card |

At a 1:1.2 spacing ratio the eye cannot find a group boundary, so it falls back
on the card border — which is why every screen reads as a stack of identical
boxes. Adding colour would make this worse; the fix is subtraction.

## 1. Colour — five hues, status is an alias layer

One neutral ramp (6 steps, 209–214° hue), one accent (`#0EA5E9`), and three
signal colours (success `142 71% 45%`, warning `32 95% 44%`, destructive
`0 72% 51%`). The five *status* tokens are aliases onto those four, not new
hues — so a colour can never mean two things, and pill / calendar dot / legend
are guaranteed to agree because they all read `getStatusColor()`.

Where the old admin breaks its own rule: the Money screen hardcodes
`text-green-400`, `text-emerald-400`, `text-purple-400`, `text-blue-400` per
metric. Purple is not in the token set and means nothing.

Adopt — no new hues, four new tokens:

| Token | Dark | Light | Job |
|---|---|---|---|
| `--text-2` | `#b6c3d6` | `#3d4b5c` | third text level; values here, labels drop to muted |
| `--surface-sunken` | `#0d1524` | `#eef1f6` | a card *inside* a group, not floating at one elevation |
| `--hairline` | `#1e2a44` | `#e4e9f0` | a rule within a card — a boundary that isn't a box |
| `--accent-quiet` | `#12304a` | `#e6f3fb` | tint for the one card needing attention (ports `bg-accent/5`) |

Usage rule: ~90% of a screen is neutral; the accent appears at most three times
(active tab, primary action, one "look here" mark).

## 2. Type — seven steps, three weights

| Size | Weight | Job |
|---|---|---|
| 11px | 600, +.06em, caps | label / eyebrow |
| 13px | 400 | metadata |
| 15px | 400 | body |
| 16px | 600 | the row's headline |
| 20px | 600 | section title |
| 28px | 600, tabular-nums | figure |
| 32px | 700 | screen title — **once per screen** |

800 removed entirely. Consecutive steps differ by ≥25% so every jump is visible.
`font-variant-numeric: tabular-nums` on every figure and money column.

## 3. Spacing — related ≤8, unrelated ≥24

Six steps: `4 · 8 · 12 · 16 · 24 · 40`.

- **4** icon↔label, dot↔dot
- **8** items inside one thought
- **12** between thoughts inside a card *(reserved)*
- **16** card padding *(reserved)*
- **24** between cards in a group
- **40** between groups

12 and 16 are reserved for inside-a-card structure. Two elements 12–20px apart
that are not in the same card is the bug.

## 4. Shape — five radii plus four non-box devices

Keep the five radii (pill 999, tag 8, button/cell 10, card 14, modal 18) and add
the devices the old admin has and this one does not:

- **hairline rule** inside a card — boundary without a new box
- **dashed** border — "nothing here yet" without a colour
- **hollow ring** (`ring-2 ring-inset`, transparent fill) — a second indicator
  meaning with no second hue; the old calendar distinguishes drop-off-only from
  a block-out this way
- **tint** (`--accent-quiet` + accent border) — "this card, now", no new component

One addition that is *not* a port, flagged as such: a 3px status stripe down the
left of a job card, so status registers before any word does in a list of eight.

## 5. Icons — five mechanical differences

1. Stroke `2` at 14–18px (ours are hardcoded `1.75` everywhere — the main reason
   they look washed out); `1.75` only at 20px+.
2. `1.15em` sizing inside anything with a label, so icons scale with their text.
3. `flex-shrink: 0` on every icon.
4. Decorative icons take muted; only meaningful ones take accent.
5. No icon without a word, outside the tab bar and close buttons.

## 6. Is the old Money screen better?

**On information, yes.** It has net profit after expenses, average ticket, a
base-quote vs. upsell split, tips broken out three ways, an hourly-wage card and
revenue by month. Ours is missing net-after-expenses, the upsell split and tips.
The upsell split is the one that changes behaviour — it says how much income comes
from what gets sold standing in the driveway.

**On design, no.** It is the screen where the old admin abandons its own palette,
it is `md:`-scaled throughout so the phone view is a squeezed desktop, and its own
source comments call it "internally themed (dark) and intentionally not restyled".

So: port the numbers, not the treatment.

## 7. Bulk hours editor — port it

`BusinessSettingsSection.jsx` has the pattern: day chips (Sun–Sat), presets
(All days / Weekdays = Mon–Fri / Weekends = Sat+Sun), one open and one close
time, "Apply to N days" (the button counts the selection), and "Mark closed" for
the same selection. Per-day rows stay for fine-tuning; nothing commits until Save.

Keep verbatim: closed is stored as null open/close on an existing row, not a
missing row — so a closed day is a decision, not an absence.

## 8. Message templates — rebuild as writing, not config

- Subject and body as two separate labelled fields, not one textarea.
- Variables as click-to-insert chips labelled in plain words (*Customer name*,
  *Date*, *Time*, *Service*, *Total*, *Your business*), inserting
  `{{customer_name}}` at the cursor. Nobody types a brace.
- Live preview rendering real sample data alongside (below on a phone).
- An unset template shows the dashed empty state with the default in preview, so
  "not customised" and "broken" look different.

## 9. Transitions

| Token | Value | Used by |
|---|---|---|
| `--ease` | `cubic-bezier(.4, 0, .2, 1)` | everything |
| `--dur-fast` | `140ms` | button press `scale(.98)`, tab cross-fade, hover, backdrop |
| `--dur` | `220ms` | sheet/modal `translateY(12px)→0` + opacity |

No staggered list reveals, no spring. All inside
`@media (prefers-reduced-motion: reduce)`.

## 10. Order of work

1. Tokens only — colour, type scale, spacing scale, transitions. Fixes the weight
   problem everywhere at once with no component changes.
2. Today — dense job card.
3. Calendar day interactions — blockouts, custom hours, drop-off-only periods
   (schema exists, UI does not).
4. List mode as a real searchable/filterable history, not a second Today.
5. Money — plus net-after-expenses and the quoted vs. added-on-site split.
6. Hours and Message Templates.
7. Icon sweep.
