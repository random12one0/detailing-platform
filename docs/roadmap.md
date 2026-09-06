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

- [x] 2.14 **Plans a customer can sign up to — DONE 2026-09-04, all three
      steps: four rounds of research, the detailer's half, the customer's
      half.** *(Phase 4.3, "Monthly plans — needs a design conversation
      first", is this item and is closed into it.)* **The OWNER asked for it on
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

      **ROUND 2 — HE ASKED FOR MORE RESEARCH THE SAME DAY, AND IT IS DONE
      (2026-09-04).** He named five things: the types of plan detailers run, how
      to stop people breaking one *"let's say if like there's a requirement"*,
      how to display and track members, whether the detailer handles it or we do
      with payments, and how it works *"with what's available to me for free"*.
      Three more businesses were sampled (ten plan pages now) plus Housecall
      Pro's Service Plans dashboard docs. **Second half of
      `docs/plans-research-2026-09-04.md`.** What it settled:

      - **SIX PLAN SHAPES EXIST AND THEY ARE NOT SIX FEATURES.** Frequency plan,
        tiered membership, visit bundle, prepaid block, discount membership and
        coating-protection programme all fall out of **four fields: a cadence,
        what's included, how it's priced, and whether there is a term.** Cadence
        is not a fixed list (weekly through annual, and Tang advertises *"custom
        schedules — just ask"*), and **price can vary by VEHICLE SIZE** (Car
        Detox: $150 / $125 / $100), which we nearly have for free.
      - **THE TRADE DOES NOT USE CONTRACTS AND ADVERTISES AGAINST THEM.** Six of
        ten plan pages sell *"no contracts, cancel anytime"* as a feature. Early
        termination fees are the GYM industry's answer and detailing has visibly
        rejected it. **The anti-breakage tools that do work are PAUSE and SKIP**
        — ZS gives *"One free skip per year"*, Tang lets you *"pause your
        membership while you travel"* — because most breakage is a month somebody
        could not do, not defection. **We could not enforce a penalty anyway; we
        take no money.**
      - **THE REQUIREMENT HE MEANT HAS A REAL EXAMPLE AND IT IS NOT A CADENCE.**
        Ceramic coating warranties **void** without documented annual
        maintenance — System X within ~30 days of the install anniversary, *"and
        missing the window voids the warranty for good."* That needs a
        **deadline, an escalating reminder and a last-done stamp**, not a
        stricter interval. **None of the six panel products does this**, and it
        is the one place a detailing-specific product beats Jobber outright.
        Worth its own small item later rather than smuggling into a cadence.
      - **TRACKING: COPY THE SHAPE OF HOUSECALL PRO'S DASHBOARD, NOT ITS SIZE.**
        Its seven plan statuses exist because it has billing behind it; **ours
        needs three — active / paused / ended.** The one list worth building is
        **VISITS OWED BUT NOT BOOKED**, which exists in their product for
        exactly this research's first finding: the sale and the schedule are two
        acts. `Clients` already computes lapsed and `Money` already has periods,
        so most of this is a badge and a list.
      - **WHO HANDLES IT: WE LOG IT, THE DETAILER RUNS IT — for now.** Five of
        seven detailers manage plans by conversation, real subscriptions cost a
        SUPPORT burden rather than a code one (a customer charged for a month
        nobody showed up for complains to whoever sent the email), and **logging
        is a strict subset of billing** — nothing is thrown away. **The shape
        that makes billing cheap later is decided now: a plan has a cadence, and
        a MEMBER has a ledger of visits owed and used.** Build the ledger from
        day one or adding billing is a rewrite.
      - **SIX THINGS HE DID NOT TYPE OUT** are in the file. The one that will
        hurt most: **a plan belongs to a VEHICLE, not a person** — Visual prices
        *"per vehicle each visit"* and sells a two-vehicle plan — and
        `customers` has no vehicles today, so *"his truck is on the bi-weekly,
        her car is not"* cannot be said.

      **BLOCKED ON PAYMENTS ONLY WHERE IT SHOULD BE.** Option A (log it) needs
      nothing from 2.20; the billing version needs Connect. Build order is 2.20
      stage 1–2, then this.

      **HE DECIDED THE SHAPE THE SAME DAY, AND HE GOT THERE HIMSELF — ROUND 3 of
      `docs/plans-research-2026-09-04.md`.**

      > *"there's gonna be no real way to easily have a monthly system that every
      > detailer wants and how it's gonna work in the booking process… what we
      > need is a way for them to be able to track it inside of our app somehow,
      > but they're gonna do the negotiations of, like, what dates and all the
      > times separately. So we need a way for the detailer within the app to log
      > this customer as a monthly plan, and they could set all the settings — if
      > it's weekly, biweekly, monthly, which tier it is, or if it's a percent
      > discount, if it's a bundle."*

      **That is option A, decided.** The plan is LOGGED, never sold and never
      billed by us; the detailer negotiates dates and times off the product.
      **He listed cadence, tier, percent and bundle unprompted — the four fields
      arrived at from the other direction by someone who runs the business.**
      **The ledger of visits owed and used stays non-negotiable**: it is the only
      thing between "log it now" and a rewrite when billing arrives.

      **HIS CUSTOMER-ACCOUNTS IDEA — HE ASKED FOR A VERDICT AND THE ANSWER IS
      "GOOD IDEA, ONE STEP EARLY".** He proposed plan customers signing in with
      Google or an account, seeing their plan and cancelling, with *"log in or
      continue as guest"* on the booking page. **Everything he wants from it
      comes from a LINK, a pattern this product already leans on twice** —
      `/booking/:id`, where the UUID IS the credential, and 2.12's quote
      acceptance. A plan member gets a **"your plan" link**: what they are on,
      when they are next due, a cancel button, and a book button that carries
      the plan. **It also happens to satisfy California's same-medium
      cancellation rule** (2.20). Four reasons the account itself is expensive
      now: it puts a **second kind of human** into an auth system that holds only
      detailers and staff, with the public booking page deliberately outside
      `BusinessProvider` and 2.13 having just made permissions coherent;
      **"whose customer are they"** has no right answer when someone uses two
      detailers on the platform; passwords are a permanent obligation over
      names, phones and addresses; and **"log in or continue as guest" costs
      bookings**, against W16. **Build the link; the account is the same page
      with a door on it later.**

      **AND HE HANDED THE REQUIREMENT CASE'S DESIGN TO US** — *"I think you could
      probably figure all that out."* **Recorded as owed at build time, not
      specified here**, because it depends on where the member's ledger lives.
      What must survive: it is a **deadline with a date**, an **escalating
      reminder** and a **last-done stamp** — not a stricter cadence.

      **HE CONFIRMED THE SCOPE 2026-09-04, and it is wider than "log a
      member":** *"we need our website to be set up to be able to have whatever
      they want… so we have to have Supabase tables for all the tracking, and a
      way for them to set up their monthly plan within the website, like in the
      More page or the business page… we need to accommodate for everything."*
      **So the deliverable is the SETTINGS SURFACE plus the tables, not just a
      badge** — a detailer defines their own plans (the four fields) and logs
      members against them. **And he will feed real requirements back**: *"as I
      get my first clients, I will be talking to you for any changes they say —
      hey, this isn't compatible."* **Which means the schema's job is to be
      cheap to extend, not complete on day one.**
      **He also confirmed the payment rail is the DETAILER's choice** — 2.20's
      stage 3 (cards through the platform) or *"whatever system they've been
      using already"*. **Neither is the default; both are settings.**

      **ROUND 4 — THE BOOKING PAGE, AND ONE IDEA THAT MUST NOT BE BUILT AS
      DESCRIBED (2026-09-04).**

      - **"TYPE YOUR EMAIL AND IT SHOWS YOU" IS ADDRESS ENUMERATION.** If typing
        an address returns that person's plan or history, **anyone can type any
        address** and learn whether their neighbour uses this detailer and what
        they pay. **The safe twin is one word different: email IN, LINK OUT** —
        we email them their link and display nothing, and the page says the same
        thing whether or not the address is a customer. **This product already
        works that way twice** (`/booking/:id`, where the UUID is the
        credential, and 2.12's quote acceptance), so it is a third caller of an
        existing pattern rather than a new mechanism.
      - **THE CHEAPEST 90% IS THE BROWSER REMEMBERING.** Most people rebook on
        the same phone. Remember the last customer's name, email and phone on
        that device and pre-fill; **if that customer is on a plan we already
        know it without anyone typing** — which is the "auto-detect" he was
        reaching for — and a new device just fills the form in as today. **No
        account, no lookup, no security surface.**
      - **MOVING THE CONTACT STEP FIRST: NOT AS THE DEFAULT.** It front-loads
        friction before the customer knows the price, **nothing in the ten
        sampled businesses or six products asks first**, and **the step budgets
        were MEASURED** — 2.7 and 2.8c, binding screen 1440x900 with 10px spare
        on step 1 — **so a reorder means retaking all of them.** The version
        that gets his benefit without the cost: **keep the order and show
        recognition at the TOP of step 1** when we already have it. *"Welcome
        back, Marcus — your Bi-weekly plan applies."* Buildable as a deliberate
        change if he still wants it; not as a side effect of the plans work.
      - **THE PLAN SECTION IS "ONE BUTTON PER PLAN", AND HE IS RIGHT ABOUT THE
        SHAPE.** Name, cadence in the detailer's words, what is included, price
        however they chose to express it; the button starts the ordinary flow
        with the plan attached and ends as a request. **"Whatever we calculate"
        has to run through the ONE pricing implementation** and land where
        discounts already land — **a plan price shown on the booking page and
        not charged by `computeQuote` is the travel-fee defect for the THIRD
        time**, and `tests/booking-engine.test.mjs` test 17 is the check's
        shape. **And the request card must SAY it is a plan booking**, or the
        detailer quotes it as a one-off.

      **HE APPROVED ALL OF ROUND 4 ON 2026-09-04**, so these are decisions now
      rather than recommendations: **remember the customer in their browser**
      (*"we should definitely log people, log their browsers and with cookies"*),
      **the welcome-back message at the top of step 1** (*"a welcome message
      would be cool"*), **the reorder is off** (*"we won't move the year to the
      front anymore"*), and **more than one plan button where a detailer has
      more than one plan** (*"we could even have multiple buttons for it, some
      people probably have different monthly plans"*). **And the emails should
      carry the booking link with a nudge** — *"make sure the emails kinda remind
      them, hey, here's your link, don't lose it"* — which is a template change
      in `_shared/emailTemplates.ts`, not new machinery, since every email
      already has the link.

      ---

      **STEP 2 IS DONE — 2026-09-04. THE DETAILER'S HALF: the tables, the
      ledger and the settings screen.** `20260904002000_plans.sql`,
      `app/src/lib/plans.js`, `app/src/screens/more/Plans.jsx`,
      `tests/plans.test.mjs` (51 checks). Applied to the platform project and
      seeded. Full reasoning: DECISIONS.md → "Roadmap 2.14, step 2".

      **What a cold session must not re-derive:**

      1. **THE LEDGER'S TWO HALVES LIVE IN DIFFERENT PLACES, ON PURPOSE.**
         OWED is append-only rows in `plan_visits`; USED is
         `bookings.plan_member_id`, a COLUMN, **because cancellation already
         works there** — twelve places in this codebase ask
         `status <> 'cancelled'` and every one is already right about a plan
         visit that was called off. One ledger table with `used` rows in it is
         the obvious build and it is wrong. **Do not "tidy" the two halves
         together.**
      2. **PAUSE IS A DATE (`plan_members.accrue_from`), NOT A FLAG.**
         Accruing from `started_on` backfills every skipped visit the moment a
         paused member returns.
      3. **`accrue_plan_visits()` IS THE ONLY THING THAT WRITES A GRANT**, it
         is idempotent by a partial unique index, and `pg_cron` runs it nightly
         at 00:05 UTC. `seed-demo.mjs` calls it rather than writing grant rows
         by hand, so a regression in the accrual shows up as a demo with
         nobody owed anything.
      4. **THE AUTO-LINK TRIGGER'S CEILING IS KNOWN AND STATED**: a member who
         books something the plan does not cover has that job counted, because
         `booking_services` rows are written after the booking and a BEFORE
         INSERT trigger cannot see what was bought. Clear the link or add an
         `adjusted` row. **Revisit if a detailer complains, not before.**
      5. **NO NEW PERMISSION KEY.** `plans` writes ride `settings`,
         `plan_members`/`plan_visits` ride `money`. **This is the one thing in
         step 2 handed to the owner rather than decided** — see the question
         below.
      6. **NOT BUILT, DELIBERATELY:** price by vehicle size (one jsonb column,
         append-only, add when asked), a plan per VEHICLE (`customers` has no
         vehicles; `plan_members_one_live` is the single index that assumes a
         person), and the coating-warranty deadline (round 2's requirement
         case — it is a date, an escalating reminder and a last-done stamp, and
         it is still owed — **and it is roadmap 2.23 now, opened in this same
         change so it does not die inside this item's prose**).

      **A FOURTH PRICE SHAPE LANDED THE SAME DAY**
      (`20260904003000_plan_price_up_front.sql`), after he asked whether a
      detailer is locked into a kind of plan. **Answered by putting ELEVEN real
      shapes into the demo and looking**: tiers, a prepaid year, a weekly
      two-visit fleet plan, an annual coating check-up, a quarterly and an
      every-five-weeks. Ten were right; **a prepaid block had to be entered as
      a MONTHLY price**, so "$1,999 for the year" printed as "$1999.00 a
      month". `price_kind` is now `monthly | per_visit | percent_off | total`,
      which is `controls.jsx`'s stated four-option ceiling. The same eleven
      rows also showed **the term printing nowhere** — `termWords()` now says
      it on the row, before the member count.
      **`term_months` STAYS SEPARATE FROM `price_kind`**: a prepaid year is
      usually twelve months, but a prepaid block of ten visits has no end date,
      and merging them makes one of the two unsayable.

      **FOUR HONEST LIMITS, none of them hit by those eleven shapes:** one plan
      per customer at a time (`plan_members_one_live`); a bundle of DIFFERENT
      kinds of visit is prose, not counted separately; price by vehicle size is
      not a plan field (and needs none today — a member's price is snapshotted
      and editable, so the detailer types the right number per person); and
      what's included is prose rather than catalog rows —
      `included_service_ids` exists with no UI because step 3 is what needs it.

      ~~**OPEN FOR THE OWNER — one question, and it is small:**~~
      **ANSWERED 2026-09-04: LEAVE IT.** He was asked whether defining a plan
      and logging a member should need the same tick, with the recommendation
      to leave the split as it is; his answer was *"I don't really have any
      question for me, but it'd be recommended we added this. That's fine."*
      **So the split stands** — `settings` defines a plan, `money` logs a
      member — and there is no fifth permission key. Reopen only if he asks.
      For the record, the question was: should defining a
      plan and logging a member need the same tick? Today a role with
      *Settings* can create a plan and a role with *Money* can log who is on
      one, which is why the demo's "Detailer" can do the first and not the
      second. The alternative is a fifth tick of its own. Nothing is blocked
      either way.

      ---

      - [x] **STEP 3 — THE CUSTOMER'S HALF — DONE 2026-09-04.**
            `20260904004000_plans_customer_half.sql`, `supabase/functions/plan-link/`,
            `app/src/book/PlansPage.jsx`, `app/src/book/PlanMemberPage.jsx`,
            `planLineFor` in `_shared/pricing.ts`, and three states added to
            `sweep-booking-steps.mjs`. Full reasoning: DECISIONS.md →
            "Roadmap 2.14, step 3".

            **WHAT A COLD SESSION MUST NOT RE-DERIVE:**

            1. **EVERY STEP'S SPARE ROOM IS UNCHANGED — 10px on step 1 at
               1440x900, 47px at 392x844 — and that is the whole shape of the
               item.** The plans are a PAGE (`/book/:slug/plans`), the door to
               them rides the row the progress rail and *"Step 1 of 7"*
               already share, and the recognition the owner asked for is spent
               on step 1's HEADING (*"Welcome back, Marcus"* /
               *"Let's set up your Bi-weekly maintenance"*) and the price bar's
               EYEBROW (*"Bi-weekly maintenance applied"*) — two lines that
               were already drawn. **The door cost 3px on its first
               measurement** and needed its line box pinned; a control that is
               free in principle is not free until it is measured.
            2. **THE PRICE IS ONE FUNCTION AND IT RIDES `price_adjustments`.**
               `planLineFor` in `_shared/pricing.ts`, pushed into
               `adjustmentLines` — the array the review step, every email, the
               invoice, the manage page and the booking row already draw. A
               `plan_discount` column was the obvious build and would have
               meant nine render paths, of which one would have been missed.
               **The rule: the plan governs the SERVICES; add-ons and travel
               are always extra; a percentage comes off the whole job.**
            3. **A SIGN-UP IS A REQUEST IN EITHER BOOKING MODE**, because the
               sale and the schedule are two acts — but an existing member
               booking their own covered visit is NOT held up, which is why
               `create-booking` asks the database whether they are already a
               member rather than keying off the plan alone. `booking-engine`
               test 18 pins that on a reserve-mode business.
            4. **"TYPE YOUR EMAIL AND IT SHOWS YOU" SHIPPED AS ITS SAFE TWIN**
               — email IN, link OUT. `plan-link`'s `email` action answers
               identically for an unknown business, a bad address and a
               stranger. **His account idea shipped as `/plan/:memberId`**,
               the membership UUID as the credential.
            5. **A DEFECT OLDER THAN THIS ITEM WAS FIXED ON THE WAY: a
               NEGATIVE `price_adjustments` line printed as a positive CHARGE
               in every email** (`moneyBlock` draws by `kind`, not by sign), so
               the column silently stopped adding up. Already reachable via
               `accept-quote` whenever a detailer quoted UNDER the estimate.
            6. **THE PLANS PAGE WAS BUILT TWICE.** Four boxed cards each ending
               in a full-width *"Ask about <the name written above it>"* — the
               §1 tell and the copy rule in one component — replaced by a RULED
               LIST where the row is the button. 96px a plan against 190px, and
               the page went from 311px past the bottom of a laptop to fitting.
            7. **`included_service_ids` STILL HAS NO UI and no longer needs
               one.** Step 2 named step 3 as the thing that would need it; the
               plan button starts the ordinary flow and the customer picks,
               which is what the auto-link trigger's stated ceiling already
               assumes. Narrow the discount to covered services when a detailer
               complains, not before.

            ~~**STEP 3 — THE CUSTOMER'S HALF, all of it on the booking page.**~~
            Round 4 is approved and this is what it turns into:
            **one button per plan** in a section beside the flow (never a step
            inside it), which starts the ordinary flow with the plan attached
            and ends as a REQUEST; **the plan's effect on the price runs
            through `_shared/pricing.ts` and nowhere else** — a plan price
            drawn on the page and not charged by `computeQuote` is the
            travel-fee defect for the THIRD time, and
            `tests/booking-engine.test.mjs` test 17 is the check's shape;
            **the request card must SAY it is a plan booking** or the detailer
            quotes it as a one-off; **the browser remembers the last customer
            on that device** and step 1 shows *"Welcome back, Marcus — your
            Bi-weekly plan applies"* at the TOP (the reorder is off, his own
            words); a **"your plan" LINK** — what they are on, when they are
            next due, cancel, and a book button carrying the plan — never an
            account and never an email lookup that displays anything
            (**email IN, link OUT**); and the emails carry the booking link
            with a nudge, which is a template change in
            `_shared/emailTemplates.ts`.
            **`get_public_business_profile` does not return plans yet** — that
            is step 3's first line. **Re-measure with
            `node scripts/sweep-booking-steps.mjs`**: the budgets are 10px
            spare on step 1 at 1440x900, so anything added to a step spends
            something real.

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

- [x] 2.19 **"Want to email some of your old customers?" — MANUAL, with a
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

      ---

      **BUILT 2026-09-05, AND ONE PARAGRAPH ABOVE THIS WAS WRONG.**

      *"Most of that machinery goes away"* is true of the SCHEDULING and false
      of the statute. **CAN-SPAM classifies a message by its PRIMARY PURPOSE,
      never by what pressed send** — so a detailer hand-picking fourteen names
      needs a working opt-out and a valid postal address exactly as an
      automated blast would. What the manual design actually removes is the
      cron job, the segments and the reputation problem of a scheduled send.
      Both legal requirements are built and pinned by `tests/campaign.test.mjs`;
      do not remove either on the grounds that a human pressed the button.

      | | |
      |---|---|
      | The migration | `20260904005000_campaign_emails.sql` — `customers.unsubscribed_at`, `businesses.mailing_address`, `businesses.last_campaign_at` |
      | The email | `campaignEmail`, the 13th template and the only commercial one |
      | The legal footer | `shell(brand, blocks, preheader, legal?)` — optional, so no other template gained a byte |
      | The send | `supabase/functions/send-campaign/` — `marketing` permission, three recipient rules, **50 per press** |
      | The opt-out | `supabase/functions/unsubscribe/` + `/unsubscribe/:customerId` |
      | Compose | `app/src/components/CampaignModal.jsx`, a `<Sheet>` at every width |
      | The prompt | the LAST row on Today, quiet for 30 days after a send |

      **THE CAP IS ABOUT BOOKINGS, NOT SPAM.** Resend's free plan is **100
      emails A DAY across every tenant** and the transactional set spends ~5 a
      booking, so an unbounded campaign could stop confirmations going out —
      which would present as *"the booking page is broken"*. 50 per press, 550ms
      apart (Resend's 2-per-second limit). **It goes up when the platform has
      its own Resend account** — 2.18's open thread, priced in 2.20.

      **THE COMPOSE SURFACE SELECTS NOBODY, because the selection existed.**
      It is handed the list the chip or the search field already narrowed. The
      only selection change was widening WHEN the action row appears: a set
      narrowed by typing a name is as much a chosen set as one narrowed by the
      chip, which is what *"someone that they want"* asks for.

      **AND THE DEMO HAD ZERO LAPSED CUSTOMERS.** All eight had a booking in
      the last few days, so the `Clients · not seen in 3 months` block
      `sweep-widths.mjs` has walked at five widths since 2026-09-02 was
      measuring an EMPTY screen and printing `clean` — *a skipped check reads
      exactly like a passing one*, again. Five lapsed customers are seeded now
      (one with no email, one opted out, one with a long name for the chip wall
      at 320). Full reasoning: DECISIONS.md → "Roadmap 2.19".

      **STILL OPEN AND NOT CODE:** no send history, so pressing send twice
      sends twice (the button disables while it works, and that is the whole
      guard) · `formatDateLong`'s `en-US` and the SPF/DMARC threads from 2.18
      are unchanged · **and the owner has not seen this email in a real
      inbox**, which is the same gap 2.18 closed for the transactional twelve.

      **AND IT EXPOSED A RACE IN `sweep-widths.mjs` OLDER THAN ITSELF.**
      Monthly plans and Team draw their buttons only after Supabase answers and
      were measured with `settle()` + `count()` — a cap on a repaint, not a wait
      for a round trip, and `?lite=1` makes it WORSE because a page with no
      animations goes quiet sooner. Fixed with an `appear(locator)` helper.
      **A full `--lite` sweep-widths run appears not to have been taken since
      roadmap 2.14 added those buttons.**

- [ ] 2.20 **TAKING MONEY — the OWNER asked for this on 2026-09-04, and the
      research is done: `docs/payments-research-2026-09-04.md`.**
      **STAGES 1 AND 2 ARE BUILT (2026-09-04 and 2026-09-05). STAGE 3, Stripe
      Connect so a detailer can take cards, is the whole of what is left, and
      it is what unlocks charging for a monthly plan (2.14).** Stage 2 is
      finished in code and **switched off waiting for a Stripe key** — test
      mode needs no activated account, `docs/setup-steps-2026-09-04.md` step 2b
      is the ten minutes.

      > *"We need to figure out payment cuz at least I need a way for my
      > customers to pay me."*
      > *"The live site doesn't. That's just what I accept and I just have them
      > like scan my code or whatever for which one they choose. No payment ever
      > goes through my site. But that has to change. I want an official way to
      > pay me with reoccurring subscription obv cuz my clients the detailers
      > need to pay me and I'm not gonna do it manually."*

      **THERE ARE TWO MONEY PROBLEMS IN THAT AND THEY HAVE DIFFERENT ANSWERS.**
      **MONEY IN** is detailers paying HIM — $499 setup, $40/month, recurring,
      and he will not chase it by hand. **MONEY THROUGH** is a detailer's
      customers paying THE DETAILER. **He must never hold the second one**:
      holding other people's revenue means owning their chargebacks and
      answering for a detailer who did not turn up.

      **NOTHING EXISTS TODAY AND THAT IS CLEAN, NOT BEHIND.** No processor, no
      card data, no webhook, no subscription. `bookings.payment_status` is a
      flag the detailer sets in `FinalizeModal.jsx` and **how they paid is FREE
      TEXT in `payment_notes`** — there is no `payment_method` column on
      `bookings`. The old site's *"Cash, Cash App, PayPal, Venmo & Zelle"* was a
      LIST, never a checkout; he confirmed it.

      **THREE STAGES, EACH OF WHICH STANDS ALONE. Build in this order.**

      1. **The detailer's own payment handles on the invoice.** Settings fields
         plus an email block, so what he already does — hold up a QR code —
         becomes official. **No processor, no fees, no risk**, and it is days of
         work. It is also the only option that costs a detailer 0%.
      2. **Platform billing: Stripe Checkout in subscription mode**, the $499 as
         a one-time line and the $40 as the recurring one. **This is his hard
         requirement.** The work is not the checkout, it is **what happens when
         a card fails** — failed payments are 20–40% of all SaaS churn, and the
         trade's practice is 3–4 retries over 10–14 days, a 3–7 day grace
         period, then **pause rather than cancel**. **Same suspend mechanism as
         4.4, so build it once.**
      3. **Stripe Connect `Standard` so a detailer can take cards.** **It costs
         the PLATFORM $0** — read from Stripe's own docs, not inferred: a
         `type=standard` account defaults to the connected account paying, and
         in that mode Stripe *"[doesn't] charge any Connect fees to it or to
         your platform"*, with processing fees, **dispute fees** and
         Invoicing/Subscriptions fees all landing on the detailer. The $2/active
         account and 0.25% + 25¢ per payout apply only if the PLATFORM handles
         pricing, which we would not. **This is also what unlocks real plan
         subscriptions in 2.14.**

      **STAGE 1 SHIPPED 2026-09-04, AND ITS SCOPE IS ROUND 3'S — NOT THE
      SENTENCE IN STAGE 1's OWN BULLET ABOVE, WHICH IS ROUND 2's AND IS
      SUPERSEDED.** Round 2 said *"the payment handles go on the UNPAID branch
      only"*; round 3 §4 moved them on the owner's own trade knowledge —
      *"they don't leave a client's house until it's paid"* — so the unpaid
      invoice is a rare document and round 2 was aiming at a page almost
      nobody sees. **The round-2 sentence is still quoted in three files and
      reads like a complete specification on its own.** Built:

      - `business_settings` gains **six columns** — `pay_cash` (boolean),
        `pay_venmo`, `pay_cashapp`, `pay_paypal`, `pay_zelle`, `pay_other`,
        each capped at 120 characters by a check constraint because every one
        of them is typed by a detailer and printed in a customer's email.
        Migration `20260904006000_payment_handles.sql`, applied.
      - **`supabase/functions/_shared/payments.ts` is the one place that
        decides what a handle displays as and whether it can safely be
        linked.** It returns DATA, never HTML. **A wrong payment link is worse
        than no link** — it sends somebody's money to the wrong person, or
        404s — so only a plain username or a pasted `https:` URL is linked;
        a phone number, an email address, `http://` and `javascript:` are
        printed exactly as typed. **Zelle never links**: it lives inside a
        bank's app and has no web address. The sigil and the link stand or
        fall together, because `@(303) 555-0142` is not a Venmo handle.
      - **FIVE emails carry the list, not the two this item's prose names.**
        The confirmation, the reminder, the second reminder, **the
        accepted-request email** and the unpaid invoice. That fourth one is
        the branch the wording would have missed: in **request** mode the
        customer's first email says *"we're holding your time"* and charges
        nothing, so the ACCEPTED email is that tenant's confirmation. Without
        it, every request-mode business would have handles on no email at all.
        **Never the paid receipt**, which is the whole point of the branch.
      - **`app/src/screens/more/Payments.jsx`** — *"How you get paid"*, the
        fourteenth settings screen, tenth row on Business under *What you
        sell*. Added to `sweep-widths.mjs` in the change that built it. Clean
        at 1920 / 1440 / 768 / 392 / 360 / 320.
      - **`tests/payments.test.mjs`** — 38 checks, credential-free, baselined
        three ways (handles on the receipt fails 1, the escape removed fails
        3, a link built from anything fails 7). `seed-demo.mjs` now seeds one
        of every handle shape, because *a configuration nothing seeds is a
        configuration nothing tests* applies to the settings screen too.

      **TWO DEFECTS CAME OUT OF LOOKING AT IT AND NEITHER WAS VISIBLE IN THE
      CODE.** The Venmo / Cash App pair leaves 155px a field at 392, which
      holds `@andrews-detail` and clips anything longer into a scroll inside
      the box — **a payment handle is the one value where reading half of it
      is the same as reading none**, because the detailer is checking it
      character by character against another app, so it was unpaired. And the
      Business row summary named all six and clipped to *"Venmo, Cash App,
      PayPal, Zelle, something els…"*; it names two and counts the rest now.

      **THE SECURITY REVIEW FOUND NOTHING EXPLOITABLE AND ONE THING WORTH
      FIXING ANYWAY.** No injection reached the email — 19 hostile inputs all
      produced `href: null` or a benign `https:` href, and the rendered output
      carried no raw tag, no attribute break and no handler — the six new
      columns are covered by `business_settings`'s existing
      `has_business_permission(business_id, 'settings')` policies with no new
      policy needed, `get_public_business_profile` builds its `settings` key
      from a 21-field allowlist that does not include them, and the migration
      drops nothing. **What it did surface is a COPY defect with teeth:
      `business_settings` writes ride the `settings` tick, so the moment the
      handles landed on that table the tick also granted "change where your
      customers are told to send money" — while its own sentence still read
      *"Prices, hours, booking rules, branding and the business's own
      details."*** That is the same shape roadmap 2.13 already fixed one
      screen over. **The tick's words are the specification**, so the sentence
      now names it. **No new permission key**: the vocabulary is deliberately
      closed, and a detailer who can change their prices can change where the
      money goes.

      **AND IT CAUGHT THE MODULE'S HEADER LYING ABOUT ITS OWN CODE.** It said
      *"Zelle never links at all"*; the pasted-URL branch runs before the
      per-service lookup, so a pasted `https:` URL in the Zelle field does
      link. **The behaviour is right and the comment was wrong** — the real
      rule is that we link exactly two things, a username on a service whose
      URL shape we know and a URL the detailer pasted themselves. Both halves
      are pinned by tests now, because *a check that cannot reach a case reads
      exactly like a check that passes* and the Zelle case was only ever
      tested with a phone number.

      **A REJECTED SEND IS VISIBLE NOW — ROUND 3 §6's OTHER HALF, BUILT THE
      SAME SESSION.** It went on the CUSTOMER rather than into a log, and the
      reasoning is the part worth keeping: a rejected send is almost always a
      bad email address, and a bad email address is a fact about the customer,
      not about the mail system. **A "failed emails" screen is the obvious
      build and is worse** — a place you have to remember to visit, about a
      problem you only ever care about one person at a time.

      - `customers` gains `email_failed_at` and `email_failed_reason`
        (`20260904007000_email_failures.sql`, applied). **Deliberately the same
        shape as roadmap 2.19's `unsubscribed_at`**, with one asymmetry that is
        the whole design: **an opt-out is permanent until a human undoes it; a
        bounce clears itself on the next successful send.** A detailer who
        fixes a typo must not be told forever that the address they just
        corrected is broken, or the flag becomes something to ignore.
      - `send-email/index.ts` stamps **on a 4xx only** and clears on success,
        best-effort and swallowing its own errors like every other line in
        that file. **A 5xx is the provider having a bad day rather than this
        address being wrong**, and stamping it would put "this address
        bounced" on every customer emailed during a Resend outage — false, and
        the fastest way to teach a detailer to ignore the flag — **bookkeeping about an email must never be the
        reason a send is reported as failed.** An owner alert matches no
        customer row, which is correct.
      - **Drawn once, under the address, on the client sheet** — the only
        place in the product that prints a customer's email — naming what to
        do instead, because the phone number is the button directly above it.
      - **AND THE THREE PLACES THAT ALREADY ASK "can we email this person" NOW
        ASK IT CORRECTLY**: the Clients list's count, the compose sheet's, and
        `send-campaign`'s own filter, which is the enforcement rather than the
        courtesy. Re-mailing an address the provider has already refused spends
        **the platform's shared sending reputation**, which is the exact
        resource the 50-per-press cap exists to protect. **Nobody is quietly
        dropped**: the sheet reports the bounced count beside the no-address
        and opted-out ones, and somebody who is both opted out and bounced is
        counted once.
      - `seed-demo.mjs` seeds one bounced customer (Victor Salas) and
        **`sweep-widths.mjs` opens him as his own state.** The client record is
        opened with `.first()`, so without this the bounce line is drawn on one
        row of a list the walk already visits and would never be measured —
        *the tenth instance of "a state you reach by pressing something INSIDE
        a screen is not navigation", with the twist that this one looks
        covered.* A seed that stops carrying the row prints `NOT MEASURED`
        rather than passing quietly.
      - `tests/payments.test.mjs` § 6 pins the reachability rule itself, so the
        three filters cannot drift apart. Baselined: ignoring the bounce fails
        2.

      **AND IT FOUND A RACE OLDER THAN ITSELF, WHICH IS THE BEST THING THIS
      ITEM PRODUCED.** The bounced client was added to `sweep-widths.mjs` with
      an `else` that prints `NOT MEASURED` rather than skipping silently — and
      on the first `--lite` run that line fired at three of five widths. The
      cause was not the new state: **the whole Clients block opens with
      `settle()` then `count()`**, which is the race CLAUDE.md already records
      for Monthly plans and Team, in the one block nobody re-checked when that
      lesson landed. `?lite=1` makes it worse, because with nothing animating
      the DOM goes quiet sooner. **Every state in that block is guarded by an
      `if (await ...count())`, so six measurements had been vanishing rather
      than failing** — the sorts, the lapsed filter, the compose sheet, the
      client record and the job from its history — while the run printed
      `Clients · the list   clean`. Fixed with one `appear()` on the list.
      **The transferable rule is the `else`, not the fix**: a skipped check
      reads exactly like a passing one, and one `console.log` is the whole
      cure. In CLAUDE.md now.
      **The mechanical footnote:** `appear()` was declared immediately before
      the settings walk, so a `const`'s temporal dead zone put it out of reach
      of the Clients block two hundred lines earlier — the helper written to
      fix this race could not have been called at the site that still had it.

      **WHAT IS STILL NOT DONE HERE:** nothing writes the bounce into the JOB
      record, because the job record does not print the customer's email at
      all. If it ever does, the line belongs there too.

      **THE QUOTA HALF NEEDED NOTHING** — Resend already emails at 80% and 100%
      of the limit on every plan.

      ~~**STILL NOT BUILT, AND IT IS THE OTHER HALF OF ROUND 3 §6: MAKING A
      REJECTED SEND VISIBLE.**~~ **BUILT — see above. Kept because the
      reasoning for the shape is in it.** `send-email/index.ts` answers a Resend
      rejection with `console.error` inside an edge function, and a booking
      never fails because an email did — so a bad address, a suppression or a
      domain problem shows up on no screen in this product. **The storage is
      trivial and WHERE A DETAILER SEES IT is the whole decision**: a row on
      Today, a badge in the gear, or its own screen, and each of those is a
      design question with five screenshot widths behind it. Left rather than
      half-built. **The QUOTA half genuinely needs nothing** — Resend already
      emails at 80% and 100% on every plan.

      **THE RECOMMENDATION, SO THE NEXT SESSION IS NOT MAKING IT COLD: PUT IT
      ON THE CUSTOMER, NOT IN A LOG.** A rejected send is almost always a bad
      email address, and a bad email address is a fact about the CUSTOMER, not
      about the mail system. So: store the last failure and its reason against
      the customer row, and draw it wherever the product already prints that
      customer's address — the job record and the client sheet. **Nothing new
      to check daily, no inbox to build, and it appears at the moment the
      detailer is about to rely on the address.** A "failed emails" screen is
      the obvious build and is worse: it is a place you have to remember to
      visit, about a problem you only care about per-person.

      **The one mechanical detail that decides the shape:** `send-email` is
      handed `business_id` and `to`, and nothing else — no booking, no customer
      — so it matches `customers` on those two. That is enough for every send
      to a customer, and an owner alert simply matches nothing, which is
      correct. **~40 lines, one migration, no new screen.** It needs the
      owner's yes on where it appears, and nothing else.

      **AND NOTHING TELLS A DETAILER THEIR HANDLE DID NOT BECOME A LINK.** The
      rule is stated once on the screen and nothing checks their typing. A hint
      needs `payments.ts`, which lives in `supabase/` and cannot be imported
      from `app/` — so the honest options are a preview that costs a second
      implementation of the linking rule, or an edge function that answers it.
      **Neither is worth building until a real detailer has typed one in.**

      **COSTS, ON HIS OWN NUMBERS.** Stripe takes **$1.66 of a $40 charge**
      (2.9% + 30¢ + Billing's 0.5%) and **$14.77 of the $499**. No monthly fee.
      A merchant of record (Paddle, Lemon Squeezy) is 5% + 50¢ — **$2.50 on
      $40** — and what the extra buys is US sales-tax filing, which he does not
      need yet: economic nexus is typically $100k or 200 transactions **per
      state**, so at $40/month another state needs ~208 detailers before it is
      in play. **What he does owe is his OWN state, and that is a question for
      his accountant** (the $499 setup fee may be taxable where the subscription
      is not).

      **THE COST HE IS ACTUALLY TAKING ON IS SUPPORT, NOT CODE.** Today nobody
      can be wrongly charged because nobody is charged. From stage 2 onward, a
      double charge or a charge after cancelling is an email that becomes a
      chargeback if it is not answered in a day.

      **AND FREE STOPS BEING FREE AT THE SAME MOMENT.** Supabase's free plan has
      **no backups at all**, 500 MB, and pauses after 7 days without requests —
      **Pro is $25/month** and is the only responsible plan for a database
      holding other people's customers. Resend's free plan is **3,000 emails a
      month, 100 A DAY, and ONE domain** — the one-domain limit is already the
      blocker on 2.18's open "separate Resend account for the platform" thread,
      and at ~5 emails a booking the daily cap is ~20 bookings across all
      tenants. **~$45/month of fixed cost, covered by the second detailer.**

      **Skills: `impeccable` for the checkout and past-due screens.** The
      integration itself is not visual. **`security-review` is not optional on
      any stage that touches a key or a webhook.**

      **HE ANSWERED THE SAME DAY AND TOLD US TWO THINGS NOBODY HAD ASKED: HE IS
      UNDER 18 AND HE IS IN CALIFORNIA.** Both were checked against primary
      sources; **neither is a blocker** and both change something. Round 2 of
      `docs/payments-research-2026-09-04.md` carries the working.

      - **STRIPE SAYS YES, WITH A PARENT ON THE ACCOUNT.** Stripe's own support
        pages: **Standard accounts are 13+**, and under 18 *"a legal guardian
        must assume the role of owner of your account before your account can
        accept charges and funds can be transferred to your bank account"*
        (guardian's name, DOB, last four of SSN, address, consent). **Nothing in
        the build waits on this; LAUNCH does.** **And it does not touch stage
        3** — Express and Custom Connect require 18, **Standard does not**, and
        the detailers are adults with their own accounts. The round-1 design
        survives his age unchanged.
      - **CALIFORNIA TAXES SaaS FROM 1 JANUARY 2027 — NOT TODAY.** **SB 122,
        signed 2026-06-29.** He is a California business selling to California
        customers, so he has nexus from his first sale; from that date the $40
        is taxable and he registers with CDTFA, collects and files. **Custom
        software stays exempt**, which may matter for Phase 3's bespoke sites.
        **That is ~4 months out.** Stripe Tax calculates at **0.5%/transaction**
        but **filing is via outside partners** — a merchant of record (5% + 50¢,
        so **84¢/month more per detailer**) makes the obligation belong to
        someone else entirely. **Start on Stripe; put a decision in the calendar
        for November 2026**, because switching after a hundred subscribers means
        every one of them re-enters a card.
      - **HIS LOCK-IN IDEA COLLIDES WITH CALIFORNIA'S CLICK-TO-CANCEL LAW.** He
        proposed a twelve-month commitment paid monthly with an early-cancellation
        fee, and leaving via *"if they contact me, I could figure out the best
        way"*. **AB 2863 (in force 1 July 2025)** requires clear disclosure of
        auto-renewal **before** billing details are taken, **express affirmative
        consent**, and **cancellation in the same medium the customer signed up
        in.** A term and a fee are legal; **routing the exit through him is
        not — a cancel button has to exist.** And §6700: a minor may contract
        **subject to the power of disaffirmance**, and *adults contract with a
        minor at their own risk* — **an early-termination fee is the single
        hardest term for him specifically to collect.**
        **THE VERSION THAT GETS THE SAME YEAR WITH NOTHING TO ENFORCE: DISCOUNT
        THE ANNUAL PREPAY.** *"Pay for the year, get two months free"* is the
        plans research's own strongest finding — **money already taken binds
        structurally** — applied to his own pricing. No fee to chase, no ARL
        friction, better cash. **Recommended over the lock-in.**
      - **HE RULED ON NON-PAYMENT, OVER THE RECOMMENDATION:** *"if they just
        stop paying, then yes, their site will go down."* **Recorded as his
        call.** One consequence to know rather than argue: their customers'
        bookings already exist and those customers lose the page they cancel and
        reschedule from, so the phone calls land on a detailer already having a
        bad week. **A grace period before the PUBLIC page goes dark costs
        nothing to build.**
      - **STAGE 1 GOT SHARPER, AND IT WAS HIS OWN QUESTION THAT DID IT.** He
        asked whether he was *"thinking of invoices the wrong way"* because his
        old site's invoice listed payment methods after the customer had already
        paid. **He is right that it is wrong, and 2.18 already fixed it here:**
        `invoiceEmail` branches on `payment_status` — paid gives *Receipt / Paid
        in full*, unpaid gives *Invoice / Amount due*. **So the payment handles
        go on the UNPAID branch only**; printing them on a receipt would rebuild
        the exact thing he finds weird about his own site.
      - **THE EMAIL CEILING MOVED.** He corrected the one-domain finding — he has
        two domains, uses only his own, and sends all tenant mail himself — so
        **the constraint is Resend's 100 EMAILS A DAY** (~20 bookings across all
        tenants at ~5 emails each), and a rejected send is invisible.

      **ROUND 3 — HE ASKED "SHOULD I JUST START WITH PADDLE?" AND THE ANSWER IS
      NO, FOR A REASON NOBODY HAD CHECKED (2026-09-04).**

      - **NEITHER PADDLE NOR LEMON SQUEEZY DOES MARKETPLACE PAYOUTS.** They are
        merchant of record for *your own* sales; splitting a payment to a third
        party is the thing Connect exists for. **So money-through is Stripe
        either way, and the real question is "Paddle AND Stripe, or just
        Stripe"** — two dashboards, two webhook sets and two failure modes for a
        business whose support desk is one person.
      - **AND PADDLE MAY NOT ACCEPT THE $499 AT ALL.** Their Acceptable Use
        Policy prohibits *"human services that are not related to a software
        offering"*, and the setup fee is **building somebody a website by
        hand**. Whether that reads as related to the SaaS is **their call, not
        ours**, and being told after launch that the up-front product cannot be
        sold is worse than a tax return. **Ask them in writing before building.**
      - **THE TAX BENEFIT IS SMALL BECAUSE HE SELLS IN ONE STATE.** A merchant of
        record earns its extra 2 points across forty states; **a California
        business selling to California detailers has one registration and one
        filing schedule.** 84¢/detailer/month forever, plus a second payment
        system, to avoid that is the wrong trade.
      - **SO: STRIPE, AND REGISTER WITH CDTFA WHEN THE LAW STARTS.** This
        sharpens round 2's "decide by November" rather than reversing it —
        **the condition that would change it is selling meaningfully outside
        California**, not a date.
      - **THE EARLY-EXIT FEE IS BACK ON, AND THE ADOBE COMPLAINT IS THE
        CHECKLIST.** He proposed Adobe's exact model — annual term, billed
        monthly, cancel early and pay half the remainder — and **the FTC sued
        Adobe over it in June 2024 for the PRESENTATION, not the fee**:
        pre-selecting the plan, burying the commitment in fine print and hover
        icons, and obstructing cancellation. **So it ships with: neither plan
        pre-selected, the term and fee in the plan's plain text at the price's
        own size, a separate explicit tick, and a cancel button that stays one
        click** (the fee is charged then, to the card on file).
        **HIS COUNTER-ARGUMENT WAS ACCEPTED:** with a card on file the fee
        collects itself, so refusal is not the risk — **a CHARGEBACK is**, and
        the defence is that same disclosure. **Build month-to-month AND
        annual-paid-monthly, and keep the discounted prepay as a third option.**
      - **REFUNDS — HE ASKED.** Setup fee **non-refundable once work begins**,
        said before purchase; the current month is not refunded, cancelling
        stops the next charge; **and the setup fee and the exit fee are two
        separate arguments** — *"they already paid for the website"* justifies
        the first and not the second. A policy is a floor, not a cage.
      - **HIS TRADE OBSERVATION MOVED THE HANDLES.** *"They don't leave a
        client's house until it's paid"* — so the UNPAID invoice is rare and
        round 2 was aiming at a page almost nobody sees. **His old site already
        had it right**: `reference/.../create-booking/index.ts:776` prints
        *"Payments accepted…"* in the **CONFIRMATION** email. **Stage 1 is the
        confirmation and the reminder, plus the unpaid invoice. Never the
        receipt.**
      - **AND BUILD ONE SMALL THING BESIDE IT: MAKE A REJECTED SEND VISIBLE.**
        The Resend cap is not the risk, **the silence is** — a booking never
        fails because an email did, so nothing on any screen shows it. He is
        staying on the free plan for now, which is fine, and that makes this
        worth more, not less.
        **HALF OF THIS ALREADY EXISTS (2026-09-04):** he asked whether Resend
        can warn him about the quota, and **it already emails at 80% and 100% of
        the limit, on every plan** — so the QUOTA half needs no work at all.
        **What is left is narrower and still worth it: a send rejected for any
        OTHER reason** — a bad address, a suppression, a domain problem — which
        no quota alert covers and which nothing in this product surfaces.

      **HE TURNS 18 ON 2 DECEMBER 2026, AND THAT COLLAPSES THE WHOLE STRUCTURE
      QUESTION (told 2026-09-04).** Three months out, so: **no LLC, no dad on
      the Stripe account, no guardian, no handover, and the support question the
      setup file used to open with is MOOT.** He opens Stripe, the EIN, the bank
      account and the Lakewood licence himself in the first week of December.
      **The build is unaffected — Stripe TEST MODE needs no activated account**,
      so the whole payments integration can be written and tested before then
      and activated the week of the 2nd. **`docs/setup-steps-2026-09-04.md` is
      rewritten around that date.**
      **THE CONSEQUENCE FOR THIS ITEM: stage 2 cannot go live before 2 December
      whatever happens**, so there is no reason to rush it and every reason to
      build it properly. **`docs/timeline-2026-09-04.md` has the full estimate:
      the software lands between late September and late November on three
      honest paces, and the FIRST SALES CALL IS THE WEEK OF 8 DECEMBER — set by
      his birthday, not by the code.**

      **AND TWO SETUP ANSWERS LANDED 2026-09-04, both from primary sources.**
      **STRIPE TAX GOES ON FROM DAY ONE** — he asked *"there's no point in not
      having it on"* and he is right: Stripe's own pricing page says *"you only
      incur fees for transactions in jurisdictions where you have an active tax
      registration"*, **so with no registrations it costs nothing**, there is no
      monthly minimum, and switching it on early removes a thing to remember.
      **AND HIS "SET IT UP RIGHT SO I DON'T NEED AN LLC" IDEA IS MOSTLY
      CORRECT** — the IRS sets **no minimum age for an EIN** (a parent is named
      "responsible party", a role that can later be changed by form rather than
      by getting a new EIN), there is no age rule for being a sole proprietor,
      and only three things genuinely need an adult: the **Lakewood licence**,
      the **bank account** and **Stripe**. **The whole question therefore
      reduces to one Stripe support ticket** — whether the account's legal
      entity is HIM with a guardian attached (18 removes the guardian, free) or
      his DAD (18 means a new account and every subscriber re-entering a card).
      **Nobody should guess it and nobody has to; the exact wording to send is
      in `docs/setup-steps-2026-09-04.md` step 4, and it must be asked BEFORE
      the account is opened.**

      **STILL NEEDS HIM: his dad on the Stripe account** — settled in principle,
      *"my dad signed up and I'll manage it"*, and **whoever owns that account is
      the business for chargebacks, refunds and tax**, so he should know what he
      is signing. **The lock-in question is answered (build both).** **The
      merchant-of-record question is answered (Stripe).**

      **ROUND 4 — HE IS SELLING NATIONWIDE, WHICH BREAKS ROUND 3'S REASONING
      (2026-09-04).** *"I'm primarily gonna be selling anywhere in America…
      if I sell in California, that could potentially be my competition."*
      **Round 3's "he sells in one state, so tax is simple" was the load-bearing
      assumption under the Stripe recommendation and it is now wrong.** Marked
      rather than quietly rewritten.

      - **THE THRESHOLD THAT BITES IS TRANSACTIONS, NOT REVENUE.** $100k into one
        state is ~208 subscribers at $40; **200 transactions is ~17
        subscribers**, because each monthly charge is a separate sale. **But
        17+ states have now dropped the transaction test entirely** (Alaska,
        Utah, Illinois, Kentucky among them) and **~14–20 still apply it**, and
        **SaaS is taxable in only ~26 states.** **So the exposure is about
        CONCENTRATION, not reach**: a hundred customers spread two per state is
        nowhere near anything; forty in Texas is a registration.
      - **CALIFORNIA, NOW THAT HE IS AVOIDING IT:** he has physical-presence
        nexus, but **nexus only matters where there is a sale** — no California
        customers means no California sales tax to collect even after SB 122.
        *"Northern California is fine"* means some, and those are taxable from
        1 Jan 2027. **California INCOME tax on the business is owed regardless**
        and is a different thing; do not conflate them.
      - **THE RECOMMENDATION SURVIVES FOR THE NON-TAX REASONS** — no merchant of
        record can pay the detailers, and Paddle may refuse the $499 — **but the
        tax problem is now worth instrumenting.** **Turn on Stripe Tax at the
        first out-of-state sale** (0.5%, ~20¢ on $40): it calculates everywhere
        and, the part that matters, **monitors nexus per state and warns before
        a threshold is crossed**, turning an invisible creeping exposure into an
        alert. **Filing is still not solved** — Stripe hands it to partners.
      - ~~**THE MERCHANT-OF-RECORD QUESTION IS RE-OPENED WITH A CONCRETE
        TRIGGER**~~ **CLOSED BY HIM 2026-09-04: *"Why do you keep mentioning
        Paddle? Aren't we just sure on Stripe?"* — YES. THE ANSWER IS STRIPE AND
        THE QUESTION IS SHUT.** He is right to push back: it was answered in
        round 3 and then re-opened twice with "triggers", which reads as
        indecision and made him re-read the same argument three times. **A
        session that finds a reason to reconsider writes it here and keeps
        working; it does not put the choice back in front of him.** The two
        reasons that decided it are structural and will not change: **no
        merchant of record can pay the detailers**, and **Paddle's acceptable-use
        policy may refuse the $499 hand-built website.**

      **PRICING AND THE LEGAL SETUP EACH GOT THEIR OWN FILE ON 2026-09-04, at
      his request** (*"can we actually spend some time to think about
      pricing"*, *"how do I make everything legal and sound"*):
      **`docs/pricing-2026-09-04.md`** and **`docs/legal-and-tax-2026-09-04.md`**.
      The headlines a cold session needs:
      **he is charging too LITTLE, not too much** — a custom site alone is
      $500–$5,000 from a freelancer and $10k+ from an agency, Housecall Pro is
      $59/month for software with no website, and ongoing site upkeep alone
      benchmarks at $50–$200/month;
      **$600/year is already exactly "2 months free" (16.7%), which is the
      industry-standard discount** — change the WORDS, not the number, because
      months-free converts better than a dollar figure;
      **three founding spots, kept** (one is an anecdote, three is a portfolio,
      and three at $40 covers the ~$45/month of fixed costs);
      **and he can avoid sales tax almost entirely by choosing who to cold-call**
      — SaaS is untaxed in ~25 states, so a calling list of Florida, Georgia,
      North Carolina, Michigan, Missouri, Virginia, New Jersey and Nevada means
      **nothing to calculate, register or file anywhere.** **California is the
      one state that creates an obligation immediately** (he lives there, and SB
      122 lands 1 Jan 2027), which agrees with his own reason for skipping it.
      **Do not turn away a good customer over tax** — it is collected FROM the
      customer and costs him only paperwork.
      **Business setup: sole proprietorship, NOT a California LLC yet** — $70 to
      file and then **$800 every year regardless of revenue, with no first-year
      exemption since 2024**, against ~$1,440 of founding-year revenue. **The
      LLC question belongs to his dad**, who already carries the liability by
      owning the payment account.

      **STAGE 2 STARTS WITH A PRICING PAGE, NOT A CHECKOUT — his ask,
      2026-09-04.** *"When you say take founding spot, that shouldn't bring you
      to a sign up or a payment screen. That should take you to a pricing page…
      it shows basically all my options and all the different things, and they
      click the one that they want."*

      **A real route** — the landing page's plan buttons currently go straight to
      `/app?plan=website&offer=founding`, which is a signup form, and a customer
      who has not yet chosen between three ways to pay is not ready for one.
      **It carries every option in one place**: the two plans, the three ways to
      pay, the founding price while spots remain, and what each one includes.
      **AND IT IS WHERE THE DISCLOSURES LIVE.** California's AB 2863 requires the
      auto-renewal terms, the twelve-month commitment and the early-exit fee to
      be clear and conspicuous **BEFORE billing details are taken** — so this
      page is not decoration in front of the checkout, **it is the legally
      load-bearing half of it.** Neither plan pre-selected (the Adobe complaint's
      first item), and an explicit tick before payment.

      **HE ALSO SAID THE LANDING PAGE'S ANNUAL LINE BECOMES REDUNDANT** once this
      exists — *"you don't even need to say six hundred a year paid once, because
      that'll be shown inside the pricing page."* **Correct, and the order
      matters: the line stays until the page ships**, or the only place that
      mentions the annual option disappears before its replacement exists.

      **Skills: `impeccable`** — it is a new customer-facing screen and the
      swept widths apply.

      **THE PRICING PAGE SHIPPED 2026-09-05. The CHECKOUT and the detailer's
      billing page did NOT — stage 2 is half done.** Built:

      - **`/pricing`** (`app/src/landing/PricingPage.jsx`, a route in
        `main.jsx`, public and outside `BusinessProvider`). Four skeletons,
        none of them the landing page's asymmetric pair: a head with the offer
        as a full-width strip, a split plan head over a **ruled ladder of
        three rungs**, a horizontal bar for booking-only, and a two-column
        definition list for the terms.
      - **THE LADDER'S SHAPE IS A LEGAL DECISION, not a visual one.** Three
        cards side by side is a named anti-slop tell AND it is the layout that
        invites a highlighted middle — which is a pre-selection in everything
        but name. **There is no selection state on the page at all**: every
        option is its own button, so there is nothing that could be defaulted.
        No "most popular" either, which would be a pre-selection in disguise
        and a claim we cannot substantiate with no customers.
      - **THE HEADLINE FIGURE ON EACH RUNG IS WHAT LEAVES THE BANK** —
        $600 a year / $60 a month / $75 a month — never an "effective
        monthly". Printing *$50/mo* on a plan that takes $600 in one go is the
        small dishonesty this page is a correction to. The saving is stated in
        MONTHS FREE, which is the locked framing and is the only one that
        works for both columns: $400/$40 is 2 months free exactly as
        $600/$60 is, where an effective monthly would have been $33.33.
      - **`pricing.js` gains `monthToMonth: 75`, `founding.annual: 400`,
        `founding.monthToMonth: 50` and `term: { months: 12, exitFeeShare:
        0.5 }`.** The founding ladder follows the LIST ladder's own two rules
        rather than being a second set of opinions — 2 months free, +25% for
        no commitment — so both are derived. **The term and the fee are in
        the config, not in the copy**, because the checkout will CHARGE what
        this page PRINTS and two files reading one number is the only way
        those can never disagree.
      - **The eight AB 2863 disclosures**, at reading size (16px on
        `--bone-2`, not the 13px `--fog-2` fine-print ramp) and in the terms
        list rather than scattered: auto-renewal and its frequency, what will
        be charged, which plan is a commitment, the exit fee **with a worked
        example**, that cancelling is one button, that the build fee is
        separate and stops being refundable when work starts, what a failed
        payment costs, and what leaving takes with you.
      - **THE PAGE NOW PROMISES DUNNING BEHAVIOUR THE CHECKOUT MUST HONOUR** —
        *"we try the card again over the following two weeks and email you
        each time. If it still has not gone through after that, the site goes
        offline until it is paid. Nothing is deleted."* That is round 3's
        3–4 retries over 10–14 days plus his own ruling on non-payment, and
        **it is now a printed promise rather than a plan.** The checkout that
        lands next is bound by it.
      - **Every plan button on the landing page points at `/pricing`** — the
        nav pill, the hero, both plan cards and both closing calls. Only
        *Sign in* still goes to `/app`. **The annual line went with it**, which
        was the ordering he called out, and its "2 months free" checks moved
        to the new page rather than being dropped.
      - **`sweep-widths.mjs` walks it at all five widths, added in the change
        that built it.** Clean at 1920 / 1440 / 392 / 360 / 320, normal and
        `--lite`, zero console errors at any size.
      - **`tests/landing-pricing.test.mjs` is 58 checks** (was 21), and
        **thirteen of them were baselined by breaking what they guard.**

      **FOUR DEFECTS CAME OUT OF BUILDING IT AND THREE WERE INVISIBLE TO
      EVERY EXISTING CHECK.**

      1. **`tests/landing-pricing.test.mjs`'s own pricing-section slice was
         EMPTY, and had been since it was written.** It looked for
         `aria-labelledby="price"`; the section is `aria-labelledby="prh"`, so
         `indexOf` returned −1 and `slice(-1, <smaller>)` gave the empty
         string. **"No hardcoded prices in the pricing section" passed by
         having no subjects for the whole life of the check** — in the one
         test guarding the numbers a customer is charged. Same shape as
         `email-brand` 7a-ii in 2.18. Anchored on the section's own `id` now,
         with a HAS-SUBJECTS assertion above it.
      2. **A `data-rv` on a conditionally-rendered node is invisible for
         ever.** `thread.js` collects its revealables with ONE
         `querySelectorAll` at mount and that list is STATIC, so the founding
         strip — which React adds only when the offer lookup answers — was
         never given `.in` and sat at opacity 0. **The element carrying the
         whole scarcity claim was invisible in the normal path.**
         **Nothing in this repo could see it**: `?lite=1` reveals everything
         so the lite path looked right, an opacity-0 element still has a full
         box so the width sweep measured it and printed `clean`, and no
         contrast test can measure a colour nobody is shown. The landing page
         has never had this bug **by luck, not by rule** — its founding flag
         sits inside an unconditional `.plan` that carries the `data-rv` — so
         the rule is now a check (8e), against both pages.
      3. **The founding strip lost the settle-then-count race at the first
         width of the very first full run**, and it was caught only because
         its `if` had an `else` that printed `NOT MEASURED`. Fixed with
         `appear()` — **and `appear()` had to be hoisted to module scope to be
         callable at all.** It was declared inside the width loop above the
         settings walk, so a `const`'s temporal dead zone put it out of reach
         of every earlier caller. **That is the SECOND time the helper written
         to fix this race has been unreachable at a site that still had it**
         (the Clients block was the first, 2026-09-04). It is at module scope
         now and cannot happen a third time.
      4. **`sweep-widths.mjs` reported three false positives on the ground.**
         The pricing page is the FIRST page carrying the landing surface's
         `.ground` that this script has ever walked, and its two drifting
         lights (76vmax) and dot lattice (inset −8%) each measured ~150px past
         the right edge at 320 — inside a `position: fixed` layer with
         `overflow: hidden` over them. `past-viewport` now skips anything an
         ancestor already clips. **This cannot hide a real defect**: a defect
         is content sticking out where it can be SEEN, and clipped is the
         definition of cannot be. It can and did stop the check crying wolf on
         every run, which is how a check stops being read.

      **AND THE LANDING PAGE JOINED THE SWEEP TOO — the gap this item found
      and then closed.** Until 2026-09-05 no script in this repo had ever
      measured the page a visitor meets FIRST: this sweep walks the dashboard
      and the booking page, and `/` is neither. It was left out of the first
      draft on the reasoning that a pre-existing gap belongs to an item that
      can act on what it reports — then it was simply MEASURED, came back
      **clean at all five widths**, and adding it became one line that changes
      no verdict today and catches the next change to that page. **Measuring
      before deciding cost two minutes and turned a documented gap into a
      closed one.**

      ~~**STILL OPEN ON STAGE 2, and none of it needs a Stripe key:**~~
      **BUILT 2026-09-05 — STAGE 2 IS COMPLETE IN CODE AND CANNOT BE SWITCHED
      ON UNTIL HE OPENS A STRIPE ACCOUNT.** The four bullets below are kept
      because the reasoning in them is what the build followed; what each one
      became is under it.
      - **The checkout itself**, and the express affirmative tick with it.
        **The tick is deliberately NOT on the pricing page**: consent has to be
        captured and STORED with the subscription at the moment of purchase,
        and consent collected on a marketing page and then carried through a
        signup flow is consent that can be lost. The disclosure is what AB
        2863 requires *before* billing details; the tick belongs where the
        card is.
      - **The detailer's own billing page** behind the header gear,
        `owner`-only — plan, price, next charge, card, invoices and the cancel
        button the statute requires.
      - **The dunning behaviour the page now promises** (above).
      - `/pricing` carries `?term=annual-upfront|annual-monthly|monthly`
        through to `/app`, where **nothing reads it yet**. The checkout is what
        reads it.

      **WHAT SHIPPED, 2026-09-05:**

      - **`20260905000000_platform_billing.sql`** — three tables, applied.
        `platform_subscriptions` (one row per business, `business_id` IS the
        primary key), `platform_invoices` (Stripe's own invoices, mirrored),
        `stripe_events` (webhook idempotency). **Select-only policies,
        owner-only, no write policy on any of the three**: a row here says
        money moved and the only writer is the service role, because the
        authority for every value is Stripe's event stream. A client that
        could write `status = 'active'` could give itself a free subscription
        with one PATCH.
      - **EVERY PRICE IS SNAPSHOTTED ON THE ROW AND NEVER RE-READ.**
        `pricing.js` is what the page PRINTS today and it will change — the
        founding ladder ends, the list price moves — while a subscriber's price
        is fixed at the moment they agreed to it. The exit fee is the sharp
        case: recomputing it from a later config is how a $240 fee becomes
        $360.
      - **`consented_at` + `consent_text`, and it stores THE WORDS, not a
        boolean.** A `true` proves somebody ticked something; the sentence they
        ticked is what answers a chargeback, which is the entire reason the fee
        is defensible (the FTC sued Adobe over the PRESENTATION of an identical
        fee). **The sentence is GENERATED from the snapshot** by
        `consentSentence()` — the screen prints it and the server stores it,
        the same function over the same values, so a client cannot post a
        friendlier sentence than the one it showed.
      - **`_shared/platformBilling.ts`** — the arithmetic, dependency-free and
        pure: the price table, `planFor`, `lineItemsFor`, `consentSentence`,
        `exitFeeCents`, the Stripe-status mapping and the dunning words. **It
        is the SECOND copy of the price table** (a Deno bundle will not follow
        an import out of `supabase/`, the same wall that forced
        `_shared/brandColor.js`), so it is pinned value by value against
        `pricing.js` — CLAUDE.md allows one copy and charges a test for it.
      - **`_shared/stripe.ts`** — ~100 lines instead of the Stripe SDK: form
        encoding, one `fetch`, and the webhook signature. **No new dependency**,
        and the API version is pinned rather than floating.
      - **INLINE `price_data`, NOT STRIPE PRODUCT IDS.** The obvious build
        stores `price_1Abc…` and the amount then lives in another company's
        admin panel where nothing in this repo can see it. Inline means the
        number on the card comes from this repo, testable end to end — **and
        it is zero Stripe dashboard setup for the owner to get wrong.**
      - **`platform-billing`** (owner-only, four actions plus `summary`) and
        **`stripe-webhook`** (public, `verify_jwt=false`, signature-verified).
      - **THE PORTAL IS PINNED TO ONE FLOW.** Stripe's customer portal will
        happily let somebody cancel from it, which would skip the exit fee and
        skip our own `canceled_at`. `flow_data: payment_method_update` means
        the portal only ever updates the card; **the cancel button stays ours
        and stays one press behind one confirm**, which is the fourth item on
        the FTC's Adobe list.
      - **`screens/more/Billing.jsx`** — the FIFTEENTH settings screen, behind
        the gear (a card on file changes nothing a customer meets) and
        `owner`-only rather than permission-gated. Two states: the three rungs
        + breakdown + consent tick when there is no subscription, and plan /
        price / next charge / card / invoices / cancel when there is.
        **The screen does NO arithmetic about money** — every figure and the
        consent sentence come from `summary`, which needs no Stripe key, which
        is why the whole screen could be built and looked at today.
      - **A PAST-DUE BOX ON TODAY, first on the screen.** The research asked
        for *"visible and annoying but not destructive"*. A suspended booking
        page is otherwise invisible from every screen a detailer uses — the
        dashboard keeps working perfectly while nobody can book.
        `.error-box` gained the `.actions` slot `.warn-box` already had, so the
        box that names the problem can also reach the fix.
      - **SUSPENSION IS `businesses.status = 'paused'` AND NOTHING ELSE, which
        was already built.** `businessBySlug` and `get_public_business_profile`
        both filter on `status = 'active'`, so one column darkens the PUBLIC
        booking page — while `businessById` does not, so **an existing
        customer keeps the page they cancel and reschedule from**, and the
        detailer keeps every screen and every row. That is the printed promise
        exactly, and it is roadmap 4.4's suspend mechanism built once.
      - **TWO NEW EMAILS AND THEY ARE THE FIRST THE PLATFORM SENDS IN ITS OWN
        NAME.** `billingEmail` (failed / suspended), `_shared/platformBrand.ts`,
        and `send-email` gained a `sender_name` branch — an email from
        *"Ridgeline Auto Detail"* telling Ridgeline their card failed reads as
        phishing. **Stripe can send failed-payment emails and should, but that
        is a checkbox in another company's dashboard**, and a printed promise
        resting on a setting nobody in this repo can read is resting on
        nothing. Stripe's copy is the belt; ours is the braces — and the
        SUSPENSION half Stripe cannot send at all.
      - **`tests/platform-billing.test.mjs` — 168 checks, credential-free**,
        seven of them baselined by breaking what they guard. **The tie-out is
        the point**: every rung on `/pricing`, founding and list, against the
        money handed to Stripe. This is the first place in the product where
        *a number PRINTED is not a number CHARGED* is literally true rather
        than a metaphor.
      - **`sweep-widths.mjs` walks it, and `seed-demo.mjs` gained
        `--subscription=past_due|active|suspended`.** The two states are two
        different screens and only one exists per seed, so **the other PRINTS
        `NOT MEASURED` naming the exact command that would show it** — the rule
        this item's own first half learned four days ago.

      **WHAT IT FOUND, and three of the five were invisible until something
      was looked at or broken:**

      1. **THE CONSENT SENTENCE RENDERED AS UNREADABLE SMALL CAPS.** It was in
         a `<label className="field">`, and `label.field > span` is the
         uppercase, 0.22em-tracked, muted micro-label every settings field
         uses — so the one sentence on the screen that must be READ, and that
         gets quoted back in a card dispute, was set as an eyebrow.
         `.confirm-box` is the house pattern for exactly this. **No test in
         this repo could have seen it and every geometry check passed**: it was
         the right words at the wrong size.
      2. **A CHOSEN RUNG LOOKED IDENTICAL TO THE TWO NOBODY PICKED.** There is
         no `aria-pressed` styling in `theme.css` — `.nav-row[aria-current]`
         was the only selected-state language — so a detailer arriving from
         `/pricing` with a term already chosen saw the price breakdown as the
         only evidence of their own choice. Same two tokens as the nav row,
         because a second visual language for "selected" is how a design
         system stops being one.
      3. **"NEXT CHARGE" ON A DATE LAST WEEK.** Stripe leaves
         `current_period_end` where it was while it retries, so a past-due
         account read *Next charge — September 2* with September 2 behind it,
         and the cancel confirmation promised *"you keep everything until"* the
         same past date. **The date was right and the word in front of it was
         not.** Only visible by seeding a past-due subscription and looking.
      4. **A CHECK THAT PASSED WITH THE SENTENCE DELETED FROM THE EMAIL.**
         *"Nothing has been deleted"* is the sentence that stops a detailer
         whose page went dark assuming their customer list went with it — and
         the check asserting it tested the HTML, where the hidden PREHEADER
         says it too. Removing it from the body left the check green.
         Re-pointed at the plain-text half, which `htmlToText` strips the
         preheader from. **Found by baselining, not by reading.** Same family
         as `landing-pricing` 1 and `email-brand` 7a-ii, in a fourth place.
      5. **`StripeError` COULD NOT BE IMPORTED BY THE TEST.** It used a
         TypeScript PARAMETER PROPERTY (`constructor(msg, readonly status)`),
         and Node's type STRIPPING only removes annotations — it cannot
         transform one. **The credential-free suite would have been unable to
         pin the signature check that is the only thing standing between a
         public webhook and the open internet.** Anything under `_shared/` that
         a test or `render-emails.mjs` imports must stay strippable, and must
         not touch `Deno` at module scope: `platformBrand.ts` takes `siteUrl`
         as an argument for that second reason, because importing `config.ts`
         would have made every email unrenderable from Node.

      **THE SECURITY REVIEW FOUND ONE EXPLOITABLE DEFECT AND FIVE THINGS WORTH
      FIXING, AND THE EXPLOITABLE ONE WAS IN THE PART THAT LOOKED FINISHED.**
      Everything the review was pointed at first — the webhook signature, the
      owner check, the RLS, the escaping, the key — came back clean and the
      reasoning is in DECISIONS.md. What it found was a ROUTING mistake:

      1. **AN EXIT-FEE INVOICE DROVE THE DUNNING STATE MACHINE, IN BOTH
         DIRECTIONS.** `cancel` raises a ONE-OFF Stripe invoice for the early
         exit, and it carries `metadata.business_id` so the webhook resolved it
         to a business exactly as a renewal. So **paying an exit fee cleared
         the whole dunning state and brought a SUSPENDED booking page back
         online with the subscription still unpaid** — cancel, pay $240, serve
         customers again while owing $600. And in the other direction, worse
         because it needs no attacker: **a manual invoice has no retry
         schedule, so `next_payment_attempt` is null on its FIRST failure**,
         which is the exact signal that means "two weeks are up" — a fully
         paid detailer whose card expired while cancelling had their booking
         page taken offline immediately and got the *"your site is offline"*
         email. Fixed with `isSubscriptionInvoice()`, tested against the
         invoice's own `subscription` field rather than the metadata so it
         covers the next one-off somebody adds. **A one-off is still MIRRORED
         onto the receipts list** — it is a real charge — it simply cannot move
         the account's state.
      2. **THE PORTAL'S LOCK WAS IN STRIPE'S DASHBOARD, NOT IN THIS REPO** —
         and the file's own comment claimed otherwise, which is the same defect
         stage 1's review found in `payments.ts` (*"the behaviour is right and
         the comment was wrong"*), here with the comment right and the code
         short. `flow_data` decides where a customer LANDS; the portal
         CONFIGURATION decides what they can reach around it, and that is
         dashboard state nothing here can read — **the precise failure this
         item had already refused for the dunning emails.** A portal that
         offers cancellation lets somebody leave a twelve-month term without
         the exit fee ever being charged. `cardOnlyConfiguration()` now creates
         that configuration from code with cancel, plan-change and
         customer-edit all off, found again by a metadata tag.
      3. **`?? "active"` ON AN UNKNOWN STRIPE STATUS AT CHECKOUT** — one line
         contradicting the module's own stated rule three files away. It is
         `?? "incomplete"` now: the safe direction costs a detailer a refresh
         and cannot give the product away.
      4. **A LATE `invoice.paid` COULD REVIVE A CANCELLED SUBSCRIPTION.**
         Stripe does not promise event ordering. Guarded on the row's status
         and on the invoice belonging to the LIVE subscription.
      5. **RE-SUBSCRIBING LEFT THE PREVIOUS CYCLE'S COLUMNS ON THE ROW** —
         including `stripe_subscription_id`, which `cancel` and `resume`
         address Stripe by, so in the window before the new
         `checkout.session.completed` landed they would have acted on the
         subscription that had already ended.
      6. **THE EXIT FEE WAS RECORDED AFTER THE CALL THAT COULD THROW**, so a
         failure between the charge and the cancellation left money taken off a
         card with nothing saying what for. Recorded the moment it is taken
         now; the idempotency keys mean a retry reuses the same invoice item
         rather than charging twice.

      All six are pinned by `tests/platform-billing.test.mjs` § 14, **baselined
      by putting two of them back**.
      **AND THE RLS WAS PROVED AGAINST THE LIVE DATABASE RATHER THAN READ OFF
      THE MIGRATION, 2026-09-05.** Signed in as a real owner through the anon
      key: reading every subscription in the table returns `[]` (no
      cross-tenant leak); inserting one is refused **403 `42501`**; and
      `PATCH ... status=active` against another business's row answers
      **200 with zero rows and leaves the row `incomplete`** — which is the
      result worth writing down, because a 200 looks like a success and is
      what "RLS on, no UPDATE policy" actually returns. `stripe_events` reads
      back empty for an authenticated user rather than erroring, which is the
      same shape and is also correct. And a seventh came out of re-opening the
      screen after the redeploy rather than out of the review: **a cold edge
      function took five seconds and the screen drew NOTHING for all of it** —
      it now says *"Checking your subscription…"*, which is the only thing that
      is true yet. It must never say *"you have no subscription"*, which is the
      mistake roadmap 2.14 made on the plans list.

      **THE `impeccable` AUDIT SCORED IT 23/40 AND FOUND NINE THINGS, AND THE
      TWO THAT MATTER MOST WERE RULES THIS REPO ALREADY HAD IN WRITING.** Run
      as two isolated agents — a design review and a mechanical detector pass —
      neither seeing the other. **The detector found nothing** (zero findings,
      zero console errors, consent text at 13.31:1 and the warning box at
      15.32:1 against a 4.5 floor, the selected rung genuinely differing in
      background, the consent checkbox properly tied to its sentence). Every
      finding below came from LOOKING and from MEASURING, which is this repo's
      oldest lesson arriving again.

      1. **ON A PHONE THE TWELVE-MONTH COMMITMENT DID NOT RENDER AT ALL.**
         `.row-item .sub` is `nowrap` with an ellipsis and 208px wide at 392;
         the three rung sentences needed 482 / 413 / 268px, so **57%, 50% and
         22% of each was hidden** — and the half being cut off the middle rung
         was *"You are committing to twelve months."* **The disclosure the whole
         AB 2863 and Adobe reading exists to protect, deleted by a CSS rule at
         the moment of the decision**, reappearing only inside the consent
         sentence, i.e. after the choice. **NOTHING IN THIS REPO COULD SEE IT:**
         clipped text has a perfectly normal box, so the width sweep measured it
         and printed `clean`, and a contrast test measures a colour that IS on
         screen. Only natural-width against rendered-width finds it.
         Fixed with `.clamp2` (already in `theme.css` for this, with
         `Reviews.jsx` as the precedent) **and by cutting the copy**, which is
         finding 2.
      2. **ALL THREE RUNG SENTENCES OPENED BY RESTATING THE LABEL ABOVE THEM.**
         *"One payment, up front"* under **Pay for the year**; *"The same yearly
         price, spread out"* under **Pay monthly, for a year**; and *"No
         commitment at all. Stop any month you like."* under **Month to month**
         at **$75 a month** — two sentences, no new facts. **That is "Mobile —
         we go to them" three times over**, the owner's own copy rule, on a
         screen built after the rule was written. The half that survived the cut
         is the half that was being clipped, which is why one change fixes both.
      3. **NO MONEY IN EITHER `.facts` BLOCK WAS A FIGURE.** Law 8 says every
         figure is JetBrains Mono and *"a price set in the body face is a
         bug"* — and the ladder obeyed it while the breakdown four rows below
         set `$1,059`, `$999` and `$60` in Archivo. One card, two money faces.
         `v strong num` is what `SetupForm` and `Today` already use.
         **The sharpest instance: the early-exit fee** — the single largest
         unexpected number in this product — **was 13px, in `--fog`,
         mid-sentence, directly above a red button.** It is a `.facts` row of
         its own now, with a second row saying why.
      4. **THE $999 BUILD FEE WAS ONE PRESS PAST THE DECISION.** Every rung
         printed *"$60 a month"* while the first charge was **$1,059** — the
         build fee is 94% of it and appeared nowhere on the ladder. That is the
         same dishonesty the ladder's own *"what leaves the bank, never an
         effective monthly"* rule refuses, arriving from the other end. One line
         above the rungs now, read from the server so a founding account sees
         its own figure.
      5. **THE BLOCK THAT OPENS DID NOT ANIMATE, AND SWITCHING RUNGS WAS NOT A
         SWAP.** `document.getAnimations()` 120ms after a rung press reported
         only `ground-drift` — the instrument saying it shipped dead, on the
         rule CLAUDE.md says **binds new work today**. And switching rungs
         replaces every figure and the whole consent sentence inside a frame
         that stays put, which is the owner's third kind of motion word for
         word. `.swap` + a key, the same shape `Money` and `Plans` use; no new
         keyframe and no new duration.
      6. **THE ONLY ROUTE BACK ONLINE WAS A 55x16-PIXEL TEXT LINK.** Measured,
         in the box that tells a detailer their booking page is off. At 392 the
         message wrapped to three lines with the remedy pinned top-right as a
         footnote; at 1440 there were 380px of empty space between the problem
         and its fix, **beside a request card carrying a full-width Accept
         button — so the screen's hierarchy said a booking request outranked the
         business being switched off.** `.warn-box`/`.error-box .actions button`
         now takes `.btn.sm`'s 38px floor and, below 520px, drops full-width
         under the message. **Booking rules' two buttons share that rule and had
         the same defect**, so they are fixed too.
      7. **A DISABLED BUTTON THAT SAID NOTHING.** *"Go to payment"* is inert
         until the tick and nothing said so, which reads as a broken app. The
         label answers for itself now: *"Tick the box to continue"*.
      8. **THE CANCEL CONFIRM WAS SILENT ABOUT THE ONE THING SOMEBODY
         CANCELLING WANTS TO KNOW** — what happens to their work. It covered
         money completely and said nothing about the booking page, the customer
         list, or reversibility, while `/pricing` and both billing emails
         already promise *"nothing is deleted"*. It says it now, at the moment
         the fear is live.
      9. **TWO SMALL ONES ON THE INVOICE LIST**: `href="#"` drew a focusable,
         hover-lit row that navigates nowhere when Stripe supplies neither a
         hosted URL nor a PDF — it is a plain row now; and `inv.status` fell
         through to Stripe's own vocabulary, so a real list could print
         `uncollectible`, `void` or `draft` at a detailer. Mapped, with anything
         unrecognised saying *"Not paid"* — the safe direction, because it sends
         them to look rather than reassuring them wrongly.

      **AND THE AUDIT'S OWN SCREENSHOT CAUGHT A GAP IN THE SCREENSHOT TOOL.**
      `shoot-dashboard.mjs` photographed the words *"Checking your
      subscription…"*: both `settle()` implementations wait for a `.spinner` and
      for animations, and **a screen waiting on an edge function is perfectly
      quiet** — no spinner, no animation, a still DOM. Both now also wait for
      `[data-loading]`, which the billing screen carries and which costs no
      pixels. **Every browser script in this repo gets it**, which matters
      because the next screen backed by an edge function will have the same
      problem and no way to know it.

      **TWO FINDINGS WERE REFUSED, WITH REASONS.**
      **"An unrelated SaaS could ship this screen tomorrow."** True, and it is
      the design system's own instruction: `dashboard-skeletons.md` §3 has the
      settings screens share ONE skeleton on purpose, and the skill-collision
      rule forbids reopening the visual direction. Recorded as the auditor's
      view; **a session that acts on it is redesigning settings, which is a
      question for the owner and not for this item.**
      **"Set the consent as four `.facts` rows above a short tick sentence."**
      Genuinely better to read, and refused because **the words displayed must
      be byte-for-byte the words stored** — that is the whole design, and
      splitting the display from the stored sentence reintroduces exactly the
      drift `consentSentence()` exists to make impossible. **It is a real
      question and it belongs to the owner**: is a 63-word paragraph the version
      a person actually read, and would a structured one be more defensible in a
      dispute or less?

      **AND HE FOUND A TENTH THING BY LOOKING AT THE SCREENSHOTS — 2026-09-05,
      and it was an inconsistency INSIDE `/pricing` rather than a missing
      feature.** *"I saw the monthly payment stuff… it should visually show
      like the discount price vs the regular price for the founder spots."*
      **He is right, and the page was already doing it one section higher:**
      the build fee prints `~~$999~~ $499` with `<s className="was">`, and the
      three rungs underneath it printed the founding figure alone. So the page
      taught a reader what a discount looks like and then stopped — while the
      saving on the rungs was stated in PROSE below the ladder, four numbers a
      reader had to carry back up the page and match by hand.
      **Fixed on both surfaces, because the dashboard's own ladder had the same
      gap**: `/pricing`'s three rungs strike their list figure, and
      `Billing.jsx` does too — its figures come resolved to ONE column from the
      server, so `summary` now returns `list_recurring_cents` and
      `list_setup_cents` beside each quote, computed with the same `planFor` at
      `founding: false`. **The struck number is therefore a real price the
      product charges somebody, never an anchor typed in to make the other one
      look smaller** — the rule `LandingPage.jsx` has carried since 2.2, and
      `landing-pricing` 6b pins it on all four figures plus the guard, so a
      strike cannot survive the founding spots running out.
      **The prose sentence went**, under his own copy rule: every number in it
      is now beside the figure it discounts. What replaced it is the half a
      strike cannot say — that the price is locked for the life of the account.
      **`theme.css` had no struck-price treatment at all** before this, because
      until the billing screen no figure in the dashboard had ever been a
      discount OF anything.

      **AND IT HAS NOW TALKED TO STRIPE — 2026-09-05, the same day, because the
      owner opened a test account and handed over the keys.** Everything below
      was MEASURED against real Stripe with a real test key, not reasoned about.
      **Three of the findings were things no amount of reading could have
      produced, and two of them were bugs.**

      **THE SETUP, and it needed no dashboard visit at all.** The webhook
      endpoint was registered through the API (`POST /v1/webhook_endpoints`,
      six events, `api_version=2024-06-20`), which hands back the signing
      secret — so `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` went straight
      onto the Supabase project as function secrets and never touched a file.
      **No redeploy was needed**: Supabase reads function secrets at runtime, so
      `stripeConfigured()` went from false to true on the already-deployed code.

      **THE HAPPY PATH, END TO END.** A real Checkout session, paid with
      `4242 4242 4242 4242` in a real browser. Stripe's own page printed
      **$539.00 today, then $40.00 per month** — which is `$499` build plus the
      first `$40`, exactly what `/pricing` prints and exactly what the billing
      screen printed. **That is the tie-out closing in the real world**, and it
      is the first time in this product's life that a number PRINTED and a
      number CHARGED have been compared by Stripe rather than by a test.
      Four webhook events arrived and were recorded; the row came back
      `active` with the price snapshotted, the term ending 2027-09-05, the card
      `visa ···· 4242`, the consent sentence stored, and the `$539` invoice
      mirrored onto the receipts list with a working link to Stripe's own copy.

      **THE DUNNING PATH, ON A TEST CLOCK, WHICH IS THE PART THAT TAKES A
      BUSINESS OFFLINE.** A second tenant, a good card swapped for
      `pm_card_chargeCustomerFail`, and the clock advanced two months. It
      behaved exactly as the pricing page promises: the renewal failed →
      `past_due`, **booking page still up** through the retry window → retries
      exhausted → `suspended`, `businesses.status = 'paused'`, **booking page
      offline**, and the detailer emailed at each step.

      **1. STRIPE'S DEFAULT END-OF-DUNNING IS A CANCELLATION, NOT `unpaid` —
      and this file's own mapping deliberately refuses to suspend on a
      cancellation.** The setup notes tell the owner to set "leave the
      subscription unpaid" in the dashboard, and on a fresh account it is not
      that. The run survived it **by event ordering**: the final
      `invoice.payment_failed` (which suspends) landed two seconds AFTER the
      cancellation, so the row ended `suspended`. **The other order gives a row
      that says `canceled` while the booking page is genuinely dark** — and
      `dunningState()` returned `level: "ok"` for `canceled`, so the detailer
      would have met an offline booking page and a billing screen with nothing
      on it. **`suspended_at` outranks the word now.** The page being off is a
      fact about US and that column is where it is recorded.

      **2. `invoice.charge` IS AN ID, NOT AN OBJECT, so the decline reason was
      ALWAYS null.** The code read `asObj(invoice.charge).outcome
      .seller_message` on an unexpanded invoice, which is `{}` — so
      `last_failure_reason` never populated and the email never printed the one
      line a detailer can act on. **It looked completely correct.** One extra
      call on a failure now fetches the charge, and it prefers
      `failure_message` (*"Your card was declined"*, written for a person) over
      `outcome.seller_message`, which is frequently *"The bank did not return
      any further details"* — worse than nothing on a screen. Verified by
      re-attempting the real failed invoice: `"Your card was declined."` is in
      the row.

      **3. THE PINNED API VERSION IS LOAD-BEARING, AND THAT IS NOW MEASURED
      RATHER THAN ASSERTED.** `_shared/stripe.ts` pins `2024-06-20` on the
      reasoning that an unpinned integration breaks on a date nobody chose.
      Fetching the same invoice both ways proved it stronger than that: **at
      `2024-06-20` it carries `charge` and `payment_intent`; at this account's
      newer default it carries NEITHER.** Every reason lookup would find
      nothing, silently. The webhook endpoint is registered at the same version
      on purpose, and the two must move together.

      **4. STRIPE TAX REFUSES THE WHOLE SESSION WITHOUT A HEAD OFFICE ADDRESS,
      in test mode too** — *"You must have a valid head office address to enable
      automatic tax calculation."* The research said Stripe Tax is free until
      there is a registration and should be on from day one, which is true
      about the FEE and silent about this. **It is a dashboard setting, and
      this item has now refused three times to let one be load-bearing** (the
      dunning emails, the portal configuration, this). `checkout` tries with
      automatic tax, and on that specific error retries without it and RETURNS
      the reason. **The fallback cannot under-collect**: a tax registration
      requires a head office address, so the error is reachable only in the
      state where automatic tax would compute zero anyway.
      **What the owner should do, and it is 60 seconds:** set the business
      address at
      https://dashboard.stripe.com/test/settings/tax — it is what turns the
      nexus monitor on, which is the actual reason the research wanted Stripe
      Tax enabled.

      **`tests/platform-billing.test.mjs` § 16 pins all four**, and the suite is
      197 checks.

      **HE ANSWERED THE THREE SETUP QUESTIONS THE LIVE RUN PRODUCED, AND ONE
      OF HIS ANSWERS CREATED A DEAD END WORTH FIXING (2026-09-05).**

      - **No business address until December** — *"I can do all of that unless
        I want to officially set everything up which I can't do yet."* Correct,
        and it costs nothing today: Stripe Tax stays off, the checkout says so,
        and the fallback cannot under-collect. **What is deferred is the NEXUS
        MONITOR**, which is the actual reason the research wanted Stripe Tax on.
      - **The retry end-state stays as Stripe's default** — *"ima have that the
        same for now"* — so a subscription is CANCELLED when the retries run
        out rather than left unpaid. **THAT IS FINE AND IT BROKE SOMETHING:
        there is then no invoice left to settle, so the suspended screen's
        "Update card" fixed nothing and the suspended email's promise that the
        page comes back *"the moment a payment goes through"* could not be
        kept.** A detailer would have updated their card, waited, and phoned.
        **Fixed as a WAY BACK rather than as a warning**: `summary` returns
        `restartable`, the screen shows the plans again with a red line saying
        the last subscription ended and that picking one turns the page back on
        with nothing owed from before, `checkout` allows that restart (it
        answered 409 before, which is a way back that does not work — worse
        than none), and the email says *"Put your page back online"* instead of
        naming a card. **A deliberate cancellation is told apart by columns that
        already existed**: our own cancel button sets `cancel_at_period_end`
        and dunning never does. **If he ever switches to "leave unpaid" none of
        it breaks** — the test is whether a chargeable subscription still
        exists, so the card comes back on its own.
      - **The key was NOT rolled, and this file said it was for a few hours.**
        He first answered *"I did the 3rd thing"* and then corrected it:
        *"just hold on the key for now, I didn't reset it, and cuz it's just a
        sandbox one I'm fine with it being in the chat history."* **That is his
        call to make and it is a reasonable one** — a `sk_test_` key moves no
        real money and the account is not activated. **What it becomes when he
        activates in December is a different key entirely**: the live
        `sk_live_` must never be pasted anywhere, and rolling this test key is
        then worth doing on the same day, because a leaked test key on an
        activated account still reads customer records.

      **AND THEN THE CHECKOUT ITSELF WAS REPLACED — 2026-09-05, his choice
      between Stripe's three shapes.** *"In stripe it gave me 3 options… their
      own hosted link. Then an option to embed it in my website. Then an option
      to just I make / we make the like gui thing — so I chose that one so it
      can look like the rest of the website."*

      **He picked the right one, and the reason is sharper than taste.** The
      hosted page is white, it is titled with the STRIPE ACCOUNT'S name rather
      than the product's, and it arrives at the exact moment a detailer is
      deciding whether to trust us with a card. The screenshot proves the
      naming: the mandate line on the real form reads *"you allow Detailing
      platform sandbox to charge your card"*.

      **WHAT DID NOT CHANGE: the card fields are still an iframe on Stripe's
      own origin.** No card number reaches this product, this server, this repo
      or any log — the PCI position is IDENTICAL to the hosted page. What moved
      is the frame around the fields. The sentence under the button says so,
      and it matters more now than it did when the fields were on another site.

      - **`platform-billing`'s `checkout` action became `subscribe`.** It
        creates a Subscription with `payment_behavior: "default_incomplete"` —
        Stripe makes the subscription without attempting payment and returns a
        client secret — and hands back `{ client_secret, publishable_key,
        amount_cents, return_url }`. The browser confirms it against the
        Payment Element. **The webhook we already had turns `invoice.paid` into
        an active row; nothing new listens.**
      - **`app/src/lib/stripejs.js`** injects `js.stripe.com/v3` once. **No npm
        package, and that is not austerity**: Stripe REQUIRES the script be
        loaded from their origin and forbids bundling a copy, which is how PCI
        scope stays off the server. `@stripe/stripe-js` is a ~2 KB wrapper
        around exactly that injection.
      - **`appearanceFromTokens()` READS THE LIVE PAGE rather than restating
        the palette.** Stripe's Appearance API takes concrete values — it
        cannot resolve `var()` inside an iframe on another origin — so the
        obvious version is a second hand-written copy of the design tokens,
        which is the drift the whole system exists to prevent. Reading the
        computed values off `<html>` at mount time means the form follows
        `theme.css`, follows a token rename, and follows **the tenant's own
        accent**, which `lib/theme.js` writes onto the root at runtime and no
        hardcoded copy could ever know about.

      **THREE THINGS THE SWAP COST THAT NO AMOUNT OF READING WOULD HAVE
      PRODUCED:**

      1. **`items[0][price_data][product_data]` is accepted by Checkout
         Sessions and REJECTED by the Subscriptions API** — *"Did you mean
         product?"*. `productFor()` now finds-or-creates a Stripe Product by
         `metadata.tag === "dp-line"`, the same find-by-tag shape the portal
         configuration already uses. **A Product carries only the NAME on the
         receipt; `unit_amount` is still sent from this repo on every call, so
         the chain from `pricing.js` to the card is unbroken.**
      2. **The build fee moved from a second line item to
         `add_invoice_items`**, which Stripe appends to the subscription's
         first invoice. One charge, one amount, exactly as before.
      3. **THE CARD DETAILS CAME BACK NULL, and the cause is structural.** The
         account screen's *"visa ···· 4242"* was filled from
         `checkout.session.completed` — **and with our own form no such event
         ever fires.** `subscriptionChanged` now reads `default_payment_method`
         and fetches the card itself. **This is the failure mode to expect from
         every hosted-page thing removed later**: the code did not break, an
         event simply stopped arriving, and nothing said so.

      **WHAT IS STILL STRIPE'S, VISIBLY.** The payment-method tabs carry
      Stripe's own promotions — a green **"$5 back"** badge on Bank, Klarna's
      pink mark, Cash App Pay. They are switched on in the Stripe dashboard,
      not in this repo, and they are the loudest off-brand thing left on the
      screen. **Left alone deliberately**: restricting to cards is one setting
      away and costs conversion, which is a decision for real numbers.

      **THE LIMIT OF THE PROOF, STATED PLAINLY.** The browser tool cannot type
      into a cross-origin iframe, so **no session has typed a card number into
      this form**. What IS proven: it mounts, it is styled from the live
      tokens, and it measures clean at 320/360/392/1440/1920; `subscribe`
      returns a real client secret for a real $539 subscription; and **that
      same PaymentIntent, confirmed server-side with `pm_card_visa`, went
      `succeeded` → webhook → row `active`, `$539 paid`, card `visa ···· 4242 ·
      9/2027`.** What is NOT proven is `stripe.confirmPayment` itself —
      Stripe's own function, called with its own elements instance — and 3-D
      Secure, which needs a human at a real browser. **That is the one thing on
      this item waiting for him rather than for a session.**

      **`platform-billing.test.mjs` § 18 covers the form**; the suite is 220
      checks.

      **WHAT IS STILL NOT DONE, AND IT IS NOT CODE:**
      - ~~**THERE IS NO STRIPE ACCOUNT, SO NOTHING HAS EVER TALKED TO STRIPE.**~~
        **CLOSED THE SAME DAY — he opened a test account and handed over the
        keys, and the whole thing was exercised end to end. See the live-run
        section above.** What is left of this bullet is the LIVE half: the
        account is not activated, so no real money can move until he does that
        in December. The test keys and the test webhook are set on the Supabase
        project; swapping them for live ones is the only change.
      - ~~**THERE IS NO STRIPE ACCOUNT.**~~ (original wording kept below because
        the reasoning about test mode is what made the early test possible.)
        Every pure part is tested and both screens are verified in a browser;
        the three calls that leave the building have never been made.
        **Stripe TEST MODE needs no activated account and no guardian** — a
        signup and an `sk_test_` key is ten minutes — so this can be exercised
        end to end long before 2 December. Until then `stripeConfigured()` is
        false, `checkout` answers **503 "Payments are not switched on yet."**
        and the screen says so above the button.
      - **THREE SETUP STEPS ON THE SUPABASE PROJECT AND IN STRIPE**:
        `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the webhook endpoint
        registered in Stripe pointing at `stripe-webhook`. **The retry schedule
        and Stripe's own failed-payment emails are DASHBOARD SETTINGS**, not
        code — `docs/setup-steps-2026-09-04.md` carries the click-by-click.
      - **PLAN SWITCHING DOES NOT EXIST.** A detailer on month-to-month cannot
        move to annual without cancelling and starting again. Deliberate: it is
        proration, a new term start and a new consent, and nobody has asked for
        it.

      **PRICING IS LOCKED AS OF 2026-09-04** — *"Okay. So I like that pricing.
      Lock all that in."* **$999 / $60 / $600 / $35, three founding spots, and
      month-to-month added at $75.** **One piece shipped the same day:** the
      annual line reads **"2 months free"** instead of "$120 less", still
      derived from the config, and `landing-pricing` grew two checks that pin
      the claim — **the saving must be a WHOLE number of months and the discount
      must sit in the 15–20% band the category uses** (baselined by setting
      `annual: 610`, which prints *"1.8333333333333333 months free"*). **The
      rest of the structure lands with 2.20 stage 2's checkout**, because a
      third plan with nothing to click is an option that does nothing.

      **AND THE FOLLOWABLE SETUP PLAN IS `docs/setup-steps-2026-09-04.md`**,
      written at his request (*"go here, click these links, this is what I have
      to do, this is why"*). **Two findings there revise the legal file:**
      **Lakewood's code requires the licence applicant AND the person
      principally in charge to be over 18** — which is exactly what he was told
      when he tried for his detailing business, and it is not different here —
      **and a STRIPE ACCOUNT CANNOT MOVE BETWEEN LEGAL ENTITIES**, so a sole
      proprietorship in his dad's name means **every subscriber re-enters their
      card on his 18th birthday**, while an LLC hands over in one document.
      **That reopens the LLC question on evidence rather than preference**, and
      **step 0 of that file is the question that settles it: how many months
      until he turns 18?** Under six, wait and launch billing in his own name;
      longer, the $800/year is buying a handover rather than only liability
      cover.

      **THE PRICING STRUCTURE HE ASKED FOR — three ways to pay, which maps onto
      what already exists.** Month-to-month (**does not exist today; the most
      expensive, because he carries all the risk**), annual-paid-monthly
      (**today's $40 founding / $60 list**, gaining the term, the tick and the
      fee) and annual-paid-up-front (**`PRICING.annual = 600` is already on the
      page**). **The only new number is month-to-month**: the usual no-commitment
      premium is 20–30%, so **$49 founding / $79 list** applies his own
      ends-in-9 preference to $48–52 / $72–78. **Two cautions:** four choices is
      where a pricing page starts costing conversions, so annual-paid-monthly
      should be the visual middle **and still NOT pre-selected** (the first
      thing the FTC named in the Adobe complaint); and
      `tests/landing-pricing.test.mjs` **reads the values out of `pricing.js`**,
      so a new plan adds its assertions there in the same change.

      **DONE IN THIS SESSION, on his instruction: `PRICING.website.setup` is
      $999**, not $900 — *"things that end in ninety nine feel more professional
      to me."* Verified in a browser at 1440x900: struck through beside $499, no
      overflow, clean console. **`docs/design-directions/5-the-thread.html`
      still shows $900 and that is CORRECT** — it is a snapshot of what he
      approved on 2026-08-30, not a live surface. **Read the price from
      `pricing.js`, never from the reference rendering.** `PRODUCT.md` says so
      now.

      **AND THE DETAILER'S OWN BILLING PAGE IS PART OF STAGE 2** — he answered
      this himself (*"they'll have an account and they can see account details
      and payments"*). Plan, price, next charge, card, invoices **and a cancel
      button — which AB 2863 REQUIRES**, and which is also where the term and
      the exit fee are disclosed. **Behind the header gear, not on Business**
      (the test is in `screens/Business.jsx`'s own header), and **`owner`-only
      rather than a permission tick**, for the reason 2.13 refused a "team"
      permission: whoever can change what the business pays can change
      everything.

- [x] 2.21 ~~**A SMALL SPAM FILTER ON THE BOOKING PAGE**~~ **BUILT
      2026-09-06.** `20260906007000_rate_limits.sql` (a counter per bucket, key
      and fixed window), `_shared/rateLimit.ts`, a honeypot in
      `book/core.js`'s own payload, and the four endpoints this entry named.
      `tests/spam-filter.test.mjs` — 33 checks, four baselined.

      **TWO CHECKS IN TWO PLACES, AND WHERE EACH ONE SITS IS THE WHOLE
      DESIGN.** The blunt ceiling is at the top and counts EVERY call, so a
      flood cannot spend the project's function invocations. **The booking
      limits are at the last moment before the insert**, because the threat
      this item names is holding SLOTS — and only a booking that is actually
      created holds one.
      **Counting refusals looked stricter and was wrong twice over.** A script
      posting rubbish holds nothing and would have been throttled for it; and
      `booking-engine`, which deliberately exercises a dozen REFUSALS, spent
      the whole budget on bookings that were never made and then **reported a
      429 as a broken engine — 32 cascading failures behind one throttle.**
      That is this repo's own recurring shape: a harness reporting a working
      product as broken.

      **A MEMBER IS EXEMPT.** A detailer typing in the bookings they took on
      the phone all morning is the one caller who legitimately looks like a
      script, and they are already verified against `business_users` for THIS
      business.

      **THE HONEYPOT ANSWERS 200 AND WRITES NOTHING.** A refusal a script can
      see is one it can tune against. It is hidden the way a SCREEN READER also
      understands (`hidden`, `aria-hidden`, `tabIndex={-1}`, `autoComplete=
      "off"`) rather than parked off-screen: refusing a real customer's booking
      because they use assistive technology would be far worse than the problem
      it prevents. **It lives in `core.js`'s payload**, so a tenant site that
      builds its own form gets it for free — *a spam filter a bespoke form can
      forget is a spam filter one tenant does not have* — and a site that omits
      the field sends an empty string, which passes.

      **`plan-link`'s THROTTLED ANSWER IS ITS ORDINARY ONE**, not a 429: it
      answers identically either way by design, and a different answer when
      throttled would tell a caller their address was worth throttling.
      **`stripe-webhook` GOT THE CEILING AND NOTHING ELSE**, as this entry
      required — a per-caller rule keyed on anything Stripe controls turns a
      normal burst of events into a payment that is never recorded, which
      presents as a paying detailer's page going dark.

      **THE COUNTER DECIDES BY THE WRITE ITSELF** (`on conflict … returning`),
      because check-then-increment is a race that will be lost on the one
      endpoint somebody is hammering; it **counts refused attempts too**, so a
      loop over the limit stays over it; it cleans up its own old rows per key;
      and it **fails open** — a throttle that refuses real customers when the
      database hiccups has become the outage it was meant to prevent.

      **AND `x-forwarded-for` CANNOT BE SPOOFED HERE — measured, not
      assumed.** A probe sending its own header was counted against the
      machine's REAL address: Supabase's gateway writes it. That is the
      difference between a throttle and a formality.

      **Proven against the deployed functions:** twelve tries from one phone
      gave `200 409 409 409 409 409 409 409 409 409 429 429`; a filled honeypot
      gave 200 with no row written; eight `plan-link` calls were byte-identical;
      `rate_hits` is empty from a browser. **And the three suites that book now
      clear their own counters first** — they book more in two minutes than a
      real customer does in a year, from one address.
 — the OWNER said yes on
      2026-09-04** (*"and yes we should have a small spam filter"*), answering
      gap C below.

      **WHY IT MATTERS MORE THAN IT SOUNDS: since 2.12 a REQUEST HOLDS THE
      SLOT.** `create-booking` is public by design and has **no rate limit, no
      captcha and no honeypot** — grepped, not assumed — so filling a detailer's
      entire week costs a script nothing, and every held slot is a real customer
      turned away.

      **Small means small.** A per-phone and per-IP throttle inside
      `create-booking`, plus a honeypot field the widget leaves empty. **No
      captcha** — it costs the real customer more than it costs the attacker,
      and W16's whole point is that a customer never fights the booking form.
      The 409 path for an overlapping insert already exists and is the model for
      the refusal.

      **Watch out:** `bookings` stores no IP today, so per-IP throttling needs
      somewhere to count — decide between a small table and reusing
      `visitor_id`/`track-visit` before writing anything, and remember the
      exclusion constraint means a refusal must not leave a half-written row.

      **AND `plan-link` NEEDS THE SAME THROTTLE — new 2026-09-04, added by
      roadmap 2.14 step 3 rather than found later.** Its `email` action is
      public, takes an address, and SENDS AN EMAIL — so an unthrottled loop
      against a known customer's address is a mail-bomb sent from the
      detailer's own sending reputation, which is the platform's shared one.
      It cannot leak anything (it answers identically either way, by design),
      so this is a volume problem rather than a disclosure one — but it is the
      same fix in the same place. **The other two actions are keyed on an
      unguessable UUID and need nothing.**

      **AND `unsubscribe` JOINED THE LIST ON 2026-09-05 (roadmap 2.19), with a
      smaller claim on it.** It is public and it WRITES, but it writes one
      boolean fact about one customer and the caller already has to hold that
      customer's UUID — so the worst outcome is somebody who was already sent
      the link using it, which is the link's whole purpose. **It needs no
      per-caller limit; it wants the same blunt per-IP ceiling everything
      public gets**, so that a loop cannot spend the project's function
      invocations. Include it when the ceiling is built; do not design anything
      special for it.

      **AND `stripe-webhook` JOINED THE LIST ON 2026-09-05 (roadmap 2.20 stage
      2), with the SMALLEST claim of the four and one thing that must not be
      done to it.** It is public and it writes, but the Stripe signature is
      checked before any database work and an unsigned POST cannot even consume
      an event id — so a flood costs function invocations and nothing else, the
      same blunt per-IP ceiling as `unsubscribe`. **What must NOT happen is a
      per-caller throttle keyed on anything Stripe controls**: every legitimate
      event comes from Stripe's own address range in bursts, and throttling
      them means a payment that succeeded is never recorded, which presents as
      a paying detailer's booking page going offline. **Exempt it from any
      per-caller rule and give it only the ceiling.**

      **Skills: none — this is engine work. `security-review` before it ships.**

- [ ] 2.22 **BACK THE DATABASE UP FOR FREE — his own idea, 2026-09-04, and it
      works.**

      > *"Supabase's free plan — like, I guess I got backups, but I haven't had a
      > problem, I've been working with it for over a year… Maybe I could create
      > another Supabase account and we could, like, do our own type of backing
      > up for free."*

      **He is right that it can be done free, and it is Supabase's OWN advice:**
      their documentation tells free-plan projects to export with
      `supabase db dump` and keep off-site copies. **The free plan includes no
      backups at all** — that part of gap E stands.

      **The shape: a nightly GitHub Actions cron running `pg_dump`.** One
      gotcha that costs an afternoon if unknown — **GitHub runners are IPv4-only
      and a free project's DIRECT connection resolves to IPv6, so use the
      SESSION pooler on port 5432; the transaction pooler does not work with
      `pg_dump`.** A second Supabase project also works as the destination.

      **Two rules that are not optional.** **The destination must be private and
      encrypted** — the dump is real customers' names, phone numbers and home
      addresses, and a public repo would be the worst single thing that could
      happen to this product. And **a backup nobody has restored is not a
      backup**: one restore into a scratch project, once, or the item is not
      done.

      **His "no problems in over a year" is true and is not evidence** — nothing
      has been under load and nobody else's customers have been in it. **On his
      word "maybe"**, so it is scheduled but he has not said build it.

      **Skills: none. `security-review` on where the dump lands.**

- [x] 2.23 ~~**THE MAINTENANCE DEADLINE**~~ **BUILT 2026-09-06.**
      `20260906008000_maintenance_deadlines.sql`, `app/src/lib/maintenance.js`
      + `_shared/maintenance.ts`, the escalation pass in
      `send-owner-reminders`, `maintenanceDueEmail`, and **Maintenance
      deadlines** on Business beside Monthly plans.
      `tests/maintenance.test.mjs` — 37 checks, three baselined.

      **THE HONEST QUESTION THIS ITEM SAID TO ANSWER FIRST: it is attached to a
      CUSTOMER AND A CAR, not to a plan.** The research leans that way and the
      reason is concrete — a customer with two coated cars has two deadlines
      and no plan at all, and `plan_members` is per-customer with a price on
      it. **Not smuggled into the cadence fields**, which this entry and the
      research both refused in advance.

      **IT IS THE ONLY EMAIL IN THIS PRODUCT THAT ESCALATES**, at 60, 30, 14
      and 1 days. Every other reminder fires once because the job happens
      whether or not anybody reads it; a warranty does not. **A deadline added
      INSIDE the window starts at the stage the DATE has reached**, never at
      the beginning — a customer's first word from us about their warranty must
      not be three emails at once — and `reminded_stage` means a sweep running
      every fifteen minutes cannot send the same step twice.

      **OPEN, MET AND MISSED ARE ALL DERIVED; ONLY "the detailer says it no
      longer applies" IS STORED.** A stored status is a second answer that goes
      wrong the moment somebody backdates a service, **and backdating is the
      ordinary case** — the inspection is recorded after it is done. The word
      is **missed**, never "overdue": a warranty does not become overdue, it
      becomes gone.

      **THE CUSTOMISABLE PART HE ASKED FOR IS THE LABEL**, and the product
      never invents one: a dropdown of coating brands would be this product
      deciding which manufacturers exist. The email adds nothing to the
      detailer's own words either — a warranty is a contract between the
      customer and a manufacturer, and a sentence we invent about what it
      covers is one we cannot stand behind.

      **The customer is the one told, not the detailer**: the customer is who
      loses something, the detailer has the whole list on their own screen, and
      the email that books the job is the one with the booking link in it. It
      obeys the SAME `email_customer_reminder` switch as every other customer
      reminder — a product that decides an email is too important to be
      switched off has stopped being theirs — and the same three ways to be
      unreachable (no address, opted out, bounced) that Clients and
      `send-campaign` already ask about. **The stage is stamped only after a
      successful send**, so a bounced relay is not a warranty lost to one
      failed email at four in the morning.

      **Verified live**: a deadline 20 days out fired the **30-day** step and
      not the 60-day one, a second sweep the same day sent nothing, and a
      200-day one was untouched. Sweep clean at every width with the new
      screen walked; `render-emails` renders **both ends** of the escalation
      (60 days and the day before), because rendering only one leaves the half
      that matters unlooked-at.
      **And two things were found by LOOKING**: `rows-stack` wrapped every
      child onto its own line at 392, turning each deadline into four
      fragments with two naked icons underneath; and with the customer's name
      first the sub-line clipped to *"Marcus Webb · 2021 Tacoma …"*, losing the
      one fact the row exists to carry. The timing comes first now.

      **THE ORIGINAL ENTRY:**

      - [ ] 2.23 **THE MAINTENANCE DEADLINE — a coating warranty that VOIDS, not a
      cadence. He handed the design to us on 2026-09-04 and it is still owed.**

      > *"and then there was, like, the requirement case things. And I think you
      > could probably figure all that out. I don't really know how to do all
      > that. You could figure out the best way to implement it… and just be
      > customizable for the detailer who might have a lot of different things."*

      **Opened as its own item on 2026-09-04, at the end of roadmap 2.14 step 2,
      because it was living inside 2.14's prose and would have died there.** The
      research recommended exactly this split and 2.14 built cadences without
      it.

      **WHY IT IS NOT A STRICTER CADENCE, which is the whole point.** A cadence
      says *"roughly every month"* and nothing happens when it slips. This says
      **"before 12 October, or something the customer paid $1,500 for is
      gone."** Ceramic Pro requires an annual inspection by a certified
      installer for every package; System X requires one professional service a
      year **within about 30 days of the install anniversary, and missing that
      window voids the warranty permanently.**

      **The three things it has to be** (`docs/plans-research-2026-09-04.md`
      round 2 §2, and they are the part that must survive):

      1. a **deadline with a real date**, not an interval;
      2. an **escalating reminder** as the date approaches — it fires more than
         once, which is what makes it different from every reminder this product
         already sends;
      3. a **record of when the last qualifying service happened**, because the
         warranty claim depends on proving it.

      **NONE OF THE SIX PANEL PRODUCTS DOES THIS**, and it is the one place a
      detailing-specific product is plainly better than Jobber. **It is also the
      one requirement customers do not argue with**, because the consequence is
      theirs and they already understand it.

      **What 2.14 step 2 leaves it, so it is cheaper than it was.**
      `plan_members` already carries a member and a status; `plan_visits`
      already records visits with a `due_on`. The honest question this item has
      to answer first is whether a maintenance deadline is **a kind of plan** (a
      plan whose cadence is annual and whose miss has a consequence) or **a
      thing attached to a BOOKING** (the coating job that started the warranty).
      **The research leans to the second** — it is a fact about one car and one
      job, and `plan_members` is per-customer.

      **Do not smuggle it into the cadence fields.** That was considered and
      rejected in the research, and 2.14 shipped without it on purpose.

      **Skills: `impeccable` for whatever screen it lands on.**

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


- [ ] 2.24 **A GUIDE ON EVERY TAB — THE WRITING HALF IS DONE
      (`docs/tour-steps-2.24.md`, 2026-09-06). WHAT IS LEFT IS THE OVERLAY AND
      THE SWEEP**, which is exactly the split this entry itself describes.

      **THE DECISION IT SAID TO SETTLE FIRST IS SETTLED: a guide never advances
      the screen.** The choice was whether a Clients guide opens a record and
      points inside it. It does not, and not for convenience:
      **rule 1 — the lit element is not clickable — exists because this runs
      over live data**, and a tour that drives the screen is the same risk with
      OUR hand on it instead of the detailer's; a tour dismissed with Escape
      after opening a job has moved somebody into a record they did not choose;
      and **it is not the complaint** — he said it *"did it for the home page,
      and then it stopped there"*, which is about four steps being signposts to
      doors, not about the guide failing to walk through them. Where a screen's
      meaning really is behind a click, one SENTENCE says what is behind it.

      **THE FILTER CUT MORE THAN IT KEPT, as the entry predicted.** Calendar
      gets **no guide at all** — every candidate step was a control reading its
      own label back, and decision 6 says a tab whose honest guide is one step
      does not get one. Business gets **two** steps out of thirteen rows.
      Today, Money and Clients get four, three and three. **Sixteen short steps
      across five arrivals**, against the seven-step tour it replaces, which is
      what *"more steps and not try to combine any things into one step"*
      asked for.

      **AND THE SHELL TOUR GOES FROM SEVEN STEPS TO FOUR**, keeping the link
      last (§13b) — otherwise a detailer meets the same sentence twice, which
      is his complaint arriving from the other side.

      The document also lists the eleven new `data-tour` targets the build
      needs and what each guide does on an empty dashboard. **The original
      entry, which is still the rulebook for the overlay:**

      - [ ] 2.24 **A GUIDE ON EVERY TAB, NOT JUST THE FIRST ONE — the OWNER,
      2026-09-05, about the walkthrough that already exists.**

      > *"Remember we made a kind of, like, guide that goes step by step and it
      > kinda highlights things. Well, it did it for the home page, and then it
      > stopped there. And it was a little weird. What it should do is,
      > basically, every time you click on a new tab for the first time, there
      > should be a full guide for every single thing inside of that, that's
      > not, like, obviously explainable. Don't combine multiple things into one
      > step and keep it kinda short."*

      **HE IS DESCRIBING A REAL SHAPE, NOT A BUG.** `Walkthrough.jsx` is seven
      steps and every one of them is at SHELL level — it points at the day, the
      `+`, a job, and then at the Calendar, Money and Business BUTTONS. It
      names each tab and stops at the door. So a detailer meets a tour that
      appears to be about the whole product, gets a real explanation of Today,
      and then gets four signposts. **"It stopped there" is exactly what it
      does.**

      **WHAT HE IS ASKING FOR: a guide per TAB, run the first time this device
      opens that tab.** Not one longer tour — five short ones, each arriving
      when the detailer is actually looking at the thing.

      ---

      **THE RULES ALREADY EXIST AND ARE NOT UP FOR RE-DECIDING.**
      `Walkthrough.jsx`'s header carries six of them and
      `docs/dashboard-screen-designs-2026-08-31.md` §13b carries his original
      three. **Read that header before writing a word.** The short form:

      - **One sentence a step. One ELEMENT a step.** If a step needs "and", it
        is two steps — a rule about the sentence as much as the target.
      - **More steps, where a tour of this app could be three.** His words:
        *"more steps and not try to combine any things into one step."*
      - **Targets by `data-tour`, never by position or selector shape**, and no
        sentence names a POSITION or a GESTURE — the bottom bar is a left rail
        at a desk, and half the widths are a mouse.
      - **A step whose target is absent is skipped silently, and the COUNT is
        worked out first.** A card that promises seven and delivers four is
        worse than no count; that was measured on a staff login.
      - **The lit element is not clickable**, and nothing is applied to the
        element being pointed at — this runs over live data.
      - **Escape, a visible skip, never returns on its own, re-runnable from
        the gear.**

      **AND THE ONE NEW RULE IS HIS, AND IT IS THE HARD PART: *"that's not
      obviously explainable."*** A step that points at a control and reads its
      label back is what made the tour feel weird. It is the same copy rule he
      gave on 2026-09-01 — *does the sentence add a fact the control does not
      already carry?* — pointed at a tour instead of at a screen. **Expect to
      cut more candidate steps than you keep**, and expect Business's settings
      rows to produce almost none: a row that says *"Hours & days off"* has
      already said it.

      ---

      **SIX THINGS TO DECIDE BEFORE ANY CODE, and the fourth is the one that
      decides the shape of the whole item.**

      1. **Where "seen" lives.** `dp.tour` is one localStorage key today and it
         is deliberately a fact about this BROWSER rather than this account —
         two people share one tablet in this trade. Per-tab wants a SET in one
         key, not five keys.
      2. **The shell tour gets SHORTER, not deleted.** Its job becomes *here
         are the five places and the link*; everything it half-explains moves
         into the tab it belongs to. Otherwise a detailer meets the same
         sentence twice, which is the complaint arriving from the other side.
      3. **A tab guide must not fire while the shell tour is running**, or the
         first tab press puts two overlays on the screen.
      4. **WHAT A GUIDE DOES ABOUT A STATE BEHIND A CLICK — the real question.**
         A Clients guide that stops at the list has the same shape as his
         complaint: the record, the history and the compose sheet are where the
         screen's meaning is. But rule 1 says the lit element is not clickable,
         so either **the guide advances the screen itself** (it opens the
         record, then points inside it — powerful, and it is now driving a
         screen full of the detailer's real data) or **it only covers the
         resting screen** (safe, and possibly the same disappointment one level
         down). **Decide this first; everything else follows from it.**
      5. **Permissions.** Staff have three tabs. A guide list must count what
         `can()` actually shows, the same way the shell tour already does.
      6. **A tab whose honest guide is one step does not get a guide.**

      ---

      **THE STATE TO VERIFY AGAINST IS THE EMPTY DASHBOARD**, which is the
      opposite of every other screen in this rebuild. A brand-new detailer
      meets these guides before they have a job, a client or a penny taken, so
      half the targets will not exist — and rule 4 above is what stops that
      being five broken tours.

      **`sweep-widths.mjs` is the only thing in this repo that opens the tour
      at all** — it walks its seven steps at 392 and carries two keyboard
      assertions there, both of which were FALSE when they were written and
      then caught the fix being broken in `?lite=1` only. Every new tab guide
      needs adding to that walk **in the change that builds it**, which is the
      lesson this repo has now recorded ten times.

      **HALF OF THIS CAN BE DONE WITHOUT A BROWSER, and it is the slow half:**
      working out which controls on each screen deserve a sentence is a careful
      read of five files. It is queued as `docs/cloud/QUEUE.md` item **H**,
      which produces `docs/tour-steps-2.24.md` — the step lists as words. If
      that document exists when this item starts, the item is the overlay and
      the sweep, not the writing.

      **Skills: `impeccable`** — it is an overlay drawn over live screens, and
      the placement rule ("under the hole when the card fits, over it
      otherwise") is measured rather than guessed. No direction-generating
      skill.

- [ ] 2.25 **THE SIGN-UP / SIGN-IN SCREEN, AND GOOGLE — the OWNER asked on
      2026-09-05.**

      > *"can we put on the list to improve the sign up / log in page cuz it
      > looks pretty buns. also we should have a log in and sign up button for
      > the landing page. also add google log in support"*

      **TWO OF THE THREE ARE ALREADY BUILT, and a session that starts by
      writing code will build them a second time.** Checked in the repo and
      against the live project on the day he asked, not inferred:

      - **GOOGLE SIGN-IN IS FULLY WRITTEN AND SWITCHED OFF.**
        `app/src/screens/Auth.jsx` has `withGoogle()` calling
        `signInWithOAuth({ provider: "google" })`, Google's own marque as
        inline SVG in their brand colours, and `useEnabledProviders()`, which
        reads GoTrue's `/auth/v1/settings` so **the button appears the moment
        Google is enabled and never before** — no rebuild, and no button that
        leads to *"provider is not enabled"*. **Measured 2026-09-05: that
        endpoint returns `google: false`, `email` the only provider on.**
        So this is **not a code task**. It is a Google Cloud OAuth client
        (client id + secret, with Supabase's callback URL as the authorised
        redirect) pasted into Supabase → Authentication → Providers. **That is
        the owner's ten minutes, and it needs his Google account** — write him
        the click-by-click, do not try to do it for him.
        **The one thing to CHECK once it is on** rather than assume: a Google
        sign-up lands a session with no business, and `App.jsx` is supposed to
        send that to business creation. The email path does; nothing has ever
        exercised the OAuth path.
      - **THE LANDING PAGE ALREADY HAS BOTH BUTTONS** — the nav carries
        *Sign in* (→ `/app`) and *Get started* (→ `/pricing` since 2.20 stage
        2). **What is true in his complaint is the WORDING**: "Get started"
        does not read as "sign up", and the pair does not look like a pair.
        That is a label-and-treatment decision, not a missing feature. Do not
        add a third button.
      - **THE SCREEN ITSELF IS THE REAL WORK, and he is right about it.**
        `Auth.jsx` is built out of `theme.css`'s `.card`, `.field` and `.btn`
        — the DASHBOARD's chrome — while everything a prospect sees up to that
        moment is the landing world: Archivo worked across its width axis, the
        drifting ground, the glass nav, the accent. **It is the one screen
        where the two worlds meet, and it currently just stops.** A visitor
        goes landing → pricing → *this*, and it is the last impression before
        they hand over money.

      **Watch out — this is why it is its own item and not a quick pass.**
      `landing.css` is scoped to `.ld` and `theme.css` is GLOBAL and reaches
      into it; nine class names are already renamed to survive that collision,
      and the list is in `landing.css`'s header. **Bringing the landing world
      to the auth screen means either putting `.ld` on it — which drags the
      whole ground, nav and type scale onto a screen that has none of them —
      or a small, deliberate third surface.** Read that header before
      choosing, and remember the rule it states: *no selector in `theme.css`
      may be able to match an element on a `.ld` page.*
      **`Auth.jsx` is also the screen `sweep-widths.mjs` signs in through on
      every run**, so it addresses `input[type=email]`,
      `input[type=password]` and `form button.btn.primary` by selector — a
      rename that misses those turns every browser check in the repo red at
      once, and the failure prints as `NO SUCH BUTTON`.
      **And it is reachable by nothing else in the sweep**: it is measured
      only as a step on the way in, never as a screen, so **add it as its own
      swept state in the change that redesigns it** — the eleventh time this
      same gap would otherwise be found later.

      **Skills: `impeccable`.** A customer-facing screen, so the five swept
      widths apply. Anti-slop floor as usual, and the design system outranks
      any skill's opinion.


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
- [x] 3.1 ~~Plan: which pages every tenant gets (home, services, gallery,
      about, reviews, FAQ, contact, booking) and which settings drive each.
      **OWNER approves the plan.**~~ **APPROVED 2026-09-05, WITH ONE AMENDMENT
      THAT OVERTURNED THE RECOMMENDATION.** The deliverables are
      `docs/tenant-site-contract.md` (the enumeration), the three worked pages
      in `docs/tenant-sites/`, and `docs/tenant-site-research-2026-09-05.md`.
      **His amendment: the booking form is BUILT INTO each tenant site in that
      site's own design**, not linked out to `/book/:slug` as §1c recommended —
      *"it's up to the detailer's choice but I think it should be built into
      the website with the detailer's website design. Like how it is on my
      website."* **His own site is the spec and it was read**:
      `reference/frontend/src/components/BookingWidget.jsx` is 1,581 lines in
      the SITE's components folder, built from the SITE's UI kit, rendered
      inline by `App.js:73`. So the fork line moves up one level — the FORM is
      presentation, the RULES stay central — and **3.2's biggest job is now a
      headless booking core** so ten clients do not mean ten re-derivations of
      the rules. `/book/:slug` stays for booking-only detailers, which is the
      split 3.3 already draws.

      **HE CHOSE THIS AS THE NEXT ITEM, 2026-09-05**, over 2.20 stage 3
      (Connect) and over 4.4, on the reasoning that the product is sold as a
      **$499 website build** and there is no builder — Connect is a feature a
      detailer would like, a website is the thing they are paying for.

      **DO NOT WRITE ANOTHER PLAN. His own words when a session started to:**
      *"Isn't there already a plan. Follow the docs."* **He is right and this
      is now a rule for this item.** `docs/tenant-websites.md` settles the
      architecture (fork the presentation, never the engine — confirmed
      2026-08-29), §4 lists what the kit contains, and §3 names what 3.1 owes:
      **the enumeration of what a tenant site MUST implement for the
      dashboard's features to work.** That enumeration is the deliverable.
      A third planning document is not.

      **AND MOST OF THE CONTRACT ALREADY EXISTS — measured 2026-09-05, not
      assumed.** `get_public_business_profile(slug)` is one `security definer`
      RPC returning business, branding, settings, service_groups, services,
      add_ons, plans, hours, testimonials and gallery for one tenant, filtered
      on `status = 'active'` so a suspension darkens every site built on it.
      **`business_branding` already carries `logo_url`, `hero_image_url`,
      `tagline`, `about_copy` and SIX social links**, and the RPC ships the
      whole row. `business_domains` exists and is unused, waiting for 3.3.
      **So 3.1 is mostly a naming exercise over something built, plus a short
      list of real gaps.** The gaps found on the day, each verified in the
      migrations rather than inferred:
      - **FAQ is stored and not exposed.** `business_settings.faqs` and
        `faq_enabled` landed in `20260902001000_faq_storage.sql`; the RPC's
        `settings` object lists keys explicitly and does not include either.
        **There is also no FAQ settings screen** — the owner's own split, and
        the reason there is no FAQ row in the settings index.
      - **The payment handles are not exposed.** `pay_cash` / `pay_venmo` /
        `pay_cashapp` / `pay_zelle` / `pay_paypal` / `pay_other`
        (`20260904006000_payment_handles.sql`) reach a customer's EMAIL and
        nothing else. A site's "how to pay" section would need them.
      - ~~**Five of the six social links cannot be typed in.**
        `BusinessInfo.jsx` edits `social_instagram` only; facebook, tiktok,
        youtube, google and yelp are columns with no field.~~ **WRONG — see
        the correction below.** It was true on 2026-08-31 and fixed on
        2026-09-02; four fields are on that screen today.
      - **Closures are not exposed.** `blockout_dates` and
        `dropoff_only_periods` drive availability and are invisible to a site
        that wants to say "closed the week of the 4th".

      ~~**FABLE 5.1 BELONGS HERE AND NOT BEFORE**~~ **— SPENT AND CLOSED.** It
      built the three worlds and the booking form in each, and he then ruled
      **"No more fable when making pages"** (2026-09-05). Whichever model the
      session is already running builds pages from here; see CLAUDE.md § Design.
      The original instruction, kept for the reasoning:
      **his instruction, 2026-09-05:**
      *"maybe using fable when it's needed."* He has weekly Fable usage and
      asked it be spent where it is genuinely beneficial. **The beneficial use
      is the DEFAULT VISUAL WORLD for a detailer's site** — one worked example
      derived from The Thread but for a detailing business rather than a SaaS
      product, built once and diverged from per client (`tenant-websites.md`
      §3, "the kit ships a default"). **It is not the contract enumeration**,
      which is analytical and belongs to whichever model is already running.

      **BUILT 2026-09-05 AND WAITING ON HIS ONE APPROVAL.** The enumeration is
      `docs/tenant-site-contract.md` — twelve implementations a site owes (§2),
      the read contract key by key (§3), what a site may never do (§4) and may
      omit (§5). The item stays unticked because its own line says **OWNER
      approves the plan**, and the thing to approve is contract §1c: **the
      booking flow is engine, so a bespoke site LINKS to `/book/:slug` rather
      than rebuilding the seven steps.**
      **THE "DEFAULT VISUAL WORLD" ABOVE WAS THE WRONG READING, AND HE CORRECTED
      IT THE SAME DAY.** The first page built was The Thread recoloured — same
      ground, same faces, same green — and he rejected it: *"it shouldn't look
      exactly like our landing page, it should genuinely be different… what I
      meant by default using our design, I more meant like the mentality of how
      we do things. The scrolling, the inspo etc."* His 2026-08-29 words already
      said it — *"that same RESEARCH"* — and this entry's paraphrase ("the kit
      ships a default") is what turned a method into a skin. **What a tenant
      site inherits is the METHOD and never the SKIN**:
      `docs/tenant-site-research-2026-09-05.md` §1. That file also holds the
      content inventory from six real detailers' live sites (§3) — his second
      instruction, *"include everything they would want, nothing that doesn't
      make sense for a detailer"* — which corrected the contract in four places
      (§4) and found an eighth gap: credentials and trust markers have no
      column. **Fable 5.1 was spent on THREE worked pages in `docs/tenant-
      sites/`, deliberately different from each other and from us** — one
      example is a template, three that disagree can only be read as "pick a
      direction and build it properly": `a-shop.html` (Sable Paintworks —
      Bodoni Moda, warm black, gilt), `b-van.html` (Tolliver Mobile Detailing
      — Schibsted Grotesk + Literata, warm paper, rust, **LIGHT**) and
      `c-volume.html` (Two Bay Detail Co. — Big Shoulders, soot, safety
      orange, the price table as the hero). All three verified by a second
      pass and by looking; the second pass found four contrast failures and
      the design hook found four side-tab borders, all fixed. B being light
      makes the booking flow's "reopen in phase 3 if a tenant site turns out
      light" note a real 3.2 build (contract §8.2). The full account is
      PROJECT-STATE's ROADMAP 3.1 section.

      **AND HE REJECTED HOW ALL THREE LOOK — 2026-09-05:** *"All 3 look very ai
      and not even like the vibe for detailing but it's fine for now."*
      **They pass every check this repo owns and still read as AI**, which is
      the finding: the anti-slop floor is a list of NEVERS and a list of nevers
      cannot produce a vibe. **"Fine for now" is a deferral — the pages stay,
      nothing is rebuilt, and they must NOT be used as the taste reference for
      a real client's site.** Diagnosis and the three candidate causes:
      `docs/tenant-site-research-2026-09-05.md` §7. **What unblocks it is his
      taste rather than a fourth attempt** — two or three detailer sites whose
      vibe he likes, a sentence each, which is a `TASTE-NOTES` pass for this
      trade and has never existed. **The structural half is unaffected**: the
      contract, the seams, the built-in booking form and the twelve
      implementations are all sound and are what 3.2 builds against.
      **THREE OF THE FOUR GAPS ABOVE ARE CONFIRMED; THE SOCIAL-LINKS ONE IS
      WRONG.** `BusinessInfo.jsx` has edited four social fields since
      2026-09-02 (stage 6) — the gap was copied out of
      `dashboard-feature-inventory-2026-08-31.md` §3 without being re-read.
      What is actually broken there is smaller: `branding.social_google` and
      `branding.social_yelp` are dead columns shadowing the live
      `settings.*_review_url` pair. Contract §6e.
      **AND THREE MORE GAPS WERE FOUND, one of them larger than any of the
      four:** every customer-facing URL the platform emits is built from one
      global `PLATFORM_URL`, so a detailer on their own domain still sends
      confirmation emails pointing at detailingplatform.com (§6a — this is
      3.3's real content); `businesses.contact_email` is not in the profile
      (§6f, a question for him); and `track-visit` + `campaigns` +
      `campaign_visits` are dormant with no caller and no reader (§6g,
      recommended to stay dormant).
- [x] 3.2 **Build the tenant-site kit against the contract.** **SHIPPED
      2026-09-05.** All three parts, and the deliverables are
      `app/src/book/core.js` (a), `20260905001000_tenant_site_contract_gaps.sql`
      plus a **Common questions** settings screen and a credentials editor (b),
      and `docs/tenant-site-kit.md` (c).

      **(a) THE CORE IS WIRED THROUGH, NOT WRITTEN BESIDE — the one judgement
      that decides whether this item was worth doing.** `BookingPage.jsx` lost
      ~200 lines, `lib/api.js`'s four public booking calls go through the
      core's own transport, and the booking context and three step components
      call it. **A core the product does not itself run is a core that rots**,
      and the next person to find it wrong would be a client's agent rather
      than us. `tests/booking-core.test.mjs` is 164 checks, baselined eleven
      ways; its § 1 reads the file as TEXT and fails on any `import`, any JSX,
      any `import.meta.env`, any React hook and any unwrapped `localStorage`,
      because those are the properties that make it droppable into a site
      built on anything.
      **Proof it was a LIFT and not a rewrite: every spare-room figure
      `sweep-booking-steps.mjs` printed afterwards is identical to the ones
      CLAUDE.md records** — step 1 at 10px spare on 1440x900, step 4 at 74px,
      step 3 at 111px — and `e2e-booking` was 81/1 on both tenants with the one
      failure being the documented `exclude_booking_id` gap.

      **(b) FIVE OF THE EIGHT §6 GAPS ARE CLOSED, AND ONE COLUMN PAIR WAS
      REMOVED.** 6b (FAQ), 6c (payment handles), 6d (closures) and 6h
      (credentials + `established_year`) are on the public profile; **6e's two
      dead `business_branding` social columns are DROPPED**, measured null on
      all six rows before the drop, because a shadowing column is worse than a
      missing one. **6a is roadmap 3.3 and 6f/6g are questions for the owner**,
      written up in `docs/overnight-log.md` rather than guessed at.

      **(c) THE KIT BRIEF IS A POINTER, NOT A SUMMARY** — the owner's own rule
      when a session started writing a third plan (*"Isn't there already a
      plan. Follow the docs."*). Its §5 is the load-bearing part: **the three
      pages in `docs/tenant-sites/` are the STRUCTURAL range and NOT the taste
      reference**, and it says so in his own words.

      The original wording follows.

      Three parts, in
      this order:
      **(a) THE HEADLESS BOOKING CORE — the biggest single job, and it exists
      because of his 3.1 amendment.** Every website-package site now draws its
      own booking form; his own weighs 1,581 lines. So lift the logic out of
      `app/src/book/BookingPage.jsx` and its six step components into ONE
      dependency-free module with **no markup and no CSS in it**: the step
      sequence, which services are selectable under the group rules, which days
      and times are open, the `calculate-booking` call, the submit. Each site
      then writes its own markup, type, colour and motion against that core.
      **It is a lift, not an invention** — the logic is already written and
      already correct. Without it, *fork the presentation* becomes *fork the
      rules*, which is the ceiling `docs/tenant-websites.md` §3 exists to
      avoid.
      **(b) Close `docs/tenant-site-contract.md` §6's gaps.** 6b, 6c, 6d and
      6h are one migration (three RPC keys plus `business_branding.credentials`
      and `businesses.established_year`) plus an FAQ settings screen and a
      credentials field on `BusinessInfo.jsx`. 6e is a decision plus a small
      migration.
      **(c) The kit brief** that lets a fresh agent build a client's site: the
      contract, the research file's method (§1) and content inventory (§3), and
      the three worked pages as the range rather than as a template.
      A site's CONTENT comes entirely from tenant configuration — a price
      changed in the dashboard changes the live site with no code edit — while
      its PRESENTATION, **now including the form**, is bespoke per client.
      **This wording replaced the original on 2026-09-05, which is what 3.1
      owed.** It used to read "entirely from tenant configuration, zero
      hardcoded content" and its own note said that predated the owner's
      2026-08-29 decision and described the shared-system answer he rejected.
      His constraint is unchanged and is the reason the contract exists: *"a
      lot of the features of the admin dashboard need some features on the
      website to work."* See `docs/tenant-websites.md` §3.
- [x] 3.3 ~~Custom domains: hostname→business lookup + the Netlify alias
      process, so website-package customers can use their own domain.
      Booking-only customers stay on `detailingplatform.com/book/name`.~~
      **SHIPPED 2026-09-05, BOTH HALVES.** `20260906000000_custom_domains.sql`,
      `_shared/tenantSite.ts`, `verify-domain`, `app/src/lib/host.js`, a
      seventeenth settings screen (**Your web address**), and
      `docs/custom-domains.md` for the one step that is not code.

      **THE OUTBOUND HALF WAS THE BIGGER ONE AND THIS ENTRY DID NOT KNOW IT** —
      see the note below, written while building 3.1. All five URL builders in
      `_shared/config.ts` now take the tenant's own origin as a **required
      first argument**, resolved by `siteFor()` from
      `business_canonical_host`. **A default was considered and rejected**: it
      keeps every existing call working AND lets a call site forget the tenant
      while looking correct, which is this repo's most repeated failure wearing
      a new hat. Required, a forgotten argument puts `undefined` in a link, and
      `render-emails.mjs` already fails on that string.

      **WHAT `business_domains.domain` MEANS IS THE ONE THING TO GET RIGHT: a
      hostname that RESOLVES TO THIS APP**, normally a subdomain aliased onto
      our Netlify site. It is NOT "the detailer's website". The receipt, plan
      and opt-out pages the platform emails are pages OUR app serves, so
      pointing them at a host that does not serve them replaces one visible
      seam with a 404 — which is worse, because a customer who cannot open
      their own booking has lost it.

      **SO VERIFICATION IS A FETCH, NOT A TICK.** `verify-domain` GETs
      `/platform-host.txt` from the address itself and requires a marker only
      this app serves. Nothing a detailer types can make that true. And
      `verified_at` is **revoked from `authenticated` at column level**,
      because RLS chooses ROWS and not columns — without that, a detailer
      stamps their own row and the fetch is decoration.

      **THE HOSTNAME CHANGES EXACTLY ONE ROUTE**, and `tests/custom-domains.test.mjs`
      § 7 pins that it stays one. `/` is our marketing page on our hosts and
      that detailer's booking page on theirs; every other path serves the same
      thing on either, because the alias points at this same site. An
      unrecognised host that resolves to no business falls back to the
      marketing page — the safe direction the day somebody buys a second
      platform domain and forgets `lib/host.js`.

      **ONE STEP IS OURS AND THE SCREEN SAYS SO IN AS MANY WORDS.** Adding the
      alias in Netlify cannot be done from the app, and a screen offering *Add*
      and *Check* without saying that leaves a detailer pressing Check for ever
      — the push-switch defect stage 6 spent a pass removing, one screen over.
      Automating it needs a Netlify token behind the platform admin of 4.4.

      **THAT SPLIT IS NOW LOAD-BEARING FOR MORE THAN DOMAINS — 3.1, 2026-09-05.**
      The owner's *"it's up to the detailer's choice"* lands exactly on it:
      a **website-package** customer gets the booking form built into their own
      site (contract §1c), and a **booking-only** customer keeps `/book/:slug`
      on our domain. So this line already names the two products; it just did
      not know it was naming two booking shapes as well.

      **THIS WORDING COVERS ONLY THE INBOUND HALF, AND THE OUTBOUND HALF IS
      BIGGER — found 2026-09-05 writing the 3.1 contract (§6a).**
      `supabase/functions/_shared/config.ts` builds `businessSiteUrl`,
      `receiptUrl`, `planUrl` and `plansUrl` from **one global `PLATFORM_URL`**,
      so a detailer on `coastlinedetail.com` still sends confirmation emails
      whose "view, change or cancel" link goes to detailingplatform.com. A
      hostname lookup that does not also make those four helpers per-tenant
      leaves the seam in the one artifact the detailer did not write.
      `business_domains` has existed since the first tenant migration and
      nothing has ever read it.

- [x] 3.4 **CLOSED 2026-09-05 — IT IS `docs/tenant-site-kit.md`, WHICH 3.2(c)
      BUILT, AND NOT A SECOND FILE.** This item and 3.2(c) describe the same
      deliverable from two different dates, and **writing a second kit to
      satisfy the older wording is the third-plan mistake the owner named**
      (*"Isn't there already a plan. Follow the docs."*). What closing it
      actually took was reading this item's own list against that file and
      filling what was genuinely missing:
      **`docs/references/TASTE-NOTES.md` and `ANALYSIS.md` joined the reading
      order** — his own words, verbatim, on how seven sites he picked MOVE,
      which is the one thing a screenshot cannot carry and which research §1
      says is exactly what transfers. It is now §1 rows 2b/2c with a §5b on how
      to read it: **for MOTION and never for LOOK**, because the seven are
      product and agency sites. One line in it is worth the rest for this
      problem — *"I also like how each section looks different, and they all
      don't look the same"* — which is the answer to why every page rejected so
      far has one section shape repeated in three colours.
      **A new §6 answers "what is customisable, and how"**, this item's fourth
      bullet, as a table of what a client may change and the one hard no (a
      price, service, hour or plan hard-coded into a site).
      **TWO OF THIS ITEM'S OWN BULLETS ARE SUPERSEDED AND THE KIT SAYS SO
      RATHER THAN QUIETLY DROPPING THEM**: *"the finished design system"* and
      *"the landing page as the worked example"* both predate his 2026-09-05
      correction that a tenant site inherits our METHOD and never our SKIN. The
      kit's §1 tells an agent NOT to read `docs/design-system.md`, and says why.
      **The intake form stays unbuilt and unscheduled**, as this entry always
      said; §6 says what to do until it exists, and the kit's §8 lists it beside
      the `TASTE-NOTES` pass for this trade — the two things that would most
      improve a real client's site and that neither 3.2 nor 3.4 could do alone.

      The original entry follows.

      **The tenant-site build kit** — promoted 2026-08-29 from a
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

- [x] 4.1 ~~Audit `reference/` (the old site's code) for anything dropped
      silently beyond the known list.~~ **DONE 2026-09-05 —
      `docs/reference-audit-2026-09-05.md`.** Every one of the old site's
      fourteen edge functions, twenty-six migrations and public sections read
      against the platform by NAME and then by BEHAVIOUR, because a matching
      name proves nothing — that is exactly how the campaign tables survived
      the conversion as three empty tables and were counted as kept.

      **THE ONE GENUINE FIND, AND IT IS NOT A FEATURE: THERE IS NO WAY TO
      RESET OR EVEN CHANGE A PASSWORD.** `resetPasswordForEmail` appears
      nowhere in `app/src`; neither does `updateUser`; there is no
      `/reset-password` route. A detailer who forgets their password cannot ask
      for a link, and one who wants to CHANGE it — after sharing it, after a
      staff member leaves — has no screen to do it on. **A recovery link
      triggered by hand would sign them in and still leave them unable to set a
      password**, which is the confusing kind of broken. The old site had the
      landing page (`pages/ResetPasswordPage.jsx`) and never had a way to
      request one, because Andrew was the only user and could ask somebody to
      do it in the Supabase dashboard — **an excuse that does not survive a
      second detailer**, whose support channel is then "email the developer",
      at whatever hour. It is **item G under "Not on the roadmap yet"**.

      **THE OTHER RESULT IS THE MORE USEFUL ONE: §C, SIXTEEN THINGS THAT LOOK
      DROPPED AND ARE NOT**, each read in both codebases — the review-request
      email, tips and upsells, the canned SMS, the vCard builder itself, hours
      overrides, the wrap-up nudge, the $5 rounding (now per-tenant), the
      discount ORDER, the finalize-payment columns, the CMS singleton's every
      field. **Nothing in that section should ever be re-audited**, which is
      what the file is for.

      **AND IT SIZED 4.2**: the vCard is an HOUR (the platform already builds
      one and `sendTenantEmail` already takes attachments — only the attaching
      is missing), while Google Calendar is the one needing a real decision,
      because per-tenant it is an OAuth flow rather than the old service
      account. `customers.completed_washes_count` needs a decision either way:
      build the loyalty half that writes it, or drop it.
- [ ] 4.2 Re-add as per-tenant features: referral/loyalty, Google Calendar
      sync, owner test-booking preview, vCard on owner emails.

      **THREE OF THE FIVE SHIPPED 2026-09-05; TWO ARE BLOCKED ON THE OWNER AND
      ARE WHY THIS BOX IS STILL UNTICKED.**

      **DONE — the vCard on the owner's alert.** 4.1's audit sized it at an
      hour and it was: the platform already built vCards for the dashboard's
      *Save contact* button and `sendTenantEmail` already took attachments, so
      only the attaching was missing. `_shared/vcard.ts` is a second copy of
      `app/src/lib/platform.js`'s builder — the wall that forced
      `_shared/brandColor.js` — and `tests/vcard.test.mjs` is the price: it
      runs both on the same eight customers and fails on one differing
      character.

      **DONE — the owner's preview, AS ITS OWN FUNCTION, and that is a
      deliberate refusal.** The old site's shape was `preview: true` threading
      past `create-booking`'s slot gate, promo limit, customer upsert and
      insert — **four new branches through the most important function in the
      product, none of them walked by any test, to save a customer nothing.**
      `preview-emails` runs the SAME pricing engine on the tenant's own first
      service and sends both emails to their own addresses with `[Preview]` on
      the subject. **What it does not exercise is the insert**, and
      `e2e-booking` is what covers that.

      **DONE — campaign links, which were 60% BUILT AND REACHED NOBODY.**
      `create-booking` already resolved `campaign_slug` → `campaign_id` and
      stored it (line 307); `track-visit` was already complete and public;
      `campaigns` and `campaign_visits` already had `marketing`-gated RLS. What
      was missing was every caller. Now: `?c=slug` on a booking link is
      recorded and **auto-applies the campaign's promo code**, which is the
      feature — *a code somebody has to remember off a sign is a code nobody
      uses* — the slug and a per-device visitor id ride the submit, and
      **Campaign links** is the eighteenth settings screen, showing two numbers
      per row and no chart.
      **AND IT CLOSED A 3.3 LOOSE END ON THE WAY**: `BookingLink` built its URL
      from `window.location.origin`, which is always detailingplatform.com
      because that is where a detailer signs in — so somebody with their own
      verified address would have printed OUR domain on a card while every
      email they send uses theirs. `siteOrigin` is on `BusinessContext` now,
      read once for all four callers.

      **BLOCKED — Google Calendar sync.** The old `create-calendar-event` signs
      a JWT for ONE Google service account writing to ONE calendar. Per tenant
      that is not a port: every detailer would have to grant access to their
      own calendar, which is an OAuth consent flow, a client registration and a
      token store. **It is a question for the owner, not a build**, and it is
      item O under "Not on the roadmap yet".

      **BLOCKED — referral / loyalty.** The old site had four columns and no
      logic; `customers.completed_washes_count` came across and roadmap 2.11
      already found it dead. **What a referral EARNS is a business decision**
      and inventing one is exactly what this repo forbids. Item P.

      **AND CAMPAIGN LINKS — added 2026-09-05, found by reading `reference/`
      for roadmap 3.1.** This list was built from what the conversion was known
      to have dropped; campaign tracking was not on it because
      `track-visit`, `campaigns` and `campaign_visits` all still EXIST in this
      product, which made them look kept. **They are not wired to anything.**
      On his own site they are a working feature end to end:
      `reference/frontend/src/App.js:29/54` calls `trackVisit()` on every page
      load, `lib/campaign.js` stores the campaign and auto-applies its promo
      code (its own comment names a golf-course QR as the real case), and the
      old admin's `MoreScreen.jsx` had a **Campaign Links** section that read
      them back. **A tenant site is the natural caller** (3.2 wires it); the
      SCREEN that reads it is this item. *A surviving table is not a surviving
      feature.*
- [x] 4.3 ~~Monthly plans — needs a design conversation first: the old one
      was a discount with no billing behind it.~~ **CLOSED INTO 2.14, WHICH
      SHIPPED IT 2026-09-04.** Four rounds of research, three tables, a
      settings screen, a plans page, a member page and the pricing. **Its one
      live question survives and is item A of the unscheduled list — how a
      plan should CHARGE — which is roadmap 2.20 (payments), not this.** We
      log a plan and never bill it, which is the owner's own decision.
      **Do not reopen this as a second plans item.**
- [x] 4.4 Platform admin area: business list + search, per-business
      actions (founding mark, suspend, plan tier, open-their-dashboard),
      manual business creation for in-person onboarding, platform
      settings, basic counts. Locked by a platform_admins table checked in
      the database, with a security test proving a business owner gets
      nothing.

      **STAGE 1 SHIPPED 2026-09-05 — the list, one business's page, four of
      the six actions, and the whole security floor.** `/admin` with its own
      layout, `platform-admin` (member-gated in the DATABASE),
      `20260906001000_platform_admin.sql`, `tests/platform-admin.test.mjs`
      (34 checks, baselined three ways).

      **THE DECISION THE WHOLE THING RESTS ON IS ABOUT WHAT IS NOT THERE: NO
      RLS POLICY ANYWHERE GAINED AN "OR A PLATFORM ADMIN" CLAUSE.** The
      obvious build adds that to the twenty tenant policies and lets the admin
      screens use `supabase.from()` like every other screen. It works on the
      first day and it puts a cross-tenant escape hatch into twenty policies
      that are otherwise provably per-business — **one typo, one copied line,
      one policy rewritten later, and a detailer's browser reads somebody
      else's customers.** Instead the back office reads NOTHING through RLS:
      every byte comes from the edge function under the service role, the
      tenant policies still say one business always, and **§ 1 of the test
      walks every migration in the repo and fails if any policy ever mentions
      the admin check.**
      `platform_admins` and `platform_admin_events` have RLS forced and **no
      policies at all**, which is the strongest statement available: a
      detailer cannot discover who the admins are, cannot make themselves one,
      and cannot forge or delete an audit row.
      **Proven live on deploy:** the demo owner signed in gets **404**, anon
      gets 401 — and a 404 rather than a 403 on purpose, because a 403 tells a
      curious detailer the endpoint exists and that one row is all that stands
      between them and it.

      **IMPERSONATION LOGS BEFORE IT ACTS AND A FAILED LOG STOPS IT.**
      Everywhere else in that function a failed audit row is a console line —
      refusing to suspend a non-paying business over a log write is the wrong
      trade — and here it is the opposite: *"it did not get written"* is not an
      answer to give a detailer who asks whether somebody looked at their
      numbers.

      **THE BACK OFFICE AND THE DETAILER SEE THE SAME SETUP NUMBER.** The
      server sends `setupProgress`'s INPUTS and the screen runs
      `app/src/lib/setup.js` — the spec's own instruction, and the reason is
      that two numbers about the same thing is how a support call starts with
      an argument.

      **THE ADMIN ACCOUNT IS SEEDED ONLY ON REQUEST AND IS NEVER THE DEMO
      OWNER.** `seed-demo.mjs --platform-admin` makes a separate account with
      a random password written to the gitignored refs file. The demo login is
      deliberately guessable and lives on the live site; **making it an admin
      would put every detailer's data behind `demo123`.**

      **STAGE 2 SHIPPED 2026-09-05 — create a business by hand, and resend an
      invite.** Both are the same support call from two sides: somebody signed
      up at their shop who should not be sent to a form, and somebody whose
      invite went to spam. Until now the first was `insert into businesses`
      typed into a SQL console and the second was opening the auth table.

      **THE DEFINITION OF "A NEW BUSINESS" MOVED INTO
      `_shared/newBusiness.ts` RATHER THAN BEING COPIED.** It lived inside
      `create-business/index.ts` and nowhere else, because signup was the only
      way a business could come into existence; the back office is a second
      way, and **a second copy is where two kinds of business start to
      differ** — quietly. A business created by hand with no `business_settings`
      row renders a dashboard of nulls; one with no `business_hours` has a
      booking page that can never be booked, which is a strange thing to hand
      somebody at their own counter. **Neither throws.**
      **WHAT THE HELPER REFUSES TO GUESS IS THE OWNER.** Signup makes the
      caller the owner because they are standing there with a session; the back
      office cannot, because the person being signed up may not have an account
      at all. So membership stays in `create-business` and the invite is what
      carries it — which is exactly why *resend an invite* is the other half of
      this stage rather than a separate feature.

      **BOTH WERE EXERCISED LIVE AS THE SEEDED ADMIN, NOT REASONED ABOUT:**
      `create` returned `{"success":true,...,"slug":"inperson-gh9d2"}`, `resend`
      returned a real `/invite/9502c185…` link with `emailed: true` to
      `delivered@resend.dev`, and the test business was then deleted (204, then
      an empty list). The form measures clean at 1440, 392 and 320 with no
      console errors.

      **STAGE 3 SHIPPED 2026-09-05 — the site columns.**
      `20260906002000_site_columns.sql` adds `businesses.site_url` and
      `site_updated_at`, the `site` action sets them, and the business page
      draws them beside the domains 3.3 already built. **One filter came with
      it — *No website yet* — and it is the one this product needs that a
      normal SaaS back office would not: he BUILDS these by hand, so that is a
      work queue rather than a statistic.**

      **THE COLUMN THE SPEC ASKS FOR IS FOUR FACTS AND ONLY ONE OF THEM WAS
      ALREADY ANSWERABLE.** *Do they have one, what is its address, is a custom
      domain pointed at it, when was it last touched.* Roadmap 3.3 answered the
      third; the other three are facts about work done OUTSIDE this product and
      nothing in the schema held them.
      **AND THE ADDRESS IS DELIBERATELY NOT `business_domains.domain`.** That
      column has a precise meaning — a hostname that RESOLVES TO THIS APP, so a
      receipt stops carrying our brand — and a detailer's website is a
      different artifact that may live anywhere. **Conflating them puts a host
      in that table which does not serve this app, which is 3.3's own named
      failure: a customer opens their booking and gets a 404.** The test fails
      if the site action ever writes that table.

      **BOTH COLUMNS ARE REVOKED FROM `authenticated`, the same mechanism 3.3
      used for `verified_at`**: RLS chooses rows and says nothing about
      columns, `businesses` carries an owner update policy, and **a record its
      subject can edit is not a record.** The timestamp is the server's clock
      for the same reason — a date typed into a box is not a record of when
      work happened.

      **Exercised live as the seeded admin:** `site` 200 storing
      `https://ridgelineautodetail.com` from a bare hostname typed without one
      (a scheme-less address in an `href` is a RELATIVE link — `/admin/…` —
      which fails by going somewhere plausible), `400 That is not a web
      address.` on rubbish, cleared back to null, and the audit row carrying
      the PREVIOUS address, which needed the lookup's own select widening.
      Six new checks, **all six baselined by breaking what they guard**;
      `platform-admin` **40/40**. Measured clean at 1440/392/320 in both
      states, **and LOOKING found what the sweep could not**: the example
      address in the empty field read as a real value directly above the line
      saying *No website yet*, so the screen appeared to contradict itself.
      `.pa-input::placeholder` is dimmed.

      **STAGE 4 SHIPPED 2026-09-05 — platform settings, which is HIS OWN
      PRICES and nothing else.** `platform_settings.prices jsonb` (the table
      already existed for the founding cap), `public.platform_prices()` for the
      public pages, `pricesFrom()` in `_shared/platformBilling.ts`,
      `livePricing()` in `app/src/landing/pricing.js`, a `prices` action, and
      *What we charge* on `/admin`. **The table and the editor shipped
      together, as this entry required.**

      **NULL MEANS THE FILES, AND THAT IS WHAT IT SHIPS AS.** Not a seeded copy
      of the current table: a seeded copy is a THIRD place the same numbers
      live, and the moment the files changed it would be the stale one that
      wins — silently, because it is the one with authority. **So the failure
      mode is yesterday's behaviour**: a null column, an unparseable object, a
      missing key or a price that is not a positive number all resolve to the
      built-in table, on both sides.

      **AND IT FALLS BACK WHOLE, NEVER FIELD BY FIELD.** A half-applied
      override is the worst of the three outcomes — one row's monthly beside
      one file's annual is a price nobody chose and it looks exactly like a
      working one. One bad figure discards the object.

      **THE TWO VALIDATORS ARE THE PRICE OF THE TWO TABLES.** `pricesFrom`
      (Deno) and `livePricing` (browser) spell the same rules because a Deno
      bundle cannot import out of `supabase/` — the wall that forced
      `_shared/brandColor.js` — and **§ 19 runs both on the same eleven inputs**
      so a table the PAGE would accept and the CHECKOUT would refuse cannot
      exist. **The editor validates with `pricesFrom` itself**, not a third
      opinion.

      **EVERY FIGURE ON BOTH PUBLIC PAGES NOW READS `P`, NOT `PRICING`** —
      twenty call sites — and two checks fail on a single `PRICING.` left
      behind in either component, because a half-converted page prints one
      number from the file beside another from the database. **Both were
      baselined by putting one back.**

      **Exercised live end to end:** an override of `$900/$55/$550/$69` (and
      founding `$450/$35/$350/$44`) reached the public pricing page complete —
      including the sentences it derives, *"$420 over 12 months"* and *"walking
      away halfway through costs $105"* — and the detailer's own billing screen
      charged **$3500/mo with $5500 struck and $45000 setup**, with the AB 2863
      consent sentence regenerated to match. Rubbish → 400 with a plain
      sentence. *Back to the built-in prices* → `$4000/$6000/$49900` exactly. A
      detailer → 404.
      `platform-billing` **283/283**, `landing-pricing` **67/67**,
      `platform-admin` **40/40**, build clean, `/admin` clean at 1440/392/320.

      **THE ONE THING IT REFUSES TO DO IS REFUSE.** The founding ladder's two
      rules (two months free, +25% for no commitment) are printed as a WARNING
      beside the fields and the form saves anyway — they are the owner's prices
      and his positioning, and `$999` rather than `$900` was his own call
      against the rounder number. **Question 3 in `docs/overnight-log.md` asks
      whether he wants it to refuse instead.**

      **WITH THIS, 4.4 IS COMPLETE.**

      **SPECIFIED 2026-09-04: `docs/platform-admin-2026-09-04.md`.** The owner
      asked for it in his own words — *"I need to have a dashboard myself where
      I can manage all of the detailers… I don't really know what features I
      need"* — **without having seen that it was already this item**, which is
      fair for something buried in Phase 4 of a 3,700-line file.

      **THE TEST FOR EVERY SCREEN IN IT: what will he otherwise do by hand, at
      11pm, with a SQL query, while a detailer waits on a text message?**
      Everything else is a dashboard for looking at, and those rot.

      **Three jobs:** *who are my customers and what state are they in* (one
      searchable list; **"last activity" is the column that earns its place** —
      no booking in three weeks means holiday or leaving, and both are worth
      knowing before the card fails); *what is going on with this one* (their
      setup — **reuse `lib/setup.js`'s seven-step progress rather than inventing
      a second completeness number** — their people, their work, their money,
      **their SITE**, and **his own free-text notes, the cheapest feature here
      and the one he will use daily**); and *do the thing without a developer*
      (**open-their-dashboard-as-them is the biggest single time-saver in any
      back office**, plus suspend, tier changes, manual creation, resend
      invite). **Four numbers across the top and no charts** — he has fewer than
      ten customers and every trend line is noise.

      **THE PLATFORM SETTINGS HALF NOW HAS A SPECIFIC JOB — HIS OWN PRICES,
      2026-09-05.** *"Everything that could be a changeable fact should be
      linked to Supabase."* **The audit that answered him is in DECISIONS.md**;
      what lands HERE is the one case a database genuinely wins: `PRICING` is
      typed twice on purpose (a Deno bundle cannot import out of `supabase/`,
      the wall that forced `_shared/brandColor.js`) and 241 checks are what keep
      the copies equal. **A `platform_prices` row makes them one.** It is
      deliberately NOT built ahead of this item: until there is a screen, a
      price change is a SQL statement, which is no more owner-editable than a
      file. **The risk is already contained either way** — every price is
      snapshotted onto `platform_subscriptions` at purchase and never re-read,
      so an edit cannot re-price somebody who already bought. **Build the table
      and the editor together, or neither.**

      **AND IT SHOULD SPLIT AND MOVE EARLIER.** 2.20 stage 2 needs *suspend*
      anyway, and the day he has three paying customers he needs the list.
      Order: suspend + the detailer's own billing page ride along with billing;
      the list and the per-business page come next; **the site columns wait for
      Phase 3, because that is when there are sites to track.**

      **SECURITY IS THE PART THAT IS NOT NEGOTIABLE.** This is the one screen
      where a bug exposes every tenant at once — everything else is RLS-scoped
      to one business and this deliberately is not. Gate in the DATABASE
      (`platform_admins`), a test proving a business owner gets nothing
      (`tests/staff-roles.test.mjs` is the shape), **impersonation logged every
      time**, and **its own route and layout — never a tab inside the detailer
      dashboard**, so it is not one CSS mistake away from a screen a detailer
      opens.

      **HE READ THIS AND THE JARGON MEANT NOTHING TO HIM** — *"I have no idea
      what that means. I have no idea what this whole paragraph means."*
      **Fair, and it is CLAUDE.md's own rule being broken.** In plain words,
      keeping both versions because the next session needs the first:
      **"impersonation" is the button that lets him see the app exactly as one
      of his detailers sees it**, so *"my Tuesday hours aren't showing"* takes
      thirty seconds instead of a twenty-message thread. **"Logged" means the
      system writes down that he did it — who, when, whose dashboard** — because
      it is somebody's private business data, and if a detailer ever asks *"were
      you looking at my numbers?"* he wants a record rather than a memory.
      **"It should split rather than wait" means this item is scheduled late but
      some of its pieces are needed early**: the *suspend* button comes free
      with the billing work, so build that bit then and the rest later, instead
      of treating the whole dashboard as one job stuck behind Phase 3.

## Phase 5 — Andrew's Auto Detail becomes tenant #1

- [ ] 5.1 Migration script: copy customers, bookings, services, history
      from the old project into the platform as a new business. Test on a
      copy first.

      **BUILT 2026-09-06 AND IT CANNOT BE RUN FROM THIS MACHINE — the box
      stays unticked for that reason and no other.** `scripts/legacy-map.mjs`
      (the rules), `scripts/import-legacy.mjs` (dry-run by default),
      `tests/legacy-import.test.mjs` (47 checks, four baselined) and
      `docs/migration-plan-2026-09-06.md`. **The access token in `.env`
      answers 403 for project `adtlnvihwrcqcasqcjwd`**, so the source database
      is unreachable; what is owed is one credential and it is the owner's.

      **THE MAPPING IS SEPARATED FROM THE PLUMBING BECAUSE THE MAPPING IS WHAT
      CAN BE WRONG.** A plumbing failure is loud — a 401, a constraint, a run
      that stops. A mapping failure imports cleanly and is WRONG: every job
      seven hours early, a discount charged as an extra, a total that no longer
      adds up to its own lines. **The owner would have to disbelieve his own
      records to find it.** So `legacy-map.mjs` is a pure function over plain
      objects and is fully tested with no database at either end.

      **THE CLOCK IS THE RISK.** The old `bookings` table stores a DATE and a
      TIME with no zone, because that site served one business in one place;
      this platform stores an instant. **Reading the pair as UTC moves eight
      months of history by seven or eight hours** — a 17:00 job lands on the
      next day. The conversion goes through `_shared/tz.ts`, the same code the
      product books with, and one check proves a January booking is an hour
      further from UTC than a July one, which is exactly what a fixed offset
      gets wrong.

      **IDS ARE PRESERVED WHERE BOTH SIDES USE UUIDS** — bookings, packages,
      add-ons, promo codes — so the run is IDEMPOTENT (a dry run, a fix and a
      real run cost nothing) and **every `/booking/:id` link the old site ever
      emailed still opens the right job here.** `customers.id` was a bigint,
      so that one map is built in memory and is why customers insert first.

      **AND FOUR THINGS DELIBERATELY DO NOT COME ACROSS**, each printed on
      every run rather than dropped quietly: the referral columns (4.2 item P
      is open — what a referral EARNS is a decision nobody has made), the old
      `add_ons` rows that are really DISCOUNTS (**a $25 discount imported as an
      add-on charges the next customer $25**), `monthly_plans` (a discount with
      no price is not this platform's plan — 4.3 closed into 2.14 for that
      reason), and `line_items` (a money line here needs a KIND, and one the
      receipt cannot draw is a total that stops adding up).
- [ ] 5.2 Parallel run: real bookings stay on the old site while **OWNER
      uses the platform daily** and reports everything missing or wrong.
      **OWNER — skipped 2026-09-06 and logged.** It is the owner working on
      the platform for a week; nothing here can do it for him, and 5.1 above
      is what makes it possible.
- [ ] 5.3 Domain cutover (andrewsdetail.com → platform) — LAST, only on
      owner sign-off. Nothing on the old site is decommissioned before.
      **OWNER — skipped 2026-09-06 and logged.** Its own text says "only on
      owner sign-off", and it points the live business's domain at this
      product.

## Phase 6 — The demo business

- [ ] 6.1 Invent a believable (clearly fictional, "Demo"-marked) mobile
      detailer; build its full site from tenant config only. Real stock
      photography — **OWNER supplies photos if sourcing fails; never gray
      boxes.**

      **HALF OF IT HAS EXISTED SINCE 2026-08-30 AND THE OTHER HALF IS BLOCKED
      ON HIS TASTE — 2026-09-06.** Coastline Auto Detailing is invented,
      obviously fictional, marked `is_demo`, and its BOOKING page is already
      drawn from tenant config alone. What is not built is its own marketing
      SITE, and that is exactly what `docs/tenant-site-research-2026-09-05.md`
      §7 is open about: **three pages passed every check in this repo and he
      still said they look AI**, so a fourth guess is how this item burns a
      third attempt. **What unblocks it is two or three detailer sites whose
      vibe he likes** — question 0 in `docs/overnight-log.md`.
- [ ] 6.2 Seed ~3 months of obviously-fictional history + a reset script
      proven to restore exact state. Must not consume a founding spot.

      **THE FOUNDING HALF WAS BEING BROKEN AND IS FIXED — 2026-09-06.**
      `20260906004000_demo_businesses.sql` adds `businesses.is_demo` and
      excludes it from **both** `founding_offer()` and
      `claim_founding_spot()`. They had to move together: a count that
      ignores demos beside a claim that does not would advertise a spot and
      then refuse it.
      **The requirement has been in this line since the roadmap was written
      and the product started breaking it on 2026-09-05**, when 2.20 stage 2
      seeded the demo as `founding` so the struck prices would be the default
      swept state. That reasoning is still right and the demo is still
      founding; what changed is that **the public page stopped printing "2 of
      3 left" when three were.** Harmless while nobody has signed up, and **a
      false scarcity claim the day a real detailer takes the second** — the
      class of statement `/pricing` refuses everywhere else. Measured:
      `founding_offer()` now answers `{"left":3,"total":3}` with the demo
      still `plan_tier = 'founding'`.

      **AND "PROVEN TO RESTORE EXACT STATE" IS NOW A CHECK RATHER THAN A
      PRINTED NUMBER.** *Exact* is the wrong word and the seed says so: every
      date is relative to today (that is the point — the demo has a today, a
      tomorrow and a history whichever day it runs) and every id is generated.
      **What is restorable is the SHAPE**, and `seed-demo.mjs` now reads back
      what it wrote and exits 1 on any mismatch. It already PRINTED its counts;
      a printed count is one nobody reads on a green run, and a half-finished
      seed printed a smaller number and the word "ready" in the same breath —
      whose first symptom is a sweep reporting `NO SUCH ROW` on a screen that
      is merely empty. Baselined: an expectation off by one prints *"expenses:
      wrote 12, meant 13"* and stops.

      **The ~3 months was already there and is nearer eight** — 31 bookings
      spread back 223 days, including the five lapsed clients roadmap 2.19
      needed.

## Phase 7 — Launch readiness

- [x] 7.1 ~~/terms and /privacy placeholders + support policy in the footer.~~
      **BUILT 2026-09-06.** `app/src/landing/LegalPage.jsx` (one component,
      two routes — they are the same page with different words), the content in
      `app/src/landing/legal.js`, and the support policy in `Foot()`, which
      every marketing page already renders.

      **"PLACEHOLDER" IS THE ROADMAP'S WORD AND IT IS NOT BOILERPLATE.** The
      tempting build is two pages of borrowed text about arbitration, governing
      law and limitation of liability — clauses nobody here has decided, on a
      product with no lawyer yet. **That is worse than nothing: it is a promise
      the owner has not made, in language he cannot check**, and check 10g
      fails on any of those words appearing.
      So every line is a FACT about what this product does, and most of them
      are commitments `/pricing` has been printing in public since 2026-09-05 —
      the twelve-month term, the exit fee, two weeks of retries, that nothing
      is deleted. Writing those down invents nothing; 10h pins that the two
      pages keep saying the same thing. **Both pages say at the TOP that a
      lawyer has not seen them**, above the sections rather than in a footnote,
      because a reader who learns that at the bottom has read the whole thing
      on a wrong assumption.

      **THE FOOTER LINE IS A POLICY, NOT A "CONTACT US".** Who picks it up and
      how long you wait is the question somebody handing over a business is
      actually asking, and both fit on one line. `SUPPORT_EMAIL` there is the
      second copy of `_shared/platformBrand.ts`'s — the wall that already
      forced two price tables — and 10b/10c pin them equal, address and phone.

      Six new checks in `landing-pricing` (**80**), three baselined by breaking
      what they guard. `sweep-widths.mjs` walks both pages at every width, added
      in the change that built them. Measured clean at 1440, 392 and 320 with
      no console errors, and **every `data-rv` row reaches opacity 1 after a
      scroll** — checked explicitly, because this surface has already shipped a
      node that never revealed and no other check in the repo can see one.
- [ ] 7.2 Sentry error monitoring with PII scrubbing, proven with a fake
      record. **OWNER supplies the DSN.**

      **SKIPPED 2026-09-06 AND LOGGED — the item's own line says why.** Every
      part of it that could be built without the DSN would be built UNPROVEN:
      the whole value is the scrubbing, *"proven with a fake record"* is this
      item's own acceptance test, and a scrubber nothing has watched is
      exactly the kind of check this repo refuses to count. It would also add
      the fifth dependency to a frontend that has four. **One free Sentry
      project and one DSN is his ten minutes**, the same shape as the Google
      sign-in item (2.25).
- [x] 7.3 ~~Final end-to-end pass as a brand-new business AND as staff,
      written to docs/final-pass.md, every rough edge ranked:
      blocks-launch / embarrassing / cosmetic.~~ **DONE 2026-09-06 —
      `docs/final-pass.md`, walked by `scripts/final-pass.mjs`**, which builds
      its own throwaway tenant on the platform project, signs in as both
      people at 392 and 1440, and deletes the business AND both logins again.

      **ONE BLOCKS-LAUNCH FINDING, and it was already known and unranked: there
      is no way to reset a password.** No link on the sign-in screen and no
      `resetPasswordForEmail` anywhere in `app/src`. **It is the one thing that
      stops a real detailer using the product**, and it will happen to the
      first person who signs up and comes back in a fortnight. Item N gets a
      rank from this pass.

      **THREE EMBARRASSING ONES, and the first is the interesting one: TAPPING
      A RAIL BUTTON DURING FIRST RUN ENDS BOTH THE SETUP FORM AND THE TOUR, FOR
      GOOD.** Navigating away writes `setup.seen`, and an owner's tour only
      follows a form that auto-opened — so the sequence a whole roadmap stage
      was spent on can be lost by one curious tap in the first ten seconds.
      Both remain reachable (*Finish setting up*, *Show me around*), neither is
      offered again. Then: an empty dashboard leaves **most of a laptop screen
      blank** (Clients at 1440 ends 260px down a 900px viewport), and **Today
      offers the booking link before there is anything to book** — the booking
      page itself is honest about it, Today is silent.

      **WHY A NEW BUSINESS RATHER THAN THE DEMO:** every other browser script
      here drives `demo-detail`, which has 31 bookings and four plans. **A
      screen that is handsome with data and blank without it is a screen nobody
      has seen the way its first user will**, and three of the findings are
      invisible to every automated check in this repo because they are about
      proportion, sequence, and what a screen does not say.

      **And a doc figure drifted, found by measuring:** CLAUDE.md says the tour
      is *"4 for staff"*; it is **3** for a member with one permission tick,
      and **6 for an empty owner**, which is right.
- [ ] 7.4 **OWNER: founding-offer pricing sanity check** ($499 setup /
      $40 mo, counted spots) before the first sales call.

      **OWNER — skipped 2026-09-06 and logged.** It is marked OWNER in its own
      first word. Two things that were not true when it was written now are:
      the counted spots read **3 of 3** rather than 2 (roadmap 6.2 stopped the
      demo consuming one), and **he can change every figure himself** from the
      back office without a developer (4.4 stage 4), so this is now a decision
      he can act on in the same minute he makes it.

- [x] 7.5 ~~**`app/index.html` has no meta description and no Open Graph tags.**~~
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

      **BUILT 2026-09-06, AND THE IMAGE IS DELIBERATELY STILL ABSENT.** A
      description, five Open Graph tags and three Twitter ones, with the copy
      taken from PRODUCT.md § Positioning in its order — the website leads,
      the dashboard is not an accessory. Six checks in `landing-pricing`
      (**86**), three baselined.
      **`summary`, NOT `summary_large_image`**: the large card promises a
      picture and draws an empty box when there is none, so the card type and
      the image have to move together — which is what 11d pins, in both
      directions. **An OG image invented tonight would be a brand decision
      made by a session**, on a white-label platform that has no logo on
      purpose.
      **AND THE LIMIT IS WORTH KNOWING BEFORE SOMEBODY REPORTS IT AS A BUG:
      one `index.html` serves all three surfaces, so a shared BOOKING link
      shows the platform's card rather than the detailer's.** It cannot be
      fixed from here — a crawler does not run the JavaScript that knows whose
      page it is — and prerendering those routes is its own item (item Q
      below). The TITLE is already right on a booking page, because
      `BookingBusinessContext` sets `document.title` for a real visitor.

## Not on the roadmap yet — found 2026-09-04, awaiting the owner

**These are gaps in the PLAN, not bugs in the code.** They were found while
answering his question *"is there anything we haven't thought of"* at the end of
roadmap 2.14 step 1, by reading the roadmap against the code rather than against
itself. **None is scheduled and none should be started without him saying
where it goes.** Each says what it is, what happens if it is skipped, and the
recommendation.

- **F. ~~A CUSTOMER CANNOT MOVE THEIR BOOKING~~ BUILT 2026-09-06.**
  `available-slots` takes an optional `exclude_booking_id` and
  `ManageBookingPage`'s reschedule picker passes the booking's own id — the one
  call in the product where availability means *what is free FOR THIS BOOKING*
  rather than *what is free*, because its own slot is free for it.
  **Proven against the live function rather than reasoned about:** a
  330-minute booking at 08:00 on an 08:00–18:00 day gave **0 free times
  counting itself and 10 excluding itself**, with its own 08:00 among them; a
  malformed id changes nothing. `tests/booking-core.test.mjs` § 12 (five
  checks, three baselined) pins the shape check, that the exclusion narrows the
  BOOKINGS query and nothing else, and that **no other caller passes it** —
  every other one is asking what is free, and a second caller would offer
  somebody a time another booking already has.
  **AND FIXING IT BROKE THE TEST THAT FOUND IT, which is the part worth
  keeping.** `e2e-booking` asserted *"the old time is free again"* after a
  move. Until now the only times ever OFFERED for a move were far from where
  the booking already was — because it blocked its own neighbourhood — so the
  old slot was always free afterwards. With the fix the picker's first
  different chip is the ADJACENT half hour, and a booking that moves 08:00 →
  08:30 makes 08:00 genuinely unbookable. **The assumption broke, not the
  product**, and asserting the old way would have been asserting the engine is
  wrong. The check asks the question it always meant now — free, or covered by
  where the booking went — and the full run is **82/82 on both tenants**.
  The finding as written:

  **F. A CUSTOMER CANNOT MOVE THEIR BOOKING TO ANOTHER TIME ON THE SAME DAY
  WHEN THEIR OWN BOOKING IS WHAT FILLS IT — found 2026-09-05, while running
  `e2e-booking` for roadmap 2.20 stage 2, and it is in code that item did not
  touch.** `available-slots` has **no exclusion parameter**, so it cannot know
  about the booking being MOVED: it counts that booking as occupied exactly
  like any other. If the day's only remaining room is the slot the booking is
  already in, the day has zero free slots **for its own occupant** and drops
  out of its own reschedule picker. The customer can still move to another
  day, so nothing is broken — they simply cannot do the most obvious thing,
  which is shift an hour later.
  **IT IS DATE- AND OCCUPANCY-DEPENDENT, WHICH IS WHY NOTHING CAUGHT IT FOR
  MONTHS.** It only bites when the booked service is long enough to swallow
  what is left of that day, so the e2e passed on most dates and failed on
  2026-09-05 because the run picked a Tuesday the demo seed had already half
  filled. **Reproduced twice; the demo's other tenant passed the same check in
  the same run**, which is what proved it was the day rather than the code.
  **The fix is one optional parameter** — `exclude_booking_id` on
  `available-slots`, passed by `ManageBookingPage`'s `loadSlots` — and it is
  small. It is not scheduled because it is a change to the customer booking
  path, which is the one place in this product where a small change deserves
  its own item and its own `e2e-booking` run.
  **`e2e-booking` reports it as ONE failure with the diagnosis printed**, which
  it did not before: the day-chip assertion is followed by a move, and the
  script used to assert about the ORIGINAL date whatever day it had actually
  clicked — so one root cause printed as two failures, the second pointing at
  the slot engine. It follows the day it clicked now. **A leg that reports the
  wrong half is worse than one that reports nothing.**

- **A. TAKING MONEY — ANSWERED 2026-09-04. IT IS ROADMAP 2.20 NOW**, researched
  (`docs/payments-research-2026-09-04.md`) and scoped in three stages. He
  confirmed the priority himself: the recurring one, detailers paying him,
  *"I'm not gonna do it manually."* The rest of this entry is kept as the
  finding that produced it. **THERE IS NO PAYMENT ANYWHERE, IN EITHER
  DIRECTION.** No Stripe, no card on file, no capture anywhere in the
  repo. Two separate holes: **(1) a detailer's customer paying the detailer**
  — deposits, invoices, and any plan that claims to be a subscription (2.14);
  **(2) the platform charging the detailer** — the founding offer is $499 setup
  and $40/month and *"nothing charges anyone"*. 7.4 is only a **pricing sanity
  check**, not a build. **Skipped:** he can still launch — money is collected
  the way it is today, in person or by his own invoicing — but he cannot bill a
  subscriber, and every plan page has to say so honestly. **Recommendation: one
  item, in Phase 4, and it decides both directions at once**; it is the single
  biggest unscheduled build left and it also unblocks 2.14's richer shape.
- **B. THE DEMO LOGIN IS GUESSABLE AND ON THE LIVE SITE.**
  `demo@detailplatform.com` / `demo123`, deliberately, so the dashboard could be
  looked at. **Skipped:** anyone who guesses it edits the demo business — today
  that is nothing, on launch day it is a public account on a product with
  paying tenants. **Recommendation: a Phase 7 item to rotate or remove it, and
  every script that logs in reads the credential from `.env` instead.**
- **C. ANSWERED 2026-09-04 — HE SAID YES AND IT IS ROADMAP 2.21 NOW.**
  **NOBODY CAN SPAM THE BOOKING PAGE TODAY, AND NOTHING STOPS THEM.** There
  is no rate limit, no captcha and no honeypot on `create-booking`, which is
  public by design — and since 2.12 a **request holds the slot**, so filling a
  detailer's whole week costs a bot nothing. **Skipped:** one bored person can
  take a detailer's calendar offline. **Recommendation: a small Phase 7 item —
  a per-IP and per-phone throttle in the edge function is most of it; no
  captcha, which costs the customer more than it costs the attacker.**
- **D. ~~IF THE REMINDER CRON STOPS, NOBODY FINDS OUT~~ BUILT 2026-09-06.**
  `job_heartbeats` (one row per job, upserted — *when did it last run* is the
  whole question), `note_heartbeat()`, and one line on `/admin` under the four
  figures: *"Reminders ran 4 minutes ago · Plan visits ran 9 hours ago"*, which
  goes `pa-bad` when a job is past its window (three missed runs for the sweep,
  a day and a half for the accrual).
  **THE SWEEP STAMPS ITSELF FROM THE EDGE FUNCTION, NOT FROM THE CRON
  STATEMENT, and that is the load-bearing choice.** The scheduled job is a
  `net.http_post`, which succeeds the moment the request is queued: a stamp
  there proves the SCHEDULER is alive and says nothing about whether the thing
  it calls still works — **which is the more likely of the two to break, and
  the one that broke in roadmap 0.2.**
  **IT RECORDS THAT A JOB RAN, NOT THAT IT WORKED**, and the difference is
  stated rather than hidden: it cannot see a bounced email, because
  `sendTenantEmail` is best-effort by design and must stay that way. What it
  can see is the thing nothing else can — **that the job is not running at
  all**, the failure with no other witness.
  **SHOWN WHETHER OR NOT ANYTHING IS WRONG**, because a monitor that only
  appears when it is unhappy cannot be told apart from one that is no longer
  wired up. **A job that has never reported counts as STALE**, since that is
  also what a dropped table looks like — and a second migration seeds both rows
  at install, because a monitor that cries on the day it goes in is one
  somebody ignores by the end of the week.
  **The heartbeat is best-effort inside the sweep**: one that could fail a
  sweep would be a monitor causing the outage it watches for.
  Verified in three states by looking — healthy, stopped two hours ago, never
  reported — and the first version printed *"Reminders LAST RAN today"*,
  because `ago()` bottoms out at a day and says nothing about a job that runs
  every fifteen minutes. Ten checks in `tests/platform-admin.test.mjs` § 10,
  three baselined.
  **7.2 (Sentry) is still open and is still the owner's DSN**; this is the half
  that needed no key.
  The finding as written:

  **D. IF THE REMINDER CRON STOPS, NOBODY FINDS OUT.** `pg_cron` runs the
  reminder sweep; a failure is silent, and the same family of invisible failure
  has already bitten twice (the dead email relay in 0.2, VAPID keys never set).
  7.2 adds Sentry for the FRONT END. **Recommendation: fold a heartbeat into
  7.2 — the sweep writes a timestamp, and something checks it is recent.**
- **E. THE BACKUP HALF IS ROADMAP 2.22 NOW — his own idea, 2026-09-04, and it
  works on the free plan.** Staging is still unscheduled.
  **NO BACKUPS, NO RESTORE DRILL, NO STAGING — AND "no backups" IS NOW A
  MEASURED FACT, NOT A SUSPICION (2026-09-04): Supabase's FREE PLAN INCLUDES NO
  BACKUPS AT ALL.** Daily backups with 7-day retention start on **Pro, $25/month
  per project**. Also on free: 500 MB, two projects, and a pause after 7 days
  with no requests. One Supabase project holds
  every tenant's bookings and customers, `main` publishes on push, and there is
  no second environment to try anything against. **Skipped:** a bad migration
  or a wrong `delete` on launch day has no undo that anyone has ever tested.
  **Recommendation: a Phase 7 item — confirm what Supabase's plan retains,
  take one manual export, and restore it once to prove it works. A staging
  project is the bigger version and can wait for the first paying tenant.**
- **F. THE PRODUCT SENDS EMAIL AND THE TRADE SENDS TEXTS.** `on_my_way`,
  reminders and confirmations are SMS in four of the six products
  (`docs/email-research-2026-09-03.md`), and detailing is the trade where the
  customer is standing next to the car. We send email only, and there is no
  item for SMS. **Skipped:** a real gap against competitors, and it costs money
  per message. **Recommendation: ask him, do not schedule it — it is a
  per-tenant cost decision, not a technical one.**
- **G. ~~A DETAILER WHO GETS STUCK HAS NOWHERE TO GO~~ BUILT 2026-09-06, in
  the smallest useful version this entry itself recommended.** One address and
  a promise about TIME, in the gear's account block, above Sign out: *"Stuck on
  something? One person answers, same working day."*
  **IN THE ACCOUNT BLOCK RATHER THAN A ROW OF ITS OWN** — a row that opens a
  page to show one `mailto:` is a row that wastes the tap it cost.
  **AND `app/src/lib/support.js` IS THE ONE HOME.** 7.1 had put the address in
  `landing/legal.js` for the marketing footer, which is the single surface a
  detailer never looks at again once they have signed up; the dashboard needs
  the same one, and `legal.js` re-exports it. `landing-pricing` 10b/10c pin it
  against `_shared/platformBrand.ts` — the third copy the Deno wall forces and
  the only one allowed — and 10i/10j pin that the dashboard carries it and
  reads it from that one home.
  **No help centre, no ticket form, no chat widget:** he has fewer than ten
  customers and the honest answer to *"where do I go"* is his inbox.
  The finding as written:

  **G. A DETAILER WHO GETS STUCK HAS NOWHERE TO GO.** No help text, no support
  address, no way to ask a question from inside the dashboard. 7.1 mentions a
  support policy in the FOOTER of the marketing page only. **Recommendation:
  smallest useful version in Phase 7 — one support email address, shown in the
  gear, and it is his inbox.**
- **H. ~~A DETAILER WHO LEAVES CANNOT TAKE THEIR DATA~~ BUILT 2026-09-06,
  folded into 4.4 exactly as this entry recommended.**
  `20260906005000_export_business.sql` + an `export` action + *Export
  everything* on a business's page, which hands over one JSON file.
  **THE TABLES ARE DISCOVERED, NOT LISTED.** A hand-written list of twenty-odd
  tables goes stale the first time somebody adds one, and **the failure is
  silent**: the export succeeds, the file looks complete, and the missing table
  is found by the person who no longer has it. The function asks the catalog
  for every table with a `business_id` — the same definition of *belongs to a
  business* every RLS policy already uses — so **a table added tomorrow is
  exported tomorrow, with nobody remembering.** Measured on the demo: **31
  tables, 31 bookings, 13 customers, 88 KB.**
  **TWO THINGS ARE OURS AND DO NOT LEAVE IN IT:** `platform_admin_events` (the
  record of what we did to their account, including who signed in as them) and
  `businesses.admin_notes_platform` (the private note about the customer, on a
  row they otherwise own entirely — which is exactly how it would slip out).
  **`platform_subscriptions` and `platform_invoices` ARE in**: what they paid
  us is their record too, and it is the half an accountant asks for.
  **THE SECURITY FLOOR HOLDS, PROVEN LIVE:** the RPC is service-role only, so a
  signed-in admin's own browser calling it directly gets **403**; the export
  goes through the gate like everything else (a detailer gets 404, anon 401);
  and it is LOGGED even though it writes nothing, with the table count rather
  than the file, because *who took a copy and when* is exactly what a detailer
  is entitled to ask. It is DOWNLOADED rather than displayed — a screen that
  prints every customer is a screen somebody leaves open.
  **AND PRESSING THE BUTTON FOUND A DEFECT NOTHING ELSE HAD:** every
  confirmation on `/admin` was set and then wiped by the refresh that followed
  it, in the same tick — *"Saved."*, *"Suspended"*, *"Invite sent to…"*, none
  of them ever on screen long enough to read. The action worked, the list
  refreshed, and the only thing missing was the sentence saying so.
  The finding as written:

  **H. AND A DETAILER WHO LEAVES CANNOT TAKE THEIR DATA.** 4.4 can suspend a
  business; nothing exports one. **Skipped:** it is also the answer to a
  customer-data deletion request, which is the one legal ask that arrives
  without warning. **Recommendation: fold "export a business" into 4.4** —
  `lib/accountant-export.js` already does the hard half for money.
- **I. THREE THREADS 2.18 LEFT ARE STILL OPEN AND ARE NOT ITEMS ANYWHERE:** the
  root SPF record (his DNS), `formatDateLong`'s hardcoded `en-US`, and a
  separate Resend account so the platform's mail stops sharing a sending
  reputation with Andrew's real customer mail. **AND THE BLOCKER ON THAT THIRD
  ONE IS NOW KNOWN: Resend's free plan allows ONE domain**, plus 3,000
  emails/month and **100 A DAY** — at ~5 emails a booking that is ~20 bookings
  a day across every tenant, and a rejected send is invisible because
  `sendTenantEmail` is best-effort. **Pro is ~$20/month.** **Recommendation: the SPF record
  and the Resend account belong in Phase 7; the `en-US` is a one-line fix
  whenever a tenant outside the US exists.**
- **J. ~~THE WEBSITE INTAKE FORM IS DESCRIBED IN 3.4 AND SCHEDULED
  NOWHERE~~ — THE QUESTIONS HALF IS WRITTEN: `docs/tenant-site-intake.md`
  (2026-09-06). THE EXAMPLES HALF IS BLOCKED ON HIS TASTE.**
  **THE RULE THAT SHAPES IT: only ask what the product does not already know.**
  Half of what a site needs is in the database because the detailer typed it
  into their dashboard — services, prices, hours, travel area, colour, gallery,
  reviews, FAQs, payment handles, all twelve of contract § 2 — so **an intake
  that asks for services is one that asks them to type their business in twice,
  and creates a second copy that goes stale the day they change a price in
  their pocket**, which is the one thing this product promises they can do.
  Every one of the twelve questions is one the database cannot answer: their
  story, what they refuse to do, what they are proud of, what they dislike
  about their current site, and what they actually want a visitor to DO.
  **THE EXAMPLES ARE NOT BUILT AND MUST NOT BE FAKED.** He asked for questions
  *"with examples to choose from"*; the three worked pages in
  `docs/tenant-sites/` passed every check here and **he still said they look
  AI**, so showing them would be asking a detailer to pick from three things we
  already know are wrong. Question 0 in `docs/overnight-log.md` is what unblocks
  it.
  **It is deliberately a document rather than a screen**: there is no website
  customer yet, and a screen with an empty examples section is half a feature.
  The finding as written:

  **J. THE WEBSITE INTAKE FORM IS DESCRIBED IN 3.4 AND SCHEDULED NOWHERE.** His
  own words: most detailers *"will not know what they want in the abstract"*.
  **Recommendation: make it a 3.1 deliverable** — it is the input to every
  bespoke site and it is the first thing a new website customer meets.
- **K. PHASE 4.3 IS A DUPLICATE OF 2.14.** *"Monthly plans — needs a design
  conversation first"* predates this item and describes the same feature.
  ~~**Recommendation: close 4.3 into 2.14 once the shape is settled**~~
  **DONE 2026-09-04 — 2.14 shipped and 4.3 is ticked and struck through.** Its
  one live question — how a plan should charge — survives as item A above and
  belongs to 2.20 (payments).

- ~~**L. THERE IS NO WAY FOR A DETAILER TO REACH HIM**~~ **ANSWERED AND BUILT
  2026-09-05, the same day it was raised.** His mobile and
  `support@detailingplatform.com` (iCloud+, his choice) are ONE constant in
  `_shared/platformBrand.ts` — the billing emails sign off with them through
  the brand's own footer, and the billing screen is SENT them on `summary`
  rather than holding a copy, because three facts had already been found in
  two files each that day and this is the one where being stale means a
  detailer whose page is dark dials a stranger. **The footer also stopped
  promising a reply it could not deliver**: *"reply to reach us"* is true of
  tenant mail, where `contactEmail` becomes Reply-To, and was false on the two
  emails where somebody most needs a person. **STILL OWED BY HIM: the iCloud+
  custom domain is not set up, so that address does not RECEIVE yet** — the
  phone is the one that works today, and nothing real has been sent.
  Original wording below.
- **L (as raised). THERE IS NO WAY FOR A DETAILER TO REACH HIM — no support email, no
  phone number, no postal address anywhere in the product, found 2026-09-05
  while auditing which facts are typed twice.** `/pricing` promises *"one
  button in your own account… no phone call, no email and nobody to talk out of
  it"*, which is a good promise about CANCELLING and is not an answer to
  *"my card was charged twice"*. The two billing emails go out with no reply
  path either. **The day money starts moving, an unanswered billing email
  becomes a chargeback** — DECISIONS.md said so before any of this was built,
  and then nothing was built for it. **Recommendation: one `support@` address
  in the billing emails' footer and on the billing screen, before the first
  real charge — not a help centre.** It is his to choose because it is his
  inbox that receives it.
- **M. ~~THERE IS NO `/terms` AND NO `/privacy` ROUTE.~~ CLOSED 2026-09-06 BY
  ROADMAP 7.1.** Both exist, both are public, and the footer of every marketing
  page links them beside a support policy. The original finding, kept because
  its reasoning is still the reason the AB 2863 block did NOT move:** The entire legal surface
  of the product is 80 lines of JSX inside `PricingPage.jsx` — the AB 2863
  disclosure, the refundability of the build fee, what happens when you leave.
  **That block is correct and well-placed** (the statute wants it before
  billing details, not on a page nobody opens); the gap is that there is
  nothing to LINK to from an email footer, from Stripe's own receipts, or from
  the footer of the marketing page. **Recommendation: Phase 7, alongside the
  Resend domain and the SPF record** — it is launch paperwork, and the
  disclosure that legally matters already exists.
- **Q. A SHARED BOOKING LINK SHOWS THE PLATFORM'S CARD, NOT THE DETAILER'S —
  found 2026-09-06 while doing roadmap 7.5.** One `index.html` serves the
  marketing page, every tenant booking page and the dashboard, so the Open
  Graph tags added by 7.5 describe the platform — and a detailer texting
  `/book/their-slug` to a customer gets a card headlined *"A website for your
  detailing business"*, which is an advert for us on their message.
  **It cannot be fixed from the app.** A crawler does not run the JavaScript
  that knows whose page it is; the TITLE is already right for a human, because
  `BookingBusinessContext` sets `document.title` the moment the profile loads,
  but a scraper never gets there.
  **The fix is prerendering those routes**, which on Netlify is either an edge
  function that rewrites the head per slug or a build step that emits one HTML
  file per tenant. The first is small and reads the same public RPC the page
  does; the second does not survive a detailer changing their name.
  **What it costs to skip:** every shared booking link and every Google result
  for a tenant page carries our words instead of theirs. It matters the day a
  detailer has customers, which is after 5.2 — **recommendation: after the
  first tenant site is real, not before**, because the same edge function is
  what a tenant site would need anyway.
- **O. GOOGLE CALENDAR SYNC PER TENANT IS AN OAUTH FLOW, NOT A PORT — roadmap
  4.2, 2026-09-05.** The old site's `create-calendar-event` signs a JWT for ONE
  Google service account and writes to ONE calendar id, both of them
  environment variables. **That shape cannot serve ten detailers**: each one
  would have to grant this platform access to their OWN calendar, which means
  a Google Cloud OAuth client, a consent screen Google has to review because
  calendar scope is sensitive, a refresh-token store per tenant, and a
  reconnect path for when a token is revoked. **Skipped:** a real convenience
  the trade expects — a job that does not appear in the calendar they already
  live in is a job they check the app for.
  **Recommendation: ask him whether it is worth it before anyone builds it.**
  The cheap 80% already exists and nobody has said it is not enough — every
  booking email carries an `.ics` attachment, which adds the job to whatever
  calendar they use in one tap, and `booking-ics` has been live since Phase 0.
  The expensive 20% is that it stays in step when a booking MOVES.
- **P. WHAT DOES A REFERRAL EARN? — roadmap 4.2, 2026-09-05.** The old site
  added `customers.referral_code`, `customers.referred_by`,
  `bookings.referral_code_used` and `completed_washes_count` **and no logic at
  all** — nothing granted anything. `completed_washes_count` came across into
  this platform and roadmap 2.11 stage 5 found it dead there too, so a third of
  a feature has been carried twice.
  **This is a business decision and inventing one is exactly what this repo
  forbids.** The questions are small and only he can answer them: does a
  referral give the NEW customer a discount, the EXISTING one a credit, or
  both? How much, and is it a percentage or an amount? Does a loyalty count
  ("every fifth wash") exist at all, and is it per detailer? **Skipped:** the
  most common growth feature in the trade, and four columns that look like it
  is half-built.
  **Recommendation: one paragraph of answer from him, then it is a normal
  build — and if the answer is "not yet", DROP `completed_washes_count`**,
  because a column nothing maintains is what this repo flags everywhere else.
- **N. ~~RANKED *BLOCKS LAUNCH*~~ BUILT 2026-09-06, HOURS AFTER THE PASS THAT
  RANKED IT.** *"I forgot my password"* on the sign-in screen, `/reset` where
  the emailed link lands, and *Your password* behind the gear for the ordinary
  case. `tests/password-reset.test.mjs` (18 checks, four baselined).
  **Exercised against a REAL recovery link** rather than described: a new
  password saved, signed straight into the dashboard, the new password proved
  against the auth API, **and the same link then refused with "That link has
  expired"** — which is the ordinary second case, because a link works once and
  mail scanners follow them. The settings screen changed a password at 1440 and
  the next sign-in used the new one.
  **THREE THINGS IN IT ARE INVISIBLE FROM THE SCREEN and are what the test
  holds.** The confirmation says *"If we have an account for…"* and **never
  reports the error**, because "no account with that email" turns a sign-in
  form into a way of asking which addresses are customers of ours — the same
  reasoning that made `plan-link` take an email IN and send a link OUT. The
  page **never reads the URL hash itself**: `detectSessionInUrl` has already
  consumed and cleared it before React mounts, so a page that looks would find
  an empty hash and call a working link bad. And the gear row is gated by
  **nothing**, because a password belongs to the PERSON rather than the
  business — staff are exactly the people handed one by somebody else.
  **Both screens ask for it twice**, because the failure being fixed is a
  lockout and a typo makes another one, from the page that was the way back.
  The original finding follows:

  **N. RANKED *BLOCKS LAUNCH* BY ROADMAP 7.3's FINAL PASS, 2026-09-06.** It
  was written down and left unranked; the pass confirmed it by looking (no
  *forgot your password* on the sign-in screen, and no `resetPasswordForEmail`
  or `updateUser` anywhere in `app/src`) and ranked it: **it is the one finding
  in that whole pass that stops a real detailer using the product**, and it
  will happen to the first person who signs up and comes back a fortnight
  later. Supabase does the sending; what is missing is a link on the sign-in
  screen, a `/reset` route, and one row behind the gear.
  **N. THERE IS NO WAY TO RESET — OR EVEN CHANGE — A PASSWORD. Found
  2026-09-05 by roadmap 4.1's audit of `reference/`, and it is the only genuine
  gap that audit found.** `resetPasswordForEmail` appears nowhere in
  `app/src`; neither does `updateUser`; there is no `/reset-password` route.
  A detailer who forgets their password cannot ask for a link, and one who
  wants to CHANGE it — after sharing it, after a staff member leaves — has no
  screen to do it on. **A recovery link triggered by hand would sign them in
  and STILL leave them unable to set a password**, because
  `detectSessionInUrl` is on by default and there is no screen to land on:
  the confusing kind of broken rather than the obvious kind.
  **The old site had exactly the half this one is missing the other of** —
  `reference/frontend/src/pages/ResetPasswordPage.jsx` is a complete landing
  page and nothing in that repo ever requested a link, because Andrew was the
  only user and could have it done in the Supabase dashboard. **That stops
  working at the second detailer**, whose support channel becomes "email the
  developer" at whatever hour, and 4.4's platform admin — the screen that
  would let the owner do it for them — is the last item in Phase 4.
  **Skipped:** a detailer locked out of their own business until somebody
  answers a text, and no way for anyone to rotate a shared password.
  **Recommendation: build it, and it is small** — a *Forgot your password?*
  link on `Auth.jsx`, a `/reset-password` route lifted from the old page, and a
  *Change password* screen behind the gear. One screen and two calls. It is an
  AUTH surface, which is the only reason it was written here rather than built
  on the night it was found. Full account: `docs/reference-audit-2026-09-05.md`
  § A1.

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
| 2.14 — plans a detailer logs | **CLOSED 2026-09-04 — all three steps.** `impeccable` was used on the settings screen and on the booking page's plan surfaces | direction-generating skills. **The item is done; do not reopen it as a design question.** What it left behind for the next session that touches plans: every booking step's spare room is unchanged and measured (10px on step 1 at 1440x900), the plan's effect on the price is `planLineFor` in `_shared/pricing.ts` and rides `price_adjustments`, and `sweep-booking-steps.mjs` now walks the plans page, the plan-attached flow, a remembered customer and a member's own page |
| 2.24 — a guide on every tab | `impeccable` for the overlay's placement, which is measured rather than guessed. **Read `Walkthrough.jsx`'s header first — six rules and the owner's three constraints are the specification** | writing a step that reads a control's own label back. That is what he called weird, and it is his 2026-09-01 copy rule pointed at a tour. **Also never: a sentence naming a position or a gesture** — the bottom bar is a left rail at a desk |
| 2.20 — taking money | `impeccable` for the pricing page, the checkout and the past-due screens; `security-review` is **not optional** on any stage touching a key or a webhook | direction-generating skills. **Stages 1 and 2 are SHIPPED and neither is a design question any more.** The pricing page is the legally load-bearing half of the checkout, so a session that reshapes it re-reads AB 2863 first: never a pre-selected plan, never a "most popular" badge, never an "effective monthly" as a rung's headline figure. **And on the billing screen: the cancel button stays ONE press behind ONE confirm with the exit fee printed BEFORE it, the consent tick is never folded into the button, and the screen never computes a figure the server did not send.** **The audit's own finding, because it will recur: a sentence carrying a legal disclosure may not sit in a `nowrap` line** — `.row-item .sub` clipped *"You are committing to twelve months"* off a phone entirely, and no check in this repo can see clipped text, because an ellipsis has a perfectly normal box. What is left is stage 3, Connect |
| 2.25 — the sign-up screen and Google | `impeccable`, five swept widths. **Read the repo before writing anything**: Google sign-in is already built and merely switched off in Supabase, and the landing page already has both buttons | building Google sign-in again. Also never: renaming `Auth.jsx`'s email, password or `form button.btn.primary` selectors without updating `sweep-widths.mjs`, which signs in through them on every run |
| 2.23 — the maintenance deadline | `impeccable` for whatever screen it lands on | folding it into a cadence field. **It is a DATE with a consequence, an escalating reminder and a last-done stamp** — 2.14 shipped cadences without it on purpose |
| 2.12 — request-vs-reserve, accept, quotes | none — this is engine, schema and edge-function work, not a visual item. `impeccable` only if it adds a screen 2.11 did not already design | design skills. **Do not start it inside 2.11**: 2.11 leaves the accept state designed and empty on purpose |
| 3 — tenant websites | **3.2 is mostly ENGINEERING, not design** — the headless booking core, one migration, the kit brief; `code-review` and `security-review` for the core, `ship-check` on anything visual. For a CLIENT's site: `impeccable` and `animate` as appliers, and the method in `docs/tenant-site-research-2026-09-05.md` §1 | ~~inventing color or type — those come from the system, not the skill~~ **THAT "NEVER" IS NOW BACKWARDS AND WAS CORRECTED 2026-09-05.** It was written when tenant sites were assumed to inherit our look. **They do not: each client site invents its own colour and type on purpose** — his ruling, *"it should genuinely be different… different colors fonts aesthetic"* — and what transfers is the METHOD, never the skin (research §1). What is still forbidden: **Fable for building pages** (his instruction, same day), our own faces/ground/tokens on a tenant page, and any client site that computes a price or an open day instead of asking the engine |
| 4 — features + admin | `security-review` (the platform-admin lock especially), `code-review` | design skills |
| 5 — Andrew's migration | `security-review`, `code-review`. Real customer data — no shortcuts | anything that writes to the old project without an explicit go-ahead |
| 6 — demo business | `ship-check` | gray placeholder boxes; the owner's rule is real photography or ask |
| 7 — launch readiness | `ship-check`, `security-review`, `code-review` at high effort | shipping anything the owner has not seen at 392px |
