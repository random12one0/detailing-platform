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
- **"Safe to clear." is a judgment call, not a sign-off you tack onto every
  finished job.** Clearing costs the owner the thread; say it only when
  BOTH are true: (a) the open questions raised in this session are actually
  resolved — not merely written down, and a decision you handed the owner
  that they have not answered is still open, and (b) the work is committed,
  the tests have been run, and anything learned is in a file. Otherwise
  keep going — finishing one roadmap item does not by itself end a session.
  The other reason to clear is context pressure — the owner's threshold is
  around 300k tokens; below roughly 200k there is room to keep working, so
  offer the next piece of work instead of a handoff prompt. Never mid-task,
  and if something is still unwritten, write it first.
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
  ```

  Keep it four lines or fewer. It is a pointer at the files, not a summary
  of them — the files are what survive the clear.
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
