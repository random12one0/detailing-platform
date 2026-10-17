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

export type SupportState = "none" | "live" | "expired";

/**
 * ROADMAP 97.15: none, live, or past its `expires_at` (30 minutes after platform-admin opened it).
 * A failed read is "live" — refused everywhere except the read-only functions, as before. A row
 * with no `expires_at` (the column's migration not yet applied) is "live" too: no deadline is known.
 */
export async function supportSessionState(token: string, lookup: MarkerLookup): Promise<SupportState> {
  const sid = sessionIdOf(token);
  if (!sid) return "none";
  const { data, error } = await lookup(sid);
  if (error) return error.code === "42P01" || error.code === "PGRST205" ? "none" : "live";
  if (!data) return "none";
  const ends = Date.parse((data as { expires_at?: string }).expires_at ?? "");
  return Number.isFinite(ends) && ends <= Date.now() ? "expired" : "live";
}

/** May a request in this state pass requireMember? An expired support session passes nowhere. */
export const supportAdmits = (state: SupportState, allowSupport: boolean): boolean =>
  state === "none" || (state === "live" && allowSupport);

/**
 * True when the token's session is listed in `support_sessions` (expired or not: a listed
 * session is read-only for ever, and expiry only takes away the reads too).
 *
 * FAILS CLOSED: a lookup that errors counts as a support session, so a broken
 * read refuses a write rather than allowing one. ONE error is not closed, on
 * purpose: the table not existing. platform-admin refuses to hand out a support
 * session unless its marker row landed, so with no table there can be no
 * support session — and without this exception, publishing the functions
 * before the migration would refuse every detailer's every save.
 */
export async function isSupportSession(token: string, lookup: MarkerLookup): Promise<boolean> {
  return (await supportSessionState(token, lookup)) !== "none";
}

export type SupportViewDeps = {
  /** Exchange the sign-in link for a session (platform-admin: verifyOtp on a fresh anon client). */
  exchange: () => Promise<{ session: { access_token: string; refresh_token?: string; user: { id: string } } | null; error: unknown }>;
  /** Write the marker; answers with its deadline (the column's 30-minute default). */
  mark: (row: { session_id: string; user_id: string }) => Promise<{ expires_at?: string | null; error: unknown }>;
  /** End a session that must not be handed over. */
  end: (accessToken: string) => Promise<unknown>;
};

/**
 * ROADMAP 4.3c + 97.15 — THE VIEW-AS HAND-OVER. Exchange the link, mark the session read-only,
 * and only then answer with the access token and its deadline. NEVER the refresh token: with one
 * the session renewed itself for ever; without it, it dies with its access token. Null means
 * refuse and hand over nothing — no session id, or a marker that did not land (that session is
 * ended rather than left about).
 */
export async function openSupportView(deps: SupportViewDeps, as: string): Promise<{ access_token: string; expires_at: string; as: string } | null> {
  const { session, error } = await deps.exchange();
  const sid = session ? sessionIdOf(session.access_token) : null;
  if (error || !session || !sid) return null;
  const { expires_at, error: markErr } = await deps.mark({ session_id: sid, user_id: session.user.id });
  if (markErr || !expires_at) {
    try { await deps.end(session.access_token); } catch { /* refused either way */ }
    return null;
  }
  return { access_token: session.access_token, expires_at, as };
}

export const SUPPORT_READ_ONLY = "This is a read-only support view, so nothing can be changed here.";
