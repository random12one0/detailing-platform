# Reference Sites — Owner's Taste Notes

Andrew's own words after scrolling each site, verbatim, plus a synthesis. The
verbatim section is the source of truth; where the synthesis and the quotes
disagree, the quotes win.

*Provenance: pasted into a Claude Code session 2026-08-29 and written to disk
unchanged, because it existed only in the chat and would not have survived a
`/clear`. This is the only record of how these pages MOVE — screenshots are
stills and the analysis cannot watch a page. Treat it as primary evidence.*

## Verbatim

### riangle.com

"I like the font. The scroll when you go down, it's like there's a velocity to
the scroll, and the little triangle kind of moves around with your mouse and
also as you scroll. Other than that, that's pretty much it — maybe just kind of
when you hover over things it just kinda has a nice, you know, there's some cool
FX there when you hover over different stuff. I also like how each section looks
different, you know, and they all don't look the same. At the bottom there's a
cool kind of animation going on."

### sharplink.com

"Font is also good. Also like, as you scroll away, it's not immediately down —
it's like when you scroll, that first main page turns into a rectangle and then
completely forms into another part of the website. I don't know, that's the best
I could describe it. There's also something I don't like about it: how blocky it
is, and sometimes some of the fonts are hard to read just because some parts
don't have a lot of depth to it. That's kind of just black font, white background
type of thing with vertical lines — that part I don't really like. But this
definitely has a lot of scrolling features inside of it. That first beginning
page is a kind of cool scroll-out animation."

### subscrr.app

"This kind of has that Apple kind of look to it. I don't really like the orange
color — out of all the colors we could choose, orange is not my favorite. I like
the more blue colors, even though it's kind of typical AI, but that's just kind
of my favorite color, I lean towards it. But that doesn't mean we need to do
blue. On the app, this is more basic than the other ones, it's less in-your-face
with the scrolling, but it's just formatted and nice. There's all the hover
things, and a nice kind of top bar with this kind of liquid glass — a sticky top
bar that's not attached to the very top, so it's kind of floating. Other than
that it's pretty basic."

### finseo.ai

"That main screen I kinda like a lot, it's got a nice feel when you first open it
up. Other than that, I like this one part of the website that has a cool
visualization in the middle that's moving, and when you let go the dots kind of
move and then it has some information about it. Also they don't make the whole
site the same — it's kind of split, they have some darker sections and some
lighter sections, so the whole website isn't the same exact background color. But
this one is also kind of basic and isn't one of my favorites, but it's still
good."

### gustavobatista.dev

"This is more over-the-top — this whole page is like one 3D animation almost, and
as you scroll it's all these cool switches. Looks cool, but probably wouldn't
take much from this. Out of anything I kinda like the texture that they put onto
it — not their specific texture, but how they have this green, and it reminds me
of Vox, like the YouTube company, how they have different kinds of textures that
they put on top of their images so it doesn't just look so plain. That's
definitely a separate aesthetic and I don't know if that's the aesthetic I'm
going towards. This is one I wouldn't really take into account as much."

### momentolegal.com

"This website is more elegant. That's not the exact font so I wouldn't take this
font into consideration, but they have a cool kind of scrolling animation. I feel
like this isn't really helpful at all. One thing I don't like about this is when
there's a lot of scrolling that doesn't really take you anywhere, so it feels
kind of like you're stuck, and I don't want to have that."

### webtactics.org

"This website is definitely very cool just in the fact that it's really
interactive — the 3D clip that warps around your mouse. Obviously we probably
aren't gonna do that exact thing, but I do like this front start and the coloring
of it, and how the first title kind of types itself in and retypes off of
different things. Even the first page is already showing a lot through animation.
When you scroll, I just like the layout, and each section really blends into each
other nicely, and I like how they overlay a lot of stuff. Now I don't want to
overlay to the point where it's hard to read stuff, but this site has a lot of
depth to it. It's just very enticing on whatever they're selling."

## Synthesis — what he's consistently asking for

Ranked by how many times it came up independently.

1. **Smooth, weighted scroll.** "There's a velocity to the scroll" (riangle) —
   inertial / eased scrolling rather than the browser default. Named first,
   unprompted.
