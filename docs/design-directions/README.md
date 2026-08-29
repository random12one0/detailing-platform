# Roadmap 1.3 — four directions

**Built 2026-08-29. The owner picks one; that pick is roadmap 1.4.**

Open `index.html` in a browser and work through the four. Everything below is
the reasoning behind them, for whoever builds 1.4 and 1.5 — including a coding
agent that is not Claude, which is why it is plain markdown and not a tool
setting.

## What is in each file

Every direction is one self-contained HTML file. No build step, no
dependencies, no framework — open it with a double click. Each contains the
same four things, labelled with a black strip so they cannot be confused:

1. **Landing hero** — where a direction proves it has a point of view
2. **Booking step — a configured business** — picking a time
3. **Booking step — EMPTY** — the same direction for a business that signed
   up an hour ago: two services, no photos, no gallery, no reviews
4. **Dashboard — Today** — four jobs, phone-first

The empty screen is in all four on purpose. `docs/design-brief.md` B2 flags
that an Apple-style direction is the most likely to collapse into a blank page
for a new tenant, and `docs/design-knowledge.md` §4 says the empty state is the
real product. A direction that only works fully-configured has not been tested.

Direction 2 goes further and makes the empty case its **hero** — the phone in
the landing hero is a two-service, one-photo business.

## The four, and the argument each one makes

| | Name | Argument in one line | Ground | Type | Where the expressiveness goes |
|---|---|---|---|---|---|
| 1 | **The Seam** | A detailer sells the edge between dirty and clean, so that edge is the layout. | Petrol black `#0A1416` + jade `#14B8A0` | Archivo alone, width axis 62–125 | One device reused at three scales |
| 2 | **Showroom** | We sell a website, so the page shows the website. | Alternating paper `#EFF1EE` ↔ marine `#12324F`, crimson `#D22D3A` | Anton against Instrument Sans | Pictures of the real thing, captioned |
| 3 | **Ticket** | Booking a detail is buying a ticket, so the thing they end up holding is an object. | Oxblood `oklch(.245 .072 22)` + butter | Fraunces at WONK 1 / SOFT 60, against Schibsted Grotesk | One physical object, and its punched edge |
| 4 | **Approach** | Spend everything on motion and nothing on ornament. | Graphite `#141618` ↔ paper `#EDEDEA`, **no brand colour at all** | Onest, one family, 200 against 800 | The hero scrub, and nothing else |

### Which skill produced which

Per the roadmap's own rule ("one per direction, so the directions stay
genuinely different"):

- **1 — The Seam**: `frontend-design`
- **2 — Showroom**: `tastemaker`
- **3 — Ticket**: `great-design`
- **4 — Approach**: **no skill.** Built from `docs/references/APPLE-READ.md`,
  the code-level Apple read done at the top of this item. It is the evidence
  talking rather than a skill.

They are deliberately different on every axis a non-designer can actually
perceive: dark/light, warm/cool, the main colour, whether type is a serif, and
how much the page moves.

## What each one takes from your seven reference sites

Traced back to `docs/references/DESIGN-BRIEF.md`'s ranked list, so it is
visible which of your own asks each direction is honouring.

| Your ask (DESIGN-BRIEF rank) | 1 Seam | 2 Showroom | 3 Ticket | 4 Approach |
|---|---|---|---|---|
| #1 Alternating dark/light grounds | one light band | **the whole system** | no — one ground, lit two ways | **yes, mid-page turn** |
| #2 Texture over imagery (the Vox thing) | grain on the hero | **duotone + grain on every photo** | grain over the whole page | no — photos left alone |
| #3 Hover on everything | yes | yes | yes | yes |
| #4 Depth: scrim, shadow scale, overlap | overlapping slot card | receipt over the band | the stub, lifted | scrim only — 2 shadows total |
| #5 Animated headline | no | no | no | no — see below |
| #6 Floating glass nav | **yes** | no — a plain bar | no | **yes** |
| #7 Sections blending | no — hard edges | no — hard edges | yes, one ground throughout | **yes, ground shifts under you** |
| #8 Smooth weighted scroll | none of them ship it — see below |
| #9 Cursor-tracked element | the seam follows the pointer | no | no | no |
| #10 Hero that transforms | the seam travels on load | no | the ticket drops in | **yes — the scrub** |

