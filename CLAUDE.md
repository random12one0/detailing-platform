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

- Work on branch `claude/superbase-access-anj1h7`. **Never merge to `main` on
  your own initiative — ask.** `main` auto-deploys to production
  (detailingplatform.com), and that is now confirmed by observation rather
  than inherited from a note: a push to `main` on 2026-08-30 republished the
  live site by itself, with no upload and no dashboard visit. **A push to
  `main` IS a publish** — there is no second step to forget.
  The owner can say yes, and did on 2026-08-30: the redesign through roadmap
  2.2 is live, and `main`, the branch and this machine are the same commit.
  So "main is months behind" is no longer true, and a session that finds them
  apart should say so rather than assume it is normal. See DECISIONS.md, "The
  owner put the redesign on `main` and published it".
- The owner's live business site (repo `carwashweb`, Supabase project
  `adtlnvihwrcqcasqcjwd`, Netlify, Resend domain andrewsdetail.com) takes
  real customers' money. Reads are allowed; writes only with the owner's
  explicit go-ahead for that specific action.
- Migrations are append-only. Never edit an existing one.
- Consequential writes go through edge functions, not the browser client.
- Never commit `app/.env.production`, or any credential.
- `reference/` is read-only — the old site kept as canon.

## Design

- **The system is `docs/design-system.md` — "The Thread"** (written
  2026-08-30, roadmap 1.5). Read it before touching anything a person looks
  at. The reference rendering is `docs/design-directions/5-the-thread.html`,
  the page the owner approved; **where the document and that page disagree,
  the page is right.** See `DESIGN.md`.
- **The skill-collision rule is BACK ON.** Appliers and auditors only —
  `impeccable`, `animate`, `ship-check`. No direction-generating skill
  (`frontend-design`, `tastemaker`, `great-design`, `scrollcraft`) runs
  against this product again unless the owner reopens the direction. The
  design system outranks any skill's opinion.
- "Raking Light" is finished as an identity and its file is gone. What
  survived it — the accessibility floors, the `lib/theme.js` colour rule,
  define-tokens-once, the composition rule, the content and copy facts — is
  listed in the new file under "§11". Backend, content, copy facts and
  accessibility floors were always kept; only the visual world changed.
- The design tests enforce the NEW rules: `tests/composition.test.mjs`
  (26 checks — it said 24 until 2026-08-30, which was stale) and
  `tests/design-contrast.test.mjs`. Don't contort work to
  pass them — if a test and a real design decision collide, the system file
  gets updated first, never silently.
- Never-defaults (in addition to the design system): Inter/Roboto/Arial/
  system-ui/Space Grotesk as design choices; purple-blue gradients on
  white; three evenly spaced cards; numbered markers on non-sequences;
  "modern and clean"-style copy. See `docs/design-knowledge.md`.
- Visual work is verified by LOOKING: screenshot **1920 / 1440x900 /
  768x1024 / 392x844**, console read at each, in the normal path AND
  `?lite=1`, compared against the design system. 1920 is the owner's own
  monitor and it is where "not enough content to fill the viewport" bugs
  live. Retints are checked per tenant accent, including extremes.
  ("Both themes" was here until 2026-08-30 and is stale — the owner killed
  the light theme; there is one ground.)
  **392 is the narrowest VERIFICATION width, not the narrowest supported
  one.** PRODUCT.md promises 320→1440; at 320 five things still clip, and
  roadmap 2.9 is the gap between the promise and the product.
