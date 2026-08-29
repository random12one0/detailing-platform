# Reference Analysis

Seven sites the owner picked, analysed against three inputs: his own words
(`TASTE-NOTES.md`, primary evidence for how the pages *move*), the twenty
screenshots he took while scrolling, and the sites' real shipped JavaScript.

**Evidence rules used throughout.** Every claim traces to a screenshot that was
looked at or code that was read and is quoted. Where something could not be
found in the shipped bundle, it says so — no plausible implementation is ever
invented. Minified code is reformatted for reading but never reworded; variable
names are the minifier's.

**Where the screenshots actually live.** The brief expected
`docs/references/<domain>/`. They are in fact flat in `screenshots/` with
timestamp filenames, so each is cited by filename. The mapping, established by
looking at all twenty in order:

| Site | Screenshots (`screenshots/Screenshot 2026-08-28 …`) |
|---|---|
| riangle.com | `221656`, `221716`, `221727` |
| sharplink.com | `221744`, `221754`, `221759` |
| subscrr.app | `221832`, `221838` |
| finseo.ai | `221859`, `221910`, `221928` |
| gustavobatista.dev | `221946` |
| momentolegal.com | `222009`, `222024` |
| webtactics.org | `222036`, `222043`, `222055`, `222104`, `222115`, `222126` |

**What "conflict with the design system" means here.** It cannot mean
`docs/design-system.md` — the owner scrapped that on 2026-08-28 and confirmed
"throw it out" on 2026-08-29. Conflict is assessed against what still binds:
the anti-slop floor (`docs/design-knowledge.md` §1 and the never-defaults in
`CLAUDE.md`), the per-surface expressiveness budget the owner set in
`docs/design-brief.md` B1b, "the design that is visually appealing needs to be
convenient" for the dashboard, the empty-state rule, and mid-range Android as
the performance target. See the correction appended to `TASTE-NOTES.md`.

---

## 1. riangle.com

A brand/digital studio in Montenegro. Technically the most disciplined site in
the set, and the one whose engineering is worth copying even where its look is
not.

### The stack, from the code

Next.js (Turbopack), 22 JS chunks totalling 2.6 MB uncompressed. Greps across
all 22:

| Library | Present | Where |
|---|---|---|
| GSAP core | yes | 7 chunks |
| ScrollTrigger | yes | 3 chunks |
| **ScrollSmoother** | yes | GSAP's paid Club plugin |
| SplitText | yes | GSAP Club plugin |
| Three.js | yes | `WebGLRenderer` present |
| Lenis | **no** | zero matches |
| Locomotive | **no** | zero matches |
| Framer Motion | **no** | zero matches |
| Swiper | **no** | zero matches |

Type: `--font-display:"Archivo"`, `--font-mono:"JetBrains Mono"` (from
`43j7mp2e-s768.css`). Both are free on Google Fonts. Self-hosted `.woff2`, 12
files.

### "There's a velocity to the scroll" — and the catch

This is the first thing he said, unprompted. The real code:

```js
gsap.matchMedia().add(`${MM.motion} and (pointer: fine)`, () => {
  let e = ScrollSmoother.create({
    wrapper: "#smooth-wrapper",
    content: "#smooth-content",
    smooth: 1.1,
    effects: !0,
    normalizeScroll: !0,
    ignoreMobileResize: !0
  });
  return () => e.kill()
})
```

`smooth: 1.1` is the number he felt — the seconds ScrollSmoother takes to catch
up to the real scroll position. That is a **long** setting; 0.6–0.8 is the
common choice. He noticed it because it is unusually heavy.

**The technique's real name:** inertial or eased smooth-scrolling — the page
scroll is virtualised and the content is translated with a lag.

**And the catch, which matters more than the technique.** The gate is
`` `${MM.motion} and (pointer: fine)` ``, where

```js
MM = {
  motion: "(prefers-reduced-motion: no-preference)",
  reduce: "(prefers-reduced-motion: reduce)",
  desktop: "(min-width: 992px) and (any-hover: hover) and (any-…)"
}
```

