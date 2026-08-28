# Detailing Platform — session rules

Read before working. These rules survive every `/clear`; chat instructions don't.

## Ground rules

- Work on branch `claude/superbase-access-anj1h7`. NEVER commit or merge to
  `main` — main auto-deploys to production (detailingplatform.com).
- The owner's live business site (repo `carwashweb`, Supabase project
  `adtlnvihwrcqcasqcjwd`, Netlify, Resend domain andrewsdetail.com) takes
  real customers' money. Reads are allowed; writes only with the owner's
  explicit go-ahead for that specific action.
- Migrations are append-only. Never edit an existing one.
- Consequential writes go through edge functions, not the browser client.
- Never commit `app/.env.production`, or any credential.
- `reference/` is read-only — the old site kept as canon.

## Design

- `docs/design-system.md` ("Raking Light") is law. Apply it; never propose
  a new direction. `DESIGN.md` points here for tools.
- Skill collisions: the aesthetic is settled. Never run system-GENERATING
  design skills (ui-ux-pro-max, tastemaker, Claude Design, great-design's
  direction phases). Auditors and appliers (impeccable, animate,
  review-animations, ship-check; scrollcraft for structure/motion only) are
  fine. Where a skill's structure meets the identity, the identity wins.
- Never-defaults (in addition to the design system): Inter/Roboto/Arial/
  system-ui/Space Grotesk as design choices; purple-blue gradients on
  white; three evenly spaced cards; numbered markers on non-sequences;
  "modern and clean"-style copy. See `docs/design-knowledge.md`.
- Visual work is verified by LOOKING: screenshot 392px / 768px / 1440x900,
  both themes, console read, compared against the design system. Retints
  are checked per tenant accent, including extremes.

## Verification

- Finish every session: `node tests/composition.test.mjs`,
  `design-contrast`, `landing-pricing`, `route-contract` from repo root —
  credential-free, all must pass. The other 7 tests need env vars from
  root `.env`.
- Report what was observed, never "this should work."

## Process

- One queue prompt per session; commit before the next; `/clear` and
  restart a session that goes sideways.
- Plan before building anything large; stop for approval.
- Smallest possible diff; no unrequested refactors, deps, files, renames.
- Stuck twice on one bug: stop editing, write hypothesis + evidence +
  unchecked assumptions, list three causes.

## Context (read these, in this order, when new)

1. `PROJECT-STATE.md` — full state briefing
2. `docs/HANDOFF.md` — architecture + open threads
3. `DECISIONS.md` — every judgment call and why
4. `docs/ux-audit.md` — the dashboard audit and its status
5. `docs/design-knowledge.md` — design/process research transfer
