# Read `CLAUDE.md`. It is the rulebook for this repo, whoever you are.

This file exists so that an agent which looks for `AGENTS.md` finds the same
instructions as one which looks for `CLAUDE.md`. **There is one rulebook and it
is `CLAUDE.md` in this same folder.** Open it now, before anything else.

**Do not copy its contents here.** A second copy drifts, and a rule that exists
twice in two slightly different wordings is worse than a rule that exists once.
That is this repo's single most repeated failure, written up at length in
`docs/gotchas.md`.

## The short version, so a wrong turn is caught before you read further

- **`CLAUDE.md`** — the rulebook. Read it first, every time.
- **`ROADMAP.md`** — the work queue. One item at a time, top to bottom.
- **`docs/gotchas.md`** — 87 specific ways a measurement lies in this repo. Read
  it before you trust any number a check prints.
- **`DECISIONS.md`** — every judgment call and why. **It has an index at the top.
  Start there; never read it end to end.**
- **`FOR-ANDREW.md`** — things only the owner can do.

## Five things that are true no matter which agent you are

1. **Never push, publish or deploy.** Andrew does that by hand.
2. **Never handle a key, token, secret or password.** Say where it lives, never
   what it is.
3. **Never write to Supabase project `adtlnvihwrcqcasqcjwd`** — that is a real
   business taking real customers' money. This project is `kguqylyzgyzfktkfnhjb`.
4. **Never change the live database's structure**, not even a change you undo
   immediately. Use a throwaway local copy.
5. **A check that found zero targets is a failure, never a pass.** If you write a
   check, break it on purpose before you trust it.

Everything else — and the reasoning behind all of it — is in `CLAUDE.md`.
