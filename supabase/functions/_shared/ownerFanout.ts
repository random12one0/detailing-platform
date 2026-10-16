// ROADMAP 97.5 — ONE BAD OWNER ADDRESS MUST NOT RE-SEND TO THE GOOD ONES.
//
// The owner reminder and the stale-request nudge go to every address in
// `ownerRecipients`. Both used to call `mustSend` INSIDE the loop, so recipient
// B's refusal threw after recipient A had already been sent: no marker was
// written, the push after the loop was skipped, and every 15-minute sweep sent
// A the same email again.
//
// The rule now: try every address, and fail the whole send only when NOTHING
// went out. One success is enough to mark the booking; each refused address
// is already a `failed` row in `email_sends` (send-email records it), which is
// where the mail log shows it.
//
// ponytail: the booking carries one marker, not one per address, so a refused
// address is not retried once another address succeeded. Per-address retry
// needs a per-recipient marker column; add it if a real detailer needs it.
//
// No Deno imports, so tests/owner-fanout.test.mjs runs this exact code in Node.

export async function sendToEachOwner(
  recipients: string[],
  send: (to: string) => Promise<boolean>,
  what: string,
): Promise<{ sent: number; failed: string[] }> {
  let sent = 0;
  const failed: string[] = [];
  for (const to of recipients) {
    let ok = false;
    try { ok = await send(to); } catch { ok = false; }
    if (ok) sent++;
    else failed.push(to);
  }
  if (recipients.length && !sent) {
    throw new Error(`the email relay refused the ${what} to all ${recipients.length} owner address(es). Not marking it as sent.`);
  }
  return { sent, failed };
}
