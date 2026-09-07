# The website intake form — research, 2026-09-07

**His ask, in his own words, 2026-09-07:**

> *"The form for someone buying a website… they basically ask them a ton of
> questions about the website. My hope is to get everything that they need for
> you to build an actually pristine and good-looking website almost first try…
> having me be a guide there — a list of a ton of different car detailing
> websites that I think are good and look nice, and I kind of have a wide range,
> basically, for you to have inspiration from, but also for the customer: which
> one is your favorite? And then once they figure out one that they're favorite,
> or they could use multiple, then they answer questions that would help you
> build the website for them. So a lot of that's like, do you want FAQ or
> whatever, or reviews. The exact colors of your branding, uploading your logo,
> and we need to have a way for them to upload stuff and answer questions
> nicely… Do some research into all of the questions that we should ask them to
> just give them the best website and make it easiest for you to design
> something good. So it could be even something as niche as: do you want
> scrolling effects — and we show an example of scrolling effects versus just a
> static page."*

And, a minute later:

> *"I want every single website to have some advanced feature inside of it.
> Something that is a kind of eye-catcher, and is not just some really aesthetic
> website. One example is when you scroll and the picture actually stays in the
> same place visually — it gives that kind of cool effect. That's just one
> example though. There's a lot more."*

---

## 0. What already exists, so this is not a third plan

**`docs/tenant-site-intake.md` is the twelve questions**, written 2026-09-06.
Its § 5 says in as many words that the half it could not build is **the
examples** — *"the owner asked for questions with examples to choose from, and
there is nothing honest to show yet"* — and that what unblocks it is **two or
three real detailer sites whose vibe he likes.**

**He has now answered that**, twice: five references on 2026-09-07 (recorded in
`docs/TASTE-NOTES.md`), and this message offering to curate a wide range.
**So the blocked half is unblocked, and this file is the research for building
it rather than a second version of the questions.**

The one rule from that file that survives everything below, because it is the
best idea in it:

> **Only ask what the product does not already know.** Services, prices, hours,
> add-ons, promo codes, the accent colour, the FAQ, payment handles, reviews and
> the gallery are all in the dashboard already. Asking again is asking them to
> type their business in twice, and it creates a second copy that goes stale the
> day they change a price on their phone.

Every standard web-design questionnaire on the open web breaks that rule
immediately, which is why they cannot be copied.

---

## 1. What the industry actually asks — and what of it applies

Eight published intake templates were read (GoDaddy, Webflow, Elementor,
ContentSnare, Marker.io, Bonsai, HolaBrief, ClientManager). They converge on
the same six areas:

| They ask | Do we? | Why |
|---|---|---|
| Business background and story | **Yes** | Nothing in the product holds it, and it is the hardest thing to invent convincingly |
| Target audience | **Yes** | It changes the photographs and the words, and no column holds it |
| Primary purpose of the site | **Yes** | Book / ring / message / quote. This one has a real consequence — see § 3 |
| Budget and timeline | **No** | They bought a plan at a fixed price. Asking is theatre |
| Existing brand colours | **Partly** | They chose an accent in the dashboard. Asking again invites a second answer that disagrees with their own booking page. **Ask for a LOGO and a hex code they already use elsewhere, not "what colours do you want"** |
| Competitors they admire | **Replaced** | By his own curated gallery, which is far better — see § 2 |

**The three questions every template asks that we must NOT** — because the
answer already exists and a second copy is worse than none: *what services do
you offer*, *what are your prices*, *what are your hours*.

**And the one every template asks badly:** *"what pages do you want?"* A
detailer does not know, and the answer is a sitemap written by somebody who has
never seen the site. The pages fall out of the other answers.

---

## 2. Show, don't describe — and the numbers that shape the screen

This is the part his *"show an example of scrolling effects versus a static
page"* instinct gets exactly right, and the research is unusually specific
about how to do it.

**The finding that matters most (NN/g):** when you show a non-designer two
versions to choose between, **the difference has to be big enough for them to
see it immediately.** Small changes — a font size, a similar typeface — are
obvious to a designer and invisible to everybody else, and asking about them
*"will most likely just confuse participants and waste your time."*

**So: never ask a detailer to choose between two things that differ subtly.**
Every visual choice on this form has to be a choice between two things that
look plainly different to somebody who has never thought about websites.

**And a hard number: no more than three options per choice.** Preference
testing guidance is unanimous — past three, people fatigue and start picking at
random. That is a real constraint on the gallery: **show many, but never more
than three side by side at the moment of choosing.**

**The shape that follows:** a gallery he curates, browsed freely, from which
they *favourite* as many as they like — then the form asks the narrowing
questions as **two-or-three-way visual choices**, not as prose.

---

## 3. The questions, revised

Twelve exist in `docs/tenant-site-intake.md`. These are the changes and
additions the research and his message call for. **The originals are not
restated here** — that file is still the list.

### Keep as written
Questions 1, 2, 3, 5, 6, 9, 10, 11, 12. Every one asks something no column
holds, and 9 (*is there a site now, and what do you dislike about it?*) is
still the single most useful question in the set — people cannot describe what
they want and can always describe what annoys them.

