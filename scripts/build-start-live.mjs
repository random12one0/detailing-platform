// ROADMAP 0.4 — PRESS "TELL THEM WORK HAS STARTED" FOR REAL, AGAINST THE LIVE SERVER.
//
//   ALLOW_REAL_MAIL=1 node scripts/build-start-live.mjs                  (dev server on :5173)
//   ALLOW_REAL_MAIL=1 node scripts/build-start-live.mjs --break=no-confirm   # sabotage: never answer the confirm
//   node scripts/receipt.mjs receipts/build-start-live.json
//
// The promise (/terms, /pricing): a detailer is TOLD on the day work on their
// site starts, and that day is RECORDED. One press must do both, a second
// press must be refused naming the date, and an address that cannot receive
// mail must not end up with a recorded date.
//
// WHAT IT TOUCHES, so a lane statement can name it:
//   * Project kguqylyzgyzfktkfnhjb only (refuses any other). Never the demo tenant.
//   * Three throwaway businesses (slug `build-start-live-*`, is_demo), deleted in `finally`.
//   * One throwaway platform admin (`scripts/admin-account.mjs`), deleted in `finally`.
//   * TWO REAL EMAILS to Resend's `delivered@resend.dev` simulator — the success
//     path IS a real send, so it cannot be proved without one. Opt-in per run.
//   * The deployed `platform-admin` and `send-email`. It deploys nothing.
//
// TARGETS (5): success at 1440, success at 392, stale-tab refusal at each width,
// and the unreachable address (asked over the wire; its verdict depends on which
//
// **NOT MEASURED ON MAIN — ROADMAP 98.11, 2026-10-18.** The screen this check
// presses is gone: the "work has started" control lived in the old back office
// (AdminPage, deleted by the 99.3 office move) and nothing in app/src draws it
// now. The server action survives with no caller. ROADMAP 99.10 fix 1 puts the
// control back, and 99.10's held branch carries this script re-pointed at the
// new office (`.bo-panel`). When 99.10 merges, take ITS copy of this file.
// The last measuring version is `git show ea467cb5:scripts/build-start-live.mjs`.
// It refuses before touching anything, so it can never print a pass over a
// screen that is not there, and it writes no receipt.

console.error([
  "NOT MEASURED — build-start-live: the \"Tell them work has started\" control is not in the product.",
  "It was deleted with the old back office; ROADMAP 99.10 fix 1 restores it.",
  "Nothing was touched, no mail was sent, no receipt was written.",
].join("\n"));
process.exit(1);
