# What is actually on a detailer's website, and how to get a detailer to tell us what they want

Research, 2026-09-10, at the owner's ask. Three questions:

> *"How to make this useful to best get a detailer's best… them having a place
> to say, hey, I like this car detailing website, or use information from my
> existing website so I don't have to type everything up manually… the whole
> point of these example websites is almost for the detailer to view and look
> at them and find things that they like… easily say, okay, I like this about
> the site, I don't like this… specific features or specific looks or specific
> animations, or have a question about, like, no animations… research into how
> to best do that specifically for detailers, and at the same time research on
> existing detailer websites — find maybe fifty examples of real detailer
> websites and see everything that's on them, what's most common, what's not on
> them."*

**§1 is the site survey and it is the part with the surprise in it. §2 is how
to ask. §3 is what to build.**

---

## 1 · Real detailers' websites

**REVISED 2026-09-10 (same day): the first pass covered ten sites and he was
right that it was not enough. This is fifty-two.** The direction of every
finding held; three of the numbers moved enough to matter, and they are
flagged. The raw per-site answers are
`docs/data/detailer-sites-2026-09-10.json` — **read the figures from there, or
recompute them; do not quote a number from prose.**

### 1a · Method

**66 sites opened. 52 answered a fixed 14-point checklist. 12 were dead,
hijacked or broken.** (Two more refused a non-browser request and are almost
certainly fine for a person; they are excluded from both counts.)

Candidates came from five 2026 roundups — Zarla, CyberOptik, Mojo, SquareStash
and Anytime Digital. **Templates were excluded**: one roundup counts six of its
own templates among its fifteen "examples", which is exactly how a survey of
what detailers build ends up describing what an agency sells.

**Every percentage below is over the 52 that loaded.** A dead site cannot have
a rain policy and counting it as missing one would flatter the finding.

### 1b · The 12 that were not there

**This is 18% of everything opened, and every candidate came off a "best of"
list published in the last year.**

| What happened | How many |
|---|---|
| Domain gone, 404, or parked | 6 |
| Broken or mismatched security certificate | 4 |
| **Domain taken over by an online-gambling site** | 1 |
| **Live business page with casino spam injected through it** | 1 |

Two are worth naming because they are not the same as neglect. **Texas Mobile
Detail's address now serves an Indonesian gambling site** — the domain lapsed
and somebody bought the traffic. **Detail Kings' real page is still up and has
been compromised**, with betting links threaded through the copy, which the
owner may not know. And **Royal Auto Detailing is parked with a For Sale sign
on it.**

**This is the strongest argument in this document for us hosting a detailer's
site, and it should be said to a detailer in those words:** one in six of the
sites held up as the best in this trade last year cannot be opened today.

### 1c · What is on the 52

| | Have it | |
|---|---|---|
| Service area named in place names | **49 / 52** | 94% |
| A real booking flow *(29 online, 13 form only, 10 phone only)* | 42 / 52 | 81% |
| FAQ | 23 / 52 | 44% |
| A star rating or review **count** | 22 / 52 | 42% |
| Certifications named | 20 / 52 | 38% |
| An owner's story | 19 / 52 | 37% |
| A specific guarantee | 19 / 52 | 37% |
| **Genuine before-and-after photographs** | **17 / 52** | **33%** |
| **Prices shown at all** *(11 "from", 3 exact)* | **14 / 52** | **27%** |
| What they need on arrival | 12 / 52 | 23% |
| **Insurance stated** | **10 / 52** | **19%** |
| **Cancellation, deposit or no-show policy** | **7 / 52** | **13%** |
| **Rain policy** | **1 / 52** | **2%** |

**Two composites, which say more than any single row:**

- **20 of 52 (38%) have NONE of the five** — no insurance, no guarantee, no
  policy, no rain, no arrival requirements. Over a third of detailing websites
  make no commitment and set no expectation about anything.
- **3 of 52 (6%) do all three of the things every guide asks for** — real
  before-and-afters, a review count, and a visible price. **Doing all three
  puts a detailer in the top 6% of the trade.**

### 1d · What moved from the ten-site pass, and what did not

**Held:** before-and-afters missing from most sites; prices hidden far more
often than shown; the service area near-universal; cancellation and rain
policies essentially absent; nobody in a second language.

**Moved:**

- **Before-and-afters: 25% → 33%.** Still only a third, still the biggest
  single gap, but not as catastrophic as ten sites suggested.
- **Booking: 88% → 81% have some online path, and one in five is phone-only.**
  The small operators the first pass under-sampled are the phone-only ones.
- **Insurance 12% → 19%, guarantees 12% → 37%.** The first ten were unusually
  silent. **A guarantee is common; saying you are insured is not** — 37%
  against 19% — which is the more useful pair of numbers, because it means a
  detailer volunteering insurance stands out more than one promising a redo.

### 1e · The five findings that change what we build

