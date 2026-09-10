# The tenant-site playbook

**This is how a detailer's example website gets built. Read it end to end
before writing a line; it is short on purpose.** It is written as
instructions, not as a history — where it contradicts an older document about
tenant sites, this file is right.

Its companions, and you need all three:

| File | What it is |
|---|---|
| `docs/DEVICE-INVENTORY.md` | The twenty-one devices a page can be built from, each with a **when NOT to**. |
| `docs/TASTE-NOTES.md` | The owner's own words about twenty-one sites he chose, plus his verdict on everything built so far. **The evidence.** |
| `docs/tenant-site-contract.md` | The twelve things a site owes the product, each written as *what silently stops working if you omit it*. |
| `docs/DESIGN-SCHEME-TEMPLATE.md` | **The style tile every site starts from.** Copy it to `docs/schemes/<tenant>-scheme.md`, fill it, get a yes. **No HTML before that.** |

`tests/tenant-sites.test.mjs` enforces the parts of this file that a script can
see. Run it before you finish. It does not replace looking at the page.

---

## 0 · WHAT THESE SITES ARE FOR

The owner sells a booking-and-management platform to car detailers. These pages
are **the examples a detailer is shown before they sign**: *"a real example of
what their websites look like."* A signing detailer's real site is connected to
their admin dashboard, so a demo that invents a feature we do not have is a demo
of a product we do not sell.

**Two audiences, and they must not be confused.** Our pitch goes to a detailer
and is about booking, slots, dashboards and minutes saved. **The site's pitch
goes to a car owner and is about the car.**

---

## 1 · THE LOOP — one site at a time, with him in the room

1. **Interview first.** Four or five questions answerable with one thumb: what
   kind of detailer, light or dark, the one thing the page must make somebody
   feel, which two of his twenty-one it should sit near, what it must NOT be.
   **His refusals are worth more than his approvals.**
2. **BUILD `docs/schemes/<tenant>-styleguide.html` AND STOP FOR A YES. EVERY
   SESSION, BEFORE ANY SITE EXISTS — his standing instruction, 2026-09-09:**
   *"make sure it does this every time every session before making website."*
   A rendered sheet that RUNS: the faces as specimens, the colours as swatches
   **with the ratios the page computes for itself**, the corner family
   including the corner we are not using, every element in every state, every
   animation with a replay button and its numbers, the one scroll effect taken
   from the references, and the rules as a list. **Not a preview of any part of
   the site** — *"you could take our design sheet and then drag and drop stuff
   to make the website… that's the rules on making the website, not just a
   preview of the home page."* `docs/schemes/kinzie-styleguide.html` is the
   worked example. **Publish it as an Artifact and send him the link**, because
   he can press it; screenshots are the fallback.
   The filled copy of `docs/DESIGN-SCHEME-TEMPLATE.md` is
   `docs/schemes/<tenant>-scheme.md`, it is still written first, and it is
   **the record. The sheet is the ask.** No HTML for the SITE exists until
   Andrew approves the sheet.
   - **HE APPROVES A PICTURE, NOT THE FILE — his ruling, 2026-09-08:** *"I want
     all visual, actually. Like, barely any text, all visual. Right now, you
     just gave me text."* Render the tile to **three 620x870 frames** and send
     them: (1) the face — real ground, wordmark, headline at real size with its
     accent word, real buttons, chip, stats, hero photo in its slot; (2) the
     parts — colour blocks, type specimen, panels in their states, controls, a
     sketch of the page's one signature device; (3) the photograph shortlist
     with the rejections named. **A style tile is a visual artefact — that is
     the whole point of the format this template cites.** The markdown keeps
     the reasoning and the arithmetic; it is the record, not the ask.
     `TASTE-NOTES.md` § BATCH 4b. **And 870px is the observed height ceiling
     for a file that reaches his phone — 1240 did not load.**
   `docs/schemes/prime-mobile-detailing-scheme.md` is a worked example.
   - **It is a STYLE GUIDE, never a design system.** A design system is the
     parent thing — multi-product, governance, a component code library
     (Nielsen Norman Group). Scope creep here is a real risk and the
     terminology invites it.
   - **ONE direction, fully resolved. Never three.** Options get mixed and
     matched into a Frankenstein; that is the strongest consensus in the
     design-review literature. If you cannot choose, narrow against
     `TASTE-NOTES.md` first, then present one.
   - **Fill it from `TASTE-NOTES.md` and `DEVICE-INVENTORY.md`, not from your
     own priors.** Every value in §3–§9 traces to a site Andrew rated or to a
     numeric floor: depth ≥ 15, rhythm ≥ 3 **or** depth ≥ 20, WCAG 4.5:1 / 3:1.
   - **Hand him §1, §2, §3 and §9 only** — the four approval questions at the
     foot of the template. Everything else is detail he can change later; do
     not ask him to ratify a document line by line.
3. **Find the photographs before the layout.** Search Unsplash, render the
   candidates to a contact sheet, **look at it**, send him three or four. The
   hero decides the page. If nothing fits, ask — he will source images rather
   than have the work limited.
4. **Build in passes and send a screenshot after each one.** Ground and hero,
   then sections, then motion. Never more than about twenty minutes between
   pictures. `SendUserFile` at 392 first, then 1440.
5. **Every question carries your recommendation.** *"Your call"* is an
   unfinished sentence.
6. **Write what he says into `TASTE-NOTES.md` the same turn — as
   INSTRUCTIONS, not as a transcript.** His rule, 2026-09-08: *"You should
   convert all of what I say into precise instruction, formatted nicely, so the
   next session can read fast. It doesn't have to dissect this big block of
   text."* Quote him only where the quote IS the rule and is shorter than the
   paraphrase. **Then add any new rule to section 10 below**, which is what the
   next site starts from.
7. **When he says it is right: run the checks, commit, and ask what the next
   one should be.** Never start a second site on your own initiative.

**Change one thing at a time when he gives a note, and never defend a page.**

---

## 2 · THE SET — five or so sites, and they must not be reskins

Each site is built from **a pair** of his own reference sites, named out loud
and different every time. One family is a style to copy; a pair is a tension to
resolve, and different pairs resolve differently.

**The variety target is his own eighteen** — *"not completely different and not
identical, but they're all still good."* A sleek page beside a page that looks
like a notepad is **too far**. What must differ between two sites: the
**section order**, the **ground**, the **type**, the **shapes**, and whether it
is one page or several. What must not differ: the quality.

**Vary the SKELETON, never just the palette.** A recoloured copy of an earlier
site is the recorded cause of the first failure in this project.

**The page count is part of the variety.** At least one site is a single page
with a jump-link header; at least one has real tabs.

**Built so far:** 1 Prime (`v-goldenhour*.html`), 2 Delgado (`w-delgado.html`),
3 Ballantyne (`x-ballantyne*.html`), **4 Kinzie (`y-kinzie.html`, 2026-09-09)**
— bone/graphite, one loud blue, every seam a 4.2° diagonal, and the first of
the set whose before/after is a real customer's car rather than a device.

---

## 3 · NAMING AND COPY

**A name is `[a person, a place, or one plain word] + [the trade]`.** *Prime
Mobile Detailing. Hugh's Detailing. Chicago Auto Pros.* Never a mood, never a
coinage, never a word the tagline has to explain. Of the eighteen sites he sent,
**the only crafted name belongs to a designer's demo with no customers.**

**The tagline states the trade and the place.** *"Mobile auto detailing — North
Seattle."* A metaphor is not a tagline.

**Packages are named plainly** — Express / Full / Ceramic, Level I / II / III,
Bronze / Silver / Gold. Never for a mood.

### THE H1 IS THE SERVICE AND THE PLACE — 2026-09-08, and it is now a check

**He rejected a headline reading *"Paint, after dark"*:** *"What the hell does
that mean? … it's too creative. It's too startup. It's too AI AI looking. **The
first bold thing should be explaining what this is.**"* The replacement is the
sentence that was already sitting under it as a subtitle — *Mobile paint
correction and ceramic coating* — and the subtitle, *"We bring the lights"*,
was deleted: *"not necessary, not needed. **I'm trying to get all of the AI
fluff out of here as possible.**"*

**HE HAD RAISED THIS BEFORE AND EXPECTED IT LOGGED, AND IT WAS** — rule 4
below, *"Be literature"*, written before site 2 was built. **The build broke it
in every heading anyway.** So the five rules below get the thing this repo says
a rule needs: `tests/tenant-sites.test.mjs` check 9 fails a home page whose
`<h1>` names no SERVICE. It was baselined against *"Paint, after dark"* — and
the first version PASSED it, because the word list included bare *paint*. A
material is not a service. Re-baselined until it failed.

