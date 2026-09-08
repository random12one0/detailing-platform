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

- ~~Work on branch `claude/superbase-access-anj1h7`.~~ **STALE, AND FOLLOWING
  IT LOSES 94 COMMITS — measured 2026-09-08.** `git rev-list --count
  claude/superbase-access-anj1h7..main` = **94**, and `main..claude/…` = **0**:
  that branch has NOTHING on it that is not on `main`, and it stopped at
  `63d31af` (photo storage). **The work moved onto `main` and this line did not
  move with it.** A session that checks out the old branch is working on a
  week-old tree and will produce a merge nobody wants. **THE WORKING BRANCH IS
  `main`.** The old branch is kept only so nothing is deleted; do not use it.
  **Never merge to `main` on your own initiative — ask.**
  **~~`main` auto-deploys to production. A push to `main` IS a publish.~~
  FALSE AS OF 2026-09-08, AND IT WAS THE MOST LOAD-BEARING STALE LINE IN THIS
  FILE.** Measured through the Netlify API rather than assumed: the live deploy
  on detailingplatform.com carries `deploy_source: "api"` and a source zip — a
  manual upload — and **a push to `main` at 06:26 on 2026-09-08 created no new
  deploy at all**, with the live bundle hash unchanged twenty minutes later.
  It was true when it was written on 2026-08-30 and stopped being true quietly,
  which is exactly what this rule warned about happening to something else.
  **SO A PUSH IS NOT A PUBLISH AND THE TWO NUMBERS ARE DIFFERENT NUMBERS.**
  **AND THAT IS TRUE ONLY UNTIL 2026-09-13 — READ THIS BEFORE ACTING ON THE
  PARAGRAPH ABOVE.** Measured in the Netlify dashboard 2026-09-08: the git
  integration is **connected and working.** The skipped builds are recorded
  against `main@7cd5864`, `main@df0628c` and `main@HEAD` — **Netlify only names
  a deploy after a commit if it received the git event and created a deploy for
  it.** A disconnected repo produces no deploy record at all. So *"a push is
  not a publish"* is not a fact about the wiring; it is a fact about the
  **billing period**, which ends **13 September**.
  **ON 14 SEPTEMBER EVERY PUSH TO `main` IS A PUBLISH AGAIN, and this rule will
  flip back with nobody editing it** — the exact failure the sentence above
  describes happening to its own predecessor, now scheduled.
  **AND PUBLISHING FREELY IS WHAT CAUSED THIS: 1,965 credits burned across 131
  production deploys against a 1,000/month plan, at ~15 credits each.** That is
  twice the sustainable rate, so a fortnight of the current cadence exhausts
  the next cycle too. **`docs/OUTSTANDING.md` § 17 is the arithmetic and the
  options; do not resume deploy-on-every-commit without reading it.**
  **AND THE FIX IS FREE RATHER THAN RATIONED — measured 2026-09-08 in Netlify's
  own credit doc: a PRODUCTION deploy costs 15 credits, and a BRANCH DEPLOY or
  DEPLOY PREVIEW costs ZERO.** Failed deploys and rollbacks bill nothing either;
  only a SUCCESSFUL PRODUCTION deploy is charged. **So working on a branch and
  merging to `main` to publish takes this loop off the meter entirely** — 131
  chargeable deploys become about one per publish — and it needs no discipline
  anybody has to keep up, which is what killed the branch last time.
  **AND A BRANCH DEPLOY IS A REAL URL THAT OPENS ON HIS PHONE, FOR FREE.**
  Everything in this file's first section about screenshotting rather than
  saying *"open localhost"* exists because he cannot reach a dev server from a
  phone on remote desktop. **A free preview URL is strictly better than a
  screenshot for anything he has to SCROLL or PRESS**, and nothing in this repo
  has ever used one. Screenshots stay right for *"does this look correct"*; a
  preview URL is the answer for *"try it"*.
  **AND THE DIRECT-UPLOAD WORKAROUND IS DEAD**: `netlify deploy --prod --dir`
  is a production deploy and is charged the same 15 credits — build minutes are
  no longer the billed unit, so *"it runs no build"* saves nothing. 131 × 15 =
  1,965, the billing page to the credit.
  `origin/main` and the LIVE SITE are separate facts, and
  `git rev-list --count origin/main..HEAD` answers only the first — a session
  that reads it and says "we are nearly up to date" is describing GitHub while
  the owner is looking at Netlify. **To find out what is actually live, read
  the deployed page, not the repo** (`docs/OUTSTANDING.md` § 6 has the API
  calls). Deploying is currently BLOCKED on Netlify build credits.
  **AND `curl` CANNOT ANSWER IT EITHER**: `_redirects` sends every unmatched
  path to `index.html`, so **every** URL on that domain returns 200, including
  one that does not exist. A 200 there is not evidence of anything. Load the
  page and read what it renders.
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
- **`docs/TASTE-NOTES.md` EXISTS NOW AND IT OUTRANKS EVERY DESIGN NOTE BELOW
  THAT IS AN INFERENCE ABOUT WHAT HE LIKES — 2026-09-07, five sites he sent
  unprompted.** This is the file the entry below has asked for since
  2026-09-05, and it is the first EVIDENCE any session has had. **He said more
  are coming and that he likes those better** (*"Now I'm gonna give more that I
  like more, but just quickly, this is what I could find"*), so it is a first
  reading rather than a brief: **add his next batch before building a sixth
  page.**
  **WHAT ALL FIVE SHARE, AND NONE OF THE REJECTED PAGES DID:** a real car
  PHOTOGRAPH as the hero at scale (cut out, full-bleed, or inside a giant
  rounded card); a headline set 100-200px in a heavy, usually CONDENSED
  GROTESQUE — **there is no serif display face anywhere in the set**; ONE
  saturated accent used loudly (blue, red, red, orange) and nothing muted; the
  page SWITCHING GROUND between sections, black band to white band, **which not
  one of my five pages did**; and numbers everywhere as decoration as much as
  information (7K/3K/5K/8K, 24+/1.2K+/35/99%, 4.9, 12,025).
  **THE UNCOMFORTABLE PART IS THE USEFUL ONE.** Several of them are close to
  the 2026 slop recipe below — three-up cards, a stats strip, a pricing table,
  an FAQ accordion. **He likes them anyway.** So the anti-slop research is a
  guard against the GENERIC-AI version of a commercial page, **not an argument
  for an unusual one**: what separates these five is real photography, type two
  sizes bigger than feels safe, one committed colour and enough contrast for
  the page to have a pulse. **Craft and confidence, not novelty.** A session
  that reads "avoid the centred hero and the three cards" and builds a
  catalogue on card stock has followed the letter and produced the exact thing
  he has now rejected three times. The never-defaults are unaffected.
  **And it re-ranks what is already in `docs/tenant-sites/`**: `f-sudsy`
  (painted yellow, price as headline, Archivo at scale) is the closest thing in
  the repo to what he sent, `e-kiln` second; **`g-estate` and `d-ridgeline` are
  the furthest**, and both are serif-led editorial pages, which is the family
  he has now rejected twice.

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
  (**94 checks — this said 74 until 2026-09-04 and had been stale since the
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
- **THE ANTI-SLOP LIST IS DATED AND THE 2026 RESEARCH IS IN
  `docs/design-knowledge.md` § "The tells the list above is TOO OLD to catch"
  — researched from the live web 2026-09-07, at the owner's ask.** Two things
  in it change how work gets briefed rather than merely adding nevers.
  **(1) THE SLOP IS A SEQUENCE, NOT A SET OF ELEMENTS.** Centred hero (eyebrow
  + huge headline + subhead + two CTAs) → three-up cards → logo soup → pricing
  toggle → FAQ accordion. Every one is defensible alone, which is exactly why a
  page passes a per-element audit and is still that page. The never-defaults
  below cannot see an ORDER.
  **(2) NAME TWO AESTHETIC FAMILIES TO REMIX, NEVER ONE — and this is the
  precise fix for this project's own recorded failure.** *Three agents given
  one brief produced one family; varying the palette while fixing the skeleton
  does not produce variety* (`docs/tenant-site-research-2026-09-05.md` § 7).
  One family is a style to copy and every agent copies it the same way; a PAIR
  is a constraint that has to be resolved, and different pairs resolve
  differently. Six families with their reference sites are tabulated in
  design-knowledge; **two of the three rejected tenant pages were squarely
  "Warm Editorial"**, which is the diagnosis this repo already wrote, now with
  a name. `docs/tenant-site-briefs-2026-09-07.md` is the five briefs built on
  it — a different pair, skeleton and intent each.
  **AND THREE MORE ARE BUILT ON HIS OWN REFERENCES — `i-apex`, `j-northside`,
  `k-cedar`, 2026-09-07, at his ask *"also make the websites"*.** They follow
  `docs/TASTE-NOTES.md` § 3 rather than the guesses below, and § 4b of that
  file is the table of what each one resolves. **Four rules came out of
  building them and they bind the next page:** alt text does not mention
  badges, so **render every candidate photo to a contact sheet and LOOK at it**
  (site j's first hero was a Bugatti with another firm's logo on the
  detailer's shirt); **a contrast comment is written AFTER the calculator
  runs, never before** — all three had every figure wrong when typed from
  judgement and two were real failures under a comment claiming a pass; **a
  decorative hairline and a control's edge are two tokens**; and **"a
  photograph at scale" is a claim about the FOLD** — k's headline pushed its
  photo to 815px down a 900px screen and the rule was true of the file and
  false of the page.
  **AND HE THEN LOOKED AT THEM AND NAMED THE TELL HIMSELF — § 4c of that file,
  2026-09-07:** *"a lot of this is like a very plain colored black background…
  maybe a gradient animation, a little pattern, something just to make it feel
  more professional. That's what I kinda get the AI, not really professional
  idea from."* **He is right and the frontend guidance in the global rules
  already said it** — *create atmosphere and depth rather than defaulting to
  solid colours* — and all three pages shipped a flat `background: var(--ink)`
  and passed every check in this repo. **§ 3 is what his references SHARE, and
  a flat ground is not on that list because it is a thing none of them has: a
  list of what to include cannot catch what everybody omits.** All three have
  layered grounds now, one per page and deliberately not one recipe painted
  three colours (lit glass, ruled paper, painted metal), plus one orchestrated
  arrival each. **Four more rules came out of it and they bind the next page:**
  **a gradient behind text is a NEW GROUND and every ratio has to be taken
  again** — five tokens across the three failed the moment the ground stopped
  being flat while still reading correct against the token they were corrected
  on; **a drifting layer needs `overflow: hidden`**, and whether anybody finds
  out depends on the SIGN of one number (j's drifts right and scrolled the
  page sideways, i's identical layer drifts left and was silent); **a marker
  class a script writes onto arbitrary elements must be namespaced** — a reveal
  class called `in` met `<div class="wrap in">` and `.hero .in{display:grid}`,
  and broke j's whole hero with no console error, no sideways scroll, every
  reveal firing and every contrast figure still correct, found only by LOOKING;
  and **the hidden state of a reveal is added by script, never by the
  stylesheet**, or a failed script is a blank page.
  **ALL FIVE ARE BUILT** (`docs/tenant-sites/d-ridgeline`, `e-kiln`, `f-sudsy`,
  `g-estate`, `h-fleet`) **and § 5 of that file ranks what actually produced
  the variety, which is NOT the family pair.** In order: (1) the **TENSION**
  sentence, because a tension has a wrong answer and forces a decision while
  two adjectives can be satisfied by a palette; (2) naming what the page **IS**
  in one noun — a logbook, a catalogue, a shopfront sign, a cost table — which
  is what decides the SECTION ORDER, and the section order is what the 2026
  slop recipe actually is; (3) a per-site **refusal list**; (4) the family
  pair, last and nearly useless alone.
  **AND THE ONE FAILURE HAD TO BE CAUGHT BY LOOKING AT THE SET.** Sites 1 and 2
  both came out DARK with nothing in either brief asking for it, and neither
  page fails a single check in this repo — it is invisible from inside either
  one. The rule that came out of it is in each later site's own header: **no
  two share a KIND of ground, and at least two are light.** Five grounds now:
  warm off-black, true black, painted yellow, card stock, cool paper.
  **EVERY SITE'S CONTRAST IS COMPUTED AND QUOTED IN ITS TOKEN BLOCK.** Site 1
  shipped a token whose comment claimed it cleared 4.5:1 and which was 3.93:1,
  plus form borders at 1.29:1 — a decorative hairline is not a control's edge,
  which needs 3:1. Both found by computing the ratios out of the file minutes
  after writing it. **What is still unproven is the only thing that counts:
  whether HE likes any of them.**
  **And the aggregate-preference numbers in the same section are a FLOOR, not
  a brief**: clean, fast, responsive, real reviews, transparent pricing, images
  first. A page built to satisfy only those is the centred-hero recipe again.
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

**THE FULL SECTION IS `docs/verification.md` AS OF 2026-09-08 — 168 KB of the
232 KB this file used to be, moved out unedited.** CLAUDE.md is loaded into
EVERY session automatically, so that section cost ~42,000 tokens of context
before a session had read a word of the work. Nothing was deleted. **It also
holds a lot of PRODUCT facts that were filed under this heading by accident**
(the fifth tab, multi-vehicle, the two-login park, plans, Spanish, promo codes,
the dead man's switch) — so when something surprises you about how a feature
works, grep that file before concluding nobody wrote it down.

### What to run, and when

| After changing | Run |
|---|---|
| **Anything, before you finish** | `composition`, `design-contrast`, `landing-pricing`, `route-contract` — credential-free, from repo root, all must pass |
| Colour or ground tokens | `node scripts/accent-sweep.mjs` |
| An edge function | `node scripts/deploy-functions.mjs …` **then** `node scripts/check-deployed.mjs` — what is RUNNING drifts from the repo silently |
| A layout | `node scripts/sweep-widths.mjs` (needs dev server + `node scripts/seed-demo.mjs`) |
| The booking widget | `node scripts/sweep-booking-steps.mjs` |
| Anything on a customer's or a booking's path | `node scripts/e2e-booking.mjs` |
| An email | `node scripts/render-emails.mjs` |
| A migration | `node scripts/db-audit.mjs` |
| `DECISIONS.md` | `node scripts/decisions-index.mjs` |

The env-backed suites need `set -a; . ./.env; set +a` first, or eleven of them
print *"Missing SUPABASE_URL"* and a session reads that as a broken
environment rather than as a suite that did not run.

**Every check count written in prose in this repo has been wrong at least
once — fifteen were wrong in one 2026-09-08 re-measure.** Read the figure the
script prints, never the figure a document quotes.

### The five rules that cost the most when they are missed

1. **A skipped check reads exactly like a passing one.** This repo's single
   most repeated failure. A guard that skips must PRINT that it skipped.
2. **Do not edit anything under `app/src` while a browser script is running.**
   Vite reloads the page and the run measures less than it claims — often
   while still reporting `clean`. `scripts/source-guard.mjs` names the file
   afterwards. Order the work: all source edits, all baselining, THEN the
   browser.
3. **Start the long check, write PROSE while it runs, then read the result.**
   Never source. The battery is the most expensive thing in a session.
4. **Settle the item's full scope before writing a line of code**, from the
   roadmap's own bullets rather than its headline. An item whose scope grows
   after the first green run costs a second full battery.
5. **Baseline a check by breaking what it guards.** This repo has shipped at
   least six checks that tested nothing. Commit BEFORE you baseline — the
   revert step is `git checkout --`, which on uncommitted work deletes the
   feature.

**Report what was observed, never "this should work."**

## A SESSION IS NOT MEANT TO STOP — 2026-09-07, and `docs/standing-work.md` is the queue

**He asked for this twice in one night, and the second time widened it a long
way.** *"I need your help on how to make it so you never stop even when you're
quote unquote done… a plan for after you're done building everything to keep
doing work infinitely that is actually beneficial."* Then: *"Do all the things
you said and also make the docs better… automatically implementing features
that you know like 90% will be better. Also doing lots of real-time
research… Most important part is you never stop."*

**THE MECHANISM IS ONE LINE AND IT IS IN THAT FILE'S HEADER:**
`/loop Follow docs/standing-work.md. Never stop, never wait for me — park
anything that needs me and keep going.` `/loop` with no interval is DYNAMIC
mode — the session schedules its own next wake-up at the end of every turn, so
finishing one piece of work starts the next. It does not survive closing the
terminal; the line is what restarts it, and it points at a FILE rather than at
anybody's memory.

**THREE OF HIS RULES IN THIS FILE ARE NOW WEAKER, AND ONE READS AS ITS
OPPOSITE. A session that finds the old wording and not this paragraph will do
less than he asked for, or refuse something he has explicitly permitted.**

**(1) "No unrequested features" is lifted to a CONFIDENCE BAR.** Build what you
are ~90% sure is an improvement, without asking. The bar is real and it is
testable: 90% means you can say in one sentence what is worse today and how you
will know the change fixed it. Below that it is a line in
`docs/overnight-log.md`, not a commit.

**(2) "Stop for approval before anything large" becomes "park it and carry
on".** *"Never wait for me."* An unanswered question stops that question, never
the session.

**(3) THE TENANT-SITE FREEZE IS REOPENED, AND ON HIS TERMS RATHER THAN AS A
FOURTH GUESS.** The design section above says not to attempt those pages again
because *"a fourth guess is how this item already burned two"*, and that the
thing that unblocks them is HIS taste. He has now asked for **web research
first** — what sites a majority actually likes the look of, and what people say
makes Claude build better websites — **and then five sites built from what the
research found.** That is precisely the missing input that entry named, so it
is not a fourth guess; it is the first attempt with evidence. **Research, write
it down in `docs/design-knowledge.md` with sources, THEN build.** The three
pages in `docs/tenant-sites/` remain the structural range and NOT the taste
reference — he said they look AI — so do not rebuild or copy them.

**WHAT DOES NOT MOVE, and none of it is something he was asked to approve:**
never re-open a decision he has made or redesign what he has approved
(`demo@demo.com` is the standing example — "improving" it locks him out of his
own back office); never write to the live business project
`adtlnvihwrcqcasqcjwd` and never deploy to the `andrewsauto` Netlify site;
a push to `main` still has to say why it was needed (though it is no longer a
publish — see Ground rules);
migrations stay append-only and `reference/` stays read-only.

**AND THE STOP RULE IS STILL A RULE.** `docs/standing-work.md` § 6: two
self-chosen iterations in a row producing only documents means the work that
fits has run out — say so and stop. A session that manufactures work to avoid
saying that is worse than one that stops, because somebody then has to read and
undo it.

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

- **THE RULES OF THE BOOKING FLOW LIVE IN `app/src/book/core.js` NOW, AND
  `/book/:slug` IS ONLY ONE OF ITS CALLERS — roadmap 3.2(a), 2026-09-05.** The
  step sequence, the profile's fallbacks, the tenant's own defaults, the group
  rules, the mode limit, the calendar, which times a customer can have, the
  step gating, both money payloads and what the device remembers. **No React,
  no markup, no CSS and NO `import` STATEMENT OF ANY KIND**, because a tenant
  site may be built on anything and one import makes it undroppable.
  `tests/booking-core.test.mjs` § 1 enforces every one of those properties by
  reading the file as text.
  **IT IS WIRED THROUGH, NOT WRITTEN BESIDE, and that is the whole design.**
  `lib/api.js`'s four public booking calls go through the core's own transport
  and `postFunction` is the HTTP shape of EVERY edge call in that file, so the
  core is exercised by every run of every suite. **A core the product does not
  itself run is a core that rots**, and the next person to find it wrong is a
  client's agent. **So a rule added to the booking flow goes in `core.js` and
  the page calls it** — a rule that lives in a step component again is a rule
  the next bespoke site re-derives from a screenshot.
  **What is deliberately NOT in it: wording, formatting, headings, height
  budgets, the four-card vehicle ceiling.** Those are measured against OUR page
  at OUR sizes and are wrong for somebody else's type.
  **The lift changed no behaviour and that was MEASURED rather than asserted**:
  every spare-room figure `sweep-booking-steps.mjs` printed afterwards is
  identical to the ones this file records.

- **THE PLATFORM BACK OFFICE EXISTS AT `/admin`, AND THE RULE THAT PROTECTS IT
  IS ABOUT WHAT IS *NOT* IN THE SCHEMA — roadmap 4.4 stage 1, 2026-09-05.**
  **NO ROW-LEVEL SECURITY POLICY ANYWHERE HAS AN "OR A PLATFORM ADMIN"
  CLAUSE, AND NONE MAY EVER GAIN ONE.** The obvious build adds that to the
  twenty tenant policies so the admin screens can use `supabase.from()` like
  every other screen; it works on day one and puts a cross-tenant escape hatch
  into twenty policies that are otherwise provably per-business. **One typo,
  one copied line, one policy rewritten by a later migration, and a detailer's
  browser reads somebody else's customers.** Instead the back office reads
  NOTHING through RLS — every byte comes from the `platform-admin` edge
  function under the service role — and `tests/platform-admin.test.mjs` § 1
  walks EVERY migration in the repo and fails if any `create policy` so much
  as mentions the admin check.
  **`platform_admins` AND `platform_admin_events` HAVE RLS FORCED AND NO
  POLICIES AT ALL**, which is not an oversight but the strongest statement
  available: a detailer cannot discover who the admins are, cannot make
  themselves one, and cannot forge or delete an audit row.
  **A NON-ADMIN GETS 404, NEVER 403**, from the server and from the screen. A
  403 tells a curious detailer the endpoint exists and that one row is all
  that stands between them and it. Proven live on deploy: demo owner → 404,
  anon → 401.
  **IMPERSONATION LOGS BEFORE IT ACTS AND A FAILED LOG STOPS IT** — the only
  place in that function where an audit failure is fatal, because everywhere
  else refusing to suspend a non-paying business over a log write is the wrong
  trade, and here *"it did not get written"* is not an answer to give a
  detailer who asks.
  **THE MASTER LOGIN IS `demo@demo.com` / `demo` AS OF 2026-09-07, AND IT IS
  THE ONLY ROW IN `platform_admins` — the owner's own instruction, roadmap
  8.2:** *"clear all logons, have my login for like the master login be email
  is demo@demo.com and password is demo."* Everything below about the seeded
  admin still describes the MECHANISM and is why it is safe to have one, but
  the account it names is gone: `demo-admin@detailplatform.com` and
  `shoot-admin@detailplatform.com` are deleted, and his two own addresses were
  revoked as admins. **P-12 is closed.**
  **IT IS A LAUNCH BLOCKER AND THE ROW'S OWN NOTE SAYS SO.** That password is
  on the account that reads every detailer, at a public address. It is safe
  only while every business in the database is a fixture, which is the state
  he has described and the state it is in; **the day a real detailer signs up
  it has to change.** Do not quietly "improve" it before then either — he
  chose it, and a session that swaps it locks him out of his own back office.
  **AND `demo@detailplatform.com` / `demo123` IS A DIFFERENT THING AND STAYS**
  — the demo DETAILER, which every sweep, every shooter and `e2e-booking` sign
  in with. Deleting it takes the verification suite down.
  **THE ADMIN ACCOUNT IS SEEDED ONLY BY `seed-demo.mjs --platform-admin` AND
  IS NEVER THE DEMO OWNER.** The demo login is deliberately guessable and
  lives on the live site; making it an admin would put every detailer's data
  behind `demo123`. The seeded account's random password lands in the
  gitignored `scripts/demo-refs.json`.
  **THE BACK OFFICE AND THE DETAILER PRINT THE SAME SETUP NUMBER** — the
  server sends `setupProgress`'s inputs and the screen runs
  `app/src/lib/setup.js`. Two numbers about the same thing is how a support
  call starts with an argument.
  **`app/src/admin/admin.css` SHARES NO RULE WITH `theme.css`, only its
  tokens.** 4.4's requirement is "its own route and layout", and a shared
  selector is the quiet way that gets broken.
  **STAGES 2-4 CLOSED IT THE SAME NIGHT, and three things in them bind future
  work.**
  **(1) `_shared/newBusiness.ts` IS WHAT "A NEW BUSINESS" MEANS, AND BOTH DOORS
  CALL IT.** Signup and the back office; a second copy is where two KINDS of
  business start to differ, and quietly — no `business_settings` row is a
  dashboard of nulls, no `business_hours` is a booking page that can never be
  booked, and **neither throws**. **It refuses to guess the OWNER** (the person
  signed up in person may have no account at all), which is why the invite is
  the other half of that stage rather than a separate feature.
  **(2) `businesses.site_url` IS NOT `business_domains.domain` AND MUST NEVER BE
  MERGED WITH IT.** That column means a hostname that RESOLVES TO THIS APP
  (roadmap 3.3); a detailer's own website may live anywhere, and putting one in
  that table points a customer's own booking link at a 404. Both new columns are
  revoked from `authenticated` at column level, because **a record its subject
  can edit is not a record**.
  **(3) `platform_settings.prices` CAN NOW OVERRIDE THE PRICE TABLE, AND NULL
  MEANS THE FILES.** That is the state it ships in and the state everything
  broken resolves to: an unparseable object, a missing key or a price that is
  not a positive number all fall back to `pricing.js` / `platformBilling.ts`,
  **WHOLE and never field by field** — one row's monthly beside one file's
  annual is a price nobody chose that looks exactly like a working one. **A
  seeded copy of the current table was refused**: it would be a third place the
  same numbers live and would silently become the stale one that wins.
  `pricesFrom` (Deno) and `livePricing` (browser) are the two validators the two
  tables already cost us, and `platform-billing` § 19 runs BOTH on the same
  inputs so a table the page would accept and the checkout would refuse cannot
  exist. **Every figure on `LandingPage.jsx` and `PricingPage.jsx` reads `P`,
  not `PRICING`** — a single leftover prints one number from the file beside
  another from the database, and two checks fail on one.
  **The editor WARNS and never refuses** when a typed ladder breaks its own two
  rules (two months free, +25% for no commitment); question 3 in
  `docs/overnight-log.md` asks the owner whether he wants it to refuse.

- **A DETAILER CAN HAVE THEIR OWN WEB ADDRESS NOW, AND THE ONE THING TO GET
  RIGHT IS WHAT `business_domains.domain` MEANS — roadmap 3.3, 2026-09-05. It
  is a HOSTNAME THAT RESOLVES TO THIS APP**, normally a subdomain the detailer
  has aliased onto our Netlify site. **It is not "the detailer's website".**
  The receipt, the plan page and the opt-out are pages OUR app serves, so
  pointing them at a host that does not serve them replaces one visible seam
  with a 404 — worse, because a customer who cannot open their own booking has
  lost it.
  **ALL FIVE URL BUILDERS IN `_shared/config.ts` TAKE THE SITE AS A REQUIRED
  FIRST ARGUMENT.** Until 3.3 they were built from one global `PLATFORM_URL`,
  which is contract §6a. **A default was considered and rejected**: it keeps
  every existing call working AND lets a call site forget the tenant while
  looking correct. Required, a forgotten argument puts `undefined` in a link,
  and `render-emails.mjs` already fails on that string. `siteFor()`
  (`_shared/tenantSite.ts`) resolves it — one query per invocation, cached —
  and returns `PLATFORM_URL` for every tenant without a verified domain, which
  is all of them today. **WHICH of several verified domains wins is
  `business_canonical_host` in SQL, never a rule at four call sites.**
  **VERIFICATION IS A FETCH, NOT A TICK.** `verify-domain` GETs
  `/platform-host.txt` from the address itself and requires a marker only this
  app serves; `app/public/platform-host.txt` is a real file Netlify serves
  ahead of the SPA's catch-all rewrite. **And `verified_at` is REVOKED FROM
  `authenticated` AT COLUMN LEVEL** — RLS chooses rows and not columns, so
  without that revoke a detailer stamps their own row and the fetch is
  decoration.
  **THE HOSTNAME CHANGES EXACTLY ONE ROUTE AND MUST KEEP CHANGING ONE.** `/`
  is the marketing page on our hosts and a detailer's booking page on theirs;
  every other path serves the same thing on either, because the alias points
  at this same site. `app/src/lib/host.js` is an ALLOWLIST of ours rather than
  a lookup, so the marketing page pays no round trip to answer a question that
  is almost always no — and an unrecognised host resolving to no business
  falls back to the marketing page. `tests/custom-domains.test.mjs` § 7 pins
  the count at one.
  **ONE STEP IS OURS AND CANNOT BE DONE FROM THE APP**: adding the alias in
  Netlify. The screen says so in as many words, because *Add* and *Check*
  without it leaves a detailer pressing Check for ever. Runbook:
  `docs/custom-domains.md`. Automating it needs a Netlify token behind roadmap
  4.4's platform admin.

- **THE BRIEF A FRESH AGENT IS POINTED AT TO BUILD A CLIENT'S SITE IS
  `docs/tenant-site-kit.md` — roadmap 3.2(c).** It is a POINTER and never a
  summary: every fact has one home and none of them is that file, because a kit
  that restates the contract is a second copy of the contract and the older one
  goes stale silently. **Its §5 is the part that matters most and it is the
  owner's ruling**: the three pages in `docs/tenant-sites/` are the STRUCTURAL
  range and NOT the taste reference. **A session that hands that file to an
  agent has handed over everything; a session that summarises it has forked
  it.**

## Context (read these, in this order, when new)

0. **`docs/README.md` — THE MAP, and it is the one to read first (2026-09-08).**
   This repo holds 4.3 MB of markdown and nobody reads it end to end. That file
   says what every document is, whether it is still TRUE, and which three you
   actually need for the job in front of you. **It also names the tier** — LIVE,
   REFERENCE, or HISTORICAL — and HISTORICAL means *do not act on it*. Reading
   it plus this file plus your one roadmap item is under 100 KB and is enough to
   start.
   **AND IF YOU ARE ONE OF THREE SESSIONS RUNNING AT ONCE, READ
   `docs/sessions/README.md` BEFORE YOU WRITE ANYTHING.** It is the folder
   ownership table, and the reason it exists is that a write to `app/src` while
   another session's browser sweep is running produces a GREEN run that measured
   a screen which navigated away underneath it.
1. `PROJECT-STATE.md` — full state briefing. **§ 1–7 only**; everything after
   is an append-only journal, one section per session.
2. `docs/HANDOFF.md` — architecture + open threads. **Its branch and deploy
   lines are stale; § Ground rules above is right.**
3. `DECISIONS.md` — every judgment call and why. **START AT ITS INDEX, not
   at the top of the file.** It is over 11,000 lines — the figure in this file said
   ~3,900 until 2026-09-04 and had been stale for a while — and reading it end
   to end is not a thing anyone does; the index block names the five mistakes that have
   actually cost sessions, and maps "about to touch X" to the two or three
   sections that matter. A decision you did not find is worse than one nobody
   wrote down, because it looks like diligence.
4. `docs/ux-audit.md` — the dashboard audit and its status
5. `docs/design-knowledge.md` — design/process research transfer
