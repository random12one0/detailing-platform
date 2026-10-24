// ROADMAP 4.3c (a) - THE PREVIEW TAB'S OWN LOCK SWITCH, AS A TESTABLE DECISION.
//
// platform-admin's `support_unlock` / `support_lock` actions call `applyPreviewSwitch` with
// real dependencies (./index.ts wires them); tests/support-sessions-edge.test.mjs runs this
// same function with recording fakes. No imports, so plain node can load it beside
// supportSession.ts.
//
// What it decides, in order: the caller's token must carry a session id; the marker read
// must succeed (a failed read never counts as "no marker", because that answer unlocks);
// an unmarked session is an older one-time-link preview that was never locked, so the true
// answer is that it can change things (nothing written, nothing logged); the opener's
// back-office sign-in must still exist; an ended preview switches nothing either way
// (expiry never restores writability, and a dead session gains nothing from a relock row);
// unlocking is the risky direction so its audit row comes first and a failed one stops the
// switch. Locking still applies first and only then records the press, but a missing
// audit entry is answered, not swallowed: the lock holds and the tab is told.

export type SwitchMarker = {
  session_id: string;
  user_id: string;
  business_id: string;
  admin_id: string | null;
  unlocked_at?: string | null;
  expires_at?: string | null;
};

export type SwitchDeps = {
  /** Read this session's marker. */
  lookup: (sid: string) => Promise<{ data: SwitchMarker | null; error: { code?: string; message?: string } | null }>;
  /** The back-office login that opened the preview - null when it is gone. */
  getOpener: (adminId: string) => Promise<{ email: string } | null>;
  /** The previewed business's name for the audit row - null when unknown. */
  getBusinessName: (businessId: string) => Promise<string | null>;
  /** The account's audit history - false when the row did not land. */
  audit: (by: { id: string; email: string }, action: "support_unlock" | "support_lock", biz: { id: string; name: string | null }, detail: unknown) => Promise<boolean>;
  /** Stamp or clear unlocked_at for exactly this session. */
  setUnlocked: (sid: string, unlocked: boolean) => Promise<{ error: unknown }>;
  now: () => number;
};

export type SwitchResult = { status: number; body: Record<string, unknown> };

export async function applyPreviewSwitch(
  deps: SwitchDeps,
  action: "support_unlock" | "support_lock",
  tokenSid: string | null,
  actorEmail: string,
): Promise<SwitchResult> {
  const unlock = action === "support_unlock";
  // NOTE: a legacy server (before this switch existed) answers these actions 404
  // "Not found" / 400 "Unknown action" via the admin gate. This handler therefore
  // never answers 404: every current-server refusal is 403 or 500, so the preview
  // tab can treat any 404 as a legacy server and keep working, without ever
  // mistaking a current-server refusal for permission to switch locally.
  if (!tokenSid) return { status: 403, body: { error: "This preview sign-in was not recognized, so nothing changed." } };
  const { data: mark, error: markReadErr } = await deps.lookup(tokenSid);
  if (markReadErr) return { status: 500, body: { error: "Could not check this preview, so nothing changed." } };
  if (!mark) return { status: 200, body: { success: true, unlocked: true, marked: false } };
  if (!mark.admin_id) return { status: 403, body: { error: "This preview has no recorded opener, so nothing changed." } };
  const opener = await deps.getOpener(mark.admin_id);
  if (!opener) return { status: 403, body: { error: "That preview's back-office sign-in is gone, so nothing changed." } };
  const by = { id: mark.admin_id, email: opener.email };
  const biz = { id: mark.business_id, name: await deps.getBusinessName(mark.business_id) };
  const ends = Date.parse(mark.expires_at ?? "");
  if (Number.isFinite(ends) && ends <= deps.now()) {
    return { status: 403, body: { error: "That preview has ended, so nothing changed." } };
  }
  // Unlocking is the risky direction, so its audit row comes first and a failed
  // one stops it - the same rule as `impersonate`. Locking is the safe direction,
  // so it never waits on the log.
  if (unlock && !(await deps.audit(by, "support_unlock", biz, { as: actorEmail }))) {
    return { status: 500, body: { error: "Could not write the audit record, so changes stay off." } };
  }
  const { error: lockErr } = await deps.setUnlocked(tokenSid, unlock);
  if (lockErr) {
    return unlock
      ? { status: 500, body: { error: "Could not switch changes on." } }
      : { status: 500, body: { error: "Could not switch changes off." } };
  }
  // Locking stays applied even when the audit row fails to land: the safe direction
  // never waits on the log. But the missing audit entry is surfaced, not silently
  // discarded - the tab flips to looking (matching the server's lock) while showing
  // that this press was never recorded.
  if (!unlock) {
    const lockAudited = await deps.audit(by, "support_lock", biz, { as: actorEmail });
    if (!lockAudited) {
      return { status: 500, body: { error: "Back to looking, but this press was not recorded.", locked: true } };
    }
  }
  return { status: 200, body: unlock ? { success: true, unlocked: true } : { success: true, unlocked: false } };
}
