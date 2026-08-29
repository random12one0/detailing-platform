# Roadmap 1.3 — the rebuild, and the four that were rejected

**Read `VERDICT.md` (why the four died) and `BUILD-BRIEF.md` (the plan, §7
especially) before this file.**

---

# Part one — Direction 5, "The Thread" (the rebuild)

**Built 2026-08-29 after the owner rejected all four. `5-the-thread.html`.
One page, built properly, rather than four more guesses on a corrected brief.
He has since reviewed it — "so much better" — and two further rounds of his
corrections are in, including an iPhone test. See "Round two" and
"Round three" below; they supersede any detail above them.**

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
| 2 | The thread | two columns, animated transfer — pinned on desktop, scrubbed without a pin on phones (see Round three) |
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
| A light that never stops | his "some glowing animation that's constantly looping" | Two soft lights drifting over the ground on a 15 s and 19 s loop, plus a lattice of dots drifting diagonally forever. Lightness only — a drifting *coloured* wash is the tell that got flagged on direction 3. |
| A light that follows the pointer | subscrr's hero parallax, lerped at 0.06 | One composited layer chasing the cursor at 0.09 across the WHOLE page, not just the buttons. Fine pointers only. |
| Figures that roll up on arrival | finseo's `number-flow`, and the old landing page's own CountUp | About ten lines. Width reserved in `ch` first, so counting never nudges the layout. |
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
| Section 2, desktop | **1.9 screens**, and it says so on screen | An entire dashboard assembles inside it |
| Section 2, phone | **no pin at all** — ~1.4 screens of ordinary travel | The same transfer, and the page never stops advancing |
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

## Round two — his review of the built page, 2026-08-29

He opened it and said *"so much better"*, then gave five corrections. All five
are in. Recorded because the reasoning behind each one is the useful part.

### 1. The weighted scroll was not weighted enough

> "More velocity when you scroll... this is kind of normal, like when I'm
> scrolling on a web page, this kinda feels like how it stops. But that one
> kinda had a more, not velocity, but it slowed down slower. If you scroll it
> kinda went down a little more."

Two knobs, and he was describing both. Distance per gesture went from 1.0 to
**1.22**; the lerp — how much of the remaining gap closes per frame, so a
smaller number is a longer tail — went from **0.11 to 0.055**, which is
webtactics' territory (`lerp: 0.065`) and webtactics is the site he was most
enthusiastic about. There is a floor: gustavobatista runs `scrub: 2` and
`ANALYSIS.md` records that it "feels detached from the input".

### 2. Things below the fold were not animating in — and the cause was a bug

> "The five twenty demo Saturday, or the whole front door — I want, when I
> scroll down, those aren't just kinda there. It kind of animates in."

He was right and the cause was not the animation, it was a **4-second blanket
failsafe** that revealed every element on the page whether or not it had been
reached. Four seconds after load the whole document was already in its end
state, so nothing below the fold ever moved. The failsafe meant to stop content
being stranded hidden was silently deleting the animation instead.

The IntersectionObserver and the failsafe are both gone, replaced by one
mechanism: a pending list checked in the scroll frame that already runs. An
element reveals when its top crosses 82% of the screen height and at no other
time, and because it is a comparison rather than an event, nothing can be
skipped by scrolling fast or jumping to an anchor. Elements drop out of the
list as they fire, so the cost falls to zero.

Reveals are also stronger now (38px of travel against 22px, 950ms against
820ms), figures **roll up** when they arrive rather than being there already,
and the ticks stagger one at a time instead of as a block.

### 3. The pointer light, across the whole page

> "When I hover over this new booking just now, my mouse kinda creates a
> gradient. If I could go through the whole site, when I moved around the
> entire website, the background kind of has a little glow onto where my
> mouse is."

One composited layer that **lerps** toward the cursor at 0.09 rather than
tracking it exactly — the lag is the difference between a lit surface and a
torch taped to the mouse, and it is subscrr's trick. Fine pointers only. It
sits under the content, so the light band hides it automatically.

### 4. The background had to actually move

> "Right now it's kinda just this gradient black or white, but maybe we have
> something that's kind of moving... maybe some orbs moving around, or dots."
> And after testing: "if we do do dots in the background, the background needs
> to be moving. That's what I meant."

A lattice of dots drifting diagonally, forever — one repeating background and
one transform, travelling exactly one tile per cycle so the loop is seamless.
The two existing lights were sped up from 22s/29s to 15s/19s: the movement was
real at 22s but too slow to read as movement, which was the whole point of it.
No canvas, no renderer.

### 5. The founding offer

> "Don't forget that we're gonna have, like, a first three people get four
> ninety nine, nine hundred."

In. `founding_total integer not null default 3` in migration
`20260828001000`, so "3 of 3 left" is the real launch state rather than a
number invented for a mockup. $900 and $60 are the real list prices, struck
only because a genuine discount is live. The live page reads the remaining
count from the database and fails CLOSED so a taken spot is never advertised;
a static file has no database, which is why this one states the starting
figure.

---

## Round three — the iPhone, and the two things it broke

He then tested on an actual iPhone. Both findings are ones a desktop browser
cannot produce.

### The pinned section did not work on mobile at all

