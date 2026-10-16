// ROADMAP 97.3 — THE SCHEDULER'S KEY. The four background jobs
// (`send-owner-reminders`' sweep, `refresh-weather`, `watch-jobs`,
// `photo-reconcile`) are public at the gateway because pg_cron has no user
// session. Until this existed, that meant ANYONE could fire them. Now the call
// must carry `x-cron-secret` equal to the `CRON_SECRET` environment value; the
// cron jobs read the same value out of Supabase Vault
// (`20261016100000_cron_jobs_send_secret.sql`), so it is never in git.
//
// Import-free and Deno-free (the default argument is only evaluated when no
// secret is passed), so `tests/cron-secret.test.mjs` can run it in Node.
//
// FAILS CLOSED: no `CRON_SECRET` on the server refuses every call with 503,
// which `net._http_response` tells apart from a wrong header's 401.

export const CRON_HEADER = "x-cron-secret";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** null when the call may run; otherwise the refusal to return. */
export function cronRefusal(
  req: Request,
  secret: string | undefined = (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env.get("CRON_SECRET"),
): Response | null {
  if (!secret) {
    console.error("CRON_SECRET is not set; refusing the scheduled call");
    return json({ error: "Not configured" }, 503);
  }
  const got = req.headers.get(CRON_HEADER) ?? "";
  // Constant-time over the longer length, so a timing probe learns nothing.
  let diff = got.length ^ secret.length;
  for (let i = 0; i < Math.max(got.length, secret.length); i++) {
    diff |= (got.charCodeAt(i) || 0) ^ (secret.charCodeAt(i) || 0);
  }
  return diff === 0 ? null : json({ error: "Unauthorized" }, 401);
}
