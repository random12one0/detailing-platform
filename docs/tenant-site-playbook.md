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
2. **Fill in `docs/DESIGN-SCHEME-TEMPLATE.md` and stop for a yes.** The
   filled copy is `docs/schemes/<tenant>-scheme.md` and it is **the first
   deliverable of the session — no HTML exists until Andrew approves it.**
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