**The test for any heading, and it is his:** does a stranger know what this
business does after reading it? *How a paint correction works* passes.
*What the light shows* does not.

**And the source for the words is in the repo already:**
`docs/tenant-site-source-data-2026-09-08.md` — real FAQ questions, real
condition disclaimers, real service names, pulled off ten live detailer sites.
**Site 2 was written without opening it and every FAQ had to be replaced.**

### The five things copy must never do

1. **Restate the control.** If the label already says it, delete the sentence.
2. **Restate the baseline.** *"We arrive with our own water and power"* — that
   is the job, not a selling point.
3. **Describe the wrong product.** Nothing about the website, the booking
   system, the dashboard or how fast it is to book. **The test: does a CAR OWNER
   care about this sentence, or does a DETAILER?**
4. **Be literature.** *"Hey, we're good at what we're doing"*, not a poem. This
   applies hardest to **headings**, which are labels: *What can change the
   price*, not *Three things move the number*.
5. **Make a warning into a paragraph.** Warnings are flags — *Sealant is not a
   ceramic coating*; *Pet hair or heavy soiling — add-on*. No full sentences,
   no full stops, nothing anybody has to read twice.

**Plain is not empty.** *"6 years, 1,240 cars"*, *"$1.20 a mile past 12 miles"*,
*"free to cancel up to 24 hours before"* are plain AND worth reading. A page
that removes the poetry and puts nothing there has swapped one fault for
another.

**A call to action is the NEXT thing the reader wants.** On a page of prices
that is *Book*, not *Get a price*.

---

## 4 · PHOTOGRAPHS

**Every picture must add value.** Not because research says a site needs
pictures.

- **A photograph must carry information, or be carried by it.** A hero the
  headline, the availability pill and the trust bar sit on top of earns its
  space. A full-bleed band with nothing on it does not.
- **A page whose subject is not visual owes no photograph at all.** A price
  table is about numbers.
- **Integrated beats spotlit.** The same photo inside a row with a package, a
  price and a review earns its space; alone across the page it does not.
- **The site as a whole must carry real photography, and the home page must
  have one above the fold** — measured, not felt: the hero image's top edge is
  under half the viewport height.
- **Never a grey placeholder box.**

**Photographs are SLOTS, not art direction.** They become the detailer's own
photos. Every image is `object-fit: cover` in a stated aspect ratio; every scrim
is sized to the slot and **computed against a white photograph**, never tuned
to one JPEG; every slot carries a comment naming the field that fills it.

**Render candidates to a contact sheet and LOOK.** Alt text does not mention
badges, and a rival firm's branded buckets in the corner of a "before" shot is a
real thing that has happened here. **Re-read your own rejection list before
reaching for a second image.**

**A before/after must be the same car.** Stock cannot supply that honestly, so
until a tenant has real pairs, use the staggered gallery instead.

---

## 5 · STRUCTURE

### The order, for a one-page detailer

Each line says what it answers. **A section that answers nothing gets cut.**

1. **Hero** — *what is this and can you come to me?* One photograph at scale
   carrying the headline, availability, proof and one call to action.
2. **Proof on the fold** — rating, review count, insured, years, cars done.
3. **Service area** — named towns, not a radius alone.
4. **Prices** — three packages, the vehicle-size ladder, the full tick list of
   what is included, and the warnings as flags.
5. **Recent work** — real photographs of real jobs.
6. **One job in full** — photo, package, what was done, that customer's review,
   and a way to book the same thing. *(Belongs among other jobs, never alone.)*
7. **Reviews** — compact, and near where somebody is still deciding.
8. **FAQ** — the objection you have not answered: how long, weather, parking,
   cancellation, scratches.
9. **Book** — the widget.
10. **Footer** — hours with an open state, phone, area, an oversized wordmark.

### The rules that shape it

- **NO PREVIEWS.** If a site has a Work tab, the home page does not carry a
  taste of the gallery; if it has a Prices tab, no price teaser. A teaser is a
  second, worse copy of a page that already exists, and the nav is how somebody
  reaches the real one. **A nav tab is a promise.**
- **NO TWO SECTIONS SHARE A SHAPE.** A ruled list, then another ruled list, is
  the single most-cited fault in everything he has rejected.
- **A page ships with TEN OR MORE devices from the inventory.** Restraint is
  not the safe answer here and he has said so in writing: a dense flat page is
  *harder* to navigate, not easier.
- **The ground changes at least three times down a page** and is never a flat
  fill — gradient, glow, texture, canvas or photograph.
- **A full-width band is a default, not a decision.** On a 1,380px desk a
  four-item list across the whole width is mostly empty ground. Ask of every
  section whether it should be sharing a row with the thing it belongs beside —
  add-ons belong next to the packages they modify.
- **A physical noun from the trade, never a document type.** Paint, water,
  light, foam, a car at a specific hour. *Paper, ledger, catalogue, notebook,
  logbook, receipt and schedule are banned answers* — four of ten rejected
  pages were literally stationery.

---

## 6 · NAVIGATION AND MOTION

- **SOMETHING STAYS ON SCREEN, ON EVERY SITE — his rule, 2026-09-08:** *"I
  think for every single site, there should be some sort of sticky top bar. Or
  it doesn't have to be the top. It could be top, it could be bottom, it could
  be on the side. Something. Just some way where something stays no matter
  where you are in the site."* On the desk he suggested the side himself —
  *"I think on the side will look cool because there's just kind of empty space
  there"* — and site 2 has a dot rail there.
- **AND `overflow-x: hidden` ON `html` OR `body` SILENTLY DISABLES
  `position: sticky`.** It makes the document a scroll container, so a sticky
  header sticks to a box that never scrolls and rides away. Site 2 shipped
  exactly this — the overflow was there to stop a drifting light layer
  scrolling the page sideways, **so the fix for one recorded rule broke
  another**, and he found it before any check did. **`overflow-x: clip` does
  not have this effect**; better still, contain the overflow on the one element
  that causes it. `tests/tenant-sites.test.mjs` checks 10 and 11 hold both
  halves.
- **Somebody must be able to act from anywhere on a 5,000px page.** The desk
  gets a sticky header that condenses on scroll; the phone gets a floating dock.
  **Both surfaces, always.**
- **The dock says where you are** — one indicator that slides to the current
  page, sized from that link's own box so one set of numbers covers 320 and 430.
- **Never two controls with one destination.** If the header has no Home, the
  dock has no Home.
- **Book gets standing attention** on both surfaces — a soft breathing glow, no
  layout, off under reduced motion.
- **Pages cross-fade, never flash.** `@view-transition` for Chrome and a class
  pair by hand elsewhere; **the fallback navigates on a timer**, so a failed
  animation can never trap somebody on a page.
- **Anything that opens, animates in — and out.** A component that opens ships
  its entrance and its exit in the same change.
- **Everything a pointer can reach reacts to it.** Transform or colour only,
  around 180–260ms, and neutralised under `@media (hover:none)`.
- **Motion is carried by the layout.** Generous is fine exactly to the degree
  the layout is disciplined. Nothing may gate a tap.
- **Every site gets a different kind of ground.** Do not reuse the dot field.

---

## 7 · THE BOOKING WIDGET

**`app/src/book/core.js` is the rules. Read its header; never edit it.**

- **ONE booking area per page.** Every other Book control — the header, a
  package card, the dock — is an entry point that scrolls to it and carries its
  selection in.
