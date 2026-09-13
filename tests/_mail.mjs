// THE FIXTURE MAIL SINK — import this instead of typing an address into a test.
//
// ---------------------------------------------------------------------------
// WHAT THE PROBLEM ACTUALLY IS
// ---------------------------------------------------------------------------
// Andrew, 2026-09-13: *"Reserving twenty a day is a mitigation, not a fix. On
// 7 September the suites attempted 240 against a cap of 100. Andrew's
// allowance should be untouchable by a test run."*
//
// **THE FAKE TRANSPORT ALREADY EXISTED AND WAS SIMPLY EASY TO WALK PAST.**
// `send-email` refuses a reserved domain (RFC 2606 / 6761 - `.test`,
// `.invalid`, `.localhost`, `.example`, and `example.com|net|org`) BEFORE it
// claims anything and before it calls the provider, and it answers
// `{ success: true, skipped: "undeliverable_domain" }`, so the calling flow
// behaves exactly as if the mail had gone. That is a fake transport. What was
// missing was any reason for a suite to use it: a fixture typed
// `delivered@resend.dev` and nothing anywhere said no.
//
// PROVED LIVE against the deployed relay, 2026-09-13:
//
//   sink-probe@fixture.test        -> {"success":true,"skipped":"undeliverable_domain"}
//                                     claimed 99 -> 99, refused 5 -> 5   (free)
//   real-probe@detailplatform.com  -> 429 daily_cap
//                                     refused 5 -> 6                     (charged)
//
// **AND THE AUTH ACCOUNTS COST NOTHING, WHICH IS WORTH WRITING DOWN BECAUSE IT
// LOOKS LIKE THEY WOULD.** `mailer_autoconfirm` is true on this project and no
// custom SMTP is configured, so a signup sends no confirmation and password
// mail leaves through Supabase's own sender rather than Resend. A fixture
// LOGIN on a deliverable domain is therefore not a spender; a fixture
// RECIPIENT is.
//
// ---------------------------------------------------------------------------
// HOW TO USE IT
// ---------------------------------------------------------------------------
//   import { sink, realMail } from "./_mail.mjs";
//
//   customer_email: sink("multi-vehicle")        // free, always
//   customer_email: realMail("delivered@resend.dev",
//     "§ 2 proves the provider leg itself")      // charged, and it SAYS SO
//
// `realMail` prints a line naming the suite and the reason every time it is
// called, so a run that spends the allowance says so in its own output rather
// than in a counter somebody reads the next morning.
//
// `tests/mail-sink.test.mjs` fails on any address in `tests/` or `scripts/`
// that is neither on a reserved domain nor declared, which is what makes the
// sink the DEFAULT rather than a convention.

/** The reserved TLD every fixture recipient lives on. `.test` can never resolve. */
export const SINK_DOMAIN = "fixture.test";

/** A recipient that cannot cost anything. `tag` only has to be unique enough to read in a log. */
export function sink(tag) {
  const clean = String(tag).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${clean || "fixture"}@${SINK_DOMAIN}`;
}

/**
 * A recipient that WILL be charged against Andrew's daily allowance.
 *
 * Every call prints. That is the whole point: a suite that spends real mail
 * must say so out loud in its own output, at the moment it does it.
 */
export function realMail(address, reason) {
  if (!reason) throw new Error("realMail(address, reason) - a real send must say why");
  console.log(`   REAL MAIL: ${address} — ${reason}`);
  return address;
}
