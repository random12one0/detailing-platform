# The intake — what to ask a detailer before building their site

Written 2026-09-06 (roadmap item J). The owner described this on 2026-08-29: a
short set of questions a detailer answers about their website, **with examples
to choose from**, *"because most of them will not know what they want in the
abstract"*.

**This is the questions half. The examples half is not built and is waiting on
him** — see § 5.

---

## 1. The rule that shapes the whole thing: only ask what the product does not already know

**Half of what a site needs is already in the database**, because the detailer
put it there when they set up their dashboard: their services and prices, their
hours, their travel area, whether they do mobile or drop-off, their accent
colour, their gallery, their reviews, their FAQs, their payment handles. All
twelve of those are enumerated in `docs/tenant-site-contract.md` § 2, and a
site reads them live.

**So an intake that asks for services and prices is an intake that asks a
detailer to type their business in twice** — and worse, it creates a second
copy that goes stale the day they change a price in their pocket, which is the
one thing this product promises they can do.

**Every question below is one the database cannot answer.**

---

## 2. What the site needs and nobody has stored (the actual questions)

### Who they are

1. **How long have you been doing this, and how did you start?**
   *Two or three sentences in their own words.* This is the About section and
   it is the single hardest thing to invent convincingly. `businesses.
   established_year` holds the number; nothing holds the story.
2. **What do you want people to feel about your work?**
   Free text. The answer is almost always some version of *careful*, *fast*,
   *cheap* or *fancy*, and which one decides the whole tone.
3. **Who are your customers, mostly?** Daily drivers, enthusiasts, dealerships,
   fleets. It changes the photographs and it changes the words.

### What they want said

4. **What do people ask you before they book?** They will name three or four,
   and those are the FAQ — which the product now stores (roadmap 3.2b), so this
   question is really *"have you filled that in, and if not let us do it from
   your answer"*.
5. **What do you refuse to do?** Engine bays, pet hair without a surcharge,
   commercial vehicles. This is the paragraph that saves a phone call, and no
   screen in the product asks for it.
6. **Is there anything you are proud of that a customer would not know?**
   Certifications, the products they use, a warranty. `business_branding.
   credentials` was added for exactly this (contract § 6) and is empty on every
   account.

### What they have

7. **Photographs: what have you got, and can we use it?** Their own work beats
   any stock photo, and the answer is usually *"a phone full of them"*. The
   gallery in the product is the destination.
8. **A logo?** Most will not have one. The site has to look deliberate without
   one, so the answer changes the design rather than blocking it.
9. **Is there a site now, and what do you dislike about it?** The most useful
   single question in this list. People cannot describe what they want and can
   always describe what annoys them.

### What it has to do

10. **What do you want someone to DO on it?** Book, ring, message, or ask for a
    quote. The product does bookings and requests; if the honest answer is
    *"ring me"*, the site is shaped around a phone number and the booking form
    is secondary — and that is allowed.
11. **Is there anything seasonal?** A winter package, a summer rush. It decides
    whether the site needs a strip that changes.
12. **Anything you sell that is not a wash?** Ceramic coating consultations,
    paint correction assessments, a monthly plan. Plans exist in the product;
    consultations do not, and a site that offers one needs somewhere for it to
    land.

---

## 3. How to ask them

**Not all at once and not as a form, the first time.** The owner's own
observation is that most detailers cannot answer in the abstract, and twelve
open questions in an email is how an intake gets ignored. In a conversation,
these are twenty minutes; written down afterwards, they are the brief.

**The answers belong in the repo, next to the site being built** — one markdown
file per client, in the client's own words rather than paraphrased. The kit
(`docs/tenant-site-kit.md` § 5) is what an agent is pointed at; the intake file
is what it is pointed at FOR.

---

## 4. What NOT to ask

- **Anything the dashboard already holds** — § 1.
- **"What colours do you want?"** They have already chosen an accent in the
  product, and asking again invites a second answer that disagrees with the one
  their booking page uses.
- **"What pages do you want?"** A detailer does not know, and the answer is a
  sitemap written by somebody who has never seen the site. The pages come from
  what they said in § 2.
- **Anything with a technical word in it.** No "hero", no "CTA", no
  "responsive".

---

## 5. The half that is not built, and why

**The examples.** The owner asked for questions *with examples to choose from*,
and there is nothing honest to show yet: the three worked pages in
`docs/tenant-sites/` **passed every check in this repo and he still said they
look AI** (`docs/tenant-site-research-2026-09-05.md` § 7), so they are the
structural range and explicitly **not** the taste reference.

**Showing them as examples would be asking a detailer to pick from three things
we already know are wrong.**

What unblocks it is two or three real detailer sites whose VIBE he likes, a
sentence each — question 0 in `docs/overnight-log.md`. With those, § 2's
questions 1–3 and 9 get pictures beside them and the intake becomes what he
described.

**Until then this file is the whole of it**, and it is enough to brief a first
client site properly.

---

## 6. UNBLOCKED — 2026-09-07

**He answered question 0 and then widened the ask.** Five reference sites on
2026-09-07 (`docs/TASTE-NOTES.md`), and then: *"having me be a guide there — a
list of a ton of different car detailing websites that I think are good and look
nice… but also for the customer: which one is your favorite?"*

**So the examples half is no longer blocked, and it is now a SCREEN rather than
a paragraph in this file.** The research behind it is
`docs/tenant-site-intake-research-2026-09-07.md`; the build is roadmap phase 9.

**What that research changes about the questions above** — the list itself
stands, and these are the deltas:

- **Q4 becomes a yes/no.** The product stores FAQs now, so the question is
  whether that section appears on the site, not what goes in it. Same for
  reviews. He named both.
- **Q7 splits.** *What have you got* is a question; the UPLOAD is a separate
  screen, because a phone full of photographs is not something anybody does
  inside a form.
- **Q8 asks for a VECTOR file** if one exists, with one line saying why — it is
  the difference between a crisp mark and a blurry one on a phone, and it is the
  most common asset problem in every onboarding guide read.
- **Five questions are added:** the gallery itself; three visual either/ors
  shown as real rendered pages rather than described (movement or stillness,
  photographs big or facts big, dark or light); what a customer must be able to
  do without scrolling; a refusal list; and whose phone rings.

**And one finding from the research binds every visual question here:** a
non-designer cannot see a small difference, so each either/or has to be between
two things that look plainly different — and **never more than three options
side by side**, because past three people fatigue and pick at random.
