# Design system — "Raking Light"

**Read this before touching anything a person looks at.** Every visual decision
in the product derives from this file. If a change contradicts it, either the
change is wrong or this file gets updated first — never silent drift. Drift back
to generic-SaaS defaults is the failure mode this document exists to prevent.

Chosen by the owner from four rendered directions (2026-08-27), refined once:
Syne replaced by Anybody, glow made real. Reference renders:

- Refined direction: https://claude.ai/code/artifact/14fd0857-9f21-4b98-938c-0cea97775dda
- The four-direction round: https://claude.ai/code/artifact/6b9b0fe2-2f5c-400b-9585-3ec0398e5287

## The idea

The product borrows the detailer's own instrument. A detailer judges work under
an inspection light — a hard beam over a matte panel that reveals what ambient
light hides. So the interface is a **matte, near-black surface where one thing
is lit**: the next job, the current step, the unsaved change. The reference
object is an **instrument cluster**: wide luminous type on matte black.

Dark is the home theme — the glow lives there. Light is the disciplined daytime
working mode: same structure, tinted bar instead of bloom, because a halo on
white reads as a printing error.

## The laws

These are the rules that keep the direction alive. They are not suggestions.

1. **One light per screen.** The bar + bloom marks the screen's single primary
   object. On Today that is the next job; on a booking step, the current step's
   card; on a settings screen, the block with unsaved changes (or nothing).
   *Selection is a different, quieter state*: tinted border, no bloom. A button
   halos only when it is the primary action. If two things glow, one of them is
   wrong. Glow-on-everything is how this direction dies.

2. **Glow is additive, never the only signal.** Every lit element also lifts its
   surface (`--surface-lit`) and warms its border toward the accent. In direct
   sun the bloom disappears; the value and edge shift must still carry the
   hierarchy. You may lose the beauty in glare — never the information.

3. **Three voices, one product.**
   - *Titles and the wordmark*: Anybody, wide (`wdth` 112–116), 700.
   - *Labels/eyebrows*: Anybody, narrow (`wdth` 88), 600, letter-spacing .16em,
     uppercase.
   - *Prose and controls*: Public Sans 400/600.
   - *Every figure* — money, time, counts: DM Mono 400/500,
     `font-variant-numeric: tabular-nums`. No exceptions; a price set in the
     body face is a bug.

4. **The tenant's accent is not the identity.** Tenants pick any colour; it
   passes through `app/src/lib/theme.js` (`correctAccent` → `inkFor`) against
   the active theme's ground. The identity lives in the matte ground, the one
   light, and the type voices — all untouchable by the accent. `lib/theme.js`
   is the ONLY file that computes or writes colour from JS.

5. **Legibility beats style.** Text ≥ 4.5:1 on every surface it sits on, both
   themes, measured — including muted text on the bare ground, where section
   labels sit. Non-text interactive edges ≥ 3:1.

## Tokens

Defined once in `app/src/theme.css` (`:root` = dark home theme;
`[data-theme="light"]` overrides; booking page mirrors under `--bk-*`).

### Colour — dark (home)

| Token | Value | Job |
|---|---|---|
| `--bg` | `#0F1012` | the matte ground |
| `--surface` | `#18191C` | a panel |
| `--surface-lit` | `#1E2024` | the lit panel (paired with the bar) |
| `--surface-sunken` | `#131416` | wells, inputs, recessed context |
| `--border` | `#26282C` | panel edge |
| `--hairline` | `#1E2023` | a rule inside a panel |
| `--text` | `#F0F1F2` | primary |
| `--text-2` | `#A3A7AC` | secondary |
| `--text-muted` | `#8B9095` | labels, metadata (4.6:1 on `--surface`) |
| `--accent` | tenant (default `#57B2E8`) | the light's own colour |
| `--accent-ink` | derived | text on accent |
| `--success` | `#4FC08D` | done, paid |
| `--warning` | `#DCA84E` | pending, blockout |
| `--danger` | `#E2705F` | cancelled, destructive |
| `--overlay` | `rgba(5,6,8,.72)` | behind sheets |

### Colour — light (daytime mode)

| Token | Value |
|---|---|
| `--bg` | `#E7E7E5` |
| `--surface` | `#F3F3F1` |
| `--surface-lit` | `#FCFCFB` |
| `--surface-sunken` | `#DEDEDB` |
| `--border` | `#C6C6C2` |
| `--hairline` | `#E0E0DD` |
| `--text` | `#151515` |
| `--text-2` | `#4A4D49` |
| `--text-muted` | `#5D605C` |
| `--accent` default | `#0D689D` |
| `--success` / `--warning` / `--danger` | `#1E7A4E` / `#8A5A14` / `#A83A2C` |

### The light (the signature)

```css
/* dark */
.lit {
  background: var(--surface-lit);
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent),
              0 -6px 28px -8px color-mix(in srgb, var(--accent) 38%, transparent),
              0 10px 34px -18px rgba(0,0,0,.85);
}
.lit::before {           /* the bar */
  top: -1px; left: 12px; right: 12px; height: 3px;
  border-radius: 0 0 4px 4px; background: var(--accent);
  box-shadow: 0 0 14px 1px color-mix(in srgb, var(--accent) 75%, transparent);
}
.lit::after {            /* the wash falling from it */
  height: 56px; background:
    linear-gradient(color-mix(in srgb, var(--accent) 12%, transparent), transparent);
}
/* light theme: same bar, NO bloom shadows; border at 55% accent mix. */
```

