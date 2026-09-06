# Detailing Platform — session rules

Read before working. These rules survive every `/clear`; chat instructions don't.

## THE OWNER IS AWAY AND ON A PHONE — from 2026-09-05, for about three days

<!-- REMOVE THIS WHOLE SECTION when he says he is back from vacation. He asked
     for it to live here rather than in a chat message precisely so it survives
     a /clear, and to be deleted on his word rather than on a date. If a session
     starts after ~2026-09-09 and he has not said, ASK before assuming. -->

**He is reading this session on a phone, through remote desktop.** His own
words, 2026-09-05: *"I'm gonna be on mobile using remote desktop to view
Claude… because of that I can't view the local host browser."*

**SO: NEVER END A MESSAGE BY ASKING HIM TO GO AND LOOK AT SOMETHING.** *"Open
`localhost:5173`"*, *"have a look at the billing screen"* and *"check
`email-preview/index.html`"* are all dead ends for the next three days — the
dev server is on THIS machine and he is not at it. A session that verifies
something and then describes it in prose has done half the job.

**PUT THE PICTURE IN FRONT OF HIM. `SendUserFile` reaches his phone.**

| To show him | Do this |
|---|---|
| Any dashboard screen | `OUT=shots-<item> node scripts/shoot-dashboard.mjs --tab <tab>` or `--gear "<Row>"` / `--more "<Row>"`, then `SendUserFile` the PNGs |
| The booking page's steps | `node scripts/sweep-booking-steps.mjs --shots=shots-<item>`, then send |
| An email | `node scripts/render-emails.mjs`, then send the individual `email-preview/*.html` — **the single files, not `index.html`**, which is only an index of links to files he does not have |
| A long report or a plan | An **Artifact** — it is a URL, so it opens on a phone |

**A FULL-PAGE SHOT DOES NOT REACH THE PHONE — measured 2026-09-05.** `SendUserFile` returned 400 on a 392x15,965 PNG (1.9 MiB) AND on the same frame as a 0.6 MiB JPEG, then delivered four 392x844 crops of 40 KB each. The limit is the image's HEIGHT, not its bytes. So for him: viewport-sized crops down the page (a one-off Playwright script scrolling to 0 / 20 / 45 / 70% is enough), never the stitched full-page file the sweeps write.

**SEND THE PNGs, NOT A DESCRIPTION OF THEM.** Two or three that answer the
question, at **392** first because that is the shape he is holding, and 1440
only when the desk layout is the point. He can see a screenshot; he cannot see
your `computer{action:"screenshot"}`, which goes to the model and not to him.

**VERIFICATION IS UNCHANGED.** Everything still runs here — the sweeps, the
suites, the seeds, `e2e-booking`. What changed is only how the RESULT is shown.
Do not skip a check because he cannot watch it, and do not ask him to run one.

**AND HE CANNOT CLICK THROUGH A DECISION EITHER**, so a question has to be
answerable in a sentence typed with one thumb. Give him the recommendation
first and the reasoning after it, per the rule below.

## Talking to the owner

The owner is not a coder. Explain things in plain language with everyday
analogies; define any technical term the first time it appears. Technical
detail belongs in files — chat messages must be understandable to a
non-programmer.

**Never hand the owner a decision without what they need to make it — in
about one paragraph.** "Your call", "owner decision" and "flagged for you"
are unfinished sentences. In a few plain sentences: what the thing actually
is (assume zero knowledge, use an analogy), what happens if they do it and
what happens if they don't, and your own recommendation with the reason.
Then stop. If it runs past a paragraph or two you are explaining the whole
system instead of the one choice — cut it back. Naming a risk is not
explaining it; if they still have to ask "so should I?", it failed.

## Ground rules

- Work on branch `claude/superbase-access-anj1h7`. **Never merge to `main` on
  your own initiative — ask.** `main` auto-deploys to production
  (detailingplatform.com), and that is now confirmed by observation rather
  than inherited from a note: a push to `main` on 2026-08-30 republished the
  live site by itself, with no upload and no dashboard visit. **A push to
  `main` IS a publish** — there is no second step to forget.
  The owner can say yes, and did on 2026-08-30: the redesign through roadmap
  2.2 is live, and `main`, the branch and this machine are the same commit.
  **HE MADE IT A STANDING PERMISSION ON 2026-09-04** — *"yes we can publish
  if we need to"* — so the question a session must answer is no longer "may
  I" but "is it needed", and it must say WHY in the same breath. He said two
  other things in that sentence that decide most of those calls: **there are
  no detailers on the product at all**, so a live defect harms nobody today,
  and **he is not going public until the build is finished** (his second time
  saying so). Roadmap 2.5 found a booking-page crash that had been live since
  2026-08-31 and still did NOT merge, because nothing needed it.
  So "main is months behind" is no longer true, and a session that finds them
  apart should say so rather than assume it is normal. See DECISIONS.md, "The
  owner put the redesign on `main` and published it".
  **AND THEY ARE APART — MEASURED 2026-09-05, `git rev-list --count
  origin/main..HEAD` = 93, with NOTHING on `main` that is not here.** The
  sentence above was written on 2026-08-30 when they were the same commit and
  has been quietly untrue for most of a week, which is the thing it warns
  about happening to itself. **What that means concretely: everything from
  roadmap 2.5 onward is on the branch only** — the rebuilt emails, plans,
  custom roles, request mode, campaigns, the payment handles and now the
  pricing page — **and `main` still carries the `StepLocation` white-screen
  crash 2.5 found**, live since 2026-08-31 on the booking page of any tenant
  offering ONE of mobile and drop-off. **Still not merged, and still for the
  same reason: there are no detailers on the product, so nothing needs it.**
  Do not treat the number as a defect; do MEASURE it and say it, because a
  session that assumes parity will publish one file and break the two it
  depends on.
- The owner's live business site (Supabase project `adtlnvihwrcqcasqcjwd`,
  Netlify, Resend domain andrewsdetail.com) takes real customers' money.
  Reads are allowed; writes only with the owner's explicit go-ahead for that
  specific action.
  **THE REPO IS `random12one0/carwebitebooking`, NOT `carwashweb` — corrected
  2026-09-03 by reading both.** This file said `carwashweb` until then;
  that repo is real, private, and a **99-file Emergent scaffold last pushed
  2026-02-01** with no Supabase functions, no invoice code and no promo codes
  in it. **A session that follows the old name finds a shell and concludes
  there is nothing to look at.** `carwebitebooking` has
  `supabase/functions/send-invoice/index.ts` and
  `frontend/src/admin/modals/FinalizePaymentModal.jsx`, and matches the
  `reference/` snapshot in this repo. Read it with `gh api`; there is no
  local clone.
- Migrations are append-only. Never edit an existing one.
- Consequential writes go through edge functions, not the browser client.
- Never commit `app/.env.production`, or any credential.
- `reference/` is read-only — the old site kept as canon.

## Design

- **The system is `docs/design-system.md` — "The Thread"** (written
  2026-08-30, roadmap 1.5). Read it before touching anything a person looks
  at. The reference rendering is `docs/design-directions/5-the-thread.html`,
  the page the owner approved; **where the document and that page disagree,
  the page is right.** See `DESIGN.md`.
- **THE THREE TENANT PAGES PASSED EVERY CHECK IN THIS REPO AND HE STILL SAID
  THEY LOOK AI — 2026-09-05: *"All 3 look very ai and not even like the vibe
  for detailing but it's fine for now."*** They clear every never-default,
  every contrast floor, 320, the console and the lite path. **So the
  anti-slop floor is a list of NEVERS and a list of nevers cannot produce a
  vibe.** §1 and the never-defaults catch the tells of a few years ago; they do
  not catch the CURRENT house style of AI design output — editorial serif,
  ruled rows, wide letter-spaced small-caps labels, generous whitespace, a
  muted "sophisticated" palette, stock photos in neat rectangles. **Two of the
  three are squarely that.**
  **"Fine for now" is a deferral: do not rebuild them, and do NOT use them as
  the taste reference for a real client's site.** The diagnosis and the three
  candidate causes are `docs/tenant-site-research-2026-09-05.md` §7. The one
  that transfers beyond this item: **three agents given one brief produce one
  family** — same section list, same content, same seams, only the paint
  varied, so three examples came out as three colourways of one page. *Varying
  the palette while fixing the skeleton does not produce variety.*
  **What unblocks it is HIS taste, not another attempt**: two or three detailer
  sites whose VIBE he likes, a sentence each — a `TASTE-NOTES.md` pass for this
  trade, which has never existed. **A fourth guess is how this item already
  burned two.**
- **NO FABLE FOR BUILDING PAGES — the owner, 2026-09-05: *"No more fable when
  making pages."*** It built the three tenant-site worlds in
  `docs/tenant-sites/` and then the booking form inside each of them, and that
  is where it stops. **Whichever model the session is already running builds
  and verifies pages from here.** The roadmap 3.1 entry's *"Fable 5.1 belongs
  here"* is spent and superseded; do not re-read it as a standing instruction.
  His earlier *"maybe using fable when it's needed"* is not a contradiction —
  it was permission for one job, and he has now closed it.
- **The skill-collision rule is BACK ON.** Appliers and auditors only —
  `impeccable`, `animate`, `ship-check`. No direction-generating skill
  (`frontend-design`, `tastemaker`, `great-design`, `scrollcraft`) runs
  against this product again unless the owner reopens the direction. The
  design system outranks any skill's opinion.
- "Raking Light" is finished as an identity and its file is gone. What
  survived it — the accessibility floors, the `lib/theme.js` colour rule,
  define-tokens-once, the composition rule, the content and copy facts — is
  listed in the new file under "§11". Backend, content, copy facts and
  accessibility floors were always kept; only the visual world changed.
- The design tests enforce the NEW rules: `tests/composition.test.mjs`
  (**74 checks — this said 66 until 2026-09-04 and had been stale since the
  last commits of 2.17, which is the fourth stale count found in this file;
  the script prints its own figure, so read that rather than this** —
  24 until 2026-08-30, 26 until roadmap 2.17 on 2026-09-03,
  which added test 8: the squircle pairing, the second column's motion, the
  calendar's travel and the content swap; 57 until the swap was rebuilt on
  2026-09-04; 61 until test 9 landed the same day with the reduced-motion fix.
  **Test 9 is the degradation rule finally getting teeth**: `.lite` is live
  rather than read once, `?lite=1` outranks the media query, and NO stylesheet
  carries a second `@media (prefers-reduced-motion)` implementation — a rule
  four files had asserted in prose and nothing had ever checked) and
  `tests/design-contrast.test.mjs`. Don't contort work to
  pass them — if a test and a real design decision collide, the system file
  gets updated first, never silently.
- Never-defaults (in addition to the design system): Inter/Roboto/Arial/
  system-ui/Space Grotesk as design choices; purple-blue gradients on
  white; three evenly spaced cards; numbered markers on non-sequences;
  "modern and clean"-style copy. See `docs/design-knowledge.md`.
- **AND COPY THAT EXPLAINS WHAT THE LABEL ALREADY SAID — the owner's rule,
  2026-09-01.** He found *"Mobile — we go to them"* on the job record:
  *"no duh… it thinks that humans can't think, or it feels the need to
  explain literally every single thing, which just gets annoying and
  cluttered."* **The test: does the sentence add a fact the control does
  not already carry?** If not, delete it. He is not asking for nothing to
  be explained — the non-obvious keeps its sentence. Full rule and the
  swept sites: `docs/design-system.md` § Never-defaults, and
  DECISIONS.md → "The copy pass".
- Visual work is verified by LOOKING: screenshot **1920 / 1440x900 /
  768x1024 / 392x844**, console read at each, in the normal path AND
  `?lite=1`, compared against the design system. 1920 is the owner's own
  monitor and it is where "not enough content to fill the viewport" bugs
  live. Retints are checked per tenant accent, including extremes.
  ("Both themes" was here until 2026-08-30 and is stale — the owner killed
  the light theme; there is one ground.)
  **392 is the narrowest SCREENSHOT width; 320 is the narrowest SUPPORTED
  one and is now swept by default.** PRODUCT.md promises 320→1440 and, since
  roadmap 2.9 on 2026-08-31, the product keeps it — `sweep-widths.mjs` runs
  392, 360 AND 320 with no argument. **Below 361px the dashboard has a layout
  of its own** (theme.css § THE 320 FLOOR): paired fields stack, a setting
  puts its control under its words, a segmented control goes full-width and
  wraps, and the palette is 4x3. So a change that looks fine at 392 can still
  break 320 — run the sweep, do not reason about it.
  **THE PHONE IS PORTRAIT, AND ROTATING IT MUST CHANGE NOTHING — the owner's
  ruling, 2026-08-31**: *"for the phone version, it should always just stay
  portrait… when someone flips their phone over sideways, I don't want it to
  completely readjust."* It used to readjust: `theme.css`'s `min-width: 700px`
  and `min-width: 560px` rules fire on a sideways phone (844px wide), so a
  settings sheet became a centred desk panel showing 20% of its form.
  **BUILT 2026-09-01 (roadmap 2.11 step 6), and it was THREE places, not the
  two the phone pass listed** — the calendar cell's own 700px rule spends
  height too (a cell goes 56px → 88px), so rotating made the month grid taller
  on the shortest screen in the product. **A FOURTH ARRIVED IN STAGE 4** — Money's period control stops wrapping
  at 700 — **AND A FIFTH IN STAGE 5**, `.clientfilters`, which was written
  with the guard on its first line because the lesson below had already been
  learned. All five carry `and (min-height: 500px)`. Verified at 844x390: the settings sheet is
  still bottom-anchored and full-width, the cell is still 56px.
  **The lesson is about the LIST, not the rule — a file that names two
  instances of a pattern invites a session to fix two and stop. Grep the
  breakpoint.**
  **The rule underneath, which is the transferable part: a layout decision that
  spends height must ask about height.**
  **`docs/dashboard-phone-pass-2026-08-31.md` is the phone's authority** and it
  overrides step 4's screen designs wherever the two disagree about a phone.