- **It draws the core's sequence**: `Services → [Extras] → Vehicle → Location →
  When → Details → Review`. Extras only when the tenant has add-ons. *A site may
  draw these as one long page instead — the ORDER is the rule, the pagination is
  not.*
- **The steps are a PROGRESS BAR, not a menu.** Not clickable. Seven equal
  fractions, so it fits any width. You cannot advance past an unfilled step —
  `canAdvance()` owns that rule.
- **It ASKS and never computes.** Every price from `calculate-booking`, every
  open time from `available-slots`, the profile from
  `get_public_business_profile`, the submit through `create-booking`.
- **Every managed figure carries `data-from`** naming the endpoint that owns it.
  *A number PRINTED is not a number CHARGED*, and here the two numbers would
  live in two codebases with nothing able to see both.
- **Review proof goes inside the form**, at the moment of commitment.

---

## 8 · VERIFICATION — what has actually caught things here

Run `node tests/tenant-sites.test.mjs` and the four credential-free suites
(`composition`, `design-contrast`, `landing-pricing`, `route-contract`).
Then, and this is the part that finds real faults:

1. **Screenshot 1920 / 1440x900 / 768x1024 / 392x844 and LOOK at every frame.**
   Read the console at each.
2. **Sweep 320 and 360, and 844x390** — a rotated phone is *wider* than a
   phone breakpoint, and rotation must change nothing.
3. **Compute every contrast ratio, and compute it against the LIT ground.** A
   gradient behind text is a new ground and every figure has to be taken again
   on it. A ratio taken from the token table can be a lie: a nested selector can
   override the colour you measured, so read text colours off the rendered page.
4. **List the sections in the built page** after any structural edit. A range
   delete takes what sits between its ends.
5. **Assert on exact strings, never a regex across a CSS block.** A `.*?` across
   a media query silently emptied one here and every check stayed green.
6. **Baseline a new check by breaking what it guards**, and commit first.
7. **A skipped check reads exactly like a passing one.** A guard that skips must
   print that it skipped.

**Report what was observed, never "this should work."**

---

**TWO TOOLS THIS LANE OWNS LIVE IN `scripts/`, WHICH THE LANE TABLE GIVES TO
SESSION C** — `tenant-site-image.mjs` and `tenant-site-artifact.mjs`, added
2026-09-09. They are there because every other tool in this repo is and that is
where a session looks; they are new files rather than edits, so they cannot
collide with C. `docs/sessions/README.md` is the manager's file to correct if
that is wrong. The same question hangs over this playbook and `docs/schemes/`,
which the table assigns to nobody in particular and which only this lane writes.

## 10 · THE RULES LEDGER — every site starts here

**His instruction, 2026-09-08:** *"Every single one we should improve from...
don't forget all of the advice and critique that I gave you this session."*
A site is not built from its brief alone; it is built from this list plus its
brief. **Add to it every time he gives a note, and never start a page without
reading it.**

### From site 1 — Prime Mobile Detailing
1. A nav tab is a promise: no previews or teasers of a page that exists.
2. Every picture must add value; a page whose subject is not visual owes none.
3. The desk needs persistent navigation too, not just the phone.
4. The booking steps are a progress bar, not a menu.
5. A contrast figure is read off the RENDERED page, never off the token table.
6. A photograph above the fold is a claim about the FOLD — measure it.

### From site 2 — Delgado Mobile Detailing
7. **The H1 states the service.** No phrase, no mood, no metaphor.
   *(checked: `tenant-sites` 9)*
8. **Every heading is a label.** If it would work as a band name, it is wrong.
9. **Delete any sentence that adds no fact.**
10. **Write copy from `docs/tenant-site-source-data-2026-09-08.md`** — real
    FAQs, disclaimers and service names off ten live detailer sites.
11. **A subject drives art direction and never the sales copy.**
12. **Places are real and recognisable; travel is a radius; every city named
    anywhere is one the service area lists.**
13. **A heading must not count things** — counts go stale the moment the
    section grows.
14. **Something stays on screen: top, bottom or side, on every site.**
    *(checked: `tenant-sites` 10)*
15. **`overflow-x: hidden` on `html`/`body` silently disables
    `position: sticky`.** Use `clip`, or contain it on the element that
    overflows. *(checked: `tenant-sites` 11)*
16. **A position indicator shows every label always**, sits flush on one axis,
    and the current one travels outward while the rest sit inward.
17. **"Which one is current" is a POSITION question, not an intersection one.**
    An observer on a wrapper that spans the page never yields, and the
    indicator sticks.
18. **Never list the packages twice.** Work rows are reviews with photographs.
19. **Every package in the price table gets a card.**
20. **Two-column lists become one column on a phone.**
21. **An FAQ must not reflow columns when one opens** — CSS `columns` is one
    flow in two tubes; use a two-column grid.
22. **A review rail loops for ever**, wrapped by exactly one set's width (not
    half the scrollWidth — that is out by half a gap). **It pauses ONLY under a
    finger or a held button, and nothing else.** Pausing on `wheel` or on
    `pointerenter` reads as a broken animation: a wheel event over the rail is
    somebody scrolling the PAGE, so the marquee stopped for 2.5s every time the
    cursor happened to be over the reviews — *"it's stopping and going."*
    A marquee has no reason to yield to a hover or a page scroll; it yields to a
    drag because it would otherwise fight one.
23. **A process diagram reads in the page's reading order**, numbered, plain
    stage names, with a sentence saying what it is.
24. **He approves a design as three 620x870 pictures, never as a document.**
    870px is the observed height ceiling for a file that reaches his phone.

### From site 3 — the interview, 2026-09-09
31. **The trade is FIXED: every example site is an ordinary mobile detailer.**
    Do not ask him what kind of detailer it is — he sells to mobile detailers
    and the question reads as not knowing that. What varies is the design, the
    words, the prices, the stats, the area and the look. *(`TASTE-NOTES.md`
    § BATCH 5.1 — it retires question 1 of § 1 above.)*
32. **The ground is picked from RENDERED FRAMES, not from adjectives.** Offer
    two or three heroes at 620x870 that are identical in every respect except
    the ground, and let him answer with a letter. Vary one thing or his answer
    means nothing.
33. **The pair must RESOLVE, so match the two references on FORM by opening
    their frames** — panel shape, chrome, how a photograph is held — never on
    his one-line verdict. He refused to name the detailer half himself and told
    the session to go and look.
34. **Facts come off a real detailer's site**
    (`docs/tenant-site-source-data-2026-09-08.md`); invent only what no real
    site supplies, and keep invented numbers inside that file's § 5 range.
35. **A contrast sampler must sample INSIDE anything with its own fill**, at
    its padding on the vertical centre — a point on a 999px corner is an
    anti-aliased blend of fill and ground and reported 1.64:1 for a pair that
    is really 8.80:1. A false FAIL costs the same as a false pass.

### From site 3 — his notes on pass one, 2026-09-09
36. **Proof must be a DIFFERENT SHAPE on every site.** Rating / years / cars
    done, in that order and format, is banned — he recognised it across three
    sites and it is what made them feel like one page. Changing the numbers is
    not enough; change what is counted and how it is laid out.
37. **The header is part of that too** — a site whose top bar looks like the
    last site's reads as the same site.
38. **Copy the reference's MEASURED devices, not its mood.** Open it in a
    browser, read its computed radii, weights and section shapes, and take
    them. Two corner families: pill controls, 12–16px panels, and corners that
    step down 1px when they nest.
39. **A big headline at REGULAR weight is a different studio's work** from the
    same headline at 700+. It was the single largest reason site 3's first
    frame read like sites 1 and 2.
40. **Transplant a real detailer's whole content set.** His named weakness in
    everything built so far is thinness: not enough real information. Five
    categories, every package, every inclusion, the add-ons, the town list.
41. **A count in the copy is a fact and gets counted** — the ladder is
    thirteen packages, and the page said fourteen until someone added them up.
42. **Same shoot, same branding.** Two of the photographs used here came from
    one shoot; rejecting the frame that showed the logo left its sibling in
    the page, and the sibling had the same logo. Reject by SHOOT.
43. **`display:grid` outranks the `hidden` attribute.** Three FAQ groups
    rendered at once and the tabs did nothing visible. `.qs[hidden]{display:none}`.
44. **A band is a new ground and everything dropped on it must be re-derived** —
    the town pills kept the page's cream ink on a cream band and were
    invisible, which every check passed.
45. **A contrast sampler must paint the glyphs out and shoot the ground.**
    Sampling beside a text box lands on a rounded corner and invents failures:
    it reported 1.19:1 for dark text on an amber pill that is really 9:1.

### From site 3 — the copy pass, 2026-09-09
46. **Run the copy pass as a LIST OF HEADINGS before anything else.** Print
    every `h1`/`h2`/label in page order and read them as a column: ten of site
    3's eleven headings were phrases, and that is invisible while you are
    reading the page section by section.
47. **A label above a heading must not restate it.** `01 · Interior` over
    "Interior detailing" is the rule's own example, and numbering three
    services is a numbered marker on something that is not a sequence.
48. **Never sell the baseline.** "We come to your driveway with water, power
    and everything else" is the job, not a reason to book. It shipped anyway,
    in the hero, on the site whose playbook names it as the worked example.
49. **A heading that counts is a heading that goes stale.** Two here did:
    "Five kinds of work, thirteen packages" and "Sixteen towns".
50. **A batch of string replacements must report which ones MISSED.** An
    all-or-nothing patch that asserts on the first miss writes nothing and
    looks like it ran; three passes here silently applied nothing at all.

### From site 3 — the animation pass, 2026-09-09. **51 IS FOR EVERY SITE.**
51. **AN ANIMATION THAT PLAYS ONCE IS A BUG — his rule, and it binds every
    site we build.** *"If there's an animation scrolling down, when you scroll
    back up, there should be an animation again. And when you scroll back
    down, the animation should have it again."* Leaving the viewport in
    either direction re-arms the element.
52. **Drive reveals from the SCROLL, not from IntersectionObserver.** IO does
    not fire at all in some embedded browser views, and because the hidden
    state is added by script, an observer that never fires is a BLANK PAGE.
    One rAF-throttled pass over ~40 elements costs nothing. Measured here.
53. **A transition cannot start from `display:none`, and `<details>` hides its
    own content while closed.** The answer snapped to full height in under
    90ms while wearing a 460ms transition that never ran. Hold the element
    open for the session, drive the state with a class, and set
    `aria-expanded` by hand.
54. **The pointer lights the CONTENT, not the ground** — a soft fill plus a
    brighter EDGE, from one delegated `pointermove` that writes two custom
    properties on the surface under the cursor. Sixty surfaces do not get
    sixty listeners.
55. **A sequence gets drawn as one thing.** Four equal boxes said "four
    unrelated items" about the one part of the page that is genuinely in
    order; a line that fills with the scroll, lighting each stage as it
    passes, says what the section means.
56. **Not everything is a box.** His word for this page was *"literally
    everything is in a box"*. Facts in a row, promises and small groups take
    a rule above them, not a fill and a border each.
57. **A heading hard against the section above it reads as amateur.** He
    named it on the work section; it had no top padding at all.
58. **Verify motion with a PROBE, not a screenshot** — a still frame cannot
    tell a 90ms snap from a 460ms ramp, and a screenshot taken mid-transition
    looks like a blank page and is not one. `.tmp-site3/probe-motion.mjs`
    reads the mid-flight value.
59. **Probe the element you ACTED on.** `querySelector(".q.is-open")` returned
    the question that starts open, and reported a snap belonging to a
    different element for two rounds.
60. **The hosted examples carry no banner strip.** It covered page elements
    and the placeholder warning it carried lives in every price's `data-from`
    attribute instead. `ex3` gets a paint switcher in its place, bottom-right,
    clear of the phone dock.

### From site 3 — the parallax pass, 2026-09-09
61. **TWO LAYERS TRAVELLING AGAINST EACH OTHER, and the SIGN is the effect.**
    His ask, pointing at fora: *"both of them are actually moving."* One layer
    sinks while the next climbs. Measured over 700px of scroll here: the hero
    photograph +112px, the strip under it -78px.
62. **Parallax offset comes from the element's own position on screen, never
    from `scrollY`** — a layer halfway down the page would otherwise start
    life thousands of pixels out of place.
63. **Move the IMAGE inside its frame, not the masked frame.** The hero's fade
    belongs to the frame; translating the frame drags the dissolve down the
    page with it.
64. **A header can be a FADE instead of a widget** — a ground-to-transparent
    wash from the top edge, appearing on scroll. He preferred it to the pill
    island precisely because it reads as part of the page.
65. **A horizontal rail must go VERTICAL below the desk.** Wrapped into two
    rows, the line existed only above the first row and stages 3 and 4 put
    their numbers inside the text of 1 and 2. Check it with a rectangle
    intersection test at 1440 / 768 / 392 / 320, not by eye.
66. **Switching tabs resets what is open underneath them.** A tab you return
    to should be closed, not remembering the state you left.
67. **A section can be deleted rather than fixed.** The home page's three
    service rows became one line on the prices page instead: the detail
    belongs beside the price it applies to, and the home page was carrying a
    second, vaguer copy of it.

### From site 3 — the reversal, 2026-09-09. **READ 75 BEFORE TOUCHING SCROLL.**
75. **NEVER HIJACK THE WHEEL. NOT ON ANY SITE.** A lerped smooth-scroll was
    built to imitate fora's weight and his verdict was immediate: *"when I
    scroll it's super delayed and super fast and stops abruptly — it's just
    horrible."* Native scrolling is not a thing to improve. Weight comes from
    what the page's own layers do, never from taking the wheel away.
76. **A MEASUREMENT CAN BE RIGHT AND THE BUILD STILL WRONG.** Fora's factors
    were measured correctly (0.31 / 0.17 background, 0.00 subject) and the
    page built from them was worse, because two big glows added at the bottom
    of the hero changed the thing he already liked. **Measure the reference,
    then change ONE thing and show it.**
77. **A REVERT CAN TAKE MORE THAN IT SHOULD.** Reverting that commit also
    removed the gap fix and the first-scroll movement, which had ridden along
    in the same commit. **Commit a fix and an experiment separately**, or a
    reversal costs the fix too.
78. **The footer's status dot was 0px wide** — `.fcols span{display:block}` at
    (0,2,0) beat `.open{display:inline-flex}` at (0,1,0), so the dot stopped
    being a flex item, fell back to `display:inline`, and an inline box
    ignores width. It rendered as a dark sliver. Give a dot
    `display:inline-block` so it carries a box wherever it is dropped.
79. **An oversized wordmark needs its own clipped band and a word WIDER than
    the page.** With a negative bottom margin it sat on the copyright line,
    and overhanging by 12px it read as cut rather than faded.

### From site 3 — the scroll, done properly, 2026-09-09
80. **THE WEIGHTED SCROLL ALREADY EXISTS IN THIS REPO. PORT IT, DO NOT WRITE
    ONE.** `app/src/landing/thread.js` — **WHEEL 1.22, LERP 0.055** — is the
    owner's stated favourite and has been for weeks. The hand-rolled version
    used LERP 0.115 with no wheel multiplier and he called it *"a complete
    horrible mess"*: double the catch-up rate with each notch carrying its raw
    distance is a lurch and a dead stop. **The constants ARE the feel.**
81. **`scroll-behavior: smooth` AND A WEIGHTED SCROLL CANNOT COEXIST.** The
    browser animates toward a target this thing moves every frame and the two
    cancel: one wheel notch travelled **14px in 1.4 seconds** against the
    landing page's 334. The stylesheet rule goes; jump links are eased by
    script through the same easing instead.
82. **HIS ORDER FOR THE HERO, 2026-09-09** — everything travels up, at
    different rates: the **headline and buttons fastest** (lag 0, moving with
    the page), the **strip next** (lag 0.12), the **photograph slowest**
    (lag 0.30). The gap between the text and the picture opening as you
    scroll is the thing he could see fora doing.
83. **A SLOWER LAYER NEEDS MORE SLACK.** At lag 0.30 the photograph travels
    half again as far as it did at 0.20, so its scale goes to 1.58 — the cap
    is measured from the frame, so this is arithmetic rather than taste.
84. **Compare a feel against something he has already approved**, not against
    a description. Sampling both curves every 100ms turned *"does this feel
    right"* into two rows of numbers.

### From site 3 — the parallax limit, 2026-09-09
85. **A PARALLAX LIMIT IS APPROACHED, NEVER HIT.** A hard clamp makes a layer
    stop dead at its cap and travel at page speed from then on, and he saw it
    instantly: *"right as the bar reaches the lower third of the screen it
    just starts scrolling at the same speed."* Use
    `off = cap * (1 - exp(-raw / cap))` — linear at the start, so the layer
    still moves on the first pixel, and asymptotic after, so it keeps
    differentiating for as long as it is on screen and never changes speed in
    one frame.
86. **A CLAMPED LAYER STOPS AT A DIFFERENT MOMENT FROM ITS NEIGHBOURS**, which
    is what makes the stop visible: the strip locked at 250px of scroll while
    the photograph kept lagging to 500. Two layers whose caps expire at
    different times read as one of them breaking.
87. **Room to move is padding, and it has to be MEASURED.** Contents drifting
    inside a clipped band can only travel as far as the band's own padding
    before the text clips against the edge — check it at the deepest travel,
    at three widths, rather than assuming.

### From site 3 — scroll-linked vs time-based, 2026-09-09
88. **IF A SECTION HAS A SCROLL-LINKED PART, EVERY PART OF IT IS
    SCROLL-LINKED.** The rail's line filled with the scroll while the four
    stage headings played a 420ms fade on arrival, and he named the seam
    exactly: *"it's more of, when it gets into place, then it plays an
    animation — not each tick is part of the scroll."* Mixing the two inside
    one section is what reads as glitchy. Give each part its own share of the
    same progress value and no transition at all.
89. **A TALL BLOCK MUST NOT WAIT FOR ITS TOP TO CLEAR 92% OF THE SCREEN.** The
    row of work cards is 400px deep, so by the time its top reached that line
    the row was already half visible and only THEN began a half-second
    arrival — the lag he could see. Reveal on entry: measured, the row now
    starts arriving with 27px of itself on screen.
90. **A ROW ARRIVES TOGETHER.** A per-card stagger on four cards in one row is
    a queue, and a queue is what "delayed" means. Stagger down a page, never
    across a row.

### From site 4 — the design sheet becomes the gate, 2026-09-09
91. **A RENDERED DESIGN SHEET IS THE FIRST DELIVERABLE OF EVERY WEBSITE
    SESSION, FOR EVER — his standing instruction:** *"make sure it does this
    every time every session before making website."* See § 1 step 2 and
    `docs/sessions/websites.md`. The worked example is
    `docs/schemes/kinzie-styleguide.html`.
92. **NOTHING ON THE SHEET IS A PREVIEW OF THE SITE.** *"It shouldn't even be
    like a preview of anything."* If a block could be lifted into the finished
    page as-is it belongs in the page, not the sheet. The sheet is the parts
    bin: faces, swatches, corners, states, animations, the one borrowed scroll
    effect, the rules.
93. **THE SHEET COMPUTES ITS OWN CONTRAST AND PRINTS IT BESIDE EACH SWATCH.**
    A figure written by hand goes stale the first time a token moves, and this
    repo has shipped that fault at least four times. Reading the computed value
    out of the live page and printing it makes the stale case impossible.
    **It immediately caught a figure this session had typed as 5.03:1 and
    which is 5.87:1** — the fifth time a hand-typed ratio has been wrong here.
94. **A TOKEN WITH ALPHA IS NOT ITS OWN COLOUR.** The sheet's first reader took
    the raw rgb of `rgba(242,241,234,.10)` and reported **1.00:1** for the
    surface panel, which is a FALSE PASS and the same class of fault as
    sampling a rounded corner. Composite over what it sits on, then measure.
95. **ANIMATIONS ARE SHOWN RUNNING, NEVER DESCRIBED.** *"Here's the specific
    animation when you scroll and the specific animation on this part."* Each
    one gets a stage, a replay button and its numbers. **A replay works by
    removing the class, forcing a reflow, and adding it back** — an animation
    that has already finished does not restart on its own.
96. **THE SHEET IS AN ARTIFACT, NOT A SCREENSHOT.** It is the first thing in
    this repo that he has to PRESS rather than look at, so it goes out as a URL
    that opens on his phone. Screenshots stay right for *"does this look
    correct"*; a link is the answer for *"try it"*.
97. **A LABEL PLACED NEAR A DRAWN LINE IS NOT ON IT.** The routed diagram's four
    stops were positioned by eye at percentages that looked about right and sat
    visibly off the path. Place a stop on the PATH'S OWN VERTEX, converted from
    the viewBox, and give the label real clearance — 9px put the text on top of
    the stroke.

### From site 4 — the drawn line is retired, 2026-09-09
98. **THE DRAWN CONNECTOR / NUMBERED STEP RAIL IS BANNED. It is in FOURTEEN of
    the twenty-six pages in `docs/tenant-sites` and he recognised it:** *"I feel
    like we've kind of overused that — almost like each one of our websites has
    that."* Counted, not guessed. **A device that appears on more than half the
    set is no longer a signature; it is the house tell**, which is the same
    failure as the banned rating/years/cars-done proof row (rule 36), one level
    up. Before adopting a scroll device, grep the set for it.
99. **HIS SECOND COMPLAINT WAS ABOUT THE TEXT, NOT THE LINE:** *"text isn't
    really cohesive and it kinda… yeah, it's weird."* Four labels pinned at four
    heights along a diagonal is a scatter. **In a scroll-driven section, move
    the PICTURE and hold the TEXT STILL** — one heading, one sentence, one
    readout, all anchored. The replacement's copy does not move a pixel.
100. **THE REPLACEMENT: a pinned panel and a squeegee the scroll drags across
    it**, uncovering coated paint from bare. It is the site's own subject rather
    than a diagram of it, it reuses the page's one angle, and it is one progress
    number feeding the clip, the blade, the two words, the bar and the readout —
    so it runs backwards on the way up with no second animation written.
101. **A CUT AND A LINE THAT SHOULD LIE ON EACH OTHER CAN LEAN OPPOSITE WAYS AND
    LOOK ALMOST RIGHT.** `rotate(-4.2deg)` puts the top of an edge to the LEFT;
    the first `clip-path` put it to the right. **Measured, the two centres
    agreed to within 1px and the leans were inverted** — invisible in a
    screenshot, obvious the moment the top and bottom x of each were printed.
    A bounding box cannot see a sign; compute the ends.

### Three ways a contrast checker lies, all found in one hour — 2026-09-09
102. **NEVER SHOOT `fullPage` TO GET A GROUND.** A `position: fixed` ground
    paints once at the top of a full-page screenshot; every pixel below the
    first screen came back WHITE and **manufactured seven failures in the light
    colourway and none in the dark one.** Shoot the viewport, a screen at a time.
103. **READ THE COLOURS BEFORE PAINTING THE GLYPHS OUT.** Injecting
    `color: transparent` first makes every computed colour `rgba(0,0,0,0)`, so
    all 227 pairs report 1.00:1 and the run "fails" completely. Collect, then
    paint out, then sample.
104. **NEVER MATCH TWO PASSES BY INDEX.** The peel's own labels fade from
    opacity 0 to 1 as the scrub runs, so they are filtered OUT of a pass taken
    at rest and IN on a later one — **every index after them shifts, and a
    label gets reported against a different element's ground.** It read 2.70:1
    for text that is really 5.71:1 and it survived three attempts to explain it
    away as a sampling artefact. Stamp an id on the element and match on that.
105. **A SINGLE PIXEL IS NOT A GROUND** when the ground carries a lattice or a
    texture. Sample five points across the element and take the median by
    luminance. (This one did not fix 104 — worth having anyway, and worth
    knowing it is not the answer when the number is wildly wrong.)

### Traps that cost a measurement here, and will again
25. **`flex: 0 0 min(a,b)` is invalid** — a math function in the shorthand's
    basis drops the whole declaration and the item sizes to content.
26. **`blockquote` carries a 40px UA margin each side.** Zero it, or the flex
    `gap` is not the pitch you think it is.
27. **`scroll-snap` returns an animated scroll to its snap point on the same
    frame.** A marquee and snap points cannot coexist.
28. **Writing `scrollLeft = scrollLeft + small` accumulates nothing** —
    sub-pixel increments quantise to zero. Keep the position in a float.
29. **A grid item's automatic minimum is its min-content, not zero.** Text gets
    clipped mid-word. `min-width: 0` on every grid child that holds text.
30. **`min-height` plus `aspect-ratio` derives a WIDTH.** A 250px min-height at
    16/10 is a 400px box inside a 352px card.

## 9 · WHAT NOT TO DO

- Do not rebuild the twenty-one earlier mock-ups. Add beside them.
- Do not vary the palette and call it variety.
- Do not use restraint as the safe answer.
- Do not hard-code a price.
- Do not read `docs/design-system.md` for a tenant's identity — that is our own
  product's, and a tenant site built from it comes out as our landing page
  recoloured. Its **mechanics** may be borrowed (the pointer glow, the weighted
  scroll, the pinned beat); its **skin** never may — no Archivo, no JetBrains
  Mono, no `#0B0D0E`, no accent green, no section order.
