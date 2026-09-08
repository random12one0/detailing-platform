# `main` is NOT the deploy — measured 2026-09-08

> **THE CAUSE IN THIS FILE IS WRONG AND THE CORRECTION IS `docs/OUTSTANDING.md`
> § 6 PLUS COMMIT `e6c7020`, THE SAME DAY.** The symptom below is real and
> every measurement in it holds. **The cause is not a disconnected repo — it is
> Netlify BUILD CREDITS.** A deploy triggered on purpose came back
> `state: error, skipped: true, "Skipped due to account credit usage
> exceeded"`. Every build since 2026-09-06 has been **silently skipped**, which
> from outside is indistinguishable from a git integration that was never
> wired up.
>
> **So do NOT reconnect the repository — it is connected fine, and doing that
> fixes nothing.** The fix is credits, or a pre-built
> `netlify deploy --prod --dir=app/dist`, which skips their build system
> entirely and needs a Netlify token this repo does not hold.
>
> **The wrong inference is left standing below rather than quietly replaced**,
> because the reasoning is the lesson: `deploy_source: "api"` on the last
> SUCCESSFUL deploy was read as "the repo is not connected", and **no amount of
> inspecting a successful deploy could ever have produced the right answer.
> Only triggering a new one could.** When a thing has stopped happening, make
> it happen and read the error — do not infer the cause from the last time it
> worked.

**CLAUDE.md has said since 2026-08-30 that *"a push to `main` IS a publish —
there is no second step to forget"*. That is false, and it has been false for
at least two days.** Anything relying on it — including the sentence in
`docs/OUTSTANDING.md` and the memory note by the same name — is wrong until
somebody reconnects continuous deployment.

## What was measured

`main` was pushed on 2026-09-08 (`35c6c9b..7cd5864`, 71 commits). **No build
started.** Netlify's own API, asked directly:

| | |
|---|---|
| Site | `detailplatform-admin-test`, id `12ee8817-34bc-4791-b68d-85c920739052` |
| Current deploy | `6a9df60628d02f0008a79e0f`, state `ready` |
| Created | **2026-09-06T23:23:50Z** |
| `commit_ref` | **`c47cfae`** — *"the ground, and the rail"* |
| `deploy_source` | **`api`** |
| `manual_deploy` | `false` |

**`c47cfae` is three commits BEHIND what `origin/main` already was on
2026-09-06**, so the last deploy was not of `main`'s tip even then. That is the
tell: this is not a git-triggered build that happens to be late, it is a site
that is not building from git at all.

## What it means, concretely

**Everything since 2026-09-06 is invisible on detailingplatform.com** — 74
commits at the time of writing. Including:

- **the ten example sites**, roadmap 9.5. `/example1` … `/example10` and
  `/examples` all serve the app shell, which routes to the sign-in screen.
- the Spanish fixes, the taste work, the legal-page corrections, the back
  office rebuild's later passes.

## The examples are NOT a routing bug — this was checked

The first diagnosis to reach for is the SPA catch-all in `app/netlify.toml`
(`/* → /index.html 200`) shadowing the static pages. **It does not.** Netlify
serves a matching static file before it consults a non-forced redirect, and
that is proven on the live site by `platform-host.txt`, a real file in
`app/public/`, which returns its own contents rather than the app shell.

So the example pages are absent from the deployed `dist/`, and they are absent
because **the deploy predates the commit that builds them.** Locally,
`npm run build --prefix app` writes all eleven directories correctly —
`app/dist/example1/index.html` is the Northlight page, verified.

**`scripts/build-examples.mjs` needs no fix.** A session that "fixes" it will
be fixing a script that works.

## The one real bug this uncovered, which is separate

**An unknown path renders the sign-in screen rather than a 404.**
`https://detailingplatform.com/zzz-does-not-exist` returns the app, and the
router's catch-all falls through to auth. That is its own defect and it is
independent of the deploy: a customer who mistypes a booking link is shown a
staff login and concludes the business is gone. It is not on the roadmap yet.

## What actually fixes the deploy

**Not a code change.** Either:

1. **Reconnect continuous deployment** in the Netlify UI so pushes to `main`
   build — this is the real fix and it is a job for whoever has the browser; or
2. **Deploy by hand** each time, which is what has evidently been happening.

Until (1) is done and PROVEN by pushing a commit and watching a build appear,
**no session may claim a push published anything.** Check
`get-deploy-for-site`'s `commit_ref` against `git rev-parse origin/main`, or do
not say it.

## What to correct, and where

- `CLAUDE.md` — the *"a push to `main` IS a publish"* paragraph under Ground
  rules, and the standing-permission paragraph that rests on it.
- `docs/OUTSTANDING.md` — same claim.
- `docs/CHECKPOINT.md` — *"`main` is the deploy. Push to it and
  detailingplatform.com rebuilds. There is no separate publish step."*
- The assistant memory note titled *main is the deploy*.

**Left uncorrected on purpose in this commit**, because two sessions were
writing to those files at the same time and a merge conflict in `CLAUDE.md`
costs more than the delay. Correct them in one pass, from this file.
