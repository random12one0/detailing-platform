# Detailing Platform

Multi-tenant SaaS that gives independent car detailers a professional web
presence with online booking built in. One React bundle serves three
audiences: prospects on the marketing page (`/`), detailer-owners in a
phone-first dashboard (`/app`), and their customers on a public booking
page (`/book/:slug`).

Converted from *Andrew's Auto Detail*, the single-business site it grew
out of. That original code is kept read-only under `reference/` as canon —
it is not built and not deployed.

**Status: late beta, pre-revenue.** See [`ROADMAP.md`](ROADMAP.md), the live
fix queue, for what is left.

## Where to start

| Read this | For |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | The session rules — read before changing anything |
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | Architecture and open threads |
| [`PROJECT-STATE.md`](PROJECT-STATE.md) | Full state briefing |
| [`DECISIONS.md`](DECISIONS.md) | Every judgment call and why |
| [`ROADMAP.md`](ROADMAP.md) | The live fix queue — what each open item is and why. `docs/roadmap.md` is the older plan; its item numbers are not the same as these |
| [`DESIGN.md`](DESIGN.md) | The visual redesign currently in progress |

## Running it

```bash
cd app && npm install && npm run dev     # the front end
node --test tests/composition.test.mjs   # tests are node:test suites, run from the repo root
```

`tests/` held 201 test suites (`*.test.mjs`) at `d0526b91`, counted with
`git ls-tree --name-only d0526b91 tests/ | grep -c '\.test\.mjs$'`.
Four run without credentials and are the ones to run before finishing:
`node --test tests/composition.test.mjs tests/design-contrast.test.mjs tests/landing-pricing.test.mjs tests/route-contract.test.mjs`.
Many others need the values in the repo-root `.env`, which is not
committed; read a suite's header for what it needs before running it.

Database migrations and edge functions deploy through the Supabase
Management API — `scripts/apply-migrations.mjs` and
`scripts/deploy-functions.mjs`. No Supabase CLI needed. Migrations are
append-only; never edit one that already ran.
