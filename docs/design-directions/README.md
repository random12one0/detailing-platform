# Roadmap 1.3 — the rebuild, and the four that were rejected

**Read `VERDICT.md` (why the four died) and `BUILD-BRIEF.md` (the plan, §7
especially) before this file.**

---

# Part one — Direction 5, "The Thread" (the rebuild)

**Built 2026-08-29 after the owner rejected all four. `5-the-thread.html`.
One page, built properly, rather than four more guesses on a corrected brief.
The owner has not seen it yet — that is the open item.**

## What it is

One self-contained HTML file. No build step, no framework, and — unlike every
site in `ANALYSIS.md` — **no third-party JavaScript at all.** No GSAP, no
ScrollTrigger, no ScrollSmoother, no SplitText, no Lenis, no Three.js. Every
technique is quoted from the code reads in `ANALYSIS.md` and hand-rolled. All
the script on the page together is smaller than Lenis alone. That is also how
the GSAP Club licence question in `BUILD-BRIEF.md` §6 got closed: there is
nothing to license.

**The argument, in one line:** a detailer's Saturday already exists — it is
just scattered across a text thread. The product does not add work, it sorts
what is already there.

**The signature move:** as you scroll, each message bubble detaches from the
phone thread and flies to the position of its own row in the dashboard, and
dissolves as that row solidifies. *"u free sat?"* becomes
`9:00 — Marcus Hill, Wash & Wax, $95`. Then the thread's column leaves and the
dashboard takes the middle of the screen. Distances are measured off the real
DOM, so it is correct at every width and re-measures on resize.

## What changed from the plan, and why

`BUILD-BRIEF.md` §2 chose **split stage** as the grammar — two columns held in
tension for the whole page. The owner killed that when he answered:

> "Throughout the entire website no one scroll area, one page looked the same —
> as you scroll everything morphs into different layouts and different stuff,
> and that's what I liked about it, so use that."

Two columns top to bottom is one layout repeated, which is the opposite. He
also capped the comparison himself: *"I don't wanna drag it on too much so
maybe only like a couple sections."*

So the grammar is what `BUILD-BRIEF.md` §1 Q7 had already worked out from his
two favourite sites: **one continuous ground, and every section a different
structure over it.** The split is two of those sections, not the page. Full
detail in `BUILD-BRIEF.md` §7.

## Eight sections, eight skeletons

The test: no two sections share a skeleton. Screenshot them side by side; if
two read as the same layout with different words, one of them is wrong.

| # | Section | Skeleton |
|---|---|---|
| 1 | Hero | left-heavy asymmetric, one floating object |
| 2 | The thread | two columns, pinned, animated transfer |
| 3 | The day | full-bleed strip, one huge figure |
| 4 | What you get | full-width ruled list, no boxes at all |
| 5 | What customers see | LIGHT ground, object breaking the section edge |
| 6 | Live before your next job | horizontal travel on a sticky rail |
| 7 | Pricing | asymmetric pair + a ruled terms list |
| 8 | Footer | mono facts |

## Every rule from VERDICT.md, and where it landed

| His correction | What the page does |
|---|---|
| Sell the dashboard + website, not detailing | The whole page is the dashboard being assembled. Zero photographs of cars. |
| Previews of our own product, real ones | Every product surface is **live markup**. The dashboard's tiles SUM from the same array its rows render from — change a price and the tiles change. No screenshot anywhere. |
| No before/after | No car appears in any state. The comparison is his buyer's mess against the product, and it is two sections. |
| No deposits | Verified rather than assumed: `grep -rni deposit` over `app/src` and `supabase` returns **zero**. The engine has no deposit concept. |
| Booking widget demoted | One section (5), and it is not the hero. |
| Start from the old landing page's copy | "Guards your day", "Runs from the driveway", "Your money, plainly", "no marketplace branding, no other detailers", the terms, and "Built for the people who never rush a car" are all carried over. |
| Keep "Stop booking jobs in your DMs" | It is the headline — and the rotating tail lets that one line name four versions of the same behaviour. |
| Far more scroll choreography | Below. |
| One screen per file | Nothing is a stacked mockup; there is no tab bar to mistake for page furniture. |

## The motion, and which site each piece comes from

