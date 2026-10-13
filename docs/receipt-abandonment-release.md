# Receipt attempts that outlive the tab — ROADMAP 14.39

The server records an attempted receipt before handing out its upload URL.
An upload that never finishes is eligible for the existing nightly job after
one hour. This is a technical grace period, longer than the ten-minute upload
URL; it changes no storage allowance or customer fee.

Finish and cleanup lock the same attempt. Finish saves the expense columns
and marks the attempt saved in one transaction. Cleanup can claim only expired,
unattached attempts. Failed deletion stays recorded for retry. A HEAD must
confirm absence before cleanup retires its claim. The receipt bucket listing
also finds a retired attempt whose late PUT subsequently arrived; an unknown
key in that listing never authorizes deletion. Successful receipts are excluded.
Attempt records survive expense deletion so cleanup needs no restored expense.

These changes are server plumbing. The app's wording, allowance, CORS origins
and removal permissions are unchanged. Nothing was published or pushed.

## Repeating the local proof

Start this copy's app with `npm run dev --prefix app -- --port 5180 --strictPort`.
The proof needs the existing PGlite install, defaulting to `%TEMP%/pglite`;
`PGLITE_DIR` can point at another install containing `node_modules/@electric-sql/pglite`.
It runs the migrations only in a throwaway local PostgreSQL database.

Run in this order, from the repo root:

```powershell
node scripts/receipt-abandonment.mjs --break=leave-object
node scripts/receipt-abandonment.mjs
node scripts/receipt.mjs receipts/receipt-abandonment.sabotage.json
node scripts/receipt.mjs receipts/receipt-abandonment.json
```

The sabotage deliberately leaves uploaded objects behind and must fail on the
named abandonment assertions. The normal receipt declares its targets, records
each browser console and includes a canary that independently leaves an object
behind. Expected HTTP refusals and deliberately lost replies are named in that
receipt; other console noise fails the proof. Saved receipts and lost finish
replies keep their authoritative bytes. Browser cases run at phone and desktop
widths against the app's actual `addReceipt`, with fake storage and local SQL.

## Real R2 proof — not run here

The existing R2 environment is configured in Supabase function secrets, but
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` are absent from this
runner. A run with missing names writes a failed, zero-target receipt and
creates no fixture. Do not fetch, print or copy secret values into chat or docs.
Andrew must arrange a proof runner where those names are already configured.

Then run:

```powershell
node scripts/receipt-abandonment.mjs --real-r2 --break=leave-object
node scripts/receipt-abandonment.mjs --real-r2
node scripts/receipt.mjs receipts/receipt-abandonment-r2.sabotage.json
node scripts/receipt.mjs receipts/receipt-abandonment-r2.json
```

This uses actual R2 PUT, GET, HEAD and DELETE with the same cleanup code and a
throwaway local database. Only this run's random fixture keys are addressed;
the teardown removes them even after sabotage. Browser PUTs are relayed by the
proof because port 5180 is deliberately outside production bucket CORS. This
mode proves storage behavior, not CORS or the deployed database migration.
Before each real PUT, its key is saved in
`receipts/receipt-abandonment-r2-objects.json`; verified teardown removes it
from that manifest. If stopped unexpectedly, retain that manifest for cleanup; do not
delete an expense row in order to pretend its object has gone.

## Andrew's release order

Apply both new migrations, in order, to this platform's project
`kguqylyzgyzfktkfnhjb`:

1. `supabase/migrations/20261013130000_receipt_upload_attempts.sql`
2. `supabase/migrations/20261013131000_receipt_attempts_late_put.sql`

Then publish `photo-door` and `photo-reconcile`. The former needs the ledger
before it can sign a new receipt, and the latter needs the claim function.
No new cron, client flag, account decision or bucket-origin change is required.
For the release cutover, allow existing receipt uploads to finish first: objects
started by the old server have no ledger record. This change does not claim to
discover or delete historical, unrecorded files.

After publication, a session checks:

```powershell
node scripts/migration-drift.mjs
node scripts/deployed-inventory.mjs --only=photo-door
node scripts/deployed-inventory.mjs --only=photo-reconcile
node scripts/receipt-door-live.mjs --transport-only
```

The last command is an existing deployed-door baseline: it creates only marked
demo expenses, proves successful readability and refusal, and removes its own
objects and rows. It does not certify abandoned-upload cleanup. For the new
scheduled behavior, abandon a marked receipt from the published door, retain
its expense and key, and verify after its expiry and a scheduled run that its
ledger state is `reaped` and the cleanup report records no failed deletion.
Also repeat a successful receipt and confirm it remains readable. Keep the box
open until the real-R2 sabotage and the deployed scheduled path are proved.

The unrelated Windows newline sabotage failure in the existing receipt wire
suite belongs to ROADMAP 98.5. Its test is left unchanged. Existing server and
schema release drift stays visible in the read-only inventory receipts.
