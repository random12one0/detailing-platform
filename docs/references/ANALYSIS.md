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

---

## 3. subscrr.app

A subscription-tracking iOS app. The simplest site in the set technically, and
the one that most usefully contradicts the owner's own stated priorities. Its
source is **unminified and commented** (in Russian), so this is the only site
here where the authors' reasoning can be read directly rather than inferred.

### The stack, from the code

No framework, no build step. Three CDN scripts at pinned versions, plus the
site's own two files:

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js">
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js">
<link rel="stylesheet" href="styles.css">   <!-- 66 KB -->
<script src="script.js">                    <!-- 68 KB, unminified -->
```

No Three.js (the two "three" matches in the HTML are the word *three* in body
copy). No Locomotive, Framer Motion or Swiper. The WebGL is **raw WebGL1**,
hand-written, about 60 lines.

Type: `--font: "Inter", -apple-system, …` and `--display: "Inter Tight"`.

### The finding that matters most: smooth scroll is deliberately switched off

```js
/* ---------- Smooth scroll ----------
   Lenis отключён: нативный скролл, как на блоге — быстрее и без «вязкости».
   Все вызовы ниже имеют нативные фолбэки (scrollIntoView / window.scrollTo). */
const SMOOTH_SCROLL = false;
let lenis = null;
if (SMOOTH_SCROLL && hasLenis && !reduce) {
  lenis = new Lenis({ lerp: 0.16, smoothWheel: true, wheelMultiplier: 1.3 });
  …
}
```

Translated, the comment reads: *"Lenis disabled: native scroll, like on the
blog — faster and without 'viscosity'. All calls below have native fallbacks."*

So the config exists and is real — `lerp: 0.16`, `wheelMultiplier: 1.3` — but
it is dead code behind a `false`. They built inertial scrolling, shipped it,
judged it worse than the browser's own, and turned it off. The Lenis bundle is
still fetched from the CDN on every visit and never used.

**Why this is the most useful single fact for our decision.** Smooth, weighted
scroll is the owner's #1 stated preference, named first and unprompted. About
this site he said: *"it's less in-your-face with the scrolling, but it's just
formatted and nice"* and *"this kind of has that Apple kind of look to it."*

He noticed the absence — and still rated the site as the Apple-like one. **The
site he compared to his one confident brand anchor is the one with no smooth
scroll at all.** That does not mean he is wrong to want it; it means weighted
scroll is not what produces the quality he is reaching for. Spacing, type
scale, restraint and one excellent detail did that here.

### "A sticky top bar that's not attached to the very top… liquid glass"

Precise observation, and the CSS is worth quoting almost in full because it is
the single most copyable component in the entire reference set.

**The floating pill:**

```css
.nav {
  position: fixed; top: 14px; left: 50%; transform: translateX(-50%);
  z-index: 100; width: calc(100% - 28px); max-width: var(--wrap);
  display: flex; align-items: center; gap: 24px;
  padding: 12px 12px 12px 22px;
  border-radius: 100px;
  transition: transform .5s var(--ease), background .4s, box-shadow .4s, top .45s var(--ease);
}
.nav.is-hidden { transform: translateX(-50%) translateY(-140%); }
```

`top: 14px` and `width: calc(100% - 28px)` are the entire "not attached to the
very top" effect — a 14 px gutter on all sides. `border-radius: 100px` makes it
a pill. `is-hidden` slides it away on scroll-down.

**The glass, and the performance reasoning behind it.** The authors' comment
(translated): *"the fisheye zoom samples only inside the pill, so the layer
barely extends beyond it — that makes the filter many times cheaper on every
scroll frame."*

```css
.nav__glass   { position: absolute; inset: 0; border-radius: inherit;
                overflow: hidden; z-index: -1; }
.nav__glass i { position: absolute; inset: -2%;
                backdrop-filter: blur(7px) saturate(175%); }
```

Screenshot `221838` is the proof — a tight crop of the bar with the headline
and phone mockup visibly smeared and desaturated-then-resaturated behind it.

**The light rim**, a 1 px gradient border done with mask compositing rather
than a border property, so it can be a gradient:

```css
.nav::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, var(--nav-edge-a),
    rgba(255,255,255,.08) 38%, rgba(255,255,255,.03) 62%, var(--nav-edge-b));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
