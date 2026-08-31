# Owner walkthrough — 2026-08-30

The owner went through the whole product himself, on a phone emulator and on
desktop, and talked through it as he went. This file is his words and what
they mean. **It is the primary record.**

**STATUS, updated 2026-08-31 (roadmap 2.6).** The clipping-and-spacing half is
DONE — W7, W8, W11, W12, W13, W14, W15 and W24 are closed, and each one below
carries what was measured. The features half (W1–W6, W9, W10, W16–W23, W25–W27)
is roadmap 2.7 and 2.8 and has not been started.

**And the emulator caveat earned its place.** Every "cut off" item was
reproduced at 392x844 in a real browser before it was touched, and one of
them did not reproduce the way it was written down: W14's Open button is only
off-screen when the browser HAS `navigator.share`, which Chrome on Windows
does and a headless browser does not. Reading the report literally would have
closed it as "does not reproduce". The right check was not "is it broken at
392" but "what did HIS browser render".

His headline, first, because it frames the rest: *"right away, I just wanna
say, like, how good it looks so far. I really like the design."* Everything
below is refinement on a design he has accepted, not a rejection of it.

**Two conditions on reading this file.**

1. **He was on a Windows mobile emulator, not a real phone.** He flagged that
   himself, twice. Every "cut off to the right" item below therefore needs to
   be reproduced at 392x844 in a real browser BEFORE it is treated as a bug —
   `node scripts/shoot-dashboard.mjs` already shoots that width. If it does not
   reproduce, say so and close it rather than fixing something that was never
   broken.
2. **He asked not to be deferred to on the colour question** — see D2. That
   instruction is about the colour fix specifically, and it is unusual enough
   to be worth honouring precisely: he wants the engineering call made on the
   merits, not adopted because he suggested it.

---

## The two decisions he answered

### D1 — Publish to the live site: YES

*"Now you could publish this to the website."*

With the stakes stated in his own words, which matter for every future
publish question: *"I'm not — this website and everything, I'm not — no one
knows about it, only me. And it's not going out until everything's finished.
So in reality, it's not like something bad should happen if we don't publish,
but it's nice for me to be able to view it, you know, anywhere."*

**So the standing situation is: the live site is his private preview.** It has
no audience yet. That lowers the cost of publishing mid-phase to roughly zero
and makes "he can look at it on his phone" the actual reason to do it. It does
NOT change the rule in `CLAUDE.md` — still ask before merging to `main` — but
it does tell a future session what the answer is likely to be and why.

### D2 — Do NOT drop Crimson. Fix the collision another way.

*"those eight colors were chosen by AI. They weren't by me, so I really don't
care about them. But I do want to have, like, a good amount of color choices
for detailers, because a lot of detailers' color is probably red. So I don't
think you [should drop it] — maybe find some way around that, maybe a fix."*

This reverses the recommendation that was put to him. The reasoning is a
business fact the code did not know: **red is a common colour for a detailing
business**, so the preset list cannot be pruned of reds without pruning real
customers. The eight presets carry no authority — he did not choose them and
does not care about them — but the *coverage* does.

What he asked for, in three parts:

- **Research which colours real detailers and small businesses actually use**,
  and make sure each one works. Not a curated four-to-six any more — a good
  amount of choices.
- **A custom colour picker that classifies an arbitrary colour into a hue
  family** — his framing: *"there's a group of reds and oranges and blues and
  greens and yellows, whites and purples… even though obviously they're a
  different color technically, they're that same type of color, and we could
  figure out, you know, basically make sure that almost every single color in
  the world will work with the website somehow."*
- **For the status colours that now collide with a red accent:** *"maybe we
  switch that color, or maybe you warn the detailer, or make it more obvious
  that it's cancelled with words or sizing or something. You figure that out.
  Don't use my word in any way to kind of decide your decision."*

**That last sentence is an instruction, not modesty.** He listed three
possible fixes and then explicitly removed his own authority from the choice.
The next session owns this decision on the merits. See "The colour problem,
restated" below for the analysis that is already done, so it does not get
re-derived.

**This supersedes** the "drop Crimson" recommendation recorded in
`DECISIONS.md` → "Roadmap 2.3, reopened" and in roadmap 2.4 item 3. It does
NOT change the measurement that prompted it: Crimson corrected for text is
still `#E55B5B`, still ΔE 11.4 from `--bad` `#E2705F`. The number stands; the
response to it changed.

### D3 — The accent is identity. It must not carry meaning.

**Said mid-session while roadmap 2.4 was being built, and it changed the
shape of the fix.** His words:

