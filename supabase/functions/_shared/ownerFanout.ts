// ROADMAP 97.5 — ONE BAD OWNER ADDRESS MUST NOT RE-SEND TO THE GOOD ONES.
//
// The owner reminder and the stale-request nudge go to every address in
// `ownerRecipients`. Both used to call `mustSend` INSIDE the loop, so recipient
// B's refusal threw after recipient A had already been sent: no marker was
// written, the push after the loop was skipped, and every 15-minute sweep sent
// A the same email again.
//
// The rule now: try every address, send the push, and fail the whole send only
// when NOTHING reached the owner — no email AND no push. Anything that reached
// them marks the booking; each refused address is already a `failed` row in
// `email_sends` (send-email records it), which is where the mail log shows it.
//
// WHY THE PUSH COUNTS (review of 97.5, 2026-10-16). The first version threw
// when every EMAIL was refused, before the push. For a business with one owner
// address, or any day the email allowance runs out, the "Still waiting on you"
// push then went out ZERO times until email worked again — and before 97.5 the
// same case pushed every 15 minutes. Counting a delivered push as reaching the
// owner sends it exactly once in both cases.
//
// ponytail: the booking carries one marker, not one per channel or address, so
// a refused address is not retried once the owner was reached some other way.
// Per-address retry needs a per-recipient marker column; add it if a real
// detailer needs it.
//
// No Deno imports, so tests/owner-fanout.test.mjs runs this exact code in Node.

export async function sendToEachOwner(
  recipients: string[],
  send: (to: string) => Promise<boolean>,
): Promise<{ sent: number; failed: string[] }> {
  let sent = 0;
  const failed: string[] = [];
  for (const to of recipients) {
    let ok = false;
    try { ok = await send(to); } catch { ok = false; }
    if (ok) sent++;
    else failed.push(to);
  }
  return { sent, failed };
}

/** Throws — so the sweep leaves the marker alone and retries — only when there
 *  were addresses to email and neither an email nor a push reached the owner. */
export function requireOwnerReached(
  r: { addresses: number; sent: number; pushed: number },
  what: string,
) {
  if (r.addresses && !r.sent && !r.pushed) {
    throw new Error(`the email relay refused the ${what} to all ${r.addresses} owner address(es) and no push was delivered. Not marking it as sent.`);
  }
}
