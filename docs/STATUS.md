# Where things stand (2026-11-25)

**The product works end to end in test mode.** A detailer can pick a plan on
detailingplatform.com, sign up, set up the business, pay with a test card, and land
in an unlocked dashboard. Proven in a real browser: `scripts/checkout-walk.mjs`
13/13, including "the price shown equals the price charged". Billing renewals and
failed payments: `scripts/billing-walk.mjs` 24/24. All 46 server functions match
the code (`scripts/deployed-inventory.mjs`); the database matches the migrations
(`scripts/migration-drift.mjs`). Backups restore: 100 of 100 tables.

**Also done on 2026-11-25:** security fixes (unpaid accounts blocked server-side,
support sessions read-only on every table, admin history append-only, 14 database
functions hardened); customer import with one-tap undo (live, 78/78); all 35
emails reviewed in English and Spanish; accessibility at 0 problems on every
dashboard and booking screen measured; real 404s and honest example-site labels;
marketing pages with search-engine tags and a dashboard bundle half the size;
218 of 231 test suites passing (`docs/TEST-STATUS.md`); launch-day scripts
(`docs/GO-LIVE.md`); your shop's site facts collected (`docs/CUSTOMER-1.md`).

## Only Andrew can do these (in this order)

1. **Terms page (#33).** It says "not yet reviewed by a lawyer" but has
   auto-renewal and a 12-month early-exit fee. Get it reviewed, or drop the fee
   until it is.
2. **Backup key check (#11), 10 minutes.** Save the backup private key from the
   password manager to a file, run
   `node scripts/backup-key-drill.mjs --key=<that file>`, then delete the file.
3. **One DNS record (#4 proof), 2 minutes.** Cloudflare → detailingplatform.com →
   DNS → CNAME `demo-site` → `detailplatform-admin-test.netlify.app`, DNS only
   (grey cloud). Then tell the AI it's in; it finishes the live-address proof.
4. **Your shop as customer #1 (#5).** Sign up Andrew's Auto Detail on your phone,
   give the AI your photos and text, and let it build your site in the Studio.
5. **Live payments (#6).** Activate the Stripe account (business details, bank),
   put the 5 live values in `.env` (never in chat), then follow `docs/GO-LIVE.md`.
6. **At launch:** the AI runs `node scripts/lock-demo-admins.mjs --apply` to
   remove the two demo admin logins (needs your owner email first;
   see `docs/platform-admins.md`).
7. **Optional:** in Supabase → Auth → Settings, turn on leaked-password
   protection (blocks passwords known from data breaches).

## Tools

- **Work list:** GitHub Issues. `launch` first, `later` after launch.
- **Website Studio + site audit:** `tools/studio-audit/START-STUDIO.cmd`
  (opens on http://127.0.0.1:5300). Its AI runs on Claude or ChatGPT/Codex
  (Studio settings → "Which AI app"). How to build a customer's site:
  `docs/BUILD-A-SITE.md`.
- **Rules for any AI working here:** `AGENTS.md`. How work flows: `docs/WORKFLOW.md`.

## Handing to ChatGPT / Codex

Open Codex in this folder and say: "Work GitHub issue #N in this repo. Follow
AGENTS.md. Open a pull request, don't merge." One issue at a time. Merging the
pull request (on GitHub, or tell it to) updates the live site.
