// WHAT THE NEW BACK OFFICE'S SYSTEM PLACE KNOWS, worked out with no React and no
// browser (ROADMAP 9.12a, plan step 4). `tests/office-system.test.mjs` runs it.
//
// EVERY INPUT IS ALREADY ON THE WIRE in `list`: `heartbeats`, `watch`, `email`,
// `photo_store`. Nothing here asks the server for anything new, and no check is
// invented: the mockup's texts, sign-in and site checks have nothing behind them
// yet, so they are not drawn.
//
// FOUR STATES. `ok`; `bad` (broken now); `warn` (working, near a limit);
// `never` (never seen working). Only `bad` may count on the nav badge: a job that
// has not come round yet is not failing, and a monitor that cries wolf is worse
// than none (ROADMAP 6.2a; the old screen's comment said the same). Every non-ok state is LOUD on the page.

// The same names watch-jobs/index.ts uses for its alert email (ROADMAP 10.1).
const JOB_LABELS = {
  "send-owner-reminders": "Reminder sweep",
  "accrue-plan-visits": "Plan-visit count",
};
// The restore drill rides in job_heartbeats but is not a scheduled job (6.1).
export const RESTORE_JOB = "restore-drill";
export const RESTORE_OLD_DAYS = 90;
const MIN = 60000;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// A job's window in words: 15 -> "15 min", 1440 -> "day", 2880 -> "2 days".
const every = (m) => (m % 1440 === 0 ? (m === 1440 ? "day" : `${m / 1440} days`) : m % 60 === 0 ? (m === 60 ? "hour" : `${m / 60} hours`) : `${m} min`);
export const mb = (b) => {
  const v = Number(b ?? 0) / 1048576;
  return v >= 1024 ? `${(v / 1024).toFixed(1)} GB` : `${Math.round(v)} MB`;
};

// "When was it last checked", in words. null is "never".
export function ago(iso, now = Date.now()) {
  const t = Date.parse(iso ?? "");
  if (!Number.isFinite(t)) return "never";
  const m = Math.max(0, Math.round((now - t) / MIN));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 48 * 60) return `${plural(Math.round(m / 60), "hour", "hours")} ago`;
  return `${plural(Math.round(m / 1440), "day", "days")} ago`;
}

// A heartbeat: a seeded row or no time is `never`, past its window is `bad`.
export function jobState(h, now = Date.now()) {
  if (!h?.ran_at || h?.detail?.seeded === true) return "never";
  const limit = (h.stale_after_seconds ?? 86400) / 60;
  return (now - Date.parse(h.ran_at)) / MIN > limit ? "bad" : "ok";
}

const RANK = { bad: 0, warn: 1, never: 2, ok: 3 };

// Every check, in a fixed order. `at` is when it was last checked (null = never).
export function checksOf(state, now = Date.now()) {
  const read = new Date(now).toISOString();
  const out = [];
  const beats = (state?.heartbeats ?? []).filter((h) => h.job !== RESTORE_JOB);
  for (const h of beats) {
    const st = jobState(h, now);
    const limit = Math.round((h.stale_after_seconds ?? 86400) / 60);
    const late = Math.round((now - Date.parse(h.ran_at)) / MIN);
    out.push({
      key: `job:${h.job}`, name: JOB_LABELS[h.job] ?? h.job, state: st,
      at: st === "never" ? null : h.ran_at,
      says: st === "ok" ? "Finished on time"
        : st === "bad" ? `Has not finished in ${late} min. It runs every ${every(limit)}`
        : `Has never reported. It runs every ${every(limit)}`,
    });
  }
  // No job at all is not good news: a dropped table or a revoked grant looks like this.
  if (beats.length === 0) out.push({ key: "job:none", name: "Scheduled jobs", state: "never", at: null, says: "No job has reported at all" });

  out.push(state?.watch?.outside
    ? { key: "watch", name: "Outside watcher", state: "ok", at: read, says: "Would notice if every job stopped" }
    : { key: "watch", name: "Outside watcher", state: "never", at: read, says: "Not set up. Nothing would notice if every job stopped at once" });

  const r = (state?.heartbeats ?? []).find((h) => h.job === RESTORE_JOB && Number.isFinite(Date.parse(h.ran_at)));
  if (!r) out.push({ key: "restore", name: "Restore test", state: "never", at: null, says: "Never recorded. Nobody knows a lost database would come back" });
  else {
    const old = now - Date.parse(r.ran_at) > RESTORE_OLD_DAYS * 1440 * MIN;
    out.push({
      key: "restore", name: "Restore test", state: old ? "warn" : "ok", at: r.ran_at,
      says: old ? "Over three months old. Run it again before counting on it"
        : `Came back whole: ${r.detail?.tables ?? "?"} tables, ${r.detail?.accounts ?? "?"} logins`,
    });
  }

  const m = state?.email ?? {};
  const cap = Number(m.cap ?? 0), sent = Number(m.sent ?? 0);
  const mail = (st, says) => ({ key: "email", name: "Email", state: st, at: read, says, sent, cap });
  out.push(
    m.refused_platform > 0 ? mail("bad", `${plural(m.refused_platform, "signup notice", "signup notices")} lost today: the reserve is used up`)
    : m.failed > 0 ? mail("bad", `${plural(m.failed, "email", "emails")} failed to send today`)
    : cap && sent >= cap * 0.8 ? mail("warn", `${sent} of ${cap} today. The limit is shared with andrewsdetail.com, so it may be higher`)
    : !m.owner_email ? mail("warn", "Nobody is told about signups")
    : mail("ok", `${sent} of ${cap} sent today`));

  const s = state?.photo_store;
  const used = Number(s?.used_bytes ?? 0), total = Number(s?.total_bytes ?? 0), promised = Number(s?.committed_bytes ?? 0);
  const store = (st, says) => ({ key: "storage", name: "Photo storage", state: st, at: read, says, used, total });
  out.push(
    !s || !total ? store("never", "Could not read the store's size")
    : used >= total ? store("bad", `Full: ${mb(used)} of ${mb(total)}. Uploads will fail`)
    : used >= total * 0.8 ? store("warn", `Nearly full: ${mb(used)} of ${mb(total)}`)
    : promised > total ? store("warn", `Over-promised: ${mb(promised)} handed out against ${mb(total)}`)
    : store("ok", `${mb(used)} of ${mb(total)} used`));

  // Wired to nothing yet (the old screen's "Not wired up yet"): never proven.
  out.push({ key: "stripe", name: "Card payments", state: "never", at: null, says: "Nothing reads Stripe yet, so a failed charge would go unseen" });
  out.push({ key: "netlify", name: "Website builds", state: "never", at: null, says: "Nothing reads Netlify yet" });
  return out;
}

// What stands out: everything not ok, broken first.
export const loudOf = (checks) => checks.filter((c) => c.state !== "ok").sort((a, b) => RANK[a.state] - RANK[b.state]);
// The nav badge: broken only.
export const brokenOf = (checks) => checks.filter((c) => c.state === "bad").length;
