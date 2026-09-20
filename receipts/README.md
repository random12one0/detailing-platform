# The receipts in this folder are STALE AGAINST HEAD, and that is by design

**If `node scripts/receipt.mjs` just told you that eighteen receipts failed,
nothing is broken. Read this before you do anything about it.**

## Why they all fail at once

A receipt is proof for **one specific commit**. It records the `git_sha` it was
made at, and `scripts/receipt.mjs` grades that field against `HEAD`:

```
receipt is for 2a10b86, HEAD is <the checkpoint>
```

Every receipt here was written at `2a10b86`. The checkpoint commit of
2026-09-20 moved `HEAD`, so **all of them mismatch at the same moment**. That
is the rule doing its job: the code changed, so the proof no longer covers it.
The alternative — a receipt that stays green across any commit — is precisely
the "clean verdict over untested work" this whole mechanism exists to stop.

## Why they were not re-run in that commit

**The browser was not free.** A second session was editing `app/src` while the
checkpoint was being taken, and `sweep-widths.mjs` drives a real browser
against the dev server. Re-running it against a page being rewritten
underneath it produces a number that describes nothing, and reports it as a
clean measurement — `docs/gotchas.md`, and the reason CLAUDE.md says **don't
edit `app/src` while a browser script is running**.

A stale receipt says "this proof is older than the code", which is true and
useful. A fresh receipt taken over a moving page says "this code is proven",
which would be a lie. The first is the safer thing to leave behind.

## What to do

**Re-run them in ONE batch, when nobody is editing `app/src`.** Not one at a
time as you happen to touch things — the point is a single set of receipts
that all name the same SHA. Roughly twenty minutes, most of it `sweep-widths`.

```bash
set -a; . ./.env; set +a
npm run dev --prefix app                 # and leave app/src alone until it finishes
node scripts/seed-demo.mjs
node scripts/build-examples.mjs --dev
node scripts/sweep-widths.mjs 320 1440 392
node scripts/example-ctas.mjs
node scripts/tenant-matrix.mjs
# …and the rest of the checks named in ROADMAP.md, then:
node scripts/receipt.mjs                 # every receipt, graded against HEAD
```

## Three of them recorded a FAILURE before any of this

Separate from staleness, and **not** fixed by re-running:

- `e2e-browser-features` — the owner's phone never lights up when a customer
  books. A real, open product defect; `FOUND.md` has the investigation and
  names the two environment variables to check first.
- `email-sends` — every webhook assertion answers `Bad signature`. The local
  `RESEND_WEBHOOK_SECRET` disagrees with the deployed function. Environment,
  not code.
- `sweep-widths-1920-…-320` — widths 1920 and 360 are uncertified, which
  `ROADMAP.md` says in as many words. Its one failure serialises as
  `[object Object]`, which is its own small bug in how that script records a
  finding.

Re-running will not turn those three green, and nobody should expect it to.