- Do not build from `andrewsdetail.com`. He raised it and withdrew it.
- Do not write a fourth planning document. This is the plan.

### From site 4 — the before/after pair, 2026-09-09
106. **A BEFORE/AFTER WIPE NEEDS A MATCHED PAIR, AND STOCK LIBRARIES DO NOT
    HAVE ONE.** Searched Unsplash properly and rendered the candidates to a
    contact sheet: the two closest were shot **one minute apart** and **in the
    same second** by the same photographers, and both change framing completely
    between frames — a door close-up against a wide rear three-quarter, a man
    washing against a side-on spray. **A true pair only exists when somebody
    sets a tripod and shoots it on purpose**, and detailers post those to
    Instagram, not to a free library. Ask the owner; he has said he will source
    images rather than have the work limited.
    **THE SPEC A USABLE PAIR MUST MEET**, and all six matter:
    same camera position, same height, same distance; same focal length (no
    zooming between shots); same light — same time of day, no flash on one and
    not the other; the car in the SAME SPOT, not moved and re-parked; landscape,
    at least 1600px wide; and **nothing in frame that moves between the two**
    (a person, an open door, a bottle on the ground) — the wipe reveals the
    difference, so anything that shifts reads as a glitch rather than as clean
    paint.
    **UNTIL ONE ARRIVES, SAY SO ON THE PAGE.** The placeholder here is one
    photograph shown twice with the lower copy dulled by a CSS filter. That is
    honest as a demonstration of the device and **dishonest as a claim about a
    car**, so it carries the word "Placeholder" in the section and a comment in
    the markup. Swapping in a real pair is two `src` values and deleting one
    `filter` line.