> "The first kind of scroll stop where it shows the before and after, it just
> doesn't work on iPhone. It glitches out. Maybe we replace it with a
> different one for mobile, but still has a cool scrolling effect."

The two things that break a pin on iOS Safari were exactly what it was built
on: **a sticky element sized in viewport units**, and **scroll progress
measured against a viewport height that changes as the URL bar hides and
returns**. Every frame of the transfer was doing arithmetic against a moving
number, and a `resize` fired on nearly every gesture, re-measuring the flight
paths mid-flight.

**The phone no longer pins at all.** The section scrolls normally and the
transfer is driven by the block's own pass through the viewport — riangle's
`SCRUB_TRIGGER`, which `ANALYSIS.md` calls the safe form of scroll animation
and which that site uses for everything (`pin:!0` appears zero times in its
code). Nothing is sticky, nothing is measured in `vh`, and the page never stops
advancing. The animation is not weaker for it: the same messages fly into the
same rows, over about 1.4 screens of travel.

Supporting fixes: `svh` instead of `vh` wherever a viewport unit survives,
resize handling gated on **width** changes only, and an `orientationchange`
branch. The vertical half of the collapse was deleted rather than tuned — it
existed to close dead space at the end of the *pinned* phone layout, and with
no pin it just opened a gap underneath the dashboard instead.

**Still unverified: I have no iPhone here.** Removing sticky and viewport-unit
arithmetic removes the two known iOS failure classes, and the mechanism that
replaces them is the one his own favourite site uses — but that is reasoning,
not observation, and it needs his phone to confirm.

### Hover-only states are invisible to half the audience

> "On mobile, most of the time when you scroll you're not always having your
> mouse on the page... maybe we should have it highlight automatically the one
> that's in the middle. So there's still some animation when you scroll."

Exactly right, and it applied to the whole ruled list — a piece of the design
nobody on a phone could ever see. Whichever row is nearest the middle of the
screen now lights itself as you scroll past, using the same treatment the
cursor triggers. Registered only when the device cannot hover, so a desktop
keeps hover and the two never fight. Verified at 392: the highlight tracks from
row to row and clears when the list leaves the screen.

## Round four — his second pass, 2026-08-29

### Reveals now run both ways, without the trap he spotted

> "If we scroll up and then scroll back down, they happen again... I want it
> linked to the part of the page that you're on, like how the other scroll
> effects are."

And then, unprompted, the objection to his own idea:

> "I get why the animations aren't linked with the scroll — because if someone
> scrolls down halfway, not everything will be showing... I don't want someone
> to be like, wait, why is there no text there just because it wasn't loaded in
> from the screen they were at."

Both are satisfied by one rule, and it is worth stating precisely because it is
the whole answer: **an element is hidden only while its top is still below 82%
of the screen height.** Nothing else is consulted — not whether it has been
seen, not which way you are scrolling.

- Scroll down: it crosses the line and plays.
- Scroll up: it goes back below the line and reverses.
- Scroll down again: it plays again.
- **Land anywhere — a reload, a `#price` link, a restored scroll position —
  and everything you can read is already in its end state**, because being
  above the line is the entire condition. There is no "has this been
  witnessed" flag to get stranded on.

Verified by both tests: the ruled rows toggle `in → out → in` across a
700px up-and-back, and loading straight to `#price` two-thirds down the page
leaves nothing readable hidden.

Exits use `--t-exit` (420ms) against the 950ms entrance and drop the stagger,
because a CSS transition takes the timing of the state it moves *to* — so
putting the short duration on `:not(.in)` gives the reverse its own speed for
free. Exits faster than entrances is `design-knowledge.md` §1.

Positions are cached at measure time rather than read per frame: 42 elements
× `getBoundingClientRect` on every scroll frame is a layout read a mid-range
Android does not need. They re-cache when the layout can actually have moved
— fonts arriving, a width change, an orientation change — and `sizeRail()`
runs first, because it changes the height of a wrapper everything below sits
under.

### The mobile gap — a leftover rule, and a lesson

> "There's like this whole almost phone-length area of blank space... I could
> screenshot and there's literally nothing on the entire page."

Measured rather than guessed: `#threadWrap` was **2,363px tall around a 984px
section — 1,379px of nothing**, about 1.6 phone screens. The cause was a
`.thread-wrap{height:280vh}` left at the bottom of the mobile media block from
the version that still pinned on phones. It sat *after* the `height:auto` that
replaced it and quietly won.

**The lesson, and it is general: when a layout stops pinning, the reserved
scroll height has to go with it.** A pin is two things — the sticky element and
the tall wrapper that pays for it — and removing only the first leaves an empty
room behind.

The page is 1.6 screens shorter on a phone as a result.

### "What is that $520 section actually about? I don't get it."

A fair hit, and a copy failure rather than a layout one. It read *"Demo
Saturday, before 6 am / Nothing was retyped"* — a caption written for someone
who already knew what they were looking at, answering a question the page had
never asked. He also misread "6 am" as "six PM", which is its own evidence.

It now says what the number is in its first line and points back at the thread
the four jobs came from:

> **$520** — Saturday's four jobs, already booked
> That is the same four texts from up the page, turned into a day. Sorted into
> the order you will actually drive them, priced off your own list, sitting
> there before you have had coffee. You did not type a word of it.
> *An example day — the figure adds up the four jobs above*

