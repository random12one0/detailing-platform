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
        clipping and touching boxes. 320 was not clean; 2.9 fixed it and put
        320 into the sweep's default list.

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

- [x] 2.8b **Build the five items 2.8 unblocked.** Added 2026-08-31 as
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

      **DONE 2026-08-31. All five built, in the order that file gave, and the
      one migration applied.** Item-by-item outcomes with the measurements are
      in `docs/owner-walkthrough-2026-08-30.md` (W9, W10, W21, W22, W25, W27);
      the judgment calls are in DECISIONS.md → "Roadmap 2.8b". The headlines,
      and three of them are corrections to numbers this item quoted:

      - **W21 landed exactly on its prediction.** A service card is 74px on a
        phone with the description folded away, as measured. The owner’s own
        menu — two categories of three, which the demo seed now IS — fits with
        47px spare at 392x844.
      - **STEP 1’S BINDING SCREEN IS NO LONGER THE PHONE. It is 1440x900**,
        and that was found by running the sweep at all four sizes rather than
        at the one this item talked about. A card is 84px there (the card
        padding clamps up) against 74px on a phone, and 900px is the shortest
        screen we verify. It was 19px OVER until the step’s intro line came
        out — redundant once every category prints "choose one" — and it now
        has **10px spare**. A seventh service breaks 1440x900 first.
      - **THE VEHICLE-SIZE CEILING IS FOUR, NOT SIX.** 2.8 measured six before
        W27’s condition question existed; that question costs 120px of the same
        step. Measured after: four sizes fit with 39px (392) and 23px (1440),
        five are over by 40px and 66px. So four cards and a drop-down from
        five — which is where the design system already draws the segmented/
        list line, so the measurement and the law agree. A longer list is fully
        supported; it just stops being boxes.
      - **Both server-side guards have tests on the way in**, because W4 in 2.7
        was a rule that only existed on the page:
        `tests/booking-engine.test.mjs` test 13 (a category’s `max_select`)
        and test 14 (a REQUIRED resource — including that "just ask" must NOT
        block, and that drop-off never does). 63 checks pass, up from 52.
      - **One thing moved that nobody asked for, and measurement forced it:**
        activate/deactivate left the Catalog rows for the editor sheet. A 392px
        row cannot hold a worded button and two reorder arrows.
      - All 11 test suites pass; `sweep-widths` clean at 392 and 360;
        `sweep-booking-steps` clean at all four sizes in the normal path AND
        `?lite=1`; `accent-sweep` clean; and a real booking put through the UI
        stores `vehicle_size_label`, `vehicle_condition`, `has_water` and
        `has_power` correctly.

- [x] 2.8c **The category that IS the whole booking, and four more settings.** Added
      2026-08-31 because the owner asked, the same day 2.8b shipped, whether
      the category system was actually researched and whether it needs a rule
      where choosing from one category stops you choosing from another. It was
      researched — and he found a real hole.
      `docs/detailer-menu-shapes-2026-08-31.md` is the answer: ten real menus
      now, plus what four booking/POS products expose as settings.

      **The hole, REPRODUCED on the running app rather than argued:** a menu
      with a Complete Packages category AND standalone Interior and Exterior
      categories — Oregon Detail Co’s, a real one — lets a customer book the
      $625 complete package plus the $320 interior plus the $700 exterior, for
      **$1,645 of work the first one already contains**. Every category obeys
      its own “pick one” rule. The booking page allowed it and
      `create-booking` accepted it. It is roadmap 2.7’s W25 complaint again,
      one level up.

      **Recommended fix, and it is his idea in a cheaper shape: one switch per
      category, “Choosing from this category is the whole booking.”** One
      nullable boolean on `service_groups`; on means selecting anything in it
      clears everything else. Covers all ten menus, changes nothing for any
      existing tenant (off is today’s behaviour), and leaves his own
      Interior-plus-Exterior menu exactly as it is.
      **Pairwise “category A excludes category B” was rejected** — no product
      in the space exposes it, and six categories would need thirty decisions
      to say “one service, please”.

      **BLOCKED ON HIM**, because it costs every detailer one more setting to
      read past and changes what a customer can do. Enforcement goes in the
      two places `max_select` already lives: the booking page as a courtesy,
      `create-booking` as the rule.

      That file also lists the settings the trade’s own software has and we do
      not, ranked by evidence — time-of-day / rush / distance pricing is the
      biggest, then per-service availability. None of them is this item.

      **HE ANSWERED “BUILD EVERYTHING”, AND IT IS ALL BUILT — 2026-08-31.**
      Six things, three migrations, applied and verified in order. What
      shipped:

      - **The exclusive category.** “Booked on its own” per category. The
        Oregon Detail Co menu that booked **$1,645 for $625 of work now books
        $625**, refused on the page AND by `create-booking`.
      - **A description per category**, which Zenbooker’s modifier groups have
        and ours did not. Optional, because it costs step-1 height.
      - **Per-service availability:** which weekdays a service is offered, and
        whether it can be done at the customer’s address at all (a ceramic
        coating needs a garage). Enforced in `_shared/slotValidation.ts` beside
        W4’s and W22’s, and computed independently again in `available-slots`
        so a greyed-out day and a refused booking always agree.
      - **Travel pricing, and a LIVE MONEY BUG fixed underneath it.**
        `business_settings.travel_fee` was PRINTED on the booking page and
        `computeQuote` had no travel input at all — the customer was shown a
        mobile surcharge their Estimated total never contained. It is charged
        now, and **travel areas** (the detailer’s own named areas with a fee
        each) supersede it where they are set. Not geocoded distance: we
        cannot measure one, and naming your own area is how a small mobile
        business quotes it anyway.
      - **Surcharges by day/time and by short notice**, the two kinds the
        trade’s own software sells. Both are worked out on the server and
        printed on the receipt under the detailer’s own name for them.

      Three things went wrong on the way and each is worth carrying:

      - **The travel-area picker put step 4 six pixels past the bottom of a
        phone.** Fixed by cutting a question that restated the step heading
        (“How would you like this done?” under “Where should we do it?”) — the
        same cut, for the same reason, as step 1’s intro in 2.8b. 52px spare
        at 392 now, 74px at 1440x900.
      - **The flat travel fee kept printing “+$25” beside areas charging $0 and
        $40.** A different, wrong price above the right one; it only shows
        where there are no areas now.
      - **`composition.test.mjs` test 1 caught cards-in-cards** in the new
        settings lists and was right — both are ruled rows now.

      Also fixed because the numbers stopped adding up: the confirmation email
      and the invoice both itemise travel and every surcharge, because the
      subtotal contains them.

      Verified: **86 checks in `tests/booking-engine.test.mjs`** (was 63) —
      new tests 15, 16 and 17, including that the quoted total equals the
      charged total and that all three are snapshotted on the row; all 11
      suites pass; `sweep-booking-steps` clean at four sizes, normal and
      `?lite=1`; `sweep-widths` clean at 392/360 with the 320 list unchanged;
      `accent-sweep` clean; console clean at every width.

- [x] 2.9 **The 320px floor — measured 2026-08-31, deferred on purpose.**
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

      **DONE 2026-08-31. `sweep-widths.mjs 320` exits 0, and 320 is now IN THE
      DEFAULT LIST** — it was an argument you had to remember while it was
      failing on purpose, and the promise in PRODUCT.md deserves a gate that
      runs itself. All three widths, normal path and `?lite=1`, are clean.

      **The four decisions turned out to be one decision.** Below 361px a
      settings sheet gives a control 244px and two of anything will not share
      it, so the whole fix is one block in `theme.css` (§ THE 320 FLOOR) that
      says: pairs stack. Paired fields (`.grid2`) go one column at the field
      rhythm; the two time fields take a row each; a segmented control goes
      full width with equal columns and a wrapping label; three small buttons
      across drop their side padding; the twelve-colour palette goes 4x3.
      Above 360px nothing changed at all — 1440x900 and 1920 are pixel-identical.

      **Five things worth carrying forward:**

      - **TWO OF THE FOUR WERE ALREADY BROKEN AT 360 and the sweep could not
        see it.** The time fields wanted 303px of 284 and the segmented 295 of
        284; both overflowed their card by ~19px and ~11px and the card's own
        18px padding swallowed it, so nothing crossed the VIEWPORT edge, which
        is what the sweep measures. **A clean sweep means nothing is off the
        SCREEN, not that nothing is off its box.** Comparing each element's
        right edge with its PARENT's content box is what found it, and **that
        check is now the sweep's third one** — baselined against the pre-2.9
        commit, where it reports all four failures at 360 and nothing else, and
        silent at 392, 360 and 320 on the fixed code. `sweep-widths.mjs` also
        grew `--lite`, which `sweep-booking-steps.mjs` has had since 2.7.
      - **The lever on the time fields was copy, not layout — the third time
        in three items.** Two native time fields cannot share a 244px line at
        any spacing (Chromium will not draw one under 138px), so they stack;
        stacked, the word "to" no longer says which field is which, so each
        field took its own word (Opens / Closes). The row got clearer at 320
        than it is at 392.
      - **A FIFTH thing was found by LOOKING, not by the sweep**, and it is
        the one that made 320 unusable rather than merely clipped: a `Setting`
        with its control on the right left its explanation 96px of width and
        printed it five words to a line. Settings now put the control under
        the words below 361px. A switch is exempt — 46px costs the sentence
        nothing, and a toggle under its own label reads as a second setting.
      - **The palette went 4x3, not smaller circles.** Shrinking six columns
        to fit would have taken the tap target from 44px to 40px, under a
        floor it is already at; twelve is a whole rectangle either way.
      - **`.day > .times` gained a `.tfield` wrapper** in `Hours.jsx`. It
        renders identically above 360px — it exists so the fields can carry
        their own words below it.

      Verified: sweep clean at 392/360/320 in both paths; `composition`,
      `design-contrast`, `landing-pricing`, `route-contract` and
      `accent-sweep` all pass; screenshots read at 320 and 360 (Hours, Booking
      rules, Your colour, Business info, the client sheet, Today) and at
      1920/1440x900/768x1024/392 to confirm nothing above the breakpoint
      moved; console clean at every width.

- [x] 2.10 **Rethink the admin dashboard from first principles — the OWNER
      asked for this on 2026-08-31, in his own words, and they matter:**

      > "The layout of the admin's booking page is just based off of my admin
      > page for my business. That was just kind of made, you know, not with
      > much thought into it. So I kinda wanna go over what should be there and
      > how it should be laid out. So that's the tabs on the bottom — Today,
      > Calendar, Money, Clients, and More. Should those be completely
      > different? Should we have more done there? Or should we have less?
      > Should things be in different areas, especially in the More area? …I
      > just want to completely start from the beginning and decide how this
      > should be laid out to be most effective, look the prettiest, and be the
      > easiest to use and most convenient, and not just kind of looking
      > confusing. …When it's getting thought through, we shouldn't be taking
      > inspiration from it at all — kind of starting from scratch in a way.
      > And we're not actually starting from scratch, because we can obviously
      > use some of the stuff that we've learned. …Maybe after our audit it's
      > gonna be pretty similar, or maybe it'll be completely different and not
      > even close to where it was before. I don't want you to be limited by
      > anything. …Figure out what is the best admin page a detailer would
      > want, and that works for almost every detailer out there."

      **WHAT IS AND IS NOT BEING REOPENED.** The LOOK is not reopened — the
      design system ("The Thread") and the skill-collision rule stand, and no
      direction-generating skill runs. What is reopened is the INFORMATION
      ARCHITECTURE: what the five bottom tabs should be, whether five is the
      right number, what belongs on each, and how the eleven settings sheets
      behind More should be grouped, ordered and named. Shapes and components
      are `docs/dashboard-skeletons.md`; this item can change which screen a
      thing lives on without changing what it looks like when it gets there.

      **THE CONSTRAINT HE STATED TWICE: do not reason from the current
      dashboard.** It is the anti-reference for this item, the same way
      "Raking Light" is for the visual system. Derive the tabs from what a
      detailer does in a day, not from what our five tabs already are — then
      compare, and say plainly where the answer landed in the same place.

      **DO IT THE WAY 2.8 WAS DONE, because that is the shape that worked**:
      research → a written file → the owner answers → a separate build item.
      Concretely, and IN THIS ORDER:

      1. **Evidence, not taste.** What does a solo detailer actually open in a
         day, and in what order? Use the ten real menus already gathered in
         `docs/detailer-menu-shapes-2026-08-31.md` and
         `docs/detailer-research-2026-08-31.md`, and go wider: what the
         field-service and booking products in this trade put in a bottom bar
         (Jobber, Housecall Pro, Zenbooker, Square Appointments, Urable,
         Mobile Tech RX). Count what appears, not what impresses. A tab that
         four of six products carry is evidence; one that none carry needs a
         reason.
      2. **What our own product already knows.** Every screen and sheet that
         exists today, listed with what it is FOR — then sorted by how often a
         detailer would touch it. Daily / weekly / at-setup-only is the axis
         that decides tab vs More vs buried. This is the part that is allowed
         to look at the current dashboard, because it is an inventory, not a
         model.
      3. **Propose the architecture.** The bottom bar, with the reason for
         each tab and the reason for its position; what each tab holds; and
         the More screen laid out as GROUPS with names, in the order a
         detailer meets them, not the order they were built. Say what moves,
         what merges, what gets deleted, and what has to be built new.
      4. **Say what it costs.** Every move that breaks a habit, every screen
         that has to be written from scratch, and anything that needs schema.
      5. **STOP. The owner approves the architecture before any code.** Then
         it gets its own build item, like 2.8b did for 2.8.

      **The deliverable is `docs/dashboard-architecture-<date>.md`**, plus the
      DECISIONS.md section. Nothing in `app/` changes in this item.

      **Two things a cold session will get wrong.** (a) "More" is not a junk
      drawer to be defended — eleven sheets behind one row is exactly what he
      is pointing at. (b) The answer has to work for "almost every detailer
      out there", not for Andrew's — his business is one data point among the
      ten already researched, and the whole reason this item exists is that
      the current layout is a copy of his.

      **STEPS 1–4 ARE DONE, 2026-08-31. THE ITEM IS AT STEP 5 AND WAITING ON
      HIM.** The proposal is `docs/dashboard-architecture-2026-08-31.md`, the
      judgment calls are DECISIONS.md → "Roadmap 2.10 — the architecture
      proposal", and the summary is PROJECT-STATE.md §6h. **Nothing in `app/`
      changed and nothing should until he answers the five decisions at §5 of
      that file.** Tick this box when he does; the build is its own item.

      **What it landed on, so a cold session does not re-derive it.** Four of
      the five tabs survive untouched — Today, Calendar, Money, Clients each
      answer a question a detailer asks daily or weekly, and Schedule and
      Customers are top-level in six of six trade products. **The fifth tab is
      the whole problem:** seven of the eleven sheets behind More are the
      detailer's shopfront, not settings. Proposed: More is deleted as a tab,
      those seven become a tab called **"Your page"**, and the four plumbing
      sheets plus the account go behind a **gear in the header**. No schema,
      and no new skeleton — law 1 is exactly why a sixth tab was never on the
      table.

      **The finding is a comparison, not an opinion:** Jobber's own "More"
      holds nine things and not one changes what a customer sees, while
      "what you sell" is top-level in five of six products — and in ours it is
      a chevron inside a screen called Settings.

      **Three defects were found while inventorying and NONE is fixed here**,
      because this item changes no code: the push-notification switch has no
      client and delivers nothing; staff are offered "Your colour" and the
      database refuses the save; a staff member's whole More screen is those
      two rows. They are written up in PROJECT-STATE §6h — do not rediscover
      them as new.

      **HE ANSWERED THE FIVE AND WIDENED THE ITEM, 2026-08-31.** The fifth tab
      is **"Business"** (his choice, over the recommended "Your page"); the
      other four were delegated. And the scope grew: *"more than just the
      order of the tabs but of every GUI and how things look and are laid
      out, going through every single GUI tab page whatnot."* **That pass is
      done — Part B of the same file** — every screen and sheet shot at four
      sizes (`shots-2.10/`, 68 PNGs) and audited, 21 findings tabled, none
      fixed. **Two decisions are still open at §B6; the item stays unticked
      until he answers them.**

      **Read these three before touching the dashboard again.**
      **(a) There is no desktop layout** — the content column is 724px at
      EVERY width from 768 up, so More is 1,620px tall at 1920 and 1,626px at
      392, and History is 3,619px at 1440 and 3,619px at 392. Sixty per cent
      of his monitor is empty. Decision 6, and recommended LAST because it is
      the only stage that adds work rather than moving it.
      **(b) `composition.test.mjs` test 1 cannot see a card rendered through a
      component**, so History's 18-cards-in-a-list passes. Decision 7 — fix
      the test in the same change as the screen or it returns.
      **(c) "Business" does not enforce the admission test the way "Your page"
      would have**, so the rule is written out instead: a row belongs on
      Business only if it changes what a customer meets. Do not let it become
      More with a better name.

      **Before the build starts, seed a realistic day.** Today is a Monday,
      the demo is closed Sun/Mon and the seed dates "completed and paid" jobs
      tomorrow — so Today could only be photographed EMPTY, and the busiest
      state of the busiest screen has never been looked at.

      **CLOSED 2026-08-31. All seven decisions are answered.** Decision 6 is
      **yes** — *“desktop should get an actual layout specified just for
      desktop”*, and the word is **specified**. Decision 7 he declined — *“I
      don’t like the question”* — and he was right that it should never have
      been on his list: the composition test’s blind spot is a craft decision,
      not an owner decision. **It is settled inside 2.11 step 5 instead, and
      nobody re-asks him.**

      **AND HE REPLACED WHAT WOULD HAVE BEEN 2.10’s BUILD ITEM WITH SOMETHING
      BIGGER: roadmap 2.11, the dashboard rebuilt from scratch.** Everything
      in this item stays true and becomes an INPUT to that one — Part A’s tab
      bar is approved and must not be re-derived, and Part B’s 21 findings are
      the list of what the rebuild must not reproduce.

