# Roadmap

The plan of record, in order. One item per session; check it off and commit
before the next. Items marked **OWNER** are things only the owner can do.
Decided 2026-08-28: the backend (booking engine, database, edge functions)
is kept; the entire visual design restarts from scratch.

## Phase 0 — Fix the plumbing (nothing here depends on the design)

- [x] 0.1 Cleanup: delete the pre-conversion junk files in the repo root
      (old seed/update scripts with the committed key, the dangerous
      `temp_enable_inserts.sql`, stale deploy scripts and docs,
      `.emergent/`, the dead `MonthlyRevenueChart.jsx`), and run the
      read-only check on the old project for the anonymous-inserts policy.
      **Done 2026-08-28** — 15 files removed; the check proved the
      anonymous-inserts policy was never applied (see DECISIONS.md).
      Open owner item: rotate the old project's anon key, still in git
      history.
- [x] 0.2 Fix email — **DONE 2026-08-29, proven.** Root cause: the deployed
      `PLATFORM_FROM_ADDRESS` was `onboarding@resend.dev`, Resend's SHARED
      sandbox sender, which Resend delivers only to the account owner's own
      address and rejects 403 for everyone else — before creating an email
      record, so the dashboard showed nothing at all. No code was at fault.
      Fixed by verifying `email.detailingplatform.com` in Resend (owner) and
      pointing the from-address at `bookings@email.detailingplatform.com`.
      Proof: a real booking through `create-booking` produced a customer
      confirmation to the owner's inbox, status **delivered**, in Resend's
      log. See DECISIONS.md.
- [x] 0.3 Reminders — **DONE 2026-08-29, proven.** pg_cron + pg_net now run
      `send-owner-reminders-sweep` every 15 minutes (migration
      `20260829000000`). A scheduled run sent a real reminder (delivered in
      Resend, 01:27 UTC), the next tick sent nothing (no duplicates), and a
      cancelled booking was never mailed. Two defects fixed on the way: the
      sweep was returning booking UUIDs to unauthenticated callers (a UUID is
      the credential for cancel/reschedule), and reminders never re-armed
      after an edit, so a rescheduled customer was never reminded of the new
      time. See DECISIONS.md. Left open: a failed tick is silent.
- [x] 0.4 Deployment sanity — **DONE 2026-08-29.** `detailingplatform.com`
      is served by the Netlify project `detailplatform-admin-test`, linked to
      the GitHub repo and building from `main` (`context=production`,
      `manual_deploy=false`, real commit ref) — owner confirms every publish
      to git updates the site. So **`main` = production, automatically.**
      Two hazards recorded rather than fixed: the repo is PUBLIC and carries
      a live-business service-role key in its history (see DECISIONS.md,
      owner action), and `.netlify/state.json` in the working directory pins
      the production site, so a manual `netlify deploy --prod` run there
      publishes to the live domain from any branch.

## Phase 1 — Choose the new look (the visual restart)

- [x] 1.1 **OWNER: collect 3–5 reference websites** — **DONE
      2026-08-29.** Seven delivered, plus one anti-reference (Kōpiko, an
      artisan bakery page). Crucially the owner scrolled each himself and
      recorded how they MOVE — `docs/references/TASTE-NOTES.md`, primary
      evidence, since screenshots are stills. Twenty screenshots in
      `screenshots/` (flat, timestamp-named; the mapping to sites is the
      table at the top of `ANALYSIS.md`).
- [x] 1.2 Short design brief interview — **DONE 2026-08-29.** All of
      `docs/design-brief.md` answered. Headline: nothing specific was wrong
      with the old look, it just read as AI-made, so competence is the
      failure mode for 1.3. Sunlight is not a constraint. Tenant accent
      colour is customer-facing only, from a curated four to six, so the
      dashboard keeps one fixed house palette.

      **Analysis done on top of 1.1, not asked for but load-bearing:** all
      seven codebases read and quoted in `docs/references/ANALYSIS.md`, then
      turned into a ranked, costed build list in
      `docs/references/DESIGN-BRIEF.md` — three things to build first,
      three to drop, and the four places the owner's own preferences fight
      each other. 1.3 starts from that file.
