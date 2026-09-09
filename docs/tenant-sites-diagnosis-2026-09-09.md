# What is actually wrong with the websites — the corrected diagnosis

**2026-09-09.** This file exists because two sessions measured the same question
and got opposite answers, and **both were right about different files.** Sorting
that out changed the diagnosis.

**It supersedes the "zero photographs" framing in `docs/sessions/websites.md`
§ 1 — not by contradicting it, but by finding what it was a symptom of.**

---

## 1. THE MEASUREMENT, SETTLED

**The ten pages the owner was shown on 2026-09-08** are the ten
`scripts/build-examples.mjs` serves at `/example1`–`/example10`. Named in that
file's own `PAGES` array, in order: **p, m, n, o, q, r, l, t, s, u.**

```
THE TEN HE SAW                  THE ELEVEN BEFORE THEM
p-northlight   img:0            a-shop         img:1   unsplash:8
m-holloway     img:0            b-van          img:0   unsplash:9
n-halo         img:0            c-volume       img:1   unsplash:9
o-rinsecity    img:0            d-ridgeline    img:3   unsplash:5
q-meridian     img:0            e-kiln         img:3   unsplash:6
r-railyard     img:0            f-sudsy        img:1   unsplash:3
l-tidewater    img:0            g-estate       img:3   unsplash:7
t-blackline    img:0            h-fleet        img:1   unsplash:3
s-vera         img:0            i-apex         img:5   unsplash:5
u-cedarchrome  img:0            j-northside    img:2   unsplash:2
                                k-cedar        img:2   unsplash:2
ZERO images. ZERO Unsplash.     Every one carries real photographs.
```

**So: "zero `<img>` across all ten" is TRUE of the ten he rejected. "Every one
carries real Unsplash photographs" is TRUE of the seven (d, e, f, g, i, j, k)
the later report measured.** Those are different files from different rounds.

### AND THAT IS THE FINDING, because it means the build REGRESSED

**Eleven earlier pages had photography. The ten newest have none.** Photography
was not *missing* from the latest round — it was **removed** between round three
and round four, and no check noticed, because no check looks for absence.

Nobody spotted this while the two batches were being compared as one thing.

### WHAT ELSE THAT INVALIDATES — re-measure before using

The later report's numbers were taken on **d, e, f, g, i, j, k** — the round
BEFORE the rejected one. So these describe the wrong subject and **must be
re-run against p, m, n, o, q, r, l, t, s, u before anything is built on them:**

- the depth scores (`d 6 · e 1 · f 1 · g 0 · i 5 · j 5 · k 4`)
- the rhythm ratios (`d 2.73 … i 1.09`)
- the device counts (`0 canvas, 0 video, 1–4 transitions`)
- "no bottom dock, no tabs, no avatar stack, no marquee, no map"

**The conclusions may well survive; the evidence does not, yet.**

---

## 2. THE OWNER'S REFRAME, AND IT OUTRANKS THE ANTI-SLOP FRAMING

**His words, 2026-09-09, and they change the target:**

> *"It's not even a problem of, oh, when it generates a website it looks like
> AI. It just doesn't look good. It doesn't have those elements that
> professionally made websites have. The theming was weird — it gave me like a
> **notepad looking theme.** Why would a notepad theme be good for a car
> detailing website? It was very bland, **there wasn't much to it. There needs
> to be MORE in the website, different features and whatnot** that are in these
> good websites that this one just didn't have. It was like **very basic.**"*

**THE FAILURE IS THINNESS, NOT SLOP.** Every anti-slop instrument in this repo
and every one on the open market is built to catch a page that is *trying too
hard in a generic way*. His complaint is the opposite: **the pages are not doing
enough.** A page can pass every never-default and still be bare.

**And "notepad theme" is literally what was built.** Read the ten descriptors in
`build-examples.mjs`:

| | |
|---|---|
| m-holloway | **newsprint** · dense rate card |
| r-railyard | **blueprint grid** · set in mono |
| t-blackline | **black and paper** · the ground flips |
| q-meridian | warm cream · **page in a container** |

**Four of ten are stationery.** He is not describing a vibe he dislikes; he is
describing the brief being followed.

### WHERE THE STATIONERY COMES FROM — a question this repo asks wrongly

`docs/tenant-site-briefs-2026-09-07.md` § 5 ranks *"name what the page IS in one
noun"* as the second most useful device for producing variety. **That question,
asked about a PAGE, returns a DOCUMENT TYPE** — a logbook, a catalogue, a
scoreboard, ruled paper, a day's schedule. Five of the noun answers on record
are stationery.

**Fix the question, not the answers: the noun must be a physical thing from the
TRADE.** Paint. Water. Light. Foam. A car at a specific hour. **The sites he
rates highest do exactly this** — atelier's subject is a car at golden hour,
landscape's is a garden, auxia's is its own product. **Ban paper, ledger,
catalogue, notebook, logbook, index card, receipt and schedule as answers.**

---

## 3. WHAT SURVIVES FROM THE RESEARCH, AND WHY

Full report: `docs/agent-design-practice-2026-09-09.md`. **Its § (a) tool
ranking is superseded** — it ranks anti-slop auditors highly, and slop is not
this project's failure. Four things survive and all four are workflow, not
tools.

### A. A DIRECTION-APPROVAL GATE — the biggest one

