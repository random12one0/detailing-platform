// THE PHOTO RECONCILE — ROADMAP 0.11 slice 6, `docs/the-photo-allowance.md` § 6.
//
// *"Sum the real object sizes under each business's prefix in R2 and compare them to that business's
// `job_photos` sum. Any difference is one of: an object with no row, a row with no object, or a
// recorded size that does not match the stored one. All three are invisible today and all three would
// first appear as an invoice. The point is not to fix drift automatically. The point is that it shows
// up as a number somewhere on a schedule."*
//
// THIS FILE IS THAT, AND IT NEVER WRITES TO R2 OR TO `job_photos`. There is no `del` call, no update and no
// "repair" anywhere in it: a reconcile that quietly fixes drift hides the very thing it is there to show,
// and a deletion driven by a listing is how one tenant's photographs become another's loss. The numbers go
// to one place, the `photo-reconcile` row of `job_heartbeats`, which already exists, already shows on the
// back office's *Jobs that run on their own* list, and is already read as stale when nothing has run.
//
// IMPORT-FREE EXCEPT FOR ITS SIBLINGS, like `photoDoor.ts`: Node 24 strips the types and runs it, so
// `tests/photo-reconcile.test.mjs` exercises this exact text in memory with no Deno, no R2 and no database.
//
// ---------------------------------------------------------------------------------------------------------
// A RUN THAT DID NOT HAPPEN MUST NOT LOOK LIKE ONE THAT FOUND NOTHING — ROADMAP 6.2a, applied here
// ---------------------------------------------------------------------------------------------------------
//   * R2 not configured  -> 503 and NO heartbeat. Stamping "ran" would read as a clean reconcile.
//   * listing failed or hit its page ceiling -> an error and NO heartbeat, never a partial bucket reported
//     as the whole one.
//   * the database read failed -> the same.
//   * the allowance unreadable -> the drift is still real and is stamped, with `allowance` null: the caps
//     are UNKNOWN, not "nobody is over", and the report says null rather than false.
//
// ---------------------------------------------------------------------------------------------------------
// IT IS PUBLIC AND UNAUTHENTICATED, LIKE `refresh-weather`, AND BOUNDED THE SAME WAY
// ---------------------------------------------------------------------------------------------------------
// pg_cron calls it with no session. A caller who hammers it could otherwise spend R2 list requests, so it
// refuses unless the last real run is older than `MIN_INTERVAL_MS` (read from the heartbeat, which a caller
// cannot write) and it sits behind a global rate limit. All it can ever do for a stranger is the reading
// the next scheduled run would have done, and it reads, it does not change anything.

import { parseObjectKey } from "./photoKey.ts";
import { listAll, type ListedObject, type R2Store } from "./r2.ts";

export const BUCKET = "job-photos";
export const JOB = "photo-reconcile";
/** Six hours. The cron runs daily; this only bounds a stranger and a double press. */
export const MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;
/** A heartbeat row older than this reads as stopped on the back office (`job_heartbeats.stale_after_seconds`). */
export const STALE_AFTER_SECONDS = 90_000;
/** How many drifting businesses are written out by name. The totals always cover all of them. */
export const NAMED_BUSINESSES = 25;

export interface DbPhoto { business_id: string; path: string; bytes: number | null }

export interface BusinessReport {
  r2_objects: number; r2_bytes: number;
  db_rows: number; db_bytes: number;
  /** In R2, no row behind it: invisible to every budget check. */
  orphans: number; orphan_bytes: number;
  /** A row, no object in R2: a photograph the detailer sees and the store lost. */
  missing: number; missing_bytes: number;
  /** Both exist and the recorded size is not the stored one. */
  mismatched: number; mismatch_bytes: number;
  /** A row whose `bytes` is null: counted as unknown, never as zero. */
  unknown_size_rows: number;
  /** A row filed under one business whose key sits under another's prefix. The isolation question. */
  misfiled: number;
  over_share: boolean | null;
}

export interface Allowance { total_bytes: number; share_bytes: number }

