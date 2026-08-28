# Detailing Platform — session rules

Read before working. These rules survive every `/clear`; chat instructions don't.

## Talking to the owner

The owner is not a coder. Explain things in plain language with everyday
analogies; define any technical term the first time it appears. Technical
detail belongs in files — chat messages must be understandable to a
non-programmer.

**Every decision that needs the owner goes in `OWNER.md`, in plain English,
before the session ends.** Chat is a whiteboard and gets wiped; that file is
the filing cabinet. Each entry states what the thing actually is (analogy
first), what happens either way, an explicit recommendation, and what would
change the answer. `DECISIONS.md` keeps the technical reasoning — never send
the owner there for an answer. When a decision is settled, move it to
`OWNER.md`'s "already made" list in one line.

Also keep `OWNER.md`'s glossary current: any term used with the owner more
than once belongs in that table.

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

- VISUAL REDESIGN IN PROGRESS (owner decision 2026-08-28, see `DESIGN.md`).
  The old system `docs/design-system.md` ("Raking Light") is deprecated as
  identity — evidence and anti-reference only. Do not apply it or polish
  toward it. Backend, content, copy facts, and accessibility floors are
  kept; only the visual world is being replaced.
- During the redesign phase, direction-generating design skills ARE
  allowed — that phase is their job. Once the new direction is chosen and
  written into a rewritten `docs/design-system.md` (with rewritten design
  tests), the skill-collision rule locks back in: auditors and appliers
  only, no more direction-inventing.
- The old design tests (composition, design-contrast) encode the OLD
  system; expect them to be rewritten with the new one. Don't contort new
  work to pass old-look tests.
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
- **End every finished job by telling the owner "Safe to clear."** They asked
  to be told rather than guess. Say it only once the work is committed, the
  tests have been run, and anything learned is written to a file — never
  mid-task. If something is still unwritten, write it first, then say it.
  The rules the owner reads are in `OWNER.md` under "When to clear the chat".
- Plan before building anything large; stop for approval.
- Smallest possible diff; no unrequested refactors, deps, files, renames.
- Stuck twice on one bug: stop editing, write hypothesis + evidence +
  unchecked assumptions, list three causes.

## Context (read these, in this order, when new)

1. `OWNER.md` — the owner's own file: open decisions, plain English
2. `PROJECT-STATE.md` — full state briefing
3. `docs/HANDOFF.md` — architecture + open threads
4. `DECISIONS.md` — every judgment call and why
5. `docs/ux-audit.md` — the dashboard audit and its status
6. `docs/design-knowledge.md` — design/process research transfer