- [x] 1.3 **DONE 2026-08-29 — direction 5 built and APPROVED.** (Reopened earlier the same day when the owner rejected all four.) The first
      four are kept as evidence in `docs/design-directions/` (index.html,
      README.md), and the review that killed them is
      **`docs/design-directions/VERDICT.md` — read that before anything
      else.** Headline: the brief was wrong, not the execution. They sold car
      detailing; the product is a website plus an admin dashboard, sold to a
      detailer who currently books through DMs, Yelp and Google. So: no car
      photography as the subject (previews of our OWN dashboard, tenant site
      and booking widget instead, real ones), no before/after, no deposits,
      booking widget demoted, and far more scroll choreography.
      Three process failures caused it and must not repeat: `scrollcraft` was
      never invoked though `great-design` instructs the hand-off;
      `docs/references/ANALYSIS.md` (79 KB, all seven of his sites read at the
      code level) was never read, while Apple was over-weighted against his
      wishes; and `app/src/landing/LandingPage.jsx` was ignored even though
      `DESIGN.md` says copy and content are KEPT — he likes its wording better
      than anything in the four.
      **The Apple read is done and stays** (`docs/references/APPLE-READ.md`) —
      valid findings, but one input among eight, not the frame. The seven
      reference sites are the frame.
      Skills for the retry: **`ui-ux-pro-max`** (owner asked for it by name)
      and **`scrollcraft`** for structure and motion. Not `tastemaker` —
      it collides with ui-ux-pro-max over the palette. One screen per file.
      **The plan for the rebuild is written and ready to build from:
      `docs/design-directions/BUILD-BRIEF.md`.** ANALYSIS.md has now been read
      and its techniques are quoted in it; both skills have been run
      (ui-ux-pro-max's palette and type output is deliberately rejected and
      that rejection is disclosed in the brief); the grammar is **split
      stage** — what a detailer has now against what they would have — and
      the signature move is **the text messages becoming the schedule**.
      Build ONE page properly, not four. Two things need the owner's nod
      first and are named at the top of that file.

      **REBUILT 2026-08-29 — `docs/design-directions/5-the-thread.html`,
      "The Thread". Waiting on the owner to look at it; that is the only
      thing left in this item.** The two open questions were asked before
      any code and his answers are written into `BUILD-BRIEF.md` §7, which
      OVERRIDES §2 of that file: split stage is demoted from the page's
      grammar to a two-section beat, because he said no two scroll areas
      should look the same, and he capped the column layout at "a couple
      sections". He also added a requirement nobody had recorded — something
      must be animating at all times — and declined to give a non-web
      reference, so that question is closed rather than deferred.
      What shipped: one continuous ground with eight structurally different
      sections; the messages-become-the-schedule move; a rotating-tail
      typewriter and a never-stopping light; weighted scroll, a sticky
      horizontal rail, a glass pill nav, grain, and a `.lite` path — all
      hand-rolled, with **zero third-party JavaScript**, which also closes
      the GSAP Club licence question by not having it. Verified by looking
      at 392/768/1440, console clean, and the four credential-free tests
      pass. Nine defects were found by looking and fixed, including the
      rail costing 2.6 screens of scroll to move 34 pixels — his one hard
      no, reproduced exactly. Full write-up in `README.md` part one.

      **REVIEWED by the owner 2026-08-29 — "so much better", direction
      APPROVED.** Two further rounds of his corrections are in and verified
      (`README.md` "Round two" and "Round three"): heavier weighted scroll,
      reveals fixed (a 4-second blanket failsafe had been switching the
      whole page to its end state, so nothing below the fold ever animated),
      a pointer light across the whole page, a drifting dot lattice and
      faster ground lights, figures that roll up, and the founding offer
      ($499/$900, first three — `founding_total` defaults to 3 in migration
      20260828001000). Then he tested on an iPhone: the pinned section
      "glitches out", so **phones no longer pin at all** — the transfer is
      scrubbed through the viewport instead (riangle's safe form), with
      `svh` units and width-gated resize. Hover-only states now have a
      scroll-position equivalent on touch.
      **ONE BLOCKER LEFT: the iPhone fix is unverified — there is no iPhone
      here. He must reopen that section on his phone and confirm.** Nothing
      else in 1.4 depends on the answer.
      Also settled: the two-column beat did NOT read as a before/after, and
      copy is provisional by agreement — "in the future we'll critique the
      actual text on the page" — so a copy pass is a NAMED 1.4 task.

      **Round four applied 2026-08-29** (`README.md` "Round four"): reveals
      now run BOTH ways and are tied to scroll position, under one rule that
      also answers the trap he spotted himself — an element is hidden only
      while its top is below 82% of the screen, so landing anywhere renders
      everything readable. The phone's blank gap was a leftover
      `.thread-wrap{height:280vh}` from the pinned version sitting after the
      `height:auto` that replaced it: 1,379px of nothing, now gone, and the
      page is 1.6 screens shorter on a phone. The `$520` section was
      rewritten because he could not tell what it was for. Cursor light
      halved; the dots now move at ~16px/s instead of 1.8px/s.
- [x] 1.4 Refine the winner once. **APPROVED BY THE OWNER 2026-08-30** —
      *"i approve it for now"*, his qualifier, recorded as written: approved
      as the direction and the build, with copy still provisional by the
      earlier agreement. **Phase 1 is closed.** He also moved the artifact's
      share pin, so the shared link finally serves the current page instead
      of a frozen earlier round.

      **BUILT 2026-08-29 — every concrete change below is applied and verified
      by looking; the write-up is `docs/design-directions/README.md` rounds
      six and seven. He reviewed it: the iPhone passes, photography is
      approved, and the bottom-of-page glitch he reported is reproduced and
      fixed.**

      **THE MARKETING REWRITE IS BUILT — 2026-08-29.** He ran the page's text
      through a separate marketing AI, approved what came back and handed it
      over as a finished copy deck ("Approved by the owner. Build this."). It
      is built, verbatim, and verified: eleven deck sections plus the kept
      strip, three of them new. Write-up in
      `docs/design-directions/README.md` "Round eight"; the calls that were
      mine rather than the deck's are in `DECISIONS.md`.

      His constraint was met by addition: **thirteen motion mechanics went in
      and sixteen came out**, skeletons went from eight to twelve, and no two
      sections share one. That constraint stands for any future rework of
      this page — *"I don't want us to lose any of that cool animations and
      scrolling effects... we might have to change them up, switch them, the
      order, maybe completely redo some of them."* Copy and order are the
      marketing pass's to change; the motion is not spendable.

      **The page is now 12.72 screens at 1440, against 9.47.** Three new
      sections. "The page must not get longer" was his 1.4 instruction and the
      deck he has since approved supersedes it — flagged so a later session
      does not try to cut it back on the strength of the older note.

      **HIS FOUR INSTRUCTIONS ON THE REWRITE ARE APPLIED — 2026-08-29**
      (README "Round nine"): the $520 section removed; all competitor pricing
      removed, which CLOSES the pre-ship blocker by deletion; the owner
      section reformatted as an about; and scroll motion added to the new
      sections — the comparison table wipes in, the answers slide open on
      `::details-content` with no script, the closing glow gathers on
      approach, and the about statement grew a reading rule that fills with
      the words. Page is 12.39 screens at 1440.

      **THE OWNER SECTION WAS REMOVED on his instruction, 2026-08-29** — and
      that closed the two blockers attached to it, the photograph of him and
      his own words for it. Neither is needed. Ten sections now. The
      word-brightening mechanic went with the section and was deliberately
      NOT re-homed; the reasoning is in `DECISIONS.md`, and the section is
      recoverable in full from commit `6c6f412` if it ever becomes its own
      About page.

      **ROUND FOURTEEN — 2026-08-29, built through the `animate` skill on his
      instruction.** The locked beats are paced: each message now takes
      0.42–0.45 of a screen (was 0.10–0.18), each rail step 0.62–1.62, with
      ~0.4 screens of stillness at each end of both holds. Inside a lock a
      wheel notch carries half as far and the smoothing cannot bank more than
      0.55 of a screen — a hard flick used to clear all four messages and now
      clears one. **The key lesson, in `DECISIONS.md`: distribute the beats
      linearly across the hold and ease each beat individually. Easing the
      whole hold crushes every beat into its middle** — measured, and it was
      worse than the problem it was fixing.

      **⚠ THE PAGE IS NOW 15.47 SCREENS AT 1440 AND 17.07 ON A PHONE.** That
      is the cost of the pacing he asked for and every screen buys something,
      but it is long. **The lever is cutting a section, not shortening the
      beats** — shortening them puts back the complaint this round fixed.
      Candidates named in README "Round fourteen". His call.

      **ROUND THIRTEEN — 2026-08-29.** The thread now pins at EVERY width for
      a fixed 1.90-screen run, on his instruction ("you scroll until it fits
      the center of the page, and then it happens, and then you start going
      down again", "it shouldn't be dynamic to the page size"). One formula,
      no `window.innerHeight` anywhere in it, which is what makes pinning
      safe on iOS. The beat finishes at 0.85 of the hold so the last half
      screen is a still shot instead of cutting off. The rail's three steps
      now land dead centre at every width (within 2px), and its heading
      arrives with the lock rather than a screen early. The drift that made
      step three land 232px off was `getBoundingClientRect()` reporting a
      SCALED step — the measurement lesson is in `DECISIONS.md`. **The page
      is now 13.94 screens at 1440 and 14.91 on a phone**; pins reserve the
      height they hold, and he should see that number.

      **ROUND TWELVE — 2026-08-29. The 01/02/03 rail was never a pinning
      bug.** Measured at 1920, which is his monitor and the one width never
      being tested: the track was exactly one screen wide, so the section had
      FORTY PIXELS of travel and pinned for 0.04 of a screen. A step's width
      was capped at 560px and had been since it was built — "it was always
      broken on the desktop", exactly as he said. Steps are now 74vw (88vw on
      a phone) and the travel is 1,705px at 1920. The pin is back on phones
      and is iOS-safe by construction: the height is `calc(100svh +
      var(--travel))` in CSS instead of `window.innerHeight + travel` in
      script, and progress is measured against the stage's own height, so
      nothing in the section depends on a number iOS moves mid-scroll. The
      page is 13.46 screens at 1440, up from 11.60 — that is the pin
      reserving the height it holds, and it buys 1,848px of sideways travel.
      Also: the phone's message-to-row switch now happens 58–67% down the
      screen instead of at the bottom edge, because it is driven by the rows
      rather than by the top of the section. **The process lesson — test at
      his screen size, and do not delete a feature when the report might mean
      it is missing — is in `DECISIONS.md`.**

      **HIS ROUND-ELEVEN NOTES ARE APPLIED — 2026-08-29** (README "Round
      eleven"): the rotating line is part of the title again; the 01/02/03
      rail no longer pins on phones, which is the iOS bug he reported and the
      same fault the thread had in round three; and the phone's
      before-and-after now happens INSIDE the dashboard, with the flight cut
      from 540px to under 80px. A table row could enter the reading zone at
      1.80:1 during its wipe — found by measuring, retimed. The FAQ click he
      described already worked; verified rather than assumed.

      **ROUND FIFTEEN — 2026-08-29. THE 01/02/03 RAIL IS CUT, on his
      instruction, and the page is 10.41 screens at 1920 against 14.44.** He
      was asked to approve 1.4 and chose "cut a section". The candidates this
      file named were wrong: measured per section at his own width, the two
      LOCKED sections were 56% of the page and the two named candidates were
      0.84 and 0.73 screens each — a 5% cut he would not have felt. The rail
      cost 4.07 screens to move three cards sideways twice. Its one
      load-bearing sentence survives as term 01 of the pricing list. Verified
      at 1920/1440/768/392 in both paths: console clean, 0 stranded down and
      back up, junction looked at. Also fixed: the thread’s on-screen cost
      label still said "holds for 1.9 screens" two rounds after the hold
      became 3.0. Full write-up in README "Round fifteen"; the two process
      lessons are in DECISIONS.md.

      **He also KEPT the "A Facebook page" row** (the one line in the
      comparison table that was mine rather than the marketing deck’s), so
      that question is closed and the table stays five rows.

      **NOTHING IS LEFT THAT DOES NOT NEED HIM.** What remains is the OWNER
      checkpoint this item always ended on: he looks at the page and approves
      it, or sends the next round. One small thing to raise: **the "A Facebook
      page" row in the comparison table is mine, not the deck's** — one line
      either way. He also said "something feels a little missing" without
      being able to name it; the most likely answer is on the record in
      `DECISIONS.md`.

      Also recorded and NOT acted on: he finds the 1.4 hero slightly worse than
      the old rotating "DMs" line. The deck replaced that hero anyway, so the
      conflict is moot unless he still dislikes the new one. See `DECISIONS.md`
      under "The owner's review of the repointed page".

      Done and verified: hero headline and rotating tail; hero lede carrying
      both halves; "Stop booking jobs in your DMs" moved down to head the
      thread section; new ruled row 02 ("Changes when you do"); section 5
      replaced with the tenant WEBSITE and the booking panel inside it; the
      $900 reframed as a build price and the lead plan renamed "Website +
      dashboard"; the dashboard's empty state drawn; a copy pass over
      everything the repoint touched. Three defects found by looking and
      fixed, two of them pre-existing: "Start free" in the nav (there is no
      free tier), the reduced-motion path rendering "0 jobs · $0" above four
      visible jobs, and section 6's "no designer" contradicting the pricing
      card. The headline was resized against measured text widths — the new
      tails overflowed the column at 1440 AND at 392.

      **THE MAIN JOB: re-point the page at the website — WITHOUT demoting the
      dashboard.** The owner changed the positioning on 2026-08-29, from the
      market rather than from taste: "there's already a lot of those out there
      [booking engines], so my main advertisement should be a custom website."
      Then he corrected the framing the same day, and the correction is the
      operative version: "it's combined. It's not like, here's a custom website
      with you, also comes with the admin dashboard. No. So we're building this
      website and admin dashboard for you kinda thing... I don't want that to
      be lost."

      **So the sentence is "we build you a website and the dashboard that runs
      it", as one purchase.** The website half leads because it is the half
      that is not a commodity; the dashboard belongs in the same sentence,
      never in a later section that reads as a bonus. Only the live-editing
      FEATURE stays out of the headline. Do not fix the under-selling of the
      website by creating the same problem for the dashboard in reverse.

      Full reasoning in `DECISIONS.md` → "Positioning: what we sell is the
      pair" (read its correction section); the delivery model behind it is
      `docs/tenant-websites.md`. Order: the pair → the website half is custom,
      not a template → the dashboard keeps it current → booking as a feature →
      the terms.

      Concrete changes, all inside `docs/design-directions/5-the-thread.html`:
      - **Hero names both, website first.** Keep the rotating-tail mechanic he
        loves, rotating what they have NOW: "a Facebook page." / "a Yelp
        listing." / "a link in your bio." / "nothing at all." The line beneath
        it has to carry the dashboard in the same breath — one build, not a
        website with software attached.
      - **Move "Stop booking jobs in your DMs"** down to head the thread
        section — it is literally what that section shows. It stops being the
        promise and becomes the pain, which is the job it was doing anyway.
        Do not delete it: it is the only line he has ever praised.
      - **"What your customers see" becomes the website itself**, not only the
        booking widget. The widget becomes part of the page it lives on. This
        REPLACES that section rather than adding one — the page must not get
        longer, and he said so twice.
      - **One new ruled row**, placed second: changing a price in the
        dashboard changes the live site. NOT the headline — his explicit
        instruction — but it is the answer to why an agency site rots.
      - **Reframe the $900** as what it costs to have a site built for you,
        against the two real alternatives (do it yourself badly, or pay an
        agency thousands), instead of as a fee to get started.
      - Do NOT add a feature list for a site Phase 3 has not built. (A scope
        rule, not an honesty one: the owner has confirmed nothing is sold until
        everything is finished, so the page being ahead of Phase 3 is not a
        problem to solve — see `docs/tenant-websites.md` §6.1.)

      Also carried in from 1.3:
      - ~~**The iPhone check is still unverified.**~~ **PASSED 2026-08-29 —
        "iPhone check everything looks good."** The 1.3 blocker is closed; do
        not re-open it. One defect came with it — *"still some slight little
        glitch when you scroll all the way down to the bottom"* — which was
        reproduced at 392x844 and fixed: the reveal line is eased over the
        last stretch of the page and therefore moves at about twice the
        scroll delta there, so scrolling up un-revealed the footer it had
        just revealed. Arrival and departure now use different lines.
      - ~~Draw the dashboard's empty state (a detailer with no jobs today).~~
        **DONE 2026-08-29** — a dashed panel over the space the job rows
        reserve, fading on the first job's own progress value.
      - The weighted scroll is in and tuned to his feel; `?smooth=0` still
        toggles it if he wants to compare again on a real phone.
      - **A copy pass is a named task, agreed with him**: "in the future we'll
        kind of critique the actual text on the page." Only "Stop booking jobs
        in your DMs" has his explicit approval; the rest is carried from
        `app/src/landing/LandingPage.jsx`. The `$520` rewrite in round four is
        the worked example of what that pass looks like — every section has to
        answer "what am I looking at" before it answers anything else.
        **PARTLY DONE 2026-08-29**: the pass ran over every section the
        repoint touched and killed two untrue claims. The sections it did not
        touch — the $520 strip, "What you get" rows 01/03/04, the rail steps,
        the terms, the footer — still carry the old wording and still have not
        been through him.
- [x] 1.5 Write the new `docs/design-system.md` (replacing "Raking Light"),
      and rewrite the design tests to enforce the NEW rules. From this
      point the new system is law and direction-inventing skills are
      banned again.

      **DONE 2026-08-30.** `docs/design-system.md` is now **"The Thread"**:
      thirteen laws, the sixteen tokens, the two-face type scale, the
      composition grammar, the verification routine (four widths, 1920
      included), the never-defaults, and what survived Raking Light. The
      reference rendering is `docs/design-directions/5-the-thread.html` and
      the file says plainly that where the two disagree, **the page wins** —
      it is the thing he approved. `DESIGN.md` and `CLAUDE.md` are updated:
      **the skill-collision rule is back on from here — appliers and auditors
      only.**

      **Both design tests rewritten.** `composition` went from 5 checks to
      22: the two rules that carried over word for word (records are lists, a
      two-to-four choice is not a dropdown), plus no third-party animation
      library, exactly two type faces, no never-default font as a first
      family, one easing curve, exits faster than entrances, and — the one
      that actually prevents drift — **all sixteen tokens must agree across
      the page, the document and the test.** `design-contrast` measures every
      pair the document promises; the tightest is `--fog-2` on `--ink-2` at
      4.59:1, which is why that token may not be darkened.

      **A hole was found while rewriting: the landing page has had NO contrast
      coverage since the check was written.** Every landing row looked for
      `--bg` and `--panel`; `landing.css` calls them `--g` and `--p`, and each
      row was guarded by `if (token)`, so all five silently passed by doing
      nothing. Now checked properly — ten pairs, all passing, so it was a
      coverage hole and not a live defect. The lesson is in `DECISIONS.md`.

      **The device-tier question is CLOSED here**, which is where the roadmap
      put it: Apple's strategy, not riangle's — never ask what the device is,
      ask whether the thing arrived. No `deviceMemory`, no user-agent tiering.
      `.lite` plus reduced-motion plus "nothing is hidden behind an animation"
      is the whole defence. An fps governor is the one piece worth borrowing
      later, when something measured drops frames.

      **Three things this file deliberately does NOT settle**, listed at its
      end rather than invented, because direction-inventing is banned from
      here: **the light theme** (the evidence says drop it — sunlight is not a
      constraint and a second theme doubles every contrast and retint check —
      but it is a visible takeaway and it is his call, and it is the first
      question of Phase 2); the tenant's curated four-to-six accents, which
      nobody has picked; and the dashboard's own skeletons, which are the body
      of 2.3 and where this system will actually be tested.

## Phase 2 — Apply the new look everywhere

- [x] 2.1 Public booking page `/book/:slug` (heaviest weight: customers
      use it and prospects judge it) — including the empty-state rule: a
      business with two services and no photos must look intentional.

      **DONE 2026-08-30.** `app/src/book/booking.css` rewritten onto "The
      Thread": the sixteen tokens under their `--bk-*` names with the system
      name beside each, Archivo + JetBrains Mono, pill/panel/inset radii, the
      one easing curve, and an atmospheric ground (a drifting light that
      never stops, plus grain) instead of a flat fill. The receipt/manage
      page shares the stylesheet and came dark with it, ahead of its own
      restyle in 2.4. Full write-up, including every judgment call and the
      five threads it leaves open, is in DECISIONS.md → "Roadmap 2.1".

      **The empty-state rule holds.** `demo-riverside` — two services, no
      groups, no photos — reads as calm rather than unfinished: two
      well-spaced panels, a lit ground under them, and one clear next action.
      Nothing is stretched to fill and there is no placeholder.

      **Two things came out of it that outrank this item.** The tenant accent
      had to split into a fill value and a TEXT value, because a real preset
      (crimson) passes the 3:1 non-text floor and fails the 4.5:1 text floor —
      that is now written into `docs/design-system.md` § Tokens and applies to
      every tenant site in Phase 3. And the system named no error colour at all —
      the approved page has no red in it anywhere — so `--bad: #E2705F` was
      added to it, taken from the palette the product already ships rather
      than invented, measured on the new ground and enforced by
      `design-contrast`. 2.3 no longer walks into that hole.

      **ANSWERED 2026-08-30, before the item started: DARK — and now
      built.** He was asked separately rather than having it inferred from
      his dashboard answer, because this is a different surface — it *was*
      light-first on purpose (`BookingBusinessContext.jsx`, grounded on
      `--bk-bg: #E7E7E5`; it now grounds on `#0B0D0E`, and the comment was
      re-pointed as instructed below, not deleted). The deciding argument
      was the positioning: the
      page claims the booking form is built INTO the detailer's site, and a
      light form sitting inside a dark site breaks that on sight.
      **Keep the page's ground independent of dashboard state** — that is
      what the light-first comment is actually for, so re-point it rather
      than deleting it. Reopen in Phase 3 if a bespoke tenant site turns out
      light. See `DECISIONS.md` → "The customer booking page is dark".

- [x] 2.2 Marketing/landing page.

      **DONE 2026-08-30.** The reference rendering
      `docs/design-directions/5-the-thread.html` *is* this page, so this was
      a transplant, not an interpretation: its markup became
      `app/src/landing/LandingPage.jsx`, its stylesheet became
      `app/src/landing/landing.css` scoped under `.ld`, and its script became
      `app/src/landing/thread.js` — mountable and, because this is a route in
      an SPA, unmountable. The old `motion.jsx` is gone. Nine sections, nine
      skeletons, all nine mechanics.

      **The port is faithful by measurement, not by eye.** The page comes out
      at **10.41 screens at 1920, 11.26 at 1440 and 14.14 on a phone** — the
      same three numbers the approved page measured. Full write-up, every
      judgment call, and the four threads it leaves open: DECISIONS.md →
      "Roadmap 2.2".

      **Both things 2.1 left here are settled, and one of them was wrong.**

      1. **`?lite=1` now exists**, at the app root in `app/src/main.jsx`:
         `?lite=1` and `prefers-reduced-motion` both add `.lite` to `<html>`,
         before React renders. `booking.css`'s own
         `@media (prefers-reduced-motion)` block was swapped for `.lite` in
         the same session — otherwise the app would have had exactly the two
         implementations the system forbids, and `?lite=1` would have done
         nothing on the booking page. It works on both surfaces now.
      2. **The font claim in this item was wrong and NO family could be
         dropped.** It assumed the landing page and the dashboard each owned
         a share of Anybody / Public Sans / DM Mono. They do not:
         `app/src/theme.css` uses all three on its own, so restyling the
         landing page freed none of them. All three go together in 2.3, and
         `app/index.html` goes from five families to two in one edit. The
         reasoning is written into that file so the next session does not
         re-derive it.

- [x] 2.3 Dashboard — all five tabs and every settings screen.

      **REOPENED 2026-08-30 by the owner, after he looked at it — and CLOSED
      the same day. All three items (a), (b) and (c) below are done, verified
      in a real browser and committed.** Three defects and one design-system
      contradiction were found on the way; the full write-up is DECISIONS.md,
      "Roadmap 2.3, reopened". In short:
      - (a) The dashboard defines its own `--t-reveal: 420ms` /
        `--t-exit: 180ms` with a 40ms stagger. The last element settles at
        **580ms, down from 1160ms**. Documented in `docs/design-system.md`
        § Motion, "The dashboard's own reveal". The landing page's 950ms is
        untouched — checked.
      - (b) `applyDashboardAccent()` is back; all ~30 `var(--ac)` fills are
        `var(--accent)`. **The correction ground had to move to `--ink-3`** —
        correcting against `--ink-0` left six of eight presets under the text
        floor on a panel. `scripts/accent-sweep.mjs` (new) keeps it fixed.
      - (c) The routine ran at all four widths, normal and `?lite=1`, plus
        crimson/violet/gold/slate. `scripts/shoot-dashboard.mjs` **could not
        sign in** (stale password) and is fixed; it gained `--accent`.
      - Also fixed: stale tenant state surviving sign-out, and the sheet
        backdrop running the screen-reveal animation instead of its own.

      ~~**ONE THING IS STILL OPEN AND IT IS THE OWNER'S — see 2.4 item 3.**~~
      **CLOSED 2026-08-30 in 2.4, and the last sentence below was wrong twice
      over.** Crimson corrected for text is `#E55B5B`, ΔE 11.4 from `--bad`
      `#E2705F` — that number still stands. But dropping Crimson would not
      have fixed it: a deep red typed into the custom picker corrects to
      `#E26666`, ΔE **8.5**, closer still. And the collision was never
      red-only — a *silver* accent hits the "booked" ring at ΔE 8.5 too. The
      actual fix is two things, neither of them a shorter preset list: the
      owner's law 11b (paid is always green, so the pair is not both red) and
      an unconditional form vocabulary for the marks.

      ---

      **The original three items, kept for the record.**

      **(a) The load-in animation is too slow.** His words: *"when the page
      loads, the page animations and loading, it's perfect, but the GUIs just
      take a little too much time to go up and do the load-in animation. So if
      you can make that just a little speedier."* So the ARRIVAL of the screen's
      elements, not the ground and not the page as a whole. What he is feeling
      is `app/src/theme.css`'s `@keyframes arrive`, which runs for
      `--t-reveal` (950ms) with a 55ms stagger up to 210ms — the last element
      on a screen settles about 1.16 seconds after it appears. `bar-rise` (the
      Money chart) and `sheet-in` (every settings panel) also run at 950ms and
      are worth feeling at the same time.
      Roughly 380–450ms with a ~40ms stagger is the target; the system's own
      `--t-exit` is 420ms and the argument for reusing that number is that a
      tool opened forty times a day should not have its entrance be the
      slowest thing on it. **Law 4 says two presets and no ad-hoc durations,
      so whatever value is chosen goes into `docs/design-system.md` §
      Motion with its reason — not into the stylesheet quietly.**

      **(b) The dashboard takes the tenant's accent colour after all — and
      this ANSWERS the question 2.3 handed him.** His words: *"I think that we
      should have them be able to customize their admin dashboard accent
      color, because I think that the majority of accent colors will work…
      it's just with black, so almost anything goes with black or a darker
      colour."* **`docs/design-system.md` law 11 has already been rewritten to
      say so** — read it before starting. The code has not. What it takes:
      - `app/src/lib/theme.js`: `applyTheme` was DELETED in 2.3. Bring back an
        equivalent that writes `--accent`, `--accent-text` and `--accent-ink`
        on the document root, corrected against `--ink-0` (`#0B0D0E`). The
        two correction functions it needs are still there and still exported
        (`correctAccent`, `accentTextFor`), and `inkFor` picks the ink by
        measurement. There is no mode argument any more — one ground.
      - `app/src/context/BusinessContext.jsx`: it must call that on load and
        whenever `branding.primary_color` changes. The 2.3 comment in it says
        why the effect was removed; replace the comment, do not leave it.
      - **`app/src/theme.css` is the real work.** It writes `var(--ac)`
        directly in roughly thirty places — the tab bar's active tint, the
        primary button, `.chip.active`, `.choice.on`, `.cal-cell.today .n`,
        the switch, the day-rail's landed node, `.pill.completed`, `.ok-box`,
        `.confirm-box`, `--accent-quiet`, `--accent-line`, the spinner, focus
        rings. Every one of those has to become `var(--accent)` (a FILL) or
        `var(--accent-text)` (the colour used AS WORDS) — that distinction is
        law and it is why there are two values. `--ac` stays defined as the
        HOUSE default that `--accent` falls back to; the marketing page keeps
        using `--ac` and must not be touched.
      - `screens/more/Appearance.jsx` currently says in plain words that the
        dashboard keeps its own colours on purpose, and previews the colour on
        the booking page's ground only. Both are now wrong. Its More row
        summary ("Shown on your booking page") is wrong too.
      - **Then sweep the extremes.** Crimson `#DC2626` passes as a fill and
        fails as text on this ground — that is a real preset. Screenshot the
        dashboard under at least crimson, violet, gold and slate and read the
        contrast, because this is exactly the retint work the old law existed
        to avoid and it now lands here rather than in 2.4.

      **(c) Confirmed to him, and it is a standing expectation, not a
      one-off:** every screen IS opened in a real browser and looked at, at
      1920 / 1440x900 / 768x1024 / 392x844, with the console read — that is
      what `scripts/shoot-dashboard.mjs` is for, and it is how the Promos
      crash and the `.thread` leak were both found. Keep doing it; he asked
      because it is what he values about the process.

      **Also open, from the same conversation:** he tried to look at the new
      dashboard on the live site and on his phone and got a sign-in page, then
      the OLD dashboard behind it. **2.3 is on the branch and NOT on `main`**,
      and `main` is what detailingplatform.com serves. He has not been asked
      whether to publish. A simple demo login now exists so he can look —
      `demo@detailplatform.com` / `demo123` — see DECISIONS.md, "A guessable
      demo login".

      ---

      **What is already built and committed (commits `1fd6a32`, `c261e69`):** `app/src/theme.css` rewritten onto "The Thread":
      the sixteen tokens on `:root` under the system's own names (so it is now
      the system's home in the app and `design-contrast` reads it there),
      Archivo + JetBrains Mono, radii by role, one curve, and an atmospheric
      ground — a grain and two slow lights that never stop, which is law 2 —
      instead of a flat fill. The class API was kept unchanged on purpose:
      thirty components read those names and renaming three hundred call
      sites to change no pixel is the diff nobody should have to review.

      **The five skeletons are drawn and written up in
      `docs/dashboard-skeletons.md`**, which is the answer to the question
      `docs/design-system.md` parked for this item. Today is the only **rail**
      — the day's jobs strung on one hairline with a node each, hollow while
      a job is ahead and solid green once it has landed, which is the approved
      page's "scattered becomes ordered" at the far end of the same thread.
      Calendar is the only grid, Money the only chart, Clients the only screen
      with no panel on it, More the only screen made of panels.

      **Everything this item carried is done:** the light theme is gone from
      five places (one more than the four that were scoped — `BusinessContext`
      held the state and made the `applyTheme` call, and was not on the list);
      `app/index.html` went from five font families to two in one edit, as
      2.2 predicted; and `<meta name="theme-color">` is `#0B0D0E`, so all
      three surfaces paint the system's ground.

      **The three `theme.css` findings, judged on their merits:** `.stripe` is
      DELETED — its one remaining use sat inside a `.card` in Money's
      waiting-on-payment list, which makes it literally "an accent bar on a
      rounded card", and every row there has the same status so the colour
      carried nothing; Today's rail does its old job better. `.bars` no longer
      transitions height — the bars now grow on arrival with `transform:
      scaleY` off a bottom origin, and a month switch snaps, because animating
      bars between two different months implies a continuity that is not
      there. `.sheet` keeps its height transition, for the reason already
      commented in place.

      **A fourth thing, not on the list: `--success` and `--warning` are
      gone.** The system has one accent and one warm value; a second green
      and an amber beside them is a four-hue palette. The five booking
      statuses are carried by two hues and three shapes instead — see
      `docs/dashboard-skeletons.md` §5b for the table.

      **Found while verifying, and fixed:** `screens/more/Promos.jsx` used
      `<Segmented>` without importing it, so opening Promo codes crashed the
      whole app. Pre-existing, nothing to do with the restyle, and it had
      never been caught because nobody had walked all eleven settings screens
      in a browser.

      **And the global-sheet leak bit this item itself.** The day rail was
      called `.thread` first; `landing.css` already owns that name for the
      approved page's signature element, and because `theme.css` is global
      the bare rule gave the LIVE marketing page a rail it never had.
      Reproduced, renamed to `.dayrail`, re-checked — and the grep
      `landing.css`'s header has prescribed since 2.2 is now a test
      (`composition.test.mjs`, "theme.css cannot reach into a scoped sheet"),
      which immediately found a second, inert one in `booking.css`.

      **Verified by looking**, signed in as the seeded demo owner against real
      data: all five tabs and all eleven settings screens at 1920 / 1440x900 /
      768x1024 / 392x844, in the normal path and `?lite=1`, console read at
      every width. Full write-up and every judgment call: DECISIONS.md →
      "Roadmap 2.3".

      **One question went to the owner and is recorded in DECISIONS.md** — the
      dashboard now keeps a fixed house palette and no longer takes the
      detailer's brand colour, which is law 11 and his own reasoning, but
      `docs/design-brief.md` asked for it to be confirmed before 2.3 and it
      never was.

      **Carries the light-theme removal** (scoped at the end of
      `docs/design-system.md`) and — corrected in 2.2 — ALL THREE remaining
      font families out of `app/index.html`, not one or two: `theme.css` is
      the only thing still using Anybody, Public Sans and DM Mono, so they
      leave together with it. Also `<meta name="theme-color">`, still
      `#0F1012` — the outgoing dashboard ground — where the system's ground
      is `#0B0D0E`; two of the three surfaces already paint `#0B0D0E`, so
      this is the last one holding it back.

      **Three findings in `theme.css` handed forward from 2.2**, raised by
      the design hook against a file that item did not touch. Not fixed and
      not suppressed: 2.3 rewrites that stylesheet, so the right moment to
      decide each one is when the screen it belongs to is redrawn. Judge
      them on their merits, not on the hook's label:
      - `.stripe` (L262) — a 3px status border down the left of a booking
        row. Flagged as the "accent bar on a card" tell. It is not on a
        card, it is on a list row, and it is what stops status being
        carried by colour alone next to the status word. Probably keep the
        job it does; the shape is 2.3's call.
      - `.bars` (L490) — `transition: height` on the revenue chart's bars.
        A real layout-thrash smell. Twelve bars, once, on opening Money, so
        it has never been felt; `transform: scaleY` with a bottom origin is
        the cheap fix if the tab is rebuilt anyway.
      - `.sheet` (L564) — `transition: height` on the bottom sheet, already
        commented in place: the height IS the thing being dragged, and the
        transition is switched off while a finger is on it. Deliberate, and
        transform cannot express it. Keep unless the sheet itself changes.

      **Two things 2.1 established that this item must follow rather than
      re-derive:** never put `font-variation-settings` on a root element
      (law 8 now says why), and the tenant accent has a fill value and a
      separate TEXT value — though the dashboard keeps the fixed house
      palette, so only its `--accent-text` path is affected.
- [x] 2.4 Per-tenant recoloring. **DONE — 2026-08-30.** Item 3 (a/b/c) closed
      first; the cancel/reschedule page's COMPOSITION closed last.

      **The composition piece.** `/booking/:id` had FOUR identical full-width
      pills in a column — the count in the old note said three and was one
      short, because "Call …" only draws when the business has a phone. They
      were direct children of `.bk-wrap`, so its 26px SECTION gap fell between
      every one: four buttons rendering as four page sections, all one weight,
      with the destructive action as loud as "Add to my calendar". Now one
      group, three weights: filled (the tenant's accent) "Change the time",
      which is the reason the page exists; ringed "Add to my calendar";
      ringless under a hairline, sharing a row, "Cancel this booking" and
      "Call …". New in `booking.css`: `.bk-actions`, `.bk-exits`,
      `.bk-btn.danger` / `.bare`. The rule is now in `docs/design-system.md`
      § Composition, and `scripts/shoot-manage.mjs` is the first thing that
      reaches this page at all.

      **A live defect fixed with it:** with the cancellation window closed the
      note already prints the business's phone, and a "Call <same number>"
      button sat directly beneath it. Both come from
      `businesses.contact_phone`, checked at the source.

      **The red-on-red adjacency was measured and left alone.** ΔE vs `--bad`:
      Crimson 31.9, Rose 30.8, Ember 35.9 — against the 8.5 and 17.1 that item
      3c treated as real collisions. No colour changed. Numbers and the full
      verification walk: PROJECT-STATE.md §6c.

      Its colour was checked and is fine — the cancelled state there is carried
      by the word "Cancelled" plus a line-through on the date, so it has no
      colour-alone dependence.

      **Everything else this item listed is closed.** The extremes (neon,
      near-black, near-white, pure black) are swept on EVERY run of
      `node scripts/accent-sweep.mjs` now rather than only when someone passes
      a hex, and all clear both floors on all three grounds. The
      cancel/reschedule page already came dark in 2.1 and was walked at four
      widths then. "Both themes" was stale — there is one ground.

      **3a DONE — the preset list is twelve, built from evidence.** A 46-brand
      car-care sample plus general logo-colour studies. The headline number:
      **red is 48% of the trade, twice blue's 24%** — the owner's instinct
      confirmed, and proof that pruning the reds would have pruned half the
      market. Green is 0 of 46, which makes the house green a real
      differentiator. **There is no dark preset and that is a finding:** the
      correction moves lightness only, so deep navy paints `#4269D6` and deep
      garnet `#D72727`, each collapsing onto a brighter preset already listed.

      **3b DONE — `hueFamily()` and `describeAccent()` in `lib/theme.js`.**
      Nine families; saturation below 0.10 is neutral, which is what stops
      `#0A0A0A` being called "a red". It does NOT gate styling — its job is one
      live sentence on the Appearance screen. Its own check is sixteen pinned
      colours at the bottom of `accent-sweep.mjs`, and it caught three
      mislabelled bands on the first run.

      **3c DONE — and the fix is UNCONDITIONAL, not switched on for reds.**
      The premise was wrong: measured on the shipped markup, a *silver* accent
      collides with the "booked" ring at ΔE 8.5 — exactly as severe as the red
      pair — and a near-black accent with the blocked-day grey at ΔE 17.1.
      Three of five measured collisions have nothing to do with red. So the
      status marks became a form vocabulary that always holds: circles are
      jobs, a bar is a job that did not happen, squares are facts about the day.
      `--bad` left the calendar entirely. Table:
      `docs/dashboard-skeletons.md` §5b.

      **THE OWNER CHANGED THE FRAME MID-SESSION, and it is now law 11b:
      the accent is IDENTITY, never MEANING.** *"The paid should always be
      green because that's just kind of paid… the accent colour is more like
      the mark complete button or the calendar highlight."* Paid, money-up and
      "it worked" are fixed green; cancelled, no-show and errors are fixed red;
      the tenant's colour keeps actions, navigation, selection, focus, today's
      disc, chart bars and the landed node. Extended on his instruction to four
      sites he did not name — `.delta.up`, `.ok-box`, Money's `tone="good"`
      figure and `.badge.paid`. Full record: `docs/owner-walkthrough-2026-08-30.md`
      → D3 and DECISIONS.md → "Roadmap 2.4".

      **A LIVE defect on the CUSTOMER-FACING booking page was found while
      checking this, and fixed.** The sweep measured the dashboard; the booking
      page corrects its own values and had never been checked. `.bk-card
      .selected`'s accent ring — the only thing telling a customer which
      service they picked — sits on a lifted gradient topped by `--ink-3`, but
      the fill was corrected against the ground: Violet **2.78:1**, Slate 2.62,
      a black pick 2.56, a deep navy 2.51, all under the 3:1 floor, and Violet
      and Slate are shipped presets. The booking page now corrects its FILL
      against `--ink-3` and its TEXT against `--ink-0`. The rule is not "one
      ground per page" — it is **correct against the lightest surface THAT
      VALUE can land on**. `accent-sweep` measures the booking page every run
      now, and reverting the ground makes it exit 1 with those four numbers.

      **Two demo-seed defects were found and fixed on the way**, because both
      blocked looking at the product: the demo had NO cancelled and NO no-show
      booking in twenty-one rows (so that whole family of styling could not be
      seen at all), and the seed silently dropped the "tomorrow" bookings every
      weekend because `openDay(1)` collided with `day0` on a Sunday. 22 of 22
      seed now; it was 20.

      **One judgment call is flippable in one line if the owner disagrees:**
      *completed* stays on the tenant's accent while *paid* moves to green.
      Reasoning in law 11b.

> **Order note.** 2.6, 2.7, 2.8 and 2.9 are listed here, ahead of 2.5, because
> the file's order is the WORK order and a smoke test belongs at the end of the
> phase. 2.5 keeps its number so existing references to it stay valid.

- [x] 2.6 **The owner's walkthrough — the clipping and spacing half.**
      He went through every screen on a phone and on desktop, 2026-08-30. The
      full record with his own words is
      `docs/owner-walkthrough-2026-08-30.md`; item numbers below are its W
      numbers. This item is the small, checkable defects — do it before 2.7,
      because it is mostly one class of bug and the screenshot routine already
      catches it.

      **READ THE EMULATOR CAVEAT FIRST.** He was on a Windows phone emulator,
      not a real phone, and said so himself. Every "cut off to the right" item
      must be REPRODUCED at 392x844 before it is fixed —
      `node scripts/shoot-dashboard.mjs` already shoots that width. If it does
      not reproduce, close it and say so; do not fix what was never broken.

      - W7/W8 Clients detail on mobile: the boxes touch, and they are oversized
        for their content. Check against `theme.css` § SPACE (related ≤8,
        unrelated ≥28) — this one should be provable against the tokens.
      - W11 Promo codes: boxes touching.
      - W12 Message templates: the "the date" token chip clipped on the right.
      - W13 Hours & days off: the time fields clipped on the right.
      - W14 Your booking page: the "Open" button stretches off screen.
      - W15 One more clipped thing he saw and could not find again. A full
        392px sweep of every screen is how to find it, or rule it out.
      - W24 **The hover bug, and it is the best-argued item he gave.** Hovering
        an ALREADY-SELECTED option darkens it, which reads as un-selecting.
        A selected element's hover must move the same direction as its selected
        state, not against it. Affects `.choice.on` and `.chip.active` in
        `theme.css` and their booking-page equivalents.
      - **Asked and unanswered, from the 2.3 session:** `.row-item` in
        `theme.css` animates `transition: padding-left` on hover, which the
        design hook flags as layout thrash. It was left alone because the
        obvious rewrite (`transform: translateX`) is NOT equivalent — padding
        nudges only the left edge and lets the row re-flow, while a transform
        slides the whole row including the right-hand chevron. Pre-existing,
        never complained about. **Decide it while doing W24** — both are hover
        behaviour on list rows, so they are one pass, and either fix it
        properly or record that it is intentional.

      **DONE 2026-08-31. All eight items closed, every one reproduced at 392
      before it was touched.** Item-by-item outcomes with the measurements are
      in `docs/owner-walkthrough-2026-08-30.md`; the judgment calls are in
      DECISIONS.md → "Roadmap 2.6". The headlines:

      - **The emulator caveat nearly closed a real bug.** W14 does not
        reproduce headless, because `Share` only renders where
        `navigator.share` exists — Chrome on Windows has it, a headless
        browser does not. With it stubbed in, Open ends 24px off a 392px
        screen exactly as he said. Reproduce what HIS browser rendered, not
        what yours does.
      - **W24 was real and was NOT where this item said to look.** `theme.css`
        was already scoped correctly; the bug was `.bk-card.selectable:hover`
        on the customer-facing booking page, with no `:not(.selected)` and one
        selector more than `.bk-card.selected`. His rule is now **law 15** of
        the design system.
      - **W15 has an answer: Team**, the one screen the 392 sweep found that he
        had not named — the role control sat 60px off the edge. Caveat on the
        record: he said "the team's good", so it may be something else only his
        emulator showed.
      - **`.row-item`'s padding-left is ANSWERED**, and the 2.3 note was right
        that translating the row is not equivalent. Translating the TEXT is:
        measured, the words move 6px and the row, the chevron and `.txt`'s
        width all hold still.
      - **A live contrast defect was found underneath W24 and fixed at the
        root.** `--accent-text` was corrected against `--ink-3` but is printed
        on `--ink-3` tinted with the accent itself; nine presets plus black and
        near-black were under 4.5:1, worst 3.92 on a selected chip.
        `scripts/accent-sweep.mjs` now measures all four tinted grounds.
      - **Verified clean at 392 AND 360** — every dashboard screen, every
        settings sheet, the client detail and the booking page, for both
        clipping and touching boxes. 320 is not clean; see 2.9.

- [x] 2.7 **The owner's walkthrough — the features half.** Bigger work,
      several pieces need a decision first. Same source file.
      **DONE 2026-08-31 except the five that wait on 2.8's research** — W1,
      W2, W3, W4, W5, W6, W16, W17, W18, W19, W20, W23 and W26 are closed.
      W9, W10, W21, W22 and W25 are NOT started on purpose: every one of them
      is a question about what a detailer's catalogue and constraints look
      like, which is precisely what 2.8 answers, and building them first
      would mean freezing a guess into a schema. Item-by-item outcomes with
      the measurements are in `docs/owner-walkthrough-2026-08-30.md`; the
      judgment calls are in DECISIONS.md → "Roadmap 2.7". The headlines:

      - **W16 needed an instrument before it needed a fix.**
        `node scripts/sweep-booking-steps.mjs` walks the flow at all four
        verification sizes, fills it in as a customer would, and reports the
        overflow AND THE SPARE ROOM per step. Baseline was 8 of 12 step-views
        overflowing, worst 222px — 26% of a phone screen. All fit now, in the
        normal path and `?lite=1`.
      - **THE CEILING IS HONEST AND IT IS STEP 1.** Steps 2–7 are ours and
        have 90–500px spare. Step 1's height is the TENANT'S CATALOGUE: with
        the demo's four services it has 18px of room on a phone, so a fifth
        breaks it. W16 cannot hold in the absolute for a list the detailer
        controls, and the lever that raises the ceiling is W21 — which is one
        of the five waiting on 2.8. Do not "fix" this by shaving gaps.
      - **W1 was not where this item pointed.** It reads as the calendar
        cell; the cell has been a whole-box `<button>` since the day sheet
        was built. His sentence names the PANEL first and then says "that
        box" — the box is one of the three cards inside it.
      - **W4 closed a live hole underneath itself.** `dropoff_only_periods`
        reached the customer as a note on the booking page and nothing else;
        nothing on the way in ever read it, so a customer could read "this
        day is drop-off only" and book a mobile job anyway. The guard is in
        `_shared/slotValidation.ts`, where create-, reschedule- and
        update-booking all meet.
      - **W6 found two defects by LOOKING** that a month-only screen could
        never show: a net-negative period printed `$-189.00`, and the bar
        chart plotted `|value|`, so a $189 loss drew the same bar as a $189
        win.
      - **W20 was ours to call and his doubt is on the record.** Back moved
        into the price bar: 74px on every step but the first, against W16,
        which he stated as the general rule.
      - Calendar: W1 whole-box click target; W2 block a RANGE of days;
        W3 possibly ranged Set hours (confirm the shape first); W4 drop-off /
        mobile-only per day, driven by the detailer's own settings.
      - Money: W6 week / month / 6 months / year / lifetime ranges. He asked
        for the standard convention, not an invention.
      - Settings: W10 add-on groups and/or reordering.
      - Booking widget: W16 is the organising rule — **every step fits without
        scrolling**, on phone AND desktop (W23, W26). Then W17 estimated time,
        W19 add-ons as their own step, W21 a "full details" control on a
        service, W25 whether packages are mutually exclusive, W18 the uneven
        spacing, W20 the sticky back button — which he himself doubted against
        W17, so it is our call.
      - W22 **Water and electricity must become per-detailer.** The question
        exists because HE has no water tank or generator; he says most
        detailers do. Needs: optional per detailer, an electricity-only mode,
        and the ability to block a booking the detailer cannot service.

- [x] 2.8 **OWNER-ADJACENT: research how other detailers actually work.**
      **DONE 2026-08-31, AND THE OWNER ANSWERED ALL FOUR DECISIONS THE SAME
      DAY — `docs/detailer-research-2026-08-31.md`.** The item is checked
      because the research and the design are finished; the five 2.7 items are
      NOT built, and that file's "build order" section is how they should be,
      with the migration written out in full.

      **Two of his four answers came back different from the recommendation,
      and one replaced this research's own conclusion.** (1) **Categories, with
      the rule per category** — not one setting for the business. His menu is
      Interior / Exterior / add-ons and *"they could click one from each
      category"*, which is a sixth menu shape the five studied did not contain.
      He asked for research rather than giving a fixed answer, and the answer
      is a `service_groups` table with `max_select` per group — the restaurant
      POS "modifier group" pattern, which is the same problem solved decades
      ago. (2) **Vehicle sizes customisable by the detailer**, not the fixed
      five recommended. (3) From-prices: yes. (4) The condition question: yes.

      **AND THE BIGGEST FINDING CAME OUT OF ANSWER 1, MEASURED AT 392x844
      AGAINST THE RUNNING APP.** 2.7 said W16 "cannot be true in the absolute
      for a list the detailer controls" and left it there; his answer made it
      concrete enough to measure. **His own real menu — two categories, three
      services each — overflows step 1 by 119px.** Today's four-service demo
      has 18px spare, a service card is 97px, a category heading is 17px.
      **And the fix is measured too: folding the DESCRIPTION off the face of
      the card takes it 97px → 74px and that same menu from 119px over to 18px
      spare.** So W21's disclosure holds the description as well as the
      inclusion list, and it is a prerequisite for categories rather than a
      sibling. The vehicle step has the same shape now that sizes are
      tenant-defined: 238px spare, 79px per size, **six is the phone ceiling.**

      **What it found, in one paragraph each** (W25's and W9's conclusions were
      then superseded by his answers above; kept because the reasoning is the
      record of what the evidence showed, and because the reason W25's failed
      is the useful part — five menus rule shapes IN, they do not rule the
      remaining ones OUT). *W10 and W21 need NO
      migration* — `add_ons.sort_order` and `services.features` already exist
      and nothing writes either, so both were UI work misfiled as schema work.
      *W10 is reordering, not groups*: real add-on lists run 3–9 items and not
      one of the five menus studied groups them. *W21 is the W16 lever and it
      is also a live trap* — `StepServices.jsx` renders `features` inline
      today, so shipping an editor for that field before the disclosure arms a
      step-1 overflow for every tenant who fills it in; the disclosure ships
      first, always. *W22's premise was backwards*: he believed he was unusual
      in having no tank or generator, and most working detailers use the
      customer's tap and outlet — so the question he added for himself is the
      standard one, and what varies is WHICH resource and what happens on
      "no". Two three-state settings, and the block belongs in
      `_shared/slotValidation.ts` where all three write paths meet, not in the
      React step — W4 already found that exact hole. *W25 is one boolean*:
      four of five real menus are pick-one, the fifth is wholly à la carte, so
      it splits per business rather than per service or per group. *W27 is
      nearly complete as he said* — the one real gap is the condition
      question, and structured year/make/model is not worth its height until
      something reads it.

      **NOW CARRIES FIVE OF 2.7's ITEMS, not three.** W9, W10, W21, W22 and
      W25 were all left unbuilt in 2.7 because each one decides a shape the
      research has to fix first: what fields a service needs (W9), whether
      add-ons group or reorder (W10), how a service shows its full contents
      (W21 — and this is also the lever that raises step 1's height ceiling,
      see 2.7), which on-site resources a detailer must have (W22), and
      whether packages exclude each other (W25). W27 is the same thread.
      W9, W22 and W27 are one gap wearing three hats — the product is modelled
      on his business and he knows it, and he asked for this research more than
      once. Several 2.7 decisions depend on the answer (what fields a service
      needs, what the contact step must collect, which on-site constraints
      exist). Do this BEFORE the parts of 2.7 that depend on it, not after.

- [ ] 2.8b **Build the five items 2.8 unblocked.** Added 2026-08-31 as
      bookkeeping, not as a new plan: 2.7 lists W9, W10, W21, W22 and W25 as
      deliberately unbuilt, and 2.8's own text says to do them once the
      research answers them. It has, and the owner has answered the four
      decisions, so they now need a checkbox of their own rather than living
      inside a finished item. **This comes before 2.9** — 2.9 is a floor
      nobody has hit, and one of these five is currently the reason the
      owner's own menu does not fit step 1 on a phone.

      **Everything needed is written down: the migration in full, the build
      order, and the measured ceilings** — all in
      `docs/detailer-research-2026-08-31.md`. Do not re-derive them.
      Highlights that are easy to get wrong:

      - **W21's disclosure is FIRST and it holds the DESCRIPTION as well as
        the inclusion list.** It is the only one of the five that takes height
        off step 1; every other one adds. Card 97px → 74px, and the owner's own
        menu 119px over → 18px spare.
      - **One migration, one file, with the backfill.** `service_groups` with
        `max_select`, `services.group_id` + `price_is_from`, four columns on
        `business_settings`, four on `bookings`, and the three-value CHECK on
        `bookings.vehicle_size` dropped. `group_label`, `ask_water_electric`
        and `has_water_electric` are KEPT — append-only.
      - **W22's block goes in `_shared/slotValidation.ts`**, not the React
        step. W4 already found that exact hole in 2.7.
      - **Reshape the demo seed** to two categories of three, which is the
        arrangement every measurement was taken against.
      - Verify with `node scripts/sweep-booking-steps.mjs` and read the SPARE
        ROOM, not the pass. Step 1 and step 3 are both the tenant's budget now.

- [ ] 2.9 **The 320px floor — measured 2026-08-31, deferred on purpose.**
      PRODUCT.md promises "responsive 320→1440" and the product does not keep
      it, so this item is what makes that claim true. Nothing here is one of
      the owner's items, none of it is visible at any of the four verification
      widths, and none of it is visible on the device he was using — which is
      why it is its own item rather than part of 2.6. The exact list, measured
      at 320x844 with the same sweep 2.6 used:

      - Hours & days off: the two time fields overflow by 21px even on their
        own line. `input[type=time]` will not go below 138px in Chromium and
        two of them plus "to" want 287px of a 248px card. They have to stack,
        or lose the 12-hour display.
      - Booking rules: the three-way "I go to them / They come to me / Both"
        `.segmented` overflows by 15px. A segmented control with three long
        labels cannot hold one line at 320.
      - Client detail: the Navigate / Call / Text `.actions-row` overflows by
        16px — three `1fr` columns under their own min-content.
      - Your colour: a `.swatch` overflows by 3px; the swatch grid does not
        reflow at that width.

      Each needs its own layout decision, so do them as one pass with the
      sweep running, not as four patches. **The sweep is
      `node scripts/sweep-widths.mjs 320`** — it prints exactly the list above
      and exits 1 while any of it stands, so it is the definition of done for
      this item. `node scripts/sweep-widths.mjs` with no argument does 392 and
      360 and exits 0 today; keep it that way.

- [ ] 2.5 Smoke test: book, email arrives, shows on dashboard, cancel
      frees the slot, reschedule works. Stop and report anything broken.

## Phase 3 — Tenant websites (the biggest new build)

- [ ] 3.1 Plan: which pages every tenant gets (home, services, gallery,
      about, reviews, FAQ, contact, booking) and which settings drive each.
      **OWNER approves the plan.**
- [ ] 3.2 Build them. **NOTE: this wording predates the owner's 2026-08-29
      decision** — "entirely from tenant configuration, zero hardcoded
      content" describes the shared-system answer he rejected. Under the
      confirmed model the front end is custom per client and the ENGINE is
      shared, so what 3.2 must produce is the standard back-end wiring plus
      the list of things a site is REQUIRED to implement for the dashboard's
      features to work — his constraint: "a lot of the features of the admin
      dashboard need some features on the website to work." Rewording this is
      a 3.1 job. See `docs/tenant-websites.md` §3.
- [ ] 3.3 Custom domains: hostname→business lookup + the Netlify alias
      process, so website-package customers can use their own domain.
      Booking-only customers stay on `detailingplatform.com/book/name`.

- [ ] 3.4 **The tenant-site build kit** — promoted 2026-08-29 from a
      parked note to a real item, on the owner's description. What they
      asked for: open an agent pointed at this repo and have it already
      know everything needed to build a client's website properly — the
      reference research and why each site was liked
      (`docs/references/`), the anti-slop floor
      (`docs/design-knowledge.md` §1), the finished design system, and
      the landing page as the worked example. The platform's own landing
      page is the DEFAULT that tenant sites inherit; the owner then adds
      what a specific client wants on top.

      Design constraints that follow from the rest of this file:
      - It is a **markdown brief in the repo**, not a tool-specific skill
        or agent definition — see the portability rule in `CLAUDE.md`.
        The kit must work from whichever coding agent the owner is using.
      - It carries no client content. Everything specific to a business
        comes from tenant settings (3.2) or from the owner's per-client
        instructions.
      - It cannot be written before 1.5, because the design system it
        must encode does not exist yet. Sequenced here on purpose.

      **ANSWERED 2026-08-29 — the owner chose bespoke per client.** "For
      every single person, I wanna make a custom website for them", and
      explicitly not "some cookie-cutter website". His full description,
      quoted, is `docs/tenant-websites.md`. The recommendation below is
      therefore SUPERSEDED and is kept only as the reasoning that was
      weighed. The maintenance ceiling it warns about is real and does not
      go away — what removes most of it is one rule, proposed in
      `docs/tenant-websites.md` §3 and NOT yet reviewed by him: **fork the
      presentation, never the engine.** Booking logic, database, edge
      functions, dashboard and email stay central and shared; only layout,
      wording, imagery and palette diverge per client. Under that rule the
      kit's real deliverable is a documented contract between a site and the
      platform, and "custom for everyone" costs a design pass per client and
      nothing else.

      The two answers that were weighed, kept for the reasoning:

      - **A theme + settings for the one shared system** (what 3.2 says:
        "entirely from tenant configuration — zero hardcoded content").
        One codebase serves every client. A fix or a new feature reaches
        all of them at once. Costs nothing per client after the first.
        Ceiling: every site has the same bones, and a client who wants a
        page the system cannot express does not get it.
      - **A bespoke site built per client** (what the owner described:
        an agent that "creates me a website for the client"). Each one
        can be anything. But each is then its own codebase to host,
        update and fix, forever, and an improvement to one reaches none
        of the others. Ten clients means ten sites to maintain alone.

      **Former recommendation, now SUPERSEDED by the owner's answer above:
      the kit's default output is a theme plus settings for the shared
      system, and bespoke code is the priced exception.**
      That keeps one codebase and keeps every client receiving
      improvements, while still letting sites look genuinely different —
      the retint work, the curated palette and the alternating-ground
      system already give a lot of visual range without forking. The
      existing website-package / booking-only split (3.3) is the natural
      place to price the exception.

      This decided 3.1's plan and what 3.2 has to expose as settings. Note
      that 3.2 as written ("entirely from tenant configuration — zero
      hardcoded content") describes the SHARED-system answer and now needs
      rewording against the owner's choice; that is a 3.1 job.

      Also from the same conversation, not scheduled: **an intake form** the
      detailer fills in about their website, with examples to choose from,
      "because most of them will not know what they want in the abstract".

      **The kit builds the FIRST client site, not just later ones.** The owner,
      2026-08-29: "Phase 3, we will build it, and then the first customer site
      will be built by our bot." Nothing is sold before Phase 3 ships, so there
      is no hand-built site and no gap between what the page promises and what
      exists. Do not re-raise that as a risk.

## Phase 4 — Feature restoration + platform admin

- [ ] 4.1 Audit `reference/` (the old site's code) for anything dropped
      silently beyond the known list.
- [ ] 4.2 Re-add as per-tenant features: referral/loyalty, Google Calendar
      sync, owner test-booking preview, vCard on owner emails.
- [ ] 4.3 Monthly plans — needs a design conversation first: the old one
      was a discount with no billing behind it. **OWNER decision on how
      tenant subscription plans should charge.**
- [ ] 4.4 Platform admin area: business list + search, per-business
      actions (founding mark, suspend, plan tier, open-their-dashboard),
      manual business creation for in-person onboarding, platform
      settings, basic counts. Locked by a platform_admins table checked in
      the database, with a security test proving a business owner gets
      nothing.

## Phase 5 — Andrew's Auto Detail becomes tenant #1

- [ ] 5.1 Migration script: copy customers, bookings, services, history
      from the old project into the platform as a new business. Test on a
      copy first.
- [ ] 5.2 Parallel run: real bookings stay on the old site while **OWNER
      uses the platform daily** and reports everything missing or wrong.
- [ ] 5.3 Domain cutover (andrewsdetail.com → platform) — LAST, only on
      owner sign-off. Nothing on the old site is decommissioned before.

## Phase 6 — The demo business

- [ ] 6.1 Invent a believable (clearly fictional, "Demo"-marked) mobile
      detailer; build its full site from tenant config only. Real stock
      photography — **OWNER supplies photos if sourcing fails; never gray
      boxes.**
- [ ] 6.2 Seed ~3 months of obviously-fictional history + a reset script
      proven to restore exact state. Must not consume a founding spot.

## Phase 7 — Launch readiness

- [ ] 7.1 /terms and /privacy placeholders + support policy in the footer.
      **OWNER supplies real legal text later.**
- [ ] 7.2 Sentry error monitoring with PII scrubbing, proven with a fake
      record. **OWNER supplies the DSN.**
- [ ] 7.3 Final end-to-end pass as a brand-new business AND as staff,
      written to docs/final-pass.md, every rough edge ranked:
      blocks-launch / embarrassing / cosmetic.
- [ ] 7.4 **OWNER: founding-offer pricing sanity check** ($499 setup /
      $40 mo, counted spots) before the first sales call.

- [ ] 7.5 **`app/index.html` has no meta description and no Open Graph tags.**
      Noticed 2026-08-31 while running `ship-check` over roadmap 2.6; not
      fixed there because it is a content decision, not a layout one. The
      consequence is real and only affects the PUBLIC surfaces: Google writes
      its own snippet for detailingplatform.com, and a link shared in a text
      or on Facebook shows a bare URL with no title card. One index.html
      serves all three surfaces, so whatever is written there describes the
      marketing page — the copy comes from PRODUCT.md § Positioning, in its
      order (the website leads, the dashboard is not an accessory), and never
      generic SaaS-speak. Needs an OG image too, which is the part that needs
      the owner: there is no logo, by design.

## Standing owner jobs

- Pick and approve at every **OWNER** checkpoint — the plan stalls without
  you, on purpose.
- Test on your real phone regularly; what stutters for you stutters for
  detailers.
- Never start sales calls until Phase 7 is checked off (your own rule).

## Which skills each phase uses

The end-of-session handoff prompt reads this table. `ponytail` is always on.
Whenever anything visual is produced, the anti-slop floor in
`docs/design-knowledge.md` §1 and the never-defaults in `CLAUDE.md` apply —
those are not negotiable by any skill.

| Phase | Use | Never |
|---|---|---|
| 0 — plumbing | `cleanup-code` for deletions; `security-review` before anything touching RLS, keys or edge functions | any design skill — nothing here is visual |
| 1 — choose the look | **Direction-generating skills, and only here**: `frontend-design`, `tastemaker`, `great-design`. One per direction, so the directions stay genuinely different | applying a direction to real screens before the owner has picked one |
| 2 — apply the look | Appliers and auditors only: `impeccable`, `animate`, `ship-check`. The rewritten `docs/design-system.md` outranks any skill's opinion | direction-generating skills — the skill-collision rule is back on from 1.5 onward |
| 3 — tenant websites | `frontend-design` for page structure and hierarchy only; `ship-check` before calling it done | inventing color or type — those come from the system, not the skill |
| 4 — features + admin | `security-review` (the platform-admin lock especially), `code-review` | design skills |
| 5 — Andrew's migration | `security-review`, `code-review`. Real customer data — no shortcuts | anything that writes to the old project without an explicit go-ahead |
| 6 — demo business | `ship-check` | gray placeholder boxes; the owner's rule is real photography or ask |
| 7 — launch readiness | `ship-check`, `security-review`, `code-review` at high effort | shipping anything the owner has not seen at 392px |
