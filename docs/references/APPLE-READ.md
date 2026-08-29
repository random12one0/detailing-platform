# Apple product pages, read at the code level

Roadmap 1.3's mandated first task. The seven reference sites in `ANALYSIS.md`
were read as code; Apple's pages were not, and `DESIGN-BRIEF.md` Conflict 1
was reasoning from the owner's description. This file closes that gap.

**Read 2026-08-29** in a real browser: `apple.com/iphone-17-pro` in full — its
DOM, its 1.1 MB page stylesheet (`overview.built.css`) and its 676 KB page
script (`overview/main.built.js`) fetched and searched — plus the served HTML
of seven more product pages (`iphone-air`, `airpods-pro`, `macbook-pro`,
`apple-watch-ultra-3`, `mac-studio`, `ipad-pro`, `vision-pro`), and byte-range
probes against the actual video assets. Everything below is quoted from what
was fetched. Where something is inference it says so.

---

## The headline: the reframe is verified, and it is more lopsided than we said

`DESIGN-BRIEF.md` Conflict 1 proposed "maximum choreography, minimum
decoration" from the owner's description. The code says it, in a ratio.

Counted in the iPhone 17 Pro page's own stylesheet and script:

| Choreography | count | | Decoration | count |
|---|---|---|---|---|
| `addTween` calls | 82 | | `box-shadow` declarations | **17** |
| `addKeyframe` calls | 65 | | `text-shadow` | **2** |
| spring configs (`stiffness`) | 53 | | `mix-blend-mode` | **0** |
| `transform:` declarations | 140 | | custom cursor | **0** |
| `opacity:` declarations | 211 | | audio / `AudioContext` | **0** |
| | | | particles | **0** |
| | | | typefaces | **1** (SF Pro) |
| | | | distinct hex colours in 1.1 MB of CSS | **60** |

Seventeen shadows in 1.1 megabytes of stylesheet. Eighty-two tweens. That is
the whole thesis in two numbers, and it is the single most useful thing this
read produced.

