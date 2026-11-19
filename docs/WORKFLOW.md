# How work happens now (since 2026-11-19)

The belt and Control Room are **frozen** — kept on disk, not run, not developed.
Andrew's call, 2026-11-19: too much time went into the tool and not the product.
Work happens in plain Claude Code sessions, and GitHub holds everything else.

## The one list: GitHub Issues

- **https://github.com/random12one0/detailing-platform/issues** — the work queue.
- Label **`launch`** = must be done before the first paying detailer. Nothing
  else gets worked on until these are closed, unless Andrew says so.
- Label **`needs-andrew`** = waiting on his decision or a real-world step. He
  sees these in the GitHub phone app. Everything else is ours to decide.
- New bug or idea → open an issue. Do not add to `ROADMAP.md` (frozen archive;
  its open items are mined into issues only when one matters for launch).

## One issue, one branch, one pull request

1. Pick the top open `launch` issue (or the one Andrew names).
2. Branch `fix/<issue-number>-<short-name>` off `main`. Do the work.
3. Open a pull request with `Closes #<n>` in the description.
4. **Checks** (`.github/workflows/checks.yml`) build the site and run the four
   credential-free test suites. Red = not mergeable.
5. Netlify posts a **deploy preview** link on the PR — a real copy of the site
   with the change in it. Put that link in the reply so Andrew can look on his phone.
6. Merge to `main` → detailingplatform.com updates. Andrew may merge from his
   phone, or tell Claude to merge.

Server functions and database migrations still go through
`scripts/deploy-functions.mjs` / `scripts/apply-migrations.mjs` as part of the
same issue, with `node scripts/deployed-inventory.mjs` green afterwards.

## Running unattended

No custom runner. When Andrew is away: a Claude Code session (desktop or cloud)
is pointed at the `launch` issues and works them one PR at a time. It never
merges its own PR unless Andrew said so for that session.

## The belt, if it is ever wanted again

Its code is in `../control-room/` (untouched). Don't run
`KEEP-IT-RUNNING.cmd` — it re-installs the auto-start. Revisit only when
paying customers send more work than one person can handle.
