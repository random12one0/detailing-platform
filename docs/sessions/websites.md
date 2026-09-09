# Session A — websites, and nothing else

## THE FIRST DELIVERABLE IS A FILLED DESIGN SCHEME, NOT A PAGE.

Copy `docs/DESIGN-SCHEME-TEMPLATE.md` to `docs/schemes/<tenant>-scheme.md`,
fill it from `docs/TASTE-NOTES.md` and `docs/DEVICE-INVENTORY.md`, and get
Andrew's yes on §1, §2, §3 and §9. **No HTML exists before he says yes.**
`docs/schemes/prime-mobile-detailing-scheme.md` is a filled example.

**ONE direction, never three.** It is a **style guide**, never a design system.

## THEN `docs/tenant-site-playbook.md`. IT IS THE PLAN.

Everything about how these pages get built lives there, written as
instructions: the loop, the naming and copy rules, what a photograph owes, the
section order, navigation and motion, the booking widget, and the verification
that has actually caught faults here. **It supersedes every older instruction
in this file about HOW to build.**

What remains below is context: why this session exists, where the reference
material is, which skills are available, and the ownership rules. **Sections
0 and 1 are a record of a failure that the playbook already encodes — read
them for the evidence, not for instructions.**

---

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

## 0. READ THIS BEFORE § 1 — THE DIAGNOSIS CHANGED, 2026-09-09

**`docs/tenant-sites-diagnosis-2026-09-09.md` supersedes § 1 below.** § 1's
photograph finding is CORRECT and was verified twice — but it is a symptom, and
the owner has since named the disease himself:

> *"It's not even a problem of, oh, when it generates a website it looks like
> AI. **It just doesn't look good.** It doesn't have those elements that
> professionally made websites have. The theming was weird — it gave me like a
> **notepad looking theme**… it was very bland, **there wasn't much to it. There
> needs to be MORE in the website, different features and whatnot**… It was like
> **very basic.**"*

**THE FAILURE IS THINNESS, NOT SLOP.** Every anti-slop rule in this repo is
built to catch a page trying too hard in a generic way. His complaint is the
opposite: **the pages are not doing enough.** A page can pass every
never-default in `CLAUDE.md` and still be bare — and ten of them did.

**Three things follow, and they change what this session does:**

1. **Build MORE, not less. `docs/DEVICE-INVENTORY.md` IS THE LIST** — twenty-one
   devices, every one seen on a site HE picked, each with what it is, when to use
   it and **when NOT to**. **A page ships with TEN OR MORE.** The ten he rejected
   carry two to four each, which is the measurable form of "very basic".
   Restraint is not the safe answer here and never was — he pre-empted that
   argument in writing. **Read that file before the interview**, because the
   devices are what the direction paragraph commits to.
2. **The "what IS this page, in one noun" question is producing the notepad.**
   Asked about a PAGE it returns a DOCUMENT TYPE — four of the ten he rejected
   are literally stationery (newsprint, blueprint, black-and-paper, a page in a
   container). **The noun must be a physical thing from the TRADE**: paint,
   water, light, foam, a car at a specific hour. **Paper, ledger, catalogue,
   notebook, logbook, receipt and schedule are banned answers.**
3. **THE BUILD REGRESSED AND NOBODY NOTICED.** The eleven pages before these ten
   all carried real photographs. The ten newest carry none. **Photography was
   removed between round three and round four**, and every check stayed green,
   because no check in this repo looks for the ABSENCE of something. That is the
   deeper bug and it is worth a sweep of its own.

## 1. THE PHOTOGRAPH FINDING — verified twice, and still true

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

## 5. THE WORK — ONE SITE AT A TIME, WITH HIM IN THE ROOM

**HIS INSTRUCTION, 2026-09-08, AND IT IS THE WHOLE METHOD:** *"We're gonna make
a website one at a time and just kind of… I'll just kinda go back and forth."*

**That replaces every batch approach that came before it, and it is the fix for
why the last four attempts failed.** Ten pages built in silence produced ten
rejections and one sentence of feedback — *"I really don't like any of them"* —
which is true and impossible to build from. **One page built in front of him
produces a correction every twenty minutes.**

### Before the first page — two things, once

1. **Do the research he asked for and write it down** — *"research on how to
   actually build good websites based off what people say out there."* Put it
   in `docs/design-knowledge.md` **with sources**, and be specific about what
   transfers to a detailer's site and what does not. Use the web. Use the
   connectors.
2. **Write the photograph rule down as a CHECK, not a sentence.** A ~30-line
   `tests/tenant-sites.test.mjs` that walks `docs/tenant-sites/*.html` and fails
   any page with no `<img>`, any `background-image` that is only a gradient, and
   any placeholder box. **A rule with no test is a rule that gets broken again**
   — this repo's own words, and this is the tenth proof of it.

### Then, per site — the loop

