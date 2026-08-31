# Owner walkthrough — 2026-08-30

The owner went through the whole product himself, on a phone emulator and on
desktop, and talked through it as he went. This file is his words and what
they mean. **It is the primary record.**

**STATUS, updated 2026-08-31 (roadmaps 2.6 and 2.7).** The clipping-and-spacing
half is DONE — W7, W8, W11, W12, W13, W14, W15 and W24 are closed. **The
features half is now done too, except the five that wait on research:** W1, W2,
W3, W4, W5, W6, W16, W17, W18, W19, W20, W23 and W26 are closed in roadmap 2.7,
and each carries what was measured below.

**W9, W10, W21, W22 and W25 are ANSWERED BUT NOT BUILT, as of 2026-08-31.**
All five were questions about what a detailer's catalogue and constraints
actually look like — what fields a service needs, whether add-ons group,
whether packages exclude each other, what on-site resources matter — and
roadmap 2.8 went and looked. **The answers are in
`docs/detailer-research-2026-08-31.md`**, item by item, with the five real
detailers' menus they came from; each item below carries a one-line summary.
W27 is the same thread and is answered there too.

**The build is blocked on four owner decisions**, listed at the end of that
file: single-select services, three vehicle sizes or five, from-prices, and
whether to ask how dirty the car is. Three of the four change the migration, so
nothing is built until he answers. **One ordering constraint is not optional
and is not his call: the W21 disclosure ships before or with any editor for
`services.features`**, because that field renders inline on the booking card
today and an editor without a disclosure arms a W16 overflow for every tenant
who uses it.

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