- **Imagery: never a grey placeholder box.** An Unsplash connector is
  wired up and confirmed working 2026-08-29 (`search_photos`; "car
  detailing" returns ~4,800 real photos). Use it for mockups, the demo
  business, and anything a tenant has not supplied. If it cannot find the
  right shot, ASK THE OWNER — they have said plainly they will go and
  source images rather than have work limited by what is to hand. Asking
  is cheaper than settling.

## Verification

- Finish every session: `node tests/composition.test.mjs`,
  `design-contrast`, `landing-pricing`, `route-contract` from repo root —
  credential-free, all must pass. **Add `node scripts/decisions-index.mjs`
  to that list if you touched `DECISIONS.md`.** The other 7 tests need env vars from
  root `.env`.
- **Also credential-free, and it must exit 0 after anything touching accent
  colour or the ground tokens: `node scripts/accent-sweep.mjs`.** It measures
  every tenant preset as a fill AND as words on all three grounds the
  dashboard paints, plus the EXTREMES no preset list can cover (neon, pure
  black, near-black, pure white), and it pins `hueFamily()` against sixteen
  colours. It exists because correcting a colour against one ground buys a
  floor on that ground and nowhere else — the bug it caught left six of eight
  presets under the text floor on a panel (2026-08-30). **It grew again in 2.6:
  it now also measures the four grounds that are TINTED WITH THE ACCENT ITSELF
  — a selected chip, a selected choice, a completed pill/badge, the selected
  tab — because a tint of the accent is a ground, and correcting against the
  plain panel underneath it left nine of twelve presets under the text floor
  on a selected chip (worst 3.92:1). The tint percentages in `theme.css` and
  the 20% in `lib/theme.js` must move together or this exits 1.**
- **The check for anything that changes a LAYOUT:
  `node scripts/sweep-widths.mjs`.** No env vars, but unlike the tests above it
  needs the dev server running and the demo business seeded — it drives a real
  browser. It walks every dashboard screen, all
  eleven settings sheets, the client sheet and the booking page at 392 and 360
  and reports anything past the right edge, anything scrolling sideways with no
  scrollbar, and any two boxes stacked with no gap — the two complaints the
  owner's whole walkthrough was made of. It exits 0 today; pass a width to ask
  a different question (`sweep-widths.mjs 320` exits 1, and that list is
  roadmap 2.9). It needs the dev server and the demo login, like
  `shoot-dashboard.mjs`. **It stubs `navigator.share` in on purpose** — Chrome
  on Windows has it and headless does not, and that one difference is the
  whole of walkthrough W14.
- **The check for anything that changes the BOOKING WIDGET:
  `node scripts/sweep-booking-steps.mjs`.** Same dev server, no login (the page
  is public). It walks every step at all four verification sizes, fills the form
  in as a customer would, and reports how far each step runs past the bottom of
  the screen AND how much room it has to spare. That is roadmap 2.7's W16 — the
  owner's rule that a customer should never scroll inside a step — and the
  script exits 1 while anything overflows, so it is the definition of done.
  `--lite` runs the `?lite=1` path; `--shots=DIR` saves the PNGs.
  **Read the spare room, not just the pass.** Step 1's height is the TENANT'S
  catalogue: with the demo's four services it has 18px of headroom on a phone,
  so a fifth service breaks W16 again. The fix for that is roadmap 2.8's W21,
  not shaving gaps.

- **Before changing any colour, know law 11b (`docs/design-system.md`): the
  accent is IDENTITY, never MEANING.** Paid / money-up / "it worked" are the
  fixed green `--ac`; cancelled / no-show / error are the fixed red `--bad`.
  Neither follows the tenant. `grep 'var(--ac)'` in `theme.css` finds every
  fixed-meaning site. The owner's rule, 2026-08-30.
- Report what was observed, never "this should work."

## Process

- One queue prompt per session; commit before the next; `/clear` and
  restart a session that goes sideways.
- **Appending to `DECISIONS.md` means adding your section to its index too,
  in the same edit.** `node scripts/decisions-index.mjs` exits 1 if you
  forget, and it is the check that keeps that file usable — an index that has
  gone stale is worse than none, because a session that trusts it and finds
  nothing concludes the decision was never made and re-decides it. Write the
  one-line hook yourself; generating hooks was tried and produced entries like
  "four" and "40 pixels". **Mark superseded entries, never delete them** — the
  reversal is usually the load-bearing part ("Removed on purpose" only makes
  sense next to the owner decision that put it all back).
- **Ping the owner's phone when the work is done.** Send a PushNotification
  at the end of every session — whenever you hand over, ask for a decision,
  or stop needing them to look. They are often away from the screen while a
  session runs. Harmless when they are not on a remote session; do it
  anyway rather than guessing.
- **Clear at the work boundary, not at a token count.** A session covers ONE
  roadmap item. When that item is finished AND nothing is left hanging — no
  unanswered question, no decision handed to the owner they have not
  answered, no "I'll look at that next" — say "Safe to clear." and hand
  over. Never start a second item in the same session: that is what the
  clear is for. Finishing a *sub-part* is not a boundary, and neither is
  "the code works" — chase the loose ends first.

  If a decision is pending, the session is not over. Keep working on
  everything that does not depend on it.

  **Context size is advisory, not a trigger.** `node scripts/context-check.mjs`
  reads the live transcript and prints real usage; quality is reported to
  degrade somewhere past ~300k. Treat that as a reason to be economical and
  to avoid picking up anything new — never as a reason to abandon the item
  mid-flight. If you are far past it and the item genuinely cannot finish,
  say so plainly and make the handoff carry every unresolved thread,
  because the next session starts cold on whatever the prompt names.

  Before clearing, write anything that exists only in this chat into a
  file — a thread that lives only in the conversation dies at the clear.
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
  Don't wrap up when the code works — surface what's still unanswered, chase
  it down, and only say "Safe to clear." once nothing is left hanging.
  ```

  Keep it five lines or fewer. It is a pointer at the files, not a summary
  of them — the files are what survive the clear. The last line is not
  boilerplate: the owner clears BETWEEN roadmap items, so a session that
  signs off with loose ends buries them — the next session starts on a new
  item and never picks them up.

  **The prompt IS the sign-off. It only ever appears together with "Safe to
  clear."** Never hand over a next-session prompt and then say the session
  is not finished — a prompt in the chat reads as "you are done here, go
  clear", so pairing it with "don't clear yet" gives two opposite
  instructions and the owner acts on the wrong one. If either half is
  missing, both are.

  **When the session is blocked on the owner** — a question asked, a
  decision handed over, an OWNER roadmap item — finish everything that
  does not depend on the answer, write it all to files, commit, and end
  with the ask ALONE. No prompt, no sign-off. The session stays open. When
  the owner answers, write their answer into the file it belongs in, finish
  the item, and only then give "Safe to clear." and the prompt together.
  An answer that exists only in the chat has not been captured yet, and
  that is exactly the thread the clear would destroy.
- Plan before building anything large; stop for approval.
- Smallest possible diff; no unrequested refactors, deps, files, renames.
- Stuck twice on one bug: stop editing, write hypothesis + evidence +
  unchecked assumptions, list three causes.
- **Write for a coding agent that is not Claude.** The owner expects to
  move to OpenAI's coding agent in roughly a month (stated 2026-08-29).
  Every durable decision therefore lives in plain markdown in the repo,
  never in a tool-specific mechanism — no skills, no hooks, no
  assistant-side memory holding anything that matters. Audited 2026-08-29:
  the ONLY tool-specific file in the repo is `.claude/settings.json`
  (permissions), and all 20+ knowledge files are portable markdown. Keep
  it that way and the migration stays close to free. See DECISIONS.md.

## Context (read these, in this order, when new)

1. `PROJECT-STATE.md` — full state briefing
2. `docs/HANDOFF.md` — architecture + open threads
3. `DECISIONS.md` — every judgment call and why. **START AT ITS INDEX, not
   at the top of the file.** It is ~3,900 lines and reading it end to end is
   not a thing anyone does; the index block names the five mistakes that have
   actually cost sessions, and maps "about to touch X" to the two or three
   sections that matter. A decision you did not find is worse than one nobody
   wrote down, because it looks like diligence.
4. `docs/ux-audit.md` — the dashboard audit and its status
5. `docs/design-knowledge.md` — design/process research transfer
