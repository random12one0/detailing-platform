// The photo reconcile — ROADMAP 0.11 slice 6. Sums what R2 actually holds against what `job_photos` says, per
// business, and writes the numbers to the `photo-reconcile` row of `job_heartbeats`. All the rules are in
// `_shared/photoReconcile.ts` (a Node test runs them); this file only connects them to the real database and
// the real R2. Job-photo reconciliation remains read-only. 14.39 additionally
// reclaims expired receipt attempts, claimed atomically by the database.
//
// **PUBLIC, LIKE `refresh-weather`, AND IT MUST BE.** pg_cron calls it with no session
// (`20261006060000_photo_reconcile_cron.sql`). It is bounded instead of authenticated: it refuses unless the
// last real run is older than six hours, and it sits behind a global rate limit.
//
// **THE LINE IS THERE NOW — corrected 2026-10-09 (ROADMAP 0.11c).** This header said `photo-reconcile` was NOT
// yet in `PUBLIC_FUNCTIONS` in `scripts/deploy-functions.mjs` and sent the reader to `FOR-ANDREW.md` to have it
// added. It has been in that list since the line was written, so the instruction was for work already done.
// Without it a publish would deploy this with the JWT check on, the cron's anonymous call would be refused at
// the gateway, nothing would run, and the heartbeat would go stale — which is how it would be noticed, on
// purpose. `scripts/photo-release-order.mjs`'s `reconcile-public-for-cron` now holds it on every run, and
// `tests/photo-release-order.test.mjs` test 6 reddens if the slug leaves the list.
//
// **CREDENTIALS: BY NAME, FROM THE ENVIRONMENT, NEVER PRINTED.** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
// `R2_SECRET_ACCESS_KEY` (`docs/services-and-secrets.md`). Missing: 503, and only the NAMES are logged.
//
// **NOT DEPLOYED.** Publishing is Andrew's.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { withinLimits } from "../_shared/rateLimit.ts";
import { makeR2, r2Config } from "../_shared/r2.ts";
import { type DbPhoto, handlePhotoReconcile, JOB, type ReconcileDeps } from "../_shared/photoReconcile.ts";
import { reclaimReceiptAttempts } from "../_shared/receiptAttempts.ts";

const PAGE = 1000;
const PAGE_CEILING = 500; // 500,000 rows; past it the read throws rather than report a partial table as whole.

async function loadRows(): Promise<DbPhoto[]> {
  const out: DbPhoto[] = [];
  for (let page = 0; page < PAGE_CEILING; page++) {
    const { data, error } = await supabase.from("job_photos").select("business_id, path, bytes")
      .order("id", { ascending: true }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    out.push(...(data ?? []) as DbPhoto[]);
    if (!data || data.length < PAGE) return out;
  }
  throw new Error("job_photos exceeded the reconcile's row ceiling");
}

const deps = (): ReconcileDeps => {
  const { config, missing } = r2Config((n) => Deno.env.get(n));
  return {
    now: () => new Date(),
    withinLimits: (limits) => withinLimits(supabase, limits),
    r2: config ? makeR2(config) : null,
    missing,
    async lastRun() {
      const { data } = await supabase.from("job_heartbeats").select("ran_at, detail").eq("job", JOB).maybeSingle();
      // A seeded row is the table saying "nothing has been seen yet", not a run.
      return data && data.detail?.seeded !== true ? data.ran_at : null;
    },
    loadRows,
    async reclaimReceipts() {
      if (!config) throw new Error("Receipt storage unavailable");
      return reclaimReceiptAttempts({
        r2: makeR2(config),
        async claim() {
          const { data, error } = await supabase.rpc("claim_receipt_attempts");
          if (error) throw error;
          return data ?? [];
        },
        async ack(a) {
          const { error } = await supabase.rpc("ack_receipt_attempt", { p_key: a.key, p_business: a.business_id, p_expense: a.expense_id });
          if (error) throw error;
        },
      });
    },
    async allowance() {
      const total = await supabase.rpc("photo_total_bytes");
      const share = await supabase.rpc("photo_tenant_share");
      if (total.error || share.error) return null;
      const t = Number(total.data), s = Number(share.data);
      if (!Number.isFinite(t) || !Number.isFinite(s) || s <= 0) return null;
      return { total_bytes: t, share_bytes: Math.floor(t / s) };
    },
    async stamp(detail) {
      const { error } = await supabase.rpc("note_heartbeat", { p_job: JOB, p_detail: detail });
      if (error) throw error;
    },
    log: (...a) => console.error(...a),
  };
};

Deno.serve((req) => handlePhotoReconcile(req, deps()));
