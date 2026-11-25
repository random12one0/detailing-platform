# Where things stand (2026-11-25)

**The product works end to end in test mode.** A detailer can pick a plan on
detailingplatform.com, sign up, set up the business, pay with a test card, and land
in an unlocked dashboard. Proven in a real browser: `scripts/checkout-walk.mjs`
13/13, including "the price shown equals the price charged". Billing renewals and
failed payments: `scripts/billing-walk.mjs` 24/24. All 45 server functions match
the code (`scripts/deployed-inventory.mjs`). Backups restore: 100 of 100 tables.

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
5. **Live payments (#6).** Activate the Stripe account (business details, bank).
   The AI then swaps to live keys and runs a $1 charge and refund.
6. **At launch:** the AI runs `node scripts/lock-demo-admins.mjs --apply` to
   remove the two demo admin logins (needs your owner email first;
   see `docs/platform-admins.md`).

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