Primary button in dark: `box-shadow: 0 0 22px -4px color-mix(in srgb,
var(--accent) 55%, transparent)`. Selected chip in dark: 16px halo at 50%.
Neither in light.

### Type scale

`11 / 13 / 15 / 17 / 22 / 30 / 36` px → tokens `--t-label … --t-display`.
Weights **400 / 600 / 700**; 700 belongs to Anybody-wide titles only — once per
screen. Consecutive steps differ ≥ 25%.

### Space, shape, motion

- Spacing scale `4 / 8 / 12 / 18 / 28 / 44`. Related ≤ 8, unrelated ≥ 28;
  12/18 are reserved for inside-a-panel structure and panel padding.
- Radius `2 / 9 / 10` (chip inner / control / panel). Pills 999.
- Tap targets ≥ 46px.
- Motion: `--ease: cubic-bezier(.32,.72,0,1)`; 90ms press, 160ms state,
  200ms sheet. **The one orchestrated moment:** when the primary object
  changes, the light *travels* — the bar slides/cross-fades to the new element
  (≤ 300ms). Under `prefers-reduced-motion` it simply appears. No staggered
  reveals, no count-ups, no shimmer.

### Fonts (index.html)

```
https://fonts.googleapis.com/css2?family=Anybody:wdth,wght@75..125,400..800&family=DM+Mono:wght@400;500&family=Public+Sans:wght@400;500;600&display=swap
```

Fallbacks: Anybody → ui-sans-serif; DM Mono → ui-monospace; Public Sans →
system-ui. **Screenshot verification in this sandbox must use the downloaded
woff2 set** (Chromium here cannot reach Google Fonts) and assert via
`document.fonts` that all three families loaded — an earlier round was
invalidated by silent fallbacks.

## Surfaces

Three of them, one identity, two intensities:

| Surface | Theme posture | The light marks |
|---|---|---|
| Landing (`/`) | dark only — the showroom | the live booking-card demo |
| Dashboard (`/app`) | dark home, light optional | the next job / current sheet focus |
| Booking (`/book/:slug`) | light-first (customers, daytime), dark honours OS | the current step / selected service |

The landing page is permitted the richest glow; the dashboard is the working
instrument; the booking page is the tenant's storefront and must look right
with *their* accent, not ours.

## Copy rules

- Name what people control, not how it's built: *reminders*, never cron.
- Buttons say what happens and keep their name through the flow: "Save booking
  rules" → "Saved."
- Errors say what went wrong and how to fix it. No apologies, no vagueness.
- Empty states invite the next action, never shrug.
- Sentence case. Plain verbs. No filler.
- Landing page sells the concrete thing: **a professional website with booking
  built in** — for detailers with a bad website or none. Never "streamline your
  workflow". The audience's own register (from the old site, kept as canon):
  *"A tunnel wash gets the surface wet and calls it a day. A proper detail
  actually protects your car."*

## Quality floor (unannounced, always)

Responsive 320→1440; visible keyboard focus (2px accent ring, offset 2);
`prefers-reduced-motion` collapses all animation; wide content scrolls in its
own container; `tabular-nums` wherever digits align.

## Accent correction, two tiers

`lib/theme.js` corrects the tenant's brand color against the active theme
ground at two strengths, and both are written as custom properties:

- `--accent` — fills and large marks (buttons, bars, selected chips):
  corrected to >= 3:1 (WCAG non-text), staying as close to the brand as
  legibility allows.
- `--accent-text` — accent used AS text (tab labels, links, status pills):
  corrected to >= 4.5:1. A saturated red brand keeps its red buttons while
  its tab labels get a deeper red that actually reads.

Never color small text with `--accent`; use `--accent-text`.

## Composition — not everything is a card

The fastest way to look machine-generated is to put every piece of content
in the same rounded box. The theme stays constant; the *composition* changes
with the content's nature. The vocabulary:

- **Lit card** — the screen's one primary object (next job, current step,
  the appointment being created). At most one per screen.
- **Quiet card** — a thing you pick between or act on (a service option,
  a job in a list). Cards mean "objects", never "sections".
- **Ruled list** — enumerations: hairline-separated rows straight on the
  ground (settings rows, add-on checklist, landing spec sheet). No border,
  no fill.
- **Receipt** — any money breakdown: ruled rows, mono figures, a dashed
  rule before the total. Money looks like the paper it becomes.
- **Rail** — sequence/progress: a hairline through mono numerals (booking
  progress, landing how-it-works). The product's own progress motif.
- **Bare figures** — headline stats sit directly on the ground in DM Mono
  (Money's net, landing's price). A number that matters needs no box.
- **Sunken panel** — dense stat clusters set INTO the surface, not raised.

Rule of thumb: two adjacent blocks should not use the same treatment unless
they are literally the same kind of thing. If a screen reads as a stack of
identical rectangles, recompose it — vary between list, receipt, rail and
bare figures before reaching for another card.
