# Where things stand (2026-11-26)

**The product works end to end in test mode.** A detailer can pick a plan on
detailingplatform.com, sign up, set up the business, pay with a test card, and land
in an unlocked dashboard. Proven in a real browser: `scripts/checkout-walk.mjs`
13/13, including "the price shown equals the price charged". Billing renewals and
failed payments: `scripts/billing-walk.mjs` 24/24. All 46 server functions match
the code (`scripts/deployed-inventory.mjs`); the database matches the migrations
(`scripts/migration-drift.mjs`). Backups restore: 100 of 100 tables.

**Done on 2026-11-26:**
- **Site certificate fixed.** The detailingplatform.com HTTPS certificate expired
  on 2026-11-25 because Netlify still held an unused "Netlify DNS" zone and kept
  trying a wildcard renewal it could not complete (DNS lives in **Cloudflare**).
  The zone was deleted (backup of its records was kept locally) and the
  certificate reissued: detailingplatform.com, www, demo-site; valid to
  2027-02-24, renews itself. **Never recreate a Netlify DNS zone for this domain.**
- **#4 closed.** Cloudflare CNAME `demo-site` → `detailplatform-admin-test.netlify.app`
  (DNS only) + Netlify alias. The demo business published live over HTTPS through
  the real Studio publish path, then was unpublished on purpose (`docs/BUILD-A-SITE.md`).
- **#10 closed.** `lock-demo-admins.mjs --apply` ran: the only platform admin is
  now `andrewsauto@andrewsdetail.com` (Andrew sets its password with "Forgot
  password"). Both demo logins refused (`scripts/admin-refuses.mjs` 21/21).
- **#33 closed.** Andrew chose: **keep the 12-month early-exit fee**, no lawyer
  for now. The "not yet reviewed by a lawyer" line was replaced with a plain-English
  note, and the Terms show a worked fee example. Effective 2026-11-26.
- Supabase leaked-password protection: **skipped** (needs the $25/month Pro plan).

**Done on 2026-11-25:** security fixes, customer import with undo, all 35 emails
reviewed (EN/ES), accessibility 0 problems, 218/231 test suites passing
(`docs/TEST-STATUS.md`), launch scripts (`docs/GO-LIVE.md`), shop facts
(`docs/CUSTOMER-1.md`). The belt/Control Room was deleted.

## Only Andrew can do these (in this order)

1. **Live payments (#6).** Activate the Stripe account (business details, SSN,
   bank; an AI may not type these). Put the 5 live values in `.env` (never in
   chat), then the AI follows `docs/GO-LIVE.md` ($1 charge + refund).
2. **Backup key check (#11), 10 minutes.** Save the backup private key from the
   password manager to a file, run
   `node scripts/backup-key-drill.mjs --key=<that file>`, then delete the file.
3. **Your shop as customer #1 (#5).** Sign up Andrew's Auto Detail on your phone
   (Website plan). Hours come over from his current admin; service area and
   travel fee are set per detailer in the app. Give the AI full-size photos.
   Draft: `tools/studio-audit/data/drafts/andrews-auto-detail.json`.
4. **Set your admin password:** detailingplatform.com → "Forgot password" with
   andrewsauto@andrewsdetail.com.

## Small leftovers (AI can do, ask first)

- Cloudflare record `control.detailingplatform.com` still points at the deleted
  Control Room tunnel. Harmless; delete when Andrew says so.
- An unsent "Your site is live" draft email sits in the Studio from the #4 proof.

## Tools

- **Work list:** GitHub Issues. `launch` first, `later` after launch.
- **Website Studio + site audit:** `tools/studio-audit/START-STUDIO.cmd`
  (opens on http://127.0.0.1:5300). Its AI runs on Claude or ChatGPT/Codex
  (Studio settings → "Which AI app"). How to build a customer's site:
  `docs/BUILD-A-SITE.md`.
- **Rules for any AI working here:** `AGENTS.md`. How work flows: `docs/WORKFLOW.md`.
- **DNS:** Cloudflare (Andrew's account). **Hosting:** Netlify site
  `detailplatform-admin-test`; the Netlify CLI on this laptop is logged in
  (`npx netlify-cli api ...`).

## Handing to ChatGPT / Codex

Open Codex in this folder and say: "Read docs/STATUS.md and AGENTS.md. Work
GitHub issue #N. Open a pull request, don't merge." One issue at a time. Merging
the pull request (on GitHub, or tell it to) updates the live site.
