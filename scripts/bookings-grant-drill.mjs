// ROADMAP 8.10d — PROVE THE MIGRATION ON A THROWAWAY COPY, NEVER THE LIVE TABLE.
//
//   node scripts/bookings-grant-drill.mjs                 # exit 0 = proved
//   node scripts/bookings-grant-drill.mjs --break=regrant # sabotage: must exit 1
//   node scripts/bookings-grant-drill.mjs --parse-only    # only the source read below: no
//                                                         # credentials, no database (ROADMAP 97.66)
//
// Needs SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF (`.env`). Sends ONE
// statement to the Management API: a DO block that creates schema
// `scratch_810d`, copies `public.bookings`' shape into it (no rows, no foreign
// keys), gives the copy the grants the live table has, runs the real migration
// file retargeted at the copy, tries each write as each role, and then RAISES —
// so Postgres rolls back every bit of it, the schema included. Nothing persists
// even if this process is killed mid-run (`docs/gotchas.md` 90: a `finally`
// does not run on SIGTERM; a server-side rollback does not need one).
//
// RLS on the copy is a permissive `using (true)` policy ON PURPOSE: it makes
// GRANTS the only variable, so every refusal below is the grant's doing.
//
// What it asks, before the migration (live-like grants) and after:
//   · the hole reproduces: `authenticated` CAN update `weather` before
//   · after: `authenticated` and `anon` are refused `weather` and `weather_at`
//   · after: `authenticated` holds UPDATE on NO column (the browser writes none)
//   · after: BulkJobModal's fleet-job insert, which is the browser's only
//     direct write to `bookings`, still succeeds — first send and a retry
//     (`ON CONFLICT (id) DO NOTHING`, exactly what PostgREST sends for
//     `upsert(…, { ignoreDuplicates: true })`)
//   · after: `authenticated` can still read; `service_role` (every edge
//     function, including refresh-weather) can still write `weather`

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BREAK = process.argv.find((a) => a.startsWith("--break="))?.slice(8);

// --- the migration, retargeted. Refuse if anything could still reach public.
const MIG = "supabase/migrations/20261006040000_bookings_browser_updates_nothing.sql";
const migSql = readFileSync(path.join(ROOT, MIG), "utf8").replace(/--[^\n]*/g, "").trim();
const retargeted = migSql.replaceAll("public.bookings", "scratch_810d.bookings")
  + (BREAK === "regrant" ? "\ngrant update on scratch_810d.bookings to authenticated;" : "");
if (!migSql.includes("public.bookings") || /\bpublic\./i.test(retargeted)) {
  console.error("REFUSED — the migration did not retarget cleanly; it would touch public."); process.exit(1);
}

// --- the browser's only direct write, read off the source so it cannot drift.
// ROADMAP 97.66: the sheet hands its row to `saveBulkJob` (app/src/lib/bulkJob.js),
// which does the upsert — so the FIELDS are read off the sheet and the
// ON CONFLICT (id) DO NOTHING off the helper. Both halves must be found.
const bulk = readFileSync(path.join(ROOT, "app/src/components/BulkJobModal.jsx"), "utf8");
const saver = readFileSync(path.join(ROOT, "app/src/lib/bulkJob.js"), "utf8");
const block = bulk.match(/saveBulkJob\(supabase,\s*\{([\s\S]*?)\n\s*\}\);/);
if (!block || !/from\("bookings"\)\.upsert\(row,\s*\{\s*onConflict:\s*"id",\s*ignoreDuplicates:\s*true\s*\}\)/.test(saver)) {
  console.error("FAIL — BulkJobModal's saveBulkJob row, or bulkJob.js's bookings upsert (with ignoreDuplicates), was not found; re-read the browser's writes."); process.exit(1);
}
const keys = [...block[1].matchAll(/^\s*([a-z_]+):/gm)].map((m) => m[1]).sort();
const fleet = (id) => ({
  id, business_id: randomUUID(), customer_name: "Drill Motors", customer_phone: "",
  start_at: "2026-10-05T15:00:00Z", end_at: "2026-10-06T00:00:00Z", service_type: "dropoff",
  vehicle_size: "bulk", vehicle_size_label: "12 vehicles", bulk_vehicle_count: 12,
  subtotal: 1200, total_price: 1200, final_amount: 1200, status: "completed",
  payment_status: "paid", finalized_at: "2026-10-06T00:00:00Z", admin_notes: null,
});
const payloadKeys = Object.keys(fleet("x")).sort();
if (keys.join() !== payloadKeys.join()) {
  console.error(`FAIL — BulkJobModal now writes [${keys}] and this drill sends [${payloadKeys}]. Update fleet() to match.`); process.exit(1);
}
if (process.argv.includes("--parse-only")) {
  console.log(`PARSED ONLY — BulkJobModal writes ${keys.length} fields through bulkJob.js's ignore-duplicates upsert, matching fleet(). No credentials read, nothing sent to the database.`);
  process.exit(0);
}