```

**The sheen**, a diagonal highlight plus a tint that changes once the page has
scrolled:

```css
.nav::before {
  background: linear-gradient(115deg, var(--nav-sheen-a) 0%,
    rgba(255,255,255,0) 34%, rgba(255,255,255,0) 66%, var(--nav-sheen-b) 100%),
    var(--nav-tint);
  transition: background .4s;
}
.nav.is-scrolled::before { …, var(--nav-tint-scrolled); }
```

Their own comment says the external shadow was removed deliberately: *"there is
no outer shadow — the glass is held by its rim and its sheen."* That is a
better lesson than the code: depth from a lit edge, not from a drop shadow.

**And then a second, much more expensive layer.** The CSS credits a port of
`rdev/liquid-glass-react`, and `script.js` builds an SVG filter chain at
runtime — `feImage` displacement maps, `feGaussianBlur` to remove 8-bit
quantisation stepping, then **per-channel displacement at three different
scales blended with `screen`**, i.e. real chromatic aberration:

```js
channels.forEach(([name, scale, matrix]) => {
  filter.appendChild(el("feDisplacementMap", {
    in: "SourceGraphic", in2: "KMAP_S", scale,
    xChannelSelector: "R", yChannelSelector: "B", result: name + "_D" }));
  filter.appendChild(el("feColorMatrix", {
    in: name + "_D", type: "matrix", values: matrix, result: name + "_C" }));
});
filter.appendChild(el("feBlend", { in: "G_C", in2: "B_C", mode: "screen", result: "GB" }));
filter.appendChild(el("feBlend", { in: "R_C", in2: "GB",  mode: "screen" }));
```

Real name: **refraction via SVG displacement mapping with chromatic
aberration** — genuine lensing, not a blur. This is the expensive half and is
applied to the theme-toggle knob, not the whole bar.

### The atmosphere he did not mention

```js
function initGL() {
  const canvas = document.getElementById("gl");
  if (!canvas || reduce) { if (canvas) canvas.style.display = "none"; return; }
  const gl = canvas.getContext("webgl", { antialias: false, alpha: true });
  if (!gl) { canvas.style.display = "none"; return; }
  …
  uniform vec2 u_res; uniform float u_t; uniform vec2 u_mouse; uniform float u_dark;
  …
  vec2 warp = vec2(fbm(p + t + u_mouse * 0.4), fbm(p + vec2(4.7,2.1) - t));
```

A fractal-noise **mesh gradient** rendered on a full-page canvas, warped slowly
over time and pushed by the cursor (`u_mouse * 0.4`). It is the reason the
off-white ground in `221832` does not read as flat paint. About 60 lines of
raw WebGL, no library — and it is exactly the "atmosphere and depth rather than
solid colours" that `design-knowledge.md` §1 asks for.

### Other things he did not mention

- **Magnetic buttons** — cursor-proportional translation at 0.3, reset on
  leave, gated on `!reduce && hover`.
- **Hero mouse parallax** — floating elements lerped toward the cursor at
  `0.06` per frame via `--px`/`--py` custom properties.
- **A custom cursor was built and then deliberately disabled** — the comment
  reads *"Custom cursor disabled: normal system cursor"*. Two of the seven
  sites had a cursor-follow element; this one had one and removed it.
- **A working light/dark toggle** that also rewrites `<meta name="theme-color">`
  (`#0A0A0A` / `#f4f2ec`) so the phone's browser chrome matches. Cheap, and
  directly applicable to tenant sites viewed on phones.
- **The hero's real content is a screenshot of the product doing its job** —
  and beneath it, a card translating the total into "2× Return flight to
  Europe, 3× Weekend city trip, 4× PlayStation 5". Our equivalent would be
  translating a detailer's month into something they feel.

### Behaviour under `prefers-reduced-motion`

**Good, and structural.** One flag, read once, gating everything:

```js
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
```

Used at eight separate points — loader timeline, smooth scroll, anchor
scrolling (`behavior: reduce ? "auto" : "smooth"`), magnetic buttons, mouse
parallax, staggered reveals, the FAQ accordion, and the WebGL canvas (hidden
outright). Plus **five** `@media (prefers-reduced-motion: reduce)` blocks in the
CSS that force `opacity: 1; filter: none; transform: none`.

That is the pattern to copy: one boolean, read once, and every reveal has a
CSS end-state that is correct without motion.

### The problem he half-spotted: the typeface

He said "this kind of has that Apple kind of look to it" and rated it as nicely
formatted. The type is **Inter and Inter Tight**.

Inter is the first font named on the never-defaults list in `CLAUDE.md` and the
first tell in `design-knowledge.md` §1.

**This is worth telling him plainly rather than smoothing over.** The site he
picked as the Apple-like one is set in the font our own rules ban. The
resolution is that the Apple quality here is not coming from the typeface — it
is coming from the pill nav, the 14 px gutter, the warm off-white
(`#f4f2ec`, not white), the mesh-gradient atmosphere, the size jump between the
headline and everything else, and the restraint. Inter is doing the least
distinctive work on the page. We can take all of the former and none of the
latter, and the result will read *more* considered, not less.

### And the colour he disliked

"I don't really like the orange." The accent is a saturated red-orange on the
"Get the app" pill, the primary CTA and the in-app arrow (`221832`). Noted for
the palette shortlist as a rule-out, alongside his caveat that his lean toward
blue is a preference he himself flagged as "kind of typical AI".

### Cost to us

| Item | Weight | Effort | Android risk |
|---|---|---|---|
| Floating glass pill nav (CSS only) | zero | **half a day** | **low** — `backdrop-filter` is GPU-accelerated and the blur area is deliberately confined to the pill |
| The 1 px gradient rim (mask-composite) | zero | trivial | none |
| SVG displacement refraction | ~40 lines JS | high | **high** — SVG filter chains with `feImage` + `feDisplacementMap` are among the most expensive things on a mobile GPU. **Skip.** The `backdrop-filter` layer alone gives 90% of the look |
| WebGL mesh gradient | ~60 lines, no library | medium | medium — one full-screen fragment shader per frame; needs riangle's tier check, or a static gradient fallback |
| Magnetic / mouse parallax | ~20 lines | trivial | none (already gated on `hover`) |
| Inter / Inter Tight | — | — | **do not use** |

### Conflict with what binds us, and how to reconcile

1. **Inter is banned by name.** Reconcile: take the layout, spacing and glass;
   set them in a face with actual character. Archivo — which the owner praised
   twice, on the two other sites — has the width and weight range to do the same
   job with more identity.
2. **The floating nav versus the dashboard.** No conflict, and this is the one
   effect here that belongs on *all three* surfaces. A pill nav that hides on
   scroll-down and returns on scroll-up is a phone-first pattern; it gives
   screen back to the content, which is the dashboard's governing value.
3. **The mesh gradient versus the empty-state rule.** This is the strongest
   answer in the whole reference set to "a detailer with two services and no
   photos". Atmosphere that costs the tenant nothing to supply, retints from one
   accent value, and never looks like a grey placeholder box. Pair it with
   riangle's tier check.
4. **The disabled smooth scroll is a warning, not a prohibition.** Reconcile by
   testing rather than assuming: build the marketing page with Lenis behind a
   single flag, the way subscrr did, and have the owner feel it on his own
   phone before committing.

### Scroll payoff

**High per unit of scroll, low ambition.** He called it "pretty basic" and he is
right — nothing pins, nothing scrubs, sections simply arrive with staggered
reveals. But every screen delivers a complete idea and the page is short.

The lesson is uncomfortable and worth stating: **this site achieves his stated
goal — looking expensive and Apple-like — with none of his stated techniques.**
No smooth scroll, no morphing hero, no cursor element, no 3D. It buys the whole
impression with one immaculate component, a warm ground, real product imagery
and generous space. If effort has to be spent somewhere, this is the cheapest
route to "looks expensive" of any site here.