The sample-data label survives, as the honesty rule requires, but as a quiet
mono line rather than as the section's headline.

### Two dials

- **Cursor light halved**, 820px → 420px, with the alpha lifted from .14 to
  .17 so a smaller pool stays as present.
- **The dots were moving and he could not tell** — 46px over 26s is 1.8px a
  second, which is real movement and far too slow to read as any. Now two
  tiles (92px) over 8s, about 16px a second, at .075 opacity instead of .05.
  Measured in the browser: the layer moved 90px → 9.6px across one second, so
  it is genuinely travelling and the loop wraps seamlessly. The travel has to
  stay an exact multiple of the tile or the loop visibly jumps.

## Round five — the bottom-of-page bug, and where to view it

### Elements at the very bottom could never appear

He saw "glitchy stuff" at the bottom on a phone and wondered if it was the
emulator. It was not. Measured at maximum scroll: **six elements were on
screen and invisible** — the second pricing card, three of the four terms and
the whole footer — because the reveal line sits at 82% of the screen height and
at the end of the document there is no scroll left to bring anything above it.

Over the final stretch the line now eases from 82% down to the full viewport
height, so everything can always finish arriving. Verified: 0 stranded elements
at maximum scroll, where there were 6.

**General rule for any position-driven reveal: the trigger line has to be
reachable for every element, and near the end of a scroll container it stops
being reachable unless you move it.**

### A permanent URL

The local `python -m http.server` dies when the session ends, which is why the
link stopped working on his phone. The page is now also published as a private
Artifact, which survives the session and opens anywhere:

**https://claude.ai/code/artifact/e678cecb-94c3-4be8-9b4f-d3066b15b15e**

It is the same file, transformed only to drop the `<!doctype>`/`<html>`/`<head>`
wrapper the artifact host supplies itself. `?lite=1` and `?smooth=0` still work
on it. Deliberately NOT a Netlify deploy: `.netlify/state.json` in this working
directory pins the production site, and roadmap 0.4 records that as a live
hazard — a stray publish from here reaches detailingplatform.com.

## Round six — roadmap 1.4, the repoint (2026-08-29)

**What changed and why, in one line: the page was selling the booking engine,
and the booking engine is the commodity half.** The owner's positioning change
is in `DECISIONS.md` under "Positioning: what we sell is the pair" — read its
CORRECTION section, which is the operative version. The sentence the page now
has to say is **"we build you a website and the dashboard that runs it"**, as
ONE purchase. The website half leads because it is the half nobody else is
selling; the dashboard is in the same sentence, never in a later section that
reads as a bonus. Only the live-editing *feature* stays out of the headline.

### The hero: same mechanic, pointed at the gap