for (const line of readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (line && !line.startsWith("#") && i > 0 && !process.env[line.slice(0, i).trim()]) process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const { SUPABASE_ACCESS_TOKEN: TOKEN, SUPABASE_PROJECT_REF: REF } = process.env;
if (!TOKEN || !REF) { console.error("SKIPPED — nothing was measured: missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF."); process.exit(1); }
if (REF !== "kguqylyzgyzfktkfnhjb") { console.error(`REFUSED — ${REF} is not this platform's database. Stop and ask.`); process.exit(1); }

const lit = (s) => `'${String(s).replaceAll("'", "''")}'`;
const seedId = randomUUID(), fleetId = randomUUID();
const ins = (id) => `insert into scratch_810d.bookings (${keys.join(",")}) select ${keys.join(",")} from json_populate_recordset(null::scratch_810d.bookings, ${lit(JSON.stringify([fleet(id)]))}::json) on conflict (id) do nothing`;
const upd = (col, val) => `update scratch_810d.bookings set ${col} = ${val} where id = ${lit(seedId)}`;

const STEPS = [
  // [label, phase, role, sql, expect: "ok" | "ok0" | "refused"]
  ["hole reproduces: authenticated writes weather", "before", "authenticated", upd("weather", `'{"t":99}'`), "ok"],
  ["authenticated refused: weather", "after", "authenticated", upd("weather", `'{"t":1}'`), "refused"],
  ["authenticated refused: weather_at", "after", "authenticated", upd("weather_at", "now()"), "refused"],
  ["authenticated refused: admin_notes (the browser updates no column)", "after", "authenticated", upd("admin_notes", "'x'"), "refused"],
  ["anon refused: weather", "after", "anon", upd("weather", `'{"t":2}'`), "refused"],
  ["fleet job insert still works (first send)", "after", "authenticated", ins(fleetId), "ok"],
  ["fleet job retry is ignored, not refused", "after", "authenticated", ins(fleetId), "ok0"],
  ["authenticated can still read", "after", "authenticated", `select 1 from scratch_810d.bookings where id = ${lit(seedId)}`, "ok"],
  ["service_role (edge functions) still writes weather", "after", "service_role", upd("weather", `'{"t":3}'`), "ok"],
];
const run = (phase) => STEPS.map(([, p, role, sql], i) => p !== phase ? "" :
  `r := r || jsonb_build_object('${i}', scratch_810d.try(${lit(role)}, ${lit(sql)}));`).join("\n");

const DO = `do $drill$
declare r jsonb := '{}'; cols int;
begin
  create schema scratch_810d;
  create table scratch_810d.bookings (like public.bookings including defaults including constraints including indexes);
  create function scratch_810d.try(role text, q text) returns text language plpgsql as $f$
  declare n int;
  begin
    execute format('set local role %I', role);
    execute q;
    get diagnostics n = row_count;
    reset role;
    return 'ok rows=' || n;
  exception when others then
    return sqlstate || ' ' || sqlerrm;
  end $f$;
  grant usage on schema scratch_810d to anon, authenticated, service_role;
  grant all on scratch_810d.bookings to anon, authenticated, service_role;
  alter table scratch_810d.bookings enable row level security;
  create policy drill on scratch_810d.bookings for all to anon, authenticated, service_role using (true) with check (true);
  -- what 20260913010000_weather_cache.sql does to the live table
  revoke update (weather, weather_at) on scratch_810d.bookings from authenticated;
  ${ins(seedId)};
  ${run("before")}
  execute ${lit(retargeted)};
  ${run("after")}
  select count(*) into cols from pg_attribute a
    where a.attrelid = 'scratch_810d.bookings'::regclass and a.attnum > 0 and not a.attisdropped
      and has_column_privilege('authenticated', a.attrelid, a.attnum, 'UPDATE');
  r := r || jsonb_build_object('cols', cols);
  raise exception 'DRILL:%', r;
end $drill$;`;

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: DO }),
});
const text = await res.text();
let msg = text;
try { msg = JSON.parse(text).message ?? text; } catch { /* not JSON: keep it raw */ }
const m = msg.match(/DRILL:(\{[^\n]*\})/);
if (!m) { console.error(`FAIL — the drill did not reach its end. ${res.status} ${text.slice(0, 600)}`); process.exit(1); }
const out = JSON.parse(m[1]);

let failed = 0;
console.log(`8.10d drill on a rolled-back copy of public.bookings${BREAK ? ` — BREAK=${BREAK}` : ""}\n`);
STEPS.forEach(([label, , , , expect], i) => {
  const got = out[i] ?? "(no result)";
  const pass = expect === "refused" ? got.startsWith("42501")
    : expect === "ok0" ? got === "ok rows=0" : /^ok rows=[1-9]/.test(got);
  if (!pass) failed++;
  console.log(`  ${pass ? "ok  " : "FAIL"}  ${label.padEnd(62)} ${got}`);
});
const colsPass = out.cols === 0;
if (!colsPass) failed++;
console.log(`  ${colsPass ? "ok  " : "FAIL"}  ${"authenticated holds UPDATE on no column of the copy".padEnd(62)} ${out.cols} column(s)`);
console.log(`\n${STEPS.length + 1 - failed} of ${STEPS.length + 1} held. Rolled back: schema scratch_810d never committed.`);
process.exitCode = failed ? 1 : 0; // not process.exit(): on Windows it trips a libuv assert after fetch and exits 127 either way