0. **THE DIRECTION-APPROVAL GATE — NEW, AND IT IS THE MOST IMPORTANT STEP.**
   **Before any HTML exists**, write **ONE paragraph** and stop for his yes or
   no: the SUBJECT (a physical thing from the trade, never a document type), the
   ground, the accent, the display face, **which devices from the inventory**,
   and whether the page buys variety with rhythm or with depth.
   **He did not reject ten sites one at a time — he was handed ten and said "all
   ten, I really don't like any of them."** Four rounds of that is four chances
   to correct direction that nobody took, because **the direction was never a
   separately reviewable thing.** One paragraph costs one message and would have
   saved four builds.
1. **INTERVIEW HIM FIRST. Do not start from a brief you wrote yourself.**
   Four or five short questions, answerable with one thumb: what kind of
   detailer is this one, light or dark, what is the one thing the page has to
   make somebody feel, name a site from his 21 that this should sit near, and
   what it must NOT look like. **His refusals are worth more than his
   approvals** — that is `TASTE-NOTES.md`'s own finding.
2. **Find the photographs BEFORE the layout.** Search Unsplash, render the
   candidates to a contact sheet, **look at it**, and send him the three or four
   you want to use. The hero photo decides the page; picking it last means
   building a layout that a photo then has to be squeezed into. If nothing
   found is right, **ask him** — he has said he will go and source images
   rather than have the work limited.
3. **Build the page in passes and show each one.** The ground and the hero
   first. Send it. Then the sections. Send it. Then the motion. Send it. **Never
   more than about twenty minutes between screenshots.** He cannot see your
   screen and he is on a phone.
4. **`SendUserFile` at 392 first**, then 1440 when the desk layout is the point.
   Viewport-sized crops down the page — a stitched full-page PNG is rejected at
   400, and the limit is the image's HEIGHT rather than its size.
5. **Every question you ask him carries your recommendation.** *"Your call"* is
   an unfinished sentence.
6. **When he says it is right, run the checks, commit, and ask what the next
   one should be.** Do not roll straight into a second page on your own
   initiative — the whole point of one-at-a-time is that he picks the next one.

### And two rules from the research — `tenant-sites-diagnosis-2026-09-09.md` § 3

**SCORE AND REVERT.** After each revision, re-run the gates. **If a number went
down, revert rather than fixing forward.** In the one study with real numbers,
the single largest contributor was not the critic — it was refusing to accept a
revision that scored worse than what it replaced. This repo currently accepts
every revision by default.

**YOU CANNOT JUDGE WHETHER THIS IS GOOD. MEASURED, NOT MODESTY.** A model
comparing two competent pages scores ~50% against human raters — a coin flip —
while scoring >75% on absolutes with a right answer. **So measure absolutes
(is a photograph present, is it above the fold, contrast, section-height ratio,
device count) and let HIM judge whether it looks good.** And when you do
critique, cite this repo's own named rules rather than giving an opinion — that
is worth a measured +17% on finding where the flaw actually is.

### The three rules of the loop

- **Change one thing at a time when he gives a note.** He gave you a specific
  complaint; a rebuild that also moves four other things means neither of you
  knows what fixed it.
- **Do not defend a page.** If he says it is wrong, it is wrong. Ask what about
  it, change that, show him again.
- **Write what he says into `docs/TASTE-NOTES.md` as he says it**, verbatim,
  the same turn. That file is the only reason this attempt has evidence the
  first three did not, and it only grows if somebody writes in it.

---

## 5b. SITE 4 — HIS BRIEF, GIVEN 2026-09-09

**Site 3 is signed off** (`TASTE-NOTES.md` § 7). His instruction for the next
one, in his own words: *"find a pair of two actually really good websites, one
that's non-detailer and one that is a detailer. Maybe we could do inspiration
from chicagoautopros.com. And then find one of the general design inspirations
that kinda follows that look, and implement the animations into the Chicago
Auto Pros look, as well as text."*

**So the detailer half is CHOSEN: `chicagoautopros.com`** — the one he called
*"a little crowded but still kinda good"*, which is the point: it is the
information-dense end of the trade, and site 3 proved that density is what he
wants more of.

**The non-detailer half is NOT chosen, and it is the first job.** Pick it by
**opening the frames in `../_repo-shots-archive/shots-taste/` and matching on
FORM** — panel shape, chrome, how photographs are held — exactly as
`atelier x fora` was matched for site 3, and never on his one-line verdict.
The eight non-detailers on his list are `auxia`, `pryzm`, `lightspark`,
`vessa`, `fora` *(spent on site 3)*, `authkit`, `landscape-128` and the Mobbin
page he ruled out himself. **Say which one and why in one sentence before
building.**

**What transfers wholesale from site 3:** the whole motion system — reveals
that replay in both directions, the weighted scroll at WHEEL 1.22 / LERP
0.055, the pointer light, scroll-linked sections that carry no timers, the
asymptotic parallax limit — and the copy rules. `tenant-site-playbook.md` § 10
rules **31 to 90** are all from this build.

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
