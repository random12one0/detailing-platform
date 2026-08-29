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
- [ ] 1.3 **REOPENED 2026-08-29 — the owner rejected all four.** The first
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
- [ ] 1.4 Refine the winner once. **OWNER approves.** Carry in from 1.3:
      settle smooth scroll empirically on the owner's own phone (one flag,
      3 KB); consider adding the typewriter headline; draw the dashboard's
      empty state; and if direction 4 won, measure scroll-scrub on a
      throttled CPU BEFORE anything depends on it.
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
- [ ] 3.2 Build them, entirely from tenant configuration — zero hardcoded
      content. Anything impossible from settings gets reported, not
      hand-built.
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

      **OPEN — OWNER DECISION, and 3.1 cannot be planned without it.**
      What does the kit actually produce? Two possible answers, and the
      roadmap currently contains both:

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

      **Recommendation: the kit's DEFAULT output is a theme plus settings
      for the shared system, and bespoke code is the priced exception.**
      That keeps one codebase and keeps every client receiving
      improvements, while still letting sites look genuinely different —
      the retint work, the curated palette and the alternating-ground
      system already give a lot of visual range without forking. The
      existing website-package / booking-only split (3.3) is the natural
      place to price the exception.

      Deciding this changes 3.1's plan and what 3.2 has to expose as
      settings, so it wants answering before 3.1 starts — not now.

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
