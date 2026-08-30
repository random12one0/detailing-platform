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
- [ ] 1.4 Refine the winner once. **OWNER approves.**

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
- [ ] 1.5 Write the new `docs/design-system.md` (replacing "Raking Light"),
      and rewrite the design tests to enforce the NEW rules. From this
      point the new system is law and direction-inventing skills are
      banned again.

## Phase 2 — Apply the new look everywhere

- [ ] 2.1 Public booking page `/book/:slug` (heaviest weight: customers
      use it and prospects judge it) — including the empty-state rule: a
      business with two services and no photos must look intentional.
- [ ] 2.2 Marketing/landing page.
- [ ] 2.3 Dashboard — all five tabs and every settings screen.
- [ ] 2.4 Per-tenant recoloring — test extreme accents (neon, near-black),
      both themes; restyle the customer cancel/reschedule pages.
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