For contrast, `ANALYSIS.md` counted **twenty-four named effects** on
webtactics — bloom, 3D warping, cursor morphing, UI sounds, marquees. Apple
runs more motion than webtactics with none of the ornament. The owner's
instinct ("I know that was completely overdone… I still wanted some
characteristics from it") is exactly right, and this is the shape of the
answer.

---

## What Apple actually does — and it is NOT mostly scrubbing

This is the finding that changes 1.3.

`DESIGN-BRIEF.md` assumed the signature Apple move is scroll-scrubbed video —
"video scrubbed frame by frame under the wheel". Counted across the eight
pages, that is the **exception**, not the rule:

| Page | `play-keyframe` (play on approach) | `video-progress-kf` (scrub) |
|---|---|---|
| iphone-17-pro | 8 | **0** |
| iphone-air | 3 | 9 (= ~2 videos × keyframes) |
| airpods-pro | 8 | 3 |
| macbook-pro | 9 | **0** |
| apple-watch-ultra-3 | 2 | **0** |
| mac-studio | 3 | **0** |
| ipad-pro | 12 | **0** |
| vision-pro | 27 | 1 |

**Play-on-approach is on 8 of 8 pages. Scrub is on 3 of 8, once or twice
each.** The flagship iPhone 17 Pro page — the most choreographed page Apple
ships this year — contains **not one scrubbed video.**

### Play-on-approach, quoted

```html
<div id="design-media"
  data-inline-media
  data-inline-media-basepath="/105/media/us/iphone-17-pro/2025/…/anim/design/"
  data-inline-media-load-keyframe='{ "start": "t - 100vh", "end": "b"}'
  data-inline-media-play-keyframe='{ "start": "t - 65vh", "end": "b" }'
  data-inline-media-pause-on-exit="false"
  data-inline-media-unload-at-end="true">
```

A tiny declarative language: `t` = the anchor's top, `b` = its bottom, offsets
in `vh`. **Load** begins 100vh before the element arrives. **Play** begins
65vh before. It plays once, straight through, at its own pace, and then
`unload-at-end` throws the bytes away. That is it. No pin, no scrub, no
scroll-linked frame.

The hero adds one more thing:

```html
data-inline-media-plugins="LoadTimeout"  data-load-timeout="3000"
```

**If the hero animation has not loaded in three seconds, the still image
wins.** Not a fallback for old browsers — a fallback for a slow moment.

### The scrub, quoted in full (iPhone Air, camera section)

The one place worth copying if we scrub anything:

```html
<div class="video-scrub-container" data-component-list="VideoScrubLoader"
     role="img" aria-label="Animation of iPhone Air rotating, Sky Blue color,
     front exterior, side exterior, back exterior, …">
  <video id="cameras-video-scrub" data-res="retina" data-page-fallback="true"
    data-video-basepath="/105/media/us/iphone-air/2025/…/anim/camera-hero/"
    data-video-load-kf='{"start":"a0t - 200vh","end":"a0b + 100vh",
                         "anchors":[".section-cameras"]}'
    data-video-breakpoint-substitution-map='{"xlarge":"large","xsmall":"small"}'
    data-video-progress-kf-1='{"start":"a0t - 100vh","end":"a0t - 15vh",
                               "progress":[0.0, 0.87],"anchors":[".subsection-intro"]}'
    data-video-progress-kf-2='{"start":"a0t - 15vh","end":"a0t + 75vh",
                               "progress":[0.87, 1.0],"anchors":[".subsection-intro"]}'
    playsinline muted aria-hidden="true"></video>
</div>
<picture class="camera-hero-fallback" data-lazy
  data-download-area-keyframe='{"start":"a0t - 200vh","end":"a0b + 100vh",
                               "disabledWhen":"enhanced", …}'>…</picture>
<noscript><picture>…</picture></noscript>
```

Five things in there are worth more than the technique itself:

1. **Nothing is pinned.** There is no `position: sticky` on the scrub
   container. The scroll range is `a0t − 100vh` → `a0t + 75vh`: the section
   moves up the screen normally the whole time and the animation's progress is
   simply mapped onto where it is. **Apple gets a transforming hero without
   ever taking the scroll away from you.** That resolves the owner's Conflict 3
   ("scrolling that doesn't really take you anywhere") — the two are not the
   same mechanism after all, which is what the analysis assumed.
2. **The progress curve is two straight lines, not a curve.** 0 → 0.87 over
   85vh, then 0.87 → 1.0 over 90vh. The last thirteen percent of the animation
   is given more than half the scroll. The end of the move is slowed by
   splitting the range, which costs nothing and needs no easing function.
3. **The load window is far wider than the play window** — starts 200vh early,
   stays alive 100vh past the bottom.
4. **The phone gets a different file.** `{"xlarge":"large","xsmall":"small"}`:
   at the largest and smallest breakpoints, substitute a smaller asset.
5. **Accessibility is not an afterthought.** `<video aria-hidden="true">`
   inside a `role="img"` container with a written description of what the
   animation shows. A screen reader gets one sentence, not a video element.

### The scrub engine, quoted from the script

```js
set progress(e){
  this._progress = e;
  this.videoEl.currentTime = this.floorDecimal(this.duration * e);
}
floorDecimal(e){
  const t = parseFloat(e.toFixed(this._fractionDigits + 1));
  return Math.floor(t * this._powerOf10) / this._powerOf10;
}
```

Scroll progress → `currentTime`, **quantized** so a seek is not requested for
every sub-frame wobble.

And the part that makes it viable at all:

```js
_requestVideoStream(){
  const req = new Request(this.videoURL), ms = new MediaSource;
  ms.addEventListener("sourceopen", async () => {
    const buf = ms.addSourceBuffer('video/webm;codecs="vp9"');
    const res = await fetch(req);
    const reader = res.body.getReader();
    for(;;){ const {value, done} = await reader.read(); if(done) break;
      await new Promise(r => { buf.appendBuffer(value); buf.onupdateend = () => r(true); }); }
  });
  this.videoEl.src = URL.createObjectURL(ms);
}
…
this.isSafari ? this._requestVideo() : this._requestVideoStream()
```

**Safari gets a plain `<video src>`. Everyone else — every Android phone we
care about — gets the entire WebM/VP9 file fetched and pushed into a
MediaSource buffer before it is scrubbed.** This is the whole reason Apple's
scrubbing does not stutter: seeking never waits on a range request, because
the file is already in memory.

That is also the honest cost of the technique. It is not "a video element and
some maths". It is: encode two formats, ship the whole file up front, hold it
in memory, and write a browser-branch.

---

## What it costs, in bytes (measured, not estimated)

Byte-range probes against the real assets:

| Asset | small | small_2x | large | large_2x |
|---|---|---|---|---|
| iPhone Air camera **scrub** (webm) | **666 KB** | 1.70 MB | 1.19 MB | 3.41 MB |
| iPhone Air camera **scrub** (mp4) | 757 KB | 1.45 MB | 1.44 MB | 2.89 MB |
| iPhone 17 Pro hero (mp4) | 890 KB | — | 2.20 MB | 3.18 MB |

Per sequence. The iPhone 17 Pro page carries eight of them, plus 159 images,
840 KB of HTML, 1.1 MB of CSS and 676 KB of page script.

**Our budget is not Apple's.** One 666 KB phone-sized clip is affordable.
Eight are not, and the rest of that page weight is out of the question. The
lesson to take is the *load discipline* — 100vh lead, `unload-at-end`, a
3-second timeout — not the volume.

---

## How Apple degrades — and it is the opposite of riangle

`DESIGN-BRIEF.md` recommends adopting riangle's device-tier system (WebGL2
check, `saveData`, `deviceMemory < 4`, `hardwareConcurrency < 4`, then an fps
governor). Apple does **none of it**. Searched across both scripts:

