// 0.11cc: read the effects of the cron, timeout and allowance migrations.
// node scripts/photo-cron-live.mjs [--break=no-timeout]
// Read-only Management API query, guarded before the first request. Do not
// retrieve cron commands: other jobs may contain credentials. SQL returns only
// booleans about the photo job's command. A queued pg_net call is not proof that
// the handler finished; require a fresh, unseeded heartbeat as a separate target.
import "../tests/_env.mjs";
import { writeFileSync } from "node:fs";
import { writeReceipt, REPO } from "./receipt.mjs";
import path from "node:path";
const ref = process.env.SUPABASE_PROJECT_REF;
if (ref !== "kguqylyzgyzfktkfnhjb") throw new Error("Wrong project; no query issued");
const brk = process.argv.find(a => a.startsWith("--break="))?.slice(8) || "";
if (brk && brk !== "no-timeout") throw new Error("Unknown sabotage; no query issued");
const started_at = new Date().toISOString();
const query = `select jsonb_build_object(
  'cron', (select jsonb_agg(jsonb_build_object('schedule', schedule, 'active', active,
    'http_post', position('net.http_post' in command) > 0,
    'platform_url', position('https://kguqylyzgyzfktkfnhjb.supabase.co/functions/v1/photo-reconcile' in command) > 0,
    'timeout_60s', command ~ 'timeout_milliseconds[[:space:]]*:=[[:space:]]*60000',
    'anonymous', position('Authorization' in command) = 0)) from cron.job where jobname = 'photo-reconcile'),
  'refresh_weather', (select count(*) from cron.job where jobname = 'refresh-weather' and command like '%net.http_post%'),
  'allowance', (select jsonb_agg(photo_total_gb) from public.platform_settings),
  'heartbeat', (select jsonb_agg(jsonb_build_object('ran_at', ran_at, 'detail', detail,
    'stale_after_seconds', stale_after_seconds)) from public.job_heartbeats where job = 'photo-reconcile')
) as state`;
const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST", headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});
if (!response.ok) throw new Error("Read-only query failed: " + response.status);
const rows = await response.json();
if (rows.length !== 1) throw new Error("Expected exactly one state row");
const world = rows[0].state;
const cronOK = s => s?.cron?.length === 1 && s.refresh_weather === 1 && s.cron[0].schedule === "40 3 * * *"
  && ["active", "http_post", "platform_url", "timeout_60s", "anonymous"].every(k => s.cron[0][k] === true);
const canary = structuredClone(world);
if (canary.cron?.[0]) canary.cron[0].timeout_60s = false;
const canaryCaught = !cronOK(canary);
if (brk && world.cron?.[0]) world.cron[0].timeout_60s = false;
const failures = [];
let assertions = 0;
const check = (label, ok) => { assertions++; if (!ok) failures.push(label); console.log(`${ok ? "ok" : "FAIL"} ${label}`); };
check("cron: exactly one active daily 03:40 UTC anonymous platform HTTP call, with 60s timeout, same transport as refresh-weather", cronOK(world));
check("allowance: exactly one settings row at 10 GB", world.allowance?.length === 1 && Number(world.allowance[0]) === 10);
const beat = world.heartbeat?.[0];
check("heartbeat: exactly one real recent report with the migration's 25-hour window", world.heartbeat?.length === 1
  && beat.stale_after_seconds === 90000 && beat.detail?.seeded !== true
  && Date.now() - Date.parse(beat.ran_at) >= 0 && Date.now() - Date.parse(beat.ran_at) < 90000 * 1000);
check("heartbeat: all five drift counters are numeric", ["orphans", "missing", "mismatched", "unknown_size_rows", "misfiled"]
  .every(k => typeof beat?.detail?.[k] === "number" && Number.isFinite(beat.detail[k])));
check("canary: missing timeout is caught", canaryCaught);
const artifact = `receipts/photo-cron-live${brk ? ".sabotage" : ""}.txt`;
writeFileSync(path.join(REPO, artifact), JSON.stringify({ project: ref, state: world, failures, canaryCaught }, null, 2) + "\n");
const { path: receipt } = writeReceipt({ check_id: "photo-cron-live", started_at,
  expected_targets: 3, discovered_targets: [world.cron, world.allowance, world.heartbeat].filter(x => x?.length === 1).length,
  attempted_targets: 3, completed_targets: 3, skipped_targets: 0, assertions_executed: assertions, min_assertions: 4,
  status: failures.length ? "fail" : "pass", failures, artifacts: [artifact],
  canary: { id: "missing-cron-timeout", observed_failure: canaryCaught },
  dimensions: { break: brk || null, project: ref, state: world },
  warnings: ["Checks migration effects, not an applied-migrations ledger. No release history can prove simultaneous changes retroactively. A publish of this checkout is still required for its flags to reach customers."] });
console.log(receipt);
process.exit(failures.length ? 1 : 0);
