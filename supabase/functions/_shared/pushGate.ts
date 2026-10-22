// ROADMAP 97.33 — THE OWNER'S "PUSH ALERTS OFF" SWITCH, IN ONE PLACE.
//
// `push_enabled` used to gate only the 4 senders whose call sites happened to
// check it; the starting-soon, wrap-up, finalize and request nudges, the
// morning digest, and cancel, reschedule and update-booking all sent pushes
// with the switch off. The gate lives HERE now — every owner push in the
// product goes through `sendOwnerPush` in `_shared/ownerPush.ts`, which asks
// this rule first — so a new sender cannot repeat the fault by forgetting a
// check at its own call site.
//
// No imports, so a Node test can load and RUN this exact code in place inside
// the sender (see its header in `_shared/db.ts` for why that matters).

export function pushAllowed(
  settings: { push_enabled?: boolean | null } | null | undefined,
): boolean {
  // Off is explicit. A missing row or a missing value means on: the column
  // defaults true and `getSettings`' fallback says true, so "nobody ever set
  // this" must not silence pushes.
  return settings?.push_enabled !== false;
}