`(pointer: fine)` means a mouse. **Smooth scroll never runs on a phone.** The
thing he liked first does not exist on the device our dashboard is used on. It
is also fully disabled under `prefers-reduced-motion: reduce`, because
`matchMedia` simply never adds the context.

### The device-tier system — the single most valuable thing in all seven sites

Not mentioned by the owner, and worth more to us than any visual idea here.
Before the WebGL hero runs at all:

```js
let t = (
  !hasWebGL2() || navigator.connection?.saveData ||
  (typeof navigator.deviceMemory == "number" && navigator.deviceMemory < 4)
) ? "poster"
  : (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
     (typeof navigator.hardwareConcurrency == "number" &&
      navigator.hardwareConcurrency < 4))
  ? "still"
  : "full";
```

Three tiers — **poster** (a static image; no WebGL context is ever created),
**still** (rendered once, not animated), **full**. A phone with under 4 GB of
RAM, Data Saver on, or no WebGL2 gets the poster and never pays for the rest.

It does not stop at feature detection. It measures itself at runtime:

```js
reportFps: useCallback(e => {
  let t = () => { c.current = 1.25; o(1.25) };
  if (e >= 30) { d.current = 0; if (e < 45 && c.current > 1.25) t(); return }
  if (c.current > 1.25) { t(); d.current = 0; return }
  d.current += 1;
  if (d.current >= 2) l("still")
}, [l]),
fail: useCallback(() => l("poster"), [l])
```

Pixel-ratio cap starts at `1.75`. Below 45 fps it drops to `1.25`. Below 30 fps
twice in a row it abandons animation and falls to **still**. A WebGL context
loss falls straight to **poster**.

**Why this matters to us more than anything else in this document.**
`docs/design-knowledge.md` §4 says the audience is tradespeople on mid-range
Android phones and that motion cost matters more than motion quality. This is a
working, shipped answer to exactly that, and the pattern is free — the tier
check is about fifteen lines and depends on no library.

### A named motion scale, not ad-hoc values

```js
EASE     = { optic: "optic", out: "power3.out", inOut: "power2.inOut", linear: "none" }
REVEAL_TRIGGER = { start: "top 82%" }
SCRUB_TRIGGER  = { start: "top bottom", end: "bottom top", scrub: .7 }
```

Every scroll animation on the site resolves to one of two presets, spread in:

```js
scrollTrigger: { trigger: e, ...REVEAL_TRIGGER }
scrollTrigger: { trigger: e, ...SCRUB_TRIGGER }
```

Same idea as design tokens, applied to motion. It is why the site feels
coherent rather than like a pile of effects.

### Nothing on this site pins

Searched all 22 chunks: `pin:!0` appears **zero** times in site code
(`pinSpacing` appears twice, inside the ScrollTrigger library itself).
`SCRUB_TRIGGER` runs `top bottom` → `bottom top`, i.e. an element animates
during its normal pass through the viewport and the page never stops moving.

**This is exactly why he had no complaint here and did complain about
momentolegal.** Every scroll beat advances the page. Worth stating as a rule:
*scrub without pin* is the safe form of scroll animation; pinning is what
creates the stuck feeling he named as a hard no.

### The headline reveal he did not mention

```js
SplitText.create(e, {
  type: "lines", mask: "lines", autoSplit: !0,
  onSplit: n => gsap.set(n.masks, {
    overflow: "visible",
    clipPath: "inset(-0.3em 0px)"
  })
})
```

Real name: **line-masked reveal** (a "line mask" or "clip reveal"). Each line
gets a wrapper with hidden overflow and slides up from behind its own edge. The
`inset(-0.3em 0px)` is a careful touch — it lets descenders and accents overflow
vertically so the mask never clips a letter, while still cropping horizontally.

The screenshot `221656` shows the result at rest: "We design brands and build
digital and AI-driven experiences." set in Archivo at roughly 1:1 line spacing.
`autoSplit: true` means it re-splits on resize, which is what stops a
line-masked headline breaking when the viewport changes — the usual bug in
hand-rolled versions.

