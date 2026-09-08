# Session A — websites, and nothing else

**You are the website session.** You build detailer websites and you improve
how detailer websites get built. **You do not touch `app/src`, the database,
the edge functions or the tests** — another session owns those and is probably
running a nine-minute browser sweep right now that your write would silently
ruin. `docs/sessions/README.md` is the ownership table.

**Why this session exists, in his words, 2026-09-08:** *"all of the websites
that created all ten, I really don't like any of them… this whole entire
business platform runs on making really good websites. And right now, it's not
there."*

---

## 1. THE DIAGNOSIS IS ALREADY MADE. DO NOT REDO IT.

Three attempts at these pages have now been rejected. Each one burned a session
guessing. **The fourth attempt has evidence the first three did not**, and the
single most useful thing in it was measured on 2026-09-08 rather than felt:

### **NOT ONE OF THE TEN SITES CONTAINS A SINGLE PHOTOGRAPH.**

```
$ for f in docs/tenant-sites/[l-u]-*.html; do echo "$(basename $f) <img>:$(grep -oc '<img' $f)"; done
l-tidewater  <img>:0     q-meridian    <img>:0
m-holloway   <img>:0     r-railyard    <img>:0
n-halo       <img>:0     s-vera        <img>:0
o-rinsecity  <img>:0     t-blackline   <img>:0
p-northlight <img>:0     u-cedarchrome <img>:0
```

Zero `<img>` elements across all ten. Six have a CSS `background-image`, and
every one of those is a gradient or a noise texture — **no photograph of a car
appears anywhere in any of them.**

**And the very first line of what he likes says the opposite.**
`docs/TASTE-NOTES.md` § 3, on what all five of his batch-1 picks share and none
of the rejected pages did: *"a real car PHOTOGRAPH as the hero at scale (cut
out, full-bleed, or inside a giant rounded card)."* § A of the visual pass
corrects the measurement pass with the same finding: *a photograph IS depth, and
my score could not see one.*

**So the pages were built to a written rule set that this repo already had, and
they failed the FIRST rule on the list, ten times out of ten, and every check in
the repo passed.** No test looks for an image. `composition.test.mjs` walks
`app/src` and the reference rendering by name; these pages are held by looking
and nothing else.

**Three more things are true of all ten and each is in his own words:**