export interface Report {
  clean: boolean;
  r2_objects: number; r2_bytes: number; db_rows: number; db_bytes: number;
  drift_bytes: number;
  orphans: number; orphan_bytes: number; missing: number; missing_bytes: number;
  mismatched: number; mismatch_bytes: number; unknown_size_rows: number; misfiled: number;
  /** Objects whose key is not one this product mints: under no business, so under no budget. */
  unattributed_objects: number; unattributed_bytes: number;
  businesses_seen: number; businesses_drifting: number;
  /** Null when the caps could not be read; then every `over_share` is null too. */
  allowance: (Allowance & { store_used_bytes: number; store_used_pct: number | null; businesses_over_share: number }) | null;
  named: Record<string, BusinessReport>;
  named_truncated: boolean;
}

const empty = (): BusinessReport => ({
  r2_objects: 0, r2_bytes: 0, db_rows: 0, db_bytes: 0, orphans: 0, orphan_bytes: 0,
  missing: 0, missing_bytes: 0, mismatched: 0, mismatch_bytes: 0, unknown_size_rows: 0, misfiled: 0, over_share: null,
});

/**
 * Compares what the bucket holds with what the database says, per business and in total. Pure.
 */
export function reconcile(objects: ListedObject[], rows: DbPhoto[], allowance: Allowance | null): Report {
  const per = new Map<string, BusinessReport>();
  const get = (id: string) => { let r = per.get(id); if (!r) { r = empty(); per.set(id, r); } return r; };

  const byKey = new Map<string, number>();
  let unattributed = 0, unattributedBytes = 0;
  for (const o of objects) {
    const k = parseObjectKey(o.key);
    if (!k) { unattributed++; unattributedBytes += o.bytes; continue; }
    byKey.set(o.key, o.bytes);
    const b = get(k.businessId);
    b.r2_objects++; b.r2_bytes += o.bytes;
  }

  const seenPaths = new Set<string>();
  for (const row of rows) {
    const parsed = parseObjectKey(row.path);
    // A row whose path is not a key we mint cannot be matched to anything, and one filed under another
    // business's prefix is the isolation fault: both are counted against the row's own business.
    const b = get(row.business_id);
    b.db_rows++;
    if (typeof row.bytes === "number" && Number.isFinite(row.bytes)) b.db_bytes += row.bytes; else b.unknown_size_rows++;
    if (!parsed || parsed.businessId !== row.business_id) { b.misfiled++; continue; }
    seenPaths.add(row.path);
    const stored = byKey.get(row.path);
    if (stored === undefined) { b.missing++; b.missing_bytes += typeof row.bytes === "number" ? row.bytes : 0; continue; }
    if (typeof row.bytes === "number" && row.bytes !== stored) { b.mismatched++; b.mismatch_bytes += Math.abs(stored - row.bytes); }
  }
  for (const [key, bytes] of byKey) {
    if (seenPaths.has(key)) continue;
    const k = parseObjectKey(key)!;
    const b = get(k.businessId);
    b.orphans++; b.orphan_bytes += bytes;
  }

  const sum = <K extends keyof BusinessReport>(k: K) =>
    [...per.values()].reduce((n, r) => n + (typeof r[k] === "number" ? (r[k] as number) : 0), 0);
  const drifts = (r: BusinessReport) => r.orphans + r.missing + r.mismatched + r.unknown_size_rows + r.misfiled > 0;
  for (const r of per.values()) {
    // READ FROM R2, because the stored size is the true one and the recorded one is the thing being checked.
    r.over_share = allowance ? Math.max(r.r2_bytes, r.db_bytes) > allowance.share_bytes : null;
  }
  const flagged = [...per.entries()].filter(([, r]) => drifts(r) || r.over_share === true)
    .sort((a, b) => (b[1].orphan_bytes + b[1].missing_bytes + b[1].mismatch_bytes) - (a[1].orphan_bytes + a[1].missing_bytes + a[1].mismatch_bytes));
  const r2Bytes = sum("r2_bytes") + unattributedBytes;
  const report: Report = {
    clean: false,
    r2_objects: sum("r2_objects") + unattributed, r2_bytes: r2Bytes,
    db_rows: sum("db_rows"), db_bytes: sum("db_bytes"),
    drift_bytes: r2Bytes - sum("db_bytes"),
    orphans: sum("orphans"), orphan_bytes: sum("orphan_bytes"),
    missing: sum("missing"), missing_bytes: sum("missing_bytes"),
    mismatched: sum("mismatched"), mismatch_bytes: sum("mismatch_bytes"),
    unknown_size_rows: sum("unknown_size_rows"), misfiled: sum("misfiled"),
    unattributed_objects: unattributed, unattributed_bytes: unattributedBytes,
    businesses_seen: per.size,
    businesses_drifting: [...per.values()].filter(drifts).length,
    allowance: allowance ? {
      ...allowance, store_used_bytes: r2Bytes,
      store_used_pct: allowance.total_bytes > 0 ? Math.round((r2Bytes / allowance.total_bytes) * 1000) / 10 : null,
      businesses_over_share: [...per.values()].filter((r) => r.over_share === true).length,
    } : null,
    named: Object.fromEntries(flagged.slice(0, NAMED_BUSINESSES)),
    named_truncated: flagged.length > NAMED_BUSINESSES,
  };
  report.clean = report.orphans + report.missing + report.mismatched + report.unknown_size_rows
    + report.misfiled + report.unattributed_objects === 0;
  return report;
}