### What he said, matched to evidence

| His words | Screenshot | Real name | Code |
|---|---|---|---|
| "I like the font" | `221656` | Archivo (display) + JetBrains Mono (labels/nav) | `--font-display:"Archivo"` |
| "there's a velocity to the scroll" | — (motion) | inertial smooth-scrolling | `ScrollSmoother.create({smooth: 1.1})`, desktop + fine-pointer only |
| "the little triangle kind of moves around with your mouse and also as you scroll" | `221656` | cursor-parallax on a WebGL object | **Not isolated.** Three.js and `WebGLRenderer` are confirmed present and draw the triangle; the specific pointer→rotation code could not be found in the minified bundle. Every `lerp` hit resolved to Three's own `Vector2.lerp`/`slerp`, and every pointer-event hit to GSAP's Observer. Reporting this rather than guessing. |
| "when you hover over things… some cool FX" | `221727` | row-level hover state | Visible in the screenshot: capability row 03 has a green left rule, lifted background, brightened text and a green arrow — a whole-row state change, not a link colour change. |
| "each section looks different… they all don't look the same" | `221656` vs `221727` | varied section treatment | Hero is a full-bleed dark scene with a huge WebGL object; capabilities is a plain bordered list with mono numerals. Same ground, different structure. |
| "at the bottom there's a cool kind of animation going on" | `221716` | animated wireframe globe with an arc | Three.js. A latitude/longitude wireframe sphere with a red great-circle arc drawing between office locations, sitting under the footer columns. Paired with a live `STUDIO TIME 07:17:12 CEST` clock and three sets of coordinates. |

### Striking things he did not mention

- **The light/dark toggle.** Top right of `221656` and `221727` — a sun/moon
  pill. Directly relevant: we have to ship both themes anyway.
- **Mono numerals as a system, not decoration.** `01 WORK / 02 ABOUT`,
  `01`–`06` on capabilities, `EST. 2013`, the coordinates, the clock — every
  figure on the page is JetBrains Mono while all prose is Archivo. This is
  worth stealing: it is a cheap, legible way to make numbers feel deliberate,
  and this product is full of prices, times and counts.
  **Caveat:** `01 / 02 / 03` on the nav is the numbered-marker tell from
  `design-knowledge.md` §1 — four nav links are not a sequence. On the
  capabilities list it is defensible; on the nav it is decoration.
- **The footer does real work.** A live clock, three cities with coordinates,
  and a globe. That is a template for our own footer: a business's actual hours
  and service area are the same kind of fact, and they are already in tenant
  settings.
- **Hairline rules everywhere.** Sections are separated by 1px full-width rules
  rather than by background changes or gaps.

### Cost to us

| Item | Weight | Effort | Android risk |
|---|---|---|---|
| Archivo + JetBrains Mono | ~2 × 20–40 KB woff2 subset | trivial | none |
| ScrollSmoother | **GSAP Club — a paid licence**, ~30 KB with ScrollTrigger | low | none (desktop-only anyway) |
| SplitText line-mask reveal | Club plugin, or ~30 lines hand-rolled | low–medium | low (transform/opacity only) |
| Three.js hero object | **~150 KB+ gzipped**, plus a scene to build | high | **high** — this is why they wrote the tier system |
| Device tier + FPS governor | ~15 lines, no dependency | low | **negative — it reduces risk** |
| Two-preset motion scale | zero | trivial | none |

**The licence point is a real decision, not a footnote.** ScrollSmoother and
SplitText are GSAP Club plugins. GSAP's core is free; these two historically
were not, though the terms changed after Webflow acquired GSAP. This must be
checked before either is used commercially in a product we sell. The free
alternatives are **Lenis** (~3 KB, MIT) for smooth scroll and a hand-rolled
line-mask for SplitText.

### Conflict with what binds us, and how to reconcile

