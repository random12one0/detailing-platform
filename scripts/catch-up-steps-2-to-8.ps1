# FOR-ANDREW.md "Publish and apply — the one ordered list", steps 2 to 8, in order.
# Step 1 (report-problem) was published 2026-10-10. Step 9 (photos) needs your
# Cloudflare dashboard first (9a1 + 9a2) and is NOT in here.
#
# Stops at the first failure and says which step. Safe to re-run from the top only
# if it stopped in step 2 or 4 BEFORE "applied" printed for a file — a database
# file that already ran fails loudly the second time rather than doing anything.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot)
$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
foreach ($l in Get-Content .env) { if ($l -match '^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$') { Set-Item "env:$($Matches[1])" $Matches[2] } }
if ($env:SUPABASE_PROJECT_REF -ne "kguqylyzgyzfktkfnhjb") { throw "Wrong project in .env - stopping. Nothing was changed." }

function Step($name, [scriptblock]$do) {
  Write-Host "`n== $name" -ForegroundColor Cyan
  & $do
  if ($LASTEXITCODE -ne 0) { Write-Host "`nSTOPPED at: $name. Nothing after it ran." -ForegroundColor Red; exit 1 }
}

Step "Step 2 - five database changes" { node scripts/apply-migrations.mjs 20260924010000_a_fixture_is_not_a_customer.sql 20261006010000_an_email_row_knows_its_booking.sql 20261006020000_hand_entered_platform_costs.sql 20261006030000_dashboard_language_reaches_the_server.sql 20261006040000_bookings_browser_updates_nothing.sql }
Step "Step 3 - four programs" { node scripts/deploy-functions.mjs create-booking get-booking-receipt platform-admin send-owner-reminders }
Step "Step 4 - two database changes" { node scripts/apply-migrations.mjs 20261006050000_action_log.sql 20261006062000_send_invoice_attempts.sql }
$rest = @("address-suggest","unsubscribe","resend-webhook","send-email","accept-invite","available-slots","pay-booking","track-visit","validate-promo-code","accept-quote","plan-link","reschedule-booking","calculate-booking","booking-ics","cancel-booking","send-invoice","respond-to-booking","update-booking","create-business","invite-user","preview-emails","send-campaign","watch-jobs","connect-account")
Step "Step 5 - the remaining 24 programs" { node scripts/deploy-functions.mjs @rest }
Step "Step 6 - platform-billing" { node scripts/deploy-functions.mjs platform-billing }
Step "Step 7 - name-length limits" { node scripts/apply-migrations.mjs 20261007010000_tenant_string_lengths.sql }
Step "Step 8 - stripe-webhook, last" { node scripts/deploy-functions.mjs stripe-webhook }

Write-Host "`n== Checks (these only read)" -ForegroundColor Cyan
node scripts/migration-drift.mjs | Select-Object -Last 6
node scripts/deployed-inventory.mjs | Select-Object -Last 8
Write-Host "`nDone with steps 2-8. Expected: drift names only the photo files; inventory names only delete-customer, photo-door and photo-reconcile (step 9)." -ForegroundColor Green
