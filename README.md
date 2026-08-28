# Detailing Platform

Multi-tenant SaaS that gives independent car detailers a professional web
presence with online booking built in. One React bundle serves three
audiences: prospects on the marketing page (`/`), detailer-owners in a
phone-first dashboard (`/app`), and their customers on a public booking
page (`/book/:slug`).

Converted from *Andrew's Auto Detail*, the single-business site it grew
out of. That original code is kept read-only under `reference/` as canon —
it is not built and not deployed.

**Status: late beta, pre-revenue.** See `docs/roadmap.md` for what is left.

## Where to start

| Read this | For |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | The session rules — read before changing anything |
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | Architecture and open threads |
| [`PROJECT-STATE.md`](PROJECT-STATE.md) | Full state briefing |
| [`DECISIONS.md`](DECISIONS.md) | Every judgment call and why |
| [`docs/roadmap.md`](docs/roadmap.md) | The plan of record, in order |
| [`DESIGN.md`](DESIGN.md) | The visual redesign currently in progress |

## Running it

```bash
cd app && npm install && npm run dev     # the front end
node tests/composition.test.mjs          # tests are plain node, run from the repo root
```

Eleven test suites live in `tests/`. Four run without credentials
(`composition`, `design-contrast`, `landing-pricing`, `route-contract`);
the other seven need the values in the repo-root `.env`, which is not
committed.

Database migrations and edge functions deploy through the Supabase
Management API — `scripts/apply-migrations.mjs` and
`scripts/deploy-functions.mjs`. No Supabase CLI needed. Migrations are
append-only; never edit one that already ran.