1. **Numbered markers on the nav** — a named never-default. Reconcile: keep
   mono figures for real quantities (prices, times, counts, step numbers in the
   booking wizard, which genuinely *is* a sequence); drop them from navigation.
2. **Smooth scroll versus the dashboard.** The owner explicitly excluded scroll
   animation from the dashboard. Reconcile: riangle already does this for us —
   the gate is `(pointer: fine)`, so it is desktop-only by construction. Ship
   smooth scroll on the marketing page and tenant sites, never on `/app`.
3. **Three.js versus the empty-state rule.** A WebGL centrepiece is content a
   new tenant does not have to supply, which is superficially attractive for
   empty states — but 150 KB and a poster fallback for a business whose real
   asset is photographs of cars is the wrong trade. Reconcile: take the tier
   system, not the WebGL.

### Scroll payoff

**Good.** Nothing pins, `SCRUB_TRIGGER` animates elements during their normal
pass through the viewport, and the page always advances. Content density is
high — the capabilities screen alone delivers six services with descriptions in
one viewport (`221727`). This is the site in the set that best satisfies "every
scroll beat must advance something", and it does it by *not* using the
expensive technique rather than by using it well.

---

## 2. sharplink.com

A Nasdaq-listed Ethereum treasury company. The site he had the most mixed
reaction to: he liked the font and the hero transition, disliked the flat,
blocky sections. Both halves are visible in his three screenshots, and the
transition he could not name turns out to be the most directly stealable
technique in the whole set.

### The stack, from the code

Nuxt/Vue. 24 JS modules (2.3 MB uncompressed), 8 CSS files.

| Library | Present | Evidence |
|---|---|---|
| **Lenis** | yes | `<div class="lenis">` wrapper and `data-lenis-prevent` on the mobile menu, in the shipped HTML; the `VirtualScroll` class and Lenis constructor are in the bundle |
| GSAP | yes | 2 chunks |
| ScrollTrigger | yes | 3 chunks |
| **Three.js** | **configured but switched off** | `three: { enabled: false, options: { alpha: false, antialias: false, stencil: false, depth: false, powerPreference: "high…" } }` |
| Locomotive / Framer / Swiper | no | zero matches |

Type: **Archivo** and **Archivo Narrow**.

> **The strongest single signal in this whole document.** riangle.com sets
> `--font-display: "Archivo"`. sharplink.com sets `font-family: Archivo` and
> `Archivo Narrow`. The owner said "I like the font" about riangle and "font is
> also good" about sharplink — **independently, about the same typeface**,
> without knowing they matched. Archivo is a free Google font with a
> variable-width sibling (Archivo Expanded/Narrow), which gives the
> weight-and-width extremes `design-knowledge.md` §1 calls for from one family.

### Smooth-scroll config — partly found, partly not

Lenis is present and active. The **library defaults** in the shipped bundle:

```js
constructor({ wrapper: i = window, content: e = document.documentElement,
  eventsTarget: t = i, smoothWheel: s = !0, syncTouch: n = !1,
  syncTouchLerp: r = .075, touchInertiaExponent: o = 1.7,
  duration: a, easing: l, lerp: u = .1, … })
```

**I could not find the site's own options object.** Lenis is constructed with a
variable rather than an inline literal, and the only numeric `lerp:` values in
the bundle are the library's own defaults. So: `lerp: 0.1` and
`smoothWheel: true` are what ship *unless* overridden somewhere I did not
locate. Stating that rather than presenting the default as a decision.

One thing the default does tell us: **`syncTouch: false`**. Lenis leaves touch
scrolling native unless asked otherwise. Same practical outcome as riangle's
`(pointer: fine)` gate — the weighted scroll is a desktop experience.

### "It turns into a rectangle and then completely forms into another part of the website"

His words, and he apologised for them ("that's the best I could describe it").
They are actually an accurate description of an uncommon technique.

**Real name: a pinned, scrubbed `clip-path` hero-to-card transition.** The hero
does not shrink. The *window onto it* closes down to the size and position of a
card in the next section, while that section assembles behind it on the same
timeline.