// ---------------------------------------------------------------------------------------------------------
// THE HANDLER
// ---------------------------------------------------------------------------------------------------------

export interface ReconcileDeps {
  now(): Date;
  /** True when the caller still has room under every limit. */
  withinLimits(limits: { bucket: string; key: string; windowSeconds: number; limit: number }[]): Promise<boolean>;
  /** `null` when the R2 credentials are not configured; `missing` then holds the NAMES only. */
  r2: Pick<R2Store, "list"> | null;
  missing: string[];
  /** When the last REAL run finished; `null` if there never was one (a seeded row is not a run). */
  lastRun(): Promise<string | null>;
  loadRows(): Promise<DbPhoto[]>;
  /** The caps, or `null` when they could not be read. */
  allowance(): Promise<Allowance | null>;
  stamp(detail: Report): Promise<void>;
  log(...args: unknown[]): void;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export async function handlePhotoReconcile(req: Request, deps: ReconcileDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  if (!(await deps.withinLimits([{ bucket: "photo-reconcile", key: "all", windowSeconds: 3600, limit: 6 }]))) {
    return json({ error: "Too many requests" }, 429);
  }
  if (!deps.r2) {
    deps.log("photo-reconcile: not configured, missing", deps.missing.join(", "));
    return json({ error: "Photo storage is not set up on the server yet.", ran: false }, 503);
  }
  const last = await deps.lastRun();
  if (last && deps.now().getTime() - Date.parse(last) < MIN_INTERVAL_MS) {
    return json({ ok: true, ran: false, skipped: "too_soon", last_run: last });
  }

  let objects: ListedObject[];
  try { objects = await listAll(deps.r2, BUCKET); }
  catch (e) {
    // The message is R2's own generic text, never a URL: `makeR2` replaces fetch's.
    deps.log("photo-reconcile: listing failed:", (e as Error)?.message);
    return json({ error: "Could not read the photo store.", ran: false }, 502);
  }
  let rows: DbPhoto[];
  try { rows = await deps.loadRows(); }
  catch (e) {
    deps.log("photo-reconcile: reading job_photos failed:", (e as Error)?.message);
    return json({ error: "Could not read the photo records.", ran: false }, 500);
  }
  let allowance: Allowance | null = null;
  try { allowance = await deps.allowance(); } catch (e) { deps.log("photo-reconcile: allowance unreadable:", (e as Error)?.message); }

  const report = reconcile(objects, rows, allowance);
  try { await deps.stamp(report); }
  catch (e) {
    // A reconcile nobody can read is not a run. Say so rather than answer 200.
    deps.log("photo-reconcile: heartbeat failed:", (e as Error)?.message);
    return json({ error: "Could not record the result.", ran: false }, 500);
  }
  return json({ ok: true, ran: true, report });
}