### From site 4 — the build, 2026-09-09. `docs/tenant-sites/y-kinzie.html`
**Live and pressable on his phone:**
`https://claude.ai/code/artifact/d069c813-eda8-46ea-952a-979b585ea9c4`
The repo file keeps its Unsplash URLs and is 400 KB. The ARTIFACT copy has
every photograph baked in, because **the artifact CSP blocks external images
with no visible error** and a published copy would otherwise render with five
holes in it. **`node scripts/tenant-site-artifact.mjs <page>`** does the baking and strips
the document wrapper the artifact host supplies itself. **Every site from here
goes out this way** — a link he can scroll and press beats a screenshot for
anything interactive, which is most of what these pages are.

107. **A WARNING WRITTEN IN THE DESIGN SHEET DOES NOT TRANSFER BY HAVING BEEN
    READ.** `kinzie-styleguide.html` carries the comment *"display:grid
    outranks [hidden] — say it"* beside its own tab component. The built page
    used `.ptable{display:grid}` with `[hidden]` panels and **rendered all
    three vehicle ladders at once — nine price rows instead of three** — and
    it survived a full screenshot pass, because nine plausible rows look like
    a long table. **Before writing a component the sheet already contains,
    grep the sheet for that component and read its comments**, rather than
    reproducing it from memory of having read the file an hour earlier.
