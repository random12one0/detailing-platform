# Go live: the launch-day checklist (about 15 minutes of your time)

Covers GitHub issue #6 (real Stripe payments) and #10 (lock the demo admin
logins). Today the whole platform runs on Stripe's **test mode**: pretend
money, pretend cards. Going live means the server swaps to Stripe's real keys.

**Never paste a key into a chat.** Keys go into the local env file only (the
file named `.env` in the main `detailing-platform` folder). Nothing here prints
a key.

## Before launch day (Stripe makes you wait for some of this)

1. **Activate your Stripe account.** Stripe dashboard, "Activate your
   account". Stripe asks for: your legal business name and type (a sole
   proprietorship is fine), your address and phone, the last four of your SSN
   or an EIN, a date of birth, a **bank account for payouts**, a public
   business description and website (detailingplatform.com), and the name that
   shows on customers' card statements. It can take a day or two to approve.
   You are done when the dashboard no longer shows the "Activate" banner.

2. **Turn on Connect in live mode** (Settings, Connect). Detailers connect
   their own Stripe through it. It has its own live client id, different from
   the test one.

3. **Create the two live webhook endpoints.** Flip the dashboard to live mode,
   Developers, Webhooks, Add endpoint. Both use the URL
   `https://kguqylyzgyzfktkfnhjb.supabase.co/functions/v1/stripe-webhook` and
   API version **2024-06-20** (the version cannot be changed later; a wrong one
   means making a new endpoint).
   - Endpoint A, "your account": events `checkout.session.completed`,
     `customer.subscription.updated`, `customer.subscription.deleted`,
     `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed`.
   - Endpoint B, "connected accounts": events `account.application.deauthorized`,
     `account.updated`, `charge.refunded`, `checkout.session.completed`,
     `payment_intent.succeeded`, `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`.

   Each endpoint shows a "signing secret" (starts `whsec_`) once you open it.

## Launch day

4. **Copy the live values into the env file.** Add these five lines (keep the
   existing test lines as they are, they are the way back):
   `STRIPE_LIVE_SECRET_KEY` (starts `sk_live_`, Developers, API keys),
   `STRIPE_LIVE_PUBLISHABLE_KEY` (`pk_live_`), `STRIPE_LIVE_WEBHOOK_SECRET`
   (endpoint A's `whsec_`), `STRIPE_LIVE_CONNECT_WEBHOOK_SECRET` (endpoint B's
   `whsec_`) and `STRIPE_LIVE_CONNECT_CLIENT_ID` (`ca_`, Settings, Connect).
   The "3 keys" are the first three; the last two are Connect's.

5. **Run the check.** `node scripts/go-live-check.mjs` (about 3 minutes).
   It prints PASS or BLOCKED in plain English. Before the switch you want the
   top block ("platform health") all PASS. The Stripe block is allowed to be
   BLOCKED until step 6. The bottom block (demo logins, Terms) is for step 8.

6. **Rehearse, then switch.**
   `node scripts/go-live.mjs --dry-run` prints exactly what it will do and
   changes nothing. When it reads right:
   `node scripts/go-live.mjs --confirm-live`.
   It refuses to run if the platform-health checks fail, if a live value is
   missing or has the wrong prefix, or if Stripe says the live account cannot
   take charges yet. Then it creates the live products, puts the five live
   values on the server, redeploys the functions that use them and checks the
   server now holds exactly those values.

7. **The $1 real charge, and the refund.** Ask Claude for the one-use $1 promo
   code (it takes the $35 Booking plan down to $1.00; Stripe's minimum is
   50 cents). Then:
   - On detailingplatform.com, sign up the Booking plan with that code and
     **your own real card**. You should be charged $1.00.
   - Stripe dashboard (live mode), Payments: the $1.00 is there. Open it,
     Refund. Then Customers, that subscription, Cancel.
   - Run `node scripts/go-live-check.mjs` again: every Stripe line should be
     PASS. Also confirm Webhooks, "Recent deliveries" shows green for the
     events from your purchase. If a delivery is red, stop and tell Claude.

8. **Lock the demo admins (issue #10).** Last, because about 60 browser checks
   still sign in as them. Run from the main checkout, with your real address:
   `node scripts/lock-demo-admins.mjs --owner-email=<your address>` (a rehearsal),
   then the same with `--apply`. Then update `docs/platform-admins.md` and run
   `node scripts/admin-refuses.mjs`.

9. **Terms (issue #33).** Decide: a lawyer reads them, or you choose the
   wording that replaces "not yet reviewed by a lawyer". The check stays
   BLOCKED on this until that line is gone. This one is yours to decide before
   the first paying detailer, not before the $1 proof.

## If something goes wrong

Tell Claude "go back to test mode". It puts the five test values back on the
server and redeploys. **Today only the test secret key is saved in the env
file**; the test publishable key and the three other test values live only on
the server. Before step 6, copy them from Stripe's test mode into the env file
under the plain names (`STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_CONNECT_WEBHOOK_SECRET`, `STRIPE_CONNECT_CLIENT_ID`) so the way back
exists. The check tells you which of them it can and cannot see. No customer
money moves during steps 1 to 6.