The trigger:

```js
ScrollTrigger.create({
  trigger: o.value,
  start: "top top",
  end: () => `+=${o.value.offsetHeight * 1.5}`,
  pin: !0,
  scrub: !0,
  invalidateOnRefresh: !0,
  animation: d
})
```

Pinned for **1.5 × the hero's height**, scrub linked to scroll.

The morph itself — the crop, not a scale:

```js
d.fromTo(P.value,
  { clipPath: () =>
      `rect(0px ${window.innerWidth * 1.02}px ${window.innerHeight}px 0px)` },
  { clipPath: () =>
      `rect(160px ${(window.innerWidth * 1.02 + v.value.offsetWidth) / 2}px `
    + `${v.value.offsetHeight + 160}px `
    + `${(window.innerWidth * 1.02 - v.value.offsetWidth) / 2}px)`,
    ease: "none", duration: 1 }, 0)
```

Read plainly: the clip rectangle starts at the full viewport and ends centred,
inset 160 px from the top, exactly as wide as `v.value` — the element it is
becoming. Every value is a function, so it recomputes on resize
(`invalidateOnRefresh: true`).

Alongside it, on the same timeline and starting at the same instant:

```js
d.to($.value.$el, { width:  () => `${v.value.offsetWidth  * 1.1}px`,
                    height: () => `${v.value.offsetHeight * 1.3}px`,
                    duration: 1.3 }, 0)
d.fromTo(".home-productivity .line", {autoAlpha:0},{autoAlpha:1, ease:"none", duration:.2}, 0)
d.fromTo(".home-productivity .line, .home-productivity .heading-wrapper",
         {y:300},{duration:1.8, y:0, ease:"none"}, 0)
d.fromTo(".chart-wrapper .chart-image…", {autoAlpha:0},{autoAlpha:1, duration:.4}, .8)
d.fromTo(".chart-wrapper .label", {autoAlpha:0},{autoAlpha:1, duration:.4, stagger:.15}, .95)
d.fromTo(".chart-wrapper .value-inner", {yPercent:100},{yPercent:0, duration:.4, stagger:.15}, 1.1)
d.fromTo(".card-productivity", {autoAlpha:0, x:100},
         {duration:.5, autoAlpha:1, x:0, y:0, stagger:.2, ease:"power2.out"}, .8)
```

**That is why it reads as one event rather than two.** The hero closing and the
"Pioneering Productivity" section assembling are the same timeline, offset by
fractions of a second — the chart labels stagger in at 0.95, the figures roll up
from `yPercent: 100` at 1.1. Screenshot `221759` is the finished state: the
former hero is now the dark chart card in the middle of a light section.

Screenshot `221754` caught it **mid-transition** — the dark rectangle part-way
closed, the light section already visible behind it. That single frame is the
best evidence in the whole set of what he was describing.

**Desktop and mobile differ, they are not switched off:**

```js
gsap.matchMedia({ isDesktop: `(min-width: ${mobile}px)` }, (ctx) => {
  const { isMobile: n } = ctx.conditions;
  …
  ScrollTrigger.create({ trigger: B.value,
    start: n ? "top 100px"    : "top 160px",
    end:   n ? "bottom 320px" : "bottom 280px",
    scrub: !0, pin: !0, pinSpacing: !1, pinSpacer: !1, anticipatePin: 1, … })
})
```

A second pinned trigger uses `pinSpacing: false` — pinning without reserving
layout space, so the pinned element floats over content that keeps scrolling.
That is the mechanism behind the overlapping feel.

### What he disliked, matched to evidence

| His words | Screenshot | What is actually there |
|---|---|---|
| "how blocky it is" | `221759` | Hard-edged rectangular panels butted together, no radius, no shadow, no overlap between the three right-hand cards |
| "some of the fonts are hard to read… don't have a lot of depth" | `221759` | Body copy is mid-grey on a near-white panel; the "01 / 02 / 03" cards carry pale dotted line-art at very low contrast |
| "black font, white background… with vertical lines" | `221754`, `221759` | A dotted grid ruling the whole light section — verticals at the column edges and horizontals across. Visible clearly in `221754` where the light layer is exposed mid-transition |