| Technique | Source in `ANALYSIS.md` | How it ships here |
|---|---|---|
| Weighted scroll | riangle's `smooth: 1.1`, his #1 stated preference | ~30 lines, moves the REAL scroll position so `position:sticky` keeps working. Fine-pointer only, the same gate riangle uses. `?smooth=0` turns it off. |
| Rotating-tail typewriter | webtactics, values and all | `70 + random*40` ms per character, 2200 ms hold, faster delete. **This is the always-looping animation he asked for by description.** |
| A light that never stops | his "some glowing animation that's constantly looping" | Two soft lights drifting over the ground on a 22 s and 29 s loop. Lightness only — a drifting *coloured* wash is the tell that got flagged on direction 3. |
| Line-masked headline reveal | riangle's SplitText, hand-rolled | CSS `clip-path: inset(-.3em 0)`, so descenders are never clipped. No Club plugin. |
| Hero that becomes another part of the site | sharplink, the thing he liked most and could not name | The messages becoming the schedule. |
| One timeline, not two | sharplink's hero closing WHILE the next section assembles | A bubble leaving and its row arriving share one window, which is why it reads as one event. |
| Sticky horizontal rail | webtactics, `position:sticky` in CSS with no pinning library | Section 6. |
| Floating glass pill nav | subscrr, quoted almost verbatim | 14 px gutter, `backdrop-filter` confined inside the pill, 1 px gradient rim by mask compositing, **no outer shadow**. One `backdrop-filter` on the page, not a glass system. |
| Grain over the ground | the Vox texture he asked for | One data URI, no JavaScript. |
| Alternating grounds | finseo, riangle | Section 5 is a warm light band. |
| Two motion presets, not ad-hoc values | riangle | One reveal preset, one scrub preset. |
| The `.lite` safety net | webtactics' `.wt-lite` | One class on `<html>` from `prefers-reduced-motion`, `?lite=1`, or a 6 s failsafe — using the same CSS the animation targets, so it cannot rot. |

## The pin budget, which is his one hard no

> "A lot of scrolling that doesn't really take you anywhere, so it feels kind
> of like you're stuck, and I don't want to have that."

| | Length | What it delivers |
|---|---|---|
| Section 2 | **1.9 screens**, and it says so on screen | An entire dashboard assembles inside it |
| Section 6 | **~1.5 screens**, derived in script from how far the track actually travels | Three steps pan past |
| momentolegal, the one he called stuck | 18.3 screens | Pans one list |
| sharplink, which he liked | 1.5 screens | Assembles a section |

**A bug worth recording, because it was the exact failure mode he named.** The
rail was first written at a fixed 260vh. At 1440 that cost 2.6 screens of
scroll and moved the track **34 pixels** — scrolling that genuinely takes you
nowhere. The fix was not a better guess: the wrapper's height is now computed
from the track's real travel, so the exchange rate stays honest at every width.

## What was found by looking, not by reasoning

Every one of these was invisible in the code and obvious on screen. Recorded
because `design-knowledge.md` §2 ranks "give the agent eyes" as the highest-
leverage technique and this is the evidence for it.

1. **`.in` collided with itself.** The reveal state class and the layout class
   `.strip .in` / `.band .in` were the same string, so any element turned into
   a two-column grid the moment it revealed. Layout class renamed to `.duo`.
2. **`width:100%` on `.stage .cols`** silently beat `.wrap` on specificity and
   ran the pinned section edge to edge.
3. **The hero headline wrapped** — 116 px type in a 609 px column. The scale is
   now sized so the *longest* rotating tail still sits on one line, because the
   tail changes every few seconds.
4. **The rail's exchange rate**, above.
5. **The nav wrapped to two lines at 392 px** — the mark broke across
   "DETAILING / PLATFORM" and "Sign in" broke in half.
6. **The phone hid the inline actions.** Navigate / Call / Text / Mark complete
   were being suppressed under 820 px — on the viewport that claim is actually
   about. They now wrap instead of disappearing.
7. **The lite path contradicted itself**: the dashboard read "0 jobs · $0"
   above four visible jobs, because the tiles were only ever updated by a
   scroll frame and the lite path never runs one. That is the only view a
   reduced-motion visitor ever sees.
8. **Dead space at the end of the pin.** Once the last message had landed there
   was half an empty screen left to scroll — the hard no again, in miniature.
   The dashboard now moves into the space the thread vacates (sideways on
   desktop, upward on a phone), measured in script so it is right at both.
9. **A contrast floor miss.** `--fog-2` measured 4.22:1 on the ground, under
   the 4.5:1 minimum, and it is the ramp every 10–13 px label uses. Lifted.

## Verified, at 2026-08-29

- Looked at 1440×900, 768×1024 and 392×844; hero, the pinned transfer, the
  strip, the ruled list, the light band, the rail, pricing and footer at each.