- `saveData` — **0 occurrences**
- `deviceMemory` — **0**
- `hardwareConcurrency` — **0**
- `effectiveType` — **0**
- `IntersectionObserver` — **0** (they run their own rAF scroll engine)
- GSAP / ScrollTrigger / Lenis / any smooth-scroll library — **0**

They do measure frame time (`_rafData.fps = 1000 / delta`,
`frameTimeTarget = 1/60`, a `frameTimeAccumulator`), but it feeds a
**fixed-timestep integrator for the spring physics** — it keeps motion
identical at 60 and 120 Hz. It is not a quality governor; nothing switches off
when it drops.

**Apple's entire degradation strategy is: never ask what the device is, ask
whether the thing arrived.**

- `enhanced` / `unenhance` — 48 and 35 occurrences. Components mount an
  enhanced state; `onUnenhance()` tears the animation down and restores the
  plain DOM. Without JS the `<html>` element simply keeps its `no-js` class
  and every animated media element is `display: none`:
  ```css
  .positioned-media-element:not(.static, picture:first-of-type.end-frame,
                                picture:first-of-type.start-frame){ display: none }
  ```
- Every animated media has a **start frame and an end frame** as real
  `<picture>` elements. `showStaticFallback()` sets `aria-hidden`, calls
  `abortLoad()`, and shows the still. Reduced motion is one of its named
  causes (`ReducedMotion.CAUSE_FOR_BASE`).
- `<noscript><picture>` underneath that again.
- `LoadTimeout` on top: too slow, show the still.

CSS `@media (prefers-reduced-motion)` appears only **five times** in 1.1 MB,
and only for small things (a colour-cycling ribbon, an accordion tray). The
big motion's reduced-motion answer lives in the media system, not in CSS.

**Both strategies are defensible and ours should be Apple's, with one thing
borrowed from riangle.** Apple's is fewer moving parts and cannot be wrong
about a phone it has never seen — a Samsung A-series that is having a bad
minute gets the still, and a flagship on hotel wifi does too. riangle's fps
governor is the one piece worth keeping, because a page can load fast and
still animate badly. But the *tiering* — guessing quality from
`deviceMemory` — buys less than a load timeout does, and `ANALYSIS.md`'s own
counter-example (gustavobatista blacklisting Samsung Internet by user agent)
is the failure mode of guessing.

---

## Consequences for 1.3

1. **The car-scrub hero survives, but demoted from "the direction" to "one
   sequence, if we can afford it."** Apple's own flagship page does not scrub.
   The idea is still strong and still un-generatable — but a direction whose
   whole identity rests on it is resting on the technique Apple uses least.
2. **Play-on-approach is the actual Apple house move, and it is cheap.** A
   short muted `playsinline` clip that starts when it is 65vh away, plays once,
   and unloads. No MediaSource, no browser branch, no scroll maths, no pin. A
   detailer already films this every working day. **This is the technique to
   put in front of the owner**, and it is affordable on a mid-range Android in
   a way that eight scrubs are not.
3. **Nothing needs pinning.** Conflict 3 dissolves: Apple transforms heroes
   while the page keeps moving. Map progress onto normal scroll position
   instead. The `DESIGN-BRIEF.md` pin rule (declare length, ≤2vh, never capture
   touch) stays as a ceiling for anything that does pin, but the house style
   should be "don't".
4. **Split the progress range instead of easing it.** Two linear segments with
   a slow tail is the trick, and it is legible in a data attribute.
5. **Every animated element needs a still that is the design.** Start frame and
   end frame as real images, shown when JS is off, when motion is reduced, and
   when loading takes too long. Same discipline as webtactics' `.wt-lite`, but
   per-element and with a 3-second budget. **This is also the answer to the
   empty-state rule** — if the still has to look intentional on its own, a
   tenant with no video is not a broken page, it is the fallback state that was
   designed first.
6. **One typeface. Sixty colours in a megabyte of CSS. Seventeen shadows.**
   Whatever direction wins, the decoration budget is this small.

## What this read does not answer

- **Whether a car-wash clip scrubs acceptably on a real mid-range Android.**
  Byte counts and Apple's approach are known; our own throttled-CPU test is
  not done. `DESIGN-BRIEF.md` already demands this before anything depends on
  scrubbing, and this read does not substitute for it.
- **How Apple's rAF scroll engine actually distributes work per frame.** The
  bundle is minified to single letters; the keyframe DSL, the `progress`
  setter, the MediaSource path and the fallback chain were readable, the
  scheduler was not worth the excavation.
- **`THREE` / `WebGLRenderer` appear 3 times** in the script and there is an
  `rtLoaderTimeout` ("real-time viewer") component. Some Apple pages ship a 3D
  product viewer. Not used on the pages read here, and not pursued.