- **W1 — DONE 2026-08-31, and the roadmap pointed at the wrong box.** The
  roadmap read this as the calendar CELL; the cell has been a whole-box
  `<button>` since the day sheet was built, so read that way it was already
  finished. Reading his sentence in order settles it: he names the panel first
  ("clicking a date opens a panel with Block this day, Set hours and Drop-off
  only") and only then says "that box". **The box is one of the three cards
  inside that panel**, and "that specific little button" is the Set / switch on
  its right. All three now open and close from anywhere on the card.
  **One thing a whole-card tap deliberately will NOT do is undo** — clearing a
  blockout or a restriction stays on its own explicit control, because a 300px
  target that silently unblocks a day is a worse bug than the one this fixes.
- **W1 — The whole box should be clickable.** Clicking a date opens a panel
  with "Block this day", "Set hours" and "Drop-off only"; he wants to click
  **anywhere in that box** to open it rather than aiming at the small button.
  *"you should be able to click anywhere in that box to open it up instead of
  having to click that specific little button."*
- **W2 — DONE 2026-08-31.** A "Through (inclusive)" date on the blockout
  editor, defaulting to the day you opened, so the one-day case costs nobody an
  extra decision. `blockout_dates` already had `start_date` and `end_date` —
  the sheet was writing the same value into both.
- **W2 — Block a RANGE of days, not one.** *"there should be an option to
  block multiple days in a row"* — modelled on the "until" control that
  drop-off only already has.
- **W3 — DONE 2026-08-31, and the shape he was unsure about is the one the
  other two cards already had.** The same "Through (inclusive)" field.
  `booking_hours_overrides` is keyed one row PER DATE (`unique (business_id,
  date)`), so a range writes N rows rather than growing the table a second end.
  That is the table doing what it was built for: an override is a fact about
  one day, and clearing one day later must not disturb the others. The write is
  capped at 366 days, because the field is a free date input and a mistyped
  year would otherwise ask for 36,000 upserts.
- **W3 — Possibly the same for Set hours.** *"the set hours looks good. And
  maybe we [want] to do the same for the set hours as this for just a short
  time."* Reads as: apply hours across a date range too. Lower confidence than
  W2 — confirm the shape before building.
- **W4 — DONE 2026-08-31, and it closed a LIVE HOLE underneath itself.** Three
  things came out of his sentence. **(1)** The card disappears when the business
  only offers one way of working — a mobile-only detailer restricting a day to
  drop-off is offering something they do not do. **(2)** It goes both ways now:
  `dropoff_only_periods.mode` is `dropoff` or `mobile`, defaulting to what every
  existing row already means, because he needs to close mobile when the van is
  out and a detailer with a unit needs to close DROP-OFF when the yard is.
  **(3) It actually blocks.** The table reached the customer as a NOTE on the
  booking page and nothing else — nothing on the way in ever read it, so a
  customer could read "this day is drop-off only" and book a mobile job anyway,
  and the detailer found out on the day. The guard went into
  `_shared/slotValidation.ts`, where create-, reschedule- and update-booking all
  meet, because all three move a date with the same freedom. Proved in both
  directions in `tests/booking-engine.test.mjs` test 12.
- **W4 — Drop-off only should follow what the detailer offers.** Today it is a
  fixed control. He wants a detailer to be able to say a given day is
  drop-off-only **or mobile-only**, and the button to adapt to what they chose
  in settings. *"that button should depend on what customers choose… and that
  button just adapts to what you choose in the setting too."* (He says
  "customers"; from context he means the detailer's own setting.)
- **W5 — DONE 2026-08-31, and it was one missing line.** The booking page's
  date cells were `aspect-ratio: 1` with no cap, so on the 600px column they
  became 81px squares and the month became a 516px block — the tallest screen
  in the flow. A date cell holds two digits; past ~52px tall it is holding air.
  `max-height: 52px` only engages where the ratio would exceed it, so a phone is
  untouched and the cell stays over the 46px tap floor. Step 5 went from 126px
  past the bottom at 1440x900 to 50px of room to spare.
- **W5 — Desktop calendar fills the screen and still scrolls.** See W23.

## Money

- **W6 — DONE 2026-08-31.** Week / month / 6 months / year / lifetime as chips,
  with the arrows stepping through whichever length is chosen — two questions,
  two controls. The conventions are borrowed rather than invented, which is what
  he asked for, and they live in `app/src/lib/periods.js`: the comparison is
  always the SAME period one step back (this week vs last week), six months and
  a year ROLL off the current month rather than being calendar halves or a
  fiscal year, the week starts Sunday like both calendars in the product, and
  lifetime does not step because there is only one of it.
  **Two defects were found by looking**, both invisible while the screen could
  only ever show a month: a net-negative period printed `$-189.00` (fixed in
  `money()`, so every caller gets it), and the bar chart plotted `|value|`, so a
  $189 LOSS drew the identical bar to a $189 win. Negative bars are the fixed
  `--bad` red now — law 11b, money moving is meaning — carrying selection the
  same way the positive ones do.
  **One thing lifetime got wrong first, worth not repeating:** it was anchored
  to `businesses.created_at` and read $0.00 on a business with three years of
  takings behind it. The row is created when the detailer signs up; their
  history can be older, because bookings get seeded, imported and back-dated.
  It reaches back ten years now, the same as the Calendar's "Everything".
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

- **W9 — Services may need more per-service settings.**
  **BUILT 2026-08-31, roadmap 2.8b.** From-prices are a switch per service in
  Catalog and print "from $650" on the booking card and the review receipt;
  vehicle sizes are the detailer’s own ordered list, edited in the same screen,
  and every service prices each of them. `bookings.vehicle_size_label` holds
  the snapshot. **The measured ceiling below moved from six to FOUR** — the
  research took it before W27’s condition question landed on the same step,
  and that question costs 120px. Sizes 4: fits with 39px (392x844) and 23px
  (1440x900). Sizes 5: over by 40px and 66px. So four cards, and a drop-down
  from five — which is exactly where the design system already draws the line
  between a segmented control and a list, so nothing had to be argued.

  His original note: he listed what exists
  (name, description, price, duration, protection, bigger vehicles, add-on) and
  was unsure rather than dissatisfied: *"I don't know how detailers usually use
  it."* **This is a research item, not a build item** — pair it with W17.
  **ANSWERED 2026-08-31.** Five real menus, five findings. All five publish a
  FROM-price or a range rather than a firm one, because condition decides the
  hours — that is one boolean, `services.price_is_from`, and it is owner
  decision 3. Three vehicle classes is below the trade norm of five, and it is
  the only schema-blocking part because `bookings.vehicle_size` is a CHECK
  constraint — owner decision 2. The inclusion list already exists as
  `services.features` and nothing edits it. Two real gaps are NOT ours yet: a
  service that cannot be done mobile (coatings need a garage — we model
  mobile-vs-drop-off per business and per date, never per service), and
  cure/hold time, which the single `duration_minutes` cannot express.
  **HE ANSWERED both, 2026-08-31: from-prices yes; vehicle sizes CUSTOMISABLE
  BY THE DETAILER**, not the fixed five recommended — better evidenced than the
  recommendation was, since the five menus showed twelve classes at one and
  five at another, a range rather than a norm. `business_settings.vehicle_sizes`
  jsonb, and **the size's LABEL must be snapshot on the booking**, as
  `vehicle_size_fee` already is, or a renamed size rewrites the record of jobs
  already done. **Measured ceiling: step 3 has 238px spare and a size card
  costs 79px, so six sizes fit a phone and the seventh does not** — past six it
  needs a denser control than cards, and a dropdown is permitted above four
  options.
- **W10 — Add-ons need grouping and/or reordering.**
  **BUILT 2026-08-31, roadmap 2.8b.** Up/down arrows on every category, service
  and add-on row in Catalog, writing `sort_order`; the whole list is renumbered
  on each move rather than two values swapped, because every row a detailer has
  ever added carries the column default of 0 and a swap on that list does
  nothing. Activate/deactivate moved into the editor sheet to make room — a
  392px row cannot hold a worded button and two arrows, measured.

  His original words: *"if they could add, like,
  groups maybe, so that way not everything is kinda just thrown in there at the
  same time. Or maybe you could reorder stuff."*
  **ANSWERED 2026-08-31: reordering, not groups, and no migration.** Real
  add-on lists are 3, 6, 7 and 9 items and not one of the five menus studied
  groups them. `add_ons.sort_order` exists, the Catalog query already orders by
  it, and no UI writes it — so this is a Catalog screen job. Services have the
  same unused column and the same gap. The asymmetry with services is correct
  rather than an oversight: services DO group in the wild, which is why
  `group_label` is on services and should not be added to add-ons.
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

- **W16 — MET 2026-08-31 at all four verification sizes, and it needed an
  instrument before it needed a fix.** `sweep-widths.mjs` answers "is anything
  off the RIGHT edge"; nothing answered "is anything off the BOTTOM", which is a
  different question with a different fix — the right edge is one element too
  wide, the bottom edge is the whole step's budget.
  **`node scripts/sweep-booking-steps.mjs`** walks the flow at 1920x1080,
  1440x900, 768x1024 and 392x844, fills it in as a customer would (a service, a
  size, an address, a day, a time), and reports the overflow AND THE SPARE ROOM
  per step. It exits non-zero while anything overflows, so it is the definition
  of done for this item. `--lite` does the `?lite=1` path, `--shots=DIR` saves
  the PNGs.

  **Baseline: 8 of 12 step-views overflowed, worst 222px — 26% of a phone
  screen.** What closed it, biggest first:
  - **W19 gave add-ons their own step**, taking a 158px ruled checklist off the
    worst step in the flow.
  - **W20 moved Back into the price bar**, worth 74px on every step but the
    first (48px button plus the 26px section gap above it).
  - **W18's flow container** took the 26px SECTION gap out from between cards
    that belong to one menu.
  - **W5's cell cap** took 174px off the month block on a wide column.
  - The step head's rail and words share a line (15px), a heading stopped being
    a section peer of what it heads (10px), the tall masthead is gated on
    HEIGHT as well as width (38px on a short desktop), and the tenant's tagline
    is hidden on a PHONE only (23px). Hiding the tagline on a laptop too was
    tried and rejected: it is not needed there, and margin bought by
    suppressing a tenant's own line is spent the moment they add a service.

  **THE HONEST CEILING, and it is worth knowing before the next session
  re-measures.** Steps 2–7 are ours and have 90–500px to spare. **Step 1 is
  not: its height is the tenant's catalogue.** With the demo's four services it
  has 18px of room on a phone — a FIFTH service breaks it. W16 cannot be true
  in the absolute for a list whose length the detailer controls, and the lever
  that raises the ceiling is W21, the "full details" disclosure that folds a
  service's contents out of the card. That is one of the five waiting on 2.8,
  which is a good reason it is sequenced there.
- **W16 — THE GENERAL RULE: every step should fit without scrolling.** *"a good
  general rule is that everything should be able to fit without having to
  scroll anywhere. Each step, you shouldn't have to scroll down or up."* He
  repeated this for step 1, step 2, the time picker and the review step, and
  again for desktop. **Treat this as the organising principle for the whole
  booking redesign, not as one bug.** Note it will fight W17 (estimated time)
  and W20 (sticky back button) — he anticipated that himself.
- **W17 — DONE 2026-08-31.** It rides the price bar's EYEBROW — "Estimated
  total · 3 hrs" — rather than sitting beside the figure. The figure is the
  thing being decided on and it is the one mono number in the bar; a second
  number next to it makes two leads. The qualifier line is where a qualifier
  goes. `duration()` in `lib/format.js` is one implementation now instead of
  three: the service card said "2h 30m", the review step said "about 2.5
  hours", and the bar would have invented a fourth. Two and a half hours is
  never "2.5" out loud.
- **W17 — Add an estimated TIME next to the estimated total.** He likes the
  estimated total.
- **W18 — DONE 2026-08-31, and it was a structural bug, not a taste note.**
  Both halves of what he said were literally true and had ONE cause: each
  service GROUP was a direct flex child of `.bk-wrap`, so the 26px SECTION gap
  fell between cards belonging to one menu ("everything else is spread out"),
  while the group's own label sat hard against its first card with no gap at all
  ("the titles are really close to it"). Exactly backwards — the loosest space
  in the step was inside its tightest relationship. Same cause as W7 and W11 in
  roadmap 2.6, a missing flow container, and the same fix: `.bk-choices`, 8px
  between cards, and the label gets the air the cards were wasting.
- **W18 — Step 1 spacing reads uneven.** *"the titles are really close to it,
  but everything else is spread out. So it kinda looks uneven, and you kinda
  have to scroll to look at all of them."* Same note for Small / Medium /
  Large: *"spaced out a good amount."*
- **W19 — DONE 2026-08-31.** Its own step, in the services step's own card
  shape, and it only exists where the business has add-ons — otherwise "Step 3
  of 7" would be a lie for every detailer without any. The ruled-checklist shape
  it used to have was not wrong: the comment there gave a real reason, that the
  boxes on the vehicle step were the sizes you choose BETWEEN, so a second set
  of boxes would have made two competing groups of one shape. That reason
  belonged to sharing a step. Alone, there is nothing to compete with.
- **W19 — Add-ons get their own step**, in the same format as the services
  step.
- **W20 — DONE 2026-08-31, and the call was ours because he removed himself
  from it.** Back is in the price bar, icon-only, on the far left. Measured, it
  is not close: as a block at the foot of the column it cost 74px on every step
  but the first, and W16 — which he stated as the general rule — is what this
  whole item is organised around. It also reaches, which the old one did not: at
  the bottom of a scroll, Back was the one control you had to scroll to find.
  His doubt was that W17 would crowd the bar; it does not, because the estimated
  time went on the eyebrow rather than beside the figure. Icon-only because a
  worded Back beside Continue reads as two things to press.
- **W20 — Back button beside Continue, stuck to the page** rather than at the
  bottom of a scroll — but he immediately doubted it against W17: *"I might
  [be wrong] if we do an estimated time. Figure out what it looks best."*
  **His doubt is on the record; the call is ours.**
- **W21 — A way to see a service's FULL details.**
  **BUILT 2026-08-31, roadmap 2.8b, and it shipped FIRST as the research
  demanded.** His eye sits on the name row, so the control itself costs no
  height; the description and the inclusion list open under it as a zero-height
  grid row that animates both ways and is out of the accessibility tree while
  shut. The inline five-item cap is gone. MEASURED against the reshaped demo
  (two categories of three, his own shape): card 74px on a phone exactly as
  predicted, step 1 at **47px spare on 392x844** and **10px spare on 1440x900**.
  Redundant copy came out with it — where every category says "choose one",
  the step’s intro line was repeating them for 19px on a desktop and 38px on a
  phone, and without it 1440x900 went from 19px OVER to 10px spare.
  **The binding screen for step 1 is no longer the phone. It is 1440x900**, the
  short desktop, where a card costs 84px rather than 74px because the card
  padding clamps up. Seven services in two categories is the next thing to
  break, and it breaks there first.
  **Verified by keyboard and by the accessibility tree, not only by looking:**
  the face and the eye are consecutive tab stops, Enter works on both, the
  closed panel’s words are NOT reachable (`visibility: hidden` rides the
  animation, so clipped text is never announced), the open panel’s words are,
  and `aria-expanded` follows. That half matters here because the card stopped
  being one `role="button"` div and became a plain box holding two real
  buttons — see DECISIONS.md → “Roadmap 2.8b”.

  His original note: this is his own business
  practice: he lists everything included in a package. He does not want that as
  a giant description block — he wants a small control on the service box (*"a
  little eye"* or similar) that opens the full contents. **This is the item
  most likely to change the services data model**, so it belongs with W9/W10.
  **ANSWERED 2026-08-31, and it changes NOTHING in the data model.**
  `services.features` is already a jsonb array and already the right shape; it
  just has no editor. His practice is the trade's — all five package menus
  publish itemised inclusion lists, and they run 5 to 10+ bullets each.
  **And there is a live trap here.** `StepServices.jsx` renders `features`
  inline (capped at five), so the field is harmless only because nothing writes
  it. The disclosure must ship before or with the editor, never after, or a
  realistic catalogue — 5–9 services at 5–10 inclusions — turns step 1's 18px
  of phone headroom into several screens. This is why W21 is the lever named
  for step 1's ceiling: it is the only item that makes a card's height
  independent of how much the detailer wrote.
  **MEASURED 2026-08-31, after his answer on categories, and it changes what
  the disclosure holds.** At 392x844 against the running app: a service card is
  97px, a category heading 17px, the gap inside a category 8px and between
  categories 26px — and **his own menu, two categories with three services
  each, overflows step 1 by 119px** (the demo's four services have 18px spare).
  **Folding the DESCRIPTION off the face of the card takes it to 74px, and that
  same menu from 119px over to 18px spare.** So the disclosure holds the
  description as well as the inclusion list; the face of a card is its name,
  its price and its length, and nothing else in the step has to move. W21 also
  stops being a sibling of the categories work and becomes its prerequisite —
  it is the only item that takes height OFF step 1, and every other one adds.
- **W22 — Water and electricity must be per-detailer.**
  **BUILT 2026-08-31, roadmap 2.8b.** Two settings, three states each, in
  Booking rules: "I bring it" / "Just ask" / "Must have". The booking page
  draws nothing for the first, one question for the second, and for the third
  states the consequence BEFORE the answer and disables Continue.
  **The block itself is in `_shared/slotValidation.ts`** next to W4’s, and
  `tests/booking-engine.test.mjs` test 14 proves it on the way in: required +
  no = 409, required + yes = 200, merely asked + no = 200, and drop-off is
  never blocked because the customer supplies nothing there.

  His original note. The *"I can provide
  access to water and an outlet"* question was added **for him specifically**,
  because he does not carry a water tank or generator; he says most detailers
  do. He wants: the question to be optional per detailer, an option to ask
  about **electricity only**, and an option that **blocks the booking** if the
  customer cannot supply what that detailer needs. *"there should be more
  customization for that because obviously there's a lot of different scenarios."*
  **ANSWERED 2026-08-31, and HIS PREMISE IS BACKWARDS — worth telling him.**
  He added the question believing he is the unusual one. Most working mobile
  detailers use the customer's tap and the customer's outlet and ask about it
  when booking; carrying a tank and a generator is the minority setup, sold as
  a premium differentiator by the businesses that have it. So the question he
  built for himself is the standard question, and the customisation needed is
  smaller than he feared. **What actually varies is which resource and what
  happens on "no"** — and water and power are independent, which one boolean
  cannot express (a coating specialist needs power and no hose; a rinseless
  operator needs neither). Shape: `water_requirement` and `power_requirement`
  on `business_settings`, each `not_needed` / `ask` / `required`, defaulting to
  `ask` so nothing changes on migration day; `bookings.has_water_electric`
  splits into `has_water` and `has_power`. **The block goes in
  `_shared/slotValidation.ts`**, where create-, reschedule- and update-booking
  meet — a `required` resource enforced only in React is W4's hole again.
- **W23 — DONE 2026-08-31, and the only screen that failed at 1440x900 after
  the phone and the 1920 monitor were both clean was the masthead's fault.** The
  header grows at `min-width: 1000px`, and its own comment says why: "a 60px bar
  above a centred column leaves the top third of a 1920 screen empty." That
  reasoning is about HEIGHT. A 1440x900 laptop is 180px shorter than the screen
  the masthead was drawn for, and spending 61 of those px on a bigger bar is
  what put step 1 55px past the bottom there while 1920 had 125px to spare. The
  gate is `(min-width: 1000px) and (min-height: 950px)` now — the rule saying
  what it always meant.
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
- **W25 — Step 1 lets you pick overlapping packages.**
  **BUILT 2026-08-31, roadmap 2.8b.** `service_groups` with `max_select`, a
  Categories section at the top of Catalog, a category picker on the service
  editor, and step 1 grouping by `group_id` with `group_label` as the fallback
  for a service written before the migration. Picking a second service in a
  "choose one" category SWAPS the first out rather than refusing the tap — a
  control that does nothing when pressed reads as broken — and the category
  label says "choose one" before anything is tapped, because an unexpected swap
  is the same complaint he made here.
  **The enforcement that counts is in create-booking**, not React, and
  `tests/booking-engine.test.mjs` test 13 proves it: two from a pick-one
  category is a 409 that names the category, two from a pick-any category is
  fine, and one from each — his own shape — is fine.

  His original note: he could select "Full
  Detail" and "Interior" together and found it confusing. **He flagged the
  content as placeholder** (*"obviously those are just example things"*), so
  the question is whether packages should be mutually exclusive, not whether
  the demo data is wrong.
  **ANSWERED 2026-08-31 — and HE answered it, overriding the research.** The
  research reached "one boolean on the business": four of the five real menus
  are pick-one, the fifth is wholly à la carte. **His own business is a sixth
  shape the five did not contain** — Interior, Exterior and add-ons, *"they
  could click one from each category"* — and one business-level boolean cannot
  express it, because pick-one would stop him selling an interior AND an
  exterior while pick-any brings back the overlap he complained about here.
  **So the rule lives on the CATEGORY**: a `service_groups` table with
  `max_select` per group (1 = pick one, null = pick any). That is the
  restaurant point-of-sale "modifier group", the same problem solved decades
  ago, and the trade's own menu-building advice describes the same four-section
  shape with different rules per section. **`min_select` is not being built** —
  the existing "a booking needs at least one service" rule already does it.
  **The lesson, and it is worth more than the item:** five real menus were
  enough to rule shapes IN, and not enough to rule the remaining ones OUT.
- **W26 — DONE 2026-08-31**, as an instance of W16 exactly as this note says.
  Step 5 with a day picked has 119px of room on a phone now; it had 16px of
  overflow, and 45px before a day was picked.
- **W26 — Time slots on mobile do not all fit.** Instance of W16.
- **W27 — "How do I reach you" is essentially complete**
  **BUILT 2026-08-31, roadmap 2.8b — the condition question only, as decided.**
  Four chips on the vehicle step (light / moderate / heavy / extreme), one row,
  switchable off per detailer in Booking rules. It never touches the quote and
  the step says so. **It is not free and the cost landed on someone else’s
  budget:** 120px of step 3, which took the vehicle-size card ceiling from the
  six the research measured down to four. That is the right trade — a detailer
  with five sizes gets a drop-down, a detailer with none loses nothing — but it
  is why two measured numbers in this file disagree, and the later one is real.

  His original note — but research whether
  other detailers need fields he does not.
  **ANSWERED 2026-08-31, and he was right that it is nearly complete.** Of the
  four things real booking forms collect that we do not, two are already
  covered and two are judgment calls. Parking/access notes: our "Anything we
  should know?" box covers it — a placeholder word, not an item. "How did you
  find us?": we have campaigns, visits and `referral_code_used`, a stronger
  instrument than a self-reported dropdown. Structured year/make/model: every
  real form asks for it, but nothing here would read it, and four fields of
  step height against W16 buys nothing — leave the one free-text box. **The one
  real gap is interior condition** (light / moderate / heavy / extreme), which
  is owner decision 4 and pairs with the from-price in W9.

## The research thread running through this

W9, W22 and W27 are all the same underlying gap: **the product is modelled on
one detailing business — his — and he knows it.** He asked more than once for
research into how other detailers work. That is a distinct piece of work from
any of the UI items and probably should be its own roadmap entry, because
several build decisions above depend on its answer.

**It became roadmap 2.8 and it is DONE — `docs/detailer-research-2026-08-31.md`,
2026-08-31.** Five real detailers' published menus and booking flows, one long
thread of working detailers talking to each other, three trade software
vendors. The single most useful thing it found is that **two of the five open
items were misfiled**: W10 and W21 need no migration at all, because
`add_ons.sort_order` and `services.features` already exist and nothing writes
either. The single most surprising thing is that **his W22 premise is
backwards** — he is the normal case, not the unusual one. Four decisions came
back out of it for him; they are the last section of that file before the
schema list, and the build waits on them.
