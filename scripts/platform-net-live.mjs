// ROADMAP 9.14c — TYPE BILLS INTO THE REAL /admin FORM AND CHECK THE PROFIT
// FIGURE AGAINST A CALCULATION THAT DOES NOT GO THROUGH THE PRODUCT.
//
//   node scripts/platform-net-live.mjs                        (dev server on :5173)
//   node scripts/platform-net-live.mjs --break=net-on-empty   # sabotage: the server's answer for the empty month is rewritten into 9.14's fault — a profit with no costs entered
//   node scripts/platform-net-live.mjs --break=count-open     # sabotage: the independent calculation counts the UNPAID invoice
//   node scripts/receipt.mjs receipts/platform-net-live.json
//
// WHY A TEST MONTH AND NOT ANDREW'S OWN BILLS. The live database had no paid
// platform invoice in ANY month (2026-10-10), so "paid revenue minus costs" was
// "0 minus costs" everywhere — a comparison that cannot tell a screen that
// ignores revenue from one that does not. Nobody here knows his real bill
// amounts, and a saved bill cannot be removed from the screen. So the run works
// in SEPTEMBER 2025, before the platform existed, and refuses to start if
// anything is already there.
//
// WHAT IT WRITES, ALL OF IT REMOVED IN `finally` (project kguqylyzgyzfktkfnhjb,
// refuses any other):
//   * a throwaway platform admin (`scripts/admin-account.mjs`);
//   * three fixture invoices on the demo business — $40 paid in September,
//     $539 marked OPEN but dated inside September (the status filter is the
//     only thing keeping it out), $100 paid in October;
//   * four bills, saved THROUGH THE FORM by the deployed `platform-admin`:
//     three at 1440, one more at 392.
// What it leaves: `platform_cost_add` writes one `platform_admin_events` row per
// saved bill. An audit trail is not cleaned up after; four rows per run, admin
// email `platform-net-live-test@…`.
//
// **NOT MEASURED ON MAIN — ROADMAP 98.11, 2026-10-18.** The screen this check
// reads is gone: the old back office's "Did we make money?" showed a CHOSEN
// month's money in, costs and profit. The new office draws profit for the
// current month only ("You kept", measured by platform-costs-live.mjs), and its
// Platform bills switch stops twelve months back. That loss is ROADMAP 98.15.
// The bill form's "Save" is still there, but typing bills only means something
// here when the profit can be read back, so the whole check waits.
// A version re-pointed at the new office, which reaches "Save" (49 assertions,
// 4 of 4 targets, red only on the lost figures and on 98.14), is
// `git show 11387e7f:scripts/platform-net-live.mjs`; 99.10's held branch has its
// own. The last version that measured the old office is
// `git show ea467cb5:scripts/platform-net-live.mjs`.
// It refuses before touching anything and writes no receipt.

console.error([
  "NOT MEASURED — platform-net-live: the office no longer shows a chosen month's profit, which is what this check reads.",
  "ROADMAP 98.15 restores it; platform-costs-live.mjs measures this month's \"You kept\".",
  "Nothing was touched, no receipt was written.",
].join("\n"));
process.exit(1);
