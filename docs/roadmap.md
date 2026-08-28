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
- [ ] 0.2 Fix email — bookings currently produce nothing in Resend at all.
      Investigate the send-email function line by line, check its secrets,
      read its logs, find the root cause WITH evidence, fix, prove with a
      real booking landing in Resend's log. The most valuable open bug.
- [ ] 0.3 Reminders — schedule the sweep (cron every 15 min), prove a
      reminder actually sends on schedule, verify no duplicates and no
      reminders for cancelled bookings.
- [ ] 0.4 Deployment sanity — determine (not from docs) what deploys
      where, whether main truly auto-publishes to production, and whether
      anything could accidentally deploy work-in-progress.

## Phase 1 — Choose the new look (the visual restart)

- [ ] 1.1 **OWNER: collect 3–5 reference websites or screenshots you
      like** — any industry. The research rule: a reference beats a
      description every time. The advisor chat can help you hunt.
- [ ] 1.2 Short design brief interview: audience, the feeling it should
      give, what felt wrong about the old look, what to keep (if anything).
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