108. **FIXED CHROME CANNOT BE TRANSLUCENT ON A PAGE THAT FLIPS ITS GROUND.**
    The nav was `color-mix(var(--ground) 82%, transparent)` over a blur.
    Measured: its accent wordmark is **5.19:1 over the graphite ground and
    3.03:1 when the paper band scrolls under it**, and the paint switcher's
    label **1.69:1**. One element, two grounds, and the failing ground exists
    only in the middle of the page — invisible at the top, invisible at the
    bottom, invisible to any check that samples one screen. Anything
    `position: fixed` on a two-band page takes an opaque fill.
109. **AN OVERLAY PANEL INSIDE A FLIPPED BAND MUST USE `--ground`, NEVER
    `--band`.** `--band` **is** the band it is sitting on, so the panel came
    out invisible **in both colourways at once**. The symmetry is the tell: a
    fault that shows in both paints is structural rather than chromatic, and
    the fix is symmetric too — `--ground` is the opposite of the band in both.
110. **A MATCHED PAIR CAN BE MANUFACTURED FROM AN UNMATCHED ONE, AND HERE IS
    THE METHOD.** Rule 106 says a true pair only exists when somebody sets a
    tripod. He sent one stacked frame shot handheld — same car, same driveway,
    different camera position — and it was made usable by measurement rather
    than by eye. **Split at the row with the largest row-to-row difference**
    (1024 of 2048, scanned for, not guessed). **Read two landmarks at 4x on
    both halves**: the wheel-hub centre cap and the bonnet badge, because both
    are small, high-contrast and unambiguous. Take the similarity transform
    between them — **scale 0.9391, offset 186.2 / 33.0 px**; rotation came out
    at 0.44° and was dropped. **Then crop each half THROUGH that transform**
    so the car lands in the same place in both frames. Residual at the two
    landmarks: **1.8px and 7.8px on a 1400px frame**.
    **WHAT IT CANNOT FIX DECIDED THE CROP.** The A-pillar and door were ~15px
    out after a fit anchored on the nose, because the two shots differ in
    PERSPECTIVE and a similarity transform has no perspective term. So the
    frame was tightened onto the region the fit is exact in — nose, bonnet,
    headlight, front wheel — which is also the better gloss picture. The one
    thing left is the **front wheel, which turned about 9° between the shots**:
    rim, tyre and hub cap overlay exactly and the spokes are half a spoke out.
    Named in the file rather than hidden.
    **The instrument was a headless canvas.** There is no `sharp`, no `jimp`
    and no PIL on this machine; Playwright is already installed and a canvas
    crops, scales and encodes webp by file extension.
    **`node scripts/tenant-site-image.mjs seam <src>`** finds the join row of
    a stacked pair by scanning; **`... crop <src> <out> sx,sy,sw,sh,dw,dh [q]`**
    cuts each half through the transform.
111. **THE CONTRAST MEASUREMENT LIED TWICE MORE, ON TOP OF 102–105.**
    (a) **Removing `.rv-hidden` STARTS a 520 ms transition.** A sampler that
    strips the class and reads 120 ms later measures elements **22px above
    where their own `getBoundingClientRect` says they are** — it reported
    1.58:1 for a caption that is really about 6:1, and **it did not reproduce
    on the next run**, which is exactly how a session talks itself into
    "sampling artefact" and moves on. Kill transitions and animations outright
    before measuring; the run is then identical twice, and that is the test.
    (b) **Text scrolling under an OPAQUE fixed nav is not visible, and
    sampling it reads the nav's own fill as the ground** — two h2s at 1.07:1,
    both false. Exclude the nav's height from the sampled band, and say so in
    the script so the next reader knows the gap is deliberate.
112. **A VIEWPORT-HEIGHT MEDIA BOX BECOMES A PORTRAIT CROP ON A PHONE, AND
    WHAT IT CROPS OUT IS THE PART THAT MADE THE EFFECT WORK.** The wipe panel
    was `height: min(60vh, 560px)`. At 768x1024 that is a 1.26 box holding a
    1.93 photograph, so `object-fit: cover` removed the entire nose of the
    car — and the nose is what makes the two halves read as ONE car across the
    blade. **Below the breakpoint the box is an ASPECT** (`aspect-ratio:16/10`,
    `height:auto`), so the picture decides its height instead of the screen.
113. **THE PAGE'S FIRST SEAM WAS THE ONLY FLAT ONE.** Every band boundary was
    the 4.2° slant and the hero's bottom edge — the first one anybody sees —
    was horizontal, because a hero gets written before the seam system does.
    Cut the hero on the same angle. **`--cut: calc(100vw * 0.0734)` is
    tan(4.2°) as a real offset**, so the clip-paths, the wipe's `--tilt` and
    every band agree by construction rather than by three numbers typed to
    match.
114. **A 568px-TALL PHONE IS A SEPARATE LAYOUT FOR A PINNED SECTION.** A
    `place-items: center` grid whose content is taller than its box overflows
    at **both** ends, so the heading is cut off the top and the panel off the
    bottom **and neither is reachable by scrolling, because the section is
    pinned.** Measured at 320x568 after the fix: heading top 48px, progress
    bar bottom 442px, dock top 494px — it fits with 52px to spare, but only
    once the head's type was cut (h2 42→26px, readout 34→24px) and the panel
    became an aspect.
    **MEASURE THE PINNED FRAME, NOT THE FRAME ON THE WAY IN.** A screenshot
    taken at a scroll fraction usually catches the section BEFORE the pin
    engages, which looks broken and is not — and hides the real pinned state,
    which may be. Scroll to `wrapTop + f * (wrapH - viewport)`
    and print the rects; a fraction of the whole page lands almost anywhere.

### From site 4 — his review of the built page, 2026-09-09
115. **A STYLESHEET THAT FAILS TO PARSE STILL RENDERS A PAGE, AND THIS REPO
    WRITES VERY LONG COMMENTS.** A comment closed fourteen lines early and a
    paragraph of English was parsed as CSS. The file looked right, the page
    rendered, the console was clean, and **seven of the hero's eight arrival
    beats silently did nothing while the eighth worked perfectly** — which
    sent three rounds of probing after the wrong thing. Count the rules the
    browser ACCEPTED (`style.sheet.cssRules.length`) and assert the keyframe
    blocks parsed; `.tmp-site4/probe-arrive.mjs` does both.