- **ANYTHING THAT OPENS, ANIMATES IN — AND THIS BINDS NEW WORK TODAY, not
  when roadmap 2.17 is scheduled.** The owner asked for it 2026-09-01 and
  confirmed it 2026-09-02: *“there’s multiple points where stuff just kinda
  pops into place, and there’s no fluid animation… keep that in mind when we
  build future things so it’s already there; for the past things it needs to
  get revised.”* **It is a DESK problem** in his own words — below `--wrap`
  `.sheet` already animates in and out; at a desk a record, a day panel, a
  settings column and a picker all just appear.
  **Do not confuse it with the arrival budget** (`dashboard-skeletons.md` §4,
  where the full rule now lives): that caps a SCREEN’s first paint at one
  stagger. This is about a thing somebody OPENED, which has to come from
  somewhere. **A new component that opens ships its entrance AND its exit in
  the same change.** Retrofitting the existing ones is roadmap 2.17, and it is
  a LIST rather than the two he happened to name.
  His limit is the acceptance test: *fluid and connected, without being in the
  way of productivity* — interruptible, fast, never a gate between a tap and
  the thing tapped for.
  **FIRST HONOURED 2026-09-02 (stage 7), and two things came out of it worth
  reusing.** A component that renders as a `.group` under `.app-main` already
  HAS an entrance — the screen's staggered arrival — so it needs only an exit;
  giving it a second one is two animations running the same 420ms. And a step
  or panel somebody advances repeatedly takes `--t-exit` (180ms), not
  `--t-reveal` (420ms): 420 is right for a screen you meet once and is a gate
  on a thing you do seven times in two minutes.
  **THE RETROFIT SHIPPED 2026-09-03 (roadmap 2.17) AND THE MECHANICS ARE NOW
  FIXED — use them rather than inventing a second set.**
  **`.split > .col-2` carries `column-in` / `column-out`**, 14px on X at
  `--t-exit`, one selector for the job record, the client record, the settings
  column through both doors, the calendar's day panel and every screen's
  resting second column. A new thing that opens into the second column gets
  this for free by being a `.col-2` — **do not give it its own animation.**
  **`hooks/useLeaving.js` is the exit** and the 180 lives there and nowhere
  else (`composition` 8c-i pins it to `--t-exit`). React unmounts, so an exit
  is a delayed unmount; a fourth caller rolling its own `setTimeout` is how the
  pattern forks.
  **A component that takes the MAIN AREA already has an entrance** — the
  screen's stagger — and that now has a second confirmed instance: the gear.
  The roadmap listed it as broken; it was not. **Read
  `document.getAnimations()` before adding one.**
  **THE AXIS IS THE ORIGIN.** `arrive` travels Y because a screen is read
  downward; the second column travels X because the column edge is where it
  came from. That is the rule for the next container, not a preference.
  **AND THERE IS A THIRD KIND OF MOTION: A SWAP (2026-09-03, his second
  pass).** A screen ARRIVES, a thing OPENS, and a frame that stays put while
  its contents are replaced does this. His definition: *"the GUI kind of
  doesn't really change, but the actual text inside of it changes."* It is on
  the job record (reached from Today AND the calendar), Money's period figures
  and the Clients list.
  **IT SHIPPED AS A UNIFORM DISSOLVE, HE REJECTED IT ON SIGHT, AND IT WAS
  REPLACED 2026-09-04** — *"it just looks like a page refresh… it doesn't look
  fluid."* **HIS OWN EARLIER WORDS PRODUCED IT** — *"maybe, like, a little
  dissolve or a blur"* — **he withdrew them and apologised**, and that sentence
  still sits in `docs/roadmap.md`, `docs/design-system.md` and `DECISIONS.md`
  with the retraction now beside every copy. **A session that finds the earlier
  quote and not the withdrawal rebuilds the rejected thing and can cite him for
  it.** He refused to specify a replacement on purpose, and floated a second
  hint (*"text that went down and faded up"*) which he withdrew in the same
  breath. **Neither is a spec.**
  **THE DIAGNOSIS IS THE PART TO CARRY FORWARD: a page reload IS a whole block
  changing opacity at once, so the fault was the UNIFORMITY — not the duration
  and not the blur.** Designing against the complaint gives a shorter dissolve,
  which is the same defect in less time. Everything he approves moves its parts
  on different timelines.
  **SO `.swap` CARRIES NO ANIMATION AT ALL** — it is a marker plus a React
  `key` — and **`.swap > *` runs the screen's own `arrive` at `--t-exit`,
  staggered 20ms, capped at 160ms**. No new keyframe, duration, distance or
  property: one entrance shape at three scales (screen 420/40, rail 420/20,
  parts 180/20). **The blur is gone and law 4 is back to transform and opacity
  only.** `composition` 8e-i-b fails on ANY rule targeting `.swap`, on purpose.
  **A SWAP MUST NOT BE A DIRECT CHILD OF `.col-1`** — the arrival selector is
  (0,4,0), so a keyed swap there re-runs `arrive` at 420ms instead. Nest it in
  a wrapper; **do NOT fix it with a specificity override**, which was tried and
  broke the one-arrival law instead (the screen then arrives at two speeds).
  `composition` 8e-iii and 8e-iv hold both halves.
  **AND FURNITURE OPTS OUT — the rule's other half, not an exception.** A
  control that is pixel-identical in the record you came from did not change,
  so moving it says something untrue, and static chrome behaving like content
  is the purest page-refresh tell there is. `.swap > .jobbar` opts out;
  `RecordHost` had already pulled the close button out for the same reason and
  the action bar was missed because it is a CHILD of `.record-body` rather than
  a sibling. **The test for the next one is that question, not a class.**
  **NOTHING ANIMATES TWICE EITHER.** Money's `bar-rise` is right on first paint
  and wrong on a switch (it ran 280ms past everything beside it). No selector
  can separate the two cases — the bars remount identically — so `Money.jsx`
  carries the fact and `.bars.replacing` reads it.
  **AND THAT FLAG'S FIRST VERSION WAS CORRECT-LOOKING AND DID NOTHING, which is
  the transferable bit:** recomputed per render it went true and then FALSE on
  the very next render, and **removing `animation: none` from a live element
  STARTS the animation** — plausible code, unchanged behaviour, the class gone
  before the DOM could be inspected. `getAnimations()` was the only instrument
  that could see it. Latch a flag like this per subject, never per render.
  **AND THE RADII WERE TIGHTENED 2026-09-04 — `--r-panel` 18 → 12, `--r-inset`
  12 → 8 on BOTH surfaces, and the tab switcher off `--r-pill` onto its own
  `--r-nav: 16px`** (buttons `calc(var(--r-nav) - 5px)`: the bar's padding is
  5px and concentric corners have to be). His ask, and **it is also the answer
  to "make the squircle work universally"**: the gap between a true squircle
  and a plain rounded corner is PROPORTIONAL TO THE RADIUS — measured at 4x,
  34 differing pixels at 18px against 14 at 12px and 3 at 8px — so tightening
  cuts the Chromium-only difference by ~59%/79% with no mask and no worklet.
  **Pills did not move**; Apple squircles cards and keeps capsules as capsules.
  **`composition` 8a covers `--r-nav` too — a new radius token missing from
  that check is the one surface the pairing rule silently stops covering.**
  **AND THE CORNER IS A TOKEN, ON BOTH TOKENISED SURFACES: `--corner` in
  `theme.css` and `--bk-corner` in `booking.css`**, paired onto every
  panel/inset/nav corner and onto **no pill, dot or ring** — a superellipse at a
  100px radius is a lozenge, at 50% a blob. Every surface defines its own copy
  of the radii, so setting it on one and not the other is the two-corner-
  languages failure the design system forbids. **THE LANDING PAGE JOINED 2026-09-04** — `--ld-r-panel`, `--ld-r-inset`
  and `--ld-corner` in `landing.css` AND in the approved reference rendering,
  which is now a swept surface of its own (8a is four surfaces)
  because where that page and the document disagree the PAGE is right. **Edit
  those two files from ONE table keyed on the VALUE, never the selector** —
  they spell their selectors in two dialects and a selector-keyed pass silently
  missed four of twelve. **`corner-shape` does not inherit and does not affect
  `clip-path`**; both bit here, and the second is a 3-pixel difference at 8px,
  which is exactly why reading the file caught it and a screenshot would not.
  *(This entry said "deliberately NOT done and with the owner" until he said
  "just do whatever is needed".)* `corner-shape` is
  **Chromium-only in stable** (Chrome/Edge 139+; Safari Technology Preview
  only; Firefox no — measured 2026-09-03, not assumed), and it is additive, so
  Safari draws today's corners. **A Houdini paint worklet is Chromium-only
  TOO** and reaches exactly the same browsers for a JS paint pass, so do not
  re-propose it on rediscovering the support gap; an SVG mask reaches Safari
  and clips the hairline this system draws almost everywhere.
  **`tests/composition.test.mjs` test 8 holds all of it** — 15 checks,
  baselined both ways.