> *"Not everything, not every single colour needs to be changed just because
> they changed the accent colour. Like, the paid should always be green because
> that's just kind of paid. Money green is all kind of cohesive. So the paid
> button should just always be green. Now the accent colour is more like the
> mark complete button or, like, the calendar highlight — like, what day it is,
> you know — and the outline for month, and the colour theming on the money
> page and stuff like that. Like, there's little accents of colour should be
> whatever the client chooses. But stuff that's, like, the paid button should
> just be green because, well, that's, you know, obviously green. And there
> might be other places that that rule applies to also."*

This is now `docs/design-system.md` **law 11b**, with the full table of which
colour goes where. The short version: **`--accent` = identity** (actions,
navigation, selection, focus, today's disc, chart bars, the "it landed" node);
**`--ac` green and `--bad` red = meaning** (paid / money up / it worked, and
cancelled / no-show / error), fixed for every tenant.

It is a better answer than the one being built. D2's fix was making the
statuses survive a red accent by shape; D3 stops the collision existing for the
things that matter, because "Paid" is no longer red at all. The shape work
stayed anyway — it also covers the silver and near-black accents, which collide
with the *neutral* marks and have nothing to do with red.

**"There might be other places that that rule applies to also" was taken as an
instruction to extend it**, and it was extended to four more sites he did not
name: `.delta.up` (a red ▲ beside a red ▼ on the Money screen), `.ok-box`
(identical to the `.error-box` above it under a red accent), Money's
`tone="good"` figure, and `.badge.paid`. All are in DECISIONS.md → "Roadmap
2.4".

**One judgment call was made inside the rule and it is worth knowing about:**
*completed* stays on the accent while *paid* moves to green. Reasoning in law
11b; it is a one-line change if he reads it the other way.

---

## The colour problem, restated for whoever picks it up

**The collision is real but narrower than "red accent breaks the app".**
Worth knowing before designing a fix:

- **Status pills and badges already carry words.** `.pill.completed` says
  "Paid"; `.pill.cancelled` says "Cancelled". Colour is reinforcement there,
  not the message, so a red-on-red pill pair is ugly and ambiguous at a glance
  but not unreadable.
- **The genuinely colour-only signals are the small ones**: `.dot.completed` /
  `.dot.cancelled` (7px circles) and the calendar's `.marks`. Those carry no
  text, and the calendar legend is the only thing that decodes them. **That is
  where the fix has to land**, and it is a WCAG 1.4.1 point (colour must not be
  the only visual means of conveying information) independent of any tenant
  accent — so it is worth fixing even for a business that picks blue.
- The system already has a non-colour vocabulary for exactly this:
  `docs/dashboard-skeletons.md` uses **hollow versus solid** to mean "ahead"
  versus "landed". A third form for "cancelled" is a smaller invention than a
  new colour.
- **Rotating `--bad` away from red is the option to be most careful with.**
  Red-for-error is a stronger and more universal convention than any tenant's
  brand colour, and the system has exactly one warm value on purpose. Moving it
  to keep a tenant's red trades a convention every user knows for one only this
  product knows.

The hue-family idea he raised is sound and is the natural place for the
collision check to live: classify the accent's hue, and when it lands in the
same family as `--bad`, that is the signal to switch the *status* treatment to
its non-colour form. `lib/theme.js` already converts to HSL (`rgbToHsl`) and is
the only file allowed to compute colour, so the family function belongs there
and costs almost nothing.

`scripts/accent-sweep.mjs` measures contrast for the current presets and should
grow to cover whatever list replaces them.

---

## Calendar

- **W1 — The whole box should be clickable.** Clicking a date opens a panel
  with "Block this day", "Set hours" and "Drop-off only"; he wants to click
  **anywhere in that box** to open it rather than aiming at the small button.
  *"you should be able to click anywhere in that box to open it up instead of
  having to click that specific little button."*
- **W2 — Block a RANGE of days, not one.** *"there should be an option to
  block multiple days in a row"* — modelled on the "until" control that
  drop-off only already has.
- **W3 — Possibly the same for Set hours.** *"the set hours looks good. And
  maybe we [want] to do the same for the set hours as this for just a short
  time."* Reads as: apply hours across a date range too. Lower confidence than
  W2 — confirm the shape before building.
- **W4 — Drop-off only should follow what the detailer offers.** Today it is a
  fixed control. He wants a detailer to be able to say a given day is
  drop-off-only **or mobile-only**, and the button to adapt to what they chose
  in settings. *"that button should depend on what customers choose… and that
  button just adapts to what you choose in the setting too."* (He says
  "customers"; from context he means the detailer's own setting.)
- **W5 — Desktop calendar fills the screen and still scrolls.** See W23.

## Money

- **W6 — Time ranges.** Only month-by-month today. He wants week, month, six
  months, year and lifetime, probably behind a dropdown, *"whatever is the
  standard online for the different amount of ranges."* No custom invention
  wanted — match the convention.

## Clients

- **W7 — DONE 2026-08-31.** Reproduced and provable against the tokens, exactly
  as this note predicted: `.grid2` put 8px between Visits and Total spent, and
  the Last visit card was a bare sibling with **no flow container at all**, so
  the gap was 0. Fixed at the cause rather than with a margin — the three are
  an enumeration, so they are now a ruled `.facts` list with no boxes (the
  composition rule's own answer, and the Clients tab's own skeleton), and the
  sheet's four blocks flow through `.group` at 28. Closes W8 in the same edit.
- **W7 — On mobile, a client's detail boxes touch each other.** The history /
  bookings boxes touch; **Visits, Total spent and Last visit all touch.** This
  is a spacing bug against the system's own rule (related ≤8px, unrelated
  ≥28px — `theme.css` § SPACE), so it should be checkable against the tokens.