2. **Depth and layering.** Praised in webtactics ("a lot of depth to it", "they
   overlay a lot of stuff"); its absence is the explicit complaint about
   sharplink ("some parts don't have a lot of depth… black font, white
   background"). Depth is his single strongest signal, positive and negative.
3. **Sections that don't all look the same.** Said about riangle and again about
   finseo ("some darker sections and some lighter sections"). He wants
   alternating bands and varied section treatments, not one uniform ground.
4. **Hero that transforms on scroll rather than just leaving.** sharplink's
   "first main page turns into a rectangle and then completely forms into another
   part of the website." A pinned/morphing hero, not a scroll-away hero.
5. **An element that tracks the cursor.** riangle's triangle "moves around with
   your mouse", webtactics' clip "warps around your mouse". Two independent
   mentions.
6. **Animated headline.** webtactics' title "types itself in and retypes off of
   different things."
7. **Hover feedback on everything.** Mentioned for riangle and subscrr.
   Non-negotiable baseline.
8. **Floating glass nav.** subscrr's "sticky top bar that's not attached to the
   very top, so it's kind of floating," with a liquid-glass treatment.
9. **Texture over flat imagery.** The Vox reference — grain/texture layered over
   images "so it doesn't just look so plain." Aesthetic-agnostic; it's about
   surface, not style.
10. **Sections blending into each other**, not stacked and separated
    (webtactics).

### Hard nos

- **Scroll that goes nowhere.** "A lot of scrolling that doesn't really take you
  anywhere, so it feels kind of like you're stuck" (momentolegal). Every scroll
  beat must advance something. This is the failure mode to test for, not just
  avoid.
- **Overlay that hurts legibility.** He likes overlap, "but not to the point
  where it's hard to read."
- **Flat, blocky, low-depth layout** — black on white with vertical rules.
- **Full-page 3D takeover** (gustavobatista) — looks cool, not his product.
- **Orange.** Stated preference toward blue, with the caveat "that doesn't mean
  we need to do blue" — and he flagged blue as "kind of typical AI" himself.

### Notes for whoever implements this

- Items 1, 5, 6 and 8 are cheap. Items 2, 3, 4 and 10 are where the perceived
  quality actually comes from, and they're layout decisions, not effects.
- Item 4 (pinned morphing hero) is the most expensive and the most likely to
  hurt mid-range Android performance. Prototype it in isolation before
  committing.
- His accent-color preference matters less than it appears: tenant sites retint
  per customer. It applies to the platform's own marketing surface only.
- Nothing here conflicts with the existing dark matte design system. "Depth",
  "texture" and "alternating section grounds" are all additive to it. The one
  tension worth checking is item 3 against a system built on a single consistent
  ground.

---

## Correction appended by the analysis session (2026-08-29)

**The last bullet above is out of date and must not be acted on.** It assumes
the "Raking Light" matte-dark system in `docs/design-system.md` is still the
identity. It is not: the owner scrapped it on 2026-08-28 (`DESIGN.md`), and on
2026-08-29 answered brief question B4 "Nah. Throw it out." — nothing is kept,
not the dark ground, not the fonts, not the one-lit-element rule.

So "conflict with the design system" cannot be assessed against that file as
law. Throughout `ANALYSIS.md` it is assessed against what actually still binds:

1. The **anti-slop floor** — `docs/design-knowledge.md` §1 and the
   never-defaults in `CLAUDE.md`. Not negotiable by any reference.
2. The **per-surface expressiveness budget** the owner set in
   `docs/design-brief.md` B1b — landing page most ambitious, booking page
   second with step transitions, dashboard "load in nicely" but explicitly NO
   scroll animation and "don't overdo it".
3. **Convenience governs the dashboard** — "the design that is visually
   appealing needs to be convenient."
4. The **empty-state rule** — it must look intentional for a detailer with two
   services and no photos.
5. **Mid-range Android** is the performance target (`design-knowledge.md` §4).

The third bullet in that same list is also now settled rather than open: the
owner confirmed on 2026-08-29 that tenant accent colour applies to
customer-facing surfaces only and the dashboard keeps one fixed house palette,
from a curated set of roughly four to six colours.