His three complaints are one complaint: **the light sections have no depth
budget.** The dark hero has gradient, glow and photographic material; the light
sections have flat white, hairline dots, and grey text. Nothing is lit, nothing
overlaps, nothing casts.

This is `design-knowledge.md` §1 almost verbatim — "flat solid backgrounds with
no atmosphere or depth" — plus numbered markers (`01/02/03`) on three items that
are not a sequence, plus three evenly spaced cards. **It is worth telling him
that his instinct here matched the written anti-slop list exactly**, because it
means his eye and the file agree and we can trust both.

### Striking things he did not mention

- **The news ticker card** bottom-right of `221744` — a dated "COMPANY NEWS"
  item pinned over the hero. A live, dated fact as a hero element. Our
  equivalent is a real recent booking, which we have.
- **The hero is a product photograph treated as a technical drawing** —
  dashed leader lines and small registration squares over a rendered object.
  Cheap to imitate over a car photo, and it reads as engineering rather than
  decoration.
- **Two-tier CTA** — a solid white primary with an arrow chip, a transparent
  secondary. Simple and worth copying.
- **`backdrop-filter` appears 4 times in the CSS** — the nav bar over the hero.

### Behaviour under `prefers-reduced-motion`

**None.** Zero matches for `prefers-reduced-motion` across all 24 JS modules, all
8 CSS files, and the inlined critical CSS. A visitor who has asked their
operating system to reduce motion still gets the full pinned, scrubbed,
clip-path hero.

That is a genuine accessibility defect, and the contrast with riangle — which
gates *everything* behind `(prefers-reduced-motion: no-preference)` — is the
sharpest quality difference between any two sites here.

### Cost to us

| Item | Weight | Effort | Android risk |
|---|---|---|---|
| Lenis | ~3 KB gzipped, MIT | trivial | low — touch stays native by default |
| GSAP + ScrollTrigger | ~50 KB gzipped, free tier | low | low |
| The clip-path hero morph | no extra weight | **high — 1–2 days to get right** | **medium.** `clip-path` animation is compositor-friendly, but pinning plus a scrubbed timeline on a 1.5-viewport range forces layout work on every frame. Must be measured on a throttled CPU. |
| Archivo / Archivo Narrow | ~2 × 25 KB subset | trivial | none |

### Conflict with what binds us, and how to reconcile

1. **The hero morph versus the dashboard rule.** The owner banned scroll
   animation on the dashboard. No conflict — this belongs on the marketing page
   only, which is precisely the surface he said should be the most ambitious.
2. **The morph versus mid-range Android.** Real tension. Reconcile the way
   sharplink already does — `gsap.matchMedia` with different start/end values
   per breakpoint — but add what sharplink lacks: a `prefers-reduced-motion`
   branch that jumps to the end state, and riangle's device-tier check to skip
   the pin entirely on a weak device. Both hero treatments must produce the same
   final layout so the fallback is never a broken page.
3. **What he disliked is a warning, not just a preference.** Flat light panels,
   numbered non-sequences and three even cards are on the never-defaults list.
   The reconciliation is not "avoid light sections" — it is that a light section
   needs its own depth budget: layered tints, a real shadow scale, overlap,
   photography that bleeds across an edge.

### Scroll payoff

**Positive, and instructive about where the line is.** The hero pins for 1.5
viewport heights — long enough to be the "stuck" feeling he hates — but it does
not feel stuck, because the entire next section is being *built* during those
frames: lines draw, a chart appears, labels stagger, figures roll up. The user
is paying scroll and receiving content.

**This is the operative distinction for our own work, and it is worth writing
into the design system:** pinning is not the problem, pinning without delivery
is. A pin must be spending the scroll on assembling something the visitor then
gets to read. momentolegal (site 6) is the same technique with nothing on the
other side, and he named it as a hard no.