- [x] 2.11 **Build the admin dashboard from scratch, properly — the OWNER
      asked for this on 2026-08-31, immediately after answering 2.10's
      decisions, and his words are the brief:**

      > "I do want you to kind of create the entire admin dashboard from
      > scratch, with no… like, basically, like, forget about the old
      > dashboard or the current dashboard, forget everything about it, and
      > just know that — know every single aspect of, like, all the features
      > and whatever that's gonna be in the admin dashboard, and then create
      > it from scratch. …I wanna do it properly, like, from the start.
      > Because last time the admin dashboard was created, it was good, but it
      > was just kind of created. There was no… this time I want it to
      > actually be thought through, using the proper skills, using the
      > correct direction and order and steps that it has to take. Just
      > basically see every component and just see what best fits where and
      > what, and based on the information off of actual web design research,
      > what detailers want, what we need — basically, all of that."

      **THE ONE QUESTION THAT WAS OPEN HERE IS ANSWERED — read the boundary,
      not just the answer.** He said "using the correct direction", and *direction*
      is this project's word for the visual world. Two readings, and they are
      different projects:

      - **(A) The system stands.** "The Thread" (`docs/design-system.md`) is
        still law; what gets rebuilt from scratch are the dashboard's SCREENS,
        components, layout and desktop form, designed properly on the approved
        foundation. The skill-collision rule stays on — appliers and auditors
        only.
      - **(B) The direction reopens too**, and the dashboard gets a fresh
        visual world chosen through a direction round.

      **The reading this item is written for is (A)**, and the reasons are on
      the record rather than assumed: roadmap 2.10 — his own item, written
      from his own words — says in capitals that **the LOOK is not reopened**;
      he approved The Thread after fifteen rounds of his own corrections; and
      when he walked the whole product on 2026-08-30 his verdict was *"I
      really like the design."* His complaint both times has been that the
      dashboard was *"just kind of created"* — a thinking complaint about
      screens, not a taste complaint about the look. See DECISIONS.md → "Roadmap 2.11".

      **ANSWERED 2026-08-31: (A). "The look stays."** And he immediately
      asked the right follow-up — *"but that means like just the colors and
      like fonts stuff like that right"* — so **the boundary is written out
      below in three buckets rather than left as the phrase "the look", which
      is the ambiguity that would otherwise be re-litigated at step 4 of every
      screen.** The skill-collision rule stays ON: appliers and auditors only,
      no direction round.

      **BUCKET 1 — FIXED. Not reopened, not proposed against, not "improved".**
      The sixteen colour tokens; the two faces (Archivo across both variable
      axes, JetBrains Mono for every figure) and the type scale; the single
      dark ground (law 14 — there is no light theme); the tenant-accent rules
      (law 11 and 11b — the accent is identity, never meaning: paid is always
      the fixed green, cancelled always the fixed red); the motion budget (law
      3 — one staggered reveal per screen, no scroll choreography); the
      accessibility floors (4.5:1 text on its actual surface, 3:1 non-text
      edges, a visible focus ring, `prefers-reduced-motion`, 320→1440); and
      the never-defaults in `docs/design-knowledge.md` §1.

      **BUCKET 2 — FIXED IN KIND, GROWABLE BY DECISION.** The composition
      vocabulary: lit card, quiet card, ruled list, receipt, rail, bare
      figures, sunken panel. A rebuild MAY add a new one — a table, say, which
      the desktop specification will probably want — but only at **step 5, the
      component inventory, deliberately and once.** What is banned is what
      always happens otherwise: each screen quietly inventing its own fourth
      kind of list. Adding to the vocabulary updates `docs/design-system.md`
      first, never silently (CLAUDE.md's rule about a test and a design
      decision colliding).

      **BUCKET 3 — COMPLETELY OPEN. This is where the whole item lives.**
      Which block each screen uses and how many of them; what is on each
      screen, in what order, at what size and weight; every layout, phone and
      desktop, with the desktop specification being new work that has never
      existed; what every state looks like (empty, one, twelve, loading,
      error, staff). **"From scratch" means all of bucket 3 is a blank page.**

      **ONE RULE IN BUCKET 1 IS MORE THAN COSMETIC AND HE SHOULD KNOW IT
      SHAPES THE REBUILD: law 1 — one continuous ground, and every screen a
      structurally different skeleton.** It is why Today is the only rail,
      Calendar the only grid, Money the only chart and Clients the only screen
      with no panel on it. It is a real constraint on step 4, not a colour
      rule: it forbids two tabs that look like each other even when that would
      be the easy answer. **It stands unless he says otherwise** — flagged to
      him 2026-08-31 with the recommendation to keep it, because it is what
      stops five tabs collapsing into five stacks of identical rounded boxes,
      which is the named failure this whole product has already had once.
      **WHAT IS ALREADY DECIDED AND DOES NOT GET RE-DERIVED.** "From scratch"
      is about the screens, not about work he has already approved. Carried
      in, settled:

      - **The information architecture** — `docs/dashboard-architecture-2026-08-31.md`
        Part A, all five decisions answered 2026-08-31. Five tabs: **Today ·
        Calendar · Money · Clients · Business**, a gear in the header for
        plumbing, `+` in the header for a new booking. **Do not re-derive
        the tab bar.** The admission test comes with it: *a row belongs on
        Business only if it changes what a customer meets.*
      - **A desktop layout is a yes** (decision 6), and the word he used was
        **"specified"** — a written spec, not breakpoints bolted on.
      - **The 21 findings in Part B §B4** are the list of things the rebuild
        must not reproduce. Five of them are live defects, not composition.
      - **Everything below the UI** — schema, edge functions, the quote
        engine, the booking flow, emails, RLS. **None of it is reopened.**
        This item redraws the dashboard, not the product.

      **THE ORDER, AND IT IS THE PART HE ASKED FOR.** Each step ends in a file
      and steps 1 and 6 end with him. Nothing is built before step 6.

      0. **Prerequisites, because two of them poison the work if skipped.**
         **Seed a realistic day** — today is a Monday, the demo is closed
         Sun/Mon and the seed dates "completed and paid" jobs tomorrow, so
         Today has only ever been photographed EMPTY and the busiest state of
         the busiest screen has never been looked at. Also re-read
         `docs/dashboard-skeletons.md` (the shapes and why) and
         `docs/design-system.md` (law 1 especially: every screen a different
         skeleton).
      1. **The complete feature inventory — "know every single aspect".**
         One table of every capability the dashboard must carry, from five
         sources, none of which is optional:
         (a) what it does today — 2.10 Part A §2a, already written;
         (b) what has a database table or an edge function and **no UI** —
             `testimonials`, `campaigns` + `campaign_visits` + `track-visit`,
             `monthly_plans`, `business_domains`, and the owner push
             subscription functions;
         (c) what **he has already said comes back** — monthly plans,
             referral/loyalty, Google Calendar sync, the owner test-booking
             preview, the vCard attachment (DECISIONS.md → "Owner decisions");
         (d) what **Phase 3** will require the dashboard to run — the tenant
             websites: pages, about, FAQ, reviews, custom domain;
         (e) what the trade's products carry that we do not — the inbox,
             deposits, recurring/subscription work, before-and-after
             inspections, estimates (2.10 §1b has the six-product table).
         **He approves this list before a single screen is designed.** This is
         the step that makes it "from scratch" rather than "the same thing
         redrawn": you cannot lay out a dashboard around features you have not
         listed.
      2. **Research — the half 2.10 did not do.** 2.10 researched
         NAVIGATION and stopped there. Not yet researched: **how the
         individual screens should work** — the day view, the job record, the
         money screen, the client record, dense list design, and dashboard
         layout at desktop width. Same discipline as 2.8 and 2.10: the
         products' own documentation rather than review sites, source strength
         marked per claim, counts not impressions, and what it *cannot* tell
         you written down.
      3. **The desktop specification** (decision 6). Breakpoints; what each
         screen does with the width; which screens are two-column and what
         each column holds; what collapses below the breakpoint and back to
         what. **And the check: `scripts/sweep-widths.mjs` grows the desktop
         widths in the same item**, or the desktop layout becomes the only
         part of this product nothing automatically verifies.
         **DONE 2026-08-31 — `docs/dashboard-desktop-spec-2026-08-31.md`.**
         Two breakpoints, both derived: **1024** (the rail — it costs 120px of
         inset and still leaves 880px, so it never costs width) and **1180**
         (`--wrap`, where a 637px primary + 320px secondary + a 24px gap fit).
         Below 1024 nothing changes at all. Five screens, five DIFFERENT wide
         forms, because "list left, panel right" on all five is law 1's named
         failure — **and Calendar stays ONE column on purpose**, since
         splitting it takes the width straight back off the grid. The sweep now
         runs **1920/1440/392/360/320** at the verification heights and carries
         a fifth check, `dead-width`. **The week view is ruled NO** — §7.
      4. **Screen-by-screen design, on the approved system.** Per screen:
         what it is for, what it must show, **every state** — empty, one,
         many, loading, error, staff — the composition vocabulary it uses, and
         both its phone form and its desktop form. `impeccable shape` per
         screen. Still no code.
         **DONE 2026-08-31 — `docs/dashboard-screen-designs-2026-08-31.md`.**
         Eighteen screens, with the six states **defined once at the top** so a
         screen only says what differs — the file he has to approve stays
         readable. **The three defects steps 1–3 named and left are fixed on
         paper, and all three were re-measured in a live browser first**: three
         `.dayrail` elements where the skeletons file specifies one; a finished
         job wearing the hollow "ahead" node; a paid job wearing `#0ea5e9`, the
         tenant's accent, where the calendar draws `--ac`. **Today's labels are
         fixed by DELETION** — "Next up" and "Later today" collapse into one
         run called *Still to do*, because they were one kind of work split by a
         clock the ordering already respects. **A fourth defect was found by
         looking:** leaving Today and returning throws the whole day away and
         redraws it, and `reload()` does the same after every *Mark complete*.
         **The day screen carries the accept state 2.12 needs**, above the rail
         rather than on it. **The job record got the most work** (F4): an action
         bar over six named sections, replacing one 340-line scroll.
         **Four doors** for things the database already holds — Reviews, the
         three social links, the FAQ, Switch business — taking "built with no
         screen" from seven to three, each of the three with a stated reason.
      5. **The component inventory.** Every component the whole dashboard
         needs: which exist, which are new, which die. **This is where 2.10's
         declined decision 7 gets settled** — what counts as a list and what
         counts as a card is decided once, here, and `composition.test.mjs` is
         written to match that decision when the code lands. It is also what
         stops the eighth screen inventing a fourth kind of list.
         **DONE 2026-08-31 — `docs/dashboard-component-inventory-2026-08-31.md`.**
         **Twelve new files, one deleted, nothing invented**; 61 source files
         become 72. **History's and Clients' column-carrying row is ruled one
         CSS chassis with two call sites** — not a React component, and **not a
         new "table"**, so bucket 2's one permitted vocabulary addition is
         spent on nothing, deliberately. That settles decision 7: test 1's
         allowance becomes **per-CALLER, not per-component**, which is the half
         that lets it see the failure it exists to catch. The two genuinely new
         shapes are ruled — the setup form's progress rule (**a segment fills
         when a step is COMPLETED, never when it is passed**, or the bar and
         Business's "3 of 7 done" disagree) and the walkthrough's spotlight
         (**one element and a 9999px shadow**, and it must be verified against
         the EMPTY dashboard, not the demo). **One rule reorganises more code
         than any of the three:** a record renders its content and its
         container is the caller's — eleven `<Sheet>` call sites across ten
         files render their own today. **Three things found by counting:**
         `--wrap` has never existed in `theme.css`, `.badge` is seven dead
         rules duplicating `.pill`, and two settings-screen counts in the files
         above are off by one (thirteen, not twelve/eleven).
      4b. **THE PHONE PASS — ADDED 2026-08-31 BY HIS ANSWER TO STEP 6, AND IT
         IS THE ONLY THING BEFORE CODE.** He rejected the guarantee step 3 was
         proudest of: *"the whole admin dashboard is changing both with desktop
         and phone."* **Half of that was a wording bug** — "below 1024 nothing
         changes" meant *no screen grows a second column*, and it read as *the
         phone keeps the old dashboard*, which was never the plan. **Half is a
         real gap:** step 4 describes several phone forms as *"what ships
         today"*, and under his *"forget that the old dashboard even existed"*
         an unchanged screen is the absence of a decision rather than a
         decision. **Re-decide every screen's phone form from scratch**, in
         `docs/dashboard-screen-designs-2026-08-31.md`, marking what changed
         and what survived the pass ON ITS MERITS rather than by inheritance.
         ~~**And baseline phone landscape here**… **baseline first, then add it
         to SIZES.**~~ **DONE AND THEN WITHDRAWN BY HIM, SAME DAY.** It was
         baselined (clean on all 18 screens, which is itself a finding — every
         check in that script asks about the RIGHT edge and landscape fails at
         the bottom), and then he ruled phones **portrait only**. `844` is not
         in SIZES, `heightFor()` has no special case, and the `short-screen`
         check written for it was removed. See below and the phone pass §20.
         `impeccable shape`, one screen at a time. Still no code.

      6. **STOP. He approves the whole specification.** Then, and only then,
         it gets built — screen at a time, each one verified by LOOKING at
         1920 / 1440x900 / 768x1024 / 392x844 plus the desktop sweep, with
         `sweep-widths.mjs`, the four credential-free tests and
         `accent-sweep.mjs` after anything that touches colour.
         **THE ASK IS ON THE TABLE, 2026-08-31 —
         `docs/dashboard-spec-approval-2026-08-31.md`.** Five files totalling
         ~200KB are not a thing he can approve, so that page is the top layer
         across all five, **organised around the EIGHT places the spec removes
         something or contradicts him** rather than around what it adds — the
         week view ruled no against his conditional yes, the push switch
         withdrawn, the dead travel-fee field and the second colour picker
         deleted, Today's payment box deleted, Business 8 headings → 3, staff
         losing the Business tab, and monthly plans still doorless. **§6 of it
         is a blank block his answer gets written into**; an answer that lives
         only in the chat dies at the clear. **A build order is proposed there
         because no file had one** — the shell ships WITH Today rather than
         before it, and first run is last. **Nothing may be built until he
         answers.** PROJECT-STATE.md §6m.
         **HE ANSWERED THE SAME DAY: APPROVED WITH AMENDMENTS, and his answer
         is §6 of the approval page.** It reversed two of the eight, corrected
         a third that was wrong as written, and **withdrew this item's
         no-schema rule outright** — *"I don't know why there was a rule that
         did not edit the back end… do as much with the back end as you want."*
         So (b) below under "what a cold session will get wrong" — *it does NOT
         mean touching the schema, the engine or the booking flow* — **is
         SUPERSEDED BY THE OWNER. The constraint that replaces it is his own:
         forget the old dashboard's structure, keep the landing page's look.**
         **Four changes to what step 6 builds:** the push switch STAYS and its
         missing browser half gets built (there is no service worker anywhere
         in `app/`, nothing has ever subscribed a device, and the EMAIL is what
         reaches him today); the flat travel fee is **not** deleted because
         `pricing.ts:135` charges it — it becomes a sentence only once travel
         areas exist; the FAQ gets its **storage now and its screen later**, so
         twelve settings screens rather than thirteen; and ~~`sweep-widths.mjs`
         gains **phone landscape, ~844x390**~~ — **REVERSED BY HIM THE SAME DAY:
         phones are portrait only, and what step 6 owes instead is a guard that
         stops the layout changing on rotation.**
         **AND ONE STEP IS ADDED BEFORE ANY CODE — step 4b, the phone pass.**
         He rejected *"below 1024 nothing changes"*: *"the whole admin
         dashboard is changing both with desktop and phone."* Step 4 describes
         several phone forms as "what ships today", and under *forget the old
         dashboard existed* an unchanged screen is the absence of a decision
         rather than a decision. **Every screen's phone form is re-decided from
         scratch.**
         **STEP 4b IS DONE, 2026-08-31 — `docs/dashboard-phone-pass-2026-08-31.md`,
         and it is the phone's authority over step 4 wherever the two
         disagree.** Every screen decided again from nothing; "unchanged" was
         not an allowed answer, and where the answer came out the same the
         reason is written down. **The four portrait decisions:** only the lit
         job is a card (five identical 289px cards is this project's own named
         slop tell, and the day goes 3.4 screens to a projected 1.7); a
         settings screen becomes a PAGE rather than a floating sheet; Today's
         112px ledger panel becomes one row of bare figures; and a Clients row
         drops the customer's email for what they have spent and when they were
         last in.
         **AND HE RULED THE PHONE PORTRAIT-ONLY, WHICH CLOSED THE OTHER HALF OF
         THE STEP.** An earlier draft designed a landscape layout as well — he
         asked for landscape in the morning (*"or goes to landscape"*) and
         reversed it the same day: *"for the phone version, it should always
         just stay portrait… when someone flips their phone over sideways, I
         don't want it to completely readjust. It might get annoying."*
         **This is not "do nothing", because the dashboard READJUSTS TODAY:**
         `theme.css`'s `min-width: 700px` and `min-width: 560px` rules fire on a
         sideways phone (844px wide), so a settings sheet becomes a centred desk
         panel showing 20% of its form. **Both gain `and (min-height: 500px)` at
         step 6** — one clause, two places, and the desktop is untouched
         because a desk screen is taller than 500px. **The rule underneath: a
         layout decision that spends height must ask about height.**
         **What the ruling withdrew:** a left rail on short screens, sideways
         column-pairing, `844` in `sweep-widths.mjs`'s default sizes, and the
         `short-screen` check written for it — removed rather than left
         dormant, because a check nothing triggers is a check that rots. **The
         measurements are kept in the phone pass §20** so nobody re-derives
         them. **Roadmap 2.16 was opened for the booking page's landscape
         overflow and closed by the same ruling.**
         **Step 6, the build, is now the only thing left in 2.11.**
         **STAGE 1 OF THE BUILD IS DONE, 2026-09-01 — the shell and Today, which
         the approval page's §5 says ship together (plumbing alone has nothing
         to look at).** Shipped: the tab bar as a vertical glass pill rail at
         ≥1024 (the same component, `flex-direction: column`, not a sidebar);
         `--wrap` added to `theme.css` and `.app-main` taking it; `.split` /
         `.col-1` / `.col-2`; `hooks/useWide.js`; `components/RecordHost.jsx`
         and `BookingDetail` no longer rendering its own `<Sheet>`; the header
         `+` as the one door to a new booking, with Today's full-width button
         gone; ONE `.dayrail` with three runs named for the work
         (*Needs payment · Still to do · Done*) and the calendar's node
         vocabulary; only the LIT job as a card; the phone's bare-figure ledger
         and one-line Tomorrow; the empty state; the reload that dims instead of
         blanking (fixed in `useBookings`, so Calendar and Money get it too);
         and **the three rotation guards — three, not the two the phone pass
         listed**, because the calendar cell's own 700px rule spends height as
         well. **`DESKTOP_SPEC_BUILT` is `true`.**
         **Measured after:** content column 724 → **1,144px** at 1920 and 1440;
         Today **1,810 → 1,006px at 1440x900** (the requirement was ≤1,200) and
         **2,500 → 1,103px at 392** (the projection was ~1,265). Sweep clean at
         all five widths in both paths; all four credential-free tests and
         `accent-sweep` pass.
         **AND IT FOUND TWO DEFECTS ON `/job/:id`, the page a push notification
         opens** — losing the `<Sheet>` took the record's only way back, and
         every exit from that page went to `/`, **the marketing site**, because
         the dashboard is `/app`. The second predates the rebuild and was only
         findable by PRESSING the control the first one added.
         ~~**What stage 1 did NOT do, so nobody reads §5a as finished twice:**
         the job record is still the 340-line single scroll — it opens BESIDE
         the list at ≥1180 now, but its own redesign (an action bar over six
         named sections) is stage 2.~~
         **STAGE 2 IS DONE, 2026-09-01 — the job record.** The action bar
         first, unheaded and **pinned** (`.jobbar`, `position: sticky`); two
         rows of three; five named sections (*The job · The money · Notes ·
         What happened · Change the time or details*) where one 340-line scroll
         used to be; **Photos stays designed and not built**, and an absent
         thing draws nothing; three weights on *What happened* in place of a
         2×2 grid of identical buttons; and the *Estimated $235 · Final $235*
         copy fixed to one figure, with the difference NAMED when there is one.
         **TWO LIVE DEFECTS CAME OUT OF IT, both of them things the
         specification had already described without anyone noticing it was
         describing a bug.** (1) *"A job finished and unpaid — Finalize payment
         is the primary action"* was FALSE: the button only appeared while the
         job was still `confirmed`, so the record you reach by tapping Today's
         *Needs payment* card had no way to take the payment. It uses the
         card's own condition now. (2) **Nobody has ever seen "Reminder sent to
         customer." or "Invoice + thank-you sent."** — all four callers close
         the record on any change, and both messages were written into a panel
         that was already gone. The two actions that only send an email no
         longer report themselves as changes. **It mattered more from this
         stage on, because *Reminder* is now one tap in the bar.**
         **`sweep-widths.mjs` walks the job record now**, two jobs in two
         states, at all five widths — until this stage the object carrying 26 of
         the product's 126 capabilities had never been swept, so "clean" said
         nothing about it. Clean in both paths; the four credential-free tests
         and `accent-sweep` pass. ~~**Stages 3-7 of §5 remain.**~~
         **STAGE 3 IS DONE, 2026-09-01 — the calendar, which is three screens
         rather than one.** The desk writes the month out (up to three
         `time · name` lines a cell and a `+N more`, so *Booked / Done /
         No-show* become words and the legend shrinks to the two marks a cell
         cannot write); the legend lists only what is on the month shown, at
         both widths; the spoken cell label says *1 job* and names the day
         marks; `.cal-cell.selected` is alive after being dead CSS since 2.6;
         **the day opens INLINE UNDER THE GRID at every width** — not a sheet,
         not `RecordHost`, because a day is not a record and the month is the
         thing you read it against; and History is a ruled list with columns
         under month rules carrying each month's own total, with the nine
         filter chips behind one *Filter* below `--wrap` and in the second
         column above it. The screen's own *New booking* button and its own
         `<Sheet>` are both gone.
         **Measured:** History **3,942 → 1,373px at 1440** and **1,973px at
         392**; the cell 88 → 118px at 1440; `BookingCard` callers 4 → 2.
         **AND THE ONE A COLD SESSION MUST NOT RE-DERIVE: Today's staggered
         arrival had never once run.** The reveal block's second selector,
         `.app-main > .group > .col-1 > *`, matched nothing — a split screen's
         root is `.split`, so `.col-1` **is** a `.group` rather than a child of
         one. Nothing in the product could report it: a stagger that never runs
         looks exactly like a screen that has finished arriving. Found by
         reading the *computed* `animation-name` on the live screen.
         **Third member of the `dead-width` family**, and the transferable part
         is *a mechanism whose failure mode is silence needs a check that
         asserts it RAN*.
         **Four more that were only findable by building or by running:**
         `useBookings` swallowed its error, so a failed read drew an empty
         month, day and Money period with nothing saying so (fixed in the hook
         AND on all three callers); the filter chips ran 93px and 125px off the
         right edge of a phone, seen only because the sweep was taught to open
         the filter bar; `composition.test.mjs` test 1's rewrite **passed
         against the exact commit it was written to catch** on its first
         attempt, because `[^)]` cannot cross a callback's own `(b) =>`; and a
         staff session saw two state cards stating a default **with zero
         controls in them**. **`sweep-widths.mjs` walks the day, its three
         editors, the history, its filter bar and a history job now** — the tab
         was swept, its other two screens never had been.
         **AND THE OWNER'S COPY RULE LANDED IN THE SAME SESSION**, from
         *"Mobile — we go to them"* on the job record: **twenty-four sites**
         where the copy explained what the label already said. The rule and the
         half that stayed are in `docs/design-system.md` § Never-defaults and
         CLAUDE.md. ~~**Stages 4-7 of §5 remain.**~~
         **STAGE 4 IS DONE, 2026-09-01 — Money, and the accountant export.**
         The chart got the zero line step 4 asked for (a win stands on a 1px
         rule, a loss hangs below it, one scale for both directions) — and a
         second defect nobody had measured: **the bars themselves were 1.51:1
         and 1.68:1** against the ground, under the system's own 3:1 non-text
         floor, which every previous reading had treated as being about
         EDGES. They are 3.18 and 3.21 now, and because that could make a
         dark tenant accent measure like a dim bar, **the selected period's
         LABEL is what is lit** — form, not a second colour. The period
         control is one line at a desk and ~~a segmented control wrapping
         3 + 2~~ **five equal cells on one line** below 700 (the owner
         rejected the wrap on 2026-09-02 — see stage 5); the two questions are
         two columns; both dashed boxes are gone; the expense cap states
         itself.
         **The export (feature row 40, his Q4) is a flat CSV ledger** — a row
         per completed job, a row per expense carrying its own minus sign —
         **so the Amount column adds up to the Net printed on the screen**,
         which is what `tests/money-export.test.mjs` pins and what makes it
         checkable at all. ~~Its words are *Export for my accountant*.~~
         **Its words are *Export*, on the period line — the owner cut three
         of them on 2026-09-02, and it produced a rule.** *Send* would still
         be a lie on a desk, so *export* stands; naming the accountant does
         not.
         **Three things the design did not ask about, found by building it:**
         *Waiting on payment* was answering a period question, so switching
         Month→Week changed who owed you money; `loadExtras` swallowed all
         three of its errors, which is `useBookings`'s stage 3 defect in the
         file next door; and the expenses read stopped at TODAY rather than at
         the end of the period, hiding a forward-dated expense on the screen
         whose job is to list it.
         **AND THE OWNER REOPENED THE CALENDAR IN THE SAME PROMPT**, which is
         why the desk day panel is here rather than in stage 3: *"the calendar
         kind of has these huge blocks that take up the entire desktop
         space, and you have to scroll down… we have the space."* Measured:
         **1,284px of page against a 900px screen** at 1440 with a day open.
         **The day opens BESIDE the month at ≥1180** in a fixed 420px column,
         `--wrap` lifts to 1720 for that one screen, and the month keeps its
         written cells while the grid is ≥1,024px — so his 1920 loses nothing
         and a 1440 laptop trades the words for the panel, which is the trade
         he named. **Step 4 §4's "must not be split" is overruled and marked**.
         **`sweep-widths.mjs` walks Money's three period kinds, the unpaid job
         and the expense form now** — the tab was swept, its states never had
         been, which is stage 2's and stage 3's finding a third time.
         ~~**Stages 5-7 of §5 remain**~~ **STAGE 5 IS DONE, 2026-09-02 —
         Clients and the client record, plus three corrections he sent with
         the prompt.** The list shows what it already calculated (name · last
         visit · lifetime spend · phone, two cells on a phone); *last visit*
         can no longer print a future date, which was Part B row 6; the sort,
         the *Not seen in 3 months* chip and *"Text these N"* are built, which
         closes feature rows 47 and 48; the 200-row cap states itself. **The
         record has NO CONTAINER at either width** — law 1's entry for
         Clients — and `RecordHost` gained a `bare` prop rather than the
         `ClientRecord.jsx` the component inventory predicted, because a
         component with one caller extracted to satisfy a prediction is the
         abstraction this repo's rules forbid. **The list is full-bleed only
         while no client is open**: every other split screen has something for
         column two and this one does not, so the always-on grid left 465px
         dead inside the content column.
         **His three corrections, none of which were stage 5:** the Money
         period control's 3 + 2 wrap (*"three on top, two on the bottom, and
         they're spaced out weirdly"* — five cells of two sizes, now equal
         columns, and **4px of padding rather than 6 is the whole difference
         between one line and two at 392**); *Export for my accountant* →
         *Export* on the period line, **which produced a new never-default —
         a label names what the control DOES, never who the result is for** —
         and a copy sweep for that shape across the whole product found
         nothing else; and **the ground's two lights now carry the tenant's
         colour**, mixed in with the alphas untouched, because more light
         moves every floor measured against the ground (it was built brighter
         first and put two presets under the chart's 3:1 floor).
         **`sweep-widths.mjs` walks six Clients screens now, against one** —
         stage 2's, 3's and 4's finding a fourth time.
         ~~**Stages 6-7 of §5 remain: Business and the twelve settings screens ·
         first run.**~~ **STAGE 6 IS BUILT, 2026-09-02** — `More.jsx` is gone;
         the fifth tab is **Business** with eight rows in three groups, the
         plumbing is behind a header gear, and a settings screen is a PAGE
         below `--wrap` and the second column above it rather than a 640px
         sheet at every width. **Twelve settings screens** (Reviews is new;
         the FAQ’s storage landed and its screen did not, so it has no row —
         a row that opens nothing is the defect this stage repairs).
         **All three repairs landed:** *Your colour* writes one hex to both
         columns and the EMAIL finally has a contrast floor (its 3px rule was
         1:1 on its own band and Silver printed at 1.36:1 on white);
         `testimonials` has a door; and the push switch has its browser half.
         **Staff get THREE rail buttons, not the four two design files
         counted.** `sweep-widths.mjs` walks twelve settings screens through
         TWO doors, against eleven through one.
         **BOTH THINGS IT LEFT OPEN WERE CLOSED THE SAME DAY.** Push’s
         GRANTED path is **verified — the owner tapped the switch on a real
         device and a notification arrived** (headless Chromium always reports
         “denied”, so that last step was always going to be a person). And the
         QR is **built**, in a better shape than step 4 §10 designed: a
         *Generate QR code* button rather than a permanently-drawn code, which
         is his own answer. `tests/qr-scans.test.mjs` decodes it back with an
         independent library at both the saved and the on-screen size.
         ~~**Stage 7, first run, is the last one.**~~ **STAGE 7 IS BUILT,
         2026-09-02, AND WITH IT ROADMAP 2.11 IS DONE.** Two things the owner
         insisted stay two, and they are two: a **stepped setup form** —
         seven steps, one question each, *"I'll do this later"* on every one,
         and a *Finish setting up · N of 7 done* row on Business until it is
         finished or dismissed — and a **guided walkthrough**, one sentence
         and one element a step, a spotlight over the LIVE dashboard rather
         than a slideshow.
         **The seventh step is *Your colour*, and no design file named it:**
         §13a lists six areas while every other file says seven segments, and
         the seventh falls out of Business's own admission test minus the two
         a detailer cannot answer on their first morning (photos, reviews).
         **Completion is DERIVED where the database can answer it** — five of
         the seven are facts the schema already holds, which is what stops a
         business set up through the settings screens being told it has done
         nothing. `where you work` is the one that cannot be derived, because
         `mobile_enabled` and `dropoff_enabled` both default to true.
         **The tour's count is PLANNED before the first step is drawn**, after
         a staff login ran four steps while the card said "of 7" the whole
         way. Seven for an owner with jobs, six on an empty dashboard, four
         for staff.
         **Verified on a genuinely new business, signed up and created
         through the real forms**, because §1c asks for the empty dashboard
         and the seeded demo cannot answer it; the business and its account
         were deleted afterwards.
         **Both animate in and out in the same change** — the standing rule
         from 2026-09-02's own ruling, honoured for the first time here.
         **Three of his asks left this item entirely** — roadmap 2.13 (custom
         roles and permissions), 2.14 (plans with cadences, research first) and
         2.15 (travel by measured distance), **the last of which he then CLOSED
         the same day: he refused automatic calculation, and the alternative he
         described is the travel-areas picker that already ships.** **Staff getting no Business tab
         stands until 2.13 ships**, because it is correct for the two roles
         that exist today.

      **Skills, in order** (and this is the roadmap table's row for 2.11):
      `impeccable` — `shape` at step 4, one screen at a time; `critique` on
      each finished screen; `audit` for accessibility and responsive
      behaviour. `animate` only if motion actually changes. `ship-check` at
      the end. **No direction-generating skill unless the open question above
      is answered (B).**

      **Three things a cold session will get wrong.** (a) "From scratch" does
      NOT mean re-deriving the tab bar — he approved it on 2026-08-31 and
      re-opening it wastes his time. **(b) ~~It does NOT mean touching the
      schema, the engine or the booking flow.~~ WITHDRAWN BY THE OWNER,
      2026-08-31** — *"do as much with the back end as you want"*; the schema,
      emails and pricing are all open, and what he does NOT want inherited is
      the old dashboard's STRUCTURE. (c) The deliverable of steps 1–5 is
      FILES, not code; this is 2.8 → 2.8b's shape again, which is the shape
      that has worked twice on this project.

      **STEPS 0, 1 AND 2 ARE DONE, 2026-08-31, AND THE ITEM IS NOW WAITING ON
      HIM.** Files: `docs/dashboard-feature-inventory-2026-08-31.md` (118
      capabilities from the five sources — 98 working, 6 coming back, 6 with
      no door, 4 broken, 3 questions, 1 Phase 3) and
      `docs/dashboard-screen-research-2026-08-31.md` (fourteen findings).
      PROJECT-STATE.md §6i is the briefing; DECISIONS.md → "Roadmap 2.11,
      steps 0–2" is why.

      - **Step 0 is closed and it changed three files.** `seed-demo.mjs` now
        derives the demo's closed days from today and dates the day to TODAY,
        with every "completed" read off the clock rather than written down, so
        a finished job can never be printed in the future. **Five jobs 08:00–
        18:00 at 45-minute spacing — the business's own `buffer_minutes`, so
        five is the busiest day these settings ALLOW.** The two most recent
        finished jobs carry no payment, which is a state the seed had never
        produced: `needFinalize` was always empty, so **the lit card and the
        warn-box had never rendered against data.**
      - **The sweep found a live defect the minute Today had a job on it** —
        a job card's three action buttons, 6px outside their own card at 392
        and 18px at 320. **Fixed in `theme.css`**, because leaving the standing
        layout gate red would poison every later session in this item. 2.9 had
        measured the same row and fixed only the width it could see. **1px of
        spare room at both widths now; that is a real ceiling.**
      - **Five NEW defects are in the inventory §7**, none of them in Part B's
        21 because nothing could see them until Today had data. **The largest
        is not a layout at all:** "Your colour" writes `primary_color`, but an
        email uses `secondary_color` as its accent — the confirmation button,
        the labels, the invoice email's own title — and `secondary_color` is
        reachable only from a raw colour picker on Business info and is never
        seeded. Measured: four of twelve presets put the business name under
        the 3:1 floor on the email's header band, and picking "Sky" draws the
        invoice title at **1:1, the same colour on itself.** Email is the one
        surface `accent-sweep.mjs` does not reach.
      - ~~**SEVEN QUESTIONS ARE WAITING FOR HIM**~~ **ANSWERED, ALL SEVEN, THE
        SAME DAY, AND THE LIST IS APPROVED — it is now 126 rows.** Three he
        answered bigger than they were asked. **Q1 overruled the
        recommendation:** he wants a skippable setup FORM plus a separate
        guided walkthrough, and his constraints on the guide are the spec — no
        paragraphs, MORE steps, never two things in one step. **Q2:** FAQ, yes,
        optional, and the detailer writes it. **Q3:** week view only if it can
        be made convenient — the one `conditional` row on the list. **Q4:**
        export, yes. **Q5 became roadmap 2.12** — see below. **Q6:** deposits
        parked by him. **Q7:** photos, yes; the storage worry is answered with
        numbers (~2.5 GB per detailer per year against 100 GB included).
        **His caveat is instruction:** the file was too long to read, so §0a is
        now a one-page version — **anything he has to APPROVE needs a top layer
        he can actually read.**
      - **He also green-lit the colour fix without being asked:** *"we should
        work on the emails and other places where colors should apply… have it
        adapt based off of what color the detailer chooses."* One colour,
        everywhere, with a floor, and **`accent-sweep.mjs` grows to reach email
        in the same change.**
      - ~~**One finding steps 3 must handle carefully (F14).**~~ **SETTLED IN
        STEP 3.** Every product in the sample changes its navigation SHAPE on
        desktop and ours does not. **That was NOT the tab bar reopening** —
        Part A settled which five destinations exist and in what order, and it
        stands untouched. What was open was where the bar is DRAWN above the
        desktop breakpoint. **Answer: at ≥1024 the same glass pill turns
        vertical and fixes to the left edge** — same five buttons, same order,
        same glass, blur, radius and active fill, `flex-direction: column`.
        Not a conventional 220px label-beside-icon sidebar, which is the
        default admin shell the pill exists to avoid (`theme.css:525` says so
        in its own comment). **The header does not change shape at all** —
        name left, `+` and gear right at every width — which is the collision
        F14 flagged, resolved by not moving them.
      - **STEP 3 IS DONE, 2026-08-31.** File:
        `docs/dashboard-desktop-spec-2026-08-31.md`. It also carries **the
        week-view ruling (NO, §7)** and **his request-vs-reserve
        clarification (§8)**, which makes 2.12 smaller — see below.
      - **STEP 4 IS DONE, 2026-08-31.** File:
        `docs/dashboard-screen-designs-2026-08-31.md`. **STEP 5 IS NEXT** — the
        component inventory — and it inherits three things this file states and
        deliberately does not rule: whether History's and Clients'
        column-carrying row is one component or two (with 2.10's declined
        decision 7 and `composition.test.mjs` test 1 riding on the same
        answer), and **two genuinely new shapes** the design asks for — the
        stepped setup form's progress rule and the walkthrough's spotlight.
        **Step 4 also updates three files that outrank it, at build time and
        never silently:** `design-system.md` law 11b's table splits the rail's
        node between `--accent` (completed) and `--ac` (paid);
        `dashboard-skeletons.md` §6 puts a waiting request above unrecorded
        money in the lit order; and the desktop spec's §4a table row for the
        three day controls, which expand in place rather than becoming modals
        — the owner's own W1 instruction outranking a table.
- [x] 2.12 **Request-vs-reserve, accept/decline, and quotes — the OWNER's
      answer to 2.11's question 5, 2026-08-31, and it is engine work rather
      than layout.** **DONE 2026-09-02.**

      **WHAT SHIPPED, and the two decisions underneath it that a later session
      would otherwise re-take.**

      - **`business_settings.booking_mode`** — `reserve` | `request`, default
        `reserve`, on the Booking rules screen as the first thing on it. The
        migration is `20260902003000_request_mode_and_quotes.sql`.
      - **`bookings.status` grew ONE value, `pending`, and no more.** A
        DECLINE is `status = 'cancelled'` plus a new `declined_at`. There is no
        `declined` status and that was a decision: twelve places in this
        codebase ask `status <> 'cancelled'` and every one of them is already
        correct about a declined request, so a sixth status would have meant
        editing all twelve to say the same thing twice — and the first one
        anybody forgot would be a declined request still holding a slot.
      - **The exclusion constraint was NOT touched, and that is the whole
        point.** `pending` is not `cancelled`, so a request holds its slot with
        no change at all. It is a fact established by NOT writing something,
        which is why `tests/request-mode.test.mjs` tests 3 and 4 exist.
      - **A quote is `quoted_amount` / `quoted_note` / `quoted_at`, and it is
        never `total_price`.** Only the customer pressing the button in their
        email moves one to the other (`accept-quote`, public, UUID as the
        credential like `cancel-booking`). Accepting it lands the difference as
        a `price_adjustments` line so the receipt's itemisation still
        reconciles — test 8 is that tie-out, baselined by removing the line.
      - **Two edge functions**: `respond-to-booking` (member-gated: accept |
        decline | quote) and `accept-quote` (public). Saying NO to a quote is
        the ordinary `cancel-booking`, which is why there is no third.
      - **`tests/request-mode.test.mjs` — 45 checks**, needs the root `.env`.
      - **The four reminder RPCs now exclude `pending`**, and so does the
        manual Reminder button, or a customer whose request was never accepted
        gets "your appointment is tomorrow".
      - **The demo seed takes requests now** (`booking_mode: "request"`, two
        pending requests, one of them already quoted). Deliberate and not about
        Andrew: the demo is the only business `sweep-widths.mjs` can log into,
        and a reserve-mode demo means the request queue is never rendered at
        any width by anything. The sweep walks the request record and the quote
        sheet; it also stopped calling `.card.attend` "the lit job", which is
        now a request card.

      ~~**THREE THINGS LEFT OPEN, all of them his to answer.**~~ **ANSWERED
      2026-09-03, all three, and he took the recommendation on each.**

      - **Quotes stay on requests only.** His reason is the part to keep:
        *"the final pricing is usually done when you're there… most of the time
        you don't really get quoted digitally. With the request thing, you send
        them the quote, but it's really gonna be based off of your pricing, not
        as much as the person's car."* **A quote prices the JOB from the price
        list; the CAR is priced in person.** That is why it does not need to
        reach the pricing engine, and why `final_amount` at Finalize payment is
        still where the car's own price lands.
      - **The stale-request nudge is approved and BUILT** — a push and an email
        to the detailer when a request has sat unanswered.
      - **The demo staying in request mode** drew no objection.

      > *"I think there should be kind of a switch. Like, basically, when
      > someone books through the website, is it done booking, you know,
      > putting a request, or is it just like a ‘hey, I want to book this
      > time'? Because how I have it is, when you book, you're pretty confident
      > that's gonna be your day… you've reserved a time slot. Whereas other
      > detailers might want it that they just put in a request, and nothing is
      > reserved to them. It's just a request that they have to accept."*
      >
      > *"And maybe we can even have an accept page, or that same page — or the
      > Today page … the page that the detailer uses their bookings on, it could
      > be ‘accept this booking'. And then they can also send quotes, to have
      > that option. Obviously that's quite a bit of work, but that's probably
      > something a detailer would want to have an option for."*

      **HE CLARIFIED THIS ON 2026-08-31 AND IT MADE THE ITEM SMALLER. READ THIS
      BEFORE THE PARAGRAPH UNDER IT, WHICH IS NOW PARTLY WRONG.**

      > *"I didn't mean that if they choose to approve bookings… some could book
      > two of the same slots. So someone sends a request, it will take up that
      > time slot. But there should be a version they could choose of either: if
      > someone books, it's like, yeah, they booked for that time, we're gonna
      > do our best to make it to that time — while [in] a request it was like,
      > hey, this is when [I want it], and it's like, okay, I have to approve
      > it. You've not really guaranteed it. Obviously neither is gonna be a
      > hundred percent guaranteed, but one is just a little bit more guaranteed
      > than the other."*

      **A REQUEST HOLDS THE SLOT.** Two customers cannot request the same time.
      The difference between the two modes is **the promise made to the
      customer**, not the mechanics of the calendar — one is "you're booked,
      we'll do our best to be there", the other is "you've asked; the detailer
      has to accept it." Availability behaves **identically** in both modes.

      **What that deletes.** The paragraph below called the exclusion
      constraint the hard part. It is not a part at all: the constraint stays
      exactly as it is and nothing about availability changes. What is left is
      a per-business setting, one more booking status, an accept/decline
      action, and different wording on the customer's page and in the email.
      **Recorded in full at `docs/dashboard-desktop-spec-2026-08-31.md` §8.**

      **Why it is its own item.** Roadmap 2.11 redraws the dashboard and
      explicitly does not reopen the schema, the quote engine or the booking
      flow. This changes all three: a per-business mode setting, a booking that
      is HELD rather than confirmed, and an accept/decline path.
      ~~and availability that behaves differently in each mode (in request mode
      a slot is not taken, so two requests can want the same time — which the
      exclusion constraint currently forbids). **That last one is the hard part
      and it is not a UI question.**~~ **Struck by his clarification above** —
      kept visible because a session that finds only the corrected version will
      not know the harder reading was considered and ruled out by him.

      **What 2.11 still owes it.** Rows 123–25 of
      `docs/dashboard-feature-inventory-2026-08-31.md`. He named where the
      accept action lives — the screen the day is on — so **2.11 step 4 designs
      the day screen WITH an accept state**, and this item fills it in. That is
      the whole reason step 1 listed features before step 4 drew screens.
      **Step 3 has already reserved the room:** the desktop spec puts the
      request queue at the TOP of Today's second column, above tomorrow,
      because a request is the only object on that screen waiting on the
      detailer rather than on a car (spec §5a).

      **Quotes are the smaller half** and were the original question; the mode
      switch is the part that matters, because reserve-on-booking is currently
      Andrew's model baked in for every tenant.

- [x] 2.5 Smoke test: book, email arrives, shows on dashboard, cancel
      frees the slot, reschedule works. Stop and report anything broken.
      **DONE 2026-09-04, and it found a live crash on `main`.**

      **`scripts/e2e-booking.mjs` is rewritten and it is 82 checks across two
      tenants** — the demo (request mode, with the dashboard leg) and
      `demo-riverside` (reserve mode, the schema default every real tenant
      has). It books through the real browser, presses the button, reads the
      row, reads the project's edge-function logs for both sends, asks
      `available-slots` whether the slot is held, accepts the request on the
      dashboard, then reschedules and cancels from the receipt page. It is in
      CLAUDE.md's verification list now, which is the thing that stopped it
      rotting a second time.

      **WHAT IT FOUND — `ReferenceError: modeLimit is not defined`, a WHITE
      SCREEN on step 4 of the booking page for every business that offers only
      ONE of mobile and drop-off.** `StepLocation.jsx` took `modeLimit` as a
      prop from `BookingPage.jsx` and never destructured it, and the only
      branch that reads it is the one a single-mode business renders. Live on
      `main` since 2026-08-31 (`1ed5084`, roadmap 2.8c). It is a **total
      booking outage** for that tenant — the form dies at the address step and
      the customer meets the error boundary. Nobody had seen it because the
      demo enables both modes, so no script in this repo had ever rendered
      that branch.
      **The same line hid the other half:** `both` was computed inside
      `StepLocation` WITHOUT `modeLimit`, while `BookingPage`'s own
      `bothModes` includes it and feeds the step's heading — so a business
      with both modes on and a service that allows only one got the narrowed
      heading over two choice cards, and the *"Ceramic Coating has to be done
      at our place"* line that file was written to print was unreachable in
      every configuration that did not crash. One-line fix, both halves;
      verified by hand on a temporarily narrowed demo service.

      **Also found and fixed:** the demo's `contact_email` was
      `demo@detailplatform.com` — a sign-in reused as a mailbox.
      `notification_emails` is empty, so every owner alert fell back to it, and
      that domain is registered to somebody else with **no MX record**. The
      relay's undeliverable-domain guard let it straight through, so a booking
      on the demo asked Resend to deliver mail that could only hard-bounce,
      against the reputation Andrew's real customer mail shares. Now
      `demo@example.com`, which is reserved and IS in that guard.

      **What was NOT broken:** everything else. Both loops are green — the
      price bar matches `total_price`, a `pending` request holds its slot
      (roadmap 2.12's constraint fact, now checked from the outside), Accept
      turns it into a job, the reschedule frees the old slot and takes the new
      one, the cancel gives it back, and no console errors anywhere.

      **The emails are proven to the PROVIDER, not to an inbox.** The customer
      address is Resend's `delivered@resend.dev` simulator — the same one
      roadmap 0.3 used — so `send-email` really posts to Resend and a non-2xx
      would fail the run. Whether a human's mail client renders it is
      `scripts/send-test-emails.mjs --to=…` plus a person, which 2.18 did.

      **ONE GAP LEFT OPEN ON PURPOSE.** No seeded business has a service that
      narrows the mode, so the message above is still rendered by nothing
      automated. Seeding one is two lines — but it puts a new sentence on step
      4, which has 39px of spare height at 392 (W16), so it needs a
      `sweep-booking-steps.mjs` re-measure and belongs to whoever next touches
      that step's budget, not here.

      What already covered the engine underneath this, and still does:
      `node tests/booking-engine.test.mjs` (63 checks, real bookings through
      the deployed functions) and `node scripts/sweep-booking-steps.mjs`.

- [x] 2.13 **Custom roles and permissions — the OWNER asked for this on
      2026-08-31, answering roadmap 2.11 step 6, and it REVERSES that item's
      staff design. BUILT 2026-09-04.**

      > "right now, the owner kinda chooses this person's an owner, this
      > person's a staff, and we set the rules. They should set the rules. They
      > should just be, like, hey, invite someone, and you could give them a
      > name, like a customizable name, and you could also check out, like,
      > there should be options on what permissions they should have and what
      > they shouldn't have."

      **Why it is its own item and not part of 2.11.** 2.11 redraws screens.
      This changes who the database will answer. `business_users.role` is a
      two-value check constraint — `check (role in ('owner','staff'))`,
      `20260827003000_staff_roles.sql:27` — and **the enforcement is in
      row-level security**, through `public.is_business_owner(business_id)`,
      across the money, settings and marketing tables. Named roles with
      tickable permissions is a permissions MODEL: a permission set per
      membership, every one of those policies rewritten to read it, and a
      migration that cannot lose the protection the current design has.

      **The one thing that must survive the rewrite**, because it is a trigger
      today and not a policy: `protect_last_owner()` forbids removing or
      demoting the last owner **including for the service role**. Whatever
      replaces `role`, something must still make "a business with nobody who
      can administer it" unreachable.

      **What 2.11 does in the meantime.** Step 4 §10's ruling stands as
      written — staff get four rail buttons, not five, and no Business tab —
      because it is correct for the roles that exist TODAY. It becomes wrong
      the day this item ships, and the screen it names is where the new
      permission set gets read.

      **AND 2.12 GAVE IT ONE MORE PERMISSION TO NAME.** Staff can accept,
      decline and quote a booking request today — `respond-to-booking` uses
      `requireMember`, which does not distinguish the two roles. That is the
      right default for the roles that exist now (staff run the diary), and it
      is exactly the kind of thing this item makes a tick box. Verified on the
      staff demo login, not assumed.

      **Skills: none — this is schema, RLS and edge-function work.** It adds
      one settings screen that 2.11 already designed the skeleton for.

      **WHAT SHIPPED, 2026-09-04.**

      **`role` was NOT replaced, and that is the answer to this item's own
      warning.** `owner` still means everything, so `protect_last_owner()`
      keeps its subject and "a business nobody can administer" stays
      unreachable, service role included. A NON-owner membership now carries
      `label` (their business's own word for the role) and `permissions
      text[]`. Two migrations: `20260904000000_custom_roles.sql` and
      `20260904001000_catalog_behind_settings.sql`.

      **Four permissions, DERIVED from the schema rather than invented** —
      each is a group of policies that was already owner-only:
      `money` (expenses), `marketing` (promo codes, campaigns),
      `settings` (business settings, branding, the business itself, domains,
      message templates, AND — via the second migration — prices, hours,
      the catalog, the gallery and the storage bucket), and `requests`
      (answering a booking request). **The vocabulary is closed by a check
      constraint**, because a typo'd permission grants nothing and looks
      exactly like one that was never ticked.

      **"Team" is deliberately NOT one of them.** Whoever can hand out
      permissions can hand themselves every other one; making that safe needs
      a grant lattice nobody has asked for. Invites and membership stay
      `is_business_owner()`.

      **The permission 2.12 named is the one that TAKES AWAY**, so every
      existing staff row and live invite was backfilled with `requests`:
      nobody's dashboard did less the day this shipped than the day before.

      **The second migration exists because the tick did not mean its own
      words.** The screen says `settings` covers *"Prices, hours, booking
      rules, branding…"* and `services.price` / `business_hours` were
      `*_tenant_all` — writable by any member since before there were two
      roles. Unreachable through the UI is not the same as untrue. SELECT
      stays open to every member; only the writing verbs moved.

      **Tests: `staff-roles` 30 -> 64 checks**, every new one baselined by
      breaking the thing it guards (the helper made unconditional, the
      constraint dropped, the request gate removed, the old `services` policy
      restored). `composition` 72 -> 74. `sweep-widths.mjs` walks the opened
      role editor — the eighth time a state behind a button inside a screen
      has had to be added — **and now refuses to measure a screen the error
      boundary is on**, which it silently reported as "clean" during this
      item.

      **STANDING FOR THE OWNER (three questions, DECISIONS.md → Roadmap
      2.13):** whether a named role should ever be able to invite people;
      whether `money` should also hide a job's price from the diary (it does
      not today — bookings are member-readable, so a role without `money`
      still sees what each job is worth); and whether roles should become
      reusable definitions rather than per-person ticks once he has more than
      two or three staff.

- [ ] 2.14 **Plans a customer can sign up to — the OWNER asked for this on
      2026-08-31, and he asked for RESEARCH FIRST.**

      > "we should have, like, a plan section where they could customize
      > monthly, bimonthly, yearly, biweekly, you know, like, whatever they
      > want… and then it'll show up in the booking area, or they could just,
      > like, have it just listed on the website. And they could kinda choose
      > how they want to manage that. I don't know what's most — probably if
      > you kinda go over into research if most people have a monthly plan
      > within their booking system, or if that would be a good option. I mean,
      > that's how I do it, but I don't know."

      **Step 1 is the research, and he named it himself.** Do the six-product
      sweep the way 2.8 and 2.10 did it — the products' own documentation, not
      review sites, source strength per claim, counts not impressions: **do
      the trade's booking systems carry recurring plans or subscriptions at
      all, and when they do, is the plan sold IN the booking flow or listed
      beside it?** He runs plans in his own business and explicitly does not
      want that generalised without evidence.

      **What exists, so nobody re-derives it.** ~~`monthly_plans` is real and
      has no screen — but it is only a discount.~~ **CORRECTED 2026-09-04 (by
      roadmap 2.13, whose migration failed on it): `monthly_plans` DOES NOT
      EXIST.** It was created in `20260827000200_tenant_data.sql:51` — `name`,
      `description`, `discount_type` (percentage|amount), `discount_value`,
      `is_active` — and **DROPPED nine hours later** in
      `20260827001000_phase2_cleanup_and_storage.sql:16`. The line above cited
      only the creating migration, which is why it read as true for a week.
      **So the ground is barer than this item thought**: there is no table, no
      cadence, no enrolment and no recurring booking, and "monthly plans come
      back" — one of the five reversals of 2026-08-28 — is not a matter of
      giving an existing feature a door. Roadmap 2.11 step 4 §15 was right to
      refuse to design it in the margin, and it was even more right than it
      knew. **The transferable bit: a `create table` line is not evidence the
      table is there — grep the whole folder, or ask the database.**

      **The two design questions the research feeds**, both his words: whether
      the plan appears inside the booking flow or is listed beside it, and
      whether that is the DETAILER's choice or the product's.

      **Skills: `impeccable` for the screens once the shape is settled.** The
      research step is not visual.

      ---

      **STEP 1 IS DONE — 2026-09-04. `docs/plans-research-2026-09-04.md`.**
      The same six-product panel 2.10 and 2.18 used, plus **seven real
      detailing businesses' own plan pages** and one detailer forum thread.
      Nothing in `app/` or `supabase/` changed. **The item is now waiting on
      him for four answers**, all of which change the schema; they are the last
      section of that file, each with a recommendation.

      **The four findings a cold session must not re-derive:**

      1. **THE SALE AND THE SCHEDULE ARE TWO DIFFERENT ACTS, AND NOBODY JOINS
         THEM.** Not one of the seven detailers schedules the visits at
         sign-up — Car Detox sells through a checkout and then *phones* you,
         ZS takes a phone number and a person sets up visit one, Mint members
         book each month themselves. **So the expensive half of the obvious
         design — create the next N bookings on sign-up — is not a thing the
         trade does**, and `bookings_no_overlap` would refuse it anyway.
      2. **WE TAKE NO MONEY, SO WE CANNOT SELL A SUBSCRIPTION.** Every plan in
         the sample that charges, charges a stored card. There is no Stripe, no
         card on file and no payment capture anywhere in this repo —
         `bookings.payment_status` is a flag the DETAILER sets by hand. A plan
         page saying *"$150/month"* while the money is still collected in
         person is the travel-fee defect again.
      3. **BESIDE THE FLOW, NOT IN IT — 7 of 7 detailers and 5 of 6 products.**
         The single product that puts a recurrence inside the booking form
         (Zenbooker) is a cleaning tool selling a *repeat*, not a plan. **The
         answer to his own question is that most booking systems do NOT carry
         a plan**: 5 of 6 can repeat a job, only 2 of 6 have a plan as an
         object, and 0 of 6 sell one inside a booking form.
      4. **THE RECOMMENDED SHAPE COSTS ALMOST NO NEW MACHINERY: a sign-up is a
         REQUEST**, the rail 2.12 already built — the customer asks, the
         detailer accepts, exactly what the phone call does in five of the
         seven businesses. Recurrence is a NUDGE to book the next one, not a
         scheduler.

      **And two things about the second question:** the DETAILER owns the
      wording, cadence and price shape (all three price shapes appear in the
      sample — monthly amount, per-visit amount, percent off — so forcing one
      excludes real businesses), but **"in the flow vs beside it" should not be
      a toggle**: it is a second layout to build and sweep for a placement no
      evidence supports.

      **`monthly_plans` is still gone and Phase 4.3 is the same feature.** 4.3
      *"Monthly plans — needs a design conversation first"* predates this item
      and should be closed into it once the shape is settled.

- [x] 2.15 ~~**Travel priced by measured distance**~~ **REFUSED BY THE OWNER
      2026-08-31, THE SAME DAY IT WAS WRITTEN, AND THE THING HE DESCRIBED
      INSTEAD IS ALREADY BUILT. This item is closed without work.**

      He was told the automatic part needs a map service, a per-lookup cost and
      every customer address leaving the product. His answer:

      > "we don't need to do that for the automatic part… I don't wanna do
      > automatic calculations. Or if we want, we can have the customer check
      > themselves. Like… the customer just ticks up mark, like, are you
      > outside of, like, ten mile range, and they just click something."

      **What he described is `travel_zones`, which shipped in roadmap 2.8c.**
      The detailer names their own areas and sets a fee on each
      (`BookingRules.jsx`, "Travel areas"); the customer picks one on the
      booking page from a labelled drop-down — *"Which area are you in?"*, each
      option showing its own surcharge (`StepLocation.jsx:107-122`) — and the
      chosen fee is added to the quote and snapshotted to `bookings.travel_fee`
      and `bookings.travel_zone`. **A detailer who wants exactly his example
      names two areas: "Within 10 miles" at $0 and "Outside 10 miles" at their
      price.** Nothing needs building.

      **Kept as a closed item rather than deleted, because the refusal is the
      load-bearing part.** "Detect the miles automatically" is the obvious next
      idea and it will be proposed again; **it was put to the owner with its
      costs and he said no.** The two reasons to reopen, in his words rather
      than inferred: he would accept it *"if there's someone to do it for
      free"*, and he said *"we could put that up later"* — so it is a
      preference about cost and complexity, not a rejection of the capability.

- [x] 2.16 ~~**The customer's booking page in landscape — W16 is not met on any
      step.**~~ **CLOSED BY THE OWNER THE SAME DAY IT WAS WRITTEN, UNSTARTED.
      Phones are PORTRAIT; W16 is a portrait rule.**

      **His ruling, 2026-08-31**, given about the dashboard and applying to
      every phone screen this product has:

      > "Let's not have a horizontal phone setup, only portrait. Because yeah,
      > no need and will only be making things harder."
      > "For the phone version, it should always just stay portrait… when
      > someone flips their phone over sideways, I don't want it to completely
      > readjust. I could tell if we had that, it might get annoying."

      **The measurements are kept because they are real and somebody will
      re-take them otherwise.** `node scripts/sweep-booking-steps.mjs 844x390`,
      on the demo reshaped into his own menu:

      | Step | Over the bottom |
      |---|---|
      | 1 · What can we do | **467px (120% of the screen)** |
      | 2 · Anything to add | 93px (24%) |
      | 3 · Tell us about the vehicle | 366px (94%) |
      | 4 · Where should we do it | 404px (104%) |
      | 5 · Pick a time | 229px, and 359px once slots appear (92%) |
      | 6 · How do we reach you | 236px (61%) |
      | 7 · Check everything | 307px (79%) |

      **Why this is closed rather than deferred.** W16 — *a customer should
      never scroll inside a step* — is the owner's rule, and he has now scoped
      the shape it applies to. A customer who turns their phone sideways gets
      the portrait layout in a short window and scrolls; that is the accepted
      cost of not having a second design. **`sweep-booking-steps.mjs` keeps its
      four portrait sizes and stays the definition of done.**

      **What would reopen it:** him asking. **Do not re-derive this** — the
      booking page's `.bk-choices` being a tall single column on a wide short
      screen is the obvious "bug" to spot, and it has been ruled not-a-bug.

- [x] 2.18 **THE EMAILS, REBUILT FROM SCRATCH — DONE 2026-09-03.** All twelve
      rebuilt in The Thread, wired up, sent to a real inbox and corrected after
      he opened them. **Three threads survive this item and are the owner's or
      time's, not code:** the root SPF record (his DNS), `formatDateLong`
      hardcoded `en-US`, and a separate Resend account for the platform. See
      "WHERE IT LANDED" at the end of this item.

      **THE ORIGINAL ASK — the OWNER asked for this on
      2026-09-03, and he asked for RESEARCH FIRST.** Bigger than it sounds:
      it is a settings surface, a template system and a design job at once.

      > *"For the emails — just delete all of the existing emails and work them
      > from scratch. Make them look the best. Have email customizability for
      > each customer. Have multiple options for when emails get sent out and
      > whatnot. If you could do some research into that… an option to set
      > reminder emails, when the reminder emails will be sent out, what is
      > contained in the reminder email. Have some premade templates. And also
      > have them be able to change colour based off of the person's business.
      > So the emails need to be completely reworked from scratch and thought
      > of properly, not just made quickly."*

      **READ THE LAST SENTENCE AS THE ACCEPTANCE TEST.** *"Thought of properly,
      not just made quickly."* This item is not a restyle of the eleven
      templates that exist; he asked for them deleted.

      **STEP 1 IS THE RESEARCH, AND HE NAMED IT.** Same six-product sweep 2.8,
      2.10 and 2.14 use — the products' own documentation, source strength per
      claim, counts not impressions:
      - **Which emails do the trade's booking systems actually send?** Ours
        sends eight kinds; is that the set, or are we missing one everybody
        else has (a "you're next in the queue", a review request, a receipt
        separate from the invoice)?
      - **How much of the SCHEDULE is the detailer's to set** — which emails
        can be switched off, how many reminders, how far ahead, and whether
        anyone lets them send more than one.
      - **How much of the CONTENT is theirs** — a free-text block, a full
        template editor, or a fixed template with a few slots? This is the
        question with the widest range of answers and the biggest cost
        difference, so it wants counts.
      - **What "premade templates" means in this trade** — a choice of visual
        designs, or a choice of WORDING? He said the phrase; the research is
        what decides which he will recognise when he sees it.

      **WHAT EXISTS TODAY, so nobody re-derives it.**
      `supabase/functions/_shared/emailTemplates.ts` is ~530 lines and holds
      **eleven** templates behind one `shell()`: customer confirmation (which
      doubles as the request email since 2.12), owner new-booking, invoice,
      follow-up, customer reminder, cancellation, reschedule, invite, the three
      2.12 request-decision variants. **The settings that already exist** are
      five booleans on `business_settings`
      (`email_customer_confirmation`, `email_customer_reminder`,
      `email_customer_followup`, `email_owner_new_booking`,
      `email_owner_reminder`), one lead time
      (`customer_reminder_lead_minutes`), the evening-before rule, and
      `notification_emails`. **There is no screen for any of the content.**
      `screens/more/Notifications.jsx` is the switches only.

      **THE COLOUR HALF IS ALREADY DONE AND MUST NOT BE REDONE.** Roadmap 2.11
      step 6 stage 6 built `_shared/brandColor.js` — the one place in this repo
      a second implementation of the colour maths is allowed — and 2.12 fixed
      the eleven header lines that ignored it. `tests/email-brand.test.mjs` is
      138 checks and pins all of it. **Anything rebuilt has to keep passing
      it**, and the two source-reading checks (7a, 7a-ii) exist specifically so
      a fresh template cannot reintroduce a hardcoded colour on the band.

      **THREE THINGS THAT WILL BITE.**
      1. **An email cannot load a webfont**, so "make them look the best"
         cannot mean the product's own two faces. Arial/Helvetica is the
         email-safe stack and that is why this file uses it — the design
         freedom is in layout, colour, spacing and hierarchy, not type.
      2. **`money-export`-class risk.** The invoice itemises services, add-ons,
         travel and `price_adjustments` and must reconcile to `final_amount`.
         A rebuilt invoice that drops a line is the `travel_fee` family again.
      3. **Every template is rendered by a Deno edge function**, so it cannot
         import from `app/`. Whatever a template editor writes has to be data
         the function can render, not code.

      **Skills: `impeccable` for the visual half** — it is a design job and the
      screens are new. No direction-generating skill; the emails carry the
      product's identity, not a new one.

      **STEP 1 IS DONE, 2026-09-03. THE ITEM IS WAITING ON HIM FOR TWO
      ANSWERS.** The research is `docs/email-research-2026-09-03.md`, the
      judgment is DECISIONS.md → "Roadmap 2.18, step 1", and **nothing in
      `app/` or `supabase/` changed.** Do not re-derive any of the following.

      **What it found, shortest form.** Three of the four questions came back
      cheaper than this item assumed:

      - **The "you're next in the queue" email does not exist anywhere.** What
        the trade sends is **on-my-way, and it is SMS in all four products that
        have it** — no product offers an email version. **We already have it**
        (`on_my_way` in `app/src/lib/templates.js`). **Do not add an on-my-way
        EMAIL and record it as closing a gap.**
      - **A review request is not missing either** — five of six have one and
        so do we (`followupEmail`). What is missing is the **delay**.
      - **A receipt separate from the invoice IS missing — five of six have
        one.** Ours sends an email titled *invoice* after the money is taken.
      - **Our reminder SCHEDULE already beats four of the six** (Square's
        offset shape and Housecall Pro's clock-time shape, both at once). Half
        of "multiple options for when emails get sent out" is a
        discoverability problem — the control lives on Booking rules and
        Notifications only points at it.
      - **Content: five of six give the detailer WORDS, one gives a DESIGN** —
        and even that one renders the invoice's itemisation as a single
        variable the editor cannot open. Recommendation is a fixed frame with
        named slots, reusing `message_templates` / `MessageTemplates.jsx`
        rather than inventing a second editor.
      - **"Premade templates" means WORDING in this trade.** Not one of the six
        offers a choice of visual designs for a transactional email.
      - **`business_branding.logo_url` already exists, is already uploaded, is
        already drawn on three customer pages — and `buildBrand()` has never
        read it.** Cheapest and most visible item in the whole build.

      **THE TRAP, and it is the one thing here that will silently waste a
      session: `tests/email-brand.test.mjs` is PARTLY A SOURCE-SHAPE TEST.**
      Checks 7a, 7a-ii and 7b-ii read `emailTemplates.ts` as text and assert
      facts about a file a rebuild deletes (`const header =` blocks,
      `${brand.headerInk}` at least fourteen times, the literal
      `max-width:600px; background-color:#ffffff;`, three banned greys). Their
      **intent must survive and their pointers must move, in the same commit**.
      A rebuild that quietly drops 7a is how D1 comes back — 7a exists to stop
      the NEXT template hardcoding a colour on the band, and a rebuild is
      exactly "the next template". The arithmetic checks (1–6, 7b, 7c) pass
      untouched. Baseline confirmed 2026-09-03: **138 pass**.

      ~~**AND BUILD THE PREVIEW SCRIPT FIRST.**~~ **BUILT 2026-09-03 —
      `node scripts/render-emails.mjs`**, all sixteen emails to
      `email-preview/index.html`, `--accent=#hex` for another tenant, no new
      dependency (Node 24 strips the types, so it reads the SAME
      `emailTemplates.ts` the edge function runs).

      **AND IT FAILS TODAY, ON PURPOSE — IT FOUND A LIVE MONEY DEFECT ON ITS
      FIRST RUN.** **The invoice's printed column does not reach the invoice's
      printed total whenever a promo code was used**, by exactly the promo:
      its charge rows sum to `subtotalBase` (services + add-ons + travel +
      `price_adjustments`, **before the site sale and before the promo**) while
      its total is `final_amount` = `total_price`, which is **past both** and
      rounded. **Neither discount and neither the rounding is drawn anywhere**,
      so the gap is `siteDiscount + promoDiscount + rounding`. Rendered:
      *Subtotal $405, Tip $30, **Total paid $395*** — $40 missing, unexplained.
      **`bookings.subtotal` is `subtotalAfterSite` and is NOT what the rows add
      up to**, which is the detail that makes this look like one bug and be
      three. This is the `travel_fee` family in
      the same file, one comment below the fix for its twin. **Fix it inside
      the invoice/receipt split, in `send-invoice` (which survives the
      rebuild), and the check that gates it already exists.**

      **HE ANSWERED 1 AND 2 ON 2026-09-03, AND OVERRULED THE RESEARCH ON BOTH.
      Full reasoning: DECISIONS.md → "Roadmap 2.18 — his answers, and the look
      he rejected"; state: PROJECT-STATE.md §6y.**

      - **"Premade templates" means an EDITOR** — *"by scutom i mean they can
        choose whats in in and what order ect. we can make a email editor page…
        a way for hte customer to customze the look wordsa and thgings of the
        email."* The research recommended prose slots on a five-of-six count;
        **he asked for the sixth. This is the 2.8 pattern again — research
        rules shapes IN, it cannot rule them OUT.**
      - **SO A TEMPLATE IS AN ARRAY OF BLOCKS.** Every renderer returns one
        self-contained `<tr>`. Reordering is reordering an array; switching a
        block off is filtering it. **A template written as one HTML literal
        cannot have an editor over it at any price** — this is why the shape
        was settled before the other ten were ported.
      - **`moneyBlock` IS THE ONE BLOCK THE EDITOR MAY NOT OPEN.** Not
        reorderable, not editable, not deletable. The half of the research that
        survived the overrule.
      - **Reminders: NO CAP** — *"we can have as many emails as we want i mean
        i dont care."* That turns a second marker column into a
        `booking_reminders_sent` row per (booking, rule) plus a list of
        reminder RULES on the business.
      - **HE REJECTED THE EXISTING LOOK, correctly** — *"it looks exactly the
        saem sytle as the email template i had before. and doesnt even macth
        the style of the wwebsites."* He was shown the OLD emails as a
        before-image; the finding stands regardless.

      **BUILT ON THE STRENGTH OF IT, AND DELIBERATELY NOT WIRED UP:**
      `_shared/emailKit.ts` (ground, blocks, shell) and `_shared/emailsNew.ts`
      (confirmation / request received, receipt / invoice), drawn by
      `node scripts/render-emails-new.mjs`. **The edge functions still send the
      old templates and `email-brand` is still green at 138 on the old file.
      The swap is one commit after he approves the world** — porting ten
      templates into a rejected look, or re-pointing the 138-check test twice,
      are the two ways to waste this.
      **The type law survived even though the faces did not:** an email cannot
      load Archivo, but the system's rule is *one face for words, one for
      figures*, and that ports intact to Arial + a monospace stack. **When a
      constraint kills a rule's implementation, ask what the rule was FOR
      before recording it unmeetable.**
      **The colour engine was EXTENDED, never edited** — `emailDarkBrandColors`
      sits beside `emailBrandColors`, corrected against `--ink-2` because the
      accent lands on a lifted panel too.

      **AND HE ANSWERED AGAIN THE SAME DAY — THE LOOK IS APPROVED AND THE
      EDITOR IS SCRAPPED.** *"Also it looks good."* · *"Also scrap the custom
      email editor thing. / make it a lot more simple."* · *"ima do as many
      emails as you recommend."* · *"do some resasserch into how emails and
      different services open it and make sure it will work globally."*
      Reasoning: DECISIONS.md → "Roadmap 2.18 — the look approved, the editor
      scrapped, and will it work everywhere"; state: PROJECT-STATE.md §6z;
      research: `docs/email-clients-2026-09-03.md`.

      - **THE EDITOR IS OFF.** It was his own idea one message earlier.
        **Nothing had to be torn out** — the session stopped at two rendered
        templates to get the look approved, and that gate doubled as a rollback
        point. **The blocks STAY**: the plain-text half of every email is a
        second pass over the same block list.
      - **"A lot more simple" = what the research recommended**: our design,
        fixed; an on/off switch per email, one optional message of the
        detailer's own, and a choice of prewritten wordings. Five of six
        products do exactly this.
      - **REMINDERS: TWO, THE SECOND OFF BY DEFAULT** (he delegated the
        number). Jobber caps at two and nobody offers three; the useful pair is
        the evening before and ~2 hours out; **a third costs deliverability for
        the receipt**, since reputation is shared. Still needs
        `booking_reminders_sent` per (booking, rule) — two markers is where a
        boolean column stops generalising.
      - **COMPATIBILITY HOLDS.** Apple Mail ~60% leaves a dark email alone
        unless it finds pure `#ffffff`/`#000000`; **full inversion mirrors
        BRIGHTNESS and preserves HUE**; light-on-light cannot happen because
        every colour is declared on the element that shows it. Worst case is a
        readable light version. **The `mix-blend-mode` Gmail hack was
        deliberately not used.**
      - **Three changes it forced:** pure black/white made unreachable in a
        tenant's colour (both were reachable), `bgcolor` beside every
        background property, and **the logo onto a bone plate** — a detailer's
        logo is dark-on-transparent and was invisible on `--ink-0`, which
        nothing in this repo could ever have measured.

      **AND A DEFECT THAT IS NOT ABOUT DARK MODE: EVERY EMAIL IS SENT
      HTML-ONLY.** `send-email/index.ts` sets `html` and no `text` — a
      spam-filter signal on every email including the receipt. **Fix it in the
      port**, as a `text` pass over the block list. Gmail's 102KB clip was
      MEASURED, not assumed: these are 9–10KB.

      **THE PORT LANDED THE SAME DAY, on *"do whataver u want and is best"*.**
      DECISIONS.md → "Roadmap 2.18 — the port: all twelve rebuilt, wired, and
      the invoice made to add up".

      - **All twelve templates rebuilt; the old ~530-line file is gone.**
        `_shared/emailKit.ts` is the world, `_shared/emailTemplates.ts` is the
        twelve. **The file kept its PATH and most export names** — rebuilding
        the RENDERING was the item, and changing `BookingEmailData` too would
        have meant rewriting every call site's query.
      - **All eight edge functions send them**, and every one passes the
        plain-text half through. `send-email` sets `text`.
      - **`reconcile(lines, total)` makes the money add up STRUCTURALLY.** The
        invoice bug could have been three pushes in `send-invoice` — that is
        the fix 2.8c already applied once, and it did not generalise. Both
        money templates pass their lines through one function that draws any
        remainder as its own line.
      - **`bookings` HAS NO `site_discount` COLUMN**, and the first draft of the
        fix referenced it → `undefined` → the line silently never draws. **A fix
        that reads as a fix and does nothing**, caught only by checking the
        schema. The promo is itemised by name; the sale and the rounding are
        drawn by `reconcile`. **Storing the sale amount on the booking is a
        migration and its own item.**
      - **`email-brand` is 186 checks and its source checks were re-pointed** —
        two failed loudly, one went silently vacuous, and baselining the
        replacements turned up **a raw backspace character inside the new
        regex**, which made the anti-vacuity check vacuous on its first run.

      **AND THE LAST TWO PIECES LANDED (2026-09-03) — *"Okay, dude. These
      two."***

      - **THE SECOND REMINDER.** `customer_reminder_2_enabled` +
        `customer_reminder_2_lead_minutes` on settings, its own marker on the
        booking, its own RPC. **TWO COLUMNS, NOT a `booking_reminders_sent`
        table** — that shape was right while the count was open-ended and
        became wrong when he capped it at two. **Its own RPC because the first
        one carries the EVENING-BEFORE rule**, which a second reminder must not
        inherit; it also refuses to fire before the first, and excludes
        `pending` for 2.12's reason. On Booking rules, off by default.
      - **"YOUR OWN WORDS".** `business_settings.email_messages jsonb`, one
        optional paragraph per email kind, rendered in the panel block by a
        single `ownWords()` helper. Prewritten wordings live in
        `app/src/lib/emailMessages.js` — a constant, not schema. **NO
        `{{placeholders}}`**: the email already greets the customer and states
        their date, vehicle and address, so a token would be the owner's own
        never-default. Nothing to typo, nothing to validate.
      - **THE EMAILS WERE ACTUALLY SENT.**
        `node scripts/send-test-emails.mjs --to=…` posts the real templates
        through the real relay. **It wants `SUPABASE_SECRET_KEY`, not the
        legacy service-role JWT** — this project has migrated, and the legacy
        key returns a flat 401 that reads like a revoked key.
      - **`buildAddressing` was deleted as dead code and is NOT** —
        `booking-engine` test 9 pins tenant isolation with it. The caller was
        in `tests/` and the grep was of `supabase/functions/`. Restored.

      **STILL OPEN:** `formatDateLong` hardcoded `en-US` (named, not fixed —
      US-only product) · **and the owner's verdict on the four emails now in
      his inbox**, which is the only thing that can close the "nothing has been
      opened in a real email client" gap.

      **AND THE INVOICE STOPPED DOING ARITHMETIC (2026-09-03, his
      instruction).** *"We don't need to recalculate everything again when we
      send out the email… just have it copy exactly what was calculated on what
      you finalized. I don't get why there has to be math."* **He was describing
      the root cause, not a preference.** `send-invoice` rebuilt the bill from
      five sources and hoped their sum matched a `final_amount` computed in
      another file — which is why 2.8c patched travel in and 2.18 still found
      the promo missing. It now prints `total_price` + the finalize lines, which
      **is** `final_amount`'s own definition, so the column cannot disagree with
      the total. ~45 lines deleted. The work is still NAMED but no longer
      priced, because per-service prices are not what was charged.
      **And the live business was READ (he authorised it): its invoice ADDS UP,
      so our bug was INTRODUCED by the port rather than inherited** — the
      opposite of what the morning's entry concluded from reading only the
      row-building. CLAUDE.md's repo name was wrong too; see DECISIONS.md.

      ---

      **WHERE IT LANDED, so nobody re-derives it.**

      | | |
      |---|---|
      | The world | `_shared/emailKit.ts` — palettes, blocks, shell, `htmlToText`, `reconcile` |
      | The twelve | `_shared/emailTemplates.ts`, each a LIST OF BLOCKS |
      | Look at them | `node scripts/render-emails.mjs` (`--accent=`, `--logo`, `--out=`) |
      | Send them | `node scripts/send-test-emails.mjs --to=…` — needs `SUPABASE_SECRET_KEY`, NOT the legacy JWT |
      | Pinned by | `tests/email-brand.test.mjs`, **189 checks** |
      | Settings | "Your own words" on Notifications; the second reminder on Booking rules |

      **THE FOUR THINGS A COLD SESSION WOULD GET WRONG:**
      1. **The emails are LIGHT-FIRST with dark behind `prefers-color-scheme`,
         and that is MEASURED, not chosen.** Gmail's app inverts an already-dark
         email and cannot be told not to; measured on our palette, the accent as
         words fell to **1.99:1** and the button's ink to **1.77:1**. Do not
         "restore" the dark-first version.
      2. **The dark palette applies BY CLASS.** An element that sets a colour
         inline and forgets its class stays LIGHT inside a dark email, and no
         contrast check can see it. Add the class when you add the colour;
         `render-emails.mjs` fails on any inline colour without one.
      3. **Pure `#ffffff`/`#000000` are banned in BOTH palettes** — they are
         Apple Mail's own inversion trigger.
      4. **The invoice COPIES what was finalized** (`total_price` + the finalize
         lines). It does not re-derive services, travel, promo, sale or
         rounding. Re-deriving them is what made it wrong twice.

      **STILL OPEN AND NOT CODE:** the root `detailingplatform.com` SPF record
      (his DNS, in Netlify — `v=spf1 -all`) · a DMARC `rua=` for visibility ·
      `formatDateLong` is hardcoded `en-US` · **a separate Resend account for
      the platform**, since it currently shares the live business's reputation ·
      and **his verdict on the light-first sends**, which nobody has confirmed
      in Gmail dark mode yet.

- [ ] 2.19 **"Want to email some of your old customers?" — MANUAL, with a
      nudge. The OWNER decided the shape on 2026-09-03**, answering the
      research's recommendation that an automated re-book campaign be its own
      item.

      > *"Don't have one that automatically messaged on the email. Just have it,
      > like, the business person whoever is running it could send out email to
      > someone that they want. And maybe, like, remind deals. Like, hey, do you
      > want to send out email to some of your old people? I don't know."*

      **NOTHING SENDS ITSELF. That is the whole design and it is what makes
      this cheap.** Four of six trade products have an automated re-book
      campaign and all four keep it in a separate paid tier, because a
      scheduled marketing blast needs an unsubscribe, a suppression list and a
      sending reputation the transactional set is exempt from
      (`docs/email-research-2026-09-03.md`). **A human picking named recipients
      and pressing send is much closer to transactional**, so most of that
      machinery goes away with the automation.

      **The nudge is a DASHBOARD PROMPT, not an email.** "You have 14 customers
      you haven't seen in six months" is a row on a screen. **If the nudge ever
      becomes an email to the detailer, re-read this paragraph** — the line he
      drew is that the product does not send anything nobody asked it to.

      **Half of it already exists.** The Clients screen knows who has lapsed —
      `tests/client-list.test.mjs` is 31 checks on exactly that date arithmetic,
      and its own note calls the lapsed filter *"who ends up on the end of a
      group text"*. **What is missing is a compose-and-send surface and the
      prompt**, not the selection.

      **Skills: `impeccable`** — it is a new screen. No direction-generating
      skill.

- [x] 2.17 **Motion and shape as a house style — the OWNER asked for this on
      2026-09-01, at the end of roadmap 2.11 step 6 stage 4.** Three named
      complaints and one principle that outranks them.

      **His words, in full, because the principle is the load-bearing part:**

      > "There's a few things I just don't like — I don't have animations. For
      > example, on the booking page, when I click on a booking, it just kind
      > of spawns in on the side, like, instantly with no animation. It just
      > instantly opens, which kinda goes against a lot of the stuff that we
      > usually do — usually every single UI that opens has an animation."

      > "One thing: I want everything to be a squircle. Like, the kind of
      > professional rounded corners that Apple has."

      > "And then on the calendar also — how it turns from centre into that
      > split view. I think it should just automatically be in that split view,
      > or have an animation. Because right now it's almost like I refresh the
      > page when I click on something. I don't want everything to disappear
      > and come back, like the current animation is. I want a nice fluid
      > animation of everything opening up."

      > "And have that as a keynote for the entire site. As the design process
      > is going, everything should have a very nice animation. That makes
      > everything feel very fluid and connected — without being in the way of
      > actual productivity and usability."

      **THIS CHANGES THE MOTION LAW, AND THAT IS THE FIRST THING TO SETTLE.**
      `docs/design-system.md` § Motion and `docs/design-knowledge.md` §1 both
      say the opposite of what he just asked for: *"one well-orchestrated page
      load with staggered reveals creates more delight than scattered
      micro-interactions"*, and `dashboard-skeletons.md` §4 spends the budget
      on exactly three things — the ground that never stops, ONE staggered
      arrival per screen, and pointer feedback. **He is asking for the budget
      to grow, deliberately.** So the system file gets updated FIRST, with his
      quote in it, and then the code follows — never the other way round
      (CLAUDE.md: if a rule and a real design decision collide, the system
      file changes first, never silently). His own limit is in the last
      sentence and it is the acceptance test: *fluid and connected, without
      being in the way of productivity*. That means interruptible, fast, and
      never a gate between a tap and the thing you tapped for.

      **1 · A RECORD OPENS INSTANTLY AT A DESK, AND IT IS THE SAME OBJECT THAT
      ANIMATES ON A PHONE.** Verified in the stylesheet rather than assumed:
      `.sheet` carries `animation: sheet-in var(--t-reveal)` and a matching
      `sheet-out`; `.record` — the second column `RecordHost` draws at ≥1180 —
      carries **no animation at all**, and the screen's arrival stagger is
      scoped `.app-main > .split > .col-1 > *`, so `.col-2` is excluded by
      design. **This is the seam `RecordHost` exists to hide, showing
      through**: a job is supposed to be one object whose container changed.
      It is reached from Today, Calendar month, Calendar history, Clients and
      Money, so it is one fix in one file. **Exit matters as much as entry** —
      `.sheet` has `sheet-out` and `.record` has nothing, so closing a record
      at a desk is a hard cut too.

      **2 · SQUIRCLES.** Every corner in the product is `border-radius`
      (`--r-panel`, `--r-inset`, `--r-pill` in `theme.css`), which is a
      circular arc. He wants the continuous-curvature corner Apple uses.
      **Check what the browsers actually support before choosing a route** —
      there is a native CSS property for this now (`corner-shape`, used
      alongside `border-radius`) and if it is available in the browsers this
      product supports, it is one token change and degrades to the current
      look where it is not. If it is not available, the honest alternatives
      are an SVG mask or a paint worklet, and **both are expensive on a
      component that appears hundreds of times** — say so and put the choice
      back to him rather than shipping a slow page. **Do not hand-roll a
      squircle on one component**: the value belongs in the token, next to the
      radii, or the product ends up with two corner languages.

      **3 · THE CALENDAR'S SPLIT, WHICH IS THIS SESSION'S OWN WORK.** Stage 4
      made the day open beside the month at ≥1180 (his earlier ask, same day).
      What he is objecting to now is the TRANSITION: `.app-main` widens from
      1180 to 1720, the grid narrows, and below 1640px of screen the cells
      change from written-out job lines to marks — all at once, on a click,
      with no motion. **He gave two options and they are not equal:**

      - **(a) "It should just automatically be in that split view."** The
        month is always the split layout at ≥1180, second column empty until a
        day is picked. **This removes the reflow completely** and is the
        cheaper, more robust answer. **Its cost is real and he must be told
        it: at 1440 the grid would then always be ~696px, so the written-out
        month — the `9:00 AM Tom O.` lines he specifically said were helpful —
        would be gone at that width permanently**, not just while a day is
        open. At 1920 nothing is lost.
      - **(b) Animate the transition.** Keeps the words when nothing is open.
        **Harder than it looks**: the width change is on `.app-main`'s
        `max-width`, the column count changes, and the cell's whole internal
        layout changes — this is the case `view-transition` exists for, and a
        naive `transition: max-width` will animate the container while the
        grid inside it snaps.

      **His phrase to design against is *"it's almost like I refresh the
      page"*** — whatever ships, nothing may disappear and come back.

      **HE CONFIRMED IT ON 2026-09-02 AND ADDED TWO THINGS.** He asked whether
      it had been written down, which it had — and then sharpened it:

      > “I just wanna confirm that it stuck — that throughout the site, there’s
      > multiple points where stuff just kinda pops into place, and there’s no
      > fluid animation. Keep that in mind when we build future things so it’s
      > already there; but for the past things, it needs to get revised. It’s
      > for desktop — desktop’s the majority of the things where you click
      > something in the calendar, you click a booking, whatever, and it just
      > instantly pops with this. There’s no kind of intro animation.”

      **(a) IT IS A DESK PROBLEM, and that narrows the audit.** Below `--wrap`
      `.sheet` already carries `sheet-in` and `sheet-out`, so the phone is
      mostly right; the desk is where a thing you clicked appears with no
      motion at all. Start the audit at `--wrap` and above.

      **(b) IT BINDS NEW WORK ALREADY, and that half is DONE (2026-09-02).**
      He asked for it to be in place for future builds rather than waiting for
      this item, so the standing rule — *anything that opens, animates in;
      a new component ships its entrance AND its exit in the change that
      builds it* — is now in `dashboard-skeletons.md` §4 (the motion budget,
      where it belongs) and in `CLAUDE.md`’s Design section (where a session
      will actually read it). **What is left in this item is the RETROFIT.**

      **The list is not three items.** Stage 6 alone added two more openings
      that arrive with no motion at a desk — a settings screen entering the
      second column, and the gear taking the main area — which is his
      “multiple points” confirmed rather than a new complaint.

      **WHERE TO START, IF IT IS NOT OBVIOUS.** `improve-animations` reads the
      whole codebase and produces a prioritised audit before anything is
      written; that is the shape of this item's first half. The three above
      are the known ones and are not the whole list — **he said "a few things",
      and named the ones he happened to hit.**

      **WHAT NOT TO DO.** The skill-collision rule is still on (CLAUDE.md):
      `animate` and `improve-animations` are appliers and auditors and are
      allowed; no direction-generating skill runs against this product. **The
      LOOK is settled** — this item is motion and one corner token, not a
      redesign, and a session that treats "everything should feel fluid" as
      permission to restyle has misread it.

      ---

      **BUILT 2026-09-03, EXCEPT ONE THING THAT IS HIS CALL.** The retrofit,
      the calendar's remount and the squircle are all in. What is left is the
      1440 reflow, below.

      **THE AUDIT WAS A MEASUREMENT, and it changed the list.**
      `document.getAnimations()` read on the live dashboard at 1920, **120ms
      after each click** — not the stylesheet, because this repo has already
      shipped two animations that were dead in the cascade and looked exactly
      like finished screens. **Five things arrived with nothing running but the
      ground's 54-second drift**, and one thing this item listed as broken was
      already fine:

      | Opened at a desk | Before | Now |
      |---|---|---|
      | `.col-2.record` — a job (Today, Calendar month, Calendar history, Money) | nothing | in + out |
      | `.col-2.record.bare` — a client | nothing | in + out |
      | `.col-2.settings-col` — **both** doors | nothing | in + out |
      | `.split.calday > .col-2` — the day panel | nothing | in + out |
      | `.col-2` resting content, on first paint too | nothing | in |
      | the gear taking the main area | **already ran `arrive`** | unchanged |

      **THE FIFTH IS THE ONE NOBODY NAMED**, and it is why the whole list is
      one selector: every desk screen staggered its LEFT column in and left the
      right one sitting there. `.split > .col-2` is the rule — they are one
      object, the thing beside the list.

      **AND THE GEAR WAS A FALSE POSITIVE.** It renders a `.split` directly
      under `.app-main`, so the screen's own stagger catches it; giving it an
      entrance would have been two animations on the same 420ms — the mistake
      stage 7 already recorded for the setup form. *A defect list written from
      reading is a list of hypotheses.*

      **HOW IT MOVES.** 14px on X at 180ms (`--t-exit`) on the one curve.
      From its own SIDE, because the column edge is where the thing came from —
      `arrive` travels Y because a screen is read downward. **No new duration
      and no new distance**: 14px is `arrive`'s and `step-fwd`'s, 180ms is
      `--t-exit`. 420ms was rejected against his own acceptance test — it is a
      gate on a record you open forty times a day.

      **The exit is `hooks/useLeaving.js`** — React unmounts, so an exit is a
      delayed unmount. Three callers, one place for the 180 (it was written out
      in two files first, each carrying a comment saying it must track
      `--t-exit`, which is the shape of a number that drifts).
      **Skipped on replacement**: clicking job B while A is open changes the
      content in place, because 180ms between a tap and the thing tapped for is
      the acceptance test failing.

      **3 · THE CALENDAR WAS THE WRONG ELEMENT MOVING, and that is the whole
      diagnosis.** Picking a day swapped `.group` for `.split.calday`, so React
      discarded the month subtree and rebuilt it: `arrive` re-ran on the left
      column — *the thing you were already looking at* — while the day panel
      you had just asked for animated not at all. That is *"it's almost like I
      refresh the page"* literally. **Fixed with a stable container, not a
      nicer animation**: the wrapper renders at every desk width and collapses
      to `display: block` with no second column. Proved by stamping the
      `.cal-grid` node before the click and finding the stamp after it.

      **THREE DEFECTS THE MEASUREMENT CAUGHT AND READING WOULD NOT HAVE.**
      A **`:has()` may not contain another `:has()`** — the widening rule was
      written that way, the browser dropped the whole selector *silently*, and
      the month went to 696px at 1920 instead of gaining room to 1,236px.
      **Two `<aside>`s in one slot are reconciled, not remounted**, so the
      settings screen's entrance never fired until they were keyed apart.
      And **pressing the open day again** toggles it closed down a path that
      skipped the exit.

      **2 · THE SQUIRCLE IS `corner-shape: squircle`, ONE TOKEN NEXT TO THE
      RADII, AND IT DEGRADES TO TODAY'S LOOK.** Support measured 2026-09-03
      from `api.webstatus.dev` and MDN's compat data rather than assumed:
      **Chrome / Chrome Android / Edge 139+** (shipped 2025-08-05), **Safari
      no** (Technology Preview only), **Firefox no**, Baseline **limited**. It
      is additive, so an unsupported browser draws the `border-radius` that is
      already there — no fallback, no feature query.
      **PANELS AND INSETS ONLY**: a superellipse at a 100px radius is a lozenge
      and at 50% a blob, so pills, dots, rings and the spinner keep `round`.
      Apple squircles cards and app icons; its capsules stay capsules.
      **Both alternatives were costed and BOTH are worse.** A Houdini paint
      worklet is **Chromium-only too** (Chrome 65+, never Firefox, never
      Safari), so it buys a JS paint pass and reaches exactly the same
      browsers — *do not re-propose it on rediscovering that `corner-shape` is
      Chromium-only, that is the same fact.* An SVG mask reaches Safari and
      clips the 1px `--hairline` this system draws on nearly every surface.

      **IT IS ON BOTH TOKENISED SURFACES — `--corner` in `theme.css` and
      `--bk-corner` in `booking.css`.** Every surface in this product defines
      its own copy of the radii, so squircling the detailer's page and not the
      customer's is exactly the two-corner-languages failure the design system
      forbids. `sweep-booking-steps.mjs` re-run after it: **every step still
      fits at all four sizes**, unchanged — `corner-shape` is a paint property
      and costs no layout.

      **Pinned by `tests/composition.test.mjs` test 8** — 18 new checks (41 →
      44), every family baselined both ways (each deliberate defect fails
      exactly one, including the vacuity guard). They exist because both halves
      of this item break by OMISSION and neither failure is visible: an
      un-squircled card looks like a card, a hard cut looks like a fast
      animation, and an invalid selector looks like a satisfied one.

      ---

      **⚠ STILL HIS CALL — THE ONLY THING LEFT IN THIS ITEM: the 1440 reflow.**

      At **1920 nothing is lost** and the fix improved it: opening a day now
      takes the month from 1,144px to **1,236px** — it *gains* room and keeps
      its written-out cells.

      At **1440x900** the month goes **1,144px → 836px** with a day open, and
      `writes` flips off at the 1,640 rule, so cells stop carrying
      `9:00 AM Tom O.` and go back to dots.

      **A THIRD OPTION WAS TRIED BEFORE PUTTING (a) AND (b) BACK TO HIM, AND IT
      DIED BY MEASUREMENT.** Lower the 1,640 threshold so the month keeps its
      words at 1440 with the day open. Built, screenshotted, rejected **by
      looking**: at 836px a cell is 115px and the lines render `8:00 AM Mar…`,
      `9:45 AM Da…`, `12:15 PM Pr…` — the time survives, the name does not,
      which is worse than a dot because it reads as data rather than as a mark.
      **`text-overflow: ellipsis` means no overflow check can ever see this**;
      the only instrument is a screenshot
      (`shots-2.17/1440-calendar-day-WORDS.png` against
      `1440-calendar-day-marks.png`).

      So (a) and (b) stand as written above, unchanged, **and the remount —
      which was most of the "refresh the page" feeling — is already gone from
      both.** What he is choosing between now is only whether the month keeps
      its words at 1440 when nothing is open:

      - **(a) always split at ≥1180.** No reflow at all, ever. Costs the
        written-out month at 1440 permanently, even with nothing open.
      - **(b) leave it as it is now.** The words are there whenever no day is
        open; opening one still narrows the grid and swaps words for dots, but
        nothing is destroyed and rebuilt any more.

      **Recommendation: (b), and do nothing.** The complaint was the
      disappear-and-come-back, and that is fixed; (a) would trade a transition
      he may no longer notice for content he explicitly said was useful.

      **ANSWERED 2026-09-03 — (b), and by his own report rather than by a
      ruling.** He is on a **27" 1080p monitor**, so 1920x1080, and he said
      *"when I go to the calendar, I see the names just fine."* That is the
      width where the month GAINS room when a day opens. Nothing to do.

      ---

      **SECOND PASS, 2026-09-03 — he walked it and gave a punch list.** Most of
      it he liked; four things were wrong and all four are fixed. Full working
      in PROJECT-STATE.md and DECISIONS.md; the short version:

      - **A SWAP is a third kind of motion** and it was the real gap — *"the
        GUI kind of doesn't really change, but the actual text inside of it
        changes."* `.swap` + a React key, on the job record, Money's period
        figures and the Clients list. **It overrules the first pass's "no exit
        on replacement"**, which was right about the container and wrong about
        the contents. ***THE MOTION described here — "opacity and a 4px blur at
        `--t-exit`" — WAS REJECTED BY HIM AND REPLACED ON 2026-09-04. See the
        end of this item; do not build from this line.***
      - **The month now travels with the panel.** Killing the remount was not
        enough — `.app-main`'s max-width and the grid's track list still
        snapped 270px. Both transition now; the closed state is a 0px track
        rather than `display: block`, because `display` cannot animate.
      - **The trap for the next session: a swap must not be a direct child of
        `.col-1`**, and the fix is a wrapper, NOT a specificity override —
        the override was tried, won the cascade, and made the screen arrive at
        two speeds on first paint.
      - **`composition` is 57 checks**, nine mutations baselined.

      **⚠ THE DISSOLVE WAS REJECTED — the owner, 2026-09-03, looking at it.
      REPLACED 2026-09-04 (see the end of this item). DO NOT REBUILD IT, AND DO
      NOT RE-DERIVE IT FROM HIS EARLIER MESSAGE.**

      > "The dissolve that you created is horrible in the terms of… it just
      > looks like a page refresh. Yeah. So the dissolve wasn't it. **And I'm
      > sorry if I steered you to that. I wasn't trying to.** … But the
      > dissolve looks like just the page reloading. **Same with it today when
      > I switch it.** It just… it's, like, this kind of harsh fade in, you
      > know, like, **it doesn't look fluid**."

      **THE TRAP, AND IT IS THE WHOLE REASON THIS IS WRITTEN AT THE TOP.** His
      OWN earlier message is what produced the dissolve — *"maybe, like, a
      little dissolve or a blur"* — and that sentence is still sitting in this
      file and in `docs/design-system.md`. **A session that reads the earlier
      quote and not this one will build exactly the thing he has now rejected,
      and will be able to cite him for it.** He withdrew it himself and
      apologised for it, which is as clear as a retraction gets.

      **HE DECLINED TO SPECIFY THE REPLACEMENT, ON PURPOSE.** *"Okay. Sorry.
      I'm not gonna give you an animation idea. You should figure out the
      animation idea."* He floated *"maybe a text that, you know, went down and
      faded up or something"* and pulled it back in the same breath. **Treat
      that as a hint he withdrew, not as a specification** — building it
      literally repeats the mistake that got us here.

      **WHAT IS ACTUALLY WRONG WITH IT, as a diagnosis to design against
      rather than a restatement of the complaint.** A page reload *is* a whole
      block changing opacity at once. `.swap` fades an entire content block on
      one timeline, so it reproduces the exact optical signature of a reload —
      which is why it reads as one no matter how short it is. **The fault is
      the UNIFORMITY, not the duration and not the blur.** Everything else in
      this product that he likes moves its parts on *different* timelines: the
      screen's arrival staggers 0/40/80/120/160ms, the day rail staggers inside
      itself. **Nothing he has approved fades as a single flat plane.**

      **WHERE IT WAS, so the removal was one list:** `.swap` and `@keyframes
      swap-in` in `theme.css`; the header and body in `RecordHost.jsx`; the two
      keyed blocks in `Money.jsx`; the list in `Clients.jsx`. `composition`
      test 8e was written against it and moved with it. **All of that is done —
      `@keyframes swap-in` no longer exists, the four sites keep their `.swap`
      class and their keys, and 8e-ii now pins the blur as GONE by name.**

      **AND IT IS TWO PLACES, NOT ONE.** He named the job record *and* Today
      (*"same with it today when I switch it"*), which is the same `.swap` on
      `RecordHost` reached from a different screen — so it is one fix, but a
      session that only looks at the calendar will think it has finished.

      **NOTHING WAS CHANGED IN RESPONSE TO THIS** on the day he said it — he
      said *"don't do anything yet. Stop."* **REPLACED 2026-09-04**, below.

      ---

      **THE REPLACEMENT, BUILT 2026-09-04. THE DISSOLVE IS GONE FROM THE CODE.**

      **It was designed against the DIAGNOSIS, not the complaint**, and that
      distinction is the whole item: designing against *"it looks like a page
      refresh"* produces a shorter dissolve, which is the same defect in less
      time. A page reload IS a whole block changing opacity at once, so the
      fault was the UNIFORMITY.

      **A SWAP IS NOW THE SCREEN'S OWN ARRIVAL, PLAYED ON THE PARTS INSTEAD OF
      THE SECTIONS, AT EXIT SPEED.** `.swap` itself carries no animation at
      all; `.swap > *` runs `arrive` for `--t-exit`, staggered 20ms and capped
      at 160ms. **No new keyframe, no new duration, no new distance and no new
      property** — 14px is `arrive`'s, 180ms is `--t-exit`, 20ms is the day
      rail's step, 160ms is the arrival's own ceiling. The product has ONE
      entrance shape at three scales now: a screen (420/40), a rail inside a
      screen (420/20), a block's parts (180/20). **The blur is gone and law 4
      goes back to transform-and-opacity-only** — the written exception it
      needed went with it.

      **THE LADDER RUNS EIGHT DEEP RATHER THAN FIVE, and that is the one number
      that is not simply borrowed.** Both ladders it copies cap at the fifth
      child. The Clients list is the longest thing that swaps here and most of
      it sits below the fifth row, so a cap at five would leave the majority of
      that list moving as one plane — the rejected fault, on the screen where
      it would be most visible.

      **MEASURED, NOT READ** — `getAnimations()` at 1920, 120ms after each
      click. The job record switch: **15 parts** on `arrive` at
      0/20/40/60/80/100/120/140/160ms, and **no `column-in`**, so the panel
      holds still exactly as before. Money: figures at 0/20/40/60/80, ledger at
      0/20/40. Clients: its **eight** rows at 0…140, one beat each — the demo's
      list is exactly the depth the ladder was cut for. `?lite=1`: nothing
      running, rows at `opacity: 1` and `transform: none`.

      **ONE PART DOES NOT FINISH ON THE SWAP'S CLOCK, AND IT IS LEFT ON
      PURPOSE.** Money's bars re-run `bar-rise` at 420ms with delays to 200ms,
      so the chart is still drawing at 620ms while the rest of the block has
      settled at 340ms. It was tried and reverted: the `.swap` WRAPPER is what
      is keyed, so the subtree remounts however the bars are keyed, and every
      way of stopping it hits FIRST PAINT identically, where 420ms is right and
      matches the screen's arrival — **nothing in CSS can tell the two apart.**
      Left because a bar growing carries meaning (magnitude drawing itself, not
      an entrance) and what he rejected was a flat fade. The fix, if he ever
      notices it, is a JS "first paint?" flag rather than a selector.
      **And `theme.css` claimed the opposite of all of this until today** —
      *"a month switch snaps, deliberately"* — which had never been true. A
      comment describing an intention rather than the behaviour is worse than
      none; it would have sent the next session hunting a bug in the swap.

      **`composition` is 59 checks** (57 → 59). 8e-i now pins the animation to
      the PARTS, **8e-i-b fails on any rule targeting `.swap` at all** —
      deliberately stricter than "no animation there", because the narrow
      version would have to guess at every spelling of the defect — 8e-ii pins
      the rejected blur as gone BY NAME, and 8e-vii counts **distinct** delays
      rather than the presence of a ladder, because a stagger that collapses to
      one beat is a uniform fade wearing ten selectors. All five baselined both
      ways by a Python harness that asserts each mutation changed the file
      before running anything — roadmap 2.17's own lesson from the bash
      harness that could not fail.

      **THEN IT WENT THROUGH `impeccable critique` AND THAT FOUND THREE
      THINGS THE MEASUREMENT HAD NOT** — two of them defects, and the review is
      the reason they are not shipping. **A clean `getAnimations()` reading
      tells you what is animating, not whether it SHOULD be.**

      - **THE PINNED ACTION BAR WAS ANIMATING.** `.jobbar` is a child of
        `.record-body`, so it was inside the swap: six buttons that are
        pixel-identical between any two jobs, travelling 14px at delay 20ms on
        every switch, on the record's primary tap target. **`RecordHost`
        already pulls the CLOSE BUTTON out of the swap for exactly this
        reason** — the action bar is the same object one level down and was
        missed because it is a child rather than a sibling. **Furniture opting
        out is the rule's other half, not an exception to it**: a swap means
        *the words changed*, and static chrome behaving like content is the
        purest page-refresh tell there is. `composition` 8e-viii.
      - **AND THE CHART IS FIXED RATHER THAN ACCEPTED.** The note above said
        620ms was left because no selector can separate a swap from first
        paint. True of CSS, and the review was right that it was being used to
        close the question: `Money.jsx` can see it in three lines. It does now
        (`.bars.replacing`), and the chart no longer animates twice — it still
        takes its beat as a `.swap` part; what stops is the second animation on
        top of the first. **Measured after: no `bar-rise` on a switch, six on
        the screen's first paint, nothing running at 440ms.**
      - **THE FIRST VERSION OF THAT FLAG WAS CORRECT-LOOKING AND DID NOTHING,
        and it is the best lesson in the item.** Recomputed per render, it was
        true on the render that changed the period and FALSE on the very next
        one — the reload finishing sets `refreshing`, which re-renders. The
        class went on and straight back off, and **removing `animation: none`
        from a live element STARTS the animation.** Plausible code, unchanged
        behaviour, and the class was already gone by the time anyone could
        inspect the DOM. Only `getAnimations()` caught it. Latched per period
        now.
      - **And the eight-deep ladder's written justification was overclaiming.**
        It said a cap at five would leave "the majority" of the Clients list as
        one plane; `ROW_CAP` is 200, so eight leaves a majority too. The cap is
        a BUDGET — the top of the list cascades, and it stops at eight because
        160ms is where the screen's own arrival stops. Wording corrected rather
        than the number.

      **What the review did NOT change, on purpose:** the blank tail (the
      bottom of a switched record is empty for up to 160ms) is the same thing
      the screen's own arrival does and is what "resolving top-down" costs; and
      rapid switching faster than ~150ms restarts the keyframes from zero, so
      the tail never lands — real, but it was equally true of the dissolve, and
      fixing it means abandoning the remount that makes a swap a swap.

      **`composition` is 61 checks.** Four more mutations baselined, each
      failing exactly its own check.

      **Full `--all` sweep, five widths: clean. `--lite` too. Nine
      credential-free suites, `accent-sweep`, `qr-scans`: all pass. The
      mechanical design detector: zero findings on all three changed files.
      Console: zero errors across every run.**


      **⚠ AND A SECOND THING FOR HIM, ON THE SQUIRCLE: THE LANDING PAGE.**
      The dashboard and the customer's booking page are squircled. **The
      marketing page at `/` is not, and that is deliberate rather than
      missed.** `landing.css` and the approved reference rendering
      (`docs/design-directions/5-the-thread.html`) use **literal pixel radii**
      — 16, 13, 11, 18, 100, 50% — and no radius tokens at all, so there is no
      one token to change: it is roughly twenty hand edits across the page he
      approved pixel by pixel, and the reference rendering has to move with it
      or CLAUDE.md's "where the document and that page disagree, the page is
      right" starts pointing at a page that no longer matches the system.
      **That is a different-sized decision from a token, so it was raised
      rather than taken.** His phrase was *"a keynote for the entire site"*,
      which probably includes it — but it is his approved artifact.

      **Recommendation: do it, in its own small item.** The two-corner-
      languages argument that put the corner on `booking.css` applies to `/`
      just as well, and a visitor who presses *Get started* crosses from one to
      the other in one click.

      ---

      **HE ANSWERED SOMETHING ELSE, 2026-09-04, AND IT CHANGED THE SHAPE OF THE
      QUESTION.** He did not rule on the landing page. He asked for two other
      things, and both are BUILT:

      > "For the squircles, do, like, your best to make a squircle design that
      > doesn't rely on the browser knowing what it is… that will work
      > universally. And when I used a browser extension to preview what it
      > looked like — what I liked is, the day menu and other menus, the main
      > difference is it just made the radius smaller, so more blocky with
      > still being rounded off. I think I like the blockiness more, but not,
      > like, super blocky, like the casual AI blocky, but just a little bit
      > less rounded. And more specifically, just on the tab switcher, the
      > corner radiation should be smaller. But just do whatever you think will
      > look well and doesn't look like AI."

      **THE TWO ASKS TURNED OUT TO BE ONE EDIT, and that is the finding.** The
      difference between a true squircle and the plain rounded corner every
      browser draws is PROPORTIONAL TO THE RADIUS — measured by rendering a
      corner at 4x and counting pixels, not argued: 34 differing pixels at
      18px, 14 at 12px, 7 at 10px, 3 at 8px. So tightening the radii is itself
      the universal fix; it cuts the Chromium-only difference by **59% on
      panels and 79% on insets**, with no mask, no worklet and no JavaScript.
      **Both alternatives stay rejected for the reasons already costed above**
      — this did not re-open them, it made them matter less.

      **WHAT SHIPPED:** `--r-panel` 18 → **12**, `--r-inset` 12 → **8** (ratio
      unchanged at 3:2), the same pair on `booking.css`, and the tab switcher
      off `--r-pill` onto its own **`--r-nav: 16px`** with its buttons at
      `calc(var(--r-nav) - 5px)` — arithmetic, because the bar's padding is
      5px and concentric corners have to be. **12px was tried on the bar and
      rejected by looking**: a 460x54 floating bar at 12px stops reading as an
      object over the ground and starts reading as a strip welded to the
      bottom. **Pills did not move** — he named menus and the tab switcher, and
      Apple keeps capsules as capsules while squircling cards.
      `composition` 8a now covers `--r-nav` too, because a new radius token
      that is not named in that check is the one surface the pairing rule
      silently stops covering.

      **AND THE LANDING PAGE WENT IN THE SAME DAY — *"just do whatever is
      needed"* — WHICH CLOSES THE LAST THREAD IN 2.17.** `/` had six ad-hoc
      radii and no tokens; it now carries `--ld-r-panel: 12px`,
      `--ld-r-inset: 8px` and `--ld-corner`, the product's own values, so
      pressing *Get started* no longer changes the corner under the visitor
      mid-click. **The approved reference rendering moved in the same edit and
      is swept as its own surface** — where it and the document disagree the
      PAGE is right, so a page that drifts from the stylesheet quietly becomes
      the wrong authority. `composition` 8a is four surfaces now, 72 checks.
      **Both files were rewritten from ONE table keyed on the VALUE, not the
      selector**: they spell their selectors differently (`.ld .tile` against
      `.sunken`, spaced against minified) and a selector-keyed pass silently
      missed four of the twelve on the first attempt.
      **The two complications raised when this was only measured were both
      real and are both fixed**: `corner-shape` does not inherit (the hero
      card's highlight would have stayed a round rect inside a squircled card)
      and it has no effect on `clip-path` (the comparison row would have wiped
      a different shape than it drew). At 8px the second is a 3-pixel
      difference — *which is exactly why it would have survived a look.*
      Verified at 1920 / 1440 / 768 / 392 with the console read at each: clean
      but for the two known React Router future-flag warnings.

      **MEASURED 2026-09-04 so the ask is a number rather than "roughly
      twenty", and it turned up two complications a token pass would have
      shipped as defects.** `landing.css` and the approved reference rendering
      hold **27 `border-radius` declarations each, with identical value
      profiles** — the two files are in lockstep, which is the good news.
      Of those 27: six are `100px` pills, four are `50%` dots, one is a 3px
      bar and four are `inherit`. **That leaves TWELVE panel/inset corners** —
      10, 11 (x3), 12, 13 (x2), 16 (x2), 18 (x2) and one asymmetric
      `16px 16px 16px 5px` — so it is **12 pairings in each of two files, 24
      edits**, and it should introduce `--ld-corner` beside them the way
      `--corner` and `--bk-corner` already exist, so the third surface stops
      being the one without a token.

      **THE TWO COMPLICATIONS, and they are why this is still not a token
      change.** (1) `.ld .litcard::before` is a full-bleed light overlay with
      `border-radius: inherit` — and **`corner-shape` does NOT inherit**, so
      squircling the card alone leaves its own highlight drawn as a round rect
      inside it. (2) `.ld .vsrow.mine` carries `clip-path: inset(… round 13px)`
      and **`corner-shape` has no effect on `clip-path` at all**, so that row's
      reveal would stay a round rect whatever the radius says. Both are
      fixable; neither is visible from a list of radii.

      **AND HE CAN NOW DECIDE BY LOOKING.** The hero card was rendered at 1920
      both ways by injecting `corner-shape: squircle` at runtime — no file was
      touched — and the difference is clearly visible at real size: the
      squircle's edge runs straighter for longer and turns harder. The
      comparison was sent to him 2026-09-04. **Still his call.**


## Phase 3 — Tenant websites (the biggest new build)

      **MEASURED 2026-09-03, when he asked *"there's still no animations on
      the page, but is that just because we haven't gone to that stage yet?"* —
      read from the COMPUTED style on the live dashboard, not from the
      stylesheet, because stage 3 already shipped an arrival that was dead and
      looked exactly like a finished screen.**

      **Running:** the screen's staggered arrival on every tab change
      (`arrive`, 420ms, 0/40/80/120/160ms delays — confirmed 120ms after a
      Calendar click with the delays live on the elements); 180ms hover
      transitions on buttons, chips and calendar cells; the rail row's text
      translate; and `.sheet` in and out below `--wrap`.

      **Not running, which is what he is seeing:** opening a job record at a
      desk produces **no new animation at all** — 120ms after the click the
      only animations on the page are the screen's own arrival, unchanged, and
      hover transitions. Same for the day panel, a settings column and a
      picker. **That is this item exactly, and the answer to his question is
      yes: it is the stage we have not reached.** New components already ship
      their entrance and exit (2.12's request card does); the retrofit is what
      is left.
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
| 2.10 — dashboard IA | `impeccable` (`shape` for the architecture, `critique` for the audit). Research first, written proposal, owner approves before code | direction-generating skills — this reopens WHERE things live, never how they look |
| 2.11 — **DONE 2026-09-02** — dashboard from scratch | `impeccable` — `shape` per screen at step 4, `critique` on each finished screen, `audit` for a11y and responsive. `animate` only if motion changes. `ship-check` at the end | direction-generating skills. **The open question was ANSWERED (A), "the look stays"** — so no direction round, ever, on this item. Steps 1–5 produce FILES; he approves before any code. ~~**Steps 0–5 are done; the list is approved, the desktop layout is specified, every screen is designed and every component is inventoried. Step 6 is next and it is HIS approval gate — nothing is built until he says so**~~ ~~**HE ANSWERED 2026-08-31: approved WITH AMENDMENTS, and he lifted this item's no-schema rule. Step 4b, the phone pass, was added by his answer and is the only thing before code.**~~ **STEP 4b IS DONE TOO** — `docs/dashboard-phone-pass-2026-08-31.md`, every screen's phone form decided again from nothing, and it OVERRIDES step 4 wherever the two disagree about a phone. **AND HE RULED THE PHONE PORTRAIT-ONLY the same day** — *"when someone flips their phone over sideways, I don't want it to completely readjust"* — which withdrew the landscape half of step 4b, took `844` and the `short-screen` check back out of `sweep-widths.mjs`, and closed 2.16 unstarted. **The dashboard readjusts today**, so step 6 still owes one guard: `min-height: 500px` on `theme.css`'s 700px and 560px breakpoints. ~~**Step 6, the build, is the only thing left.**~~ **ALL SEVEN STAGES OF STEP 6 ARE BUILT — the shell and Today, the job record, the calendar, Money, Clients, Business and the twelve settings screens, and first run. The item is closed 2026-09-02.** His asks left the item as roadmap 2.13, 2.14 and 2.15. |
| 2.17 — motion and shape as a house style | `improve-animations` to audit first, then `animate` to build. `impeccable` — `audit` for reduced motion and `critique` on each screen it touches. **`docs/design-system.md` § Motion is updated BEFORE any code**, because this item deliberately grows a budget that file caps | every direction-generating skill, as everywhere else on this product. **The look is settled — this is motion and one corner token, not a redesign** |
| 2.18 — the emails, rebuilt from scratch | `impeccable` for the visual half, and only that | direction-generating skills. **Step 1 is RESEARCH and he asked for it by name** — do not start designing templates before the six-product sweep says what the set of emails even is |
| 2.12 — request-vs-reserve, accept, quotes | none — this is engine, schema and edge-function work, not a visual item. `impeccable` only if it adds a screen 2.11 did not already design | design skills. **Do not start it inside 2.11**: 2.11 leaves the accept state designed and empty on purpose |
| 3 — tenant websites | `frontend-design` for page structure and hierarchy only; `ship-check` before calling it done | inventing color or type — those come from the system, not the skill |
| 4 — features + admin | `security-review` (the platform-admin lock especially), `code-review` | design skills |
| 5 — Andrew's migration | `security-review`, `code-review`. Real customer data — no shortcuts | anything that writes to the old project without an explicit go-ahead |
| 6 — demo business | `ship-check` | gray placeholder boxes; the owner's rule is real photography or ask |
| 7 — launch readiness | `ship-check`, `security-review`, `code-review` at high effort | shipping anything the owner has not seen at 392px |