- **W8 — DONE 2026-08-31**, by deleting the boxes. Three cards spending 18px of
  padding each on a two-line stat became three ruled rows; see W7.
- **W8 — Those boxes are oversized for their content.** *"the boxes that hold
  the content, at least for the visits, total spent and last visit, are a
  little big for the content that's inside of it."*

## More / settings screens

Overall: *"on the more page, everything looks pretty good."* Team: *"the
team's good."* Gallery: *"looks pretty normal."*

- **W9 — Services may need more per-service settings.** He listed what exists
  (name, description, price, duration, protection, bigger vehicles, add-on) and
  was unsure rather than dissatisfied: *"I don't know how detailers usually use
  it."* **This is a research item, not a build item** — pair it with W17.
- **W10 — Add-ons need grouping and/or reordering.** *"if they could add, like,
  groups maybe, so that way not everything is kinda just thrown in there at the
  same time. Or maybe you could reorder stuff."*
- **W11 — DONE 2026-08-31.** Same cause as W7 and worse: EVERY child of the
  promo card was a bare sibling — both field rows, the checkbox, the button and
  every existing code — so the whole card was one undivided block. One
  `.thoughts` container fixed all of it. **A second defect was found in the
  same box and fixed:** the "one use per customer" checkbox was
  `label.field row`, and `label.field { display: block }` beats `.row`, so the
  box sat on its own line above an uppercase field label instead of beside a
  sentence.
- **W11 — Promo codes: boxes touching each other.** Same class as W7.
- **W12 — DONE 2026-08-31, reproduced.** At 392 three of the six chips —
  The time, The address, The total — sat 66px, 183px and 278px past the right
  edge. `.chiprow` is a horizontal scroller with `scrollbar-width: none`, so
  nothing said they were there. That scroller is RIGHT for Calendar, where the
  chips are a range you move along; it is wrong here, where they are an
  unordered palette you pick FROM. A `.chiprow.wrap` modifier; all six visible.
- **W12 — Message templates: the token chips cut off.** The buttons that insert
  "their name", "your business", "the date" — **"the date" is cut off to the
  right.** Emulator caveat applies.
- **W13 — DONE 2026-08-31, and it was NOT the emulator.** Measured at 392:
  the day name, two time fields and the Close button want **438px inside a
  318px card**, because Chromium will not take `input[type=time]` below 138px
  with a 12-hour display, a clock icon and the figure face on it. Nothing in
  that row could shrink. The times now take their own line below the day name
  on a phone, at FULL height instead of the 38px they had been squeezed to —
  which also puts them back over the 46px tap floor — and from 560px it is one
  line again, exactly as desktop already had it.
- **W13 — Hours & days off: the time fields cut off to the right.** Emulator
  caveat applies; he explicitly wondered if this was a Windows emulator thing.
- **W14 — DONE 2026-08-31, and this is the one the caveat nearly closed
  wrongly.** It does not reproduce in a headless browser, because `Share` only
  renders where `navigator.share` exists — two buttons instead of three. Chrome
  on Windows HAS it, and so does every real phone. With it stubbed in, Open
  ended at 416px on a 392px screen: **24px off, exactly as he said.** Three
  `.btn`s in a `.row` cannot shrink below their own labels. Share is the
  primary and now takes its own full-width line; Copy and Open share a
  `.btnrow` below it. Clean at 392, 360 and 320.
- **W14 — Your booking page: the "Open" button stretches off screen.** The
  Copy / Open pair below the booking URL.
- **W15 — ANSWERED 2026-08-31 by doing the sweep this note asked for.** Every
  screen was walked at 392 with a probe reporting any element past the viewport
  or scrolling inside itself. It found exactly one screen he had not named:
  **Team** — each member's Owner/Staff control and its remove button sat 60px
  past the right edge, and the email broke mid-word to make room. That is the
  best answer available, with one honest caveat: he said *"the team's good"*,
  so he may never have scrolled to the member rows, or W15 may be something
  else his emulator alone showed. **After the fixes the sweep is clean at 392
  AND at 360, on every dashboard screen and on the booking page.** At 320 five
  things still clip — listed in roadmap 2.9, and none of them is a width he was
  looking at.