116. **AN ARRIVAL IS AN ANIMATION, NEVER A TRANSITION.** A transition needs
    the element to already carry a `transition` property BEFORE its value
    changes; hiding with `transition:none` and revealing by removing the class
    changes both in one style recalculation. Measured: the whole hero arrived
    in under 150ms, which is the pop it was written to replace.
    `animation-fill-mode: both` holds the `from` state through the delay AND
    finishes the arrival if every other script on the page dies, so the class
    is the only thing JS has to do.
117. **ANY ELEMENT WITH A RESTING TRANSFORM NEEDS THAT TRANSFORM WRITTEN INTO
    ITS KEYFRAMES.** The hero's film sheet carries `rotate(var(--slant))`; an
    arrival that animates `transform: translateY(...)` REPLACES that rotation
    for the whole run and snaps back at the end.
118. **A `fill: both` ANIMATION KEEPS WINNING AFTER IT ENDS.** It outranks
    normal declarations for as long as it is declared, so a later rule on the
    same property cannot take effect. Take the marker class off on the last
    `animationend`, with a timer as the floor under it.
119. **MEASURE AN ANIMATION BY SEEKING IT, NEVER BY SCREENSHOTTING A CLOCK.**
    `goto` returns hundreds of ms after the animation starts, so every frame
    showed a finished hero. `document.getAnimations().forEach(a => {a.pause();
    a.currentTime = t})` gives the exact frame — and **re-arm before every
    seek**, because seeking past the end fires the page's own cleanup and the
    next measurement then finds no animations at all.
120. **A SMOOTH ANCHOR SCROLL CANNOT BE `scroll-behavior: smooth` ON A PAGE
    WITH A WEIGHTED WHEEL.** Both drive `scrollTop` and argue over it. Drive
    it yourself and tell the wheel module where it ended up. **Interruptible
    is the part that matters more than the easing** — a wheel, touch or key
    during the travel stops it dead; a link must never hold the scroll for a
    second.
121. **RESERVING SPACE FOR A STICKY NAV MEANS ASKING WHERE THE DESTINATION IS,
    NOT WHERE THE NAV IS NOW.** The bar is down at the top of the page and up
    by the time a travel lands, so reading its current state reserved nothing
    and put every destination underneath it.
122. **A DOCK WITH TWO BUTTONS HAS TWO HEIGHTS.** The filled and outlined
    variants carry different box models, which he saw. He also asked what a
    Call button is doing there at all — *"I feel like no site has that"* —
    and both problems stop existing when the second button does.
123. **`padding-inline: 0` ON A FULL-BLEED FOOTER'S WRAP IS TWO BUGS.** The
    footer spans the viewport, so the `calc(50vw - 50%)` above it evaluates to
    zero and the override is the only padding in play: text on the glass at
    phone widths, and the footer 34px out of line with every other section at
    desk widths. Measured at x=129 against a heading at x=164.
124. **THE GIANT FOOTER WORDMARK IS A HOUSE TELL FORMING.** 6 of 28 pages in
    `docs/tenant-sites`, and those 6 are sites 1, 2, 3 and 4 — every site
    since the design-sheet process began. Same shape as the drawn connector at
    14 of 26. He likes it and asked only that it be smaller. **Recommended,
    unanswered: site 5 does not get one.**

### From site 5 — the references arrive as CONTENT, not only as a look, 2026-09-09
125. **HE HANDED OVER A REAL DETAILER'S WHOLE SITE AND SAID TO TAKE THE
    INFORMATION, NOT THE DESIGN.** Verbatim: *"use all of the information
    that's on their website. Like, literally every single thing… obviously
    don't make an exact copy of their website."* And the reason, which is the
    part that generalises: *"I'm trying to figure out the best way of how you
    take… how I could get you to generate a website that actually is accurate
    on what a detailer would want, and the best way to do that is just to have
    you look at an actual website and just copy all the details."*
    **So a reference now has TWO halves that are read separately: the LOOK
    reference and the FACTS reference.** Crawl the facts one properly — every
    page, not the home page — and port the prices, the packages, the plans,
    the service area, the policies and the FAQ. Then build a look that shares
    nothing with it. `carolinamobilecarwash.com` is Barlow Condensed and
    DM Sans on white; site 5 is Kanit italic on near-black, and both of those
    faces are banned on it by name for exactly that reason.
126. **CRAWL THE SITE FROM THE BROWSER, NOT FROM THE HOME PAGE'S TEXT.** The
    home page returns the catalogue with the prices ALIGNED TO THE WRONG
    ROWS — their own bug — and the accordion answers on `/faqs/` are invisible
    to a text scrape. One `fetch` + `DOMParser` loop over the eight real URLs
    got every page in one call and cost nothing.
127. **SEGMENT BY WHAT THE VEHICLE IS, NOT BY WHAT SIZE IT IS.** Bus, RV, golf
    cart, semi, trailer, boat, fleet. **Every site in this set so far ladders
    small / midsize / large**, so this one change re-orders the whole middle of
    a page and is the cheapest real variety available. It is also what a
    detailer actually sells.