The rotating tail is the thing he liked, so it was kept and re-aimed. It used
to name four versions of the same DM ("your DMs." / "your Yelp inbox." / "a
text at 11 pm." / "your notes app."). It now names what a detailer has
INSTEAD of a website:

> **Your website is currently** *a Facebook page. / a Yelp listing. / a link
> in your bio. / nothing at all.*

The line beneath it carries both halves in one breath — *"We build you a
website and the dashboard that runs it — one build, not a site with software
bolted on."* — and the floating object beside it is still the dashboard's own
job card. So the headline is the website, the object is the dashboard, and
neither is demoted to the other's accessory. That was the specific trap named
in the roadmap, and it is avoided by construction rather than by wording.

**The headline had to be resized, and the number was measured, not guessed.**
The new tails are longer than the old ones. At the previous
`clamp(40px,5.3vw,76px)`, "a Facebook page." rendered **741px wide inside a
742px column** at 1440 — the caret was already wrapping onto a line of its
own — and **390px inside a 352px column** at 392, where the words themselves
wrapped. That is the one way this headline can look broken, and it was broken.
Two changes, both measured across seven widths:

- the clamp is now `clamp(38px,5.15vw,74px)` — longest tail 722px in 742px;
- below 470px the **width axis** absorbs it instead of the size (`wdth` 118 to
  92, on the tail only), so the phone keeps a 38px headline and the longest
  tail measures 287px in a 352px column. Only the rotating line condenses; the
  two fixed lines above it are untouched, and the difference is invisible
  unless the two are measured against each other;
- one guard below 340px, for the original iPhone SE width.

### "Stop booking jobs in your DMs" moved, and did not die

It is the only line he has ever explicitly praised, so it was not deleted — it
moved down to head the thread section, which is literally the picture of it.
It stops being the promise and becomes the pain. Its old setup line ("Four
jobs came in. None of them are in a calendar.") is kept underneath as the
lede, because that is the line that tells you what you are about to watch.

### Section 5 was replaced, not added to

This is where the positioning actually lived. The section used to show a
**phone-shaped booking widget floating on its own** — which is a picture of a
booking tool, the exact category we are trying not to be filed in. It now
shows the **website**, in a window with `andrewsdetail.com` in the address
bar, with the booking panel bordered INSIDE the page. That containment is the
claim made as a shape rather than as a sentence: *built into the page, not a
link to somewhere else.*

The object half of the section also grew from `.74fr` to `1.1fr` — a website
squeezed narrower than the paragraph describing it argues against itself.
**The section did not get taller**: a window is landscape where the phone
panel was portrait. His instruction that the page must not get longer was
honoured by REPLACING, and the page is the same length it was.

### The rest of the concrete list

- **New ruled row 02** in "What you get": *"Changes when you do"* — raise a
  price and the live site changes. Placed second, deliberately not the
  headline (his instruction), because it is the answer to why an agency site
  rots. The rows renumbered 01 to 04.
- **The $900 is a build price, not a joining fee.** `$499 to build it` against
  `$900`, and the lead plan is now labelled **"Website + dashboard"** — it
  said "Website + booking", which left the dashboard out of the offer
  entirely. The copy sets it against the two real alternatives (a template you
  fill in yourself, or an agency that charges again every time a price
  changes). **No competitor figure is quoted**: the $2,000–8,000 range in
  DECISIONS.md is research, not a number this page can stand behind.
- **The dashboard's empty state is drawn** — the carried-over 1.3 item. The
  job rows are always in the DOM at opacity 0 so the card never changes
  height, which meant the start of the transfer was a titled void under "Next
  up". A dashed panel now sits on exactly that reserved space — *"Nothing yet.
  Your Saturday is still in your phone."* — and fades on the FIRST job's own
  progress value, so it leaves as the day arrives rather than on a timer of
  its own.

### Three defects found by looking, two of them pre-existing

1. **"Start free" in the nav was a promise the product does not make.** There
   is no free tier — the cheapest plan is $35/month — and `LandingPage.jsx`
   says "Get started". `tests/landing-pricing.test.mjs` has a test named *"no
   unearned free-trial promise"*; it scans the real landing page, not this
   file, which is exactly how the claim survived here. Now "Get started".
2. **The reduced-motion path showed "0 jobs · $0 · nothing booked" above four
   fully visible job rows.** Reproduced on the COMMITTED version before any
   1.4 edit, so it predates this item. Cause: the scroll listener is only
   attached when `!LITE`, but `ready()` calls `onScroll()` once
   unconditionally — so a reduced-motion visitor got exactly one scrub frame,
   at progress 0, which overwrote the `setSummary(JOBS.length, TOTAL)` call
   that exists specifically to prevent this. Fixed at the root: the whole
   scrub loop is skipped in LITE, not just the reveal sweep. Nothing else
   needed it — every scrub target is already overridden by `.lite` CSS.
3. **Section 6 said "no designer"** while the pricing card says the fee covers
   having the site built for you. Both cannot be true. The lede is now *"No
   setup wizard and no migration. You are bookable the same day; the site is
   built with you from there"*, which is what actually happens: the
   booking-only tier is self-serve, the website tier is built with them.

### Verified, by looking

Screenshotted at **1440x900, 768x1024 and 392x844**, nine scroll positions
each, in the normal path AND in `?lite=1`. **Console clean at every viewport
in both paths.** Page length unchanged (9.47 screens at 1440, against 9.47
before). The four credential-free tests pass (composition, design-contrast,
landing-pricing, route-contract). Every new small-text element was measured
for contrast rather than eyeballed:

| element | ratio |
|---|---|
| address bar, 11px mono | 6.06:1 |
| site nav links, 11.5px | 5.61:1 |
| "Booking · on this page" label, 10.5px | 5.61:1 |
| service duration, 11.5px | 6.06:1 |
| site footer, 11px | 5.61:1 |
| dashboard empty state, 13.5px | 5.16:1 |
| band caption, 10.5px | 5.61:1 |

All above the 4.5:1 floor.

### One thing NOT done, on purpose, and it is a question for him

**The tenant-site mock has no photograph on it.** The whole page is type and
rules with no image anywhere, and `CLAUDE.md` bans grey placeholder boxes
outright — so a photo-shaped hole was never an option. But a real detailer's
site sells on pictures of their work, and a site mock with none may undersell
the thing the page now leads with. Adding stock photography is a change to a
look he has already approved and it was not on the 1.4 list, so it was not
done unilaterally. **His call.**

### The artifact was republished, and there is a catch

The permanent URL below now carries the 1.4 page. **But the artifact reports
that people opening the SHARED link keep seeing the previously pinned version
until the share pin is moved from the page's share menu** — which only he can
do. If the phone shows the old headline ("Stop booking jobs in your DMs" at
the top), that is what happened: open it from the artifacts gallery instead,
or move the share pin.

## Round seven — his review of the repoint (2026-08-29)

He looked at it on the iPhone and answered the three questions. His decisions
are recorded in `DECISIONS.md` under "The owner's review of the repointed
page"; this is what changed in the file.

### The iPhone passes, and the bottom glitch was real

> "iPhone check everything looks good... there's still some slight little
> glitch when you scroll all the way down to the bottom, but very minor."

**The 1.3 blocker is closed.** The remaining glitch was reproduced before it
was touched, at 392x844: scroll to the very bottom, then nudge back up about
120px, and the footer folded itself away and came back.

The cause is in round five's own fix. Over the last stretch of the page the
reveal line eases from 82% of the screen down to 100%, so that elements which
can never reach the 82% line still arrive. But an eased line moves at roughly
**twice** the scroll delta in that stretch — scrolling up 120px dropped it
about 240px, back past elements it had only just revealed. Nothing was
stranded; it was oscillating.

The fix is hysteresis: **the line an element arrives on and the line it leaves
on are no longer the same line.** It arrives at 82% as before; it does not
leave until it is past the bottom edge of the screen — a band exactly as wide
as the easing can travel, so the two can never cross. Everywhere else on the
page this is the better rule anyway: something you can still see never folds
itself away while you are looking at it.

Verified by sweeping 25 scroll positions **down and then back up** at 1440,
768 and 392: **0 stranded readings** (an element readable on screen but
invisible), while 48 of 49 positions still had something hidden below the
fold — which proves the reveal still exists rather than having been disabled
to make the number zero.

### There is a photograph on the page now

> "I'm definitely not against it... a lot of the websites that I was really
> kinda referencing off of have tons of photos... it just needs to elevate
> the website."

One photo, in the tenant-site mock, as the hero of that mini-site with the
business name over it. That is the place it is unambiguously right:
`VERDICT.md` bans car photography as the LANDING PAGE's subject because we
sell software, and that still holds — but this is inside a picture of a
CLIENT's website, and photographs of their own work are what a detailer's
site is made of. The distinction is written into the markup so a later
session does not "fix" it by deleting the photo.

It is **embedded as a data URI**, not linked. The artifact host's CSP blocks
every external image origin, and the artifact is how he reads this page on his
phone — a linked photo would simply be missing there. 840x270 at q68 is 41 KB.
Unsplash, Deniz Demirci, photo `dlJelFmdpOc`.

**The text sits ON the image, so the mock gains the photo's height and not a
line more.** The page grew 0% at 1440 (9.47 screens, unchanged), 0.7% at 768
and 1.0% at 392.

### Text on a photograph has to be measured, and the first attempt failed

CSS values cannot tell you the contrast of white type over a picture — the
background is whatever the photo happens to be under each letter. So the check
**screenshots the box the text occupies with the text hidden, hands that PNG
back into the page as a data URI, reads it through a canvas, and takes the
lightest pixel painted.** No image library, and it models nothing, so it
cannot drift out of sync with the CSS the way a re-implementation of the
gradients would.

The first attempt — one gradient over the whole photo — **measured 1.96:1
behind the headline at 392px.** The crop puts a bright panel of car body
exactly where the business name goes. It looked fine.

The fix splits the job in two: a light tonal scrim over the whole picture to
pull it into the page's graphite range, and a second gradient bound to the
**text block**, which is the one doing the accessibility work. That way the
guarantee is bounded to the strip the words occupy, instead of being bought by
darkening the entire photograph until it stops being a photograph. A phone
also gets the image height back (208px), because at ~350px wide the headline
wraps to two lines and the text block had grown to cover three quarters of the
picture — it had stopped reading as a photo and started reading as a dark bar
with words on it.

After: **8.82:1 minimum behind the headline** (floor 3:1 for large bold) and
**10.2:1 minimum behind the sub-line** (floor 4.5:1), at all three viewports.

### The hero is provisional, and he says so

> "it's a little bit worse than what I liked before. I kinda liked the...
> 'stop booking jobs in your DMs' or whatever, that would change through."

Not reverted, and deliberately so — he did not ask for a revert, he asked to
wait for the marketing pass below. The conflict is real and is recorded rather
than smoothed over: roadmap 1.4 requires the hero to lead with the website,
which comes from his own positioning change; his taste prefers the line that
requirement displaced. Both are his. See `DECISIONS.md` for the question to
put to him if the marketing pass does not settle it.

### What 1.4 is waiting on, and the one rule over it

He is running the page's full text through a separate marketing AI and will
paste back its recommendations on layout, order and wording. *"Whatever it
comes back with, we have to adapt to it."* And, in the same breath:

> "I don't want us to lose any of that cool animations and scrolling effects
> that we have. We just might have to change them up... switch them, the
> order, maybe completely... redo some of them."

**Copy and section order are the marketing pass's to change, freely. The
motion is not spendable.** Every mechanic survives in some form — the messages
becoming the schedule, the weighted scroll, the reveals, the horizontal rail,
the light band, the always-on ground, the rotating tail. Re-point them,
re-order them, rebuild them; do not quietly end up with fewer because a new
copy deck was easier to lay out flat. Read "Eight sections, eight skeletons"
above before re-laying-out the page, so the rework knows what it is carrying.

## Round eight — the marketing rewrite, built (2026-08-29)

The owner ran the page's full text through a separate marketing AI, approved
what came back, and handed it over as a finished copy deck: *"Approved by the
owner. Build this."* This is that build. The deck's copy is used verbatim
everywhere; where a decision was mine rather than the deck's, it says so
below.

His standing rule governed the whole pass: **copy and section order belong to
the marketing deck; the motion does not.** So the first thing to report is the
motion audit.

### The motion audit — nothing was spent, three things were added

| mechanic | before | after |
|---|---|---|
| rotating typewriter | on what they lack | **kept**, re-pointed to five benefits |
| messages become the schedule | pinned two-column transfer | **kept, untouched** |
| rolling count-up figures | strip + pricing | **kept** |
| ruled rows lighting on approach | hover, and by position on touch | **kept** |
| light ground + object breaking the edge | one band | **kept**, and a second light ground added |
| horizontal sticky rail | three steps | **kept** |
| always-on ground: two drifting lights, dot lattice, grain, pointer light | | **kept** |
| weighted scroll | | **kept** |
| reversible position-driven reveals | | **kept** |
| line-masked headlines | | **kept** |
| dashboard empty state fading on the first job | | **kept** |
| glass nav giving screen back | | **kept** |
| pointer tilt and glow | | **kept** |
| **words brightening as they cross the reading line** | — | **NEW** |
| **native disclosure open/close** | — | **NEW** |
| **an accent-lit closing ground** | — | **NEW** |

Thirteen mechanics in, sixteen out. Skeletons went from eight to twelve, and
no two sections share one — the grammar he set in 1.3 ("no one scroll area,
one page looked the same") still holds at the longer length.

### What the deck changed

- **Hero.** New headline, fixed and permanent: *"A real website for your
  detailing business."* The typewriter moved off it onto a line of its own
  below, rotating five benefits instead of four absences — the deck's phrase
  is "the benefit instead of the insult". The price left the hero for the
  pricing section, and the button gained *"Built by a detailer who got tired
  of booking jobs at 11pm."*
- **The website section moved up**, from after "what you get" to before it,
  and got a new heading, a new lede and a fourth tick. The deck cut the "LIVE
  MARKUP, NOT A SCREENSHOT" caption.
- **All four "what you get" items are new**, and the order is the argument:
  getting booked leads, and "fewer people forget" — which was not in the old
  four at all — is third. The money summary was demoted out of the four and
  is now a caption on the dashboard it belongs to, which is what the deck
  asked for.
- **Three new sections**: who built it, what you're using now, and the
  questions. Plus a closing CTA.
- **Rail and pricing copy** tightened; the founding flag is now "3 founding
  spots".

### The three new sections, and why each has the shape it has

**Who built it** gets the only layout on the page with no object, no rule, no
column and no figure — everything above it is the product describing itself,
and this is one person talking. Its mechanic is new: the words brighten as
they cross the reading line, so the statement is taken at the pace it would be
spoken. One custom property is written per scroll frame onto the paragraph and
each word resolves its own colour from its index in CSS, so a forty-word
paragraph costs exactly what a four-word one costs. The dim end is 55% of the
bone, **measured at 5.65:1** — a word that has not brightened yet is still on
screen and still has to clear the contrast floor, and 55% clears the strict
body floor, not just the large-text one.

**What you're using now** is the only table on the page, and it is a table
because a comparison of four options across two axes genuinely is one. It gets
the second light ground — that is rhythm work as much as emphasis, because the
deck adds three sections to the back half and one light band would have left
eight dark screens in a row. The last row is the only lit one, inverted to
near-black inside the light band with the price in the accent, because it is
the answer the other three rows are the question for. On a phone the columns
collapse to stacked blocks and the per-cell labels come back, so no cell ever
sits on the page without saying what it is.

**Questions** is built on `<details>`/`<summary>` — the browser's own
disclosure element. No JavaScript, no ARIA to get wrong, keyboard and
screen-reader behaviour for free, and it survives every script on the page
failing. The first two are open on load so the section never reads as eight
closed doors, and the second is open deliberately: the deck calls it the most
important question on the page now that the audience includes detailers who
already have a bad website, because it lets that reader say yes without
admitting it.

**The last word** is the page's third ground — not the graphite, not the light
band, but the accent brought up for the only time it carries a whole section.
Centred exactly once, at the very end, against eleven sections that are not.

### One defect, and it was one I introduced

Adding an accordion to a page whose reveal system caches element positions is
a trap, and I walked into it before catching it. Opening a question pushes
everything below it down the document, while the reveal rule keeps comparing
against the positions cached at load — so every element after the FAQ would
have been measured against where it used to be for the rest of the session,
some of them visible but permanently hidden. `<details>` fires a `toggle`
event for exactly this; positions are re-cached on it. **Verified: all eight
questions opened at 392px, nothing stranded.** The same trap waits for any
future collapsible on this page.

### Verified, by looking and by measuring

- Screenshots at **1440x900, 768x1024 and 392x844**, thirteen scroll positions
  each, in the normal path AND `?lite=1`. **Console clean at every viewport in
  both paths.**
- **Reveal sweep: 61 scroll positions, down and back up, at all three
  viewports — 0 stranded readings**, while 60 of 61 positions still had
  something hidden below the fold, which proves the reveal still exists rather
  than having been switched off to make the number zero.
- **Contrast measured on all fifteen new text elements**, lowest 5.16:1
  against a 4.5 floor; the brightening paragraph's dim end measured separately
  in the live path at 5.65:1.
- The four credential-free tests pass.
- **The page is now 12.72 screens at 1440**, against 9.47 before. Three new
  sections is where it went. Worth saying plainly because "the page must not
  get longer" was his instruction twice over in 1.4 — the deck he has since
  approved supersedes it, but he should see the number rather than discover
  it.

### FOUR THINGS ONLY HE CAN CLOSE

1. **The photograph in "who built it" is missing and cannot be faked.** The
   deck asks for "one photo of you working — not a headshot". A stock photo of
   a stranger under a first-person paragraph saying "I run Andrew's Auto
   Detail" would be a picture of someone who is not him, presented as him, on
   a page selling a real business. That is a truthfulness problem, not a
   placeholder problem, so there is no photo rather than a wrong one. The CSS
   is written and waiting: drop an `<img class="whoshot">` in as the first
   child of that section and it becomes two columns.
2. **The words in that section are his to write.** The deck's own note: *"Mine
   is a placeholder with the right shape. It's the only section on the page
   where your voice matters more than the copy being good."* What is on the
   page is the deck's placeholder, unaltered.
3. **The four competitor price ranges are unverified.** The deck says so
   itself and asks for them to be checked against each source's own pricing
   page, understating rather than overstating. Two of them are not fixed
   prices at all — Yelp and Thumbtack sell per lead at auction — which is why
   that row states a model rather than a number. **This is a pre-ship
   blocker, recorded in DECISIONS.md.** It is not urgent for a direction file;
   it is absolute before the real landing page carries these claims.
4. **The $520 strip is still on the page and the deck never mentions it.** It
   was in the text inventory the deck was written from, so it was seen and
   dropped rather than missed. It is kept rather than deleted because it is
   the payoff of the section above it — the four texts becoming a day is what
   that transfer was for — and because it carries a skeleton and a mechanic
   nothing else has. His own rule says a mechanic may not be spent silently.
   **Keep or cut: his call, and cutting it is one deletion.**

## Round nine — his four instructions on the rewrite (2026-08-29)

### 1. The $520 section is gone

His call, so it went — markup, CSS and script. **That closes the open
question from round eight.** The count-up mechanic it carried survives on the
pricing figures, so nothing was lost from the motion inventory. Eleven
sections now, eleven skeletons, still no two alike.

### 2. No competitor prices anywhere — and that closes the pre-ship blocker

> "let's not like directly say competitor pricing but just have it be like an
> our thing is an improvement from all of these services"

The cost column is gone entirely. The table is two columns now: the thing on
the left, **what it leaves you with** on the right. Our own price stays in the
lit row, because that one is ours to state. The competitor figure in the
pricing section went the same way — "Booking software doesn't come with a
website. This does."

This is worth more than a tone change. Round eight logged a **pre-ship
blocker**: four unverified competitor price ranges, which the deck itself
demanded be checked against each source's own pricing page, and two of which
were not fixed prices at all because Yelp and Thumbtack sell leads at auction.
A wrong competitor price is the one claim on this page that a THIRD PARTY
rather than a customer would object to. **With no figures there is nothing to
verify and nothing to get wrong. The blocker is closed by deletion, which is
the best way to close one.**

**One row is new and it is not the deck's**: "A Facebook page — free, and it
is the first thing they find when they look you up." Added because the table
is now about what you're using rather than what you're paying, and a Facebook
page is what most of this audience is actually using — the FAQ says so in its
own first answer. It is still an addition to approved copy, so it is flagged
rather than slipped in. One line to remove.

### 3. The owner section reads as an About now

He is undecided about where it belongs — *"removing the owner sections or just
putting it on a new page... reformatting it like an about me or about the
owner type thing"* — so nothing was moved or deleted. What changed is its
shape: it now ends with a signature block (name, business, town) instead of
running straight into the next section, which is the difference between a
sales section written in first person and an about section. **Where it lives
is still his to decide** — see the open list below.

### 4. Scroll motion on the new sections, and a look pass

Three mechanics added, each one only in the place it belongs:

- **The comparison table wipes.** Each row's rule draws left to right as it
  arrives and its text slides in behind it; the lit row is clipped from the
  left, so the dark panel and everything on it arrive together like a shutter
  opening. Nothing else on the page wipes, which is the point. One scrub
  writes one number per row.
- **The answers slide open instead of popping.** A popping accordion is the
  thing every FAQ gets wrong and it no longer needs script to fix:
  `::details-content` is an element the browser was already making, and
  `interpolate-size` makes an auto height animatable. Guarded by `@supports`,
  so a browser without it keeps the instant open it has today — the content is
  never hidden or broken, it just arrives without the slide.
- **The closing glow gathers on approach** rather than sitting at full
  strength. It is the only place the accent works at the scale of a whole
  section, so it should feel like it is happening. Measured: `--ep` reaches
  0.978 at maximum scroll.
- **The About statement grew a reading rule** down its left side that fills in
  step with the words brightening — the same single number driving both, so
  the page is visibly reading along with you.

### Verified

- Console clean at 1440/768/392 in the normal path AND `?lite=1`.
- **Reveal sweep: 61 positions, down and back up, three viewports — 0
  stranded.** The table rows fade on `--rp` rather than on the reveal class,
  so they are invisible to that sweep; they were given their own check, and
  **no row is ever readable-on-screen and faded out** at any of those 183
  readings.
- The accordion still strands nothing with all eight questions open at 392.
- Contrast measured on every changed element, lowest 5.16:1.
- Both new scrubs reach full progress rather than stalling part-way: every
  row's wipe hits 1.000 and the lit row's clip fully opens.
- Four credential-free tests pass.
- **The page is 12.39 screens at 1440**, down from 12.72 — the removed
  section, partly offset by the fifth table row.

## Round ten — the owner section is gone (2026-08-29)

His call, after being given the fork and a recommendation against it. It was
removed cleanly: markup, CSS, script and the lite-path rule. **Ten sections,
ten skeletons, no two alike.** The page is 11.60 screens at 1440, down from
12.39.

**Two of the three things still blocking 1.4 went with it** — the photograph
of him working, and his own words for that section. Neither is needed now.

### The word-brightening mechanic went too, and was NOT re-homed

That section carried the only place on the page where the words brightened as
they crossed the reading line, plus the rule down its side that filled in step
with them. Both are gone.

His standing rule is that motion is not spendable, so this is worth being
explicit about rather than quiet: **the mechanic was not moved somewhere
else, and that is a judgement, not an oversight.** It suits a person talking,
read at the pace it would be spoken. Applied to a marketing lede it becomes an
effect looking for a home — which is exactly the "structure as decoration"
tell in `design-knowledge.md` §1. Forcing it into the hero or the closing
line to keep a count would have been the worse outcome.

The count did not fall anyway. Before the marketing rewrite began the page ran
thirteen mechanics; it now runs seventeen — the thirteen originals plus the
table wipe, the animated disclosures, the accent closing ground and the glow
that gathers on approach.

**Recoverable in full** — markup, CSS and script — from commit `6c6f412`,
which matters if that section ever becomes its own About page. Noted in the
file header too, so it is findable without this document.

**The claim it carried is not lost.** "Built by a detailer, for his own shop"
is the one thing on this page a software company cannot say, and it still
survives in the hero's sub-line: *"Built by a detailer who got tired of
booking jobs at 11pm."*

### Housekeeping done while in there

The stylesheet's section numbers had drifted out of sync with the document
across three rounds of adding and removing sections — the CSS block for the
website section still said "5. WHAT CUSTOMERS SEE" when it had been section 3
for two rounds. All ten are corrected. The blocks remain in the order they
were *written* rather than in page order, with a note at the top of the file
saying so: reordering a stylesheet to match the document is churn that risks
the cascade for no change in behaviour.

### Verified after the removal

- Console clean at 1440/768/392 in the normal path and `?lite=1`; eleven
  top-level blocks at every viewport, which is the ten sections plus the
  thread's own wrapper.
- **Reveal sweep: 61 positions, down and back up, three viewports — 0
  stranded**, and the table rows checked separately on their own `--rp`, never
  readable-but-faded.
- Accordion still strands nothing with all eight questions open at 392.
- The junction the removal created — the ruled list running straight into the
  light band where that section used to buffer them — was looked at and
  measured: 108px at 1440, 101px at 392. It reads as a section change, not as
  a collision.
- Four credential-free tests pass.

## Still open on direction 5

**Settled by his review** (so do not re-ask): he likes the direction — "so
much better", "the layout is good, I like it". The two-column beat did NOT
read as a before/after of a car; he asked only that it stay short, and it is
two sections. The weighted scroll was wanted heavier, not removed.

1. ~~**THE ONE BLOCKER: the iPhone fix is unverified.**~~ **CLOSED
   2026-08-29 — he checked and it passes. Do not re-open.** Original text
   kept below for the reasoning only.
   **THE ONE BLOCKER: the iPhone fix is unverified.** The pinned section broke
   on his phone and the mechanism has been replaced with one that cannot fail
   the same way — nothing sticky, no viewport-unit arithmetic. Verified at
   392, 768 and 1440 in a desktop browser with touch emulation, which is not
   the same thing as iOS Safari. **He needs to open it on the iPhone again and
   say whether that section now works.** Everything else in 1.4 can proceed
   whatever the answer; this cannot.
2. **The copy has not been reviewed and he knows it.** *"I think in the future
   we'll kind of critique the actual text on the page. For now, this is a good
   layout."* So the wording is provisional by agreement — it is mostly carried
   over from `app/src/landing/LandingPage.jsx`, which is the substance
   `DESIGN.md` says to keep, but no line here has been through him except
   "Stop booking jobs in your DMs". **This is a named 1.4 task, not a
   loose end.** **Round six ran that pass over everything the repoint
   touched** (hero, thread heading, section 5, the new row, pricing, section
   6) and killed two claims that were not true: "Start free" and "no
   designer". The sections it did NOT touch — the $520 strip, "What you get"
   rows 01/03/04, the rail steps, the terms, the footer — still carry their
   `LandingPage.jsx` wording and still have not been through him.
3. **The founding offer is in the page but not in the plan.** $499 / $900 for
   the first three is now rendered, and `founding_total` defaults to 3 in the
   migration — but whether the real launch runs it at 3, and whether the
   struck-price treatment survives his eye, is a 1.4 decision.
4. **Mid-range Android is still unmeasured.** Nothing here uses WebGL so the
   risk is far lower than direction 4's, and the phone no longer pins at all,
   which removes the most expensive path. Still worth his thumb on a cheap
   Android before Phase 2 commits to it.
5. ~~**The dashboard's empty state** is still undrawn.~~ **DONE in round six**
   — a dashed panel over the reserved job-row space, fading on the first job's
   progress value. See above.
6. **The device-tier question** (`APPLE-READ.md`) is untouched and stays a 1.5
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