- **W15 — One more clipped thing he could not find again.** *"There's another
  place where some stuff was cutting off, but I can't find it."* Recorded so it
  is not lost; a 392px sweep of every screen should turn it up if it is real.

## Booking widget (the customer-facing page)

- **W16 — THE GENERAL RULE: every step should fit without scrolling.** *"a good
  general rule is that everything should be able to fit without having to
  scroll anywhere. Each step, you shouldn't have to scroll down or up."* He
  repeated this for step 1, step 2, the time picker and the review step, and
  again for desktop. **Treat this as the organising principle for the whole
  booking redesign, not as one bug.** Note it will fight W17 (estimated time)
  and W20 (sticky back button) — he anticipated that himself.
- **W17 — Add an estimated TIME next to the estimated total.** He likes the
  estimated total.
- **W18 — Step 1 spacing reads uneven.** *"the titles are really close to it,
  but everything else is spread out. So it kinda looks uneven, and you kinda
  have to scroll to look at all of them."* Same note for Small / Medium /
  Large: *"spaced out a good amount."*
- **W19 — Add-ons get their own step**, in the same format as the services
  step.
- **W20 — Back button beside Continue, stuck to the page** rather than at the
  bottom of a scroll — but he immediately doubted it against W17: *"I might
  [be wrong] if we do an estimated time. Figure out what it looks best."*
  **His doubt is on the record; the call is ours.**
- **W21 — A way to see a service's FULL details.** This is his own business
  practice: he lists everything included in a package. He does not want that as
  a giant description block — he wants a small control on the service box (*"a
  little eye"* or similar) that opens the full contents. **This is the item
  most likely to change the services data model**, so it belongs with W9/W10.
- **W22 — Water and electricity must be per-detailer.** The *"I can provide
  access to water and an outlet"* question was added **for him specifically**,
  because he does not carry a water tank or generator; he says most detailers
  do. He wants: the question to be optional per detailer, an option to ask
  about **electricity only**, and an option that **blocks the booking** if the
  customer cannot supply what that detailer needs. *"there should be more
  customization for that because obviously there's a lot of different scenarios."*
- **W23 — Desktop scrolls everywhere.** *"a lot of it, you have to scroll for
  most pages"*, including the review step and the calendar. W16 applies to
  desktop too, and 1920 is his own monitor.
- **W24 — DONE 2026-08-31, and he was right about a real bug in a place
  nobody had looked.** It was not the dashboard: `.chip` and `.choice` there
  were already scoped away from their selected state. It was
  `.bk-card.selectable:hover` on the CUSTOMER-facing booking page, which had no
  `:not(.selected)` and outranks `.bk-card.selected` — so hovering the service
  you had already chosen replaced its accent ring and its lift with a plain
  grey hairline. Measured before: `rgb(51,59,64) 1px inset`, no lift. After:
  the ring goes 1px → 2px and the lift deepens.
  His rule became **law 15** of the design system, and applying it turned up a
  live contrast defect underneath — see DECISIONS.md, "The accent-text ground,
  one surface further in".
- **W24 — Hovering a SELECTED option darkens it, which reads as unselecting.**
  His clearest interaction note, and worth quoting in full: *"when you hover
  over something that's already selected, it kinda goes to like a darker color,
  and it just kinda feels weird because it almost feels like you're unselecting
  it when you're not… you can have a hover on something that's not selected, it
  kinda brightens up the darkness, but it does that same effect when you hover
  over something that is selected, and it makes it darker, which is the
  opposite of kinda what you'd want for something selected."* **A selected
  element's hover must move in the same direction as its selected state, not
  against it.** He also said the accent-driven selection colour itself is good.
- **W25 — Step 1 lets you pick overlapping packages.** He could select "Full
  Detail" and "Interior" together and found it confusing. **He flagged the
  content as placeholder** (*"obviously those are just example things"*), so
  the question is whether packages should be mutually exclusive, not whether
  the demo data is wrong.
- **W26 — Time slots on mobile do not all fit.** Instance of W16.
- **W27 — "How do I reach you" is essentially complete** — but research whether
  other detailers need fields he does not.

## The research thread running through this

W9, W22 and W27 are all the same underlying gap: **the product is modelled on
one detailing business — his — and he knows it.** He asked more than once for
research into how other detailers work. That is a distinct piece of work from
any of the UI items and probably should be its own roadmap entry, because
several build decisions above depend on its answer.