128. **A MARQUEE / TICKER BAND IS NOW A HOUSE TELL TOO** — 6 of 28 pages, and
    those 6 are sites 1, 2 and 3. Carolina has one (*"IF IT DRIVES… WE DETAIL
    IT!"*) and site 5 still refuses it. **Before adopting ANY device off a
    reference, grep the set for it** — that is now two devices caught this way
    (rule 98) and one caught too late (rule 124).
129. **A PHOTOGRAPH IS NOT VERIFIED UNTIL ITS LABEL IS BESIDE IT.** The first
    switchboard put eight car photographs under eight vehicle labels — a car
    under "SEMI & TRAILER", a dashboard under "BOAT" — and every check in this
    repo passed. **Render the tiles WITH their captions and look at the
    grid**, not at the photographs alone. A caption also lies: Unsplash calls
    a Class C motorhome "white and brown van".
130. **IMAGES BUILT BY STRING CONCATENATION IN JS ARE INVISIBLE TO THE ARTIFACT
    BAKER.** `scripts/tenant-site-artifact.mjs` matches `src="https://images.
    unsplash…"` in the source text, so seven tiles assembled as
    `'<img src="…' + PHOTO[k] + '…">'` were left as remote URLs, which an
    artifact's CSP blocks silently. **Static `<img>` in the HTML, always** —
    it is also better for the page. Count the "remote photographs to bake"
    line against what the page actually shows.
131. **TRAP 29 BITES A GRID AT 320 EVEN WHEN THE MEDIA QUERY IS RIGHT.** The
    two-column grid was correctly collapsed to one column and still overflowed
    by 54px, because a grid item's automatic minimum is its min-content and
    `carolinamobilecarwash.com` is one 312px word. `.grid > *{min-width:0}`
    plus `overflow-wrap:anywhere` on headings. **Measure
    `scrollWidth - clientWidth` at every width; do not read the media query.**

### From site 5 — the build, 2026-09-09. `docs/tenant-sites/z-tampabay.html`
132. **A DISPLAY FACE MUST NEVER BREAK MID-WORD, and the rule that broke it was
    copied in from the design sheet.** `overflow-wrap:anywhere` is right on a
    sheet full of file paths and domain names; on the site it split the poster
    headline into **MOBI / LE** and **DETA / ILING** at 392. Put it on prose
    only, and never on `h1,h2,h3,.disp`.
133. **MAKING AN ABSOLUTE CHILD `static` INSIDE A FLEX PARENT DOES NOT STACK
    IT — IT BECOMES A SIBLING COLUMN.** The phone breakpoint set the eyebrow
    and the glass card to `position:static`, and because `.poster` is
    `display:flex`, both turned into narrow columns beside the headline: the
    card read **CER / AMI / C / COA / TING**. The parent's `display` has to
    change too. Every check passed; only looking found it.
134. **THE SAME ELEMENT OVER TWO DIFFERENT GROUNDS IS TWO MEASUREMENTS.** The
    hero's translucent card sits over dark paint at 1440 and over BRIGHT RED at
    392, because the photograph crops differently. It was fine at one width and
    unreadable at the other. **Run the contrast pass at every width, not just
    the widest.**
135. **`b` AND `strong` DO NOT FOLLOW A BAND.** The light band overrode
    `h2,h3,p,.cap` and not `b`, so *"Gift cards are available"* was near-white
    on cream — invisible, and no check saw it. When a section inverts the
    ground, enumerate EVERY inherited colour, not the ones you happened to use
    in the heading.
136. **THE CONTRAST INSTRUMENT LIED THREE MORE WAYS, all found in one hour and
    all now fixed in `.tmp-site5/contrast.mjs`.** (a) **Clamping a sample row
    into the viewport samples a different element's ground** — an element whose
    centre is off-screen reported 1.78:1 for footer links that are really 9.7:1.
    Require the CENTRE to be on screen and scroll in smaller steps. (b) **A
    label parked at `text-indent:-9999px` is not visible text** and must be
    excluded. (c) **A single sample row through the glyphs still carries
    antialiased remnants of the text you painted out** — sample three rows (top
    edge, middle, bottom edge) and take the median of nine. That last one was
    the difference between "two failures" and zero, and the two it invented
    were in a list whose other two items passed at 9.7:1: **when two identical
    siblings disagree, it is the instrument.**
137. **AN ELEMENT SITTING UNDER THE STICKY NAV IS OBSCURED, NOT LOW-CONTRAST.**
    The sampler read the nav's red Book button as the ground for a form label.
    Skip the nav's band in the sampler; do not "fix" the design.

### From site 5 — his review, 2026-09-09
138. **A TENANT'S NAME IS A SIGN, NOT A BRAND.** *"The name Gandy goes against
    the don't-use-a-startup-name thing… it should just be something
    straightforward."* His own list of real ones: **Andrews Auto Detail**,
    **Melee Mobile Detailing**, **Chicago Auto Pros**, **Carolina Mobile
    Carwash**. **The pattern is a place or a surname, then the trade, in plain
    words.** No invented single word, no place-as-brand, no full stop after it.
    Site 5 is **Tampa Bay Auto Detail**. This is the never-defaults list one
    level up: it applies to the NAME as well as the type and the copy.
139. **A HEADING EITHER SAYS THE THING OR MAKES YOU WORK IT OUT.** He named six
    lines in one pass and every one of them was the second kind — *"Once a
    month, same slot, no phone call"*, *"Your vans are your advertising"*,
    *"The eight things that always happen"*. His test: *"often times it's being
    look straightforward, not something you have to think about to
    understand."* **A heading is a label. The clever version of a label is a
    riddle.** Rule 4's *"be literature"* has now been broken on three
    consecutive sites; treat a section heading as a NOUN by default.
140. **HE ALSO NAMED THE HALF-SENTENCE, AND THAT IS THE SHARPER LESSON.**
    *"…quoted before we start, never after"* — *"it was so good until you said
    never after."* The sentence was finished and then a rhythm was added.
    **Read every sentence back and delete the clause that exists for the
    cadence.**
141. **A PRICE WITHOUT ITS CONTENTS IS NOT A PRICE.** *"You don't see the
    details of what comes in everything… I actually need exactly what comes in
    each package."* A one-line summary reads as marketing; the itemised list is
    the thing a customer is actually buying. Every service on site 5 now lists
    its contents.
142. **A CUTOUT IS A SHAPE, NOT A BOX UNDERNEATH.** He compared our tab to the
    reference's: *"it's not just red, it's actually a cutout — the box that the
    image is in isn't just a regular rectangle, it's that cool shape with a
    little tab sticking out."* Built by giving the tab **its own copy of the
    photograph, sized to the poster and offset by the tab's position**, so the
    two crops are the same crop. `--pw` / `--ph` / `--tx`, re-measured on
    resize. A separate coloured box is what he was pointing at as wrong.
143. **AN ENTRANCE THAT ANIMATES `transform` DESTROYS A DECLARED `transform`.**
    `g-settle` ends on `transform: none` with `fill-mode: both`, which
    permanently overrode the tab's `translateX(-50%)` and pushed it 107px past
    the right edge — a real horizontal overflow at 320, 360 and 392. **Animate
    a WRAPPER, never an element that is positioned by transform.**
144. **REVEALS MUST REPLAY IN BOTH DIRECTIONS.** *"As you scroll up, that
    animation should appear again, and you scroll down, it should also appear.
    So there should be constant animations."* A one-shot reveal reads as a page
    that has stopped. Re-arm on exit.
145. **A DRIFTING FIXED GROUND NEEDS A CLIPPING PARENT — AND `overflow-x: clip`
    ON THE BODY DOES NOT SAVE YOU.** Scaling the fixed layer itself widened the
    document by 5px at 320. Put the animation on a child inside a
    `position: fixed; overflow: hidden` box.
146. **`<details>` CANNOT BE ANIMATED WITH A CSS TRANSITION** — the browser
    reveals the content in the same frame it sets `open`, so there is no start
    frame and the `0fr → 1fr` grid trick silently does nothing (measured:
    64px → 64px). Drive the height from script and delay the close.
147. **THE WEIGHTED SCROLL IS PORTABLE AND HE ASKS FOR IT BY NAME.**
    *"It uses the one that we use for our landing page, or you can make a new
    one."* `app/src/landing/thread.js` — WHEEL 1.22, LERP 0.055, fine pointer
    only, `?smooth=0` to turn it off, and a `scroll` listener that resyncs so it
    never fights an anchor travel. Twenty-five lines, no library.
148. **THE iPAD IS A THIRD SHAPE AND THIS REPO KEEPS FORGETTING IT.** The hero
    card was absolute until 900px and stacked below it; between 900 and 1024 it
    overlapped, which is exactly where he was looking. **Sweep 1024 as well as
    320 / 392 / 768 / 1440 / 1920.**

### From site 5 — his second review, 2026-09-09
149. **NO ARTIFACTS. A TENANT SITE IS PUBLISHED AT `/ex<N>`.** His instruction:
    *"You don't need to make any more artifacts. Make sure future sessions
    don't make any more artifacts unless I specifically request it."* Register
    the page in `scripts/build-examples.mjs` and run it with `--dev`. **The
    deeper reason is the one that bit here: an artifact is a SECOND COPY**, and
    two of the notes he gave in that message were about faults already fixed in
    the repo file and still present in the artifact he was reading.
150. **A CUTOUT CANNOT BE BUILT FROM TWO COPIES OF THE PHOTOGRAPH.** The first
    attempt gave the tab its own `<img>` sized to the poster and offset by the
    tab's position. It is exact arithmetic and it renders EMPTY, because
    `object-fit: cover` crops the picture to the poster's box — there is no
    image below its bottom edge to continue into. **The shape has to be one
    box:** make the poster taller by the tab, let one image cover all of it,
    and cut the silhouette with `clip-path: path()` written by script (a
    rounded corner cannot survive `objectBoundingBox` fractions).
151. **AN ANIMATION THAT ENDS ON A PROPERTY OWNS THAT PROPERTY FOR EVER.** This
    is rule 143 again on a different property and it cost another round: the
    hero's unmask ends on `clip-path: inset(...)` with `fill-mode: both`, so
    the shape written by script was silently ignored. **Clip the PARENT and
    animate the CHILD.** Whenever a script writes a property, grep the
    keyframes for it first.
152. **A SECTION IS TOO BIG TO BE A REVEAL UNIT.** *"There's no animations as
    you scroll up and down… all the text and items and everything on the screen
    kind of animating into the screen, there's just nothing that happens."* A
    900px section fires the moment its top edge appears, so everything inside
    it is already on screen by the time it is read — and the page looks static
    while the code is technically working. **Mark the PARTS** — headings,
    paragraphs, cards, tiles, list items — filter out any candidate that sits
    inside another candidate, and stagger by index within the parent. Measured
    after: 87 units and zero viewports with nothing moving.
153. **`position: absolute` BLOCKIFIES AN `<a>`; `position: relative` DOES
    NOT.** Switching the hero's card from absolute to relative on a phone left
    it `display: inline`, so its background painted per LINE BOX and came out
    in ragged fragments behind the words. Every contrast figure still passed.
154. **A POSITIONED SIBLING PAINTS ABOVE STATIC CONTENT.** The same phone
    breakpoint had first made that card `position: static`, which put it
    UNDERNEATH the hero photograph — visible, ghosted, unreadable, and again
    invisible to every check.
155. **A SCRIM IS AIMED AT A LAYOUT, NOT AT A PAGE.** The hero's 66° corner-to-
    corner gradient is right for a wide poster and wrong for a stacked one; the
    eyebrow measured 3.53:1 at 320 against the bright red. The stacked
    breakpoint gets a vertical scrim of its own.
156. **DO NOT PAINT A PHOTOGRAPH WITH THE ACCENT.** He asked, plainly: *"did you
    need this entire image red, or can you not just find an image of a car that
    is red?"* A `mix-blend-mode: multiply` over a red fill turned a photograph
    of a red car into a flat red panel — the picture stopped being a picture.
    **Find the right photograph; do not tint the wrong one.**