- **Imagery: never a grey placeholder box.** An Unsplash connector is
  wired up and confirmed working 2026-08-29 (`search_photos`; "car
  detailing" returns ~4,800 real photos). Use it for mockups, the demo
  business, and anything a tenant has not supplied. If it cannot find the
  right shot, ASK THE OWNER — they have said plainly they will go and
  source images rather than have work limited by what is to hand. Asking
  is cheaper than settling.

## Verification

- **THE CHECKS ARE 2.6x FASTER AS OF 2026-09-02, AND HOW YOU RUN THEM MATTERS
  MORE THAN THAT.** The owner asked why a one-screen session takes an hour;
  the answer, the fix and the rules that came out of it are
  `docs/verification-speed-2026-09-02.md`. The short version, and it is not
  optional:
  **Iterate with `node scripts/sweep-widths.mjs 392 --only Clients` (38s) and
  run the full sweep ONCE at the end. **IT COSTS MORE THAN THE 178s THIS FILE
  USED TO QUOTE, and the figures are measured rather than estimated
  (2026-09-02): 392 alone is 82s wall with 47s of that being `settle`, and the
  full five-width run reports 218s of waiting normally and 94s through
  `--lite`.** Stage 7 took it from 40 screens to 54, and roadmap 2.12 to 56 — the setup form's seven
  steps and the walkthrough's seven — and the trade was taken deliberately,
  because this script is the only thing in the repo that opens either and
  neither is reachable by clicking a tab. **Iterate at one width; the full run
  is a once-per-item cost, not a per-change one.**
  **AND THE DEFAULT RUN IS TIERED AS OF 2026-09-03, at the owner's push: 203s
  rather than 335s.** Every width walks the CORE — the booking page, the five
  tabs, the job record, the request card, the calendar's day and history,
  Money's periods and modals, Clients' six. **The long tail — the FOURTEEN
  settings screens, the gear, setup x7, tour x7 — runs at 320 and 1920 only**,
  the two extremes where every width-specific defect in this repo's history was
  actually found. Measured: a deep width is ~67s, a core-only one ~24s, so the
  tail is ~43s a width. **`--all` restores the exhaustive walk and is NOT
  optional after a change to what those screens SHARE** — `theme.css`,
  `SettingsHost`, `Sheet`, `controls.jsx` — because the tiering is a bet that
  the long tail is uniform, and a change to the shared container is that bet
  losing. The script prints its own per-width wall clock on every run now.
  **AND THE ONE THAT COSTS THE MOST WHEN IT IS MISSED — ADDED 2026-09-05, THE
  FOURTH TIME HE HAS ASKED WHY A SESSION IS SLOW, AND THE FIRST TIME THE ANSWER
  WAS NOT IN THE SCRIPTS: SETTLE THE ITEM'S FULL SCOPE BEFORE WRITING A LINE OF
  CODE, FROM THE ROADMAP'S OWN BULLETS RATHER THAN FROM ITS HEADLINE.** Roadmap
  2.20 stage 1 took 90 minutes, **68 of them waiting**, and the single largest
  slice was **one item verified TWICE** — its last bullet (*"build one small
  thing beside it"*) was read as a follow-up, so the headline half was built,
  fully verified and committed, and the rest then needed the entire battery
  again. **THE BATTERY IS THE MOST EXPENSIVE THING IN A SESSION** — a full
  sweep, a `--lite` sweep and `e2e-booking` are ~10 minutes together — so an
  item whose scope grows after the first green run costs a second one.
  **The scripts are not the problem any more and that is measured**:
  `sweep-widths.mjs` has 77 `settle()` sites and zero real fixed sleeps, a core
  width is 26–30s, and running the suite one extra time now costs more than
  every optimisation in `docs/verification-speed-2026-09-02.md` returns. **The
  remaining wins are all in the ORDER things are done, not in the code.** That
  file's last section has the full accounting and a five-line checklist.
  **AND THE RULE THAT IS WORTH MORE THAN EVERY OTHER LINE IN THIS SECTION, and
  costs nothing: START THE LONG CHECK, WRITE WHILE IT RUNS, THEN READ THE
  RESULT.** **WRITE PROSE — NOT SOURCE. Learned the expensive way 2026-09-04:
  an edit to anything under `app/src` while `sweep-widths.mjs` is running makes
  Vite reload the page** (`main.jsx` has a non-component export, so a cascading
  HMR update there fails Fast Refresh and falls back to a full reload), **and
  the sweep dies with "Execution context was destroyed, most likely because of
  a navigation" at whatever screen it happened to be on.** It cost two full
  `--lite` runs and landed in two unrelated places, which is exactly what a
  source edit during a browser walk looks like from the outside — it reads as a
  flaky script or a bad diff. **The dev server names the cause in one line:
  `page reload src/main.jsx` in the Vite log.** Check that before blaming
  anything else.
  **IT IS EVERY BROWSER SCRIPT, NOT JUST THE SWEEP — AND `e2e-booking.mjs`'s
  SYMPTOM READS AS A PRODUCT BUG RATHER THAN A HARNESS ONE (2026-09-04, roadmap
  2.20).** Same cause, one edit to `app/src/lib/permissions.js` while a
  backgrounded e2e run was on its second tenant. It did **not** print
  "Execution context was destroyed". It printed a null receipt link and then
  five failures in a row — *the booking is in the database — no id*, *stored as
  confirmed*, *charged what the price bar printed — bar $150.00, row
  undefined* — **while the same run's own email leg passed with the right
  subject and the right amount**, which is a booking that plainly worked being
  reported as a booking engine that does not store anything. A session reading
  that output goes looking for a schema bug. **The tell is the contradiction
  itself**: if the emails carry the right total, the row exists and the SCREEN
  is what went missing. Confirmed in ten seconds by three timestamps — the file
  write, the Vite `page reload`, and the log's own mtime. **`--slug=<one>`
  re-runs a single tenant in ~90s and is the cheapest control**; the leg passed
  39/39 alone and 82/82 on a clean full re-run.
  **AND AS OF 2026-09-05 THE SCRIPTS SAY IT THEMSELVES — `scripts/source-guard.mjs`.**
  All four browser scripts note the time before the browser opens and, at the
  end, name any file under `app/src` saved since. **The paragraph you are
  reading was already here when this happened for the second time in two days,
  which is the evidence that a warning in a 1,200-line file is not a fix.** The
  guard does not prevent the mistake; it removes the eight minutes of
  diagnosing it.
  **IT REPORTS ON A PASS TOO, AND THAT IS THE LOAD-BEARING HALF — LEARNED BY
  BASELINING IT RATHER THAN BY DESIGNING IT.** The first version fired only on
  a failure, reasoning that a clean run needs no excuse. Baselining it — an
  edit dropped 25 seconds into a real run — killed that in one go: **the page
  reloaded and the run still finished with zero geometry problems and printed
  `clean`**, so the guard was silent on a run nobody should trust.
  **A MID-RUN RELOAD DOES NOT RELIABLY FAIL A RUN**, which is the fact worth
  carrying: every check this sweep owns asks whether something is off an edge,
  and a screen that never opened has no edges to be off. The damage is not a
  red run, it is a green one that measured less than it claims — this repo's
  oldest failure mode wearing a green tick. A false clean is worse than a
  failure, because a failure at least makes somebody look.
  **It is a diagnosis and never a gate** — it cannot change an exit code. A
  check that started failing for procedural reasons would be worse than the
  problem it names. Plain Node, no hook, portable to another agent.
  Same trap from the other side: a second agent or session working in this same
  directory does it to you without your knowing, so a sweep that dies mid-run
  is worth a `git status` before it is worth a bisect. The owner asked a second time during roadmap 2.12 why a session
  takes as long as it does, and that session's own runs were counted rather
  than estimated: **~33 minutes spent WAITING, all but two of them blocking**,
  while the documentation it was always going to write — DECISIONS, PROJECT-
  STATE, the roadmap — needs no I/O at all. **The two halves of a session do
  not contend for anything and were being run one after the other.** Background
  every full sweep and every env-backed test run, and write during them.
  Two corollaries from the same count: **`--only <Screen>` is the iteration
  tool and takes seconds** — a 56-screen run at one width is 82s and is not the
  cheap option, and it was used ONCE all session; and **write all the edge-
  function code, then deploy once** rather than deploying after each pass.
  Full working: `docs/verification-speed-2026-09-02.md`, last section.
  ~~**AND RUN IT IN THE FOREGROUND.**~~ **SUPERSEDED 2026-09-02.** Both full
  passes finish inside the ten minutes a foreground command is allowed; the
  same runs redirected to a file from a background job once sat at one width
  for ten minutes twice and had to be killed. **That was the SCRIPT's own stall
  — the setup-form race — and it is fixed, along with a 15s default timeout on
  every page so nothing can hang for thirty seconds again.** A background
  five-width run was taken at the end of roadmap 2.12 to prove it, because the
  rule above is worthless if the longest check in the repo is exempt from it.
  If a background run ever stalls again, count the orphaned
  `chrome-headless-shell.exe` processes before blaming the harness. `--lite` is a
  final-run flag, not an iteration one. Screenshot the ONE width that answers
  the question. And when a layout question has a number in it, MEASURE FIRST
  rather than building, looking, and then measuring** — the period control
  was rebuilt twice before anyone measured that the answer was 2px of padding.
  The scripts now `settle()` instead of sleeping: the old fixed timeout is a
  CAP, and the wait ends when the DOM has been quiet for 130ms with no finite
  animation running and no spinner on the page. **It was baselined against a
  deliberate defect** — 96 reported, then clean again once removed — because
  a check that measures the page too early looks exactly like a check that
  passes.


- Finish every session: `node tests/composition.test.mjs`,
  `design-contrast`, **`landing-pricing`** (**65 checks — measured 2026-09-05; this said 58 and was stale within a day of being written** — 21 until roadmap
  2.20 stage 2 on 2026-09-05, and its FIRST check had been vacuous since the
  day it was written: the pricing-section slice looked for
  `aria-labelledby="price"` when the section is `"prh"`, so `indexOf` returned
  −1, `slice(-1, <smaller>)` gave `""`, and *"no hardcoded prices in the
  pricing section"* passed by having NO SUBJECTS — in the one test guarding the
  numbers a customer is charged. Same shape as `email-brand` 7a-ii. It now
  covers the pricing page too: the ladder's pricing RULES rather than its
  figures, the AB 2863 disclosures, that nothing is pre-selected, and that the
  landing page's plan buttons still point at `/pricing`. Thirteen of them were
  baselined by breaking what they guard),
  `route-contract`, **`money-export`**,
  **`email-brand`** (**189** checks — 97 when it was written and grown in roadmap
  2.12, which found what it could not see: it pinned the colour ENGINE and never
  looked at what the templates DID with the answer, so **every email headline in
  the product was 3.01–3.76:1 on a 4.5:1 floor, on all fourteen colours**, and
  the invoice's own title was 1.20–1.57:1. **A test can verify the
  arithmetic and still be blind to the drawing.**
  **GROWN AGAIN IN 2.18 (138 → 186) AND ITS SOURCE CHECKS WERE RE-POINTED, which
  is the part a cold session needs.** 7a, 7a-ii and 7b-ii described the old
  white-card-under-a-coloured-band layout; the rebuild deleted it, **two of them
  failed loudly and one went SILENTLY VACUOUS** — its regex matched nothing, so
  it passed by having no subjects. They were rewritten stronger: **no literal
  hex anywhere in the templates** (every colour comes from a token or the brand,
  so a literal is by definition unmeasured), **the two accent values may not
  swap jobs** (`accentFill` is corrected 3:1 as a background and `accent` 4.5:1
  as words), and **7a-iii asserts the checks HAVE SUBJECTS** so the next layout
  change fails loudly instead of going quiet. **Baselining found a raw backspace
  (0x08) inside the new regex** — invisible in every editor and in `sed`, visible
  only under `od -c` — so the check written to prevent silent vacuity was itself
  vacuous on its first run. **Baseline any check you add to this file, both
  ways.** It pins
  `supabase/functions/_shared/brandColor.js`, the EMAIL’s copy of the colour
  engine, against `app/src/lib/theme.js` on the twelve presets and the four
  extremes. Email is the one place in this repo a second implementation of the
  colour maths is allowed — an edge function is a separate Deno bundle and the
  Supabase CLI will not follow an import out of `supabase/` — and this test is
  the price of that permission),
  **`qr-scans`** (**17** checks — this file said 14 until 2026-09-02 and it was
  a guess at authoring time; the script prints its own figure, new 2026-09-02 — the ONE browser test in this
  list, because the QR is drawn on a `<canvas>` and an encoder can be perfect
  while the rendering is unscannable. It decodes the pixels back with a
  DIFFERENT library than wrote them, and it needs the dev server but no login
  and no seed. Baselined at 6 failures with the quiet zone removed),
  **`client-list`** (31 checks, new 2026-09-02 — the Clients list's date
  arithmetic and the lapsed filter, which decides who ends up on the end of a
  group text; baselined both ways),
  **`plans`** (**the script prints its own figure** — 51 at step 2 and 73
  after step 3; new 2026-09-04, roadmap 2.14 — the visits a plan
  member is OWED, which is the one number that feature exists to print, and
  `addPeriod` against Postgres's own month-overflow clamp, because the
  accrual writes the grants in SQL and this file predicts the next one.
  **Test 6 is step 3's half and it imports `_shared/pricing.ts` DIRECTLY** —
  Node 24 strips the types, so the credential-free suite can pin the money
  path the edge functions actually run: what a plan takes off, that it can
  never become a surcharge, and that the itemisation still reaches the
  charged total. Baselined both ways),
  **`setup-progress`** (24 checks, new 2026-09-02 — how many of the seven
  first-run steps are done. That number is printed in TWO places that must
  never disagree, the setup form's progress rule and Business's *Finish
  setting up* row, and five of the seven are DERIVED from the database rather
  than stored. Baselined at 11 failures with the derivation removed, which is
  the state that tells a fully configured business it has done nothing),
  **`campaign`** (16 checks, new 2026-09-05, roadmap 2.19 — the ONE commercial
  email this product sends. It pins the two things that make it legal to send
  at all (a postal address and a working opt-out in the footer) AND that no
  transactional template grew either, because an unsubscribe link on a booking
  confirmation invites a customer to switch off the reminders for a job they
  have already booked. Its other half is the injection boundary: this is the
  only template whose body is TYPED BY A HUMAN and delivered to fifty, so the
  escape order — escape first, THEN newlines to `<br>` — is what stops one
  typed message becoming markup in every copy. Baselined both ways: dropping
  the footer fails 4, dropping the escape fails 2),
  **`platform-billing`** (**263 checks — measured 2026-09-05; this said 168 and the file said 220 sixty lines further down, which is the same suite counted twice and wrong twice**, new 2026-09-05, roadmap 2.20 stage 2 —
  what a DETAILER pays US, and the first suite in this repo where *a number
  PRINTED is not a number CHARGED* is literally rather than metaphorically
  true. It ties every rung on `/pricing`, founding and list, to the money
  `lineItemsFor()` hands Stripe; it pins the SECOND copy of the price table
  (`_shared/platformBilling.ts` against `app/src/landing/pricing.js`) value by
  value; it pins the consent sentence's four statutory clauses AND that a plan
  with no term never invents one; the exit-fee arithmetic including its cap and
  its zero cases; the Stripe-status map, where an unknown status must produce
  NULL rather than default either way; and **§ 8, the webhook signature — the
  only authentication a public write endpoint has.** Seven checks were
  baselined by breaking what they guard, and one of them was FOUND vacuous that
  way: *"nothing has been deleted"* passed with the sentence removed from the
  email, because the hidden preheader also says it),
  **`payments`** (45 checks, new 2026-09-04, roadmap 2.20 stage 1 — the
  detailer's own payment handles. It pins the two things no other check in this
  repo can see. **WHICH EMAILS CARRY THE LIST**: `invoiceEmail` branches on
  payment status, and both branches render a perfectly valid email, so handles
  printed on a PAID RECEIPT would look like a working feature while being the
  exact thing the owner complains about on his own old site. Five placements
  and four refusals, including the one the roadmap's own wording would have
  missed — in request mode the ACCEPTED-request email is the confirmation, so
  "the confirmation and the reminder" leaves every request-mode tenant with
  handles on no email at all. **AND WHAT REFUSES TO BECOME A LINK**: a wrong
  payment link sends somebody's money to the wrong person and is invisible from
  every screen, so only a plain username or a pasted `https:` URL is linked and
  a phone number, an email address or `javascript:` is printed as typed.
  Baselined three ways — handles on the receipt fails 1, the escape removed
  fails 3, a link built from anything fails 7. **§ 6 is the OTHER half of 2.20
  and is about email rather than money**: `customers.email_failed_at` is a
  third way to be unreachable beside "no address" and "opted out", and the
  three places that ask *can we email this person* — the Clients count, the
  compose sheet's, and `send-campaign`'s filter, which is the enforcement —
  have to agree, so the predicate is written out once here. Baselined by
  ignoring the bounce, which fails 2),
  **`booking-core`** (**147 checks — the script prints its own figure**, new
  2026-09-05, roadmap 3.2(a) — `app/src/book/core.js`, the module every tenant
  site's own booking form drives. Until that item the group rules were a
  closure inside `BookingPage`'s `setForm`, the step gating was an IIFE and
  both money payloads were object literals typed at their call sites, so **the
  only way to exercise any of it was to click through `/book/:slug`** — which
  means a client's bespoke form got to reimplement all of it from a
  screenshot. Every check is a sentence the NEXT booking form still has to be
  true of. Its § 1 is the unusual one: it reads the file as TEXT and fails on
  any `import`, any JSX, any `import.meta.env`, any React hook and any
  `localStorage` outside the two wrapped helpers — the properties that make it
  droppable into a site built on Astro, Alpine or nothing. **Two of those
  checks were vacuous on their first run in a new way worth knowing: they
  matched the file's own header prose promising "no React, no
  `import.meta.env`", so the check failed on the sentence advertising the
  thing it checks for.** Strip comments before reading a file as text.
  Baselined eight ways, each restored: the exclusive category, the
  `booking_mode` fallback, the day in the quote key, `has_water_electric`,
  the category cap's eviction order, `modeLimitFor` naming its service,
  `offersBothModes` forgetting `modeLimit` — which is the roadmap 2.5
  white-screen bug in test form — and the remembered customer's slug scope)
  from repo root — credential-free, all must pass. **Add `node scripts/decisions-index.mjs`
  to that list if you touched `DECISIONS.md`.** The other 8 tests need env vars from
  root `.env` — and one of them is new: **`request-mode`** (51 checks — 45 when written, roadmap 2.12,
  2026-09-02). It pins the two facts about request mode that no reader of the code
  can see: **a request HOLDS its slot**, which is true only because `pending` is
  absent from the exclusion constraint's WHERE clause — a fact established by NOT
  writing something — and **the quote tie-out**, that accepting a quote leaves the
  receipt's itemisation still adding up to what is charged. Baselined by deleting
  the `price_adjustments` line from `accept-quote`, which fails it by exactly the
  quote.
- **`settle()` IS A CAP ON A REPAINT AND IS NOT A WAIT FOR A NETWORK ROUND
  TRIP — and `sweep-widths.mjs` had three places that forgot it until roadmap
  2.19.** Monthly plans and Team's member list draw their buttons only after
  Supabase answers, and both were `settle(page, N)` then `.count()`. **`?lite=1`
  makes that race WORSE, not better**: with nothing animating the DOM goes quiet
  sooner, so settle returns earlier. `appear(locator)` in that script waits for
  the control instead of counting it — **use it for anything a database read
  draws.** The failure printed `NO SUCH BUTTON`, which reads as a renamed
  control rather than as a race, and that is the same family as the crash that
  printed `clean`.
  **THE DEBUGGING IS THE TRANSFERABLE PART: run the control BEFORE the theory.**
  Stashing the item's source and re-running the same sweep proved the failure
  was ours in one run; a bisect then blamed one file; and the very next run,
  with a `console.log` probe added, PASSED with that file still in place —
  which is what a race looks like from the outside. Three plausible
  explanations were written down first and all three were wrong.
- **`git stash pop` ON WINDOWS REWRITES THE WORKING TREE TO CRLF, and that is
  a second way into the invisible-byte trap already recorded below.**
  `core.autocrlf` is `true` here, so a stash round-trip taken to run a control
  turned `composition` 8e-iv red in a file the session had not touched — that
  check is a byte-exact `includes()` containing `\n`. **Fix: `sed -i 's/\r$//'`
  the files with real changes, and `git checkout --` the ones where only the
  line endings moved** (`git diff --numstat` lists only the former, so
  `comm -23` against `git status` names the latter).
- **PATCH SOURCE FILES WITH `sed`, OR WITH PYTHON OPENED `newline=""` — never
  plain `open(p, "w")` on Windows.** Python reads LF and writes `os.linesep`,
  so a scripted edit silently converts the WHOLE FILE to CRLF; git's autocrlf
  hides it from `git status`, and the first symptom (2026-09-04) was
  `composition` 8e-iv failing on **Clients.jsx, a file that item had barely
  touched**, because that check is a literal `includes()` of a needle
  containing `\n`. Same shape as the raw backspace this file already records
  twice: an invisible byte change that turns a green check red somewhere
  unrelated and points the next session at the wrong diff. **If a byte-exact
  check fails in a file you did not mean to change, `cat -A` it before reading
  the logic.**
- **Also credential-free, and it must exit 0 after anything touching accent
  colour or the ground tokens: `node scripts/accent-sweep.mjs`.** It measures
  every tenant preset as a fill AND as words on all three grounds the
  dashboard paints, plus the EXTREMES no preset list can cover (neon, pure
  black, near-black, pure white), and it pins `hueFamily()` against sixteen
  colours. It exists because correcting a colour against one ground buys a
  floor on that ground and nowhere else — the bug it caught left six of eight
  presets under the text floor on a panel (2026-08-30). **It grew again in 2.6:
  it now also measures the four grounds that are TINTED WITH THE ACCENT ITSELF
  — a selected chip, a selected choice, a completed pill/badge, the selected
  tab — because a tint of the accent is a ground, and correcting against the
  plain panel underneath it left nine of twelve presets under the text floor
  on a selected chip (worst 3.92:1). The tint percentages in `theme.css` and
  the 20% in `lib/theme.js` must move together or this exits 1.**
- **The check for anything that changes a LAYOUT:
  `node scripts/sweep-widths.mjs`.** No env vars, but unlike the tests above it
  needs the dev server running and the demo business seeded — it drives a real
  browser. It walks every dashboard screen, all
  FIFTEEN settings screens through TWO DOORS — TEN on Business (Monthly plans
  joined in roadmap 2.14, "How you get paid" in roadmap 2.20) and FIVE behind
  the header gear ("Your subscription" joined in roadmap 2.20 stage 2, and it
  is walked as its own block rather than in `GEAR_ROWS`: it is owner-only and
  its content comes from an edge function, so it waits for what the answer
  draws rather than for a repaint) (it was eleven behind one until roadmap 2.11 step 6 stage 6,
  and a script that opens one door reports clean on screens it never visits) —
  **the booking link’s QR CODE, which is behind a button and so is a state the
  script has to enter (added 2026-09-02 with it — measuring the Business index
  says nothing about a plate that only exists after a click, which is stage
  6’s own finding for the fifth time)**,
  **MONTHLY PLANS AND BOTH OF ITS FORMS, WHICH ARE THE NINTH INSTANCE OF THE
  SAME GAP — and the FIRST time it was added in the change that built the
  screen rather than in the item that later finds it broken (roadmap 2.14,
  2026-09-04).** The screen is two lists and two buttons; the plan form is
  nine controls including a segmented control beside a number field, and that
  row is what breaks at 320, not the lists above it,
  the client sheet, **the job record in two states
  (added 2026-09-01, roadmap 2.11 step 6 stage 2 — until then the object
  carrying 26 of the product's 126 capabilities had never been swept, so a
  clean run said nothing about it)**, **the calendar's OTHER TWO SCREENS —
  the day panel with each of its three editors opened, the history, its
  collapsed filter bar and a history job (added 2026-09-01, stage 3, and the
  same gap: clicking the Calendar tab measured the month and nothing else,
  so four capabilities and a whole second mode had never been opened at any
  width)**, **MONEY'S three period kinds, its unpaid job and its expense form
  (added 2026-09-01, stage 4 — the same gap a THIRD time, and the period
  control is the one row in this product that has to hold one line at a desk
  and five equal cells on a phone — it wrapped 3 + 2 until the owner rejected
  that on 2026-09-02)**, **CLIENTS' OTHER FIVE — the list itself, each of its two other sorts, the
  lapsed filter and a job opened from a client's own history (added
  2026-09-02, stage 5, and the same gap a FOURTH time: it opened one client
  sheet and measured nothing else, and this list is also the only one in the
  product whose LAYOUT changes when a record opens, so its closed and open
  states are two measurements rather than one)**,
  **FIRST RUN'S FOURTEEN — the setup form's seven steps and the walkthrough's
  seven (added 2026-09-02, stage 7, and it is the same gap a SIXTH time in its
  sharpest form: NEITHER screen is reachable by clicking a tab. The form is
  behind a row that only exists while setup is unfinished and the tour is
  behind a row in the gear, so a script that walks tabs cannot see either. The
  walk uses "I'll do this later" throughout and never presses Continue, which
  is the one that writes; `seed-demo.mjs` pins the demo at 6 of 7 so the row
  it opens the form from is always there)**,
  **THE LANDING PAGE — added 2026-09-05, and until that day the page a
  visitor meets FIRST had never been measured by anything in this repo.** It
  was measured BEFORE being added rather than after: clean at all five widths,
  so it changed no verdict on the day and catches the next change to it. The
  gap existed because this script walks the DASHBOARD and the booking page, and
  `/` is neither,
  **THE PRICING PAGE, `/pricing` (added 2026-09-05, roadmap 2.20 stage 2, in
  the change that built it).** Public, so it is walked before the sign-in
  beside the booking page. Its ladder changes shape twice between 1440 and 320,
  and the founding strip is a SUPABASE READ — so the strip is waited for with
  `appear()` and its absence PRINTS rather than skipping. It lost that race at
  the first width of its very first full run and the `else` is the only reason
  anybody knows,
  **NOTIFICATIONS' "YOUR OWN WORDS" EDITOR, WHICH IS A STATE BEHIND A BUTTON
  (added 2026-09-03, roadmap 2.18 — the SEVENTH time this same gap has been
  found).** Twelve rows collapse to an "Add a line" button and the textarea,
  the preset chips and the Done row only exist after a click, so a clean
  measurement of the Notifications screen said nothing about them. **The
  pattern, now that it has arrived seven times: the script walks NAVIGATION,
  and a state you reach by pressing something INSIDE a screen is not
  navigation.** When you add a control that reveals other controls, add its
  opened state here in the same change,
  **TEAM'S ROLE EDITOR, WHICH IS THE EIGHTH (added 2026-09-04, roadmap 2.13 —
  a member row's name field and its four permission switches only exist after
  pressing *Change*)**,
  **THE REQUEST QUEUE, THE REQUEST RECORD AND THE QUOTE SHEET (added 2026-09-02,
  roadmap 2.12), and adding them MOVED two selectors that had silently changed
  meaning.** `.card.attend` used to mean "the lit job"; a waiting request now
  takes the lit treatment (`dashboard-skeletons.md` §6), so on the seeded demo
  that selector resolves to a REQUEST card — the run stays green while measuring
  a different object under the same label, which is a rename with no error. Both
  rail records are addressed through `.dayrail` and by rail NODE now, and
  **tomorrow's first job is swept as its own state**, because which of the two
  rail states exists depends on the hour the seed was run and the old pair papered
  over that by measuring the same record twice.
  **The demo takes REQUESTS as of 2026-09-02** (`seed-demo.mjs`,
  `booking_mode: "request"`, two pending requests, one already quoted) — it is the
  only business this script can log into, so a reserve-mode demo would mean the
  request queue is never rendered at any width by anything.
  **and TWO KEYBOARD ASSERTIONS on the walkthrough at 392 — the only thing in
  that script that is not about an edge.** They are there because the overlay
  claims `aria-modal` and its own rule says the lit element is not clickable,
  and both were false when it was built; they then caught the FIX being
  broken too, in `?lite=1` only. **Run `--lite` before believing a timing
  fix**: removing every animation changes when things settle, so it is a
  second sample of any race for free.
  And the booking page at
  **1920, 1440, 392, 360 and 320** and reports anything past the right edge, anything
  **outside its own
  parent's box**, anything scrolling sideways with no scrollbar, and any two
  boxes stacked with no gap. **320 joined the default in roadmap 2.9**, the item
  that made it pass, and so did the parent-box check — until then a clean sweep
  meant nothing was off the SCREEN, and two defects sat 19px and 11px outside
  their card at 360 through two roadmap items because the card's padding hid
  them. **1920 and 1440 joined in roadmap 2.11 step 3**, at the verification
  HEIGHTS (1080 and 900), not the phone's 844.
  **And they came with a fifth check, `dead-width`, because the other four
  reported CLEAN on all 18 screens at 1920 with a 724px column** — "nothing is
  off the edge" is trivially true when 62% of the screen is empty, and that is
  the "a skipped check reads like a passing one" family again. It printed
  *276px short* and did not gate while one constant at the top of the script,
  `DESKTOP_SPEC_BUILT`, was `false`. **IT IS `true` AS OF 2026-09-01** —
  roadmap 2.11 step 6 shipped the shell, `.app-main` takes `--wrap` at ≥1024,
  and the content column measures **1,144px at both 1920 and 1440** against the
  724px it was at every width before. **The check gates now**: a regression
  back to a narrow column fails the sweep.
  `--lite` runs the whole thing through `?lite=1`. It exits 0 at all five
  widths in both paths today. Pass a width to ask a different question.
  **PHONE LANDSCAPE IS NOT SWEPT, AND THAT IS THE OWNER'S RULING, NOT AN
  OVERSIGHT.** Roadmap 2.11 step 4b measured 844x390 and it is genuinely
  broken; he then said **portrait only** — *"when someone flips their phone
  over sideways, I don't want it to completely readjust… it might get
  annoying."* So `844` is not in the default list, there is no height special
  case, and the `short-screen` check written for it was **removed rather than
  left dormant** — a check nothing triggers is a check that rots. The
  measurements are kept in `docs/dashboard-phone-pass-2026-08-31.md` §20 so
  nobody takes them again and files them as new. **Do not re-add without
  asking him.**
  **AND IT REFUSES TO MEASURE A SCREEN THE ERROR BOUNDARY IS ON — new
  2026-09-04, and it is the widest form yet of "a skipped check reads like a
  passing one".** A one-word slip took the whole gear index down; `ErrorBoundary`
  drew four short lines, and four short lines are not past the right edge, not
  outside their parent, not scrolling sideways and not stacked without a gap —
  so the run printed `the gear   clean` and then reported the twelve rows under
  it as `NO SUCH ROW`, which reads like a renamed control rather than a crash.
  `say()` looks for the boundary's own heading first now and prints
  `CRASHED — <reason>`; the reason comes from `textContent`, because it lives
  inside a CLOSED `<details>` that `innerText` correctly reports as invisible.
  **The general form: every check this script owns is a question about
  GEOMETRY, and geometry has nothing to say about whether the screen is the one
  you asked for.**
  **AND COMING BACK FROM A SETTINGS SCREEN IS `Escape`, NOT THE HEADER GEAR** —
  the gear is `aria-pressed` and toggles you OUT of settings entirely, so a
  block that ends with it leaves the next block looking for rows on a screen it
  just closed. That, too, prints as `NO SUCH ROW`.
  **What that leaves, and it was always true:** every check this script owns
  asks about the RIGHT-HAND edge, so it cannot see a bottom-edge failure at any
  size. `sweep-booking-steps.mjs` is the one that asks the bottom question, and
  only of the booking page.
  **AND THE SUBSCRIPTION SCREEN IS TWO DIFFERENT SCREENS, ONLY ONE OF WHICH
  EXISTS PER SEED — roadmap 2.20 stage 2.** With no subscription it is the
  three rungs, the price breakdown and the consent tick (a four-clause
  generated sentence beside a 22px checkbox — the riskiest geometry that item
  added); with one it is the account, the invoice list, the cancel confirmation
  and an error box carrying an action. **The DEFAULT seed has no subscription**,
  which is both truthful and the harder half; `node scripts/seed-demo.mjs
  --subscription=past_due|active|suspended` seeds the other. **The block PRINTS
  `NOT MEASURED` for whichever state it did not find, naming that command** —
  the rule stage 1 learned four days earlier. Both were measured on 2026-09-05
  and both are clean; **`suspended` also sets `businesses.status = 'paused'`,
  which darkens the booking page, so do not leave that seed behind.**
  **The script needs the dev server and the demo login**, like
  `shoot-dashboard.mjs`. **It stubs `navigator.share` in on purpose** — Chrome
  on Windows has it and headless does not, and that one difference is the
  whole of walkthrough W14.
- **THE CHECK FOR ANYTHING ON THE PATH A CUSTOMER OR A BOOKING TAKES:
  `node scripts/e2e-booking.mjs`** (roadmap 2.5, 2026-09-04 — 82 checks, ~3
  minutes). Same dev server and seeds as the sweeps, plus the root `.env`,
  which it loads itself. It is the only thing in this repo that **presses the
  button**: `sweep-booking-steps.mjs` walks all seven steps and stops ON the
  review step, so until this landed, the one action the product exists for was
  exercised by no test at any level. It books in a real browser, checks the row
  against what the price bar printed, reads the project's **edge-function
  logs** for both sends, asks `available-slots` whether the slot is held,
  accepts the request on the dashboard, then reschedules and cancels from the
  receipt page and watches the slot come back.
  **IT WALKS TWO TENANTS AND THAT IS THE POINT.** `demo-detail` is REQUEST mode
  and the only business anything can sign into, so it gets the dashboard leg;
  `demo-riverside` is RESERVE mode, which is the schema default and what every
  real tenant has. **Running only the demo is what hid a white-screen crash on
  `main` for four days** — `StepLocation.jsx` never destructured its
  `modeLimit` prop, and the branch that reads it renders only for a business
  offering ONE of mobile and drop-off, which the demo is not. Same finding as
  always, in its widest form yet: **a configuration nothing seeds is a
  configuration nothing tests.**
  **THE EMAIL LEG IS THE PART NOTHING ELSE CAN DO.** `sendTenantEmail` is
  best-effort by design — an email failure must never fail a booking — so a
  dead relay is a `console.error` inside an edge function, invisible from every
  screen and every other suite. That is exactly how the 0.2 defect survived.
  This reads `function_edge_logs` and `function_logs` through the Management
  API, which needs `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF`; without
  them the leg prints **skip**, not pass. The customer address is Resend's
  `delivered@resend.dev` simulator (roadmap 0.3's own choice), so the send
  really reaches the provider at no cost to the sending reputation the live
  business shares. **A tenant's owner alert falls back to
  `businesses.contact_email` when `notification_emails` is empty** — keep every
  seeded one on a reserved domain, or the demos hard-bounce against that same
  reputation, which they did until this item.
  `--slug=<one>` runs a single tenant, `--keep` leaves the booking behind,
  `--headed` shows the browser.
  **AND IT REPORTS ONE FAILURE THAT IS NOT A REGRESSION, AS OF 2026-09-05 —
  READ THE MESSAGE BEFORE BISECTING.** *"the booked day is offered to move
  within"* fails on whichever tenant's run picks a day the seed has already
  half filled: `available-slots` has NO exclusion parameter, so it counts the
  booking BEING MOVED as occupied, and a day whose only free room is that
  booking's own slot drops out of its own reschedule picker. **Real, in code
  roadmap 2.20 did not touch, date- and occupancy-dependent, and written up as
  item F under "Not on the roadmap yet"** — the fix is one optional
  `exclude_booking_id`, and it is a change to the customer booking path, so it
  gets its own item.
  **The reason it used to print TWICE is the transferable part:** the
  assertions after it asked about the ORIGINAL date whatever day the script had
  actually clicked, so one root cause produced a second failure — *"16:30 is
  taken"* against a date the booking had just left — pointing at the slot
  engine rather than at the one thing that went wrong. It follows the day it
  clicked now. **A leg that reports the wrong half costs more than one that
  reports nothing.**

- **The check for anything that changes the BOOKING WIDGET:
  `node scripts/sweep-booking-steps.mjs`.** Same dev server, no login (the page
  is public). It walks every step at all four verification sizes, fills the form
  in as a customer would, and reports how far each step runs past the bottom of
  the screen AND how much room it has to spare. That is roadmap 2.7's W16 — the
  owner's rule that a customer should never scroll inside a step — and the
  script exits 1 while anything overflows, so it is the definition of done.
  `--lite` runs the `?lite=1` path; `--shots=DIR` saves the PNGs.
  **IT WALKS FIVE MORE THINGS SINCE ROADMAP 2.14 STEP 3, and three of them are
  STATES rather than pages** — the flow with `?plan=`, step 1 for a customer
  the DEVICE remembers, and BOTH AT ONCE, which is the returning member and
  therefore the ordinary case for the whole feature. None is reachable by
  walking, which is the
  same gap this file records nine times: *the script walks NAVIGATION, and a
  state you reach by pressing something INSIDE a screen is not navigation.*
  They were added in the change that BUILT them.
  **The fourth, `/plan/:memberId`, needs a membership UUID and this script is
  the customer — no session, no service key.** So `seed-demo.mjs` writes
  `scripts/demo-refs.json` (gitignored) and the sweep reads it; **missing or
  stale, the run PRINTS that the page was not measured** rather than passing
  quietly.
  **AND TWO OF THEM ARE MEASURED BUT NOT GATED** — the plans page and the
  member page. W16 is the owner's rule about STEPS, because scrolling inside a
  form you are halfway through is what loses a booking; a catalogue of plans is
  a page, its length is the detailer's, and all ten plan pages in the research
  sample scroll. The number is still printed as `scrolls Npx`, because "it
  scrolls" and "it scrolls by 600px" are different facts.
  **AND `SLOTPROBE=1` PRINTS THE DAY WALK AND EVERY `available-slots` RESPONSE
  — new 2026-09-03, and it is the thing to reach for FIRST if this script ever
  fails on step 5.** It was added while fixing two races that had made the
  script fail on about half its runs; the diagnosis cost most of a session and
  none of it would have been needed with this switch.
  **THE TWO RACES, because the shape of them is the reusable part.** The
  script picked days by INDEX against a live locator, and choosing a day
  re-renders the calendar — every day that cannot hold the chosen service greys
  out, which is correct product behaviour — so `days.count()` fell to 0 and the
  loop gave up after ONE day. **It had been passing by luck**: while today
  still had a free slot it exited on the first iteration and never reached the
  bug, and it began failing at ~22:00 local when the demo's own trading day
  (08:00–18:00) closed. The second race was one level up: the month's open days
  come from an availability call, so enumerating them straight after `settle()`
  could read an EMPTY grid and conclude the business was shut. Both are fixed —
  days are addressed by their date and re-queried after every render, and the
  grid is waited for before it is read. **`settle()` is a CAP and a fine one on
  a repaint; it is not a wait for a network round trip.**
  **AND THE PROCESS LESSON, which cost more than the bug: RUN THE CONTROL
  BEFORE BLAMING THE DIFF.** This failure appeared in the same minute as an
  unrelated CSS change and looked exactly like its fault. Reverting that change
  and watching the script fail identically is what proved it innocent, in one
  run.
  **Read the spare room, not just the pass.** Both step 1 and step 3 are the
  TENANT’S budget, not ours, and both were re-measured in roadmap 2.8b against
  the demo reshaped into the owner’s own menu — two categories of three.
  **W21, W25, W9, W10, W22 and W27 are all BUILT as of 2026-08-31**; what
  follows are the numbers that replaced the ones this file used to quote.
  **STEP 1’S TIGHTEST SCREEN IS 1440x900, NOT THE PHONE**, and every older note
  in this repo says otherwise. A service card is 84px there against 74px at
  392, because `.bk-card`’s padding clamps up, and 900px is the shortest screen
  we verify. Six services in two categories: **10px spare at 1440x900**, 47px
  at 392x844. A seventh breaks the laptop first. **STEP 3’S VEHICLE-SIZE
  CEILING IS FOUR, not the six roadmap 2.8 measured** — that figure was taken
  before W27’s condition question landed on the same step, and it costs 120px.
  Four sizes: 39px spare at 392, 23px at 1440. Five: over by 40px and 66px.
  Past four, `StepVehicle` draws a drop-down instead of cards, so a longer list
  is supported and simply stops being boxes.
  **UPDATED AGAIN BY ROADMAP 2.8c.** Step 4 now carries the travel-area
  picker and went 6px OVER on a phone when it landed; it is back to **52px
  spare at 392 and 74px at 1440x900**, won by cutting a line that restated the
  step’s own heading. Step 1 is unchanged. **Both times height was won back
  from COPY, not layout — when a step overflows, look first for the sentence
  that is already on the screen.**
  **The lesson under all of it: a spare-room figure is only true of the screen
  AND the feature set it was taken with.** Quote both, or the number rots.
  **EVERY FIGURE ABOVE IS A PORTRAIT FIGURE, AND PORTRAIT IS THE ONLY SHAPE
  THIS PRODUCT SUPPORTS.** Measured 2026-08-31: `sweep-booking-steps.mjs
  844x390` reports **all eight steps over, the worst by 467px — 120% of the
  screen, on step 1.** **The owner ruled the same day that phones are portrait
  only and that rotating one must change nothing**, so W16 is a PORTRAIT rule
  and those numbers are not a defect list. Roadmap 2.16 was opened for them and
  **closed by him unstarted**; the figures live there so nobody re-measures
  them and files them as new.

- **THE EMAILS ARE LIGHT-FIRST WITH A DARK VARIANT, AND THAT IS MEASURED
  RATHER THAN CHOSEN (roadmap 2.18, 2026-09-03).** They shipped dark-first; the
  owner opened them on real devices and **Gmail's dark mode inverts an
  already-dark email and cannot be told not to** — it ignores `color-scheme`
  and `prefers-color-scheme` alike. Measured on our own palette by applying
  Gmail's transform: the accent as words **10.07:1 → 1.99:1**, the button's ink
  **10.88:1 → 1.77:1**, against a 4.5:1 floor. **Unfixable by palette** —
  inversion barely moves a mid-lightness accent while swinging its near-black
  ink to near-white, and all four accents tested fail.
  So: **every colour is INLINE and LIGHT** (`--paper`, the design system's own
  light band), and **one `<style>` block keyed on `prefers-color-scheme: dark`**
  swaps in `--ink-0`. Apple Mail — ~60% of opens — still shows the dark design.
  A client that strips `<style>` shows a complete light email, so nothing
  depends on that block.
  **THE FAILURE MODE THIS CREATES: the dark palette applies BY CLASS**, so an
  element that sets a colour inline and forgets its class stays LIGHT inside a
  dark email — and no contrast check can see it, because both values are
  individually fine. `render-emails.mjs` walks the rendered output and fails on
  any inline colour without a class. **Add the class when you add the colour.**
  **And pure `#ffffff`/`#000000` are banned in BOTH palettes** — Apple Mail
  treats either as permission to invert the whole email, which is the one way
  to make Apple Mail behave like Gmail.
- **AN ADJUSTMENT CAN BE NEGATIVE, AND `moneyBlock` DRAWS BY `kind` RATHER
  THAN BY SIGN — fixed 2026-09-04, and it was older than the item that found
  it.** A −$120 line with no `kind` printed as a $120 CHARGE while the total
  was $120 lower, so the column silently stopped adding up. `accept-quote`
  could already reach it: it pushes a *"Quoted discount"* line whenever a
  detailer quotes UNDER the original estimate. Roadmap 2.14's plan line made
  it the ordinary case. **Fixed in `quoteLines`, the one place every
  adjustment reaches the page** — the same shape as the invoice that missed
  its total by exactly the promo. **When you add a money line anywhere, set
  its `kind`; a sign is not a kind.**
- **THE EMAILS ARE REBUILT AND LIVE (roadmap 2.18, 2026-09-03).** The old
  ~530-line `emailTemplates.ts` is gone. **`_shared/emailKit.ts` is the world** —
  the ground, the design-system tokens, the blocks and the shell, with the
  email-client constraints in its header. **`_shared/emailTemplates.ts` is the
  twelve templates**, each one a LIST OF BLOCKS rather than an HTML literal.
  **`emailDarkBrandColors` is a SECOND export beside `emailBrandColors`**, which
  is untouched — the paper function is what 138 of the checks were written
  against and editing it turns a green suite red for unrelated reasons.
  **A template is a list of blocks and that survived the editor being
  scrapped**: it buys twelve consistent templates, and — the better reason —
  **the plain-text half of every email is ONE derived pass (`htmlToText`)
  rather than twelve twins that drift.** HTML-only sending was a live
  spam-filter defect until this item; `send-email` sets `text` now.
  **`reconcile(lines, total)` is why the money adds up**, and it is structural
  rather than a promise: both money templates pass their lines through it and
  it draws any remainder as its own line. **`bookings` has no `site_discount`
  column** — the amount is baked into `subtotal` at booking time — so the site
  sale and the rounding are drawn by `reconcile`, and only the promo is
  itemised by name.
- **THERE IS EXACTLY ONE COMMERCIAL EMAIL AND IT OBEYS A DIFFERENT SET OF
  RULES — roadmap 2.19, 2026-09-05.** Twelve of the thirteen templates are
  TRANSACTIONAL: the customer asked for them by booking something. The
  thirteenth, `campaignEmail`, is a detailer picking names off their own
  Clients list and typing a sentence. **CAN-SPAM classifies a message by its
  PRIMARY PURPOSE, never by what pressed send**, so it needs a postal address
  and a working opt-out exactly as an automated blast would — the roadmap
  entry's *"most of that machinery goes away"* is true of the SCHEDULING and
  false of the statute. Both ride `shell`'s optional `legal` argument, which
  is absent everywhere else; `tests/campaign.test.mjs` asserts the campaign has
  them AND that a booking confirmation does not.
  **NOTHING SENDS IT. That is the owner's line and it is the whole design** —
  no cron, no segments, and the *"14 haven't been back"* nudge is a ROW ON
  TODAY, never an email to the detailer. **If the nudge ever becomes an email,
  re-read this paragraph.**
  **THE OPT-OUT IS TWO STEPS ON PURPOSE.** A one-click GET link is followed by
  Gmail's prefetcher and by every corporate link scanner — each would silently
  opt a customer out of a business they still want. `/unsubscribe/:customerId`
  READS; a human presses the button that WRITES.
  **`businesses.mailing_address` IS NOT `dropoff_address`** — a mobile detailer
  has no unit, which is exactly who this product is for — and `send-campaign`
  refuses to send without it.
  **THE 50-PER-PRESS CAP IS ABOUT BOOKINGS, NOT SPAM.** Resend's free plan is
  **100 emails A DAY ACROSS EVERY TENANT** and the transactional set spends ~5
  a booking, so an unbounded campaign could stop confirmations going out — and
  it would present as *"the booking page is broken"*. The 550ms gap is Resend's
  2-per-second rate limit; this is the only place in the repo that sends in a
  loop. **Raise the cap when the platform has its own Resend account** (2.18's
  open thread, priced in 2.20).
  **AND THE DEMO HAD ZERO LAPSED CUSTOMERS UNTIL THIS ITEM**, so the
  `Clients · not seen in 3 months` block the width sweep has walked since
  2026-09-02 was measuring an empty screen and printing `clean`. Five are
  seeded now — one with no email, one opted out, one with a long name for the
  chip wall at 320. Same family as everything else in this section.
- **A GUARD THAT SKIPS MUST PRINT, AND THE CLIENTS BLOCK IS WHAT PROVED IT —
  2026-09-04, roadmap 2.20.** Every state in `sweep-widths.mjs`'s Clients block
  is drawn from a Supabase read and the block opened with `settle()` then
  `count()` — the race this file already records for Monthly plans and Team,
  in the one block nobody re-checked when that lesson landed. **In `--lite` it
  lost at THREE of five widths**, and because every state there is guarded by
  `if (await ...count())`, the sorts, the lapsed filter, the compose sheet, the
  client record and the job from its history simply **did not happen**: the run
  printed `Clients · the list   clean` and moved on. **Six measurements
  vanishing is byte-identical to six measurements passing.**
  **IT WAS FOUND ONLY BECAUSE A NEW STATE PRINTED `NOT MEASURED` INSTEAD OF
  SKIPPING.** That is the whole lesson and it is cheaper than any of the fixes
  in this file: **when you add a state to a browser script, give its `if` an
  `else` that says it did not run.** A skipped check reads exactly like a
  passing one — this repo's most repeated finding — and one `console.log` is
  the entire cure.
  **The mechanical half is worth knowing too: `appear()` was declared
  immediately before the settings walk**, so a `const`'s temporal dead zone put
  it out of reach of the Clients block two hundred lines earlier — the helper
  written to fix this exact race could not have been called at the site that
  still had it.
  **"HIGH UP" WAS NOT HIGH ENOUGH AND IT HAPPENED AGAIN — 2026-09-05.** It was
  still inside the width LOOP, so the pricing block six hundred lines above it
  could not call it either, and that block then lost the same race. **It is at
  MODULE scope now**, beside `settle()`. It closes over nothing and never
  needed to be in the loop. A helper that exists to fix a race is worthless at
  every call site that lexically precedes it, and this is the second time that
  sentence has had to be written.
- **A REJECTED SEND IS A FACT ABOUT THE CUSTOMER, NOT AN ENTRY IN A LOG —
  roadmap 2.20, 2026-09-04.** `sendTenantEmail` is best-effort by design (an
  email failure must never fail a booking), so until this item a provider
  rejection was a `console.error` inside an edge function and **the first
  symptom was a customer saying they never got their confirmation.**
  `customers.email_failed_at` / `email_failed_reason` are stamped by
  `send-email` **on a 4xx only** (a 5xx is the provider having a bad day, not
  this address being wrong — stamping it would put "this address bounced" on
  every customer emailed during a Resend outage, which is the fastest way to
  teach a detailer to ignore the flag) and **cleared by the next successful
  send** — the asymmetry with
  `unsubscribed_at` is deliberate and is the whole design: **an opt-out is
  permanent until a human undoes it; a bounce must clear itself**, or a
  detailer who fixes a typo is told forever that the address they just
  corrected is broken and the flag becomes something to ignore.
  **THERE ARE NOW THREE WAYS TO BE UNREACHABLE** — no address, opted out,
  bounced — **and three places ask the question**: Clients' `emailable` count,
  `CampaignModal`'s, and `send-campaign`'s `eligible` filter. **The last one is
  the enforcement and the other two are courtesy**, because a caller can post
  ids straight at the function. `tests/payments.test.mjs` § 6 holds the
  predicate so they cannot drift, and **"nobody is quietly dropped" applies**:
  a person who is both opted out and bounced is counted once.
  **A "failed emails" SCREEN was the obvious build and was refused** — a place
  you have to remember to visit, about a problem you only ever care about one
  person at a time. It is drawn under the address on the client sheet, which is
  the only place in the product that prints a customer's email. **The job
  record does not print one at all**; if it ever does, the line belongs there
  too. The QUOTA half needed nothing — Resend already emails at 80% and 100%.
- **THE PRICING PAGE IS THE LEGALLY LOAD-BEARING HALF OF THE CHECKOUT, NOT
  DECORATION IN FRONT OF IT — roadmap 2.20 stage 2, 2026-09-05.** `/pricing`
  (`app/src/landing/PricingPage.jsx`) carries the two plans, the three ways to
  pay and the founding price. **California's AB 2863 requires the
  auto-renewal terms, the twelve-month commitment and the early-exit fee to be
  clear and conspicuous BEFORE billing details are taken**, and there are no
  billing details on this page — which is exactly why it is where "before"
  happens. **A session that moves a disclosure onto the checkout breaks the
  ordering the statute cares about.**
  **NOTHING IS PRE-SELECTED AND THE LADDER'S SHAPE IS WHAT GUARANTEES IT.**
  The FTC sued Adobe in June 2024 over the PRESENTATION of an exit fee, not the
  fee: a pre-selected plan, the commitment in fine print, an obstructed
  cancellation. Three cards side by side invites a highlighted middle, which is
  a pre-selection in everything but name — so the three ways to pay are three
  RULED RUNGS and **there is no selection state on the page at all**. Do not
  "improve" it into a radio group with a sensible default, and never add
  *"most popular"*: with no customers it is a claim we cannot substantiate as
  well as a pre-selection in disguise. `landing-pricing` 7b fails on both.
  **EVERY FIGURE, INCLUDING THE TERM AND THE FEE, COMES FROM `pricing.js`** —
  `term: { months: 12, exitFeeShare: 0.5 }` — because the checkout will CHARGE
  what this page PRINTS. **And each rung's headline figure is what leaves the
  BANK**, never an "effective monthly": $600 a year, not $50 a month. The
  saving is in MONTHS FREE, which is also the only framing that works for both
  columns — as an effective monthly the founding annual is $33.33.
  **THE FOUNDING LADDER IS DERIVED, NOT DECIDED**: $400 and $50 are the list
  ladder's own two rules (2 months free, +25% for no commitment) applied to
  $40, and the test pins the RULES so the owner is told whether a new number
  still makes sense rather than that it changed.
  **THE PAGE NOW PROMISES DUNNING BEHAVIOUR NOTHING IMPLEMENTS** — two weeks of
  retries with an email each time, then the site goes offline until paid,
  nothing deleted. That was research plus his ruling on non-payment; it is a
  printed promise now and the checkout is bound by it.
  **The tick is deliberately at the CHECKOUT and not here**: consent has to be
  stored with the subscription at the moment of purchase, and consent gathered
  on a marketing page and carried through a signup flow is consent that can be
  lost.
- **A DETAILER CAN NOW BUY, AND NOTHING HAS EVER TALKED TO STRIPE — roadmap
  2.20 stage 2's second half, 2026-09-05.** `platform_subscriptions`,
  `platform_invoices` and `stripe_events` exist and are applied;
  `platform-billing` (owner-only) and `stripe-webhook` (public) are deployed;
  `screens/more/Billing.jsx` is the FIFTEENTH settings screen, behind the gear.
  ~~**`stripeConfigured()` is FALSE on every deployment today**~~ **IT IS TRUE
  AS OF 2026-09-05 — the owner opened a Stripe TEST account and the whole thing
  was exercised end to end**: a real Checkout session paid with `4242…`, four
  webhook events, the row `active` with the price snapshotted and the consent
  stored, and a test-clock run that took a second tenant from `past_due` to
  `suspended` with its booking page genuinely offline. `STRIPE_SECRET_KEY` and
  `STRIPE_WEBHOOK_SECRET` are **Supabase function secrets on the platform
  project** (never in a file), and the webhook endpoint was registered through
  the API rather than the dashboard. **The account is not ACTIVATED**, so no
  real money can move; swapping the test keys for live ones in December is the
  only change.
  **FOUR THINGS THE LIVE RUN TAUGHT THAT NO AMOUNT OF READING WOULD HAVE:**
  **(1) Stripe's default end-of-dunning is a CANCELLATION, not `unpaid`** — the
  setup notes tell the owner to change that, and on a fresh account it is not
  changed. The run survived only by event ordering, and the other order left a
  row saying `canceled` while the page was dark and `dunningState()` said
  nothing was wrong. **`suspended_at` outranks the status word now.**
  **(2) `invoice.charge` IS AN ID, so the decline reason was ALWAYS null** —
  `asObj(invoice.charge)` on an unexpanded invoice is `{}`. It looked correct
  and the email simply never printed the line a detailer can act on. One extra
  call fetches the charge, preferring `failure_message` over
  `outcome.seller_message`, which is often *"the bank did not return any
  further details"*.
  **(3) THE PINNED API VERSION IS LOAD-BEARING AND IT IS NOW MEASURED: at
  `2024-06-20` an invoice carries `charge` and `payment_intent`; at this
  account's newer default it carries NEITHER.** The webhook endpoint is
  registered at the same version, and the two must move together.
  **(4) Stripe Tax refuses the WHOLE session without a head office address**,
  in test mode too — a dashboard setting, which this item has now refused three
  times to let be load-bearing. `subscribe` falls back without automatic tax and
  returns the reason; the fallback cannot under-collect, because a registration
  requires that address anyway. **The owner's 60 seconds:**
  https://dashboard.stripe.com/test/settings/tax
  Test § 16 pins all four.
  **AND HIS ANSWER TO (1) CREATED A DEAD END, FIXED THE SAME DAY.** He left
  Stripe's end-of-dunning default alone (*"ima have that the same for now"*), so
  a subscription is CANCELLED when the retries run out — **and there is then no
  invoice left to settle.** The suspended screen offered *"Update card"*, which
  fixes nothing, and the suspended email promised the page comes back *"the
  moment a payment goes through"*, which a card cannot deliver. **`summary`
  returns `restartable` now**: the screen shows the ladder again with a line
  saying the last subscription ended and nothing is owed from before,
  `subscribe` allows that restart (**it answered 409 — a way back that does not
  work is worse than no way back**), and the email says *"Put your page back
  online"*. **A DELIBERATE cancellation is told apart by columns that already
  existed** — our cancel button sets `cancel_at_period_end`, dunning never
  does — so somebody who quit on purpose is not shouted at. **If the setting is
  ever changed to "leave unpaid", none of this breaks**: the test is whether a
  chargeable subscription still exists, so the card comes back by itself.
  Test § 17.
  **HIS OTHER TWO ANSWERS, so nobody re-asks:** no business address until
  December (so Stripe Tax stays off and the NEXUS MONITOR is what is actually
  deferred), and he DECIDED NOT to roll the test key that was pasted
  into the chat — *"it's just a sandbox one, I'm fine with it being in the chat
  history"* — **which is correct and is not to be re-raised.** A `sk_test_` key
  reaches test mode only: no real card, no real customer, no real payout.
  **The LIVE key is a different object and the rule is absolute**: it never
  appears in a chat, a file, a commit or a log, and goes straight onto
  Supabase's secrets page in December.
  **THE CHECKOUT IS OURS AND THE CARD FIELDS ARE STRIPE'S — his choice between
  Stripe's three shapes, 2026-09-05.** *"An option to just I make / we make the
  like gui thing, so I chose that one so it can look like the rest of the
  website."* The hosted page at `checkout.stripe.com` is gone: `subscribe`
  (renamed from `checkout`) creates a Subscription with
  `payment_behavior: "default_incomplete"`, hands back a client secret, and
  `Billing.jsx` mounts Stripe's **Payment Element** inside our own card.
  **THE CARD FIELDS ARE STILL AN IFRAME ON STRIPE'S ORIGIN, so the PCI position
  is IDENTICAL** — no card number reaches this product, this server, this repo
  or any log. Only the frame moved, and the sentence under the button says so.
  - **`app/src/lib/stripejs.js` injects `js.stripe.com/v3` and there is no npm
    package on purpose.** Stripe REQUIRES the script come from their origin and
    forbids bundling a copy; `@stripe/stripe-js` is a ~2 KB wrapper around
    exactly that injection, and this frontend is four dependencies.
  - **`appearanceFromTokens()` READS THE LIVE PAGE.** Stripe's Appearance API
    takes concrete values — it cannot resolve `var()` across origins — so the
    obvious version is a second hand-written palette, which is the drift the
    design system exists to prevent. Reading `getComputedStyle(<html>)` at
    mount means the form follows a token rename and follows **the tenant's own
    accent**, which `lib/theme.js` writes at runtime.
  - **`product_data` is accepted by Checkout Sessions and REJECTED by the
    Subscriptions API.** `productFor()` finds-or-creates a Product by
    `metadata.tag === "dp-line"`. **The Product carries only the NAME;
    `unit_amount` is still sent from this repo on every call.**
  - **THE CARD DETAILS CAME BACK NULL, and it is the failure mode to expect
    from every hosted page removed later**: they were filled from
    `checkout.session.completed`, **and with our own form that event never
    fires**. `subscriptionChanged` reads `default_payment_method` and fetches
    the card itself. Nothing broke; an event simply stopped arriving.
  - **STILL STRIPE'S, VISIBLY:** the payment-method tabs carry Stripe's own
    promotions (a green *"$5 back"* on Bank, Klarna, Cash App). Dashboard
    settings, not repo settings, **left alone deliberately** — restricting to
    cards costs conversion and is his call with real numbers.
  - **THE LIMIT OF THE PROOF:** the browser tool cannot type into a
    cross-origin iframe, so **no session has typed a card number into this
    form.** Proven: it mounts, is styled from live tokens, measures clean at
    all five widths, and `subscribe` returns a real secret for a real $539 —
    and that same PaymentIntent, confirmed server-side with `pm_card_visa`,
    went `succeeded` → webhook → `active`, `$539 paid`, `visa ···· 4242`.
    **Unproven: `stripe.confirmPayment` and 3-D Secure**, which need a human at
    a real browser. Test § 18.
  **THE ONE RULE THAT OUTRANKS EVERYTHING ELSE HERE: the page PRINTS and the
  server CHARGES, and one pure module does both.**
  `supabase/functions/_shared/platformBilling.ts` holds the price table,
  `planFor`, `lineItemsFor`, `consentSentence`, `exitFeeCents`, the Stripe
  status map and the dunning words. **It is the SECOND copy of
  `app/src/landing/pricing.js`** — a Deno bundle will not follow an import out
  of `supabase/`, the same wall that forced `_shared/brandColor.js` — and
  `tests/platform-billing.test.mjs` (263 checks — measured, not estimated) pins the two tables value by
  value AND ties every rung to the money on the wire. **This is the first place
  in the product where "a number PRINTED is not a number CHARGED" is literally
  true rather than a metaphor.**
  **THE SCREEN DOES NO ARITHMETIC ABOUT MONEY.** Every figure, the consent
  sentence and what cancelling costs today come from `platform-billing`'s
  `summary` action, so the words a detailer reads and the words stored against
  their subscription are produced by the same call to the same function. `summary`
  needs no Stripe key, which is the whole reason the screen could be built and
  looked at months before there is an account. **Do not "simplify" it into a
  client-side calculation.**
  **EVERY PRICE IS SNAPSHOTTED ON THE ROW AND NEVER RE-READ.** `pricing.js` is
  what the page prints today and it will change; a subscriber's price is fixed
  at the moment they agreed to it. The exit fee is the sharp case —
  recomputing it from a later config turns a $240 fee into $360.
  **`consent_text` STORES THE WORDS, NOT A BOOLEAN.** A `true` proves somebody
  ticked something; the sentence they ticked is what answers a chargeback, and
  a chargeback is the actual risk the whole AB 2863 / Adobe reading exists to
  manage. The sentence is GENERATED from the snapshot, so a client cannot post
  a friendlier one than it showed.
  **SUSPENSION IS `businesses.status = 'paused'` AND NOTHING ELSE — it was
  already built.** `businessBySlug` and `get_public_business_profile` filter on
  `status = 'active'`, so one column darkens the PUBLIC booking page;
  `businessById` does not, so a customer who already booked keeps the page they
  cancel and reschedule from, and the dashboard is reached by membership so the
  detailer keeps every row. **That is the pricing page's printed promise
  exactly, and it is roadmap 4.4's suspend built once.** The webhook guards it
  both ways — it only pauses an `active` business and only reactivates one it
  paused.
  **THE WEBHOOK IS DEPLOYED WITH `verify_jwt=false` AND THAT IS LOAD-BEARING.**
  Stripe has no Supabase JWT; with verification on, the gateway rejects every
  event before the function runs and **the whole dunning mechanism silently
  does nothing** — unpaid for two weeks, no page ever offline, no error
  anywhere. It is safe because **the signature IS the authentication**:
  `verifyWebhook` runs first, over the RAW body (`req.text()`, never
  `req.json()` — the MAC is over bytes), with a timestamp tolerance, and
  `stripe_events` is an insert-first idempotency lock because Stripe
  redelivers. Test § 8 and § 11 pin all of it. `stripe-webhook` is in
  `deploy-functions.mjs`'s `PUBLIC_FUNCTIONS`; **`platform-billing` is not.**
  **AN UNKNOWN STRIPE STATUS MAPS TO NULL AND THE CALLER KEEPS WHAT IT HAD.**
  Defaulting to `active` gives the product away; defaulting to `suspended`
  takes a paying detailer's site down because Stripe shipped a feature we do
  not use.
  **THE PORTAL IS PINNED TO THE CARD-UPDATE FLOW ON PURPOSE.** Stripe's own
  portal would let somebody cancel from it, skipping the exit fee and our
  `canceled_at`. **The cancel button stays ours and stays ONE PRESS behind ONE
  confirm** — AB 2863 requires it and it is the fourth item on the FTC's Adobe
  list — with the fee printed BEFORE the press. Never move it behind support,
  a reason picker or a retention offer.
  **INLINE `price_data`, NEVER STRIPE PRODUCT IDS.** An id puts the amount in
  another company's admin panel where nothing in this repo can see it. It is
  also zero Stripe dashboard setup for the owner to get wrong.
  **AND `_shared/` MODULES A NODE SCRIPT IMPORTS MUST STAY NODE-LOADABLE.**
  Two ways to break that were hit in one session: a TypeScript **parameter
  property** (`constructor(msg, readonly status: number)`) cannot be
  type-STRIPPED, only transformed, so `StripeError` made the signature check
  unimportable; and importing `config.ts` reads `Deno.env` **at module scope**,
  which made every email unrenderable from `render-emails.mjs` — hence
  `platformBrand.ts` takes `siteUrl` as an argument.
- **`shoot-dashboard.mjs --url pricing` SHOOTS A PUBLIC PAGE, and two things
  about it are not obvious — added 2026-09-05 because the owner is reading
  sessions on a phone and nothing in this repo could photograph `/` or
  `/pricing` for him** (`sweep-widths.mjs` walks them and only MEASURES;
  `sweep-booking-steps.mjs --shots` knows the booking flow alone).
  **DROP THE LEADING SLASH.** Git Bash rewrites `--url /pricing` into
  `C:/Program Files/Git/pricing` before node sees it — MSYS path conversion —
  and the error names a path nobody typed. The script normalises both forms
  now; `MSYS_NO_PATHCONV=1` is the other half.
  **AND `fullPage: true` IS UNUSABLE ON THE LANDING SURFACE.** It stitches
  viewport slices and `.ground` is a `position: fixed` layer, so every slice
  after the first comes back EMPTY: the first shot of `/pricing` was 3,455px
  tall with the bottom four fifths blank while a live browser at the same
  moment showed three rungs at `opacity: 1` with real text. **A blank
  screenshot of a working page is worse than no screenshot** — it is a bug
  report about something that is not broken, and on this surface it also looks
  exactly like the `data-rv` reveal defect this repo has already had. The
  branch grows the viewport to the whole document and takes ONE frame, and
  forces `.in` on every `[data-rv]` first because a `fullPage` capture never
  scrolls and so never triggers a reveal.
- **A STRUCK PRICE IS ONLY EVER A REAL LIST PRICE, ON EVERY SURFACE — the
  owner, 2026-09-05: *"it should visually show like the discount price vs the
  regular price for the founder spots."*** He was right about an inconsistency
  INSIDE `/pricing` rather than a missing feature: the build fee already
  printed `~~$999~~ $499` and the three rungs under it printed the founding
  figure alone, so the page taught a reader what a discount looks like and then
  stopped. **Both `/pricing` and the dashboard's own ladder strike now**, and
  the dashboard needed a server change to do it — `summary` resolves `quotes`
  to ONE column, so it returns `list_recurring_cents` / `list_setup_cents`
  computed by the same `planFor` at `founding: false`.
  **THE RULE, WHICH IS OLDER THAN THIS ITEM AND DOES NOT SOFTEN ANYWHERE:** a
  strike is a REAL price the product charges somebody, never an anchor typed in
  to make the other number look smaller (`LandingPage.jsx` has carried that
  sentence since 2.2). **The screen's test is whether the two figures DIFFER**,
  not whether the account is founding, so nothing is struck when there is no
  saving. `landing-pricing` 6b pins all four figures and the guard;
  `platform-billing` § 15 pins the server half and that every founding figure
  really is lower.
  **AND `theme.css`'s `.was` IS ANCHORED ON `.card`, AFTER TWO WRONG TRIES THE
  TESTS CAUGHT.** `.figure .was` matched three of the four sites and the fourth
  printed `$999$499` with no gap — a rule losing silently. Bare `.was` fixed
  that and failed `composition` 4b, because theme.css is GLOBAL and
  `landing.css` has its own `.was`.
  **`seed-demo.mjs` SEEDS THE DEMO AS `plan_tier: 'founding'`** so the struck
  prices are the DEFAULT swept state — a strike only exists on a founding
  account, and seeded standard the whole treatment would be measured nowhere.
  It costs one of the three spots, so `founding_offer()` reads 2 of 3.
- **A SCREEN WAITING ON AN EDGE FUNCTION IS PERFECTLY QUIET, AND BOTH
  `settle()`s USED TO RETURN ON IT — fixed 2026-09-05, and it is the widest
  form yet of "a skipped check reads like a passing one".** No spinner, no
  animation, a still DOM: `sweep-widths.mjs` and `shoot-dashboard.mjs` both
  settled on a card reading *"Checking your subscription…"* and the shooter
  sent the owner a photograph of a loading line. **Both now also wait for
  `[data-loading]`**, which `Billing.jsx` carries and which costs no pixels.
  **When you build a screen whose content comes from an edge function rather
  than from a table, put `data-loading` on its loading state** — the two
  `settle()`s are the only readers and every browser script in the repo gets it
  for free. `appear()` remains the right tool for one named control; this is
  for the whole screen.
- **AND THE MONEY ON A SCREEN IS A FIGURE — law 8, broken on the first screen
  built after it was written (2026-09-05).** `docs/design-system.md` law 8:
  *"A price set in the body face is a bug."* Billing's ladder obeyed it while
  the `.facts` breakdown four rows below set `$1,059`, `$999` and `$60` in
  Archivo — one card, two money faces. **`v strong num` is the house spelling**
  (`SetupForm.jsx`, `Today.jsx`), and the sharpest instance was the early-exit
  fee at 13px in `--fog` mid-paragraph above a red button: **the largest
  unexpected number in the product, set as an aside.** A figure a person is
  about to be charged gets its own row.
- **AN EXIT-FEE INVOICE IS NOT A RENEWAL, AND UNTIL THE SECURITY REVIEW IT DROVE
  THE DUNNING STATE MACHINE — 2026-09-05, roadmap 2.20 stage 2, and it is the
  one exploitable defect that item produced.** `platform-billing`'s `cancel`
  raises a ONE-OFF Stripe invoice for the early exit and it carries
  `metadata.business_id`, so the webhook resolved it to a business exactly as it
  would a monthly renewal. **PAYING it cleared the whole dunning state and
  brought a SUSPENDED booking page back online with the subscription still
  unpaid**; and because **a manual invoice has no retry schedule,
  `next_payment_attempt` is null on its FIRST failure** — the one signal that
  means "the two weeks are up" — **a declined exit fee took a fully paid
  detailer offline immediately** and emailed them that their site was down. The
  second needs no attacker.
  **`isSubscriptionInvoice()` is the guard and it tests the invoice's own
  `subscription` field, never the metadata**, so it covers the next one-off
  somebody adds. **A one-off is still MIRRORED onto the receipts list — it is a
  real charge — it simply cannot move the account's state.** Test § 14 pins
  both handlers applying it, and that the guard sits AFTER the mirror.
  **THE OTHER FINDING IS THE TRANSFERABLE ONE: the portal's lock lived in
  STRIPE'S DASHBOARD while the file's comment claimed it did not.** `flow_data`
  decides where a customer LANDS; the portal CONFIGURATION decides what they can
  reach around it, and that is admin-panel state nothing here can read — **the
  exact failure this same item had rejected one screen earlier** when it refused
  to let Stripe's own emails be the only ones sent. `cardOnlyConfiguration()`
  creates it from code now, with cancel, plan-change and customer-edit off.
  A portal that offers cancellation is a twelve-month term left without the exit
  fee ever being charged.
  **And four smaller ones, all pinned:** `?? "active"` on an unknown Stripe
  status at checkout (it is `?? "incomplete"` — the safe direction costs a
  refresh and cannot give the product away); a late `invoice.paid` reviving a
  CANCELLED subscription, because Stripe promises no event ordering;
  re-subscribing leaving the previous cycle's `stripe_subscription_id` on the
  row, which `cancel` and `resume` address Stripe by; and the exit fee recorded
  AFTER the call that could throw.
- **THE PLATFORM SENDS TWO EMAILS IN ITS OWN NAME NOW, AND THEY ARE THE ONLY
  ONES — roadmap 2.20 stage 2.** Thirteen templates are a detailer speaking to
  somebody; `billingEmail` (`failed` / `suspended`) is us telling a detailer
  their card stopped working. `_shared/platformBrand.ts` builds a `TenantBrand`
  for the platform so every block in `emailKit.ts` works unchanged, and
  **`send-email` takes an optional `sender_name`** — an email from *"Ridgeline
  Auto Detail"* telling Ridgeline their own card failed reads as phishing. That
  same flag stops the send being recorded against a CUSTOMER and drops the
  tenant Reply-To.
  **WE SEND THEM EVEN THOUGH STRIPE CAN.** `/pricing` prints *"we email you
  each time"* as a term of the contract, and Stripe's failed-payment emails are
  a checkbox in another company's dashboard — a printed promise resting on a
  setting nobody in this repo can read is resting on nothing. **The suspension
  half Stripe cannot send at all.**
  **THEY GO TO `businesses.contact_email`, NEVER `notification_emails`** —
  that list is where BOOKING alerts go and may be a shared inbox or a staff
  member; a declined card is not their team's business.
  **AND THE SENTENCE THAT MATTERS MOST IS *"nothing has been deleted"*.** A
  detailer whose page goes dark assumes their customer list went with it. The
  check asserting it originally tested the HTML and **passed with the sentence
  deleted from the body**, because the hidden preheader says it too; it is
  pointed at the plain-text half now, which `htmlToText` strips the preheader
  from. Baselining found that, not reading.
- **A `data-rv` ON A CONDITIONALLY-RENDERED NODE CAN NEVER REVEAL, AND NO
  CHECK IN THIS REPO CAN SEE IT — 2026-09-05.** `landing/thread.js` collects
  its revealables with ONE `querySelectorAll` at mount and that returns a
  **static** NodeList, so a node React adds later — when the founding lookup
  answers — is in no list, is never given `.in`, and sits at **opacity 0 for
  ever**. On the pricing page's first run that was the strip carrying the whole
  scarcity claim.
  **Why nothing caught it, which is the transferable part:** `?lite=1` reveals
  everything, so the lite path looked right; **an opacity-0 element still has a
  full box**, so `sweep-widths.mjs` measured it and printed `clean`; and no
  contrast test can measure a colour nobody is shown. **PUT THE REVEAL ON A
  WRAPPER THAT IS ALWAYS MOUNTED.** The landing page has never had this bug by
  LUCK — its founding flag sits inside an unconditional `.plan` that carries
  the `data-rv` — so `landing-pricing` 8e now holds the rule against both.
  **And `initThread()` runs on EVERY `.ld` page now**, guarded rather than
  copied: a second reveal system is the copy that rots. Its try/catch net puts
  the WHOLE PAGE into `.lite` on any throw, so one unguarded `null` costs a new
  page every animation it has and reports one line in the console.
- **`sweep-widths.mjs` SKIPS ANYTHING AN ANCESTOR ALREADY CLIPS — 2026-09-05,
  and it is a false-POSITIVE fix, which this file has not needed before.** The
  pricing page is the first page carrying the landing surface's `.ground` that
  the script has ever walked, and its two drifting lights (76vmax) and dot
  lattice (inset −8%) each measured ~150px past the right edge at 320 — inside
  a `position: fixed` layer with `overflow: hidden` over them. **This cannot
  hide a real defect**: a defect is content sticking out where it can be SEEN,
  and clipped is the definition of cannot be. It stops the check crying wolf on
  every run, and a check nobody reads is the same as no check.
- **GOOGLE SIGN-IN IS ALREADY BUILT AND IS SWITCHED OFF — do not build it
  again (roadmap 2.25, measured 2026-09-05).** `app/src/screens/Auth.jsx` has
  `withGoogle()` calling `signInWithOAuth`, Google's marque as inline SVG, and
  `useEnabledProviders()`, which reads GoTrue's `/auth/v1/settings` so **the
  button appears the moment the provider is enabled and never before** — no
  rebuild, and no button leading to "provider is not enabled". That endpoint
  answers `google: false` today, with `email` the only provider on, so this is
  a Google Cloud OAuth client plus a Supabase toggle: **the owner's ten
  minutes, not a code task.** The one thing to CHECK once it is on rather than
  assume: a Google sign-up lands a session with no business, and nothing has
  ever exercised that path. **The landing page already has both a Sign in and a
  Get started button too**; what he is right about is the wording.
- **The check for anything that touches an EMAIL: `node scripts/render-emails.mjs`**
  (new 2026-09-03, roadmap 2.18). Credential-free, no browser, no dev server. It
  writes all TWENTY-THREE emails — sixteen kinds plus the branches somebody
  actually receives; it was seventeen until roadmap 2.14 step 3 added the plan
  link, the plan-ended notice and a booking WITH A PLAN ON IT, twenty until
  roadmap 2.19 added the re-book email, and twenty-one until roadmap 2.20 stage
  2 added the two the PLATFORM sends in its own name — **the only two on that
  page not built on a tenant's brand** — and the script prints its
  own count — to
  `email-preview/index.html`, **HTML and .txt side by side**, so a
  human can look at them. **The first thing in this repo that ever has**, which
  is why 2.12 shipped eleven under-floor headlines and why the invoice defect
  survived eleven test suites. `--accent=#hex` re-renders for another tenant;
  `--out=DIR` keeps two side by side. **No new dependency**: Node 24 strips the
  types, so it imports `_shared/emailTemplates.ts` directly and reads the SAME
  file the edge function runs — keep that module dependency-free or this stops
  working.
  **WHAT IT ASSERTS, and every one of these is a defect it has already caught:**
  that **every money column reaches its own printed total** (the invoice missed
  by exactly the promo for the whole life of the product); that every text
  colour clears its floor on both grounds; that **no pure `#ffffff`/`#000000`
  reaches a tenant's colour**, because those are Apple Mail's dark-mode
  inversion trigger and Apple Mail is ~60% of opens; that every email carries a
  plain-text alternative; and that no output contains `undefined` / `NaN` /
  `[object Object]` / `href=""`, because 2.12's first render used made-up field
  names and produced a convincing-looking wrong answer. **`--logo` draws the
  worst logo a detailer can upload** (dark artwork on transparent) — it was
  invisible on the ground until the masthead got its bone plate, and no test in
  this repo can ever measure a PNG's contrast.
  **AND ONE OF ITS FIXTURES EXISTS ONLY FOR A MINUS SIGN (roadmap 2.14 step
  3).** Every figure in the original fixture is positive, so the money tie-out
  could not reach the case where `moneyBlock` draws a negative adjustment as a
  positive CHARGE — **the check read as passing because it could not reach the
  defect**, which is this file's most repeated failure in a new place.
  `customer-confirmation-plan` carries a −$60 plan line and is its own tie-out
  case. Baselined by removing the sign handling in `quoteLines`: without that
  row, nothing failed.
  **The rule it is here to enforce, and it is the third rung of the same
  ladder:** a number PRINTED is not a number CHARGED, a number EXPORTED is that
  risk one step later, and **a number INVOICED is it one step further still** —
  the invoice goes to the one party who will check it against their card
  statement. **And a tie-out is only a tie-out for the document it names**:
  `money-export` ties out the accountant export, `booking-engine` test 17 the
  quote engine, and neither one has ever looked at this.

- **THE FIFTH TAB IS `Business`, THE PLUMBING IS BEHIND A GEAR IN THE HEADER,
  AND A SETTINGS SCREEN IS NOT A SHEET — all three since roadmap 2.11 step 6
  stage 6 (2026-09-02).** `screens/More.jsx` is deleted. **TEN rows on
  Business** (what changes what a CUSTOMER meets — Monthly plans joined them in
  roadmap 2.14, because a plan is an offer with a price, and *How you get paid*
  in 2.20 stage 1; **this said NINE until 2026-09-05 and was counted from the
  file that day** — ten plus the five below is the fifteen the sweep walks),
  FIVE behind the gear
  (what changes how the app behaves for the detailer — *Your subscription*
  joined them in roadmap 2.20 stage 2, and it passes the gear's half of the
  admission test outright: a card on file changes nothing a customer ever
  meets), and the test that decides
  which is written into `screens/Business.jsx`’s own header.
  **THE SUBSCRIPTION ROW IS THE ONE THAT IS `owner`-ONLY RATHER THAN
  PERMISSION-GATED**, for the reason roadmap 2.13 refused a `team` tick:
  whoever can change what the business PAYS can change everything, and there is
  no tick that means "may cancel our subscription and nothing else". The server
  enforces it; hiding the row is courtesy. **Staff get
  THREE rail buttons** — Today, Calendar, Clients — plus the gear.
  `components/SettingsHost.jsx` is the container: a PAGE with a back control
  below `--wrap`, the second column at or above it. Anything that walks the
  settings screens must go through both doors.
- **FIRST RUN EXISTS, AND IT IS TWO SEPARATE THINGS — since roadmap 2.11 step
  6 stage 7 (2026-09-02), which closed 2.11.** A **stepped setup form**
  (`components/SetupForm.jsx`, seven steps, one question each, skippable and
  resumable) and, separately, a **guided walkthrough** (`Walkthrough.jsx`, a
  spotlight over the live dashboard, one sentence and one element a step). The
  owner insisted they stay two; building them as one is how the form becomes a
  wizard.
  **The seven steps and the progress arithmetic live in `app/src/lib/setup.js`,
  with no React in them**, because the same number is printed on the form and
  on Business and the two must never disagree — `tests/setup-progress.test.mjs`
  is what holds them together.
  **COMPLETION IS DERIVED WHERE THE DATABASE CAN ANSWER IT, and a session that
  changes this to a stored count will break every business that already
  exists.** Five of the seven steps are facts the schema holds (services,
  add-ons, promo codes, an open day, a phone or email, a colour), so a
  detailer who set up through the settings screens is never told they have
  done nothing. **`where you work` is the one that can never be derived** —
  `mobile_enabled` and `dropoff_enabled` both default to true — which is why
  the seeded demo reads *6 of 7 done* and its row stays until somebody answers
  that question.
  **STAFF GET THE TOUR AND NOT THE FORM.** They are not setting up a business.
  The tour re-runs from *Show me around* behind the gear, and it counts what
  THIS dashboard has: 7 for an owner with jobs, 6 on an empty one, 4 for staff.
  **The empty dashboard is the state to verify against**, not the seeded demo —
  the opposite of every other screen in this rebuild.
- **A DETAILER NAMES THE ROLE AND TICKS WHAT IT CAN DO — roadmap 2.13,
  2026-09-04, and `role` IS NO LONGER THE QUESTION TO ASK.** `role` is still
  `owner` / `staff` and **`owner` still means everything**, because
  `protect_last_owner()` is a TRIGGER and needs a last owner to protect — a
  permission set has no last-anything. What is new is that a NON-owner
  membership carries **`label`** (the business's own word for the role) and
  **`permissions text[]`**.
  **FOUR PERMISSIONS, AND EVERY ONE IS A GROUP OF POLICIES THAT WAS ALREADY
  OWNER-ONLY**: `money` (expenses), `marketing` (promo codes, campaigns),
  `settings` (business settings, branding, the business itself, domains,
  message-template writes — **and prices, hours, the catalog, the gallery and
  the storage bucket, which moved in a SECOND migration because the tick's own
  words say "Prices, hours…" and `services.price` was `*_tenant_all`,
  writable by any member**), and `requests` (answering a booking request).
  **SELECT on the catalog stays open to every member** — a member must read
  `services` to take a booking at all.
  **`public.has_business_permission()` FOLDS THE OWNER IN**, so a policy asks
  one question and no check can be written that forgets owners;
  `business_ids_with_permission()` is its set form for the storage policies,
  which compare a folder NAME and must not cast an arbitrary path to uuid.
  **THERE IS NO `team` TICK AND THAT IS DELIBERATE** — whoever hands out
  permissions can hand themselves every other one, and making that safe needs
  a grant lattice nobody has asked for. Invites and membership stay
  `is_business_owner()`.
  **THE VOCABULARY IS CLOSED BY A CHECK CONSTRAINT** on both tables and
  filtered again in `invite-user`: a typo'd permission grants nothing and
  looks exactly like one that was never ticked.
  **`requests` IS THE ONE THAT TAKES AWAY** (staff have had it since 2.12), so
  the migration backfilled every existing staff row and live staff invite —
  nobody's dashboard did less the day this shipped.
  **IN THE APP, ASK `can(key)` FROM `useBusiness()`, NEVER `role === "owner"`.**
  `app/src/lib/permissions.js` is the ONE list (names, sentences, `can`,
  `roleName`, `permissionSummary`, no React in it, same reason as `setup.js`).
  `App.jsx`'s rail is `TAB_NEEDS`, `GearMenu`'s rows carry a permission name,
  Clients' lifetime spend is `can("money")`, DaySheet's `canEdit` is
  `can("settings")`. `tests/staff-roles.test.mjs` is 64 checks and every new
  one was baselined by breaking what it guards.
  **AND `monthly_plans` DOES NOT EXIST** — created in `tenant_data.sql:51`,
  dropped nine hours later in `phase2_cleanup_and_storage.sql:16`. Roadmap
  2.14 said it was real for a week because the note cited only the creating
  migration. **A `create table` line is not evidence the table is there.**

- **A BOOKING CAN NOW BE A REQUEST, AND BOTH MODES HOLD THE SLOT — roadmap
  2.12, 2026-09-02.** `business_settings.booking_mode` is `reserve` (the
  default, and what every existing tenant has) or `request`. The owner's own
  clarification is the load-bearing sentence: *"someone sends a request, it will
  take up that time slot… one is just a little bit more guaranteed than the
  other."* **Availability behaves identically in both modes** — only the promise
  made to the customer differs.
  **The exclusion constraint was deliberately NOT touched**: `pending` is not
  `cancelled`, so a request holds its time with no change at all. That is a
  load-bearing fact established by NOT writing something, so it is invisible in
  the migration and protected only by `tests/request-mode.test.mjs`. **A session
  that "tidies" `pending` into `slotValidation.ts`, `available-slots` or the
  constraint's WHERE clause makes requests double-bookable.**
  **THERE IS NO `declined` STATUS AND THAT IS A DECISION.** A decline is
  `status = 'cancelled'` plus `declined_at`, because twelve places in this
  codebase already ask `status <> 'cancelled'` and every one of them is right
  about a declined request. **A QUOTE IS OFFERED, NEVER CHARGED** —
  `quoted_amount` is its own column and only `accept-quote` (the customer, from
  their email) moves it to `total_price`, landing the difference as a
  `price_adjustments` line so the receipt still reconciles. Saying no to a quote
  is the ordinary `cancel-booking`. Full reasoning and **three questions standing
  for the owner**: DECISIONS.md → "Roadmap 2.12".
- **A PLAN IS LOGGED, NEVER SOLD, AND ITS LEDGER HAS TWO HALVES IN TWO
  PLACES — roadmap 2.14 step 2, 2026-09-04.** `plans` (what a detailer
  offers: a cadence, what is included, how it is priced, whether there is a
  term), `plan_members` (who is on one, with the price SNAPSHOTTED) and
  `plan_visits` (the ledger). We take no money, so there is no card, no
  charge and no status implying one; three statuses, not seven.
  **OWED IS ROWS IN `plan_visits`; USED IS `bookings.plan_member_id`, A
  COLUMN — and that split is load-bearing.** Cancellation already works on
  `bookings`: twelve places ask `status <> 'cancelled'` and every one is
  already right about a plan visit that was called off. **A session that
  "tidies" used into a second ledger row needs a thirteenth rule and a
  compensating row nobody remembers to write.**
  **`price_kind` HAS FOUR VALUES AND THAT IS THE CEILING** — `monthly`,
  `per_visit`, `percent_off`, `total` (a prepaid block). The fourth arrived
  hours after the first three, when the owner asked whether a detailer is
  locked into a kind of plan and eleven real shapes were put on the screen to
  answer him: *"$1,999 for the year"* had to be entered as a monthly price and
  printed as **"$1999.00 a month"**. A fifth would have to stop being a
  segmented control (`controls.jsx`: two to four options).
  **`term_months` IS SEPARATE FROM `price_kind` AND MUST STAY SO** — a prepaid
  year is usually twelve months, but a prepaid block of ten visits has no end
  date; merging them makes one of the two unsayable.
  **PAUSE IS A DATE (`plan_members.accrue_from`), NOT A FLAG.** Accruing from
  `started_on` backfills every visit the pause was meant to skip the moment
  the member comes back. **`accrue_plan_visits()` is the only writer of a
  grant**, idempotent by a partial unique index, on `pg_cron` nightly —
  `seed-demo.mjs` CALLS it rather than writing grants by hand, so a
  regression in the accrual shows up as a demo with nobody owed anything.
  **`on delete no action`, not `restrict`, on `plan_members.plan_id`**: both
  refuse to delete a plan somebody is on, but deleting a BUSINESS cascades to
  both tables in one statement in an order Postgres does not promise, and the
  seed takes that path every run.
  **The auto-link trigger's ceiling is real and stated**: a member booking
  something their plan does not cover has it counted, because
  `booking_services` rows are written AFTER the booking and a BEFORE INSERT
  trigger cannot see what was bought.
  **NO NEW PERMISSION KEY** — `plans` writes ride `settings`, `plan_members`
  and `plan_visits` ride `money`. That pairing is the ONE open question with
  the owner. **The arithmetic is `app/src/lib/plans.js`** and
  `addPeriod` must keep matching Postgres's month-overflow clamp.
  **STEP 3 — THE CUSTOMER'S HALF — SHIPPED 2026-09-04 AND 2.14 IS CLOSED.**
  `/book/:slug/plans` (a ruled list, one row per plan, the row IS the button),
  `/plan/:memberId` (what they are on, visits waiting, cancel, book — the
  membership UUID is the credential, the third caller of the `/booking/:id`
  pattern), `bookings.plan_id`, `plan-link` (three actions: get, cancel, and
  **EMAIL IN / LINK OUT**, which is the safe twin of the lookup the owner
  asked for — his version is address enumeration), the browser remembering
  the last customer AND their plan, and the *"don't lose your link"* nudge on
  three customer emails.
  **THE PLAN'S EFFECT ON THE PRICE IS `planLineFor` IN `_shared/pricing.ts`
  AND IT RIDES `price_adjustments`** — the labelled-amount array the review
  step, every email, the invoice, the manage page and the booking row already
  draw. A `plan_discount` column was the obvious build and would have been
  nine render paths with one forgotten. **The rule: the plan governs the
  SERVICES; add-ons and travel are always extra; a percentage comes off the
  whole job.**
  **AND NOTHING WAS ADDED TO A STEP, WHICH IS THE WHOLE SHAPE OF THE ITEM.**
  Step 1's ten pixels are the detailer's, so the plans are a PAGE, the door to
  them rides the row the rail and *"Step 1 of 7"* already share, and the
  recognition he asked for is spent on step 1's HEADING and the price bar's
  EYEBROW — two lines that were already drawn. **Every step's spare room is
  identical to before the item.** The door still cost 3px on its first
  measurement and needed its line box pinned: *a control that is free in
  principle is not free until it is measured.*
  **A PLAN SIGN-UP IS A REQUEST IN EITHER BOOKING MODE**, but an existing
  member booking their own covered visit is not held up — `create-booking`
  asks the database, never `booking_mode` alone.
  **`BookingLink` TAKES AN OPTIONAL `path` NOW** and the Monthly plans screen
  uses it, so a detailer can share the plans page the way they share the
  booking link. **And `plan-link`'s `email` action wants roadmap 2.21's
  throttle** — it is public and it SENDS, so an unthrottled loop is a
  mail-bomb from the platform's shared sending reputation; it is written into
  2.21.
  Full reasoning: DECISIONS.md → "Roadmap 2.14, step 3".
- **PUSH WORKS END TO END, CONFIRMED BY THE OWNER ON A REAL DEVICE
  2026-09-02.** He was asked to tap the switch and let a booking through; his
  answer was “works”. The browser half is `app/public/sw.js` +
  `app/src/lib/push.js` + a `probe` branch on `owner-push-subscribe` that
  serves the VAPID public key.
  **The VAPID secrets had never been set on the platform project either**, so
  `sendOwnerPush` had been taking its “VAPID keys not configured — skipping”
  branch for the whole life of the feature. A keypair was generated and set
  the same day. **If push ever goes quiet, check those three secrets FIRST**
  — the failure is a `console.warn` inside an edge function and is completely
  invisible from the dashboard, which is how it survived this long.
  Two limits that are real and are NOT defects: an iPhone only allows this
  from a dashboard added to the home screen, and the switch reads THIS
  device’s registration, so turning it on is per-device by design.
- **THE OWNER LIFTED THE "DON'T TOUCH THE BACK END" RULE ON 2026-08-31**, and
  a session that inherits it from an older file will do less than he asked for.
  His words, answering roadmap 2.11 step 6: *"I don't know why there was a rule
  that did not edit the back end. You could 100% edit the back end however much
  you want… We got tables if we need to."* **The schema, edge functions, emails
  and pricing are open.** What he does NOT want is structural inheritance from
  the OLD DASHBOARD — *"forget that the old dashboard even existed"* — while
  the LOOK stays the landing page's. The append-only migration rule above is
  unaffected; it is about how you change the schema, not whether you may.
- **Before changing any colour, know law 11b (`docs/design-system.md`): the
  accent is IDENTITY, never MEANING.** Paid / money-up / "it worked" are the
  fixed green `--ac`; cancelled / no-show / error are the fixed red `--bad`.
  Neither follows the tenant. `grep 'var(--ac)'` in `theme.css` finds every
  fixed-meaning site. The owner's rule, 2026-08-30.
- **A number PRINTED on a screen is not a number that is CHARGED, and this
  product has already shipped one that was not.** **And a number EXPORTED is
  the same risk one step later**, because the file goes to somebody who will
  never check it against the screen: `lib/accountant-export.js` is a flat
  ledger precisely so its Amount column adds up to Money's own Net figure, and
  `tests/money-export.test.mjs` is that tie-out (2026-09-01, roadmap 2.11 step
  6 stage 4).
  The one this rule came from: `business_settings.travel_fee`
  was drawn on the booking page as “+$25” and was never in `computeQuote` — for
  the whole life of the quote engine, past eleven test suites, because every
  test asserted that the engine did what the engine did. Fixed in roadmap 2.8c.
  **When you add anything with a price, follow it all the way to
  `bookings.total_price` and to the confirmation email**, and check that the
  itemisation still adds up to the total — `tests/booking-engine.test.mjs`
  test 17 is the shape of that check.
- **THE INSTRUMENT FOR ANYTHING ABOUT MOTION IS `document.getAnimations()` ON
  THE LIVE PAGE, 120ms AFTER THE CLICK — never the stylesheet.** Roadmap 2.17,
  and it is the third time this has mattered: Today shipped its whole arrival
  dead in step 6, stage 3 shipped another, and 2.17's own audit found the
  roadmap wrong about one item (the gear animates) and short by two on the
  rest. **A selector that matches nothing looks exactly like a finished
  screen**, and an animation that is running on the WRONG element looks like an
  animation that is working. Filter out `ground-drift` and the hover
  transitions and read what is left.
  **The same rule caught an invalid selector nothing else in this repo can
  see:** a `:has()` may not contain another `:has()`, and the browser drops the
  whole rule silently. It was found by logging `.app-main`'s own width before
  and after a click, not by reading the file.
- Report what was observed, never "this should work."

## Process

- One queue prompt per session; commit before the next; `/clear` and
  restart a session that goes sideways.
- **A SESSION RUNNING IN THE CLOUD IS A DIFFERENT ENVIRONMENT AND MOST OF THIS
  FILE'S VERIFICATION DOES NOT EXIST THERE — `docs/cloud/README.md`, written
  2026-09-05.** `.env` is gitignored so a cloud clone has no credentials, and
  `*.supabase.co` is not on the sandbox's network allowlist either, so there is
  no database, no migration, no function deploy and none of the eight
  env-backed suites. Playwright's browsers are not in the image and their CDN
  is blocked, so there is **no browser and therefore no visual verification at
  all** — a cloud session does not build screens. What survives is the ten
  credential-free checks (they import nothing outside `node:` and this repo, so
  they run on a bare clone with no `npm install`), `npm run build --prefix app`,
  and `gh`. `docs/cloud/QUEUE.md` is the work that fits inside that. **A cloud
  PR targets `claude/superbase-access-anj1h7`, never `main`.**
  **THE OWNER STARTS ONE OF THOSE SESSIONS WITH A SINGLE SENTENCE HE HAS
  MEMORISED — *"Follow `docs/cloud/README.md`."*** That file's first block is
  therefore a complete brief on its own: read the limits, read CLAUDE.md, take
  the first unticked task, do one, stop. **Anything a cloud session must know
  goes in that file, not in a message** — he is away and there is nobody to ask.
  **§6 is its permission to choose its own work when the queue empties**: three
  tests (can it be finished here, can it be checked here, would he recognise it
  as the next thing), a ranked list of what to reach for, a short list of what
  is off limits whatever the reasoning, and a stop rule — two self-chosen
  sessions producing only documents means the cloud-shaped work has run out.
- **Appending to `DECISIONS.md` means adding your section to its index too,
  in the same edit.** `node scripts/decisions-index.mjs` exits 1 if you
  forget, and it is the check that keeps that file usable — an index that has
  gone stale is worse than none, because a session that trusts it and finds
  nothing concludes the decision was never made and re-decides it. Write the
  one-line hook yourself; generating hooks was tried and produced entries like
  "four" and "40 pixels". **Mark superseded entries, never delete them** — the
  reversal is usually the load-bearing part ("Removed on purpose" only makes
  sense next to the owner decision that put it all back).
- **Ping the owner's phone when the work is done.** Send a PushNotification
  at the end of every session — whenever you hand over, ask for a decision,
  or stop needing them to look. They are often away from the screen while a
  session runs. Harmless when they are not on a remote session; do it
  anyway rather than guessing.
- **Clear at the work boundary, not at a token count.** A session covers ONE
  roadmap item. When that item is finished AND nothing is left hanging — no
  unanswered question, no decision handed to the owner they have not
  answered, no "I'll look at that next" — say "Safe to clear." and hand
  over. Never start a second item in the same session: that is what the
  clear is for. Finishing a *sub-part* is not a boundary, and neither is
  "the code works" — chase the loose ends first.

  If a decision is pending, the session is not over. Keep working on
  everything that does not depend on it.

  **Context size is advisory, not a trigger.** `node scripts/context-check.mjs`
  reads the live transcript and prints real usage; quality is reported to
  degrade somewhere past ~300k. Treat that as a reason to be economical and
  to avoid picking up anything new — never as a reason to abandon the item
  mid-flight. If you are far past it and the item genuinely cannot finish,
  say so plainly and make the handoff carry every unresolved thread,
  because the next session starts cold on whatever the prompt names.

  Before clearing, write anything that exists only in this chat into a
  file — a thread that lives only in the conversation dies at the clear.
  Then give them a short prompt to paste into the next session, in a plain
  fenced block (no language tag — it is not a shell command). Fill it from
  `docs/roadmap.md`: the next unchecked item, and its row in that file's
  "Which skills each phase uses" table.

  ```
  Next: roadmap <N.N> — <one line, plain words>.
  Read CLAUDE.md, then PROJECT-STATE.md and docs/roadmap.md.
  Skills: <from the roadmap table>. <"No design skills — not visual." or,
  if it is visual, "Anti-slop floor: docs/design-knowledge.md §1 and the
  never-defaults in CLAUDE.md.">
  Watch out: <the one thing that isn't obvious from the files, or omit>.
  Don't wrap up when the code works — surface what's still unanswered, chase
  it down, and only say "Safe to clear." once nothing is left hanging.
  ```

  Keep it five lines or fewer. It is a pointer at the files, not a summary
  of them — the files are what survive the clear. The last line is not
  boilerplate: the owner clears BETWEEN roadmap items, so a session that
  signs off with loose ends buries them — the next session starts on a new
  item and never picks them up.

  **The prompt IS the sign-off. It only ever appears together with "Safe to
  clear."** Never hand over a next-session prompt and then say the session
  is not finished — a prompt in the chat reads as "you are done here, go
  clear", so pairing it with "don't clear yet" gives two opposite
  instructions and the owner acts on the wrong one. If either half is
  missing, both are.

  **When the session is blocked on the owner** — a question asked, a
  decision handed over, an OWNER roadmap item — finish everything that
  does not depend on the answer, write it all to files, commit, and end
  with the ask ALONE. No prompt, no sign-off. The session stays open. When
  the owner answers, write their answer into the file it belongs in, finish
  the item, and only then give "Safe to clear." and the prompt together.
  An answer that exists only in the chat has not been captured yet, and
  that is exactly the thread the clear would destroy.
- Plan before building anything large; stop for approval.
- Smallest possible diff; no unrequested refactors, deps, files, renames.
- Stuck twice on one bug: stop editing, write hypothesis + evidence +
  unchecked assumptions, list three causes.
- **Write for a coding agent that is not Claude.** The owner expects to
  move to OpenAI's coding agent in roughly a month (stated 2026-08-29).
  Every durable decision therefore lives in plain markdown in the repo,
  never in a tool-specific mechanism — no skills, no hooks, no
  assistant-side memory holding anything that matters. Audited 2026-08-29:
  the ONLY tool-specific file in the repo is `.claude/settings.json`
  (permissions), and all 20+ knowledge files are portable markdown. Keep
  it that way and the migration stays close to free. See DECISIONS.md.

- **A TENANT'S OWN WEBSITE HAS A CONTRACT NOW, AND IT IS THE FIRST THING TO
  READ BEFORE ANY PHASE 3 WORK — `docs/tenant-site-contract.md`, roadmap 3.1,
  2026-09-05.** `docs/tenant-websites.md` is still the destination in the
  owner's words; the contract is the enumeration its §3 said was owed.
  **The rule it exists to protect is one this file already has in a harder
  form: a site that hard-codes a price is *a number PRINTED is not a number
  CHARGED* with the two numbers in two different codebases**, where nothing can
  ever see both. §2 is the twelve things a site owes, each written as **what
  silently stops working if the site omits it** — because all twelve fail
  quietly: the dashboard screen still works, the setting still saves, and
  nothing reports that the feature reaches nobody.
  **THE FORK LINE IS ALREADY BUILT AND JUST HAD NEVER BEEN WRITTEN DOWN.** One
  `security definer` RPC (`get_public_business_profile`) is the whole read
  surface; every public edge function already answers
  `Access-Control-Allow-Origin: *`; `business-media` is public-read; and
  `create-booking` recomputes every quote server-side whatever the client sent.
  **A site therefore needs no change to the engine — it needs permission not to
  reimplement it.**
  **THE BOOKING FORM IS BUILT INTO EACH TENANT SITE, IN THAT SITE'S OWN
  DESIGN — his ruling 2026-09-05, and it OVERTURNED the recommendation that
  the site should link out to `/book/:slug`.** *"It's up to the detailer's
  choice but I think it should be built into the website with the detailer's
  website design. Like how it is on my website."* **His site is the spec and
  it is in this repo**: `reference/frontend/src/components/BookingWidget.jsx`
  is 1,581 lines in the SITE's own components folder, built from the SITE's
  own UI kit, rendered inline by `App.js:73`. Not a link, not a page, not an
  iframe.
  **SO THE FORK LINE SITS ONE LEVEL UP FROM WHERE IT LOOKS: the FORM is
  presentation and forks per client; the RULES never do.** That is safe only
  because `create-booking` recomputes every quote through `_shared/pricing.ts`
  whatever the client sent, `validateSlot` gates every time and the exclusion
  constraint is in the database — **so a bespoke form cannot mis-charge or
  double-book; it can only OFFER a slot the server then refuses**, which costs
  a customer their booking and is the harder failure to see. **A site ASKS and
  never computes**: every price from `calculate-booking`, every open time from
  `available-slots`.
  **3.2's biggest job is now a HEADLESS BOOKING CORE** — the step sequence,
  the group rules, the open days, the quote call and the submit, lifted out of
  `BookingPage.jsx` and its six step components into one module with no markup
  and no CSS. Without it, *fork the presentation* becomes *fork the rules*.
  **`/book/:slug` stays** and is what a **booking-only** detailer gets — the
  split 3.3 already draws between website-package and booking-only customers,
  and *"it's up to the detailer's choice"* is the other half of his ruling.
  **AND THE 3.1 ROADMAP ENTRY'S FOURTH GAP IS WRONG — the four measured gaps
  are three.** "Five of six social links cannot be typed in" was true on
  2026-08-31 and fixed on 2026-09-02, then copied forward unread. **A gap list
  rots exactly like the counts this file keeps having to correct.** Contract
  §6e has what is really broken there, and §6a–§6g are the seven that block a
  site — the largest being that every customer-facing URL comes from one global
  `PLATFORM_URL`, so a detailer on their own domain still emails links to
  detailingplatform.com.
  **A TENANT SITE INHERITS OUR METHOD AND NEVER OUR SKIN — the owner's
  correction, 2026-09-05, after the first worked page came out as our landing
  page recoloured.** *"It shouldn't look exactly like our landing page, it
  should genuinely be different. Different colors fonts aesthetic… I more
  meant like the mentality of how we do things. The scrolling, the inspo."*
  So: **no Archivo, no JetBrains Mono, no `#0B0D0E`, no accent green, no
  sixteen tokens, no section order on any tenant page.** What transfers is
  `docs/tenant-site-research-2026-09-05.md` §1 — research first, the anti-slop
  floor, the motion mentality, the copy rule, verify by looking. That file's
  §3 is what six real detailers' sites actually CONTAIN (the vehicle-size
  price ladder, disclaimers on a service, credentials, an offer strip) and its
  §5 is what must never be on one (platform branding, SaaS furniture, the
  trade's own popups). **The worked examples are the THREE in
  `docs/tenant-sites/`**, deliberately unlike each other, one of them light.
  **Nothing tests them**: `composition` walks `app/src` plus `5-the-thread.html`
  by name, so those pages are held by looking and not by a check —
  `shoot-dashboard.mjs --url <path>.html` photographs one for him.

## Context (read these, in this order, when new)

1. `PROJECT-STATE.md` — full state briefing
2. `docs/HANDOFF.md` — architecture + open threads
3. `DECISIONS.md` — every judgment call and why. **START AT ITS INDEX, not
   at the top of the file.** It is over 11,000 lines — the figure in this file said
   ~3,900 until 2026-09-04 and had been stale for a while — and reading it end
   to end is not a thing anyone does; the index block names the five mistakes that have
   actually cost sessions, and maps "about to touch X" to the two or three
   sections that matter. A decision you did not find is worse than one nobody
   wrote down, because it looks like diligence.
4. `docs/ux-audit.md` — the dashboard audit and its status
5. `docs/design-knowledge.md` — design/process research transfer