Christopher Noessel, professional interaction designer, on being handed a dozen
finished screens: ***"Never produce a finished wireframe set, comp dump, or
multi-screen deliverable in a single turn."***
([source](https://christophernoessel.medium.com/design-was-never-the-comps-what-i-learned-when-claude-design-dumped-a-dozen-screens-on-me-73893af464ae))

**He did not reject ten sites one at a time. He was handed ten and said "all ten,
I really don't like any of them."** Four rounds of that is four chances to
correct direction that nobody took, **because the direction was never a
separately reviewable thing.** One paragraph, approved before any HTML exists,
costs one message and would have saved four builds.

### B. A MODEL CANNOT JUDGE THIS AND THE NUMBER IS KNOWN

Three independent results agree, and the implication is concrete:

- **[MLLM as a UI Judge](https://arxiv.org/html/2510.08783v1)** — 9,296 human
  ratings. Absolute scoring >75% accurate. **Pairwise comparison 90–93% when two
  UIs differ obviously, and ~50% — a coin flip — when they are close.**
- **[AesEval-Bench](https://arxiv.org/html/2603.01083v1)** — best model 72.5% on
  binary good/bad, **0.199 IoU on localising the flaw.** Reasoning models had no
  advantage. **Citing named design principles gave +17.17% on localisation.**
- **WebDevJudge** — best LLM-judge agreement with experts ~66% against 84.8%
  human-to-human, and **agentic interactive verification did WORSE than plain
  judging.**

**So: the audit measures ABSOLUTES, the owner judges COMPARATIVES.** Not out of
deference — that is where the accuracy is. *"Is a photograph present, is
contrast 4.41:1, is the first image above the fold, is the tallest section 3× the
median"* has a right answer. *"Is this still generic"* between two competent
pages is a coin flip, and four rounds of it is four coin flips.

**And whatever the agent does judge, make it cite the repo's own named rules** —
that is the measured +17%.

### C. SCORE AND REVERT

**[ReLook, arXiv 2510.11498](https://arxiv.org/abs/2510.11498)** — generate →
render → score the screenshot → revise. 7B model: ArtifactsBench-Si 18.61 →
26.36. Humans preferred the loop 50% / tie 30% / baseline 20%.

**The ablation is the transferable part.** The largest single contributor
(+2.04) was **"Forced Optimization" — a revision is only accepted if it scores
better than what it replaced.** This repo currently accepts every revision by
default. Score before, score after, `git revert` if the number dropped. That is
the discipline already applied to bugs, applied to visuals for the first time.

### D. GSAP IS FREE — verify before relying on it

[gsap.com/pricing](https://gsap.com/pricing/): *"GSAP is now 100% free for all
users, thanks to Webflow's support"* — ScrollTrigger included. **This matters
because `auxia`, the site he pointed at hardest, is Webflow + GSAP + Lenis**, and
§ 1 of TASTE-NOTES found the motion he counts is scroll-linked.

**THE TRADEOFF IS REAL AND IS ALREADY ON RECORD.** `design-knowledge.md`:
*"motion cost matters more than motion quality — the audience is tradespeople on
mid-range Android phones."* **Measure on a throttled CPU before committing.**
`IntersectionObserver` still wins for cheap reveals; spend GSAP where the effect
earns it.

---

## 4. THE IMAGE RESEARCH THAT STILL APPLIES

Measured live, and it changes how photographs get chosen:

- **The corpus is thin.** Unsplash `"car detailing"` returns **2,938 photos
  total.** Of the first six landscape results, **two show detailing work and four
  are supercar beauty shots.**
- **The badge problem is unfilterable by metadata.** One result's
  `alt_description` is `"black sedan"` while its `description` is
  `"Mercedes minimal silhouette"`. **The field an agent filters on does not carry
  the brand; the field it ignores does.** So this repo's own contact-sheet-and-LOOK
  rule (`TASTE-NOTES` § 4b) is not belt-and-braces — **it is the only thing that
  can work.**
- **Trademark and taste agree for once:** *no legible badges, no grille emblems,
  crop to paint, panel, wheel* is simultaneously the legal answer and the answer
  to a local detailer who does not work on Bugattis.
- **Do not generate the hero car.** Practitioners report generators distort
  panels and reflections *"in ways buyers notice"*, and the trade's whole claim is
  *look what I did to this actual car*.
- **The likely real answer for a live tenant is ENHANCEMENT, not sourcing.**
  Photoroom is **$0.02/image** background removal, $0.10 for relighting. And it
  answers a finding already in TASTE-NOTES: *meli's photographs are unstyled,
  nothing like atelier's single styled golden-hour hero.* **The gap between them
  is not better photographs. It is post-processing.**

**Licensing, if a pipeline ever places these unattended:** Unsplash requires
hotlinking from `photo.urls` and a ping to `photo.links.download_location` when a
photo is actually used — a requirement most integrations skip — and prohibits
*"automated, low-quality, or inauthentic applications."* Pixabay's terms
explicitly prohibit commercial use of images containing trademarked logos.

---

## 5. WHAT TO DO, IN ORDER

1. **Re-measure the RIGHT ten** (p, m, n, o, q, r, l, t, s, u) for depth, rhythm
   and device count. The conclusions may survive; the evidence must be re-taken.
2. **Write `docs/DEVICE-INVENTORY.md`** — the concrete answer to *"there needs to
   be more in the website."* `TASTE-NOTES` already catalogues what to build:
   atelier's live-dot availability pill, its avatar-stack review pill, its frosted
   trust bar on the photograph, its bottom dock; auxia's routed connector diagram
   and its bleeding footer wordmark; meli's portfolio row (photo + badge + car +
   one line of work + Book Now + a real starred review, as ONE object);
   agautospa's masonry; chicago's two-column tick list; MOXOM's price table
   tabbed by vehicle type; the stat strips. **One entry each: what it is, when to
   use it, when NOT to** — the usage half, which tokens alone never carry.
3. **Fix the noun question** — § 2 above. Physical thing from the trade, never a
   document type.
4. **Make the gates scripts, not prose**, including the image gate: **zero
   rendered `<img>` and zero non-gradient `background-image` fails the build, and
   a first photograph below the fold fails it too.** Nothing on the market does
   this; it is three lines.
5. **Add the direction-approval gate** to `docs/sessions/websites.md` — one
   paragraph per page, approved before any HTML.
6. **Score and revert** after each revision.