| What the pages do | What he said |
|---|---|
| **A centred hero — eyebrow pill, giant headline, subhead, two buttons** — on at least six of ten | This is literally step 1 of the 2026 slop sequence named in `docs/design-knowledge.md`. **The sequence is the tell, not the elements.** |
| **Grey placeholder boxes where photographs go** (l-tidewater's "This week on the water" is four empty rectangles) | `CLAUDE.md` § Design: *"Imagery: never a grey placeholder box."* An Unsplash connector is wired and confirmed working. |
| **The same section shape repeated down the page** — a ruled list, then another ruled list | *"it's not just the same copy and pasting all the time… information is laid out in different creative ways."* |

**These four are the brief.** Everything else in this file is in service of
them.

---

## 2. READ THESE, IN THIS ORDER, AND STOP

1. **`docs/TASTE-NOTES.md`, § BATCH 2 onward** (line 287 to the end). His 21
   links, his verdict on each, **the paragraph at § "AND THE PARAGRAPH THAT IS
   THE ACTUAL BRIEF"**, then the measured pass, the visual pass, the phone
   pass, the inner-page crawl. This is the most valuable file in the repo and
   it is the one that has been least acted on.
2. **`docs/tenant-site-contract.md` § 2** — the twelve things a site owes,
   each written as *what silently stops working if you omit it*.
3. **`docs/tenant-site-kit.md`** — the pointer, not a summary.
4. **`app/src/book/core.js`** — its header is the whole booking API. **Read
   it; never edit it.**

**Do NOT read `docs/design-system.md`.** That is our own product's identity and
a tenant site built from it comes out as our landing page recoloured. It has
happened and he rejected it on sight.

---

## 3. THE REFERENCE IMAGES ARE NOT GONE. HERE IS WHERE THEY ARE.

He asked. **`docs/design-references/` is empty by design** — it holds only a
`.gitkeep`. Nothing was lost.

| What | Where | How much |
|---|---|---|
| **Screenshots of all 18 sites he sent** | `../_repo-shots-archive/shots-taste/` | **180 frames** — every site at 1440 desktop and 392 phone, five scroll positions each |
| The full-page crawl | `../_repo-shots-archive/shots-full/` | 19 frames |
| The ten mock-ups as shot | `../_repo-shots-archive/shots-mocks/` | 152 frames |
| **The written analysis of every one** | `docs/TASTE-NOTES.md` §§ 0–P | 63 KB |
| Batch 1's seven, read at code level | `docs/references/ANALYSIS.md` | 81 KB |

That archive is **1.1 GB and lives OUTSIDE the repo on purpose** — it was moved
there on 2026-09-08 because the Netlify deploy tool zips the working directory
and 1.3 GB made the upload fail with a 500. **Do not move it back in.**

**LOOK AT THE FRAMES BEFORE YOU BUILD.** They are on this machine. Reading
somebody's written description of a photograph is how the last three attempts
went wrong.

---

## 4. THE SKILL RULE IS REOPENED — FOR TENANT SITES ONLY

`CLAUDE.md` § Design says the skill-collision rule is on: appliers and auditors
only, and no direction-generating skill *"runs against this product again unless
the owner reopens the direction."*

**He reopened it on 2026-09-08**, asking specifically for *"maybe there's some
skills that we need to install, maybe some plugins, maybe a specialized
prompt."* **That reopening covers TENANT SITES and nothing else.** The
platform's own dashboard, landing page and pricing page are still governed by
`design-system.md` and are still off limits to a direction skill.

### What is installed and worth using here

| Skill | Use it for | Why this one |
|---|---|---|
| **`scrollcraft`** | **Start here.** A premium scroll-driven landing page for a service business. | It interviews first, picks a page grammar and a **signature move so no two builds share a skeleton** — which is the precise cure for *"three agents given one brief produced one family"*. It **generates photoreal assets**, which is the zero-photograph problem. And it **verifies by screenshotting its own scroll**. |
| **`ui-ux-pro-max`** | Picking type and colour. | 74 font pairings and 192 palettes with reasoning, searchable locally. Stops the fifth page reaching for the same grotesque. |
| **`animate`** | The motion, after the layout is settled. | He wants generous animation carried by a disciplined layout — this decides curve, duration and interruption in the order that makes it feel right. |
| **`impeccable`** / **`ship-check`** | The pass at the end. | Auditors. Always allowed. |
| **`apple-design`** / **`emil-design-eng`** | When a page needs to feel expensive. | Physical motion and the invisible details. |

### The connector that fixes the actual defect

**Unsplash is wired and confirmed working** (`search_photos`; *"car detailing"*
returns ~4,800 real photographs). `CLAUDE.md` § Design already says to use it
and says what to do when it is not enough: **ask him.** *"They will go and
source images rather than have work limited by what is to hand. Asking is
cheaper than settling."*

**One rule from the last attempt, learned expensively: render every candidate
photo to a contact sheet and LOOK at it.** Site j's first hero was a Bugatti
with another firm's logo on the detailer's shirt. Alt text does not mention
badges.

---

## 5. THE WORK, IN ORDER

**Do not build ten more.** Build **two**, all the way, and show him. Ten
mediocre pages cost the same session time as two good ones and tell you less,
because he cannot tell you what is wrong with ten at once — he could not last
time, and said so: *"I really don't like any of them."*

1. **Do the research he asked for and write it down** —
   *"research on how to actually build good websites based off what people say
   out there."* Put it in `docs/design-knowledge.md` **with sources**, and be
   specific about what transfers to a detailer's site and what does not. Use
   the web. Use the connectors.
2. **Write the photograph rule down as a CHECK, not a sentence.** A ~30-line
   `tests/tenant-sites.test.mjs` that walks `docs/tenant-sites/*.html` and fails
   any page with no `<img>`, any `background-image` that is only a gradient, and
   any placeholder box. **A rule with no test is a rule that gets broken again**
   — this repo's own words, and this is the tenth proof of it.
3. **Build two pages.** Different worlds, both photograph-led, both carrying the
   contract's twelve. One dark, one light. **No centred hero on either.**
4. **Screenshot both at 1440 and 392, five scroll positions**, and
   `SendUserFile` the phone frames first — that is the shape he is holding.
5. **Ask him one question, in one sentence, with a recommendation in it.**

**Then stop and wait for his verdict before building a third.** That is the
whole change from the last three attempts.

---

## 6. WHAT NOT TO DO

- **Do not rebuild the existing ten.** They serve `/example1…10` and he can
  still look at them. Add beside them.
- **Do not vary the palette and call it variety.** *"Varying the palette while
  fixing the skeleton does not produce variety"* — the recorded cause of the
  first failure.
- **Do not use restraint as the safe answer.** He pre-empted that argument in
  writing: a dense flat page is *harder* to navigate, not easier.
- **Do not hard-code a price.** Every managed figure carries `data-from` naming
  the endpoint that owns it. *A number PRINTED is not a number CHARGED*, and
  here the two numbers would be in two different codebases.
- **Do not write a fourth planning document.** The plan exists. Execute it.
