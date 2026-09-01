# Detailing Platform — session rules

Read before working. These rules survive every `/clear`; chat instructions don't.

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
  So "main is months behind" is no longer true, and a session that finds them
  apart should say so rather than assume it is normal. See DECISIONS.md, "The
  owner put the redesign on `main` and published it".
- The owner's live business site (repo `carwashweb`, Supabase project
  `adtlnvihwrcqcasqcjwd`, Netlify, Resend domain andrewsdetail.com) takes
  real customers' money. Reads are allowed; writes only with the owner's
  explicit go-ahead for that specific action.
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
  (26 checks — it said 24 until 2026-08-30, which was stale) and
  `tests/design-contrast.test.mjs`. Don't contort work to
  pass them — if a test and a real design decision collide, the system file
  gets updated first, never silently.
- Never-defaults (in addition to the design system): Inter/Roboto/Arial/
  system-ui/Space Grotesk as design choices; purple-blue gradients on
  white; three evenly spaced cards; numbered markers on non-sequences;
  "modern and clean"-style copy. See `docs/design-knowledge.md`.
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
  completely readjust."* **It readjusts today**, which is why this is a build
  item and not just an absence: `theme.css`'s `min-width: 700px` and
  `min-width: 560px` rules fire on a sideways phone (844px wide), so a settings
  sheet becomes a centred desk panel showing 20% of its form. **Both gain
  `and (min-height: 500px)`** in roadmap 2.11 step 6.
  **The rule underneath, which is the transferable part: a layout decision that
  spends height must ask about height.**
  **`docs/dashboard-phone-pass-2026-08-31.md` is the phone's authority** and it
  overrides step 4's screen designs wherever the two disagree about a phone.

- **Imagery: never a grey placeholder box.** An Unsplash connector is
  wired up and confirmed working 2026-08-29 (`search_photos`; "car
  detailing" returns ~4,800 real photos). Use it for mockups, the demo
  business, and anything a tenant has not supplied. If it cannot find the
  right shot, ASK THE OWNER — they have said plainly they will go and
  source images rather than have work limited by what is to hand. Asking
  is cheaper than settling.

## Verification

- Finish every session: `node tests/composition.test.mjs`,
  `design-contrast`, `landing-pricing`, `route-contract` from repo root —
  credential-free, all must pass. **Add `node scripts/decisions-index.mjs`
  to that list if you touched `DECISIONS.md`.** The other 7 tests need env vars from
  root `.env`.
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
  eleven settings sheets, the client sheet and the booking page at **1920, 1440,
  392, 360 and 320** and reports anything past the right edge, anything
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
  the "a skipped check reads like a passing one" family again. It prints
  *276px short* today and **does not gate**: one constant at the top of the
  script, `DESKTOP_SPEC_BUILT`, is `false` until the desktop layout ships.
  **Roadmap 2.11 step 6 flips it to `true` in the same change**, and the summary
  line says out loud that a clean run is not proof while it is false.
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
  **What that leaves, and it was always true:** every check this script owns
  asks about the RIGHT-HAND edge, so it cannot see a bottom-edge failure at any
  size. `sweep-booking-steps.mjs` is the one that asks the bottom question, and
  only of the booking page.
  **The script needs the dev server and the demo login**, like
  `shoot-dashboard.mjs`. **It stubs `navigator.share` in on purpose** — Chrome
  on Windows has it and headless does not, and that one difference is the
  whole of walkthrough W14.
- **The check for anything that changes the BOOKING WIDGET:
  `node scripts/sweep-booking-steps.mjs`.** Same dev server, no login (the page
  is public). It walks every step at all four verification sizes, fills the form
  in as a customer would, and reports how far each step runs past the bottom of
  the screen AND how much room it has to spare. That is roadmap 2.7's W16 — the
  owner's rule that a customer should never scroll inside a step — and the
  script exits 1 while anything overflows, so it is the definition of done.
  `--lite` runs the `?lite=1` path; `--shots=DIR` saves the PNGs.
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
  product has already shipped one that was not.** `business_settings.travel_fee`
  was drawn on the booking page as “+$25” and was never in `computeQuote` — for
  the whole life of the quote engine, past eleven test suites, because every
  test asserted that the engine did what the engine did. Fixed in roadmap 2.8c.
  **When you add anything with a price, follow it all the way to
  `bookings.total_price` and to the confirmation email**, and check that the
  itemisation still adds up to the total — `tests/booking-engine.test.mjs`
  test 17 is the shape of that check.
- Report what was observed, never "this should work."

## Process

- One queue prompt per session; commit before the next; `/clear` and
  restart a session that goes sideways.
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

## Context (read these, in this order, when new)

1. `PROJECT-STATE.md` — full state briefing
2. `docs/HANDOFF.md` — architecture + open threads
3. `DECISIONS.md` — every judgment call and why. **START AT ITS INDEX, not
   at the top of the file.** It is ~3,900 lines and reading it end to end is
   not a thing anyone does; the index block names the five mistakes that have
   actually cost sessions, and maps "about to touch X" to the two or three
   sections that matter. A decision you did not find is worse than one nobody
   wrote down, because it looks like diligence.
4. `docs/ux-audit.md` — the dashboard audit and its status
5. `docs/design-knowledge.md` — design/process research transfer