**(1) THE MOST-RECOMMENDED THING IS THE MOST-MISSING THING.** Every roundup
calls before-and-after photographs *"the single highest-impact content element
on a detailing site."* **Two thirds of sites do not have any.** The gap is not
knowledge — detailers are told this constantly — it is that **nobody has made
supplying them easy.** A question in a form gets a yes and no photographs. The
upload has to be its own screen, on a phone, resumable, and it is what we
should chase.

**(2) PRICES ARE HIDDEN ON THREE SITES IN FOUR, against advice that says the
opposite.** Both can be true: the shops hiding prices sell ceramic and
correction work that cannot honestly be quoted unseen. **This vindicates asking
rather than ruling** — which is what the intake does (A9) — and the split in
the wild is exactly the three answers offered: 11 "from", 3 exact, 38 hidden.

**(3) FOUR THINGS ARE MISSING FROM ALMOST EVERY SITE AND EACH IS FREE.** A rain
policy exists on **one site in fifty-two.** A cancellation policy on seven.
Insurance on ten. Arrival requirements on twelve. **All four are already
questions in the intake (E3, F1, A6, B4), all four went in on judgement, and
this is the evidence.** A detailer who answers all four is doing something
38% of the trade does none of.

**(4) THE SERVICE AREA IS THE NEAREST THING TO A UNIVERSAL — 94%**, always as a
list of place names. The three that omit it are among the least complete sites
in the set. Any template treating it as a footnote is wrong for this trade.

**(5) A REVIEW COUNT BEATS TESTIMONIALS AND UNDER HALF DO IT.** 42% print a
rating or a count; the rest print unquantified testimonials or nothing. The
roundups single out the counters — *"1000+ 5-star Google reviews"*, *"850+
5-Star Reviews"* — as the strongest trust device on the page. **We already
store reviews, so this is a template decision, not another question.**

## 2 · How to get the answers out of them

