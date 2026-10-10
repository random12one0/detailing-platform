// ROADMAP 4.3c — IS THIS REQUEST A READ-ONLY SUPPORT SESSION?
//
// Edge functions run as the service role, so the database's support-session
// rules (20261010030000_support_sessions_read_only.sql) never see their writes.
// Each function that authenticates a user asks this instead. It is keyed on the
// SESSION id inside the caller's token, never on who the caller is, so the
// owner's own login is a different session and is never touched (the
// 2026-09-21 ruling: key on where the session is acting, not on the person).
//
// No imports, so tests/support-sessions-edge.test.mjs can load it with plain
// node. The lookup is handed in.

/** The `session_id` claim of a JWT, or null. Call only AFTER the token was verified (getUser). */
export function sessionIdOf(token: string): string | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const sid = JSON.parse(atob(b64))?.session_id;
    return typeof sid === "string" && sid ? sid : null;
  } catch {
    return null;
  }
}

export type MarkerLookup = (sessionId: string) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;

/**
 * True when the token's session is listed in `support_sessions`.
 *
 * FAILS CLOSED: a lookup that errors counts as a support session, so a broken
 * read refuses a write rather than allowing one. ONE error is not closed, on
 * purpose: the table not existing. platform-admin refuses to hand out a support
 * session unless its marker row landed, so with no table there can be no
 * support session — and without this exception, publishing the functions
 * before the migration would refuse every detailer's every save.
 */
export async function isSupportSession(token: string, lookup: MarkerLookup): Promise<boolean> {
  const sid = sessionIdOf(token);
  if (!sid) return false;
  const { data, error } = await lookup(sid);
  if (error) return !(error.code === "42P01" || error.code === "PGRST205");
  return !!data;
}

export const SUPPORT_READ_ONLY = "This is a read-only support view, so nothing can be changed here.";
