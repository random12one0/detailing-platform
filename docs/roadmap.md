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

- [ ] 1.1 **OWNER: collect 3–5 reference websites or screenshots you
      like** — any industry. The research rule: a reference beats a
      description every time. The advisor chat can help you hunt.
      **ASKED 2026-08-29 — waiting on the owner.** Questions and the
      how-to are in `docs/design-brief.md` Part A; images go in
      `docs/design-references/`. It also carries a ready-made prompt for the
      advisor chat that returns 15–20 candidate references to react to.
- [ ] 1.2 Short design brief interview: audience, the feeling it should
      give, what felt wrong about the old look, what to keep (if anything).
      **ANSWERED 2026-08-29 (five of six).** Recorded in
      `docs/design-brief.md` Part B; the headline is that nothing specific
      was wrong with the old look — it just read as AI-made, so
      competence is the failure mode for 1.3. Two returned to the owner in
      Part C: B1b (which of the three screens wins when they conflict —
      the original question was asked badly) and B6b (does each tenant keep
      picking their own accent colour). Both carry a recommendation. Answers get typed into that file (a
      chat answer dies at the next `/clear`). 1.3 does not start until A and
      B are filled in — producing directions first would anchor the
      owner's choice to a guess.
- [ ] 1.3 Produce 3–5 GENUINELY different design directions, each rendered
      as real mockups of the same three screens (landing hero, one booking
      step, dashboard Today) at phone + desktop. **OWNER picks one.**
- [ ] 1.4 Refine the winner once. **OWNER approves.**
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