**Nobody built the typewriter headline (#5).** It scored 3.0 and it is
genuinely doable, but it fights every one of these four: three of them open on
a photograph, and the fourth opens on an object. It is a good candidate to add
to whichever direction wins, in 1.4, rather than a reason to pick one.

**Nobody shipped smooth scroll (#8),** exactly as DESIGN-BRIEF recommended: it
is one line and 3 KB, and the honest way to settle it is to add it to the
winner behind a flag and feel both on a real phone. That is a 1.4 job.

## What the Apple read changed before any of this was drawn

Full detail in `docs/references/APPLE-READ.md`. The three findings that
actually moved the work:

1. **Apple's house technique is play-on-approach, not scrubbing.** Counted
   across eight product pages: play-on-approach appears on 8 of 8; the scrub
   on 3 of 8, once or twice each — and *not at all* on the flagship iPhone 17
   Pro page. So directions 2 and 4 both use play-on-approach, and only
   direction 4 spends the budget on a scrub.
2. **Apple's scrub is never pinned and is never the hero** — it is a mid-page
   section whose progress maps onto ordinary scroll. Direction 4 still pins,
   because your idea is specifically a *hero* that transforms and at scroll 0
   there is nothing to approach. So it follows the pin rule instead: it
   declares its length on screen (1.4 screens), stays under the 2-screen
   ceiling, delivers a whole beat inside it, and sets `touch-action: pan-y`.
   For comparison: momentolegal, the site you said felt stuck, holds you for
   18.3 screens.
3. **"Maximum choreography, minimum decoration" is real, and it is a ratio.**
   In Apple's own 1.1 MB stylesheet: 82 tweens and 65 keyframes against 17
   box-shadows, 2 text-shadows, zero mix-blend-mode, zero custom cursor, zero
   audio, one typeface. Direction 4 is built to that budget on purpose.

## What it would cost to build each one for real (Phase 2)

Rough, and relative to each other rather than absolute.

| | Build cost | Performance risk on a mid-range Android | The thing that could go wrong |
|---|---|---|---|
| 1 Seam | **Low.** The seam is a `clip-path` and a 2px div. | Low | The device is strong; it needs to not become wallpaper by screen four. |
| 2 Showroom | **Low–medium.** The duotone is two CSS layers over a greyscaled photo. | Low | The duotone is applied to *every* tenant photo — it has to survive a genuinely bad one. |
| 3 Ticket | **Medium.** The punched edge is fiddly across breakpoints. | Low | Fraunces at WONK 1 is a strong flavour; check it still reads at 14px. |
| 4 Approach | **Highest by a distance.** A real clip means encoding mp4 **and** webm, streaming the webm through MediaSource for non-Safari, a Safari branch, and a still frame for every state. | **Highest** — this is the one that needs the throttled-CPU test before it is promised. | With no brand colour, everything rests on photography a new tenant may not have. |

The prototype in `4-approach.html` uses **one photograph in two states** rather
than a clip. That is not a mock: it is the fallback a tenant with photos and no
video would actually get, so it is worth judging on its own terms.

## Still open after this item

These are written down rather than left in a chat, because the chat does not
survive a `/clear`.

1. **The owner picks one. That is roadmap 1.4.** Nothing else here can be
   settled first.
2. **Scroll-scrub feasibility on a mid-range Android is still unmeasured.**
   `DESIGN-BRIEF.md` demanded this before anything depends on scrubbing, and
   the Apple read gave byte counts, not our own throttled-CPU numbers. **If
   the owner picks direction 4, this is the first task of 1.4.** If they pick
   anything else it can be dropped entirely.
3. **The tenant palette is not chosen.** `docs/design-brief.md` B6b settled it
   as a curated four to six, customer-facing only, dashboard fixed. Each
   direction's colours are the *house* colours; the tenant set has to sit
   beside them without clashing and must not include the house colour. That is
   1.5 work and it needs the winner first.
4. **Smooth scroll (#8) is deliberately unshipped** — settle it empirically on
   the winner, on the owner's own phone.
5. **The typewriter headline (#5) is unbuilt** and is an add-on to the winner,
   not a reason to prefer one.
6. **The device-tier question.** `DESIGN-BRIEF.md` recommends adopting
   riangle's tier system (`deviceMemory`, `hardwareConcurrency`, `saveData`,
   plus an fps governor). The Apple read found Apple does **none** of it —
   they never ask what the device is, only whether the asset arrived, using a
   3-second per-element load timeout plus a designed still. Direction 4
   implements Apple's way (`.lite` class, 3-second timeout). **Which of the
   two the design system adopts is a 1.5 decision** and it is written up in
   `APPLE-READ.md`; the recommendation there is Apple's approach plus
   riangle's fps governor only.

## The honest caveats on these four

- **They are static mockups, not the real app.** No data, no Supabase, no
  routing. Nothing in `app/` was touched.
- **Photography is Unsplash**, credited in a code comment at the top of each
  file and never on the page. Real photos, per the never-a-grey-box rule.
- **The mockups do not run the reduced-motion or `.lite` paths by default** —
  direction 4 supports `?lite=1` in the address bar if you want to see the
  everything-off state.
- **The dashboard is shown fully populated in all four.** Its empty state
  (a detailer with no bookings today) is not drawn. That is a gap; it belongs
  in 1.4 with the winner.