- **Console: no messages at any viewport**, normal and `?lite=1`.
- No horizontal overflow at 392 (`scrollWidth === innerWidth`).
- All 26 reveal targets reach their end state; none can be stranded hidden.
- `?lite=1` verified at 392 and 1440: everything visible, headline prints one
  phrase and stops, both sticky stages fall back to static, tiles agree with
  the rows.
- `composition`, `design-contrast`, `landing-pricing`, `route-contract` all
  pass. Nothing in `app/` was touched.

## Still open on direction 5

1. **The owner has not seen it.** Two questions are put to him on `index.html`:
   whether the two-column beat reads as a before/after of a car again, and
   whether the weighted scroll is better or worse on his own phone.
2. **Only his phone can settle the performance question.** Nothing here uses
   WebGL, so the risk is much lower than direction 4's — but the pinned
   transfer moves a dozen nodes per frame and a mid-range Android is the
   target. The measurement worth having is his thumb, not a number from here.
3. **The dashboard's empty state** (a detailer with no jobs today) is still
   undrawn. Carried from the first round; it belongs in 1.4.
4. **The device-tier question** (`APPLE-READ.md`) is untouched and stays a 1.5
   decision. With no WebGL on the page there is nothing for a tier check to
   switch off yet; the `.lite` net plus reduced-motion is the whole defence.

---

# Part two — the four directions that were rejected

**Built 2026-08-29 and rejected the same day (`VERDICT.md`). Kept as evidence
of what not to do, exactly like the Kōpiko anti-reference. Nothing below is
being proposed again — read it for the reasoning, not the recommendation.**

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
| 2 | **Showroom** | We sell a website, so the page shows the website. | Alternating paper `#EFF1EE` ↔ marine `#12324F`, crimson `#D22D3A` | Anton against Familjen Grotesk | Pictures of the real thing, captioned |
| 3 | **Ticket** | Booking a detail is buying a ticket, so the thing they end up holding is an object. | Oxblood `oklch(.245 .072 22)` + butter | Petrona 200 against 900, with Schibsted Grotesk | One physical object, and its punched edge |
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
| 3 Ticket | **Medium.** The punched edge is fiddly across breakpoints. | Low | Petrona is a strong flavour at display size; check it still reads at 14px. |
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

## Looking at these on a phone

Three of the four behave differently on a phone, and it is the device most of
this product's users hold, so the phone look is not optional.

Double-clicking the files works on the laptop. To get them onto a phone, run
this from the repo root and leave the window open:

```
python -m http.server 8080 --directory docs/design-directions
```

Then on a phone **on the same wifi**, open `http://<this machine's IP>:8080/`.
On 2026-08-29 that address was `http://192.168.0.126:8080/` — the IP can change
when the router reassigns it, so check it with `ipconfig` if the page does not
load. Closing the window stops the server; nothing is deployed anywhere and
nothing is public.

**The one thing worth doing on the phone rather than the laptop:** scroll
direction 4's hero slowly and say whether it stutters. That is the only
direction with a real performance question attached, and the owner's own phone
is a better test than any measurement taken here.

## Two fonts were changed after the first build

The design hook flagged **Fraunces** (direction 3) and **Instrument Sans**
(direction 2) as faces that each new wave of AI-generated interfaces converges
on. That is a fair hit on a project whose entire brief is "it read as
machine-made", so both were replaced rather than argued with:

- **Fraunces → Petrona.** Petrona carries a true 100–900 axis, so the
  headline's heavy-against-hairline contrast got *stronger*, not weaker, and
  the warmth suits a printed stub better than Fraunces did.
- **Instrument Sans → Familjen Grotesk.** Quieter under Anton, and less
  travelled.

Two other things came out of the same pass and were fixed rather than
suppressed:

- **Every direction had hover states that animated `padding` or `margin`.**
  Those are layout properties: the browser re-flows the page on every frame of
  the hover. On a mid-range Android — this product's actual audience — that is
  exactly the wrong thing to spend a frame on. All of them now animate
  `transform` instead, and every `transition` names its properties rather than
  defaulting to `all`.
- **Direction 3's background was a radial colour wash**, which is the same tell
  as a glowing shadow drawn with a gradient. It is now a linear light-fall at
  the same hue and chroma, with only lightness moving. Nothing was added to the
  repo to silence the check — an ignore file would have been a tool-specific
  artifact, and `CLAUDE.md` says every durable thing here stays portable
  markdown.