### Change

**Q4 — the FAQ.** He named it directly (*"do you want FAQ or whatever, or
reviews"*). The product now stores FAQs, so this is not *"what are your FAQs"* —
it is **a yes/no about whether that section appears on the site**, with the
answer defaulting to yes if they have filled any in. Same for reviews.

**Q7 — photographs.** Split it. *What have you got* is one question; **the
upload is a separate act and belongs on its own screen**, because a phone full
of photos is not something anybody does inside a form.

**Q8 — logo.** Ask for **a vector file (.svg or .ai) if one exists**, and say
why in one line: it is the difference between a crisp mark and a blurry one on
a phone. Every onboarding guide in the set says the same, and it is the single
most common asset problem.

### Add

**A0 · The gallery.** *Which of these do you like?* Free browsing, favourite as
many as they want, minimum one. **This replaces "describe the look you want"
entirely.**

**A1 · Three visual either/ors**, each shown as two real rendered examples
rather than words:
  1. **Movement or stillness** — his own example. A page where things move as
     you scroll, against a page that simply sits there. Both are legitimate;
     the wrong one for a detailer with three cars a day is the busy one.
  2. **Photographs big, or facts big** — a page led by one enormous photo of a
     car, against one led by prices and the day's availability. This is the
     single biggest structural fork and it decides everything below it.
  3. **Dark or light.** The five references he sent are split, and it is the
     one aesthetic question a non-designer answers instantly and confidently.

**A2 · What must a customer be able to do without scrolling?** One answer.
Everything else on the page is arranged around it.

**A3 · Is there anything you do NOT want on your site?** The refusal list. The
worked pages in `docs/tenant-sites/` each carry one and it does more work than
any positive instruction — *"no stock photos of cars we would never see"*,
*"no countdown timers"*, *"no before-and-after slider, everybody has one"*.

**A4 · Whose phone rings?** Not stored anywhere as a fact about the SITE. A
one-van detailer and a shop with a receptionist want different pages.

---

## 4. The advanced feature — his second ask

> *"I want every single website to have some advanced feature inside of it…
> not just some really aesthetic website."*

### The catalogue, with what each one actually costs

| Effect | What it is | Cost | Risk |
|---|---|---|---|
| **Scroll-pinned image** (his example) | The photo holds still while the text moves past it | Low — `position: sticky` and nothing else | None. Degrades to a normal image |
| **Scroll-scrubbed reveal** | A photo wipes, zooms or brightens in step with the scrollbar | Medium | Needs a fallback — see below |
| **Horizontal service ladder** | The price ladder scrolls sideways inside its own band | Medium | Easy to make unusable on a phone; needs a stacked fallback |
| **Count-up figures** | 4,180 cars counts up when the strip arrives | Low | Reads as gimmick if the number is small |
| **Cursor gloss on the hero** | A specular highlight follows the pointer across the paint | Low | Desktop only — a phone has no pointer |
| **Live availability** | *"Three slots left this week"*, from the real booking engine | Low for us | **See below — this is the recommendation** |

### The recommendation: the eye-catcher should be a REAL NUMBER

Every effect in that table can be bought from a template shop, and a detailer
choosing between them is choosing decoration. **One thing on that list cannot be
copied by anybody: a live figure out of their own booking engine.**

`available-slots` already answers *what is free* for any business, publicly,
with no login. A band that says **“Next opening: Thursday 8:00 AM — 3 left this
week”**, changing by itself, is:

- **impossible on a template site**, because a template has no calendar behind
  it;
- **the strongest possible argument for booking now**, which is the whole job of
  the page;
- **already built** — it is one existing public endpoint, no new backend;
- **honest**, because it is the same number the booking form will show them
  thirty seconds later.

**So: every site gets ONE motion effect chosen from the list above, and every
site gets the live band.** The motion is taste and the band is the reason the
page exists.

### HIS CORRECTION, AND IT IS BIGGER THAN THE BAND — 2026-09-07

He agreed and then said what it is actually FOR, which reframes it from a
feature into the sales pitch:

> *"I think the website should be filled with the live information and data…
> One of the biggest things — that was, like, one selling point to me — is that
> your website is linked up to your admin dashboard. So changing something in
> your dashboard also changes stuff on your website. That was a big part of
> it."*

**SO IT IS NOT ONE BAND. IT IS THE WHOLE PAGE.** Every figure a tenant site
prints — the prices, the vehicle-size ladder, the hours, the service list, the
FAQ, the reviews, the gallery, the next opening — comes out of the same
dashboard the detailer already uses on their phone. **Change a price at a job
and the website has changed by the time they get back in the van.** Nobody has
to ring anybody, and nothing is ever typed twice.

**That is already how `docs/tenant-site-contract.md` § 2 is written** — its
twelve obligations exist precisely so a site cannot hard-code a number — but
that file states it as a RULE, and he has just stated it as the REASON. Both
belong: the rule stops a site drifting, and the reason is what a detailer is
actually buying.

**It also happens to be the one claim a template shop cannot make**, which is
the same argument as the availability band, one level up.

### AND THE EXAMPLE PAGES USE PLACEHOLDERS — his instruction

> *"Obviously we can't show that in an example website. So those should be
> placeholder text. But just make sure it knows that those numbers are gonna be
> numbers actually linked to the booking website."*

**Every worked page in `docs/tenant-sites/` already does this and must keep
doing it.** Each price carries a `data-from` attribute naming the endpoint that
owns it, and every one of those files says in its own header why: *a rate typed
into a tenant's HTML is "a number PRINTED is not a number CHARGED" with the two
numbers in two codebases.*

**So the rule for an example page is: the number is a placeholder, and the
markup says out loud where the real one comes from.** A reader of the file can
never mistake one for the other, and neither can the next agent that builds a
real site from it.

### The technical rules, which are not optional

Researched rather than assumed, because a scroll effect that stutters is worse
than no scroll effect:

- **Animate `transform` and `opacity` only.** Everything else forces the
  browser to recalculate layout on every frame, which is what visible stutter
  is.
- **`IntersectionObserver`, never a scroll listener.** The observer is
  asynchronous by design; a scroll handler runs on the main thread and fights
  the scroll it is reacting to.
- **Never `background-attachment: fixed`.** It fails completely on iOS and
  degrades scrolling on desktop — and iOS is most of a detailing customer's
  traffic.
- **Simplify or drop motion on a phone**, and honour
  `prefers-reduced-motion` — which every page in `docs/tenant-sites/` already
  does.
- **CSS scroll-driven animations (`animation-timeline`, `scroll-timeline`) are
  NOT Baseline.** Chrome, Edge and Safari 18 support them; Firefox does not have
  them on by default, so global support is about **83%**. They are wonderful and
  they need `@supports (animation-timeline: scroll())` with a static fallback —
  and the fallback is the page, not a degraded version of it. Firefox has it as
  an Interop 2026 priority, so this improves on its own.

---

## 5. How the form should actually work

**Where it lives: inside the dashboard, after they buy the website plan.**
Not a public page. They are signed in, we already know their business, the
uploads have somewhere to go (`business-media` and the gallery both exist), and
every question that the database can answer disappears by construction.

**Four screens, not one long form.** The onboarding research is consistent that
a wall of questions gets abandoned:

1. **The gallery** — browse, favourite. No typing at all.
2. **The three either/ors** — pictures, two taps each.
3. **The words** — the nine questions that need sentences. Saved as they type,
   because this is the screen somebody abandons halfway.
4. **The uploads** — logo, photographs. Its own screen, resumable, and the
   only one that can be left until later.

**It has to save and resume.** A detailer fills this in on a phone between
jobs. A form that loses its answers is a form that gets done once, badly.

**And nothing blocks on it.** Their booking page already works. The intake is
for the WEBSITE, and a half-finished intake should leave them with a working
booking page and a note saying what is still needed — not a dead end.

---

## 6. The one thing that is blocked on him, and one constraint he should know

**Blocked: the gallery itself.** He offered to curate it and nobody else can —
it is his taste, and that is the entire point of `docs/TASTE-NOTES.md`. What is
needed per entry is small: **a link, and one line on what he likes about it.**
Ten to twenty is plenty; the form never shows more than three at once.

**The constraint:** `random12one0/detailing-platform` is a **public** repository,
and other designers' work must not be committed to it. **So the gallery lives in
the database and in storage, not in the repo** — a `site_examples` table and
screenshots in a bucket, managed from the back office. That is the right home
anyway: he will keep adding to it, and a list he can edit without a developer is
a list that stays current.

---

## Sources

- [GoDaddy — the ultimate web design client questionnaire](https://www.godaddy.com/resources/skills/the-ultimate-web-design-client-questionnaire)
- [Webflow — website design questionnaires: 7 essential things to ask](https://webflow.com/blog/questionnaire-for-website-design)
- [Elementor — website design questionnaire](https://elementor.com/blog/website-design-questionnaire/)
- [ContentSnare — create a website design questionnaire](https://contentsnare.com/website-design-questionnaire/)
- [NN/g — testing visual design](https://www.nngroup.com/articles/testing-visual-design/)
- [Maze — preference testing](https://maze.co/blog/preference-testing/)
- [Lyssna — preference testing guide](https://www.lyssna.com/guides/preference-testing-guide/)
- [Squarespace Circle — web design client onboarding checklist](https://pros.squarespace.com/blog/onboard-web-design-clients)
- [Moxo — streamlining onboarding for web design clients](https://www.moxo.com/blog/web-design-client-onboarding-process)
- [Digital Silk — scrolling effects in web design (2026)](https://www.digitalsilk.com/digital-trends/scrolling-effects/)
- [Lovable — scrolling designs: 8 patterns and when to use each](https://lovable.dev/guides/scrolling-designs-patterns-when-to-use)
- [Webflow — scrollytelling guide](https://webflow.com/blog/scrollytelling-guide)
- [MDN — `animation-timeline`](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)
- [CSSAWWWARDS — CSS scroll-driven animations guide (2026)](https://cssawwwards.com/blog/css-scroll-driven-animations-guide-2026)