The problem is well documented and it is not laziness: **people cannot describe
visual preference in words, and asking them to produces "clean and modern",
which means nothing.**
([htmlburger](https://htmlburger.com/blog/website-design-questionnaire/),
[Webflow](https://webflow.com/blog/questionnaire-for-website-design))

### 2a · Show, never ask — and then constrain the vocabulary

**Nielsen Norman Group's guidance on testing visual design is the closest thing
to a rulebook** ([NN/g](https://www.nngroup.com/articles/testing-visual-design/)):

- **Preference testing: show 2-3 variations, never more**, and *"the differences
  must be significant enough to be immediately detectable to a nondesigner."*
- **Randomise the order.** Presentation order biases the answer.
- **"What do you think?" fails in an unmoderated setting** — vague or
  irrelevant answers, and nobody there to ask a follow-up. **Our intake is
  unmoderated by definition.**
- **Do not ask about differences somebody cannot see.** It triggers the *query
  effect*: people invent a preference between two things that look the same to
  them, and we then build on a fabricated answer.

**The instrument for "I like this about it" is CLOSED WORD CHOICE** — Microsoft's
Desirability Toolkit, 2002, still the standard method
([NN/g](https://www.nngroup.com/articles/microsoft-desirability-toolkit/),
[MeasuringU](https://measuringu.com/microsoft-desirability/)). The original is
118 cards, 60% positive and 40% negative, from which a participant picks five.
**It works because it hands people a vocabulary they do not have** — 89% of
reactions to a liked interface were expressible once the words were supplied.
**NN/g themselves cut it to 18 words** for one study, so trimming is sanctioned
practice, not a corner cut.

### 2b · Comparing beats scoring

Pairwise choice is more reliable than rating, and easier
([PLOS One](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0190393),
[Digital Divide Data](https://www.digitaldividedata.com/blog/comparative-preference-annotation-vs-scalar-scoring-rlhf)):
two options per decision, no scale to calibrate, higher agreement between
people, and each answer carries information about two things at once.

**The catch, and it decides the design: comparisons grow quadratically.** Four
options is 6 comparisons; **twenty options is 190.** Our twelve examples would
be 66. **So a full round-robin is out** — the gallery has to be like/dislike
taps, with a *small* number of head-to-heads afterwards between the ones they
liked.

### 2c · The two things that stop them typing

**Their existing website.** They have already written their About, their
services and their area, badly or well, and retyping it is the single biggest
reason a form gets abandoned. Reading a URL they paste and pre-filling from it
is entirely feasible — and the honest framing to a detailer is *"we will read
your old site so you don't have to retype it"*, with everything shown for
confirmation rather than adopted silently.

**Google Business Profile.** The APIs are live and maintained as of 2026, free,
and cover business information, hours, photos, posts and reviews with ratings
([Google](https://developers.google.com/my-business/content/overview),
[2026 status](https://slashpost.ai/blogs/google-business-profile/google-business-profile-api-documentation-2026)).
**The friction is access, not capability:** every new project starts at zero
quota and needs a formal request, a stated business use case, a verified
profile 60+ days old, and a live website. **So it is a real option and it is
not a fast one** — start the request early if we want it.

**On the AI idea he withdrew:** it is not too hard, and it is the cheapest of
the three. *"Tell me about your business in a couple of sentences"* expanded
into draft answers the detailer then corrects is a smaller job than either of
the above, because there is no API to be approved for and no page to parse. It
is worth having as the fallback for a detailer with no website and no Google
profile. **Corrected drafts still have to be shown as drafts** — the rule that
nothing on the site may claim what the detailer did not say still binds, and a
generated sentence they merely failed to delete is not something they said.

### 2d · What a detailer is, as a respondent

Everything above is general. Four things are specific to this trade, and they
come out of the site survey and the trade press rather than from research
literature:

1. **They answer on a phone, standing up, between jobs.** Anything that needs a
   desk does not get done.
2. **They are visual and not verbal.** The whole trade is before-and-after. A
   form of essay boxes is the wrong shape for the person filling it in; a form
   of pictures is the right one.
3. **They are asked to describe their business constantly** — by directories,
   by ad platforms, by every lead-gen call — and they are sick of it. Anything
   we can pull rather than ask, we should.
4. **They under-answer the boring half.** 0/8 published a rain policy. Left to
   free text they will write nothing; asked *"what do you do about rain?"* with
   a box under it, most will answer.

---

## 3 · What to build, in order

**Everything here is an addition to `app/src/screens/SiteIntake.jsx`, which
exists.** Ranked by what each buys against what it costs.

**(1) THE GALLERY BECOMES A WALK, NOT A GRID — highest value, and it is what he
asked for.** One example per screen, open it, then react. Under each: **like /
not for me**, then a **fixed set of reaction chips split positive and
negative**, then an optional note. Twelve screens is too many, so **six**,
chosen to be plainly unalike, with the order **randomised per detailer**.

The chip vocabulary — closed word choice, adapted to this trade, each word
naming something a page can actually be built to be:

> **Liked:** *clean · bold · expensive-looking · friendly · trustworthy ·
> easy to read · the photos · the colours · the movement · straight to the
> point*
> **Didn't:** *too busy · too plain · too corporate · cheap-looking · too dark ·
> too much text · too much movement · hard to find the price · couldn't tell
> what they do*

**Both halves are needed.** A detailer who only ever ticks positives has told
us nothing; the negatives are where the refusals come from, and *"too much
movement"* is precisely his *"a question about, like, no animations"* — asked
as a reaction to a real page instead of in the abstract, which is the only way
it is answerable.

**(2) A HEAD-TO-HEAD ROUND AFTER THE WALK.** Take the ones they liked and show
**two at a time, three or four times.** Cheap, and comparison is more reliable
than any rating they could give. **Never three side by side.**

**(3) "PASTE A SITE YOU LIKE."** One field, any trade, any number of URLs, with
the same chip set under each. This is his *"I like this car detailing
website"*, and the reason it needs the chips is that a bare URL tells us they
liked something and not what.

**(4) "USE MY OLD SITE."** Paste the address; we read it and pre-fill the About,
the service area, the phone, the socials and the existing wording; every field
shown as *"we found this — is it right?"* and nothing adopted silently.
**Biggest single reduction in typing available.**

**(5) A FREE BOX PER SECTION, NOT ONLY AT THE END.** Every question already
carries a note. What is missing is a per-section *"anything about this we did
not ask?"*, because the thing they want to say arrives while they are thinking
about that subject and is gone by the last screen.

**(6) A "MUST HAVE / MUST NOT HAVE" LIST, TYPED FREELY.** Two boxes. The whole
site is customisable and this is where a detailer says the thing no
questionnaire predicted. It is also the safest place to catch the *"everything
should be customisable"* requirement without pretending a form can enumerate
everything.

**(7) THE PHOTOGRAPH CHASE, WHICH IS SEPARATE FROM THE FORM.** Finding (1) says
this is where sites actually fail. Its own screen, its own reminder, and
resumable — not a question inside a questionnaire.

**(8) GOOGLE BUSINESS PROFILE IMPORT.** Real, free, and gated on an approval
that takes time. Start the access request when we decide we want it; do not
design the intake around it landing.

### 3a · Rules any of the above must obey

- **Two options side by side, never more than three.** Past three, people
  fatigue and pick at random.
- **Randomise the order** of examples and of chips.
- **Never ask about a difference a non-designer cannot see.**
- **Never ask an open "what do you think?"** unmoderated — chips first, note
  second.
- **Record the PATTERN, not the pick.** Four favourites that are all dark and
  photograph-led is the finding; which of them was number one is noise.
- **Nothing on the finished site may claim anything the detailer did not
  establish.** This survives every addition above, and it is the reason a
  pre-filled or generated answer must be shown as a draft to be confirmed.

---

## 4 · What this changes about what is already built

Nothing has to be undone. The intake's twelve core questions, the note per
question and the three either/ors all survive, and §1c(3) is direct evidence
for four questions that were added on judgement. **The change is to step 2**:
the gallery is a grid of twelve to tick, and it should be a walk of six with a
reaction under each.

**And one thing gets easier.** The either/or trio asks *movement or stillness*
in the abstract with two drawn pages. Once the walk exists, the same question
is answered better as a side-effect — a detailer who ticks *"too much
movement"* on two of six has answered it about real pages, which is worth more
than a choice between two diagrams.
